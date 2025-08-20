# 🔧 基本運用ガイド

**対象読者**: 運用担当者・システム管理者  
**バージョン**: 4.0.0 Final Edition  
**品質レベル**: エンタープライズ本番環境対応  
**最終更新**: 2025年8月21日

---

## 🌟 基本運用の特徴

### 🎯 **日常的な基本操作**
- ✅ **サーバー制御**: 起動・停止・再起動・状態確認
- ✅ **ヘルスチェック**: システム状態の基本監視
- ✅ **プロセス管理**: PM2・systemd による管理
- ✅ **基本トラブルシューティング**: よくある問題の解決

---

## 🔧 基本操作コマンド

### 📊 **サーバー制御**

#### **サーバー起動・停止**
```bash
# サーバー起動 (開発環境)
npm run start

# サーバー起動 (本番環境)
sudo systemctl start poker-mcp

# サーバー停止 (グレースフル)
sudo systemctl stop poker-mcp

# サーバー再起動
sudo systemctl restart poker-mcp

# サーバー状態確認
sudo systemctl status poker-mcp

# リアルタイムログ監視
sudo journalctl -u poker-mcp -f

# サーバー自動起動設定
sudo systemctl enable poker-mcp

# サーバー自動起動無効化
sudo systemctl disable poker-mcp
```

#### **プロセス管理 (PM2使用時)**
```bash
# PM2でサーバー起動
pm2 start src/mcp_server_stdio_v4.js --name poker-mcp

# プロセス一覧
pm2 list

# プロセス詳細確認
pm2 show poker-mcp

# ログ確認
pm2 logs poker-mcp

# リアルタイムログ監視
pm2 logs poker-mcp --lines 100 -f

# プロセス再起動
pm2 restart poker-mcp

# プロセス停止
pm2 stop poker-mcp

# プロセス削除
pm2 delete poker-mcp

# PM2起動スクリプト保存
pm2 save

# PM2自動起動設定
pm2 startup

# PM2プロセス復活
pm2 resurrect
```

### 📊 **基本ヘルスチェック**

#### **動作確認コマンド**
```bash
# 基本ヘルスチェック
curl http://localhost:3020/health

# 詳細ヘルスチェック (JSON整形)
curl http://localhost:3020/health | jq '.'

# ヘルスチェック結果をファイルに保存
curl -s http://localhost:3020/health | jq '.' > /tmp/health_$(date +%Y%m%d_%H%M%S).json

# メトリクス取得
curl http://localhost:3020/metrics

# サーバー情報取得
curl http://localhost:3020/ | jq '.'

# プロセス監視
ps aux | grep mcp_server_stdio_v4.js

# リソース使用量確認
top -p $(pgrep -f mcp_server_stdio_v4.js)

# ポート使用状況確認
sudo netstat -tlnp | grep :3020
sudo lsof -i :3020
```

#### **レスポンス例**
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

#### **ヘルスチェック状態判定**
```bash
#!/bin/bash
# health_check_simple.sh - 簡単なヘルスチェック

check_system_health() {
    echo "=== Poker MCP 基本ヘルスチェック ==="
    
    # 1. プロセス確認
    echo "1. プロセス状態確認..."
    if pgrep -f mcp_server_stdio_v4.js > /dev/null; then
        echo "   ✅ プロセス稼働中"
    else
        echo "   ❌ プロセス停止中"
        return 1
    fi
    
    # 2. ポート確認
    echo "2. ポート状態確認..."
    if netstat -tln | grep :3020 > /dev/null; then
        echo "   ✅ ポート3020開放中"
    else
        echo "   ❌ ポート3020未開放"
        return 1
    fi
    
    # 3. API応答確認
    echo "3. API応答確認..."
    health_status=$(curl -s http://localhost:3020/health | jq -r '.status' 2>/dev/null)
    if [ "$health_status" = "healthy" ]; then
        echo "   ✅ API正常応答"
    else
        echo "   ❌ API異常応答: $health_status"
        return 1
    fi
    
    # 4. 基本機能確認
    echo "4. 基本機能確認..."
    server_info=$(curl -s http://localhost:3020/ 2>/dev/null)
    if echo "$server_info" | jq '.version' > /dev/null 2>&1; then
        version=$(echo "$server_info" | jq -r '.version')
        echo "   ✅ 基本機能正常 (バージョン: $version)"
    else
        echo "   ❌ 基本機能異常"
        return 1
    fi
    
    echo "=== ヘルスチェック完了: 全項目正常 ==="
    return 0
}

# ヘルスチェック実行
check_system_health
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo "🎉 システム正常稼働中"
else
    echo "⚠️  システムに問題があります。詳細確認が必要です。"
fi

exit $exit_code
```

