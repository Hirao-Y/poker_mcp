# 🔧 ADMIN_GUIDE.md - システム管理者ガイド

**バージョン**: 1.10.0（ツール数は既定 36。条件により 35〜39。「ツール数」の節を参照）
**想定環境**: Windows + Claude Desktop（stdio 通信）
**最終更新**: 2026年10月

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
      "args": ["-y", "poker-mcp@1.9.9"],
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

> **npm 版は 1.9.9 以上を使ってください。** 1.9.8 までの npm パッケージには
> `tools/gen_input.py` と `tools/scatter.py` が含まれておらず、`poker_generateInput` が
> `No module named 'gen_input'` で失敗していました（リポジトリから動かす場合は問題ありません）。
> 非同期ジョブと `POKER_MCP_GUI` は v1.10.0 の機能で、npm にはまだ公開していません。
> 使う場合は方法B（ローカルリポジトリ）で起動してください。

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
  ├── jobs/       # 非同期ジョブ（POKER_MCP_ASYNC=1 のときだけ作成）
  └── config.json # ユーザー設定（任意）
```

初回起動時に上記ディレクトリが自動作成されます。`jobs/` は非同期ジョブを
有効にしたときだけ作られます（後述）。

### `POKER_INSTALL_PATH`

POKER 本体のインストール先です。未設定時は `C:/Poker` を使用します。

v1.4.0 以降、この配下を**直接参照**するため実質必須です。

| 参照先 | 用途 | 欠けた場合の影響 |
|---|---|---|
| `LIB/ICRP-07.NDX` | 核種データベース | 子孫核種の自動生成が不可 |
| `LIB/lib_material.dat` | 材料カタログ | 材料名正規化・カタログ密度が不可 |
| `POKER_CUI.exe` | 線量計算 | `executeCalculation` が失敗 |
| `POKER.exe` | GUI 表示 | `poker_openGui` が登録されない（v1.10.0 以降） |

> **v1.3.0 以前からの変更**: 核種データベースを `POKER_MCP_HOME/data/` へ
> コピーする方式を廃止しました。コピーは「存在すればスキップ」だったため、
> POKER を更新しても古い核データを読み続ける問題がありました。
> 旧構成の `POKER_MCP_HOME/data/ICRP-07.NDX` が残っていても害はありませんが、
> 削除して構いません（LIB が参照できない場合のみ警告付きで使用されます）。

### 非同期ジョブ: `POKER_MCP_ASYNC` ほか（v1.10.0）

計算を「投入 → 状態確認 → 結果取得」に分けて実行する機能です。**既定では無効**で、
設定しなければツール一覧も動作も v1.9.9 と同じです。

| 変数 | 既定 | 内容 |
|---|---|---|
| `POKER_MCP_ASYNC` | 無効 | `1`（`true` / `yes` / `on` も可）で有効 |
| `POKER_MCP_ASYNC_CONCURRENCY` | 1 | 同時に実行する計算の数 |
| `POKER_MCP_JOB_RETENTION_DAYS` | 7 | 終わったジョブを残す日数 |
| `POKER_MCP_JOB_TIMEOUT_MIN` | 1440 | 1 件の計算の打ち切り時間（分） |

有効にすると `poker_submitCalculation` / `poker_getJobStatus` / `poker_getJobResult` の
3 ツールが加わり、`poker_getDoseMap` に `job_id` 引数が付きます。
同期の `poker_executeCalculation` はそのまま使えます。

1 回のツール呼び出しで長い計算を待つと、MCP クライアントの待ち時間の上限や、
リモート公開時の中継（Cloudflare Tunnel は約 100 秒）で切られることがあります。
投入・確認・取得に分けると、各呼び出しは数秒で終わります。数十秒で終わる計算は
従来どおり `executeCalculation` で構いません。

同時実行数の既定が 1 なのは、`POKER_CUI` が OpenMP で全スレッドを使うためです。
2 件目以降は待ち行列に並びます（`POKER_CUI` 自体は二重起動でき、同時に 2 件
実行しても結果が変わらないことは確認済みです）。

#### ジョブフォルダ

ジョブは `POKER_MCP_HOME/jobs/<ジョブID>/` に置かれます。ジョブ ID は
`20261013-053012-a1b2c3` の形（UTC の投入日時＋乱数）で、並べると投入順になります。

```
POKER_MCP_HOME/jobs/<ジョブID>/
  ├── job.json        # 状態（queued / running / succeeded / failed）
  ├── <YAML名>        # 投入時点の入力 YAML のコピー
  ├── <.paths のコピー>  # path_input を指定した場合
  ├── <YAML名>.summary  # 出力（名前は output_files で変更可）
  ├── <YAML名>.dose
  ├── stdout.txt
  └── stderr.txt
