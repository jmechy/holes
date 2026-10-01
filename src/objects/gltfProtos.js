// Real (CC0) glTF/GLB models -> swallowable protos.
// loadModels(urls) fetches + caches GLTFs; protoFromGLTF() flattens one into our merged, vertex-coloured format and
// runs it through makeProto, so radius / height / value / move / sway behave exactly like procedural protos.
// Colours are BAKED: material.color x texture sample (palette atlases such as Kenney's "colormap" are sampled at each
// triangle's centroid UV, which keeps the flat low-poly look) x any glTF vertex colours. No textures reach the GPU.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { makeProto } from './build.js';
import { TEXTURE_LAYERS } from './TextureLibrary.js';

const loader = new GLTFLoader();
const cache = new Map(); // resolved url -> Promise<gltf>

/** Resolve a path relative to the app base (works for ./, /holes/ and dev). Absolute http(s) URLs pass through. */
export function modelUrl(path) {
  if (/^(https?:)?\/\//.test(path)) return path;
  const base = import.meta.env?.BASE_URL ?? '/';
  return new URL(base.replace(/\/?$/, '/') + path.replace(/^\/+/, ''), document.baseURI).href;
}

/** Load (and cache) several GLB/glTF files. urls = paths under public/, e.g. 'models/kenney-car-kit/sedan.glb'.
 *  Resolves to a Map path -> gltf. Rejects with a readable Error if any file fails. */
export async function loadModels(urls) {
  const out = new Map();
  await Promise.all(urls.map(async (path) => {
    const url = modelUrl(path);
    if (!cache.has(url)) {
      const p = loader.loadAsync(url).catch((e) => {
        cache.delete(url);
        throw new Error(`Could not load model ${path}: ${e?.message ?? e}`);
      });
      cache.set(url, p);
    }
    out.set(path, await cache.get(url));
  }));
  return out;
}

// --- texture sampling ---------------------------------------------------------------------------------------------
const pixelCache = new WeakMap(); // texture -> { w, h, data }
function pixelsOf(tex) {
  let px = pixelCache.get(tex);
  if (px) return px;
  const img = tex.image;
  const w = img.width, h = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  px = { w, h, data: g.getImageData(0, 0, w, h).data };
  pixelCache.set(tex, px);
  return px;
}
const _uv = new THREE.Vector2();
const _col = new THREE.Color();
const _hc = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };
/** Sample texture at uv (glTF convention: v=0 is the top row; GLTFLoader keeps flipY=false). Writes LINEAR rgb into _col. */
function sample(tex, u, v) {
  _uv.set(u, v);
  if (tex.matrixAutoUpdate) tex.updateMatrix();
  _uv.applyMatrix3(tex.matrix);
  const { w, h, data } = pixelsOf(tex);
  const fx = _uv.x - Math.floor(_uv.x), fy = _uv.y - Math.floor(_uv.y);
  const x = Math.min(w - 1, Math.floor(fx * w)), y = Math.min(h - 1, Math.floor(fy * h));
  const i = (y * w + x) * 4;
  _col.setRGB(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255, THREE.SRGBColorSpace); // -> linear working space
  return _col;
}

/**
 * Convert a loaded glTF scene (or any Object3D) to a proto.
 * opts:
 *   rotY     radians added about Y so the model faces our convention (vehicles / walkers face +X). Default 0.
 *   scale    uniform multiplier on the model's native units. OR
 *   length   target size of the larger XZ extent (after rotY), OR height: target height. (scale wins if several.)
 *   surface  'paint'|'wood'|... or (materialName, meshName) => surface name. Default: none (plain 0.75 rough).
 *   textureStrength  0-1 for the procedural detail layer (default 0.4 when a surface is set)
 *   sample   'face' (default, centroid UV per triangle) | 'vertex' (per-vertex UV lookup)
 *   tint     hex string multiplied into every colour
 *   hue      degrees: rotates the hue of every reasonably saturated colour (greys/whites/tyres stay) -> cheap colour variants
 *   colors   { materialName: '#hex' } replaces a material's base colour before baking (Kenney's Nature Kit ships teal
 *            leaves / orange dirt; map them to natural greens and browns). Texture samples still multiply in.
 *   ...rest  forwarded to makeProto (radius, value, move, sway, windStart)
 */
