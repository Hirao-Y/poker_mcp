# 🔗 システム統合ガイド - Poker MCP

**対象読者**: システム統合エンジニア・上級ユーザー・研究者  
**バージョン**: 1.2.5 MCP Edition  
**最終更新**: 2025年1月24日  
**統合方式**: Claude Desktop + MCP + 外部システム

---

## 🎯 このガイドの特徴

### 🌐 **最新MCP統合設計**
- **Claude Desktop中心**: MCP v1.0準拠の自然言語ベース統合
- **28メソッド完全活用**: 全機能を活用した統合設計
- **外部計算コード**: poker_cui実行・結果解析統合
- **Python自動化**: 28メソッドAPI活用による高度な自動化
- **データ可視化**: 結果の効果的な可視化・解析

### 📊 **実装ベース実用性**
現在のPoker MCP Server v1.2.5の実装機能をフル活用した、即座に利用可能な統合手法を提供。

---

## 📋 28メソッド構成詳細

### **メソッド内訳(合計28メソッド)**
- **Body操作**: 3メソッド(propose, update, delete)
- **Zone操作**: 3メソッド(propose, update, delete)
- **Transform操作**: 3メソッド(propose, update, delete)
- **BuildupFactor操作**: 4メソッド(propose, update, delete, changeOrder)
- **Source操作**: 3メソッド(propose, update, delete)
- **Detector操作**: 3メソッド(propose, update, delete)
- **Unit操作**: 5メソッド(propose, get, update, validateIntegrity, analyzeConversion)
- **Common操作**: 1メソッド(applyChanges)
- **Calculation操作**: 1メソッド(executeCalculation)
- **Reset操作**: 1メソッド（resetYaml）
- **DaughterNuclide操作**: 1メソッド（confirmDaughterNuclides）

### **10種類立体タイプ完全対応**
- SPH（球体）
- RCC（円柱）
- RPP（直方体）
- BOX（任意直方体）
- CMB（組み合わせ）
- TOR（トーラス）
- ELL（楕円体）
- REC（楕円柱）
- TRC（円錐台）
- WED（楔形）

---

## 🖥️ 第1章: Claude Desktop統合の詳細

### 1.1 MCP設定（実装準拠）

#### **実環境設定例**
```json
{
  "mcpServers": {
    "poker-mcp": {
      "command": "node",
      "args": ["C:\\Users\\yoshi\\Desktop\\poker_mcp\\src\\mcp_server_stdio_v4.js"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info",
        "POKER_INSTALL_PATH": "C:/Program Files/POKER"
      }
    }
  }
}
```

#### **開発環境設定**
```json
{
  "mcpServers": {
    "poker-mcp-dev": {
      "command": "node",
      "args": ["C:\\Users\\yoshi\\Desktop\\poker_mcp\\src\\mcp_server_stdio_v4.js"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug",
        "VALIDATE_ALL": "true",
        "BACKUP_EVERY_CHANGE": "true",
        "POKER_INSTALL_PATH": "C:/Program Files/POKER"
      }
    }
  }
}
```

### 1.2 サーバー構成詳細

#### **コアファイル構成**
- **エントリポイント**: `src/mcp_server_stdio_v4.js`
- **サーバークラス**: `src/mcp/server.js` (PokerMcpServer)
- **ツール定義**: `src/mcp/tools/` (11ファイル)
- **ハンドラ**: `src/mcp/handlers/`
- **タスクマネージャー**: `src/services/TaskManager.js`

#### **データファイル**
- **作業ファイル**: `tasks/poker.yaml`
- **保留変更**: `tasks/pending_changes.json`
- **バックアップ**: `tasks/backups/`
- **核種データベース**: `data/ICRP-07.NDX` (自動配置)

### 1.3 環境変数設定

#### **POKER_INSTALL_PATH環境変数**
```bash
# 目的: POKERライブラリのインストールディレクトリ指定
# デフォルト値: C:/Poker
# 機能: 初回起動時にlib/ICRP-07.NDXファイルをdata/にコピー

# Windows設定例
set POKER_INSTALL_PATH=C:/Poker

# Linux/macOS設定例  
export POKER_INSTALL_PATH="/usr/local/share/poker"
```

