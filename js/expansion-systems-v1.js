(() => {
const X=DD.expansion,S=DD.state,U=DD.utils,T=DD.config.TILE;
const base={beginFloor:DD.systems.beginFloor,update:DD.systems.update,updateEnemy:DD.systems.updateEnemy,applyDamage:DD.systems.applyDamage,applyUpgrade:DD.systems.applyUpgrade};
Object.assign(X,{
  resetFloor(){
    S.digClock=0;S.digQueue=[];S.digPending=new Set();S.openRevision=0;
    S.devils=[];S.guard=null;S.maid=null;S.decoys=[];S.perfumeTimer=0;S.decoyTimer=0;S.openCache=null;
    for(const d of S.dwarfActors){d.contacts=new Set();d.attackAge=999;}
    this.syncAllies();
  },
  addScore(raw){S.score=Math.max(0,(S.score||0)+raw*(1+this.gear('wallet')*.1));},
  damageScale(){return 1+this.gear('whip')*.1;},
  interval(seconds){return Math.max(.25,seconds*(1-this.gear('megaphone')*.08));},
  hit(e,raw){
    if(!e||!e.alive||raw<=0)return 0;
    const amount=raw*this.damageScale(),actual=Math.min(e.hp,amount);
    e.hp-=amount;e.hitAge=0;
    S.damageNumbers=S.damageNumbers||[];
    const count=S.damageNumbers.filter(n=>n.kind==='enemy'&&n.targetId===e).length;
    S.damageNumbers.push({kind:'enemy',targetId:e,text:'-'+String(Math.round(actual*100)/100),x:e.x+(count%3-1)*8,y:e.y-28,age:0});
    if(e.hp<=0){
      e.alive=false;
      const def=DD.data.enemyDefs[e.type],xp=Math.round(def.xp*DD.systems.currentXpMultiplier());
      this.addScore(10);DD.systems.gainXp(xp);DD.systems.addLog(`${def.name}を倒した～ (+${xp}XP)`,'good');
    }
    return actual;
  },
  cell(x,y){return{x:Math.floor((x-DD.config.boardRect.x)/T),y:Math.floor((y-DD.config.boardRect.y)/T)};},
  clearPoint(x,y,r=0){
    const b=S.board;if(!b)return false;
    for(const [dx,dy] of [[-r,-r],[r,-r],[-r,r],[r,r]]){
      const c=this.cell(x+dx,y+dy);
      if(S.mode==='boss'&&c.y>=DD.config.H&&c.y<DD.config.H+3&&c.x>=0&&c.x<DD.config.W)continue;
      if(!U.inBounds(c.x,c.y))return false;
      const t=b.grid[c.y][c.x];if(!t.active||!t.isOpen)return false;
    }return true;
  },
  openCells(){
    if(S.openCache?.revision===S.openRevision)return S.openCache.cells;
    const cells=[];for(let y=0;y<DD.config.H;y++)for(let x=0;x<DD.config.W;x++)if(S.board.grid[y][x].active&&S.board.grid[y][x].isOpen)cells.push({x,y});
    S.openCache={revision:S.openRevision,cells};return cells;
  },
  route(actor,goal){
    const from=this.cell(actor.x,actor.y),to=this.cell(goal.x,goal.y);
    if(!U.inBounds(from.x,from.y)||!U.inBounds(to.x,to.y))return [];
    return DD.systems.computePath(from,to);
  },
  moveTo(actor,goal,speed,dt){
    if(!goal)return false;
    const goalCell=this.cell(goal.x,goal.y),tag=U.key(goalCell.x,goalCell.y);
    actor.routeAge=(actor.routeAge||0)-dt;
    if(actor.routeTag!==tag||actor.routeAge<=0){actor.route=this.route(actor,goal);actor.routeTag=tag;actor.routeAge=.5;}
    let point=goal;
    if(actor.route?.length)point=U.tileCenter(actor.route[0].x,actor.route[0].y);
    const dx=point.x-actor.x,dy=point.y-actor.y,d=Math.hypot(dx,dy);
    if(d<1){actor.route?.shift();return Math.hypot(goal.x-actor.x,goal.y-actor.y)<2;}
    const travel=Math.min(d,speed*dt),steps=Math.max(1,Math.ceil(travel/2));
    let moved=false;
    for(let i=0;i<steps;i++){const nx=actor.x+dx/d*travel/steps,ny=actor.y+dy/d*travel/steps;if(!this.clearPoint(nx,ny,3)){actor.routeAge=0;break;}actor.x=nx;actor.y=ny;moved=true;}
    if(!moved)actor.routeAge=0;
    if(d<=travel+1)actor.route?.shift();
    return Math.hypot(goal.x-actor.x,goal.y-actor.y)<3;
  },
  push(e,origin,distance,wallDamage=0){
    if(!e.alive)return;let dx=e.x-origin.x,dy=e.y-origin.y,d=Math.hypot(dx,dy);if(d<.01){dx=1;dy=0;d=1;}
    e.knockback={dx:dx/d,dy:dy/d,left:distance,wallDamage};e.path=[];e.navTarget=null;e.repath=0;
  },
  updatePush(e,dt){
    const k=e.knockback;if(!k)return false;
    let travel=Math.min(k.left,180*dt);const radius=Math.min(10,DD.data.enemyDefs[e.type].size);
    while(travel>0){const step=Math.min(2,travel),nx=e.x+k.dx*step,ny=e.y+k.dy*step;
      if(!this.clearPoint(nx,ny,radius)){e.knockback=null;if(k.wallDamage>0)this.hit(e,k.wallDamage);return true;}
      e.x=nx;e.y=ny;k.left-=step;travel-=step;
    }
    const c=this.cell(e.x,e.y);e.tileX=c.x;e.tileY=c.y;
    if(k.left<=.001)e.knockback=null;return true;
  },
  reveal(x,y,due){
    const tile=S.board.grid[y][x];if(!tile.active||tile.isOpen||tile.flagged||tile.isDanger)return false;
    tile.isOpen=true;tile.autoHint=false;S.openRevision++;
    this.addScore(1);DD.systems.gainDigXp(tile.number*10);
    if(S.mode==='boss')S.bossWindowScore+=tile.number*10;
    if(this.lv('resonance'))for(const e of [...S.enemies])this.hit(e,this.lv('resonance'));
    if(tile.isExit&&S.mode==='dungeon'){S.discoveredExit=true;S.readyToDescend=true;S.exitPromptPending=true;DD.systems.addLog('出口を発見した～。探索続行か次階層か選べるよ～','good');}
    if(tile.number===0)for(const[nx,ny]of U.neighbors8(x,y)){
      const n=S.board.grid[ny][nx],key=U.key(nx,ny);
      if(n.active&&!n.isOpen&&!n.isDanger&&!n.flagged&&!S.digPending.has(key)){S.digPending.add(key);S.digQueue.push({x:nx,y:ny,due:due+.06});}
    }
    if(S.mode==='boss'&&DD.board.bossCleared(S.board))DD.systems.winRun();
    DD.ui.resumePendingDialogs();return true;
  },
  updateWaves(dt){
    S.digClock+=dt;S.digQueue.sort((a,b)=>a.due-b.due);
    while(S.digQueue.length&&S.digQueue[0].due<=S.digClock+1e-8&&!S.paused){
      const n=S.digQueue.shift();S.digPending.delete(U.key(n.x,n.y));this.reveal(n.x,n.y,n.due);
      S.digQueue.sort((a,b)=>a.due-b.due);
    }
  },
  spawnShot(kind,x,y,angle,damage,target=null,penetrations=0,bounces=0){
    const p={kind,x,y,vx:Math.cos(angle),vy:Math.sin(angle),damage,target,age:0,launchX:x,launchY:y,launchAngle:angle,phase:kind==='magic'?'swirl':'flight',trail:[],contacts:new Set(),penetrations,bounces};
    S.projectiles.push(p);return p;
  },
  fireCoins(x,y){
    if(S.paused||S.mode==='lost'||S.mode==='won')return 0;
    const p=S.playerPos(),d=Math.hypot(x-p.x,y-p.y);if(d<2)return 0;
    const table=this.stat('coin'),count=Math.min(table[0],Math.floor(S.score||0));
    if(!count)return 0;S.score-=count;
    const aim=Math.atan2(y-p.y,x-p.x);
    for(let i=0;i<count;i++){const a=aim+(i-(count-1)/2)*.14;this.spawnShot('coin',p.x,p.y,a,5,null,table[2]+this.gear('ring'),table[1]+this.gear('mirror'));}
    DD.ui.refreshHud();return count;
  },
  updateShots(dt){
    for(const p of S.projectiles){
      if(p.dead)continue;p.contacts=p.contacts||new Set();p.trail=p.trail||[];
      p.age=(p.age||0)+dt;if(p.age>6){p.dead=true;continue;}
      if(p.target&&!p.target.alive){if(p.kind==='magic'&&!(p.penetrations>0)){p.dead=true;continue;}p.target=null;}
      p.trail.push({x:p.x,y:p.y});if(p.trail.length>5)p.trail.shift();
      if(p.kind==='magic'&&p.age<.18){const t=p.age/.18,r=8*Math.sin(Math.PI*t),a=p.launchAngle+Math.PI*2*t;p.x=p.launchX+Math.cos(a)*r;p.y=p.launchY+Math.sin(a)*r;p.phase='swirl';continue;}
      if(p.kind==='magic'&&p.phase==='swirl'){p.x=p.launchX;p.y=p.launchY;p.phase='flight';}
      if((p.kind==='magic'||p.kind==='fire')&&p.target){const dx=p.target.x-p.x,dy=p.target.y-p.y,len=Math.hypot(dx,dy)||1;p.vx=dx/len;p.vy=dy/len;}
      const speed=p.kind==='coin'?320:p.kind==='fire'?70+230*Math.min(1,p.age/.45)**2:100+400*Math.min(1,(p.age-.18)/.45)**2;
      const travel=speed*(p.kind==='magic'?Math.min(dt,Math.max(0,p.age-.18)):dt),steps=Math.max(1,Math.ceil(travel/3)),step=travel/steps;
      for(let i=0;i<steps&&!p.dead;i++){
        let nx=p.x+p.vx*step,ny=p.y+p.vy*step;
        if(!this.clearPoint(nx,ny,1)){
          if(p.bounces<=0){p.dead=true;break;}
          const blockX=!this.clearPoint(nx,p.y,1),blockY=!this.clearPoint(p.x,ny,1);
          if(blockX||!blockY)p.vx=-p.vx;if(blockY||!blockX)p.vy=-p.vy;
          p.bounces--;p.target=null;
          nx=p.x+p.vx*step;ny=p.y+p.vy*step;
          if(!this.clearPoint(nx,ny,1)){p.dead=true;break;}
        }
        p.x=nx;p.y=ny;
        for(const e of [...p.contacts])if(!e.alive||Math.hypot(e.x-p.x,e.y-p.y)>DD.data.enemyDefs[e.type].size+8)p.contacts.delete(e);
        for(const e of S.enemies){
          if(!e.alive||p.contacts.has(e)||Math.hypot(e.x-p.x,e.y-p.y)>DD.data.enemyDefs[e.type].size+4)continue;
          p.contacts.add(e);this.hit(e,p.damage);
          if(p.penetrations>0){p.penetrations--;if(p.target===e)p.target=null;}else{p.dead=true;break;}
        }
      }
    }
    S.projectiles=S.projectiles.filter(p=>!p.dead);S.enemies=S.enemies.filter(e=>e.alive);
  },
  syncAllies(){
    const p=S.playerPos(),count=this.lv('devil')?this.stat('devil')[0]:0;
    while(S.devils.length<count)S.devils.push({x:p.x,y:p.y,visited:new Map(),cd:.15+Math.random()*1.7,age:0,attackAge:999,variant:S.devils.length});
    if(this.lv('golem')&&!S.guard)S.guard={x:p.x,y:p.y,cd:0,age:0,attackAge:999};
    if(this.lv('maid')&&!S.maid)S.maid={x:p.x-38,y:p.y,age:0,healTime:0};
    while(S.dwarfActors.length<S.player.upgrades.summon)S.dwarfActors.push({cd:Math.random()*.8,contacts:new Set()});
    if(S.dwarfActors.length>S.player.upgrades.summon)S.dwarfActors.length=S.player.upgrades.summon;
  },
  updateAllies(dt){
    this.syncAllies();const p=S.playerPos();
    for(const a of S.devils){
      a.age+=dt;a.attackAge+=dt;a.cd-=dt;
      if(!a.goal||Math.hypot(a.goal.x-a.x,a.goal.y-a.y)<3){
        const c=this.cell(a.x,a.y);a.visited.set(U.key(c.x,c.y),(a.visited.get(U.key(c.x,c.y))||0)+1);
        let opts=U.neighbors4(c.x,c.y).filter(n=>{const t=S.board.grid[n[1]][n[0]];return t.active&&t.isOpen;});
        if(opts.length){opts=U.shuffle(opts);let best=Infinity,choices=[];for(const n of opts){const v=a.visited.get(U.key(...n))||0;if(v<best){best=v;choices=[n];}else if(v===best)choices.push(n);}const n=Math.random()<.7?U.choice(choices):U.choice(opts);a.goal=U.tileCenter(...n);}
        else if(S.mode==='boss')a.goal={x:a.x+(Math.random()-.5)*T*2,y:a.y+(Math.random()-.5)*T};
      }
      if(a.goal)this.moveTo(a,a.goal,28,dt);
      if(a.cd<=0){let target=null,best=T*4;for(const e of S.enemies){const d=Math.hypot(e.x-a.x,e.y-a.y);if(e.alive&&d<best){target=e;best=d;}}
        if(target){const t=this.stat('devil');this.spawnShot('fire',a.x,a.y,Math.atan2(target.y-a.y,target.x-a.x),t[1],target,this.gear('ring'),this.gear('mirror'));a.cd=this.interval(t[2]);a.attackAge=0;}
      }
    }
    const g=S.guard;
    if(g){g.age+=dt;g.attackAge+=dt;g.cd-=dt;let target=null,best=T*4.5;
      for(const e of S.enemies){const d=Math.hypot(e.x-p.x,e.y-p.y);if(e.alive&&d<best){target=e;best=d;}}
      if(target){const d=Math.hypot(target.x-g.x,target.y-g.y);if(d<26){if(g.cd<=0){const t=this.stat('golem');this.hit(target,t[0]);this.push(target,p,t[1],t[2]);g.attackAge=0;g.cd=this.interval(t[3]);}}
        else this.moveTo(g,target,36,dt);
      }else{
        if(!g.goal||Math.hypot(g.goal.x-g.x,g.goal.y-g.y)<4||Math.hypot(g.goal.x-p.x,g.goal.y-p.y)>T*3){const cells=this.openCells().filter(c=>{const v=U.tileCenter(c.x,c.y);return Math.hypot(v.x-p.x,v.y-p.y)<=T*2.5;});g.goal=cells.length?U.tileCenter(...Object.values(U.choice(cells))):{x:p.x+36,y:p.y};}
        this.moveTo(g,g.goal,24,dt);
      }
    }
    if(S.maid){const a=S.maid;a.x=p.x-38;a.y=p.y-8;a.age+=dt;a.healTime+=dt;while(a.healTime+1e-8>=5){a.healTime=Math.max(0,a.healTime-5);S.player.hp=Math.min(S.player.maxHp,S.player.hp+this.lv('maid')*2);}}
  },
  updatePerfume(dt){
    if(!this.lv('perfume'))return;S.perfumeTimer+=dt;const p=S.playerPos(),t=this.stat('perfume');
    while(S.perfumeTimer+1e-8>=.5&&!S.paused){S.perfumeTimer=Math.max(0,S.perfumeTimer-.5);for(const e of [...S.enemies])if(e.alive&&Math.hypot(e.x-p.x,e.y-p.y)<=t[0]*T)this.hit(e,t[1]);}
  },
  dwarfPosition(i){const p=S.playerPos(),a=Math.PI*2*i/Math.max(1,S.dwarfActors.length)+performance.now()*.0005;return{x:p.x+Math.cos(a)*28,y:p.y+Math.sin(a)*28};},
  validLaunch(pos,center){
    if(this.clearPoint(pos.x,pos.y,1))return pos;
    for(let step=7;step>=0;step--){const f=step/8,point={x:center.x+(pos.x-center.x)*f,y:center.y+(pos.y-center.y)*f};if(this.clearPoint(point.x,point.y,1))return point;}
    return center;
  },
  updateBumps(){
    if(!this.lv('bump'))return;
    S.dwarfActors.forEach((a,i)=>{const p=this.dwarfPosition(i);a.contacts=a.contacts||new Set();
      for(const e of [...a.contacts])if(!e.alive||Math.hypot(e.x-p.x,e.y-p.y)>DD.data.enemyDefs[e.type].size+14)a.contacts.delete(e);
      for(const e of S.enemies)if(e.alive&&!a.contacts.has(e)&&Math.hypot(e.x-p.x,e.y-p.y)<=DD.data.enemyDefs[e.type].size+12){a.contacts.add(e);const t=this.stat('bump');this.hit(e,t[0]);this.push(e,p,t[1],0);}
    });
  },
  updateDecoys(dt){
    if(!this.lv('decoy'))return;const t=this.stat('decoy');S.decoys=S.decoys.filter(d=>d.hp>0);const existing=new Set(S.decoys);S.decoyTimer+=dt;
    if(S.decoyTimer+1e-8>=t[1]){S.decoyTimer%=t[1];const opts=U.shuffle(this.openCells().filter(c=>{const tile=S.board.grid[c.y][c.x];return !tile.chest&&!tile.isExit&&!tile.isEntrance&&!S.decoys.some(d=>d.tileX===c.x&&d.tileY===c.y);}));
      while(S.decoys.length<t[0]&&opts.length){const c=opts.pop(),pos=U.tileCenter(c.x,c.y),hp=Math.max(1,S.player.maxHp*t[2]);S.decoys.push({tileX:c.x,tileY:c.y,...pos,hp,maxHp:hp,incomeTime:0});}
    }
    for(const d of S.decoys){const max=Math.max(1,S.player.maxHp*t[2]);if(max!==d.maxHp){d.hp=Math.min(max,d.hp+Math.max(0,max-d.maxHp));d.maxHp=max;}if(existing.has(d))d.incomeTime+=dt;while(d.incomeTime+1e-8>=5){d.incomeTime=Math.max(0,d.incomeTime-5);this.addScore(10);}}
  },
  decoyTarget(e,dt){
    e.decoyCheck=(e.decoyCheck||0)-dt;
    if(e.decoyCheck>0&&e.decoyTarget?.hp>0)return e.decoyTarget;
    e.decoyCheck=.5;const opts=S.decoys.filter(d=>d.hp>0).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y));
    e.decoyTarget=opts.find(d=>Math.hypot(d.x-e.x,d.y-e.y)<T||this.route(e,d).length)||null;return e.decoyTarget;
  },
  lootCandidates(){
    const items=Object.keys(DD.data.itemDefs).map(key=>({type:'item',key})),gear=S.equipment||{},slots=Object.keys(gear).length;
    for(const key of Object.keys(this.equipmentDefs))if((gear[key]||0)<5&&(gear[key]||slots<3))items.push({type:'equipment',key});
    return U.shuffle(items).slice(0,3);
  },
  acquireReward(choice,debug=false){
    if(choice.type==='item'){DD.systems.grantChestItem(choice.key);return true;}
    const gear=S.equipment,key=choice.key;if(!this.equipmentDefs[key]||(gear[key]||0)>=5||(!debug&&!gear[key]&&Object.keys(gear).length>=3))return false;
    const old=gear[key]||0;gear[key]=old+1;
    if(key==='ring'||key==='mirror')for(const shot of S.projectiles)if(!shot.dead){const field=key==='ring'?'penetrations':'bounces';shot[field]=(shot[field]||0)+1;}
    if(key==='megaphone'){const ratio=(1-gear[key]*.08)/(1-old*.08);for(const a of [...S.dwarfActors,...S.devils,...(S.guard?[S.guard]:[])])a.cd=Math.max(0,a.cd||0)*ratio;}
    DD.systems.addLog(`${this.equipmentDefs[key].name} Lv${gear[key]} を装備～`,'good');return true;
  }
});
DD.systems.beginFloor=function(floor){base.beginFloor.call(this,floor);X.resetFloor();};
DD.systems.openTile=function(x,y){
  if(S.mode==='lost'||S.mode==='won'||!U.inBounds(x,y))return;
  const t=S.board.grid[y][x];if(!t.active||t.isOpen||t.flagged)return;
  if(t.isDanger){this.loseRun('危険岩盤を掘り抜いて洞窟が崩壊した～');return;}
  X.reveal(x,y,S.digClock);DD.ui.refreshHud();
};
DD.systems.applyDamage=function(raw){base.applyDamage.call(this,raw*(1-X.gear('pendant')*.05));};
DD.systems.applyUpgrade=function(key,id){
  if(!X.canUpgrade(key))return;
  const before=X.lv(key),actors=key==='castSpeed'?[...S.dwarfActors]:key==='devil'?[...S.devils]:key==='golem'&&S.guard?[S.guard]:[];
  base.applyUpgrade.call(this,key,id);
  if(X.lv(key)!==before){X.syncAllies();if(key==='decoy')S.decoyTimer=X.stat('decoy')[1];
    if(before>0&&actors.length){const old=key==='castSpeed'?Math.max(1,2-before*.2):X.stat(key,before)[key==='devil'?2:3];const next=key==='castSpeed'?Math.max(1,2-X.lv(key)*.2):X.stat(key)[key==='devil'?2:3];for(const a of actors)a.cd=Math.max(0,a.cd||0)*next/old;}
  }
};
DD.systems.updateDwarves=function(dt){
  X.syncAllies();const p=S.playerPos();
  S.dwarfActors.forEach((a,i)=>{a.animTime=(a.animTime||0)+dt;a.attackAge=Math.min(999,(a.attackAge??999)+dt);a.cd-=dt;if(a.cd>0)return;
    let target=null,best=T*5;for(const e of S.enemies){const d=Math.hypot(e.x-p.x,e.y-p.y);if(e.alive&&d<best){best=d;target=e;}}
    if(!target)return;const pos=X.validLaunch(X.dwarfPosition(i),p);X.spawnShot('magic',pos.x,pos.y,Math.atan2(target.y-pos.y,target.x-pos.x),2+X.lv('projectilePower'),target,X.gear('ring'),X.gear('mirror'));a.attackAge=0;a.cd=X.interval(Math.max(1,2-X.lv('castSpeed')*.2));
  });
};
DD.systems.updateProjectiles=function(dt){X.updateShots(dt);};
DD.systems.updateEnemy=function(e,dt){
  if(!e.alive)return;if(X.updatePush(e,dt))return;
  const d=X.decoyTarget(e,dt);
  if(d){e.pendingStrike=0;e.targetFlag=null;e.breakingSign=false;
    if(Math.hypot(e.x-d.x,e.y-d.y)<22){e.attackTimer-=dt;if(e.attackTimer<=0){d.hp-=DD.data.enemyDefs[e.type].damage;e.attackAnimTimer=0;e.attackTimer=DD.data.enemyDefs[e.type].attackCooldown;}}
    else X.moveTo(e,d,DD.config.baseEnemySpeed*DD.data.enemyDefs[e.type].speedMul,dt);
    const c=X.cell(e.x,e.y);e.tileX=c.x;e.tileY=c.y;return;
  }
  base.updateEnemy.call(this,e,dt);
};
DD.systems.update=function(dt){
  if(!S.paused&&S.mode!=='lost'&&S.mode!=='won'){
    X.updateWaves(dt);
    if(!S.paused){X.updateDecoys(dt);if(!S.paused)X.updateAllies(dt);if(!S.paused)X.updatePerfume(dt);if(!S.paused)X.updateBumps();S.enemies=S.enemies.filter(e=>e.alive);}
  }
  base.update.call(this,dt);
};
})();



