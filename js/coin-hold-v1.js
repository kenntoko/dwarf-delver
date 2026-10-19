(() => {
const S=DD.state,X=DD.expansion;
const C=DD.coinHold={keyboard:false,mouse:null,touch:null,elapsed:Infinity,spaceCaptured:false};
C.interval=(lv=X.lv('coin'))=>Number((3-.3*(Math.max(1,Math.min(5,lv))-1)).toFixed(1));
C.playing=()=>!!S.canvas&&!S.paused&&!S.itemMode&&(S.mode==='dungeon'||S.mode==='boss');
C.stop=function(){this.keyboard=false;this.touch=null;};
C.beginTouch=function(g){if(this.playing()){this.touch={id:g.id,x:g.startX,y:g.startY};this.tryFire();}};
C.endTouch=function(id){if(id==null||this.touch?.id===id)this.touch=null;};
C.tryFire=function(){
  if(!this.playing()||(!this.keyboard&&!this.touch)||this.elapsed+1e-8<this.interval())return 0;
  const aim=this.touch||this.mouse;if(!aim)return 0;
  const canvas=S.canvas,r=canvas.getBoundingClientRect();
  const viewport=document.getElementById('mapViewport')?.getBoundingClientRect()||r;
  if(aim.x<viewport.left||aim.y<viewport.top||aim.x>=viewport.left+viewport.width||aim.y>=viewport.top+viewport.height)return 0;
  const count=X.fireCoins((aim.x-r.left)*canvas.width/r.width,(aim.y-r.top)*canvas.height/r.height);
  if(count>0)this.elapsed=0;return count;
};
const description=X.skillDescription;
X.skillDescription=function(key,lv){
  if(key!=='coin')return description.call(this,key,lv);
  const n=Math.max(1,Math.min(5,lv)),t=this.stat('coin',n);
  return `Lv${n}：${t[0]}枚／${C.interval(n)}秒／反射${t[1]}回／貫通${t[2]}回。1枚1スコア、威力5。`;
};
const input=DD.main.bindCanvasInput;
DD.main.bindCanvasInput=function(){
  input.call(this);
  S.canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')C.mouse={x:e.clientX,y:e.clientY};});
  S.canvas.addEventListener('pointerleave',()=>{C.mouse=null;C.keyboard=false;});
  window.addEventListener('keydown',e=>{
    if(e.code!=='Space'&&e.key!==' ')return;
    if(C.spaceCaptured&&e.repeat){e.preventDefault();return;}
    if(!C.playing())return;
    e.preventDefault();if(e.repeat)return;C.spaceCaptured=true;C.keyboard=true;C.tryFire();
  },true);
  window.addEventListener('keyup',e=>{if(e.code==='Space'||e.key===' '){if(C.spaceCaptured)e.preventDefault();C.spaceCaptured=false;C.keyboard=false;}},true);
  window.addEventListener('blur',()=>{C.stop();C.mouse=null;C.spaceCaptured=false;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){C.stop();C.mouse=null;C.spaceCaptured=false;}});
};
const update=DD.systems.update;
DD.systems.update=function(dt){
  const result=update.call(this,dt);
  if(!C.playing()){C.stop();return result;}
  C.elapsed+=dt;C.tryFire();return result;
};
const begin=DD.systems.beginFloor;
DD.systems.beginFloor=function(floor){C.stop();C.mouse=null;C.elapsed=Infinity;return begin.call(this,floor);};
})();
