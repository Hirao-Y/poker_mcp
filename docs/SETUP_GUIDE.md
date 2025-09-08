# 🚀 Poker MCP セットアップ・設定ガイド

**最終更新**: 2025年9月8日  
**対応バージョン**: Poker MCP Server v1.1.0  
**対象読者**: 開発者・研究者・システム管理者

---

## 📖 このガイドについて

このガイドは、Poker MCPサーバーの**セットアップから詳細設定まで**を一つのファイルで完結させることを目的としています。NPXでの基本実行から環境変数による高度なカスタマイズまで、段階的に学習できる構成になっています。

### 🎯 学習の流れ
1. **基本実行**: NPXによる簡単起動
2. **詳細設定**: 環境変数による柔軟な設定
3. **Claude統合**: Claude Desktopとの完全統合
4. **高度運用**: 複数環境・自動化での活用

---

## 📦 第1章: NPX基本起動

### **方法1: パッケージ名で起動（推奨）**
```bash
npx poker-mcp
```

### **方法2: ローカルディレクトリから起動**
```bash
# poker_mcpディレクトリ内で実行
cd /path/to/poker_mcp
npx .
```

### **方法3: 直接ファイル実行**
```bash
# メインサーバーファイルを直接実行
node /path/to/poker_mcp/src/mcp_server_stdio_v4.js
```

---

## 🔧 第2章: 環境変数詳細設定

### **概要**
Poker MCPサーバーは環境変数を使用してカスタム作業ディレクトリとファイルパスを設定できます。これにより、プロジェクト別の作業環境や任意のディレクトリでのファイル管理が可能になります。

### **対応環境変数一覧**

#### 基本環境変数
- `POKER_WORK_DIR`: 作業ディレクトリのベースパス（デフォルト: `./`）
- `POKER_TASKS_DIR`: タスクディレクトリ名（デフォルト: `tasks`）

#### ファイル名指定
- `POKER_YAML_FILE`: メインYAMLファイル名（デフォルト: `poker.yaml`）
- `POKER_PENDING_FILE`: 保留変更ファイル名（デフォルト: `pending_changes.json`）

**注意**: サーバーv1.1.0では上記4つの環境変数のみサポートしています。

### **パス解決の仕組み（v1.1.0対応）**

#### **実装されているパス構造**
1. **作業ディレクトリ**: `POKER_WORK_DIR`を基準として設定（デフォルト: `./`）
2. **タスクディレクトリ**: `POKER_WORK_DIR/POKER_TASKS_DIR`として解決（デフォルト: `tasks`）
3. **YAMLファイル**: `tasksDir/POKER_YAML_FILE`として配置（デフォルト: `poker.yaml`）
4. **保留ファイル**: `tasksDir/POKER_PENDING_FILE`として配置（デフォルト: `pending_changes.json`）

#### **パス解決例**
```bash
# デフォルト設定の場合
POKER_WORK_DIR=./
POKER_TASKS_DIR=tasks
→ 実際のパス: ./tasks/poker.yaml

# カスタム設定の場合  
POKER_WORK_DIR=/home/user/projects
POKER_TASKS_DIR=medical_ct
POKER_YAML_FILE=hospital_shielding.yaml
→ 実際のパス: /home/user/projects/medical_ct/hospital_shielding.yaml
```

---

## 🖥️ 第3章: Claude Desktop統合

### **基本設定**
```json
{
  "mcpServers": {
    "poker-mcp": {
      "command": "npx",
      "args": ["poker-mcp"],
      "env": {}
    }
  }
}
```

### **環境変数を含む詳細設定**
```json
{
  "mcpServers": {
    "poker-mcp": {
      "command": "npx", 
      "args": ["poker-mcp"],
      "env": {
        "POKER_WORK_DIR": "/home/user/radiation_projects",
        "POKER_TASKS_DIR": "medical_facility",
        "POKER_YAML_FILE": "ct_room_shielding.yaml",
        "POKER_PENDING_FILE": "ct_room_pending.json"
      }
    }
  }
}
```

### **プロジェクト別設定例**

#### 医療施設向け設定
```json
{
  "mcpServers": {
    "poker-mcp-medical": {
      "command": "npx",
      "args": ["poker-mcp"],
      "env": {
        "POKER_WORK_DIR": "C:\\MedicalShielding",
        "POKER_TASKS_DIR": "hospital_projects",
        "POKER_YAML_FILE": "medical_facility.yaml"
      }
    }
  }
}
```

#### 研究施設向け設定
```json
{
  "mcpServers": {
    "poker-mcp-research": {
      "command": "npx",
      "args": ["poker-mcp"],
      "env": {
        "POKER_WORK_DIR": "/opt/research/radiation",
        "POKER_TASKS_DIR": "accelerator_studies",
        "POKER_YAML_FILE": "beamline_shielding.yaml"
      }
    }
  }
}
```

### **Claude Desktop設定ファイルの場所**
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

---

## 🌟 第4章: 高度な使用方法

### **NPX起動の準備**

