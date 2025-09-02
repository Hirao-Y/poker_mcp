# 🚀 QUICK_REFERENCE.md - 放射線遮蔽計算クイックリファレンス

**対象読者**: 放射線遮蔽研究者・実務者  
**更新日**: 2025年8月27日  
**バージョン**: 1.0  
**目的**: 日常業務での迅速な参照と効率的な作業支援

---

## 📖 第1章: コマンド・API早見表

### 🔷 1.1 立体作成コマンド（全10タイプ完全対応）

#### **SPH（球体）- 点線源遮蔽用**
```yaml
# 基本構文
name: "shield_sphere"
type: "SPH"
center: "0 0 0"        # 中心座標 [cm]
radius: 50.0           # 半径 [cm]
transform: "move_up"   # 変換名（オプション）

# Claude指示例
「球体遮蔽を作成：center="0 0 0", radius=50.0, name="shield_sphere"」
→ poker_proposeBody実行

# 実用例：Co-60点線源遮蔽
Co60_Shield:
  type: SPH
  center: "0 0 100"
  radius: 25.0         # 5cm鉛相当の遮蔽効果
```

#### **RCC（直円柱）- タンク・配管遮蔽用**
```yaml
# 基本構文
name: "storage_tank"
type: "RCC"
bottom_center: "0 0 0"     # 底面中心 [cm]
height_vector: "0 0 200"   # 高さベクトル [cm]
radius: 100.0              # 半径 [cm]

# Claude指示例
「円柱作成：bottom_center="0 0 0", height_vector="0 0 200", radius=100.0」
→ poker_proposeBody実行

# 実用例：廃液貯蔵タンク
Waste_Tank:
  type: RCC
  bottom_center: "0 0 0"
  height_vector: "0 0 300"
  radius: 150.0
```

#### **RPP（軸平行直方体）- 室内遮蔽用**
```yaml
# 基本構文
name: "room_shield"
type: "RPP"
min: "-200 -150 0"     # 最小座標 [cm]
max: "200 150 250"     # 最大座標 [cm]

# Claude指示例
「直方体作成：min="-200 -150 0", max="200 150 250", name="room_shield"」
→ poker_proposeBody実行

# 実用例：CT室遮蔽壁
CT_Room:
  type: RPP
  min: "-300 -200 0"
  max: "300 200 280"   # 高さ2.8m
```

#### **BOX（任意方向直方体）- 複雑配置用**
```yaml
# 基本構文
name: "tilted_shield"
type: "BOX"
vertex: "0 0 0"           # 基準点 [cm]
edge_1: "100 0 0"         # エッジ1ベクトル
edge_2: "0 80 0"          # エッジ2ベクトル  
edge_3: "0 0 50"          # エッジ3ベクトル

# Claude指示例
「BOX作成：vertex="0 0 0", edge_1="100 0 0", edge_2="0 80 0", edge_3="0 0 50"」
→ poker_proposeBody実行

# 実用例：傾斜遮蔽壁
Slope_Wall:
  type: BOX
  vertex: "0 0 0"
  edge_1: "500 0 0"
  edge_2: "0 300 100"     # Y方向に傾斜
  edge_3: "0 0 200"
```

#### **TOR（トーラス）- 環状構造用**
```yaml
# 基本構文
name: "torus_chamber"
type: "TOR"
center: "0 0 0"                    # 中心座標 [cm]
normal: "0 0 1"                    # 法線ベクトル
major_radius: 300.0                # 主半径 [cm]
minor_radius_horizontal: 100.0     # 水平方向副半径 [cm]
minor_radius_vertical: 100.0       # 垂直方向副半径 [cm]

# Claude指示例
「トーラス作成：center="0 0 0", major_radius=300.0, minor_radius=100.0」
→ poker_proposeBody実行

# 実用例：トカマク型核融合炉
Tokamak_Chamber:
  type: TOR
  center: "0 0 0"
  normal: "0 0 1"
  major_radius: 650.0
  minor_radius_horizontal: 200.0
  minor_radius_vertical: 200.0
```

#### **ELL（楕円体）- 特殊形状遮蔽用**
```yaml
# 基本構文
name: "ellipsoid_tank"
type: "ELL"
center: "0 0 0"            # 中心座標 [cm]
radius_vector_1: "100 0 0" # X軸半径ベクトル
radius_vector_2: "0 80 0"  # Y軸半径ベクトル
radius_vector_3: "0 0 60"  # Z軸半径ベクトル

# Claude指示例
「楕円体作成：center="0 0 0", X半径100cm, Y半径80cm, Z半径60cm」
→ poker_proposeBody実行

# 実用例：楕円形圧力容器
Ellipse_Vessel:
  type: ELL
  center: "0 0 150"
  radius_vector_1: "200 0 0"
  radius_vector_2: "0 150 0"
  radius_vector_3: "0 0 100"
```

#### **REC（楕円柱）- 特殊配管用**
```yaml
# 基本構文
name: "ellipse_pipe"
type: "REC"
bottom_center: "0 0 0"      # 底面中心 [cm]
height_vector: "0 0 200"    # 高さベクトル [cm]
radius_vector_1: "50 0 0"   # 楕円半径1
radius_vector_2: "0 30 0"   # 楕円半径2

# Claude指示例
「楕円柱作成：bottom_center="0 0 0", height_vector="0 0 200", 楕円半径50x30cm」
→ poker_proposeBody実行

# 実用例：楕円断面配管
Oval_Pipe:
  type: REC
  bottom_center: "100 0 0"
  height_vector: "0 0 500"
  radius_vector_1: "40 0 0"
  radius_vector_2: "0 25 0"
```

#### **TRC（切頭円錐）- 漏斗型遮蔽用**
```yaml
# 基本構文
name: "funnel_shield"
type: "TRC"
bottom_center: "0 0 0"     # 底面中心
height_vector: "0 0 100"   # 高さベクトル
bottom_radius: 50.0        # 底面半径
top_radius: 20.0           # 上面半径

# Claude指示例
「円錐台作成：bottom_center="0 0 0", height_vector="0 0 100", 底面半径50cm, 上面半径20cm」
→ poker_proposeBody実行

# 実用例：廃棄物投入口
Waste_Funnel:
  type: TRC
  bottom_center: "0 0 200"
  height_vector: "0 0 -50"
  bottom_radius: 30.0
  top_radius: 15.0
```

#### **WED（楔形）- 角度調整遮蔽用**
```yaml
# 基本構文
name: "wedge_shield"
type: "WED"
vertex: "0 0 0"           # 頂点座標 [cm]
width_vector: "100 0 0"   # 幅ベクトル
depth_vector: "0 50 0"    # 奥行きベクトル
height_vector: "0 0 80"   # 高さベクトル

# Claude指示例
「楔形作成：vertex="0 0 0", width_vector="100 0 0", depth_vector="0 50 0", height_vector="0 0 80"」
→ poker_proposeBody実行

# 実用例：角度調整遮蔽
Angle_Shield:
  type: WED
  vertex: "200 0 0"
  width_vector: "150 0 0"
  depth_vector: "0 100 50"   # 奥行き方向に傾斜
  height_vector: "0 0 200"
```

#### **CMB（組み合わせ立体）- 複合形状用**
```yaml
# 基本構文
name: "complex_shape"
type: "CMB"
expression: "sphere1 - cylinder1"  # 論理式

# Claude指示例
「組み合わせ立体作成：球体sphere1から円柱cylinder1を差し引く」
→ poker_proposeBody実行

# 実用例：穴あき遮蔽球
Holed_Sphere:
  type: CMB
  expression: "shield_sphere - access_hole"
  
# 複雑な組み合わせ例
Complex_Shield:
  type: CMB
  expression: "(main_block + side_block) - (hole1 + hole2)"
```
```yaml
# 基本構文
name: "ellipsoid_shield"
type: "ELL"
center: "0 0 0"            # 中心座標
radius_vector_1: "100 0 0"  # 第1軸半径ベクトル
radius_vector_2: "0 50 0"   # 第2軸半径ベクトル
radius_vector_3: "0 0 30"   # 第3軸半径ベクトル

# 実用例：人体形状近似
Human_Body:
  type: ELL
  center: "0 0 100"
  radius_vector_1: "20 0 0"
  radius_vector_2: "0 15 0"
  radius_vector_3: "0 0 80"
```

#### **TOR（トーラス）- 環状遮蔽用**
```yaml
# 基本構文
name: "torus_shield"
type: "TOR"
center: "0 0 0"              # 中心座標
normal: "0 0 1"              # 法線ベクトル
major_radius: 100.0          # 主半径
minor_radius_horizontal: 20.0 # 水平方向副半径
minor_radius_vertical: 15.0   # 垂直方向副半径

# 実用例：リング型加速器遮蔽
Ring_Shield:
  type: TOR
  center: "0 0 0"
  normal: "0 0 1"
  major_radius: 500.0
  minor_radius_horizontal: 50.0
  minor_radius_vertical: 50.0
```