#### **統合環境での環境変数管理**
```python
# Python統合時の環境変数設定
import os
import subprocess

# 環境変数設定
env = os.environ.copy()
env['POKER_INSTALL_PATH'] = '/opt/poker'
env['NODE_ENV'] = 'production'

# MCP サーバー起動
subprocess.Popen([
    'node', 
    '/path/to/mcp_server_stdio_v4.js'
], env=env)
```

#### **Docker環境での設定**
```dockerfile
# Dockerfile例
FROM node:18-alpine
ENV POKER_INSTALL_PATH=/opt/poker
COPY lib/ICRP-07.NDX /opt/poker/lib/ICRP-07.NDX
RUN mkdir -p /app/data
WORKDIR /app
COPY . .
CMD ["node", "src/mcp_server_stdio_v4.js"]
```

### 1.4 ログファイル配置

```
# Claude Desktopログ
C:\Users\yoshi\AppData\Roaming\Claude\logs\

# アプリケーションログ
C:\Users\yoshi\AppData\Local\AnthropicClaude\app-[version]\
```

---

## ⚙️ 第2章: poker_cui統合

### 2.1 計算実行の基本

#### **コマンドライン実行**
```bash
# 基本実行（-t: total dose, -s: source data）
poker_cui -t -s tasks/poker.yaml

# 出力ファイル指定
poker_cui -t -s -o custom_summary.yaml -d custom_dose.yaml tasks/poker.yaml

# パラメータ表示付き
poker_cui -t -s -p tasks/poker.yaml
```

#### **出力ファイル構造**
```yaml
# poker.yaml.summary - サマリーファイル構造
入力パラメータ:
  bodies: [...]
  zones: [...]
  sources: [...]
  detectors: [...]

intermediate:
  # 各線源からの線量計算中間データ
  source_1:
    detector_1: {...}

result:
  # 各線源から各検出器への線量結果
  source_1:
    detector_1: 
      dose: 1.23e-5
      unit: μSv/h

result_total:
  # 各検出器での総和線量
  detector_1:
    total_dose: 2.46e-5
    unit: μSv/h
```

### 2.2 Claude Desktop経由の計算実行

```
Claude Desktop 指示:
「poker.yamlファイルで遮蔽計算を実行してください。

実行オプション:
- 各線源データ表示（-s）
- 総和線量表示（-t）
- パラメータ表示（-p）

poker_executeCalculation を使用して計算し、
結果サマリーから以下を抽出してください：
1. 各検出器位置での線量率
2. 主要寄与線源の特定
3. 遮蔽効果の評価」
```

---

## 🐍 第3章: Python自動化システム（28メソッド対応）

### 3.1 完全自動化フレームワーク

