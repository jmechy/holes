import { buildProtos } from '../objects/firestation.js';

// "Emergency" (id kept as 'firestation' so saved progress stays valid): the fire station, a police station, a
// hospital and two houses on fire, all linked by a small town street grid.

const ASPHALT = '#4f5258';
const WALK = '#c9c9c2';
const WHITE = '#ececec';
const YELLOW = '#f2c230';
const PI = Math.PI;

// Routes / parking layouts are created in decorate() and used in populate().
const R = {};
let LOT_A = [];
let LOT_B = [];
let LOT_C = [];
let LOT_P1 = [];
let LOT_P2 = [];
let LOT_H = [];
let CURB = [];
let HOUSES = [];

// Painted roads without a route of their own (static objects must stay off them): [x0, x1, z0, z1]
const ROADS = [
  [-121, 121, -6, 6], [-121, 121, 65, 75], [-65, -55, -121, 121], [55, 65, -121, 121],
  [-121, -60, 29, 41], // street A: west fire scene
  [60, 121, 94, 106], // street B: east fire scene
  [64, 76, -60, -28], // hospital drive
];
// Other paved areas that keep trees, bushes and loose gear off them: parking lots + forecourts
const KEEP = [
  [31, 51, -45, -15], [-51, -31, -45, -15], [-20, 20, 89, 111], // fire station lots, public car park
  [-88, -66, -78, -18], // police lots
  [65, 95, -97, -67], // hospital lot
];
const rectDist = (x, z, [x0, x1, z0, z1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
const blocked = (x, z, r) => ROADS.some((q) => rectDist(x, z, q) < r * 0.5) || KEEP.some((q) => rectDist(x, z, q) < r * 0.5);

// The two burning-house neighbourhoods. u = along the street towards the dead end, n = towards the burning house.
const SCENES = [
  { label: 'A', ox: -95, oz: 35, u: [-1, 0], n: [0, -1], house: 'burningHouseA', tilt: -0.12, m: 1 },
  { label: 'B', ox: 95, oz: 100, u: [1, 0], n: [0, -1], house: 'burningHouseB', tilt: 0.1, m: -1 },
];

// Houses stand in neat rows facing the street. +Z is a house's front; rotY turns it to face the road.
const HOUSE_ROWS = () => {
  const out = [];
  const row = (xs, z, rotY) => xs.forEach((x) => out.push({ x, z, rotY }));
  const col = (x, zs, rotY) => zs.forEach((z) => out.push({ x, z, rotY }));
  row([-39, -26, -13, 13, 26, 39], 21, PI); // south of the main street, facing north
  row([-39, -26, -13, 13, 26, 39], 55, 0); // north of the z=70 street, facing south
  col(-79, [22, 34, 46, 58], PI / 2); // west block, facing the x=-60 street
  col(79, [22, 34, 46, 58], -PI / 2); // east block
  col(80, [-30, -44, -58], -PI / 2); // north-east, facing the x=60 street
  col(-80, [-30, -44], PI / 2); // north-west
  row([-98, -84, -46, -34, 34, 46, 84, 98], 93, PI); // south row, facing the z=70 street
  // keep the police station, hospital and the two fire-scene streets clear, then add the scene neighbours by hand
  const clear = [[-114, -64, -82, -14], [64, 120, -100, -24], [-120, -64, 10, 55], [64, 120, 77, 120]];
  const kept = out.filter((h) => !clear.some(([x0, x1, z0, z1]) => h.x > x0 && h.x < x1 && h.z > z0 && h.z < z1));
  const extra = [];
  const add = (xs, z, rotY) => xs.forEach((x) => extra.push({ x, z, rotY }));
  add([-109, -81], 19, 0); // north of street A, facing south (the burning house sits between them at x=-95)
  add([-109, -95, -81], 51, PI); // south of street A, facing north
  add([81, 109], 84, 0); // north of street B, either side of the burning house at x=95
  add([74, 88, 102], 113, PI); // south of street B, facing north
  return [...kept, ...extra];
};

const yawOf = (dx, dz) => Math.atan2(-dz, dx);

export default {
  id: 'firestation',
  name: 'Emergency',
  description: 'Two houses ablaze! Swallow fire trucks, police cars, a hospital and the whole rescue.',
  cardColor: '#d8353f',
  emoji: '🚨',
  size: 120,
  groundColor: '#7fbf6a',
  skyColor: '#cfe9ff',
  fogColor: '#cfe9ff',
  lightColor: '#fff6e0',
  ambient: 0.62,
  // Bright clear daytime: crisp sun, deep-ish readable shadows.
  lighting: {
    sunDirection: [35, 70, 30], sunColor: '#fff4dc', sunIntensity: 0.8 * Math.PI,
    hemiSkyColor: '#cfe6ff', hemiGroundColor: '#8a9a78', hemiIntensity: 0.56 * Math.PI,
    shadowOpacity: 0.85, shadowRadius: 2.2, environmentIntensity: 0.3, exposure: 1.02,
  },
  postProcessing: { aoRadius: 0.5, aoStrength: 0.17 },
  groundStyle: 'grass',
  sky: { top: '#6fb3ee', horizon: '#dcefff' },
  clouds: true,
  backdrop: [
    { type: 'hills', color: '#6fb85c', color2: '#4e9a4a' },
    { type: 'forest', side: 'north', color: '#5aa650', color2: '#2f7d3c' },
    { type: 'city', side: 'east', color: '#b9c3d6', color2: '#7fbf6a' },
  ],
  edge: 'hedge',
  buildProtos,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, randRange } = ctx;
    const S = ctx.size;

    // Lawns: alternating mown stripes in each block + soft grass patches
    const lawns = [
      [0, 38, 100, 48], [0, 93, 100, 34], [-92, 38, 40, 48], [92, 38, 40, 48], [-92, 93, 40, 34], [92, 93, 40, 34],
      [-92, -62, 40, 96], [92, -62, 40, 96], [-40, -62, 20, 96], [40, -62, 20, 96],
    ];
    lawns.forEach(([x, z, w, d], i) => addDecal(rect(x, z, w, d), i % 2 ? '#86c872' : '#7bc267', { style: 'grass' }));
    for (let i = 0; i < 16; i++) {
      addDecal(circle(randRange(-S, S), randRange(-S, S), randRange(5, 12)), i % 2 ? '#74b660' : '#8ccb76', { style: 'grass' });
    }

    // Sidewalks
    addDecal(merge([
      rect(0, 0, S * 2, 16), rect(-60, 0, 14, S * 2), rect(60, 0, 14, S * 2), rect(0, 70, S * 2, 14),
      rect(-90, 35, 60, 19), rect(90, 100, 60, 19), // the two fire-scene streets
    ]), WALK, { style: 'concrete' });

    // Scorched lawn + trampled ground in front of each burning house, water puddles in the street
    const burnt = [];
    const puddles = [];
    for (const s of SCENES) {
      const at = (a, b) => [s.ox + a * s.u[0] + b * s.n[0], s.oz + a * s.u[1] + b * s.n[1]];
      for (const [a, b, r] of [[0, 19, 9], [-9, 16, 4.5], [9, 16, 4.5]]) burnt.push(circle(...at(a, b), r, 20));
      for (const [a, b, r] of [[-2, 4, 2.6], [6, 1, 3.2], [-9, 5.8, 2.2], [3, 6.4, 1.8], [-14, 0, 2.4]]) puddles.push(circle(...at(a, b), r, 14));
    }
    addDecal(merge(burnt), '#5d5648', { style: 'dirt' });

    // Roads (with a pale gutter line on each edge)
    addDecal(merge([
      rect(0, 0, S * 2, 12), rect(-60, 0, 10, S * 2), rect(60, 0, 10, S * 2), rect(0, 70, S * 2, 10),
      rect(-90, 35, 60, 12), rect(90, 100, 60, 12), rect(70, -44, 12, 32), // + street A, street B, hospital drive
    ]), ASPHALT, { style: 'asphalt' });
    addDecal(merge(puddles), '#5b7f99');

    // Red-painted apron in front of the station + driveway
    addDecal(rect(0, -24, 40, 38), '#c7372f', { style: 'concrete' });
    addDecal(rect(0, -24, 34, 32), '#d9463d', { style: 'concrete' });

    // Apron edge stripes
    const st = [];
    for (let x = -18; x <= 18; x += 3) st.push(rect(x, -6.5, 1.6, 0.5));
    st.push(rect(-18.6, -24, 0.5, 34), rect(18.6, -24, 0.5, 34));
    // truck bays on the apron
    for (const x of [-20, 0, 20]) st.push(rect(x, -22, 0.3, 36));
    addDecal(merge(st), YELLOW);

    // Lane dashes
    const dashes = [];
    for (let x = -S + 4; x < S; x += 8) {
      if (Math.abs(Math.abs(x) - 60) > 8 && Math.abs(x) > 22) dashes.push(rect(x, 0, 4, 0.35));
    }
    for (let z = -S + 4; z < S; z += 8) {
      if (Math.abs(z) > 8 && Math.abs(z - 70) > 8) {
        dashes.push(rect(-60, z, 0.35, 4));
        dashes.push(rect(60, z, 0.35, 4));
      }
    }
    for (let x = -S + 4; x < S; x += 8) {
      if (Math.abs(Math.abs(x) - 60) > 8) dashes.push(rect(x, 70, 4, 0.35));
    }
    for (let x = -68; x > -S + 2; x -= 8) dashes.push(rect(x, 35, 4, 0.35));
    for (let x = 68; x < S - 2; x += 8) dashes.push(rect(x, 100, 4, 0.35));
    addDecal(merge(dashes), YELLOW);

    // Crosswalks
    const cw = [];
    const zebraX = (cx, cz) => { for (let i = -3; i <= 3; i++) cw.push(rect(cx, cz + i * 1.4, 2.6, 0.8)); };
    const zebraZ = (cx, cz) => { for (let i = -3; i <= 3; i++) cw.push(rect(cx + i * 1.4, cz, 0.8, 2.6)); };
    [-48, -72, 48, 72].forEach((x) => zebraX(x, 0));
    [-72, -48, 48, 72].forEach((x) => zebraX(x, 70));
    [-60, 60].forEach((x) => { zebraZ(x, -10); zebraZ(x, 10); zebraZ(x, 60); zebraZ(x, 80); });
    for (let i = -3; i <= 3; i++) cw.push(rect(i * 1.4, -8, 0.8, 2.6));
    zebraX(-66, 35); zebraX(66, 100);
    zebraZ(-60, 25); zebraZ(-60, 45); zebraZ(60, 90); zebraZ(60, 110);
    for (let i = -3; i <= 3; i++) cw.push(rect(62, -44 + i * 1.4, 2.6, 0.8));
    addDecal(merge(cw), WHITE);

    // Manhole covers
    const mh = [[-30, 2.5], [30, -2.5], [-60, -35], [60, 15], [20, 72.5], [-20, 67.5], [-100, 2.5], [100, -2.5], [-84, 36], [84, 101]];
    addDecal(merge(mh.map(([x, z]) => circle(x, z, 0.9, 14))), '#34363b');
    addDecal(merge(mh.map(([x, z]) => circle(x, z, 0.65, 14))), '#44474d');

    // Houses: garden paths to the pavement, driveways and flower beds
    HOUSES = HOUSE_ROWS();
    const paths = [];
    const beds = { pink: [], yellow: [], red: [] };
    HOUSES.forEach((h, i) => {
      const fx = Math.sin(h.rotY), fz = Math.cos(h.rotY); // unit vector to the front of the house
      const rx = Math.cos(h.rotY), rz = -Math.sin(h.rotY); // unit vector along the house's local +X
      paths.push(rect(h.x + fx * 6.6 - rx * 1.3, h.z + fz * 6.6 - rz * 1.3, 1.5, 8, h.rotY));
      const key = ['pink', 'yellow', 'red'][i % 3];
      beds[key].push(circle(h.x + fx * 3.3 + rx * 1.6, h.z + fz * 3.3 + rz * 1.6, 0.8, 10), circle(h.x + fx * 3.3 + rx * 2.6, h.z + fz * 3.3 + rz * 2.6, 0.7, 10));
    });
    addDecal(merge(paths), '#d3d0c6', { style: 'concrete' });
    addDecal(merge(beds.pink), '#f06a8c');
    addDecal(merge(beds.yellow), '#f6cc3a');
    addDecal(merge(beds.red), '#e0463a');

    // --- Vehicle routes on the streets (right-hand lanes: the town loop exists in both directions)
    const pts = [[-60, 0], [60, 0], [60, 70], [-60, 70]];
    R.loopF = ctx.addRoute(pts, { loop: true, width: 8 });
    R.loopR = ctx.addRoute(pts.slice().reverse(), { loop: true, width: 8 });
    // street stubs beyond the town loop: vehicles shuttle back and forth
    const stub = (key, a, b, width = 8) => { R[key] = ctx.addRoute([a, b], { loop: false, width }); };
    stub('w0', [-112, 0], [-68, 0]);
    stub('e0', [68, 0], [112, 0]);
    stub('w70', [-112, 70], [-68, 70]);
    stub('e70', [68, 70], [112, 70]);
    stub('wn', [-60, -112], [-60, -8]);
    stub('en', [60, -112], [60, -8]);
    stub('ws', [-60, 78], [-60, 112]);
    stub('es', [60, 78], [60, 112]);
    // response routes: from the station out to each fire scene's street corner (vehicles turn round at the roadblocks)
    R.toA = ctx.addRoute([[0, 0], [-60, 0], [-60, 35]], { loop: false, width: 8 });
    R.toB = ctx.addRoute([[0, 0], [60, 0], [60, 100]], { loop: false, width: 8 });
    // hospital forecourt loop
    R.hosp = ctx.addRoute([[68, -57], [72, -57], [72, -31], [68, -31]], { loop: true, width: 6 });

    // --- Parking: three lots (beside the station, and a public car park), police lots, hospital visitors' lot
    LOT_A = ctx.parkingLot(41, -30, 20, 30, { rotY: 0 });
    LOT_B = ctx.parkingLot(-41, -30, 20, 30, { rotY: 0 });
    LOT_C = ctx.parkingLot(0, 100, 40, 22, { rotY: 0 });
    LOT_P1 = ctx.parkingLot(-77, -33, 22, 30, { rotY: 0, color: '#4b5058' });
    LOT_P2 = ctx.parkingLot(-77, -63, 22, 30, { rotY: 0, color: '#4b5058' });
    LOT_H = ctx.parkingLot(80, -82, 30, 30, { rotY: 0 });
    // forecourts: police front plaza, hospital entrance paving
    addDecal(merge([rect(-88.5, -35, 3, 30), rect(-103, -35, 8, 30)]), WALK, { style: 'concrete' });
    addDecal(merge([rect(84, -44, 11, 34), rect(96, -30, 20, 6)]), WALK, { style: 'concrete' });
    // yellow bay lines at the ambulance canopy + hospital drive centre line
    const bays = [];
    for (let z = -60; z < -28; z += 6) bays.push(rect(70, z + 1.5, 0.3, 3));
    addDecal(merge(bays), YELLOW);
    // curb parking along the loop roads, minus the mouths of the fire-scene streets and the hospital drive
    const mouths = [[-66, -58, 27, 43], [58, 66, 92, 108], [60, 80, -62, -26]];
    CURB = [
      ...ctx.roadsideSpots(R.loopF, { side: 'right', spacing: 8, gap: 0.1 }),
      ...ctx.roadsideSpots(R.loopR, { side: 'right', spacing: 8, gap: 0.1 }),
      ...['w0', 'e0', 'w70', 'e70', 'wn', 'en', 'ws', 'es'].flatMap((k) => ctx.roadsideSpots(R[k], { side: 'right', spacing: 8, gap: 0.1 })),
    ].filter((s) => !mouths.some(([x0, x1, z0, z1]) => s.x > x0 && s.x < x1 && s.z > z0 && s.z < z1));
  },

  populate(ctx) {
    const { place, randRange, rand, size: S, protos } = ctx;
    const must = (label, ok) => { if (!ok) console.warn(`emergency: could not place ${label}`); return ok; };
    // static objects stay off roads/lots; movers are exempt
    const put = (name, x, z, rot, sc = 1, opts) => {
      const p = protos[name];
      const mv = opts && 'move' in opts ? opts.move : p.move;
      if (!mv && blocked(x, z, p.radius * sc)) return false;
      return place(name, x, z, rot, sc, opts);
    };
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          if (put(name, randRange(x0, x1), randRange(z0, z1), undefined, randRange(sMin, sMax))) break;
        }
      }
    };
    // place a model by its authoring origin (protos carry .anchor = bbox centre in authoring coordinates)
    const at = (name, wx, wz, yaw, o) => {
      const a = protos[name].anchor;
      const c = Math.cos(yaw), sn = Math.sin(yaw);
      return place(name, wx + a.x * c + a.z * sn, wz - a.x * sn + a.z * c, yaw, 1, o);
    };
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];
    const BLOCKS = [
      [-112, -70, 14, 62], [-50, 50, 14, 62], [70, 112, 14, 62],
      [-112, -70, 78, 112], [-50, 50, 78, 112], [70, 112, 78, 112],
      [-112, -70, -112, -14], [70, 112, -112, -14], [-50, -30, -112, -14], [30, 50, -112, -14],
    ];
    const blocks = (name, n, sMin = 1, sMax = 1) => {
      for (let i = 0; i < n; i++) scatter(name, 1, BLOCKS[Math.floor(rand() * BLOCKS.length)], sMin, sMax);
    };

    // --- Huge landmarks first
    place('firestation', 0, -50, 0, 1);
    // hospital: front faces west (-X), ambulance canopy at the north end of the facade
    const HW = [96, -45, -PI / 2];
    must('hospital', at('hospital', HW[0], HW[1], HW[2]));
    // police station: front faces east (+X) onto its parking lots
    must('police station', at('policestation', -101, -30, PI / 2));
    place('watertower', -108, 60, 0, 1);
    place('watertower', 100, -100, 0, 1);

    // --- The two burning houses and their response scenes
    const OV = { move: null, overlap: 0.01 };
    for (const sc of SCENES) {
      const { ox, oz, u, n, label } = sc;
      // a runs along the street from the house (a=0) towards the dead end, b from the street centre towards the house.
      // "Group" coordinates (put1/yawAB) are mirrored by sc.m so both scenes read the same way (a>0 = truck side);
      // "real" coordinates (putR/yawR) keep a<0 = street mouth, where the roadblock and the ambulance stand.
      const m = sc.m;
      const W = (a, b) => [ox + a * u[0] + b * n[0], oz + a * u[1] + b * n[1]];
      const dir = (da, db) => [da * u[0] + db * n[0], da * u[1] + db * n[1]];
      const yawR = (da, db) => { const d = dir(da, db); return yawOf(d[0], d[1]); };
      const yawAB = (da, db) => yawR(m * da, db);
      const putR = (nm, a, b, yaw, o = OV) => { const [x, z] = W(a, b); return must(`${label}:${nm}`, at(nm, x, z, yaw, { ...OV, ...o })); };
      const put1 = (nm, a, b, yaw, o = OV) => putR(nm, m * a, b, yaw, o);
      const nYaw = yawOf(n[0], n[1]);

      const [hx, hz] = W(0, 16);
      must(`${label}:${sc.house}`, at(sc.house, hx, hz, Math.atan2(-n[0], -n[1]), { move: null }));

      // fire trucks parked at angles: ladder truck with its aerial ladder raised over the house, two pumpers
      put1('laddertruckUp', 5, 2.7, Math.atan2(n[0], n[1]) + sc.tilt);
      put1('fireengine', -12.5, 2.9, yawAB(Math.cos(0.3), Math.sin(0.3)));
      put1('fireengine', 6.5, -3.4, yawAB(-Math.cos(0.22), Math.sin(0.22)));
      putR('ambulance', -20, -3.2, yawR(Math.cos(0.18), -Math.sin(0.18)));
      putR('medkit', -15.5, -6.3, 0.4);
      putR('paramedic', -18, -6.4, 0, { move: { type: 'walk', speed: 1.1, range: 3 } });
      putR('paramedic', -22.5, -1.4, 0, { move: { type: 'walk', speed: 1.1, range: 3 } });

      // hydrants + hoses (thin tubes) from the pumpers to the hydrants and the hose teams
      put1('hydrant', -13, 6.9, 0); put1('hydrant', 12, -6.9, 0); put1('hydrant', 9, 6.9, 0);
      const hose = (pts, name = 'hose') => {
        for (let i = 0; i + 1 < pts.length; i++) {
          const [a0, b0] = pts[i], [a1, b1] = pts[i + 1];
          const len = Math.hypot(a1 - a0, b1 - b0);
          const k = Math.max(1, Math.round(len / 2.8));
          for (let j = 0; j < k; j++) {
            const t = (j + 0.5) / k;
            put1(name, a0 + (a1 - a0) * t, b0 + (b1 - b0) * t, yawAB(a1 - a0, b1 - b0));
          }
        }
      };
      hose([[-13, 6.4], [-11.5, 4.8], [-10.5, 3.6]]);
      hose([[-8, 4.9], [-7, 6.4], [-5.2, 7.2]], 'hoseRed');
      hose([[11, -5.9], [8.6, -4.6]]);
      hose([[11.6, -4.6], [11.2, 1], [9.6, 5.2], [8, 7]], 'hoseRed');
      hose([[-2.5, 5.4], [-3.4, 3.2], [-2.2, 1.0]]);

      // firefighters: hose teams (static), two standing, four walking around the trucks
      put1('firefighterSpray', -4.6, 7.4, nYaw + 0.06);
      put1('firefighterSprayHi', 3.6, 7.6, nYaw - 0.06);
      put1('monitorLow', 0.6, 8.2, nYaw);
      put1('monitorHi', -8.5, 8.4, nYaw - 0.1);
      put1('firefighter', -7.2, 8.9, nYaw, { move: null });
      put1('firefighter', 8.4, 8.6, nYaw + 0.5, { move: null });
      const walk = { type: 'walk', speed: 1.4, range: 5 };
      put1('firefighter', -1, -1, 0, { move: walk });
      put1('firefighter', -14, 5.4, 0, { move: walk });
      put1('firefighter', 12, 4.6, 0, { move: walk });
      put1('firefighter', 2, -6.2, 0, { move: walk });
      // loose gear
      put1('extinguisher', -12.6, -0.6, 0); put1('helmet', 9.2, -0.3, 0); put1('axe', -6.4, 0.2, 0.3); put1('hosereel', 13.6, 2.6, 0);

      // police roadblock across the street: two cruisers, barriers, cones, a bike, officers; onlookers behind it
      putR('policecar', -25.4, -3.6, yawOf(0.94 * n[0] + 0.35 * u[0], 0.94 * n[1] + 0.35 * u[1]));
      putR('policecar', -26.6, 3.6, yawOf(-0.94 * n[0] + 0.35 * u[0], -0.94 * n[1] + 0.35 * u[1]));
      putR('barrier', -26, 0, nYaw + 0.1);
      putR('barrier', -26.4, -7.2, nYaw); putR('barrier', -26.4, 7.2, nYaw);
      putR('barrier', -26.6, -8.9, nYaw); putR('barrier', -26.6, 8.9, nYaw);
      for (const b of [-6.2, -5.2, 5.2, 6.2, -9.8, 9.8]) putR('cone', -24.2, b, 0);
      putR('cone', -22, -6.4, 0); putR('cone', -22, 6.4, 0); putR('cone', -20.6, -6.5, 0);
      putR('policebike', -22.6, -4.4, yawR(-1, 0.3));
      putR('officer', -28, 2.2, 0, { move: { type: 'walk', speed: 1.1, range: 3 } });
      putR('officer', -28, -2.4, 0, { move: { type: 'walk', speed: 1.1, range: 3 } });
      putR('officer', -24, 0.2, 0, { move: null });
      const kinds = ['onlookerA', 'onlookerB', 'onlookerC', 'onlookerD'];
      for (let i = 0; i < 9; i++) {
        const [x, z] = W(randRange(-33, -29), randRange(-8.5, 8.5));
        must(`${label}:onlooker`, place(kinds[i % 4], x, z, undefined, 1, { overlap: 0.4 }));
      }
    }

    // --- Police station lots: cruisers, SUVs, motorcycles near the door, officers
    const pcars = ['policecar', 'policecar', 'policecar', 'suv', 'carWhite'];
    const lotP = [...LOT_P1, ...LOT_P2].sort((a, b) => b.x - a.x);
    lotP.forEach((s, i) => {
      if (i < 4) { ctx.placeParked('policebike', s); return; }
      if (rand() < 0.78) ctx.placeParked(ctx.pick(pcars), s);
    });
    scatter('officer', 7, [-92, -66, -76, -16], 1, 1, 12);
    scatter('policecap', 5, [-95, -86, -48, -24], 0.9, 1.1, 12);

    // --- Hospital: ambulances under the canopy, visitors' cars, staff, patients' kit
    [-56.5, -53, -49.5].forEach((z) => must('hospital ambulance', ctx.placeParked('ambulance', { x: 82, z, rotY: 0 })));
    const vcars = ['car', 'carGreen', 'carYellow', 'carWhite', 'suv'];
    LOT_H.forEach((s) => { if (rand() < 0.72) ctx.placeParked(ctx.pick(vcars), s); });
    const HZ = [79, 92, -47, -26];
    scatter('doctor', 5, HZ, 1, 1, 12);
    scatter('nurse', 5, HZ, 1, 1, 12);
    scatter('medkit', 8, [78, 110, -58, -14], 0.9, 1.1, 12);
    scatter('wheelchair', 4, [84, 90, -42, -30], 1, 1, 12);
    scatter('stretcher', 3, [79, 86, -46, -40], 1, 1, 12);
    put('bench', 85.5, -30.4, -PI / 2, 1, { move: null }); put('bench', 85.5, -44.2, -PI / 2, 1, { move: null });
    put('hospitalSign', 66.5, -62.5, 0); put('hospitalSign', 66.5, -25.5, 0);
    scatter('tree', 12, [70, 115, -26, -8]);
    scatter('tree', 10, [70, 115, -112, -100]);
    scatter('tree', 5, [106, 116, -98, -28]);
    scatter('bush', 14, [76, 92, -62, -27], 0.9, 1.1, 12);

    // --- Houses in neat rows facing the street
    const houseKinds = ['house', 'houseBlue', 'houseYellow'];
    HOUSES.forEach((h, i) => place(houseKinds[i % 3], h.x, h.z, h.rotY, 1, { move: null }));

    // --- Fire vehicles lined up on the red apron, nose toward the station
    place('fireengine', -10, -30, PI / 2, 1);
    place('laddertruck', 10, -30, PI / 2, 1);
    place('fireengine', -10, -14, PI / 2, 1);
    place('ambulance', 12, -14, PI / 2, 1);
    // ...and emergency vehicles patrolling the streets
    const drive = (name, key, count, speed, offset = 2.5) =>
      ctx.placeOnRoute(name, R[key], { count, speed, offset, speedJitter: 0.2 });
    for (const d of ['F', 'R']) {
      drive('fireengine', 'loop' + d, 1, 6);
      drive('laddertruck', 'loop' + d, 1, 5);
      drive('ambulance', 'loop' + d, 2, 7);
      drive('policecar', 'loop' + d, 2, 8, 3.6);
      drive('suv', 'loop' + d, 1, 6.5);
    }
    drive('fireengine', 'wn', 1, 6);
    drive('policecar', 'en', 1, 8);
    drive('ambulance', 'es', 1, 7);
    // engines responding to the two fires + hospital shuttle
    drive('fireengine', 'toA', 1, 7);
    drive('policecar', 'toA', 1, 8);
    drive('fireengine', 'toB', 1, 7);
    drive('ambulance', 'toB', 1, 7.5);
    drive('ambulance', 'hosp', 1, 5, 1.5);
    drive('car', 'hosp', 1, 4.5, 1.5);

    // --- Traffic along the roads
    const cars = ['car', 'carGreen', 'carYellow', 'carWhite'];
    for (const d of ['F', 'R']) cars.forEach((nm, i) => drive(nm, 'loop' + d, 3, 7.5, i % 2 ? 3.6 : 2.2));
    for (const k of ['w0', 'e0', 'w70', 'e70', 'wn', 'en', 'ws', 'es']) {
      drive(cars[Math.floor(rand() * 4)], k, 2, 7);
    }

    // --- Parked vehicles: station staff lots (with the odd police car / SUV), a public car park, kerbside spots
    const staff = [...cars, 'suv', 'policecar', 'carWhite'];
    LOT_A.forEach((s) => { if (rand() < 0.6) ctx.placeParked(ctx.pick(staff), s); });
    LOT_B.forEach((s) => { if (rand() < 0.6) ctx.placeParked(ctx.pick(['policecar', 'ambulance', ...cars]), s); });
    LOT_C.forEach((s) => { if (rand() < 0.65) ctx.placeParked(ctx.pick(cars), s); });
    CURB.forEach((s) => { if (rand() < 0.38) ctx.placeParked(ctx.pick(cars), s); });

    // --- Trees, pines, benches, mailboxes, hydrants
    blocks('tree', 55);
    blocks('pine', 40);
    scatter('tree', 15, ALL);
    // benches sit on the pavement facing the street
    for (let x = -100; x <= 100; x += 20) {
      if (Math.abs(Math.abs(x) - 60) < 9) continue;
      place('bench', x + 5, 6.9, PI, 1, { move: null });
      place('bench', x - 5, -6.9, 0, 1, { move: null });
      place('bench', x + 5, 76.9, PI, 1, { move: null });
      place('bench', x - 5, 63.1, 0, 1, { move: null });
    }
    blocks('mailbox', 35);
    scatter('mailbox', 8, ALL);
    // hydrants along the sidewalks
    for (let x = -S + 5; x < S - 5; x += 8) {
      if (rand() < 0.6) put('hydrant', x + randRange(-1, 1), 9 * (rand() < 0.5 ? 1 : -1), undefined, 1);
    }
    scatter('hydrant', 30, ALL, 0.9, 1.1, 12);

    // --- Starter cluster around the spawn
    const START = [-28, 28, -28, 28];
    scatter('hydrant', 6, START, 0.9, 1.1, 12);
    scatter('helmet', 8, START, 0.9, 1.1, 12);
    scatter('cone', 10, START, 0.9, 1.1, 12);
    scatter('firefighter', 5, START, 0.9, 1.1, 12);
    scatter('extinguisher', 5, START, 0.9, 1.1, 12);
    scatter('dalmatian', 4, START, 0.9, 1.1, 12);
    scatter('medkit', 6, START, 0.9, 1.1, 12);
    scatter('policecap', 4, START, 0.9, 1.1, 12);

    // --- Small stuff everywhere; gear piled near the station
    const APRON = [-38, 38, -42, -4];
    scatter('helmet', 15, APRON, 0.9, 1.1, 12);
    scatter('axe', 15, APRON, 0.9, 1.1, 12);
    scatter('hosereel', 12, APRON, 0.9, 1.1, 12);
    scatter('extinguisher', 10, APRON, 0.9, 1.1, 12);
    scatter('ladder', 10, APRON, 0.9, 1.1, 12);
    scatter('firefighter', 25, APRON, 0.9, 1.1, 12);
    scatter('firefighter', 35, ALL, 0.9, 1.1, 12);
    scatter('dalmatian', 25, ALL, 0.9, 1.1, 12);
    scatter('helmet', 25, ALL, 0.9, 1.1, 12);
    scatter('axe', 20, ALL, 0.9, 1.1, 12);
    scatter('hosereel', 18, ALL, 0.9, 1.1, 12);
    scatter('extinguisher', 25, ALL, 0.9, 1.1, 12);
    scatter('ladder', 14, ALL, 0.9, 1.1, 12);
    scatter('cone', 45, ALL, 0.9, 1.1, 12);
    scatter('bush', 45, ALL, 0.9, 1.15, 12);
    for (let x = -S + 6; x < S - 6; x += 6) {
      place('cone', x + randRange(-1.5, 1.5), 7.4 + randRange(0, 0.4), undefined, 1);
      place('cone', x + randRange(-1.5, 1.5), -7.4 - randRange(0, 0.4), undefined, 1);
    }
  },
};