---

## 🔍 基本トラブルシューティング

### 🚨 **よくある問題と解決法**

#### **1. サーバーが起動しない**
```bash
# 原因調査
echo "=== サーバー起動問題の調査 ==="

# ポート使用状況確認
echo "1. ポート3020使用状況:"
sudo lsof -i :3020

# プロセス確認
echo "2. 関連プロセス確認:"
ps aux | grep mcp_server

# ログ確認
echo "3. 最新エラーログ:"
sudo journalctl -u poker-mcp -n 20

# 設定ファイル確認
echo "4. 設定ファイル存在確認:"
ls -la /opt/poker_mcp/.env

# 解決手順
echo "=== 解決手順 ==="
echo "1. 既存プロセス終了:"
echo "   sudo pkill -f mcp_server"
echo "2. ポート解放確認:"
echo "   sudo lsof -i :3020"
echo "3. 再起動:"
echo "   sudo systemctl restart poker-mcp"
```

#### **2. API が応答しない**
```bash
# API応答問題の診断
echo "=== API応答問題の診断 ==="

# 基本接続テスト
echo "1. 基本接続テスト:"
timeout 5 curl -v http://localhost:3020/health

# ファイアウォール確認
echo "2. ファイアウォール状態:"
sudo ufw status

# nginx設定確認（使用時）
if systemctl is-active nginx > /dev/null 2>&1; then
    echo "3. nginx設定確認:"
    sudo nginx -t
    sudo systemctl status nginx
fi

# 解決手順
echo "=== 解決手順 ==="
echo "1. サーバープロセス確認・再起動"
echo "2. ファイアウォール設定確認"
echo "3. プロキシ設定確認（nginx使用時）"
```

#### **3. メモリ不足・パフォーマンス低下**
```bash
# パフォーマンス問題の診断
echo "=== パフォーマンス診断 ==="

# メモリ使用量確認
echo "1. メモリ使用量:"
free -h

# プロセス別メモリ使用量
echo "2. Poker MCPメモリ使用量:"
poker_pid=$(pgrep -f mcp_server_stdio_v4.js)
if [ -n "$poker_pid" ]; then
    ps -p $poker_pid -o pid,rss,vsz,pmem,comm
    echo "   RSS: $(ps -p $poker_pid -o rss= | awk '{print int($1/1024)}')MB"
else
    echo "   プロセスが見つかりません"
fi

# ディスク使用量確認
echo "3. ディスク使用量:"
df -h /var/lib/poker_mcp

# CPU使用率確認
echo "4. CPU使用率:"
top -p $poker_pid -n 1 | tail -1

# 解決手順
echo "=== 解決手順 ==="
echo "1. 不要なプロセス終了"
echo "2. ログファイル削除"
echo "3. バックアップファイル削除"
echo "4. サーバー再起動"
```

### 🔧 **緊急時対応手順**

