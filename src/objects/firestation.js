// Fire-station town object prototypes. Vehicles are length-along-X, front toward +X.
import { box, cyl, cone, sphere, rbox, capsule, lathe, extrude, torus, makeProto } from './build.js';

const C = {
  red: '#d9302a', dred: '#a82320', white: '#f4f4f4', dark: '#2b2b2e', gray: '#8d949b', dgray: '#5d646b', lgray: '#c3c8cd',
  blue: '#2f7fd6', dblue: '#1f4f9a', navy: '#22315c', yellow: '#ffcc1a', tan: '#d8b26a', dtan: '#b38b45',
  wood: '#c99a5b', dwood: '#a97b42', skin: '#f1c8a0', tire: '#1f1f22', glass: '#8fd3f4', green: '#3f9b4a',
  dgreen: '#2d7a38', lgreen: '#5fb85a', brown: '#7a5230', dbrown: '#5e3d22', orange: '#ff8a1a', silver: '#d5dade',
  brick: '#b5482f', dbrick: '#8a3d2c', cream: '#f0e4c4', black: '#18181a', hair: '#5a3b22',
};
const PI = Math.PI;

const wheel = (x, y, z, r, w = 0.5) => [
  cyl(r, r, w, C.tire, { x, y, z, rx: PI / 2, segments: 14 }),
  cyl(r * 0.58, r * 0.58, w + 0.04, C.lgray, { x, y, z, rx: PI / 2, segments: 10 }),
  ...(r > 0.6 ? [cyl(r * 0.2, r * 0.2, w + 0.1, C.dark, { x, y, z, rx: PI / 2, segments: 6 })] : []),
];

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
  rbox(0.42, 0.24, w * 0.42, C.red, { x, y: y + 0.06, z: z + w * 0.24, segments: 1, bevel: 0.08 }),
  rbox(0.42, 0.24, w * 0.42, C.blue, { x, y: y + 0.06, z: z - w * 0.24, segments: 1, bevel: 0.08 }),
];

const car = (body, roof = body) => [
  box(4.2, 0.2, 1.7, C.dark, { y: 0.4 }),
  rbox(4.4, 0.62, 1.9, body, { y: 0.74, segments: 2, bevel: 0.18 }),
  rbox(2.4, 0.72, 1.76, roof, { y: 1.4, x: -0.35, segments: 2, bevel: 0.22 }),
  box(2.0, 0.4, 1.8, C.glass, { y: 1.44, x: -0.35 }),
  box(0.05, 0.4, 1.5, C.glass, { y: 1.44, x: 0.86 }),
  box(0.05, 0.4, 1.5, C.glass, { y: 1.44, x: -1.56 }),
  box(0.06, 0.42, 1.82, roof, { y: 1.44, x: -0.35 }),
  box(0.06, 0.42, 1.82, roof, { y: 1.44, x: -1.0 }),
  rbox(1.9, 0.08, 1.55, C.white, { y: 1.78, x: -0.35, segments: 1, bevel: 0.03 }),
  // bumpers, grille, lights, plate
  rbox(0.22, 0.28, 1.95, C.silver, { y: 0.55, x: 2.2, segments: 1, bevel: 0.06 }),
  rbox(0.22, 0.28, 1.95, C.silver, { y: 0.55, x: -2.2, segments: 1, bevel: 0.06 }),
  box(0.06, 0.2, 0.8, C.dark, { y: 0.85, x: 2.21 }),
  box(0.1, 0.2, 0.42, '#fff6c8', { y: 0.95, x: 2.2, z: 0.68 }),
  box(0.1, 0.2, 0.42, '#fff6c8', { y: 0.95, x: 2.2, z: -0.68 }),
  box(0.1, 0.18, 0.38, '#e0201a', { y: 0.95, x: -2.2, z: 0.7 }),
  box(0.1, 0.18, 0.38, '#e0201a', { y: 0.95, x: -2.2, z: -0.7 }),
  // door lines + handles + mirrors
  box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: 0.5, z: 0.96 }),
  box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: -1.2, z: 0.96 }),
  box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: 0.5, z: -0.96 }),
  box(0.04, 0.5, 0.04, C.dark, { y: 0.85, x: -1.2, z: -0.96 }),
  box(0.2, 0.06, 0.06, C.silver, { y: 1.0, x: -0.3, z: 0.96 }),
  box(0.2, 0.06, 0.06, C.silver, { y: 1.0, x: -0.3, z: -0.96 }),
  box(0.16, 0.16, 0.14, body, { y: 1.3, x: 0.78, z: 1.0 }),
  box(0.16, 0.16, 0.14, body, { y: 1.3, x: 0.78, z: -1.0 }),
  ...wheel(1.4, 0.4, 0.92, 0.4, 0.32), ...wheel(1.4, 0.4, -0.92, 0.4, 0.32),
  ...wheel(-1.4, 0.4, 0.92, 0.4, 0.32), ...wheel(-1.4, 0.4, -0.92, 0.4, 0.32),
];

