# 引き継ぎ要約 — POKER-MCP / CAD 連携レイトレース

このセッション（poker_mcp v1.5.0 → v1.6.3、POKER 2.1.1 → 2.1.5）で行った作業と、
判明した POKER の仕様。
相手は NMRI の放射線遮蔽研究者（GitHub: Hirao-Y）。会話は日本語。

---

## 1. 到達点

FreeCAD のソリッドモデルを遮蔽体系として直接扱うためのパイプラインを構築した。
**生成側は完成、受け側は線量計算ルーチンの見直しが残っている**（§11 参照）。

狙いは、STEP のような中間フォーマットを介さず、CSG プリミティブで表現し直す
作業も不要にすること。線源点→検出器の直線を FreeCAD 側で追跡し、通過した材質と
厚さの並びを `.paths` ファイルで POKER に渡す。

副産物として、POKER の改造なしで使える**簡易化の監査ツール**ができた。

---

## 2. 環境

- リポジトリ: `C:\Users\yoshi\poker_mcp_github`（origin `Hirao-Y/poker_mcp`、公開）
- POKER: `C:\Poker`（`poker_cui.EXE`, v2.1.5。本セッション中に 2.1.1 から更新）
- FreeCAD 1.1: `C:\Program Files\FreeCAD 1.1\bin\freecadcmd.exe`（Python 3.11 + numpy）
- 検証作業ディレクトリ: `C:\Users\yoshi\poker_verify`（リポジトリ外）
- CAD モデル: `C:\Users\yoshi\Desktop\cask_*.FCStd`

### ツールの実行方法

**GUI の MCP ブリッジ経由でレイトレースを走らせないこと。** 数万レイのトレースは
GUI スレッドを数十秒占有し、RPC タイムアウト後にブリッジの標準出力が壊れる
（FreeCAD 再起動が必要になる）。ヘッドレスで実行する。

```powershell
& "C:\Program Files\FreeCAD 1.1\bin\freecadcmd.exe" -c `
  "import sys; sys.path.insert(0, r'<repo>\tools'); import gen_paths; gen_paths.main(r'<spec>.json')"
