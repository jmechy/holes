import { buildProtos, MISSION_STAIR } from '../objects/santabarbara.js';

const PI = Math.PI;
const ASPHALT = '#4d4f55', SIDEWALK = '#d9d0bb', PAVER = '#cbb89a', LAWN = '#7fb45a', LAWN2 = '#6ea24f', SAND = '#ecd9a6', STONE = '#e5cfa8';

// ---------------------------------------------------------------------------------------------
// Layout (world x = east, z = south). State Street is the straight N-S axis x = 0: it runs from Los Olivos in the north,
// under the 101 (bridge at z=32), across the railroad (z ~75), across Cabrillo (z=98) and straight out onto Stearns Wharf.
// ---------------------------------------------------------------------------------------------
const CAB = 98, MASON = 46, FWY = 32, HALEY = 16, RAIL_Z = [74.3, 77.5], RAIL_C = 75.9;

/** Street piece: ax 'x' = runs east-west at z=c, 'z' = runs north-south at x=c. Span a0..a1 along the axis. */
const St = (ax, c, a0, a1, o = {}) => ({ ax, c, a0, a1, A: o.A ?? 11, sw: o.sw ?? 2.5, w: o.w ?? 6.4, name: o.name });
const STREETS = [
  St('z', 0, -104, 106, { A: 12, sw: 5.5, name: 'state' }),
  St('x', CAB, -150, 150, { name: 'cab' }), St('x', MASON, -150, 150, { name: 'mason' }), St('x', HALEY, -150, 150, { name: 'haley' }),
  St('x', -24, -150, 0, { name: 'w24' }), St('x', -24, 48, 150, { name: 'e24' }),
  St('x', -64, -150, 150, { name: 'mich' }), St('x', -104, -150, 150, { name: 'olivos' }),
  St('z', -120, -150, HALEY, { name: 'n120' }), St('z', -80, -150, HALEY, { name: 'n80' }), St('z', -40, -64, HALEY, { name: 'n40' }),
  St('z', 48, -150, HALEY, { name: 'p48' }), St('z', 88, -150, HALEY, { name: 'p88' }), St('z', 128, -150, HALEY, { name: 'p128' }),
];
const byName = Object.fromEntries(STREETS.map((s) => [s.name, s]));
const rectOf = (s, inflate = 0) => (s.ax === 'x'
  ? [(s.a0 + s.a1) / 2, s.c, (s.a1 - s.a0) / 2, s.A / 2 + inflate]
  : [s.c, (s.a0 + s.a1) / 2, s.A / 2 + inflate, (s.a1 - s.a0) / 2]); // [cx, cz, halfX, halfZ]
const R = (cx, cz, w, d) => [cx, cz, w / 2, d / 2];

// Rectangles static things may never overlap.
const ROADS = STREETS.map((s) => rectOf(s)); // asphalt (incl. parking lanes)
ROADS.push(R(0, 127.5, 12, 43)); // wharf roadway (straight continuation of State Street)
const HARD = [R(0, FWY, 300, 12), R(0, RAIL_C, 300, 7.2)]; // freeway + railroad (ballast) corridor: nothing at all, not even parked cars
const LOTS = []; // parking lots (only parked cars may sit here)
const BIG = []; // footprints of placed static objects (buildings, trees, ...), used to keep small props out of them

const obb = (x, z, hx, hz, rot = 0) => ({ x, z, hx, hz, c: Math.cos(rot), s: Math.sin(rot) });
const asObb = (r) => obb(r[0], r[1], r[2], r[3], 0);
function obbHit(a, b, m = 0) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const ax = [a.c, -a.s, a.s, a.c, b.c, -b.s, b.s, b.c];
  for (let i = 0; i < 8; i += 2) {
    const X = ax[i], Z = ax[i + 1];
    const ra = a.hx * Math.abs(a.c * X - a.s * Z) + a.hz * Math.abs(a.s * X + a.c * Z);
    const rb = b.hx * Math.abs(b.c * X - b.s * Z) + b.hz * Math.abs(b.s * X + b.c * Z);
    if (Math.abs(dx * X + dz * Z) > ra + rb + m) return false;
  }
  return true;
}
const hitAny = (list, o, m = 0) => { for (let i = 0; i < list.length; i++) if (obbHit(o, list[i], m)) return true; return false; };
const ROAD_OBB = ROADS.map(asObb), HARD_OBB = HARD.map(asObb);
const LOT_OBB = [];

const RG = { x0: -72, x1: -11.5, z0: -96, z1: -72 }; // rose garden block
const RGX = (RG.x0 + RG.x1) / 2, RGZ = (RG.z0 + RG.z1) / 2;
const TREE = /^(palm|oak|fig)/;
const rotFace = (s, side) => (s.ax === 'z' ? (side > 0 ? -PI / 2 : PI / 2) : (side > 0 ? PI : 0)); // prop front faces the street

