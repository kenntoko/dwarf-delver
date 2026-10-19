(() => {
const X=DD.expansion,S=DD.state,R=DD.render,T=DD.config.TILE;
X.images={};
const originalLoad=DD.assets.load;
DD.assets.load=function(){
  const extra=['devil','golem','maid','reinforce-frame'].map(key=>new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=key==='reinforce-frame'?'./assets/expansion/reinforce-frame-v1.png':'./assets/expansion/'+key+'_sheet.png';X.images[key]=img;}));
  return Promise.all([originalLoad.call(this),...extra]);
};
X.drawSprite=function(key,frame,a,offsetY=0,flip=false){
  const img=this.images[key];if(!img?.complete||!img.naturalWidth)return;
  // Enlarge companion art while retaining its ground anchor and crisp pixels.
  const size=48,c=S.ctx,left=Math.round(a.x-size/2),top=Math.round(a.y+6-size+offsetY);c.save();c.imageSmoothingEnabled=false;
  if(flip){c.translate(left+size,top);c.scale(-1,1);c.drawImage(img,frame*32,0,32,32,0,0,size,size);}
  else c.drawImage(img,frame*32,0,32,32,left,top,size,size);c.restore();
};
X.drawCompanions=function(){
  // Integer-pixel key positions only: no interpolation or sprite stretching.
  for(const a of S.devils||[]){const attacking=a.attackAge<.35,hover=[0,-1,-2,-1][Math.floor((a.age+a.variant*.3)/.3)%4];this.drawSprite('devil',a.variant+(attacking?3:0),a,hover);}
  if(S.guard){const a=S.guard,attacking=a.attackAge<.3;this.drawSprite('golem',attacking?3:0,a,attacking?0:[0,-1,-1,0][Math.floor(a.age/.45)%4]);}
  if(S.maid){const lv=this.lv('maid'),sequences=[[0,1,0,1],[0,1,2,1],[0,2,1,3],[0,1,2,3],[0,2,1,3]],frame=sequences[lv-1][Math.floor(S.maid.age/(.29-lv*.035))%4];
    // Frames 0–2 face left; frame 3 faces right. Keep every fan pose aimed at the hero.
    const heroOnRight=S.playerPos().x>=S.maid.x;this.drawSprite('maid',frame,S.maid,0,heroOnRight!==(frame===3));}
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
const boardDraw=R.drawBoard;R.drawBoard=function(){boardDraw.call(this);
  const image=X.images['reinforce-frame'],ctx=S.ctx;
  if(image?.complete&&image.naturalWidth){ctx.save();ctx.imageSmoothingEnabled=false;
    for(let y=0;y<DD.config.H;y++)for(let x=0;x<DD.config.W;x++){const tile=S.board.grid[y][x];if(tile.active&&tile.isOpen&&tile.reinforced)ctx.drawImage(image,DD.config.boardRect.x+x*T,DD.config.boardRect.y+y*T,T,T);}
    ctx.restore();}
  X.drawArea();};
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
      // Four hand-set pixel flame poses, with square embers along the flight path.
      const frame=Math.floor(p.age/.09)%4,tip=[-3,1,-1,3][frame];
      for(let i=0;i<3;i++){const back=(i+1)*7,side=[-2,2,0][(i+frame)%3];ctx.fillStyle=i===0?'#f47b27':'#a94020';ctx.fillRect(Math.round(x-p.vx*back-p.vy*side)-2,Math.round(y-p.vy*back+p.vx*side)-2,i===0?4:2,i===0?4:2);}
      ctx.fillStyle='#863020';ctx.fillRect(x-8,y-8,16,18);ctx.fillRect(x-10,y-4,20,10);
      ctx.fillStyle='#e84b20';ctx.fillRect(x-8,y-6,16,14);ctx.fillRect(x-6,y-10,12,6);ctx.fillRect(x+tip-2,y-16,4,10);ctx.fillRect(x-8,y-12+(frame%2)*2,4,8);ctx.fillRect(x+6,y-10-(frame%2)*2,4,8);
      ctx.fillStyle='#ff9b2f';ctx.fillRect(x-6,y-4,12,12);ctx.fillRect(x-4+tip,y-10,4,10);
      ctx.fillStyle='#ffe478';ctx.fillRect(x-4,y,8,6);ctx.fillRect(x-2+(frame%2)*2,y-4,4,8);
      ctx.fillStyle='#fff5cd';ctx.fillRect(x-2,y+2,4,4);
    }ctx.restore();
  }
};
})();
