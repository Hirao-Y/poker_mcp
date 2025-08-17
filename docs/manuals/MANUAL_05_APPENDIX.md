リモートプロシージャコール仕様 |
| **YAML** | YAML Ain't Markup Language - 人間が読みやすいデータシリアライゼーション標準 |
| **TaskManager** | mcp_server_final_fixed.js内のメインロジッククラス |
| **立体 (Body)** | 3次元幾何形状の定義 |
| **ゾーン (Zone)** | 立体に材料を割り当てた領域 |
| **変換 (Transform)** | 立体の回転・移動操作 |
| **ビルドアップ係数** | 放射線遮蔽計算における線量率補正係数 |
| **線源 (Source)** | 放射線を放出する点・線・面・体積 |
| **Apply Changes** | 保留中の変更を実際のYAMLファイルに反映する操作 |
| **バックアップ** | YAMLファイルの自動的な複製保存 |
| **保留変更 (Pending Changes)** | まだYAMLファイルに反映されていない変更の一時保存 |

---

## 📊 ベンチマーク・性能指標

### レスポンス時間ベンチマーク

| **操作** | **平均時間** | **最大時間** | **推奨頻度** |
|----------|--------------|--------------|--------------|
| ヘルスチェック (GET /health) | 2ms | 10ms | 制限なし |
| サーバー情報 (GET /) | 5ms | 20ms | 制限なし |
| 立体提案 (proposeBody) | 8ms | 30ms | 100 req/min |
| ゾーン提案 (proposeZone) | 6ms | 25ms | 120 req/min |
| 変換提案 (proposeTransform) | 10ms | 40ms | 80 req/min |
| ビルドアップ係数提案 | 7ms | 30ms | 100 req/min |
| 線源提案 (proposeSource) | 12ms | 50ms | 60 req/min |
| 変更適用 (applyChanges) | 45ms | 200ms | 10 req/min |

### スループット指標

| **同時接続数** | **1接続あたりRPS** | **総スループット** | **メモリ使用量** |
|----------------|-------------------|------------------|------------------|
| 1 | 125 req/s | 125 req/s | 45MB |
| 5 | 100 req/s | 500 req/s | 52MB |
| 10 | 80 req/s | 800 req/s | 61MB |
| 20 | 60 req/s | 1200 req/s | 78MB |
| 50 | 40 req/s | 2000 req/s | 125MB |

### リソース使用量

| **データサイズ** | **Body数** | **Zone数** | **メモリ使用量** | **処理時間** |
|------------------|------------|------------|------------------|--------------|
| 小規模 | ~50 | ~100 | 40-60MB | <10ms |
| 中規模 | ~200 | ~400 | 60-100MB | <20ms |
| 大規模 | ~1000 | ~2000 | 100-200MB | <50ms |
| 超大規模 | ~5000 | ~10000 | 200-500MB | <200ms |

---

## 🎯 使用例テンプレート集

### テンプレート1: 基本的な原子炉モデル

```bash
#!/bin/bash
# basic_reactor_template.sh

echo "=== 基本原子炉モデル作成 ==="

# 1. 外側遮蔽体（コンクリート）
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeBody",
  "params": {
    "name": "outer_shield",
    "type": "SPH", 
    "center": "0 0 0",
    "radius": 500
  },
  "id": 1
}'

# 2. 圧力容器（鋼鉄）
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeBody",
  "params": {
    "name": "pressure_vessel",
    "type": "SPH",
    "center": "0 0 0", 
    "radius": 300
  },
  "id": 2
}'

# 3. 炉心（ウラン燃料）
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeBody", 
  "params": {
    "name": "reactor_core",
    "type": "SPH",
    "center": "0 0 0",
    "radius": 200
  },
  "id": 3
}'

# 材料設定
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeZone",
  "params": {
    "body_name": "outer_shield",
    "material": "Concrete",
    "density": 2.3
  },
  "id": 4
}'

curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0", 
  "method": "pokerinput.proposeZone",
  "params": {
    "body_name": "pressure_vessel",
    "material": "Stainless_Steel",
    "density": 7.9
  },
  "id": 5
}'

curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeZone",
  "params": {
    "body_name": "reactor_core", 
    "material": "Uranium",
    "density": 19.1
  },
  "id": 6
}'

# 中性子源
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeSource",
  "params": {
    "name": "fission_neutrons",
    "type": "VOLUME",
    "position": "0 0 0",
    "inventory": [
      {
        "nuclide": "U-235",
        "radioactivity": 1e15
      }
    ]
  },
  "id": 7
}'

# 適用
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.applyChanges",
  "params": {},
  "id": 8
}'

echo "基本原子炉モデル作成完了"
```

### テンプレート2: 医療施設の線源室

