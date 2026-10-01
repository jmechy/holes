// Main menu, map pickers, settings.
import { MAPS } from '../maps/index.js';
import { getSettings, saveSettings, getBest, getArcadeBest } from '../settings.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** handlers: { onAdventure(startIndex), onPick(map), onTime(map), onArcade(map), onTest(map) } */
export function showMenu(root, handlers, view = 'main') {
  const draw = (v) => {
    const s = getSettings();
    let html = '';
    if (v === 'main') {
      html = `
        <div class="logo"><span>H</span><span class="o">O</span><span>L</span><span>E</span><span>S</span></div>
        <div class="menu-buttons">
          <button class="btn big green" data-a="adventure">&#128507; Adventure</button>
          <button class="btn big orange" data-a="pick">&#128506; Pick a Map</button>
          <button class="btn big pink" data-a="time">&#9201; Time Attack (60s)</button>
          <button class="btn big purple" data-a="arcade">&#128377; Arcade</button>
          <button class="btn big blue" data-a="settings">&#9881; Settings</button>
        </div>
        <p class="hint">Drag to move &middot; WASD / arrows on keyboard &middot; Esc to pause</p>
        <button class="btn test-mode-entry" data-a="test">Test Mode</button>`;
    } else if (v === 'adventure') {
      const p = s.progress;
      const can = p > 0 && p < MAPS.length;
      html = `
        <h2>Adventure</h2>
        <div class="menu-buttons">
          ${can ? `<button class="btn big green" data-a="continue">Continue from map ${p + 1}</button>` : ''}
          <button class="btn big ${can ? 'orange' : 'green'}" data-a="new">${can ? 'Restart Adventure' : 'Start Adventure'}</button>
          <button class="btn back" data-a="back">&#9664; Back</button>
        </div>`;
    } else if (v === 'pick' || v === 'time' || v === 'arcade' || v === 'test') {
      const cards = MAPS.map(
        (m, i) => `
        <button class="card" data-a="map" data-i="${i}" style="--c:${m.cardColor}">
          <span class="emoji">${m.emoji}</span><span class="name">${esc(m.name)}</span>
          ${v === 'time' && getBest(m.id) ? `<span class="best">Best ${getBest(m.id)}</span>` : ''}
          ${v === 'arcade' && getArcadeBest(m.id) ? `<span class="best">Best ${getArcadeBest(m.id)}</span>` : ''}
        </button>`
      ).join('');
      const rnd =
        v === 'time' || v === 'arcade'
          ? `<button class="card" data-a="map" data-i="random" style="--c:#8e6bff"><span class="emoji">&#127922;</span><span class="name">Random</span></button>`
          : '';
      html = `
        <h2>${v === 'test' ? 'Test Mode &mdash; pick a map' : v === 'time' ? 'Time Attack &ndash; pick a map' : v === 'arcade' ? 'Arcade &ndash; pick a map' : 'Pick a Map'}</h2>
        <div class="cards">${cards}${rnd}</div>
        <button class="btn back" data-a="back">&#9664; Back</button>`;
    } else if (v === 'settings') {
      const goals = [[1, 'All items'], [0.9, '90%'], [0.75, '75%']];
      html = `
        <h2>Settings</h2>
        <div class="panel settings">
          <div class="srow"><label>Rivals</label>
            <button class="toggle ${s.rivals ? 'on' : ''}" data-a="rivals">${s.rivals ? 'ON' : 'OFF'}</button></div>
          <div class="srow"><label>Number of rivals</label>
            <div class="stepper"><button data-a="rc-" >&minus;</button><b>${s.rivalCount}</b><button data-a="rc+">+</button></div></div>
          <div class="srow"><label>Completion goal</label>
            <div class="seg">${goals.map(([g, l]) => `<button class="${s.goal === g ? 'on' : ''}" data-a="goal" data-g="${g}">${l}</button>`).join('')}</div></div>
          <div class="srow"><label>Graphics</label>
            <div class="seg">${[['auto', 'Auto'], ['high', 'High'], ['low', 'Low']].map(([g, l]) => `<button class="${(s.graphics || 'auto') === g ? 'on' : ''}" data-a="gfx" data-g="${g}">${l}</button>`).join('')}</div></div>
          <div class="srow"><label>Sound</label>
            <button class="toggle ${s.sound ? 'on' : ''}" data-a="sound">${s.sound ? 'ON' : 'OFF'}</button></div>
        </div>
        <button class="btn back" data-a="back">&#9664; Back</button>`;
    }
    root.innerHTML = `<div class="screen menu${v === 'main' ? ' main-menu' : v === 'test' ? ' test-map-picker' : ''}">${html}</div>`;
    current = v;
  };
  let current = view;
  draw(view);

  root.onclick = (e) => {
    const t = e.target.closest('[data-a]');
    if (!t) return;
    const a = t.dataset.a;
    const s = getSettings();
    switch (a) {
      case 'adventure': draw('adventure'); break;
      case 'pick': draw('pick'); break;
      case 'time': draw('time'); break;
      case 'arcade': draw('arcade'); break;
      case 'test': draw('test'); break;
      case 'settings': draw('settings'); break;
      case 'back': draw('main'); break;
      case 'continue': handlers.onAdventure(s.progress); break;
      case 'new': saveSettings({ progress: 0 }); handlers.onAdventure(0); break;
      case 'map': {
        const i = t.dataset.i;
        const map = i === 'random' ? MAPS[Math.floor(Math.random() * MAPS.length)] : MAPS[+i];
        if (current === 'time') handlers.onTime(map);
        else if (current === 'arcade') handlers.onArcade(map);
        else if (current === 'test') handlers.onTest(map);
        else handlers.onPick(map);
        break;
      }
      case 'rivals': saveSettings({ rivals: !s.rivals }); draw('settings'); break;
      case 'sound': saveSettings({ sound: !s.sound }); draw('settings'); break;
      case 'rc-': saveSettings({ rivalCount: Math.max(1, s.rivalCount - 1) }); draw('settings'); break;
      case 'rc+': saveSettings({ rivalCount: Math.min(4, s.rivalCount + 1) }); draw('settings'); break;
      case 'gfx': saveSettings({ graphics: t.dataset.g === 'low' ? 'low' : t.dataset.g === 'high' ? 'high' : 'auto' }); draw('settings'); break;
      case 'goal': saveSettings({ goal: parseFloat(t.dataset.g) }); draw('settings'); break;
      default:
    }
  };
}
