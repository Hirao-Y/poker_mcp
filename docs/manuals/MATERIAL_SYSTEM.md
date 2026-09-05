# 材料システム（Material System）

POKER MCP の材料システムは、POKER 本体のライブラリフォルダ **`%POKER_INSTALL_PATH%/LIB/`** を単一の情報源（source of truth）として動作します。実行時に `src/utils/MaterialCatalog.js` が次の 3 ファイルを読み込みます。

| ファイル | 用途 |
|---|---|
| `lib_material.dat` | 材料の密度と元素組成（標準材料＋カスタム材料） |
| `lib_setting.dat` | 単層ビルドアップデータを持つ標準材料の一覧、使用する減衰係数ファイル名 |
| `atten2_xcom2.dat`（`lib_setting.dat` の `file_attenuation` で指定） | 元素ごとの光子質量減衰係数（非干渉散乱／全断面） |
| `lib_equivalent.dat`（任意） | カスタム材料のビルドアップ等価材料の事前計算表 |

**材料一覧をコード側に持たないことが設計方針です。** ライブラリに材料を追加すれば、サーバを再起動するだけで検証・密度・ビルドアップ等価材料のすべてが追随します。ライブラリが読めない環境では、既定の標準材料 13 種にフォールバックして動作を継続します。

## 材料名の指定

- **正式名は `lib_material.dat` の表記**に従います。
- **大文字小文字は無視**して指定できます（内部で正式名へ正規化）。例: `iron` / `IRON` → `Iron`、`source_dry` → `Source_Dry`。
- 米綴り **`Aluminum` は公式綴り `Aluminium` に正規化**されます。
- カタログに無い材料はエラーとなり、拒否メッセージにカタログ全材料が列挙されます。

## 標準材料とカスタム材料

**標準材料**は `lib_setting.dat` の `buildup_material` に列挙された材料で、固有の単層ビルドアップ係数データを持ちます。現在は次の 13 種です。

| 材料 | 密度 [g/cm³] | 材料 | 密度 [g/cm³] |
|---|---|---|---|
| Carbon | 2.2 | Water | 1.0 |
| Aluminium | 2.7 | Concrete | 2.1 |
| Iron | 7.8 | PyrexGlass | 2.23 |
| Copper | 8.9 | AcrylicResin | 1.19 |
| Tungsten | 19.0 | Polyethylene | 0.92 |
| Lead | 11.0 | Soil | 1.5 |
| Air | 0.001205 | | |

**カスタム材料**は `lib_material.dat` に登録されているがビルドアップデータを持たない材料です。ゾーンの材料としてそのまま使え、減衰計算には自身の組成と密度が使われます。ビルドアップ係数のみ標準材料で代用します（後述の `equivalent`）。

同梱のカスタム材料と自動選定される等価材料は次のとおりです。

| 材料 | 密度 [g/cm³] | 等価材料 | 一致度 |
|---|---|---|---|
| SUS_A | 7.8 | Iron | 0.013 |
| SUS_B | 7.7 | Iron | 0.015 |
| Cast_Iron | 7.0 | Iron | 0.042 |
| Concrete_Si | 2.156 | Concrete | 0.055 |
| Heavy_concrete_IL | 4.4 | Iron | 0.249 |
| Heavy_concrete_FP | 4.8 | Iron | 0.358 ⚠ |
| Heavy_concrete_T | 3.86 | Iron | 0.434 ⚠ |
| Source_Dry | 1.97 | Tungsten | 0.439 ⚠ |
| Concrete_Ca | 2.156 | Soil | 0.451 ⚠ |

`VOID` は非遮蔽領域（密度指定不可）。

### カスタム材料を追加する

1. `lib_material.dat` の `matNum=` を 1 増やす。
2. ファイル末尾に「材料名 / （任意で `!` 始まりのコメント行）/ `密度 元素数` / `Z 重量分率` × 元素数」のブロックを追記する。
3. MCP サーバを再起動する。

