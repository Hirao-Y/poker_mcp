# 🧬 研究ワークフロー - Poker MCP

**対象読者**: 放射線遮蔽研究者・設計エンジニア・安全評価者  
<<<<<<< HEAD
**バージョン**: 1.1.0 MCP Edition  
**最終更新**: 2025年9月8日  
**使用方法**: Claude Desktop + MCP通信
=======
**バージョン**: 1.2.0 MCP Edition  
**最終更新**: 2025年1月24日  
**使用方法**: Claude Desktop + MCP通信（28メソッド対応）
>>>>>>> afterKOKURA

---

## 🎯 このガイドの特徴

### 🔬 **分野別特化設計**
- **医療施設**: 診断・治療施設の遮蔽設計ワークフロー
- **原子力施設**: 原子炉・燃料サイクル施設の安全評価
- **研究施設**: 実験室・加速器施設の遮蔽計画
- **28メソッド活用**: 全機能を活用した実践例

### 📊 **完全ワークフロー提供**
各分野で**問題設定→モデル作成→計算実行→結果評価→報告書作成**まで、Claude Desktop上で一貫して実行可能な手順を提供。

---

## 🏥 第1章: 医療施設遮蔽設計

### 1.1 診療放射線科の遮蔽設計ワークフロー

#### **Step 1: 初期設定と単位系定義（Unit操作5メソッド活用）**
```
Claude Desktop 指示:
「医療施設CT室の遮蔽設計を開始します。

初期化と単位系設定:
1. poker_resetYaml でクリーンな状態から開始（standardレベル）
2. poker_proposeUnit で単位系を設定:
   - length: cm（建築図面との整合性）
   - angle: degree（施工図との整合性）
   - density: (g/cm³)（標準）
   - radioactivity: (Bq)（標準）
3. poker_validateUnitIntegrity で単位系の完全性を確認

設定完了後、状態を確認してください。」
```

#### **Step 2: 基本遮蔽モデルの作成（28メソッド活用）**
```
Claude Desktop 指示:
「CT室の完全な遮蔽モデルを作成してください。

立体構造の定義（Body操作）:
1. poker_proposeBody で以下を作成:
   - room: RPPタイプ、内寸 500×400×300 cm
   - north_wall: RPPタイプ、厚さ30cm
   - south_wall: RPPタイプ、厚さ30cm
   - east_wall: RPPタイプ、厚さ30cm
   - west_wall: RPPタイプ、厚さ30cm
   - ceiling: RPPタイプ、厚さ20cm
   - floor: RPPタイプ、厚さ20cm
   - door_opening: RPPタイプ（扉部開口）
   - shield_door: BOXタイプ（鉛当量2mm相当）

材料設定(Zone操作):
2. poker_proposeZoneで各立体に材料を設定:
   - 壁・天井・床: CONCRETE、密度2.3(g/cm³)
   - 扉部: Lead相当、密度11.34(g/cm³)（薄層補正）

ビルドアップ係数設定(BuildupFactor操作4メソッド):
3. poker_proposeBuildupFactor:
   - Concrete: 標準設定（両補正false）
   - Lead: 薄層のため有限媒体補正true

線源モデリング(Source操作):
4. poker_proposeSource:
   - 名前: ct_xray_source
   - タイプ: POINT（簡略化）
   - 位置: "250 200 150"（室中心）
   - 核種: Co60（X線の等価モデル）
   - 放射能: 1e10(Bq)
   - カットオフ: 0.0001

検出器配置(Detector操作):
5. poker_proposeDetector で評価点を設定:
   - control_room: 北壁外30cm（点検出器）
   - corridor_grid: 廊下部（10×10格子）
   - above_room: 上階床面（面検出器）
   - adjacent_room: 隣室（体積検出器）

変更の適用:
6. poker_applyChanges でモデルを保存

完全なYAMLファイルを生成してください。」
```

