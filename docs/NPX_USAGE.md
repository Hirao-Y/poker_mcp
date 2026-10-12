# 🚀 NPX を使用したPoker MCPサーバーの起動 (v1.10.0)

> npm に公開している最新版は **1.10.0** です（非同期ジョブ `POKER_MCP_ASYNC` と
> `POKER_MCP_GUI` を含む）。HTTP 版（`poker-mcp-http`）は v1.11.0 の機能で、npm には
> まだ公開していません。試す場合は方法2（ローカルソース）で起動してください。

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
# HTTP 版（v1.11.0）は node src/mcp_server_http.js（または npm run start:http）
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

### `POKER_INSTALL_PATH`（実質必須）
POKER 本体のインストール先を指定します。  
**未設定時は `C:/Poker` をデフォルト値として使用します。**

v1.4.0 以降、この配下の `LIB/` を**直接参照**します。設定を誤ると
以下がすべて機能しません。

| 参照先 | 用途 |
|---|---|
| `LIB/ICRP-07.NDX` | 核種データベース（子孫核種の自動生成） |
| `LIB/lib_material.dat` | 材料カタログ（材料名正規化・カタログ密度） |
| `POKER_CUI.exe` | 線量計算の実行 |
| `POKER.exe` | GUI 表示（`poker_openGui`） |

```bash
# Windows
set POKER_INSTALL_PATH=C:/Poker

# Linux/macOS
export POKER_INSTALL_PATH="/usr/local/share/poker"
```

> **v1.3.0 以前からの変更**: 核種データベースを `POKER_MCP_HOME/data/` へ
> コピーする方式を廃止しました。コピーは「存在すればスキップ」だったため、
> POKER を更新しても古いコピーを読み続ける問題がありました。

### `FREECAD_PATH`（CAD連携を使う場合）

`poker_generatePaths` で FreeCAD のモデルから経路を抽出する場合に使います。
CAD 連携を使わないなら不要です。

```bash
# Windows（実行ファイルでもインストールフォルダでも可）
set FREECAD_PATH=C:/Program Files/FreeCAD 1.1

# Linux/macOS
export FREECAD_PATH="/usr/lib/freecad"
```

**未設定でも、次の順で自動的に探します。**

1. PATH に `freecadcmd` があるか
2. 既定のインストール先（`Program Files` 等の `FreeCAD*`）を新しい順に

`POKER_INSTALL_PATH` のように固定の既定値を持てないのは、FreeCAD の
インストール先がバージョン番号を含むためです（FreeCAD 1.1, 1.0 …）。
見つからなければ、設定方法を案内して中止します。

レイトレーサは numpy を使いますが、FreeCAD に同梱されているので追加の
インストールは不要です。

### 非同期ジョブ: `POKER_MCP_ASYNC` ほか（v1.10.0）

長い計算を「投入 → 状態確認 → 結果取得」に分けて実行する機能です。**既定では無効**で、
設定しなければツール一覧も動作も v1.9.9 と同じです。

| 変数 | 既定 | 内容 |
|---|---|---|
| `POKER_MCP_ASYNC` | 無効 | `1`（`true` / `yes` / `on` も可）で有効 |
| `POKER_MCP_ASYNC_CONCURRENCY` | 1 | 同時に実行する計算の数 |
| `POKER_MCP_JOB_RETENTION_DAYS` | 7 | 終わったジョブを残す日数 |
| `POKER_MCP_JOB_TIMEOUT_MIN` | 1440 | 1 件の計算の打ち切り時間（分） |

有効にすると `poker_submitCalculation` / `poker_getJobStatus` / `poker_getJobResult` が
加わり（ツール数 36 → 39）、`poker_getDoseMap` に `job_id` 引数が付きます。
数十秒で終わる計算は従来どおり `poker_executeCalculation` で構いません。

### `POKER_MCP_GUI`（v1.10.0）

`poker_openGui` は、次のどれかに当たるとツール一覧から外れます（ツール数が 1 減ります）。

- `POKER_MCP_GUI` が `0` / `false` / `no` / `off`（リモート公開するサーバで使う想定）
- Windows 以外で動いている
- `POKER_INSTALL_PATH` に `POKER.exe` が無い

