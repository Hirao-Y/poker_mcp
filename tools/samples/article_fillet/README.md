# 簡略化形状の影響（記事のサンプル一式）

角を丸めた分だけ線量がどれだけ変わるかを確かめた体系。CSG で書いた入力はそのまま
使い、形状の詳細だけを CAD から持ち込む。

## ファイル

| ファイル | 内容 |
|---|---|
| `poker.yaml` | POKER の入力。角が尖った箱として書いてある |
| `shield.FCStd` | FreeCAD モデル。R5cm のフィレット付き |
| `poker.paths` | CAD から抽出した経路 |
| `make_shield.py` | FCStd を作るスクリプト |

## 体系

鉄の遮蔽箱。外寸 60×60×40 cm、内部に 40×40×20 cm の空洞。中央に Co-60 を 1 Ci。

検出器は上面 1m、側面 1m、角方向の 3 つ。

## 実行

```
# CSG のまま（フィレット無し）
POKER_CUI.exe poker.yaml -t -o csg.summary

# CAD から抽出した経路を使う（フィレット有り）
POKER_CUI.exe poker.yaml --path-input poker.paths -t -o cad.summary
```

MCP から使う場合。

```javascript
poker_generatePaths({ fcstd: "shield.FCStd" })
poker_executeCalculation({ yaml_file: "poker.yaml", path_input: "poker.paths" })
```

`generateInput` は呼ばない。線源と検出器の定義は既存の YAML のまま使う。

## 結果

| 検出器 | CSG（角が尖る） | CAD（R5cm で丸め） | 比 |
|---|---|---|---|
| 上面 1 m | 763.6 | 763.6 | 1.00 |
| 側面 1 m | 650.3 | 650.3 | 1.00 |
| 角方向 | 167.5 | 333.4 | **1.99** |

平坦な方向が完全に一致することが、条件を変えずに比較できている証拠になる。

角方向だけ約 2 倍の差。角を丸めた分その方向の鉄が薄くなっているが、CSG では
その薄さを表現できていない。**簡略化した入力が線量を半分に見積もっていた**ことになる。

## FCStd を作り直す

```
freecadcmd make_shield.py
```

スクリプト冒頭の `OUT` と `LOG` のパスを環境に合わせて書き換えること。
