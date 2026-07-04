# 使用済燃料キャスク 線量評価デモ手順（FreeCAD + POKER-MCP）

FreeCAD で 3D キャスクモデルを作成し、POKER-MCP 経由で点減衰核コード POKER の遮蔽線量計算を行う一連の再現手順。R8 秋の大会デモ用。

## 0. 全体フロー

1. FreeCAD でキャスク 3D モデルを作成（同心円筒＋上下プラグ）
2. POKER-MCP ツールで等価の POKER 幾何・線源・材料・検出器を構築（cm 系）
3. `poker_executeCalculation`（内部で `poker_cui -t -s`）で線量計算
4. サマリーファイルの `result_total` から線量を取得
5. 距離プロファイル・規制限度比較で評価

FreeCAD は mm、POKER は cm で扱うため、幾何寸法は 1/10 換算する。

## 1. 環境

- **poker-mcp サーバ**: `node C:/Users/yoshi/Desktop/poker_mcp/src/mcp_server_stdio_v4.js`
  - 環境変数 `POKER_MCP_HOME`（作業ディレクトリ, 例 `C:/Users/yoshi/poker_mcp_workspace`）, `POKER_INSTALL_PATH`（`C:/Poker`）
  - 入力/出力は `POKER_MCP_HOME/tasks/poker.yaml`
- **freecad-mcp サーバ**: FreeCAD 内で Python を実行（3D モデル作成）
- **POKER 本体**: `C:/Poker`（`poker_cui`, `POKER.exe`）、材料ライブラリ `C:/Poker/LIB/lib_material.dat`
- コード変更は Claude Desktop の**再起動**で反映される。
- ログ: `C:/Users/yoshi/AppData/Roaming/Claude/logs/mcp-server-poker-mcp.log`

## 2. FreeCAD キャスクモデル作成

同心円筒（mm）:

| 層 | 材料 | 半径/厚さ |
|---|---|---|
| 線源空洞 | Source_Dry | r 0–750 |
| ガンマ遮蔽 | Iron | r 750–1150（厚 400） |
| 中性子遮蔽 | Polyethylene | r 1150–1250（厚 100） |
| 外筒 | Iron | r 1250–1280（厚 30） |
| 底プラグ | Iron | z 0–300 |
| 有効部（軸方向） | — | z 300–4300（H 4000） |
| 蓋プラグ | Iron | z 4300–4650 |

外径 2560mm・全高 4650mm・空洞径 1500mm。

freecad-mcp の `execute_code` で Part API により構築（`Part.makeCylinder` と `cut` で環状体を作成）、`.FCStd` に保存。カットアウェイは各層を 1 象限カットした一時コピーで表示。

## 3. POKER モデル構築（MCP、cm 系）

寸法は 1/10 換算（r_cav=75, r_gamma=115, r_neut=125, r_out=128、底 0–30, 有効 30–430, 蓋 430–465）。

### 3.1 リセット
- `poker_resetYaml`（`force=true, preserve_units=true, atmosphere_material=VOID`）。既存モデルは自動バックアップ。

### 3.2 ボディ（RCC 6 + CMB 3）
`poker_proposeBody`:
- SRC_cav: RCC r75, bottom `0 0 30`, height `0 0 400`
- IRN_gam: RCC r115（同 z）
- PLY_neu: RCC r125（同 z）
- OUT_full: RCC r128（同 z）
- BOT_plug: RCC r128, bottom `0 0 0`, height `0 0 30`
- LID_plug: RCC r128, bottom `0 0 430`, height `0 0 35`
- Z_gamma: CMB `IRN_gam - SRC_cav`
- Z_neut: CMB `PLY_neu - IRN_gam`
- Z_outer: CMB `OUT_full - PLY_neu`
→ `poker_applyChanges`

### 3.3 ゾーン（密度は省略＝カタログ既定）
`poker_proposeZone`（材料名は大文字小文字不問）:
- SRC_cav → `source_dry`（→ 密度 1.97 自動）
- Z_gamma → `iron`（→ 7.8）
- Z_neut → `polyethylene`（→ 0.92）
- Z_outer, BOT_plug, LID_plug → `iron`

