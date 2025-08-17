# 変更適用
Invoke-MCPMethod -Method "pokerinput.applyChanges" -Params @{} -Id 3
```

### バッチ処理（PowerShell）

```powershell
# 複数の立体を一括作成
$bodies = @(
    @{name="sphere1"; type="SPH"; center="0 0 0"; radius=10},
    @{name="sphere2"; type="SPH"; center="50 0 0"; radius=15},
    @{name="sphere3"; type="SPH"; center="0 50 0"; radius=20},
    @{name="box1"; type="RPP"; min="-25 -25 -25"; max="25 25 25"}
)

$id = 1
foreach ($body in $bodies) {
    Write-Host "Creating body: $($body.name)"
    Invoke-MCPMethod -Method "pokerinput.proposeBody" -Params $body -Id $id
    $id++
    Start-Sleep -Milliseconds 100  # サーバー負荷軽減
}

# 一括で材料設定
$zones = @(
    @{body_name="sphere1"; material="Lead"; density=11.34},
    @{body_name="sphere2"; material="Steel"; density=7.8},
    @{body_name="sphere3"; material="Concrete"; density=2.3},
    @{body_name="box1"; material="Water"; density=1.0}
)

foreach ($zone in $zones) {
    Write-Host "Setting zone: $($zone.body_name) -> $($zone.material)"
    Invoke-MCPMethod -Method "pokerinput.proposeZone" -Params $zone -Id $id
    $id++
    Start-Sleep -Milliseconds 100
}

# 全変更の適用
Write-Host "Applying all changes..."
Invoke-MCPMethod -Method "pokerinput.applyChanges" -Params @{} -Id $id
```

---

## 📊 データ検証とモニタリング

### 操作前後の確認手順

```bash
# 1. 操作前のヘルスチェック
echo "=== 操作前の状態 ==="
curl http://localhost:3020/health | jq '.pendingChanges'

# 2. 操作実行
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeBody","params":{"name":"test","type":"SPH","center":"0 0 0","radius":10},"id":1}'

# 3. 保留変更の確認
echo "=== 操作後の保留変更 ==="
curl http://localhost:3020/health | jq '.pendingChanges'

# 4. 変更適用
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.applyChanges","params":{},"id":2}'

# 5. 最終確認
echo "=== 適用後の状態 ==="
curl http://localhost:3020/health | jq '.'
```

### バックアップファイルの確認

```bash
# バックアップファイル一覧
ls -la backups/

# 最新のバックアップファイル
ls -t backups/ | head -1

# バックアップの内容確認
cat backups/$(ls -t backups/ | head -1) | head -20
```

---

## 🔍 デバッグとトラブルシューティング

### よくある操作エラーと対処法

#### エラー1: 立体名の重複

```bash
# エラー例
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeBody","params":{"name":"existing_name","type":"SPH","center":"0 0 0","radius":10},"id":1}'

# 返答例
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "立体提案エラー: 立体名 existing_name は既に存在します"
  }
}

# 対処法: 異なる名前を使用
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeBody","params":{"name":"unique_name_v2","type":"SPH","center":"0 0 0","radius":10},"id":1}'
```

#### エラー2: パラメータ不足

```bash
# エラー例（radiusが不足）
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeBody","params":{"name":"sphere","type":"SPH","center":"0 0 0"},"id":1}'

# 対処法: 必須パラメータを追加
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeBody","params":{"name":"sphere","type":"SPH","center":"0 0 0","radius":10},"id":1}'
```

#### エラー3: ATMOSPHEREゾーンの削除試行

```bash
# エラー例
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.deleteZone","params":{"body_name":"ATMOSPHERE"},"id":1}'

# 返答
{
  "error": {
    "code": -32000,
    "message": "ゾーン削除エラー: ATMOSPHEREゾーンは削除できません"
  }
}

# 対処法: 他のゾーンを対象にする
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.deleteZone","params":{"body_name":"other_zone"},"id":1}'
```

### サーバー状態の詳細確認

```bash
# 詳細なヘルスチェック情報
curl http://localhost:3020/health | jq '{
  status: .status,
  version: .version,
  pendingChanges: .pendingChanges,
  features: .features,
  timestamp: .timestamp
}'

