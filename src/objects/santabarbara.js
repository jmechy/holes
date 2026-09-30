// Santa Barbara object prototypes: Spanish Colonial Revival buildings, palms, beach + wharf, landmarks.
// Vehicles / people are length-along-X, front toward +X. Buildings and landmarks face +Z.
import * as THREE from 'three';
import { box, rbox, cyl, cone, sphere, torus, capsule, lathe, extrude, makeProto } from './build.js';

const C = {
  stucco: '#f5eedd', cream: '#efe1c3', white: '#fbf7ee', peach: '#f1d4b0', pink: '#eccbb4', sand: '#e6d2ac', adobe: '#e2bf94',
  yellow: '#f6c445', ochre: '#eaa94a', orange: '#f28a2e', terra: '#c85a32', tile: '#c4522e', tile2: '#b04424', dtile: '#953a20',
  iron: '#2b2a2c', wood: '#8b5a34', dwood: '#573820', lwood: '#c9a066', plank: '#b98d58', glass: '#4f7e99', glass2: '#9fcde3',
  trim: '#faf6ea', red: '#d63a2b', blue: '#2f6fb3', navy: '#25406f', teal: '#2a9d9a', green: '#3d8a46', dgreen: '#2b6b36',
  lgreen: '#63b35a', olive: '#5b7f3a', oak: '#3e6634', oak2: '#4d7d3c', oak3: '#2f5229', trunk: '#8d7350', trunk2: '#6e5a3e',
  magenta: '#d81b7e', purple: '#8e3fb8', pinkb: '#ee5aa5', gold: '#e2b23c', concrete: '#c6c3bb', dconcrete: '#a8a59d',
  lconc: '#dedbd3', asphalt: '#4b4d52', black: '#161618', gray: '#8d949b', lgray: '#c4c9d0', silver: '#c9ced6', tire: '#1e1e21',
  skin: '#f0c7a0', skin2: '#c98d62', skin3: '#8a5a3c', white2: '#f4f4f4', brown: '#7a4b2a', sandy: '#e8d9a8', water: '#4aa3d8',
  rosered: '#d81f3a', rosepink: '#f06fa0', roseyellow: '#f5cf2a', rosewhite: '#f7f2ea', rosecoral: '#f2775a', soil: '#6b4a32',
  ivory: '#f2ead7', mission: '#eed3b6', missiond: '#d9b791',
};
const PI = Math.PI;
const TAU = PI * 2;

// ------------------------------------------------------------------ geometry helpers
const _M = new THREE.Matrix4(), _R = new THREE.Matrix4(), _Q = new THREE.Matrix4();
/** Move/rotate a whole group of parts about the model origin: yaw (about Y), then translate. */
const xf = (parts, { x = 0, y = 0, z = 0, ry = 0, s = 1 } = {}) => {
  _M.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s));
  parts.forEach((g) => g.applyMatrix4(_M));
  return parts;
};
/** Orient a geometry that lies along +X: pitch (about Z) then yaw (about Y), then translate. */
const aim = (g, x, y, z, yaw, pitch = 0) => {
  _M.makeTranslation(x, y, z);
  _R.makeRotationY(yaw);
  _Q.makeRotationZ(pitch);
  g.applyMatrix4(_M.multiply(_R).multiply(_Q));
  return g;
};
/** Outline of a rectangle topped with a semicircular arch (bottom at y=0, centred on x=0). */
const archPts = (w, h, n = 6) => {
  const r = w / 2, yS = Math.max(0, h - r), pts = [[-r, 0], [r, 0], [r, yS]];
  for (let i = 1; i < n; i++) { const a = (i / n) * PI; pts.push([r * Math.cos(a), yS + r * Math.sin(a)]); }
  pts.push([-r, yS]);
  return pts;
};
/** Half-ring (arch voussoir): outer/inner radius, centred at origin, spans the upper half. */
const ringPts = (ro, ri, n = 8) => {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * PI; pts.push([ro * Math.cos(a), ro * Math.sin(a)]); }
  for (let i = n; i >= 0; i--) { const a = (i / n) * PI; pts.push([ri * Math.cos(a), ri * Math.sin(a)]); }
  return pts;
};
/** Wall of nBays arched openings cut into its bottom edge (x from 0 .. length). Arch springs at yS. */
const arcadePts = (nBays, bayW, pier, wallH, yS, n = 5) => {
  const L = nBays * bayW + (nBays + 1) * pier, x0 = -L / 2;
  const pts = [[x0, 0], [x0, wallH], [x0 + L, wallH], [x0 + L, 0]];
  for (let b = nBays - 1; b >= 0; b--) {
    const xl = x0 + pier + b * (bayW + pier), xr = xl + bayW, r = bayW / 2, xc = xl + r;
    pts.push([xr, 0], [xr, yS]);
    for (let i = 1; i < n; i++) { const a = (i / n) * PI; pts.push([xc + r * Math.cos(a), yS + r * Math.sin(a)]); }
    pts.push([xl, yS], [xl, 0]);
  }
  return { pts, L };
};
/** Barrel-tile roof panel: teeth run along X (length L), panel runs along Z (length S). Centred; tile top at y~0.2. */
const tilePanel = (L, S, color, o = {}) => {
  const n = Math.max(2, Math.round(L / (o.pitch ?? 0.85))), pw = L / n, h = o.h ?? 0.24, x0 = -L / 2, pts = [];
  for (let i = 0; i < n; i++) { const a = x0 + i * pw; pts.push([a, 0], [a + pw * 0.3, h], [a + pw * 0.7, h]); }
  pts.push([x0 + L, 0], [x0 + L, -0.16], [x0, -0.16]);
  return extrude(pts, S, color, o);
};
/**
 * Gable roof with the ridge along X over a w x d footprint whose eaves sit at height y0.
 * Two ridged tile slopes + stucco gable ends. Returns parts.
 */
const gable = (w, d, y0, pitch = 0.5, roof = C.tile, wall = C.stucco, ov = 0.5) => {
  const hd = d / 2 + ov, rise = hd * Math.tan(pitch), S = hd / Math.cos(pitch), L = w + ov * 2;
  const p = [
    extrude([[-d / 2, 0], [d / 2, 0], [0, (d / 2) * Math.tan(pitch)]], w - 0.15, wall, { y: y0, ry: PI / 2 }),
    tilePanel(L, S, roof, { y: y0 + rise / 2 + 0.05, z: hd / 2, rx: pitch }),
    tilePanel(L, S, roof, { y: y0 + rise / 2 + 0.05, z: -hd / 2, rx: -pitch }),
    box(L, 0.16, 0.5, roof === C.tile ? C.dtile : roof, { y: y0 + rise + 0.22 }),
  ];
  return p;
};
/** Pyramid (4-sided) roof / cap. */
const pyramid = (w, h, color, o = {}) => cone(w / Math.SQRT2, h, color, { segments: 4, ry: PI / 4, ...o, y: (o.y || 0) + h / 2 });
const FACE = [
  (u, o) => ({ x: u, z: o, ry: 0 }),
  (u, o) => ({ x: o, z: -u, ry: PI / 2 }),
  (u, o) => ({ x: -u, z: -o, ry: PI }),
  (u, o) => ({ x: -o, z: u, ry: -PI / 2 }),
];
/** Window on face f (0:+Z 1:+X 2:-Z 3:-X) at lateral u, bottom y, wall distance off. */
const wnd = (f, u, y, off, w = 0.9, h = 1.5, o = {}) => {
  const { x, z, ry } = FACE[f](u, off);
  const fr = o.frame ?? C.trim, gl = o.glass ?? C.glass;
  const p = [];
  if (o.arch) {
    p.push(extrude(archPts(w + 0.3, h + 0.15), 0.12, fr, { x, y: y - 0.08, z, ry }));
    p.push(extrude(archPts(w, h), 0.18, gl, { x, y, z, ry }));
  } else {
    p.push(box(w + 0.3, h + 0.3, 0.12, fr, { x, y: y + h / 2, z, ry }));
    p.push(box(w, h, 0.18, gl, { x, y: y + h / 2, z, ry }));
    if (o.mull !== false) p.push(box(0.07, h, 0.24, fr, { x, y: y + h / 2, z, ry }));
    if (o.sill !== false) p.push(box(w + 0.6, 0.14, 0.42, fr, { x, y: y - 0.1, z, ry }));
  }
  if (o.shutter) {
    for (const s of [-1, 1]) {
      const sp = FACE[f](u + s * (w / 2 + 0.42), off);
      p.push(box(0.4, h + 0.1, 0.1, o.shutter, { x: sp.x, y: y + h / 2, z: sp.z, ry: sp.ry }));
    }
  }
  return p;
};
/** Arched door with frame. */
const door = (f, u, off, w = 1.3, h = 2.4, col = C.dwood, frame = C.trim) => {
  const { x, z, ry } = FACE[f](u, off);
  return [
    extrude(archPts(w + 0.5, h + 0.25), 0.14, frame, { x, y: 0, z, ry }),
    extrude(archPts(w, h), 0.2, col, { x, y: 0, z, ry }),
  ];
};
/** Wrought-iron balcony rail along face f (length len), height h, sitting at y with depth out from the wall. */
const balcony = (f, u, y, off, len = 3, out = 0.8, h = 0.9) => {
  const { x, z, ry } = FACE[f](u, off + out / 2);
  const p = [box(len, 0.16, out, C.dconcrete, { x, y, z, ry })];
  const nb = Math.max(3, Math.round(len / 0.42));
  const rz = FACE[f](u, off + out - 0.05);
  p.push(box(len, 0.07, 0.07, C.iron, { x: rz.x, y: y + h, z: rz.z, ry }));
  for (let i = 0; i <= nb; i++) {
    const q = FACE[f](u - len / 2 + (i / nb) * len, off + out - 0.05);
    p.push(box(0.05, h, 0.05, C.iron, { x: q.x, y: y + h / 2 + 0.05, z: q.z, ry }));
  }
  for (const s of [-1, 1]) {
    const q = FACE[f](u + s * (len / 2 - 0.03), off + out / 2);
    p.push(box(0.06, h * 0.55, out, C.iron, { x: q.x, y: y + h * 0.3, z: q.z, ry }));
  }
  return p;
};
/** Ridged awning along face f. */
const awning = (f, u, y, off, len, out, colA, colB) => {
  const { x, z, ry } = FACE[f](u, off + out / 2);
  const p = [];
  const n = Math.max(2, Math.round(len / 0.7));
  for (let i = 0; i < n; i++) {
    p.push(box(len / n, 0.1, out, i % 2 ? colB : colA, { x: x + Math.cos(ry) * ((i + 0.5) / n - 0.5) * len, y, z: z - Math.sin(ry) * ((i + 0.5) / n - 0.5) * len, ry }));
  }
  return p;
};

const wheel = (x, y, z, r, w = 0.3) => [
  cyl(r, r, w, C.tire, { x, y, z, rx: PI / 2, segments: 10, flat: false }),
  cyl(r * 0.55, r * 0.55, w + 0.04, C.silver, { x, y, z, rx: PI / 2, segments: 8, flat: false }),
];

