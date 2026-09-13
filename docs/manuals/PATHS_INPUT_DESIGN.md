# `.paths` 受け入れのための準備メモ

POKER 側で `--path-input` を実装するにあたり、2 つの準備が必要。

1. 体積線源ごとの透視線の区別（線源番号の割り当て）
2. `.paths` の材料情報と経路情報から、POKER 内部の透視線情報を再構成

本メモは `CalculateDose.cpp` を読んで整理したもの。**推測を含む箇所は明示する。**

---

## 0. POKER が透視線をどう扱っているか

### 計算の流れ

```
Input::From(yaml, library)
  ├ traverse_ranges   立体（CMB の集合演算を保持）
  ├ zones             ゾーン定義（body_name, material_name, density, index）
  │                   zones[i].index が traverse_ranges[] を指す
  └ pseudo_source_points  線源ごとの分割点

Calculate_PathTrace(input, ...)
  線源ごと × 検出器ごと × 評価点ごと × 分割点ごとに:
    calculate_ranges(ranges, pt_source, pt_detector, traverse_ranges, ...)
      → ranges[i] = traverse_ranges[i] と直線の交差区間（区間の集合）
    get_path_trace(ranges, ..., zones, zone_atmosphere, unit)
      → vector<PathTrace::Zone>（距離順に並べた区間列）
    get_buildup_material(trace, buildup_factors)
      → (numlayers, first_zone, second_zone, third_zone, material_name)

Calculate_Dose(input, path_results, library, ...)
  減衰:     ranges[zones[j].index].length() × attenuation_coefficients[j]
  ビルドアップ: 上の mfp を buildup_first_zone / second_zone で 3 つに振り分け
```

### `zones` と `ranges` が分かれている理由

`zones` は入力の静的な定義。`ranges` は透視線ごとに変わる幾何計算の結果。

`zone.index` による間接参照になっているのは、**CMB のような集合演算の結果を
`traverse_range` が保持する**ため。`Z_gamma = IRN_gam - SRC_cav` のような差分
立体では、透視線との交差が連続した 1 区間になるとは限らない。円環を横切れば
2 区間、複雑な形状ならもっと増える。だから `Range` は区間の集合を持ち、
`ranges[zone.index].length()` はその合計長を返す。

`get_path_trace` が `set<ZoneForSort>` に `segment.min` / `segment.max` を入れて
距離順に並べ直しているのは、この分断された区間を経路順に整列するため。

### 減衰とビルドアップで順序の扱いが違う

**減衰は順序に依らない。** 材料ごとの合計長に、その材料の減衰係数を掛けて足す
だけ。透視線上でどの順に並んでいるかは関係ない。

**ビルドアップは順序が効く。** 単層なら透視線上のいずれかを代表材料に選び、
その材料の表から「全材料の mfp 合計」に対する係数を引く。多層なら層の境界の
前後で mfp を合計し、各層の材料の係数をその厚さに対して引く。

`buildup_first_zone` / `second_zone` はこの境界を表す。

---

## 1. 体積線源ごとの区別

### 現状

`.paths` は `source_point: { id, pos, weight }` の列挙のみで、どの線源に属するか
の情報がない。`Run_PathInput` は `Result` を 1 つしか作らないため、**線源が
複数あると全点が 1 番目の線源として扱われ、静かに間違う。**

### 区切りの情報はどこにあるか

**POKER 側にある。** `gen_paths.py` は線源点を `poker_cui -p` の出力から読んで
おり、`.summary` の `input:` セクションには線源ごとに `point_source:` の
ブロックが分かれている。

```
- name: SpentFuel
  point_source:
    - { position: ..., weight: ... }   # 3840 点
- name: Activated_Parts
  point_source:
    - { position: ..., weight: ... }   # 480 点
```

現在の `gen_paths.py` は `source_name` で 1 つだけ選び、残りを捨てている。
**情報を持っていながら書き出していない**だけなので、対応は容易。

FreeCAD 側に線源の概念はない（点 A → 点 B のレイの列挙でしかない）。区切りは
POKER の入力に由来する情報を転記するもの。

### 提案する形式（`.paths` 1.3）

```yaml
information:
  n_sources: 2
  n_source_points: 4320
sources:
  - { id: 0, name: SpentFuel, n_points: 3840 }
  - { id: 1, name: Activated_Parts, n_points: 480 }
source_points:
  - { id: 0, pos: [...], weight: ... }      # id 0..3839 → source 0
  - { id: 3840, pos: [...], weight: ... }   # id 3840..4319 → source 1
```

`source_point` の id は通し番号のまま、`sources` の `n_points` で区切る。
POKER 側は id から線源を逆引きして、線源ごとに `Result` を作る。

代替案として `source_points` の各要素に `src: 0` を持たせる方法もあるが、
3,840 点すべてに書くとファイルが膨れるので `n_points` による区切りを推す。

### 当面の措置

`.paths` 1.3 の対応前でも、**複数線源を検出したらエラーにする**チェックは
入れるべき。`Run_PathInput` で `input.sources.size() > 1` なら中止する。
現状は `VerifyAgainstInput` が線源点の総数しか見ないので通ってしまう。

---

## 2. 透視線情報の再構成

### 再構成すべきもの