#### **Step 1: 依存関係のインストール**
```bash
# poker_mcpディレクトリに移動
cd /path/to/poker_mcp

# 依存関係インストール
npm install

# NPXキャッシュ確認
npx --help
```

#### **Step 2: 起動テスト**
```bash
# 基本テスト
npx poker-mcp --help

# サーバー起動テスト（開発環境）
npx poker-mcp
```

### **開発環境での使用**
```bash
# 開発サーバー起動
cd /path/to/poker_mcp
npx poker-mcp

# または短縮形
npx .
```

### **複数環境での使用**
```bash
# 開発環境
cd /path/to/poker_mcp
npx poker-mcp

# 本番環境
npm install -g poker-mcp
poker-mcp

# テスト環境
npx poker-mcp --test  # 将来実装予定
```

### **環境変数設定の実践例**

#### **Windows環境**
```batch
# コマンドプロンプト
set POKER_WORK_DIR=C:\RadiationProjects
set POKER_TASKS_DIR=ct_shielding
set POKER_YAML_FILE=hospital_main.yaml
npx poker-mcp

# PowerShell
$env:POKER_WORK_DIR="C:\RadiationProjects"
$env:POKER_TASKS_DIR="ct_shielding"
npx poker-mcp
```

#### **Linux/macOS環境**
```bash
# 一時的設定
POKER_WORK_DIR=/home/user/projects \
POKER_TASKS_DIR=medical_ct \
POKER_YAML_FILE=hospital_shielding.yaml \
npx poker-mcp

# 永続的設定（.bashrc/.zshrc）
export POKER_WORK_DIR=/home/user/projects
export POKER_TASKS_DIR=medical_ct
export POKER_YAML_FILE=hospital_shielding.yaml
```

### **バッチ処理での使用**
```bash
# バックグラウンド起動（Windows）
start /b npx poker-mcp

# バックグラウンド起動（Linux/macOS）
npx poker-mcp &

# ログ出力付き
npx poker-mcp > poker_mcp.log 2>&1 &
```

---

## 🔄 第5章: メンテナンス・トラブルシューティング

### **アップデートとメンテナンス**

#### **パッケージ更新**
```bash
# 最新版に更新
cd /path/to/poker_mcp
npm update

# 特定パッケージ更新
npm update @modelcontextprotocol/sdk
```

#### **キャッシュクリア**
```bash
# NPXキャッシュクリア
npx --clear-cache

# npmキャッシュクリア
npm cache clean --force
```

#### **完全再インストール**
```bash
# node_modules削除と再インストール
cd /path/to/poker_mcp
# Windows
rmdir /s node_modules
# Linux/macOS
rm -rf node_modules

npm install
```

### **環境変数関連のトラブルシューティング**

#### **パス解決エラー**
```bash
# 問題: 指定したディレクトリが見つからない
# 解決策: 絶対パスで指定
POKER_WORK_DIR=/full/absolute/path/to/project

# 問題: ファイル作成権限エラー
# 解決策: 権限確認
ls -la /path/to/directory
chmod 755 /path/to/directory
```

#### **設定値確認**
```bash
# 環境変数の確認（Linux/macOS）
echo $POKER_WORK_DIR
echo $POKER_TASKS_DIR

# 環境変数の確認（Windows）
echo %POKER_WORK_DIR%
echo %POKER_TASKS_DIR%
```

### **よくある問題と解決策**

#### **問題1: NPXが見つからない**
```bash
# 解決策
npm install -g npx
# または
npm install -g npm@latest
```

#### **問題2: 環境変数が反映されない**
```bash
# Claude Desktop再起動が必要
# 設定ファイル保存後、Claude Desktopを完全終了・再起動
```

#### **問題3: ファイルパスの区切り文字エラー**
```json
// Windows: バックスラッシュをエスケープ
"POKER_WORK_DIR": "C:\\Users\\Name\\Projects"

// または、スラッシュを使用
"POKER_WORK_DIR": "C:/Users/Name/Projects"
```

---

## 🎯 まとめ

### **設定の推奨フロー**
1. **基本テスト**: `npx poker-mcp`で動作確認
2. **環境変数設定**: プロジェクトに応じた変数設定
3. **Claude Desktop統合**: MCP設定ファイルの更新
4. **動作確認**: Claude Desktopでの実際の使用テスト

### **本番運用の推奨事項**
- 環境変数は絶対パスで指定
- プロジェクト別に異なるディレクトリを使用
- 定期的なバックアップ設定
- ログ出力の監視

### **参考リンク**
- **基本操作**: [docs/manuals/ESSENTIAL_GUIDE.md](manuals/ESSENTIAL_GUIDE.md)
- **API詳細**: [docs/manuals/API_COMPLETE.md](manuals/API_COMPLETE.md)
- **トラブルシューティング**: [docs/manuals/TROUBLESHOOTING.md](manuals/TROUBLESHOOTING.md)

---

**🎯 Poker MCP Server v1.1.0 対応セットアップガイド**  
**設定から運用まで、このガイド一つで完結**