// ------------------------------------------------------------------ vegetation
/** Slim palm with a gently curved trunk and drooping fronds. h = trunk height, lean = sideways curve. */
const palm = (h, lean, fronds, fl, o = {}) => {
  const p = [], seg = 5, tr = o.tr ?? 0.2;
  const X = (t) => lean * t * t;
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg, t1 = (i + 1) / seg;
    const x0 = X(t0), x1 = X(t1), y0 = h * t0, y1 = h * t1;
    const len = Math.hypot(x1 - x0, y1 - y0);
    p.push(cyl(tr * (1 - t1 * 0.35), tr * (1 - t0 * 0.35) * 1.05, len, i % 2 ? C.trunk : C.trunk2, {
      x: (x0 + x1) / 2, y: (y0 + y1) / 2, rz: -Math.atan2(x1 - x0, y1 - y0), segments: 7, flat: false }));
  }
  if (o.boots) p.push(sphere(tr * 1.5, C.trunk2, { x: X(1), y: h, segments: 8, rings: 5, flat: false }));
  const cx = X(1), cy = h;
  const w = o.w ?? 0.34;
  for (let k = 0; k < fronds; k++) {
    const yaw = (k / fronds) * TAU + (k % 2) * 0.2;
    const L1 = fl * 0.5, L2 = fl * 0.62, pr = o.rise ?? 0.42, dr = o.droop ?? -0.7;
    const c1 = Math.cos(pr) * L1, s1 = Math.sin(pr) * L1;
    const leaf1 = extrude([[0, -0.07], [L1 * 0.5, -w * fl * 0.17], [L1, -w * fl * 0.13], [L1, w * fl * 0.13], [L1 * 0.5, w * fl * 0.17], [0, 0.07]], 0.05, C.dgreen, { rx: PI / 2 });
    const leaf2 = extrude([[0, -w * fl * 0.13], [L2 * 0.4, -w * fl * 0.16], [L2, 0], [L2 * 0.4, w * fl * 0.16], [0, w * fl * 0.13]], 0.05, k % 2 ? C.green : C.lgreen, { rx: PI / 2 });
    p.push(aim(leaf1, cx, cy, 0, -yaw, pr));
    // second segment starts at the end of the first: rotate about the frond base
    _M.makeTranslation(cx, cy, 0);
    const lx = Math.cos(yaw) * c1, lz = -Math.sin(yaw) * c1;
    p.push(aim(leaf2, cx + lx, cy + s1, lz, -yaw, dr));
  }
  return p;
};
/** Fan palm: short thick trunk, big radial fan of stiff fronds (drawn as flat discs of leaf blades). */
const fanPalm = (h) => {
  const p = [cyl(0.32, 0.4, h, C.trunk2, { y: h / 2, segments: 8, flat: false }), cyl(0.5, 0.36, 0.5, C.trunk, { y: h, segments: 8, flat: false })];
  for (let k = 0; k < 11; k++) {
    const yaw = (k / 11) * TAU;
    const leaf = extrude([[0, -0.1], [1.2, -0.55], [2.6, -0.35], [3.0, 0], [2.6, 0.35], [1.2, 0.55], [0, 0.1]], 0.06, k % 2 ? C.green : C.dgreen, { rx: PI / 2 });
    p.push(aim(leaf, 0, h + 0.2, 0, -yaw, 0.3 - (k % 3) * 0.18));
  }
  return p;
};
const oakTree = (s = 1) => {
  const p = [
    cyl(0.45 * s, 0.7 * s, 2.4 * s, C.trunk2, { y: 1.2 * s, segments: 8, flat: false }),
    cyl(0.25 * s, 0.4 * s, 2.2 * s, C.trunk2, { x: 0.7 * s, y: 3.0 * s, rz: -0.8, segments: 7, flat: false }),
    cyl(0.25 * s, 0.4 * s, 2.0 * s, C.trunk2, { x: -0.7 * s, y: 3.0 * s, rz: 0.8, segments: 7, flat: false }),
  ];
  const blobs = [[0, 4.6, 0, 2.3, C.oak], [1.9, 3.9, 0.7, 1.8, C.oak2], [-1.9, 3.8, -0.6, 1.9, C.oak3], [0.5, 4.2, 1.9, 1.7, C.oak2],
    [-0.6, 4.1, -1.9, 1.7, C.oak], [1.2, 5.2, -0.9, 1.5, C.oak3], [-1.2, 5.3, 0.8, 1.4, C.oak2]];
  for (const [x, y, z, r, c] of blobs) p.push(sphere(r * s, c, { x: x * s, y: y * s, z: z * s, sy: 0.8, segments: 9, rings: 6, flat: false }));
  return p;
};
const roseBush = (col) => {
  const p = [sphere(0.42, C.green, { y: 0.32, sy: 0.75, segments: 9, rings: 6, flat: false })];
  const fl = [[0.2, 0.55, 0.1], [-0.15, 0.6, 0.18], [0.05, 0.68, -0.2], [-0.25, 0.5, -0.12], [0.28, 0.45, -0.2], [0.0, 0.5, 0.3], [-0.05, 0.75, 0.02]];
  for (const [x, y, z] of fl) p.push(sphere(0.11, col, { x, y, z, segments: 6, rings: 4, flat: false }));
  return p;
};
const bougainvillea = (col, col2) => {
  const p = [sphere(0.55, C.dgreen, { y: 0.45, sy: 0.85, segments: 9, rings: 6, flat: false })];
  const cl = [[0, 0.95, 0, 0.5], [0.5, 0.7, 0.2, 0.42], [-0.5, 0.75, -0.1, 0.4], [0.15, 0.6, 0.55, 0.38], [-0.2, 0.65, -0.5, 0.4], [0.45, 0.4, -0.45, 0.34], [-0.55, 0.4, 0.4, 0.34]];
  cl.forEach(([x, y, z, r], i) => p.push(sphere(r, i % 3 === 2 ? col2 : col, { x, y, z, sy: 0.75, segments: 7, rings: 5, flat: false })));
  p.push(cyl(0.3, 0.24, 0.3, C.terra, { y: 0.15, segments: 10, flat: false }));
  return p;
};
const agave = () => {
  const p = [];
  for (let k = 0; k < 9; k++) {
    const yaw = (k / 9) * TAU;
    const blade = extrude([[0, -0.1], [0.5, -0.16], [1.1, 0], [0.5, 0.16], [0, 0.1]], 0.05, k % 2 ? '#5d9a86' : '#6fae94', { rx: PI / 2 });
    p.push(aim(blade, 0, 0.12, 0, -yaw, 0.7 - (k % 3) * 0.15));
  }
  p.push(cyl(0.12, 0.16, 0.3, C.sand, { y: 0.15, segments: 6 }));
  return p;
};
const figTree = () => {
  const p = [cyl(1.6, 2.4, 3.5, C.trunk2, { y: 1.75, segments: 12, flat: false })];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    p.push(cyl(0.4, 0.9, 3.4, C.trunk2, { x: Math.cos(a) * 2.6, z: Math.sin(a) * 2.6, y: 1.2, rz: Math.cos(a) * 0.9, rx: -Math.sin(a) * 0.9, segments: 7, flat: false }));
  }
  p.push(cyl(0.8, 1.2, 4, C.trunk, { x: 1.3, y: 5, rz: -0.6, segments: 8, flat: false }), cyl(0.7, 1.1, 4, C.trunk, { x: -1.4, y: 5, rz: 0.6, segments: 8, flat: false }));
  const cols = [C.oak3, C.oak, C.dgreen, C.oak2];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU * 2.3, rr = i < 9 ? 0 : i < 17 ? 3.6 : 6.4, ra = rr * 1.0;
    const r = rr === 0 ? 4.4 : rr < 5 ? 3.6 : 3.0;
    p.push(sphere(r, cols[i % 4], { x: Math.cos(a) * ra * (rr ? 1 : 0.4), y: (rr === 0 ? 10.2 : rr < 5 ? 8.6 : 7.4) + (i % 3) * 0.5, z: Math.sin(a) * ra * (rr ? 1 : 0.4), sy: 0.72, segments: 9, rings: 6, flat: false }));
  }
  return p;
};

// ------------------------------------------------------------------ people
const person = (shirt, pants, skin, hair, o = {}) => {
  const legLen = o.kid ? 0.45 : 0.72, sc = o.kid ? 0.7 : 1;
  const p = [
    cyl(0.1 * sc, 0.09 * sc, legLen, pants, { x: 0, y: legLen / 2 + 0.06, z: 0.11 * sc, segments: 8, flat: false }),
    cyl(0.1 * sc, 0.09 * sc, legLen, pants, { x: 0, y: legLen / 2 + 0.06, z: -0.11 * sc, segments: 8, flat: false }),
    box(0.3 * sc, 0.08, 0.14 * sc, o.shoe ?? C.white2, { x: 0.04, y: 0.04, z: 0.11 * sc }),
    box(0.3 * sc, 0.08, 0.14 * sc, o.shoe ?? C.white2, { x: 0.04, y: 0.04, z: -0.11 * sc }),
    cyl(0.2 * sc, 0.23 * sc, 0.6 * sc, shirt, { y: legLen + 0.34, segments: 10, flat: false }),
    cyl(0.065, 0.06, 0.55 * sc, o.sleeve ?? shirt, { y: legLen + 0.4, z: 0.3 * sc, rx: 0.16, segments: 7, flat: false }),
    cyl(0.065, 0.06, 0.55 * sc, o.sleeve ?? shirt, { y: legLen + 0.4, z: -0.3 * sc, rx: -0.16, segments: 7, flat: false }),
    sphere(0.16 * (o.kid ? 1.15 : 1), skin, { y: legLen + 0.9 * sc, segments: 9, rings: 7, flat: false }),
    sphere(0.17 * (o.kid ? 1.15 : 1), hair, { x: -0.03, y: legLen + 0.95 * sc, sy: 0.7, segments: 8, rings: 5, flat: false }),
  ];
  if (o.hat) p.push(cyl(0.3, 0.3, 0.03, o.hat, { y: legLen + 1.0 * sc, segments: 12, flat: false }), cyl(0.15, 0.17, 0.12, o.hat, { y: legLen + 1.06 * sc, segments: 10, flat: false }));
  if (o.board) p.push(capsule(0.09, 1.6, o.board, { x: 0.02, y: 1.1, z: -0.32, rz: 0.05, sx: 0.35, sz: 1.5, segments: 8, caps: 3 }));
  if (o.bag) p.push(rbox(0.16, 0.3, 0.3, o.bag, { x: -0.22, y: legLen + 0.4, segments: 1 }));
  return p;
};
const dogModel = (col, col2) => [
  capsule(0.16, 0.4, col, { y: 0.42, rz: PI / 2, segments: 8, caps: 3 }),
  sphere(0.17, col, { x: 0.45, y: 0.6, segments: 8, rings: 6, flat: false }),
  cone(0.07, 0.16, col2, { x: 0.62, y: 0.57, rz: -PI / 2, segments: 6 }),
  box(0.12, 0.16, 0.06, col2, { x: 0.42, y: 0.78, z: 0.1, rz: -0.3 }),
  box(0.12, 0.16, 0.06, col2, { x: 0.42, y: 0.78, z: -0.1, rz: -0.3 }),
  ...[[0.25, 0.1], [0.25, -0.1], [-0.25, 0.1], [-0.25, -0.1]].map(([x, z]) => cyl(0.04, 0.04, 0.35, col2, { x, y: 0.18, z, segments: 6 })),
  cyl(0.03, 0.04, 0.35, col, { x: -0.52, y: 0.55, rz: 0.9, segments: 6 }),
];
const gull = (pelican = false) => {
  const s = pelican ? 2.3 : 1;
  const body = pelican ? '#8b8b86' : C.white2, wing = pelican ? '#4b4a47' : '#9aa3ad', beak = pelican ? '#e9b34f' : C.orange;
  const p = [
    sphere(0.2 * s, body, { y: 0.3 * s + (pelican ? 0.2 : 0), sx: 1.5, sy: 0.85, segments: 9, rings: 6, flat: false }),
    sphere(0.11 * s, pelican ? C.white2 : body, { x: 0.3 * s, y: 0.5 * s + (pelican ? 0.25 : 0), segments: 8, rings: 6, flat: false }),
    cone(0.04 * s, (pelican ? 0.55 : 0.16) * s, beak, { x: (pelican ? 0.6 : 0.42) * s, y: 0.5 * s + (pelican ? 0.15 : 0), rz: -PI / 2, segments: 6 }),
    box(0.34 * s, 0.03 * s, 0.16 * s, wing, { x: -0.06 * s, y: 0.36 * s + (pelican ? 0.2 : 0), z: 0.17 * s, ry: 0.35, rx: 0.15 }),
    box(0.34 * s, 0.03 * s, 0.16 * s, wing, { x: -0.06 * s, y: 0.36 * s + (pelican ? 0.2 : 0), z: -0.17 * s, ry: -0.35, rx: -0.15 }),
    box(0.22 * s, 0.03 * s, 0.14 * s, wing, { x: -0.36 * s, y: 0.32 * s + (pelican ? 0.2 : 0) }),
    cyl(0.015 * s, 0.015 * s, 0.22 * s, beak, { x: 0.02, y: 0.1 * s, z: 0.06 * s, segments: 5 }),
    cyl(0.015 * s, 0.015 * s, 0.22 * s, beak, { x: 0.02, y: 0.1 * s, z: -0.06 * s, segments: 5 }),
  ];
  if (pelican) p.push(sphere(0.16, '#e9b34f', { x: 0.62 * s, y: 0.52 * s, sx: 1.6, sy: 0.6, segments: 7, rings: 5, flat: false }));
  return p;
};

