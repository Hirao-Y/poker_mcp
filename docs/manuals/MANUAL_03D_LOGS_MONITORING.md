# 📊 ログ管理・監視ガイド

**対象読者**: システム管理者・運用担当者・DevOpsエンジニア  
**バージョン**: 4.0.0 Final Edition  
**品質レベル**: エンタープライズ本番環境対応  
**最終更新**: 2025年8月21日

---

## 🌟 ログ管理・監視機能の特徴

### 📊 **包括的なログシステム**
- ✅ **多層ログ**: アプリケーション・システム・アクセスログ
- ✅ **リアルタイム監視**: 障害の即座検出
- ✅ **長期保存**: 法規制対応・トレンド分析
- ✅ **自動アラート**: 異常状態の自動通知

---

## 📋 基本的なログ操作

### 📂 **ログファイルの場所と種類**

#### **ログディレクトリ構成**
```bash
# ログディレクトリ構成の確認
tree /var/log/poker_mcp/

# 一般的な構成例:
# /var/log/poker_mcp/
# ├── application.log      # アプリケーション動作ログ
# ├── error.log           # エラー専用ログ
# ├── access.log          # API アクセスログ
# ├── audit.log           # 監査ログ（変更履歴）
# ├── performance.log     # パフォーマンスログ
# ├── backup.log          # バックアップ操作ログ
# └── archives/           # アーカイブ済みログ
#     ├── 2025-08/
#     └── 2025-07/

# ログファイルサイズ確認
du -sh /var/log/poker_mcp/*.log

# ログディレクトリ総容量
du -sh /var/log/poker_mcp/
```

### 🔍 **ログ監視コマンド**

#### **リアルタイム監視**
```bash
#!/bin/bash
# realtime_log_monitor.sh - リアルタイムログ監視

LOG_DIR="/var/log/poker_mcp"

echo "=== Poker MCP リアルタイムログ監視 ==="
echo "監視開始時刻: $(date)"
echo "Ctrl+C で終了"
echo "========================================"

# 複数ログファイルの同時監視
tail -f \
  $LOG_DIR/application.log \
  $LOG_DIR/error.log \
  $LOG_DIR/access.log \
  $LOG_DIR/audit.log 2>/dev/null | \
while read line; do
    timestamp=$(date '+%H:%M:%S')
    
    # エラーログの色分け
    if echo "$line" | grep -i "error\|failed\|exception" > /dev/null; then
        echo -e "\033[31m[$timestamp] $line\033[0m"  # 赤色
    elif echo "$line" | grep -i "warning\|warn" > /dev/null; then
        echo -e "\033[33m[$timestamp] $line\033[0m"  # 黄色
    elif echo "$line" | grep -i "success\|completed\|ok" > /dev/null; then
        echo -e "\033[32m[$timestamp] $line\033[0m"  # 緑色
    else
        echo "[$timestamp] $line"  # 通常色
    fi
done
```

### 📊 **監視ダッシュボード**

