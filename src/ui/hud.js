// In-game DOM overlay: progress bar, size, timer, leaderboard, pause button/menu, respawn overlay, popups.
export function createHUD(root, { onPause, onResume, onRestart, onMenu, onZoomIn, onZoomOut, onFitView }) {
  root.innerHTML = `
    <div class="hud hidden">
      <div class="hud-tl">
        <div class="hud-map"></div>
        <div class="hud-test-label hidden">Test Mode</div>
        <div class="hud-progress"><div class="hud-fill"></div><div class="hud-goal"></div><span class="hud-pct"></span></div>
        <div class="hud-sizebox">
          <div class="hud-size">Size <b>12</b></div>
          <div class="hud-lvl"><i></i></div>
        </div>
      </div>
      <div class="hud-timer hidden">60</div>
      <div class="hud-gains"></div>
      <div class="hud-arcade hidden">
        <div class="hud-score">Score <b>0</b></div>
        <div class="hud-combo hidden"><span>Combo x2!</span><div class="hud-combobar"><i></i></div></div>
      </div>
      <div class="hud-tr">
        <button class="hud-pause" aria-label="Pause">II</button>
        <div class="hud-board"></div>
      </div>
      <div class="hud-popups"></div>
      <div class="hud-respawn hidden"><div><h2>Swallowed!</h2><p>Respawning&hellip;</p></div></div>
      <div class="hud-viewer hidden">
        <div class="hud-viewer-controls" role="group" aria-label="Map viewer controls">
          <button class="viewer-button viewer-zoom" data-view="in" aria-label="Zoom in" title="Zoom in">+</button>
          <button class="viewer-button viewer-zoom" data-view="out" aria-label="Zoom out" title="Zoom out">&minus;</button>
          <button class="viewer-button" data-view="fit">Fit map</button>
          <button class="viewer-button" data-view="menu">Main Menu</button>
        </div>
        <p class="hud-viewer-hint">Drag / WASD / arrows to pan &middot; N/M, +/&minus; or wheel to zoom</p>
      </div>
      <div class="pause-menu hidden">
        <div class="panel">
          <h2>Paused</h2>
          <button class="btn green" data-a="resume">Resume</button>
          <button class="btn blue" data-a="restart">Restart</button>
          <button class="btn red" data-a="menu">Main Menu</button>
        </div>
      </div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const el = {
    viewer: $('.hud-viewer'), testLabel: $('.hud-test-label'),
    hud: $('.hud'), map: $('.hud-map'), fill: $('.hud-fill'), goal: $('.hud-goal'), pct: $('.hud-pct'),
    progress: $('.hud-progress'), lvl: $('.hud-lvl'), lvlFill: $('.hud-lvl i'), size: $('.hud-size b'), timer: $('.hud-timer'), gains: $('.hud-gains'), arcade: $('.hud-arcade'), score: $('.hud-score b'),
    combo: $('.hud-combo'), comboText: $('.hud-combo span'), comboBar: $('.hud-combobar i'), board: $('.hud-board'),
    popups: $('.hud-popups'), respawn: $('.hud-respawn'), pause: $('.pause-menu'), pbtn: $('.hud-pause'),
  };
  const cache = {};
  const setText = (key, node, val) => {
    if (cache[key] !== val) { cache[key] = val; node.textContent = val; }
  };

  el.pbtn.addEventListener('click', (e) => { e.stopPropagation(); onPause(); });
  el.pbtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.viewer.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.viewer.addEventListener('click', (e) => {
    e.stopPropagation();
    const action = e.target.closest('[data-view]')?.dataset.view;
    if (action === 'in') onZoomIn?.();
    else if (action === 'out') onZoomOut?.();
    else if (action === 'fit') onFitView?.();
    else if (action === 'menu') onMenu();
  });
  el.pause.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.pause.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'resume') onResume();
    else if (a === 'restart') onRestart();
    else if (a === 'menu') onMenu();
  });

  return {
    show(map, mode) {
      const test = mode === 'test';
      el.hud.classList.remove('hidden');
      el.hud.classList.toggle('test-mode', test);
      el.viewer.classList.toggle('hidden', !test);
      el.testLabel.classList.toggle('hidden', !test);
      el.timer.classList.add('hidden');
      el.pause.classList.add('hidden');
      el.respawn.classList.add('hidden');
      el.popups.innerHTML = '';
      el.map.textContent = `${map.emoji || ''} ${map.name}`;
      el.progress.classList.toggle('hidden', mode === 'time');
      el.arcade.classList.toggle('hidden', mode !== 'arcade');
      el.combo.classList.add('hidden');
      el.gains.innerHTML = '';
      Object.keys(cache).forEach((k) => delete cache[k]);
    },
    hide() {
      el.hud.classList.add('hidden');
      el.pause.classList.add('hidden');
      el.respawn.classList.add('hidden');
      el.popups.innerHTML = '';
      el.gains.innerHTML = '';
    },
    setSize(n) { setText('size', el.size, String(n)); },
    /** Progress toward the next size level (0..1); restarts + pulses when `level` increases. */
    setLevel(frac, level) {
      const w = `${(frac * 100).toFixed(1)}%`;
      if (cache.lw !== w) { cache.lw = w; el.lvlFill.style.width = w; }
      if (cache.lvl !== undefined && level > cache.lvl) {
        el.lvl.classList.remove('pop');
        void el.lvl.offsetWidth; // restart the animation
        el.lvl.classList.add('pop');
      }
      cache.lvl = level;
    },
    setProgress(frac, goal) {
      const w = `${Math.min(100, (frac / (goal || 1)) * 100).toFixed(1)}%`;
      if (cache.w !== w) { cache.w = w; el.fill.style.width = w; }
      if (goal) {
        setText('pct', el.pct, `${Math.round(frac * 100)}% / ${Math.round(goal * 100)}%`);
      }
    },
    setTimer(sec) {
      if (sec === null) { el.timer.classList.add('hidden'); return; }
      el.timer.classList.remove('hidden');
      const s = Math.ceil(sec);
      setText('timer', el.timer, String(s));
      el.timer.classList.toggle('urgent', s <= 10);
    },
    setScore(n) { setText('score', el.score, String(n)); },
    /** combo count + remaining fraction (0..1) of the chain window; hidden below x2. */
    setCombo(n, frac) {
      const show = n >= 2 && frac > 0;
      el.combo.classList.toggle('hidden', !show);
      if (!show) return;
      const prev = cache.combo;
      setText('combo', el.comboText, `Combo x${n}!`);
      if (prev !== undefined && prev !== `Combo x${n}!`) {
        el.combo.classList.remove('bump');
        void el.combo.offsetWidth;
        el.combo.classList.add('bump');
      }
      const w = `${(frac * 100).toFixed(0)}%`;
      if (cache.cw !== w) { cache.cw = w; el.comboBar.style.width = w; }
    },
    /** Floating "+Xs" under the timer. */
    timeGain(text) {
      const d = document.createElement('div');
      d.className = 'gain';
      d.textContent = text;
      el.gains.appendChild(d);
      while (el.gains.childElementCount > 3) el.gains.firstChild.remove();
      setTimeout(() => d.remove(), 1200);
      this.flashTimer('gain');
    },
    flashTimer(kind) {
      const cls = kind === 'gain' ? 'flash-gain' : 'flash-bad';
      el.timer.classList.remove('flash-gain', 'flash-bad');
      void el.timer.offsetWidth;
      el.timer.classList.add(cls);
    },
    setBoard(rows) {
      const html = rows
        .map((r, i) => `<div class="row${r.me ? ' me' : ''}${r.alive ? '' : ' dead'}"><i style="background:${r.color}"></i><span>${i + 1}. ${r.name}</span><b>${r.size}</b></div>`)
        .join('');
      if (cache.board !== html) { cache.board = html; el.board.innerHTML = html; }
    },
    showRespawn(v) { el.respawn.classList.toggle('hidden', !v); },
    showPause(v) { el.pause.classList.toggle('hidden', !v); },
    popup(text, ms = 1600) {
      const d = document.createElement('div');
      d.className = 'popup';
      d.textContent = text;
      el.popups.replaceChildren(d);
      setTimeout(() => d.remove(), ms);
    },
  };
}
