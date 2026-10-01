// Playful Venice: buildings face +Z, boats travel toward +X.
import { box, rbox, cyl, cone, sphere, torus, lathe, extrude, makeProto, articulate } from './build.js';
import { facadeWall, recessedWindow } from './ModelDetails.js';
import { applyModelFinishes } from './ModelFinishes.js';

const C = {
  cream: '#f7e8cc', stone: '#d8c6a4', brick: '#cf7359', roof: '#b95743',
  gold: '#e9b84f', dark: '#343f4b', glass: '#5b969e', wood: '#966b46',
  red: '#ec6963', blue: '#52a8be', green: '#6f977c', white: '#fff7e4',
};
const PI = Math.PI;
export const HOUSE_NAMES = [];
const round = { segments: 10, rings: 6, flat: false };

const arch = (w, h) => {
  const p = [[-w / 2, 0], [-w / 2, h - w / 2]];
  for (let i = 0; i <= 10; i++) {
    const a = PI - i * PI / 10;
    p.push([Math.cos(a) * w / 2, h - w / 2 + Math.sin(a) * w / 2]);
  }
  p.push([w / 2, 0]);
  return p;
};

const ROW_Y = [1.9, 4.5, 7.2, 9.9, 12.6];
const pointedRing = (r) => [[-r, 0], [-r, r * 0.55], [0, r * 1.55], [r, r * 0.55], [r, 0],
  [r - 0.14, 0], [r - 0.14, r * 0.5], [0, r * 1.3], [-r + 0.14, r * 0.5], [-r + 0.14, 0]];
const archSpandrels = (r) => {
  const left = [[-r, 0]];
  for (let i = 1; i <= 6; i++) { const a = PI - i * PI / 12; left.push([Math.cos(a) * r, Math.sin(a) * r]); }
  left.push([-r, r]);
  return left;
};