// window on a wall facing +Z (face = 'z') or +X (face = 'x'); sign = +1/-1 for the opposite face
const win = (x, y, z, w, h, face = 'z', sign = 1, frame = C.white, pane = C.glass) => {
  const o = 0.05 * sign;
  if (face === 'z') {
    return [
      box(w + 0.24, h + 0.24, 0.08, frame, { x, y, z: z + o }),
      box(w, h, 0.1, pane, { x, y, z: z + o * 1.4 }),
      box(0.06, h, 0.12, frame, { x, y, z: z + o * 1.5 }),
      box(w, 0.06, 0.12, frame, { x, y, z: z + o * 1.5 }),
      box(w + 0.4, 0.08, 0.22, C.lgray, { x, y: y - h / 2 - 0.16, z: z + o * 2.4 }),
    ];
  }
  return [
    box(0.08, h + 0.24, w + 0.24, frame, { x: x + o, y, z }),
    box(0.1, h, w, pane, { x: x + o * 1.4, y, z }),
    box(0.12, h, 0.06, frame, { x: x + o * 1.5, y, z }),
    box(0.12, 0.06, w, frame, { x: x + o * 1.5, y, z }),
    box(0.22, 0.08, w + 0.4, C.lgray, { x: x + o * 2.4, y: y - h / 2 - 0.16, z }),
  ];
};

const house = (wall, roof, door, trim = C.white) => [
  box(6.4, 0.3, 5.6, C.gray, { y: 0.15 }),
  rbox(6, 2.9, 5.2, wall, { y: 1.6, segments: 1, bevel: 0.1 }),
  // gable roof: two slabs with overhang + ridge + gable triangles
  rbox(6.8, 0.2, 3.9, roof, { y: 4.15, z: 1.5, rx: 0.65, segments: 1, bevel: 0.05 }),
  rbox(6.8, 0.2, 3.9, roof, { y: 4.15, z: -1.5, rx: -0.65, segments: 1, bevel: 0.05 }),
  rbox(6.9, 0.22, 0.4, roof, { y: 5.28, segments: 1, bevel: 0.05 }),
  extrude([[-2.6, 0], [2.6, 0], [0, 2.15]], 0.12, wall, { y: 3.05, x: 3.0, ry: PI / 2 }),
  extrude([[-2.6, 0], [2.6, 0], [0, 2.15]], 0.12, wall, { y: 3.05, x: -3.0, ry: PI / 2 }),
  box(0.05, 0.6, 0.6, C.glass, { y: 3.9, x: 3.08 }), box(0.05, 0.6, 0.6, C.glass, { y: 3.9, x: -3.08 }),
  // chimney
  rbox(0.9, 1.8, 0.9, C.brick, { y: 4.6, x: 1.7, z: -1.0, segments: 1, bevel: 0.06 }),
  box(1.1, 0.14, 1.1, C.dgray, { y: 5.55, x: 1.7, z: -1.0 }),
  // door, frame, step, knob, porch roof
  box(1.3, 2.2, 0.08, trim, { y: 1.2, x: -1.3, z: 2.62 }),
  rbox(1.0, 1.95, 0.1, door, { y: 1.1, x: -1.3, z: 2.66, segments: 1, bevel: 0.04 }),
  sphere(0.07, C.yellow, { y: 1.1, x: -0.95, z: 2.75, segments: 6, rings: 5 }),
  box(0.5, 0.5, 0.06, C.glass, { y: 1.7, x: -1.3, z: 2.72 }),
  rbox(2.2, 0.14, 1.0, C.lgray, { y: 0.22, x: -1.3, z: 3.1, segments: 1, bevel: 0.04 }),
  rbox(2.0, 0.14, 1.2, roof, { y: 2.55, x: -1.3, z: 3.0, rx: 0.15, segments: 1, bevel: 0.04 }),
  box(0.1, 2.3, 0.1, trim, { y: 1.3, x: -2.2, z: 3.45 }), box(0.1, 2.3, 0.1, trim, { y: 1.3, x: -0.4, z: 3.45 }),
  // windows with shutters
  ...win(1.6, 1.8, 2.6, 1.2, 1.1, 'z', 1, trim),
  box(0.35, 1.3, 0.08, door, { y: 1.8, x: 0.8, z: 2.63 }), box(0.35, 1.3, 0.08, door, { y: 1.8, x: 2.4, z: 2.63 }),
  ...win(0, 1.8, 3.0, 1.1, 1.0, 'x', 1, trim), ...win(0, 1.8, -3.0, 1.1, 1.0, 'x', -1, trim),
  ...win(-1.2, 1.8, -2.6, 1.1, 1.0, 'z', -1, trim), ...win(1.4, 1.8, -2.6, 1.1, 1.0, 'z', -1, trim),
];

