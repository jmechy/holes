// Blocky World object prototypes: voxel style, box() only. Animals face +X.
// "More detail" here means more voxels: pixel-art faces, multi-tone speckled textures built from small boxes,
// leaf/log block patterns, planked walls, brick rings, carved windows and doors.
import { box, makeProto } from './build.js';

const C = {
  grass: '#5cae3c', grassTop: '#6cc04a', dirt: '#8a5a34', dirtD: '#6f4526', stone: '#8c8c8c', stoneD: '#6e6e6e',
  cobble: '#7a7a7a', coal: '#2a2a2a', iron: '#d9a98a', gold: '#f5d33c', diamond: '#4fe0e0', redstone: '#d02020',
  oak: '#6b4a25', oakD: '#4f3519', leaf: '#3f8f2a', leafD: '#2f7420', birch: '#e6e2d4', birchD: '#2b2b2b',
  leafB: '#6fb84a', plank: '#b98a4e', plankD: '#8f6a38', white: '#f2f2f2', black: '#1e1e1e', red: '#d9382b',
  yellow: '#ffd21a', orange: '#f28a1a', pink: '#f4a6b8', pinkD: '#d98598', skin: '#e0b08a', wool: '#ececec',
  woolD: '#cfcfcf', cowB: '#4a3426', creeper: '#4cb04a', creeperD: '#2f7d33', zombie: '#4f9a4a', zShirt: '#2fa6b8',
  zPants: '#3a3f9a', wolf: '#c9c9c9', wolfD: '#9a9a9a', sand: '#e6d69a', cactus: '#2e8b3a', roof: '#a33a2a',
  glass: '#9ad8f0', water: '#3f76e4', robe: '#6b4a2a', villagerSkin: '#c99a76', tnt: '#d9382b', purple: '#8e44c9',
  torchF: '#ffb020', hay: '#e0b830', pumpkin: '#e8801a', sky: '#6cc0ff', ice: '#a8dcff', lava: '#ff6a10',
  obsidian: '#2a1a40', brick: '#b5482f', ironDoor: '#c8c8c8', leafPink: '#f2a6c8',
};

const hex2 = (n) => n.toString(16).padStart(2, '0');
/** Scale an sRGB hex colour's brightness (f<1 darker, f>1 lighter). */
const shade = (c, f) => {
  const n = parseInt(c.slice(1), 16);
  return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => hex2(Math.max(0, Math.min(255, Math.round(v * f))))).join('');
};
const rng = (seed) => {
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
};

const B = (w, h, d, c, x, y, z) => box(w, h, d, c, { x, y, z }); // y = centre

/**
 * Pixel speckles on the faces of a box centred (cx,cy,cz) of size w,h,d: n small square "pixels" snapped to a grid
 * of ~px, coloured from cols, sitting 0.022 proud. faces: x/X = -x/+x, z/Z = -z/+z, y = top.
 */
function speck(cx, cy, cz, w, h, d, cols, n, seed, { px = 0.11, faces = 'xXzZy' } = {}) {
  const r = rng(seed), out = [], t = 0.03;
  const nx = Math.max(1, Math.round(w / px)), ny = Math.max(1, Math.round(h / px)), nz = Math.max(1, Math.round(d / px));
  const ux = w / nx, uy = h / ny, uz = d / nz;
  for (let i = 0; i < n; i++) {
    const f = faces[(r() * faces.length) | 0], c = cols[(r() * cols.length) | 0];
    const ix = ((r() * nx) | 0) + 0.5, iy = ((r() * ny) | 0) + 0.5, iz = ((r() * nz) | 0) + 0.5;
    if (f === 'x' || f === 'X') out.push(B(t, uy, uz, c, cx + (f === 'X' ? 1 : -1) * (w / 2 + t / 2 - 0.008), cy - h / 2 + iy * uy, cz - d / 2 + iz * uz));
    else if (f === 'z' || f === 'Z') out.push(B(ux, uy, t, c, cx - w / 2 + ix * ux, cy - h / 2 + iy * uy, cz + (f === 'Z' ? 1 : -1) * (d / 2 + t / 2 - 0.008)));
    else out.push(B(ux, t, uz, c, cx - w / 2 + ix * ux, cy + h / 2 + t / 2 - 0.008, cz - d / 2 + iz * uz));
  }
  return out;
}
/** Textured block: base box + speckles. */
const texBox = (w, h, d, base, cols, n, seed, cx = 0, cy = h / 2, cz = 0, o) => [B(w, h, d, base, cx, cy, cz), ...speck(cx, cy, cz, w, h, d, cols, n, seed, o)];
/** Stack of thin dark bands wrapped round a wall (brick / plank courses). */
const courses = (cx, cz, w, d, y0, y1, step, c) => {
  const p = [];
  for (let y = y0; y <= y1 + 1e-6; y += step) p.push(B(w + 0.04, 0.07, d + 0.04, c, cx, y, cz));
  return p;
};

/** Pixel face on the +X side of a head cube of size s centred (hx,hy,hz). */
function face(hx, hy, hz, s, { eye = '#ffffff', pupil = '#3a3a8a', brow = null, mouth = null, eyeY = 0.12, eyeZ = 0.24 } = {}) {
  const p = [], x = hx + s / 2 + 0.012, u = s / 8;
  for (const sg of [1, -1]) {
    p.push(B(0.03, u * 1.4, u * 2, eye, x, hy + s * eyeY, hz + sg * s * eyeZ));
    p.push(B(0.036, u * 1.4, u, pupil, x, hy + s * eyeY, hz + sg * (s * eyeZ - u * 0.5)));
    if (brow) p.push(B(0.03, u * 0.7, u * 2.6, brow, x, hy + s * eyeY + u * 1.5, hz + sg * s * eyeZ));
  }
  if (mouth) p.push(B(0.03, u * 0.9, u * 4, mouth, x, hy - s * 0.26, hz));
  return p;
}

/** A blob of voxel leaves from stacked layer masks (strings of X/.) with per-leaf tone variation. */
function leaves(cx, y0, cz, layers, cell, cols, seed) {
  const r = rng(seed), p = [];
  layers.forEach((m, k) => {
    const n = m.length;
    m.forEach((row, i) => {
      for (let j = 0; j < row.length; j++) {
        if (row[j] !== 'X') continue;
        p.push(B(cell, cell, cell, cols[(r() * cols.length) | 0], cx + (j - (row.length - 1) / 2) * cell, y0 + (k + 0.5) * cell, cz + (i - (n - 1) / 2) * cell));
      }
    });
  });
  return p;
}
/** Square mask n x n; round=true chops the four corners. */
const sq = (n, round = false) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (round && (i === 0 || i === n - 1) && (j === 0 || j === n - 1) ? '.' : 'X')).join(''));
const plus = () => ['.X.', 'XXX', '.X.'];

/** Bark: trunk box + dark/light vertical bark pixels. */
const trunk = (w, h, c, seed, x = 0, z = 0, n = 34) => texBox(w, h, w, c, [shade(c, 0.72), shade(c, 1.18), shade(c, 0.85)], n, seed, x, h / 2, z, { px: w / 6 });

// ---------- creatures ----------
function quad({ bodyC, bodyD = shade(bodyC, 0.85), headC, legC, hoofC = null, len, hgt, wid, legH, headS, snout = null, ears = 'up', earC = headC,
  tail = null, spots = null, eyes = {}, extra = [], seed = 1, horns = null, headD = null }) {
  const p = [];
  p.push(B(len, hgt, wid, bodyC, 0, legH + hgt / 2, 0));
  p.push(B(len - 0.02, hgt * 0.24, wid + 0.03, bodyD, 0, legH + hgt * 0.12, 0));
  p.push(...speck(0, legH + hgt / 2, 0, len, hgt, wid, [bodyD, shade(bodyC, 1.08)], 16, seed, { px: Math.max(0.1, wid / 6) }));
  if (spots) p.push(...speck(0, legH + hgt / 2, 0, len, hgt, wid, spots.cols, spots.n, seed + 5, { px: spots.px }));
  const lx = len / 2 - Math.max(0.16, wid * 0.22), lz = wid / 2 - Math.max(0.1, wid * 0.15), lw = Math.max(0.22, wid * 0.26);
  const hoofH = hoofC ? Math.min(0.14, legH * 0.28) : 0;
  [[lx, lz], [lx, -lz], [-lx, lz], [-lx, -lz]].forEach(([x, z]) => {
    p.push(B(lw, legH - hoofH + 0.02, lw, legC, x, hoofH + (legH - hoofH) / 2, z));
    if (hoofC) p.push(B(lw + 0.02, hoofH, lw + 0.02, hoofC, x, hoofH / 2, z));
  });
  const hx = len / 2 + headS / 2 - 0.05, hy = legH + hgt + headS * 0.1;
  p.push(B(headS, headS, headS * 1.05, headC, hx, hy, 0));
  if (headD) p.push(...speck(hx, hy, 0, headS, headS, headS * 1.05, [headD], 7, seed + 9, { px: headS / 6, faces: 'zZy' }));
  p.push(...face(hx, hy, 0, headS, { eye: '#ffffff', pupil: '#1e1e1e', eyeY: 0.14, eyeZ: 0.27, ...eyes }));
  if (snout) {
    const sx = hx + headS / 2 + snout.l / 2 - 0.02, sy = hy - headS * 0.22 + (snout.dy || 0);
    p.push(B(snout.l, snout.h, snout.w, snout.c, sx, sy, 0));
    if (snout.nostril) for (const sg of [1, -1]) p.push(B(0.03, snout.h * 0.22, snout.w * 0.13, snout.nostril, sx + snout.l / 2 + 0.01, sy + snout.h * 0.08, sg * snout.w * 0.24));
  }
  if (ears === 'up') for (const sg of [1, -1]) p.push(B(headS * 0.16, headS * 0.28, headS * 0.2, earC, hx - headS * 0.1, hy + headS * 0.62, sg * headS * 0.36));
  else if (ears === 'side') for (const sg of [1, -1]) p.push(B(headS * 0.18, headS * 0.18, headS * 0.26, earC, hx - headS * 0.05, hy + headS * 0.32, sg * (headS * 0.5 + 0.07)));
  else if (ears === 'point') for (const sg of [1, -1]) p.push(B(headS * 0.16, headS * 0.34, headS * 0.18, earC, hx - headS * 0.1, hy + headS * 0.62, sg * headS * 0.3), B(headS * 0.08, headS * 0.2, headS * 0.1, C.pinkD, hx - headS * 0.02, hy + headS * 0.6, sg * headS * 0.3));
  if (horns) for (const sg of [1, -1]) p.push(B(headS * 0.13, headS * 0.13, headS * 0.28, horns, hx - headS * 0.1, hy + headS * 0.5, sg * headS * 0.62), B(headS * 0.12, headS * 0.28, headS * 0.13, horns, hx - headS * 0.1, hy + headS * 0.66, sg * headS * 0.72));
  if (tail) p.push(B(tail.l, tail.h, tail.w, tail.c, -len / 2 - tail.l / 2 + 0.03, legH + hgt * (tail.at ?? 0.85), 0), ...(tail.tip ? [B(tail.l * 0.5, tail.h * 1.15, tail.w * 1.15, tail.tip, -len / 2 - tail.l + 0.03, legH + hgt * (tail.at ?? 0.85), 0)] : []));
  return p.concat(extra);
}

