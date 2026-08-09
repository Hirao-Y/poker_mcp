# 🔧 ADMIN_GUIDE.md - システム管理者ガイド

**対応バージョン**: Poker MCP Server v1.5.0 (30メソッド完全実装)
**想定環境**: Windows + Claude Desktop（stdio 通信）
**最終更新**: 2026年8月

---

## 📖 本書の位置づけ

Poker MCP Server の**導入・設定・保守**に必要な実務情報をまとめます。
日常の使い方は [ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md)、
問題発生時の対処は [TROUBLESHOOTING.md](TROUBLESHOOTING.md) を参照してください。

### 動作形態の理解

本サーバは**常駐サービスではありません**。Claude Desktop が MCP クライアントとして
子プロセスを起動し、標準入出力（stdio）で JSON-RPC 通信を行います。

```
Claude Desktop  ──stdio──>  node src/mcp_server_stdio_v4.js
                                  │
                                  ├── POKER_MCP_HOME/  (作業ファイル)
                                  └── POKER_INSTALL_PATH/  (POKER本体・核データ)
```

この構造から導かれる重要な帰結があります。

- **プロセス管理は Claude Desktop が行う**。PM2 や systemd は使いません
- **HTTP ポートを開かない**。外部からの疎通監視やヘルスチェックはできません
- **設定変更の反映には Claude Desktop の再起動が必要**
- **標準出力は JSON-RPC 専用**。ログは stderr とログファイルへ出力されます

---

## 🏗️ セットアップ

### システム要件

| 項目 | 要件 |
|---|---|
| OS | Windows 10/11（`poker_openGui` は Windows 専用） |
| Node.js | 18 以上（ES Modules 使用） |
| POKER 本体 | 2.1.1 以上（GUI入力転送。2.1.0 でも `x_meta` は動作） |
| ディスク | 作業領域 1GB 程度（バックアップ10世代分を含む） |

### 導入方法

**方法A: npm パッケージ（推奨）**

```json
{
  "mcpServers": {
    "poker-mcp": {
      "command": "npx",
      "args": ["-y", "poker-mcp@1.5.0"],
      "env": {
        "POKER_MCP_HOME": "C:/Users/<username>/poker_mcp_workspace",
        "POKER_INSTALL_PATH": "C:/Poker"
      }
    }
  }
}
```

**方法B: ローカルリポジトリ（開発・改修時）**

```json
{
  "mcpServers": {
    "poker-mcp": {
      "command": "node",
      "args": ["C:/path/to/poker_mcp/src/mcp_server_stdio_v4.js"],
      "env": {
        "POKER_MCP_HOME": "C:/Users/<username>/poker_mcp_workspace",
        "POKER_INSTALL_PATH": "C:/Poker"
      }
    }
  }
}
```

設定ファイルの場所は `%APPDATA%\Claude\claude_desktop_config.json` です。

> **版数は固定してください。** `@latest` を指定すると、意図しない
> タイミングでサーバが入れ替わります。遮蔽計算では再現性が重要です。

> **`cwd` は指定しないでください。** 過去に SERVER DISCONNECTED の
> 原因となりました。作業ディレクトリは `POKER_MCP_HOME` で管理します。

---

## 🌍 環境変数

### `POKER_MCP_HOME`

作業ファイルの格納先です。未設定時は `~/.poker-mcp/` を使用します。

```
POKER_MCP_HOME/
  ├── tasks/      # poker.yaml, pending_changes.json
  ├── backups/    # 自動バックアップ（最大10世代）
  ├── logs/       # error.log, combined.log
  └── config.json # ユーザー設定（任意）
```

初回起動時に上記ディレクトリが自動作成されます。

### `POKER_INSTALL_PATH`

POKER 本体のインストール先です。未設定時は `C:/Poker` を使用します。

v1.4.0 以降、この配下を**直接参照**するため実質必須です。

| 参照先 | 用途 | 欠けた場合の影響 |
|---|---|---|
| `LIB/ICRP-07.NDX` | 核種データベース | 子孫核種の自動生成が不可 |
| `LIB/lib_material.dat` | 材料カタログ | 材料名正規化・カタログ密度が不可 |
| `POKER_CUI.exe` | 線量計算 | `executeCalculation` が失敗 |
| `POKER.exe` | GUI 表示 | `openGui` が失敗 |

> **v1.3.0 以前からの変更**: 核種データベースを `POKER_MCP_HOME/data/` へ
> コピーする方式を廃止しました。コピーは「存在すればスキップ」だったため、
> POKER を更新しても古い核データを読み続ける問題がありました。
> 旧構成の `POKER_MCP_HOME/data/ICRP-07.NDX` が残っていても害はありませんが、
> 削除して構いません（LIB が参照できない場合のみ警告付きで使用されます）。