// ------------------------------------------------------------------ vehicles
const carBody = (o) => {
  const { len = 4.4, wid = 1.85, body, roofCol = body, cab = 0.5, cabX = -0.25, cabLen = 0.5, hh = 0.75, kind = 'sedan' } = o;
  const p = [
    rbox(len, hh, wid, body, { y: 0.32 + hh / 2 + 0.05, bevel: 0.22, segments: 1 }),
    box(len * 0.97, 0.16, wid + 0.02, C.black, { y: 0.4 }),
  ];
  const cl = len * cabLen, cy = 0.32 + hh + 0.05 + cab / 2 - 0.05;
  p.push(rbox(cl, cab, wid * 0.9, roofCol, { x: cabX * len * 0.4, y: cy, bevel: 0.16, segments: 1 }));
  // glass bands wrap the cabin
  p.push(box(cl * 0.92, cab * 0.6, wid * 0.93, C.glass, { x: cabX * len * 0.4, y: cy + 0.02 }));
  p.push(box(cl * 0.35, cab * 0.6, wid * 0.93 + 0.01, roofCol, { x: cabX * len * 0.4 - cl * 0.05, y: cy + 0.02 }));
  // lights, mirrors, bumpers
  p.push(box(0.08, 0.16, 0.34, '#fff2b0', { x: len / 2 - 0.02, y: 0.78, z: 0.62 }), box(0.08, 0.16, 0.34, '#fff2b0', { x: len / 2 - 0.02, y: 0.78, z: -0.62 }));
  p.push(box(0.08, 0.16, 0.34, C.red, { x: -len / 2 + 0.02, y: 0.8, z: 0.64 }), box(0.08, 0.16, 0.34, C.red, { x: -len / 2 + 0.02, y: 0.8, z: -0.64 }));
  p.push(box(0.22, 0.14, wid * 0.85, C.dconcrete, { x: len / 2, y: 0.42 }), box(0.22, 0.14, wid * 0.85, C.dconcrete, { x: -len / 2, y: 0.42 }));
  p.push(box(0.14, 0.1, 0.16, body, { x: cabX * len * 0.4 + cl * 0.42, y: cy - 0.05, z: wid * 0.5 }), box(0.14, 0.1, 0.16, body, { x: cabX * len * 0.4 + cl * 0.42, y: cy - 0.05, z: -wid * 0.5 }));
  const wr = o.wr ?? 0.4, wx = len * 0.31;
  p.push(...wheel(wx, wr, wid / 2 - 0.04, wr), ...wheel(wx, wr, -wid / 2 + 0.04, wr), ...wheel(-wx, wr, wid / 2 - 0.04, wr), ...wheel(-wx, wr, -wid / 2 + 0.04, wr));
  return p;
};
const suvModel = (body) => carBody({ len: 4.7, wid: 1.95, body, hh: 0.9, cab: 0.65, cabLen: 0.72, cabX: -0.45, wr: 0.44 });
const pickupModel = (body) => {
  const p = carBody({ len: 5.2, wid: 1.95, body, hh: 0.85, cab: 0.55, cabLen: 0.36, cabX: 1.0, wr: 0.46 });
  p.push(box(1.9, 0.5, 1.8, C.dconcrete, { x: -1.35, y: 1.12 }), box(1.9, 0.06, 1.84, C.black, { x: -1.35, y: 1.38 }));
  return p;
};

// ------------------------------------------------------------------ building generators
/**
 * Spanish Colonial building (front toward +Z). Options: w,d,floors,fh (floor height), wall, roof color,
 * arcade (arched ground-floor loggia), balcony, awn [colA,colB], tower (corner bell tower), shutters, chimney.
 */
const colonial = (o) => {
  const { w = 10, d = 8, floors = 1, fh = 3.3, wall = C.stucco, roof = C.tile, arcade = false, balc = false, awn = null, tower = false,
    shut = null, chimney = true, pitch = 0.42, bays = 3, rear = true, flatRoof = false, doorCol = C.dwood } = o;
  const H = floors * fh;
  const p = [rbox(w, H, d, wall, { y: H / 2, bevel: 0.18, segments: 1 }), box(w + 0.25, 0.42, d + 0.25, C.dconcrete, { y: 0.21 })];
  const hd = d / 2;
  if (arcade) {
    const bw = (w - 1.2) / bays - 0.7;
    const { pts, L } = arcadePts(bays, bw, 0.7, fh * 0.85, fh * 0.85 - bw / 2 - 0.2, 5);
    p.push(box(w - 0.5, fh * 0.8, 0.6, C.dwood, { y: fh * 0.4 + 0.2, z: hd - 0.8 }));
    p.push(extrude(pts, 1.1, wall, { y: 0.25, z: hd + 0.05 }));
    p.push(box(w + 0.2, 0.3, 1.5, C.trim, { y: fh * 0.85 + 0.35, z: hd + 0.05 }));
    for (let i = 0; i < bays; i++) {
      const u = -L / 2 + 0.7 + bw / 2 + i * (bw + 0.7);
      p.push(...door(0, u, hd - 0.7, bw * 0.55, fh * 0.55, doorCol));
    }
  } else {
    p.push(...door(0, w * 0.18, hd, 1.4, fh * 0.72, doorCol));
    p.push(...wnd(0, -w * 0.22, 1.0, hd, 1.3, fh * 0.5, { arch: true, shutter: shut }));
    if (w > 9) p.push(...wnd(0, -w * 0.02 + 0.2, 1.0, hd, 1.3, fh * 0.5, { arch: true, shutter: shut }));
    if (w > 8) p.push(...wnd(0, w * 0.4, 1.0, hd, 1.0, fh * 0.5, { arch: true }));
  }
  for (let f = 1; f < floors; f++) {
    const y = f * fh + 0.7;
    const n = Math.max(2, Math.floor((w - 1.5) / 3.0));
    for (let i = 0; i < n; i++) {
      const u = -w / 2 + 1.6 + i * ((w - 3.2) / Math.max(1, n - 1));
      p.push(...wnd(0, u, y, hd, 0.95, 1.7, { arch: f === floors - 1 || i % 2 === 0, shutter: shut }));
    }
    if (balc) p.push(...balcony(0, 0, f * fh + 0.05, hd, Math.min(w - 2, 5.5), 0.9));
    p.push(box(w + 0.2, 0.22, d + 0.2, C.trim, { y: f * fh - 0.05 }));
  }
  for (let f = 0; f < floors; f++) {
    const y = f * fh + (f ? 0.7 : 1.0);
    p.push(...wnd(1, 0, y, w / 2, 0.95, 1.5, { arch: true }), ...wnd(3, 0, y, w / 2, 0.95, 1.5, { arch: true }));
    if (d > 7) p.push(...wnd(1, d * 0.26, y, w / 2, 0.85, 1.4), ...wnd(3, -d * 0.26, y, w / 2, 0.85, 1.4));
  }
  if (rear) p.push(...wnd(2, w * 0.2, 1.1, hd, 1.1, 1.5), ...wnd(2, -w * 0.2, 1.1, hd, 1.1, 1.5));
  if (awn) p.push(...awning(0, 0, fh * 0.82, hd, w * 0.7, 1.6, awn[0], awn[1]));
  p.push(box(w + 0.5, 0.28, d + 0.5, C.trim, { y: H + 0.05 }));
  if (flatRoof) {
    p.push(box(w + 0.1, 0.9, 0.4, wall, { y: H + 0.5, z: hd }), box(w + 0.1, 0.9, 0.4, wall, { y: H + 0.5, z: -hd }),
      box(0.4, 0.9, d, wall, { y: H + 0.5, x: w / 2 }), box(0.4, 0.9, d, wall, { y: H + 0.5, x: -w / 2 }));
    p.push(tilePanel(w * 0.5, 2.6, roof, { y: H + 0.9, z: 0, rx: 0.15 }));
  } else {
    p.push(...gable(w, d, H + 0.15, pitch, roof, wall));
    if (chimney) p.push(rbox(0.8, 2.2, 0.8, C.adobe, { x: w * 0.3, y: H + 1.8, z: -d * 0.15, bevel: 0.1, segments: 1 }), box(1.0, 0.16, 1.0, C.dconcrete, { x: w * 0.3, y: H + 2.95, z: -d * 0.15 }));
  }
  if (tower) {
    const tw = 3.2, th = H + 3.2;
    p.push(rbox(tw, th, tw, wall, { x: -w / 2 + 0.6, y: th / 2, z: hd - 0.3, bevel: 0.15, segments: 1 }));
    p.push(...wnd(0, -w / 2 + 0.6, H - 0.3, hd + 1.35, 0.9, 1.5, { arch: true }));
    p.push(pyramid(tw + 0.8, 2.2, roof, { x: -w / 2 + 0.6, y: th, z: hd - 0.3 }), sphere(0.2, C.gold, { x: -w / 2 + 0.6, y: th + 2.4, z: hd - 0.3, segments: 6, rings: 4 }));
  }
  return p;
};

const wall = (len, h, thick, col, o = {}) => box(len, h, thick, col, { y: h / 2, ...o });

