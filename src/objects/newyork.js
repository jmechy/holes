// New York object prototypes. Vehicles are length-along-X, front toward +X. Buildings face +Z.
import { paletteBuilders, makeProto, articulate } from './build.js';
import { facadeWall } from './ModelDetails.js';
import { applyModelFinishes } from './ModelFinishes.js';
import { TEXTURE_LAYERS } from './TextureLibrary.js';

const C = {
  taxi: '#f7c81e', dtaxi: '#c9a012', white: '#f4f4f4', dark: '#2b2b30', gray: '#8d949b', lgray: '#c4c9d0', chrome: '#dfe3e8',
  glass: '#8fd3f4', dglass: '#4f86ab', tire: '#1f1f22', red: '#d9382b', blue: '#2f7fd6', green: '#3f9b4a',
  dgreen: '#2e7d3a', lgreen: '#5fc26a', trunk: '#6b4626', skin: '#f1c8a0', skin2: '#a9724a', brown: '#8a4b2e',
  brownstone: '#9a5a3c', dbrown: '#6f3b25', stone: '#d8d2c2', dstone: '#a9a294', silver: '#cfd3da', orange: '#f28c28',
  pigeon: '#8b93a3', pink: '#f08fb0', purple: '#7a55c8', yellow: '#ffd23a', copper: '#5fb59a', dcopper: '#3f9078',
  wood: '#a97b42', dgray: '#4a4f57', bus: '#2f6fd0', iron: '#2a2d33', lamp: '#fff2a8',
};
// Explicit material colors retain the map palette; per-part tags override these defaults.
const { box, rbox, cyl, cone, sphere, torus, capsule, lathe, extrude } = paletteBuilders([
  [C.wood, 'wood'],
  [C.glass, 'glass'],
  [C.dglass, 'glass'],
  [C.tire, 'rubber'],
  [C.chrome, 'metal'],
  [C.silver, 'metal'],
  [C.iron, 'metal'],
  [C.stone, 'stone'],
  [C.dstone, 'stone'],
  [C.brownstone, 'brick'],
  [C.trunk, 'wood'],
  [C.dgreen, 'metal'],
  [C.copper, 'metal'],
  [C.dcopper, 'metal'],
  [C.lgray, 'metal'],
  [C.gray, 'metal'],
  [C.taxi, 'paint'],
  [C.dtaxi, 'paint'],
  [C.red, 'paint'],
  [C.blue, 'paint'],
  [C.bus, 'paint'],
  [C.white, 'paint'],
]);
const FALLBACK = { pigeon: ['fabric', 0.5], pedestrian: ['fabric', 0.4], pedestrianB: ['fabric', 0.4], pedestrianC: ['fabric', 0.4], chrysler: ['metal', 0.6], empire: ['stone', 0.6] };
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

/** Clone + rotate about Y + translate a list of parts. */
const at = (parts, x = 0, y = 0, z = 0, ry = 0) => parts.map((g) => { const c = g.clone(); return (ry ? c.rotateY(ry) : c).translate(x, y, z); });

/** Rolling wheel (tire, hub, three crossed spokes) that spins with travel; front wheels also steer. */
const wheel = (x, y, z, r, w = 0.4) => {
  const pivot = [x, y, z], opts = { radius: r, front: x > 0 };
  return [
    cyl(r, r, w, C.tire, { x, y, z, rx: PI / 2, segments: 14, surface: 'rubber' }),
    cyl(r * 0.6, r * 0.6, w + 0.04, C.lgray, { x, y, z, rx: PI / 2, segments: 10, surface: 'metal' }),
    ...[0, 1, 2].map((i) => box(r * 1.05, r * 0.13, w + 0.08, C.dark, { x, y, z, rz: (i * PI) / 3, surface: 'metal' })),
  ].map((g) => articulate(g, 'wheel', pivot, opts));
};

const person = (o, extra = []) => {
  const { shirt, pants, skin = C.skin, hair = C.dark, hat, shoes = C.dark } = o;
  const p = [];
  for (const side of [-1, 1]) {
    const z = side * 0.09, hip = [0, 0.56, z], knee = [0, 0.3, z], leg = { side, hip };
    const shoulder = [0, 1.1, side * 0.31], arm = { side };
    p.push(
      articulate(cyl(0.085, 0.072, 0.34, pants, { y: 0.4, z, segments: 8, flat: false, surface: 'fabric' }), 'leg', hip, leg),
      articulate(cyl(0.072, 0.062, 0.3, pants, { y: 0.16, z, segments: 8, flat: false, surface: 'fabric' }), 'shin', knee, leg),
      articulate(box(0.28, 0.1, 0.16, shoes, { y: 0.05, x: 0.05, z, surface: 'rubber' }), 'shin', knee, leg),
      articulate(cyl(0.07, 0.058, 0.52, shirt, { y: 0.82, z: side * 0.31, segments: 8, flat: false, surface: 'fabric' }), 'arm', shoulder, arm),
      articulate(sphere(0.06, skin, { y: 0.54, z: side * 0.31, segments: 6, rings: 4, flat: false }), 'arm', shoulder, arm),
    );
  }
  p.push(
    cyl(0.21, 0.23, 0.64, shirt, { y: 0.84, segments: 12, surface: 'fabric' }),
    sphere(0.18, skin, { y: 1.38, ...S8 }),
    sphere(0.19, hair, { y: 1.44, x: -0.02, sy: 0.75, segments: 8, rings: 4, flat: false }),
    box(0.03, 0.04, 0.04, C.dark, { y: 1.41, x: 0.165, z: 0.07 }),
    box(0.03, 0.04, 0.04, C.dark, { y: 1.41, x: 0.165, z: -0.07 }),
  );
  if (hat) p.push(cyl(0.2, 0.2, 0.05, hat, { y: 1.53, x: 0.03, segments: 9, surface: 'fabric' }), cyl(0.15, 0.17, 0.1, hat, { y: 1.58, segments: 9, surface: 'fabric' }));
  return [...p, ...extra];
};

/** US sedan, length along X. */
const car = (body, roof, o = {}) => {
  const L = o.len ?? 4.2, W = 1.8, ch = 0.6, top = 0.97, cx = -0.25;
  return [
    rbox(L, 0.66, W, body, { surface: 'paint', y: 0.66, segments: 1, bevel: 0.17 }),
    rbox(2.3, ch, W * 0.9, C.glass, { y: top + ch / 2 - 0.03, x: cx, segments: 1, bevel: 0.13 }),
    rbox(2.2, 0.1, W * 0.92, roof || body, { surface: 'paint', y: top + ch - 0.02, x: cx, segments: 1, bevel: 0.05 }),
    ...[1, -1].flatMap((s) => [
      box(0.09, ch, 0.06, roof || body, { surface: 'paint', y: top + ch / 2 - 0.03, x: cx + 1.1, z: s * W * 0.44 }),
      box(0.09, ch, 0.06, roof || body, { surface: 'paint', y: top + ch / 2 - 0.03, x: cx - 1.1, z: s * W * 0.44 }),
      box(0.06, ch, 0.06, roof || body, { surface: 'paint', y: top + ch / 2 - 0.03, x: cx, z: s * W * 0.45 }),
      box(0.03, 0.42, 0.03, C.dark, { y: 0.8, x: cx - 0.2, z: s * (W / 2 + 0.005) }),
      box(0.03, 0.42, 0.03, C.dark, { y: 0.8, x: cx + 0.9, z: s * (W / 2 + 0.005) }),
      box(0.14, 0.05, 0.04, C.chrome, { y: 0.92, x: cx + 0.15, z: s * (W / 2 + 0.01) }),
      box(0.12, 0.09, 0.14, body, { surface: 'paint', y: 1.12, x: cx + 1.15, z: s * (W / 2 + 0.1) }),
      box(0.07, 0.15, 0.38, C.lamp, { emissive: 1, y: 0.82, x: L / 2 + 0.005, z: s * W * 0.33 }),
      box(0.06, 0.16, 0.4, C.red, { y: 0.84, x: -L / 2 - 0.005, z: s * W * 0.33 }),
    ]),
    box(0.14, 0.16, W * 1.04, C.chrome, { y: 0.4, x: L / 2 + 0.03 }),
    box(0.14, 0.16, W * 1.04, C.chrome, { y: 0.4, x: -L / 2 - 0.03 }),
    box(0.04, 0.2, 0.7, C.dark, { y: 0.68, x: L / 2 + 0.01 }),
    box(0.03, 0.14, 0.34, C.white, { y: 0.56, x: -L / 2 - 0.1 }),
    box(0.03, 0.14, 0.34, C.white, { y: 0.46, x: L / 2 + 0.1 }),
    ...wheel(1.3, 0.4, W / 2 - 0.06, 0.4, 0.28), ...wheel(1.3, 0.4, -W / 2 + 0.06, 0.4, 0.28),
    ...wheel(-1.3, 0.4, W / 2 - 0.06, 0.4, 0.28), ...wheel(-1.3, 0.4, -W / 2 + 0.06, 0.4, 0.28),
  ];
};

/** Recessed window facing +Z, front face of the wall at z=0: glass set back inside a cut opening, sill + lintel. */
const win = (x, y, ww, wh, frame = C.white, glass = C.dglass, ac = false, simple = false) => {
  const p = [
    box(ww, wh, 0.03, glass, { x, y, z: -0.17, surface: 'glass' }),
    box(ww + 0.3, 0.09, 0.26, C.stone, { x, y: y - wh / 2 - 0.05, z: 0.04, surface: 'stone' }),
  ];
  if (!simple) {
    p.push(
      box(0.05, wh, 0.05, frame, { x, y, z: -0.14, surface: 'paint' }),
      box(ww + 0.26, 0.13, 0.14, C.stone, { x, y: y + wh / 2 + 0.07, z: 0.0, surface: 'stone' }),
    );
  }
  if (ac) p.push(box(ww * 0.7, 0.4, 0.4, C.lgray, { x, y: y - wh * 0.15, z: 0.24 }), box(ww * 0.5, 0.05, 0.04, C.dark, { x, y: y - wh * 0.15, z: 0.45, surface: 'metal' }));
  return p;
};
/** Opening rectangles matching win(): cut into a facadeWall so the glass really sits inside the brick. */
const hole = (x, y, ww, wh) => ({ x, y, width: ww, height: wh });

