import * as THREE from 'three';

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
  // Open-ended unit cylinder, top at y=0 extending down to y=-1; gradient grey -> black.
  pitGeo = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true).translate(0, -0.5, 0);
  const pos = pitGeo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = -pos.getY(i); // 0 top .. 1 bottom
    const v = 0.05 * (1 - t) * (1 - t) + 0.003;
    col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 1.25;
  }
  pitGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  pitMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  capGeo = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);
  capMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
  ringGeo = new THREE.RingGeometry(0.97, 1.2, 48).rotateX(-Math.PI / 2);
  playerRingGeo = new THREE.RingGeometry(0.97, 1.34, 48).rotateX(-Math.PI / 2);
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
      new THREE.MeshBasicMaterial({ color, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
    );
    this.ring.position.y = 0.03;
    this.label = makeLabel(isPlayer ? 'YOU' : name, isPlayer ? '#9ad0ff' : color);
    this.group.add(this.pit, this.cap, this.ring, this.label);
    this.level = 1;
    this.levelFrac = 0;
    this.pulse = 0;
    if (isPlayer) {
      // Thin size-progress ring just outside the blue outline: dim track + bright fill.
      this.progGeo = new THREE.RingGeometry(1.4, 1.58, 64).rotateX(-Math.PI / 2);
      this.progMat = new THREE.ShaderMaterial({
        vertexShader: PROGRESS_VERT,
        fragmentShader: PROGRESS_FRAG,
        uniforms: { uProgress: { value: 0 }, uPulse: { value: 0 }, uFill: { value: new THREE.Color('#ffc928') } },
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      });
      this.progRing = new THREE.Mesh(this.progGeo, this.progMat);
      this.progRing.position.y = 0.035;
      this.progRing.renderOrder = 2;
      this.group.add(this.progRing);
    }
    this.sync();
  }

  dispose() {
    this.ring.material.dispose();
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
    this.sync();
  }

  setAlive(a) {
    this.alive = a;
    this.group.visible = a;
  }

  get speed() {
    return BASE_SPEED + this.r * SPEED_PER_RADIUS;
  }

  clamp(size) {
    const lim = Math.max(0, size - this.r);
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
    this.ring.scale.set(r, 1, r);
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
      this.progRing.scale.set(k, 1, k);
    }
  }
}
