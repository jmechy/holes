// Playful Venice: buildings face +Z, boats travel toward +X.
import { box, rbox, cyl, cone, sphere, torus, lathe, extrude, makeProto } from './build.js';
import { facadeWall, recessedWindow } from './ModelDetails.js';
import { applyModelFinishes } from './ModelFinishes.js';

const C = {
  cream: '#f7e8cc', stone: '#d8c6a4', brick: '#cf7359', roof: '#b95743',
  gold: '#e9b84f', dark: '#343f4b', glass: '#5b969e', wood: '#966b46',
  red: '#ec6963', blue: '#52a8be', green: '#6f977c', white: '#fff7e4',
};
const PI = Math.PI;
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

const palazzo = (w, h, d, color, awning = C.red, style = {}) => {
  const far = style.detail === 'far';
  const shutter = style.shutterColor ?? C.green;
  const columns = Math.max(3, Math.floor(w / 1.8)), openings = [];
  for (let floor = 0; floor < 3; floor++) for (let k = 0; k < columns; k++) {
    openings.push({ x: -w / 2 + (k + 0.5) * w / columns, y: 3.5 + floor * (h - 4) / 3, width: 0.9, height: 1.45 });
  }
  const p = [box(w - 0.36, h, d - 0.7, color, { y: h / 2, surface: 'stucco' }),
    ...[-1, 1].map(side => box(0.18, h, d - 0.36, color, { x: side * (w / 2 - 0.09), y: h / 2, surface: 'stucco' })),
    ...[-1, 1].flatMap(side => facadeWall(w, h, 0.18, color, openings, { z: side * (d / 2 - 0.09), ry: side < 0 ? PI : 0, surface: 'stucco' })),
    box(w + 0.3, 0.35, d + 0.3, C.stone, { y: 0.175, surface: 'stone' }),
    box(w + 0.5, 0.22, d + 0.5, C.cream, { y: h, surface: 'stone' }),
    extrude([[-d / 2 - 0.2, 0], [d / 2 + 0.2, 0], [0, 1.7]], w + 0.5, C.roof, { y: h + 0.1, ry: PI / 2, surface: 'roof', textureRotation: PI / 2 }),
    box(0.5, 1.2, 0.6, C.brick, { x: w * 0.28, z: -d * 0.2, y: h + 1.2 }),
    extrude(arch(1.35, 2.3), 0.08, C.dark, { z: d / 2 + 0.045, y: 0.25 }),
    box(2.9, 0.1, 1.1, awning, { y: 2.9, z: d / 2 + 0.48, rx: 0.12, surface: 'fabric' }),
    box(2.9, 0.3, 0.1, awning, { y: 2.67, z: d / 2 + 1, surface: 'fabric' }),
  ];
  for (const side of [-1, 1]) for (let floor = 0; floor < 3; floor++) for (let k = 0; k < columns; k++) {
    const x = -w / 2 + (k + 0.5) * w / columns;
    const y = 3.5 + floor * (h - 4) / 3;
    if (far) {
      // Pane remains well inside the real opening; far LOD skips jambs, mullions and shutters.
      p.push(box(0.68, 1.23, 0.018, C.glass, { x, y, z: side * (d / 2 - 0.279), surface: 'glass' }));
    } else {
      p.push(...recessedWindow(0.9, 1.45, 0.18, { x, y, z: side * (d / 2 - 0.09), ry: side < 0 ? PI : 0, frameColor: style.frameColor ?? C.cream, glassColor: C.glass, mullion: style.mullions !== false }));
      for (const s of [-1, 1]) {
        const shutterX = x + s * 0.61;
        p.push(box(0.22, 1.15, 0.08, shutter, { x: shutterX, y: y + 0.58, z: side * (d / 2 + 0.08), surface: 'wood' }));
        if (style.louvered) for (let slat = 0; slat < 4; slat++) {
          p.push(box(0.18, 0.025, 0.085, style.louverColor ?? C.wood, { x: shutterX, y: y + 0.2 + slat * 0.22, z: side * (d / 2 + 0.08), surface: 'wood' }));
        }
      }
      if (side === 1 && style.balconies && floor === 1 && (style.balconies === 'all' || k % 2 === 0)) {
        const balconyColor = style.balconyColor ?? C.cream, bz = d / 2 + 0.27, width = 1.25;
        p.push(box(width, 0.075, 0.48, balconyColor, { x, y: y - 0.77, z: bz, surface: 'stone' }),
          box(width, 0.045, 0.045, balconyColor, { x, y: y - 0.45, z: d / 2 + 0.47, surface: 'metal' }));
        for (const dx of [-0.52, -0.26, 0, 0.26, 0.52]) p.push(box(0.035, 0.32, 0.035, balconyColor, { x: x + dx, y: y - 0.61, z: d / 2 + 0.47, surface: 'metal' }));
      }
    }
  }
  // Floor bands sit in the real gap between window rows instead of covering the panes.
  const floorGap = (h - 4) / 3 - 1.45;
  if (!far && floorGap > 0.24) for (const side of [-1, 1]) p.push(
    box(w - 0.3, 0.12, 0.12, C.cream, { y: 3.5 + (h - 4) / 6, z: side * (d / 2 + 0.015), surface: 'stone' }));
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) p.push(box(0.3, h - 0.3, 0.12, C.cream, { x, y: h / 2, z: d / 2 + 0.08 }));
  if (!far) {
    // Small irregular plaster marks land in solid corners below the sill and never over glass.
    const stain = style.weatheringColor ?? C.brick;
    for (const side of [-1, 1]) for (const x of [-w / 2 + 0.18, w / 2 - 0.18]) {
      const patch = [[0, 0], [0.12, 0.015], [0.19, 0.08], [0.13, 0.16], [0.03, 0.13]];
      p.push(extrude(patch, 0.012, stain, { x, y: 2.23, z: side * (d / 2 + 0.006), surface: 'stucco' }));
    }
    // Four low-profile tile courses follow both pitches without changing the roof silhouette.
    const roofRise = [0.34, 0.68, 1.02, 1.36];
    for (const side of [-1, 1]) for (const rise of roofRise) {
      const z = side * (d / 2 + 0.2) * (1 - rise / 1.7);
      p.push(box(w + 0.3, 0.032, 0.04, style.roofTile ?? C.brick, {
        y: h + 0.1 + rise, z, rx: -side * Math.atan(1.7 / (d / 2 + 0.2)), surface: 'roof',
      }));
    }
  }
  return p;
};