// ---------------------------------------------------------------------------------------------
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
  lighting: {
    sunColor: '#fff2dc', sunIntensity: 0.74 * Math.PI,
    hemiSkyColor: '#c0e2f8', hemiGroundColor: '#a58e70', hemiIntensity: 0.60 * Math.PI,
    shadowOpacity: 0.76, shadowRadius: 3.0, environmentIntensity: 0.28, exposure: 1.01,
  },
  postProcessing: { aoRadius: 0.48, aoStrength: 0.14 },
  water: { roughness: 0.25, metalness: 0.08, normalStrength: 2.0, waveScale: 0.72, contrast: 0.72, shoreZ: 120, foamStrength: 0.55 },
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
    const Rt = (this.routes = {});
    const cwLines = [];
    LOTS.length = 0; LOT_OBB.length = 0; BIG.length = 0;

    const segRect = (s, inflate = 0) => (s.ax === 'x' ? rect((s.a0 + s.a1) / 2, s.c, s.a1 - s.a0, s.A + 2 * inflate) : rect(s.c, (s.a0 + s.a1) / 2, s.A + 2 * inflate, s.a1 - s.a0));
    // intervals along s occupied by perpendicular streets (for road markings)
    const crossings = (s) => STREETS.filter((t) => t.ax !== s.ax && t.a0 <= s.c + 0.01 && t.a1 >= s.c - 0.01 && s.a0 <= t.c + 0.01 && s.a1 >= t.c - 0.01)
      .map((t) => [t.c - t.A / 2 - 0.6, t.c + t.A / 2 + 0.6]);
    const freeIntervals = (s, from, to) => {
      let iv = [[from, to]];
      for (const [c0, c1] of crossings(s)) iv = iv.flatMap(([a, b]) => (c1 <= a || c0 >= b ? [[a, b]] : [[a, Math.min(b, c0)], [Math.max(a, c1), b]])).filter(([a, b]) => b - a > 0.5);
      return iv;
    };
    const lineRects = (s, off, w, dash) => {
      const out = [];
      for (const [a, b] of freeIntervals(s, Math.max(s.a0, -149), Math.min(s.a1, 149))) {
        if (!dash) out.push(s.ax === 'x' ? rect((a + b) / 2, s.c + off, b - a, w) : rect(s.c + off, (a + b) / 2, w, b - a));
        else for (let t = a + 0.5; t + 2 < b; t += 4.4) out.push(s.ax === 'x' ? rect(t + 1, s.c + off, 2, w) : rect(s.c + off, t + 1, w, 2));
      }
      return out;
    };

    // ---- Ocean, beach ----------------------------------------------------------------
    addDecal(rect(0, 137.5, 300, 35), '#3f9fd8', { style: 'water' });
    // Preserve the placement RNG sequence while animated water now supplies shoreline foam.
    for (let x = -145; x < 145; x += 9) { randRange(3, 6); randRange(2, 4); }
    addDecal(rect(0, 113, 300, 14), SAND, { style: 'sand' });
    addDecal(rect(0, 118.6, 300, 2.6), '#cdb886', { style: 'sand' });

    // ---- Freeway (101), drawn first so State Street shows under the bridge -----------------
    addDecal(rect(0, FWY, 300, 12), '#b5b0a4', { style: 'concrete' });
    addDecal(rect(0, FWY, 300, 9), ASPHALT, { style: 'asphalt' });
    const fw = [rect(0, FWY - 0.2, 300, 0.14), rect(0, FWY + 0.2, 300, 0.14)];
    const fd = [];
    for (let x = -148; x < 148; x += 4.5) fd.push(rect(x, FWY - 2.25, 2, 0.16), rect(x, FWY + 2.25, 2, 0.16));
    addDecal(merge(fw), '#e8c840');
    addDecal(merge(fd), '#f0f0f0');

    // ---- Downtown block ground -----------------------------------------------------------
    const cols = [[-146, -128], [-112, -88], [-72, -48], [-32, -11.5], [11.5, 40], [56, 80], [96, 120]];
    const rows = [[-16, 8], [-56, -32], [-96, -72]];
    this.blocks = [];
    const paved = [], lawns = [];
    cols.forEach(([x0, x1], ci) => rows.forEach(([z0, z1], ri) => {
      if ((ci === 2 || ci === 3) && ri === 2) return; // rose garden
      if (ci === 4 && ri < 2) return; // courthouse superblock
      const core = ci >= 2 && ci <= 5;
      (core ? paved : lawns).push(rect((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0));
      this.blocks.push({ ci, ri, x0, x1, z0, z1, core });
    }));
    addDecal(merge(paved), '#e2d9c3', { style: 'concrete' });
    addDecal(merge(lawns), '#93b96a', { style: 'grass' });
    // courthouse superblock: paving, lawn, sunken garden + paths
    addDecal(rect(25.75, -24, 28.5, 64), SIDEWALK, { style: 'concrete' });
    addDecal(rect(25.75, -24, 26.5, 62), LAWN, { style: 'grass' });
    addDecal(rect(25.75, -2, 22, 18), PAVER, { style: 'concrete' });
    addDecal(rect(25.75, -2, 20, 16), LAWN2, { style: 'grass' });
    addDecal(merge([rect(25.75, -2, 0.9, 16), rect(25.75, -2, 20, 0.9), rect(25.75, -18, 3, 10)]), STONE);
    addDecal(circle(25.75, -2, 3, 24), PAVER);
    // rose garden block: paved edge, lawn, paths, beds
    const rgx = RGX, rgz = RGZ;
    addDecal(rect(rgx, rgz, RG.x1 - RG.x0, RG.z1 - RG.z0), SIDEWALK, { style: 'concrete' });
    addDecal(rect(rgx, rgz, RG.x1 - RG.x0 - 2, RG.z1 - RG.z0 - 2), LAWN, { style: 'grass' });
    addDecal(merge([rect(rgx, rgz, RG.x1 - RG.x0 - 2, 1.6), rect(rgx, rgz, 1.6, RG.z1 - RG.z0 - 2)]), '#e7d9b4');
    addDecal(circle(rgx, rgz, 3.2, 24), '#e7d9b4');
    const bedList = [];
    for (const sx of [-1, 1]) for (const k of [0, 1, 2, 3]) for (const sz of [-1, 1]) bedList.push([rgx + sx * (5.6 + k * 6.0), rgz + sz * 5.6]);
    this.beds = bedList;
    addDecal(merge(bedList.map(([x, z]) => rect(x, z, 4.8, 6.4))), '#6a4a34', { style: 'dirt' });

    // ---- Streets: sidewalks, asphalt, markings, crosswalks ----------------------------------
    addDecal(merge(STREETS.map((s) => segRect(s, s.sw))), SIDEWALK, { style: 'concrete' });
    addDecal(merge(STREETS.map((s) => segRect(s))), ASPHALT, { style: 'asphalt' });
    const yel = [], wht = [];
    for (const s of STREETS) {
      if (s.name === 'state') yel.push(...lineRects(s, -0.15, 0.16, false), ...lineRects(s, 0.15, 0.16, false));
      else yel.push(...lineRects(s, 0, 0.18, true));
      // edge of the parking lane
      for (const sgn of [-1, 1]) wht.push(...lineRects(s, sgn * (s.w / 2 + 0.05), 0.12, false));
    }
    addDecal(merge(wht), '#dcdcd8');
    addDecal(merge(yel), '#e8c840');
    for (const n of STREETS.filter((s) => s.ax === 'z')) for (const e of STREETS.filter((s) => s.ax === 'x')) {
      if (!(n.a0 <= e.c && n.a1 >= e.c && e.a0 <= n.c && e.a1 >= n.c) || Math.abs(n.c) > 140 || e.c > 100) continue;
      for (const sg of [-1, 1]) {
        if ((sg < 0 ? n.a0 < e.c - e.A / 2 - 4 : n.a1 > e.c + e.A / 2 + 4)) for (let i = -5; i <= 5; i++) cwLines.push(rect(n.c + i * 1.05, e.c + sg * (e.A / 2 + 1.2), 0.55, 2.2));
        if ((sg < 0 ? e.a0 < n.c - n.A / 2 - 4 : e.a1 > n.c + n.A / 2 + 4)) for (let i = -4; i <= 4; i++) cwLines.push(rect(n.c + sg * (n.A / 2 + 1.2), e.c + i * 1.05, 2.2, 0.55));
      }
    }
    addDecal(merge(cwLines), '#f0f0f0');

    // ---- Beach: Cabrillo bike path, wharf ------------------------------------------------
    addDecal(rect(0, 107.4, 300, 2.4), '#b8664e', { style: 'asphalt' });
    // Stearns Wharf: a straight continuation of State Street (12 m roadway + 2 x 5.5 m walks, widening to 32 m for the shops)
    addDecal(merge([rect(0, 115, 23, 18), rect(0, 136.5, 32, 25)]), '#a67a48');
    const planks = [];
    for (let z = 106.5; z < 149.5; z += 0.9) planks.push(rect(0, z, z < 124 ? 23 : 32, 0.07));
    addDecal(merge(planks), '#6b4a2a');
    addDecal(rect(0, 127.5, 12, 43), '#c09a64');
    addDecal(merge([rect(-6, 127.5, 0.2, 43), rect(6, 127.5, 0.2, 43), ...Array.from({ length: 9 }, (_, i) => rect(0, 109 + i * 4.6, 0.18, 2))]), '#f0eee6');
    addDecal(circle(-17, 111, 4.4, 24), PAVER, { style: 'concrete' });
    // Harbor breakwater + docks (west)
    addDecal(rect(-72, 147, 70, 4), '#a09a8c');
    const docks = [];
    for (let i = 0; i < 4; i++) docks.push(rect(-92 + i * 14, 133, 1.6, 16));
    docks.push(rect(-70, 125, 60, 1.6));
    addDecal(merge(docks), '#8a6a42');

    // ---- Railroad (over State Street: level crossing), platform, station forecourt -----------
    addDecal(merge([rect(-78.25, RAIL_C, 143.5, 7.2), rect(78.25, RAIL_C, 143.5, 7.2)]), '#9a9184', { style: 'dirt' });
    addDecal(rect(0, RAIL_C, 13, 7.2), '#8a857b', { style: 'concrete' });
    addDecal(rect(-46, 68.4, 68, 7.8), '#cfc8b8', { style: 'concrete' });
    addDecal(rect(-46, 71.75, 68, 0.3), '#e8c840');
    const ties = [];
    for (let x = -148; x < 148; x += 1.3) ties.push(rect(x, RAIL_Z[0], 0.35, 2.7), rect(x, RAIL_Z[1], 0.35, 2.7));
    addDecal(merge(ties), '#5a4a3a');
    addDecal(merge(RAIL_Z.flatMap((z) => [rect(0, z - 0.72, 300, 0.16), rect(0, z + 0.72, 300, 0.16)])), '#3a3a3e');

    // ---- Mission band (north of Los Olivos) ----------------------------------------------
    addDecal(rect(0, -131, 300, 38), '#86ab5c', { style: 'grass' });
    addDecal(rect(-30, -114, 40, 5), STONE, { style: 'concrete' });
    addDecal(rect(-30, -122, 8, 12), STONE, { style: 'concrete' });
    addDecal(rect(-30, -138, 60, 20), LAWN2, { style: 'grass' });
    addDecal(rect(0, -145, 300, 8), '#7a9d52', { style: 'grass' });
    addDecal(rect(-100, -138, 34, 10), '#d8c9a0', { style: 'dirt' });

    // ---- Parking lots ------------------------------------------------------------------
    const lot = (cx, cz, w, d, o) => {
      LOTS.push(R(cx, cz, w, d)); LOT_OBB.push(asObb(R(cx, cz, w + 0.4, d + 0.4)));
      return ctx.parkingLot(cx, cz, w, d, o);
    };
    this.lots = {
      wharfW: lot(-36, 111.5, 30, 10, { stallD: 5, aisle: 4.5 }),
      wharfE: lot(100, 111.5, 30, 10, { stallD: 5, aisle: 4.5 }),
      amtrakW: lot(-90, 59.5, 24, 10, { stallD: 5, aisle: 4.5 }),
      amtrakE: lot(29, 59.5, 34, 10, { stallD: 5, aisle: 4.5 }),
      down: lot(68, -4, 20, 14, { stallD: 5, aisle: 6 }),
      cucas: lot(-60, -38, 20, 10, { stallD: 5, aisle: 4.5 }),
      east: lot(108, -40, 20, 14, { stallD: 5, aisle: 6 }),
    };

    // ---- Routes (traffic): every route runs on a painted road centre line ----------------------
    const line = (pts, w = 6.4) => addRoute(pts, { loop: false, width: w });
    // (State Street is split at the freeway bridge: the bridge's own corridor test would reject a route running under it;
    //  routes end in the middle of Haley / Mason so U-turns happen inside intersections.)
    Rt.state = line([[0, -104], [0, HALEY]], 6.4);
    Rt.stateS = line([[0, MASON], [0, 143]], 6.4);
    Rt.cab = line([[-140, CAB], [140, CAB]]);
    Rt.mason = line([[-140, MASON], [140, MASON]]);
    Rt.haley = line([[-140, HALEY], [140, HALEY]]);
    Rt.w24 = line([[-140, -24], [0, -24]]);
    Rt.e24 = line([[48, -24], [140, -24]]);
    Rt.mich = line([[-140, -64], [140, -64]]);
    Rt.olivos = line([[-140, -104], [140, -104]]);
    Rt.n120 = line([[-120, 16], [-120, -140]]);
    Rt.n80 = line([[-80, 16], [-80, -140]]);
    Rt.n40 = line([[-40, 16], [-40, -64]]);
    Rt.p48 = line([[48, 16], [48, -140]]);
    Rt.p88 = line([[88, 16], [88, -140]]);
    Rt.p128 = line([[128, 16], [128, -140]]);
    Rt.fwyW = line([[-140, FWY], [-24, FWY]], 8);
    Rt.fwyE = line([[24, FWY], [140, FWY]], 8);
    Rt.loopW = addRoute([[0, HALEY], [0, -64], [-40, -64], [-40, HALEY]], { loop: true, width: 6.4 });
    Rt.loopE = addRoute([[88, HALEY], [88, -64], [48, -64], [48, HALEY]], { loop: true, width: 6.4 });
    // parallel parking
    const side = (route, sd, sp = 7) => ctx.roadsideSpots(route, { side: sd, spacing: sp, gap: 0.1 });
    this.side = {
      stateR: side(Rt.state, 'right', 6.5), stateL: side(Rt.state, 'left', 6.5), stateSR: side(Rt.stateS, 'right', 6.5), stateSL: side(Rt.stateS, 'left', 6.5), cabR: side(Rt.cab, 'right', 6.5), cabL: side(Rt.cab, 'left', 6.5),
      masonR: side(Rt.mason, 'right'), haleyR: side(Rt.haley, 'right'), haleyL: side(Rt.haley, 'left'), michR: side(Rt.mich, 'right'), michL: side(Rt.mich, 'left'),
      olivosR: side(Rt.olivos, 'right'), olivosL: side(Rt.olivos, 'left'), n80: side(Rt.n80, 'right'), n120: side(Rt.n120, 'left'), n40: side(Rt.n40, 'right'),
      p48: side(Rt.p48, 'left'), p88: side(Rt.p88, 'right'), w24: side(Rt.w24, 'right'), e24: side(Rt.e24, 'left'),
    };
    if (typeof window !== 'undefined') window.__sbInfo = { roads: ROADS, hard: HARD, lots: LOTS, routes: Object.fromEntries(Object.entries(Rt).map(([k, r]) => [k, { pts: r.points, loop: r.loop, w: r.width }])) };
  },

  populate(ctx) {
    const { randRange, rand, pick, size: S } = ctx;
    const Rt = this.routes;
    const LOG = (typeof window !== 'undefined') ? (window.__sbLog = []) : [];
    const protoOf = (n) => ctx.protos[n];
    const dims = (n) => { const b = protoOf(n).geometry.boundingBox; return [b.max.x - b.min.x, b.max.z - b.min.z]; };

    /**
     * Static-safe placement: rejects footprints overlapping any road / rail / freeway / lot rectangle, or an already placed
     * big static footprint, then defers to ctx.place. flags: { raw } bypasses the road test (landmarks), { rail } allows tracks.
     */
    const put = (name, x, z, rot, scale = 1, opts, flags = {}) => {
      const P = protoOf(name);
      if (!P) return false;
      if (rot === undefined || rot === null) rot = rand() * PI * 2;
      const move = opts && 'move' in opts ? opts.move : P.move;
      const bb = P.geometry.boundingBox;
      let o;
      if (move) o = obb(x, z, 0.3, 0.3, 0);
      else {
        let hx = Math.min((bb.max.x - bb.min.x) / 2, P.radius) * scale, hz = Math.min((bb.max.z - bb.min.z) / 2, P.radius) * scale;
        if (TREE.test(name)) hx = hz = Math.min(hx, 1.0);
        const sh = flags.shrink ?? (P.radius >= 4 ? 0.4 : 0.02);
        o = obb(x, z, Math.max(0.1, hx - sh), Math.max(0.1, hz - sh), rot);
      }
      if (!flags.raw && (hitAny(ROAD_OBB, o, 0.05) || (!flags.lot && hitAny(LOT_OBB, o)))) return false;
      if (!flags.rail && hitAny(HARD_OBB, o, 0.05)) return false;
      if (!flags.parked && !flags.skipBig && hitAny(BIG, o)) return false;
      const ok = ctx.place(name, x, z, rot, scale, opts);
      if (ok && !move && !flags.parked && P.radius * scale >= 2) BIG.push(o);
      return ok;
    };
    const land = (name, x, z, rot, opts, flags = {}) => {
      const ok = put(name, x, z, rot, 1, opts, flags);
      LOG.push(`${name} ${ok} ${x.toFixed(1)},${z.toFixed(1)}`);
      return ok;
    };
    const scatter = (name, n, [x0, x1, z0, z1], tries = 30, opts, filter) => {
      let c = 0;
      for (let i = 0; i < n; i++) for (let t = 0; t < tries; t++) {
        const x = randRange(x0, x1), z = randRange(z0, z1);
        if (filter && !filter(x, z)) continue;
        if (put(name, x, z, undefined, 1, opts)) { c++; break; }
      }
      return c;
    };
    const alongStreet = (s, sd, off, step, names, o = {}) => {
      const { jit = 1.5, offJit = 0.25, prob = 1, opts, faceRot = false, from = s.a0 + 4, to = s.a1 - 4 } = o;
      let c = 0;
      for (let t = from + rand() * step; t < to; t += step) {
        if (rand() > prob) continue;
        const a = t + randRange(-jit, jit), l = s.A / 2 + off + randRange(-offJit, offJit);
        const [x, z] = s.ax === 'z' ? [s.c + sd * l, a] : [a, s.c + sd * l];
        if (put(pick(names), x, z, faceRot ? rotFace(s, sd) : undefined, 1, opts)) c++;
      }
      return c;
    };

    // ---------------------------------------------------------------- LANDMARKS (first)
    const church = protoOf('missionChurch'), wing = protoOf('missionWing');
    const cbb = church.geometry.boundingBox, wbb = wing.geometry.boundingBox;
    const chX = -30, chZ = -116 - cbb.max.z; // stair front at z=-116 (just across the forecourt from Los Olivos)
    const facadeZ = chZ + cbb.max.z - MISSION_STAIR;
    land('missionChurch', chX, chZ, 0);
    // convento wing: on the LEFT of the church as seen from the front (west side), arcade in line with the tower fronts
    const wingHalf = (wbb.max.x - wbb.min.x) / 2, churchHalf = (cbb.max.x - cbb.min.x) / 2;
    land('missionWing', chX - churchHalf - wingHalf + 0.6, facadeZ + 1.2 - wbb.max.z, 0, { overlap: 0.4 });
    land('courthouse', 25.75, -30, 0, { overlap: 0.4 });
    land('freewayBridge', 0, FWY, 0, undefined, { rail: true, raw: true, skipBig: true });
    land('trainStation', -33, 60.25, PI, undefined);
    land('chromaticGate', 58, 112.5, 0);
    land('superCucas', -60, -49.5, PI);
    land('figTree', -124, 61, 0);
    land('dolphinFountain', -17, 111, 0);
    land('sundial', RGX, RGZ, 0);
    // Amtrak train standing at the platform on the north track, freight cars on the south track (trains may sit on rails)
    land('amtrakLoco', -24, RAIL_Z[0], 0, { move: null, overlap: 0.3 }, { rail: true });
    [-40.4, -56.8, -73.2].forEach((x) => land('amtrakCar', x, RAIL_Z[0], 0, { move: null, overlap: 0.3 }, { rail: true }));
    [26, 39.5, 53].forEach((x, i) => land(i % 2 ? 'freightCarB' : 'freightCarA', x, RAIL_Z[1], 0, { move: null, overlap: 0.3 }, { rail: true }));
    for (const x of [-8.2, 8.2]) for (const z of [70.3, 81.3]) land('crossingSignal', x, z, 0);
    // platform shelters along the tracks
    [-66, -20].forEach((x) => land('platformShelter', x, 68.4, 0, { overlap: 0.35 }));

    // ---------------------------------------------------------------- wharf, harbor
    for (const [n, x, z, rot] of [['wharfShopB', -11, 127, PI / 2], ['wharfShop', 11, 127, -PI / 2], ['wharfRestaurant', -11, 136, PI / 2], ['seafoodShack', 11, 135, -PI / 2],
      ['wharfShop', -11, 145, PI / 2], ['wharfShopB', 11, 143.5, -PI / 2]]) land(n, x, z, rot);
    land('wharfSign', -9.5, 108.5, 0);
    for (const [n, x, z] of [['sailboat', -90, 128], ['sailboatB', -76, 130], ['sailboat', -62, 128], ['sailboatC', -84, 138], ['sailboatB', -69, 138], ['sailboatC', -55, 131],
      ['sailboat', -100, 138], ['motorBoat', -48, 129], ['sailboatC', -40, 136], ['sailboatB', -112, 130], ['motorBoat', -118, 140], ['dinghy', -75, 124], ['dinghy', -96, 124]]) put(n, x, z, PI / 2 + randRange(-0.2, 0.2), 1, { move: null });

    // ---------------------------------------------------------------- downtown blocks
    const POOL = {
      comm: ['shopArcade', 'shopArcadeB', 'shopTiled', 'shopTiledB', 'shopLow', 'shopLowB', 'cafeShop', 'paseoRow', 'bankArcade', 'towerHouse', 'inn', 'hotelTower', 'courtyardA', 'courtyardB', 'courtyardC', 'shopTiled', 'shopLow'],
      mixed: ['shopTiled', 'shopLow', 'aptSpanish', 'aptSpanishB', 'officeBlock', 'hacienda', 'cafeShop', 'shopTiledB', 'towerHouse', 'courtyardC', 'casita'],
      resi: ['casita', 'casitaB', 'casitaC', 'bungalow', 'hacienda', 'aptSpanish', 'aptSpanishB', 'casita', 'bungalow'],
      infill: ['casita', 'casitaC', 'garage', 'cafeShop', 'casitaB'],
    };
    const face = { N: PI, S: 0, W: -PI / 2, E: PI / 2 };
    /** Line buildings up along one block edge (front to the street); dims from proto bboxes; all safety via put(). */
    const edgeRow = (b, edge, pool, o = {}) => {
      const { maxD = 12, skip = 0.1, inset = 0.5, a0, a1 } = o;
      const horiz = edge === 'N' || edge === 'S';
      let cur = (a0 ?? (horiz ? b.x0 : b.z0)) + 0.2;
      const end = a1 ?? (horiz ? b.x1 : b.z1);
      let guard = 0;
      while (cur < end - 4 && guard++ < 12) {
        const cands = pool.filter((n) => dims(n)[1] <= maxD && dims(n)[0] <= end - cur + 0.5);
        if (!cands.length) break;
        const name = pick(cands), [w, d] = dims(name);
        const along = cur + w / 2;
        cur += w + 0.3;
        if (rand() < skip) continue;
        let x, z;
        if (edge === 'N') { x = along; z = b.z0 + d / 2 + inset; } else if (edge === 'S') { x = along; z = b.z1 - d / 2 - inset; }
        else if (edge === 'W') { z = along; x = b.x0 + d / 2 + inset; } else { z = along; x = b.x1 - d / 2 - inset; }
        put(name, x, z, face[edge], 1, { overlap: 0.2 }, { shrink: 0.5 });
      }
    };
    const pools = (b) => {
      const nearState = b.ci === 3 || b.ci === 4;
      if (b.ri === 0) return nearState ? POOL.comm : b.core ? POOL.mixed : POOL.resi;
      if (b.ri === 1) return nearState || b.ci === 5 ? POOL.comm : b.core ? POOL.mixed : POOL.resi;
      return b.core ? POOL.mixed : POOL.resi;
    };
    const order = [...this.blocks].sort((a, b) => Math.abs(a.x0 + a.x1 - 20) + Math.abs(a.z0 + a.z1 + 20) - (Math.abs(b.x0 + b.x1 - 20) + Math.abs(b.z0 + b.z1 + 20)));
    for (const b of order) {
      const pool = pools(b);
      if (b.ci === 5 && b.ri === 0) { edgeRow(b, 'N', pool, { maxD: 6 }); continue; } // block with the downtown lot
      if (b.ci === 2 && b.ri === 1) { edgeRow(b, 'S', pool, { maxD: 11 }); continue; } // Super Cucas block: north row is the restaurant
      if (b.ci === 6 && b.ri === 1) { edgeRow(b, 'N', pool, { maxD: 9 }); continue; }
      edgeRow(b, 'N', pool, { maxD: 12 });
      edgeRow(b, 'S', pool, { maxD: 12 });
      edgeRow(b, 'W', POOL.infill.concat(pool.slice(0, 4)), { maxD: (b.x1 - b.x0) / 2 - 0.5, a0: b.z0 + 8, a1: b.z1 - 8, skip: 0.2 });
      edgeRow(b, 'E', POOL.infill.concat(pool.slice(0, 4)), { maxD: (b.x1 - b.x0) / 2 - 0.5, a0: b.z0 + 8, a1: b.z1 - 8, skip: 0.2 });
      // shade + interior trees
      for (let i = 0; i < 6; i++) put(pick(['oak', 'oakSmall', 'palmMed', 'palmFan']), randRange(b.x0 + 2, b.x1 - 2), randRange(b.z0 + 2, b.z1 - 2), undefined, 1);
    }
    // Funk Zone: warehouses + wine bars between Cabrillo and the railroad
    const funk = ['funkWarehouse', 'funkWarehouseB', 'wineBar', 'wineBarB'];
    for (const [x0, x1] of [[-146, -14], [14, 146]]) {
      let x = x0 + 2;
      while (x < x1 - 8) {
        const n = pick(funk), [w, d] = dims(n);
        put(n, x + w / 2, 89 - d / 2 - 0.4, 0, 1, { overlap: 0.3 }, { shrink: 0.5 });
        x += w + 0.4 + (rand() < 0.3 ? 5 : 0);
      }
    }

    // ---------------------------------------------------------------- mission band
    const ho = ['casita', 'casitaB', 'casitaC', 'bungalow', 'hacienda'];
    const houseRow = (x0, x1, z, rot) => {
      let x = x0;
      while (x < x1 - 6) { const n = pick(ho), [w, d] = dims(n); put(n, x + w / 2, z - (rot === 0 ? d / 2 : -d / 2), rot, 1, { overlap: 0.2 }, { shrink: 0.5 }); x += w + 1.5; }
    };
    for (const [x0, x1] of [[-146, -128], [-112, -90], [-14, 40], [56, 80], [96, 120], [136, 146]]) houseRow(x0, x1, -112.6 - 0.4, 0);
    scatter('oak', 14, [-146, 146, -148, -118], 30); scatter('oakSmall', 8, [-146, 146, -148, -118], 30);
    scatter('palmMed', 6, [-146, 146, -148, -118], 30); scatter('palmFan', 6, [-146, 146, -148, -118], 30);
    // mission forecourt: palms + oaks flanking the stair, benches
    for (const [x, z] of [[-48, -118], [-12, -118]]) put(pick(['palmQueen', 'palmQueenB']), x, z, undefined, 1);
    for (const x of [-44, -16]) put('bench', x, -114, 0);
    put('oak', -14, -136, 0); put('oak', -6, -128, 0);

    // ---------------------------------------------------------------- rose garden: many tiny bushes
    const roseNames = ['roseRed', 'rosePink', 'roseYellow', 'roseWhite', 'roseCoral'];
    for (const [bx, bz] of this.beds) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      put(roseNames[(i + j + Math.floor(rand() * 2)) % 5], bx - 1.6 + i * 1.6, bz - 1.6 + j * 1.6, undefined, 1, { overlap: 0.7 });
    const rgx = RGX, rgz = RGZ;
    for (const [x, z, r] of [[rgx - 28, rgz - 3, PI / 2], [rgx + 28, rgz + 3, -PI / 2], [rgx - 10, rgz - 10.3, 0], [rgx + 10, rgz + 10.3, PI], [rgx + 12, rgz - 10.3, 0], [rgx - 12, rgz + 10.3, PI]]) put('bench', x, z, r, 1, { overlap: 0.7 });
    put('arbor', rgx, rgz + 10.6, PI); put('arbor', rgx, rgz - 10.6, 0);
    // courthouse gardens
    for (const [x, z] of [[13.5, -50], [38, -50], [13.5, 6], [38, 6], [13.5, -27], [38, -27], [25.75, -50], [13.5, -13], [38, -13]]) put(pick(['oak', 'palmQueen', 'oak']), x, z, undefined, 1);
    for (const [x, z] of [[19, 3], [32.5, 3], [19, -7], [32.5, -7]]) put('topiary', x, z, 0, 1);
    put('sundial', 25.75, -2, 0, 1);
    for (let i = 0; i < 12; i++) put(pick(['bench', 'bougM', 'bougP', 'agave']), randRange(16, 35), randRange(-10, 4), undefined, 1);

    // ---------------------------------------------------------------- street trees + furniture
    const st = byName.state;
    for (const sd of [-1, 1]) {
      alongStreet(st, sd, 2.75, 12, ['palmQueen', 'palmQueenB', 'palmMed'], { from: -98, to: 24, jit: 1, offJit: 0.2 });
      alongStreet(st, sd, 2.75, 12, ['palmQueen', 'palmQueenB', 'palmMed'], { from: 50, to: 90, jit: 1, offJit: 0.2 });
      alongStreet(st, sd, 1.3, 30, ['streetLamp'], { from: -98, to: 90, jit: 2 });
      alongStreet(st, sd, 4.6, 14, ['cafeTable', 'cafeTableB', 'cafeTableC'], { from: -98, to: 24, jit: 3 });
      alongStreet(st, sd, 4.9, 11, ['cafeChair'], { from: -98, to: 24, jit: 3 });
      alongStreet(st, sd, 1.0, 17, ['bench'], { from: -98, to: 24, jit: 3, faceRot: true });
      alongStreet(st, sd, 1.0, 30, ['newsBox', 'trashCan', 'hydrant'], { from: -98, to: 90, jit: 4 });
      alongStreet(st, sd, 4.3, 22, ['bougM', 'bougP', 'pottedPalm', 'agave'], { from: -98, to: 24, jit: 4 });
      alongStreet(st, sd, 3.4, 30, ['bikeRack', 'bike', 'bikeB'], { from: -98, to: 24, jit: 4 });
    }
    for (const s of STREETS) {
      if (s.name === 'state') continue;
      for (const sd of [-1, 1]) {
        const lo = Math.max(s.a0 + 4, -146), hi = Math.min(s.a1 - 4, 146);
        alongStreet(s, sd, 1.25, 11, ['palmQueen', 'palmQueenB', 'palmMed', 'palmFan'], { from: lo, to: hi, jit: 1, offJit: 0.1, prob: s.ax === 'x' && s.c < 0 || s.name === 'cab' ? 0.9 : 0.55 });
        alongStreet(s, sd, 1.25, 40, ['streetLamp'], { from: lo, to: hi, jit: 2, offJit: 0.1, prob: 0.7 });
        alongStreet(s, sd, 1.25, 50, ['hydrant', 'trashCan', 'mailbox', 'newsBox', 'bougM'], { from: lo, to: hi, jit: 6, offJit: 0.1, prob: 0.7 });
      }
    }
    // Cabrillo sea side + beach path
    for (let x = -146; x < 146; x += 16) {
      put('bench', x + 5, 104.6, PI); put('trashCan', x + 9, 104.6); put(pick(['bike', 'bikeB', 'bikeC']), x + 3, 107.2, undefined, 1);
    }
    scatter('palmSmall', 8, [-146, 146, 105, 106.5], 20);
    // level-crossing surrounds + station forecourt palms
    for (const [x, z] of [[-14, 55.5], [-52, 55.5], [-64, 56], [-24, 55.6], [-8.4, 58]]) put(pick(['palmQueen', 'palmQueenB']), x, z, undefined, 1);
    for (const x of [-100, -84, -60, -46, -70]) put(pick(['palmMed', 'palmQueen']), x, 66.5, undefined, 1);
    for (const x of [20, 36, 44]) put('palmMed', x, 53.4, undefined, 1);
    scatter('agave', 6, [-146, 146, 80.5, 81.2], 10); scatter('bougM', 8, [-146, 146, 79.6, 89.5], 20);
    for (let x = -140; x < 140; x += 22) { put('oak', x + randRange(-3, 3), 27, undefined, 1); put('bougP', x + 8, 25.4, undefined, 1); }
    // wharf detail
    for (const z of [110, 116, 121]) { put('bench', -8.4, z, PI / 2); put('bench', 8.4, z, -PI / 2); }
    for (const z of [112, 119]) { put('streetLamp', -10.4, z); put('streetLamp', 10.4, z); }
    scatter('crateStack', 4, [-13, -7, 124, 148], 30); scatter('crabTrap', 4, [7, 13, 124, 148], 30); scatter('pelican', 6, [-13, 13, 118, 148], 20, { move: { type: 'walk', speed: 1.2, range: 2.5 } }, (x) => Math.abs(x) > 8.5);
    scatter('seagull', 8, [-13, 13, 106, 148], 20, { move: { type: 'walk', speed: 1.6, range: 2.5 } }, (x) => Math.abs(x) > 8.5);

    // ---------------------------------------------------------------- beach
    const beachOk = (x, z) => !(x > -16 && x < 16 && z > 100) && !(x > 50 && x < 66 && z > 106);
    const beachScatter = (name, n, o) => scatter(name, n, [-146, 146, 108.5, 117.5], 30, o, beachOk);
    for (const [n, k] of [['beachUmbrella', 6], ['beachUmbrellaB', 5], ['beachUmbrellaC', 5], ['towel', 7], ['towelB', 6], ['towelC', 6], ['surfboard', 5], ['surfboardB', 5], ['surfboardC', 4], ['beachBall', 8], ['sandcastle', 4], ['cooler', 5]]) beachScatter(n, k);
    const bw = (speed, range) => ({ move: { type: 'walk', speed, range } });
    beachScatter('seagull', 14, bw(2, 4)); beachScatter('pelican', 3, bw(1.3, 3)); beachScatter('beachgoer', 9, bw(1.1, 3)); beachScatter('beachgoerB', 8, bw(1.1, 3));
    beachScatter('surfer', 5, bw(1.2, 3)); beachScatter('kid', 6, bw(1.6, 3)); beachScatter('dog', 3, bw(1.8, 3)); beachScatter('jogger', 3, bw(2.4, 3));
    for (const x of [82, 96, 110, 125]) put('volleyballNet', x, 113, 0);
    put('lifeguardTower', 72, 114, PI); put('lifeguardTower', -80, 114, PI);

    // ---------------------------------------------------------------- traffic (routes lie on painted roads)
    const cars = ['sedanWhite', 'sedanSilver', 'sedanRed', 'sedanBlue', 'sedanBlack', 'sedanTeal', 'suvSilver', 'suvWhite', 'suvGreen', 'suvBlack', 'suvRed', 'pickupWhite', 'pickupBlue', 'convertible', 'woodie', 'vwBus'];
    const drive = (route, n, o = {}) => { for (let i = 0; i < n; i++) ctx.placeOnRoute(pick(cars), route, { count: 1, speed: o.speed ?? 6, offset: o.offset ?? 1.6, speedJitter: 0.2 }); };
    ctx.placeOnRoute('mtdBus', Rt.state, { count: 1, speed: 4.5, offset: 1.6, speedJitter: 0.1 });
    ctx.placeOnRoute('mtdBus', Rt.stateS, { count: 1, speed: 4.5, offset: 1.6, speedJitter: 0.1 });
    ctx.placeOnRoute('mtdBus', Rt.cab, { count: 2, speed: 4.5, offset: 1.6, speedJitter: 0.1 });
    ctx.placeOnRoute('mtdBus', Rt.loopW, { count: 1, speed: 4, offset: 1.6 });
    drive(Rt.state, 5); drive(Rt.stateS, 4); drive(Rt.cab, 7); drive(Rt.mason, 3); drive(Rt.haley, 4); drive(Rt.mich, 3); drive(Rt.olivos, 4); drive(Rt.w24, 2); drive(Rt.e24, 2);
    drive(Rt.n120, 2); drive(Rt.n80, 3); drive(Rt.n40, 2); drive(Rt.p48, 3); drive(Rt.p88, 3); drive(Rt.p128, 2);
    drive(Rt.loopW, 4, { speed: 5 }); drive(Rt.loopE, 4, { speed: 5 });
    drive(Rt.fwyW, 7, { speed: 11, offset: 1.5 }); drive(Rt.fwyE, 7, { speed: 11, offset: 1.5 });

    // ---------------------------------------------------------------- parked cars: lots + curb parking lanes only
    const spotOk = (s) => !hitAny(HARD_OBB, obb(s.x, s.z, 2.4, 1.2, s.rotY), 0.6);
    const parkAll = (spots, p) => spots.forEach((s) => rand() < p && spotOk(s) && ctx.placeParked(pick(cars), s));
    for (const k of Object.keys(this.lots)) parkAll(this.lots[k], k.startsWith('wharf') ? 0.6 : 0.5);
    for (const k of Object.keys(this.side)) parkAll(this.side[k], k.startsWith('state') || k.startsWith('cab') ? 0.32 : 0.18);

    // ---------------------------------------------------------------- pedestrians, pets, small starters
    const walk = (speed, range = 2.2) => ({ move: { type: 'walk', speed, range } });
    const people = ['tourist', 'touristB', 'local', 'localB', 'jogger', 'kid'];
    // State Street walks (5.5 wide): tiny starter items around the spawn + walkers that stay on the sidewalk
    const stateWalk = (name, z0, z1, n, o) => { let c = 0; for (let i = 0; i < n * 6 && c < n; i++) { const sd = rand() < 0.5 ? -1 : 1; if (put(name, sd * (8.75 + randRange(-0.35, 0.35)), randRange(z0, z1), undefined, 1, o)) c++; } return c; };
    for (const n of ['tourist', 'touristB', 'local', 'localB', 'kid']) stateWalk(n, -24, 24, 3, walk(1.2));
    stateWalk('dog', -24, 24, 2, walk(1.6)); stateWalk('seagull', -24, 24, 3, walk(1.6));
    for (const [n, k] of [['cafeChair', 4], ['newsBox', 3], ['trashCan', 3], ['hydrant', 3], ['mailbox', 2], ['bike', 2], ['bougM', 3], ['agave', 3], ['roseRed', 3], ['rosePink', 3], ['roseWhite', 3], ['pottedPalm', 2], ['topiary', 2], ['bikeRack', 2]]) stateWalk(n, -24, 24, k);
    for (const n of people) for (let i = 0; i < 2; i++) stateWalk(n, -100, 24, 1, walk(1.3));
    const walkAreas = [[-31, -12, -95, -73], [-70, -50, -95, -73], [13, 38, -55, 7], [-146, 146, 108.5, 117.5]];
    for (const [x0, x1, z0, z1] of walkAreas.slice(0, 3)) for (const n of people) scatter(n, 1, [x0 + 2, x1 - 2, z0 + 2, z1 - 2], 20, walk(1.3, 3));
    const sideWalker = (name, tries = 20) => {
      for (let i = 0; i < tries; i++) {
        const s = pick(STREETS.filter((q) => q.name !== 'state' && q.name !== 'cab')), sd = rand() < 0.5 ? -1 : 1;
        const a = randRange(Math.max(s.a0, -140) + 6, Math.min(s.a1, 140) - 6), l = s.A / 2 + s.sw / 2;
        const [x, z] = s.ax === 'z' ? [s.c + sd * l, a] : [a, s.c + sd * l];
        if (put(name, x, z, undefined, 1, walk(1.2, s.sw / 2 - 0.35))) return true;
      }
      return false;
    };
    for (let i = 0; i < 3; i++) for (const n of people) sideWalker(n);
    for (let i = 0; i < 2; i++) { sideWalker('dog'); sideWalker('dogB'); }
    for (let i = 0; i < 6; i++) stateWalk(pick(['dog', 'dogB']), -100, 24, 1, walk(1.6));
    for (const n of people) scatter(n, 1, [-15, 15, 106, 148], 20, walk(1.2, 2.2), (x) => Math.abs(x) > 8.5 && Math.abs(x) < 12);
    for (const n of ['mailbox', 'hydrant', 'newsBox', 'trashCan', 'bike', 'bikeB', 'bikeC', 'bougM', 'bougP', 'bougO', 'agave', 'pottedPalm', 'phoneBooth', 'busShelter', 'kiosk', 'cafeChair'])
      scatter(n, n === 'kiosk' || n === 'phoneBooth' || n === 'busShelter' ? 2 : 3, [-146, 146, -145, 88], 12);
    scatter('roseRed', 5, [-146, 146, -146, -112], 10); scatter('rosePink', 5, [-146, 146, -146, -112], 10);
    scatter('seagull', 4, [13, 38, -55, 7], 10, walk(1.6, 2.5));
    // Super Cucas patio
    for (let i = 0; i < 3; i++) put(['cafeTable', 'cafeTableC', 'cafeTableB'][i], -60 + (i - 1) * 3.6, -57.6, undefined, 1);
  },
};
