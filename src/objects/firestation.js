// Fire-station town object prototypes. Vehicles are length-along-X, front toward +X.
import * as THREE from 'three';
import { paletteBuilders, makeProto, articulate } from './build.js';
import { facadeWall, recessedWindow } from './ModelDetails.js';
import { applyModelFinishes } from './ModelFinishes.js';

const C = {
  red: '#d9302a', dred: '#a82320', white: '#f4f4f4', dark: '#2b2b2e', gray: '#8d949b', dgray: '#5d646b', lgray: '#c3c8cd',
  blue: '#2f7fd6', dblue: '#1f4f9a', navy: '#22315c', yellow: '#ffcc1a', tan: '#d8b26a', dtan: '#b38b45',
  wood: '#c99a5b', dwood: '#a97b42', skin: '#f1c8a0', tire: '#1f1f22', glass: '#8fd3f4', green: '#3f9b4a',
  dgreen: '#2d7a38', lgreen: '#5fb85a', brown: '#7a5230', dbrown: '#5e3d22', orange: '#ff8a1a', silver: '#d5dade',
  brick: '#b5482f', dbrick: '#8a3d2c', cream: '#f0e4c4', black: '#18181a', hair: '#5a3b22',
};
// Explicit material colors retain the map palette; per-part tags override these defaults.
const { box, cyl, cone, sphere, rbox, capsule, lathe, extrude, torus } = paletteBuilders([
  [C.wood, 'wood'],
  [C.dwood, 'wood'],
  [C.brick, 'brick'],
  [C.dbrick, 'brick'],
  [C.glass, 'glass'],
  [C.tire, 'rubber'],
  [C.silver, 'metal'],
  [C.red, 'paint'], [C.dred, 'paint'], [C.yellow, 'paint'], [C.blue, 'paint'], [C.dblue, 'paint'], [C.navy, 'paint'], [C.orange, 'paint'],
  [C.black, 'paint'], ['#e0a800', 'paint'], ['#2b6bff', 'paint'], ['#3b8fd4', 'paint'],
  [C.green, 'foliage'], [C.dgreen, 'foliage'], [C.lgreen, 'foliage'],
  [C.brown, 'wood'], [C.dbrown, 'wood'],
  [C.gray, 'metal'], [C.lgray, 'metal'], [C.dgray, 'metal'], [C.dark, 'metal'],
  ['#c0392b', 'brick'], ['#a52d22', 'brick'], ['#d3d8de', 'stone'], ['#8f98a3', 'stone'], ['#c3c9d0', 'stone'], ['#aab2bb', 'stone'],
  ['#c9d3dc', 'stone'], ['#d8dee4', 'stone'], ['#f2f4f6', 'stucco'], ['#f7f9fb', 'stucco'], [C.cream, 'stucco'],
]);
const PI = Math.PI;

// Rolling wheel: tyre + rim + hub share one pivot so they spin together; front (x > 0) wheels also steer.
const wheel = (x, y, z, r, w = 0.5) => {
  const pivot = [x, y, z], opts = { radius: r, front: x > 0 };
  return [
    articulate(cyl(r, r, w, C.tire, { x, y, z, rx: PI / 2, segments: 16, surface: 'rubber' }), 'wheel', pivot, opts),
    articulate(cyl(r * 0.58, r * 0.58, w + 0.04, C.lgray, { x, y, z, rx: PI / 2, segments: 10, surface: 'metal' }), 'wheel', pivot, opts),
    ...(r > 0.3 ? [0, 1, 2].map((i) => articulate(box(r * 0.9, r * 0.12, w + 0.08, C.dgray, { x, y, z, rz: i * PI / 3, surface: 'metal' }), 'wheel', pivot, opts)) : []),
    ...(r > 0.6 ? [articulate(cyl(r * 0.2, r * 0.2, w + 0.1, C.dark, { x, y, z, rx: PI / 2, segments: 6 }), 'wheel', pivot, opts)] : []),
  ];
};

// Ladder lying along X: two rails + rungs
const ladderParts = (len, y, x = 0, z = 0, w = 0.9, color = C.silver, rung = 0.7) => {
  const p = [
    box(len, 0.12, 0.12, color, { x, y, z: z + w / 2 }),
    box(len, 0.12, 0.12, color, { x, y, z: z - w / 2 }),
  ];
  for (let i = 0; i * rung < len - 0.2; i++) p.push(box(0.07, 0.07, w, C.gray, { x: x - len / 2 + 0.2 + i * rung, y, z }));
  return p;
};

const lightBar = (x, y, z = 0, w = 1.6) => [
  rbox(0.5, 0.2, w, C.dark, { x, y, z, segments: 1, bevel: 0.05 }),
  rbox(0.42, 0.24, w * 0.42, C.red, { emissive: 1.6, x, y: y + 0.06, z: z + w * 0.24, segments: 1, bevel: 0.08 }),
  rbox(0.42, 0.24, w * 0.42, C.blue, { emissive: 1.6, x, y: y + 0.06, z: z - w * 0.24, segments: 1, bevel: 0.08 }),
];

const car = (body, roof = body) => [
  box(4.2, 0.2, 1.7, C.dark, { y: 0.4 }),
  rbox(4.4, 0.62, 1.9, body, { surface: 'paint', y: 0.74, segments: 2, bevel: 0.18 }),
  rbox(2.4, 0.72, 1.76, roof, { surface: 'paint', y: 1.4, x: -0.35, segments: 2, bevel: 0.22 }),
  box(2.0, 0.4, 1.8, C.glass, { y: 1.44, x: -0.35 }),
  box(0.05, 0.4, 1.5, C.glass, { y: 1.44, x: 0.86 }),
  box(0.05, 0.4, 1.5, C.glass, { y: 1.44, x: -1.56 }),
  box(0.06, 0.42, 1.82, roof, { surface: 'paint', y: 1.44, x: -0.35 }),
  box(0.06, 0.42, 1.82, roof, { surface: 'paint', y: 1.44, x: -1.0 }),
  rbox(1.9, 0.08, 1.55, C.white, { y: 1.78, x: -0.35, segments: 1, bevel: 0.03 }),
  // bumpers, grille, lights, plate
  rbox(0.22, 0.28, 1.95, C.silver, { y: 0.55, x: 2.2, segments: 1, bevel: 0.06 }),
  rbox(0.22, 0.28, 1.95, C.silver, { y: 0.55, x: -2.2, segments: 1, bevel: 0.06 }),
  box(0.06, 0.2, 0.8, C.dark, { y: 0.85, x: 2.21 }),
  box(0.1, 0.2, 0.42, '#fff6c8', { emissive: 0.8, y: 0.95, x: 2.2, z: 0.68 }),
  box(0.1, 0.2, 0.42, '#fff6c8', { emissive: 0.8, y: 0.95, x: 2.2, z: -0.68 }),
  box(0.1, 0.18, 0.38, '#e0201a', { y: 0.95, x: -2.2, z: 0.7 }),
  box(0.1, 0.18, 0.38, '#e0201a', { y: 0.95, x: -2.2, z: -0.7 }),
  // door lines + handles + mirrors
  box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: 0.5, z: 0.96 }),
  box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: -1.2, z: 0.96 }),
  box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: 0.5, z: -0.96 }),
  box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: -1.2, z: -0.96 }),
  box(0.2, 0.06, 0.06, C.silver, { y: 1.0, x: -0.3, z: 0.96 }),
  box(0.2, 0.06, 0.06, C.silver, { y: 1.0, x: -0.3, z: -0.96 }),
  box(0.16, 0.16, 0.14, body, { surface: 'paint', y: 1.3, x: 0.78, z: 1.0 }),
  box(0.16, 0.16, 0.14, body, { surface: 'paint', y: 1.3, x: 0.78, z: -1.0 }),
  ...wheel(1.4, 0.4, 0.92, 0.4, 0.32), ...wheel(1.4, 0.4, -0.92, 0.4, 0.32),
  ...wheel(-1.4, 0.4, 0.92, 0.4, 0.32), ...wheel(-1.4, 0.4, -0.92, 0.4, 0.32),
];

// Window on a wall facing +Z (face = 'z') or +X (face = 'x'); sign = +1/-1 for the opposite face. The wall behind is solid,
// so the window is a deep-framed unit standing just proud of the wall: frame, jambs, mullion, sill and a pane that reads as inset.
const win = (x, y, z, w, h, face = 'z', sign = 1, frame = C.white, pane = C.glass) => {
  const d = 0.12, o = { frame: 0.11, frameColor: frame, glassColor: pane, mullion: true };
  return face === 'z'
    ? recessedWindow(w, h, d, { ...o, x, y, z: z + sign * (d + 0.012), ry: sign > 0 ? 0 : PI })
    : recessedWindow(w, h, d, { ...o, x: x + sign * (d + 0.012), y, z, ry: sign > 0 ? PI / 2 : -PI / 2 });
};

/**
 * Box-shaped building shell with real window openings cut through its walls (windows sit recessed inside them).
 * x/z are the centre of the footprint, y0 the base. Openings: front/back {x,y,w,h}, left/right {z,y,w,h} (world y).
 * front = +Z, back = -Z, right = +X, left = -X. Returns parts (core + 4 walls + windows).
 */
const shell = (w, d, h, y0, color, { front = [], back = [], left = [], right = [], cx = 0, cz = 0, t = 0.3, surface = 'stucco', frame = C.white, glass = C.glass, depth = 0.2, mullion = true } = {}) => {
  const p = [box(w - 2 * t + 0.02, h, d - 2 * t + 0.02, color, { x: cx, y: y0 + h / 2, z: cz, surface })];
  const walls = [
    [w, front, 'x', 1, { z: cz + d / 2 - t / 2, x: cx, ry: 0 }],
    [w, back, 'x', -1, { z: cz - d / 2 + t / 2, x: cx, ry: PI }],
    [d - 2 * t, right, 'z', -1, { x: cx + w / 2 - t / 2, z: cz, ry: PI / 2 }],
    [d - 2 * t, left, 'z', 1, { x: cx - w / 2 + t / 2, z: cz, ry: -PI / 2 }],
  ];
  for (const [len, list, key, sgn, at] of walls) {
    // openings are given in world coordinates: shift into the wall's local frame (x along the wall)
    const local = list.map((q) => ({ x: sgn * ((key === 'x' ? q.x - cx : q.z - cz)), y: q.y - y0, width: q.w, height: q.h }));
    p.push(...facadeWall(len, h, t, color, local, { ...at, y: y0, surface }));
    for (const q of list) {
      const wo = { frame: 0.11, frameColor: frame, glassColor: glass, mullion };
      if (at.ry === 0) p.push(...recessedWindow(q.w, q.h, depth, { ...wo, x: q.x, y: q.y, z: at.z + t / 2 }));
      else if (at.ry === PI) p.push(...recessedWindow(q.w, q.h, depth, { ...wo, x: q.x, y: q.y, z: at.z - t / 2, ry: PI }));
      else if (at.ry === PI / 2) p.push(...recessedWindow(q.w, q.h, depth, { ...wo, x: at.x + t / 2, y: q.y, z: q.z, ry: PI / 2 }));
      else p.push(...recessedWindow(q.w, q.h, depth, { ...wo, x: at.x - t / 2, y: q.y, z: q.z, ry: -PI / 2 }));
    }
  }
  return p;
};

const house = (wall, roof, door, trim = C.white) => {
  const p = [
    box(6.4, 0.3, 5.6, C.gray, { y: 0.15 }),
    // walls with real window openings (windows sit recessed in them)
    box(5.4, 2.9, 4.6, wall, { y: 1.6, surface: 'stucco' }),
    ...facadeWall(6, 2.9, 0.3, wall, [{ x: 1.6, y: 1.65, width: 1.2, height: 1.1 }], { y: 0.15, z: 2.45 }),
    ...facadeWall(6, 2.9, 0.3, wall, [{ x: 1.2, y: 1.65, width: 1.1, height: 1.0 }, { x: -1.4, y: 1.65, width: 1.1, height: 1.0 }], { y: 0.15, z: -2.45, ry: PI }),
    ...[1, -1].flatMap((sd) => facadeWall(4.6, 2.9, 0.3, wall, [{ x: 0, y: 1.65, width: 1.1, height: 1.0 }], { y: 0.15, x: sd * 2.85, ry: sd * PI / 2 })),
    // gable roof: two slabs with overhang + ridge + gable triangles
    rbox(6.8, 0.2, 3.9, roof, { y: 4.15, z: 1.5, rx: 0.65, segments: 1, bevel: 0.05, surface: 'roof' }),
    rbox(6.8, 0.2, 3.9, roof, { y: 4.15, z: -1.5, rx: -0.65, segments: 1, bevel: 0.05, surface: 'roof' }),
    rbox(6.9, 0.22, 0.4, roof, { y: 5.28, segments: 1, bevel: 0.05, surface: 'roof' }),
    extrude([[-2.6, 0], [2.6, 0], [0, 2.15]], 0.12, wall, { y: 3.05, x: 3.0, ry: PI / 2, surface: 'stucco' }),
    extrude([[-2.6, 0], [2.6, 0], [0, 2.15]], 0.12, wall, { y: 3.05, x: -3.0, ry: PI / 2, surface: 'stucco' }),
    box(0.05, 0.6, 0.6, C.glass, { y: 3.9, x: 3.08 }), box(0.05, 0.6, 0.6, C.glass, { y: 3.9, x: -3.08 }),
    // chimney
    rbox(0.9, 1.8, 0.9, C.brick, { y: 4.6, x: 1.7, z: -1.0, segments: 1, bevel: 0.06 }),
    box(1.1, 0.14, 1.1, C.dgray, { y: 5.55, x: 1.7, z: -1.0 }),
    // door, frame, step, knob, porch roof
    box(1.3, 2.2, 0.08, trim, { y: 1.2, x: -1.3, z: 2.62, surface: 'paint' }),
    rbox(1.0, 1.95, 0.1, door, { y: 1.1, x: -1.3, z: 2.66, segments: 1, bevel: 0.04 }),
    sphere(0.07, C.yellow, { y: 1.1, x: -0.95, z: 2.75, segments: 6, rings: 5, surface: 'metal' }),
    box(0.5, 0.5, 0.06, C.glass, { y: 1.7, x: -1.3, z: 2.72 }),
    rbox(2.2, 0.14, 1.0, C.lgray, { y: 0.22, x: -1.3, z: 3.1, segments: 1, bevel: 0.04 }),
    rbox(2.0, 0.14, 1.2, roof, { y: 2.55, x: -1.3, z: 3.0, rx: 0.15, segments: 1, bevel: 0.04, surface: 'roof' }),
    box(0.1, 2.3, 0.1, trim, { y: 1.3, x: -2.2, z: 3.45, surface: 'paint' }), box(0.1, 2.3, 0.1, trim, { y: 1.3, x: -0.4, z: 3.45, surface: 'paint' }),
    // recessed windows with shutters
    ...recessedWindow(1.2, 1.1, 0.2, { x: 1.6, y: 1.8, z: 2.6, frameColor: trim, mullion: true }),
    box(0.35, 1.3, 0.08, door, { y: 1.8, x: 0.8, z: 2.63, surface: 'wood' }), box(0.35, 1.3, 0.08, door, { y: 1.8, x: 2.4, z: 2.63, surface: 'wood' }),
    ...[1, -1].flatMap((sd) => recessedWindow(1.1, 1.0, 0.2, { x: sd * 3.0, y: 1.8, z: 0, ry: sd * PI / 2, frameColor: trim, mullion: true })),
    ...[-1.2, 1.4].flatMap((x) => recessedWindow(1.1, 1.0, 0.2, { x, y: 1.8, z: -2.6, ry: PI, frameColor: trim, mullion: true })),
  ];
  return p;
};

const flame1 = (x, y, z, s) => [
  lathe([[0, 0], [0.5, 0.15], [0.58, 0.5], [0.4, 1.2], [0.14, 1.9], [0, 2.3]], '#ff5a1f', { emissive: 1.4, x, y, z, sx: s, sy: s, sz: s, segments: 8 }),
  lathe([[0, 0], [0.38, 0.15], [0.44, 0.5], [0.28, 1.1], [0.09, 1.6], [0, 1.95]], '#ff9d1c', { emissive: 1.4, x: x + 0.05 * s, y, z, sx: s, sy: s, sz: s, segments: 8 }),
  lathe([[0, 0], [0.22, 0.12], [0.25, 0.4], [0.14, 0.8], [0, 1.25]], '#ffe45a', { emissive: 1.4, x, y, z: z + 0.05 * s, sx: s, sy: s, sz: s, segments: 8 }),
];
/** Flame cluster: a main tongue with two smaller ones beside it. */
const flame = (x, y, z, s = 1) => [
  ...flame1(x, y, z, s),
  ...flame1(x + 0.55 * s, y, z + 0.25 * s, s * 0.55),
  ...flame1(x - 0.5 * s, y, z - 0.3 * s, s * 0.7),
];

