// Paris object prototypes. Vehicles are length-along-X, front toward +X. Buildings face +Z.
import { box, rbox, cyl, cone, sphere, torus, capsule, lathe, extrude, makeProto, articulate } from './build.js';
import { facadeWall } from './ModelDetails.js';
import { applyModelFinishes } from './ModelFinishes.js';
import { TEXTURE_LAYERS } from './TextureLibrary.js';

const C = {
  cream: '#efe3c6', stone: '#e3d6b4', dstone: '#c4b28a', roof: '#7f8892', droof: '#5a636e', white: '#f6f4ee',
  dark: '#2b2b2e', gray: '#8d949b', lgray: '#c3c8cc', chrome: '#dfe3e8', red: '#d9382b', blue: '#2f6fc4', navy: '#26356b',
  yellow: '#ffd21f', green: '#4aa552', lgreen: '#78c467', dgreen: '#2f7a3a', pink: '#f28fb1', brown: '#8a5a2b',
  dbrown: '#5e3d20', wood: '#c99a5b', skin: '#f1c8a0', tire: '#1f1f22', glass: '#a9dcf2', dglass: '#6fa7c4',
  gold: '#e2b23c', tan: '#e0a458', bronze: '#8f5f2c', purple: '#8e6bbf', orange: '#f28c28', teal: '#2aa198',
  black: '#151517', iron: '#22302c', brick: '#b8694a', lamp: '#fff2a8', water: '#7ccaf0',
};
const FALLBACK = { croissant: ['fabric', 0.5], baguetteBasket: ['wood', 0.5], tourist: ['fabric', 0.4], tourist2: ['fabric', 0.4], mime: ['fabric', 0.4], cathedral: ['stone', 0.6], arc: ['stone', 0.6], eiffel: ['metal', 0.6], fountain: ['stone', 0.6] };
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
const S8 = { segments: 8, rings: 5, flat: false }; // small smooth-ish sphere

/** Rotate about Y then translate a list of parts (build a piece facing +X / +Z once, reuse it anywhere). */
const at = (parts, x = 0, y = 0, z = 0, ry = 0) => parts.map((g) => { const c = g.clone(); return (ry ? c.rotateY(ry) : c).translate(x, y, z); });

const wheel = (x, y, z, r, w = 0.3) => {
  const pivot = [x, y, z], opts = { side: z >= 0 ? 1 : -1, radius: r, front: x > 0 };
  const parts = [
    cyl(r, r, w, C.tire, { x, y, z, rx: PI / 2, segments: 16, flat: false, surface: 'rubber' }),
    cyl(r * 0.6, r * 0.6, w + 0.04, C.lgray, { x, y, z, rx: PI / 2, segments: 12, flat: false, surface: 'metal' }),
  ];
  for (let i = 0; i < 6; i++) {
    const a = i * PI / 3;
    parts.push(box(r * 0.68, 0.035, w + 0.055, C.chrome, { x: x + Math.cos(a) * r * 0.29, y: y + Math.sin(a) * r * 0.29, z, rz: a, surface: 'metal' }));
  }
  return parts.map((g) => articulate(g, 'wheel', pivot, opts));
};

const person = (o, extra = []) => {
  const { shirt, pants, hair, skin = C.skin, shoes = C.dark, dress } = o;
  const hipL = [0, 0.55, 0.09], hipR = [0, 0.55, -0.09];
  const kneeL = [0, 0.28, 0.09], kneeR = [0, 0.28, -0.09];
  const p = [
    articulate(cyl(0.085, 0.075, 0.27, dress || pants, { y: 0.415, z: 0.09, segments: 8, flat: false, surface: 'fabric' }), 'leg', hipL, { side: 1, hip: hipL }),
    articulate(cyl(0.085, 0.075, 0.27, dress || pants, { y: 0.415, z: -0.09, segments: 8, flat: false, surface: 'fabric' }), 'leg', hipR, { side: -1, hip: hipR }),
    articulate(cyl(0.075, 0.062, 0.28, dress || pants, { y: 0.14, z: 0.09, segments: 8, flat: false, surface: 'fabric' }), 'shin', kneeL, { side: 1, hip: hipL }),
    articulate(cyl(0.075, 0.062, 0.28, dress || pants, { y: 0.14, z: -0.09, segments: 8, flat: false, surface: 'fabric' }), 'shin', kneeR, { side: -1, hip: hipR }),
    articulate(sphere(0.075, dress || pants, { y: 0.28, z: 0.09, segments: 8, rings: 5, surface: 'fabric' }), 'leg', hipL, { side: 1 }),
    articulate(sphere(0.075, dress || pants, { y: 0.28, z: -0.09, segments: 8, rings: 5, surface: 'fabric' }), 'leg', hipR, { side: -1 }),
    articulate(box(0.28, 0.1, 0.16, shoes, { y: 0.05, x: 0.05, z: 0.09, surface: 'rubber' }), 'shin', kneeL, { side: 1, hip: hipL }),
    articulate(box(0.28, 0.1, 0.16, shoes, { y: 0.05, x: 0.05, z: -0.09, surface: 'rubber' }), 'shin', kneeR, { side: -1, hip: hipR }),
    cyl(0.2, 0.22, 0.62, shirt, { y: 0.83, segments: 12, flat: false, surface: 'fabric' }),
    articulate(cyl(0.06, 0.055, 0.5, shirt, { y: 0.8, z: 0.29, segments: 8, flat: false, surface: 'fabric' }), 'arm', [0, 1.05, 0.29], { side: 1 }),
    articulate(cyl(0.06, 0.055, 0.5, shirt, { y: 0.8, z: -0.29, segments: 8, flat: false, surface: 'fabric' }), 'arm', [0, 1.05, -0.29], { side: -1 }),
    articulate(sphere(0.055, skin, { y: 0.52, z: 0.29, segments: 8, rings: 5, flat: false }), 'arm', [0, 1.05, 0.29], { side: 1 }),
    articulate(sphere(0.055, skin, { y: 0.52, z: -0.29, segments: 8, rings: 5, flat: false }), 'arm', [0, 1.05, -0.29], { side: -1 }),
    cyl(0.075, 0.08, 0.14, skin, { y: 1.15, segments: 10, flat: false }),
    rbox(0.16, 0.07, 0.34, C.white, { y: 1.14, segments: 2, surface: 'fabric' }),
    sphere(0.17, skin, { y: 1.36, segments: 12, rings: 8, flat: false }),
    sphere(0.185, hair, { y: 1.41, x: -0.02, sy: 0.8, segments: 12, rings: 8, flat: false }),
    sphere(0.027, skin, { y: 1.35, z: 0.155, segments: 8, rings: 5, flat: false }),
    sphere(0.027, skin, { y: 1.35, z: -0.155, segments: 8, rings: 5, flat: false }),
    box(0.05, 0.05, 0.05, skin, { y: 1.34, x: 0.17 }),
    box(0.03, 0.04, 0.04, C.dark, { y: 1.4, x: 0.155, z: 0.07 }),
    box(0.03, 0.04, 0.04, C.dark, { y: 1.4, x: 0.155, z: -0.07 }),
  ];
  if (dress) p.push(cyl(0.2, 0.34, 0.5, dress, { y: 0.55, segments: 10, surface: 'fabric' }));
  return [...p, ...extra];
};

/** Passenger car, length along X. */
const car = (body, len, roof = body, o = {}) => {
  const W = o.w ?? 1.7, L = len;
  const cx = -L * 0.06;
  const p = [
    rbox(L, 0.62, W, body, { y: 0.66, segments: 3, bevel: 0.2, surface: 'paint' }),
    rbox(L * 0.52, 0.56, W * 0.88, C.glass, { y: 1.24, x: cx, segments: 2, bevel: 0.14, surface: 'glass' }),
    rbox(L * 0.5, 0.1, W * 0.9, roof, { y: 1.58, x: cx, segments: 1, bevel: 0.05, surface: 'paint' }),
    // pillars + door seams
    ...[1, -1].flatMap((s) => [
      box(0.08, 0.56, 0.06, roof, { y: 1.24, x: cx + L * 0.26, z: s * W * 0.43 }),
      box(0.08, 0.56, 0.06, roof, { y: 1.24, x: cx - L * 0.26, z: s * W * 0.43 }),
      box(0.06, 0.56, 0.06, roof, { y: 1.24, x: cx, z: s * (W * 0.44 + 0.01) }),
      box(0.03, 0.4, 0.03, C.dark, { y: 0.78, x: cx - L * 0.04, z: s * (W / 2 + 0.005) }),
      box(0.14, 0.05, 0.04, C.chrome, { y: 0.9, x: cx + L * 0.07, z: s * (W / 2 + 0.01) }),
      box(0.12, 0.09, 0.14, body, { y: 1.12, x: cx + L * 0.24, z: s * (W / 2 + 0.1) }),
      sphere(0.13, C.lamp, { emissive: 1, y: 0.8, x: L / 2 - 0.05, z: s * W * 0.32, ...S8 }),
      box(0.05, 0.13, 0.3, C.red, { y: 0.82, x: -L / 2 - 0.005, z: s * W * 0.34 }),
    ]),
    box(0.14, 0.16, W * 1.04, C.chrome, { y: 0.4, x: L / 2 + 0.03 }),
    box(0.14, 0.16, W * 1.04, C.chrome, { y: 0.4, x: -L / 2 - 0.03 }),
    box(0.05, 0.2, 0.6, C.dark, { y: 0.68, x: L / 2 + 0.01 }),
    box(0.03, 0.12, 0.3, C.white, { y: 0.56, x: -L / 2 - 0.1 }),
    ...wheel(L * 0.3, 0.38, W / 2 - 0.06, 0.38, 0.28), ...wheel(L * 0.3, 0.38, -W / 2 + 0.06, 0.38, 0.28),
    ...wheel(-L * 0.3, 0.38, W / 2 - 0.06, 0.38, 0.28), ...wheel(-L * 0.3, 0.38, -W / 2 + 0.06, 0.38, 0.28),
  ];
  return p;
};

