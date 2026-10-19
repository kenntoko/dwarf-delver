(() => {
const S=DD.state,R=DD.render;
const G=DD.goblinAnimation={image:null,phases:new WeakMap(),facings:new WeakMap(),nextPhase:0};
G.frameFor=function(enemy){
  if(enemy.breakingSign)return 4+Math.min(3,Math.floor((((enemy.breakTimer||0)%.64)+1e-8)/.16));
  const age=enemy.attackAnimTimer??999;
  if(age>=0&&age<.48)return 4+Math.min(3,Math.floor((age+1e-8)/.12));
  if(!this.phases.has(enemy))this.phases.set(enemy,this.nextPhase++%4);
  return (Math.floor(((S.runTime||0)+1e-8)/.26)+this.phases.get(enemy))%4;
};
const load=DD.assets.load;
DD.assets.load=function(){
  const extra=new Promise(resolve=>{const image=new Image();image.onload=image.onerror=resolve;image.src='./assets/expansion/goblin-native32-v1.png';G.image=image;});
  return Promise.all([load.call(this),extra]);
};
// Keep the existing draw ordering, damage flash and health bar code.
let goblins=null,index=0;
const drawEnemies=R.drawEnemies,drawImage=R.drawImageOrFallback;
R.drawEnemies=function(){
  const previous=goblins,previousIndex=index;goblins=S.enemies.filter(e=>e.type==='goblin');index=0;
  try{return drawEnemies.call(this);}finally{goblins=previous;index=previousIndex;}
};
R.drawImageOrFallback=function(name,fallback,x,y,w,h){
  if(name==='goblin'&&goblins){const enemy=goblins[index++],image=G.image;
    if(enemy&&image?.complete&&image.naturalWidth>=256){
      const target=enemy.decoyTarget?.hp>0?enemy.decoyTarget:enemy.targetFlag?DD.utils.tileCenter(enemy.targetFlag.x,enemy.targetFlag.y):S.playerPos(),dx=target.x-enemy.x;
      if(Math.abs(dx)>2)G.facings.set(enemy,dx<0);
      const c=S.ctx,frame=G.frameFor(enemy);c.save();c.imageSmoothingEnabled=false;
      if(G.facings.get(enemy)){c.translate(Math.round(x)+w,Math.round(y));c.scale(-1,1);c.drawImage(image,frame*32,0,32,32,0,0,w,h);}
      else c.drawImage(image,frame*32,0,32,32,Math.round(x),Math.round(y),w,h);
      c.restore();return;
    }
  }
  return drawImage.call(this,name,fallback,x,y,w,h);
};
})();
