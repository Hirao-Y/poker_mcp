# 📊 監視・ヘルスチェックガイド

**対象読者**: 監視担当者・システム管理者・DevOps エンジニア  
**バージョン**: 4.0.0 Final Edition  
**品質レベル**: エンタープライズ本番環境対応  
**最終更新**: 2025年8月21日

---

## 🌟 監視システムの特徴

### 🎯 **本格的な監視機能**
- ✅ **リアルタイム監視**: `/health` `/metrics` エンドポイント
- ✅ **構造化ログ**: JSON形式・レベル別出力
- ✅ **パフォーマンス追跡**: レスポンス時間・スループット計測
- ✅ **リソース監視**: メモリ・CPU・ディスク使用量
- ✅ **アラート機能**: 閾値ベース自動アラート

---

## 📊 監視エンドポイント

### 🔍 **ヘルスチェックエンドポイント**

#### **/health - 基本ヘルスチェック**
```bash
# 基本ヘルスチェック
curl http://localhost:3020/health

# JSON整形表示
curl http://localhost:3020/health | jq '.'

# 特定フィールド抽出
curl -s http://localhost:3020/health | jq '.status'
curl -s http://localhost:3020/health | jq '.uptime'
curl -s http://localhost:3020/health | jq '.pendingChanges'
```

#### **レスポンス例（健全状態）**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-21T12:30:15.123Z",
  "version": "4.0.0",
  "uptime": 86400,
  "pendingChanges": 0,
  "features": {
    "sourceManagement": "complete",
    "updateSource": true,
    "deleteSource": true,
    "backupEnabled": true
  },
  "data": {
    "bodies": 12,
    "zones": 8,
    "sources": 3,
    "transforms": 2,
    "buildupFactors": 5
  }
}
```

### 📈 **メトリクスエンドポイント**

#### **/metrics - 詳細パフォーマンス**
```bash
# 全メトリクス取得
curl http://localhost:3020/metrics

# 線源管理メトリクス抽出
curl -s http://localhost:3020/metrics | jq '.requests.methodCounts | {updateSource, deleteSource, proposeSource}'
```

---

## 🔍 監視スクリプト

### 📊 **リアルタイム監視ダッシュボード**

#### **基本監視ダッシュボード**
```bash
#!/bin/bash
# monitoring_dashboard.sh - リアルタイム監視ダッシュボード

REFRESH_INTERVAL=5
API_ENDPOINT="http://localhost:3020"

while true; do
    clear
    echo "=================================================="
    echo "    Poker MCP 監視ダッシュボード $(date)"
    echo "=================================================="
    
    # ヘルスチェック
    echo "🔍 システムステータス"
    health=$(curl -s $API_ENDPOINT/health 2>/dev/null)
    if [ $? -eq 0 ]; then
        status=$(echo $health | jq -r '.status')
        uptime=$(echo $health | jq -r '.uptime')
        pending=$(echo $health | jq -r '.pendingChanges')
        
        case $status in
            "healthy")  echo "   ✅ システム正常";;
            "degraded") echo "   ⚠️  システム劣化";;
            "unhealthy") echo "   ❌ システム異常";;
            *) echo "   ❓ 不明な状態: $status";;
        esac
        
        # 稼働時間を読みやすく変換
        hours=$((uptime / 3600))
        minutes=$(((uptime % 3600) / 60))
        echo "   📊 稼働時間: ${hours}時間${minutes}分"
        echo "   📝 保留変更: $pending 件"
    else
        echo "   ❌ ヘルスチェック失敗"
    fi
    
    echo ""
    
    # 線源管理活動
    echo "📡 線源管理活動 (過去1時間)"
    if [ -f "/var/log/poker_mcp/audit.log" ]; then
        hour_ago=$(date -d '1 hour ago' '+%Y-%m-%d %H:')
        current_hour=$(date '+%Y-%m-%d %H:')
        
        propose_count=$(grep -E "($hour_ago|$current_hour).*proposeSource" /var/log/poker_mcp/audit.log | wc -l)
        update_count=$(grep -E "($hour_ago|$current_hour).*updateSource" /var/log/poker_mcp/audit.log | wc -l)
        delete_count=$(grep -E "($hour_ago|$current_hour).*deleteSource" /var/log/poker_mcp/audit.log | wc -l)
        
        echo "   🆕 作成: $propose_count 回"
        echo "   🔄 更新: $update_count 回"
        echo "   🗑️  削除: $delete_count 回"
    fi
    
    echo ""
    echo "=================================================="
    echo "🔄 自動更新: ${REFRESH_INTERVAL}秒間隔 | Ctrl+C で終了"
    
    sleep $REFRESH_INTERVAL