```

- 入力は投入した時点の YAML と `.paths` をコピーし、SHA-256 を記録します。
  未適用の変更（`pending_changes.json`）は含まれません
- 出力はジョブフォルダに書かれ、`tasks/` の `poker.yaml.summary` 等は上書きされません
- **自動削除**: 終わったジョブ（succeeded / failed）は、終了から
  `POKER_MCP_JOB_RETENTION_DAYS` 日を過ぎるとフォルダごと削除されます。
  判定はサーバ起動時と各ジョブの終了時に行われます。残したい結果は別の場所へ
  コピーしてください
- **再起動したとき**: 状態は `job.json` に保存されているため消えません。
  実行中だったジョブは計算プロセスが失われるため `failed`
  （`INTERRUPTED_BY_RESTART`）になり、投入し直す必要があります。
  待機中だったジョブは再び並び、順に実行されます

Claude Desktop を終了するとサーバも終了するため、実行中のジョブは上記のとおり
失敗扱いになります。長い計算の途中で Claude Desktop を再起動しないでください。

### GUI ツールの登録: `POKER_MCP_GUI`（v1.10.0）

`poker_openGui` は、MCP サーバが動いている機械の画面に POKER.exe を開きます。
次のどれかに当たるときは、ツール一覧から外し、処理も登録しません
（名前で直接呼ばれても実行しません）。

- `POKER_MCP_GUI` が `0` / `false` / `no` / `off`
- Windows 以外で動いている
- `POKER_INSTALL_PATH`（既定 `C:/Poker`）に `POKER.exe` が無い

手元の Windows に POKER を入れた普段の環境では、設定しなくても従来どおり登録されます。
判定は起動時に 1 回だけなので、後から POKER を入れた場合はサーバ（Claude Desktop）を
再起動してください。POKER.exe を使うのは `poker_openGui` だけで、計算・検証・
CAD 連携・非同期ジョブは `POKER_CUI.exe`（と FreeCAD）を使うため影響しません。

### ツール数

| 条件 | ツール数 |
|---|---|
| 既定（Windows で POKER.exe あり） | 36 |
| 既定で GUI が外れる場合 | 35 |
| 非同期ジョブ有効 | 39 |
| 非同期ジョブ有効・GUI が外れる場合 | 38 |

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

`poker_openGui` を登録したかどうかと、その理由も起動時に記録されます（v1.10.0）。

```
poker_openGui: 有効（POKER.exe: C:\Poker\POKER.exe）
poker_openGui: 無効（POKER_MCP_GUI=0 により無効）
poker_openGui: 無効（POKER.exe が見つからないため無効: C:\Poker\POKER.exe）
```

非同期ジョブを有効にした場合は `JobManager 初期化` の行に、ジョブフォルダ・
既存ジョブ数・再び並べたジョブ数（requeued）・同時実行数・保存日数が出ます。

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
# → 既定 / 非同期ジョブ有効 / 非同期ジョブ有効・GUI 無効 の 3 通りを照合
# OK: マニフェストと実行時ツール定義は同期しています (36 tools, 既定)
# OK: マニフェストと実行時ツール定義は同期しています (39 tools, 非同期ジョブ有効)
# [INFO] 条件付きのため未登録: poker_openGui
# OK: マニフェストと実行時ツール定義は同期しています (38 tools, 非同期ジョブ有効・GUI 無効)
```

POKER.exe が無い環境（Windows 以外を含む）では `poker_openGui` が条件付きで
未登録となり、`[INFO] 条件付きのため未登録: poker_openGui` の後に 35 / 38 / 38 と
表示されます。これも正常です。

非同期ジョブと GUI スイッチは専用の試験で確かめます。どちらも失敗があれば
終了コード 1 で終わります。

