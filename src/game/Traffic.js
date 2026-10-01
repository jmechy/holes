import { IDLE, WOBBLE } from './Swallow.js';

const STATIC_PATIENCE = 1.5, GHOST_AFTER = 3, HARD_AFTER = 6, IGNORE_MAX = 6;

export function isTrafficObject(o) {
  return (o.mv && o.mv.type !== 'walk') ||
    (o.hasVehicleWheels ??= !!o.proto.articulation?.some(p => p.kind === 'wheel'));
}

function shape(o) {
  if (!o.trafficShape) {
    const b = o.proto.geometry.boundingBox;
    const length = (b.max.x - b.min.x) * o.scale / 2;
    const width = (b.max.z - b.min.z) * o.scale / 2;
    o.trafficShape = { length, width, radius: Math.hypot(length, width) };
  }
  return o.trafficShape;
}

/** Oriented footprints let opposing lanes pass while keeping long buses apart. */
export function trafficOverlap(a, pose, b, padding = 0.12) {
  const A = shape(a), B = shape(b);
  const dx = b.x - pose.x, dz = b.z - pose.z;
  if (dx * dx + dz * dz > (A.radius + B.radius + padding * 2) ** 2) return false;
  const ac = Math.cos(pose.yaw), as = Math.sin(pose.yaw);
  const bc = Math.cos(b.yaw), bs = Math.sin(b.yaw);
  const c = Math.abs(ac * bc + as * bs), s = Math.abs(as * bc - ac * bs);
  const gap = padding * 2;
  return Math.abs(dx * ac - dz * as) < A.length + B.length * c + B.width * s + gap &&
    Math.abs(dx * as + dz * ac) < A.width + B.length * s + B.width * c + gap &&
    Math.abs(dx * bc - dz * bs) < B.length + A.length * c + A.width * s + gap &&
    Math.abs(dx * bs + dz * bc) < B.width + A.length * s + A.width * c + gap;
}

export class Traffic {
  constructor(game) {
    this.game = game;
    this.nearby = [];
    this.pose = { x: 0, z: 0, yaw: 0 };
  }

  /**
   * Other vehicles worth yielding to. Parked/static cars never block route traffic (they are scenery, and a
   * single one would otherwise freeze a whole loop); free-roaming drivers only respect them until they get stuck.
   * A vehicle in ghost mode (see watch) additionally ignores the vehicles it is squeezing through (mv.ign).
   */
  neighbors(o, reach) {
    this.nearby.length = 0;
    const mv = o.mv, ghost = mv?.ghost || 0;
    if (ghost === 2) return this.nearby;
    const net = network(o);
    const respectStatic = mv?.type === 'drive' && !(mv.cw > STATIC_PATIENCE);
    this.game.grid.query(o.x, o.z, reach + shape(o).radius + this.game.maxR * 1.5, this.nearby);
    let count = 0;
    for (const other of this.nearby) {
      if (other === o || (other.state !== IDLE && other.state !== WOBBLE) || !isTrafficObject(other)) continue;
      if (!(other.mv ? other.mv.type !== 'walk' && network(other) === net : respectStatic)) continue;
      if (ghost && ignored(mv, other) && !leads(o, other)) continue;
      this.nearby[count++] = other;
    }
    this.nearby.length = count;
    return this.nearby;
  }

  clear(o, pose, neighbors, padding = 0.12, soft = false) {
    for (const other of neighbors) {
      // Only vehicles ahead in our own direction of travel are followed; crossings and oncoming traffic get a stable priority (lower id goes first) so wait cycles cannot form;
      // every actual movement still checks both footprints, so nothing overlaps while the other one yields.
      if (soft && other.mv && o.trafficId < other.trafficId && !leads(o, other)) continue;
      if (trafficOverlap(o, pose, other, padding)) { this.blocker = other; return false; }
    }
    return true;
  }

  canSpawn(o) {
    return this.clear(o, o, this.neighbors(o, 0), 0.35);
  }

  /** Brake for occupied footprints ahead, then enforce a small gap on the actual step. */
  advance(o, dt, desiredSpeed, sample) {
    const mv = o.mv;
    const lookAhead = desiredSpeed * 1.1 + 1.5;
    if (mv.arm) this.capture(o, lookAhead, sample);
    const nearby = this.neighbors(o, lookAhead);
    this.blocker = null;
    let room = lookAhead;
    for (let d = 0.4; d <= lookAhead; d += 0.4) {
      sample(d, this.pose);
      if (!this.clear(o, this.pose, nearby, 0.25, true)) { room = Math.max(0, d - 0.4); break; }
    }
    const target = Math.min(desiredSpeed, Math.sqrt(2 * 5 * Math.max(0, room - 0.7)));
    const speed = mv.currentSpeed ?? desiredSpeed;
    mv.currentSpeed = speed + Math.max(-dt * 7, Math.min(dt * 2.5, target - speed));
    const distance = mv.currentSpeed * dt;
    // Small steps prevent tunnelling, including rotating footprints at road corners.
    const steps = Math.max(1, Math.ceil(distance / 0.12));
    let allowed = 0;
    for (let i = 1; i <= steps; i++) {
      const d = distance * i / steps;
      sample(d, this.pose);
      if (!this.clear(o, this.pose, nearby)) { mv.currentSpeed = 0; break; }
      allowed = d;
    }
    this.watch(o, dt, allowed, desiredSpeed);
    return allowed;
  }