#### **Step 3: 計算実行と結果解析**
```
Claude Desktop 指示:
「作成したCT室モデルで計算を実行し、結果を解析してください。

計算実行（Calculation操作）:
1. poker_executeCalculation:
   yaml_file: "poker.yaml"
   summary_options:
     show_parameters: true
     show_source_data: true
     show_total_dose: true
   output_files:
     summary_file: "ct_room_summary.yaml"
     dose_file: "ct_room_dose.yaml"

サマリーファイル解析:
2. ct_room_summary.yamlの4セクションを解析:
   
   a) 入力パラメータセクション:
      - 全設定の確認
      - 物理的妥当性チェック
   
   b) intermediateセクション:
      - 透過経路の確認
      - 遮蔽材通過距離の評価
      - 減衰係数の妥当性
   
   c) resultセクション:
      - 各線源から各検出器への個別線量
      - ビルドアップ係数の確認
      - 主要透過経路の特定
   
   d) result_totalセクション:
      - 各検出器での総線量率
      - 規制値との比較（週1.3mSv以下）
      - 安全裕度の評価

結果を表形式でまとめてください。」
```

#### **Step 4: 最適化と子孫核種考慮**
```
Claude Desktop 指示:
「計算結果に基づく最適化と、実際の核種での再評価を行ってください。

子孫核種の確認（DaughterNuclide操作）:
1. poker_confirmDaughterNuclides:
   action: "check"
   source_name: "ct_xray_source"
   → Co60の場合、子孫核種なし確認

最適化検討:
2. 線量が規制値を超える場合:
   - poker_updateBody で壁厚増加
   - poker_updateZone で高密度材料に変更
   - poker_changeOrderBuildupFactor で計算精度向上

3. 過剰遮蔽の場合:
   - poker_updateBody で壁厚削減
   - コスト最適化の実施

再計算と確認:
4. poker_executeCalculation で再計算
5. 最終的な安全性確認

最適設計案を提示してください。」
```

### 1.2 核医学施設（PET-CT）の遮蔽設計

#### **完全なYAML例: PET-CT施設**
```yaml
# PET-CT施設遮蔽設計（28メソッド活用例）
unit:
  length: cm
  angle: degree
  density: g/cm³
  radioactivity: Bq

bodies:
  # PET-CT室本体
  - name: pet_room
    type: RPP
    min: "0 0 0"
    max: "700 600 350"
  
  # 遮蔽壁（6面）
  - name: north_wall
    type: RPP
    min: "-40 0 0"
    max: "0 600 350"
  
  - name: south_wall
    type: RPP
    min: "700 0 0"
    max: "740 600 350"
  
  # 操作室との境界（鉛ガラス窓付き）
  - name: control_wall
    type: CMB
    expression: "wall_base - window_opening"
  
  # 迷路構造（中性子遮蔽）
  - name: maze_wall_1
    type: BOX
    vertex: "600 400 0"
    edge_1: "100 0 0"
    edge_2: "0 20 0"
    edge_3: "0 0 300"

zones:
  - body_name: north_wall
    material: Concrete
    density: 2.3
  
  - body_name: control_wall
    material: Lead
    density: 11.34
  
  - body_name: maze_wall_1
    material: Polyethylene  # 中性子遮蔽
    density: 0.95

buildup_factor:
  - material: Concrete
    use_slant_correction: false
    use_finite_medium_correction: false
  
  - material: Lead
    use_slant_correction: true  # 斜め入射考慮
    use_finite_medium_correction: false
  
  - material: Polyethylene
    use_slant_correction: false
    use_finite_medium_correction: true  # 薄層補正

sources:
  # F-18線源（PET薬剤）
  - name: f18_patient
    type: SPH
    geometry:
      center: "350 300 100"
      radius: 30
    division:
      r:
        type: UNIFORM
        number: 5
        min: 0.0
        max: 1.0
      theta:
        type: UNIFORM
        number: 10
      phi:
        type: UNIFORM
        number: 10
    inventory:
      - nuclide: F18
        radioactivity: 3.7e8  # 370 MBq
    cutoff_rate: 0.0001
  
  # CT部（X線等価）
  - name: ct_xray
    type: POINT
    position: "350 300 150"
    inventory:
      - nuclide: Co60
        radioactivity: 1e9
    cutoff_rate: 0.0001

detectors:
  # 操作室（点検出器）
  - name: control_point
    origin: "-60 300 150"
    show_path_trace: true
  
  # 廊下（線検出器）
  - name: corridor_line
    origin: "750 0 150"
    grid:
      - edge: "0 600 0"
        number: 20
    show_path_trace: false
  
  # 上階（面検出器）
  - name: upper_floor
    origin: "0 0 360"
    grid:
      - edge: "700 0 0"
        number: 10
      - edge: "0 600 0"
        number: 10
    show_path_trace: false
```

---

## ⚛️ 第2章: 原子力施設遮蔽評価

