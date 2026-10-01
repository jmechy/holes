// Airport object prototypes. Vehicles / aircraft are length-along-X, nose/front toward +X.
import { paletteBuilders, makeProto, articulate } from './build.js';
import { facadeWall, recessedWindow } from './ModelDetails.js';
import { applyModelFinishes } from './ModelFinishes.js';

const C = {
  white: '#f4f4f4', gray: '#8d949b', dgray: '#5d646b', lgray: '#c3c8cd', dark: '#2b2b2e', tire: '#1f1f22', glass: '#8fd3f4',
  dglass: '#3c6f8f', red: '#d9302a', dred: '#a82320', blue: '#2f7fd6', dblue: '#1f4f9a', sky: '#5bb4ee', yellow: '#ffcc1a',
  orange: '#ff8a1a', green: '#3f9b4a', dgreen: '#2d7a38', skin: '#f1c8a0', silver: '#d5dade', beige: '#e8e2d0',
  brown: '#7a5230', purple: '#8a4fc7', pink: '#ee6fa5', teal: '#26a69a', navy: '#22315c', hivis: '#ff7a1a',
  tan: '#d8b26a', hair: '#5a3b22',
};
// Explicit material colors retain the map palette; per-part tags override these defaults.
const { box, cyl, cone, sphere, rbox, capsule, lathe, extrude, torus } = paletteBuilders([
  [C.glass, 'glass'],
  [C.dglass, 'glass'],
  [C.tire, 'rubber'],
  [C.silver, 'metal'],
  [C.red, 'paint'], [C.dred, 'paint'], [C.blue, 'paint'], [C.dblue, 'paint'], [C.yellow, 'paint'], [C.orange, 'paint'],
  [C.green, 'paint'], [C.dgreen, 'paint'], [C.purple, 'paint'], [C.teal, 'paint'], [C.sky, 'paint'], [C.navy, 'paint'],
  [C.white, 'paint'], ['#aeb6bd', 'paint'], ['#8d949b', 'paint'], ['#e0a800', 'paint'],
  [C.gray, 'metal'], [C.lgray, 'metal'], [C.dgray, 'metal'], [C.dark, 'metal'],
  [C.beige, 'stucco'], [C.hivis, 'fabric'],
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

const carParts = (body, roof = body) => [
  box(4.2, 0.2, 1.7, C.dark, { y: 0.4 }),
  rbox(4.4, 0.62, 1.9, body, { surface: 'paint', y: 0.74, segments: 2, bevel: 0.18 }),
  rbox(2.4, 0.72, 1.76, roof, { surface: 'paint', y: 1.4, x: -0.35, segments: 2, bevel: 0.22 }),
  box(2.0, 0.4, 1.8, C.glass, { y: 1.44, x: -0.35 }),
  box(0.05, 0.4, 1.5, C.glass, { y: 1.44, x: 0.86 }),
  box(0.05, 0.4, 1.5, C.glass, { y: 1.44, x: -1.56 }),
  box(0.06, 0.42, 1.82, roof, { surface: 'paint', y: 1.44, x: -0.35 }),
  rbox(1.9, 0.08, 1.55, C.lgray, { y: 1.78, x: -0.35, segments: 1, bevel: 0.03 }),
  rbox(0.22, 0.28, 1.95, C.silver, { y: 0.55, x: 2.2, segments: 1, bevel: 0.06 }),
  rbox(0.22, 0.28, 1.95, C.silver, { y: 0.55, x: -2.2, segments: 1, bevel: 0.06 }),
  box(0.06, 0.2, 0.8, C.dark, { y: 0.85, x: 2.21 }),
  box(0.1, 0.2, 0.42, '#fff6c8', { emissive: 0.8, y: 0.95, x: 2.2, z: 0.68 }), box(0.1, 0.2, 0.42, '#fff6c8', { emissive: 0.8, y: 0.95, x: 2.2, z: -0.68 }),
  box(0.1, 0.18, 0.38, '#e0201a', { y: 0.95, x: -2.2, z: 0.7 }), box(0.1, 0.18, 0.38, '#e0201a', { y: 0.95, x: -2.2, z: -0.7 }),
  box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: 0.5, z: 0.96 }), box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: -1.2, z: 0.96 }),
  box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: 0.5, z: -0.96 }), box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: -1.2, z: -0.96 }),
  box(0.16, 0.16, 0.14, body, { surface: 'paint', y: 1.3, x: 0.78, z: 1.0 }), box(0.16, 0.16, 0.14, body, { surface: 'paint', y: 1.3, x: 0.78, z: -1.0 }),
  ...wheel(1.4, 0.4, 0.92, 0.4, 0.32), ...wheel(1.4, 0.4, -0.92, 0.4, 0.32),
  ...wheel(-1.4, 0.4, 0.92, 0.4, 0.32), ...wheel(-1.4, 0.4, -0.92, 0.4, 0.32),
];

const suitcase = (color, trim) => [
  rbox(0.8, 0.62, 0.36, color, { y: 0.4, segments: 1, bevel: 0.07 }),
  rbox(0.82, 0.05, 0.38, trim, { y: 0.4, segments: 1, bevel: 0.02 }),
  ...[-0.22, 0.22].map((x) => box(0.05, 0.6, 0.38, trim, { y: 0.4, x })),
  rbox(0.34, 0.12, 0.08, C.dark, { y: 0.78, segments: 1, bevel: 0.03 }),
  box(0.05, 0.1, 0.05, C.dark, { y: 0.72, x: 0.15 }), box(0.05, 0.1, 0.05, C.dark, { y: 0.72, x: -0.15 }),
  cyl(0.06, 0.06, 0.06, C.dark, { y: 0.06, x: 0.3, z: 0.14, rx: PI / 2, segments: 8 }),
  cyl(0.06, 0.06, 0.06, C.dark, { y: 0.06, x: -0.3, z: 0.14, rx: PI / 2, segments: 8 }),
  cyl(0.06, 0.06, 0.06, C.dark, { y: 0.06, x: 0.3, z: -0.14, rx: PI / 2, segments: 8 }),
  cyl(0.06, 0.06, 0.06, C.dark, { y: 0.06, x: -0.3, z: -0.14, rx: PI / 2, segments: 8 }),
  box(0.14, 0.1, 0.02, C.white, { y: 0.5, x: 0.05, z: 0.19 }),
  box(0.1, 0.1, 0.02, C.yellow, { y: 0.32, x: -0.1, z: 0.19 }),
];

/** Swept planform in (x, s) with s = spanwise distance; mirrored to both sides. thickness t centred at height y. */
const wingPair = (pts, t, y, color) => [
  extrude(pts.map(([x, s]) => [x, -s]), t, color, { y, rx: -PI / 2, bevel: t * 0.15, segments: 1 }),
  extrude(pts.map(([x, s]) => [x, s]), t, color, { y, rx: -PI / 2, bevel: t * 0.15, segments: 1 }),
];

