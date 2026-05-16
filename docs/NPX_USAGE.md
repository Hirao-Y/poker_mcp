# 🚀 NPX を使用したPoker MCPサーバーの起動 (v1.2.6)

## 📦 起動方法

### **方法1: npx で直接起動（推奨）**
```bash
npx poker-mcp
```
インストール不要。初回実行時に自動ダウンロードして起動します。

### **方法2: ローカルソースから起動（開発者向け）**
```bash
# リポジトリをクローンして依存関係をインストール
git clone https://github.com/Hirao-Y/poker_mcp.git
cd poker_mcp
npm install
node src/mcp_server_stdio_v4.js
```

### **方法3: グローバルインストール後に起動**
```bash
npm install -g poker-mcp
poker-mcp
```

---

## 🔧 **環境変数の設定**

### `POKER_MCP_HOME`（推奨・v1.2.6新設）
作業ファイル（YAML・バックアップ・ログ・核種DB）の格納先を指定します。  
**未設定時は `~/.poker-mcp/`（Windows: `C:\Users\<username>\.poker-mcp\`）が自動使用されます。**

```bash
# Windows（コマンドプロンプト）
set POKER_MCP_HOME=C:\Users\<username>\poker_mcp_workspace

# Windows（PowerShell）
$env:POKER_MCP_HOME="C:\Users\<username>\poker_mcp_workspace"

# Linux/macOS
export POKER_MCP_HOME="$HOME/.poker-mcp"
```

### `POKER_INSTALL_PATH`（オプション）
ICRP-07.NDX 核種データベースのコピー元を指定します。  
**未設定時は `C:/Poker` をデフォルト値として使用します。**

```bash
# Windows
set POKER_INSTALL_PATH=C:/Poker

# Linux/macOS
export POKER_INSTALL_PATH="/usr/local/share/poker"
```

### データ格納先の構造
```
POKER_MCP_HOME/             # デフォルト: ~/.poker-mcp/
  ├── tasks/                # poker.yaml, pending_changes.json
  ├── backups/              # 自動バックアップ（最大10世代）
  ├── data/                 # ICRP-07.NDX 核種データベース
  ├── logs/                 # error.log, combined.log
  └── config.json           # ユーザー設定（任意）
```

---

## 🎯 **Claude Desktop での設定（v1.2.6推奨）**

### **推奨設定**
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
`<username>` はご自身のWindowsユーザー名に置き換えてください。  
`POKER_INSTALL_PATH` は省略可能（省略時は `C:/Poker` を使用）。

> **⚠️ `cwd` の指定は不要・非推奨**  
> v1.2.5 以前のドキュメントでは `"cwd": "C:\\..."` の指定を案内していましたが、
> これが **SERVER DISCONNECTED の原因** でした。v1.2.6 では `POKER_MCP_HOME`
> 環境変数でデータ格納先を管理するため、`cwd` の指定は不要です。

### **macOS / Linux の設定例**
```json
{
  "mcpServers": {
    "poker-mcp": {
      "command": "npx",
      "args": ["poker-mcp"],
      "env": {
        "POKER_MCP_HOME": "/home/<username>/.poker-mcp",
        "POKER_INSTALL_PATH": "/usr/local/share/poker"
      }
    }
  }
}
```

---

## ✅ **正常起動の確認**

### 起動状態の特徴
`npx poker-mcp` を実行すると：
- プロセスが起動して **待機状態** になる（出力なし = 正常）
- MCP STDIO通信で Claude Desktop からの接続を待つ
- 問題があれば `stderr` にエラーメッセージが表示される（v1.2.6以降）

### ログファイルで確認
```bash
# Windows
type %USERPROFILE%\.poker-mcp\logs\combined.log

