import * as THREE from 'three';

// Each array layer repeats independently. Suggested world-space tile span: 2 m.
export const TEXTURE_LAYERS = Object.freeze({
  none: 0, stone: 1, stucco: 2, brick: 3, roof: 4, wood: 5,
  metal: 6, rubber: 7, fabric: 8, foliage: 9, paint: 10, glass: 11,
});

const caches = new Map();
const TAU = Math.PI * 2;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const fract = (v) => v - Math.floor(v);

function hash(x, y, seed) {
  let n = Math.imul(x + seed * 101, 374761393) ^ Math.imul(y + seed * 37, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

// Small periodic noise grids are shared by all pixels of a layer.
function noiseGrid(period, seed) {
  const grid = new Float32Array(period * period);
  for (let y = 0; y < period; y++) {
    for (let x = 0; x < period; x++) grid[y * period + x] = hash(x, y, seed) - 0.5;
  }
  return grid;
}

function noise(grid, period, u, v) {
  const x = fract(u) * period;
  const y = fract(v) * period;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const nx = (ix + 1) % period;
  const ny = (iy + 1) % period;
  const a = grid[iy * period + ix];
  const b = grid[iy * period + nx];
  const c = grid[ny * period + ix];
  const d = grid[ny * period + nx];
  return a + (b - a) * sx + (c - a + (d - c - b + a) * sx) * sy;
}

function edge(distance, width) {
  const t = clamp(distance / width, 0, 1);
  return t * t * (3 - 2 * t);
}

function makeTexture(data, size, color) {
  const texture = new THREE.DataArrayTexture(data, size, size, 12);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.colorSpace = color ? THREE.LinearSRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Cached CPU-generated material arrays; callers must not dispose shared maps. */
export function getTextureLibrary(high = true) {
  const key = Boolean(high);
  if (caches.has(key)) return caches.get(key);
  const size = key ? 512 : 256;
  const area = size * size;
  const colors = new Uint8Array(area * 12 * 4);
  const details = key ? new Uint8Array(colors.length) : null;
  const heights = key ? new Float32Array(area) : null;

  for (let layer = 0; layer < 12; layer++) {
    const broad = noiseGrid(8, layer + 1);
    const medium = noiseGrid(32, layer + 17);
    const fine = noiseGrid(128, layer + 43);
    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const n = noise(broad, 8, u, v);
        const m = noise(medium, 32, u, v);
        const f = noise(fine, 128, u, v);
        let tone = 0, height = 0, roughness = 0, warmth = 0;
        switch (layer) {
          case 1: // Weathered stone, with rounded, irregular mineral patches.
            tone = n * 0.13 + m * 0.05 + f * 0.018;
            height = n * 0.008 + m * 0.002;
            roughness = m * 0.16; warmth = n * 0.025;
            break;
          case 2: // Fine plaster relief.
            tone = n * 0.12 + m * 0.045 + f * 0.055;
            height = n * 0.001 + m * 0.0016 + f * 0.0008;
            roughness = f * 0.15;
            break;
          case 3: {
            const row = Math.floor(v * 4);
            const bx = fract(u * 4 + (row % 2) * 0.5);
            const by = fract(v * 4);
            const face = edge(Math.min(bx, 1 - bx), 0.035) * edge(Math.min(by, 1 - by), 0.055);
            const variation = hash(Math.floor(u * 4 + (row % 2) * 0.5) % 4, row, 91) - 0.5;
            tone = (1 - face) * -0.17 + face * variation * 0.065 + m * 0.035;
            height = face * 0.007 + m * 0.0006;
            warmth = face * 0.015; roughness = (1 - face) * 0.12 + f * 0.1;
            break;
          }
          case 4: { // Four columns and five rows of curved terracotta tiles.
            const tx = fract(u * 4);
            const ty = fract(v * 5);
            const rim = edge(Math.min(tx, 1 - tx), 0.055) * edge(Math.min(ty, 1 - ty), 0.065);
            const curve = Math.sin(tx * Math.PI);
            tone = (1 - rim) * -0.16 + curve * 0.06 - 0.025 + n * 0.025;
            height = rim * (0.006 + curve * 0.009);
            roughness = m * 0.1; warmth = rim * 0.012;
            break;
          }
          case 5: {
            const plank = fract(u * 5);
            const face = edge(Math.min(plank, 1 - plank), 0.025);
            const grain = Math.sin(TAU * (u * 42 + noise(broad, 8, u, v) * 0.65));
            const longGrain = noise(broad, 8, u * 4, v);
            tone = grain * 0.022 + longGrain * 0.035 + n * 0.025 - (1 - face) * 0.11;
            height = face * 0.002 + grain * 0.00035;
            roughness = grain * 0.04; warmth = grain * 0.008;
            break;
          }
          case 6: {
            const brush = Math.sin(TAU * u * 112) * 0.5 + Math.sin(TAU * u * 67) * 0.3;
            tone = brush * 0.012 + n * 0.014;
            height = brush * 0.00012; roughness = brush * 0.075;
            break;
          }
          case 7: {
            const tread = edge(Math.abs(Math.sin(TAU * (u * 8 + v * 8))), 0.3);
            tone = (tread - 0.7) * 0.055 + f * 0.02;
            height = tread * 0.002; roughness = f * 0.1;
            break;
          }
          case 8: {
            const warp = Math.cos(TAU * u * 64);
            const weft = Math.cos(TAU * v * 64);
            tone = (warp + weft) * 0.015 + m * 0.015;
            height = (warp + weft) * 0.00022;
            roughness = (warp * weft) * 0.05;
            break;
          }
          case 9:
            tone = n * 0.1 + m * 0.065 + f * 0.025;
            height = n * 0.004 + m * 0.001;
            roughness = m * 0.1; warmth = -m * 0.02;
            break;
          case 10:
            tone = n * 0.013 + f * 0.009;
            height = f * 0.0001; roughness = m * 0.06;
            break;
          case 11:
            tone = n * 0.012;
            height = n * 0.0001; roughness = n * 0.025;
            break;
        }
        const pixel = y * size + x;
        const offset = (layer * area + pixel) * 4;
        colors[offset] = Math.round(clamp(0.5 + tone + warmth, 0, 1) * 255);
        colors[offset + 1] = Math.round(clamp(0.5 + tone, 0, 1) * 255);
        colors[offset + 2] = Math.round(clamp(0.5 + tone - warmth, 0, 1) * 255);
        colors[offset + 3] = 255;
        if (details) {
          heights[pixel] = height;
          details[offset + 3] = Math.round(clamp(0.5 + roughness, 0, 1) * 255);
        }
      }
    }
    if (details) {
      for (let y = 0; y < size; y++) {
        const up = ((y + size - 1) % size) * size;
        const down = ((y + 1) % size) * size;
        for (let x = 0; x < size; x++) {
          const nx = -(heights[y * size + (x + 1) % size] - heights[y * size + (x + size - 1) % size]) * size * 0.5;
          const ny = -(heights[down + x] - heights[up + x]) * size * 0.5;
          const inverseLength = 1 / Math.sqrt(nx * nx + ny * ny + 1);
          const offset = (layer * area + y * size + x) * 4;
          details[offset] = Math.round((nx * inverseLength * 0.5 + 0.5) * 255);
          details[offset + 1] = Math.round((ny * inverseLength * 0.5 + 0.5) * 255);
          details[offset + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
        }
      }
    }
  }
  const library = {
    color: makeTexture(colors, size, true),
    detail: details ? makeTexture(details, size, false) : null,
    size,
  };
  caches.set(key, library);
  return library;
}