/** Solid core + four brick/stone facade walls with real openings (fo front, bo back, so sides). */
const shell = (w, d, h, t, wall, surface, fo, bo, so) => [
  box(w - 2 * t + 0.1, h, d - 2 * t + 0.1, wall, { y: h / 2, surface }),
  ...facadeWall(w, h, t, wall, fo, { z: d / 2 - t / 2, surface }),
  ...facadeWall(w, h, t, wall, bo, { z: -(d / 2 - t / 2), ry: PI, surface }),
  ...[1, -1].flatMap((s) => facadeWall(d - 2 * t, h, t, wall, so, { x: s * (w / 2 - t / 2), ry: s * PI / 2, surface })),
];

/** Fire escape on the +Z face (z=0 plane): landings, railings, zig-zag stairs, drop ladder. */
const fireEscape = (x, floors, fh, y0, width = 2.0) => {
  const p = [];
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * fh;
    p.push(
      box(width, 0.06, 0.75, C.iron, { x, y, z: 0.4 }),
      box(width, 0.05, 0.04, C.iron, { x, y: y + 0.95, z: 0.77 }),
      box(width, 0.04, 0.04, C.iron, { x, y: y + 0.5, z: 0.77 }),
      box(0.04, 0.95, 0.75, C.iron, { x: x - width / 2, y: y + 0.48, z: 0.4 }),
      box(0.04, 0.95, 0.75, C.iron, { x: x + width / 2, y: y + 0.48, z: 0.4 }),
    );
    for (let i = 1; i < 6; i++) p.push(box(0.03, 0.9, 0.03, C.iron, { x: x - width / 2 + (width * i) / 6, y: y + 0.48, z: 0.77 }));
  }
  // diagonal stair runs (rotate about Z in the wall plane)
  for (let f = 1; f < floors; f++) {
    const sx = f % 2 ? -1 : 1, ang = Math.atan2(fh, width * 0.7);
    p.push(box(Math.hypot(width * 0.7, fh), 0.06, 0.4, C.iron, { x: x + sx * width * 0.15, y: y0 + (f - 0.5) * fh, z: 0.95, rz: sx * ang }));
  }
  p.push(box(0.04, fh * 1.3, 0.04, C.iron, { x: x - width * 0.35, y: y0 - fh * 0.4, z: 0.7 }), box(0.04, fh * 1.3, 0.04, C.iron, { x: x - width * 0.2, y: y0 - fh * 0.4, z: 0.7 }));
  return p;
};

/** Rooftop wooden water tank on a steel frame. */
const waterTank = (x, y, z, s = 1) => [
  ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => box(0.12 * s, 1.2 * s, 0.12 * s, C.iron, { x: x + a * 0.8 * s, y: y + 0.6 * s, z: z + b * 0.8 * s })),
  box(2.0 * s, 0.1 * s, 2.0 * s, C.iron, { x, y: y + 1.2 * s, z }),
  cyl(1.0 * s, 1.0 * s, 2.0 * s, C.trunk, { x, y: y + 2.2 * s, z, segments: 12 }),
  ...[0.4, 1.3, 2.0].map((k) => cyl(1.04 * s, 1.04 * s, 0.09 * s, C.iron, { x, y: y + (1.4 + k * 0.7) * s, z, segments: 12 })),
  cone(1.15 * s, 0.9 * s, '#5a3a20', { x, y: y + 3.65 * s, z, segments: 12, surface: 'wood' }),
  cyl(0.08 * s, 0.08 * s, 0.4 * s, C.iron, { x, y: y + 4.3 * s, z, segments: 5 }),
];

/** Rooftop clutter (bulkhead, vents, AC units, parapet). */
const roofTop = (w, d, y, o = {}) => [
  box(w + 0.2, 0.3, 0.16, C.dstone, { y: y + 0.15, z: d / 2 }), box(w + 0.2, 0.3, 0.16, C.dstone, { y: y + 0.15, z: -d / 2 }),
  box(0.16, 0.3, d, C.dstone, { y: y + 0.15, x: w / 2 }), box(0.16, 0.3, d, C.dstone, { y: y + 0.15, x: -w / 2 }),
  rbox(w * 0.28, 0.9, d * 0.24, C.gray, { y: y + 0.45, x: -w * 0.24, z: d * 0.2, segments: 1, bevel: 0.05, surface: 'metal' }),
  box(w * 0.2, 0.5, d * 0.2, C.lgray, { y: y + 0.25, x: w * 0.22, z: -d * 0.22 }),
  cyl(0.18, 0.18, 0.05, C.dark, { y: y + 0.52, x: w * 0.22, z: -d * 0.22, segments: 8, surface: 'metal' }),
  ...(o.mast ? [cyl(0.05, 0.09, o.mast, C.gray, { y: y + o.mast / 2, x: w * 0.1, segments: 6 }), sphere(0.13, C.red, { y: y + o.mast + 0.1, x: w * 0.1, segments: 6, rings: 4, flat: false })] : []),
];

/** Curtain-wall tower: glass bands + mullions on four faces, cornice. */
const tower = (w, d, h, body, glass, y0 = 0, gap = 1.6, o = {}) => {
  // o.masonry: limestone shaft (stone) instead of a glossy glass curtain wall.
  const p = [box(w, h, d, body, { y: y0 + h / 2, surface: o.masonry ? 'stone' : 'glass' })];
  const n = Math.max(1, Math.floor((h - 1.6) / gap));
  const step = (h - 1.6) / n, bh = Math.min(0.9, step * 0.55);
  for (let i = 0; i < n; i++) {
    const y = y0 + 1.2 + i * step + step / 2;
    p.push(
      box(w - 0.5, bh, 0.06, glass, { y, z: d / 2 + 0.02, surface: 'glass' }), box(w - 0.5, bh, 0.06, glass, { y, z: -d / 2 - 0.02, surface: 'glass' }),
      box(0.06, bh, d - 0.5, glass, { y, x: w / 2 + 0.02, surface: 'glass' }), box(0.06, bh, d - 0.5, glass, { y, x: -w / 2 - 0.02, surface: 'glass' }),
    );
  }
  const nx = Math.max(2, Math.round(w / 1.3)), nz = Math.max(2, Math.round(d / 1.3)), mh = h - 1.2, my = y0 + 0.6 + mh / 2;
  const mc = o.mull || body, ms = o.masonry ? 'stone' : 'metal';
  for (let i = 0; i <= nx; i++) {
    const x = -w / 2 + 0.25 + ((w - 0.5) * i) / nx;
    p.push(box(0.1, mh, 0.1, mc, { x, y: my, z: d / 2 + 0.04, surface: ms }), box(0.1, mh, 0.1, mc, { x, y: my, z: -d / 2 - 0.04, surface: ms }));
  }
  for (let i = 0; i <= nz; i++) {
    const z = -d / 2 + 0.25 + ((d - 0.5) * i) / nz;
    p.push(box(0.1, mh, 0.1, mc, { x: w / 2 + 0.04, y: my, z, surface: ms }), box(0.1, mh, 0.1, mc, { x: -w / 2 - 0.04, y: my, z, surface: ms }));
  }
  p.push(box(w + 0.3, 0.3, d + 0.3, C.dstone, { y: y0 + h + 0.15 }), box(w + 0.1, 0.25, d + 0.1, C.dstone, { y: y0 + 0.13 }));
  return p;
};

/** Masonry apartment block (front +Z): brick facade with recessed windows, AC units, fire escape, cornice, roof clutter. */
const apartment = (w, d, h, wall, o = {}) => {
  const fh = 2.0, fl = Math.floor((h - 2.4) / fh), t = 0.3;
  const nx = Math.max(2, Math.floor((w - 1.4) / 1.9)), ns = Math.max(2, Math.floor((d - 1.2) / 2.2));
  const fo = [], bo = [], so = [], front = [], back = [], side = [];
  for (let f = 0; f < fl; f++) {
    const y = 2.4 + f * fh;
    for (let i = 0; i < nx; i++) {
      const x = -w / 2 + 0.7 + ((w - 1.4) * (i + 0.5)) / nx;
      fo.push(hole(x, y, 0.85, 1.15)); bo.push(hole(x, y, 0.85, 1.15));
      front.push(...win(x, y, 0.85, 1.15, C.white, C.dglass, (f + i) % 3 === 0));
      back.push(...win(x, y, 0.85, 1.15, C.white, C.dglass, false, true));
    }
    front.push(box(w, 0.08, 0.05, C.stone, { y: y - 0.75, z: 0.03, surface: 'stone' }));
    for (let i = 0; i < ns; i++) {
      const x = -d / 2 + 0.6 + ((d - 1.2) * (i + 0.5)) / ns;
      so.push(hole(x, y, 0.8, 1.1)); side.push(...win(x, y, 0.8, 1.1, C.white, C.dglass, false, true));
    }
  }
  const p = [
    ...shell(w, d, h, t, wall, 'brick', fo, bo, so),
    box(w + 0.15, 1.6, d + 0.15, C.dstone, { y: 0.8 }),
    box(w + 0.7, 0.35, d + 0.7, C.dstone, { y: h + 0.17 }),
    box(w + 0.4, 0.25, d + 0.4, C.stone, { y: h - 0.15 }),
    ...[1, -1].flatMap((sx) => [1, -1].map((sz) => box(0.5, h, 0.5, C.stone, { x: sx * (w / 2 - 0.05), z: sz * (d / 2 - 0.05), y: h / 2 }))),
  ];
  p.push(...at(front, 0, 0, d / 2), ...at(back, 0, 0, -d / 2, PI), ...at(side, w / 2, 0, 0, PI / 2), ...at(side, -w / 2, 0, 0, -PI / 2));
  // entrance: double doors, awning, lamps
  p.push(
    ...at([
      box(1.9, 2.0, 0.12, C.dark, { y: 1.0, z: 0.05, surface: 'wood' }), box(1.6, 1.8, 0.1, C.dglass, { y: 0.98, z: 0.1 }), box(0.06, 1.8, 0.08, C.dark, { y: 0.98, z: 0.14, surface: 'metal' }),
      box(2.6, 0.12, 1.1, o.awn || C.green, { y: 2.4, z: 0.55, rx: 0.2, surface: 'fabric' }), box(2.6, 0.2, 0.05, o.awn || C.green, { y: 2.22, z: 1.08, surface: 'fabric' }),
      box(0.08, 2.3, 0.08, C.iron, { y: 1.15, x: -1.2, z: 1.05 }), box(0.08, 2.3, 0.08, C.iron, { y: 1.15, x: 1.2, z: 1.05 }),
      sphere(0.14, C.lamp, { emissive: 1, y: 1.9, x: -1.25, z: 0.2, segments: 6, rings: 4, flat: false }),
    ], 0, 0, d / 2 + 0.03),
    ...at(fireEscape(w * 0.3, Math.min(fl - 1, 5), fh, 3.4, 2.0), 0, 0, d / 2 + 0.03),
    ...roofTop(w, d, h + 0.35, { mast: o.mast }),
  );
  if (o.tank) p.push(...waterTank(w * 0.2, h + 0.35, d * 0.15, 0.85));
  if (o.setback) p.push(...tower(w * 0.6, d * 0.6, 3.2, wall, C.dglass, h + 0.35, 1.5, { masonry: true }));
  return p;
};

