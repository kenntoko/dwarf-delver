/* Expansion tables. Skill and equipment levels are independent. */
window.DD = window.DD || {};
DD.expansion = {
  tables: {
    coin: [[1,0,1],[1,1,2],[3,2,3],[3,3,4],[5,4,5]],
    perfume: [[1.5,.5],[2,.75],[2.5,1],[3,1.25],[3.5,1.5]],
    bump: [[2,4],[3,7],[4,10],[5,13],[6,16]],
    devil: [[1,3,2],[1,4,1.9],[2,5,1.8],[2,6,1.7],[3,7,1.6]],
    golem: [[4,12,2,2],[5,16,3,1.9],[6,20,4,1.8],[7,24,5,1.7],[8,28,6,1.6]],
    decoy: [[1,30,.10],[2,25,.12],[3,20,.14],[4,15,.16],[5,10,.18]]
  },
  skillNames: {coin:'銭投げ',perfume:'高級香水',bump:'精霊の体当たり',resonance:'共振',devil:'小悪魔契約',golem:'警備委託',maid:'専属メイド',decoy:'宝箱トラップ'},
  equipmentDefs: {
    ring:{name:'貫通の指輪',desc:lv=>`飛び道具の貫通 +${lv}回`},
    mirror:{name:'跳弾の手鏡',desc:lv=>`飛び道具の壁反射 +${lv}回`},
    whip:{name:'女王の鞭',desc:lv=>`全攻撃ダメージ +${lv*10}%`},
    megaphone:{name:'メガホン',desc:lv=>`自動攻撃の間隔 -${lv*8}%`},
    pendant:{name:'護身のペンダント',desc:lv=>`被ダメージ -${lv*5}%（お召し物と重複）`},
    wallet:{name:'ブランド財布',desc:lv=>`スコア獲得 +${lv*10}%`}
  },
  lv(key){return DD.state.player.upgrades[key]||0;},
  gear(key){return (DD.state.equipment||{})[key]||0;},
  innateSkills: new Set(['summon','coin']),
  bonusKeys(){return Object.keys(DD.data.upgradeDefs).filter(k=>!this.innateSkills.has(k)&&this.lv(k)>0);},
  canUpgrade(key){return !!DD.data.upgradeDefs[key]&&this.lv(key)<5&&(this.innateSkills.has(key)||this.lv(key)>0||this.bonusKeys().length<5);},
  availableUpgrades(){return Object.keys(DD.data.upgradeDefs).filter(k=>this.canUpgrade(k));},
  stat(key,lv=this.lv(key)){return this.tables[key][Math.max(1,Math.min(5,lv))-1];},
  skillDescription(key,lv){
    const n=Math.max(1,Math.min(5,lv)),t=this.tables[key]?.[n-1];
    const text={
      coin:()=>`${t[0]}枚／反射${t[1]}回／貫通${t[2]}回。1枚1スコア、威力5。`,
      perfume:()=>`半径${t[0]}マス。0.5秒ごとに${t[1]}ダメージ。`,
      bump:()=>`接触時${t[0]}ダメージ、${t[1]}pxノックバック。離れて再接触で再発動。`,
      resonance:()=>`新しく開いた1マスごとに全敵へ${n}ダメージ。`,
      devil:()=>`小悪魔${t[0]}人。火球${t[1]}ダメージ／${t[2]}秒。自由に通路を探索。`,
      golem:()=>`1体で警備。殴打${t[0]}、押し出し${t[1]}px、壁衝突+${t[2]}／${t[3]}秒。`,
      maid:()=>`メイド妖精1人。10秒ごとに${n*2}HP回復。`,
      decoy:()=>`最大${t[0]}個／${t[1]}秒ごとに補充。HPは最大HPの${Math.round(t[2]*100)}%。各5秒で10スコア。`
    };
    return `Lv${n}：${text[key]()}`;
  }
};
for (const [key,name] of Object.entries(DD.expansion.skillNames)) {
  DD.data.upgradeDefs[key]={name,max:5,getDesc(lv){return DD.expansion.skillDescription(key,lv);}};
  DD.state.player.upgrades[key]=key==='coin'?1:0;
}
DD.data.itemDefs.survey.desc='選択した未探索マスを含む周囲9マスの危険岩盤すべてに、危険看板を立てる。';
DD.data.itemDefs.reinforce.desc='選択した未探索マスを、危険岩盤でも安全な岩盤でも安全に破壊して開く。';
delete DD.data.itemDefs.clairvoyance;
delete DD.state.inventory.clairvoyance;
DD.state.equipment={};
DD.state.score=0;
