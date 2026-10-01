// Construction-yard object prototypes. Vehicles are length-along-X, front toward +X unless noted.
import { paletteBuilders, makeProto, articulate } from './build.js';
import { facadeWall, recessedWindow } from './ModelDetails.js';
import { applyModelFinishes } from './ModelFinishes.js';

const C = {
  orange: '#f5a623', dorange: '#d9821a', yellow: '#ffcc1a', dyellow: '#e0a800', red: '#d9382b', dred: '#a52d22',
  white: '#f2f2f2', dark: '#2b2b2e', gray: '#8d949b', dgray: '#5d646b', lgray: '#b8bec4', blue: '#2f7fd6',
  dblue: '#1f5fa8', wood: '#c99a5b', dwood: '#a97b42', brick: '#b5482f', lbrick: '#c9573a', skin: '#f1c8a0',
  tire: '#1f1f22', glass: '#8fd3f4', hivis: '#ff7a1a', green: '#3f9b4a', beige: '#e8e2d0', dbeige: '#cfc7ad',
  silver: '#d5dade', hair: '#5a3b22', dirt: '#6b5a3a',
};
// Explicit material colors retain the map palette; per-part tags override these defaults.
const { box, cyl, cone, sphere, rbox, capsule, lathe, extrude, torus } = paletteBuilders([
  [C.wood, 'wood'],
  [C.dwood, 'wood'],
  [C.brick, 'brick'],
  [C.lbrick, 'brick'],
  [C.glass, 'glass'],
  [C.tire, 'rubber'],
  [C.silver, 'metal'],
  [C.yellow, 'paint'], [C.dyellow, 'paint'], [C.orange, 'paint'], [C.dorange, 'paint'],
  [C.red, 'paint'], [C.dred, 'paint'], [C.blue, 'paint'], [C.dblue, 'paint'], [C.green, 'paint'],
  ['#2f6fc6', 'paint'], ['#1f4f96', 'paint'], ['#e8ebee', 'paint'], ['#b9c0c6', 'paint'], ['#3f8f4f', 'paint'], ['#2b6a38', 'paint'],
  [C.white, 'paint'], [C.beige, 'stucco'], [C.dbeige, 'stucco'],
  [C.gray, 'metal'], [C.lgray, 'metal'], [C.dgray, 'metal'], [C.dark, 'metal'],
  [C.hivis, 'fabric'],
]);
const PI = Math.PI;

// Rolling wheel: tyre + rim + hub share one pivot so they spin together; front (x > 0) wheels also steer.
const wheel = (x, y, z, r, w = 0.5) => {
  const pivot = [x, y, z], opts = { radius: r, front: x > 0 };
  return [
    articulate(cyl(r, r, w, C.tire, { x, y, z, rx: PI / 2, segments: 16, surface: 'rubber' }), 'wheel', pivot, opts),
    articulate(cyl(r * 0.58, r * 0.58, w + 0.04, C.lgray, { x, y, z, rx: PI / 2, segments: 10, surface: 'metal' }), 'wheel', pivot, opts),
    // lug-nut bars across the rim make the spin readable
    ...(r > 0.4 ? [0, 1, 2].map((i) => articulate(box(r * 0.9, r * 0.12, w + 0.08, C.dgray, { x, y, z, rz: i * PI / 3, surface: 'metal' }), 'wheel', pivot, opts)) : []),
    ...(r > 0.6 ? [articulate(cyl(r * 0.2, r * 0.2, w + 0.1, C.dark, { x, y, z, rx: PI / 2, segments: 6 }), 'wheel', pivot, opts)] : []),
  ];
};

// tracked undercarriage along X (crawler): rbox shoe + end sprockets
const track = (len, h, w, z, x = 0) => {
  const ends = [x + len / 2 - h * 0.3, x - len / 2 + h * 0.3];
  const spin = (g, ex) => articulate(g, 'wheel', [ex, h / 2, z], { radius: h * 0.5, front: false });
  return [
    rbox(len, h, w, C.dark, { y: h / 2, x, z, segments: 1, bevel: h * 0.3, surface: 'rubber' }),
    ...ends.flatMap((ex) => [
      spin(cyl(h * 0.5, h * 0.5, w + 0.08, C.dgray, { y: h / 2, x: ex, z, rx: PI / 2, segments: 12 }), ex),
      spin(cyl(h * 0.22, h * 0.22, w + 0.14, C.yellow, { y: h / 2, x: ex, z, rx: PI / 2, segments: 8 }), ex),
      spin(box(h * 0.8, h * 0.1, w + 0.12, C.dark, { y: h / 2, x: ex, z }), ex),
    ]),
  ];
};

const headlights = (x, y, zs, w = 0.35) => zs.map((z) => box(0.1, 0.22, w, '#fff6c8', { emissive: 0.8, x, y, z }));
const taillights = (x, y, zs, w = 0.35) => zs.map((z) => box(0.1, 0.2, w, '#e0201a', { emissive: 1, x, y, z }));