コードの変更は不要です。追加した材料は直ちに `proposeZone` の材料として使え、`proposeBuildupFactor` では等価材料が自動選定され、密度検証の範囲もライブラリ密度から自動生成されます（登録密度の ±10%）。

### 読み込み時の整合チェック

ライブラリの記述ミスを黙って見逃さないよう、起動時に 2 つの照合を行い、食い違えば警告をログに出します。

| チェック | 検出できること |
|---|---|
| 材料数と `matNum=` の宣言値 | 材料の取りこぼし、`matNum=` の更新漏れ |
| `lib_setting.dat` の標準材料が `lib_material.dat` に存在するか | 標準材料の片方だけの登録 |

前者は実際に必要でした。`lib_material.dat` は `matNum=` の直後に空行が無く最初の材料が続くため、ブロック分割が 1 つずれて先頭の `Carbon` を取りこぼし、21/22 材料しか読めていない時期がありました。件数の照合があれば即座に気づけます。

警告はログファイル（`%POKER_MCP_HOME%/logs/combined.log`）に出ます。MCP サーバは stdout を汚さないため、コンソールには表示されません。

例（ポリエチレンにホウ素 5wt% を添加した材料を追加した場合）:

```
Borated_Poly
! Ref    : 5wt% B in polyethylene
0.95 3
1 0.1365
5 0.0500
6 0.8135
```

→ `equivalent: Polyethylene`（一致度 0.0027）が自動で割り当てられます。

## ゾーンの密度（poker_proposeZone）

- `density` は **省略可能**。省略時は `lib_material.dat` のカタログ密度が自動採用されます。
- 標準・カスタムいずれの材料もゾーンに設定できます。

## ビルドアップ等価材料（equivalent）

標準材料は固有のビルドアップデータを使います。カスタム材料には `equivalent` として標準材料を割り当て、**減衰は自身の組成・密度で、ビルドアップ係数だけ等価材料のものを借りる**形になります。

### 自動選定の原理

等価材料は 2 通りの経路で決まります。**`lib_equivalent.dat` に当該材料が載っていればその値を使い、載っていなければ以下の計算で選定します。**

ビルドアップ係数を支配するのは、光子が散乱して生き残るか吸収されるかの競合です。そこで各材料について

```
r(E) = μ_incoherent(E) / ( μ_total(E) − μ_incoherent(E) )     （散乱／吸収）
```

を `atten2_xcom2.dat` の組成加重で求め、**標準材料のうち r(E) が最も近いもの**を選びます。μ の比なので密度は相殺し、組成だけで決まります。

単一エネルギーでの一致は選ぶエネルギー次第で答えが変わるため、**0.1〜3 MeV の 11 点で log r の差の RMS** を取り、実用帯域全体で合わせています（`MaterialCatalog.BUILDUP_MATCH_ENERGIES`）。この値が **一致度スコア**で、0 が完全一致です。

スコア差が僅差（10% 以内）の候補が複数ある場合は、指標への過適合を避けるため**光子実効 Z（Mayneord 型・指数 2.94）の近さ**でタイブレークします。

減衰係数ファイルが読めない場合は、実効 Z の最近傍による選定にフォールバックします。

### 事前計算表（lib_equivalent.dat）

選定結果は組成と減衰係数だけで決まり、線源にも体系にも依存しません。したがって実行時に計算する必要はなく、事前に表として `LIB` に置けます。POKER GUI と poker_mcp が同じ表を引けば、選定アルゴリズムを 2 箇所に実装せずに済みます。

