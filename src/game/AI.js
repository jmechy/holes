// Rival steering: pick a target every ~0.5-1s, flee bigger holes, chase smaller ones, otherwise eat clusters.
const CLUSTER_CELL = 8;
const SEARCH_R = 26;

export class AI {
  constructor(hole) {
    this.hole = hole;
    this.thinkT = Math.random() * 0.5;
    this.tx = 0; this.tz = 0;
    this.fleeing = false;
    this.wander = 0;
    this.wanderTarget = 0;
    this.dirx = 0; this.dirz = 0;
    this.stuckT = 0;
  }

  think(game) {
    const h = this.hole;
    this.fleeing = false;
    let fx = 0, fz = 0, threat = false;
    let prey = null, preyD = 1e9;
    for (const o of game.holes) {
      if (o === h || !o.alive) continue;
      const d = Math.hypot(o.x - h.x, o.z - h.z);
      if (o.r >= h.r * 1.2 && d < 14 + o.r * 2) {
        const w = 1 / Math.max(1, d);
        fx += ((h.x - o.x) / Math.max(d, 0.01)) * w * 10;
        fz += ((h.z - o.z) / Math.max(d, 0.01)) * w * 10;
        threat = true;
      } else if (h.r >= o.r * 1.3 && d < 24 + h.r && d < preyD) {
        prey = o; preyD = d;
      }
    }
    if (threat) {
      const len = Math.hypot(fx, fz) || 1;
      this.tx = h.x + (fx / len) * 20;
      this.tz = h.z + (fz / len) * 20;
      // Pull toward map centre if fleeing into a wall.
      const lim = game.size - h.r - 4;
      if (Math.abs(this.tx) > lim) this.tx = h.x + (Math.random() - 0.5) * 10 - Math.sign(h.x) * 15;
      if (Math.abs(this.tz) > lim) this.tz = h.z + (Math.random() - 0.5) * 10 - Math.sign(h.z) * 15;
      this.fleeing = true;
      this.thinkT = 0.3;
      return;
    }
    if (prey && Math.random() < 0.85) {
      this.tx = prey.x; this.tz = prey.z;
      this.thinkT = 0.35;
      return;
    }
    // Cluster scoring: bin eatable objects in nearby cells, best value/distance wins.
    const out = game.tmp;
    out.length = 0;
    game.grid.query(h.x, h.z, SEARCH_R + h.r, out);
    const bins = new Map();
    for (let i = 0; i < out.length; i++) {
      const o = out[i];
      if (o.r * 1.15 >= h.r) continue;
      const key = Math.floor(o.x / CLUSTER_CELL) * 4096 + Math.floor(o.z / CLUSTER_CELL);
      let b = bins.get(key);
      if (!b) bins.set(key, (b = { v: 0, x: 0, z: 0 }));
      b.v += o.value; b.x += o.x * o.value; b.z += o.z * o.value;
    }
    let best = null, bestS = 0;
    for (const b of bins.values()) {
      const cx = b.x / b.v, cz = b.z / b.v;
      const d = Math.hypot(cx - h.x, cz - h.z);
      const s = b.v / (d + 4);
      if (s > bestS) { bestS = s; best = { x: cx, z: cz }; }
    }
    if (!best) {
      // Nothing nearby: sample the whole map for a reachable object.
      const live = game.live;
      let bs = 0;
      for (let k = 0; k < 40 && live.length; k++) {
        const o = live[(Math.random() * live.length) | 0];
        if (o.r * 1.15 >= h.r) continue;
        const s = o.value / (Math.hypot(o.x - h.x, o.z - h.z) + 10);
        if (s > bs) { bs = s; best = { x: o.x, z: o.z }; }
      }
    }
    if (best) {
      this.tx = best.x; this.tz = best.z;
    } else {
      this.tx = (Math.random() * 2 - 1) * game.size * 0.8;
      this.tz = (Math.random() * 2 - 1) * game.size * 0.8;
    }
    this.thinkT = 0.5 + Math.random() * 0.5;
  }

  update(dt, game) {
    const h = this.hole;
    if (!h.alive) return;
    this.thinkT -= dt;
    if (this.thinkT <= 0) this.think(game);
    // Wander noise: slowly drifting angular offset.
    if (Math.random() < dt * 1.5) this.wanderTarget = (Math.random() - 0.5) * (this.fleeing ? 0.3 : 0.9);
    this.wander += (this.wanderTarget - this.wander) * Math.min(1, dt * 2);
    let dx = this.tx - h.x, dz = this.tz - h.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.0 && !this.fleeing) this.thinkT = Math.min(this.thinkT, 0.1);
    if (d < 0.01) { dx = 0; dz = 0; } else { dx /= d; dz /= d; }
    const c = Math.cos(this.wander), s = Math.sin(this.wander);
    const rx = dx * c - dz * s, rz = dx * s + dz * c;
    const mag = d < 2 && !this.fleeing ? Math.max(0.3, d / 2) : 1;
    h.move(rx * mag, rz * mag, dt, 0.9, game.size);
  }
}
