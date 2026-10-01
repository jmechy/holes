import { IDLE, WOBBLE } from './Swallow.js';

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

  neighbors(o, reach) {
    this.nearby.length = 0;
    this.game.grid.query(o.x, o.z, reach + shape(o).radius + this.game.maxR * 1.5, this.nearby);
    let count = 0;
    for (const other of this.nearby) {
      if (other !== o && (other.state === IDLE || other.state === WOBBLE) && isTrafficObject(other)) this.nearby[count++] = other;
    }
    this.nearby.length = count;
    return this.nearby;
  }

  clear(o, pose, neighbors, padding = 0.12, soft = false) {
    for (const other of neighbors) {
      // Give crossings a stable priority; every actual movement still checks both footprints.
      // This lets one driver close the soft braking margin while the other yields.
      if (soft && other.mv && other.mv.type !== 'walk' &&
          Math.abs(Math.cos(o.yaw - other.yaw)) < 0.75 && o.trafficId < other.trafficId) continue;
      if (trafficOverlap(o, pose, other, padding)) return false;
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
    const nearby = this.neighbors(o, lookAhead);
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
    return allowed;
  }
}
