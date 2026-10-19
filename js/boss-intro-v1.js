(() => {
const S=DD.state,UI=DD.ui;
const bind=UI.bindDom;
UI.bindDom=function(){
  bind.call(this);
  const panel=document.createElement('section');panel.id='bossIntro';panel.hidden=true;
  panel.setAttribute('aria-label','ボス戦の開始案内');
  panel.innerHTML='<div><p>安全なマスをすべて開けて<br>ゴーレムを倒せ</p><span>好きなマスをクリックして開始</span></div>';
  document.getElementById('playfield').append(panel);
};
const begin=DD.systems.beginFloor;
DD.systems.beginFloor=function(floor){
  S.bossAwaitingStart=false;
  if(S.pauseReason==='bossIntro'){S.paused=false;S.pauseReason='';}
  const result=begin.call(this,floor),boss=S.mode==='boss';
  if(boss){S.bossAwaitingStart=true;S.paused=true;S.pauseReason='bossIntro';S.board.bossOverlayAlpha=.65;}
  const panel=document.getElementById('bossIntro');if(panel)panel.hidden=!boss;
  UI.refreshHud();return result;
};
DD.bossIntro={start(x,y){
  if(!S.bossAwaitingStart||S.mode!=='boss'||!DD.utils.inBounds(x,y))return false;
  const t=S.board.grid[y][x];if(!t.active||t.isOpen||t.flagged)return false;
  S.bossAwaitingStart=false;S.paused=false;S.pauseReason='';S.lastTimeStamp=0;
  document.getElementById('bossIntro').hidden=true;
  DD.systems.openTile(x,y);UI.refreshHud();return true;
}};
const input=DD.main.bindCanvasInput;
DD.main.bindCanvasInput=function(){
  input.call(this);
  const canvas=S.canvas;let press=null,suppressUntil=0;
  const hand=()=>!!DD.mapView?.hand;
  canvas.addEventListener('pointerdown',e=>{
    if(!S.bossAwaitingStart||hand()||e.button!==0||!e.isPrimary)return;
    e.preventDefault();e.stopImmediatePropagation();
    press={id:e.pointerId,x:e.clientX,y:e.clientY,board:S.board};canvas.setPointerCapture(e.pointerId);
  },true);
  canvas.addEventListener('pointerup',e=>{
    const p=press;if(!p||p.id!==e.pointerId)return;press=null;
    e.preventDefault();e.stopImmediatePropagation();suppressUntil=performance.now()+700;
    if(S.board!==p.board||hand()||p.moved||Math.hypot(e.clientX-p.x,e.clientY-p.y)>9)return;
    const r=canvas.getBoundingClientRect(),b=DD.config.boardRect,T=DD.config.TILE;
    const x=Math.floor(((p.x-r.left)*canvas.width/r.width-b.x)/T),y=Math.floor(((p.y-r.top)*canvas.height/r.height-b.y)/T);
    DD.bossIntro.start(x,y);
  },true);
  canvas.addEventListener('pointermove',e=>{if(press?.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>9)press.moved=true;},true);
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{press=null;},true);
  for(const type of ['mousedown','dblclick','contextmenu'])canvas.addEventListener(type,e=>{
    if(!hand()&&(S.bossAwaitingStart||performance.now()<suppressUntil)){e.preventDefault();e.stopImmediatePropagation();}
  },true);
};
})();