const flame = (x, y, z, s = 1) => [
  lathe([[0, 0], [0.5, 0.15], [0.55, 0.5], [0.38, 1.2], [0.12, 1.9], [0, 2.3]], C.red, { x, y, z, sx: s, sy: s, sz: s, segments: 8 }),
  lathe([[0, 0], [0.36, 0.15], [0.4, 0.5], [0.26, 1.1], [0.08, 1.6], [0, 1.9]], C.orange, { x: x + 0.05, y, z, sx: s, sy: s, sz: s, segments: 8 }),
  lathe([[0, 0], [0.2, 0.12], [0.22, 0.4], [0.12, 0.8], [0, 1.2]], C.yellow, { x, y, z: z + 0.05, sx: s, sy: s, sz: s, segments: 8 }),
];

/** Standing person, faces +X. */
const person = (o) => {
  const { coat, pants, hat, boots = C.black, hair = C.hair, skin = C.skin, vest = null } = o;
  return [
    cyl(0.1, 0.09, 0.5, pants, { y: 0.3, z: 0.11, segments: 8, flat: false }),
    cyl(0.1, 0.09, 0.5, pants, { y: 0.3, z: -0.11, segments: 8, flat: false }),
    box(0.32, 0.12, 0.17, boots, { y: 0.06, x: 0.05, z: 0.11 }),
    box(0.32, 0.12, 0.17, boots, { y: 0.06, x: 0.05, z: -0.11 }),
    cyl(0.22, 0.26, 0.6, coat, { y: 0.85, segments: 10 }),
    ...(vest ? [cyl(0.235, 0.27, 0.08, vest, { y: 0.72, segments: 10 }), cyl(0.225, 0.245, 0.08, vest, { y: 0.95, segments: 10 })] : []),
    cyl(0.265, 0.265, 0.07, C.dark, { y: 0.58, segments: 10 }),
    cyl(0.07, 0.065, 0.55, coat, { y: 0.88, z: 0.31, rx: 0.25, segments: 8, flat: false }),
    cyl(0.07, 0.065, 0.55, coat, { y: 0.88, z: -0.31, rx: -0.25, segments: 8, flat: false }),
    sphere(0.08, C.black, { y: 0.62, z: 0.37, segments: 6, rings: 5 }),
    sphere(0.08, C.black, { y: 0.62, z: -0.37, segments: 6, rings: 5 }),
    sphere(0.19, skin, { y: 1.37, segments: 10, rings: 8 }),
    sphere(0.05, skin, { y: 1.34, x: 0.19, segments: 6, rings: 4 }),
    box(0.04, 0.05, 0.05, C.dark, { y: 1.39, x: 0.17, z: 0.08 }),
    box(0.04, 0.05, 0.05, C.dark, { y: 1.39, x: 0.17, z: -0.08 }),
    sphere(0.19, hair, { y: 1.42, x: -0.06, sy: 0.85, segments: 8, rings: 6, flat: false }),
    ...hat,
  ];
};

