// Moving objects: wandering walkers, free-roaming drivers and route-following vehicles.
// Movers are ordinary game objects (grid + live lists) that additionally carry `o.mv`; only IDLE movers move,
// and a mover is dropped from the update list the moment it starts falling.
import { IDLE, canSwallow } from './Swallow.js';
import { Traffic } from './Traffic.js';
import { prepareRoadConnection, sampleRoadMotion, advanceRoadMotion } from './RoadNavigation.js';

const TAU = Math.PI * 2;
const PANIC_MUL = 1.3;
const TURN_R = 3.5; // corner fillet radius of a vehicle's lane path
const _c = { x: 0, z: 0 };

// ---- routes ---------------------------------------------------------------

/** points: [[x,z],...] world coords. loop closes back to the first point. */
export function createRoute(points, { loop = true, width = 4, network = 'road' } = {}) {
  const pts = points.map((p) => [p[0], p[1]]);
  const n = pts.length;
  const segN = n < 2 ? 0 : loop ? n : n - 1;
  const cum = new Float64Array(segN + 1);
  for (let i = 0; i < segN; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    cum[i + 1] = cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { points: pts, loop, width, network, n, segN, cum, total: cum[segN] };
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

// ---- lane paths -------------------------------------------------------------
// A vehicle does not follow the route centreline directly: it follows a closed "lane path" built once per
// (route, offset): the centreline shifted sideways by the lane offset, corners rounded with a circular arc
// (tangent to both lanes, so it stays inside the road), and for ping-pong routes a semicircular U-turn of radius
// |offset| at each end joining the outbound lane to the return lane. Vehicles just run round it in one direction.

const pathCache = new WeakMap();

function laneVertices(route, d) {
  const pts = route.points, n = pts.length, loop = route.loop;
  const segs = [];
  const cnt = loop ? n : n - 1;
  for (let i = 0; i < cnt; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-6) continue;
    const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
    // right of travel is (-uz, ux); shift both ends by d
    segs.push({ ux, uz, l, ax: a[0] - uz * d, az: a[1] + ux * d, bx: b[0] - uz * d, bz: b[1] + ux * d });
  }
  return segs;
}

/** Appends the lane polyline (rounded corners) for segs to out. Closed => also rounds the wrap-around corner. */
function roundedLane(segs, closed, out) {
  const m = segs.length;
  const info = new Array(m).fill(null); // info[i] = rounded corner at the START of segment i
  for (let i = 0; i < m; i++) {
    if (!closed && i === 0) continue;
    const s1 = segs[(i + m - 1) % m], s2 = segs[i];
    const cross = s1.ux * s2.uz - s1.uz * s2.ux, dot = s1.ux * s2.ux + s1.uz * s2.uz;
    const phi = Math.atan2(cross, dot);
    if (Math.abs(phi) < 0.02) continue;
    // miter point: intersection of the two shifted lines
    const den = cross;
    const t1 = ((s2.ax - s1.ax) * s2.uz - (s2.az - s1.az) * s2.ux) / den;
    const mx = s1.ax + s1.ux * t1, mz = s1.az + s1.uz * t1;
    const half = Math.abs(phi) / 2;
    const tn = Math.tan(Math.min(half, 1.45));
    // trim limited to half of each neighbouring shifted segment (measured from the miter point)
    const l1 = Math.hypot(mx - s1.ax, mz - s1.az), l2 = Math.hypot(mx - s2.bx, mz - s2.bz);
    const room = Math.min(l1, l2) * 0.5;
    const r = Math.min(TURN_R, room / tn);
    info[i] = { mx, mz, phi, r, t: r * tn };
  }
  out.length = 0;
  for (let i = 0; i < m; i++) {
    const s = segs[i], c = info[i];
    if (!closed && i === 0) { out.push([s.ax, s.az]); continue; }
    if (!c) {
      // straight continuation (collinear): just the shared point
      out.push([s.ax, s.az]);
      continue;
    }
    const s1 = segs[(i + m - 1) % m];
    const px = c.mx - s1.ux * c.t, pz = c.mz - s1.uz * c.t; // tangent point on incoming lane
    const sg = c.phi > 0 ? 1 : -1;
    const nx = -s1.uz * sg, nz = s1.ux * sg; // toward the turn side
    const cx = px + nx * c.r, cz = pz + nz * c.r;
    let vx = -nx * c.r, vz = -nz * c.r;
    const steps = Math.max(2, Math.ceil(Math.abs(c.phi) / 0.2));
    for (let k = 0; k <= steps; k++) {
      const a = c.phi * (k / steps), ca = Math.cos(a), sa = Math.sin(a);
      out.push([cx + vx * ca - vz * sa, cz + vx * sa + vz * ca]);
    }
  }
  if (!closed) { const s = segs[m - 1]; out.push([s.bx, s.bz]); }
}

export function getLanePath(route, offset) {
  let byOff = pathCache.get(route);
  if (!byOff) pathCache.set(route, (byOff = new Map()));
  let path = byOff.get(offset);
  if (path) return path;
  const pts = [];
  const ends = [];
  if (route.loop) {
    const segs = laneVertices(route, offset);
    if (segs.length >= 3) roundedLane(segs, true, pts);
  } else {
    let d = offset;
    if (Math.abs(d) < 0.5) d = d < 0 ? -0.5 : 0.5;
    const fw = laneVertices(route, d);
    if (fw.length) {
      const lane = [];
      roundedLane(fw, false, lane);
      // return lane: reversed centreline, right of reversed travel
      const rev = createRoute(route.points.slice().reverse(), { loop: false });
      const bk = laneVertices(rev, d);
      const back = [];
      roundedLane(bk, false, back);
      const cap = (E, u, out) => { // semicircle around the route end from lane +d to lane -d (u = travel direction)
        const nx = -u.uz, nz = u.ux, ad = Math.abs(d);
        for (let k = 1; k < 8; k++) {
          const a = Math.PI * k / 8, c = Math.cos(a), sn = Math.sin(a);
          out.push([E[0] + nx * d * c + u.ux * ad * sn, E[1] + nz * d * c + u.uz * ad * sn]);
        }
      };
      const first = route.points[0], last = route.points[route.points.length - 1];
      pts.push(...lane);
      ends.push({ index: pts.length - 1, point: last });
      cap(last, fw[fw.length - 1], pts);
      pts.push(...back);
      ends.push({ index: pts.length - 1, point: first });
      cap(first, bk[bk.length - 1], pts);
    }
  }
  if (pts.length < 3) {
    // degenerate route: fall back to the raw polyline
    path = createRoute(route.points.length >= 2 ? route.points : [[0, 0], [1, 0]], { loop: route.loop });
  } else {
    path = createRoute(pts, { loop: true });
  }
  path.centre = route.total;
  path.ends = ends.map(e => ({ s: path.cum[e.index], point: e.point }));
  byOff.set(offset, path);
  return path;
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
    this.traffic = new Traffic(game);
  }

  /** Register a placed object as a mover. cfg: { type:'walk'|'drive'|'route', speed, range, ... } */
  add(o, cfg) {
    const mv = {
      type: cfg.type, speed: cfg.speed ?? 1.5, range: cfg.range ?? 10, turn: cfg.turn ?? 1.8,
      hx: o.x, hz: o.z, tx: 0, tz: 0, has: false, tt: 0, pause: Math.random() * 2, spd: cfg.speed ?? 1.5,
      route: cfg.route || null, s: cfg.s || 0, offset: cfg.offset || 0, path: null,
    };
    if (mv.route) {
      mv.path = getLanePath(mv.route, mv.offset);
      // cfg.s is an arc length on the centreline; ping-pong lane paths are ~2x longer (out + back)
      if (mv.route.total > 0) {
        let f = mv.s / mv.route.total;
        if (!mv.route.loop) f = (f + 0.09) % 1; // spread over both legs; the shift keeps even splits off the route midpoint
        mv.s = f * mv.path.total;
      }
    }
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
    if (!mv.has) this.pickDriveTarget(o, mv);
    const dx = mv.tx - o.x, dz = mv.tz - o.z;
    const d = Math.hypot(dx, dz);
    mv.tt -= dt;
    const arrive = Math.max(1.5, (mv.spd / mv.turn) * 1.2);
    if (d < arrive || mv.tt <= 0) { mv.has = false; return; }
    let dy = Math.atan2(-dz, dx) - o.yaw;
    dy -= TAU * Math.round(dy / TAU);
    const step = mv.turn * dt;
    const oldYaw = o.yaw;
    const yawStep = dy > step ? step : dy < -step ? -step : dy;
    const yaw = oldYaw + yawStep;
    const speed = mv.spd * (Math.abs(dy) > 1 ? 0.4 : 1);
    const travel = this.traffic.advance(o, dt, speed, (distance, out) => {
      out.x = o.x + Math.cos(yaw) * distance;
      out.z = o.z - Math.sin(yaw) * distance;
      out.yaw = oldYaw + yawStep * Math.min(1, distance / Math.max(0.001, speed * dt));
    });
    o.yaw = oldYaw + yawStep * Math.min(1, travel / Math.max(0.001, speed * dt));
    o.x += Math.cos(yaw) * travel;
    o.z -= Math.sin(yaw) * travel;
    this.clampBounds(o, mv);
    this.commit(o);
  }

  stepRoute(o, mv, dt) {
    prepareRoadConnection(this.game, o);
    const distance = this.traffic.advance(o, dt, mv.speed, (d, out) => sampleRoadMotion(mv, d, out));
    advanceRoadMotion(mv, distance);
    this.evalRoute(o, mv, dt);
  }

  /** Sets position/heading from mv.s along the lane path. dt=0 snaps the heading. */
  evalRoute(o, mv, dt) {
    sampleRoadMotion(mv, 0, _c);
    o.x = _c.x;
    o.z = _c.z;
    o.yaw = _c.yaw;
    this.commit(o);
  }

  /** Drivers cruise ahead; broad reversals are reserved for reaching the map boundary. */
  pickDriveTarget(o, mv) {
    const lim = this.game.size - o.r - 3;
    const distance = Math.max(8, mv.range * 0.85);
    for (let i = 0; i < 24; i++) {
      const spread = i < 12 ? 0.65 : 2.3;
      const heading = o.yaw + (Math.random() * 2 - 1) * spread;
      const x = o.x + Math.cos(heading) * distance;
      const z = o.z - Math.sin(heading) * distance;
      if (Math.abs(x) > lim || Math.abs(z) > lim) continue;
      mv.tx = x; mv.tz = z;
      mv.spd = mv.speed * (0.9 + Math.random() * 0.2);
      mv.has = true; mv.tt = distance / mv.spd * 3 + 5;
      return;
    }
    // Near an outer corner, aim toward the interior instead of repeatedly clipping the boundary.
    mv.tx = o.x * 0.65; mv.tz = o.z * 0.65;
    mv.has = true; mv.tt = Math.hypot(mv.tx - o.x, mv.tz - o.z) / mv.spd * 3 + 5;
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