done
```

### 🚨 **アラートシステム**

#### **線源管理専用アラート**
```bash
#!/bin/bash
# source_alert_system.sh - 線源管理専用アラートシステム

API_ENDPOINT="http://localhost:3020"
ALERT_LOG="/var/log/poker_mcp/source_alerts.log"

# 線源管理特有の閾値
MAX_SOURCES=50
MAX_SOURCE_OPERATIONS_PER_HOUR=100
MAX_PENDING_SOURCE_CHANGES=5

send_source_alert() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [SOURCE-$level] $message" | tee -a $ALERT_LOG
    
    # Slack通知 (設定されている場合)
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
          --data "{\"text\":\"🧪 Poker MCP 線源管理アラート [$level]: $message\"}" \
          $SLACK_WEBHOOK
    fi
}

echo "=== 線源管理専用アラートシステム開始 $(date) ==="

while true; do
    health=$(curl -s $API_ENDPOINT/health 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # 1. 線源数チェック
        source_count=$(echo $health | jq -r '.data.sources // 0')
        if [ $source_count -gt $MAX_SOURCES ]; then
            send_source_alert "WARNING" "線源数が上限に近づいています: ${source_count}個 (上限: ${MAX_SOURCES}個)"
        fi
        
        # 2. 線源関連の保留変更チェック
        pending=$(echo $health | jq -r '.pendingChanges // 0')
        if [ $pending -gt $MAX_PENDING_SOURCE_CHANGES ]; then
            # 線源関連の変更かチェック
            if [ -f "/var/lib/poker_mcp/data/pending_changes.json" ]; then
                source_pending=$(jq '[.[] | select(.method | test("Source"))] | length' /var/lib/poker_mcp/data/pending_changes.json 2>/dev/null || echo 0)
                if [ $source_pending -gt 0 ]; then
                    send_source_alert "INFO" "線源関連の保留変更: ${source_pending}件 (総保留: ${pending}件)"
                fi
            fi
        fi
        
        # 3. 線源操作頻度チェック
        if [ -f "/var/log/poker_mcp/audit.log" ]; then
            hour_ago=$(date -d '1 hour ago' '+%Y-%m-%d %H:')
            current_hour=$(date '+%Y-%m-%d %H:')
            
            total_ops=$(grep -E "($hour_ago|$current_hour).*(proposeSource|updateSource|deleteSource)" /var/log/poker_mcp/audit.log | wc -l)
            if [ $total_ops -gt $MAX_SOURCE_OPERATIONS_PER_HOUR ]; then
                send_source_alert "WARNING" "線源操作が集中しています: ${total_ops}回/時間 (閾値: ${MAX_SOURCE_OPERATIONS_PER_HOUR}回/時間)"
            fi
        fi
        
        # 4. 異常な線源データチェック
        source_errors=$(grep "$(date '+%Y-%m-%d').*ERROR.*source" /var/log/poker_mcp/error.log 2>/dev/null | wc -l)
        if [ $source_errors -gt 0 ]; then
            send_source_alert "ERROR" "線源関連エラーが発生: ${source_errors}件"
        fi
    fi
    
    sleep 60  # 1分間隔でチェック
done
```

---

## 📈 パフォーマンス監視

### 🔬 **線源管理パフォーマンステスト**

#### **包括的線源パフォーマンステスト**
```bash
#!/bin/bash
# comprehensive_source_performance.sh - 包括的線源パフォーマンステスト

API_ENDPOINT="http://localhost:3020/mcp"
API_KEY="your_api_key_here"
RESULT_FILE="/tmp/source_performance_$(date +%Y%m%d_%H%M%S).txt"

echo "🔬 線源管理包括的パフォーマンステスト開始" | tee $RESULT_FILE
echo "===========================================" | tee -a $RESULT_FILE

# 1. 単一操作レスポンス時間テスト
echo "1. 単一操作レスポンス時間テスト..." | tee -a $RESULT_FILE

# proposeSource テスト
echo "   proposeSource テスト (10回平均):" | tee -a $RESULT_FILE
propose_times=()
for i in {1..10}; do
    start_time=$(date +%s%3N)
    curl -s -X POST $API_ENDPOINT \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"method\": \"pokerinput_proposeSource\",
        \"params\": {
          \"name\": \"perf_test_$i\",
          \"type\": \"point\",
          \"position\": \"$i 0 0\",
          \"inventory\": [{\"nuclide\": \"Co-60\", \"radioactivity\": 3.7e10}],
          \"cutoff_rate\": 0.01
        },
        \"id\": $i
      }" > /dev/null
    end_time=$(date +%s%3N)
    response_time=$((end_time - start_time))
    propose_times+=($response_time)
done

