(() => {
const S=DD.state,X=DD.expansion,UI=DD.ui,U=DD.utils;
const R=DD.results={active:null,record:null,busy:false,history:[],config:{baseCost:300,costStep:100,completeReward:3000}};
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
  R.record=null;
  const result=begin.call(this,floor);
  R.record={board:S.board,floor,safeTotal:S.board.grid.flat().filter(t=>t.active&&!t.isDanger&&!t.wasDanger).length,earned:0,coinSpent:0,kills:0,settled:null};
  return result;
};
R.settle=function(){
  const record=R.record;if(!record||record.board!==S.board)return null;
  if(record.settled)return record.settled;
  const opened=S.board.grid.flat().filter(t=>t.active&&t.isOpen&&!t.isDanger&&!t.wasDanger).length;
  const total=record.safeTotal,complete=total>0&&opened===total;
  const result={floor:record.floor,nextFloor:record.floor+1,time:S.floorTimer,opened,total,rate:total?opened/total*100:0,kills:record.kills,earned:record.earned,coinSpent:record.coinSpent,exploreBonus:R.bonus(opened,total),clearReward:complete?R.config.completeReward:0,complete,gachaSpent:0,draws:0};
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
R.draw=function(){
  if(!R.active||R.busy||S.pauseReason!=='result')return false;
  const cost=R.cost(),pools=R.pools();if(S.score+1e-8<cost||!pools.length)return false;
  R.busy=true;
  try{
    const pool=U.choice(pools),key=U.choice(pool.keys);
    if(!R.grant(pool.type,key))return false;
    S.score-=cost;S.gachaDraws++;R.active.gachaSpent+=cost;R.active.draws++;
    R.active.lastReward={type:pool.type,key};
    return true;
  }finally{R.busy=false;R.render();UI.refreshHud();}
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
  R.render();document.getElementById('floorResult').hidden=false;
  document.getElementById('resultNext').focus({preventScroll:true});UI.refreshHud();
};
R.depart=function(){
  if(!R.active||R.busy)return false;
  R.active=null;document.getElementById('floorResult').hidden=true;
  S.paused=false;S.pauseReason='';S.lastTimeStamp=0;
  next.call(DD.systems);return true;
};
R.rewardInfo=function(reward){
  if(reward.type==='upgrade')return{name:DD.data.upgradeDefs[reward.key].name,icon:UI.upgradeIcon(reward.key),detail:`Lv${X.lv(reward.key)}：${DD.data.upgradeDefs[reward.key].getDesc(X.lv(reward.key))}`};
  if(reward.type==='equipment')return{name:X.equipmentDefs[reward.key].name,icon:X.equipmentIcon(reward.key),detail:`Lv${X.gear(reward.key)}：${X.equipmentDefs[reward.key].desc(X.gear(reward.key))}`};
  return{name:DD.data.itemDefs[reward.key].name,icon:UI.itemIcon(reward.key),detail:DD.data.itemDefs[reward.key].desc};
};
R.render=function(){
  const r=R.active;if(!r)return;
  const el=id=>document.getElementById(id),money=R.money;
  const row=(label,value,positive=false)=>`<div${positive?' class="result-reward"':''}><dt>${label}</dt><dd>${value}</dd></div>`;
  el('resultTitle').textContent=`B${r.floor}F おかねの精算`;
  el('resultSpeech').textContent=r.complete?'全部掘って、報酬も全部いただき！':r.rate>=75?'ふふん、よく働いたじゃない。お代はいただくわ！':r.rate>=25?'まずまずね。もっと稼いでもよかったのに！':'もう帰るの？ 次はもっと稼ぎなさいよね。';
  el('resultPortrait').classList.toggle('is-bored',r.rate<25);
  el('resultStats').innerHTML=row('踏破時間',UI.formatTime(r.time))+row('開拓した安全マス',`${r.opened} / ${r.total} マス`)+row('開拓率',`${r.rate.toFixed(1)}％`)+row('撃破した敵',`${r.kills} 体`)+row('探索で獲得したスコア',`＋${money(r.earned)}`)+row('銭投げの消費',`−${money(r.coinSpent)}`)+row('開拓ボーナス',`＋${money(r.exploreBonus)}`,true)+row('マインスイーパー完全クリア報酬',`＋${money(r.clearReward)}`,true);
  el('resultBalance').textContent=money(S.score);
  el('resultLifetime').textContent=`累計獲得：${money(S.totalScoreEarned)}　／　今回のガチャ消費：${money(r.gachaSpent)}`;
  el('resultGacha').textContent=`ボーナスガチャ　${money(R.cost())} スコア`;
  el('resultGacha').disabled=R.busy||S.score+1e-8<R.cost()||!R.pools().length;
  if(el('resultGacha').disabled&&document.activeElement===el('resultGacha'))el('resultNext').focus({preventScroll:true});
  el('resultGachaHint').textContent=S.score+1e-8<R.cost()?'スコアが足りないわ。次の階で稼ぎなさい！':'消費アイテム・LvUpボーナス・装備を同じ確率で抽選。引くたびに＋100。';
  el('resultNext').textContent=`B${r.nextFloor}Fへ進む`;
  const reward=el('resultDrawReward');
  if(r.lastReward){const info=R.rewardInfo(r.lastReward);reward.innerHTML=`<img src="${info.icon}" width="48" height="48" alt=""><div><strong>${info.name} を獲得！</strong><p>${info.detail}</p></div>`;reward.hidden=false;}else{reward.innerHTML='';reward.hidden=true;}
};
const bind=UI.bindDom;
UI.bindDom=function(){
  bind.call(this);
  const layer=document.createElement('div');layer.id='floorResult';layer.hidden=true;
  layer.innerHTML='<section class="result-card" role="dialog" aria-modal="true" aria-labelledby="resultTitle"><h1 id="resultTitle"></h1><div class="result-character"><div id="resultPortrait" aria-hidden="true"></div><p id="resultSpeech"></p></div><dl id="resultStats"></dl><div class="result-wallet">現在の所持スコア <strong id="resultBalance"></strong></div><p id="resultLifetime"></p><button id="resultGacha" type="button"></button><p id="resultGachaHint"></p><div id="resultDrawReward" aria-live="polite" hidden></div><button id="resultNext" type="button"></button></section>';
  document.getElementById('boardWrap').append(layer);
  document.getElementById('resultGacha').addEventListener('click',()=>R.draw());
  document.getElementById('resultNext').addEventListener('click',()=>R.depart());
  layer.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();}
    if(e.key==='Tab'){
      const buttons=[...layer.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
};
})();
