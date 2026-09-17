# 曲がった配管の汚染評価（記事のサンプル一式）

CSG では書けない形状と、線源型に合わない汚染分布の両方を扱う体系。

## ファイル

| ファイル | 内容 |
|---|---|
| `pipe_contam.FCStd` | FreeCAD モデル。汚染の指定もプロパティに入っている |
| `poker.yaml` | 生成された POKER 入力。122 個の点線源に展開済み |
| `poker.paths` | CAD から抽出した経路（244 本） |
| `make_pipe.py` | FCStd を作るスクリプト |

`poker.yaml` は `poker_generateInput` の出力。手で書いたものではない。

## 体系

S 字に曲がった配管。内径 10cm、肉厚 1.5cm、SUS。管壁は自由曲面
（BSplineSurface）で、CSG では円柱とトーラスを継ぎ足すしかない形状。

横にコンクリート壁を立て、その向こう側 1m と反対の開放側 1m に検出器を置く。

## 三種類の汚染

CAD のプロパティで指定する。

```python
wall.PokerRole = 'source'
wall.PokerMaterial = 'SUS_A'
wall.PokerInnerNuclides = 'Cs137:1.0e4, Co60:2.0e3'   # Bq/cm2
wall.PokerOuterNuclides = 'Cs137:5.0e2'               # Bq/cm2

fluid.PokerRole = 'source'
fluid.PokerSourceType = 'volume'
fluid.PokerMaterial = 'Water'
fluid.PokerComposition = 'Cs137:5, Co60:1'
fluid.PokerConcentration = '1.2e5'                    # Bq/cm3
```

内面と外面は形状から自動で判別される（端面は除外）。総量は指定した濃度と厳密に
一致する。

| 汚染 | 面積・体積 | 総放射能 |
|---|---|---|
| 内面 | 2,639 cm² | Cs137 3.17e7 + Co60 5.28e6 Bq |
| 外面 | 3,430 cm² | Cs137 1.72e6 Bq |
| 流体 | 6,596 cm³ | Cs137 6.60e8 + Co60 1.32e8 Bq |

## 実行

MCP から 3 呼び出し。

```javascript
poker_generateInput({ fcstd: "pipe_contam.FCStd" })
poker_generatePaths({ fcstd: "pipe_contam.FCStd" })
poker_executeCalculation({ yaml_file: "poker.yaml", path_input: "poker.paths" })
```

同梱の `poker.yaml` と `poker.paths` を使えば、CAD 無しで計算だけ再現できる。

```
POKER_CUI.exe poker.yaml --path-input poker.paths -t -o out.summary
```

## 結果

| 検出器 | H*(10) |
|---|---|
| コンクリート壁の向こう側 1 m | 2.10 µSv/h |
| 開放側 1 m | 29.2 µSv/h |

壁が約 14 倍の遮蔽効果を示している。

## 注意点

**管壁は線源であると同時に遮蔽体。** `PokerMaterial` を設定しておかないと透明に
なり、自己遮蔽が効かず線量を 4 割過大評価する（47.52 → 29.24 µSv/h）。

## テスト

```
npm run test:cad-pipe
```

`POKER_TEST_PIPE` 環境変数で別のモデルを指定できる。