# Linux/macOS
cat ~/.poker-mcp/logs/combined.log
```

正常起動時のログ末尾:
```
{"message":"データマネージャーを初期化しました",...}
{"message":"TaskManagerを初期化しました",...}
{"message":"PokerMcpServer初期化完了",...}
{"message":"Poker MCP Server started on stdio",...}
```

### Claude Desktopでの動作確認
```
Claude Desktopで以下のコマンドを試してください：
- 「現在の単位設定を確認してください」→ poker_getUnit を使用
- 「単位系の整合性を検証してください」→ poker_validateUnitIntegrity を使用
```

---

## 🔍 **トラブルシューティング**

### **問題1: SERVER DISCONNECTED**
```
症状: Claude Desktop に "SERVER DISCONNECTED" と表示される
```

**原因と対処:**

1. `claude_desktop_config.json` に `cwd` が設定されている場合は削除し、
   `env.POKER_MCP_HOME` に切り替える（上記推奨設定を参照）

2. ログファイルでエラーを確認する:
   ```bash
   # Windows
   type %USERPROFILE%\.poker-mcp\logs\error.log
   
   # または POKER_MCP_HOME を設定している場合
   type C:\Users\<username>\poker_mcp_workspace\logs\error.log
   ```

3. コマンドプロンプトで直接起動してエラーを確認する:
   ```bash
   npx poker-mcp
   ```
   v1.2.6 以降は `stderr` にエラーが表示されます。

### **問題2: "MISSING_SOURCE_FILE" エラー**
```
症状: 核種データベース（ICRP-07.NDX）が見つからない
```

`POKER_INSTALL_PATH` に POKERのインストールディレクトリを設定してください:
```json
"env": {
  "POKER_INSTALL_PATH": "C:/Program Files/POKER"
}
```
設定したパスの `lib/ICRP-07.NDX` が自動的に `POKER_MCP_HOME/data/` にコピーされます。

### **問題3: npm / npx が見つからない**
```bash
# Node.js バージョン確認（18以上が必要）
node --version

# npm バージョン確認
npm --version
```
Node.js 18未満の場合は https://nodejs.org/ から最新版をインストールしてください。

### **問題4: MCP メソッドが使用できない**
1. Claude Desktop を完全終了して再起動する
2. `claude_desktop_config.json` の JSON 構文を確認する（カンマ・括弧の過不足）
3. ログファイルで起動エラーを確認する

---

## 📊 **パフォーマンス情報**

| 項目 | 値 |
|------|---|
| メモリ使用 | 40〜200MB |
| 起動時間 | 1〜3秒（核種DB読み込み含む） |
| 応答時間 | <50ms（全29メソッド） |
| バックアップ世代 | 最大10世代（自動管理） |

---

## 🔄 **アップデート**

```bash
# npx は毎回最新版を確認します（キャッシュが残る場合）
npx --yes poker-mcp

# キャッシュを強制クリアして最新版を取得
npm cache clean --force
npx poker-mcp
```

---

## 📋 **まとめ**

| 項目 | 内容 |
|------|------|
| 推奨起動コマンド | `npx poker-mcp` |
| 設定方法 | `claude_desktop_config.json` に `env.POKER_MCP_HOME` を追加 |
| データ保存先 | `POKER_MCP_HOME`（未設定時: `~/.poker-mcp/`） |
| ログ場所 | `POKER_MCP_HOME/logs/combined.log` |
| Node.js 要件 | v18.0.0 以上 |
| 通信方式 | STDIO（ポート開放不要） |
| 自動バックアップ | 有効（最大10世代） |

---

**📚 関連ドキュメント**
- [TROUBLESHOOTING.md](manuals/TROUBLESHOOTING.md): 問題解決ガイド
- [ESSENTIAL_GUIDE.md](manuals/ESSENTIAL_GUIDE.md): 基本操作ガイド
- [CHANGELOG.md](../CHANGELOG.md): バージョン変更履歴

**Poker MCP Server v1.2.6** | 作者: Yoshihiro Hirao | ライセンス: ISC
