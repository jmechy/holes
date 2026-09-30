// Primitive helpers for building swallowable objects, merged into ONE geometry per prototype.
// All parts: non-indexed BufferGeometry with position/normal/color attributes (per-vertex colour baked in).
// opts = { x, y, z, rx, ry, rz, sx, sy, sz }  (position / rotation in radians / scale). y is the CENTRE of the primitive.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Two shared object materials: Standard (High graphics, receives real shadows) and Lambert (Low graphics).
// `objectMaterial` is a live binding: Game calls setObjectQuality() when a world starts.
export const objectMaterialHigh = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });
export const objectMaterialLow = new THREE.MeshLambertMaterial({ vertexColors: true });
/** The single shared material used by every swallowable object. */
export let objectMaterial = objectMaterialHigh;
export function setObjectQuality(high) {
  objectMaterial = high ? objectMaterialHigh : objectMaterialLow;
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
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  if (o.flat) g.computeVertexNormals(); // non-indexed => per-face normals
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
  return g;
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

/**
 * Merge parts into one prototype. Recentres so bbox centre is at x=z=0 and min y=0.
 * radius = half the larger XZ bbox extent (opts.radius overrides), height = bbox height,
 * Parts keep their own normals (smooth round parts, crisp boxes); a dev warning fires above 80k vertices.
 * value = opts.value ?? radius^2 * clamp(height, 0.5, 6) * 0.5.
 * opts.move = { type: 'walk'|'drive', speed, range } makes every placed instance wander (see game/Movers.js).
 * Returns { name, geometry, radius, height, value, move }.
 */
export function makeProto(name, parts, opts = {}) {
  const geometry = mergeGeometries(parts, false);
  if (!geometry) throw new Error(`makeProto(${name}): parts have mismatched attributes`);
  parts.forEach((p) => p.dispose());
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  geometry.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const sx = b.max.x - b.min.x;
  const sz = b.max.z - b.min.z;
  const height = b.max.y - b.min.y;
  const radius = opts.radius ?? Math.max(sx, sz) / 2;
  const verts = geometry.attributes.position.count;
  if (import.meta.env?.DEV && verts > 80000) console.warn(`makeProto(${name}): ${verts} vertices exceeds the 80k budget`);
  const value = opts.value ?? radius * radius * Math.min(6, Math.max(0.5, height)) * 0.5;
  return { name, geometry, radius, height, value, move: opts.move ?? null };
}
