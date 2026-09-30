// Non-swallowable scenery around the playable square: gradient sky dome (+ stars), drifting clouds,
// backdrop terrain ring (hills / mountains / city / ocean / desert / space / forest) and the map-edge fence.
// Everything here is decorative: no grid entries, no shadows cast except the edge, never clamps holes (Hole.clamp does).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, cone, sphere, extrude } from '../objects/build.js';
import { makeBackdropMaterial, makeTerrainMaterial } from './Ground.js';

const SIDES = ['north', 'south', 'east', 'west'];
export const BACKDROP_TYPES = ['hills', 'mountains', 'city', 'ocean', 'desert', 'space', 'forest'];
const EDGE_BY_STYLE = { grass: 'hedge', dirt: 'fence', sand: 'rocks', asphalt: 'barrier', concrete: 'barrier', regolith: 'rocks', voxel: 'blocks' };

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
    res[s] = { type, color: col(e.color ?? d[0]), color2: col(e.color2 ?? d[1]) };
  }
  return res;
}

// ---- terrain ring ------------------------------------------------------------

function heightFn(type, N, S) {
  const { fbm } = N;
  switch (type) {
    case 'hills':
      return (x, z, v) => (fbm(x * 0.02, z * 0.02) * 0.8 + 0.2 * fbm(x * 0.07, z * 0.07)) * (8 + 34 * smooth(6, 130, v)) * smooth(2, 8, v);
    case 'forest':
      return (x, z, v) => (fbm(x * 0.025, z * 0.025) * 0.8 + 0.2 * fbm(x * 0.08, z * 0.08)) * (5 + 16 * smooth(8, 140, v)) * smooth(1.5, 10, v);
    case 'mountains':
      return (x, z, v) => {
        const r = 1 - Math.abs(2 * fbm(x * 0.012, z * 0.012, 5) - 1);
        return (r * r * (14 + 100 * smooth(8, 110, v)) + fbm(x * 0.05, z * 0.05) * 6 * smooth(2, 20, v)) * smooth(2, 26, v);
      };
    case 'desert':
      return (x, z, v) => {
        const n = fbm(x * 0.015, z * 0.03);
        const mesa = smooth(0.66, 0.7, fbm(x * 0.008 + 9, z * 0.008 + 4)) * 20 * smooth(40, 100, v);
        return (n * n * 2 * (7 + 14 * smooth(10, 120, v)) + mesa) * smooth(1.5, 9, v);
      };
    case 'space':
      return (x, z, v) => fbm(x * 0.03, z * 0.03) * 4 * smooth(1.5, 8, v) - 55 * smooth(14, 30, v);
    case 'ocean':
      return (x, z, v) => -0.6 * smooth(0, 9, v);
    default:
      return () => 0; // city
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
        c.copy(grass).lerp(e.color, low).multiplyScalar(0.85 + 0.3 * n).lerp(e.color2, snow);
        break;
      }
      case 'desert': {
        const mesa = smooth(8, 18, y);
        c.copy(e.color).multiplyScalar(0.9 + 0.2 * n).lerp(e.color2, mesa * 0.9);
        break;
      }
      case 'space': {
        const deep = smooth(0, -50, y);
        c.copy(e.color).multiplyScalar(0.75 + 0.35 * n).lerp(e.color2, deep);
        break;
      }
      case 'ocean': {
        c.copy(e.color2).multiplyScalar(0.92 + 0.12 * n);
        c.lerp(tmp.copy(e.color).multiplyScalar(0.5), smooth(5, 10, v));
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
  return m;
}

// ---- trees (instanced) --------------------------------------------------------

function treeGeometry(leaf, trunk) {
  const parts = [
    cyl(0.25, 0.32, 1.2, trunk, { y: 0.6, segments: 6 }),
    cone(1.5, 2.2, leaf, { y: 2.2, segments: 8 }),
    cone(1.15, 1.9, leaf, { y: 3.4, segments: 8 }),
    cone(0.75, 1.6, leaf, { y: 4.5, segments: 8 }),
  ];
  const g = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return g;
}

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
    const N = makeNoise(hashSeed(map.id + ':noise'));
    const { top, horizon } = skyColors(map);
    this.horizon = horizon;
    this.top = top;

    this.buildSky(top, horizon, map.stars, rand);
    const bd = resolveBackdrop(map);
    this.skirtColor = this.buildBackdrop(bd, S, rand, N, horizon);
    this.buildEdge(map, S, rand);
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
    const STYLE_OF = { hills: 'grass', forest: 'grass', mountains: 'regolith', desert: 'sand', space: 'regolith', ocean: 'sand' };
    const terrainMat = (type) => mats[type] || (mats[type] = makeTerrainMaterial(STYLE_OF[type]));
    let skirt = null;
    const nu = high ? 72 : 36, nv = high ? 30 : 16;
    const skirtOf = { hills: 0.85, forest: 0.7, mountains: 0.7, desert: 0.85, space: 0.05, ocean: 0.85, city: 1 };
    const cityBoxes = [], trees = [];
    let hasSpace = false;
    const sideTypes = {};
    for (const side of SIDES) {
      const e = bd[side];
      const type = e.type;
      sideTypes[side] = type;
      const hFn = heightFn(type, N, S);
      const depth = type === 'space' ? 60 : B;
      if (type === 'city') {
        const g = ringGeometry(side, S, depth, 16, 6, () => 0, null);
        const m = makeBackdropMaterial(e.color2, 'concrete');
        const mesh = new THREE.Mesh(g, m);
        mesh.position.y = -0.02;
        this.group.add(mesh);
        this.addCity(side, S, B, e, rand, cityBoxes);
      } else {
        const g = ringGeometry(side, S, depth, nu, nv, hFn, terrainColorFn(type, e, N, horizon, depth, hFn));
        this.group.add(new THREE.Mesh(g, terrainMat(type)));
        if (type === 'ocean') {
          const wg = ringGeometry(side, S, B, 16, 10, () => -0.35, null);
          const wm = makeBackdropMaterial(e.color, 'water');
          this.group.add(new THREE.Mesh(wg, wm));
        }
        if (type === 'hills' || type === 'forest') this.scatterTrees(side, S, B, type, e, hFn, rand, trees);
      }
      if (type === 'space') hasSpace = true;
      if (side === 'north') skirt = mix(type === 'city' ? e.color2 : e.color, horizon, type === 'ocean' ? 0 : 0.3).multiplyScalar(skirtOf[type]);
    }
    if (cityBoxes.length) {
      const g = mergeGeometries(cityBoxes, false);
      cityBoxes.forEach((p) => p.dispose());
      this.group.add(new THREE.Mesh(g, windowMaterial(high)));
    }
    if (trees.length) this.buildTreeInstances(trees);
    if (hasSpace) this.buildSpace(S, rand);
    return hasSpace ? null : skirt; // no skirt over the star plane
  }

  addCity(side, S, B, e, rand, out) {
    const step = 15;
    const base = e.color;
    for (let v = 9; v < B * 0.55; v += 15 + rand() * 4) {
      const t = S + v;
      for (let a = -t + 4; a < t - 4; a += step + rand() * 4) {
        if (rand() < 0.16) continue;
        const w = 7 + rand() * 6, d = 7 + rand() * 6;
        const hgt = (7 + 30 * Math.pow(rand(), 2)) * (0.75 + v / 90);
        const shade = 0.7 + rand() * 0.5;
        const c = '#' + base.clone().multiplyScalar(shade).lerp(col('#7b86a8'), rand() * 0.3).getHexString();
        let x, z;
        if (side === 'north') { x = a; z = -t; }
        else if (side === 'south') { x = a; z = t; }
        else if (side === 'east') { x = t; z = a; }
        else { x = -t; z = a; }
        out.push(box(w, hgt, d, c, { x, y: hgt / 2, z }));
        out.push(box(w * 0.6, 1.2, d * 0.6, '#' + base.clone().multiplyScalar(shade * 0.6).getHexString(), { x, y: hgt + 0.6, z }));
        if (rand() < 0.2) out.push(cyl(0.12, 0.2, 5 + rand() * 6, '#cfd3da', { x, y: hgt + 3.5, z, segments: 6 }));
      }
    }
  }

  scatterTrees(side, S, B, type, e, hFn, rand, out) {
    const count = (type === 'forest' ? 520 : 130) * (this.high ? 1 : 0.4) | 0;
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1, v = 6 + Math.pow(rand(), 1.7) * B * 0.7, t = S + v;
      let x, z;
      if (side === 'north') { x = u * t; z = -t; }
      else if (side === 'south') { x = u * t; z = t; }
      else if (side === 'east') { x = t; z = u * t; }
      else { x = -t; z = u * t; }
      const s = (type === 'forest' ? 1.3 : 1) * (0.5 + rand() * 0.6) * (1 + v / 55);
      out.push({ x, y: hFn(x, z, v) - 0.1, z, s, tint: 0.75 + rand() * 0.5, leaf: type === 'forest' ? e.color2 : e.color2 });
    }
  }

  buildTreeInstances(trees) {
    const g = treeGeometry('#3f9a45', '#7b5330');
    const mat = this.high ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }) : new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.InstancedMesh(g, mat, trees.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    trees.forEach((t, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.x * 13.1);
      m.compose(p.set(t.x, t.y, t.z), q, s.set(t.s, t.s * (0.9 + (t.tint - 0.75)), t.s));
      mesh.setMatrixAt(i, m);
      c.set(t.leaf).multiplyScalar(t.tint * 1.5);
      mesh.setColorAt(i, c);
    });
    mesh.frustumCulled = false;
    this.group.add(mesh);
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
    const mat = this.high ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }) : new THREE.MeshLambertMaterial({ vertexColors: true });
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
    if (this.spaceMat) this.spaceMat.uniforms.uTime.value = time;
  }
}