/** Leafy tree: flared trunk, branches, 6-7 overlapping foliage blobs in three greens. */
const leafy = (h, c1, c2, c3) => {
  const r = h * 0.38;
  return [
    lathe([[h * 0.09, 0], [h * 0.055, h * 0.1], [h * 0.045, h * 0.35], [h * 0.04, h * 0.55]], C.dbrown, { segments: 10, surface: 'wood' }),
    cyl(0.05, 0.08, h * 0.35, C.dbrown, { y: h * 0.5, x: h * 0.1, rz: -0.6, segments: 6, surface: 'wood' }),
    cyl(0.05, 0.08, h * 0.35, C.dbrown, { y: h * 0.5, x: -h * 0.1, z: 0.05, rz: 0.6, segments: 6, surface: 'wood' }),
    sphere(r, c1, { y: h * 0.68, sy: 0.92, segments: 9, rings: 6, surface: 'foliage' }),
    sphere(r * 0.72, c2, { y: h * 0.62, x: r * 0.7, z: r * 0.3, segments: 9, rings: 6, surface: 'foliage' }),
    sphere(r * 0.7, c2, { y: h * 0.6, x: -r * 0.7, z: -r * 0.3, segments: 9, rings: 6, surface: 'foliage' }),
    sphere(r * 0.65, c1, { y: h * 0.62, x: r * 0.1, z: -r * 0.75, segments: 9, rings: 6, surface: 'foliage' }),
    sphere(r * 0.6, c2, { y: h * 0.62, x: -r * 0.1, z: r * 0.8, segments: 9, rings: 6, surface: 'foliage' }),
    sphere(r * 0.6, c3, { y: h * 0.9, x: r * 0.15, z: -r * 0.1, segments: 9, rings: 6, surface: 'foliage' }),
  ];
};

/** Recessed French window (facing +Z, wall face at z=0): glass set back inside a cut opening, sill, lintel, shutters. */
const fwindow = (x, y, ww = 0.8, wh = 1.15, shut = false, detail = true) => {
  const p = [
    box(ww, wh, 0.03, C.dglass, { x, y, z: -0.16, surface: 'glass' }),
    box(ww + 0.34, 0.09, 0.26, C.dstone, { x, y: y - wh / 2 - 0.05, z: 0.05, surface: 'stone' }),
  ];
  if (detail) {
    p.push(
      box(0.05, wh, 0.05, C.white, { x, y, z: -0.13, surface: 'paint' }),
      box(ww, 0.05, 0.05, C.white, { x, y: y + wh * 0.12, z: -0.13, surface: 'paint' }),
      box(ww + 0.3, 0.12, 0.14, C.dstone, { x, y: y + wh / 2 + 0.08, z: 0.02, surface: 'stone' }),
    );
  }
  if (shut) p.push(box(0.26, wh + 0.1, 0.05, '#7b9ea6', { x: x - ww / 2 - 0.26, y, z: 0.03, surface: 'wood' }), box(0.26, wh + 0.1, 0.05, '#7b9ea6', { x: x + ww / 2 + 0.26, y, z: 0.03, surface: 'wood' }));
  return p;
};
const hole = (x, y, width, height) => ({ x, y, width, height });

/** Wrought-iron balcony (facing +Z at z=0): slab, rails, balusters. */
const balcony = (x, y, len) => {
  const p = [
    box(len, 0.1, 0.5, C.dstone, { x, y, z: 0.25, surface: 'stone' }),
    box(len, 0.06, 0.06, C.iron, { x, y: y + 0.55, z: 0.48, surface: 'metal' }),
    box(len, 0.04, 0.04, C.iron, { x, y: y + 0.12, z: 0.48, surface: 'metal' }),
    box(0.06, 0.55, 0.5, C.iron, { x: x - len / 2, y: y + 0.28, z: 0.25, surface: 'metal' }),
    box(0.06, 0.55, 0.5, C.iron, { x: x + len / 2, y: y + 0.28, z: 0.25, surface: 'metal' }),
  ];
  const n = Math.max(3, Math.floor(len / 0.5));
  for (let i = 0; i <= n; i++) p.push(box(0.03, 0.45, 0.03, C.iron, { x: x - len / 2 + (len * i) / n, y: y + 0.32, z: 0.48, surface: 'metal' }));
  return p;
};

/** Haussmann apartment block: rusticated ground floor, French windows, iron balconies, cornice, mansard + dormers. */
const haussmann = (w, d, floors, wall, o = {}) => {
  const fh = 1.7, H = floors * fh, t = 0.3;
  // Facade walls get real openings (see facade() below); the core sits behind them.
  const nx = Math.max(2, Math.round(w / 2.6)), ns = Math.max(2, Math.round(d / 3));
  const fo = [], bo = [], so = [];
  for (let fl = 1; fl < floors; fl++) {
    const y = fl * fh + fh * 0.55, wh = fl === 1 || fl === floors - 2 ? 1.3 : 1.1;
    for (let i = 0; i < nx; i++) { const x = -w / 2 + (w * (i + 0.5)) / nx; fo.push(hole(x, y, 0.78, wh)); bo.push(hole(x, y, 0.78, wh)); }
    for (let i = 0; i < ns; i++) so.push(hole(-d / 2 + (d * (i + 0.5)) / ns, y, 0.7, 1.0));
  }
  const p = [
    box(w - 2 * t + 0.1, H, d - 2 * t + 0.1, wall, { y: H / 2, surface: 'stucco' }),
    ...facadeWall(w, H, t, wall, fo, { z: d / 2 - t / 2, surface: 'stucco' }),
    ...facadeWall(w, H, t, wall, bo, { z: -(d / 2 - t / 2), ry: PI, surface: 'stucco' }),
    ...[1, -1].flatMap((sgn) => facadeWall(d - 2 * t, H, t, wall, so, { x: sgn * (w / 2 - t / 2), ry: sgn * PI / 2, surface: 'stucco' })),
    box(w + 0.12, fh, d + 0.12, C.dstone, { y: fh / 2, surface: 'stone' }),
    box(w + 0.3, 0.1, d + 0.3, C.stone, { y: 0.05, surface: 'stone' }),
    // corner quoins
    ...[1, -1].flatMap((sx) => [1, -1].map((sz) => box(0.4, H, 0.4, C.stone, { x: sx * (w / 2 - 0.02), z: sz * (d / 2 - 0.02), y: H / 2, surface: 'stone' }))),
  ];
  for (let f = 1; f <= floors; f++) p.push(box(w + 0.14, 0.11, d + 0.14, C.stone, { y: f * fh - 0.05, surface: 'stone' }));
  // cornice
  p.push(box(w + 0.5, 0.24, d + 0.5, C.stone, { y: H + 0.12, surface: 'stone' }), box(w + 0.3, 0.2, d + 0.3, C.dstone, { y: H - 0.12, surface: 'stone' }));
  // mansard roof (ridge along X) + ridge cap
  const yb = H + 0.24;
  p.push(
    extrude([[-d / 2 - 0.1, 0], [d / 2 + 0.1, 0], [d / 2 - 0.4, 1.7], [d / 2 - 1.5, 2.5], [-d / 2 + 1.5, 2.5], [-d / 2 + 0.4, 1.7]], w + 0.2, C.roof, { ry: PI / 2, y: yb, surface: 'roof', textureRotation: PI / 2 }),
    box(w + 0.25, 0.12, d - 3.0, C.droof, { y: yb + 2.55, surface: 'roof' }),
    box(w + 0.25, 0.1, 0.16, C.droof, { y: yb + 1.7, z: d / 2 - 0.35 }),
    box(w + 0.25, 0.1, 0.16, C.droof, { y: yb + 1.7, z: -d / 2 + 0.35 }),
  );
  // slate courses
  for (let i = 0; i < 4; i++) {
    const yy = yb + 0.4 + i * 0.4, zz = d / 2 + 0.1 - 0.4 * (yy - yb) / 1.7 * 1.0;
    if (yy - yb > 1.6) break;
    p.push(box(w + 0.12, 0.04, 0.05, C.droof, { y: yy, z: zz + 0.02, surface: 'roof' }), box(w + 0.12, 0.04, 0.05, C.droof, { y: yy, z: -zz - 0.02, surface: 'roof' }));
  }
  // dormers on both slopes
  const nd = Math.max(2, Math.round(w / 3.2));
  for (const s of [1, -1]) {
    for (let i = 0; i < nd; i++) {
      const x = -w / 2 + (w * (i + 0.5)) / nd;
      const z = s * (d / 2 - 0.36);
      p.push(
        box(0.95, 1.0, 0.7, C.stone, { x, y: yb + 0.85, z, surface: 'stone' }),
        box(0.6, 0.66, 0.05, C.dglass, { x, y: yb + 0.88, z: z + s * 0.36, surface: 'glass' }),
        box(0.7, 0.05, 0.05, C.white, { x, y: yb + 0.88, z: z + s * 0.39 }),
        extrude([[-0.62, 0], [0.62, 0], [0, 0.5]], 0.85, C.droof, { x, y: yb + 1.35, z: z + s * 0.02, surface: 'roof' }),
        box(1.05, 0.06, 0.8, C.dstone, { x, y: yb + 0.36, z: z + s * 0.02 }),
      );
    }
  }
  // chimneys
  for (const cx of [-w * 0.3, w * 0.28]) {
    p.push(
      box(0.75, 1.4, 0.6, C.brick, { x: cx, y: yb + 2.9, surface: 'brick' }),
      box(0.9, 0.12, 0.75, C.dstone, { x: cx, y: yb + 3.65 }),
      cyl(0.11, 0.13, 0.4, C.brick, { x: cx - 0.2, y: yb + 3.9, segments: 8 }),
      cyl(0.11, 0.13, 0.4, C.brick, { x: cx + 0.2, y: yb + 3.9, segments: 8 }),
    );
  }
  // front / back facades
  const facade = (detail) => {
    const f = [];
    for (let fl = 1; fl < floors; fl++) {
      const y = fl * fh + fh * 0.55;
      const tall = fl === 1 || fl === floors - 2;
      for (let i = 0; i < nx; i++) {
        const x = -w / 2 + (w * (i + 0.5)) / nx;
        f.push(...fwindow(x, y, 0.78, tall ? 1.3 : 1.1, fl % 2 === 0 && detail, detail));
      }
      if (tall && detail) f.push(...balcony(0, fl * fh + 0.02, w * 0.86));
    }
    return f;
  };
  p.push(...at(facade(true), 0, 0, d / 2), ...at(facade(false), 0, 0, -d / 2, PI));
  // ground floor front: shopfronts flanking an arched double door, striped awnings
  const gf = [
    box(1.5, 1.35, 0.14, C.stone, { y: 0.68, z: 0.05 }),
    box(1.2, 1.3, 0.1, '#2d5a48', { y: 0.65, z: 0.1 }),
    cyl(0.6, 0.6, 0.1, '#2d5a48', { y: 1.3, z: 0.1, rx: PI / 2, segments: 12 }),
    cyl(0.75, 0.75, 0.08, C.stone, { y: 1.3, z: 0.05, rx: PI / 2, segments: 12 }),
    box(0.04, 1.6, 0.05, C.gold, { y: 0.8, z: 0.17 }),
    box(0.3, 0.12, 0.3, C.dstone, { y: 0.06, z: 0.2 }),
  ];
  const shopW = Math.min(2.2, (w - 3.2) / 2);
  for (const s of [-1, 1]) {
    const sx = s * (0.75 + 0.6 + shopW / 2 + 0.3);
    if (Math.abs(sx) + shopW / 2 > w / 2 - 0.3) continue;
    gf.push(
      box(shopW + 0.2, 1.3, 0.1, C.dark, { x: sx, y: 0.85, z: 0.05 }),
      box(shopW, 1.15, 0.06, C.dglass, { x: sx, y: 0.85, z: 0.1 }),
      box(0.05, 1.15, 0.05, C.dark, { x: sx, y: 0.85, z: 0.14 }),
      box(shopW + 0.3, 0.06, 0.8, o.awn || C.red, { x: sx, y: 1.75, z: 0.4, rx: 0.4 }),
      box(shopW + 0.3, 0.06, 0.4, C.white, { x: sx - 0.1, y: 1.66, z: 0.68, rx: 0.4 }),
      box(shopW * 0.8, 0.12, 0.05, C.gold, { x: sx, y: 1.42, z: 0.08 }),
    );
  }
  p.push(...at(gf, 0, 0, d / 2 + 0.04));
  // side facades (fewer, plain windows)
  const side = [];
  for (let fl = 1; fl < floors; fl++) for (let i = 0; i < ns; i++) side.push(...fwindow(-d / 2 + (d * (i + 0.5)) / ns, fl * fh + fh * 0.55, 0.7, 1.0, false, false));
  p.push(...at(side, w / 2, 0, 0, PI / 2), ...at(side, -w / 2, 0, 0, -PI / 2));
  return p;
};

