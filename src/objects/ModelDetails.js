import * as THREE from 'three';
import { box } from './build.js';

function place(parts, opts) {
  const transform = new THREE.Matrix4().makeRotationY(opts.ry ?? 0);
  transform.setPosition(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  for (const part of parts) part.applyMatrix4(transform);
  return parts;
}

/** Wall centered on local X/Z, with Y measured from its base; holes use center coordinates. */
export function facadeWall(w, h, thickness, color, openings = [], opts = {}) {
  if (![w, h, thickness].every(Number.isFinite) || w <= 0 || h <= 0 || thickness <= 0) return [];
  const left = -w / 2, right = w / 2;
  const holes = [];
  const edges = new Set([0, h]);
  for (const opening of openings ?? []) {
    if (!opening || ![opening.x, opening.y, opening.width, opening.height].every(Number.isFinite)
      || opening.width <= 0 || opening.height <= 0) continue;
    const x0 = Math.max(left, opening.x - opening.width / 2);
    const x1 = Math.min(right, opening.x + opening.width / 2);
    const y0 = Math.max(0, opening.y - opening.height / 2);
    const y1 = Math.min(h, opening.y + opening.height / 2);
    if (x1 <= x0 || y1 <= y0) continue;
    holes.push({ x0, x1, y0, y1 });
    edges.add(y0); edges.add(y1);
  }
  const rows = [...edges].sort((a, b) => a - b);
  const parts = [];
  const addStrip = (x0, x1, y0, y1) => {
    if (x1 <= x0 || y1 <= y0) return;
    const strip = box(x1 - x0, y1 - y0, thickness, color, {
      x: (x0 + x1) / 2, y: (y0 + y1) / 2,
      surface: opts.surface ?? 'stucco',
      textureScale: opts.textureScale, textureStrength: opts.textureStrength,
    });
    // Align all strips to the facade origin, so the texture continues around openings.
    const { position, normal, uv } = strip.attributes;
    const repeat = (opts.textureScale ?? 1) / 2;
    for (let i = 0; i < position.count; i++) {
      const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i)), nz = Math.abs(normal.getZ(i));
      const axis = ny > nx && ny > nz ? 1 : nx > nz ? 0 : 2;
      uv.setXY(i, (axis === 0 ? position.getZ(i) : position.getX(i)) * repeat,
        (axis === 1 ? -position.getZ(i) : position.getY(i)) * repeat);
    }
    parts.push(strip);
  };
  for (let i = 0; i < rows.length - 1; i++) {
    const y0 = rows[i], y1 = rows[i + 1];
    const excluded = holes.filter((hole) => hole.y0 < y1 && hole.y1 > y0)
      .sort((a, b) => a.x0 - b.x0);
    let cursor = left;
    for (const hole of excluded) {
      addStrip(cursor, hole.x0, y0, y1);
      cursor = Math.max(cursor, hole.x1);
    }
    addStrip(cursor, right, y0, y1);
  }
  return place(parts, opts);
}

/** Opening dimensions w/h; pane at local Z=-depth, front trim at Z=+0.025. Y is window center. */
export function recessedWindow(w, h, depth, opts = {}) {
  if (![w, h, depth].every(Number.isFinite) || w <= 0 || h <= 0 || depth < 0) return [];
  const frame = Math.min(Math.max(opts.frame ?? 0.1, 0.001), w * 0.24, h * 0.24);
  const frameColor = opts.frameColor ?? 0xe8dfcc;
  const glassColor = opts.glassColor ?? 0x6c9caf;
  const jambColor = new THREE.Color(frameColor).multiplyScalar(0.72);
  const parts = [];
  const add = (width, height, d, color, x, y, z, surface = 'stone') => {
    parts.push(box(width, height, d, color, { x, y, z, surface }));
  };
  const sideX = (w - frame) / 2, edgeY = (h - frame) / 2;
  // Deep jambs expose actual shaded surfaces when viewed obliquely.
  if (depth > 0) {
    for (const x of [-sideX, sideX]) add(frame, h, depth, jambColor, x, 0, -depth / 2);
    for (const y of [-edgeY, edgeY]) add(w - frame * 2, frame, depth, jambColor, 0, y, -depth / 2);
  }
  for (const x of [-sideX, sideX]) add(frame, h, 0.05, frameColor, x, 0, 0);
  for (const y of [-edgeY, edgeY]) add(w - frame * 2, frame, 0.05, frameColor, 0, y, 0);
  add(w - frame * 2, h - frame * 2, 0.018, glassColor, 0, 0, -depth - 0.009, 'glass');
  // Sill projects beyond the wall face and the opening edges.
  add(w + frame, frame * 0.75, 0.22, frameColor, 0, -h / 2 - frame * 0.2, 0.05);
  if (opts.mullion) add(frame * 0.5, h - frame * 2, 0.04, frameColor, 0, 0, -depth + 0.02);
  return place(parts, opts);
}
