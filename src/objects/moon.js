// Moon object prototypes. Vehicles are length-along-X, front toward +X.
// Faceted rocks (low segment counts keep a chiselled look), lathe domes/tanks/dishes, rbox hulls, lattice struts.
import * as THREE from 'three';
import { box, cyl, cone, sphere, torus, rbox, capsule, lathe, extrude, makeProto } from './build.js';

const C = {
  rock: '#9a9aa2', drock: '#75757e', lrock: '#b9b9c0', white: '#f4f4f8', suit: '#e8e8f0',
  gold: '#e8b73a', dgold: '#c8962a', dark: '#2b2b33', gray: '#8d949b', lgray: '#c4c9d0',
  blue: '#2f5fc4', dblue: '#1c2f6b', red: '#d9382b', glass: '#8fd3f4', orange: '#f28c28',
  tire: '#3a3a40', green: '#4fbf6a', teal: '#3cb7b0', purple: '#7a55c8', cell: '#243c8a', cellL: '#3556b8',
};
const PI = Math.PI;
const B = (w, h, d, c, x, y, z, o = {}) => box(w, h, d, c, { x, y, z, ...o });
const RB = (w, h, d, c, x, y, z, o = {}) => rbox(w, h, d, c, { x, y, z, segments: 1, ...o });
const S = (r, c, o = {}) => sphere(r, c, { segments: 8, rings: 6, ...o });
const Sl = (r, c, o = {}) => sphere(r, c, { segments: 6, rings: 4, ...o });
const shade = (c, f) => {
  const n = parseInt(c.slice(1), 16);
  return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('');
};
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _u = new THREE.Vector3(0, 1, 0);
/** Cylinder strut between two 3D points. */
function strut(a, b, r, c, seg = 5) {
  _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = _v.length();
  _q.setFromUnitVectors(_u, _v.normalize());
  _e.setFromQuaternion(_q, 'XYZ');
  return cyl(r, r, L, c, { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2, rx: _e.x, ry: _e.y, rz: _e.z, segments: seg });
}
const rn = (seed) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

function rockCluster(chunks, seed) {
  // chunks: [x,y,z,r,color,sy]; faceted spheres plus a few dark pits
  const r = rn(seed);
  const p = [];
  for (const [x, y, z, rad, c, sy = 0.75, sx = 1] of chunks) {
    p.push(sphere(rad, c, { x, y, z, sy, sx, sz: 0.9 + r() * 0.2, ry: r() * PI, segments: rad > 1.4 ? 9 : 7, rings: rad > 1.4 ? 7 : 5, flat: true }));
  }
  return p;
}