#### **REC（楕円円柱）- 楕円断面配管用**
```yaml
# 基本構文
name: "oval_pipe"
type: "REC"
bottom_center: "0 0 0"       # 底面中心
height_vector: "0 0 100"     # 高さベクトル
radius_vector_1: "50 0 0"    # 第1軸半径ベクトル
radius_vector_2: "0 30 0"    # 第2軸半径ベクトル

# 実用例：楕円断面ダクト
Oval_Duct:
  type: REC
  bottom_center: "0 0 50"
  height_vector: "200 0 0"   # X方向に延伸
  radius_vector_1: "0 25 0"
  radius_vector_2: "0 0 15"
```

#### **WED（楔形）- 角度付遮蔽用**
```yaml
# 基本構文
name: "wedge_shield"
type: "WED"
vertex: "0 0 0"              # 楔の頂点
edge_1: "100 0 0"            # エッジ1
edge_2: "0 100 0"            # エッジ2
edge_3: "0 0 50"             # エッジ3

# 実用例：コリメータ遮蔽
Collimator:
  type: WED
  vertex: "0 0 0"
  edge_1: "50 0 0"
  edge_2: "50 50 0"
  edge_3: "0 0 100"
```

#### **CMB（複合形状）- 複雑遮蔽用**
```yaml
# 基本構文
name: "complex_shield"
type: "CMB"
expression: "shield_wall - penetration_hole"

# 実用例：貫通孔付き遮蔽壁
Wall_with_Hole:
  type: CMB
  expression: "main_wall - cable_hole - pipe_hole"
  # 事前にmain_wall, cable_hole, pipe_holeを定義済み
```

### ⚗️ 1.2 材料・ゾーン設定

#### **主要遮蔽材料の標準設定**

```yaml
# 鉛遮蔽（ガンマ線用）
Lead_Shield:
  body_name: "lead_wall"
  material: "LEAD"
  density: 11.34           # [g/cm³] 純鉛

# コンクリート（汎用遮蔽）
Concrete_Shield:
  body_name: "concrete_wall"
  material: "CONCRETE"  
  density: 2.3             # [g/cm³] 普通コンクリート

# 鉄（構造材兼遮蔽）
Steel_Shield:
  body_name: "steel_plate"
  material: "STEEL"
  density: 7.87            # [g/cm³] 軟鋼

# ポリエチレン（中性子減速用）
PE_Shield:
  body_name: "pe_block"
  material: "POLYETHYLENE"
  density: 0.92            # [g/cm³] 通常PE

# ホウ素入りPE（中性子遮蔽用）
BPE_Shield:
  body_name: "bpe_sheet"
  material: "BORATED_PE"
  density: 1.0             # [g/cm³] 5%B₄C含有

# 水（中性子減速・冷却用）
Water_Shield:
  body_name: "water_tank"
  material: "WATER"
  density: 1.0             # [g/cm³] 常温水

# 空気（空間領域）
Air_Region:
  body_name: "air_space"
  material: "AIR"
  density: 0.001225        # [g/cm³] 標準状態

# 真空（空間領域）
Void_Region:
  body_name: "void_space"
  material: "VOID"
  density: 0.0             # [g/cm³] 真空
```

#### **特殊材料の設定例**

```yaml
# 重コンクリート（高密度遮蔽）
Heavy_Concrete:
  body_name: "heavy_wall"
  material: "HEAVY_CONCRETE"
  density: 3.7             # [g/cm³] バライト骨材

# タングステン（高性能遮蔽）
Tungsten_Shield:
  body_name: "w_collimator"
  material: "TUNGSTEN"
  density: 19.3            # [g/cm³] 純タングステン

# アルミニウム（軽量遮蔽）
Aluminum_Shield:
  body_name: "al_housing"
  material: "ALUMINUM"
  density: 2.70            # [g/cm³] 純アルミ

### ⚙️ 1.4 単位系設定（4キー完全性保証）

#### **4キー必須単位系の管理**

現在のPoker MCPサーバーは単位系の4キー完全性を保証しています：
- `length`: 長さの単位 (m, cm, mm)
- `angle`: 角度の単位 (radian, degree)  
- `density`: 密度の単位 (g/cm3)
- `radioactivity`: 放射能の単位 (Bq)

```yaml
# 基本単位系設定
units:
  length: "cm"          # 必須：長さ単位
  angle: "radian"       # 必須：角度単位
  density: "g/cm3"      # 必須：密度単位
  radioactivity: "Bq"   # 必須：放射能単位

# Claude指示例
「単位系を設定してください：長さcm、角度degree、密度g/cm3、放射能Bq」
→ poker_proposeUnit(length="cm", angle="degree", density="g/cm3", radioactivity="Bq")

# 単位系確認
「現在の単位設定を確認してください」
→ poker_getUnit() - 常に4キーすべてを返却

# 単位系更新（部分更新可能）
「長さ単位をmに変更してください」
→ poker_updateUnit(length="m") - 他の3キーは維持
```

#### **単位系の完全性検証**

```yaml
# 完全性検証の実行
「単位系の完全性を検証してください」
→ poker_validateUnitIntegrity(includeSystemAnalysis=true, generateReport=true)

# 検証内容:
# 1. 4キー構造の完全性
# 2. 物理的整合性（単位組み合わせの妥当性）
# 3. システム全体での単位使用状況
# 4. 自動修復の必要性判定

# 単位変換分析
「現在の単位系からmm-degree-g/cm3-Bqへの変換係数を計算してください」
→ poker_analyzeUnitConversion(
    targetUnits={length="mm", angle="degree", density="g/cm3", radioactivity="Bq"},
    includePhysicalAnalysis=true
  )
```

#### **推奨単位系パターン**

```yaml
# パターン1: SI基本系（国際標準）
SI_Units:
  length: "m"
  angle: "radian"
  density: "g/cm3"        # 密度はg/cm3が標準
  radioactivity: "Bq"

# パターン2: 遮蔽計算実用系（推奨）
Practical_Units:
  length: "cm"            # 遮蔽厚計算に便利
  angle: "degree"         # 角度指定が直感的
  density: "g/cm3"
  radioactivity: "Bq"

# パターン3: 精密計算系
Precision_Units:
  length: "mm"            # 高精度形状指定
  angle: "radian"         # 数値計算精度向上
  density: "g/cm3"  
  radioactivity: "Bq"

# Claude指示による単位系選択
「実用的な遮蔽計算用の単位系を設定してください」
→ 自動的にPractical_Unitsパターンを適用
```

#### **単位系変更時の自動調整**

```yaml
# システムによる自動調整機能
# - 既存データの単位変換
# - 物理的整合性の維持
# - バックアップ作成
# - 変更ログの記録

「単位系をcm系からm系に変更してください、既存データも自動変換お願いします」
→ 以下が自動実行：
   1. 現在データのバックアップ作成
   2. 単位系変更 (poker_updateUnit)  
   3. 全データの単位変換
   4. 整合性検証 (poker_validateUnitIntegrity)
   5. 変更完了確認
```

### ☢️ 1.3 線源配置

#### **典型的な線源の設定例**

##### **医療用核種**
```yaml
# Co-60治療線源
Co60_Source:
  name: "co60_therapy"
  type: "POINT"
  position: "0 0 150"      # 患者位置上方1.5m
  inventory:
    - nuclide: "Co60"
      radioactivity: 3.7e13  # 37 TBq
  cutoff_rate: 0.01

# Cs-137校正線源
Cs137_Source:
  name: "cs137_calib"
  type: "POINT" 
  position: "100 100 50"   # 測定位置
  inventory:
    - nuclide: "Cs137"
      radioactivity: 3.7e9   # 3.7 GBq
  cutoff_rate: 0.05

# I-131治療線源（患者体内分布）
I131_Patient:
  name: "i131_patient"
  type: "SPH"
  geometry:
    center: "0 0 100"      # 患者中心高さ
    radius: 30.0           # 体幹相当
  division:
    r: {type: "UNIFORM", number: 3}
    theta: {type: "UNIFORM", number: 4} 
    phi: {type: "UNIFORM", number: 6}
  inventory:
    - nuclide: "I131"
      radioactivity: 7.4e9   # 7.4 GBq治療量
  cutoff_rate: 0.02
```

##### **産業用核種**
```yaml
# Ir-192 NDT線源
Ir192_NDT:
  name: "ir192_ndt"
  type: "POINT"
  position: "0 0 0"        # 溶接部位置
  inventory:
    - nuclide: "Ir192"
      radioactivity: 1.85e12 # 1.85 TBq
  cutoff_rate: 0.01

# Am-241密度計線源  
Am241_Gauge:
  name: "am241_gauge"
  type: "POINT"
  position: "50 0 200"     # 測定装置内
  inventory:
    - nuclide: "Am241"
      radioactivity: 3.7e8   # 370 MBq
  cutoff_rate: 0.1         # 低エネルギーのため緩い設定
```

##### **体積線源**
```yaml
# 廃棄物容器（RPP分布）
Waste_Container:
  name: "waste_drum"
  type: "RPP"
  geometry:
    min: "-30 -30 0"       # ドラム缶内部
    max: "30 30 85"
  division:
    edge_1: {type: "UNIFORM", number: 6}
    edge_2: {type: "UNIFORM", number: 6}
    edge_3: {type: "UNIFORM", number: 8}
  inventory:
    - nuclide: "Cs137"
      radioactivity: 3.7e11  # 混合廃棄物
    - nuclide: "Sr90"
      radioactivity: 1.85e11
  cutoff_rate: 0.05

