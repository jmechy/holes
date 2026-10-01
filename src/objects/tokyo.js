// Tokyo object prototypes. Vehicles are length-along-X, front toward +X. Buildings face +Z.
import { paletteBuilders, makeProto, articulate } from './build.js';
import { facadeWall } from './ModelDetails.js';
import { applyModelFinishes } from './ModelFinishes.js';
import { TEXTURE_LAYERS } from './TextureLibrary.js';

const C = {
  white: '#f6f6f6', dark: '#2b2b2e', gray: '#8d949b', lgray: '#c3c8cc', dgray: '#55585e', chrome: '#dfe3e8',
  red: '#e0322b', dred: '#b5271f', orange: '#f28c28', yellow: '#ffd21f', green: '#3fa65a', dgreen: '#2f7a3a',
  blue: '#2f7fd6', navy: '#26356b', lblue: '#8fd3f4', pink: '#f7a1c4', hpink: '#ff4fa0', lpink: '#ffc9df',
  purple: '#8e6bbf', teal: '#2aa198', brown: '#8a5a2b', dbrown: '#5c3d1e', wood: '#c99a5b', skin: '#f1c8a0',
  tire: '#1f1f22', glass: '#9fd8f0', dglass: '#5f8fb0', cream: '#f0e6cc', black: '#151517', gold: '#e2b23c',
  roofgray: '#4a5866', lamp: '#fff2a8', stone: '#b7b1a4',
  neonG: '#39ff7a', neonB: '#35d0ff', neonY: '#fff23a', neonP: '#ff3fd0', neonR: '#ff4a4a',
};
// Explicit material colors retain the map palette; per-part tags override these defaults.
const { box, rbox, cyl, cone, sphere, torus, capsule, lathe, extrude } = paletteBuilders([
  [C.wood, 'wood'],
  [C.glass, 'glass'],
  [C.dglass, 'glass'],
  [C.tire, 'rubber'],
  [C.chrome, 'metal'],
  [C.stone, 'stone'],
  [C.dbrown, 'wood'],
  [C.roofgray, 'roof'],
  ['#3b4753', 'roof'],
  [C.lgray, 'metal'],
  [C.gray, 'metal'],
]);
const FALLBACK = { omamori: ['fabric', 0.5], lantern: ['fabric', 0.5], schoolgirl: ['fabric', 0.4], salaryman: ['fabric', 0.4], tourist: ['fabric', 0.4], kimono: ['fabric', 0.4], cat: ['fabric', 0.5], cat2: ['fabric', 0.5], bonsai: ['foliage', 0.5], shrine: ['stucco', 0.6], pagoda: ['stucco', 0.6] };
const DEFAULT_FALLBACK = ['paint', 0.5];
/** Give every vertex that is still plain colour a fallback surface (layer, strength) so no primitive is left flat. */
const fillSurface = (proto, [name, strength]) => {
  const { surface, textureInfo } = proto.geometry.attributes;
  const layer = TEXTURE_LAYERS[name];
  for (let i = 0; i < textureInfo.count; i++) {
    if (textureInfo.getX(i) !== 0) continue;
    textureInfo.setXY(i, layer, Math.round(strength * 255));
    surface.setXY(i, 0.75, 0);
  }
  return proto;
};

const PI = Math.PI;
const S8 = { segments: 8, rings: 5, flat: false };

/** Clone + rotate about Y + translate a list of parts (build a piece once, reuse it anywhere). */
const at = (parts, x = 0, y = 0, z = 0, ry = 0) => parts.map((g) => { const c = g.clone(); return (ry ? c.rotateY(ry) : c).translate(x, y, z); });

/** Rolling wheel (tire, hub, three crossed spokes) that spins with travel; front wheels also steer. */
const wheel = (x, y, z, r, w = 0.3, spokes = true) => {
  const pivot = [x, y, z], opts = { radius: r, front: x > 0 };
  return [
    cyl(r, r, w, C.tire, { x, y, z, rx: PI / 2, segments: 14, surface: 'rubber' }),
    cyl(r * 0.6, r * 0.6, w + 0.04, C.lgray, { x, y, z, rx: PI / 2, segments: 10, surface: 'metal' }),
    ...(spokes ? [0, 1, 2].map((i) => box(r * 1.05, r * 0.13, w + 0.08, C.dark, { x, y, z, rz: (i * PI) / 3, surface: 'metal' })) : []),
  ].map((g) => articulate(g, 'wheel', pivot, opts));
};

const person = (o, extra = []) => {
  const { shirt, pants, hair, skin = C.skin, shoes = C.dark, skirt } = o;
  const legSurface = pants === skin ? {} : { surface: 'fabric' };
  const p = [];
  for (const side of [-1, 1]) {
    const z = side * 0.09, hip = [0, 0.56, z], knee = [0, 0.3, z], leg = { side, hip };
    const shoulder = [0, 1.1, side * 0.29], arm = { side };
    p.push(
      articulate(cyl(0.085, 0.072, 0.34, pants, { y: 0.4, z, segments: 8, flat: false, ...legSurface }), 'leg', hip, leg),
      articulate(cyl(0.072, 0.062, 0.3, pants, { y: 0.16, z, segments: 8, flat: false, ...legSurface }), 'shin', knee, leg),
      articulate(box(0.28, 0.1, 0.16, shoes, { y: 0.05, x: 0.05, z, surface: 'rubber' }), 'shin', knee, leg),
      articulate(cyl(0.07, 0.058, 0.5, shirt, { y: 0.81, z: side * 0.29, segments: 8, flat: false, surface: 'fabric' }), 'arm', shoulder, arm),
      articulate(sphere(0.06, skin, { y: 0.53, z: side * 0.29, segments: 6, rings: 4, flat: false }), 'arm', shoulder, arm),
    );
  }
  p.push(
    cyl(0.2, 0.22, 0.62, shirt, { y: 0.83, segments: 12, surface: 'fabric' }),
    sphere(0.17, skin, { y: 1.36, ...S8 }),
    sphere(0.185, hair, { y: 1.41, x: -0.02, sy: 0.8, segments: 8, rings: 4, flat: false }),
    box(0.03, 0.04, 0.04, C.dark, { y: 1.4, x: 0.155, z: 0.07 }),
    box(0.03, 0.04, 0.04, C.dark, { y: 1.4, x: 0.155, z: -0.07 }),
  );
  if (skirt) p.push(cyl(0.22, 0.32, 0.36, skirt, { y: 0.58, segments: 10, surface: 'fabric' }));
  return [...p, ...extra];
};

/** Small car (kei / taxi), length along X. ch = cabin height. */
const car = (body, len, roof = body, o = {}) => {
  const W = o.w ?? 1.5, L = len, ch = o.ch ?? 0.6, cxo = -L * 0.05;
  const top = 0.97;
  return [
    rbox(L, 0.62, W, body, { surface: 'paint', y: 0.66, segments: 1, bevel: 0.16 }),
    rbox(L * 0.58, ch, W * 0.9, C.glass, { y: top + ch / 2 - 0.03, x: cxo, segments: 1, bevel: 0.12 }),
    rbox(L * 0.56, 0.1, W * 0.92, roof, { surface: 'paint', y: top + ch - 0.02, x: cxo, segments: 1, bevel: 0.05 }),
    ...[1, -1].flatMap((s) => [
      box(0.08, ch, 0.06, roof, { surface: 'paint', y: top + ch / 2 - 0.03, x: cxo + L * 0.28, z: s * W * 0.44 }),
      box(0.08, ch, 0.06, roof, { surface: 'paint', y: top + ch / 2 - 0.03, x: cxo - L * 0.28, z: s * W * 0.44 }),
      box(0.06, ch, 0.06, roof, { surface: 'paint', y: top + ch / 2 - 0.03, x: cxo, z: s * (W * 0.45) }),
      box(0.03, 0.4, 0.03, C.dark, { y: 0.78, x: cxo - L * 0.05, z: s * (W / 2 + 0.005) }),
      box(0.14, 0.05, 0.04, C.chrome, { y: 0.9, x: cxo + L * 0.07, z: s * (W / 2 + 0.01) }),
      box(0.12, 0.09, 0.14, body, { surface: 'paint', y: 1.1, x: cxo + L * 0.26, z: s * (W / 2 + 0.1) }),
      box(0.06, 0.14, 0.3, C.lamp, { emissive: 1, y: 0.8, x: L / 2 + 0.005, z: s * W * 0.32 }),
      box(0.05, 0.13, 0.3, C.red, { y: 0.82, x: -L / 2 - 0.005, z: s * W * 0.34 }),
    ]),
    box(0.12, 0.14, W * 1.02, C.dgray, { y: 0.4, x: L / 2 + 0.03 }),
    box(0.12, 0.14, W * 1.02, C.dgray, { y: 0.4, x: -L / 2 - 0.03 }),
    box(0.04, 0.1, 0.5, C.dark, { y: 0.62, x: L / 2 + 0.01 }),
    box(0.03, 0.12, 0.3, o.plate || C.white, { y: 0.56, x: -L / 2 - 0.1 }),
    box(0.03, 0.12, 0.3, o.plate || C.white, { y: 0.46, x: L / 2 + 0.1 }),
    ...wheel(L * 0.3, 0.36, W / 2 - 0.06, 0.36, 0.26), ...wheel(L * 0.3, 0.36, -W / 2 + 0.06, 0.36, 0.26),
    ...wheel(-L * 0.3, 0.36, W / 2 - 0.06, 0.36, 0.26), ...wheel(-L * 0.3, 0.36, -W / 2 + 0.06, 0.36, 0.26),
  ];
};

