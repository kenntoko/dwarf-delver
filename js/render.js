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
        const sign = DD.assets.get('warning_sign');
        if (sign && sign.complete && sign.naturalWidth > 0) {
          // Cache a crisp pale silhouette for a one-pixel outline, including the wooden post.
          if (!this.warningSignOutline || this.warningSignOutlineSource !== sign) {
            const outline = document.createElement('canvas');
            outline.width = sign.naturalWidth; outline.height = sign.naturalHeight;
            const outlineCtx = outline.getContext('2d');
            outlineCtx.drawImage(sign, 0, 0);
            outlineCtx.globalCompositeOperation = 'source-in';
            outlineCtx.fillStyle = '#f0d9a3';
            outlineCtx.fillRect(0, 0, outline.width, outline.height);
            this.warningSignOutline = outline;
            this.warningSignOutlineSource = sign;
          }
          const x = px + (TILE-size)/2, y = py + (TILE-size)/2;
          for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            ctx.drawImage(this.warningSignOutline,x+dx,y+dy,size,size);
          }
        }
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
        if (t.number > 0 && !t.chest) {
          ctx.fillStyle = nums[t.number] || '#fff';
          ctx.font = (t.isExit || t.chest) ? 'bold 12px sans-serif' : 'bold 22px sans-serif';
          ctx.textAlign = (t.isExit || t.chest) ? 'left' : 'center'; ctx.textBaseline = (t.isExit || t.chest) ? 'top' : 'middle';
          ctx.fillText(String(t.number), (t.isExit || t.chest) ? px + 1 : px + TILE / 2, (t.isExit || t.chest) ? py + 1 : py + TILE / 2 + 1);
        }
        if (t.chest) this.drawImageOrFallback('treasure_chest_closed', () => {
          ctx.fillStyle = colors.chest; ctx.fillRect(px + 9, py + 12, 18, 12); ctx.strokeStyle = '#6f5b15'; ctx.strokeRect(px + 9, py + 12, 18, 12);
        }, px + (TILE - 32) / 2, py + (TILE - 32) / 2, 32, 32);
        if (t.chest && t.number > 0) {
          const digits = { 1:['010','110','010','010','111'],2:['111','001','111','100','111'],
            3:['111','001','111','001','111'],4:['101','101','111','001','001'],
            5:['111','100','111','001','111'],6:['111','100','111','101','111'],
            7:['111','001','010','010','010'],8:['111','101','111','101','111'] };
          ctx.fillStyle = '#17120f'; ctx.fillRect(px + 1, py + 1, 8, 12);
          ctx.fillStyle = nums[t.number] || '#ffffff';
          digits[t.number].forEach((row,y) => [...row].forEach((bit,x) => {
            if (bit === '1') ctx.fillRect(px + 2 + x * 2, py + 2 + y * 2, 2, 2);
          }));
        }
      }
    }
  },
  drawOpeningChest() {
    const S = DD.state, event = S.activeChest;
    if (!event || S.pauseReason !== 'chest') return;
    const sheet = DD.assets.get('treasure_chest_sheet');
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const ctx = S.ctx, p = DD.utils.tileCenter(event.x, event.y);
    const frame = Math.min(7, Math.floor(event.age / 0.05));
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, frame % 4 * 64, Math.floor(frame / 4) * 64, 64, 64,
      Math.round(p.x - 21), Math.round(p.y - 23), 42, 42);
    ctx.restore();
  },
  drawDungeonEntrance() {
    const S = DD.state;
    if (S.mode !== 'dungeon' || !S.board || !S.board.entry || S.board.floorNum !== 1) return;
    const { TILE, boardRect } = DD.config;
    const ctx = S.ctx;
    const cx = boardRect.x + (S.board.entry.x + 0.5) * TILE;
    const top = boardRect.y + S.board.entry.y * TILE;
    ctx.save();
    ctx.translate(cx, top - 64);
    ctx.scale(TILE / 36, TILE / 36);
    // Keep the cave above the 96px hero, with enough top margin to show the full arch.
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
  heroPose() {
    const S = DD.state;
    if ((S.heroHurtAge ?? 999) < 0.8)
      return { asset: 'hero_hurt_sheet', columns: 3, frame: Math.min(5, 1 + Math.floor(S.heroHurtAge / 0.14)) };
    const idle = S.heroIdleTime || 0;
    // Ten damage-free, unpaused seconds before yawning; every hit resets this clock.
    if (idle >= 10)
      return { asset: 'hero_yawn_sheet', columns: 4, frame: Math.min(7, Math.floor((idle - 10) / 0.16)) };
    return { asset: 'hero_breath_sheet', columns: 3, frame: Math.floor(idle / 0.25) % 6 };
  },
  heroImpact(age) {
    return { flash: age < 0.075 || (age >= 0.20 && age < 0.275) };
  },
  drawHeroSweat(p) {
    const effect = DD.state.heroSweat;
    if (!effect) return;
    const ctx = DD.state.ctx, age = effect.age;
    const scale = age < 0.14 ? 0.65 + age / 0.14 * 0.55 : 1.2 - Math.min(1, (age - 0.14) / 0.16) * 0.2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 0.2) / 0.8);
    ctx.translate(Math.round(p.x + 43), Math.round(Math.max(38, p.y - 56) - age * 22));
    ctx.scale(scale, scale);
    // Separate pixel speech balloon and blue sweat drop.
    ctx.fillStyle = '#302d40';
    ctx.fillRect(-10,-12,20,24); ctx.fillRect(-14,-8,28,16); ctx.fillRect(-10,10,7,5);
    ctx.fillStyle = '#fffbea';
    ctx.fillRect(-8,-10,16,20); ctx.fillRect(-12,-6,24,12); ctx.fillRect(-8,8,4,4);
    ctx.fillStyle = '#227fae';
    ctx.fillRect(-1,-8,2,3); ctx.fillRect(-3,-5,6,4); ctx.fillRect(-5,-1,10,6); ctx.fillRect(-3,5,6,2);
    ctx.fillStyle = '#75e4ff'; ctx.fillRect(-1,-4,2,3); ctx.fillRect(-3,0,5,4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-2,0,2,2);
    ctx.restore();
  },
  drawPlayerAndDwarves() {
    const ctx = DD.state.ctx;
    const p = DD.state.playerPos();
    const pose = this.heroPose();
    const sheet = DD.assets.get(pose.asset);
    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
      const impact = this.heroImpact(DD.state.heroHurtAge ?? 999);
      ctx.save(); ctx.imageSmoothingEnabled = false;
      // Keep the original pixel grid: no interpolated rotation, movement or scaling.
      ctx.translate(Math.round(p.x), Math.round(p.y + 14));
      if (impact.flash) ctx.filter = 'brightness(5) saturate(0)';
      ctx.drawImage(sheet, (pose.frame % pose.columns) * 96, Math.floor(pose.frame / pose.columns) * 96, 96, 96,
        -48, -92, 96, 96);
      ctx.restore();
    } else {
      this.drawImageOrFallback('player', () => {
        ctx.fillStyle = '#e6d5b8'; ctx.fillRect(p.x - 12, p.y - 16, 24, 32);
      }, p.x - 16, p.y - 16, 32, 32);
    }
    this.drawHeroSweat(p);

    const count = DD.state.player.upgrades.summon;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + performance.now() * 0.0005;
      const dx = Math.cos(ang) * 28, dy = Math.sin(ang) * 28;
      const dwarf = DD.state.dwarfActors[i];
      const attack = !!dwarf && dwarf.attackAge < 0.48;
      const sheet = DD.assets.get(attack ? 'dwarf_soul_attack' : 'dwarf_soul_idle');
      const frame = attack ? Math.min(5, Math.floor(dwarf.attackAge / 0.08)) :
        (Math.floor((dwarf?.animTime || 0) / 0.18) + i) % 4;
      if (sheet && sheet.complete && sheet.naturalWidth >= (attack ? 192 : 128) && sheet.naturalHeight >= 32) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, frame * 32, 0, 32, 32, Math.round(p.x + dx - 16), Math.round(p.y + dy - 16), 32, 32);
        ctx.restore();
      } else {
        this.drawImageOrFallback('dwarf', () => {
          ctx.fillStyle = '#8ecae6'; ctx.beginPath(); ctx.arc(p.x + dx, p.y + dy, 7, 0, Math.PI * 2); ctx.fill();
        }, p.x + dx - 8, p.y + dy - 8, 16, 16);
      }
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
    this.drawOpeningChest();
    if (DD.state.mode !== 'boss') this.drawEnemies();
    this.drawGoblinSignMeters();
    this.drawProjectiles();
    this.drawPlayerAndDwarves();
    this.drawDamageNumbers();
    this.drawBossHud();
  }
};