// ================================================================== protos
export function buildProtos() {
  const P = {};
  const add = (name, parts, opts) => (P[name] = makeProto(name, parts.flat(), opts));
  const WALK = (speed = 1.3, range = 9) => ({ type: 'walk', speed, range });

  // ---------- tiny: garden + street
  [['roseRed', C.rosered], ['rosePink', C.rosepink], ['roseYellow', C.roseyellow], ['roseWhite', C.rosewhite], ['roseCoral', C.rosecoral]]
    .forEach(([n, c]) => add(n, roseBush(c), { value: 0.12 }));
  add('bougM', bougainvillea(C.magenta, C.pinkb), { value: 0.3 });
  add('bougP', bougainvillea(C.purple, C.magenta), { value: 0.3 });
  add('bougO', bougainvillea(C.orange, C.yellow), { value: 0.3 });
  add('agave', agave(), { value: 0.25 });
  add('pottedPalm', [cyl(0.4, 0.3, 0.6, C.terra, { y: 0.3, segments: 10, flat: false }), cyl(0.05, 0.07, 1.4, C.trunk, { y: 1.2, segments: 6 }),
    ...[0, 1, 2, 3, 4, 5].map((k) => aim(extrude([[0, -0.05], [0.5, -0.16], [1.1, 0], [0.5, 0.16], [0, 0.05]], 0.04, C.green, { rx: PI / 2 }), 0, 1.9, 0, (k / 6) * TAU, 0.45 - (k % 2) * 0.35))], { value: 0.3 });
  add('topiary', [cyl(0.4, 0.34, 0.5, C.terra, { y: 0.25, segments: 10, flat: false }), cyl(0.06, 0.06, 0.5, C.trunk2, { y: 0.75, segments: 6 }),
    sphere(0.55, C.dgreen, { y: 1.35, segments: 10, rings: 8, flat: false }), sphere(0.32, C.green, { y: 2.0, segments: 8, rings: 6, flat: false })], { value: 0.4 });
  add('trashCan', [cyl(0.32, 0.26, 0.85, '#3f5f4a', { y: 0.45, segments: 12, flat: false }), cyl(0.36, 0.36, 0.08, C.iron, { y: 0.93, segments: 12, flat: false }),
    torus(0.33, 0.03, C.iron, { y: 0.55, rx: PI / 2, radial: 5, segments: 14 }), cyl(0.06, 0.06, 0.1, C.iron, { y: 1.02, segments: 6 })], { value: 0.25 });
  add('newsBox', [rbox(0.55, 0.85, 0.5, C.blue, { y: 0.75, bevel: 0.06, segments: 1 }), box(0.44, 0.3, 0.05, C.glass2, { y: 0.98, z: 0.26 }), box(0.14, 0.09, 0.05, C.white2, { y: 0.66, z: 0.27 }),
    box(0.06, 0.34, 0.06, C.iron, { x: 0.2, y: 0.17, z: 0.1 }), box(0.06, 0.34, 0.06, C.iron, { x: -0.2, y: 0.17, z: 0.1 }), box(0.06, 0.34, 0.06, C.iron, { x: 0.2, y: 0.17, z: -0.1 }), box(0.06, 0.34, 0.06, C.iron, { x: -0.2, y: 0.17, z: -0.1 })], { value: 0.3 });
  add('hydrant', [cyl(0.2, 0.24, 0.6, C.red, { y: 0.35, segments: 10, flat: false }), sphere(0.2, C.red, { y: 0.68, sy: 0.7, segments: 10, rings: 6, flat: false }),
    cyl(0.08, 0.08, 0.5, C.red, { y: 0.5, rz: PI / 2, segments: 8, flat: false }), cyl(0.28, 0.28, 0.06, C.iron, { y: 0.05, segments: 10, flat: false })], { value: 0.2 });
  add('mailbox', [rbox(0.6, 0.9, 0.6, C.blue, { y: 0.45, bevel: 0.1, segments: 1 }), cyl(0.3, 0.3, 0.6, C.blue, { y: 0.95, rx: PI / 2, rz: PI / 2, segments: 10, flat: false }), box(0.3, 0.05, 0.05, C.iron, { y: 0.72, z: 0.31 })], { value: 0.3 });
  add('bench', [box(1.7, 0.08, 0.5, C.lwood, { y: 0.5 }), box(1.7, 0.42, 0.07, C.lwood, { y: 0.8, z: -0.22, rx: -0.14 }),
    ...[-0.75, 0.75].flatMap((x) => [box(0.08, 0.5, 0.5, C.iron, { x, y: 0.25 }), box(0.08, 0.1, 0.6, C.iron, { x, y: 0.6 }), box(0.08, 0.55, 0.08, C.iron, { x, y: 0.82, z: -0.27, rx: -0.14 })])], { value: 0.4 });
  add('cafeChair', [box(0.42, 0.06, 0.42, C.iron, { y: 0.48 }), box(0.42, 0.5, 0.05, C.iron, { y: 0.75, z: -0.2 }), ...[[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]].map(([x, z]) => cyl(0.02, 0.02, 0.48, C.iron, { x, y: 0.24, z, segments: 5 }))], { value: 0.1 });
  const table = (uc, uc2) => [cyl(0.55, 0.55, 0.05, C.trim, { y: 0.78, segments: 14, flat: false }), cyl(0.05, 0.05, 0.78, C.iron, { y: 0.39, segments: 6 }), cyl(0.3, 0.3, 0.04, C.iron, { y: 0.03, segments: 10 }),
    cyl(0.03, 0.03, 2.1, C.iron, { y: 1.05, segments: 6 }), cone(1.35, 0.38, uc, { y: 2.2, segments: 8, flat: false }), cone(0.7, 0.3, uc2, { y: 2.32, segments: 8, flat: false }),
    ...[[0.85, 0], [-0.85, 0]].map(([x, z]) => box(0.4, 0.06, 0.4, C.iron, { x, y: 0.46, z })), ...[[0.98, 0], [-0.98, 0]].map(([x]) => box(0.05, 0.42, 0.4, C.iron, { x, y: 0.7 }))];
  add('cafeTable', table(C.red, C.trim), { value: 0.5 });
  add('cafeTableB', table(C.teal, C.trim), { value: 0.5 });
  add('cafeTableC', table(C.yellow, C.orange), { value: 0.5 });
  add('streetLamp', [cyl(0.24, 0.32, 0.9, C.iron, { y: 0.45, segments: 8, flat: false }), cyl(0.09, 0.14, 3.4, C.iron, { y: 2.55, segments: 8, flat: false }), sphere(0.18, C.iron, { y: 1.0, segments: 8, rings: 5 }),
    box(0.4, 0.06, 0.4, C.iron, { y: 4.3 }), rbox(0.34, 0.5, 0.34, '#ffe9a8', { y: 4.6, bevel: 0.05, segments: 1 }), pyramid(0.55, 0.35, C.iron, { y: 4.85 }), sphere(0.08, C.iron, { y: 5.25, segments: 6, rings: 4 }),
    ...[-1, 1].map((s) => torus(0.28, 0.03, C.iron, { x: s * 0.3, y: 3.4, radial: 4, segments: 10, rz: 0 })), box(0.5, 0.05, 0.05, C.iron, { y: 3.35 })], { value: 0.4 });
  add('bikeRack', [...[-0.6, -0.2, 0.2, 0.6].map((x) => torus(0.3, 0.025, C.iron, { x, y: 0.3, radial: 4, segments: 10 })), box(1.6, 0.04, 0.04, C.iron, { y: 0.03 })], { value: 0.25 });
  const cruiser = (col) => [torus(0.36, 0.05, C.tire, { x: 0.62, y: 0.42, radial: 4, segments: 12 }), torus(0.36, 0.05, C.tire, { x: -0.62, y: 0.42, radial: 4, segments: 12 }),
    box(1.0, 0.07, 0.07, col, { x: 0, y: 0.72, rz: 0.12 }), box(0.07, 0.55, 0.07, col, { x: -0.35, y: 0.7, rz: -0.2 }), box(0.07, 0.6, 0.07, col, { x: 0.52, y: 0.75, rz: 0.18 }),
    box(0.3, 0.06, 0.16, C.dwood, { x: -0.42, y: 1.02 }), box(0.06, 0.06, 0.7, C.iron, { x: 0.62, y: 1.08 }), box(0.5, 0.05, 0.3, C.lwood, { x: -0.85, y: 0.9, rz: 0.1 }),
    ...[0.62, -0.62].map((x) => cyl(0.02, 0.02, 0.05, C.silver, { x, y: 0.42, rx: PI / 2, segments: 6 }))];
  add('bike', cruiser(C.teal), { value: 0.4 });
  add('bikeB', cruiser(C.red), { value: 0.4 });
  add('bikeC', cruiser(C.yellow), { value: 0.4 });
  add('phoneBooth', [rbox(0.9, 2.2, 0.9, C.navy, { y: 1.1, bevel: 0.08, segments: 1 }), box(0.7, 1.4, 0.06, C.glass2, { y: 1.3, z: 0.46 }), box(0.7, 0.2, 0.06, C.white2, { y: 2.0, z: 0.46 })], { value: 0.5 });
  add('busShelter', [box(3.6, 0.1, 1.4, C.dconcrete, { y: 2.4 }), box(3.4, 2.2, 0.06, C.glass2, { y: 1.3, z: -0.6 }), box(0.1, 2.4, 0.1, C.iron, { x: 1.75, y: 1.2, z: -0.6 }), box(0.1, 2.4, 0.1, C.iron, { x: -1.75, y: 1.2, z: -0.6 }),
    box(2.0, 0.1, 0.5, C.lwood, { y: 0.55, z: -0.35 }), pyramid(0.01, 0.01, C.iron, { y: 0 }), box(3.7, 0.3, 1.5, C.teal, { y: 2.6 })], { value: 0.9 });
  add('kiosk', [rbox(2.4, 2.4, 2.0, C.yellow, { y: 1.2, bevel: 0.15, segments: 1 }), box(2.6, 0.15, 2.2, C.terra, { y: 2.5 }), pyramid(2.8, 0.9, C.tile, { y: 2.55 }), box(1.8, 0.9, 0.08, C.glass, { y: 1.5, z: 1.03 }),
    box(2.0, 0.08, 0.5, C.lwood, { y: 1.0, z: 1.2 }), box(1.4, 0.3, 0.08, C.red, { y: 2.15, z: 1.05 })], { value: 1.1 });

  // ---------- tiny: beach
  const board = (c, c2) => [capsule(0.16, 1.9, c, { y: 1.1, sx: 0.32, sz: 1, segments: 8, caps: 4 }), box(0.03, 1.8, 0.32, c2, { y: 1.1 }), box(0.02, 0.5, 0.12, C.black, { y: 0.25, z: 0.0 })];
  add('surfboard', board('#fff6d8', C.teal), { value: 0.25 });
  add('surfboardB', board(C.yellow, C.red), { value: 0.25 });
  add('surfboardC', board('#7ed3e8', C.navy), { value: 0.25 });
  add('beachBall', [sphere(0.34, C.red, { y: 0.34, segments: 10, rings: 8, flat: false }), sphere(0.345, C.yellow, { y: 0.34, sx: 0.35, sy: 1, sz: 1, segments: 8, rings: 8, flat: false }), sphere(0.345, C.blue, { y: 0.34, sx: 1, sy: 0.35, sz: 1, segments: 8, rings: 6, flat: false })], { value: 0.12 });
  const towel = (a, b) => [box(1.9, 0.05, 0.95, a, { y: 0.03 }), box(1.9, 0.055, 0.15, b, { y: 0.03, z: 0.25 }), box(1.9, 0.055, 0.15, b, { y: 0.03, z: -0.25 }), box(0.14, 0.055, 0.96, b, { y: 0.03, x: 0.8 })];
  add('towel', towel(C.blue, C.white2), { value: 0.08 });
  add('towelB', towel(C.orange, C.yellow), { value: 0.08 });
  add('towelC', towel(C.pinkb, C.white2), { value: 0.08 });
  const umb = (a, b) => [cyl(0.03, 0.03, 2.4, C.white2, { y: 1.2, rz: 0.12, segments: 6 }), cone(1.4, 0.55, a, { x: -0.14, y: 2.35, segments: 8, flat: false, rz: 0.12 }), cone(0.7, 0.3, b, { x: -0.14, y: 2.47, segments: 8, flat: false, rz: 0.12 }), sphere(0.06, C.white2, { x: -0.2, y: 2.72, segments: 6, rings: 4 })];
  add('beachUmbrella', umb(C.red, C.white2), { value: 0.5 });
  add('beachUmbrellaB', umb(C.teal, C.yellow), { value: 0.5 });
  add('beachUmbrellaC', umb(C.orange, C.white2), { value: 0.5 });
  add('sandcastle', [cyl(1.0, 1.15, 0.5, C.sandy, { y: 0.25, segments: 12, flat: false }), ...[[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]].map(([x, z]) => cyl(0.25, 0.3, 0.8, C.sandy, { x, y: 0.7, z, segments: 8, flat: false })),
    cone(0.3, 0.4, C.sandy, { y: 1.1, segments: 8, flat: false }), cyl(0.015, 0.015, 0.6, C.iron, { y: 1.5, segments: 5 }), box(0.3, 0.2, 0.02, C.red, { x: 0.15, y: 1.7 })], { value: 0.3 });
  add('cooler', [rbox(0.9, 0.6, 0.55, C.red, { y: 0.32, bevel: 0.07, segments: 1 }), rbox(0.94, 0.14, 0.58, C.white2, { y: 0.66, bevel: 0.05, segments: 1 })], { value: 0.2 });
  add('seagull', gull(), { move: WALK(2.0, 8), value: 0.15 });
  add('pelican', gull(true), { move: WALK(1.4, 8), value: 0.35 });
  add('volleyballNet', [cyl(0.07, 0.07, 2.6, C.white2, { x: -3.2, y: 1.3, segments: 6 }), cyl(0.07, 0.07, 2.6, C.white2, { x: 3.2, y: 1.3, segments: 6 }), box(6.4, 0.8, 0.03, '#e8e8e8', { y: 2.0 }), box(6.4, 0.07, 0.08, C.red, { y: 2.42 }), box(6.4, 0.06, 0.06, C.white2, { y: 1.6 })], { value: 0.9 });
  add('lifeguardTower', [box(0.15, 2.2, 0.15, C.white2, { x: 0.9, y: 1.1, z: 0.9 }), box(0.15, 2.2, 0.15, C.white2, { x: -0.9, y: 1.1, z: 0.9 }), box(0.15, 2.2, 0.15, C.white2, { x: 0.9, y: 1.1, z: -0.9 }), box(0.15, 2.2, 0.15, C.white2, { x: -0.9, y: 1.1, z: -0.9 }),
    rbox(2.6, 0.2, 2.6, C.lwood, { y: 2.2, bevel: 0.05, segments: 1 }), rbox(2.2, 1.6, 2.2, C.red, { y: 3.1, bevel: 0.1, segments: 1 }), box(1.4, 0.6, 0.06, C.glass2, { y: 3.3, z: 1.12 }), box(3.0, 0.14, 3.0, C.white2, { y: 4.0 }),
    box(0.06, 1.9, 0.3, C.lwood, { x: 0, y: 1.1, z: 1.5, rx: 0.5 }), box(0.9, 0.3, 0.06, C.white2, { y: 2.85, z: -1.12 })], { value: 1.6 });

  // ---------- people
  add('tourist', person('#f27a3b', '#e8dcc0', C.skin, '#5a3a22', { hat: '#f3e2a8', bag: C.blue }), { move: WALK(1.3, 9), value: 0.3 });
  add('touristB', person('#2aa8a0', '#3a4a6a', C.skin2, '#141414', { sleeve: C.skin2, shoe: C.brown }), { move: WALK(1.3, 9), value: 0.3 });
  add('local', person('#d63a5a', '#2f4d7a', C.skin, '#c9973a', { shoe: C.iron }), { move: WALK(1.4, 9), value: 0.3 });
  add('localB', person('#f4f0e2', '#2b2b30', C.skin3, '#111111', { bag: C.dwood }), { move: WALK(1.4, 9), value: 0.3 });
  add('beachgoer', person('#f6c445', '#e8523c', C.skin, '#8a5a2a', { sleeve: C.skin, shoe: C.skin }), { move: WALK(1.1, 7), value: 0.3 });
  add('beachgoerB', person('#3aa0d8', '#f2f2f2', C.skin2, '#2a1a10', { sleeve: C.skin2, shoe: C.skin2 }), { move: WALK(1.1, 7), value: 0.3 });
  add('surfer', person('#1e2a3a', '#1e2a3a', C.skin, '#e8c46a', { sleeve: '#1e2a3a', shoe: '#1e2a3a', board: '#fff6d8' }), { move: WALK(1.2, 7), value: 0.45 });
  add('jogger', person('#7be0a0', '#3a3a44', C.skin2, '#222222', { sleeve: C.skin2 }), { move: WALK(2.4, 14), value: 0.3 });
  add('kid', person('#f4d13a', '#4a78c8', C.skin, '#7a4a22', { kid: true }), { move: WALK(1.6, 6), value: 0.2 });
  add('dog', dogModel('#c8964e', '#8a5a2a'), { move: WALK(1.8, 8), value: 0.25 });
  add('dogB', dogModel('#3a3430', '#231f1d'), { move: WALK(1.8, 8), value: 0.25 });

  // ---------- trees
  add('palmQueen', palm(9.5, 1.6, 9, 3.6, { tr: 0.22, boots: true }), { value: 1.4, radius: 2.4 });
  add('palmQueenB', palm(11.5, -2.2, 9, 3.8, { tr: 0.24, boots: true }), { value: 1.7, radius: 2.5 });
  add('palmMed', palm(6.5, 1.0, 8, 3.0, { tr: 0.2 }), { value: 0.9, radius: 2.0 });
  add('palmFan', fanPalm(5.5), { value: 1.0 });
  add('palmSmall', palm(3.0, 0.5, 7, 1.8, { tr: 0.13 }), { value: 0.4, radius: 1.3 });
  add('oak', oakTree(1), { value: 2.2 });
  add('oakSmall', oakTree(0.7), { value: 0.9 });
  add('figTree', figTree(), { value: 22, radius: 7 });

  // ---------- vehicles (length along X, front +X)
  const sedans = { sedanWhite: '#f2f2f0', sedanSilver: '#b9bec6', sedanRed: '#c02a2a', sedanBlue: '#2c5aa0', sedanBlack: '#26262a', sedanTeal: '#2a8f8a' };
  for (const [n, c] of Object.entries(sedans)) add(n, carBody({ body: c }), { value: 1 });
  const suvs = { suvSilver: '#aeb4bc', suvWhite: '#efeeea', suvGreen: '#3d6e4d', suvBlack: '#232326', suvRed: '#a8322c' };
  for (const [n, c] of Object.entries(suvs)) add(n, suvModel(c), { value: 1.3 });
  add('pickupWhite', pickupModel('#f0efe8'), { value: 1.4 });
  add('pickupBlue', pickupModel('#2d5f9a'), { value: 1.4 });
  add('convertible', [...carBody({ body: '#e8b830', cab: 0.28, cabLen: 0.38, cabX: 0.4, roofCol: '#e8b830' })], { value: 1.1 });
  add('woodie', [...carBody({ body: '#d8c8a0', len: 4.8, hh: 0.8, cab: 0.55, cabLen: 0.6, cabX: -0.4, roofCol: '#a8794a' }), box(3.4, 0.5, 0.06, C.lwood, { x: -0.3, y: 0.85, z: 0.95 }), box(3.4, 0.5, 0.06, C.lwood, { x: -0.3, y: 0.85, z: -0.95 })], { value: 1.3 });
  add('vwBus', [rbox(4.3, 1.9, 1.8, '#f5efe0', { y: 1.25, bevel: 0.3, segments: 1 }), rbox(4.34, 0.9, 1.84, '#4ba3a6', { y: 0.7, bevel: 0.2, segments: 1 }), box(3.6, 0.6, 1.86, C.glass, { x: -0.1, y: 1.65 }),
    box(0.1, 0.5, 1.1, C.glass, { x: 2.16, y: 1.5 }), box(0.06, 0.22, 0.26, '#fff2b0', { x: 2.14, y: 0.85, z: 0.6 }), box(0.06, 0.22, 0.26, '#fff2b0', { x: 2.14, y: 0.85, z: -0.6 }),
    rbox(4.1, 0.14, 1.7, '#e6dcc4', { y: 2.22, bevel: 0.05, segments: 1 }), box(0.3, 0.16, 1.9, C.silver, { x: 2.15, y: 0.4 }), box(0.3, 0.16, 1.9, C.silver, { x: -2.15, y: 0.4 }),
    ...wheel(1.3, 0.4, 0.85, 0.4), ...wheel(1.3, 0.4, -0.85, 0.4), ...wheel(-1.3, 0.4, 0.85, 0.4), ...wheel(-1.3, 0.4, -0.85, 0.4), box(0.16, 0.8, 1.0, '#e6dcc4', { x: -2.16, y: 1.2 })], { value: 1.6 });
  add('mtdBus', [rbox(9.5, 2.5, 2.6, '#f4f6f4', { y: 1.85, bevel: 0.35, segments: 1 }), box(9.52, 0.5, 2.62, C.teal, { y: 0.95 }), box(9.52, 0.32, 2.62, C.navy, { y: 2.3 }),
    box(7.8, 0.85, 2.64, C.glass, { x: -0.5, y: 2.55 }), box(0.1, 1.2, 2.2, C.glass, { x: 4.78, y: 2.2 }), box(0.1, 0.3, 1.6, C.yellow, { x: 4.78, y: 2.95 }),
    box(1.0, 1.6, 0.06, C.glass2, { x: 3.0, y: 1.5, z: 1.32 }), box(1.0, 1.6, 0.06, C.glass2, { x: -1.0, y: 1.5, z: 1.32 }), box(0.08, 0.2, 0.4, '#fff2b0', { x: 4.78, y: 0.85, z: 0.9 }), box(0.08, 0.2, 0.4, '#fff2b0', { x: 4.78, y: 0.85, z: -0.9 }),
    box(3.0, 0.3, 1.6, '#d8dcd8', { x: -1, y: 3.25 }), rbox(9.3, 0.1, 2.5, '#e8ece8', { y: 3.1, bevel: 0.04, segments: 1 }),
    ...[3.4, -3.2].flatMap((x) => [...wheel(x, 0.55, 1.2, 0.55, 0.45), ...wheel(x, 0.55, -1.2, 0.55, 0.45)])], { value: 3.2 });
  add('semi', [rbox(2.4, 2.5, 2.4, '#d8d8d4', { x: 6.2, y: 1.9, bevel: 0.25, segments: 1 }), box(0.1, 1.0, 2.2, C.glass, { x: 7.4, y: 2.5 }), rbox(2.2, 0.9, 2.42, C.red, { x: 6.2, y: 0.8, bevel: 0.15, segments: 1 }),
    rbox(10.5, 3.0, 2.5, '#eeeeea', { x: -1.2, y: 2.3, bevel: 0.15, segments: 1 }), box(10.52, 0.6, 2.52, C.navy, { x: -1.2, y: 1.2 }), cyl(0.06, 0.06, 1.8, C.silver, { x: 5.2, y: 3.4, segments: 6 }),
    ...[5.6, -0.5, -2.4, -5.2].flatMap((x, i) => [...wheel(x + (i ? 0 : 1), 0.55, 1.12, 0.55, 0.42), ...wheel(x + (i ? 0 : 1), 0.55, -1.12, 0.55, 0.42)])], { value: 5 });
  buildBuildings(add);
  buildLandmarks(add);
  return P;
}