/** Vending machine facing +Z: body, lit product window with cans, buttons, slot, top light. */
const vending = (col, stripe) => {
  const p = [
    rbox(0.95, 1.85, 0.78, col, { y: 0.98, segments: 1, bevel: 0.06, surface: 'paint' }),
    box(1.0, 0.1, 0.84, C.white, { y: 1.95, surface: 'paint' }),
    box(0.8, 0.12, 0.9, C.dgray, { y: 0.06 }),
    box(0.7, 1.0, 0.05, C.dark, { y: 1.4, z: 0.4 }),
    box(0.62, 0.9, 0.06, C.glass, { emissive: 0.7, y: 1.4, x: -0.02, z: 0.42 }),
    box(0.18, 0.7, 0.04, C.dark, { x: 0.36, y: 1.25, z: 0.4 }),
    box(0.75, 0.16, 0.06, stripe, { y: 0.74, z: 0.41 }),
    box(0.5, 0.26, 0.08, C.dark, { y: 0.32, z: 0.4 }),
    box(0.44, 0.16, 0.05, C.black, { y: 0.32, z: 0.44 }),
    box(0.16, 0.05, 0.04, C.chrome, { x: 0.32, y: 0.72, z: 0.42 }),
  ];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
    p.push(box(0.11, 0.2, 0.08, [C.red, C.blue, C.yellow, C.green, C.orange, C.white][(r * 4 + i) % 6], { x: -0.22 + i * 0.15, y: 1.72 - r * 0.32, z: 0.43, surface: 'metal' }));
  }
  for (let i = 0; i < 4; i++) p.push(box(0.05, 0.05, 0.04, [C.red, C.green, C.yellow, C.blue][i], { x: 0.36, y: 1.5 - i * 0.12, z: 0.44 }));
  return p;
};

/** Cherry tree: dark twisted trunk + clusters of pink blossom blobs in 3 tones. */
const sakura = (h, col, col2) => {
  const r = h * 0.3;
  const blob = (rr, c, x, y, z) => sphere(rr, c, { x, y, z, segments: 9, rings: 6, surface: 'foliage', textureStrength: 0.7 });
  return [
    lathe([[h * 0.08, 0], [h * 0.05, h * 0.12], [h * 0.04, h * 0.4]], C.dbrown, { segments: 9 }),
    cyl(0.05, 0.09, h * 0.4, C.dbrown, { y: h * 0.52, x: h * 0.12, rz: -0.6, segments: 6 }),
    cyl(0.05, 0.09, h * 0.4, C.dbrown, { y: h * 0.52, x: -h * 0.12, rz: 0.6, segments: 6 }),
    blob(r * 1.05, col, 0, h * 0.72, 0),
    blob(r * 0.8, col2, h * 0.24, h * 0.66, h * 0.08),
    blob(r * 0.8, col2, -h * 0.24, h * 0.64, -h * 0.08),
    blob(r * 0.7, col, h * 0.04, h * 0.66, -h * 0.24),
    blob(r * 0.65, col, -h * 0.02, h * 0.66, h * 0.25),
    blob(r * 0.6, '#ffe9f2', h * 0.06, h * 0.93, h * 0.02),
  ];
};

/** Glass-and-mullion skyscraper block (faces +Z): horizontal glass bands + vertical mullions on all four sides. */
const tower = (w, d, h, body, glass, o = {}) => {
  const y0 = o.y0 ?? 0, mull = o.mull || body;
  const p = [box(w, h, d, body, { y: y0 + h / 2, surface: 'glass' })];
  const floors = Math.floor((h - 3) / (o.fh ?? 1.6));
  const skip = o.base ?? 2.4;
  const nx = Math.max(2, Math.round(w / 1.1)), nz = Math.max(2, Math.round(d / 1.1));
  for (let i = 0; i < floors; i++) {
    const y = y0 + skip + 0.5 + i * ((h - skip - 1.4) / floors);
    const bh = 0.8 * ((h - skip - 1.4) / floors) / 1.6;
    p.push(
      box(w - 0.3, bh, 0.06, glass, { y, z: d / 2 + 0.02, surface: 'glass' }), box(w - 0.3, bh, 0.06, glass, { y, z: -d / 2 - 0.02, surface: 'glass' }),
      box(0.06, bh, d - 0.3, glass, { y, x: w / 2 + 0.02, surface: 'glass' }), box(0.06, bh, d - 0.3, glass, { y, x: -w / 2 - 0.02, surface: 'glass' }),
    );
  }
  const mh = h - skip - 0.6, my = y0 + skip + mh / 2 - 0.3;
  for (let i = 0; i <= nx; i++) {
    const x = -w / 2 + 0.15 + ((w - 0.3) * i) / nx;
    p.push(box(0.09, mh, 0.09, mull, { x, y: my, z: d / 2 + 0.04, surface: 'metal' }), box(0.09, mh, 0.09, mull, { x, y: my, z: -d / 2 - 0.04, surface: 'metal' }));
  }
  for (let i = 0; i <= nz; i++) {
    const z = -d / 2 + 0.15 + ((d - 0.3) * i) / nz;
    p.push(box(0.09, mh, 0.09, mull, { x: w / 2 + 0.04, y: my, z, surface: 'metal' }), box(0.09, mh, 0.09, mull, { x: -w / 2 - 0.04, y: my, z, surface: 'metal' }));
  }
  return p;
};

/** Rooftop clutter: parapet, AC units, water tank, antenna with beacon. */
const roofTop = (w, d, y, o = {}) => {
  const p = [
    box(w + 0.2, 0.35, 0.18, C.dgray, { y: y + 0.17, z: d / 2, surface: 'stone' }), box(w + 0.2, 0.35, 0.18, C.dgray, { y: y + 0.17, z: -d / 2, surface: 'stone' }),
    box(0.18, 0.35, d, C.dgray, { y: y + 0.17, x: w / 2, surface: 'stone' }), box(0.18, 0.35, d, C.dgray, { y: y + 0.17, x: -w / 2, surface: 'stone' }),
    box(w * 0.3, 0.7, d * 0.28, C.lgray, { y: y + 0.45, x: -w * 0.22, z: d * 0.18 }),
    cyl(0.22, 0.22, 0.05, C.dark, { y: y + 0.82, x: -w * 0.22, z: d * 0.18, segments: 8, surface: 'metal' }),
    box(w * 0.22, 0.55, d * 0.22, C.lgray, { y: y + 0.38, x: w * 0.2, z: -d * 0.2 }),
  ];
  if (o.tank) p.push(cyl(0.6, 0.6, 1.1, C.dbrown, { y: y + 1.1, x: w * 0.2, z: d * 0.2, segments: 10 }), cone(0.7, 0.4, C.dbrown, { y: y + 1.85, x: w * 0.2, z: d * 0.2, segments: 10 }));
  if (o.mast !== false) p.push(cyl(0.06, 0.1, o.mast ?? 3, C.gray, { y: y + (o.mast ?? 3) / 2, segments: 6 }), sphere(0.14, C.red, { emissive: 1.5, y: y + (o.mast ?? 3) + 0.1, segments: 6, rings: 4, flat: false }));
  return p;
};

/** Vertical shop banner (faces +Z): frame, neon panel, white 'characters'. */
const banner = (x, y, z, h, col) => [
  box(0.6, h, 0.12, C.dark, { x, y, z, surface: 'metal' }),
  box(0.5, h - 0.1, 0.06, col, { emissive: 0.9, x, y, z: z + 0.07, surface: 'fabric', textureStrength: 0.5 }),
  ...[0.3, 0.1, -0.1, -0.3].map((k) => box(0.3, 0.09, 0.03, C.white, { x, y: y + k * h * 0.5, z: z + 0.11, surface: 'fabric', textureStrength: 0.5 })),
];

/** Rounded-body train car centred at x = dx (length 12). */
const trainCar = (dx) => {
  const p = [
    rbox(12, 2.5, 3.0, C.white, { surface: 'paint', y: 1.9, x: dx, segments: 1, bevel: 0.4 }),
    box(11.9, 0.28, 3.06, C.blue, { surface: 'paint', y: 1.15, x: dx }),
    box(11.9, 0.08, 3.06, C.blue, { surface: 'paint', y: 1.55, x: dx }),
    rbox(11.7, 0.5, 3.0, C.dgray, { surface: 'metal', y: 0.55, x: dx, segments: 1, bevel: 0.15 }),
    rbox(11.6, 0.3, 2.3, C.lgray, { y: 3.3, x: dx, segments: 1, bevel: 0.1 }),
    box(1.6, 0.35, 1.0, C.dgray, { surface: 'metal', y: 3.55, x: dx + 2 }),
  ];
  for (let i = 0; i < 12; i++) {
    const x = dx - 5.5 + i * 1.0;
    p.push(box(0.62, 0.62, 0.05, C.dglass, { y: 2.3, x, z: 1.52 }), box(0.62, 0.62, 0.05, C.dglass, { y: 2.3, x, z: -1.52 }));
  }
  for (const s of [1, -1]) p.push(box(1.1, 1.7, 0.06, C.dglass, { y: 1.9, x: dx + 4.4, z: s * 1.52 }), box(0.05, 1.7, 0.08, C.dark, { y: 1.9, x: dx + 4.4, z: s * 1.53 }));
  // bogies
  for (const bx of [-3.8, 3.8]) for (const s of [1, -1]) p.push(...wheel(dx + bx, 0.4, s * 1.1, 0.4, 0.2, false), ...wheel(dx + bx + 1.1, 0.4, s * 1.1, 0.4, 0.2, false));
  return p;
};

