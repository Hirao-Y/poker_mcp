# 🚀 QUICK_REFERENCE.md - 放射線遮蔽計算クイックリファレンス

**対象読者**: 放射線遮蔽研究者・実務者  
**更新日**: 2025年1月24日  
**バージョン**: 1.2.0 MCP Edition
**目的**: 日常業務での迅速な参照と効率的な作業支援

---

## 📖 第1章: 28メソッド早見表

### 🔷 Body操作系(3メソッド) - 10種類立体完全対応

| メソッド | 機能 | Claude指示例 |
|---------|------|-------------|
| **poker_proposeBody** | 新規立体作成 | 「球体を作成してください。中心(0,0,0)、半径50cm」 |
| **poker_updateBody** | 立体修正 | 「shield_wallの厚さを40cmに変更してください」 |
| **poker_deleteBody** | 立体削除 | 「test_sphereを削除してください」 |

### 🧪 Zone操作系(3メソッド) - 材料設定

| メソッド | 機能 | Claude指示例 |
|---------|------|-------------|
| **poker_proposeZone** | 材料設定 | 「shield_wallにコンクリート（密度2.3(g/cm³)）を設定」 |
| **poker_updateZone** | 材料変更 | 「密度を2.5(g/cm³)に変更してください」 |
| **poker_deleteZone** | 材料削除 | 「test_sphereの材料設定を削除」 |

### 🔄 Transform操作系(3メソッド) - 幾何変換

| メソッド | 機能 | Claude指示例 |
|---------|------|-------------|
| **poker_proposeTransform** | 変換作成 | 「X軸周りに45度回転する変換を作成」 |
| **poker_updateTransform** | 変換修正 | 「回転角度を30度に変更」 |
| **poker_deleteTransform** | 変換削除 | 「rotation_transformを削除」 |

### 🧮 BuildupFactor操作系(4メソッド) - 物理補正

| メソッド | 機能 | 標準設定 |
|---------|------|---------|
| **poker_proposeBuildupFactor** | 係数設定 | スラント補正・有限媒体補正=false |
| **poker_updateBuildupFactor** | 係数変更 | 必要時のみ補正を有効化 |
| **poker_deleteBuildupFactor** | 係数削除 | 材料変更時に使用 |
| **poker_changeOrderBuildupFactor** | 順序変更 | 計算効率最適化用 |

### ☢️ Source操作系(3メソッド) - 線源管理

| メソッド | 機能 | 主要パラメータ |
|---------|------|-------------|
| **poker_proposeSource** | 線源作成 | name, type, position/geometry, inventory |
| **poker_updateSource** | 線源変更 | 放射能・位置・分割設定更新 |
| **poker_deleteSource** | 線源削除 | 削除前に影響確認 |

### 📡 Detector操作系(3メソッド) - 検出器配置

| メソッド | 機能 | 検出器タイプ |
|---------|------|-------------|
| **poker_proposeDetector** | 検出器作成 | 点・線・面・体積検出器 |
| **poker_updateDetector** | 検出器変更 | 位置・格子・トレース設定 |
| **poker_deleteDetector** | 検出器削除 | 出力への影響確認 |

### ⚙️ Unit操作系（5メソッド）- 4キー完全性保証

| メソッド | 機能 | 4必須キー |
|---------|------|----------|
| **poker_proposeUnit** | 単位系作成 | length, angle, density, radioactivity |
| **poker_getUnit** | 単位系確認 | 現在の4キー設定取得 |
| **poker_updateUnit** | 単位系変更 | 部分更新可能、4キー構造維持 |
| **poker_validateUnitIntegrity** | 整合性検証 | 4キー完全性・物理整合性確認 |
| **poker_analyzeUnitConversion** | 変換分析 | 単位変換係数計算 |

### 🔧 System操作系（4メソッド）- システム制御

| メソッド | 機能 | 主要機能 |
|---------|------|----------|
| **poker_applyChanges** | 変更適用 | 自動バックアップ付き保存 |
| **poker_executeCalculation** | 計算実行 | poker_cui実行・結果取得 |
| **poker_resetYaml** | 初期化 | 3段階リセット・ATMOSPHERE保護 |
| **poker_confirmDaughterNuclides** | 子孫核種処理 | 自動検出・追加・確認 |

---

## 📐 第2章: 10種類立体タイプ

### 基本立体（使用頻度高）

#### **SPH（球体）** - 点線源遮蔽用
```yaml
name: "shield_sphere"
type: "SPH"
center: "0 0 0"      # 中心座標 [cm]
radius: 50.0         # 半径 [cm]
```

