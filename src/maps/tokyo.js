import { buildProtos } from '../objects/tokyo.js';

const ROAD = '#4c4f57';
const SIDEWALK = '#a9acb4';
const WHITE = '#f2f2f2';
const LAWN = '#86c96e';
const LAWN2 = '#74b85e';
const PETAL = '#ffcfe3';
const GRAVEL = '#d6c8a4';

const VENDING = ['vendingRed', 'vendingBlue', 'vendingGreen', 'vendingYellow', 'vendingPink'];
const KEI = ['keiCarWhite', 'keiCarYellow', 'keiCarBlue', 'keiCarPink'];
const SHOPS = ['shopA', 'shopB', 'shopC', 'shopD'];
const PEOPLE = ['salaryman', 'schoolgirl', 'tourist', 'kimono'];
const WALKERS = new Set([...PEOPLE, 'cat', 'cat2']);

// Regions (used by both decorate and populate)
const PARK = [72, 112, 8, 58];      // cherry blossom park (x0,x1,z0,z1)
const TEMPLE = [-106, -70, -46, -14];
const RAIL_Z = -100;

const inBox = (x, z, b, m = 0) => x > b[0] - m && x < b[1] + m && z > b[2] - m && z < b[3] + m;

export default {
  id: 'tokyo',
  name: 'Tokyo',
  description: 'Neon streets, vending machines, bullet trains and Tokyo Tower!',
  cardColor: '#ff5fa8',
  emoji: '🗾',
  size: 120,
  groundColor: '#8d9098',
  skyColor: '#f8c9e2',
  fogColor: '#f8c9e2',
  lightColor: '#fff0f6',
  ambient: 0.62,
  groundStyle: 'concrete',
  // Bright, slightly cool daylight; the warm accents come from the neon, lanterns and awnings.
  lighting: {
    sunDirection: [34, 62, 30], sunColor: '#fff6ea', sunIntensity: 0.76 * Math.PI,
    hemiSkyColor: '#c6dcf9', hemiGroundColor: '#9b94a6', hemiIntensity: 0.6 * Math.PI,
    shadowOpacity: 0.72, shadowRadius: 2.8, environmentIntensity: 0.3, exposure: 1.04,
  },
  postProcessing: { aoRadius: 0.5, aoStrength: 0.17 },
  sky: { top: '#7aa6ee', horizon: '#f8c9e2' },
  clouds: true,
  backdrop: [
    { type: 'city', color: '#9aa6c4', color2: '#6c7284' },
    { type: 'mountains', side: 'north', color: '#7d8fb0', color2: '#ffffff' },
  ],
  edge: 'barrier',
  buildProtos,

  routes: null,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, randRange } = ctx;
    const S = ctx.size;

    // --- Roads: main cross + secondary grid
    addDecal(merge([
      rect(0, 0, S * 2, 14), rect(0, 0, 14, S * 2),
      rect(-62, 0, 10, S * 2), rect(62, 0, 10, S * 2),
      rect(0, -62, S * 2, 10), rect(0, 62, S * 2, 10),
    ]), ROAD, { style: 'asphalt' });

    // Sidewalk strips beside the main roads
    const sw = [];
    for (const s of [-1, 1]) {
      for (const [t0, t1] of [[-S, -67], [-57, 57], [67, S]]) { // gaps where the secondary roads cross
        sw.push(rect((t0 + t1) / 2, s * 8.6, t1 - t0, 1.6), rect(s * 8.6, (t0 + t1) / 2, 1.6, t1 - t0));
      }
    }
    addDecal(merge(sw), SIDEWALK, { style: 'concrete' });

    // Lane dashes on the secondary roads
    const dash = [];
    for (let t = -S + 4; t < S; t += 9) {
      for (const c of [-62, 62]) {
        if (Math.abs(t) > 9 && Math.abs(t - c) > 8) dash.push(rect(t, c, 4, 0.3), rect(c, t, 0.3, 4));
      }
    }
    for (let t = -S + 4; t < S; t += 9) {
      if (Math.abs(t) > 20 && Math.abs(Math.abs(t) - 62) > 8) dash.push(rect(t, 0, 4, 0.3), rect(0, t, 0.3, 4));
    }
    addDecal(merge(dash), '#f2c230');

    // --- Shibuya scramble crossing at the spawn
    addDecal(rect(0, 0, 28, 28), '#55585f', { style: 'asphalt' });
    const zebra = [];
    for (let i = -3; i <= 3; i++) {
      const t = i * 2;
      zebra.push(rect(10.5, t, 3, 1.1), rect(-10.5, t, 3, 1.1), rect(t, 10.5, 1.1, 3), rect(t, -10.5, 1.1, 3));
    }
    addDecal(merge(zebra), WHITE);
    const diag = [];
    for (const rot of [Math.PI / 4, -Math.PI / 4]) {
      for (let t = -16; t <= 16; t += 2.6) {
        const c = Math.cos(Math.PI / 4) * t, s = Math.sin(Math.PI / 4) * t;
        diag.push(rect(rot > 0 ? c : c, rot > 0 ? s : -s, 1.5, 3.0, rot));
      }
    }
    addDecal(merge(diag), WHITE);
    addDecal(circle(0, 0, 2.2, 20), '#ff5fa8');
    // crosswalks at the secondary intersections, stop lines, manhole covers
    const zx = [], stop = [], mh = [];
    for (const c of [-62, 62]) for (const d of [-1, 1]) {
      for (let i = -3; i <= 3; i++) {
        zx.push(rect(c + i * 1.4, d * 8.4, 0.7, 2.2), rect(d * 8.4, c + i * 1.4, 2.2, 0.7));
      }
    }
    for (let t = -100; t <= 100; t += 25) if (Math.abs(t) > 12) mh.push(circle(t, 2.5, 0.5, 10), circle(2.5, t, 0.5, 10));
    for (const s of [-1, 1]) stop.push(rect(s * 2.5, 14.5 * s, 6, 0.4), rect(14.5 * s, -s * 2.5, 0.4, 6));
    addDecal(merge(zx), WHITE);
    addDecal(merge(stop), WHITE);
    addDecal(merge(mh), '#3d4046');

    // --- Railway (bullet train line)
    addDecal(rect(0, RAIL_Z, S * 2.4, 11), '#6b665e', { style: 'sand' });
    addDecal(rect(0, RAIL_Z, S * 2.4, 9), '#8f8a7e', { style: 'sand' });
    const sleepers = [];
    for (let x = -S; x <= S; x += 1.6) sleepers.push(rect(x, RAIL_Z, 0.5, 5.6));
    addDecal(merge(sleepers), '#5a4a3a');
    addDecal(merge([rect(0, RAIL_Z - 2.0, S * 2.4, 0.3), rect(0, RAIL_Z + 2.0, S * 2.4, 0.3)]), '#d9dde2');
    // gravel platform + station stripe
    addDecal(rect(0, RAIL_Z + 8.5, S * 2.4, 6), '#b9b3a6', { style: 'concrete' });
    addDecal(rect(0, RAIL_Z + 6.2, S * 2.4, 0.4), '#f2c230');
    // level crossings: the roads that run through the railway are repainted over the track bed and platform
    addDecal(merge([rect(0, RAIL_Z + 3, 14, 19), rect(-62, RAIL_Z + 3, 10, 19), rect(62, RAIL_Z + 3, 10, 19)]), ROAD, { style: 'asphalt' });

    // --- Cherry blossom park
    const px = (PARK[0] + PARK[1]) / 2, pz = (PARK[2] + PARK[3]) / 2;
    addDecal(rect(px, pz, PARK[1] - PARK[0], PARK[3] - PARK[2]), LAWN, { style: 'grass' });
    const lawnPatches = [];
    for (let i = 0; i < 10; i++) lawnPatches.push(circle(randRange(PARK[0] + 4, PARK[1] - 4), randRange(PARK[2] + 4, PARK[3] - 4), randRange(2, 5), 12));
    addDecal(merge(lawnPatches), LAWN2, { style: 'grass' });
    addDecal(circle(px + 6, pz + 12, 9.9, 24), '#c9cfd6', { style: 'concrete' });
    addDecal(circle(px + 6, pz + 12, 8.6, 24), '#7cc8ee', { style: 'water' });
    const path = [];
    path.push(rect(px, pz - 8, PARK[1] - PARK[0], 3), rect(px - 8, pz, 3, PARK[3] - PARK[2]));
    addDecal(merge(path), GRAVEL, { style: 'sand' });
    const petals = [];
    for (let i = 0; i < 26; i++) petals.push(circle(randRange(PARK[0] + 3, PARK[1] - 3), randRange(PARK[2] + 3, PARK[3] - 3), randRange(1.2, 3.2), 10));
    addDecal(merge(petals), PETAL);

    // --- Temple compound (gravel + stone path)
    addDecal(rect(-88, -30, TEMPLE[1] - TEMPLE[0], TEMPLE[3] - TEMPLE[2]), GRAVEL, { style: 'sand' });
    addDecal(rect(-88, -30, 3.6, TEMPLE[3] - TEMPLE[2]), '#b3aa96', { style: 'concrete' });
    addDecal(merge([rect(-88, -14, 8, 1.2), rect(-88, -44, 12, 1.2)]), '#b3aa96');

    // --- Colourful shop-front tile strips in the blocks
    const tiles = [];
    for (let i = 0; i < 30; i++) {
      const x = randRange(-S + 6, S - 6), z = randRange(-S + 6, S - 6);
      const w = randRange(4, 9), d = randRange(4, 9);
      // shop-front tiles lie on the blocks only, never across a road (roads: 0 +-7, +-62 +-5)
      const hitsRoad = (v, h) => Math.abs(v) < 9 + h || Math.abs(Math.abs(v) - 62) < 5 + h;
      if (hitsRoad(x, w / 2) || hitsRoad(z, d / 2)) continue;
      tiles.push(rect(x, z, w, d));
    }
    addDecal(merge(tiles), '#9a9da6', { style: 'concrete' });
    // --- Traffic routes (used by populate): four quadrant loops on the main + secondary roads (all turning the
    // same way so shared edges carry opposite directions), spurs to the map edge, and the bullet train line.
    const rt = (this.routes = { quads: [], spurs: [] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const pts = [[0, 0], [62 * sx, 0], [62 * sx, 62 * sz], [0, 62 * sz]];
      if (sx * sz < 0) pts.reverse();
      rt.quads.push(ctx.addRoute(pts, { loop: true, width: 8 }));
    }
    for (const s of [-1, 1]) {
      rt.spurs.push(ctx.addRoute([[s * 66, 0], [s * 110, 0]], { loop: false, width: 8 }));
      rt.spurs.push(ctx.addRoute([[0, s * 66], [0, s * 110]], { loop: false, width: 8 }));
      rt.spurs.push(ctx.addRoute([[-110, s * 62], [110, s * 62]], { loop: false, width: 6 }));
      rt.spurs.push(ctx.addRoute([[s * 62, -110], [s * 62, 110]], { loop: false, width: 6 }));
    }
    rt.rail = ctx.addRoute([[-100, RAIL_Z], [100, RAIL_Z]], { loop: false, width: 8, network: 'rail' });

    // --- Parking: a station lot beside the railway, a shopping-district lot, a temple-side lot, and kerbside
    // parking along the two main streets (only the loop segments / spurs that run on the wide roads).
    this.lots = {
      station: ctx.parkingLot(-35, -76, 40, 18, { stallW: 2.6, stallD: 5, aisle: 6, color: '#5d6068', lineColor: '#f2f2f2' }),
      shop: ctx.parkingLot(95, -38, 36, 34, { stallW: 2.6, stallD: 5, aisle: 6, color: '#5d6068', lineColor: '#f2f2f2' }),
      temple: ctx.parkingLot(-90, 32, 40, 34, { stallW: 2.6, stallD: 5, aisle: 6, color: '#5d6068', lineColor: '#f2f2f2' }),
    };
    this.curb = [];
    for (const R of rt.quads) {
      this.curb.push(...ctx.roadsideSpots(R, { side: 'right', spacing: 6, from: 0.08, to: 0.23 }));
      this.curb.push(...ctx.roadsideSpots(R, { side: 'right', spacing: 6, from: 0.77, to: 0.97 }));
    }
    for (let i = 0; i < rt.spurs.length; i++) if (rt.spurs[i].width === 8) {
      this.curb.push(...ctx.roadsideSpots(rt.spurs[i], { side: 'right', spacing: 6 }), ...ctx.roadsideSpots(rt.spurs[i], { side: 'left', spacing: 6 }));
    }
  },

  populate(ctx) {
    const { place, randRange, rand, pick, size: S } = ctx;
    const isRoad = (x, z, m = 0) =>
      (Math.abs(x) < 14 + m && Math.abs(z) < 14 + m) || // scramble crossing
      Math.abs(x) < 8 + m || Math.abs(z) < 8 + m ||
      Math.abs(Math.abs(x) - 62) < 6 + m || Math.abs(Math.abs(z) - 62) < 6 + m;
    const blocked = (x, z, m = 0) =>
      isRoad(x, z, m) || Math.abs(z - RAIL_Z) < 8 + m || (z < RAIL_Z + 15 && z > RAIL_Z - 8) ||
      inBox(x, z, PARK, m) || inBox(x, z, TEMPLE, m);
    // city(): buildings etc. only in the block interiors
    const LOTS = [[-55, -15, -85, -67], [77, 113, -55, -21], [-110, -70, 15, 49]];
    const inLot = (x, z) => LOTS.some((b) => x > b[0] - 1 && x < b[1] + 1 && z > b[2] - 1 && z < b[3] + 1);
    // buildings face the nearest street (their front is local +Z)
    const facing = (x, z) => {
      let best = 1e9, rot = 0;
      for (const c of [-62, 0, 62]) {
        if (Math.abs(z - c) < best) { best = Math.abs(z - c); rot = z < c ? 0 : Math.PI; }
        if (Math.abs(x - c) < best) { best = Math.abs(x - c); rot = x < c ? Math.PI / 2 : -Math.PI / 2; }
      }
      return rot;
    };
    const city = (names, n, box, sMin = 1, sMax = 1, tries = 40) => {
      const list = Array.isArray(names) ? names : [names];
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          const x = randRange(box[0], box[1]), z = randRange(box[2], box[3]);
          if (blocked(x, z, 1) || inLot(x, z)) continue;
          const nm = pick(list);
          if (place(nm, x, z, SHOPS.includes(nm) || nm.startsWith('sky') || nm === 'neonTower' ? facing(x, z) : undefined, randRange(sMin, sMax))) break;
        }
      }
    };
    // any(): small stuff anywhere except the railway
    const any = (names, n, box, sMin = 0.9, sMax = 1.1, tries = 20) => {
      const list = Array.isArray(names) ? names : [names];
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          const x = randRange(box[0], box[1]), z = randRange(box[2], box[3]);
          if (Math.abs(z - RAIL_Z) < 6 || inLot(x, z)) continue;
          const nm = pick(list);
          if (!WALKERS.has(nm) && isRoad(x, z, -0.5)) continue;
          if (place(nm, x, z, undefined, randRange(sMin, sMax))) break;
        }
      }
    };
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];

    // --- Parked cars: nose-in stalls in the lots, parallel along the wide-road kerbs
    const PARKED = [...KEI, 'taxi', ...KEI];
    for (const s of this.lots.station) rand() < 0.65 && ctx.placeParked(pick(PARKED), s);
    for (const s of this.lots.shop) rand() < 0.6 && ctx.placeParked(pick(PARKED), s);
    for (const s of this.lots.temple) rand() < 0.5 && ctx.placeParked(pick(PARKED), s);
    for (const s of this.curb) rand() < 0.5 && ctx.placeParked(pick(PARKED), s);

    // --- Huge landmarks
    place('tokyoTower', 32, -32, 0, 1);
    place('skytree', -32, 32, 0, 1);

    // --- Railway: bullet train sets (nose + 2 cars) shuttling along the line
    ctx.placeOnRoute('bulletSet', this.routes.rail, { count: 2, speed: 12, offset: 0 });

    // --- Temple compound
    place('pagoda', -101, -22, 0, 1);
    place('shrine', -88, -38, 0, 1);
    place('shrine', -76, -22, -Math.PI / 2, 0.85);
    place('torii', -88, -14, 0, 1);
    place('torii', -88, -21, 0, 0.9);
    place('torii', -88, -27, 0, 0.8);
    for (let z = -44; z < -14; z += 5) {
      place('lantern', -84.2, z, 0, 1);
      place('lantern', -91.8, z, 0, 1);
    }
    for (let i = 0; i < 6; i++) place('omamori', randRange(-104, -72), randRange(-44, -16), undefined, 1);
    for (let i = 0; i < 4; i++) place('bonsai', randRange(-104, -72), randRange(-44, -16), undefined, 1);
    place('pineTree', -98, -40, 0, 1);
    place('pineTree', -104, -34, 0, 0.9);
    place('pineTree', -74, -42, 0, 1);
    // gates on the main streets
    place('torii', 0, 32, Math.PI / 2, 1);
    place('torii', 0, -32, Math.PI / 2, 1);
    place('torii', -32, 0, 0, 1);

    // --- Skyscrapers and neon towers
    const CITY_ALL = [-S + 3, S - 3, -S + 3, S - 3];
    city('skyC', 5, CITY_ALL);
    city('skyA', 9, CITY_ALL);
    city('skyB', 9, CITY_ALL);
    city('pagoda', 1, CITY_ALL);
    city('neonTower', 9, CITY_ALL);
    city('shrine', 1, CITY_ALL);

    // --- Traffic: buses / trucks / taxis / kei cars drive the roads; a few scooters weave along too
    const rt = this.routes;
    const HEAVY = ['busTokyo', 'scrambleTruck'];
    const LIGHT = [...KEI, 'taxi', 'taxi'];
    rt.quads.forEach((R, i) => {
      ctx.placeOnRoute(HEAVY[i % 2], R, { count: 2, speed: 5, offset: 3, speedJitter: 0.1 });
      ctx.placeOnRoute(pick(LIGHT), R, { count: 3, speed: 7.5, offset: 3, speedJitter: 0.2 });
      ctx.placeOnRoute(pick(LIGHT), R, { count: 2, speed: 6.5, offset: 3, speedJitter: 0.2 });
      ctx.placeOnRoute('scooter', R, { count: 2, speed: 5, offset: 1.2, speedJitter: 0.2 });
    });
    rt.spurs.forEach((R, i) => {
      const long = R.total > 100;
      ctx.placeOnRoute(i % 3 === 0 ? pick(HEAVY) : pick(LIGHT), R, { count: long ? 2 : 1, speed: 6, offset: long ? 2.2 : 3, speedJitter: 0.2 });
      if (long) ctx.placeOnRoute(pick(LIGHT), R, { count: 1, speed: 7, offset: 2.2, speedJitter: 0.2 });
    });

    // --- Medium: shops, stalls, cherry blossoms, trees
    city(SHOPS, 55, CITY_ALL);
    city('ramenStall', 24, CITY_ALL);
    city('bentoStall', 22, CITY_ALL);
    for (let i = 0; i < 26; i++) place(pick(['sakura', 'sakura2']), randRange(PARK[0] + 4, PARK[1] - 4), randRange(PARK[2] + 4, PARK[3] - 4), undefined, randRange(0.9, 1.15));
    for (let i = 0; i < 24; i++) place('sakuraSmall', randRange(PARK[0] + 2, PARK[1] - 2), randRange(PARK[2] + 2, PARK[3] - 2), undefined, randRange(0.9, 1.15));
    city(['sakura', 'sakura2', 'pineTree'], 22, CITY_ALL);
    place('shrine', 82, 50, 0, 0.9);

    // --- Starter cluster around the spawn (scramble crossing crowd + vending)
    const START = [-22, 22, -22, 22];
    any(PEOPLE, 16, START, 0.9, 1.1, 12);
    any(VENDING, 8, START, 0.95, 1.05, 12);
    any('lantern', 6, START, 0.95, 1.05, 12);
    any('bicycle', 4, START, 0.9, 1.1, 12);
    any(['cat', 'cat2'], 5, START, 0.9, 1.1, 12);
    any('bonsai', 4, START, 0.9, 1.1, 12);

    // --- Small
    any(VENDING, 115, ALL);
    any(PEOPLE, 100, ALL);
    any('bicycle', 60, ALL);
    any('scooter', 25, ALL);
    any('lantern', 100, ALL);
    any(['cat', 'cat2'], 35, ALL);
    any('bonsai', 65, ALL);
    any('omamori', 30, ALL);
    any(PEOPLE, 40, [PARK[0], PARK[1], PARK[2], PARK[3]], 0.9, 1.1, 12);
    any(['bonsai', 'cat', 'cat2'], 12, [PARK[0], PARK[1], PARK[2], PARK[3]], 0.9, 1.1, 12);
  },
};