/** Standing person, faces +X. */
const person = (o) => {
  const { coat, pants, hat, boots = C.black, hair = C.hair, skin = C.skin, vest = null } = o;
  const p = [];
  for (const side of [-1, 1]) {
    const hip = [0, 0.58, side * 0.11], knee = [0, 0.32, side * 0.11], lo = { side, hip };
    p.push(
      articulate(cyl(0.1, 0.09, 0.3, pants, { y: 0.43, z: side * 0.11, segments: 8, flat: false, surface: 'fabric' }), 'leg', hip, lo),
      articulate(cyl(0.09, 0.085, 0.3, pants, { y: 0.17, z: side * 0.11, segments: 8, flat: false, surface: 'fabric' }), 'shin', knee, lo),
      articulate(box(0.32, 0.12, 0.17, boots, { y: 0.06, x: 0.05, z: side * 0.11, surface: 'rubber' }), 'shin', knee, lo),
      // sleeve + glove swing together about the shoulder
      ...[
        cyl(0.07, 0.065, 0.55, coat, { y: 0.88, z: side * 0.31, rx: side * 0.25, segments: 8, flat: false, surface: 'fabric' }),
        sphere(0.08, C.black, { y: 0.62, z: side * 0.37, segments: 6, rings: 5, surface: 'rubber' }),
      ].map((g) => articulate(g, 'arm', [0, 1.12, side * 0.3], { side })),
    );
  }
  p.push(
    cyl(0.22, 0.26, 0.6, coat, { y: 0.85, segments: 10, surface: 'fabric' }),
    ...(vest ? [cyl(0.235, 0.27, 0.08, vest, { y: 0.72, segments: 10, surface: 'fabric', textureStrength: 0.3 }), cyl(0.225, 0.245, 0.08, vest, { y: 0.95, segments: 10, surface: 'fabric', textureStrength: 0.3 })] : []),
    cyl(0.265, 0.265, 0.07, C.dark, { y: 0.58, segments: 10, surface: 'fabric' }),
    sphere(0.19, skin, { y: 1.37, segments: 10, rings: 8 }),
    sphere(0.05, skin, { y: 1.34, x: 0.19, segments: 6, rings: 4 }),
    box(0.04, 0.05, 0.05, C.dark, { y: 1.39, x: 0.17, z: 0.08 }),
    box(0.04, 0.05, 0.05, C.dark, { y: 1.39, x: 0.17, z: -0.08 }),
    sphere(0.19, hair, { y: 1.42, x: -0.06, sy: 0.85, segments: 8, rings: 6, flat: false }),
    ...hat,
  );
  return p;
};

// ---- emergency-map helpers ------------------------------------------------------------------------------------------
const _Y = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _qq = new THREE.Quaternion();
const _ee = new THREE.Euler();
/** Round tube between two 3D points. */
const tube = (a, b, r, color, seg = 6) => {
  _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _v.length();
  _ee.setFromQuaternion(_qq.setFromUnitVectors(_Y, _v.normalize()), 'XYZ');
  return cyl(r, r, len, color, {
    x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2, rx: _ee.x, ry: _ee.y, rz: _ee.z, segments: seg, flat: false,
  });
};
/** Polyline of tubes following fn(t) for t in 0..1. */
const curve = (fn, n, r, color, seg = 5) => {
  const out = [];
  let p = fn(0);
  for (let i = 1; i <= n; i++) {
    const q = fn(i / n);
    out.push(tube(p, q, r, color, seg));
    p = q;
  }
  return out;
};
const WATER = '#7fd3ff';
const WATER2 = '#c4ecff';
/** Water jet: parabolic arc from a to b with `lift` extra height mid-way, plus splash droplets at the end. */
const jet = (a, b, lift, r = 0.1) => [
  ...curve((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * lift * t * (1 - t), a[2] + (b[2] - a[2]) * t], 9, r, WATER),
  sphere(0.2, WATER2, { x: b[0], y: b[1], z: b[2], segments: 6, rings: 4 }),
  sphere(0.14, WATER2, { x: b[0] + 0.3, y: b[1] + 0.35, z: b[2] + 0.2, segments: 5, rings: 4 }),
  sphere(0.14, WATER2, { x: b[0] + 0.15, y: b[1] - 0.4, z: b[2] - 0.25, segments: 5, rings: 4 }),
];

// aerial ladder swung out to the truck's +Z side and raised (turntable at local x = -5)
const ladderUp = () => {
  const base = [-5, 4.4, 0.4];
  const E = 0.6;
  const len = 13.5;
  const dir = [0, Math.sin(E), Math.cos(E)];
  const tip = [base[0], base[1] + len * dir[1], base[2] + len * dir[2]];
  const p = [
    tube([-5, 3.5, -0.4], [-5, 5.8, 3.4], 0.16, C.silver, 7), // hydraulic ram
    ...[-0.55, 0.55].map((dx) => tube([base[0] + dx, base[1], base[2]], [tip[0] + dx, tip[1], tip[2]], 0.13, C.silver, 7)),
    tube([base[0], base[1] - 0.25, base[2]], [tip[0], tip[1] - 0.25, tip[2]], 0.09, C.gray, 6),
    rbox(1.3, 0.9, 1.4, C.yellow, { x: tip[0], y: tip[1] + 0.35, z: tip[2] + 0.3, segments: 1, bevel: 0.08 }),
    rbox(1.4, 0.08, 1.5, C.dgray, { x: tip[0], y: tip[1] - 0.12, z: tip[2] + 0.3, segments: 1, bevel: 0.02 }),
    sphere(0.16, C.silver, { x: tip[0], y: tip[1] + 0.95, z: tip[2] + 0.95, segments: 6, rings: 5 }),
  ];
  for (let i = 1; i * 0.62 < len; i++) {
    const t = i * 0.62;
    p.push(box(1.1, 0.07, 0.07, C.gray, { x: base[0], y: base[1] + t * dir[1], z: base[2] + t * dir[2] }));
  }
  // second ladder section riding on top, water jet down onto the roof from the basket
  p.push(...jet([tip[0], tip[1] + 0.9, tip[2] + 1.0], [tip[0], tip[1] - 3.4, tip[2] + 4.0], 1.4, 0.13));
  return p;
};

const soot = '#2a2522';
const char = '#3d342f';
const ash = '#6f6259';
const smokeCols = ['#4a4a50', '#5a5a61', '#6b6b72', '#7d7d84', '#8f8f96', '#a2a2a8'];

/** window on a +Z wall (wall plane z): mode 'ok' | 'fire' | 'dark' */
const fwin = (x, y, z, mode, w = 1.3, h = 1.7, trim = C.white) => {
  if (mode === 'ok') return win(x, y, z, w, h, 'z', 1, trim);
  const fire = mode === 'fire';
  const p = [
    box(w * 1.05, h * 1.8, 0.06, soot, { x, y: y + h * 0.95, z: z + 0.03 }), // soot streak above
    box(w + 0.3, h + 0.3, 0.1, char, { x, y, z: z + 0.05 }),
    box(w, h, 0.12, fire ? C.orange : '#15161a', { emissive: fire ? 1.2 : 0, x, y, z: z + 0.1 }),
    box(0.08, h, 0.14, '#2a2522', { x, y, z: z + 0.12 }),
    box(w, 0.08, 0.14, '#2a2522', { x, y, z: z + 0.12 }),
    box(w + 0.5, 0.1, 0.25, ash, { x, y: y - h / 2 - 0.16, z: z + 0.15 }),
  ];
  if (fire) {
    p.push(box(w * 0.6, h * 0.55, 0.15, C.yellow, { emissive: 1.5, x, y: y - h * 0.12, z: z + 0.13 }), ...flame(x, y - h / 2 + 0.05, z + 0.3, 0.8));
  }
  p.push(
    sphere(0.4, '#54545b', { x, y: y + h / 2 + 1.5, z: z + 0.7, segments: 7, rings: 5, flat: false }),
    sphere(0.3, '#6a6a71', { x: x + 0.2, y: y + h / 2 + 2.3, z: z + 0.9, segments: 7, rings: 5, flat: false }),
  );
  return p;
};

const smokeStack = (x, y, z, n = 5, dx = 0.8, dz = 0.25, r0 = 1.2, dr = 0.28, dy = 2.1) =>
  Array.from({ length: n }, (_, i) =>
    sphere(r0 + i * dr, smokeCols[Math.min(i, smokeCols.length - 1)], { x: x + i * dx, y: y + i * dy, z: z + i * dz, segments: 9, rings: 6, flat: false }));

/** slab-mounted decoration on a gable roof: front slab (z>0) or back slab; s = distance towards the eave along the slope */
const roofGeo = { th: 0.62, cz: 2.45, cy: 9.2 };
const roofAt = (front, s, t = 0.17) => {
  const { th, cz, cy } = roofGeo;
  const sg = front ? 1 : -1;
  return { y: cy - s * Math.sin(th) + t * Math.cos(th), z: sg * (cz + s * Math.cos(th) + t * Math.sin(th)), rx: sg * th };
};

const burningHouseA = () => {
  const wall = '#e9dcc0';
  const roof = '#7a3f34';
  const trim = C.white;
  const th = roofGeo.th;
  const p = [
    rbox(12.8, 0.5, 9.8, C.gray, { y: 0.25, segments: 1, bevel: 0.08 }),
    rbox(12, 7, 9, wall, { y: 4.0, segments: 1, bevel: 0.1 }),
    box(12.2, 0.3, 9.2, trim, { y: 4.0 }),
    box(12.2, 0.4, 9.2, C.lgray, { y: 0.7 }),
    // roof slabs + ridge + gables
    rbox(13.4, 0.25, 6.1, roof, { y: roofGeo.cy, z: roofGeo.cz, rx: th, segments: 1, bevel: 0.05 }),
    rbox(13.4, 0.25, 6.1, roof, { y: roofGeo.cy, z: -roofGeo.cz, rx: -th, segments: 1, bevel: 0.05 }),
    rbox(13.5, 0.32, 0.55, '#5a2f28', { y: 10.95, segments: 1, bevel: 0.05 }),
    extrude([[-4.5, 0], [4.5, 0], [0, 3.4]], 0.15, wall, { y: 7.5, x: 6.0, ry: PI / 2 }),
    extrude([[-4.5, 0], [4.5, 0], [0, 3.4]], 0.15, wall, { y: 7.5, x: -6.0, ry: PI / 2 }),
    box(0.06, 0.9, 0.9, '#15161a', { y: 9.0, x: 6.1 }), box(0.06, 0.9, 0.9, C.glass, { y: 9.0, x: -6.1 }),
    // chimney (sooty)
    rbox(1.0, 2.6, 1.0, C.brick, { y: 10.4, x: 4.2, z: -1.8, segments: 1, bevel: 0.05 }),
    box(1.2, 0.16, 1.2, C.dark, { y: 11.75, x: 4.2, z: -1.8 }),
  ];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(box(0.26, 7, 0.26, trim, { x: sx * 6.05, y: 4, z: sz * 4.55 }));
  // scorch on the roof: burnt patches, exposed rafters
  for (const [x, s, w, l] of [[-2.6, 0.3, 4.6, 3.2], [3.2, -0.5, 3.4, 2.4]]) {
    const g = roofAt(true, s);
    p.push(rbox(w, 0.1, l, soot, { x, y: g.y, z: g.z, rx: g.rx, segments: 1, bevel: 0.03 }));
    for (let i = 0; i < 5; i++) {
      const r = roofAt(true, s, 0.3);
      p.push(box(0.16, 0.16, l * 0.92, '#171412', { x: x - w / 2 + 0.5 + i * (w - 1) / 4, y: r.y, z: r.z, rx: r.rx }));
    }
  }
  {
    const g = roofAt(false, 0.2, 0.15);
    p.push(rbox(6, 0.1, 3.6, soot, { x: 0.5, y: g.y, z: g.z, rx: g.rx, segments: 1, bevel: 0.03 }));
    const g2 = roofAt(false, -1.5, 0.3);
    for (let i = 0; i < 6; i++) p.push(box(0.16, 0.16, 3.2, '#171412', { x: -2.0 + i * 1.0, y: g2.y, z: g2.z, rx: g2.rx }));
  }
  // charred front wall: ash halo + black core around the burning windows
  p.push(
    rbox(4.6, 5.6, 0.1, ash, { x: 3.2, y: 4.4, z: 4.52, segments: 1, bevel: 0.04 }),
    rbox(3.2, 4.4, 0.1, char, { x: 3.4, y: 4.0, z: 4.58, segments: 1, bevel: 0.04 }),
    rbox(5.0, 2.8, 0.1, ash, { x: -3.6, y: 6.2, z: 4.52, segments: 1, bevel: 0.04 }),
    rbox(3.0, 1.8, 0.1, char, { x: -3.2, y: 6.6, z: 4.58, segments: 1, bevel: 0.04 }),
    rbox(2.2, 1.6, 0.1, char, { x: 0.2, y: 6.9, z: 4.55, segments: 1, bevel: 0.04 }),
    rbox(0.1, 4.0, 4.2, ash, { x: 6.02, y: 5.0, z: 0.6, segments: 1, bevel: 0.04 }),
    rbox(0.1, 2.6, 2.6, char, { x: 6.06, y: 5.6, z: 0.4, segments: 1, bevel: 0.04 }),
  );
  // windows: ground (x = -1.4 dark, 3.8 fire), upper (-4.0 fire, 0 fire, 4.0 dark)
  p.push(
    ...fwin(-1.2, 2.5, 4.5, 'ok'), ...fwin(3.8, 2.5, 4.5, 'fire'),
    ...fwin(-4.0, 5.9, 4.5, 'fire'), ...fwin(0, 5.9, 4.5, 'fire'), ...fwin(4.0, 5.9, 4.5, 'dark'),
  );
  // front door + porch
  p.push(
    box(1.7, 2.9, 0.1, trim, { x: -4.3, y: 2.0, z: 4.53 }),
    rbox(1.35, 2.6, 0.12, C.dwood, { x: -4.3, y: 1.9, z: 4.58, segments: 1, bevel: 0.04 }),
    sphere(0.08, C.yellow, { x: -3.8, y: 1.9, z: 4.7, segments: 6, rings: 5 }),
    box(0.55, 0.7, 0.05, C.glass, { x: -4.3, y: 2.6, z: 4.66 }),
    rbox(3.0, 0.2, 2.0, roof, { x: -4.3, y: 3.75, z: 5.5, rx: 0.12, segments: 1, bevel: 0.04 }),
    box(0.14, 3.3, 0.14, trim, { x: -5.6, y: 2.2, z: 6.3 }), box(0.14, 3.3, 0.14, trim, { x: -3.0, y: 2.2, z: 6.3 }),
    rbox(3.0, 0.2, 1.3, C.lgray, { x: -4.3, y: 0.62, z: 5.4, segments: 1, bevel: 0.04 }),
    rbox(2.6, 0.2, 0.7, C.lgray, { x: -4.3, y: 0.42, z: 6.4, segments: 1, bevel: 0.04 }),
  );
  // side windows + a flame licking out of the right upper one
  p.push(
    ...win(6.0, 2.5, -1.4, 1.1, 1.4, 'x', 1, trim), ...win(-6.0, 2.5, -1.4, 1.1, 1.4, 'x', -1, trim), ...win(-6.0, 5.9, 0, 1.1, 1.4, 'x', -1, trim),
    box(0.12, 1.4, 1.1, C.orange, { emissive: 1.2, x: 6.1, y: 5.9, z: 0.2 }), box(0.14, 0.8, 0.6, C.yellow, { x: 6.12, y: 5.7, z: 0.2 }),
    ...flame(6.5, 5.2, 0.2, 0.9),
  );
  // flames through the roof and windows
  const f = (front, s, x, sc) => { const g = roofAt(front, s); return flame(x, g.y - 0.15, g.z, sc); };
  p.push(
    ...f(true, 0.6, -2.4, 1.7), ...f(true, 1.4, 2.8, 1.3), ...f(false, 0.4, 0.4, 2.0), ...f(false, -0.8, -2.8, 1.5), ...f(false, 1.2, 3.6, 1.2),
    ...flame(0.2, 10.7, 0.3, 2.3),
  );
  p.push(...smokeStack(0.6, 13.6, 0.3, 5, 0.9, 0.2, 1.0, 0.22, 2.0));
  return p;
};

