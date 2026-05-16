# ⚠️ トラブルシューティング - Poker MCP

**対象**: 全ユーザー（問題解決時）  
**バージョン**: 1.2.6 MCP Edition  
**最終更新**: 2026年5月16日  
**使用方法**: Claude Desktop + MCP通信 (29メソッド対応)

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

### 🗂️ データファイル関連エラー

| エラーメッセージ | 原因 | 対処法 |
|------------------|------|--------|
| MISSING_SOURCE_FILE | POKER_INSTALL_PATHが不正またはファイル不存在 | 環境変数設定・ファイル存在確認 |
| ENOENT: no such file | data/ICRP-07.NDXが見つからない | 環境変数確認・手動ファイル配置 |
| EACCES: permission denied | ファイル書き込み権限不足 | dataディレクトリ権限確認 |
| Database loading failed | 核種データベース読み込み失敗 | ファイル完全性・形式確認 |

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

## 🚨 第1.5章: SERVER DISCONNECTED（起動失敗）

> **v1.2.6で修正済みの既知バグです。** このセクションは v1.2.5 以前からアップデートしていない
> ユーザー向け、または新規インストール時の参考として残しています。

### 症状
- Claude Desktop に **"SERVER DISCONNECTED"** と表示される
- MCP ツール（`poker_*`）が一切使用できない
- コマンドプロンプトで `npx poker-mcp` を実行すると以下のエラーが出る:
  ```
  Error: EPERM: operation not permitted, mkdir 'C:\Windows\System32\logs'
  ```
  または:
  ```
  Error: EPERM: operation not permitted, mkdir 'C:\Windows\System32\backups'
  ```

### 原因
`npx` でサーバーを起動する際、カレントディレクトリが `C:\Windows\System32` に
設定されます。v1.2.5 以前のコードは相対パス（`logs/`・`backups/` など）でフォルダを
作成しようとするため、システムフォルダへの書き込み権限エラーが発生し、
サーバーが無音のまま終了していました。

### 解決手順

**Step 1: バージョンを確認する**
```bash
npm view poker-mcp version
# 1.2.6 と表示されれば最新版
```
1.2.5 以前の場合は Step 2 へ。

**Step 2: npmキャッシュをクリアして最新版を取得する**
```bash
npm cache clean --force
npx poker-mcp
```

**Step 3: `claude_desktop_config.json` を確認・修正する**

設定ファイルを開く:
```
Windows: %APPDATA%\Claude\claude_desktop_config.json
```

`cwd` の記述があれば削除し、`env.POKER_MCP_HOME` に切り替える:

```json
{
  "mcpServers": {
    "poker-mcp": {
      "command": "npx",
      "args": ["poker-mcp"],
      "env": {
        "POKER_MCP_HOME": "C:\\Users\\<username>\\poker_mcp_workspace",
        "POKER_INSTALL_PATH": "C:/Poker"
      }
    }
  }
}
```

**Step 4: `POKER_MCP_HOME` に指定したフォルダを作成する**
```bash
mkdir C:\Users\<username>\poker_mcp_workspace
```

**Step 5: Claude Desktop を再起動する**

### 確認方法
ログファイルの末尾に以下が記録されていれば正常起動:
```
{"message":"Poker MCP Server started on stdio",...}
```

ログの場所:
```bash
# Windows（デフォルト）
type %USERPROFILE%\.poker-mcp\logs\combined.log

# POKER_MCP_HOME を設定した場合
type C:\Users\<username>\poker_mcp_workspace\logs\combined.log
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
   パス: %APPDATA%\Claude\claude_desktop_config.json
   
2. 設定内容確認（v1.2.6推奨設定）:
   {
     "mcpServers": {
       "poker-mcp": {
         "command": "npx",
         "args": ["poker-mcp"],
         "env": {
           "POKER_MCP_HOME": "C:\\Users\\<username>\\poker_mcp_workspace",
           "POKER_INSTALL_PATH": "C:/Poker"
         }
       }
     }
   }
   ※ cwd の指定は不要です（あれば削除してください）

3. ログファイルでエラーを確認:
   type %USERPROFILE%\.poker-mcp\logs\error.log
   
4. サーバー直接起動テスト:
   コマンドプロンプトで:
   npx poker-mcp
   （エラーがあれば画面に表示されます）
   
5. Claude Desktop再起動:
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

## 🗂️ 第2.5章: 環境変数・データファイル関連問題

### 🔴 **問題E1: POKER_INSTALL_PATH環境変数未設定**
```
症状:
- 「MISSING_SOURCE_FILE」エラー
- 「data/ICRP-07.NDX not found」メッセージ
- 核種データベース読み込み失敗

