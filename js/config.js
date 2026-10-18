window.DD = window.DD || {};
DD.config = {
  W: 30,
  H: 16,
  TILE: 36,
  CANVAS_W: 1200,
  CANVAS_H: 800,
  boardRect: { x: 70, y: 60 },
  baseEnemySpeed: 40,
  goblinSignBreakSeconds: 8,
  bossThresholdBase: 160,
  bossAttackDamage: 20,
  bossWindowSeconds: 60,
  colors: {
    closed: '#524236', open: '#b59b77', open2: '#ccb48f', line: '#3b2e23',
    flag: '#ff8f47', chest: '#e8d061', entrance: '#65bbdb', exit: '#8bd06f',
    danger: '#c74d43', reinforce: '#6cc08a', preview: '#66a7ff', survey: '#ffd36e'
  },
  nums: ['#e9dbc4', '#4f92ff', '#57b35f', '#df6c5d', '#8d67d1', '#c2a24e', '#5ac3c0', '#f27ab4', '#ffffff']
};
DD.config.boardRect.w = DD.config.W * DD.config.TILE;
DD.config.boardRect.h = DD.config.H * DD.config.TILE;
