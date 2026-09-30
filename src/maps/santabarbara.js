import { buildProtos } from '../objects/santabarbara.js';

const PI = Math.PI;
// Downtown grid is rotated ~40deg: u = up State Street (north-west), v = across (north-east). Origin = foot of State St.
const LEN = Math.hypot(0.64, 0.77);
const UX = -0.64 / LEN, UZ = -0.77 / LEN, VX = -UZ, VZ = UX;
const O = [0, 94];
const P = (s, t) => [O[0] + s * UX + t * VX, O[1] + s * UZ + t * VZ];
const GR = Math.atan2(-VZ, VX); // rect()/place rotY that puts local +X along v and local +Z along -u
const FACE = { sMin: GR, sMax: GR + PI, tMin: GR - PI / 2, tMax: GR + PI / 2 };

const ASPHALT = '#4d4f55', SIDEWALK = '#d9d0bb', PAVER = '#cbb89a', LAWN = '#7fb45a', LAWN2 = '#6ea24f', SAND = '#ecd9a6';
const fwyZ = (x) => 74 + 0.02 * (x + 15);
const GRID_BOX = [-148, 148, -73, 67];
const CAB_Z = 94;

function clipSeg(x0, z0, x1, z1, b) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dz = z1 - z0;
  for (const [p, q] of [[-dx, x0 - b[0]], [dx, b[1] - x0], [-dz, z0 - b[2]], [dz, b[3] - z0]]) {
    if (p === 0) { if (q < 0) return null; } else {
      const r = q / p;
      if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
  }
  return [x0 + t0 * dx, z0 + t0 * dz, x0 + t1 * dx, z0 + t1 * dz];
}

// Footprints [w, d] of the buildings used for frontage rows.
const DIM = {
  shopArcade: [11, 9], shopArcadeB: [12, 9], shopTiled: [9, 8], shopTiledB: [10, 8], shopLow: [10, 7], shopLowB: [9, 7], cafeShop: [8, 6],
  inn: [14, 10], hotelTower: [10, 9], officeBlock: [13, 10], aptSpanish: [12, 10], aptSpanishB: [11, 9], casita: [7, 6], casitaB: [7.5, 6.5],
  casitaC: [6.5, 6], hacienda: [12, 8], bungalow: [8.5, 6.5], wineBar: [8, 7], wineBarB: [9, 7], garage: [5, 5.5],
};
const COMM = ['shopArcade', 'shopArcadeB', 'shopTiled', 'shopTiledB', 'shopLow', 'shopLowB', 'cafeShop', 'shopTiled', 'shopLow'];
const MIXED = ['shopTiled', 'shopLow', 'aptSpanish', 'aptSpanishB', 'officeBlock', 'hacienda', 'cafeShop', 'shopTiledB'];
const RESI = ['casita', 'casitaB', 'casitaC', 'bungalow', 'hacienda', 'casita', 'casitaB', 'aptSpanishB'];

