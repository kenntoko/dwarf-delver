window.DD = window.DD || {};
DD.data = {
  enemyDefs: {
    slime: { name: 'スライム', hp: 10, damage: 2, attackCooldown: 5, speedMul: 1.0, xp: 2, size: 12, asset: 'slime' },
    bat:   { name: 'コウモリ', hp: 7, damage: 1, attackCooldown: 4, speedMul: 1.5, xp: 1, size: 10, asset: 'bat' },
    goblin:{ name: 'ゴブリン', hp: 15, damage: 5, attackCooldown: 5, speedMul: 0.5, xp: 5, size: 14, asset: 'goblin' }
  },
  itemDefs: {
    reinforce: { name: '補強資材', target: true, desc: '指定1マスを補強して危険岩盤を安全化' },
    survey: { name: '地質調査具', target: true, desc: '指定マスの周囲8マスにある危険岩盤の数を表示' },
    clairvoyance: { name: '透視の巻物', target: true, desc: '指定マスの周囲8マスの未開拓情報を表示' },
    heal: { name: '回復薬', target: false, desc: 'HPを30回復' }
  },
  upgradeDefs: {
    projectilePower: { name: '上質な魔力', max: 5, getDesc(lv){ return `魔法弾の攻撃力 +1（現在Lv${lv}）`; } },
    castSpeed: { name: '高速詠唱', max: 5, getDesc(lv){ return `魔法弾の発射間隔 -0.2秒（現在Lv${lv}）`; } },
    summon: { name: '奴隷調達', max: 5, getDesc(lv){ return `ドワーフ精霊 +1体（現在Lv${lv}）`; } },
    vitality: { name: 'ご褒美スイーツ', max: 5, getDesc(lv){ return `最大HP +20、HP20回復（現在Lv${lv}）`; } },
    scoutEye: { name: '鉱脈調査', max: 5, getDesc(lv){ return `${DD.data.scoutIntervals[lv]}秒ごとに安全マスを1つ自動開拓（現在Lv${lv}）`; } },
    xpBoost: { name: '英才教育', max: 5, getDesc(lv){ return `獲得XP +10%（現在Lv${lv}）`; } },
    defense: { name: '素敵なお召し物', max: 5, getDesc(lv){ return `被ダメージ -8%（現在Lv${lv}）`; } }
  },
  scoutIntervals: [Infinity, 45, 35, 25, 18, 12]
};

