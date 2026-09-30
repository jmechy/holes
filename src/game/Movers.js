// Moving objects: wandering walkers, free-roaming drivers and route-following vehicles.
// Movers are ordinary game objects (grid + live lists) that additionally carry `o.mv`; only IDLE movers move,
// and a mover is dropped from the update list the moment it starts falling.
import { IDLE, canSwallow } from './Swallow.js';

const TAU = Math.PI * 2;
const PANIC_MUL = 1.3;
const CHORD = 2.5; // route vehicles aim along the chord between s-CHORD and s+CHORD, which cuts corners smoothly
const _a = { x: 0, z: 0 };
const _b = { x: 0, z: 0 };

// ---- routes ---------------------------------------------------------------

/** points: [[x,z],...] world coords. loop closes back to the first point. */
export function createRoute(points, { loop = true, width = 4 } = {}) {
  const pts = points.map((p) => [p[0], p[1]]);
  const n = pts.length;
  const segN = n < 2 ? 0 : loop ? n : n - 1;
  const cum = new Float64Array(segN + 1);
  for (let i = 0; i < segN; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    cum[i + 1] = cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { points: pts, loop, width, n, segN, cum, total: cum[segN] };
}

/** Point at arc length s (wrapped for loops, clamped otherwise) written into out. */
export function routePointAt(route, s, out) {
  const { cum, segN, total, points, n } = route;
  if (route.loop) s = ((s % total) + total) % total;
  else s = s < 0 ? 0 : s > total ? total : s;
  let lo = 0, hi = segN - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= s) lo = mid; else hi = mid - 1;
  }
  const a = points[lo], b = points[(lo + 1) % n];
  const len = cum[lo + 1] - cum[lo];
  const t = len > 1e-9 ? (s - cum[lo]) / len : 0;
  out.x = a[0] + (b[0] - a[0]) * t;
  out.z = a[1] + (b[1] - a[1]) * t;
}

/** Distance from (x,z) to the route polyline. */
export function routeDistance(route, x, z) {
  const { points, n, segN } = route;
  let best = Infinity;
  for (let i = 0; i < segN; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz;
    let t = l2 > 1e-9 ? ((x - a[0]) * dx + (z - a[1]) * dz) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
    if (d < best) best = d;
  }
  return best;
}

// ---- movers ---------------------------------------------------------------

function turnToward(o, target, k) {
  let d = target - o.yaw;
  d -= TAU * Math.round(d / TAU);
  o.yaw += d * k;
}

export class Movers {
  constructor(game) {
    this.game = game;
    this.list = [];
  }

  /** Register a placed object as a mover. cfg: { type:'walk'|'drive'|'route', speed, range, ... } */
  add(o, cfg) {
    const mv = {
      type: cfg.type, speed: cfg.speed ?? 1.5, range: cfg.range ?? 10, turn: cfg.turn ?? 1.8,
      hx: o.x, hz: o.z, tx: 0, tz: 0, has: false, tt: 0, pause: Math.random() * 2, spd: cfg.speed ?? 1.5,
      route: cfg.route || null, s: cfg.s || 0, dir: 1, offset: cfg.offset || 0, lat: cfg.offset || 0,
    };
    o.mv = mv;
    o.mvIdx = this.list.length;
    this.list.push(o);
  }

  remove(o) {
    const last = this.list[this.list.length - 1];
    this.list[o.mvIdx] = last;
    last.mvIdx = o.mvIdx;
    this.list.pop();
    o.mv = null;
  }