```

`freecadcmd` はスクリプト以降の引数を「開くファイル」と解釈するので `-c` を使う。
エラー時のトレースバックは標準出力に出ないことがあるため、ファイルに書き出す。

**PowerShell の `Get-Content | Set-Content` でリポジトリのファイルを編集しない。**
UTF-8 が ANSI として読まれ日本語コメントが文字化けする（実際に事故を起こした）。
`desktop-commander` の `edit_block` / `write_file` か node を使う。

---

## 3. 判明した POKER の仕様（重要）

次に作業を再開するとき、これらは再発見に手間がかかる。

### 分割点の生成規則

各軸を分割座標 `divS`/`divM`/`divN`（相対比率、昇順、**等間隔とは限らない**）で
区切り、**代表点は各区間の中点**、体積差は**重みで補償**する。

`weight` ノードを省略すると重みは体積分率、指定すると相対強度から算出される
**強度分率**になる。総和は 1。

開発中に等面積分割で代表点を生成したところ食い違った。r2×φ4×z3 の場合:

| | 半径 [cm] | 重み |
|---|---|---|
| POKER | 13.258 / 39.775 | 0.0208 / 0.0625（1:3） |
| 等面積分割（誤り） | 37.5 / 64.95 | 均等 |

→ **規則を再実装せず `poker_cui -p` の `point_source:` をそのまま読む**方針にした。

### 仮想点線源は分割点ではない

`pseudo_source_points` と `path_trace_from_pseudo_source_point` に出るのは、
線源のバウンディングボックスの**角 8 点＋中心の 9 点**で固定。分割数を変えても
増えない。円筒線源では線源領域の外側に位置する。バウンディングボックスの検証用で
実計算には使われない。

→ **分割点ごとの経路は現状 `.summary` から取得できない。** 幾何処理の照合には
点線源（分割なし）を使う。全経路出力は POKER 側の対応待ち。

### `thinnedindices` ノード

サマリーの出力件数を制御する。省略時は既定値。

| キー | 対象 | 既定 |
|---|---|---|
| `sourcepoint` | 入力パラメータの分割点 | 10 |
| `pseudosourcepoint` | 入力パラメータの仮想点線源 | 10 |
| `detectorgrid` | 入力パラメータのグリッド点 | 10 |
| `detectorevaluation` | 計算出力のグリッド点 | 5 |
| `pathtrace` | `path_trace` の仮想点線源 | 5 |
| `buildupenergy` / `buildupmfp` | 多層ビルドアップ係数の表示数 | 3 / 3 |

### poker_cui のオプション（2.1.5 以降）

`poker_cui "入力" -p -s -t -l -a -c -o "サマリー" -d "線量" --path-input "経路"`

- `-p` 入力パラメータを書く（**分割点を得るにはこれが必要**）
- `-s` 線源ごとの計算データ・透過線情報
- `-t` 検出器ごとの総和（機械可読フォーマット）
- `-l` 同上（旧フォーマット。`-t` と併用すると無視され、通知が出る）
- `-a` `-p -s -t` と同じ
- `-c` 入力の検証と経路追跡のみ（`Run_PathTrace`）。線量計算をしない
- `--path-input FILE` CAD から抽出した経路ファイルを幾何として使う（実装途上）
- **`p,s,t,l,a` を何も指定しないとサマリーに何も書かれない**（警告＋終了コード 1）

終了コードは 0 正常 / 1 出力オプション未指定 / 2 入力エラー / 3 計算失敗。
80 mfp 超過とスラント角超過は **0 のまま**（どちらも結果はそのまま採用してよい）。

### その他

- ~~`path_trace` の材質名は 10 文字で切り詰められる~~ → **2.1.5 で修正済み**。
  原因は数値幅 `width = PRECISION + 6 = 10` を名前の `substr` に流用していたこと
- ~~`.summary` 末尾の `[!]` 警告行は YAML の外にある~~ → **2.1.2 で `warnings`
  ノードに構造化**。`code` / `severity` / `count` / `occurrences` を持つ
- 減衰係数ファイルは `lib_setting.dat` の `file_attenuation` が指す
  `atten2_xcom2.dat`（非干渉散乱と全断面の 2 列）。**減衰計算には全断面を使う**
- 80 mfp クランプは打ち切りではなく、それ以上の精度が意味を持たない領域での
  保守側の近似

---

## 4. poker_cui の改修（対応状況）

要望を出し、POKER 側（ユーザ）が 2.1.2〜2.1.5 で実装した。修正案の C++ は
こちらで作成し、ユーザがビルドして反映するという進め方をとった。

| 内容 | 状態 |
|---|---|
| 終了コードの整理（0/1/2/3） | **完了**。全 10 ケース検証済み |
| 検出事項の構造化（`warnings` ノード） | **完了**。code / severity / count / occurrences |
| 検証専用モード（`-c`、`Run_PathTrace`） | **完了** |
| 出力オプション未指定時の警告 | **完了** |
| 計算前の古い出力ファイル削除 | **完了** |
| 進捗・診断の cerr 分離 | **完了** |
| `-a`（`-p -s -t` の別名） | **完了** |
| 材質名の 10 文字切り詰めをやめる | **完了** |
| `.summary` を `-s` 付きでも YAML として読めるように | **完了**（`sources` 配列） |
| `.summary` / `.dose` / `.paths` のヘッダ統一 | **完了** |
| `.paths` 入力の受け入れ | オプションと `Run_PathInput` の枠組みまで。**中身は実装途上** |
| 分割点ごとの全経路出力 | 未対応（現状 `path_trace` は仮想点線源 9 点のみ） |
| `intermediate` / `result` のキー重複 | `sources` 配列化で解消 |

材料ライブラリの機械可読な照会は**取り下げた**。ファイル名も形式も今後ほとんど
変わらないとのことなので、パースを続ける方が prosess 起動のコストが無く、POKER が
入っていない環境でもフォールバックで動く。独自解釈のリスクは `matNum=` との
件数照合で軽減した。

### C++ 側の修正内容（参考）

| ファイル | 変更 |
|---|---|
| `main.cpp` | 終了コード、`warnings` 出力、`-a` / `-c` / `--path-input`、cerr 分離、古いファイル削除 |
| `CalculateDose_IO.cpp` | `sources` 配列化（`indent_block` で一括字下げ）、ヘッダ統一、名前の切り詰め解除 |
| `CalculateDose.cpp` | 無名名前空間の閉じ位置変更（`Calculate_Dose` を外出し）、`MergeAndTotal` の切り出し |
| `CalculateDose.h` | `Run_PathInput` の宣言、`Calculate_Dose` / `MergeAndTotal` の宣言 |
| `CalculateDose_PathInput.cpp` | 新規。`.paths` の読み込みと `Run_PathInput` |

`Run_PathInput` の設計は `Run_All` の 4 段（入力の解釈 → 経路 → 線量計算 →
マージ）のうち**経路だけを差し替える**形。1・3・4 は共有する。

## 5. 本セッションの成果（14 コミット、すべて push 済み）

### v1.6.0 — 材料システムのライブラリ準拠

材料一覧・密度範囲・ビルドアップ可用性をコード側に持たず、すべて
`%POKER_INSTALL_PATH%/LIB/` から読む。**カスタム材料を `lib_material.dat` に
追加すればコード変更なしに追随する**（`Borated_Poly` を仮ライブラリに足して確認済み）。

標準材料は `lib_material.dat` と `lib_setting.dat` の `buildup_material` の両方に
登録する。片方だけなら警告を出す。

**等価材料の自動選定を実データ方式に刷新。** 従来の実効 Z 最近傍は暫定実装だった。
散乱と吸収の競合がビルドアップを支配するので、

```
r(E) = μ_incoherent / (μ_total − μ_incoherent)
```

を 0.1〜3 MeV の 11 点で照合し、log r の差の RMS が最小の標準材料を選ぶ。僅差
（10% 以内）は実効 Z でタイブレーク。一致度スコアを応答に付与し、0.30 超は警告。

→ `Source_Dry` が `Lead` から **`Tungsten`** に変わった（0.6232 → 0.4389）。

**修正**: `poker_updateBuildupFactor` が `equivalent` を更新できなかった
（スキーマと DataManager の双方に無く、TaskManager だけが素通しする三層不整合。
`updateSource` と同型）。

### v1.6.1 — 等価材料テーブル、POKER 経路との照合

`lib_equivalent.dat` を `C:\Poker\LIB` に生成・設置。表にあればその値、無ければ
自前計算。食い違えば「表が古い可能性がある」と警告する。生成器は
`tools/gen_equivalent_table.mjs`（PKGMAT 実装時の参照実装。**常に全件再構築**すること）。

**POKER の `path_trace` と経路を照合**（点線源 4 × 検出器 6 = 24 経路）。材質の
並び・区間数の不一致 0、区間長の差は中央値 0.0023 cm・最大 0.0473 cm。
テッセレーション偏差 0.5 mm による内接近似の理論上限に収まる。

### v1.6.2 — `.paths` 1.1（線源点と重み）

上記「分割点の生成規則」の食い違いへの対処。`source_point:` に座標と重みを載せ、
`source_points_from:` で出所を記録。自前生成は検証専用として警告を出す。

### v1.6.3 — `.paths` 1.2（材質ごとの密度）

CAD 側で密度を指定してもツールがライブラリ密度を使っていた。`.paths` にも密度を
渡す経路が無く、材質名だけでは `Iron` がライブラリ密度 7.8 と解釈される。フィンの
スミアリング領域（0.2729 g/cm³）なら **29 倍の遮蔽**になり、**層厚は正しいので
距離照合を含むすべての検算を通過したうえで線量が桁で狂う**。

CAD のソリッドに `PokerDensity`（g/cm³）を設定すると上書きできる。新しい材料の
登録は不要で、POKER 側もゾーンの `density` 上書きで表現できる。

---

### POKER 2.1.2〜2.1.5 対応（`summaryParser.js`）

POKER 側の `.summary` が改善されたのに合わせ、パーサを新旧両対応にした。

```yaml
# POKER-SUMMARY
information:
  format: summary
  format_version: 1.0
  generator: POKER 2.1.5.1
  ...
