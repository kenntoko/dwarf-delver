(() => {
const S=DD.state,X=DD.expansion,UI=DD.ui,U=DD.utils;
const R=DD.results={active:null,record:null,busy:false,pending:null,countup:null,history:[],config:{baseCost:300,costStep:100,completeReward:3000}};
S.totalScoreEarned=0;S.gachaDraws=0;
R.money=n=>Number((Math.round((n||0)*10)/10).toFixed(1)).toLocaleString('ja-JP');
R.cost=()=>R.config.baseCost+R.config.costStep*S.gachaDraws;
R.bonus=(opened,total)=>{
  if(!total)return 0;
  for(const [percent,reward]of [[100,1500],[90,1200],[75,700],[50,300],[25,100]])if(opened*100>=total*percent)return reward;
  return 0;
};
const add=X.addScore;
X.addScore=function(raw){
  const before=S.score||0;add.call(this,raw);const gain=Math.max(0,S.score-before);
  S.totalScoreEarned+=gain;
  if(R.record&&R.record.board===S.board&&!R.record.settled)R.record.earned+=gain;
};
const fire=X.fireCoins;
X.fireCoins=function(x,y){
  const before=S.score||0,result=fire.call(this,x,y),spent=Math.max(0,before-S.score);
  if(R.record&&R.record.board===S.board&&!R.record.settled)R.record.coinSpent+=spent;
  return result;
};
const hit=X.hit;
X.hit=function(enemy,raw){
  const alive=enemy?.alive,result=hit.call(this,enemy,raw);
  if(alive&&!enemy.alive&&R.record&&R.record.board===S.board&&!R.record.settled)R.record.kills++;
  return result;
};
const begin=DD.systems.beginFloor;
DD.systems.beginFloor=function(floor){
  R.record=null;R.pending=null;
  const result=begin.call(this,floor);
  R.record={board:S.board,floor,safeTotal:S.board.grid.flat().filter(t=>t.active&&!t.isDanger&&!t.wasDanger).length,earned:0,coinSpent:0,kills:0,settled:null};
  return result;
};
R.settle=function(){
  const record=R.record;if(!record||record.board!==S.board)return null;
  if(record.settled)return record.settled;
  const opened=S.board.grid.flat().filter(t=>t.active&&t.isOpen&&!t.isDanger&&!t.wasDanger).length;
  const total=record.safeTotal,complete=total>0&&opened===total;
  const result={floor:record.floor,nextFloor:record.floor+1,time:S.floorTimer,opened,total,rate:total?opened/total*100:0,kills:record.kills,earned:record.earned,coinSpent:record.coinSpent,exploreBonus:R.bonus(opened,total),clearReward:complete?R.config.completeReward:0,complete,gachaSpent:0,draws:0,balanceBefore:S.score||0};
  record.settled=result;R.history.push(result);
  const reward=result.exploreBonus+result.clearReward;
  // Settlement amounts are exact rewards, unaffected by the exploration wallet multiplier.
  S.score=(S.score||0)+reward;S.totalScoreEarned+=reward;
  return result;
};
R.pools=function(){
  const gear=S.equipment||{},slots=Object.keys(gear).length;
  return [
    {type:'item',keys:Object.keys(DD.data.itemDefs)},
    {type:'upgrade',keys:X.availableUpgrades()},
    {type:'equipment',keys:Object.keys(X.equipmentDefs).filter(k=>(gear[k]||0)<5&&(gear[k]||slots<3))}
  ].filter(p=>p.keys.length);
};
R.grant=function(type,key){
  if(type!=='upgrade')return X.acquireReward({type,key});
  if(!X.canUpgrade(key))return false;
  const saved={paused:S.paused,pauseReason:S.pauseReason,pendingChoices:S.pendingChoices,pendingLevelBonuses:S.pendingLevelBonuses,levelChoiceId:S.levelChoiceId};
  const before=X.lv(key);
  try{
    S.paused=true;S.pauseReason='levelup';S.pendingChoices=[key];S.pendingLevelBonuses=1;S.levelChoiceId=(S.levelChoiceId||0)+1;
    DD.systems.applyUpgrade(key,S.levelChoiceId);
  }finally{Object.assign(S,saved);}
  return X.lv(key)===before+1;
};
R.finishCountup=function(){
  const animation=R.countup;if(!animation)return;
  R.countup=null;
  if(animation.frame!=null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(animation.frame);
  document.getElementById('resultBalance').textContent=R.money(S.score);
  DD.audio?.playScoreSettle?.();
};
R.startCountup=function(){
  const r=R.active,reward=r&&(r.exploreBonus+r.clearReward);
  if(!(reward>0)||typeof requestAnimationFrame!=='function')return;
  const animation=R.countup={from:r.balanceBefore,to:S.score,displayed:r.balanceBefore,duration:Math.min(1400,650+Math.sqrt(reward)*10),start:null,lastChime:-Infinity,frame:null};
  const step=now=>{
    if(R.countup!==animation||R.active!==r)return;
    if(animation.start===null)animation.start=now;
    const progress=Math.min(1,(now-animation.start)/animation.duration);
    const eased=1-(1-progress)**3;
    const previous=animation.displayed;
    animation.displayed=animation.from+(animation.to-animation.from)*eased;
    document.getElementById('resultBalance').textContent=R.money(animation.displayed);
    if(animation.displayed>previous+.01&&now-animation.lastChime>=130){
      DD.audio?.playCoin?.();animation.lastChime=now;
    }
    if(progress<1)animation.frame=requestAnimationFrame(step);
    else { R.countup=null; DD.audio?.playScoreSettle?.(); }
  };
  document.getElementById('resultBalance').textContent=R.money(animation.displayed);
  animation.frame=requestAnimationFrame(step);
};
R.pickOffers=function(){
  let pools=R.pools().map(pool=>({type:pool.type,keys:[...pool.keys]}));
  if(!pools.length)return [];
  const offers=[];
  for(let i=0;i<3;i++){
    let available=pools.filter(pool=>pool.keys.length);
    if(!available.length){pools=R.pools().map(pool=>({type:pool.type,keys:[...pool.keys]}));available=pools.filter(pool=>pool.keys.length);}
    const pool=U.choice(available),key=U.choice(pool.keys);
    pool.keys.splice(pool.keys.indexOf(key),1);
    offers.push({type:pool.type,key});
  }
  return offers;
};
R.draw=function(){
  if(!R.active||R.busy||R.pending||S.pauseReason!=='result')return false;
  R.finishCountup();
  const cost=R.cost();if(S.score+1e-8<cost)return false;
  const offers=R.pickOffers();if(offers.length!==3)return false;
  R.busy=true;
  try{
    S.score-=cost;S.gachaDraws++;R.active.gachaSpent+=cost;R.active.draws++;
    R.active.lastReward=null;R.pending=offers;
    return true;
  }finally{R.busy=false;R.render();R.renderChoices();UI.refreshHud();if(R.pending)document.querySelector?.('#resultChoiceOptions button')?.focus({preventScroll:true});}
};
R.choose=function(index){
  if(!R.active||R.busy||!R.pending||S.pauseReason!=='result')return false;
  const offer=R.pending[index];if(!offer)return false;
  R.busy=true;
  try{
    if(!R.grant(offer.type,offer.key))return false;
    R.active.lastReward=offer;R.pending=null;
    return true;
  }finally{R.busy=false;R.render();R.renderChoices();UI.refreshHud();if(!R.pending)(document.getElementById('resultGacha').disabled?document.getElementById('resultNext'):document.getElementById('resultGacha')).focus({preventScroll:true});}
};
const update=DD.systems.update;
DD.systems.update=function(dt){if(R.active)return;return update.call(this,dt);};
const pending=UI.resumePendingDialogs;
UI.resumePendingDialogs=function(){if(R.active)return;return pending.call(this);};
const next=DD.systems.nextFloor;
DD.systems.nextFloor=function(){
  if(R.active)return;
  if(S.mode!=='dungeon'||!S.readyToDescend||(S.paused&&S.pauseReason!=='exit'))return;
  UI.closeExitPrompt();S.paused=true;S.pauseReason='result';
  R.active=R.settle();
  if(!R.active){S.paused=false;S.pauseReason='';return;}
  R.render();document.getElementById('floorResult').hidden=false;R.startCountup();
  document.getElementById('resultNext').focus({preventScroll:true});UI.refreshHud();
};
R.depart=function(){
  if(!R.active||R.busy||R.pending)return false;
  R.finishCountup();
  R.active=null;document.getElementById('floorResult').hidden=true;
  S.paused=false;S.pauseReason='';S.lastTimeStamp=0;
  next.call(DD.systems);return true;
};
R.rewardInfo=function(reward){
  if(reward.type==='upgrade')return{name:DD.data.upgradeDefs[reward.key].name,icon:UI.upgradeIcon(reward.key),detail:`Lv${X.lv(reward.key)}：${DD.data.upgradeDefs[reward.key].getDesc(X.lv(reward.key))}`};
  if(reward.type==='equipment')return{name:X.equipmentDefs[reward.key].name,icon:X.equipmentIcon(reward.key),detail:`Lv${X.gear(reward.key)}：${X.equipmentDefs[reward.key].desc(X.gear(reward.key))}`};
  return{name:DD.data.itemDefs[reward.key].name,icon:UI.itemIcon(reward.key),detail:DD.data.itemDefs[reward.key].desc};
};
R.offerInfo=function(reward){
  if(reward.type==='upgrade'){const level=X.lv(reward.key)+1;return{name:DD.data.upgradeDefs[reward.key].name,icon:UI.upgradeIcon(reward.key),detail:`Lv${level}：${DD.data.upgradeDefs[reward.key].getDesc(level)}`};}
  if(reward.type==='equipment'){const level=X.gear(reward.key)+1;return{name:X.equipmentDefs[reward.key].name,icon:X.equipmentIcon(reward.key),detail:`Lv${level}：${X.equipmentDefs[reward.key].desc(level)}`};}
  return{name:DD.data.itemDefs[reward.key].name,icon:UI.itemIcon(reward.key),detail:DD.data.itemDefs[reward.key].desc};
};
R.renderChoices=function(){
  const layer=document.getElementById('resultChoiceLayer');if(!layer)return;
  layer.hidden=!R.pending;
  const options=document.getElementById('resultChoiceOptions');
  options.innerHTML=R.pending?R.pending.map((offer,index)=>{
    const info=R.offerInfo(offer);
    return `<button type="button" data-choice-index="${index}"><img src="${info.icon}" width="48" height="48" alt=""><span><strong>${info.name}</strong><small>${info.detail}</small></span></button>`;
  }).join(''):'';
};
R.render=function(){
  const r=R.active;if(!r)return;
  const el=id=>document.getElementById(id),money=R.money;
  const row=(label,value,kind='')=>`<div${kind?' class="result-'+kind+'"':''}><dt>${label}</dt><dd>${value}</dd></div>`;
  el('resultTitle').textContent=`B${r.floor}F おかねの精算`;
  el('resultSpeech').textContent=r.complete?'全部掘って、報酬も全部いただき！':r.rate>=75?'ふふん、よく働いたじゃない。お代はいただくわ！':r.rate>=25?'まずまずね。もっと稼いでもよかったのに！':'もう帰るの？ 次はもっと稼ぎなさいよね。';
  el('resultPortrait').classList.toggle('is-bored',r.rate<25);
  const net=r.earned+r.exploreBonus+r.clearReward-r.coinSpent;
  el('resultStats').innerHTML=row('探索で獲得したスコア',`＋${money(r.earned)}`)+row('開拓ボーナス',`＋${money(r.exploreBonus)}`)+row('マインスイーパー完全クリア報酬',`＋${money(r.clearReward)}`)+row('銭投げ経費',`−${money(r.coinSpent)}`,'expense')+row('今回の収支',`${net<0?'−':'＋'}${money(Math.abs(net))}`,'net');
  el('resultBalance').textContent=money(R.countup?.displayed??S.score);
  el('resultLifetime').textContent=`累計獲得：${money(S.totalScoreEarned)}　／　今回のガチャ消費：${money(r.gachaSpent)}`;
  el('resultGacha').textContent=`ボーナスガチャ　${money(R.cost())} スコア`;
  el('resultGacha').disabled=R.busy||!!R.pending||S.score+1e-8<R.cost()||!R.pools().length;
  el('resultNext').disabled=!!R.pending;
  if(el('resultGacha').disabled&&!R.pending&&document.activeElement===el('resultGacha'))el('resultNext').focus({preventScroll:true});
  el('resultGachaHint').textContent=R.pending?'3つの中から1つ選んでね。':S.score+1e-8<R.cost()?'スコアが足りないわ。次の階で稼ぎなさい！':'消費アイテム・LvUpボーナス・装備を同じ確率で抽選。引くたびに＋100。';
  el('resultNext').textContent=`B${r.nextFloor}Fへ進む`;
  const reward=el('resultDrawReward');
  if(r.lastReward){const info=R.rewardInfo(r.lastReward);reward.innerHTML=`<img src="${info.icon}" width="48" height="48" alt=""><div><strong>${info.name} を獲得！</strong><p>${info.detail}</p></div>`;reward.hidden=false;}else{reward.innerHTML='';reward.hidden=true;}
};
const bind=UI.bindDom;
UI.bindDom=function(){
  bind.call(this);
  const layer=document.createElement('div');layer.id='floorResult';layer.hidden=true;
  layer.innerHTML='<section class="result-card" role="dialog" aria-modal="true" aria-labelledby="resultTitle"><div class="result-receipt"><h1 id="resultTitle"></h1><dl id="resultStats"></dl><div class="result-wallet"><span>現在の所持スコア</span><strong id="resultBalance"></strong></div><button id="resultGacha" type="button"></button><p id="resultGachaHint"></p><div id="resultDrawReward" aria-live="polite" hidden></div><p id="resultLifetime"></p></div><div class="result-character"><div class="result-character-top"><p id="resultSpeech"></p></div><div class="result-portrait-stage"><div id="resultPortrait" aria-hidden="true"></div></div><button id="resultNext" type="button"></button></div></section><div id="resultChoiceLayer" class="result-choice-layer" hidden><section class="result-choice-card" role="dialog" aria-modal="true" aria-labelledby="resultChoiceTitle"><h2 id="resultChoiceTitle">ボーナスをひとつ選ぶ</h2><p>3つの候補から1つを獲得します</p><div id="resultChoiceOptions"></div></section></div>';
  document.getElementById('boardWrap').append(layer);
  document.getElementById('resultGacha').addEventListener('click',()=>R.draw());
  document.getElementById('resultNext').addEventListener('click',()=>R.depart());
  document.getElementById('resultChoiceOptions').addEventListener('click',e=>{const button=e.target.closest('button[data-choice-index]');if(button)R.choose(Number(button.dataset.choiceIndex));});
  layer.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();}
    if(e.key==='Tab'){
      const buttons=R.pending?[...document.getElementById('resultChoiceOptions').querySelectorAll('button')]:[...layer.querySelectorAll('.result-card button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
};
})();