```
# POKER equivalent buildup material table 1.0
generated : 2026-09-05 11:59:05  by poker_mcp tools/gen_equivalent_table.mjs
source    : lib_material.dat   2025-02-12 23:12:44   22 materials
source    : lib_setting.dat    2026-05-19 08:09:12   13 standard
method    : scatter/absorb ratio  r(E) = mu_incoherent / (mu_total - mu_incoherent)
            log-RMS over 11 points, 0.1-3 MeV
#
# material          equivalent    score   note
SUS_A               Iron          0.0128
Source_Dry          Tungsten      0.4389  coarse
```

書式の要点は 3 つです。データ行は行頭から始まり、ヘッダの継続行は字下げします。第1トークンがカタログに実在する材料名の行だけがエントリとして扱われます。`score` と `note` は任意で、記録用です。

生成は `node tools/gen_equivalent_table.mjs [出力先]`。既定の出力先は `%POKER_INSTALL_PATH%/LIB/lib_equivalent.dat` です。**表は常に全件を再構築してください。** 標準材料が増えると既存カスタム材料の選定結果も変わりうるため、追記だけでは古い選定が残ります。

poker_mcp は表を読んだ際に自前計算と突き合わせ、食い違えば「表が古い可能性がある」と警告します（採用するのは表の値）。ライブラリを更新したら再構築してください。

なお `equivalent` に明示的なエネルギーを指定して選定させる場合（`nearestBuildupEquivalent(material, energy)`）は、表を使わずその条件で計算します。表は既定条件（0.1〜3 MeV）の結果だからです。

### 一致度の読み方

| スコア | 意味 |
|---|---|
| 〜0.05 | 実質的に同一の挙動。鉄合金→Iron、Si 系コンクリート→Concrete など |
| 0.05〜0.30 | 実用上許容できる代用 |
| 0.30 超 | **標準材料に近いものが無い**。応答に警告と候補上位 3 件が付きます |

スコア 0.30 超の材料（重量コンクリート、Ca 系コンクリート、Source_Dry）は、標準材料のカバー範囲の隙間に落ちています。ビルドアップ係数の不確かさとして結果の解釈に反映してください。

### 明示指定と変更

```jsonc
// 自動選定に任せる
poker_proposeBuildupFactor { "material": "Source_Dry",
  "use_slant_correction": false, "use_finite_medium_correction": false }
// → equivalent: Tungsten, 一致度 0.4389（警告付き）

// 明示指定
poker_proposeBuildupFactor { "material": "Source_Dry", "equivalent": "Lead", ... }

// 後から変更
poker_updateBuildupFactor { "material": "Source_Dry", "equivalent": "Lead" }

// 指定を解除（空文字）
poker_updateBuildupFactor { "material": "Source_Dry", "equivalent": "" }
```

制約は 2 つです。`equivalent` に指定できるのは単層ビルドアップデータを持つ標準材料だけで、標準材料自身に `equivalent` を設定することはできません（自前のデータを持つため意味がない）。いずれも違反すると検証エラーになります。

## 多層ビルドアップ

`lib_setting.dat` には `twolayer_buildup_material` と `threelayer_buildup_material` が列挙されていますが、意味が異なります。

- **2層**: 任意の標準材料 2 種の組合せが計算可能です（Air・VOID は層材料に使いません）。`lib_setting.dat` の 16 ペアは POKER GUI の入力チェックが提示する範囲であって、計算上の制約ではありません。
- **3層**: 実データがあるのは `Concrete-Iron-Concrete` と `Iron-Concrete-Iron` の 2 パターンのみです。

層の順序は**線源側から検出器側**へ向かう並びで定義します。

## 立体の削除とカスケード（poker_deleteBody）

「立体を作成 → 立体にゾーンを割り当て」というライフサイクルのため、立体を削除する場合は **先に依存ゾーンを削除** しないと、立体の存在しない孤立ゾーンが残ります。

- 依存ゾーンがある立体を素の `deleteBody` で削除しようとするとエラーになります。
- **`cascade: true`** を明示した場合のみ、依存ゾーンを先に削除してから立体を削除します（暗黙削除を避けるための opt-in。既定は `false`）。