// ------------------------------------------------------------------ buildings
const wharfShack = (w, d, wallCol, roofCol, sign, o = {}) => {
  const H = o.h ?? 3.4;
  const p = [rbox(w, H, d, wallCol, { y: H / 2 + 0.3, bevel: 0.14, segments: 1 }), box(w + 0.2, 0.3, d + 0.2, C.dwood, { y: 0.15 })];
  for (let i = 0; i < Math.round(w / 0.55); i++) p.push(box(0.05, H - 0.3, 0.05, C.trim, { x: -w / 2 + 0.3 + i * 0.55, y: H / 2 + 0.3, z: d / 2 + 0.03 }));
  p.push(...gable(w, d, H + 0.3, 0.35, roofCol, wallCol));
  p.push(...wnd(0, -w * 0.25, 1.4, d / 2, 1.3, 1.1, { frame: C.trim, mull: true }), ...door(0, w * 0.27, d / 2, 1.0, 2.2, C.dwood));
  p.push(...wnd(1, 0, 1.4, w / 2, 1.2, 1.0), ...wnd(3, 0, 1.4, w / 2, 1.2, 1.0));
  p.push(box(w * 0.7, 0.9, 0.16, sign, { y: H + 0.05 + 0.3, z: d / 2 + 0.2 }), box(w * 0.6, 0.55, 0.18, C.trim, { y: H + 0.35, z: d / 2 + 0.22 }));
  p.push(box(w * 0.7, 0.1, 1.2, C.trim, { y: 2.7, z: d / 2 + 0.6, rx: 0 }), ...[-1, 1].map((s) => cyl(0.05, 0.05, 2.4, C.trim, { x: s * w * 0.32, y: 1.5, z: d / 2 + 1.1, segments: 6 })));
  if (o.barrels) p.push(cyl(0.4, 0.4, 0.9, C.dwood, { x: w / 2 - 0.5, y: 0.75, z: d / 2 + 0.8, segments: 10, flat: false }), cyl(0.4, 0.4, 0.9, '#6a4a2c', { x: w / 2 - 1.4, y: 0.75, z: d / 2 + 0.7, segments: 10, flat: false }));
  return p;
};
const sailboat = (len, mastH, hullCol, sailCol, stripe) => {
  const L = len / 2;
  const hull = [[-L, 1.1], [L * 0.8, 1.2], [L, 1.0], [L * 0.6, 0.35], [L * 0.1, 0.0], [-L * 0.7, 0.0], [-L, 0.6]];
  const p = [extrude(hull, len * 0.34, hullCol, { bevel: 0.12, ry: 0 }), extrude([[-L * 0.95, 1.1], [L * 0.95, 1.1], [L * 0.6, 0.9], [-L * 0.8, 0.9]], len * 0.3, C.lwood, { y: 0.18 }),
    box(len * 0.95, 0.2, 0.05, stripe, { y: 0.95, z: len * 0.17 + 0.16 }), box(len * 0.95, 0.2, 0.05, stripe, { y: 0.95, z: -len * 0.17 - 0.16 }),
    rbox(len * 0.28, 0.7, len * 0.2, C.trim, { x: -L * 0.2, y: 1.7, bevel: 0.1, segments: 1 }), box(len * 0.22, 0.25, len * 0.21, C.glass, { x: -L * 0.2, y: 1.8 }),
    cyl(0.07, 0.09, mastH, C.silver, { x: L * 0.15, y: mastH / 2 + 1.1, segments: 6 }), cyl(0.05, 0.05, len * 0.42, C.silver, { x: -L * 0.15, y: 2.2, rz: PI / 2, segments: 5 })];
  p.push(extrude([[0, 0], [len * 0.4, 0], [0, mastH * 0.88]], 0.05, sailCol, { x: L * 0.15 - len * 0.4 - 0.1, y: 2.3, z: 0.05 }));
  p.push(extrude([[0, 0], [len * 0.36, 0], [len * 0.36, 0]].slice(0, 2).concat([[0, mastH * 0.8]]), 0.05, C.trim, { x: L * 0.15 + 0.1, y: 2.0, z: -0.05 }));
  p.push(extrude([[0, 0], [L * 0.75, mastH * 0.05], [0, mastH * 0.8]], 0.05, sailCol === C.white2 ? '#f2d8a8' : C.white2, { x: L * 0.15 + 0.15, y: 2.0, z: -0.05 }));
  return p;
};

