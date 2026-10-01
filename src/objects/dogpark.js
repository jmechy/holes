// Dog Park object prototypes. Dogs/vehicles are length-along-X, head toward +X.
// Rounded shapes everywhere: capsule bodies, sphere heads, lathe props, rbox furniture, extruded arches and gables.
import * as BUILD from './build.js';
import { makeProto, articulate } from './build.js';
import { recessedWindow } from './ModelDetails.js';
import { applyModelFinishes } from './ModelFinishes.js';

const C = {
  white: '#f5f5f5', bone: '#f4ecd6', black: '#1e1e1e', dark: '#333338', gray: '#9aa0a6', lgray: '#c4c9ce',
  red: '#d9382b', blue: '#2f7fd6', lblue: '#7cc4f0', yellow: '#ffd21a', orange: '#f28a1a', green: '#3fa34a',
  dgreen: '#2f7d3a', lime: '#c8e63a', pink: '#f28ab2', purple: '#8e5bd6', wood: '#c99a5b', dwood: '#8f6a38',
  brown: '#7a4a28', tan: '#d8a86a', cream: '#f0d9a8', lab: '#e2b666', labD: '#2a2118', corgi: '#e08a2a',
  dach: '#8a4a26', poodle: '#f5b5d5', poodleW: '#f2efe8', dane: '#7f8a99', skin: '#f1c8a0', skinD: '#b98860',
  skin3: '#8a5a3a', water: '#6cc4f0', foam: '#e8f8ff', roof: '#c8442f', metal: '#b8bec4', glass: '#a8dcf4',
  leafA: '#3fa34a', leafB: '#2f8a3c', leafC: '#56b85a', trunk: '#7a4a28', trunkD: '#5e3a20',
};
// Every primitive gets a surface: from `DEF` while a dog/person is being built (soft fur/fabric), otherwise from its colour
// (per-part opts override both). Unmapped colours are painted plastic/metal props.
const PALETTE = new Map([
  [C.wood, 'wood'], [C.dwood, 'wood'], [C.trunk, 'wood'], [C.trunkD, 'wood'], ['#6a4030', 'wood'], ['#d8ac68', 'wood'], ['#e0b070', 'wood'], ['#c8905a', 'wood'], [C.tan, 'wood'],
  [C.leafA, 'foliage'], [C.leafB, 'foliage'], [C.leafC, 'foliage'], [C.pink, 'foliage'], ['#f0a0c0', 'foliage'], ['#f8c0d8', 'foliage'], ['#e888b0', 'foliage'],
  [C.glass, 'glass'], [C.water, 'glass'], ['#a8dcf4', 'glass'], ['#9ad0e8', 'glass'], [C.foam, 'fabric'],
  [C.metal, 'metal'], [C.dark, 'metal'], [C.lgray, 'stone'], [C.gray, 'stone'], [C.bone, 'stone'], ['#232326', 'rubber'],
]);
const STRENGTH = { wood: 0.6, foliage: 0.6, glass: 0.2, metal: 0.4, stone: 0.6, rubber: 0.5, fabric: 0.45, paint: 0.3 };
let DEF = null;
const surfaced = (fn, ci) => (...a) => {
  const surface = DEF?.surface ?? PALETTE.get(a[ci]) ?? 'paint';
  a[ci + 1] = { surface, textureStrength: DEF?.textureStrength ?? STRENGTH[surface], ...(a[ci + 1] ?? {}) };
  return fn(...a);
};
const box = surfaced(BUILD.box, 3), rbox = surfaced(BUILD.rbox, 3), cyl = surfaced(BUILD.cyl, 3), cone = surfaced(BUILD.cone, 2);
const sphere = surfaced(BUILD.sphere, 1), torus = surfaced(BUILD.torus, 2), capsule = surfaced(BUILD.capsule, 2);
const lathe = surfaced(BUILD.lathe, 1), extrude = surfaced(BUILD.extrude, 2);
/** Run a builder with a default surface for every primitive (soft fur, cloth). */
const withDefault = (def, fn) => { DEF = def; try { return fn(); } finally { DEF = null; } };
const FUR = { surface: 'fabric', textureStrength: 0.5 };
const CLOTH = { surface: 'fabric', textureStrength: 0.4 };
const PI = Math.PI;
const B = (w, h, d, c, x, y, z, o = {}) => box(w, h, d, c, { x, y, z, ...o });
const RB = (w, h, d, c, x, y, z, o = {}) => rbox(w, h, d, c, { x, y, z, segments: 1, ...o });
const S = (r, c, o = {}) => sphere(r, c, { segments: 8, rings: 6, ...o });
const Sl = (r, c, o = {}) => sphere(r, c, { segments: 6, rings: 4, ...o }); // small / low
const shade = (c, f) => {
  const n = parseInt(c.slice(1), 16);
  return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('');
};

// A capsule/cylinder-like limb between two points (x,y plane), radius r.
function limb(x0, y0, x1, y1, r, c, o = {}) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  return capsule(r, Math.max(0.001, L - 2 * r), c, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, rz: Math.atan2(-dx, dy), segments: 8, caps: 2, ...o });
}

/**
 * Dog: capsule torso, sphere head + muzzle, neck, haunches, tapered legs with paws, floppy/pointy/puff ears,
 * collar with tag, tails of several kinds. Dimensions are before the global scale k.
 */