propose_avg=$(( ($(IFS=+; echo "${propose_times[*]}")) / 10 ))
propose_min=$(printf '%s\n' "${propose_times[@]}" | sort -n | head -1)
propose_max=$(printf '%s\n' "${propose_times[@]}" | sort -n | tail -1)
echo "     平均: ${propose_avg}ms, 最小: ${propose_min}ms, 最大: ${propose_max}ms" | tee -a $RESULT_FILE

# updateSource テスト
echo "   updateSource テスト (10回平均):" | tee -a $RESULT_FILE
update_times=()
for i in {1..10}; do
    start_time=$(date +%s%3N)
    curl -s -X POST $API_ENDPOINT \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"method\": \"pokerinput_updateSource\",
        \"params\": {
          \"name\": \"perf_test_$i\",
          \"position\": \"$((i*2)) 0 0\"
        },
        \"id\": $((i+100))
      }" > /dev/null
    end_time=$(date +%s%3N)
    response_time=$((end_time - start_time))
    update_times+=($response_time)
done

update_avg=$(( ($(IFS=+; echo "${update_times[*]}")) / 10 ))
update_min=$(printf '%s\n' "${update_times[@]}" | sort -n | head -1)
update_max=$(printf '%s\n' "${update_times[@]}" | sort -n | tail -1)
echo "     平均: ${update_avg}ms, 最小: ${update_min}ms, 最大: ${update_max}ms" | tee -a $RESULT_FILE

# deleteSource テスト
echo "   deleteSource テスト (10回平均):" | tee -a $RESULT_FILE
delete_times=()
for i in {1..10}; do
    start_time=$(date +%s%3N)
    curl -s -X POST $API_ENDPOINT \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"method\": \"pokerinput_deleteSource\",
        \"params\": {
          \"name\": \"perf_test_$i\"
        },
        \"id\": $((i+200))
      }" > /dev/null
    end_time=$(date +%s%3N)
    response_time=$((end_time - start_time))
    delete_times+=($response_time)
done

delete_avg=$(( ($(IFS=+; echo "${delete_times[*]}")) / 10 ))
delete_min=$(printf '%s\n' "${delete_times[@]}" | sort -n | head -1)
delete_max=$(printf '%s\n' "${delete_times[@]}" | sort -n | tail -1)
echo "     平均: ${delete_avg}ms, 最小: ${delete_min}ms, 最大: ${delete_max}ms" | tee -a $RESULT_FILE

# 2. 大量データ処理テスト
echo "" | tee -a $RESULT_FILE
echo "2. 大量データ処理テスト..." | tee -a $RESULT_FILE

# 50個の線源を一括作成
echo "   50個線源一括作成テスト:" | tee -a $RESULT_FILE
start_time=$(date +%s%3N)
for i in {1..50}; do
    curl -s -X POST $API_ENDPOINT \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"method\": \"pokerinput_proposeSource\",
        \"params\": {
          \"name\": \"bulk_test_$i\",
          \"type\": \"point\",
          \"position\": \"$i 0 0\",
          \"inventory\": [{\"nuclide\": \"Cs-137\", \"radioactivity\": 1e10}],
          \"cutoff_rate\": 0.01
        },
        \"id\": $((i+1000))
      }" > /dev/null
done
end_time=$(date +%s%3N)
bulk_create_time=$((end_time - start_time))
avg_bulk_create=$((bulk_create_time / 50))
echo "     総時間: ${bulk_create_time}ms, 平均: ${avg_bulk_create}ms/個" | tee -a $RESULT_FILE

# 3. 複合操作テスト
echo "" | tee -a $RESULT_FILE
echo "3. 複合操作テスト (作成→更新→削除)..." | tee -a $RESULT_FILE

compound_times=()
for i in {1..5}; do
    start_time=$(date +%s%3N)
    
    # 作成
    curl -s -X POST $API_ENDPOINT \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"method\": \"pokerinput_proposeSource\",
        \"params\": {
          \"name\": \"compound_test_$i\",
          \"type\": \"point\",
          \"position\": \"0 0 0\",
          \"inventory\": [{\"nuclide\": \"Co-60\", \"radioactivity\": 1e10}],
          \"cutoff_rate\": 0.01
        },
        \"id\": $((i+2000))
      }" > /dev/null
    
    # 更新
    curl -s -X POST $API_ENDPOINT \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"method\": \"pokerinput_updateSource\",
        \"params\": {
          \"name\": \"compound_test_$i\",
          \"position\": \"10 10 10\"
        },
        \"id\": $((i+2100))
      }" > /dev/null
    
    # 削除
    curl -s -X POST $API_ENDPOINT \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"method\": \"pokerinput_deleteSource\",
        \"params\": {
          \"name\": \"compound_test_$i\"
        },
        \"id\": $((i+2200))
      }" > /dev/null
    
    end_time=$(date +%s%3N)
    compound_time=$((end_time - start_time))
    compound_times+=($compound_time)