const burningHouseB = () => {
  const brick = '#a94f38';
  const trimC = '#f3ecdc';
  const roof = '#4a4f5c';
  const th = 0.6;
  const p = [
    rbox(15, 0.5, 9.6, C.gray, { y: 0.25, segments: 1, bevel: 0.08 }),
    // main block x -7..1.5, depth 8, and garage wing x 1.5..7
    rbox(8.5, 7, 8, brick, { x: -2.75, y: 4.0, segments: 1, bevel: 0.1 }),
    rbox(5.5, 3.6, 7, '#b85c44', { x: 4.25, y: 2.3, segments: 1, bevel: 0.1 }),
    box(8.7, 0.3, 8.2, trimC, { x: -2.75, y: 4.0 }),
    box(8.7, 0.4, 8.2, C.lgray, { x: -2.75, y: 0.7 }),
    // main roof: ridge along Z (front gable), slopes to +-X
    rbox(6.0, 0.25, 8.9, roof, { x: -5.15, y: 9.35, rz: th, segments: 1, bevel: 0.05 }),
    rbox(6.0, 0.25, 8.9, roof, { x: -0.35, y: 9.35, rz: -th, segments: 1, bevel: 0.05 }),
    rbox(0.5, 0.3, 8.9, '#33373f', { x: -2.75, y: 10.5, segments: 1, bevel: 0.05 }),
    extrude([[-4.25, 0], [4.25, 0], [0, 3.0]], 0.2, brick, { x: -2.75, y: 7.5, z: 4.0 }),
    extrude([[-4.25, 0], [4.25, 0], [0, 3.0]], 0.2, brick, { x: -2.75, y: 7.5, z: -4.0 }),
    // garage roof (low pitch)
    rbox(3.6, 0.22, 7.6, roof, { x: 2.75, y: 4.55, rz: 0.3, segments: 1, bevel: 0.05 }),
    rbox(3.6, 0.22, 7.6, roof, { x: 5.9, y: 4.55, rz: -0.3, segments: 1, bevel: 0.05 }),
    extrude([[-2.75, 0], [2.75, 0], [0, 0.9]], 0.16, '#b85c44', { x: 4.25, y: 4.1, z: 3.5 }),
    // chimney
    rbox(1.0, 3.0, 1.0, C.dbrick, { x: -6.0, y: 9.5, z: 0.5, segments: 1, bevel: 0.05 }),
    box(1.2, 0.16, 1.2, C.dark, { x: -6.0, y: 11.05, z: 0.5 }),
    // round attic window in the gable
    cyl(0.7, 0.7, 0.12, trimC, { x: -2.75, y: 8.7, z: 4.14, rx: PI / 2, segments: 16 }),
    cyl(0.55, 0.55, 0.16, C.orange, { x: -2.75, y: 8.7, z: 4.16, rx: PI / 2, segments: 16 }),
    cyl(0.3, 0.3, 0.18, C.yellow, { x: -2.75, y: 8.6, z: 4.17, rx: PI / 2, segments: 12 }),
  ];
  for (const x of [-7.05, 1.55]) p.push(box(0.26, 7, 0.26, trimC, { x, y: 4, z: 4.05 }));
  // scorched roof panels + rafters (left slope burnt through)
  p.push(
    rbox(4.4, 0.1, 5.4, soot, { x: -5.25, y: 9.5, z: -0.6, rz: th, segments: 1, bevel: 0.03 }),
    rbox(2.6, 0.1, 3.4, soot, { x: -0.25, y: 9.66, z: 1.4, rz: -th, segments: 1, bevel: 0.03 }),
    ...Array.from({ length: 5 }, (_, i) => {
      const lx = -2 + i * 1.0;
      return box(0.16, 0.16, 5.0, '#171412', { x: -5.15 + lx * Math.cos(th) - 0.3 * Math.sin(th), y: 9.35 + lx * Math.sin(th) + 0.3 * Math.cos(th), z: -0.6, rz: th });
    }),
  );
  // front wall soot
  p.push(
    rbox(4.0, 5.4, 0.1, ash, { x: -2.6, y: 3.8, z: 4.03, segments: 1, bevel: 0.04 }),
    rbox(2.4, 3.6, 0.1, char, { x: -3.2, y: 4.2, z: 4.09, segments: 1, bevel: 0.04 }),
    rbox(4.4, 2.6, 0.1, char, { x: 4.4, y: 2.2, z: 3.56, segments: 1, bevel: 0.04 }),
  );
  // windows: ground (-5.4 ok, -0.2 fire), upper (-5.2 dark, -2.75 fire, -0.3 fire); garage door burnt
  p.push(
    ...fwin(-5.3, 2.5, 4.0, 'ok', 1.3, 1.6, trimC), ...fwin(-0.2, 2.5, 4.0, 'fire', 1.3, 1.6, trimC),
    ...fwin(-5.2, 5.8, 4.0, 'dark', 1.3, 1.6, trimC), ...fwin(-2.75, 5.8, 4.0, 'fire', 1.3, 1.6, trimC), ...fwin(-0.3, 5.8, 4.0, 'fire', 1.3, 1.6, trimC),
    rbox(3.8, 2.6, 0.12, '#2b2b2f', { x: 4.25, y: 1.8, z: 3.55, segments: 1, bevel: 0.04 }),
    ...[0, 1, 2, 3].map((i) => box(3.6, 0.06, 0.14, '#111114', { x: 4.25, y: 1.0 + i * 0.6, z: 3.6 })),
    box(3.0, 1.8, 0.14, '#ff8a1a', { x: 4.25, y: 1.4, z: 3.5, sy: 0.55 }),
    ...flame(3.6, 0.7, 3.9, 1.0), ...flame(4.9, 0.7, 3.9, 0.8),
  );
  // front door + porch with columns
  p.push(
    box(1.7, 2.9, 0.1, trimC, { x: -3.0, y: 2.0, z: 4.03 }),
    rbox(1.35, 2.6, 0.12, C.dgreen, { x: -3.0, y: 1.9, z: 4.08, segments: 1, bevel: 0.04 }),
    sphere(0.08, C.yellow, { x: -2.5, y: 1.9, z: 4.2, segments: 6, rings: 5 }),
    rbox(3.4, 0.22, 2.2, roof, { x: -3.0, y: 3.65, z: 5.1, rx: 0.1, segments: 1, bevel: 0.04 }),
    ...[-4.4, -1.6].map((x) => cyl(0.14, 0.14, 3.2, trimC, { x, y: 2.1, z: 6.0, segments: 8, flat: false })),
    rbox(3.6, 0.2, 1.6, C.lgray, { x: -3.0, y: 0.62, z: 5.1, segments: 1, bevel: 0.04 }),
    rbox(3.0, 0.2, 0.8, C.lgray, { x: -3.0, y: 0.42, z: 6.2, segments: 1, bevel: 0.04 }),
  );
  // side windows
  p.push(...win(-7.0, 2.5, -1.0, 1.1, 1.4, 'x', -1, trimC), ...win(-7.0, 5.8, 0.5, 1.1, 1.4, 'x', -1, trimC));
  p.push(...flame(-7.4, 5.0, 0.5, 0.9), box(0.12, 1.4, 1.1, C.orange, { emissive: 1.2, x: -7.1, y: 5.8, z: 0.5 }));
  // flames: roof (left slope, ridge, garage), smoke
  p.push(
    ...flame(-5.4, 9.4, -0.6, 2.0), ...flame(-4.6, 9.2, 2.2, 1.5), ...flame(-2.75, 10.4, -1.5, 2.3), ...flame(-3.6, 10.6, 1.2, 1.4),
    ...flame(0.2, 9.0, -1.8, 1.4), ...flame(2.8, 4.9, -1.0, 1.1),
  );
  p.push(...smokeStack(-3.6, 13.0, -0.2, 5, -0.7, -0.1, 1.0, 0.22, 2.0));
  p.push(sphere(0.9, '#3e3e44', { x: 3.4, y: 6.2, z: 0.0, segments: 8, rings: 6, flat: false }), sphere(0.75, '#5b5b62', { x: 3.9, y: 7.4, z: -0.4, segments: 8, rings: 6, flat: false }));
  return p;
};

/** Police station. Front faces +Z. Main block x -10..10, garage annex x 10..16. */
const policeStationParts = () => {
  const stone = '#d3d8de';
  const navy = '#233a73';
  const blue = '#2b6bff';
  const p = [
    rbox(20.8, 0.5, 12.8, C.gray, { y: 0.25, segments: 1, bevel: 0.08 }),
    ...shell(20, 12, 8, 0.5, stone, {
      surface: 'stone',
      front: [...[-8.4, -5.6, 5.6, 8.4].map((x) => ({ x, y: 2.9, w: 1.6, h: 1.8 })), ...[-8.4, -5.6, -2.8, 2.8, 5.6, 8.4].map((x) => ({ x, y: 6.6, w: 1.6, h: 1.8 }))],
      left: [-2.5, 2.5].flatMap((z) => [2.9, 6.6].map((y) => ({ z, y, w: 1.6, h: 1.8 }))),
      right: [-2.5, 2.5].map((z) => ({ z, y: 6.6, w: 1.6, h: 1.8 })),
    }),
    rbox(20.2, 1.3, 12.2, '#8f98a3', { y: 1.15, segments: 1, bevel: 0.08 }),
    rbox(20.3, 0.5, 12.3, navy, { y: 4.7, segments: 1, bevel: 0.06 }),
    rbox(20.9, 0.6, 12.9, C.white, { y: 8.75, segments: 1, bevel: 0.08 }),
    box(19.4, 0.3, 11.4, '#6d747c', { y: 9.1 }),
    // roof parapet
    box(20.4, 0.6, 0.3, '#aab2bb', { y: 9.35, z: 6.05 }), box(20.4, 0.6, 0.3, '#aab2bb', { y: 9.35, z: -6.05 }),
    box(0.3, 0.6, 12, '#aab2bb', { y: 9.35, x: 10.05 }), box(0.3, 0.6, 12, '#aab2bb', { y: 9.35, x: -10.05 }),
    // corner pilasters
    ...[-9.85, 9.85].map((x) => rbox(0.6, 8, 0.5, navy, { x, y: 4.5, z: 6.05, segments: 1, bevel: 0.05 })),
  ];
  // portico: columns, roof slab, steps, doors, sign board with badge and light bar
  p.push(
    rbox(10.4, 0.6, 4.2, C.white, { y: 6.2, z: 8.0, segments: 1, bevel: 0.08 }),
    rbox(10.4, 0.4, 0.4, navy, { y: 6.65, z: 10.0, segments: 1, bevel: 0.05 }),
    ...[-4.6, -1.7, 1.7, 4.6].map((x) => lathe([[0.5, 0.5], [0.42, 0.9], [0.36, 1.5], [0.36, 5.4], [0.42, 5.8], [0.52, 5.95]], C.white, { x, z: 9.7, segments: 12 })),
    rbox(4.4, 3.4, 0.16, navy, { y: 2.2, z: 6.05, segments: 1, bevel: 0.05 }),
    box(1.85, 3.0, 0.2, C.glass, { x: -1.0, y: 2.1, z: 6.1 }), box(1.85, 3.0, 0.2, C.glass, { x: 1.0, y: 2.1, z: 6.1 }),
    box(0.12, 3.0, 0.24, navy, { y: 2.1, z: 6.12 }), box(4.0, 0.12, 0.24, navy, { y: 3.2, z: 6.12 }),
    ...[0, 1, 2, 3].map((i) => rbox(10.6 - i * 0.5, 0.2, 1.0, i % 2 ? '#c6ccd3' : stone, { y: 0.2 + i * 0.13 + 0.2, z: 10.4 + (3 - i) * 0.9 - 0.1 - i * 0.0, segments: 1, bevel: 0.04 })),
    // sign board above the portico
    rbox(9, 1.6, 0.5, navy, { y: 7.6, z: 6.3, segments: 1, bevel: 0.06 }),
    // block "letters"
    ...[-3.5, -2.3, -1.1, 0.1, 1.3, 2.5].flatMap((x) => [
      box(0.18, 0.9, 0.12, C.white, { x: x - 0.25, y: 7.55, z: 6.6 }), box(0.7, 0.18, 0.12, C.white, { x, y: 7.95, z: 6.6 }), box(0.18, 0.5, 0.12, C.white, { x: x + 0.25, y: 7.75, z: 6.6 }),
    ]),
    // blue light bar on top of the sign
    rbox(6.2, 0.35, 0.9, '#20263a', { y: 8.65, z: 6.4, segments: 1, bevel: 0.06 }),
    rbox(2.2, 0.5, 0.8, blue, { emissive: 1.5, x: -1.9, y: 8.95, z: 6.4, segments: 1, bevel: 0.15 }),
    rbox(2.2, 0.5, 0.8, blue, { emissive: 1.5, x: 1.9, y: 8.95, z: 6.4, segments: 1, bevel: 0.15 }),
    rbox(1.3, 0.55, 0.85, '#e6ecf5', { y: 8.95, z: 6.4, segments: 1, bevel: 0.15 }),
    rbox(0.5, 0.4, 0.75, '#ff3b30', { emissive: 1.5, x: -3.4, y: 8.85, z: 6.4, segments: 1, bevel: 0.1 }), rbox(0.5, 0.4, 0.75, '#ff3b30', { emissive: 1.5, x: 3.4, y: 8.85, z: 6.4, segments: 1, bevel: 0.1 }),
    // gold star badge on the wall over the door
    extrude([[0, 1], [0.3, 0.32], [0.98, 0.3], [0.45, -0.12], [0.6, -0.8], [0, -0.4], [-0.6, -0.8], [-0.45, -0.12], [-0.98, 0.3], [-0.3, 0.32]], 0.14, C.yellow, { y: 5.4, z: 6.2, sx: 0.85, sy: 0.85 }),
    cyl(1.2, 1.2, 0.1, navy, { y: 5.4, z: 6.12, rx: PI / 2, segments: 16 }),
    // globe lamps beside the steps
    ...[-5.9, 5.9].flatMap((x) => [cyl(0.1, 0.14, 2.4, C.dark, { x, y: 1.6, z: 12.3, segments: 8, flat: false }), sphere(0.42, blue, { emissive: 1.2, x, y: 3.0, z: 12.3, segments: 10, rings: 8 })]),
  );
  // flagpole + flag, antenna, dish, roof kit
  p.push(
    cyl(0.12, 0.12, 11, C.silver, { x: -12.6, y: 5.5, z: 10.5, segments: 8, flat: false }),
    sphere(0.22, C.yellow, { x: -12.6, y: 11.1, z: 10.5, segments: 8, rings: 6 }),
    box(2.2, 1.3, 0.05, C.white, { x: -11.5, y: 10.2, z: 10.5 }),
    ...[0, 1, 2].map((i) => box(1.5, 0.19, 0.06, C.red, { x: -11.15, y: 10.7 - i * 0.43, z: 10.5 })),
    box(0.85, 0.7, 0.06, C.dblue, { x: -12.1, y: 10.45, z: 10.5 }),
    tube([6, 9.2, -3], [6, 15, -3], 0.09, C.silver, 6), tube([5, 12.5, -3], [7, 12.5, -3], 0.05, C.silver, 5), tube([5.3, 14, -3], [6.7, 14, -3], 0.05, C.silver, 5),
    sphere(0.2, '#ff3b30', { x: 6, y: 15.2, z: -3, segments: 8, rings: 6 }),
    ...[[6, -3], [7.4, -3], [4.6, -3]].map(([x, z], i) => (i ? cyl(0.04, 0.04, 2, C.gray, { x, y: 10.3, z, rz: i === 1 ? -0.5 : 0.5, segments: 5 }) : cyl(0.02, 0.02, 0.01, C.gray, { x, y: 9.3, z, segments: 4 }))),
    lathe([[0.05, 0], [0.5, 0.15], [0.9, 0.5], [1.15, 1.0], [0.05, 0.1]], C.white, { x: -6, y: 10.0, z: -2.5, rx: 0, segments: 14 }),
    rbox(1.8, 0.9, 1.8, C.silver, { x: 1, y: 9.65, z: -1, segments: 1, bevel: 0.1 }), cyl(0.6, 0.6, 0.05, C.dark, { x: 1, y: 10.15, z: -1, segments: 12 }),
    rbox(1.4, 0.8, 1.4, C.lgray, { x: -2, y: 9.6, z: 1, segments: 1, bevel: 0.08 }),
  );
  // garage annex (sallyport)
  p.push(
    rbox(6, 4.6, 10, '#c3c9d0', { x: 13, y: 2.8, segments: 1, bevel: 0.12 }),
    rbox(6.4, 0.4, 10.4, C.white, { x: 13, y: 5.3, segments: 1, bevel: 0.05 }),
    rbox(6.1, 0.5, 10.1, navy, { x: 13, y: 4.4, segments: 1, bevel: 0.05 }),
    rbox(6.2, 0.4, 10.2, C.gray, { x: 13, y: 0.4, segments: 1, bevel: 0.05 }),
    ...[11.6, 14.4].flatMap((x) => [
      rbox(2.5, 3.2, 0.2, C.white, { x, y: 2.1, z: 5.05, segments: 1, bevel: 0.05 }),
      rbox(2.2, 3.0, 0.2, '#2c2f36', { x, y: 2.0, z: 5.12, segments: 1, bevel: 0.03 }),
      ...[0, 1, 2, 3, 4].map((i) => box(2.1, 0.06, 0.12, '#4a4f58', { x, y: 0.8 + i * 0.55, z: 5.25 })),
      rbox(0.4, 0.3, 0.3, blue, { emissive: 1.2, x, y: 3.9, z: 5.15, segments: 1, bevel: 0.08 }),
    ]),
    ...win(15.95, 2.6, 0, 1.6, 1.4, 'x', 1, C.white),
    rbox(1.2, 0.8, 1.2, C.silver, { x: 13, y: 5.9, z: -2, segments: 1, bevel: 0.08 }),
  );
  // bike rack + bollards in front of the annex
  for (let i = 0; i < 4; i++) p.push(cyl(0.12, 0.12, 0.8, navy, { x: 10.5 + i * 1.6, y: 0.5, z: 6.8, segments: 8, flat: false }));
  // planters
  for (const x of [-8.5, 8.5]) p.push(rbox(3, 0.7, 1.1, C.brick, { x, y: 0.8, z: 7.0, segments: 1, bevel: 0.08 }), sphere(0.85, C.green, { x, y: 1.6, z: 7.0, sy: 0.7, segments: 10, rings: 6 }));
  return p;
};