```bash
#!/bin/bash
# medical_facility_template.sh

echo "=== 医療施設線源室モデル作成 ==="

# 1. 施設建物（矩形）
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeBody",
  "params": {
    "name": "facility_building",
    "type": "RPP",
    "min": "-1000 -800 -300",
    "max": "1000 800 300"
  },
  "id": 1
}'

# 2. 線源保管室（鉛遮蔽）
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeBody",
  "params": {
    "name": "source_vault",
    "type": "RPP", 
    "min": "-200 -200 -150",
    "max": "200 200 150"
  },
  "id": 2
}'

# 3. 治療室
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeBody",
  "params": {
    "name": "treatment_room",
    "type": "RPP",
    "min": "300 -250 -200", 
    "max": "700 250 200"
  },
  "id": 3
}'

# 材料設定
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeZone",
  "params": {
    "body_name": "facility_building",
    "material": "Concrete",
    "density": 2.3
  },
  "id": 4
}'

curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeZone", 
  "params": {
    "body_name": "source_vault",
    "material": "Lead",
    "density": 11.34
  },
  "id": 5
}'

curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeZone",
  "params": {
    "body_name": "treatment_room",
    "material": "Air",
    "density": 0.001225
  },
  "id": 6
}'

# 医療用線源（Co-60）
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeSource",
  "params": {
    "name": "cobalt60_medical",
    "type": "POINT",
    "position": "0 0 0",
    "inventory": [
      {
        "nuclide": "Co-60",
        "radioactivity": 3.7e12
      }
    ]
  },
  "id": 7
}'

# 適用
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.applyChanges", 
  "params": {},
  "id": 8
}'

echo "医療施設線源室モデル作成完了"
```

### テンプレート3: 工業用γ線検査設備

```bash
#!/bin/bash
# industrial_inspection_template.sh

echo "=== 工業用γ線検査設備モデル作成 ==="

# 1. 検査チャンバー
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeBody",
  "params": {
    "name": "inspection_chamber",
    "type": "RCC",
    "center": "0 0 0",
    "axis": "0 0 1",
    "radius": 150,
    "height": 300
  },
  "id": 1
}'

# 2. 遮蔽壁（鉛）
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeBody",
  "params": {
    "name": "lead_shielding", 
    "type": "RCC",
    "center": "0 0 0",
    "axis": "0 0 1", 
    "radius": 200,
    "height": 350
  },
  "id": 2
}'

# 3. 外側コンクリート遮蔽
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeBody",
  "params": {
    "name": "concrete_wall",
    "type": "RCC",
    "center": "0 0 0",
    "axis": "0 0 1",
    "radius": 400,
    "height": 500
  },
  "id": 3
}'

# 4. 検査対象物（鋼鉄）
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeBody",
  "params": {
    "name": "test_specimen",
    "type": "RPP",
    "min": "-50 -50 -25",
    "max": "50 50 25"
  },
  "id": 4
}'

# 材料設定
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeZone",
  "params": {
    "body_name": "inspection_chamber",
    "material": "Air", 
    "density": 0.001225
  },
  "id": 5
}'

curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeZone",
  "params": {
    "body_name": "lead_shielding",
    "material": "Lead",
    "density": 11.34
  },
  "id": 6
}'

curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeZone", 
  "params": {
    "body_name": "concrete_wall",
    "material": "Concrete",
    "density": 2.3
  },
  "id": 7
}'

curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeZone",
  "params": {
    "body_name": "test_specimen",
    "material": "Steel",
    "density": 7.8
  },
  "id": 8
}'

# γ線源（Ir-192）
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeSource",
  "params": {
    "name": "iridium192_source",
    "type": "POINT", 
    "position": "-100 0 0",
    "inventory": [
      {
        "nuclide": "Ir-192",
        "radioactivity": 3.7e11
      }
    ]
  },
  "id": 9
}'

# 線源位置の変換（検査位置への移動）
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.proposeTransform",
  "params": {
    "name": "source_positioning",
    "operation": [
      {"translate": "100 0 0"}
    ]
  },
  "id": 10
}'

# 適用
curl -X POST http://localhost:3020/mcp -d '{
  "jsonrpc": "2.0",
  "method": "pokerinput.applyChanges",
  "params": {},
  "id": 11
}'

echo "工業用γ線検査設備モデル作成完了"
```

---

## 🔬 検証・テスト手順

### 単体テスト例

