(() => {
const S=DD.state,U=DD.utils,C=DD.config;
const V=DD.mapView={zoom:1,x:0,y:0,hand:false};
V.bounds=function(){
  const w=this.viewport.clientWidth,h=this.viewport.clientHeight,s=w/C.CANVAS_W,z=this.zoom,b=C.boardRect;
  const top=document.getElementById('gameHud').getBoundingClientRect().height+4;
  const axis=(start,end,low,high)=>end-start>high-low?{min:high-end,max:low-start}:{min:(low+high-start-end)/2,max:(low+high-start-end)/2};
  const bx=axis(b.x*s*z,(b.x+b.w)*s*z,0,w),by=axis((b.y-118)*s*z,(b.y+b.h+80)*s*z,top,h);
  return {x:bx,y:by,top,h,w};
};
V.apply=function(){
  if(!this.viewport)return;
  const b=this.bounds();
  if(this.zoom===1){this.x=0;this.y=0;}else{this.x=U.clamp(this.x,b.x.min,b.x.max);this.y=U.clamp(this.y,b.y.min,b.y.max);}
  S.canvas.style.transform=`translate(${this.x}px,${this.y}px) scale(${this.zoom})`;
  this.viewport.parentElement?.classList.toggle('is-map-zoomed',this.zoom>1);
  this.arrows.left.hidden=this.zoom===1||this.x>=b.x.max-.5;
  this.arrows.right.hidden=this.zoom===1||this.x<=b.x.min+.5;
  this.arrows.up.hidden=this.zoom===1||this.y>=b.y.max-.5;
  this.arrows.down.hidden=this.zoom===1||this.y<=b.y.min+.5;
  this.nav.style.setProperty('--map-nav-top',b.top+'px');
  document.querySelectorAll('[data-map-zoom]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.mapZoom)===this.zoom)));
};
V.setZoom=function(z,focusPlayer=false){
  const b=this.bounds(),cx=b.w/2,cy=(b.top+b.h)/2,s=b.w/C.CANVAS_W;
  const p=focusPlayer||this.zoom===1?S.playerPos():{x:(cx-this.x)/(s*this.zoom),y:(cy-this.y)/(s*this.zoom)};
  this.zoom=z;this.x=cx-p.x*s*z;this.y=cy-p.y*s*z;this.apply();
};
V.pan=function(dx,dy){this.x+=dx;this.y+=dy;this.apply();};
const bind=DD.ui.bindDom;
DD.ui.bindDom=function(){
  bind.call(this);
  const field=document.getElementById('playfield'),canvas=S.canvas,viewport=document.createElement('div');viewport.id='mapViewport';canvas.before(viewport);viewport.append(canvas);V.viewport=viewport;
  const footer=document.querySelector('.game-footer'),tools=document.createElement('div');tools.className='map-tools';tools.setAttribute('role','group');tools.setAttribute('aria-label','マップ表示');
  tools.innerHTML=[1,2,4].map(z=>`<button type="button" data-map-zoom="${z}" aria-pressed="${z===1}" aria-label="マップ${z}倍">${z}×</button>`).join('')+'<button type="button" id="mapHand" aria-label="画面移動モード" aria-pressed="false"><img src="./assets/expansion/map-hand-v1.png" alt="" width="24" height="24"></button>';
  footer.append(tools);tools.querySelectorAll('[data-map-zoom]').forEach(el=>el.addEventListener('click',()=>V.setZoom(Number(el.dataset.mapZoom))));
  document.getElementById('mapHand').addEventListener('click',e=>{V.hand=!V.hand;e.currentTarget.setAttribute('aria-pressed',String(V.hand));viewport.classList.toggle('is-panning',V.hand);});
  const nav=document.createElement('nav');nav.className='map-pan-arrows';nav.setAttribute('aria-label','マップを移動');V.nav=nav;V.arrows={};
  for(const [key,label,dx,dy]of[['up','上',0,1],['right','右',-1,0],['down','下',0,-1],['left','左',1,0]]){
    const b=document.createElement('button');b.type='button';b.className='map-pan-arrow pan-'+key;b.setAttribute('aria-label',label+'へ画面移動');b.innerHTML='<img src="./assets/expansion/map-arrow-v1.png" alt="">';b.hidden=true;nav.append(b);V.arrows[key]=b;
    let timer=null;const stop=()=>{clearInterval(timer);timer=null;};
    b.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);V.pan(dx*48,dy*48);stop();timer=setInterval(()=>V.pan(dx*24,dy*24),80);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,stop);
    b.addEventListener('click',e=>{if(e.detail===0)V.pan(dx*48,dy*48);});
  }
  field.append(nav);V.apply();new ResizeObserver(()=>V.apply()).observe(viewport);
};
const begin=DD.systems.beginFloor;DD.systems.beginFloor=function(floor){begin.call(this,floor);if(V.viewport)V.setZoom(V.zoom,true);};
const bindInput=DD.main.bindCanvasInput;
DD.main.bindCanvasInput=function(){
  bindInput.call(this);const canvas=S.canvas;let gesture=null,lastTap=null,pendingTap=null,suppressUntil=0;
  const cell=e=>{const r=canvas.getBoundingClientRect();return{x:Math.floor(((e.clientX-r.left)*canvas.width/r.width-C.boardRect.x)/C.TILE),y:Math.floor(((e.clientY-r.top)*canvas.height/r.height-C.boardRect.y)/C.TILE)};};
  const canAct=()=>S.mode!=='lost'&&S.mode!=='won'&&(!S.paused||S.pauseReason==='item'||(S.pauseReason==='bossIntro'&&V.hand));
  const cancel=()=>{if(gesture)clearTimeout(gesture.timer);gesture=null;};
  const tap=(g,e)=>{
    if(!canAct()||S.board!==g.board||!U.inBounds(g.x,g.y))return;
    const t=S.board.grid[g.y][g.x];if(!t.active)return;
    if(S.itemMode){DD.systems.applyItemToCell(S.itemMode,g.x,g.y);return;}
    if(t.isOpen&&t.chest){DD.systems.openChest(g.x,g.y);return;}
    if(t.isOpen){
      const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;
      if(t.number>0){const key=U.key(g.x,g.y),now=performance.now();if(lastTap?.key===key&&now-lastTap.time<320&&lastTap.board===S.board){clearTimeout(pendingTap);pendingTap=null;lastTap=null;DD.systems.chordTile(g.x,g.y);DD.ui.refreshHud();return;}
        clearTimeout(pendingTap);lastTap={key,time:now,board:S.board};const board=S.board;pendingTap=setTimeout(()=>{pendingTap=null;lastTap=null;if(S.board===board)DD.expansion.fireCoins(x,y);},320);
      }else DD.expansion.fireCoins(x,y);return;
    }
    lastTap=null;if(DD.board.validDigTarget(S.board,g.x,g.y,S.mode)){DD.systems.openTile(g.x,g.y);DD.ui.refreshHud();}
  };
  // Keep existing mouse actions; suppress compatibility mouse events after touch.
  for(const type of ['mousedown','dblclick','contextmenu'])canvas.addEventListener(type,e=>{if(V.hand||performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&!V.hand)return;
    e.preventDefault();suppressUntil=performance.now()+900;
    if(gesture){cancel();return;}if(!e.isPrimary||!canAct())return;
    canvas.setPointerCapture(e.pointerId);const c=cell(e);gesture={...c,id:e.pointerId,board:S.board,startX:e.clientX,startY:e.clientY,px:e.clientX,py:e.clientY,hand:V.hand,moved:false,held:false};const g=gesture;
    if(!g.hand&&!S.itemMode&&U.inBounds(c.x,c.y)&&!S.board.grid[c.y][c.x].isOpen)g.timer=setTimeout(()=>{if(gesture!==g||g.moved||!canAct()||S.board!==g.board||S.itemMode)return;g.held=true;lastTap=null;clearTimeout(pendingTap);DD.systems.toggleFlag(g.x,g.y);DD.ui.refreshHud();},450);
  },{passive:false});
  canvas.addEventListener('pointermove',e=>{const g=gesture;if(!g||g.id!==e.pointerId)return;e.preventDefault();if(Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>9){g.moved=true;clearTimeout(g.timer);}if(g.hand)V.pan(e.clientX-g.px,e.clientY-g.py);g.px=e.clientX;g.py=e.clientY;},{passive:false});
  canvas.addEventListener('pointerup',e=>{const g=gesture;if(!g||g.id!==e.pointerId)return;e.preventDefault();suppressUntil=performance.now()+900;clearTimeout(g.timer);gesture=null;if(!g.hand&&!g.moved&&!g.held)tap(g,e);},{passive:false});
  canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
  window.addEventListener('blur',()=>{cancel();clearTimeout(pendingTap);lastTap=null;});
};
})();