診断・対処:
「環境変数設定の緊急確認を実行してください：

1. 環境変数確認:
   Windows: echo %POKER_INSTALL_PATH%
   Linux/macOS: echo $POKER_INSTALL_PATH
   
2. 環境変数未設定の場合:
   Windows CMD: set POKER_INSTALL_PATH=C:/Poker
   Windows PS: $env:POKER_INSTALL_PATH="C:/Poker"
   Linux/macOS: export POKER_INSTALL_PATH="/usr/local/share/poker"
   
3. ソースファイル存在確認:
   パス確認: %POKER_INSTALL_PATH%\lib\ICRP-07.NDX
   ファイル確認: dir "%POKER_INSTALL_PATH%\lib\ICRP-07.NDX"
   
4. Claude Desktop設定更新:
   claude_desktop_config.jsonのenvセクションに追加:
   "env": {
     "POKER_INSTALL_PATH": "C:/Program Files/POKER"
   }
   
5. Claude Desktop再起動・確認」
```

### 🔴 **問題E2: データファイル権限問題**
```
症状:
- 「EACCES: permission denied」エラー
- dataディレクトリ作成失敗
- ファイルコピー失敗

即座対処:
「データファイル権限修復を実行してください：

1. ディレクトリ権限確認:
   Windows: dir C:\Users\yoshi\Desktop\poker_mcp\data /Q
   Linux: ls -la /path/to/poker_mcp/data/
   
2. 権限修復:
   Windows: 
   icacls "C:\Users\yoshi\Desktop\poker_mcp\data" /grant %USERNAME%:F
   
   Linux/macOS:
   chmod 755 /path/to/poker_mcp/data/
   chown $USER:$USER /path/to/poker_mcp/data/
   
3. 親ディレクトリ権限確認:
   mkdir権限の確保
   
4. MCPサーバー再起動」
```

### 🟠 **問題E3: 核種データベースファイル破損**
```
症状:
- 「Database loading failed」エラー
- ICRP-07.NDX読み込み失敗
- 子孫核種機能無効

診断・修復:
「データベースファイル完全性チェックを実行してください：

1. ファイル存在・サイズ確認:
   Windows: dir "C:\Users\yoshi\Desktop\poker_mcp\data\ICRP-07.NDX"
   予想サイズ: 約285KB (285,684 bytes)
   
2. ファイル完全性確認:
   Windows: certutil -hashfile "data\ICRP-07.NDX" MD5
   Linux: md5sum data/ICRP-07.NDX
   
3. 破損ファイルの再配置:
   既存ファイル削除: del data\ICRP-07.NDX
   MCPサーバー再起動で自動再配置
   
4. 手動ファイル配置:
   copy "%POKER_INSTALL_PATH%\lib\ICRP-07.NDX" data\
   
5. 動作確認:
   poker_confirmDaughterNuclidesで子孫核種機能テスト」
```

### 🟠 **問題E4: 環境変数設定の永続化**
```
症状:
- 再起動後に環境変数が失われる
- セッション終了で設定リセット
- Claude Desktop起動時に環境変数未設定

永続化設定:
「環境変数永続化設定を実行してください：

1. Windows永続化:
   システム環境変数設定:
   setx POKER_INSTALL_PATH "C:/Poker"
   
   またはGUI設定:
   システムプロパティ → 環境変数 → システム環境変数

2. Linux/macOS永続化:
   ~/.bashrc または ~/.profile に追加:
   echo 'export POKER_INSTALL_PATH="/usr/local/share/poker"' >> ~/.bashrc
   source ~/.bashrc
   
3. Claude Desktop設定永続化:
   claude_desktop_config.jsonでの確実な設定
   
4. 設定確認:
   新規ターミナル・セッションで環境変数確認」
```

---

## 🗂️ 第2.5章: 環境変数・データファイル関連問題

### 🔴 **問題E1: POKER_INSTALL_PATH環境変数未設定**
```
症状:
- 「MISSING_SOURCE_FILE」エラー
- 「data/ICRP-07.NDX not found」メッセージ
- 核種データベース読み込み失敗

診断・対処:
「環境変数設定の緊急確認を実行してください：

1. 環境変数確認:
   Windows: echo %POKER_INSTALL_PATH%
   Linux/macOS: echo $POKER_INSTALL_PATH
   
2. 環境変数未設定の場合:
   Windows CMD: set POKER_INSTALL_PATH=C:/Poker
   Windows PS: $env:POKER_INSTALL_PATH="C:/Poker"
   Linux/macOS: export POKER_INSTALL_PATH="/usr/local/share/poker"
   