export function buildProtos() {
  const P = {};
  const add = (name, parts, opts) => (P[name] = applyModelFinishes(fillSurface(makeProto(name, parts.flat(), opts), FALLBACK[name] ?? DEFAULT_FALLBACK), 'urban'));

  // ---------- small
  add('croissant', [
    // crescent: 7 fat segments along an arc, alternating golden tones, tapering to pointed tips
    ...[-3, -2, -1, 0, 1, 2, 3].map((i) => {
      const a = (i / 3) * 1.0, rr = [0.08, 0.12, 0.155, 0.18, 0.155, 0.12, 0.08][i + 3];
      return sphere(rr, i % 2 ? '#e8b15a' : '#d99a3f', {
        x: Math.cos(a) * 0.42 - 0.25, z: Math.sin(a) * 0.42, y: rr * 0.9 + 0.02, ry: -a, sx: 1.25, sy: 0.85, segments: 8, rings: 5, flat: false,
      });
    }),
    sphere(0.06, '#f2cf7a', { x: 0.17, z: 0, y: 0.34, segments: 6, rings: 4, flat: false }),
  ], { value: 0.3 });

  add('baguetteBasket', [
    lathe([[0.28, 0], [0.34, 0.12], [0.4, 0.42], [0.42, 0.46], [0.36, 0.46]], C.wood, { surface: 'wood', segments: 12 }),
    cyl(0.43, 0.41, 0.06, '#9a6b32', { surface: 'wood', y: 0.46, segments: 12 }),
    cyl(0.372, 0.372, 0.05, '#a97b42', { surface: 'wood', y: 0.16, segments: 12 }),
    cyl(0.4, 0.4, 0.05, '#a97b42', { surface: 'wood', y: 0.32, segments: 12 }),
    capsule(0.07, 0.85, '#e0a84d', { y: 0.95, x: -0.12, z: 0.05, rz: 0.14, segments: 8, caps: 2 }),
    capsule(0.07, 0.8, '#d99a3f', { y: 0.9, x: 0.05, z: -0.1, rz: -0.1, segments: 8, caps: 2 }),
    capsule(0.07, 0.8, '#e8b15a', { y: 0.9, x: 0.14, z: 0.12, rz: -0.18, segments: 8, caps: 2 }),
    box(0.3, 0.05, 0.06, C.red, { surface: 'fabric', y: 0.55, x: 0.1, z: 0.3 }),
  ], { value: 0.4 });

  add('flowerPot', [
    lathe([[0.2, 0], [0.3, 0.38], [0.34, 0.4], [0.34, 0.46], [0.28, 0.46]], '#c8663f', { surface: 'stone', segments: 12 }),
    cyl(0.28, 0.28, 0.04, '#5a3a24', { surface: 'stucco', y: 0.44, segments: 10 }),
    sphere(0.26, C.dgreen, { surface: 'foliage', y: 0.62, sy: 0.8, segments: 9, rings: 6 }),
    sphere(0.18, C.green, { surface: 'foliage', y: 0.7, x: 0.14, z: -0.1, segments: 8, rings: 5, flat: false }),
    ...[[0.12, 0.86, 0.05, C.pink], [-0.16, 0.8, 0.1, C.red], [0.0, 0.82, -0.2, C.yellow], [0.2, 0.78, 0.15, C.white], [-0.1, 0.9, -0.08, C.purple]]
      .map(([x, y, z, c]) => sphere(0.09, c, { x, y, z, segments: 6, rings: 4, flat: false })),
  ], { value: 0.3 });

  add('streetLamp', [
    lathe([[0.3, 0], [0.3, 0.12], [0.22, 0.3], [0.13, 0.5], [0.1, 0.8], [0.08, 1.4], [0.07, 2.6]], C.iron, { surface: 'metal', segments: 10 }),
    cyl(0.14, 0.14, 0.06, C.gold, { surface: 'metal', y: 0.8, segments: 8 }),
    cyl(0.11, 0.11, 0.06, C.gold, { surface: 'metal', y: 2.4, segments: 8 }),
    box(0.7, 0.06, 0.06, C.iron, { surface: 'metal', y: 2.65 }),
    ...[-0.34, 0.34].flatMap((x) => [
      cyl(0.19, 0.13, 0.42, C.lamp, { emissive: 1, x, y: 2.95, segments: 6 }),
      cyl(0.21, 0.21, 0.05, C.iron, { surface: 'metal', x, y: 2.73, segments: 6 }),
      cone(0.25, 0.22, C.iron, { surface: 'metal', x, y: 3.27, segments: 6 }),
      cone(0.04, 0.12, C.gold, { surface: 'metal', x, y: 3.45, segments: 5 }),
    ]),
  ], { value: 0.45 });

  add('tourist', person({ shirt: C.orange, pants: C.blue, hair: C.dbrown }, [
    cyl(0.31, 0.31, 0.03, '#f2d16b', { y: 1.5, segments: 10 }),
    cyl(0.16, 0.19, 0.12, '#f2d16b', { y: 1.56, segments: 9 }),
    cyl(0.17, 0.17, 0.03, C.red, { y: 1.53, segments: 9 }),
    box(0.16, 0.12, 0.08, C.dark, { y: 0.98, x: 0.16, z: 0.02 }),
    box(0.04, 0.4, 0.04, C.dark, { y: 1.05, x: 0.1, z: 0.1, rx: 0.15 }),
    box(0.3, 0.4, 0.2, C.red, { y: 0.9, x: -0.28 }),
  ]), { move: { type: 'walk', speed: 1.3, range: 12 }, value: 0.45 });
  add('tourist2', person({ shirt: C.pink, pants: '#5b6c8f', hair: '#7a4a2a', skin: '#e2ad84' }, [
    sphere(0.19, '#7a4a2a', { y: 1.28, x: -0.1, sy: 1.1, segments: 8, rings: 5, flat: false }),
    box(0.3, 0.26, 0.14, C.purple, { y: 0.78, x: 0.02, z: 0.33 }),
    box(0.03, 0.4, 0.03, C.purple, { y: 0.95, x: 0.02, z: 0.28 }),
    box(0.06, 0.1, 0.5, C.white, { y: 0.88, x: 0.0, z: 0.0 }),
  ]), { move: { type: 'walk', speed: 1.3, range: 12 }, value: 0.45 });
  add('mime', person({ shirt: C.white, pants: C.black, hair: C.black, skin: '#faf3ea' }, [
    // black stripes on the shirt
    ...[0.7, 0.86, 1.02].map((y) => cyl(0.212, 0.212, 0.05, C.black, { y, segments: 9 })),
    // beret, scarf, gloves, suspenders
    sphere(0.22, C.black, { y: 1.52, sy: 0.3, x: -0.03, segments: 8, rings: 4, flat: false }),
    box(0.03, 0.08, 0.03, C.black, { y: 1.62 }),
    cyl(0.16, 0.17, 0.07, C.red, { y: 1.15, segments: 8 }),
    box(0.14, 0.1, 0.05, C.red, { y: 1.0, x: 0.15, z: 0.08 }),
    box(0.1, 0.1, 0.1, C.white, { y: 0.5, z: 0.29 }),
    box(0.1, 0.1, 0.1, C.white, { y: 0.5, z: -0.29 }),
    box(0.04, 0.5, 0.05, C.black, { y: 0.9, x: 0.14, z: 0.1 }),
    box(0.04, 0.5, 0.05, C.black, { y: 0.9, x: 0.14, z: -0.1 }),
    box(0.44, 0.4, 0.05, C.white, { y: 0.98, z: 0.36, rx: 0.3 }),
  ]), { move: { type: 'walk', speed: 1.0, range: 8 }, value: 0.6 });

  const bikeWheel = (x) => {
    const pivot = [x, 0.47, 0], o = { radius: 0.42, front: x > 0 };
    return [
      torus(0.42, 0.04, C.dark, { y: 0.47, x, radial: 4, segments: 14, surface: 'rubber' }),
      cyl(0.06, 0.06, 0.12, C.chrome, { y: 0.47, x, rx: PI / 2, segments: 6, surface: 'metal' }),
      box(0.8, 0.02, 0.02, C.lgray, { y: 0.47, x, surface: 'metal' }), box(0.02, 0.8, 0.02, C.lgray, { y: 0.47, x, surface: 'metal' }),
      box(0.57, 0.02, 0.02, C.lgray, { y: 0.47, x, rz: PI / 4, surface: 'metal' }), box(0.57, 0.02, 0.02, C.lgray, { y: 0.47, x, rz: -PI / 4, surface: 'metal' }),
    ].map((g) => articulate(g, 'wheel', pivot, o));
  };
  add('bicycle', [
    ...bikeWheel(0.75), ...bikeWheel(-0.75),
    box(1.0, 0.05, 0.05, C.red, { y: 0.72, x: 0.1, surface: 'paint' }),
    box(0.9, 0.05, 0.05, C.red, { y: 0.52, x: 0.05, rz: 0.36, surface: 'paint' }),
    box(0.06, 0.6, 0.05, C.red, { y: 0.65, x: -0.35, rz: 0.2, surface: 'paint' }),
    box(0.06, 0.65, 0.05, C.red, { y: 0.68, x: 0.55, rz: -0.25, surface: 'paint' }),
    box(0.25, 0.06, 0.16, C.dark, { y: 1.0, x: -0.45, surface: 'rubber' }),
    box(0.05, 0.05, 0.62, C.chrome, { y: 1.07, x: 0.66, surface: 'metal' }),
    box(0.42, 0.28, 0.36, C.wood, { y: 0.8, x: 1.0, surface: 'wood' }),
    box(0.4, 0.05, 0.34, '#a87b40', { y: 0.95, x: 1.0, surface: 'wood' }),
    capsule(0.05, 0.5, '#e0a84d', { y: 1.1, x: 1.0, z: 0.05, rz: 0.2, segments: 6, caps: 1, surface: 'fabric', textureStrength: 0.5 }),
    sphere(0.1, C.yellow, { y: 0.98, x: 1.22, segments: 6, rings: 4, flat: false }),
  ], { value: 0.7, radius: 0.9 });

  add('scooter', [
    rbox(0.5, 0.42, 0.34, C.teal, { y: 0.55, x: -0.32, segments: 1, bevel: 0.1 }),
    box(1.1, 0.14, 0.34, C.teal, { y: 0.32, x: 0.05 }),
    box(0.12, 0.7, 0.3, C.teal, { y: 0.66, x: 0.46, rz: -0.15 }),
    rbox(0.5, 0.12, 0.3, C.dark, { y: 0.84, x: -0.3, segments: 1, bevel: 0.04 }),
    box(0.06, 0.06, 0.6, C.chrome, { y: 1.22, x: 0.36 }),
    sphere(0.1, C.lamp, { emissive: 1, y: 1.05, x: 0.52, segments: 8, rings: 5, flat: false }),
    box(0.1, 0.08, 0.08, C.black, { y: 1.28, x: 0.36, z: 0.34 }),
    box(0.1, 0.08, 0.08, C.black, { y: 1.28, x: 0.36, z: -0.34 }),
    box(0.06, 0.1, 0.16, C.red, { y: 0.6, x: -0.6 }),
    ...wheel(0.5, 0.2, 0, 0.2, 0.12), ...wheel(-0.45, 0.2, 0, 0.2, 0.12),
  ], { value: 0.9 });

  add('moriceColumn', [
    lathe([[0.66, 0], [0.66, 0.2], [0.55, 0.3], [0.48, 0.5], [0.5, 0.6]], C.iron, { surface: 'metal', segments: 12 }),
    cyl(0.5, 0.5, 1.5, '#e8d9a8', { surface: 'paint', y: 1.35, segments: 12 }),
    cyl(0.52, 0.52, 0.45, '#e05a7a', { surface: 'paint', y: 1.1, segments: 12 }),
    cyl(0.52, 0.52, 0.35, C.blue, { surface: 'paint', y: 1.6, segments: 12 }),
    cyl(0.52, 0.52, 0.3, C.yellow, { surface: 'paint', y: 1.9, segments: 12 }),
    cyl(0.56, 0.56, 0.08, C.iron, { surface: 'metal', y: 2.15, segments: 12 }),
    lathe([[0.58, 2.1], [0.6, 2.2], [0.48, 2.35], [0.28, 2.55], [0.06, 2.75]], '#2b6650', { surface: 'metal', segments: 12 }),
    sphere(0.09, C.gold, { surface: 'metal', y: 2.8, segments: 8, rings: 5, flat: false }),
  ], { value: 1.0 });

  add('bench', [
    ...[0, 1, 2, 3].map((i) => box(1.8, 0.05, 0.11, C.wood, { surface: 'wood', y: 0.5, z: -0.2 + i * 0.13 })),
    ...[0, 1, 2].map((i) => box(1.8, 0.11, 0.05, C.wood, { surface: 'wood', y: 0.7 + i * 0.17, z: -0.28 - i * 0.04, rx: -0.15 })),
    ...[-0.8, 0.8].flatMap((x) => [
      box(0.07, 0.5, 0.5, C.iron, { surface: 'metal', y: 0.25, x }),
      box(0.07, 0.62, 0.06, C.iron, { surface: 'metal', y: 0.8, x, z: -0.3, rx: -0.15 }),
      box(0.07, 0.06, 0.5, C.iron, { surface: 'metal', y: 0.68, x, z: 0.0 }),
      box(0.09, 0.06, 0.6, C.gold, { surface: 'metal', y: 0.06, x, z: 0 }),
    ]),
  ], { value: 0.7 });

  const chair = (x, z, ry) => at([
    cyl(0.2, 0.2, 0.05, '#c8663f', { surface: 'wood', y: 0.45, segments: 10 }),
    ...[[0.14, 0.14], [-0.14, 0.14], [0.14, -0.14], [-0.14, -0.14]].map(([a, b]) => box(0.03, 0.44, 0.03, C.dark, { surface: 'metal', x: a, z: b, y: 0.22 })),
    box(0.04, 0.4, 0.34, '#c8663f', { surface: 'wood', y: 0.7, x: -0.19 }),
    box(0.04, 0.05, 0.34, C.dark, { surface: 'metal', y: 0.92, x: -0.19 }),
  ], x, 0, z, ry);
  add('cafeTable', [
    cyl(0.4, 0.4, 0.06, C.white, { surface: 'paint', y: 0.76, segments: 12 }),
    lathe([[0.25, 0], [0.24, 0.05], [0.08, 0.15], [0.05, 0.4], [0.05, 0.72]], C.iron, { segments: 10 }),
    ...chair(0.72, 0, 0), ...chair(-0.72, 0, PI),
    cyl(0.1, 0.1, 0.02, C.white, { surface: 'paint', y: 0.8, x: 0.12, z: 0.1, segments: 8 }),
    cyl(0.05, 0.04, 0.07, C.white, { surface: 'paint', y: 0.84, x: 0.12, z: 0.1, segments: 8 }),
    cyl(0.03, 0.05, 0.16, C.dgreen, { surface: 'foliage', y: 0.87, x: -0.15, z: -0.1, segments: 8 }),
  ], { value: 1.0, radius: 0.9 });

  // ---------- street furniture
  add('hedge', [
    rbox(1.8, 0.7, 0.7, '#3f8f4a', { surface: 'foliage', y: 0.35, segments: 1, bevel: 0.22 }),
    ...[-0.55, 0, 0.55].map((x) => sphere(0.3, '#58a65a', { surface: 'foliage', x, y: 0.7, sy: 0.6, segments: 7, rings: 4, flat: false })),
    box(1.9, 0.08, 0.8, '#7a6a4a', { surface: 'stone', y: 0.04 }),
  ], { value: 0.3 });
  add('bush', [
    sphere(0.46, C.dgreen, { surface: 'foliage', y: 0.4, sy: 0.85, segments: 8, rings: 5, flat: false }),
    sphere(0.34, C.green, { surface: 'foliage', x: 0.3, z: 0.15, y: 0.34, segments: 7, rings: 4, flat: false }),
    sphere(0.3, C.lgreen, { surface: 'foliage', x: -0.25, z: -0.2, y: 0.34, segments: 7, rings: 4, flat: false }),
    ...[[0.1, 0.78, 0.1, C.pink], [-0.2, 0.62, 0.15, C.white], [0.3, 0.6, -0.1, C.yellow]].map(([x, y, z, c]) => sphere(0.07, c, { x, y, z, segments: 5, rings: 3, flat: false })),
  ], { value: 0.3 });
  add('trashCan', [
    cyl(0.26, 0.24, 0.9, '#2f6a4a', { surface: 'metal', y: 0.45, segments: 10 }),
    cyl(0.28, 0.28, 0.06, C.iron, { surface: 'metal', y: 0.92, segments: 10 }),
    cyl(0.2, 0.22, 0.34, '#e9f1f4', { surface: 'fabric', y: 1.1, segments: 8 }),
    box(0.3, 0.06, 0.04, C.gold, { surface: 'metal', y: 0.6, z: 0.25 }),
  ], { value: 0.2 });
  add('bollard', [
    cyl(0.12, 0.14, 0.75, C.iron, { surface: 'metal', y: 0.375, segments: 8 }),
    sphere(0.13, C.iron, { surface: 'metal', y: 0.78, segments: 8, rings: 4, flat: false }),
    cyl(0.145, 0.145, 0.06, C.gold, { surface: 'metal', y: 0.5, segments: 8 }),
  ], { value: 0.12 });
  add('ironFence', [
    box(1.8, 0.05, 0.05, C.iron, { surface: 'metal', y: 0.2 }),
    box(1.8, 0.05, 0.05, C.iron, { surface: 'metal', y: 0.85 }),
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8].flatMap((i) => [
      box(0.035, 0.95, 0.035, C.iron, { surface: 'metal', x: -0.8 + i * 0.2, y: 0.48 }),
      cone(0.04, 0.12, C.gold, { surface: 'metal', x: -0.8 + i * 0.2, y: 1.0, segments: 4 }),
    ]),
    ...[-0.9, 0.9].map((x) => box(0.09, 1.05, 0.09, C.iron, { surface: 'metal', x, y: 0.52 })),
  ], { value: 0.25, radius: 0.9 });
  add('planterBox', [
    rbox(1.5, 0.45, 0.5, '#b9a98a', { surface: 'stone', y: 0.22, segments: 1, bevel: 0.06 }),
    box(1.4, 0.04, 0.4, '#5a3a24', { surface: 'stucco', y: 0.46 }),
    ...[-0.5, 0, 0.5].map((x) => sphere(0.25, C.dgreen, { surface: 'foliage', x, y: 0.62, sy: 0.8, segments: 7, rings: 4, flat: false })),
    ...[[-0.5, C.pink], [0.05, C.yellow], [0.5, C.red], [-0.2, C.white]].map(([x, c], i) => sphere(0.09, c, { x, y: 0.88, z: i % 2 ? 0.1 : -0.08, segments: 5, rings: 3, flat: false })),
  ], { value: 0.4 });
  add('bikeRack', [
    box(1.6, 0.06, 0.4, C.iron, { surface: 'metal', y: 0.03 }),
    ...[-0.55, 0, 0.55].map((x) => torus(0.3, 0.03, C.lgray, { surface: 'metal', x, y: 0.3, radial: 4, segments: 10 })),
    box(0.5, 0.25, 0.04, C.green, { surface: 'paint', x: 0.6, y: 0.85, z: 0.15 }),
    box(0.04, 0.8, 0.04, C.iron, { surface: 'metal', x: 0.6, y: 0.4, z: 0.15 }),
  ], { value: 0.4, radius: 0.8 });
  add('planeTree', [
    lathe([[0.2, 0], [0.14, 0.4], [0.12, 1.6], [0.1, 2.4]], '#b9b09a', { segments: 8, surface: 'wood' }),
    cyl(0.07, 0.1, 1.2, '#a39a84', { y: 2.6, x: 0.35, rz: -0.6, segments: 6, surface: 'wood' }),
    cyl(0.07, 0.1, 1.2, '#a39a84', { y: 2.6, x: -0.35, rz: 0.6, segments: 6, surface: 'wood' }),
    sphere(1.5, '#7fb35a', { y: 3.9, sy: 0.75, segments: 9, rings: 6, surface: 'foliage' }),
    sphere(1.1, '#6aa24e', { y: 3.5, x: 1.0, z: 0.3, segments: 8, rings: 5, surface: 'foliage' }),
    sphere(1.1, '#6aa24e', { y: 3.5, x: -1.0, z: -0.3, segments: 8, rings: 5, surface: 'foliage' }),
    sphere(0.9, '#8cc065', { y: 4.4, x: 0.2, z: 0.4, segments: 8, rings: 5, surface: 'foliage' }),
  ], { value: 1.2, sway: 'tree' });

  // ---------- medium
  const umbChair = (x, z, ry) => at([
    box(0.4, 0.05, 0.4, '#c8663f', { surface: 'wood', y: 0.45 }),
    box(0.05, 0.5, 0.4, '#c8663f', { surface: 'wood', y: 0.72, x: -0.18 }),
    ...[[0.16, 0.16], [-0.16, 0.16], [0.16, -0.16], [-0.16, -0.16]].map(([a, b]) => box(0.04, 0.44, 0.04, C.dark, { surface: 'metal', x: a, z: b, y: 0.22 })),
  ], x, 0, z, ry);
  add('umbrellaTable', [
    cyl(0.5, 0.5, 0.05, C.white, { surface: 'fabric', y: 0.76, segments: 14 }),
    cyl(0.06, 0.06, 2.6, C.iron, { surface: 'metal', y: 1.3, segments: 8 }),
    cyl(0.3, 0.3, 0.04, C.iron, { surface: 'metal', y: 0.02, segments: 10 }),
    // striped canopy: two rotated octagonal cones interleave into 8 wedges
    cone(1.7, 0.7, '#e8557a', { surface: 'fabric', y: 2.9, segments: 8 }),
    cone(1.72, 0.7, C.white, { surface: 'fabric', y: 2.9, segments: 8, ry: PI / 8 }),
    sphere(0.08, C.gold, { surface: 'metal', y: 3.28, segments: 6, rings: 4, flat: false }),
    torus(1.66, 0.04, '#e8557a', { surface: 'fabric', y: 2.56, rx: PI / 2, radial: 4, segments: 16 }),
    ...umbChair(0.95, 0, 0), ...umbChair(-0.95, 0, PI), ...umbChair(0, 0.95, -PI / 2),
    cyl(0.06, 0.06, 0.12, C.red, { surface: 'paint', y: 0.84, x: 0.15, segments: 8 }),
  ], { value: 1.5 });

  add('newsstand', [
    box(2.2, 0.2, 1.8, C.dstone, { y: 0.1 }),
    rbox(2.0, 1.55, 1.4, '#2f7a5a', { surface: 'paint', y: 0.98, z: -0.15, segments: 1, bevel: 0.08 }),
    // glazed panels with frames
    ...[-0.6, 0, 0.6].flatMap((x) => [
      box(0.5, 0.75, 0.05, '#1f5a42', { surface: 'paint', x, y: 1.5, z: 0.56 }),
      box(0.4, 0.62, 0.06, C.glass, { surface: 'glass', x, y: 1.5, z: 0.58 }),
    ]),
    rbox(1.8, 0.45, 0.4, C.wood, { surface: 'wood', y: 0.85, z: 0.7, segments: 1, bevel: 0.05 }),
    // magazine rack
    ...[[-0.6, C.red], [-0.3, C.yellow], [0, C.blue], [0.3, C.pink], [0.6, C.white]].flatMap(([x, c]) => [
      box(0.24, 0.32, 0.03, c, { x, y: 1.22, z: 0.86, rx: -0.4 }),
      box(0.2, 0.1, 0.03, C.dark, { x, y: 1.14, z: 0.88, rx: -0.4 }),
    ]),
    rbox(2.4, 0.16, 2.0, '#1f3d36', { surface: 'roof', y: 1.95, z: -0.05, segments: 1, bevel: 0.05 }),
    cone(1.2, 0.4, '#1f3d36', { surface: 'roof', y: 2.2, segments: 4, ry: PI / 4, sx: 1.0, sz: 0.8 }),
    box(1.5, 0.22, 0.06, C.gold, { surface: 'metal', y: 1.78, z: 0.66 }),
    box(1.2, 0.14, 0.04, '#1f3d36', { surface: 'roof', y: 1.78, z: 0.7 }),
    sphere(0.08, C.gold, { surface: 'metal', y: 2.45, segments: 6, rings: 4, flat: false }),
    box(0.8, 0.7, 0.05, C.white, { surface: 'paint', y: 1.2, x: 1.03, z: -0.15, ry: PI / 2 }),
  ], { value: 1.6 });

  add('citroen', car('#6fb7d8', 3.4, '#f4f1e6'), { value: 1.6 });
  add('citroen2', car('#f2c230', 3.4, '#2f6fc4'), { value: 1.6 });
  add('citroen3', car('#e85a5a', 3.4, '#f4f1e6'), { value: 1.6 });
  add('taxi', [
    ...car('#f7d21f', 4.0),
    rbox(0.7, 0.24, 0.3, C.white, { surface: 'paint', y: 1.78, x: -0.24, segments: 1, bevel: 0.06 }),
    box(0.5, 0.1, 0.04, C.dark, { surface: 'paint', y: 1.78, x: -0.24, z: 0.16 }),
    box(0.5, 0.1, 0.04, C.dark, { surface: 'paint', y: 1.78, x: -0.24, z: -0.16 }),
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((i) => [
      box(0.28, 0.1, 0.03, i % 2 ? C.dark : C.white, { surface: 'paint', y: 0.92, x: -1.4 + i * 0.3, z: 0.87 }),
      box(0.28, 0.1, 0.03, i % 2 ? C.dark : C.white, { surface: 'paint', y: 0.92, x: -1.4 + i * 0.3, z: -0.87 }),
    ]),
  ], { value: 2 });

  add('boat', [
    rbox(4.6, 0.8, 1.6, C.white, { surface: 'paint', y: 0.5, segments: 1, bevel: 0.2 }),
    cone(0.9, 1.4, C.white, { surface: 'paint', y: 0.5, x: 2.9, rz: -PI / 2, sz: 1.7, segments: 4, ry: PI / 4 }),
    box(4.6, 0.15, 1.7, C.blue, { surface: 'paint', y: 0.55 }),
    box(4.4, 0.06, 1.72, C.red, { surface: 'paint', y: 0.28 }),
    rbox(3.4, 0.95, 1.4, C.glass, { surface: 'glass', y: 1.38, x: -0.2, segments: 1, bevel: 0.1 }),
    ...[0, 1, 2, 3, 4, 5].flatMap((i) => [
      box(0.08, 0.95, 0.06, C.white, { surface: 'paint', y: 1.38, x: -1.7 + i * 0.7, z: 0.71 }),
      box(0.08, 0.95, 0.06, C.white, { surface: 'paint', y: 1.38, x: -1.7 + i * 0.7, z: -0.71 }),
    ]),
    rbox(3.7, 0.15, 1.75, C.white, { surface: 'paint', y: 1.92, x: -0.2, segments: 1, bevel: 0.05 }),
    // sun-deck rail, wheelhouse, funnel, flag, lifebuoys
    box(3.4, 0.05, 0.05, C.chrome, { surface: 'metal', y: 2.3, x: -0.3, z: 0.8 }), box(3.4, 0.05, 0.05, C.chrome, { surface: 'metal', y: 2.3, x: -0.3, z: -0.8 }),
    ...[-1.8, -0.6, 0.6, 1.2].flatMap((x) => [box(0.04, 0.4, 0.04, C.chrome, { surface: 'metal', y: 2.13, x, z: 0.8 }), box(0.04, 0.4, 0.04, C.chrome, { surface: 'metal', y: 2.13, x, z: -0.8 })]),
    rbox(1.0, 0.6, 1.0, C.white, { surface: 'paint', y: 2.3, x: 0.7, segments: 1, bevel: 0.1 }),
    box(0.06, 0.34, 0.9, C.glass, { surface: 'glass', y: 2.32, x: 1.2 }),
    cyl(0.14, 0.16, 0.7, C.red, { surface: 'paint', y: 2.55, x: -1.3, segments: 10 }),
    cyl(0.16, 0.16, 0.1, C.dark, { surface: 'metal', y: 2.92, x: -1.3, segments: 10 }),
    cyl(0.015, 0.015, 0.9, C.dark, { surface: 'metal', y: 2.9, x: -2.2, segments: 4 }),
    box(0.02, 0.22, 0.34, C.blue, { surface: 'paint', y: 3.2, x: -2.2, z: 0.17 }),
    torus(0.18, 0.05, C.red, { surface: 'paint', y: 0.85, x: 0.4, z: 0.83, radial: 5, segments: 10 }),
    torus(0.18, 0.05, C.red, { surface: 'paint', y: 0.85, x: 0.4, z: -0.83, radial: 5, segments: 10 }),
    box(0.06, 0.6, 1.2, '#e05a7a', { surface: 'paint', y: 0.85, x: -0.2 }),
  ], { value: 2.5, sway: 'boat' });

  add('carousel', (() => {
    const p = [
      cyl(3.2, 3.3, 0.3, '#c9a34a', { surface: 'metal', y: 0.15, segments: 20 }),
      torus(3.2, 0.1, C.gold, { surface: 'metal', y: 0.3, rx: PI / 2, radial: 4, segments: 24 }),
      cyl(2.7, 2.7, 0.06, '#e6cf8a', { surface: 'metal', y: 0.32, segments: 20 }),
      lathe([[0.9, 0.3], [0.9, 0.6], [0.5, 0.9], [0.4, 3.4]], C.gold, { surface: 'metal', segments: 14 }),
      cyl(3.3, 3.3, 0.25, '#e05a7a', { surface: 'paint', y: 3.6, segments: 20 }),
      cyl(3.35, 3.35, 0.1, C.gold, { surface: 'metal', y: 3.42, segments: 20 }),
      cone(3.7, 1.3, C.white, { surface: 'paint', y: 4.55, segments: 8 }),
      cone(3.74, 1.3, '#e05a7a', { surface: 'paint', y: 4.55, segments: 8, ry: PI / 8 }),
      cone(2.0, 1.0, C.white, { surface: 'paint', y: 5.6, segments: 8 }),
      cone(2.04, 1.0, '#e05a7a', { surface: 'paint', y: 5.6, segments: 8, ry: PI / 8 }),
      torus(3.55, 0.08, C.gold, { surface: 'metal', y: 3.95, rx: PI / 2, radial: 4, segments: 24 }),
      sphere(0.28, C.gold, { surface: 'metal', y: 6.25, segments: 10, rings: 7, flat: false }),
    ];
    // scalloped valance + bulbs around the canopy
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * PI * 2;
      p.push(
        sphere(0.3, i % 2 ? C.white : '#e05a7a', { surface: 'paint', x: Math.cos(a) * 3.3, z: Math.sin(a) * 3.3, y: 3.4, sy: 0.7, segments: 6, rings: 4, flat: false }),
        sphere(0.07, C.lamp, { emissive: 1, x: Math.cos(a) * 3.62, z: Math.sin(a) * 3.62, y: 4.0, segments: 5, rings: 3, flat: false }),
      );
    }
    const horse = (col) => [
      capsule(0.28, 0.5, col, { y: 1.05, x: 0, rz: PI / 2, segments: 8, caps: 2 }),
      capsule(0.16, 0.5, col, { y: 1.5, x: 0.55, rz: -0.6, segments: 8, caps: 2 }),
      sphere(0.2, col, { y: 1.85, x: 0.85, sx: 1.4, segments: 8, rings: 5, flat: false }),
      cone(0.06, 0.15, col, { y: 2.05, x: 0.75, z: 0.07, segments: 4 }), cone(0.06, 0.15, col, { y: 2.05, x: 0.75, z: -0.07, segments: 4 }),
      box(0.4, 0.15, 0.14, '#7a4a2a', { y: 1.75, x: 0.52, rz: -0.5 }),
      capsule(0.06, 0.4, col, { y: 0.55, x: 0.28, z: 0.16, segments: 6, caps: 1 }), capsule(0.06, 0.4, col, { y: 0.55, x: 0.28, z: -0.16, segments: 6, caps: 1 }),
      capsule(0.06, 0.4, col, { y: 0.55, x: -0.28, z: 0.16, segments: 6, caps: 1 }), capsule(0.06, 0.4, col, { y: 0.55, x: -0.28, z: -0.16, segments: 6, caps: 1 }),
      capsule(0.05, 0.4, C.white, { surface: 'paint', y: 1.0, x: -0.7, rz: 0.5, segments: 6, caps: 1 }),
      box(0.35, 0.05, 0.4, C.red, { surface: 'paint', y: 1.32, x: 0.05 }),
    ];
    ['#f4f4f4', '#f28fb1', '#9fd8f0', '#f2c230', '#c9a3f0', '#a5e08c'].forEach((col, i) => {
      const a = (i / 6) * PI * 2, x = Math.cos(a) * 2.2, z = Math.sin(a) * 2.2;
      p.push(cyl(0.05, 0.05, 3.2, C.gold, { surface: 'metal', x, z, y: 1.9, segments: 6 }), ...at(horse(col), x, 0.3 + (i % 2) * 0.25, z, -a - PI / 2 + PI / 2));
    });
    return p;
  })(), { value: 16 });

  add('fountain', [
    lathe([[2.5, 0], [2.8, 0.1], [2.8, 0.65], [2.6, 0.75], [2.4, 0.7]], C.dstone, { surface: 'stone', segments: 20 }),
    cyl(2.42, 2.42, 0.1, C.water, { y: 0.62, segments: 20 }),
    torus(2.7, 0.1, C.stone, { surface: 'stone', y: 0.74, rx: PI / 2, radial: 4, segments: 24 }),
    lathe([[0.7, 0.6], [0.55, 0.9], [0.4, 1.6], [0.45, 1.75], [0.9, 1.85], [1.4, 2.15], [1.2, 2.2], [0.5, 1.95]], C.stone, { surface: 'stone', segments: 16 }),
    lathe([[0.3, 2.0], [0.15, 2.4], [0.2, 2.8], [0.55, 3.0], [0.4, 3.05]], C.stone, { surface: 'stone', segments: 12 }),
    cyl(0.3, 0.3, 0.05, C.water, { y: 2.16, x: 0, segments: 12, sx: 3.6, sz: 3.6 }),
    cone(0.12, 1.0, '#cfeeff', { y: 3.5, segments: 8, flat: false }),
    ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => {
      const a = (i / 8) * PI * 2 + 0.2;
      return [
        sphere(0.18, C.stone, { surface: 'stone', x: Math.cos(a) * 2.6, z: Math.sin(a) * 2.6, y: 0.9, segments: 6, rings: 4, flat: false }),
        cone(0.06, 0.6, '#cfeeff', { x: Math.cos(a) * 1.8, z: Math.sin(a) * 1.8, y: 1.2, rz: 0, segments: 6 }),
      ];
    }),
  ], { value: 8 });

  add('tree', leafy(4.2, C.green, C.lgreen, '#88d174'), { value: 1.4, sway: 'tree' });
  add('tree2', leafy(3.4, C.dgreen, C.green, C.lgreen), { value: 1.0, sway: 'tree' });

  // ---------- large
  add('tourBus', (() => {
    const p = [
      rbox(9.2, 1.5, 2.6, C.red, { surface: 'paint', y: 1.15, segments: 1, bevel: 0.25 }),
      rbox(9.0, 0.9, 2.5, C.glass, { surface: 'glass', y: 2.45, segments: 1, bevel: 0.1 }),
      rbox(9.2, 0.15, 2.6, C.red, { surface: 'paint', y: 2.98, segments: 1, bevel: 0.05 }),
      box(4.6, 0.06, 2.4, '#f2c230', { surface: 'paint', y: 3.05, x: -1.8 }),
      box(0.12, 0.8, 2.4, C.glass, { surface: 'glass', y: 3.45, x: 1.9 }),
      box(0.1, 0.8, 2.4, C.red, { surface: 'paint', y: 3.45, x: -4.3 }),
      box(3.8, 0.6, 0.06, C.white, { surface: 'paint', y: 1.3, x: -0.6, z: 1.32 }), box(3.8, 0.6, 0.06, C.white, { surface: 'paint', y: 1.3, x: -0.6, z: -1.32 }),
      box(3.4, 0.3, 0.05, C.navy, { surface: 'paint', y: 1.3, x: -0.6, z: 1.35 }), box(3.4, 0.3, 0.05, C.navy, { surface: 'paint', y: 1.3, x: -0.6, z: -1.35 }),
      box(0.05, 1.0, 1.0, C.dark, { surface: 'paint', y: 1.1, x: 4.6 }),
      box(1.1, 1.5, 0.06, C.glass, { surface: 'glass', y: 1.35, x: 3.2, z: 1.32 }),
      // upper deck posts + rails + seat rows
      ...[3.9, 2.4, 0.9, -0.6, -2.1, -3.6].flatMap((x) => [box(0.07, 0.8, 0.07, C.red, { surface: 'paint', y: 3.4, x, z: 1.2 }), box(0.07, 0.8, 0.07, C.red, { surface: 'paint', y: 3.4, x, z: -1.2 })]),
      box(8, 0.05, 0.06, C.chrome, { surface: 'metal', y: 3.72, x: -0.2, z: 1.22 }), box(8, 0.05, 0.06, C.chrome, { surface: 'metal', y: 3.72, x: -0.2, z: -1.22 }),
      ...[-3.2, -2.2, -1.2, -0.2, 0.8].flatMap((x) => [
        box(0.5, 0.12, 0.8, C.navy, { surface: 'paint', y: 3.2, x, z: 0.6 }), box(0.1, 0.4, 0.8, C.navy, { surface: 'paint', y: 3.45, x: x - 0.2, z: 0.6 }),
        box(0.5, 0.12, 0.8, C.navy, { surface: 'paint', y: 3.2, x, z: -0.6 }), box(0.1, 0.4, 0.8, C.navy, { surface: 'paint', y: 3.45, x: x - 0.2, z: -0.6 }),
      ]),
      box(0.3, 0.14, 0.8, C.yellow, { surface: 'paint', y: 0.9, x: 4.65, z: 0 }),
      sphere(0.18, C.lamp, { emissive: 1, y: 0.95, x: 4.62, z: 0.95, segments: 8, rings: 5, flat: false }), sphere(0.18, C.lamp, { emissive: 1, y: 0.95, x: 4.62, z: -0.95, segments: 8, rings: 5, flat: false }),
      box(0.14, 0.2, 2.7, C.chrome, { surface: 'metal', y: 0.45, x: 4.65 }), box(0.14, 0.2, 2.7, C.chrome, { surface: 'metal', y: 0.45, x: -4.65 }),
      box(0.05, 0.25, 0.6, C.red, { surface: 'paint', y: 1.0, x: -4.62, z: 0.9 }), box(0.05, 0.25, 0.6, C.red, { surface: 'paint', y: 1.0, x: -4.62, z: -0.9 }),
      box(0.4, 0.5, 0.06, C.dark, { surface: 'paint', y: 0.9, x: -4.4 }),
    ];
    for (const [x, z] of [[3, 1.2], [3, -1.2], [-3, 1.2], [-3, -1.2]]) {
      p.push(...wheel(x, 0.6, z, 0.65, 0.4));
      p.push(rbox(1.7, 0.2, 0.05, C.dark, { surface: 'paint', y: 1.2, x, z: z * 1.09, segments: 1, bevel: 0.02 }));
    }
    // window pillars on both sides
    for (let i = 0; i < 9; i++) {
      p.push(box(0.09, 0.9, 0.05, C.red, { surface: 'paint', y: 2.45, x: -4 + i, z: 1.27 }), box(0.09, 0.9, 0.05, C.red, { surface: 'paint', y: 2.45, x: -4 + i, z: -1.27 }));
    }
    return p;
  })(), { value: 5 });

  // Haussmann block protos: one shared builder, a few widths / heights / colours so rows read as varied but continuous
  add('houseA', haussmann(9, 7, 5, C.cream), { value: 1.7 });
  add('houseB', haussmann(7, 7, 5, '#eadbb8', { awn: '#2f6fc4' }), { value: 1.2 });
  add('houseC', haussmann(10, 7, 6, '#f1e7cf', { awn: '#2d5a48' }), { value: 2.2 });
  add('houseD', haussmann(6, 7, 7, '#e9dcc0', { awn: '#c8663f' }), { value: 1.0 });
  add('houseE', haussmann(8, 7, 6, '#f4ead2', { awn: '#8a2f3b' }), { value: 1.7 });
  add('houseG', haussmann(6, 5.5, 5, '#efe4cb', { awn: '#2d5a48' }), { value: 0.8 });
  add('houseF', haussmann(9, 7, 7, '#ece0c4', { awn: '#2f6fc4' }), { value: 2.0 });

  add('cathedral', (() => {
    const W = C.stone, D = C.dstone;
    const p = [
      box(16, 7, 8, W, { y: 3.5 }),
      box(16.4, 0.3, 8.4, D, { y: 7.1 }),
      // nave roof with ridge and spirelet
      extrude([[-4.2, 0], [4.2, 0], [0, 3.4]], 15.6, '#6b7c92', { surface: 'roof', ry: PI / 2, y: 7.25, x: -1.2 }),
      box(15.6, 0.16, 0.2, D, { y: 10.7, x: -1.2 }),
      // apse
      cyl(2.6, 2.6, 6.2, W, { y: 3.1, x: -8.4, segments: 10 }),
      cone(2.9, 2.6, '#6b7c92', { surface: 'roof', y: 7.5, x: -8.4, segments: 10 }),
      // crossing spire
      box(1.8, 2.2, 1.8, W, { y: 8.4, x: -3 }),
      cone(1.1, 5.0, '#6b7c92', { surface: 'roof', y: 12.2, x: -3, segments: 8 }),
      cone(0.16, 1.6, C.gold, { surface: 'metal', y: 15.4, x: -3, segments: 6 }),
      // facade centre + towers
      box(0.6, 5.6, 5.6, W, { y: 2.8, x: 8.4 }),
      box(4.0, 12, 5.5, D, { y: 6, x: 6.5, z: 3.0 }),
      box(4.0, 12, 5.5, D, { y: 6, x: 6.5, z: -3.0 }),
      box(4.4, 0.5, 5.9, W, { y: 12.25, x: 6.5, z: 3.0 }),
      box(4.4, 0.5, 5.9, W, { y: 12.25, x: 6.5, z: -3.0 }),
      box(0.4, 0.35, 12.0, W, { y: 6.1, x: 8.62 }),
      box(0.5, 0.6, 12.0, W, { y: 5.6, x: 8.64 }),
      // rose window: blue glass, stone ring, spokes
      cyl(1.7, 1.7, 0.2, '#4a6fa5', { surface: 'glass', y: 8.2, x: 8.62, rz: PI / 2, segments: 20 }),
      cyl(0.6, 0.6, 0.22, '#e05a7a', { surface: 'glass', y: 8.2, x: 8.64, rz: PI / 2, segments: 12 }),
      torus(1.75, 0.16, W, { y: 8.2, x: 8.62, ry: PI / 2, radial: 5, segments: 20 }),
      ...[0, 1, 2, 3, 4, 5].map((i) => box(0.08, 3.4, 0.09, W, { y: 8.2, x: 8.68, rx: (i * PI) / 6 })),
      // porch dado + portal surrounds
      box(0.5, 0.5, 5.7, D, { y: 0.25, x: 8.62 }),
    ];
    // three pointed portals (nested arches) on the west front
    const portal = (z, s) => at([
      extrude([[-0.95 * s, 0], [-0.95 * s, 1.9 * s], [0, 3.3 * s], [0.95 * s, 1.9 * s], [0.95 * s, 0]], 0.3, D, { z: 0 }),
      extrude([[-0.7 * s, 0], [-0.7 * s, 1.7 * s], [0, 2.9 * s], [0.7 * s, 1.7 * s], [0.7 * s, 0]], 0.36, W, { z: 0 }),
      extrude([[-0.5 * s, 0], [-0.5 * s, 1.5 * s], [0, 2.5 * s], [0.5 * s, 1.5 * s], [0.5 * s, 0]], 0.4, C.dark, { surface: 'paint', z: 0 }),
      box(0.06, 1.2 * s, 0.44, '#5a3d24', { surface: 'wood', y: 0.6 * s, z: 0.2 }),
    ], 8.66, 0.05, z, PI / 2);
    p.push(...portal(-1.9, 1.0), ...portal(1.9, 1.0), ...portal(0, 1.15));
    // gallery of kings + tower louvres + crenellations + pinnacles
    for (let i = 0; i < 11; i++) p.push(box(0.22, 0.65, 0.2, D, { y: 6.6, x: 8.75, z: -4.6 + i * 0.92 }));
    for (const z of [3.0, -3.0]) {
      p.push(
        extrude([[-0.45, 0], [-0.45, 1.8], [0, 2.7], [0.45, 1.8], [0.45, 0]], 0.2, C.dark, { surface: 'paint', y: 8.9, x: 8.55, z, ry: PI / 2 }),
        extrude([[-0.45, 0], [-0.45, 1.8], [0, 2.7], [0.45, 1.8], [0.45, 0]], 0.2, C.dark, { surface: 'paint', y: 8.9, x: 8.55, z: z + 1.4, ry: PI / 2, sx: 0.7 }),
        box(0.06, 2.4, 0.08, D, { y: 10, x: 8.52, z }),
      );
      for (let i = 0; i < 4; i++) p.push(box(0.5, 0.45, 0.5, W, { y: 12.75, x: 5.0 + i * 1.0, z: z + 2.4 }), box(0.5, 0.45, 0.5, W, { y: 12.75, x: 5.0 + i * 1.0, z: z - 2.4 }));
      for (const [px, pz] of [[4.6, z + 2.5], [8.4, z + 2.5], [4.6, z - 2.5], [8.4, z - 2.5]]) p.push(cone(0.28, 1.1, D, { y: 13.0, x: px, z: pz, segments: 6 }));
    }
    // flying buttresses
    for (let i = 0; i < 5; i++) {
      const x = -6.4 + i * 2.6;
      for (const s of [1, -1]) {
        p.push(
          box(0.55, 5.6, 0.55, D, { y: 2.8, x, z: s * 4.9 }),
          cone(0.3, 0.7, W, { y: 5.9, x, z: s * 4.9, segments: 4, ry: PI / 4 }),
          box(0.3, 0.32, 1.7, D, { y: 5.8, x, z: s * 4.15, rx: -s * 0.6 }),
        );
      }
      for (const s of [1, -1]) {
        p.push(box(0.9, 1.8, 0.05, '#4a6fa5', { surface: 'glass', y: 4.3, x: x + 1.3, z: s * 4.03 }));
        p.push(box(1.1, 2.1, 0.03, D, { y: 4.3, x: x + 1.3, z: s * 4.01 }));
      }
    }
    return p;
  })(), { value: 38 });

  add('arc', (() => {
    const W = C.stone, D = C.dstone;
    const R = 4.0, cy = 4.0;
    const arch = [];
    for (let i = 0; i <= 14; i++) {
      const t = PI - (i / 14) * PI;
      arch.push([Math.cos(t) * R, cy + Math.sin(t) * R]);
    }
    const p = [
      // main body with the great arch cut out (profile in world Z/Y, thickness along X)
      extrude([[-9.2, 0], [-R, 0], [-R, cy], ...arch, [R, 0], [9.2, 0], [9.2, 9.2], [-9.2, 9.2]], 3.4, W, { ry: PI / 2 }),
      box(3.8, 0.3, 18.8, D, { y: 0.15 }),
      // attic + cornices
      box(3.6, 2.0, 18.6, W, { y: 10.2 }),
      box(3.9, 0.45, 19.0, D, { y: 11.4 }),
      box(3.8, 0.3, 18.9, D, { y: 9.15 }),
      box(3.7, 0.24, 18.7, D, { y: 8.0 }),
      // side arches (small, on the narrow ends)
      ...[1, -1].flatMap((s) => [
        extrude([[-1.0, 0], [-1.0, 3.0], [0, 4.0], [1.0, 3.0], [1.0, 0]], 0.3, C.dark, { surface: 'stone', z: s * 9.15, y: 0.1 }),
        box(0.4, 0.5, 0.4, D, { z: s * 9.15, y: 3.5, x: 1.6 }),
      ]),
    ];
    // reliefs / sculpture groups on both faces of the piers
    for (const s of [1, -1]) {
      for (const z of [-6.8, 6.8]) {
        p.push(
          box(0.2, 5.4, 3.6, D, { y: 4.4, x: s * 1.8, z }),
          box(0.25, 4.6, 2.8, '#cbb992', { surface: 'stone', y: 4.4, x: s * 1.85, z }),
          box(0.3, 1.6, 0.9, W, { y: 3.4, x: s * 1.9, z: z - 0.7 }), box(0.3, 1.3, 0.8, W, { y: 5.3, x: s * 1.9, z: z + 0.6 }),
          sphere(0.4, W, { y: 4.5, x: s * 2.0, z, segments: 8, rings: 5, flat: false }),
        );
      }
      // shield frieze along the attic
      for (let i = 0; i < 14; i++) p.push(cyl(0.42, 0.42, 0.14, '#bba57a', { surface: 'stone', y: 10.2, x: s * 1.85, z: -8.1 + i * 1.25, rz: PI / 2, segments: 10 }));
      // inscription band + relief panel above the arch
      p.push(box(0.16, 0.5, 18, D, { y: 8.6, x: s * 1.85 }));
      p.push(box(0.2, 1.0, 6, '#cbb992', { surface: 'stone', y: 8.5, x: s * 1.85, z: 0 }));
    }
    // coffered vault and eternal flame
    p.push(box(3.0, 0.2, 8.0, D, { y: 0.2 }), box(0.9, 0.3, 0.9, D, { y: 0.4 }), cone(0.2, 0.5, C.orange, { surface: 'paint', y: 0.9, segments: 8 }));
    return p;
  })(), { value: 50 });

  add('eiffel', (() => {
    const br = C.bronze, dbr = C.dbrown;
    const hw = (y) => 0.5 + 6.7 * Math.pow(Math.max(0, 1 - y / 45), 2);
    const p = [];
    const beam = (w, len, col, o) => box(w, len, w, col, o);
    // corner posts, segment by segment along the curve
    const dy = 2.5;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (let y = 0; y < 44; y += dy) {
        const h0 = hw(y), h1 = hw(y + dy), th = 0.9 * (1 - y / 60);
        p.push(box(th, dy * 1.03, th, br, { surface: 'metal',
          x: sx * (h0 + h1) / 2, z: sz * (h0 + h1) / 2, y: y + dy / 2,
          rz: sx * Math.atan((h0 - h1) / dy), rx: -sz * Math.atan((h0 - h1) / dy),
        }));
      }
      p.push(box(1.9, 0.7, 1.9, dbr, { surface: 'metal', x: sx * (hw(0) + 0.15), z: sz * (hw(0) + 0.15), y: 0.35 }));
      p.push(box(1.5, 0.3, 1.5, C.stone, { surface: 'stone', x: sx * (hw(0) + 0.15), z: sz * (hw(0) + 0.15), y: 0.85 }));
    }
    // lattice on each of the four faces: horizontals + X braces
    const levels = [0.4, 3, 6, 9, 12, 14.8, 18, 21, 24, 27, 29, 32, 35, 38, 41, 44];
    for (let i = 0; i < levels.length; i++) {
      const y0 = levels[i], y1 = levels[i + 1];
      const h0 = hw(y0);
      for (const s of [-1, 1]) {
        p.push(box(2 * h0, 0.28, 0.28, dbr, { surface: 'metal', y: y0, z: s * h0 }), box(0.28, 0.28, 2 * h0, dbr, { surface: 'metal', y: y0, x: s * h0 }));
      }
      if (y1 === undefined) break;
      const h1 = hw(y1), hm = (h0 + h1) / 2, len = Math.hypot(h0 + h1, y1 - y0), ang = Math.atan2(y1 - y0, h0 + h1);
      const thin = y0 < 24 ? 0.22 : 0.16;
      for (const s of [-1, 1]) {
        for (const k of [-1, 1]) {
          p.push(box(len, thin, thin, br, { surface: 'metal', y: (y0 + y1) / 2, z: s * hm, rz: k * ang }));
          p.push(box(thin, thin, len, br, { surface: 'metal', y: (y0 + y1) / 2, x: s * hm, rx: k * ang }));
        }
      }
    }
    // grand arches at the base of each face
    const archShape = [];
    for (let i = 0; i <= 12; i++) { const t = (i / 12) * PI; archShape.push([Math.cos(t) * 6.0, 1.5 + Math.sin(t) * 7.6]); }
    for (let i = 12; i >= 0; i--) { const t = (i / 12) * PI; archShape.push([Math.cos(t) * 5.3, 1.5 + Math.sin(t) * 6.9]); }
    for (const s of [-1, 1]) {
      p.push(extrude(archShape, 0.6, dbr, { surface: 'metal', z: s * 5.9 }), extrude(archShape, 0.6, dbr, { surface: 'metal', x: s * 5.9, ry: PI / 2 }));
    }
    // platforms with rails and pavilions
    const plat = (y, hwid, th) => [
      box(2 * hwid, th, 2 * hwid, dbr, { surface: 'metal', y }),
      box(2 * hwid + 0.5, 0.18, 2 * hwid + 0.5, C.gold, { surface: 'metal', y: y + th / 2 + 0.09 }),
      box(2 * hwid + 0.3, 0.1, 0.1, C.cream, { surface: 'paint', y: y + th / 2 + 0.6, z: hwid + 0.1 }), box(2 * hwid + 0.3, 0.1, 0.1, C.cream, { surface: 'paint', y: y + th / 2 + 0.6, z: -hwid - 0.1 }),
      box(0.1, 0.1, 2 * hwid + 0.3, C.cream, { surface: 'paint', y: y + th / 2 + 0.6, x: hwid + 0.1 }), box(0.1, 0.1, 2 * hwid + 0.3, C.cream, { surface: 'paint', y: y + th / 2 + 0.6, x: -hwid - 0.1 }),
    ];
    p.push(...plat(15.4, 4.5, 0.8), ...plat(29.3, 2.4, 0.6), ...plat(42.3, 1.2, 0.5));
    for (const s of [-1, 1]) p.push(rbox(3.0, 1.3, 1.0, C.cream, { surface: 'paint', y: 16.6, z: s * 3.0, segments: 1, bevel: 0.15 }), box(2.6, 0.5, 0.06, C.glass, { surface: 'glass', y: 16.7, z: s * 3.52 }));
    p.push(rbox(3.4, 1.0, 3.4, C.cream, { surface: 'paint', y: 30.2, segments: 1, bevel: 0.15 }), box(3.6, 0.4, 3.6, dbr, { surface: 'metal', y: 30.9 }));
    // top cupola, needle, beacon
    p.push(
      lathe([[1.0, 42.5], [1.1, 43.1], [0.7, 43.9], [0.25, 44.6]], C.cream, { surface: 'paint', segments: 12 }),
      lathe([[0.3, 44.5], [0.18, 47], [0.1, 50], [0.04, 52.4]], C.gray, { surface: 'metal', segments: 8, flat: false }),
      sphere(0.25, C.red, { surface: 'paint', y: 52.7, segments: 8, rings: 6, flat: false }),
      // warm lights along the first platform
      ...[-3.5, -1.2, 1.2, 3.5].map((x) => sphere(0.2, C.lamp, { emissive: 1, y: 15.0, x, z: 4.7, segments: 5, rings: 3, flat: false })),
    );
    return p;
  })(), { value: 120, radius: 8.5 });

  return P;
}