/** Brownstone row house (front +Z): stoop, arched door, recessed tall windows, lintels, bracketed cornice. */
const brownstone = (wall, trim, floors) => {
  const w = 5, d = 7, fh = 1.8, H = floors * fh + 0.6, t = 0.3;
  const fo = [hole(-1.2, 1.4, 1.0, 1.1)], bo = [], so = [];
  const front = [
    // stoop: steps, side walls, landing, iron rail
    ...[0, 1, 2, 3].map((i) => box(1.5, 0.22, 0.42, C.stone, { y: 0.11 + i * 0.22, x: 1.3, z: 0.95 - i * 0.28 + 0.0 })),
    box(0.2, 1.1, 1.7, C.dstone, { y: 0.55, x: 0.45, z: 0.75 }), box(0.2, 1.1, 1.7, C.dstone, { y: 0.55, x: 2.15, z: 0.75 }),
    box(1.9, 0.14, 0.8, C.stone, { y: 1.05, x: 1.3, z: 0.4 }),
    box(0.05, 0.8, 1.6, C.iron, { y: 1.45, x: 0.5, z: 0.75 }), box(0.05, 0.8, 1.6, C.iron, { y: 1.45, x: 2.1, z: 0.75 }),
    // arched door with transom + lintel
    box(1.1, 1.9, 0.12, C.dbrown, { y: 2.05, x: 1.3, z: 0.05, surface: 'wood' }),
    cyl(0.55, 0.55, 0.12, C.dbrown, { y: 3.0, x: 1.3, z: 0.05, rx: PI / 2, segments: 12, surface: 'wood' }),
    cyl(0.4, 0.4, 0.14, C.dglass, { y: 3.0, x: 1.3, z: 0.06, rx: PI / 2, segments: 10 }),
    box(1.5, 0.15, 0.2, C.stone, { y: 1.05 + 0.02, x: 1.3, z: 0.15 }),
    box(0.9, 0.5, 0.06, C.dglass, { y: 2.3, x: 1.3, z: 0.13 }),
    sphere(0.06, C.gold ?? '#e2b23c', { y: 2.0, x: 1.7, z: 0.16, segments: 5, rings: 3, flat: false, surface: 'metal' }),
    // garden-level window with grille
    ...win(-1.2, 1.4, 1.0, 1.1, C.stone, C.dglass),
    box(1.1, 0.05, 0.05, C.iron, { y: 1.05, x: -1.2, z: 0.15 }),
  ];
  for (let f = 1; f < floors; f++) for (const x of [-1.2, 1.3]) {
    const tall = f === 1, y = 1.8 + f * fh + 0.4 + (tall ? 0.15 : 0), wh = tall ? 1.2 : 1.15;
    fo.push(hole(x, y, 0.9, wh)); front.push(...win(x, y, 0.9, wh, C.white, C.dglass, f === 2 && x < 0));
  }
  const side = [], back = [];
  for (let f = 1; f < floors; f++) for (const z of [-2, 0.5, 2.5]) { so.push(hole(z, 1.6 + f * fh + 0.4, 0.8, 1.1)); side.push(...win(z, 1.6 + f * fh + 0.4, 0.8, 1.1, C.white, C.dglass, false, true)); }
  for (let f = 0; f < floors; f++) for (const x of [-1.2, 1.2]) { bo.push(hole(x, 1.6 + f * fh + 0.4, 0.8, 1.1)); back.push(...win(x, 1.6 + f * fh + 0.4, 0.8, 1.1, C.white, C.dglass, false, true)); }
  const p = [
    ...shell(w, d, H, t, wall, 'brick', fo, bo, so),
    box(w + 0.1, 1.0, d + 0.1, C.dstone, { y: 0.5 }),
    // cornice with brackets
    box(w + 0.6, 0.3, d + 0.6, trim, { y: H + 0.15, surface: 'stone' }),
    box(w + 0.35, 0.25, d + 0.35, C.stone, { y: H - 0.15 }),
    ...[-2.1, -1.05, 0, 1.05, 2.1].map((x) => box(0.28, 0.4, 0.3, trim, { y: H - 0.42, x, z: d / 2 + 0.2, surface: 'stone' })),
    box(w - 0.6, 0.5, d - 0.6, C.gray, { y: H + 0.55, surface: 'roof' }),
    // roof bulkhead + chimney
    box(1.0, 0.9, 1.0, wall, { y: H + 0.6, x: 1.4, z: -1.5, surface: 'brick' }), box(1.2, 0.15, 1.2, trim, { y: H + 1.1, x: 1.4, z: -1.5, surface: 'stone' }),
    box(0.6, 1.2, 0.6, C.brown, { y: H + 1.0, x: -1.6, z: 1.6, surface: 'brick' }),
  ];
  p.push(...at(front, 0, 0, d / 2), ...at(side, w / 2, 0, 0, PI / 2), ...at(side, -w / 2, 0, 0, -PI / 2), ...at(back, 0, 0, -d / 2, PI));
  return p;
};

