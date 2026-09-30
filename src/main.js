// Boot + screen state machine: menu -> game -> results.
import './ui/styles.css';
import { Game } from './game/Game.js';
import { Input } from './game/Input.js';
import { createHUD } from './ui/hud.js';
import { showMenu } from './ui/menu.js';
import { showResults, hideScreen } from './ui/results.js';
import { MAPS } from './maps/index.js';
import { getSettings, saveSettings, setBest, getBest, setArcadeBest, getArcadeBest } from './settings.js';
import { audio } from './audio.js';

const canvas = document.getElementById('game-canvas');
const screenRoot = document.getElementById('screen-root');

let game = null;
let session = null; // { map, mode, advIndex }

const hud = createHUD(document.getElementById('hud-root'), {
  onPause: () => game.pause(),
  onResume: () => game.resume(),
  onRestart: () => game.restart(),
  onMenu: () => toMenu(),
});
const input = new Input(canvas, document.getElementById('joy-root'), { onPause: () => game.togglePause() });
game = new Game(canvas, { hud, input });

function toMenu(view = 'main') {
  game.stop();
  session = null;
  screenRoot.classList.remove('clear');
  showMenu(screenRoot, {
    onAdventure: (i) => play(MAPS[Math.min(i, MAPS.length - 1)], 'adventure', Math.min(i, MAPS.length - 1)),
    onPick: (map) => play(map, 'pick'),
    onTime: (map) => play(map, 'time'),
    onArcade: (map) => play(map, 'arcade'),
  }, view);
}

function play(map, mode, advIndex = 0) {
  audio.unlock();
  const s = getSettings();
  session = { map, mode, advIndex };
  hideScreen(screenRoot);
  game.start(map, { mode, goal: s.goal, rivals: s.rivals, rivalCount: s.rivalCount });
}

game.onFinish = (result) => {
  const { map, mode, advIndex } = session;
  const extra = { newBest: false, best: 0, hasNext: false, beatAll: false };
  if (mode === 'time') {
    extra.newBest = setBest(map.id, result.size);
    extra.best = getBest(map.id);
  } else if (mode === 'arcade') {
    extra.newBest = setArcadeBest(map.id, result.score);
    extra.best = getArcadeBest(map.id);
  } else if (mode === 'adventure') {
    const next = advIndex + 1;
    saveSettings({ progress: Math.max(getSettings().progress, next) });
    extra.hasNext = next < MAPS.length;
    extra.beatAll = !extra.hasNext;
  }
  showResults(screenRoot, result, extra, {
    onNext: () => play(MAPS[advIndex + 1], 'adventure', advIndex + 1),
    onAgain: () => {
      if (extra.beatAll) {
        saveSettings({ progress: 0 });
        play(MAPS[0], 'adventure', 0);
      } else play(map, mode, advIndex);
    },
    onMenu: () => toMenu(),
  });
};

toMenu();

if (import.meta.env.DEV) window.__game = game; // dev-only debug handle