```python
#!/usr/bin/env python3
"""
Poker MCP 自動化システム
バージョン: 1.2.6 (2026年5月対応)
"""

import json
import os
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, List, Any
import yaml

class PokerMCPAutomation:
    """Poker MCP 自動化クラス
    
    POKER_MCP_HOME 環境変数（未設定時は ~/.poker-mcp/）を作業ディレクトリとして使用します。
    """
    
    def __init__(self):
        # POKER_MCP_HOME 環境変数を参照（未設定時は ~/.poker-mcp/）
        poker_mcp_home = os.environ.get(
            'POKER_MCP_HOME',
            str(Path.home() / '.poker-mcp')
        )
        self.home_dir  = Path(poker_mcp_home)
        self.tasks_dir = self.home_dir / 'tasks'
        self.yaml_file = self.tasks_dir / 'poker.yaml'
        self.body_types = ["SPH", "RCC", "RPP", "BOX", "CMB", 
                          "TOR", "ELL", "REC", "TRC", "WED"]
        self.unit_keys = ["length", "angle", "density", "radioactivity"]
        
    def execute_mcp_command(self, method: str, params: Dict) -> Dict:
        """npx poker-mcp 経由でMCPメソッドを実行（実装例）"""
        cmd = ["npx", "poker-mcp", "--method", method, "--params", json.dumps(params)]
        
        env = os.environ.copy()
        env['POKER_MCP_HOME'] = str(self.home_dir)
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env=env
            )
            return json.loads(result.stdout)
        except Exception as e:
            return {"error": str(e)}
    
    def create_shielding_model(self, config: Dict) -> bool:
        """遮蔽モデル構築"""
        
        # 1. Unit設定（5メソッド活用）
        self.execute_mcp_command("poker_proposeUnit", {
            "length": config.get("length_unit", "cm"),
            "angle": config.get("angle_unit", "degree"),
            "density": "g/cm3",
            "radioactivity": "Bq"
        })
        
        # 単位系検証
        self.execute_mcp_command("poker_validateUnitIntegrity", {
            "includeSystemAnalysis": True
        })
        
        # 2. Body作成（10種類立体対応）
        for body in config["bodies"]:
            self.execute_mcp_command("poker_proposeBody", body)
        
        # 3. Zone設定（材料割り当て）
        for zone in config["zones"]:
            self.execute_mcp_command("poker_proposeZone", zone)
        
        # 4. BuildupFactor設定（4メソッド活用）
        for bf in config.get("buildup_factors", []):
            self.execute_mcp_command("poker_proposeBuildupFactor", {
                "material": bf["material"],
                "use_slant_correction": False,
                "use_finite_medium_correction": False
            })
        
        # 5. Source配置
        for source in config["sources"]:
            # 子孫核種チェック
            self.execute_mcp_command(
                "poker_confirmDaughterNuclides",
                {"action": "check", "source_name": source["name"]}
            )
            self.execute_mcp_command("poker_proposeSource", source)
        
        # 6. Detector配置
        for detector in config["detectors"]:
            self.execute_mcp_command("poker_proposeDetector", detector)
        
        # 7. 変更適用
        self.execute_mcp_command("poker_applyChanges", {
            "backup_comment": f"Model creation: {config.get('name', 'unnamed')}"
        })
        
        return True
    
    def execute_calculation(self, options: Dict = None) -> Dict:
        """poker_cui 計算実行
        
        yaml_file はファイル名のみ指定します。
        POKER_MCP_HOME/tasks/ 配下のファイルが自動的に参照されます。
        """
        
        options = options or {
            "show_parameters": True,
            "show_source_data": True,
            "show_total_dose": True
        }
        
        result = self.execute_mcp_command("poker_executeCalculation", {
            "yaml_file": "poker.yaml",   # POKER_MCP_HOME/tasks/poker.yaml に自動解決
            "summary_options": options
        })
        
        # 結果ファイル読み込み（tasks/ 配下に出力される）
        summary_file = self.tasks_dir / 'poker.yaml.summary'
        if summary_file.exists():
            with open(summary_file, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        
        return result
    
    def parametric_study(self, base_config: Dict, parameters: List[Dict]) -> List[Dict]:
        """パラメトリックスタディ実行"""
        results = []
        
        for i, param_set in enumerate(parameters):
            # リセット（レベル選択可能）
            self.execute_mcp_command("poker_resetYaml", {
                "reset_level": "standard",
                "backup_comment": f"Parametric study {i+1}/{len(parameters)}"
            })
            
            # パラメータ適用
            config = {**base_config, **param_set}
            
            # モデル構築
            self.create_shielding_model(config)
            
            # 計算実行
            result = self.execute_calculation()
            
            # 結果保存
            results.append({
                "parameters": param_set,
                "result": result
            })
        
        return results

# 使用例
def main():
    automation = PokerMCPAutomation()
    
    # 基本構成
    base_config = {
        "name": "医療施設CT室",
        "length_unit": "cm",
        "angle_unit": "degree",
        "bodies": [
            {
                "name": "wall",
                "type": "RPP",
                "min": "0 0 0",
                "max": "500 400 300"
            }
        ],
        "zones": [
            {
                "body_name": "wall",
                "material": "CONCRETE",
                "density": 2.3
            }
        ],
        "sources": [
            {
                "name": "ct_source",
                "type": "POINT",
                "position": "250 200 150",
                "inventory": [
                    {"nuclide": "Co60", "radioactivity": 1e10}
                ],
                "cutoff_rate": 0.0001
            }
        ],
        "detectors": [
            {
                "name": "control_room",
                "origin": "600 200 150",
                "show_path_trace": False
            }
        ]
    }
    
    # パラメトリックスタディ
    parameters = [
        {"zones": [{"body_name": "wall", "material": "CONCRETE", "density": 2.0}]},
        {"zones": [{"body_name": "wall", "material": "CONCRETE", "density": 2.3}]},
        {"zones": [{"body_name": "wall", "material": "CONCRETE", "density": 2.5}]}
    ]
    
    results = automation.parametric_study(base_config, parameters)
    
    # 結果解析
    for r in results:
        total_dose = r["result"].get("result_total", {})
        print(f"密度 {r['parameters']['zones'][0]['density']} g/cm³: "
              f"線量 {total_dose.get('control_room', {}).get('total_dose', 'N/A')}")

if __name__ == "__main__":
    main()
```

