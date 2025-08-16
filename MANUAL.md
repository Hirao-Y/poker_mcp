# poker_mcp サーバーマニュアル

## 概要

poker_mcpは放射線遮蔽計算用のMCP（Model Context Protocol）サーバーです。YAML形式の入力ファイルを管理し、立体形状、材料ゾーン、線源の定義を支援します。

## バージョン情報

- **改善版バージョン**: 2.0.0
- **元バージョン**: 1.0.0
- **ポート**: 3001（改善版）、3000（元版）

## 主要機能

### ✨ 改善版の新機能

1. **構造化されたエラーハンドリング**
2. **非同期データ操作とバックアップ機能**
3. **物理的制約の検証**
4. **モジュール化されたコード構造**
5. **詳細なログ機能**

## インストールと起動

### 前提条件

- Node.js 18以上
- npm

### 依存関係のインストール

```bash
cd poker_mcp
npm install
```

### サーバー起動

```bash
# 改善版サーバー（推奨）
node mcp_server_improved.js

# 元のサーバー
node mcp_server.js
```

### 起動確認

```bash
curl http://localhost:3001
```

## API仕様

### エンドポイント

- **ベースURL**: `http://localhost:3001`
- **MCP エンドポイント**: `/mcp`
- **プロトコル**: JSON-RPC 2.0

### リクエスト形式

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "pokerinput.methodName",
  "params": {
    // パラメータ
  }
}
```

### レスポンス形式

#### 成功時
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "result": "操作結果メッセージ"
  }
}
```

#### エラー時
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "エラーメッセージ",
    "data": {
      "field": "エラーフィールド",
      "value": "エラー値"
    }
  }
}
```
## 利用可能なメソッド

### 1. 立体操作

#### `pokerinput.proposeBody`

新しい立体形状を提案します。

**パラメータ:**
- `name` (string, 必須): 立体名
- `type` (string, 必須): 形状タイプ
- その他の形状固有パラメータ

**サポートされる形状タイプ:**

##### SPH（球体）
```json
{
  "name": "Sphere1",
  "type": "SPH",
  "center": "0 0 0",
  "radius": 10
}
```

##### RCC（円柱）
```json
{
  "name": "Cylinder1", 
  "type": "RCC",
  "bottom_center": "0 0 0",
  "height_vector": "0 0 20",
  "radius": 5
}
```

##### RPP（軸平行直方体）
```json
{
  "name": "Box1",
  "type": "RPP", 
  "min": "-10 -5 0",
  "max": "10 5 15"
}
```

##### BOX（一般直方体）
```json
{
  "name": "GenBox1",
  "type": "BOX",
  "vertex": "0 0 0",
  "edge_1": "10 0 0", 
  "edge_2": "0 5 0",
  "edge_3": "0 0 3"
}
```

##### CMB（組み合わせ形状）
```json
{
  "name": "Combined1",
  "type": "CMB",
  "expression": "Sphere1-Cylinder1"
}
```

**使用例:**

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "pokerinput.proposeBody",
    "params": {
      "name": "Shield", 
      "type": "SPH",
      "center": "0 0 0",
      "radius": 50
    }
  }'
```
#### `pokerinput.deleteBody`

立体を削除します。

**パラメータ:**
- `name` (string, 必須): 削除する立体名

**使用例:**

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "pokerinput.deleteBody",
    "params": {
      "name": "Shield"
    }
  }'
```

### 2. ゾーン操作

#### `pokerinput.proposeZone`

材料ゾーンを提案します。

**パラメータ:**
- `body_name` (string, 必須): 立体名
- `material` (string, 必須): 材料名
- `density` (number, 条件付き必須): 密度 (g/cm³)

**サポートされる材料と密度範囲:**

| 材料 | 密度範囲 (g/cm³) | 説明 |
|------|------------------|------|
| Concrete | 1.8 - 2.5 | 一般的なコンクリート |
| Heavy_concrete_T | 3.5 - 4.2 | 重コンクリート（タングステン系） |
| Iron | 7.6 - 7.9 | 鉄 |
| Lead | 11.0 - 11.4 | 鉛 |
| Water | 0.95 - 1.05 | 水 |
| Air | 0.001 - 0.002 | 空気 |
| VOID | 0 | 真空（密度指定不要） |

**使用例:**

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "pokerinput.proposeZone", 
    "params": {
      "body_name": "Shield",
      "material": "Lead",
      "density": 11.2
    }
  }'
```
#### `pokerinput.deleteZone`