#### **RCC（直円柱）** - 配管・タンク用
```yaml
name: "storage_tank"
type: "RCC"
bottom_center: "0 0 0"       # 底面中心
height_vector: "0 0 200"     # 高さベクトル
radius: 100.0                # 半径 [cm]
```

#### **RPP（軸平行直方体）** - 室内・遮蔽壁用
```yaml
name: "room_shield"
type: "RPP"
min: "-200 -150 0"    # 最小座標
max: "200 150 250"    # 最大座標
```

### 高度立体（特殊用途）

#### **BOX（任意方向直方体）** - 傾斜構造用
```yaml
name: "tilted_shield"
type: "BOX"
vertex: "0 0 0"         # 基準点
edge_1: "100 0 0"       # エッジ1
edge_2: "0 80 0"        # エッジ2
edge_3: "0 0 50"        # エッジ3
```

#### **CMB（組み合わせ）** - 複合形状用
```yaml
name: "complex_shape"
type: "CMB"
expression: "sphere1 - cylinder1"  # 論理演算式
```

#### **TOR（トーラス）** - 環状構造用
```yaml
name: "torus_chamber"
type: "TOR"
center: "0 0 0"
normal: "0 0 1"
major_radius: 300.0
minor_radius_horizontal: 100.0
minor_radius_vertical: 100.0
```

#### **ELL（楕円体）** - 特殊形状用
```yaml
name: "ellipsoid_tank"
type: "ELL"
center: "0 0 0"
radius_vector_1: "100 0 0"  # X軸半径
radius_vector_2: "0 80 0"   # Y軸半径  
radius_vector_3: "0 0 60"   # Z軸半径
```

#### **REC（楕円柱）** - 楕円断面配管用
```yaml
name: "oval_pipe"
type: "REC"
bottom_center: "0 0 0"
height_vector: "0 0 100"
radius_vector_1: "50 0 0"
radius_vector_2: "0 30 0"
```

#### **TRC（切頭円錐）** - 漏斗型構造用
```yaml
name: "funnel_shield"
type: "TRC"
bottom_center: "0 0 0"
height_vector: "0 0 100"
bottom_radius: 50.0
top_radius: 20.0
```

#### **WED（楔形）** - 角度調整用
```yaml
name: "wedge_shield"  
type: "WED"
vertex: "0 0 0"
width_vector: "100 0 0"
depth_vector: "0 50 0"
height_vector: "0 0 80"
```

---

## 🧪 第3章: 標準材料設定

### 主要遮蔽材料（13種類対応）

| 材料名 | 密度[g/cm³] | 用途 | 特性 |
|--------|------------|------|------|
| **CONCRETE** | 2.3 | 一般遮蔽 | 汎用・経済的 |
| **LEAD** | 11.34 | γ線遮蔽 | 高密度・高価 |
| **IRON** | 7.86 | 構造兼遮蔽 | 強度・磁性 |
| **ALUMINUM** | 2.70 | 軽量遮蔽 | 軽量・耐食 |
| **POLYETHYLENE** | 0.92 | 中性子遮蔽 | 軽元素豊富 |
| **WATER** | 1.0 | 減速・遮蔽 | 中性子減速 |
| **AIR** | 0.00129 | 空間領域 | 標準大気 |
| **VOID** | 0 | 真空領域 | 完全真空 |

### 材料設定例
```yaml
# コンクリート遮蔽壁
concrete_wall:
  body_name: "wall"
  material: "CONCRETE"
  density: 2.3

# 鉛遮蔽（精密）
lead_shield:
  body_name: "pb_sheet"
  material: "LEAD"
  density: 11.34

# 中性子遮蔽
neutron_shield:
  body_name: "pe_block"
  material: "POLYETHYLENE" 
  density: 0.92
```

---

## ☢️ 第4章: 線源設定

### 主要核種データ

| 核種 | 半減期 | 主γ線[MeV] | 用途 |
|------|--------|-----------|------|
| **Co-60** | 5.3年 | 1.17, 1.33 | 工業・治療 |
| **Cs-137** | 30年 | 0.662 | 医療・校正 |
| **Ir-192** | 74日 | 0.317, 0.468 | NDT |
| **I-131** | 8日 | 0.364 | 甲状腺治療 |
| **F-18** | 110分 | 0.511 | PET |

### 線源タイプ別設定