3. ソースファイル存在確認:
   パス確認: %POKER_INSTALL_PATH%\lib\ICRP-07.NDX
   ファイル確認: dir "%POKER_INSTALL_PATH%\lib\ICRP-07.NDX"
   
4. Claude Desktop設定更新:
   claude_desktop_config.jsonのenvセクションに追加:
   "env": {
     "POKER_INSTALL_PATH": "C:/Program Files/POKER"
   }
   
5. Claude Desktop再起動・確認」
```

### 🔴 **問題E2: データファイル権限問題**
```
症状:
- 「EACCES: permission denied」エラー
- dataディレクトリ作成失敗
- ファイルコピー失敗

即座対処:
「データファイル権限修復を実行してください：

1. ディレクトリ権限確認:
   Windows: dir C:\Users\yoshi\Desktop\poker_mcp\data /Q
   Linux: ls -la /path/to/poker_mcp/data/
   
2. 権限修復:
   Windows: 
   icacls "C:\Users\yoshi\Desktop\poker_mcp\data" /grant %USERNAME%:F
   
   Linux/macOS:
   chmod 755 /path/to/poker_mcp/data/
   chown $USER:$USER /path/to/poker_mcp/data/
   
3. 親ディレクトリ権限確認:
   mkdir権限の確保
   
4. MCPサーバー再起動」
```

### 🟠 **問題E3: 核種データベースファイル破損**
```
症状:
- 「Database loading failed」エラー
- ICRP-07.NDX読み込み失敗
- 子孫核種機能無効

診断・修復:
「データベースファイル完全性チェックを実行してください：

1. ファイル存在・サイズ確認:
   Windows: dir "C:\Users\yoshi\Desktop\poker_mcp\data\ICRP-07.NDX"
   予想サイズ: 約285KB (285,684 bytes)
   
2. ファイル完全性確認:
   Windows: certutil -hashfile "data\ICRP-07.NDX" MD5
   Linux: md5sum data/ICRP-07.NDX
   
3. 破損ファイルの再配置:
   既存ファイル削除: del data\ICRP-07.NDX
   MCPサーバー再起動で自動再配置
   
4. 手動ファイル配置:
   copy "%POKER_INSTALL_PATH%\lib\ICRP-07.NDX" data\
   
5. 動作確認:
   poker_confirmDaughterNuclidesで子孫核種機能テスト」
```

### 🟠 **問題E4: 環境変数設定の永続化**
```
症状:
- 再起動後に環境変数が失われる
- セッション終了で設定リセット
- Claude Desktop起動時に環境変数未設定

永続化設定:
「環境変数永続化設定を実行してください：

1. Windows永続化:
   システム環境変数設定:
   setx POKER_INSTALL_PATH "C:/Poker"
   
   またはGUI設定:
   システムプロパティ → 環境変数 → システム環境変数

2. Linux/macOS永続化:
   ~/.bashrc または ~/.profile に追加:
   echo 'export POKER_INSTALL_PATH="/usr/local/share/poker"' >> ~/.bashrc
   source ~/.bashrc
   
3. Claude Desktop設定永続化:
   claude_desktop_config.jsonでの確実な設定
   
4. 設定確認:
   新規ターミナル・セッションで環境変数確認」
```

---

## 🔧 第3章: ログファイル活用

### ログファイルの場所と確認方法

```
Claude Desktop 指示:
「ログファイル診断を実行してください:

1. poker-mcp ログ（主要）:
   Windows（デフォルト）:
     type %USERPROFILE%\.poker-mcp\logs\combined.log
     type %USERPROFILE%\.poker-mcp\logs\error.log
   
   POKER_MCP_HOME を設定している場合:
     type <POKER_MCP_HOME>\logs\combined.log
   
   Linux/macOS:
     cat ~/.poker-mcp/logs/combined.log
   
2. ログ内容の確認ポイント:
   - 'error'を含む行
   - 'EPERM'・'ENOENT'・'EACCES' などのシステムエラー
   - タイムスタンプで最新のエラーを確認
   
3. エラーメッセージ解釈:
   - 'EPERM':   権限エラー（パス設定を見直す）
   - 'ENOENT':  ファイル未検出（パス・ファイルの存在確認）
   - 'EACCES':  アクセス権限エラー（ディレクトリ権限確認）
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

**最終更新**: 2026年5月  
**バージョン**: 1.2.6 MCP Edition  
**サポート**: GitHub Issues