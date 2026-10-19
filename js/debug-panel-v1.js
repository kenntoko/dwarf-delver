(() => {
const S=DD.state,X=DD.expansion,UI=DD.ui;
const bind=UI.bindDom,refresh=UI.refreshHud;
function grantSkill(key){
  const before=X.lv(key);if(before>=5)return;
  S.player.upgrades[key]=before+1;
  if(key==='vitality'){S.player.maxHp+=20;S.player.hp=Math.min(S.player.maxHp,S.player.hp+20);}
  const actors=key==='castSpeed'?S.dwarfActors:key==='devil'?S.devils:key==='golem'&&S.guard?[S.guard]:[];
  if(before>0&&actors?.length){const old=key==='castSpeed'?Math.max(1,2-before*.2):X.stat(key,before)[key==='devil'?2:3],next=key==='castSpeed'?Math.max(1,2-X.lv(key)*.2):X.stat(key)[key==='devil'?2:3];for(const a of actors)a.cd=Math.max(0,a.cd||0)*next/old;}
  X.syncAllies();if(key==='decoy')S.decoyTimer=X.stat('decoy')[1];
}
UI.bindDom=function(){
  bind.call(this);
  const panel=document.createElement('details');panel.id='debugPanel';panel.className='debug-panel';
  const group=(label,defs,type)=>`<fieldset><legend>${label}</legend>${Object.entries(defs).map(([key,d])=>`<button type="button" data-debug-type="${type}" data-debug-key="${key}">${d.name} <span></span> +1</button>`).join('')}</fieldset>`;
  panel.innerHTML='<summary>DEBUG MODE</summary><p>DEBUG：SKILLS / EQUIPMENT SLOT LIMIT OFF · MAX Lv5</p>'+group('SKILLS',DD.data.upgradeDefs,'skill')+group('ITEMS',DD.data.itemDefs,'item')+group('EQUIPMENT',X.equipmentDefs,'equipment')+'<output aria-live="polite"></output>';
  document.querySelector('main').append(panel);
  panel.addEventListener('click',e=>{
    const b=e.target.closest('button[data-debug-key]');if(!b||S.paused||S.mode==='lost'||S.mode==='won')return;
    const key=b.dataset.debugKey,type=b.dataset.debugType;
    if(type==='skill')grantSkill(key);
    else if(type==='item')DD.systems.grantChestItem(key);
    else X.acquireReward({type:'equipment',key},true);
    panel.querySelector('output').textContent=`DEBUG +1 : ${type==='skill'?DD.data.upgradeDefs[key].name:type==='item'?DD.data.itemDefs[key].name:X.equipmentDefs[key].name}`;
    UI.refreshHud();
  });
};
UI.refreshHud=function(){
  refresh.call(this);
  document.querySelectorAll('#debugPanel button[data-debug-key]').forEach(b=>{
    const k=b.dataset.debugKey,t=b.dataset.debugType,n=t==='skill'?X.lv(k):t==='equipment'?X.gear(k):S.inventory[k]||0;
    b.querySelector('span').textContent=t==='item'?`(${n})`:`Lv${n}/5`;
    b.disabled=S.paused||S.mode==='lost'||S.mode==='won'||(t!=='item'&&n>=5);
  });
};
})();