/** Venetian townhouse: n storeys (3-5), pastel stucco, arched / gothic windows, terracotta roof with chimneys. Faces +Z. */
const townhouse = (s) => {
  const { w, d, n, color, far = false } = s;
  const trim = s.trim ?? C.cream, shutter = s.shutter ?? C.green;
  const h = ROW_Y[n - 1] + 2;
  const columns = Math.max(2, Math.round(w / 1.9));
  const doorCol = Math.floor(columns / 2);
  const colX = (k) => -w / 2 + (k + 0.5) * w / columns;
  const openings = [], backOpenings = [];
  for (let row = 0; row < n; row++) for (let k = 0; k < columns; k++) {
    const o = { x: colX(k), y: ROW_Y[row], width: 0.9, height: row ? 1.5 : 1.2 };
    backOpenings.push(o);
    if (!(row === 0 && k === doorCol)) openings.push(o);
  }
  const p = [box(w - 0.36, h, d - 0.7, color, { y: h / 2, surface: 'stucco' }),
    ...[-1, 1].map(side => box(0.18, h, d - 0.36, color, { x: side * (w / 2 - 0.09), y: h / 2, surface: 'stucco' })),
    ...facadeWall(w, h, 0.18, color, openings, { z: d / 2 - 0.09, surface: 'stucco' }),
    ...facadeWall(w, h, 0.18, color, backOpenings, { z: -(d / 2 - 0.09), ry: PI, surface: 'stucco' }),
    box(w + 0.3, 0.35, d + 0.3, C.stone, { y: 0.175, surface: 'stone' }),
    box(w + 0.5, 0.22, d + 0.5, trim, { y: h, surface: 'stone' }),
    extrude([[-d / 2 - 0.25, 0], [d / 2 + 0.25, 0], [0, 1.7 + (d - 5) * 0.12]], w + 0.5, s.roof ?? C.roof, { y: h + 0.1, ry: PI / 2, surface: 'roof', textureRotation: PI / 2 }),
    // Door with a stone surround; waterside step.
    extrude(arch(1.7, 2.5), 0.06, trim, { x: colX(doorCol), z: d / 2 + 0.03, y: 0.3 }),
    extrude(arch(1.35, 2.3), 0.09, C.dark, { x: colX(doorCol), z: d / 2 + 0.06, y: 0.3 }),
  ];
  for (let c = 0; c < (s.chimneys ?? 1); c++) {
    const cx = (c ? -1 : 1) * w * 0.27;
    p.push(box(0.55, 1.5, 0.65, C.brick, { x: cx, z: -d * 0.18, y: h + 1.45, surface: 'brick' }), box(0.78, 0.14, 0.88, C.stone, { x: cx, z: -d * 0.18, y: h + 2.25 }));
  }
  if (s.awning) p.push(box(2.9, 0.1, 1.1, s.awning, { x: colX(doorCol), y: 2.95, z: d / 2 + 0.5, rx: 0.12, surface: 'fabric' }),
    box(2.9, 0.3, 0.1, s.awning, { x: colX(doorCol), y: 2.72, z: d / 2 + 1.03, surface: 'fabric' }));
  if (s.altana) {
    const ax = -w * 0.2, az = d * 0.1, ay = h + 1.55;
    p.push(box(2.2, 0.1, 1.6, C.wood, { x: ax, z: az, y: ay, surface: 'wood' }),
      ...[[-1, -0.7], [1, -0.7], [-1, 0.7], [1, 0.7]].map(([x, z]) => box(0.08, 1.7, 0.08, C.wood, { x: ax + x, z: az + z, y: ay - 0.8, surface: 'wood' })),
      box(2.5, 0.08, 1.9, C.wood, { x: ax, z: az, y: ay + 1.0, surface: 'wood' }));
  }
  for (let row = 0; row < n; row++) for (let k = 0; k < columns; k++) {
    const x = colX(k), y = ROW_Y[row], wh = row ? 1.5 : 1.2;
    // Back pane: always the cheap version.
    p.push(box(0.68, wh - 0.22, 0.018, C.glass, { x, y, z: -(d / 2 - 0.279) + 0.0, surface: 'glass' }));
    if (row === 0 && k === doorCol) continue;
    if (far) {
      p.push(box(0.68, wh - 0.22, 0.018, C.glass, { x, y, z: d / 2 - 0.279, surface: 'glass' }));
      continue;
    }
    p.push(...recessedWindow(0.9, wh, 0.18, { x, y, z: d / 2 - 0.09, frameColor: trim, glassColor: C.glass, mullion: true }));
    if (s.shutters !== false && row) for (const sd of [-1, 1]) p.push(box(0.22, wh - 0.3, 0.08, shutter, { x: x + sd * 0.61, y, z: d / 2 + 0.08, surface: 'wood' }));
    if (s.windows === 'arch' && row) {
      for (const sd of [-1, 1]) p.push(extrude(archSpandrels(0.45).map(([a, b]) => [a * sd, b]), 0.06, color, { x, y: y + wh / 2 - 0.45, z: d / 2 + 0.03 }));
    }
    if (s.windows === 'gothic' && row >= 1) p.push(extrude(pointedRing(0.5), 0.1, trim, { x, y: y + wh / 2 - 0.06, z: d / 2 + 0.07 }));
    if (s.balcony && row === 1 && (s.balcony === 'all' || k % 2 === 0)) {
      const bz = d / 2 + 0.27;
      p.push(box(1.25, 0.075, 0.48, trim, { x, y: y - 0.77, z: bz, surface: 'stone' }), box(1.25, 0.045, 0.045, trim, { x, y: y - 0.45, z: d / 2 + 0.47, surface: 'metal' }));
      for (const dx of [-0.52, -0.26, 0, 0.26, 0.52]) p.push(box(0.035, 0.32, 0.035, trim, { x: x + dx, y: y - 0.61, z: d / 2 + 0.47, surface: 'metal' }));
    }
  }
  if (!far) for (let row = 1; row < n; row++) for (const side of [-1, 1]) p.push(box(w - 0.3, 0.12, 0.12, trim, { y: (ROW_Y[row - 1] + ROW_Y[row]) / 2 + 0.05, z: side * (d / 2 + 0.015), surface: 'stone' }));
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) p.push(box(0.3, h - 0.3, 0.12, trim, { x, y: h / 2, z: d / 2 + 0.08 }));
  if (!far) for (const side of [-1, 1]) for (const rise of [0.34, 0.68, 1.02, 1.36]) {
    const slope = 1.7 + (d - 5) * 0.12;
    if (rise < slope - 0.1) p.push(box(w + 0.3, 0.032, 0.04, s.roofTile ?? C.brick, { y: h + 0.1 + rise, z: side * (d / 2 + 0.25) * (1 - rise / slope), rx: -side * Math.atan(slope / (d / 2 + 0.25)), surface: 'roof' }));
  }
  return p;
};