const person = (shirt, hat = false) => [
  ...[-0.13, 0.13].flatMap(z => [rbox(0.17, 0.54, 0.14, C.dark, { y: 0.35, z, segments: 3, surface: 'fabric' }), rbox(0.3, 0.12, 0.2, C.wood, { y: 0.06, x: 0.06, z, segments: 3, surface: 'rubber' })]),
  cyl(0.24, 0.22, 0.65, shirt, { y: 0.94, segments: 8, surface: 'fabric' }),
  ...[-0.32, 0.32].map(z => cyl(0.075, 0.07, 0.5, shirt, { y: 0.92, z, segments: 6, surface: 'fabric' })),
  ...[-0.32, 0.32].map(z => sphere(0.07, '#edc5a0', { y: 0.65, z, segments: 8, rings: 5 })),
  cyl(0.08, 0.075, 0.16, '#edc5a0', { y: 1.27, segments: 8, surface: 'skin' }),
  rbox(0.2, 0.09, 0.36, C.white, { y: 1.27, segments: 2, surface: 'fabric' }),
  sphere(0.2, '#edc5a0', { y: 1.5, segments: 8, rings: 5 }),
  ...[-0.17, 0.17].map(z => sphere(0.03, '#edc5a0', { y: 1.49, z, segments: 7, rings: 4 })),
  ...[-0.065, 0.065].map(z => sphere(0.022, C.dark, { x: 0.18, y: 1.53, z, segments: 7, rings: 4 })),
  sphere(0.035, '#edc5a0', { x: 0.19, y: 1.46, sx: 1.25, segments: 7, rings: 4 }),
  ...(hat ? [cyl(0.29, 0.29, 0.05, C.cream, { y: 1.67, segments: 10, surface: 'fabric' }), cyl(0.2, 0.2, 0.14, C.cream, { y: 1.74, segments: 10, surface: 'fabric' }), cyl(0.21, 0.21, 0.04, C.red, { y: 1.71, segments: 10, surface: 'fabric' })] : [sphere(0.205, C.wood, { y: 1.6, sy: 0.5, segments: 8, rings: 4 })]),
];