const nacelle = (x, y, z, er, color, ring) => [
  lathe([[er * 0.86, 0], [er * 0.98, er * 0.4], [er, er * 1.2], [er * 0.92, er * 2.6], [er * 0.6, er * 3.4], [er * 0.2, er * 3.6]], color, { x: x - er * 1.7, y, z, rz: -PI / 2, segments: 14 }),
  cyl(er * 0.78, er * 0.78, er * 0.12, C.dark, { x: x + er * 1.7, y, z, rz: PI / 2, segments: 12 }),
  cyl(er * 1.02, er * 1.02, er * 0.3, ring, { x: x + er * 1.0, y, z, rz: PI / 2, segments: 14 }),
  cone(er * 0.22, er * 0.5, C.silver, { x: x + er * 1.75, y, z, rz: -PI / 2, segments: 8 }),
  box(er * 1.8, er * 0.15, er * 0.4, C.lgray, { x: x - er * 0.2, y: y + er * 0.9, z }),
];

/**
 * Airliner along X. o = { len, fr (fuselage radius), span, engines: [[x,z]...], er, body, stripe, tail }
 */
const plane = (o) => {
  const { len, fr, span, engines, er, body = C.white, stripe = C.blue, tail = C.blue, winglets = true } = o;
  const gear = fr * 0.55;
  const y0 = gear + fr;
  const yw = y0 - fr * 0.55;
  const p = [
    // fuselage: lathe with a tapered tail and rounded nose (profile y -> world x after rotation)
    lathe([
      [fr * 0.12, 0], [fr * 0.3, len * 0.04], [fr * 0.6, len * 0.12], [fr * 0.88, len * 0.22], [fr, len * 0.32], [fr, len * 0.76],
      [fr * 0.96, len * 0.86], [fr * 0.8, len * 0.94], [fr * 0.5, len * 0.985], [0, len],
    ], body, { x: -len / 2, y: y0, rz: -PI / 2, segments: 16 }),
    // livery: coloured cheat line and belly
    cyl(fr * 1.012, fr * 1.012, len * 0.62, stripe, { y: y0 - fr * 0.05, x: len * 0.0, rz: PI / 2, sx: 0.28, segments: 16 }),
    cyl(fr * 0.98, fr * 0.98, len * 0.58, C.lgray, { y: y0 - fr * 0.42, x: 0, rz: PI / 2, sx: 0.4, sz: 1.02, segments: 12 }),
    // cockpit windshield
    box(fr * 0.28, fr * 0.26, fr * 1.15, C.dglass, { y: y0 + fr * 0.42, x: len * 0.435, rz: -0.35 }),
    box(fr * 0.4, fr * 0.24, fr * 0.06, C.dglass, { y: y0 + fr * 0.38, x: len * 0.42, z: fr * 0.86 }),
    box(fr * 0.4, fr * 0.24, fr * 0.06, C.dglass, { y: y0 + fr * 0.38, x: len * 0.42, z: -fr * 0.86 }),
    // wings: swept, with flaps and tip fences
    ...wingPair([[len * 0.1, fr * 0.7], [-len * 0.14, span / 2], [-len * 0.2, span / 2], [-len * 0.13, fr * 0.7]], fr * 0.16, yw, C.lgray),
    ...wingPair([[-len * 0.09, fr * 0.9], [-len * 0.17, span * 0.46], [-len * 0.2, span * 0.46], [-len * 0.13, fr * 0.9]], fr * 0.17, yw - 0.01, body),
    // tail fin + rudder + stabilisers
    extrude([[0, 0], [len * 0.15, 0], [len * 0.06, fr * 3.3], [-len * 0.01, fr * 3.3]], fr * 0.18, tail, { y: y0 + fr * 0.55, x: -len * 0.5 + len * 0.06, bevel: fr * 0.02, segments: 1 }),
    ...wingPair([[-len * 0.34, fr * 0.3], [-len * 0.44, span * 0.18], [-len * 0.48, span * 0.18], [-len * 0.45, fr * 0.3]], fr * 0.1, y0 + fr * 0.3, C.lgray),
    // nose gear + main gear
    cyl(fr * 0.07, fr * 0.07, gear + fr * 0.5, C.gray, { y: (gear + fr * 0.5) / 2, x: len * 0.3, segments: 8 }),
    ...wheel(len * 0.3, fr * 0.3, fr * 0.17, fr * 0.3, fr * 0.16),
    ...wheel(len * 0.3, fr * 0.3, -fr * 0.17, fr * 0.3, fr * 0.16),
  ];
  for (const z of [1, -1]) {
    p.push(
      cyl(fr * 0.08, fr * 0.08, gear + fr * 0.5, C.gray, { y: (gear + fr * 0.5) / 2 + fr * 0.1, x: -len * 0.04, z: z * fr * 0.75, segments: 8 }),
      ...wheel(-len * 0.04, fr * 0.3, z * fr * 0.75 + fr * 0.22, fr * 0.3, fr * 0.2),
      ...wheel(-len * 0.04, fr * 0.3, z * fr * 0.75 - fr * 0.22, fr * 0.3, fr * 0.2),
    );
  }
  // passenger windows along both sides
  const n = Math.floor(len * 0.5 / (fr * 0.75));
  for (let i = 0; i < n; i++) {
    const x = -len * 0.28 + i * (fr * 0.75);
    p.push(box(fr * 0.28, fr * 0.3, fr * 2.02, C.dglass, { y: y0 + fr * 0.28, x, sz: 1 }));
  }
  // doors
  p.push(box(fr * 0.6, fr * 1.0, fr * 2.04, C.lgray, { y: y0 + fr * 0.05, x: len * 0.3, sx: 1, sz: 1 }));
  if (winglets) {
    p.push(
      box(len * 0.05, fr * 0.7, fr * 0.06, stripe, { y: yw + fr * 0.35, x: -len * 0.16, z: span / 2 - fr * 0.05 }),
      box(len * 0.05, fr * 0.7, fr * 0.06, stripe, { y: yw + fr * 0.35, x: -len * 0.16, z: -span / 2 + fr * 0.05 }),
    );
  }
  for (const [ex, ez] of engines) p.push(...nacelle(len * 0.02 + ex, y0 - fr * 0.95 - er * 0.1, ez, er, C.silver, stripe));
  return p;
};