function buildBuildings(add) {
  const sh = [C.teal, C.blue, C.dgreen, C.dwood];
  add('shopArcade', colonial({ w: 11, d: 9, floors: 2, arcade: true, bays: 3, balc: true, wall: C.stucco, shut: C.dwood }), { value: 4.5 });
  add('shopArcadeB', colonial({ w: 12, d: 9, floors: 2, arcade: true, bays: 3, balc: true, wall: C.peach, shut: C.teal }), { value: 5 });
  add('shopTiled', colonial({ w: 9, d: 8, floors: 2, balc: true, wall: C.pink, shut: sh[0], awn: [C.terra, C.trim] }), { value: 3.6 });
  add('shopTiledB', colonial({ w: 10, d: 8, floors: 2, balc: true, wall: C.cream, shut: sh[1], awn: [C.navy, C.trim] }), { value: 3.8 });
  add('shopLow', colonial({ w: 10, d: 7, floors: 1, wall: C.cream, tower: true, awn: [C.blue, C.trim] }), { value: 2.8 });
  add('shopLowB', colonial({ w: 9, d: 7, floors: 1, wall: C.yellow, awn: [C.red, C.trim], shut: C.dgreen }), { value: 2.2 });
  add('cafeShop', colonial({ w: 8, d: 6, floors: 1, wall: C.stucco, awn: [C.red, C.trim], shut: C.dgreen, chimney: false }), { value: 1.8 });
  add('inn', colonial({ w: 14, d: 10, floors: 3, arcade: true, bays: 4, balc: true, wall: C.white, shut: C.dgreen }), { value: 9 });
  add('hotelTower', colonial({ w: 10, d: 9, floors: 4, fh: 3.2, balc: true, wall: C.stucco, tower: true, shut: C.terra }), { value: 8 });
  add('casita', colonial({ w: 7, d: 6, floors: 1, wall: C.stucco, shut: C.blue, pitch: 0.46 }), { value: 1.5 });
  add('casitaB', colonial({ w: 7.5, d: 6.5, floors: 1, wall: C.peach, shut: C.dgreen, pitch: 0.44 }), { value: 1.7 });
  add('casitaC', colonial({ w: 6.5, d: 6, floors: 1, wall: C.adobe, shut: C.teal, pitch: 0.48 }), { value: 1.4 });
  add('hacienda', colonial({ w: 12, d: 8, floors: 1, arcade: true, bays: 3, wall: C.cream, shut: C.dwood, fh: 3.6 }), { value: 4.2 });
  add('bungalow', colonial({ w: 8.5, d: 6.5, floors: 1, wall: C.sand, shut: C.terra, pitch: 0.4 }), { value: 2 });
  add('aptSpanish', colonial({ w: 12, d: 10, floors: 3, balc: true, wall: C.pink, shut: C.dgreen, fh: 3.2 }), { value: 6 });
  add('aptSpanishB', colonial({ w: 11, d: 9, floors: 3, balc: true, wall: C.stucco, shut: C.blue, fh: 3.2 }), { value: 5.5 });
  add('officeBlock', colonial({ w: 13, d: 10, floors: 2, arcade: true, bays: 4, flatRoof: true, wall: C.sand, fh: 3.6 }), { value: 5 });
  add('garage', [rbox(5, 3, 5.5, C.stucco, { y: 1.6, bevel: 0.15, segments: 1 }), ...gable(5, 5.5, 3.1, 0.4, C.tile, C.stucco), box(3.2, 2.4, 0.1, C.dwood, { y: 1.3, z: 2.78 }), ...wnd(1, 0, 1.2, 2.5, 0.9, 0.9)], { value: 0.9 });

  // Funk Zone
  const funk = (w, d, col, door1, door2, roof) => {
    const H = 4.2;
    const p = [rbox(w, H, d, col, { y: H / 2, bevel: 0.14, segments: 1 }), box(w + 0.3, 0.3, d + 0.3, C.dconcrete, { y: 0.15 })];
    for (let i = 0; i < Math.round(w / 0.7); i++) p.push(box(0.1, H - 0.4, 0.05, col, { x: -w / 2 + 0.4 + i * 0.7, y: H / 2, z: d / 2 + 0.03 }));
    p.push(box(w * 0.42, 3.0, 0.14, door1, { x: -w * 0.24, y: 1.6, z: d / 2 + 0.05 }), box(w * 0.28, 3.0, 0.14, door2, { x: w * 0.28, y: 1.6, z: d / 2 + 0.05 }));
    for (let i = 0; i < 5; i++) p.push(box(w * 0.42, 0.04, 0.05, C.iron, { x: -w * 0.24, y: 0.7 + i * 0.55, z: d / 2 + 0.14 }));
    p.push(tilePanel(w + 1, d * 0.56, roof, { y: H + 0.85, z: d * 0.27, rx: 0.16, h: 0.16, pitch: 0.55 }), tilePanel(w + 1, d * 0.56, roof, { y: H + 0.85, z: -d * 0.27, rx: -0.16, h: 0.16, pitch: 0.55 }));
    p.push(extrude([[-d / 2, 0], [d / 2, 0], [0, 0.6]], w - 0.2, col, { y: H, ry: PI / 2 }));
    p.push(box(w * 0.8, 0.9, 0.12, C.iron, { y: H + 0.05, z: d / 2 + 0.2 }), box(w * 0.74, 0.65, 0.14, door2, { y: H + 0.05, z: d / 2 + 0.22 }));
    p.push(...wnd(1, 0, 1.6, w / 2, 1.4, 1.2, { glass: C.glass2 }), ...wnd(3, 0, 1.6, w / 2, 1.4, 1.2, { glass: C.glass2 }));
    return p;
  };
  add('funkWarehouse', funk(11, 9, '#7ea3b8', C.orange, C.teal, '#93a4ae'), { value: 3.4 });
  add('funkWarehouseB', funk(10, 8, '#d9a35b', C.blue, C.red, '#8e9aa2'), { value: 3 });
  add('wineBar', colonial({ w: 8, d: 7, floors: 1, wall: C.terra, awn: [C.navy, C.trim], shut: C.trim, chimney: false }), { value: 2.2 });
  add('wineBarB', colonial({ w: 9, d: 7, floors: 1, wall: '#c9a55c', awn: [C.dgreen, C.trim], shut: C.dwood }), { value: 2.4 });

  // Stearns Wharf
  add('wharfShop', wharfShack(7, 5, '#efe6cf', C.blue, C.red, { barrels: true }), { value: 2.4 });
  add('wharfShopB', wharfShack(6, 5, '#d5e8ec', C.terra, C.teal), { value: 2.2 });
  add('seafoodShack', wharfShack(7.5, 5.5, '#f4d9a8', C.navy, C.orange, { barrels: true }), { value: 2.6 });
  add('wharfRestaurant', [...wharfShack(10, 7, '#f2eee2', C.blue, C.navy, { h: 4.2 }), ...[-1, 1].map((s) => box(0.14, 3.6, 0.14, C.trim, { x: s * 4.6, y: 1.8, z: 3.9 })), box(10.4, 0.3, 1.6, C.blue, { y: 3.2, z: 4.3 })], { value: 5.5 });
  add('wharfSign', [box(0.3, 4.4, 0.3, C.dwood, { x: -2.4, y: 2.2 }), box(0.3, 4.4, 0.3, C.dwood, { x: 2.4, y: 2.2 }), rbox(5.6, 1.6, 0.3, C.trim, { y: 4.6, bevel: 0.08, segments: 1 }), box(5.0, 0.5, 0.34, C.blue, { y: 4.85 }), box(3.6, 0.4, 0.34, C.red, { y: 4.35 }), box(5.8, 0.15, 0.5, C.dwood, { y: 5.5 })], { value: 1.6 });
  add('crateStack', [box(0.9, 0.7, 0.9, C.lwood, { y: 0.35 }), box(0.8, 0.6, 0.8, C.plank, { x: 0.1, y: 1.0, ry: 0.4 }), box(0.7, 0.5, 0.7, C.lwood, { x: 1.0, y: 0.25, z: 0.2, ry: 0.2 })], { value: 0.3 });
  add('crabTrap', [box(1.0, 0.5, 0.7, C.iron, { y: 0.3 }), box(1.02, 0.06, 0.72, C.dwood, { y: 0.56 }), torus(0.28, 0.03, C.red, { x: 0.7, y: 0.25, radial: 4, segments: 10 })], { value: 0.2 });

  // Harbor
  add('sailboat', sailboat(8, 9, '#f4f4f0', C.white2, C.navy), { value: 4 });
  add('sailboatB', sailboat(7, 8, C.navy, '#f2d8a8', C.red), { value: 3.4 });
  add('sailboatC', sailboat(6, 7, C.teal, C.white2, C.white2), { value: 3 });
  add('motorBoat', [extrude([[-2.4, 0.9], [2.6, 0.9], [3.0, 0.7], [1.5, 0.05], [-2.2, 0.05]], 1.9, C.white2, { bevel: 0.1 }), box(3.2, 0.14, 1.6, C.lwood, { x: -0.3, y: 0.95 }),
    rbox(1.6, 0.9, 1.4, C.trim, { x: -0.4, y: 1.5, bevel: 0.1, segments: 1 }), box(1.3, 0.45, 1.42, C.glass, { x: -0.3, y: 1.6 }), box(4.6, 0.2, 0.05, C.navy, { y: 0.55, z: 0.98 }), box(4.6, 0.2, 0.05, C.navy, { y: 0.55, z: -0.98 }),
    cyl(0.05, 0.05, 1.6, C.silver, { x: -0.4, y: 2.6, segments: 5 })], { value: 2.4 });
  add('dinghy', [extrude([[-1.2, 0.5], [1.3, 0.55], [0.9, 0.05], [-0.9, 0.05]], 1.1, C.orange, { bevel: 0.08 }), box(1.0, 0.08, 0.9, C.lwood, { y: 0.4 }), cyl(0.03, 0.03, 1.4, C.lwood, { x: 0.2, y: 0.55, z: 0.6, rx: 0.5, segments: 5 })], { value: 0.8 });
}

// ------------------------------------------------------------------ landmarks
const dome = (r, h, col, o = {}) => lathe([[0.001, 0], [r, 0], [r * 1.05, h * 0.12], [r * 0.95, h * 0.4], [r * 0.7, h * 0.7], [r * 0.36, h * 0.92], [0.001, h]], col, { segments: 18, ...o });
const bell = (x, y, z, s = 1) => [
  lathe([[0.001, 0], [0.42, 0], [0.34, 0.3], [0.2, 0.65], [0.08, 0.85], [0.001, 0.9]], C.gold, { x, y, z, segments: 12, sx: s, sy: s, sz: s }),
  box(1.3 * s, 0.14, 0.14, C.dwood, { x, y: y + 0.95 * s, z }),
];
/** Open belfry (four arched faces around a bell): size sz square, height h, base at y=0 (returns parts). */
const belfry = (sz, h, col, roofCol = col) => {
  const pier = sz * 0.24, bw = sz - 2 * pier, yS = h - bw / 2 - 0.55;
  const { pts } = arcadePts(1, bw, pier, h, yS, 7);
  const p = [box(sz, 0.4, sz, col, { y: 0.2 }), box(sz + 0.5, 0.5, sz + 0.5, roofCol, { y: h + 0.25 })];
  for (let f = 0; f < 4; f++) { const q = FACE[f](0, sz / 2 - 0.45); p.push(extrude(pts, 0.9, col, { x: q.x, y: 0.2, z: q.z, ry: q.ry })); }
  p.push(...bell(0, 0.9, 0, 1.2));
  return p;
};
const simpleCar = (x, z, ry, col, y0) => [
  rbox(3.8, 0.7, 1.7, col, { x, y: y0 + 0.65, z, ry, bevel: 0.2, segments: 1 }), rbox(2.0, 0.55, 1.5, col, { x: x - Math.cos(ry) * 0.2, y: y0 + 1.2, z: z + Math.sin(ry) * 0.2, ry, bevel: 0.15, segments: 1 }),
  box(1.9, 0.36, 1.54, C.glass, { x: x - Math.cos(ry) * 0.2, y: y0 + 1.22, z: z + Math.sin(ry) * 0.2, ry }),
];