#### **POINT線源（最も基本）**
```yaml
name: "co60_source"
type: "POINT"
position: "0 0 0"
inventory:
  - nuclide: "Co60"
    radioactivity: 3.7e10  # 37 GBq
cutoff_rate: 0.0001
```

#### **体積線源（実際的）**
```yaml
name: "waste_drum"
type: "RCC"
geometry:
  bottom_center: "0 0 0"
  height_vector: "0 0 85" 
  radius: 30.0
division:
  r: {type: "UNIFORM", number: 3}
  phi: {type: "UNIFORM", number: 8}
  z: {type: "UNIFORM", number: 8}
inventory:
  - nuclide: "Cs137"
    radioactivity: 3.7e11
cutoff_rate: 0.01
```

---

## 📡 第5章: 検出器配置

### 検出器タイプ

#### **点検出器（最も基本）**
```yaml
name: "control_point"
origin: "100 50 150"
show_path_trace: false
```

#### **線検出器（1次元分布）**
```yaml
name: "wall_line"
origin: "200 0 150"
grid:
  - edge: "0 500 0"    # Y方向5m
    number: 20         # 20分割
```

#### **面検出器（2次元分布）**  
```yaml
name: "ceiling_area"
origin: "0 0 300"
grid:
  - edge: "500 0 0"    # X方向5m
    number: 10
  - edge: "0 400 0"    # Y方向4m  
    number: 8
```

#### **体積検出器（3次元分布）**
```yaml
name: "room_volume" 
origin: "0 0 0"
grid:
  - edge: "500 0 0"
    number: 10
  - edge: "0 400 0" 
    number: 8
  - edge: "0 0 300"
    number: 6
```

---

## ⚙️ 第6章: 単位系管理（4キー完全性）

### 推奨単位系パターン

#### **実用系（推奨）**
```yaml
units:
  length: "cm"          # 遮蔽計算に便利
  angle: "degree"       # 直感的
  density: "g/cm³"      # 標準
  radioactivity: "Bq"   # SI単位
```

#### **SI基本系**
```yaml
units:
  length: "m"           # SI基本
  angle: "radian"       # 数学的
  density: "g/cm³"      # 慣用
  radioactivity: "Bq"   # SI基本
```

### Unit操作の流れ
```
1. poker_proposeUnit    → 初期設定（4キー必須）
2. poker_getUnit        → 現状確認
3. poker_validateUnitIntegrity → 整合性確認
4. poker_updateUnit     → 必要時変更
5. poker_analyzeUnitConversion → 変換分析
```

---

## 🔄 第7章: 標準ワークフロー

### 基本計算手順
```
1. poker_resetYaml          → 初期化
2. poker_proposeUnit        → 単位系設定
3. poker_proposeBody        → 立体作成
4. poker_proposeZone        → 材料設定
5. poker_proposeSource      → 線源配置
6. poker_proposeDetector    → 検出器配置
7. poker_applyChanges       → 保存
8. poker_executeCalculation → 計算実行
```

### 医療施設CT室例
```
Claude Desktop指示:
「CT室の遮蔽設計をお願いします。

設計仕様:
- 室寸法: 6×5×3m
- 遮蔽壁: コンクリート30cm厚、密度2.3g/cm³
- X線源: 中央配置、Co-60等価
- 評価点: 制御室、廊下、上階

標準ワークフローで実行してください。」
```

---

## ⚠️ 第8章: エラーコード対応表

### MCP固有エラー（13種類）

| エラーコード | 意味 | 対処法 |
|------------|------|--------|
| **-32064** | 立体が既に存在 | poker_updateBodyを使用 |
| **-32065** | 立体が存在しない | poker_proposeBodyを使用 |
| **-32060** | ゾーンが既に存在 | poker_updateZoneを使用 |
| **-32061** | ゾーンが存在しない | poker_proposeZoneを使用 |
| **-32070** | ビルドアップ係数重複 | poker_updateBuildupFactorを使用 |
| **-32071** | ビルドアップ係数不在 | poker_proposeBuildupFactorを使用 |
| **-32074** | 変換が既に存在 | poker_updateTransformを使用 |
| **-32075** | 変換が存在しない | poker_proposeTransformを使用 |
| **-32078** | 線源が既に存在 | poker_updateSourceを使用 |
| **-32079** | 線源が存在しない | poker_proposeSourceを使用 |
| **-32031** | CMB参照立体未定義 | 参照立体を先に作成 |
| **-32600** | 不正リクエスト | パラメータ形式確認 |
| **-32601** | メソッド不在 | 28メソッド名確認 |