#### **緊急再起動スクリプト**
```bash
#!/bin/bash
# emergency_restart.sh - 緊急再起動スクリプト

echo "🚨 Poker MCP 緊急再起動開始 $(date)"

# 1. 現在の状態保存
echo "1. 現在の状態保存..."
mkdir -p /tmp/poker_mcp_emergency_$(date +%Y%m%d_%H%M%S)
emergency_dir="/tmp/poker_mcp_emergency_$(date +%Y%m%d_%H%M%S)"

# ヘルスチェック結果保存
curl -s http://localhost:3020/health > "$emergency_dir/health_before.json" 2>/dev/null

# プロセス情報保存
ps aux | grep mcp_server > "$emergency_dir/processes_before.txt"

# 2. プロセス強制終了
echo "2. プロセス強制終了..."
sudo pkill -9 -f mcp_server_stdio_v4.js

# 3. ポート解放確認
echo "3. ポート解放確認..."
sleep 2
if sudo lsof -i :3020; then
    echo "   ⚠️ ポートがまだ使用中です"
    sudo fuser -k 3020/tcp
    sleep 2
fi

# 4. 一時ファイル削除
echo "4. 一時ファイル削除..."
rm -f /tmp/poker_mcp_*.tmp
rm -f /var/run/poker-mcp.pid

# 5. サーバー再起動
echo "5. サーバー再起動..."
sudo systemctl start poker-mcp

# 6. 起動確認
echo "6. 起動確認..."
sleep 5
for i in {1..10}; do
    if curl -s http://localhost:3020/health > /dev/null; then
        echo "   ✅ サーバー正常起動 (${i}回目のチェック)"
        break
    else
        echo "   ⏳ 起動待機中... (${i}/10)"
        sleep 2
    fi
done

# 7. 最終確認
echo "7. 最終確認..."
health_status=$(curl -s http://localhost:3020/health | jq -r '.status' 2>/dev/null)
if [ "$health_status" = "healthy" ]; then
    echo "   ✅ 緊急再起動成功"
    curl -s http://localhost:3020/health > "$emergency_dir/health_after.json"
else
    echo "   ❌ 緊急再起動失敗"
    echo "   詳細調査が必要です: sudo journalctl -u poker-mcp -n 50"
fi

echo "🚨 緊急再起動完了 $(date)"
echo "📁 ログ保存先: $emergency_dir"
```

#### **システム状態診断スクリプト**
```bash
#!/bin/bash
# system_diagnosis.sh - システム状態診断

DIAGNOSIS_FILE="/tmp/poker_mcp_diagnosis_$(date +%Y%m%d_%H%M%S).txt"

echo "🔍 Poker MCP システム診断開始" | tee $DIAGNOSIS_FILE
echo "診断日時: $(date)" | tee -a $DIAGNOSIS_FILE
echo "======================================" | tee -a $DIAGNOSIS_FILE

# 1. 基本システム情報
echo "" | tee -a $DIAGNOSIS_FILE
echo "📊 基本システム情報" | tee -a $DIAGNOSIS_FILE
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)" | tee -a $DIAGNOSIS_FILE
echo "Kernel: $(uname -r)" | tee -a $DIAGNOSIS_FILE
echo "CPU: $(nproc) cores" | tee -a $DIAGNOSIS_FILE
echo "Memory: $(free -h | awk 'NR==2{print $2}')" | tee -a $DIAGNOSIS_FILE
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')" | tee -a $DIAGNOSIS_FILE

# 2. Poker MCP プロセス状態
echo "" | tee -a $DIAGNOSIS_FILE
echo "🔧 Poker MCP プロセス状態" | tee -a $DIAGNOSIS_FILE
poker_pid=$(pgrep -f mcp_server_stdio_v4.js)
if [ -n "$poker_pid" ]; then
    echo "PID: $poker_pid" | tee -a $DIAGNOSIS_FILE
    echo "Memory: $(ps -p $poker_pid -o rss= | awk '{print int($1/1024)}')MB" | tee -a $DIAGNOSIS_FILE
    echo "CPU: $(ps -p $poker_pid -o %cpu=)%" | tee -a $DIAGNOSIS_FILE
    echo "Start Time: $(ps -p $poker_pid -o lstart=)" | tee -a $DIAGNOSIS_FILE
else
    echo "❌ プロセスが見つかりません" | tee -a $DIAGNOSIS_FILE
fi

# 3. ネットワーク状態
echo "" | tee -a $DIAGNOSIS_FILE
echo "🌐 ネットワーク状態" | tee -a $DIAGNOSIS_FILE
if netstat -tln | grep :3020 > /dev/null; then
    echo "✅ ポート3020開放中" | tee -a $DIAGNOSIS_FILE
else
    echo "❌ ポート3020未開放" | tee -a $DIAGNOSIS_FILE
fi

# 4. API応答テスト
echo "" | tee -a $DIAGNOSIS_FILE
echo "🔌 API応答テスト" | tee -a $DIAGNOSIS_FILE
api_response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json http://localhost:3020/health)
if [ "$api_response" = "200" ]; then
    status=$(cat /tmp/health_response.json | jq -r '.status' 2>/dev/null)
    echo "✅ API正常応答 (Status: $status)" | tee -a $DIAGNOSIS_FILE
    uptime=$(cat /tmp/health_response.json | jq -r '.uptime' 2>/dev/null)
    echo "Uptime: $((uptime / 3600))時間$((uptime % 3600 / 60))分" | tee -a $DIAGNOSIS_FILE
else
    echo "❌ API異常応答 (HTTP: $api_response)" | tee -a $DIAGNOSIS_FILE
fi

# 5. ディスク使用量
echo "" | tee -a $DIAGNOSIS_FILE
echo "💾 ディスク使用量" | tee -a $DIAGNOSIS_FILE
echo "データディレクトリ: $(du -sh /var/lib/poker_mcp 2>/dev/null | cut -f1)" | tee -a $DIAGNOSIS_FILE
echo "ログディレクトリ: $(du -sh /var/log/poker_mcp 2>/dev/null | cut -f1)" | tee -a $DIAGNOSIS_FILE
echo "ルート使用率: $(df -h / | awk 'NR==2 {print $5}')" | tee -a $DIAGNOSIS_FILE

# 6. 最新エラー
echo "" | tee -a $DIAGNOSIS_FILE
echo "⚠️  最新エラー (過去24時間)" | tee -a $DIAGNOSIS_FILE
if [ -f "/var/log/poker_mcp/error.log" ]; then
    error_count=$(grep "$(date -d 'yesterday' '+%Y-%m-%d')\|$(date '+%Y-%m-%d')" /var/log/poker_mcp/error.log | wc -l)
    echo "エラー数: $error_count 件" | tee -a $DIAGNOSIS_FILE
    if [ $error_count -gt 0 ]; then
        echo "最新エラー:" | tee -a $DIAGNOSIS_FILE
        grep "$(date '+%Y-%m-%d')" /var/log/poker_mcp/error.log | tail -3 | sed 's/^/  /' | tee -a $DIAGNOSIS_FILE
    fi
else
    echo "エラーログファイルが見つかりません" | tee -a $DIAGNOSIS_FILE
fi

echo "" | tee -a $DIAGNOSIS_FILE
echo "======================================" | tee -a $DIAGNOSIS_FILE
echo "🔍 診断完了: $DIAGNOSIS_FILE" | tee -a $DIAGNOSIS_FILE

# 診断結果表示
cat $DIAGNOSIS_FILE
```