### 2.1 使用済燃料貯蔵施設

#### **大規模計算のワークフロー**
```
Claude Desktop 指示:
「使用済燃料貯蔵施設の大規模遮蔽計算を実行してください。

計算規模の課題:
- 燃料集合体: 100体
- 各集合体: 複数核種
- 評価点: 1000点以上

メモリ管理とカットオフ設定:
1. 段階的計算アプローチ:
   a) 粗い計算（cutoff_rate: 0.01）で全体傾向把握
   b) 重要領域特定（ホットスポット）
   c) 詳細計算（cutoff_rate: 0.0001）を重要領域に限定

2. 分割計算の実装:
   - 燃料集合体を10グループに分割
   - 各グループで poker_proposeSource
   - poker_executeCalculation を10回実行
   - 結果の重ね合わせ処理

3. メモリ最適化:
   - poker_resetYaml で定期的にクリーンアップ
   - 不要な中間データの削除
   - poker_applyChanges の適切なタイミング

実装してください。」
```

#### **完全なYAML例: 燃料貯蔵プール**
```yaml
# 使用済燃料貯蔵プール遮蔽評価
unit:
  length: cm
  angle: radian
  density: g/cm³
  radioactivity: Bq

bodies:
  # プール構造
  - name: pool_water
    type: RPP
    min: "0 0 0"
    max: "1200 800 1000"
  
  - name: pool_wall_concrete
    type: RPP
    min: "-200 -200 -100"
    max: "1400 1000 1100"
  
  # 燃料ラック（簡略化）
  - name: fuel_rack_1
    type: RPP
    min: "100 100 100"
    max: "500 700 500"

zones:
  - body_name: pool_water
    material: Water
    density: 1.0
  
  - body_name: pool_wall_concrete
    material: Concrete
    density: 2.3
  
  - body_name: fuel_rack_1
    material: Iron
    density: 7.86

sources:
  # 使用済燃料（主要核種）
  - name: spent_fuel_1
    type: RCC
    geometry:
      bottom_center: "150 150 150"
      height_vector: "0 0 400"
      radius: 10
    division:
      r:
        type: UNIFORM
        number: 3
      phi:
        type: UNIFORM
        number: 8
      z:
        type: UNIFORM
        number: 10
    inventory:
      - nuclide: Cs137
        radioactivity: 1e15
      - nuclide: Sr90
        radioactivity: 8e14
      - nuclide: Co60
        radioactivity: 2e14
    cutoff_rate: 0.001

detectors:
  # プールサイド作業エリア
  - name: poolside_grid
    origin: "1400 0 800"
    grid:
      - edge: "0 1000 0"
        number: 20
      - edge: "0 0 300"
        number: 10
    show_path_trace: false
```

### 2.2 子孫核種考慮の実例

#### **Mo-99/Tc-99m平衡系**
```
Claude Desktop 指示:
「Mo-99/Tc-99m発生器の遮蔽設計で子孫核種を考慮してください。

核種データ:
- Mo-99: 半減期66時間、β崩壊
- Tc-99m: 半減期6時間、IT（140 keV γ線）

子孫核種処理:
1. poker_proposeSource で Mo-99 線源を定義
2. poker_confirmDaughterNuclides:
   action: "check"
   → Tc-99mが87.5%の寄与率で検出
3. poker_confirmDaughterNuclides:
   action: "confirm"
   → Tc-99m自動追加
4. poker_executeCalculation で両核種考慮の計算

過渡平衡を考慮した正確な遮蔽設計を実施してください。」
```

---

## 🔬 第3章: 研究施設遮蔽計画

### 3.1 加速器施設の遮蔽設計

#### **電子線形加速器の遮蔽（複合放射線場）**
```
Claude Desktop 指示:
「10MeV電子線形加速器の複合放射線場遮蔽を設計してください。

28メソッド活用による段階的設計:

Phase 1: 基本構造（10種類立体活用）
1. poker_proposeBody:
   - accelerator_room: RPP（10×8×4m）
   - beam_dump: TRC（円錐台型、ビームストッパー）
   - collimator: TRC（逆円錐、ビーム整形）
   - maze_section1: WED（楔形、迷路入口）
   - maze_section2: BOX（屈曲部）

Phase 2: 複合材料配置（Zone操作）
2. poker_proposeZone:
   - 一次遮蔽壁: Concrete（厚さ2m）
   - 中性子遮蔽: Polyethylene層
   - γ線追加遮蔽: Lead層

Phase 3: 複合線源（Source操作）
3. poker_proposeSource（複数線源）:
   - 制動放射線源（前方ピーク）
   - 光中性子源（(γ,n)反応）
   - 放射化生成物

Phase 4: 3次元評価（Detector操作）
4. poker_proposeDetector:
   - 運転時: リアルタイム監視点
   - 停止後: 放射化評価点
   - 迷路: ストリーミング評価

計算と最適化:
5. poker_executeCalculation
6. 結果に基づく poker_updateBody/Zone での最適化

完全な遮蔽設計を実施してください。」
```