### エラー対処の原則
- propose ↔ update の使い分け
- delete前の依存関係確認  
- CMBは参照立体を先に定義
- Unit系は4キー完全性保持

---

## 📊 第9章: poker_cui計算実行

### 基本コマンド
```bash
# 標準実行（総線量+線源別データ出力）
poker_cui -t -s poker.yaml

# 出力ファイル指定
poker_cui -t -s poker.yaml -o summary.yaml -d dose.yaml

# パラメータ確認付き
poker_cui -p -t -s poker.yaml
```

### サマリーファイル構造
```yaml
# poker.yaml.summary
入力パラメータ:        # YAML設定の記録
  bodies: [...]
  zones: [...]
  sources: [...]
  
intermediate:         # 中間計算データ
  source_1:
    detector_1: {...}
    
result:              # 線源別結果  
  source_1:
    detector_1:
      dose: 1.23e-5
      
result_total:        # 総和線量
  detector_1:
    total_dose: 2.46e-5
```

---

## 🎯 第10章: Tips & 最適化

### 計算効率化
```yaml
# カットオフ率設定指針
cutoff_rates:
  概略設計: 0.1      # 高速
  標準設計: 0.05     # バランス
  詳細設計: 0.02     # 高精度
  研究用: 0.01       # 最高精度
```

### メモリ最適化
```yaml
# 分割数指針（総分割数）
divisions:
  高速計算: <500      # 数分
  標準計算: 500-2000  # 10-30分
  高精度計算: >2000   # 1時間以上
```

### 物理的妥当性チェック
- 負の線量値 → 形状定義エラー
- 距離増加で線量増加 → 配置エラー
- 極端な値 → 単位系エラー
- 1/r²則からの逸脱 → 計算設定エラー

---

## 🚀 新機能クイックガイド（v1.2.0追加）

### 🧬 子孫核種自動追加

#### **基本コマンド**
```yaml
# Claude指示例
「Ra-226線源に子孫核種を自動追加してください」

# 実行されるメソッド
poker_confirmDaughterNuclides(
  action: "check",              # まず確認
  source_name: "Ra226_source"   # 対象線源
)

# 結果確認後の承認
poker_confirmDaughterNuclides(
  action: "confirm",            # 承認して適用
  source_name: "Ra226_source"
)
```

#### **応用例: 複雑核種チェーン**
```yaml
# 複数核種の一括確認
「すべての線源について子孫核種をチェックしてください」
→ poker_confirmDaughterNuclides(action: "check")

# 選択的追加
poker_confirmDaughterNuclides(
  action: "confirm_with_modifications",
  modifications: [
    {source_name: "Ra226", nuclide: "Rn222", include: true, radioactivity: 1.0e12},
    {source_name: "Ra226", nuclide: "Po218", include: false}
  ]
)
```

### 🔄 YAML完全リセット

#### **基本リセット**
```yaml
# Claude指示例
「プロジェクトを初期化してください」

# 実行されるメソッド
poker_resetYaml(
  reset_level: "standard",           # 標準リセット
  atmosphere_material: "VOID",       # 真空
  preserve_units: true,              # 単位設定保持
  backup_comment: "プロジェクト初期化"
)
```

#### **カスタムリセット**
```yaml
# 空気環境での完全リセット
poker_resetYaml(
  reset_level: "complete",
  atmosphere_material: "Air",
  atmosphere_density: 0.00129,       # g/cm³
  preserve_units: false,
  force: false
)

# 最小限リセット（立体のみ削除）
poker_resetYaml(
  reset_level: "minimal",
  atmosphere_material: "VOID"
)
```

### 🎯 検出器タイプ明確化

#### **点検出器**
```yaml
# Claude指示例
「原点から1m離れた位置に点検出器を設置」

poker_proposeDetector(
  name: "point_det",
  origin: "100 0 0",              # 位置のみ
  show_path_trace: false          # gridなし=点検出器
)
```

#### **線検出器（1D）**
```yaml
poker_proposeDetector(
  name: "line_det",
  origin: "0 0 0",
  grid: [
    { edge: "100 0 0", number: 20 }  # X軸方向20分割
  ],
  show_path_trace: false
)
```

#### **面検出器（2D）**
```yaml  
poker_proposeDetector(
  name: "surface_det",
  origin: "0 0 100",
  grid: [
    { edge: "200 0 0", number: 20 },   # X軸20分割
    { edge: "0 200 0", number: 20 }    # Y軸20分割
  ],
  show_path_trace: false
)
```