function humanoid({ skin, skinD = shade(skin, 0.85), shirt, shirtD = shade(shirt, 0.82), pants, pantsD = shade(pants, 0.82), shoe = C.black, hair = null,
  armsFwd = false, seed = 3, eyes = {}, torn = false, bodyH = 0.8, headS = 0.5, legH = 0.8, mouth = '#3a2a22', extra = [] }) {
  const p = [];
  const top = legH + bodyH;
  for (const sg of [1, -1]) {
    p.push(...texBox(0.26, legH - 0.12, 0.26, pants, [pantsD], 6, seed + sg, 0, 0.12 + (legH - 0.12) / 2, sg * 0.14, { px: 0.09 }));
    p.push(B(0.34, 0.12, 0.3, shoe, 0.04, 0.06, sg * 0.14));
  }
  p.push(...texBox(0.3, bodyH, 0.54, shirt, [shirtD, shade(shirt, 1.12)], 12, seed + 4, 0, legH + bodyH / 2, 0, { px: 0.1, faces: 'xXzZ' }));
  p.push(B(0.32, 0.1, 0.56, pantsD, 0, legH + 0.05, 0)); // belt
  if (torn) p.push(B(0.03, 0.22, 0.2, skin, 0.16, legH + 0.5, 0.12), B(0.03, 0.14, 0.14, skinD, 0.16, legH + 0.3, -0.14));
  for (const sg of [1, -1]) {
    if (armsFwd) {
      p.push(B(0.42, 0.27, 0.27, shirt, 0.24, top - 0.16, sg * 0.4), B(0.4, 0.26, 0.26, skin, 0.65, top - 0.16, sg * 0.4), B(0.06, 0.28, 0.28, skinD, 0.86, top - 0.16, sg * 0.4));
    } else {
      p.push(B(0.25, 0.42, 0.25, shirt, 0, top - 0.24, sg * 0.4), B(0.24, 0.42, 0.24, skin, 0, top - 0.64, sg * 0.4));
    }
  }
  const hy = top + headS / 2;
  p.push(...texBox(headS, headS, headS, skin, [skinD, shade(skin, 1.1)], 9, seed + 8, 0, hy, 0, { px: headS / 6, faces: 'xzZy' }));
  p.push(...face(0, hy, 0, headS, { ...eyes, mouth }));
  if (hair) p.push(B(headS + 0.04, headS * 0.28, headS + 0.04, hair, 0, hy + headS * 0.38, 0), B(headS * 0.3, headS * 0.5, headS + 0.04, hair, -headS * 0.36, hy + headS * 0.1, 0));
  return p.concat(extra);
}

// ---------- buildings ----------
const win = (x, y, z, along, sz = 0.95) => {
  // window on a wall facing +Z ('z'), -Z ('-z') or +X ('x')
  const p = [];
  const sg = along === '-z' ? -1 : 1;
  const g = (w, h, d, c, dx, dy, dd) => (along === 'x' ? B(d, h, w, c, x + dd, y + dy, z + dx) : B(w, h, d, c, x + dx, y + dy, z + sg * dd));
  p.push(g(sz + 0.24, sz + 0.24, 0.1, C.oakD, 0, 0, 0.02));
  p.push(g(sz, sz, 0.12, C.glass, 0, 0, 0.03));
  p.push(g(0.08, sz, 0.14, C.oakD, 0, 0, 0.04), g(sz, 0.08, 0.14, C.oakD, 0, 0, 0.04));
  p.push(g(sz * 0.3, sz * 0.22, 0.13, '#d8f4ff', -sz * 0.22, sz * 0.24, 0.06));
  p.push(g(sz + 0.4, 0.1, 0.3, C.plankD, 0, -sz / 2 - 0.18, 0.15));
  return p;
};

function house({ w, d, wallH, wallC, roofC, doorC, step = 3, wallD = shade(wallC, 0.82), seed = 5, flowers = true, chimney = false, plain = false }) {
  const p = [];
  p.push(B(w + 0.3, 0.35, d + 0.3, C.cobble, 0, 0.175, 0)); // foundation
  p.push(...speck(0, 0.175, 0, w + 0.3, 0.35, d + 0.3, [C.stoneD, '#9a9a9a'], 18, seed, { px: 0.3, faces: 'xXzZ' }));
  p.push(...texBox(w, wallH, d, wallC, [wallD, shade(wallC, 1.1)], Math.round(w * d * 2), seed + 1, 0, wallH / 2, 0, { px: 0.3, faces: 'xXzZ' }));
  if (!plain) p.push(...courses(0, 0, w, d, 0.7, wallH - 0.3, 0.6, wallD));
  // log corner posts with bark
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b], i) => p.push(...texBox(0.5, wallH + 0.1, 0.5, C.oakD, [C.oak, '#3a2712'], 10, seed + 10 + i, a * w / 2, (wallH + 0.1) / 2, b * d / 2, { px: 0.1, faces: 'xXzZ' })));
  // stepped roof: alternating tone shingle courses
  let rw = w + 0.8, y = wallH;
  const rc2 = shade(roofC, 0.8);
  for (let i = 0; i < step; i++) {
    p.push(B(rw, 0.6, d + 0.8, i % 2 ? rc2 : roofC, 0, y + 0.3, 0));
    p.push(...speck(0, y + 0.3, 0, rw, 0.6, d + 0.8, [rc2, shade(roofC, 1.15)], Math.round(rw * 2), seed + 20 + i, { px: 0.3, faces: 'zZy' }));
    y += 0.6;
    rw = Math.max(0.6, rw - (w + 0.8) / step);
  }
  p.push(B(0.5, 0.25, d + 1.0, C.oakD, 0, y + 0.1, 0)); // ridge beam
  if (chimney) p.push(...texBox(1.1, 3.2, 1.1, C.cobble, [C.stoneD, '#9a9a9a'], 22, seed + 30, w / 2 - 1.0, wallH + 1.6 - 0.3, -d / 2 + 1.0, { px: 0.28 }), [B(1.3, 0.25, 1.3, C.stoneD, w / 2 - 1.0, wallH + 3.05, -d / 2 + 1.0), B(0.7, 0.05, 0.7, C.black, w / 2 - 1.0, wallH + 3.19, -d / 2 + 1.0)]);
  // door (front +Z): frame, two panels, glass, handle, step, torch
  const dh = Math.min(2.2, wallH * 0.68), dz = d / 2;
  p.push(B(1.5, dh + 0.2, 0.12, C.oakD, 0, dh / 2 + 0.1, dz + 0.03));
  p.push(B(1.1, dh * 0.5, 0.14, doorC, 0, dh * 0.25 + 0.05, dz + 0.05), B(1.1, dh * 0.5, 0.14, shade(doorC, 1.1), 0, dh * 0.75, dz + 0.05));
  p.push(B(0.7, 0.35, 0.16, C.glass, 0, dh * 0.78, dz + 0.06), B(0.08, 0.35, 0.17, C.oakD, 0, dh * 0.78, dz + 0.07));
  p.push(B(0.1, 0.1, 0.2, C.gold, 0.38, dh * 0.5, dz + 0.1), B(1.6, 0.18, 0.7, C.cobble, 0, 0.09 + 0.1, dz + 0.4));
  p.push(B(0.12, 0.5, 0.12, C.oak, 1.1, dh * 0.62, dz + 0.1), B(0.2, 0.2, 0.2, C.torchF, 1.1, dh * 0.62 + 0.35, dz + 0.1));
  // windows
  const wy = wallH * 0.62, wx = Math.min(w * 0.3, w / 2 - 1.2);
  p.push(...win(wx * 1.2 + (w > 5 ? 0.5 : 0), wy, dz, 'z'), ...win(-wx * 1.2 - (w > 5 ? 0.5 : 0), wy, dz, 'z'));
  p.push(...win(w / 2, wy, 0, 'x'), ...win(0, wy, -dz, '-z'));
  if (flowers) for (const sx of [wx * 1.2 + (w > 5 ? 0.5 : 0), -wx * 1.2 - (w > 5 ? 0.5 : 0)]) {
    p.push(B(1.0, 0.22, 0.3, C.oak, sx, wy - 0.85, dz + 0.32));
    for (let k = 0; k < 3; k++) p.push(B(0.16, 0.24, 0.16, [C.red, C.yellow, C.pink][k], sx - 0.32 + k * 0.32, wy - 0.65, dz + 0.32), B(0.05, 0.1, 0.05, C.leaf, sx - 0.32 + k * 0.32, wy - 0.78, dz + 0.32));
  }
  return p;
}

