window.DD = window.DD || {};
DD.state = {
  mode: 'dungeon',
  floor: 1,
  board: null,
  discoveredExit: false,
  readyToDescend: false,
  paused: false,
  pauseReason: '',
  itemMode: null,
  log: [],
  player: {
    hp: 100, maxHp: 100,
    level: 1, xp: 0, nextXp: 100,
    upgrades: {
      projectilePower: 0,
      castSpeed: 0,
      summon: 1,
      vitality: 0,
      scoutEye: 0,
      xpBoost: 0,
      defense: 0,
    },
    scoutTimer: 0,
  },
  inventory: { reinforce: 0, survey: 0, clairvoyance: 0, heal: 0 },
  enemies: [],
  projectiles: [],
  dwarfActors: [],
  spawnTimer: 0,
  floorTimer: 0,
  spawnBase: 9,
  bossAttackTimer: 60,
  bossWindowScore: 0,
  pendingChoices: null,
  lastTimeStamp: 0,
  canvas: null,
  ctx: null,
  dom: {}
};

DD.state.playerPos = function() {
  if (this.mode === 'boss') {
    const { boardRect } = DD.config;
    return { x: boardRect.x + boardRect.w / 2, y: boardRect.y + boardRect.h + 70 };
  }
  return DD.utils.tileCenter(this.board.entry.x, this.board.entry.y);
};
