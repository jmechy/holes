// Swallow eligibility, fall / wobble animation, hole-vs-hole.
import * as THREE from 'three';
import { objectMaterial, applyObjectSurfaces } from '../objects/build.js';
import { markSolid } from './Hole.js';

const GRAVITY = 30;
const _q = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _yawQ = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

// Falling objects get a temporary transparent clone of the shared object material so they can fade + darken as
// they sink. Clones are pooled (reset on release); Game calls disposeFallMaterials() when a world is torn down.
const MAX_FALL_MATS = 64;
let fallPool = [];
let fallInUse = 0;
const allFallMats = new Set();

function acquireFallMaterial() {
  if (fallInUse >= MAX_FALL_MATS) return null; // absurd pile-up: fall back to the plain (non-fading) tip-and-drop
  let m = fallPool.pop();
  if (!m) {
    m = applyObjectSurfaces(objectMaterial.clone());
    m.transparent = true;
    markSolid(m); // clone() copies stencil state already; keep explicit
    allFallMats.add(m);
  }
  m.opacity = 1;
  m.color.setScalar(1);
  fallInUse++;
  return m;
}

function releaseFallMaterial(o) {
  const m = o.fallMat;
  if (!m) return;
  o.fallMat = null;
  fallInUse--;
  fallPool.push(m);
}

export function disposeFallMaterials() {
  for (const m of allFallMats) m.dispose();
  allFallMats.clear();
  fallPool = [];
  fallInUse = 0;
}

/** Object states */
export const IDLE = 0, FALLING = 1, WOBBLE = 2, GONE = 3;

export function canSwallow(hole, o) {
  return hole.r > o.r * 1.1;
}

function markActive(game, o) {
  if (!o.inActive) {
    o.inActive = true;
    game.active.push(o);
  }
}

export function startFall(game, o, hole) {
  o.state = FALLING;
  o.hole = hole;
  o.t = 0;
  o.vy = 0;
  o.y = 0;
  game.grid.remove(o);
  game.removeLive(o);
  if (o.mv) game.movers.remove(o);
  _yawQ.setFromAxisAngle(_up, o.yaw);
  o.yawQ = _yawQ.clone();
  const mesh = game.instances.promote(o); // falling needs its own Mesh (fade material, tilt)
  o.fallMat = acquireFallMaterial();
  if (o.fallMat) {
    mesh.material = o.fallMat;
    mesh.receiveShadow = false;
  }
  markActive(game, o);
  game.effects?.swallow(o, hole);
}

/** Check nearby objects for one hole. */
export function swallowNear(game, hole) {
  const out = game.tmp;
  out.length = 0;
  game.grid.query(hole.x, hole.z, hole.r, out);
  for (let i = 0; i < out.length; i++) {
    const o = out[i];
    if (o.state === FALLING || o.state === GONE) continue;
    const d = Math.hypot(o.x - hole.x, o.z - hole.z);
    if (canSwallow(hole, o)) {
      if (d < hole.r - o.r * 0.3) startFall(game, o, hole);
    } else if (o.state === IDLE && d < hole.r * 0.7) {
      o.state = WOBBLE;
      o.wobT = 0.6;
      game.instances.promote(o);
      markActive(game, o);
    }
  }
}

/** Advance falling / wobbling objects. Calls game.onSwallowed(o) when one has dropped out of sight. */
export function updateActive(game, dt) {
  const active = game.active;
  for (let i = active.length - 1; i >= 0; i--) {
    const o = active[i];
    const m = o.mesh;
    let done = false;
    if (o.state === FALLING) {
      const h = o.hole;
      o.t += dt;
      const k = Math.min(1, dt * 5);
      o.x += (h.x - o.x) * k;
      o.z += (h.z - o.z) * k;
      o.vy += GRAVITY * dt;
      o.y -= o.vy * dt;
      const tilt = Math.min(1.15, o.t * 2.6);
      const dx = h.x - o.x, dz = h.z - o.z;
      const len = Math.hypot(dx, dz) || 1;
      _axis.set(dz / len, 0, -dx / len);
      _q.setFromAxisAngle(_axis, tilt);
      m.quaternion.copy(_q).multiply(o.yawQ);
      m.position.set(o.x, o.y, o.z);
      m.updateMatrix();
      // Sink progress 0..1: fade + darken as the object drops into the dark pit.
      const sinkLen = o.h * 0.85 + 1.4;
      const s = Math.max(0, Math.min(1, (-o.y - o.h * 0.15) / sinkLen));
      if (o.fallMat) {
        o.fallMat.opacity = 1 - s * s;
        o.fallMat.color.setScalar(1 - s * 0.9);
      }
      if (m.castShadow && o.y < -0.3) m.castShadow = false;
      if (s >= 1 || o.y < -o.h - 4) {
        o.state = GONE;
        releaseFallMaterial(o);
        game.onSwallowed(o);
        game.instances.release(o);
        done = true;
      }
    } else if (o.state === WOBBLE) {
      o.wobT -= dt;
      const a = Math.max(0, o.wobT / 0.6);
      const ph = o.wobT * 45;
      m.rotation.set(Math.sin(ph) * 0.07 * a, o.yaw, Math.cos(ph * 1.3) * 0.07 * a);
      m.updateMatrix();
      if (o.wobT <= 0) {
        o.state = IDLE;
        m.rotation.set(0, o.yaw, 0);
        m.updateMatrix();
        game.instances.demote(o); // back into its instance batch (no-op for movers / faded objects)
        done = true;
      }
    } else {
      done = true;
    }
    if (done) {
      o.inActive = false;
      active[i] = active[active.length - 1];
      active.pop();
    }
  }
}

/** Hole A eats hole B when A.r >= B.r*1.2 and B's centre is well inside A. */
export function holeVsHole(game) {
  const hs = game.holes;
  for (let i = 0; i < hs.length; i++) {
    const a = hs[i];
    if (!a.alive) continue;
    for (let j = 0; j < hs.length; j++) {
      if (i === j) continue;
      const b = hs[j];
      if (!b.alive || !a.alive) continue;
      if (a.r >= b.r * 1.2 && Math.hypot(a.x - b.x, a.z - b.z) < a.r - b.r * 0.5) {
        game.onHoleEaten(a, b);
      }
    }
  }
}