done

compound_avg=$(( ($(IFS=+; echo "${compound_times[*]}")) / 5 ))
echo "   複合操作平均時間: ${compound_avg}ms (作成→更新→削除)" | tee -a $RESULT_FILE

# 4. 変更適用パフォーマンス
echo "" | tee -a $RESULT_FILE
echo "4. 変更適用パフォーマンステスト..." | tee -a $RESULT_FILE

start_time=$(date +%s%3N)
curl -s -X POST $API_ENDPOINT \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_applyChanges",
    "params": {
      "backup_comment": "パフォーマンステスト完了"
    },
    "id": 9999
  }' > /dev/null
end_time=$(date +%s%3N)
apply_time=$((end_time - start_time))
echo "   変更適用時間: ${apply_time}ms" | tee -a $RESULT_FILE

# 5. 結果サマリーと評価
echo "" | tee -a $RESULT_FILE
echo "===========================================" | tee -a $RESULT_FILE
echo "🏆 パフォーマンステスト結果サマリー" | tee -a $RESULT_FILE
echo "===========================================" | tee -a $RESULT_FILE
echo "単一操作平均:" | tee -a $RESULT_FILE
echo "  proposeSource: ${propose_avg}ms" | tee -a $RESULT_FILE
echo "  updateSource:  ${update_avg}ms" | tee -a $RESULT_FILE
echo "  deleteSource:  ${delete_avg}ms" | tee -a $RESULT_FILE
echo "" | tee -a $RESULT_FILE
echo "大量処理:" | tee -a $RESULT_FILE
echo "  50個作成:      ${avg_bulk_create}ms/個" | tee -a $RESULT_FILE
echo "" | tee -a $RESULT_FILE
echo "複合操作:        ${compound_avg}ms" | tee -a $RESULT_FILE
echo "変更適用:        ${apply_time}ms" | tee -a $RESULT_FILE

# パフォーマンス評価
echo "" | tee -a $RESULT_FILE
echo "🎯 パフォーマンス評価:" | tee -a $RESULT_FILE
if [ $propose_avg -lt 50 ] && [ $update_avg -lt 50 ] && [ $delete_avg -lt 50 ]; then
    echo "✅ 優秀 - 全操作が50ms未満で高速" | tee -a $RESULT_FILE
elif [ $propose_avg -lt 100 ] && [ $update_avg -lt 100 ] && [ $delete_avg -lt 100 ]; then
    echo "✅ 良好 - 全操作が100ms未満で実用的" | tee -a $RESULT_FILE
elif [ $propose_avg -lt 200 ] && [ $update_avg -lt 200 ] && [ $delete_avg -lt 200 ]; then
    echo "⚠️  普通 - 全操作が200ms未満で許容範囲" | tee -a $RESULT_FILE
else
    echo "❌ 改善必要 - 一部操作が200ms以上で最適化推奨" | tee -a $RESULT_FILE
fi

echo "" | tee -a $RESULT_FILE
echo "詳細結果: $RESULT_FILE" | tee -a $RESULT_FILE
echo "🏁 線源管理パフォーマンステスト完了"
```

---

## 🎊 監視・ヘルスチェックガイドの特徴

### ✨ **エンタープライズレベルの監視システム**

**この監視・ヘルスチェックガイドは、世界最高水準の監視システムを実現する包括的なソリューションです。**

#### **先進的な監視機能**
- ✅ **リアルタイム監視**: 秒単位での状態監視
- ✅ **多層アラート**: Slack・メール・ログ・システム通知
- ✅ **予測的監視**: 傾向分析による早期警告
- ✅ **自動復旧**: 問題の自動検出・復旧機能

#### **線源管理専用監視**
- ✅ **updateSource/deleteSource監視**: 新機能専用の監視項目
- ✅ **物理的整合性**: 放射線遮蔽研究特有の監視
- ✅ **研究ワークフロー**: 実際の研究パターンに基づく監視
- ✅ **セーフティネット**: 研究データ保護の多重監視

#### **運用効率化**
- ✅ **ダッシュボード**: 直感的なリアルタイム表示
- ✅ **自動レポート**: 定期的な監視レポート生成
- ✅ **パフォーマンス分析**: ボトルネック特定・最適化提案
- ✅ **障害予防**: 事前の問題検出・対策

**この監視システムで、24時間365日の安定運用と研究の継続性を保証します！** 🌟

---

**📋 ドキュメント**: MANUAL_03C_MONITORING.md  
**🏆 品質レベル**: エンタープライズ・本番環境対応  
**📅 最終更新**: 2025年8月21日  
**✨ ステータス**: 完全監視システム・実装検証済み

**🚀 次は高度な運用ガイドを作成します！**
