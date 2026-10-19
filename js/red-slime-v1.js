(() => {
const S=DD.state,X=DD.expansion;
DD.data.enemyDefs.redSlime={...DD.data.enemyDefs.slime,name:'赤スライム',hp:100,damage:10};
const R=DD.redSlime={chance:0.05,sheet:null};
const begin=DD.systems.beginFloor;
DD.systems.beginFloor=function(floor){R.chance=0.05;return begin.call(this,floor);};
DD.systems.chooseSpawnEnemyType=function(pool){
  if(S.floorTimer>=180&&Math.random()<R.chance)return 'redSlime';
  return DD.utils.choice(pool);
};
const spawn=DD.systems.spawnEnemy;
DD.systems.spawnEnemy=function(){
  const before=S.enemies.length;spawn.call(this);
  if(S.floorTimer>=180&&S.enemies.length>before){
    R.chance=S.enemies[S.enemies.length-1].type==='redSlime'?0.05:Math.min(1,R.chance+0.002);
  }
};
R.spawnAt=function(type,x,y){
  const c=X.cell(x,y),e={type,hp:DD.data.enemyDefs[type].hp,x,y,tileX:c.x,tileY:c.y,targetFlag:null,attackTimer:0,breakTimer:0,breakingSign:false,alive:true,path:[],repath:0,attackAnimTimer:999};
  S.enemies.push(e);return e;
};
const hit=X.hit;
X.hit=function(e,raw){
  const alive=e?.alive,result=hit.call(this,e,raw);
  if(alive&&!e.alive&&e.type==='redSlime'&&!e.didSplit){
    e.didSplit=true;
    for(let i=0;i<5;i++)R.spawnAt('slime',e.x,e.y);
    DD.systems.addLog('赤スライムからスライム5体が出現！');
  }
  return result;
};
// Palette swap the existing authored frames, retaining their exact pixel grid.
R.getSheet=function(){
  if(this.sheet)return this.sheet;
  const source=DD.assets.get('slime_sheet');if(!source?.complete||!source.naturalWidth)return null;
  const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
  const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];if(g>r*1.15&&g>b*1.2){pixels.data[i]=g;pixels.data[i+1]=Math.round(r*.65);pixels.data[i+2]=Math.max(b,Math.round(g*.18));}}
  ctx.putImageData(pixels,0,0);this.sheet=canvas;return canvas;
};
})();