# 汚染配管（RCC分布）
Contaminated_Pipe:
  name: "contaminated_pipe"  
  type: "RCC"
  geometry:
    bottom_center: "0 0 100"
    height_vector: "500 0 0"  # X方向に5m
    radius: 15.0              # 内径30cm相当
  division:
    r: {type: "UNIFORM", number: 3}
    phi: {type: "UNIFORM", number: 8}
    z: {type: "UNIFORM", number: 20}
  inventory:
    - nuclide: "Co60"
      radioactivity: 1.85e10
  cutoff_rate: 0.02
```

### 🔄 1.4 システム操作

#### **バックアップ・復旧**
```bash
# 手動バックアップ作成
backup_comment: "Phase1計算完了時点"

# 強制適用（警告無視）
force: true

# 変更確認（dry-run）
dryRun: true
```

#### **単位系管理**
```yaml
# 標準単位系
Standard_Units:
  length: "cm"           # センチメートル
  angle: "degree"        # 度（計算では自動的にラジアン変換）
  density: "g/cm3"       # グラム毎立方センチメートル
  radioactivity: "Bq"    # ベクレル

# 単位系変更例
Alternative_Units:
  length: "m"            # メートル（大規模施設用）
  angle: "radian"        # ラジアン（数学的計算用）
  density: "g/cm3"       # 固定
  radioactivity: "Bq"    # 固定
```

---

## 🔧 第2章: よく使う操作パターン

### 🏗️ 2.1 標準的な遮蔽モデルテンプレート

#### **医療施設CT室**
```yaml
# CT室標準モデル
CT_Room_Standard:
  # 主室（患者・装置空間）
  main_room:
    type: RPP
    min: "-250 -200 0"
    max: "250 200 280"
    material: AIR
    
  # 遮蔽壁（四周）
  shield_walls:
    north_wall:
      type: RPP
      min: "-270 180 0"
      max: "270 200 280"
      material: CONCRETE
      density: 2.3
      
    south_wall:
      type: RPP  
      min: "-270 -200 0"
      max: "270 -180 280"
      material: CONCRETE
      density: 2.3
      
    east_wall:
      type: RPP
      min: "250 -180 0"
      max: "270 180 280" 
      material: CONCRETE
      density: 2.3
      
    west_wall:
      type: RPP
      min: "-270 -180 0"
      max: "-250 180 280"
      material: CONCRETE 
      density: 2.3
  
  # 遮蔽扉
  shield_door:
    type: RPP
    min: "-50 -200 0"
    max: "50 -180 220"    # 高さ2.2m
    material: LEAD
    density: 11.34
    
  # 制御室（隣接）
  control_room:
    type: RPP
    min: "-120 -320 0"
    max: "120 -200 280"
    material: AIR

# CT線源設定
CT_Source:
  name: "ct_tube"
  type: POINT
  position: "0 0 150"      # テーブル上方
  inventory:
    - nuclide: "X_ray_150kV"  # 実効エネルギー相当
      radioactivity: 1.0e12   # 仮想的強度設定
  cutoff_rate: 0.02
```

#### **RI実験室標準モデル**
```yaml
# RI実験室標準モデル
RI_Lab_Standard:
  # 実験室本体
  lab_room:
    type: RPP
    min: "-300 -400 0"
    max: "300 400 300"
    material: AIR
    
  # コンクリート壁
  concrete_walls:
    thickness: 20          # 20cm厚
    material: CONCRETE
    density: 2.3
    
  # ドラフトチェンバー
  draft_chamber:
    type: RPP
    min: "150 -50 80" 
    max: "280 50 200"
    material: STEEL
    density: 7.87
    
  # 廃液タンク
  waste_tank:
    type: RCC
    bottom_center: "-200 300 0"
    height_vector: "0 0 150"
    radius: 50.0
    material: STEEL
    density: 7.87
    
  # 排気配管
  exhaust_duct:
    type: RCC
    bottom_center: "0 0 300"
    height_vector: "0 0 200"  # 上方へ排気
    radius: 25.0
    material: STEEL
    density: 7.87

# 典型的RI線源
Typical_RI:
  # P-32使用実験
  P32_experiment:
    name: "p32_exp"
    type: POINT
    position: "0 0 120"     # 作業台高さ
    inventory:
      - nuclide: "P32"
        radioactivity: 3.7e8  # 370 MBq
    cutoff_rate: 0.1
    
  # 廃液貯蔵
  waste_liquid:
    name: "waste_tank_source"
    type: RCC
    geometry:
      bottom_center: "-200 300 10"
      height_vector: "0 0 100"
      radius: 40.0
    inventory:
      - nuclide: "P32"
        radioactivity: 1.85e9  # 1.85 GBq
      - nuclide: "S35" 
        radioactivity: 3.7e8   # 370 MBq
    cutoff_rate: 0.05
```

#### **工業用NDT現場**
```yaml
# NDT現場標準モデル  
NDT_Site_Standard:
  # 作業エリア
  work_area:
    type: RCC
    bottom_center: "0 0 0"
    height_vector: "0 0 300"
    radius: 1000.0         # 半径10m
    material: AIR
    
  # 被検査物（配管）
  test_pipe:
    type: RCC  
    bottom_center: "-500 0 150"
    height_vector: "1000 0 0"  # X方向10m
    radius: 30.0           # 直径60cm配管
    material: STEEL
    density: 7.87
    
  # 遮蔽バリア（鉛板）
  lead_barrier:
    type: RPP
    min: "-50 -200 0"
    max: "-45 200 200"     # 5cm厚鉛板
    material: LEAD
    density: 11.34
    
  # 地面（散乱考慮）
  ground:
    type: RPP
    min: "-2000 -2000 -50"
    max: "2000 2000 0"
    material: CONCRETE     # 土壌をコンクリート近似
    density: 1.8

# Ir-192線源設定
Ir192_NDT_Source:
  name: "ir192_ndt_source"
  type: POINT
  position: "0 0 150"      # 配管溶接部
  inventory:
    - nuclide: "Ir192"
      radioactivity: 1.85e12  # 1.85 TBq
  cutoff_rate: 0.01
```

### ⚡ 2.2 バッチ処理用スクリプト例

#### **パラメータスタディ自動化**
```python
#!/usr/bin/env python3
"""
遮蔽厚最適化バッチ処理
"""

import json
import subprocess
import numpy as np

def optimize_shield_thickness():
    """遮蔽厚の最適化計算"""
    
    # 遮蔽厚パラメータ範囲
    thicknesses = np.arange(5, 50, 5)  # 5-45cm、5cm刻み
    
    results = []
    
    for thickness in thicknesses:
        # 遮蔽モデル更新
        update_shield_model(thickness)
        
        # 計算実行
        result = run_calculation()
        
        # 結果保存
        results.append({
            'thickness': thickness,
            'dose_rate': result['max_dose_rate'],
            'cost_factor': thickness * 2.3 * 1000  # コンクリート概算コスト
        })
        
        print(f"厚さ {thickness}cm: 線量率 {result['max_dose_rate']:.2e} μSv/h")
    
    # 最適厚さ決定
    optimal = find_optimal_thickness(results)
    print(f"最適厚さ: {optimal}cm")
    
    return results

def update_shield_model(thickness):
    """遮蔽モデルの厚さ更新"""
    # Poker MCP API呼び出し
    cmd = [
        'node', 'mcp_client.js',
        'updateBody',
        f'--name=shield_wall',
        f'--max="200 {thickness} 280"'
    ]
    subprocess.run(cmd, check=True)

def run_calculation():
    """線量率計算実行"""
    cmd = ['node', 'mcp_client.js', 'calculate']
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

def find_optimal_thickness(results):
    """費用便益分析による最適厚さ決定"""
    target_dose = 2.5  # μSv/h (管理区域境界目標値)
    
    for result in results:
        if result['dose_rate'] <= target_dose:
            return result['thickness']
    
    return max(r['thickness'] for r in results)  # 最大厚でも不足の場合

if __name__ == "__main__":
    optimize_shield_thickness()
```

#### **多核種複合計算**
```python
#!/usr/bin/env python3
"""
複数核種の同時計算バッチ処理
"""

def multi_nuclide_calculation():
    """複数核種の複合線量評価"""
    
    nuclides = [
        {'name': 'Co60', 'activity': 3.7e11, 'weight': 1.0},
        {'name': 'Cs137', 'activity': 7.4e11, 'weight': 0.8},
        {'name': 'Ir192', 'activity': 1.85e10, 'weight': 1.2}
    ]
    
    total_dose = 0
    
    for nuclide in nuclides:
        # 個別核種計算
        dose = calculate_single_nuclide(
            nuclide['name'], 
            nuclide['activity']
        )
        
        # 重み係数適用
        weighted_dose = dose * nuclide['weight']
        total_dose += weighted_dose
        
        print(f"{nuclide['name']}: {weighted_dose:.2e} μSv/h")
    
    print(f"総線量率: {total_dose:.2e} μSv/h")
    
    # 規制基準との比較
    check_regulatory_compliance(total_dose)
    
    return total_dose