ゾーンを削除します。

**パラメータ:**
- `body_name` (string, 必須): 削除するゾーンの立体名

**使用例:**

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "pokerinput.deleteZone",
    "params": {
      "body_name": "Shield"
    }
  }'
```

### 3. 変更管理

#### `pokerinput.applyChanges`

提案された変更をYAMLファイルに適用します。

**パラメータ:** なし

**使用例:**

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "pokerinput.applyChanges",
    "params": {}
  }'
```

## 実践的な使用例

### シナリオ1: 基本的な遮蔽体の作成

```bash
# 1. 鉛球の作成
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "pokerinput.proposeBody",
    "params": {
      "name": "LeadSphere",
      "type": "SPH", 
      "center": "0 0 0",
      "radius": 30
    }
  }'

# 2. 鉛材料ゾーンの作成
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", 
    "id": 2,
    "method": "pokerinput.proposeZone",
    "params": {
      "body_name": "LeadSphere",
      "material": "Lead",
      "density": 11.3
    }
  }'

# 3. 変更の適用
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3, 
    "method": "pokerinput.applyChanges",
    "params": {}
  }'
```
### シナリオ2: 多層遮蔽体の作成

```bash
# 1. 外層（コンクリート）
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "pokerinput.proposeBody", 
    "params": {
      "name": "OuterShield",
      "type": "SPH",
      "center": "0 0 0", 
      "radius": 100
    }
  }'

# 2. 内層（鉛）
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "pokerinput.proposeBody",
    "params": {
      "name": "InnerShield", 
      "type": "SPH",
      "center": "0 0 0",
      "radius": 50
    }
  }'

# 3. 組み合わせ形状（コンクリート層）
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "pokerinput.proposeBody",
    "params": {
      "name": "ConcreteLayer",
      "type": "CMB", 
      "expression": "OuterShield-InnerShield"
    }
  }'
# 4. 材料ゾーンの定義
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "pokerinput.proposeZone",
    "params": {
      "body_name": "ConcreteLayer",
      "material": "Concrete", 
      "density": 2.3
    }
  }'

curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "pokerinput.proposeZone",
    "params": {
      "body_name": "InnerShield",
      "material": "Lead",
      "density": 11.3
    }
  }'

# 5. 変更の適用
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "pokerinput.applyChanges", 
    "params": {}
  }'
```

## エラーコードとトラブルシューティング

### 一般的なエラーコード

| コード | 説明 | 対処法 |
|--------|------|--------|
| -32600 | 無効なリクエスト | JSON形式を確認 |
| -32601 | 未知のメソッド | メソッド名を確認 |
| -32602 | 無効なパラメータ | 必須パラメータを確認 |
| -32000 | 物理的制約エラー | 密度や形状パラメータを確認 |
| -32001 | データエラー | ファイルの権限やディスク容量を確認 |
| -32603 | サーバー内部エラー | ログファイルを確認 |

### よくあるエラーと対処法

#### エラー: "立体 XXX が存在しません"
```json
{
  "error": {
    "code": -32602,
    "message": "入力値エラー: 立体 TestSphere が存在しません"
  }
}
```

**原因**: ゾーン作成時に参照した立体が未適用または存在しない

**対処法**: 
1. `applyChanges`で立体の変更を適用
2. 立体名のスペルを確認
#### エラー: "密度が物理的範囲を外れています"
```json
{
  "error": {
    "code": -32000, 
    "message": "物理的制約エラー: 材料 Lead の密度 15 は物理的範囲 [11.0, 11.4] g/cm³ を外れています"
  }
}
```