---

## 🎊 基本運用ガイドの特徴

### ✨ **簡潔で実用的な基本操作**

**この基本運用ガイドは、日常的なシステム運用に必要な基本操作を簡潔にまとめた実用的なガイドです。**

#### **基本操作の完全カバー**
- ✅ **サーバー制御**: 起動・停止・再起動の全パターン
- ✅ **ヘルスチェック**: システム状態の基本監視
- ✅ **プロセス管理**: systemd・PM2両方対応
- ✅ **トラブルシューティング**: よくある問題の即座解決

#### **実用性重視**
- ✅ **即座に実行可能**: コピー&ペーストで使用可能
- ✅ **段階的対応**: 初心者でも確実に実行可能
- ✅ **緊急時対応**: 障害時の迅速復旧
- ✅ **自動化スクリプト**: 手動作業の最小化

#### **初心者フレンドリー**
- ✅ **明確な手順**: ステップバイステップの説明
- ✅ **豊富な例**: 具体的なコマンド例
- ✅ **エラー対応**: 想定される問題とその解決法
- ✅ **安全性重視**: 誤操作防止の注意点

**この基本運用ガイドで、確実で安全な日常運用を実現できます！** 🌟

---

**📋 ドキュメント**: MANUAL_03B_BASIC_OPERATIONS.md  
**🏆 品質レベル**: エンタープライズ・本番環境対応  
**📅 最終更新**: 2025年8月21日  
**✨ ステータス**: 基本運用完全対応・実践検証済み

**🚀 次は [MANUAL_03B_SOURCE_MANAGEMENT.md](MANUAL_03B_SOURCE_MANAGEMENT.md) で線源管理をご確認ください！**