# サーバー基本情報
curl http://localhost:3020/ | jq '{
  name: .name,
  version: .version,
  port: .port,
  methods: .methods | length
}'
```

---

## 📚 実用的なスクリプト例

### スクリプト1: 段階的テスト用セットアップ

```bash
#!/bin/bash
# setup_test_environment.sh

echo "=== PokerInput MCP Server テスト環境セットアップ ==="

# サーバー起動確認
echo "1. サーバー状態確認..."
health_status=$(curl -s http://localhost:3020/health | jq -r '.status // "error"')
if [ "$health_status" != "healthy" ]; then
    echo "エラー: サーバーが起動していません"
    exit 1
fi
echo "✓ サーバーは正常に動作中"

# テスト用立体作成
echo "2. テスト用立体作成..."
test_bodies=(
    '{"name":"test_sphere","type":"SPH","center":"0 0 0","radius":50}'
    '{"name":"test_box","type":"RPP","min":"-30 -30 -30","max":"30 30 30"}'
    '{"name":"test_cylinder","type":"RCC","center":"0 0 100","axis":"0 0 1","radius":25,"height":100}'
)

id=1
for body in "${test_bodies[@]}"; do
    echo "  作成中: $(echo $body | jq -r '.name')"
    curl -s -X POST http://localhost:3020/mcp \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"method\":\"pokerinput.proposeBody\",\"params\":$body,\"id\":$id}" > /dev/null
    ((id++))
done

# テスト用ゾーン作成
echo "3. テスト用ゾーン作成..."
test_zones=(
    '{"body_name":"test_sphere","material":"Lead","density":11.34}'
    '{"body_name":"test_box","material":"Concrete","density":2.3}'
    '{"body_name":"test_cylinder","material":"Steel","density":7.8}'
)

for zone in "${test_zones[@]}"; do
    body_name=$(echo $zone | jq -r '.body_name')
    echo "  設定中: $body_name"
    curl -s -X POST http://localhost:3020/mcp \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"method\":\"pokerinput.proposeZone\",\"params\":$zone,\"id\":$id}" > /dev/null
    ((id++))
done

# 変更適用
echo "4. 変更適用中..."
curl -s -X POST http://localhost:3020/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"pokerinput.applyChanges","params":{},"id":99}' > /dev/null

echo "✓ テスト環境セットアップ完了"

# 最終状態確認
pending=$(curl -s http://localhost:3020/health | jq -r '.pendingChanges')
echo "保留変更数: $pending"
echo "=== セットアップ完了 ==="
```

### スクリプト2: バックアップ管理

```bash
#!/bin/bash
# backup_manager.sh

BACKUP_DIR="backups"
MAX_BACKUPS=10

echo "=== バックアップ管理スクリプト ==="

# バックアップ数確認
backup_count=$(ls -1 $BACKUP_DIR/*.yaml 2>/dev/null | wc -l)
echo "現在のバックアップ数: $backup_count"

# 最新バックアップ情報
if [ $backup_count -gt 0 ]; then
    latest_backup=$(ls -t $BACKUP_DIR/*.yaml | head -1)
    echo "最新のバックアップ: $(basename $latest_backup)"
    echo "作成日時: $(stat -c %y "$latest_backup")"
    echo "ファイルサイズ: $(stat -c %s "$latest_backup") bytes"
fi

# 古いバックアップのクリーンアップ（手動実行）
if [ $backup_count -gt $MAX_BACKUPS ]; then
    echo "警告: バックアップが$MAX_BACKUPS個を超えています"
    old_backups=$(ls -t $BACKUP_DIR/*.yaml | tail -n +$((MAX_BACKUPS + 1)))
    echo "削除対象:"
    echo "$old_backups"
    
    read -p "これらのファイルを削除しますか？ (y/N): " answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        echo "$old_backups" | xargs rm -f
        echo "✓ 古いバックアップを削除しました"
    fi
fi

echo "=== バックアップ管理完了 ==="
```

### スクリプト3: パフォーマンステスト

```bash
#!/bin/bash
# performance_test.sh

echo "=== パフォーマンステスト開始 ==="

# レスポンス時間測定
echo "1. レスポンス時間測定..."

# ヘルスチェックのレスポンス時間
health_time=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:3020/health)
echo "ヘルスチェック: ${health_time}秒"

# 立体提案のレスポンス時間
proposal_time=$(curl -s -w "%{time_total}" -o /dev/null -X POST http://localhost:3020/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"pokerinput.proposeBody","params":{"name":"perf_test","type":"SPH","center":"0 0 0","radius":10},"id":1}')
echo "立体提案: ${proposal_time}秒"

# 変更適用のレスポンス時間
apply_time=$(curl -s -w "%{time_total}" -o /dev/null -X POST http://localhost:3020/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"pokerinput.applyChanges","params":{},"id":2}')
echo "変更適用: ${apply_time}秒"

# スループットテスト
echo "2. スループットテスト（10回連続実行）..."
start_time=$(date +%s.%N)

for i in {1..10}; do
    curl -s -X POST http://localhost:3020/mcp \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"method\":\"pokerinput.proposeBody\",\"params\":{\"name\":\"perf_test_$i\",\"type\":\"SPH\",\"center\":\"$i 0 0\",\"radius\":5},\"id\":$i}" > /dev/null
done

end_time=$(date +%s.%N)
total_time=$(echo "$end_time - $start_time" | bc)
throughput=$(echo "scale=2; 10 / $total_time" | bc)

echo "10回実行時間: ${total_time}秒"
echo "スループット: ${throughput} req/sec"

# 最終クリーンアップ
curl -s -X POST http://localhost:3020/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"pokerinput.applyChanges","params":{},"id":99}' > /dev/null

echo "=== パフォーマンステスト完了 ==="
```

---

## 🎛️ 運用のベストプラクティス

### 日常運用チェックリスト

#### 毎日の確認項目
- [ ] サーバーの起動状態確認
- [ ] ヘルスチェック実行
- [ ] バックアップファイルの生成確認
- [ ] ディスク使用量確認

#### 週次の確認項目
- [ ] バックアップファイルの整理
- [ ] ログファイルのローテーション
- [ ] パフォーマンステスト実行
- [ ] 設定ファイルのバックアップ

#### 月次の確認項目  
- [ ] 依存関係の更新確認
- [ ] セキュリティアップデート
- [ ] 運用ドキュメントの更新
- [ ] 災害復旧テスト

### 推奨運用フロー

```bash
# 朝の確認ルーチン
echo "=== 朝の確認ルーチン ==="
curl http://localhost:3020/health
df -h | grep -E "(backups|tasks)"
ps aux | grep mcp_server_final_fixed.js

# 夕方の整理ルーチン  
echo "=== 夕方の整理ルーチン ==="
ls -la backups/ | tail -5
curl http://localhost:3020/health | jq '.pendingChanges'
```

---

## 🚀 高度な使用例

### 複雑な幾何形状の構築

```bash
# トーラス（ドーナツ型）の作成例
curl -X POST http://localhost:3020/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.proposeBody",
    "params": {
      "name": "torus_shield",
      "type": "TOR",
      "center": "0 0 0",
      "axis": "0 0 1",
      "radius1": 100,
      "radius2": 25
    },
    "id": 1
  }'

# 楔形（WED）の作成例
curl -X POST http://localhost:3020/mcp \
  -d '{
    "jsonrpc": "2.0", 
    "method": "pokerinput.proposeBody",
    "params": {
      "name": "wedge_collimator",
      "type": "WED",
      "vertex": "0 0 0",
      "vector1": "50 0 0",
      "vector2": "0 30 0", 
      "vector3": "0 0 40"
    },
    "id": 2
  }'
```

### 線源配列の作成

```bash
# 複数線源の配置例
source_positions=("0 0 0" "50 0 0" "0 50 0" "-50 0 0" "0 -50 0")
nuclides=("Cs-137" "Co-60" "Ir-192" "Cs-137" "Co-60")
activities=(3.7e10 1.85e10 2.2e11 3.7e10 1.85e10)

for i in {0..4}; do
    curl -X POST http://localhost:3020/mcp \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"method\": \"pokerinput.proposeSource\",
        \"params\": {
          \"name\": \"source_$i\",
          \"type\": \"POINT\",
          \"position\": \"${source_positions[$i]}\",
          \"inventory\": [{
            \"nuclide\": \"${nuclides[$i]}\",
            \"radioactivity\": ${activities[$i]}
          }]
        },
        \"id\": $((i+1))
      }"
done
```

---

**📝 このファイルは PokerInput MCP Server FINAL v3.0.1 の操作ガイドです。**  
**さらなる詳細は API仕様書とトラブルシューティングガイドをご参照ください。**