def calculate_single_nuclide(nuclide, activity):
    """単一核種の線量計算"""
    # 線源更新
    update_source(nuclide, activity)
    
    # 計算実行
    result = run_calculation()
    
    return result['dose_rate']

def check_regulatory_compliance(dose_rate):
    """規制基準適合性確認"""
    limits = {
        'controlled_area': 2.5,      # μSv/h 管理区域境界
        'public_limit': 0.5,         # μSv/h 一般公衆
        'alara_target': 0.1          # μSv/h ALARA目標
    }
    
    for limit_name, limit_value in limits.items():
        status = "適合" if dose_rate <= limit_value else "超過"
        print(f"{limit_name}: {status} ({dose_rate:.2e}/{limit_value} μSv/h)")

if __name__ == "__main__":
    multi_nuclide_calculation()
```

### 📊 2.3 パラメータスタディの自動化

#### **感度解析スクリプト**
```python
#!/usr/bin/env python3
"""
パラメータ感度解析
"""

import numpy as np
import matplotlib.pyplot as plt

def sensitivity_analysis():
    """主要パラメータの感度解析"""
    
    parameters = {
        'density': {'base': 2.3, 'range': [1.8, 2.8], 'unit': 'g/cm³'},
        'thickness': {'base': 30, 'range': [20, 50], 'unit': 'cm'},
        'activity': {'base': 3.7e11, 'range': [1e11, 1e12], 'unit': 'Bq'}
    }
    
    sensitivities = {}
    
    for param_name, param_info in parameters.items():
        print(f"\n{param_name}の感度解析中...")
        
        # ±20%変化での線量率変化を計算
        sensitivity = calculate_parameter_sensitivity(
            param_name, 
            param_info['base'],
            param_info['range']
        )
        
        sensitivities[param_name] = sensitivity
        print(f"{param_name}感度: {sensitivity:.2f}%/%")
    
    # 結果可視化
    plot_sensitivity_results(sensitivities)
    
    return sensitivities

def calculate_parameter_sensitivity(param_name, base_value, param_range):
    """パラメータ感度計算"""
    
    # 基準値での計算
    base_dose = calculate_with_parameter(param_name, base_value)
    
    # +20%での計算
    high_value = base_value * 1.2
    high_dose = calculate_with_parameter(param_name, high_value)
    
    # -20%での計算  
    low_value = base_value * 0.8
    low_dose = calculate_with_parameter(param_name, low_value)
    
    # 感度計算（%変化/%変化）
    dose_change = ((high_dose - low_dose) / base_dose) * 100
    param_change = 40  # ±20% = 40%変化
    
    sensitivity = dose_change / param_change
    
    return sensitivity

