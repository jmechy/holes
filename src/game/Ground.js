// Ground plane + decals share one fragment hook that `discard`s pixels inside any hole circle and adds
// procedural surface detail (world-space value noise / fbm, per-style patterns). Both are lit materials so they
// receive real shadows (Standard on High graphics, Lambert on Low).
import * as THREE from 'three';

export const MAX_HOLES = 8;

/** Shared uniforms: uHoles[i] = (x, z, radius); Game writes these every frame. */
export const holeUniforms = {
  uHoles: { value: Array.from({ length: MAX_HOLES }, () => new THREE.Vector3(0, 0, -1)) },
  uHoleCount: { value: 0 },
};
/** Seconds; drives water ripples and drifting cloud shadows. Game advances it every frame. */
export const timeUniform = { value: 0 };

// Set by Game before a world is built.
const gfx = { high: true, cloudShade: true };
export function setGroundQuality(high, cloudShade) {
  gfx.high = high;
  gfx.cloudShade = high && cloudShade;
}

// Tileable smooth noise baked once on the CPU (R/G/B = three independent fbm fields, 16 lattice cells per tile) and
// sampled in the shaders: one texture fetch per octave instead of a dozen hash evaluations per pixel.
const NOISE_SIZE = 256, NOISE_CELLS = 16;
let noiseTex = null;
function getNoiseTexture() {
  if (noiseTex) return noiseTex;
  const N = NOISE_SIZE, data = new Uint8Array(N * N * 4);
  for (let ch = 0; ch < 3; ch++) {
    // Periodic value-noise lattices at 1x, 2x and 4x density for this channel.
    const oct = [1, 2, 4].map((m, k) => {
      const c = NOISE_CELLS * m, l = new Float32Array(c * c);
      let a = (ch * 7919 + k * 104729 + 12345) >>> 0;
      for (let i = 0; i < l.length; i++) { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; l[i] = a / 4294967296; }
      return { c, l, w: [0.55, 0.3, 0.15][k] };
    });
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let v = 0;
        for (const o of oct) {
          const fx = (x / N) * o.c, fy = (y / N) * o.c;
          const ix = Math.floor(fx), iy = Math.floor(fy);
          let tx = fx - ix, ty = fy - iy;
          tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
          const x1 = (ix + 1) % o.c, y1 = (iy + 1) % o.c, c = o.c;
          const a0 = o.l[iy * c + ix], b0 = o.l[iy * c + x1], c0 = o.l[y1 * c + ix], d0 = o.l[y1 * c + x1];
          v += o.w * (a0 + (b0 - a0) * tx + (c0 - a0) * ty + (a0 - b0 - c0 + d0) * tx * ty);
        }
        data[(y * N + x) * 4 + ch] = Math.max(0, Math.min(255, Math.round(v * 255)));
      }
    }
  }
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  noiseTex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.magFilter = THREE.LinearFilter;
  noiseTex.minFilter = THREE.LinearFilter;
  noiseTex.generateMipmaps = false;
  noiseTex.needsUpdate = true;
  return noiseTex;
}

export const GROUND_STYLES = ['grass', 'dirt', 'sand', 'asphalt', 'concrete', 'regolith', 'voxel', 'water'];

const NOISE_GLSL = `
uniform float uTime;
uniform sampler2D uNoise;
float hash21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
// vnoise(p): smooth noise, ~1 lattice cell per unit of p (tile = 16 cells).  fbm: three cheap fetches.
float vnoise(vec2 p) { return texture2D(uNoise, p * (1.0 / 16.0)).r; }
float fbm(vec2 p) {
  vec2 q = p * (1.0 / 16.0);
  return 0.62 * texture2D(uNoise, q).g + 0.38 * texture2D(uNoise, q * 3.07 + vec2(0.31, 0.17)).b;
}
float waveH(vec2 p) { vec2 t = vec2(uTime * 0.28, uTime * 0.11) * (1.0 / 16.0); return 1.2 * texture2D(uNoise, p * 0.45 * (1.0 / 16.0) + t).g + 0.6 * texture2D(uNoise, p * 1.3 * (1.0 / 16.0) - t * 2.0).b - 0.4; }
`;