### 3.2 RI実験室の安全設計

#### **完全なYAML例: 非密封RI実験室**
```yaml
# 非密封RI実験室（P-32使用）
unit:
  length: cm
  angle: degree
  density: g/cm³
  radioactivity: Bq

bodies:
  # 実験室構造
  - name: lab_room
    type: RPP
    min: "0 0 0"
    max: "600 500 300"
  
  # フード位置
  - name: fume_hood
    type: RPP
    min: "450 200 0"
    max: "550 400 200"
  
  # アクリル遮蔽板
  - name: acrylic_shield
    type: BOX
    vertex: "440 190 80"
    edge_1: "120 0 0"
    edge_2: "0 5 0"
    edge_3: "0 0 100"

zones:
  - body_name: lab_room
    material: Air
    density: 0.00129
  
  - body_name: acrylic_shield
    material: AcrylicResin
    density: 1.18

buildup_factor:
  - material: AcrylicResin
    use_slant_correction: false
    use_finite_medium_correction: true  # 薄い遮蔽

sources:
  # P-32線源（最大エネルギー1.71 MeV β線）
  - name: p32_vial
    type: POINT
    position: "500 300 100"
    inventory:
      - nuclide: P32
        radioactivity: 3.7e8  # 370 MBq
    cutoff_rate: 0.0001
  
  # 汚染想定（作業台面）
  - name: contamination_area
    type: RPP
    geometry:
      min: "450 250 80"
      max: "550 350 81"
    division:
      edge_1:
        type: UNIFORM
        number: 10
      edge_2:
        type: UNIFORM
        number: 10
      edge_3:
        type: UNIFORM
        number: 1
    inventory:
      - nuclide: P32
        radioactivity: 3.7e6  # 3.7 MBq (1% 汚染)
    cutoff_rate: 0.001

detectors:
  # 作業者位置（複数高さ）
  - name: worker_position
    origin: "400 300 0"
    grid:
      - edge: "0 0 180"
        number: 10
    show_path_trace: true
  
  # 室内モニタリング
  - name: room_monitor
    origin: "100 100 150"
    show_path_trace: false
```

---

## 📊 第4章: 計算結果の解析と活用

### 4.1 サマリーファイル完全解析