input: {...}          # -p
sources:              # -s（線源ごとの配列。従来は重複キーで読めなかった）
  - name: P0_axis_mid
    intermediate: {...}
    result: {...}
result_total: {...}   # -t
warnings:             # 常時。何も無ければ warnings: []
  - code: BUILDUP_MFP_EXCEEDED
    severity: info
    count: 1
    occurrences: [{ source: 3, detector: 2, point: 0 }]
```

- `code` で判定する（文面の改訂や言語切替に影響されない）
- `SLANT_ANGLE_EXCEEDED` の注記を追加。80mfp 超過と同じく結果は採用してよい
- 旧形式の救済も残す。重複するトップレベルキーに添字を付けてパースし配列に戻す
- 新旧で検出器 6 個・H*(10) = 3.5928e-05 が一致することを確認

## 6. `.paths` パイプラインの現状

```
1. poker_cui model.yaml -p -t                        分割点(位置・重み)を出力
2. gen_paths.py                                      .summary を読み、CAD をトレース
3. poker_cui model.yaml --path-input model.paths -t  計算（← ここで詰まっている）
```

**1 と 2 は完成している。** 3 は `.paths` の読み込みと `Result` への詰め込みまで
動くが、その先の `Calculate_Dose` が `input.zones` を前提に組まれているため通らない。
`.paths` にはゾーンの概念が無い（CAD 側に無いので当然）。詳細と対応案は §11。

なお **YAML は FreeCAD が作るものではない。** 線源の核種・放射能・分割定義、
検出器、ビルドアップ設定は poker_mcp のツールで作る（本セッションでは検証を
急いで手書きした）。FreeCAD が担うのは幾何だけ。

仕様は `docs/manuals/PATHS_FORMAT.md`（v1.2）。サンプルは
`tools/samples/cask_small.paths`（96 レコード）と `cask_full.paths`
（57,600 レコード、4.92 MB）。

**ファイル全体が正しい YAML** になった（`.summary` / `.dose` と同じヘッダ形式）。
経路本体は `paths: |` のリテラルブロックに入れ、中身は 1 行 1 経路の独自形式のまま。
4.92 MB を **61 ms** でパースできる（js-yaml 実測）。57,600 行を YAML シーケンスに
すると膨れて重くなるため、この構成にした。

```yaml
# POKER-PATHS
information:
  format: paths
  format_version: 1.2
  n_source_points: 3840
  n_detectors: 15