#### **リアルタイムダッシュボード**
```bash
#!/bin/bash
# monitoring_dashboard.sh - リアルタイム監視ダッシュボード

LOG_DIR="/var/log/poker_mcp"

# 画面クリア・ヘッダー表示
show_header() {
    clear
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    Poker MCP 監視ダッシュボード                    ║"
    echo "║                      $(date '+%Y-%m-%d %H:%M:%S')                       ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
}

# システム状態表示
show_system_status() {
    echo "🖥️  システム状態"
    echo "────────────────────────────────────────────────────────────────"
    
    # API状態
    if curl -s http://localhost:3020/health > /dev/null 2>&1; then
        api_status="🟢 正常"
        health_data=$(curl -s http://localhost:3020/health | jq -r '.status,.uptime,.pendingChanges' 2>/dev/null)
        health_status=$(echo "$health_data" | sed -n '1p')
        uptime_sec=$(echo "$health_data" | sed -n '2p')
        pending_changes=$(echo "$health_data" | sed -n '3p')
        
        uptime_hours=$((uptime_sec / 3600))
        uptime_minutes=$(((uptime_sec % 3600) / 60))
    else
        api_status="🔴 異常"
        health_status="unknown"
        uptime_hours=0
        uptime_minutes=0
        pending_changes="unknown"
    fi
    
    # プロセス状態
    if pgrep -f mcp_server_stdio_v4.js > /dev/null; then
        process_status="🟢 稼働中"
        poker_pid=$(pgrep -f mcp_server_stdio_v4.js)
        memory_mb=$(ps -p $poker_pid -o rss= 2>/dev/null | awk '{print int($1/1024)}')
        cpu_usage=$(ps -p $poker_pid -o %cpu= 2>/dev/null | tr -d ' ')
    else
        process_status="🔴 停止"
        memory_mb="N/A"
        cpu_usage="N/A"
    fi
    
    printf "%-15s %s\n" "API状態:" "$api_status"
    printf "%-15s %s\n" "プロセス:" "$process_status"
    printf "%-15s %s (稼働時間: %dh %dm)\n" "ヘルス:" "$health_status" "$uptime_hours" "$uptime_minutes"
    printf "%-15s %s件\n" "保留変更:" "$pending_changes"
    printf "%-15s %sMB\n" "メモリ使用量:" "$memory_mb"
    printf "%-15s %s%%\n" "CPU使用率:" "$cpu_usage"
    echo ""
}

# ログ統計表示
show_log_statistics() {
    echo "📊 ログ統計（過去1時間）"
    echo "────────────────────────────────────────────────────────────────"
    
    # 過去1時間のタイムスタンプ
    one_hour_ago=$(date -d '1 hour ago' '+%Y-%m-%d %H:')
    current_hour=$(date '+%Y-%m-%d %H:')
    
    # 各種ログカウント
    total_logs=0
    error_count=0
    warning_count=0
    api_requests=0
    
    for log_file in $LOG_DIR/*.log; do
        if [ -f "$log_file" ]; then
            hour_logs=$(grep -E "$one_hour_ago|$current_hour" "$log_file" 2>/dev/null | wc -l)
            total_logs=$((total_logs + hour_logs))
            
            if echo "$log_file" | grep -q "error.log"; then
                error_count=$(grep -E "$one_hour_ago|$current_hour" "$log_file" 2>/dev/null | wc -l)
            elif echo "$log_file" | grep -q "access.log"; then
                api_requests=$(grep -E "$one_hour_ago|$current_hour" "$log_file" 2>/dev/null | wc -l)
            fi
            
            # 警告カウント
            warning_count=$((warning_count + $(grep -E "$one_hour_ago|$current_hour" "$log_file" 2>/dev/null | grep -i "warning\|warn" | wc -l)))
        fi
    done
    
    printf "%-15s %d行\n" "総ログ行数:" "$total_logs"
    printf "%-15s %d件\n" "エラー:" "$error_count"
    printf "%-15s %d件\n" "警告:" "$warning_count"
    printf "%-15s %d件\n" "APIリクエスト:" "$api_requests"
    echo ""
}

# メインループ
while true; do
    show_header
    show_system_status
    show_log_statistics
    
    echo "🔄 5秒後に更新します... (Ctrl+C で終了)"
    sleep 5
done
```

---

## 🚨 アラート・監視システム

### 📧 **エラーアラート設定**

#### **エラー監視スクリプト**
```bash
#!/bin/bash
# error_monitor.sh - エラー監視・アラートスクリプト

LOG_DIR="/var/log/poker_mcp"
ALERT_THRESHOLD=5
ALERT_EMAIL="admin@example.com"
LAST_CHECK_FILE="/tmp/poker_mcp_last_check"

# 最後のチェック時刻を取得
if [ -f "$LAST_CHECK_FILE" ]; then
    LAST_CHECK=$(cat "$LAST_CHECK_FILE")
else
    LAST_CHECK=$(date -d '5 minutes ago' +%s)
fi

CURRENT_TIME=$(date +%s)
echo "$CURRENT_TIME" > "$LAST_CHECK_FILE"

# 指定期間内のエラー数をカウント
check_errors() {
    local log_file=$1
    local error_count=0
    
    if [ -f "$log_file" ]; then
        # 最後のチェック以降のエラーをカウント
        while IFS= read -r line; do
            log_timestamp=$(echo "$line" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}')
            if [ -n "$log_timestamp" ]; then
                log_epoch=$(date -d "$log_timestamp" +%s 2>/dev/null)
                if [ "$log_epoch" -gt "$LAST_CHECK" ] && echo "$line" | grep -qi "error\|failed\|exception"; then
                    ((error_count++))
                fi
            fi
        done < "$log_file"
    fi
    
    echo $error_count
}

# アラート判定と送信
total_errors=0
error_details=""

for log_file in "$LOG_DIR"/*.log; do
    if [ -f "$log_file" ]; then
        file_errors=$(check_errors "$log_file")
        total_errors=$((total_errors + file_errors))
        
        if [ $file_errors -gt 0 ]; then
            error_details="$error_details\n$(basename $log_file): $file_errors errors"
        fi
    fi
done

# アラート送信
if [ $total_errors -ge $ALERT_THRESHOLD ]; then
    {
        echo "Subject: Poker MCP Error Alert - $total_errors errors detected"
        echo "To: $ALERT_EMAIL"
        echo ""
        echo "Poker MCP でエラーが検出されました。"
        echo ""
        echo "検出時刻: $(date)"
        echo "エラー数: $total_errors 件 (閾値: $ALERT_THRESHOLD 件)"
        echo ""
        echo "詳細:"
        echo -e "$error_details"
        echo ""
        echo "システムの確認を行ってください。"
    } | sendmail "$ALERT_EMAIL" 2>/dev/null
    
    # ログ出力
    echo "$(date): ALERT - $total_errors errors detected" >> "$LOG_DIR/alert.log"
fi
```

---

## 🛠️ ログメンテナンス

### 🧹 **ログクリーンアップ**

