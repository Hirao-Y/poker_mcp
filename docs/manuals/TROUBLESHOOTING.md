# ⚠️ トラブルシューティング - Poker MCP

**対象**: 全ユーザー（問題解決時）  
<<<<<<< HEAD
**バージョン**: 1.1.0 MCP Edition  
**最終更新**: 2025年9月8日  
**使用方法**: Claude Desktop + MCP通信
=======
**バージョン**: 1.2.0 MCP Edition  
**最終更新**: 2025年1月24日  
**使用方法**: Claude Desktop + MCP通信 (28メソッド対応)
>>>>>>> afterKOKURA

---

## 🎯 このガイドの使い方

### 🆘 **緊急時対応設計**
- **症状別索引**: 起こった現象からすぐに解決法を見つける
- **エラーコード一覧**: MCP固有のエラーコードと対処法
- **段階的診断**: 簡単なチェックから高度な診断まで
- **即座実行**: Claude Desktopで直接実行可能な指示

### ⚡ **使用手順**
1. **症状またはエラーコードから該当セクションを特定**
2. **記載された指示をClaude Desktopで実行**
3. **解決しない場合は次の段階へ進む**
4. **解決後は予防策を実施**

---

## 🚨 第1章: MCP固有エラーコード一覧

### エラーコード対応表

| エラーコード | 意味 | 対処法 |
|------------|------|--------|
| -32064 | 立体が既に存在 | poker_updateBodyを使用 |
| -32065 | 立体が存在しない | poker_proposeBodyを使用 |
| -32060 | ゾーンが既に存在 | poker_updateZoneを使用 |
| -32061 | ゾーンが存在しない | poker_proposeZoneを使用 |
| -32070 | ビルドアップ係数が既に存在 | poker_updateBuildupFactorを使用 |
| -32071 | ビルドアップ係数が存在しない | poker_proposeBuildupFactorを使用 |
| -32074 | 変換が既に存在 | poker_updateTransformを使用 |
| -32075 | 変換が存在しない | poker_proposeTransformを使用 |
| -32078 | 線源が既に存在 | poker_updateSourceを使用 |
| -32079 | 線源が存在しない | poker_proposeSourceを使用 |
| -32031 | CMB参照立体が未定義 | 参照する立体を先に定義 |
| -32600 | 不正なリクエスト | パラメータ形式確認 |
| -32601 | メソッドが見つからない | メソッド名確認（28メソッドリスト参照） |

### エラー対処の基本パターン

```
Claude Desktop 指示:
「エラーコード -32064 が発生しました。適切な対処を実行してください。

エラー診断:
1. エラーの意味: 立体が既に存在
2. 発生原因: poker_proposeBodyで既存名を使用
3. 対処法: 
   - 新規作成の場合: 別の名前を使用
   - 更新の場合: poker_updateBodyを使用
   
実行:
poker_updateBody で既存立体のパラメータを更新してください。」
```

---

## 🔴 第2章: 緊急度別問題分類

### 🔴 **緊急度: 高（即座対応必要）**

#### **問題A1: MCPサーバーが認識されない**
```
症状:
- Claude Desktopでpoker_から始まるメソッドが使用できない
- 「ツールが見つかりません」エラー
- MCP接続タイムアウト

即座対応:
「MCPサーバー接続の緊急診断を実行してください：

1. 設定ファイル確認:
   パス: C:\Users\yoshi\AppData\Roaming\Claude\claude_desktop_config.json
   
2. 設定内容確認:
   {
     "mcpServers": {
       "poker-mcp": {
         "command": "node",
         "args": ["C:\\Users\\yoshi\\Desktop\\poker_mcp\\src\\mcp_server_stdio_v4.js"],
         "env": {}
       }
     }
   }

3. サーバー直接起動テスト:
   コマンドプロンプトで:
   cd C:\Users\yoshi\Desktop\poker_mcp
   node src\mcp_server_stdio_v4.js
   
4. Claude Desktop再起動:
   - アプリケーション完全終了
   - 再起動後にpoker_getUnitでテスト

各ステップの結果を報告してください。」
```

#### **問題A2: poker_cui実行エラー**
```
症状:
- poker_executeCalculation でエラー
- 「poker_cui not found」メッセージ
- 計算が開始されない

即座対応:
「poker_cui実行問題の診断と修復:

1. poker_cuiの存在確認:
   - 実行ファイルパス確認
   - 実行権限確認

2. コマンドライン直接テスト:
   poker_cui -t -s tasks/poker.yaml
   
3. エラーメッセージ分析:
   - 'not found': パス設定問題
   - 'permission denied': 権限問題
   - 'invalid format': YAMLフォーマット問題

4. 環境変数設定:
   PATH環境変数にpoker_cuiパス追加

修復を実行してください。」
```