export function protoFromGLTF(name, gltfScene, opts = {}) {
  const root = gltfScene.scene ?? gltfScene;
  root.updateMatrixWorld(true);
  const { rotY = 0, scale, length, height, surface, textureStrength, sample: mode = 'face', tint, hue = 0, colors, ...protoOpts } = opts;
  const tintCol = tint ? new THREE.Color(tint) : null;

  // 1. flatten to world-space, non-indexed triangle soups with baked colour
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes.position) return;
    let g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    if (g.index) { const ni = g.toNonIndexed(); g.dispose(); g = ni; }
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(a)) g.deleteAttribute(a);
    const n = g.attributes.position.count;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const pos = g.attributes.position, uv = g.attributes.uv, vcol = g.attributes.color;
    const col = new Float32Array(n * 3);
    const surf = new Uint8Array(n * 2), info = new Uint8Array(n * 2);
    const groups = g.groups?.length ? g.groups : [{ start: 0, count: n, materialIndex: 0 }];
    for (const grp of groups) {
      const m = mats[grp.materialIndex] ?? mats[0];
      const base = colors?.[m.name] ? new THREE.Color(colors[m.name]) : (m.color ?? new THREE.Color(1, 1, 1));
      const tex = m.map && m.map.image ? m.map : null;
      const sName = typeof surface === 'function' ? surface(m.name, o.name) : surface;
      const props = sName ? (SURF[sName] ?? SURF.paint) : [0.75, 0];
      const layer = sName ? (TEXTURE_LAYERS[sName] ?? 0) : 0;
      const strength = layer ? Math.round((textureStrength ?? 0.4) * 255) : 0;
      const end = Math.min(n, grp.start + grp.count);
      for (let i = grp.start; i < end; i += 3) {
        let cu = 0, cv = 0;
        if (tex && uv && mode === 'face') { cu = (uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3; cv = (uv.getY(i) + uv.getY(i + 1) + uv.getY(i + 2)) / 3; }
        let tr = 1, tg = 1, tb = 1;
        if (tex && uv && mode === 'face') { const c = sample(tex, cu, cv); tr = c.r; tg = c.g; tb = c.b; }
        for (let j = i; j < i + 3; j++) {
          if (tex && uv && mode === 'vertex') { const c = sample(tex, uv.getX(j), uv.getY(j)); tr = c.r; tg = c.g; tb = c.b; }
          let r = base.r * tr, gg = base.g * tg, b = base.b * tb;
          if (vcol) { r *= vcol.getX(j); gg *= vcol.getY(j); b *= vcol.getZ(j); }
          if (tintCol) { r *= tintCol.r; gg *= tintCol.g; b *= tintCol.b; }
          if (hue) {
            _hc.setRGB(r, gg, b, THREE.LinearSRGBColorSpace).getHSL(_hsl, THREE.SRGBColorSpace);
            if (_hsl.s > 0.25) { _hc.setHSL((_hsl.h + hue / 360 + 1) % 1, _hsl.s, _hsl.l, THREE.SRGBColorSpace); r = _hc.r; gg = _hc.g; b = _hc.b; }
          }
          col[j * 3] = r; col[j * 3 + 1] = gg; col[j * 3 + 2] = b;
          surf[j * 2] = Math.round(props[0] * 255); surf[j * 2 + 1] = Math.round(props[1] * 255);
          info[j * 2] = layer; info[j * 2 + 1] = strength;
        }
      }
    }
    // makeProto merges parts, so every part needs exactly the attribute set build.js's finish() produces.
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', pos);
    out.setAttribute('normal', g.attributes.normal);
    out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2)); // procedural-detail UVs: unused at strength 0
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setAttribute('surface', new THREE.BufferAttribute(surf, 2, true));
    out.setAttribute('textureInfo', new THREE.BufferAttribute(info, 2));
    out.userData.surfaced = layer0(info);
    parts.push(out);
  });
  if (!parts.length) throw new Error(`protoFromGLTF(${name}): no meshes`);

  // 2. orient + scale (applied to every part; bbox only matters for target sizes)
  const M = new THREE.Matrix4().makeRotationY(rotY);
  const box = new THREE.Box3();
  for (const p of parts) { p.applyMatrix4(M); p.computeBoundingBox(); box.union(p.boundingBox); }
  const size = box.getSize(new THREE.Vector3());
  let k = scale ?? 1;
  if (scale === undefined && length) k = length / Math.max(size.x, size.z, 1e-6);
  else if (scale === undefined && height) k = height / Math.max(size.y, 1e-6);
  if (k !== 1) for (const p of parts) p.scale(k, k, k);
  for (const p of parts) if (p.userData.surfaced) bakePhysicalUVs(p); // world-size UVs for the procedural detail layer

  // 3. merge / recentre / radius / value via the shared path
  return makeProto(name, parts, protoOpts);
}

const SURF = {
  glass: [0.16, 0.12], metal: [0.28, 0.65], rubber: [0.94, 0], fabric: [0.88, 0], stone: [0.82, 0], paint: [0.38, 0.08],
  stucco: [0.9, 0], brick: [0.86, 0], roof: [0.79, 0], wood: [0.76, 0], foliage: [0.86, 0],
};
const layer0 = (info) => info.some((v, i) => i % 2 === 0 && v > 0);
// The detail-texture shader reads uv as physical size; give surfaced glTF parts triplanar-ish world UVs like finish() does.
function bakePhysicalUVs(g) {
  const p = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i += 3) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
    const axis = ny > nx && ny > nz ? 1 : nx > nz ? 0 : 2;
    for (let j = i; j < i + 3; j++) {
      const u = axis === 0 ? p.getZ(j) : p.getX(j);
      const v = axis === 1 ? -p.getZ(j) : p.getY(j);
      uv.setXY(j, u * 0.5, v * 0.5);
    }
  }
}