// ---------- cube blocks ----------
const dirtCube = (seed, s = 0.9) => texBox(s, s, s, C.dirt, [C.dirtD, '#a0693c', '#7d4f2c'], 26, seed, 0, s / 2, 0, { px: s / 8 });
const stoneCube = (seed, s = 0.9) => texBox(s, s, s, C.stone, [C.stoneD, '#9c9c9c', '#7c7c7c'], 26, seed, 0, s / 2, 0, { px: s / 8 });
const oreCube = (c, seed, s = 0.9) => [...stoneCube(seed, s), ...speck(0, s / 2, 0, s, s, s, [c, shade(c, 1.2), shade(c, 0.8)], 14, seed + 3, { px: s / 4 })];

function grassBlock(seed) {
  const s = 0.9, p = [...dirtCube(seed, s)];
  const r = rng(seed + 2);
  p.push(B(s + 0.03, 0.2, s + 0.03, C.grassTop, 0, s - 0.1, 0));
  p.push(...speck(0, s - 0.1, 0, s, 0.2, s, [C.grass, '#7ad058', '#58a838'], 12, seed + 4, { px: s / 8, faces: 'y' }));
  for (const [fx, fz, w, d] of [[1, 0, 0.04, s], [-1, 0, 0.04, s], [0, 1, s, 0.04], [0, -1, s, 0.04]]) {
    for (let i = 0; i < 8; i++) {
      if (r() < 0.55) continue;
      const u = s / 8, o = -s / 2 + (i + 0.5) * u;
      p.push(B(fx ? 0.04 : u, 0.12, fz ? 0.04 : u, C.grassTop, fx * (s / 2 + 0.02) + (fx ? 0 : o), s - 0.26, fz * (s / 2 + 0.02) + (fz ? 0 : o)));
    }
  }
  return p;
}

const flower = (petal, core, seed, tall = 0.5) => {
  const p = [B(0.08, tall, 0.08, C.leaf, 0, tall / 2, 0), B(0.16, 0.06, 0.08, C.leafD, 0.1, tall * 0.4, 0), B(0.08, 0.06, 0.16, C.leaf, 0, tall * 0.3, -0.1)];
  const py = tall + 0.1;
  p.push(B(0.17, 0.17, 0.17, core, 0, py, 0));
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.push(B(0.16, 0.16, 0.16, petal, dx * 0.16, py, dz * 0.16));
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) p.push(B(0.1, 0.1, 0.1, shade(petal, 0.85), dx * 0.14, py - 0.06, dz * 0.14));
  p.push(B(0.11, 0.08, 0.11, shade(petal, 1.2), 0, py + 0.12, 0));
  return p;
};
const mushroom = (capC, spotC, seed) => {
  const p = [...texBox(0.2, 0.4, 0.2, '#efe6d0', ['#d8ceb4'], 6, seed, 0, 0.2, 0, { px: 0.07 })];
  p.push(B(0.62, 0.16, 0.62, capC, 0, 0.48, 0), B(0.42, 0.14, 0.42, shade(capC, 1.08), 0, 0.63, 0), B(0.22, 0.08, 0.22, shade(capC, 0.9), 0, 0.74, 0));
  if (spotC) p.push(B(0.14, 0.05, 0.14, spotC, 0.15, 0.72 - 0.02, 0.1), B(0.12, 0.05, 0.12, spotC, -0.14, 0.72 - 0.06, -0.1), B(0.1, 0.05, 0.1, spotC, 0.05, 0.84, -0.06),
    B(0.12, 0.1, 0.03, spotC, 0.26, 0.5, 0.08), B(0.03, 0.1, 0.12, spotC, -0.08, 0.5, 0.32));
  else p.push(B(0.12, 0.05, 0.12, shade(capC, 0.8), 0.15, 0.72 - 0.02, 0.1), B(0.12, 0.05, 0.12, shade(capC, 1.2), -0.14, 0.72 - 0.06, -0.1));
  return p;
};

// A plain oak-style tree from voxel masks
function voxTree({ trunkH, trunkW, cell, leafCols, layers, y0, trunkC = C.oak, seed = 7, extra = [] }) {
  return [...trunk(trunkW, trunkH, trunkC, seed), ...leaves(0, y0, 0, layers, cell, leafCols, seed + 1), ...extra];
}

