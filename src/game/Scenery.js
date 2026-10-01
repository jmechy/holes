// Non-swallowable scenery around the playable square: gradient sky dome (+ stars), drifting clouds,
// backdrop terrain ring (hills / mountains / city / ocean / desert / space / forest) and the map-edge fence.
// Everything here is decorative: no grid entries, no shadows cast except the edge, never clamps holes (Hole.clamp does).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, cone, sphere, extrude } from '../objects/build.js';
import { makeBackdropMaterial, makeTerrainMaterial, holeUniforms, MAX_HOLES } from './Ground.js';

const SIDES = ['north', 'south', 'east', 'west'];
export const BACKDROP_TYPES = ['hills', 'mountains', 'city', 'ocean', 'desert', 'space', 'forest', 'voxel'];
const EDGE_BY_STYLE = { grass: 'hedge', dirt: 'fence', sand: 'rocks', asphalt: 'barrier', concrete: 'barrier', regolith: 'rocks', voxel: 'blocks' };

/** 1 while any hole overhangs the map edge (Game sets it every frame); gates the backdrop hole-discard below. */
export const edgeHoleUniform = { value: 0 };

/**
 * Backdrop scenery (terrain, props, buildings, fence, skirt) is cut away inside hole circles so a hole that overhangs the
 * map edge shows a clean pit instead of terrain drawn across it. Reuses Ground's uHoles / uHoleCount uniforms; the loop
 * is skipped by a uniform branch unless a hole is actually over the edge (`always` = test every frame, for decal-like
 * props that sit inside the playable area). `ground` = material already built by
 * Ground.js (has vHolePos + the hole uniforms declared; only the discard is added).
 */
const ALWAYS_ON = { value: 1 };
export function applyHoleDiscard(mat, ground = false, always = false) {
  if (mat.userData.holeDiscard) return mat;
  mat.userData.holeDiscard = true;
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey?.bind(mat) ?? (() => '');
  const pos = ground ? 'vHolePos' : 'vHW';
  const loop = `void main() {
  if (uEdgeHole > 0.5) {
    for (int i = 0; i < ${MAX_HOLES}; i++) {
      if (i >= uHoleCount) break;
      vec2 hd = ${pos}.xz - uHoles[i].xy;
      if (dot(hd, hd) < uHoles[i].z * uHoles[i].z) discard;
    }
  }`;
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    shader.uniforms.uEdgeHole = always ? ALWAYS_ON : edgeHoleUniform;
    if (!ground) {
      shader.uniforms.uHoles = holeUniforms.uHoles;
      shader.uniforms.uHoleCount = holeUniforms.uHoleCount;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vHW;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
  vec4 hw_ = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  hw_ = instanceMatrix * hw_;
  #endif
  vHW = (modelMatrix * hw_).xyz;`);
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uEdgeHole;
${ground ? '' : `varying vec3 vHW; uniform vec3 uHoles[${MAX_HOLES}]; uniform int uHoleCount;`}`)
      .replace('void main() {', loop);
  };
  mat.customProgramCacheKey = () => `${prevKey()}-hd${ground ? 'g' : 'w'}${always ? 'a' : ''}`;
  mat.needsUpdate = true;
  return mat;
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeNoise(seed) {
  const h = (x, y) => {
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const vn = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const fbm = (x, y, oct = 4) => {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += a * vn(x * f, y * f); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  };
  return { vn, fbm };
}

const col = (c) => new THREE.Color(c);
const mix = (a, b, t) => a.clone().lerp(b, t);
const hex = (c) => '#' + c.getHexString();
/** Keeps foliage readable: pale or washed-out biome colours still give mid-green leaves (lightness capped, saturation floored). */
function foliage(c, maxL) {
  const h = {};
  c.getHSL(h);
  return new THREE.Color().setHSL(h.h, Math.max(h.s, 0.3), Math.min(h.l, maxL));
}
/** World [x, z] at u in [-1, 1] along a side and v beyond the map edge (same param as ringGeometry). */
function sidePoint(side, S, u, v) {
  const t = S + v;
  return side === 'north' ? [u * t, -t] : side === 'south' ? [u * t, t] : side === 'east' ? [t, u * t] : [-t, u * t];
}

/** { top, horizon } THREE.Colors for the sky; horizon also colours the fog. */
export function skyColors(map) {
  const horizon = col(map.sky?.horizon ?? map.fogColor ?? map.skyColor);
  let top;
  if (map.sky?.top) top = col(map.sky.top);
  else {
    const hsl = {};
    col(map.skyColor).getHSL(hsl);
    top = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.15 + 0.04), hsl.l * 0.74);
  }
  return { top, horizon };
}

// ---- backdrop description ----------------------------------------------------

const TYPE_DEFAULTS = {
  hills: ['#6cbf55', '#4e9a4a'],
  mountains: ['#9b9088', '#f5f8ff'],
  city: ['#9aa3b5', '#5a5e66'],
  ocean: ['#2f9fe0', '#e8d9a6'],
  desert: ['#e6c88a', '#c4763e'],
  space: ['#8f8f99', '#1c1c28'],
  forest: ['#4f9a45', '#2f7a3a'],
  voxel: ['#5fae3f', '#7a5a3a'], // grass top, dirt sides
};

/** Normalises map.backdrop into { north, south, east, west } -> { type, color, color2 } (always all four). */
export function resolveBackdrop(map) {
  let list = map.backdrop;
  if (!list) {
    const g = col(map.groundColor);
    list = map.stars
      ? [{ type: 'space' }]
      : [{ type: 'hills', color: '#' + g.clone().multiplyScalar(0.9).getHexString(), color2: '#' + g.clone().multiplyScalar(0.65).lerp(col(map.fogColor ?? '#9ab'), 0.25).getHexString() }];
  }
  if (!Array.isArray(list)) list = [list];
  const out = {};
  for (const e of list) if (e && (!e.side || e.side === 'all')) for (const s of SIDES) out[s] = e;
  for (const e of list) if (e && SIDES.includes(e.side)) out[e.side] = e;
  for (const e of list) if (e?.oceanSide && SIDES.includes(e.oceanSide)) out[e.oceanSide] = { type: 'ocean', color: e.oceanColor, color2: e.sandColor };
  const res = {};
  for (const s of SIDES) {
    const e = out[s] || { type: 'hills' };
    const type = BACKDROP_TYPES.includes(e.type) ? e.type : 'hills';
    const d = TYPE_DEFAULTS[type];
    res[s] = { type, color: col(e.color ?? d[0]), color2: col(e.color2 ?? d[1]), tall: e.tall ?? 1 };
  }
  return res;
}

// ---- terrain ring ------------------------------------------------------------

const OCEAN_LEVEL = -0.35;
const oceanProfile = (v) => 0.32 - 0.9 * smooth(0, 20, v) - 1.8 * smooth(14, 90, v);
// Voxel terrain works in whole blocks: heights snap to VOXEL_STEP.
const VOXEL_STEP = 3;
function voxelRaw(N, x, z, v, tall) {
  const { fbm } = N;
  const n = fbm(x * 0.016 + 7, z * 0.016 - 3), m = fbm(x * 0.045, z * 0.045);
  return (Math.pow(n, 1.6) * (6 + 30 * smooth(10, 150, v)) + m * 3) * tall * smooth(3, 16, v);
}
const voxelLake = (N, x, z, v) => v > 14 && N.fbm(x * 0.028 + 40, z * 0.028 + 9) > 0.64;