  update(dt) {
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o.state !== IDLE) continue; // wobbling: hold still until it settles
      const mv = o.mv;
      if (mv.type === 'route') this.stepRoute(o, mv, dt);
      else if (mv.type === 'walk') this.stepWalk(o, mv, dt);
      else this.stepDrive(o, mv, dt);
    }
  }

  commit(o) {
    const m = o.mesh;
    m.position.set(o.x, 0, o.z);
    m.rotation.y = o.yaw;
    m.updateMatrix();
    this.game.grid.move(o);
  }

  pickTarget(o, mv, min) {
    const lim = this.game.size - o.r - 3;
    const ang = Math.random() * TAU;
    const dist = min + Math.random() * Math.max(0.1, mv.range - min);
    mv.tx = Math.max(-lim, Math.min(lim, mv.hx + Math.cos(ang) * dist));
    mv.tz = Math.max(-lim, Math.min(lim, mv.hz + Math.sin(ang) * dist));
    mv.spd = mv.speed * (0.8 + Math.random() * 0.4);
    mv.has = true;
    mv.tt = Math.hypot(mv.tx - o.x, mv.tz - o.z) / mv.spd * 2.5 + 3;
  }

  stepWalk(o, mv, dt) {
    const g = this.game;
    // Panic: run away from any hole that could swallow us.
    let fx = 0, fz = 0;
    const holes = g.holes;
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      if (!h.alive || !canSwallow(h, o)) continue;
      const dx = o.x - h.x, dz = o.z - h.z;
      const lim = h.r * 2 + o.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= lim * lim) continue;
      const d = Math.sqrt(d2) || 0.01;
      const w = 1 / (d + 1);
      fx += (dx / d) * w; fz += (dz / d) * w;
    }
    let dirx, dirz, speed;
    const wl = g.size - o.r - 1;
    if (fx !== 0 || fz !== 0) {
      // Don't run into a wall: drop the component pushing outward when hugging one.
      if ((o.x >= wl - 0.01 && fx > 0) || (o.x <= -wl + 0.01 && fx < 0)) fx = 0;
      if ((o.z >= wl - 0.01 && fz > 0) || (o.z <= -wl + 0.01 && fz < 0)) fz = 0;
      const l = Math.hypot(fx, fz);
      mv.has = false; mv.pause = 0.2;
      if (l < 1e-6) return;
      dirx = fx / l; dirz = fz / l;
      speed = mv.speed * PANIC_MUL;
      turnToward(o, Math.atan2(-dirz, dirx), Math.min(1, dt * 16));
    } else {
      if (mv.pause > 0) { mv.pause -= dt; return; }
      if (!mv.has) this.pickTarget(o, mv, mv.range * 0.2);
      const dx = mv.tx - o.x, dz = mv.tz - o.z;
      const d = Math.hypot(dx, dz);
      mv.tt -= dt;
      if (d < 0.25 || mv.tt <= 0) { mv.has = false; mv.pause = 0.5 + Math.random() * 2.5; return; }
      dirx = dx / d; dirz = dz / d;
      speed = mv.spd;
      turnToward(o, Math.atan2(-dirz, dirx), Math.min(1, dt * 10));
    }
    o.x += dirx * speed * dt;
    o.z += dirz * speed * dt;
    this.clampBounds(o, mv);
    this.commit(o);
  }

  stepDrive(o, mv, dt) {
    if (!mv.has) this.pickTarget(o, mv, mv.range * 0.3);
    const dx = mv.tx - o.x, dz = mv.tz - o.z;
    const d = Math.hypot(dx, dz);
    mv.tt -= dt;
    const arrive = Math.max(1.5, (mv.spd / mv.turn) * 1.2);
    if (d < arrive || mv.tt <= 0) { mv.has = false; return; }
    let dy = Math.atan2(-dz, dx) - o.yaw;
    dy -= TAU * Math.round(dy / TAU);
    const step = mv.turn * dt;
    o.yaw += dy > step ? step : dy < -step ? -step : dy;
    const speed = mv.spd * (Math.abs(dy) > 1 ? 0.4 : 1);
    o.x += Math.cos(o.yaw) * speed * dt;
    o.z -= Math.sin(o.yaw) * speed * dt;
    this.clampBounds(o, mv);
    this.commit(o);
  }

  stepRoute(o, mv, dt) {
    const R = mv.route;
    mv.s += mv.dir * mv.speed * dt;
    if (R.loop) {
      if (mv.s >= R.total) mv.s -= R.total;
    } else if (mv.s > R.total) { mv.s = R.total; mv.dir = -1; }
    else if (mv.s < 0) { mv.s = 0; mv.dir = 1; }
    this.evalRoute(o, mv, dt);
  }

  /** Sets position/heading from mv.s. dt=0 snaps the heading. */
  evalRoute(o, mv, dt) {
    const R = mv.route;
    routePointAt(R, mv.s - mv.dir * CHORD, _a);
    routePointAt(R, mv.s + mv.dir * CHORD, _b);
    let fx = (_b.x - _a.x) * mv.dir, fz = (_b.z - _a.z) * mv.dir; // +s tangent
    const l = Math.hypot(fx, fz);
    if (l < 1e-6) { fx = 1; fz = 0; } else { fx /= l; fz /= l; }
    // Lane offset is to the right of travel; ping-pong reversal eases it across to the other side.
    mv.lat += (mv.offset * mv.dir - mv.lat) * (dt > 0 ? Math.min(1, dt * 2) : 1);
    o.x = (_a.x + _b.x) / 2 - fz * mv.lat;
    o.z = (_a.z + _b.z) / 2 + fx * mv.lat;
    const yaw = Math.atan2(-fz * mv.dir, fx * mv.dir);
    if (dt > 0) turnToward(o, yaw, Math.min(1, dt * 8)); else o.yaw = yaw;
    this.commit(o);
  }

  clampBounds(o, mv) {
    const lim = this.game.size - o.r - 1;
    if (o.x > lim || o.x < -lim || o.z > lim || o.z < -lim) {
      o.x = Math.max(-lim, Math.min(lim, o.x));
      o.z = Math.max(-lim, Math.min(lim, o.z));
      mv.has = false;
    }
  }
}