export function buildProtos() {
  const P = {};
  const add = (name, parts, opts) => (P[name] = applyModelFinishes(makeProto(name, parts.flat(), opts), 'industrial'));

  add('cone', [
    rbox(0.9, 0.09, 0.9, C.dark, { y: 0.045, segments: 1, bevel: 0.03 }),
    cyl(0.08, 0.32, 0.9, C.orange, { y: 0.54, segments: 14 }),
    cyl(0.17, 0.2, 0.14, C.white, { y: 0.5, segments: 14 }),
    cyl(0.12, 0.15, 0.1, C.white, { y: 0.74, segments: 12 }),
    sphere(0.09, C.orange, { emissive: 1.6, y: 1.0, segments: 8, rings: 5 }),
  ], { value: 0.25 });

  add('brick', [
    rbox(0.9, 0.45, 0.45, C.brick, { y: 0.225, segments: 1, bevel: 0.04 }),
    box(0.22, 0.02, 0.2, C.lbrick, { y: 0.455, x: -0.25 }),
    box(0.22, 0.02, 0.2, C.lbrick, { y: 0.455, x: 0.0 }),
    box(0.22, 0.02, 0.2, C.lbrick, { y: 0.455, x: 0.25 }),
    box(0.9, 0.03, 0.03, '#d9c3a0', { y: 0.32, z: 0.225 }),
  ], { value: 0.2 });

  add('brickStack', [
    box(1.6, 0.14, 1.0, C.dwood, { y: 0.07 }),
    ...[0, 1, 2].flatMap((i) => [
      rbox(1.4, 0.32, 0.85, i % 2 ? C.lbrick : C.brick, { y: 0.3 + i * 0.32, x: (i - 1) * 0.04, segments: 1, bevel: 0.05 }),
      box(1.42, 0.03, 0.04, '#d9c3a0', { y: 0.3 + i * 0.32, z: 0.43, x: (i - 1) * 0.04 }),
    ]),
    box(0.05, 0.98, 0.9, C.dark, { y: 0.55, x: -0.3 }),
    box(0.05, 0.98, 0.9, C.dark, { y: 0.55, x: 0.3 }),
    box(1.5, 0.03, 0.06, C.gray, { y: 1.05, x: 0 }),
  ], { value: 0.6 });

  add('toolbox', [
    rbox(0.9, 0.36, 0.45, C.red, { y: 0.2, segments: 1, bevel: 0.05 }),
    rbox(0.92, 0.16, 0.47, C.dred, { y: 0.44, segments: 1, bevel: 0.05 }),
    box(0.52, 0.05, 0.05, C.dark, { y: 0.6, z: 0 }),
    box(0.05, 0.14, 0.05, C.dark, { y: 0.53, x: 0.26 }),
    box(0.05, 0.14, 0.05, C.dark, { y: 0.53, x: -0.26 }),
    box(0.1, 0.1, 0.03, C.silver, { y: 0.36, x: 0.25, z: 0.235 }),
    box(0.1, 0.1, 0.03, C.silver, { y: 0.36, x: -0.25, z: 0.235 }),
    box(0.36, 0.05, 0.02, C.yellow, { y: 0.22, z: 0.235 }),
  ], { value: 0.3 });

  add('barrel', [
    lathe([[0.38, 0], [0.44, 0.06], [0.45, 0.2], [0.45, 0.9], [0.44, 1.04], [0.38, 1.1]], C.blue, { segments: 16 }),
    cyl(0.4, 0.4, 0.03, C.dblue, { y: 1.1, segments: 16 }),
    cyl(0.465, 0.465, 0.07, C.dblue, { y: 0.33, segments: 16 }),
    cyl(0.465, 0.465, 0.07, C.dblue, { y: 0.77, segments: 16 }),
    cyl(0.462, 0.462, 0.18, C.yellow, { y: 0.55, segments: 16 }),
    cyl(0.09, 0.09, 0.05, C.dark, { y: 1.13, x: 0.2, segments: 8 }),
    cyl(0.06, 0.06, 0.04, C.gray, { y: 1.13, x: -0.15, z: 0.15, segments: 8 }),
  ], { value: 0.4 });

  add('pallet', [
    ...[-0.64, 0, 0.64].map((z) => box(1.6, 0.12, 0.2, C.dwood, { y: 0.06, z })),
    ...[-0.5, 0, 0.5].map((x) => box(0.18, 0.1, 1.6, C.dwood, { y: 0.17, x })),
    ...[-0.72, -0.36, 0, 0.36, 0.72].map((z) => box(1.6, 0.05, 0.28, C.wood, { y: 0.245, z })),
    rbox(1.2, 0.5, 1.2, C.beige, { y: 0.52, segments: 1, bevel: 0.06 }),
    box(1.24, 0.04, 0.1, C.dgray, { y: 0.6, z: 0.3 }),
    box(1.24, 0.04, 0.1, C.dgray, { y: 0.6, z: -0.3 }),
    box(0.05, 0.54, 0.1, C.dgray, { y: 0.55, x: 0.61, z: 0.3 }),
    box(0.4, 0.02, 0.3, C.white, { y: 0.775, x: 0.2, z: 0.25 }),
    box(0.36, 0.02, 0.06, C.red, { y: 0.79, x: 0.2, z: 0.25 }),
    rbox(0.5, 0.3, 0.4, C.dbeige, { y: 0.9, x: -0.2, z: -0.1, segments: 1, bevel: 0.04 }),
  ], { value: 0.7 });

  add('barrier', [
    rbox(2.4, 0.5, 0.4, C.white, { y: 0.7, segments: 1, bevel: 0.08 }),
    rbox(2.4, 0.16, 0.4, C.white, { y: 0.98, segments: 1, bevel: 0.05 }),
    ...[-0.8, 0, 0.8].map((x) => box(0.4, 0.5, 0.42, C.red, { y: 0.7, x })),
    ...[-0.6, 0.6].map((x) => cyl(0.06, 0.06, 0.7, C.dark, { y: 0.35, x, segments: 8 })),
    ...[-1.0, 1.0].flatMap((x) => [box(0.16, 0.12, 1.0, C.dark, { y: 0.06, x })]),
    sphere(0.12, C.orange, { emissive: 1.6, y: 1.1, x: -1.0, segments: 8, rings: 6 }),
    sphere(0.12, C.orange, { emissive: 1.6, y: 1.1, x: 1.0, segments: 8, rings: 6 }),
  ], { value: 0.9 });

  add('pipe', [
    cyl(0.32, 0.32, 2.4, C.gray, { y: 0.32, rz: PI / 2, segments: 16 }),
    cyl(0.36, 0.36, 0.2, C.lgray, { y: 0.32, rz: PI / 2, x: 1.1, segments: 16 }),
    cyl(0.36, 0.36, 0.2, C.lgray, { y: 0.32, rz: PI / 2, x: -1.1, segments: 16 }),
    cyl(0.25, 0.25, 0.05, C.dark, { y: 0.32, rz: PI / 2, x: 1.2, segments: 14 }),
    cyl(0.25, 0.25, 0.05, C.dark, { y: 0.32, rz: PI / 2, x: -1.2, segments: 14 }),
    cyl(0.335, 0.335, 0.08, C.blue, { y: 0.32, rz: PI / 2, x: 0.3, segments: 16 }),
    cyl(0.335, 0.335, 0.08, C.blue, { y: 0.32, rz: PI / 2, x: -0.45, segments: 16 }),
  ], { value: 0.8 });

  add('worker', (() => {
    const p = [];
    const boot = '#5b3b22';
    for (const side of [-1, 1]) {
      const hip = [0, 0.56, side * 0.11], knee = [0, 0.3, side * 0.11], lo = { side, hip };
      p.push(
        articulate(cyl(0.1, 0.09, 0.3, C.blue, { y: 0.41, z: side * 0.11, segments: 8, surface: 'fabric' }), 'leg', hip, lo),
        articulate(cyl(0.09, 0.085, 0.3, C.blue, { y: 0.17, z: side * 0.11, segments: 8, surface: 'fabric' }), 'shin', knee, lo),
        articulate(box(0.3, 0.1, 0.16, boot, { y: 0.05, x: 0.05, z: side * 0.11, surface: 'rubber' }), 'shin', knee, lo),
        // arm: sleeve + glove swing together about the shoulder
        ...[
          cyl(0.07, 0.065, 0.55, C.hivis, { y: 0.85, z: side * 0.31, rx: side * 0.25, segments: 8, surface: 'fabric' }),
          sphere(0.08, C.white, { y: 0.6, z: side * 0.37, segments: 6, rings: 5, surface: 'fabric' }),
        ].map((g) => articulate(g, 'arm', [0, 1.1, side * 0.3], { side })),
      );
    }
    p.push(
      // torso + hi-vis stripes + belt
      cyl(0.22, 0.26, 0.6, C.hivis, { y: 0.82, segments: 10, surface: 'fabric' }),
      cyl(0.235, 0.27, 0.06, C.silver, { y: 0.72, segments: 10, surface: 'fabric', textureStrength: 0.3 }),
      cyl(0.225, 0.245, 0.06, C.silver, { y: 0.92, segments: 10, surface: 'fabric', textureStrength: 0.3 }),
      cyl(0.26, 0.26, 0.07, boot, { y: 0.55, segments: 10, surface: 'fabric' }),
      // head, nose, hair, hard hat
      sphere(0.19, C.skin, { y: 1.33, segments: 10, rings: 8 }),
      sphere(0.05, C.skin, { y: 1.3, x: 0.19, segments: 6, rings: 4 }),
      box(0.04, 0.05, 0.05, C.dark, { y: 1.35, x: 0.17, z: 0.08 }),
      box(0.04, 0.05, 0.05, C.dark, { y: 1.35, x: 0.17, z: -0.08 }),
      sphere(0.22, C.yellow, { y: 1.42, sy: 0.75, segments: 10, rings: 6, surface: 'paint' }),
      cyl(0.29, 0.29, 0.04, C.yellow, { y: 1.38, x: 0.03, segments: 12, surface: 'paint' }),
      box(0.5, 0.04, 0.06, C.dyellow, { y: 1.55, segments: 4, surface: 'paint' }),
    );
    return p;
  })(), { value: 0.7, move: { type: 'walk', speed: 1.5, range: 10 } });

  add('wheelbarrow', [
    extrude([[-0.55, 0.05], [0.5, 0.05], [0.72, 0.5], [-0.72, 0.5]], 0.85, C.orange, { y: 0.6, x: 0.15, bevel: 0.03, segments: 1 }),
    box(1.5, 0.05, 0.05, C.dorange, { y: 1.12, x: 0.15, z: 0.44 }),
    box(1.5, 0.05, 0.05, C.dorange, { y: 1.12, x: 0.15, z: -0.44 }),
    sphere(0.5, C.dirt, { y: 1.08, x: 0.1, sy: 0.35, sx: 1.05, sz: 0.8, segments: 10, rings: 6 }),
    articulate(cyl(0.3, 0.3, 0.16, C.tire, { y: 0.3, x: 0.9, rx: PI / 2, segments: 14 }), 'wheel', [0.9, 0.3, 0], { radius: 0.3, front: true }),
    articulate(cyl(0.16, 0.16, 0.2, C.lgray, { y: 0.3, x: 0.9, rx: PI / 2, segments: 10 }), 'wheel', [0.9, 0.3, 0], { radius: 0.3, front: true }),
    box(0.06, 0.12, 0.12, C.dark, { y: 0.3, x: 0.9, z: 0.15 }),
    box(1.2, 0.07, 0.07, C.dark, { y: 0.62, x: -0.55, z: 0.3, rz: 0.15 }),
    box(1.2, 0.07, 0.07, C.dark, { y: 0.62, x: -0.55, z: -0.3, rz: 0.15 }),
    cyl(0.06, 0.06, 0.4, C.red, { y: 0.63, x: -1.15, z: 0.3, rz: PI / 2, segments: 8 }),
    cyl(0.06, 0.06, 0.4, C.red, { y: 0.63, x: -1.15, z: -0.3, rz: PI / 2, segments: 8 }),
    box(0.07, 0.5, 0.07, C.dark, { y: 0.27, x: -0.95, z: 0.3 }),
    box(0.07, 0.5, 0.07, C.dark, { y: 0.27, x: -0.95, z: -0.3 }),
    box(0.4, 0.05, 0.07, C.dark, { y: 0.03, x: -0.95, z: 0.3 }),
    box(0.4, 0.05, 0.07, C.dark, { y: 0.03, x: -0.95, z: -0.3 }),
  ], { value: 1.0 });

  add('toilet', [
    box(1.6, 0.2, 1.6, C.dark, { y: 0.1 }),
    rbox(1.5, 2.8, 1.5, C.blue, { y: 1.6, segments: 1, bevel: 0.1 }),
    rbox(1.62, 0.16, 1.62, C.white, { y: 3.08, segments: 1, bevel: 0.06 }),
    rbox(1.0, 2.0, 0.08, C.dblue, { y: 1.35, z: 0.77, segments: 1, bevel: 0.03 }),
    box(0.9, 0.04, 0.04, '#1a4f8f', { y: 1.35, z: 0.82 }),
    ...[0, 1, 2, 3].map((i) => box(0.7, 0.05, 0.03, '#1a4f8f', { y: 2.15 + i * 0.1, z: 0.82 })),
    box(0.16, 0.06, 0.06, C.silver, { y: 1.4, x: -0.4, z: 0.83 }),
    box(0.32, 0.22, 0.04, C.red, { y: 2.65, z: 0.8, x: 0.1 }),
    box(0.22, 0.12, 0.04, C.white, { y: 2.65, z: 0.83, x: 0.1 }),
    cyl(0.12, 0.12, 0.3, C.dgray, { y: 3.3, x: -0.4, z: -0.3, segments: 10 }),
    cyl(0.2, 0.2, 0.04, C.dgray, { y: 3.47, x: -0.4, z: -0.3, segments: 10 }),
    ...[-0.5, 0.5].map((z) => box(0.04, 0.1, 0.5, '#1a4f8f', { y: 2.4, x: 0.76, z: z * 1.2 })),
  ], { value: 1.8 });

  add('generator', [
    box(2.7, 0.2, 1.5, C.dark, { y: 0.1 }),
    rbox(2.6, 1.4, 1.4, C.yellow, { y: 0.95, segments: 1, bevel: 0.14 }),
    rbox(2.0, 0.08, 1.2, C.dyellow, { y: 1.67, segments: 1, bevel: 0.03 }),
    // louvre vents
    ...[0, 1, 2, 3, 4].map((i) => box(1.0, 0.05, 0.04, C.dark, { y: 0.6 + i * 0.13, x: -0.5, z: 0.72 })),
    rbox(0.7, 0.6, 0.05, C.dgray, { y: 1.2, x: 0.75, z: 0.72, segments: 1, bevel: 0.02 }),
    cyl(0.1, 0.1, 0.05, C.red, { y: 1.3, x: 0.6, z: 0.76, rx: PI / 2, segments: 8 }),
    cyl(0.1, 0.1, 0.05, C.green, { y: 1.3, x: 0.92, z: 0.76, rx: PI / 2, segments: 8 }),
    cyl(0.09, 0.09, 0.05, C.silver, { y: 1.05, x: 0.75, z: 0.76, rx: PI / 2, segments: 8 }),
    // exhaust + fuel cap + handle frame
    cyl(0.1, 0.1, 0.7, C.dgray, { y: 2.05, x: 0.9, z: -0.3, segments: 10 }),
    cyl(0.14, 0.14, 0.06, C.dark, { y: 2.42, x: 0.9, z: -0.3, segments: 10 }),
    cyl(0.16, 0.16, 0.12, C.red, { y: 1.75, x: -0.9, z: 0.2, segments: 10 }),
    box(0.08, 0.08, 1.4, C.dark, { y: 1.85, x: 1.3 }),
    box(0.08, 0.08, 1.4, C.dark, { y: 1.85, x: -1.3 }),
    box(0.08, 0.5, 0.08, C.dark, { y: 1.55, x: 1.3, z: 0.7 }),
    box(0.08, 0.5, 0.08, C.dark, { y: 1.55, x: 1.3, z: -0.7 }),
    box(0.08, 0.5, 0.08, C.dark, { y: 1.55, x: -1.3, z: 0.7 }),
    box(0.08, 0.5, 0.08, C.dark, { y: 1.55, x: -1.3, z: -0.7 }),
  ], { value: 2.2 });

  const pickup = (body, dbody) => [

    // chassis + body
    box(4.4, 0.3, 1.9, C.dark, { y: 0.55 }),
    rbox(4.6, 0.75, 2.0, body, { y: 0.95, segments: 2, bevel: 0.18 }),
    // cab with glass band
    rbox(1.9, 0.85, 1.9, body, { y: 1.75, x: 0.6, segments: 2, bevel: 0.2 }),
    rbox(1.94, 0.5, 1.94, C.glass, { y: 1.85, x: 0.55, segments: 1, bevel: 0.08 }),
    box(0.06, 0.08, 1.96, body, { y: 1.85, x: 0.55 }),
    box(0.04, 0.56, 1.98, body, { y: 1.85, x: -0.05 }),
    // bed walls + floor
    box(2.2, 0.08, 1.75, dbody, { y: 1.35, x: -1.4 }),
    rbox(2.3, 0.5, 0.12, dbody, { y: 1.4, x: -1.35, z: 0.94, segments: 1, bevel: 0.04 }),
    rbox(2.3, 0.5, 0.12, dbody, { y: 1.4, x: -1.35, z: -0.94, segments: 1, bevel: 0.04 }),
    rbox(0.12, 0.5, 2.0, dbody, { y: 1.4, x: -2.3, segments: 1, bevel: 0.04 }),
    // bumpers, grille, lights, mirrors
    rbox(0.25, 0.28, 2.1, C.silver, { y: 0.55, x: 2.35, segments: 1, bevel: 0.06 }),
    rbox(0.25, 0.22, 2.1, C.silver, { y: 0.6, x: -2.4, segments: 1, bevel: 0.06 }),
    box(0.06, 0.3, 1.0, C.dark, { y: 0.98, x: 2.32 }),
    ...headlights(2.32, 1.1, [0.7, -0.7], 0.4),
    ...taillights(-2.32, 1.15, [0.8, -0.8], 0.3),
    box(0.15, 0.2, 0.1, C.dark, { y: 1.85, x: 1.35, z: 1.02 }),
    box(0.15, 0.2, 0.1, C.dark, { y: 1.85, x: 1.35, z: -1.02 }),
    ...wheel(1.5, 0.45, 1.0, 0.45, 0.4), ...wheel(1.5, 0.45, -1.0, 0.45, 0.4),
    ...wheel(-1.5, 0.45, 1.0, 0.45, 0.4), ...wheel(-1.5, 0.45, -1.0, 0.45, 0.4),
    ];
  add('pickup', pickup(C.red, C.dred), { value: 3 });
  add('pickupBlue', pickup('#2f6fc6', '#1f4f96'), { value: 3 });
  add('pickupWhite', pickup('#e8ebee', '#b9c0c6'), { value: 3 });
  add('pickupGreen', pickup('#3f8f4f', '#2b6a38'), { value: 3 });

  add('skidsteer', [
    // body, engine hood, counterweight
    rbox(2.4, 1.1, 1.7, C.orange, { y: 0.95, x: 0.1, segments: 2, bevel: 0.2 }),
    rbox(1.5, 0.8, 1.6, C.dorange, { y: 0.9, x: -1.4, segments: 1, bevel: 0.15 }),
    rbox(1.0, 0.1, 1.2, C.dgray, { y: 1.5, x: -1.5, segments: 1, bevel: 0.04 }),
    // cab frame with glass
    rbox(1.4, 1.2, 1.4, C.glass, { y: 2.05, x: 0.3, segments: 1, bevel: 0.1 }),
    ...[[-0.35, 0.65], [-0.35, -0.65], [0.95, 0.65], [0.95, -0.65]].map(([x, z]) => box(0.1, 1.3, 0.1, C.dark, { y: 2.05, x: 0.3 + x, z })),
    rbox(1.7, 0.14, 1.7, C.orange, { y: 2.75, x: 0.3, segments: 1, bevel: 0.05 }),
    sphere(0.12, C.yellow, { y: 2.9, x: 0.3, z: 0.5, segments: 8, rings: 6 }),
    // lift arms + bucket
    box(2.6, 0.24, 0.2, C.yellow, { y: 1.7, x: 0.5, z: 0.93, rz: -0.15 }),
    box(2.6, 0.24, 0.2, C.yellow, { y: 1.7, x: 0.5, z: -0.93, rz: -0.15 }),
    extrude([[0, 0], [0.9, 0], [1.1, 0.5], [1.0, 1.0], [0.9, 1.0], [0.75, 0.25], [0, 0.18]], 2.2, C.gray, { y: 0.3, x: 1.3, bevel: 0.04, segments: 1 }),
    cyl(0.07, 0.07, 1.2, C.silver, { y: 1.3, x: 1.5, z: 0.4, rz: 1.0, segments: 8 }),
    cyl(0.07, 0.07, 1.2, C.silver, { y: 1.3, x: 1.5, z: -0.4, rz: 1.0, segments: 8 }),
    ...headlights(1.35, 1.35, [0.6, -0.6], 0.3),
    ...wheel(-0.5, 0.5, 1.0, 0.5, 0.5), ...wheel(1.2, 0.5, 1.0, 0.5, 0.5),
    ...wheel(-0.5, 0.5, -1.0, 0.5, 0.5), ...wheel(1.2, 0.5, -1.0, 0.5, 0.5),
  ], { value: 4, move: { type: 'drive', speed: 2.5, range: 14 } });

  add('excavator', [
    ...track(4.6, 1.0, 1.1, 1.25), ...track(4.6, 1.0, 1.1, -1.25),
    rbox(3.0, 0.5, 2.0, C.gray, { y: 1.1, segments: 1, bevel: 0.1 }),
    cyl(1.2, 1.3, 0.3, C.dark, { y: 1.45, segments: 16 }),
    // house + engine cover + counterweight
    rbox(2.6, 1.3, 2.4, C.yellow, { y: 2.2, x: -0.4, segments: 2, bevel: 0.25 }),
    rbox(1.5, 1.3, 2.4, C.dorange, { y: 2.15, x: -2.0, segments: 2, bevel: 0.3 }),
    rbox(0.9, 0.12, 1.6, C.dgray, { y: 2.9, x: -1.8, segments: 1, bevel: 0.04 }),
    // cab
    rbox(1.4, 1.5, 1.2, C.glass, { y: 3.1, x: 0.5, z: 0.55, segments: 1, bevel: 0.1 }),
    ...[[-0.6, 0.55], [0.6, 0.55], [-0.6, -0.55], [0.6, -0.55]].map(([x, z]) => box(0.09, 1.55, 0.09, C.dark, { y: 3.1, x: 0.5 + x, z: 0.55 + z })),
    rbox(1.6, 0.14, 1.4, C.yellow, { y: 3.9, x: 0.5, z: 0.55, segments: 1, bevel: 0.05 }),
    sphere(0.12, C.orange, { emissive: 1.6, y: 4.06, x: 0.5, z: 0.55, segments: 8, rings: 6 }),
    // boom (two-piece), stick, bucket
    extrude([[0, 0], [2.2, 0.2], [4.6, 0.9], [4.6, 1.5], [2.2, 1.0], [0, 0.9]], 0.6, C.yellow, { y: 2.4, x: 1.4, z: -0.55, bevel: 0.05, segments: 1 }),
    box(3.6, 0.42, 0.42, C.yellow, { y: 3.55, x: 4.6, z: -0.55, rz: -1.05 }),
    cyl(0.12, 0.12, 2.6, C.silver, { y: 3.4, x: 2.3, z: -0.2, rz: -0.95, segments: 8 }),
    cyl(0.1, 0.1, 2.2, C.silver, { y: 4.8, x: 4.0, z: -0.25, rz: -0.2, segments: 8 }),
    extrude([[0, 0], [1.2, 0], [1.5, 0.6], [1.3, 1.1], [1.0, 1.2], [0.6, 0.4], [0, 0.35]], 1.3, C.gray, { y: 1.0, x: 5.3, z: -0.55, bevel: 0.05, segments: 1 }),
    ...[-0.4, -0.7, -1.0].map((z) => box(0.1, 0.35, 0.1, C.silver, { y: 0.95, x: 6.75, z })),
    ...headlights(0.95, 2.7, [0.15], 0.3),
  ], { value: 11, move: { type: 'drive', speed: 1.6, range: 12 } });

  add('bulldozer', [
    ...track(5, 1.3, 1.0, 1.5), ...track(5, 1.3, 1.0, -1.5),
    rbox(3.8, 1.3, 2.6, C.yellow, { y: 1.7, x: -0.2, segments: 2, bevel: 0.25 }),
    rbox(1.9, 0.95, 2.2, C.yellow, { y: 2.65, x: 1.2, segments: 2, bevel: 0.25 }),
    box(1.5, 0.07, 1.8, C.dgray, { y: 3.15, x: 1.2 }),
    // cab
    rbox(1.6, 1.5, 2.0, C.glass, { y: 3.3, x: -1.0, segments: 1, bevel: 0.1 }),
    ...[[-0.75, 0.95], [-0.75, -0.95], [0.75, 0.95], [0.75, -0.95]].map(([x, z]) => box(0.1, 1.55, 0.1, C.dark, { y: 3.3, x: -1.0 + x, z })),
    rbox(1.9, 0.14, 2.3, C.yellow, { y: 4.1, x: -1.0, segments: 1, bevel: 0.05 }),
    cyl(0.12, 0.12, 1.4, C.dark, { y: 3.7, x: 1.7, segments: 8 }),
    cyl(0.17, 0.17, 0.08, C.dgray, { y: 4.42, x: 1.7, segments: 8 }),
    // blade (curved) + push arms + hydraulics
    extrude([[0, 0], [0.5, 0.05], [0.5, 1.8], [0.3, 1.9], [0.1, 1.2], [-0.05, 0.4]], 4.3, C.gray, { y: 0.35, x: 3.2, bevel: 0.05, segments: 1 }),
    box(0.15, 0.12, 4.3, C.silver, { y: 0.35, x: 3.6 }),
    box(1.7, 0.3, 0.3, C.dark, { y: 0.95, x: 2.4, z: 1.7 }),
    box(1.7, 0.3, 0.3, C.dark, { y: 0.95, x: 2.4, z: -1.7 }),
    cyl(0.1, 0.1, 1.5, C.silver, { y: 1.9, x: 2.7, z: 1.0, rz: 0.9, segments: 8 }),
    cyl(0.1, 0.1, 1.5, C.silver, { y: 1.9, x: 2.7, z: -1.0, rz: 0.9, segments: 8 }),
    // ripper at the back
    box(0.4, 0.4, 2.2, C.dgray, { y: 1.0, x: -2.5 }),
    ...[-0.7, 0, 0.7].map((z) => box(0.2, 0.9, 0.2, C.dark, { y: 0.45, x: -2.7, z })),
    ...headlights(1.95, 2.85, [0.7, -0.7], 0.3),
  ], { value: 10, move: { type: 'drive', speed: 1.8, range: 12 } });

  add('dumptruck', [
    // chassis, cab, tipping bed
    rbox(9, 0.7, 2.6, C.dark, { y: 1.3, segments: 1, bevel: 0.15 }),
    rbox(2.4, 2.2, 2.8, C.yellow, { y: 2.7, x: 3.3, segments: 2, bevel: 0.25 }),
    rbox(0.2, 1.0, 2.5, C.glass, { y: 3.2, x: 4.5, segments: 1, bevel: 0.06 }),
    rbox(0.2, 0.8, 0.06, C.glass, { y: 3.2, x: 3.4, z: 1.41, segments: 1, bevel: 0.02, sx: 6, sz: 1 }),
    rbox(0.2, 0.8, 0.06, C.glass, { y: 3.2, x: 3.4, z: -1.41, segments: 1, bevel: 0.02, sx: 6, sz: 1 }),
    rbox(6.4, 0.35, 3.0, C.dorange, { y: 1.9, x: -1.4, segments: 1, bevel: 0.08 }),
    rbox(6.2, 1.4, 0.25, C.orange, { y: 2.7, x: -1.4, z: 1.4, segments: 1, bevel: 0.06 }),
    rbox(6.2, 1.4, 0.25, C.orange, { y: 2.7, x: -1.4, z: -1.4, segments: 1, bevel: 0.06 }),
    rbox(0.25, 2.4, 3.0, C.dorange, { y: 3.0, x: 1.6, segments: 1, bevel: 0.06 }),
    rbox(0.25, 1.4, 3.0, C.orange, { y: 2.7, x: -4.5, segments: 1, bevel: 0.06 }),
    box(5.9, 0.15, 2.6, C.dirt, { y: 2.55, x: -1.4 }),
    ...[0.7, -0.7].flatMap((z) => [-3, -1.4, 0.2].map((x) => box(0.2, 1.4, 0.06, C.dorange, { y: 2.7, x, z: z * 2.0 }))),
    cyl(0.14, 0.14, 1.2, C.silver, { y: 2.0, x: 0.9, rz: 0.5, segments: 8 }),
    // grille, bumper, lights, exhaust
    rbox(0.3, 0.5, 2.9, C.silver, { y: 0.85, x: 4.6, segments: 1, bevel: 0.08 }),
    box(0.06, 0.8, 1.6, C.dark, { y: 2.0, x: 4.52 }),
    ...headlights(4.53, 1.5, [1.0, -1.0], 0.4),
    ...taillights(-4.6, 1.5, [1.2, -1.2], 0.4),
    cyl(0.12, 0.12, 2.0, C.dgray, { y: 3.4, x: 2.2, z: 1.4, segments: 8 }),
    box(0.3, 0.2, 0.1, C.dark, { y: 3.4, x: 4.4, z: 1.55 }),
    ...wheel(3.2, 0.9, 1.5, 0.9, 0.7), ...wheel(3.2, 0.9, -1.5, 0.9, 0.7),
    ...wheel(-0.8, 0.9, 1.5, 0.9, 0.7), ...wheel(-0.8, 0.9, -1.5, 0.9, 0.7),
    ...wheel(-2.8, 0.9, 1.5, 0.9, 0.7), ...wheel(-2.8, 0.9, -1.5, 0.9, 0.7),
  ], { value: 13 });

  add('mixer', [
    rbox(9, 0.6, 2.5, C.dgray, { y: 1.2, segments: 1, bevel: 0.15 }),
    rbox(2.2, 2.2, 2.6, C.white, { y: 2.6, x: 3.5, segments: 2, bevel: 0.25 }),
    rbox(0.2, 1.0, 2.3, C.glass, { y: 3.1, x: 4.6, segments: 1, bevel: 0.06 }),
    rbox(0.2, 0.8, 0.06, C.glass, { y: 3.1, x: 3.5, z: 1.31, segments: 1, bevel: 0.02, sx: 5, sz: 1 }),
    rbox(0.2, 0.8, 0.06, C.glass, { y: 3.1, x: 3.5, z: -1.31, segments: 1, bevel: 0.02, sx: 5, sz: 1 }),
    // tilted drum: lathe along Y then laid down (tilted up at the back)
    lathe([[0.55, 0], [1.1, 0.4], [1.7, 1.6], [1.75, 3.5], [1.7, 5.0], [1.2, 6.0], [0.5, 6.6], [0, 6.7]], C.orange, { y: 4.4, x: -4.2, rz: -PI / 2 - 0.15, segments: 18 }),
    lathe([[1.76, 1.6], [1.78, 1.9], [1.78, 2.4], [1.76, 2.7]], C.white, { y: 4.4, x: -4.2, rz: -PI / 2 - 0.15, segments: 18 }),
    lathe([[1.76, 3.7], [1.78, 4.0], [1.78, 4.5], [1.76, 4.8]], C.white, { y: 4.4, x: -4.2, rz: -PI / 2 - 0.15, segments: 18 }),
    // discharge chute and ladder
    extrude([[0, 0], [1.8, -0.9], [1.8, -0.5], [0, 0.4]], 0.6, C.gray, { y: 2.0, x: -4.6, bevel: 0.03, segments: 1 }),
    box(0.1, 2.6, 0.08, C.silver, { y: 2.6, x: -3.9, z: 1.2 }),
    ...[0, 1, 2, 3, 4].map((i) => box(0.06, 0.06, 0.4, C.silver, { y: 1.6 + i * 0.45, x: -3.9, z: 1.2 })),
    rbox(0.3, 0.5, 2.6, C.silver, { y: 0.85, x: 4.6, segments: 1, bevel: 0.08 }),
    ...headlights(4.52, 1.5, [0.9, -0.9], 0.4),
    ...taillights(-4.5, 1.5, [1.0, -1.0], 0.4),
    ...wheel(3.2, 0.9, 1.4, 0.9, 0.7), ...wheel(3.2, 0.9, -1.4, 0.9, 0.7),
    ...wheel(-1.6, 0.9, 1.4, 0.9, 0.7), ...wheel(-1.6, 0.9, -1.4, 0.9, 0.7),
    ...wheel(-3.2, 0.9, 1.4, 0.9, 0.7), ...wheel(-3.2, 0.9, -1.4, 0.9, 0.7),
  ], { value: 14 });

  add('trailer', (() => {
    const p = [
      // skids + body + roof
      rbox(8, 0.4, 2.6, C.dgray, { y: 0.2, segments: 1, bevel: 0.08 }),
      box(7.8, 2.6, 2.7, C.dbeige, { y: 1.7 }),
      box(0.2, 2.6, 3, C.beige, { y: 1.7, x: 3.9 }), box(0.2, 2.6, 3, C.beige, { y: 1.7, x: -3.9 }),
      ...[1, -1].flatMap((side) => facadeWall(8, 2.6, 0.16, C.beige, [-2.8, -0.8, 1.0].map((x) => ({ x, y: 1.6, width: 1.0, height: 0.8 })),
        { y: 0.4, z: side * 1.42, ry: side > 0 ? 0 : PI })),
      rbox(8.3, 0.24, 3.3, C.lgray, { y: 3.1, segments: 1, bevel: 0.08 }),
      box(8.0, 0.14, 3.02, C.blue, { y: 0.55 }),
      box(8.0, 0.1, 3.02, C.blue, { y: 2.85 }),
      // AC units + vent on roof
      rbox(1.2, 0.5, 1.0, C.silver, { y: 3.5, x: -2, segments: 1, bevel: 0.08 }),
      cyl(0.36, 0.36, 0.05, C.dark, { y: 3.77, x: -2, segments: 12 }),
      rbox(0.8, 0.35, 0.8, C.lgray, { y: 3.4, x: 1.5, z: 0.4, segments: 1, bevel: 0.06 }),
      // door + steps + rail
      rbox(0.95, 1.9, 0.08, C.dwood, { y: 1.4, x: 3.0, z: 1.52, segments: 1, bevel: 0.03 }),
      box(0.18, 0.06, 0.06, C.silver, { y: 1.35, x: 2.7, z: 1.58 }),
      rbox(1.5, 0.15, 0.9, C.dgray, { y: 0.45, x: 3.0, z: 1.85, segments: 1, bevel: 0.04 }),
      rbox(1.5, 0.15, 0.6, C.dgray, { y: 0.22, x: 3.0, z: 2.25, segments: 1, bevel: 0.04 }),
      box(0.06, 0.8, 0.06, C.silver, { y: 0.9, x: 3.7, z: 2.2 }),
      box(0.06, 0.8, 0.06, C.silver, { y: 0.9, x: 2.3, z: 2.2 }),
      box(1.5, 0.05, 0.05, C.silver, { y: 1.3, x: 3.0, z: 2.2 }),
      // sign board
      box(2.4, 0.5, 0.05, C.green, { y: 2.55, x: 3.0, z: 1.53 }),
      box(1.6, 0.14, 0.03, C.white, { y: 2.55, x: 3.0, z: 1.56 }),
      cyl(0.12, 0.12, 0.6, C.gray, { y: 3.75, x: 3.2, z: -0.5, segments: 8 }),
    ];
    // recessed windows sit in the cut-out openings of the side walls
    for (const x of [-2.8, -0.8, 1.0]) {
      for (const side of [1, -1]) {
        p.push(...recessedWindow(1.0, 0.8, 0.12, { x, y: 2.0, z: side * 1.5, ry: side > 0 ? 0 : PI, frame: 0.09, frameColor: C.white, glassColor: C.glass, mullion: true }));
      }
    }
    return p;
  })(), { value: 14 });

  add('pipestack', (() => {
    const p = [];
    const R = 0.6;
    const pipe = (y, z, col) => p.push(
      cyl(R, R, 5, col, { y, z, rz: PI / 2, segments: 14 }),
      cyl(R * 0.72, R * 0.72, 5.02, C.dark, { y, z, rz: PI / 2, segments: 12 }),
      cyl(R * 1.03, R * 1.03, 0.18, C.lgray, { y, z, x: 1.2, rz: PI / 2, segments: 14 }),
      cyl(R * 1.03, R * 1.03, 0.18, C.lgray, { y, z, x: -1.2, rz: PI / 2, segments: 14 }),
    );
    [-1.2, 0, 1.2].forEach((z, i) => pipe(R, z, i === 1 ? C.orange : C.blue));
    [-0.6, 0.6].forEach((z, i) => pipe(R + 1.04, z, i ? C.blue : C.orange));
    pipe(R + 2.08, 0, C.blue);
    p.push(
      box(0.3, 0.3, 3.6, C.dwood, { y: 0.15, x: 1.8 }), box(0.3, 0.3, 3.6, C.dwood, { y: 0.15, x: -1.8 }),
      box(0.14, 2.6, 0.14, C.dwood, { y: 1.5, x: 1.8, z: 1.9 }), box(0.14, 2.6, 0.14, C.dwood, { y: 1.5, x: -1.8, z: 1.9 }),
      box(0.14, 2.6, 0.14, C.dwood, { y: 1.5, x: 1.8, z: -1.9 }), box(0.14, 2.6, 0.14, C.dwood, { y: 1.5, x: -1.8, z: -1.9 }),
      box(0.05, 0.05, 4, C.dgray, { y: 1.4, x: 0.6 }),
    );
    return p;
  })(), { value: 6 });

  add('crane', (() => {
    const p = [
      rbox(6, 1.2, 6, C.gray, { y: 0.6, segments: 1, bevel: 0.2 }),
      // concrete ballast blocks around the base
      rbox(1.6, 0.8, 1.6, C.lgray, { y: 1.6, x: 2, z: 2, segments: 1, bevel: 0.08 }),
      rbox(1.6, 0.8, 1.6, C.lgray, { y: 1.6, x: -2, z: -2, segments: 1, bevel: 0.08 }),
    ];
    // lattice mast: four legs, rungs and diagonals
    const W = 1.6;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(box(0.2, 26, 0.2, C.yellow, { y: 14.2, x: sx * W / 2, z: sz * W / 2 }));
    for (let i = 0; i < 9; i++) {
      const y = 1.5 + i * 2.8;
      p.push(
        box(W, 0.14, 0.14, C.dorange, { y, z: W / 2 }), box(W, 0.14, 0.14, C.dorange, { y, z: -W / 2 }),
        box(0.14, 0.14, W, C.dorange, { y, x: W / 2 }), box(0.14, 0.14, W, C.dorange, { y, x: -W / 2 }),
        box(0.09, 3.0, 0.09, C.yellow, { y: y + 1.4, z: W / 2, rz: 0.6 * (i % 2 ? 1 : -1) }),
        box(0.09, 3.0, 0.09, C.yellow, { y: y + 1.4, z: -W / 2, rz: 0.6 * (i % 2 ? -1 : 1) }),
        box(0.09, 3.0, 0.09, C.yellow, { y: y + 1.4, x: W / 2, rx: 0.6 * (i % 2 ? 1 : -1) }),
        box(0.09, 3.0, 0.09, C.yellow, { y: y + 1.4, x: -W / 2, rx: 0.6 * (i % 2 ? -1 : 1) }),
      );
    }
    // slewing unit, cab, operator window
    p.push(
      cyl(1.5, 1.5, 0.5, C.dark, { y: 27.3, segments: 16 }),
      rbox(2.2, 2.0, 2.4, C.white, { y: 28.5, x: 1.4, z: 0.4, segments: 1, bevel: 0.2 }),
      rbox(0.2, 1.1, 2.0, C.glass, { y: 28.7, x: 2.55, z: 0.4, segments: 1, bevel: 0.04 }),
      rbox(1.2, 0.9, 0.06, C.glass, { y: 28.7, x: 1.4, z: 1.62, segments: 1, bevel: 0.02 }),
      rbox(2.6, 0.15, 2.6, C.dorange, { y: 29.6, x: 1.4, z: 0.4, segments: 1, bevel: 0.04 }),
    );
    // jib truss (triangular cross-section) along X
    p.push(
      box(20, 0.2, 0.2, C.yellow, { y: 30.1, x: 0, z: 0 }),
      box(20, 0.18, 0.18, C.yellow, { y: 29.4, x: 0, z: 0.6 }),
      box(20, 0.18, 0.18, C.yellow, { y: 29.4, x: 0, z: -0.6 }),
    );
    for (let i = 0; i < 20; i++) {
      const x = -9.5 + i;
      p.push(
        box(0.09, 1.0, 0.09, C.dorange, { y: 29.75, x, z: 0.3, rx: -0.55 * (i % 2 ? 1 : -1) }),
        box(0.09, 1.0, 0.09, C.dorange, { y: 29.75, x, z: -0.3, rx: 0.55 * (i % 2 ? 1 : -1) }),
        box(0.09, 0.09, 1.2, C.dorange, { y: 29.4, x }),
      );
    }
    // counter-jib weights, apex, tie rods, trolley, hook
    p.push(
      rbox(3, 1.8, 1.6, C.gray, { y: 28.8, x: -8, segments: 1, bevel: 0.15 }),
      rbox(1.2, 1.2, 1.6, C.lgray, { y: 28.6, x: -6.4, segments: 1, bevel: 0.1 }),
      cone(1.1, 3.6, C.yellow, { y: 32.3, segments: 8 }),
      box(0.09, 10, 0.09, C.dgray, { y: 32.4, x: 3.6, rz: 1.2 }),
      box(0.09, 8, 0.09, C.dgray, { y: 32.3, x: -3.4, rz: -1.15 }),
      rbox(1.0, 0.5, 1.3, C.dark, { y: 28.9, x: 7, segments: 1, bevel: 0.08 }),
      cyl(0.05, 0.05, 10, C.dark, { y: 24, x: 7, segments: 6 }),
      rbox(0.8, 0.6, 0.8, C.red, { y: 18.8, x: 7, segments: 1, bevel: 0.1 }),
      torus(0.28, 0.06, C.silver, { y: 18.2, x: 7, ry: PI / 2, radial: 6, segments: 12 }),
      box(0.6, 0.4, 0.6, C.white, { y: 30.6, x: -8 }),
      cyl(0.05, 0.05, 2.5, C.silver, { y: 34.8, segments: 6 }),
      sphere(0.15, C.red, { y: 36.1, segments: 8, rings: 6 }),
    );
    return p;
  })(), { value: 50, radius: 5.5 });

  return P;
}