function missionChurch() {
  const st = C.mission, sd = C.missiond;
  const p = [rbox(14, 12, 20, st, { y: 6, z: -5, bevel: 0.2, segments: 1 }), ...xf(gable(20, 14, 12.1, 0.42, C.tile, st, 0.6), { ry: PI / 2, z: -5 })];
  // facade slab + stepped gable
  p.push(rbox(14.4, 13.5, 1.8, st, { y: 6.75, z: 5, bevel: 0.15, segments: 1 }), extrude([[-7.2, 0], [7.2, 0], [7.2, 0.6], [3.4, 1.2], [3.4, 2.4], [0, 3.8]], 1.8, st, { y: 13.5, z: 5 }));
  p.push(box(14.8, 0.4, 2.1, sd, { y: 13.4, z: 5 }), box(0.14, 1.8, 0.14, C.gold, { y: 18.6, z: 5 }), box(0.9, 0.14, 0.14, C.gold, { y: 18.2, z: 5 }));
  // portico: steps, six columns, entablature, pediment
  p.push(box(13.6, 0.25, 4.4, sd, { y: 0.125, z: 8.1 }), box(13.0, 0.25, 3.8, sd, { y: 0.375, z: 8.0 }), box(12.6, 0.2, 3.3, st, { y: 0.6, z: 7.6 }));
  for (let i = 0; i < 6; i++) {
    const x = -4.5 + i * 1.8;
    p.push(cyl(0.48, 0.55, 7.4, st, { x, y: 4.5, z: 7.7, segments: 12, flat: false }), box(1.3, 0.3, 1.3, sd, { x, y: 8.3, z: 7.7 }), box(1.2, 0.3, 1.2, sd, { x, y: 0.85, z: 7.7 }),
      torus(0.5, 0.09, sd, { x, y: 7.9, z: 7.7, rx: PI / 2, radial: 4, segments: 10 }));
  }
  p.push(box(12.8, 1.2, 3.0, sd, { y: 8.95, z: 7.1 }), extrude([[-6.5, 0], [6.5, 0], [0, 3.0]], 3.0, st, { y: 9.55, z: 7.1 }), extrude([[-5.4, 0.05], [5.4, 0.05], [0, 2.4]], 0.2, sd, { y: 9.7, z: 8.65 }));
  p.push(cyl(0.9, 0.9, 0.1, C.glass2, { y: 10.6, z: 8.65, rx: PI / 2, segments: 16, flat: false }), torus(0.95, 0.09, sd, { y: 10.6, z: 8.62, radial: 4, segments: 16 }));
  p.push(...door(0, 0, 6.0, 2.1, 4.6, C.dwood, sd), ...door(0, -3.6, 6.0, 1.4, 3.6, C.dwood, sd), ...door(0, 3.6, 6.0, 1.4, 3.6, C.dwood, sd));
  // nave windows + buttresses
  for (const f of [1, 3]) for (const u of [2, 8, 14]) p.push(...wnd(f, u * (f === 1 ? 1 : -1), 4.2, 7.0, 1.1, 3.6, { arch: true, frame: sd }));
  for (const s of [-1, 1]) for (const z of [-1.5, -5, -8.5, -12]) p.push(box(0.7, 9, 0.9, sd, { x: s * 7.3, y: 4.5, z }));
  // towers
  for (const s of [-1, 1]) {
    const t = [rbox(5.2, 13.6, 5.8, st, { y: 6.8, bevel: 0.15, segments: 1 }), box(5.6, 0.4, 6.2, sd, { y: 13.7 })];
    t.push(...wnd(0, 0, 3.2, 2.9, 1.0, 2.6, { arch: true, frame: sd, mull: false }), ...wnd(0, 0, 8.0, 2.9, 0.9, 1.9, { arch: true, frame: sd, mull: false }), ...wnd(0, 0, 11.2, 2.9, 0.8, 1.4, { arch: true, frame: sd, mull: false }));
    t.push(...wnd(s > 0 ? 1 : 3, 0, 5.5, 2.6, 0.9, 2.2, { arch: true, frame: sd, mull: false }), ...wnd(s > 0 ? 1 : 3, 0, 9.6, 2.6, 0.9, 1.8, { arch: true, frame: sd, mull: false }));
    t.push(...xf(belfry(4.9, 4.4, st, sd), { y: 13.9 }));
    t.push(dome(2.8, 3.6, '#b9503a', { y: 19.05 }), cyl(0.42, 0.42, 0.9, st, { y: 22.4, segments: 10, flat: false }), dome(0.5, 0.7, '#b9503a', { y: 23.3 }), box(0.12, 1.1, 0.12, C.gold, { y: 24.4 }), box(0.55, 0.12, 0.12, C.gold, { y: 24.3 }));
    p.push(...xf(t, { x: s * 9.55, z: 3.2 }));
  }
  return p;
}

function missionWing() {
  const st = C.mission, sd = C.missiond;
  const bays = 6, bw = 2.5, pier = 1.15, { pts, L } = arcadePts(bays, bw, pier, 5.4, 5.4 - bw / 2 - 0.5, 6);
  const p = [rbox(L, 6.4, 7.2, st, { y: 3.2, z: -0.8, bevel: 0.18, segments: 1 }), box(L + 0.3, 0.4, 8.2, sd, { y: 0.2, z: -0.3 })];
  p.push(box(L - 0.4, 5.2, 0.14, '#4a3226', { y: 3.1, z: 2.85 }), extrude(pts, 1.2, st, { y: 0.2, z: 3.3 }), box(L + 0.3, 0.5, 1.8, sd, { y: 5.85, z: 3.3 }));
  for (let i = 0; i < bays; i++) {
    const u = -L / 2 + pier + bw / 2 + i * (bw + pier);
    p.push(...door(0, u, 2.9, 1.2, 3.0, C.dwood, sd), ...wnd(2, u, 2.6, 3.4, 1.0, 1.8, { arch: true, frame: sd }));
  }
  p.push(...gable(L, 10.2, 6.4, 0.36, C.tile, st, 0.5).map((g) => (g.translate(0, 0, 0.4), g)));
  for (const s of [-1, 1]) p.push(...wnd(s > 0 ? 1 : 3, 0, 2.6, L / 2, 1.0, 2.2, { arch: true, frame: sd }));
  // espadana (bell gable) on the roof
  p.push(extrude([[-1.6, 0], [1.6, 0], [1.6, 2.2], [0.9, 2.6], [0.9, 3.8], [0, 4.6], [-0.9, 3.8], [-0.9, 2.6], [-1.6, 2.2]], 0.9, st, { x: L * 0.3, y: 8.2, z: -0.5 }), ...bell(L * 0.3, 9.0, -0.5, 0.8));
  return p;
}

function missionFountain() {
  return [
    lathe([[0.001, 0], [3.1, 0], [3.35, 0.35], [3.35, 1.0], [3.0, 1.05], [2.9, 0.65], [0.001, 0.65]], C.mission, { segments: 24 }),
    cyl(2.85, 2.85, 0.05, C.water, { y: 0.68, segments: 24, flat: false }),
    lathe([[0.001, 0.6], [0.6, 0.6], [0.4, 1.0], [0.28, 1.7], [0.7, 2.0], [1.3, 2.2], [1.4, 2.4], [1.1, 2.4], [0.95, 2.28], [0.001, 2.28]], C.mission, { segments: 20 }),
    lathe([[0.001, 2.2], [0.3, 2.3], [0.2, 3.0], [0.55, 3.25], [0.4, 3.4], [0.001, 3.4]], C.mission, { segments: 14 }),
    cone(0.16, 1.2, '#cfe9f5', { y: 4.0, segments: 8, flat: false }), cyl(1.05, 1.05, 0.05, C.water, { y: 2.42, segments: 16, flat: false }),
  ];
}

function courthouse() {
  const wh = '#f7f1e3', tr = C.trim, dk = '#4a3528';
  const p = [];
  // rear range with the Anacapa arch
  p.push(rbox(26, 9, 8.2, wh, { y: 4.5, z: -7, bevel: 0.2, segments: 1 }));
  const { pts } = arcadePts(1, 6.4, 9.8, 9.0, 4.6, 9);
  p.push(extrude(pts, 1.3, wh, { z: -2.2 }), box(6.6, 7.9, 0.2, dk, { y: 3.95, z: -3.2 }), extrude(ringPts(3.75, 3.2, 12), 0.5, tr, { y: 4.6, z: -1.6 }));
  p.push(...door(0, 0, -3.1, 2.4, 3.4, C.dwood, tr));
  for (const s of [-1, 1]) for (const u of [5.6, 9.6]) {
    p.push(...wnd(0, s * u, 1.3, -1.55, 1.3, 2.7, { arch: true, frame: tr }), ...wnd(0, s * u, 5.3, -1.55, 1.2, 2.4, { arch: true, frame: tr }));
  }
  p.push(box(26.6, 0.4, 1.9, tr, { y: 9.15, z: -2.3 }), box(26.6, 0.35, 1.6, tr, { y: 4.4 + 0.0, z: -2.25 }).translate(0, 0, 0));
  p.push(...gable(26.4, 9.6, 9.3, 0.36, C.tile, wh, 0.6).map((g) => g.translate(0, 0, -7)));
  // wings
  for (const s of [-1, 1]) {
    const w = [rbox(6, 7.6, 14.4, wh, { y: 3.8, bevel: 0.2, segments: 1 }), box(6.4, 0.35, 14.8, tr, { y: 7.55 })];
    w.push(...wnd(0, -1.4, 1.2, 7.2, 1.2, 2.6, { arch: true, frame: tr }), ...wnd(0, 1.4, 1.2, 7.2, 1.2, 2.6, { arch: true, frame: tr }), ...wnd(0, -1.4, 4.5, 7.2, 1.1, 2.3, { arch: true, frame: tr }), ...wnd(0, 1.4, 4.5, 7.2, 1.1, 2.3, { arch: true, frame: tr }));
    // outer face windows (facing away from courtyard)
    const outer = s > 0 ? 1 : 3;
    for (const u of [-4, 0, 4]) w.push(...wnd(outer, u, 1.3, 3.0, 1.2, 2.6, { arch: true, frame: tr }), ...wnd(outer, u, 4.6, 3.0, 1.1, 2.2, { arch: true, frame: tr }));
    // inner arcade facing the courtyard
    const { pts: ap } = arcadePts(3, 2.4, 1.0, 4.6, 2.5, 6);
    w.push(box(0.14, 4.2, 11.0, dk, { x: -s * 3.05, y: 2.4 }), extrude(ap, 0.9, wh, { x: -s * 3.35, y: 0.1, ry: -s * PI / 2 }), box(1.4, 0.3, 12.4, tr, { x: -s * 3.4, y: 4.75 }));
    w.push(...xf(gable(14.6, 6.6, 7.7, 0.4, C.tile, wh, 0.55), { ry: PI / 2 }));
    p.push(...xf(w, { x: s * 10, z: 4 }));
  }
  // El Mirador clock tower
  const T = [];
  T.push(rbox(7, 21, 7, wh, { y: 10.5, bevel: 0.2, segments: 1 }), box(7.5, 0.5, 7.5, tr, { y: 21.2 }), box(7.4, 0.4, 7.4, tr, { y: 9.9 }));
  for (let f = 0; f < 4; f++) {
    T.push(...wnd(f, 0, 12.6, 3.5, 1.3, 2.4, { arch: true, frame: tr }), ...wnd(f, 0, 5.0, 3.5, 1.1, 2.2, { arch: true, frame: tr }));
    const q = FACE[f](0, 3.6);
    const disc = cyl(1.3, 1.3, 0.16, '#fbf8ee', { segments: 20, flat: false, rx: PI / 2, ry: q.ry, x: q.x, y: 17.4, z: q.z });
    T.push(disc, torus(1.36, 0.1, C.dconcrete, { x: q.x, y: 17.4, z: q.z, ry: q.ry, radial: 4, segments: 20 }));
    const hand1 = FACE[f](0.32, 3.72), hand2 = FACE[f](-0.35, 3.72);
    T.push(box(0.1, 1.0, 0.06, C.iron, { x: hand1.x, y: 17.7, z: hand1.z, ry: hand1.ry, rz: 0.0 }), box(0.7, 0.09, 0.06, C.iron, { x: hand2.x, y: 17.4, z: hand2.z, ry: hand2.ry }));
  }
  T.push(...xf(belfry(6.6, 5.2, wh, tr), { y: 21.5 }));
  T.push(dome(3.9, 4.4, '#b9503a', { y: 27.2 }), cyl(0.6, 0.6, 1.2, wh, { y: 31.6, segments: 10, flat: false }), dome(0.75, 1.0, '#b9503a', { y: 32.8 }), box(0.12, 1.4, 0.12, C.gold, { y: 34.3 }));
  p.push(...xf(T, { z: -7 }));
  // garden gate posts / balustrade at the wings' fronts
  return p;
}

