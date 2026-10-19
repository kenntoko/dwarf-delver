(() => {
const S=DD.state,R=DD.render;
const B=DD.batAnimation={image:null,phases:new WeakMap(),nextPhase:0};
B.frameFor=function(enemy){
  const attackAge=enemy.attackAnimTimer??999;
  if(attackAge>=0&&attackAge<.4)return 4+Math.min(3,Math.floor((attackAge+1e-8)/.1));
  if(!this.phases.has(enemy))this.phases.set(enemy,this.nextPhase++%4);
  return (Math.floor(((S.runTime||0)+1e-8)/.14)+this.phases.get(enemy))%4;
};
const load=DD.assets.load;
DD.assets.load=function(){
  const extra=new Promise(resolve=>{const image=new Image();image.onload=image.onerror=resolve;image.src='./assets/expansion/bat-animation-v1.png';B.image=image;});
  return Promise.all([load.call(this),extra]);
};
// Use the existing enemy draw path so health bars, red hit flashes and ordering remain intact.
let bats=null,index=0;
const drawEnemies=R.drawEnemies,drawImage=R.drawImageOrFallback;
R.drawEnemies=function(){
  const previous=bats,previousIndex=index;bats=S.enemies.filter(e=>e.type==='bat');index=0;
  try{return drawEnemies.call(this);}finally{bats=previous;index=previousIndex;}
};
R.drawImageOrFallback=function(name,fallback,x,y,w,h){
  if(name==='bat'&&bats){const enemy=bats[index++],image=B.image;
    if(enemy&&image?.complete&&image.naturalWidth>=256){const c=S.ctx;c.save();c.imageSmoothingEnabled=false;c.drawImage(image,B.frameFor(enemy)*32,0,32,32,Math.round(x),Math.round(y),w,h);c.restore();return;}
  }
  return drawImage.call(this,name,fallback,x,y,w,h);
};
})();