function heightFn(type, N, S) {
  const { fbm } = N;
  switch (type) {
    case 'hills':
      // Three layers: gentle near rolls, a ridged mid band, then tall pale far hills.
      return (x, z, v) => {
        const near = (fbm(x * 0.03, z * 0.03) * 0.8 + 0.2 * fbm(x * 0.09, z * 0.09)) * 7;
        const r = 1 - Math.abs(2 * fbm(x * 0.011 + 5, z * 0.011, 3) - 1);
        const mid = r * r * 26 * smooth(28, 70, v);
        const far = (0.35 + fbm(x * 0.007 + 11, z * 0.007 + 3)) * 48 * smooth(95, 170, v);
        return (near + mid + far) * smooth(1.5, 8, v);
      };
    case 'forest':
      return (x, z, v) => (fbm(x * 0.025, z * 0.025) * 0.8 + 0.2 * fbm(x * 0.08, z * 0.08)) * (5 + 16 * smooth(8, 140, v)) * smooth(1.5, 10, v);
    case 'mountains':
      return (x, z, v) => {
        const r = 1 - Math.abs(2 * fbm(x * 0.012, z * 0.012, 5) - 1);
        return (r * r * (14 + 100 * smooth(8, 110, v)) + fbm(x * 0.05, z * 0.05) * 6 * smooth(2, 20, v)) * smooth(2, 26, v);
      };
    case 'desert': {
      const ca = Math.cos(0.55), sa = Math.sin(0.55);
      return (x, z, v) => {
        // Dunes: long windward slope, steep lee face, wavy crests.
        const ph = ((x * ca + z * sa) + fbm(x * 0.018, z * 0.018) * 30) / 26;
        const f = ph - Math.floor(ph);
        const prof = f < 0.72 ? smooth(0, 0.72, f) : 1 - smooth(0.72, 1, f);
        const amp = (2.2 + 9 * smooth(8, 110, v)) * (0.55 + 0.9 * fbm(x * 0.012 + 4, z * 0.012));
        const mesa = smooth(0.68, 0.72, fbm(x * 0.008 + 9, z * 0.008 + 4)) * 20 * smooth(40, 100, v);
        return (prof * amp + fbm(x * 0.05, z * 0.05) * 1.2 + mesa) * smooth(1.5, 9, v);
      };
    }
    case 'space':
      return (x, z, v) => fbm(x * 0.03, z * 0.03) * 4 * smooth(1.5, 8, v) - 55 * smooth(14, 30, v);
    case 'ocean':
      // A sloping beach that dips below the water plane around v ~ 13 (wobbling with noise).
      return (x, z, v) => oceanProfile(v + (fbm(x * 0.04 + 2, z * 0.04) - 0.5) * 6) + (fbm(x * 0.15, z * 0.15) - 0.5) * 0.12 * smooth(0, 6, v);
    default:
      return () => 0; // city / voxel (voxel is built from columns)
  }
}