function dog(o) { return withDefault(FUR, () => dogParts(o)); }
function dogParts({ len, hgt, wid, legH, headS, body, head = body, ear, legs = body, tail = body, snoutC = head, chest = null, belly = null,
  earType = 'floppy', tailType = 'sabre', muzzleL = 0.4, collar = null, spots = 0, mask = null, k = 1, lod = 1, fluff = false, tongue = false,
  eyeC = '#2a1a10', brow = null, tailUp = 1.1, cheeks = null }) {
  const p = [];
  const top = legH + hgt;
  const ec = ear ?? head;
  const legR = Math.max(0.075, wid * 0.16);
  const hx = len / 2 + headS * 0.28, hy = top + headS * 0.32;
  const seg = lod < 1 ? 7 : 8;

  if (fluff) {
    p.push(sphere(hgt * 0.62, body, { x: -len * 0.1, y: legH + hgt * 0.55, sx: len / hgt * 0.75, sy: 0.95, sz: wid / hgt * 1.15, segments: 10, rings: 7 }));
    p.push(sphere(hgt * 0.5, body, { x: len * 0.25, y: legH + hgt * 0.62, sx: 0.9, sz: wid / hgt * 1.0, segments: 9, rings: 6 }));
  } else {
    p.push(capsule(wid / 2, len - wid, body, { rz: PI / 2, sx: hgt / wid, x: 0, y: legH + hgt / 2, segments: seg + 1, caps: 3 }));
    if (lod >= 1) {
      // haunches + shoulder muscle read as a dog, not a sausage
      for (const sg of [1, -1]) p.push(sphere(wid * 0.42, body, { x: -len / 2 + wid * 0.55, y: legH + hgt * 0.5, z: sg * wid * 0.22, sy: hgt / wid * 0.95, segments: 7, rings: 5 }));
    }
  }
  if (chest) p.push(sphere(wid * 0.48, chest, { x: len / 2 - wid * 0.3, y: legH + hgt * 0.42, sy: hgt / wid * 0.85, sz: 0.85, segments: 8, rings: 5 }));
  if (belly) p.push(sphere(wid * 0.45, belly, { x: 0, y: legH + hgt * 0.2, sx: len / wid * 0.42, sy: 0.55, sz: 0.85, segments: 8, rings: 5 }));

  // legs: tapered cylinder + paw
  const lx = len / 2 - wid * 0.3, lz = wid / 2 - legR * 1.1;
  // Quadruped gait: diagonal pairs share a phase (front-left + back-right = 0, front-right + back-left = 1; left is -Z).
  [[lx, lz], [lx, -lz], [-lx + wid * 0.1, lz], [-lx + wid * 0.1, -lz]].forEach(([x, z]) => {
    const hip = [x, fluff ? legH + 0.05 : legH + 0.04 + legR * 0.4, z], o = { phase: (x > 0) === (z < 0) ? 0 : 1, hip };
    const leg = (g) => p.push(articulate(g, 'leg', hip, o));
    if (fluff) {
      leg(cyl(legR * 0.8, legR * 0.9, legH + 0.05, tail, { x, y: (legH + 0.05) / 2, z, segments: 7 }));
      leg(sphere(legR * 1.5, body, { x, y: legH * 0.25, z, segments: 7, rings: 5 }));
      leg(sphere(legR * 1.3, body, { x, y: legH * 0.78, z, segments: 7, rings: 5 }));
    } else {
      leg(cyl(legR * 0.85, legR, legH + 0.04, legs, { x, y: (legH + 0.04) / 2 + legR * 0.4, z, segments: seg }));
      leg(sphere(legR * 1.25, shade(legs, 0.96), { x: x + legR * 0.35, y: legR * 0.55, z, sy: 0.6, sx: 1.25, segments: 6, rings: 4 }));
    }
  });

  // neck + head
  const nx0 = len / 2 - wid * 0.25, ny0 = legH + hgt * 0.55;
  const nx1 = hx - headS * 0.1, ny1 = hy - headS * 0.15;
  const rn = headS * 0.34;
  p.push(limb(nx0, ny0, nx1, ny1, rn, fluff ? body : (chest ?? body), { segments: 8 }));
  if (collar) {
    const tt = 0.62, cx = nx0 + (nx1 - nx0) * tt, cy = ny0 + (ny1 - ny0) * tt;
    p.push(cyl(rn * 1.12, rn * 1.12, headS * 0.13, collar, { x: cx, y: cy, rz: Math.atan2(-(nx1 - nx0), ny1 - ny0), segments: 10 }));
    p.push(Sl(headS * 0.075, C.yellow, { x: cx + rn * 0.9, y: cy - headS * 0.13, sx: 0.5 }));
  }
  p.push(sphere(headS * 0.5, head, { x: hx, y: hy, sx: 1.02, sy: 0.94, sz: 0.94, segments: 10, rings: 7 }));
  if (cheeks) p.push(sphere(headS * 0.36, cheeks, { x: hx + headS * 0.22, y: hy - headS * 0.1, sx: 1.0, sy: 0.85, sz: 1.1, segments: 8, rings: 6 }));
  if (mask) {
    p.push(sphere(headS * 0.515, mask, { x: hx - headS * 0.02, y: hy + headS * 0.14, sx: 0.97, sy: 0.7, sz: 0.97, segments: 9, rings: 6 }));
  }
  // muzzle + nose + mouth
  const mlen = headS * muzzleL;
  const mx = hx + headS * 0.4 + mlen / 2;
  p.push(capsule(headS * 0.2, mlen, snoutC, { rz: PI / 2, x: mx, y: hy - headS * 0.13, sy: 1.0, sz: 0.9, sx: 0.85, segments: 8, caps: 2 }));
  p.push(Sl(headS * 0.095, C.black, { x: mx + mlen / 2 + headS * 0.18, y: hy - headS * 0.06, sz: 1.3, sx: 1.1 }));
  p.push(B(mlen * 0.9, 0.02, headS * 0.34, shade(snoutC, 0.7), mx, hy - headS * 0.24, 0));
  if (tongue) p.push(B(headS * 0.2, 0.03, headS * 0.14, '#f06080', mx - 0.02, hy - headS * 0.27, 0, { rz: -0.15 }));
  // eyes with glints (+ optional brows)
  const ex = hx + headS * 0.43;
  for (const sg of [1, -1]) {
    p.push(Sl(headS * 0.075, eyeC, { x: ex, y: hy + headS * 0.12, z: sg * headS * 0.22, sx: 0.7 }));
    p.push(B(0.02, headS * 0.03, headS * 0.03, C.white, ex + headS * 0.05, hy + headS * 0.15, sg * headS * 0.2));
    if (brow) p.push(Sl(headS * 0.055, brow, { x: ex - headS * 0.02, y: hy + headS * 0.26, z: sg * headS * 0.22 }));
  }
  // ears
  if (earType === 'floppy') {
    for (const sg of [1, -1]) p.push(sphere(headS * 0.3, ec, { x: hx - headS * 0.1, y: hy - headS * 0.02, z: sg * headS * 0.43, sx: 0.45, sy: 1.25, sz: 0.85, rx: sg * -0.28, segments: 8, rings: 6 }));
  } else if (earType === 'pointy') {
    for (const sg of [1, -1]) {
      p.push(cone(headS * 0.2, headS * 0.6, ec, { x: hx - headS * 0.08, y: hy + headS * 0.6, z: sg * headS * 0.27, rx: sg * -0.15, sz: 0.7, segments: 8, flat: false }));
      p.push(cone(headS * 0.12, headS * 0.42, '#f0a0a0', { x: hx - headS * 0.02, y: hy + headS * 0.58, z: sg * headS * 0.27, rx: sg * -0.15, sz: 0.6, segments: 6, flat: false }));
    }
  } else if (earType === 'puff') {
    for (const sg of [1, -1]) p.push(sphere(headS * 0.32, ec, { x: hx - headS * 0.08, y: hy - headS * 0.02, z: sg * headS * 0.47, sy: 1.15, segments: 8, rings: 6 }));
    p.push(sphere(headS * 0.36, ec, { x: hx - headS * 0.04, y: hy + headS * 0.5, segments: 8, rings: 6 }), sphere(headS * 0.25, ec, { x: hx - headS * 0.02, y: hy + headS * 0.32, segments: 7, rings: 5 }));
  } else if (earType === 'rose') {
    for (const sg of [1, -1]) p.push(sphere(headS * 0.22, ec, { x: hx - headS * 0.12, y: hy + headS * 0.32, z: sg * headS * 0.38, sx: 0.5, sy: 1.1, segments: 7, rings: 5 }));
  }
  // tail
  const tx = -len / 2 + 0.02, ty = top - hgt * 0.15, tp = [];
  if (tailType === 'sabre') tp.push(capsule(0.06 + wid * 0.05, len * 0.3, tail, { x: tx - len * 0.11, y: ty + len * 0.12, rz: tailUp, segments: 7, caps: 2 }));
  else if (tailType === 'otter') tp.push(cyl(0.05, 0.11 + wid * 0.08, len * 0.4, tail, { x: tx - len * 0.12, y: ty + len * 0.06, rz: tailUp * 0.7 + 0.3, segments: 8 }));
  else if (tailType === 'curl') {
    tp.push(limb(tx, ty, tx - len * 0.08, ty + len * 0.2, 0.09, tail), limb(tx - len * 0.08, ty + len * 0.2, tx + len * 0.05, ty + len * 0.38, 0.08, tail));
    tp.push(Sl(0.12, tail, { x: tx + len * 0.07, y: ty + len * 0.4 }));
  } else if (tailType === 'pom') {
    tp.push(cyl(0.04, 0.05, len * 0.2, legs, { x: tx - 0.06, y: ty + 0.1, rz: 0.8, segments: 6 }), sphere(0.15 + len * 0.06, tail, { x: tx - len * 0.12, y: ty + len * 0.15, segments: 8, rings: 6 }));
  } else if (tailType === 'stub') tp.push(sphere(0.1 + len * 0.05, tail, { x: tx - 0.06, y: ty + 0.06, segments: 7, rings: 5 }));
  p.push(...tp.map((g) => articulate(g, 'tail', [tx, ty, 0], { amp: 1.3 })));
  // spots (dalmatian): flattened dots pressed into the coat
  const sr = (i) => { const v = Math.sin(i * 91.7 + 13.1) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < spots; i++) {
    const a = sr(i) * PI * 1.6 - PI * 0.3;
    const x = (sr(i + 40) - 0.5) * (len * 0.75);
    const zc = Math.sin(a), yc = Math.cos(a);
    p.push(sphere(0.06 + sr(i + 7) * 0.06, C.black, { x, y: legH + hgt / 2 + yc * hgt * 0.46, z: zc * wid * 0.46, sx: 1.1, sy: 0.35, sz: 1.0, rx: 0, segments: 5, rings: 3, ry: 0, rz: 0 }));
  }
  for (let i = 0; i < Math.floor(spots / 2); i++) p.push(Sl(0.05 + sr(i + 70) * 0.035, C.black, { x: hx - 0.05 + sr(i + 33) * 0.12, y: hy + headS * 0.35, z: (sr(i + 3) - 0.5) * headS * 0.6, sy: 0.4 }));
  return p.map((g) => {
    g.scale(k, k, k);
    const art = g.userData.articulation;
    if (art) { art.pivot = art.pivot.map((v) => v * k); if (art.hip) art.hip = art.hip.map((v) => v * k); }
    return g;
  });
}

function person(o) { return withDefault(CLOTH, () => personParts(o)); }
function personParts({ shirt, pants, hair, skin, hairStyle = 'short', dress = false, leash = false, hat = null, shoe = '#3a3a44', bag = null, glasses = false, stripe = null }) {
  const p = [];
  const sc = skin;
  if (dress) {
    p.push(lathe([[0.4, 0.22], [0.4, 0.28], [0.32, 0.48], [0.22, 0.7], [0.17, 0.82]], pants, { segments: 12, flat: false, surface: 'fabric' }));
    p.push(torus(0.4, 0.02, shade(pants, 0.8), { y: 0.26, rx: PI / 2, radial: 4, segments: 14 }));
    for (const sg of [1, -1]) {
      const hip = [-0.02, 0.5, sg * 0.1], o = { side: sg, hip };
      p.push(articulate(capsule(0.065, 0.36, sc, { x: -0.02, y: 0.28, z: sg * 0.1, segments: 7, caps: 2 }), 'leg', hip, o),
        articulate(Sl(0.09, shoe, { x: 0.04, y: 0.05, z: sg * 0.1, sx: 1.5, sy: 0.7, surface: 'rubber' }), 'leg', hip, o));
    }
  } else {
    for (const sg of [1, -1]) {
      const hip = [-0.02, 0.76, sg * 0.115], o = { side: sg, hip };
      p.push(articulate(capsule(0.095, 0.5, pants, { x: -0.02, y: 0.42, z: sg * 0.115, segments: 8, caps: 2, ...(pants === skin ? {} : { surface: 'fabric' }) }), 'leg', hip, o));
      p.push(articulate(Sl(0.115, shoe, { x: 0.05, y: 0.07, z: sg * 0.115, sx: 1.6, sy: 0.65, sz: 0.9, surface: 'rubber' }), 'leg', hip, o),
        articulate(B(0.05, 0.04, 0.16, C.white, 0.15, 0.03, sg * 0.115), 'leg', hip, o));
    }
    p.push(cyl(0.21, 0.2, 0.14, pants, { y: 0.78, sz: 1.15, segments: 10, ...(pants === skin ? {} : { surface: 'fabric' }) }), B(0.42, 0.045, 0.3, shade(pants, 0.55), 0, 0.84, 0));
  }
  const ty = dress ? 1.05 : 1.15;
  p.push(capsule(0.2, 0.34, shirt, { y: ty, sx: 0.78, sz: 1.15, segments: 10, caps: 3, surface: 'fabric' }));
  if (stripe) p.push(cyl(0.245, 0.245, 0.08, stripe, { y: ty + 0.02, sx: 0.78, sz: 1.15, segments: 10 }));
  p.push(cyl(0.07, 0.08, 0.14, sc, { y: ty + 0.4, segments: 8 }));
  // arms (shoulder -> hand) and hands
  for (const sg of [1, -1]) {
    const fwd = leash && sg === 1;
    // The leash hand stays put; the other arm swings opposite the legs.
    const swing = (g) => (fwd ? g : articulate(g, 'arm', [0, ty + 0.3, sg * 0.31], { side: sg }));
    p.push(swing(limb(0, ty + 0.3, fwd ? 0.26 : 0.03, ty - (fwd ? 0.14 : 0.3), 0.06, shirt, { z: sg * 0.31, surface: 'fabric' })));
    p.push(swing(Sl(0.07, sc, { x: fwd ? 0.28 : 0.04, y: ty - (fwd ? 0.18 : 0.34), z: sg * 0.34 })));
  }
  // head, face, hair
  const hy = ty + 0.62;
  p.push(sphere(0.21, sc, { y: hy, sy: 1.05, segments: 10, rings: 7 }));
  p.push(Sl(0.03, C.black, { x: 0.19, y: hy + 0.03, z: 0.08 }), Sl(0.03, C.black, { x: 0.19, y: hy + 0.03, z: -0.08 }));
  p.push(Sl(0.04, shade(sc, 0.9), { x: 0.21, y: hy - 0.02, sx: 0.8 }), B(0.02, 0.02, 0.1, '#a04a40', 0.2, hy - 0.09, 0));
  if (glasses) p.push(torus(0.05, 0.008, C.black, { x: 0.2, y: hy + 0.03, z: 0.085, ry: PI / 2, radial: 4, segments: 10 }), torus(0.05, 0.008, C.black, { x: 0.2, y: hy + 0.03, z: -0.085, ry: PI / 2, radial: 4, segments: 10 }));
  if (hairStyle === 'short') p.push(sphere(0.225, hair, { x: -0.02, y: hy + 0.06, sy: 0.72, segments: 9, rings: 6 }));
  if (hairStyle === 'long') p.push(sphere(0.23, hair, { x: -0.02, y: hy + 0.06, sy: 0.75, segments: 9, rings: 6 }), capsule(0.1, 0.34, hair, { x: -0.13, y: hy - 0.22, sz: 1.5, sx: 0.7, segments: 8, caps: 2 }));
  if (hairStyle === 'bun') p.push(sphere(0.225, hair, { x: -0.02, y: hy + 0.06, sy: 0.72, segments: 9, rings: 6 }), sphere(0.11, hair, { y: hy + 0.28, x: -0.09, segments: 7, rings: 5 }));
  if (hat) p.push(cyl(0.34, 0.34, 0.035, hat, { y: hy + 0.14, segments: 14 }), cyl(0.2, 0.22, 0.2, hat, { y: hy + 0.26, segments: 12 }), cyl(0.225, 0.225, 0.05, C.red, { y: hy + 0.19, segments: 12 }));
  if (leash) p.push(limb(0.28, ty - 0.18, 0.66, 0.12, 0.014, C.red, { z: 0.34, segments: 5, caps: 1 }), Sl(0.04, C.red, { x: 0.28, y: ty - 0.18, z: 0.34 }));
  if (bag) p.push(RB(0.18, 0.24, 0.1, bag, -0.05, ty - 0.2, -0.42, { bevel: 0.04 }), B(0.03, 0.4, 0.03, shade(bag, 0.7), -0.05, ty + 0.1, -0.3));
  return p;
}