const person = (shirt, hat = false) => [
  ...[-0.13, 0.13].flatMap(z => {
    const o = { side: z > 0 ? 1 : -1, hip: [0, 0.62, z] }, pivot = [0, 0.62, z];
    return [articulate(rbox(0.17, 0.54, 0.14, C.dark, { y: 0.35, z, segments: 3, surface: 'fabric' }), 'leg', pivot, o),
      articulate(rbox(0.3, 0.12, 0.2, C.wood, { y: 0.06, x: 0.06, z, segments: 3, surface: 'rubber' }), 'leg', pivot, o)];
  }),
  cyl(0.24, 0.22, 0.65, shirt, { y: 0.94, segments: 8, surface: 'fabric' }),
  ...[-0.32, 0.32].flatMap(z => [articulate(cyl(0.075, 0.07, 0.5, shirt, { y: 0.92, z, segments: 6, surface: 'fabric' }), 'arm', [0, 1.15, z], { side: z > 0 ? 1 : -1 }),
    articulate(sphere(0.07, '#edc5a0', { y: 0.65, z, segments: 8, rings: 5 }), 'arm', [0, 1.15, z], { side: z > 0 ? 1 : -1 })]),
  cyl(0.08, 0.075, 0.16, '#edc5a0', { y: 1.27, segments: 8, surface: 'skin' }),
  rbox(0.2, 0.09, 0.36, C.white, { y: 1.27, segments: 2, surface: 'fabric' }),
  sphere(0.2, '#edc5a0', { y: 1.5, segments: 8, rings: 5 }),
  ...[-0.17, 0.17].map(z => sphere(0.03, '#edc5a0', { y: 1.49, z, segments: 7, rings: 4 })),
  ...[-0.065, 0.065].map(z => sphere(0.022, C.dark, { x: 0.18, y: 1.53, z, segments: 7, rings: 4 })),
  sphere(0.035, '#edc5a0', { x: 0.19, y: 1.46, sx: 1.25, segments: 7, rings: 4 }),
  ...(hat ? [cyl(0.29, 0.29, 0.05, C.cream, { y: 1.67, segments: 10, surface: 'fabric' }), cyl(0.2, 0.2, 0.14, C.cream, { y: 1.74, segments: 10, surface: 'fabric' }), cyl(0.21, 0.21, 0.04, C.red, { y: 1.71, segments: 10, surface: 'fabric' })] : [sphere(0.205, C.wood, { y: 1.6, sy: 0.5, segments: 8, rings: 4 })]),
];

/** Arched stone footbridge: span `len` along X (between the quays), `wid` across, ends step down to the quay. */
export const footbridgeParts = (len, wid, color = '#eadfc4') => {
  const half = len / 2, rise = Math.min(5.2, 0.9 + len * 0.2), b = 0.55, N = 14;
  const top = (x) => b + rise * (1 - (x / half) ** 2);
  const under = (x) => Math.max(0.02, top(x) - 0.55);
  const xs = Array.from({ length: N + 1 }, (_, i) => -half + len * i / N);
  const poly = [...xs.map(x => [x, top(x)]), ...xs.slice().reverse().map(x => [x, under(x)])];
  const p = [extrude(poly, wid, color, { surface: 'stone' })];
  for (const sd of [-1, 1]) {
    p.push(box(1.6, b, wid, color, { x: sd * (half + 0.8), y: b / 2, surface: 'stone' }), box(1.2, 0.25, wid, '#d9cbaa', { x: sd * (half + 2.2), y: 0.125, surface: 'stone' }));
    p.push(box(0.42, 1.0, 0.42, color, { x: sd * (half + 0.2), y: b + 0.5, z: wid / 2 - 0.1, surface: 'stone' }), box(0.42, 1.0, 0.42, color, { x: sd * (half + 0.2), y: b + 0.5, z: -(wid / 2 - 0.1), surface: 'stone' }));
  }
  for (let i = 0; i < N; i++) {
    const x0 = xs[i], x1 = xs[i + 1], cx = (x0 + x1) / 2, ang = Math.atan2(top(x1) - top(x0), x1 - x0), sl = Math.hypot(x1 - x0, top(x1) - top(x0));
    for (const sd of [-1, 1]) p.push(box(sl + 0.04, 0.55, 0.2, color, { x: cx, y: top(cx) + 0.28, z: sd * (wid / 2 - 0.1), rz: ang, surface: 'stone' }), box(sl + 0.04, 0.08, 0.3, '#f4ecd8', { x: cx, y: top(cx) + 0.58, z: sd * (wid / 2 - 0.1), rz: ang, surface: 'stone' }));
    p.push(box(0.1, 0.05, wid - 0.5, '#c9b998', { x: cx, y: top(cx) + 0.02, rz: ang }));
  }
  return p;
};
export const makeFootbridge = (name, len, wid) => makeProto(name, footbridgeParts(len, wid), { value: 1 });

