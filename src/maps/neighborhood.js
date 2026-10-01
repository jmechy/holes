// Neighborhood: a suburb built from real CC0 Kenney models (see public/models/*/License.txt).
// Layout (world half-extent 120): a central park with the spawn, ring road A (|x|,|z| = 45), ring road B (100), four
// connector streets on the axes, houses in two rows per band (row 1 at +-59 facing ring A, row 2 at +-86 facing ring B).
import { buildProtos, preloadModels } from '../objects/neighborhood.js';

const RA = 45, RB = 100, RW = 8; // ring half-sizes + road width
let ringA, ringB, conN, conS, conE, conW;
let LOT = [], SIDE_A = [], SIDE_B = [];
const LOT_RECT = { cx: 0, cz: 32, w: 34, d: 13 };

const HOUSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'M', 'O', 'U'];
const HOUSE_VARIANTS = {
  A: ['', 'Red', 'Blue'], B: ['', 'Orange', 'Purple'], C: ['', 'Yellow', 'Red'], D: [''], E: ['', 'Blue', 'Orange'], F: [''], G: ['', 'Purple', 'Red'],
  H: [''], K: ['', 'Yellow', 'Blue'], M: ['', 'Orange', 'Red'], O: ['', 'Purple', 'Yellow'], U: [''],
};
const HOUSE_NAMES = HOUSES.flatMap((h) => HOUSE_VARIANTS[h].map((v) => `house${h}${v}`));

// Is (x,z) on (or next to) any painted road / parking lot? Used to keep small scatter off the asphalt.
function onRoad(x, z, pad = 0) {
  const h = RW / 2 + pad;
  const ax = Math.abs(x), az = Math.abs(z);
  if (Math.abs(ax - RA) < h && az <= RA + h) return true;
  if (Math.abs(az - RA) < h && ax <= RA + h) return true;
  if (Math.abs(ax - RB) < h && az <= RB + h) return true;
  if (Math.abs(az - RB) < h && ax <= RB + h) return true;
  if (ax < h && az >= RA && az <= RB) return true;
  if (az < h && ax >= RA && ax <= RB) return true;
  if (Math.abs(x - LOT_RECT.cx) < LOT_RECT.w / 2 + 2 + pad && Math.abs(z - LOT_RECT.cz) < LOT_RECT.d / 2 + 2 + pad) return true;
  return false;
}