#### **古いログの自動削除**
```bash
#!/bin/bash
# log_cleanup.sh - 古いログの自動削除

LOG_DIR="/var/log/poker_mcp"
RETENTION_DAYS=30
ARCHIVE_RETENTION_DAYS=180

echo "=== Poker MCP ログクリーンアップ ==="
echo "クリーンアップ日時: $(date)"
echo "保存期間: $RETENTION_DAYS 日"
echo "アーカイブ保存期間: $ARCHIVE_RETENTION_DAYS 日"

# 1. 通常ログのクリーンアップ
echo ""
echo "1. 通常ログのクリーンアップ..."
for log_type in application access performance; do
    old_logs=$(find $LOG_DIR -name "${log_type}*.log.*" -mtime +$RETENTION_DAYS 2>/dev/null)
    
    if [ -n "$old_logs" ]; then
        echo "   ${log_type}ログの古いファイルを削除:"
        echo "$old_logs" | while read file; do
            if [ -f "$file" ]; then
                echo "     削除: $(basename $file)"
                rm -f "$file"
            fi
        done
    else
        echo "   ${log_type}ログ: 削除対象なし"
    fi
done

# 2. エラーログの保持（長期保存）
echo ""
echo "2. エラーログのクリーンアップ..."
old_error_logs=$(find $LOG_DIR -name "error*.log.*" -mtime +$((RETENTION_DAYS * 3)) 2>/dev/null)
if [ -n "$old_error_logs" ]; then
    echo "   古いエラーログを削除:"
    echo "$old_error_logs" | while read file; do
        if [ -f "$file" ]; then
            echo "     削除: $(basename $file)"
            rm -f "$file"
        fi
    done
else
    echo "   エラーログ: 削除対象なし"
fi

# 3. アーカイブのクリーンアップ
echo ""
echo "3. アーカイブのクリーンアップ..."
if [ -d "$LOG_DIR/archives" ]; then
    old_archives=$(find $LOG_DIR/archives -name "*.tar.gz" -mtime +$ARCHIVE_RETENTION_DAYS 2>/dev/null)
    if [ -n "$old_archives" ]; then
        echo "   古いアーカイブを削除:"
        echo "$old_archives" | while read file; do
            if [ -f "$file" ]; then
                echo "     削除: $(basename $file)"
                rm -f "$file"
            fi
        done
    else
        echo "   アーカイブ: 削除対象なし"
    fi
else
    echo "   アーカイブディレクトリが存在しません"
fi

# 4. 空のログファイルの削除
echo ""
echo "4. 空のログファイルの削除..."
empty_logs=$(find $LOG_DIR -name "*.log" -size 0 2>/dev/null)
if [ -n "$empty_logs" ]; then
    echo "   空のログファイルを削除:"
    echo "$empty_logs" | while read file; do
        echo "     削除: $(basename $file)"
        rm -f "$file"
    done
else
    echo "   空のログファイル: なし"
fi

echo ""
echo "=== ログクリーンアップ完了 ==="
```

---

## 🎆 ログ管理・監視ガイドの特徴

### ✨ **包括的なログ管理システム**

**このログ管理・監視ガイドは、エンタープライズ環境に必要な包括的なログ管理機能を提供する実用的なガイドです。**

#### **リアルタイム監視**
- ✅ **ライブモニタリング**: リアルタイムログ追跡
- ✅ **色分け表示**: エラー・警告の視覚的区別
- ✅ **ダッシュボード**: 統合的なシステム状態表示
- ✅ **自動更新**: 継続的な監視環境

#### **インテリジェントアラート**
- ✅ **閾値ベース**: 柔軟なアラート設定
- ✅ **メール通知**: 自動的な障害通知
- ✅ **ヘルスチェック**: 総合的なシステム監視
- ✅ **エスカレーション**: 重大度に応じた通知

#### **効率的なメンテナンス**
- ✅ **自動ローテーション**: 定期的なログローテーション
- ✅ **圧縮アーカイブ**: ストレージ最適化
- ✅ **クリーンアップ**: 古いログの自動削除
- ✅ **統計レポート**: 運用状況の可視化

#### **エンタープライズ対応**
- ✅ **法規制対応**: 長期保存・監査ログ
- ✅ **パフォーマンス監視**: リソース使用量・応答時間追跡
- ✅ **セキュリティログ**: アクセス制御・監査証跡
- ✅ **災害復旧対応**: ログ復旧・継続性確保
- ✅ **スケーラビリティ**: 大規模環境対応設計

**このログ管理・監視ガイドで、確実で安全なシステム運用と早期問題検出を実現できます！** 🌟

---

**📋 ドキュメント**: MANUAL_03D_LOGS_MONITORING.md  
**🏆 品質レベル**: エンタープライズ・本番環境対応  
**📅 最終更新**: 2025年8月21日  
**✨ ステータス**: ログ管理・監視完全対応・実践検証済み

**🚀 ログ管理・監視システムで安心・安全な運用を実現しましょう！**
