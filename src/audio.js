// Tiny WebAudio blips. No asset files. Respects the sound setting.
import { getSettings } from './settings.js';

let ctx = null;
let lastPop = 0;
let combo = 0;

function ensure() {
  if (!getSettings().sound) return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) {
      return null;
    }
  }
  // iOS Safari can also leave the context 'interrupted' (backgrounding, phone calls), not just 'suspended'.
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}

let primed = false;
// Runs inside a user gesture: create/resume the context and play one silent buffer so iOS lets audio through.
function unlockFromGesture() {
  const c = ensure();
  if (!c) return;
  if (!primed) {
    try {
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
      primed = true;
    } catch (e) { /* ignore */ }
  }
}

if (typeof window !== 'undefined') {
  // Kept for the page's lifetime: any later gesture re-attempts resume if iOS interrupted us again.
  ['pointerdown', 'touchend', 'keydown'].forEach((n) => window.addEventListener(n, unlockFromGesture, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); });
}

function blip(freq, dur, type = 'sine', vol = 0.15, when = 0, slideTo = null) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const audio = {
  /** Call from a user gesture so iOS Safari allows audio. */
  unlock() {
    ensure();
  },
  pop() {
    const now = performance.now();
    combo = now - lastPop < 500 ? Math.min(combo + 1, 12) : 0;
    lastPop = now;
    blip(360 + combo * 40, 0.09, 'sine', 0.14, 0, 720 + combo * 60);
  },
  levelUp() {
    blip(520, 0.1, 'triangle', 0.12);
    blip(780, 0.14, 'triangle', 0.12, 0.08);
  },
  levelComplete() {
    [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.16, i * 0.12));
  },
  eaten() {
    blip(300, 0.35, 'sawtooth', 0.12, 0, 80);
  },
  tick() {
    blip(880, 0.06, 'square', 0.05);
  },
};
