# LvUpボーナスアイコン

各PNGは実寸32×32 px、RGBA透過です。シートは224×32 px、左から下記の順です。
生成画像をトリミングし、ニアレストネイバーで32×32に縮小した最終実装素材です。生成元が32×32だったという意味ではありません。

| key / 個別PNG | 表示名 | 旧名称 | 効果 | シートX |
| --- | --- | --- | --- | --- |
| projectilePower.png | 上質な魔力 | 魔法弾強化 | 魔法弾の攻撃力 +1 | 0 |
| castSpeed.png | 高速詠唱 | 高速詠唱 | 発射間隔 -0.2秒 | 32 |
| summon.png | 奴隷調達 | 追加召喚 | ドワーフ精霊 +1体 | 64 |
| vitality.png | ご褒美スイーツ | 生命強化 | 最大HP +20、HP20回復 | 96 |
| scoutEye.png | 鉱脈調査 | 探索の眼 | 安全マスを自動探知 | 128 |
| xpBoost.png | 英才教育 | 経験値強化 | 獲得XP +10% | 160 |
| defense.png | 素敵なお召し物 | 防御強化 | 被ダメージ -8% | 192 |

## 配置と表示

- 個別: `assets/levelup_icons/{key}.png`
- シート: `assets/levelup_icons_sheet.png`（余白・間隔なし）
- 対応表: `assets/levelup_icons/manifest.json`
- UI: `js/ui-levelup-icons-v1.js` の `upgradeIcon(key)`。LvUp選択・所持ボーナス・MENUで共通利用。
- 名称: `js/data-levelup-icons-v1.js`。内部キー、効果、上限、処理は変更していません。
- CSS: `css/styles.css`。選択肢は64×64（2倍）、小画面・所持欄は32×32（等倍）。`image-rendering: pixelated`。
- 新名称を含む日本語ドットフォント: `assets/levelup-ui-dot.ttf`。DotGothic16、SIL Open Font License（既存の `assets/gui-dot-OFL.txt`）。

## 確認

公開ページ `https://kenntoko.github.io/dwarf-delver/?v=levelup-icons-1` を開き、LvUp時の選択肢で名称・アイコンを確認してください。取得したボーナスは所持欄とMENUにも同じ画像で表示されます。
7種類はランダムな選択候補なので、一度のLvUpで全種類は表示されません。

## 制作

OpenAI組み込み画像生成を使用。最終プロンプトは `prompts.txt`。背景のアルファを維持し、実装サイズに縮小して確認しています。