function bridge() {
  const con = C.concrete, dc = C.dconcrete;
  const p = [rbox(20, 1.4, 12, con, { y: 5.3, bevel: 0.15, segments: 1 }), box(20.2, 0.5, 12.2, '#9c998f', { y: 4.4 })];
  for (const s of [-1, 1]) {
    // ramps at both ends (solid embankments)
    p.push(extrude([[0, 0], [5, 0], [0, 6]], 12, con, { x: s > 0 ? 10 : -10, ry: 0, sx: s }));
    p.push(box(7.8, 0.08, 10.6, C.asphalt, { x: s * 12.5, y: 3.06, rz: s * -0.876 }));
    p.push(box(7.8, 0.6, 0.5, dc, { x: s * 12.5, y: 3.4, z: 5.75, rz: s * -0.876 }), box(7.8, 0.6, 0.5, dc, { x: s * 12.5, y: 3.4, z: -5.75, rz: s * -0.876 }));
  }
  p.push(box(20, 0.08, 10.6, C.asphalt, { y: 6.04 }));
  for (let x = -9; x <= 9; x += 3) p.push(box(1.6, 0.03, 0.14, C.yellow, { x, y: 6.1 }), box(1.6, 0.03, 0.12, C.white2, { x: x + 1.5, y: 6.1, z: 2.6 }), box(1.6, 0.03, 0.12, C.white2, { x: x + 1.5, y: 6.1, z: -2.6 }));
  p.push(box(20, 0.05, 0.16, C.white2, { y: 6.1, z: 5.0 }), box(20, 0.05, 0.16, C.white2, { y: 6.1, z: -5.0 }));
  // parapets with railings
  for (const z of [-5.75, 5.75]) {
    p.push(box(20, 0.9, 0.5, dc, { y: 6.5, z }), box(20.3, 0.16, 0.7, con, { y: 7.02, z }));
    for (let x = -9.5; x <= 9.5; x += 1.9) p.push(box(0.3, 1.3, 0.3, dc, { x, y: 7.7, z }));
    p.push(box(20, 0.1, 0.1, C.iron, { y: 8.3, z }), box(20, 0.08, 0.08, C.iron, { y: 7.6, z }));
  }
  // arched fascia + piers underneath
  const { pts } = arcadePts(3, 4.2, 1.0, 4.4, 2.0, 8);
  for (const z of [-5.4, 5.4]) p.push(extrude(pts, 0.9, con, { z }), extrude(pts.map(([x, y]) => [x, y]), 0.3, dc, { z: z + (z > 0 ? 0.55 : -0.55) }));
  for (const x of [-9.4, -4.2, 4.2, 9.4]) for (const z of [-5.2, 5.2]) p.push(cyl(0.6, 0.7, 4.4, con, { x, y: 2.2, z, segments: 12, flat: false }));
  // street lights
  for (const x of [-8, 8]) for (const z of [-5.75, 5.75]) p.push(cyl(0.08, 0.1, 2.4, C.iron, { x, y: 7.6 + 1.2, z, segments: 6 }), box(0.2, 0.12, 0.8, C.iron, { x, y: 10.1, z: z * 0.9 }));
  // static traffic on the deck
  p.push(...simpleCar(-6, 1.7, 0, '#c02a2a', 6.08), ...simpleCar(-1, 1.7, 0, '#2c5aa0', 6.08), ...simpleCar(5, 2.9, 0, '#f0efe8', 6.08), ...simpleCar(-4, -1.8, PI, '#26262a', 6.08), ...simpleCar(3, -2.9, PI, '#b9bec6', 6.08), ...simpleCar(8, -1.7, PI, '#2a8f8a', 6.08));
  p.push(rbox(6.4, 2.4, 2.3, '#eeeeea', { x: 7.5, y: 7.4, z: 2.6, bevel: 0.15, segments: 1 }), box(1.2, 1.0, 2.2, C.glass, { x: 10.6, y: 7.0, z: 2.6 }).translate(0, 0, 0));
  return p;
}

function chromaticGate() {
  const cols = ['#d8282f', '#f26a21', '#f7d02a', '#3aa845', '#2f80d8', '#3a4fb8', '#7a3fb0'];
  const legH = 3.2, bw = 0.78, ro0 = 6.5, p = [];
  cols.forEach((c, i) => {
    const ro = ro0 - i * bw, ri = ro - bw, n = 14;
    const pts = [[ro, 0], [ro, legH]];
    for (let k = 1; k < n; k++) { const a = (k / n) * PI; pts.push([ro * Math.cos(a), legH + ro * Math.sin(a)]); }
    pts.push([-ro, legH], [-ro, 0], [-ri, 0], [-ri, legH]);
    for (let k = n - 1; k >= 1; k--) { const a = (k / n) * PI; pts.push([ri * Math.cos(a), legH + ri * Math.sin(a)]); }
    pts.push([ri, legH], [ri, 0]);
    p.push(extrude(pts, 1.5, c, { y: 0.35 }));
  });
  for (const s of [-1, 1]) p.push(box(bw * 7 + 1, 0.35, 2.2, C.dconcrete, { x: s * (ro0 - bw * 3.5), y: 0.175 }));
  return p;
}

function superCucas() {
  const Y = '#f7a823', R = '#e23a2c', G = '#2f9e4f', W = '#fff6e2';
  const p = [rbox(12, 4.4, 8, Y, { y: 2.3, bevel: 0.2, segments: 1 }), box(12.4, 0.3, 8.4, C.dconcrete, { y: 0.15 })];
  p.push(box(12.4, 0.5, 8.4, R, { y: 4.65 }), box(12.5, 0.5, 0.5, R, { y: 5.1, z: 4 }), box(12.5, 0.5, 0.5, R, { y: 5.1, z: -4 }), box(0.5, 0.5, 8.4, R, { x: 6, y: 5.1 }), box(0.5, 0.5, 8.4, R, { x: -6, y: 5.1 }));
  // shed tile awning over the front + posts
  p.push(tilePanel(12.6, 2.4, C.tile, { y: 3.55, z: 5.1, rx: 0.36, h: 0.2 }), ...[-5.4, -1.8, 1.8, 5.4].map((x) => cyl(0.1, 0.1, 3.0, R, { x, y: 1.8, z: 6.0, segments: 8, flat: false })));
  // storefront: big windows + door
  for (const u of [-3.6, 3.2]) p.push(box(3.6, 2.2, 0.16, R, { x: u, y: 2.2, z: 4.03 }), box(3.2, 1.8, 0.2, C.glass2, { x: u, y: 2.2, z: 4.03 }), box(0.08, 1.8, 0.24, R, { x: u, y: 2.2, z: 4.03 }));
  p.push(box(1.7, 2.9, 0.16, R, { x: -0.2, y: 1.6, z: 4.03 }), box(1.4, 2.6, 0.2, C.glass2, { x: -0.2, y: 1.6, z: 4.03 }), box(1.8, 0.6, 0.2, W, { x: -0.2, y: 3.4, z: 4.05 }));
  // menu boards and mural on the side
  p.push(box(1.6, 1.4, 0.1, C.black, { x: 5.3, y: 1.9, z: 4.05 }), ...[0, 1, 2, 3].map((i) => box(1.2, 0.08, 0.05, W, { x: 5.3, y: 2.4 - i * 0.28, z: 4.12 })));
  const mural = [R, G, '#2f80d8', W, '#f2d02a', '#8e3fb8'];
  mural.forEach((c, i) => p.push(box(1.2, 2.4, 0.1, c, { x: 6.06, y: 2.4, z: -2.6 + i * 1.05, ry: PI / 2 })));
  // big sign on the roof
  p.push(box(10.4, 2.6, 0.5, R, { y: 6.5, z: 1.5 }), box(9.8, 2.0, 0.55, Y, { y: 6.5, z: 1.5 }), box(0.2, 1.8, 0.4, C.dwood, { x: -4.8, y: 5.6, z: 1.5 }), box(0.2, 1.8, 0.4, C.dwood, { x: 4.8, y: 5.6, z: 1.5 }));
  const letters = [R, G, R, G, R, G, R, G, R, G];
  letters.forEach((c, i) => p.push(box(0.62, 1.2, 0.6, c, { x: -4.4 + i * 0.98, y: 6.65, z: 1.5 }), box(0.62, 0.3, 0.62, C.black, { x: -4.4 + i * 0.98, y: 5.95, z: 1.5 })));
  // sombrero on a pole
  p.push(cyl(0.08, 0.1, 3.2, C.iron, { x: 5.9, y: 6.5, z: 3.6, segments: 6 }), cone(0.9, 0.35, '#f2d08a', { x: 5.9, y: 8.3, z: 3.6, segments: 12, flat: false }), cyl(0.3, 0.3, 0.3, '#f2d08a', { x: 5.9, y: 8.3, z: 3.6, segments: 10, flat: false }));
  // patio fence
  for (let i = 0; i < 8; i++) p.push(box(0.1, 1.0, 0.1, C.iron, { x: -5.6 + i * 1.6, y: 0.6, z: 7.6 }));
  p.push(box(12, 0.08, 0.08, C.iron, { y: 1.1, z: 7.6 }), box(0.08, 0.08, 3.8, C.iron, { x: -5.6, y: 1.1, z: 5.7 }), box(0.08, 0.08, 3.8, C.iron, { x: 5.6, y: 1.1, z: 5.7 }));
  return p;
}

function dolphinFountain() {
  const p = [lathe([[0.001, 0], [2.4, 0], [2.6, 0.4], [2.6, 0.95], [2.3, 1.0], [2.2, 0.6], [0.001, 0.6]], C.sand, { segments: 20 }), cyl(2.2, 2.2, 0.05, C.water, { y: 0.66, segments: 20, flat: false }),
    lathe([[0.001, 0.6], [0.5, 0.6], [0.3, 1.2], [0.36, 2.0], [0.7, 2.2], [0.001, 2.2]], C.sand, { segments: 14 })];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    const x = Math.cos(a) * 0.9, z = Math.sin(a) * 0.9;
    // dolphin: two capsules arcing up and outward + tail fluke
    p.push(aim(capsule(0.17, 0.9, '#6e9db5', { segments: 8, caps: 3, rz: PI / 2 }), x, 2.2, z, -a, 0.9));
    p.push(aim(capsule(0.13, 0.7, '#6e9db5', { segments: 8, caps: 3, rz: PI / 2 }), x + Math.cos(a) * 0.7, 3.05, z + Math.sin(a) * 0.7, -a, -0.25));
    p.push(aim(cone(0.1, 0.4, '#5a8aa2', { segments: 6, rz: -PI / 2 }), x + Math.cos(a) * 1.1, 3.0, z + Math.sin(a) * 1.1, -a, -0.35));
    p.push(aim(box(0.5, 0.05, 0.2, '#5a8aa2', {}), x - Math.cos(a) * 0.2, 1.65, z - Math.sin(a) * 0.2, -a, 0.6));
  }
  p.push(cone(0.18, 1.2, '#cfe9f5', { y: 3.0, segments: 8, flat: false }));
  return p;
}

function sundial() {
  return [lathe([[0.001, 0], [0.9, 0], [0.9, 0.2], [0.55, 0.3], [0.4, 0.9], [0.55, 1.05], [0.9, 1.1], [0.001, 1.1]], C.mission, { segments: 16 }),
    cyl(1.0, 1.0, 0.08, '#b98d58', { y: 1.15, segments: 18, flat: false }), extrude([[0, 0], [0.8, 0], [0, 0.6]], 0.05, C.gold, { y: 1.19, rx: 0 })];
}
function arbor() {
  const p = [];
  for (const s of [-1, 1]) p.push(box(0.16, 2.4, 0.16, C.trim, { x: s * 1.0, y: 1.2, z: 0.4 }), box(0.16, 2.4, 0.16, C.trim, { x: s * 1.0, y: 1.2, z: -0.4 }));
  p.push(extrude(ringPts(1.2, 1.0, 8), 0.16, C.trim, { y: 2.4, z: 0.4 }), extrude(ringPts(1.2, 1.0, 8), 0.16, C.trim, { y: 2.4, z: -0.4 }));
  for (let i = 0; i < 5; i++) { const a = (i / 4) * PI; p.push(box(0.1, 0.1, 0.95, C.trim, { x: Math.cos(a) * 1.1, y: 2.4 + Math.sin(a) * 1.1, z: 0 })); }
  [[-1, 0.8, 0.4], [1, 1.5, -0.4], [-1, 2.0, -0.4], [0, 3.5, 0], [1, 0.9, 0.4]].forEach(([x, y, z], i) => p.push(sphere(0.34, i % 2 ? C.rosered : C.rosepink, { x: x * (i === 3 ? 0.2 : 1.0), y, z, segments: 6, rings: 5, flat: false })));
  return p;
}

function buildLandmarks(add) {
  add('missionChurch', missionChurch(), { value: 100 });
  add('missionWing', missionWing(), { value: 18 });
  add('missionFountain', missionFountain(), { value: 3 });
  add('courthouse', courthouse(), { value: 95, radius: 13.5 });
  add('freewayBridge', bridge(), { value: 42, radius: 11.5 });
  add('chromaticGate', chromaticGate(), { value: 26 });
  add('superCucas', superCucas(), { value: 14 });
  add('dolphinFountain', dolphinFountain(), { value: 3 });
  add('sundial', sundial(), { value: 1 });
  add('arbor', arbor(), { value: 1 });
}
