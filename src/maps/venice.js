import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildProtos, HOUSE_NAMES, makeFootbridge } from '../objects/venice.js';
import { applyHoleDiscard } from '../game/Scenery.js';

const PI = Math.PI;
const WATER = '#49bdbb';
const LAGOON = '#4fb5bd';
const LAND = '#d5c7aa';
const QUAY = '#e9ddc2';
const LIP = '#a89878';
const PLAZA = '#efe3c8';
const SIZE = 120;

// ---- plan ---------------------------------------------------------------------------------------
// Island city (z grows southward). The Grand Canal winds through it as a reverse S, entering at the
// north-west and leaving into the lagoon at the east; narrow rii branch off it between the blocks.
const ISLAND = [[-98, -56], [-92, -76], [-70, -90], [-40, -94], [-8, -92], [24, -95], [56, -92], [84, -84], [98, -66], [101, -40], [99, -12],
  [100, 16], [101, 50], [96, 72], [82, 88], [58, 96], [30, 98], [0, 96], [-30, 98], [-60, 94], [-84, 84], [-98, 66], [-102, 40], [-100, 10], [-98, -20]]
  .map(([x, z]) => [x * 0.95, z * 0.95]);
const CANALS = [
  { name: 'grand', w: 12, fond: true, pts: [[-122, -52], [-92, -44], [-68, -30], [-52, -10], [-42, 12], [-26, 30], [-4, 38], [14, 34], [30, 18], [36, -2], [48, -14], [66, -10], [82, 6], [98, 26], [122, 40]] },
  { name: 'r1', w: 6, from: ['grand', -68, -30], pts: [[-64, -52], [-54, -70], [-52, -98], [-52, -122]] },
  { name: 'r2', w: 7, fond: true, from: ['grand', 36, -2], pts: [[22, -20], [24, -44], [40, -62], [44, -90], [44, -122]] },
  { name: 'r3', w: 6, from: ['grand', 66, -10], pts: [[64, -34], [78, -50], [100, -54], [122, -54]] },
  { name: 'r4', w: 5, from: ['r1', -64, -52], pts: [[-84, -60], [-102, -62], [-122, -64]] },
  { name: 'r5', w: 5, from: ['r1', -58, -62], pts: [[-30, -56], [-6, -64], [16, -50], [24, -44]] },
  { name: 'r6', w: 6, fond: true, from: ['grand', -26, 30], pts: [[-32, 50], [-22, 68], [-34, 86], [-32, 122]] },
  { name: 'r7', w: 6, from: ['grand', 14, 34], pts: [[12, 56], [20, 74], [18, 122]] },
  { name: 'r8', w: 6, from: ['grand', -50, -10], pts: [[-76, -2], [-98, 8], [-122, 10]] },
  { name: 'r9', w: 5, from: ['r6', -32, 50], pts: [[-58, 56], [-82, 50], [-104, 56], [-122, 54]] },
];
// Open squares (cx, cz, w, d). Buildings front onto them.
const PLAZAS = [
  { name: 'spawn', x: 0, z: -2, w: 30, d: 22, well: [8, -5], stalls: 1 },
  { name: 'stefano', x: -38, z: -28, w: 16, d: 14, stalls: 1 },
  { name: 'north', x: -12, z: -78, w: 20, d: 14, well: [0, 0] },
  { name: 'ne', x: 62, z: -72, w: 20, d: 16, well: [0, 0], stalls: 1 },
  { name: 'nw', x: -82, z: -36, w: 16, d: 14, well: [0, 0] },
  { name: 'west', x: -72, z: 30, w: 18, d: 16, well: [0, 0], stalls: 1 },
  { name: 'south', x: -2, z: 72, w: 20, d: 14, well: [0, 0], stalls: 1 },
  { name: 'rialtoMarket', x: 12, z: 8, w: 10, d: 12, stalls: 2 },
  { name: 'eastcampo', x: 66, z: 30, w: 16, d: 12, well: [0, 0] },
  { name: 'piazza', x: 50, z: 60, w: 44, d: 20, piazza: true },
  { name: 'piazzetta', x: 67, z: 80, w: 16, d: 22, piazza: true },
];
// Bridges: [canal, approx x, approx z, kind]
const BRIDGES = [
  ['grand', 33, 8, 'rialto'], ['grand', -58, -20, 'foot'], ['grand', -36, 22, 'foot'], ['grand', 90, 18, 'foot'], ['grand', 58, -12, 'foot'],
  ['r1', -60, -42, 'foot'], ['r1', -53, -84, 'foot'], ['r2', 24, -34, 'foot'], ['r2', 36, -58, 'foot'], ['r2', 44, -80, 'foot'],
  ['r3', 70, -42, 'foot'], ['r3', 90, -53, 'foot'], ['r4', -92, -61, 'foot'], ['r5', -40, -58, 'foot'], ['r5', 6, -58, 'foot'],
  ['r6', -30, 44, 'foot'], ['r6', -26, 76, 'foot'], ['r7', 14, 46, 'foot'], ['r7', 19, 90, 'foot'], ['r8', -64, -6, 'foot'], ['r8', -90, 4, 'foot'],
  ['r9', -46, 54, 'foot'], ['r9', -92, 52, 'foot'],
];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function catmull(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(a => 0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)));
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
const chaikin = (poly, times) => {
  let p = poly;
  for (let t = 0; t < times; t++) {
    const q = [];
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    p = q;
  }
  return p;
};
const segDist = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / Math.max(dx * dx + dz * dz, 1e-9)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
};
const insidePoly = (poly, x, z) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
};
// ---- flat geometry (world coords, y=0, +Y normal) ---------------------------------------------------
const flatTris = (tris) => {
  const pos = [];
  for (const [a, b, c] of tris) {
    const cross = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
    const t = cross >= 0 ? [a, b, c] : [a, c, b];
    for (const v of t) pos.push(v[0], 0, v[1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
};
const polyGeo = (poly) => {
  const v = poly.map(p => new THREE.Vector2(p[0], p[1]));
  return flatTris(THREE.ShapeUtils.triangulateShape(v, []).map(t => t.map(i => poly[i])));
};
function ribbonGeo(pts, hws, closed = false) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i + n - 1) % n : Math.max(i - 1, 0)], b = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len, hw = hws[i];
    L.push([pts[i][0] + nx * hw, pts[i][1] + nz * hw]); R.push([pts[i][0] - nx * hw, pts[i][1] - nz * hw]);
  }
  const tris = [], m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) { const j = (i + 1) % n; tris.push([L[i], L[j], R[i]], [R[i], L[j], R[j]]); }
  return flatTris(tris);
}
const mergeGeos = (gs) => mergeGeometries(gs.map(g => { const q = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(q.attributes)) if (k !== 'position') q.deleteAttribute(k); return q; }), false);
const rectGeo = (x, z, w, d, rotY = 0) => new THREE.PlaneGeometry(w, d).rotateX(-PI / 2).rotateY(rotY).translate(x, 0, z);

