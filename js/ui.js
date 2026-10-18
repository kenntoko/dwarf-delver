window.DD = window.DD || {};
DD.ui = {
  bindDom() {
    const S = DD.state;
    S.dom = {
      canvas: document.getElementById('gameCanvas'),
      overlay: document.getElementById('overlay'),
      itemOverlay: document.getElementById('itemOverlay'),
      messageBanner: document.getElementById('messageBanner'),
      hpMeter: document.getElementById('hpMeter'),
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
      exitDialog: document.getElementById('exitDialog'),
      descendBtn: document.getElementById('descendBtn')
    };
    S.canvas = S.dom.canvas;
    S.ctx = S.canvas.getContext('2d');
    S.dom.descendBtn.addEventListener('click', () => DD.systems.nextFloor());
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'n') DD.systems.nextFloor();
      if (DD.state.pauseReason === 'exit') {
        if (e.key === 'Escape') this.continueExploring();
        if (e.key === 'Tab') {
          const buttons = [...DD.state.dom.exitDialog.querySelectorAll('button')];
          const current = buttons.indexOf(document.activeElement);
          e.preventDefault();
          buttons[(current + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
        }
      }
      if (e.key === 'Escape' && DD.state.pauseReason === 'item') this.clearItemMode();
    });
  },
  renderMeterValue(element, value, label) {
    if (element.dataset.value === value) return;
    element.dataset.value = value;
    element.setAttribute('aria-label', label + ' ' + value);
    const glyphs = {
      '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],
      '2':['111','001','111','100','111'],'3':['111','001','111','001','111'],
      '4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
      '6':['111','100','111','101','111'],'7':['111','001','010','010','010'],
      '8':['111','101','111','101','111'],'9':['111','101','111','001','111'],
      '/':['001','001','010','100','100'],'.':['000','000','000','000','010']
    };
    element.innerHTML = [...value].map(ch => {
      const glyph = glyphs[ch];
      if (!glyph) return '<span class="digit-space" aria-hidden="true"></span>';
      let pixels = '';
      glyph.forEach((row,y) => [...row].forEach((v,x) => {
        if (v === '1') pixels += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      }));
      return `<svg viewBox="0 0 3 5" aria-hidden="true" focusable="false">${pixels}</svg>`;
    }).join('');
  },
  shakeHpBar() {
    const meter = DD.state.dom && DD.state.dom.hpMeter;
    if (!meter) return;
    meter.classList.remove('hp-hit');
    void meter.offsetWidth;
    meter.classList.add('hp-hit');
  },
  renderLog() {
    DD.state.dom.logBox.innerHTML = DD.state.log.map(r => `<p class="${r.cls}">${r.text}</p>`).join('');
  },
  refreshHud() {
    const S = DD.state, D = S.dom;
    D.hpBar.style.clipPath = `inset(0 ${100 - DD.utils.clamp(S.player.hp / S.player.maxHp * 100, 0, 100)}% 0 0)`;
    this.renderMeterValue(D.hpText, `${Math.ceil(S.player.hp)} / ${S.player.maxHp}`, 'HP');
    D.xpBar.style.clipPath = `inset(0 ${100 - DD.utils.clamp(S.player.xp / S.player.nextXp * 100, 0, 100)}% 0 0)`;
    this.renderMeterValue(D.xpText, `${S.player.xp} / ${S.player.nextXp}`, 'EXP');
    D.levelText.textContent = S.player.level;
    D.defText.textContent = `${S.player.upgrades.defense * 8}%`;
    D.dwarfText.textContent = S.player.upgrades.summon;
    D.spawnText.textContent = `${DD.systems.currentSpawnInterval().toFixed(2)}s`;
    D.phasePill.textContent = S.mode === 'boss' ? 'BOSS' : `B${S.floor}F`;
    D.descendBtn.hidden = !(S.exitDeferred && S.readyToDescend && S.mode === 'dungeon');
    D.descendBtn.disabled = !S.readyToDescend || S.mode !== 'dungeon' || S.paused;
    D.descendBtn.textContent = `B${S.floor + 1}Fに降りる`;
    D.descendBtn.classList.toggle('exit-ready', !D.descendBtn.hidden);

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
    if (!choices.length) {
      this.closeLevelChoices();
      return;
    }
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
    S.lastTimeStamp = 0;
    for (const enemy of S.enemies) {
      if (enemy.type !== 'slime') continue;
      enemy.path = [];
      enemy.navTarget = null;
      enemy.escapeTarget = null;
      enemy.stillTime = 0;
      enemy.lastMotionX = null;
      enemy.repath = 0;
      enemy.pathTileX = null;
      enemy.pathTileY = null;
    }
    this.maybeShowExitPrompt();
  },
  enterItemMode(itemKey) {
    const S = DD.state;
    if (S.paused && S.pauseReason !== 'item') return;
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
    this.maybeShowExitPrompt();
  },
  maybeShowExitPrompt() {
    const S = DD.state;
    if (!S.exitPromptPending || S.mode !== 'dungeon' || S.paused || S.itemMode) return;
    S.exitPromptPending = false;
    S.paused = true;
    S.pauseReason = 'exit';
    S.exitReturnFocus = document.activeElement;
    const next = S.floor + 1;
    S.dom.exitDialog.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="exitDialogTitle"><h2 id="exitDialogTitle">出口を発見！</h2><p>B${next}Fに降りますか？</p><div class="exit-actions"><button class="messageButton" id="confirmDescend">B${next}Fに降りる</button><button class="messageButton" id="continueExplore">探索を続ける</button></div></div>`;
    S.dom.exitDialog.classList.add('show');
    document.getElementById('confirmDescend').onclick = () => DD.systems.nextFloor();
    document.getElementById('continueExplore').onclick = () => this.continueExploring();
    document.getElementById('confirmDescend').focus();
  },
  closeExitPrompt() {
    const S = DD.state;
    if (S.dom && S.dom.exitDialog) {
      S.dom.exitDialog.classList.remove('show');
      S.dom.exitDialog.innerHTML = '';
    }
    if (S.pauseReason === 'exit') {
      S.paused = false;
      S.pauseReason = '';
    }
  },
  continueExploring() {
    const S = DD.state;
    if (S.pauseReason !== 'exit') return;
    this.closeExitPrompt();
    S.exitDeferred = true;
    this.refreshHud();
    S.dom.descendBtn.focus();
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