判定は起動時に 1 回だけです。後から POKER を入れた場合は Claude Desktop を再起動してください。
計算（`POKER_CUI.exe`）を使うツールには影響しません。

### データ格納先の構造
```
POKER_MCP_HOME/             # デフォルト: ~/.poker-mcp/
  ├── tasks/                # poker.yaml, pending_changes.json
  ├── backups/              # 自動バックアップ（最大10世代）
  ├── logs/                 # error.log, combined.log
  ├── jobs/                 # 非同期ジョブ（POKER_MCP_ASYNC=1 のときだけ。既定 7 日で自動削除）
  └── config.json           # ユーザー設定（任意）

POKER_INSTALL_PATH/         # デフォルト: C:/Poker
  └── LIB/
      ├── ICRP-07.NDX       # 核種データベース（読み取りのみ）
      └── lib_material.dat  # 材料カタログ（読み取りのみ）
```

`POKER_MCP_HOME/data/` は v1.4.0 で作成されなくなりました。旧環境に
残っていても害はありませんが、削除して構いません。

---

## 🎯 **Claude Desktop での設定（v1.10.0推奨）**

### **推奨設定**
```json
{
  "mcpServers": {
    "poker-mcp": {
      "command": "npx",
      "args": ["-y", "poker-mcp@1.10.0"],
      "env": {
        "POKER_MCP_HOME": "C:\\Users\\<username>\\poker_mcp_workspace",
        "POKER_INSTALL_PATH": "C:/Poker"
      }
    }
  }
}
```
`<username>` はご自身のWindowsユーザー名に置き換えてください。

> **⚠️ 版数の固定を推奨**
> `poker-mcp@latest` ではなく `poker-mcp@1.10.0` のように固定してください。
> 遮蔽計算では、いつサーバが入れ替わるか分からない状態は再現性の観点から
> 望ましくありません。更新は設定を書き換える意図的な操作として行います。
>
> NPX はパッケージをキャッシュするため、同じ版数を再 publish しても古い
> ものが使われることがあります。その場合は `npm cache clean --force` を実行します。

> **⚠️ `POKER_INSTALL_PATH` は省略しないでください**
> v1.4.0 以降、核種データベースと材料カタログの参照元になりました。
> 既定値 `C:/Poker` と実際のインストール先が異なると、子孫核種の自動生成が
> 動作しません。