#### **体積検出器（3D）**
```yaml
poker_proposeDetector(
  name: "volume_det", 
  origin: "0 0 0",
  grid: [
    { edge: "100 0 0", number: 10 },   # X軸10分割
    { edge: "0 100 0", number: 10 },   # Y軸10分割  
    { edge: "0 0 100", number: 10 }    # Z軸10分割
  ],
  show_path_trace: true
)
```

### 📏 Unit系拡張機能（v1.1.0）

#### **単位完全性検証**
```yaml
# Claude指示例
「単位設定の完全性をチェックしてください」

poker_validateUnitIntegrity(
  generateReport: true,              # 詳細レポート生成
  includeSystemAnalysis: true       # システム分析含む
)

# 結果例
# ✅ 4キー完全性: OK
# ✅ 物理的整合性: OK  
# ⚠️ システム警告: 単位混在の可能性
```

#### **単位変換分析**
```yaml
# Claude指示例  
「現在の単位系からSI単位系への変換係数を教えてください」

poker_analyzeUnitConversion(
  targetUnits: {
    length: "m",                     # cm → m
    angle: "radian",                 # degree → radian
    density: "g/cm3",               # 変更なし
    radioactivity: "Bq"             # 変更なし
  },
  includePhysicalAnalysis: true
)

# 結果例
# 長さ変換係数: 0.01 (cm → m)
# 角度変換係数: π/180 (degree → radian)
# 物理的影響: 座標値は1/100スケール
```

---

## 🎯 v1.1.0トラブルシューティング

### **子孫核種追加エラー**
```yaml
# エラー: 核種データベースが見つからない
→ 解決策: 環境変数 POKER_DATA_DIR を確認

# エラー: 子孫核種の計算に失敗
→ 解決策: 親核種名の表記確認 (例: Ra-226, Ra226)
```

### **単位系エラー**
```yaml
# エラー: 4キー完全性違反
→ 解決策: poker_proposeUnit で4キー全指定

# エラー: 単位変換の物理的非整合
→ 解決策: poker_analyzeUnitConversion で事前確認
```

### **YAMLリセットエラー**
```yaml
# エラー: ATMOSPHERE削除試行
→ 解決策: システム保護により自動回避（正常動作）

# エラー: バックアップ失敗
→ 解決策: ディスク容量・権限確認
```
  name: "line_det",
  origin: "0 0 0",
  grid: [
    {edge: "500 0 0", number: 50}  # X方向5m、50分割
  ]
)
```

#### **面検出器（2D）**
```yaml
poker_proposeDetector(
  name: "surface_det",
  origin: "0 0 200",
  grid: [
    {edge: "400 0 0", number: 20},  # X方向4m、20分割
    {edge: "0 300 0", number: 15}   # Y方向3m、15分割
  ]
)
```

#### **体積検出器（3D）**
```yaml
poker_proposeDetector(
  name: "volume_det",
  origin: "-100 -100 0",
  grid: [
    {edge: "200 0 0", number: 10},   # X方向
    {edge: "0 200 0", number: 10},   # Y方向
    {edge: "0 0 150", number: 8}     # Z方向
  ]
)
```

---

## 🎊 まとめ
## 💡 まとめ: クイックリファレンス活用法

### ✨ **日常使用パターン**
1. **28メソッド早見表**で適切なメソッド選択
2. **立体タイプ表**で形状パラメータ確認
3. **エラーコード表**で迅速トラブル解決
4. **標準ワークフロー**で効率的作業実行

### 🎯 **品質保証のポイント**
- Unit操作5メソッドで単位系完全性確保
- poker_validateUnitIntegrityで整合性確認
- エラーコード即座対応でダウンタイム最小化
- 標準材料・核種データで設定ミス防止

### 🚀 **効率化の要点**
- カットオフ率の段階的設定
- 検出器タイプの適切選択
- 分割数の最適化
- 物理的妥当性の系統的確認

**このクイックリファレンスで、28メソッド・10立体・4キー単位系を完全活用した高効率な放射線遮蔽計算を実現してください。**

---

**📚 関連マニュアル**
- [ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md): 基本操作・15分スタート
- [PHYSICS_REFERENCE.md](PHYSICS_REFERENCE.md): 物理的背景・理論
- [RESEARCH_WORKFLOWS.md](RESEARCH_WORKFLOWS.md): 分野別実用例
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md): 問題解決・復旧