export function buildProtos() {
  const P = {};
  const add = (name, parts, opts) => (P[name] = makeProto(name, parts.flat(), opts));

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
  }), { value: 0.6, move: { type: 'walk', speed: 1.4, range: 9 } });

  add('dalmatian', (() => {
    const p = [
      capsule(0.2, 0.5, C.white, { y: 0.55, rz: PI / 2, segments: 10, caps: 3 }),
      ...[[0.32, 0.13], [0.32, -0.13], [-0.32, 0.13], [-0.32, -0.13]].map(([x, z]) => cyl(0.06, 0.05, 0.42, C.white, { y: 0.21, x, z, segments: 8, flat: false })),
      ...[[0.32, 0.13], [0.32, -0.13], [-0.32, 0.13], [-0.32, -0.13]].map(([x, z]) => box(0.14, 0.05, 0.1, C.white, { y: 0.02, x: x + 0.03, z })),
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
      cyl(0.03, 0.05, 0.42, C.white, { y: 0.78, x: -0.6, rz: 0.9, segments: 6, flat: false }),
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
  ], { value: 0.3 });

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
  ], { value: 1.0 });

  add('pine', [
    lathe([[0.32, 0], [0.24, 0.4], [0.2, 1.2]], C.brown, { segments: 8, flat: false }),
    cone(1.5, 1.6, C.dgreen, { y: 1.9, segments: 14 }),
    cone(1.3, 1.5, C.green, { y: 2.7, segments: 14 }),
    cone(1.1, 1.4, C.dgreen, { y: 3.4, segments: 14 }),
    cone(0.9, 1.3, C.green, { y: 4.1, segments: 12 }),
    cone(0.65, 1.2, C.dgreen, { y: 4.7, segments: 12 }),
    cone(0.4, 1.0, C.lgreen, { y: 5.2, segments: 10 }),
  ], { value: 1.1 });

  add('car', car(C.blue), { value: 2.2 });
  add('carGreen', car(C.green, C.dgreen), { value: 2.2 });
  add('carYellow', car(C.yellow, '#e0a800'), { value: 2.2 });
  add('carWhite', car(C.white, C.lgray), { value: 2.2 });

  add('house', house(C.cream, C.red, C.dwood), { value: 6, radius: 3.8 });
  add('houseBlue', house('#a9cdf2', C.dblue, C.white, '#f6f6f6'), { value: 6, radius: 3.8 });
  add('houseYellow', house('#f7dc7a', C.brown, C.red), { value: 6, radius: 3.8 });

  add('policecar', [
    ...car(C.white, C.white),
    rbox(4.42, 0.32, 1.92, C.navy, { y: 0.66, segments: 1, bevel: 0.1 }),
    rbox(1.3, 0.32, 1.86, C.navy, { y: 1.3, x: -1.4, segments: 1, bevel: 0.08 }),
    box(1.2, 0.08, 0.05, C.yellow, { y: 0.75, x: 0.2, z: 0.98 }),
    box(1.2, 0.08, 0.05, C.yellow, { y: 0.75, x: 0.2, z: -0.98 }),
    ...lightBar(-0.3, 1.95, 0, 1.4),
    box(0.06, 0.3, 0.3, C.gray, { y: 1.1, x: 2.3 }),
  ], { value: 4 });

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
  ], { value: 8 });

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
  ], { value: 10 });

  add('laddertruck', [
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
    // aerial ladder reaching forward over the cab, slightly raised, with rungs
    box(16, 0.3, 0.3, C.silver, { y: 4.9, x: 1.2, z: 0.6, rz: 0.06 }),
    box(16, 0.3, 0.3, C.silver, { y: 4.9, x: 1.2, z: -0.6, rz: 0.06 }),
    box(15.5, 0.12, 0.12, C.gray, { y: 4.6, x: 1.2, rz: 0.06 }),
    ...Array.from({ length: 26 }, (_, i) => box(0.09, 0.09, 1.2, C.silver, { y: 4.68 + i * 0.038, x: -6.4 + i * 0.62 })),
    ...Array.from({ length: 8 }, (_, i) => box(0.06, 0.9, 0.06, C.gray, { y: 5.35 + i * 0.03, x: -5.6 + i * 2, z: 0.62 })),
    rbox(1.4, 0.6, 1.5, C.yellow, { y: 5.4, x: 9.1, segments: 1, bevel: 0.1 }),
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
  ], { value: 16 });

  add('burning', (() => {
    const p = [
      rbox(8.5, 0.3, 8.5, C.gray, { y: 0.15, segments: 1, bevel: 0.08 }),
      rbox(7.5, 9, 7.5, C.dbrick, { y: 4.8, segments: 1, bevel: 0.15 }),
      rbox(7.9, 0.5, 7.9, C.dark, { y: 9.5, segments: 1, bevel: 0.1 }),
      box(7.7, 0.3, 0.2, C.dgray, { y: 9.0, z: 3.75 }),
      ...[0, 1, 2].map((i) => box(7.6, 0.16, 7.6, '#a04a36', { y: 3.3 + i * 3.0 })),
    ];
    for (const [i, y] of [2.4, 5.4, 8.0].entries()) {
      for (const [j, x] of [-2.2, 0, 2.2].entries()) {
        if (i === 0 && j === 1) continue;
        const hot = (i + j) % 2 === 0 && i > 0;
        p.push(
          box(1.5, 1.6, 0.1, C.white, { y, x, z: 3.76 }),
          box(1.2, 1.3, 0.12, hot ? C.orange : C.dark, { y, x, z: 3.78 }),
          box(0.07, 1.3, 0.14, C.white, { y, x, z: 3.8 }),
          box(1.2, 0.07, 0.14, C.white, { y, x, z: 3.8 }),
          box(1.8, 0.14, 0.4, C.lgray, { y: y - 0.85, x, z: 3.9 }),
        );
      }
    }
    p.push(
      box(1.7, 2.6, 0.12, C.dark, { y: 1.3, z: 3.78 }),
      box(2.6, 0.2, 1.4, C.red, { y: 2.8, z: 4.3, rx: 0.3 }),
      // fire escape on the side
      ...[1.6, 4.4, 7.0].map((y) => box(0.9, 0.1, 3.0, C.dgray, { y, x: 3.95, z: -0.6 })),
      ...[2.9, 5.7].map((y) => box(0.06, 2.9, 0.4, C.dgray, { y, x: 3.95, z: 0.7, rx: 0, rz: 0.6 })),
      box(0.06, 0.8, 3.0, C.dark, { y: 7.5, x: 4.4, z: -0.6 }),
      // flames
      ...flame(-2.2, 4.6, 4.0, 0.9),
      ...flame(2.2, 7.3, 4.0, 1.0),
      ...flame(0.5, 9.6, 1.0, 1.6),
      ...flame(-2, 9.6, -2, 1.2),
      ...flame(2.4, 9.6, -1.6, 1.3),
      // smoke puffs
      sphere(0.9, '#4a4a50', { y: 12.0, x: 0.2, z: 0.4, segments: 8, rings: 6, flat: false }),
      sphere(0.7, '#5c5c63', { y: 12.9, x: 0.6, z: 0.8, segments: 8, rings: 6, flat: false }),
      sphere(0.55, '#6c6c74', { y: 13.6, x: 1.0, z: 1.0, segments: 8, rings: 6, flat: false }),
      rbox(0.6, 1.5, 0.6, C.dark, { y: 10.4, x: 3, z: 3, segments: 1, bevel: 0.05 }),
    );
    return p;
  })(), { value: 40 });

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
  })(), { value: 50, radius: 4 });

  add('firestation', (() => {
    const p = [
      rbox(27, 0.4, 15, C.gray, { y: 0.2, segments: 1, bevel: 0.1 }),
      rbox(26, 7.6, 14, '#c0392b', { y: 4.2, segments: 1, bevel: 0.25 }),
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
    // upper windows
    for (const x of [-10.5, -4.5, 4.5, 10.5]) p.push(...win(x, 6.0, 7.0, 1.6, 1.2, 'z', 1));
    for (const z of [-2, 2]) p.push(...win(13, 4.5, z, 1.6, 1.4, 'x', 1));
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
  })(), { value: 150, radius: 13 });

  return P;
}
