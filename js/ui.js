window.DD = window.DD || {};
DD.ui = {
  bindDom() {
    const S = DD.state;
    S.dom = {
      canvas: document.getElementById('gameCanvas'),
      menuButton: document.getElementById('menuButton'),
      menuDialog: document.getElementById('menuDialog'),
      menuClose: document.getElementById('menuClose'),
      menuPassives: document.getElementById('menuPassives'),
      menuItems: document.getElementById('menuItems'),
      menuDetails: document.getElementById('menuDetails'),
      iconTooltip: document.getElementById('iconTooltip'),
      timeText: document.getElementById('timeText'),
      scoreText: document.getElementById('scoreText'),
      inventoryDock: document.getElementById('inventoryDock'),
      lootDialog: document.getElementById('lootDialog'),
      itemConfirmDialog: document.getElementById('itemConfirmDialog'),
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
    const fitGui = () => {
      const hud = document.getElementById('gameHud').getBoundingClientRect().height;
      const footer = document.querySelector('.game-footer').getBoundingClientRect().height;
      document.getElementById('app').style.setProperty('--gui-chrome', (hud + footer + 20) + 'px');
    };
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(fitGui);
      observer.observe(document.getElementById('gameHud'));
      observer.observe(document.querySelector('.game-footer'));
    }
    window.addEventListener('resize', fitGui);
    requestAnimationFrame(fitGui);
    S.dom.menuButton.addEventListener('click', () => this.openMenu());
    S.dom.menuClose.addEventListener('click', () => this.closeMenu());
    S.dom.menuButton.setAttribute('aria-expanded', 'false');
    this.bindInspectSurface(S.dom.upgradesBox, false);
    this.bindInspectSurface(S.dom.menuPassives, true);
    this.bindInspectSurface(S.dom.menuItems, true);
    const layoutChanged = () => {
      this.hideGuiTooltip();
      if (S.activeChest) S.activeChest.flightTarget = null;
    };
    window.addEventListener('resize', layoutChanged);
    window.addEventListener('scroll', layoutChanged, true);
    S.dom.descendBtn.addEventListener('click', () => DD.systems.nextFloor());
    S.dom.inventoryDock.addEventListener('click', e => {
      const button = e.target.closest('button[data-unit]');
      if (button) this.confirmItem(Number(button.dataset.unit));
    });
    window.addEventListener('keydown', (e) => {
      if (S.pauseReason === 'menu') {
        if (e.key === 'Escape') { e.preventDefault(); this.closeMenu(); }
        if (e.key === 'Tab') {
          const buttons = [...S.dom.menuDialog.querySelectorAll('button:not(:disabled),summary')];
          const i = buttons.indexOf(document.activeElement); e.preventDefault();
          if (buttons.length) buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
        }
        return;
      }
      if (['chest', 'item-confirm'].includes(S.pauseReason)) {
        if (e.key === 'Escape' && S.pauseReason === 'item-confirm') this.cancelItemConfirm();
        if (e.key === 'Tab') {
          const box = S.pauseReason === 'chest' ? S.dom.lootDialog : S.dom.itemConfirmDialog;
          const buttons = [...box.querySelectorAll('button')];
          const i = buttons.indexOf(document.activeElement); e.preventDefault();
          if (buttons.length) buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
        }
        return;
      }
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

  itemIcon(key) { return './assets/item_' + key + '_16.png'; },

  renderInventory() {
    const S = DD.state, dock = S.dom.inventoryDock;
    const order = ['reinforce', 'survey', 'clairvoyance', 'heal'];
    const keys = order.filter(key => S.inventory[key] > 0);
    const disabled = S.paused || S.mode === 'lost' || S.mode === 'won';
    const signature = keys.map(key => key + ':' + S.inventory[key]).join(',') + ':' + disabled;
    if (dock.dataset.signature === signature) return;
    dock.dataset.signature = signature;
    dock.hidden = false;
    dock.innerHTML = keys.map(key => {
      const unit = (S.itemUnits || []).find(u => u.key === key);
      return '<button type="button" class="item-slot" data-unit="' + (unit ? unit.id : '') +
        '" aria-label="' + DD.data.itemDefs[key].name + 'を使用（所持' + S.inventory[key] + '個）" title="' +
        DD.data.itemDefs[key].name + '"' + (disabled ? ' disabled' : '') + '><img src="' + this.itemIcon(key) +
        '" width="32" height="32" alt=""><span class="meter-number inventory-count" id="item-count-' +
        key + '" aria-hidden="true"></span></button>';
    }).join('');
    for (const key of keys) this.renderMeterValue(document.getElementById('item-count-' + key), String(S.inventory[key]), '');
  },
  resumePendingDialogs() {
    const S = DD.state;
    if (S.paused || S.mode === 'lost' || S.mode === 'won') return;
    if (S.pendingLevelBonuses > 0) { this.offerLevelChoices(); return; }
    this.maybeShowExitPrompt();
  },
  startChestOpening() {
    const S = DD.state, box = S.dom.lootDialog;
    S.paused = true; S.pauseReason = 'chest';
    box.innerHTML = '<img id="chestFlyingItem" class="chest-flying-item" src="' +
      this.itemIcon(S.activeChest.key) + '" alt="" hidden>';
    box.classList.add('show', 'loot-flight');
    this.updateChestOpening(0); this.refreshHud();
  },
  chestFlightTarget(key) {
    const S = DD.state, dock = S.dom.inventoryDock;
    const unit = (S.itemUnits || []).find(u => u.key === key);
    const existing = unit && dock.querySelector('button[data-unit="' + unit.id + '"] img');
    if (existing) {
      const r = existing.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    const order = ['reinforce', 'survey', 'clairvoyance', 'heal'];
    const keys = order.filter(k => S.inventory[k] > 0 || k === key);
    const r = dock.getBoundingClientRect(), measure = dock.cloneNode(false);
    measure.id = ''; measure.className = 'inventory-dock';
    measure.removeAttribute('role'); measure.removeAttribute('aria-label');
    measure.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top +
      'px;width:' + r.width + 'px;visibility:hidden;pointer-events:none;z-index:-1';
    measure.innerHTML = keys.map(k => '<button class="item-slot"><img src="' + this.itemIcon(k) +
      '" width="32" height="32" alt=""></button>').join('');
    document.body.appendChild(measure);
    const target = measure.children[keys.indexOf(key)].querySelector('img').getBoundingClientRect();
    const point = { x: target.left + target.width / 2, y: target.top + target.height / 2 };
    measure.remove(); return point;
  },
  chestFlightPosition(age, source, target) {
    const rise = 24;
    if (age < 0.55) {
      const t = Math.max(0, Math.min(1, (age - 0.30) / 0.25));
      return { x: source.x, y: source.y - rise * (1 - Math.pow(1 - t, 3)) };
    }
    const t = Math.max(0, Math.min(1, (age - 0.55) / 0.70));
    // Easing applies only to the explicitly requested item flight.
    const p = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const from = { x: source.x, y: source.y - rise };
    const control = { x: (from.x + target.x) / 2,
      y: Math.min(from.y, target.y) - Math.min(90, Math.abs(target.x - from.x) * 0.12 + 32) };
    return { x: (1-p)*(1-p)*from.x + 2*(1-p)*p*control.x + p*p*target.x,
      y: (1-p)*(1-p)*from.y + 2*(1-p)*p*control.y + p*p*target.y };
  },
  updateChestOpening(dt) {
    const S = DD.state, event = S.activeChest;
    if (!event || S.pauseReason !== 'chest') return;
    event.age += dt;
    const icon = document.getElementById('chestFlyingItem');
    if (icon) {
      icon.hidden = event.age < 0.30;
      const r = S.canvas.getBoundingClientRect();
      const center = DD.utils.tileCenter(event.x, event.y);
      const source = { x: r.left + center.x * r.width / S.canvas.width,
        y: r.top + (center.y - 7) * r.height / S.canvas.height };
      const pos = this.chestFlightPosition(event.age, source, event.flightTarget || (event.flightTarget = this.chestFlightTarget(event.key)));
      icon.style.left = pos.x + 'px'; icon.style.top = pos.y + 'px';
    }
    if (event.age >= 1.25 && !event.rewardGranted) {
      event.rewardGranted = true;
      DD.systems.grantChestItem(event.key);
      this.finishChestOpening();
    }
  },
  finishChestOpening() {
    const S = DD.state;
    if (S.pauseReason !== 'chest' || !S.activeChest || !S.activeChest.rewardGranted) return;
    S.activeChest = null;
    S.dom.lootDialog.classList.remove('show', 'loot-flight'); S.dom.lootDialog.innerHTML = '';
    S.paused = false; S.pauseReason = ''; S.lastTimeStamp = 0;
    this.resumePendingDialogs(); this.refreshHud();
  },
  itemTerms(key) {
    if (key === 'heal') return 'HPを30回復（最大HPまで）。HP満タンでも消費されます。';
    const condition = DD.state.mode === 'boss' ? '未探索マスを選択。' : '開いたマスに隣接する未探索マスを選択。';
    if (key === 'reinforce') return condition + '危険岩盤を安全化。安全マスでも消費されます。';
    if (key === 'survey') return condition + '周囲8マスにある危険岩盤の数を表示。';
    return condition + '周囲8マスの未探索マスの情報を表示。';
  },
  confirmItem(id) {
    const S = DD.state;
    if (S.paused || S.mode === 'lost' || S.mode === 'won') return;
    const unit = (S.itemUnits || []).find(u => u.id === id);
    if (!unit || !(S.inventory[unit.key] > 0)) return;
    S.selectedItemUnit = id; S.itemReturnFocus = document.activeElement;
    S.paused = true; S.pauseReason = 'item-confirm';
    S.dom.itemConfirmDialog.innerHTML = '<div class="modal pixel-item-ui" role="dialog" aria-modal="true" aria-labelledby="itemTitle">' +
      '<h2 id="itemTitle">' + DD.data.itemDefs[unit.key].name + '</h2><img class="loot-icon" src="' +
      this.itemIcon(unit.key) + '" alt=""><p>使用条件・効果</p><p>' + this.itemTerms(unit.key) +
      '</p><div class="item-actions"><button class="messageButton" id="itemUse">使う</button>' +
      '<button class="messageButton" id="itemCancel">キャンセル</button></div></div>';
    S.dom.itemConfirmDialog.classList.add('show');
    document.getElementById('itemUse').onclick = () => this.useConfirmedItem();
    document.getElementById('itemCancel').onclick = () => this.cancelItemConfirm();
    document.getElementById('itemCancel').focus(); this.refreshHud();
  },
  closeItemConfirm() {
    const S = DD.state;
    S.dom.itemConfirmDialog.classList.remove('show'); S.dom.itemConfirmDialog.innerHTML = '';
    S.paused = false; S.pauseReason = ''; S.lastTimeStamp = 0;
  },
  cancelItemConfirm() {
    if (DD.state.pauseReason !== 'item-confirm') return;
    this.closeItemConfirm(); DD.state.selectedItemUnit = null;
    this.refreshHud();
    if (DD.state.itemReturnFocus && DD.state.itemReturnFocus.isConnected) DD.state.itemReturnFocus.focus();
    this.resumePendingDialogs();
  },
  useConfirmedItem() {
    const S = DD.state;
    if (S.pauseReason !== 'item-confirm') return;
    const unit = (S.itemUnits || []).find(u => u.id === S.selectedItemUnit);
    if (!unit || !(S.inventory[unit.key] > 0)) { this.cancelItemConfirm(); return; }
    this.closeItemConfirm();
    if (unit.key === 'heal') {
      DD.systems.useInstantItem(unit.key); S.selectedItemUnit = null;
      this.resumePendingDialogs();
    } else this.enterItemMode(unit.key);
    this.refreshHud();
  },


  upgradeIcon(key) { return './assets/upgrade_' + key + '.png'; },
  formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  },
  inspectButton(type, key, count, menu) {
    const def = type === 'upgrade' ? DD.data.upgradeDefs[key] : DD.data.itemDefs[key];
    const icon = type === 'upgrade' ? this.upgradeIcon(key) : this.itemIcon(key);
    const value = type === 'upgrade' ? 'Lv.' + count : String(count);
    const label = def.name + (type === 'upgrade' ? ' Lv.' + count : ' 所持' + count + '個');
    return '<button type="button" class="inspect-icon ' + (menu ? 'menu-icon' : 'hud-passive') +
      '" data-inspect-type="' + type + '" data-inspect-key="' + key + '" aria-label="' + label +
      '"><img src="' + icon + '" width="32" height="32" alt=""><span class="icon-value">' + value + '</span></button>';
  },
  renderPassiveIcons() {
    const S = DD.state, keys = Object.keys(DD.data.upgradeDefs).filter(k => S.player.upgrades[k] > 0);
    const signature = keys.map(k => k + ':' + S.player.upgrades[k]).join(',');
    if (S.dom.upgradesBox.dataset.signature !== signature) {
      S.dom.upgradesBox.dataset.signature = signature;
      S.dom.upgradesBox.innerHTML = keys.map(k => this.inspectButton('upgrade', k, S.player.upgrades[k], false)).join('');
    }
    if (S.dom.menuPassives.dataset.signature !== signature) {
      S.dom.menuPassives.dataset.signature = signature;
      S.dom.menuPassives.innerHTML = keys.length ? keys.map(k => this.inspectButton('upgrade', k, S.player.upgrades[k], true)).join('') : '<p>なし</p>';
    }
    const items = ['reinforce','survey','clairvoyance','heal'].filter(k => S.inventory[k] > 0);
    const itemSignature = items.map(k => k + ':' + S.inventory[k]).join(',');
    if (S.dom.menuItems.dataset.signature !== itemSignature) {
      S.dom.menuItems.dataset.signature = itemSignature;
      S.dom.menuItems.innerHTML = items.length ? items.map(k => this.inspectButton('item', k, S.inventory[k], true)).join('') : '<p>なし</p>';
    }
  },
  inspectDescription(type, key) {
    const S = DD.state;
    if (type === 'upgrade') {
      const def = DD.data.upgradeDefs[key], lv = S.player.upgrades[key];
      return { title: def.name + ' Lv.' + lv, text: def.getDesc(lv) };
    }
    const def = DD.data.itemDefs[key];
    return { title: def.name + ' ×' + S.inventory[key], text: this.itemTerms(key) };
  },
  bindInspectSurface(surface, inMenu) {
    const show = e => {
      const button = e.target.closest('button[data-inspect-key]');
      if (!button || !surface.contains(button)) return;
      const info = this.inspectDescription(button.dataset.inspectType, button.dataset.inspectKey);
      if (inMenu) DD.state.dom.menuDetails.innerHTML = '<strong>' + info.title + '</strong><p>' + info.text + '</p>';
      const box = DD.state.dom.iconTooltip;
      box.innerHTML = '<strong>' + info.title + '</strong><p>' + info.text + '</p>';
      box.hidden = false;
      const r = button.getBoundingClientRect(), frame = document.getElementById('boardWrap').getBoundingClientRect();
      const width = box.offsetWidth, height = box.offsetHeight;
      box.style.left = Math.max(frame.left + 8, Math.min(frame.right - width - 8, r.left)) + 'px';
      const below = r.bottom + 8;
      box.style.top = Math.max(frame.top + 8, below + height < frame.bottom - 8 ? below : r.top - height - 8) + 'px';
    };
    surface.addEventListener('pointerover', show); surface.addEventListener('focusin', show);
    surface.addEventListener('pointerleave', () => this.hideGuiTooltip());
    surface.addEventListener('focusout', () => this.hideGuiTooltip());
    surface.addEventListener('click', e => {
      const button = e.target.closest('button[data-inspect-key]');
      if (!button) return;
      if (!inMenu) {
        this.openMenu();
        const info = this.inspectDescription(button.dataset.inspectType, button.dataset.inspectKey);
        DD.state.dom.menuDetails.innerHTML = '<strong>' + info.title + '</strong><p>' + info.text + '</p>';
      } else show(e);
    });
  },
  hideGuiTooltip() { if (DD.state.dom && DD.state.dom.iconTooltip) DD.state.dom.iconTooltip.hidden = true; },
  openMenu() {
    const S = DD.state;
    if (S.paused || S.mode === 'lost' || S.mode === 'won') return;
    this.hideGuiTooltip();
    S.paused = true; S.pauseReason = 'menu';
    S.dom.menuDetails.textContent = 'アイコンにカーソルを合わせると効果を表示';
    S.dom.menuDialog.classList.add('show');
    S.dom.menuButton.setAttribute('aria-expanded', 'true');
    this.refreshHud(); S.dom.menuClose.focus();
  },
  closeMenu() {
    const S = DD.state;
    if (S.pauseReason !== 'menu') return;
    S.dom.menuDialog.classList.remove('show'); S.dom.menuButton.setAttribute('aria-expanded', 'false');
    S.paused = false; S.pauseReason = ''; S.lastTimeStamp = 0;
    this.hideGuiTooltip(); this.refreshHud(); S.dom.menuButton.focus(); this.resumePendingDialogs();
  },

  renderMeterValue(element, value, label) {
    if (element.dataset.value === value) return;
    element.dataset.value = value;
    element.setAttribute('aria-label', (label ? label + ' ' : '') + value);
    const glyphs = {
      'F':['111','100','110','100','100'],'I':['111','010','010','010','111'],
      'M':['10001','11011','10101','10001','10001'],'C':['111','100','100','100','111'],
      'R':['110','101','110','101','101'],
      '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],
      '2':['111','001','111','100','111'],'3':['111','001','111','001','111'],
      '4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
      '6':['111','100','111','101','111'],'7':['111','001','010','010','010'],
      '8':['111','101','111','101','111'],'9':['111','101','111','001','111'],
      '/':['001','001','010','100','100'],'.':['000','000','000','000','010'],
      'B':['110','101','110','101','110'],'O':['111','101','101','101','111'],
      'U':['101','101','101','101','111'],'S':['111','100','111','001','111'],
      'L':['100','100','100','100','111'],'v':['000','000','101','101','010'],
      'H':['101','101','111','101','101'],'P':['110','101','110','100','100'],
      'E':['111','100','110','100','111'],'X':['101','101','010','101','101'],
      'N':['101','111','111','111','101'],'T':['111','010','010','010','010'],
      ':':['000','010','000','010','000'],'→':['00100','00010','11111','00010','00100']
    };
    element.innerHTML = [...value].map(ch => {
      const glyph = glyphs[ch];
      if (!glyph) return '<span class="digit-space" aria-hidden="true"></span>';
      let pixels = '';
      glyph.forEach((row,y) => [...row].forEach((v,x) => {
        if (v === '1') pixels += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      }));
      return `<svg viewBox="0 0 ${glyph[0].length} 5" style="width:${glyph[0].length * 2}px" aria-hidden="true" focusable="false">${pixels}</svg>`;
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
    this.renderMeterValue(D.hpText, `HP:${Math.ceil(S.player.hp)}/${S.player.maxHp}`, '');
    D.xpBar.style.clipPath = `inset(0 ${100 - DD.utils.clamp(S.player.xp / S.player.nextXp * 100, 0, 100)}% 0 0)`;
    this.renderMeterValue(D.xpText, `EXP:NEXT→${Math.max(0, S.player.nextXp - S.player.xp)}`, '');
    this.renderMeterValue(D.levelText, `Lv.${S.player.level}`, '');
    D.defText.textContent = `${S.player.upgrades.defense * 8}%`;
    D.dwarfText.textContent = S.player.upgrades.summon;
    D.spawnText.textContent = `${DD.systems.currentSpawnInterval().toFixed(2)}s`;
    this.renderMeterValue(D.phasePill, `B${S.floor}F`, '階層');
    this.renderMeterValue(D.timeText, `TIME:${this.formatTime(S.runTime)}`, '');
    this.renderMeterValue(D.scoreText, 'SCORE:0', 'スコア（表示のみ）');
    D.menuButton.disabled = S.paused || S.mode === 'lost' || S.mode === 'won';
    document.getElementById('menuFloor').textContent = `B${S.floor}F`;
    document.getElementById('menuLevel').textContent = String(S.player.level);
    document.getElementById('menuHp').textContent = `${Math.ceil(S.player.hp)}/${S.player.maxHp}`;
    document.getElementById('menuXp').textContent = String(Math.max(0, S.player.nextXp - S.player.xp));
    document.getElementById('menuTime').textContent = this.formatTime(S.runTime);
    D.descendBtn.hidden = !(S.exitDeferred && S.readyToDescend && S.mode === 'dungeon');
    D.descendBtn.disabled = !S.readyToDescend || S.mode !== 'dungeon' || S.paused;
    D.descendBtn.textContent = `B${S.floor + 1}Fに降りる`;
    D.descendBtn.classList.toggle('exit-ready', !D.descendBtn.hidden);

    this.renderPassiveIcons();

    this.renderInventory();

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
    if (S.paused && S.pauseReason !== 'levelup') return;
    if (!(S.pendingLevelBonuses > 0) || S.mode === 'lost' || S.mode === 'won') return;
    if (S.pauseReason === 'levelup' && S.pendingChoices && S.pendingChoices.length) {
      this.renderMeterValue(document.getElementById('levelBonusCount'), `BONUS:${S.pendingLevelBonuses}`, '残り選択回数');
      return;
    }
    const choices = DD.utils.shuffle(Object.keys(DD.data.upgradeDefs).filter(k => S.player.upgrades[k] < DD.data.upgradeDefs[k].max)).slice(0, 3);
    if (!choices.length) {
      S.pendingLevelBonuses = 0;
      this.closeLevelChoices();
      return;
    }
    S.pendingChoices = choices;
    const choiceId = S.levelChoiceId = (S.levelChoiceId || 0) + 1;
    S.paused = true;
    S.pauseReason = 'levelup';
    S.dom.overlay.innerHTML = `<div class="modal"><h2>レベルアップ</h2><div id="levelBonusCount" class="meter-number level-readout"></div><p class="hint">1つ選んでね～</p><div class="choices">${choices.map(k => `
      <div class="choice" data-upg="${k}"><div class="choiceTitle"><img class="choice-icon" src="${this.upgradeIcon(k)}" width="48" height="48" alt="">${DD.data.upgradeDefs[k].name}</div>
      <div>${DD.data.upgradeDefs[k].getDesc(S.player.upgrades[k])}</div><small>最大Lv${DD.data.upgradeDefs[k].max}</small></div>`).join('')}</div></div>`;
    S.dom.overlay.classList.add('show');
    this.renderMeterValue(document.getElementById('levelBonusCount'), `BONUS:${S.pendingLevelBonuses}`, '残り選択回数');
    S.dom.overlay.querySelectorAll('.choice').forEach(el => el.addEventListener('click', () => DD.systems.applyUpgrade(el.dataset.upg, choiceId)));
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
    this.resumePendingDialogs();
  },
  enterItemMode(itemKey) {
    const S = DD.state;
    if (S.paused && S.pauseReason !== 'item') return;
    S.itemMode = itemKey;
    S.paused = true;
    S.pauseReason = 'item';
    S.dom.itemOverlay.innerHTML = `<div class="modal pixel-item-ui"><h2>${DD.data.itemDefs[itemKey].name}</h2><p>対象マスをクリック</p><p>右クリックかEscで中止</p><button class="messageButton" id="cancelItemBtn">キャンセル</button></div>`;
    S.dom.itemOverlay.classList.add('show');
    document.getElementById('cancelItemBtn').onclick = () => this.clearItemMode();
  },
  clearItemMode() {
    const S = DD.state;
    S.itemMode = null;
    S.selectedItemUnit = null;
    if (S.pauseReason === 'item') {
      S.paused = false;
      S.pauseReason = '';
    }
    S.dom.itemOverlay.classList.remove('show');
    S.dom.itemOverlay.innerHTML = '';
    this.resumePendingDialogs();
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
    const S = DD.state;
    if (S.dom.menuDialog) S.dom.menuDialog.classList.remove('show');
    this.hideGuiTooltip();
    for (const el of [S.dom.lootDialog, S.dom.itemConfirmDialog, S.dom.itemOverlay, S.dom.overlay]) {
      el.classList.remove('show'); el.innerHTML = '';
    }
    S.activeChest = null; S.selectedItemUnit = null; S.itemMode = null;
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