  /**
   * Deadlock breaker. A vehicle held for a few seconds by something it is not simply following (a crossing,
   * oncoming or parked vehicle) squeezes through exactly those vehicles in "ghost" mode: it keeps obeying
   * everything else, and rejoins normal rules once it no longer touches them. Pure car-following queues never
   * trigger this (the head of the queue resolves them); a queue still frozen after HARD_AFTER seconds (a cycle
   * of followers) captures its followed vehicles too, and a ghost that is itself frozen ignores everything.
   * Thresholds are staggered by id so a wait cycle is broken one vehicle at a time.
   */
  watch(o, dt, allowed, desiredSpeed) {
    const mv = o.mv, stuck = allowed < desiredSpeed * dt * 0.15;
    if (mv.ghost) {
      mv.ghostT += dt;
      if (mv.ghostT > 0.5 && mv.ghostT % 0.25 < dt && !this.touching(o)) { mv.ghost = 0; mv.wait = mv.cw = 0; }
      else if (stuck) { if ((mv.gs = (mv.gs || 0) + dt) > GHOST_AFTER) mv.ghost = 2; } else mv.gs = 0;
      return;
    }
    if (!stuck) {
      if (allowed > desiredSpeed * dt * 0.5) mv.wait = mv.cw = 0;
      return;
    }
    mv.wait = (mv.wait || 0) + dt;
    const b = this.blocker;
    if (!b || !leads(o, b)) mv.cw = (mv.cw || 0) + dt;
    const stagger = (o.trafficId % 8) * 0.15;
    if (mv.cw > GHOST_AFTER + stagger) mv.arm = 1;
    else if (mv.wait > HARD_AFTER + stagger) mv.arm = 2;
  }

  /** Records the vehicles overlapping the path just ahead as the ones this ghost may pass through. */
  capture(o, lookAhead, sample) {
    const mv = o.mv, hard = mv.arm === 2;
    mv.arm = 0; mv.ghost = 1; mv.ghostT = 0; mv.gs = 0; mv.ignN = 0;
    if (mv.type === 'drive') mv.has = false;
    const ign = mv.ign ??= new Int32Array(IGNORE_MAX);
    const nearby = this.neighbors(o, lookAhead);
    for (let d = 0; d <= lookAhead && mv.ignN < IGNORE_MAX; d += 0.4) {
      sample(d, this.pose);
      for (const other of nearby) {
        if (mv.ignN >= IGNORE_MAX) break;
        if (!hard && leads(o, other)) continue;
        if (!ignored(mv, other) && trafficOverlap(o, this.pose, other, 0.25)) ign[mv.ignN++] = other.trafficId;
      }
    }
    if (!mv.ignN) { mv.ghost = hard ? 2 : 0; mv.cw = 0; } // nothing identifiable: ignore everyone only as a last resort
  }

  /** Does the vehicle still touch anything it was allowed to pass through? */
  touching(o) {
    const mv = o.mv;
    this.nearby.length = 0;
    this.game.grid.query(o.x, o.z, shape(o).radius + this.game.maxR * 1.5, this.nearby);
    for (const other of this.nearby) {
      if (other !== o && isTrafficObject(other) && (mv.ghost === 2 || (ignored(mv, other) && !leads(o, other))) && network(other) === network(o) && trafficOverlap(o, o, other, 0.3)) return true;
    }
    return false;
  }
}

/** Boats, trains and planes only interact with their own kind (a car on a bridge does not meet the boat below). */
function network(o) {
  return o.mv?.route?.network || 'road';
}

/** Same heading and in front of o: a ghost still queues behind it rather than driving along inside it. */
function leads(o, other) {
  if (!other.mv || Math.cos(o.yaw - other.yaw) < 0.75) return false;
  const dx = other.x - o.x, dz = other.z - o.z;
  const f = dx * Math.cos(o.yaw) - dz * Math.sin(o.yaw);
  if (f < -0.05) return false;
  // Two vehicles mid-turn can each look "ahead" of the other; that is a conflict, not a queue.
  if (-(dx * Math.cos(other.yaw) - dz * Math.sin(other.yaw)) > 0.05) return false;
  return f > 0.05 || o.trafficId < other.trafficId;
}

function ignored(mv, other) {
  for (let i = 0; i < mv.ignN; i++) if (mv.ign[i] === other.trafficId) return true;
  return false;
}