export function buildProtos() {
  const P = {};
  const add = (name, parts, opts) => (P[name] = applyModelFinishes(makeProto(name, parts.flat(), opts), 'industrial'));

  add('car', carParts(C.red), { value: 2.2 });
  add('carBlue', carParts(C.blue, C.dblue), { value: 2.2 });
  add('carWhite', carParts(C.white, C.lgray), { value: 2.2 });
  add('carSilver', carParts('#aeb6bd', '#8d949b'), { value: 2.2 });
  add('taxi', [...carParts(C.yellow, '#e0a800'), rbox(0.5, 0.2, 0.9, C.white, { emissive: 1.2, y: 1.95, x: -0.35, segments: 1, bevel: 0.05 }), box(0.06, 0.1, 1.5, C.dark, { y: 0.9, x: 0.2, z: 0 })], { value: 2.4 });

  add('suitcase', suitcase(C.red, C.dark), { value: 0.3 });
  add('suitcaseBlue', suitcase(C.blue, C.silver), { value: 0.3 });
  add('suitcaseGreen', suitcase(C.green, C.dark), { value: 0.3 });
  add('suitcaseYellow', suitcase(C.yellow, C.brown), { value: 0.3 });
  add('suitcasePurple', suitcase(C.purple, C.silver), { value: 0.3 });

  add('cone', [
    rbox(0.9, 0.09, 0.9, C.dark, { y: 0.045, segments: 1, bevel: 0.03 }),
    cyl(0.08, 0.32, 0.9, C.orange, { y: 0.54, segments: 14 }),
    cyl(0.17, 0.2, 0.14, C.white, { y: 0.5, segments: 14 }),
    cyl(0.12, 0.15, 0.1, C.white, { y: 0.74, segments: 12 }),
    sphere(0.09, C.orange, { y: 1.0, segments: 8, rings: 5 }),
  ], { value: 0.25 });

  add('crew', (() => {
    const p = [];
    for (const side of [-1, 1]) {
      const hip = [0, 0.56, side * 0.11], knee = [0, 0.3, side * 0.11], lo = { side, hip };
      p.push(
        articulate(cyl(0.1, 0.09, 0.3, C.navy, { y: 0.41, z: side * 0.11, segments: 8, flat: false, surface: 'fabric' }), 'leg', hip, lo),
        articulate(cyl(0.09, 0.085, 0.3, C.navy, { y: 0.17, z: side * 0.11, segments: 8, flat: false, surface: 'fabric' }), 'shin', knee, lo),
        articulate(box(0.32, 0.12, 0.17, C.dark, { y: 0.06, x: 0.05, z: side * 0.11, surface: 'rubber' }), 'shin', knee, lo),
        // sleeve + marshalling wand swing together about the shoulder
        ...[
          cyl(0.07, 0.065, 0.55, C.hivis, { y: 0.88, z: side * 0.31, rx: side * 0.25, segments: 8, flat: false, surface: 'fabric' }),
          box(0.05, 0.05, 0.4, C.orange, { y: 0.66, z: side * 0.42, x: 0.1, surface: 'paint' }),
        ].map((g) => articulate(g, 'arm', [0, 1.1, side * 0.3], { side })),
      );
    }
    p.push(
      cyl(0.22, 0.26, 0.6, C.hivis, { y: 0.85, segments: 10, surface: 'fabric' }),
      cyl(0.235, 0.27, 0.07, C.silver, { y: 0.72, segments: 10, surface: 'fabric', textureStrength: 0.3 }),
      cyl(0.225, 0.245, 0.07, C.silver, { y: 0.96, segments: 10, surface: 'fabric', textureStrength: 0.3 }),
      sphere(0.19, C.skin, { y: 1.37, segments: 10, rings: 8 }),
      sphere(0.05, C.skin, { y: 1.34, x: 0.19, segments: 6, rings: 4 }),
      box(0.04, 0.05, 0.05, C.dark, { y: 1.39, x: 0.17, z: 0.08 }),
      box(0.04, 0.05, 0.05, C.dark, { y: 1.39, x: 0.17, z: -0.08 }),
      sphere(0.19, C.hair, { y: 1.42, x: -0.06, sy: 0.85, segments: 8, rings: 6, flat: false }),
      // ear defenders
      cyl(0.1, 0.1, 0.05, C.red, { y: 1.38, z: 0.2, rx: PI / 2, segments: 8 }),
      cyl(0.1, 0.1, 0.05, C.red, { y: 1.38, z: -0.2, rx: PI / 2, segments: 8 }),
      torus(0.2, 0.025, C.dark, { y: 1.45, ry: PI / 2, radial: 4, segments: 10 }),
    );
    return p;
  })(), { value: 0.6, move: { type: 'walk', speed: 1.5, range: 10 } });

  add('chock', [
    extrude([[-0.3, 0], [0.3, 0], [0.3, 0.12], [0.0, 0.3], [-0.3, 0.3]], 0.4, C.yellow, { bevel: 0.02, segments: 1 }),
    ...[-0.15, 0.05, 0.25].map((x) => box(0.06, 0.05, 0.42, C.dark, { y: 0.28 - (x + 0.3) * 0.3, x: x - 0.1, rz: 0.4 })),
    torus(0.12, 0.025, C.dark, { y: 0.25, x: -0.32, ry: PI / 2, radial: 4, segments: 10 }),
    box(0.62, 0.03, 0.06, C.dark, { y: 0.02, z: 0.14 }),
  ], { value: 0.2 });

  add('cart', [
    rbox(3.0, 0.15, 1.4, C.dark, { y: 0.55, segments: 1, bevel: 0.05 }),
    box(3.0, 0.04, 1.4, C.gray, { y: 0.65 }),
    box(0.1, 1.1, 1.4, C.gray, { y: 1.15, x: -1.45 }),
    ...[0.68, -0.68].map((z) => box(3.0, 0.06, 0.06, C.gray, { y: 1.0, z })),
    ...[-1.4, -0.4, 0.6, 1.4].flatMap((x) => [0.68, -0.68].map((z) => box(0.06, 0.6, 0.06, C.gray, { y: 0.98, x, z }))),
    box(0.2, 0.08, 0.5, C.dark, { y: 0.5, x: 1.7 }),
    box(0.8, 0.05, 0.05, C.dark, { y: 0.5, x: 1.95 }),
    rbox(1.0, 0.6, 0.6, C.red, { y: 1.0, x: -0.9, z: 0.35, segments: 1, bevel: 0.08 }),
    rbox(1.0, 0.6, 0.6, C.blue, { y: 1.0, x: 0.2, z: -0.35, segments: 1, bevel: 0.08 }),
    rbox(0.9, 0.6, 0.6, C.green, { y: 1.0, x: 0.9, z: 0.35, segments: 1, bevel: 0.08 }),
    rbox(0.9, 0.5, 0.6, C.yellow, { y: 1.55, x: -0.5, z: -0.35, segments: 1, bevel: 0.08 }),
    box(0.2, 0.1, 0.6, C.white, { y: 1.85, x: -0.5, z: -0.35 }),
    ...wheel(1.2, 0.25, 0.65, 0.25, 0.2), ...wheel(1.2, 0.25, -0.65, 0.25, 0.2),
    ...wheel(-1.2, 0.25, 0.65, 0.25, 0.2), ...wheel(-1.2, 0.25, -0.65, 0.25, 0.2),
  ], { value: 1.0 });

  // ---------- small airfield furniture (placed in orderly rows by the map) ----------
  add('lamp', [
    cyl(0.16, 0.2, 0.2, C.dgray, { y: 0.1, segments: 8 }),
    cyl(0.07, 0.1, 3.2, C.gray, { y: 1.7, segments: 8 }),
    box(0.9, 0.12, 0.3, C.dgray, { y: 3.35, x: 0.25 }),
    box(0.7, 0.05, 0.22, '#fff3b0', { y: 3.27, x: 0.3, emissive: 1.2 }),
  ], { value: 0.4 });
  add('bollard', [
    cyl(0.17, 0.17, 0.75, C.yellow, { y: 0.4, segments: 10 }),
    cyl(0.18, 0.18, 0.1, C.dark, { y: 0.55, segments: 10 }),
    sphere(0.17, C.yellow, { y: 0.78, sy: 0.5, segments: 10, rings: 4 }),
  ], { value: 0.2 });
  add('trashCan', [
    cyl(0.34, 0.28, 0.85, C.dgreen, { y: 0.45, segments: 12 }),
    cyl(0.37, 0.37, 0.1, C.dgray, { y: 0.92, segments: 12 }),
    box(0.3, 0.05, 0.06, C.dark, { y: 0.7, x: 0.3 }),
  ], { value: 0.3 });
  add('bench', [
    box(1.8, 0.1, 0.55, C.brown, { y: 0.5 }),
    box(1.8, 0.45, 0.08, C.brown, { y: 0.8, z: -0.24, rx: -0.12 }),
    box(0.1, 0.5, 0.5, C.dgray, { y: 0.25, x: 0.8 }), box(0.1, 0.5, 0.5, C.dgray, { y: 0.25, x: -0.8 }),
  ], { value: 0.5 });
  add('hedge', [
    rbox(2.8, 0.9, 0.9, C.dgreen, { y: 0.45, bevel: 0.2, segments: 2, surface: 'foliage' }),
    rbox(2.2, 0.35, 0.7, C.green, { y: 0.95, bevel: 0.15, segments: 2, surface: 'foliage' }),
  ], { value: 0.6 });
  add('bush', [
    sphere(0.55, C.dgreen, { y: 0.5, sy: 0.85, segments: 10, rings: 7, surface: 'foliage' }),
    sphere(0.38, C.green, { y: 0.55, x: 0.4, z: 0.2, segments: 8, rings: 5, surface: 'foliage' }),
    sphere(0.34, C.green, { y: 0.45, x: -0.35, z: -0.25, segments: 8, rings: 5, surface: 'foliage' }),
  ], { value: 0.3 });
  add('fenceSeg', [
    box(3.6, 0.5, 0.04, C.lgray, { y: 0.8, surface: 'metal', textureStrength: 0.3 }),
    box(3.6, 0.06, 0.06, C.gray, { y: 1.1 }), box(3.6, 0.06, 0.06, C.gray, { y: 0.45 }),
    ...[-1.8, 0, 1.8].map((x) => cyl(0.05, 0.05, 1.2, C.gray, { y: 0.6, x, segments: 6 })),
  ], { value: 0.7 });
  add('trolley', [
    ...[0.38, -0.38].map((z) => box(1.0, 0.04, 0.04, C.silver, { y: 0.9, z })),
    box(0.04, 0.6, 0.8, C.silver, { y: 0.55, x: -0.5 }), box(1.0, 0.04, 0.8, C.silver, { y: 0.28 }),
    box(0.9, 0.04, 0.8, C.gray, { y: 0.55 }),
    ...[0.35, -0.35].flatMap((z) => [0.4, -0.4].map((x) => cyl(0.07, 0.07, 0.06, C.tire, { y: 0.07, x, z, rx: PI / 2, segments: 8 }))),
  ], { value: 0.35 });
  add('gpu', [
    rbox(1.1, 0.8, 0.7, C.orange, { y: 0.6, segments: 1, bevel: 0.08, surface: 'paint' }),
    box(0.5, 0.2, 0.4, C.dark, { y: 1.1, x: -0.1 }),
    ...wheel(0.4, 0.15, 0.4, 0.15, 0.1), ...wheel(0.4, 0.15, -0.4, 0.15, 0.1),
    box(0.8, 0.04, 0.04, C.dark, { y: 0.4, x: 0.9 }),
  ], { value: 0.6 });
  add('windsock', [
    cyl(0.07, 0.1, 4.0, C.silver, { y: 2.0, segments: 8 }),
    ...[0, 1, 2, 3].map((i) => cyl(0.45 - i * 0.08, 0.5 - i * 0.08, 0.5, i % 2 ? C.white : C.orange, { y: 3.9, x: 0.35 + i * 0.5, rz: PI / 2, segments: 10 })),
  ], { value: 0.8 });

  add('tug', [
    rbox(3.4, 0.5, 1.6, C.red, { y: 0.6, segments: 1, bevel: 0.12 }),
    rbox(1.4, 1.1, 1.5, C.red, { y: 1.4, x: 0.6, segments: 1, bevel: 0.15 }),
    box(1.2, 0.6, 1.54, C.glass, { y: 1.55, x: 0.6 }),
    box(0.05, 0.6, 1.3, C.glass, { y: 1.55, x: 1.32 }),
    rbox(1.6, 0.12, 1.6, C.yellow, { y: 2.0, x: 0.6, segments: 1, bevel: 0.04 }),
    ...[[-0.15, 0.7], [1.35, 0.7], [-0.15, -0.7], [1.35, -0.7]].map(([x, z]) => box(0.07, 0.6, 0.07, C.dark, { y: 1.6, x, z })),
    rbox(0.9, 0.5, 1.4, C.dgray, { y: 0.95, x: -1.0, segments: 1, bevel: 0.08 }),
    box(0.4, 0.15, 0.3, C.orange, { y: 2.15, x: 0.6 }),
    rbox(0.2, 0.3, 1.6, C.dark, { y: 0.45, x: 1.75, segments: 1, bevel: 0.05 }),
    box(0.06, 0.2, 0.3, '#fff6c8', { emissive: 0.8, y: 0.75, x: 1.72, z: 0.5 }), box(0.06, 0.2, 0.3, '#fff6c8', { emissive: 0.8, y: 0.75, x: 1.72, z: -0.5 }),
    box(0.3, 0.15, 0.3, C.dark, { y: 0.4, x: -1.85 }),
    ...wheel(1.1, 0.4, 0.85, 0.4, 0.3), ...wheel(1.1, 0.4, -0.85, 0.4, 0.3),
    ...wheel(-1.1, 0.4, 0.85, 0.4, 0.3), ...wheel(-1.1, 0.4, -0.85, 0.4, 0.3),
  ], { value: 2 });

  add('followme', [
    box(4.2, 0.2, 1.7, C.dark, { y: 0.4 }),
    rbox(4.4, 0.62, 1.9, C.yellow, { y: 0.74, segments: 2, bevel: 0.18 }),
    rbox(2.3, 0.7, 1.76, C.yellow, { y: 1.4, x: -0.3, segments: 2, bevel: 0.22 }),
    box(2.0, 0.4, 1.8, C.glass, { y: 1.44, x: -0.3 }),
    box(0.05, 0.4, 1.5, C.glass, { y: 1.44, x: 0.86 }),
    box(0.05, 0.4, 1.5, C.glass, { y: 1.44, x: -1.46 }),
    rbox(0.22, 0.28, 1.95, C.dark, { y: 0.55, x: 2.2, segments: 1, bevel: 0.06 }),
    rbox(0.22, 0.28, 1.95, C.dark, { y: 0.55, x: -2.2, segments: 1, bevel: 0.06 }),
    box(0.1, 0.2, 0.4, '#fff6c8', { emissive: 0.8, y: 0.95, x: 2.2, z: 0.68 }), box(0.1, 0.2, 0.4, '#fff6c8', { emissive: 0.8, y: 0.95, x: 2.2, z: -0.68 }),
    box(0.1, 0.18, 0.38, '#e0201a', { y: 0.95, x: -2.2, z: 0.7 }), box(0.1, 0.18, 0.38, '#e0201a', { y: 0.95, x: -2.2, z: -0.7 }),
    // FOLLOW ME sign on the roof
    box(0.16, 0.5, 0.16, C.dark, { y: 1.95, x: -0.2, z: 0.5 }), box(0.16, 0.5, 0.16, C.dark, { y: 1.95, x: -0.2, z: -0.5 }),
    rbox(0.3, 0.55, 1.7, C.dark, { y: 2.45, x: -0.2, segments: 1, bevel: 0.05 }),
    rbox(0.34, 0.4, 1.5, C.green, { emissive: 1.2, y: 2.45, x: -0.2, segments: 1, bevel: 0.04 }),
    box(0.36, 0.14, 1.0, C.yellow, { emissive: 1.2, y: 2.45, x: -0.2 }),
    // checkered stripe
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => box(0.4, 0.04, 0.22, i % 2 ? C.dark : C.white, { y: 1.83, x: -0.3 + (i % 2) * 0.4, z: (i - 3.5) * 0.22 })),
    ...wheel(1.4, 0.4, 0.92, 0.4, 0.32), ...wheel(1.4, 0.4, -0.92, 0.4, 0.32),
    ...wheel(-1.4, 0.4, 0.92, 0.4, 0.32), ...wheel(-1.4, 0.4, -0.92, 0.4, 0.32),
  ], { value: 3 });

  add('fueltruck', [
    rbox(9.6, 0.6, 2.6, C.dark, { y: 1.1, segments: 1, bevel: 0.15 }),
    rbox(2.2, 2.0, 2.4, C.white, { y: 2.3, x: 3.8, segments: 2, bevel: 0.25 }),
    rbox(0.2, 0.9, 2.2, C.glass, { y: 2.8, x: 4.85, segments: 1, bevel: 0.05 }),
    box(1.2, 0.8, 2.44, C.glass, { y: 2.8, x: 3.8 }),
    rbox(0.4, 0.4, 2.7, C.red, { y: 0.9, x: 5.0, segments: 1, bevel: 0.08 }),
    box(0.1, 0.24, 0.5, '#fff6c8', { emissive: 0.8, y: 1.3, x: 5.24, z: 1.0 }), box(0.1, 0.24, 0.5, '#fff6c8', { emissive: 0.8, y: 1.3, x: 5.24, z: -1.0 }),
    // tank: lathe barrel on its side with hoops and red band
    lathe([[0.9, 0], [1.3, 0.25], [1.42, 0.7], [1.42, 5.5], [1.3, 5.95], [0.9, 6.2]], C.silver, { x: -4.4, y: 2.65, rz: -PI / 2, segments: 18 }),
    cyl(1.45, 1.45, 1.0, C.red, { y: 2.65, x: -1.3, rz: PI / 2, segments: 18 }),
    ...[-3.6, -2.2, 0.6, 1.2].map((x) => torus(1.43, 0.05, C.gray, { y: 2.65, x, ry: PI / 2, radial: 4, segments: 18 })),
    cyl(0.4, 0.4, 0.3, C.gray, { y: 4.1, x: -1.3, segments: 12 }),
    cyl(0.1, 0.1, 0.5, C.dark, { y: 4.4, x: -1.3, segments: 8 }),
    box(3.5, 0.06, 0.5, C.dgray, { y: 4.1, x: -2.5, z: 0 }),
    ...[-1.3, -3.4].map((x) => box(0.05, 0.4, 0.4, C.dgray, { y: 4.2, x, z: 0.3 })),
    // hoses + rear cabinet
    cyl(0.15, 0.15, 1.6, C.yellow, { y: 1.5, x: -4.7, rz: PI / 2, segments: 8 }),
    rbox(0.5, 1.0, 2.4, C.dgray, { y: 1.9, x: -5.0, segments: 1, bevel: 0.05 }),
    box(0.15, 0.6, 0.15, C.red, { y: 1.8, x: -5.4, z: 0.8 }),
    box(0.06, 0.6, 0.6, C.orange, { y: 3.4, x: 0.0, z: 1.45 }),
    ...wheel(3.6, 0.9, 1.4, 0.9, 0.7), ...wheel(3.6, 0.9, -1.4, 0.9, 0.7),
    ...wheel(-2.6, 0.9, 1.4, 0.9, 0.7), ...wheel(-2.6, 0.9, -1.4, 0.9, 0.7),
    ...wheel(-4.0, 0.9, 1.4, 0.9, 0.7), ...wheel(-4.0, 0.9, -1.4, 0.9, 0.7),
  ], { value: 9 });

  add('cateringtruck', [
    rbox(8, 0.6, 2.6, C.dark, { y: 1.1, segments: 1, bevel: 0.15 }),
    rbox(2.2, 1.9, 2.4, C.blue, { y: 2.15, x: 3.0, segments: 2, bevel: 0.25 }),
    box(0.1, 0.9, 2.2, C.glass, { y: 2.6, x: 4.1 }),
    box(1.1, 0.8, 2.44, C.glass, { y: 2.6, x: 3.0 }),
    rbox(5.2, 2.6, 2.6, C.white, { y: 3.3, x: -1.7, segments: 1, bevel: 0.15 }),
    rbox(5.22, 0.4, 2.62, C.blue, { y: 2.3, x: -1.7, segments: 1, bevel: 0.05 }),
    ...[-3.5, -2.5, -1.5, -0.5].map((x) => box(0.06, 1.8, 0.05, C.lgray, { y: 3.5, x, z: 1.31 })),
    box(0.06, 1.2, 1.6, C.glass, { y: 3.6, x: 0.93 }),
    rbox(5.4, 0.15, 2.8, C.lgray, { y: 4.68, x: -1.7, segments: 1, bevel: 0.05 }),
    // scissor lift + platform at the rear
    box(0.3, 1.8, 0.1, C.gray, { y: 2.0, x: -4.3, z: 1.0, rz: 0.5 }), box(0.3, 1.8, 0.1, C.gray, { y: 2.0, x: -4.3, z: -1.0, rz: -0.5 }),
    box(0.3, 1.8, 0.1, C.gray, { y: 2.0, x: -4.3, z: 1.0, rz: -0.5 }), box(0.3, 1.8, 0.1, C.gray, { y: 2.0, x: -4.3, z: -1.0, rz: 0.5 }),
    rbox(1.2, 0.12, 2.4, C.silver, { y: 3.0, x: -4.9, segments: 1, bevel: 0.03 }),
    box(0.06, 0.5, 2.4, C.dgray, { y: 3.35, x: -5.45 }),
    box(1.2, 0.5, 0.05, C.dgray, { y: 3.3, x: -4.9, z: 1.2 }), box(1.2, 0.5, 0.05, C.dgray, { y: 3.3, x: -4.9, z: -1.2 }),
    box(0.1, 0.22, 0.4, '#e0201a', { y: 1.0, x: -4.05, z: 1.0 }),
    ...wheel(3.0, 0.8, 1.3, 0.8, 0.6), ...wheel(3.0, 0.8, -1.3, 0.8, 0.6),
    ...wheel(-2.8, 0.8, 1.3, 0.8, 0.6), ...wheel(-2.8, 0.8, -1.3, 0.8, 0.6),
  ], { value: 7 });

  add('stairtruck', [
    rbox(4.4, 0.6, 2.4, C.dark, { y: 1.0, segments: 1, bevel: 0.12 }),
    rbox(2.2, 1.7, 2.2, C.orange, { y: 2.0, x: 1.6, segments: 2, bevel: 0.22 }),
    box(0.1, 0.8, 2.0, C.glass, { y: 2.4, x: 2.72 }),
    box(1.0, 0.7, 2.24, C.glass, { y: 2.4, x: 1.6 }),
    // stairs: sloped stringers + treads + rails
    ...[1.0, -1.0].map((z) => box(6.6, 0.2, 0.15, C.silver, { y: 2.35, x: -0.95, z, rz: 0.63 })),
    ...Array.from({ length: 9 }, (_, i) => box(0.5, 0.06, 1.9, C.lgray, { y: 0.9 + i * 0.38, x: -3.4 + i * 0.6 })),
    ...[0.95, -0.95].map((z) => box(6.3, 0.05, 0.08, C.gray, { y: 3.0, x: -0.95, z, rz: 0.63 })),
    ...[0.95, -0.95].map((z) => box(6.3, 0.05, 0.08, C.gray, { y: 2.6, x: -0.95, z, rz: 0.63 })),
    // platform + canopy
    rbox(1.8, 0.2, 2.2, C.silver, { y: 4.2, x: 1.6, segments: 1, bevel: 0.04 }),
    ...[[2.4, 1.0], [2.4, -1.0]].map(([x, z]) => box(0.12, 1.0, 0.12, C.gray, { y: 4.8, x, z })),
    box(0.1, 0.1, 2.0, C.red, { y: 5.3, x: 2.4 }),
    box(1.6, 0.06, 0.1, C.gray, { y: 5.3, x: 1.6, z: 1.0 }), box(1.6, 0.06, 0.1, C.gray, { y: 5.3, x: 1.6, z: -1.0 }),
    box(0.3, 3.3, 0.3, C.gray, { y: 2.5, x: 1.6 }),
    box(0.3, 0.1, 0.5, C.yellow, { y: 0.9, x: -3.4 }),
    ...wheel(1.6, 0.6, 1.2, 0.6, 0.5), ...wheel(1.6, 0.6, -1.2, 0.6, 0.5),
    ...wheel(-1.6, 0.6, 1.2, 0.6, 0.5), ...wheel(-1.6, 0.6, -1.2, 0.6, 0.5),
  ], { value: 6 });

  add('helicopter', [
    lathe([[0, 0], [0.9, 0.2], [1.3, 0.9], [1.4, 1.9], [1.2, 2.9], [0.6, 3.5], [0, 3.6]], C.red, { x: -1.7, y: 1.9, rz: -PI / 2, sy: 1, sz: 0.95, segments: 14 }),
    rbox(1.2, 0.9, 1.7, C.glass, { y: 2.2, x: 1.0, segments: 1, bevel: 0.2 }),
    box(1.0, 0.06, 1.5, C.dglass, { y: 2.68, x: 1.0 }),
    box(0.06, 0.9, 0.06, C.dark, { y: 2.2, x: 0.5, z: 0.8 }), box(0.06, 0.9, 0.06, C.dark, { y: 2.2, x: 0.5, z: -0.8 }),
    // tail boom (tapered), fin, tail rotor
    cyl(0.45, 0.14, 4.6, C.red, { y: 2.2, x: -3.7, rz: PI / 2, segments: 10 }),
    extrude([[0, 0], [0.9, 0], [0.5, 1.4], [0.1, 1.4]], 0.12, C.red, { y: 2.2, x: -6.0, bevel: 0.01, segments: 1 }),
    box(0.08, 1.0, 0.1, C.dark, { y: 3.0, x: -5.7, z: 0.15, rx: 0.5 }), box(0.08, 1.0, 0.1, C.dark, { y: 3.0, x: -5.7, z: 0.15, rx: -0.5 }),
    box(1.6, 0.1, 0.5, C.lgray, { y: 2.4, x: -5.2, sz: 1 }),
    // main rotor
    cyl(0.16, 0.2, 0.55, C.dark, { y: 3.35, segments: 8 }),
    cyl(0.32, 0.32, 0.1, C.dgray, { y: 3.65, segments: 10 }),
    box(7.6, 0.06, 0.35, C.dark, { y: 3.72 }),
    box(0.35, 0.06, 7.6, C.dark, { y: 3.74 }),
    // skids with struts
    cyl(0.07, 0.07, 3.4, C.dark, { y: 0.15, x: 0.2, z: 0.95, rz: PI / 2, segments: 8 }),
    cyl(0.07, 0.07, 3.4, C.dark, { y: 0.15, x: 0.2, z: -0.95, rz: PI / 2, segments: 8 }),
    box(0.1, 1.0, 0.1, C.dark, { y: 0.7, x: 1.0, z: 0.9, rx: -0.15 }), box(0.1, 1.0, 0.1, C.dark, { y: 0.7, x: -0.7, z: 0.9, rx: -0.15 }),
    box(0.1, 1.0, 0.1, C.dark, { y: 0.7, x: 1.0, z: -0.9, rx: 0.15 }), box(0.1, 1.0, 0.1, C.dark, { y: 0.7, x: -0.7, z: -0.9, rx: 0.15 }),
    box(2.0, 0.1, 1.6, C.white, { y: 1.55, x: -0.3 }),
    box(0.04, 0.06, 2.6, C.white, { y: 1.9, x: -1.0 }),
  ], { value: 6 });

  // propeller plane
  const prop = (body, accent, wingC) => (() => {
    const len = 8, fr = 0.75, span = 10.5, gear = 0.55, y0 = gear + fr;
    return [
      lathe([[0.1, 0], [0.3, 0.6], [0.6, 1.6], [fr, 3.0], [fr, 5.2], [fr * 0.92, 6.2], [fr * 0.6, 7.2], [0.4, 8]], body, { x: -len / 2, y: y0, rz: -PI / 2, segments: 14 }),
      cyl(fr * 1.01, fr * 1.01, 3.2, accent, { y: y0 - 0.05, x: -0.2, rz: PI / 2, sx: 0.25, segments: 14 }),
      // cowling + spinner + propeller
      cyl(fr * 0.9, fr * 0.8, 0.9, C.silver, { y: y0, x: len / 2 + 0.2, rz: PI / 2, segments: 14 }),
      cone(0.28, 0.6, accent, { y: y0, x: len / 2 + 0.95, rz: -PI / 2, segments: 12 }),
      extrude([[-0.08, -1.7], [0.08, -1.7], [0.14, 0], [0.08, 1.7], [-0.08, 1.7], [-0.14, 0]], 0.05, C.dark, { y: y0, x: len / 2 + 0.72, ry: PI / 2, rz: 0.3, segments: 1 }),
      extrude([[-0.08, -1.7], [0.08, -1.7], [0.14, 0], [0.08, 1.7], [-0.08, 1.7], [-0.14, 0]], 0.05, C.dark, { y: y0, x: len / 2 + 0.72, ry: PI / 2, rz: 0.3 + PI / 2, segments: 1 }),
      // canopy
      sphere(0.6, C.dglass, { y: y0 + 0.55, x: 0.5, sx: 1.5, sy: 0.7, sz: 0.85, segments: 10, rings: 7 }),
      // high wing with struts, tail
      ...wingPair([[0.9, fr * 0.6], [0.7, span / 2], [-0.6, span / 2], [-0.8, fr * 0.6]], 0.14, y0 + fr + 0.35, wingC),
      box(0.1, 1.3, 0.1, C.gray, { y: y0 + 0.4, x: 0.5, z: 1.9, rx: 0.5 }), box(0.1, 1.3, 0.1, C.gray, { y: y0 + 0.4, x: 0.5, z: -1.9, rx: -0.5 }),
      extrude([[0, 0], [1.3, 0], [0.6, 1.5], [0.1, 1.5]], 0.12, accent, { y: y0 + 0.2, x: -len / 2 + 0.2, bevel: 0.01, segments: 1 }),
      ...wingPair([[-3.0, 0.3], [-3.6, 2.0], [-3.9, 2.0], [-3.8, 0.3]], 0.1, y0 + 0.15, wingC),
      // gear with spats
      cyl(0.06, 0.06, 0.9, C.gray, { y: 0.55, x: 1.0, z: 0.7, rx: 0.3, segments: 8 }), cyl(0.06, 0.06, 0.9, C.gray, { y: 0.55, x: 1.0, z: -0.7, rx: -0.3, segments: 8 }),
      ...wheel(1.0, 0.3, 0.95, 0.3, 0.18), ...wheel(1.0, 0.3, -0.95, 0.3, 0.18),
      ...wheel(-3.6, 0.15, 0, 0.15, 0.1),
      box(0.4, 0.3, 0.05, C.dglass, { y: y0 + 0.3, x: 0.0, z: 0.75 }), box(0.4, 0.3, 0.05, C.dglass, { y: y0 + 0.3, x: 0.0, z: -0.75 }),
    ];
  })();

  // small planes in several liveries: [fuselage, stripe/tail/spinner, wings]
  [['propplane', C.yellow, C.red, C.white], ['propplaneRed', C.red, C.white, C.white], ['propplaneBlue', C.blue, C.yellow, C.white],
    ['propplaneGreen', C.green, C.white, C.white], ['propplaneOrange', C.orange, C.navy, C.white], ['propplanePurple', C.purple, C.white, C.silver],
    ['propplaneTeal', C.white, C.teal, C.white]].forEach(([n, b, ac, w]) => add(n, prop(b, ac, w), { value: 7 }));

  add('bizjet', (() => {
    const p = plane({ len: 15, fr: 1.05, span: 13, engines: [], er: 0.6, body: C.white, stripe: C.navy, tail: C.navy, winglets: true });
    p.push(
      ...nacelle(-5.4, 2.4, 1.5, 0.6, C.silver, C.navy),
      ...nacelle(-5.4, 2.4, -1.5, 0.6, C.silver, C.navy),
      box(1.4, 0.15, 1.0, C.lgray, { y: 2.2, x: -5.4, z: 0.8 }),
      box(1.4, 0.15, 1.0, C.lgray, { y: 2.2, x: -5.4, z: -0.8 }),
    );
    return p;
  })(), { value: 10 });

  add('airliner', plane({
    len: 34, fr: 2.1, span: 32, engines: [[-1, 7.5], [-1, -7.5]], er: 1.15, body: C.white, stripe: C.sky, tail: C.sky,
  }), { value: 30 });

  add('airlinerRed', plane({
    len: 34, fr: 2.1, span: 32, engines: [[-1, 7.5], [-1, -7.5]], er: 1.15, body: C.white, stripe: C.red, tail: C.red,
  }), { value: 30 });

  add('jumbo', plane({
    len: 50, fr: 3.0, span: 48, engines: [[-2, 8], [-2, -8], [-5, 15.5], [-5, -15.5]], er: 1.5,
    body: C.white, stripe: C.teal, tail: C.teal,
  }).concat([
    // upper-deck hump
    lathe([[0, 0], [1.6, 0.4], [2.2, 3], [2.2, 10], [1.8, 13], [0, 15]], C.white, { x: 3, y: 6.3, rz: -PI / 2, sz: 0.62, sy: 1, segments: 14 }),
    box(1.6, 0.5, 2.4, C.dglass, { y: 7.4, x: 15.5, rz: -0.3 }),
  ]), { value: 80 });

  add('hangar', (() => {
    // arched roof profile across Z (22 wide), extruded along X (20 long)
    const pts = [[-11, 0], [11, 0], [11, 5.5]];
    for (let i = 1; i < 12; i++) { const a = (i / 12) * PI; pts.push([11 * Math.cos(a), 5.5 + 3.5 * Math.sin(a)]); }
    pts.push([-11, 5.5]);
    const p = [
      rbox(21, 0.3, 23, C.gray, { y: 0.15, segments: 1, bevel: 0.08 }),
      extrude(pts, 20, C.lgray, { y: 0.3, ry: PI / 2, bevel: 0.05, segments: 1 }),
      // roof ribs
      ...[-8, -4, 0, 4, 8].map((x) => extrude(pts.slice(2, 14).concat([[-11, 5.5]]).slice(0, 13), 0.3, C.blue, { y: 0.3, x, ry: PI / 2, segments: 1, sx: 1.005, sy: 1.02 })),
      // big sliding doors on the +X face
      box(0.4, 6.2, 12.6, C.dblue, { y: 3.4, x: 10.1 }),
      ...[0, 1, 2, 3, 4, 5].map((i) => box(0.42, 6.0, 0.12, C.white, { y: 3.4, x: 10.12, z: -5.5 + i * 2.2 })),
      ...[0, 1, 2, 3, 4].map((i) => box(0.44, 0.5, 12.2, i % 2 ? C.white : C.silver, { y: 1.0 + i * 1.3, x: 10.14 })),
      box(0.5, 1.2, 5, C.yellow, { y: 8.7, x: 10.1 }),
      box(0.52, 0.5, 3.6, C.red, { y: 8.7, x: 10.14 }),
      // side windows, lamp, vents
      ...[-6, -2, 2, 6].flatMap((x) => recessedWindow(1.4, 0.9, 0.1, { x, y: 4.3, z: 11.12, frame: 0.08, frameColor: C.white, glassColor: C.glass })),
      ...[-6, -2, 2, 6].map((x) => box(1.6, 0.14, 0.14, C.white, { y: 3.8, x, z: 11.1 })),
      rbox(1.6, 0.5, 1.4, C.gray, { y: 9.5, x: -3, segments: 1, bevel: 0.06 }),
      cyl(0.15, 0.15, 3, C.silver, { y: 9.5, x: -8, segments: 8 }),
      box(0.3, 0.25, 0.5, '#fff6c8', { emissive: 0.8, y: 6.7, x: 10.3, z: 5.8 }), box(0.3, 0.25, 0.5, '#fff6c8', { emissive: 0.8, y: 6.7, x: 10.3, z: -5.8 }),
      box(0.7, 2.2, 0.06, C.dwood ?? C.brown, { y: 1.1, x: 6, z: 11.07 }),
    ];
    return p;
  })(), { value: 30, radius: 11 });

  add('terminal', (() => {
    const p = [
      rbox(46, 0.3, 14, C.gray, { y: 0.15, segments: 1, bevel: 0.08 }),
      box(43.6, 6, 11.4, C.beige, { y: 3.3 }),
      box(43.8, 3.6, 11.6, C.dglass, { y: 3.0 }),
      ...[1, -1].flatMap((side) => facadeWall(44, 6, 0.3, C.beige,
        Array.from({ length: 22 }, (_, i) => ({ x: -20.04 + i * 1.92, y: 2.7, width: 1.7, height: 3.4 })),
        { y: 0.3, z: side * 5.85, ry: side > 0 ? 0 : PI })),
      box(0.3, 6, 12, C.beige, { y: 3.3, x: 21.85 }), box(0.3, 6, 12, C.beige, { y: 3.3, x: -21.85 }),
      rbox(44.2, 0.4, 12.2, C.white, { y: 4.9, segments: 1, bevel: 0.05 }),
      rbox(46, 0.6, 14, C.sky, { y: 6.6, segments: 1, bevel: 0.15 }),
      rbox(30, 3.2, 9, C.white, { y: 8.6, x: -3, segments: 1, bevel: 0.2 }),
      box(30.2, 1.4, 9.2, C.glass, { y: 8.8, x: -3 }),
      rbox(32, 0.5, 10, C.dblue, { y: 10.4, x: -3, segments: 1, bevel: 0.1 }),
      rbox(10, 1.0, 0.2, C.red, { y: 5.6, z: 6.15, x: 8, segments: 1, bevel: 0.05 }),
    ];
    // curtain-wall mullions on both long faces + entrance canopy columns
    for (let i = 0; i < 23; i++) {
      const x = -21 + i * 1.92;
      p.push(box(0.14, 3.7, 0.16, C.white, { y: 3.0, x, z: 6.12 }), box(0.14, 3.7, 0.16, C.white, { y: 3.0, x, z: -6.12 }));
    }
    p.push(box(44.2, 0.14, 0.16, C.white, { y: 3.0, z: 6.12 }), box(44.2, 0.14, 0.16, C.white, { y: 3.0, z: -6.12 }));
    for (let i = 0; i < 15; i++) p.push(box(0.12, 1.5, 0.12, C.white, { y: 8.8, x: -17 + i * 2.0, z: 4.6 }));
    // jet bridges: tube, cab, support column, rubber bumper
    for (const x of [-14, 0, 14]) {
      p.push(
        cyl(0.9, 0.9, 6, C.silver, { y: 3.8, x, z: 9.5, rx: PI / 2, segments: 12 }),
        rbox(2.4, 2.4, 2.4, C.yellow, { y: 3.8, x, z: 12.4, segments: 1, bevel: 0.2 }),
        box(1.8, 0.9, 0.06, C.dglass, { y: 4.1, x, z: 13.62 }),
        cyl(0.2, 0.2, 3.4, C.gray, { y: 1.7, x, z: 11.7, segments: 8 }),
        cyl(0.9, 0.9, 0.5, C.dark, { y: 0.3, x, z: 11.7, segments: 8 }),
        torus(1.0, 0.15, C.dark, { y: 3.8, x, z: 13.6, radial: 5, segments: 12 }),
        wheelPair(x + 0.6, 11.7),
      );
    }
    // rooftop details
    p.push(cyl(0.2, 0.2, 4, C.silver, { y: 12.8, x: 8, segments: 8 }), rbox(1.6, 0.8, 1.6, C.lgray, { y: 11, x: 10, segments: 1, bevel: 0.08 }));
    return p.flat();
  })(), { value: 70, radius: 23 });

  add('tower', [
    rbox(9, 3, 9, C.beige, { y: 1.5, segments: 1, bevel: 0.2 }),
    rbox(9.6, 0.5, 9.6, C.gray, { y: 3.2, segments: 1, bevel: 0.1 }),
    ...[-3.4, 0, 3.4].flatMap((x) => recessedWindow(1.2, 1.2, 0.1, { x, y: 1.7, z: 4.62, frame: 0.1, frameColor: C.white, glassColor: C.glass, mullion: true })),
    box(1.6, 2.2, 0.1, C.dblue, { y: 1.1, x: 3.4, z: 4.52 }),
    lathe([[2.4, 3.4], [2.2, 8], [1.85, 16], [1.7, 24], [1.75, 27.5]], C.white, { segments: 16 }),
    cyl(1.8, 2.35, 3, C.red, { y: 9, segments: 16 }),
    cyl(1.75, 2.0, 3, C.red, { y: 19, segments: 16 }),
    box(0.3, 24, 0.2, C.lgray, { y: 15, x: 1.85, z: 0 }),
    // cab: flared base, glass ring with mullions, roof
    lathe([[1.75, 28], [3.0, 28.8], [4.3, 30.2]], C.gray, { segments: 16 }),
    cyl(4.4, 4.4, 3, C.dglass, { y: 32.5, segments: 16 }),
    ...Array.from({ length: 10 }, (_, i) => box(0.16, 3.1, 0.16, C.white, { y: 32.5, x: 4.42 * Math.cos((i / 10) * PI * 2), z: 4.42 * Math.sin((i / 10) * PI * 2) })),
    cyl(4.7, 4.7, 0.4, C.white, { y: 34.3, segments: 16 }),
    lathe([[4.5, 34.5], [3.0, 35.1], [1.0, 35.5], [0, 35.6]], C.red, { segments: 16 }),
    cyl(0.08, 0.08, 6, C.silver, { y: 38.5, x: 1, segments: 6 }),
    box(3.2, 0.2, 0.5, C.dark, { y: 36.3 }),
    sphere(0.3, C.orange, { emissive: 1.8, y: 36.6, x: 1.6, segments: 8, rings: 6 }),
    cyl(0.5, 0.5, 0.15, C.gray, { y: 35.7, x: -1.5, segments: 10 }),
  ], { value: 80, radius: 5.5 });

  // Shrink the giants so a hole grown on this map can actually swallow them ("All items" goal).
  const shrink = (name, k) => {
    const pr = P[name];
    pr.geometry.scale(k, k, k);
    for (const a of pr.articulation) { a.pivot = a.pivot.map((v) => v * k); if (a.hip) a.hip = a.hip.map((v) => v * k); if (a.radius) a.radius *= k; }
    pr.radius *= k;
    pr.height *= k;
  };
  shrink('airliner', 0.7);
  shrink('airlinerRed', 0.7);
  shrink('jumbo', 0.6);
  shrink('terminal', 0.65);

  return P;
}

// two small tyres under a jet-bridge column
function wheelPair(x, z) {
  return [
    cyl(0.4, 0.4, 0.25, C.tire, { y: 0.4, x, z: z + 0.5, rx: PI / 2, segments: 12 }),
    cyl(0.4, 0.4, 0.25, C.tire, { y: 0.4, x, z: z - 0.5, rx: PI / 2, segments: 12 }),
  ];
}
