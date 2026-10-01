// Graphics "Auto": starts at High and watches smoothed frame time. Sustained slow frames step quality down one rung at a
// time (post-processing -> shadow update rate / map size -> pixel ratio 2 -> 1.5 -> 1.25 -> shadows off); sustained fast
// frames step it back up. Hysteresis: a cooldown after every change, a long "fast" requirement before stepping up, an
// up-delay that doubles whenever a step up is followed by a step down, and that rung is then locked out for a while
// (no oscillation). Silent (dev console.debug only).

const SLOW_FPS = 50;
const FAST_FPS = 58;
const WINDOW = 1; // seconds per measurement window
const SLOW_WINDOWS = 3; // consecutive slow windows before stepping down
const COOLDOWN = 3; // seconds to settle after a change (shader compiles, render-target reallocation)
const WARMUP = 4; // seconds after a world starts
const UP_DELAY = 8; // base seconds of sustained fast frames before stepping up
const UP_DELAY_MAX = 120;
const HITCH = 0.25; // an isolated frame longer than this (tab switch, shader compile) is not counted...
const HITCH_STREAK = 3; // ...but this many in a row is just a slow device
const LOCK_SECONDS = 300; // a rung that could not hold 50fps stays off-limits this long

// Rungs, cheapest visual loss first. Each entry is the full set of knobs at that level.
const RUNGS = [
  { post: true, shadowRate: 2, shadowSize: 2048, pixelRatio: 2, shadows: true }, // 0: full High
  { post: false, shadowRate: 2, shadowSize: 2048, pixelRatio: 2, shadows: true },
  { post: false, shadowRate: 3, shadowSize: 1024, pixelRatio: 2, shadows: true },
  { post: false, shadowRate: 3, shadowSize: 1024, pixelRatio: 1.5, shadows: true },
  { post: false, shadowRate: 3, shadowSize: 1024, pixelRatio: 1.25, shadows: true },
  { post: false, shadowRate: 3, shadowSize: 1024, pixelRatio: 1.25, shadows: false },
];

export class AdaptiveQuality {
  constructor(game) {
    this.game = game;
    this.level = 0;
    this.upDelay = UP_DELAY;
    this.lastUp = -1e9;
    this.streak = 0;
    this.clock = 0; // seconds of play sampled
    this.floor = 0; // lowest level (highest quality) currently allowed
    this.floorUntil = 0;
    this.resetWindow(WARMUP);
  }

  resetWindow(hold = COOLDOWN) {
    this.hold = hold;
    this.acc = 0;
    this.frames = 0;
    this.slow = 0;
    this.fast = 0;
  }

  /** Effective knobs for a rung on this device/map: rungs that change nothing are skipped. */
  rung(level) {
    const g = this.game, base = RUNGS[level];
    const dpr = window.devicePixelRatio || 1;
    return { ...base, post: base.post || !g.postProcessing, pixelRatio: Math.min(dpr, base.pixelRatio) };
  }

  changes(from, to) {
    const a = this.rung(from), b = this.rung(to);
    return a.post !== b.post || a.shadowRate !== b.shadowRate || a.shadowSize !== b.shadowSize ||
      a.pixelRatio !== b.pixelRatio || a.shadows !== b.shadows;
  }

  /** A new world was built (applyQuality reset the knobs): reapply the learned level. */
  onWorld() {
    this.resetWindow(WARMUP);
    this.game.setDynamicQuality(this.rung(this.level));
  }

  /** Raw frame time in seconds (only called while playing). */
  sample(raw) {
    if (!(raw > 0)) return;
    this.clock += Math.min(raw, 1);
    if (raw > HITCH && ++this.streak < HITCH_STREAK) { this.resetWindow(Math.max(this.hold, 1)); return; }
    if (raw <= HITCH) this.streak = 0;
    if (this.hold > 0) { this.hold -= raw; return; }
    this.acc += raw;
    this.frames++;
    if (this.acc < WINDOW) return;
    const fps = this.frames / this.acc;
    this.acc = 0;
    this.frames = 0;
    if (fps < SLOW_FPS) {
      this.fast = 0;
      if (++this.slow >= SLOW_WINDOWS) this.step(1, fps);
    } else {
      this.slow = 0;
      if (fps > FAST_FPS) {
        this.fast += WINDOW;
        if (this.fast >= this.upDelay) this.step(-1, fps);
      } else this.fast = 0;
    }
  }

  step(dir, fps) {
    let to = this.level + dir;
    const now = this.clock;
    if (dir < 0 && now < this.floorUntil && to < this.floor) { this.fast = 0; return; }
    while (to >= 0 && to < RUNGS.length && !this.changes(this.level, to) && to !== this.level) to += dir;
    if (to < 0 || to >= RUNGS.length) { this.resetWindow(COOLDOWN); return; }
    if (dir > 0 && now - this.lastUp < 30) { // stepped up, fell again: back off and lock that rung out
      this.upDelay = Math.min(UP_DELAY_MAX, this.upDelay * 2);
      this.floor = to;
      this.floorUntil = now + LOCK_SECONDS;
    }
    if (dir < 0) this.lastUp = now;
    this.level = to;
    this.game.setDynamicQuality(this.rung(to));
    this.resetWindow(COOLDOWN);
    if (import.meta.env?.DEV) console.debug(`[quality] ${fps.toFixed(0)}fps -> level ${to}`, this.rung(to));
  }
}
