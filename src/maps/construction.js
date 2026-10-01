import { buildProtos } from '../objects/construction.js';

const ASPHALT = '#54575c';
const YELLOW = '#f2c230';
const PI = Math.PI;
const WHITE = '#e9e9e9';

// Routes are created in decorate() and used in populate().
const R = {};
let LOT_NE = [];
let LOT_OFFICE = [];
let SHOULDER = [];
const DEPOT = { dump: [], mixer: [] };

export default {
  id: 'construction',
  name: 'Construction Yard',
  description: 'Gobble up cones, trucks and even a tower crane!',
  cardColor: '#f5a623',
  emoji: '🚧',
  size: 120,
  groundColor: '#8a7a5a',
  skyColor: '#bfe3ff',
  fogColor: '#e4dcc4', // dusty haze
  lightColor: '#fff4d6',
  ambient: 0.6,
  // Warm late-morning sun through a light dusty haze.
  lighting: {
    sunDirection: [-45, 62, 30], sunColor: '#ffe6b8', sunIntensity: 0.76 * Math.PI,
    hemiSkyColor: '#e2e6dc', hemiGroundColor: '#9c8560', hemiIntensity: 0.58 * Math.PI,
    shadowOpacity: 0.72, shadowRadius: 3.0, environmentIntensity: 0.26, exposure: 1.04,
  },
  postProcessing: { aoRadius: 0.55, aoStrength: 0.17 },
  groundStyle: 'dirt',
  sky: { top: '#86b9e6', horizon: '#eadfc6' },
  clouds: true,
  backdrop: [
    { type: 'hills', color: '#a39a6a', color2: '#8fa06e' },
    { type: 'city', side: 'north', color: '#a8b0bd', color2: '#8a7a5a' },
    { type: 'city', side: 'east', color: '#b3a99a', color2: '#8a7a5a' },
  ],
  edge: 'fence',
  buildProtos,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, rand, randRange } = ctx;
    const S = ctx.size;

    // Dirt patches
    addDecal(circle(30, 40, 24, 32), '#75653f', { style: 'dirt' });
    addDecal(circle(30, 40, 15, 32), '#63532f', { style: 'dirt' });
    for (let i = 0; i < 14; i++) {
      const c = i % 2 ? '#7d6d4c' : '#98865f';
      addDecal(circle(randRange(-S, S), randRange(-S, S), randRange(5, 13)), c, { style: 'dirt' });
    }
    // muddy puddles and a few weedy tufts of grass around the edges
    for (const [x, z, r] of [[-20, 30, 3.2], [45, -35, 2.6], [-85, 25, 3.5], [100, 15, 2.4]]) addDecal(circle(x, z, r, 20), '#6f6242', { style: 'water' });
    for (let i = 0; i < 10; i++) {
      const x = randRange(-S, S), z = randRange(-S, S);
      if (Math.abs(x) < 70 && Math.abs(z) < 90) continue;
      addDecal(circle(x, z, randRange(3, 6)), '#8b9a5a', { style: 'grass' });
    }
    // concrete slabs under the cranes and the site offices
    addDecal(merge([rect(-36, -30, 14, 14), rect(46, -30, 14, 14), rect(90, 60, 14, 14), rect(80, 46, 10, 66)]), '#b3b0a6', { style: 'concrete' });
    // depot pad
    addDecal(rect(-86, -30, 48, 36), '#9c9a92', { style: 'concrete' });
    // tyre tracks through the dirt
    const trk = [];
    for (let i = 0; i < 6; i++) trk.push(rect(30 + (i % 2 ? 1.2 : -1.2) * 0.5, 22 + i * 2, 0.5, 3.2, 0.1 * i));
    for (let x = -110; x < -60; x += 3) trk.push(rect(x, 62 + Math.sin(x * 0.3) * 1.5, 2.2, 0.35), rect(x, 64.2 + Math.sin(x * 0.3) * 1.5, 2.2, 0.35));
    addDecal(merge(trk), '#58482a', { style: 'dirt' });

    // Roads
    addDecal(merge([
      rect(0, 0, S * 2, 12),
      rect(-50, 0, 10, S * 2),
      rect(60, 0, 10, S * 2),
      rect(-30, -55, S * 2 - 60, 8),
      rect(35, 75, S * 2 - 70, 8),
    ]), ASPHALT, { style: 'asphalt' });
    // road shoulders (worn gravel edges)
    const sh = [];
    for (const [x0, x1] of [[-S, -55], [-45, 55], [65, S]]) for (const z of [-6.8, 6.8]) sh.push(rect((x0 + x1) / 2, z, x1 - x0, 1.2)); // gaps at the two N-S roads
    addDecal(merge(sh), '#8b826a', { style: 'dirt' });
    // manhole covers
    const mh = [[-20, 3], [25, -3], [-50, 30], [60, -30], [60, 50], [-50, -30], [-75, -55], [80, 75]];
    addDecal(merge(mh.map(([x, z]) => circle(x, z, 0.9, 14))), '#3b3d41');
    addDecal(merge(mh.map(([x, z]) => circle(x, z, 0.65, 14))), '#4a4d52');

    // Lane dashes
    const dashes = [];
    for (let x = -S + 4; x < S; x += 10) {
      if (Math.abs(x + 50) > 8 && Math.abs(x - 60) > 8) dashes.push(rect(x, 0, 5, 0.4));
    }
    for (let z = -S + 4; z < S; z += 10) {
      if (Math.abs(z) > 8) {
        dashes.push(rect(-50, z, 0.4, 5));
        dashes.push(rect(60, z, 0.4, 5));
      }
    }
    addDecal(merge(dashes), YELLOW);

    // Site parking lots (stall lines drawn by the engine) + machinery depot bays
    LOT_NE = ctx.parkingLot(90, -82, 44, 24, { rotY: 0, color: '#5b5e63' });
    LOT_OFFICE = ctx.parkingLot(104, 36, 20, 30, { rotY: 0, color: '#5b5e63' });
    const bays = [];
    for (let i = 0; i <= 7; i++) bays.push(rect(-106 + i * 7, -40, 0.25, 11), rect(-106 + i * 7, -20, 0.25, 11));
    addDecal(merge(bays), WHITE);
    for (let i = 0; i < 7; i++) {
      DEPOT.dump.push({ x: -102.5 + i * 7, z: -40, rotY: PI / 2 });
      DEPOT.mixer.push({ x: -102.5 + i * 7, z: -20, rotY: PI / 2 });
    }

    // site ground: slabs under the buildings, gravel laydown yard, excavation pit, haul tracks between the sites
    // hardcore / compacted gravel over each fenced plot, plank-mat haul roads, then the slabs under every building
    addDecal(merge([rect(-23, -30, 40, 40), rect(33, -30, 40, 40), rect(93, -30, 50, 40), rect(-23, 40, 40, 58), rect(93, 41, 50, 56), rect(-86, -90, 56, 54), rect(5, -90, 92, 54), rect(92, -90, 52, 54), rect(5, 98, 96, 36), rect(92, 98, 52, 36)]), '#9b937f', { style: 'dirt' });
    addDecal(merge([rect(-23, -42, 38, 3.4), rect(-23, -17, 38, 3.4), rect(33, -42, 38, 3.4), rect(33, -17, 38, 3.4), rect(93, -17, 46, 3.4), rect(93, -43, 46, 3.4), rect(-23, 18, 38, 3.4), rect(-23, 62, 38, 3.4), rect(5, -72, 90, 3.4), rect(5, -110, 90, 3.4), rect(-86, -72, 52, 3.4), rect(5, 112, 94, 3.4), rect(92, 112, 48, 3.4), rect(-41, 40, 3.4, 40), rect(5, 98, 3.4, 30), rect(70, 98, 3.4, 30)]), '#7c7666', { style: 'dirt' });
    addDecal(merge([rect(-15, -30, 28, 18), rect(26, -30, 28, 16), rect(94, -28, 34, 18), rect(-23, 40, 31, 17), rect(107, 60, 28, 18), rect(-86, -90, 34, 20), rect(-20, -92, 31, 20), rect(24, -92, 33, 18), rect(90, -107, 28, 16), rect(5, 98, 31, 17), rect(-29, 97, 29, 16), rect(36, 98, 28, 16), rect(92, 98, 33, 18)]), '#aaa79c', { style: 'concrete' });
    // yard hardstanding under the stockpile rows
    addDecal(merge([rect(-23, -46, 40, 10), rect(33, -46, 40, 10), rect(93, -46, 46, 10), rect(-86, -70, 52, 8), rect(-23, -70, 40, 8), rect(33, -70, 40, 8), rect(-23, 16, 40, 9), rect(-23, 65, 40, 9), rect(5, 113, 96, 9), rect(92, 113, 50, 9)]), '#b3b0a6', { style: 'concrete' });
    addDecal(merge([rect(-86, 80, 56, 74), rect(-86, 22, 56, 28)]), '#948d7d', { style: 'dirt' });
    addDecal(rect(30, 41, 32, 26), '#5a4a2c', { style: 'dirt' });
    addDecal(merge([rect(5, -30, 8, 38), rect(5, 38, 8, 58)]), '#a99a76', { style: 'dirt' });

    // Hazard stripes near the pit
    const haz = [];
    for (let i = 0; i < 8; i++) haz.push(rect(4 + i * 3, 66, 1.4, 1.2, 0.6));
    addDecal(merge(haz), YELLOW);
    void rand;


    // --- Vehicle routes on the painted roads (right-hand lanes: each loop exists in both directions)
    const loop = (key, pts, width = 8) => {
      R[key + 'F'] = ctx.addRoute(pts, { loop: true, width });
      R[key + 'R'] = ctx.addRoute(pts.slice().reverse(), { loop: true, width });
    };
    loop('a', [[-50, 0], [60, 0], [60, -55], [-50, -55]]); // north block
    loop('b', [[-50, 0], [60, 0], [60, 75], [-50, 75]]); // south block
    // road stubs beyond the blocks: vehicles shuttle back and forth
    R.w = ctx.addRoute([[-112, 0], [-58, 0]], { loop: false, width: 8 });
    R.e = ctx.addRoute([[68, 0], [112, 0]], { loop: false, width: 8 });
    R.nw = ctx.addRoute([[-112, -55], [-58, -55]], { loop: false, width: 6 });
    R.se = ctx.addRoute([[68, 75], [112, 75]], { loop: false, width: 6 });
    // kerbside spots along the site roads for parked pickups
    SHOULDER = [
      ...ctx.roadsideSpots(R.w, { side: 'left', spacing: 8 }),
      ...ctx.roadsideSpots(R.e, { side: 'right', spacing: 8 }),
      ...ctx.roadsideSpots(R.nw, { side: 'left', spacing: 8 }),
      ...ctx.roadsideSpots(R.se, { side: 'right', spacing: 8 }),
    ];
  },

  populate(ctx) {
    const { randRange, rand, size: S } = ctx;
    // static props stay off the asphalt (movers may cross it); the road rectangles match decorate()
    const onRoad = (x, z, m) => Math.abs(z) < 6 + m || Math.abs(x + 50) < 5 + m || Math.abs(x - 60) < 5 + m
      || (x < 60 + m && Math.abs(z + 55) < 4 + m) || (x > -50 - m && Math.abs(z - 75) < 4 + m);
    const place = (n, x, z, rot, sc = 1, opts) => {
      const proto = ctx.protos[n];
      const isStatic = opts && 'move' in opts ? !opts.move : proto && !proto.move;
      if (isStatic && onRoad(x, z, (proto ? proto.radius * sc : 0) * 0.6)) return false;
      // small statics may tuck in against the big frames / stockpiles (their bounding circles are mostly empty dirt)
      if (isStatic && proto && proto.radius * sc < 6 && !opts?.overlap) opts = { ...opts, overlap: 0.5 };
      return ctx.place(n, x, z, rot, sc, opts);
    };
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          if (place(name, randRange(x0, x1), randRange(z0, z1), undefined, randRange(sMin, sMax))) break;
        }
      }
    };
    const yawOf = (dx, dz) => Math.atan2(-dz, dx);
    // n items from (x,z) stepping (dx,dz), all facing `rot` (default: along the row)
    const row = (name, x, z, dx, dz, n, rot = yawOf(dx, dz), jitter = 0) => {
      for (let i = 0; i < n; i++) place(name, x + dx * i + (jitter ? randRange(-jitter, jitter) : 0), z + dz * i + (jitter ? randRange(-jitter, jitter) : 0), rot, 1, { move: null });
    };
    // fence / hoarding run with optional gates (positions in world units along the run)
    const run = (name, x0, z0, x1, z1, gates = [], step = 3.5) => {
      const len = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / len, dz = (z1 - z0) / len, yaw = yawOf(dx, dz);
      const n = Math.max(1, Math.round(len / step));
      const st = len / n;
      for (let i = 0; i < n; i++) {
        const d = (i + 0.5) * st;
        if (gates.some((g) => Math.abs(d - g) < 3.7)) continue;
        place(name, x0 + dx * d, z0 + dz * d, yaw, 1, { move: null });
      }
      for (const g of gates) place('fenceGate', x0 + dx * g, z0 + dz * g, yaw, 1, { move: null });
    };
    // gate dressing: sign + cones either side, bins
    const gateKit = (x, z, nz) => { // nz = +1/-1: direction of the outside of the gate along z
      place('siteSign', x + 4.5, z + nz * 1.8, yawOf(1, 0), 1, { move: null });
      for (const s of [-1, 1]) {
        place('cone', x + s * 4.2, z + nz * 2.2, 0, 1, { move: null });
        place('cone', x + s * 5.0, z + nz * 2.2, 0, 1, { move: null });
      }
      place('trashcan', x - 4.6, z - nz * 1.6, 0, 1, { move: null });
      place('roadSign', x - 3.6, z + nz * 2.6, yawOf(0, nz), 1, { move: null });
    };
    const lamps = (x0, x1, z, step, arm) => { for (let x = x0; x <= x1; x += step) place('streetlight', x, z, yawOf(0, arm), 1, { move: null }); };
    const walkers = (rect, n) => scatter('worker', n, rect, 0.95, 1.1, 20);
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];

    // ===== Huge: cranes, buildings in progress (two or three per big plot) =========================================
    place('crane', -36, -30, 0, 1);
    place('crane', 46, -30, 0, 1);
    place('crane', 90, 60, 0, 1);
    place('concreteFrameM', -15, -30, 0, 1);
    place('steelFrameM', 26, -30, 0, 1);
    place('cladBrickL', 94, -28, 0, 1);
    place('cladStuccoL', -23, 40, 0, 1);
    place('concreteFrameM', 107, 60, PI, 1);
    place('brickShellL', -86, -90, 0, 1);
    place('foundationSlabL', -20, -92, 0, 1);
    place('steelFrameL', 24, -92, PI, 1);
    place('steelFrameM', 90, -107, 0, 1);
    place('cladStuccoL', 5, 98, PI, 1);
    place('cladGreyL', -29, 97, 0, 1);
    place('steelFrameM', 36, 98, PI, 1);
    place('steelFrameL', 92, 98, PI, 1);

    // ===== Site perimeters (hoarding on the road faces, mesh fence elsewhere, gates with signage) ====================
    // S1 / S2: the crane sites north of the main road
    run('hoardingGreen', -44, -10, -2, -10, [22]); gateKit(-22, -10, 1);
    run('fence', -44, -50, -44, -10); run('fence', -2, -50, -2, -10); 
    run('hoardingBlue', 12, -10, 54, -10, [20]); gateKit(32, -10, 1);
    run('fence', 12, -50, 12, -10); run('fence', 54, -50, 54, -10); 
    // mid-south sites
    run('hoardingBlue', -44, 10.5, -2, 10.5, [22]); gateKit(-22, 10.5, -1);
    run('fence', -44, 10.5, -44, 70); run('fence', -2, 10.5, -2, 70); 
    run('hoardingGreen', 12, 10.5, 54, 10.5, [20]); gateKit(32, 10.5, -1);
    run('fence', 12, 10.5, 12, 70); run('fence', 54, 10.5, 54, 70); 
    // depot (west) + laydown yard
    run('fence', -114, -50, -114, -9.5); run('fence', -114, -50, -58, -50); run('fence', -114, -9.5, -58, -9.5, [28]); gateKit(-86, -9.5, 1);
    run('fence', -114, 40, -58, 40, [28]); run('fence', -57.5, 40, -57.5, 116, [24]);
    // north-east sites
    run('hoardingGreen', 68, -10, 118, -10, [26]); gateKit(94, -10, 1);
    run('fence', 68, -50, 68, -10); run('fence', 118, -50, 118, -10); 
    run('hoardingBlue', -114, -62.5, -58, -62.5, [26]); gateKit(-88, -62.5, 1);
    run('hoardingBlue', -44, -62.5, 54, -62.5, [24, 66]); gateKit(-20, -62.5, 1); gateKit(22, -62.5, 1);
    run('fence', -42.5, -118, -42.5, -62.5); run('fence', 52.5, -118, 52.5, -62.5);
    run('fence', 65.5, -118, 65.5, -62.5);
    // south sites
    run('hoardingGreen', -44, 79.5, 54, 79.5, [44]); gateKit(0, 79.5, -1);
    run('hoardingBlue', 66, 79.5, 118, 79.5, [26]); gateKit(92, 79.5, -1);
    run('fence', -44, 79.5, -44, 118); run('fence', 54.5, 79.5, 54.5, 118); run('fence', 66, 79.5, 66, 118);
    // site-office compound edge
    run('fence', 67.5, 12, 67.5, 70, [24]);

    // ===== Site offices, welfare, yards ==============================================================================
    // west office compound: trailers in a row, porta-potties, picnic tables, parked pickups
    row('trailer', -106, 18, 12, 0, 4, 0);
    place('containerOffice', -60, 18, 0, 1, { move: null });
    row('toilet', -108, 28, 1.9, 0, 6, 0);
    place('picnic', -92, 28, 0, 1, { move: null }); place('picnic', -86, 28, 0, 1, { move: null });
    place('trashcan', -96, 25, 0, 1, { move: null }); place('trashcan', -80, 25, 0, 1, { move: null });
    place('generator', -110, 12, 0, 1, { move: null }); place('generator', -62, 28, 0, 1, { move: null });
    // east office strip: trailers along x=80, toilets in a line, picnic tables
    for (let i = 0; i < 5; i++) place('trailer', 80, 22 + i * 12, PI / 2, 1, { move: null });
    row('toilet', 72, 13, 0, 2.0, 5, PI / 2);
    row('toilet', 72, 60, 0, 2.0, 5, PI / 2);
    place('picnic', 87, 30, 0, 1, { move: null }); place('picnic', 87, 46, 0, 1, { move: null });
    for (const z of [18, 34, 50, 66]) place('trashcan', 86.5, z, 0, 1, { move: null });
    place('generator', 76, 76 - 8, 0, 1, { move: null });
    // porta-potties + containers by the north-east car park
    row('toilet', 98, -64, 1.9, 0, 6, 0);
    row('containerOffice', 74, -66, 7, 0, 3, 0);
    place('picnic', 94, -70, 0, 1, { move: null });
    place('trashcan', 96, -68, 0, 1, { move: null });
    // porta-potties in the lane between the crane sites
    row('toilet', 5, -34, 0, -2.0, 8, -PI / 2, 0);
    for (const z of [-14, -46]) place('trashcan', 8, z, 0, 1, { move: null });

    // ===== Laydown yard (west, z 44..116) in neat rows =================================================================
    row('pipestack', -106, 48, 7.5, 0, 7);
    row('lumberYard', -106, 56, 9.5, 0, 5);
    row('rebarBundle', -108, 62, 6, 0, 8);
    row('steelBundle', -107, 66.5, 6, 0, 8);
    row('pallet', -108, 72, 3.3, 0, 15, 0);
    row('brickStack', -108, 77, 4.2, 0, 11, 0);
    row('blockStack', -106, 82, 7.2, 0, 7, 0);
    row('bagPallet', -108, 87, 2.4, 0, 20, 0);
    row('pipeRack', -104, 93, 10.5, 0, 5, 0);
    row('cableDrum', -108, 98, 3, 0, 8);
    row('sandPile', -105, 104, 10, 0, 2); row('gravelPile', -85, 104, 10, 0, 2);
    row('containerRed', -108, 112, 8, 0, 3, 0); row('containerBlue', -84, 112, 8, 0, 3, 0);
    row('barrel', -64, 50, 0, 3, 8, 0); row('wheelbarrow', -64.5, 78, 0, 4, 6, PI / 2);
    place('skipBin', -62, 100, PI / 2, 1, { move: null });
    place('lightTower', -60, 62, 0, 1, { move: null }); place('lightTower', -110, 45, 0, 1, { move: null });

    // ===== Per-site material, scaffolding, welfare and parked plant (tidy rows along each plot edge) ===================
    // S1 (crane + concrete frame)
    place('lumberYard', -38, -46, 0, 1, { move: null }); place('aggregateBay', -27, -46, 0, 1, { move: null });
    row('blockStack', -17, -46, 6, 0, 2, 0); place('formworkStack', -6.5, -46, 0, 1, { move: null });
    place('pipeRack', -37, -15, 0, 1, { move: null }); place('formworkStack', -29, -15, 0, 1, { move: null });
    place('wheelLoader', -11, -15, 0, 1, { move: null }); place('excavator', -5, -17.5, PI / 2, 1, { move: null });
    place('cabinStack', -40, -39, PI / 2, 1, { move: null });
    place('scaffoldTower', -4, -24, 0, 1, { move: null }); place('scaffoldTower', -4, -37, PI, 1, { move: null });
    place('lightTower', -3.5, -46, PI, 1, { move: null }); place('skipBin', -42, -20, PI / 2, 1, { move: null });
    // S2 (crane + steel frame)
    place('pipeRack', 20, -46, 0, 1, { move: null }); place('aggregateBay', 31, -46, 0, 1, { move: null });
    place('lumberYard', 41, -46, 0, 1, { move: null }); place('blockStack', 49.5, -46, 0, 1, { move: null });
    row('blockStack', 17, -15, 6, 0, 2, 0); place('formworkStack', 29, -15, 0, 1, { move: null });
    place('wheelLoader', 40, -15, 0, 1, { move: null }); place('excavator', 48, -16, PI / 2, 1, { move: null });
    place('cabinStack', 50.5, -41, PI / 2, 1, { move: null });
    place('scaffoldTower', 14, -27, PI / 2, 1, { move: null }); place('scaffoldTower', 14, -36, PI / 2, 1, { move: null });
    place('lightTower', 13.5, -46, 0, 1, { move: null });
    // NE apartment block site
    place('pipeRack', 77, -46, 0, 1, { move: null }); row('blockStack', 86, -46, 6, 0, 2, 0);
    place('aggregateBay', 101, -46, 0, 1, { move: null }); place('formworkStack', 112, -46, 0, 1, { move: null });
    row('blockPallet', 71, -14, 0, 2.6, 6, PI / 2); row('bagPallet', 71, -29, 0, 2.4, 6, PI / 2);
    place('lumberYard', 82, -15, 0, 1, { move: null }); place('wheelLoader', 104, -14.5, 0, 1, { move: null }); place('cabinStack', 113, -17, PI / 2, 1, { move: null });
    place('scaffoldTower', 76, -38, 0, 1, { move: null }); place('scaffoldTower', 112, -30, PI, 1, { move: null });
    place('skipBin', 72, -42, 0, 1, { move: null }); place('lightTower', 115, -44, 0, 1, { move: null });
    // NW shell, N mid sites (foundation slab + steel frame), NNE frame
    place('pipeRack', -108, -70, 0, 1, { move: null }); place('aggregateBay', -97, -70, 0, 1, { move: null });
    place('lumberYard', -84, -70, 0, 1, { move: null }); row('blockStack', -73, -70, 6, 0, 2, 0);
    place('formworkStack', -105, -110, 0, 1, { move: null }); place('blockStack', -96, -110, 0, 1, { move: null });
    place('lumberYard', -85, -111, 0, 1, { move: null }); place('cabinStack', -70, -112, 0, 1, { move: null });
    place('scaffoldTower', -110, -90, 0, 1, { move: null }); place('scaffoldTower', -66, -84, PI, 1, { move: null }); place('skipBin', -66, -98, PI / 2, 1, { move: null });
    place('lumberYard', -38, -111, 0, 1, { move: null }); place('aggregateBay', -27, -111, 0, 1, { move: null }); place('pipeRack', -14, -112, 0, 1, { move: null });
    place('blockStack', -3, -112, 0, 1, { move: null }); place('formworkStack', 4, -112, 0, 1, { move: null });
    place('pipeRack', 14, -112, 0, 1, { move: null }); place('aggregateBay', 26, -112, 0, 1, { move: null }); place('lumberYard', 38, -111, 0, 1, { move: null });
    place('lumberYard', -38, -70, 0, 1, { move: null }); place('aggregateBay', -27, -70, 0, 1, { move: null }); place('pipeRack', -13, -70, 0, 1, { move: null });
    place('blockStack', 1, -70, 0, 1, { move: null }); place('cabinStack', 9, -70, 0, 1, { move: null });
    place('formworkStack', 17, -70, 0, 1, { move: null }); place('lumberYard', 26, -70, 0, 1, { move: null }); place('aggregateBay', 38, -70, 0, 1, { move: null }); place('blockStack', 48, -70, 0, 1, { move: null });
    row('wheelLoader', 2, -100, 0, 14, 2, PI / 2); place('excavator', 2, -78, PI / 2, 1, { move: null });
    place('scaffoldTower', 46, -100, 0, 1, { move: null }); place('scaffoldTower', 46, -84, PI, 1, { move: null });
    place('lightTower', -36, -76, 0, 1, { move: null }); place('lightTower', 46, -76, 0, 1, { move: null });
    row('blockStack', 70, -112, 8, 0, 2, 0); place('pipeRack', 106, -112, 0, 1, { move: null }); place('aggregateBay', 78, -100, 0, 1, { move: null }); row('bucket', 98, -98, 1.7, 0, 3, 0);
    place('formworkStack', 70, -66, 0, 1, { move: null }); place('cabinStack', 112, -66, 0, 1, { move: null });
    // mid-south glass tower site
    place('lumberYard', -38, 16, 0, 1, { move: null }); place('pipeRack', -26, 16, 0, 1, { move: null });
    place('formworkStack', -10, 16, 0, 1, { move: null }); place('blockStack', -4.5, 16, 0, 1, { move: null });
    place('aggregateBay', -38, 65, 0, 1, { move: null }); place('blockStack', -29, 65, 0, 1, { move: null });
    place('lumberYard', -19, 65, 0, 1, { move: null }); place('cabinStack', -8, 64, 0, 1, { move: null });
    place('wheelLoader', -40, 56, PI / 2, 1, { move: null }); place('excavator', -6, 50, PI, 1, { move: null }); place('excavator', -6, 28, PI, 1, { move: null });
    place('scaffoldTower', -6, 38, 0, 1, { move: null }); place('scaffoldTower', -41, 40, PI / 2, 1, { move: null });
    place('lightTower', -4.5, 62, 0, 1, { move: null }); place('skipBin', -41, 24, PI / 2, 1, { move: null });
    // pit (east): sandbags + barriers on the rim, spoil heaps
    row('barrier', 14, 25, 3, 0, 13, 0); row('barrier', 14, 57, 3, 0, 13, 0);
    row('sandbag', 14, 27.5, 3, 0, 13, 0); row('sandbag', 14, 54.5, 3, 0, 13, 0);
    place('gravelPile', 50, 64, 0, 1, { move: null }); place('sandPile', 16, 64, 0, 1, { move: null }); place('sandPile', 51, 14, 0, 1, { move: null });
    row('roadSign', 14, 30, 0, 6, 4, 0); row('cone', 14, 36, 0, 3, 5, 0);
    place('lightTower', 14, 14, 0, 1, { move: null });
    // south sites (three frames in the west/centre plot, a big steel frame in the east plot)
    place('lumberYard', -38, 113, 0, 1, { move: null }); place('pipeRack', -26, 113, 0, 1, { move: null });
    place('aggregateBay', -13, 113, 0, 1, { move: null }); place('blockStack', -2, 113, 0, 1, { move: null }); place('formworkStack', 6, 113, 0, 1, { move: null });
    place('lumberYard', 17, 113, 0, 1, { move: null }); place('blockStack', 27, 113, 0, 1, { move: null }); place('aggregateBay', 38, 113, 0, 1, { move: null }); place('cabinStack', 49, 111, 0, 1, { move: null });
    row('blockPallet', -40, 84, 2.6, 0, 3, 0); row('bagPallet', -40, 88, 2.4, 0, 3, 0);
    row('rebarBundle', 22, 84, 6, 0, 3, 0);
    place('wheelLoader', -11, 86, 0, 1, { move: null }); place('excavator', 51, 90, PI / 2, 1, { move: null });
    place('scaffoldTower', 22, 102, PI / 2, 1, { move: null }); place('scaffoldTower', -16, 102, PI / 2, 1, { move: null });
    place('skipBin', 53, 100, 0, 1, { move: null }); place('lightTower', -42, 112, 0, 1, { move: null });
    row('steelBundle', 70, 84, 6, 0, 3, 0); place('pipeRack', 76, 113, 0, 1, { move: null }); place('lumberYard', 90, 113, 0, 1, { move: null });
    place('aggregateBay', 104, 113, 0, 1, { move: null }); place('cabinStack', 112, 88, 0, 1, { move: null });
    place('containerRed', 114, 80.5, 0, 1, { move: null }); place('containerBlue', 106, 80.5, 0, 1, { move: null });
    place('scaffoldTower', 70, 100, PI / 2, 1, { move: null }); place('wheelLoader', 73, 92, 0, 1, { move: null });
    // east office block: formwork + rebar by the frame, a cabin block and plant at the top of the strip
    row('rebarBundle', 98, 74, 0, 0, 1, 0); row('pallet', 112, 70, 0, 3, 2, 0); row('bucket', 94, 70, 1.6, 0, 3, 0);
    place('cabinStack', 112, 15, 0, 1, { move: null }); place('cabinStack', 103, 15, 0, 1, { move: null }); place('formworkStack', 96, 15, 0, 1, { move: null });
    place('aggregateBay', 100, 68, 0, 1, { move: null }); place('scaffoldTower', 106, 46, 0, 1, { move: null }); place('scaffoldTower', 94, 48, 0, 1, { move: null });
    // second rows along the stockpile strips + a plant park on the north-centre plot + pallet rows on the south strips
    row('rebarBundle', -41, -42, 6.5, 0, 5, 0); row('rebarBundle', 15, -42, 6.5, 0, 5, 0); row('steelBundle', 74, -42, 6.5, 0, 6, 0);
    row('bagPallet', -41, -12.5, 3, 0, 10, 0); row('blockPallet', 15, -12.5, 3, 0, 10, 0); row('bagPallet', 74, -12.5, 3, 0, 12, 0);
    for (let i = 0; i < 8; i++) place(i % 3 === 0 ? 'wheelLoader' : i % 3 === 1 ? 'excavator' : 'bulldozer', -34 + i * 11, -76, PI / 2, 1, { move: null });
    row('pallet', -41, 117, 4, 0, 10, 0); row('pallet', 15, 117, 4, 0, 9, 0); row('cableDrum', 70, 117, 4, 0, 11, 0);
    // west office compound: two-storey cabin blocks; east strip: formwork column + pipe rack
    row('cabinStack', -108, 35, 8, 0, 6, 0);
    row('formworkStack', 89, 20, 0, 7, 5, PI / 2); place('pipeRack', 84, 68, 0, 1, { move: null });
    // parked plant along the pit's east rim
    for (let i = 0; i < 5; i++) place(i % 2 ? 'bulldozer' : 'excavator', 50.5, 22 + i * 9.5, PI / 2, 1, { move: null });
    // crane-base ballast pallets + depot yard kit
    place('lightTower', -112, -14, 0, 1, { move: null }); place('skipBin', -60, -46, 0, 1, { move: null });
    place('containerOffice', -110, -46, 0, 1, { move: null }); place('picnic', -100, -14, 0, 1, { move: null });
    place('trashcan', -94, -14, 0, 1, { move: null }); place('trashcan', -78, -14, 0, 1, { move: null });
    place('generator', -64, -14, 0, 1, { move: null });

    // ===== Vehicles ===================================================================================================
    const drive = (name, key, count, speed, offset = 2) => // 3.8-wide trucks must stay on the 8-wide roads
      ctx.placeOnRoute(name, R[key], { count, speed, offset, speedJitter: 0.2 });
    for (const d of ['F', 'R']) {
      drive('mixer', 'a' + d, 1, 5); drive('dumptruck', 'a' + d, 1, 4.5); drive('pickup', 'a' + d, 1, 6);
      drive('mixer', 'b' + d, 1, 5); drive('dumptruck', 'b' + d, 1, 4.5); drive('pickup', 'b' + d, 1, 6);
    }
    drive('mixer', 'w', 1, 4.5); drive('dumptruck', 'e', 1, 4); drive('dumptruck', 'nw', 1, 4); drive('mixer', 'se', 1, 4.5);
    DEPOT.dump.forEach((s) => { if (rand() < 0.7) ctx.placeParked('dumptruck', s); });
    DEPOT.mixer.forEach((s) => { if (rand() < 0.75) ctx.placeParked('mixer', s); });
    // earthmovers working the pit; skid steers around the sites
    scatter('bulldozer', 4, [16, 50, 29, 53], 0.95, 1.05);
    scatter('excavator', 4, [16, 50, 29, 53], 0.95, 1.05);
    scatter('excavator', 1, [-40, -6, 14, 66]);
    scatter('skidsteer', 3, [-42, -4, -48, -12]); scatter('skidsteer', 3, [14, 52, -48, -12]); scatter('skidsteer', 3, [70, 116, 76, 116]);
    // parking
    const trucks = ['pickup', 'pickupBlue', 'pickupWhite', 'pickupGreen'];
    LOT_NE.forEach((sp) => { if (rand() < 0.85) ctx.placeParked(ctx.pick(trucks), sp); });
    LOT_OFFICE.forEach((sp) => { if (rand() < 0.85) ctx.placeParked(ctx.pick(trucks), sp); });
    SHOULDER.forEach((sp) => { if (rand() < 0.25) ctx.placeParked(ctx.pick(trucks), sp); });

    // ===== Street furniture along the main road + lanes (regular spacing, no ring around spawn) =========================
    lamps(-46, 56, -8.6, 12, -1); lamps(-40, 56, 8.6, 12, 1);
    lamps(-112, -56, -8.6, 14, -1); lamps(70, 116, 8.6, 14, 1); lamps(70, 116, -8.6, 14, -1);
    for (let z = -50; z <= 112; z += 14) { place('streetlight', -57, z, 0, 1, { move: null }); place('streetlight', 67, z, PI, 1, { move: null }); }
    for (const x of [-30, 30]) for (const s of [-1, 1]) {
      place('trashcan', x, s * 8.8, 0, 1, { move: null });
      place('trashcan', x + 14, s * 8.8, 0, 1, { move: null });
    }
    // lane closure bollards: cones + barriers only at work zone entrances and road edges next to active sites
    for (let x = -22; x <= 40; x += 4) { if (Math.abs(x - 5) < 4) continue; place('cone', x, -7.4, 0, 1, { move: null }); place('cone', x + 2, 7.4, 0, 1, { move: null }); }
    for (const x of [-12, 16, 36]) { place('barrier', x, -7.6, 0, 1, { move: null }); place('barrier', x + 6, 7.6, 0, 1, { move: null }); }
    for (const x of [-100, -80, -64, 80, 100]) { place('barrier', x, 7.6, 0, 1, { move: null }); place('cone', x + 3, 7.4, 0, 1, { move: null }); place('cone', x - 3, 7.4, 0, 1, { move: null }); }
    for (const z of [-30, 30, -10, 15]) { place('cone', -43.8, z, 0, 1, { move: null }); place('cone', 53.8, z, 0, 1, { move: null }); }
    for (const x of [-100, -70, 80, 110]) { place('barrier', x, -57.6 - 0, 0, 1, { move: null }); place('barrier', x, -52.4, 0, 1, { move: null }); }

    // ===== Workers doing things around each site + a few tidy odds and ends =============================================
    walkers([-42, -4, -48, -12], 7); walkers([14, 52, -48, -12], 7); walkers([70, 116, -48, -12], 6);
    walkers([-42, -4, 12, 68], 6); walkers([14, 52, 26, 56], 3); walkers([-112, -62, 12, 34], 4); walkers([-112, -62, 44, 112], 4);
    walkers([-112, -62, -48, -12], 3); walkers([-112, -62, -118, -62], 4); walkers([-42, 52, -118, -64], 6); walkers([70, 116, 82, 118], 3); walkers([-42, 52, 82, 118], 3);
    walkers([-4, 14, -48, 66], 6);
    // crew crossing the road at the site gates (movers may use the asphalt) so the first seconds already have life
    for (const [x, z] of [[-14, 8.5], [14, 8.5], [-14, -8.5], [20, -8.5], [-30, 8.5], [30, -8.5]]) ctx.place('worker', x, z, 0, 1, { move: { type: 'walk', speed: 1.5, range: 7 } });
    scatter('wheelbarrow', 4, [-42, 52, -48, 66], 1, 1, 30);
    scatter('toolbox', 5, [-110, -62, 12, 32], 1, 1, 30); scatter('toolbox', 3, [-42, -4, -48, -12], 1, 1, 30);
    scatter('barrel', 6, [-110, -62, 40, 112], 1, 1, 30);
    scatter('brick', 6, [70, 116, -48, -12], 1, 1, 30);
    scatter('pallet', 6, [-4, 14, -48, 66], 1, 1, 30);
    scatter('generator', 3, [-42, 52, -118, -64], 1, 1, 30);
    scatter('pipe', 8, [-112, -62, 90, 112], 1, 1, 30);
  },
};