> **⚠️ 1.9.8 以前を固定している場合は 1.9.9 以降へ更新してください**
> 1.9.8 までの npm パッケージには `tools/gen_input.py` と `tools/scatter.py` が
> 含まれておらず、npx で起動すると `poker_generateInput` が
> `No module named 'gen_input'` で失敗していました（リポジトリから動かす場合は
> 問題ありません）。1.9.9 で同梱し、修正しました。
> 1.9.9 では、ツールが返した失敗（`success: false`）が MCP の `isError: true` として伝わるようにもなっています。

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
      "args": ["-y", "poker-mcp@1.10.0"],
      "env": {
        "POKER_MCP_HOME": "/home/<username>/.poker-mcp",
        "POKER_INSTALL_PATH": "/usr/local/share/poker"
      }
    }
  }
}
```

Windows 以外では POKER.exe（GUI）が使えないため、v1.10.0 以降は `poker_openGui` が
ツール一覧に現れません。

### **非同期ジョブを使う設定（v1.10.0）**

`env` に追加します。リモート公開するサーバ（v1.11.0 の HTTP 版）で使う場合は、GUI ツールも外します。

```json
"env": {
  "POKER_MCP_HOME": "C:\\poker_mcp_workspace",
  "POKER_INSTALL_PATH": "C:/Poker",
  "POKER_MCP_ASYNC": "1",
  "POKER_MCP_GUI": "0"
}
```

### **HTTP 版の起動（v1.11.0）**

別の機械から使うための HTTP 版（bin `poker-mcp-http`）は、v1.11.0 の npm 公開後は次で起動できます。

```bash
npx -y -p poker-mcp@1.11.0 poker-mcp-http
```

公開前はローカルソースから `node src/mcp_server_http.js`（または `npm run start:http`）で起動します。
既定では `http://127.0.0.1:3939/mcp` で待ち受けます。トークンなどの設定（`POKER_MCP_HTTP_*`）と
推奨構成は [ADMIN_GUIDE.md](manuals/ADMIN_GUIDE.md)、クライアントからの接続は
[INTEGRATION_GUIDE.md](manuals/INTEGRATION_GUIDE.md) を参照してください。
Claude Desktop の設定（上記）で使う stdio 版は従来どおりです。

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
{"message":"poker_openGui: 有効（POKER.exe: C:\\Poker\\POKER.exe）",...}
{"message":"PokerMcpServer初期化完了",...}
{"message":"Poker MCP Server started on stdio",...}
```

`poker_openGui:` の行は v1.10.0 以降に出ます。`無効（理由）` となっている場合は、
その理由（`POKER_MCP_GUI=0`、Windows 以外、POKER.exe が見つからない）を確認してください。

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
設定したパスの `LIB/ICRP-07.NDX` を直接参照します（v1.4.0以降、コピーは行いません）。

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
4. `poker_openGui` だけが無い場合は、GUI が使えない環境と判定されています
   （v1.10.0 以降。起動ログの `poker_openGui: 無効（理由）` を参照）
5. `poker_submitCalculation` などのジョブ系が無い場合は、`POKER_MCP_ASYNC=1` が
   設定されていないか、v1.10.0 より前の版です

### **問題5: `poker_generateInput` が `No module named 'gen_input'` で失敗する**

npm パッケージ 1.9.8 以前の不具合です（必要な Python ファイルが同梱されていませんでした）。
`args` の版数を `poker-mcp@1.9.9` 以降に変更し、Claude Desktop を再起動してください。
キャッシュが残る場合は `npm cache clean --force` を実行します。

---

## 📊 **パフォーマンス情報**

| 項目 | 値 |
|------|---|
| メモリ使用 | 40〜200MB |
| 起動時間 | 1〜3秒（核種DB読み込み含む） |
| 応答時間 | <50ms（全36メソッド。計算実行を除く） |
| バックアップ世代 | 最大10世代（自動管理） |

---

## 🔄 **アップデート**

```bash
# npx は毎回最新版を確認します（キャッシュが残る場合）
npx --yes poker-mcp

# キャッシュを強制クリアして最新版を取得
npm cache clean --force
npx poker-mcp

# 版数を指定して起動（Claude Desktop の設定では固定を推奨）
npx -y poker-mcp@1.10.0

# 最新版を明示して起動（動作確認用。常用は非推奨）
npx -y poker-mcp@latest
```

---

## 📋 **まとめ**

| 項目 | 内容 |
|------|------|
| 推奨起動コマンド | `npx poker-mcp`（Claude Desktop では `poker-mcp@1.10.0` のように版数を固定） |
| ツール数 | 36（非同期ジョブ有効で 39、`poker_openGui` が外れる環境ではそれぞれ 1 減） |
| 設定方法 | `claude_desktop_config.json` に `env.POKER_MCP_HOME` を追加 |
| データ保存先 | `POKER_MCP_HOME`（未設定時: `~/.poker-mcp/`） |
| ログ場所 | `POKER_MCP_HOME/logs/combined.log` |
| Node.js 要件 | v18.0.0 以上 |
| 通信方式 | STDIO（ポート開放不要）。HTTP 版 `poker-mcp-http` は v1.11.0（npm 未公開） |
| 自動バックアップ | 有効（最大10世代） |

---

**📚 関連ドキュメント**
- [TROUBLESHOOTING.md](manuals/TROUBLESHOOTING.md): 問題解決ガイド
- [ESSENTIAL_GUIDE.md](manuals/ESSENTIAL_GUIDE.md): 基本操作ガイド
- [CHANGELOG.md](../CHANGELOG.md): バージョン変更履歴

**Poker MCP Server v1.10.0（npm 公開版）** | 作者: Yoshihiro Hirao | ライセンス: MIT
