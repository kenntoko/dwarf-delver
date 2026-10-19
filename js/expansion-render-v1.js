(() => {
const X=DD.expansion,S=DD.state,R=DD.render,T=DD.config.TILE;
X.images={};
const originalLoad=DD.assets.load;
DD.assets.load=function(){
  const extra=['devil','golem','maid'].map(key=>new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src='./assets/expansion/'+key+'_sheet.png';X.images[key]=img;}));
  return Promise.all([originalLoad.call(this),...extra]);
};
X.drawSprite=function(key,frame,a,offsetY=0){
  const img=this.images[key];if(!img?.complete||!img.naturalWidth)return;
  // Enlarge companion art while retaining its ground anchor and crisp pixels.
  const size=48,c=S.ctx;c.save();c.imageSmoothingEnabled=false;c.drawImage(img,frame*32,0,32,32,Math.round(a.x-size/2),Math.round(a.y+6-size+offsetY),size,size);c.restore();
};
X.drawCompanions=function(){
  // Integer-pixel key positions only: no interpolation or sprite stretching.
  for(const a of S.devils||[]){const attacking=a.attackAge<.35,hover=[0,-1,-2,-1][Math.floor((a.age+a.variant*.3)/.3)%4];this.drawSprite('devil',a.variant+(attacking?3:0),a,hover);}
  if(S.guard){const a=S.guard,attacking=a.attackAge<.3;this.drawSprite('golem',attacking?3:0,a,attacking?0:[0,-1,-1,0][Math.floor(a.age/.45)%4]);}
  if(S.maid){const lv=this.lv('maid'),sequences=[[0,1,0,1],[0,1,2,1],[0,2,1,3],[0,1,2,3],[0,2,1,3]],frame=sequences[lv-1][Math.floor(S.maid.age/(.29-lv*.035))%4];this.drawSprite('maid',frame,S.maid);}
};
X.drawArea=function(){
  const ctx=S.ctx,p=S.playerPos();
  if(this.lv('perfume')){
    const radius=this.stat('perfume')[0]*T,phase=Math.floor((S.runTime||0)/.2)%4;
    ctx.save();ctx.globalAlpha=.10;ctx.fillStyle='#d7b9ef';ctx.beginPath();ctx.arc(Math.round(p.x),Math.round(p.y),radius,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.30;ctx.fillStyle='#edd8ff';
    for(let i=0;i<28;i++){const angle=Math.PI*2*i/28,x=Math.round(p.x+Math.cos(angle)*radius),y=Math.round(p.y+Math.sin(angle)*radius);ctx.fillRect(x-1,y-1,3,3);}
    ctx.globalAlpha=.18;for(let i=0;i<8;i++){const angle=Math.PI*2*(i+phase/4)/8;ctx.fillRect(Math.round(p.x+Math.cos(angle)*radius*.65)-3,Math.round(p.y+Math.sin(angle)*radius*.65)-2,6,4);}ctx.restore();
  }
  const chest=DD.assets.get('treasure_chest_closed');
  for(const d of S.decoys||[]){if(d.hp<=0)continue;ctx.save();ctx.imageSmoothingEnabled=false;
    if(chest?.complete&&chest.naturalWidth)ctx.drawImage(chest,Math.round(d.x-15),Math.round(d.y-15),30,30);
    else{ctx.fillStyle='#9b7741';ctx.fillRect(d.x-12,d.y-10,24,20);}
    ctx.strokeStyle='#83dcee';ctx.lineWidth=2;ctx.strokeRect(Math.round(d.x-16),Math.round(d.y-16),32,32);
    ctx.fillStyle='#f8d561';ctx.fillRect(d.x+8,d.y-15,5,5);ctx.fillStyle='#182035';ctx.fillRect(d.x-13,d.y+16,26,3);ctx.fillStyle='#83dcee';ctx.fillRect(d.x-13,d.y+16,26*Math.max(0,d.hp/d.maxHp),3);ctx.restore();
  }
};
const boardDraw=R.drawBoard;R.drawBoard=function(){boardDraw.call(this);X.drawArea();};
const playerDraw=R.drawPlayerAndDwarves;R.drawPlayerAndDwarves=function(){playerDraw.call(this);X.drawCompanions();};
const magicDraw=R.drawProjectiles;
R.drawProjectiles=function(){
  const all=S.projectiles;
  // Reuse the approved white/cyan magic animation for dwarf shots only.
  S.projectiles=all.filter(p=>p.kind==='magic');
  try{magicDraw.call(this);}finally{S.projectiles=all;}
  const ctx=S.ctx;
  for(const p of all){if(p.kind==='magic')continue;const x=Math.round(p.x),y=Math.round(p.y);ctx.save();
    if(p.kind==='coin'){
      const frame=Math.floor(p.age/.08)%4,w=frame%2?3:7;
      ctx.fillStyle='#624529';ctx.fillRect(x-Math.floor(w/2)-1,y-5,w+2,10);ctx.fillStyle='#f5c94f';ctx.fillRect(x-Math.floor(w/2),y-4,w,8);ctx.fillStyle='#fff1c3';ctx.fillRect(x-Math.floor(w/2),y-3,1,6);
    }else{
      const frame=Math.floor(p.age/.1)%2;ctx.fillStyle='#da4a26';ctx.fillRect(x-4,y-4,8,8);ctx.fillRect(x-2,y-6-frame*2,4,5);ctx.fillStyle='#ffad37';ctx.fillRect(x-3,y-2,6,6);ctx.fillStyle='#fff0b1';ctx.fillRect(x-1,y,3,3);
    }ctx.restore();
  }
};
})();
