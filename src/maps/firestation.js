import { buildProtos } from '../objects/firestation.js';

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
let CURB = [];
let HOUSES = [];

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
  return out;
};

export default {
  id: 'firestation',
  name: 'Fire Station',
  description: 'Gobble up hydrants, fire engines and the big red station!',
  cardColor: '#e0382e',
  emoji: '🚒',
  size: 120,
  groundColor: '#7fbf6a',
  skyColor: '#cfe9ff',
  fogColor: '#cfe9ff',
  lightColor: '#fff6e0',
  ambient: 0.62,
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
    ]), WALK, { style: 'concrete' });

    // Roads (with a pale gutter line on each edge)
    addDecal(merge([
      rect(0, 0, S * 2, 12), rect(-60, 0, 10, S * 2), rect(60, 0, 10, S * 2), rect(0, 70, S * 2, 10),
    ]), ASPHALT, { style: 'asphalt' });

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
    addDecal(merge(dashes), YELLOW);

    // Crosswalks
    const cw = [];
    const zebraX = (cx, cz) => { for (let i = -3; i <= 3; i++) cw.push(rect(cx, cz + i * 1.4, 2.6, 0.8)); };
    const zebraZ = (cx, cz) => { for (let i = -3; i <= 3; i++) cw.push(rect(cx + i * 1.4, cz, 0.8, 2.6)); };
    [-48, -72, 48, 72].forEach((x) => zebraX(x, 0));
    [-72, -48, 48, 72].forEach((x) => zebraX(x, 70));
    [-60, 60].forEach((x) => { zebraZ(x, -10); zebraZ(x, 10); zebraZ(x, 60); zebraZ(x, 80); });
    for (let i = -3; i <= 3; i++) cw.push(rect(i * 1.4, -8, 0.8, 2.6));
    addDecal(merge(cw), WHITE);

    // Manhole covers
    const mh = [[-30, 2.5], [30, -2.5], [-60, -35], [60, 35], [20, 72.5], [-20, 67.5], [-100, 2.5], [100, -2.5]];
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

    // --- Parking: three lots (beside the station, and a public car park) + parallel spots along the kerbs
    LOT_A = ctx.parkingLot(41, -30, 20, 30, { rotY: 0 });
    LOT_B = ctx.parkingLot(-41, -30, 20, 30, { rotY: 0 });
    LOT_C = ctx.parkingLot(0, 100, 40, 22, { rotY: 0 });
    CURB = [
      ...ctx.roadsideSpots(R.loopF, { side: 'right', spacing: 8, gap: 0.1 }),
      ...ctx.roadsideSpots(R.loopR, { side: 'right', spacing: 8, gap: 0.1 }),
      ...['w0', 'e0', 'w70', 'e70', 'wn', 'en', 'ws', 'es'].flatMap((k) => ctx.roadsideSpots(R[k], { side: 'right', spacing: 8, gap: 0.1 })),
    ];
  },

  populate(ctx) {
    const { place, randRange, rand, size: S } = ctx;
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          if (place(name, randRange(x0, x1), randRange(z0, z1), undefined, randRange(sMin, sMax))) break;
        }
      }
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
    place('watertower', -100, 40, 0, 1);
    place('watertower', 100, -100, 0, 1);
    place('burning', 100, 45, 0, 1);
    place('burning', -100, -75, 0, 1);

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
      if (rand() < 0.6) place('hydrant', x + randRange(-1, 1), 9 * (rand() < 0.5 ? 1 : -1), undefined, 1);
    }
    scatter('hydrant', 45, ALL, 0.9, 1.1, 12);

    // --- Starter cluster around the spawn
    const START = [-28, 28, -28, 28];
    scatter('hydrant', 6, START, 0.9, 1.1, 12);
    scatter('helmet', 8, START, 0.9, 1.1, 12);
    scatter('cone', 10, START, 0.9, 1.1, 12);
    scatter('firefighter', 5, START, 0.9, 1.1, 12);
    scatter('extinguisher', 5, START, 0.9, 1.1, 12);
    scatter('dalmatian', 4, START, 0.9, 1.1, 12);

    // --- Small stuff everywhere; gear piled near the station
    const APRON = [-38, 38, -42, -4];
    scatter('helmet', 15, APRON, 0.9, 1.1, 12);
    scatter('axe', 15, APRON, 0.9, 1.1, 12);
    scatter('hosereel', 12, APRON, 0.9, 1.1, 12);
    scatter('extinguisher', 10, APRON, 0.9, 1.1, 12);
    scatter('ladder', 10, APRON, 0.9, 1.1, 12);
    scatter('firefighter', 25, APRON, 0.9, 1.1, 12);
    scatter('firefighter', 55, ALL, 0.9, 1.1, 12);
    scatter('dalmatian', 35, ALL, 0.9, 1.1, 12);
    scatter('helmet', 35, ALL, 0.9, 1.1, 12);
    scatter('axe', 30, ALL, 0.9, 1.1, 12);
    scatter('hosereel', 25, ALL, 0.9, 1.1, 12);
    scatter('extinguisher', 35, ALL, 0.9, 1.1, 12);
    scatter('ladder', 22, ALL, 0.9, 1.1, 12);
    scatter('cone', 85, ALL, 0.9, 1.1, 12);
    scatter('bush', 80, ALL, 0.9, 1.15, 12);
    for (let x = -S + 6; x < S - 6; x += 6) {
      place('cone', x + randRange(-1.5, 1.5), 7.4 + randRange(0, 0.4), undefined, 1);
      place('cone', x + randRange(-1.5, 1.5), -7.4 - randRange(0, 0.4), undefined, 1);
    }
  },
};