const wheel = (x, y, z, rad, w = 0.4) => [
  cyl(rad, rad, w, C.tire, { x, y, z, rx: PI / 2, segments: 12 }),
  cyl(rad * 0.62, rad * 0.62, w + 0.04, C.lgray, { x, y, z, rx: PI / 2, segments: 10 }),
  cyl(rad * 0.2, rad * 0.2, w + 0.08, C.dark, { x, y, z, rx: PI / 2, segments: 6 }),
  ...Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * PI * 2;
    return B(0.12, 0.06, w + 0.02, '#26262c', x + Math.cos(a) * rad, y + Math.sin(a) * rad, z, { rz: a + PI / 2 });
  }),
];
export function buildProtos() {
  const P = {};
  const add = (name, parts, opts) => (P[name] = makeProto(name, parts.flat(), opts));

  add('pebble', rockCluster([[0, 0.14, 0, 0.28, C.rock, 0.6, 1.2], [0.4, 0.1, 0.2, 0.18, C.drock, 0.6], [-0.3, 0.09, 0.3, 0.14, C.lrock, 0.6], [-0.15, 0.06, -0.32, 0.12, C.drock, 0.6]], 1), { value: 0.2 });
  add('rockS', rockCluster([[0, 0.3, 0, 0.5, C.rock, 0.7, 1.1], [0.15, 0.45, 0.1, 0.3, C.lrock, 0.7], [-0.5, 0.15, 0.3, 0.25, C.drock, 0.6], [0.5, 0.12, -0.3, 0.2, C.rock, 0.6]], 2), { value: 0.35 });
  add('rockM', rockCluster([[0, 0.55, 0, 0.9, C.drock, 0.75, 1.15], [-0.2, 0.9, 0.2, 0.55, C.rock, 0.75], [0.9, 0.35, -0.5, 0.4, C.lrock, 0.7], [-0.9, 0.25, 0.6, 0.35, C.drock, 0.65], [0.3, 0.2, 0.9, 0.3, C.rock, 0.6]], 3), { value: 0.6 });
  add('rockL', rockCluster([[0, 1.1, 0, 1.8, C.rock, 0.75, 1.15], [0.4, 2.0, -0.3, 1.1, C.drock, 0.8], [-1.7, 0.8, 1.2, 0.9, C.lrock, 0.75], [1.8, 0.6, 1.4, 0.7, C.drock, 0.75], [-1.0, 0.5, -1.7, 0.7, C.rock, 0.7], [1.4, 0.4, -1.6, 0.5, C.lrock, 0.7]], 4), { value: 2 });
  add('boulder', [...rockCluster([[0, 2.0, 0, 3.2, C.drock, 0.8, 1.1], [-0.6, 3.4, 0.6, 2.0, C.rock, 0.8], [2.9, 1.3, -1.0, 1.6, C.lrock, 0.8], [-2.8, 1.0, -1.8, 1.3, C.rock, 0.8], [1.6, 0.8, 2.6, 1.2, C.drock, 0.75], [-2.2, 0.7, 2.2, 1.0, C.lrock, 0.75]], 5),
    ...[[1.2, 3.6, 1.5], [-1.6, 3.9, -0.4], [0.4, 4.2, -1.0]].map(([x, y, z]) => sphere(0.5, '#5e5e68', { x, y, z, sy: 0.5, segments: 6, rings: 4, flat: true }))], { value: 6 });

  add('sampleBox', [
    RB(0.8, 0.44, 0.55, C.lgray, 0, 0.22, 0, { bevel: 0.05 }), RB(0.82, 0.14, 0.57, C.orange, 0, 0.5, 0, { bevel: 0.04 }),
    B(0.16, 0.1, 0.06, C.dark, 0, 0.58, 0), B(0.05, 0.12, 0.06, C.dark, 0.3, 0.44, 0.29), B(0.05, 0.12, 0.06, C.dark, -0.3, 0.44, 0.29),
    B(0.5, 0.08, 0.02, C.red, 0, 0.28, 0.285), B(0.3, 0.04, 0.02, C.white, 0, 0.2, 0.285), cyl(0.03, 0.03, 0.3, C.dark, { y: 0.6, rz: PI / 2, segments: 6 }),
  ], { value: 0.4 });
  add('tool', [
    RB(0.9, 0.07, 0.15, C.lgray, 0, 0.05, 0, { bevel: 0.02 }), cyl(0.16, 0.16, 0.09, C.lgray, { x: 0.45, y: 0.05, segments: 8 }), cyl(0.09, 0.09, 0.1, C.dark, { x: 0.45, y: 0.05, segments: 6 }),
    cyl(0.16, 0.16, 0.09, C.lgray, { x: -0.45, y: 0.05, segments: 8 }), cyl(0.09, 0.09, 0.1, C.dark, { x: -0.45, y: 0.05, segments: 6 }),
    RB(0.35, 0.16, 0.3, C.red, 0.1, 0.1, 0.35, { bevel: 0.04 }), cyl(0.05, 0.05, 0.3, C.dark, { x: 0.1, y: 0.22, z: 0.35, rz: PI / 2, segments: 6 }), cone(0.04, 0.2, C.lgray, { x: 0.36, y: 0.14, z: 0.35, rz: -PI / 2, segments: 5 }),
  ], { value: 0.25 });
  add('astronaut', (() => {
    const p = [];
    for (const sg of [1, -1]) {
      p.push(capsule(0.1, 0.32, C.suit, { x: 0, y: 0.32, z: sg * 0.13, segments: 8, caps: 2 }), RB(0.3, 0.14, 0.17, C.dgold, 0.05, 0.07, sg * 0.13, { bevel: 0.04 }));
    }
    p.push(capsule(0.24, 0.34, C.white, { y: 0.88, sx: 0.85, segments: 10, caps: 3 }), RB(0.22, 0.14, 0.3, C.red, 0.2, 0.9, 0, { bevel: 0.03 }), RB(0.28, 0.06, 0.34, C.orange, 0.18, 1.05, 0, { bevel: 0.02 }));
    p.push(RB(0.32, 0.52, 0.44, C.lgray, -0.28, 0.95, 0, { bevel: 0.06 }), cyl(0.05, 0.05, 0.25, C.dark, { x: -0.3, y: 0.7, z: 0.18, rx: 0.3, segments: 6 }), B(0.04, 0.16, 0.2, C.white, -0.3, 1.2, 0), Sl(0.03, C.red, { x: -0.44, y: 1.05, z: 0.1 }), Sl(0.03, C.green, { x: -0.44, y: 1.05, z: -0.1 }));
    for (const sg of [1, -1]) {
      p.push(capsule(0.09, 0.32, C.suit, { x: 0.08, y: 0.86, z: sg * 0.34, rx: sg * -0.35, rz: -0.3, segments: 8, caps: 2 }), Sl(0.1, C.dgold, { x: 0.14, y: 0.6, z: sg * 0.44 }));
    }
    p.push(cyl(0.16, 0.18, 0.08, C.gray, { y: 1.2, segments: 8 }), sphere(0.31, C.white, { y: 1.5, segments: 12, rings: 9 }));
    p.push(sphere(0.24, C.gold, { x: 0.13, y: 1.5, sx: 0.65, sy: 0.85, sz: 1.05, segments: 10, rings: 7 }), sphere(0.1, '#fff4c0', { x: 0.26, y: 1.6, z: 0.08, sx: 0.4, segments: 6, rings: 4 }));
    return p;
  })(), { value: 0.7 });
  add('flag', [
    cyl(0.3, 0.34, 0.08, C.gray, { y: 0.04, segments: 12 }), cyl(0.03, 0.03, 2.2, C.lgray, { y: 1.15, segments: 6 }), Sl(0.06, C.gold, { y: 2.27 }),
    ...[0, 1, 2, 3, 4, 5].map((i) => B(0.02, 0.09, 0.95, i % 2 ? C.white : C.red, 0, 2.1 - i * 0.09, 0.5 + Math.sin(i) * 0.01)),
    B(0.03, 0.46, 0.4, C.blue, 0, 1.92 + 0.06 + 0.2 - 0.09, 0.27), B(0.03, 0.04, 0.04, C.white, 0.015, 2.15, 0.2), B(0.03, 0.04, 0.04, C.white, 0.015, 2.05, 0.33), B(0.03, 0.04, 0.04, C.white, 0.015, 2.2, 0.35), B(0.03, 0.04, 0.04, C.white, 0.015, 2.1, 0.12),
    cyl(0.02, 0.02, 0.95, C.lgray, { y: 2.2, z: 0.5, rx: PI / 2, segments: 5 }),
  ], { value: 0.6 });
  add('antennaS', [
    lathe([[0, 0], [0.34, 0], [0.34, 0.06], [0.16, 0.14], [0.06, 0.2], [0, 0.2]], C.gray, { segments: 12 }),
    cyl(0.04, 0.05, 1.5, C.lgray, { y: 0.9, segments: 6 }), B(0.55, 0.03, 0.03, C.lgray, 0, 1.4, 0), B(0.03, 0.03, 0.4, C.lgray, 0, 1.25, 0),
    lathe([[0.02, 1.62], [0.14, 1.72], [0.2, 1.8], [0.17, 1.8], [0.1, 1.72], [0.0, 1.66]], C.white, { segments: 10, x: 0.06, rz: -0.5 }), cone(0.04, 0.2, C.red, { y: 1.8, segments: 6 }),
    Sl(0.07, C.red, { y: 1.98 }), B(0.18, 0.14, 0.14, C.white, 0.16, 0.24, 0),
  ], { value: 0.55 });
  add('antenna', (() => {
    const p = [RB(1.7, 0.3, 1.7, C.gray, 0, 0.15, 0, { bevel: 0.05 })];
    const legs = [[0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]];
    legs.forEach(([x, z]) => p.push(strut([x, 0.3, z], [x * 0.25, 5.2, z * 0.25], 0.06, C.lgray)));
    for (const y of [1.0, 2.0, 3.0, 4.0]) {
      const k = 1 - (y - 0.3) / 4.9 * 0.75;
      const c = [[0.55 * k, 0.55 * k], [-0.55 * k, 0.55 * k], [-0.55 * k, -0.55 * k], [0.55 * k, -0.55 * k]];
      for (let i = 0; i < 4; i++) p.push(strut([c[i][0], y, c[i][1]], [c[(i + 1) % 4][0], y, c[(i + 1) % 4][1]], 0.03, C.gray));
      p.push(strut([c[0][0], y, c[0][1]], [c[2][0] * 0.9, y + 1, c[2][1] * 0.9], 0.025, C.gray, 4));
    }
    p.push(cyl(0.1, 0.16, 1.0, C.lgray, { y: 5.6, segments: 8 }), B(1.3, 0.1, 0.1, C.lgray, 0, 5.4, 0), B(0.1, 0.1, 1.3, C.lgray, 0, 5.0, 0), B(1.0, 0.1, 0.1, C.lgray, 0, 4.6, 0));
    p.push(cone(0.15, 0.8, C.red, { y: 6.5, segments: 8 }), Sl(0.1, C.red, { y: 6.95 }), RB(0.6, 0.6, 0.5, C.white, 0.7, 0.6, 0, { bevel: 0.06 }), B(0.3, 0.2, 0.04, C.dark, 0.7, 0.7, 0.27), Sl(0.04, C.green, { x: 0.9, y: 0.85, z: 0.27 }));
    for (const s of [1, -1]) p.push(lathe([[0.02, 0], [0.22, 0.08], [0.3, 0.16], [0.26, 0.16], [0.18, 0.08], [0, 0.02]], C.white, { segments: 10, x: 0, y: 5.3, z: s * 0.6, rz: -PI / 2 }));
    return p;
  })(), { value: 1.5 });
  // solar cells laid on a panel tilted by `tilt` about X, panel centre (0,cy,cz0)
  const cellsOn = (w, d, nx, nz, tilt, cy, cz0 = 0) => {
    const p = [], c = Math.cos(tilt), sn = Math.sin(tilt);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const lx = -w / 2 + (i + 0.5) * (w / nx), lz = -d / 2 + (j + 0.5) * (d / nz);
      p.push(B(w / nx - 0.06, 0.03, d / nz - 0.06, (i + j) % 2 ? C.cell : C.cellL, lx, cy + 0.06 * c - lz * sn, cz0 + 0.06 * sn + lz * c, { rx: tilt }));
    }
    return p;
  };
  add('solarPanel', [
    cyl(0.2, 0.26, 0.1, C.gray, { y: 0.05, segments: 8 }), cyl(0.07, 0.07, 1.0, C.gray, { y: 0.55, segments: 6 }), RB(0.3, 0.2, 0.3, C.lgray, 0, 1.05, 0, { bevel: 0.04 }),
    RB(2.6, 0.08, 1.7, C.lgray, 0, 1.35, 0, { rx: -0.4, bevel: 0.02 }), ...cellsOn(2.4, 1.5, 4, 3, -0.4, 1.35),
    strut([0, 1.0, 0.3], [0, 1.2, -0.5], 0.04, C.gray, 4),
  ], { value: 1 });
  add('solarFarm', (() => {
    const p = [RB(1.4, 0.5, 0.9, C.white, 0, 0.25, -1.3, { bevel: 0.06 }), B(0.5, 0.3, 0.04, C.dark, 0, 0.3, -0.85), Sl(0.05, C.green, { x: 0.4, y: 0.4, z: -0.84 })];
    for (const x of [-2.2, 0, 2.2]) p.push(cyl(0.11, 0.14, 1.5, C.gray, { x, y: 0.75, z: 0.2, segments: 6 }));
    p.push(RB(6.4, 0.1, 2.5, C.lgray, 0, 2.0, 0.2, { rx: -0.5, bevel: 0.03 }));
    p.push(...cellsOn(6.2, 2.3, 6, 3, -0.5, 2.0, 0.2));
    p.push(B(6.4, 0.06, 0.06, C.gray, 0, 1.4, 0.2 - 0.9), strut([-2.2, 1.2, 0.2], [-2.2, 2.5, -0.5], 0.05, C.gray), strut([2.2, 1.2, 0.2], [2.2, 2.5, -0.5], 0.05, C.gray));
    return p;
  })(), { value: 3 });

  add('rover', (() => {
    const p = [];
    p.push(RB(3.0, 0.5, 1.6, C.lgray, 0, 0.9, 0, { bevel: 0.12, segments: 2 }), B(3.05, 0.08, 1.65, C.orange, 0, 0.72, 0));
    p.push(RB(1.3, 0.75, 1.4, C.white, -0.7, 1.5, 0, { bevel: 0.2, segments: 2 }), B(0.05, 0.4, 1.0, C.glass, 0.0, 1.55, 0, { rz: 0.15 }), B(0.9, 0.3, 0.04, C.glass, -0.7, 1.6, 0.71), B(0.9, 0.3, 0.04, C.glass, -0.7, 1.6, -0.71));
    p.push(RB(1.4, 0.06, 1.2, C.dblue, -0.7, 1.92, 0, { rz: 0.05, bevel: 0.02 }), B(1.3, 0.03, 0.5, C.cellL, -0.7, 1.96, 0.3), B(1.3, 0.03, 0.5, C.cellL, -0.7, 1.96, -0.3));
    // camera mast + head + dish + whip
    p.push(cyl(0.04, 0.04, 1.1, C.lgray, { x: 0.9, y: 1.7, z: 0.5, segments: 6 }), RB(0.4, 0.22, 0.34, C.dark, 0.95, 2.3, 0.5, { bevel: 0.04 }), cyl(0.06, 0.06, 0.1, C.glass, { x: 1.18, y: 2.32, z: 0.6, rz: PI / 2, segments: 8 }), cyl(0.06, 0.06, 0.1, C.glass, { x: 1.18, y: 2.32, z: 0.4, rz: PI / 2, segments: 8 }));
    p.push(lathe([[0.02, 0], [0.3, 0.12], [0.5, 0.3], [0.44, 0.3], [0.26, 0.14], [0.0, 0.05]], C.gold, { segments: 12, x: 0.3, y: 2.0, z: -0.55, rz: 0.5 }), cyl(0.03, 0.03, 0.5, C.gray, { x: 0.3, y: 1.95, z: -0.55, segments: 5 }), cyl(0.012, 0.012, 1.4, C.lgray, { x: -1.3, y: 2.6, z: -0.6, segments: 4 }));
    // arm with claw at the front
    p.push(capsule(0.06, 0.6, C.gray, { x: 1.75, y: 0.95, z: -0.3, rz: PI / 2 - 0.4, segments: 7, caps: 2 }), Sl(0.09, C.dark, { x: 1.9, y: 0.85, z: -0.3 }), B(0.2, 0.06, 0.06, C.dark, 2.05, 0.8, -0.3), B(0.2, 0.06, 0.06, C.dark, 2.05, 0.8, -0.24));
    for (const sg of [1, -1]) p.push(Sl(0.1, '#fff6c0', { x: 1.52, y: 1.0, z: sg * 0.55, sx: 0.5 }), B(0.06, 0.1, 0.16, C.red, -1.5, 0.95, sg * 0.5), B(1.9, 0.08, 0.08, C.gray, 0, 0.6, sg * 0.9));
    p.push(RB(0.7, 0.35, 0.5, C.orange, 0.7, 1.28, -0.35, { bevel: 0.06 }), RB(0.4, 0.3, 0.4, C.dark, 1.2, 1.25, 0.4, { bevel: 0.05 }), Sl(0.06, C.green, { x: 1.4, y: 1.4, z: 0.4 }));
    for (const [x, z] of [[1.1, 1.0], [1.1, -1.0], [-1.1, 1.0], [-1.1, -1.0]]) { p.push(...wheel(x, 0.5, z, 0.5)); p.push(strut([x * 0.7, 0.9, z * 0.6], [x, 0.5, z * 0.97], 0.05, C.gray, 5)); }
    return p;
  })(), { value: 2.5 });

  add('dish', [
    cyl(0.5, 0.7, 0.4, C.gray, { y: 0.2, segments: 12 }), RB(0.5, 0.3, 0.5, C.lgray, 0, 0.55, 0, { bevel: 0.05 }), cyl(0.14, 0.2, 1.4, C.lgray, { y: 1.3, segments: 8 }),
    RB(0.5, 0.5, 0.5, C.gray, 0, 2.05, 0, { bevel: 0.08 }),
    lathe([[0.04, 0], [0.5, 0.12], [1.0, 0.4], [1.5, 0.85], [1.6, 0.98], [1.5, 0.98], [0.95, 0.5], [0.4, 0.2], [0.0, 0.12]], C.white, { segments: 16, x: 0.3, y: 2.1, rz: -0.9 }),
    cyl(0.04, 0.04, 1.4, C.gray, { x: 1.05, y: 3.1, rz: -0.9, segments: 5 }), cyl(0.12, 0.05, 0.22, C.red, { x: 1.55, y: 3.65, rz: -0.9, segments: 8 }), strut([0.8, 2.6, 0.5], [1.5, 3.55, 0], 0.025, C.lgray, 4), strut([0.8, 2.6, -0.5], [1.5, 3.55, 0], 0.025, C.lgray, 4),
  ], { value: 2 });
  add('bigDish', [
    cyl(1.2, 1.7, 0.8, C.gray, { y: 0.4, segments: 14 }), lathe([[1.0, 0.8], [0.7, 1.4], [0.5, 1.6]], C.lgray, { segments: 12 }),
    cyl(0.35, 0.5, 3.0, C.lgray, { y: 2.4, segments: 10 }), RB(1.4, 1.0, 1.4, C.gray, 0, 4.2, 0, { bevel: 0.15 }),
    lathe([[0.1, 0], [1.2, 0.3], [2.4, 1.0], [3.4, 2.0], [4.0, 2.7], [3.85, 2.7], [3.2, 1.9], [2.2, 0.95], [1.0, 0.3], [0.0, 0.2]], C.white, { segments: 20, x: 0.7, y: 4.6, rz: -0.75 }),
    strut([1.2, 5.3, 1.6], [3.6, 8.0, 0], 0.07, C.lgray), strut([1.2, 5.3, -1.6], [3.6, 8.0, 0], 0.07, C.lgray),
    cyl(0.3, 0.12, 0.6, C.red, { x: 3.6, y: 8.2, rz: -0.75, segments: 10 }), Sl(0.25, C.red, { x: 3.9, y: 8.5 }),
    RB(0.9, 0.7, 0.6, C.white, 1.8, 0.75, 1.1, { bevel: 0.08 }), Sl(0.05, C.green, { x: 2.0, y: 0.95, z: 1.42 }),
  ], { value: 8 });

  add('habitat', (() => {
    const p = [];
    p.push(lathe([[0, 0], [3.3, 0], [3.4, 0.15], [3.4, 0.4], [3.2, 0.5], [0, 0.5]], C.gray, { segments: 24 }));
    // segmented dome: alternating white/light panels in rings
    const dome = [];
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * PI / 2; dome.push([Math.cos(a) * 3.0, 0.5 + Math.sin(a) * 2.9]); }
    p.push(lathe(dome, C.white, { segments: 24, flat: false }));
    for (const a of [0.25, 0.6, 0.95, 1.25]) p.push(torus(Math.cos(a) * 3.02, 0.05, C.lgray, { y: 0.5 + Math.sin(a) * 2.92, rx: PI / 2, radial: 4, segments: 26 }));
    // window band + airlock tunnel
    for (const a of [1.2, 2.2, 3.6, 4.6]) p.push(B(0.9, 0.55, 0.08, C.glass, Math.cos(a) * 2.75, 1.5, Math.sin(a) * 2.75, { ry: -a + PI / 2 }));
    p.push(cyl(0.9, 0.9, 1.7, C.lgray, { x: 3.2, y: 0.95, rz: PI / 2, segments: 14 }), cyl(0.95, 0.95, 0.15, C.gray, { x: 2.5, y: 0.95, rz: PI / 2, segments: 14 }), cyl(1.0, 1.0, 0.12, C.orange, { x: 3.98, y: 0.95, rz: PI / 2, segments: 14 }), B(0.06, 1.1, 0.8, C.dark, 4.06, 0.85, 0), B(0.03, 0.3, 0.3, C.glass, 4.1, 1.2, 0));
    p.push(RB(1.6, 0.06, 0.05, C.gray, 3.3, 0.02, 1.0), strut([3.3, 0.3, 0.7], [3.3, 1.6, 0.9], 0.02, C.gray, 4));
    // roof gear: mast, dish, solar strip
    p.push(cyl(0.05, 0.06, 1.7, C.lgray, { x: -0.5, y: 4.2, segments: 6 }), Sl(0.13, C.red, { x: -0.5, y: 5.1 }), lathe([[0.02, 0], [0.4, 0.15], [0.5, 0.25], [0.45, 0.25], [0.35, 0.15], [0, 0.05]], C.white, { segments: 10, x: 0.7, y: 3.45, z: -1.0, rz: -0.6 }));
    p.push(RB(1.6, 0.06, 0.8, C.dblue, -1.0, 3.2, 1.0, { rz: 0.35, rx: 0.3, bevel: 0.02 }));
    for (const a of [0.5, 2.6, 4.4]) p.push(cyl(0.16, 0.16, 0.5, C.lgray, { x: Math.cos(a) * 2.9, y: 0.75, z: Math.sin(a) * 2.9, segments: 6 }));
    return p;
  })(), { value: 8 });
  add('habitatBig', (() => {
    const p = [];
    p.push(lathe([[0, 0], [6.1, 0], [6.3, 0.2], [6.3, 0.5], [5.9, 0.6], [0, 0.6]], C.gray, { segments: 28 }));
    const dome = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * PI / 2; dome.push([Math.cos(a) * 5.6, 0.6 + Math.sin(a) * 5.2]); }
    p.push(lathe(dome, C.white, { segments: 28, flat: false }));
    for (const a of [0.2, 0.5, 0.8, 1.1, 1.35]) p.push(torus(Math.cos(a) * 5.65, 0.08, C.lgray, { y: 0.6 + Math.sin(a) * 5.25, rx: PI / 2, radial: 4, segments: 30 }));
    for (let i = 0; i < 10; i++) p.push(B(3.0, 0.9, 0.1, C.glass, Math.cos(i * 0.628) * 5.25, 2.6, Math.sin(i * 0.628) * 5.25, { ry: -i * 0.628 + PI / 2, sx: 0.45 }));
    p.push(cyl(1.6, 1.6, 3.2, C.lgray, { x: 6.2, y: 1.6, rz: PI / 2, segments: 16 }), cyl(1.7, 1.7, 0.2, C.gray, { x: 4.8, y: 1.6, rz: PI / 2, segments: 16 }), cyl(1.75, 1.75, 0.2, C.orange, { x: 7.75, y: 1.6, rz: PI / 2, segments: 16 }), B(0.1, 1.9, 1.4, C.dark, 7.9, 1.3, 0), B(0.05, 0.5, 0.5, C.glass, 7.95, 2.0, 0));
    p.push(cyl(0.08, 0.1, 2.4, C.lgray, { x: 0.5, y: 6.2, segments: 6 }), Sl(0.22, C.red, { x: 0.5, y: 7.5 }), lathe([[0.02, 0], [0.7, 0.22], [0.9, 0.4], [0.8, 0.4], [0.6, 0.22], [0, 0.08]], C.white, { segments: 12, x: -1.5, y: 5.2, z: 1.5, rz: -0.6 }));
    p.push(RB(2.6, 0.08, 1.4, C.dblue, 2.0, 4.6, -2.0, { rz: 0.4, rx: 0.3, bevel: 0.03 }), RB(2.6, 0.08, 1.4, C.dblue, -2.4, 4.4, -2.2, { rz: -0.4, rx: 0.3, bevel: 0.03 }));
    for (const a of [0.3, 1.5, 2.6, 3.8, 5.0]) p.push(cyl(0.3, 0.3, 0.8, C.lgray, { x: Math.cos(a) * 5.7, y: 1.0, z: Math.sin(a) * 5.7, segments: 8 }));
    return p;
  })(), { value: 25 });
  add('fuelTank', [
    lathe([[0.02, 0], [0.9, 0], [1.0, 0.1], [1.0, 3.3], [0.9, 3.5], [0.6, 3.75], [0.02, 3.9]], C.white, { segments: 16, y: 0.5 }),
    cyl(1.03, 1.03, 0.3, C.orange, { y: 1.5, segments: 16 }), cyl(1.03, 1.03, 0.3, C.orange, { y: 3.0, segments: 16 }), cyl(1.02, 1.02, 0.08, C.gray, { y: 2.25, segments: 16 }),
    ...[[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]].map(([x, z]) => strut([x, 0.05, z], [x * 0.8, 0.9, z * 0.8], 0.07, C.dark)),
    cyl(0.08, 0.08, 2.4, C.lgray, { x: 0.98, y: 2.0, z: 0.0, segments: 5 }), ...[1, 2, 3].map((i) => B(0.1, 0.03, 0.4, C.lgray, 1.0, 0.7 + i * 0.7, 0)),
    cyl(0.14, 0.14, 0.3, C.red, { x: -0.6, y: 4.5, z: 0.2, segments: 8 }), cyl(0.06, 0.06, 0.8, C.gray, { x: -0.6, y: 4.1, z: 0.2, segments: 6 }), B(0.4, 0.3, 0.04, C.red, 0, 1.0, 1.03), B(0.3, 0.1, 0.04, C.white, 0, 1.0, 1.06),
  ], { value: 3 });
  add('fuelSphere', [
    sphere(1.8, C.lgray, { y: 2.6, segments: 16, rings: 12 }), torus(1.82, 0.08, C.orange, { y: 2.6, rx: PI / 2, radial: 5, segments: 24 }), torus(1.5, 0.05, C.gray, { y: 2.6, ry: PI / 2, radial: 4, segments: 20, x: 0 }),
    ...[[1.25, 1.25], [-1.25, 1.25], [1.25, -1.25], [-1.25, -1.25]].flatMap(([x, z]) => [cyl(0.1, 0.13, 1.7, C.gray, { x, y: 0.85, z, segments: 6 }), B(0.4, 0.08, 0.4, C.dark, x, 0.04, z)]),
    strut([1.25, 1.0, 1.25], [-1.25, 1.0, -1.25], 0.04, C.dark, 4), strut([-1.25, 1.0, 1.25], [1.25, 1.0, -1.25], 0.04, C.dark, 4),
    cyl(0.2, 0.2, 0.4, C.gray, { y: 4.5, segments: 8 }), cyl(0.3, 0.3, 0.1, C.orange, { y: 4.72, segments: 10 }), cyl(0.12, 0.12, 2.2, C.gray, { x: 1.9, y: 1.3, z: 0.4, rz: 0.1, segments: 6 }),
    RB(0.05, 0.6, 0.6, C.red, 1.79, 2.6, 0, { bevel: 0.02 }),
  ], { value: 6 });
  add('lander', (() => {
    const p = [];
    p.push(RB(2.6, 1.6, 2.6, C.gold, 0, 2.6, 0, { bevel: 0.15, segments: 2 }), B(2.7, 0.14, 2.7, C.dgold, 0, 1.9, 0));
    for (let i = 0; i < 4; i++) p.push(B(0.6, 1.3, 0.05, i % 2 ? C.dgold : '#f4d060', -0.9 + i * 0.6, 2.6, 1.31), B(0.05, 1.3, 0.6, i % 2 ? C.dgold : '#f4d060', 1.31, 2.6, -0.9 + i * 0.6));
    p.push(cyl(0.9, 1.5, 1.2, C.gray, { y: 1.35, segments: 12 }), lathe([[0.3, 0.6], [0.7, 0.9], [0.9, 1.0]], C.dark, { segments: 10 }));
    p.push(cyl(1.25, 1.25, 1.2, C.lgray, { y: 4.0, segments: 8 }), cyl(0.85, 1.25, 0.5, C.white, { y: 4.85, segments: 8 }), B(0.9, 0.5, 0.06, C.glass, 1.2, 4.2, 0), cyl(0.05, 0.05, 0.8, C.lgray, { y: 5.4, x: -0.3, segments: 5 }), Sl(0.1, C.red, { x: -0.3, y: 5.85 }));
    p.push(RB(3.2, 0.08, 1.0, C.dblue, 3.0, 3.4, 0, { bevel: 0.02 }), B(3.0, 0.03, 0.2, C.cellL, 3.0, 3.46, 0.25), B(3.0, 0.03, 0.2, C.cellL, 3.0, 3.46, -0.25), B(0.5, 0.1, 0.1, C.gray, 1.3, 3.4, 0));
    p.push(lathe([[0.02, 0], [0.4, 0.15], [0.6, 0.35], [0.52, 0.35], [0.34, 0.16], [0.0, 0.06]], C.white, { segments: 12, x: -0.7, y: 5.1, z: -0.5, rz: 0.5 }));
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      p.push(strut([sx * 1.0, 2.2, sz * 1.0], [sx * 2.6, 0.12, sz * 2.6], 0.07, C.dgold), strut([sx * 1.3, 2.0, sz * 0.2], [sx * 2.3, 0.6, sz * 2.4], 0.045, C.dgold, 4), cyl(0.55, 0.6, 0.12, C.gold, { x: sx * 2.6, y: 0.06, z: sz * 2.6, segments: 10 }));
    }
    for (let i = 0; i < 5; i++) p.push(B(0.6, 0.05, 0.06, C.lgray, 2.4 - i * 0.02, 0.5 + i * 0.35, 0));
    return p;
  })(), { value: 12 });
  add('miningRig', (() => {
    const p = [];
    p.push(RB(6, 0.6, 4, C.gray, 0, 0.75, 0, { bevel: 0.1 }));
    for (const sg of [1, -1]) {
      p.push(RB(5.2, 0.9, 0.9, C.dark, 0, 0.45, sg * 2.2, { bevel: 0.3 }));
      for (let i = 0; i < 6; i++) p.push(cyl(0.42, 0.42, 0.8, '#3a3a44', { x: -2.1 + i * 0.84, y: 0.45, z: sg * 2.2, rx: PI / 2, segments: 8 }));
    }
    p.push(RB(3, 1.6, 2.4, C.orange, -1.4, 1.9, 0, { bevel: 0.15, segments: 2 }), RB(1.6, 1.2, 1.8, C.glass, -0.9, 3.3, 0, { bevel: 0.2 }), B(1.8, 0.12, 2.0, C.orange, -0.9, 3.95, 0), B(0.06, 0.14, 1.4, C.white, -0.4, 3.95, 0));
    p.push(B(0.3, 0.2, 0.2, '#fff6c0', -0.05, 3.6, 0.7), B(0.3, 0.2, 0.2, '#fff6c0', -0.05, 3.6, -0.7), RB(0.9, 0.5, 2.0, C.red, -2.5, 2.9, 0, { bevel: 0.1 }));
    // derrick lattice tower with drill string
    const tx = 1.6, tz = 0;
    for (const [a, b] of [[0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]]) p.push(strut([tx + a, 1.05, tz + b], [tx + a * 0.4, 9.6, tz + b * 0.4], 0.07, C.dark));
    for (let y = 1.8; y < 9; y += 1.6) { const k = 1 - (y - 1) / 8.6 * 0.6; for (const s of [1, -1]) { p.push(strut([tx + 0.45 * k, y, tz + 0.45 * k * s], [tx - 0.45 * k, y + 0.8, tz + 0.45 * k * s], 0.035, C.gray, 4)); p.push(strut([tx + 0.45 * k * s, y, tz + 0.45 * k], [tx + 0.45 * k * s, y + 0.8, tz - 0.45 * k], 0.035, C.gray, 4)); } }
    p.push(RB(1.2, 0.8, 1.2, C.red, tx, 10.0, tz, { bevel: 0.1 }), cyl(0.2, 0.2, 5.5, C.lgray, { x: tx, y: 4.0, z: tz, segments: 8 }), cone(0.5, 1.2, C.gold, { x: tx, y: 0.6 + 0.05, z: tz, rx: PI, segments: 8 }));
    p.push(RB(1.0, 0.7, 1.0, C.gray, tx, 6.6, tz + 0.05, { bevel: 0.08 }), Sl(0.12, C.red, { x: tx, y: 10.6 }), cyl(0.06, 0.06, 1.0, C.lgray, { x: tx, y: 11.0, segments: 5 }));
    // conveyor + hopper + bucket wheel
    p.push(RB(1.2, 0.3, 4.0, C.dark, 0.1, 1.6, 2.4, { bevel: 0.05, rx: 0.0 }), ...[0, 1, 2, 3, 4, 5].map((i) => B(0.9, 0.05, 0.1, C.orange, 0.1, 1.79, 0.9 + i * 0.5)), lathe([[0.9, 1.9], [0.6, 1.2], [0.5, 1.0]], C.red, { x: 0.1, z: 4.2, segments: 8 }));
    p.push(...Array.from({ length: 6 }, (_, i) => Sl(0.22, '#8a8a92', { x: 0.1 + (i % 3 - 1) * 0.4, y: 2.0, z: 4.2 + (i % 2) * 0.3 })));
    return p;
  })(), { value: 20 });
  add('shuttle', (() => {
    const p = [];
    p.push(capsule(0.95, 6.6, C.white, { y: 2.8, rz: PI / 2, segments: 16, caps: 6 }));
    p.push(lathe([[0.94, 0], [0.75, 0.9], [0.4, 1.8], [0.0, 2.3]], C.dark, { x: 4.4, y: 2.8, rz: -PI / 2, segments: 16 }));
    p.push(lathe([[0.4, 0], [0.7, 0.3], [0.9, 0.9]], C.dark, { x: -3.9, y: 2.8, rz: PI / 2, segments: 12 }));
    // delta wings
    for (const sg of [1, -1]) p.push(extrude([[1.4, 0], [-3.2, 0], [-3.2, 3.6], [-0.6, 1.6]], 0.16, C.white, { y: 2.2, z: 0, rx: sg * PI / 2 }));
    p.push(extrude([[-1.5, 0], [-3.7, 0], [-3.7, 2.7], [-3.4, 2.7]], 0.2, C.white, { y: 3.55, z: 0 }), B(0.6, 0.2, 0.6, C.red, -3.5, 6.2, 0));
    p.push(RB(2.4, 0.16, 1.2, C.dark, 0.6, 1.9, 0, { bevel: 0.05 }));
    for (const s of [1, -1]) { p.push(B(1.0, 0.36, 0.06, C.glass, 3.2, 3.35, s * 0.76, { rz: 0.15 }), B(0.5, 0.36, 0.06, C.glass, 2.2, 3.5, s * 0.8)); p.push(B(2.0, 0.08, 0.06, C.red, 0.2, 2.9, s * 0.95)); }
    p.push(RB(4.6, 0.9, 1.5, C.orange, 0.2, 4.0, 0, { bevel: 0.35 }));
    for (const [x, z] of [[-3.6, 0.5], [-3.6, -0.5], [-3.7, 0]]) p.push(cyl(0.34, 0.5, 0.6, C.dark, { x: x - 0.2, y: 2.8 + (z === 0 ? 0.5 : -0.1), z: z * 0.9, rz: PI / 2, segments: 10 }), lathe([[0.1, 0], [0.38, 0.4]], C.orange, { x: x - 0.5, y: 2.8 + (z === 0 ? 0.5 : -0.1), z: z * 0.9, rz: PI / 2, segments: 8 }));
    for (const [x, z] of [[2.0, 1.4], [2.0, -1.4], [-1.0, 3.0], [-1.0, -3.0]]) p.push(strut([x * 0.6, 1.9, z * 0.5], [x, 0.3, z], 0.07, C.gray), cyl(0.28, 0.28, 0.12, C.dark, { x, y: 0.06, z, segments: 8 }));
    return p;
  })(), { value: 18 });

  add('launchPad', (() => {
    const p = [
      RB(16, 0.5, 16, C.gray, 0, 0.25, 0, { bevel: 0.08 }), RB(14, 0.15, 14, C.drock, 0, 0.58, 0, { bevel: 0.04 }),
      cyl(4.6, 4.6, 0.12, '#3a3a44', { y: 0.7, segments: 24 }),
    ];
    for (let i = 0; i < 12; i++) p.push(B(1.3, 0.05, 0.5, i % 2 ? C.gold : C.dark, Math.cos(i / 12 * 6.283) * 5.6, 0.68, Math.sin(i / 12 * 6.283) * 5.6, { ry: -i / 12 * 6.283 }));
    // rocket: body sections, stripes, ogive nose, windows, boosters, fins, engine bells
    p.push(lathe([[2.2, 2.0], [2.2, 17.5]], C.white, { segments: 24, flat: false }), lathe([[2.22, 4.0], [2.22, 6.0]], C.red, { segments: 24 }), lathe([[2.22, 11.0], [2.22, 13.0]], C.red, { segments: 24 }));
    p.push(lathe([[2.2, 17.5], [2.0, 18.6], [1.6, 19.8], [1.0, 21.2], [0.4, 22.4], [0.0, 22.9]], C.red, { segments: 24, flat: false }), cyl(0.08, 0.08, 1.4, C.lgray, { y: 23.4, segments: 5 }));
    for (let i = 0; i < 3; i++) p.push(cyl(0.45, 0.45, 0.14, C.glass, { x: 2.15, y: 15.5 - i * 0.05, z: (i - 1) * 1.0, rz: PI / 2, segments: 10 }), torus(0.45, 0.07, C.lgray, { x: 2.17, y: 15.5 - i * 0.05, z: (i - 1) * 1.0, ry: PI / 2, radial: 5, segments: 12 }));
    p.push(B(0.05, 0.9, 2.4, C.blue, 2.2, 8.5, 0), B(0.05, 0.3, 1.6, C.white, 2.22, 8.5, 0), B(1.6, 0.5, 0.05, C.blue, 0, 9.0, 2.2), Sl(0.2, C.red, { x: 2.24, y: 8.5, z: -0.5 }));
    p.push(cyl(2.3, 2.3, 0.4, C.dark, { y: 2.0, segments: 24 }));
    for (const [a, r] of [[0, 1.0], [2.09, 1.0], [4.19, 1.0], [0, 0.0]]) p.push(lathe([[0.55, 0], [0.75, 0.5], [1.1, 1.2]], C.dark, { x: Math.cos(a) * r, y: 0.8, z: Math.sin(a) * r, rx: 0, segments: 12 }), cyl(0.5, 0.55, 0.6, C.gray, { x: Math.cos(a) * r, y: 2.0, z: Math.sin(a) * r, segments: 10 }));
    for (const a of [0, PI / 2, PI, -PI / 2]) {
      p.push(extrude([[0, 0], [1.9, 0], [0, 4.6], [0, 4.6]].slice(0, 3).map(([x, y]) => [x, y]), 0.3, C.red, { x: Math.cos(a) * 2.2, y: 2.5, z: Math.sin(a) * 2.2, ry: -a }));
    }
    // gantry: four-legged lattice with platforms, arm to the rocket, fuel line
    const gx = -6.5, gz = 6.0;
    for (const [dx, dz] of [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]) p.push(strut([gx + dx, 0.5, gz + dz], [gx + dx, 26.5, gz + dz], 0.1, C.orange, 6));
    for (let y = 1.5; y < 26; y += 2.6) {
      for (const s of [1, -1]) { p.push(strut([gx + 0.6, y, gz + 0.6 * s], [gx - 0.6, y + 2.6, gz + 0.6 * s], 0.05, C.dgold, 4), strut([gx + 0.6 * s, y, gz + 0.6], [gx + 0.6 * s, y + 2.6, gz - 0.6], 0.05, C.dgold, 4)); }
      p.push(B(1.4, 0.08, 0.08, C.orange, gx, y, gz + 0.6), B(1.4, 0.08, 0.08, C.orange, gx, y, gz - 0.6), B(0.08, 0.08, 1.4, C.orange, gx + 0.6, y, gz), B(0.08, 0.08, 1.4, C.orange, gx - 0.6, y, gz));
    }
    for (const y of [6, 12, 19, 24]) p.push(RB(2.4, 0.2, 2.4, C.dgold, gx, y, gz, { bevel: 0.05 }), B(2.4, 0.5, 0.06, C.dgold, gx, y + 0.35, gz + 1.2), B(2.4, 0.5, 0.06, C.dgold, gx, y + 0.35, gz - 1.2));
    p.push(RB(5.2, 0.4, 0.5, C.orange, -3.9, 20.0, 5.0, { bevel: 0.06, ry: -0.2 }), RB(5.2, 0.4, 0.5, C.orange, -3.9, 12.0, 5.0, { bevel: 0.06, ry: -0.2 }), strut([gx, 20.2, gz - 0.3], [-1.5, 20.0, 2.6], 0.05, C.dgold), strut([gx, 12.2, gz - 0.3], [-1.5, 12.0, 2.6], 0.05, C.dgold));
    p.push(cyl(0.15, 0.15, 12, C.lgray, { x: gx + 0.9, y: 8, z: gz - 1.2, segments: 6 }), strut([gx + 0.9, 14, gz - 1.2], [-2.0, 12.2, 3.0], 0.1, C.lgray), Sl(0.3, C.red, { x: gx, y: 27.2, z: gz }), cyl(0.05, 0.05, 1.6, C.gray, { x: gx, y: 27.8, z: gz, segments: 4 }));
    p.push(lathe([[0, 0], [0.9, 0], [0.9, 2.0], [0.2, 2.4], [0, 2.4]], C.orange, { x: 6.5, z: -6.0, y: 0.6, segments: 14 }), lathe([[0, 0], [0.7, 0], [0.7, 1.6], [0, 1.9]], C.lgray, { x: 5.0, z: -6.5, y: 0.6, segments: 12 }));
    for (const [x, z] of [[-7, -7], [7, -7], [7, 7]]) p.push(cyl(0.09, 0.11, 3.2, C.gray, { x, y: 2.1, z, segments: 6 }), B(0.9, 0.35, 0.5, C.white, x, 3.9, z), Sl(0.18, '#fff6c0', { x: x + 0.45, y: 3.9, z }));
    return p;
  })(), { value: 120 });

  // Astronauts bounce along slowly (low gravity); rovers roam freely.
  P.astronaut.move = { type: 'walk', speed: 1.0, range: 9 };
  P.rover.move = { type: 'drive', speed: 3.0, range: 25, turn: 1.2 };
  return P;
}