/** Medical helicopter (nose +X) at offset (ox,oy,oz). */
const heli = (ox, oy, oz) => [
  sphere(1.0, C.white, { x: ox, y: oy + 1.45, z: oz, sx: 1.75, sy: 1.0, sz: 0.95, segments: 12, rings: 8, flat: false }),
  sphere(0.85, C.glass, { x: ox + 1.0, y: oy + 1.6, z: oz, sx: 1.0, sy: 0.85, sz: 0.9, segments: 10, rings: 7, flat: false }),
  rbox(2.9, 0.26, 1.98, C.red, { x: ox - 0.1, y: oy + 1.1, z: oz, segments: 1, bevel: 0.08 }),
  cyl(0.1, 0.28, 3.6, C.white, { x: ox - 2.9, y: oy + 1.75, z: oz, rz: PI / 2 + 0.03, segments: 10 }),
  extrude([[0, 0], [0.9, 0], [0.55, 1.3], [0.15, 1.3]], 0.1, C.red, { x: ox - 4.55, y: oy + 1.75, z: oz }),
  box(0.08, 1.2, 0.12, C.dark, { x: ox - 4.5, y: oy + 2.4, z: oz + 0.14 }),
  cyl(0.12, 0.12, 0.55, C.dark, { x: ox - 0.1, y: oy + 2.7, z: oz, segments: 8 }),
  box(6.6, 0.06, 0.32, C.dark, { x: ox - 0.1, y: oy + 3.0, z: oz, ry: 0.5 }),
  box(6.6, 0.06, 0.32, C.dark, { x: ox - 0.1, y: oy + 3.0, z: oz, ry: 0.5 + PI / 2 }),
  sphere(0.2, C.dark, { x: ox - 0.1, y: oy + 3.0, z: oz, segments: 8, rings: 6 }),
  ...[0.85, -0.85].flatMap((z) => [
    cyl(0.06, 0.06, 3.0, C.dark, { x: ox + 0.1, y: oy + 0.15, z: oz + z, rz: PI / 2, segments: 6 }),
    cyl(0.05, 0.05, 0.85, C.dark, { x: ox + 0.7, y: oy + 0.55, z: oz + z * 0.85, segments: 5 }),
    cyl(0.05, 0.05, 0.85, C.dark, { x: ox - 0.7, y: oy + 0.55, z: oz + z * 0.85, segments: 5 }),
  ]),
  ...[0.96, -0.96].flatMap((z) => [box(0.7, 0.7, 0.05, C.red, { x: ox - 0.4, y: oy + 1.7, z: oz + z }), box(0.5, 0.18, 0.07, C.white, { x: ox - 0.4, y: oy + 1.7, z: oz + z * 1.01 }), box(0.18, 0.5, 0.07, C.white, { x: ox - 0.4, y: oy + 1.7, z: oz + z * 1.01 })]),
  sphere(0.14, '#ff3b30', { x: ox - 0.1, y: oy + 2.5, z: oz - 0.3, segments: 6, rings: 5 }),
];

/** Hospital. Front faces +Z. Main block x -15..15, z -9..9, height 12; ambulance canopy at x -13..-3 (z 9..18). */
const hospitalParts = () => {
  const white = '#f2f4f6';
  // front windows: 3 floors; the entrance bay (x 7.5) and ambulance canopy bay keep their doors / signs clear
  const hospFront = [];
  for (const x of [-13.5, -10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5, 13.5]) {
    hospFront.push({ x, y: 6.2, w: 1.7, h: 1.6 });
    if (x !== 7.5) hospFront.push({ x, y: 9.9, w: 1.7, h: 1.6 });
    if (x > -2 && Math.abs(x - 7.5) > 2.5) hospFront.push({ x, y: 2.6, w: 1.7, h: 1.6 });
  }
  const hospEnds = [-4.5, 0, 4.5].flatMap((z) => [2.6, 6.2, 9.9].map((y) => ({ z, y, w: 1.6, h: 1.6 })));
  const blueC = '#3b8fd4';
  const p = [
    rbox(31, 0.5, 19, C.gray, { y: 0.25, segments: 1, bevel: 0.08 }),
    ...shell(30, 18, 11.5, 0.5, white, {
      surface: 'stucco', depth: 0.22,
      front: hospFront,
      left: hospEnds, right: hospEnds,
    }),
    rbox(30.3, 0.7, 18.3, blueC, { y: 11.3, segments: 1, bevel: 0.06 }),
    rbox(30.6, 0.5, 18.6, C.white, { y: 12.0, segments: 1, bevel: 0.06 }),
    box(30.3, 0.35, 18.3, '#c9d3dc', { y: 4.4 }), box(30.3, 0.35, 18.3, '#c9d3dc', { y: 8.1 }),
    box(30.4, 1.0, 18.4, '#d8dee4', { y: 1.0 }),
    // central tower + roof kit
    rbox(9, 4.2, 10, '#f7f9fb', { x: 0, y: 14.2, z: -3.5, segments: 1, bevel: 0.1 }),
    rbox(9.4, 0.4, 10.4, blueC, { x: 0, y: 16.4, z: -3.5, segments: 1, bevel: 0.05 }),
    rbox(2.6, 1.6, 2.6, C.silver, { x: 8.5, y: 13.0, z: -4, segments: 1, bevel: 0.1 }), cyl(0.9, 0.9, 0.06, C.dark, { x: 8.5, y: 13.85, z: -4, segments: 12 }),
    rbox(1.8, 1.1, 1.8, C.lgray, { x: 11.5, y: 12.75, z: 3, segments: 1, bevel: 0.08 }),
    box(30.4, 0.5, 0.3, '#aab2bb', { y: 12.5, z: 9.0 }), box(30.4, 0.5, 0.3, '#aab2bb', { y: 12.5, z: -9.0 }),
    box(0.3, 0.5, 18.4, '#aab2bb', { x: 15, y: 12.5 }), box(0.3, 0.5, 18.4, '#aab2bb', { x: -15, y: 12.5 }),
    // tower windows + big red cross plaque
    ...[-3, 3].map((x) => win(x, 14.2, 1.5, 1.6, 1.4, 'z', 1)).flat(),
    rbox(3.4, 3.4, 0.3, C.white, { x: 0, y: 14.2, z: 1.55, segments: 1, bevel: 0.06 }),
    box(2.6, 0.85, 0.34, C.red, { emissive: 0.8, x: 0, y: 14.2, z: 1.6 }), box(0.85, 2.6, 0.34, C.red, { emissive: 0.8, x: 0, y: 14.2, z: 1.6 }),
  ];
  // cross plaque above the main entrance
  p.push(
    rbox(3.0, 3.0, 0.3, C.white, { x: 7.5, y: 9.9, z: 9.1, segments: 1, bevel: 0.06 }),
    box(2.2, 0.7, 0.34, C.red, { emissive: 0.8, x: 7.5, y: 9.9, z: 9.15 }), box(0.7, 2.2, 0.34, C.red, { emissive: 0.8, x: 7.5, y: 9.9, z: 9.15 }),
  );
  // main entrance: glass doors, canopy, steps
  p.push(
    rbox(5.4, 3.6, 0.2, C.dgray, { x: 7.5, y: 2.3, z: 9.05, segments: 1, bevel: 0.05 }),
    box(2.4, 3.2, 0.2, C.glass, { x: 6.3, y: 2.1, z: 9.15 }), box(2.4, 3.2, 0.2, C.glass, { x: 8.7, y: 2.1, z: 9.15 }),
    box(0.1, 3.2, 0.24, C.dgray, { x: 7.5, y: 2.1, z: 9.17 }),
    rbox(8.0, 0.4, 4.0, blueC, { x: 7.5, y: 4.9, z: 11.0, segments: 1, bevel: 0.08 }),
    rbox(8.2, 0.2, 4.2, C.white, { x: 7.5, y: 5.2, z: 11.0, segments: 1, bevel: 0.05 }),
    ...[3.9, 11.1].map((x) => cyl(0.18, 0.18, 4.5, C.white, { x, y: 2.6, z: 12.6, segments: 10, flat: false })),
    rbox(8.6, 0.2, 2.0, C.lgray, { x: 7.5, y: 0.6, z: 10.2, segments: 1, bevel: 0.04 }),
    rbox(8.0, 0.2, 1.2, C.lgray, { x: 7.5, y: 0.4, z: 11.5, segments: 1, bevel: 0.04 }),
  );
  // ambulance canopy: red roof, white fascia with cross, columns, painted floor, bay lines
  p.push(
    rbox(11.4, 0.5, 9.4, C.red, { x: -8, y: 5.0, z: 13.7, segments: 1, bevel: 0.08 }),
    rbox(11.6, 0.9, 0.4, C.white, { x: -8, y: 4.75, z: 18.4, segments: 1, bevel: 0.06 }),
    rbox(3.0, 3.0, 0.3, C.white, { x: -8, y: 6.9, z: 9.2, segments: 1, bevel: 0.06 }),
    box(2.3, 0.7, 0.34, C.red, { emissive: 0.8, x: -8, y: 6.9, z: 9.25 }), box(0.7, 2.3, 0.34, C.red, { emissive: 0.8, x: -8, y: 6.9, z: 9.25 }),
    rbox(5.5, 1.1, 0.3, C.red, { x: -8, y: 6.2, z: 9.15, segments: 1, bevel: 0.06, sx: 1.4 }),
    box(1.6, 0.7, 0.34, C.white, { x: -8, y: 6.2, z: 9.3 }),
    rbox(11.6, 0.1, 9.6, '#b5b9bf', { x: -8, y: 0.55, z: 13.7, segments: 1, bevel: 0.02 }),
    ...[-13.2, -8, -2.8].flatMap((x) => [cyl(0.2, 0.2, 4.5, C.white, { x, y: 2.75, z: 18.1, segments: 10, flat: false })]),
    ...[-11.5, -8, -4.5].map((x) => box(0.1, 0.02, 7.8, C.yellow, { x: x + 1.75, y: 0.62, z: 13.6 })),
    ...[-13.75, -2.25].map((x) => box(0.1, 0.02, 7.8, C.yellow, { x, y: 0.62, z: 13.6 })),
    ...[0, 1, 2].map((i) => rbox(0.5, 1.2, 0.25, C.dgray, { x: -13.4 + i * 5.5, y: 1.15, z: 9.3, segments: 1, bevel: 0.04 })),
  );
  // rooftop helipad + helicopter
  p.push(
    cyl(4.6, 4.6, 0.3, '#3d434a', { x: -9.5, y: 12.65, z: -1, segments: 28 }),
    torus(4.2, 0.08, C.yellow, { x: -9.5, y: 12.85, z: -1, rx: PI / 2, radial: 4, segments: 32, flat: false }),
    box(0.4, 0.04, 2.4, C.white, { x: -10.5, y: 12.83, z: -1 }), box(0.4, 0.04, 2.4, C.white, { x: -8.5, y: 12.83, z: -1 }), box(2.4, 0.04, 0.4, C.white, { x: -9.5, y: 12.83, z: -1 }),
    ...Array.from({ length: 10 }, (_, i) => sphere(0.14, C.yellow, { x: -9.5 + Math.cos(i * PI / 5) * 4.6, y: 12.9, z: -1 + Math.sin(i * PI / 5) * 4.6, segments: 5, rings: 4 })),
    ...heli(-9.7, 12.8, -1),
  );
  return p;
};