materials:
  - { id: 4, name: Iron, density: 0.2729 }   # 密度は登録密度より優先
detectors:
  - { id: 0, name: D_side_r130, pos: [130, 0, 230] }
source_points:
  - { id: 0, pos: [4.5974, 0.91449, 36.667], weight: 3.2552e-05 }
paths: |
  0 0 5 | 2 106.244  1 75.1973  3 18.7963  1 5.63859  0 22.5539 | 2 2 106.244  1 83.5273
```

**YAML と `.paths` の 2 ファイルを渡す**設計にした（`poker_cui model.yaml
--path-input model.paths -t`）。`.paths` に入力を埋め込む案は、YAML を編集した後に
再生成し忘れると古い定義で計算される点と、対応関係を検証できなくなる点で採らなかった。

実規模の実績: 線源点 3,840 × 検出器 15、POKER 3.2 秒 + トレース 20.4 秒、
距離照合の最大相対誤差 3.66e-6、重み総和 0.999997、書式エラー 0。

**性能**: 約 290 µs/レイ。同心円筒殻では AABB が重なり全交差が必要なため BVH の
枝刈りが効きにくい。応答 5 分を上限とすると **約 100 万レイ**が実用上限
（線源 3,840 点なら検出器 267 点まで）。3D グリッド検出器は成立しないので、
**経路注入は既存の CSG 入力を置き換えるものではなく併存させる**。

---

## 7. 監査ツール（POKER 改造不要、今すぐ使える）

ある形状を**含むモデル**と**含まないモデル**に同一のレイ集合を通し、Σμt を比較する。
両モデルで線源も検出器も同じなので比を取ると線源強度も換算係数も相殺する。

`flux_ratio_estimate` は**非衝突線束比の推定値**で、**ビルドアップ係数を含まない**
（「線量比」ではない）。

### 4 事例（キャスクモデル）

| 対象 | 誤差の符号 | 支配経路の Δ | 最悪検出器の線束比 | 判断 |
|---|---|---|---|---|
| 蓋外周フィレット R40 | 非保守のみ | 0 | 0.981 | 無視してよい |
| 蓋の貫通孔 φ100 | 非保守のみ | 14.7 | 0.00023 | **無視できない** |
| 伝熱フィン（スミアリング） | **両方向** | +0.09 | 0.91〜1.30 | 保守と言えない |
| 吊上げトラニオン φ180 | 保守のみ | −2.26 | 317 | 無視してよい（余裕過大） |

**判断基準は形状の大きさではなく、支配経路にかかるかどうか。** 40 mm のフィレットは
無視でき、100 mm の孔は無視できず、180 mm のトラニオンは無視してよい。大きさの
順序と結論が一致しない。

**周期構造の平均化（スミアリング）は保守性を主張できない。** 同じ検出器で Δ が
+0.26 と −2.28 の両方に振れる。板の中を通る経路と隙間を抜ける経路で符号が反転する。

貫通孔の充填材については、鉄で埋めることは孔を無視することと数値上同一
（3 桁まで一致）。空洞として扱うのが保守側で、その保守性は孔直上で 6 倍程度。

### 推定値の妥当性

トラニオンは円柱で CSG に載るため POKER でも表現して突き合わせた。

- 比が 1 に近い領域（1.0〜1.2）では **2% 以内**で一致
- 比が大きく外れる領域では推定が過大（210 に対し 317）。分子・分母の両方に B が
  掛かるところ、遮蔽が厚い側（分母）の B が大きいため実計算の比が小さくなる
- ずれは**影響を過大に見積もる側**なので判定は保守側に倒れる

条件の不一致（CAD 側トラニオン 4 本 / POKER 側 1 本、CAD 側 1.25 MeV 単一 /
POKER 側 Co-60 2 群）が含まれ、切り分けはできていない。**`.paths` が通ったら
再評価する約束**になっている。

---

## 8. ファイル一覧

### tools/

| ファイル | 役割 |
|---|---|
| `ray_trace_tri.py` | レイトレーサ本体（tessellate + BVH + numpy） |
| `poker_lib.py` | POKER の LIB 読み込み（組成・減衰係数・ビルドアップ可用性） |
| `gen_paths.py` | `.paths` の生成 |
| `audit_mfp.py` | 簡易化の監査 |
| `compare_poker_trace.py` | POKER の `path_trace` との照合 |
| `make_cask_models.py` | キャスクモデル生成（フィレット、貫通孔、充填材） |
| `make_cask_features.py` | 伝熱フィン、トラニオン |
| `gen_equivalent_table.mjs` | `lib_equivalent.dat` の生成 |
| `samples/` | `.paths` サンプル、POKER 入力、spec |

### docs/manuals/

- `PATHS_FORMAT.md` — `.paths` の仕様（リーダ実装向け）
- `CAD_RAYTRACE.md` — レイトレースの背景・性能・監査事例
- `MATERIAL_SYSTEM.md` — 材料システム（ライブラリ連携、等価材料）

---

## 9. レイトレーサの実装上の注意

三角形化した形状に対し BVH を張り、Möller–Trumbore を numpy でバッチ処理する。
交差点を距離順に並べ、各ソリッドの内外フラグを反転させて区間ごとの材質を決める。

開発中に潰した 2 つのバグは、同種の実装で必ず出る。

- **始点が線源内部にある**場合があるため、レイを場面外まで後退させて初期の内外
  状態を実測し、あとで始点にクリップする
- **テッセレーションの継ぎ目**をレイが走ると同一位置で三角形 2 枚に当たり、内外
  フラグが 2 回反転して打ち消す。同一位置の重複ヒットは 1 オブジェクトにつき
  1 回だけ反転させる（線源が軸上にある経路は継ぎ目に乗りやすい）

区間の重なりは自動解決せず、バウンディングボックスの小さい方を採用して件数を報告する。

---

## 10. 進め方・スタイル

実装 → 隔離テスト（temp `POKER_MCP_HOME` に JSON-RPC を stdin 投入）→ commit → push。
ユーザは推奨に従う姿勢だが、**根拠を示すこと・誤りを認めること**を重視する。
push は毎回確認を取る。

このセッションでは私（アシスタント）の見立てが何度か外れた。速度見積り（10 µs/ray
と予想して実測 290 µs/ray）、フィレットの影響（1.7 mfp と予想して支配経路には
無影響）、繰り込み規則（影響は限定的と述べたが最大 11 mfp）、分割点の生成規則
（等面積分割と誤認）、入力パラメータの桁数（丸め量を一桁誤認）。**測る前に断定
しないこと。**

---

## 11. 次にやること

### POKER 側（ユーザ）

#### `Run_PathInput` — 線量計算ルーチンの見直しが必要

`.paths` の読み込みから `Result` への詰め込みまでは実装済みでビルドも通るが、
**その先の `Calculate_Dose` が動かない。** 調査で分かった理由は次のとおり。

`Calculate_Dose` は `input.zones`（YAML のゾーン定義）を前提に組まれている。

```cpp
// 減衰係数の引き当て: ゾーンの材質と密度から作り、以降はゾーンの索引で参照
vector<AttenuationCoefficient::Material> materials;
for (const auto& zone : input.zones)
    materials.push_back({ zone.material_name, zone.density });
