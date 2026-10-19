(() => {
const S=DD.state;
const interval=DD.systems.currentSpawnInterval;
DD.systems.currentSpawnInterval=function(){return interval.call(this)/(S.mode==='boss'?1.5:1);};
const wave=DD.systems.spawnEnemyWave;
DD.systems.spawnEnemyWave=function(){
  if(S.mode!=='boss')return wave.call(this);
  // Boss wave: one enemy 40%, two 40%, three 20%.
  const roll=Math.random(),count=roll<0.4?1:roll<0.8?2:3;
  for(let i=0;i<count;i++)this.spawnEnemy();
};
})();