export default {
  id: 'santabarbara',
  name: 'Santa Barbara',
  description: 'Palms, red tile roofs and the Pacific. Swallow the Mission, the Courthouse and Stearns Wharf!',
  cardColor: '#e8825a',
  emoji: '🌴',
  size: 150,
  groundColor: '#8db063',
  groundStyle: 'grass',
  skyColor: '#6ab7f0',
  fogColor: '#cfe8f7',
  lightColor: '#fff3d6',
  ambient: 0.62,
  sky: { top: '#3f9bea', horizon: '#cfe8f7' },
  clouds: true,
  backdrop: [{ type: 'hills', color: '#a8b072', color2: '#8a9a5a' }, { type: 'mountains', side: 'north', color: '#9a8c74', color2: '#dfe6df' },
    { type: 'ocean', side: 'south', color: '#2f9fe0', color2: '#ecd9a6' }],
  edge: 'hedge',
  buildProtos,

  routes: null,
  lots: null,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, randRange, addRoute } = ctx;
    const S = ctx.size;
    const R = (this.routes = {});
    const strip = (x0, z0, x1, z1, w, box = [-149, 149, -149, 149]) => {
      const c = clipSeg(x0, z0, x1, z1, box);
      if (!c) return null;
      const len = Math.hypot(c[2] - c[0], c[3] - c[1]);
      if (len < 0.6) return null;
      return rect((c[0] + c[2]) / 2, (c[1] + c[3]) / 2, len, w, -Math.atan2(c[3] - c[1], c[2] - c[0]));
    };
    const dashes = (x0, z0, x1, z1, w, box, dl = 2, gap = 2.4) => {
      const c = clipSeg(x0, z0, x1, z1, box);
      if (!c) return [];
      const len = Math.hypot(c[2] - c[0], c[3] - c[1]), dx = (c[2] - c[0]) / len, dz = (c[3] - c[1]) / len, out = [];
      for (let d = 1; d + dl < len - 1; d += dl + gap) {
        const g = strip(c[0] + dx * d, c[1] + dz * d, c[0] + dx * (d + dl), c[1] + dz * (d + dl), w);
        if (g) out.push(g);
      }
      return out;
    };
    const uLine = (t, s0, s1, w, box) => { const a = P(s0, t), b = P(s1, t); return strip(a[0], a[1], b[0], b[1], w, box); };
    const vLine = (s, t0, t1, w, box) => { const a = P(s, t0), b = P(s, t1); return strip(a[0], a[1], b[0], b[1], w, box); };
    const uDash = (t, s0, s1, w, box) => { const a = P(s0, t), b = P(s1, t); return dashes(a[0], a[1], b[0], b[1], w, box); };
    const vDash = (s, t0, t1, w, box) => { const a = P(s, t0), b = P(s, t1); return dashes(a[0], a[1], b[0], b[1], w, box); };
    const gridRect = (s0, s1, t0, t1) => { const c = P((s0 + s1) / 2, (t0 + t1) / 2); return rect(c[0], c[1], t1 - t0, s1 - s0, GR); };
    const ok = (g) => !!g;

    // ---- Ocean, beach, wharf ------------------------------------------------
    addDecal(rect(0, 132.5, 300, 35), '#3f9fd8', { style: 'water' });
    const foam = [];
    for (let x = -145; x < 145; x += 9) foam.push(rect(x + Math.sin(x) * 3, 115.3 + Math.sin(x * 0.3) * 0.5, randRange(3, 6), 0.3), rect(x + 4, 119 + Math.cos(x) * 0.6, randRange(2, 4), 0.2));
    addDecal(rect(0, 107.5, 300, 14), SAND, { style: 'sand' });
    addDecal(rect(0, 113.6, 300, 2.4), '#cdb886', { style: 'sand' });
    addDecal(merge(foam), '#f4fbff');
    // Cabrillo Blvd: asphalt, sidewalks, bike path
    addDecal(rect(0, CAB_Z, 300, 3), SIDEWALK, { style: 'concrete' });
    addDecal(rect(0, CAB_Z - 6.5, 300, 3), SIDEWALK, { style: 'concrete' });
    addDecal(rect(0, CAB_Z + 6.5, 300, 3), SIDEWALK, { style: 'concrete' });
    addDecal(rect(0, CAB_Z, 300, 8), ASPHALT, { style: 'asphalt' });
    addDecal(rect(0, CAB_Z + 9.7, 300, 2.6), '#b8664e', { style: 'asphalt' });
    const cabDash = [];
    for (let x = -146; x < 146; x += 5) cabDash.push(rect(x, CAB_Z, 2.4, 0.2));
    addDecal(merge(cabDash), '#e8c840');
    // Stearns Wharf: narrow neck then widened deck with shops
    const deck = [rect(0, 108, 8, 24), rect(0, 138, 18, 24)];
    addDecal(merge(deck), '#a67a48');
    const planks = [];
    for (let z = 97; z < 149.5; z += 0.9) planks.push(rect(0, z, z < 120 ? 8 : 18, 0.07));
    addDecal(merge(planks), '#6b4a2a');
    addDecal(circle(0, 100.5, 7, 24), PAVER, { style: 'concrete' });
    // Harbor breakwater + docks (west)
    addDecal(rect(-72, 143, 70, 4), '#a09a8c');
    const docks = [];
    for (let i = 0; i < 4; i++) docks.push(rect(-92 + i * 14, 124, 1.6, 16));
    docks.push(rect(-70, 116, 60, 1.6));
    addDecal(merge(docks), '#8a6a42');

    // ---- Freeway + railroad (drawn before State so State shows under the bridge) --
    const fwyPts = [-149, 149].map((x) => [x, fwyZ(x)]);
    addDecal(strip(fwyPts[0][0], fwyPts[0][1], fwyPts[1][0], fwyPts[1][1], 13), '#b5b0a4', { style: 'concrete' });
    addDecal(strip(fwyPts[0][0], fwyPts[0][1], fwyPts[1][0], fwyPts[1][1], 9), ASPHALT, { style: 'asphalt' });
    addDecal(merge(dashes(fwyPts[0][0], fwyPts[0][1], fwyPts[1][0], fwyPts[1][1], 0.25, [-149, 149, 0, 149], 2, 2.5)), '#e8c840');
    const rz = (x) => fwyZ(x) + 8.3;
    addDecal(strip(-149, rz(-149), 149, rz(149), 3.6), '#9a9184', { style: 'dirt' });
    const ties = [];
    for (let x = -148; x < 148; x += 1.3) ties.push(rect(x, rz(x), 0.35, 2.6, -0.02));
    addDecal(merge(ties), '#5a4a3a');
    addDecal(merge([strip(-149, rz(-149) - 0.7, 149, rz(149) - 0.7, 0.16), strip(-149, rz(-149) + 0.7, 149, rz(149) + 0.7, 0.16)]), '#3a3a3e');

    // ---- Downtown grid: pavement, roads --------------------------------------
    const blocks = [];
    const blockOk = (s0, s1, t0, t1) => [[s0, t0], [s0, t1], [s1, t0], [s1, t1]].every(([s, t]) => {
      const [x, z] = P(s, t);
      return x > -146 && x < 146 && z > -71 && z < 65;
    });
    this.blocks = [];
    for (let k = 1; k <= 7; k++) for (let j = -5; j <= 8; j++) {
      const s0 = 10 + 30 * k + 5.5, s1 = 40 + 30 * k - 5.5;
      let t0 = 32 * j + 5.5, t1 = 32 * j + 32 - 5.5;
      if (j === 0) t0 = 9.5;
      if (j === -1) t1 = -9.5;
      if (k === 3 && (j === 0 || j === 1)) continue; // courthouse superblock
      if (k === 4 && (j === 0 || j === 1)) continue;
      const [cx, cz] = P((s0 + s1) / 2, (t0 + t1) / 2);
      if (cx < -140 || cx > 140 || cz < -66 || cz > 60) continue;
      this.blocks.push({ k, j, s0, s1, t0, t1, full: blockOk(s0, s1, t0, t1) });
    }
    const pave = [], lawns = [];
    this.blocks.forEach((b) => { if (b.full) (Math.abs(b.j + 0.5) <= 2.5 ? pave : lawns).push(gridRect(b.s0 - 1.5, b.s1 + 1.5, b.t0 - 1.5, b.t1 + 1.5)); });
    if (pave.length) addDecal(merge(pave), SIDEWALK, { style: 'concrete' });
    if (lawns.length) addDecal(merge(lawns), '#93b96a', { style: 'grass' });
    // superblock (courthouse) paving + lawn
    addDecal(gridRect(75.5, 124.5, 9.5, 58.5), SIDEWALK, { style: 'concrete' });
    addDecal(gridRect(77, 123, 11, 57), LAWN, { style: 'grass' });
    // sunken garden in front of the courthouse
    addDecal(gridRect(78, 98, 16, 44), PAVER, { style: 'concrete' });
    addDecal(gridRect(80, 96, 18, 42), LAWN2, { style: 'grass' });
    addDecal(merge([gridRect(87.5, 88.5, 18, 42), gridRect(80, 96, 29.5, 30.5)]), PAVER);
    addDecal(circle(...P(88, 30), 3.5, 24), PAVER);
    addDecal(gridRect(99, 121, 41, 50), '#e4d3ac', { style: 'concrete' });
    addDecal(gridRect(99, 121, 16.5, 43.5), '#e4d3ac', { style: 'concrete' });

    // roads
    const sw = [], road = [], mark = [];
    const tLines = [];
    for (let j = -5; j <= 9; j++) tLines.push(32 * j);
    for (const t of tLines) {
      if (t === 0) continue;
      const segs = t === 32 ? [[-40, 70], [130, 400]] : [[-40, 400]];
      for (const [a, b] of segs) {
        const g = uLine(t, a, b, 11, GRID_BOX); if (g) sw.push(g);
        const r = uLine(t, a, b, 7, GRID_BOX); if (r) road.push(r);
        mark.push(...uDash(t, a, b, 0.18, GRID_BOX));
      }
    }
    for (let k = 1; k <= 8; k++) {
      const s = 10 + 30 * k;
      const segs = k === 3 ? [[-400, -6], [66, 400]] : [[-400, 400]];
      for (const [a, b] of segs) {
        const g = vLine(s, a, b, 11, GRID_BOX); if (g) sw.push(g);
        const r = vLine(s, a, b, 7, GRID_BOX); if (r) road.push(r);
        mark.push(...vDash(s, a, b, 0.18, GRID_BOX));
      }
    }
    // State Street: wide pedestrian-friendly sidewalks + asphalt
    const stateBox = [-148, 148, -75, 96];
    sw.push(uLine(0, 0, 400, 21, stateBox));
    road.push(uLine(0, 0, 400, 10, stateBox));
    mark.push(...uDash(0, 0, 400, 0.22, stateBox));
    // Los Olivos / Mission Rd / N-S connectors in the mission band
    const bandRoads = [[-76, 8], [-101, 8]];
    for (const [z, w] of bandRoads) { sw.push(rect(0, z, 298, w + 4)); road.push(rect(0, z, 298, w)); for (let x = -145; x < 146; x += 5) mark.push(rect(x, z, 2.4, 0.18)); }
    for (const x of [-104, -56, 14, 60, 104]) { sw.push(rect(x, -110, 11, 74)); road.push(rect(x, -110, 7, 74)); for (let z = -145; z < -105; z += 5) mark.push(rect(x, z, 0.18, 2.4)); }
    addDecal(merge(sw.filter(ok)), SIDEWALK, { style: 'concrete' });
    addDecal(merge(road.filter(ok)), ASPHALT, { style: 'asphalt' });
    addDecal(merge(mark.filter(ok)), '#e8c840');
    // crosswalks at State / cross streets
    const cw = [];
    for (let k = 1; k <= 7; k++) for (const sgn of [-1, 1]) for (let i = -4; i <= 4; i++) {
      const [x, z] = P(10 + 30 * k + sgn * 5, i * 1.05);
      cw.push(rect(x, z, 0.6, 2.4, GR));
    }
    addDecal(merge(cw), '#f0f0f0');
    // wharf-base plaza over Cabrillo end of State
    addDecal(circle(0, 100.5, 5.2, 24), '#d8c9a4', { style: 'concrete' });

    // ---- Mission band ---------------------------------------------------------
    addDecal(rect(0, -111, 300, 74), '#86ab5c', { style: 'grass' });
    addDecal(rect(0, -78, 300, 6), LAWN, { style: 'grass' });
    // mission forecourt + fountain plaza
    addDecal(rect(-30, -108, 44, 8), '#e5cfa8', { style: 'concrete' });
    addDecal(circle(-30, -108, 5.2, 24), PAVER);
    addDecal(rect(-30, -127, 40, 30), LAWN2, { style: 'grass' });
    addDecal(rect(-30, -116.2, 36, 4), '#e5cfa8', { style: 'concrete' });
    addDecal(rect(-2, -118, 27, 12), '#e5cfa8', { style: 'concrete' });
    // rose garden: lawn, paths, beds
    addDecal(rect(-26, -88, 38, 19), SIDEWALK, { style: 'concrete' });
    addDecal(rect(-26, -88, 36, 17), LAWN, { style: 'grass' });
    const paths = [rect(-26, -88, 36, 1.6), rect(-26, -88, 1.6, 17)];
    const beds = [];
    const bedList = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) {
      bedList.push([-26 + sx * (3.2 + i * 5.6), -88 + sz * 4.4]);
    }
    bedList.forEach(([x, z]) => beds.push(rect(x, z, 4.8, 6.4)));
    this.beds = bedList;
    addDecal(merge(paths), '#e7d9b4');
    addDecal(circle(-26, -88, 3.2, 24), '#e7d9b4');
    addDecal(merge(beds), '#6a4a34', { style: 'dirt' });
    // mission cemetery-ish gravel + rows
    addDecal(rect(-90, -130, 30, 10), '#d8c9a0', { style: 'dirt' });

    // ---- Beach lots -----------------------------------------------------------
    this.lots = {
      wharf: ctx.parkingLot(-33, 108.8, 32, 10.5, { stallD: 5, aisle: 5.5 }),
      down: ctx.parkingLot(...P(55, 48), 21, 19, { rotY: GR, stallD: 5, aisle: 6 }),
      mission: ctx.parkingLot(-72, -90, 26, 15, { stallD: 5, aisle: 5.5 }),
      cucas: ctx.parkingLot(...P(131, -47), 14, 16, { rotY: GR, stallD: 5, aisle: 6 }),
      east: ctx.parkingLot(100, 108.8, 30, 10.5, { stallD: 5, aisle: 5.5 }),
    };

    // ---- Routes (traffic) -----------------------------------------------------
    const line = (pts, w) => addRoute(pts, { loop: false, width: w });
    const pu = (t, s0, s1) => { const a = P(s0, t), b = P(s1, t); const c = clipSeg(a[0], a[1], b[0], b[1], [-146, 146, -71, 66]); return c && [[c[0], c[1]], [c[2], c[3]]]; };
    const pv = (s, t0, t1) => { const a = P(s, t0), b = P(s, t1); const c = clipSeg(a[0], a[1], b[0], b[1], [-146, 146, -71, 66]); return c && [[c[0], c[1]], [c[2], c[3]]]; };
    R.cab = line([[-146, CAB_Z], [146, CAB_Z]], 4);
    const st = clipSeg(...P(42, 0), ...P(240, 0), [-146, 146, -71, 66]);
    R.state = line([[st[0], st[1]], [st[2], st[3]]], 5);
    for (const [key, pts] of Object.entries({ ana1: pu(32, 42, 68), ana2: pu(32, 132, 260), cha: pu(-32, 42, 260), dlv: pu(-64, 42, 260), lag: pu(64, 42, 68), lag2: pu(64, 132, 260),
      c130: pv(130, -150, 150), c190: pv(190, -150, 150), c70: null, c40: pv(40, -140, 90) })) if (pts) R[key] = line(pts, 5);
    R.olivos = line([[-146, -76], [146, -76]], 5);
    R.missionRd = line([[-146, -101], [146, -101]], 5);
    R.fwyW = line([[-146, fwyZ(-146)], [-33, fwyZ(-33)]], 6);
    R.fwyE = line([[0, fwyZ(0)], [146, fwyZ(146)]], 6);
    // parallel parking
    this.side = {
      cabN: ctx.roadsideSpots(R.cab, { side: 'left', spacing: 6.5 }),
      cabS: ctx.roadsideSpots(R.cab, { side: 'right', spacing: 6.5 }),
      stateR: ctx.roadsideSpots(R.state, { side: 'right', spacing: 6.5 }),
      stateL: ctx.roadsideSpots(R.state, { side: 'left', spacing: 6.5 }),
      cha: ctx.roadsideSpots(R.cha, { side: 'right', spacing: 7 }),
      dlv: ctx.roadsideSpots(R.dlv, { side: 'left', spacing: 7 }),
      ana2: ctx.roadsideSpots(R.ana2, { side: 'left', spacing: 7 }),
      c130: ctx.roadsideSpots(R.c130, { side: 'right', spacing: 7 }),
      olivos: ctx.roadsideSpots(R.olivos, { side: 'left', spacing: 7 }),
      mission: ctx.roadsideSpots(R.missionRd, { side: 'right', spacing: 7 }),
    };
  },

  populate(ctx) {
    const { place, randRange, rand, pick, size: S } = ctx;
    const R = this.routes;
    const log = (n, x, z, r, sc = 1, o) => { const ok = place(n, x, z, r, sc, o); if (typeof window !== 'undefined') (window.__sbLog ||= []).push(`${n} ${ok} ${x.toFixed(1)},${z.toFixed(1)}`); return ok; };
    const tryPlace = (name, xs, zs, rot, tries = 20, sc = 1, o) => {
      for (let i = 0; i < tries; i++) if (place(name, xs(), zs(), rot?.(), sc, o)) return true;
      return false;
    };
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 25, o) => {
      let c = 0;
      for (let i = 0; i < n; i++) for (let t = 0; t < tries; t++) if (place(name, randRange(x0, x1), randRange(z0, z1), undefined, randRange(sMin, sMax), o)) { c++; break; }
      return c;
    };
    const B = { overlap: 0.7 };

    // ---- LANDMARKS (first) ----------------------------------------------------
    const cH = P(110, 34), mission = [-30, -124];
    log('missionChurch', mission[0], mission[1], 0);
    log('missionWing', -2, -120, 0);
    log('missionFountain', -30, -107.5, 0);
    log('courthouse', cH[0], cH[1], FACE.sMin);
    const bp = [-15.2, 75.5];
    log('freewayBridge', bp[0], bp[1], -Math.atan(0.02));
    log('chromaticGate', 58, 104.5, 0);
    const cuc = P(146, -41.5);
    log('superCucas', cuc[0], cuc[1], FACE.tMax);
    log('figTree', -40, 84.5, 0);
    log('dolphinFountain', 0, 101, 0);
    log('sundial', -26, -88, 0);

    // ---- big buildings: wharf, harbor -----------------------------------------
    for (const [n, x, z, rot] of [['wharfRestaurant', -6.5, 132, PI / 2], ['seafoodShack', 6.5, 132, -PI / 2], ['wharfShop', -6.6, 141, PI / 2], ['wharfShopB', 6.6, 141, -PI / 2],
      ['wharfShop', 6.6, 124, -PI / 2], ['wharfShopB', -6.6, 123, PI / 2]]) log(n, x, z, rot);
    log('wharfSign', -5.5, 99, 0);
    for (const [n, x, z] of [['sailboat', -90, 128], ['sailboatB', -76, 130], ['sailboat', -62, 128], ['sailboatC', -84, 137], ['sailboatB', -69, 138], ['sailboatC', -55, 131],
      ['sailboat', -100, 138], ['motorBoat', -48, 126], ['sailboatC', -40, 133], ['sailboatB', -112, 128], ['motorBoat', -118, 138], ['dinghy', -75, 122], ['dinghy', -96, 122]]) place(n, x, z, PI / 2 + randRange(-0.2, 0.2), 1, { move: null });

    // ---- downtown blocks ------------------------------------------------------
    const rowBuild = (b, side, pool, opts = {}) => {
      const { maxD = 99, skip = 0.12, inset = 0.4 } = opts;
      b.placed ||= [];
      const alongIsS = side === 'tMin' || side === 'tMax';
      const a0 = (alongIsS ? b.s0 : b.t0) + 0.3, a1 = (alongIsS ? b.s1 : b.t1) - 0.3;
      let cur = a0, guard = 0;
      while (cur < a1 - 5 && guard++ < 6) {
        const cands = pool.filter((n) => DIM[n][1] <= maxD);
        const name = pick(cands.length ? cands : pool);
        const [w, d] = DIM[name];
        if (cur + w > a1 + 0.8) break;
        const along = cur + w / 2;
        let s, t;
        if (side === 'tMin') { s = along; t = b.t0 + d / 2 + inset; }
        else if (side === 'tMax') { s = along; t = b.t1 - d / 2 - inset; }
        else if (side === 'sMin') { t = along; s = b.s0 + d / 2 + inset; }
        else { t = along; s = b.s1 - d / 2 - inset; }
        cur += w + 0.5;
        if (rand() < skip) continue;
        const hs = (alongIsS ? w : d) / 2, ht = (alongIsS ? d : w) / 2;
        if (b.placed.some((r) => Math.abs(r[0] - s) < r[2] + hs - 0.2 && Math.abs(r[1] - t) < r[3] + ht - 0.2)) continue;
        const [x, z] = P(s, t);
        if (place(name, x, z, FACE[side], 1, { overlap: 0.25 })) b.placed.push([s, t, hs, ht]);
      }
    };
    const lotBlock = (b) => b.k === 1 && b.j === 1;
    const pref = (b) => (b.j >= 1 ? 'tMin' : 'tMax'); // side towards State
    // prime commercial blocks first (State frontage)
    const order = [...this.blocks].sort((a, b) => Math.abs(a.j + 0.5) - Math.abs(b.j + 0.5));
    for (const b of order) {
      if (lotBlock(b)) continue;
      const near = Math.abs(b.j + 0.5) <= 0.5, mid = Math.abs(b.j + 0.5) <= 1.5;
      const pool = near ? COMM : mid ? MIXED : RESI;
      const stateSide = b.j === 0 ? 'tMin' : b.j === -1 ? 'tMax' : (b.j > 0 ? 'tMin' : 'tMax');
      const otherSide = stateSide === 'tMin' ? 'tMax' : 'tMin';
      if (near && b.k === 2 && rand() < 0.5) {
        const [x, z] = P((b.s0 + b.s1) / 2, (b.t0 + b.t1) / 2);
        place(pick(['inn', 'hotelTower']), x, z, FACE[stateSide], 1, B);
      }
      rowBuild(b, stateSide, pool, { skip: near ? 0.05 : 0.15 });
      rowBuild(b, otherSide, pool, { maxD: 8, skip: near ? 0.1 : 0.2 });
      rowBuild(b, 'sMin', near ? ['cafeShop', 'shopLowB', 'wineBar'] : ['casita', 'casitaC', 'garage'], { skip: 0.25 });
      rowBuild(b, 'sMax', near ? ['cafeShop', 'shopLowB', 'wineBar'] : ['casita', 'casitaC', 'garage'], { skip: 0.25 });
      // interior infill
      b.placed ||= [];
      for (let i = 0; i < 10; i++) {
        const name = pick(near ? ['cafeShop', 'shopLowB', 'wineBar', 'garage'] : ['casita', 'casitaC', 'garage', 'bungalow']);
        const [w, d] = DIM[name];
        const s = randRange(b.s0 + w / 2, b.s1 - w / 2), t = randRange(b.t0 + d / 2, b.t1 - d / 2);
        if (b.placed.some((r) => Math.abs(r[0] - s) < r[2] + w / 2 - 0.2 && Math.abs(r[1] - t) < r[3] + d / 2 - 0.2)) continue;
        const [x, z] = P(s, t);
        if (place(name, x, z, FACE[pick(['sMin', 'sMax'])], 1, { overlap: 0.25 })) b.placed.push([s, t, w / 2, d / 2]);
      }
      const [cx, cz] = P(randRange(b.s0 + 3, b.s1 - 3), randRange(b.t0 + 3, b.t1 - 3));
      if (!near) place(pick(['oak', 'oakSmall', 'palmMed']), cx, cz, undefined, 1);
    }
    // State-St hotel/inn anchors
    // funk zone: wine bars + warehouses south of the freeway
    const funkNames = ['funkWarehouse', 'funkWarehouseB', 'wineBar', 'wineBarB'];
    for (const x0 of [-146, 12]) {
      let x = x0 + 5;
      const x1 = x0 === -146 ? -60 : 146;
      while (x < x1 - 6) {
        const n = pick(funkNames);
        const w = n.startsWith('funk') ? 10.5 : 8.5;
        if (x0 === -146 && x > -66) break;
        place(n, x + w / 2, 83.4, 0, 1, { overlap: 0.6 });
        x += w + 1.2 + (rand() < 0.35 ? 6 : 0);
      }
    }

    // ---- mission band houses --------------------------------------------------
    const bandHouse = (x, z, face) => place(pick(['casita', 'casitaB', 'casitaC', 'bungalow', 'hacienda']), x, z, face, 1, B);
    for (const x of [-138, -126, -114, -92, -80, -68]) { bandHouse(x, -93, 0); bandHouse(x, -109, PI); }
    for (const x of [-48, -66]) bandHouse(x, -110, PI);
    for (const x of [24, 36, 48, 72, 84, 96, 112, 124, 136]) { bandHouse(x, -93, 0); bandHouse(x, -109, PI); }
    for (const x of [-138, -126, -114, -92, -80, -68, 24, 36, 48, 72, 84, 96, 112, 124, 136]) { bandHouse(x, -124, 0); bandHouse(x, -138, PI); }

    // ---- trees ---------------------------------------------------------------
    // palms along State (both sidewalks), Cabrillo (both sides), other streets
    for (let s = 44; s < 235; s += 11) for (const t of [-8, 8]) {
      const [x, z] = P(s + (t > 0 ? 5 : 0), t);
      place(pick(['palmQueen', 'palmQueenB', 'palmMed']), x, z, undefined, 1);
    }
    for (let x = -146; x < 146; x += 10) {
      place(pick(['palmQueen', 'palmQueenB', 'palmFan']), x + randRange(-1, 1), CAB_Z + 5.5, undefined, 1);
      if (rand() < 0.6) place(pick(['palmMed', 'palmQueen']), x + 5, CAB_Z - 5.5, undefined, 1);
    }
    for (let x = -146; x < 146; x += 14) place('palmQueenB', x, -80.6, undefined, 1);
    scatter('palmMed', 8, [-146, 146, -145, 60], 1, 1, 30);
    scatter('palmFan', 10, [-146, 146, -145, 60], 1, 1, 30);
    scatter('palmSmall', 8, [-146, 146, -145, 60], 1, 1, 30);
    // courthouse lawn + sunken garden
    for (const [s, t] of [[80, 10.5], [80, 57], [120, 10.5], [122, 57], [110, 11], [110, 57], [98.6, 12], [98.6, 47]]) { const [x, z] = P(s, t); place(pick(['oak', 'palmQueen']), x, z, undefined, 1); }
    for (const [s, t] of [[84, 22], [84, 38], [92, 22], [92, 38]]) { const [x, z] = P(s, t); place('topiary', x, z, 0, 1); }
    for (const [s, t] of [[88, 30]]) { const [x, z] = P(s, t); place('sundial', x, z, 0, 1); }
    for (let i = 0; i < 10; i++) { const [x, z] = P(randRange(78, 96), randRange(18, 42)); place(pick(['bench', 'bougM', 'bougP', 'agave']), x, z, undefined, 1); }
    scatter('oak', 12, [-146, 146, -146, -82], 1, 1, 30);
    scatter('oakSmall', 8, [-146, 146, -146, -82], 1, 1, 30);
    scatter('oak', 10, [-146, 146, -70, 62], 1, 1, 30);
    place('oak', -50, -135, 0); place('oak', 10, -134, 0); place('oak', -38, -105, 0);

    // ---- rose garden: many tiny bushes ---------------------------------------
    const roseNames = ['roseRed', 'rosePink', 'roseYellow', 'roseWhite', 'roseCoral'];
    for (const [bx, bz] of this.beds) {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) place(roseNames[(i + j + Math.floor(rand() * 2)) % 5], bx - 1.6 + i * 1.6, bz - 2.4 + j * 1.6, undefined, 1, { overlap: 0.7 });
    }
    for (let i = 0; i < 4; i++) { place('bench', -44 + 0, -92 + i * 0, PI / 2); }
    place('bench', -42.5, -88, PI / 2); place('bench', -9.5, -88, -PI / 2); place('bench', -26, -80.6, PI); place('bench', -34, -95.3, 0); place('bench', -18, -95.3, 0);
    place('arbor', -26, -95.5, 0); place('arbor', -26, -81.3, PI);

    // ---- traffic ---------------------------------------------------------------
    const cars = ['sedanWhite', 'sedanSilver', 'sedanRed', 'sedanBlue', 'sedanBlack', 'sedanTeal', 'suvSilver', 'suvWhite', 'suvGreen', 'suvBlack', 'suvRed', 'pickupWhite', 'pickupBlue', 'convertible', 'woodie', 'vwBus'];
    const drive = (route, n, opts = {}) => {
      for (let i = 0; i < n; i++) ctx.placeOnRoute(pick(cars), route, { count: 1, speed: opts.speed ?? 6, offset: opts.offset ?? 1.6, speedJitter: 0.2 });
    };
    ctx.placeOnRoute('mtdBus', R.state, { count: 2, speed: 4.5, offset: 1.6, speedJitter: 0.1 });
    ctx.placeOnRoute('mtdBus', R.cab, { count: 2, speed: 4.5, offset: 1.4, speedJitter: 0.1 });
    drive(R.state, 6); drive(R.cab, 7, { offset: 1.4 }); drive(R.cha, 4); drive(R.dlv, 3); drive(R.ana2, 3); drive(R.ana1, 1); drive(R.c130, 4); drive(R.c190, 3);
    drive(R.c40, 2); drive(R.olivos, 4); drive(R.missionRd, 4); drive(R.lag2, 2); drive(R.fwyW, 6, { speed: 11, offset: 1.6 }); drive(R.fwyE, 7, { speed: 11, offset: 1.6 });
    ctx.placeOnRoute('semi', R.fwyE, { count: 1, speed: 9, offset: 1.6 });
    ctx.placeOnRoute('semi', R.fwyW, { count: 1, speed: 9, offset: 1.6 });

    // ---- parked cars: lots + curbs ------------------------------------------
    const parkAll = (spots, p) => spots.forEach((s) => rand() < p && ctx.placeParked(pick(cars), s));
    parkAll(this.lots.wharf, 0.8); parkAll(this.lots.down, 0.75); parkAll(this.lots.mission, 0.6); parkAll(this.lots.cucas, 0.7); parkAll(this.lots.east, 0.55);
    for (const k of Object.keys(this.side)) parkAll(this.side[k], k.startsWith('state') || k.startsWith('cab') ? 0.5 : 0.35);

    // ---- Super Cucas patio ---------------------------------------------------
    for (let i = 0; i < 4; i++) {
      const [x, z] = P(146 + (i - 1.5) * 3.3, -41.5 + 9);
      place(['cafeTable', 'cafeTableC', 'cafeTableB', 'cafeTable'][i], x, z, undefined, 1);
    }

    // ---- State St furniture + people ----------------------------------------
    const along = (name, t, s0, s1, step, jit = 1) => {
      for (let s = s0; s < s1; s += step) { const [x, z] = P(s + randRange(-jit, jit), t + randRange(-0.4, 0.4)); place(name, x, z, undefined, 1); }
    };
    for (const t of [-9, 9]) {
      along('streetLamp', t, 46, 235, 20);
      along('cafeTable', t, 44, 235, 15, 3); along('cafeTableB', t, 52, 235, 22, 3); along('cafeChair', t, 45, 235, 12, 4);
      along('bench', t, 50, 235, 17, 3); along('newsBox', t, 45, 235, 18, 4); along('trashCan', t, 48, 235, 17, 4);
      along('bougM', t, 47, 235, 24, 4); along('bikeRack', t, 55, 235, 34, 4); along('pottedPalm', t, 49, 235, 21, 3);
    }
    for (const t of [-32, 32, 64, -64]) { along('streetLamp', t + 5.2, 46, 235, 26); along('hydrant', t - 5.2, 46, 235, 45, 4); along('trashCan', t + 5.2, 50, 235, 60, 3); }
    // Cabrillo furniture
    for (let x = -140; x < 140; x += 16) {
      place('streetLamp', x + randRange(-2, 2), CAB_Z + 7.6, undefined, 1); place('bench', x + 5, CAB_Z + 7.8, PI, 1); place('trashCan', x + 9, CAB_Z + 7.6);
      place(pick(['bike', 'bikeB', 'bikeC']), x + 3, CAB_Z + 10, undefined, 1); place('bougM', x + 8, CAB_Z - 7.5, undefined, 1);
    }
    // wharf detail
    for (const z of [104, 112]) { place('bench', -3.4, z, PI / 2); place('bench', 3.4, z, -PI / 2); }
    scatter('crateStack', 4, [-8, 8, 120, 146], 1, 1, 30); scatter('crabTrap', 4, [-8, 8, 120, 146], 1, 1, 30); scatter('pelican', 6, [-8, 8, 118, 146], 1, 1, 20);
    scatter('seagull', 8, [-8, 8, 100, 146], 1, 1, 20); scatter('tourist', 6, [-3, 3, 100, 118], 1, 1, 20, { move: { type: 'walk', speed: 1.2, range: 3 } });

    // ---- beach ----------------------------------------------------------------
    const beach = [-146, 146, 103.5, 112.5];
    const nearLot = (x, z) => (x > -50 && x < -16 && z > 103) || (x > 84 && x < 116 && z > 103) || Math.abs(x) < 7 || (x > 50 && x < 66 && z > 96);
    const beachScatter = (name, n, o) => {
      let c = 0;
      for (let i = 0; i < n * 3 && c < n; i++) { const x = randRange(-146, 146), z = randRange(beach[2], beach[3]); if (nearLot(x, z)) continue; if (place(name, x, z, undefined, 1, o)) c++; }
    };
    beachScatter('beachUmbrella', 6); beachScatter('beachUmbrellaB', 5); beachScatter('beachUmbrellaC', 5);
    beachScatter('towel', 7); beachScatter('towelB', 6); beachScatter('towelC', 6);
    beachScatter('surfboard', 5); beachScatter('surfboardB', 5); beachScatter('surfboardC', 4);
    beachScatter('beachBall', 8); beachScatter('sandcastle', 4); beachScatter('cooler', 5);
    beachScatter('seagull', 14, { move: { type: 'walk', speed: 2, range: 5 } }); beachScatter('pelican', 3, { move: { type: 'walk', speed: 1.3, range: 4 } });
    beachScatter('beachgoer', 9, { move: { type: 'walk', speed: 1.1, range: 4 } }); beachScatter('beachgoerB', 8, { move: { type: 'walk', speed: 1.1, range: 4 } });
    beachScatter('surfer', 5, { move: { type: 'walk', speed: 1.2, range: 4 } }); beachScatter('kid', 6, { move: { type: 'walk', speed: 1.6, range: 4 } });
    beachScatter('dog', 3, { move: { type: 'walk', speed: 1.8, range: 4 } }); beachScatter('jogger', 3, { move: { type: 'walk', speed: 2.4, range: 5 } });
    for (const x of [82, 96, 110, 125]) place('volleyballNet', x, 109, 0);
    place('lifeguardTower', 72, 107, PI); place('lifeguardTower', -80, 107, PI);
    scatter('palmSmall', 6, [-146, 146, 100.5, 101.5], 1, 1, 20);

    // ---- pedestrians, pets, small starters ------------------------------------
    const START = [-22, 22, -22, 22];
    const people = ['tourist', 'touristB', 'local', 'localB', 'jogger', 'kid'];
    for (const n of ['tourist', 'touristB', 'local', 'localB', 'kid', 'dog', 'seagull']) scatter(n, 3, START, 1, 1, 15);
    scatter('cafeChair', 4, START, 1, 1, 15); scatter('newsBox', 3, START, 1, 1, 15); scatter('trashCan', 3, START, 1, 1, 15);
    scatter('hydrant', 3, START, 1, 1, 15); scatter('mailbox', 2, START, 1, 1, 15); scatter('bike', 2, START, 1, 1, 15); scatter('bougM', 2, START, 1, 1, 15);
    scatter('roseRed', 3, START, 1, 1, 15); scatter('rosePink', 3, START, 1, 1, 15); scatter('agave', 2, START, 1, 1, 15);
    for (let i = 0; i < 6; i++) for (const n of people) scatter(n, 1, [-146, 146, -145, 88], 1, 1, 12);
    scatter('dog', 4, [-146, 146, -145, 88], 1, 1, 12); scatter('dogB', 4, [-146, 146, -145, 88], 1, 1, 12);
    for (const n of ['mailbox', 'hydrant', 'newsBox', 'trashCan', 'bike', 'bikeB', 'bikeC', 'bougM', 'bougP', 'bougO', 'agave', 'pottedPalm', 'phoneBooth', 'busShelter', 'kiosk', 'cafeChair'])
      scatter(n, n === 'kiosk' || n === 'phoneBooth' || n === 'busShelter' ? 3 : 7, [-146, 146, -145, 88], 1, 1, 12);
    scatter('roseRed', 5, [-146, 146, -146, -80], 1, 1, 10); scatter('rosePink', 5, [-146, 146, -146, -80], 1, 1, 10);
    scatter('seagull', 4, [-146, 146, -145, 88], 1, 1, 10);
  },
};