// ---- world state built in decorate(), read by populate() ---------------------------------------------
const W = {};
function buildWorld() {
  const island = chaikin(ISLAND, 3);
  const canals = [];
  for (const c of CANALS) {
    let pts = c.pts;
    if (c.from) {
      const parent = canals.find(k => k.name === c.from[0]);
      let best = Infinity, bp = null;
      for (const p of parent.dense) { const d = Math.hypot(p[0] - c.from[1], p[1] - c.from[2]); if (d < best) { best = d; bp = p; } }
      pts = [bp, ...pts];
    }
    const dense = catmull(pts);
    const hws = dense.map(p => c.w / 2 + (c.name === 'grand' ? 5 * smooth(84, 112, p[0]) : 0));
    const cum = [0];
    for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    canals.push({ ...c, dense, hws, cum, len: cum[cum.length - 1] });
  }
  W.island = island; W.canals = canals;
  // Signed "distance to water" fields on a 1.5-unit grid (positive on dry land).
  const STEP = 1.5, N0 = -124, NN = Math.ceil(248 / STEP) + 1;
  const mk = (list, withShore) => {
    const g = new Float32Array(NN * NN);
    for (let iz = 0; iz < NN; iz++) for (let ix = 0; ix < NN; ix++) {
      const x = N0 + ix * STEP, z = N0 + iz * STEP;
      let d = Infinity;
      for (const c of list) {
        const p = c.dense;
        for (let i = 1; i < p.length; i++) {
          const ax = p[i - 1][0], az = p[i - 1][1];
          if (Math.abs(x - ax) > 40 || Math.abs(z - az) > 40) continue;
          d = Math.min(d, segDist(x, z, p[i - 1], p[i]) - (c.hws[i] + c.hws[i - 1]) / 2);
        }
      }
      if (withShore) {
        let e = Infinity;
        for (let i = 0; i < island.length; i++) e = Math.min(e, segDist(x, z, island[i], island[(i + 1) % island.length]));
        d = Math.min(d, insidePoly(island, x, z) ? e : -e);
      }
      g[iz * NN + ix] = d;
    }
    return (x, z) => {
      const fx = (x - N0) / STEP, fz = (z - N0) / STEP;
      const ix = Math.max(0, Math.min(NN - 2, Math.floor(fx))), iz = Math.max(0, Math.min(NN - 2, Math.floor(fz)));
      const tx = Math.min(1, Math.max(0, fx - ix)), tz = Math.min(1, Math.max(0, fz - iz));
      const a = g[iz * NN + ix], b = g[iz * NN + ix + 1], c = g[(iz + 1) * NN + ix], d = g[(iz + 1) * NN + ix + 1];
      return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
    };
  };
  W.wd = mk(canals, true);
  W.fd = mk(canals.filter(c => c.fond), false);
  // Bridges snapped to their canal.
  W.bridges = BRIDGES.map(([name, bx, bz, kind]) => {
    const c = canals.find(k => k.name === name);
    let bi = 1, best = Infinity;
    for (let i = 1; i < c.dense.length - 1; i++) { const d = Math.hypot(c.dense[i][0] - bx, c.dense[i][1] - bz); if (d < best) { best = d; bi = i; } }
    const a = c.dense[bi - 1], b = c.dense[bi + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len;
    return { canal: name, kind, x: c.dense[bi][0], z: c.dense[bi][1], nx: -tz, nz: tx, hw: c.hws[bi] };
  }).filter(b => [-1, 1].every(sd => W.wd(b.x + b.nx * sd * (b.hw + 1.6), b.z + b.nz * sd * (b.hw + 1.6)) > 0.3));
}

/** Point + tangent + half width at arclength s along a canal. */
function along(c, s) {
  let i = 1;
  while (i < c.cum.length - 1 && c.cum[i] < s) i++;
  const t = (s - c.cum[i - 1]) / Math.max(1e-6, c.cum[i] - c.cum[i - 1]), a = c.dense[i - 1], b = c.dense[i];
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
  return { x: a[0] + dx * t, z: a[1] + dz * t, tx: dx / len, tz: dz / len, hw: c.hws[i - 1] + (c.hws[i] - c.hws[i - 1]) * t };
}

export default {
  id: 'venice',
  name: 'Venice',
  description: 'Glide over an island city of canals, gondolas and pastel palazzi, and gobble up St Mark\'s Square!',
  cardColor: '#55c3be',
  emoji: '🛶',
  size: SIZE,
  groundColor: LAGOON,
  groundStyle: 'concrete',
  skyColor: '#8bd2ee',
  fogColor: '#d6ede9',
  lightColor: '#fff0d6',
  ambient: 0.66,
  lighting: {
    sunDirection: [40, 60, 25], sunColor: '#fff0d6', sunIntensity: 0.72 * Math.PI,
    hemiSkyColor: '#c5e5f8', hemiGroundColor: '#83b8b3', hemiIntensity: 0.63 * Math.PI,
    shadowOpacity: 0.76, shadowRadius: 3.2, environmentIntensity: 0.23, exposure: 1.04,
  },
  postProcessing: { aoRadius: 0.45, aoStrength: 0.14 },
  water: { roughness: 0.23, metalness: 0.06, normalStrength: 1.7, waveScale: 1.15, contrast: 0.82, wakes: true, wakeHeight: 0.10 },
  sky: { top: '#7fc9eb', horizon: '#d6ede9' },
  clouds: true,
  backdrop: [{ type: 'ocean', color: '#4fb5bd', color2: '#4fb5bd' }],
  edge: 'none',
  buildProtos,
  routes: null,

  decorate(ctx) {
    const { addRoute, merge } = ctx;
    buildWorld();
    let decalOrder = 0;
    const addDecal = (...args) => {
      const mesh = ctx.addDecal(...args);
      // Overlapping ribbons: paint in order without depth writes, still depth tested and hole-aware.
      mesh.renderOrder = ++decalOrder * 0.01;
      mesh.material.depthWrite = false;
      return mesh;
    };
    const { canals, island } = W;
    // Lagoon, island, quays.
    addDecal(rectGeo(0, 0, SIZE * 2 + 80, SIZE * 2 + 80), LAGOON, { style: 'water' });
    addDecal(polyGeo(island), LAND, { style: 'concrete' });
    addDecal(ribbonGeo(island, island.map(() => 1.0), true), LIP);
    // Quays and bank lips only where the canal runs through the island (not out across the lagoon).
    const runs = (c) => {
      const out = []; let cur = [];
      c.dense.forEach((p, i) => { if (insidePoly(island, p[0], p[1])) cur.push(i); else { if (cur.length > 1) out.push(cur); cur = []; } });
      if (cur.length > 1) out.push(cur);
      return out;
    };
    const ribbons = (list, extra) => list.flatMap(c => runs(c).map(r => ribbonGeo(r.map(i => c.dense[i]), r.map(i => c.hws[i] + extra))));
    addDecal(mergeGeos(ribbons(canals.filter(c => c.fond), 2.6)), QUAY, { style: 'concrete' });
    addDecal(mergeGeos(ribbons(canals, 0.55)), LIP);
    // Squares: paving, a trim line and a diamond lattice.
    addDecal(merge(PLAZAS.map(p => rectGeo(p.x, p.z, p.w, p.d))), PLAZA, { style: 'concrete' });
    const trim = [], diamonds = [], bands = [];
    for (const { x, z, w, d, piazza } of PLAZAS) {
      trim.push(rectGeo(x, z - d / 2 + 1.0, w - 2, 0.3), rectGeo(x, z + d / 2 - 1.0, w - 2, 0.3), rectGeo(x - w / 2 + 1.0, z, 0.3, d - 2), rectGeo(x + w / 2 - 1.0, z, 0.3, d - 2));
      if (piazza) for (let dx = -w / 2 + 3; dx < w / 2 - 2; dx += 4.5) bands.push(rectGeo(x + dx, z, 0.35, d - 2.4));
      else for (let dx = -w / 2 + 5; dx < w / 2 - 2; dx += 5) for (let dz = -d / 2 + 5; dz < d / 2 - 2; dz += 5) diamonds.push(rectGeo(x + dx, z + dz, 0.5, 0.5, PI / 4));
    }
    addDecal(merge(trim), '#d6bb93');
    addDecal(merge(diamonds), '#d9c3a1');
    addDecal(merge(bands), '#d2c2a0');
    // Street approaches to each bridge.
    addDecal(merge(W.bridges.map(b => rectGeo(b.x, b.z, b.hw * 2 + 22, 3.6, Math.atan2(-b.nz, b.nx)))), '#e6d9bb', { style: 'concrete' });
    // Canal water.
    addDecal(mergeGeos(canals.map(c => ribbonGeo(c.dense, c.hws))), WATER, { style: 'water' });

    // Water traffic: every canal and a lagoon loop.
    this.routes = {};
    for (const c of canals) {
      const pts = [];
      for (const p of c.dense) { if (Math.abs(p[0]) > 106 || Math.abs(p[1]) > 106) { if (pts.length > 1) break; continue; } pts.push(p); }
      this.routes[c.name] = addRoute(pts, { loop: false, width: c.w - (c.name === 'grand' ? 3.5 : 3), network: 'water' });
    }
    const loop = [], R = 15, H = 110.5;
    for (const [cx, cz, a0] of [[H - R, -H + R, -PI / 2], [H - R, H - R, 0], [-H + R, H - R, PI / 2], [-H + R, -H + R, PI]]) {
      for (let i = 0; i <= 5; i++) { const a = a0 + i * PI / 10; loop.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]); }
    }
    this.routes.lagoon = addRoute(loop, { loop: true, width: 6, network: 'water' });

    // Scenery bridges: stone arches over the traffic lanes (merged into one mesh, hidden inside holes).
    const geos = [];
    const addGeo = (proto, x, z, ang) => {
      const g = proto.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().makeTranslation(x, 0, z).multiply(new THREE.Matrix4().makeRotationY(ang)));
      geos.push(g);
    };
    let rialtoDone = false;
    W.bridges.forEach((b, i) => {
      const ang = Math.atan2(-b.nz, b.nx);
      if (b.kind === 'rialto' && !rialtoDone) { rialtoDone = true; addGeo(ctx.protos.rialto, b.x, b.z, ang); return; }
      addGeo(makeFootbridge('bridge' + i, b.hw * 2 + 0.4, b.canal === 'grand' ? 4.4 : 3.2), b.x, b.z, ang);
    });
    const bridgeGeo = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    const mat = applyHoleDiscard(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 }), false, true);
    const mesh = new THREE.Mesh(bridgeGeo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const holder = ctx.addDecal(rectGeo(0, 0, 0.1, 0.1), '#ffffff');
    holder.visible = false;
    holder.parent.add(mesh);
  },

  populate(ctx) {
    const { protos, place, rand, randRange, pick, placeOnRoute } = ctx;
    const { canals, wd, fd } = W;
    const BUCKET = 16;
    const rects = [], buckets = new Map();
    const bkey = (i, j) => i * 4096 + j;
    const addBucket = (r) => {
      const R = Math.hypot(r.hw, r.hd);
      for (let i = Math.floor((r.x - R) / BUCKET); i <= Math.floor((r.x + R) / BUCKET); i++) for (let j = Math.floor((r.z - R) / BUCKET); j <= Math.floor((r.z + R) / BUCKET); j++) {
        const k = bkey(i + 100, j + 100);
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(r);
      }
    };
    const near = (x, z, R) => {
      const out = new Set();
      for (let i = Math.floor((x - R) / BUCKET); i <= Math.floor((x + R) / BUCKET); i++) for (let j = Math.floor((z - R) / BUCKET); j <= Math.floor((z + R) / BUCKET); j++) for (const r of buckets.get(bkey(i + 100, j + 100)) ?? []) out.add(r);
      return out;
    };
    const mkRect = (x, z, w, d, th) => ({ x, z, hw: w / 2, hd: d / 2, c: Math.cos(th), s: Math.sin(th), th });
    const sat = (a, b, gap) => {
      const dx = b.x - a.x, dz = b.z - a.z;
      const A = [[a.c, -a.s, a.hw], [a.s, a.c, a.hd]], B = [[b.c, -b.s, b.hw], [b.s, b.c, b.hd]];
      for (const ax of [...A, ...B]) {
        const ux = ax[0], uz = ax[1];
        const ra = A.reduce((s, q) => s + q[2] * Math.abs(ux * q[0] + uz * q[1]), 0), rb = B.reduce((s, q) => s + q[2] * Math.abs(ux * q[0] + uz * q[1]), 0);
        if (Math.abs(dx * ux + dz * uz) > ra + rb + gap) return false;
      }
      return true;
    };
    const rectDist = (r, x, z) => {
      const dx = x - r.x, dz = z - r.z, u = Math.abs(dx * r.c - dz * r.s) - r.hw, v = Math.abs(dx * r.s + dz * r.c) - r.hd;
      return Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0);
    };
    const reserved = [];
    for (const p of PLAZAS) reserved.push({ ...mkRect(p.x, p.z, p.w, p.d, 0), plaza: p });
    for (const b of W.bridges) {
      const r = mkRect(b.x, b.z, b.hw * 2 + 20, 4.6, Math.atan2(-b.nz, b.nx));
      reserved.push({ ...r, plaza: null });
    }
    reserved.forEach(addBucket);
    const dims = (name) => { const bb = protos[name].geometry.boundingBox; return [bb.max.x - bb.min.x, bb.max.z - bb.min.z]; };
    const samples = (r) => {
      const pts = [];
      for (const u of [-1, 0, 1]) for (const v of [-1, 0, 1]) if (u || v) pts.push([r.x + r.c * u * r.hw + r.s * v * r.hd, r.z - r.s * u * r.hw + r.c * v * r.hd]);
      return pts;
    };
    let blockId = 0;
    const buildings = [];
    // Place a building if its footprint is dry, clear of squares / bridge approaches and (by `street`) of other blocks.
    const tryBuild = (name, x, z, th, block, opts = {}) => {
      const [w, d] = dims(name);
      const r = mkRect(x, z, w, d, th);
      const margin = opts.margin ?? 0.3;
      for (const [px, pz] of samples(r)) {
        if (wd(px, pz) < margin) return false;
        if (fd(px, pz) < 2.6) return false;
        if (Math.abs(px) > 112 || Math.abs(pz) > 112) return false;
      }
      for (const q of near(x, z, Math.hypot(r.hw, r.hd) + 18)) {
        if (q.plaza !== undefined) { if (opts.allowPlaza === q.plaza && q.plaza) { /* fronting this square: may touch its edge */ if (sat(r, q, -0.3)) return false; } else if (sat(r, q, 0)) return false; continue; }
        const gap = q.block === block ? -0.45 : (opts.street ?? 1.7);
        if (sat(r, q, gap)) return false;
      }
      if (Math.hypot(x, z) < 8) return false;
      if (!place(name, x, z, th, 1, { move: null, overlap: 0.2 })) return false;
      r.block = block; r.name = name; r.facePlaza = opts.allowPlaza?.name;
      rects.push(r); addBucket(r); buildings.push(r);
      return true;
    };
    const land = (name, x, z, th) => {
      const [w, d] = dims(name);
      const r = mkRect(x, z, w, d, th);
      if (!place(name, x, z, th, 1, { move: null, overlap: 0.2 })) return false;
      r.block = -1; r.name = name; rects.push(r); addBucket(r);
      return true;
    };

    // ---- landmarks: St Mark's Square opens south onto the lagoon via the piazzetta ----
    land('basilica', 83, 60, -PI / 2);
    land('dogePalace', 84.5, 79.5, -PI / 2);
    land('campanile', 69, 53, 0);
    land('procuratie', 38, 44.6, 0); land('procuratie', 56, 44.6, 0);
    land('procuratie', 38, 75.6, PI);
    land('procuratie', 53.5, 80, PI / 2);
    land('canalPalace', 49, 36, 0);

    const names = () => HOUSE_NAMES;
    const pickHouse = () => pick(names());

    // ---- frontage along the canals (fondamenta setback on the wide ones) ----
    for (const c of canals) for (const side of [-1, 1]) {
      const blk = ++blockId;
      let s = 1;
      while (s < c.len - 2) {
        const name = pickHouse(), [w, d] = dims(name);
        const p = along(c, s + w / 2), nx = -p.tz * side, nz = p.tx * side;
        const off = p.hw + (c.fond ? 2.9 : 0.55) + d / 2;
        const ok = tryBuild(name, p.x + nx * off, p.z + nz * off, Math.atan2(-nx, -nz), blk);
        s += ok ? w - 0.35 : 1.6;
      }
    }
    // ---- frontage around the squares ----
    for (const pl of PLAZAS) {
      if (pl.piazza) continue;
      const edges = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [ex, ez] of edges) {
        const blk = ++blockId, along2 = ex ? pl.d : pl.w;
        let s = -along2 / 2 + 0.5;
        while (s < along2 / 2 - 2) {
          const name = pickHouse(), [w, d] = dims(name);
          const sc = s + w / 2, off = (ex ? pl.w : pl.d) / 2 + d / 2 + 0.1;
          const x = pl.x + (ex ? ex * off : sc), z = pl.z + (ex ? sc : ez * off);
          const ok = tryBuild(name, x, z, Math.atan2(-ex, -ez), blk, { allowPlaza: pl.piazza ? null : reserved.find(q => q.plaza === pl).plaza });
          s += ok ? w - 0.35 : 1.6;
        }
      }
    }
    // ---- interior blocks: flood-fill outwards from seeds so rows share party walls with calli between blocks ----
    const faceOf = (x, z) => {
      let best = Infinity, bx = 0, bz = 0;
      for (const q of PLAZAS) {
        const px = Math.max(q.x - q.w / 2, Math.min(q.x + q.w / 2, x)), pz = Math.max(q.z - q.d / 2, Math.min(q.z + q.d / 2, z));
        const dd = Math.hypot(px - x, pz - z);
        if (dd < best) { best = dd; bx = px - x; bz = pz - z; }
      }
      const e = 1, gx = (wd(x + e, z) - wd(x - e, z)) / 2, gz = (wd(x, z + e) - wd(x, z - e)) / 2, w0 = wd(x, z);
      if (w0 < best || best > 20) { bx = -gx; bz = -gz; }
      return Math.atan2(bx, bz);
    };
    const MAXB = 430;
    const grow = (start) => {
      const queue = [start];
      for (let qi = 0; qi < queue.length && buildings.length < MAXB; qi++) {
        const a = queue[qi], fx = a.s, fz = a.c, rx = a.c, rz = -a.s;
        const cands = [];
        for (const sd of [-1, 1]) cands.push((n, w, d) => [a.x + rx * sd * (a.hw + w / 2 - 0.4), a.z + rz * sd * (a.hw + w / 2 - 0.4), a.th]);
        if (rand() < 0.85) cands.push((n, w, d) => { const o = randRange(-1, 1); return [a.x - fx * (a.hd + d / 2 - 0.3) + rx * o, a.z - fz * (a.hd + d / 2 - 0.3) + rz * o, a.th + PI]; });
        if (rand() < 0.5) cands.push((n, w, d) => { const o = randRange(-1, 1); return [a.x - fx * (a.hd + d / 2 + 2.4) + rx * o, a.z - fz * (a.hd + d / 2 + 2.4) + rz * o, a.th]; });
        for (const f of cands) {
          const name = pickHouse(), [w, d] = dims(name), [x, z, th] = f(null, w, d);
          if (tryBuild(name, x, z, th, a.block)) queue.push(rects[rects.length - 1]);
        }
      }
    };
    for (const b of buildings.slice()) if (rand() < 0.9) grow(b);
    for (let attempt = 0; attempt < 30000 && buildings.length < MAXB; attempt++) {
      const x = randRange(-98, 98), z = randRange(-96, 96);
      if (wd(x, z) < 2) continue;
      const name = pickHouse();
      if (tryBuild(name, x, z, faceOf(x, z), ++blockId)) grow(rects[rects.length - 1]);
    }
    W.buildings = buildings;

    // ---- small items ----
    const smalls = [], sbk = new Map();
    const skey = (x, z) => Math.floor(x / 4) * 4096 + Math.floor(z / 4);
    const freeCircle = (x, z, r) => {
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of sbk.get(skey(x + i * 4, z + j * 4)) ?? []) if (Math.hypot(q.x - x, q.z - z) < (q.r + r) * 0.9) return false;
      return true;
    };
    const put = (name, x, z, th = 0, opt = {}) => {
      const r = protos[name].radius;
      if (!opt.water && wd(x, z) < r + 0.25) return false;
      if (Math.abs(x) > 112 || Math.abs(z) > 112) return false;
      if (!opt.water) for (const q of near(x, z, 14)) if (q.plaza === undefined && rectDist(q, x, z) < r + 0.25) return false;
      for (const b of W.bridges) if (Math.abs((x - b.x) * -b.nz + (z - b.z) * b.nx) < (b.kind === 'rialto' ? 4.6 : 2.6) && Math.abs((x - b.x) * b.nx + (z - b.z) * b.nz) < b.hw + 3) return false;
      if (!freeCircle(x, z, r)) return false;
      if (!place(name, x, z, th, 1, { move: null, overlap: 0.25 })) return false;
      const rec = { x, z, r };
      const k = skey(x, z);
      if (!sbk.has(k)) sbk.set(k, []);
      sbk.get(k).push(rec); smalls.push(rec);
      return true;
    };
    const roomForWalker = (x, z, R) => {
      if (wd(x, z) < R + 0.8) return false;
      for (const q of near(x, z, R + 14)) if (q.plaza === undefined && rectDist(q, x, z) < R + 0.8) return false;
      return true;
    };
    const walker = (name, x, z, range, speed = 1.3) => roomForWalker(x, z, range) && freeCircle(x, z, 0.4) && place(name, x, z, randRange(0, PI * 2), 1, { move: { type: 'walk', speed, range }, overlap: 0.25 });
    const CAF = ['cafeTable'];
    const cluster = (cx, cz, nx, nz, set) => {
      // A café group in front of a facade: table with two chairs, umbrella behind.
      const tx = -nz, tz = nx;
      let n = 0;
      for (const [along, out] of set) {
        const x = cx + tx * along + nx * out, z = cz + tz * along + nz * out;
        if (put('cafeTable', x, z, 0)) {
          n++;
          put('cafeChair', x + tx * 1.15, z + tz * 1.15, Math.atan2(-tz, tx) + PI);
          put('cafeChair', x - tx * 1.15, z - tz * 1.15, Math.atan2(tz, -tx) + PI);
        }
      }
      return n;
    };

    // Squares: lamps, planters, benches with bins, wells, stalls, pigeons, café groups.
    for (const pl of PLAZAS) {
      const hx = pl.w / 2, hz = pl.d / 2, big = pl.piazza;
      // lamps every ~9 units along the edges, inset 1.3
      for (let t = -hx + 3; t <= hx - 2; t += big ? 8 : 9) { put('lantern', pl.x + t, pl.z - hz + 1.4, 0); put('lantern', pl.x + t, pl.z + hz - 1.4, 0); }
      for (let t = -hz + 3; t <= hz - 2; t += big ? 8 : 9) { put('lantern', pl.x - hx + 1.4, pl.z + t, 0); put('lantern', pl.x + hx - 1.4, pl.z + t, 0); }
      // planter boxes alternate with the lamps along the building sides
      for (let t = -hx + 6; t <= hx - 5; t += 4.5) { put('planterBox', pl.x + t, pl.z - hz + 1.0, 0); put('planterBox', pl.x + t + 1.4, pl.z + hz - 1.0, 0); }
      for (let t = -hz + 6; t <= hz - 5; t += 5) { put('planterBox', pl.x - hx + 1.0, pl.z + t, PI / 2); put('planterBox', pl.x + hx - 1.0, pl.z + t + 1.4, PI / 2); }
      if (pl.well) { const [ox, oz] = pl.well; put('well', pl.x + ox, pl.z + oz, 0); for (const [bx, bz, th] of [[-3.2, 0, PI / 2], [3.2, 0, -PI / 2], [0, -3.2, 0], [0, 3.2, PI]]) { put('bench', pl.x + ox + bx, pl.z + oz + bz, th); } put('trashBin', pl.x + ox + 3.2, pl.z + oz + 2.4, 0); put('trashBin', pl.x + ox - 3.2, pl.z + oz - 2.4, 0); }
      for (let k = 0; k < (pl.stalls ?? 0); k++) {
        const sx = pl.x - hx * 0.45 + k * 8, sz = pl.z + hz * 0.3;
        if (put('marketStall', sx, sz, 0)) {
          put('orangeCrate', sx - 1.2, sz + 1.7, 0); put('orangeCrate', sx + 0.1, sz + 1.8, 0.1); put('orangeCrate', sx + 1.4, sz + 1.7, 0);
          put('maskGold', sx - 2.4, sz + 0.6, 0); put('maskPink', sx - 2.5, sz - 0.5, 0); put('maskBlue', sx + 2.5, sz + 0.5, 0); put('gelato', sx + 2.5, sz - 0.6, 0);
        }
      }
      // pigeon flocks: tight groups, never rings
      const flocks = big ? 4 : 2;
      for (let f = 0; f < flocks; f++) {
        const fx = pl.x + randRange(-hx * 0.7, hx * 0.7), fz = pl.z + randRange(-hz * 0.6, hz * 0.6);
        for (let i = 0; i < 6; i++) put('pigeon', fx + randRange(-1.6, 1.6), fz + randRange(-1.6, 1.6), randRange(0, PI * 2));
      }
      // visitors
      const people = big ? 9 : 4;
      let made = 0;
      for (let i = 0; i < people * 8 && made < people; i++) {
        const x = pl.x + randRange(-hx + 4, hx - 4), z = pl.z + randRange(-hz + 4, hz - 4);
        if (walker(rand() < 0.8 ? 'tourist' : 'gondolier', x, z, 3.5)) made++;
      }
    }
    // Café groups in front of the buildings that face a square.
    let cafes = 0;
    for (const b of buildings) {
      if (!b.facePlaza) continue;
      if (rand() < 0.35) {
        const fx = b.s, fz = b.c;
        cafes += cluster(b.x + fx * (b.hd + 2.4), b.z + fz * (b.hd + 2.4), fx, fz, [[-2.2, 0], [2.2, 0]]);
        put('cafeUmbrella', b.x + fx * (b.hd + 4.6), b.z + fz * (b.hd + 4.6), 0);
      }
    }
    for (const q of rects) if (q.name === 'procuratie') {
      for (let k = -2; k <= 2; k++) cluster(q.x + q.s * (q.hd + 2.6) + q.c * k * 3.6, q.z + q.c * (q.hd + 2.6) - q.s * k * 3.6, q.s, q.c, [[0, 0], [0, 3.2]]);
      for (const k of [-1, 1]) put('cafeUmbrella', q.x + q.s * (q.hd + 8.5) + q.c * k * 6, q.z + q.c * (q.hd + 8.5) - q.s * k * 6, 0);
    }
    // Doorways: flower pots flanking the door of some houses; bollards / bins on the fondamenta.
    for (const b of buildings) {
      if (rand() > 0.55) continue;
      const fx = b.s, fz = b.c, rx = b.c, rz = -b.s, o = b.hd + 0.7;
      for (const sd of [-1, 1]) put('flowerPot', b.x + fx * o + rx * sd * (b.hw - 0.7), b.z + fz * o + rz * sd * (b.hw - 0.7), 0);
    }
    // Canal banks: lamps, striped mooring poles, moored gondolas.
    for (const c of canals) for (const side of [-1, 1]) {
      const spacing = c.fond ? 18 : 24;
      for (let s = 8 + (side > 0 ? 6 : 0); s < c.len - 6; s += spacing) {
        const p = along(c, s), nx = -p.tz * side, nz = p.tx * side;
        put('lantern', p.x + nx * (p.hw + 1.0), p.z + nz * (p.hw + 1.0), 0);
        if (c.fond) put('bollard', p.x + nx * (p.hw + 0.9) + p.tx * 2.5, p.z + nz * (p.hw + 0.9) + p.tz * 2.5, 0);
      }
      for (let s = 12 + (side > 0 ? 9 : 0); s < c.len - 10; s += 21) {
        const p = along(c, s), nx = -p.tz * side, nz = p.tx * side, off = p.hw - 0.75;
        const ang = Math.atan2(-p.tz, p.tx);
        if (rand() < (c.name === 'grand' ? 0.55 : 0.8)) {
          // a berth: poles at both ends, a gondola tied between them
          for (const e of [-3.6, 3.6]) put('mooringPole', p.x + p.tx * e + nx * off, p.z + p.tz * e + nz * off, 0, { water: true });
          place('gondola', p.x + nx * off, p.z + nz * off, ang, 1, { move: null, tight: true });
        } else {
          for (const e of [-0.6, 0.6]) put('mooringPole', p.x + p.tx * e + nx * off, p.z + p.tz * e + nz * off, 0, { water: true });
        }
      }
    }
    // Riva: poles and a few boats along the lagoon front of the piazzetta.
    for (let x = 58; x <= 77; x += 3.2) {
      let z = 80; while (z < 110 && wd(x, z) > -1.3) z += 0.5;
      place('mooringPole', x, z, 0, 1, { move: null });
    }
    for (const x of [-22, 6, 28]) { let z = 80; while (z < 112 && wd(x, z) > -3) z += 0.5; place('gondola', x + 6, z, 0, 1, { move: null, tight: true }); }
    // Scatter of extra benches / bins / planters on fondamenta-less quay edges is handled by the squares above.

    // Boats on the water.
    placeOnRoute('vaporetto', this.routes.grand, { count: 3, speed: 4.4, speedJitter: 0.12, offset: 2.4 });
    placeOnRoute('gondola', this.routes.grand, { count: 4, speed: 2.5, speedJitter: 0.12, offset: -2.2 });
    placeOnRoute('motorBoat', this.routes.grand, { count: 2, speed: 3.4, speedJitter: 0.12, offset: -0.2 });
    for (const [n, k] of [['r1', 1], ['r2', 2], ['r3', 1], ['r4', 1], ['r5', 1], ['r6', 2], ['r7', 1], ['r8', 1], ['r9', 1]]) placeOnRoute(rand() < 0.2 ? 'motorBoat' : 'gondola', this.routes[n], { count: k, speed: 2.2, speedJitter: 0.1, offset: 0 });
    placeOnRoute('vaporetto', this.routes.lagoon, { count: 3, speed: 5.2, speedJitter: 0.1 });
    placeOnRoute('sailboat', this.routes.lagoon, { count: 3, speed: 2.8, speedJitter: 0.15, offset: 1.5 });
    placeOnRoute('motorBoat', this.routes.lagoon, { count: 3, speed: 4.4, speedJitter: 0.1, offset: -1 });
  },
};