| 対象 | 内容 | `.paths` から作れるか |
|---|---|---|
| `input.zones` | 材質名・密度の一覧（減衰係数の索引に対応） | 作れる |
| `PathTrace::Zone[]` | 区間ごとの材質・長さ・始終点座標 | 作れる（実装済み） |
| `ranges` | ゾーンごとの交差区間 | **作れない**（`traverse_ranges` 由来） |

3 つ目が障壁。`Calculate_Dose` の減衰計算は `path_traces` ではなく `ranges` を
直接使っている。

```cpp
for (size_t j = 0; j < input.zones.size(); j++)
{
    const double& length_zone_cm = length_to_cm * ranges[input.zones[j].index].length();
    const auto& coeffs = intermediate.attenuation_coefficients[j];
    ...
}
```

`.paths` には立体がないので `ranges` は作れない。**この部分を、経路の区間長から
直接 mfp を積算する形に変える必要がある。**

### 索引体系の不整合（既存の問題）

上のループは `j`（`input.zones` の索引）を `path_rep.buildup_first_zone`
（`path_trace.zones` の索引）と比較している。

```cpp
if (j <= path_rep.buildup_first_zone) lengths_in_MFP[i][k][0] += ...;
else if (j <= path_rep.buildup_second_zone) lengths_in_MFP[i][k][1] += ...;
```

**この 2 つは別の索引体系である。** `CalculateDose.cpp` のコメントにも次のように
書かれている。

> このinput.zoneからzoneのlengthを計算する方法は、path_repのpath_traceのなかの
> どのzoneが該当するのかはわからない。ならびの順番が関係ないからね・・
> material_nameでEqualをとるしかない。

`input.zones` は入力の記述順、`path_trace.zones` は透視線上の距離順で並ぶ。
一致する保証はない。**これは `.paths` 対応とは独立した既存の問題**だが、
`.paths` 方式では経路の区間列を直接使うことになるので、同時に整理できる。

### 提案する再構成

**`input.zones` を `.paths` の材質から組み立てる。**

```
.paths の materials（VOID を除く）を順に input.zones へ
  zone.body_name     = 材質名（経路側の name と一致させる）
  zone.material_name = 材質名
  zone.density       = .paths の density があればそれ、無ければライブラリ登録密度
  zone.index         = 使わない（ranges を参照しないため）
```

これで `attenuation_coefficients[j]` が材質ごとに引ける。

**減衰の積算を経路の区間から行う。**

```
各透視線 path_rep について:
  材質ごとの合計長を path_rep.zones から求める（VOID を除く）
    len[material] += zone.length
  mfp を積算
    for each material m:
      j = material_index(m)          // input.zones の索引
      mfp += len[m] × attenuation_coefficients[j][k].value
```

減衰は順序に依らないので、これで従来と同じ値になる。

**ビルドアップ層は `get_buildup_material` で決める（方針確定）。**

`path_trace.zones` を再構成できれば、既存の `get_buildup_material` をそのまま
呼べる。`.paths` の第 3 区画（縮約後のビルドアップ指定）は**生成側の判断を
記録した参考情報であり、POKER は読まない**。

理由は、ビルドアップ材料の選定が物理的な判断であり、生成側が決めて POKER の
判断を上書きすべきではないため。単層の選定基準には一般に確立したものがなく、
実務では「mfp 最大の材質」と「最も線量が高くなる材質」が使われる。後者は材質
ごとに係数を引いて線量を比較する必要があり、生成側では扱えない。

多層の自動選定は判断が多く（どの材質を残すか、残さない層をどう扱うか、層順が
2層データの規約と合うか、組み合わせがライブラリにあるか）、生成側で決めるには
根拠が弱い。現在の縮約規則は繰り込み量が最大 3.57 mfp に達し、妥当性も未検証。

第 3 区画は将来の自動選定の検討材料として残す。生成側と POKER 側の判断が
食い違えば、縮約規則を見直す材料になる。

### 実装の見通し

`Calculate_Dose` に分岐を足すか、`.paths` 用の減衰積算を別関数にするか。
既存の `ranges` 経由の処理と並列に置くのが影響が小さい。

```cpp
if (from_paths) {
    // path_rep.zones から材質ごとに合計長を求めて mfp を積算
} else {
    // 従来: ranges[zones[j].index].length() を使う
}
```

---

## 3. 要確認の項目

| 項目 | 内容 |
|---|---|
| 索引体系 | `j` と `buildup_first_zone` の対応。テストで確認するしかない |
| スラント補正 | `slant_angle` / `is_slant_correction` を `.paths` から設定できるか未検討 |
| 80mfp クランプ | `is_too_thick` の判定をどこで行うか |
| ATMOSPHERE | `.paths` の VOID 区間を `zone_atmosphere` として扱うか、`zones` の 1 つにするか |
| グリッド検出器 | `.paths` の detector id と評価点の対応。現状は評価点 1 個前提 |

---

## 4. 段階的な進め方の案

1. **複数線源のエラーチェック**（すぐできる、事故防止）
2. **単一線源・点検出器のみで通す**（`input.zones` の組み立てと減衰積算の変更）
3. 既存の CSG モデルと同じ体系で計算し、線量が一致することを確認
4. 複数線源への対応（`.paths` 1.3、線源ごとの区切りを持たせる）
5. グリッド検出器への対応

3 が最初の関門。`tools/samples/` に同じ体系の YAML と `.paths` があるので、
CSG 経由と `.paths` 経由で線量を突き合わせられる。
