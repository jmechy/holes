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
const BI = [[-120, -67], [-57, -7], [7, 57], [67, 120]]; // city block intervals (between road edges)
const PEOPLE = ['salaryman', 'schoolgirl', 'tourist', 'kimono'];
const WALKERS = new Set([...PEOPLE, 'cat', 'cat2']);

// Regions (used by both decorate and populate)
const PARK = [72, 112, 8, 58];      // cherry blossom park (x0,x1,z0,z1)
const TEMPLE = [-106, -70, -46, -14];
const RAIL = [-108, -100];   // two parallel tracks (centre-lines), one eastbound one westbound
const RAIL_MID = -104;
const RAIL_X = 170;          // the loop turns round out here, beyond the visible map

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
  // Rail corridor beyond both map edges: no backdrop buildings, and tunnel sheds swallow the trains as they leave.
  backdropClear: [
    { x0: 118, z0: -118, x1: 200, z1: -90 },
    { x0: -200, z0: -118, x1: -118, z1: -90 },
  ],
  tunnels: [
    { side: 'east', z0: -113, z1: -95, length: 62, height: 9, mouths: 2 },
    { side: 'west', z0: -113, z1: -95, length: 62, height: 9, mouths: 2 },
  ],
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

    // --- Railway: two parallel tracks. Rails sit at +-1.1 from each centre-line (the bogie gauge of the train model).
    const xings = [[0, 14], [-62, 10], [62, 10]];
    const inXing = (x, m = 0) => xings.some(([c, w]) => Math.abs(x - c) < w / 2 + m);
    for (const zc of RAIL) {
      addDecal(rect(0, zc, S * 2.6, 7.2), '#6b665e', { style: 'sand' });
      addDecal(rect(0, zc, S * 2.6, 5.4), '#8f8a7e', { style: 'sand' });
    }
    // platform between the tracks + yellow safety lines
    addDecal(rect(-32, RAIL_MID, 48, 3.6), '#b9b3a6', { style: 'concrete' });
    addDecal(merge([rect(-32, RAIL_MID - 1.5, 48, 0.25), rect(-32, RAIL_MID + 1.5, 48, 0.25)]), '#f2c230');
    // level crossings: the roads that run through the railway are repainted over the track beds
    addDecal(merge(xings.map(([c, w]) => rect(c, RAIL_MID, w, 17))), ROAD, { style: 'asphalt' });
    const sleepers = [], rails = [];
    for (const zc of RAIL) {
      for (let x = -S - 20; x <= S + 20; x += 1.6) if (!inXing(x, 0.6)) sleepers.push(rect(x, zc, 0.5, 3.8));
      rails.push(rect(0, zc - 1.1, S * 2.6, 0.26), rect(0, zc + 1.1, S * 2.6, 0.26));
    }
    addDecal(merge(sleepers), '#5a4a3a');
    addDecal(merge(rails), '#dfe3e8');
    // crossing stripes
    const xs = [];
    for (const [c, w] of xings) for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) xs.push(rect(c - w / 2 + 1 + i * (w - 2) / 5, RAIL_MID + sd * 8.1, 0.7, 0.9, 0));
    addDecal(merge(xs), '#f2c230');

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

    // --- Paved block slabs (a touch lighter than the street)
    const slabs = [];
    for (const [x0, x1] of BI) for (const [z0, z1] of BI) {
      const zz0 = z0 < -100 ? -86 : z0;
      slabs.push(rect((x0 + x1) / 2, (zz0 + z1) / 2, x1 - x0 - 1, z1 - zz0 - 1));
    }
    addDecal(merge(slabs), '#9a9da6', { style: 'concrete' });
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
      rt.spurs.push(ctx.addRoute([[0, s * 66], [0, s < 0 ? -88 : 110]], { loop: false, width: 8 }));
      rt.spurs.push(ctx.addRoute([[-110, s * 62], [110, s * 62]], { loop: false, width: 6 }));
      rt.spurs.push(ctx.addRoute([[s * 62, -88], [s * 62, 110]], { loop: false, width: 6 }));
    }
    // One closed loop: east along the south track, round a U-turn far outside the map, west along the north track.
    // Offset 0 + a loop route = the train follows the centre-line exactly with no lane shift and no cap semicircle.
    rt.rail = ctx.addRoute([[-RAIL_X, RAIL[1]], [RAIL_X, RAIL[1]], [RAIL_X, RAIL[0]], [-RAIL_X, RAIL[0]]], { loop: true, width: 5, network: 'rail' });

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
    const { randRange, rand, pick, size: S } = ctx;
    const P = Math.PI;
    const isRoad = (x, z, m = 0) =>
      (Math.abs(x) < 14 + m && Math.abs(z) < 14 + m) || // scramble crossing
      Math.abs(x) < 7 + m || Math.abs(z) < 7 + m ||
      Math.abs(Math.abs(x) - 62) < 5 + m || Math.abs(Math.abs(z) - 62) < 5 + m;
    const inRail = (z, m = 0) => z < -94 - m && z > -114 + m;
    const LOTS = [[-55, -15, -85, -67], [77, 113, -55, -21], [-110, -70, 15, 49]];
    const inLot = (x, z, m = 1) => LOTS.some((b) => x > b[0] - m && x < b[1] + m && z > b[2] - m && z < b[3] + m);
    const blocked = (x, z, m = 0) => isRoad(x, z, m) || inRail(z, -m) || inBox(x, z, PARK, m) || inBox(x, z, TEMPLE, m) || inLot(x, z, m);
    const put = (name, x, z, rot, sc = 1) => !blocked(x, z, 0.3) && ctx.place(name, x, z, rot, sc);

    // ---- building catalogue: proto -> [frontage spacing, depth]
    const BLD = {
      shopA: [4.9, 3.8], shopB: [4.9, 3.8], shopC: [5.2, 4.4], shopD: [4.6, 3.8],
      pencilA: [3.7, 4.2], pencilB: [3.7, 4.2], pencilC: [3.9, 4.2], pencilD: [3.5, 4.2],
      konbiniA: [7.2, 5.5], konbiniB: [7.2, 5.5], konbiniC: [6.6, 5.2],
      aptA: [6.6, 6], aptB: [6.5, 6], aptC: [7.6, 6.4], aptD: [6.1, 5.6],
      officeA: [7.4, 6], officeB: [8.3, 6.5], officeC: [6.5, 6], officeD: [9.2, 7],
    };
    const SHOP_ROW = ['shopA', 'shopB', 'shopC', 'shopD', 'pencilA', 'pencilB', 'pencilC', 'pencilD', 'aptA', 'aptB', 'officeA', 'konbiniA', 'konbiniB', 'konbiniC'];
    const MID_ROW = ['aptA', 'aptB', 'aptC', 'aptD', 'officeA', 'officeB', 'officeC', 'officeD', 'pencilA', 'pencilD', 'shopB', 'shopC', 'konbiniA'];
    const TALL = ['skyA', 'skyB', 'skyC', 'neonTower', 'officeC', 'officeA', 'aptD', 'skyC', 'skyA'];
    const FILL = ['aptA', 'aptB', 'aptC', 'officeB', 'officeD', 'officeA', 'aptD', 'neonTower', 'skyB'];
    const SET = 3.2;

    // ---- railway station + landmarks first (so they get room)
    ctx.place('stationHall', -32, -91, 0, 1);
    ctx.place('tokyoTower', 32, -32, 0, 1);
    ctx.place('skytree', -32, 32, 0, 1);

    // ---- parked cars: nose-in stalls in the lots, parallel along the wide-road kerbs
    const PARKED = [...KEI, 'taxi', ...KEI];
    for (const s of this.lots.station) rand() < 0.65 && ctx.placeParked(pick(PARKED), s);
    for (const s of this.lots.shop) rand() < 0.6 && ctx.placeParked(pick(PARKED), s);
    for (const s of this.lots.temple) rand() < 0.5 && ctx.placeParked(pick(PARKED), s);
    for (const s of this.curb) rand() < 0.4 && ctx.placeParked(pick(PARKED), s);

    // ---- railway: closed loop, offset 0, so every set rides exactly on a track
    ctx.placeOnRoute('bulletSet', this.routes.rail, { count: 5, speed: 15, offset: 0 });

    // ---- temple compound
    ctx.place('pagoda', -101, -22, 0, 1);
    ctx.place('shrine', -88, -38, 0, 1);
    ctx.place('shrine', -76, -22, -P / 2, 0.85);
    ctx.place('torii', -88, -14, 0, 1);
    ctx.place('torii', -88, -21, 0, 0.9);
    ctx.place('torii', -88, -27, 0, 0.8);
    for (let z = -44; z < -14; z += 5) { ctx.place('lantern', -84.2, z, 0, 1); ctx.place('lantern', -91.8, z, 0, 1); }
    ctx.place('pineTree', -98, -40, 0, 1);
    ctx.place('pineTree', -104, -34, 0, 0.9);
    ctx.place('pineTree', -74, -42, 0, 1);
    for (const x of [-104, -94, -80, -72]) for (const z of [-44, -16]) ctx.place('bonsai', x, z, 0, 1);
    for (let i = 0; i < 5; i++) ctx.place('omamori', -91.5 + (i - 2) * 1.2, -38.5, 0, 1);
    for (let x = -106; x <= -70; x += 3.4) { ctx.place('hedgeDark', x, -46.8, 0, 1); ctx.place('hedgeDark', x, -13.2, 0, 1); }
    for (let z = -45; z <= -15; z += 1.7) { ctx.place('fenceSeg', -106.8, z, P / 2, 1); ctx.place('fenceSeg', -69.2, z, P / 2, 1); }
    // gates on the main streets
    ctx.place('torii', 0, 32, P / 2, 1);
    ctx.place('torii', 0, -32, P / 2, 1);
    ctx.place('torii', -32, 0, 0, 1);

    // ---- station platform + trackside
    for (let x = -52; x <= -12; x += 8) ctx.place('streetLight', x, RAIL_MID, 0, 1);
    for (const x of [-48, -36, -24, -14]) { ctx.place('parkBench', x, RAIL_MID - 0.6, 0, 1); ctx.place('trashBin', x + 3, RAIL_MID + 0.6, 0, 1); }
    for (const x of [-44, -30, -18]) ctx.place(pick(VENDING), x, RAIL_MID + 0.5, 0, 1);
    for (let x = -112; x <= 112; x += 6.4) {
      if (Math.abs(x) < 8.5 || Math.abs(Math.abs(x) - 62) < 6.5) continue;
      ctx.place('fenceSeg', x, -94.6, 0, 1);
    }
    for (let x = -108; x <= 108; x += 27) if (!isRoad(x, -94.6, 3)) { ctx.place('signalPost', x, -94.6, 0, 1); ctx.place('signalPost', x + 13, -113.6, 0, 1); }

    // ---- cherry blossom park: trees, benches round the fountain, lamps + bins along the gravel paths, hedge edge
    const px = (PARK[0] + PARK[1]) / 2, pz = (PARK[2] + PARK[3]) / 2;
    for (let i = 0; i < 24; i++) ctx.place(pick(['sakura', 'sakura2']), randRange(PARK[0] + 4, PARK[1] - 4), randRange(PARK[2] + 4, PARK[3] - 4), undefined, randRange(0.9, 1.15));
    for (let i = 0; i < 22; i++) ctx.place('sakuraSmall', randRange(PARK[0] + 2, PARK[1] - 2), randRange(PARK[2] + 2, PARK[3] - 2), undefined, randRange(0.9, 1.15));
    for (let a = 0; a < 6; a++) ctx.place('parkBench', px + 6 + Math.cos(a * P / 3) * 11.4, pz + 12 + Math.sin(a * P / 3) * 11.4, -a * P / 3 + P / 2, 1);
    for (let x = PARK[0] + 4; x < PARK[1] - 2; x += 9) { ctx.place('streetLight', x, pz - 6, 0, 1); ctx.place('trashBin', x + 4.5, pz - 6.2, 0, 1); }
    for (let z = PARK[2] + 5; z < PARK[3] - 2; z += 9) { ctx.place('streetLight', px - 6, z, 0, 1); ctx.place('parkBench', px - 6.3, z + 4.5, P / 2, 1); }
    for (let x = PARK[0] + 1; x < PARK[1]; x += 3.4) { ctx.place('hedge', x, PARK[2] + 0.4, 0, 1); ctx.place('hedge', x, PARK[3] - 0.4, 0, 1); }
    for (let z = PARK[2] + 2; z < PARK[3]; z += 3.4) ctx.place('hedge', PARK[0] + 0.4, z, P / 2, 1);
    for (let i = 0; i < 26; i++) ctx.place(pick(PEOPLE), randRange(PARK[0] + 3, PARK[1] - 3), randRange(PARK[2] + 3, PARK[3] - 3), undefined, 1);
    for (let i = 0; i < 4; i++) ctx.place(pick(['cat', 'cat2']), randRange(PARK[0] + 3, PARK[1] - 3), randRange(PARK[2] + 3, PARK[3] - 3), undefined, 1);
    ctx.place('shrine', 82, 50, 0, 0.9);

    // ---- city blocks: street-front rows (shops, pencil buildings, konbini, apartments), then towers inside
    const SIDES = [
      { ax: 'z', side: -1, rot: P }, { ax: 'z', side: 1, rot: 0 }, { ax: 'x', side: -1, rot: -P / 2 }, { ax: 'x', side: 1, rot: P / 2 },
    ];
    const blocks = [];
    BI.forEach(([x0, x1], i) => BI.forEach(([z0, z1], j) => {
      if (j === 0) { blocks.push({ x0, x1, z0: -86, z1, i, j, rail: true }); return; } // south of the rail strip only
      if (i === 3 && j === 2) return; // park
      blocks.push({ x0, x1, z0, z1, i, j });
    }));
    for (const b of blocks) {
      for (const sd of SIDES) {
        const alongLo = sd.ax === 'z' ? b.x0 : b.z0, alongHi = sd.ax === 'z' ? b.x1 : b.z1;
        const edge = sd.ax === 'z' ? (sd.side < 0 ? b.z0 : b.z1) : (sd.side < 0 ? b.x0 : b.x1);
        if (Math.abs(edge) > 118) continue; // map edge: no road there
        if (b.rail && sd.ax === 'z' && sd.side < 0) continue; // faces the railway
        const main = Math.abs(edge) === 7;
        const row = main || Math.abs(Math.abs(edge) - 57) < 1 || Math.abs(Math.abs(edge) - 67) < 1 ? SHOP_ROW : MID_ROW;
        let t = alongLo + 1.5;
        while (t < alongHi - 3) {
          const nm = pick(row), [w, d] = BLD[nm];
          if (t + w > alongHi - 1) break;
          const c = t + w / 2, off = SET + d / 2;
          const depth = sd.side < 0 ? edge + off : edge - off;
          const ok = rand() < (main ? 0.9 : 0.78) && put(nm, sd.ax === 'z' ? c : depth, sd.ax === 'z' ? depth : c, sd.rot, 1);
          if (!ok) {
            // gap in the row: a hedge run along the property line instead
            const n = Math.min(1, Math.floor(w / 1.7));
            for (let k = 0; k < n; k++) {
              const cc = t + 0.85 + k * 1.7, dd = sd.side < 0 ? edge + SET + 0.6 : edge - SET - 0.6;
              put(rand() < 0.5 ? 'hedge' : 'hedgeDark', sd.ax === 'z' ? cc : dd, sd.ax === 'z' ? dd : cc, sd.ax === 'z' ? 0 : P / 2, 1);
            }
          } else if (rand() < 0.5) {
            // doorstep: flower pots / A-frame menu / cafe table at the shop front
            const fd = sd.side < 0 ? edge + SET - 0.7 : edge - SET + 0.7;
            const sh = c + (rand() < 0.5 ? -1.2 : 1.4);
            const r = rand();
            put(r < 0.35 ? pick(['flowerPot', 'flowerPotB']) : r < 0.55 ? 'aFrame' : r < 0.8 ? 'cafeSet' : 'planter', sd.ax === 'z' ? sh : fd, sd.ax === 'z' ? fd : sh, sd.rot, 1);
          }
          t += w;
        }
        // sidewalk furniture on this side
        const fd = sd.side < 0 ? edge + 1.3 : edge - 1.3;
        const at = (a, name, yawAlong = true) => put(name, sd.ax === 'z' ? a : fd, sd.ax === 'z' ? fd : a, yawAlong ? (sd.ax === 'z' ? 0 : P / 2) : undefined, 1);
        const phase = randRange(0, 6);
        for (let a = alongLo + 3 + phase; a < alongHi - 3; a += 25) at(a, 'streetLight');
        for (let a = alongLo + 6 + phase; a < alongHi - 3; a += 11) {
          const r = rand();
          at(a, r < 0.35 ? 'trashBin' : r < 0.55 ? 'postBox' : r < 0.9 ? pick(VENDING) : 'bikeRack');
          if (r > 0.9) { at(a + 0.3, 'bicycle', false); at(a - 0.5, 'bicycle', false); }
        }
        if (main) for (let a = alongLo + 2; a < alongHi - 2; a += 14) at(a, 'bollard');
        // bollard + planter lines guarding the pavement corners round the scramble crossing
        if (main && alongLo * alongHi < 0 === false && (alongLo === 7 || alongHi === -7)) {
          const dir = alongLo === 7 ? 1 : -1;
          for (let k = 0; k < 6; k++) at(dir * (15.5 + k * 2.6), k % 3 === 2 ? 'planter' : 'bollard');
        }
        if (!main) for (let a = alongLo + 8 + phase; a < alongHi - 6; a += 40) {
          const bd = sd.side < 0 ? edge + 0.6 : edge - 0.6;
          put('utilityPole', sd.ax === 'z' ? a : bd, sd.ax === 'z' ? bd : a, 0, 1);
        }
      }
      // interior: tallest toward the block centre
      const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
      for (let gx = b.x0 + 12; gx <= b.x1 - 12; gx += 9.6) for (let gz = b.z0 + 12; gz <= b.z1 - 12; gz += 9.6) {
        const x = gx + randRange(-1.2, 1.2), z = gz + randRange(-1.2, 1.2);
        const central = Math.hypot(x - cx, z - cz) < 16;
        const rot = Math.abs(x - cx) > Math.abs(z - cz) ? (x < cx ? -P / 2 : P / 2) : (z < cz ? P : 0);
        if (rand() < 0.88 && !put(pick(central ? TALL : FILL), x, z, rot, 1)) put(pick(FILL), x, z, rot, 1);
      }
      for (let k = 0; k < 3; k++) put(pick(['trashBin', 'bicycle', 'planter']), randRange(b.x0 + 10, b.x1 - 10), randRange(b.z0 + 10, b.z1 - 10), undefined, 1);
    }

    // ---- traffic: buses / trucks / taxis / kei cars drive the roads; a few scooters weave along too
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

    // ---- pedestrians: strolling on the pavements and crossing the scramble; a few cats
    let n = 0;
    for (let tries = 0; n < 70 && tries < 600; tries++) {
      const b = pick(blocks), sd = pick(SIDES);
      const edge = sd.ax === 'z' ? (sd.side < 0 ? b.z0 : b.z1) : (sd.side < 0 ? b.x0 : b.x1);
      if (Math.abs(edge) > 118 || (b.rail && sd.ax === 'z' && sd.side < 0)) continue;
      const a = randRange(sd.ax === 'z' ? b.x0 + 2 : b.z0 + 2, sd.ax === 'z' ? b.x1 - 2 : b.z1 - 2);
      const d = sd.side < 0 ? edge + 2.0 : edge - 2.0;
      if (put(pick(PEOPLE), sd.ax === 'z' ? a : d, sd.ax === 'z' ? d : a, undefined, 1)) n++;
    }
    for (let i = 0; i < 12; i++) ctx.place(pick(PEOPLE), randRange(-12, 12), randRange(-12, 12), undefined, 1);
    for (let i = 0; i < 14; i++) { const t = randRange(-55, 55); if (Math.abs(t) > 14) ctx.place(pick(PEOPLE), t, randRange(-6, 6), undefined, 1); }
    for (let i = 0; i < 14; i++) put(pick(['cat', 'cat2']), randRange(-S + 6, S - 6), randRange(-S + 6, S - 6), undefined, 1);
  },
};