export function buildProtos() {
  const P = {};
  const add = (name, parts, opts) => (P[name] = makeProto(name, parts.flat(), opts));

  // ---------- tiny ----------
  add('flowerRed', flower(C.red, C.yellow, 1), { value: 0.12 });
  add('flowerYellow', flower(C.yellow, C.orange, 2), { value: 0.12 });
  add('flowerBlue', flower(C.purple, C.white, 3, 0.55), { value: 0.12 });
  add('mushroomRed', mushroom(C.red, C.white, 4), { value: 0.18 });
  add('mushroomBrown', mushroom('#9a6a45', null, 5), { value: 0.18 });
  add('torch', [
    ...texBox(0.16, 0.9, 0.16, C.oak, [C.oakD, '#84602f'], 8, 6, 0, 0.45, 0, { px: 0.054 }),
    B(0.24, 0.1, 0.24, '#5a3e22', 0, 0.9, 0),
    B(0.22, 0.2, 0.22, C.orange, 0, 1.02, 0), B(0.14, 0.16, 0.14, C.torchF, 0, 1.16, 0), B(0.08, 0.1, 0.08, '#fff0a0', 0, 1.26, 0),
    B(0.06, 0.06, 0.06, '#ffd040', 0.1, 1.2, 0.05), B(0.05, 0.05, 0.05, C.orange, -0.08, 1.3, -0.06),
  ], { value: 0.2 });
  add('grassBlock', grassBlock(7), { value: 0.3 });
  add('dirtBlock', dirtCube(8), { value: 0.3 });
  add('stoneBlock', stoneCube(9), { value: 0.3 });
  add('cobbleBlock', texBox(0.9, 0.9, 0.9, C.cobble, ['#909090', '#5e5e5e', '#6a6a6a', '#a0a0a0'], 30, 10, 0, 0.45, 0, { px: 0.15 }), { value: 0.3 });
  add('coalOre', oreCube(C.coal, 11), { value: 0.35 });
  add('ironOre', oreCube(C.iron, 12), { value: 0.4 });
  add('goldOre', oreCube(C.gold, 13), { value: 0.5 });
  add('diamondOre', oreCube(C.diamond, 14), { value: 0.6 });
  add('tntBlock', (() => {
    const p = [B(0.9, 0.9, 0.9, C.tnt, 0, 0.45, 0), ...speck(0, 0.45, 0, 0.9, 0.9, 0.9, ['#b02a20', '#e8483a'], 16, 15, { px: 0.11 })];
    p.push(B(0.94, 0.3, 0.94, C.white, 0, 0.45, 0), B(0.95, 0.04, 0.95, '#c8c8c8', 0, 0.3, 0), B(0.95, 0.04, 0.95, '#c8c8c8', 0, 0.6, 0));
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const bar = (o, w, h, dy) => B(nx ? 0.03 : w, h, nz ? 0.03 : w, C.black, nx * 0.475 + (nx ? 0 : o), 0.45 + dy, nz * 0.475 + (nz ? 0 : o));
      p.push(bar(-0.28, 0.16, 0.05, 0.1), bar(-0.28, 0.05, 0.18, 0), // T
        bar(-0.02, 0.05, 0.18, 0), bar(0.12, 0.05, 0.18, 0), bar(0.05, 0.05, 0.06, 0.04), // N
        bar(0.3, 0.16, 0.05, 0.1), bar(0.3, 0.05, 0.18, 0)); // T
    }
    p.push(B(0.3, 0.06, 0.3, C.black, 0, 0.92, 0), B(0.06, 0.2, 0.06, C.oakD, 0, 1.03, 0), B(0.1, 0.1, 0.1, C.torchF, 0, 1.16, 0));
    return p;
  })(), { value: 0.4 });
  add('sapling', [
    B(0.15, 0.4, 0.15, C.oak, 0, 0.2, 0), B(0.06, 0.16, 0.06, C.oakD, 0.09, 0.3, 0.04),
    ...leaves(0, 0.35, 0, [plus(), plus()], 0.25, [C.leaf, C.leafB, C.leafD], 16),
    B(0.25, 0.25, 0.25, C.leafB, 0, 0.98, 0),
  ], { value: 0.2 });
  add('chicken', (() => {
    const p = [];
    p.push(B(0.6, 0.42, 0.42, C.white, 0, 0.5, 0), B(0.5, 0.12, 0.44, '#e6e6e6', 0, 0.34, 0), B(0.2, 0.2, 0.3, '#f8f8f8', 0.28, 0.6, 0));
    for (const sg of [1, -1]) {
      p.push(B(0.36, 0.26, 0.06, '#dcdcdc', -0.02, 0.55, sg * 0.24), B(0.22, 0.14, 0.07, '#c8c8c8', -0.08, 0.5, sg * 0.24));
      p.push(B(0.05, 0.3, 0.05, C.orange, 0, 0.15, sg * 0.1), B(0.14, 0.05, 0.1, C.orange, 0.05, 0.03, sg * 0.1));
    }
    p.push(B(0.24, 0.3, 0.3, C.white, 0.42, 0.85, 0), B(0.12, 0.06, 0.18, C.red, 0.42, 1.04, 0), B(0.08, 0.06, 0.12, C.red, 0.4, 1.09, 0));
    p.push(B(0.14, 0.08, 0.14, C.orange, 0.6, 0.83, 0), B(0.08, 0.1, 0.08, C.red, 0.57, 0.72, 0));
    for (const sg of [1, -1]) p.push(B(0.03, 0.08, 0.08, C.black, 0.54, 0.9, sg * 0.1));
    p.push(B(0.16, 0.28, 0.32, C.white, -0.36, 0.7, 0), B(0.14, 0.2, 0.2, '#e6e6e6', -0.44, 0.84, 0));
    return p;
  })(), { value: 0.4 });

  // ---------- medium ----------
  add('pig', quad({ bodyC: C.pink, bodyD: C.pinkD, headC: C.pink, legC: C.pinkD, hoofC: '#5a3a3a', len: 1.3, hgt: 0.7, wid: 0.7, legH: 0.4, headS: 0.6, seed: 20,
    snout: { l: 0.14, h: 0.28, w: 0.34, c: '#f0949c', nostril: '#a04a55', dy: -0.02 }, ears: 'up', earC: C.pinkD,
    tail: { l: 0.12, h: 0.12, w: 0.1, c: C.pinkD, at: 0.75 },
    eyes: { pupil: '#3a1a10' }, spots: { cols: ['#f8b8c8', '#e8909f'], n: 8, px: 0.2 } }), { value: 1.0 });
  add('sheep', (() => {
    const p = quad({ bodyC: C.wool, bodyD: C.woolD, headC: '#c9b59a', legC: '#c9b59a', hoofC: '#4a4038', len: 1.5, hgt: 0.95, wid: 0.95, legH: 0.5, headS: 0.55, seed: 30, ears: 'side', earC: '#b6a184', headD: '#ae9a80' });
    // fluffy wool bumps + wool cap on the head
    const r = rng(31);
    for (let i = 0; i < 16; i++) p.push(B(0.34, 0.3, 0.34, r() < 0.5 ? '#f7f7f7' : '#dedede', (r() - 0.5) * 1.2, 0.5 + 0.2 + r() * 0.75, (r() < 0.5 ? -1 : 1) * 0.5));
    for (let i = 0; i < 6; i++) p.push(B(0.36, 0.14, 0.36, i % 2 ? '#f7f7f7' : '#dedede', -0.55 + i * 0.22, 1.5, (i % 3 - 1) * 0.28));
    p.push(B(0.42, 0.18, 0.62, '#f0f0f0', 1.0, 1.65, 0));
    return p;
  })(), { value: 1.1 });
  add('sheepPink', (() => {
    const p = quad({ bodyC: '#f19ac0', bodyD: '#d97ca6', headC: '#c9b59a', legC: '#c9b59a', hoofC: '#4a4038', len: 1.5, hgt: 0.95, wid: 0.95, legH: 0.5, headS: 0.55, seed: 32, ears: 'side', earC: '#b6a184', headD: '#ae9a80' });
    const r = rng(33);
    for (let i = 0; i < 16; i++) p.push(B(0.34, 0.3, 0.34, r() < 0.5 ? '#f7b0d0' : '#e488b2', (r() - 0.5) * 1.2, 0.5 + 0.2 + r() * 0.75, (r() < 0.5 ? -1 : 1) * 0.5));
    for (let i = 0; i < 6; i++) p.push(B(0.36, 0.14, 0.36, i % 2 ? '#f7b0d0' : '#e488b2', -0.55 + i * 0.22, 1.5, (i % 3 - 1) * 0.28));
    p.push(B(0.42, 0.18, 0.62, '#f5a8c8', 1.0, 1.65, 0));
    return p;
  })(), { value: 1.2 });
  add('cow', (() => {
    const p = quad({ bodyC: C.cowB, bodyD: '#3a281c', headC: C.cowB, legC: '#3a281c', hoofC: '#1e1410', len: 1.8, hgt: 1.0, wid: 1.0, legH: 0.6, headS: 0.7, seed: 40,
      snout: { l: 0.1, h: 0.28, w: 0.46, c: '#e8d0c0', nostril: '#8a6a5a', dy: -0.02 }, ears: 'side', earC: '#3a281c', horns: '#f0ead8',
      tail: { l: 0.1, h: 0.7, w: 0.1, c: '#3a281c', at: 0.55, tip: '#1e1410' },
      spots: { cols: [C.white], n: 14, px: 0.3 }, eyes: { pupil: '#1e1e1e' } });
    p.push(B(0.6, 0.18, 0.45, '#f0a0a8', -0.2, 0.68, 0), B(0.1, 0.1, 0.1, '#e08890', -0.05, 0.6, 0.12), B(0.1, 0.1, 0.1, '#e08890', -0.05, 0.6, -0.12), B(0.1, 0.1, 0.1, '#e08890', -0.35, 0.6, 0.12), B(0.1, 0.1, 0.1, '#e08890', -0.35, 0.6, -0.12));
    p.push(B(0.4, 0.05, 0.5, C.white, 0.1, 1.63, 0.15)); // white blaze
    return p;
  })(), { value: 2.0 });
  add('wolf', quad({ bodyC: C.wolf, bodyD: C.wolfD, headC: C.wolf, legC: C.wolfD, hoofC: '#7a7a7a', len: 1.2, hgt: 0.55, wid: 0.5, legH: 0.5, headS: 0.45, seed: 50,
    snout: { l: 0.28, h: 0.2, w: 0.24, c: '#e0e0e0', nostril: null, dy: -0.06 }, ears: 'point', earC: C.wolfD, eyes: { pupil: '#3a2a10' },
    tail: { l: 0.7, h: 0.16, w: 0.16, c: C.wolfD, at: 1.1, tip: '#e8e8e8' },
    extra: [B(0.1, 0.1, 0.1, C.black, 1.08, 0.92, 0), B(0.26, 0.05, 0.3, C.red, 0.7, 1.1, 0), B(0.3, 0.12, 0.5, '#e8e8e8', 0.65, 0.95, 0)],
    spots: { cols: ['#e6e6e6', '#8a8a8a'], n: 8, px: 0.16 } }), { value: 1.2 });
  add('creeper', (() => {
    const p = [];
    const g = [C.creeper, C.creeperD, '#5fc25c', '#3c9440'];
    p.push(...texBox(0.6, 0.95, 0.6, C.creeper, g, 34, 60, 0, 1.03, 0, { px: 0.1 }));
    for (const [x, z] of [[0.24, 0.24], [-0.24, 0.24], [0.24, -0.24], [-0.24, -0.24]]) p.push(...texBox(0.28, 0.56, 0.28, C.creeperD, [C.creeper, '#2a6e2e'], 6, 61 + x * 10 + z * 20, x, 0.28, z, { px: 0.09, faces: 'xXzZ' }));
    p.push(...texBox(0.66, 0.66, 0.66, C.creeper, g, 34, 62, 0, 1.83, 0, { px: 0.11 }));
    const fx = 0.345;
    // the face: two square eyes, nose bridge, frown
    for (const sg of [1, -1]) p.push(B(0.03, 0.16, 0.16, C.black, fx, 1.93, sg * 0.15));
    p.push(B(0.03, 0.16, 0.16, C.black, fx, 1.78, 0), B(0.03, 0.26, 0.08, C.black, fx, 1.6, 0.08), B(0.03, 0.26, 0.08, C.black, fx, 1.6, -0.08));
    p.push(B(0.03, 0.08, 0.32, C.black, fx, 1.72, 0), B(0.03, 0.14, 0.08, C.black, fx, 1.6, 0.13), B(0.03, 0.14, 0.08, C.black, fx, 1.6, -0.13));
    return p;
  })(), { value: 1.6 });
  add('zombie', humanoid({ skin: C.zombie, skinD: '#3e8039', shirt: C.zShirt, pants: C.zPants, shoe: '#2a2a36', armsFwd: true, torn: true, seed: 70,
    eyes: { eye: '#1e1e1e', pupil: '#0a0a12', brow: '#2f6a2b' }, mouth: '#2a4a26' }), { value: 1.5 });
  add('skeleton', (() => {
    const p = humanoid({ skin: '#e8e8e0', skinD: '#c8c8c0', shirt: '#dcdcd4', shirtD: '#a8a8a0', pants: '#cfcfc8', shoe: '#b0b0a8', seed: 80, legH: 0.85, bodyH: 0.75,
      eyes: { eye: '#1e1e1e', pupil: '#1e1e1e', eyeY: 0.1, eyeZ: 0.22 }, mouth: '#8a8a82' });
    // ribs on the chest + arms as thin bones + bow in the hand
    for (let i = 0; i < 4; i++) p.push(B(0.03, 0.06, 0.46, '#7a7a72', 0.16, 0.85 + 0.12 + i * 0.15, 0));
    p.push(B(0.03, 0.55, 0.06, '#7a7a72', 0.16, 1.28, 0));
    p.push(B(0.05, 0.9, 0.08, C.oak, 0.3, 1.2, 0.4), B(0.03, 0.9, 0.02, '#e8e8e8', 0.34, 1.2, 0.4), B(0.09, 0.14, 0.1, C.oak, 0.31, 0.78, 0.4), B(0.09, 0.14, 0.1, C.oak, 0.31, 1.62, 0.4));
    return p;
  })(), { value: 1.5 });
  add('villager', (() => {
    const p = [];
    p.push(...texBox(0.6, 1.0, 0.62, C.robe, ['#5a3e22', '#7a5a34'], 18, 90, 0, 0.5, 0, { px: 0.1 }));
    p.push(B(0.62, 0.14, 0.64, '#4a3018', 0, 0.06, 0), B(0.03, 1.0, 0.16, '#8a6a3a', 0.31, 0.55, 0), B(0.62, 0.1, 0.64, '#4a3018', 0, 0.6, 0));
    p.push(B(0.34, 0.3, 0.7, C.robe, 0.32, 0.82, 0), B(0.2, 0.2, 0.22, C.villagerSkin, 0.5, 0.82, 0.22), B(0.2, 0.2, 0.22, C.villagerSkin, 0.5, 0.82, -0.22)); // folded arms
    p.push(...texBox(0.56, 0.6, 0.56, C.villagerSkin, ['#b58862', '#d8ac88'], 8, 91, 0, 1.3, 0, { px: 0.09, faces: 'xzZy' }));
    p.push(...face(0, 1.3, 0, 0.56, { eye: '#eaf6ee', pupil: '#2a8a3a', brow: '#3a2a20', eyeY: 0.08, eyeZ: 0.2 }));
    p.push(B(0.16, 0.3, 0.16, '#b58862', 0.36, 1.2, 0), B(0.12, 0.08, 0.14, '#a07852', 0.42, 1.06, 0));
    p.push(B(0.04, 0.05, 0.3, '#3a2a20', 0.29, 1.4, 0), B(0.6, 0.12, 0.6, '#5a3e22', 0, 1.62, 0));
    return p;
  })(), { value: 1.4 });
  add('craftingTable', (() => {
    const p = [...texBox(1.1, 1.0, 1.1, C.plank, [C.plankD, '#c8985a', '#a87a42'], 30, 100, 0, 0.5, 0, { px: 0.137, faces: 'xXzZ' })];
    p.push(B(1.14, 0.2, 1.14, C.oak, 0, 1.0, 0), B(1.16, 0.06, 1.16, C.oakD, 0, 0.88, 0));
    // top: 3x3 crafting grid
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) p.push(B(0.3, 0.03, 0.3, (i + j) % 2 ? '#b8875a' : '#a0703f', -0.34 + i * 0.34, 1.11, -0.34 + j * 0.34));
    p.push(B(0.05, 0.04, 0.9, C.oakD, -0.17, 1.12, 0), B(0.05, 0.04, 0.9, C.oakD, 0.17, 1.12, 0));
    // saw + hammer on the side faces
    p.push(B(0.03, 0.14, 0.7, '#b0b0b0', 0.56, 0.55, 0), B(0.04, 0.3, 0.1, C.oakD, 0.57, 0.3, 0.3), B(0.04, 0.16, 0.34, '#7a7a7a', 0.57, 0.66, -0.25), B(0.04, 0.4, 0.08, C.oakD, 0.57, 0.4, -0.25));
    return p;
  })(), { value: 1.0 });
  add('furnace', (() => {
    const p = [...texBox(1.1, 1.1, 1.1, C.stone, [C.stoneD, '#a2a2a2', '#7a7a7a', '#5e5e5e'], 50, 110, 0, 0.55, 0, { px: 0.137, faces: 'xXzZy' })];
    p.push(B(1.14, 0.14, 1.14, C.stoneD, 0, 1.1, 0), B(1.14, 0.14, 1.14, C.stoneD, 0, 0.06, 0));
    p.push(B(0.8, 0.5, 0.04, '#3a3a3a', 0, 0.75, 0.56), B(0.66, 0.36, 0.05, C.black, 0, 0.75, 0.57), B(0.66, 0.2, 0.06, C.lava, 0, 0.36, 0.57), B(0.4, 0.08, 0.07, '#ffd040', 0.05, 0.4, 0.58), B(0.14, 0.1, 0.07, '#fff0a0', -0.1, 0.36, 0.59));
    p.push(B(0.7, 0.05, 0.05, '#4a4a4a', 0, 0.55, 0.6), B(0.7, 0.05, 0.05, '#4a4a4a', 0, 0.95, 0.6));
    for (let i = 0; i < 4; i++) p.push(B(0.05, 0.4, 0.05, '#4a4a4a', -0.27 + i * 0.18, 0.75, 0.61));
    return p;
  })(), { value: 1.0 });
  add('chest', (() => {
    const p = [...texBox(1.1, 0.7, 0.8, '#a06a2c', [C.plankD, '#b5803a', '#8a5a22'], 24, 120, 0, 0.35, 0, { px: 0.1, faces: 'xXzZ' })];
    p.push(...texBox(1.14, 0.36, 0.84, '#b5803a', ['#c8944a', '#9a6a2c'], 20, 121, 0, 0.88, 0, { px: 0.1, faces: 'xXzZy' }));
    p.push(B(1.16, 0.1, 0.86, C.oakD, 0, 0.7, 0));
    p.push(B(0.14, 0.7, 0.86, C.oakD, 0.5, 0.55, 0), B(0.14, 0.7, 0.86, C.oakD, -0.5, 0.55, 0));
    p.push(B(0.24, 0.34, 0.06, '#d8d8d8', 0, 0.74, 0.44), B(0.12, 0.14, 0.08, '#8a8a8a', 0, 0.68, 0.45));
    return p;
  })(), { value: 1.0 });
  add('pumpkin', (() => {
    const p = [];
    p.push(B(1.0, 0.9, 1.0, C.pumpkin, 0, 0.45, 0));
    // vertical ribs alternating tone
    for (let i = -2; i <= 2; i++) {
      p.push(B(0.12, 0.92, 1.02, i % 2 ? '#f09a2a' : '#c86a12', i * 0.2, 0.45, 0), B(1.02, 0.92, 0.12, i % 2 ? '#f09a2a' : '#c86a12', 0, 0.45, i * 0.2));
    }
    p.push(B(0.22, 0.24, 0.22, C.leaf, 0, 1.0, 0), B(0.12, 0.12, 0.12, C.leafD, 0.1, 1.15, 0.02), B(0.16, 0.06, 0.3, C.leaf, -0.12, 0.96, 0.15));
    // carved face
    p.push(B(0.2, 0.2, 0.05, C.black, 0.28, 0.6, 0.52), B(0.2, 0.2, 0.05, C.black, -0.28, 0.6, 0.52), B(0.5, 0.12, 0.05, C.black, 0, 0.28, 0.52), B(0.12, 0.12, 0.05, C.black, 0, 0.42, 0.52), B(0.1, 0.1, 0.06, C.yellow, 0.28, 0.6, 0.53), B(0.1, 0.1, 0.06, C.yellow, -0.28, 0.6, 0.53));
    return p;
  })(), { value: 0.9 });
  add('hayBale', (() => {
    const p = texBox(1.2, 1.0, 1.0, C.hay, ['#c8a020', '#f0d050', '#b08a18'], 46, 130, 0, 0.5, 0, { px: 0.1 });
    p.push(B(0.1, 1.03, 1.03, C.oakD, -0.3, 0.5, 0), B(0.1, 1.03, 1.03, C.oakD, 0.3, 0.5, 0));
    p.push(B(0.03, 0.03, 0.4, '#f0d050', -0.62, 0.62, 0.1), B(0.03, 0.03, 0.34, '#c8a020', 0.62, 0.38, -0.1));
    return p;
  })(), { value: 0.9 });
  add('cactus', (() => {
    const p = texBox(0.8, 2.4, 0.8, C.cactus, ['#1e6a28', '#3aa848', '#f0e8c0'], 44, 140, 0, 1.2, 0, { px: 0.1 });
    p.push(B(0.86, 0.14, 0.86, '#1e6a28', 0, 0.5, 0), B(0.86, 0.14, 0.86, '#1e6a28', 0, 1.5, 0), B(0.84, 0.14, 0.84, '#1e6a28', 0, 2.2, 0));
    p.push(...texBox(0.8, 0.5, 0.3, C.cactus, ['#1e6a28', '#3aa848'], 8, 141, 0.55, 1.5, 0, { px: 0.1 }));
    p.push(...texBox(0.3, 0.8, 0.3, C.cactus, ['#1e6a28', '#3aa848'], 8, 142, 0.85, 1.9, 0, { px: 0.1 }));
    p.push(B(0.3, 0.3, 0.3, '#f26aa0', 0, 2.55, 0), B(0.14, 0.14, 0.14, C.yellow, 0, 2.75, 0), B(0.12, 0.12, 0.12, '#f26aa0', 0.85, 2.4, 0));
    return p;
  })(), { value: 1.4, radius: 0.9 });
  add('stoneStack', [
    ...texBox(1.4, 1.4, 1.4, C.stone, [C.stoneD, '#a0a0a0', '#7c7c7c'], 36, 150, 0, 0.7, 0, { px: 0.175 }),
    ...texBox(1.4, 1.4, 1.4, C.cobble, ['#909090', '#5e5e5e', '#a0a0a0'], 36, 151, 0, 2.1, 0, { px: 0.175 }),
    ...speck(0, 0.7, 0, 1.4, 1.4, 1.4, [C.coal, '#3a3a3a'], 8, 152, { px: 0.35 }),
    B(1.44, 0.06, 1.44, C.stoneD, 0, 1.4, 0),
  ], { value: 2.2 });
  add('well', (() => {
    const p = [];
    // cobble ring (four walls around water)
    p.push(...texBox(2.0, 1.0, 0.5, C.cobble, ['#909090', '#5e5e5e'], 12, 160, 0, 0.5, 0.75, { px: 0.2 }), ...texBox(2.0, 1.0, 0.5, C.cobble, ['#909090', '#5e5e5e'], 12, 161, 0, 0.5, -0.75, { px: 0.2 }));
    p.push(...texBox(0.5, 1.0, 1.0, C.cobble, ['#909090', '#5e5e5e'], 8, 162, 0.75, 0.5, 0, { px: 0.2 }), ...texBox(0.5, 1.0, 1.0, C.cobble, ['#909090', '#5e5e5e'], 8, 163, -0.75, 0.5, 0, { px: 0.2 }));
    p.push(B(1.0, 0.1, 1.0, C.water, 0, 0.85, 0), B(0.4, 0.03, 0.4, '#7aa8f4', 0.1, 0.91, 0.1), B(2.1, 0.12, 2.1, C.stoneD, 0, 1.0, 0));
    for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) p.push(...texBox(0.22, 2.0, 0.22, C.oak, [C.oakD], 8, 164 + a + b * 2, a * 0.9, 2.0, b * 0.9, { px: 0.07 }));
    p.push(B(0.14, 0.14, 1.9, C.oakD, 0, 2.7, 0), B(0.05, 0.6, 0.05, '#d8c8a0', 0, 2.35, 0.1), B(0.3, 0.3, 0.3, C.oak, 0, 1.9, 0.1), B(0.34, 0.06, 0.34, '#8a8a8a', 0, 2.08, 0.1));
    // tiled roof
    for (let i = 0; i < 3; i++) p.push(B(2.5 - i * 0.7, 0.28, 2.5 - i * 0.7, i % 2 ? C.brick : C.roof, 0, 3.05 + i * 0.28, 0));
    p.push(B(0.3, 0.3, 0.3, C.oakD, 0, 3.98, 0));
    return p;
  })(), { value: 4 });
  add('fenceRow', (() => {
    const p = [];
    for (const y of [0.9, 0.5]) p.push(...texBox(4.0, 0.15, 0.13, C.plank, [C.plankD, '#c8985a'], 10, 170 + y * 10, 0, y, 0, { px: 0.13, faces: 'zZy' }));
    for (let i = 0; i < 5; i++) p.push(...texBox(0.22, 1.1, 0.22, C.oakD, ['#3a2712', C.oak], 8, 180 + i, -1.9 + i * 0.95, 0.55, 0, { px: 0.07, faces: 'xXzZ' }), B(0.28, 0.1, 0.28, C.oak, -1.9 + i * 0.95, 1.15, 0));
    p.push(B(0.06, 0.06, 0.16, '#c8985a', -1.0, 0.7, 0.08), B(0.06, 0.06, 0.16, '#c8985a', 0.9, 0.7, -0.08));
    return p;
  })(), { value: 1.4 });
  add('minecart', (() => {
    const p = [];
    p.push(B(1.3, 0.1, 0.9, '#7a7a7a', 0, 0.42, 0));
    p.push(B(1.3, 0.5, 0.1, '#a0a0a0', 0, 0.68, 0.45), B(1.3, 0.5, 0.1, '#a0a0a0', 0, 0.68, -0.45), B(0.1, 0.5, 0.9, '#a0a0a0', 0.6, 0.68, 0), B(0.1, 0.5, 0.9, '#a0a0a0', -0.6, 0.68, 0));
    p.push(B(1.34, 0.08, 0.14, '#5e5e5e', 0, 0.96, 0.45), B(1.34, 0.08, 0.14, '#5e5e5e', 0, 0.96, -0.45), B(0.14, 0.08, 0.94, '#5e5e5e', 0.6, 0.96, 0), B(0.14, 0.08, 0.94, '#5e5e5e', -0.6, 0.96, 0));
    // coal load
    for (const [x, z, y] of [[0.2, 0.1, 0.55], [-0.2, -0.15, 0.6], [0.05, -0.2, 0.7], [-0.3, 0.2, 0.55], [0.3, -0.1, 0.62]]) p.push(B(0.3, 0.3, 0.3, C.coal, x, y + 0.15, z));
    p.push(B(0.12, 0.12, 0.12, '#f0f0f0', 0.12, 0.98, 0.05));
    for (const [x, z] of [[0.4, 0.42], [-0.4, 0.42], [0.4, -0.42], [-0.4, -0.42]]) p.push(B(0.26, 0.26, 0.1, '#3a3a3a', x, 0.2, z * 1.1), B(0.1, 0.1, 0.12, '#c8c8c8', x, 0.2, z * 1.1));
    return p;
  })(), { value: 1.5 });

  // ---------- large ----------
  add('oakTree', voxTree({ trunkH: 3.6, trunkW: 0.9, cell: 0.9, y0: 2.7, leafCols: [C.leaf, C.leafD, '#4aa034'], seed: 200,
    layers: [sq(5, true), sq(5, true), sq(3), plus()],
  }), { value: 3, radius: 2.0 });
  add('oakTreeBig', voxTree({ trunkH: 5.4, trunkW: 1.2, cell: 0.86, y0: 4.0, leafCols: [C.leaf, C.leafD, '#4aa034'], seed: 210,
    layers: [sq(7, true), sq(7, true), sq(5, true), sq(5, true), sq(3), plus()],
    extra: [B(1.6, 0.9, 1.6, C.oakD, 0, 0.45, 0), B(0.5, 0.5, 1.8, C.oak, 0, 0.3, 1.0), B(1.8, 0.5, 0.5, C.oak, 1.0, 0.3, 0)] }), { value: 7, radius: 2.8 });
  add('birchTree', (() => {
    const p = [...texBox(0.8, 4.4, 0.8, C.birch, ['#d0ccbc', '#f4f0e4'], 20, 220, 0, 2.2, 0, { px: 0.13 })];
    for (let i = 0; i < 7; i++) p.push(B(0.34 + (i % 3) * 0.14, 0.09, 0.03, C.birchD, ((i % 2) - 0.5) * 0.3, 0.6 + i * 0.55, ((i + 1) % 2) ? 0.41 : -0.41), B(0.03, 0.09, 0.3, C.birchD, i % 2 ? 0.41 : -0.41, 0.85 + i * 0.5, 0.05));
    p.push(...leaves(0, 3.4, 0, [sq(5, true), sq(5, true), sq(3), plus()], 0.72, [C.leafB, C.leaf, '#84c85a'], 221));
    return p;
  })(), { value: 3, radius: 1.8 });
  add('cherryTree', voxTree({ trunkH: 3.8, trunkW: 0.9, cell: 0.9, y0: 2.8, leafCols: [C.leafPink, '#e888b0', '#f8c4dc'], trunkC: '#5a3a30', seed: 230,
    layers: [sq(5, true), sq(5, true), sq(3), plus()],
    extra: [B(0.14, 0.14, 0.14, '#f8c4dc', 1.5, 0.08, 0.6), B(0.14, 0.14, 0.14, '#f8c4dc', -0.9, 0.08, -1.3), B(0.14, 0.14, 0.14, '#e888b0', 0.6, 0.08, -1.0), B(0.14, 0.14, 0.14, '#f8c4dc', -1.4, 0.08, 0.9)] }), { value: 3, radius: 2.0 });
  add('spruceTree', (() => {
    const p = [...trunk(0.8, 2.6, C.oakD, 240)];
    const c = ['#2b6f34', '#1f5a2a', '#347a3c'];
    p.push(...leaves(0, 1.4, 0, [sq(5, true), sq(5, true), sq(3), sq(3), plus(), ['X']], 0.88, c, 241));
    p.push(B(0.3, 0.3, 0.3, C.yellow, 0, 6.85, 0));
    return p;
  })(), { value: 3, radius: 2.0 });
  add('hut', house({ w: 4, d: 4, wallH: 2.6, wallC: C.plank, roofC: C.oakD, doorC: C.oak, step: 3, seed: 300, flowers: false }), { value: 5 });
  add('house', house({ w: 6, d: 5, wallH: 3.2, wallC: C.cobble, roofC: C.roof, doorC: C.oak, step: 4, seed: 310, chimney: true }), { value: 9 });
  add('farmHouse', house({ w: 7, d: 5, wallH: 3.2, wallC: '#d8c8a0', roofC: '#8a3a2a', doorC: C.oak, step: 4, seed: 320, chimney: true }), { value: 10 });
  add('barn', (() => {
    const p = house({ w: 8, d: 6, wallH: 3.6, wallC: C.red, roofC: C.oakD, doorC: C.white, step: 4, seed: 330, flowers: false, plain: false });
    const dz = 3;
    // big barn doors with white X bracing on the front
    p.push(B(2.8, 2.8, 0.14, C.white, 0, 1.6, dz + 0.1), B(2.5, 2.5, 0.16, '#b02a20', 0, 1.6, dz + 0.12));
    for (const sg of [1, -1]) p.push(box(0.16, 3.4, 0.18, C.white, { y: 1.6, z: dz + 0.14, rz: sg * 0.75 }));
    p.push(B(0.16, 2.8, 0.18, C.white, 0, 1.6, dz + 0.14));
    // loft window + hay
    p.push(B(1.2, 1.0, 0.14, C.white, 0, 3.85, dz + 0.1), B(0.9, 0.7, 0.16, '#3a2410', 0, 3.85, dz + 0.12), B(0.3, 0.3, 0.2, C.hay, 0.2, 3.7, dz + 0.16), B(0.4, 0.3, 0.2, '#c8a020', -0.15, 3.98, dz + 0.16));
    // silo-ish grain bin beside the barn
    p.push(...texBox(1.6, 4.6, 1.6, '#c8c8c8', ['#a8a8a8', '#e0e0e0'], 20, 331, 4.6, 2.3, -1.4, { px: 0.27, faces: 'xXzZ' }), B(1.8, 0.5, 1.8, C.stoneD, 4.6, 4.75, -1.4), B(1.0, 0.5, 1.0, C.stoneD, 4.6, 5.25, -1.4));
    return p;
  })(), { value: 11 });
  add('mineEntrance', (() => {
    const p = [];
    p.push(...texBox(6, 4.5, 4, C.stone, [C.stoneD, '#a0a0a0', '#7c7c7c', C.coal], 90, 400, 0, 2.25, 0, { px: 0.5, faces: 'xXzZy' }));
    p.push(...texBox(3, 1.6, 3, C.cobble, ['#909090', '#5e5e5e'], 20, 401, 0, 5.3, 0, { px: 0.4 }));
    p.push(...texBox(1.6, 0.9, 1.6, C.stone, [C.stoneD], 8, 402, -0.3, 6.55, 0, { px: 0.4 }));
    p.push(B(2.4, 3.0, 0.3, C.black, 0, 1.5, 2.0), B(2.0, 2.6, 0.4, '#0a0a10', 0, 1.3, 2.02));
    p.push(...texBox(0.5, 3.4, 0.6, C.oak, [C.oakD], 8, 403, 1.5, 1.7, 2.1, { px: 0.12 }), ...texBox(0.5, 3.4, 0.6, C.oak, [C.oakD], 8, 404, -1.5, 1.7, 2.1, { px: 0.12 }), ...texBox(3.6, 0.5, 0.6, C.oak, [C.oakD], 8, 405, 0, 3.3, 2.1, { px: 0.12 }));
    p.push(B(0.16, 0.16, 0.7, C.oakD, 0, 2.95, 2.1), B(0.7, 0.16, 0.16, C.oakD, 0, 2.6, 2.1)); // cobweb-ish struts
    for (const sg of [1, -1]) p.push(B(0.1, 0.5, 0.1, C.oakD, sg * 2.25, 2.4, 2.3), B(0.24, 0.24, 0.24, C.torchF, sg * 2.25, 2.78, 2.3), B(0.14, 0.14, 0.14, '#fff0a0', sg * 2.25, 2.95, 2.3));
    p.push(B(2, 0.5, 0.5, C.coal, -1.2, 3.5, 2.0), B(0.5, 0.5, 0.5, C.gold, -2.1, 2.2, 2.03), B(0.5, 0.5, 0.5, C.iron, 2.3, 0.9, 2.03), B(0.5, 0.5, 0.5, C.diamond, 2.4, 3.6, 2.03));
    // rails out of the mouth + sign
    p.push(B(0.12, 0.05, 2.0, '#8a8a8a', 0.55, 0.03, 3.3), B(0.12, 0.05, 2.0, '#8a8a8a', -0.55, 0.03, 3.3));
    for (let i = 0; i < 5; i++) p.push(B(1.4, 0.04, 0.2, C.plankD, 0, 0.02, 2.5 + i * 0.4));
    p.push(B(1.6, 0.6, 0.1, C.plank, 0, 4.0, 2.25), B(1.5, 0.5, 0.05, C.plankD, 0, 4.0, 2.31), B(0.9, 0.12, 0.06, C.yellow, 0, 4.0, 2.35));
    return p;
  })(), { value: 10 });
  add('lavaPool', (() => {
    const p = [];
    p.push(B(3.2, 0.5, 3.2, C.obsidian, 0, 0.25, 0), ...speck(0, 0.25, 0, 3.2, 0.5, 3.2, ['#3a2a58', '#1a1030', '#6a3a9a'], 20, 500, { px: 0.4, faces: 'xXzZ' }));
    const t = ['#ff6a10', '#ff9a20', '#e04a08', '#ffc840'];
    const r = rng(501);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) p.push(B(0.4, 0.16, 0.4, t[(r() * 4) | 0], -1.0 + i * 0.4, 0.5, -1.0 + j * 0.4));
    for (let i = 0; i < 6; i++) p.push(B(0.7, 0.3, 0.7, i % 2 ? C.obsidian : '#3a2a58', -1.4 + (i % 3) * 1.4, 0.65, i < 3 ? 1.4 : -1.4));
    p.push(...texBox(0.8, 1.6, 0.8, C.obsidian, ['#3a2a58', '#6a3a9a'], 14, 502, 1.6, 0.8, 1.6, { px: 0.2 }), B(0.3, 0.3, 0.3, C.lava, 1.6, 1.75, 1.6), B(0.2, 0.2, 0.2, '#ffc840', 1.6, 1.95, 1.6));
    p.push(B(0.2, 0.7, 0.2, C.lava, 1.35, 1.0, 1.35), B(0.16, 0.16, 0.16, '#ffc840', -0.4, 0.75, 0.4));
    return p;
  })(), { value: 3 });
  add('portal', (() => {
    const p = [];
    const ob = (w, h, d, x, y, z, s) => texBox(w, h, d, C.obsidian, ['#3a2a58', '#1a1030', '#7a44b0'], 14, s, x, y, z, { px: 0.3 });
    p.push(...ob(4, 0.6, 1.2, 0, 0.3, 0, 600), ...ob(0.8, 5, 1.2, 1.6, 3.1, 0, 601), ...ob(0.8, 5, 1.2, -1.6, 3.1, 0, 602), ...ob(4, 0.8, 1.2, 0, 5.6, 0, 603));
    const t = ['#8e44c9', '#a45ae0', '#6a2aa8', '#c080f0', '#5a1e98'], r = rng(604);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 11; j++) p.push(B(0.4, 0.4, 0.34, t[(r() * 5) | 0], -1.0 + i * 0.4, 1.2 + j * 0.4, 0));
    for (let i = 0; i < 5; i++) p.push(B(0.16, 0.16, 0.16, '#e0b0ff', -0.8 + r() * 1.6, 1.3 + r() * 4.2, 0.24));
    return p;
  })(), { value: 9 });

  // ---------- huge ----------
  add('watchtower', (() => {
    const p = [...texBox(5, 1, 5, C.cobble, [C.stoneD, '#909090'], 16, 700, 0, 0.5, 0, { px: 0.5 })];
    for (let i = 0; i < 5; i++) p.push(...texBox(3.6, 2.4, 3.6, i % 2 ? C.stone : C.cobble, [C.stoneD, '#a0a0a0', '#7c7c7c'], 44, 701 + i, 0, 2.2 + i * 2.4, 0, { px: 0.3, faces: 'xXzZ' }));
    p.push(...courses(0, 0, 3.6, 3.6, 1.7, 13, 0.6, '#5e5e5e'));
    // slit windows on all sides, wooden deck, crenellations
    for (let i = 1; i < 5; i++) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.push(B(a ? 0.06 : 0.3, 0.9, b ? 0.06 : 0.3, C.black, a * 1.81, 2.2 + i * 2.4 - 0.4, b * 1.81));
    p.push(...texBox(5.8, 0.8, 5.8, C.oakD, [C.oak, '#3a2712'], 26, 710, 0, 14.6, 0, { px: 0.3, faces: 'xXzZy' }));
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => p.push(B(0.9, 1.2, 0.9, C.stoneD, a * 2.5, 15.6, b * 2.5), ...texBox(0.4, 3, 0.4, C.oak, [C.oakD], 6, 711 + a + 2 * b, a * 2.2, 16.4, b * 2.2, { px: 0.13 })));
    for (const s of [-2.5, 0, 2.5]) p.push(B(0.9, 1.0, 0.9, C.stoneD, s, 15.5, 2.5), B(0.9, 1.0, 0.9, C.stoneD, s, 15.5, -2.5), B(0.9, 1.0, 0.9, C.stoneD, 2.5, 15.5, s), B(0.9, 1.0, 0.9, C.stoneD, -2.5, 15.5, s));
    // roof: stepped red + flag
    p.push(B(6.4, 0.6, 6.4, C.roof, 0, 18.2, 0), B(5.0, 0.6, 5.0, C.brick, 0, 18.8, 0), B(3.6, 0.6, 3.6, C.roof, 0, 19.4, 0), B(2.2, 0.6, 2.2, C.brick, 0, 20.0, 0), B(1.0, 0.6, 1.0, C.roof, 0, 20.6, 0));
    p.push(B(0.12, 2.4, 0.12, C.oakD, 0, 22.1, 0), B(1.3, 0.8, 0.06, C.red, 0.7, 22.8, 0), B(0.5, 0.3, 0.07, C.white, 0.4, 22.8, 0));
    // door + torches + ladder
    p.push(B(1.2, 2.0, 0.12, C.oakD, 0, 1.9, 1.85), B(0.9, 1.7, 0.14, C.oak, 0, 1.85, 1.87), B(0.08, 0.1, 0.16, C.gold, 0.3, 1.8, 1.93));
    for (const sg of [1, -1]) p.push(B(0.1, 0.5, 0.1, C.oakD, sg * 1.0, 2.6, 1.95), B(0.2, 0.2, 0.2, C.torchF, sg * 1.0, 2.95, 1.95));
    for (let i = 0; i < 12; i++) p.push(B(0.7, 0.06, 0.1, C.oak, -1.0, 2.4 + i * 1.0, 1.9));
    p.push(B(0.06, 12, 0.1, C.oakD, -1.32, 8, 1.9), B(0.06, 12, 0.1, C.oakD, -0.68, 8, 1.9));
    // balcony window
    p.push(B(0.6, 1.0, 0.1, C.black, 0, 6.0, 1.85), B(0.6, 1.0, 0.1, C.glass, 0, 10.8, 1.85));
    return p;
  })(), { value: 30, radius: 3.4 });
  add('giantTree', (() => {
    const p = [...texBox(5, 20, 5, C.oak, ['#4f3519', '#84602f', '#5a3e22'], 130, 800, 0, 10, 0, { px: 0.5 })];
    p.push(...texBox(6.5, 3, 6.5, C.oakD, ['#3a2712', C.oak], 40, 801, 0, 1.5, 0, { px: 0.5 }));
    // roots + branches
    p.push(B(1.6, 1.2, 4, C.oakD, 2.6, 0.6, 2.4), B(4, 1.2, 1.6, C.oakD, -3.0, 0.6, -2.6), B(1.6, 1.2, 4, C.oakD, -2.6, 0.6, 2.8), B(4, 1.2, 1.6, C.oakD, 3.0, 0.6, -2.4));
    p.push(...texBox(1.2, 1.2, 8, C.oak, [C.oakD], 12, 802, 0, 8, 3.5, { px: 0.3 }), ...texBox(8, 1.2, 1.2, C.oak, [C.oakD], 12, 803, 3.5, 12, 0, { px: 0.3 }));
    const lc = [C.leaf, C.leafD, C.leafB, '#4aa034'];
    p.push(...leaves(0, 19, 0, [sq(8, true), sq(8, true), sq(8, true), sq(6, true), sq(4), sq(2)], 2, lc, 810));
    p.push(...leaves(8, 13, 4, [sq(4, true), sq(4, true), sq(2)], 2.2, lc, 811), ...leaves(-6, 12, -6, [sq(4, true), sq(4, true), sq(2)], 2.2, lc, 812), ...leaves(5, 15, -8, [sq(3), sq(3)], 2, lc, 813));
    p.push(B(1.6, 1.6, 1.6, C.red, 1.0, 19, 8.2), B(1.6, 1.6, 1.6, C.yellow, -3, 20.6, 8.2), B(0.4, 0.4, 0.4, '#3a8a2a', 1.0, 20, 8.2));
    // treehouse
    p.push(...texBox(6, 0.5, 6, C.plank, [C.plankD, '#c8985a'], 20, 820, 0, 12.2, 5, { px: 0.5, faces: 'xXzZy' }));
    p.push(...texBox(4.4, 2.6, 4.4, C.plankD, [C.plank, '#7a5a30'], 30, 821, 0, 13.7, 5, { px: 0.4, faces: 'xXzZ' }));
    p.push(B(5.2, 0.6, 5.2, C.roof, 0, 15.3, 5), B(3.8, 0.5, 3.8, C.brick, 0, 15.85, 5), B(2.2, 0.5, 2.2, C.roof, 0, 16.35, 5));
    p.push(B(1.1, 1.1, 0.12, C.glass, 1.0, 13.9, 7.25), B(1.3, 1.3, 0.1, C.oakD, 1.0, 13.9, 7.23), B(1.0, 1.9, 0.12, C.oakD, -1.0, 13.2, 7.25), B(0.1, 0.1, 0.1, C.gold, -0.7, 13.2, 7.33));
    for (let i = 0; i < 6; i++) p.push(B(1.2, 0.14, 0.14, C.oak, 2.4, 6.5 + i * 1.0, 3.2)); // ladder rungs
    p.push(B(0.14, 6.5, 0.14, C.oakD, 1.8, 9.5, 3.2), B(0.14, 6.5, 0.14, C.oakD, 3.0, 9.5, 3.2), B(0.14, 1.0, 5.6, C.oak, 3.1, 12.9, 5), B(0.14, 1.0, 5.6, C.oak, -3.1, 12.9, 5));
    p.push(B(0.3, 0.5, 0.3, C.torchF, 2.9, 13.6, 7.4));
    return p;
  })(), { value: 80, radius: 9 });
  add('castle', (() => {
    const p = [];
    const stoneCols = [C.stoneD, '#a0a0a0', '#7c7c7c', '#5e5e5e'];
    // curtain wall / great hall
    p.push(...texBox(24, 6, 16, C.stone, stoneCols, 150, 900, 0, 3, 0, { px: 0.8, faces: 'xXzZ' }));
    p.push(...courses(0, 0, 24, 16, 1.0, 5.5, 1.0, '#666666'));
    p.push(B(24.6, 0.5, 16.6, C.stoneD, 0, 6.15, 0), B(24.6, 0.4, 16.6, '#5e5e5e', 0, 0.2, 0));
    for (let i = 0; i < 12; i++) p.push(B(1.4, 1.2, 1.4, C.cobble, -11 + i * 2, 6.9, 7.4), B(1.4, 1.2, 1.4, C.cobble, -11 + i * 2, 6.9, -7.4));
    for (let i = 0; i < 8; i++) p.push(B(1.4, 1.2, 1.4, C.cobble, 11.4, 6.9, -7 + i * 2), B(1.4, 1.2, 1.4, C.cobble, -11.4, 6.9, -7 + i * 2));
    // corner towers
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b], k) => {
      const tx = a * 12, tz = b * 8;
      p.push(...texBox(5, 14, 5, C.cobble, ['#909090', '#5e5e5e', '#6a6a6a'], 70, 910 + k, tx, 7, tz, { px: 0.5, faces: 'xXzZ' }));
      p.push(...courses(tx, tz, 5, 5, 1.5, 13.5, 1.0, '#555555'));
      p.push(B(6, 1, 6, C.stoneD, tx, 14.5, tz));
      for (const [i, j] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]]) p.push(B(1.2, 1.4, 1.2, C.cobble, tx + i * 2.4, 15.7, tz + j * 2.4));
      // slit windows
      for (const y of [4, 8, 11.5]) for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.push(B(i ? 0.08 : 0.4, 1.4, j ? 0.08 : 0.4, C.black, tx + i * 2.52, y, tz + j * 2.52));
      // stepped spire
      p.push(B(4.2, 0.8, 4.2, C.roof, tx, 16.4, tz), B(3.0, 0.8, 3.0, C.brick, tx, 17.2, tz), B(1.8, 0.8, 1.8, C.roof, tx, 18.0, tz), B(0.8, 0.8, 0.8, C.brick, tx, 18.8, tz));
      p.push(B(0.5, 3, 0.5, C.oak, tx, 20.5, tz), B(2, 1.4, 0.2, a > 0 ? C.red : C.sky, tx + 1.2, 21.3, tz), B(0.7, 0.4, 0.22, C.white, tx + 0.8, 21.3, tz));
      p.push(B(0.8, 1.6, 0.1, C.black, tx, 9, tz + b * 2.52));
      for (const sg of [1, -1]) p.push(B(0.12, 0.6, 0.12, C.oakD, tx + sg * 1.0, 3.2, tz + b * 2.7), B(0.24, 0.24, 0.24, C.torchF, tx + sg * 1.0, 3.6, tz + b * 2.7));
    });
    // central keep
    p.push(...texBox(10, 10, 8, C.stone, stoneCols, 80, 920, 0, 11, 0, { px: 0.8, faces: 'xXzZ' }));
    p.push(...courses(0, 0, 10, 8, 6.6, 15.5, 1.0, '#666666'));
    p.push(B(11, 1, 9, C.stoneD, 0, 16.5, 0), B(9, 1.2, 7, C.roof, 0, 17.6, 0), B(6, 1.2, 4.6, C.brick, 0, 18.8, 0), B(3.2, 1.2, 2.4, C.roof, 0, 20.0, 0));
    for (let i = 0; i < 6; i++) p.push(B(1.1, 1.0, 1.1, C.cobble, -5 + i * 2, 17.4, 4.2), B(1.1, 1.0, 1.1, C.cobble, -5 + i * 2, 17.4, -4.2));
    p.push(B(1, 6, 1, C.oakD, 0, 22, 0), B(4, 2, 0.3, C.red, 2, 24, 0), B(1.4, 0.7, 0.32, C.gold, 1.2, 24.2, 0));
    // gate: portcullis, arch, planks, banners, torches
    p.push(B(4, 6, 0.4, C.black, 0, 3, 8.1), B(3.6, 5.4, 0.5, '#0a0a10', 0, 2.8, 8.12));
    for (let i = 0; i < 7; i++) p.push(B(0.12, 5.4, 0.16, '#6a6a72', -1.5 + i * 0.5, 2.8, 8.42));
    for (let i = 0; i < 6; i++) p.push(B(3.6, 0.12, 0.16, '#6a6a72', 0, 0.8 + i * 0.9, 8.44));
    p.push(B(5, 1, 0.5, C.oakD, 0, 6.3, 8.1), B(0.9, 6.4, 0.7, C.cobble, 2.4, 3.2, 8.2), B(0.9, 6.4, 0.7, C.cobble, -2.4, 3.2, 8.2));
    p.push(...texBox(4, 0.3, 2.8, C.plank, [C.plankD], 12, 921, 0, 0.15, 9.6, { px: 0.4, faces: 'y' }));
    for (const sg of [1, -1]) p.push(B(0.2, 1.2, 0.2, C.oakD, sg * 2.1, 0.9, 10.9), B(0.08, 0.08, 2.8, '#8a8a8a', sg * 2.0, 1.2, 9.6), B(0.16, 0.7, 0.16, C.oakD, sg * 4.0, 0.3, 8.9), B(0.24, 0.24, 0.24, C.torchF, sg * 4.0, 0.8, 8.9));
    for (const sg of [1, -1]) p.push(B(1.2, 3.2, 0.1, C.red, sg * 6.5, 4.6, 8.05), B(0.5, 0.5, 0.12, C.gold, sg * 6.5, 5.0, 8.1), B(1.2, 0.3, 0.12, C.gold, sg * 6.5, 6.15, 8.08));
    // keep windows: framed glass with mullions
    for (const x of [3, -3, 0]) for (const y of [11, 14]) p.push(B(2.2, 2.2, 0.3, C.oakD, x, y, 4.1), B(1.8, 1.8, 0.34, C.glass, x, y, 4.12), B(0.14, 1.8, 0.36, C.oakD, x, y, 4.14), B(1.8, 0.14, 0.36, C.oakD, x, y, 4.14));
    return p;
  })(), { value: 100, radius: 13 });

  // Wandering mobs: everything alive walks (chickens fast and jittery, big mobs slower).
  const walk = (speed, range, names) => names.forEach((n) => { if (P[n]) P[n].move = { type: 'walk', speed, range }; });
  walk(2.6, 7, ['chicken']);
  walk(1.2, 12, ['pig', 'sheep', 'sheepPink']);
  walk(1.0, 14, ['cow']);
  walk(2.0, 16, ['wolf']);
  walk(1.3, 14, ['creeper', 'zombie', 'skeleton']);
  walk(1.5, 14, ['villager']);
  return P;
}
