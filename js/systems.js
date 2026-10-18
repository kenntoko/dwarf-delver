window.DD = window.DD || {};
DD.systems = {
  addLog(text, cls='') {
    DD.state.log.unshift({ text, cls });
    if (DD.state.log.length > 120) DD.state.log.length = 120;
    DD.ui.renderLog();
  },
  beginFloor(floor) {
    const S = DD.state;
    S.floor = floor;
    S.floorTimer = 0;
    S.spawnTimer = 0;
    S.discoveredExit = false;
    S.readyToDescend = false;
    S.enemies = [];
    S.projectiles = [];
    DD.ui.hideBanner();
    DD.ui.clearItemMode();
    if (floor <= 3) {
      S.mode = 'dungeon';
      S.board = DD.board.generateDungeonFloor(floor);
      S.spawnBase = 9 / Math.pow(1.1, floor - 1);
      this.addLog(`B${floor}F に到着～`, 'good');
    } else {
      S.mode = 'boss';
      S.board = DD.board.generateBossBoard();
      S.spawnBase = 9 / Math.pow(1.1, 2);
      S.bossAttackTimer = DD.config.bossWindowSeconds;
      S.bossWindowScore = 0;
      this.addLog('ゴーレム戦開始～', 'good');
    }
    DD.ui.refreshHud();
  },
  currentSpawnInterval() {
    const S = DD.state;
    const growth = Math.pow(1.1, Math.floor(S.floorTimer / 60));
    return S.spawnBase / growth;
  },
  currentXpMultiplier() {
    return 1 + DD.state.player.upgrades.xpBoost * 0.1;
  },
  gainXp(amount) {
    const S = DD.state;
    if (amount <= 0) return;
    S.player.xp += amount;
    let leveled = false;
    while (S.player.xp >= S.player.nextXp) {
      S.player.xp -= S.player.nextXp;
      S.player.level += 1;
      S.player.nextXp = Math.round(S.player.nextXp * 1.25);
      leveled = true;
    }
    if (leveled) {
      this.addLog(`レベルアップ～。Lv${S.player.level} になったよ～`, 'good');
      DD.ui.offerLevelChoices();
    }
  },
  gainDigXp(raw) {
    this.gainXp(Math.round(raw * this.currentXpMultiplier()));
  },
  applyDamage(raw) {
    const S = DD.state;
    const reduced = raw * (1 - S.player.upgrades.defense * 0.08);
    S.player.hp -= reduced;
    if (S.player.hp <= 0) {
      S.player.hp = 0;
      this.loseRun('主人公のHPが尽きた～');
    }
  },
  loseRun(reason) {
    const S = DD.state;
    if (S.mode === 'won' || S.mode === 'lost') return;
    S.mode = 'lost';
    S.paused = true;
    this.addLog(reason, 'danger');
    DD.ui.showBanner('ゲームオーバー', `<p>${reason}</p><button class="messageButton" onclick="location.reload()">リロードして再挑戦</button>`);
  },
  winRun() {
    const S = DD.state;
    S.mode = 'won';
    S.paused = true;
    this.addLog('ゴーレムを攻略して討伐成功～', 'good');
    DD.ui.showBanner('クリア', `<p>プレリリース版クリアおめでと～</p><button class="messageButton" onclick="location.reload()">最初から遊ぶ</button>`);
  },
  grantRandomChestItem() {
    const keys = Object.keys(DD.data.itemDefs);
    const item = DD.utils.choice(keys);
    DD.state.inventory[item] += 1;
    this.addLog(`宝箱から「${DD.data.itemDefs[item].name}」を入手～`, 'good');
    DD.ui.refreshHud();
  },
  openTile(x, y) {
    const S = DD.state;
    const board = S.board;
    const tile = board.grid[y][x];
    if (!tile.active || tile.isOpen || tile.flagged) return;
    if (tile.isDanger) {
      this.loseRun('危険岩盤を掘り抜いて洞窟が崩壊した～');
      return;
    }
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      const ct = board.grid[cy][cx];
      if (!ct.active || ct.isOpen || ct.flagged || ct.isDanger) continue;
      ct.isOpen = true;
      ct.autoHint = false;
      this.gainDigXp(ct.number * 10);
      if (S.mode === 'boss') S.bossWindowScore += ct.number * 10;
      if (ct.chest) {
        ct.chest = false;
        this.grantRandomChestItem();
      }
      if (ct.isExit && S.mode === 'dungeon') {
        S.discoveredExit = true;
        S.readyToDescend = true;
        this.addLog('出口を発見した～。Nキーかボタンで次へ進めるよ～', 'good');
      }
      if (ct.number === 0) {
        DD.utils.neighbors8(cx, cy).forEach(([nx, ny]) => {
          const nt = board.grid[ny][nx];
          if (nt.active && !nt.isOpen && !nt.isDanger && !nt.flagged) stack.push([nx, ny]);
        });
      }
    }
    if (S.mode === 'boss' && DD.board.bossCleared(board)) this.winRun();
  },
  toggleFlag(x, y) {
    const t = DD.state.board.grid[y][x];
    if (!t.active || t.isOpen) return;
    t.flagged = !t.flagged;
    this.addLog(t.flagged ? '危険看板を立てた～' : '危険看板を外した～');
  },
  currentEnemyPool() {
    const S = DD.state;
    if (S.mode === 'boss') return ['slime', 'bat', 'goblin'];
    if (S.floor === 1) return ['slime'];
    if (S.floor === 2) return ['slime', 'bat'];
    return ['slime', 'bat', 'goblin'];
  },
  frontierSpawnTiles() {
    const S = DD.state;
    const board = S.board;
    const list = [];
    const p = S.playerPos();
    for (let y = 0; y < DD.config.H; y++) for (let x = 0; x < DD.config.W; x++) {
      const t = board.grid[y][x];
      if (!t.active || !t.isOpen) continue;
      let isFrontier = false;
      DD.utils.neighbors4(x, y).forEach(([nx, ny]) => {
        const nt = board.grid[ny][nx];
        if (nt.active && !nt.isOpen) isFrontier = true;
      });
      if (S.mode === 'boss' && y <= 3) isFrontier = true;
      if (!isFrontier) continue;
      const c = DD.utils.tileCenter(x, y);
      if (DD.utils.dist(c.x, c.y, p.x, p.y) >= DD.config.TILE * 6) list.push({ x, y, cx: c.x, cy: c.y });
    }
    return list;
  },
  spawnEnemy() {
    const S = DD.state;
    const pool = this.currentEnemyPool();
    const type = DD.utils.choice(pool);
    let spawn;
    if (S.mode === 'boss') {
      spawn = { x: -1, y: -1, cx: DD.config.boardRect.x + DD.utils.randInt(2, DD.config.W - 3) * DD.config.TILE + DD.config.TILE / 2, cy: DD.config.boardRect.y - 20 };
    } else {
      const frontier = this.frontierSpawnTiles();
      if (!frontier.length) return;
      spawn = DD.utils.choice(frontier);
    }
    S.enemies.push({
      type, hp: DD.data.enemyDefs[type].hp,
      x: spawn.cx, y: spawn.cy, tileX: spawn.x, tileY: spawn.y,
      targetFlag: null, attackTimer: 0, breakTimer: 0, breakingSign: false, alive: true,
      path: [], repath: 0, attackAnimTimer: 999,
    });
  },
  computePath(start, goal) {
    const board = DD.state.board;
    const queue = [start];
    const prev = new Map();
    const seen = new Set([DD.utils.key(start.x, start.y)]);
    while (queue.length) {
      const cur = queue.shift();
      if (cur.x === goal.x && cur.y === goal.y) break;
      for (const [nx, ny] of DD.utils.neighbors4(cur.x, cur.y)) {
        const nt = board.grid[ny][nx];
        if (!nt.active || !nt.isOpen) continue;
        const k = DD.utils.key(nx, ny);
        if (seen.has(k)) continue;
        seen.add(k);
        prev.set(k, cur);
        queue.push({ x: nx, y: ny });
      }
    }
    const gk = DD.utils.key(goal.x, goal.y);
    if (!seen.has(gk)) return [];
    const path = [];
    let cur = goal;
    while (!(cur.x === start.x && cur.y === start.y)) {
      path.push(cur);
      cur = prev.get(DD.utils.key(cur.x, cur.y));
      if (!cur) break;
    }
    path.reverse();
    return path;
  },
  findNearestFlagCell(fromCell) {
    const board = DD.state.board;
    let best = null, bestD = Infinity;
    for (let y = 0; y < DD.config.H; y++) for (let x = 0; x < DD.config.W; x++) {
      const t = board.grid[y][x];
      if (!t.active || !t.flagged) continue;
      const d = Math.abs(x - fromCell.x) + Math.abs(y - fromCell.y);
      if (d < bestD) { bestD = d; best = { x, y }; }
    }
    return best;
  },
  reachableSignApproach(enemy) {
    const S = DD.state;
    const origin = { x: enemy.tileX, y: enemy.tileY };
    let best = null;
    let minSteps = Infinity;
    for (let y = 0; y < DD.config.H; y++) for (let x = 0; x < DD.config.W; x++) {
      const t = S.board.grid[y][x];
      if (!t.active || !t.flagged) continue;
      for (const [nx, ny] of DD.utils.neighbors4(x, y)) {
        if (!S.board.grid[ny][nx].isOpen) continue;
        const route = this.computePath(origin, { x: nx, y: ny });
        if (route.length === 0 && (origin.x !== nx || origin.y !== ny)) continue;
        if (route.length < minSteps) {
          minSteps = route.length;
          best = { flag: { x, y }, approach: { x: nx, y: ny } };
        }
      }
    }
    return best;
  },
  updateEnemy(enemy, dt) {
    const S = DD.state;
    const def = DD.data.enemyDefs[enemy.type];
    enemy.repath -= dt;
    const playerPos = S.playerPos();

    if (S.mode === 'boss') {
      let targetPos = playerPos;
      if (enemy.type === 'goblin') {
        const dummy = { x: Math.floor((enemy.x - DD.config.boardRect.x) / DD.config.TILE), y: Math.floor((enemy.y - DD.config.boardRect.y) / DD.config.TILE) };
        const flagGoal = this.findNearestFlagCell(dummy);
        if (flagGoal) {
          enemy.targetFlag = flagGoal;
          targetPos = DD.utils.tileCenter(flagGoal.x, flagGoal.y);
        } else enemy.targetFlag = null;
      }
      const d = DD.utils.dist(enemy.x, enemy.y, targetPos.x, targetPos.y);
      if (enemy.targetFlag && d < 18) {
        enemy.breakingSign = true;
        enemy.breakTimer += dt;
        if (enemy.breakTimer >= DD.config.goblinSignBreakSeconds) {
          const t = S.board.grid[enemy.targetFlag.y][enemy.targetFlag.x];
          if (t.flagged) {
            t.flagged = false;
            this.addLog('ゴブリンに危険看板を壊された～', 'danger');
          }
          enemy.breakTimer = 0;
          enemy.breakingSign = false;
          enemy.targetFlag = null;
        }
        return;
      }
      enemy.breakTimer = 0;
      enemy.breakingSign = false;
      if (!enemy.targetFlag && d < 34) {
        enemy.attackTimer -= dt;
        if (enemy.attackTimer <= 0) {
          this.applyDamage(def.damage);
          enemy.attackAnimTimer = 0;
          this.addLog(`${def.name}の攻撃で ${def.damage} ダメージ～`, 'danger');
          enemy.attackTimer = def.attackCooldown;
        }
        return;
      }
      const speed = DD.config.baseEnemySpeed * def.speedMul;
      const dx = targetPos.x - enemy.x, dy = targetPos.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      enemy.x += dx / len * speed * dt;
      enemy.y += dy / len * speed * dt;
      return;
    }

    if (enemy.tileX == null || enemy.tileY == null) {
      enemy.tileX = Math.floor((enemy.x - DD.config.boardRect.x) / DD.config.TILE);
      enemy.tileY = Math.floor((enemy.y - DD.config.boardRect.y) / DD.config.TILE);
    }
    let goal = S.board.entry;
    let signApproach = null;
    if (enemy.type === 'goblin') {
      signApproach = this.reachableSignApproach(enemy);
      if (signApproach) { goal = signApproach.approach; enemy.targetFlag = signApproach.flag; }
      else enemy.targetFlag = null;
    }
    if (enemy.repath <= 0 || !enemy.path.length) {
      enemy.path = this.computePath({ x: enemy.tileX, y: enemy.tileY }, goal);
      enemy.repath = 0.6;
    }
    if (signApproach) {
      const approachPos = DD.utils.tileCenter(signApproach.approach.x, signApproach.approach.y);
      if (DD.utils.dist(enemy.x, enemy.y, approachPos.x, approachPos.y) < 7) {
        enemy.breakingSign = true;
        enemy.breakTimer += dt;
        if (enemy.breakTimer >= DD.config.goblinSignBreakSeconds) {
          const t = S.board.grid[enemy.targetFlag.y][enemy.targetFlag.x];
          if (t.flagged) {
            t.flagged = false;
            this.addLog('ゴブリンに危険看板を壊された～', 'danger');
          }
          enemy.breakTimer = 0;
          enemy.breakingSign = false;
          enemy.targetFlag = null;
          enemy.path = [];
        }
        return;
      }
    }
    enemy.breakTimer = 0;
    enemy.breakingSign = false;
    const entryPos = DD.utils.tileCenter(S.board.entry.x, S.board.entry.y);
    if (!enemy.targetFlag && DD.utils.dist(enemy.x, enemy.y, entryPos.x, entryPos.y) < 18) {
      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0) {
        this.applyDamage(def.damage);
        this.addLog(`${def.name}の攻撃で ${def.damage} ダメージ～`, 'danger');
        enemy.attackTimer = def.attackCooldown;
      }
      return;
    }
    if (enemy.path.length) {
      const next = enemy.path[0];
      const pos = DD.utils.tileCenter(next.x, next.y);
      const sp = DD.config.baseEnemySpeed * def.speedMul;
      const dx = pos.x - enemy.x, dy = pos.y - enemy.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        enemy.tileX = next.x; enemy.tileY = next.y;
        enemy.path.shift();
      } else {
        enemy.x += dx / d * sp * dt;
        enemy.y += dy / d * sp * dt;
      }
    }
  },
  updateProjectiles(dt) {
    const S = DD.state;
    S.projectiles.forEach(p => {
      if (!p.target || !p.target.alive) { p.dead = true; return; }
      const dx = p.target.x - p.x, dy = p.target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 10) {
        p.target.hp -= p.damage;
        p.dead = true;
        if (p.target.hp <= 0 && p.target.alive) {
          p.target.alive = false;
          const def = DD.data.enemyDefs[p.target.type];
          const xp = Math.round(def.xp * this.currentXpMultiplier());
          this.gainXp(xp);
          this.addLog(`${def.name}を倒した～ (+${xp}XP)`, 'good');
        }
      } else {
        const speed = 280;
        p.x += dx / d * speed * dt;
        p.y += dy / d * speed * dt;
      }
    });
    S.projectiles = S.projectiles.filter(p => !p.dead);
    S.enemies = S.enemies.filter(e => e.alive);
  },
  updateDwarves(dt) {
    const S = DD.state;
    while (S.dwarfActors.length < S.player.upgrades.summon) S.dwarfActors.push({ cd: Math.random() * 0.8 });
    while (S.dwarfActors.length > S.player.upgrades.summon) S.dwarfActors.pop();
    const range = DD.config.TILE * 5;
    const atk = 2 + S.player.upgrades.projectilePower;
    const interval = Math.max(1.0, 2.0 - S.player.upgrades.castSpeed * 0.2);
    const origin = S.playerPos();
    S.dwarfActors.forEach((dwarf, i) => {
      dwarf.cd -= dt;
      if (dwarf.cd > 0) return;
      let best = null, bestD = Infinity;
      S.enemies.forEach(enemy => {
        const d = DD.utils.dist(enemy.x, enemy.y, origin.x, origin.y);
        if (d < range && d < bestD) { best = enemy; bestD = d; }
      });
      if (!best) return;
      const angle = (Math.PI * 2 * i) / Math.max(1, S.dwarfActors.length);
      S.projectiles.push({ x: origin.x + Math.cos(angle) * 24, y: origin.y + Math.sin(angle) * 24, target: best, damage: atk });
      dwarf.cd = interval;
    });
  },
  updateScout(dt) {
    const S = DD.state;
    const lvl = S.player.upgrades.scoutEye;
    if (lvl <= 0) return;
    S.player.scoutTimer += dt;
    if (S.player.scoutTimer < DD.data.scoutIntervals[lvl]) return;
    S.player.scoutTimer = 0;
    const candidates = [];
    for (let y = 0; y < DD.config.H; y++) for (let x = 0; x < DD.config.W; x++) {
      const t = S.board.grid[y][x];
      if (!t.active || t.isOpen || t.isDanger || t.flagged) continue;
      if (DD.board.validDigTarget(S.board, x, y, S.mode)) candidates.push([x,y]);
    }
    if (!candidates.length) return;
    const [x,y] = DD.utils.choice(candidates);
    S.board.grid[y][x].autoHint = true;
    this.addLog('探索の眼が安全なマスを見つけた～', 'good');
  },
  applyUpgrade(key) {
    const S = DD.state;
    if (S.player.upgrades[key] >= DD.data.upgradeDefs[key].max) return;
    S.player.upgrades[key] += 1;
    if (key === 'vitality') {
      S.player.maxHp += 20;
      S.player.hp = Math.min(S.player.maxHp, S.player.hp + 20);
    }
    this.addLog(`${DD.data.upgradeDefs[key].name} を強化した～`, 'good');
    DD.ui.closeLevelChoices();
    DD.ui.refreshHud();
  },
  useInstantItem(itemKey) {
    const S = DD.state;
    if (itemKey === 'heal' && S.inventory.heal > 0) {
      S.inventory.heal -= 1;
      S.player.hp = Math.min(S.player.maxHp, S.player.hp + 30);
      this.addLog('回復薬を使ってHPを30回復～', 'good');
      DD.ui.refreshHud();
    }
  },
  applyItemToCell(itemKey, x, y) {
    const S = DD.state;
    const board = S.board;
    if (S.inventory[itemKey] <= 0) return;
    if (!DD.board.validItemTarget(board, x, y, S.mode)) {
      this.addLog('そのマスは対象にできないよ～', 'danger');
      return;
    }
    const tile = board.grid[y][x];
    if (itemKey === 'reinforce') {
      S.inventory[itemKey] -= 1;
      if (tile.isDanger) {
        tile.isDanger = false;
        tile.reinforced = true;
        DD.board.recomputeNumbers(board);
        this.addLog('補強資材で危険岩盤を安全化した～', 'good');
      } else {
        tile.reinforced = true;
        this.addLog('補強資材を使ったけど、もともと安全な岩盤だった～');
      }
    }
    if (itemKey === 'survey') {
      S.inventory[itemKey] -= 1;
      let count = 0;
      DD.utils.neighbors8(x, y).forEach(([nx, ny]) => {
        const nt = board.grid[ny][nx];
        if (nt.active && nt.isDanger) count++;
      });
      tile.surveyCount = count;
      this.addLog(`地質調査：周囲8マスの危険岩盤は ${count} 個～`, 'good');
    }
    if (itemKey === 'clairvoyance') {
      S.inventory[itemKey] -= 1;
      DD.utils.neighbors8(x, y).forEach(([nx, ny]) => {
        const nt = board.grid[ny][nx];
        if (!nt.active || nt.isOpen) return;
        nt.preview = nt.isDanger ? '!' : String(nt.number);
      });
      this.addLog('透視の巻物で周囲の地形を見通した～', 'good');
    }
    DD.ui.clearItemMode();
    DD.ui.refreshHud();
  },
  nextFloor() {
    const S = DD.state;
    if (S.mode !== 'dungeon' || !S.readyToDescend) return;
    if (S.floor < 3) this.beginFloor(S.floor + 1);
    else this.beginFloor(4);
  },
  update(dt) {
    const S = DD.state;
    if (S.paused || S.mode === 'lost' || S.mode === 'won') return;
    S.floorTimer += dt;
    if (S.mode === 'boss') {
      S.bossAttackTimer -= dt;
      if (S.bossAttackTimer <= 0) {
        const remainingPotential = DD.board.bossRemainingPotential(S.board);
        const need = Math.min(DD.config.bossThresholdBase, S.bossWindowScore + remainingPotential);
        if (S.bossWindowScore < need) {
          this.applyDamage(DD.config.bossAttackDamage);
          this.addLog(`ゴーレムの攻撃を受けた～ (${DD.config.bossAttackDamage}ダメージ)`, 'danger');
        } else {
          this.addLog('数字ノルマ達成でゴーレムの攻撃を阻止～', 'good');
        }
        S.bossWindowScore = 0;
        S.bossAttackTimer = DD.config.bossWindowSeconds;
      }
    }
    S.spawnTimer += dt;
    const interval = this.currentSpawnInterval();
    while (S.spawnTimer >= interval) {
      S.spawnTimer -= interval;
      this.spawnEnemy();
    }
    this.updateScout(dt);
    this.updateDwarves(dt);
    S.enemies.forEach(enemy => {
      if (enemy.attackAnimTimer < 999) enemy.attackAnimTimer += dt;
      this.updateEnemy(enemy, dt);
    });
    this.updateProjectiles(dt);
    DD.ui.refreshHud();
  }
};
