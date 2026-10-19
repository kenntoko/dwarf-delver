(() => {
  const S = DD.state;
  S.rockLives = 3;
  const open = DD.systems.openTile;
  DD.systems.openTile = function(x, y) {
    if (S.paused || S.mode === 'lost' || S.mode === 'won' || !DD.utils.inBounds(x,y)) return;
    const tile = S.board.grid[y][x];
    if (!tile.active || tile.isOpen || tile.flagged) return;
    if (!tile.isDanger) return open.call(this,x,y);
    S.rockLives = Math.max(0,S.rockLives - 1);
    // Mark the struck rock so it cannot consume another life and its
    // original neighboring numbers and chord rules remain consistent.
    tile.flagged = true;
    tile.autoHint = false;
    this.addLog(`危険岩盤！ LIFE ${S.rockLives}/3`, 'bad');
    if (S.rockLives === 0) this.loseRun('危険岩盤でライフを使い切った～');
    DD.ui.refreshHud();
  };
  const refresh = DD.ui.refreshHud;
  DD.ui.refreshHud = function() {
    refresh.call(this);
    let life = document.getElementById('rockLives');
    if (!life) {
      life = document.createElement('span');
      life.id = 'rockLives';
      life.className = 'meter-number';
      life.style.cssText = 'margin-left:12px;color:#ffb6a0;font-family:GuiDot,monospace;font-size:16px;white-space:nowrap';
      document.getElementById('phasePill').after(life);
    }
    life.textContent = `LIFE ${S.rockLives}/3`;
    life.setAttribute('aria-label', `危険岩盤の残りライフ ${S.rockLives} / 3`);
  };
})();
