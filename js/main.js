window.DD = window.DD || {};
DD.main = {
  bindCanvasInput() {
    const canvas = DD.state.canvas;
    let blockDoubleClick = false;
    const cellAt = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.floor(((e.clientX - rect.left) * canvas.width / rect.width - DD.config.boardRect.x) / DD.config.TILE),
        y: Math.floor(((e.clientY - rect.top) * canvas.height / rect.height - DD.config.boardRect.y) / DD.config.TILE)
      };
    };
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      const S = DD.state;
      if (S.mode === 'won' || S.mode === 'lost') return;
      if (e.button === 0 && e.detail === 1) blockDoubleClick = !!S.paused || !!S.itemMode;
      if (e.button === 0 && e.detail > 1 && blockDoubleClick) return;
      const { x: gx, y: gy } = cellAt(e);
      if (!DD.utils.inBounds(gx, gy)) return;
      const tile = S.board.grid[gy][gx];
      if (!tile.active) return;

      if (S.paused && S.pauseReason !== 'item') return;
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
      if (e.button === 0 && tile.isOpen && tile.chest) {
        DD.systems.openChest(gx, gy); return;
      }
      if (!DD.board.validDigTarget(S.board, gx, gy, S.mode)) return;
      DD.systems.openTile(gx, gy);
      DD.ui.refreshHud();
    });
    canvas.addEventListener('dblclick', (e) => {
      if (e.button !== 0 || blockDoubleClick) return;
      const { x, y } = cellAt(e);
      if (!DD.utils.inBounds(x, y)) return;
      e.preventDefault();
      DD.systems.chordTile(x, y);
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
    DD.state.runTime = 0;
    DD.ui.bindDom();
    this.bindCanvasInput();
    DD.systems.addLog('プレリリース版スタート～', 'good');
    DD.systems.beginFloor(1);
    DD.ui.refreshHud();
    DD.assets.load().then(() => requestAnimationFrame(this.loop.bind(this)));
  }
};
window.addEventListener('load', () => DD.main.start());
