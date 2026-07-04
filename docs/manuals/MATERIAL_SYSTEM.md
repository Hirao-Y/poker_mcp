# 材料システム（Material System）

POKER MCP の材料システムは、POKER 本体の材料ライブラリ **`%POKER_INSTALL_PATH%/LIB/lib_material.dat`** を単一の情報源（source of truth）として動作します。実行時に `src/utils/MaterialCatalog.js` がこのファイルを読み込み、材料の存在確認・密度・組成・ビルドアップ等価材料を提供します。

## 材料名の指定

- **正式名は `lib_material.dat` の表記**に従います。
- **大文字小文字は無視**して指定できます（内部で正式名へ正規化）。例: `iron` / `IRON` / `Iron` → `Iron`、`source_dry` / `SOURCE_DRY` → `Source_Dry`。
- 米綴り **`Aluminum` は公式綴り `Aluminium` に正規化**されます。
- カタログに無い材料はエラーとなり、拒否メッセージにカタログ全材料が列挙されます。

## サポート材料一覧（lib_material.dat 由来）

### 標準材料（固有のビルドアップデータを持つ 13 種）

| 材料 | 密度 [g/cm³] |
|---|---|
| Carbon | 2.2 |
| Aluminium | 2.7 |
| Iron | 7.8 |
| Copper | 8.9 |
| Tungsten | 19.0 |
| Lead | 11.0 |
| Air | 0.001205 |
| Water | 1.0 |
| Concrete | 2.1 |
| PyrexGlass | 2.23 |
| AcrylicResin | 1.19 |
| Polyethylene | 0.92 |
| Soil | 1.5 |

### ユーザ材料（ビルドアップは等価材料を使用）

| 材料 | 密度 [g/cm³] | ビルドアップ等価材料 |
|---|---|---|
| Source_Dry | 1.97 | Lead |
| Concrete_Si | 2.156 | Concrete |
| Concrete_Ca | 2.156 | Soil |
| Heavy_concrete_T | 3.86 | Iron |
| Heavy_concrete_FP | 4.8 | Iron |
| Heavy_concrete_IL | 4.4 | Iron |
| SUS_A | 7.8 | Iron |
| SUS_B | 7.7 | Iron |
| Cast_Iron | 7.0 | Iron |

`VOID` は非遮蔽領域（密度指定不可）。

## ゾーンの密度（poker_proposeZone）

- `density` は **省略可能**。省略時は `lib_material.dat` のカタログ密度が自動採用されます。
- 標準・非標準（`Source_Dry`, `SUS_A` 等）いずれの材料もゾーンに設定できます（非標準材料は密度検証もカタログを参照）。

## ビルドアップ等価材料（poker_proposeBuildupFactor）

- 標準 13 材料は固有のビルドアップデータを使用します。
- 非標準材料は、組成から算出した **光子実効 Z（Mayneord 型・指数 2.94）** で最近傍の標準材料を `equivalent` として **自動付与** します。
- `equivalent` を明示指定して上書きも可能です。
- 自動割当の対応: `Source_Dry`→`Lead`、`Concrete_Si`→`Concrete`、`Concrete_Ca`→`Soil`、`Heavy_concrete_*`→`Iron`、`SUS_A`/`SUS_B`/`Cast_Iron`→`Iron`。

## 立体の削除とカスケード（poker_deleteBody）

「立体を作成 → 立体にゾーンを割り当て」というライフサイクルのため、立体を削除する場合は **先に依存ゾーンを削除** しないと、立体の存在しない孤立ゾーンが残ります。

- 依存ゾーンがある立体を素の `deleteBody` で削除しようとするとエラーになります。
- **`cascade: true`** を明示した場合のみ、依存ゾーンを先に削除してから立体を削除します（暗黙削除を避けるための opt-in。既定は `false`）。
