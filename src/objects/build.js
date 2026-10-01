// Primitive helpers for building swallowable objects, merged into ONE geometry per prototype.
// Parts use non-indexed geometry with baked vertex colour and compact surface properties.
// opts = { x, y, z, rx, ry, rz, sx, sy, sz }  (position / rotation in radians / scale). y is the CENTRE of the primitive.
// opts.emissive = true | 0-3: the part glows with its own vertex colour regardless of lighting (and feeds bloom).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TEXTURE_LAYERS, getTextureLibrary } from './TextureLibrary.js';

// Two shared object materials: Standard (High graphics, receives real shadows) and Lambert (Low graphics).
// `objectMaterial` is a live binding: Game calls setObjectQuality() when a world starts.
export const objectMaterialHigh = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });
export const objectMaterialLow = new THREE.MeshLambertMaterial({ vertexColors: true });
export const modelTimeUniform = { value: 0 };
// Instancing.js rewrites the literal `modelMatrix[` in these shader chunks to include instanceMatrix.
// Keep writing matrix access as `modelMatrix[...]` here, or instanced objects will mis-shade.
const windDeclarations = `attribute float wind;
uniform float uModelTime;
uniform float uModelWind;
vec3 swayCrown(vec3 p) {
  vec3 root = modelMatrix[3].xyz;
  float phase = root.x * 0.11 + root.z * 0.09;
  float amount = wind * uModelWind;
  p.x += sin(uModelTime * 0.78 + phase) * amount * 0.12;
  p.z += sin(uModelTime * 0.59 + phase + 1.7) * amount * 0.09;
  return p;
}`;
// Shadow geometry follows the same small crown deformation as the visible mesh.
export const objectDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
objectDepthMaterial.onBeforeCompile = shader => {
  shader.uniforms.uModelTime = modelTimeUniform;
  shader.uniforms.uModelWind = { value: 1 };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + windDeclarations)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = swayCrown(transformed);');
};
objectDepthMaterial.customProgramCacheKey = () => 'crown-wind-depth-v1';
// Surface properties travel with vertices, so mixed materials still use one draw call.
const EMISSIVE_GAIN = '1.8'; // radiance per unit of opts.emissive, before tone mapping
export function applyObjectSurfaces(material) {
  const high = !!material.isMeshStandardMaterial;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uModelTime = modelTimeUniform;
    shader.uniforms.uModelWind = { value: high ? 1 : 0 };
    const textures = getTextureLibrary(high);
    shader.uniforms.uModelColor = { value: textures.color };
    if (high) shader.uniforms.uModelDetail = { value: textures.detail };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
${windDeclarations}
attribute vec2 surface;
attribute vec2 textureInfo;
attribute float glow;
varying float vEmissive;
varying vec2 vSurface;
varying vec2 vModelUv;
varying vec2 vModelTexture;
varying float vModelHeight;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
transformed = swayCrown(transformed);
vEmissive = glow * 3.0; vSurface = surface; vModelUv = uv * length(modelMatrix[0].xyz); vModelTexture = textureInfo;
vModelHeight = transformed.y * length(modelMatrix[1].xyz);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vEmissive;
varying vec2 vSurface;
varying vec2 vModelUv;
varying vec2 vModelTexture;
varying float vModelHeight;
uniform highp sampler2DArray uModelColor;
${high ? `uniform highp sampler2DArray uModelDetail;
mat3 modelDetailFrame(vec3 p, vec3 n, vec2 uv) {
  vec3 q0 = dFdx(p), q1 = dFdy(p);
  vec2 st0 = dFdx(uv), st1 = dFdy(uv);
  vec3 q1perp = cross(q1, n), q0perp = cross(n, q0);
  vec3 t = q1perp * st0.x + q0perp * st1.x;
  vec3 b = q1perp * st0.y + q0perp * st1.y;
  float scale = inversesqrt(max(max(dot(t,t), dot(b,b)), 1e-12));
  return mat3(t * scale, b * scale, n);
}` : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec3 modelColor = texture(uModelColor, vec3(vModelUv, vModelTexture.x)).rgb;
float modelWeight = vModelTexture.y / 255.0;
diffuseColor.rgb *= mix(vec3(1.0), vec3(0.7) + modelColor * 0.6, modelWeight);
float masonry = step(0.5, vModelTexture.x) * (1.0 - step(3.5, vModelTexture.x));
diffuseColor.rgb *= 1.0 - masonry * modelWeight * 0.065 * exp(-max(0.0, vModelHeight) * 1.4);
diffuseColor.rgb *= mix(0.8, 1.0, smoothstep(0.0, 0.9, vModelHeight)); // contact shadow: objects look grounded`);
    // Emissive parts glow with their own vertex colour regardless of lighting (HDR: bloom picks up values > 1).
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vColor.rgb * (vEmissive * ${EMISSIVE_GAIN});`);
    if (high) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
vec4 modelDetail = texture(uModelDetail, vec3(vModelUv, vModelTexture.x));
roughnessFactor = clamp(vSurface.x * mix(1.0, 0.75 + modelDetail.a * 0.5, modelWeight), 0.04, 1.0);`)
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = clamp(vSurface.y, 0.0, 1.0);')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec3 detailNormal = modelDetail.rgb * 2.0 - 1.0;
detailNormal.xy *= modelWeight;
normal = normalize(modelDetailFrame(-vViewPosition, normal, vModelUv) * normalize(detailNormal));`);
    }
  };
  material.customProgramCacheKey = () => `object-textures-wind-ao-emissive-v1-${high ? 'high' : 'low'}`;
  return material;
}
applyObjectSurfaces(objectMaterialHigh);
applyObjectSurfaces(objectMaterialLow);
const SURFACES = {
  glass: [0.16, 0.12], metal: [0.28, 0.65], rubber: [0.94, 0],
  fabric: [0.88, 0], stone: [0.82, 0], paint: [0.38, 0.08],
  stucco: [0.9, 0], brick: [0.86, 0], roof: [0.79, 0], wood: [0.76, 0], foliage: [0.86, 0],
};
/** The single shared material used by every swallowable object. */
export let objectMaterial = objectMaterialHigh;
export function setObjectQuality(high, renderer) {
  objectMaterial = high ? objectMaterialHigh : objectMaterialLow;
  const textures = getTextureLibrary(high);
  const anisotropy = Math.min(high ? 4 : 2, renderer?.capabilities.getMaxAnisotropy() ?? 1);
  textures.color.anisotropy = anisotropy;
  if (textures.detail) textures.detail.anisotropy = anisotropy;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

// Explicit low segment counts (<= 8) keep the classic faceted look (flat normals) unless opts.flat says otherwise.
const isFlat = (o) => o.flat ?? (o.segments !== undefined && o.segments <= 8);

function finish(geo, color, o = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  if (o.flat) g.computeVertexNormals(); // non-indexed => per-face normals
  // Physical-size UVs are baked before rotating a part, so grain follows planks, roofs and animated limbs.
  g.computeBoundingBox();
  const b = g.boundingBox;
  const dimensions = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
  const scale = [o.sx ?? 1, o.sy ?? 1, o.sz ?? 1];
  const uv = g.attributes.uv ?? new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2);
  const position = g.attributes.position, normal = g.attributes.normal;
  const curved = ['SphereGeometry', 'CapsuleGeometry', 'CylinderGeometry', 'ConeGeometry', 'LatheGeometry', 'TorusGeometry'].includes(geo.type);
  const repeat = (o.textureScale ?? 1) / 2;
  const uvCos = Math.cos(o.textureRotation ?? 0), uvSin = Math.sin(o.textureRotation ?? 0);
  for (let i = 0; i < position.count; i += 3) {
    const nx = Math.abs(normal.getX(i) + normal.getX(i + 1) + normal.getX(i + 2));
    const ny = Math.abs(normal.getY(i) + normal.getY(i + 1) + normal.getY(i + 2));
    const nz = Math.abs(normal.getZ(i) + normal.getZ(i + 1) + normal.getZ(i + 2));
    const axis = ny > nx && ny > nz ? 1 : nx > nz ? 0 : 2;
    for (let j = i; j < i + 3; j++) {
      const cap = ny > 2.999 && nx + nz < 0.001;
      if (curved && (!cap || geo.type === 'SphereGeometry' || geo.type === 'CapsuleGeometry' || geo.type === 'TorusGeometry')) {
        const circumference = Math.PI * Math.max(dimensions[0] * scale[0], dimensions[2] * scale[2]);
        uv.setXY(j, uv.getX(j) * circumference * repeat, uv.getY(j) * dimensions[1] * scale[1] * repeat);
      } else {
        const u = axis === 0 ? position.getZ(j) * scale[2] : position.getX(j) * scale[0];
        const v = axis === 1 ? -position.getZ(j) * scale[2] : position.getY(j) * scale[1];
        uv.setXY(j, u * repeat, v * repeat);
      }
      const u = uv.getX(j), v = uv.getY(j);
      uv.setXY(j, u * uvCos - v * uvSin, u * uvSin + v * uvCos);
    }
  }
  g.setAttribute('uv', uv);
  _e.set(o.rx || 0, o.ry || 0, o.rz || 0);
  _q.setFromEuler(_e);
  _p.set(o.x || 0, o.y || 0, o.z || 0);
  _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  _m.compose(_p, _q, _s);
  g.applyMatrix4(_m);
  _c.set(color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = _c.r;
    col[i * 3 + 1] = _c.g;
    col[i * 3 + 2] = _c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const properties = SURFACES[o.surface] ?? [0.75, 0];
  const surface = new Uint8Array(n * 2);
  for (let i = 0; i < n; i++) {
    surface[i * 2] = Math.round(properties[0] * 255);
    surface[i * 2 + 1] = Math.round(properties[1] * 255);
  }
  g.setAttribute('surface', new THREE.BufferAttribute(surface, 2, true));
  const textureInfo = new Uint8Array(n * 2);
  const layer = TEXTURE_LAYERS[o.surface] ?? 0;
  const strength = layer ? Math.round(Math.max(0, Math.min(1, o.textureStrength ?? 1)) * 255) : 0;
  for (let i = 0; i < n; i++) {
    textureInfo[i * 2] = layer;
    textureInfo[i * 2 + 1] = strength;
  }
  g.setAttribute('textureInfo', new THREE.BufferAttribute(textureInfo, 2));
  // opts.emissive: true | strength 0-3 (stored as a normalized 8-bit 'glow' attribute). Default 0.
  const glow = Math.round(THREE.MathUtils.clamp(o.emissive === true ? 1 : (o.emissive || 0), 0, 3) / 3 * 255);
  g.setAttribute('glow', new THREE.BufferAttribute(new Uint8Array(n).fill(glow), 1, true));
  return g;
}
/** Mark already-built parts (e.g. helper output) emissive; with `color`, only parts whose vertex colour matches it. */
export function emissiveParts(parts, strength = 1, color) {
  const target = color === undefined ? null : new THREE.Color(color);
  const value = Math.round(THREE.MathUtils.clamp(strength, 0, 3) / 3 * 255);
  for (const part of parts) {
    const c = part.attributes.color, glow = part.attributes.glow;
    if (!glow || !c) continue;
    if (target && (Math.abs(c.getX(0) - target.r) > 1e-3 || Math.abs(c.getY(0) - target.g) > 1e-3 || Math.abs(c.getZ(0) - target.b) > 1e-3)) continue;
    glow.array.fill(value);
  }
  return parts;
}
const withFlat = (o) => (o.flat === undefined && isFlat(o) ? { ...o, flat: true } : o);

export const box = (w, h, d, color, opts) => finish(new THREE.BoxGeometry(w, h, d), color, opts);
/** Rounded/beveled box. opts.bevel default 12% of the smallest dimension (clamped to <= 45%), opts.segments default 2. */
export const rbox = (w, h, d, color, opts = {}) => {
  const m = Math.min(w, h, d);
  const bevel = Math.max(0.001, Math.min(opts.bevel ?? m * 0.12, m * 0.45));
  return finish(new RoundedBoxGeometry(w, h, d, opts.segments ?? 2, bevel), color, opts);
};
export const cyl = (rTop, rBottom, h, color, opts = {}) =>
  finish(new THREE.CylinderGeometry(rTop, rBottom, h, opts.segments ?? 20), color, withFlat(opts));
export const cone = (r, h, color, opts = {}) =>
  finish(new THREE.ConeGeometry(r, h, opts.segments ?? 20), color, withFlat(opts));
export const sphere = (r, color, opts = {}) =>
  finish(new THREE.SphereGeometry(r, opts.segments ?? 20, opts.rings ?? 14), color, withFlat(opts));
export const torus = (R, r, color, opts = {}) =>
  finish(new THREE.TorusGeometry(R, r, opts.radial ?? 10, opts.segments ?? 24), color, withFlat(opts));
/** Capsule with its axis along Y: total length = len + 2r. opts.segments radial (default 16), opts.caps cap rings (default 6). */
export const capsule = (r, len, color, opts = {}) =>
  finish(new THREE.CapsuleGeometry(r, len, opts.caps ?? 6, opts.segments ?? 16), color, withFlat(opts));
/**
 * Surface of revolution around Y (vases, domes, towers, bottles). points = [[radius, y], ...] profile listed
 * bottom -> top (the profile y values are used as-is; then opts.y etc. apply). opts.segments default 20.
 */
export const lathe = (points, color, opts = {}) =>
  finish(new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(p[0], p[1])), opts.segments ?? 20), color, withFlat(opts));
/**
 * Extrude a 2D outline (array of [x,y], counter-clockwise or clockwise) by `depth` along Z; centred on z=0.
 * opts.bevel (default 0) rounds the edges (bevel size/thickness); the outline grows by `bevel` on every side.
 * Use rx/ry to stand it up (arches, roof gables, signs).
 */
export const extrude = (shapePoints, depth, color, opts = {}) => {
  const shape = new THREE.Shape(shapePoints.map((p) => new THREE.Vector2(p[0], p[1])));
  const bevel = opts.bevel ?? 0;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: opts.segments ?? 2, curveSegments: 12,
  });
  g.translate(0, 0, -depth / 2);
  return finish(g, color, opts);
};

/** Map palettes can label familiar building materials; explicit part options take precedence. */
export function paletteBuilders(entries) {
  const palette = new Map(entries);
  const wrap = (fn, colorIndex) => (...args) => {
    args[colorIndex + 1] = { surface: palette.get(args[colorIndex]), ...(args[colorIndex + 1] ?? {}) };
    return fn(...args);
  };
  return {
    box: wrap(box, 3), rbox: wrap(rbox, 3), cyl: wrap(cyl, 3), cone: wrap(cone, 2),
    sphere: wrap(sphere, 1), torus: wrap(torus, 2), capsule: wrap(capsule, 2),
    lathe: wrap(lathe, 1), extrude: wrap(extrude, 2),
  };
}

/**
 * Merge parts into one prototype. Recentres so bbox centre is at x=z=0 and min y=0.
 * radius = half the larger XZ bbox extent (opts.radius overrides), height = bbox height,
 * Parts keep their own normals (smooth round parts, crisp boxes); a dev warning fires above 80k vertices.
 * value = opts.value ?? radius^2 * clamp(height, 0.5, 6) * 0.5.
 * opts.move = { type: 'walk'|'drive', speed, range } makes every placed instance wander (see game/Movers.js).
 * Returns { name, geometry, radius, height, value, move }.
 */
/** Mark a rigid part for movement without adding meshes or changing its rest geometry. */
export function articulate(geometry, kind, pivot, options = {}) {
  geometry.userData.articulation = { kind, pivot: [...pivot], ...options };
  return geometry;
}

/** Rebuild height weights after a simplified model is aligned to its full-detail bounds. */
export function applyWindWeights(geometry, startY) {
  geometry.computeBoundingBox();
  const wind = new Uint8Array(geometry.attributes.position.count);
  if (Number.isFinite(startY)) {
    const span = Math.max(0.1, geometry.boundingBox.max.y - startY);
    for (let i = 0; i < wind.length; i++) {
      const t = THREE.MathUtils.clamp((geometry.attributes.position.getY(i) - startY) / span, 0, 1);
      wind[i] = Math.round(t * t * (3 - 2 * t) * 255);
    }
    geometry.computeBoundingSphere();
    geometry.boundingSphere.radius += 0.2;
  }
  geometry.setAttribute('wind', new THREE.BufferAttribute(wind, 1, true));
}

// ---- baked vertex ambient occlusion ---------------------------------------------------------------
// Each proto's triangles are rasterised into a coarse voxel grid; every vertex then marches a handful of
// cosine-weighted rays along its normal hemisphere. The occluded fraction darkens the vertex colour, so it works
// with the High (Standard) and Low (Lambert) materials and every fall/fade clone. Downward-facing vertices also
// treat the y=0 ground as an occluder (under vehicles, eaves, between wheels). The contact shadow for side faces
// near the ground lives in the shared shader (vModelHeight), because a per-vertex gradient would smear across tall walls.
export const aoConfig = { enabled: true, strength: 0.65 };
export const aoStats = { ms: 0, protos: 0 };
if (import.meta.env?.DEV) { globalThis.__ao = { config: aoConfig, stats: aoStats }; } // dev harness hook
let aoGrid = new Uint8Array(1 << 18);

function bakeVertexAO(geometry, strength, maxDimHint) {
  const t0 = performance.now();
  const pos = geometry.attributes.position, nor = geometry.attributes.normal, colA = geometry.attributes.color;
  const n = pos.count;
  if (!nor || !colA || n < 3) return;
  const P = pos.array, NA = nor.array, C = colA.array;
  const b = geometry.boundingBox;
  const ex = b.max.x - b.min.x, ey = b.max.y - b.min.y, ez = b.max.z - b.min.z;
  const maxDim = Math.max(ex, ey, ez, 1e-3);
  const res = 40;
  const h = maxDim / res;
  const pad = 2;
  const nx = Math.ceil(ex / h) + 2 * pad + 1, ny = Math.ceil(ey / h) + 2 * pad + 1, nz = Math.ceil(ez / h) + 2 * pad + 1;
  const cells = nx * ny * nz;
  if (aoGrid.length < cells) aoGrid = new Uint8Array(cells);
  const grid = aoGrid;
  grid.fill(0, 0, cells);
  const ox = b.min.x - pad * h, oy = b.min.y - pad * h, oz = b.min.z - pad * h;
  const inv = 1 / h;
  const mark = (x, y, z) => {
    grid[(Math.floor((z - oz) * inv) * ny + Math.floor((y - oy) * inv)) * nx + Math.floor((x - ox) * inv)] = 1;
  };
  for (let i = 0; i < n; i += 3) {
    const a = i * 3, bb = a + 3, c = a + 6;
    const e1 = Math.hypot(P[bb] - P[a], P[bb + 1] - P[a + 1], P[bb + 2] - P[a + 2]);
    const e2 = Math.hypot(P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]);
    const e3 = Math.hypot(P[c] - P[bb], P[c + 1] - P[bb + 1], P[c + 2] - P[bb + 2]);
    const k = Math.min(160, Math.max(1, Math.ceil(Math.max(e1, e2, e3) / (h * 0.7))));
    for (let u = 0; u <= k; u++) {
      for (let v = 0; v <= k - u; v++) {
        const fu = u / k, fv = v / k, fw = 1 - fu - fv;
        mark(P[a] * fw + P[bb] * fu + P[c] * fv, P[a + 1] * fw + P[bb + 1] * fu + P[c + 1] * fv, P[a + 2] * fw + P[bb + 2] * fu + P[c + 2] * fv);
      }
    }
  }
  const rays = n > 24000 ? 5 : n > 8000 ? 8 : 12;
  // Fibonacci cosine-weighted hemisphere directions in tangent space (z = along the normal).
  const dirs = [];
  for (let k = 0; k < rays; k++) {
    const r = Math.sqrt((k + 0.5) / rays), phi = k * 2.399963;
    dirs.push(r * Math.cos(phi), r * Math.sin(phi), Math.sqrt(Math.max(0, 1 - r * r)));
  }
  const maxDist = Math.min(3.5, Math.max(0.6, maxDimHint * 0.25));
  const step = h * 0.75;
  const steps = Math.max(1, Math.floor(maxDist / step));
  const lift = 1.6 * h;
  // Non-indexed geometry repeats each smooth vertex in ~6 triangles: compute AO once per unique (position, normal).
  let cap = 1; while (cap < n * 2) cap <<= 1;
  const table = new Int32Array(cap).fill(-1), factor = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    let hs = Math.imul(Math.round(P[i3] * 2000), 73856093) ^ Math.imul(Math.round(P[i3 + 1] * 2000), 19349663) ^ Math.imul(Math.round(P[i3 + 2] * 2000), 83492791)
      ^ Math.imul(Math.round(NA[i3] * 50) + 101, 668265263) ^ Math.imul(Math.round(NA[i3 + 1] * 50) + 57, 374761393) ^ Math.imul(Math.round(NA[i3 + 2] * 50) + 13, 2246822519);
    hs = (Math.imul(hs ^ (hs >>> 15), 2246822519) >>> 0) & (cap - 1);
    let rep = -1;
    while (table[hs] >= 0) {
      const j = table[hs], j3 = j * 3;
      if (Math.abs(P[j3] - P[i3]) < 5e-4 && Math.abs(P[j3 + 1] - P[i3 + 1]) < 5e-4 && Math.abs(P[j3 + 2] - P[i3 + 2]) < 5e-4
        && Math.abs(NA[j3] - NA[i3]) < 0.02 && Math.abs(NA[j3 + 1] - NA[i3 + 1]) < 0.02 && Math.abs(NA[j3 + 2] - NA[i3 + 2]) < 0.02) { rep = j; break; }
      hs = (hs + 1) & (cap - 1);
    }
    if (rep >= 0) { factor[i] = factor[rep]; continue; }
    table[hs] = i;
    const nxv = NA[i * 3], nyv = NA[i * 3 + 1], nzv = NA[i * 3 + 2];
    // tangent frame
    let tx, ty, tz;
    if (Math.abs(nyv) < 0.9) { tx = nzv; ty = 0; tz = -nxv; } else { tx = 0; ty = -nzv; tz = nyv; }
    const tl = 1 / Math.hypot(tx, ty, tz); tx *= tl; ty *= tl; tz *= tl;
    const bx = nyv * tz - nzv * ty, by = nzv * tx - nxv * tz, bz = nxv * ty - nyv * tx;
    const spin = ((Math.imul(i, 2654435761) >>> 8) & 1023) / 1023 * 6.2832, cs = Math.cos(spin), sn = Math.sin(spin);
    const sx = P[i * 3] + nxv * lift, sy = P[i * 3 + 1] + nyv * lift, sz = P[i * 3 + 2] + nzv * lift;
    const down = nyv < -0.3;
    let occ = 0;
    for (let k = 0; k < rays; k++) {
      const dx0 = dirs[k * 3] * cs - dirs[k * 3 + 1] * sn, dy0 = dirs[k * 3] * sn + dirs[k * 3 + 1] * cs, dz0 = dirs[k * 3 + 2];
      const dx = tx * dx0 + bx * dy0 + nxv * dz0, dy = ty * dx0 + by * dy0 + nyv * dz0, dz = tz * dx0 + bz * dy0 + nzv * dz0;
      let hit = 0;
      if (down && dy < -0.05 && (sy <= 0 || sy / -dy < maxDist)) hit = 1; // ground plane occluder
      else {
        for (let s = 1; s <= steps; s++) {
          const d = s * step;
          const gx = Math.floor((sx + dx * d - ox) * inv), gy = Math.floor((sy + dy * d - oy) * inv), gz = Math.floor((sz + dz * d - oz) * inv);
          if (gx < 0 || gy < 0 || gz < 0 || gx >= nx || gy >= ny || gz >= nz) break;
          if (grid[(gz * ny + gy) * nx + gx]) { hit = 1 - 0.5 * (d / maxDist); break; }
        }
      }
      occ += hit;
    }
    const f = 1 - Math.min(1, (occ / rays) * 1.15) * strength;
    factor[i] = f;
  }
  const em = geometry.attributes.glow;
  for (let i = 0; i < n; i++) { const f = em && em.getX(i) > 0 ? 1 : factor[i]; C[i * 3] *= f; C[i * 3 + 1] *= f; C[i * 3 + 2] *= f; }
  colA.needsUpdate = true;
  aoStats.ms += performance.now() - t0;
  aoStats.protos++;
}

export function makeProto(name, parts, opts = {}) {
  let start = 0;
  const articulation = [];
  for (const part of parts) {
    const count = part.attributes.position.count;
    if (part.userData.articulation) articulation.push({ ...part.userData.articulation, start, count });
    start += count;
  }
  // Parts built outside finish() (glTF imports) lack the emissive attribute: default 0 so the merge matches.
  for (const part of parts) {
    if (!part.attributes.glow) part.setAttribute('glow', new THREE.BufferAttribute(new Uint8Array(part.attributes.position.count), 1, true));
  }
  const geometry = mergeGeometries(parts, false);
  if (!geometry) throw new Error(`makeProto(${name}): parts have mismatched attributes`);
  parts.forEach((p) => p.dispose());
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  const offset = [-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2];
  geometry.translate(...offset);
  for (const part of articulation) {
    part.pivot = part.pivot.map((v, i) => v + offset[i]);
    if (part.hip) part.hip = part.hip.map((v, i) => v + offset[i]);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const sx = b.max.x - b.min.x;
  const sz = b.max.z - b.min.z;
  const height = b.max.y - b.min.y;
  applyWindWeights(geometry, Number.isFinite(opts.windStart) ? opts.windStart + offset[1] : undefined);
  if (opts.ao !== false && aoConfig.enabled) bakeVertexAO(geometry, opts.aoStrength ?? aoConfig.strength, Math.max(sx, height, sz));
  const radius = opts.radius ?? Math.max(sx, sz) / 2;
  const verts = geometry.attributes.position.count;
  if (import.meta.env?.DEV && verts > 80000) console.warn(`makeProto(${name}): ${verts} vertices exceeds the 80k budget`);
  const value = opts.value ?? radius * radius * Math.min(6, Math.max(0.5, height)) * 0.5;
  return { name, geometry, radius, height, value, move: opts.move ?? null, articulation, windStart: opts.windStart, sway: opts.sway ?? null };
}