#### **解析用Pythonスクリプト**
```python
#!/usr/bin/env python3
"""
POKERサマリーファイル解析スクリプト
28メソッド対応版
"""

import yaml
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

class SummaryAnalyzer:
    """サマリーファイル解析クラス"""
    
    def __init__(self, summary_path):
        with open(summary_path, 'r', encoding='utf-8') as f:
            self.data = yaml.safe_load(f)
    
    def analyze_input_parameters(self):
        """入力パラメータセクション解析"""
        params = self.data.get('入力パラメータ', {})
        
        print("=== 入力パラメータ解析 ===")
        print(f"立体数: {len(params.get('bodies', []))}")
        print(f"ゾーン数: {len(params.get('zones', []))}")
        print(f"線源数: {len(params.get('sources', []))}")
        print(f"検出器数: {len(params.get('detectors', []))}")
        
        # 単位系確認
        units = params.get('unit', {})
        print(f"\n単位系:")
        for key, value in units.items():
            print(f"  {key}: {value}")
        
        return params
    
    def analyze_intermediate(self):
        """intermediateセクション解析"""
        intermediate = self.data.get('intermediate', {})
        
        print("\n=== 中間計算データ解析 ===")
        for source, detectors in intermediate.items():
            print(f"\n線源: {source}")
            for detector, data in detectors.items():
                print(f"  検出器: {detector}")
                print(f"    経路長: {data.get('path_length', 'N/A')} cm")
                print(f"    通過材料: {data.get('materials', [])}")
                print(f"    減衰係数: {data.get('attenuation', 'N/A')}")
    
    def analyze_results(self):
        """resultセクション解析"""
        results = self.data.get('result', {})
        
        print("\n=== 個別線源結果解析 ===")
        dose_matrix = []
        
        for source, detectors in results.items():
            for detector, data in detectors.items():
                dose = data.get('dose', 0)
                dose_matrix.append({
                    'source': source,
                    'detector': detector,
                    'dose': dose,
                    'buildup': data.get('buildup', 1.0)
                })
        
        df = pd.DataFrame(dose_matrix)
        
        # ピボットテーブル作成
        pivot = df.pivot_table(
            values='dose',
            index='detector',
            columns='source',
            fill_value=0
        )
        
        print("\n線量マトリックス (μSv/h):")
        print(pivot)
        
        return df
    
    def analyze_total(self):
        """result_totalセクション解析"""
        total = self.data.get('result_total', {})
        
        print("\n=== 総線量解析 ===")
        total_doses = []
        
        for detector, data in total.items():
            dose = data.get('total_dose', 0)
            total_doses.append({
                'detector': detector,
                'total_dose': dose
            })
            
            print(f"{detector}: {dose:.3e} μSv/h")
            
            # 規制値との比較（例: 週1.3mSv = 7.7 μSv/h）
            limit = 7.7  # μSv/h
            if dose > limit:
                print(f"  ⚠️ 規制値超過 ({dose/limit:.1f}倍)")
            else:
                print(f"  ✓ 規制値以下 (余裕 {(1-dose/limit)*100:.1f}%)")
        
        return pd.DataFrame(total_doses)
    
    def generate_report(self, output_path):
        """統合レポート生成"""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("# POKER計算結果レポート\n\n")
            
            # 入力パラメータ
            params = self.analyze_input_parameters()
            f.write("## 入力条件\n")
            f.write(f"- 立体数: {len(params.get('bodies', []))}\n")
            f.write(f"- 線源数: {len(params.get('sources', []))}\n")
            f.write(f"- 検出器数: {len(params.get('detectors', []))}\n\n")
            
            # 結果サマリー
            total_df = self.analyze_total()
            f.write("## 総線量結果\n")
            f.write(total_df.to_markdown())
            
            # 安全性評価
            f.write("\n## 安全性評価\n")
            max_dose = total_df['total_dose'].max()
            if max_dose > 7.7:
                f.write("⚠️ **追加遮蔽が必要です**\n")
            else:
                f.write("✓ **現設計で規制値を満足**\n")
    
    def plot_dose_distribution(self):
        """線量分布可視化"""
        total_df = self.analyze_total()
        
        plt.figure(figsize=(10, 6))
        plt.bar(total_df['detector'], total_df['total_dose'])
        plt.axhline(y=7.7, color='r', linestyle='--', label='規制値')
        plt.xlabel('検出器位置')
        plt.ylabel('線量率 (μSv/h)')
        plt.title('線量分布')
        plt.yscale('log')
        plt.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig('dose_distribution.png')
        plt.show()

# 使用例
if __name__ == "__main__":
    analyzer = SummaryAnalyzer("poker.yaml.summary")
    
    # 各セクション解析
    analyzer.analyze_input_parameters()
    analyzer.analyze_intermediate()
    analyzer.analyze_results()
    analyzer.analyze_total()
    
    # レポート生成
    analyzer.generate_report("calculation_report.md")
    
    # 可視化
    analyzer.plot_dose_distribution()
```

### 4.2 計算オプションの詳細

#### **poker_executeCalculation オプション設定例**
```python
# 詳細解析用設定
detailed_options = {
    "yaml_file": "poker.yaml",
    "summary_options": {
        "show_parameters": True,  # 入力パラメータ表示
        "show_source_data": True, # 線源別データ表示
        "show_total_dose": True   # 総線量表示
    },
    "output_files": {
        "summary_file": "detailed_summary.yaml",
        "dose_file": "detailed_dose.yaml"
    }
}

# 高速スクリーニング用設定
screening_options = {
    "yaml_file": "poker.yaml",
    "summary_options": {
        "show_parameters": False,
        "show_source_data": False,
        "show_total_dose": True  # 総線量のみ
    },
    "output_files": {
        "summary_file": "quick_summary.yaml"
    }
}

# デバッグ用設定
debug_options = {
    "yaml_file": "poker.yaml",
    "summary_options": {
        "show_parameters": True,
        "show_source_data": True,
        "show_total_dose": True
    },
    "output_files": {
        "summary_file": "debug_summary.yaml",
        "dose_file": "debug_dose.yaml"
    }
}
```