function car({ body, roof = body, kind = 'sedan', trim = '#3a3a44', win = '#9ad0e8' }) {
  const p = [];
  const cabL = kind === 'hatch' ? 2.2 : kind === 'suv' ? 2.5 : 1.95;
  const cabX = kind === 'hatch' ? -0.35 : kind === 'suv' ? -0.45 : -0.2;
  const cabH = kind === 'suv' ? 0.74 : 0.6;
  const wr = kind === 'suv' ? 0.42 : 0.36;
  const by = wr + 0.2;
  p.push(rbox(3.8, 0.62, 1.72, body, { bevel: 0.2, y: by + 0.1, segments: 2 }));
  p.push(rbox(cabL, cabH, 1.5, roof, { bevel: 0.24, x: cabX, y: by + 0.4 + cabH / 2, segments: 2 }));
  p.push(B(3.55, 0.18, 1.6, trim, 0, by - 0.16, 0)); // sill / underbody
  const cy = by + 0.4 + cabH / 2 + 0.02;
  // side windows (two panes split by a pillar)
  for (const sg of [1, -1]) {
    p.push(B(cabL * 0.42, cabH * 0.62, 0.05, win, cabX + cabL * 0.22, cy, sg * 0.752), B(cabL * 0.34, cabH * 0.62, 0.05, win, cabX - cabL * 0.26, cy, sg * 0.752));
    p.push(B(0.09, cabH * 0.7, 0.06, trim, cabX - cabL * 0.02, cy, sg * 0.754));
    p.push(B(0.16, 0.05, 0.05, trim, cabX + cabL * 0.02, by + 0.34, sg * 0.87), B(0.16, 0.05, 0.05, trim, cabX - cabL * 0.32, by + 0.34, sg * 0.87));
    p.push(RB(0.16, 0.1, 0.16, body, cabX + cabL * 0.5 - 0.1, by + 0.7, sg * 0.92, { bevel: 0.03 })); // mirrors
  }
  // windscreen + rear window (raked)
  p.push(B(0.06, cabH * 0.72, 1.3, win, cabX + cabL / 2 - 0.02 + 0.05, cy, 0, { rz: 0.55 }));
  p.push(B(0.06, cabH * 0.72, 1.3, win, cabX - cabL / 2 + 0.02 - 0.05, cy, 0, { rz: kind === 'suv' ? 0.1 : -0.5 }));
  // lights, grille, bumpers, plates
  for (const sg of [1, -1]) {
    p.push(Sl(0.14, '#fff6c0', { emissive: 0.8, x: 1.86, y: by + 0.22, z: sg * 0.56, sx: 0.55, sy: 0.8 }));
    p.push(B(0.05, 0.13, 0.3, C.red, -1.9, by + 0.24, sg * 0.6));
    p.push(B(0.05, 0.05, 0.12, C.orange, 1.9, by + 0.06, sg * 0.72));
  }
  p.push(B(0.05, 0.16, 0.72, '#22252a', 1.9, by + 0.14, 0), B(0.05, 0.03, 0.72, C.metal, 1.905, by + 0.22, 0));
  p.push(RB(0.22, 0.2, 1.66, trim, 1.86, by - 0.14, 0, { bevel: 0.05 }), RB(0.22, 0.2, 1.66, trim, -1.86, by - 0.14, 0, { bevel: 0.05 }));
  p.push(B(0.03, 0.14, 0.34, C.white, -1.92, by - 0.02, 0), B(0.03, 0.12, 0.3, C.white, 1.93, by - 0.06, 0));
  // wheels: tyre, rim, hub
  for (const [x, z] of [[1.22, 0.8], [1.22, -0.8], [-1.22, 0.8], [-1.22, -0.8]]) {
    const pivot = [x, wr, z], o = { radius: wr, front: x > 0 };
    p.push(articulate(cyl(wr, wr, 0.3, '#232326', { x, y: wr, z, rx: PI / 2, segments: 12, surface: 'rubber' }), 'wheel', pivot, o));
    p.push(articulate(cyl(wr * 0.62, wr * 0.62, 0.32, C.metal, { x, y: wr, z, rx: PI / 2, segments: 10 }), 'wheel', pivot, o),
      articulate(cyl(wr * 0.2, wr * 0.2, 0.34, '#555', { x, y: wr, z, rx: PI / 2, segments: 6, surface: 'metal' }), 'wheel', pivot, o),
      articulate(B(wr * 1.0, wr * 0.12, 0.35, '#bfc5cb', x, wr, z, { surface: 'metal' }), 'wheel', pivot, o));
  }
  if (kind === 'suv') p.push(B(2.1, 0.05, 0.05, trim, cabX, by + 0.4 + cabH + 0.08, 0.5), B(2.1, 0.05, 0.05, trim, cabX, by + 0.4 + cabH + 0.08, -0.5));
  return p;
}

