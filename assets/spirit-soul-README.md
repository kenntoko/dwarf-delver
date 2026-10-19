# ドワーフ精霊：魂デザイン

- 水色の浮遊する魂、黄色いヘルメット、ピッケル、黒い楕円の目。眉・ひげ・口なし。
- `dwarf_soul_idle.png`: 128×32、横4コマ、1コマ32×32。180ms/コマ。
- `dwarf_soul_attack.png`: 192×32、横6コマ、1コマ32×32。80ms/コマ、計480ms。
- `summon_soul_plus.png`: 32×32透過PNG。「奴隷調達」用の緑＋印付きアイコン。
- 待機/攻撃はコマ絵の切替のみ。回転・拡縮・中間フレーム補間なし。
- 既存の主人公周囲の周回経路は維持。精霊の表示枠は視認性のため32×32。
- 攻撃モーションは既存の魔法弾発射イベントと同期。威力、射程、発射間隔、対象選択は変更なし。
- MENU/LvUpなどの停止中は精霊アニメーションも停止。
- 組み込み画像生成で作成し、生成シートを切り出し、ニアレストネイバー縮小で実寸32×32フレームへ整理。
- 実装: `assets/dwarf_soul_idle.png`, `assets/dwarf_soul_attack.png`, `assets/levelup_icons_simple/summon_soul_plus.png`。
- 参照コード: `js/assets-spirit-v1.js`, `js/render-spirit-v1.js`, `js/systems-spirit-v1.js`, `js/ui-spirit-v1.js`。
- 公開版: https://kenntoko.github.io/dwarf-delver/?v=spirit-soul-1