export function buildProtos() {
  const P = {};
  // Dense little objects make growth steady; the complete city yields roughly radius 20.
  const add = (name, parts, opts) => P[name] = applyModelFinishes(makeProto(name, parts, { ...opts, value: opts.value * 0.52 }));
  const addHouse = (name, spec, value) => {
    const proto = applyModelFinishes(makeProto(name, townhouse(spec), { value }));
    const far = applyModelFinishes(makeProto(`${name}Far`, townhouse({ ...spec, far: true }), { radius: proto.radius, value }));
    proto.geometryFar = far.geometry;
    P[name] = proto;
    return proto;
  };

  add('pigeon', [sphere(0.26, '#88929b', { y: 0.36, sx: 1.3, ...round }), sphere(0.15, '#657b82', { x: 0.28, y: 0.62, segments: 8, rings: 5 }),
    cone(0.07, 0.15, C.gold, { x: 0.46, y: 0.62, rz: -PI / 2, segments: 5 }),
    box(0.3, 0.06, 0.25, '#525d74', { x: -0.26, y: 0.4, rz: -0.2 }),
    ...[-0.1, 0.1].map(z => cyl(0.025, 0.025, 0.17, C.red, { y: 0.085, z, segments: 5 })),
  ], { value: 0.65 });
  for (const [name, color] of [['maskGold', C.gold], ['maskPink', '#dd76af'], ['maskBlue', '#62b5cd']]) {
    add(name, [sphere(0.42, color, { y: 0.4, sz: 0.32, sy: 0.6, segments: 10, rings: 6 }),
      ...[-0.17, 0.17].map(x => sphere(0.11, C.dark, { x, y: 0.44, z: 0.13, sz: 0.25, segments: 8, rings: 4 })),
      cone(0.1, 0.3, C.cream, { y: 0.38, z: 0.18, rx: PI / 2, segments: 6 }),
      ...[-1, 0, 1].map(s => cone(0.13, 0.32, color, { x: s * 0.25, y: 0.7, rz: -s * 0.55, segments: 5 })),
    ], { value: 0.8 });
  }
  add('gelato', [cone(0.16, 0.5, '#dca467', { y: 0.25, segments: 8 }), sphere(0.2, '#f0a8c1', { y: 0.57, segments: 8, rings: 5 }), sphere(0.16, '#fff1c8', { y: 0.78, segments: 8, rings: 5 })], { value: 0.55 });
  add('bottle', [lathe([[0.12, 0], [0.15, 0.08], [0.14, 0.4], [0.07, 0.5], [0.07, 0.65]], '#61a698', { segments: 8 }), box(0.29, 0.2, 0.29, C.cream, { y: 0.28 }), cyl(0.075, 0.075, 0.05, C.gold, { y: 0.67, segments: 8 })], { value: 0.5 });
  add('orangeCrate', [box(0.85, 0.45, 0.7, C.wood, { y: 0.225, surface: 'wood' }),
    ...[-0.24, 0, 0.24].flatMap(x => [-0.18, 0.18].map(z => sphere(0.14, '#f9ad44', { x, z, y: 0.5, segments: 7, rings: 4 }))),
    ...[-0.26, 0.26].map(y => box(0.9, 0.07, 0.05, C.cream, { y: y + 0.3, z: 0.37 })),
  ], { value: 1.0 });
  add('flowerPot', [cyl(0.24, 0.16, 0.5, C.brick, { y: 0.25, segments: 9 }), sphere(0.27, C.green, { y: 0.58, segments: 8, rings: 5 }),
    ...[-0.16, 0, 0.16].map(x => sphere(0.12, '#e87c9e', { x, y: 0.8, segments: 7, rings: 4 })),
  ], { value: 0.75 });
  add('bollard', [cyl(0.2, 0.25, 0.65, C.dark, { y: 0.325, segments: 8 }), sphere(0.22, C.gold, { y: 0.69, segments: 8, rings: 4 })], { value: 0.85 });
  add('mooringPole', [cyl(0.22, 0.28, 3.1, C.red, { y: 1.55, segments: 10 }),
    ...[0.4, 1.2, 2, 2.8].map(y => cyl(0.235, 0.235, 0.35, C.white, { y, segments: 10 })), cone(0.29, 0.38, C.gold, { y: 3.29, segments: 10 }),
  ], { value: 1.6 });
  add('lantern', [cyl(0.2, 0.26, 0.3, '#4a5a60', { y: 0.15, segments: 8 }), cyl(0.07, 0.11, 3.0, '#5d747b', { y: 1.7, segments: 8 }), cyl(0.22, 0.22, 0.1, C.dark, { y: 3.25, segments: 8 }), box(0.34, 0.5, 0.34, '#ffe6a0', { y: 3.55, emissive: 0.6 }), cone(0.32, 0.26, C.dark, { y: 3.93, segments: 4, ry: PI / 4 }),
    ...[-1, 1].flatMap(s => [box(0.04, 0.54, 0.38, C.dark, { y: 3.55, x: s * 0.17 }), box(0.38, 0.54, 0.04, C.dark, { y: 3.55, z: s * 0.17 })]),
  ], { value: 1.4 });
  add('tourist', person('#cf8dbb'), { value: 1.15 });
  add('gondolier', person(C.white, true).concat(...[0.7, 0.87, 1.04, 1.21].map(y => cyl(0.245, 0.235, 0.06, C.blue, { y, segments: 8 }))), { value: 1.15 });
  add('cafeChair', [box(0.65, 0.1, 0.65, C.red, { y: 0.6 }), box(0.65, 0.7, 0.1, C.red, { z: -0.28, y: 0.97 }),
    ...[-0.25, 0.25].flatMap(x => [-0.25, 0.25].map(z => cyl(0.035, 0.035, 0.6, C.dark, { x, z, y: 0.3, segments: 5 }))),
  ], { value: 0.95 });
  add('cafeTable', [cyl(0.82, 0.82, 0.12, '#3f7580', { y: 1, segments: 12 }), cyl(0.08, 0.1, 0.92, C.dark, { y: 0.46, segments: 8 }), cyl(0.45, 0.45, 0.09, C.dark, { y: 0.045, segments: 8 }),
    cyl(0.12, 0.1, 0.15, C.white, { y: 1.14, x: 0.3 }), torus(0.07, 0.025, C.white, { y: 1.14, x: 0.44, ry: PI / 2, radial: 4, segments: 8 }),
  ], { value: 1.6 });
  add('cafeUmbrella', [cyl(0.07, 0.07, 2.6, C.wood, { y: 1.3, segments: 8 }), cyl(0.48, 0.48, 0.13, C.stone, { y: 0.065, segments: 8 }), cone(1.8, 0.65, C.red, { y: 2.7, segments: 8 }), cone(1.81, 0.035, C.white, { y: 2.39, segments: 8 })], { value: 3 });
  add('marketStall', [box(3.1, 0.85, 1.7, C.wood, { y: 0.425 }), box(3.3, 0.12, 1.9, C.cream, { y: 0.91 }),
    ...[-1.4, 1.4].flatMap(x => [-0.7, 0.7].map(z => box(0.09, 2.65, 0.09, C.wood, { x, z, y: 1.325 }))),
    box(3.4, 0.18, 2, C.green, { y: 2.7 }),
    ...[-1.2, -0.6, 0, 0.6, 1.2].map(x => box(0.28, 0.2, 2.02, C.white, { x, y: 2.72 })),
    ...[-1, -0.5, 0, 0.5, 1].flatMap(x => [-0.4, 0.25].map(z => sphere(0.2, x > 0 ? '#ed8e42' : '#dd7072', { x, z, y: 1.14, segments: 7, rings: 4 }))),
  ], { value: 4 });
  add('bench', [box(2, 0.15, 0.65, C.wood, { y: 0.65, surface: 'wood' }), box(2, 0.6, 0.12, C.wood, { y: 1.05, z: -0.27, surface: 'wood' }),
    ...[-0.7, 0.7].map(x => box(0.16, 0.65, 0.55, C.dark, { x, y: 0.325 })),
  ], { value: 1.8 });

  // Pastel stucco palette: salmon, ochre, rose, cream, terracotta, buttery yellow, pale sage.
  const PASTEL = ['#e49a86', '#e6bf7a', '#e3a3a6', '#efe0bd', '#d98b6a', '#efd697', '#a9cdbd'];
  const AWN = [C.red, C.blue, '#e7bd75', C.green, null, null];
  const SHUT = ['#557762', '#4e7182', '#7b4b3c', '#66866d', '#925449'];
  const WIN = ['rect', 'arch', 'gothic', 'arch', 'gothic'];
  const SIZES = [[6, 5], [7, 6], [5, 5], [8, 6], [4, 4], [9, 7], [5, 4], [6, 6]];
  HOUSE_NAMES.length = 0;
  let idx = 0;
  for (let i = 0; i < 24; i++) {
    const [w, d] = SIZES[i % SIZES.length], n = [3, 4, 3, 5, 4, 3, 4, 5, 3][i % 9];
    const spec = {
      w, d, n, color: PASTEL[(i * 3) % 7], shutter: SHUT[i % 5], windows: WIN[i % 5], awning: AWN[i % 6] ?? undefined,
      balcony: i % 3 === 0 ? 'all' : i % 3 === 1 ? true : false, chimneys: 1 + (i % 2), altana: i % 5 === 2,
      roof: i % 4 === 1 ? '#c26548' : C.roof, roofTile: i % 2 ? '#a94e40' : '#b85643', shutters: i % 4 !== 3,
      trim: i % 6 === 4 ? '#f3e2b8' : C.cream,
    };
    const name = 'casa' + idx++;
    addHouse(name, spec, w * d * n / 95);
    HOUSE_NAMES.push(name);
  }
  addHouse('canalPalace', { w: 13, d: 8, n: 4, color: '#f1e3c4', trim: '#fff7e4', shutter: '#5d7f75', windows: 'gothic', balcony: 'all', chimneys: 2, awning: C.blue, roofTile: '#a64f43' }, 6);
  addHouse('procuratie', { w: 18, d: 7, n: 3, color: '#efe3c8', trim: '#fff7e4', shutter: '#7c9a8c', windows: 'arch', chimneys: 2, shutters: false, roofTile: '#a94e40' }, 6);
  add('well', [cyl(0.56, 0.62, 0.8, C.stone, { y: 0.4, segments: 8, surface: 'stone' }), cyl(0.7, 0.7, 0.14, C.cream, { y: 0.86, segments: 8, surface: 'stone' }),
    cyl(0.44, 0.44, 0.06, C.dark, { y: 0.95, segments: 8 }), cyl(0.7, 0.74, 0.12, '#bfae8c', { y: 0.06, segments: 8 }),
    ...[-1, 1].map(s => box(0.08, 0.8, 0.08, C.dark, { x: s * 0.45, y: 1.3, segments: 5 })), box(1.0, 0.07, 0.07, C.dark, { y: 1.72 })], { value: 1.5 });
  add('trashBin', [cyl(0.27, 0.23, 0.78, '#4f6b5e', { y: 0.39, segments: 9, surface: 'metal' }), cyl(0.3, 0.3, 0.08, C.dark, { y: 0.82, segments: 9 })], { value: 0.6 });
  add('planterBox', [box(1.4, 0.45, 0.5, '#c98d6b', { y: 0.225, surface: 'stone' }),
    ...[-0.5, -0.17, 0.17, 0.5].map(x => sphere(0.26, C.green, { x, y: 0.62, segments: 7, rings: 4 })),
    ...[-0.5, 0, 0.5].map(x => sphere(0.12, '#e8627f', { x, y: 0.88, z: 0.05, segments: 6, rings: 4 }))], { value: 0.9 });
  add('motorBoat', (() => {
    const p = [extrude([[-2.9, 0.55], [-2.2, 0.1], [2.1, 0.1], [3.0, 0.62], [2.2, 0.55], [-2.2, 0.55]], 1.5, '#7a4a2e', { surface: 'wood' }),
      box(5.4, 0.07, 1.46, C.wood, { y: 0.56, x: -0.1, surface: 'wood' }),
      rbox(2.1, 0.8, 1.2, C.white, { y: 1.0, x: -0.3, segments: 2, surface: 'paint' }), box(2.3, 0.1, 1.4, C.white, { y: 1.45, x: -0.3, surface: 'paint' }),
      box(0.05, 0.4, 1.0, C.glass, { y: 1.05, x: 0.76, surface: 'glass' }),
      ...[-1, 1].map(s => box(1.0, 0.36, 0.04, C.glass, { y: 1.07, x: -0.3, z: s * 0.61, surface: 'glass' })),
      box(0.3, 0.3, 0.6, C.dark, { x: -2.6, y: 0.5 })];
    return p;
  })(), { value: 6 });
  add('sailboat', [extrude([[-2.6, 0.7], [-2.0, 0.1], [2.0, 0.1], [3.0, 0.8], [2.0, 0.7], [-2.0, 0.7]], 1.2, C.white, { surface: 'paint' }),
    box(5.2, 0.06, 1.1, C.wood, { y: 0.72, surface: 'wood' }), box(0.1, 0.18, 1.22, C.red, { y: 0.55, surface: 'paint' }),
    cyl(0.06, 0.07, 6, '#a8a8a0', { x: 0.3, y: 3.6, segments: 6, surface: 'metal' }),
    extrude([[0, 0], [3.9, 0], [0, 5.2]], 0.05, '#fff8ea', { x: -0.2, y: 1.2, z: 0.1, surface: 'fabric' }),
    extrude([[0, 0], [2.4, 0], [0, 4.2]], 0.05, '#f4cf9a', { x: 0.55, y: 1.1, z: -0.1, ry: 0, surface: 'fabric' })], { value: 5, sway: 'boat' });

  add('gondola', (() => {
    const p = [extrude([[-3.4, 0.55], [-2.5, 0.08], [2.5, 0.08], [3.4, 0.7], [2.5, 0.6], [-2.5, 0.6]], 1.05, '#243746', { surface: 'paint' }),
      box(4.8, 0.07, 1.03, C.wood, { y: 0.57, surface: 'wood' }), box(1.3, 0.2, 0.85, C.red, { y: 0.72, x: 0.3, surface: 'wood' }), box(0.18, 0.6, 0.85, C.red, { y: 0.9, x: -0.3, surface: 'wood' }),
      ...[-1, 1].flatMap(side => [
        box(4.8, 0.035, 0.035, C.gold, { x: -0.05, y: 0.52, z: side * 0.49, surface: 'metal' }),
        box(4.7, 0.055, 0.055, C.wood, { x: -0.15, y: 1.03, z: side * 0.45, surface: 'wood' }),
        ...[-2.25, -0.85, 0.65, 2.15].map(x => box(0.055, 0.42, 0.055, C.wood, { x, y: 0.82, z: side * 0.45, surface: 'wood' })),
      ]),
      extrude([[0, 0], [0.12, 0], [0.19, 1.15], [0.04, 1.3], [-0.14, 1.1]], 0.1, '#c9dbe0', { x: 3.23, y: 0.48 }),
      box(3.4, 0.055, 0.065, C.wood, { x: -1.1, z: 0.7, y: 1.1, ry: 0.45, surface: 'wood' }), box(0.5, 0.04, 0.22, C.wood, { x: 0.4, z: -0.05, y: 1.1, ry: 0.45, surface: 'wood' }),
    ];
    p.push(...person(C.white, true).map(g => g.translate(-1.8, 0.6, 0)));
    for (const y of [1.32, 1.5, 1.68]) p.push(cyl(0.245, 0.24, 0.055, C.blue, { x: -1.8, y, segments: 8 }));
    return p;
  })(), { value: 5 });
  add('vaporetto', [
    extrude([[-4.3, 0.7], [-3.6, 0.15], [3.6, 0.15], [4.3, 0.7]], 2.2, C.dark, { surface: 'paint' }),
    box(7.7, 0.5, 2.3, C.cream, { y: 0.83, surface: 'paint' }),
    // A clean cabin silhouette with separate panes reads as a passenger boat from overhead.
    rbox(6.1, 1.3, 2.1, C.cream, { y: 1.76, x: -0.2, segments: 3, surface: 'paint' }),
    box(6.5, 0.16, 2.4, C.white, { y: 2.5, x: -0.2, surface: 'paint' }),
    ...[-2.35, -1.25, -0.15, 0.95, 2.05].flatMap(x => [-1, 1].map(side =>
      box(0.82, 0.72, 0.045, C.glass, { x, y: 1.86, z: side * 1.064, surface: 'glass' }))),
    ...[-2.9, -1.8, -0.7, 0.4, 1.5, 2.6].flatMap(x => [-1.07, 1.07].map(z => box(0.1, 1.12, 0.08, C.cream, { x, z, y: 1.76, surface: 'paint' }))),
    box(0.045, 0.74, 1.52, C.glass, { x: 2.86, y: 1.86, surface: 'glass' }),
    box(0.045, 0.68, 1.36, C.glass, { x: -3.26, y: 1.86, surface: 'glass' }),
    ...[-1, 1].map(z => box(7.2, 0.15, 0.045, C.gold, { y: 1.04, z: z * 1.17, surface: 'metal' })),
    ...[-1, 1].flatMap(side => [
      box(6.2, 0.045, 0.045, C.gold, { x: -0.2, y: 2.62, z: side * 1.16, surface: 'metal' }),
      ...[-2.75, -1.4, 0, 1.4, 2.75].map(x => box(0.045, 0.28, 0.045, C.gold, { x, y: 2.48, z: side * 1.16, surface: 'metal' })),
    ]),
    box(0.8, 0.15, 1.6, C.wood, { x: 3.3, y: 1.2, surface: 'wood' }),
    cyl(0.07, 0.07, 0.8, C.dark, { y: 2.9, x: 1.9, segments: 8 }), box(0.65, 0.3, 0.04, C.red, { y: 3.13, x: 2.2 }),
  ], { value: 7 });

  add('rialto', (() => {
    const outer = [], inner = [];
    for (let i = 0; i <= 20; i++) { const a = PI - i * PI / 20; outer.push([Math.cos(a) * 9.5, 0.8 + Math.sin(a) * 4.8]); }
    for (let i = 20; i >= 0; i--) { const a = PI - i * PI / 20; inner.push([Math.cos(a) * 8, 0.65 + Math.sin(a) * 3.6]); }
    const p = [extrude([...outer, ...inner], 5.6, C.cream, { surface: 'stone' }), box(3.5, 1, 6.4, C.stone, { x: -8, y: 0.5, surface: 'stone' }), box(3.5, 1, 6.4, C.stone, { x: 8, y: 0.5, surface: 'stone' })];
    for (let x = -8.3; x <= 8.3; x += 1.38) {
      const y = 1.1 + Math.sqrt(Math.max(0, 1 - (x / 9.5) ** 2)) * 4.8;
      p.push(box(1.4, 0.16, 5.2, C.stone, { x, y }));
      for (const s of [-1, 1]) p.push(box(1.25, 1.5, 1.05, C.cream, { x, y: y + 0.82, z: s * 2.2 }), extrude(arch(0.78, 1.15), 0.04, C.glass, { x, y: y + 0.12, z: s * 2.75 }), box(1.48, 0.18, 1.3, C.roof, { x, y: y + 1.67, z: s * 2.2 }));
    }
    p.push(extrude([[-2, 0], [2, 0], [0, 1.5]], 5.9, C.cream, { y: 7.7 }), box(3.8, 1.1, 5.6, C.cream, { y: 7.15 }));
    return p;
  })(), { value: 40 });

  add('basilica', (() => {
    const p = [box(24, 6.5, 14, C.cream, { y: 3.25, surface: 'stone' }), box(24.5, 0.4, 14.5, C.stone, { y: 0.2, surface: 'stone' }), box(24.5, 0.3, 14.5, C.stone, { y: 6.45, surface: 'stone' })];
    for (const [x, z, r] of [[0, -1, 3.5], [-7, -1, 2.8], [7, -1, 2.8], [0, -5, 2.5], [0, 5, 2.9]]) {
      p.push(cyl(r, r, 1.7, C.cream, { x, z, y: 7.2, segments: 16 }), lathe([[r, 8], [r * 0.95, 8.7], [r * 0.72, 9.8], [r * 0.35, 10.5], [0.12, 10.8]], '#c8d4cb', { x, z, segments: 16 }), cone(0.12, 0.8, C.gold, { x, z, y: 11.2, segments: 8 }), box(0.65, 0.08, 0.08, C.gold, { x, z, y: 11.38 }));
    }
    for (let i = -2; i <= 2; i++) {
      const x = i * 4.7;
      p.push(extrude(arch(3.9, 4.8), 0.18, C.stone, { x, z: 7.18, y: 0.4 }), extrude(arch(3.1, 4.3), 0.2, '#6f8589', { x, z: 7.3, y: 0.5 }), extrude(arch(2.8, 2.3), 0.12, C.gold, { x, z: 7.32, y: 5.1 }), extrude(arch(2.2, 1.85), 0.13, '#a46b70', { x, z: 7.4, y: 5.2 }),
        extrude([[-2.1, 0], [2.1, 0], [0, 1.7]], 0.4, C.cream, { x, z: 7.1, y: 7.4 }));
      for (const s of [-1, 1]) p.push(cyl(0.22, 0.25, 4.4, C.cream, { x: x + s * 1.8, z: 7.55, y: 2.6, segments: 10 }), cone(0.23, 1.2, C.cream, { x: x + s * 2.05, z: 7.1, y: 8.2, segments: 8 }));
    }
    p.push(cyl(1.05, 1.05, 0.15, C.glass, { y: 7.6, z: 7.45, rx: PI / 2, segments: 16 }), torus(1.1, 0.14, C.gold, { y: 7.6, z: 7.55, radial: 5, segments: 16 }));
    // Tiny gold horses across the balcony give the facade its unmistakable festive silhouette.
    for (const x of [-2.7, -0.9, 0.9, 2.7]) {
      p.push(box(0.8, 0.32, 0.35, C.gold, { x, y: 6.55, z: 7.8 }), box(0.2, 0.6, 0.25, C.gold, { x: x + 0.35, y: 6.9, z: 7.8 }));
      for (const dx of [-0.27, 0.27]) p.push(box(0.09, 0.5, 0.22, C.gold, { x: x + dx, y: 6.15, z: 7.8 }));
    }
    return p;
  })(), { value: 65 });

  add('campanile', (() => {
    const p = [box(7.1, 1, 7.1, C.stone, { y: 0.5, surface: 'stone' }), box(5.7, 23, 5.7, C.brick, { y: 12, surface: 'brick' }), box(6.3, 0.6, 6.3, C.cream, { y: 23.7, surface: 'stone' }), box(6.2, 4.5, 6.2, C.cream, { y: 26, surface: 'stone' }), box(6.7, 0.5, 6.7, C.stone, { y: 28.5, surface: 'stone' }), box(5.3, 1.5, 5.3, C.cream, { y: 29.5, surface: 'stone' }), cone(4.1, 7.5, '#69a68f', { y: 34, segments: 4, ry: PI / 4, surface: 'roof' }), sphere(0.28, C.gold, { y: 38, segments: 8, rings: 5 }), cone(0.12, 1.1, C.gold, { y: 38.7, segments: 6 })];
    for (const s of [-1, 1]) for (const t of [-1, 1]) {
      p.push(box(0.2, 21.6, 0.2, '#dd9273', { x: s * 2.5, z: t * 2.5, y: 12 }));
      for (const a of [-1.2, 1.2]) p.push(extrude(arch(1.25, 3.2), 0.1, C.dark, { x: a, z: s * 3.14, y: 24.3 }), extrude(arch(1.25, 3.2), 0.1, C.dark, { x: s * 3.14, z: a, y: 24.3, ry: PI / 2 }));
    }
    return p;
  })(), { value: 32 });
  add('dogePalace', (() => {
    const p = [box(17, 9, 12, '#efc6b4', { y: 6, surface: 'stucco' }), box(17.6, 0.5, 12.6, C.cream, { y: 10.7, surface: 'stone' }), box(17.8, 0.45, 12.8, C.stone, { y: 0.225, surface: 'stone' })];
    for (let x = -7.7; x <= 7.7; x += 1.55) for (const s of [-1, 1]) {
      p.push(cyl(0.17, 0.23, 3.6, C.cream, { x, z: s * 5.9, y: 2, segments: 8 }), extrude(arch(1.05, 2.2), 0.08, C.glass, { x, z: s * 6.08, y: 4.2 }), box(0.45, 0.65, 0.4, C.cream, { x, z: s * 6, y: 11.1 }));
      if (Math.round((x + 7.7) / 1.55) % 2 === 0) p.push(extrude(arch(0.9, 1.6), 0.08, C.glass, { x, z: s * 6.08, y: 7.4 }));
    }
    for (let x = -7; x <= 7; x += 2) for (let y = 7.2; y < 10; y += 1.4) p.push(box(0.42, 0.42, 0.05, C.cream, { x, y, z: 6.07, rz: PI / 4 }));
    return p;
  })(), { value: 35 });
  return P;
}