// Each body returns a colour multiplier for world position p (xz).
const STYLE_BODY = {
  none: `float nc = fbm(p * 0.07) - 0.5;
    return vec3(1.0 + nc * 0.6 + (vnoise(p * 1.7) - 0.5) * 0.16);`,
  grass: `float nc = fbm(p * 0.06) - 0.5; float m = fbm(p * 0.35 + 7.0) - 0.5; float f = vnoise(p * 5.0) - 0.5;
    float band = sin((p.x + p.y) * 0.63) * 0.025;
    return vec3(1.0 + nc * 0.9, 1.0 + nc * 0.55, 1.0 + m * 0.6) * (1.0 + f * 0.28 + band);`,
  dirt: `float nc = fbm(p * 0.09) - 0.5; float peb = smoothstep(0.62, 0.7, vnoise(p * 3.1)) * -0.12; float sp = (vnoise(p * 7.0) - 0.5) * 0.24;
    return vec3(1.0, 0.96, 0.9) * (1.0 + nc * 0.85 + sp + peb);`,
  sand: `float rip = sin(p.x * 0.5 + p.y * 0.3 + fbm(p * 0.05) * 8.0) * 0.05; float sp = (vnoise(p * 9.0) - 0.5) * 0.2;
    return vec3(1.0, 0.98, 0.94) * (1.0 + (fbm(p * 0.04) - 0.5) * 0.5 + rip + sp);`,
  asphalt: `float sp = (vnoise(p * 9.0) - 0.5) * 0.34 + (vnoise(p * 23.0) - 0.5) * 0.18;
    return vec3(1.0 + (fbm(p * 0.12) - 0.5) * 0.4 + sp);`,
  concrete: `vec2 g = p / 4.0; vec2 f = abs(fract(g) - 0.5); float edge = max(f.x, f.y);
    float fade = 1.0 - clamp(fwidth(g.x) * 6.0, 0.0, 1.0);
    float joint = smoothstep(0.47, 0.495, edge) * fade;
    return vec3(1.0 + (hash21(floor(g)) - 0.5) * 0.1 - joint * 0.2 + (vnoise(p * 8.0) - 0.5) * 0.2 + (fbm(p * 0.1) - 0.5) * 0.3);`,
  regolith: `float nc = fbm(p * 0.05) - 0.5; float c = fbm(p * 0.3 + 3.0) - 0.5; float pit = smoothstep(0.6, 0.8, vnoise(p * 0.9)) * -0.12;
    return vec3(1.0 + nc * 0.75 + c * 0.5 + (vnoise(p * 6.0) - 0.5) * 0.24 + pit);`,
  voxel: `return vec3(0.9 + hash21(floor(p * 0.5)) * 0.1 + hash21(floor(p * 2.0)) * 0.07 + hash21(floor(p * 0.125)) * 0.05);`,
  water: `float h0 = waveH(p); float sp = pow(smoothstep(0.3, 0.9, vnoise(p * 3.0 + vec2(uTime * 1.3, uTime * 0.9))), 6.0) * 0.5;
    return vec3(0.92 + (h0 - 0.5) * 0.55 + sp);`,
};

