window.DD = window.DD || {};
DD.ui = {
  bindDom() {
    const S = DD.state;
    S.dom = {
      canvas: document.getElementById('gameCanvas'),
      overlay: document.getElementById('overlay'),
      itemOverlay: document.getElementById('itemOverlay'),
      messageBanner: document.getElementById('messageBanner'),
      hpBar: document.getElementById('hpBar'),
      hpText: document.getElementById('hpText'),
      xpBar: document.getElementById('xpBar'),
      xpText: document.getElementById('xpText'),
      levelText: document.getElementById('levelText'),
      defText: document.getElementById('defText'),
      dwarfText: document.getElementById('dwarfText'),
      spawnText: document.getElementById('spawnText'),
      upgradesBox: document.getElementById('upgradesBox'),
      inventoryBox: document.getElementById('inventoryBox'),
      logBox: document.getElementById('log'),
      phasePill: document.getElementById('phasePill'),
      statusText: document.getElementById('statusText'),
      floorInfo: document.getElementById('floorInfo'),
      descendBtn: document.getElementById('descendBtn')
    };
    S.canvas = S.dom.canvas;
    S.ctx = S.canvas.getContext('2d');
    S.dom.descendBtn.addEventListener('click', () => DD.systems.nextFloor());
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'n') DD.systems.nextFloor();
      if (e.key === 'Escape' && DD.state.pauseReason === 'item') this.clearItemMode();
    });
  },
  renderLog() {
    DD.state.dom.logBox.innerHTML = DD.state.log.map(r => `<p class="${r.cls}">${r.text}</p>`).join('');
  },
  refreshHud() {
    const S = DD.state, D = S.dom;
    D.hpBar.style.width = `${(S.player.hp / S.player.maxHp) * 100}%`;
    D.hpText.textContent = `${Math.ceil(S.player.hp)} / ${S.player.maxHp}`;
    D.xpBar.style.width = `${(S.player.xp / S.player.nextXp) * 100}%`;
    D.xpText.textContent = `${S.player.xp} / ${S.player.nextXp}`;
    D.levelText.textContent = S.player.level;
    D.defText.textContent = `${S.player.upgrades.defense * 8}%`;
    D.dwarfText.textContent = S.player.upgrades.summon;
    D.spawnText.textContent = `${DD.systems.currentSpawnInterval().toFixed(2)}s`;
    D.phasePill.textContent = S.mode === 'boss' ? 'BOSS' : `B${S.floor}F`;
    D.descendBtn.disabled = !S.readyToDescend || S.mode !== 'dungeon';

    D.upgradesBox.innerHTML = Object.keys(DD.data.upgradeDefs).map(k => {
      const def = DD.data.upgradeDefs[k];
      return `<div class="upgradeItem"><strong>${def.name}</strong><br>Lv ${S.player.upgrades[k]} / ${def.max}</div>`;
    }).join('');

    D.inventoryBox.innerHTML = Object.entries(DD.data.itemDefs).map(([k, def]) => `
      <div class="invItem"><strong>${def.name}</strong><br><span>× ${S.inventory[k]}</span>
      <button ${S.inventory[k] <= 0 ? 'disabled' : ''} data-item="${k}">使う</button></div>`).join('');
    D.inventoryBox.querySelectorAll('button[data-item]').forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.item;
        if (key === 'heal') DD.systems.useInstantItem(key);
        else this.enterItemMode(key);
      };
    });

    let info = '';
    if (S.mode === 'dungeon') {
      info += `<div class="upgradeItem">危険岩盤: 72 / 480</div>`;
      info += `<div class="upgradeItem">出口: ${S.discoveredExit ? '発見済み' : '未発見'}</div>`;
      info += `<div class="upgradeItem">経過時間: ${Math.floor(S.floorTimer)}秒</div>`;
      info += `<div class="upgradeItem">敵数: ${S.enemies.length}</div>`;
    } else if (S.mode === 'boss') {
      const remainingPotential = DD.board.bossRemainingPotential(S.board);
      info += `<div class="upgradeItem">ゴーレム攻撃まで: ${Math.ceil(S.bossAttackTimer)}秒</div>`;
      info += `<div class="upgradeItem">今回の数字ポイント: ${S.bossWindowScore}</div>`;
      info += `<div class="upgradeItem">現在ノルマ: ${Math.min(DD.config.bossThresholdBase, remainingPotential + S.bossWindowScore)}</div>`;
      info += `<div class="upgradeItem">敵数: ${S.enemies.length}</div>`;
    }
    D.floorInfo.innerHTML = info;
    D.statusText.textContent = S.mode === 'boss' ? 'ゴーレムの体を攻略しつつ、奥から来る敵を迎撃しよう～' : (S.readyToDescend ? '出口発見～。探索続行か次階層か選べるよ～' : '入口から掘り進めて出口を探そう～');
  },
  offerLevelChoices() {
    const S = DD.state;
    const choices = DD.utils.shuffle(Object.keys(DD.data.upgradeDefs).filter(k => S.player.upgrades[k] < DD.data.upgradeDefs[k].max)).slice(0, 3);
    S.pendingChoices = choices;
    S.paused = true;
    S.pauseReason = 'levelup';
    S.dom.overlay.innerHTML = `<div class="modal"><h2>レベルアップ</h2><p class="hint">1つ選んでね～</p><div class="choices">${choices.map(k => `
      <div class="choice" data-upg="${k}"><div class="choiceTitle">${DD.data.upgradeDefs[k].name}</div>
      <div>${DD.data.upgradeDefs[k].getDesc(S.player.upgrades[k])}</div><small>最大Lv${DD.data.upgradeDefs[k].max}</small></div>`).join('')}</div></div>`;
    S.dom.overlay.classList.add('show');
    S.dom.overlay.querySelectorAll('.choice').forEach(el => el.addEventListener('click', () => DD.systems.applyUpgrade(el.dataset.upg)));
  },
  closeLevelChoices() {
    const S = DD.state;
    S.dom.overlay.classList.remove('show');
    S.dom.overlay.innerHTML = '';
    S.paused = false;
    S.pauseReason = '';
    S.pendingChoices = null;
  },
  enterItemMode(itemKey) {
    const S = DD.state;
    S.itemMode = itemKey;
    S.paused = true;
    S.pauseReason = 'item';
    S.dom.itemOverlay.innerHTML = `<div class="modal"><h2>${DD.data.itemDefs[itemKey].name}</h2><p>${DD.data.itemDefs[itemKey].desc}</p><p class="hint">対象マスをクリックしてね～。キャンセルは右クリックかEsc。</p><button class="messageButton" id="cancelItemBtn">キャンセル</button></div>`;
    S.dom.itemOverlay.classList.add('show');
    document.getElementById('cancelItemBtn').onclick = () => this.clearItemMode();
  },
  clearItemMode() {
    const S = DD.state;
    S.itemMode = null;
    if (S.pauseReason === 'item') {
      S.paused = false;
      S.pauseReason = '';
    }
    S.dom.itemOverlay.classList.remove('show');
    S.dom.itemOverlay.innerHTML = '';
  },
  showBanner(title, html) {
    const box = DD.state.dom.messageBanner;
    box.innerHTML = `<div class="modal"><h2>${title}</h2>${html}</div>`;
    box.classList.add('show');
  },
  hideBanner() {
    const box = DD.state.dom.messageBanner;
    box.classList.remove('show');
    box.innerHTML = '';
  }
};