**原因**: 指定した密度が材料の物理的な範囲外

**対処法**: 材料対応表を参照して適切な密度を指定

#### エラー: "ゾーン XXX は既に存在します"
```json
{
  "error": {
    "code": -32602,
    "message": "入力値エラー: ゾーン S1 は既に存在します"
  }
}
```

**原因**: 同じ立体に対して複数のゾーンを作成しようとした

**対処法**: 既存ゾーンを削除してから新しいゾーンを作成

## ファイル構造とログ

### ディレクトリ構造

```
poker_mcp/
├── src/
│   ├── utils/
│   │   ├── logger.js          # ログ機能
│   │   ├── errors.js          # エラー定義
│   │   └── errorHandler.js    # エラーハンドリング
│   ├── services/
│   │   ├── DataManager.js     # データ管理
│   │   └── TaskManager.js     # タスク管理
│   └── validators/
│       └── PhysicsValidator.js # 物理制約検証
├── tasks/
│   ├── pokerinputs.yaml       # メインデータファイル
│   └── pending_changes.json   # 保留中の変更
├── logs/
│   ├── combined.log           # 全ログ
│   └── error.log              # エラーログ
├── backups/                   # 自動バックアップ
├── mcp_server_improved.js     # 改善版サーバー
└── mcp_server.js              # 元のサーバー
```

### ログファイル

#### combined.log
全ての操作ログが記録されます。

```json
{"level":"info","message":"立体を提案しました","name":"Shield","type":"SPH","timestamp":"2025-08-16T11:51:40.934Z"}
{"level":"info","message":"変更を適用しました","timestamp":"2025-08-16T11:51:53.257Z"}
```

#### error.log
エラー情報のみが記録されます。

```json
{"level":"error","message":"ゾーン提案エラー","body_name":"TestSphere","error":"立体 TestSphere が存在しません","timestamp":"2025-08-16T11:51:48.311Z"}
```
### バックアップ機能

変更適用時に自動でバックアップが作成されます。

- **場所**: `backups/` ディレクトリ
- **命名**: `pokerinputs_YYYY-MM-DDTHH-mm-ss-sssZ.yaml`
- **保持数**: 最大10ファイル（古いものは自動削除）

## 設定とカスタマイズ

### 環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|--------------|------|
| LOG_LEVEL | info | ログレベル (debug, info, warn, error) |
| PORT | 3001 | サーバーポート |

### 設定例

```bash
# デバッグレベルでログを出力
LOG_LEVEL=debug node mcp_server_improved.js

# ポート変更
PORT=3002 node mcp_server_improved.js
```

## 開発者向け情報

### コード拡張

新しい形状タイプを追加する場合:

1. `PhysicsValidator.js`に形状定義を追加
2. `TaskManager.js`の`createBodyObject`メソッドを更新
3. バリデーション関数を実装

### テスト

基本的な動作テストスクリプト:

```bash
#!/bin/bash
# test_basic.sh

echo "基本機能テスト開始..."

# 立体作成テスト
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"pokerinput.proposeBody","params":{"name":"TestSphere","type":"SPH","center":"0 0 0","radius":10}}'

echo -e "\n"

# ゾーン作成テスト
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"pokerinput.proposeZone","params":{"body_name":"TestSphere","material":"Iron","density":7.8}}'

echo -e "\n"

# 変更適用テスト  
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"pokerinput.applyChanges","params":{}}'

echo -e "\n基本機能テスト完了"
```

## サポートと連絡先

### 技術サポート

- **ログファイル**: `logs/combined.log`、`logs/error.log`を確認
- **バックアップ**: 問題発生時は`backups/`から復旧可能
- **デバッグ**: `LOG_LEVEL=debug`でより詳細なログを出力

### 既知の制限事項

1. 同時実行安全性は保証されていません
2. 大きなファイル（1MB以上）での性能問題の可能性
3. Windows環境での一部パス問題

---

**最終更新**: 2025年8月16日  
**バージョン**: 2.0.0
