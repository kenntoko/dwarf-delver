(() => {
const S=DD.state,UI=DD.ui;
DD.config.bossWindowSeconds=30;
DD.bossHud={status(){
  const tiles=S.board.grid.flat().filter(t=>t.active);
  const score=S.bossWindowScore||0;
  const need=Math.min(DD.config.bossThresholdBase,score+DD.board.bossRemainingPotential(S.board));
  return {score,need,left:Math.max(0,need-score),seconds:Math.max(0,Math.ceil(S.bossAttackTimer)),
    bombs:tiles.filter(t=>t.isDanger||t.wasDanger).length,
    signs:tiles.filter(t=>t.flagged).length,
    safe:tiles.filter(t=>!t.isDanger&&!t.isOpen).length};
}};
const bind=UI.bindDom;
UI.bindDom=function(){
  bind.call(this);
  const panel=document.createElement('section');panel.id='bossHud';panel.hidden=true;panel.setAttribute('aria-label','ゴーレム戦の目的と攻撃予告');
  panel.innerHTML='<p class="boss-objective">目的：安全なマスをすべて開けてゴーレムを倒そう</p><p class="boss-help">数字×10ポイントをためて攻撃を阻止</p><div class="boss-facts"><span id="bossMines"></span><span id="bossSafe"></span></div><div class="boss-break-heading"><span id="bossBreakText"></span><span id="bossAttackText"></span></div><div id="bossBreakGauge" role="progressbar" aria-label="攻撃阻止のブレイクゲージ"><div id="bossBreakFill"></div><span id="bossBreakValue"></span></div>';
  document.getElementById('gameHud').append(panel);
  const edge=document.createElement('div');edge.id='bossDangerEdge';edge.setAttribute('aria-hidden','true');document.getElementById('playfield').append(edge);
  document.getElementById('boardWrap').addEventListener('animationend',e=>{if(e.animationName==='boss-impact')e.currentTarget.classList.remove('boss-impact');});
};
UI.bossImpact=function(){const wrap=document.getElementById('boardWrap');wrap.classList.remove('boss-impact');void wrap.offsetWidth;wrap.classList.add('boss-impact');};
const begin=DD.systems.beginFloor;
DD.systems.beginFloor=function(floor){
  const boss=floor>3;
  DD.config.boardRect.y=boss?560:360;
  DD.config.CANVAS_H=boss?1300:1100;
  if(S.canvas)S.canvas.height=DD.config.CANVAS_H;
  const viewport=document.getElementById('mapViewport');if(viewport)viewport.style.aspectRatio=`1200/${DD.config.CANVAS_H}`;
  document.getElementById('app').classList.toggle('is-boss',boss);
  return begin.call(this,floor);
};
const refresh=UI.refreshHud;
UI.refreshHud=function(){
  refresh.call(this);
  const panel=document.getElementById('bossHud');if(!panel)return;
  panel.hidden=S.mode!=='boss';
  const edge=document.getElementById('bossDangerEdge');
  if(panel.hidden){if(edge)edge.style.opacity='0';return;}
  const s=DD.bossHud.status(),el=id=>document.getElementById(id);
  if(edge)edge.style.opacity=s.left===0?'0':String(Math.min(0.85,Math.max(0,1-S.bossAttackTimer/DD.config.bossWindowSeconds)**2*0.85));
  el('bossMines').textContent=`爆弾：${s.bombs}個 ／ 看板：${s.signs}個`;
  el('bossSafe').textContent=`勝利まであと${s.safe}マス`;
  el('bossAttackText').textContent=`攻撃判定まで ${s.seconds}秒`;
  el('bossBreakText').textContent=s.left>0?`攻撃阻止まであと${s.left}ポイント`:'BREAK成功！ 次の攻撃を阻止';
  el('bossBreakValue').textContent=`BREAK ${s.score} / ${s.need}`;
  el('bossBreakFill').style.width=`${s.need?Math.min(100,s.score/s.need*100):100}%`;
  el('bossBreakGauge').classList.toggle('is-ready',s.left===0);
  el('bossBreakGauge').setAttribute('aria-valuemin','0');
  el('bossBreakGauge').setAttribute('aria-valuemax',String(Math.max(1,s.need)));
  el('bossBreakGauge').setAttribute('aria-valuenow',String(Math.min(s.score,Math.max(1,s.need))));
  el('bossBreakGauge').setAttribute('aria-valuetext',`あと${s.left}ポイント、攻撃判定まで${s.seconds}秒。数字×10ポイントで加算`);
};
})();