/** Trapezoid strip beyond one map side, tiling the ring exactly along the corner diagonals. */
function ringGeometry(side, S, B, nu, nv, hFn, colorFn) {
  const pos = [], colr = [], idx = [];
  const c = new THREE.Color();
  for (let j = 0; j <= nv; j++) {
    const v = B * (j / nv) * (j / nv);
    const t = S + v;
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1;
      let x, z;
      if (side === 'north') { x = u * t; z = -t; }
      else if (side === 'south') { x = u * t; z = t; }
      else if (side === 'east') { x = t; z = u * t; }
      else { x = -t; z = u * t; }
      const y = hFn(x, z, v);
      pos.push(x, y, z);
      if (colorFn) { colorFn(c, x, z, v, y); colr.push(c.r, c.g, c.b); }
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, d = a + nu + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (colorFn) g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) { // wrong winding for this side: flip
    for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

function terrainColorFn(type, e, N, fogColor, B, hFn) {
  const { fbm } = N;
  const grass = new THREE.Color(), tmp = new THREE.Color();
  return (c, x, z, v, y) => {
    const n = fbm(x * 0.05 + 3, z * 0.05 - 2);
    const far = smooth(90, B, v) * 0.5;
    switch (type) {
      case 'hills':
      case 'forest': {
        const t = Math.min(1, y / 22) * 0.7 + n * 0.3;
        c.copy(e.color).lerp(e.color2, t);
        if (type === 'forest') c.multiplyScalar(0.8 + 0.3 * n);
        break;
      }
      case 'mountains': {
        const snow = smooth(26 + n * 10, 40 + n * 10, y);
        const low = smooth(5, 26, y);
        grass.copy(e.color).multiplyScalar(0.75).lerp(tmp.set('#5f9a4e'), 0.5);
        c.copy(grass).lerp(e.color, low).multiplyScalar(0.85 + 0.3 * n);
        // Steep faces show bare rock (slope from two finite differences of the height field).
        const slope = (Math.abs(hFn(x + 3, z, v) - y) + Math.abs(hFn(x, z + 3, v) - y)) / 3;
        c.lerp(tmp.copy(e.color).multiplyScalar(0.62 + 0.35 * n), smooth(0.3, 1.0, slope) * 0.85).lerp(e.color2, snow);
        break;
      }
      case 'desert': {
        const mesa = smooth(8, 18, y);
        c.copy(e.color).multiplyScalar(0.82 + 0.3 * n + Math.min(0.12, y * 0.012)).lerp(e.color2, mesa * 0.9);
        break;
      }
      case 'space': {
        const deep = smooth(0, -50, y);
        c.copy(e.color).multiplyScalar(0.75 + 0.35 * n).lerp(e.color2, deep);
        break;
      }
      case 'ocean': {
        c.copy(e.color2).multiplyScalar(0.92 + 0.12 * n);
        c.multiplyScalar(1 - 0.22 * smooth(0.05, -0.3, y)); // wet sand near the waterline
        c.lerp(tmp.copy(e.color).multiplyScalar(0.5), smooth(-0.3, -1.2, y));
        break;
      }
      default:
        c.copy(e.color2);
    }
    if (type !== 'space') c.lerp(fogColor, far);
  };
}

// ---- windows shader for city skyline ------------------------------------------

function windowMaterial(high) {
  const m = high ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }) : new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * normal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN;
float hh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  {
    float side = 1.0 - abs(vWN.y);
    float u = dot(vWP.xz, vec2(abs(vWN.z), abs(vWN.x)));
    vec2 w = vec2(u * 0.4, vWP.y * 0.3);
    vec2 cell = floor(w), f = fract(w);
    float pane = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.78);
    float lit = step(0.62, hh(cell + floor(vWP.xz * 0.05)));
    vec3 wc = mix(vec3(0.13, 0.19, 0.27), vec3(1.0, 0.86, 0.5), lit);
    diffuseColor.rgb = mix(diffuseColor.rgb, wc, pane * side * 0.8 * step(2.0, vWP.y));
  }`);
  };
  m.customProgramCacheKey = () => 'holes-city-windows';
  return applyHoleDiscard(m);
}

// ---- scatter props (instanced: one draw call per kind) -----------------------------

const merged = (parts) => { const g = mergeGeometries(parts, false); parts.forEach((p) => p.dispose()); return g; };
const PROP_GEOMETRY = {
  pine: (leaf, trunk) => merged([
    cyl(0.25, 0.32, 1.2, trunk, { y: 0.6, segments: 6 }),
    cone(1.5, 2.2, leaf, { y: 2.2, segments: 8 }),
    cone(1.15, 1.9, leaf, { y: 3.4, segments: 8 }),
    cone(0.75, 1.6, leaf, { y: 4.5, segments: 8 }),
  ]),
  round: (leaf, trunk) => {
    const light = hex(col(leaf).multiplyScalar(1.18));
    return merged([
      cyl(0.22, 0.3, 2.0, trunk, { y: 1.0, segments: 6 }),
      sphere(1.55, leaf, { y: 3.0, sy: 0.95, segments: 7, rings: 5 }),
      sphere(1.05, light, { x: 0.8, y: 3.9, z: 0.3, segments: 6, rings: 4 }),
      sphere(0.95, leaf, { x: -0.8, y: 3.6, z: -0.4, segments: 6, rings: 4 }),
    ]);
  },
  bush: (leaf) => merged([
    sphere(0.75, leaf, { x: -0.35, y: 0.42, sy: 0.75, segments: 6, rings: 4 }),
    sphere(0.65, hex(col(leaf).multiplyScalar(1.15)), { x: 0.45, y: 0.4, z: 0.15, sy: 0.75, segments: 6, rings: 4 }),
    sphere(0.5, leaf, { x: 0.05, y: 0.4, z: -0.5, sy: 0.75, segments: 6, rings: 4 }),
  ]),
  rock: (color) => merged([
    sphere(1.0, color, { y: 0.45, sy: 0.7, sx: 1.15, ry: 0.4, segments: 6, rings: 4 }),
    sphere(0.6, hex(col(color).multiplyScalar(1.12)), { x: 0.95, y: 0.28, z: 0.3, sy: 0.75, segments: 5, rings: 4 }),
    sphere(0.45, hex(col(color).multiplyScalar(0.9)), { x: -0.7, y: 0.22, z: -0.55, sy: 0.8, segments: 5, rings: 4 }),
  ]),
  cactus: (green) => merged([
    cyl(0.32, 0.36, 3.4, green, { y: 1.7, segments: 7 }),
    sphere(0.32, green, { y: 3.4, segments: 7, rings: 4 }),
    cyl(0.2, 0.2, 1.0, green, { x: 0.55, y: 1.7, rz: Math.PI / 2, segments: 6 }),
    cyl(0.2, 0.2, 1.1, green, { x: 0.9, y: 2.25, segments: 6 }),
    cyl(0.18, 0.18, 0.8, green, { x: -0.5, y: 1.3, rz: Math.PI / 2, segments: 6 }),
    cyl(0.18, 0.18, 0.9, green, { x: -0.85, y: 1.75, segments: 6 }),
  ]),
  blocktree: (leaf, trunk) => merged([
    box(1.5, 6, 1.5, trunk, { y: 3 }),
    box(4.5, 3, 4.5, leaf, { y: 7.5 }),
    box(4.5, 1.5, 4.5, hex(col(leaf).multiplyScalar(0.9)), { y: 5.25 }),
    box(3, 1.5, 3, hex(col(leaf).multiplyScalar(1.12)), { y: 9.75 }),
  ]),
};

// ---- edge (replaces the plain wall) ---------------------------------------------

function edgeGeometry(kind, S, rand, groundColor) {
  const parts = [];
  const pitch = 3;
  const n = Math.ceil((S * 2 + 4) / pitch);
  const m = new THREE.Matrix4();
  const pieceFor = (i) => {
    const ps = [];
    const jitter = () => 0.9 + rand() * 0.2;
    switch (kind) {
      case 'hedge': {
        const g1 = ['#3d8f3a', '#46a043', '#377f34'][i % 3];
        ps.push(box(pitch + 0.05, 1.3, 1.5, '#2f7a30', { y: 0.65 }));
        ps.push(sphere(0.95 * jitter(), g1, { y: 1.35, x: -0.6, sy: 0.8, segments: 8, rings: 5, flat: false }));
        ps.push(sphere(0.9 * jitter(), ['#4fae4a', '#43a03f'][(i >> 1) % 2], { y: 1.4, x: 0.75, sy: 0.8, segments: 8, rings: 5, flat: false }));
        if (i % 7 === 0) ps.push(sphere(0.18, ['#ff6fb5', '#ffd23f', '#ffffff'][(i / 7) % 3 | 0], { y: 1.9, x: 0.2, z: 0.5, segments: 6, rings: 4 }));
        break;
      }
      case 'fence': {
        ps.push(box(0.32, 1.5, 0.32, '#8a5a2f', { x: -pitch / 2 + 0.16, y: 0.75 }));
        ps.push(box(pitch, 0.18, 0.14, '#b07a44', { y: 1.15 }));
        ps.push(box(pitch, 0.18, 0.14, '#b07a44', { y: 0.6 }));
        break;
      }
      case 'barrier': {
        const c = i % 2 ? '#d9d9d6' : '#c5c5c2';
        ps.push(extrude([[-0.75, 0], [0.75, 0], [0.5, 0.5], [0.28, 1.25], [-0.28, 1.25], [-0.5, 0.5]], pitch - 0.08, c, { ry: Math.PI / 2 }));
        if (i % 2) ps.push(box(pitch - 0.08, 0.16, 0.62, '#f2c230', { y: 1.05 }));
        break;
      }
      case 'rocks': {
        const base = col(groundColor).multiplyScalar(0.8);
        for (let k = 0; k < 2; k++) {
          const r = (0.9 + rand() * 0.7);
          const cc = base.clone().multiplyScalar(0.75 + rand() * 0.45).lerp(col('#8d8d92'), 0.35);
          ps.push(sphere(r, '#' + cc.getHexString(), { x: -pitch / 4 + k * pitch / 2 + (rand() - 0.5) * 0.5, y: r * 0.45, z: (rand() - 0.5) * 0.5, sy: 0.62, sz: 1.1, ry: rand() * 3, segments: 7, rings: 5 }));
        }
        break;
      }
      case 'blocks': {
        for (let k = 0; k < 2; k++) {
          const hgt = 1 + Math.floor(rand() * 2);
          ps.push(box(pitch / 2 - 0.02, hgt * 1.0, 1.5, ['#8b8b8b', '#7a7a7a', '#9a9a9a', '#6f8f5a'][(i + k * 3) % 4], { x: -pitch / 4 + k * pitch / 2, y: hgt * 0.5 }));
        }
        break;
      }
      default: { // curb
        ps.push(box(pitch, 0.8, 1.4, i % 2 ? '#f0f0f0' : '#d94b4b', { y: 0.4 }));
      }
    }
    return ps;
  };
  // Four sides; pieces are built along +X centred at the origin then rotated/translated into place.
  for (let side = 0; side < 4; side++) {
    const rot = side < 2 ? 0 : Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const along = -S - 2 + (i + 0.5) * pitch;
      const off = S + 0.8;
      let x, z;
      if (side === 0) { x = along; z = -off; }
      else if (side === 1) { x = along; z = off; }
      else if (side === 2) { x = off; z = along; }
      else { x = -off; z = along; }
      m.makeRotationY(rot).setPosition(x, 0, z);
      for (const p of pieceFor(i)) { p.applyMatrix4(m); parts.push(p); }
    }
  }
  const g = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return g;
}

// ---- main ---------------------------------------------------------------------------

export class Scenery {
  /** opts: { high, clouds: bool } */
  constructor(map, { high = true } = {}) {
    this.map = map;
    this.high = high;
    this.group = new THREE.Group();
    const S = map.size;
    const rand = mulberry32(hashSeed(map.id + ':scenery'));
    /** map.backdropClear: [{x0,z0,x1,z1}] world rectangles where city backdrop buildings are not generated. */
    this.clear = map.backdropClear || [];
    const N = makeNoise(hashSeed(map.id + ':noise'));
    const { top, horizon } = skyColors(map);
    this.horizon = horizon;
    this.top = top;

    this.buildSky(top, horizon, map.stars, rand);
    const bd = resolveBackdrop(map);
    this.skirtColor = this.buildBackdrop(bd, S, rand, N, horizon);
    this.buildEdge(map, S, rand);
    this.buildWall(bd, S);
    const wantClouds = map.clouds ?? !map.stars;
    if (wantClouds) this.buildClouds(S, rand);
  }

  buildSky(top, horizon, stars, rand) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTop: { value: top }, uHorizon: { value: horizon }, uSun: { value: new THREE.Vector3(40, 60, 25).normalize() } },
      vertexShader: 'varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; varying vec3 vD;
        void main() {
          float h = clamp(vD.y, 0.0, 1.0);
          vec3 c = mix(uHorizon, uTop, pow(h, 0.55));
          c += vec3(1.0, 0.95, 0.8) * pow(max(dot(normalize(vD), uSun), 0.0), 48.0) * 0.35;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, // drawn last: early-z skips every covered pixel
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), mat);
    this.dome.renderOrder = 1000;
    this.dome.frustumCulled = false;
    this.group.add(this.dome);
    if (stars) {
      const n = this.high ? 900 : 350;
      const pos = new Float32Array(n * 3), cs = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const y = Math.pow(rand(), 0.7) * 0.98 + 0.02, a = rand() * Math.PI * 2, r = Math.sqrt(1 - y * y);
        pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
        const b = 0.55 + rand() * 0.45, tint = rand();
        cs.set([b * (0.85 + tint * 0.15), b * 0.92, b * (1.0 - tint * 0.2)], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(cs, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: this.high ? 2.4 : 2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, depthTest: true, transparent: true }));
      this.stars.renderOrder = 1001;
      this.stars.frustumCulled = false;
      this.group.add(this.stars);
    }
  }

  buildBackdrop(bd, S, rand, N, horizon) {
    const B = Math.max(220, S * 2.2);
    const high = this.high;
    const mats = {};
    const STYLE_OF = { hills: 'grass', forest: 'grass', mountains: 'regolith', desert: 'sand', space: 'regolith', ocean: 'sand', voxel: 'voxel' };
    const terrainMat = (type) => mats[type] || (mats[type] = applyHoleDiscard(makeTerrainMaterial(STYLE_OF[type]), true));
    let skirt = null;
    const nu = high ? 72 : 36, nv = high ? 30 : 16;
    const skirtOf = { hills: 0.85, forest: 0.7, mountains: 0.7, desert: 0.85, space: 0.05, ocean: 0.85, city: 1, voxel: 0.8 };
    const cityBoxes = [], cityDetail = [];
    this.props = new Map();
    let hasSpace = false;
    const voxelSides = [];
    for (const side of SIDES) {
      const e = bd[side];
      const type = e.type;
      const hFn = heightFn(type, N, S);
      const depth = type === 'space' ? 60 : B;
      if (type === 'city') {
        const g = ringGeometry(side, S, depth, 16, 6, () => 0, null);
        const m = applyHoleDiscard(makeBackdropMaterial(e.color2, 'concrete'), true);
        const mesh = new THREE.Mesh(g, m);
        mesh.position.y = -0.02;
        this.group.add(mesh);
        this.addCity(side, S, B, e, rand, cityBoxes, cityDetail);
      } else if (type === 'voxel') {
        voxelSides.push(side);
      } else {
        const g = ringGeometry(side, S, depth, nu, nv, hFn, terrainColorFn(type, e, N, horizon, depth, hFn));
        this.group.add(new THREE.Mesh(g, terrainMat(type)));
        if (type === 'ocean') {
          const wg = ringGeometry(side, S, B, 16, 10, () => OCEAN_LEVEL, null);
          const wm = applyHoleDiscard(makeBackdropMaterial(e.color, 'water'), true);
          this.group.add(new THREE.Mesh(wg, wm));
          this.buildShore(side, S, hFn, e);
        }
        this.scatterProps(side, S, B, type, e, hFn, rand);
      }
      if (type === 'space') hasSpace = true;
      if (side === 'north') skirt = mix(type === 'city' ? e.color2 : e.color, horizon, type === 'ocean' ? 0 : 0.3).multiplyScalar(skirtOf[type]);
    }
    if (voxelSides.length) this.buildVoxel(voxelSides, bd, S, B, N, horizon, rand);
    if (cityBoxes.length) {
      const g = mergeGeometries(cityBoxes, false);
      cityBoxes.forEach((p) => p.dispose());
      this.group.add(new THREE.Mesh(g, windowMaterial(high)));
    }
    if (cityDetail.length) {
      const g = mergeGeometries(cityDetail, false);
      cityDetail.forEach((p) => p.dispose());
      const m = high ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }) : new THREE.MeshLambertMaterial({ vertexColors: true });
      this.group.add(new THREE.Mesh(g, applyHoleDiscard(m)));
    }
    this.flushProps();
    this.buildTunnels(S);
    if (hasSpace) this.buildSpace(S, rand);
    return hasSpace ? null : skirt; // no skirt over the star plane
  }

  /** map.tunnels: [{ side: 'east'|'west', z0, z1, length, height }] concrete tunnel sheds just outside the map edge,
   *  with dark portal mouths facing the map, so a rail line leaving the map disappears from view. */
  buildTunnels(S) {
    const list = this.map.tunnels;
    if (!list || !list.length) return;
    const parts = [];
    for (const t of list) {
      const sg = t.side === 'west' ? -1 : 1;
      const x0 = S + 1.5, len = t.length, h = t.height, w = t.z1 - t.z0, zc = (t.z0 + t.z1) / 2;
      const cx = sg * (x0 + len / 2), fx = sg * (x0 + 0.05);
      parts.push(box(len, h, w, '#8e929a', { x: cx, y: h / 2, z: zc }));
      parts.push(box(len, 0.6, w + 1.2, '#6f737b', { x: cx, y: h + 0.3, z: zc }));
      parts.push(box(1.4, h + 0.6, w + 1.2, '#7b7f87', { x: sg * (x0 + 0.5), y: (h + 0.6) / 2, z: zc }));
      const n = t.mouths || 2, pw = Math.min(8, w / n - 2);
      for (let i = 0; i < n; i++) {
        const mz = t.z0 + (w / n) * (i + 0.5);
        parts.push(box(0.4, h - 1.8, pw, '#1a1b20', { x: sg * (x0 + 1.3), y: (h - 1.8) / 2, z: mz }));
        parts.push(box(0.3, 0.5, pw + 1.2, '#f2c230', { x: sg * (x0 + 1.25), y: h - 1.5, z: mz }));
      }
    }
    const g = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    const m = this.high ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }) : new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(g, applyHoleDiscard(m));
    mesh.castShadow = false;
    this.group.add(mesh);
  }

  addCity(side, S, B, e, rand, out, detail) {
    const step = 15;
    const base = e.color;
    let prevV = null;
    for (let v = 9; v < B * 0.55; v += 15 + rand() * 4) {
      const t = S + v;
      // A road (with a centre line) runs around the block ring between consecutive rows.
      if (prevV !== null) {
        const mid = S + (prevV + v) / 2, len = 2 * mid;
        const alongX = side === 'north' || side === 'south';
        const sgn = side === 'north' || side === 'west' ? -1 : 1;
        const rx = alongX ? 0 : sgn * mid, rz = alongX ? sgn * mid : 0;
        detail.push(box(alongX ? len : 1.7, 0.06, alongX ? 1.7 : len, '#383b43', { x: rx, y: 0.03, z: rz }));
        detail.push(box(alongX ? len : 0.12, 0.05, alongX ? 0.12 : len, '#d8c070', { x: rx, y: 0.08, z: rz }));
      }
      prevV = v;
      for (let a = -t + 4; a < t - 4; a += step + rand() * 4) {
        if (rand() < 0.16) continue;
        const w = 7 + rand() * 6, d = 7 + rand() * 6;
        let hgt = (7 + 30 * Math.pow(rand(), 2)) * (0.75 + v / 90);
        if (v < 40 && rand() < 0.4) hgt = 5 + rand() * 7; // low-rise near the edge: its rooftops are what the camera sees
        const shade = 0.7 + rand() * 0.5;
        const c = '#' + base.clone().multiplyScalar(shade).lerp(col('#7b86a8'), rand() * 0.3).getHexString();
        const roofCol = '#' + base.clone().multiplyScalar(shade * 0.55).getHexString();
        let x, z;
        if (side === 'north') { x = a; z = -t; }
        else if (side === 'south') { x = a; z = t; }
        else if (side === 'east') { x = t; z = a; }
        else { x = -t; z = a; }
        if (this.clear.some((q) => x + w / 2 > q.x0 && x - w / 2 < q.x1 && z + d / 2 > q.z0 && z - d / 2 < q.z1)) continue;
        out.push(box(w, hgt, d, c, { x, y: hgt / 2, z }));
        const r = rand();
        if (hgt > 24) { // tower: setback tiers, antenna, sometimes a helipad
          const h2 = hgt * 0.22;
          out.push(box(w * 0.7, h2, d * 0.7, c, { x, y: hgt + h2 / 2, z }));
          detail.push(box(w * 0.75, 0.5, d * 0.75, roofCol, { x, y: hgt + h2 + 0.25, z }));
          detail.push(cyl(0.12, 0.2, 5 + rand() * 7, '#cfd3da', { x, y: hgt + h2 + 3.5, z, segments: 6 }));
          if (r < 0.3) detail.push(cyl(Math.min(w, d) * 0.22, Math.min(w, d) * 0.22, 0.2, '#e4e7ee', { x: x + w * 0.35, y: hgt + 0.1, z, segments: 10 }));
        } else if (hgt < 13 && r < 0.55) { // pitched roof
          const ph = Math.min(w, d) * 0.3;
          detail.push(extrude([[-d / 2, 0], [d / 2, 0], [0, ph]], w, '#' + col(['#a8523e', '#7d6a5a', '#5c6b7a'][(rand() * 3) | 0]).getHexString(), { ry: Math.PI / 2, x, y: hgt, z }));
        } else { // flat roof: parapet, AC units, water tank
          detail.push(box(w * 0.92, 0.5, d * 0.92, roofCol, { x, y: hgt + 0.25, z }));
          const nAc = 1 + ((rand() * 3) | 0);
          for (let k = 0; k < nAc; k++) {
            detail.push(box(1.5 + rand(), 0.9 + rand() * 0.5, 1.4 + rand(), '#9096a0', { x: x + (rand() - 0.5) * w * 0.6, y: hgt + 0.95, z: z + (rand() - 0.5) * d * 0.6 }));
          }
          if (r > 0.7) {
            const tx = x + (rand() - 0.5) * w * 0.4, tz = z + (rand() - 0.5) * d * 0.4;
            detail.push(cyl(1.1, 1.1, 2.4, '#7d5e44', { x: tx, y: hgt + 1.7, z: tz, segments: 8 }));
            detail.push(cone(1.3, 1.0, '#5e4633', { x: tx, y: hgt + 3.4, z: tz, segments: 8 }));
          } else if (r < 0.2) detail.push(cyl(0.12, 0.2, 5 + rand() * 6, '#cfd3da', { x, y: hgt + 3.5, z, segments: 6 }));
        }
      }
    }
  }

  /** Register an instanced prop (kind in PROP_GEOMETRY). Meshes are created in flushProps(). */
  prop(kind, c1, c2, x, y, z, s, tint, ry) {
    const key = `${kind}|${c1}|${c2}`;
    let entry = this.props.get(key);
    if (!entry) this.props.set(key, (entry = { kind, c1, c2, items: [] }));
    entry.items.push([x, y, z, s, tint, ry]);
  }

  scatterProps(side, S, B, type, e, hFn, rand) {
    const q = this.high ? 1 : 0.45;
    const at = (vMin, vRange, pw) => {
      const v = vMin + Math.pow(rand(), pw) * vRange;
      const [x, z] = sidePoint(side, S, rand() * 2 - 1, v);
      return { x, z, v, y: hFn(x, z, v) };
    };
    const trunk = '#7b5330';
    const tint = () => 0.85 + rand() * 0.3;
    const bushLeaf = hex(foliage(e.color, 0.36));
    if (type === 'hills' || type === 'forest') {
      const pine = hex(foliage(e.color2, 0.3));
      const round = hex(foliage(e.color, 0.36));
      const forest = type === 'forest';
      const nTrees = ((forest ? 500 : 130) * q) | 0;
      for (let i = 0; i < nTrees; i++) {
        const p = at(5, forest ? 100 : 80, 1.5);
        const kind = rand() < (forest ? 0.25 : 0.55) ? 'round' : 'pine';
        this.prop(kind, kind === 'round' ? round : pine, trunk, p.x, p.y - 0.1, p.z, (forest ? 1.3 : 1) * (0.6 + rand() * 0.6) * (1 + p.v / 60), tint(), rand() * 6.28);
      }
      const nBush = ((forest ? 160 : 140) * q) | 0;
      for (let i = 0; i < nBush; i++) {
        const p = at(3, 45, 1.3);
        this.prop('bush', bushLeaf, '', p.x, p.y - 0.05, p.z, 0.7 + rand() * 0.9, tint(), rand() * 6.28);
      }
    } else if (type === 'mountains') {
      const rock = hex(e.color.clone().multiplyScalar(0.9));
      const clusters = (36 * q) | 0;
      for (let i = 0; i < clusters; i++) {
        const c = at(4, 90, 1.4);
        const k = 3 + ((rand() * 4) | 0);
        for (let j = 0; j < k; j++) {
          const x = c.x + (rand() - 0.5) * 9, z = c.z + (rand() - 0.5) * 9;
          const v = Math.max(Math.abs(x), Math.abs(z)) - S;
          if (v < 3) continue;
          this.prop('rock', rock, '', x, hFn(x, z, v) - 0.15, z, (1 + rand() * 2.2) * (1 + v / 70), 0.75 + rand() * 0.45, rand() * 6.28);
        }
      }
      const pine = hex(col('#3a7a45'));
      for (let i = 0, n = (90 * q) | 0; i < n; i++) {
        const p = at(6, 100, 1.3);
        if (p.y > 16) continue;
        this.prop('pine', pine, trunk, p.x, p.y - 0.1, p.z, (0.7 + rand() * 0.7) * (1 + p.v / 60), tint(), rand() * 6.28);
      }
    } else if (type === 'desert') {
      const green = hex(col('#5a9a52'));
      for (let i = 0, n = (34 * q) | 0; i < n; i++) {
        const p = at(6, 90, 1.3);
        this.prop('cactus', green, '', p.x, p.y - 0.1, p.z, (0.8 + rand()) * (1 + p.v / 80), tint(), rand() * 6.28);
      }
      const rock = hex(e.color2.clone().lerp(col('#8a6a4a'), 0.3));
      for (let i = 0, n = (50 * q) | 0; i < n; i++) {
        const p = at(5, 100, 1.3);
        this.prop('rock', rock, '', p.x, p.y - 0.1, p.z, (0.8 + rand() * 1.6) * (1 + p.v / 70), tint(), rand() * 6.28);
      }
    }
  }

  flushProps() {
    if (!this.props.size) return;
    const mat = applyHoleDiscard(this.high ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }) : new THREE.MeshLambertMaterial({ vertexColors: true }));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    for (const { kind, c1, c2, items } of this.props.values()) {
      const mesh = new THREE.InstancedMesh(PROP_GEOMETRY[kind](c1, c2), mat, items.length);
      items.forEach(([x, y, z, sc, tint, ry], i) => {
        q.setFromAxisAngle(up, ry);
        m.compose(p.set(x, y, z), q, s.set(sc, sc * (0.9 + (tint - 0.85) * 0.5), sc));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.setScalar(tint));
      });
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.props = null;
  }

  /** Shallow-water tint + animated foam line hugging the waterline of one ocean side. */
  buildShore(side, S, hFn, e) {
    const nu = this.high ? 160 : 80;
    const ds = [-1.6, -0.6, 0, 0.8, 2, 4, 8, 16];
    const pos = [], dd = [], al = [], idx = [];
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1;
      let vS = 13;
      for (let v = 0; v < 40; v += 0.25) {
        const [x, z] = sidePoint(side, S, u, v);
        if (hFn(x, z, v) < OCEAN_LEVEL) {
          let lo = Math.max(0, v - 0.25), hi = v;
          for (let k = 0; k < 6; k++) {
            const mid = (lo + hi) / 2, [mx, mz] = sidePoint(side, S, u, mid);
            if (hFn(mx, mz, mid) < OCEAN_LEVEL) hi = mid; else lo = mid;
          }
          vS = hi;
          break;
        }
      }
      for (const d of ds) {
        const v = Math.max(0.2, vS + d), [x, z] = sidePoint(side, S, u, v);
        pos.push(x, OCEAN_LEVEL + 0.06, z); dd.push(d); al.push(u * (S + v));
      }
    }
    const K = ds.length;
    for (let i = 0; i < nu; i++) {
      for (let k = 0; k < K - 1; k++) {
        const a = i * K + k, b = a + 1, c = a + K, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aD', new THREE.Float32BufferAttribute(dd, 1));
    g.setAttribute('aAlong', new THREE.Float32BufferAttribute(al, 1));
    g.setIndex(idx);
    if (!this.foamMat) {
      this.foamMat = new THREE.ShaderMaterial({
        uniforms: { uEdgeHole: edgeHoleUniform, uHoles: holeUniforms.uHoles, uHoleCount: holeUniforms.uHoleCount, uTime: { value: 0 }, uAqua: { value: col(e.color).lerp(col('#8fe6dc'), 0.55) }, uFoam: { value: col('#f4fbff') } },
        vertexShader: 'attribute float aD; attribute float aAlong; varying float vD; varying float vA; varying vec3 vHW; void main() { vD = aD; vA = aAlong; vHW = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float uTime; uniform vec3 uAqua; uniform vec3 uFoam; varying float vD; varying float vA; varying vec3 vHW; uniform float uEdgeHole; uniform vec3 uHoles[8]; uniform int uHoleCount;
          float h11(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
          float vn(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h11(i), h11(i + 1.0), f); }
          void main() {
            if (uEdgeHole > 0.5) {
              for (int i = 0; i < 8; i++) {
                if (i >= uHoleCount) break;
                vec2 hd = vHW.xz - uHoles[i].xy;
                if (dot(hd, hd) < uHoles[i].z * uHoles[i].z) discard;
              }
            }
            float wob = 0.55 + 0.5 * sin(uTime * 0.75 + vA * 0.05) + 0.25 * sin(uTime * 0.43 + vA * 0.17);
            float broken = 0.45 + 0.55 * vn(vA * 0.35 + uTime * 0.2);
            float line1 = exp(-pow((vD - wob) / 0.42, 2.0));
            float line2 = exp(-pow((vD - wob - 2.4) / 0.3, 2.0)) * 0.55 * (0.5 + 0.5 * sin(uTime * 0.75 + vA * 0.05 + 2.0));
            float wash = smoothstep(-1.6, 0.0, vD) * (1.0 - smoothstep(0.0, wob + 0.3, vD)) * 0.25;
            float foam = clamp((line1 + line2) * broken + wash, 0.0, 1.0);
            float shallow = smoothstep(-0.5, 0.5, vD) * (1.0 - smoothstep(0.0, 16.0, vD)) * 0.5;
            gl_FragColor = vec4(mix(uAqua, uFoam, clamp(foam * 1.3, 0.0, 1.0)), max(shallow, foam * 0.9));
            #include <colorspace_fragment>
          }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
    }
    const mesh = new THREE.Mesh(g, this.foamMat);
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    this.group.add(mesh);
  }

  /** Terraced block terrain (Minecraft style): columns in three cell sizes, grass/dirt/stone/snow, lakes, block trees. */
  buildVoxel(sides, bd, S, B, N, horizon, rand) {
    const n0 = Math.max(4, 4 * Math.round((2 * S) / 12));
    const c0 = (2 * S) / n0;
    const c2 = c0 * 4;
    const b0 = c2 * 4, b1 = c2 * 10, b2 = Math.ceil(B / c2) * c2;
    const tiers = [{ c: c0, a: 0, z: b0 }, { c: c0 * 2, a: b0, z: b1 }, { c: c2, a: b1, z: b2 }];
    const P = [], NR = [], CL = [];
    const tmp = new THREE.Color(), va = new THREE.Vector3(), vb = new THREE.Vector3();
    const hash = (i, j, k) => { let h = Math.imul(i + 911, 374761393) ^ Math.imul(j + 577, 668265263) ^ Math.imul(k + 31, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const sideOf = (cx, cz) => (Math.abs(cz) >= Math.abs(cx) ? (cz < 0 ? 'north' : 'south') : cx > 0 ? 'east' : 'west');
    const push = (p, n, c, fogK) => { P.push(p[0], p[1], p[2]); NR.push(n[0], n[1], n[2]); tmp.copy(c).lerp(horizon, fogK); CL.push(tmp.r, tmp.g, tmp.b); };
    const quad = (p0, p1, p2, p3, nrm, c, fogK) => {
      va.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]); vb.set(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
      va.cross(vb);
      const flip = va.x * nrm[0] + va.y * nrm[1] + va.z * nrm[2] < 0;
      const o = flip ? [p0, p3, p2, p1] : [p0, p1, p2, p3];
      for (const k of [0, 1, 2, 0, 2, 3]) push(o[k], nrm, c, fogK);
    };
    const GRASS_SIDE = 0.6;
    const water = col('#3f86e0'), stone = col('#8b8b8b'), snow = col('#f3f6fa'), sand = col('#dccf98');
    const trees = [];
    tiers.forEach((tier, ti) => {
      const c = tier.c, cache = new Map();
      const info = (i, j) => {
        const key = (i + 3000) * 8192 + (j + 3000);
        let r = cache.get(key);
        if (r) return r;
        const cx = -S + (i + 0.5) * c, cz = -S + (j + 0.5) * c;
        const m = Math.max(Math.abs(cx), Math.abs(cz));
        if (m <= S) r = { top: -1, water: false, inside: true };
        else {
          const v = m - S, e = bd[sideOf(cx, cz)], tall = e.type === 'voxel' ? e.tall : 1;
          r = voxelLake(N, cx, cz, v) ? { top: -0.6, water: true } : { top: Math.floor(voxelRaw(N, cx, cz, v, tall) / VOXEL_STEP) * VOXEL_STEP, water: false };
        }
        cache.set(key, r);
        return r;
      };
      const iMin = -Math.round(tier.z / c), iMax = Math.round((2 * S + tier.z) / c) - 1;
      for (let i = iMin; i <= iMax; i++) {
        for (let j = iMin; j <= iMax; j++) {
          const cx = -S + (i + 0.5) * c, cz = -S + (j + 0.5) * c;
          const m = Math.max(Math.abs(cx), Math.abs(cz));
          if (m - c / 2 < S + tier.a - 1e-4 || m + c / 2 > S + tier.z + 1e-4) continue;
          const side = sideOf(cx, cz);
          const e = bd[side];
          if (!sides.includes(side)) continue;
          const v = m - S, fogK = smooth(90, B, v) * 0.5;
          const inf = info(i, j), top = inf.top;
          const x0 = cx - c / 2, x1 = cx + c / 2, z0 = cz - c / 2, z1 = cz + c / 2;
          const hv = hash(i, j, ti);
          let topCol;
          if (inf.water) topCol = tmp.copy(water).multiplyScalar(0.92 + hv * 0.16).clone();
          else if (top >= 27) topCol = snow.clone().multiplyScalar(0.95 + hv * 0.05);
          else if (top >= 21) topCol = stone.clone().multiplyScalar(0.85 + hv * 0.3);
          else {
            const nearWater = top <= 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => info(i + di, j + dj).water);
            topCol = nearWater ? sand.clone().multiplyScalar(0.92 + hv * 0.12) : e.color.clone().multiplyScalar(0.85 + hv * 0.3);
          }
          quad([x0, top, z0], [x0, top, z1], [x1, top, z1], [x1, top, z0], [0, 1, 0], topCol, fogK);
          if (!inf.water && top < 21 && ti < 2 && v > 4 && v < 90) trees.push({ cx, cz, top, c });
          for (const [di, dj, nx, nz] of [[1, 0, 1, 0], [-1, 0, -1, 0], [0, 1, 0, 1], [0, -1, 0, -1]]) {
            const nb = info(i + di, j + dj);
            const low = nb.inside ? -1 : nb.top;
            let y1 = top, k = 0;
            while (y1 > low + 1e-3 && k < 14) {
              const y0 = Math.max(low, y1 - VOXEL_STEP);
              const fx = nx !== 0 ? cx + nx * c / 2 : 0, fz = nz !== 0 ? cz + nz * c / 2 : 0;
              const pts = (ya, yb) => nx !== 0
                ? [[fx, ya, z0], [fx, ya, z1], [fx, yb, z1], [fx, yb, z0]]
                : [[x0, ya, fz], [x1, ya, fz], [x1, yb, fz], [x0, yb, fz]];
              const dirt = e.color2.clone().multiplyScalar(0.85 + hash(i + di * 7, j + dj * 7, k) * 0.3);
              const deep = hash(i, j, k + 50) < 0.4 ? stone.clone().multiplyScalar(0.8 + hv * 0.3) : dirt;
              if (k === 0) {
                const gs = Math.min(GRASS_SIDE, (y1 - y0) * 0.5);
                const cap = inf.water ? dirt : top >= 27 ? snow : top >= 21 ? stone : e.color.clone().multiplyScalar(0.8);
                quad(...pts(y1 - gs, y1), [nx, 0, nz], cap, fogK);
                quad(...pts(y0, y1 - gs), [nx, 0, nz], top >= 21 ? stone.clone().multiplyScalar(0.8) : dirt, fogK);
              } else quad(...pts(y0, y1), [nx, 0, nz], y1 <= 6 ? deep : dirt, fogK);
              y1 = y0; k++;
            }
          }
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(NR, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3));
    const mesh = new THREE.Mesh(g, applyHoleDiscard(makeTerrainMaterial('voxel'), true));
    mesh.frustumCulled = false;
    this.group.add(mesh);
    // Block trees on random land columns.
    const e0 = bd[sides[0]];
    const leaf = hex(e0.color.clone().multiplyScalar(0.7)), trunk = '#6b4a2b';
    const count = this.high ? 240 : 110;
    for (let i = 0; i < count && trees.length; i++) {
      const t = trees[(rand() * trees.length) | 0];
      this.prop('blocktree', leaf, trunk, t.cx + (rand() - 0.5) * t.c * 0.4, t.top, t.cz + (rand() - 0.5) * t.c * 0.4, (t.c / c0) * (0.85 + rand() * 0.3), 0.85 + rand() * 0.3, Math.floor(rand() * 4) * Math.PI / 2);
    }
  }

  /** Distant hazy horizon + sky gradient curtain: only ever visible at the top of the screen when zoomed out. */
  buildWall(bd, S) {
    const kinds = { hills: 0, forest: 0, mountains: 1, city: 2, desert: 3, ocean: 4, voxel: 5, space: -1 };
    const pos = [], axis = [], kind = [], sil = [], idx = [];
    const faces = [ // side, corners (x, z) of the unit square
      ['north', [-1, -1], [1, -1], 0], ['south', [1, 1], [-1, 1], 0], ['east', [1, -1], [1, 1], 1], ['west', [-1, 1], [-1, -1], 1],
    ];
    faces.forEach(([side, a, b, ax], f) => {
      const e = bd[side];
      const c = mix(e.color, this.horizon, 0.45);
      for (const [px, pz, py] of [[a[0], a[1], -0.1], [b[0], b[1], -0.1], [b[0], b[1], 1], [a[0], a[1], 1]]) {
        pos.push(px, py, pz); axis.push(ax); kind.push(kinds[e.type] ?? 0); sil.push(c.r, c.g, c.b);
      }
      idx.push(f * 4, f * 4 + 1, f * 4 + 2, f * 4, f * 4 + 2, f * 4 + 3);
    });
    if (faces.every(([side]) => bd[side].type === 'space')) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aAxis', new THREE.Float32BufferAttribute(axis, 1));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
    g.setAttribute('aSil', new THREE.Float32BufferAttribute(sil, 3));
    g.setIndex(idx);
    this.wallMat = new THREE.ShaderMaterial({
      uniforms: { uTop: { value: this.top }, uHorizon: { value: this.horizon }, uH: { value: 50 } },
      vertexShader: `attribute float aAxis; attribute float aKind; attribute vec3 aSil; varying vec3 vW; varying float vAxis; varying float vKind; varying vec3 vSil;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vAxis = aAxis; vKind = aKind; vSil = aSil; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform float uH; varying vec3 vW; varying float vAxis; varying float vKind; varying vec3 vSil;
        float h11(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
        float prof(float a, float k, float ph) {
          float s = 0.5 + 0.25 * sin(a * 0.021 + ph) + 0.15 * sin(a * 0.047 + ph * 2.3) + 0.1 * sin(a * 0.11 + ph * 0.7);
          if (k < 0.5) return 0.18 + 0.45 * s;
          if (k < 1.5) return 0.2 + 0.8 * pow(1.0 - abs(sin(a * 0.022 + ph)), 1.6) * (0.5 + 0.5 * s);
          if (k < 2.5) return 0.12 + 0.5 * h11(floor(a / 9.0) + ph);
          if (k < 3.5) return 0.1 + 0.22 * s;
          if (k < 4.5) return 0.03;
          return 0.15 + 0.55 * floor(s * 6.0) / 6.0;
        }
        void main() {
          if (vKind < -0.5) discard;
          float a = mix(vW.x, vW.z, vAxis);
          float t = vW.y / uH;
          vec3 c = mix(uHorizon, uTop, pow(clamp(t / 0.6, 0.0, 1.0), 0.8) * 0.85);
          float far = prof(a * 0.6 + 40.0, vKind, 2.1) * 0.55;
          float near = prof(a, vKind, 0.7) * 0.4;
          if (t < far) c = mix(uHorizon, vSil, 0.5);
          if (t < near) c = mix(uHorizon, vSil, 0.8) * (0.85 + 0.15 * t / max(near, 0.01));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.DoubleSide, fog: false,
    });
    this.S = S;
    this.wall = new THREE.Mesh(g, this.wallMat);
    this.wall.frustumCulled = false;
    this.group.add(this.wall);
  }

  buildSpace(S, rand) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uTime; varying vec3 vW;
        float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
        float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
        void main() {
          // Stars live in view-direction space (like a sky), so they keep a constant on-screen size at any distance.
          vec3 dir = normalize(vW - cameraPosition);
          vec2 q = dir.xz / (0.12 - dir.y);
          vec2 p = q * 62.0;
          vec2 i = floor(p), f = fract(p);
          float r = h21(i);
          float s = 0.0;
          if (r > 0.82) {
            vec2 c = vec2(h21(i + 7.1), h21(i + 3.3)) * 0.5 + 0.25;
            float tw = 0.65 + 0.35 * sin(uTime * (1.0 + r * 4.0) + r * 60.0);
            s = smoothstep(0.2, 0.0, length(f - c)) * tw * (0.55 + (r - 0.82) * 2.5);
          }
          float neb = vn(q * 5.0) * vn(q * 11.0 + 5.0);
          vec3 col = vec3(0.012, 0.015, 0.05) + vec3(0.1, 0.035, 0.15) * neb * 1.1 + vec3(s);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
      fog: false, depthTest: false, depthWrite: false, // background layer: pit walls / terrain draw over it
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(S * 40, S * 40).rotateX(-Math.PI / 2), mat);
    plane.position.y = -55.5;
    plane.renderOrder = -50;
    plane.frustumCulled = false;
    this.dome.visible = false; // the star plane replaces the sky dome
    this.group.add(plane);
    this.spaceMat = mat;
    // A little Earth hanging in the void.
    const N2 = makeNoise(4242);
    const eg = new THREE.SphereGeometry(34, 40, 24);
    const p = eg.attributes.position, cs = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const land = N2.fbm(x * 0.09 + y * 0.05 + 10, z * 0.09 + y * 0.07, 4);
      if (land > 0.52) c.set('#4a9a4f').lerp(c.set('#b9a56a'), Math.max(0, land - 0.62) * 4).lerp(c.set('#ffffff'), Math.max(0, Math.abs(y) / 34 - 0.82) * 5);
      else c.set('#2a6cc8').lerp(c.set('#57a9ee'), N2.fbm(x * 0.2, z * 0.2) * 0.6);
      if (N2.fbm(x * 0.06 + 90, y * 0.06 + z * 0.04, 3) > 0.62) c.set('#f4f7ff');
      cs.set([c.r, c.g, c.b], i * 3);
    }
    eg.setAttribute('color', new THREE.BufferAttribute(cs, 3));
    const earth = new THREE.Mesh(eg, new THREE.MeshLambertMaterial({ vertexColors: true }));
    earth.position.set(-S * 0.55, -22, -S - 125);
    this.group.add(earth);
    this.earth = earth;
    void rand;
  }

  buildEdge(map, S, rand) {
    const kind = map.edge ?? EDGE_BY_STYLE[map.groundStyle] ?? 'curb';
    if (kind === 'none') return;
    const g = edgeGeometry(kind, S, rand, map.groundColor);
    const mat = applyHoleDiscard(this.high ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }) : new THREE.MeshLambertMaterial({ vertexColors: true }));
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = this.high;
    mesh.receiveShadow = this.high;
    this.group.add(mesh);
  }

  buildClouds(S, rand) {
    const n = this.high ? 9 : 4;
    const parts = [];
    const cloud = new THREE.Group();
    this.clouds = cloud;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x5a6a80, transparent: true, opacity: 0.94 });
    for (let i = 0; i < n; i++) {
      const puffs = [];
      const k = 5 + (rand() * 3 | 0);
      for (let j = 0; j < k; j++) {
        const r = 5 + rand() * 6;
        const x = (j - k / 2) * 6 + rand() * 3, z = (rand() - 0.5) * 7, y = rand() * 2.5;
        puffs.push(sphere(r, j % 2 ? '#ffffff' : '#f1f5fb', { x, y: y + r * 0.35, z, sy: 0.55, segments: 9, rings: 6 }));
      }
      const g = mergeGeometries(puffs, false);
      puffs.forEach((p) => p.dispose());
      const mesh = new THREE.Mesh(g, mat);
      const a = (i / n) * Math.PI * 2 + rand() * 0.6, rad = S * (1.15 + rand() * 0.9);
      mesh.position.set(Math.cos(a) * rad, 42 + rand() * 26, Math.sin(a) * rad);
      mesh.rotation.y = rand() * 6;
      mesh.scale.setScalar(0.9 + rand() * 0.8);
      cloud.add(mesh);
    }
    void parts;
    this.group.add(cloud);
  }

  /** Per frame: dome follows the camera, clouds drift. */
  update(dt, camera, time) {
    const s = camera.far * 0.85;
    this.dome.position.copy(camera.position);
    this.dome.scale.setScalar(s);
    if (this.stars) { this.stars.position.copy(camera.position); this.stars.scale.setScalar(s); }
    if (this.clouds) this.clouds.rotation.y += dt * 0.004;
    if (this.foamMat) this.foamMat.uniforms.uTime.value = time;
    if (this.wall) {
      // The camera pitch is fixed at 62 degrees, so its distance d follows from its height; the curtain sits ~0.45 d beyond the map edge.
      const d = camera.position.y / 0.8829;
      const Q = this.S + Math.max(30, d * 0.45), H = d * 0.3 + 12;
      this.wall.scale.set(Q, H, Q);
      this.wallMat.uniforms.uH.value = H;
    }
    if (this.spaceMat) this.spaceMat.uniforms.uTime.value = time;
  }
}
