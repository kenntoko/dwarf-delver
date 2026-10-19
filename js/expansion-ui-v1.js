(() => {
const X=DD.expansion,S=DD.state,UI=DD.ui;
const base={bindDom:UI.bindDom,refreshHud:UI.refreshHud,upgradeIcon:UI.upgradeIcon,inspectDescription:UI.inspectDescription,updateChestOpening:UI.updateChestOpening};
UI.upgradeIcon=function(key){return X.skillNames[key]?'./assets/expansion/icon_'+key+'.png':base.upgradeIcon.call(this,key);};
X.equipmentIcon=key=>'./assets/expansion/icon_'+key+'.png';
X.renderEquipment=function(){
  const slotCount=document.getElementById('bonusSlotCount');if(slotCount)slotCount.textContent='追加ボーナス '+this.bonusKeys().length+' / 5';
  const keys=Object.keys(S.equipment||{}),signature=keys.map(k=>k+':'+S.equipment[k]).join(',');
  const make=(k,compact=false)=>`<button type="button" class="equipment-slot inspect-icon ${compact?'equipment-hud':''}" data-inspect-type="equipment" data-inspect-key="${k}" aria-label="${this.equipmentDefs[k].name} Lv${S.equipment[k]}"><img src="${this.equipmentIcon(k)}" width="32" height="32" alt=""><span class="icon-value">${compact?'':this.equipmentDefs[k].name+'<br>'}Lv${S.equipment[k]}${compact?'':' / 5'}</span></button>`;
  const dock=document.getElementById('equipmentDock'),menu=document.getElementById('menuEquipment');
  if(dock&&dock.dataset.signature!==signature){dock.dataset.signature=signature;dock.innerHTML=keys.map(k=>make(k,true)).join('');}
  if(menu&&menu.dataset.signature!==signature){menu.dataset.signature=signature;menu.innerHTML=keys.length?keys.map(k=>make(k)).join(''):'<p>なし（最大3種類）</p>';}
};
UI.bindDom=function(){
  const hud=document.getElementById('gameHud');
  const bonuses=document.getElementById('upgradesBox'),shelf=document.createElement('div');shelf.className='bonus-shelf';bonuses.before(shelf);
  const count=document.createElement('div');count.id='bonusSlotCount';count.className='bonus-slot-count';count.title='固有の奴隷調達・銭投げは別枠';shelf.append(count,bonuses);
  const inventory=document.getElementById('inventoryDock'),right=document.createElement('div');right.className='hud-owned-items';inventory.before(right);
  const dock=document.createElement('div');dock.id='equipmentDock';dock.className='equipment-dock';dock.setAttribute('role','group');dock.setAttribute('aria-label','パッシブ装備・最大3枠');right.append(dock,inventory);
  const menu=document.createElement('section');menu.innerHTML='<h2>パッシブ装備</h2><div id="menuEquipment" class="menu-icon-grid"></div>';
  document.getElementById('menuItems').parentElement.insertBefore(menu,document.getElementById('menuItems').previousElementSibling);
  base.bindDom.call(this);this.bindInspectSurface(dock,false);this.bindInspectSurface(document.getElementById('menuEquipment'),true);
};
UI.inspectDescription=function(type,key){
  if(type==='equipment')return{title:X.equipmentDefs[key].name+' Lv'+S.equipment[key],text:X.equipmentDefs[key].desc(S.equipment[key])};
  return base.inspectDescription.call(this,type,key);
};
UI.refreshHud=function(){base.refreshHud.call(this);X.renderEquipment();};
DD.systems.openChest=function(x,y){
  if(S.paused||S.mode==='lost'||S.mode==='won')return;
  const t=S.board.grid[y]?.[x];if(!t?.active||!t.isOpen||!t.chest)return;
  t.chest=false;S.activeChest={x,y,age:0};S.lootChoices=X.lootCandidates();S.lootChoiceId=(S.lootChoiceId||0)+1;
  S.paused=true;S.pauseReason='chest';S.lootShown=false;S.dom.lootDialog.innerHTML='';S.dom.lootDialog.classList.remove('loot-flight');UI.refreshHud();
};
X.showLootChoices=function(){
  const id=S.lootChoiceId,choices=S.lootChoices;
  if(!choices?.length){S.lootChoices=[{type:'item',key:'heal'}];return this.showLootChoices();}
  const cards=choices.map((c,i)=>{
    const gear=c.type==='equipment',def=gear?this.equipmentDefs[c.key]:DD.data.itemDefs[c.key],lv=S.equipment[c.key]||0;
    const icon=gear?this.equipmentIcon(c.key):UI.itemIcon(c.key),detail=gear?`${lv?'Lv'+lv:'未所持'} → Lv${lv+1}<br>${def.desc(lv+1)}`:def.desc;
    return `<button type="button" class="loot-choice-card ${gear?'is-equipment':'is-consumable'}" data-loot-index="${i}"><span class="loot-kind">${gear?'パッシブ装備':'消費アイテム'}</span><img src="${icon}" width="64" height="64" alt=""><strong>${def.name}</strong><span>${detail}</span></button>`;
  }).join('');
  S.dom.lootDialog.innerHTML=`<section class="loot-choice-modal" role="dialog" aria-modal="true" aria-labelledby="lootChoiceTitle"><h2 id="lootChoiceTitle">宝箱：1つ選んでください</h2><p>装備 ${Object.keys(S.equipment).length} / 3枠</p><div class="loot-choices">${cards}</div></section>`;
  S.dom.lootDialog.classList.add('show','loot-choices-layer');
  S.dom.lootDialog.querySelectorAll('button[data-loot-index]').forEach(b=>b.addEventListener('click',()=>this.chooseLoot(Number(b.dataset.lootIndex),id)));
  S.dom.lootDialog.querySelector('button')?.focus();S.lootShown=true;
};
X.chooseLoot=function(index,id){
  if(S.pauseReason!=='chest'||id!==S.lootChoiceId||!S.lootShown)return false;
  const choice=S.lootChoices?.[index];if(!choice)return false;
  if(!this.acquireReward(choice)){S.lootChoices=this.lootCandidates();this.showLootChoices();return false;}
  S.lootChoices=null;S.lootShown=false;S.activeChest=null;
  S.dom.lootDialog.classList.remove('show','loot-choices-layer');S.dom.lootDialog.innerHTML='';
  S.paused=false;S.pauseReason='';S.lastTimeStamp=0;UI.refreshHud();UI.resumePendingDialogs();return true;
};
UI.updateChestOpening=function(dt){
  if(S.pauseReason==='chest'&&S.lootChoices){S.activeChest.age+=dt;if(S.activeChest.age>=.35&&!S.lootShown)X.showLootChoices();return;}
  base.updateChestOpening.call(this,dt);
};
})();