---

## 🔄 第5章: 大規模計算と並列処理

### 5.1 メモリ管理戦略

```
Claude Desktop 指示:
「大規模施設（原子力発電所全体）の遮蔽計算を効率的に実行してください。

メモリ管理戦略:

1. 階層的計算アプローチ:
   Level 1: 建屋単位（粗メッシュ）
   - cutoff_rate: 0.01
   - 検出器: 各建屋境界の代表点
   
   Level 2: フロア単位（中メッシュ）
   - cutoff_rate: 0.001
   - 検出器: 主要エリアの格子点
   
   Level 3: 詳細評価（細メッシュ）
   - cutoff_rate: 0.0001
   - 検出器: 作業エリアの詳細格子

2. 分割統治法:
   for building in buildings:
       poker_resetYaml(level="minimal")
       poker_proposeBody(building)
       poker_proposeSource(building_sources)
       poker_executeCalculation()
       結果を累積

3. 並列処理シミュレーション:
   - 独立計算可能な部分を特定
   - 各部分を個別に実行
   - 結果の統合処理

効率的な大規模計算を実現してください。」
```

### 5.2 エラー時の対処

```
Claude Desktop 指示:
「計算エラー発生時の系統的対処を実行してください。

エラー種別と対処:

1. メモリ不足エラー:
   - カットオフレート増加（0.001→0.01）
   - 検出器数削減
   - 分割計算実施

2. YAMLフォーマットエラー:
   - poker_applyChanges 実行前に検証
   - インデント確認
   - 予約語（ATMOSPHERE）チェック

3. 計算収束エラー:
   - ビルドアップ係数設定確認
   - 極端な形状パラメータ確認
   - 単位系整合性確認

4. 物理的異常値:
   - 負の線量 → 形状定義エラー
   - 極端な値 → 単位系エラー
   - 距離依存異常 → 配置エラー

各エラーに対する診断と修正を実行してください。」
```

---

## 📚 第6章: 研究成果の文書化

### 6.1 学術論文用データ準備

```python
# 論文用図表生成スクリプト
import matplotlib.pyplot as plt
import numpy as np
from matplotlib import rcParams

# 論文用設定
rcParams['font.size'] = 12
rcParams['font.family'] = 'serif'
rcParams['figure.dpi'] = 300

def create_publication_figures(summary_data):
    """論文投稿用図表作成"""
    
    # Figure 1: 線量分布
    fig, ax = plt.subplots(figsize=(8, 6))
    
    # データプロット
    positions = summary_data['positions']
    doses = summary_data['doses']
    errors = summary_data['errors']
    
    ax.errorbar(positions, doses, yerr=errors, 
                fmt='o-', capsize=5, capthick=2)
    
    ax.set_xlabel('Distance from source (cm)')
    ax.set_ylabel('Dose rate (μSv/h)')
    ax.set_yscale('log')
    ax.grid(True, which='both', alpha=0.3)
    
    # 理論曲線追加
    theory_x = np.linspace(min(positions), max(positions), 100)
    theory_y = doses[0] * (positions[0] / theory_x) ** 2
    ax.plot(theory_x, theory_y, 'r--', label='1/r² law')
    
    ax.legend()
    plt.tight_layout()
    plt.savefig('figure1_dose_distribution.eps', format='eps')
    
    return fig
```

### 6.2 規制提出用報告書

```
Claude Desktop 指示:
「規制当局提出用の遮蔽計算報告書を作成してください。

報告書構成:
1. 要約
   - 施設概要
   - 評価目的
   - 結論

2. 計算条件
   - 線源条件（全28メソッド設定）
   - 遮蔽構造
   - 評価点配置

3. 計算方法
   - POKER計算コード概要
   - ビルドアップ係数
   - 精度検証

4. 計算結果
   - 線量分布図
   - 規制値との比較表
   - 安全裕度評価

5. 結論
   - 規制適合性
   - 推奨事項

完全な報告書を生成してください。」
```

---

**📚 関連マニュアル**
- [ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md): 基本操作・15分スタート
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md): 日常操作早見表
- [PHYSICS_REFERENCE.md](PHYSICS_REFERENCE.md): 物理的背景
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md): システム統合
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md): 問題解決