### 設定確認

```powershell
# 環境変数の確認
$env:POKER_MCP_HOME
$env:POKER_INSTALL_PATH

# 参照先ファイルの存在確認
Test-Path "$env:POKER_INSTALL_PATH\LIB\ICRP-07.NDX"
Test-Path "$env:POKER_INSTALL_PATH\LIB\lib_material.dat"
Test-Path "$env:POKER_INSTALL_PATH\POKER_CUI.exe"
```

なお `claude_desktop_config.json` の `env` で指定した値は、その MCP サーバ
プロセスにのみ適用されます。PowerShell 側の環境変数とは別物である点に
注意してください。設定を確かめる最も確実な方法は、後述の起動ログ確認です。

---

## 🔍 動作確認

外部からの疎通監視はできないため、以下の手段で健全性を確認します。

### 1. 起動ログの確認

`POKER_MCP_HOME/logs/combined.log` に初期化の記録が残ります。
核種データベースの参照先はここで判定できます。

```
核種データベースを確認しました
  file: C:\Poker\LIB\ICRP-07.NDX
  source: POKER_INSTALL_PATH/LIB
```

`旧構成のコピーを使用します` という警告が出る場合は、
`POKER_INSTALL_PATH` の設定が実際のインストール先と食い違っています。

### 2. サーバ単体の起動確認

Claude Desktop を介さずに起動できるか試します。stdio 待受のため
何も出力されなければ正常です（Ctrl+C で終了）。

```powershell
cd C:\path\to\poker_mcp
$env:POKER_MCP_HOME="C:/Users/<username>/poker_mcp_workspace"
$env:POKER_INSTALL_PATH="C:/Poker"
node src/mcp_server_stdio_v4.js
```

エラーが出る場合は stderr に表示されます。

### 3. ツール定義の整合検証

マニフェストと実行時のツール定義が乖離していないか検証します。
改修後は必ず実行してください。

```powershell
npm run check:manifest
# → OK: マニフェストと実行時ツール定義は同期しています (30 tools)
```

### 4. 子孫核種機能の動作確認

核種データベースが正しく読めているかは、この操作で判定できます。

```
poker_proposeSource(name="Test", type="POINT", position="0 0 0",
                    inventory=[{nuclide:"Cs137", radioactivity:1e12}])
```

応答に `子孫核種を自動生成: Ba137m=9.4399e+11Bq(←Cs137)` が含まれれば
正常です。含まれない場合は `POKER_INSTALL_PATH` を確認してください。
確認後は `poker_deleteSource(name="Test")` で削除します。

### 5. Claude Desktop 側での確認

