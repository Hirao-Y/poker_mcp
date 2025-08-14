<<<<<<< HEAD
# poker-mcp
mcp server for poker app
=======
# YAML4Task MCP

YAMLファイルをベースにしたシンプルなタスク管理システム。MCPプロトコル（Model Context Protocol）を使用して、AIアシスタントからのタスク管理を可能にします。

## 特徴

- YAML形式でタスクを管理
- サブタスクの提案と適用
- タスクステータスの更新
- Mermaid形式でのガントチャート生成
- Cursor/VSCodeなどのMCP対応エディタと連携可能

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/sososha/yaml4task_mcp.git
cd yaml4task_mcp

# 依存関係のインストール
npm install

# 環境のセットアップ
node setup.js
```

## 使い方

### サーバーの起動

```bash
node mcp_server.js
```

サーバーは http://localhost:3000 で起動します。

### Cursorエディタでの設定

1. `.cursor/mcp.json` ファイルに以下を追加します：

```json
{
  "mcpServers": {
    "yaml4task": {
      "command": "node",
      "args": [
        "パス/mcp_server.js"
      ],
      "cwd": "パス/yaml4task_mcp"
    }
  }
}
```

2. Cursorを再起動して、MCPツールとして利用できます。

### APIエンドポイント

- `http://localhost:3000/mcp` - JSON-RPCエンドポイント

### 使用可能なコマンド

- タスク提案: `task.proposeSubtask({ parentId: "T1", title: "サブタスク名", options: { parallel: true, milestone: "2025-03-25" } })`
- 変更適用: `task.applyChanges()`
- ステータス更新: `task.updateStatus({ taskId: "T1", status: "進行中" })`
- ガントチャート生成: `task.generateGantt()`

## タスクデータの形式

タスクは以下のような階層構造を持ちます：

```yaml
tasks:
  - status: 未開始
    id: T1
    title: タスク1
    subtasks:
      - status: 進行中
        id: T1-1
        title: サブタスク1
        subtasks: []
attributes:
  T1:
    depends_on: null
    parallel: false
    loop: false
    design: 基盤構築
    milestone: '2025-03-20'
  T1-1:
    depends_on: null
    parallel: false
    loop: false
    design: ''
    milestone: null
```

## 制約事項

- 完了済みのタスクにはサブタスクを追加できません
- タスクのステータスは「未開始」「進行中」「完了」のいずれかである必要があります

## ガントチャート

生成されたガントチャートは `tasks/gantt.mmd` に保存されます。Mermaid Live Editorで表示できます。

## ライセンス

MIT

## 開発者

sososha 
>>>>>>> 2941f67 (first commit)
