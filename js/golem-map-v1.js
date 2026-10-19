(() => {
const S=DD.state,R=DD.render,G=DD.golemMap={body:null,floor:null,tiles:new Map()};
const load=DD.assets.load;
DD.assets.load=function(){
  const extra=['body','floor'].map(key=>new Promise(resolve=>{
    const img=new Image();img.onload=img.onerror=resolve;
    img.src=key==='body'?'./assets/expansion/golem-map-v1.png':'./assets/expansion/golem-floor-v1.png';G[key]=img;
  }));
  return Promise.all([load.call(this),...extra]);
};
const get=DD.assets.get;
DD.assets.get=function(name){
  if(S.board?.kind==='boss'&&name==='cave_autotile_32'&&G.floor?.complete&&G.floor.naturalWidth===128)return G.floor;
  return get.call(this,name);
};
const rockCell=R.drawRockCell;
R.drawRockCell=function(rock,atlas,x,y,px,py,size){
  if(S.board?.kind==='boss'&&G.body?.complete&&G.body.naturalWidth===960){
    const key=x+','+y;
    if(!G.tiles.has(key)){
      const tile=document.createElement('canvas');tile.width=tile.height=32;
      tile.getContext('2d').drawImage(G.body,x*32,y*32,32,32,0,0,32,32);G.tiles.set(key,tile);
    }
    // Reuse the exact same inward jagged fracture clipping as normal rock.
    return rockCell.call(this,G.tiles.get(key),atlas,x,y,px,py,size);
  }
  return rockCell.call(this,rock,atlas,x,y,px,py,size);
};
const begin=DD.systems.beginFloor;
DD.systems.beginFloor=function(floor){const result=begin.call(this,floor);if(S.board?.kind==='boss')S.board.bossOverlayAlpha=1;return result;};
})();