export function buildProtos() {
  const P = {};
  // Every proto remembers where its authoring origin sits inside the recentred geometry: proto.anchor = (cx, cz), the
  // bbox centre in authoring coordinates. The map uses it to place a model by its origin (see `at()` in maps/firestation.js).
  const add = (name, parts, opts) => {
    const flat = parts.flat();
    const bb = new THREE.Box3();
    flat.forEach((g) => { g.computeBoundingBox(); bb.union(g.boundingBox); });
    P[name] = applyModelFinishes(makeProto(name, flat, opts), 'urban');
    P[name].anchor = { x: (bb.min.x + bb.max.x) / 2, z: (bb.min.z + bb.max.z) / 2 };
    return P[name];
  };

  add('hydrant', [
    cyl(0.4, 0.45, 0.15, C.dred, { y: 0.08, segments: 14 }),
    lathe([[0.3, 0.1], [0.28, 0.3], [0.3, 0.7], [0.36, 0.9], [0.3, 1.0], [0.22, 1.15], [0, 1.22]], C.red, { segments: 14 }),
    cyl(0.38, 0.38, 0.09, C.dred, { y: 0.92, segments: 14 }),
    cyl(0.1, 0.1, 0.12, C.yellow, { y: 1.28, segments: 10 }),
    cyl(0.14, 0.14, 0.7, C.red, { y: 0.62, rz: PI / 2, segments: 10 }),
    cyl(0.18, 0.18, 0.08, C.yellow, { y: 0.62, x: 0.38, rz: PI / 2, segments: 10 }),
    cyl(0.18, 0.18, 0.08, C.yellow, { y: 0.62, x: -0.38, rz: PI / 2, segments: 10 }),
    cyl(0.17, 0.17, 0.2, C.red, { y: 0.62, z: 0.3, rx: PI / 2, segments: 10 }),
    cyl(0.2, 0.2, 0.06, C.yellow, { y: 0.62, z: 0.42, rx: PI / 2, segments: 10 }),
    sphere(0.05, C.silver, { y: 0.62, z: 0.46, segments: 6, rings: 4 }),
  ], { value: 0.3 });

  add('helmet', [
    lathe([[0.55, 0], [0.55, 0.07], [0.4, 0.14], [0.38, 0.32], [0.3, 0.5], [0.12, 0.62], [0, 0.65]], C.red, { segments: 14, y: 0.1 }),
    // back brim flaring out
    extrude([[-0.15, 0], [0.15, 0], [0.4, 0.14], [-0.4, 0.14]], 0.6, C.red, { y: 0.1, x: -0.55, ry: PI / 2, rx: 0, bevel: 0.02, segments: 1 }),
    box(0.1, 0.62, 0.06, C.dred, { y: 0.45, x: 0 }),
    rbox(0.25, 0.32, 0.05, C.yellow, { y: 0.55, x: 0.36, ry: PI / 2, segments: 1, bevel: 0.03 }),
    cyl(0.07, 0.07, 0.05, C.red, { y: 0.55, x: 0.4, rz: PI / 2, segments: 8 }),
    box(0.3, 0.08, 0.8, C.yellow, { y: 0.25, x: 0.1, sz: 0.001 }),
  ].slice(0, 5), { value: 0.25 });

  add('hosereel', [
    rbox(0.9, 0.1, 0.8, C.dark, { y: 0.05, segments: 1, bevel: 0.03 }),
    box(0.08, 0.8, 0.08, C.dark, { y: 0.45, z: 0.36 }),
    box(0.08, 0.8, 0.08, C.dark, { y: 0.45, z: -0.36 }),
    cyl(0.6, 0.6, 0.06, C.red, { y: 0.85, z: 0.33, rx: PI / 2, segments: 16 }),
    cyl(0.6, 0.6, 0.06, C.red, { y: 0.85, z: -0.33, rx: PI / 2, segments: 16 }),
    cyl(0.46, 0.46, 0.6, C.yellow, { y: 0.85, rx: PI / 2, segments: 16 }),
    cyl(0.4, 0.4, 0.62, C.dtan, { y: 0.85, rx: PI / 2, segments: 12 }),
    cyl(0.16, 0.16, 0.7, C.dark, { y: 0.85, rx: PI / 2, segments: 8 }),
    cyl(0.07, 0.07, 0.4, C.silver, { y: 0.45, x: 0.4, rz: PI / 2, segments: 8 }),
    cone(0.1, 0.24, C.brass ?? C.yellow, { y: 0.45, x: 0.68, rz: -PI / 2, segments: 8 }),
  ], { value: 0.4 });

  add('axe', [
    cyl(0.045, 0.05, 1.25, C.dwood, { y: 0.62, segments: 8, flat: false }),
    extrude([[0, 0], [0.35, 0.05], [0.42, 0.36], [0.1, 0.32], [0, 0.34]], 0.09, C.silver, { y: 0.88, x: 0.02, bevel: 0.01, segments: 1 }),
    box(0.2, 0.34, 0.11, C.red, { y: 1.05, x: 0.0 }),
    extrude([[0, 0], [-0.25, 0.1], [0, 0.2]], 0.08, C.dgray, { y: 0.98, x: -0.08, segments: 1 }),
    cyl(0.06, 0.06, 0.12, C.dark, { y: 0.06, segments: 8 }),
    box(0.4, 0.04, 0.4, C.dtan, { y: 0.02 }),
  ], { value: 0.2 });

  add('extinguisher', [
    lathe([[0.16, 0], [0.24, 0.05], [0.26, 0.2], [0.26, 0.7], [0.22, 0.85], [0.12, 0.93], [0.1, 0.98]], C.red, { segments: 14 }),
    cyl(0.265, 0.265, 0.22, C.white, { y: 0.5, segments: 14 }),
    cyl(0.09, 0.09, 0.16, C.dark, { y: 1.06, segments: 8, flat: false }),
    rbox(0.4, 0.06, 0.1, C.dark, { y: 1.16, x: 0.06, segments: 1, bevel: 0.02 }),
    box(0.05, 0.5, 0.05, C.dark, { y: 0.8, x: 0.3, z: 0.05, rz: -0.3 }),
    torus(0.14, 0.03, C.dark, { y: 0.62, x: 0.0, z: 0.26, radial: 5, segments: 12 }),
    cyl(0.06, 0.06, 0.04, C.silver, { y: 1.0, z: 0.15, rx: PI / 2, segments: 8 }),
  ], { value: 0.3 });

  add('cone', [
    rbox(0.9, 0.09, 0.9, C.dark, { y: 0.045, segments: 1, bevel: 0.03 }),
    cyl(0.08, 0.32, 0.9, C.orange, { y: 0.54, segments: 14 }),
    cyl(0.17, 0.2, 0.14, C.white, { y: 0.5, segments: 14 }),
    cyl(0.12, 0.15, 0.1, C.white, { y: 0.74, segments: 12 }),
    sphere(0.09, C.orange, { y: 1.0, segments: 8, rings: 5 }),
  ], { value: 0.25 });

  add('firefighter', person({
    coat: C.tan, pants: C.tan, vest: C.yellow,
    hat: [
      sphere(0.24, C.yellow, { y: 1.47, x: -0.02, sy: 0.7, segments: 10, rings: 6 }),
      cyl(0.3, 0.3, 0.04, C.yellow, { y: 1.42, x: -0.03, segments: 12 }),
      box(0.3, 0.04, 0.06, C.dyellow ?? C.orange, { y: 1.62, x: -0.02 }),
      box(0.04, 0.14, 0.2, C.red, { y: 1.5, x: 0.2 }),
      // oxygen tank on the back
      cyl(0.12, 0.12, 0.6, C.silver, { y: 0.9, x: -0.32, segments: 8, flat: false }),
    ],
  }), { value: 0.4, move: { type: 'walk', speed: 1.4, range: 9 } });

  add('dalmatian', (() => {
    const p = [
      capsule(0.2, 0.5, C.white, { y: 0.55, rz: PI / 2, segments: 10, caps: 3 }),
      // trotting legs: diagonal pairs share a phase (front-right + back-left = 1, front-left + back-right = 0)
      ...[[0.32, 0.13, 0], [0.32, -0.13, 1], [-0.32, 0.13, 1], [-0.32, -0.13, 0]].flatMap(([x, z, phase]) => {
        const hip = [x, 0.42, z], lo = { phase, hip };
        return [
          articulate(cyl(0.06, 0.05, 0.42, C.white, { y: 0.21, x, z, segments: 8, flat: false }), 'leg', hip, lo),
          articulate(box(0.14, 0.05, 0.1, C.white, { y: 0.02, x: x + 0.03, z }), 'leg', hip, lo),
        ];
      }),
      // neck, head, snout, nose, ears, eyes
      cyl(0.12, 0.15, 0.3, C.white, { y: 0.8, x: 0.5, rz: -0.6, segments: 8, flat: false }),
      sphere(0.18, C.white, { y: 0.98, x: 0.62, segments: 10, rings: 8 }),
      rbox(0.26, 0.16, 0.2, C.white, { y: 0.92, x: 0.8, segments: 1, bevel: 0.05 }),
      sphere(0.05, C.black, { y: 0.96, x: 0.94, segments: 6, rings: 5 }),
      sphere(0.09, C.black, { y: 0.98, x: 0.56, z: 0.2, sx: 0.5, sy: 1.4, segments: 6, rings: 5 }),
      sphere(0.09, C.black, { y: 0.98, x: 0.56, z: -0.2, sx: 0.5, sy: 1.4, segments: 6, rings: 5 }),
      sphere(0.03, C.black, { y: 1.02, x: 0.76, z: 0.09, segments: 5, rings: 4 }),
      sphere(0.03, C.black, { y: 1.02, x: 0.76, z: -0.09, segments: 5, rings: 4 }),
      // tail + red collar
      articulate(cyl(0.03, 0.05, 0.42, C.white, { y: 0.78, x: -0.6, rz: 0.9, segments: 6, flat: false }), 'tail', [-0.5, 0.7, 0], { amp: 1.2 }),
      torus(0.13, 0.03, C.red, { y: 0.84, x: 0.5, ry: PI / 2, rz: -0.6, radial: 5, segments: 12 }),
    ];
    // black spots
    for (const [x, y, z, r] of [[0.1, 0.72, 0.14, 0.07], [-0.2, 0.68, -0.13, 0.08], [-0.15, 0.7, 0.12, 0.06], [0.25, 0.66, -0.15, 0.06], [-0.4, 0.62, 0.12, 0.06], [0.05, 0.73, -0.05, 0.06], [0.3, 0.3, 0.14, 0.04], [-0.32, 0.3, -0.13, 0.04]]) {
      p.push(sphere(r, C.black, { x, y, z, sy: 0.6, segments: 6, rings: 4 }));
    }
    return p;
  })(), { value: 0.5, move: { type: 'walk', speed: 2.6, range: 14 } });

  add('mailbox', [
    cyl(0.07, 0.08, 1.0, C.dwood, { y: 0.5, segments: 8, flat: false }),
    box(0.5, 0.06, 0.06, C.dwood, { y: 0.92, x: 0.15 }),
    rbox(0.7, 0.34, 0.4, C.blue, { y: 1.08, segments: 1, bevel: 0.08 }),
    cyl(0.2, 0.2, 0.7, C.blue, { y: 1.22, rz: PI / 2, sy: 0.8, segments: 12 }),
    box(0.05, 0.22, 0.28, C.dblue, { y: 1.05, x: 0.35 }),
    box(0.05, 0.3, 0.05, C.red, { y: 1.42, x: -0.1, z: 0.23 }),
    box(0.16, 0.1, 0.05, C.red, { y: 1.58, x: -0.03, z: 0.23 }),
    box(0.16, 0.16, 0.02, C.white, { y: 1.05, x: 0.1, z: 0.21 }),
  ], { value: 0.4 });

  add('bench', (() => {
    const p = [];
    for (let i = 0; i < 4; i++) p.push(box(1.75, 0.06, 0.13, i % 2 ? C.wood : C.dwood, { y: 0.52, z: -0.2 + i * 0.14 }));
    for (let i = 0; i < 3; i++) p.push(box(1.75, 0.11, 0.05, i % 2 ? C.wood : C.dwood, { y: 0.78 + i * 0.16, z: -0.3, rx: -0.15 }));
    for (const x of [-0.76, 0.76]) {
      p.push(
        box(0.07, 0.5, 0.5, C.dark, { y: 0.25, x }),
        box(0.07, 0.6, 0.06, C.dark, { y: 0.85, x, z: -0.3, rx: -0.15 }),
        box(0.1, 0.06, 0.55, C.dark, { y: 0.66, x }),
        box(0.08, 0.06, 0.7, C.dark, { y: 0.02, x }),
      );
    }
    return p;
  })(), { value: 0.8 });

  add('ladder', [
    ...ladderParts(1.8, 0.1, 0, 0, 0.6, C.yellow, 0.3),
    box(0.15, 0.15, 0.7, C.dark, { y: 0.06, x: 0.85 }),
    box(0.15, 0.15, 0.7, C.dark, { y: 0.06, x: -0.85 }),
    ...ladderParts(1.8, 0.24, 0, 0, 0.6, C.orange, 0.3).slice(0, 2),
    box(0.05, 0.18, 0.05, C.silver, { y: 0.18, x: 0.6, z: 0.3 }),
    box(0.05, 0.18, 0.05, C.silver, { y: 0.18, x: -0.6, z: -0.3 }),
  ], { value: 0.6 });

  add('bush', [
    sphere(0.6, C.green, { y: 0.5, sy: 0.8, segments: 10, rings: 7 }),
    sphere(0.45, C.dgreen, { y: 0.55, x: 0.4, z: 0.2, segments: 9, rings: 6 }),
    sphere(0.42, C.lgreen, { y: 0.5, x: -0.35, z: -0.2, segments: 9, rings: 6 }),
    sphere(0.35, C.green, { y: 0.75, x: -0.05, z: 0.15, segments: 9, rings: 6 }),
    sphere(0.3, C.dgreen, { y: 0.4, x: 0.1, z: -0.45, segments: 8, rings: 6, flat: false }),
    ...[[0.1, 1.0, 0.3], [-0.4, 0.85, -0.25], [0.5, 0.85, 0.35], [0.2, 0.95, -0.4]].map(([x, y, z]) => sphere(0.09, '#f45d7a', { x, y, z, segments: 6, rings: 5 })),
  ], { value: 0.3, sway: 'tree' });

  add('tree', [
    lathe([[0.4, 0], [0.32, 0.4], [0.22, 1.2], [0.2, 2.0]], C.brown, { segments: 10 }),
    box(0.1, 1.2, 0.1, C.dbrown, { y: 1.9, x: 0.15, z: 0.1, rz: -0.6 }),
    box(0.1, 1.0, 0.1, C.dbrown, { y: 2.0, x: -0.15, z: -0.1, rz: 0.6 }),
    sphere(1.35, C.green, { y: 2.9, sy: 0.9, segments: 12, rings: 8 }),
    sphere(1.0, C.lgreen, { y: 3.9, x: 0.3, segments: 11, rings: 8 }),
    sphere(0.95, C.dgreen, { y: 2.7, x: -1.0, z: 0.5, segments: 10, rings: 7 }),
    sphere(0.9, C.green, { y: 2.8, x: 0.9, z: -0.7, segments: 10, rings: 7 }),
    sphere(0.7, C.lgreen, { y: 3.4, x: -0.6, z: -0.6, segments: 9, rings: 6 }),
    sphere(0.6, C.dgreen, { y: 4.4, x: -0.1, z: 0.2, segments: 9, rings: 6 }),
  ], { value: 0.7, sway: 'tree' });

  add('pine', [
    lathe([[0.32, 0], [0.24, 0.4], [0.2, 1.2]], C.brown, { segments: 8, flat: false }),
    cone(1.5, 1.6, C.dgreen, { y: 1.9, segments: 14 }),
    cone(1.3, 1.5, C.green, { y: 2.7, segments: 14 }),
    cone(1.1, 1.4, C.dgreen, { y: 3.4, segments: 14 }),
    cone(0.9, 1.3, C.green, { y: 4.1, segments: 12 }),
    cone(0.65, 1.2, C.dgreen, { y: 4.7, segments: 12 }),
    cone(0.4, 1.0, C.lgreen, { y: 5.2, segments: 10 }),
  ], { value: 0.8, sway: 'tree' });

  add('car', car(C.blue), { value: 1.4 });
  add('carGreen', car(C.green, C.dgreen), { value: 1.4 });
  add('carYellow', car(C.yellow, '#e0a800'), { value: 1.4 });
  add('carWhite', car(C.white, C.lgray), { value: 1.4 });

  add('house', house(C.cream, C.red, C.dwood), { value: 4, radius: 3.8 });
  add('houseBlue', house('#a9cdf2', C.dblue, C.white, '#f6f6f6'), { value: 4, radius: 3.8 });
  add('houseYellow', house('#f7dc7a', C.brown, C.red), { value: 4, radius: 3.8 });

  add('policecar', [
    ...car(C.white, C.white),
    rbox(4.42, 0.32, 1.92, C.navy, { y: 0.66, segments: 1, bevel: 0.1 }),
    rbox(1.3, 0.32, 1.86, C.navy, { y: 1.3, x: -1.4, segments: 1, bevel: 0.08 }),
    box(1.2, 0.08, 0.05, C.yellow, { y: 0.75, x: 0.2, z: 0.98 }),
    box(1.2, 0.08, 0.05, C.yellow, { y: 0.75, x: 0.2, z: -0.98 }),
    ...lightBar(-0.3, 1.95, 0, 1.4),
    box(0.06, 0.3, 0.3, C.gray, { y: 1.1, x: 2.3 }),
  ], { value: 3 });

  add('suv', [
    box(4.6, 0.25, 1.9, C.dark, { y: 0.45 }),
    rbox(4.8, 0.9, 2.1, C.black, { y: 1.0, segments: 2, bevel: 0.2 }),
    rbox(3.4, 0.9, 2.0, C.black, { y: 1.85, x: -0.5, segments: 2, bevel: 0.25 }),
    box(3.0, 0.5, 2.04, C.glass, { y: 1.9, x: -0.5 }),
    box(0.06, 0.5, 1.7, C.glass, { y: 1.9, x: 1.22 }),
    box(0.06, 0.5, 1.7, C.glass, { y: 1.9, x: -2.22 }),
    ...[0.6, -0.7].map((x) => box(0.08, 0.52, 2.06, C.black, { y: 1.9, x })),
    rbox(4.82, 0.18, 2.12, C.red, { y: 1.0, segments: 1, bevel: 0.05 }),
    rbox(0.22, 0.3, 2.15, C.silver, { y: 0.65, x: 2.4, segments: 1, bevel: 0.06 }),
    rbox(0.22, 0.3, 2.15, C.silver, { y: 0.65, x: -2.4, segments: 1, bevel: 0.06 }),
    box(0.06, 0.3, 1.2, C.dgray, { y: 1.1, x: 2.42 }),
    box(0.1, 0.24, 0.5, '#fff6c8', { y: 1.15, x: 2.4, z: 0.75 }),
    box(0.1, 0.24, 0.5, '#fff6c8', { y: 1.15, x: 2.4, z: -0.75 }),
    box(0.1, 0.22, 0.45, '#e0201a', { y: 1.15, x: -2.4, z: 0.8 }),
    box(0.1, 0.22, 0.45, '#e0201a', { y: 1.15, x: -2.4, z: -0.8 }),
    box(1.2, 0.05, 1.6, C.white, { y: 2.31, x: -0.5 }),
    box(2.4, 0.06, 0.06, C.dgray, { y: 2.36, x: -0.5, z: 0.7 }),
    box(2.4, 0.06, 0.06, C.dgray, { y: 2.36, x: -0.5, z: -0.7 }),
    ...lightBar(0.3, 2.5, 0, 1.4),
    ...wheel(1.5, 0.5, 1.05, 0.5, 0.4), ...wheel(1.5, 0.5, -1.05, 0.5, 0.4),
    ...wheel(-1.6, 0.5, 1.05, 0.5, 0.4), ...wheel(-1.6, 0.5, -1.05, 0.5, 0.4),
  ], { value: 4 });

  add('ambulance', [
    box(5.8, 0.3, 2.2, C.dark, { y: 0.65 }),
    rbox(6.2, 0.7, 2.5, C.white, { y: 1.0, segments: 2, bevel: 0.2 }),
    rbox(3.7, 2.2, 2.5, C.white, { y: 2.3, x: -1.2, segments: 2, bevel: 0.25 }),
    rbox(1.9, 1.5, 2.5, C.white, { y: 1.95, x: 1.95, segments: 2, bevel: 0.25 }),
    box(0.1, 0.8, 2.2, C.glass, { y: 2.3, x: 2.92 }),
    box(1.1, 0.7, 2.54, C.glass, { y: 2.3, x: 2.0 }),
    rbox(6.22, 0.3, 2.52, C.red, { y: 1.55, segments: 1, bevel: 0.05 }),
    rbox(6.22, 0.12, 2.52, C.red, { y: 1.15, segments: 1, bevel: 0.03 }),
    // medical cross on each side + back doors
    ...[1.27, -1.27].flatMap((z) => [
      box(0.9, 0.9, 0.05, C.red, { y: 2.55, x: -1.2, z }),
      box(0.3, 0.9, 0.08, C.white, { y: 2.55, x: -1.2, z: z * 1.005 }),
      box(0.9, 0.3, 0.08, C.white, { y: 2.55, x: -1.2, z: z * 1.005 }),
      box(0.05, 1.8, 0.06, C.gray, { y: 2.3, x: -2.4, z }),
      box(0.05, 1.8, 0.06, C.gray, { y: 2.3, x: 0.2, z }),
    ]),
    box(0.06, 1.8, 0.05, C.gray, { y: 2.3, x: -3.05 }),
    box(0.06, 0.5, 0.5, C.red, { y: 2.6, x: -3.06 }),
    box(0.06, 0.5, 0.15, C.white, { y: 2.6, x: -3.09 }),
    box(0.06, 0.15, 0.5, C.white, { y: 2.6, x: -3.09 }),
    // bumpers, lights, mirrors
    rbox(0.25, 0.32, 2.6, C.silver, { y: 0.6, x: 3.05, segments: 1, bevel: 0.06 }),
    rbox(0.25, 0.32, 2.6, C.silver, { y: 0.6, x: -3.08, segments: 1, bevel: 0.06 }),
    box(0.1, 0.24, 0.5, '#fff6c8', { y: 1.15, x: 3.1, z: 0.9 }),
    box(0.1, 0.24, 0.5, '#fff6c8', { y: 1.15, x: 3.1, z: -0.9 }),
    box(0.1, 0.4, 0.4, '#e0201a', { y: 1.2, x: -3.12, z: 1.0 }),
    box(0.1, 0.4, 0.4, '#e0201a', { y: 1.2, x: -3.12, z: -1.0 }),
    box(0.2, 0.3, 0.1, C.dark, { y: 2.3, x: 2.6, z: 1.35 }),
    box(0.2, 0.3, 0.1, C.dark, { y: 2.3, x: 2.6, z: -1.35 }),
    ...lightBar(1.9, 2.85, 0, 1.8),
    ...lightBar(-2.9, 3.5, 0, 1.6),
    ...wheel(2.0, 0.6, 1.2, 0.6, 0.45), ...wheel(2.0, 0.6, -1.2, 0.6, 0.45),
    ...wheel(-2.0, 0.6, 1.2, 0.6, 0.45), ...wheel(-2.0, 0.6, -1.2, 0.6, 0.45),
  ], { value: 5 });

  add('fireengine', [
    box(9, 0.3, 2.4, C.dark, { y: 0.75 }),
    rbox(9.6, 0.8, 2.8, C.dred, { y: 1.1, segments: 1, bevel: 0.2 }),
    // cab
    rbox(2.7, 2.2, 2.8, C.red, { y: 2.6, x: 3.4, segments: 2, bevel: 0.25 }),
    box(0.1, 0.9, 2.5, C.glass, { y: 3.0, x: 4.78 }),
    box(1.6, 0.8, 2.84, C.glass, { y: 3.0, x: 3.4 }),
    box(0.1, 0.9, 2.86, C.red, { y: 3.0, x: 3.4 }),
    // equipment body: compartments with roller doors
    rbox(6.4, 1.9, 2.8, C.red, { y: 2.4, x: -1.5, segments: 1, bevel: 0.15 }),
    rbox(6.42, 0.3, 2.82, C.silver, { y: 3.35, x: -1.5, segments: 1, bevel: 0.05 }),
    box(6.44, 0.15, 2.84, C.yellow, { y: 1.75, x: -1.5 }),
    ...[-3.6, -2.0, -0.4].flatMap((x) => [1.42, -1.42].map((z) => rbox(1.4, 1.3, 0.06, C.silver, { y: 2.45, x, z, segments: 1, bevel: 0.02 }))),
    ...[-3.6, -2.0, -0.4].flatMap((x) => [1.45, -1.45].flatMap((z) => [0, 1, 2, 3].map((i) => box(1.3, 0.04, 0.03, C.gray, { y: 2.0 + i * 0.28, x, z })))),
    // bumper, grille, lights
    rbox(0.4, 0.5, 2.9, C.silver, { y: 0.75, x: 4.9, segments: 1, bevel: 0.1 }),
    box(0.06, 0.8, 1.6, C.dark, { y: 1.9, x: 4.78 }),
    box(0.1, 0.3, 0.5, '#fff6c8', { y: 1.4, x: 4.8, z: 1.0 }),
    box(0.1, 0.3, 0.5, '#fff6c8', { y: 1.4, x: 4.8, z: -1.0 }),
    box(0.1, 0.4, 0.4, '#e0201a', { y: 1.5, x: -4.75, z: 1.1 }),
    box(0.1, 0.4, 0.4, '#e0201a', { y: 1.5, x: -4.75, z: -1.1 }),
    // roof ladder on brackets + hose reel drum + siren + light bars
    ...ladderParts(7.6, 3.75, -1.2, 0.5, 0.9, C.silver, 0.6),
    ...ladderParts(7.6, 3.75, -1.2, -0.5, 0.9, C.silver, 0.6).slice(0, 2),
    box(0.1, 0.3, 1.6, C.dgray, { y: 3.6, x: -3.5 }),
    box(0.1, 0.3, 1.6, C.dgray, { y: 3.6, x: 0.8 }),
    cyl(0.5, 0.5, 1.6, C.yellow, { y: 3.7, x: -4.1, rz: 0, rx: PI / 2, segments: 12 }),
    cyl(0.14, 0.14, 0.6, C.gray, { y: 3.6, x: 1.0, z: 1.1, segments: 8 }),
    ...lightBar(3.9, 3.9, 0, 2.2),
    ...lightBar(-4.4, 3.65, 0, 2.2),
    ...wheel(3.4, 0.95, 1.5, 0.95, 0.7), ...wheel(3.4, 0.95, -1.5, 0.95, 0.7),
    ...wheel(-2.6, 0.95, 1.5, 0.95, 0.7), ...wheel(-2.6, 0.95, -1.5, 0.95, 0.7),
    ...wheel(-0.6, 0.95, 1.5, 0.95, 0.7), ...wheel(-0.6, 0.95, -1.5, 0.95, 0.7),
  ], { value: 6 });

  const ltParts = (up) => [
    box(14.4, 0.3, 2.4, C.dark, { y: 0.75 }),
    rbox(15, 0.8, 2.8, C.dred, { y: 1.1, segments: 1, bevel: 0.2 }),
    rbox(2.8, 2.2, 2.8, C.red, { y: 2.6, x: 6, segments: 2, bevel: 0.25 }),
    box(0.1, 0.9, 2.5, C.glass, { y: 3.0, x: 7.42 }),
    box(1.6, 0.8, 2.84, C.glass, { y: 3.0, x: 6 }),
    box(0.1, 0.9, 2.86, C.red, { y: 3.0, x: 6 }),
    rbox(9.5, 1.4, 2.8, C.red, { y: 2.2, x: -1.8, segments: 1, bevel: 0.15 }),
    box(9.52, 0.12, 2.82, C.yellow, { y: 1.8, x: -1.8 }),
    ...[-5, -3.2, -1.4, 0.4].flatMap((x) => [1.42, -1.42].map((z) => rbox(1.5, 1.0, 0.06, C.silver, { y: 2.3, x, z, segments: 1, bevel: 0.02 }))),
    rbox(0.4, 0.5, 2.9, C.silver, { y: 0.75, x: 7.6, segments: 1, bevel: 0.1 }),
    box(0.06, 0.8, 1.6, C.dark, { y: 1.9, x: 7.42 }),
    box(0.1, 0.3, 0.5, '#fff6c8', { y: 1.4, x: 7.42, z: 1.0 }),
    box(0.1, 0.3, 0.5, '#fff6c8', { y: 1.4, x: 7.42, z: -1.0 }),
    box(0.1, 0.4, 0.4, '#e0201a', { y: 1.5, x: -9.35, z: 1.0 }),
    box(0.1, 0.4, 0.4, '#e0201a', { y: 1.5, x: -9.35, z: -1.0 }),
    // turntable + operator pod
    cyl(1.3, 1.5, 0.6, C.gray, { y: 3.2, x: -5, segments: 16 }),
    rbox(1.6, 1.0, 2.0, C.dred, { y: 3.8, x: -5, segments: 1, bevel: 0.15 }),
    ...(up ? ladderUp() : [
    // aerial ladder reaching forward over the cab, slightly raised, with rungs
    box(16, 0.3, 0.3, C.silver, { y: 4.9, x: 1.2, z: 0.6, rz: 0.06 }),
    box(16, 0.3, 0.3, C.silver, { y: 4.9, x: 1.2, z: -0.6, rz: 0.06 }),
    box(15.5, 0.12, 0.12, C.gray, { y: 4.6, x: 1.2, rz: 0.06 }),
    ...Array.from({ length: 26 }, (_, i) => box(0.09, 0.09, 1.2, C.silver, { y: 4.68 + i * 0.038, x: -6.4 + i * 0.62 })),
    ...Array.from({ length: 8 }, (_, i) => box(0.06, 0.9, 0.06, C.gray, { y: 5.35 + i * 0.03, x: -5.6 + i * 2, z: 0.62 })),
    rbox(1.4, 0.6, 1.5, C.yellow, { y: 5.4, x: 9.1, segments: 1, bevel: 0.1 }),
    ]),
    rbox(0.3, 0.7, 2.6, C.red, { y: 1.5, x: -7.8, segments: 1, bevel: 0.08 }),
    // outriggers
    box(0.3, 0.3, 4.4, C.dark, { y: 0.7, x: -3.6 }),
    cyl(0.15, 0.15, 0.7, C.silver, { y: 0.4, x: -3.6, z: 2.2, segments: 8 }),
    cyl(0.15, 0.15, 0.7, C.silver, { y: 0.4, x: -3.6, z: -2.2, segments: 8 }),
    box(0.7, 0.15, 0.7, C.dark, { y: 0.08, x: -3.6, z: 2.2 }),
    box(0.7, 0.15, 0.7, C.dark, { y: 0.08, x: -3.6, z: -2.2 }),
    ...lightBar(6.3, 3.95, 0, 2.2),
    ...lightBar(-7.6, 2.75, 0, 2.2),
    ...wheel(6.0, 0.95, 1.5, 0.95, 0.7), ...wheel(6.0, 0.95, -1.5, 0.95, 0.7),
    ...wheel(-5.5, 0.95, 1.5, 0.95, 0.7), ...wheel(-5.5, 0.95, -1.5, 0.95, 0.7),
    ...wheel(-7.4, 0.95, 1.5, 0.95, 0.7), ...wheel(-7.4, 0.95, -1.5, 0.95, 0.7),
  ];
  add('laddertruck', ltParts(false), { value: 10 });

  add('burningHouseA', burningHouseA(), { value: 30, radius: 7 });
  add('burningHouseB', burningHouseB(), { value: 35, radius: 7.6 });
  add('laddertruckUp', ltParts(true), { value: 10, radius: 7.6 });
  add('policestation', policeStationParts(), { value: 75, radius: 13.5 });
  add('hospital', hospitalParts(), { value: 110, radius: 15 });

  // ---- response-scene props ----
  const hoseCol = (name, col) => add(name, [
    ...curve((t) => [-1.5 + 3 * t, 0.16, 0.14 * Math.sin(t * PI * 2)], 6, 0.15, col, 6),
    cyl(0.22, 0.22, 0.3, C.silver, { x: -1.5, y: 0.16, rz: PI / 2, segments: 8 }),
    cyl(0.22, 0.22, 0.3, C.silver, { x: 1.5, y: 0.16, rz: PI / 2, segments: 8 }),
  ], { value: 0.3, radius: 1.1 });
  hoseCol('hose', '#e2b52e');
  hoseCol('hoseRed', '#c2352d');

  const ffHat = () => [
    sphere(0.24, C.yellow, { y: 1.47, x: -0.02, sy: 0.7, segments: 10, rings: 6 }),
    cyl(0.3, 0.3, 0.04, C.yellow, { y: 1.42, x: -0.03, segments: 12 }),
    box(0.3, 0.04, 0.06, C.orange, { y: 1.62, x: -0.02 }),
    box(0.04, 0.14, 0.2, C.red, { y: 1.5, x: 0.2 }),
    cyl(0.12, 0.12, 0.6, C.silver, { y: 0.9, x: -0.32, segments: 8, flat: false }),
  ];
  // static firefighter aiming a hose: low jet at the ground-floor windows, high jet at the upper floor
  const sprayer = (name, endX, endY, lift) => add(name, [
    ...person({ coat: C.tan, pants: C.tan, vest: C.yellow, hat: ffHat() }),
    tube([0.2, 0.95, 0.12], [0.9, 1.1, 0], 0.09, C.yellow, 6),
    cone(0.1, 0.32, '#c9a227', { x: 1.02, y: 1.1, rz: -PI / 2, segments: 8 }),
    ...curve((t) => [-0.25 - 2.6 * t, 0.9 * (1 - t) + 0.15, 0.25 + 0.5 * Math.sin(t * 3)], 6, 0.09, C.yellow, 6),
    ...jet([1.2, 1.1, 0], [endX, endY, 0], lift),
  ], { value: 1.6, radius: 1.3 });
  sprayer('firefighterSpray', 3.9, 2.8, 0.5);
  sprayer('firefighterSprayHi', 3.9, 5.8, 0.6);

  // ground monitor (deck gun) on a base, jet up at the windows
  const monitor = (name, endX, endY, lift) => add(name, [
    rbox(1.0, 0.14, 1.0, C.dark, { y: 0.07, segments: 1, bevel: 0.04 }),
    cyl(0.14, 0.18, 0.8, C.red, { y: 0.55, segments: 10 }),
    sphere(0.2, C.red, { y: 1.0, segments: 8, rings: 6 }),
    tube([0, 1.0, 0], [0.5, 1.3, 0], 0.13, C.silver, 8),
    cone(0.13, 0.3, '#c9a227', { x: 0.66, y: 1.36, rz: -PI / 2 + 0.5, segments: 8 }),
    cyl(0.16, 0.16, 0.5, C.red, { y: 0.2, z: 0.45, rx: PI / 2, segments: 8 }),
    ...jet([0.8, 1.4, 0], [endX, endY, 0], lift),
  ], { value: 1.4, radius: 1.3 });
  monitor('monitorLow', 3.3, 3.0, 0.5);
  monitor('monitorHi', 3.3, 5.8, 0.4);

  add('barrier', [
    ...[-1.3, 1.3].flatMap((x) => [
      box(0.1, 1.1, 0.1, C.silver, { x, y: 0.55, z: 0.28, rx: -0.3 }), box(0.1, 1.1, 0.1, C.silver, { x, y: 0.55, z: -0.28, rx: 0.3 }),
      box(0.14, 0.08, 0.8, C.dark, { x, y: 0.04, z: 0.34 }), box(0.14, 0.08, 0.8, C.dark, { x, y: 0.04, z: -0.34 }),
    ]),
    ...[0, 1, 2, 3, 4, 5].flatMap((i) => [
      box(0.5, 0.26, 0.07, i % 2 ? C.white : C.red, { x: -1.25 + i * 0.5, y: 0.95, z: 0 }),
      box(0.5, 0.26, 0.07, i % 2 ? C.red : C.white, { x: -1.25 + i * 0.5, y: 0.62, z: 0 }),
    ]),
    box(3.0, 0.06, 0.09, C.dark, { y: 1.1 }),
    sphere(0.1, C.orange, { x: -1.3, y: 1.2, segments: 6, rings: 5 }), sphere(0.1, C.orange, { x: 1.3, y: 1.2, segments: 6, rings: 5 }),
  ], { value: 1.2, radius: 1.6 });

  // people
  const capHat = (col) => [
    cyl(0.23, 0.24, 0.13, col, { y: 1.6, segments: 10 }),
    box(0.22, 0.03, 0.3, col, { y: 1.54, x: 0.22 }),
    box(0.05, 0.06, 0.1, C.yellow, { y: 1.6, x: 0.24 }),
  ];
  add('officer', person({ coat: '#26386b', pants: '#1a2547', hat: [...capHat('#1a2547'), box(0.03, 0.14, 0.14, C.yellow, { y: 0.95, x: 0.23, z: 0.12 })] }),
    { value: 0.6, move: { type: 'walk', speed: 1.3, range: 8 } });
  add('paramedic', person({ coat: '#2c5aa0', pants: '#22385f', vest: '#ff7a1a', hat: [box(0.04, 0.16, 0.2, C.red, { y: 0.95, x: 0.23 })] }),
    { value: 0.6, move: { type: 'walk', speed: 1.3, range: 5 } });
  add('doctor', person({ coat: '#f7f7f7', pants: '#4a78b8', hat: [torus(0.17, 0.02, C.dark, { y: 1.12, x: 0.05, rx: PI / 2, radial: 5, segments: 10 })] }),
    { value: 0.6, move: { type: 'walk', speed: 1.3, range: 8 } });
  add('nurse', person({ coat: '#7fc7e6', pants: '#7fc7e6', hair: '#8a5a2b', hat: [box(0.22, 0.1, 0.3, C.white, { y: 1.6, x: -0.02 }), box(0.05, 0.05, 0.1, C.red, { y: 1.62, x: 0.1 })] }),
    { value: 0.6, move: { type: 'walk', speed: 1.3, range: 8 } });
  [['onlookerA', '#c14b4b', '#3c4552'], ['onlookerB', '#4b8bc1', '#5a4a3a'], ['onlookerC', '#7a58b8', '#2f3a45'], ['onlookerD', '#e0a53a', '#4b4b55']].forEach(([n, coat, pants], i) =>
    add(n, person({ coat, pants, hair: ['#2a1b10', '#7a4a20', '#c9a46a', '#1a1a1a'][i], hat: i % 2 ? [] : [sphere(0.2, coat, { y: 1.52, x: -0.02, sy: 0.55, segments: 8, rings: 5 })] }),
      { value: 0.5, move: { type: 'walk', speed: 0.8, range: 2.5 } }));

  add('policebike', [
    ...wheel(0.85, 0.38, 0, 0.38, 0.2), ...wheel(-0.85, 0.38, 0, 0.38, 0.2),
    rbox(1.0, 0.45, 0.42, C.white, { x: 0.15, y: 0.85, segments: 1, bevel: 0.1 }),
    rbox(1.02, 0.14, 0.44, C.navy, { x: 0.15, y: 0.78, segments: 1, bevel: 0.05 }),
    rbox(0.8, 0.14, 0.34, C.dark, { x: -0.5, y: 0.98, segments: 1, bevel: 0.05 }),
    box(1.6, 0.1, 0.2, C.dgray, { y: 0.55 }),
    tube([0.85, 0.38, 0], [0.6, 1.2, 0], 0.05, C.silver, 6),
    box(0.08, 0.06, 0.9, C.dark, { x: 0.55, y: 1.25 }),
    box(0.05, 0.5, 0.6, C.glass, { x: 0.72, y: 1.5, rz: -0.35 }),
    rbox(0.5, 0.36, 0.22, C.white, { x: -0.8, y: 0.9, z: 0.3, segments: 1, bevel: 0.06 }), rbox(0.5, 0.36, 0.22, C.white, { x: -0.8, y: 0.9, z: -0.3, segments: 1, bevel: 0.06 }),
    rbox(0.22, 0.14, 0.5, '#2b6bff', { x: -1.0, y: 1.3, z: 0.14, segments: 1, bevel: 0.04 }), rbox(0.22, 0.14, 0.5, C.red, { x: -1.0, y: 1.3, z: -0.14, segments: 1, bevel: 0.04 }),
    box(0.1, 0.16, 0.24, '#fff6c8', { x: 0.95, y: 1.0 }),
  ], { value: 2 });

  add('policecap', [
    cyl(0.45, 0.5, 0.3, '#1a2547', { y: 0.3, segments: 12 }),
    cyl(0.5, 0.5, 0.06, '#1a2547', { y: 0.5, segments: 12 }),
    box(0.5, 0.05, 0.6, C.dark, { x: 0.45, y: 0.18 }),
    box(0.08, 0.2, 0.2, C.yellow, { x: 0.48, y: 0.42 }),
  ], { value: 0.2 });
  add('medkit', [
    rbox(0.9, 0.6, 0.4, C.white, { y: 0.35, segments: 1, bevel: 0.08 }),
    box(0.5, 0.1, 0.5, C.red, { y: 0.34, z: 0.15, sx: 0.001 }),
    box(0.4, 0.14, 0.03, C.red, { y: 0.35, z: 0.22 }), box(0.14, 0.4, 0.03, C.red, { y: 0.35, z: 0.22 }),
    box(0.3, 0.06, 0.06, C.dgray, { y: 0.7 }),
  ], { value: 0.2 });
  add('wheelchair', [
    ...[0.32, -0.32].map((z) => torus(0.4, 0.035, C.dark, { y: 0.45, x: -0.15, z, segments: 16, radial: 5 })),
    ...[0.3, -0.3].map((z) => cyl(0.1, 0.1, 0.06, C.dgray, { y: 0.14, x: 0.5, z, rx: PI / 2, segments: 8 })),
    box(0.5, 0.06, 0.5, '#2b4a7a', { y: 0.55, x: 0.1 }), box(0.06, 0.55, 0.5, '#2b4a7a', { y: 0.85, x: -0.15 }),
    tube([0.35, 0.55, 0.28], [0.45, 0.2, 0.28], 0.03, C.silver, 5), tube([0.35, 0.55, -0.28], [0.45, 0.2, -0.28], 0.03, C.silver, 5),
    tube([-0.15, 1.1, 0.26], [-0.4, 1.15, 0.26], 0.03, C.silver, 5), tube([-0.15, 1.1, -0.26], [-0.4, 1.15, -0.26], 0.03, C.silver, 5),
  ], { value: 0.5 });
  add('stretcher', [
    rbox(2.0, 0.12, 0.8, C.white, { y: 0.95, segments: 1, bevel: 0.03 }),
    rbox(1.9, 0.06, 0.7, '#3b8fd4', { y: 1.03, x: -0.05, segments: 1, bevel: 0.02 }),
    rbox(0.5, 0.14, 0.6, '#f4f4f4', { y: 1.14, x: -0.75, segments: 1, bevel: 0.05 }),
    ...[[-0.8, 0.3], [-0.8, -0.3], [0.8, 0.3], [0.8, -0.3]].flatMap(([x, z]) => [tube([x, 0.9, z], [x, 0.3, z], 0.05, C.silver, 6), cyl(0.14, 0.14, 0.1, C.dark, { x, y: 0.14, z, rx: PI / 2, segments: 8 })]),
    box(2.0, 0.05, 0.05, C.silver, { y: 0.35, z: 0.3 }), box(2.0, 0.05, 0.05, C.silver, { y: 0.35, z: -0.3 }),
    tube([1.0, 1.0, 0.3], [1.5, 1.05, 0.3], 0.04, C.silver, 5), tube([1.0, 1.0, -0.3], [1.5, 1.05, -0.3], 0.04, C.silver, 5),
  ], { value: 1.5 });
  add('hospitalSign', [
    cyl(0.1, 0.1, 2.6, C.dgray, { y: 1.3, segments: 8, flat: false }),
    rbox(1.6, 1.6, 0.14, '#2b6bd6', { y: 2.9, segments: 1, bevel: 0.06 }),
    box(0.22, 1.0, 0.16, C.white, { y: 2.9, x: -0.35 }), box(0.22, 1.0, 0.16, C.white, { y: 2.9, x: 0.35 }), box(0.7, 0.2, 0.16, C.white, { y: 2.9 }),
    rbox(0.9, 0.9, 0.1, C.white, { y: 1.9, z: 0.02, segments: 1, bevel: 0.04 }),
    box(0.7, 0.2, 0.14, C.red, { y: 1.9, z: 0.02 }), box(0.2, 0.7, 0.14, C.red, { y: 1.9, z: 0.02 }),
  ], { value: 1.2 });

  add('watertower', (() => {
    const p = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      p.push(cyl(0.18, 0.3, 9.5, C.dwood, { y: 4.6, x: sx * 2.2, z: sz * 2.2, rz: -sx * 0.1, rx: sz * 0.1, segments: 10 }));
    }
    for (const y of [3, 6.2]) {
      p.push(
        box(5.6, 0.3, 0.2, C.dtan, { y, z: 2.2 - y * 0.02 }), box(5.6, 0.3, 0.2, C.dtan, { y, z: -2.2 + y * 0.02 }),
        box(0.2, 0.3, 5.6, C.dtan, { y, x: 2.2 - y * 0.02 }), box(0.2, 0.3, 5.6, C.dtan, { y, x: -2.2 + y * 0.02 }),
      );
    }
    // diagonal cross braces
    p.push(
      box(0.12, 6.2, 0.12, C.dark, { y: 4.6, z: 2.2, rz: 0.72 }), box(0.12, 6.2, 0.12, C.dark, { y: 4.6, z: 2.2, rz: -0.72 }),
      box(0.12, 6.2, 0.12, C.dark, { y: 4.6, z: -2.2, rz: 0.72 }), box(0.12, 6.2, 0.12, C.dark, { y: 4.6, z: -2.2, rz: -0.72 }),
      box(0.12, 6.2, 0.12, C.dark, { y: 4.6, x: 2.2, rx: 0.72 }), box(0.12, 6.2, 0.12, C.dark, { y: 4.6, x: -2.2, rx: -0.72 }),
    );
    p.push(
      cyl(3.6, 3.6, 0.4, C.dark, { y: 9.7, segments: 18 }),
      // tank barrel + hoops
      lathe([[3.0, 9.9], [3.3, 10.4], [3.35, 11.6], [3.3, 12.8], [3.0, 13.3]], C.red, { segments: 20 }),
      ...[10.4, 11.4, 12.4, 13.2].map((y) => torus(3.36 - (y > 13 ? 0.15 : 0), 0.07, C.dark, { y, rx: PI / 2, radial: 5, segments: 20 })),
      lathe([[3.4, 13.2], [3.2, 14.3], [2.0, 15.4], [0.8, 16.0], [0, 16.2]], C.dred, { segments: 20 }),
      sphere(0.3, C.silver, { y: 16.5, segments: 8, rings: 6, flat: false }),
      // ladder + walkway + pipe + sign band
      box(0.1, 9.2, 0.1, C.gray, { y: 4.8, x: 3.5, z: 0.3 }), box(0.1, 9.2, 0.1, C.gray, { y: 4.8, x: 3.5, z: -0.3 }),
      ...Array.from({ length: 14 }, (_, i) => box(0.06, 0.06, 0.6, C.gray, { y: 0.8 + i * 0.66, x: 3.5 })),
      cyl(0.22, 0.22, 9.2, C.dgray, { y: 4.6, x: -1.0, z: 3.4, segments: 8, flat: false }),
      box(6.4, 0.06, 0.06, C.white, { y: 11.9, z: 3.36, sx: 0.001 }),
    );
    return p;
  })(), { value: 30, radius: 4 });

  add('firestation', (() => {
    const p = [
      rbox(27, 0.4, 15, C.gray, { y: 0.2, segments: 1, bevel: 0.1 }),
      ...shell(26, 14, 7.6, 0.4, '#c0392b', {
        surface: 'brick',
        front: [-10.5, -4.5, 4.5, 10.5].map((x) => ({ x, y: 6.0, w: 1.6, h: 1.2 })),
        right: [-2, 2].map((z) => ({ z, y: 4.5, w: 1.6, h: 1.4 })),
      }),
      box(26.4, 0.6, 14.4, C.white, { y: 8.2 }),
      rbox(26.5, 0.5, 14.5, C.dred, { y: 7.6, segments: 1, bevel: 0.08 }),
      rbox(20, 1.0, 12, C.gray, { y: 8.9, x: 2.0, segments: 1, bevel: 0.15 }),
      ...[0, 1, 2, 3, 4, 5].map((i) => box(26, 0.1, 0.06, '#a5301f', { y: 1.4 + i * 1.0, z: 7.02 })),
    ];
    // three garage bays: arched frame + roller door
    for (const x of [-7.5, 0, 7.5]) {
      p.push(
        rbox(6.2, 5.6, 0.3, C.white, { y: 3.1, x, z: 7.08, segments: 1, bevel: 0.1 }),
        rbox(5.4, 5.0, 0.3, '#2c2c30', { y: 2.85, x, z: 7.15, segments: 1, bevel: 0.05 }),
        ...[0, 1, 2, 3, 4].map((i) => box(5.2, 0.86, 0.14, i % 2 ? C.lgray : C.silver, { y: 0.7 + i * 0.98, x, z: 7.34 })),
        ...[0, 1, 2, 3, 4].map((i) => box(5.2, 0.06, 0.16, C.gray, { y: 1.18 + i * 0.98, x, z: 7.36 })),
        ...[-1.8, -0.6, 0.6, 1.8].map((dx) => box(0.5, 0.26, 0.16, C.glass, { y: 4.2, x: x + dx, z: 7.36 })),
        box(6.6, 0.4, 0.4, C.yellow, { y: 6.0, x, z: 7.2 }),
        box(0.3, 0.7, 0.4, C.yellow, { y: 5.7, x: x - 3.1, z: 7.2 }),
        box(0.3, 0.7, 0.4, C.yellow, { y: 5.7, x: x + 3.1, z: 7.2 }),
        cyl(0.2, 0.2, 0.15, C.red, { y: 6.6, x: x - 1.2, z: 7.3, rx: PI / 2, segments: 8 }),
        cyl(0.2, 0.2, 0.15, C.blue, { y: 6.6, x: x + 1.2, z: 7.3, rx: PI / 2, segments: 8 }),
      );
    }
    // sign plaque with badge
    p.push(
      rbox(7, 1.0, 0.3, C.yellow, { y: 7.1, x: 0, z: 7.2, segments: 1, bevel: 0.08 }),
      rbox(6.5, 0.7, 0.32, C.red, { y: 7.1, x: 0, z: 7.22, segments: 1, bevel: 0.05 }),
      cyl(0.6, 0.6, 0.15, C.yellow, { y: 7.5, x: 0, z: 7.35, rx: PI / 2, segments: 12 }),
      cyl(0.42, 0.42, 0.18, C.red, { y: 7.5, x: 0, z: 7.38, rx: PI / 2, segments: 12 }),
    );
    // hose tower (back left): brick shaft, louvre band, pyramid roof, clock
    p.push(
      rbox(4.4, 20, 4.4, '#a52d22', { y: 10, x: -11.5, z: -4, segments: 1, bevel: 0.15 }),
      rbox(4.9, 0.7, 4.9, C.white, { y: 19.6, x: -11.5, z: -4, segments: 1, bevel: 0.08 }),
      rbox(4.8, 0.3, 4.8, C.dark, { y: 17.2, x: -11.5, z: -4, segments: 1, bevel: 0.05 }),
      ...[0, 1, 2, 3, 4].map((i) => box(1.4, 0.1, 0.06, C.dark, { y: 18.0 + i * 0.3, x: -11.5, z: -1.77 })),
      cone(3.6, 3.2, C.dark, { y: 21.9, x: -11.5, z: -4, ry: PI / 4, segments: 4 }),
      cyl(1.0, 1.0, 0.16, C.white, { y: 14.5, x: -11.5, z: -1.75, rx: PI / 2, segments: 16 }),
      cyl(0.85, 0.85, 0.18, '#fff8e0', { y: 14.5, x: -11.5, z: -1.74, rx: PI / 2, segments: 16 }),
      box(0.08, 0.6, 0.06, C.dark, { y: 14.7, x: -11.5, z: -1.62 }),
      box(0.45, 0.08, 0.06, C.dark, { y: 14.5, x: -11.3, z: -1.62 }),
      ...win(-11.5, 10.5, -1.8, 1.4, 1.8, 'z', 1),
      ...win(-11.5, 6.0, -1.8, 1.4, 1.8, 'z', 1),
      cyl(0.1, 0.1, 3, C.silver, { y: 24.5, x: -11.5, z: -4, segments: 8 }),
      // flag pole out front
      cyl(0.12, 0.12, 9, C.silver, { y: 4.5, x: 12.2, z: 9, segments: 8, flat: false }),
      sphere(0.2, C.yellow, { y: 9.1, x: 12.2, z: 9, segments: 8, rings: 6 }),
      box(1.7, 1.1, 0.05, C.red, { y: 8.3, x: 13.1, z: 9 }),
      box(0.6, 1.1, 0.06, C.blue, { y: 8.3, x: 12.5, z: 9 }),
      // rooftop AC units + planters + bench + steps
      rbox(1.6, 0.8, 1.6, C.silver, { y: 9.6, x: 6, z: -1, segments: 1, bevel: 0.1 }),
      cyl(0.5, 0.5, 0.05, C.dark, { y: 10.03, x: 6, z: -1, segments: 12 }),
      rbox(1.2, 0.7, 1.2, C.lgray, { y: 9.55, x: 1, z: 1, segments: 1, bevel: 0.08 }),
      rbox(3, 0.6, 1.0, C.brick, { y: 0.7, x: -12.5, z: 8.4, segments: 1, bevel: 0.08 }),
      rbox(3, 0.6, 1.0, C.brick, { y: 0.7, x: 12.5, z: 8.4, segments: 1, bevel: 0.08 }),
      sphere(0.8, C.green, { y: 1.4, x: -12.5, z: 8.4, sy: 0.7, segments: 10, rings: 6 }),
      sphere(0.8, C.green, { y: 1.4, x: 12.5, z: 8.4, sy: 0.7, segments: 10, rings: 6 }),
      box(2.4, 0.5, 0.2, C.yellow, { y: 0.55, x: 12.5, z: 5.6, sx: 0.001 }),
    );
    return p;
  })(), { value: 90, radius: 13 });

  // ---------------------------------------------------------------------------------------------------------------
  // Town fabric: fences, hedges, street furniture, shops, apartments, school, church, gas station
  // ---------------------------------------------------------------------------------------------------------------
  const picket = (col, rail) => {
    const p = [box(2.4, 0.07, 0.05, rail, { y: 0.25, surface: 'wood' }), box(2.4, 0.07, 0.05, rail, { y: 0.65, surface: 'wood' }),
      box(0.1, 0.9, 0.1, rail, { y: 0.45, x: -1.15, surface: 'wood' }), box(0.1, 0.9, 0.1, rail, { y: 0.45, x: 1.15, surface: 'wood' })];
    for (let x = -1.0; x < 1.05; x += 0.2) p.push(box(0.1, 0.78, 0.03, col, { y: 0.42, x: x + 0.05, z: 0.04, surface: 'wood' }), box(0.1, 0.1, 0.03, col, { y: 0.84, x: x + 0.05, z: 0.04, rz: PI / 4, surface: 'wood' }));
    return p;
  };
  add('picket', picket(C.white, '#e6e2d6'), { value: 0.2, radius: 0.9 });
  add('picketWood', picket('#b98d55', '#8a6535'), { value: 0.2, radius: 0.9 });
  add('hedge', [
    rbox(2.4, 0.85, 0.8, C.dgreen, { y: 0.45, segments: 1, bevel: 0.2, surface: 'foliage' }),
    rbox(2.0, 0.3, 0.7, C.green, { y: 0.9, segments: 1, bevel: 0.12, surface: 'foliage' }),
    ...[-0.8, 0, 0.8].map((x) => sphere(0.25, C.lgreen, { y: 0.85, x, z: 0.2, segments: 7, rings: 5, surface: 'foliage' })),
  ], { value: 0.3, radius: 0.9, sway: 'tree' });
  add('streetlight', [
    cyl(0.16, 0.22, 0.3, C.dgray, { y: 0.15, segments: 8 }),
    cyl(0.07, 0.1, 4.6, C.dgray, { y: 2.5, segments: 8 }),
    box(1.1, 0.07, 0.07, C.dgray, { y: 4.8, x: 0.45 }),
    rbox(0.6, 0.15, 0.3, C.silver, { y: 4.72, x: 0.95, segments: 1, bevel: 0.04 }),
    box(0.45, 0.04, 0.2, '#fff2c0', { y: 4.63, x: 0.95, emissive: 0.8 }),
  ], { value: 0.4, radius: 0.5 });
  add('trashcan', [
    lathe([[0.26, 0], [0.34, 0.05], [0.37, 0.9]], '#3f5a46', { segments: 12 }),
    cyl(0.4, 0.4, 0.06, '#2d4234', { y: 0.93, segments: 12 }),
    cyl(0.4, 0.4, 0.04, '#2d4234', { y: 0.2, segments: 12 }),
    box(0.2, 0.05, 0.05, C.dark, { y: 1.0 }),
  ], { value: 0.25 });
  add('planter', [
    cyl(0.35, 0.28, 0.5, '#b86a45', { y: 0.25, segments: 10, surface: 'stone' }),
    cyl(0.37, 0.37, 0.06, '#9d5836', { y: 0.5, segments: 10 }),
    sphere(0.38, C.lgreen, { y: 0.75, sy: 0.7, segments: 8, rings: 5, surface: 'foliage' }),
    ...[[0.15, 0.95, 0.1], [-0.15, 0.9, -0.1], [0.0, 1.0, -0.2], [-0.2, 0.92, 0.2]].map(([x, y, z], i) => sphere(0.1, ['#f06a8c', '#f6cc3a', '#e0463a', '#ffffff'][i], { x, y, z, segments: 5, rings: 4 })),
  ], { value: 0.2 });
  add('bikeRack', [
    ...[-0.6, 0, 0.6].map((x) => torus(0.3, 0.035, C.gray, { y: 0.34, x, ry: PI / 2, radial: 5, segments: 12, surface: 'metal' })),
    box(1.5, 0.05, 0.1, C.dgray, { y: 0.03 }),
    ...[-0.3, 0.3].map((x) => cyl(0.3, 0.3, 0.05, C.tire, { y: 0.3, x, z: 0.0, rx: PI / 2, segments: 12, surface: 'rubber' })),
  ], { value: 0.3 });
  add('cafeTable', [
    cyl(0.4, 0.4, 0.05, C.white, { y: 0.78, segments: 12 }), cyl(0.05, 0.05, 0.78, C.dgray, { y: 0.39, segments: 6 }), cyl(0.25, 0.25, 0.04, C.dgray, { y: 0.02, segments: 8 }),
    ...[0, 1].flatMap((i) => { const z = i ? 0.75 : -0.75; return [box(0.4, 0.05, 0.4, C.red, { y: 0.45, z }), box(0.4, 0.4, 0.05, C.red, { y: 0.68, z: z + (i ? 0.2 : -0.2) }), box(0.05, 0.45, 0.05, C.dgray, { y: 0.22, z: z + 0.15, x: 0.15 }), box(0.05, 0.45, 0.05, C.dgray, { y: 0.22, z: z - 0.15, x: -0.15 })]; }),
  ], { value: 0.4, radius: 0.9 });
  add('busStop', [
    box(3.0, 0.1, 1.3, C.dgray, { y: 0.05 }),
    ...[-1.4, 1.4].map((x) => box(0.08, 2.4, 0.08, C.dgray, { y: 1.2, x, z: -0.5 })),
    rbox(3.2, 0.12, 1.5, C.blue, { y: 2.45, segments: 1, bevel: 0.04 }),
    box(3.0, 1.9, 0.05, C.glass, { y: 1.35, z: -0.6 }),
    box(2.0, 0.07, 0.4, C.dwood, { y: 0.55, z: -0.35 }),
    cyl(0.04, 0.04, 2.6, C.dgray, { y: 1.3, x: 1.9, z: 0.4, segments: 6 }), rbox(0.5, 0.5, 0.05, C.blue, { y: 2.6, x: 1.9, z: 0.4, segments: 1, bevel: 0.03 }),
  ], { value: 1.2, radius: 1.5 });

  // Shops: single storey, big shop windows, awning, sign band
  const shop = (wall, awn) => {
    const W = 10, D = 8, H = 4.2, p = [box(W + 0.6, 0.3, D + 0.6, C.lgray, { y: 0.15 })];
    p.push(...shell(W, D, H, 0.3, wall, {
      front: [{ x: -2.7, y: 1.9, w: 3.4, h: 2.0 }, { x: 2.6, y: 1.9, w: 3.0, h: 2.0 }],
      right: [{ z: 0, y: 2.0, w: 1.6, h: 1.4 }], left: [{ z: 0, y: 2.0, w: 1.6, h: 1.4 }],
      glass: '#9fd6ea', frame: C.dgray,
    }));
    p.push(
      rbox(W + 0.4, 0.5, D + 0.4, C.dgray, { y: H + 0.55, segments: 1, bevel: 0.08 }),
      rbox(W - 0.4, 0.2, D - 0.4, '#8a8f95', { y: H + 0.85, segments: 1, bevel: 0.05 }),
      rbox(3.4, 0.9, 3.4, C.lgray, { y: H + 1.4, x: -2.5, z: -1.5, segments: 1, bevel: 0.1 }), cyl(0.7, 0.7, 0.06, C.dark, { y: H + 1.88, x: -2.5, z: -1.5, segments: 10 }),
      // door, awning with stripes, sign
      rbox(1.2, 2.2, 0.1, C.dwood, { y: 1.4, x: 0.15, z: D / 2 + 0.05, segments: 1, bevel: 0.04 }),
      rbox(W - 1, 0.1, 1.5, awn, { y: 3.5, z: D / 2 + 0.75, rx: 0.2, segments: 1, bevel: 0.03, surface: 'fabric' }),
      ...[-4, -2, 0, 2, 4].map((x) => box(0.9, 0.12, 1.52, C.white, { y: 3.5, x, z: D / 2 + 0.75, rx: 0.2, surface: 'fabric' })),
      rbox(5, 0.7, 0.14, C.white, { y: 4.4, x: 0, z: D / 2 + 0.1, segments: 1, bevel: 0.04 }), box(4.2, 0.28, 0.16, awn, { y: 4.4, x: 0, z: D / 2 + 0.12 }),
    );
    return p;
  };
  add('shopRed', shop('#efe3c8', '#c9372f'), { value: 4, radius: 5.8 });
  add('shopBlue', shop('#d7e4ef', '#2f6fb5'), { value: 4, radius: 5.8 });
  add('shopGreen', shop('#e8e4cf', '#3f8f56'), { value: 4, radius: 5.8 });

  // Apartment block: 4 floors, windows on every face, balconies on the street side
  const apartment = (wall, trim) => {
    const W = 15, D = 10, L = 3.1, F = 4, H = L * F, p = [box(W + 0.8, 0.3, D + 0.8, C.lgray, { y: 0.15 })];
    const winsF = [];
    for (let f = 0; f < F; f++) for (const x of [-4.8, 0, 4.8]) if (!(f === 0 && x === 0)) winsF.push({ x, y: 0.3 + f * L + 1.7, w: 1.5, h: 1.5 });
    p.push(...shell(W, D, H, 0.3, wall, { front: winsF, glass: '#8fc3dc', frame: trim }));
    // plain glass panes on the back and sides (cheap)
    for (let f = 0; f < F; f++) {
      const y = 0.3 + f * L + 1.7;
      for (const x of [-4.8, -1.6, 1.6, 4.8]) p.push(box(1.3, 1.3, 0.05, '#7fb0c8', { y, x, z: -D / 2 - 0.02 }));
      for (const z of [-2.8, 0, 2.8]) for (const sx of [-1, 1]) p.push(box(0.05, 1.3, 1.3, '#7fb0c8', { y, x: sx * (W / 2 + 0.02), z }));
      if (f > 0) for (const x of [-4.8, 4.8]) p.push(box(2.4, 0.15, 1.2, C.lgray, { y: 0.3 + f * L, x, z: D / 2 + 0.6 }), box(2.4, 0.9, 0.05, C.dgray, { y: 0.3 + f * L + 0.55, x, z: D / 2 + 1.18 }));
    }
    p.push(
      rbox(W + 0.5, 0.6, D + 0.5, trim, { y: H + 0.6, segments: 1, bevel: 0.1 }),
      rbox(5, 1.8, 4, wall, { y: H + 1.2, x: 4, z: -1, segments: 1, bevel: 0.1 }),
      rbox(1.8, 0.8, 1.8, C.silver, { y: H + 1.0, x: -4, z: 1, segments: 1, bevel: 0.08 }),
      // entrance: door, canopy, steps
      rbox(2.2, 2.4, 0.12, C.glass, { y: 1.5, x: 0, z: D / 2 + 0.05, segments: 1, bevel: 0.04 }),
      rbox(3.2, 0.2, 1.6, C.dgray, { y: 3.0, x: 0, z: D / 2 + 0.8, segments: 1, bevel: 0.05 }),
      box(3.0, 0.2, 1.2, C.lgray, { y: 0.4, x: 0, z: D / 2 + 0.8 }),
    );
    return p;
  };
  add('apartmentBrick', apartment('#c1694b', C.white), { value: 10, radius: 8 });
  add('apartmentCream', apartment('#eadfc2', '#8f98a3'), { value: 10, radius: 8 });

  add('school', (() => {
    const W = 26, D = 9, L = 3.6, H = L * 2, p = [box(W + 0.8, 0.3, D + 0.8, C.lgray, { y: 0.15 })];
    const wins = [];
    for (let f = 0; f < 2; f++) for (let i = 0; i < 6; i++) { const x = -10.5 + i * 4.2; if (Math.abs(x) > 1.5 || f === 1) wins.push({ x, y: 0.3 + f * L + 1.9, w: 1.8, h: 1.6 }); }
    p.push(...shell(W, D, H, 0.3, '#c8704f', { front: wins, glass: '#9fd0e6', frame: C.white, surface: 'brick' }));
    for (let f = 0; f < 2; f++) for (let i = 0; i < 6; i++) p.push(box(1.7, 1.5, 0.05, '#86b6cc', { y: 0.3 + f * L + 1.9, x: -10.5 + i * 4.2, z: -D / 2 - 0.02 }));
    for (let f = 0; f < 2; f++) for (const sx of [-1, 1]) p.push(box(0.05, 1.5, 1.7, '#86b6cc', { y: 0.3 + f * L + 1.9, x: sx * (W / 2 + 0.02), z: 0 }));
    p.push(
      rbox(W + 0.6, 0.6, D + 0.6, C.white, { y: H + 0.6, segments: 1, bevel: 0.1 }),
      // central entrance block with pediment, door and columns
      rbox(6.4, H + 1.4, 1.4, '#d98a62', { y: (H + 1.4) / 2 + 0.3, z: D / 2 + 0.7, segments: 1, bevel: 0.1, surface: 'brick' }),
      extrude([[-3.4, 0], [3.4, 0], [0, 1.6]], 1.6, C.white, { y: H + 1.7, z: D / 2 + 0.7 }),
      rbox(2.6, 2.6, 0.14, C.dwood, { y: 1.6, z: D / 2 + 1.45, segments: 1, bevel: 0.05 }),
      ...[-1.8, 1.8].map((x) => cyl(0.18, 0.18, 3.2, C.white, { y: 1.9, x, z: D / 2 + 2.0, segments: 8 })),
      rbox(4.6, 0.25, 1.6, C.white, { y: 3.6, z: D / 2 + 2.0, segments: 1, bevel: 0.05 }),
      cyl(0.7, 0.7, 0.14, C.white, { y: H + 0.4, z: D / 2 + 1.5, rx: PI / 2, segments: 14 }), cyl(0.58, 0.58, 0.16, '#fff8e0', { y: H + 0.4, z: D / 2 + 1.52, rx: PI / 2, segments: 14 }),
      rbox(3.5, 1.0, 3.0, C.lgray, { y: H + 1.3, x: 8, z: -1, segments: 1, bevel: 0.1 }),
      // flag pole + steps
      cyl(0.08, 0.08, 7, C.silver, { y: 3.5, x: 8.6, z: D / 2 + 2.6, segments: 8 }), box(1.1, 0.7, 0.04, C.red, { y: 6.4, x: 9.2, z: D / 2 + 2.6 }),
      box(4.8, 0.2, 1.2, C.lgray, { y: 0.4, z: D / 2 + 2.0 }),
    );
    return p;
  })(), { value: 20, radius: 12 });

  add('church', (() => {
    const W = 8, D = 14, H = 6, p = [box(W + 0.8, 0.3, D + 0.8, C.lgray, { y: 0.15 })];
    const side = [-4, 0, 4].map((z) => ({ z, y: 3.3, w: 1.2, h: 2.4 }));
    p.push(...shell(W, D, H, 0.3, '#f1ece0', { left: side, right: side, glass: '#5a7fc0', frame: C.white }));
    // gable roof along Z
    p.push(
      box(W / 2 + 1.0, 0.25, D + 1.2, '#6b4a3a', { y: H + 1.8, x: -W / 4 - 0.3, rz: 0.62, surface: 'roof' }),
      box(W / 2 + 1.0, 0.25, D + 1.2, '#6b4a3a', { y: H + 1.8, x: W / 4 + 0.3, rz: -0.62, surface: 'roof' }),
      extrude([[-W / 2, 0], [W / 2, 0], [0, 3.1]], 0.3, '#f1ece0', { y: H + 0.3, z: D / 2 - 0.15, surface: 'stucco' }),
      extrude([[-W / 2, 0], [W / 2, 0], [0, 3.1]], 0.3, '#f1ece0', { y: H + 0.3, z: -D / 2 + 0.15, surface: 'stucco' }),
      // tower at the front with belfry and spire
      rbox(4.2, 12, 4.2, '#f1ece0', { y: 6.3, z: D / 2 + 1.0, segments: 1, bevel: 0.1, surface: 'stucco' }),
      rbox(4.6, 0.5, 4.6, C.lgray, { y: 12.4, z: D / 2 + 1.0, segments: 1, bevel: 0.06 }),
      ...[[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dz]) => box(dx ? 0.1 : 1.2, 2.0, dz ? 0.1 : 1.2, C.dark, { y: 10.6, x: dx * 2.12, z: D / 2 + 1.0 + dz * 2.12 })),
      cone(3.2, 6, '#5a5f66', { y: 15.7, z: D / 2 + 1.0, segments: 4, ry: PI / 4 }),
      box(0.12, 1.2, 0.12, C.yellow, { y: 19.2, z: D / 2 + 1.0 }), box(0.7, 0.12, 0.12, C.yellow, { y: 19.4, z: D / 2 + 1.0 }),
      // doors, steps, round window
      rbox(2.0, 3.0, 0.14, C.dwood, { y: 1.9, z: D / 2 + 3.15, segments: 1, bevel: 0.05 }), box(3.2, 0.2, 1.0, C.lgray, { y: 0.4, z: D / 2 + 3.6 }),
      cyl(0.9, 0.9, 0.12, '#4a6fb0', { y: 8.6, z: D / 2 + 3.1, rx: PI / 2, segments: 14 }),
    );
    return p;
  })(), { value: 12, radius: 8.5 });

  add('gasStation', (() => {
    const p = [box(24, 0.12, 16, '#5b5e63', { y: 0.06, x: 0, z: 0 })];
    // kiosk at the back
    p.push(...shell(9, 5, 3.6, 0.12, '#e8ecef', { cz: -5.5, cx: -5, front: [{ x: -7.2, y: 1.9, w: 2.6, h: 1.8 }, { x: -3, y: 1.9, w: 1.2, h: 2.2 }], glass: '#9fd6ea', frame: C.red }),
      rbox(9.6, 0.4, 5.6, C.red, { y: 3.9, x: -5, z: -5.5, segments: 1, bevel: 0.08 }), rbox(4, 0.7, 3, C.lgray, { y: 4.4, x: -6, z: -5.5, segments: 1, bevel: 0.08 }));
    // canopy over the pumps
    p.push(rbox(14, 0.6, 8, C.white, { y: 5.6, x: 3, z: 2.5, segments: 1, bevel: 0.1 }), box(14.2, 0.2, 8.2, C.red, { y: 5.9, x: 3, z: 2.5 }));
    for (const x of [-2.5, 8.5]) for (const z of [-0.5, 5.5]) p.push(cyl(0.22, 0.22, 5.4, C.lgray, { y: 2.8, x, z, segments: 8 }));
    for (const x of [0.5, 5.5]) {
      p.push(box(3.4, 0.25, 1.2, C.lgray, { y: 0.25, x, z: 2.5 }),
        rbox(0.9, 1.7, 0.6, C.white, { y: 1.1, x: x - 0.5, z: 2.5, segments: 1, bevel: 0.08 }), rbox(0.9, 1.7, 0.6, C.white, { y: 1.1, x: x + 0.5, z: 2.5, segments: 1, bevel: 0.08 }),
        box(0.7, 0.4, 0.04, C.dark, { y: 1.6, x: x - 0.5, z: 2.82 }), box(0.7, 0.4, 0.04, C.dark, { y: 1.6, x: x + 0.5, z: 2.82 }),
        box(0.9, 0.3, 0.64, C.red, { y: 1.9, x: x - 0.5, z: 2.5 }), box(0.9, 0.3, 0.64, C.blue, { y: 1.9, x: x + 0.5, z: 2.5 }));
    }
    // price pylon + air/ice
    p.push(cyl(0.12, 0.12, 6, C.dgray, { y: 3, x: 10.5, z: 7, segments: 8 }), rbox(1.8, 1.8, 0.3, C.red, { y: 6.2, x: 10.5, z: 7, segments: 1, bevel: 0.06 }),
      ...[0, 1, 2].map((i) => box(1.4, 0.22, 0.34, '#ffe45a', { y: 6.7 - i * 0.5, x: 10.5, z: 7.02, emissive: 0.6 })), rbox(1.4, 1.0, 0.8, C.blue, { y: 0.6, x: -10, z: -1, segments: 1, bevel: 0.06 }));
    return p;
  })(), { value: 10, radius: 9.5 });


  return P;
}
