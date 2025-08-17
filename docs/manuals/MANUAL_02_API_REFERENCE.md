ラメータ**:
```json
{
  "material": "string (必須) - 材料名",
  "use_slant_correction": "boolean (任意) - 斜め補正使用",
  "use_finite_medium_correction": "boolean (任意) - 有限媒質補正使用"
}
```

**使用例**:
```bash
curl -X POST http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.proposeBuildupFactor",
    "params": {
      "material": "Concrete",
      "use_slant_correction": true,
      "use_finite_medium_correction": false
    },
    "id": 6
  }'
```

### 4.2 pokerinput.updateBuildupFactor

**説明**: 既存ビルドアップ係数のパラメータを更新します

**パラメータ**:
```json
{
  "material": "string (必須) - 更新する材料名",
  "use_slant_correction": "boolean (任意) - 斜め補正使用",
  "use_finite_medium_correction": "boolean (任意) - 有限媒質補正使用"
}
```

### 4.3 pokerinput.deleteBuildupFactor

**説明**: 指定されたビルドアップ係数を削除します

**パラメータ**:
```json
{
  "material": "string (必須) - 削除する材料名"
}
```

### 4.4 pokerinput.changeOrderBuildupFactor

**説明**: ビルドアップ係数の計算順序を変更します

**パラメータ**:
```json
{
  "material": "string (必須) - 順序変更する材料名",
  "newIndex": "number (任意) - 新しいインデックス位置"
}
```

**使用例**:
```bash
curl -X POST http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.changeOrderBuildupFactor",
    "params": {
      "material": "Lead",
      "newIndex": 0
    },
    "id": 7
  }'
```

---

## ☢️ 線源操作API

### 5.1 pokerinput.proposeSource

**説明**: 放射線源を提案します

**パラメータ**:
```json
{
  "name": "string (必須) - 線源の名前",
  "type": "string (必須) - 線源タイプ",
  "position": "string (必須) - 線源位置 'x y z'",
  "inventory": "array (必須) - 核種と放射能のリスト",
  "cutoff_rate": "number (任意) - カットオフレート (default: 0.0001)"
}
```

**線源タイプ**:
- `POINT`: 点線源
- `LINE`: 線線源
- `SURFACE`: 面線源
- `VOLUME`: 体積線源

**inventory形式**:
```json
[
  {
    "nuclide": "核種名 (例: Cs-137)",
    "radioactivity": "放射能 [Bq]"
  }
]
```

**使用例**:
```bash
curl -X POST http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.proposeSource",
    "params": {
      "name": "cs137_medical_source",
      "type": "POINT",
      "position": "0 0 100",
      "inventory": [
        {
          "nuclide": "Cs-137",
          "radioactivity": 3.7e10
        },
        {
          "nuclide": "Co-60", 
          "radioactivity": 1.85e9
        }
      ],
      "cutoff_rate": 0.0001
    },
    "id": 8
  }'
```

---

## ⚡ システム操作API

### 6.1 pokerinput.applyChanges

**説明**: 全ての保留中の変更を実際のYAMLファイルに適用します

**重要**: このメソッドは実際のファイルを更新し、自動的にバックアップを作成します

**パラメータ**: なし

**使用例**:
```bash
curl -X POST http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.applyChanges",
    "params": {},
    "id": 9
  }'
```

**処理内容**:
1. 保留中の変更を順次適用
2. 自動バックアップ作成
3. YAMLファイルの更新
4. 保留変更リストのクリア

**レスポンス**:
```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "result": "変更を正常に適用しました"
  }
}
```

---

## 🔍 情報取得API

### 7.1 GET / (ルートエンドポイント)

**説明**: サーバー基本情報とメソッド一覧を取得

**リクエスト**:
```bash
curl http://localhost:3020/
```

**レスポンス**:
```json
{
  "name": "poker-mcp-final-fixed",
  "version": "3.0.1",
  "description": "Complete MCP Server FINAL - 構文エラー修正版",
  "port": 3020,
  "features": [
    "全15のMCPメソッド完全実装",
    "実際のYAMLファイル更新",
    "自動バックアップ機能",
    "完全なエラーハンドリング"
  ],
  "methods": [
    "pokerinput.proposeBody",
    "pokerinput.updateBody",
    "pokerinput.deleteBody",
    "..."
  ]
}
```

### 7.2 GET /health (ヘルスチェック)

**説明**: サーバーの稼働状況と機能ステータスを確認

**リクエスト**:
```bash
curl http://localhost:3020/health
```

