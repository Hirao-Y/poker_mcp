# CAD 連携クイックスタート

CAD モデルから直接、遮蔽計算をするための最短手順です。技術的な詳細は
[CAD_RAYTRACE.md](CAD_RAYTRACE.md)、フォーマットは [PATHS_FORMAT.md](PATHS_FORMAT.md)
を参照してください。

## 必要なもの

| | 入手先 | 備考 |
|---|---|---|
| poker-mcp | `npm install poker-mcp` | v1.8.3 以降 |
| POKER 本体 | 別途入手 | v2.1.5 以降 |
| FreeCAD | [freecad.org](https://www.freecad.org/) | 無償。1.0 以降 |

numpy は FreeCAD に同梱されているので追加のインストールは不要です。

```json
"env": {
  "POKER_MCP_HOME": "C:\\Users\\yourname\\poker_workspace",
  "POKER_INSTALL_PATH": "C:\\Poker",
  "FREECAD_PATH": "C:\\Program Files\\FreeCAD 1.1"
}
```

`FREECAD_PATH` は既定の場所にインストールされていれば省略できます。

## 仕組み

線源から検出器へ直線を引き、途中で何をどれだけ通過したかを記録します。

![経路と、通過した材質・厚さの記録](../assets/fig1_path.svg)

この並びを `.paths` ファイルに書き出して POKER に渡します。CAD の形状がどれだけ
複雑でも、直線との交差さえ求められればよいので、フィレットでも自由曲面でも
扱えます。

## 手順

CAD が正本です。**YAML を手で書く必要はありません。**

```javascript
poker_generateInput({ fcstd: "C:/path/to/model.FCStd" })   // YAML を生成
poker_generatePaths({ fcstd: "C:/path/to/model.FCStd" })   // 経路を抽出
poker_executeCalculation({ yaml_file: "poker.yaml", path_input: "poker.paths" })
```

### CAD 側の約束

ソリッドにカスタムプロパティを設定します。これだけが利用者の仕事です。

| プロパティ | 対象 | 内容 |
|---|---|---|
| `PokerRole` | 全体 | `shield`（既定）/ `source` / `detector` |
| `PokerMaterial` | 遮蔽体 | 材質名（`Iron`、`Concrete` など） |
| `PokerDensity` | 遮蔽体 | 密度の上書き [g/cm³]。省略時はカタログ密度 |
| `PokerNuclides` | 線源 | `"Cs137:1.0e13, Co60:5.0e11"` |
| `PokerDivision` | 線源・検出器 | 分割数。省略時は自動（後述） |
| `PokerCutoff` | 線源 | 打ち切り率。既定 1e-4 |
| `PokerShowPathTrace` | 検出器 | 既定 false |

```python
o.addProperty('App::PropertyString', 'PokerMaterial', 'POKER', '材質')
o.PokerMaterial = 'Iron'
```

### 形状から決まるもの

**線源と検出器の型は、ソリッドの形から判定されます。** 面の数ではなく曲面の
種別（円柱面・球面・平面）で判定するので、傾いた円柱も正しく扱えます。

| CAD の形 | 線源として | 検出器として |
|---|---|---|
| 球・小さい立体 | POINT（1 cm³ 未満）/ SPH | 点検出器 |
| 円柱 | RCC（軸と底面を自動取得） | — |
| 薄い直方体 | BOX | **2D グリッド**（面線量マップ） |
| 直方体 | BOX | **3D グリッド**（体積線量マップ） |

円錐やトーラスなど POKER に対応する型がない形状は、**黙って近似せずエラーに
します**。気づかないまま違う体系を計算するより安全です。

### 自動で決まるもの

**子孫核種**が補完されます。Cs137 は β 崩壊のみで光子をほぼ出さず、0.662 MeV は
娘核種 Ba137m から出ます。忘れると線量が 1/3 になるため、`DaughterReconciler`
を通して自動で追加します。

**線源の分割数**は、1 区画が 2 mfp 以下になるよう寸法と材質から決まります。
`PokerDivision` で上書きできます。

```
キャスク相当（Source_Dry, r=75cm, h=400cm）-> r=8, phi=16, z=41
```

これは出発点であって最適値ではありません。**本来は分割数を変えて線量の収束を
確認して決めるもの**です。

**参照エネルギー**は線源の核種から光子放出率で重み付けした平均を使います。
層の縮約に使う値で、線量計算には影響しません。

**`thinnedindices`** は分割点数・評価点数に合わせて設定されます。`.paths` の
生成には全点が必要ですが、既定では間引かれるためです。

### 生成物の検証

`poker_generateInput` は生成直後に `poker_cui -c` を走らせ、結果を返します。

```json
"validation": { "ok": true, "message": "poker_cui -c で検証を通過しました" }
```

材質名がライブラリに無いといった誤りを、計算まで進む前に捕まえられます。

### 既存の YAML

上書きされますが、`backups/` に退避されます（`applyChanges` と同じ場所）。
CAD が正本なので YAML は生成物であり、毎回確認を求めるのは煩わしいだけという
判断です。

## サンプル

`tools/samples/` に、記事で使った最小サンプルがあります。

| ファイル | 内容 |
|---|---|
| `make_sample.py` | 鉄の箱（60x60x40 cm、角を R5cm でフィレット）を作る |
| `sample_shield.yaml` | 対応する POKER 入力（Co60 1Ci、検出器 3 点） |

```
"C:\Program Files\FreeCAD 1.1\bin\freecadcmd.exe" tools/samples/make_sample.py
```

### 結果

![角を丸めた分だけ鉄が薄くなり、線量が約2倍になる](../assets/fig3_corner.svg)

| 検出器 | CAD 経由 | CSG 経由 | 比 |
|---|---|---|---|
| 上面 1 m | 763.6 | 763.6 | 1.00 |
| 側面 1 m | 650.3 | 650.3 | 1.00 |
| **角方向** | **333.4** | **167.5** | **1.99** |

平坦な面を垂直に抜ける経路は完全に一致します。角方向だけ約 2 倍の差が出るのは、
角を R5cm で丸めた分だけ鉄が薄くなっているためで、CSG（角が尖った箱）ではその
薄さを表現できていません。**CSG 側が線量を半分に見積もっていた**ことになります。

形状の簡略化が線量をどれだけ動かすかは事前には分かりません。CAD 連携を使えば、
簡略化そのものが不要になります。

## 精度

CAD の曲面は計算前に三角形の集まりに変換されます（テッセレーション）。

![曲面を三角形の集まりで近似する](../assets/fig2_tess.svg)

多角形は真の曲面に内接するので、経路長がわずかに短く出ます。既定の偏差 0.5 mm
での実測値です。

| 体系 | 曲面 | CSG 経由との差 |
|---|---|---|
| 鉄平板 | なし | 0.005% |
| 円筒容器 | 円筒 | 0.23% |
| 球殻 | 球 | 0.63% |

球は 2 方向に曲がっているため、円筒より差が大きくなります。球面や複曲面が主体の
体系では偏差を下げてください。

```javascript
poker_generatePaths({ fcstd: "...", deviation: 0.1 })
```

球殻の実測で、0.1 mm なら 0.045%、0.02 mm なら 0.036% まで縮みます。

## 使いどころ

**向いている場面**: CSG で表現しにくい形状（フィレット、自由曲面、多数の貫通孔）。
簡略化の妥当性を確認したいとき。既存の設計データ（STEP）を使いたいとき。

**向いていない場面**: 評価点が非常に多い体系。経路数は「線源分割点 x 検出器
評価点」に比例するので、3D グリッド検出器のような体系では成立しません。

目安は線源 3,840 点 x 検出器 15 点 = 57,600 経路で約 20 秒です。

**従来の CSG 入力を置き換えるものではなく、使い分けてください。**

## 他の CAD で作ったモデル

SolidWorks、Inventor、Fusion 360、Rhino などのモデルも使えます。

1. 元の CAD で STEP 形式に書き出す
2. FreeCAD で開く
3. 各ソリッドに `PokerMaterial` を設定する
4. `.FCStd` として保存する

3 が必要なのは、**STEP では材質情報が運べない**ためです。FreeCAD の STEP 書き出しは
AP214 形式で、材質エンティティを含みません。残るのはソリッド名だけです。

一度設定すれば `.FCStd` に保存されるので、次回以降は不要です。

## 困ったときは

[TROUBLESHOOTING.md](TROUBLESHOOTING.md) の第 2.6 章に、よくある 6 件をまとめて
あります。

| 症状 | 対処 |
|---|---|
| FreeCAD が見つかりません | `FREECAD_PATH` を設定 |
| count / position mismatch | 入力を変えたら `.paths` を再生成 |
| 評価点が間引かれています | `poker_updateThinnedIndices({ fit_for_paths: true })` |
| CSG 経由と差が出る | まずテッセレーション偏差を疑う |