ツール一覧に 30 個のツールが表示されることを確認します。
表示されない場合は Claude Desktop のログ（`%APPDATA%\Claude\logs\`）に
MCP サーバの起動失敗が記録されています。

> **注意**: 以前の版の本ガイドには、応答時間を乱数で生成して「正常」と
> 出力する監視スクリプトが掲載されていました。実際には MCP サーバへ
> アクセスしておらず、サーバ停止中でも正常と報告されるため削除しました。

---

## 💾 バックアップ運用

### 自動バックアップ

`poker_applyChanges` の実行時に、適用前の `poker.yaml` が自動保存されます。

```
POKER_MCP_HOME/backups/poker.yaml-2026-08-09T18-34-08-955Z
```

- 命名は `poker.yaml-<ISO8601タイムスタンプ>`（コロンをハイフンに置換）
- **最大10世代**を保持し、超過分は古いものから自動削除されます
- `poker_resetYaml` の実行時にもバックアップが作成されます

`backup_comment` 引数を指定すると、何の変更前かを記録できます。
長期作業では習慣づけると復旧時に役立ちます。

```
poker_applyChanges(backup_comment="キャスク線源分割を12x6x20に変更する前")
```

### 手動バックアップ

10世代を超えて保全したい状態（発表用モデル、検証済みモデル）は
別名で退避してください。自動削除の対象外になります。

```powershell
$ws = "C:\Users\<username>\poker_mcp_workspace"
Copy-Item "$ws\tasks\poker.yaml" "$ws\tasks\cask_model_verified.yaml"
```

計算結果（`.summary` / `.dose`）は入力と同じ `tasks/` に出力されるため、
モデルと結果をまとめて保全する場合はディレクトリごと圧縮します。

```powershell
Compress-Archive -Path "$ws\tasks\*" -DestinationPath "$ws\archive_$(Get-Date -f yyyyMMdd).zip"
```

### ログ

| ファイル | 内容 |
|---|---|
| `logs/combined.log` | 全ログ（初期化・各操作・警告） |
| `logs/error.log` | エラーのみ |

ローテーションは行われないため、長期運用では肥大化します。
`combined.log` が数百MBに達したら、サーバ停止中に削除または退避してください。

---

## 🛡️ 障害切り分け

### サーバが起動しない（ツール一覧に現れない）

1. `%APPDATA%\Claude\logs\` の MCP 関連ログで起動失敗の理由を確認
2. `claude_desktop_config.json` の JSON 構文を検証（末尾カンマ等）
3. コマンドで直接起動し、stderr のエラーを確認（前掲「動作確認2」）
4. `cwd` を指定していないか確認（指定すると失敗する場合があります）

### 計算が失敗する

| 症状 | 確認事項 |
|---|---|
| POKER_CUI が見つからない | `POKER_INSTALL_PATH` の設定 |
| 未知のノードで拒否される | POKER の版数（v1.4.0 は 2.1.0 以上が必要） |
| 応答が返らない | 検出器の評価点数と線源分割数の積が過大でないか |

計算時間は概ね「線源分割数 × 検出器評価点数」に比例します。
2D マップ（169点）と1440分割の線源で約50秒が目安です。

### POKER GUI が別の入力に切り替わらない

挙動は POKER の版数で異なります。

| POKER の版数 | 起動中に別の入力を指定した場合 |
|---|---|
| **2.1.1 以降** | 既存ウィンドウに転送され、表示が切り替わる |
| 2.1.0 以前 | 二重起動できず `POKER_ALREADY_RUNNING` を返す |

2.1.1 以降では、2つ目のプロセスが名前付きパイプで入力パスを既存
インスタンスへ送って終了します。POKER を閉じずに切り替えられます。

**未保存の編集があるときは POKER 側で保存確認が出ます。**
キャンセルすると切り替わらず、編集内容はそのまま保持されます。
`poker_openGui` は転送の送信までしか確認できないため、
応答が成功でも切り替わっていない場合があります。

2.1.0 以前を使用している場合は、先に POKER ウィンドウを閉じてください。

### `executeCalculation` と GUI の同時実行

同時実行の可否は未検証です。GUI を開いたまま計算する運用は避け、
必要なら GUI を閉じてください。

### 子孫核種が生成されない

1. 起動ログで核種データベースの参照先を確認
2. `poker_confirmDaughterNuclides(action="check")` で除外設定を確認
3. 平衡が成立しない組み合わせは意図的に生成されません（警告が出ます）

詳細は [DAUGHTER_NUCLIDE_MANAGEMENT.md](../DAUGHTER_NUCLIDE_MANAGEMENT.md)。

### 入力ファイルが壊れた

```powershell
$ws = "C:\Users\<username>\poker_mcp_workspace"
Get-ChildItem "$ws\backups" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
Copy-Item "$ws\backups\poker.yaml-<timestamp>" "$ws\tasks\poker.yaml" -Force
```

復元後は Claude Desktop を再起動してください。
`tasks/pending_changes.json` に未適用の変更が残っている場合は、
復元した YAML と不整合になるため削除します。

---

## 🔒 セキュリティ上の注意

本サーバはローカルの stdio プロセスであり、ネットワークポートを開きません。
そのため外部からの攻撃面は限定的ですが、以下に留意してください。

- **ファイル書き込み範囲**: `POKER_MCP_HOME` 配下のみです。
  同ディレクトリを共有領域に置く場合は書き込み権限を制限してください
- **POKER_INSTALL_PATH は読み取りのみ**: 核データ・材料カタログを
  読むだけで、書き換えは行いません。POKER 本体側は読み取り専用で構いません
- **外部プロセス起動**: `executeCalculation` と `openGui` が
  `POKER_INSTALL_PATH` 配下の実行ファイルを起動します。この環境変数を
  信頼できない値に設定しないでください
- **入力 YAML の出所**: 第三者から受け取った YAML を読み込む際は、
  参照先ファイルパスが意図しない場所を指していないか確認してください

---

## 📋 保守チェックリスト

### 更新時

- [ ] `npm run check:manifest` が OK
- [ ] `node tools/test_daughter_reconcile.mjs` が全項目 PASS
- [ ] `package.json` と `config/mcp-manifest.json` の版数が一致
- [ ] CHANGELOG に変更内容を記載
- [ ] Claude Desktop を再起動し、ツール一覧に30個表示されることを確認

### 定期（月次程度）

- [ ] `logs/combined.log` のサイズ確認、必要なら退避
- [ ] `backups/` に保全すべき状態が埋もれていないか確認
- [ ] POKER 本体を更新した場合、起動ログで核データの参照先を再確認

---

**Poker MCP Server v1.4.0** | 作者: Yoshihiro Hirao | ライセンス: ISC