export function buildProtos() {
  const P = {};
  // Dense little objects make growth steady; the complete city yields roughly radius 20.
  const add = (name, parts, opts) => P[name] = applyModelFinishes(makeProto(name, parts, { ...opts, value: opts.value * 0.52 }));
  const addPalazzo = (name, w, h, d, color, awning, style, value = 10) => {
    const proto = applyModelFinishes(makeProto(name, palazzo(w, h, d, color, awning, style), { value: value * 0.52 }));
    const far = applyModelFinishes(makeProto(`${name}Far`, palazzo(w, h, d, color, awning, { ...style, detail: 'far' }), {
      radius: proto.radius, value: proto.value,
    }));
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
  add('lantern', [cyl(0.16, 0.24, 3.7, '#536e76', { y: 1.85, segments: 10 }), cyl(0.42, 0.42, 0.14, C.dark, { y: 3.72, segments: 8 }), box(0.6, 0.8, 0.6, '#ffe6a0', { y: 4.16 }), cone(0.52, 0.38, C.dark, { y: 4.74, segments: 4, ry: PI / 4 }),
    ...[-1, 1].flatMap(s => [box(0.06, 0.84, 0.65, C.dark, { y: 4.16, x: s * 0.3 }), box(0.65, 0.84, 0.06, C.dark, { y: 4.16, z: s * 0.3 })]),
  ], { value: 2 });
  add('tourist', person('#cf8dbb'), { value: 1.15 });
  add('gondolier', person(C.white, true).concat(...[0.7, 0.87, 1.04, 1.21].map(y => cyl(0.245, 0.235, 0.06, C.blue, { y, segments: 8 }))), { value: 1.15 });
  add('cafeChair', [box(0.65, 0.1, 0.65, C.red, { y: 0.6 }), box(0.65, 0.7, 0.1, C.red, { z: -0.28, y: 0.97 }),
    ...[-0.25, 0.25].flatMap(x => [-0.25, 0.25].map(z => cyl(0.035, 0.035, 0.6, C.dark, { x, z, y: 0.3, segments: 5 }))),
  ], { value: 0.95 });
  add('cafeTable', [cyl(0.82, 0.82, 0.12, C.cream, { y: 1, segments: 12 }), cyl(0.08, 0.1, 0.92, C.dark, { y: 0.46, segments: 8 }), cyl(0.45, 0.45, 0.09, C.dark, { y: 0.045, segments: 8 }),
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

  const palazzi = [
    ['palazzoPink', '#e7a294', 7, 9, 6, C.red, { shutterColor: '#557762', roofTile: '#a94e40', weatheringColor: '#bf7666' }],
    ['palazzoPinkB', '#e7a294', 7, 9, 6, '#e7bd75', { shutterColor: '#4e7182', louvered: true, balconies: 'all', balconyColor: '#e2b966', roofTile: '#963e36', weatheringColor: '#bb7062' }],
    ['palazzoYellow', '#efd697', 8, 10, 6, C.red, { shutterColor: '#66866d', balconies: true, roofTile: '#b85643', weatheringColor: '#c78a60' }],
    ['palazzoYellowB', '#efd697', 8, 10, 6, C.blue, { shutterColor: '#925449', louvered: true, balconies: 'all', balconyColor: C.cream, roofTile: '#a94e40', weatheringColor: '#c18458' }],
    ['palazzoBlue', '#a1c8c7', 6, 8, 5, C.red, { shutterColor: '#986147', roofTile: '#9d453b', weatheringColor: '#779e9b' }],
    ['palazzoBlueB', '#a1c8c7', 6, 8, 5, '#e6c989', { shutterColor: '#a64f48', louvered: true, balconies: 'all', balconyColor: '#e3c68e', roofTile: '#a04b3d', weatheringColor: '#739794' }],
    ['palazzoPeach', '#eab889', 9, 11, 7, C.red, { shutterColor: '#5d7d6d', balconies: true, roofTile: '#b55441', weatheringColor: '#c27b5c' }],
    ['palazzoPeachB', '#eab889', 9, 11, 7, '#e4c983', { shutterColor: '#607e8b', louvered: true, balconies: 'all', balconyColor: '#d8b66e', roofTile: '#9f4a3b', weatheringColor: '#bd7659' }],
  ];
  for (const [name, color, w, h, d, awning, style] of palazzi) addPalazzo(name, w, h, d, color, awning, style);
  addPalazzo('canalPalace', 13, 13, 9, C.cream, C.blue, {
    shutterColor: '#5d7f75', louvered: true, balconies: 'all', balconyColor: C.gold,
    roofTile: '#a64f43', weatheringColor: '#cdbda1',
  }, 18);

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
