import * as THREE from 'three';
import { timeUniform } from './Ground.js';

export const START_RADIUS = 1.2;
export const BASE_SPEED = 9;
export const SPEED_PER_RADIUS = 0.8;
export const PLAYER_COLOR = '#1e90ff';

let pitGeo = null;
let capGeo = null;
let ringGeo = null;
let playerRingGeo = null;
let pitMat = null;
let capMat = null;
let lipGeo = null;
let lipMat = null;
let glowGeo = null;

/** Per-map soil tint shared by every hole's pit wall and lip (Game calls setHoleTint when a world is built). */
const pitUniforms = { uTint: { value: new THREE.Color(0.25, 0.2, 0.15) } };
export function setHoleTint(color) {
  const c = pitUniforms.uTint.value.set(color);
  const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  if (l < 0.04) c.lerp(_soil, 0.5); // very dark grounds (asphalt, regolith) still need a readable wall
  c.multiplyScalar(0.8);
}
const _soil = new THREE.Color(0.1, 0.08, 0.07);

// Pit wall: dark soil/rock strata (banding + blocky speckle per angular cell) tinted by the map ground colour, a lighter
// rim band at the top where the ground curls in, and a fall-off to black with depth.
const PIT_VERT = `
varying vec3 vObj;
varying float vWY;
void main() {
  vObj = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWY = w.y;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const PIT_FRAG = `
uniform vec3 uTint;
varying vec3 vObj;
varying float vWY;
float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  float depth = max(0.0, -vWY);
  float a = atan(vObj.z, vObj.x) / 6.2831853 + 0.5;
  float row = floor(depth * 2.2);
  float cell = floor(a * 26.0 + row * 7.0);
  float speck = h21(vec2(cell, row));
  float strata = 0.5 + 0.5 * sin(depth * 4.6 + h21(vec2(row, 3.0)) * 6.0);
  float seam = smoothstep(0.88, 1.0, fract(depth * 2.2)) * 0.35;
  vec3 soil = uTint * (0.72 + 0.35 * speck + 0.22 * strata - seam);
  float rim = 1.0 - smoothstep(0.0, 0.5, depth);
  soil = mix(soil, uTint * 1.25, rim * 0.6);
  float dark = exp(-depth * 0.62) * 0.75 + 0.012;
  vec3 col = soil * dark;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Lip: a small chamfer just inside the rim (ground colour, bright at the ground edge, darkening as it curls down) so the
// pit reads as a hole cut into the ground rather than a flat disc.
const LIP_VERT = `
varying float vT;
void main() {
  vT = -position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const LIP_FRAG = `