### 3.2 結果可視化システム

```python
import matplotlib.pyplot as plt
import numpy as np
from typing import Dict, List

class PokerResultVisualizer:
    """計算結果可視化クラス"""
    
    def __init__(self, summary_data: Dict):
        self.data = summary_data
        
    def plot_dose_distribution(self, detector_pattern: str = "*"):
        """線量分布プロット"""
        result_total = self.data.get("result_total", {})
        
        detectors = []
        doses = []
        
        for det_name, det_data in result_total.items():
            if detector_pattern == "*" or detector_pattern in det_name:
                detectors.append(det_name)
                doses.append(det_data.get("total_dose", 0))
        
        plt.figure(figsize=(10, 6))
        plt.bar(detectors, doses)
        plt.xlabel("検出器位置")
        plt.ylabel("線量率 (μSv/h)")
        plt.title("線量分布")
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()
    
    def analyze_source_contribution(self):
        """線源寄与分析"""
        result = self.data.get("result", {})
        
        contributions = {}
        for source_name, source_data in result.items():
            total = sum(det.get("dose", 0) for det in source_data.values())
            contributions[source_name] = total
        
        # 円グラフ表示
        plt.figure(figsize=(8, 8))
        plt.pie(contributions.values(), labels=contributions.keys(), 
                autopct='%1.1f%%')
        plt.title("線源別寄与率")
        plt.show()
        
        return contributions
```

---

## 📊 第4章: データ管理・品質保証

### 4.1 計算結果の管理

#### **サマリーファイル解析**
```python
class SummaryFileAnalyzer:
    """サマリーファイル解析クラス"""
    
    def __init__(self, summary_path: str):
        with open(summary_path, 'r', encoding='utf-8') as f:
            self.data = yaml.safe_load(f)
    
    def get_input_parameters(self) -> Dict:
        """入力パラメータ取得"""
        return self.data.get("入力パラメータ", {})
    
    def get_intermediate_data(self) -> Dict:
        """中間計算データ取得"""
        return self.data.get("intermediate", {})
    
    def get_results(self) -> Dict:
        """個別線源結果取得"""
        return self.data.get("result", {})
    
    def get_total_doses(self) -> Dict:
        """総和線量取得"""
        return self.data.get("result_total", {})
    
    def generate_report(self) -> str:
        """レポート生成"""
        report = []
        report.append("=" * 50)
        report.append("放射線遮蔽計算結果レポート")
        report.append("=" * 50)
        
        # 総和線量
        total = self.get_total_doses()
        report.append("\n【総和線量】")
        for det, data in total.items():
            dose = data.get("total_dose", "N/A")
            report.append(f"  {det}: {dose} μSv/h")
        
        # 線源別寄与
        results = self.get_results()
        report.append("\n【線源別寄与】")
        for source in results:
            report.append(f"\n  {source}:")
            for det, data in results[source].items():
                dose = data.get("dose", "N/A")
                report.append(f"    {det}: {dose} μSv/h")
        
        return "\n".join(report)
```

### 4.2 エラーハンドリング

