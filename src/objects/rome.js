// Playful Rome: warm stone, tiled palazzi, open arcades and umbrella pines.
// Buildings face +Z; vehicles and people face +X.
import * as THREE from 'three';
import { box, rbox, cyl, cone, sphere, torus, capsule, lathe, extrude, makeProto, articulate } from './build.js';
import { facadeWall, recessedWindow } from './ModelDetails.js';
import { applyModelFinishes } from './ModelFinishes.js';

const PI = Math.PI, TAU = PI * 2;
const C = {
  stone: '#ead7b2', light: '#fff1d2', shade: '#cbb58e', terra: '#c76c48', roof: '#bb573b',
  cream: '#f4dfb6', peach: '#efbb97', ochre: '#dfa15b', pink: '#e9a899', green: '#4e7744',
  leaf: '#719957', darkLeaf: '#365e3d', iron: '#474a43', wood: '#9a6c43', dark: '#493e32',
  water: '#71c6ce', glass: '#79aebb', white: '#fff5de', red: '#df5b45', gold: '#e8bd59',
  tire: '#343537', chrome: '#d1d5c7', skin: '#edbb90', blue: '#659baa', mint: '#80bda3',
};
const xf = (parts, x = 0, y = 0, z = 0, ry = 0) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
  parts.forEach(g => g.applyMatrix4(m));
  return parts;
};
const ball = (r, c, o = {}) => sphere(r, c, { segments: 10, rings: 6, ...o });
const tube = (rt, rb, h, c, o = {}) => cyl(rt, rb, h, c, { segments: 12, ...o });
const ring = (r, t, c, o = {}) => torus(r, t, c, { segments: 16, radial: 5, ...o });
const arch = (w, h, n = 8) => {
  const r = w / 2, spring = h - r, p = [[-r, 0], [r, 0], [r, spring]];
  for (let i = 1; i <= n; i++) { const a = i / n * PI; p.push([r * Math.cos(a), spring + r * Math.sin(a)]); }
  return p;
};
const archWall = (w, h, opening, spring) => {
  const r = opening / 2, p = [[-w / 2, 0], [-w / 2, h], [w / 2, h], [w / 2, 0], [r, 0], [r, spring]];
  for (let i = 1; i <= 8; i++) { const a = i / 8 * PI; p.push([r * Math.cos(a), spring + r * Math.sin(a)]); }
  p.push([-r, 0]);
  return p;
};
const column = (h = 5, r = 0.42, color = C.light) => [
  box(r * 3, 0.28, r * 3, C.shade, { y: 0.14, surface: 'stone' }),
  tube(r * 1.22, r * 1.3, 0.25, color, { y: 0.4, surface: 'stone' }),
  tube(r * 0.83, r, h - 1, color, { y: h / 2, surface: 'stone' }),
  tube(r * 1.23, r, 0.22, C.shade, { y: h - 0.43, surface: 'stone' }),
  box(r * 3, 0.28, r * 3, color, { y: h - 0.15, surface: 'stone' }),
];
const statue = (s = 1, color = C.light) => [
  tube(0.42 * s, 0.54 * s, 0.45 * s, C.shade, { y: 0.225 * s }),
  capsule(0.14 * s, 0.7 * s, color, { x: -0.17 * s, y: 0.94 * s, segments: 8, caps: 3 }),
  capsule(0.14 * s, 0.7 * s, color, { x: 0.17 * s, y: 0.94 * s, segments: 8, caps: 3 }),
  tube(0.32 * s, 0.4 * s, 0.8 * s, color, { y: 1.62 * s }),
  ball(0.26 * s, color, { y: 2.27 * s }),
  capsule(0.12 * s, 0.6 * s, color, { x: -0.43 * s, y: 1.7 * s, rz: -0.48, segments: 8, caps: 3 }),
  capsule(0.12 * s, 0.6 * s, color, { x: 0.44 * s, y: 1.95 * s, rz: -0.75, segments: 8, caps: 3 }),
];
const wheelAssembly = (x, z, radius, front) => {
  const pivot = [x, radius, z], options = { radius, front };
  const tire = articulate(tube(radius, radius, 0.27, C.tire, { x, y: radius, z, rx: PI / 2, segments: 20, surface: 'rubber' }), 'wheel', pivot, options);
  const hub = articulate(tube(radius * 0.54, radius * 0.54, 0.3, C.chrome, { x, y: radius, z, rx: PI / 2, segments: 16, surface: 'metal' }), 'wheel', pivot, options);
  const spokes = [-1, 1].flatMap(face => Array.from({ length: 6 }, (_, i) => articulate(
    box(radius * 0.075, radius * 0.66, 0.03, C.white, { x, y: radius, z: z + face * 0.16, rz: i * PI / 3, surface: 'metal' }), 'wheel', pivot, options)));
  return [tire, hub, ...spokes];
};
const wheels = (length, width, radius = 0.43) => [-1, 1].flatMap(a => [-1, 1].flatMap(b => wheelAssembly(a * length, b * width, radius, a > 0)));
const person = (shirt, skin, hat = false) => {
  const p = [];
  for (const side of [-1, 1]) {
    const hip = [0, 0.56, side * 0.18], knee = [0, 0.3, side * 0.18], legOpts = { side, hip };
    p.push(articulate(capsule(0.07, 0.22, C.dark, { y: 0.41, z: side * 0.18, segments: 12, caps: 5, surface: 'fabric' }), 'leg', hip, legOpts));
    p.push(articulate(capsule(0.075, 0.18, C.dark, { y: 0.165, z: side * 0.18, segments: 12, caps: 5, surface: 'fabric' }), 'shin', knee, legOpts));
    p.push(articulate(box(0.27, 0.12, 0.22, C.iron, { x: 0.05, y: 0.07, z: side * 0.18, surface: 'rubber' }), 'shin', knee, legOpts));
    const armPivot = [0, 1.12, side * 0.4], armOpts = { side };
    p.push(articulate(capsule(0.12, 0.22, shirt, { x: -0.02, y: 1.17, z: side * 0.34, rz: -side * 0.1, segments: 12, caps: 5, surface: 'fabric' }), 'arm', armPivot, armOpts));
    p.push(articulate(capsule(0.09, 0.36, skin, { x: -0.02, y: 0.88, z: side * 0.4, rz: -side * 0.1, segments: 12, caps: 5 }), 'arm', armPivot, armOpts));
    p.push(articulate(ball(0.09, skin, { x: 0.02, y: 0.65, z: side * 0.4, segments: 10, rings: 7 }), 'arm', armPivot, armOpts));
  }
  p.push(rbox(0.48, 0.68, 0.62, shirt, { y: 0.89, segments: 4, surface: 'fabric' }),
    rbox(0.19, 0.1, 0.34, C.white, { x: 0.02, y: 1.2, segments: 3, surface: 'fabric' }),
    ball(0.27, skin, { y: 1.52, segments: 16, rings: 10 }),
    // Dark swept hair frames the crown while leaving the +X-facing face open.
    ball(0.235, C.dark, { x: -0.06, y: 1.68, sy: 0.48, segments: 14, rings: 8 }),
    ball(0.065, skin, { x: -0.02, y: 1.5, z: -0.255, sx: 0.7 }), ball(0.065, skin, { x: -0.02, y: 1.5, z: 0.255, sx: 0.7 }),
    ball(0.043, C.dark, { x: 0.225, y: 1.56, z: -0.105, sx: 0.65, sy: 0.75, sz: 0.8 }),
    ball(0.043, C.dark, { x: 0.225, y: 1.56, z: 0.105, sx: 0.65, sy: 0.75, sz: 0.8 }),
    ball(0.065, skin, { x: 0.275, y: 1.47, sx: 1.3, sy: 0.8, sz: 0.8 }));
  if (hat) p.push(tube(0.33, 0.33, 0.07, C.gold, { y: 1.71, surface: 'fabric' }), tube(0.23, 0.25, 0.18, C.gold, { y: 1.82, surface: 'fabric' }));
  return p;
};
const FH = 3.1, GH = 4.4;
const gableShape = (z0, zf) => { const zr = (z0 + zf) / 2; return [[-zf, 0], [-z0, 0], [-zr, 1]]; };
// Roman apartment block / palazzo: arched shopfronts below, shuttered windows above, low terracotta roof with terrace.
const townhouse = (c) => {
  const { w, d, floors, nb, wall, shutter, awning, base = '#dbc7a0', trim = C.light, roof = C.roof, balc = false, terrace = true, flowers = 3, sign = '#3f5f4a' } = c;
  const h = GH + (floors - 1) * FH, front = d / 2, bw = w / nb, mid = (nb - 1) / 2, bx = i => (i - mid) * bw;
  const ww = Math.min(1.25, bw * 0.4);
  const p = [box(w, h, d - 0.6, wall, { y: h / 2, surface: 'stucco' }),
    box(w + 0.35, 0.4, d + 0.35, C.shade, { y: 0.2, surface: 'stone' }),
    box(w + 0.3, 0.3, d + 0.3, trim, { y: GH, surface: 'stone' }),
    box(w + 0.7, 0.4, d + 0.7, trim, { y: h - 0.05, surface: 'stone' }),
    box(w + 0.4, 0.22, d + 0.4, C.shade, { y: h - 0.4, surface: 'stone' })];
  for (const s of [-1, 1]) p.push(box(0.45, h - GH, 0.28, trim, { x: s * (w / 2 - 0.2), y: (GH + h) / 2, z: front + 0.03, surface: 'stone' }));
  // Ground floor: arched bays, centre bay is the wooden door, others are shops with signs and awnings.
  for (let i = 0; i < nb; i++) {
    const opw = Math.min(2.7, bw * 0.68), openH = 3.3, spring = openH - opw / 2, x = bx(i), door = i === mid;
    p.push(extrude(archWall(bw, GH, opw, spring), 0.18, base, { x, z: front - 0.09, surface: 'stone' }));
    if (door) p.push(extrude(arch(opw - 0.1, openH - 0.1), 0.06, C.wood, { x, z: front - 0.25, surface: 'wood' }),
      box(opw + 0.3, 0.2, 0.3, trim, { x, y: 0.1, z: front + 0.1, surface: 'stone' }));
    else {
      p.push(extrude(arch(opw - 0.15, openH - 0.15), 0.04, '#33454c', { x, z: front - 0.3, surface: 'glass' }),
        box(opw * 0.7, 0.9, 0.04, '#ffcf86', { x, y: 1.0, z: front - 0.27, emissive: 0.45 }),
        box(opw + 0.2, 0.5, 0.08, sign, { x, y: 3.85, z: front + 0.04, surface: 'paint' }));
      if (awning) for (let k = 0; k < 4; k++) p.push(box(opw * 1.1 / 4, 0.08, 1.3, k % 2 ? C.white : awning, { x: x + ((k + 0.5) / 4 - 0.5) * opw * 1.1, y: 3.2, z: front + 0.6, rx: 0.38, surface: 'fabric' }));
    }
  }
  // Upper floors: real window openings, shutters, balconies on the piano nobile, flower boxes.
  const rows = [];
  for (let j = 0; j < floors - 1; j++) {
    const nobile = j === 0, wh = nobile ? 2.3 : 2.0, yc = j * FH + (nobile ? 1.95 : 1.75);
    rows.push({ j, wh, yc });
  }
  const openings = [];
  for (const r of rows) for (let i = 0; i < nb; i++) openings.push({ x: bx(i), y: r.yc, width: ww, height: r.wh });
  p.push(...facadeWall(w, h - GH, 0.18, wall, openings, { y: GH, z: front - 0.09 }));
  for (const r of rows) for (let i = 0; i < nb; i++) {
    const x = bx(i), y = GH + r.yc;
    p.push(...recessedWindow(ww, r.wh, 0.2, { x, y, z: front, frameColor: trim, glassColor: C.glass, mullion: true, frame: 0.08 }));
    for (const s of [-1, 1]) p.push(box(ww * 0.42, r.wh, 0.07, shutter, { x: x + s * (ww / 2 + ww * 0.21 + 0.03), y, z: front + 0.04, surface: 'wood' }));
    if (balc && r.j === 0) {
      const by = y - r.wh / 2 - 0.08;
      p.push(box(ww + 0.8, 0.12, 0.75, trim, { x, y: by, z: front + 0.3, surface: 'stone' }), box(ww + 0.75, 0.06, 0.06, C.iron, { x, y: by + 0.85, z: front + 0.65, surface: 'metal' }),
        ...[-1, 1].map(s => box(0.06, 0.06, 0.6, C.iron, { x: x + s * (ww / 2 + 0.36), y: by + 0.85, z: front + 0.35, surface: 'metal' })),
        ...[-0.45, -0.15, 0.15, 0.45].map(k => box(0.04, 0.8, 0.04, C.iron, { x: x + k * (ww / 0.9), y: by + 0.45, z: front + 0.65, surface: 'metal' })));
    } else if ((i * 7 + r.j * 5 + floors) % 4 < flowers % 4 + (flowers > 0 ? 0 : -9)) {
      p.push(box(ww + 0.15, 0.28, 0.3, C.terra, { x, y: y - r.wh / 2 - 0.15, z: front + 0.2 }), ball(0.3, (i + r.j) % 2 ? '#e8708a' : '#e96a4a', { x, y: y - r.wh / 2 + 0.1, z: front + 0.2, sy: 0.6, segments: 7, rings: 4, surface: 'foliage' }));
    }
  }
  // Side and back walls: simple framed windows.
  const nz = Math.max(2, Math.floor(d / 3.6));
  for (let j = -1; j < floors - 1; j++) {
    const y = j < 0 ? 1.9 : GH + j * FH + 1.75, wh = j < 0 ? 1.4 : 1.9;
    for (let k = 0; k < nz; k++) {
      const z = (k - (nz - 1) / 2) * (d - 2.4) / nz;
      for (const s of [-1, 1]) p.push(box(1.1, wh + 0.2, 0.05, trim, { x: s * (w / 2 + 0.01), y, z, rotY: 0, ry: PI / 2, surface: 'stone' }), box(0.9, wh, 0.07, C.glass, { x: s * (w / 2 + 0.02), y, z, ry: PI / 2, surface: 'glass' }));
    }
    for (let i = 0; i < nb; i++) {
      p.push(box(1.1, wh + 0.2, 0.05, trim, { x: bx(i), y, z: -(d / 2 - 0.3) - 0.01, surface: 'stone' }), box(0.9, wh, 0.07, C.glass, { x: bx(i), y, z: -(d / 2 - 0.3) - 0.02, surface: 'glass' }));
    }
  }
  // Low-pitched terracotta roof; front strip is a roof terrace with parapet and plants.
  const z0 = -d / 2 - 0.35, zf = terrace ? d / 2 - 3.6 : d / 2 + 0.35, rh = 1.5, zr = (z0 + zf) / 2, y0 = h + 0.15;
  p.push(extrude(gableShape(z0, zf).map(([a, b]) => [a, b * rh]), w + 0.5, roof, { y: y0, ry: PI / 2, surface: 'roof', textureRotation: PI / 2 }),
    tube(0.12, 0.12, w + 0.5, C.terra, { y: y0 + rh, z: zr, rz: PI / 2, surface: 'roof' }));
  for (let x = -w / 2 + 0.4; x <= w / 2 - 0.3; x += 0.9) {
    p.push(box(0.07, 0.07, Math.hypot(zr - z0, rh), C.terra, { x, y: y0 + rh / 2 + 0.05, z: (z0 + zr) / 2, rx: -Math.atan2(rh, zr - z0), surface: 'roof' }),
      box(0.07, 0.07, Math.hypot(zf - zr, rh), C.terra, { x, y: y0 + rh / 2 + 0.05, z: (zf + zr) / 2, rx: Math.atan2(rh, zf - zr), surface: 'roof' }));
  }
  if (terrace) {
    const tz = (zf + d / 2 + 0.35) / 2, tl = d / 2 + 0.35 - zf;
    p.push(box(w - 0.1, 0.2, tl, '#c9a47c', { y: y0 + 0.05, z: tz, surface: 'stone' }),
      box(w + 0.3, 0.7, 0.16, trim, { y: y0 + 0.4, z: d / 2 + 0.3, surface: 'stone' }),
      ...[-1, 1].map(s => box(0.16, 0.7, tl, trim, { x: s * (w / 2 + 0.1), y: y0 + 0.4, z: tz, surface: 'stone' })));
    const n = Math.max(3, Math.round(w / 3));
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (w - 1.6) / n, z = d / 2 - 0.6 - (i % 2) * 1.2;
      p.push(tube(0.27, 0.2, 0.4, C.terra, { x, y: y0 + 0.35, z, segments: 8 }), ball(i % 3 === 0 ? 0.5 : 0.36, i % 2 ? C.leaf : C.darkLeaf, { x, y: y0 + 0.8, z, segments: 8, rings: 5, surface: 'foliage' }));
    }
    if (c.altana) p.push(box(2.4, 1.7, 2, C.wood, { x: -w / 4, y: y0 + 0.9, z: tz - 0.4, surface: 'wood' }), box(2.9, 0.18, 2.5, roof, { x: -w / 4, y: y0 + 1.85, z: tz - 0.4, surface: 'roof' }));
  }
  p.push(box(0.8, 1.6, 0.8, wall, { x: w / 3, y: y0 + rh + 0.4, z: zr - 0.8, surface: 'stucco' }), box(1, 0.15, 1, C.shade, { x: w / 3, y: y0 + rh + 1.25, z: zr - 0.8 }));
  return p;
};
// Palazzo with an inner courtyard: four wings around a stone court with a fountain and trees.
const courtPalazzo = (c) => {
  const { w, d, floors, wall, shutter, awning } = c, t = 5.5, h = GH + (floors - 1) * FH, front = d / 2, nb = 7, bw = w / nb, mid = 3, bx = i => (i - mid) * bw;
  const trim = C.light, ww = 1.2;
  const p = [box(w, h, t, wall, { y: h / 2, z: front - 0.3 - t / 2, surface: 'stucco' }), box(w, h, t, wall, { y: h / 2, z: -front + t / 2, surface: 'stucco' }),
    ...[-1, 1].map(s => box(t, h, d - 2 * t, wall, { x: s * (w / 2 - t / 2), y: h / 2, z: -0.15, surface: 'stucco' })),
    box(w + 0.35, 0.4, d + 0.35, C.shade, { y: 0.2, surface: 'stone' }),
    box(w - 2 * t, 0.15, d - 2 * t - 0.3, '#cdbb94', { y: 0.1, z: -0.15, surface: 'stone' }),
    box(w + 0.3, 0.3, d + 0.3, trim, { y: GH, surface: 'stone' }), box(w + 0.7, 0.4, d + 0.7, trim, { y: h - 0.05, surface: 'stone' })];
  for (let i = 0; i < nb; i++) {
    const door = i === mid, opw = door ? 3.2 : 2.4, openH = door ? 3.9 : 3.3, x = bx(i);
    p.push(extrude(archWall(bw, GH, opw, openH - opw / 2), 0.18, '#d8c39b', { x, z: front - 0.09, surface: 'stone' }));
    if (door) p.push(box(opw, 0.1, 5.4, '#cdbb94', { x, y: 0.12, z: front - 3 })); // open gateway to the court
    else p.push(extrude(arch(opw - 0.15, openH - 0.15), 0.04, '#33454c', { x, z: front - 0.3, surface: 'glass' }), box(opw + 0.2, 0.5, 0.08, '#6d3f2f', { x, y: 3.85, z: front + 0.04, surface: 'paint' }));
    if (!door && awning) for (let k = 0; k < 4; k++) p.push(box(opw * 1.1 / 4, 0.08, 1.3, k % 2 ? C.white : awning, { x: x + ((k + 0.5) / 4 - 0.5) * opw * 1.1, y: 3.2, z: front + 0.6, rx: 0.38, surface: 'fabric' }));
  }
  const openings = [];
  for (let j = 0; j < floors - 1; j++) for (let i = 0; i < nb; i++) openings.push({ x: bx(i), y: j * FH + 1.9, width: ww, height: 2.2 });
  p.push(...facadeWall(w, h - GH, 0.18, wall, openings, { y: GH, z: front - 0.09 }));
  for (let j = 0; j < floors - 1; j++) for (let i = 0; i < nb; i++) {
    const x = bx(i), y = GH + j * FH + 1.9;
    p.push(...recessedWindow(ww, 2.2, 0.2, { x, y, z: front, frameColor: trim, glassColor: C.glass, mullion: true, frame: 0.08 }));
    for (const s of [-1, 1]) p.push(box(0.5, 2.2, 0.07, shutter, { x: x + s * 0.88, y, z: front + 0.04, surface: 'wood' }));
  }
  // Windows on the other outer walls and onto the court (flat framed panes).
  for (let j = 0; j < floors - 1; j++) {
    const y = GH + j * FH + 1.75;
    for (let k = 0; k < 6; k++) {
      const x = (k - 2.5) * (w - 3) / 6, z = (k - 2.5) * (d - 3) / 6;
      p.push(box(0.9, 1.9, 0.07, C.glass, { x, y, z: -front - 0.02 + t, surface: 'glass' }), box(0.9, 1.9, 0.07, C.glass, { x, y, z: -front - 0.02, surface: 'glass' }),
        box(0.9, 1.9, 0.07, C.glass, { x, y, z: front - 0.3 - t + 0.02, surface: 'glass' }));
      for (const s of [-1, 1]) p.push(box(0.07, 1.9, 0.9, C.glass, { x: s * (w / 2 + 0.02), y, z, surface: 'glass' }), box(0.07, 1.9, 0.9, C.glass, { x: s * (w / 2 - t - 0.02), y, z: z * 0.5, surface: 'glass' }));
    }
  }
  const rh = 1.1, y0 = h + 0.15;
  p.push(extrude([[-t / 2 - 0.3, 0], [t / 2 + 0.3, 0], [0, rh]], w + 0.5, C.roof, { y: y0, z: front - 0.3 - t / 2, ry: PI / 2, surface: 'roof' }),
    extrude([[-t / 2 - 0.3, 0], [t / 2 + 0.3, 0], [0, rh]], w + 0.5, C.roof, { y: y0, z: -front + t / 2, ry: PI / 2, surface: 'roof' }),
    ...[-1, 1].map(s => extrude([[-t / 2 - 0.3, 0], [t / 2 + 0.3, 0], [0, rh]], d - 2 * t + 1, C.roof, { x: s * (w / 2 - t / 2), y: y0, z: -0.15, surface: 'roof' })));
  // Courtyard: fountain, lemon trees, pots.
  p.push(tube(0.9, 1, 0.5, C.stone, { y: 0.4, z: -0.15, surface: 'stone' }), tube(0.8, 0.8, 0.06, C.water, { y: 0.66, z: -0.15 }), tube(0.15, 0.2, 1.2, C.stone, { y: 1.1, z: -0.15 }), ball(0.3, C.light, { y: 1.8, z: -0.15 }));
  for (const [x, z] of [[-3.2, -1.2], [3.2, -1.2], [-3.2, 1.8], [3.2, 1.8]]) p.push(tube(0.25, 0.2, 0.4, C.terra, { x, y: 0.3, z }), tube(0.08, 0.1, 1.1, C.wood, { x, y: 0.9, z }), ball(0.75, C.leaf, { x, y: 1.9, z, segments: 8, rings: 5, surface: 'foliage' }));
  return p;
};