uniform vec3 uTint;
varying float vT;
void main() {
  vec3 col = uTint * mix(1.35, 0.3, smoothstep(0.0, 1.0, vT));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const GLOW_VERT = `
varying vec2 vP;
void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// Outline glow: additive soft halo centred on the outline band (unit radius space, band ~1.0..1.34).
const GLOW_FRAG = `
uniform vec3 uColor;
uniform float uI;
uniform float uTime;
uniform float uMid;
varying vec2 vP;
void main() {
  float d = length(vP);
  float g = exp(-pow((d - uMid) / 0.3, 2.0));
  float breathe = 0.88 + 0.12 * sin(uTime * 3.2);
  gl_FragColor = vec4(uColor * g * uI * breathe, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Progress ring shader: unit-radius ring lying flat; fill sweeps clockwise from 12 o'clock (screen up = -Z).
const PROGRESS_VERT = `
varying vec2 vP;
void main() {
  vP = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const PROGRESS_FRAG = `
uniform float uProgress;
uniform float uPulse;
uniform vec3 uFill;
varying vec2 vP;
void main() {
  float a = fract(atan(vP.x, -vP.y) / 6.2831853);
  float f = smoothstep(0.0, 0.004, uProgress - a);
  vec3 col = mix(vec3(1.0), uFill, f * (1.0 - uPulse * 0.6));
  col = mix(col, vec3(1.0), uPulse * 0.5);
  gl_FragColor = vec4(col, mix(0.3, 1.0, f));
  #include <colorspace_fragment>
}`;

function shared() {
  if (pitGeo) return;
  // Open-ended unit cylinder, top at y=0 extending down to y=-1 (the pit shader darkens it with depth).
  pitGeo = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true).translate(0, -0.5, 0);
  pitMat = new THREE.ShaderMaterial({ uniforms: pitUniforms, vertexShader: PIT_VERT, fragmentShader: PIT_FRAG, side: THREE.BackSide });
  capGeo = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);
  capMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
  ringGeo = new THREE.RingGeometry(0.97, 1.2, 48).rotateX(-Math.PI / 2);
  playerRingGeo = new THREE.RingGeometry(0.97, 1.34, 48).rotateX(-Math.PI / 2);
  lipGeo = new THREE.CylinderGeometry(1, 0.88, 1, 40, 1, true).translate(0, -0.5, 0);
  lipMat = new THREE.ShaderMaterial({ uniforms: pitUniforms, vertexShader: LIP_VERT, fragmentShader: LIP_FRAG });
  glowGeo = new THREE.RingGeometry(0.7, 2.3, 48).rotateX(-Math.PI / 2);
}

/**
 * Outlines are drawn on top of the ground, decals, edge fence and backdrop terrain (depth test off) but stay hidden
 * behind solid objects: objects write stencil=1 (see markSolid) and the outlines only draw where stencil != 1.
 */
export function markSolid(mat) {
  mat.stencilWrite = true;
  mat.stencilRef = 1;
  mat.stencilFunc = THREE.AlwaysStencilFunc;
  mat.stencilZPass = THREE.ReplaceStencilOp;
  return mat;
}
export function overlayOutline(mat) {
  mat.depthTest = false;
  mat.depthWrite = false;
  mat.transparent = true;
  mat.stencilWrite = true;
  mat.stencilRef = 1;
  mat.stencilFunc = THREE.NotEqualStencilFunc;
  mat.stencilFail = mat.stencilZFail = mat.stencilZPass = THREE.KeepStencilOp;
  return mat;
}

/** Size level for radius r (matches size = round(r*10), level = floor(size/10)) and 0..1 progress to the next by area. */
export function levelProgress(r) {
  const level = Math.max(1, Math.floor(r + 0.05));
  const lo = (level - 0.05) * (level - 0.05);
  const hi = (level + 0.95) * (level + 0.95);
  return { level, frac: Math.max(0, Math.min(1, (r * r - lo) / (hi - lo))) };
}

function makeLabel(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 40px "Trebuchet MS", Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineJoin = 'round';
  g.strokeText(text, 128, 34);
  g.fillStyle = color;
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, fog: false, toneMapped: false }));
  s.renderOrder = 10;
  return s;
}

export class Hole {
  constructor({ name, color, isPlayer = false }) {
    shared();
    this.name = name;
    this.color = color;
    this.isPlayer = isPlayer;
    this.x = 0; this.z = 0; this.vx = 0; this.vz = 0;
    this.area = Math.PI * START_RADIUS * START_RADIUS;
    this.r = START_RADIUS;
    this.alive = true;
    this.respawnT = 0;
    this.count = 0; // items swallowed
    this.ai = null;

    this.group = new THREE.Group();
    this.pit = new THREE.Mesh(pitGeo, pitMat);
    this.cap = new THREE.Mesh(capGeo, capMat);
    this.ring = new THREE.Mesh(
      isPlayer ? playerRingGeo : ringGeo,
      overlayOutline(new THREE.MeshBasicMaterial({ color, toneMapped: false }))
    );
    this.ring.renderOrder = 1;
    this.ring.position.y = 0.03;
    this.lip = new THREE.Mesh(lipGeo, lipMat);
    this.glowMat = overlayOutline(new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
      uniforms: { uColor: { value: new THREE.Color(color) }, uI: { value: isPlayer ? 0.6 : 0.4 }, uTime: timeUniform, uMid: { value: isPlayer ? 1.17 : 1.08 } },
      blending: THREE.AdditiveBlending,
    }));
    this.glow = new THREE.Mesh(glowGeo, this.glowMat);
    this.glow.renderOrder = 0;
    this.label = makeLabel(isPlayer ? 'YOU' : name, isPlayer ? '#9ad0ff' : color);
    this.group.add(this.pit, this.cap, this.lip, this.glow, this.ring, this.label);
    this.baseY = 0.03;
    this.kick = 0; // squash/stretch spring (see punch)
    this.kickV = 0;
    this.level = 1;
    this.levelFrac = 0;
    this.pulse = 0;
    if (isPlayer) {
      // Thin size-progress ring just outside the blue outline: dim track + bright fill.
      this.progGeo = new THREE.RingGeometry(1.4, 1.58, 64).rotateX(-Math.PI / 2);
      this.progMat = overlayOutline(new THREE.ShaderMaterial({
        vertexShader: PROGRESS_VERT,
        fragmentShader: PROGRESS_FRAG,
        uniforms: { uProgress: { value: 0 }, uPulse: { value: 0 }, uFill: { value: new THREE.Color('#ffc928') } },
      }));
      this.progRing = new THREE.Mesh(this.progGeo, this.progMat);
      this.progRing.position.y = 0.035;
      this.progRing.renderOrder = 2;
      this.group.add(this.progRing);
    }
    this.sync();
  }

  dispose() {
    this.ring.material.dispose();
    this.glowMat.dispose();
    this.label.material.map.dispose();
    this.label.material.dispose();
    if (this.progMat) { this.progMat.dispose(); this.progGeo.dispose(); }
  }

  get targetRadius() {
    return Math.sqrt(this.area / Math.PI);
  }

  get size() {
    return Math.round(this.targetRadius * 10);
  }

  addArea(a) {
    this.area += a;
  }

  /** Reset to starting size at (x, z). */
  reset(x, z, size) {
    this.area = Math.PI * START_RADIUS * START_RADIUS;
    this.r = START_RADIUS;
    this.x = x; this.z = z; this.vx = 0; this.vz = 0;
    this.clamp(size);
    this.alive = true;
    this.group.visible = true;
    this.level = 1;
    this.pulse = 0;
    this.kick = this.kickV = 0;
    this.sync();
  }

  /** Lift the flat overlays (glow, outline, progress ring) above the tallest ground decal. */
  setBaseY(y) {
    this.baseY = y;
    this.glow.position.y = y - 0.003;
    this.ring.position.y = y;
    if (this.progRing) this.progRing.position.y = y + 0.005;
  }

  /** Quick squash-and-stretch pulse of the outline (spring); amount ~0.1 subtle .. 0.35 strong. */
  punch(amount) {
    this.kickV += amount * 14;
  }

  setAlive(a) {
    this.alive = a;
    this.group.visible = a;
  }

  get speed() {
    return BASE_SPEED + this.r * SPEED_PER_RADIUS;
  }

  clamp(size) {
    // The centre may travel all the way to the map boundary (the hole overhangs the edge) so corner items are reachable.
    const lim = Math.max(0, size);
    this.x = Math.max(-lim, Math.min(lim, this.x));
    this.z = Math.max(-lim, Math.min(lim, this.z));
  }

  /** dx,dz: direction (length<=1 magnitude), mul: speed multiplier. */
  move(dx, dz, dt, mul, size) {
    const sp = this.speed * mul;
    const k = Math.min(1, dt * 9);
    this.vx += (dx * sp - this.vx) * k;
    this.vz += (dz * sp - this.vz) * k;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.clamp(size);
  }

  update(dt, size) {
    const t = this.targetRadius;
    this.r += (t - this.r) * Math.min(1, dt * 4);
    if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 2.2);
    if (this.kick !== 0 || this.kickV !== 0) {
      // Damped spring (~5 Hz): positive kick = stretch wide / squash deep, then it rings back through zero.
      this.kickV += (-420 * this.kick - 16 * this.kickV) * dt;
      this.kick += this.kickV * dt;
      if (Math.abs(this.kick) < 0.002 && Math.abs(this.kickV) < 0.05) this.kick = this.kickV = 0;
    }
    if (Math.abs(t - this.r) < 0.0005) this.r = t;
    this.clamp(size);
    this.sync();
  }

  sync() {
    const r = this.r;
    const depth = r * 3 + 2;
    this.group.position.set(this.x, 0, this.z);
    this.pit.scale.set(r, depth, r);
    this.cap.position.y = -depth;
    this.cap.scale.set(r, 1, r);
    const kx = 1 + this.kick, kz = 1 - this.kick * 0.6;
    this.ring.scale.set(r * kx, 1, r * kz);
    this.glow.scale.set(r * kx, 1, r * kz);
    const lh = Math.min(0.55, 0.12 + r * 0.06);
    this.lip.scale.set(r, lh, r);
    const lw = Math.max(5, r * 2.6);
    this.label.scale.set(lw, lw / 4, 1);
    this.label.position.set(0, r * 0.6 + 1.6, -r * 0.2);
    if (this.isPlayer) {
      const lp = levelProgress(r);
      if (lp.level > this.level) this.pulse = 1; // level-up: flash + pop, fill restarts from 0 as r crosses the threshold
      this.level = lp.level;
      this.levelFrac = lp.frac;
      const u = this.progMat.uniforms;
      u.uProgress.value = lp.frac;
      u.uPulse.value = this.pulse;
      const k = r * (1 + 0.16 * Math.sin(this.pulse * Math.PI));
      this.progRing.scale.set(k * kx, 1, k * kz);
    }
  }
}