**レスポンス**:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-17T01:48:20.364Z",
  "version": "3.0.1",
  "pendingChanges": 0,
  "dataFiles": {
    "yaml": "tasks/pokerinputs.yaml",
    "pending": "tasks/pending_changes.json"
  },
  "features": {
    "backupEnabled": true,
    "realDataUpdate": true,
    "fullApplyChanges": true
  }
}
```

---

## 🛡️ バリデーション仕様

### 立体名バリデーション

- **形式**: 英数字とアンダースコア
- **長さ**: 1-50文字
- **一意性**: 重複不可
- **予約語**: 避けるべき名前（VOID, ALL等）

### 立体タイプバリデーション

```json
{
  "valid_types": ["SPH", "RCC", "RPP", "BOX", "CMB", "TOR", "ELL", "REC", "TRC", "WED"],
  "required_params": {
    "SPH": ["name", "type", "center", "radius"],
    "RCC": ["name", "type", "center", "axis", "radius", "height"],
    "RPP": ["name", "type", "min", "max"]
  }
}
```

### 座標値バリデーション

- **形式**: `"x y z"` (スペース区切りの3つの数値)
- **範囲**: -1e6 ≤ 値 ≤ 1e6
- **精度**: 小数点以下6桁まで

### 材料名バリデーション

- **形式**: 英数字とアンダースコア、ハイフン
- **長さ**: 1-30文字
- **特別な材料**: `VOID` (密度設定不要)

### 密度バリデーション

- **範囲**: 0.001 ≤ 密度 ≤ 30.0 [g/cm³]
- **精度**: 小数点以下3桁まで
- **単位**: g/cm³ (固定)

---

## 📝 レスポンス詳細

### 成功レスポンスの構造

```json
{
  "jsonrpc": "2.0",
  "id": "リクエストID",
  "result": {
    "result": "操作結果メッセージ",
    "details": "詳細情報 (任意)",
    "affected_items": "影響を受けた項目 (任意)"
  }
}
```

### エラーレスポンスの構造

```json
{
  "jsonrpc": "2.0", 
  "id": "リクエストID",
  "error": {
    "code": "エラーコード",
    "message": "エラーメッセージ", 
    "data": {
      "parameter": "問題のあるパラメータ",
      "expected": "期待される値",
      "received": "実際に受信した値"
    }
  }
}
```

### よくあるエラーメッセージ

| **エラー** | **原因** | **解決策** |
|------------|----------|------------|
| `立体名 xxx は既に存在します` | 名前重複 | 別の名前を使用 |
| `無効な立体タイプ: xxx` | 不正なtype | 有効なタイプを使用 |
| `無効なパラメータ: nameは必須です` | 必須パラメータ不足 | 必要なパラメータを追加 |
| `ATMOSPHEREゾーンは削除できません` | 保護されたゾーンへの操作 | 他のゾーンを対象にする |

---

## 🔄 ワークフロー例

### 基本的な立体作成フロー

```bash
# 1. 球体の提案
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeBody","params":{"name":"reactor","type":"SPH","center":"0 0 0","radius":100},"id":1}'

# 2. 材料ゾーンの提案  
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeZone","params":{"body_name":"reactor","material":"Steel","density":7.8},"id":2}'

# 3. 変更の適用
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.applyChanges","params":{},"id":3}'
```

### 複雑な構造作成フロー

```bash
# 1. 外殻の作成
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeBody","params":{"name":"outer_shell","type":"SPH","center":"0 0 0","radius":200},"id":1}'

# 2. 内部構造の作成
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeBody","params":{"name":"inner_core","type":"SPH","center":"0 0 0","radius":100},"id":2}'

# 3. 変換の適用
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeTransform","params":{"name":"move_core","operation":[{"translate":"0 0 50"}]},"id":3}'

# 4. 材料の割り当て
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeZone","params":{"body_name":"outer_shell","material":"Concrete","density":2.3},"id":4}'

curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeZone","params":{"body_name":"inner_core","material":"Uranium","density":19.1},"id":5}'

# 5. 線源の配置
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeSource","params":{"name":"neutron_source","type":"POINT","position":"0 0 0","inventory":[{"nuclide":"Cf-252","radioactivity":1e8}]},"id":6}'

# 6. 全変更の適用
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.applyChanges","params":{},"id":7}'
```

---

## 🔒 セキュリティ考慮事項

### アクセス制御

- **認証**: 現在未実装（ローカル使用想定）
- **IP制限**: CORS設定で制御可能
- **ポート**: 3020（ファイアウォール設定推奨）

### データ保護

- **自動バックアップ**: 変更適用時に実行
- **データ検証**: 入力値の厳密なバリデーション
- **トランザクション**: 原子性保証

### 推奨セキュリティ設定

```bash
# ファイアウォールでポート制限
sudo ufw allow from 192.168.1.0/24 to any port 3020

# プロセス監視
ps aux | grep mcp_server_final_fixed.js

# ログ監視
tail -f logs/combined.log
```

---

**📋 このファイルは PokerInput MCP Server FINAL v3.0.1 のAPI仕様書です。**  
**実装の詳細は mcp_server_final_fixed.js をご参照ください。**
