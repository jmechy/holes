import { buildProtos } from '../objects/dogpark.js';

const POND = { x: 60, z: -55, r: 20 };
const AGILITY = [-105, -45, 45, 105]; // fenced agility area
const PICNIC = [30, 100, 30, 100];

let routeMain, routeCross, routeEntry;
let LOT = [], SIDE = [];
const LOT_RECT = { cx: -35, cz: -80, w: 44, d: 22 };
const ROAD_Z = -101;
const inLotZone = (x, z) => (Math.abs(x - LOT_RECT.cx) < LOT_RECT.w / 2 + 3 && Math.abs(z - LOT_RECT.cz) < LOT_RECT.d / 2 + 3) || (z < ROAD_Z + 6 && z > ROAD_Z - 8);

// Winding path centreline
const pathX = (t) => t;
const pathZ = (t) => 26 * Math.sin(t / 22) + 8 * Math.sin(t / 9);

export default {
  id: 'dogpark',
  name: 'Dog Park',
  description: 'Gobble bones, balls and a whole pack of pups!',
  cardColor: '#7ac943',
  emoji: '🐶',
  size: 120,
  groundColor: '#63c04a',
  skyColor: '#a8e0ff',
  fogColor: '#c4ecff',
  lightColor: '#fffbe6',
  ambient: 0.65,
  // Warm sunny park afternoon: golden sun from the west, fresh blue-green sky fill, soft grounded shadows.
  lighting: {
    sunDirection: [-45, 58, 30], sunColor: '#fff0cc', sunIntensity: 0.76 * Math.PI,
    hemiSkyColor: '#bfe6ff', hemiGroundColor: '#7fa85a', hemiIntensity: 0.6 * Math.PI,
    shadowOpacity: 0.72, shadowRadius: 3.0, environmentIntensity: 0.26, exposure: 1.03,
  },
  postProcessing: { aoRadius: 0.42, aoStrength: 0.15 },
  groundStyle: 'grass',
  edge: 'hedge',
  sky: { top: '#5aaef5', horizon: '#c9efff' },
  clouds: true,
  backdrop: [{ type: 'hills', color: '#4fa040', color2: '#3f8a3a' }, { type: 'forest', color: '#4a9a3a', color2: '#2f7a3a' }],
  buildProtos,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, randRange } = ctx;
    const S = ctx.size;

    // Mown grass stripes and patches
    const stripes = [];
    for (let x = -S + 8; x < S; x += 24) stripes.push(rect(x, 0, 12, S * 2));
    addDecal(merge(stripes), '#6fcd54', { style: 'grass' });
    const patches = [];
    for (let i = 0; i < 30; i++) patches.push(circle(randRange(-S, S), randRange(-S, S), randRange(3, 8), 14));
    addDecal(merge(patches), '#58b040', { style: 'grass' });

    // Winding gravel path (chain of rotated rects) + a crossing path
    const segs = [];
    const step = 4;
    for (let t = -S; t < S; t += step) {
      const x0 = pathX(t), z0 = pathZ(t), x1 = pathX(t + step), z1 = pathZ(t + step);
      const rot = -Math.atan2(z1 - z0, x1 - x0);
      segs.push(rect((x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0) + 1.2, 6, rot));
    }
    for (let t = -S; t < S; t += step) {
      const x0 = 40 * Math.sin(t / 25) - 20, x1 = 40 * Math.sin((t + step) / 25) - 20;
      const rot = -Math.atan2(step, x1 - x0);
      segs.push(rect((x0 + x1) / 2, t + step / 2, Math.hypot(x1 - x0, step) + 1.2, 5, rot));
    }
    addDecal(merge(segs), '#c9bfa8', { style: 'sand' });

    // Ice-cream cart routes: along the winding path and the crossing path (ping-pong)
    const mainPts = [], crossPts = [];
    for (let t = -S + 12; t <= S - 12; t += 6) {
      mainPts.push([pathX(t), pathZ(t)]);
      if (t <= 90) crossPts.push([40 * Math.sin(t / 25) - 20, t]); // stops short of the fenced agility area
    }
    routeMain = ctx.addRoute(mainPts, { loop: false, width: 3 });
    routeCross = ctx.addRoute(crossPts, { loop: false, width: 3 });
    const gravel = [];
    for (let i = 0; i < 160; i++) {
      const t = randRange(-S, S);
      gravel.push(rect(pathX(t) + randRange(-1, 1), pathZ(t) + randRange(-2.4, 2.4), 0.6, 0.6, randRange(0, 3)));
    }
    addDecal(merge(gravel), '#a89e88', { style: 'sand' });

    // Entrance road along the north edge, car park below it, driveway and a footpath into the park
    routeEntry = ctx.addRoute([[-108, ROAD_Z], [108, ROAD_Z]], { loop: false, width: 8 });
    addDecal(merge([rect(0, ROAD_Z, 240, 8), rect(LOT_RECT.cx, -95.5, 8, 6)]), '#3c3f45', { style: 'asphalt' });
    addDecal(merge([rect(0, ROAD_Z - 4.25, 240, 0.5), rect(0, ROAD_Z + 4.25, 240, 0.5)]), '#d8d8d8');
    const dashes = [];
    for (let x = -110; x < 110; x += 6) dashes.push(rect(x, ROAD_Z, 3, 0.35));
    addDecal(merge(dashes), '#f2c230');
    const zebra = [];
    for (let i = -3; i <= 3; i++) zebra.push(rect(LOT_RECT.cx + 12 + i * 1.1, ROAD_Z, 0.6, 7));
    addDecal(merge(zebra), '#f2f2f2');
    LOT = ctx.parkingLot(LOT_RECT.cx, LOT_RECT.cz, LOT_RECT.w, LOT_RECT.d, { rotY: 0 });
    SIDE = ctx.roadsideSpots(routeEntry, { side: 'right', spacing: 6.5 }).filter((sp) => Math.abs(sp.x - LOT_RECT.cx) > 8 && Math.abs(sp.x - (LOT_RECT.cx + 12)) > 5);
    addDecal(rect(LOT_RECT.cx, -47, 5, 46), '#c9bfa8', { style: 'sand' }); // path from the car park into the park
    // paw prints along the path, flower beds, manhole
    const paws = [];
    for (let i = 0; i < 12; i++) paws.push(circle(LOT_RECT.cx + (i % 2 ? 0.8 : -0.8), -66 + i * 3.4, 0.35, 8));
    addDecal(merge(paws), '#a89e88');
    addDecal(merge([circle(-8, -95, 1.6, 12), circle(20, -95.5, 1.6, 12)]), '#ff8fb0');
    addDecal(circle(30, ROAD_Z + 1.5, 0.6, 12), '#2a2c30');

    // Pond with shore
    addDecal(circle(POND.x, POND.z, POND.r + 2.5, 28), '#d8c690', { style: 'sand' });
    addDecal(circle(POND.x, POND.z, POND.r, 28), '#4aa3e8', { style: 'water' });
    addDecal(circle(POND.x - 4, POND.z + 3, POND.r * 0.55, 20), '#6cbcf2', { style: 'water' });
    addDecal(merge([circle(POND.x + 8, POND.z + 6, 1.2, 10), circle(POND.x - 9, POND.z - 4, 1.0, 10), circle(POND.x + 3, POND.z - 10, 1.3, 10)]), '#3f9a4a');

    // Fenced agility area: sandy-rubber floor + white boundary lines
    const [x0, x1, z0, z1] = AGILITY;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    addDecal(rect(cx, cz, w, d), '#78c95a', { style: 'grass' });
    addDecal(merge([rect(cx, z0, w, 0.6), rect(cx, z1, w, 0.6), rect(x0, cz, 0.6, d), rect(x1, cz, 0.6, d)]), '#ffffff');
    const posts = [];
    for (let x = x0; x <= x1; x += 4) posts.push(rect(x, z0, 0.7, 0.7), rect(x, z1, 0.7, 0.7));
    for (let z = z0; z <= z1; z += 4) posts.push(rect(x0, z, 0.7, 0.7), rect(x1, z, 0.7, 0.7));
    addDecal(merge(posts), '#8f6a38');
    // course numbers as coloured start/finish pads
    addDecal(merge([rect(x0 + 6, cz, 4, 4), rect(x1 - 6, cz, 4, 4)]), '#f28a1a');

    // Picnic lawn blanket + sandbox
    addDecal(merge([rect(70, 65, 14, 10), rect(95, 88, 10, 8)]), '#e8534a');
    addDecal(merge([rect(70, 65, 12, 1.2), rect(95, 88, 8, 1.2)]), '#ffffff');
    addDecal(rect(-20, -55, 16, 16), '#e6d69a', { style: 'sand' });
    const beds = [];
    for (let i = 0; i < 10; i++) beds.push(circle(-60 + (i % 5) * 2, 8 + Math.floor(i / 5) * 2, 0.7, 8));
    addDecal(merge(beds), '#ff6a8a');
    void S;
  },

  populate(ctx) {
    const { place, randRange, rand, size: S } = ctx;
    const inPond = (x, z) => Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.5;
    // Distance-ish test against the two gravel paths (random scatter keeps off them; furniture is placed deliberately)
    const onPath = (x, z) => {
      const th = Math.atan(26 / 22 * Math.cos(x / 22) + 8 / 9 * Math.cos(x / 9));
      if (Math.abs(z - pathZ(x)) * Math.cos(th) < 4.2) return true;
      const t2 = Math.atan(40 / 25 * Math.cos(z / 25));
      return Math.abs(x - (40 * Math.sin(z / 25) - 20)) * Math.cos(t2) < 3.8;
    };
    const put = (name, x, z, rot, sc = 1) => !inPond(x, z) && !inLotZone(x, z) && !onPath(x, z) && place(name, x, z, rot, sc);
    const putAt = (name, x, z, rot, sc = 1) => !inPond(x, z) && place(name, x, z, rot, sc); // deliberate furniture
    const scatter = (name, n, [x0, x1, z0, z1], tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          if (put(name, randRange(x0, x1), randRange(z0, z1), undefined, 1)) break;
        }
      }
    };
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];
    const faceRot = (dx, dz) => Math.atan2(dx, dz); // rotY that points local +Z along (dx,dz)
    const runRot = (dx, dz) => -Math.atan2(dz, dx); // rotY that lays local +X along (dx,dz)
    const pathAt = (t) => { // centre + unit normal (towards +z side) of the winding path
      const th = Math.atan2(26 / 22 * Math.cos(t / 22) + 8 / 9 * Math.cos(t / 9), 1);
      return { x: pathX(t), z: pathZ(t), nx: -Math.sin(th), nz: Math.cos(th), th };
    };

    // --- Car park + roadside parking (cars only in stalls / along the curb)
    const carNames = ['car', 'carBlue', 'carYellow', 'carGreen', 'carWhite'];
    LOT.forEach((sp) => ctx.rand() < 0.72 && ctx.placeParked(ctx.pick(carNames), sp));
    SIDE.forEach((sp) => ctx.rand() < 0.6 && ctx.placeParked(ctx.pick(carNames), sp));
    place('parkSign', LOT_RECT.cx + 13, -91.5, 0, 1);
    ctx.placeOnRoute('carBlue', routeEntry, { count: 2, speed: 5, offset: 1.6, speedJitter: 0.15 });

    // --- Huge landmarks
    place('giantDoghouse', -75, -75, 0, 1);
    place('boneStatue', 0, -45, 0, 1);
    place('boneStatue', 20, 70, 0, 1);
    place('gazebo', -35, 15, 0, 1);
    place('gazebo', 85, 20, 0, 1);

    // --- Large: trees, wash stations, carts (kept off the paths)
    scatter('treeBig', 10, ALL);
    scatter('tree', 24, ALL);
    scatter('treeBlossom', 12, ALL);
    scatter('pineTree', 12, ALL);
    // dog wash bays in a tidy row beside the entrance road, one more by the dog run
    [[4, -86], [17, -86], [30, -86], [43, -86]].forEach(([x, z]) => putAt('dogWash', x, z, 0, 1));
    put('dogWash', -10, 40, 0, 1);
    ctx.placeOnRoute('iceCreamCart', routeMain, { count: 2, speed: 3, offset: 0.8, speedJitter: 0.15 });
    ctx.placeOnRoute('iceCreamCart', routeCross, { count: 1, speed: 3, offset: 0.8 });
    putAt('iceCreamCart', 10, -22, 0.3, 1); putAt('iceCreamCart', 62, 12, -0.4, 1);
    scatter('doghouse', 8, ALL);

    // --- Picnic lawn: tables and umbrella tables on the lawn around the blankets, benches facing in
    const pk = [[62, 56], [62, 76], [80, 56], [82, 76], [104, 76], [104, 96], [86, 98], [64, 98]];
    pk.forEach(([x, z], i) => put(i % 2 ? 'umbrellaTable' : 'picnicTable', x, z, i % 2 ? 0 : Math.PI / 2 * (i % 4), 1));
    scatter('picnicTable', 6, PICNIC); scatter('umbrellaTable', 3, PICNIC);
    scatter('picnicTable', 4, ALL);
    // hedge L around the picnic lawn (two gaps for entrances)
    for (let x = 51; x <= 107; x += 2.1) if (!(x > 72 && x < 80)) putAt('hedge', x, 49, 0, 1);
    for (let z = 51; z <= 107; z += 2.1) if (!(z > 76 && z < 84)) putAt('hedge', 50.5, z, Math.PI / 2, 1);

    // --- Fenced dog run (agility area): white picket fence on all four sides, gate gap on the east side by the path
    const [ax0, ax1, az0, az1] = AGILITY;
    for (let x = ax0 + 1; x <= ax1 - 0.9; x += 2.05) { putAt('fence', x, az0, 0, 1); putAt('fence', x, az1, 0, 1); }
    for (let z = az0 + 3; z <= az1 - 2.9; z += 2.05) { putAt('fence', ax0, z, Math.PI / 2, 1); if (!(z > 68 && z < 77)) putAt('fence', ax1, z, Math.PI / 2, 1); }
    // gate station just outside the gate: water + food bowls, bag dispenser bin, bench, lamp
    putAt('waterBowl', ax1 + 2.2, 70, 0, 1); putAt('foodBowl', ax1 + 2.2, 75, 0, 1);
    putAt('trashCan', ax1 + 2.4, 66, 0, 1); putAt('poopBag', ax1 + 3.4, 66.4, 0, 1);
    putAt('bench', ax1 + 2.6, 62, Math.PI / 2 + Math.PI, 1); putAt('bench', ax1 + 2.6, 82, Math.PI / 2 + Math.PI, 1);
    putAt('lampPost', ax1 + 2.2, 78.4, 0, 1); putAt('lampPost', ax1 + 2.2, 61, 0, 1);
    putAt('ballBucket', ax1 - 1.6, 66, 0, 1); putAt('ballBucket', ax1 - 1.6, 78, 0, 1);
    // agility equipment + resident dogs, then play toys scattered inside the run only
    scatter('agilityJump', 12, AGILITY); scatter('tunnel', 6, AGILITY); scatter('seesaw', 4, AGILITY); scatter('weavePoles', 8, AGILITY);
    scatter('greatDane', 4, AGILITY); scatter('dalmatian', 3, AGILITY); scatter('corgi', 5, AGILITY); scatter('personHat', 4, AGILITY);
    const RUN = [ax0 + 2, ax1 - 2, az0 + 2, az1 - 2];
    for (const [n, k] of [['tennisBall', 14], ['bone', 8], ['frisbeeRed', 6], ['frisbeeBlue', 6], ['chewRope', 6], ['squeakyToy', 6], ['waterBowl', 2], ['foodBowl', 2]]) scatter(n, k, RUN, 20);

    // --- Gravel-path furniture: a station every 14 units (bench + bin + bag + bushes), lamp posts every 21, bowls at every other station
    let st = 0;
    for (let t = -S + 10; t < S - 8; t += 14, st++) {
      const c = pathAt(t), side = st % 2 ? -1 : 1;
      const d = (o, along = 0) => { const a = pathAt(t + along); return [a.x + a.nx * o, a.z + a.nz * o]; };
      const [bx, bz] = d(5.0 * side);
      putAt('bench', bx, bz, faceRot(-c.nx * side, -c.nz * side), 1); // seat faces the path
      const [tx, tz] = d(5.0 * side, 3.0); putAt('trashCan', tx, tz, 0, 1);
      const [px, pz] = d(5.0 * side, 4.2); putAt('poopBag', px, pz, 0, 1);
      if (st % 2 === 0) { const [wx, wz] = d(-4.6 * side, 1); putAt('waterBowl', wx, wz, 0, 1); const [fx, fz] = d(-4.6 * side, 2.4); putAt('foodBowl', fx, fz, 0, 1); }
      if (st % 3 === 0) { const [hx, hz] = d(-4.6 * side, 5); putAt('hydrant', hx, hz, 0, 1); }
      // flowering shrubs flank the path between stations
      for (const al of [5, 8, 11]) { const [sx, sz] = d(4.5 * (al % 2 ? 1 : -1), al); putAt('bush', sx, sz, undefined, 1); }
    }
    for (let t = -S + 14; t < S - 8; t += 21) { const a = pathAt(t), sd = Math.floor(t / 21) % 2 ? -1 : 1; putAt('lampPost', a.x + a.nx * 4.0 * sd, a.z + a.nz * 4.0 * sd, 0, 1); }
    // central junction (spawn): shrub borders edge both paths, with a bin + bag every 7 units, so the start reads as a planted park walk
    for (let t = -32; t <= 32; t += 3.4) for (const sd of [-1, 1]) { const a = pathAt(t); putAt('bush', a.x + a.nx * 4.4 * sd, a.z + a.nz * 4.4 * sd, undefined, 1); }
    for (let z = -32; z <= 32; z += 3.4) for (const sd of [-1, 1]) putAt('bush', 40 * Math.sin(z / 25) - 20 + sd * 4.0, z, undefined, 1);
    for (let t = -28; t <= 28; t += 7) { const a = pathAt(t), sd = (t / 7) % 2 ? 1 : -1; putAt('trashCan', a.x + a.nx * 3.7 * sd, a.z + a.nz * 3.7 * sd, 0, 1); putAt('poopBag', a.x + a.nx * 3.7 * sd + 0.9, a.z + a.nz * 3.7 * sd, 0, 1); }
    // cross path: bins and lamps at regular intervals as well
    for (let z = -70; z <= 86; z += 22) {
      const x = 40 * Math.sin(z / 25) - 20;
      putAt('lampPost', x + 3.6, z, 0, 1); putAt('trashCan', x - 3.6, z + 6, 0, 1); putAt('bench', x + 3.8, z + 11, faceRot(-1, 0), 1);
    }

    // --- Car-park edge: lamp posts at the lot corners and a hedge row between the road and the park
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) putAt('lampPost', LOT_RECT.cx + sx * (LOT_RECT.w / 2 + 1.5), LOT_RECT.cz + sz * (LOT_RECT.d / 2 + 1.5), 0, 1);
    for (let x = -106; x <= 106; x += 2.1) if (!(x > LOT_RECT.cx - 6 && x < LOT_RECT.cx + 6) && !(x > LOT_RECT.cx + 8 && x < LOT_RECT.cx + 16)) putAt('hedge', x, -94.5, 0, 1);
    for (let x = -50; x <= -20; x += 7.5) putAt('trashCan', x, -66.4, 0, 1);

    // --- Sandbox play area (-20,-55): toys and a bench on each side; hedge on the far sides
    for (let a = -8; a <= 8; a += 2.1) { putAt('hedge', -20 + a, -64, 0, 1); putAt('hedge', -29, -55 + a, Math.PI / 2, 1); }
    putAt('bench', -9.5, -55, Math.PI / 2, 1); putAt('bench', -20, -46, Math.PI, 1);
    for (const [n, x, z] of [['ballBucket', -23, -57], ['tennisBall', -18, -54], ['tennisBall', -21, -50], ['squeakyToy', -17, -58], ['bone', -24, -52], ['frisbeeBlue', -15, -51], ['chewRope', -19, -60], ['bone', -22, -61]]) putAt(n, x, z, undefined, 1);

    // --- Picnic lawn toys: a few balls and frisbees beside each blanket
    for (const [bx, bz] of [[70, 65], [95, 88]]) for (const [n, dx, dz] of [['tennisBall', 8.5, 1], ['frisbeeRed', -8.5, -2], ['tennisBall', 3, 7.5], ['frisbeeBlue', -4, -7.5], ['bone', 7, -6], ['squeakyToy', -7, 6.5], ['foodBowl', 9.5, 4], ['waterBowl', 9.5, 6.5]]) put(n, bx + dx, bz + dz, undefined, 1);

    // --- Pond: low safety fence around the south shore, bench-and-lamp spots, ducks on the water
    for (let a = 0.12 * Math.PI; a <= 0.88 * Math.PI; a += 2.1 / (POND.r + 3.6)) {
      const x = POND.x + Math.cos(a) * (POND.r + 3.6), z = POND.z + Math.sin(a) * (POND.r + 3.6);
      putAt('fence', x, z, runRot(-Math.sin(a), Math.cos(a)), 1);
    }
    for (const a of [0.3, 0.5, 0.7]) { const r = POND.r + 6; putAt('bench', POND.x + Math.cos(a * Math.PI) * r, POND.z + Math.sin(a * Math.PI) * r, faceRot(-Math.cos(a * Math.PI), -Math.sin(a * Math.PI)), 1); }
    for (const a of [0.2, 0.4, 0.6, 0.8]) putAt('lampPost', POND.x + Math.cos(a * Math.PI) * (POND.r + 5), POND.z + Math.sin(a * Math.PI) * (POND.r + 5), 0, 1);
    for (let i = 0; i < 6; i++) {
      const a = randRange(0, Math.PI * 2), d = randRange(2, 10);
      place('pondDuck', POND.x + Math.cos(a) * d, POND.z + Math.sin(a) * d, undefined, 1);
    }

    // --- Flower beds + sprinkler lines on the lawns (planted rows, not scattered)
    for (let i = 0; i < 10; i++) putAt('bush', -60 + (i % 5) * 2.2, 8 + Math.floor(i / 5) * 2.2, undefined, 1);
    for (let x = -20; x <= 20; x += 8) { putAt('sprinkler', x, 24, 0, 1); putAt('sprinkler', x, -24, 0, 1); }

    // --- Dogs and owners roam freely
    scatter('greatDane', 10, ALL);
    scatter('dalmatian', 12, ALL);
    scatter('husky', 10, ALL);
    scatter('labYellow', 16, ALL);
    scatter('labChoc', 12, ALL);
    scatter('corgi', 20, ALL);
    scatter('poodle', 14, ALL);
    scatter('poodleWhite', 12, ALL);
    scatter('dachshund', 22, ALL);
    scatter('puppy', 22, ALL);
    scatter('puppyBlack', 14, ALL);
    scatter('person', 12, ALL);
    scatter('personRed', 10, ALL);
    scatter('personGreen', 10, ALL);
    scatter('personDress', 10, ALL);
    scatter('personHat', 10, ALL);
    void rand;
  },
};
