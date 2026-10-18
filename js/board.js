window.DD = window.DD || {};
DD.board = {
  createTile(active=true) {
    return {
      active, isDanger: false, isOpen: false, number: 0, flagged: false,
      chest: false, reinforced: false, preview: null, surveyCount: null,
      autoHint: false, isExit: false, isEntrance: false,
    };
  },
  newGrid(activeMask=null) {
    const grid = [];
    for (let y = 0; y < DD.config.H; y++) {
      const row = [];
      for (let x = 0; x < DD.config.W; x++) row.push(this.createTile(activeMask ? !!activeMask[y][x] : true));
      grid.push(row);
    }
    return grid;
  },
  recomputeNumbers(board) {
    for (let y = 0; y < DD.config.H; y++) for (let x = 0; x < DD.config.W; x++) {
      const t = board.grid[y][x];
      if (!t.active) continue;
      if (t.isDanger) { t.number = -1; continue; }
      let count = 0;
      for (const [nx, ny] of DD.utils.neighbors8(x, y)) {
        const nt = board.grid[ny][nx];
        if (nt.active && nt.isDanger) count++;
      }
      t.number = count;
    }
  },
  validDigTarget(board, x, y, mode) {
    const t = board.grid[y][x];
    if (!t.active || t.isOpen || t.flagged) return false;
    if (mode === 'boss') return true;
    return DD.utils.neighbors8(x, y).some(([nx, ny]) => board.grid[ny][nx].active && board.grid[ny][nx].isOpen);
  },
  validItemTarget(board, x, y, mode) {
    const t = board.grid[y][x];
    if (!t.active || t.isOpen) return false;
    if (mode === 'boss') return true;
    return DD.utils.neighbors8(x, y).some(([nx, ny]) => board.grid[ny][nx].active && board.grid[ny][nx].isOpen);
  },
  expandInitialCaverns(board) {
    const queue = [];
    for (let y = 0; y < DD.config.H; y++) for (let x = 0; x < DD.config.W; x++) {
      const tile = board.grid[y][x];
      if (tile.active && tile.isOpen && tile.number === 0) queue.push([x, y]);
    }
    for (let i = 0; i < queue.length; i++) {
      for (const [x, y] of DD.utils.neighbors8(...queue[i])) {
        const tile = board.grid[y][x];
        if (!tile.active || tile.isOpen || tile.isDanger || tile.flagged) continue;
        tile.isOpen = true;
        tile.autoHint = false;
        if (tile.number === 0) queue.push([x, y]);
      }
    }
  },
  generateDungeonFloor(floorNum) {
    const U = DD.utils;
    const { W, H } = DD.config;
    const entryX = Math.floor(W / 2);
    const entryY = 0;
    const exitX = U.randInt(20, 29);
    const exitY = U.randInt(2, H - 3);
    const board = {
      kind: 'dungeon',
      grid: this.newGrid(),
      entry: { x: entryX, y: entryY },
      exit: { x: exitX, y: exitY },
      floorNum,
      bossOverlayAlpha: 1,
    };

    const safe = new Set();
    let x = entryX, y = entryY;
    safe.add(U.key(x, y));
    while (x !== exitX || y !== exitY) {
      const options = [];
      if (x < exitX) options.push([x+1,y],[x+1,y],[x+1,y]);
      if (y < exitY) options.push([x,y+1]);
      if (y > exitY) options.push([x,y-1]);
      if (Math.random() < 0.22 && x < exitX) {
        const dy = U.choice([-1,1]);
        if (U.inBounds(x, y+dy)) options.push([x, y+dy]);
      }
      [x, y] = U.choice(options.filter(([a,b]) => U.inBounds(a,b)));
      safe.add(U.key(x, y));
    }

    const openSet = new Set([U.key(entryX, entryY), U.key(entryX, entryY + 1)]);
    safe.add(U.key(entryX, entryY + 1)); // initial opened tiles must always be protected
    let frontier = [[entryX, entryY + 1], [entryX, entryY]];
    while (openSet.size < 22) {
      const [cx, cy] = U.choice(frontier);
      const candidates = U.shuffle(U.neighbors4(cx, cy)).filter(([nx, ny]) => nx >= entryX - 4 && nx <= entryX + 3 && ny < 8 && !openSet.has(U.key(nx, ny)));
      if (!candidates.length) {
        frontier = frontier.filter(([fx, fy]) => !(fx === cx && fy === cy));
        if (!frontier.length) frontier = [[entryX, entryY + 1]];
        continue;
      }
      const [nx, ny] = candidates[0];
      openSet.add(U.key(nx, ny));
      frontier.push([nx, ny]);
      safe.add(U.key(nx, ny));
    }

    const branchSeeds = U.shuffle(Array.from(safe).map(v => v.split(',').map(Number))).slice(0, 20);
    for (const [sx, sy] of branchSeeds) {
      let len = U.randInt(1, 4);
      let bx = sx, by = sy;
      for (let i = 0; i < len; i++) {
        const opts = U.shuffle(U.neighbors4(bx, by)).filter(([nx, ny]) => nx < W - 1);
        if (!opts.length) break;
        const [nx, ny] = opts[0];
        safe.add(U.key(nx, ny));
        if (Math.random() < 0.55) { bx = nx; by = ny; }
      }
    }

    const protectedSet = new Set([...safe]);
    const candidates = [];
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (!protectedSet.has(U.key(xx,yy))) candidates.push([xx,yy]);
    U.shuffle(candidates);
    for (let i = 0; i < Math.min(72, candidates.length); i++) {
      const [mx, my] = candidates[i];
      board.grid[my][mx].isDanger = true;
    }

    board.grid[entryY][entryX].isEntrance = true;
    board.grid[exitY][exitX].isExit = true;
    board.grid[exitY][exitX].isDanger = false;
    this.recomputeNumbers(board);

    openSet.forEach(s => {
      const [ox, oy] = s.split(',').map(Number);
      board.grid[oy][ox].isOpen = true;
    });

    this.expandInitialCaverns(board);

    const safeClosed = [];
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const t = board.grid[yy][xx];
      if (!t.isDanger && !t.isOpen && !t.isExit) safeClosed.push([xx,yy]);
    }
    U.shuffle(safeClosed);
    const chestCount = U.choice([3,4,5]);
    for (let i = 0; i < Math.min(chestCount, safeClosed.length); i++) {
      const [cx, cy] = safeClosed[i];
      board.grid[cy][cx].chest = true;
    }
    return board;
  },
  generateBossBoard() {
    const { W, H } = DD.config;
    const mask = [];
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) {
        let active = false;
        if (y >= 0 && y <= 2 && x >= 12 && x <= 17) active = true;
        if (y >= 3 && y <= 5 && x >= 10 && x <= 19) active = true;
        if (y >= 4 && y <= 7 && ((x >= 6 && x <= 9) || (x >= 20 && x <= 23))) active = true;
        if (y >= 6 && y <= 10 && x >= 11 && x <= 18) active = true;
        if (y >= 11 && y <= 15 && ((x >= 11 && x <= 14) || (x >= 15 && x <= 18))) active = true;
        row.push(active);
      }
      mask.push(row);
    }
    const board = { kind: 'boss', grid: this.newGrid(mask), floorNum: 4, bossOverlayAlpha: 0.7 };
    const active = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (board.grid[y][x].active) active.push([x,y]);
    DD.utils.shuffle(active);
    const mineCount = Math.floor(active.length * 0.15);
    for (let i = 0; i < mineCount; i++) {
      const [mx,my] = active[i];
      board.grid[my][mx].isDanger = true;
    }
    this.recomputeNumbers(board);
    return board;
  },
  bossCleared(board) {
    for (let y = 0; y < DD.config.H; y++) for (let x = 0; x < DD.config.W; x++) {
      const t = board.grid[y][x];
      if (t.active && !t.isDanger && !t.isOpen) return false;
    }
    return true;
  },
  bossRemainingPotential(board) {
    let sum = 0;
    for (let y = 0; y < DD.config.H; y++) for (let x = 0; x < DD.config.W; x++) {
      const t = board.grid[y][x];
      if (t.active && !t.isOpen && !t.isDanger) sum += t.number * 10;
    }
    return sum;
  }
};