#### **問題A3: YAMLファイル破損**
```
症状:
- 「YAML parse error」メッセージ
- poker_applyChanges失敗
- ファイルが読み込めない

緊急復旧:
「YAMLファイル緊急復旧を実行:

1. バックアップ確認:
   tasks/backups/ フォルダの最新バックアップ特定

2. pending_changes.json確認:
   保留中の変更内容確認

3. 手動復旧:
   - バックアップからコピー
   - pending_changes適用
   
4. インデント修正:
   - スペース2個で統一
   - タブ文字を除去

5. 予約語チェック:
   - ATMOSPHERE使用箇所確認
   - 循環参照（CMB）確認

復旧を完了してください。」
```

---

### 🟡 **緊急度: 中（早期対応推奨）**

#### **問題B1: メモリ不足エラー**
```
症状:
- 大規模計算で「Out of memory」
- 計算途中で停止
- システムが重くなる

対処法:
「メモリ問題の段階的解決:

1. 即座の対策:
   - cutoff_rate を 0.0001 → 0.001 に増加
   - 検出器数を削減（格子を粗く）
   
2. 分割計算実装:
   # 線源を分割
   poker_resetYaml(level="minimal")
   for source_group in source_groups:
       poker_proposeSource(source_group)
       poker_executeCalculation()
       結果保存
   
3. 最適化設定:
   - show_path_trace: false に設定
   - 不要な中間データ削除

実装してください。」
```

#### **問題B2: 計算結果の異常値**
```
症状:
- 負の線量値
- 極端に大きい/小さい値
- 距離増加で線量増加

診断と修正:
「物理的異常値の系統的診断:

1. 負の線量値:
   - 形状定義の重なりチェック
   - CMB演算式の確認
   - poker_updateBody で修正

2. 極端な値（>1e10 or <1e-20）:
   - 単位系確認: poker_getUnit
   - 放射能単位確認（Bq単位）
   - poker_validateUnitIntegrity実行

3. 距離依存異常:
   - 線源位置確認
   - 検出器配置確認
   - 座標系の一貫性確認

4. 物理的妥当性チェック:
   - 1/r²則の確認
   - 遮蔽効果の確認
   - ビルドアップ係数の妥当性

修正を実施してください。」
```

#### **問題B3: 28メソッドの使い分け迷い**
```
症状:
- proposeとupdateの使い分けが不明
- どのメソッドを使うべきか分からない
- エラーコードが頻発

判断基準:
「28メソッド適切使用ガイド:

【propose vs update vs delete】
新規作成 → propose
既存修正 → update  
削除 → delete

【使用順序の原則】
1. Body定義 → Zone設定 → Source配置 → Detector設置
2. Unit設定は最初に実行
3. BuildupFactorは材料使用前に設定
4. applyChangesで変更確定

【Unit操作5メソッドの順序】
1. proposeUnit: 初期設定
2. getUnit: 現状確認
3. validateUnitIntegrity: 整合性確認
4. analyzeUnitConversion: 変換分析
5. updateUnit: 必要時のみ変更

【エラー時の切り替え】
-32064 → proposeからupdateへ
-32065 → updateからproposeへ

この原則に従って操作してください。」
```

---

### 🟢 **緊急度: 低（計画的対応）**

#### **問題C1: 計算速度の改善**
```
症状:
- 計算に時間がかかる
- 応答が遅い
- タイムアウトが発生

最適化:
「計算パフォーマンス最適化:

1. カットオフレート調整:
   概略計算: 0.01
   標準計算: 0.001
   詳細計算: 0.0001

2. 検出器最適化:
   - 点検出器優先使用
   - 格子数の適切化（10×10程度）
   - show_path_trace無効化

3. 段階的詳細化:
   粗い計算 → ホットスポット特定 → 詳細計算

実装してください。」
```

---

## 🔧 第3章: ログファイル活用

### ログファイルの場所と確認方法

```
Claude Desktop 指示:
「ログファイル診断を実行してください:

1. Claude Desktopログ:
   場所: C:\Users\yoshi\AppData\Roaming\Claude\logs\
   最新ログファイル確認
   
2. アプリケーションログ:
   場所: C:\Users\yoshi\AppData\Local\AnthropicClaude\app-[version]\
   
3. ログ内容の確認ポイント:
   - 'error'を含む行
   - 'poker'を含む行
   - タイムスタンプ確認
   
4. エラーメッセージ解釈:
   - 'ENOENT': ファイル未検出
   - 'EACCES': アクセス権限エラー
   - 'EINVAL': 無効なパラメータ
   - 'ETIMEDOUT': タイムアウト

最新50行を確認して問題を特定してください。」
```

### ログからの問題特定例

