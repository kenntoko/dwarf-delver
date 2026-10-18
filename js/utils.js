window.DD = window.DD || {};
DD.utils = {
  randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  key(x, y) { return `${x},${y}`; },
  inBounds(x, y) {
    return x >= 0 && x < DD.config.W && y >= 0 && y < DD.config.H;
  },
  dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
  tileCenter(x, y) {
    const { boardRect, TILE } = DD.config;
    return { x: boardRect.x + x * TILE + TILE / 2, y: boardRect.y + y * TILE + TILE / 2 };
  },
  neighbors8(x, y) {
    const out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (DD.utils.inBounds(nx, ny)) out.push([nx, ny]);
    }
    return out;
  },
  neighbors4(x, y) {
    const out = [];
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => {
      const nx = x + dx, ny = y + dy;
      if (DD.utils.inBounds(nx, ny)) out.push([nx, ny]);
    });
    return out;
  }
};