```powershell
npm run test:jobs   # 非同期ジョブ（同期計算と .summary / .dose / 線量マップが一致するか等）
npm run test:gui    # POKER_MCP_GUI による poker_openGui の登録・非登録
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

ツール一覧に 36個のツールが表示されることを確認します（既定の場合。
非同期ジョブ有効なら 39 個、`poker_openGui` が外れる環境ではそれぞれ 1 個少なくなります）。
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
（非同期ジョブの結果は `jobs/<ジョブID>/` にあり、保存日数を過ぎると自動削除されます。
残す場合はジョブフォルダごと退避してください。）

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
| 長い計算が途中で切れる | クライアントや中継の待ち時間の上限。非同期ジョブ（`POKER_MCP_ASYNC=1`）を検討 |
| ジョブが `INTERRUPTED_BY_RESTART` で失敗 | 実行中にサーバが再起動した。投入し直す |

計算時間は概ね「線源分割数 × 検出器評価点数」に比例します。
2D マップ（169点）と1440分割の線源で約50秒が目安です。

v1.9.9 以降、ツールが処理の結果として返した失敗（`success: false`）は、MCP の `isError: true` として
クライアントに伝わります（引数の形式などで処理前に例外になった場合は JSON-RPC エラー）。
v1.9.8 までは、計算エラーの処理自体が落ちて
`Cannot read properties of undefined (reading '_isRecoverableError')` という
メッセージに本来のエラーが隠れることがありました。この表示が出る場合は版を
確認してください。

### `poker_openGui` がツール一覧に無い

v1.10.0 以降は、GUI が使えない環境では `poker_openGui` を登録しません。
起動ログの `poker_openGui: 無効（理由）` を確認してください。
POKER.exe の場所が理由なら `POKER_INSTALL_PATH` を直し、後から POKER を
入れた場合はサーバを再起動します。`POKER_MCP_GUI=0` を設定している場合は意図どおりです。

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
- **外部プロセス起動**: `executeCalculation`（非同期ジョブを含む）と `openGui` が
  `POKER_INSTALL_PATH` 配下の実行ファイルを起動します。この環境変数を
  信頼できない値に設定しないでください
- **入力 YAML の出所**: 第三者から受け取った YAML を読み込む際は、
  参照先ファイルパスが意図しない場所を指していないか確認してください

---

## 🌐 リモート公開するサーバの設定（v1.10.0）

本サーバ自体は stdio でのみ通信します。HTTP（Streamable HTTP）の入口は
まだ実装されていません。ここでは、将来リモート公開したサーバで使うことを
想定して、その場合に向けた環境変数の設定を示します。

```json
"env": {
  "POKER_MCP_HOME": "C:\\poker_mcp_workspace",
  "POKER_INSTALL_PATH": "C:/Poker",
  "POKER_MCP_ASYNC": "1",
  "POKER_MCP_GUI": "0"
}
```

- **`POKER_MCP_ASYNC=1`**: 中継（Cloudflare Tunnel は約 100 秒）やクライアントの
  待ち時間の上限で長い計算が切られないよう、投入・確認・取得に分けます
- **`POKER_MCP_GUI=0`**: サーバに POKER が入っていても、GUI はサーバの画面に開き、
  利用者からは見えません。ツール一覧から `poker_openGui` を外します
- この設定でのツール数は 38 です（`npm run check:manifest` の 3 通り目に相当）
- 終わったジョブの保存日数（`POKER_MCP_JOB_RETENTION_DAYS`）と `jobs/` の
  ディスク使用量を、利用状況に合わせて見直してください

---

## 📋 保守チェックリスト

### 更新時

- [ ] `npm run check:manifest` が 3 通り（既定 / 非同期有効 / 非同期有効・GUI 無効）とも OK
- [ ] `npm run test:jobs` と `npm run test:gui` が終了コード 0
- [ ] `node tools/test_daughter_reconcile.mjs` が全項目 PASS
- [ ] `package.json` と `config/mcp-manifest.json` の版数が一致
- [ ] CHANGELOG に変更内容を記載
- [ ] Claude Desktop を再起動し、ツール一覧の数が条件どおりか確認
      （既定 36、非同期有効 39、`poker_openGui` が外れる環境ではそれぞれ 35 / 38）
- [ ] 起動ログの `poker_openGui: 有効／無効（理由）` が意図どおりか確認

### 定期（月次程度）

- [ ] `logs/combined.log` のサイズ確認、必要なら退避
- [ ] 非同期ジョブを使っている場合、`jobs/` のサイズと残したい結果の退避を確認
- [ ] `backups/` に保全すべき状態が埋もれていないか確認
- [ ] POKER 本体を更新した場合、起動ログで核データの参照先を再確認

---

**Poker MCP Server v1.10.0** | 作者: Yoshihiro Hirao | ライセンス: MIT
