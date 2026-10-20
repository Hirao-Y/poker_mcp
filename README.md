# POKER-MCP

点減衰核法の光子遮蔽計算コード **POKER** を、Claude などの AI アプリから使えるようにする
MCP（Model Context Protocol）サーバです。

*An MCP server that lets AI applications build, validate and run inputs for POKER, a point-kernel
photon shielding code, and read back the computed doses.*

- AI アプリへの自然言語の指示から、POKER の入力（YAML）を作成・編集・検証し、計算を実行して線量を返します
- 線量はすべて POKER の出力ファイル（`.summary`・`.dose`）から抽出します。AI が数値を作ることはありません
- FreeCAD のモデルから入力を生成し、CAD 形状の上で透視線を追跡して計算できます（CAD 連携）

| | |
|---|---|
| 最新版 | 1.11.0（npm の最新は 1.10.0） |
| ツール数 | 36（非同期ジョブを有効にすると 39） |
| 通信 | 標準入出力（`poker-mcp`）、HTTP（`poker-mcp-http`） |
| 変更履歴 | [CHANGELOG.md](CHANGELOG.md) |

## 必要なもの

| | 入手先 | 備考 |
|---|---|---|
| POKER 本体 | [pointkernel.com](https://pointkernel.com)（v2.1.5 以降） | Windows。フォーム登録でダウンロードリンクが届く |
| Node.js | 18 以降 | |
| MCP クライアント | Claude Desktop など | HTTP 版は Claude Code、または Claude Desktop + `mcp-remote` |
| FreeCAD | [freecad.org](https://www.freecad.org/)（1.0 以降） | CAD 連携を使う場合だけ |

## セットアップ（Claude Desktop）

設定ファイル（Windows では `%APPDATA%\Claude\claude_desktop_config.json`）に追記し、
Claude Desktop を再起動します。

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

- `cwd` は指定しないでください。作業場所は `POKER_MCP_HOME` で決まります
- 版を固定するときは `"args": ["poker-mcp@1.10.0"]` のように書きます

動作確認として、Claude に次のように頼んでみてください。

```
厚さ 30 cm のコンクリート壁の向こう 1 m の位置で、Co-60 点線源 1 GBq による線量を計算してください
```

### 主な環境変数

| 変数 | 既定 | 内容 |
|---|---|---|
| `POKER_MCP_HOME` | `~/.poker-mcp` | 作業ファイル（YAML、バックアップ、ログ）の置き場所 |
| `POKER_INSTALL_PATH` | `C:/Poker` | POKER のインストール先（核種データ、`POKER.exe`） |
| `FREECAD_PATH` | 自動探索 | FreeCAD の場所（CAD 連携） |
| `POKER_MCP_ASYNC` | 無効 | `1` で計算の非同期実行を有効にする |
| `POKER_MCP_GUI` | 有効 | `0` で `poker_openGui` を外す（リモート公開時） |

HTTP 版（別の機械から使う）の設定と、非同期実行・リモート公開の詳細は
[ADMIN_GUIDE](docs/manuals/ADMIN_GUIDE.md)（サーバ側）と
[INTEGRATION_GUIDE](docs/manuals/INTEGRATION_GUIDE.md)（クライアント側）を参照してください。

## 使い方

Claude に自然言語で指示すると、必要なツールが呼ばれます。

```
「幅 100 cm、高さ 200 cm、厚さ 30 cm のコンクリート遮蔽壁を作ってください」
「Cs-137 線源 1 TBq を原点に置いてください」        → Ba-137m は自動で追加
「壁から 120 cm の位置に 2 次元の検出器グリッドを置いてください」
「計算して、線量分布を見せてください」
```

編集は「提案」としていったん保留され、`poker_applyChanges` でまとめて確定します（自動バックアップ付き）。
入力はスキーマ・要求内容・ファイル生成の各段階で検証され、材料名は POKER のライブラリの正式名に限られます。

### CAD 連携

FreeCAD のソリッドに材質（`PokerMaterial`）や線源・検出器をカスタムプロパティで設定しておけば、
3 回の呼び出しで計算まで進みます。CSG で表せない形状（曲がった配管、フィレットなど）も扱えます。

```javascript
poker_generateInput({ fcstd: "C:/path/to/model.FCStd" })    // 属性から YAML を生成
poker_generatePaths({ fcstd: "C:/path/to/model.FCStd" })    // 透視線を追跡して .paths を生成
poker_executeCalculation({ yaml_file: "poker.yaml", path_input: "poker.paths" })
```

手順と実例は [CAD_QUICKSTART](docs/manuals/CAD_QUICKSTART.md)、詳細は
[CAD_RAYTRACE](docs/manuals/CAD_RAYTRACE.md)、経路ファイルの書式は
[PATHS_FORMAT](docs/manuals/PATHS_FORMAT.md) を参照してください。

## ツール一覧

| 分類 | ツール |
|---|---|
| 立体 | `poker_proposeBody` `poker_updateBody` `poker_deleteBody` |
| 材料ゾーン | `poker_proposeZone` `poker_updateZone` `poker_deleteZone` |
| 座標変換 | `poker_proposeTransform` `poker_updateTransform` `poker_deleteTransform` |
| ビルドアップ係数 | `poker_proposeBuildupFactor` `poker_updateBuildupFactor` `poker_deleteBuildupFactor` `poker_changeOrderBuildupFactor` |
| 線源 | `poker_proposeSource` `poker_updateSource` `poker_deleteSource` `poker_confirmDaughterNuclides` |
| 検出器 | `poker_proposeDetector` `poker_updateDetector` `poker_deleteDetector` |
| 単位 | `poker_proposeUnit` `poker_getUnit` `poker_updateUnit` `poker_validateUnitIntegrity` `poker_analyzeUnitConversion` |
| サマリー出力量 | `poker_proposeThinnedIndices` `poker_getThinnedIndices` `poker_updateThinnedIndices` |
| 確定・計算・結果 | `poker_applyChanges` `poker_resetYaml` `poker_executeCalculation` `poker_getDoseMap` `poker_getSchema` `poker_openGui` |
| CAD 連携 | `poker_generateInput` `poker_generatePaths` |
| 非同期実行（`POKER_MCP_ASYNC=1` のとき） | `poker_submitCalculation` `poker_getJobStatus` `poker_getJobResult` |

各ツールの引数と戻り値は [API_COMPLETE](docs/manuals/API_COMPLETE.md) にあります。

## 現状の制約

POKER 本体は次の指定に対応していますが、POKER-MCP にはまだ対応するツールがありません（今後対応する予定です）。

- 線源のエネルギースペクトルによる指定（ツールでは核種と放射能で指定します）
- 多重層（2 層・3 層）のビルドアップ係数の指定（ツールでは単層の材料で指定します）

必要な場合は YAML を直接編集してください。AI アプリが `poker_getSchema` で書式を読み、
YAML を直接書き換えることもありますが、その部分は POKER-MCP のツールによる検証を受けず、
計算時の `poker_cui` による検証だけになります。

任意組成のカスタム材料は、`lib_material.dat` に登録したものだけ使えます（[MATERIAL_SYSTEM](docs/manuals/MATERIAL_SYSTEM.md)）。

## ドキュメント

| 文書 | 内容 |
|---|---|
| [docs/manuals/](docs/manuals/) | マニュアル一式（基本ガイド、API、CAD 連携、運用、トラブルシューティング） |
| [docs/interactive_guides/](docs/interactive_guides/) | 段階別の学習ガイド |
| [CHANGELOG.md](CHANGELOG.md) | 版ごとの変更内容 |

## 開発者向け

```bash
git clone https://github.com/Hirao-Y/poker_mcp.git
cd poker_mcp
npm install
```

| コマンド | 内容 |
|---|---|
| `npm run check:manifest` | ツール定義とマニフェストの整合（POKER 本体は不要） |
| `npm run test:http` | HTTP 版。ツール一覧・計算結果が stdio 版と同一であること |
| `npm run test:jobs` | 非同期ジョブ。同期実行との全行一致 |
| `npm run test:schema` | `poker_getSchema` と `.dose` の読み取り |
| `npm run test:cad-full` など | CAD 連携（FreeCAD が必要） |

`check:manifest` 以外は POKER 本体が必要です。不具合の報告は
[GitHub Issues](https://github.com/Hirao-Y/poker_mcp/issues) へお願いします。

## ライセンス

MIT License（[LICENSE](LICENSE)）。対象は本リポジトリの内容だけです。POKER 本体と FreeCAD は
別途入手し、それぞれの利用条件に従ってください。poker-mcp は `poker_cui` を外部プロセスとして
起動するだけなので、POKER 本体の利用条件には影響しません。

Copyright (c) 2025-2026 Yoshihiro Hirao
