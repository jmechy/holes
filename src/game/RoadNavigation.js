import { createRoute, routePointAt, routeDistance, getLanePath } from './Movers.js';

const wrap = (s, length) => ((s % length) + length) % length;
const point = (path, s) => { const p = {}; routePointAt(path, s, p); return p; };
function tangent(path, s, incoming = false) {
  const a = point(path, s - 0.15), b = point(path, incoming ? s : s + 0.15);
  const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: (b.x - a.x) / l, z: (b.z - a.z) / l };
}

// Keep each projection: the two legs of an open road can offer different headings.
function projections(path, p) {
  const result = [];
  for (let i = 0; i < path.segN; i++) {
    const a = path.points[i], b = path.points[(i + 1) % path.n];
    const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
    if (l2 < 1e-8) continue;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
    const distance = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
    result.push({ s: path.cum[i] + t * Math.sqrt(l2), distance });
  }
  return result;
}

function connector(oldRoute, targetRoute, start, end, u, v, margin, limit) {
  const span = Math.hypot(end.x - start.x, end.z - start.z);
  if (span < 0.05) return null;
  const handle = Math.min(span, 5);
  const points = [];
  const steps = Math.max(12, Math.ceil(span / 0.2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, t2 = t * t, t3 = t2 * t;
    const a = 2 * t3 - 3 * t2 + 1, b = t3 - 2 * t2 + t;
    const c = -2 * t3 + 3 * t2, d = t3 - t2;
    const x = a * start.x + b * handle * u.x + c * end.x + d * handle * v.x;
    const z = a * start.z + b * handle * u.z + c * end.z + d * handle * v.z;
    if (Math.abs(x) > limit || Math.abs(z) > limit) return null;
    // Keep the lane trajectory within the union of the two paved corridors.
    if (routeDistance(oldRoute, x, z) + margin > oldRoute.width / 2 + 0.05 &&
        routeDistance(targetRoute, x, z) + margin > targetRoute.width / 2 + 0.05) return null;
    points.push([x, z]);
  }
  return createRoute(points, { loop: false });
}

export function prepareRoadConnection(game, o) {
  const mv = o.mv;
  if (mv?.next && mv.next.sourcePath !== mv.path) mv.next = null;
  if (!mv || mv.next || mv.route?.network !== 'road' || !mv.path?.ends?.length) return;
  const horizon = Math.max(12, mv.speed * 3);
  let endpoint = null, ahead = Infinity;
  for (const e of mv.path.ends) {
    const d = wrap(e.s - mv.s, mv.path.total);
    if (d <= horizon && d < ahead) { endpoint = e; ahead = d; }
  }
  if (!endpoint) return;
  const start = point(mv.path, endpoint.s), u = tangent(mv.path, endpoint.s, true);
  const geometry = o.proto?.geometry;
  if (geometry && !geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry?.boundingBox;
  const margin = box ? Math.min(box.max.x - box.min.x, box.max.z - box.min.z) * (o.scale ?? 1) / 2 : 0;
  const candidates = [];
  for (let index = 0; index < game.routes.length; index++) {
    const route = game.routes[index];
    if (route === mv.route || route.network !== 'road' || route.total < 1 ||
        routeDistance(route, ...endpoint.point) > 0.5) continue;
    const offset = Math.min(Math.max(0.5, Math.abs(mv.offset)), route.width * 0.35);
    const path = getLanePath(route, offset);
    if (path.total < 1) continue;
    for (const projection of projections(path, endpoint.point)) {
      if (projection.distance > route.width / 2 + 0.5) continue;
      // End metadata marks the entrance to each eight-chord semicircular cap.
      const capLength = 16 * Math.max(0.5, offset) * Math.sin(Math.PI / 16);
      if (path.ends?.some(e => wrap(projection.s - e.s, path.total) < capLength - 0.01)) continue;
      const downstream = Math.min(4, Math.max(1.5, route.width * 0.5));
      // Do not merge across a target road's own U-turn.
      if (path.ends?.some(e => wrap(e.s - projection.s, path.total) < downstream + 0.3)) continue;
      const s = wrap(projection.s + downstream, path.total);
      const end = point(path, s), v = tangent(path, s);
      const dot = u.x * v.x + u.z * v.z;
      if (dot < Math.cos(100 * Math.PI / 180)) continue;
      const curve = connector(mv.route, route, start, end, u, v, margin, game.size - (o.r || 0) - 1);
      if (!curve) continue;
      candidates.push({ sourcePath: mv.path, fromS: endpoint.s, connector: curve, route, path, s, offset,
        progress: null, score: Math.acos(Math.max(-1, Math.min(1, dot))) + curve.total * 0.01, index });
    }
  }
  candidates.sort((a, b) => a.score - b.score || a.index - b.index || a.s - b.s);
  if (candidates.length) mv.next = candidates[0];
}

function motionPoint(mv, distance) {
  const next = mv.next;
  if (!next) return point(mv.path, mv.s + distance);
  const until = next.progress == null ? wrap(next.fromS - mv.s, mv.path.total) : -next.progress;
  if (distance < until) return point(mv.path, mv.s + distance);
  const along = distance - until;
  if (along <= next.connector.total) return point(next.connector, along);
  return point(next.path, next.s + along - next.connector.total);
}

export function sampleRoadMotion(mv, distance, out) {
  const p = motionPoint(mv, distance);
  // A forward chord also works at either connector seam and avoids sampling an old path behind a merge.
  const b = motionPoint(mv, distance + 0.15);
  const length = Math.hypot(b.x - p.x, b.z - p.z) || 1;
  out.x = p.x; out.z = p.z;
  out.fx = (b.x - p.x) / length; out.fz = (b.z - p.z) / length;
  out.yaw = Math.atan2(-out.fz, out.fx);
  return out;
}

export function advanceRoadMotion(mv, distance) {
  if (!(distance > 0)) return;
  const next = mv.next;
  if (!next) { mv.s = wrap(mv.s + distance, mv.path.total); return; }
  const until = next.progress == null ? wrap(next.fromS - mv.s, mv.path.total) : -next.progress;
  if (distance < until) { mv.s = wrap(mv.s + distance, mv.path.total); return; }
  const along = distance - until;
  if (along < next.connector.total) {
    mv.s = next.fromS;
    next.progress = along;
    return;
  }
  mv.route = next.route; mv.path = next.path; mv.offset = next.offset;
  mv.s = wrap(next.s + along - next.connector.total, mv.path.total);
  mv.next = null;
}
