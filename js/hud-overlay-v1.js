(() => {
// Reserve a compact in-canvas HUD area above the entrance and player.
DD.config.boardRect.y=500;
DD.config.CANVAS_H=1240;
const bind=DD.ui.bindDom;
DD.ui.bindDom=function(){
  bind.call(this);
  const field=document.getElementById('playfield'),hud=document.getElementById('gameHud');
  Sizing();
  function Sizing(){
    const canvas=document.getElementById('gameCanvas');canvas.height=DD.config.CANVAS_H;
    field.prepend(hud);
    const fit=()=>{hud.style.transform=`scale(${canvas.getBoundingClientRect().width/600})`;};
    fit();if(typeof ResizeObserver!=='undefined')new ResizeObserver(fit).observe(field);
    window.addEventListener('resize',fit);
  }
};
})();