/** Bullet-train nose car (rear body at x = dx - 1.5, streamlined nose towards +X). */
const trainNose = (dx) => {
  const p = [
    rbox(9, 2.5, 3.0, C.white, { surface: 'paint', y: 1.9, x: dx - 1.5, segments: 1, bevel: 0.4 }),
    box(8.9, 0.28, 3.06, C.blue, { surface: 'paint', y: 1.15, x: dx - 1.5 }),
    box(8.9, 0.08, 3.06, C.blue, { surface: 'paint', y: 1.55, x: dx - 1.5 }),
    rbox(8.7, 0.5, 3.0, C.dgray, { surface: 'metal', y: 0.55, x: dx - 1.5, segments: 1, bevel: 0.15 }),
    // long streamlined nose: scaled ellipsoid + tapering wedge
    sphere(1.5, C.white, { surface: 'paint', y: 1.8, x: dx + 3.2, sx: 4.2, sy: 0.8, sz: 1.0, segments: 14, rings: 10 }),
    sphere(1.4, C.white, { surface: 'paint', y: 1.5, x: dx + 6.5, sx: 2.3, sy: 0.6, sz: 0.75, segments: 12, rings: 8 }),
    box(4.2, 0.28, 3.0, C.blue, { surface: 'paint', y: 1.15, x: dx + 4.2, sz: 0.9 }),
    sphere(1.2, C.dglass, { y: 2.3, x: dx + 3.5, sx: 2.0, sy: 0.45, sz: 1.0, segments: 12, rings: 8 }),
    sphere(0.16, C.lamp, { emissive: 1, y: 1.2, x: dx + 8.6, z: 0.5, segments: 6, rings: 4, flat: false }),
    sphere(0.16, C.lamp, { emissive: 1, y: 1.2, x: dx + 8.6, z: -0.5, segments: 6, rings: 4, flat: false }),
    rbox(8.6, 0.3, 2.3, C.lgray, { y: 3.3, x: dx - 1.5, segments: 1, bevel: 0.1 }),
  ];
  for (let i = 0; i < 8; i++) {
    const x = dx - 5.4 + i * 1.0;
    p.push(box(0.62, 0.62, 0.05, C.dglass, { y: 2.3, x, z: 1.52 }), box(0.62, 0.62, 0.05, C.dglass, { y: 2.3, x, z: -1.52 }));
  }
  for (const bx of [-4.2, 0.8]) for (const s of [1, -1]) p.push(...wheel(dx + bx, 0.4, s * 1.1, 0.4, 0.2, false), ...wheel(dx + bx + 1.1, 0.4, s * 1.1, 0.4, 0.2, false));
  return p;
};

/** Recessed window facing +Z (wall face at z=0): glass set back inside a cut opening, dark sill. */
const nook = (x, y, ww, wh, sill = C.dgray) => [
  box(ww, wh, 0.03, C.dglass, { x, y, z: -0.13, surface: 'glass' }),
  box(0.05, wh, 0.05, C.white, { x, y, z: -0.1, surface: 'paint' }),
  box(ww + 0.24, 0.08, 0.2, sill, { x, y: y - wh / 2 - 0.04, z: 0.03, surface: 'stone' }),
];

/** Japanese shop-house (faces +Z): recessed storefront + upper windows, awning, roof sign, AC units, banner. */
const shop = (wall, awning, signCol, w = 4.4, h = 3.6) => {
  const d = 3.8, t = 0.22;
  const shopW = w * 0.62, shopX = -w * 0.09, upperW = w * 0.22;
  const openings = [{ x: shopX, y: 1.6, width: shopW, height: 1.3 }];
  const uppers = [-1, 0, 1].map((k) => ({ x: k * w * 0.3, y: h - 0.7, width: upperW, height: 0.7 }));
  const front = [
    // storefront: dark frame, deeply inset glass with a centre mullion
    box(shopW + 0.24, 0.12, 0.3, C.dark, { x: shopX, y: 0.92, z: 0.05, surface: 'metal' }),
    box(shopW, 1.3, 0.04, C.glass, { x: shopX, y: 1.6, z: -0.16, surface: 'glass' }),
    box(0.06, 1.3, 0.06, C.dark, { x: shopX, y: 1.6, z: -0.12, surface: 'metal' }),
    box(shopW + 0.2, 0.1, 0.14, C.dark, { x: shopX, y: 2.3, z: 0.0, surface: 'metal' }),
    ...uppers.flatMap((u) => nook(u.x, u.y, u.width, u.height)),
  ];
  const p = [
    box(w, h, d - 2 * t + 0.1, wall, { y: h / 2, surface: 'stucco' }),
    ...facadeWall(w, h, t, wall, [...openings, ...uppers], { z: d / 2 - t / 2, surface: 'stucco' }),
    ...facadeWall(w, h, t, wall, [], { z: -(d / 2 - t / 2), ry: PI, surface: 'stucco' }),
    box(w + 0.3, 0.3, d + 0.3, C.dgray, { y: h + 0.15, surface: 'roof' }),
    box(w + 0.1, 0.9, d + 0.1, C.dgray, { y: 0.45, surface: 'stone' }),
    ...front.map((g) => g.translate(0, 0, d / 2)),
    // door
    box(0.9, 1.7, 0.1, C.dark, { y: 0.95, x: w * 0.36, z: d / 2 + 0.03, surface: 'wood' }),
    box(0.7, 1.4, 0.08, C.glass, { y: 1.0, x: w * 0.36, z: d / 2 + 0.07, surface: 'glass' }),
    // striped awning
    box(w + 0.3, 0.1, 1.0, awning, { y: 2.55, z: d / 2 + 0.55, rx: 0.32, surface: 'fabric' }),
    box(w * 0.5, 0.1, 1.0, C.white, { y: 2.56, x: -w * 0.2, z: d / 2 + 0.55, rx: 0.32, sx: 0.3, surface: 'fabric' }),
    box(w * 0.5, 0.1, 1.0, C.white, { y: 2.56, x: w * 0.2, z: d / 2 + 0.55, rx: 0.32, sx: 0.3, surface: 'fabric' }),
    box(w + 0.3, 0.16, 0.06, awning, { y: 2.37, z: d / 2 + 1.03, surface: 'fabric' }),
    // rooftop signboard with 'characters'
    box(w * 0.86, 1.0, 0.24, C.dark, { y: h + 0.8, z: d / 2 - 0.4, surface: 'metal' }),
    box(w * 0.8, 0.86, 0.1, signCol, { emissive: 1, y: h + 0.8, z: d / 2 - 0.25, surface: 'paint' }),
    ...[-1.5, -0.5, 0.5, 1.5].map((k) => box(w * 0.14, 0.4, 0.04, C.white, { y: h + 0.8, x: k * w * 0.18, z: d / 2 - 0.19, surface: 'paint' })),
    box(0.1, 0.5, 0.1, C.dgray, { y: h + 0.4, x: w * 0.38, z: d / 2 - 0.4, surface: 'metal' }),
    // side banner + AC units + lantern
    ...banner(w / 2 + 0.28, h - 0.9, d / 2 - 0.3, 1.8, signCol),
    box(0.5, 0.36, 0.3, C.lgray, { y: h - 1.4, x: -w / 2 - 0.15, z: -0.4 }),
    cyl(0.12, 0.12, 0.04, C.dark, { y: h - 1.4, x: -w / 2 - 0.32, z: -0.4, rz: PI / 2, segments: 8, surface: 'metal' }),
    sphere(0.2, C.red, { y: 2.25, x: -w * 0.42, z: d / 2 + 0.3, sy: 1.2, segments: 8, rings: 6, flat: false, surface: 'fabric', textureStrength: 0.4 }),
    box(0.5, 0.3, 0.7, C.lgray, { y: h + 0.5, x: -w * 0.3, z: -0.6 }),
  ];
  return p;
};

