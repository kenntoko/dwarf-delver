(() => {
const S=DD.state,UI=DD.ui,bind=UI.bindDom,refresh=UI.refreshHud;
UI.bindDom=function(){
  bind.call(this);
  const panel=document.getElementById('debugPanel');
  const monsters=document.createElement('fieldset');monsters.innerHTML='<legend>MONSTERS</legend>'+Object.entries(DD.data.enemyDefs).map(([key,d])=>`<button type="button" data-spawn-monster="${key}">${d.name} +1</button>`).join('');
  const floors=document.createElement('fieldset');floors.innerHTML='<legend>FLOORS</legend>'+[1,2,3,4].map(f=>`<button type="button" data-debug-floor="${f}">B${f}F${f===4?' BOSS':''}</button>`).join('');
  panel.querySelector('output').before(monsters,floors);
  panel.addEventListener('click',e=>{
    if(S.paused||S.mode==='lost'||S.mode==='won')return;
    const monster=e.target.closest('[data-spawn-monster]'),floor=e.target.closest('[data-debug-floor]');
    if(monster){
      const p=S.playerPos(),tiles=[];
      for(let y=0;y<S.board.grid.length;y++)for(let x=0;x<S.board.grid[y].length;x++){const t=S.board.grid[y][x];if(!t.active||!t.isOpen)continue;const pos=DD.utils.tileCenter(x,y);tiles.push({...pos,d:Math.hypot(pos.x-p.x,pos.y-p.y)});}
      const pos=tiles.filter(t=>t.d>=72).sort((a,b)=>a.d-b.d)[0]||p;
      DD.redSlime.spawnAt(monster.dataset.spawnMonster,pos.x,pos.y);
      panel.querySelector('output').textContent=`DEBUG : ${DD.data.enemyDefs[monster.dataset.spawnMonster].name} +1`;
    }else if(floor){
      DD.systems.beginFloor(Number(floor.dataset.debugFloor));
      panel.querySelector('output').textContent=`DEBUG : B${floor.dataset.debugFloor}F`;
    }else return;
    UI.refreshHud();
  });
};
UI.refreshHud=function(){refresh.call(this);document.querySelectorAll('[data-spawn-monster],[data-debug-floor]').forEach(b=>b.disabled=!!S.paused||S.mode==='lost'||S.mode==='won');};
})();
