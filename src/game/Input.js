// Floating virtual joystick (pointer events: touch + mouse) + WASD/arrows. Direction in world XZ
// (screen up = world -Z, screen right = +X).
const MAX_PX = 60;

export class Input {
  constructor(canvas, joyRoot, { onPause } = {}) {
    this.enabled = false;
    this.x = 0;
    this.z = 0;
    this.keys = new Set();
    this.pointerId = null;
    this.sx = 0; this.sy = 0;
    this.jx = 0; this.jz = 0;
    this.onPause = onPause;

    this.base = document.createElement('div');
    this.base.className = 'joy-base';
    this.knob = document.createElement('div');
    this.knob.className = 'joy-knob';
    this.base.appendChild(this.knob);
    joyRoot.appendChild(this.base);

    canvas.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    window.addEventListener('blur', () => { this.keys.clear(); this.release(); });
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    canvas.addEventListener('lostpointercapture', (e) => this.up(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Stop Safari pinch / scroll / rubber-banding.
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));
    document.addEventListener('touchmove', (e) => { if (e.target === canvas) e.preventDefault(); }, { passive: false });
  }

  setEnabled(v) {
    this.enabled = v;
    this.release(); // never carry a stale pointer across pause/resume
    if (!v) this.keys.clear();
  }

  down(e) {
    if (!this.enabled || this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.sx = e.clientX; this.sy = e.clientY;
    this.jx = 0; this.jz = 0;
    this.base.style.left = `${this.sx}px`;
    this.base.style.top = `${this.sy}px`;
    this.knob.style.transform = 'translate(-50%, -50%)';
    this.base.classList.add('active');
    try { e.target.setPointerCapture?.(e.pointerId); } catch (err) { /* ignore */ }
  }

  move(e) {
    if (e.pointerId !== this.pointerId) return;
    const rx = e.clientX - this.sx, ry = e.clientY - this.sy;
    const len = Math.hypot(rx, ry);
    const k = len > MAX_PX ? MAX_PX / len : 1;
    const dx = rx * k, dy = ry * k;
    const m = Math.min(1, len / MAX_PX);
    this.jx = len > 0 ? (rx / len) * m : 0;
    this.jz = len > 0 ? (ry / len) * m : 0;
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  up(e) {
    if (e.pointerId === this.pointerId) this.release();
  }

  release() {
    this.pointerId = null;
    this.jx = 0; this.jz = 0;
    this.base.classList.remove('active');
  }

  key(e, down) {
    const k = e.key.toLowerCase();
    if (down && k === 'escape') {
      if (!e.repeat) this.onPause?.();
      return;
    }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      if (this.enabled) e.preventDefault();
      if (down) this.keys.add(k); else this.keys.delete(k);
    }
  }

  /** Updates this.x / this.z (magnitude <= 1). */
  poll() {
    if (!this.enabled) { this.x = 0; this.z = 0; return; }
    if (this.pointerId !== null && (this.jx || this.jz)) {
      this.x = this.jx; this.z = this.jz;
      return;
    }
    const k = this.keys;
    let x = 0, z = 0;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) z -= 1;
    if (k.has('s') || k.has('arrowdown')) z += 1;
    const l = Math.hypot(x, z);
    if (l > 0) { x /= l; z /= l; }
    this.x = x; this.z = z;
  }
}