export function buildProtos() {
  const P = {};
  const add = (name, parts, opts) => (P[name] = applyModelFinishes(fillSurface(makeProto(name, parts.flat(), opts), FALLBACK[name] ?? DEFAULT_FALLBACK), 'urban'));

  // ---------- Small
  add('trashCan', [
    cyl(0.32, 0.26, 0.85, C.dgreen, { y: 0.43, segments: 12 }),
    ...[0.2, 0.42, 0.64].map((y) => cyl(0.315 - (0.85 - y) * 0.06, 0.315 - (0.85 - y) * 0.06, 0.03, C.iron, { y, segments: 12 })),
    cyl(0.36, 0.36, 0.08, C.iron, { y: 0.9, segments: 12 }),
    cyl(0.06, 0.06, 0.14, C.iron, { y: 1.0, segments: 6 }),
    box(0.22, 0.1, 0.05, C.dark, { y: 0.7, x: 0.31, ry: 0 }),
  ], { value: 0.3 });

  add('hydrant', [
    cyl(0.28, 0.3, 0.08, C.iron, { y: 0.04, segments: 10 }),
    lathe([[0.2, 0.08], [0.17, 0.3], [0.18, 0.55], [0.2, 0.6]], C.red, { segments: 10 }),
    sphere(0.19, C.red, { y: 0.62, sy: 0.75, segments: 10, rings: 6, flat: false }),
    cyl(0.05, 0.05, 0.1, C.yellow, { y: 0.79, segments: 6 }),
    cyl(0.09, 0.09, 0.56, C.red, { y: 0.44, rz: PI / 2, segments: 8 }),
    cyl(0.11, 0.11, 0.05, C.yellow, { y: 0.44, x: 0.3, rz: PI / 2, segments: 8 }),
    cyl(0.11, 0.11, 0.05, C.yellow, { y: 0.44, x: -0.3, rz: PI / 2, segments: 8 }),
    cyl(0.1, 0.1, 0.12, C.red, { y: 0.4, z: 0.22, rx: PI / 2, segments: 8 }),
    cyl(0.12, 0.12, 0.04, C.yellow, { y: 0.4, z: 0.29, rx: PI / 2, segments: 8 }),
  ], { value: 0.25 });

  add('newsBox', [
    rbox(0.55, 0.9, 0.5, C.blue, { y: 0.55, segments: 1, bevel: 0.05 }),
    box(0.5, 0.3, 0.06, C.glass, { y: 0.85, z: 0.26 }),
    box(0.15, 0.1, 0.06, C.white, { y: 0.55, z: 0.27 }),
    box(0.4, 0.12, 0.05, C.white, { y: 1.02, z: 0.2 }),
    box(0.08, 0.5, 0.08, C.iron, { y: 0.25, x: 0.2, z: 0.15 }), box(0.08, 0.5, 0.08, C.iron, { y: 0.25, x: -0.2, z: 0.15 }),
    box(0.4, 0.06, 0.4, C.dark, { y: 1.02 }),
  ], { value: 0.35 });

  add('mailbox', [
    box(0.6, 0.75, 0.6, C.blue, { y: 0.38 }),
    box(0.62, 0.06, 0.62, C.iron, { y: 0.03 }),
    cyl(0.31, 0.31, 0.62, C.blue, { y: 0.92, rz: PI / 2, ry: 0, segments: 12 }),
    box(0.36, 0.06, 0.1, C.dark, { y: 0.7, z: 0.31 }),
    box(0.3, 0.2, 0.03, C.white, { y: 0.45, z: 0.31 }),
    box(0.3, 0.05, 0.03, C.red, { y: 0.55, z: 0.32 }),
    box(0.14, 0.14, 0.06, C.chrome, { y: 0.9, z: 0.32 }),
  ], { value: 0.35 });

  add('pedestrian', person({ shirt: C.red, pants: C.blue, hair: '#5a3a22' }, [
    box(0.24, 0.3, 0.12, C.dark, { y: 0.85, x: -0.27, surface: 'fabric' }),
    box(0.05, 0.05, 0.05, C.chrome, { y: 1.05, x: -0.27 }),
  ]), { move: { type: 'walk', speed: 1.4, range: 8 }, value: 0.6 });
  add('pedestrianB', person({ shirt: C.green, pants: C.dark, skin: C.skin2, hair: C.dark, hat: C.dark }, [
    box(0.32, 0.22, 0.1, C.brown, { y: 0.5, x: 0.02, z: 0.4, surface: 'fabric' }),
    box(0.03, 0.4, 0.04, C.dark, { y: 0.9, x: 0.15, z: 0.22, rx: 0.2 }),
  ]), { move: { type: 'walk', speed: 1.4, range: 8 }, value: 0.6 });
  add('pedestrianC', person({ shirt: C.purple, pants: C.gray, hair: '#c9a24a', hat: C.orange }, [
    box(0.1, 0.16, 0.06, C.white, { y: 1.0, x: 0.2, z: 0.15 }),
    box(0.06, 0.2, 0.3, C.orange, { y: 1.0, x: 0.05, z: -0.1, surface: 'fabric' }),
  ]), { move: { type: 'walk', speed: 1.4, range: 8 }, value: 0.6 });

  const pigeonLeg = (side) => {
    const hip = [0.05, 0.17, side * 0.06], o = { side, hip };
    return [articulate(box(0.02, 0.17, 0.02, C.pink, { y: 0.085, x: 0.05, z: side * 0.06 }), 'leg', hip, o),
      articulate(box(0.1, 0.02, 0.05, C.pink, { y: 0.01, x: 0.09, z: side * 0.06 }), 'leg', hip, o)];
  };
  add('pigeon', [
    sphere(0.22, C.pigeon, { y: 0.3, sx: 1.35, sy: 0.9, segments: 9, rings: 6, flat: false, surface: 'fabric', textureStrength: 0.6 }),
    sphere(0.1, '#5f6a85', { y: 0.42, x: 0.16, sx: 1.2, segments: 7, rings: 5, flat: false }),
    sphere(0.115, '#6f7a95', { y: 0.53, x: 0.27, segments: 7, rings: 5, flat: false }),
    cone(0.04, 0.12, C.orange, { y: 0.52, x: 0.4, rz: -PI / 2, segments: 5 }),
    sphere(0.03, C.orange, { y: 0.56, x: 0.34, z: 0.09, segments: 4, rings: 3, flat: false }),
    box(0.34, 0.03, 0.16, C.dark, { y: 0.35, x: -0.14, z: 0.17, rz: 0.15, surface: 'fabric' }),
    box(0.34, 0.03, 0.16, C.dark, { y: 0.35, x: -0.14, z: -0.17, rz: 0.15, surface: 'fabric' }),
    articulate(box(0.3, 0.04, 0.14, '#6a7285', { y: 0.32, x: -0.42, rz: 0.2, surface: 'fabric' }), 'tail', [-0.3, 0.32, 0], { amp: 0.7 }),
    ...pigeonLeg(1), ...pigeonLeg(-1),
    sphere(0.05, '#3aa66a', { y: 0.45, x: 0.14, z: 0.14, segments: 4, rings: 3, flat: false }),
  ], { move: { type: 'walk', speed: 2.4, range: 6 }, value: 0.2 });

  const bikeWheel = (x) => {
    const pivot = [x, 0.43, 0], o = { radius: 0.38, front: x > 0 };
    return [
      torus(0.38, 0.04, C.dark, { y: 0.43, x, radial: 4, segments: 14, surface: 'rubber' }),
      cyl(0.06, 0.06, 0.12, C.chrome, { y: 0.43, x, rx: PI / 2, segments: 6 }),
      box(0.72, 0.02, 0.02, C.lgray, { y: 0.43, x }), box(0.02, 0.72, 0.02, C.lgray, { y: 0.43, x }),
      box(0.51, 0.02, 0.02, C.lgray, { y: 0.43, x, rz: PI / 4 }), box(0.51, 0.02, 0.02, C.lgray, { y: 0.43, x, rz: -PI / 4 }),
    ].map((g) => articulate(g, 'wheel', pivot, o));
  };
  add('bike', [
    ...bikeWheel(0.65), ...bikeWheel(-0.65),
    box(1.0, 0.05, 0.05, C.red, { y: 0.7, x: 0.05, rz: 0.1 }),
    box(0.9, 0.05, 0.05, C.red, { y: 0.48, x: 0.0, rz: 0.36 }),
    box(0.06, 0.5, 0.05, C.red, { y: 0.65, x: -0.5, rz: 0.1 }),
    box(0.06, 0.6, 0.05, C.red, { y: 0.65, x: 0.5, rz: -0.25 }),
    box(0.25, 0.06, 0.16, C.dark, { y: 0.98, x: -0.55, surface: 'rubber' }),
    box(0.05, 0.05, 0.5, C.chrome, { y: 0.98, x: 0.55 }),
    box(0.2, 0.04, 0.04, C.dark, { y: 0.14, x: -0.1, z: 0.12 }),
    box(0.3, 0.18, 0.1, C.orange, { y: 0.82, x: -0.7, surface: 'fabric' }),
  ], { value: 0.5, radius: 0.9 });

  add('bench', [
    ...[0, 1, 2, 3].map((i) => box(1.6, 0.05, 0.11, C.wood, { y: 0.45, z: -0.19 + i * 0.13 })),
    ...[0, 1, 2].map((i) => box(1.6, 0.11, 0.05, C.wood, { y: 0.65 + i * 0.16, z: -0.26 - i * 0.04, rx: -0.15 })),
    ...[-0.7, 0.7].flatMap((x) => [
      box(0.08, 0.45, 0.45, C.iron, { y: 0.22, x }),
      box(0.08, 0.6, 0.06, C.iron, { y: 0.73, x, z: -0.28, rx: -0.15 }),
      box(0.09, 0.06, 0.5, C.iron, { y: 0.6, x }),
    ]),
  ], { value: 0.4 });

  add('streetLamp', [
    lathe([[0.22, 0], [0.2, 0.1], [0.12, 0.35], [0.09, 0.6], [0.075, 3.6]], C.dgreen, { segments: 9 }),
    cyl(0.12, 0.12, 0.08, C.iron, { y: 0.12, segments: 8 }),
    box(1.0, 0.07, 0.07, C.dgreen, { y: 3.7, x: 0.44 }),
    box(0.07, 0.3, 0.07, C.dgreen, { y: 3.55, x: 0.05, rz: 0.5 }),
    rbox(0.5, 0.14, 0.24, C.iron, { y: 3.72, x: 0.95, segments: 1, bevel: 0.05 }),
    box(0.4, 0.05, 0.18, C.lamp, { emissive: 1, y: 3.63, x: 0.95 }),
    box(0.35, 0.06, 0.06, C.dgreen, { y: 2.9, x: 0.15 }),
    box(0.02, 0.55, 0.33, C.blue, { y: 3.2, x: 0.02, ry: 0 }),
  ], { value: 0.4 });

  add('hotdogCart', [
    rbox(1.4, 0.7, 0.8, C.silver, { y: 0.75, segments: 1, bevel: 0.06 }),
    box(1.5, 0.08, 0.9, C.gray, { y: 1.12 }),
    box(1.2, 0.05, 0.05, C.red, { y: 0.9, z: 0.42 }),
    box(0.4, 0.3, 0.05, C.white, { y: 0.7, z: 0.42 }),
    cyl(0.03, 0.03, 1.3, C.dark, { y: 1.75, x: -0.5, segments: 5 }),
    // striped umbrella (interleaved octagonal cones)
    cone(0.85, 0.35, C.red, { y: 2.5, x: -0.5, segments: 8 }),
    cone(0.87, 0.35, C.yellow, { y: 2.5, x: -0.5, segments: 8, ry: PI / 8 }),
    sphere(0.05, C.dark, { y: 2.7, x: -0.5, segments: 5, rings: 3, flat: false }),
    // trays: buns, sausages, bottles
    box(0.9, 0.06, 0.4, C.chrome, { y: 1.2, x: 0.1, z: -0.05 }),
    ...[-0.3, -0.1, 0.1, 0.3].map((x) => capsule(0.04, 0.3, '#c0392b', { y: 1.28, x: 0.1 + x, z: -0.05, rx: PI / 2, segments: 6, caps: 1 })),
    cyl(0.06, 0.06, 0.25, C.red, { y: 1.28, x: 0.6, z: 0.2, segments: 6 }), cyl(0.06, 0.06, 0.25, C.yellow, { y: 1.28, x: 0.5, z: 0.2, segments: 6 }),
    box(0.5, 0.08, 0.08, C.dark, { y: 0.4, x: 0.95 }),
    ...wheel(-0.1, 0.3, 0.45, 0.3, 0.1), ...wheel(-0.1, 0.3, -0.45, 0.3, 0.1),
  ], { value: 0.8 });

  // ---------- Medium
  const foliage = (h, rTop, cols, n) => {
    const p = [
      lathe([[h * 0.11, 0], [h * 0.07, h * 0.1], [h * 0.055, h * 0.4], [h * 0.05, h * 0.55]], C.trunk, { segments: 10 }),
      cyl(0.06, 0.1, h * 0.35, C.trunk, { y: h * 0.5, x: h * 0.1, rz: -0.6, segments: 6 }),
      cyl(0.06, 0.1, h * 0.35, C.trunk, { y: h * 0.5, x: -h * 0.1, z: 0.05, rz: 0.6, segments: 6 }),
    ];
    const spots = [[0, 0.72, 0, 1], [0.7, 0.62, 0.3, 0.72], [-0.7, 0.6, -0.35, 0.72], [0.1, 0.62, -0.75, 0.65], [-0.15, 0.64, 0.8, 0.65], [0.15, 0.92, -0.05, 0.62], [0.85, 0.8, -0.4, 0.5], [-0.8, 0.82, 0.4, 0.5]];
    spots.slice(0, n).forEach(([x, y, z, k], i) => p.push(sphere(rTop * k, cols[i % cols.length], { x: x * rTop, y: h * y, z: z * rTop, segments: 9, rings: 6, surface: 'foliage' })));
    return p;
  };
  add('tree', foliage(4.2, 1.35, [C.dgreen, C.lgreen, C.green], 6), { value: 0.8, sway: 'tree' });
  add('bigTree', foliage(6.8, 2.2, [C.dgreen, C.lgreen, C.green, '#4aa85a'], 8), { value: 1.5, sway: 'tree' });

  const taxi = () => [
    ...car(C.taxi, C.taxi),
    rbox(0.6, 0.2, 0.3, C.white, { emissive: 1.2, y: 1.9, x: -0.25, segments: 1, bevel: 0.05 }),
    box(0.4, 0.08, 0.03, C.dark, { y: 1.9, x: -0.25, z: 0.16 }),
    box(0.4, 0.08, 0.03, C.dark, { y: 1.9, x: -0.25, z: -0.16 }),
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap((i) => [
      box(0.28, 0.1, 0.03, i % 2 ? C.dark : C.taxi, { y: 0.88, x: -1.65 + i * 0.3, z: 0.91 }),
      box(0.28, 0.1, 0.03, i % 2 ? C.dark : C.taxi, { y: 0.88, x: -1.65 + i * 0.3, z: -0.91 }),
    ]),
    box(0.9, 0.22, 0.03, C.white, { y: 0.78, x: 0.9, z: 0.915 }), box(0.9, 0.22, 0.03, C.white, { y: 0.78, x: 0.9, z: -0.915 }),
  ];
  add('taxi', taxi(), { value: 1 });
  add('car', car(C.red, C.red), { value: 1 });
  add('carBlue', car(C.blue, C.white), { value: 1 });
  add('carGreen', car('#3fae6a', '#3fae6a'), { value: 1 });

  add('van', (() => {
    const p = [
      rbox(5.4, 1.5, 2.2, C.white, { y: 1.15, segments: 1, bevel: 0.2 }),
      rbox(1.3, 1.0, 2.1, C.white, { y: 1.55, x: 2.2, segments: 1, bevel: 0.15 }),
      box(0.12, 0.6, 2.0, C.glass, { y: 1.9, x: 2.82 }),
      box(0.9, 0.5, 0.05, C.glass, { y: 1.95, x: 2.2, z: 1.06 }), box(0.9, 0.5, 0.05, C.glass, { y: 1.95, x: 2.2, z: -1.06 }),
      box(4.0, 0.7, 0.05, C.brown, { y: 1.5, x: -0.6, z: 1.12, surface: 'paint' }), box(4.0, 0.7, 0.05, C.brown, { y: 1.5, x: -0.6, z: -1.12, surface: 'paint' }),
      box(3.6, 0.16, 0.05, C.yellow, { y: 1.8, x: -0.6, z: 1.13 }), box(3.6, 0.16, 0.05, C.yellow, { y: 1.8, x: -0.6, z: -1.13 }),
      box(0.05, 1.1, 0.06, C.gray, { y: 1.3, x: -1.6, z: 1.12 }),
      box(0.16, 0.3, 2.2, C.chrome, { y: 0.55, x: 2.85 }), box(0.16, 0.3, 2.2, C.chrome, { y: 0.55, x: -2.8 }),
      box(0.05, 0.16, 0.4, C.lamp, { emissive: 1, y: 0.9, x: 2.84, z: 0.8 }), box(0.05, 0.16, 0.4, C.lamp, { emissive: 1, y: 0.9, x: 2.84, z: -0.8 }),
      box(0.05, 0.3, 0.5, C.red, { y: 1.1, x: -2.72, z: 0.85 }), box(0.05, 0.3, 0.5, C.red, { y: 1.1, x: -2.72, z: -0.85 }),
      box(0.05, 1.2, 0.05, C.dark, { y: 1.2, x: -2.72 }), box(0.05, 0.05, 2.0, C.dark, { y: 1.2, x: -2.73 }),
      box(0.12, 0.1, 0.16, C.white, { y: 1.5, x: 2.4, z: 1.2 }), box(0.12, 0.1, 0.16, C.white, { y: 1.5, x: 2.4, z: -1.2 }),
    ];
    for (const [x, z] of [[1.7, 1.05], [1.7, -1.05], [-1.7, 1.05], [-1.7, -1.05]]) p.push(...wheel(x, 0.45, z, 0.45, 0.4));
    return p;
  })(), { value: 1.6 });

  add('bus', (() => {
    const p = [
      rbox(11, 2.9, 2.8, C.bus, { y: 1.95, segments: 1, bevel: 0.35 }),
      box(11.05, 0.4, 2.84, C.white, { y: 1.05 }),
      box(11.05, 0.1, 2.85, C.yellow, { y: 1.35 }),
      rbox(9.6, 1.0, 2.86, C.glass, { y: 2.65, x: -0.3, segments: 1, bevel: 0.08 }),
      box(0.1, 1.5, 2.4, C.dglass, { y: 2.3, x: 5.52 }),
      box(0.2, 0.5, 2.6, C.yellow, { y: 3.2, x: 5.5 }), box(0.05, 0.3, 1.5, C.dark, { y: 3.2, x: 5.62 }),
      box(1.2, 2.0, 0.06, C.dglass, { y: 1.8, x: 3.3, z: 1.43 }), box(1.2, 2.0, 0.06, C.dglass, { y: 1.8, x: 1.8, z: 1.43 }),
      rbox(11, 0.18, 2.9, C.white, { y: 3.45, segments: 1, bevel: 0.05 }),
      box(0.14, 0.24, 2.9, C.chrome, { y: 0.5, x: 5.55 }), box(0.14, 0.24, 2.9, C.chrome, { y: 0.5, x: -5.55 }),
      box(0.06, 0.2, 0.5, C.lamp, { emissive: 1, y: 0.9, x: 5.52, z: 0.9 }), box(0.06, 0.2, 0.5, C.lamp, { emissive: 1, y: 0.9, x: 5.52, z: -0.9 }),
      box(0.06, 0.25, 0.6, C.red, { y: 1.5, x: -5.52, z: 1.0 }), box(0.06, 0.25, 0.6, C.red, { y: 1.5, x: -5.52, z: -1.0 }),
      box(2.4, 0.5, 0.06, C.white, { y: 1.3, x: -3.5, z: 1.43 }), box(1.8, 0.25, 0.04, C.blue, { y: 1.3, x: -3.5, z: 1.47 }),
      box(1.2, 0.3, 1.0, C.lgray, { y: 3.7, x: -3 }),
    ];
    for (let i = 0; i < 9; i++) p.push(box(0.09, 0.95, 0.05, C.bus, { y: 2.65, x: -4.7 + i * 1.0, z: 1.45 }), box(0.09, 0.95, 0.05, C.bus, { y: 2.65, x: -4.7 + i * 1.0, z: -1.45 }));
    for (const [x, z] of [[3.4, 1.3], [3.4, -1.3], [-3.2, 1.3], [-3.2, -1.3]]) p.push(...wheel(x, 0.6, z, 0.6, 0.5));
    return p;
  })(), { value: 3 });

  add('subway', [
    box(3.4, 0.4, 3.6, C.dstone, { y: 0.2 }),
    // stair well with dark hole, side railings, balusters
    box(2.0, 0.05, 3.0, C.dark, { y: 0.43 }),
    ...[-1.5, 1.5].flatMap((x) => [
      box(0.14, 0.14, 3.2, C.dgreen, { y: 1.35, x }),
      ...[-1.4, -0.7, 0, 0.7, 1.4].map((z) => box(0.06, 0.95, 0.06, C.dgreen, { y: 0.9, x, z })),
      box(0.14, 0.12, 3.2, C.dgreen, { y: 0.55, x }),
    ]),
    box(3.2, 0.14, 0.14, C.dgreen, { y: 1.35, z: -1.55 }),
    ...[-1.2, 0, 1.2].map((x) => box(0.06, 0.95, 0.06, C.dgreen, { y: 0.9, x, z: -1.55 })),
    // lamp posts with green globes + sign
    ...[-1.5, 1.5].flatMap((x) => [
      cyl(0.09, 0.11, 2.4, C.dgreen, { y: 1.6, x, z: 1.6, segments: 7 }),
      sphere(0.27, C.green, { emissive: 1.2, y: 3.0, x, z: 1.6, segments: 9, rings: 6, flat: false }),
      cyl(0.13, 0.13, 0.08, C.dgreen, { y: 2.78, x, z: 1.6, segments: 7 }),
    ]),
    box(2.0, 0.6, 0.08, C.dark, { y: 2.6, z: 1.6 }), box(1.8, 0.4, 0.05, C.white, { y: 2.6, z: 1.65 }),
    cyl(0.16, 0.16, 0.05, C.green, { y: 2.6, x: -0.6, z: 1.69, rx: PI / 2, segments: 10 }),
    box(0.9, 0.16, 0.05, C.green, { y: 2.6, x: 0.3, z: 1.69 }),
  ], { value: 1 });

  add('brownstone', brownstone(C.brownstone, C.dbrown, 3), { value: 1.2, radius: 3.4 });
  add('brownstoneB', brownstone('#b9705a', C.stone, 4), { value: 1.4, radius: 3.4 });

  add('waterTower', [
    ...apartment(7, 7, 12, '#b0674a', { awn: C.red }),
    ...waterTank(-1.4, 12.35, -0.6, 1.25),
  ], { value: 2, radius: 3.8 });

  add('apartment', apartment(9, 9, 20, '#c9a58a', { awn: C.green, tank: true }), { value: 2.5, radius: 4.7 });
  add('apartmentB', apartment(8, 10, 26, '#a7b0bd', { awn: C.blue, mast: 3.5, setback: true }), { value: 3, radius: 5 });

  add('skyscraperA', (() => {
    const G = '#7d8fa3';
    return [
      ...tower(10, 10, 32, G, C.glass, 0, 1.9, { mull: '#a9b8c8' }),
      ...tower(7, 7, 8, G, C.glass, 32.3, 1.9, { mull: '#a9b8c8' }),
      ...roofTop(7, 7, 40.6),
      box(3.6, 0.9, 0.3, C.dark, { y: 1.6, z: 5.2 }), box(3.2, 0.6, 0.06, C.white, { y: 1.6, z: 5.36 }),
      box(4.4, 0.2, 2.0, C.dark, { y: 3.0, z: 5.9 }),
      cyl(0.12, 0.2, 5, C.gray, { y: 43.5, segments: 6 }), sphere(0.2, C.red, { y: 46.2, segments: 6, rings: 4, flat: false }),
    ];
  })(), { value: 8, radius: 5.4 });

  add('skyscraperB', [
    rbox(13, 3, 13, C.dstone, { y: 1.5, segments: 1, bevel: 0.2 }),
    box(3.0, 0.2, 2.2, '#2a3a52', { y: 2.7, z: 7.2 }),
    ...tower(11, 11, 46, '#2f3f5c', '#7ab6d8', 3, 2.0, { mull: '#54688c' }),
    ...tower(6, 6, 3, '#2f3f5c', '#7ab6d8', 49.3, 1.5),
    // pyramid crown with spire
    cone(3.9, 4.4, C.silver, { y: 55, segments: 4, ry: PI / 4 }),
    cone(2.2, 3.4, '#e6e9ee', { y: 55.6, segments: 4, ry: PI / 4 }),
    cyl(0.1, 0.2, 4, C.silver, { y: 59.5, segments: 6 }),
  ], { value: 14, radius: 6.3 });

  add('skyscraperC', [
    ...tower(14, 14, 30, '#c7c1b0', '#8aa6b9', 0, 2.0, { masonry: true, mull: '#e0dbcd' }),
    ...tower(10, 10, 24, '#b8b3a3', '#8aa6b9', 30.3, 2.0, { masonry: true, mull: '#d9d4c5' }),
    ...tower(6, 6, 14, '#a9a495', '#8aa6b9', 54.6, 2.0, { masonry: true, mull: '#cfcabb' }),
    ...roofTop(14, 14, 30.6), ...roofTop(10, 10, 54.9),
    box(5, 2.4, 0.3, C.dark, { y: 1.8, z: 7.2 }), box(4.4, 1.6, 0.06, '#f6e7b0', { y: 1.8, z: 7.4 }),
    ...[-4.2, -1.4, 1.4, 4.2].map((x) => cyl(0.35, 0.35, 3.4, C.dstone, { y: 1.7, x, z: 7.4, segments: 9 })),
    box(12, 0.3, 1.6, C.dstone, { y: 3.6, z: 7.7 }),
    cone(2.6, 4.2, '#b7c0c9', { y: 70.8, segments: 4, ry: PI / 4 }),
    cyl(0.15, 0.3, 8, C.gray, { y: 75, segments: 6 }),
    sphere(0.3, C.red, { y: 79.3, segments: 6, rings: 4, flat: false }),
  ], { value: 20, radius: 6.6 });

  // ---------- Huge landmarks
  add('liberty', (() => {
    const p = [
      // star-shaped fort base + pedestal with steps and cornices
      box(13, 1.6, 13, C.dstone, { y: 0.8 }),
      box(13, 1.6, 13, C.dstone, { y: 0.8, ry: PI / 4, sx: 0.9, sz: 0.9 }),
      box(10.4, 0.5, 10.4, C.stone, { y: 1.85 }),
      box(9, 3.6, 9, C.stone, { y: 3.9 }),
      box(9.6, 0.4, 9.6, C.dstone, { y: 5.9 }),
      box(7.6, 4.6, 7.6, C.stone, { y: 8.4 }),
      box(8.4, 0.5, 8.4, C.dstone, { y: 10.9 }),
      box(6.4, 2.4, 6.4, C.stone, { y: 12.3 }),
      box(6.9, 0.4, 6.9, C.dstone, { y: 13.7 }),
    ];
    for (let i = 0; i < 6; i++) p.push(box(1.0, 3.6, 0.35, C.dstone, { y: 3.9, x: -3.6 + i * 1.44, z: 4.55 }), box(0.9, 0.5, 0.06, C.stone, { y: 3.9, x: -3.6 + i * 1.44, z: 4.75 }));
    p.push(
      // robe: lathe with pleats, belt fold, draped sash
      lathe([[3.0, 13.7], [2.5, 15], [2.1, 18], [1.9, 21], [1.7, 22.6], [1.5, 23.6]], C.copper, { segments: 16 }),
      lathe([[1.7, 21.8], [1.75, 22.6], [1.5, 24.2], [1.05, 24.9]], C.dcopper, { segments: 14 }),
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = (i / 7) * PI * 2;
        return cone(0.35, 7.6, C.dcopper, { x: Math.cos(a) * 2.3, z: Math.sin(a) * 2.3, y: 17.6, rz: -Math.cos(a) * 0.16, rx: Math.sin(a) * 0.16, segments: 6, flat: false });
      }),
      // neck, head, face, hair band, crown of rays
      cyl(0.5, 0.6, 0.8, C.copper, { y: 25.1, segments: 10 }),
      sphere(1.15, C.copper, { y: 26.4, segments: 14, rings: 10 }),
      box(0.5, 0.3, 0.3, C.dcopper, { y: 26.5, x: 1.05 }),
      cyl(1.15, 1.2, 0.35, C.dcopper, { y: 27.3, segments: 14 }),
      // raised right arm holding the torch
      capsule(0.5, 5.6, C.copper, { y: 28.6, x: 1.8, z: 0.3, rz: -0.14, segments: 10, caps: 3 }),
      sphere(0.62, C.copper, { y: 32.2, x: 1.3, z: 0.3, segments: 10, rings: 7 }),
      cyl(0.32, 0.32, 0.8, C.dcopper, { y: 33.1, x: 1.3, z: 0.3, segments: 8 }),
      lathe([[0.3, 33.4], [0.9, 33.9], [0.95, 34.4], [0.7, 34.5]], C.yellow, { x: 1.3, z: 0.3, segments: 12 }),
      cone(0.62, 2.4, C.orange, { y: 36.1, x: 1.3, z: 0.3, segments: 10, flat: false }),
      cone(0.36, 1.8, C.yellow, { y: 36.4, x: 1.3, z: 0.3, segments: 8, flat: false }),
      // left arm with the tablet
      capsule(0.42, 2.6, C.copper, { y: 21.6, x: -2.0, z: 1.1, rx: 0.4, rz: 0.3, segments: 9, caps: 2 }),
      rbox(0.7, 3.3, 2.3, C.dcopper, { y: 21.7, x: -2.3, z: 1.8, rx: 0.15, segments: 1, bevel: 0.08 }),
      box(0.06, 2.9, 1.9, '#7ec6b0', { y: 21.75, x: -2.68, z: 1.8, rx: 0.15 }),
    );
    for (let i = 0; i < 7; i++) {
      const a = -PI * 0.1 + (i / 6) * PI * 1.2;
      p.push(cone(0.16, 1.9, C.copper, { y: 28.0, x: Math.cos(a) * 1.15, z: Math.sin(a) * 1.15 - 0.2, rz: -Math.cos(a) * 0.9, rx: Math.sin(a) * 0.9, segments: 5 }));
    }
    return p;
  })(), { value: 50 });

  add('empire', (() => {
    const W = '#c9c5b8', G = '#7d9db3';
    const p = [
      ...tower(20, 20, 12, W, G, 0, 1.8, { masonry: true, mull: '#ddd9cd' }),
      ...tower(16, 16, 20, W, G, 12.3, 1.8, { masonry: true, mull: '#ddd9cd' }),
      ...tower(12, 12, 18, W, G, 32.6, 1.8, { masonry: true, mull: '#ddd9cd' }),
      ...tower(8, 8, 10, W, G, 50.9, 1.8, { masonry: true, mull: '#ddd9cd' }),
      ...tower(5, 5, 6, '#d6d2c5', G, 61.2, 1.8, { masonry: true, mull: '#e6e2d6' }),
      box(4.4, 0.3, 4.4, '#e6e2d6', { y: 67.5 }),
      lathe([[1.9, 67.6], [1.5, 68.6], [1.3, 70.2], [0.9, 71.6]], C.silver, { segments: 12 }),
      cyl(0.4, 0.8, 3, '#e8ebef', { y: 73, segments: 8 }),
      lathe([[0.4, 74.5], [0.2, 78], [0.08, 84]], C.silver, { segments: 8, flat: false }),
      sphere(0.2, C.red, { y: 84.6, segments: 6, rings: 4, flat: false }),
      // grand entrance canopy and art-deco fins
      box(6, 0.3, 2.2, C.dark, { y: 3.2, z: 11.0 }),
      ...[-2.4, -0.8, 0.8, 2.4].map((x) => box(0.3, 3.2, 0.3, C.dstone, { y: 1.6, x, z: 10.2 })),
      box(5.4, 2.4, 0.2, '#2a3a52', { y: 1.3, z: 10.1 }),
      // lit crown: glowing bands on the upper setbacks and a bright mast beacon
      box(8.2, 0.5, 8.2, '#fff1c4', { emissive: 1.5, y: 56.0 }), box(5.2, 0.4, 5.2, '#ffe08a', { emissive: 1.6, y: 64.6 }),
      box(12.2, 0.4, 12.2, '#fff1c4', { emissive: 1.2, y: 47.0 }), box(2.4, 1.2, 2.4, '#fff7e0', { emissive: 1.8, y: 69.0 }),
    ];
    for (const [w, y0, n] of [[20, 0, 0], [16, 12.3, 0]]) for (const s of [-1, 1]) p.push(box(w + 0.3, 0.4, 0.3, '#e6e2d6', { y: y0 + 11.7 - (y0 ? -7.6 : 0), z: s * (w / 2 + 0.1) }));
    // vertical fins on the shaft
    for (const x of [-4.4, -2.2, 0, 2.2, 4.4]) p.push(box(0.4, 17, 0.35, '#e0dcd0', { x, y: 41, z: 6.15 }));
    return p;
  })(), { value: 90 });

  add('chrysler', (() => {
    const B = '#e4dfd0', G = '#7d9db3';
    const p = [
      ...tower(18, 18, 22, B, G, 0, 1.8, { masonry: true, mull: '#f0ece0' }),
      ...tower(13, 13, 26, B, G, 22.3, 1.8, { masonry: true, mull: '#f0ece0' }),
      ...tower(10, 10, 12, B, G, 48.6, 1.8, { masonry: true, mull: '#f0ece0' }),
      box(5, 0.3, 3, C.dark, { y: 3.4, z: 9.9 }),
      box(4.4, 2.6, 0.2, '#2a3a52', { y: 1.4, z: 9.05 }),
    ];
    // corner eagle gargoyles (stainless)
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      p.push(cone(0.6, 2.4, C.silver, { y: 61.4, x: sx * 5.5, z: sz * 5.5, rz: -sx * 0.9, rx: sz * 0.9, segments: 5 }), sphere(0.4, C.silver, { y: 61.0, x: sx * 5.0, z: sz * 5.0, segments: 6, rings: 4, flat: false }));
    }
    // stainless crown: tapering tiers of stacked arches + sunburst triangles
    const tiers = [[5.4, 60.8, 1.8], [4.5, 62.5, 1.7], [3.7, 64.1, 1.6], [2.9, 65.6, 1.5], [2.1, 67.0, 1.4], [1.4, 68.3, 1.3]];
    tiers.forEach(([r, y, h], i) => {
      p.push(lathe([[r + 0.5, y], [r + 0.15, y + h * 0.6], [r - 0.3, y + h]], C.silver, { segments: 16 }), torus(r + 0.35, 0.14, i % 2 ? '#eef1f6' : C.lgray, { y: y + h, rx: PI / 2, radial: 4, segments: 16 }));
      const n = 8 + (i < 3 ? 4 : 0);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * PI * 2 + i * 0.2, rr = r + 0.28 - 0.1;
        p.push(box(0.3, h * 0.75, 0.06, '#1f2a3d', { y: y + h * 0.5, x: Math.cos(a) * rr, z: Math.sin(a) * rr, ry: -a + PI / 2, rx: 0 }));
      }
    });
    p.push(
      cone(0.9, 3.4, C.silver, { y: 71.5, segments: 8, flat: false }),
      cyl(0.06, 0.13, 8, C.silver, { y: 76.5, segments: 6 }),
    );
    return p;
  })(), { value: 75 });

  // ---------- Times Square: screen-clad buildings, TKTS steps, police booth, street performers
  const SCREEN = ['#ff2a55', '#2a7bff', '#ffd21f', '#22e0c8', '#ff7a1a', '#b04bff', '#39ff7a', '#ffffff'];
  const tsBuilding = (w, d, h, body, pal, seed = 0) => {
    const p = [
      box(w, h, d, body, { y: h / 2, surface: 'stone' }),
      box(w + 0.4, 0.5, d + 0.4, '#9aa0a8', { y: h + 0.25, surface: 'stone' }),
      box(w + 0.3, 1.2, d + 0.3, C.dark, { y: 0.6, surface: 'stone' }),
      // dark panel backing, then the LED screens (emissive) stacked in rows
      box(w - 0.3, h - 3.4, 0.1, C.dark, { y: 3.4 + (h - 3.4) / 2, z: d / 2 + 0.03, surface: 'metal' }),
    ];
    const cols = Math.max(2, Math.round(w / 3)), rows = Math.max(2, Math.floor((h - 4) / 3.1));
    const pw = (w - 0.5) / cols;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const col = pal[(r * 3 + c * 2 + seed) % pal.length];
      const x = -w / 2 + 0.25 + pw * (c + 0.5), y = 4.2 + r * 3.1;
      p.push(box(pw - 0.2, 2.5, 0.12, col, { emissive: 1.6, x, y, z: d / 2 + 0.1, surface: 'paint' }));
      if ((r + c + seed) % 2 === 0) p.push(box((pw - 0.2) * 0.62, 0.3, 0.05, '#ffffff', { emissive: 2, x, y: y + 0.35, z: d / 2 + 0.18 }), box((pw - 0.2) * 0.4, 0.22, 0.05, '#ffffff', { emissive: 2, x, y: y - 0.3, z: d / 2 + 0.18 }));
    }
    // side screens
    for (const s of [-1, 1]) for (let r = 0; r < rows; r += 2) {
      p.push(box(0.12, 2.5, d - 1.6, pal[(r + seed + (s > 0 ? 1 : 3)) % pal.length], { emissive: 1.5, x: s * (w / 2 + 0.07), y: 4.2 + r * 3.1, z: -0.6, surface: 'paint' }));
    }
    // back + side walls: rows of real windows (the screens face the plaza, nothing blank faces the street)
    const wrows = Math.floor((h - 4.4) / 3.1) + 1, bcols = Math.max(2, Math.round(w / 2.4));
    for (let r = 0; r < wrows; r++) {
      const y = 4.4 + r * 3.1;
      for (let c = 0; c < bcols; c++) {
        const x = -w / 2 + 0.8 + ((w - 1.6) * (c + 0.5)) / bcols;
        p.push(box(1.0, 1.4, 0.07, C.dglass, { x, y, z: -d / 2 - 0.03, surface: 'glass' }), box(1.3, 0.1, 0.22, C.stone, { x, y: y - 0.75, z: -d / 2 - 0.1, surface: 'stone' }));
      }
      for (const s of [-1, 1]) for (const z of [-d * 0.32, d * 0.28]) p.push(box(0.07, 1.3, 0.9, C.dglass, { x: s * (w / 2 + 0.03), y: y + 0.1, z, surface: 'glass' }));
    }
    p.push(
      box(w * 0.7, 1.8, 0.1, pal[(seed + 4) % pal.length], { emissive: 1.5, y: h - 2.4, z: -d / 2 - 0.1, surface: 'paint' }),
      box(w * 0.4, 0.3, 0.05, '#ffffff', { emissive: 2, y: h - 2.4, z: -d / 2 - 0.17 }),
      box(1.6, 2.2, 0.1, C.dark, { y: 1.1, x: -w * 0.25, z: -d / 2 - 0.12, surface: 'metal' }),
      box(w - 0.6, 0.18, 0.5, C.dark, { y: 3.0, z: -d / 2 - 0.25, surface: 'metal' }),
    );
    // lit marquee + shop windows on the ground floor
    p.push(
      box(w - 0.6, 1.0, 0.2, '#fff2a8', { emissive: 1.4, y: 2.1, z: d / 2 + 0.15 }),
      ...[-0.3, 0.3].map((k) => box(w * 0.4, 1.0, 0.06, C.dglass, { y: 0.9, x: k * w, z: d / 2 + 0.17, surface: 'glass' })),
    );
    // roof clutter (AC, bulkhead, vents, antenna) + a water tank on some
    p.push(...roofTop(w, d, h + 0.5, { mast: 2.5 + (seed % 3) }));
    if (seed % 2 === 1) p.push(...waterTank(-w * 0.2, h + 0.5, -d * 0.22, 0.8));
    // giant roof billboard on struts: lit screen toward the plaza, truss + a second lit ad on the back
    const bz = d / 2 - 0.3;
    p.push(
      box(0.2, 2.4, 0.2, C.dgray, { y: h + 1.7, x: -w * 0.3, z: bz, surface: 'metal' }), box(0.2, 2.4, 0.2, C.dgray, { y: h + 1.7, x: w * 0.3, z: bz, surface: 'metal' }),
      box(w * 0.86, 2.6, 0.25, C.dark, { y: h + 2.9, z: bz, surface: 'metal' }),
      box(w * 0.8, 2.3, 0.12, pal[seed % pal.length], { emissive: 1.8, y: h + 2.9, z: bz + 0.15, surface: 'paint' }),
      box(w * 0.5, 0.5, 0.05, '#ffffff', { emissive: 2, y: h + 2.9, z: bz + 0.22 }),
      box(w * 0.8, 2.3, 0.1, pal[(seed + 5) % pal.length], { emissive: 1.4, y: h + 2.9, z: bz - 0.17, surface: 'paint' }),
      box(w * 0.45, 0.4, 0.05, '#ffffff', { emissive: 1.8, y: h + 3.4, z: bz - 0.24 }), box(w * 0.3, 0.3, 0.05, '#ffd21f', { emissive: 1.8, y: h + 2.4, z: bz - 0.24 }),
      box(w * 0.86, 0.12, 0.12, C.dgray, { y: h + 4.25, z: bz, surface: 'metal' }),
      ...[-0.4, 0, 0.4].map((k) => box(0.1, 1.0, 0.1, C.dgray, { y: h + 0.9, x: k * w, z: bz - 0.5, rx: 0.5, surface: 'metal' })),
    );
    return p;
  };
  add('tsBldA', tsBuilding(8, 7, 26, '#58606c', SCREEN, 0), { value: 3.5, radius: 4.2 });
  add('tsBldB', tsBuilding(9, 7, 32, '#6a6258', SCREEN, 3), { value: 4, radius: 4.6 });
  add('tsBldC', tsBuilding(10, 7, 20, '#4e5a68', SCREEN, 5), { value: 3.4, radius: 5 });
  add('tsBldD', tsBuilding(10, 7, 12, '#5d5a66', SCREEN, 2), { value: 2.6, radius: 5 });
  add('tsBldE', tsBuilding(8, 7, 10, '#665e58', SCREEN, 6), { value: 2.2, radius: 4.2 });

  // free-standing scaffold billboard
  add('tsBillboard', [
    box(5, 0.4, 2.4, C.dgray, { y: 0.2, surface: 'metal' }),
    ...[-2, 2].map((x) => box(0.3, 6, 0.3, C.dgray, { y: 3.3, x, z: 0, surface: 'metal' })),
    box(6, 4, 0.3, C.dark, { y: 8, surface: 'metal' }), box(5.6, 3.6, 0.15, '#ff2a55', { emissive: 1.7, y: 8, z: 0.2, surface: 'paint' }),
    box(3.6, 0.9, 0.05, '#ffffff', { emissive: 2, y: 8.7, z: 0.3 }), box(2.4, 0.5, 0.05, '#ffd21f', { emissive: 2, y: 7.4, z: 0.3 }),
    box(6, 2, 0.3, C.dark, { y: 5.3, surface: 'metal' }), box(5.6, 1.7, 0.15, '#2a7bff', { emissive: 1.7, y: 5.3, z: 0.2, surface: 'paint' }),
    // back faces carry ads too
    box(5.6, 3.6, 0.1, '#22e0c8', { emissive: 1.5, y: 8, z: -0.2, surface: 'paint' }), box(3.4, 0.8, 0.05, '#ffffff', { emissive: 2, y: 8, z: -0.27 }),
    box(5.6, 1.7, 0.1, '#ffd21f', { emissive: 1.5, y: 5.3, z: -0.2, surface: 'paint' }),
  ], { value: 2, radius: 3 });

  // low plaza-edge shop (front +Z, lit sign + awning toward the plaza; brick back with windows + rooftop clutter + back-lit ad)
  add('tsShop', (() => {
    const w = 7.5, d = 3.4, h = 3.2;
    const p = [
      box(w, h, d, '#7a6a60', { y: h / 2, surface: 'brick' }),
      box(w + 0.3, 0.3, d + 0.3, C.dstone, { y: h + 0.15, surface: 'stone' }),
      box(w + 0.2, 0.7, d + 0.2, C.dark, { y: 0.35, surface: 'stone' }),
      // front: shopfront glass, lit sign band, striped awning, neon strip
      box(w - 0.8, 1.5, 0.08, C.dglass, { y: 1.5, z: d / 2 + 0.03, surface: 'glass' }),
      box(w - 0.4, 0.8, 0.2, '#fff2a8', { emissive: 1.4, y: h - 0.55, z: d / 2 + 0.12 }),
      box(w - 0.4, 0.14, 0.7, C.red, { y: 2.45, z: d / 2 + 0.4, rx: 0.35, surface: 'fabric' }),
      box(w * 0.5, 0.2, 0.05, '#ff2a55', { emissive: 2, y: 0.95, z: d / 2 + 0.1 }),
      // back: windows, door, lit ad, canopy
      box(1.5, 2.1, 0.1, C.dark, { y: 1.05, x: -w * 0.25, z: -d / 2 - 0.05, surface: 'metal' }),
      box(w * 0.6, 1.1, 0.1, '#2a7bff', { emissive: 1.4, y: 2.4, x: w * 0.12, z: -d / 2 - 0.08, surface: 'paint' }),
      box(w * 0.3, 0.22, 0.05, '#ffffff', { emissive: 2, y: 2.4, x: w * 0.12, z: -d / 2 - 0.15 }),
      ...[0.1, 0.35].map((k) => box(1.2, 0.8, 0.07, C.dglass, { y: 1.3, x: w * k + 0.5, z: -d / 2 - 0.03, surface: 'glass' })),
      ...roofTop(w, d, h + 0.3, { mast: 1.5 }),
      // low rooftop sign facing the plaza, ad on its back
      box(0.14, 1.2, 0.14, C.dgray, { y: h + 0.9, x: -w * 0.35, z: d / 2 - 0.3, surface: 'metal' }), box(0.14, 1.2, 0.14, C.dgray, { y: h + 0.9, x: w * 0.35, z: d / 2 - 0.3, surface: 'metal' }),
      box(w * 0.8, 1.1, 0.16, C.dark, { y: h + 1.7, z: d / 2 - 0.3, surface: 'metal' }),
      box(w * 0.74, 0.9, 0.08, '#ffd21f', { emissive: 1.8, y: h + 1.7, z: d / 2 - 0.2, surface: 'paint' }),
      box(w * 0.74, 0.9, 0.08, '#b04bff', { emissive: 1.5, y: h + 1.7, z: d / 2 - 0.4, surface: 'paint' }),
    ];
    for (const s of [-1, 1]) p.push(box(0.06, 1.1, 1.2, C.dglass, { y: 1.8, x: s * (w / 2 + 0.03), z: 0, surface: 'glass' }));
    return p;
  })(), { value: 1.4, radius: 3.6 });

  // red TKTS-style glass steps (rise toward -Z, front faces +Z) with a small booth
  add('tktsSteps', (() => {
    const p = [box(7.4, 0.3, 5.2, C.dstone, { y: 0.15, surface: 'stone' })];
    for (let i = 0; i < 6; i++) p.push(
      box(7, 0.45, 0.9, '#d8182e', { emissive: 0.8, y: 0.45 + i * 0.45, z: 1.8 - i * 0.8, surface: 'paint' }),
      box(7, 0.06, 0.92, '#ff6b7c', { emissive: 1.2, y: 0.7 + i * 0.45, z: 1.8 - i * 0.8 }),
    );
    p.push(
      box(0.3, 3, 4.6, '#b0132a', { y: 1.5, x: -3.7, z: -0.2, surface: 'paint' }), box(0.3, 3, 4.6, '#b0132a', { y: 1.5, x: 3.7, z: -0.2, surface: 'paint' }),
      box(2.4, 1.6, 1.3, C.dark, { y: 0.95, z: 2.4, surface: 'metal' }), box(2.0, 0.5, 0.06, '#ffd21f', { emissive: 1.6, y: 1.6, z: 3.07 }), box(1.8, 0.7, 0.06, C.dglass, { y: 0.9, z: 3.07, surface: 'glass' }),
    );
    return p;
  })(), { value: 2.5, radius: 3.8 });

  add('policeBooth', [
    box(1.5, 0.3, 1.5, C.dark, { y: 0.15, surface: 'metal' }),
    box(1.3, 2.0, 1.3, '#25479a', { y: 1.3, surface: 'paint' }), box(1.34, 0.35, 1.34, C.white, { y: 1.1, surface: 'paint' }),
    ...[[0, 0.68], [0, -0.68]].map(([x, z]) => box(1.0, 0.8, 0.06, C.dglass, { y: 1.8, x, z, surface: 'glass' })),
    box(1.5, 0.2, 1.5, C.dark, { y: 2.4, surface: 'metal' }),
    box(0.3, 0.2, 0.3, '#ff2a2a', { emissive: 1.5, y: 2.62, x: -0.25 }), box(0.3, 0.2, 0.3, '#2a6bff', { emissive: 1.5, y: 2.62, x: 0.25 }),
  ], { value: 0.8, radius: 0.95 });

  const performer = (name, o, extra) => add(name, person(o, extra), { move: { type: 'walk', speed: 0.9, range: 3.5 }, value: 0.7 });
  performer('performerRed', { shirt: '#e2332b', pants: '#e2332b', hair: '#e2332b', skin: '#e2332b' }, [
    sphere(0.36, '#e2332b', { y: 1.5, x: -0.02, segments: 9, rings: 6, flat: false, surface: 'fabric' }),
    sphere(0.09, C.white, { y: 1.55, x: 0.3, z: 0.13, segments: 6, rings: 4, flat: false }), sphere(0.09, C.white, { y: 1.55, x: 0.3, z: -0.13, segments: 6, rings: 4, flat: false }),
    sphere(0.08, C.orange, { y: 1.42, x: 0.36, segments: 6, rings: 4, flat: false }),
  ]);
  performer('performerStatue', { shirt: '#7fc6a8', pants: '#7fc6a8', hair: '#6fb59a', skin: '#8fd0b4' }, [
    cone(0.2, 0.3, '#6fb59a', { y: 1.78, segments: 7 }),
    cyl(0.04, 0.04, 0.6, '#6fb59a', { y: 1.5, x: 0.18, z: 0.3, segments: 5 }), cone(0.09, 0.3, C.yellow, { emissive: 1, y: 1.92, x: 0.18, z: 0.3, segments: 6 }),
    box(0.35, 0.5, 0.1, '#6fb59a', { y: 1.0, x: 0.1, z: -0.3 }),
  ]);
  performer('performerGuitar', { shirt: '#8a4b2e', pants: '#2b2b30', hair: '#3a2a1a', hat: '#2b2b30' }, [
    rbox(0.4, 0.45, 0.1, '#c9803a', { y: 0.85, x: 0.18, z: 0.12, rz: 0.4, segments: 1, bevel: 0.05, surface: 'wood' }),
    box(0.7, 0.05, 0.05, '#3a2a1a', { y: 1.15, x: 0.5, z: 0.12, rz: 0.4 }),
  ]);
  performer('performerBlue', { shirt: '#2a7bff', pants: '#2a7bff', hair: '#2a7bff', skin: '#2a7bff' }, [
    sphere(0.36, '#2a7bff', { y: 1.5, x: -0.02, segments: 9, rings: 6, flat: false, surface: 'fabric' }),
    sphere(0.1, C.white, { y: 1.57, x: 0.3, z: 0.13, segments: 6, rings: 4, flat: false }), sphere(0.1, C.white, { y: 1.57, x: 0.3, z: -0.13, segments: 6, rings: 4, flat: false }),
    sphere(0.2, '#9fc8ff', { y: 0.85, x: 0.18, sy: 1.2, segments: 7, rings: 5, flat: false }),
  ]);

  // ---------- orderly street furniture
  add('hedge', [
    rbox(1.6, 0.8, 0.7, '#2f7a3a', { y: 0.4, segments: 2, bevel: 0.2, surface: 'foliage', textureStrength: 0.8 }),
    sphere(0.3, '#3b9a47', { y: 0.82, x: -0.4, segments: 6, rings: 4, flat: false, surface: 'foliage' }),
    sphere(0.26, '#3b9a47', { y: 0.84, x: 0.35, segments: 6, rings: 4, flat: false, surface: 'foliage' }),
  ], { value: 0.25 });
  add('ironFence', [
    box(1.8, 0.08, 0.08, C.iron, { y: 0.15, surface: 'metal' }), box(1.8, 0.08, 0.08, C.iron, { y: 1.0, surface: 'metal' }),
    ...[-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8].flatMap((x) => [box(0.04, 1.2, 0.04, C.iron, { y: 0.6, x, surface: 'metal' }), cone(0.04, 0.12, C.iron, { y: 1.26, x, segments: 4 })]),
    box(0.12, 1.3, 0.12, C.iron, { y: 0.65, x: -0.9, surface: 'metal' }), box(0.12, 1.3, 0.12, C.iron, { y: 0.65, x: 0.9, surface: 'metal' }),
  ], { value: 0.2, radius: 0.95 });
  add('bollard', [
    cyl(0.1, 0.12, 0.8, C.iron, { y: 0.4, segments: 8, surface: 'metal' }), sphere(0.11, C.iron, { y: 0.82, segments: 6, rings: 4, flat: false, surface: 'metal' }),
    box(0.22, 0.06, 0.22, C.silver, { y: 0.62, surface: 'metal' }),
  ], { value: 0.15 });
  add('planter', [
    rbox(1.2, 0.6, 0.6, '#8a8478', { y: 0.3, segments: 1, bevel: 0.05, surface: 'stone' }),
    sphere(0.42, '#3b9a47', { y: 0.95, x: -0.25, segments: 7, rings: 5, flat: false, surface: 'foliage' }), sphere(0.38, '#4cb056', { y: 0.92, x: 0.3, segments: 7, rings: 5, flat: false, surface: 'foliage' }),
    ...[[-0.3, 1.25], [0.2, 1.2], [0.4, 1.1]].map(([x, y], i) => sphere(0.09, [C.pink, C.yellow, C.white][i], { x, y, z: 0.1, segments: 5, rings: 3, flat: false })),
  ], { value: 0.3 });

  // ---------- harbour: ferry
  add('ferry', (() => {
    const L = 9.5, W = 3.2;
    return [
      rbox(L, 1.1, W, '#f4f4f4', { y: 0.7, segments: 1, bevel: 0.35, surface: 'paint' }),
      box(L * 0.98, 0.25, W * 1.02, '#2f6fd0', { y: 0.55, surface: 'paint' }),
      box(L - 0.6, 0.12, W - 0.3, C.wood, { y: 1.3, surface: 'wood' }),
      rbox(L * 0.62, 1.3, W * 0.8, '#f4f4f4', { y: 2.0, x: -0.4, segments: 1, bevel: 0.15, surface: 'paint' }),
      box(L * 0.6, 0.5, W * 0.82, C.dglass, { y: 2.1, x: -0.4, surface: 'glass' }),
      box(L * 0.64, 0.12, W * 0.86, '#2f6fd0', { y: 2.72, x: -0.4, surface: 'paint' }),
      cyl(0.32, 0.4, 1.2, '#f28c28', { y: 3.3, x: -1.2, segments: 8, surface: 'paint' }), cyl(0.34, 0.34, 0.2, C.dark, { y: 3.95, x: -1.2, segments: 8 }),
      box(0.12, 1.0, 0.12, C.gray, { y: 3.3, x: 1.2, surface: 'metal' }), box(0.5, 0.3, 0.04, C.red, { y: 3.65, x: 1.4 }),
      ...[-1, 1].flatMap((s) => [cyl(0.2, 0.2, 0.08, C.orange, { y: 1.5, x: 2.4, z: s * (W / 2 - 0.05), rx: PI / 2, segments: 8 })]),
      box(0.05, 0.9, W, C.gray, { y: 1.8, x: L / 2 - 0.5, surface: 'metal' }),
    ];
  })(), { value: 5, radius: 4.8 });
  add('pierPost', [
    cyl(0.18, 0.2, 1.0, C.wood, { y: 0.5, segments: 7, surface: 'wood' }), cyl(0.22, 0.22, 0.06, C.iron, { y: 1.0, segments: 7, surface: 'metal' }),
  ], { value: 0.15 });

  return P;
}