#### **統合エラー処理**
```python
class IntegrationErrorHandler:
    """統合エラーハンドラ"""
    
    @staticmethod
    def handle_mcp_error(error_code: int) -> str:
        """MCPエラー処理"""
        error_map = {
            -32064: "立体が既に存在します。updateBodyを使用してください。",
            -32065: "立体が存在しません。proposeBodyを使用してください。",
            -32060: "ゾーンが既に存在します。updateZoneを使用してください。",
            -32061: "ゾーンが存在しません。proposeZoneを使用してください。",
            -32070: "ビルドアップ係数が既に存在します。",
            -32071: "ビルドアップ係数が存在しません。",
            -32074: "変換が既に存在します。",
            -32075: "変換が存在しません。",
            -32078: "線源が既に存在します。",
            -32079: "線源が存在しません。"
        }
        return error_map.get(error_code, f"未知のエラー: {error_code}")
    
    @staticmethod
    def handle_calculation_error(stderr: str) -> str:
        """計算エラー処理"""
        if "File not found" in stderr:
            return "YAMLファイルが見つかりません"
        elif "Invalid format" in stderr:
            return "YAMLフォーマットが不正です"
        elif "Memory" in stderr:
            return "メモリ不足です"
        else:
            return f"計算エラー: {stderr}"
```

---

## 🔄 第5章: ワークフロー統合

### 5.1 標準ワークフロー

#### **完全統合ワークフロー**
```
Claude Desktop 指示:
「医療施設X線室の遮蔽設計を実行してください。

【設計要件】
- 室寸法: 6m × 5m × 3m
- X線装置: 最大150kV
- 壁材料: コンクリート（密度2.3g/cm³）
- 規制値: 管理区域境界 1.3mSv/3月

【実行手順】
1. poker_resetYaml で初期化（standard レベル）
2. 単位系設定（cm, degree, g/cm3, Bq）
3. 部屋形状を RPP で定義
4. コンクリート材料設定
5. X線源配置（適切な核種で模擬）
6. 管理区域境界に検出器配置
7. poker_executeCalculation で計算
8. 結果評価と規制適合確認
9. 必要に応じて壁厚調整

最適な遮蔽設計を提案してください。」
```

### 5.2 バッチ処理ワークフロー

```python
class BatchProcessor:
    """バッチ処理クラス"""
    
    def __init__(self):
        self.automation = PokerMCPAutomation()
        
    def process_facility_designs(self, facilities: List[Dict]):
        """複数施設設計の一括処理"""
        
        all_results = {}
        
        for facility in facilities:
            print(f"処理中: {facility['name']}")
            
            # リセット
            self.automation.execute_mcp_command("poker_resetYaml", {
                "reset_level": "standard",
                "backup_comment": f"Facility: {facility['name']}"
            })
            
            # モデル構築
            self.automation.create_shielding_model(facility['config'])
            
            # 計算実行
            result = self.automation.execute_calculation()
            
            # 結果保存
            all_results[facility['name']] = result
            
            # 規制チェック
            self.check_regulatory_compliance(
                result, 
                facility.get('regulations', {})
            )
        
        return all_results
    
    def check_regulatory_compliance(self, result: Dict, regulations: Dict):
        """規制適合性チェック"""
        total_doses = result.get("result_total", {})
        
        for position, limit in regulations.items():
            dose = total_doses.get(position, {}).get("total_dose", 0)
            
            if dose > limit:
                print(f"⚠️ 規制超過: {position} ({dose} > {limit} μSv/h)")
            else:
                print(f"✓ 規制適合: {position} ({dose} ≤ {limit} μSv/h)")
```

---

## 🌐 第6章: トラブルシューティング

### 6.1 よくある問題と対処法

| 問題 | 原因 | 対処法 |
|------|------|--------|
| MCP接続エラー | サーバー未起動 | Claude Desktop設定確認、node.js確認 |
| メソッドが見つからない | メソッド名誤り | 28メソッドリスト確認 |
| YAMLエラー | フォーマット不正 | インデント・構文確認 |
| 計算実行失敗 | poker_cui未インストール | パス設定・実行権限確認 |
| メモリ不足 | 大規模モデル | 分割計算・メモリ増設 |
| 結果ファイル未生成 | 書き込み権限 | tasksフォルダ権限確認 |