export function buildProtos() {
  const P = {};
  const add = (name, parts, opts) => (P[name] = applyModelFinishes(fillSurface(makeProto(name, parts.flat(), opts), FALLBACK[name] ?? DEFAULT_FALLBACK), 'urban'));

  // ---------- small
  add('vendingRed', vending(C.red, C.white), { value: 0.9 });
  add('vendingBlue', vending(C.blue, C.yellow), { value: 0.9 });
  add('vendingGreen', vending(C.green, C.white), { value: 0.9 });
  add('vendingYellow', vending(C.yellow, C.red), { value: 0.9 });
  add('vendingPink', vending(C.hpink, C.white), { value: 0.9 });

  add('lantern', [
    cyl(0.14, 0.18, 0.1, C.dgray, { y: 0.05, segments: 8 }),
    cyl(0.06, 0.07, 2.1, C.dbrown, { y: 1.05, z: -0.5, segments: 8 }),
    box(0.06, 0.06, 0.55, C.dbrown, { y: 2.0, z: -0.25 }),
    cyl(0.015, 0.015, 0.3, C.dark, { y: 1.85, segments: 4 }),
    // paper chochin: ribbed lathe body with black caps, white label, tassel
    lathe([[0.16, 1.64], [0.3, 1.5], [0.4, 1.25], [0.3, 0.98], [0.16, 0.86]], C.red, { segments: 12, emissive: 1.2 }),
    cyl(0.17, 0.17, 0.09, C.black, { y: 1.68, segments: 10 }),
    cyl(0.17, 0.17, 0.09, C.black, { y: 0.83, segments: 10 }),
    ...[1.35, 1.15].map((y, i) => cyl(0.36 - i * 0.04, 0.36 - i * 0.04, 0.03, C.black, { y, segments: 12 })),
    box(0.24, 0.42, 0.04, C.white, { y: 1.25, z: 0.36 }),
    box(0.1, 0.24, 0.02, C.black, { y: 1.27, z: 0.385 }),
    cyl(0.01, 0.03, 0.2, C.yellow, { y: 0.7, segments: 4 }),
  ], { value: 0.4 });

  const bikeWheel = (x) => {
    const pivot = [x, 0.45, 0], o = { radius: 0.4, front: x > 0 };
    return [
      torus(0.4, 0.04, C.dark, { y: 0.45, x, radial: 4, segments: 14, surface: 'rubber' }),
      cyl(0.06, 0.06, 0.12, C.chrome, { y: 0.45, x, rx: PI / 2, segments: 6 }),
      box(0.76, 0.02, 0.02, C.lgray, { y: 0.45, x }), box(0.02, 0.76, 0.02, C.lgray, { y: 0.45, x }),
      box(0.54, 0.02, 0.02, C.lgray, { y: 0.45, x, rz: PI / 4 }), box(0.54, 0.02, 0.02, C.lgray, { y: 0.45, x, rz: -PI / 4 }),
    ].map((g) => articulate(g, 'wheel', pivot, o));
  };
  add('bicycle', [
    ...bikeWheel(0.7), ...bikeWheel(-0.7),
    box(1.0, 0.05, 0.05, C.teal, { y: 0.7, x: 0.1, surface: 'paint' }),
    box(0.9, 0.05, 0.05, C.teal, { y: 0.5, x: 0.05, rz: 0.36, surface: 'paint' }),
    box(0.06, 0.6, 0.05, C.teal, { y: 0.6, x: -0.3, rz: 0.2, surface: 'paint' }),
    box(0.06, 0.65, 0.05, C.teal, { y: 0.65, x: 0.5, rz: -0.25, surface: 'paint' }),
    box(0.25, 0.06, 0.16, C.dark, { y: 0.98, x: -0.4, surface: 'rubber' }),
    box(0.05, 0.05, 0.6, C.chrome, { y: 1.02, x: 0.6 }),
    box(0.38, 0.28, 0.36, C.gray, { y: 0.82, x: 0.95, surface: 'metal' }),
    box(0.4, 0.05, 0.38, C.dgray, { y: 0.98, x: 0.95, surface: 'metal' }),
    box(0.3, 0.05, 0.05, C.red, { y: 0.14, x: -0.9, z: 0.2 }),
    box(0.4, 0.2, 0.05, C.dgray, { y: 0.55, x: -0.75, z: 0.2, surface: 'metal' }),
  ], { value: 0.5, radius: 0.9 });

  add('salaryman', person({ shirt: C.navy, pants: C.dark, hair: C.black }, [
    box(0.05, 0.4, 0.05, C.red, { y: 0.9, x: 0.2 }),
    box(0.06, 0.18, 0.08, C.white, { y: 1.12, x: 0.19 }),
    box(0.3, 0.24, 0.1, C.brown, { y: 0.5, x: 0.02, z: 0.42 }),
    box(0.16, 0.05, 0.03, C.dbrown, { y: 0.64, x: 0.02, z: 0.42 }),
    box(0.22, 0.04, 0.04, C.white, { y: 1.05, x: 0.2 }),
  ]), { move: { type: 'walk', speed: 1.4, range: 10 }, value: 0.5 });
  add('schoolgirl', person({ shirt: C.white, pants: '#f1c8a0', hair: C.dbrown, skirt: C.navy, shoes: C.black }, [
    // sailor collar, ribbon, school bag, tall socks
    cyl(0.215, 0.215, 0.12, C.navy, { y: 1.05, segments: 9 }),
    box(0.06, 0.12, 0.18, C.red, { y: 1.02, x: 0.2 }),
    box(0.32, 0.36, 0.16, C.dbrown, { y: 0.8, x: -0.24 }),
    box(0.04, 0.04, 0.04, C.gold, { y: 0.85, x: -0.15, z: 0 }),
    box(0.17, 0.18, 0.15, C.white, { y: 0.12, z: 0.09 }), box(0.17, 0.18, 0.15, C.white, { y: 0.12, z: -0.09 }),
    sphere(0.06, C.hpink, { y: 1.5, x: -0.03, z: 0.16, segments: 6, rings: 4, flat: false }),
  ]), { move: { type: 'walk', speed: 1.4, range: 10 }, value: 0.5 });
  add('tourist', person({ shirt: C.orange, pants: C.blue, hair: C.dbrown }, [
    box(0.18, 0.13, 0.08, C.dark, { y: 0.98, x: 0.17, z: 0.02 }),
    box(0.04, 0.42, 0.04, C.dark, { y: 1.05, x: 0.1, z: 0.1, rx: 0.15 }),
    box(0.28, 0.4, 0.2, C.green, { y: 0.9, x: -0.27 }),
    cyl(0.2, 0.2, 0.06, C.white, { y: 1.55, segments: 9 }),
    cyl(0.14, 0.15, 0.1, C.white, { y: 1.6, segments: 9 }),
  ]), { move: { type: 'walk', speed: 1.4, range: 10 }, value: 0.5 });
  const geta = (side) => {
    const hip = [0, 0.3, side * 0.09];
    return articulate(box(0.2, 0.06, 0.12, C.dark, { y: 0.04, x: 0.03, z: side * 0.09, surface: 'wood' }), 'leg', hip, { side, hip });
  };
  const sleeve = (side) => articulate(box(0.2, 0.5, 0.1, C.lpink, { y: 0.85, z: side * 0.3, surface: 'fabric' }), 'arm', [0, 1.1, side * 0.3], { side });
  add('kimono', [
    lathe([[0.32, 0], [0.3, 0.3], [0.22, 0.8], [0.2, 1.0]], C.hpink, { segments: 10, surface: 'fabric' }),
    cyl(0.215, 0.24, 0.3, C.hpink, { y: 1.05, segments: 9, surface: 'fabric' }),
    cyl(0.235, 0.235, 0.2, C.yellow, { y: 0.9, segments: 9, surface: 'fabric' }),
    box(0.3, 0.3, 0.12, C.yellow, { y: 0.9, x: -0.22, surface: 'fabric' }),
    box(0.14, 0.34, 0.08, C.red, { y: 0.9, x: -0.29, surface: 'fabric' }),
    sleeve(1), sleeve(-1), geta(1), geta(-1),
    sphere(0.17, C.skin, { y: 1.36, ...S8 }),
    sphere(0.19, C.black, { y: 1.4, x: -0.03, sy: 0.85, segments: 8, rings: 4, flat: false }),
    sphere(0.1, C.black, { y: 1.58, x: -0.08, segments: 6, rings: 4, flat: false }),
    box(0.03, 0.03, 0.2, C.red, { y: 1.55, x: -0.08, z: 0.08 }),
    sphere(0.05, C.red, { y: 1.55, x: -0.08, z: 0.19, segments: 5, rings: 3, flat: false }),
    box(0.03, 0.04, 0.04, C.dark, { y: 1.4, x: 0.155, z: 0.07 }), box(0.03, 0.04, 0.04, C.dark, { y: 1.4, x: 0.155, z: -0.07 }),
  ], { move: { type: 'walk', speed: 1.0, range: 8 }, value: 0.5 });

  // Quadruped: diagonal legs share a phase (x>0,z>0 & x<0,z<0 = 0); the tail wags.
  const catLeg = (x, z, fur) => {
    const hip = [x, 0.2, z];
    return articulate(box(0.06, 0.2, 0.06, fur, { y: 0.1, x, z, surface: 'fabric', textureStrength: 0.6 }), 'leg', hip, { phase: (x > 0) === (z > 0) ? 0 : 1, hip });
  };
  const catParts = (fur, ear, mark) => [
    capsule(0.16, 0.36, fur, { y: 0.3, rz: PI / 2, segments: 9, caps: 2, surface: 'fabric', textureStrength: 0.6 }),
    sphere(0.19, fur, { y: 0.52, x: 0.4, ...S8 }),
    cone(0.07, 0.15, ear, { y: 0.73, x: 0.4, z: 0.1, segments: 5 }), cone(0.07, 0.15, ear, { y: 0.73, x: 0.4, z: -0.1, segments: 5 }),
    articulate(capsule(0.04, 0.5, fur, { y: 0.5, x: -0.5, rz: 0.7, segments: 6, caps: 1, surface: 'fabric', textureStrength: 0.6 }), 'tail', [-0.36, 0.38, 0], { amp: 1.2 }),
    catLeg(0.22, 0.1, fur), catLeg(0.22, -0.1, fur), catLeg(-0.22, 0.1, fur), catLeg(-0.22, -0.1, fur),
    box(0.04, 0.04, 0.04, C.black, { y: 0.56, x: 0.58, z: 0.07 }), box(0.04, 0.04, 0.04, C.black, { y: 0.56, x: 0.58, z: -0.07 }),
    sphere(0.035, C.pink, { y: 0.5, x: 0.6, segments: 5, rings: 3, flat: false }),
    ...mark,
  ];
  add('cat', catParts(C.orange, C.orange, [box(0.5, 0.05, 0.04, '#c46a1a', { y: 0.46, x: 0, z: 0.14 }), box(0.5, 0.05, 0.04, '#c46a1a', { y: 0.36, x: 0, z: -0.14 })]), { move: { type: 'walk', speed: 2.2, range: 10 }, value: 0.4 });
  add('cat2', catParts(C.white, C.dark, [sphere(0.15, C.dark, { y: 0.4, x: -0.1, z: 0.12, sx: 1.3, segments: 7, rings: 4, flat: false }), sphere(0.1, C.dark, { y: 0.52, x: 0.36, z: -0.08, segments: 6, rings: 4, flat: false })]), { move: { type: 'walk', speed: 2.2, range: 10 }, value: 0.4 });

  add('bonsai', [
    rbox(0.9, 0.24, 0.6, '#8b5a3c', { y: 0.13, segments: 1, bevel: 0.05 }),
    box(0.82, 0.04, 0.52, '#4a3a2a', { y: 0.26 }),
    capsule(0.06, 0.4, C.dbrown, { y: 0.5, x: 0.05, rz: 0.25, segments: 7, caps: 2 }),
    capsule(0.04, 0.3, C.dbrown, { y: 0.7, x: 0.15, z: 0.05, rz: -0.7, segments: 6, caps: 1 }),
    sphere(0.3, C.dgreen, { surface: 'foliage', y: 0.96, x: 0.12, sy: 0.7, segments: 8, rings: 5, flat: false }),
    sphere(0.22, C.green, { surface: 'foliage', y: 0.82, x: -0.25, z: 0.08, sy: 0.7, segments: 8, rings: 5, flat: false }),
    sphere(0.2, C.dgreen, { surface: 'foliage', y: 0.85, x: 0.35, z: -0.1, sy: 0.7, segments: 8, rings: 5, flat: false }),
    sphere(0.1, C.pink, { surface: 'foliage', textureStrength: 0.6, y: 1.15, x: 0.2, segments: 6, rings: 4, flat: false }),
  ], { value: 0.35 });

  add('scooter', [
    rbox(0.5, 0.42, 0.34, C.blue, { y: 0.55, x: -0.32, segments: 1, bevel: 0.1 }),
    box(1.1, 0.14, 0.34, C.blue, { y: 0.32, x: 0.05 }),
    box(0.12, 0.7, 0.3, C.blue, { y: 0.66, x: 0.46, rz: -0.15 }),
    rbox(0.5, 0.12, 0.3, C.dark, { y: 0.84, x: -0.3, segments: 1, bevel: 0.04 }),
    box(0.06, 0.06, 0.6, C.chrome, { y: 1.22, x: 0.36 }),
    sphere(0.1, C.lamp, { emissive: 1, y: 1.05, x: 0.52, segments: 8, rings: 5, flat: false }),
    box(0.1, 0.08, 0.08, C.black, { y: 1.28, x: 0.36, z: 0.34 }), box(0.1, 0.08, 0.08, C.black, { y: 1.28, x: 0.36, z: -0.34 }),
    rbox(0.4, 0.36, 0.4, C.white, { y: 1.05, x: -0.72, segments: 1, bevel: 0.07 }),
    box(0.06, 0.1, 0.16, C.red, { y: 0.6, x: -0.6 }),
    ...wheel(0.5, 0.2, 0, 0.2, 0.12), ...wheel(-0.45, 0.2, 0, 0.2, 0.12),
  ], { value: 0.6 });

  add('sakuraSmall', sakura(2.6, C.pink, C.lpink), { value: 0.6, sway: 'tree' });
  add('omamori', [
    rbox(0.5, 0.72, 0.1, C.red, { y: 0.55, segments: 1, bevel: 0.04 }),
    box(0.4, 0.2, 0.12, C.gold, { y: 0.55, z: 0 }),
    box(0.12, 0.3, 0.13, C.white, { y: 0.55 }),
    box(0.44, 0.06, 0.12, C.gold, { y: 0.93 }),
    cyl(0.02, 0.02, 0.5, C.black, { y: 0.22, segments: 5 }),
    sphere(0.08, C.hpink, { y: 0.12, segments: 6, rings: 4, flat: false }),
    cyl(0.16, 0.2, 0.06, C.dgray, { y: 0.03, segments: 8 }),
  ], { value: 0.3 });

  // ---------- medium
  add('keiCarWhite', car(C.white, 3.0, C.lgray, { ch: 0.75, plate: C.yellow }), { value: 0.9 });
  add('keiCarYellow', car(C.yellow, 3.0, C.white, { ch: 0.75, plate: C.yellow }), { value: 0.9 });
  add('keiCarBlue', car(C.lblue, 3.0, C.white, { ch: 0.75, plate: C.yellow }), { value: 0.9 });
  add('keiCarPink', car(C.lpink, 3.0, C.white, { ch: 0.75, plate: C.yellow }), { value: 0.9 });
  add('taxi', [
    ...car(C.dark, 4.2, C.dark, { surface: 'paint', w: 1.7, ch: 0.65 }),
    box(4.0, 0.3, 1.74, C.yellow, { surface: 'paint', y: 0.62 }),
    box(4.0, 0.06, 1.76, C.dark, { surface: 'paint', y: 0.83 }),
    rbox(0.6, 0.26, 0.3, C.orange, { surface: 'paint', y: 1.75, x: -0.2, segments: 1, bevel: 0.06 }),
    box(0.3, 0.1, 0.03, C.white, { surface: 'paint', y: 1.75, x: -0.2, z: 0.16 }),
    box(0.3, 0.1, 0.03, C.white, { surface: 'paint', y: 1.75, x: -0.2, z: -0.16 }),
    box(0.6, 0.2, 0.02, C.white, { surface: 'paint', y: 1.0, x: -0.4, z: 0.9 }), box(0.6, 0.2, 0.02, C.white, { surface: 'paint', y: 1.0, x: -0.4, z: -0.9 }),
  ], { value: 1.2 });

  add('ramenStall', (() => {
    const p = [
      rbox(3.2, 0.9, 1.6, C.wood, { y: 0.45, segments: 1, bevel: 0.06 }),
      box(3.3, 0.12, 1.8, C.dbrown, { y: 0.95 }),
      box(3.4, 0.4, 0.06, C.white, { surface: 'fabric', y: 0.55, z: 0.82 }),
      ...[[1.5, 0.8], [-1.5, 0.8], [1.5, -0.8], [-1.5, -0.8]].map(([x, z]) => cyl(0.07, 0.07, 2.6, C.dbrown, { y: 1.3, x, z, segments: 8 })),
      // roof with red trim and noren curtain strips
      rbox(3.7, 0.16, 2.1, C.red, { surface: 'fabric', y: 2.65, segments: 1, bevel: 0.05 }),
      box(3.7, 0.06, 0.1, C.white, { surface: 'fabric', y: 2.55, z: 1.03 }),
      ...[-1.3, -0.65, 0, 0.65, 1.3].map((x, i) => box(0.55, 0.55, 0.03, i % 2 ? C.white : C.red, { surface: 'fabric', y: 2.22, x, z: 1.0 })),
      box(0.55, 0.18, 0.02, C.black, { surface: 'metal', y: 2.3, x: 0, z: 1.02 }),
      // pot, bowls with noodles, chopsticks
      cyl(0.38, 0.34, 0.5, C.gray, { surface: 'metal', y: 1.28, x: -0.8, segments: 10 }),
      cyl(0.4, 0.4, 0.04, C.dgray, { surface: 'metal', y: 1.54, x: -0.8, segments: 10 }),
      cyl(0.16, 0.12, 0.16, C.white, { surface: 'fabric', y: 1.09, x: 0.5, z: 0.3, segments: 9 }),
      cyl(0.145, 0.145, 0.02, C.orange, { surface: 'paint', y: 1.18, x: 0.5, z: 0.3, segments: 9 }),
      cyl(0.16, 0.12, 0.16, C.white, { surface: 'fabric', y: 1.09, x: 1.0, z: 0.3, segments: 9 }),
      cyl(0.145, 0.145, 0.02, '#f2d16b', { y: 1.18, x: 1.0, z: 0.3, segments: 9 }),
      sphere(0.09, C.dgreen, { y: 1.22, x: 0.5, z: 0.3, segments: 5, rings: 3, flat: false }),
      // lantern
      sphere(0.24, C.red, { emissive: 1.2, surface: 'fabric', y: 2.3, x: -1.65, z: 0.95, sy: 1.2, segments: 8, rings: 6, flat: false }),
    ];
    for (const x of [-1.0, 0.0, 1.0]) p.push(cyl(0.18, 0.18, 0.05, C.red, { surface: 'fabric', y: 0.5, x, z: 1.45, segments: 8 }), cyl(0.04, 0.04, 0.5, C.dark, { y: 0.25, x, z: 1.45, segments: 5 }));
    return p;
  })(), { value: 1.6 });

  add('bentoStall', [
    rbox(2.6, 0.9, 1.4, C.white, { surface: 'paint', y: 0.45, segments: 1, bevel: 0.06 }),
    box(2.7, 0.12, 1.5, C.wood, { y: 0.95 }),
    box(2.4, 0.3, 0.05, C.orange, { surface: 'paint', y: 0.5, z: 0.72 }),
    ...[[1.2, 0.7], [-1.2, 0.7], [1.2, -0.7], [-1.2, -0.7]].map(([x, z]) => cyl(0.06, 0.06, 2.4, C.dark, { y: 1.2, x, z, segments: 7 })),
    rbox(3.0, 0.12, 1.8, C.green, { surface: 'fabric', y: 2.45, segments: 1, bevel: 0.04 }),
    box(3.0, 0.05, 0.08, C.white, { surface: 'paint', y: 2.36, z: 0.86 }),
    ...[0, 1, 2].flatMap((i) => [
      box(0.5, 0.14, 0.4, [C.red, C.yellow, C.dgreen][i], { y: 1.08, x: -0.8 + i * 0.8, z: 0.05 }),
      box(0.44, 0.03, 0.34, [C.white, C.orange, C.pink][i], { y: 1.16, x: -0.8 + i * 0.8, z: 0.05 }),
    ]),
    ...[-0.9, -0.3, 0.3, 0.9].map((x, i) => box(0.42, 0.5, 0.03, i % 2 ? C.white : C.orange, { surface: 'paint', y: 2.1, x, z: 0.86 })),
    sphere(0.2, C.red, { surface: 'fabric', y: 2.0, x: 1.4, z: 0.6, sy: 1.2, segments: 7, rings: 5, flat: false }),
  ], { value: 1.4 });

  add('shopA', shop(C.cream, C.red, C.hpink), { value: 2.4 });
  add('shopB', shop('#e8c7a0', C.blue, C.neonB), { value: 2.4 });
  add('shopC', shop('#d5e8c0', C.hpink, C.orange, 4.8, 4.4), { value: 3 });
  add('shopD', shop('#f0d0e0', C.green, C.purple, 4.0, 3.2), { value: 2.2 });

  add('sakura', sakura(5.2, C.pink, C.lpink), { value: 1.5, sway: 'tree' });
  add('sakura2', sakura(4.4, C.lpink, C.hpink), { value: 1.2, sway: 'tree' });
  add('pineTree', [
    lathe([[0.3, 0], [0.22, 0.4], [0.2, 1.4], [0.16, 1.8]], C.dbrown, { segments: 9 }),
    cone(1.5, 1.1, C.dgreen, { surface: 'foliage', y: 2.0, segments: 11, flat: false }),
    cone(1.25, 1.0, C.green, { surface: 'foliage', y: 2.7, segments: 11, flat: false }),
    cone(1.0, 1.0, C.dgreen, { surface: 'foliage', y: 3.35, segments: 11, flat: false }),
    cone(0.7, 0.9, C.green, { surface: 'foliage', y: 3.95, segments: 11, flat: false }),
    cone(0.4, 0.7, C.dgreen, { surface: 'foliage', y: 4.4, segments: 9, flat: false }),
  ], { value: 0.8, sway: 'tree' });

  add('torii', (() => {
    const p = [];
    for (const x of [-1.8, 1.8]) {
      p.push(
        lathe([[0.36, 0], [0.32, 0.4], [0.28, 3.9], [0.27, 4.4]], C.red, { surface: 'paint', x, segments: 12 }),
        box(0.8, 0.3, 0.9, C.black, { surface: 'paint', y: 0.15, x }),
        cyl(0.4, 0.4, 0.16, C.black, { surface: 'paint', y: 0.4, x, segments: 10 }),
      );
    }
    p.push(
      // nuki (lower tie beam), gakuzuka plaque, shimaki + kasagi with upswept ends
      box(4.5, 0.28, 0.32, C.red, { surface: 'paint', y: 3.55 }),
      box(0.5, 0.9, 0.24, C.black, { surface: 'paint', y: 4.1 }),
      box(0.42, 0.75, 0.05, C.gold, { surface: 'metal', y: 4.1, z: 0.13 }),
      box(5.6, 0.35, 0.55, C.red, { surface: 'paint', y: 4.7 }),
      extrude([[-3.6, 0.0], [3.6, 0.0], [3.9, 0.45], [3.5, 0.32], [2.5, 0.16], [-2.5, 0.16], [-3.5, 0.32], [-3.9, 0.45]], 0.75, C.black, { surface: 'paint', y: 4.85, bevel: 0.03 }),
      box(6.3, 0.1, 0.8, C.black, { surface: 'paint', y: 5.02 }),
    );
    return p;
  })(), { value: 6 });

  add('shrine', (() => {
    const p = [
      box(5.2, 0.5, 4.6, C.stone, { surface: 'stone', y: 0.25 }),
      // steps
      box(2.0, 0.16, 0.5, '#c9c4b8', { surface: 'stone', y: 0.08, z: 2.55 }), box(1.8, 0.16, 0.4, '#c9c4b8', { surface: 'stone', y: 0.24, z: 2.4 }),
      rbox(3.8, 2.3, 3.2, C.cream, { surface: 'stucco', y: 1.65, segments: 1, bevel: 0.08 }),
      box(4.0, 0.16, 3.4, C.dbrown, { surface: 'wood', y: 2.85 }),
      box(4.8, 0.18, 4.2, C.roofgray, { surface: 'roof', y: 3.1 }),
      cone(3.6, 1.6, C.roofgray, { surface: 'roof', y: 4.1, segments: 4, ry: PI / 4, sx: 1.08, sz: 0.94 }),
      cone(3.7, 0.4, '#3b4753', { surface: 'roof', y: 3.4, segments: 4, ry: PI / 4, sx: 1.08, sz: 0.94 }),
      cyl(0.08, 0.08, 1.0, C.gold, { surface: 'metal', y: 5.4, segments: 6 }), sphere(0.2, C.gold, { surface: 'metal', y: 5.0, segments: 8, rings: 5, flat: false }),
      // veranda railing + door + offering box + rope
      box(1.2, 1.8, 0.08, C.red, { surface: 'paint', y: 1.4, z: 1.62 }), box(1.4, 0.16, 0.1, C.gold, { surface: 'metal', y: 2.4, z: 1.66 }),
      box(1.8, 0.4, 0.5, C.dbrown, { surface: 'wood', y: 0.7, z: 2.2 }), box(1.6, 0.05, 0.4, C.black, { surface: 'paint', y: 0.92, z: 2.2 }),
      cyl(0.03, 0.03, 1.5, C.white, { y: 2.55, z: 2.0, rz: PI / 2, segments: 5 }),
      sphere(0.12, C.gold, { surface: 'metal', y: 2.3, z: 2.0, segments: 6, rings: 4, flat: false }),
      // stone lantern
      cyl(0.5, 0.5, 0.15, C.stone, { surface: 'stone', y: 0.6, x: 3.4, z: -2.0, segments: 8 }),
      cyl(0.12, 0.12, 0.7, C.stone, { surface: 'stone', y: 1.0, x: 3.4, z: -2.0, segments: 7 }),
      box(0.5, 0.4, 0.5, C.stone, { surface: 'stone', y: 1.55, x: 3.4, z: -2.0 }),
      box(0.22, 0.24, 0.52, C.lamp, { emissive: 1, y: 1.55, x: 3.4, z: -2.0 }),
      cone(0.5, 0.3, C.stone, { surface: 'stone', y: 1.9, x: 3.4, z: -2.0, segments: 4, ry: PI / 4 }),
    ];
    for (const x of [-1.7, 1.7]) for (const z of [-1.7, 1.7]) p.push(cyl(0.14, 0.15, 2.4, C.red, { surface: 'paint', x, z, y: 1.7, segments: 9 }));
    for (const x of [-1.5, -0.75, 0, 0.75, 1.5]) p.push(box(0.06, 0.45, 0.06, C.dbrown, { surface: 'wood', y: 0.75, x, z: 2.6 }));
    return p;
  })(), { value: 10 });

  add('busTokyo', (() => {
    const p = [
      rbox(8.4, 1.3, 2.5, C.white, { surface: 'paint', y: 1.0, segments: 1, bevel: 0.25 }),
      box(8.36, 0.5, 2.54, C.green, { surface: 'paint', y: 0.8 }),
      rbox(8.2, 1.0, 2.4, C.dglass, { y: 2.1, segments: 1, bevel: 0.1 }),
      rbox(8.4, 0.2, 2.5, C.white, { surface: 'paint', y: 2.7, segments: 1, bevel: 0.05 }),
      box(0.1, 0.6, 2.0, C.orange, { surface: 'paint', y: 2.55, x: 4.22 }),
      box(0.1, 0.9, 2.2, C.dglass, { y: 1.75, x: 4.22 }),
      box(0.05, 0.16, 0.9, C.dark, { y: 2.95, x: 4.2 }),
      box(0.8, 0.28, 0.06, C.neonG, { emissive: 1.3, surface: 'paint', y: 2.8, x: 3.4, z: 1.27 }),
      box(0.14, 0.2, 2.6, C.dgray, { surface: 'metal', y: 0.4, x: 4.25 }), box(0.14, 0.2, 2.6, C.dgray, { surface: 'metal', y: 0.4, x: -4.25 }),
      sphere(0.15, C.lamp, { emissive: 1, y: 0.75, x: 4.22, z: 0.95, segments: 6, rings: 4, flat: false }), sphere(0.15, C.lamp, { emissive: 1, y: 0.75, x: 4.22, z: -0.95, segments: 6, rings: 4, flat: false }),
      box(0.05, 0.25, 0.5, C.red, { surface: 'paint', y: 0.9, x: -4.22, z: 0.9 }), box(0.05, 0.25, 0.5, C.red, { surface: 'paint', y: 0.9, x: -4.22, z: -0.9 }),
      box(1.4, 0.35, 0.8, C.lgray, { y: 3.0, x: -1.5 }),
      box(1.0, 1.6, 0.05, C.dglass, { y: 1.4, x: 2.2, z: 1.26 }), box(1.0, 1.6, 0.05, C.dglass, { y: 1.4, x: -1.0, z: 1.26 }),
    ];
    for (let i = 0; i < 8; i++) p.push(box(0.08, 1.0, 0.05, C.white, { surface: 'paint', y: 2.1, x: -3.5 + i, z: 1.22 }), box(0.08, 1.0, 0.05, C.white, { surface: 'paint', y: 2.1, x: -3.5 + i, z: -1.22 }));
    for (const [x, z] of [[2.8, 1.15], [2.8, -1.15], [-2.8, 1.15], [-2.8, -1.15]]) p.push(...wheel(x, 0.55, z, 0.6, 0.4));
    return p;
  })(), { value: 4 });

  add('scrambleTruck', (() => {
    const p = [
      box(6.5, 0.6, 2.4, C.dgray, { surface: 'metal', y: 0.95 }),
      rbox(2.0, 1.7, 2.4, C.blue, { surface: 'paint', y: 1.95, x: 2.5, segments: 1, bevel: 0.18 }),
      box(0.1, 0.8, 2.2, C.glass, { y: 2.3, x: 3.53 }),
      box(0.8, 0.8, 0.05, C.glass, { y: 2.3, x: 2.5, z: 1.21 }), box(0.8, 0.8, 0.05, C.glass, { y: 2.3, x: 2.5, z: -1.21 }),
      rbox(4.4, 2.4, 2.5, C.hpink, { surface: 'paint', y: 2.3, x: -1.1, segments: 1, bevel: 0.12 }),
      // giant billboards: big picture panel, cartoon face, price banner
      box(4.0, 1.7, 0.06, C.white, { surface: 'paint', y: 2.45, x: -1.1, z: 1.27 }), box(4.0, 1.7, 0.06, C.white, { surface: 'paint', y: 2.45, x: -1.1, z: -1.27 }),
      sphere(0.5, C.yellow, { surface: 'paint', y: 2.6, x: -1.9, z: 1.31, sz: 0.2, segments: 9, rings: 6, flat: false }),
      sphere(0.08, C.dark, { y: 2.7, x: -1.7, z: 1.4, segments: 5, rings: 3, flat: false }), sphere(0.08, C.dark, { y: 2.7, x: -2.1, z: 1.4, segments: 5, rings: 3, flat: false }),
      box(0.4, 0.06, 0.04, C.red, { surface: 'paint', y: 2.45, x: -1.9, z: 1.44 }),
      box(1.4, 0.5, 0.04, C.neonY, { emissive: 1.3, surface: 'paint', y: 2.6, x: -0.2, z: 1.31 }), box(1.2, 0.3, 0.04, C.red, { surface: 'paint', y: 2.0, x: -0.4, z: 1.31 }),
      box(3.8, 0.28, 0.04, C.blue, { surface: 'paint', y: 3.28, x: -1.1, z: 1.28 }),
      box(0.06, 1.2, 0.5, C.dark, { y: 1.4, x: 3.55 }),
      box(0.14, 0.2, 2.6, C.dgray, { surface: 'metal', y: 0.55, x: 3.55 }), box(0.14, 0.2, 2.6, C.dgray, { surface: 'metal', y: 0.55, x: -3.3 }),
      sphere(0.14, C.lamp, { emissive: 1, y: 0.9, x: 3.53, z: 0.9, segments: 6, rings: 4, flat: false }), sphere(0.14, C.lamp, { emissive: 1, y: 0.9, x: 3.53, z: -0.9, segments: 6, rings: 4, flat: false }),
    ];
    for (const [x, z] of [[2.4, 1.15], [2.4, -1.15], [-2.2, 1.15], [-2.2, -1.15]]) p.push(...wheel(x, 0.7, z, 0.7, 0.4));
    return p;
  })(), { value: 3.5 });

  // ---------- large
  add('bulletTrain', trainCar(0), { value: 9 });
  add('bulletNose', trainNose(0), { value: 12 });
  // A whole moving train set (nose + 2 cars) as ONE object so it can run a route as a unit. +X is forward.
  add('bulletSet', [...trainNose(0), ...trainCar(-12.5), ...trainCar(-25)], { value: 40, radius: 11 });

  add('pagoda', (() => {
    const p = [
      box(6.6, 0.3, 6.6, '#c9c4b8', { surface: 'stone', y: 0.15 }),
      box(6.2, 0.4, 6.2, C.stone, { surface: 'stone', y: 0.5 }),
    ];
    for (let i = 0; i < 5; i++) {
      const w = 4.4 - i * 0.68, y0 = 0.7 + i * 2.3;
      p.push(
        rbox(w, 1.4, w, i % 2 ? C.cream : C.red, { surface: 'paint', y: y0 + 0.7, segments: 1, bevel: 0.06 }),
        box(w * 0.4, 0.85, 0.06, C.dark, { surface: 'paint', y: y0 + 0.65, z: w / 2 + 0.01 }),
        box(w * 0.4, 0.85, 0.06, C.dark, { surface: 'paint', y: y0 + 0.65, x: w / 2 + 0.01, ry: PI / 2 }),
        box(0.14, 1.4, 0.14, C.dbrown, { surface: 'wood', y: y0 + 0.7, x: w / 2, z: w / 2 }), box(0.14, 1.4, 0.14, C.dbrown, { surface: 'wood', y: y0 + 0.7, x: -w / 2, z: w / 2 }),
        box(0.14, 1.4, 0.14, C.dbrown, { surface: 'wood', y: y0 + 0.7, x: w / 2, z: -w / 2 }), box(0.14, 1.4, 0.14, C.dbrown, { surface: 'wood', y: y0 + 0.7, x: -w / 2, z: -w / 2 }),
        // curved-looking eaves: flat slab + hipped roof + upswept corner tips
        box(w * 1.28, 0.14, w * 1.28, C.dbrown, { surface: 'wood', y: y0 + 1.45 }),
        cone(w * 1.0, 0.95, C.roofgray, { surface: 'roof', y: y0 + 1.95, segments: 4, ry: PI / 4 }),
        cone(w * 1.12, 0.25, '#3b4753', { surface: 'roof', y: y0 + 1.62, segments: 4, ry: PI / 4 }),
        ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) => cone(0.13, 0.4, C.gold, { surface: 'metal', y: y0 + 1.6, x: sx * w * 0.64, z: sz * w * 0.64, segments: 5, rz: -sx * 0.3, rx: sz * 0.3 })),
      );
    }
    p.push(
      cyl(0.09, 0.13, 3.2, C.gold, { surface: 'metal', y: 13.6, segments: 8 }),
      ...[0, 1, 2, 3, 4].map((i) => torus(0.3 - i * 0.03, 0.05, C.gold, { surface: 'metal', y: 12.6 + i * 0.5, rx: PI / 2, radial: 4, segments: 10 })),
      sphere(0.16, C.gold, { surface: 'metal', y: 15.1, segments: 8, rings: 5, flat: false }),
    );
    return p;
  })(), { value: 18 });

  add('neonTower', (() => {
    const W = 4.0, D = 3.0, H = 12;
    const p = [
      box(W, H, D, C.dgray, { surface: 'stucco', y: H / 2 }),
      box(W + 0.4, 0.5, D + 0.4, C.dark, { surface: 'paint', y: H + 0.25 }),
      box(W + 0.3, 1.2, D + 0.3, C.dark, { surface: 'paint', y: 0.6 }),
      box(1.4, 1.5, 0.1, C.glass, { y: 0.85, z: D / 2 + 0.16 }),
      ...roofTop(W, D, H + 0.5, { tank: true }),
    ];
    const cols = [C.neonP, C.neonB, C.neonY, C.neonG, C.neonR, C.hpink];
    for (let i = 0; i < 5; i++) {
      const y = 2.6 + i * 1.9;
      p.push(
        box(3.5, 1.4, 0.16, C.dark, { surface: 'paint', y, z: D / 2 + 0.1 }),
        box(3.3, 1.2, 0.1, cols[i], { emissive: 1.3, y, z: D / 2 + 0.2 }),
        ...[-1.2, -0.4, 0.4, 1.2].map((x) => box(0.4, 0.6, 0.05, C.white, { surface: 'paint', y, x, z: D / 2 + 0.26 })),
        box(0.16, 1.4, 2.6, C.dark, { surface: 'paint', y, x: W / 2 + 0.1 }),
        box(0.1, 1.2, 2.4, cols[(i + 2) % 6], { emissive: 1.3, y, x: W / 2 + 0.2 }),
        box(0.5, 0.36, 0.3, C.lgray, { y: y - 0.7, x: -W / 2 - 0.15, z: 0.6 }),
      );
    }
    // big roof billboard + vertical blade sign
    p.push(
      box(3.8, 2.2, 0.2, C.dark, { surface: 'paint', y: 14.2, z: 0.6 }), box(3.6, 2.0, 0.12, C.neonP, { emissive: 1.3, surface: 'paint', y: 14.2, z: 0.72 }),
      box(3.0, 0.9, 0.05, C.white, { surface: 'paint', y: 14.2, z: 0.8 }), box(0.2, 1.4, 0.3, C.dark, { surface: 'paint', y: 13.2, x: -1.7, z: 0.6 }),
      ...banner(-W / 2 - 0.4, 8.0, 0.6, 5.0, C.neonB).map((g) => g.rotateY(0)),
    );
    return p;
  })(), { value: 8 });

  add('skyA', [
    ...tower(6.5, 6.5, 19, '#9db7cf', C.dglass, { mull: '#c9d8e6' }),
    ...tower(4.6, 4.6, 3.4, '#8ba7c1', C.dglass, { y0: 19, base: 0.4, mull: '#c9d8e6', fh: 1.4 }),
    ...roofTop(4.6, 4.6, 22.4, { mast: 4 }),
    box(6.9, 0.35, 6.9, C.dgray, { surface: 'stone', y: 19.0 }),
    box(2.4, 0.9, 0.3, C.dark, { surface: 'paint', y: 1.3, z: 3.5 }),
    box(2.0, 0.7, 0.06, C.neonB, { emissive: 1.3, surface: 'paint', y: 1.3, z: 3.66 }),
    ...banner(3.6, 8.5, 3.2, 3.2, C.neonP),
  ], { value: 10 });
  add('skyB', [
    ...tower(7.5, 5.5, 15.5, '#d9d2c3', C.dglass, { mull: '#efe9dc', fh: 1.7 }),
    box(7.9, 0.4, 5.9, C.dgray, { surface: 'stone', y: 15.5 }),
    ...roofTop(7.5, 5.5, 15.7, { tank: true, mast: 2.5 }),
    // vertical fins + entrance canopy + neon strip
    ...[-3.4, -1.7, 0, 1.7, 3.4].map((x) => box(0.16, 13, 0.36, '#eee8dc', { surface: 'stone', x, y: 8.6, z: 2.9 })),
    box(3.2, 0.2, 1.6, C.dgray, { surface: 'stone', y: 2.6, z: 3.4 }),
    box(3.0, 0.5, 0.06, C.neonG, { emissive: 1.3, surface: 'paint', y: 2.2, z: 4.0 }),
    ...banner(-3.9, 7.0, 2.6, 3.4, C.neonR),
  ], { value: 9 });
  add('skyC', [
    ...tower(5.5, 5.5, 26, '#b8a7d6', C.dglass, { mull: '#dcd2ee', fh: 1.7 }),
    box(5.9, 0.4, 5.9, C.dgray, { surface: 'stone', y: 24 }),
    ...tower(3.6, 3.6, 2.2, '#a695c6', C.dglass, { y: 26, base: 0.2, mull: '#dcd2ee', fh: 1.1 }),
    ...roofTop(3.6, 3.6, 28.2, { mast: 5 }),
    box(5.7, 0.6, 5.7, C.neonP, { emissive: 1.3, surface: 'paint', y: 25.2 }),
    ...[1, -1].map((s) => box(0.5, 6, 0.2, C.neonB, { emissive: 1.3, surface: 'paint', x: s * 2.6, y: 15, z: 2.86 })),
    box(2.2, 0.9, 0.3, C.dark, { surface: 'paint', y: 1.3, z: 2.95 }), box(1.8, 0.7, 0.06, C.neonY, { emissive: 1.3, surface: 'paint', y: 1.3, z: 3.11 }),
  ], { value: 11 });

  add('tokyoTower', (() => {
    const hw = (y) => 1.3 + 5.4 * Math.pow(Math.max(0, 1 - y / 27), 1.7);
    const p = [];
    const dy = 2.2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (let y = 0, i = 0; y < 26; y += dy, i++) {
        const h0 = hw(y), h1 = hw(y + dy), th = 0.95 * (1 - y / 60);
        p.push(box(th, dy * 1.04, th, i % 2 ? C.white : '#ee4a2e', { surface: 'paint',
          x: sx * (h0 + h1) / 2, z: sz * (h0 + h1) / 2, y: y + dy / 2,
          rz: sx * Math.atan((h0 - h1) / dy), rx: -sz * Math.atan((h0 - h1) / dy),
        }));
      }
      p.push(box(1.7, 0.6, 1.7, C.dgray, { surface: 'metal', x: sx * (hw(0) + 0.15), z: sz * (hw(0) + 0.15), y: 0.3 }));
    }
    const levels = [0.5, 3, 5.5, 8, 10.5, 13, 15.5, 17.4, 20, 22.5, 25];
    for (let i = 0; i < levels.length; i++) {
      const y0 = levels[i], y1 = levels[i + 1], h0 = hw(y0);
      for (const s of [-1, 1]) p.push(box(2 * h0, 0.3, 0.3, C.white, { surface: 'paint', y: y0, z: s * h0 }), box(0.3, 0.3, 2 * h0, C.white, { surface: 'paint', y: y0, x: s * h0 }));
      if (y1 === undefined) break;
      const h1 = hw(y1), hm = (h0 + h1) / 2, len = Math.hypot(h0 + h1, y1 - y0), ang = Math.atan2(y1 - y0, h0 + h1);
      for (const s of [-1, 1]) for (const k of [-1, 1]) {
        p.push(box(len, 0.2, 0.2, i % 2 ? '#ee4a2e' : C.white, { surface: 'paint', y: (y0 + y1) / 2, z: s * hm, rz: k * ang }));
        p.push(box(0.2, 0.2, len, i % 2 ? '#ee4a2e' : C.white, { surface: 'paint', y: (y0 + y1) / 2, x: s * hm, rx: k * ang }));
      }
    }
    // main deck (2 storeys), observation deck, upper mast
    p.push(
      rbox(7.4, 1.5, 7.4, '#ee4a2e', { surface: 'paint', y: 17.6, segments: 1, bevel: 0.2 }),
      rbox(7.7, 0.4, 7.7, C.white, { surface: 'paint', y: 18.55, segments: 1, bevel: 0.1 }),
      box(7.5, 0.6, 7.5, C.dglass, { y: 18.9 }),
      rbox(5.2, 0.5, 5.2, '#ee4a2e', { surface: 'paint', y: 19.5, segments: 1, bevel: 0.1 }),
    );
    for (const s of [-1, 1]) p.push(box(6.0, 0.9, 0.06, C.glass, { y: 17.6, z: s * 3.72 }), box(0.06, 0.9, 6.0, C.glass, { y: 17.6, x: s * 3.72 }));
    // upper tower (tapering lattice core) + top deck
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(box(0.45, 8.4, 0.45, C.white, { surface: 'paint', x: sx * 1.5, z: sz * 1.5, y: 24.2, rz: sx * 0.09, rx: -sz * 0.09 }));
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) p.push(box(3.0 - i * 0.3, 0.16, 0.16, '#ee4a2e', { surface: 'paint', y: 21 + i * 1.9, z: s * (1.4 - i * 0.12) }), box(0.16, 0.16, 3.0 - i * 0.3, '#ee4a2e', { surface: 'paint', y: 21 + i * 1.9, x: s * (1.4 - i * 0.12) }));
    p.push(
      rbox(4.0, 1.0, 4.0, '#ee4a2e', { surface: 'paint', y: 28.4, segments: 1, bevel: 0.15 }),
      box(4.2, 0.25, 4.2, C.white, { surface: 'paint', y: 29.0 }),
      box(3.6, 0.35, 3.6, C.dglass, { y: 28.4 }),
      lathe([[0.35, 29.1], [0.25, 34], [0.18, 38]], C.white, { surface: 'paint', segments: 8, flat: false }),
      ...[0, 1, 2, 3].map((i) => cyl(0.3 - i * 0.03, 0.3 - i * 0.03, 1.4, i % 2 ? C.white : '#ee4a2e', { surface: 'paint', y: 30.2 + i * 1.7 })).map((g) => g),
      lathe([[0.18, 38], [0.1, 41], [0.03, 44.1]], '#ee4a2e', { surface: 'paint', segments: 8, flat: false }),
      sphere(0.2, C.red, { y: 44.3, segments: 8, rings: 5, flat: false }),
    );
    return p;
  })(), { value: 100, radius: 8 });

  add('skytree', (() => {
    const p = [];
    // tripod base: three splayed tubes with ring braces converging into the round core
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2 + 0.5, ca = Math.cos(a), sa = Math.sin(a);
      p.push(cyl(0.45, 0.6, 15.4, C.lgray, { surface: 'metal', x: ca * 3.6, z: sa * 3.6, y: 7.6, rz: -sa * 0.24, rx: ca * 0.24, segments: 8 }));
      p.push(box(0.9, 0.4, 0.9, C.dgray, { surface: 'metal', x: ca * 5.6, z: sa * 5.6, y: 0.2 }));
    }
    for (const y of [3, 6, 9, 12]) p.push(torus(4.6 - y * 0.24, 0.16, C.white, { surface: 'metal', y, rx: PI / 2, radial: 4, segments: 16 }));
    // core shaft: lathe silhouette, slightly tapered with a bulge at each deck, ribbed
    p.push(
      lathe([[2.9, 0.5], [2.7, 4], [2.4, 11], [2.15, 20], [1.95, 26], [2.3, 27.0]], '#dbe4ee', { surface: 'metal', segments: 12 }),
      lathe([[1.95, 29.4], [1.8, 34], [1.6, 40], [1.4, 43]], '#e6edf5', { surface: 'metal', segments: 12 }),
      // lower observation deck (Tembo Deck)
      lathe([[2.2, 26.6], [3.4, 27.0], [3.9, 27.6], [3.9, 28.4], [3.3, 29.2], [2.0, 29.6]], C.white, { surface: 'metal', segments: 14 }),
      cyl(3.95, 3.95, 0.7, C.dglass, { y: 28.0, segments: 14 }),
      cyl(4.15, 4.15, 0.16, C.lblue, { y: 28.5, segments: 14 }),
      // upper deck (Tembo Galleria)
      lathe([[1.5, 41.0], [2.4, 41.3], [2.8, 41.9], [2.8, 42.5], [2.3, 43.2], [1.3, 43.5]], C.white, { surface: 'metal', segments: 12 }),
      cyl(2.85, 2.85, 0.5, C.dglass, { y: 42.2, segments: 12 }),
      // gain tower + antenna
      lathe([[1.2, 43.4], [0.9, 47], [0.6, 51], [0.3, 55]], '#e8eef5', { surface: 'metal', segments: 8, flat: false }),
      lathe([[0.3, 55], [0.08, 59.1]], C.red, { surface: 'paint', segments: 6, flat: false }),
      sphere(0.2, C.red, { surface: 'paint', y: 59.3, segments: 6, rings: 4, flat: false }),
    );
    // lattice ribs (three thin vertical struts + horizontal rings) on the lower shaft
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2 + 0.5 + PI / 3;
      p.push(box(0.3, 16, 0.3, C.white, { surface: 'metal', x: Math.cos(a) * 2.4, z: Math.sin(a) * 2.4, y: 20, rz: -Math.sin(a) * 0.02, rx: Math.cos(a) * 0.02 }));
    }
    for (const y of [16, 20, 24]) p.push(torus(2.4 - (y - 16) * 0.02, 0.09, C.lgray, { surface: 'metal', y, rx: PI / 2, radial: 4, segments: 14 }));
    for (const y of [32, 36, 40]) p.push(torus(1.8 - (y - 32) * 0.03, 0.09, C.lgray, { surface: 'metal', y, rx: PI / 2, radial: 4, segments: 14 }));
    return p;
  })(), { value: 80, radius: 7 });

  return P;
}
