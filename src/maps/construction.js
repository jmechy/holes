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
    addDecal(merge([rect(-25, -35, 14, 14), rect(38, -20, 14, 14), rect(90, 60, 14, 14), rect(80, 46, 10, 66)]), '#b3b0a6', { style: 'concrete' });
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
    LOT_NE = ctx.parkingLot(85, -88, 50, 34, { rotY: 0, color: '#5b5e63' });
    LOT_OFFICE = ctx.parkingLot(104, 36, 20, 30, { rotY: 0, color: '#5b5e63' });
    const bays = [];
    for (let i = 0; i <= 7; i++) bays.push(rect(-106 + i * 7, -40, 0.25, 11), rect(-106 + i * 7, -20, 0.25, 11));
    addDecal(merge(bays), WHITE);
    for (let i = 0; i < 7; i++) {
      DEPOT.dump.push({ x: -102.5 + i * 7, z: -40, rotY: PI / 2 });
      DEPOT.mixer.push({ x: -102.5 + i * 7, z: -20, rotY: PI / 2 });
    }

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
      return ctx.place(n, x, z, rot, sc, opts);
    };
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          if (place(name, randRange(x0, x1), randRange(z0, z1), undefined, randRange(sMin, sMax))) break;
        }
      }
    };
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];

    // --- Huge: tower cranes
    place('crane', -25, -35, 0, 1);
    place('crane', 38, -20, 0, 1);
    place('crane', 90, 60, 0, 1);

    // --- Site offices (row NE) + toilets + generators
    for (let i = 0; i < 5; i++) place('trailer', 80, 22 + i * 12, Math.PI / 2, 1);
    scatter('trailer', 3, [-110, -62, 10, 30], 1, 1);
    for (let i = 0; i < 6; i++) place('toilet', 72 + (i % 2) * 1.8, 16 + i * 10.5, 0, 1, { move: null });
    scatter('toilet', 8, [66, 112, 10, 70], 0.95, 1.1);
    scatter('generator', 9, [-112, 112, -112, 112], 0.9, 1.15);

    // --- Big vehicles
    // Mixers, dump trucks and pickups drive the yard roads
    const drive = (name, key, count, speed, offset = 2) => // 3.8-wide trucks must stay on the 8-wide roads
      ctx.placeOnRoute(name, R[key], { count, speed, offset, speedJitter: 0.2 });
    for (const d of ['F', 'R']) {
      drive('mixer', 'a' + d, 1, 5);
      drive('dumptruck', 'a' + d, 1, 4.5);
      drive('pickup', 'a' + d, 1, 6);
      drive('mixer', 'b' + d, 1, 5);
      drive('dumptruck', 'b' + d, 1, 4.5);
      drive('pickup', 'b' + d, 1, 6);
    }
    drive('mixer', 'w', 1, 4.5);
    drive('dumptruck', 'e', 1, 4);
    drive('dumptruck', 'nw', 1, 4);
    drive('mixer', 'se', 1, 4.5);
    // machinery depot: trucks parked nose to tail in painted bays
    DEPOT.dump.forEach((s) => { if (rand() < 0.7) ctx.placeParked('dumptruck', s); });
    DEPOT.mixer.forEach((s) => { if (rand() < 0.75) ctx.placeParked('mixer', s); });
    scatter('bulldozer', 6, [10, 55, 22, 60], 0.95, 1.1);
    scatter('excavator', 5, [10, 55, 22, 60], 0.95, 1.1);
    scatter('excavator', 2, ALL);
    scatter('pipestack', 12, [-112, -60, 40, 105], 0.95, 1.1);
    scatter('pipestack', 2, ALL);

    // --- Parking: pickups in the site lots and along the road shoulders
    const trucks = ['pickup', 'pickupBlue', 'pickupWhite', 'pickupGreen'];
    LOT_NE.forEach((sp) => { if (rand() < 0.45) ctx.placeParked(ctx.pick(trucks), sp); });
    LOT_OFFICE.forEach((sp) => { if (rand() < 0.5) ctx.placeParked(ctx.pick(trucks), sp); });
    SHOULDER.forEach((sp) => { if (rand() < 0.3) ctx.placeParked(ctx.pick(trucks), sp); });
    scatter('skidsteer', 11, ALL, 0.95, 1.1);

    // --- Medium: material yard + barriers
    scatter('pallet', 50, [-112, -58, 40, 105], 0.9, 1.15);
    scatter('pallet', 20, ALL);
    scatter('brickStack', 30, [-112, -58, 40, 105]);
    scatter('brickStack', 15, ALL);
    scatter('pipe', 50, [-112, -58, 40, 105]);
    scatter('pipe', 15, ALL);
    for (let x = -S + 8; x < S - 8; x += 12) {
      place('barrier', x + randRange(-2, 2), (x / 12) % 2 ? 9 : -9, 0, 1);
    }
    scatter('barrier', 40, ALL, 0.9, 1.15);
    scatter('wheelbarrow', 30, ALL, 0.9, 1.15);

    // --- Starter cluster around the player spawn so the first seconds are rewarding
    const START = [-28, 28, -28, 28];
    scatter('cone', 14, START, 0.9, 1.1, 12);
    scatter('brick', 12, START, 0.9, 1.1, 12);
    scatter('toolbox', 6, START, 0.9, 1.1, 12);
    scatter('worker', 5, START, 0.9, 1.1, 12);

    // --- Small: cones along roads then everywhere, workers, bricks, barrels, toolboxes
    for (let x = -S + 6; x < S - 6; x += 6) {
      place('cone', x + randRange(-1.5, 1.5), 7.4 + randRange(0, 0.5), undefined, 1);
      place('cone', x + randRange(-1.5, 1.5), -7.4 - randRange(0, 0.5), undefined, 1);
    }
    scatter('cone', 130, ALL, 0.9, 1.15, 12);
    scatter('worker', 90, ALL, 0.9, 1.15, 12);
    scatter('barrel', 55, [-112, -58, 40, 105], 0.9, 1.15);
    scatter('barrel', 45, ALL, 0.9, 1.15);
    scatter('brick', 130, ALL, 0.9, 1.15, 12);
    scatter('toolbox', 60, ALL, 0.9, 1.15, 12);
  },
};
