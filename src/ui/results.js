// Results / end screens.
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/**
 * result: from Game.buildResult(); extra: { newBest, best, hasNext, beatAll }
 * handlers: { onNext, onAgain, onMenu }
 */
export function showResults(root, result, extra, handlers) {
  const timed = result.mode === 'time';
  const arcade = result.mode === 'arcade';
  const place = ['', '1st', '2nd', '3rd', '4th', '5th'][result.rank] || `${result.rank}th`;
  let title = timed || (arcade && result.reason === 'time') ? "Time's Up!" : arcade ? 'Map Cleared!' : 'Level Complete!';
  if (extra.beatAll) title = 'You beat them all!';
  const buttons = [];
  if (extra.hasNext) buttons.push('<button class="btn green" data-a="next">Next Map &#9654;</button>');
  buttons.push(`<button class="btn blue" data-a="again">${extra.beatAll ? 'Play Adventure Again' : 'Play Again'}</button>`);
  buttons.push('<button class="btn red" data-a="menu">Main Menu</button>');
  root.innerHTML = `
    <div class="screen results">
      <div class="panel big">
        ${extra.beatAll ? '<div class="trophy">&#127942;</div>' : ''}
        <h1>${title}</h1>
        <h3>${esc(result.mapName)}</h3>
        ${(timed || arcade) && extra.newBest ? '<div class="badge">New best!</div>' : ''}
        <div class="stats">
          ${arcade ? `<div><b>${result.score}</b><span>Score</span></div>` : ''}
          <div><b>${result.size}</b><span>${arcade ? 'Peak size' : 'Final size'}</span></div>
          ${arcade ? `<div><b>x${result.bestCombo}</b><span>Best combo</span></div><div><b>${result.survived}s</b><span>Time survived</span></div>` : ''}
          ${arcade ? '' : `<div><b>${result.pct}%</b><span>Eaten by you</span></div>
          <div><b>${place}</b><span>of ${result.holes} holes</span></div>`}
          ${timed ? `<div><b>${extra.best}</b><span>Best size</span></div>` : ''}
          ${arcade ? `<div><b>${extra.best}</b><span>Best score</span></div>` : ''}
        </div>
        <div class="btnrow">${buttons.join('')}</div>
      </div>
    </div>`;
  root.querySelector('.results').addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'next') handlers.onNext();
    else if (a === 'again') handlers.onAgain();
    else if (a === 'menu') handlers.onMenu();
  });
}

export function hideScreen(root) {
  root.innerHTML = '';
}