export function buildProtos() {
  // With nearly a thousand objects, modest rewards keep the final hole near radius 20.
  const P = {}, add = (name, parts, opts = {}) => {
    const proto = makeProto(name, parts, { ...opts, value: opts.value === undefined ? undefined : opts.value * 0.34 });
    P[name] = applyModelFinishes(proto, 'rome');
  };
  // Small food and treasures all fit the starting hole.
  add('pizza', [tube(0.56, 0.56, 0.12, C.gold, { y: 0.06 }), tube(0.48, 0.48, 0.05, '#efc67b', { y: 0.145 }),
    ...[[0.2, 0.18], [-0.2, 0.12], [0, -0.25]].map(([x, z]) => tube(0.1, 0.1, 0.04, C.red, { x, z, y: 0.19, segments: 8 })),
    ...[[0.3, -0.13], [-0.3, -0.12]].map(([x, z]) => box(0.15, 0.04, 0.08, C.green, { x, z, y: 0.2, ry: 0.5 }))], { value: 0.7 });
  add('gelato', [cone(0.18, 0.52, '#dba967', { y: 0.26, rz: PI, segments: 10 }), ball(0.24, '#f3adbd', { y: 0.66 }), ball(0.22, '#a7c78a', { y: 0.93 })], { value: 0.55 });
  add('espresso', [tube(0.19, 0.16, 0.3, C.white, { y: 0.22 }), tube(0.3, 0.3, 0.07, C.white, { y: 0.035 }),
    tube(0.15, 0.15, 0.02, C.dark, { y: 0.38 }), ring(0.1, 0.035, C.white, { x: 0.2, y: 0.22 })], { value: 0.45 });
  add('coin', [tube(0.22, 0.22, 0.08, C.gold, { y: 0.04, segments: 10 }), tube(0.13, 0.13, 0.02, '#f9db79', { y: 0.09, segments: 8 })], { value: 0.4 });
  add('amphora', [lathe([[0.18, 0], [0.24, 0.1], [0.42, 0.5], [0.38, 0.85], [0.17, 1.02], [0.18, 1.2], [0.25, 1.25]], C.terra, { segments: 12 }),
    ring(0.23, 0.055, C.gold, { y: 1.25, rx: PI / 2 }), ...[-1, 1].map(s => ring(0.2, 0.055, C.terra, { x: s * 0.35, y: 0.9 }))], { value: 1.1 });
  add('flowerPot', [tube(0.3, 0.22, 0.42, C.terra, { y: 0.21 }), ball(0.37, C.leaf, { y: 0.61, sy: 0.8 }),
    ...[[0.2, 0], [-0.12, 0.18], [-0.1, -0.18], [0, 0]].map(([x, z]) => ball(0.11, '#f28a9d', { x, z, y: 0.88, segments: 7, rings: 4 }))], { value: 0.9 });
  add('breadBasket', [rbox(0.8, 0.3, 0.6, C.wood, { y: 0.15, segments: 1 }),
    ...[-0.22, 0, 0.22].map(z => capsule(0.1, 0.52, C.gold, { y: 0.33, z, rz: PI / 2, segments: 8, caps: 3 }))], { value: 0.8 });
  add('pigeon', [ball(0.2, '#929ba0', { y: 0.24, sx: 1.4 }), ball(0.12, '#56736d', { x: 0.2, y: 0.43 }),
    cone(0.07, 0.16, C.gold, { x: 0.35, y: 0.43, rz: -PI / 2, segments: 6 }), box(0.2, 0.06, 0.27, '#d88765', { x: 0.03, y: 0.03 })], { value: 0.6, move: { type: 'walk', speed: 0.8, range: 1.4 } });
  add('bollard', [tube(0.16, 0.22, 0.83, C.iron, { y: 0.415 }), ball(0.21, C.iron, { y: 0.83 })], { value: 0.7 });
  add('chair', [box(0.72, 0.13, 0.68, C.wood, { y: 0.6 }), box(0.72, 0.6, 0.12, C.wood, { y: 0.98, z: -0.3 }),
    ...[-1, 1].flatMap(x => [-1, 1].map(z => box(0.08, 0.58, 0.08, C.iron, { x: x * 0.29, z: z * 0.25, y: 0.29 })))], { value: 1.1 });
  add('menuBoard', [box(0.65, 0.9, 0.1, C.wood, { y: 0.65, rx: -0.15 }), box(0.53, 0.75, 0.12, '#456359', { y: 0.65, rx: -0.15 }),
    box(0.65, 0.95, 0.08, C.wood, { y: 0.55, z: -0.27, rx: 0.3 }), ...[0.4, 0.58, 0.76].map(y => box(0.37, 0.03, 0.03, C.white, { y, z: 0.15 }))], { value: 0.9 });
  add('tourist', person(C.blue, C.skin, true), { value: 1.4, move: { type: 'walk', speed: 1.15, range: 2.5 } });
  add('local', person(C.red, '#bf8863'), { value: 1.4, move: { type: 'walk', speed: 1.25, range: 2.5 } });
  add('fruitCrate', [box(1.1, 0.5, 0.8, C.wood, { y: 0.25, surface: 'wood' }), box(0.95, 0.08, 0.65, '#704930', { y: 0.52, surface: 'wood' }),
    ...[-0.32, 0, 0.32].flatMap(x => [-0.2, 0.2].map(z => ball(0.15, '#ee9c45', { x, z, y: 0.68, segments: 8, rings: 5 })))], { value: 1.5 });
  add('trashCan', [tube(0.42, 0.4, 1.05, C.green, { y: 0.525 }), tube(0.44, 0.44, 0.12, C.iron, { y: 1.12 }),
    ...[0, 1, 2, 3, 4, 5].map(i => box(0.07, 0.82, 0.08, C.darkLeaf, { x: Math.cos(i / 6 * TAU) * 0.4, z: Math.sin(i / 6 * TAU) * 0.4, y: 0.5, ry: -i / 6 * TAU }))], { value: 1.5 });
  add('cafeTable', [tube(0.85, 0.85, 0.16, C.white, { y: 1 }), tube(0.1, 0.15, 0.88, C.iron, { y: 0.48 }),
    box(1.25, 0.1, 0.13, C.iron, { y: 0.05 }), box(0.13, 0.1, 1.25, C.iron, { y: 0.05 })], { value: 2.2 });
  add('bench', [box(2.7, 0.15, 0.75, C.wood, { y: 0.65, surface: 'wood' }), box(2.7, 0.55, 0.12, C.wood, { y: 1.05, z: -0.32, surface: 'wood' }),
    ...[-0.95, 0.95].map(x => box(0.2, 0.58, 0.65, C.iron, { x, y: 0.3 }))], { value: 3.5 });
  add('lamp', [tube(0.28, 0.4, 0.38, C.shade, { y: 0.19 }), tube(0.11, 0.16, 4.7, C.iron, { y: 2.55 }),
    box(0.8, 0.08, 0.8, C.iron, { y: 4.82 }), rbox(0.55, 0.7, 0.55, '#ffdf99', { y: 5.2, segments: 1 }), cone(0.5, 0.35, C.iron, { y: 5.7, segments: 4, ry: PI / 4 })], { value: 2.7 });
  add('drinkingFountain', [box(1.3, 0.22, 1.3, C.shade, { y: 0.11 }), tube(0.45, 0.55, 1.65, C.stone, { y: 1.05 }),
    ball(0.53, C.light, { y: 1.83, sy: 0.4 }), tube(0.12, 0.12, 0.42, C.iron, { x: 0.5, y: 1.26, rz: PI / 2 }),
    tube(0.43, 0.5, 0.12, C.water, { x: 0.65, y: 0.33 })], { value: 2.8 });
  add('cypress', [tube(0.18, 0.25, 1.7, C.wood, { y: 0.85, surface: 'wood' }), ball(0.85, C.darkLeaf, { y: 3.8, sy: 3.7, surface: 'foliage' }), ball(0.58, C.green, { y: 5.3, sy: 2.8, surface: 'foliage' })], { value: 4.5 });
  const pine = (r, h) => [tube(0.27, 0.46, h, C.wood, { y: h / 2, surface: 'wood' }),
    tube(0.12, 0.23, h * 0.45, C.wood, { x: -0.5, y: h * 0.85, rz: 0.6 }), tube(0.12, 0.23, h * 0.4, C.wood, { x: 0.55, y: h * 0.86, rz: -0.7 }),
    ball(r, C.darkLeaf, { y: h + 0.5, sy: 0.37, segments: 14, rings: 7, surface: 'foliage' }),
    ball(r * 0.77, C.leaf, { x: -r * 0.32, y: h + 0.85, z: r * 0.12, sy: 0.42, segments: 12, rings: 7, surface: 'foliage' }),
    ball(r * 0.65, C.green, { x: r * 0.42, y: h + 0.85, z: -r * 0.12, sy: 0.42, segments: 12, rings: 7, surface: 'foliage' })];
  add('umbrellaPineSmall', pine(1.65, 4.6), { value: 6 });
  add('umbrellaPine', pine(3.2, 7.5), { value: 11 });
  add('ruinColumn', column(5.6, 0.67), { value: 7 });
  add('columnFragment', [tube(0.72, 0.72, 1.6, C.stone, { y: 0.8 }), box(1.7, 0.3, 1.7, C.shade, { y: 0.15 }),
    box(0.35, 0.17, 0.4, C.light, { x: 0.35, y: 1.6, z: -0.14 })], { value: 3.5 });
  add('statue', statue(1.65), { value: 7 });
  add('bridgeAngel', [box(1.7, 1.4, 1.7, C.stone, { y: 0.7 }), ...xf(statue(1.15), 0, 1.4),
    ...[-1, 1].map(s => extrude([[0, 0], [s * 0.75, 0.95], [s * 1.1, 0.7], [s * 0.65, -0.1]], 0.15, C.light, { x: s * 0.3, y: 3.35, z: -0.15 }))], { value: 8 });
  add('bridgeRail', [box(3, 0.18, 0.55, C.light, { y: 1.2 }), box(3, 0.18, 0.65, C.shade, { y: 0.09 }),
    ...[-1.2, -0.6, 0, 0.6, 1.2].map(x => tube(0.1, 0.16, 1.05, C.stone, { x, y: 0.67, segments: 8 }))], { value: 4 });
  add('marketStall', [box(3.3, 0.3, 2, C.wood, { y: 1 }), box(3.3, 0.85, 1.9, C.terra, { y: 0.47 }),
    ...[-1, 1].flatMap(x => [-1, 1].map(z => box(0.09, 2.8, 0.09, C.wood, { x: x * 1.5, z: z * 0.88, y: 1.4 }))),
    ...Array.from({ length: 8 }, (_, i) => box(0.46, 0.15, 2.65, i % 2 ? C.white : C.red, { x: (i - 3.5) * 0.46, y: 2.85 })),
    ...[-1, 0, 1].flatMap(x => [-0.45, 0.3].map(z => ball(0.22, x === 0 ? '#e8b748' : C.leaf, { x, z, y: 1.33, segments: 8, rings: 5 })))], { value: 8 });
  add('gelatoCart', [rbox(2.3, 1.2, 1.45, C.mint, { y: 0.95, segments: 1 }), box(2.4, 0.13, 1.6, C.white, { y: 1.6 }),
    tube(0.07, 0.07, 2.5, C.iron, { x: -0.6, y: 2.65 }), cone(1.5, 0.65, C.red, { x: -0.6, y: 3.9, segments: 12 }),
    ...wheels(0.78, 0.7, 0.36), ...[-0.65, 0, 0.65].map(x => ball(0.22, x < 0 ? '#f1adbc' : x > 0 ? '#a9c88c' : C.gold, { x, y: 1.78 }))], { value: 6 });
  add('cafeUmbrella', [tube(0.08, 0.08, 3.1, C.wood, { y: 1.55 }), tube(0.38, 0.45, 0.2, C.shade, { y: 0.1 }),
    cone(1.85, 0.75, C.gold, { y: 3.18, segments: 12 }), cone(0.12, 0.3, C.wood, { y: 3.7, segments: 8 })], { value: 6 });
  add('fountain', [tube(2.45, 2.55, 0.34, C.shade, { y: 0.17, segments: 24 }), tube(2.15, 2.15, 0.12, C.water, { y: 0.4, segments: 24 }),
    ring(2.25, 0.22, C.light, { y: 0.4, rx: PI / 2, segments: 24 }), tube(0.24, 0.5, 1.5, C.stone, { y: 1.2 }),
    tube(1.12, 0.35, 0.25, C.light, { y: 1.9 }), tube(0.9, 0.9, 0.04, C.water, { y: 2.06 }),
    tube(0.13, 0.25, 0.75, C.stone, { y: 2.45 }), ball(0.25, C.light, { y: 2.93 }),
    ...[-1, 1].map(s => capsule(0.065, 1, '#a0dce0', { x: s * 0.72, y: 1.05, rz: s * 0.22, segments: 8, caps: 3 }))], { value: 13 });
const scooter = color => [rbox(1.9, 0.48, 0.52, color, { y: 0.62, segments: 5, surface: 'metal' }), rbox(0.7, 0.2, 0.62, C.dark, { x: -0.4, y: 1.03, segments: 4, surface: 'fabric' }),
    rbox(0.24, 1.05, 0.65, color, { x: 0.56, y: 0.98, rz: -0.18, segments: 5, surface: 'metal' }), box(0.12, 0.1, 1.03, C.chrome, { x: 0.65, y: 1.53, surface: 'metal' }),
    ball(0.19, C.white, { x: 0.82, y: 1.4, surface: 'glass' }), ...[-0.7, 0.7].flatMap((x, i) => wheelAssembly(x, 0, 0.33, i === 1)),
    tube(0.08, 0.08, 0.7, C.chrome, { x: -0.8, y: 0.53, rz: PI / 2, surface: 'metal' })];
  add('scooter', scooter(C.mint), { value: 3.5 });
  add('scooterRed', scooter(C.red), { value: 3.5 });
  add('scooterCream', scooter('#eadfb8'), { value: 3.5 });
  add('scooterBlue', scooter('#6d9fcf'), { value: 3.5 });
  add('scooterYellow', scooter('#e9bd4a'), { value: 3.5 });
  // Roman "nasone" drinking tap, hedges, iron fence, planters.
  add('nasone', [tube(0.22, 0.26, 0.2, C.iron, { y: 0.1, segments: 8 }), tube(0.13, 0.17, 1, '#43523f', { y: 0.7, segments: 8, surface: 'metal' }),
    ball(0.16, '#43523f', { y: 1.22, segments: 8, rings: 5 }), tube(0.04, 0.04, 0.3, C.iron, { x: 0.15, y: 0.95, rz: PI / 2, segments: 6 }),
    box(0.4, 0.06, 0.4, C.shade, { x: 0.3, y: 0.03 })], { value: 1.3 });
  add('hedge', [rbox(1.8, 0.85, 0.7, C.green, { y: 0.43, bevel: 0.25, segments: 2, surface: 'foliage' }), ball(0.4, C.leaf, { x: -0.4, y: 0.85, sy: 0.6, segments: 7, rings: 4, surface: 'foliage' }),
    ball(0.38, C.leaf, { x: 0.45, y: 0.82, sy: 0.6, segments: 7, rings: 4, surface: 'foliage' })], { value: 0.9 });
  add('ironFence', [box(1.8, 0.07, 0.07, C.iron, { y: 0.85, surface: 'metal' }), box(1.8, 0.07, 0.07, C.iron, { y: 0.25, surface: 'metal' }),
    ...Array.from({ length: 8 }, (_, i) => box(0.045, 0.95, 0.045, C.iron, { x: (i - 3.5) * 0.24, y: 0.48, surface: 'metal' })),
    ...[-0.88, 0.88].map(x => box(0.12, 1.05, 0.12, C.iron, { x, y: 0.52, surface: 'metal' }))], { value: 0.7 });
  add('planterBox', [box(1.6, 0.5, 0.55, C.terra, { y: 0.25, surface: 'stone' }), ...[-0.55, 0, 0.55].map((x, i) => ball(0.38, i === 1 ? C.leaf : C.green, { x, y: 0.7, segments: 7, rings: 5, surface: 'foliage' })),
    ...[-0.3, 0.3, 0.7, -0.7].map(x => ball(0.1, '#f28a9d', { x, y: 0.98, z: 0.1, segments: 6, rings: 4 }))], { value: 1.1 });
  add('topiary', [tube(0.28, 0.22, 0.45, C.terra, { y: 0.22, segments: 8 }), tube(0.05, 0.06, 0.5, C.wood, { y: 0.7, segments: 6 }), ball(0.4, C.green, { y: 1.15, sy: 1.15, segments: 8, rings: 6, surface: 'foliage' })], { value: 0.9 });
  const car = color => {
    const p = [
      rbox(3.6, 0.62, 1.42, color, { y: 0.66, segments: 5, surface: 'paint' }),
      // Side body panels use a concave arch profile so the tires remain visibly open.
      ...[-1, 1].map(side => {
        const profile = [[-1.82, 0.36], [-1.64, 0.36]];
        for (let i = 0; i <= 8; i++) { const a = Math.PI - i / 8 * Math.PI; profile.push([-1.17 + 0.47 * Math.cos(a), 0.39 + 0.47 * Math.sin(a)]); }
        profile.push([0.7, 0.36]);
        for (let i = 0; i <= 8; i++) { const a = Math.PI - i / 8 * Math.PI; profile.push([1.17 + 0.47 * Math.cos(a), 0.39 + 0.47 * Math.sin(a)]); }
        profile.push([1.82, 0.36], [1.82, 1.16], [-1.82, 1.16]);
        return extrude(profile, 0.12, color, { z: side * 0.78, surface: 'paint' });
      }),
      // Raised rounded roof and slanted windshield/readable rear glass.
      rbox(1.86, 0.66, 1.42, color, { x: -0.12, y: 1.7, segments: 5, surface: 'paint' }),
      box(0.09, 0.5, 1.28, C.glass, { x: 0.88, y: 1.68, rz: -0.34, surface: 'glass' }),
      box(0.09, 0.46, 1.28, C.glass, { x: -1.12, y: 1.67, rz: 0.36, surface: 'glass' }),
      ...[-1, 1].flatMap(side => [
        box(1.55, 0.42, 0.045, C.glass, { x: -0.13, y: 1.72, z: side * 0.73, surface: 'glass' }),
        box(0.035, 0.52, 0.055, C.chrome, { x: 0.58, y: 1.69, z: side * 0.76, surface: 'metal' }),
        box(0.035, 0.5, 0.055, C.chrome, { x: -0.85, y: 1.69, z: side * 0.76, surface: 'metal' }),
        // Fine door shut line and handle on each flank.
        box(0.025, 0.53, 0.025, C.dark, { x: 0.18, y: 0.86, z: side * 0.844, surface: 'metal' }),
        box(0.12, 0.035, 0.035, C.chrome, { x: -0.22, y: 1.02, z: side * 0.844, surface: 'metal' }),
        // Compact side mirror stays inside the original vehicle width.
        box(0.2, 0.1, 0.13, color, { x: 0.72, y: 1.54, z: side * 0.89, surface: 'paint' }),
      ]),
      ...[-0.57, 0.57].map(z => ball(0.17, C.white, { x: 1.83, y: 0.98, z, sx: 0.35, surface: 'glass' })),
      ...[-0.57, 0.57].map(z => ball(0.14, C.red, { x: -1.82, y: 0.94, z, sx: 0.35 })),
      // Front grille slats, plus the existing narrow bumpers.
      ...[-0.13, -0.065, 0, 0.065, 0.13].map(y => box(0.035, 0.025, 0.58, C.iron, { x: 1.84, y: 0.66 + y, surface: 'metal' })),
      box(0.14, 0.16, 1.7, C.chrome, { x: 1.9, y: 0.55, surface: 'metal' }),
      box(0.14, 0.16, 1.7, C.chrome, { x: -1.9, y: 0.55, surface: 'metal' }),
      ...wheels(1.17, 0.86),
    ];
    return p;
  };
  add('car', car(C.cream), { value: 5.5 });
  add('carOchre', car(C.ochre), { value: 5.5 });
  add('tourBus', [rbox(7.8, 1.6, 2.6, C.red, { y: 1.2, segments: 5, surface: 'paint' }), rbox(7.5, 0.85, 2.5, C.glass, { y: 2.42, segments: 5, surface: 'glass' }),
    box(7.8, 0.16, 2.6, C.gold, { y: 2.95 }), box(6, 0.28, 2.7, C.white, { x: -0.4, y: 1.2 }),
    ...Array.from({ length: 8 }, (_, i) => box(0.1, 0.85, 2.58, C.red, { x: -3.2 + i * 0.92, y: 2.42 })),
    box(0.1, 0.55, 1.9, C.glass, { x: 3.94, y: 2.36, surface: 'glass' }), ...wheels(2.65, 1.24, 0.57),
    ...[-0.86, 0.86].map(z => ball(0.17, C.white, { x: 3.92, z, y: 0.95, sx: 0.35 }))], { value: 12 });
  const O = '#dfa15b', TC = '#c9694a', BO = '#d9803f', CR = '#f1dfb8', RS = '#e6a58f', YL = '#e6b95f', SI = '#c27c4e';
  const GR = '#4f7a4a', BR = '#6a4a31', DG = '#3f6a58';
  const ap = (name, cfg, value) => add(name, townhouse(cfg), { value: value * 0.8, radius: Math.max(cfg.w, cfg.d) * 0.42 });
  ap('aptOchre', { w: 9, d: 10, floors: 5, nb: 3, wall: O, shutter: GR, awning: GR, flowers: 2, altana: true }, 15);
  ap('aptTerra', { w: 9, d: 10, floors: 4, nb: 3, wall: TC, shutter: DG, awning: C.red, flowers: 3, sign: '#5b3a2a' }, 12);
  ap('aptBurnt', { w: 12, d: 10, floors: 4, nb: 3, wall: BO, shutter: BR, awning: GR, flowers: 1, sign: '#2f4f5a' }, 17);
  ap('aptCream', { w: 12, d: 10, floors: 5, nb: 3, wall: CR, shutter: GR, awning: C.red, balc: true, sign: '#6a3b2c' }, 20);
  ap('aptRose', { w: 12, d: 10.5, floors: 6, nb: 3, wall: RS, shutter: DG, awning: C.gold, flowers: 2, altana: true }, 25);
  ap('aptSienna', { w: 15.5, d: 10.5, floors: 5, nb: 5, wall: SI, shutter: GR, awning: C.red, balc: true, flowers: 1 }, 30);
  ap('aptYellow', { w: 15.5, d: 10.5, floors: 4, nb: 5, wall: YL, shutter: BR, awning: DG, flowers: 3, sign: '#7a3f30' }, 25);
  ap('aptTall', { w: 13, d: 10, floors: 6, nb: 3, wall: '#d4894e', shutter: DG, awning: C.white, balc: true, flowers: 1, altana: true }, 29);
  ap('palazzoCream', { w: 19, d: 11, floors: 4, nb: 5, wall: CR, shutter: GR, awning: C.red, balc: true, flowers: 0, trim: '#fff5de' }, 38);
  ap('palazzoOchre', { w: 19, d: 11, floors: 5, nb: 5, wall: O, shutter: DG, awning: GR, balc: true, flowers: 1, sign: '#6b3a2b' }, 46);
  ap('aptSlim', { w: 6.5, d: 9, floors: 4, nb: 2, wall: '#e0b27a', shutter: GR, awning: C.red, flowers: 3, sign: '#5b3a2a' }, 8);
  ap('aptSlimTall', { w: 6.5, d: 9, floors: 5, nb: 2, wall: '#e8c58f', shutter: DG, awning: GR, balc: true, flowers: 2, altana: true }, 10);
  ap('aptSquare', { w: 8, d: 8, floors: 4, nb: 2, wall: '#d99a6a', shutter: BR, awning: DG, flowers: 2, sign: '#2f4f5a' }, 9);
  add('palazzoCourt', courtPalazzo({ w: 22, d: 18, floors: 4, wall: '#d8905a', shutter: GR, awning: C.red }), { value: 60, radius: 9.2 });
  add('obelisk', [box(3.8, 0.5, 3.8, C.shade, { y: 0.25 }), box(2.5, 1.2, 2.5, C.stone, { y: 1.1 }),
    tube(0.55, 0.87, 12, '#d89f78', { y: 7.5, segments: 4, ry: PI / 4 }), cone(0.55, 1.4, C.gold, { y: 14.2, segments: 4, ry: PI / 4 }),
    ...[3, 4.8, 6.6, 8.4, 10.2, 12].map(y => box(0.25, 0.35, 0.035, '#ae7259', { y, z: 0.61 }))], { value: 24 });
  add('romanTemple', (() => {
    const p = [box(13, 0.45, 9, C.shade, { y: 0.225 }), box(11.5, 0.45, 7.5, C.stone, { y: 0.67 })];
    for (const x of [-4.8, -2.4, 0, 2.4, 4.8]) p.push(...xf(column(6.8, 0.48), x, 0.9, -2.8));
    for (const x of [-4.8, 4.8]) for (const z of [-0.2, 2.4]) p.push(...xf(column(z > 0 ? 3.6 : 6.8, 0.48), x, 0.9, z));
    p.push(box(11.8, 0.7, 1.5, C.light, { y: 7.9, z: -2.8 }), extrude([[-5.9, 0], [4, 0], [0, 2.7]], 1.55, C.stone, { y: 8.25, z: -2.8 }),
      box(3.2, 0.6, 1.2, C.shade, { x: 2.5, y: 1.3, z: 1.6, ry: 0.5 }), tube(0.55, 0.55, 2.9, C.light, { x: -1.5, y: 1.65, z: 2.1, rz: PI / 2 }));
    return p;
  })(), { value: 70 });
  add('triumphalArch', (() => {
    const p = [extrude(archWall(10, 7.2, 3.7, 2.7), 3.4, C.stone), box(10.6, 0.35, 3.8, C.shade, { y: 7.25 }),
      box(10.2, 1.6, 3.5, C.light, { y: 8.2 }), box(10.7, 0.35, 3.9, C.shade, { y: 9.18 })];
    for (const x of [-3.8, 3.8]) for (const s of [-1, 1]) p.push(...xf(column(6.7, 0.3), x, 0, s * 1.85),
      box(1.5, 1.8, 0.18, C.shade, { x: x * 0.82, y: 4.1, z: s * 1.76 }));
    for (const s of [-1, 1]) p.push(box(6, 0.55, 0.15, C.shade, { y: 8.3, z: s * 1.82 }), ...xf(statue(0.8), -3.8, 9.35, s * 0.9), ...xf(statue(0.8), 3.8, 9.35, s * 0.9));
    return p;
  })(), { value: 65 });
  add('pantheon', (() => {
    const p = [tube(7.9, 8.2, 0.6, C.shade, { y: 0.3, segments: 32 }), tube(7.7, 7.7, 7.8, C.stone, { y: 4.2, segments: 32 }),
      tube(7.95, 7.95, 0.4, C.light, { y: 7.9, segments: 32 }),
      lathe([[7.9, 8.1], [7.85, 8.8], [7.3, 10.1], [6.4, 11.4], [5.1, 12.6], [3.5, 13.4], [1.1, 13.9]], '#c7b394', { segments: 40 }),
      ring(1.1, 0.18, C.light, { y: 13.92, rx: PI / 2, segments: 24 }),
      box(16, 0.45, 6.4, C.shade, { y: 0.225, z: 8.7 }), box(15.4, 0.4, 5.8, C.light, { y: 0.65, z: 8.7 }),
      box(15.2, 0.8, 5.6, C.stone, { y: 7.25, z: 8.7 }), extrude([[-8.1, 0], [8.1, 0], [0, 3.2]], 5.9, C.light, { y: 7.65, z: 8.7 }),
      extrude([[-6.6, 0], [6.6, 0], [0, 2.45]], 0.14, C.shade, { y: 8, z: 11.72 }),
      extrude(arch(3.2, 5), 0.25, C.dark, { y: 0.8, z: 7.69 }), box(7.7, 0.25, 0.2, '#b39462', { y: 7.28, z: 11.64 })];
    for (let i = 0; i < 8; i++) p.push(...xf(column(6.35, 0.42), (i - 3.5) * 1.91, 0.85, 10.5));
    for (const x of [-6.7, 6.7]) p.push(...xf(column(6.35, 0.42), x, 0.85, 7.7));
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; p.push(box(0.65, 3.7, 0.15, C.shade, { x: Math.cos(a) * 7.71, z: Math.sin(a) * 7.71, y: 4, ry: PI / 2 - a })); }
    return p;
  })(), { value: 120 });
  add('treviFountain', (() => {
    const p = [box(20, 0.55, 14, C.shade, { y: 0.275 }), box(18.8, 11.4, 3.2, C.stone, { y: 6.2, z: -4.8 }),
      box(20, 0.6, 3.8, C.light, { y: 12, z: -4.8 }), box(16.8, 2, 3.4, C.stone, { y: 13.25, z: -4.8 }),
      box(17.8, 0.4, 3.8, C.light, { y: 14.4, z: -4.8 }),
      extrude(arch(4.7, 8.3), 0.3, C.shade, { z: -3.13, y: 1.2 }), extrude(arch(3.6, 7.6), 0.35, C.dark, { z: -2.98, y: 1.2 }),
      tube(4.8, 5, 0.32, C.light, { y: 0.65, z: 2.2, sx: 1.85, segments: 32 }),
      tube(4.4, 4.4, 0.1, C.water, { y: 0.9, z: 2.2, sx: 1.85, segments: 32 }), ring(4.6, 0.2, C.light, { y: 0.9, z: 2.2, rx: PI / 2, sx: 1.85, segments: 32 }),
      box(7, 0.8, 3.8, C.light, { y: 1.2, z: -0.2 }), box(4, 0.65, 2.6, C.shade, { y: 1.9, z: -0.6 }),
      ...xf(statue(2.45), 0, 2.1, -1.3), ...xf(statue(1.6), -6.5, 1.3, -2.4), ...xf(statue(1.6), 6.5, 1.3, -2.4),
      box(0.09, 4.5, 0.09, C.gold, { x: 1.4, y: 6.2, z: -1.3 }), ...[-0.2, 0, 0.2].map(x => box(0.06, 0.6, 0.06, C.gold, { x: 1.4 + x, y: 8.7, z: -1.3 })),
      tube(0.95, 0.95, 0.3, C.gold, { y: 13.4, z: -2.92, rx: PI / 2, segments: 16 })];
    for (const x of [-8.1, -4.4, 4.4, 8.1]) p.push(...xf(column(10.5, 0.44), x, 0.8, -2.92));
    for (const s of [-1, 1]) {
      p.push(ball(1.05, C.light, { x: s * 3.8, y: 1.8, z: 1.4, sx: 1.45, sy: 0.6 }),
        capsule(0.4, 1.2, C.light, { x: s * 4.6, y: 2.5, z: 1.1, rz: s * 0.4, segments: 10, caps: 4 }),
        ball(0.45, C.light, { x: s * 4.9, y: 3.35, z: 1.1, sx: 1.35 }),
        capsule(0.12, 1.5, '#a2e1e1', { x: s * 2, y: 1.7, z: 1.9, rx: 0.55, segments: 8, caps: 3 }),
        ...xf(statue(0.95), s * 6.3, 14.65, -4.8));
    }
    return p;
  })(), { value: 135 });
  add('colosseum', (() => {
    const a = 14.6, b = 10.7, n = 32;
    const p = [tube(1, 1, 0.45, C.shade, { y: 0.225, sx: a + 0.8, sz: b + 0.8, segments: 48 }),
      tube(1, 1, 0.12, '#d8b78c', { y: 0.53, sx: 7.3, sz: 4.8, segments: 32 }),
      lathe([[7.4, 0.6], [7.4, 1], [8.2, 1], [8.2, 1.7], [9.1, 1.7], [9.1, 2.4], [10, 2.4], [10, 3.1], [11, 3.1], [11, 3.8], [12, 3.8]], C.stone, { sx: 1.1, sz: 0.76, segments: 40 })];
    for (let tier = 0; tier < 3; tier++) for (let i = 0; i < n; i++) {
      // The missing upper quarter reveals the stepped arena seating.
      if (tier === 2 && i >= 3 && i <= 11) continue;
      const t = (i + 0.5) / n * TAU, w = Math.hypot(a * Math.sin(t), b * Math.cos(t)) * TAU / n + 0.09;
      const yaw = Math.atan2(-b * Math.cos(t), -a * Math.sin(t));
      const parts = [extrude(archWall(w, 3, w * 0.66, 1.05), 0.95, tier === 1 ? C.light : C.stone),
        box(w + 0.07, 0.2, 1.15, C.shade, { y: 2.95 }), box(0.22, 2.7, 0.15, C.light, { x: -w / 2 + 0.15, y: 1.35, z: 0.58 }),
        box(0.22, 0.16, 0.2, C.light, { x: -w / 2 + 0.15, y: 2.72, z: 0.6 })];
      if (tier === 2) parts.push(box(w, 0.5, 1, C.stone, { y: 3.3 }), box(0.45, 0.45, 1, C.shade, { x: -w / 2 + 0.4, y: 3.77 }));
      p.push(...xf(parts, a * Math.cos(t), 0.5 + tier * 3.1, b * Math.sin(t), yaw));
    }
    // Exposed brick repairs and fallen blocks on the broken rim.
    for (const i of [3, 11]) { const t = (i + 0.5) / n * TAU; p.push(box(1.4, 0.6, 1.2, C.terra, { x: a * Math.cos(t), z: b * Math.sin(t), y: 6.9, ry: -t })); }
    return p;
  })(), { value: 180 });
  return P;
}
