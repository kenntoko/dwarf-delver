(() => {
  const S = DD.state, X = DD.expansion, UI = DD.ui;
  const KEY = 'dwarf-delver:perks:v1';
  const defs = [
    {key:'life',name:'ライフ増加',max:3,detail:lv=>`危険岩盤ライフ ＋${lv}（初期3 → ${3+lv}）`},
    {key:'hp',name:'HP上昇',max:5,detail:lv=>`初期HP ＋${20*lv}（初期100 → ${100+20*lv}）`},
    {key:'attack',name:'攻撃力上昇',max:5,detail:lv=>`すべての攻撃力 ＋${20*lv}%`},
    {key:'defense',name:'防御力上昇',max:5,detail:lv=>`敵から受けるダメージ −${20*lv}%`},
    {key:'regen',name:'常時回復',max:5,detail:lv=>lv?`${10-lv}秒ごとに最大HPの5%回復`:'未取得（Lv1：9秒ごとに最大HPの5%回復）'},
    {key:'summon',name:'奴隷調達（恒常）',max:3,detail:lv=>`奴隷調達の初期Lv ${1+lv}`},
    {key:'gold',name:'金の亡者',max:5,detail:lv=>`獲得スコア ＋${20*lv}%`}
  ];
  const blank=()=>({level:1,xp:0,levels:Object.fromEntries(defs.map(d=>[d.key,0]))});
  let storageAvailable=true;
  let profile=blank();
  try {
    const raw=localStorage.getItem(KEY);
    if(raw){
      const saved=JSON.parse(raw);
      if(saved&&typeof saved==='object'){
        profile.level=Number.isSafeInteger(saved.level)&&saved.level>=1&&saved.level<=1000?saved.level:1;
        profile.xp=Number.isFinite(saved.xp)&&saved.xp>=0?saved.xp:0;
        for(const d of defs){
          const lv=saved.levels?.[d.key];
          profile.levels[d.key]=Number.isInteger(lv)?Math.max(0,Math.min(d.max,lv)):0;
        }
      }
    }
  } catch (_) { storageAvailable=false; }
  const P=DD.perks={defs,profile,storageKey:KEY,result:null};
  P.cost=key=>Math.max(1,(profile.levels[key]||0)+1);
  P.required=level=>1000*Math.pow(3,level-1);
  P.spent=()=>defs.reduce((sum,d)=>{const n=profile.levels[d.key];return sum+n*(n+1)/2;},0);
  P.points=()=>Math.max(0,profile.level*3-P.spent());
  P.save=()=>{
    try{localStorage.setItem(KEY,JSON.stringify(profile));storageAvailable=true;return true;}
    catch(_){storageAvailable=false;return false;}
  };
  P.credit=score=>{
    const gain=Math.max(0,Number(score)||0);
    const previous=profile.level;
    profile.xp+=gain;
    while(profile.level<1000&&profile.xp+1e-8>=P.required(profile.level)){
      profile.xp-=P.required(profile.level);
      profile.level++;
    }
    P.save();
    return {gain,previous,level:profile.level,earnedPoints:(profile.level-previous)*3};
  };
  P.change=(key,direction)=>{
    const def=defs.find(d=>d.key===key);if(!def)return false;
    const current=profile.levels[key];
    if(direction>0){if(current>=def.max||P.points()<current+1)return false;profile.levels[key]++;}
    else {if(current<=0)return false;profile.levels[key]--;}
    P.save();P.render();return true;
  };
  P.render=()=>{
    const title=document.getElementById('perkProgress');if(!title)return;
    const next=P.required(profile.level);
    title.textContent=`特典Lv.${profile.level}　特典EXP ${Math.floor(profile.xp)} / ${next}　次のLvまで ${Math.max(0,Math.ceil(next-profile.xp))}`;
    document.getElementById('perkPoints').textContent=`所持特典ポイント：${P.points()}`;
    document.getElementById('perkList').innerHTML=defs.map(d=>{
      const lv=profile.levels[d.key],cost=lv+1,canBuy=lv<d.max&&P.points()>=cost;
      return `<div class="perk-row" data-perk="${d.key}" tabindex="0" role="button" aria-label="${d.name} 現在Lv${lv}、${d.detail(lv)}。左クリックで強化、右クリックで払い戻し">
        <div class="perk-row-top"><strong>${d.name}</strong><span>現在Lv.${lv} / ${d.max}</span><span class="perk-cost">${lv>=d.max?'最大Lv':`次の強化 ${cost}P`}</span></div>
        <p>${d.detail(lv)}</p><div class="perk-actions"><button type="button" data-direction="1" ${canBuy?'':'disabled'}>強化</button><button type="button" data-direction="-1" ${lv?'':'disabled'}>払い戻し</button></div>
      </div>`;
    }).join('');
    const note=document.getElementById('perkSaveNote');note.hidden=storageAvailable;
    if(!storageAvailable)note.textContent='このブラウザでは保存できません。ブラウザの保存設定を確認してください。';
  };
  const perkScreen=document.getElementById('perkScreen');
  document.getElementById('titlePerksButton').addEventListener('click',()=>{P.render();perkScreen.hidden=false;document.getElementById('perkBack').focus({preventScroll:true});});
  document.getElementById('perkBack').addEventListener('click',()=>{perkScreen.hidden=true;document.getElementById('startGameButton').focus({preventScroll:true});});
  const perkList=document.getElementById('perkList');
  perkList.addEventListener('click',e=>{
    const row=e.target.closest('[data-perk]');if(!row)return;
    const button=e.target.closest('[data-direction]');P.change(row.dataset.perk,button?Number(button.dataset.direction):1);
  });
  perkList.addEventListener('contextmenu',e=>{const row=e.target.closest('[data-perk]');if(!row)return;e.preventDefault();P.change(row.dataset.perk,-1);});
  perkList.addEventListener('keydown',e=>{if(e.target.closest('button'))return;const row=e.target.closest('[data-perk]');if(!row)return;
    if(e.key==='Enter'||e.key===' '){e.preventDefault();P.change(row.dataset.perk,1);}
  });
  // Apply owned bonuses once to the new run. Run-time level-up bonuses remain separate.
  S.maxRockLives=3+profile.levels.life;
  S.rockLives=S.maxRockLives;
  S.player.maxHp=100+20*profile.levels.hp;
  S.player.hp=S.player.maxHp;
  S.player.upgrades.summon=1+profile.levels.summon;
  S.perkHealTimer=0;
  const damageScale=X.damageScale;
  X.damageScale=function(){return damageScale.call(this)*(1+.2*profile.levels.attack);};
  const addScore=X.addScore;
  X.addScore=function(raw){return addScore.call(this,raw*(1+.2*profile.levels.gold));};
  const settle=DD.results.settle;
  DD.results.settle=function(){
    const alreadySettled=!!this.record?.settled,result=settle.call(this);
    if(!result||alreadySettled||!profile.levels.gold)return result;
    const boost=.2*profile.levels.gold;
    const extra=(result.exploreBonus+result.clearReward)*boost;
    result.exploreBonus*=1+boost;result.clearReward*=1+boost;
    S.score+=extra;S.totalScoreEarned+=extra;
    return result;
  };
  const applyDamage=DD.systems.applyDamage;
  DD.systems.applyDamage=function(raw){return applyDamage.call(this,Math.max(0,raw)*(1-.2*profile.levels.defense));};
  const update=DD.systems.update;
  DD.systems.update=function(dt){
    const result=update.call(this,dt);
    const lv=profile.levels.regen;
    if(!lv||S.paused||S.mode==='lost'||S.mode==='won')return result;
    S.perkHealTimer+=dt;
    const interval=10-lv;
    while(S.perkHealTimer+1e-8>=interval){
      S.perkHealTimer=Math.max(0,S.perkHealTimer-interval);
      S.player.hp=Math.min(S.player.maxHp,S.player.hp+Math.ceil(S.player.maxHp*.05));
    }
    return result;
  };
  const bind=UI.bindDom;
  UI.bindDom=function(){
    bind.call(this);
    const layer=document.createElement('div');layer.id='gameOverResult';layer.hidden=true;
    layer.innerHTML='<section class="game-over-card" role="dialog" aria-modal="true" aria-labelledby="gameOverTitle"><div class="game-over-receipt"><h1 id="gameOverTitle">GAME OVER</h1><p id="gameOverReason"></p><dl id="gameOverStats"></dl><p id="gameOverSave"></p></div><div class="game-over-character"><p id="gameOverSpeech">うぅ……次はもっと稼ぐんだから……。</p><img src="./assets/hero_gameover_v1.png" width="576" height="384" alt="倒れている主人公"><button id="gameOverTitleButton" type="button">タイトルへ戻る</button></div></section>';
    document.getElementById('boardWrap').append(layer);
    document.getElementById('gameOverTitleButton').addEventListener('click',()=>location.reload());
  };
  const lose=DD.systems.loseRun;
  DD.systems.loseRun=function(reason){
    if(S.mode==='lost'||S.mode==='won')return;
    const floor=S.floor,score=Math.max(0,S.score||0);
    lose.call(this,reason);
    if(S.mode!=='lost')return;
    UI.hideBanner();S.pauseReason='gameover';
    const reward=P.credit(score);
    P.result={floor,score,reason,...reward};
    const row=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
    document.getElementById('gameOverReason').textContent=reason;
    document.getElementById('gameOverStats').innerHTML=
      row('到達階層',`B${floor}F`)+row('今回の所持スコア',DD.results.money(score))+
      row('獲得特典EXP',`＋${DD.results.money(reward.gain)}`)+
      row('特典レベル',`Lv.${reward.previous} → Lv.${reward.level}`)+
      row('獲得特典ポイント',`＋${reward.earnedPoints}`)+
      row('所持特典ポイント',`${P.points()}`);
    document.getElementById('gameOverSave').textContent=storageAvailable?'特典の進行状況をブラウザに保存しました。':'ブラウザへの保存に失敗しました。';
    document.getElementById('gameOverResult').hidden=false;
    document.getElementById('gameOverTitleButton').focus({preventScroll:true});
  };
})();