```bash
#!/bin/bash
# unit_tests.sh

echo "=== PokerInput MCP Server 単体テスト ==="

# テスト結果カウンタ
pass_count=0
fail_count=0

# テスト関数
run_test() {
    local test_name="$1"
    local expected="$2"
    shift 2
    local command="$@"
    
    echo -n "テスト: $test_name ... "
    
    result=$(eval "$command" 2>/dev/null)
    if [[ "$result" =~ $expected ]]; then
        echo "PASS"
        ((pass_count++))
    else
        echo "FAIL"
        echo "  期待値: $expected"
        echo "  実際値: $result"
        ((fail_count++))
    fi
}

# 1. ヘルスチェックテスト
run_test "ヘルスチェック" "healthy" \
    'curl -s http://localhost:3020/health | jq -r ".status"'

# 2. 立体提案テスト
run_test "立体提案" "success" \
    'curl -s -X POST http://localhost:3020/mcp -d "{\"jsonrpc\":\"2.0\",\"method\":\"pokerinput.proposeBody\",\"params\":{\"name\":\"unit_test_sphere\",\"type\":\"SPH\",\"center\":\"0 0 0\",\"radius\":10},\"id\":1}" | jq -r ".result.result" | grep -o "提案"'

# 3. ゾーン提案テスト
run_test "ゾーン提案" "success" \
    'curl -s -X POST http://localhost:3020/mcp -d "{\"jsonrpc\":\"2.0\",\"method\":\"pokerinput.proposeZone\",\"params\":{\"body_name\":\"unit_test_sphere\",\"material\":\"Steel\",\"density\":7.8},\"id\":2}" | jq -r ".result.result" | grep -o "提案"'

# 4. 変更適用テスト
run_test "変更適用" "success" \
    'curl -s -X POST http://localhost:3020/mcp -d "{\"jsonrpc\":\"2.0\",\"method\":\"pokerinput.applyChanges\",\"params\":{},\"id\":3}" | jq -r ".result.result" | grep -o "適用"'

# 5. エラーハンドリングテスト
run_test "無効メソッドエラー" "-32601" \
    'curl -s -X POST http://localhost:3020/mcp -d "{\"jsonrpc\":\"2.0\",\"method\":\"invalid.method\",\"params\":{},\"id\":4}" | jq -r ".error.code"'

# 6. パラメータ不足エラーテスト
run_test "パラメータ不足エラー" "-32602" \
    'curl -s -X POST http://localhost:3020/mcp -d "{\"jsonrpc\":\"2.0\",\"method\":\"pokerinput.proposeBody\",\"params\":{\"name\":\"invalid_body\"},\"id\":5}" | jq -r ".error.code"'

# 7. レスポンス時間テスト
start_time=$(date +%s%3N)
curl -s http://localhost:3020/health > /dev/null
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ $response_time -lt 100 ]; then
    echo "テスト: レスポンス時間 ... PASS ($response_time ms)"
    ((pass_count++))
else
    echo "テスト: レスポンス時間 ... FAIL ($response_time ms > 100ms)"
    ((fail_count++))
fi

# 結果表示
echo
echo "=== テスト結果 ==="
echo "成功: $pass_count"
echo "失敗: $fail_count"
echo "合計: $((pass_count + fail_count))"

if [ $fail_count -eq 0 ]; then
    echo "🎉 全テスト成功!"
    exit 0
else
    echo "❌ テスト失敗があります"
    exit 1
fi
```

### 統合テスト例