### 3.4 線源
`poker_proposeSource`:
- name `SpentFuel`, type RCC, geometry {bottom_center `0 0 30`, height_vector `0 0 400`, radius 75}
- division {r:UNIFORM 8, phi:UNIFORM 16, z:UNIFORM 30}（収束寄り。粗いと近傍接触点を過小評価）
- inventory [Cs137, Co60 …]、cutoff_rate 0.0001
- `poker_confirmDaughterNuclides(action=confirm)` で Cs137 の娘 Ba137m（分岐比 0.9439）を追加

### 3.5 ビルドアップ
`poker_proposeBuildupFactor`（`use_slant_correction=false, use_finite_medium_correction=false`）:
- `Iron`
- `source_dry` → 非標準材料なので**光子実効Z最近傍の等価材料 `Lead` が自動付与**（equivalent: Lead）
- `Polyethylene`

### 3.6 検出器
`poker_proposeDetector`（点検出器: name, origin `x y z`, show_path_trace=false）:
- 側面プロファイル（z=230）: r=130(接触2cm), 140, 160, 200, 228(1m), 328(2m)
- 蓋軸上プロファイル（x=y=0, 蓋上面 z=465 基準）: z=467(2cm), 475(10cm), 495(30cm), 565(1m), 665(2m)
→ `poker_applyChanges`

## 4. 計算実行と結果取得

`poker_executeCalculation`（`yaml_file="poker.yaml"`, `summary_options.show_total_dose=true`）。
- 内部で `poker_cui -t -s poker.yaml` を実行。
- 出力: `poker.yaml.summary`（サマリー）、`poker.yaml.dose`（線量）。
- **線量は基本的にサマリーファイルから取得**。
  - 「入力パラメータ」= 入力の確認、「intermediate」= 計算に使ったデータ（減衰係数・ビルドアップ等）、「result」= 各線源→各検出器、「**result_total**」= 各検出器の全線源総和線量。
- 評価量: E(AP)実効線量[µSv/h]、DskinM(AP)[µGy/h]、H\*(10)[µSv/h]。規制の線量当量率比較には H\*(10) を用いる。

## 5. 結果評価

### 5.1 距離プロファイル（本デモ実測値・光子のみ）
側面 E(AP)[µSv/h]: 2cm 1.56e-2 → 1m 9.83e-3 → 2m 6.83e-3（単調減少、近傍で緩慢＝大型線源効果）。
蓋軸上 E(AP)[µSv/h]: 2cm 1.07 → 1m 0.889 → 2m 0.523。
**蓋方向が側面の約 68–90 倍**（蓋鉄 35cm ＜ 側面実効 ~43cm、かつ軸上は自己遮蔽小）。線量は蓋方向が律速。

### 5.2 規制限度と線源強度上限
限度: 表面 2 mSv/h、表面 1m 100 µSv/h。点減衰核計算では**線量は線源強度に厳密比例**するため、限度/現状 で許容倍率を算出できる。
本デモ（光子のみ）では**蓋 1m 点が律速**（限度 100 µSv/h は表面 2000 の 20 倍厳しく、蓋は薄い）。現状 H\*(10) から逆算した許容最大は現状スペクトル比で約 96 倍。
※ 実使用済燃料は中性子源があり 1m 線量に上乗せされるため、許容線源はこれより小さい。

## 6. 材料システムの要点（本 MCP の機能）

- 材料は `lib_material.dat` が正。名称は大文字小文字不問で正式名に正規化（`Aluminum`→`Aluminium`）。
- ゾーン密度は省略可（カタログ既定を採用）。非標準材料（`Source_Dry` 等）も使用可。
- ビルドアップは非標準材料に対し光子実効Z（Mayneord 2.94）最近傍の標準材料を equivalent 自動付与。
- `deleteBody` は `cascade` フラグ（依存ゾーンを先に削除、opt-in）。
- `radioactivity` 上限は 1e18 Bq（キャスク規模対応）。
- 詳細: `docs/manuals/MATERIAL_SYSTEM.md`。

## 7. 注意点

- **「too thick」警告**は無害: 全材料 80 mfp 対応で、超過分は 80 mfp 値にクランプ（保守側）。本デモで超過するのは寄与ゼロの Ba137m 31–37 keV X線のみ。
- **収束**: 近傍接触点は線源分割の影響が大きい。発表用に数値を確定するなら分割を段階的に細かくして頭打ちを確認。
- **光子のみ**: 中性子は未考慮。実評価では中性子源・線量を別途考慮。
