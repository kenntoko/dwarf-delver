(() => {
const S=DD.state,U=DD.utils,B=DD.board;
const generate=B.generateBossBoard;
B.generateBossBoard=function(){const board=generate.call(this);board.firstDigPending=true;return board;};
DD.bossFirstDig={area(board,x,y){
  const selected=[],seen=new Set(),queue=[[x,y]];
  const distance=([a,b])=>Math.max(Math.abs(a-x),Math.abs(b-y))*100+(a-x)**2+(b-y)**2;
  while(queue.length&&selected.length<9){
    queue.sort((a,b)=>distance(a)-distance(b)||a[1]-b[1]||a[0]-b[0]);
    const [cx,cy]=queue.shift(),key=U.key(cx,cy);
    if(seen.has(key)||!U.inBounds(cx,cy)||!board.grid[cy][cx].active)continue;
    seen.add(key);selected.push([cx,cy]);
    for(const point of U.neighbors8(cx,cy))if(!seen.has(U.key(...point)))queue.push(point);
  }
  return selected;
}};
const open=DD.systems.openTile;
DD.systems.openTile=function(x,y){
  const board=S.board;
  if(S.mode!=='boss'||!board.firstDigPending)return open.call(this,x,y);
  if(S.paused||!U.inBounds(x,y))return;
  const clicked=board.grid[y][x];if(!clicked.active||clicked.isOpen||clicked.flagged)return;
  const area=DD.bossFirstDig.area(board,x,y),safe=new Set(area.map(p=>U.key(...p))),destinations=[];
  let moved=0;
  for(const [sx,sy]of area){const t=board.grid[sy][sx];if(t.isDanger){t.isDanger=false;moved++;}t.flagged=false;}
  for(let ny=0;ny<DD.config.H;ny++)for(let nx=0;nx<DD.config.W;nx++){
    const t=board.grid[ny][nx];if(t.active&&!t.isOpen&&!t.isDanger&&!t.wasDanger&&!safe.has(U.key(nx,ny)))destinations.push(t);
  }
  U.shuffle(destinations);for(let i=0;i<moved;i++)destinations[i].isDanger=true;
  B.recomputeNumbers(board);
  board.firstDigPending=false;
  // Confirm the protected area before the life-loss wrapper can see a mine.
  // Existing reveal propagation still opens connected zero cells to numbered edges.
  for(const [sx,sy]of area){if(S.board!==board||S.mode!=='boss')break;DD.expansion.reveal(sx,sy,S.digClock);}
  DD.ui.refreshHud();
};
})();
