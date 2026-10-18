window.DD = window.DD || {};
DD.render = {
  drawImageOrFallback(name, drawFallback, x, y, w, h) {
    const ctx = DD.state.ctx;
    const img = DD.assets.get(name);
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      drawFallback();
    }
  },
  drawBackground() {
    const ctx = DD.state.ctx;
    const { CANVAS_W, CANVAS_H, boardRect } = DD.config;
    ctx.fillStyle = '#101316';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const grd = ctx.createLinearGradient(0, boardRect.y, 0, boardRect.y + boardRect.h + 120);
    grd.addColorStop(0, '#1b2328');
    grd.addColorStop(1, '#0f1214');
    ctx.fillStyle = grd;
    ctx.fillRect(boardRect.x - 20, boardRect.y - 20, boardRect.w + 40, boardRect.h + 150);
  },
  drawRockCell(rock, atlas, x, y, px, py, size) {
    const { ctx, board } = DD.state;
    const open = (nx, ny) => DD.utils.inBounds(nx, ny) &&
      board.grid[ny][nx].active && board.grid[ny][nx].isOpen;
    const exposed = [open(x, y - 1), open(x + 1, y), open(x, y + 1), open(x - 1, y)];
    if (!exposed.some(Boolean)) {
      ctx.drawImage(rock, px, py, size, size);
      return;
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py, size, size); ctx.clip();
    if (atlas && atlas.complete && atlas.naturalWidth === 128) {
      ctx.drawImage(atlas, 104, 104, 16, 16, px, py, size, size);
    } else {
      ctx.fillStyle = DD.config.colors.open;
      ctx.fillRect(px, py, size, size);
    }
    // Stable pixel steps cut inward from each exposed edge, never into another cell.
    ctx.beginPath();
    for (let side = 0; side < 4; side++) {
      const point = (along, depth) => {
        const u = along * size / 32, v = depth * size / 32;
        if (side === 0) return [px + u, py + v];
        if (side === 1) return [px + size - v, py + u];
        if (side === 2) return [px + size - u, py + size - v];
        return [px + v, py + size - u];
      };
      const start = point(0, 0);
      if (side === 0) ctx.moveTo(...start); else ctx.lineTo(...start);
      for (let step = 0; step < 8; step++) {
        const seed = ((x * 73856093) ^ (y * 19349663) ^ (side * 83492791) ^ (step * 2654435761)) >>> 0;
        const depth = exposed[side] ? 1 + (seed % 5) : 0;
        ctx.lineTo(...point(step * 4, depth));
        ctx.lineTo(...point((step + 1) * 4, depth));
      }
      ctx.lineTo(...point(32, 0));
    }
    ctx.closePath();
    ctx.save(); ctx.clip();
    ctx.drawImage(rock, px, py, size, size);
    ctx.restore();
    ctx.strokeStyle = 'rgba(25, 15, 9, .8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },
  drawBoard() {
    const ctx = DD.state.ctx;
    const board = DD.state.board;
    const { TILE, boardRect, colors, nums } = DD.config;
    if (!board) return;
    for (let y = 0; y < DD.config.H; y++) for (let x = 0; x < DD.config.W; x++) {
      const t = board.grid[y][x];
      if (!t.active) continue;
      const px = boardRect.x + x * TILE, py = boardRect.y + y * TILE;
      ctx.globalAlpha = DD.state.mode === 'boss' ? board.bossOverlayAlpha : 1;
      const atlas = DD.assets.get('cave_autotile_32');
      const rock = DD.assets.get('cave_wall_32');
      if (t.isOpen && atlas && atlas.complete && atlas.naturalWidth === 128) {
        // Floor fills the entire open cell. Rock edges belong only to closed cells.
        ctx.drawImage(atlas, 104, 104, 16, 16, px, py, TILE, TILE);
      } else if (!t.isOpen && rock && rock.complete && rock.naturalWidth === 32) {
        this.drawRockCell(rock, atlas, x, y, px, py, TILE);
      } else {
        ctx.fillStyle = t.isOpen ? colors.open : colors.closed;
        ctx.fillRect(px,py,TILE,TILE);
      }
      if (t.autoHint && !t.isOpen) { ctx.fillStyle='rgba(85,175,255,0.45)'; ctx.fillRect(px,py,TILE,TILE); }
      // Keep the full one-pixel grid stroke inside its own cell.
      ctx.strokeStyle = t.isOpen ? 'rgba(20,10,5,.22)' : 'rgba(20,10,5,.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      ctx.globalAlpha = 1;

      if (t.isExit && (DD.state.discoveredExit || t.isOpen)) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const iconSize = Math.min(32, TILE);
        this.drawImageOrFallback('exit_ladder_v2', () => {
          ctx.fillStyle = colors.exit;
          ctx.fillRect(px + TILE * 0.25, py + 6, TILE * 0.5, TILE - 12);
        }, px + (TILE - iconSize) / 2, py + (TILE - iconSize) / 2, iconSize, iconSize);
        ctx.restore();
      }
      if (!t.isOpen && t.flagged) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const size = Math.min(32, TILE - 2);
        this.drawImageOrFallback('warning_sign', () => {
          ctx.fillStyle = '#3a2114'; ctx.fillRect(px + TILE/2 - 2, py + 20, 4, 12);
          ctx.fillStyle = '#241b16'; ctx.fillRect(px + 3, py + 3, TILE - 6, 22);
          ctx.fillStyle = '#fff3da'; ctx.fillRect(px + 5, py + 5, TILE - 10, 18);
          ctx.fillStyle = '#d82e28';
          for (let i = 0; i < 6; i++) {
            ctx.fillRect(px + 10 + i*2, py + 8 + i*2, 4, 4);
            ctx.fillRect(px + TILE - 14 - i*2, py + 8 + i*2, 4, 4);
          }
        }, px + (TILE - size)/2, py + (TILE - size)/2, size, size);
        ctx.restore();
      }
      if (!t.isOpen && t.reinforced) {
        ctx.strokeStyle = colors.reinforce; ctx.lineWidth = 3; ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8); ctx.lineWidth = 1;
      }
      if (!t.isOpen && t.preview !== null) {
        ctx.fillStyle = colors.preview;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(t.preview, px + TILE / 2, py + TILE / 2);
      }
      if (!t.isOpen && t.surveyCount !== null) {
        ctx.fillStyle = colors.survey;
        ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(`地${t.surveyCount}`, px + 2, py + TILE - 4);
      }
      if (t.isOpen) {
        if (t.number > 0) {
          ctx.fillStyle = nums[t.number] || '#fff';
          ctx.font = t.isExit ? 'bold 12px sans-serif' : 'bold 22px sans-serif';
          ctx.textAlign = t.isExit ? 'left' : 'center'; ctx.textBaseline = t.isExit ? 'top' : 'middle';
          ctx.fillText(String(t.number), t.isExit ? px + 1 : px + TILE / 2, t.isExit ? py + 1 : py + TILE / 2 + 1);
        }
        if (t.chest) this.drawImageOrFallback('chest', () => {
          ctx.fillStyle = colors.chest; ctx.fillRect(px + 9, py + 12, 18, 12); ctx.strokeStyle = '#6f5b15'; ctx.strokeRect(px + 9, py + 12, 18, 12);
        }, px + 8, py + 10, 20, 16);
      }
    }
  },
  drawDungeonEntrance() {
    const S = DD.state;
    if (S.mode !== 'dungeon' || !S.board || !S.board.entry || S.board.floorNum !== 1) return;
    const { TILE, boardRect } = DD.config;
    const ctx = S.ctx;
    const cx = boardRect.x + (S.board.entry.x + 0.5) * TILE;
    const top = boardRect.y + S.board.entry.y * TILE;
    ctx.save();
    ctx.translate(cx, top);
    ctx.scale(TILE / 36, TILE / 36);
    // The cave sits in the margin above the entry cell, clear of the player.
    ctx.beginPath();
    ctx.moveTo(-35, 0); ctx.lineTo(-34, -20); ctx.lineTo(-28, -20);
    ctx.lineTo(-28, -37); ctx.lineTo(-19, -37); ctx.lineTo(-19, -48);
    ctx.lineTo(-8, -48); ctx.lineTo(-8, -54); ctx.lineTo(12, -54);
    ctx.lineTo(12, -49); ctx.lineTo(24, -49); ctx.lineTo(24, -38);
    ctx.lineTo(30, -38); ctx.lineTo(30, -23); ctx.lineTo(35, -23);
    ctx.lineTo(35, 0); ctx.closePath();
    ctx.fillStyle = '#30251e'; ctx.fill();
    ctx.save(); ctx.clip();
    const rock = DD.assets.get('cave_wall_32');
    if (rock && rock.complete && rock.naturalWidth > 0) {
      for (let y = -64; y < 0; y += 32) for (let x = -48; x < 36; x += 32) {
        ctx.drawImage(rock, x, y, 32, 32);
      }
    }
    ctx.fillStyle = 'rgba(15,10,8,.28)'; ctx.fillRect(-36, -18, 72, 18);
    ctx.restore();
    ctx.strokeStyle = '#17120f'; ctx.lineWidth = 2; ctx.stroke();
    // Recessed irregular arch, with the darkest part at the back.
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-20, -24);
    ctx.lineTo(-15, -24); ctx.lineTo(-15, -35); ctx.lineTo(-8, -35);
    ctx.lineTo(-8, -41); ctx.lineTo(7, -41); ctx.lineTo(7, -37);
    ctx.lineTo(15, -37); ctx.lineTo(15, -28); ctx.lineTo(20, -28);
    ctx.lineTo(20, 0); ctx.closePath();
    ctx.fillStyle = '#211810'; ctx.fill();
    ctx.strokeStyle = '#735238'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-15, -25);
    ctx.lineTo(-10, -25); ctx.lineTo(-10, -33); ctx.lineTo(-5, -33);
    ctx.lineTo(-5, -36); ctx.lineTo(5, -36); ctx.lineTo(5, -32);
    ctx.lineTo(12, -32); ctx.lineTo(12, -23); ctx.lineTo(15, -23);
    ctx.lineTo(15, 0); ctx.closePath();
    ctx.fillStyle = '#080909'; ctx.fill();
    // Three widening stone steps lead down to the hero's starting tile.
    for (let i = 0; i < 3; i++) {
      const width = 18 + i * 6, y = -14 + i * 5;
      ctx.fillStyle = ['#40382d', '#68533b', '#8b6b47'][i];
      ctx.fillRect(-width / 2, y, width, 4);
      ctx.fillStyle = '#211b16'; ctx.fillRect(-width / 2, y + 3, width, 2);
    }
    ctx.restore();
  },
  drawPlayerAndDwarves() {
    const ctx = DD.state.ctx;
    const p = DD.state.playerPos();
    this.drawImageOrFallback('player', () => {
      ctx.fillStyle = '#e6d5b8'; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#402d22'; ctx.fillRect(p.x - 8, p.y + 10, 16, 5);
    }, p.x - 16, p.y - 16, 32, 32);

    const count = DD.state.player.upgrades.summon;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + performance.now() * 0.0005;
      const dx = Math.cos(ang) * 28, dy = Math.sin(ang) * 28;
      this.drawImageOrFallback('dwarf', () => {
        ctx.fillStyle = '#8ecae6'; ctx.beginPath(); ctx.arc(p.x + dx, p.y + dy, 7, 0, Math.PI * 2); ctx.fill();
      }, p.x + dx - 8, p.y + dy - 8, 16, 16);
    }
  },
  drawEnemies() {
    const ctx = DD.state.ctx;
    DD.state.enemies.forEach(e => {
      const def = DD.data.enemyDefs[e.type];
      if (e.type === 'slime') {
        const sheet = DD.assets.get('slime_sheet');
        if (sheet && sheet.complete && sheet.naturalWidth >= 160 && sheet.naturalHeight >= 64) {
          let sx = 0, sy = 0;
          if (e.attackAnimTimer < 0.48) {
            const attackFrame = Math.min(3, Math.floor(e.attackAnimTimer / 0.12));
            sx = attackFrame * 32;
            sy = 32;
          } else {
            const idleFrame = Math.floor(performance.now() / 140) % 5;
            sx = idleFrame * 32;
            sy = 0;
          }
          const attack = e.attackAnimTimer < 0.48;
          let width = 32, height = 32, dx = 0, dy = 0;
          if (attack) {
            const t = e.attackAnimTimer;
            const hero = DD.state.playerPos(), len = Math.hypot(hero.x - e.x, hero.y - e.y) || 1;
            if (t < 0.16) { width = 40; height = 22; }
            else {
              const pulse = Math.sin(Math.PI * Math.min(1, (t - 0.16) / 0.32));
              width = 30 + pulse * 6; height = 32 + pulse * 10;
              dx = (hero.x - e.x) / len * pulse * 12;
              dy = (hero.y - e.y) / len * pulse * 12;
            }
            // Pixel impact flash at the contact point distinguishes attacks from idle.
            if (t >= 0.18 && t < 0.3) {
              const ix = Math.round(e.x + (hero.x - e.x) / len * 22);
              const iy = Math.round(e.y + (hero.y - e.y) / len * 22);
              ctx.fillStyle = '#fff6cd';
              ctx.fillRect(ix - 7, iy - 2, 14, 4); ctx.fillRect(ix - 2, iy - 7, 4, 14);
            }
          }
          ctx.save(); ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sheet, sx, sy, 32, 32, Math.round(e.x - width / 2 + dx), Math.round(e.y + 16 - height + dy), Math.round(width), Math.round(height));
          ctx.restore();
        } else {
          this.drawImageOrFallback(def.asset, () => {
            ctx.fillStyle = '#58d676';
            ctx.beginPath(); ctx.arc(e.x, e.y, def.size, 0, Math.PI * 2); ctx.fill();
          }, e.x - 16, e.y - 16, 32, 32);
        }
      } else {
        this.drawImageOrFallback(def.asset, () => {
          ctx.fillStyle = e.type === 'bat' ? '#a986ff' : '#d2be58';
          if (e.type === 'bat') {
            ctx.beginPath(); ctx.moveTo(e.x - 10, e.y + 2); ctx.quadraticCurveTo(e.x - 2, e.y - 10, e.x, e.y); ctx.quadraticCurveTo(e.x + 2, e.y - 10, e.x + 10, e.y + 2); ctx.closePath(); ctx.fill();
          } else {
            ctx.fillRect(e.x - 10, e.y - 10, 20, 20);
          }
        }, e.x - 16, e.y - 16, 32, 32);
      }
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 12, e.y - 18, 24, 4);
      ctx.fillStyle = '#ff7d67'; ctx.fillRect(e.x - 12, e.y - 18, 24 * Math.max(0, e.hp / DD.data.enemyDefs[e.type].hp), 4);
    });
  },
  drawGoblinSignMeters() {
    const ctx = DD.state.ctx;
    const duration = DD.config.goblinSignBreakSeconds;
    const sheet = DD.assets.get('goblin_break_meter');
    for (const enemy of DD.state.enemies) {
      if (enemy.type !== 'goblin' || !enemy.breakingSign || !enemy.targetFlag) continue;
      const step = Math.min(4, Math.floor(enemy.breakTimer / (duration / 4)));
      const dx = Math.round(enemy.x - 4);
      const dy = Math.round(enemy.y - 29);
      if (sheet && sheet.complete && sheet.naturalWidth >= 40 && sheet.naturalHeight >= 8) {
        ctx.drawImage(sheet, step * 8, 0, 8, 8, dx, dy, 8, 8);
      } else {
        ctx.fillStyle = 'rgba(15, 11, 9, .9)';
        ctx.beginPath(); ctx.arc(dx + 4, dy + 4, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  },
  drawProjectiles() {
    const ctx = DD.state.ctx;
    DD.state.projectiles.forEach(p => {
      ctx.fillStyle = '#d4f0ff'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    });
  },
  drawDamageNumbers() {
    const ctx = DD.state.ctx;
    const glyphs = {
      '0':['111','101','101','101','111'], '1':['010','110','010','010','111'],
      '2':['111','001','111','100','111'], '3':['111','001','111','001','111'],
      '4':['101','101','111','001','001'], '5':['111','100','111','001','111'],
      '6':['111','100','111','101','111'], '7':['111','001','010','010','010'],
      '8':['111','101','111','101','111'], '9':['111','101','111','001','111'],
      '-':['000','000','111','000','000'], '.':['000','000','000','000','010']
    };
    for (const n of DD.state.damageNumbers || []) {
      const pixels = [];
      const left = Math.round(n.x - (n.text.length * 8 - 2) / 2);
      const top = Math.round(n.y - n.age * 28);
      [...n.text].forEach((ch, i) => (glyphs[ch] || glyphs['0']).forEach((row, y) =>
        [...row].forEach((v, x) => { if (v === '1') pixels.push([left + i * 8 + x * 2, top + y * 2]); })));
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - n.age);
      ctx.fillStyle = '#ffffff';
      for (const [x,y] of pixels) ctx.fillRect(x - 1, y - 1, 4, 4);
      ctx.fillStyle = '#f24141';
      for (const [x,y] of pixels) ctx.fillRect(x, y, 2, 2);
      ctx.restore();
    }
  },
  drawBossHud() {
    if (DD.state.mode !== 'boss') return;
    const ctx = DD.state.ctx;
    const { boardRect } = DD.config;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(boardRect.x, boardRect.y + boardRect.h + 18, 420, 48);
    ctx.fillStyle = '#f2e7cf'; ctx.font = '18px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`ゴーレム攻撃まで: ${Math.ceil(DD.state.bossAttackTimer)}s`, boardRect.x + 10, boardRect.y + boardRect.h + 38);
    ctx.fillText(`数字ポイント: ${DD.state.bossWindowScore}`, boardRect.x + 210, boardRect.y + boardRect.h + 38);
  },
  draw() {
    this.drawBackground();
    if (DD.state.mode === 'boss') this.drawEnemies();
    this.drawBoard();
    this.drawDungeonEntrance();
    if (DD.state.mode !== 'boss') this.drawEnemies();
    this.drawGoblinSignMeters();
    this.drawProjectiles();
    this.drawPlayerAndDwarves();
    this.drawDamageNumbers();
    this.drawBossHud();
  }
};
