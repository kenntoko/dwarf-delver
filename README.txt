Dwarf Delver / HTML5プレリリース（自動接続タイル実装版）
======================================================

起動:
  展開したフォルダの index.html を Chrome/Edge/Firefox で開く。
  ファイルアクセスを制限するブラウザでは、簡易Webサーバーで配信する。
  例: このフォルダで python -m http.server 8000 → http://localhost:8000/

操作:
  左クリック = 採掘、右クリック = 危険看板、N = 次階層、Esc = アイテム選択解除

自動接続:
  assets/cave_autotile_32.png   128×128px、4×4枚、各タイル32×32pxのPNG
  assets/cave_wall_32.png       32×32px、未開拓岩盤用PNG
  js/render.js が各開拓済みマスの上右下左を調べて接続形状を選択。
  接続ビット: 北=1 東=2 南=4 西=8、番号0～15。番号のタイル位置は(x=番号%4, y=番号//4)。
  例: 上下接続 → mask=5、上下左右接続 → mask=15。
  採掘のたびに表示を再計算するため、隣接通路が開くと接続が自動で更新される。

素材差替:
  上記PNGを同じピクセル寸法と配置順で差し替えるだけで適用可能。
  PNGの読み込みは js/assets.js、選択・描画は js/render.js。
  旧AI生成画像は格子とエッジ接続が不正確なので、実装用には
  接続が保証できる16パターンのPNGを新規作成した。

構成:
  index.html, css/styles.css
  js/config.js 定数、js/data.js バランス値
  js/board.js 盤面生成、js/systems.js ゲームロジック
  js/render.js 描画、js/assets.js 画像読込、js/main.js 起動
  js/state.js 状態、js/ui.js UI、js/utils.js 汎用関数
  assets/ キャラクター仮画像、洞窟実装用PNG

注意:
  ゲーム全体は試作段階。見た目・難易度の総合ブラウザ試遊検証は未実施。


2026-10 slime update:
- assets/slime_sheet.png を追加
- スライム待機5コマ、攻撃4コマを実装
- idle/move中は待機ループ、攻撃時は4コマ再生

ゴブリン看板破壊（更新）:
- 看板を破壊するまで8秒。
- 破壊中はゴブリンの頭上に8×8ピクセルの円形4分割メーター表示。
- 2秒ごとに1/4ずつ点灯。8秒後に看板を撤去。
- 通常フロアでは看板に隣接する採掘済み通路まで移動して破壊する。
- 敵が倒されたり看板が消えたりした場合は破壊を中断。

2026-10 goblin meter update:
- assets/goblin_break_meter.png を追加
- ゴブリンの看板破壊メーターを 8x8 のドーナツ型ドット絵に変更
- 5フレーム (0/4, 1/4, 2/4, 3/4, 4/4) の進捗表示
