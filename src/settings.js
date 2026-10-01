// localStorage-backed settings + best scores. All storage access is wrapped in try/catch
// (Safari private mode / disabled storage must never crash the game).
const KEY = 'holes.settings.v1';

const defaults = {
  rivals: true,
  rivalCount: 3, // 1..4
  goal: 0.9, // fraction of all items: 1 (all), 0.9, 0.75
  sound: true,
  progress: 0, // Adventure: index of the highest unlocked map (== MAPS.length when beaten)
  best: {}, // mapId -> best Time Attack size
  arcadeBest: {}, // mapId -> best Arcade score
  graphics: 'auto', // 'auto' (adaptive, starts High) | 'high' | 'low'
};

let cache = null;

function load() {
  let data = {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = JSON.parse(raw) || {};
  } catch (e) {
    data = {};
  }
  return { ...defaults, ...data, best: { ...(data.best || {}) }, arcadeBest: { ...(data.arcadeBest || {}) } };
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch (e) {
    /* ignore */
  }
}

export function getSettings() {
  if (!cache) cache = load();
  return cache;
}

export function saveSettings(patch) {
  const s = getSettings();
  Object.assign(s, patch);
  persist();
  return s;
}

export function getBest(mapId) {
  return getSettings().best[mapId] || 0;
}

/** Returns true if `size` is a new best for the map. */
export function setBest(mapId, size) {
  const s = getSettings();
  if (size > (s.best[mapId] || 0)) {
    s.best[mapId] = size;
    persist();
    return true;
  }
  return false;
}

export function getArcadeBest(mapId) {
  return getSettings().arcadeBest[mapId] || 0;
}

/** Returns true if `score` is a new Arcade best for the map (stored separately from Time Attack bests). */
export function setArcadeBest(mapId, score) {
  const s = getSettings();
  if (score > (s.arcadeBest[mapId] || 0)) {
    s.arcadeBest[mapId] = score;
    persist();
    return true;
  }
  return false;
}