```python
# ログ解析スクリプト
import re
from pathlib import Path
from datetime import datetime

def analyze_logs():
    log_path = Path(r"C:\Users\yoshi\AppData\Roaming\Claude\logs")
    
    # 最新ログファイル取得
    latest_log = max(log_path.glob("*.log"), 
                    key=lambda p: p.stat().st_mtime)
    
    with open(latest_log, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # エラー抽出
    errors = []
    for i, line in enumerate(lines):
        if 'error' in line.lower() or 'poker' in line.lower():
            errors.append({
                'line_no': i + 1,
                'content': line.strip(),
                'timestamp': extract_timestamp(line)
            })
    
    # エラーパターン分析
    patterns = {
        'MCP接続': r'mcp.*connection',
        'メソッド実行': r'poker_\w+.*failed',
        'YAML関連': r'yaml.*error',
        'メモリ': r'memory|heap'
    }
    
    categorized = {cat: [] for cat in patterns}
    for error in errors:
        for category, pattern in patterns.items():
            if re.search(pattern, error['content'], re.I):
                categorized[category].append(error)
    
    return categorized

def extract_timestamp(line):
    # タイムスタンプ抽出（例: 2025-01-15 10:30:45）
    match = re.search(r'\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}', line)
    return match.group() if match else None
```

---

## 🔨 第4章: YAMLファイルトラブル

### 4.1 インデントエラー

```
症状と対処:
「YAMLインデントエラー修正:

【症状】
- 'expected <block end>, but found <scalar>'
- 'bad indentation'

【原因と修正】
1. タブ文字混入:
   検索置換: タブ → スペース2個
   
2. インデント不整合:
   正しい例:
   bodies:
     - name: wall    # スペース2個
       type: RPP     # スペース4個
       min: "0 0 0"  # スペース4個
   
3. リスト記法混在:
   統一: ハイフン後にスペース1個
   
4. 文字列引用符:
   座標は引用符で('[]')
                    repairs.append({
                        'issue': issue['type'],
                        'action': 'pending_reset',
                        'success': True
                    })
        
        return repairs
    
    def restore_latest_backup(self):
        """最新バックアップ復元"""
        backups = sorted(
            self.backup_dir.glob("poker_*.yaml"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        if backups:
            shutil.copy2(backups[0], self.yaml_file)
            return True
        return False
    
    def fix_yaml_format(self):
        """YAMLフォーマット修正"""
        try:
            # タブをスペースに変換
            content = self.yaml_file.read_text()
            content = content.replace('\t', '  ')
            
            # 保存前にバックアップ
            backup = self.yaml_file.with_suffix('.yaml.broken')
            shutil.copy2(self.yaml_file, backup)
            
            # 修正版保存
            self.yaml_file.write_text(content)
            
            # 検証
            with open(self.yaml_file, 'r') as f:
                yaml.safe_load(f)
            
            return True
        except:
            return False

# 使用例
if __name__ == "__main__":
    repairer = AutoRepairer()
    issues = repairer.run_diagnostics()
    
    if issues:
        print(f"発見された問題: {len(issues)}件")
        for issue in issues:
            print(f"- {issue['type']}: {issue['severity']}")
        
        repairs = repairer.auto_repair(issues)
        print(f"\n修復結果:")
        for repair in repairs:
            status = "成功" if repair['success'] else "失敗"
            print(f"- {repair['issue']}: {status}")
    else:
        print("問題は検出されませんでした")
```

---

## 🎯 まとめ: トラブルシューティングフローチャート

```
問題発生
    ↓
[エラーコード表示？]
    Yes → 第1章エラーコード表参照
    No  ↓
[MCPメソッド使用不可？]  
    Yes → 問題A1（MCPサーバー接続）
    No  ↓
[計算実行エラー？]
    Yes → 問題A2（poker_cui）
    No  ↓
[YAML関連エラー？]
    Yes → 第4章YAML対処
    No  ↓
[計算結果異常？]
    Yes → 問題B2（物理的異常値）
    No  ↓
[パフォーマンス問題？]
    Yes → 第6章最適化
    No  ↓
[その他の問題]
    → ログファイル確認（第3章）
    → FAQ参照（第9章）
    → 自動修復試行（第10章）
```

---

**📚 関連マニュアル**
- [ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md): 基本操作（問題なく動作する場合）
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md): コマンド早見表
- [PHYSICS_REFERENCE.md](PHYSICS_REFERENCE.md): 物理的妥当性確認
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md): システム統合問題
- [RESEARCH_WORKFLOWS.md](RESEARCH_WORKFLOWS.md): 計算手法最適化

**⚠️ 緊急時の心得**
1. **パニックにならない** - ほとんどの問題は解決可能
2. **バックアップ確認** - 自動バックアップが味方
3. **段階的対処** - 簡単な解決策から試す
4. **記録を残す** - 同じ問題の再発防止

---

**最終更新**: 2025年1月  
**バージョン**: 1.2.0 MCP Edition  
**サポート**: GitHub Issues / poker-mcp-support@example.com