export default {
  id: 'neighborhood',
  name: 'Neighborhood',
  description: 'Gobble garden gnomes, cars and whole houses in a sunny suburb!',
  cardColor: '#ff8a4c',
  emoji: '\u{1F3E1}',
  size: 120,
  groundColor: '#6cc24f',
  skyColor: '#a8dcff',
  fogColor: '#cdeeff',
  lightColor: '#fffbe6',
  ambient: 0.65,
  lighting: {
    sunDirection: [-40, 60, 35], sunColor: '#fff1d0', sunIntensity: 0.78 * Math.PI,
    hemiSkyColor: '#c2e6ff', hemiGroundColor: '#82b060', hemiIntensity: 0.6 * Math.PI,
    shadowOpacity: 0.72, shadowRadius: 3.0, environmentIntensity: 0.26, exposure: 1.03,
  },
  postProcessing: { aoRadius: 0.5, aoStrength: 0.16 },
  groundStyle: 'grass',
  edge: 'hedge',
  sky: { top: '#5aaef5', horizon: '#cdeeff' },
  clouds: true,
  backdrop: [{ type: 'hills', color: '#58ad47', color2: '#3f8f3c' }, { type: 'forest', color: '#4a9a3a', color2: '#2f7a3a' }],
  buildProtos,
  /** Real glTF models must be loaded before buildProtos() (see src/main.js). */
  preload: preloadModels,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, randRange } = ctx;
    const S = ctx.size;

    // Lawn stripes + patches
    const stripes = [];
    for (let x = -S + 8; x < S; x += 24) stripes.push(rect(x, 0, 12, S * 2));
    addDecal(merge(stripes), '#75cf58', { style: 'grass' });
    const patches = [];
    for (let i = 0; i < 26; i++) patches.push(circle(randRange(-S, S), randRange(-S, S), randRange(3, 8), 14));
    addDecal(merge(patches), '#5fb447', { style: 'grass' });

    // Central park: paths, pond, flower beds, picnic blankets, sandbox
    const paths = [rect(0, 0, 70, 4), rect(0, 0, 4, 70)];
    for (let i = 0; i < 2; i++) paths.push(rect(0, 0, 100, 3, (i ? 1 : -1) * Math.PI / 4));
    addDecal(merge(paths), '#d3c8ae', { style: 'sand' });
    addDecal(circle(0, 0, 8), '#d3c8ae', { style: 'sand' });
    addDecal(circle(-22, 20, 12.5), '#dccb94', { style: 'sand' });
    addDecal(circle(-22, 20, 10), '#4aa3e8', { style: 'water' });
    addDecal(circle(-25, 22, 5.5), '#6cbcf2', { style: 'water' });
    addDecal(merge([rect(24, -22, 12, 9), rect(-26, -24, 9, 7)]), '#e8534a');
    addDecal(merge([rect(24, -22, 10, 1), rect(-26, -24, 7, 1)]), '#ffffff');
    const beds = [];
    for (let i = 0; i < 8; i++) beds.push(circle(14 + (i % 4) * 2.4, 14 + Math.floor(i / 4) * 2.4, 1.1, 10));
    addDecal(merge(beds), '#ff6a8a', { style: 'grass' });

    // Roads: two rings + 4 connectors (all asphalt), sidewalks, centre dashes, crosswalks
    const road = [];
    for (const R of [RA, RB]) {
      road.push(rect(0, -R, R * 2 + RW, RW), rect(0, R, R * 2 + RW, RW), rect(-R, 0, RW, R * 2 + RW), rect(R, 0, RW, R * 2 + RW));
    }
    const mid = (RA + RB) / 2, len = RB - RA;
    road.push(rect(0, -mid, RW, len), rect(0, mid, RW, len), rect(-mid, 0, len, RW), rect(mid, 0, len, RW));
    addDecal(merge(road), '#3c3f45', { style: 'asphalt' });
    const walk = [];
    for (const R of [RA, RB]) for (const s of [-1, 1]) for (const o of [-1, 1]) {
      const off = R + s * 0; void off;
      walk.push(rect(0, s * R + o * (RW / 2 + 1.1), R * 2 + RW + 4, 2.2), rect(s * R + o * (RW / 2 + 1.1), 0, 2.2, R * 2 + RW + 4));
    }
    addDecal(merge(walk), '#c9c5bb', { style: 'concrete' });
    const dashes = [];
    for (let t = -RB; t < RB; t += 6) {
      for (const R of [RA, RB]) for (const s of [-1, 1]) {
        if (Math.abs(t) < R - 4) dashes.push(rect(t + 1.5, s * R, 3, 0.35), rect(s * R, t + 1.5, 0.35, 3));
      }
    }
    for (let t = RA + 5; t < RB - 4; t += 6) for (const s of [-1, 1]) dashes.push(rect(0, s * t, 0.35, 3), rect(s * t, 0, 3, 0.35));
    addDecal(merge(dashes), '#f2c230');
    const zebra = [];
    for (const R of [RA, RB]) for (const s of [-1, 1]) for (let i = -3; i <= 3; i++) {
      zebra.push(rect(i * 1.1, s * (R - RW / 2 - 1.8), 0.6, 2.4), rect(s * (R - RW / 2 - 1.8), i * 1.1, 2.4, 0.6));
    }
    addDecal(merge(zebra), '#f4f4f4');

    // Routes (MUST be before any place())
    ringA = ctx.addRoute([[-RA, -RA], [RA, -RA], [RA, RA], [-RA, RA]], { loop: true, width: RW });
    ringB = ctx.addRoute([[-RB, -RB], [RB, -RB], [RB, RB], [-RB, RB]], { loop: true, width: RW });
    conN = ctx.addRoute([[0, -RA], [0, -RB]], { loop: false, width: RW });
    conS = ctx.addRoute([[0, RA], [0, RB]], { loop: false, width: RW });
    conE = ctx.addRoute([[RA, 0], [RB, 0]], { loop: false, width: RW });
    conW = ctx.addRoute([[-RA, 0], [-RB, 0]], { loop: false, width: RW });

    // Parking lot in the park's south side (with a driveway into ring A) + kerbside spots
    LOT = ctx.parkingLot(LOT_RECT.cx, LOT_RECT.cz, LOT_RECT.w, LOT_RECT.d, { rotY: 0 });
    addDecal(merge([rect(-10, 39.5, 6, 4), rect(10, 39.5, 6, 4)]), '#3c3f45', { style: 'asphalt' });
    SIDE_A = ctx.roadsideSpots(ringA, { side: 'right', spacing: 6.6 }).concat(ctx.roadsideSpots(ringA, { side: 'left', spacing: 6.6 }));
    SIDE_B = ctx.roadsideSpots(ringB, { side: 'right', spacing: 6.6 }).concat(ctx.roadsideSpots(ringB, { side: 'left', spacing: 6.6 }));
    SIDE_A = SIDE_A.filter((s) => !(s.z > 36 && Math.abs(s.x) < 22));

    // Driveways + front walks for the two house rows
    const drives = [];
    for (const l of houseLots()) {
      const fx = Math.sin(l.rot), fz = Math.cos(l.rot); // front direction
      drives.push(rect(l.x + fx * 8.5, l.z + fz * 8.5, l.horizontal ? 3.2 : 4.5, l.horizontal ? 4.5 : 3.2));
    }
    addDecal(merge(drives), '#b9b4a8', { style: 'concrete' });
    void S;
  },

  populate(ctx) {
    const { place, randRange, rand, pick } = ctx;
    const inPond = (x, z) => Math.hypot(x - -22, z - 20) < 11;
    const put = (name, x, z, rot, sc = 1) => !inPond(x, z) && !onRoad(x, z) && place(name, x, z, rot, sc);
    const scatter = (name, n, [x0, x1, z0, z1], tries = 25) => {
      let k = 0;
      for (let i = 0; i < n; i++) for (let t = 0; t < tries; t++) {
        if (put(name, randRange(x0, x1), randRange(z0, z1), undefined, 1)) { k++; break; }
      }
      return k;
    };
    const ALL = [-114, 114, -114, 114];
    const PARK = [-38, 38, -38, 38];
    const BANDS = () => { // pick a random point in the house bands between ring A and ring B
      for (;;) { const x = randRange(-114, 114), z = randRange(-114, 114); if (Math.max(Math.abs(x), Math.abs(z)) > 52) return [x, z]; }
    };
    const scatterBand = (name, n, tries = 25) => {
      for (let i = 0; i < n; i++) for (let t = 0; t < tries; t++) { const [x, z] = BANDS(); if (put(name, x, z, undefined, 1)) break; }
    };
    const scatterPark = (name, n) => scatter(name, n, PARK, 20);

    // --- Houses first (they are the biggest things): both rows facing their road --------------------------------------------
    for (const l of houseLots()) {
      const base = HOUSES[Math.floor(rand() * HOUSES.length)];
      const vs = HOUSE_VARIANTS[base];
      const name = `house${base}${vs[Math.floor(rand() * vs.length)]}`;
      place(name, l.x + randRange(-0.8, 0.8), l.z + randRange(-0.8, 0.8), l.rot + randRange(-0.04, 0.04), randRange(0.9, 1.15));
    }
    void pick; void HOUSE_NAMES;

    // --- Landmarks in the park
    place('obelisk', -28, -28, 0.4, 1);
    place('tent', 24, -22, 0.7, 1); place('tent', 29, -24, -0.6, 1); place('tent', -26, -24, 2.2, 1);
    place('campfire', 26.5, -18, 0, 1);

    // --- Parking lot + kerbside cars (only in stalls / along the curb)
    const CARS = ['sedan', 'sedanBlue', 'sedanYellow', 'sedanGreen', 'hatch', 'hatchBlue', 'hatchPink', 'hatchOrange', 'suv', 'suvRed', 'suvBlue', 'taxi', 'van', 'vanRed', 'police'];
    const BIG = ['deliveryTruck', 'deliveryTruckBlue', 'garbageTruck', 'fireTruck'];
    LOT.forEach((s) => rand() < 0.75 && ctx.placeParked(ctx.pick(rand() < 0.12 ? BIG : CARS), s));
    SIDE_A.forEach((s) => rand() < 0.22 && ctx.placeParked(ctx.pick(rand() < 0.08 ? BIG : CARS), s));
    SIDE_B.forEach((s) => rand() < 0.09 && ctx.placeParked(ctx.pick(rand() < 0.08 ? BIG : CARS), s));

    // --- Traffic
    ctx.placeOnRoute('sedanBlue', ringA, { count: 2, speed: 5, offset: 2, speedJitter: 0.15 });
    ctx.placeOnRoute('taxi', ringA, { count: 2, speed: 6, offset: 2, speedJitter: 0.15 });
    ctx.placeOnRoute('hatchPink', ringA, { count: 1, speed: 5.5, offset: 2 });
    ctx.placeOnRoute('suvRed', ringA, { count: 1, speed: 4.5, offset: 2 });
    ctx.placeOnRoute('sedan', ringB, { count: 3, speed: 6.5, offset: 2, speedJitter: 0.2 });
    ctx.placeOnRoute('vanRed', ringB, { count: 2, speed: 6, offset: 2, speedJitter: 0.15 });
    ctx.placeOnRoute('police', ringB, { count: 2, speed: 7, offset: 2, speedJitter: 0.1 });
    ctx.placeOnRoute('garbageTruck', ringB, { count: 1, speed: 3.5, offset: 2 });
    ctx.placeOnRoute('fireTruck', ringB, { count: 1, speed: 5, offset: 2 });
    ctx.placeOnRoute('deliveryTruck', ringA, { count: 1, speed: 4, offset: 2 });
    for (const [r, n] of [[conN, 'hatch'], [conS, 'suvBlue'], [conE, 'sedanYellow'], [conW, 'hatchBlue']]) ctx.placeOnRoute(n, r, { count: 1, speed: 5, offset: 2 });

    // --- Street furniture along the curbs (lights, hydrants, mailboxes, benches, bins)
    for (let t = -RA + 10; t < RA - 6; t += 24) {
      place('streetLight', t, -RA - 5.6, undefined, 1); place('streetLightCurved', t + 9, RA + 5.6, undefined, 1);
      place('streetLight', -RA - 5.6, t + 9, undefined, 1); place('streetLightCurved', RA + 5.6, t, undefined, 1);
    }
    for (let t = -RB + 10; t < RB - 6; t += 26) {
      place('streetLightCurved', t, -RB + 5.6, undefined, 1); place('streetLight', t + 10, RB - 5.6, undefined, 1);
      place('streetLight', -RB + 5.6, t + 10, undefined, 1); place('streetLightCurved', RB - 5.6, t, undefined, 1);
    }
    for (const [x, z] of [[5.6, -RA - 5.6], [-5.6, RA + 5.6], [RA + 5.6, 5.6], [-RA - 5.6, -5.6], [5.6, -RB + 5.6], [-5.6, RB - 5.6], [RB - 5.6, -5.6], [-RB + 5.6, 5.6]]) place('trafficLight', x, z, 0, 1);
    for (const [x, z] of [[-6, -RA - 6], [6, RA + 6], [RA + 6, -6], [-RA - 6, 6]]) place('stopSign', x, z, 0, 1);
    for (let i = 0; i < 10; i++) { const s = pick(SIDE_A.concat(SIDE_B)); if (s) place('warnSign', s.x + 0, s.z + 0, undefined, 1); }
    scatterBand('hydrant', 12); scatterBand('mailbox', 16); scatterBand('trashCan', 14); scatterBand('dumpster', 6); scatterBand('barrier', 14);
    scatterPark('bench', 12); scatterPark('trashCan', 8);

    // --- Trees: backyards, park, outer hedge row
    const treeNames = ['treeA', 'treeB', 'treeC', 'treeD', 'treeE', 'treeF', 'treeBlossom', 'treeAutumn', 'pine', 'pineRound', 'suburbTree'];
    for (const n of treeNames) { scatterBand(n, 5); scatterPark(n, 2); }
    for (let i = 0; i < 8; i++) scatter(pick(treeNames), 1, [106, 116, -114, 114]); // outer rows
    for (let i = 0; i < 8; i++) scatter(pick(treeNames), 1, [-114, 114, 106, 116]);
    scatterBand('treeSmall', 14); scatterBand('suburbTreeSmall', 10); scatterPark('treeSmall', 6);

    // --- Backyard fences + planters + rocks
    for (const z of [-72, 72]) for (let x = -90; x <= 90; x += 9.2) if (Math.abs(x) > 8) place('picketFence', x, z, 0, 1);
    for (const x of [-72, 72]) for (let z = -90; z <= 90; z += 9.2) if (Math.abs(z) > 8) place('picketFence', x, z, Math.PI / 2, 1);
    scatterBand('fenceLow', 14); scatterBand('fenceYard', 12); scatterBand('planter', 16); scatterBand('rockLarge', 8); scatterBand('rockTall', 6);
    scatterBand('bushLarge', 14); scatterBand('bushDetailed', 18); scatterPark('bushDetailed', 6); scatterPark('bushLarge', 4);
    scatterBand('log', 8); scatterBand('stump', 8);

    // --- People
    for (const n of ['personA', 'personB', 'personC', 'personD', 'personE', 'personF']) { scatterBand(n, 7); scatterPark(n, 4); }

    // --- Starter cluster: many tiny things near spawn (r <= 0.9) -----------------------------------------------------------
    const ring = (name, n) => {
      for (let i = 0; i < n; i++) for (let t = 0; t < 12; t++) {
        const a = rand() * Math.PI * 2, d = randRange(5.5, 26);
        if (put(name, Math.cos(a) * d, Math.sin(a) * d, undefined, 1)) break;
      }
    };
    for (const n of ['flowerRed', 'flowerYellow', 'flowerPurple', 'flowerRed2', 'flowerYellow2', 'flowerPurple2']) ring(n, 5);
    for (const [n, c] of [['mushroomRed', 5], ['mushroomTan', 5], ['pumpkin', 4], ['melon', 3], ['carrot', 5], ['rockSmall', 4], ['stoneSmall', 4], ['trafficCone', 5],
      ['cardboardBox', 3], ['tire', 3], ['nut', 4], ['bolt', 4], ['grassTuft', 6], ['bushSmall', 3], ['soccerBall', 4], ['gnome', 3], ['flowerPot', 3]]) ring(n, c);

    // --- Small stuff everywhere (park gets extra)
    const smalls = [['flowerRed', 18], ['flowerYellow', 18], ['flowerPurple', 18], ['flowerRed2', 14], ['flowerYellow2', 14], ['flowerPurple2', 14],
      ['mushroomRed', 14], ['mushroomTan', 14], ['pumpkin', 10], ['melon', 8], ['carrot', 14], ['rockSmall', 14], ['rockFlat', 12], ['stoneSmall', 12], ['stoneSmall2', 12],
      ['trafficCone', 18], ['cardboardBox', 14], ['tire', 10], ['nut', 14], ['bolt', 14], ['grassTuft', 26], ['bushSmall', 18], ['bush', 16], ['soccerBall', 14],
      ['gnome', 14], ['flowerPot', 12], ['woodSign', 8]];
    for (const [n, c] of smalls) { scatterBand(n, Math.round(c * 0.6)); scatterPark(n, Math.ceil(c * 0.3)); }
  },
};

// House lots: two rows per side of each band. Fronts face their road (model front = +Z, so rot = atan2(dx, dz)).
let _lots = null;
function houseLots() {
  if (_lots) return _lots;
  _lots = [];
  const push = (x, z, dx, dz) => _lots.push({ x, z, rot: Math.atan2(dx, dz), horizontal: Math.abs(dx) > 0.5 });
  const step = 17;
  for (let t = -93.5; t <= 93.5; t += step) {
    if (Math.abs(t) < 12) continue;
    // row 1: ring A outside (only along the ring's extent), row 2: ring B inside (facing the ring)
    if (Math.abs(t) < 46) { push(t, -RA - 14, 0, 1); push(t, RA + 14, 0, -1); push(-RA - 14, t, 1, 0); push(RA + 14, t, -1, 0); }
    push(t, -RB + 14, 0, -1); push(t, RB - 14, 0, 1); push(-RB + 14, t, -1, 0); push(RB - 14, t, 1, 0);
  }
  return _lots;
}