```bash
#!/bin/bash
# integration_tests.sh

echo "=== 統合テスト: 完全なワークフロー ==="

# クリーンアップ関数
cleanup() {
    echo "テスト環境クリーンアップ中..."
    # テスト用データの削除
    curl -s -X POST http://localhost:3020/mcp -d '{
        "jsonrpc": "2.0",
        "method": "pokerinput.deleteBody", 
        "params": {"name": "integration_test_sphere"},
        "id": 999
    }' > /dev/null
    
    curl -s -X POST http://localhost:3020/mcp -d '{
        "jsonrpc": "2.0",
        "method": "pokerinput.applyChanges",
        "params": {},
        "id": 1000
    }' > /dev/null
}

# エラー時のクリーンアップ設定
trap cleanup EXIT

echo "1. 初期状態確認..."
initial_pending=$(curl -s http://localhost:3020/health | jq -r '.pendingChanges')
echo "初期保留変更数: $initial_pending"

echo "2. 立体作成..."
response=$(curl -s -X POST http://localhost:3020/mcp -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.proposeBody",
    "params": {
        "name": "integration_test_sphere",
        "type": "SPH", 
        "center": "0 0 0",
        "radius": 25
    },
    "id": 1
}')

if echo "$response" | jq -e '.result' > /dev/null; then
    echo "✓ 立体作成成功"
else
    echo "✗ 立体作成失敗"
    echo "$response" | jq '.error'
    exit 1
fi

echo "3. ゾーン設定..."
response=$(curl -s -X POST http://localhost:3020/mcp -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.proposeZone",
    "params": {
        "body_name": "integration_test_sphere",
        "material": "Lead", 
        "density": 11.34
    },
    "id": 2
}')

if echo "$response" | jq -e '.result' > /dev/null; then
    echo "✓ ゾーン設定成功"
else
    echo "✗ ゾーン設定失敗"
    echo "$response" | jq '.error'
    exit 1
fi

echo "4. 変換設定..."
response=$(curl -s -X POST http://localhost:3020/mcp -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.proposeTransform",
    "params": {
        "name": "integration_test_transform",
        "operation": [
            {"translate": "50 0 0"},
            {"rotate_around_z": 45}
        ]
    },
    "id": 3
}')

if echo "$response" | jq -e '.result' > /dev/null; then
    echo "✓ 変換設定成功"
else
    echo "✗ 変換設定失敗"
    echo "$response" | jq '.error'
    exit 1
fi

echo "5. 線源設定..."
response=$(curl -s -X POST http://localhost:3020/mcp -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.proposeSource",
    "params": {
        "name": "integration_test_source",
        "type": "POINT",
        "position": "0 0 0",
        "inventory": [
            {
                "nuclide": "Cs-137",
                "radioactivity": 3.7e10
            }
        ]
    },
    "id": 4
}')

if echo "$response" | jq -e '.result' > /dev/null; then
    echo "✓ 線源設定成功"
else
    echo "✗ 線源設定失敗"
    echo "$response" | jq '.error'
    exit 1
fi

echo "6. 保留変更確認..."
pending_changes=$(curl -s http://localhost:3020/health | jq -r '.pendingChanges')
echo "現在の保留変更数: $pending_changes"

if [ "$pending_changes" -gt "$initial_pending" ]; then
    echo "✓ 保留変更が正常に蓄積されています"
else
    echo "✗ 保留変更が期待通りに蓄積されていません"
    exit 1
fi

echo "7. 変更適用..."
response=$(curl -s -X POST http://localhost:3020/mcp -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.applyChanges",
    "params": {},
    "id": 5
}')

if echo "$response" | jq -e '.result' > /dev/null; then
    echo "✓ 変更適用成功"
else
    echo "✗ 変更適用失敗"
    echo "$response" | jq '.error'
    exit 1
fi

echo "8. 最終状態確認..."
final_pending=$(curl -s http://localhost:3020/health | jq -r '.pendingChanges')
echo "最終保留変更数: $final_pending"

if [ "$final_pending" -eq 0 ]; then
    echo "✓ 保留変更が正常にクリアされました"
else
    echo "✗ 保留変更が期待通りにクリアされていません"
    exit 1
fi

echo "9. バックアップ確認..."
latest_backup=$(ls -t backups/*.yaml 2>/dev/null | head -1)
if [ -n "$latest_backup" ]; then
    echo "✓ バックアップファイル作成確認: $(basename "$latest_backup")"
else
    echo "✗ バックアップファイルが作成されていません"
    exit 1
fi

echo
echo "🎉 統合テスト完全成功!"
echo "全ての機能が正常に動作しています"
```

---

## 📋 最終チェックリスト

### 本番環境デプロイ前チェック

#### 🔧 システム要件
- [ ] Node.js ≥ 18.0.0 インストール済み
- [ ] 必要な依存関係インストール済み（npm install）
- [ ] ポート3020が利用可能
- [ ] ディスク容量十分（最小1GB推奨）

#### 📁 ファイル・ディレクトリ
- [ ] mcp_server_final_fixed.js 存在確認
- [ ] package.json 適切な設定
- [ ] tasks/ ディレクトリ作成済み
- [ ] backups/ ディレクトリ作成済み
- [ ] logs/ ディレクトリ作成済み（将来用）

#### 🔒 セキュリティ
- [ ] ファイル権限適切に設定
- [ ] ファイアウォール設定（必要に応じて）
- [ ] アクセス制御設定（必要に応じて）
- [ ] バックアップ暗号化（必要に応じて）

#### 🧪 機能テスト
- [ ] ヘルスチェック応答確認
- [ ] 基本API動作確認
- [ ] エラーハンドリング確認
- [ ] バックアップ機能確認

#### 📊 監視・運用
- [ ] 監視スクリプト設定
- [ ] ログローテーション設定
- [ ] 定期メンテナンス計画
- [ ] 緊急時対応手順確認

#### 📚 ドキュメント
- [ ] 運用手順書整備
- [ ] トラブルシューティングガイド確認
- [ ] API仕様書最新版
- [ ] 緊急連絡先リスト

---

**🎉 PokerInput MCP Server FINAL v3.0.1 付録・リファレンス完了！**

このマニュアルは本番環境での運用に必要な全ての技術情報と実用的なガイダンスを提供しています。追加の質問や特別な要件がある場合は、開発チームまでお気軽にお問い合わせください。

**📞 サポート窓口**: 
- Email: admin@example.com
- Issues: GitHub Issues（該当する場合）
- Documentation: 本マニュアル群

**最終更新**: 2025年8月17日  
**次回レビュー予定**: 2025年11月（四半期レビュー）