intermediate.attenuation_coefficients = library.calculate_attenuation_coefficients(...);

// ビルドアップ層の特定: 経路の区間名と input.zones[].body_name を文字列照合
if (String::Equals(input.zones[z].body_name, path_rep.zones[...].name)) z1 = z;
```

一方 `.paths` が持つのは**材質名と厚さ**だけで、ゾーンという概念がない
（CAD 側にゾーンは無いので当然）。`PathTrace::Zone::name` には材質名を入れて
あるが、`input.zones[].body_name` とは一致しないので照合が通らない。

**YAML に body/zone を書けば済む話ではない。** `--path-input` のときは幾何が
`.paths` から来るので、YAML の立体定義は本来不要のはず。しかし `Calculate_Dose`
がゾーン索引で動いている以上、次のどちらかが要る。

1. `Run_PathInput` の中で `.paths` の `materials` から仮想的な `input.zones` を
   組み立てる（POKER 本体の改造は不要だが、対応付けの正しさを保証する責任が残る）
2. `Calculate_Dose` を「ゾーン索引」ではなく「材質名」で引くように見直す
   （本質的だが影響範囲が大きい）

いずれにせよ**線量計算ルーチンの見直しが必要**で、時間がかかる。2026-09 時点で
保留とした。

#### その他の未確認項目

- `.paths` の `detector` id と評価点の対応。現状は「検出器を平坦化した評価点の
  通し番号」として扱っているが、`gen_paths.py` は検出器 1 個 = 評価点 1 個の
  前提で id を振っている。グリッド検出器があると食い違う（`VerifyAgainstInput`
  で弾かれるので事故にはならない）
- **線源が複数ある場合は静かに間違う。** `.paths` は線源の区切りを持たないため、
  全点が 1 番目の線源として扱われる。線源点の座標・重みは `poker_cui -p` の
  出力から取っているので**区切りの情報は POKER 側にある**（`.summary` の
  `input:` に線源ごとの `point_source:` ブロックがある）。`gen_paths.py` が
  1 線源分だけ読んで捨てているだけなので、`.paths` に
  `sources: [{ name, n_points }]` を足せば対応できる。
  当面は**複数線源を検出したらエラーにする**チェックを入れるべき
- `is_too_thick` / `slant_angle` を設定していないので、80mfp 超過とスラント
  補正の判定が働かない
- 分割点ごとの全経路出力（`.paths` の照合に使いたい。優先度は低い）

### poker_mcp 側

- `--path-input` が動いたら、`.paths` 経由と CSG 経由で線量を突き合わせる。
  監査ツールの `flux_ratio_estimate` はビルドアップを含まない近似なので、
  その誤差特性を実計算で再評価する（トラニオンの 210 対 317 の切り分け）
- 監査事例の追加（配管群、ボルト列など周期構造の別パターン）

### 検証用の資産

- `tools/samples/cask_small.paths`（96 レコード）— リーダ開発用
- `tools/samples/cask_full.paths`（57,600 レコード、4.92 MB）— 実規模
- `tools/samples/cask_full.yaml` / `cask_verify.yaml` — 生成元の POKER 入力
- `C:\Users\yoshi\Desktop\cask_detailed.FCStd` / `cask_simple.FCStd` — CAD モデル
  （他の `.FCStd` は `make_cask_models.py` / `make_cask_features.py` で再生成可能）
