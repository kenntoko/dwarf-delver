window.DD = window.DD || {};
DD.main = {
  bindCanvasInput() {
    const canvas = DD.state.canvas;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      const S = DD.state;
      if (S.mode === 'won' || S.mode === 'lost') return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const gx = Math.floor((mx - DD.config.boardRect.x) / DD.config.TILE);
      const gy = Math.floor((my - DD.config.boardRect.y) / DD.config.TILE);
      if (!DD.utils.inBounds(gx, gy)) return;
      const tile = S.board.grid[gy][gx];
      if (!tile.active) return;

      if (S.pauseReason === 'levelup') return;
      if (S.pauseReason === 'item' && S.itemMode) {
        if (e.button === 0) DD.systems.applyItemToCell(S.itemMode, gx, gy);
        if (e.button === 2) DD.ui.clearItemMode();
        return;
      }
      if (e.button === 2) {
        DD.systems.toggleFlag(gx, gy);
        DD.ui.refreshHud();
        return;
      }
      if (!DD.board.validDigTarget(S.board, gx, gy, S.mode)) return;
      DD.systems.openTile(gx, gy);
      DD.ui.refreshHud();
    });
  },
  loop(ts) {
    const S = DD.state;
    if (!S.lastTimeStamp) S.lastTimeStamp = ts;
    const dt = Math.min(0.05, (ts - S.lastTimeStamp) / 1000);
    S.lastTimeStamp = ts;
    DD.systems.update(dt);
    DD.render.draw();
    requestAnimationFrame(this.loop.bind(this));
  },
  start() {
    DD.ui.bindDom();
    this.bindCanvasInput();
    DD.systems.addLog('プレリリース版スタート～', 'good');
    DD.systems.beginFloor(1);
    DD.ui.refreshHud();
    DD.assets.load().then(() => requestAnimationFrame(this.loop.bind(this)));
  }
};
window.addEventListener('load', () => DD.main.start());