function patch(material, style, water, noHoles) {
  const key = STYLE_BODY[style] ? style : 'none';
  const cloud = gfx.cloudShade;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHoles = holeUniforms.uHoles;
    shader.uniforms.uHoleCount = holeUniforms.uHoleCount;
    shader.uniforms.uTime = timeUniform;
    shader.uniforms.uNoise = { value: getNoiseTexture() };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHolePos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHolePos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    let frag = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vHolePos;
uniform vec3 uHoles[${MAX_HOLES}];
uniform int uHoleCount;
${NOISE_GLSL}
vec3 styleTint(vec2 p) { ${STYLE_BODY[key]} }
float cloudShade(vec2 p) { return ${cloud ? '1.0 - 0.13 * smoothstep(0.5, 0.68, texture2D(uNoise, p * (0.011 / 16.0) + vec2(uTime * 0.02, uTime * 0.008) * (1.0 / 16.0)).g)' : '1.0'}; }`
      )
      .replace(
        'void main() {',
        noHoles
          ? 'void main() {' // backdrop never sits over a hole: no discard keeps early-z / HSR working
          : `void main() {
  for (int i = 0; i < ${MAX_HOLES}; i++) {
    if (i >= uHoleCount) break;
    vec2 d = vHolePos.xz - uHoles[i].xy;
    if (dot(d, d) < uHoles[i].z * uHoles[i].z) discard;
  }`
      )
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= styleTint(vHolePos.xz) * cloudShade(vHolePos.xz);');
    if (water && gfx.high) {
      // Ripple normals: finite differences of the animated height field, rotated into view space.
      frag = frag.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  {
    float w0 = waveH(vHolePos.xz);
    vec2 gr = vec2(waveH(vHolePos.xz + vec2(0.25, 0.0)) - w0, waveH(vHolePos.xz + vec2(0.0, 0.25)) - w0);
    normal = normalize(normal + (viewMatrix * vec4(-gr.x, 0.0, -gr.y, 0.0)).xyz * 2.4);
  }`
      );
    }
    shader.fragmentShader = frag;
  };
  material.customProgramCacheKey = () => `holes-${key}-${gfx.high ? 'h' : 'l'}${cloud ? 'c' : ''}${water ? 'w' : ''}${noHoles ? 'n' : ''}`;
  return material;
}

function litMaterial(color, style, extra = {}, noHoles = false) {
  const water = style === 'water';
  const base = { color, ...extra };
  // Only water needs PBR (glossy highlights); everything flat uses the cheaper Lambert model even on High.
  const m = gfx.high && (water || extra.vertexColors)
    ? new THREE.MeshStandardMaterial({ roughness: water ? 0.22 : 0.95, metalness: water ? 0.15 : 0, ...base })
    : new THREE.MeshLambertMaterial(base);
  return patch(m, style, water, noHoles);
}

/** Flat lit material that is hidden inside holes. Use for anything lying on the ground. style: see GROUND_STYLES. */
export function makeDecalMaterial(color, style) {
  return litMaterial(color, style, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

/** Same surface detail but no hole discard, for scenery outside the playable square (city ground, ocean). */
export function makeBackdropMaterial(color, style) {
  return litMaterial(color, style, {}, true);
}

/** Vertex-coloured lit material with the same procedural surface detail (backdrop terrain). */
export function makeTerrainMaterial(style) {
  return litMaterial(0xffffff, style, { vertexColors: true }, true);
}

/** Builds the ground plane and the outer skirt (edge + backdrop are built by Scenery.js). Caller adds to scene. */
export function createGround(map, skirtColor) {
  const g = new THREE.Group();
  const S = map.size;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(S * 2, S * 2).rotateX(-Math.PI / 2), litMaterial(map.groundColor, map.groundStyle));
  ground.receiveShadow = gfx.high;
  g.add(ground);

  // Outer skirt with a square cut-out (pit walls stay visible); sits under the backdrop terrain. null = none.
  if (skirtColor === null) return g;
  const big = S * 8;
  const shape = new THREE.Shape();
  shape.moveTo(-big, -big); shape.lineTo(big, -big); shape.lineTo(big, big); shape.lineTo(-big, big); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-S, -S); hole.lineTo(-S, S); hole.lineTo(S, S); hole.lineTo(S, -S); hole.closePath();
  shape.holes.push(hole);
  const skirt = new THREE.Mesh(
    new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: skirtColor ?? new THREE.Color(map.groundColor).multiplyScalar(0.55) })
  );
  skirt.position.y = -1.5;
  g.add(skirt);
  return g;
}
