# スマホ・PC共通のマップ表示

- スマホ：タップで壁を開く／450ms長押しで立て札の設置・解除／数字を320ms以内にダブルタップで一括開放。
- 一括開放は周囲の立て札の数が数字と一致する場合に実行。旗が誤っていれば従来どおり危険岩盤を開いてゲームオーバーになります。
- 開いたマスへのタップは従来の銭投げ。数字への1回タップはダブルタップ判定を待ってから発射します。
- MENU段に1×・2×・4×と手のボタンを追加。手をオンにしてドラッグすると画面を移動し、掘削しません。PCも共通です。
- 拡大時は移動余地のある方向だけ矢印を表示。矢印は押し続けても移動します。1×では全体表示に戻ります。
- HUDは拡大せず固定。拡大中は背後のマップが文字へ重ならないよう暗い背景を付けています。

実装：js/map-controls-v1.js、css/map-controls-v1.css、assets/expansion/map-arrow-v1.png、assets/expansion/map-hand-v1.png。個別画像は32×32px透過PNGです。

テスト：タップ、長押しの設置・解除、ダブルタップ、ドラッグ時の誤掘削防止、接触キャンセル、手のモード、拡大後の座標、移動上限、矢印の表示切替、1×復帰、アイテム使用、停止中の入力を検証。PCブラウザーの拡大・矢印・ドラッグと390px幅の表示を確認。スマホ実機での確認は未実施です。

画像は組み込み画像生成ツールで作成し、セルを切り出してニアレストネイバーで32pxへ縮小しています。

生成プロンプト：Game UI sprite sheet, exactly TWO equal square cells side by side in one row on a genuinely transparent background. Extremely simple chunky pixel art designed to remain readable at 24x24 pixels. LEFT CELL: a large solid upward pointing triangle arrow, cream white with a dark brown stepped 1-pixel outline, no button background. RIGHT CELL: a simple open hand palm icon for map panning, five fingers, cream white with dark brown stepped outline, no button background. Both icons centered inside safe margins, same visual weight, flat palette, no text, no labels, no scenery, no gradients, no blur, no shadows, no decorative borders. Practical tiny fantasy dungeon game controls, bold readable silhouettes.

色変更プロンプト：Change ONLY the cream-white fill inside the LEFT triangle arrow to a muted warm orange (#dd8a32), keeping its dark brown outline, pixel silhouette, placement, transparent background, and all other pixels/designs unchanged. The RIGHT hand icon stays cream white. Preserve the two equal cells and genuinely transparent background. This is a tiny dungeon game UI sheet, no text.
