// Construction-yard object prototypes. Vehicles are length-along-X, front toward +X unless noted.
import * as THREE from 'three';
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
  ], { value: 1.2 });

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
  ], { value: 1.5 });

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
  ], { value: 3, move: { type: 'drive', speed: 2.5, range: 14 } });

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
  ], { value: 4, move: { type: 'drive', speed: 1.6, range: 12 } });

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
  ], { value: 5, move: { type: 'drive', speed: 1.8, range: 12 } });

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
  ], { value: 5 });

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
  ], { value: 5 });

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
  })(), { value: 4 });

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
  })(), { value: 2.5 });

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
  })(), { value: 20, radius: 5.5 });

  // ---------------------------------------------------------------------------------------------------------------
  // Site furniture: fences, hoarding, lights, bins, signs
  // ---------------------------------------------------------------------------------------------------------------
  const fencePanel = (len = 3.5) => {
    const p = [];
    const h = 2.0;
    p.push(
      box(len, 0.07, 0.07, C.silver, { y: h - 0.04, surface: 'metal' }),
      box(len, 0.07, 0.07, C.silver, { y: 0.3, surface: 'metal' }),
      box(0.08, h, 0.08, C.silver, { y: h / 2, x: -len / 2 + 0.04, surface: 'metal' }),
      box(0.08, h, 0.08, C.silver, { y: h / 2, x: len / 2 - 0.04, surface: 'metal' }),
    );
    for (let x = -len / 2 + 0.3; x < len / 2 - 0.2; x += 0.28) p.push(box(0.025, h - 0.4, 0.025, C.lgray, { y: 1.15, x, surface: 'metal' }));
    p.push(box(len - 0.2, 0.025, 0.025, C.lgray, { y: 1.15, surface: 'metal' }));
    for (const x of [-len / 2 + 0.3, len / 2 - 0.3]) p.push(box(0.35, 0.28, 0.9, C.dgray, { y: 0.14, x, surface: 'stone' }), box(0.07, 0.8, 0.07, C.silver, { y: 0.55, x, surface: 'metal' }));
    return p;
  };
  add('fence', fencePanel(), { value: 0.2, radius: 0.9 });

  add('fenceGate', (() => {
    const p = [];
    for (const s of [-1, 1]) {
      p.push(...fencePanel(2.4).map((g) => { g.translate(s * 1.3, 0, 0); return g; }));
    }
    p.push(box(0.14, 2.3, 0.14, C.dgray, { y: 1.15, x: 0, surface: 'metal' }), box(0.14, 2.3, 0.14, C.dgray, { y: 1.15, x: -2.55, surface: 'metal' }), box(0.14, 2.3, 0.14, C.dgray, { y: 1.15, x: 2.55, surface: 'metal' }));
    p.push(box(0.5, 0.4, 0.04, C.red, { y: 1.5, x: -0.5, z: 0.06 }), box(0.4, 0.06, 0.05, C.white, { y: 1.5, x: -0.5, z: 0.09 }));
    return p;
  })(), { value: 0.8, radius: 1.4 });

  const hoarding = (c1, c2) => {
    const p = [];
    const len = 3.5;
    p.push(box(len, 2.2, 0.08, c1, { y: 1.1, surface: 'wood' }), box(len, 0.18, 0.16, C.dwood, { y: 2.2, surface: 'wood' }), box(len, 0.35, 0.09, c2, { y: 1.0, z: 0.01 }));
    for (const x of [-len / 2 + 0.2, 0, len / 2 - 0.2]) p.push(box(0.12, 2.2, 0.1, C.dwood, { y: 1.1, x, z: -0.1, surface: 'wood' }));
    for (const x of [-len / 2 + 0.2, len / 2 - 0.2]) p.push(box(0.1, 0.12, 0.8, C.dwood, { y: 0.06, x, z: -0.45, surface: 'wood' }), box(0.07, 1.4, 0.07, C.dwood, { y: 0.7, x, z: -0.4, rx: 0.5, surface: 'wood' }));
    for (let x = -1.2; x <= 1.3; x += 1.2) p.push(box(0.5, 0.5, 0.05, C.white, { y: 1.7, x, z: 0.05 }), box(0.3, 0.12, 0.05, c2, { y: 1.7, x, z: 0.08 }));
    return p;
  };
  add('hoardingGreen', hoarding('#4d8a4f', '#2f6a3c'), { value: 0.4, radius: 0.95 });
  add('hoardingBlue', hoarding('#3a6fae', '#254d82'), { value: 0.4, radius: 0.95 });

  add('streetlight', [
    cyl(0.16, 0.22, 0.3, C.dgray, { y: 0.15, segments: 8 }),
    cyl(0.07, 0.1, 5.2, C.dgray, { y: 2.9, segments: 8 }),
    box(1.2, 0.07, 0.07, C.dgray, { y: 5.4, x: 0.5 }),
    rbox(0.6, 0.15, 0.3, C.silver, { y: 5.3, x: 1.0, segments: 1, bevel: 0.04 }),
    box(0.45, 0.04, 0.2, '#fff2c0', { y: 5.21, x: 1.0, emissive: 0.8 }),
  ], { value: 0.4, radius: 0.5 });

  add('lightTower', [
    box(2.0, 0.15, 1.3, C.dark, { y: 0.4 }), box(2.0, 0.5, 1.2, C.yellow, { y: 0.7 }),
    cyl(0.08, 0.1, 5.5, C.gray, { y: 3.4, segments: 8 }),
    box(1.2, 0.8, 0.12, C.dark, { y: 6.4, z: 0 }),
    ...[-0.4, 0, 0.4].flatMap((x) => [0.2, -0.2].map((y) => box(0.3, 0.3, 0.06, '#fff4c8', { y: 6.4 + y, x, z: 0.08, emissive: 0.8 }))),
    ...wheel(0.7, 0.3, 0.7, 0.3, 0.2), ...wheel(0.7, 0.3, -0.7, 0.3, 0.2),
    box(0.8, 0.08, 0.08, C.dark, { y: 0.35, x: -1.3 }),
  ], { value: 1.5, radius: 1.1 });

  add('trashcan', [
    lathe([[0.26, 0], [0.34, 0.05], [0.37, 0.9]], '#3f5a46', { segments: 12 }),
    cyl(0.4, 0.4, 0.06, '#2d4234', { y: 0.93, segments: 12 }),
    cyl(0.4, 0.4, 0.04, '#2d4234', { y: 0.2, segments: 12 }),
    box(0.2, 0.05, 0.05, C.dark, { y: 1.0 }),
  ], { value: 0.25 });

  add('bucket', [
    cyl(0.3, 0.24, 0.5, C.orange, { y: 0.25, segments: 10 }),
    cyl(0.31, 0.31, 0.05, C.white, { y: 0.5, segments: 10 }),
    box(0.5, 0.03, 0.03, C.dark, { y: 0.62 }),
  ], { value: 0.15 });

  add('sandbag', [
    ...[-0.3, 0.3].map((x) => rbox(0.55, 0.22, 0.32, '#c9b27a', { y: 0.12, x, segments: 1, bevel: 0.07, surface: 'fabric' })),
    rbox(0.55, 0.22, 0.32, '#bba46c', { y: 0.34, segments: 1, bevel: 0.07, surface: 'fabric' }),
  ], { value: 0.15 });

  add('roadSign', [
    box(0.08, 1.2, 0.08, C.dark, { y: 0.6 }),
    box(0.9, 0.06, 0.06, C.dark, { y: 0.06 }), box(0.06, 0.06, 0.7, C.dark, { y: 0.06 }),
    box(0.8, 0.8, 0.04, C.orange, { y: 1.55, rz: PI / 4, z: 0.05 }),
    box(0.1, 0.4, 0.05, C.dark, { y: 1.58, z: 0.08 }), box(0.1, 0.1, 0.05, C.dark, { y: 1.3, z: 0.08 }),
  ], { value: 0.3, radius: 0.55 });

  add('siteSign', [
    box(0.12, 2.6, 0.12, C.dwood, { y: 1.3, x: -1.0 }), box(0.12, 2.6, 0.12, C.dwood, { y: 1.3, x: 1.0 }),
    box(2.4, 1.3, 0.08, C.white, { y: 2.2 }), box(2.4, 0.4, 0.09, C.green, { y: 2.65 }),
    ...[-0.7, 0, 0.7].map((x) => box(0.4, 0.4, 0.09, [C.blue, C.red, C.yellow][Math.round(x / 0.7) + 1], { y: 2.05, x })),
    box(2.0, 0.1, 0.09, C.dgray, { y: 1.65 }),
  ], { value: 0.5, radius: 0.9 });

  add('picnic', [
    box(1.9, 0.07, 0.8, C.wood, { y: 0.78, surface: 'wood' }),
    ...[0.65, -0.65].map((z) => box(1.9, 0.07, 0.3, C.dwood, { y: 0.45, z, surface: 'wood' })),
    ...[-0.7, 0.7].flatMap((x) => [box(0.08, 0.06, 1.7, C.dwood, { y: 0.3, x, surface: 'wood' }), box(0.07, 0.8, 0.07, C.dwood, { y: 0.4, x, z: 0.4, surface: 'wood' }), box(0.07, 0.8, 0.07, C.dwood, { y: 0.4, x, z: -0.4, surface: 'wood' })]),
  ], { value: 0.7, radius: 1.0 });

  add('skipBin', [
    extrude([[-1.5, 0.3], [1.5, 0.3], [1.7, 1.3], [-1.7, 1.3]], 1.6, '#2f6f3f', { z: 0, bevel: 0.03, segments: 1 }),
    box(3.2, 0.12, 1.7, C.dark, { y: 0.1 }),
    box(3.0, 0.2, 1.4, '#8a7a5a', { y: 1.28 }),
    box(3.5, 0.1, 0.1, C.yellow, { y: 1.0, z: 0.82 }),
    ...[-1.2, 1.2].map((x) => box(0.1, 0.1, 0.1, C.silver, { y: 1.35, x, z: 0.8 })),
  ], { value: 1.5, radius: 1.7 });

  // ---------------------------------------------------------------------------------------------------------------
  // Materials: lumber, rebar, blocks, bags, sand/gravel, cable drums, containers
  // ---------------------------------------------------------------------------------------------------------------
  add('lumberPile', (() => {
    const p = [];
    for (let l = 0; l < 6; l++) {
      for (let k = 0; k < 3; k++) p.push(box(3.6, 0.15, 0.4, (l + k) % 2 ? C.wood : C.dwood, { y: 0.3 + l * 0.17, z: -0.45 + k * 0.45, surface: 'wood' }));
      if (l < 5) for (const x of [-1.4, 0, 1.4]) p.push(box(0.08, 0.04, 1.3, C.dwood, { y: 0.395 + l * 0.17, x, surface: 'wood' }));
    }
    for (const x of [-1.2, 1.2]) p.push(box(0.2, 0.2, 1.4, C.dwood, { y: 0.1, x, surface: 'wood' }));
    p.push(box(3.7, 0.02, 0.06, C.orange, { y: 0.95, z: 0.1 }));
    return p;
  })(), { value: 0.9, radius: 1.2 });

  const bundle = (color, n) => {
    const p = [];
    const rows = [4, 3, 2];
    rows.forEach((cnt, r) => { for (let i = 0; i < cnt; i++) p.push(cyl(0.055, 0.055, 4.2, color, { y: 0.3 + r * 0.1, z: (i - (cnt - 1) / 2) * 0.12, rz: PI / 2, segments: 6, surface: 'metal' })); });
    for (const x of [-1.3, 1.3]) p.push(box(0.14, 0.14, 0.9, C.dwood, { y: 0.07, x, surface: 'wood' }), box(0.05, 0.4, 0.5, C.dark, { y: 0.4, x }));
    p.push(box(0.2, 0.05, 0.14, C.yellow, { y: 0.62, x: 0.5 }));
    return p;
  };
  add('rebarBundle', bundle('#8a4b2c'), { value: 0.6, radius: 1.3 });
  add('steelBundle', bundle('#a8442b').concat([box(4.2, 0.3, 0.3, '#7a3524', { y: 0.7, surface: 'metal' })]), { value: 0.8, radius: 1.3 });

  add('blockPallet', (() => {
    const p = [box(1.2, 0.12, 1.0, C.dwood, { y: 0.06, surface: 'wood' })];
    for (let l = 0; l < 4; l++) for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) p.push(box(0.38, 0.2, 0.46, '#a8a69e', { y: 0.22 + l * 0.2, x: -0.4 + i * 0.4 + (l % 2) * 0.04, z: -0.23 + k * 0.46, surface: 'stone' }));
    p.push(box(1.22, 0.03, 0.04, C.dark, { y: 0.5, z: 0.1 }));
    return p;
  })(), { value: 0.5 });

  add('bagPallet', (() => {
    const p = [box(1.1, 0.12, 1.1, C.dwood, { y: 0.06, surface: 'wood' })];
    for (let l = 0; l < 4; l++) for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) p.push(rbox(0.5, 0.2, 0.5, (l + i + k) % 2 ? '#d9d1bc' : '#cfc6ae', { y: 0.22 + l * 0.2, x: -0.26 + i * 0.52, z: -0.26 + k * 0.52, segments: 1, bevel: 0.05, surface: 'fabric' }));
    p.push(box(0.5, 0.04, 0.03, C.blue, { y: 0.5, x: 0.26, z: 0.52 }));
    return p;
  })(), { value: 0.5 });

  const mound = (color, dark) => [
    cone(2.4, 1.5, color, { y: 0.75, segments: 12, surface: 'stone' }),
    cone(1.5, 1.2, dark, { y: 0.6, x: 1.3, z: 0.5, segments: 10, surface: 'stone' }),
    cone(1.2, 0.9, color, { y: 0.45, x: -1.3, z: -0.6, segments: 10, surface: 'stone' }),
    box(0.4, 0.15, 0.25, C.dark, { y: 0.07, x: 2.1 }),
  ];
  add('sandPile', mound('#d8bc7a', '#c4a866'), { value: 2, radius: 2.2 });
  add('gravelPile', mound('#9b9a95', '#83827e'), { value: 2, radius: 2.2 });

  add('cableDrum', [
    ...[-0.35, 0.35].map((z) => cyl(0.65, 0.65, 0.07, C.dwood, { y: 0.65, z, rx: PI / 2, segments: 14, surface: 'wood' })),
    cyl(0.5, 0.5, 0.65, C.orange, { y: 0.65, rx: PI / 2, segments: 12 }),
    cyl(0.12, 0.12, 0.8, C.dark, { y: 0.65, rx: PI / 2, segments: 8 }),
  ], { value: 0.5 });

  const container = (color, office) => {
    const p = [box(6, 2.5, 2.4, color, { y: 1.45, surface: 'metal' }), box(6, 0.2, 2.4, C.dark, { y: 0.1 }), box(6.1, 0.08, 2.5, C.dgray, { y: 2.74 })];
    for (let x = -2.8; x <= 2.8; x += 0.4) p.push(box(0.1, 2.3, 0.04, color, { y: 1.45, x, z: 1.21, surface: 'metal' }), box(0.1, 2.3, 0.04, color, { y: 1.45, x, z: -1.21, surface: 'metal' }));
    if (office) {
      p.push(...recessedWindow(1.2, 0.9, 0.04, { x: -1.4, y: 1.7, z: 1.23, frameColor: C.white, glassColor: C.glass }), ...recessedWindow(1.2, 0.9, 0.04, { x: 0.6, y: 1.7, z: 1.23, frameColor: C.white, glassColor: C.glass }),
        rbox(0.9, 2.0, 0.06, C.dwood, { y: 1.2, x: 2.3, z: 1.25, segments: 1, bevel: 0.02 }), box(1.4, 0.1, 0.9, C.dgray, { y: 0.25, x: 2.3, z: 1.7 }));
    } else p.push(box(0.1, 2.3, 0.1, C.silver, { y: 1.45, x: 3.02, z: 0.5 }), box(0.1, 2.3, 0.1, C.silver, { y: 1.45, x: 3.02, z: -0.5 }));
    return p;
  };
  add('containerRed', container('#a8432f'), { value: 3, radius: 3.1 });
  add('containerBlue', container('#2e5f9c'), { value: 3, radius: 3.1 });
  add('containerOffice', container('#e8e5d8', true), { value: 3.5, radius: 3.1 });

  // ---------------------------------------------------------------------------------------------------------------
  // Scaffolding + buildings in progress
  // ---------------------------------------------------------------------------------------------------------------
  const xform = (parts, { x = 0, y = 0, z = 0, ry = 0 }) => {
    const m = new THREE.Matrix4().makeRotationY(ry);
    m.setPosition(x, y, z);
    for (const g of parts) g.applyMatrix4(m);
    return parts;
  };
  // Scaffold wall along X, outer side towards +Z (depth 1.2), `levels` working decks 2m apart. Net: green safety netting on the outer face.
  const scaffoldWall = (len, levels, { net = false, ladder = true, x = 0, z = 0, ry = 0 } = {}) => {
    const p = [];
    const bays = Math.max(1, Math.round(len / 2.4));
    const bl = len / bays, top = levels * 2.0;
    for (let i = 0; i <= bays; i++) {
      const sx = -len / 2 + i * bl;
      for (const sz of [0, 1.2]) p.push(box(0.09, top + 1.0, 0.09, C.silver, { y: (top + 1.0) / 2, x: sx, z: sz, surface: 'metal' }));
      p.push(box(0.3, 0.05, 0.3, C.dgray, { y: 0.03, x: sx, z: 0 }), box(0.3, 0.05, 0.3, C.dgray, { y: 0.03, x: sx, z: 1.2 }));
      p.push(box(0.06, 0.06, 1.2, C.silver, { y: 1.9, x: sx, z: 0.6, surface: 'metal' }));
    }
    for (let l = 1; l <= levels; l++) {
      const y = l * 2.0;
      p.push(box(len, 0.07, 0.07, C.silver, { y, z: 1.2, surface: 'metal' }), box(len, 0.07, 0.07, C.silver, { y, z: 0, surface: 'metal' }));
      for (let i = 0; i < bays; i++) {
        const cx = -len / 2 + (i + 0.5) * bl;
        p.push(box(bl - 0.05, 0.06, 1.1, (i + l) % 2 ? C.wood : C.dwood, { y: y + 0.06, x: cx, z: 0.6, surface: 'wood' }));
        p.push(box(0.05, 2.35, 0.05, C.silver, { y: y - 1.0, x: cx, z: 1.2, rx: 0, rz: i % 2 ? 0.8 : -0.8, surface: 'metal' }));
      }
      p.push(box(len, 0.06, 0.06, C.silver, { y: y + 1.0, z: 1.2, surface: 'metal' }), box(len, 0.06, 0.06, C.silver, { y: y + 0.5, z: 1.2, surface: 'metal' }), box(len, 0.16, 0.03, C.dwood, { y: y + 0.18, z: 1.2, surface: 'wood' }));
      if (net) for (let i = 0; i < bays; i++) {
        const cx = -len / 2 + (i + 0.5) * bl;
        if ((i + l) % 3 !== 0) p.push(box(bl - 0.1, 0.55, 0.025, '#3f8f4f', { y: y + 0.55, x: cx, z: 1.25, surface: 'fabric' }));
      }
    }
    if (ladder) {
      const lx = -len / 2 + bl * 0.5 - 0.35;
      for (const dx of [0, 0.4]) p.push(box(0.05, top, 0.05, C.lgray, { y: top / 2, x: lx + dx, z: 1.35, surface: 'metal' }));
      for (let y = 0.4; y < top - 0.2; y += 0.4) p.push(box(0.4, 0.04, 0.04, C.lgray, { y, x: lx + 0.2, z: 1.35 + y * 0.12 * 0 + 0.0, surface: 'metal' }));
    }
    return xform(p, { x, z, ry });
  };

  add('scaffoldTower', (() => {
    const p = scaffoldWall(2.4, 3, { ladder: true });
    for (const g of scaffoldWall(2.4, 3, { ladder: false, ry: PI, z: 1.2, x: 0 })) p.push(g);
    return p;
  })(), { value: 2.5, radius: 1.6 });

  const slab = (w, d, y, color = '#bdbab0') => box(w, 0.35, d, color, { y, surface: 'stone' });
  const edgeRail = (w, y, z, x = 0, ry = 0) => xform([
    box(w, 0.06, 0.06, C.orange, { y: y + 1.0 }), box(w, 0.06, 0.06, C.orange, { y: y + 0.5 }),
    ...Array.from({ length: Math.floor(w / 2.5) + 1 }, (_, i) => box(0.06, 1.1, 0.06, C.orange, { y: y + 0.55, x: -w / 2 + i * (w / Math.floor(w / 2.5)) })),
  ], { x, z, ry });

  const foundationSlabB = (W = 18, D = 12) => {
    const p = [];
    p.push(box(W, 0.5, D, '#a9a69c', { y: 0.25, surface: 'stone' }));
    p.push(box(W * 0.45, 0.04, D - 0.4, '#c9c6bb', { y: 0.52, x: -W * 0.27, surface: 'stone' }));
    // timber formwork round the pour and bracing stakes
    for (const s of [-1, 1]) p.push(box(W, 0.7, 0.1, C.wood, { y: 0.35, z: s * (D / 2 + 0.05), surface: 'wood' }));
    for (const s of [-1, 1]) p.push(box(0.1, 0.7, D, C.wood, { y: 0.35, x: s * (W / 2 + 0.05), surface: 'wood' }));
    for (let x = -W / 2 + 1; x < W / 2; x += 2.5) for (const s of [-1, 1]) p.push(box(0.08, 0.9, 0.08, C.dwood, { y: 0.4, x, z: s * (D / 2 + 0.5), rx: s * 0.6, surface: 'wood' }));
    // rebar mat over the right-hand half, on chairs, with column starter bars
    const rust = '#7a4a2c';
    for (let x = 0.5; x < W / 2 - 0.2; x += 0.6) p.push(box(0.04, 0.04, D - 0.8, rust, { y: 0.85, x, surface: 'metal' }));
    for (let z = -D / 2 + 0.6; z < D / 2 - 0.3; z += 0.6) p.push(box(W / 2 - 0.8, 0.04, 0.04, rust, { y: 0.9, x: W / 4, z, surface: 'metal' }));
    for (const x of W > 20 ? [2.5, 6.5, 10.5] : [2.5, 6.5]) for (const z of D > 14 ? [-5.4, -1.8, 1.8, 5.4] : [-3.6, 0, 3.6]) {
      for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) p.push(box(0.04, 2.3, 0.04, rust, { y: 1.65, x: x + dx, z: z + dz, surface: 'metal' }));
      for (const y of [1.0, 1.6, 2.2]) p.push(box(0.3, 0.03, 0.3, rust, { y, x, z, surface: 'metal' }));
    }
    for (const x of W > 20 ? [-10.5, -7, -3.5, 0] : [-7, -3.5, 0]) for (const z of D > 14 ? [-5.4, -1.8, 1.8, 5.4] : [-3.6, 0, 3.6]) p.push(box(0.5, 0.5, 0.5, '#bdbab0', { y: 0.75, x, z, surface: 'stone' }));
    p.push(box(0.1, 1.0, 0.1, C.yellow, { y: 0.9, x: 0, z: 5.9 }), box(0.9, 0.5, 0.05, C.white, { y: 1.2, x: 0, z: 5.95 }));
    return p;
  };
  add('foundationSlab', foundationSlabB(), { value: 6, radius: 9.2 });
  add('foundationSlabL', foundationSlabB(26, 16), { value: 8, radius: 13.2 });

  const steelFrameB = (W = 16, D = 10, nx = 5, nz = 3, levels = 3) => {
    const p = [], H = 4;
    const xs = Array.from({ length: nx }, (_, i) => -W / 2 + i * W / (nx - 1));
    const zs = Array.from({ length: nz }, (_, i) => -D / 2 + i * D / (nz - 1));
    const steel = '#b24a2c', steel2 = '#8f3a22';
    p.push(box(W + 1, 0.4, D + 1, '#aaa79d', { y: 0.2, surface: 'stone' }));
    for (const x of xs) for (const z of zs) {
      p.push(box(0.4, 0.25, 0.4, C.dgray, { y: 0.5, x, z, surface: 'metal' }));
      const h = x === xs[0] || x === xs[nx - 1] ? levels * H : levels * H - (z === zs[1] ? 4 : 0);
      p.push(box(0.1, h, 0.34, steel, { y: 0.6 + h / 2, x, z, surface: 'metal' }), box(0.34, h, 0.08, steel, { y: 0.6 + h / 2, x, z, surface: 'metal' }));
    }
    for (let l = 1; l <= levels; l++) {
      const y = 0.6 + l * H - 0.2;
      for (const z of zs) p.push(box(W, 0.4, 0.22, l % 2 ? steel : steel2, { y, z, surface: 'metal' }));
      for (const x of xs) p.push(box(0.22, 0.34, D, l % 2 ? steel2 : steel, { y: y - 0.03, x, surface: 'metal' }));
      for (let x = -W / 2 + 1; x < W / 2; x += 2) if (l < levels || x < 0) p.push(box(0.14, 0.3, D, steel, { y: y - 0.08, x, surface: 'metal', sx: 0.5 }));
      if (l === 1) p.push(box(W, 0.14, D, '#b5b2a8', { y: y + 0.28, surface: 'stone' }));
      if (l === 2) p.push(box(W / 2 + 4, 0.1, D, '#5d646b', { y: y + 0.25, x: -W / 4 + 2, surface: 'metal' }));
    }
    // X-bracing on the end bays
    for (const l of Array.from({ length: levels }, (_, i) => i)) for (const s of [-1, 1]) p.push(box(0.08, 5.5, 0.1, '#8d949b', { y: 0.6 + l * H + H / 2, x: s * (W / 2 - 2), z: D / 2, rz: s * 0.7, surface: 'metal' }));
    // hoist gin pole + hanging beam
    p.push(box(0.12, 3.0, 0.12, C.yellow, { y: levels * H + 1.8 + 1.5, x: W / 2 - 1, z: -D / 2 }), box(2.4, 0.3, 0.2, steel2, { y: levels * H - 2, x: -4, z: 0, surface: 'metal' }));
    p.push(...edgeRail(W, 0.6 + levels * H, D / 2), ...edgeRail(W, 0.6 + levels * H, -D / 2));
    p.push(...scaffoldWall(W / 2, Math.max(2, levels - 1), { z: D / 2 + 0.4, x: W / 4, net: true }));
    return p;
  };
  add('steelFrame', steelFrameB(), { value: 8, radius: 9.5 });
  add('steelFrameL', steelFrameB(28, 14, 8, 3, 4), { value: 11, radius: 14.3 });
  add('steelFrameM', steelFrameB(22, 12, 6, 3, 3), { value: 9, radius: 11.4 });

  

  const concreteFrameB = (W = 16, D = 12, nx = 5, nz = 4, floors = 3) => {
    const p = [], L = 3.4;
    const xs = Array.from({ length: nx }, (_, i) => -W / 2 + 0.3 + i * (W - 0.6) / (nx - 1));
    const zs = Array.from({ length: nz }, (_, i) => -D / 2 + 0.3 + i * (D - 0.6) / (nz - 1));
    p.push(box(W + 1.2, 0.3, D + 1.2, '#a3a094', { y: 0.15, surface: 'stone' }));
    for (let l = 0; l <= floors; l++) for (const x of xs) for (const z of zs) p.push(box(0.5, L, 0.5, '#c2bfb3', { y: 0.3 + l * L + L / 2, x, z, surface: 'stone' }));
    for (let l = 1; l <= floors; l++) {
      p.push(slab(W, D, 0.3 + l * L - 0.17));
      p.push(...edgeRail(W, 0.3 + l * L, D / 2 - 0.1), ...edgeRail(W, 0.3 + l * L, -D / 2 + 0.1));
    }
    // top level: shuttering and falsework props under a half-poured deck
    const top = 0.3 + (floors + 1) * L;
    p.push(box(W / 2, 0.1, D, C.wood, { y: top - 0.1, x: -W / 4, surface: 'wood' }));
    for (let x = -W / 2 + 1; x < 0; x += 1.4) for (let z = -D / 2 + 1; z < D / 2; z += 1.4) p.push(cyl(0.05, 0.05, L - 0.2, C.silver, { y: top - L / 2 - 0.2, x, z, segments: 5, surface: 'metal' }));
    p.push(slab(W / 2, D, top - 0.2, '#d0cdc2'));
    // lift/stair core rising higher with rebar starters
    p.push(box(3.6, L * (floors + 1) + 3, 0.4, '#b0ada2', { y: (L * (floors + 1) + 3) / 2, x: W / 2 - 2.0, z: D / 2 - 0.2, surface: 'stone' }), box(0.4, L * (floors + 1) + 3, 3.6, '#b0ada2', { y: (L * (floors + 1) + 3) / 2, x: W / 2 - 0.2, z: D / 2 - 2.0, surface: 'stone' }));
    for (const x of xs.slice(0, 3)) for (const z of [zs[0], zs[nz - 1]]) for (const [dx, dz] of [[-0.1, -0.1], [0.1, 0.1]]) p.push(box(0.04, 1.4, 0.04, '#7a4a2c', { y: top + 0.7, x: x + dx, z: z + dz, surface: 'metal' }));
    p.push(...scaffoldWall(W - 4, floors + 1, { z: -D / 2 - 0.3, ry: PI, net: true, x: -1 }));
    p.push(...scaffoldWall(6, 2, { z: D / 2 + 0.4, x: -3 }));
    // formwork stack + hanging skip bucket
    p.push(box(2.0, 0.6, 1.2, C.wood, { y: 3.9, x: -5, z: 0, surface: 'wood' }));
    return p;
  };
  add('concreteFrame', concreteFrameB(), { value: 8, radius: 9.5 });
  add('concreteFrameL', concreteFrameB(28, 17, 8, 5, 4), { value: 11, radius: 14.3 });
  add('concreteFrameM', concreteFrameB(22, 14, 6, 4, 3), { value: 9, radius: 11.4 });

  

  // Cladding buildings: ground floors finished (brick/stucco + real window openings), upper floors bare frame + netting
  const cladBuilding = (W, D, floors, clad, wall, win) => {
    const p = [], L = 3.4, nx = Math.round(W / 4) + 1, nz = 3;
    const xs = Array.from({ length: nx }, (_, i) => -W / 2 + 0.25 + i * (W - 0.5) / (nx - 1));
    const zs = Array.from({ length: nz }, (_, i) => -D / 2 + 0.25 + i * (D - 0.5) / (nz - 1));
    p.push(box(W + 0.6, 0.3, D + 0.6, '#a3a094', { y: 0.15, surface: 'stone' }));
    for (let l = 0; l < floors; l++) for (const x of xs) for (const z of zs) {
      if (l < clad && z !== zs[1]) continue;
      p.push(box(0.5, L, 0.5, '#c2bfb3', { y: 0.3 + l * L + L / 2, x, z, surface: 'stone' }));
    }
    for (let l = 1; l <= floors; l++) p.push(slab(W, D, 0.3 + l * L - 0.17));
    // clad storeys: front/back/side walls with window openings
    const wallPart = (len, ry, x, z, floor, n) => {
      const y0 = 0.3 + floor * L;
      const holes = Array.from({ length: n }, (_, i) => ({ x: -len / 2 + (i + 0.5) * len / n, y: 1.7, width: 1.3, height: 1.4 }));
      const parts = facadeWall(len, L - 0.35, 0.3, wall, holes, { surface: 'brick', textureScale: 1.6 });
      const wins = holes.flatMap((h) => recessedWindow(1.3, 1.4, 0.12, { x: h.x, y: h.y, z: 0.15, frame: 0.1, frameColor: C.white, glassColor: win, mullion: true }));
      return xform([...parts, ...wins], { x, y: y0, z, ry });
    };
    for (let l = 0; l < clad; l++) {
      p.push(...wallPart(W - 0.4, 0, 0, D / 2 - 0.15, l, Math.round(W / 3.4)));
      p.push(...wallPart(W - 0.4, PI, 0, -D / 2 + 0.15, l, l === 0 ? 0 : 3));
      p.push(...wallPart(D - 0.4, PI / 2, W / 2 - 0.15, 0, l, 2));
      p.push(...wallPart(D - 0.4, -PI / 2, -W / 2 + 0.15, 0, l, 2));
    }
    // upper floors: edge rails
    for (let l = clad + 1; l <= floors; l++) p.push(...edgeRail(W, 0.3 + l * L, D / 2 - 0.1), ...edgeRail(W, 0.3 + l * L, -D / 2 + 0.1));
    // scaffolding on the front across the full height, netting above the clad storeys
    p.push(...scaffoldWall(W - 2, Math.ceil((floors * L) / 2), { z: D / 2 + 0.3, net: true, x: 0 }));
    p.push(...scaffoldWall(D - 1, Math.ceil((clad * L) / 2) + 1, { x: W / 2 + 0.3, ry: PI / 2, z: 0, ladder: false }));
    // roof slab-edge hoist and material hoist
    p.push(box(0.15, floors * L + 2, 0.15, C.yellow, { y: (floors * L + 2) / 2, x: -W / 2 - 0.6, z: D / 2 + 1.2 }));
    p.push(box(1.2, 0.1, 1.2, C.dgray, { y: 1.5, x: -W / 2 - 0.6, z: D / 2 + 1.2 }));
    return p;
  };
  add('cladBrick', cladBuilding(20, 11, 4, 2, '#b5603f', C.glass), { value: 9, radius: 11 });
  add('cladStucco', cladBuilding(16, 11, 5, 1, '#e3d6b5', '#7fb0cf'), { value: 8, radius: 9.5 });
  add('cladBrickL', cladBuilding(30, 14, 5, 3, '#b5603f', C.glass), { value: 12, radius: 15 });
  add('cladStuccoL', cladBuilding(26, 13, 6, 2, '#e3d6b5', '#7fb0cf'), { value: 11, radius: 13.5 });
  add('cladGreyL', cladBuilding(24, 12, 4, 2, '#9fa4aa', '#7fb0cf'), { value: 10, radius: 12.5 });

  const brickShellB = (W = 18, D = 12) => {
    const p = [], L = 3.4, nw = Math.round(W / 4.5);
    p.push(box(W + 0.6, 0.3, D + 0.6, '#a3a094', { y: 0.15, surface: 'stone' }), slab(W, D, 0.3 + L - 0.17));
    const wall = (len, ry, x, z, floor, n, doors) => {
      const holes = Array.from({ length: n }, (_, i) => ({ x: -len / 2 + (i + 0.5) * len / n, y: 1.7, width: 1.3, height: 1.5 }));
      if (doors) holes.push({ x: len / 2 - 1.5, y: 1.1, width: 1.2, height: 2.2 });
      const parts = facadeWall(len, L - 0.35, 0.34, '#b5603f', holes.slice(0, n).concat(doors ? [holes[n]] : []), { surface: 'brick', textureScale: 1.6 });
      return xform(parts, { x, y: 0.3 + floor * L, z, ry });
    };
    for (const f of [0, 1]) {
      p.push(...wall(W, 0, 0, D / 2 - 0.17, f, nw, f === 0), ...wall(W, PI, 0, -D / 2 + 0.17, f, nw, false), ...wall(D, PI / 2, W / 2 - 0.17, 0, f, Math.round(D / 6), false), ...wall(D, -PI / 2, -W / 2 + 0.17, 0, f, Math.round(D / 6), false));
    }
    // half-built partition and a partly framed roof
    p.push(box(0.2, L - 0.4, D * 0.6, '#c9573a', { y: 0.3 + L + (L - 0.4) / 2, x: 2, surface: 'brick' }));
    for (let x = -W / 2 + 1; x <= W / 9; x += 2) {
      p.push(box(0.12, 0.3, D + 1, C.dwood, { y: 0.3 + 2 * L + 0.5, x, surface: 'wood' }));
      p.push(box(0.1, 0.2, D / 2 + 0.5, C.dwood, { y: 0.3 + 2 * L + 1.7, x, z: D / 4, rx: 0.5, surface: 'wood' }), box(0.1, 0.2, D / 2 + 0.5, C.dwood, { y: 0.3 + 2 * L + 1.7, x, z: -D / 4, rx: -0.5, surface: 'wood' }));
    }
    p.push(box(W * 0.6, 0.12, 0.12, C.dwood, { y: 0.3 + 2 * L + 2.5, x: -4 }));
    p.push(...scaffoldWall(W - 1, 3, { z: D / 2 + 0.4, net: false }), ...scaffoldWall(D - 1, 3, { x: W / 2 + 0.4, ry: PI / 2, ladder: false, net: true }));
    return p;
  };
  add('brickShell', brickShellB(), { value: 8, radius: 10 });
  add('brickShellL', brickShellB(28, 16), { value: 10, radius: 14.3 });

  // ---------------------------------------------------------------------------------------------------------------
  // Site-scale stockpiles, welfare and plant (large footprints: a few of these fill a plot instead of many small props)
  // ---------------------------------------------------------------------------------------------------------------
  add('pipeRack', (() => {
    const p = [], L = 10;
    for (const x of [-4, 0, 4]) p.push(box(0.12, 1.5, 2.2, C.dgray, { y: 0.75, x, surface: 'metal' }), box(0.4, 0.1, 2.4, C.dark, { y: 0.05, x }));
    for (const [n, y] of [[4, 0.35], [3, 0.8], [2, 1.25]]) for (let i = 0; i < n; i++) p.push(cyl(0.22, 0.22, L, i % 2 ? '#3d7fd0' : '#2b2b2e', { y, z: (i - (n - 1) / 2) * 0.5, rz: PI / 2, segments: 8, surface: 'metal' }));
    p.push(box(L, 0.04, 0.06, C.yellow, { y: 1.55, z: 1.0 }));
    return p;
  })(), { value: 1.5, radius: 5.2 });

  add('blockStack', (() => {
    const p = [box(5.0, 0.12, 2.4, C.dwood, { y: 0.06, surface: 'wood' })];
    for (let l = 0; l < 7; l++) for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) p.push(box(0.78, 0.2, 0.7, (i + k + l) % 5 === 0 ? '#9d9b93' : '#a8a69e', { y: 0.22 + l * 0.2, x: -2.0 + i * 0.8 + (l % 2) * 0.06, z: -0.74 + k * 0.74, surface: 'stone' }));
    p.push(box(5.0, 0.04, 0.05, C.dark, { y: 0.8, z: 0.3 }), box(5.0, 0.04, 0.05, C.dark, { y: 1.1, z: -0.3 }));
    return p;
  })(), { value: 1.2, radius: 2.7 });

  add('lumberYard', (() => {
    const p = [];
    for (const x of [-3.2, 0, 3.2]) p.push(box(0.2, 0.2, 2.4, C.dwood, { y: 0.1, x, surface: 'wood' }));
    for (let l = 0; l < 9; l++) {
      for (let k = 0; k < 5; k++) p.push(box(8.2, 0.14, 0.4, (l + k) % 2 ? C.wood : C.dwood, { y: 0.3 + l * 0.17, z: -0.9 + k * 0.45, surface: 'wood' }));
      if (l < 8) for (const x of [-3.2, 0, 3.2]) p.push(box(0.08, 0.04, 2.1, C.dwood, { y: 0.385 + l * 0.17, x, surface: 'wood' }));
    }
    p.push(box(8.3, 0.03, 0.05, C.orange, { y: 1.5, z: 0.4 }), box(8.3, 0.03, 0.05, C.orange, { y: 1.2, z: -0.5 }));
    return p;
  })(), { value: 1.6, radius: 4.3 });

  add('aggregateBay', (() => {
    const p = [], W = 9;
    for (const [x0, col, dark] of [[-3, '#9b9a95', '#83827e'], [0, '#d8bc7a', '#c4a866'], [3, '#a09a8c', '#8a8576']]) {
      p.push(box(0.35, 1.5, 2.9, '#bdbab0', { y: 0.75, x: x0 - 1.5, z: 0, surface: 'stone' }));
      p.push(cone(1.9, 1.3, col, { y: 0.65, x: x0, z: -0.3, segments: 10, surface: 'stone' }), cone(1.2, 0.9, dark, { y: 0.45, x: x0 + 0.6, z: 0.5, segments: 8, surface: 'stone' }));
    }
    p.push(box(0.35, 1.5, 2.9, '#bdbab0', { y: 0.75, x: 4.5, z: 0, surface: 'stone' }), box(W, 1.5, 0.3, '#bdbab0', { y: 0.75, z: -1.45, surface: 'stone' }));
    p.push(box(W, 0.1, 0.1, C.yellow, { y: 1.55, z: -1.45 }));
    return p;
  })(), { value: 2, radius: 4.8 });

  add('formworkStack', (() => {
    const p = [];
    for (let l = 0; l < 8; l++) p.push(box(4.4, 0.09, 2.2, l % 2 ? '#d2a766' : '#c99a5b', { y: 0.25 + l * 0.1, surface: 'wood' }));
    for (const x of [-1.8, 0, 1.8]) p.push(box(0.2, 0.15, 2.4, C.dwood, { y: 0.07, x, surface: 'wood' }));
    for (let i = 0; i < 6; i++) p.push(cyl(0.05, 0.05, 2.4, C.silver, { y: 1.35, x: -1.8 + i * 0.7, z: 0.2, rx: PI / 2, segments: 5, surface: 'metal' }), cyl(0.05, 0.05, 2.4, C.silver, { y: 1.5, x: -1.8 + i * 0.7, z: -0.3, rx: PI / 2, segments: 5, surface: 'metal' }));
    return p;
  })(), { value: 1, radius: 2.6 });

  // two-storey welfare / site-office cabin block with an external steel stair
  add('cabinStack', (() => {
    const p = [];
    for (const [y, col] of [[0, '#e8e5d8'], [2.75, '#dedacb']]) {
      p.push(box(6, 2.5, 2.4, col, { y: y + 1.45, surface: 'metal' }), box(6, 0.2, 2.4, C.dark, { y: y + 0.1 }), box(6.1, 0.08, 2.5, C.dgray, { y: y + 2.74 }));
      for (const x of [-1.9, 0.1, 2.1]) p.push(...recessedWindow(1.2, 0.9, 0.04, { x, y: y + 1.7, z: 1.23, frameColor: C.white, glassColor: C.glass }));
      p.push(rbox(0.9, 2.0, 0.06, C.dwood, { y: y + 1.2, x: -2.5, z: -1.25, segments: 1, bevel: 0.02 }));
    }
    p.push(box(6, 0.12, 1.0, C.dgray, { y: 2.78, z: 1.9 }), box(6, 1.0, 0.05, C.dgray, { y: 3.3, z: 2.4 }));
    for (const x of [-2.9, 2.9]) p.push(box(0.1, 2.8, 0.1, C.dgray, { y: 1.4, x, z: 2.4 }));
    for (let i = 0; i < 9; i++) p.push(box(0.6, 0.06, 0.8, C.dgray, { y: 0.3 + i * 0.3, x: -2.4 + i * 0.6, z: 1.6 }));
    return p;
  })(), { value: 4, radius: 3.5 });

  // parked wheel loader (a static prop; the working loaders are skid steers / excavators)
  add('wheelLoader', (() => {
    const p = [];
    for (const [x, z] of [[1.3, 1.25], [-1.3, 1.25], [1.3, -1.25], [-1.3, -1.25]]) p.push(cyl(0.95, 0.95, 0.8, C.tire, { y: 0.95, x, z, rx: PI / 2, segments: 14, surface: 'rubber' }), cyl(0.45, 0.45, 0.82, C.yellow, { y: 0.95, x, z, rx: PI / 2, segments: 10 }));
    p.push(rbox(2.4, 1.3, 2.0, C.yellow, { y: 1.8, x: -1.7, segments: 2, bevel: 0.25 }), rbox(2.6, 0.8, 1.7, C.yellow, { y: 1.5, x: 0.9, segments: 2, bevel: 0.2 }));
    p.push(rbox(1.5, 1.4, 1.5, C.glass, { y: 3.0, x: -0.8, segments: 1, bevel: 0.1 }), rbox(1.8, 0.14, 1.8, C.yellow, { y: 3.8, x: -0.8, segments: 1, bevel: 0.05 }));
    p.push(box(1.0, 0.7, 1.3, C.dorange, { y: 2.2, x: -3.0 }));
    p.push(sphere(0.12, C.orange, { emissive: 1.6, y: 3.95, x: -0.8, segments: 8, rings: 6 }));
    for (const z of [0.8, -0.8]) p.push(box(3.0, 0.2, 0.2, C.dgray, { y: 1.3, x: 2.7, z }));
    p.push(extrude([[0, 0], [1.3, 0], [1.6, 0.9], [1.3, 1.5], [0, 1.1]], 3.4, C.gray, { y: 0.35, x: 4.0, bevel: 0.05, segments: 1 }));
    return p;
  })(), { value: 4, radius: 3.6 });

  return P;
}