def plot_sensitivity_results(sensitivities):
    """感度解析結果のプロット"""
    
    params = list(sensitivities.keys())
    values = list(sensitivities.values())
    
    plt.figure(figsize=(10, 6))
    bars = plt.bar(params, values, color=['blue', 'green', 'red'])
    plt.ylabel('感度 (%変化/%変化)')
    plt.title('パラメータ感度解析結果')
    plt.grid(True, alpha=0.3)
    
    # 値を棒グラフ上に表示
    for bar, value in zip(bars, values):
        plt.text(bar.get_x() + bar.get_width()/2, bar.get_height(),
                f'{value:.2f}', ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig('sensitivity_analysis.png', dpi=300)
    plt.show()

if __name__ == "__main__":
    sensitivity_analysis()
```

### 📈 2.4 結果後処理の定型化

#### **線量分布解析スクリプト**
```python
#!/usr/bin/env python3
"""
線量分布の後処理・解析
"""

def analyze_dose_distribution():
    """線量分布の総合解析"""
    
    # 計算結果読み込み
    dose_data = load_calculation_results()
    
    # 基本統計量計算
    statistics = calculate_dose_statistics(dose_data)
    print_statistics_summary(statistics)
    
    # 等線量率曲線作成
    create_isodose_contours(dose_data)
    
    # ホットスポット特定
    hotspots = identify_hotspots(dose_data)
    print_hotspot_analysis(hotspots)
    
    # 規制基準適合性評価
    compliance = evaluate_compliance(dose_data)
    print_compliance_report(compliance)
    
    # レポート生成
    generate_analysis_report(statistics, hotspots, compliance)

def calculate_dose_statistics(dose_data):
    """線量分布の統計解析"""
    
    statistics = {
        'max_dose': np.max(dose_data['dose_rates']),
        'mean_dose': np.mean(dose_data['dose_rates']),
        'median_dose': np.median(dose_data['dose_rates']),
        'std_dose': np.std(dose_data['dose_rates']),
        'q95_dose': np.percentile(dose_data['dose_rates'], 95),
        'q99_dose': np.percentile(dose_data['dose_rates'], 99)
    }
    
    return statistics

def create_isodose_contours(dose_data):
    """等線量率曲線の作成"""
    
    # 等線量率レベル設定
    dose_levels = [0.1, 0.5, 1.0, 2.5, 10.0, 100.0]  # μSv/h
    
    fig, ax = plt.subplots(figsize=(12, 8))
    
    # コンター作成
    contours = ax.contour(
        dose_data['x_coords'],
        dose_data['y_coords'], 
        dose_data['dose_grid'],
        levels=dose_levels,
        colors='black',
        linewidths=1.5
    )
    
    # 塗りつぶし
    contourf = ax.contourf(
        dose_data['x_coords'],
        dose_data['y_coords'],
        dose_data['dose_grid'], 
        levels=dose_levels,
        alpha=0.6,
        cmap='YlOrRd'
    )
    
    # カラーバー
    cbar = plt.colorbar(contourf)
    cbar.set_label('線量率 (μSv/h)')
    
    # ラベル付け
    ax.clabel(contours, inline=True, fontsize=8)
    
    # 装飾
    ax.set_xlabel('X座標 (cm)')
    ax.set_ylabel('Y座標 (cm)') 
    ax.set_title('線量率分布（等線量率曲線）')
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('isodose_contours.png', dpi=300)
    plt.show()

def identify_hotspots(dose_data, threshold_factor=10):
    """ホットスポットの特定"""
    
    mean_dose = np.mean(dose_data['dose_rates'])
    threshold = mean_dose * threshold_factor
    
    hotspot_indices = np.where(dose_data['dose_rates'] > threshold)[0]
    
    hotspots = []
    for idx in hotspot_indices:
        hotspot = {
            'index': idx,
            'position': dose_data['positions'][idx],
            'dose_rate': dose_data['dose_rates'][idx],
            'ratio_to_mean': dose_data['dose_rates'][idx] / mean_dose
        }
        hotspots.append(hotspot)
    
    # 線量率順でソート
    hotspots.sort(key=lambda x: x['dose_rate'], reverse=True)
    
    return hotspots

def evaluate_compliance(dose_data):
    """規制基準適合性評価"""
    
    limits = {
        'controlled_area_boundary': 2.5,    # μSv/h
        'public_access_limit': 0.5,         # μSv/h  
        'alara_target': 0.1                 # μSv/h
    }
    
    compliance_results = {}
    
    for limit_name, limit_value in limits.items():
        exceeding_points = np.sum(dose_data['dose_rates'] > limit_value)
        total_points = len(dose_data['dose_rates'])
        compliance_ratio = (total_points - exceeding_points) / total_points
        
        compliance_results[limit_name] = {
            'limit': limit_value,
            'exceeding_points': exceeding_points,
            'total_points': total_points,
            'compliance_ratio': compliance_ratio,
            'max_exceedance': np.max(dose_data['dose_rates']) / limit_value
        }
    
    return compliance_results

def generate_analysis_report(statistics, hotspots, compliance):
    """解析レポート生成"""
    
    report = f"""
# 線量分布解析レポート

## 基本統計量
- 最大線量率: {statistics['max_dose']:.2e} μSv/h
- 平均線量率: {statistics['mean_dose']:.2e} μSv/h  
- 標準偏差: {statistics['std_dose']:.2e} μSv/h
- 95パーセンタイル: {statistics['q95_dose']:.2e} μSv/h

## ホットスポット分析
上位3箇所のホットスポット:
"""
    
    for i, hotspot in enumerate(hotspots[:3], 1):
        report += f"""
{i}. 位置: {hotspot['position']}
   線量率: {hotspot['dose_rate']:.2e} μSv/h
   平均値との比: {hotspot['ratio_to_mean']:.1f}倍
"""
    
    report += "\n## 規制基準適合性\n"
    
    for limit_name, result in compliance.items():
        status = "適合" if result['exceeding_points'] == 0 else "超過あり"
        report += f"""
- {limit_name}: {status}
  基準値: {result['limit']} μSv/h
  超過点数: {result['exceeding_points']}/{result['total_points']}
  適合率: {result['compliance_ratio']*100:.1f}%
"""
    
    # ファイル保存
    with open('dose_analysis_report.md', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("解析レポートを 'dose_analysis_report.md' に保存しました。")

if __name__ == "__main__":
    analyze_dose_distribution()
```

---

## ⚠️ 第3章: 緊急時対応

### 🚨 3.1 よくある問題と解決法

#### **計算が開始されない**

```
🔍 症状チェックリスト:
□ エラーメッセージの有無
□ 入力データの妥当性
□ システムリソース状況
□ 依存関係の整合性

💊 段階的対処法:

Step 1: 基本確認
- 立体定義の構文チェック
- 材料名の正確性確認  
- 座標系の整合性確認
- 単位系の統一確認

Step 2: 入力データ検証
pokerinput_validateInput --comprehensive

Step 3: 最小構成での動作確認
# 最小限の球体モデルで動作テスト
simple_test:
  body:
    type: SPH
    center: "0 0 0"
    radius: 10.0
  zone:
    material: CONCRETE
    density: 2.3
  source:
    type: POINT
    position: "0 0 0"
    nuclide: Co60
    activity: 1e10

Step 4: ログ確認
- logs/error.log の確認
- システム側エラーメッセージの確認
- メモリ使用量の確認
```

#### **計算が異常終了する**

```
🔍 異常終了パターン別対処:

パターン1: メモリ不足
症状: "Out of memory" エラー
対処: 
- 線源分割数削減 (division.number を削減)
- cutoff_rate を大きく設定 (0.1-0.2)
- 計算領域の縮小

パターン2: 幾何学エラー  
症状: "Geometry overlap" エラー
対処:
- 立体間のオーバーラップ確認
- CMB式の論理エラー確認
- 座標系の単位統一確認

パターン3: 物理パラメータエラー
症状: "Invalid material property" エラー  
対処:
- 密度値の妥当性確認 (正の値、現実的範囲)
- 核種名の正確性確認
- 放射能値の有効範囲確認

パターン4: 数値計算エラー
症状: "Numerical instability" エラー
対処:
- 極端に小さい/大きい寸法の回避
- ゼロ割り算を引き起こす形状の回避
- 計算精度パラメータの調整
```

#### **結果が異常値を示す**

```  
🔍 異常値判定基準:
- 物理的に不合理な値 (負の線量率、極端に大きい値)
- 距離の逆2乗則からの大きな乖離
- 既知のベンチマーク問題との不一致

💊 段階的検証手順:

Step 1: 単位系確認
- 入力した単位と表示単位の整合性
- 座標系の基準点設定
- 時間単位の統一 (h vs s)

Step 2: 物理的妥当性確認  
# 簡易手計算との比較
手計算例: 点線源・球遮蔽
D = (S × Γ) / (4π × r²) × B × exp(-μt)
- S: 放射能 [Bq]
- Γ: 線量率定数 [μGy·m²/(h·Bq)]
- r: 距離 [m] 
- B: ビルドアップ係数
- μ: 線減弱係数 [cm⁻¹]
- t: 遮蔽厚 [cm]

Step 3: 系統的パラメータ変更
- 線源強度を1/10に → 線量率も1/10になるか
- 距離を2倍に → 線量率が1/4になるか  
- 遮蔽厚を2倍に → 指数的減衰するか

Step 4: 他コードとの比較
- MCNP, EGS, GEANT4等との比較
- 解析解が存在する問題での検証
- 類似問題の文献値との比較
```

### 🛠️ 3.2 システム復旧手順

#### **データファイル破損時の復旧**

```bash
# 緊急復旧手順

# Step 1: 被害状況確認
ls -la *.yaml
file *.yaml
head -n 20 pokerinputs.yaml

# Step 2: バックアップからの復旧
cd backups/
ls -t | head -5    # 最新5個のバックアップ確認

# 直近のバックアップをコピー
cp pokerinputs_YYYY-MM-DDTHH-MM-SS-MMMZ.yaml ../pokerinputs.yaml

# Step 3: 復旧確認
cd ..
node mcp_server.js --validate-config

# Step 4: 整合性チェック  
pokerinput_validateSystem --comprehensive
```

#### **計算中断からの再開**

```
🔄 中断状況別再開手順:

状況1: 正常中断（ユーザー操作）
対処: 
- 中断前の状態確認
- 必要に応じてバックアップから復旧
- 通常手順で再計算開始

状況2: システムエラーによる中断
対処:
# エラーログ確認
tail -n 100 logs/error.log

# システム状態確認  
ps aux | grep mcp_server
netstat -an | grep 3000

# プロセス再起動
killall node
node mcp_server.js

状況3: 外部要因による中断（停電等）
対処:
# データ整合性確認
pokerinput_validateIntegrity --full-check

# 破損がある場合はバックアップから復旧
# 破損がない場合は通常再開

状況4: 長時間計算の効率的再開
対処:
- 中間結果の活用可能性確認
- 計算パラメータの最適化
- 分割計算による段階的実行
```

#### **設定ファイル修復**

```yaml
# 設定ファイル修復テンプレート

# 最小限の動作設定
minimal_config:
  units:
    length: "cm"
    angle: "degree"  
    density: "g/cm3"
    radioactivity: "Bq"
  
  bodies:
    test_sphere:
      type: "SPH"
      center: "0 0 0"
      radius: 50.0
  
  zones:
    test_sphere:
      material: "CONCRETE"
      density: 2.3
  
  sources:
    test_source:
      name: "test_point"
      type: "POINT"
      position: "0 0 0"
      inventory:
        - nuclide: "Co60"
          radioactivity: 3.7e10
      cutoff_rate: 0.1

# 段階的機能確認
step1: 基本立体作成
step2: 材料設定追加  
step3: 線源設定追加
step4: 変換機能追加
step5: 複合形状追加
```

### 🔍 3.3 計算結果の妥当性チェック

#### **物理的合理性チェック**

```python
#!/usr/bin/env python3
"""
計算結果の物理的妥当性チェック
"""

def validate_physics(results):
    """物理法則との整合性確認"""
    
    checks = {
        'inverse_square_law': check_distance_dependence,
        'exponential_attenuation': check_shielding_effect,  
        'energy_conservation': check_energy_balance,
        'causality': check_causality_principle
    }
    
    validation_results = {}
    
    for check_name, check_func in checks.items():
        try:
            result = check_func(results)
            validation_results[check_name] = {
                'status': 'PASS' if result['valid'] else 'FAIL',
                'score': result['score'],
                'message': result['message']
            }
        except Exception as e:
            validation_results[check_name] = {
                'status': 'ERROR', 
                'score': 0.0,
                'message': str(e)
            }
    
    return validation_results

def check_distance_dependence(results):
    """距離の逆2乗則チェック"""
    
    # 同一線源からの異なる距離での線量率
    distances = results['distances']  
    dose_rates = results['dose_rates']
    
    # 理論値との比較
    reference_distance = distances[0]
    reference_dose = dose_rates[0]
    
    deviations = []
    for i in range(1, len(distances)):
        expected_dose = reference_dose * (reference_distance / distances[i])**2
        actual_dose = dose_rates[i]
        deviation = abs(actual_dose - expected_dose) / expected_dose
        deviations.append(deviation)
    
    avg_deviation = np.mean(deviations)
    
    return {
        'valid': avg_deviation < 0.2,  # 20%以内の誤差
        'score': max(0, 1 - avg_deviation),
        'message': f'逆2乗則からの平均偏差: {avg_deviation*100:.1f}%'
    }

def check_shielding_effect(results):
    """遮蔽効果の指数減衰チェック"""
    
    thicknesses = results['shield_thicknesses']
    dose_rates = results['shielded_dose_rates']
    
    # 対数プロットでの直線性確認
    log_doses = np.log(dose_rates)
    
    # 線形回帰
    from scipy import stats
    slope, intercept, r_value, p_value, std_err = stats.linregress(thicknesses, log_doses)
    
    # 相関係数による評価
    correlation_quality = r_value**2
    
    return {
        'valid': correlation_quality > 0.95,
        'score': correlation_quality,
        'message': f'指数減衰の決定係数: {correlation_quality:.3f}'
    }

def check_energy_balance(results):
    """エネルギー保存チェック"""
    
    input_energy = results['source_energy']
    output_energy = results['detected_energy'] + results['absorbed_energy']
    
    energy_balance = abs(input_energy - output_energy) / input_energy
    
    return {
        'valid': energy_balance < 0.05,  # 5%以内
        'score': max(0, 1 - energy_balance*10),
        'message': f'エネルギー収支誤差: {energy_balance*100:.1f}%'
    }
```

#### **統計的品質チェック**

```python
def check_statistical_quality(results):
    """統計的品質の評価"""
    
    dose_values = results['dose_measurements']
    uncertainties = results['statistical_uncertainties']
    
    quality_metrics = {}
    
    # 相対標準偏差チェック
    relative_uncertainties = uncertainties / dose_values
    avg_relative_unc = np.mean(relative_uncertainties)
    
    quality_metrics['statistical_precision'] = {
        'avg_relative_uncertainty': avg_relative_unc,
        'acceptable': avg_relative_unc < 0.1,  # 10%以内
        'excellent': avg_relative_unc < 0.05   # 5%以内
    }
    
    # 正規性テスト（複数回計算の場合）
    if 'multiple_runs' in results:
        from scipy.stats import shapiro
        stat, p_value = shapiro(results['multiple_runs'])
        
        quality_metrics['normality'] = {
            'shapiro_stat': stat,
            'p_value': p_value,
            'is_normal': p_value > 0.05
        }
    
    # 外れ値検出
    q1, q3 = np.percentile(dose_values, [25, 75])
    iqr = q3 - q1
    outlier_threshold = 1.5 * iqr
    
    outliers = dose_values[(dose_values < q1 - outlier_threshold) | 
                          (dose_values > q3 + outlier_threshold)]
    
    quality_metrics['outliers'] = {
        'count': len(outliers),
        'percentage': len(outliers) / len(dose_values) * 100,
        'acceptable': len(outliers) / len(dose_values) < 0.05  # 5%未満
    }
    
    return quality_metrics
```

### 📞 3.4 サポート情報

#### **問題報告テンプレート**

```markdown
# 問題報告書

## 基本情報
- 日時: YYYY/MM/DD HH:MM
- 報告者: [氏名・所属]
- システム: Poker MCP v[バージョン]
- 計算環境: [OS, メモリ容量等]

## 問題の詳細
### 発生した問題
[問題の簡潔な説明]

### 期待していた動作
[本来期待していた結果]

### 実際の動作  
[実際に起こった現象]

### 再現手順
1. [具体的な操作手順]
2. 
3. 

### 関連ファイル
- 入力ファイル: [ファイル名]
- エラーログ: [該当箇所を抜粋]
- スクリーンショット: [必要に応じて]

## 環境情報
### システム構成
- OS: 
- Node.js: 
- メモリ: 
- ディスク容量: 

### 計算条件
- 立体数: 
- 線源数: 
- 計算点数: 
- 計算時間: 

## 緊急度
- [ ] 低（業務に支障なし）
- [ ] 中（業務効率に影響）  
- [ ] 高（業務停止）
- [ ] 緊急（安全性に関わる）

## 試行した対処
[既に試行した対処法があれば記載]

## 追加情報
[その他関連する情報]
```

#### **技術サポート連絡先**

```
📧 技術サポート体制

レベル1: 基本サポート
- 対象: 操作方法、設定方法の質問
- 連絡先: https://pointkernel.com/inquiry/

レベル2: 技術サポート  
- 対象: 計算結果の解釈、物理的妥当性の質問
- 連絡先: https://pointkernel.com/docs/support/

🌐 オンラインリソース
- FAQ: https://pointkernel.com/docs/support/
- ドキュメント: https://pointkernel.com/docs/
- 更新情報: https://pointkernel.com/docs/history/

🎓 研修・教育サポート
- 講師派遣: 機関・団体向け（要予約）https://pointkernel.com/inquiry/
```

---

## 💡 第4章: Tips & Tricks

### ⚡ 4.1 パフォーマンス向上のコツ

#### **計算効率化の基本戦略**

```
🎯 効率化の優先順位:
1. 物理的近似の適切な活用
2. 幾何学的複雑さの最適化  
3. 統計的パラメータの調整
4. システムリソースの効率利用

💪 具体的手法:

手法1: カットオフ率の最適化
# 目的別推奨値
cutoff_rates:
  概略設計: 0.1      # 90%カットオフ、高速
  標準設計: 0.05     # 95%カットオフ、バランス
  詳細設計: 0.02     # 98%カットオフ、高精度
  研究用: 0.01       # 99%カットオフ、最高精度

手法2: 線源分割の最適化
# 形状別推奨分割数
division_guidelines:
  SPH: {r: 4, theta: 6, phi: 8}          # 球対称考慮
  RCC: {r: 3, phi: 8, z: 10}             # 軸対称活用
  RPP: {edge_1: 6, edge_2: 6, edge_3: 8} # 立方対称
  
# 総分割数の目安
total_divisions:
  高速計算: <500      # 数分
  標準計算: 500-2000  # 10-30分  
  高精度計算: >2000   # 1時間以上

手法3: 幾何学的最適化
geometry_optimization:
  - 不要な細部形状の省略
  - 対称性の活用（1/4, 1/8モデル）
  - 遠方領域の簡略化
  - 重要でない小形状の統合
```

#### **メモリ効率的なモデル設計**

```yaml
# メモリ使用量削減テクニック

technique_1_smart_meshing:
  concept: "重要領域の細分化、非重要領域の粗分化"
  example:
    high_importance_region:
      division: {r: 8, phi: 12, z: 10}    # 960分割
    low_importance_region:  
      division: {r: 2, phi: 4, z: 4}      # 32分割
  
technique_2_progressive_calculation:
  concept: "段階的詳細化による効率計算"
  steps:
    step1: 
      description: "粗いメッシュで全体把握"
      cutoff_rate: 0.1
      divisions: 100
    step2:
      description: "重要領域の詳細化"  
      cutoff_rate: 0.05
      divisions: 500
    step3:
      description: "最終精度での計算"
      cutoff_rate: 0.02
      divisions: 1000

technique_3_memory_monitoring:
  commands:
    # メモリ使用量確認
    - "ps -o pid,vsz,rss,comm -p $(pgrep node)"
    - "free -h"
    - "du -sh logs/"
  
  optimization:
    # メモリ不足時の緊急対処
    - cutoff_rate: 0.2        # より緩い設定
    - division_reduction: 0.5  # 分割数半減
    - intermediate_cleanup: true # 中間結果削除
```

### 🧠 4.2 計算時間短縮テクニック

#### **並列計算の活用**

```bash
# 複数CPUコアの活用

# 環境変数設定
export NODE_OPTIONS="--max-old-space-size=8192"  # 8GB確保
export OMP_NUM_THREADS=4                         # 4コア並列

# 複数ケース並列実行
parallel_cases=(
    "case1_5cm_concrete"
    "case2_10cm_concrete" 
    "case3_15cm_concrete"
    "case4_20cm_concrete"
)

for case in "${parallel_cases[@]}"; do
    (
        echo "計算開始: $case"
        node mcp_server.js --config="${case}.yaml" > "${case}.log" 2>&1
        echo "計算完了: $case"
    ) &
done

# 全ケース完了まで待機
wait
echo "全ケース計算完了"
```

#### **インクリメンタル計算**

```python
#!/usr/bin/env python3
"""
インクリメンタル計算による効率化
"""

def incremental_calculation():
    """段階的詳細化計算"""
    
    # Stage 1: 概略計算（高速）
    stage1_config = {
        'cutoff_rate': 0.2,
        'max_divisions': 100,
        'target_uncertainty': 0.3
    }
    
    result1 = run_calculation(stage1_config)
    print(f"Stage 1: {result1['calculation_time']:.1f}秒")
    
    # 重要領域特定
    important_regions = identify_important_regions(result1)
    
    # Stage 2: 重点計算（中速）  
    stage2_config = {
        'cutoff_rate': 0.1,
        'max_divisions': 500,
        'target_uncertainty': 0.1,
        'focus_regions': important_regions
    }
    
    result2 = run_calculation(stage2_config)
    print(f"Stage 2: {result2['calculation_time']:.1f}秒")
    
    # Stage 3: 最終精密計算（低速・高精度）
    stage3_config = {
        'cutoff_rate': 0.02,
        'max_divisions': 2000,
        'target_uncertainty': 0.05,
        'focus_regions': refine_important_regions(result2)
    }
    
    result3 = run_calculation(stage3_config)
    print(f"Stage 3: {result3['calculation_time']:.1f}秒")
    
    # 総計算時間の比較
    total_incremental = result1['calculation_time'] + result2['calculation_time'] + result3['calculation_time']
    direct_time_estimate = estimate_direct_calculation_time(stage3_config)
    
    efficiency = (direct_time_estimate - total_incremental) / direct_time_estimate * 100
    print(f"効率化: {efficiency:.1f}% 短縮")
    
    return result3

def identify_important_regions(result):
    """重要領域の自動特定"""
    
    # 高線量率領域
    high_dose_regions = find_regions_above_threshold(
        result['dose_distribution'], 
        threshold=result['max_dose'] * 0.1
    )
    
    # 勾配大領域（線量率変化が激しい領域）
    high_gradient_regions = find_high_gradient_regions(
        result['dose_distribution'],
        gradient_threshold=result['max_gradient'] * 0.5
    )
    
    # 規制基準近傍領域
    regulatory_concern_regions = find_regulatory_regions(
        result['dose_distribution'],
        regulatory_limits=[0.5, 2.5, 10.0]  # μSv/h
    )
    
    return {
        'high_dose': high_dose_regions,
        'high_gradient': high_gradient_regions,
        'regulatory': regulatory_concern_regions
    }
```

#### **計算結果のキャッシュ活用**

```python
import hashlib
import pickle
import os

class CalculationCache:
    """計算結果キャッシュシステム"""
    
    def __init__(self, cache_dir='calculation_cache'):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def get_cache_key(self, config):
        """設定からキャッシュキー生成"""
        
        # 設定を正規化してハッシュ化
        config_str = str(sorted(config.items()))
        return hashlib.md5(config_str.encode()).hexdigest()
    
    def get_cached_result(self, config):
        """キャッシュから結果取得"""
        
        cache_key = self.get_cache_key(config)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.pkl")
        
        if os.path.exists(cache_file):
            with open(cache_file, 'rb') as f:
                cached_result = pickle.load(f)
            
            print(f"キャッシュヒット: {cache_key[:8]}...")
            return cached_result
        
        return None
    
    def save_result(self, config, result):
        """結果をキャッシュに保存"""
        
        cache_key = self.get_cache_key(config)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.pkl")
        
        with open(cache_file, 'wb') as f:
            pickle.dump(result, f)
        
        print(f"結果をキャッシュ: {cache_key[:8]}...")
    
    def smart_calculation(self, config):
        """キャッシュを活用した賢い計算"""
        
        # キャッシュ確認
        cached_result = self.get_cached_result(config)
        if cached_result:
            return cached_result
        
        # 類似設定のキャッシュ確認
        similar_result = self.find_similar_cached_result(config)
        if similar_result and self.can_interpolate(config, similar_result):
            return self.interpolate_result(config, similar_result)
        
        # 新規計算実行
        result = run_calculation(config)
        self.save_result(config, result)
        
        return result
```

### 🎯 4.3 デバッグ・検証の効率化

#### **段階的デバッグ手法**

```python
def systematic_debugging():
    """系統的デバッグアプローチ"""
    
    debug_steps = [
        {'name': 'input_validation', 'func': validate_inputs},
        {'name': 'geometry_check', 'func': check_geometry},
        {'name': 'physics_validation', 'func': validate_physics},
        {'name': 'numerical_stability', 'func': check_stability},
        {'name': 'output_verification', 'func': verify_outputs}
    ]
    
    debug_results = {}
    
    for step in debug_steps:
        print(f"デバッグ段階: {step['name']}")
        
        try:
            result = step['func']()
            debug_results[step['name']] = {
                'status': 'PASS' if result['success'] else 'FAIL',
                'details': result['details'],
                'suggestions': result.get('suggestions', [])
            }
            
            if not result['success']:
                print(f"  ❌ 問題発見: {result['details']}")
                for suggestion in result.get('suggestions', []):
                    print(f"  💡 対処法: {suggestion}")
                break
            else:
                print(f"  ✅ 正常: {result['details']}")
                
        except Exception as e:
            debug_results[step['name']] = {
                'status': 'ERROR',
                'details': str(e),
                'suggestions': ['例外処理の確認が必要']
            }
            print(f"  ⚠️ エラー: {e}")
    
    generate_debug_report(debug_results)
    return debug_results

def validate_inputs():
    """入力データの妥当性検証"""
    
    checks = []
    
    # 立体定義チェック
    geometry_issues = []
    for body_name, body_def in get_bodies().items():
        if not validate_body_definition(body_def):
            geometry_issues.append(f"立体 '{body_name}' の定義に問題")
    
    # 材料設定チェック
    material_issues = []
    for zone_name, zone_def in get_zones().items():
        if not validate_material_properties(zone_def):
            material_issues.append(f"材料 '{zone_name}' の設定に問題")
    
    # 線源設定チェック
    source_issues = []
    for source_name, source_def in get_sources().items():
        if not validate_source_definition(source_def):
            source_issues.append(f"線源 '{source_name}' の設定に問題")
    
    all_issues = geometry_issues + material_issues + source_issues
    
    return {
        'success': len(all_issues) == 0,
        'details': f"検出された問題: {len(all_issues)}個",
        'suggestions': all_issues if all_issues else ['入力データは正常です']
    }

def check_geometry():
    """幾何学的整合性チェック"""
    
    geometry_tests = [
        test_volume_overlaps,
        test_void_regions,
        test_coordinate_ranges,
        test_transform_consistency
    ]
    
    issues = []
    for test in geometry_tests:
        test_result = test()
        if not test_result['passed']:
            issues.extend(test_result['issues'])
    
    return {
        'success': len(issues) == 0,
        'details': f"幾何学的問題: {len(issues)}個",
        'suggestions': issues if issues else ['幾何学的設定は正常です']
    }
```

#### **自動テストスイート**

```python
#!/usr/bin/env python3
"""
自動テストスイート
"""

import unittest
import numpy as np

class PokerMCPTestSuite(unittest.TestCase):
    """Poker MCP自動テストスイート"""
    
    def setUp(self):
        """テスト前準備"""
        self.test_configs = load_test_configurations()
        self.reference_results = load_reference_results()
        
    def test_basic_sphere_shielding(self):
        """基本的な球遮蔽計算テスト"""
        
        config = {
            'geometry': 'simple_sphere',
            'material': 'lead',
            'thickness': 5.0,  # cm
            'source': 'co60_point'
        }
        
        result = run_test_calculation(config)
        expected = self.reference_results['sphere_lead_5cm']
        
        # 5%以内の誤差を許容
        relative_error = abs(result['dose_rate'] - expected) / expected
        self.assertLess(relative_error, 0.05, 
                       f"球遮蔽テスト失敗: 誤差{relative_error*100:.1f}%")
    
    def test_distance_scaling(self):
        """距離依存性テスト"""
        
        distances = [1.0, 2.0, 3.0, 5.0]  # m
        dose_rates = []
        
        for distance in distances:
            config = create_distance_test_config(distance)
            result = run_test_calculation(config)
            dose_rates.append(result['dose_rate'])
        
        # 逆2乗則のチェック
        reference_dose = dose_rates[0]
        for i, (distance, dose_rate) in enumerate(zip(distances[1:], dose_rates[1:]), 1):
            expected_dose = reference_dose / (distance**2)
            relative_error = abs(dose_rate - expected_dose) / expected_dose
            
            self.assertLess(relative_error, 0.1,
                           f"距離{distance}mでの逆2乗則テスト失敗: 誤差{relative_error*100:.1f}%")
    
    def test_material_properties(self):
        """材料特性テスト"""
        
        materials = ['lead', 'concrete', 'steel', 'water']
        
        for material in materials:
            with self.subTest(material=material):
                config = create_material_test_config(material)
                result = run_test_calculation(config)
                
                # 材料固有の遮蔽効果確認
                expected_range = self.reference_results[f'{material}_range']
                self.assertGreaterEqual(result['dose_rate'], expected_range['min'])
                self.assertLessEqual(result['dose_rate'], expected_range['max'])
    
    def test_numerical_stability(self):
        """数値安定性テスト"""
        
        # 同一条件での複数回計算
        config = create_stability_test_config()
        results = []
        
        for run in range(10):
            result = run_test_calculation(config)
            results.append(result['dose_rate'])
        
        # 変動係数（CV）の確認
        mean_dose = np.mean(results)
        std_dose = np.std(results)
        cv = std_dose / mean_dose
        
        self.assertLess(cv, 0.05, 
                       f"数値安定性テスト失敗: CV={cv*100:.1f}%")
    
    def test_edge_cases(self):
        """境界値テスト"""
        
        edge_cases = [
            {'name': 'minimum_thickness', 'thickness': 0.001},
            {'name': 'maximum_thickness', 'thickness': 100.0},
            {'name': 'minimum_activity', 'activity': 1e6},
            {'name': 'maximum_activity', 'activity': 1e15}
        ]
        
        for case in edge_cases:
            with self.subTest(case=case['name']):
                config = create_edge_case_config(case)
                
                # 例外が発生せずに計算完了することを確認
                try:
                    result = run_test_calculation(config)
                    self.assertIsNotNone(result)
                    self.assertGreater(result['dose_rate'], 0)
                except Exception as e:
                    self.fail(f"境界値テスト '{case['name']}' で例外発生: {e}")

def run_test_suite():
    """テストスイート実行"""
    
    # テスト実行
    unittest.main(verbosity=2)

if __name__ == "__main__":
    run_test_suite()
```

#### **性能プロファイリング**

```python
import cProfile
import pstats
import time
from functools import wraps

def profile_calculation(func):
    """計算性能プロファイリングデコレータ"""
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        # プロファイリング開始
        profiler = cProfile.Profile()
        profiler.enable()
        
        # 実行時間測定開始
        start_time = time.time()
        
        try:
            # 関数実行
            result = func(*args, **kwargs)
            
            # 実行時間測定終了
            end_time = time.time()
            execution_time = end_time - start_time
            
            # プロファイリング終了
            profiler.disable()
            
            # 結果分析
            stats = pstats.Stats(profiler)
            stats.sort_stats('cumulative')
            
            # パフォーマンスレポート生成
            generate_performance_report(stats, execution_time, result)
            
            return result
            
        except Exception as e:
            profiler.disable()
            raise e
    
    return wrapper

def generate_performance_report(stats, execution_time, result):
    """パフォーマンスレポート生成"""
    
    report = f"""
# 計算性能レポート

## 実行時間
- 総実行時間: {execution_time:.2f}秒
- 計算点数: {result.get('calculation_points', 'N/A')}
- 点あたり時間: {execution_time/result.get('calculation_points', 1)*1000:.2f}ms/点

## 処理時間内訳
"""
    
    # 上位10個の関数を抽出
    stats.print_stats(10)
    
    # メモリ使用量情報
    memory_info = get_memory_usage()
    report += f"""
## メモリ使用量
- ピークメモリ: {memory_info['peak_memory']:.1f}MB
- 現在使用量: {memory_info['current_memory']:.1f}MB
- メモリ効率: {result.get('calculation_points', 0)/memory_info['peak_memory']:.0f}点/MB
"""
    
    # ファイル保存
    with open('performance_report.md', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("性能レポートを 'performance_report.md' に保存しました。")

@profile_calculation
def optimized_calculation(config):
    """最適化された計算実行"""
    
    # 事前チェック
    validate_configuration(config)
    
    # キャッシュ確認
    cached_result = check_calculation_cache(config)
    if cached_result:
        return cached_result
    
    # 計算実行
    result = execute_calculation(config)
    
    # キャッシュ保存
    save_to_cache(config, result)
    
    return result
```

### 🏆 4.4 実用的応用テクニック

#### **設計最適化ワークフロー**

```python
#!/usr/bin/env python3
"""
設計最適化統合ワークフロー
"""

from scipy.optimize import minimize
import numpy as np

class ShieldOptimizer:
    """遮蔽設計最適化クラス"""
    
    def __init__(self, base_config, constraints, objectives):
        self.base_config = base_config
        self.constraints = constraints
        self.objectives = objectives
        self.optimization_history = []
    
    def optimize_shield_design(self):
        """遮蔽設計の多目的最適化"""
        
        # 初期設計パラメータ
        initial_params = [
            self.base_config['concrete_thickness'],  # cm
            self.base_config['lead_thickness'],      # cm
            self.base_config['air_gap']              # cm
        ]
        
        # 制約条件
        constraints = [
            {'type': 'ineq', 'fun': self.dose_rate_constraint},
            {'type': 'ineq', 'fun': self.cost_constraint},
            {'type': 'ineq', 'fun': self.weight_constraint}
        ]
        
        # パラメータ範囲
        bounds = [
            (10, 100),   # コンクリート厚 10-100cm
            (0, 20),     # 鉛厚 0-20cm
            (0, 50)      # 空気層 0-50cm
        ]
        
        # 最適化実行
        result = minimize(
            fun=self.objective_function,
            x0=initial_params,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints,
            callback=self.optimization_callback
        )
        
        if result.success:
            optimal_design = self.create_optimal_config(result.x)
            performance = self.evaluate_design_performance(optimal_design)
            
            print(f"最適化成功!")
            print(f"最適パラメータ: {result.x}")
            print(f"目的関数値: {result.fun:.3f}")
            print(f"性能指標: {performance}")
            
            return optimal_design
        else:
            print(f"最適化失敗: {result.message}")
            return None
    
    def objective_function(self, params):
        """多目的最適化の目的関数"""
        
        concrete_thickness, lead_thickness, air_gap = params
        
        # 設計案作成
        design_config = self.create_design_config(params)
        
        # 性能評価
        try:
            result = run_calculation(design_config)
            
            # 目的関数要素
            dose_rate = result['max_dose_rate']         # μSv/h
            material_cost = self.calculate_cost(params)  # 円
            total_weight = self.calculate_weight(params) # kg
            
            # 重み付き総合評価
            objective = (
                self.objectives['dose_weight'] * (dose_rate / 2.5) +     # 基準値で正規化
                self.objectives['cost_weight'] * (material_cost / 1e6) + # 100万円で正規化  
                self.objectives['weight_weight'] * (total_weight / 1e4)  # 10トンで正規化
            )
            
            return objective
            
        except Exception as e:
            print(f"計算エラー (params={params}): {e}")
            return float('inf')
    
    def dose_rate_constraint(self, params):
        """線量率制約関数"""
        
        design_config = self.create_design_config(params)
        result = run_calculation(design_config)
        
        # 制約: 最大線量率 ≤ 2.5 μSv/h
        return 2.5 - result['max_dose_rate']
    
    def cost_constraint(self, params):
        """コスト制約関数"""
        
        total_cost = self.calculate_cost(params)
        
        # 制約: 総コスト ≤ 予算
        return self.constraints['max_budget'] - total_cost
    
    def create_design_config(self, params):
        """パラメータから設計設定作成"""
        
        concrete_thickness, lead_thickness, air_gap = params
        
        config = self.base_config.copy()
        
        # 遮蔽構造更新
        config['shield_layers'] = [
            {'material': 'CONCRETE', 'thickness': concrete_thickness},
            {'material': 'LEAD', 'thickness': lead_thickness},
            {'material': 'AIR', 'thickness': air_gap}
        ]
        
        return config
    
    def optimization_callback(self, params):
        """最適化進行状況コールバック"""
        
        iteration = len(self.optimization_history)
        objective_value = self.objective_function(params)
        
        self.optimization_history.append({
            'iteration': iteration,
            'parameters': params.copy(),
            'objective': objective_value
        })
        
        if iteration % 10 == 0:
            print(f"反復 {iteration}: 目的関数値 = {objective_value:.3f}")
```

#### **感度解析・不確かさ伝播**

```python
def uncertainty_propagation_analysis():
    """不確かさ伝播解析"""
    
    # 入力パラメータの不確かさ定義
    input_uncertainties = {
        'density_concrete': {'mean': 2.3, 'std': 0.1},      # g/cm³
        'thickness_wall': {'mean': 30.0, 'std': 2.0},       # cm
        'source_activity': {'mean': 3.7e11, 'std': 3.7e10}, # Bq
        'distance': {'mean': 100.0, 'std': 5.0}             # cm
    }
    
    # モンテカルロ法による不確かさ伝播
    n_samples = 1000
    output_samples = []
    
    for i in range(n_samples):
        # パラメータサンプリング
        sample_params = {}
        for param_name, uncertainty in input_uncertainties.items():
            sample_params[param_name] = np.random.normal(
                uncertainty['mean'], 
                uncertainty['std']
            )
        
        # 計算実行
        sample_config = create_sample_config(sample_params)
        result = run_calculation(sample_config)
        output_samples.append(result['dose_rate'])
        
        if (i + 1) % 100 == 0:
            print(f"進行状況: {i + 1}/{n_samples} サンプル完了")
    
    # 出力統計量計算
    output_stats = {
        'mean': np.mean(output_samples),
        'std': np.std(output_samples),
        'cv': np.std(output_samples) / np.mean(output_samples),
        'percentiles': {
            'p5': np.percentile(output_samples, 5),
            'p95': np.percentile(output_samples, 95),
            'p99': np.percentile(output_samples, 99)
        }
    }
    
    # 不確かさ寄与分析
    sensitivity_analysis = perform_sensitivity_analysis(
        input_uncertainties, 
        output_samples
    )
    
    # 結果レポート
    generate_uncertainty_report(output_stats, sensitivity_analysis)
    
    return output_stats, sensitivity_analysis

def perform_sensitivity_analysis(input_uncertainties, output_samples):
    """感度解析実行"""
    
    sensitivity_indices = {}
    
    for param_name in input_uncertainties.keys():
        # 一次感度指数計算（Sobol法）
        si_first = calculate_first_order_sobol_index(param_name, output_samples)
        
        # 全次感度指数計算
        si_total = calculate_total_sobol_index(param_name, output_samples)
        
        sensitivity_indices[param_name] = {
            'first_order': si_first,
            'total_order': si_total,
            'main_effect': si_first / si_total if si_total > 0 else 0
        }
    
    return sensitivity_indices
```

---

## 🎊 まとめ

この**クイックリファレンス**により、放射線遮蔽研究者は：

### ⚡ **日常業務の効率化**
- **即座に参照可能**な実用的コマンド・設定例
- **コピペ可能**なスクリプトテンプレート
- **段階的デバッグ**による迅速な問題解決

### 🎯 **計算品質の向上**
- **物理的妥当性チェック**による信頼性確保
- **自動化スクリプト**による計算効率化
- **最適化手法**による設計品質向上

### 💪 **実践的スキル強化**
- **パフォーマンス最適化**テクニック
- **トラブルシューティング**の系統的アプローチ
- **品質保証**の具体的手法

### 🌟 **研究競争力の向上**
- **計算時間の大幅短縮**（最大70%削減）
- **結果の信頼性向上**（不確かさ定量評価）
- **標準化された品質管理**（再現性確保）

このクイックリファレンスは、**研究者の日常的なパートナー**として、効率的で高品質な放射線遮蔽計算をサポートします。

---

**📚 関連文書**
- [ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md) - 基本操作と実用例  
- [PHYSICS_REFERENCE.md](PHYSICS_REFERENCE.md) - 物理的理論と計算背景
- [RESEARCH_WORKFLOWS.md](RESEARCH_WORKFLOWS.md) - 研究分野別ワークフロー

---
*© 2025 Poker MCP Project. 研究者のための実用クイックリファレンス*