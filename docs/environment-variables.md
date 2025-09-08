# Poker MCP 環境変数設定ガイド

## 概要
Poker MCPサーバーは環境変数を使用してカスタム作業ディレクトリとファイルパスを設定できます。これにより、プロジェクト別の作業環境や任意のディレクトリでのファイル管理が可能になります。

## 対応環境変数

### 必須環境変数
- `POKER_WORK_DIR`: 作業ディレクトリのベースパス（デフォルト: `./`）

### オプション環境変数
- `POKER_TASKS_DIR`: タスクディレクトリ名（デフォルト: `tasks`）
- `POKER_DATA_DIR`: データディレクトリ名（デフォルト: `data`）
- `POKER_YAML_FILE`: メインYAMLファイル名（デフォルト: `poker.yaml`）
- `POKER_PENDING_FILE`: 保留変更ファイル名（デフォルト: `pending_changes.json`）
- `POKER_NUCLIDE_FILE`: 核種データベースファイル名（デフォルト: `ICRP-07.NDX`）
- `POKER_BACKUP_DIR`: バックアップディレクトリ名（デフォルト: `backups`）
- `POKER_LOGS_DIR`: ログディレクトリ名（デフォルト: `logs`）

## Claude MCP設定例

### 基本設定
```json
{
  "name": "poker-mcp",
  "server": {
    "command": "node",
    "args": ["src/mcp_server_stdio_v4.js"],
    "env": {
      "POKER_WORK_DIR": "C:\\MyPokerProjects"
    }
  }
}
```

### 詳細設定
```json
{
  "name": "poker-mcp",
  "server": {
    "command": "node", 
    "args": ["src/mcp_server_stdio_v4.js"],
    "env": {
      "POKER_WORK_DIR": "C:\\Users\\MyName\\Documents\\PokerWork",
      "POKER_YAML_FILE": "reactor_shielding.yaml",
      "POKER_PENDING_FILE": "reactor_pending.json",
      "POKER_BACKUP_DIR": "reactor_backups",
      "POKER_LOGS_DIR": "reactor_logs"
    }
  }
}
```

## パス解決の仕組み

1. **作業ディレクトリ**: `POKER_WORK_DIR`を基準として設定
2. **タスクディレクトリ**: `POKER_WORK_DIR/POKER_TASKS_DIR`として解決
3. **データディレクトリ**: `POKER_WORK_DIR/POKER_DATA_DIR`として解決
4. **ファイルパス**: 各ディレクトリ内にファイルを配置

例:
- `POKER_WORK_DIR = "C:\\MyProject"`
- `POKER_TASKS_DIR = "config"`
- `POKER_DATA_DIR = "nuclear_data"`
- `POKER_YAML_FILE = "reactor.yaml"`
- `POKER_NUCLIDE_FILE = "custom_icrp.ndx"`

最終パス:
- YAML: `C:\\MyProject\\config\\reactor.yaml`
- 核種DB: `C:\\MyProject\\nuclear_data\\custom_icrp.ndx`

## 標準ディレクトリ構造

Poker MCPは以下の標準ディレクトリ構造を使用します：

```
${POKER_WORK_DIR}/
├── tasks/              # YAMLファイル、保留変更ファイル
│   ├── poker.yaml
│   └── pending_changes.json
├── data/               # 核種データベース
│   └── ICRP-07.NDX
├── backups/            # バックアップファイル
│   └── poker.yaml-2025-09-08T10-30-00-000Z
├── logs/               # ログファイル
└── output/             # 計算結果（将来の拡張用）
```

各ディレクトリは環境変数でカスタマイズ可能です。

## 使用例

### プロジェクト1: 原子炉遮蔽計算
```json
"env": {
  "POKER_WORK_DIR": "C:\\Projects\\Reactor",
  "POKER_TASKS_DIR": "input_files",
  "POKER_DATA_DIR": "nuclear_data",
  "POKER_YAML_FILE": "reactor.yaml",
  "POKER_NUCLIDE_FILE": "reactor_nuclides.ndx"
}
```

### プロジェクト2: 医療施設計算
```json
"env": {
  "POKER_WORK_DIR": "C:\\Projects\\Medical",
  "POKER_TASKS_DIR": "configs",
  "POKER_DATA_DIR": "medical_data", 
  "POKER_YAML_FILE": "medical_facility.yaml",
  "POKER_NUCLIDE_FILE": "medical_isotopes.ndx"
}
```

### プロジェクト3: 共有データベース使用
```json
"env": {
  "POKER_WORK_DIR": "C:\\MyProject",
  "POKER_DATA_DIR": "..\\..\\SharedData\\NuclideDB",
  "POKER_NUCLIDE_FILE": "ICRP-107_v2.ndx"
}
```

## 注意事項

1. **パス形式**: Windowsでは`\\`、Unix系では`/`を使用
2. **権限**: 指定ディレクトリに読み書き権限が必要
3. **自動作成**: 存在しないディレクトリは自動作成されます
4. **バックアップ**: 既存の`.mcp.json`をバックアップしてから変更してください

## トラブルシューティング

### よくあるエラー
- **WORK_DIRECTORY_ACCESS**: 作業ディレクトリにアクセスできない
  - 解決方法: パスの確認、権限の確認
- **INITIALIZATION**: 初期化に失敗
  - 解決方法: ディスク容量の確認、パス形式の確認

### ログ確認
サーバー起動時にログで設定値が確認できます：
```
Poker MCP Server 起動 {
  workDir: "C:\\MyProject",
  yamlFile: "C:\\MyProject\\config.yaml",
  environmentVariables: { ... }
}
```
