// Game-feel effects ("juice"): swallow dust / splash puffs, level-up confetti + ring pulse, combo sparkles, camera
// shake and zoom bounce. One pooled THREE.Points system (<= MAX_PARTICLES live, zero per-frame allocations) plus two
// reusable pulse rings. Everything is cheap: one extra draw call for particles, counts halve on Low / degraded quality.
import * as THREE from 'three';
import { overlayOutline } from './Hole.js';

export const MAX_PARTICLES = 512;
const STRIDE_DUST = 0, STRIDE_CONFETTI = 1, STRIDE_SPARK = 2, STRIDE_DROP = 3; // particle kinds (aP.w)

const WATER_NAME = /boat|gondola|vaporetto|sailboat|dinghy|kayak|canoe|ferry|yacht|barge|raft|ship|jetski|jet.?ski|duck|swan|buoy|fish|whale|dolphin|seagull|pelican/i;
const CONFETTI = ['#ff4d6d', '#ffd23f', '#3ddc97', '#4cc9f0', '#b388ff', '#ff9a3c', '#ffffff'].map((c) => new THREE.Color(c));

const VERT = `
attribute vec3 aCol;
attribute vec4 aP; // size (world units), alpha, angle, kind
uniform float uScale;
varying vec3 vCol;
varying vec4 vP;
void main() {
  vCol = aCol; vP = aP;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aP.x * uScale / max(-mv.z, 0.1), 1.0, 160.0);
}`;
const FRAG = `
varying vec3 vCol;
varying vec4 vP;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float k = vP.w, al = vP.y;
  vec3 col = vCol;
  float a;
  float add = 0.0;
  if (k < 0.5) { // soft dust puff
    a = smoothstep(0.5, 0.05, length(c)) * al;
  } else if (k < 1.5) { // spinning confetti chip
    float s = sin(vP.z), co = cos(vP.z);
    vec2 r = vec2(co * c.x - s * c.y, s * c.x + co * c.y);
    a = step(abs(r.x), 0.46) * step(abs(r.y), 0.24) * al;
    col *= 0.7 + 0.3 * cos(vP.z * 2.0);
  } else if (k < 2.5) { // additive sparkle: glow core + cross
    float d = length(c) * 2.0;
    float star = max(0.0, 1.0 - min(abs(c.x), abs(c.y)) * 14.0) * max(0.0, 1.0 - d);
    a = (exp(-d * d * 5.0) + star * 0.8) * al;
    add = 1.0;
  } else { // water droplet
    a = smoothstep(0.5, 0.3, length(c)) * al;
    col = mix(col, vec3(1.0), 0.35);
  }
  if (a < 0.01) discard;
  gl_FragColor = vec4(col * a, a * (1.0 - add)); // premultiplied; add = 1 -> purely additive
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const PULSE_FRAG = `
uniform vec3 uColor;
uniform float uA;
varying vec2 vP;
void main() {
  float d = length(vP);
  float a = smoothstep(0.78, 0.96, d) * (1.0 - smoothstep(0.96, 1.0, d)) * uA;
  gl_FragColor = vec4(uColor * a, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const PULSE_VERT = 'varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

const avgColors = new WeakMap(); // proto -> THREE.Color (average vertex colour, sampled once)
function protoColor(proto) {
  let c = avgColors.get(proto);
  if (c) return c;
  c = new THREE.Color(0.5, 0.5, 0.5);
  const att = proto.geometry?.attributes?.color;
  if (att && att.count) {
    const step = Math.max(1, Math.floor(att.count / 1500));
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < att.count; i += step) { r += att.getX(i); g += att.getY(i); b += att.getZ(i); n++; }
    c.setRGB(r / n, g / n, b / n);
  }
  avgColors.set(proto, c);
  return c;
}

export class Effects {
  constructor(game) {
    this.game = game;
    const N = MAX_PARTICLES;
    this.n = 0;
    this.pos = new Float32Array(N * 3);
    this.col = new Float32Array(N * 3);
    this.par = new Float32Array(N * 4);
    // CPU-side state per particle: vx vy vz life maxLife grav drag spin size0 size1 alpha0
    this.st = new Float32Array(N * 11);
    const g = (this.geometry = new THREE.BufferGeometry());
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.parAttr = new THREE.BufferAttribute(this.par, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posAttr);
    g.setAttribute('aCol', this.colAttr);
    g.setAttribute('aP', this.parAttr);
    g.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 500 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, depthTest: true, fog: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    game.scene.add(this.points);

    // Two reusable expanding ground rings for the level-up pulse wave.
    this.pulseGeo = new THREE.RingGeometry(0.7, 1, 64).rotateX(-Math.PI / 2);
    this.pulses = [0, 1].map((i) => {
      const mat = overlayOutline(new THREE.ShaderMaterial({
        vertexShader: PULSE_VERT, fragmentShader: PULSE_FRAG, blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(i ? '#ffe27a' : '#8fd0ff') }, uA: { value: 0 } },
      }));
      const mesh = new THREE.Mesh(this.pulseGeo, mat);
      mesh.renderOrder = 3;
      mesh.visible = false;
      game.scene.add(mesh);
      return { mesh, mat, t: -1, delay: i * 0.16, hole: null, r0: 1 };
    });

    this.shake = 0; // current shake magnitude (0..1)
    this.shakePhase = 0;
    this.zoom = 0; // camera distance bounce (fraction)
    this.zoomV = 0;
    this.offX = 0; this.offY = 0; this.offZ = 0; // camera shake offset (world units), read by Game.updateCamera
    this.lod = 1;
    this.ground = new THREE.Color(game.map.groundColor);
  }

  dispose() {
    this.game.scene?.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    for (const p of this.pulses) { this.game.scene?.remove(p.mesh); p.mat.dispose(); }
    this.pulseGeo.dispose();
  }

  get live() { return this.n; }

  // ---- emission -------------------------------------------------------------------------------------------------

  /** Spawn one particle (recycles a pseudo-random live slot if the pool is full, so the cap always holds). */
  emit(x, y, z, vx, vy, vz, life, size0, size1, alpha, grav, drag, spin, kind, r, g, b) {
    let i = this.n;
    if (i >= MAX_PARTICLES) i = (Math.random() * MAX_PARTICLES) | 0;
    else this.n++;
    const p3 = i * 3, p4 = i * 4, s = i * 11;
    this.pos[p3] = x; this.pos[p3 + 1] = y; this.pos[p3 + 2] = z;
    this.col[p3] = r; this.col[p3 + 1] = g; this.col[p3 + 2] = b;
    this.par[p4] = size0; this.par[p4 + 1] = alpha; this.par[p4 + 2] = Math.random() * 6.283; this.par[p4 + 3] = kind;
    const st = this.st;
    st[s] = vx; st[s + 1] = vy; st[s + 2] = vz; st[s + 3] = 0; st[s + 4] = life; st[s + 5] = grav; st[s + 6] = drag;
    st[s + 7] = spin; st[s + 8] = size0; st[s + 9] = size1; st[s + 10] = alpha;
  }

  /** An object starts falling into `hole`: dust (or a splash over water) at the rim, scaled + tinted by the object. */
  swallow(o, hole) {
    const mine = hole.isPlayer;
    const lod = this.lod * (mine ? 1 : 0.4);
    const rad = o.r;
    const c = protoColor(o.proto);
    const water = this.onWater(o);
    // Particles burst from the rim point nearest the object, in an arc that widens with its size.
    const base = Math.atan2(o.z - hole.z, o.x - hole.x);
    const arc = Math.min(1.3, 0.35 + rad * 0.12);
    const n = Math.max(2, Math.round(Math.min(34, 5 + rad * 5.5) * lod));
    const hr = hole.r;
    const reach = Math.min(hr, Math.max(rad, hr * 0.85));
    const dustSize = 0.5 + rad * 0.55;
    const up = 1.8 + Math.min(6, rad * 0.9);
    for (let i = 0; i < n; i++) {
      const a = base + (Math.random() * 2 - 1) * arc;
      const ca = Math.cos(a), sa = Math.sin(a);
      const rr = hr * (0.88 + Math.random() * 0.14);
      const px = hole.x + ca * rr, pz = hole.z + sa * rr;
      const sp = (0.8 + Math.random() * 1.6) * (0.7 + Math.min(1.6, rad * 0.25));
      if (water) {
        const dr = 0.12 + Math.random() * 0.12 + rad * 0.03;
        this.emit(px, 0.15, pz, ca * sp * 0.6, up * (1.2 + Math.random() * 0.9), sa * sp * 0.6, 0.55 + Math.random() * 0.35, dr, dr * 0.8, 0.95, 16, 0.2, 0, STRIDE_DROP, 0.62, 0.82, 0.95);
      } else {
        const v = 0.85 + Math.random() * 0.3;
        this.emit(px, 0.1, pz, ca * sp, up * 0.5 * (0.5 + Math.random()), sa * sp, 0.6 + Math.random() * 0.5, dustSize * 0.5, dustSize * (1.3 + Math.random() * 0.7), 0.7, 2.5, 2.2,
          0, STRIDE_DUST, Math.min(1, c.r * v * 0.8 + this.ground.r * 0.1 + 0.14), Math.min(1, c.g * v * 0.8 + this.ground.g * 0.1 + 0.14), Math.min(1, c.b * v * 0.8 + this.ground.b * 0.1 + 0.14));
      }
    }
    if (water) {
      // A few soft white foam puffs so the splash reads from a distance.
      const m = Math.max(1, Math.round(n * 0.3));
      for (let i = 0; i < m; i++) {
        const a = base + (Math.random() * 2 - 1) * arc;
        this.emit(hole.x + Math.cos(a) * hr * 0.92, 0.1, hole.z + Math.sin(a) * hr * 0.92, Math.cos(a) * 0.6, 0.8, Math.sin(a) * 0.6, 0.6, dustSize * 0.4, dustSize * 1.4, 0.45, 0, 2, 0, STRIDE_DUST, 0.9, 0.96, 1);
      }
    } else {
      const m = Math.round(Math.min(14, 2 + rad * 2) * lod * (mine ? 1 : 0.3));
      for (let i = 0; i < m; i++) {
        const a = base + (Math.random() * 2 - 1) * arc;
        const sp = 1.5 + Math.random() * 2.5;
        const l = 0.35 + Math.random() * 0.3;
        this.emit(hole.x + Math.cos(a) * reach, 0.2, hole.z + Math.sin(a) * reach, Math.cos(a) * sp, 3 + Math.random() * 4, Math.sin(a) * sp, l, 0.25 + rad * 0.1, 0.08, 1,
          14, 0.5, 0, STRIDE_SPARK, Math.min(1, c.r * 0.6 + 0.5), Math.min(1, c.g * 0.6 + 0.5), Math.min(1, c.b * 0.6 + 0.5));
      }
    }
    if (mine) {
      hole.punch(Math.min(0.42, 0.1 + rad * 0.028));
      const amp = Math.min(1, Math.pow(rad / 14, 1.3));
      if (amp > 0.04) this.shake = Math.min(1.2, Math.max(this.shake, amp) + amp * 0.25);
    }
  }

  onWater(o) {
    const map = this.game.map;
    if (WATER_NAME.test(o.proto?.name ?? '')) return true;
    if (o.mv?.route?.network === 'water') return true;
    const w = map.water;
    if (w && Number.isFinite(w.shoreZ) && o.z > w.shoreZ + 0.5) return true;
    return false;
  }

  /** Level-up: two expanding pulse rings, a confetti fountain, camera zoom bounce. */
  levelUp(hole) {
    const lod = this.lod;
    for (const p of this.pulses) { p.t = -p.delay; p.hole = hole; p.r0 = hole.r; p.mesh.visible = false; }
    const n = Math.round(70 * lod);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const ca = Math.cos(a), sa = Math.sin(a);
      const k = CONFETTI[(Math.random() * CONFETTI.length) | 0];
      const sp = 3 + Math.random() * (5 + hole.r * 0.5);
      const sz = 0.35 + Math.random() * 0.3 + hole.r * 0.05;
      this.emit(hole.x + ca * hole.r * 0.8, 0.3, hole.z + sa * hole.r * 0.8, ca * sp, 9 + Math.random() * 7 + hole.r * 0.4, sa * sp, 1.6 + Math.random() * 0.8,
        sz, sz, 1, 14, 0.4, (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8), STRIDE_CONFETTI, k.r, k.g, k.b);
    }
    const m = Math.round(16 * lod);
    for (let i = 0; i < m; i++) {
      const a = Math.random() * 6.283;
      this.emit(hole.x + Math.cos(a) * hole.r * 1.1, 0.4, hole.z + Math.sin(a) * hole.r * 1.1, Math.cos(a) * 2, 2 + Math.random() * 3, Math.sin(a) * 2, 0.6 + Math.random() * 0.4,
        0.6, 0.15, 1, 4, 1, 0, STRIDE_SPARK, 1, 0.9, 0.5);
    }
    hole.punch(0.45);
    this.zoomV -= 0.6; // punch in, then spring back out past rest
    this.shake = Math.max(this.shake, 0.12);
  }

  /** Small sparkle burst around the hole (arcade combo milestones). */
  sparkle(hole, strength = 1) {
    const n = Math.round(22 * strength * this.lod);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const rr = hole.r * (0.9 + Math.random() * 0.5);
      const sp = 1 + Math.random() * 2.5;
      const warm = Math.random() < 0.5;
      this.emit(hole.x + Math.cos(a) * rr, 0.3 + Math.random() * 0.5, hole.z + Math.sin(a) * rr, Math.cos(a) * sp, 2.5 + Math.random() * 3.5, Math.sin(a) * sp, 0.6 + Math.random() * 0.5,
        0.5 + Math.random() * 0.4, 0.1, 1, 6, 0.8, 0, STRIDE_SPARK, warm ? 1 : 0.6, warm ? 0.85 : 0.95, warm ? 0.4 : 1);
    }
    hole.punch(0.2);
  }

  // ---- per frame ------------------------------------------------------------------------------------------------

  update(dt) {
    const g = this.game;
    this.lod = g.high && g.postOn !== false ? 1 : 0.5;
    // Point-size scale: pixels per world unit at distance 1 (drawing-buffer height * 0.5 * cot(fov/2)).
    this.material.uniforms.uScale.value = g.renderer.domElement.height * 0.5 * g.camera.projectionMatrix.elements[5];

    const n = this.n, pos = this.pos, col = this.col, par = this.par, st = this.st;
    let i = 0, live = n;
    while (i < live) {
      const s = i * 11;
      const t = (st[s + 3] += dt);
      const life = st[s + 4];
      if (t >= life) { // swap-remove: copy the last live particle into this slot
        live--;
        if (i !== live) {
          const l3 = live * 3, l4 = live * 4, ls = live * 11, i3 = i * 3, i4 = i * 4;
          for (let k = 0; k < 3; k++) { pos[i3 + k] = pos[l3 + k]; col[i3 + k] = col[l3 + k]; }
          for (let k = 0; k < 4; k++) par[i4 + k] = par[l4 + k];
          for (let k = 0; k < 11; k++) st[s + k] = st[ls + k];
        }
        continue;
      }
      const i3 = i * 3;
      const drag = Math.max(0, 1 - st[s + 6] * dt);
      st[s] *= drag; st[s + 2] *= drag;
      st[s + 1] = st[s + 1] * drag - st[s + 5] * dt;
      pos[i3] += st[s] * dt; pos[i3 + 1] += st[s + 1] * dt; pos[i3 + 2] += st[s + 2] * dt;
      if (pos[i3 + 1] < 0.05 && par[i * 4 + 3] !== STRIDE_DUST) { // bounce a little off the ground
        pos[i3 + 1] = 0.05;
        st[s + 1] = -st[s + 1] * 0.3;
        st[s] *= 0.7; st[s + 2] *= 0.7;
        st[s + 7] *= 0.6;
      }
      const u = t / life;
      par[i * 4] = st[s + 8] + (st[s + 9] - st[s + 8]) * u;
      par[i * 4 + 1] = st[s + 10] * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85 * (u - 0.15) / 0.85);
      par[i * 4 + 2] += st[s + 7] * dt;
      i++;
    }
    this.n = live;
    this.geometry.setDrawRange(0, live);
    if (live || n) {
      this.posAttr.needsUpdate = this.colAttr.needsUpdate = this.parAttr.needsUpdate = true;
    }

    // Pulse rings follow their hole and expand outward over ~0.9 s.
    for (const p of this.pulses) {
      if (p.t === -1 && !p.mesh.visible) continue;
      p.t += dt;
      if (p.t < 0) continue;
      const u = p.t / 0.9;
      if (u >= 1) { p.t = -1; p.mesh.visible = false; continue; }
      const h = p.hole;
      const r = (h.r + 0.6) * (1 + 2.6 * (1 - (1 - u) * (1 - u)));
      p.mesh.visible = true;
      p.mesh.position.set(h.x, h.baseY + 0.012, h.z);
      p.mesh.scale.set(r, 1, r);
      p.mat.uniforms.uA.value = 0.85 * (1 - u) * (1 - u);
    }

    // Camera shake (decaying noise) and zoom bounce (spring).
    if (this.shake > 0.002) {
      this.shake *= Math.exp(-dt * 7);
      this.shakePhase += dt;
      const m = this.shake * 0.03 * g.cam.d, ph = this.shakePhase;
      this.offX = (Math.sin(ph * 83) + Math.sin(ph * 47 + 1.3)) * 0.5 * m;
      this.offY = Math.sin(ph * 71 + 2.1) * m;
      this.offZ = (Math.sin(ph * 59 + 0.4) + Math.sin(ph * 97)) * 0.5 * m * 0.6;
    } else { this.shake = 0; this.offX = this.offY = this.offZ = 0; }
    if (this.zoom !== 0 || this.zoomV !== 0) {
      this.zoomV += (-110 * this.zoom - 9 * this.zoomV) * dt;
      this.zoom += this.zoomV * dt;
      if (Math.abs(this.zoom) < 0.0005 && Math.abs(this.zoomV) < 0.01) this.zoom = this.zoomV = 0;
    }
  }
}