export function buildProtos() {
  const P = {};
  const SWAY = { tree: 'tree', treeBig: 'tree', treeBlossom: 'tree', pineTree: 'tree', bush: 'tree', pondDuck: 'boat' };
  const add = (name, parts, opts = {}) => (P[name] = applyModelFinishes(makeProto(name, parts.flat(), { sway: SWAY[name], ...opts }), 'park'));

  // ---------- tiny ----------
  add('bone', [
    capsule(0.085, 0.6, C.bone, { y: 0.14, rz: PI / 2, segments: 8, caps: 3 }),
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => sphere(0.15, C.bone, { x: a * 0.4, y: 0.14 + 0, z: b * 0.1, segments: 8, rings: 6 })),
    B(0.24, 0.02, 0.05, '#e6dcc0', 0, 0.23, 0),
  ], { value: 0.2 });
  add('tennisBall', [
    sphere(0.24, C.lime, { y: 0.24, segments: 14, rings: 10 }),
    torus(0.19, 0.012, C.white, { y: 0.24, rx: 0.9, radial: 4, segments: 16, x: 0.06 }),
    torus(0.19, 0.012, C.white, { y: 0.24, rx: 0.9 + PI, ry: 0, radial: 4, segments: 16, x: -0.06 }),
  ], { value: 0.12 });
  add('frisbeeRed', [
    lathe([[0, 0.02], [0.3, 0.02], [0.4, 0.03], [0.44, 0.07], [0.42, 0.11], [0.36, 0.11], [0.3, 0.15], [0.14, 0.16], [0, 0.15]], C.red, { segments: 18 }),
    lathe([[0.16, 0.155], [0.2, 0.17], [0.24, 0.155]], C.white, { segments: 14 }),
    lathe([[0.36, 0.115], [0.4, 0.125], [0.42, 0.115]], C.white, { segments: 18 }),
  ], { value: 0.15 });
  add('frisbeeBlue', [
    lathe([[0, 0.02], [0.3, 0.02], [0.4, 0.03], [0.44, 0.07], [0.42, 0.11], [0.36, 0.11], [0.3, 0.15], [0.14, 0.16], [0, 0.15]], C.blue, { segments: 18 }),
    lathe([[0.16, 0.155], [0.2, 0.17], [0.24, 0.155]], C.yellow, { segments: 14 }),
    lathe([[0.36, 0.115], [0.4, 0.125], [0.42, 0.115]], C.yellow, { segments: 18 }),
  ], { value: 0.15 });
  add('chewRope', (() => {
    const p = [];
    for (let i = 0; i < 7; i++) p.push(cyl(0.065, 0.065, 0.24, i % 2 ? C.tan : C.white, { x: -0.36 + i * 0.12, y: 0.12, z: (i % 2 ? 1 : -1) * 0.012, rz: PI / 2 + (i % 2 ? 0.35 : -0.35), segments: 6 }));
    p.push(sphere(0.15, C.red, { x: 0.47, y: 0.15, segments: 8, rings: 6 }), sphere(0.15, C.blue, { x: -0.47, y: 0.15, segments: 8, rings: 6 }));
    p.push(cone(0.05, 0.12, C.tan, { x: 0.63, y: 0.14, rz: -PI / 2, segments: 5 }), cone(0.05, 0.12, C.tan, { x: -0.63, y: 0.14, rz: PI / 2, segments: 5 }));
    p.push(cone(0.04, 0.1, C.white, { x: 0.6, y: 0.2, rz: -PI / 2 + 0.5, segments: 5 }), cone(0.04, 0.1, C.white, { x: -0.6, y: 0.08, rz: PI / 2 + 0.5, segments: 5 }));
    return p;
  })(), { value: 0.2 });
  add('squeakyToy', [
    sphere(0.28, C.yellow, { y: 0.28, sx: 1.2, sy: 0.9, segments: 9, rings: 7 }), sphere(0.19, C.yellow, { x: 0.3, y: 0.55, segments: 8, rings: 6 }),
    RB(0.22, 0.08, 0.2, C.orange, 0.52, 0.5, 0, { bevel: 0.025 }), Sl(0.03, C.black, { x: 0.42, y: 0.6, z: 0.1 }), Sl(0.03, C.black, { x: 0.42, y: 0.6, z: -0.1 }),
    sphere(0.13, '#f0c000', { x: -0.02, y: 0.34, z: 0.24, sx: 1.4, sy: 0.6, rx: 0.3, segments: 6, rings: 4 }), sphere(0.13, '#f0c000', { x: -0.02, y: 0.34, z: -0.24, sx: 1.4, sy: 0.6, rx: -0.3, segments: 6, rings: 4 }),
    cone(0.09, 0.2, C.yellow, { x: -0.36, y: 0.42, rz: PI / 2 + 0.4, segments: 6 }),
  ], { value: 0.2 });
  const kibble = (n, cx, cy, s) => {
    const cols = ['#8a5a2a', '#a86c30', '#6e4420'];
    return Array.from({ length: n }, (_, i) => Sl(0.06, cols[i % 3], { x: cx + Math.cos(i * 2.4) * s * Math.sqrt(i / n), y: cy + 0.05 * (1 - i / n), z: Math.sin(i * 2.4) * s * Math.sqrt(i / n) }));
  };
  add('foodBowl', [
    lathe([[0, 0.0], [0.26, 0.0], [0.3, 0.03], [0.42, 0.26], [0.45, 0.29], [0.41, 0.3], [0.37, 0.27], [0.3, 0.13], [0, 0.11]], C.blue, { segments: 16 }),
    lathe([[0.27, 0.0], [0.3, 0.05], [0.28, 0.05], [0.25, 0.0]], C.white, { segments: 14 }),
    ...kibble(11, 0, 0.13, 0.24), B(0.1, 0.02, 0.05, C.white, 0.34, 0.2, 0.0, { rz: 0.5 }),
  ], { value: 0.25 });
  add('waterBowl', [
    lathe([[0, 0.0], [0.28, 0.0], [0.32, 0.03], [0.42, 0.24], [0.45, 0.27], [0.41, 0.28], [0.37, 0.25], [0.3, 0.12], [0, 0.1]], C.red, { segments: 16 }),
    cyl(0.36, 0.36, 0.02, C.water, { y: 0.2, segments: 16 }),
    torus(0.24, 0.008, '#dff6ff', { y: 0.215, rx: PI / 2, radial: 4, segments: 14 }), torus(0.13, 0.008, '#dff6ff', { y: 0.215, rx: PI / 2, radial: 4, segments: 12 }),
  ], { value: 0.25 });
  add('hydrant', [
    lathe([[0, 0], [0.34, 0], [0.34, 0.06], [0.27, 0.1], [0.25, 0.22], [0.25, 0.7], [0.29, 0.74], [0.29, 0.8], [0.24, 0.84], [0.0, 0.84]], C.red, { segments: 14 }),
    lathe([[0.0, 0.84], [0.22, 0.86], [0.2, 0.98], [0.11, 1.08], [0.0, 1.1]], C.red, { segments: 12 }),
    cyl(0.08, 0.08, 0.1, C.yellow, { y: 1.13, segments: 8 }), cyl(0.05, 0.05, 0.08, C.yellow, { y: 1.2, segments: 6 }),
    cyl(0.11, 0.11, 0.62, C.red, { y: 0.62, rz: PI / 2, segments: 10 }),
    cyl(0.15, 0.15, 0.09, C.yellow, { y: 0.62, x: 0.35, rz: PI / 2, segments: 10 }), cyl(0.15, 0.15, 0.09, C.yellow, { y: 0.62, x: -0.35, rz: PI / 2, segments: 10 }),
    cyl(0.16, 0.16, 0.07, C.yellow, { y: 0.62, z: 0.28, rx: PI / 2, segments: 10 }),
    cyl(0.29, 0.29, 0.05, C.yellow, { y: 0.76, segments: 14 }), cyl(0.3, 0.3, 0.04, C.yellow, { y: 0.14, segments: 14 }),
    torus(0.1, 0.012, C.dark, { y: 0.5, z: 0.29, x: 0.05, radial: 4, segments: 8 }),
  ], { value: 0.45 });
  add('ballBucket', [
    lathe([[0, 0], [0.32, 0], [0.34, 0.03], [0.43, 0.52], [0.45, 0.55], [0.41, 0.56], [0.38, 0.52], [0.3, 0.06], [0, 0.05]], C.orange, { segments: 14 }),
    cyl(0.44, 0.44, 0.05, '#e07010', { y: 0.5, segments: 14 }),
    B(0.03, 0.03, 0.76, C.metal, 0, 0.9, 0, { rz: 0 }), B(0.03, 0.4, 0.03, C.metal, 0, 0.72, 0.38, { rx: 0.4 }), B(0.03, 0.4, 0.03, C.metal, 0, 0.72, -0.38, { rx: -0.4 }),
    S(0.2, C.lime, { y: 0.66, x: 0.12, z: 0.06 }), S(0.2, C.yellow, { y: 0.66, x: -0.14, z: -0.08 }), S(0.2, C.lime, { y: 0.72, x: 0.0, z: 0.0 }), S(0.2, '#ff9040', { y: 0.62, x: 0.02, z: -0.2 }),
  ], { value: 0.3 });
  add('poopBag', [
    lathe([[0, 0], [0.18, 0.02], [0.27, 0.16], [0.22, 0.34], [0.09, 0.42], [0.06, 0.5], [0.13, 0.56], [0.07, 0.6], [0, 0.6]], C.green, { segments: 10 }),
    cone(0.09, 0.2, C.dgreen, { x: 0.06, y: 0.68, rz: -0.6, segments: 6 }), cone(0.09, 0.2, C.dgreen, { x: -0.06, y: 0.68, rz: 0.6, segments: 6 }),
    torus(0.07, 0.018, '#2a7a33', { y: 0.5, rx: PI / 2, radial: 4, segments: 8 }),
    Sl(0.06, '#5cc060', { x: 0.14, y: 0.3, z: 0.14 }),
  ], { value: 0.15 });
  add('bush', [
    S(0.5, C.leafA, { y: 0.4, sy: 0.8, segments: 8, rings: 6 }), S(0.36, C.leafB, { x: 0.38, y: 0.3, sy: 0.8, z: 0.1 }), S(0.34, C.leafC, { x: -0.36, y: 0.32, z: -0.1, sy: 0.8 }),
    S(0.3, C.leafB, { x: 0.05, y: 0.35, z: 0.36, sy: 0.8 }), S(0.3, C.leafA, { x: -0.05, y: 0.34, z: -0.38, sy: 0.8 }),
    Sl(0.07, '#e85c8a', { x: -0.2, y: 0.72, z: 0.2 }), Sl(0.07, C.yellow, { x: 0.2, y: 0.7, z: -0.2 }), Sl(0.07, '#e85c8a', { x: 0.3, y: 0.62, z: 0.3 }), Sl(0.07, C.white, { x: -0.05, y: 0.78, z: -0.1 }), Sl(0.07, C.yellow, { x: -0.4, y: 0.5, z: 0.3 }),
  ], { value: 0.35 });
  add('sprinkler', (() => {
    const p = [lathe([[0, 0], [0.3, 0], [0.3, 0.06], [0.2, 0.12], [0.0, 0.14]], C.dark, { segments: 12 }), cyl(0.06, 0.06, 0.5, C.metal, { y: 0.36, segments: 8 }), lathe([[0.02, 0.6], [0.2, 0.62], [0.16, 0.7], [0.0, 0.72]], C.blue, { segments: 10 })];
    for (const a of [0, PI * 0.66, PI * 1.33]) for (let i = 1; i <= 4; i++) {
      p.push(Sl(0.045, C.water, { x: Math.cos(a) * i * 0.14, y: 0.7 + Math.sin(i * 0.7) * 0.18 - i * 0.02, z: Math.sin(a) * i * 0.14 }));
    }
    return p;
  })(), { value: 0.3 });
  // puppies: tiny budget, lower detail
  add('puppy', dog({ k: 0.7, lod: 0.6, len: 0.7, hgt: 0.32, wid: 0.3, legH: 0.18, headS: 0.34, body: C.tan, ear: C.brown, tail: C.tan, snoutC: '#e8c090', muzzleL: 0.3, collar: C.blue, tailUp: 0.9, tongue: true, chest: '#f0d8b0' }), { value: 0.5 });
  add('puppyBlack', dog({ k: 0.7, lod: 0.6, len: 0.7, hgt: 0.32, wid: 0.3, legH: 0.18, headS: 0.34, body: C.labD, ear: '#0f0f10', snoutC: C.tan, muzzleL: 0.3, collar: C.red, tailUp: 0.9, tongue: true }), { value: 0.5 });

  // ---------- small dogs ----------
  add('dachshund', dog({ k: 0.63, len: 1.5, hgt: 0.36, wid: 0.36, legH: 0.16, headS: 0.38, body: C.dach, ear: '#5a2f18', legs: '#6e3a1e', tail: C.dach, snoutC: '#a05a34', muzzleL: 0.7, tailUp: 0.7, collar: C.yellow, chest: '#a05a34' }), { value: 0.9 });
  add('corgi', dog({ k: 0.8, len: 1.05, hgt: 0.55, wid: 0.5, legH: 0.22, headS: 0.5, body: C.corgi, snoutC: C.white, ear: C.corgi, earType: 'pointy', legs: C.white, tailType: 'stub', muzzleL: 0.35,
    chest: C.white, belly: C.white, cheeks: C.white, collar: C.blue, tongue: true }), { value: 1.1 });
  add('poodle', dog({ k: 0.75, len: 1.0, hgt: 0.6, wid: 0.5, legH: 0.42, headS: 0.5, body: C.poodle, snoutC: C.poodleW, ear: C.poodle, earType: 'puff', legs: C.poodleW, tail: C.poodle, tailType: 'pom', fluff: true, muzzleL: 0.4, collar: C.blue }), { value: 1.2 });
  add('poodleWhite', dog({ k: 0.75, len: 1.0, hgt: 0.6, wid: 0.5, legH: 0.42, headS: 0.5, body: C.poodleW, snoutC: C.poodleW, ear: C.poodleW, earType: 'puff', legs: C.poodleW, tail: C.poodleW, tailType: 'pom', fluff: true, muzzleL: 0.4, collar: C.pink }), { value: 1.2 });

  // ---------- medium dogs ----------
  add('labYellow', dog({ k: 0.7, len: 1.5, hgt: 0.72, wid: 0.62, legH: 0.55, headS: 0.6, body: C.lab, ear: '#c4923e', legs: C.lab, muzzleL: 0.5, tailType: 'otter', collar: C.red, tongue: true, chest: '#efd08a' }), { value: 1.8 });
  add('labChoc', dog({ k: 0.7, len: 1.5, hgt: 0.72, wid: 0.62, legH: 0.55, headS: 0.6, body: C.brown, ear: '#5a361d', legs: C.brown, muzzleL: 0.5, tailType: 'otter', collar: C.green, tongue: true, chest: '#8a5a38', eyeC: '#1e120a' }), { value: 1.8 });
  add('dalmatian', dog({ k: 0.7, len: 1.6, hgt: 0.72, wid: 0.6, legH: 0.6, headS: 0.6, body: C.white, ear: C.black, spots: 14, muzzleL: 0.5, collar: C.red, tailType: 'sabre', tailUp: 1.0 }), { value: 2.0 });
  add('husky', dog({ k: 0.72, len: 1.5, hgt: 0.72, wid: 0.62, legH: 0.55, headS: 0.6, body: C.gray, head: C.gray, snoutC: C.white, ear: C.dark, earType: 'pointy', legs: C.white, tail: C.gray, tailType: 'curl',
    muzzleL: 0.35, chest: C.white, belly: C.white, cheeks: C.white, mask: '#5c6268', eyeC: '#5ab0e8', tongue: true, collar: C.red }), { value: 2.0 });
  add('greatDane', dog({ k: 0.78, len: 2.1, hgt: 1.0, wid: 0.8, legH: 0.95, headS: 0.8, body: C.dane, ear: '#4f5866', legs: C.dane, muzzleL: 0.55, tailType: 'sabre', tailUp: 0.5, collar: C.yellow, chest: '#c8ced8', mask: '#5a6270', tongue: false }), { value: 4.0 });

  // ---------- people ----------
  add('person', person({ shirt: C.blue, pants: C.dark, hair: C.brown, skin: C.skin, leash: true, stripe: C.white }), { value: 1.2 });
  add('personRed', person({ shirt: C.red, pants: C.blue, hair: C.yellow, skin: C.skin, hairStyle: 'long', leash: true, shoe: C.white }), { value: 1.2 });
  add('personGreen', person({ shirt: C.green, pants: C.dwood, hair: C.black, skin: C.skinD, hairStyle: 'bun', bag: '#f0d060', glasses: true }), { value: 1.2 });
  add('personDress', person({ shirt: C.pink, pants: C.pink, hair: C.brown, skin: C.skin3, hairStyle: 'long', dress: true, leash: true, shoe: C.red }), { value: 1.2 });
  add('personHat', person({ shirt: C.orange, pants: C.dgreen, hair: C.gray, skin: C.skin, hat: C.yellow, stripe: C.white }), { value: 1.2 });

  // ---------- furniture / props ----------
  add('trashCan', [
    lathe([[0, 0], [0.4, 0], [0.42, 0.04], [0.5, 1.0], [0.5, 1.06]], C.dgreen, { segments: 14 }),
    lathe([[0.415, 0.14], [0.435, 0.14], [0.44, 0.18], [0.42, 0.18]], '#245e2e', { segments: 14 }), lathe([[0.46, 0.5], [0.485, 0.5], [0.485, 0.56], [0.46, 0.56]], '#245e2e', { segments: 14 }), lathe([[0.49, 0.85], [0.515, 0.85], [0.515, 0.92], [0.49, 0.92]], '#245e2e', { segments: 14 }),
    lathe([[0.0, 1.06], [0.5, 1.06], [0.56, 1.1], [0.55, 1.16], [0.3, 1.24], [0.0, 1.27]], C.dark, { segments: 14 }),
    cyl(0.06, 0.06, 0.12, C.lgray, { y: 1.32, segments: 8 }), sphere(0.09, C.lgray, { y: 1.4, segments: 8, rings: 5 }),
    B(0.02, 0.22, 0.26, C.white, 0.5, 0.65, 0, { rz: 0.03 }), cyl(0.18, 0.2, 0.06, C.lgray, { y: 0.65, x: 0.5, rz: PI / 2, sy: 0.6, segments: 8 }),
  ], { value: 0.8 });
  add('bench', (() => {
    const p = [];
    for (let i = 0; i < 4; i++) p.push(RB(2.4, 0.07, 0.15, C.wood, 0, 0.56, -0.24 + i * 0.16, { bevel: 0.02 }));
    for (let i = 0; i < 3; i++) p.push(RB(2.4, 0.16, 0.06, i % 2 ? C.wood : '#d8ac68', 0, 0.82 + i * 0.2, -0.35 - i * 0.05, { bevel: 0.02, rx: -0.12 }));
    for (const sx of [-1, 1]) {
      const x = sx * 1.05;
      p.push(B(0.09, 0.56, 0.09, C.dark, x, 0.28, 0.28), B(0.09, 0.9, 0.09, C.dark, x, 0.45, -0.4, { rx: -0.12 }), B(0.09, 0.09, 0.66, C.dark, x, 0.5, -0.05));
      p.push(RB(0.1, 0.07, 0.62, C.dark, x, 0.83, 0.02, { bevel: 0.025 }), B(0.09, 0.28, 0.09, C.dark, x, 0.69, 0.3), sphere(0.055, C.dark, { x, y: 0.83, z: 0.34, segments: 7, rings: 5 }));
      p.push(B(0.12, 0.05, 0.14, C.dark, x, 0.025, 0.28), B(0.12, 0.05, 0.14, C.dark, x, 0.025, -0.42));
    }
    return p;
  })(), { value: 1.4 });
  add('doghouse', (() => {
    const p = [];
    p.push(RB(1.8, 1.2, 1.6, C.red, 0, 0.6, 0, { bevel: 0.06 }), B(1.9, 0.1, 1.7, '#8a2c1e', 0, 0.05, 0));
    for (const sg of [1, -1]) {
      p.push(RB(1.3, 0.1, 2.05, C.roof, sg * 0.5, 1.62, 0, { rz: -sg * 0.72, bevel: 0.03 }));
      for (let i = 0; i < 4; i++) { const t = 0.15 + i * 0.22; p.push(B(0.05, 0.03, 2.06, '#a03a26', sg * 0.95 * (1 - t), 1.2 + 0.82 * t + 0.07, 0, { rz: -sg * 0.72 })); }
    }
    p.push(RB(0.14, 0.14, 2.0, '#8a2c1e', 0, 2.03, 0, { bevel: 0.04 }));
    p.push(extrude([[-0.85, 0], [0.85, 0], [0, 0.82]], 0.06, C.white, { z: 0.82, y: 1.19 }), extrude([[-0.85, 0], [0.85, 0], [0, 0.82]], 0.06, C.white, { z: -0.82, y: 1.19 }));
    // arched door
    const arch = []; for (let i = 0; i <= 10; i++) { const a = PI - (i / 10) * PI; arch.push([Math.cos(a) * 0.38, 0.6 + Math.sin(a) * 0.38]); } arch.unshift([-0.38, 0]); arch.push([0.38, 0]);
    p.push(extrude(arch, 0.05, C.black, { z: 0.82 }));
    const archF = []; for (let i = 0; i <= 10; i++) { const a = PI - (i / 10) * PI; archF.push([Math.cos(a) * 0.46, 0.62 + Math.sin(a) * 0.46]); } archF.unshift([-0.46, 0]); archF.push([0.46, 0]);
    p.push(extrude(archF, 0.04, C.white, { z: 0.8 }));
    // name plate: bone-shaped sign
    p.push(RB(0.62, 0.16, 0.05, C.white, 0, 1.28, 0.85, { bevel: 0.03 }), Sl(0.07, C.white, { x: 0.32, y: 1.28, z: 0.85 }), Sl(0.07, C.white, { x: -0.32, y: 1.28, z: 0.85 }));
    p.push(RB(0.5, 0.06, 0.5, C.tan, 0, 0.03, 1.15, { bevel: 0.02 }), lathe([[0, 0.05], [0.16, 0.05], [0.2, 0.15], [0.18, 0.16], [0.0, 0.1]], C.blue, { segments: 10, x: 0.0, z: 1.15 }));
    return p;
  })(), { value: 3.0 });
  add('agilityJump', (() => {
    const p = [];
    for (const sg of [1, -1]) {
      p.push(cyl(0.05, 0.06, 1.15, C.white, { y: 0.575, z: sg * 0.9, segments: 8 }), sphere(0.07, C.red, { y: 1.18, z: sg * 0.9, segments: 6, rings: 4 }));
      p.push(RB(0.5, 0.06, 0.24, C.dark, 0, 0.03, sg * 0.9, { bevel: 0.02 }));
      for (const y of [0.35, 0.65, 0.95]) p.push(cyl(0.035, 0.035, 0.06, C.metal, { x: 0.05, y, z: sg * 0.9, rz: PI / 2, segments: 6 }));
    }
    [0.95, 0.65, 0.35].forEach((y, i) => {
      for (let s = 0; s < 4; s++) p.push(cyl(0.05, 0.05, 0.46, (s + i) % 2 ? C.white : [C.red, C.blue, C.yellow][i], { x: 0.05, y, z: -0.69 + s * 0.46, rx: PI / 2, segments: 8 }));
    });
    return p;
  })(), { value: 1.0, radius: 1.0 });
  add('weavePoles', (() => {
    const p = [RB(0.22, 0.05, 3.0, C.dark, 0, 0.03, 0, { bevel: 0.015 })];
    for (let i = 0; i < 6; i++) {
      const z = -1.25 + i * 0.5;
      p.push(cyl(0.05, 0.05, 0.45, i % 2 ? C.blue : C.white, { y: 0.3, z, segments: 8 }), cyl(0.05, 0.05, 0.45, i % 2 ? C.white : C.blue, { y: 0.75, z, segments: 8 }), cyl(0.05, 0.05, 0.4, i % 2 ? C.blue : C.white, { y: 1.15, z, segments: 8 }));
      p.push(Sl(0.06, C.red, { y: 1.36, z }));
    }
    return p;
  })(), { value: 1.0, radius: 1.3 });
  add('picnicTable', (() => {
    const p = [];
    for (let i = 0; i < 3; i++) p.push(RB(2.2, 0.1, 0.33, C.wood, 0, 0.85, -0.34 + i * 0.34, { bevel: 0.025 }));
    for (const sg of [1, -1]) p.push(RB(2.2, 0.1, 0.36, C.dwood, 0, 0.5, sg * 0.85, { bevel: 0.025 }));
    for (const sx of [-0.8, 0.8]) {
      p.push(RB(0.1, 0.06, 1.9, C.dwood, sx, 0.4, 0, { bevel: 0.02 }), RB(0.1, 0.95, 0.12, C.dwood, sx, 0.46, 0.5, { rx: 0.4, bevel: 0.02 }), RB(0.1, 0.95, 0.12, C.dwood, sx, 0.46, -0.5, { rx: -0.4, bevel: 0.02 }));
    }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) p.push(B(0.25, 0.015, 0.25, C.red, -0.375 + i * 0.25, 0.91, -0.375 + j * 0.25));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) p.push(B(0.25, 0.015, 0.25, C.white, -0.375 + i * 0.25, 0.91, -0.375 + j * 0.25));
    p.push(lathe([[0, 0.91], [0.14, 0.91], [0.14, 1.05], [0.1, 1.2], [0.0, 1.2]], C.blue, { segments: 8, x: 0.3, z: 0.1 }));
    return p;
  })(), { value: 2.0 });
  add('tunnel', (() => {
    const p = [];
    for (let i = 0; i < 6; i++) p.push(cyl(0.9, 0.9, 0.6, i % 2 ? C.yellow : C.blue, { x: -1.5 + i * 0.6, y: 0.9, rz: PI / 2, segments: 14 }));
    for (let i = 0; i <= 6; i++) p.push(cyl(0.94, 0.94, 0.05, C.white, { x: -1.8 + i * 0.6, y: 0.9, rz: PI / 2, segments: 14 }));
    p.push(cyl(0.62, 0.62, 3.7, '#15151a', { y: 0.9, rz: PI / 2, segments: 12 }));
    for (const x of [-1.2, 1.2]) for (const sg of [1, -1]) p.push(cone(0.1, 0.35, C.metal, { x, y: 0.15, z: sg * 0.6, segments: 5 }));
    return p;
  })(), { value: 2.5 });
  add('seesaw', (() => {
    const p = [];
    p.push(RB(3.4, 0.12, 0.7, C.wood, 0, 0.78, 0, { rz: 0.16, bevel: 0.04 }), RB(3.36, 0.03, 0.4, '#e0b070', 0, 0.86, 0, { rz: 0.16, bevel: 0.01 }));
    p.push(extrude([[-0.4, 0], [0.4, 0], [0.06, 0.75], [-0.06, 0.75]], 0.5, C.red, { y: 0, bevel: 0.03 }), cyl(0.15, 0.15, 0.78, C.blue, { y: 0.74, rx: PI / 2, segments: 10 }));
    for (const [x, y, s] of [[1.5, 0.98, 0.16], [-1.5, 0.66, 0.16]]) {
      p.push(RB(0.5, 0.06, 0.7, C.yellow, x, y, 0, { rz: s, bevel: 0.02 }));
      p.push(B(0.05, 0.4, 0.05, C.metal, x + 0.15, y + 0.22, 0.28), B(0.05, 0.4, 0.05, C.metal, x + 0.15, y + 0.22, -0.28), B(0.05, 0.05, 0.62, C.metal, x + 0.15, y + 0.42, 0));
    }
    p.push(RB(0.3, 0.08, 1.0, C.dark, 0, 0.04, 0, { bevel: 0.02 }));
    return p;
  })(), { value: 2.5 });
  add('umbrellaTable', (() => {
    const p = [];
    p.push(lathe([[0, 0], [0.5, 0], [0.5, 0.05], [0.08, 0.08], [0.06, 0.8], [0.55, 0.82], [0.55, 0.9], [0, 0.9]], C.white, { segments: 16 }));
    p.push(cyl(0.04, 0.04, 1.6, C.metal, { y: 1.7, segments: 8 }));
    const cols = [C.red, C.white, C.red, C.white];
    p.push(lathe([[0.02, 2.62], [0.4, 2.58], [0.9, 2.46], [1.4, 2.28], [1.5, 2.2], [1.36, 2.24], [1.0, 2.36], [0.5, 2.52], [0.0, 2.56]], C.red, { segments: 16, flat: false }));
    p.push(lathe([[0.02, 2.635], [0.4, 2.595]], C.white, { segments: 16 }), lathe([[0.42, 2.6], [0.75, 2.52]], C.white, { segments: 16 }), lathe([[1.1, 2.4], [1.45, 2.26]], C.white, { segments: 16 }));
    void cols;
    p.push(sphere(0.08, C.metal, { y: 2.66, segments: 6, rings: 4 }));
    for (const sg of [1, -1]) p.push(RB(0.5, 0.06, 0.5, C.dwood, sg * 1.1, 0.5, 0, { bevel: 0.02 }), B(0.06, 0.5, 0.06, C.dwood, sg * 1.1, 0.25, 0), B(0.06, 0.4, 0.5, C.dwood, sg * 1.34, 0.72, 0));
    return p;
  })(), { value: 2.0, radius: 1.4 });

  // ---------- large ----------
  const canopy = (blobs) => blobs.map(([x, y, z, r, c, sy = 0.9]) => sphere(r, c, { x, y, z, sy, segments: 10, rings: 7, surface: 'foliage', textureStrength: 0.7 }));
  const trunkGeo = (h, r, c = C.trunk) => [
    lathe([[r * 1.9, 0], [r * 1.45, 0.25], [r * 1.05, h * 0.3], [r * 0.9, h * 0.75], [r * 0.85, h]], c, { segments: 10 }),
    cyl(r * 0.28, r * 0.4, h * 0.45, C.trunkD, { x: r * 0.85, y: h * 0.85, z: 0, rz: -0.9, segments: 6 }),
    cyl(r * 0.24, r * 0.34, h * 0.4, C.trunkD, { x: -r * 0.7, y: h * 0.8, z: r * 0.2, rz: 0.8, segments: 6 }),
    ...[0, 2.1, 4.2].map((a) => cone(r * 0.4, r * 1.3, c, { x: Math.cos(a) * r * 1.5, y: 0.2, z: Math.sin(a) * r * 1.5, rz: Math.cos(a) * 0.9, rx: Math.sin(a) * -0.9, segments: 5 })),
  ];
  add('tree', [...trunkGeo(2.6, 0.32), ...canopy([[0, 3.7, 0, 2.0, C.leafA], [1.3, 3.2, 0.5, 1.4, C.leafB], [-1.1, 3.3, -0.9, 1.35, C.leafC], [0.2, 4.3, -0.4, 1.1, C.leafC], [-0.6, 3.1, 1.2, 1.1, C.leafB], [1.0, 3.9, -1.0, 1.0, C.leafA]])], { value: 3.5, radius: 2.1 });
  add('treeBig', [...trunkGeo(4, 0.46), ...canopy([[0, 5.6, 0, 3.0, C.leafB], [2.0, 4.8, 0.8, 2.0, C.leafA], [-1.8, 4.9, -1.3, 2.0, C.leafC], [0.4, 6.6, -0.6, 1.7, C.leafC], [-1.0, 4.6, 1.9, 1.6, C.leafA], [1.6, 5.7, -1.8, 1.6, C.leafB], [-1.9, 5.9, 1.0, 1.5, C.leafB]])], { value: 8, radius: 3.0 });
  add('treeBlossom', [...trunkGeo(2.6, 0.32, '#6a4030'), ...canopy([[0, 3.6, 0, 1.9, C.pink], [1.3, 3.2, 0.5, 1.3, '#f0a0c0'], [-1.1, 3.3, -0.9, 1.3, '#f8c0d8'], [0.2, 4.2, -0.4, 1.0, '#f8c0d8'], [-0.6, 3.0, 1.2, 1.0, '#e888b0']]),
    ...Array.from({ length: 9 }, (_, i) => Sl(0.07, i % 2 ? '#f8c0d8' : '#fff', { x: Math.cos(i * 2.3) * (0.4 + (i % 4) * 0.4), y: 0.06, z: Math.sin(i * 2.3) * (0.5 + (i % 3) * 0.5), sy: 0.4 }))], { value: 3.5, radius: 2.0 });
  add('pineTree', (() => {
    const p = [lathe([[0.55, 0], [0.4, 0.4], [0.3, 1.6]], C.trunk, { segments: 8 })];
    const tiers = [[2.1, 2.0, 1.1, C.dgreen], [1.75, 1.8, 2.5, C.green], [1.35, 1.6, 3.7, C.dgreen], [0.95, 1.4, 4.8, C.green], [0.55, 1.2, 5.7, C.dgreen]];
    for (const [r, h, y, c] of tiers) p.push(lathe([[r, y], [r * 0.82, y + h * 0.18], [r * 0.9, y + h * 0.2], [r * 0.4, y + h * 0.7], [0.0, y + h]], c, { segments: 12, flat: false, surface: 'foliage', textureStrength: 0.7 }));
    p.push(cone(0.1, 0.4, C.yellow, { y: 7.05, segments: 5 }));
    return p;
  })(), { value: 3.5, radius: 1.9 });
  add('dogWash', (() => {
    const p = [];
    p.push(RB(3.2, 0.9, 1.8, C.lblue, 0, 0.45, 0, { bevel: 0.15, segments: 2 }), B(2.7, 0.04, 1.3, C.water, 0, 0.88, 0));
    p.push(RB(3.3, 0.1, 0.24, C.white, 0, 0.94, 0.9, { bevel: 0.03 }), RB(3.3, 0.1, 0.24, C.white, 0, 0.94, -0.9, { bevel: 0.03 }), RB(0.24, 0.1, 1.8, C.white, 1.6, 0.94, 0, { bevel: 0.03 }), RB(0.24, 0.1, 1.8, C.white, -1.6, 0.94, 0, { bevel: 0.03 }));
    p.push(cyl(0.07, 0.07, 2.2, C.metal, { x: -1.4, y: 1.1, z: -0.75, segments: 8 }), cyl(0.06, 0.06, 1.0, C.metal, { x: -0.9, y: 2.2, z: -0.75, rz: PI / 2, segments: 8 }), lathe([[0.03, 2.14], [0.16, 2.06], [0.16, 1.98], [0.0, 1.96]], C.blue, { x: -0.4, z: -0.75, segments: 10 }));
    for (let i = 0; i < 4; i++) p.push(Sl(0.03, C.water, { x: -0.4 + (i % 2) * 0.05, y: 1.7 - i * 0.25, z: -0.75 }));
    for (const [x, y, z, r] of [[0.5, 1.1, 0.2, 0.28], [0.8, 1.0, -0.2, 0.22], [0.2, 1.0, -0.3, 0.2], [0.65, 1.28, 0.1, 0.16], [1.0, 1.0, 0.3, 0.14]]) p.push(S(r, C.foam, { x, y, z }));
    p.push(RB(1.6, 0.7, 0.08, C.yellow, 0.8, 2.6, -0.85, { bevel: 0.03 }), B(0.1, 2.2, 0.1, C.dark, 1.5, 1.1, -0.85), B(0.1, 2.2, 0.1, C.dark, 0.1, 1.1, -0.85));
    p.push(B(0.9, 0.08, 0.05, C.white, 0.8, 2.6, -0.8), Sl(0.09, C.white, { x: 0.35, y: 2.6, z: -0.8 }), Sl(0.09, C.white, { x: 1.25, y: 2.6, z: -0.8 }));
    // hose coil, shampoo bottle, towel
    p.push(torus(0.28, 0.05, C.green, { x: 1.9, y: 0.06, z: 0.6, rx: PI / 2, radial: 5, segments: 14 }), torus(0.2, 0.05, C.green, { x: 1.9, y: 0.16, z: 0.6, rx: PI / 2, radial: 5, segments: 12 }));
    p.push(lathe([[0.1, 0], [0.11, 0.3], [0.05, 0.36], [0.05, 0.44]], C.pink, { x: -1.3, y: 0.94, z: 0.55, segments: 8 }), RB(0.5, 0.06, 0.34, C.white, 1.1, 0.98, 0.55, { bevel: 0.02 }));
    return p;
  })(), { value: 9 });
  add('iceCreamCart', (() => {
    const p = [];
    p.push(RB(2.6, 0.9, 1.4, C.pink, 0, 0.85, 0, { bevel: 0.14, segments: 2 }), RB(2.7, 0.12, 1.5, C.white, 0, 1.36, 0, { bevel: 0.04 }));
    p.push(B(2.2, 0.5, 0.05, '#fff7e8', 0, 0.95, 0.72), B(2.2, 0.5, 0.05, '#fff7e8', 0, 0.95, -0.72));
    p.push(RB(1.6, 0.5, 0.08, C.lblue, 0.3, 1.64, 0.74, { bevel: 0.03, ry: 0 }));
    p.push(cyl(0.06, 0.06, 1.7, C.metal, { y: 2.2, x: 0, segments: 8 }));
    for (let i = 0; i < 6; i++) p.push(B(0.44, 0.06, 0.8, i % 2 ? C.white : C.red, -1.1 + i * 0.44, 1.98, 0.95, { rx: 0.35 }));
    p.push(lathe([[0.02, 3.35], [0.5, 3.22], [1.1, 3.02], [1.5, 2.86], [1.42, 2.84], [0.8, 2.95], [0.0, 3.2]], C.red, { segments: 16, flat: false }), lathe([[0.4, 3.24], [0.8, 3.12]], C.white, { segments: 16 }), lathe([[1.15, 2.99], [1.5, 2.86]], C.white, { segments: 16 }), sphere(0.1, C.yellow, { y: 3.42, segments: 6, rings: 4 }));
    for (const [x, z] of [[0.9, 0.78], [-0.9, 0.78], [0.9, -0.78], [-0.9, -0.78]]) {
      const pivot = [x, 0.4, z], o = { radius: 0.4, front: x > 0 };
      p.push(articulate(cyl(0.4, 0.4, 0.1, C.dark, { x, y: 0.4, z, rx: PI / 2, segments: 14, surface: 'rubber' }), 'wheel', pivot, o),
        articulate(cyl(0.22, 0.22, 0.12, C.metal, { x, y: 0.4, z, rx: PI / 2, segments: 10 }), 'wheel', pivot, o),
        articulate(B(0.44, 0.05, 0.14, '#d8dde2', x, 0.4, z, { surface: 'metal' }), 'wheel', pivot, o));
    }
    p.push(cone(0.14, 0.34, '#e8b060', { x: 0.4, y: 1.55, z: 0.3, rz: PI, segments: 8 }), S(0.15, C.pink, { x: 0.4, y: 1.8, z: 0.3 }), cone(0.14, 0.34, '#e8b060', { x: -0.1, y: 1.55, z: 0.3, rz: PI, segments: 8 }), S(0.15, C.lime, { x: -0.1, y: 1.8, z: 0.3 }), cone(0.14, 0.34, '#e8b060', { x: -0.6, y: 1.55, z: 0.3, rz: PI, segments: 8 }), S(0.15, '#6a3a1e', { x: -0.6, y: 1.8, z: 0.3 }));
    p.push(B(0.15, 0.06, 1.2, C.dark, -1.45, 1.05, 0), B(0.5, 0.06, 0.06, C.dark, -1.65, 1.05, 0.55), B(0.5, 0.06, 0.06, C.dark, -1.65, 1.05, -0.55), B(0.05, 0.25, 0.05, C.metal, -1.4, 0.9, 0.55));
    return p;
  })(), { value: 6, radius: 1.8 });
  add('gazebo', (() => {
    const p = [lathe([[0, 0], [2.7, 0], [2.7, 0.3], [2.5, 0.35], [0, 0.35]], C.lgray, { segments: 8, flat: false }), lathe([[2.55, 0.35], [2.6, 0.42], [2.5, 0.42]], C.gray, { segments: 8 })];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      const x = Math.cos(a) * 2.3, z = Math.sin(a) * 2.3;
      p.push(lathe([[0.16, 0.35], [0.11, 0.5], [0.09, 3.0], [0.13, 3.1]], C.white, { x, z, segments: 8, flat: false }), cyl(0.16, 0.16, 0.12, C.white, { x, y: 3.2, z, segments: 8 }));
      p.push(B(0.18, 0.12, 0.18, C.lgray, x, 0.5, z));
      const b = ((i + 0.5) / 8) * PI * 2;
      if (i !== 2) { // railing between posts (leave a gap at the entrance)
        const nx = Math.cos(((i + 1) / 8) * PI * 2) * 2.3, nz = Math.sin(((i + 1) / 8) * PI * 2) * 2.3;
        const mx = (x + nx) / 2, mz = (z + nz) / 2, ang = -Math.atan2(nz - z, nx - x);
        p.push(B(1.75, 0.07, 0.09, C.white, mx, 1.15, mz, { ry: ang }));
        for (let s = -3; s <= 3; s++) p.push(B(0.05, 0.75, 0.05, C.white, mx + Math.cos(-ang) * s * 0.23, 0.8, mz + Math.sin(-ang) * s * 0.23));
      }
      void b;
    }
    p.push(torus(2.3, 0.08, C.white, { y: 3.2, rx: PI / 2, radial: 5, segments: 8, flat: true }));
    p.push(lathe([[3.4, 3.15], [3.2, 3.3], [2.4, 3.9], [1.3, 4.6], [0.5, 5.0], [0.1, 5.2], [0.0, 5.3]], C.red, { segments: 16, flat: false }));
    for (let i = 0; i < 8; i++) p.push(cone(0.1, 0.5, C.white, { x: Math.cos((i + 0.5) / 8 * PI * 2) * 3.3, y: 3.1, z: Math.sin((i + 0.5) / 8 * PI * 2) * 3.3, rz: PI, segments: 5 }));
    p.push(sphere(0.2, C.yellow, { y: 5.4, segments: 8, rings: 6 }), cone(0.06, 0.4, C.yellow, { y: 5.75, segments: 5 }));
    p.push(RB(1.8, 0.1, 0.5, C.dwood, 0, 0.75, -1.5, { bevel: 0.03 }), RB(1.8, 0.4, 0.08, C.dwood, 0, 1.1, -1.75, { bevel: 0.03 }), B(0.08, 0.4, 0.4, C.dwood, 0.8, 0.55, -1.5), B(0.08, 0.4, 0.4, C.dwood, -0.8, 0.55, -1.5));
    return p;
  })(), { value: 12, radius: 3.0 });
  add('pondDuck', [
    sphere(0.4, C.yellow, { y: 0.35, sx: 1.3, sy: 0.85, segments: 10, rings: 7 }), sphere(0.24, C.yellow, { x: 0.38, y: 0.78, segments: 9, rings: 6 }),
    RB(0.24, 0.07, 0.2, C.orange, 0.62, 0.74, 0, { bevel: 0.025 }), Sl(0.03, C.black, { x: 0.52, y: 0.84, z: 0.11 }), Sl(0.03, C.black, { x: 0.52, y: 0.84, z: -0.11 }),
    sphere(0.22, '#f0c000', { x: -0.05, y: 0.42, z: 0.3, sx: 1.5, sy: 0.6, rx: 0.3, segments: 7, rings: 5 }), sphere(0.22, '#f0c000', { x: -0.05, y: 0.42, z: -0.3, sx: 1.5, sy: 0.6, rx: -0.3, segments: 7, rings: 5 }),
    cone(0.16, 0.34, C.yellow, { x: -0.55, y: 0.5, rz: PI / 2 + 0.6, segments: 7 }), lathe([[0.55, 0], [0.5, 0.03], [0.4, 0.04], [0, 0.02]], '#a8dcf4', { segments: 12, flat: false, sx: 1.2 }),
  ], { value: 0.6 });

  // ---------- cars (park entrance car park) ----------
  add('car', car({ body: '#d9382b', kind: 'sedan' }), { value: 3.5 });
  add('carBlue', car({ body: '#2f7fd6', kind: 'hatch' }), { value: 3.5 });
  add('carYellow', car({ body: '#ffc21a', kind: 'suv', roof: '#f0f0f0' }), { value: 3.8 });
  add('carGreen', car({ body: '#3fa34a', kind: 'sedan', roof: '#2f7d3a' }), { value: 3.5 });
  add('carWhite', car({ body: '#eef0f2', kind: 'hatch', roof: '#eef0f2' }), { value: 3.5 });

  add('parkSign', (() => {
    const p = [];
    p.push(RB(4.4, 1.6, 0.25, C.green, 0, 2.6, 0, { bevel: 0.1, segments: 2 }), RB(4.1, 1.3, 0.1, '#2f7d3a', 0, 2.6, 0.13, { bevel: 0.05 }));
    p.push(B(0.3, 2.2, 0.3, C.dwood, -1.9, 1.1, 0), B(0.3, 2.2, 0.3, C.dwood, 1.9, 1.1, 0));
    p.push(capsule(0.08, 0.7, C.bone, { x: 0, y: 2.6, z: 0.2, rz: PI / 2, segments: 8, caps: 3 }), ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => sphere(0.13, C.bone, { x: a * 0.42, y: 2.6 + b * 0.1, z: 0.2, segments: 8, rings: 6 })));
    p.push(B(1.4, 0.14, 0.06, C.white, 1.2, 2.9, 0.19), B(1.0, 0.14, 0.06, C.white, 1.4, 2.6, 0.19), B(1.2, 0.14, 0.06, C.white, -1.2, 2.9, 0.19), B(0.9, 0.14, 0.06, C.white, -1.3, 2.6, 0.19));
    p.push(sphere(0.2, C.yellow, { x: -1.9, y: 2.4, z: 0.0, segments: 7, rings: 5 }));
    p.push(...[-2.1, 2.1].map((x) => sphere(0.22, C.dwood, { x, y: 2.28, segments: 8, rings: 6 })));
    for (const x of [-1.4, 1.4]) p.push(RB(0.6, 0.35, 0.5, C.dark, x, 0.18, 0.5, { bevel: 0.06 }), S(0.3, C.leafA, { x, y: 0.5, z: 0.5 }), Sl(0.08, C.yellow, { x, y: 0.75, z: 0.55 }));
    return p;
  })(), { value: 5, radius: 2.4 });

  // ---------- huge ----------
  add('boneStatue', (() => {
    const p = [];
    p.push(RB(4.4, 0.8, 3.0, C.lgray, 0, 0.4, 0, { bevel: 0.15, segments: 2 }), RB(3.8, 0.5, 2.4, C.gray, 0, 1.05, 0, { bevel: 0.1 }), RB(3.2, 0.3, 1.9, C.lgray, 0, 1.4, 0, { bevel: 0.08 }));
    p.push(cyl(0.5, 0.7, 2.4, C.lgray, { y: 2.7, segments: 10 }), capsule(0.55, 4.6, C.bone, { y: 4.3, rz: -(PI / 2 - 0.5), segments: 14, caps: 5 }));
    const ex = Math.cos(0.5) * 2.65, ey = Math.sin(0.5) * 2.65;
    for (const z of [0.62, -0.62]) p.push(sphere(1.0, C.bone, { x: ex, y: 4.3 + ey, z, segments: 14, rings: 10 }), sphere(1.0, C.bone, { x: -ex, y: 4.3 - ey, z, segments: 14, rings: 10 }));
    p.push(RB(2.4, 0.5, 0.1, C.yellow, 0, 0.55, 1.52, { bevel: 0.04 }), B(1.6, 0.14, 0.06, C.dark, 0, 0.55, 1.58), Sl(0.18, C.yellow, { x: 1.4, y: 0.55, z: 1.52 }), Sl(0.18, C.yellow, { x: -1.4, y: 0.55, z: 1.52 }));
    for (const sx of [-1.7, 1.7]) p.push(S(0.5, C.leafA, { x: sx, y: 1.75, z: 1.1, segments: 8, rings: 6 }), Sl(0.12, C.pink, { x: sx + 0.2, y: 2.15, z: 1.2 }));
    return p;
  })(), { value: 26, radius: 3.0 });
  add('giantDoghouse', (() => {
    const p = [];
    p.push(RB(11, 6.5, 9, C.red, 0, 3.25, 0, { bevel: 0.35, segments: 2 }));
    for (let i = 0; i < 6; i++) p.push(B(11.05, 0.12, 0.2, '#b02a20', 0, 0.9 + i * 1.0, 4.5), B(0.2, 0.12, 9.05, '#b02a20', 5.5, 0.9 + i * 1.0, 0)); // plank lines
    for (const sg of [1, -1]) {
      p.push(RB(7.4, 0.7, 10.6, C.roof, sg * 3.0, 8.6, 0, { rz: -sg * 0.6, bevel: 0.15 }));
      for (let i = 0; i < 6; i++) { const t = 0.08 + i * 0.15; p.push(B(0.4, 0.14, 10.65, i % 2 ? '#a03a26' : '#d8563a', sg * 6.0 * (1 - t), 6.5 + 4.1 * t + 0.4, 0, { rz: -sg * 0.6 })); }
    }
    p.push(RB(0.6, 0.6, 10.6, '#8a2c1e', 0, 10.75, 0, { bevel: 0.15 }));
    p.push(extrude([[-5.5, 0], [5.5, 0], [0, 4.1]], 0.4, C.white, { y: 6.5, z: 4.55 }), extrude([[-5.5, 0], [5.5, 0], [0, 4.1]], 0.4, C.white, { y: 6.5, z: -4.55 }));
    // arched door
    const arch = []; for (let i = 0; i <= 14; i++) { const a = PI - (i / 14) * PI; arch.push([Math.cos(a) * 1.9, 2.6 + Math.sin(a) * 1.9]); } arch.unshift([-1.9, 0]); arch.push([1.9, 0]);
    p.push(extrude(arch, 0.3, C.black, { z: 4.6 }));
    const archF = []; for (let i = 0; i <= 14; i++) { const a = PI - (i / 14) * PI; archF.push([Math.cos(a) * 2.3, 2.7 + Math.sin(a) * 2.3]); } archF.unshift([-2.3, 0]); archF.push([2.3, 0]);
    p.push(extrude(archF, 0.24, C.white, { z: 4.5 }));
    p.push(RB(3.4, 1.0, 0.3, C.white, 0, 6.3, 4.7, { bevel: 0.1 }), capsule(0.2, 1.4, C.bone, { x: 0, y: 6.3, z: 4.9, rz: PI / 2, segments: 10, caps: 3 }), ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => sphere(0.34, C.bone, { x: a * 0.95, y: 6.3 + b * 0.22, z: 4.9, segments: 8, rings: 6 })));
    // windows with frames + flower boxes
    for (const x of [-3.9, 3.9]) {
      p.push(RB(2.6, 2.6, 0.14, C.white, x, 4.3, 4.57, { bevel: 0.05 }), ...recessedWindow(2.2, 2.2, 0.14, { x, y: 4.3, z: 4.78, frame: 0.16, frameColor: C.white, glassColor: '#7cc4f0', mullion: true }));
      p.push(RB(2.4, 0.4, 0.6, C.dwood, x, 2.85, 4.85, { bevel: 0.06 }));
      for (let i = 0; i < 4; i++) p.push(S(0.28, [C.pink, C.yellow, C.red, C.pink][i], { x: x - 0.9 + i * 0.6, y: 3.2, z: 4.85 }), S(0.24, C.leafA, { x: x - 0.9 + i * 0.6, y: 3.05, z: 5.0 }));
    }
    p.push(RB(4.5, 0.4, 3, C.tan, 0, 0.2, 6.1, { bevel: 0.1 }), RB(4.2, 0.3, 2.6, '#c8905a', 0, 0.5, 6.1, { bevel: 0.1 }));
    // giant chew ring + ball, food bowl
    p.push(torus(0.9, 0.32, C.blue, { x: 6.6, y: 1.0, z: 3.8, rx: PI / 2 + 0.6, radial: 8, segments: 18 }), torus(0.9, 0.12, C.white, { x: 6.6, y: 1.0, z: 3.8, rx: PI / 2 + 0.6, radial: 6, segments: 18 }));
    p.push(sphere(0.8, C.lime, { x: 6.5, y: 0.8, z: 1.9, segments: 14, rings: 10 }), torus(0.7, 0.05, C.white, { x: 6.5, y: 0.8, z: 1.9, rx: 0.9, radial: 4, segments: 14 }));
    p.push(lathe([[0, 0], [1.0, 0], [1.6, 0.9], [1.5, 1.0], [1.3, 0.9], [0.9, 0.3], [0, 0.25]], C.blue, { x: -6.4, z: 3.6, segments: 16 }), ...Array.from({ length: 12 }, (_, i) => S(0.28, ['#8a5a2a', '#a86c30', '#6e4420'][i % 3], { x: -6.4 + Math.cos(i * 2.4) * 0.9 * Math.sqrt(i / 12), y: 0.4 + 0.2 * (1 - i / 12), z: 3.6 + Math.sin(i * 2.4) * 0.9 * Math.sqrt(i / 12), segments: 6, rings: 4 })));
    p.push(RB(0.9, 1.9, 0.9, '#8a2c1e', 3.6, 9.5, -1.5, { bevel: 0.15 })); // chimney
    p.push(RB(1.1, 0.2, 1.1, '#5a1a10', 3.6, 10.5, -1.5, { bevel: 0.05 }));
    return p;
  })(), { value: 75, radius: 7.0 });

  // Dogs run around energetically, puppies zip, owners stroll, ducks paddle on the pond.
  const walk = (speed, range, names) => names.forEach((n) => { P[n].move = { type: 'walk', speed, range }; });
  walk(5.0, 12, ['puppy', 'puppyBlack']);
  walk(4.2, 20, ['corgi', 'dachshund', 'poodle', 'poodleWhite']);
  walk(4.8, 24, ['labYellow', 'labChoc', 'husky', 'dalmatian']);
  walk(3.6, 22, ['greatDane']);
  walk(1.5, 14, ['person', 'personRed', 'personGreen', 'personDress', 'personHat']);
  walk(0.7, 4.5, ['pondDuck']);
  return P;
}