### 6.2 デバッグ手順

```python
def debug_mcp_connection():
    """MCP接続デバッグ"""
    
    # 1. サーバープロセス確認
    import psutil
    node_processes = [p for p in psutil.process_iter() 
                     if 'node' in p.name().lower()]
    print(f"Node.jsプロセス: {len(node_processes)}個")
    
    # 2. ログファイル確認
    log_path = Path(r"C:\Users\yoshi\AppData\Roaming\Claude\logs")
    latest_log = max(log_path.glob("*.log"), key=lambda p: p.stat().st_mtime)
    
    with open(latest_log, 'r') as f:
        lines = f.readlines()[-50:]  # 最後の50行
        for line in lines:
            if 'error' in line.lower() or 'poker' in line.lower():
                print(line.strip())
    
    # 3. 単純なメソッドテスト
    try:
        result = automation.execute_mcp_command("poker_getUnit", {})
        print(f"Unit取得成功: {result}")
    except Exception as e:
        print(f"Unit取得失敗: {e}")
```

---

## 🚀 第7章: 高度な統合機能

### 7.1 リアルタイム監視システム

```python
class RealTimeMonitor:
    """リアルタイム監視システム"""
    
    def __init__(self):
        self.automation = PokerMCPAutomation()
        self.history = []
        
    async def monitor_calculations(self, interval: int = 5):
        """計算状況監視（非同期）"""
        
        while True:
            # ステータス確認
            status = self.check_calculation_status()
            self.history.append(status)
            
            # 異常検出
            if status.get("error"):
                await self.handle_error(status["error"])
            
            # 進捗表示
            if status.get("progress"):
                print(f"進捗: {status['progress']}%")
            
            await asyncio.sleep(interval)
    
    def check_calculation_status(self) -> Dict:
        """計算ステータス確認"""
        # 実装例: ログファイルやプロセス状態を確認
        pass
```

### 7.2 最適化エンジン

```python
class OptimizationEngine:
    """遮蔽最適化エンジン"""
    
    def optimize_shielding(self, 
                          target_dose: float,
                          constraints: Dict) -> Dict:
        """遮蔽最適化"""
        
        current_thickness = constraints["min_thickness"]
        best_design = None
        
        while current_thickness <= constraints["max_thickness"]:
            # モデル更新
            config = self.generate_config(current_thickness)
            
            # 計算実行
            result = self.automation.execute_calculation()
            
            # 線量評価
            total_dose = self.evaluate_dose(result)
            
            if total_dose <= target_dose:
                best_design = {
                    "thickness": current_thickness,
                    "dose": total_dose,
                    "config": config
                }
                break
            
            # 厚さ増加
            current_thickness += constraints["step"]
        
        return best_design
```

---

## 📋 まとめ: 統合システムの価値

### ✨ **28メソッド完全活用による価値**

1. **設計自由度**: 10種類立体による複雑形状対応
2. **計算精度**: 5つのUnit操作による単位系完全管理
3. **作業効率**: 28メソッド統合による完全自動化
4. **品質保証**: 自動バックアップ・検証機能

### 🌟 **統合のベストプラクティス**

- **段階的導入**: 基本機能から順次拡張
- **エラー処理**: 全メソッドでの適切なエラーハンドリング
- **ログ活用**: デバッグ・監査のためのログ記録
- **バックアップ**: 定期的な自動バックアップ設定

### 🎯 **今すぐ始める統合**

1. Claude Desktopで設定ファイル更新
2. `poker_getUnit`で接続確認
3. 簡単なモデルから開始
4. 段階的に複雑な統合へ

**この統合ガイドにより、Poker MCP Server v1.2.5の28メソッド機能を最大限活用し、実用的な放射線遮蔽計算統合環境を実現できます。**

---

**📚 関連マニュアル**
- [ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md): 基本操作・15分スタート
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md): 日常操作早見表
- [API_COMPLETE.md](API_COMPLETE.md): 完全API仕様・開発者向け
- [RESEARCH_WORKFLOWS.md](RESEARCH_WORKFLOWS.md): 分野別実用ワークフロー
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md): 問題解決・復旧手順