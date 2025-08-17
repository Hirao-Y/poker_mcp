    mcp_pid=$(pgrep -f mcp_server_final_fixed.js)
    if [ -n "$mcp_pid" ]; then
        # CPU・メモリ使用率取得
        stats=$(ps -p $mcp_pid -o %cpu,%mem --no-headers 2>/dev/null)
        cpu_percent=$(echo $stats | awk '{print $1}')
        memory_percent=$(echo $stats | awk '{print $2}')
        
        # メモリ使用量（MB）計算
        memory_mb=$(ps -p $mcp_pid -o rss --no-headers 2>/dev/null | awk '{print $1/1024}')
    else
        cpu_percent="N/A"
        memory_percent="N/A" 
        memory_mb="N/A"
    fi
    
    # レスポンス時間測定
    start_time=$(date +%s%3N)
    curl -s --max-time 3 http://localhost:3020/health > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        end_time_ms=$(date +%s%3N)
        response_time=$((end_time_ms - start_time))
    else
        response_time="timeout"
    fi
    
    # 保留変更数取得
    pending_changes=$(curl -s --max-time 2 http://localhost:3020/health 2>/dev/null | jq -r '.pendingChanges // "N/A"')
    
    # ログ出力
    echo "$timestamp,$cpu_percent,$memory_mb,$response_time,$pending_changes" >> "$log_file"
    
    # コンソール表示
    printf "\r%s | CPU: %s%% | MEM: %sMB | Response: %sms | Pending: %s" \
           "$timestamp" "$cpu_percent" "$memory_mb" "$response_time" "$pending_changes"
    
    sleep $interval
done

echo
echo "=== 監視完了 ==="
echo "詳細ログ: $log_file"

# 簡単な統計表示
if [ -f "$log_file" ]; then
    echo
    echo "【統計情報】"
    awk -F',' 'NR>1 && $2!="N/A" {sum+=$2; count++} END {if(count>0) print "平均CPU使用率: " sum/count "%"}' "$log_file"
    awk -F',' 'NR>1 && $3!="N/A" {sum+=$3; count++} END {if(count>0) print "平均メモリ使用量: " sum/count "MB"}' "$log_file"
    awk -F',' 'NR>1 && $4!="timeout" && $4!="N/A" {sum+=$4; count++} END {if(count>0) print "平均レスポンス時間: " sum/count "ms"}' "$log_file"
fi
```

---

## 🔧 設定関連の問題

### 問題1: 環境変数の設定不備

#### 症状
- カスタムポートが認識されない
- ファイルパスが正しく設定されない

#### 解決法
```bash
# 1. 現在の環境変数確認
env | grep -E "(PORT|NODE|PATH)"

# 2. 正しい環境変数設定
export PORT=3020
export NODE_ENV=production
export YAML_FILE=tasks/pokerinputs.yaml
export PENDING_FILE=tasks/pending_changes.json

# 3. 永続的設定（.bashrc/.zshrc）
echo 'export PORT=3020' >> ~/.bashrc
source ~/.bashrc

# 4. 設定確認
echo "Port: $PORT"
npm run start
```

### 問題2: 権限エラー

#### 症状
```
Error: EACCES: permission denied, open 'tasks/pokerinputs.yaml'
Error: EACCES: permission denied, mkdir 'backups'
```

#### 解決法
```bash
# 1. 現在の権限確認
ls -la tasks/
ls -la backups/

# 2. 権限修正
chmod 755 tasks/ backups/
chmod 644 tasks/*.yaml tasks/*.json
chmod 644 backups/*.yaml

# 3. 所有者確認・修正（必要時）
chown -R $USER:$USER tasks/ backups/

# 4. SELinux関連（該当システムのみ）
setenforce 0  # 一時的無効化
# または適切なコンテキスト設定
```

### 問題3: Node.jsバージョン不整合

#### 症状
```
SyntaxError: Unexpected token '?'
Error: The engine "node" is incompatible with this module
```

#### 解決法
```bash
# 1. 現在のNode.jsバージョン確認
node --version

# 2. 要求バージョン確認
cat package.json | jq '.engines'

# 3. Node.jsアップデート（nvm使用）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 4. 依存関係再インストール
rm -rf node_modules package-lock.json
npm install

# 5. 動作確認
npm run start
```

---

## 📊 ログ分析とデバッグ

### デバッグモード起動

```bash
# 1. 詳細ログ付きで起動
DEBUG=* node mcp_server_final_fixed.js

# 2. Node.js inspectorで起動
node --inspect=0.0.0.0:9229 mcp_server_final_fixed.js

# 3. Chrome DevToolsでデバッグ
# chrome://inspect/ にアクセス
```

### カスタムログ設定

```bash
# 1. Winston設定確認（将来実装時）
cat package.json | jq '.dependencies.winston'

# 2. ログレベル設定
export LOG_LEVEL=debug
npm run start

# 3. ログファイル確認
tail -f logs/combined.log
tail -f logs/error.log
```

### API呼び出しのデバッグ

```bash
# 1. 詳細なcurlレスポンス
curl -v -X POST http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"pokerinput.proposeBody","params":{"name":"debug_test","type":"SPH","center":"0 0 0","radius":10},"id":1}'

# 2. JSONレスポンスの整形
curl -s http://localhost:3020/health | jq '.'

# 3. レスポンス時間とステータス詳細
curl -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\nContent Type: %{content_type}\n" \
  -s -o /dev/null http://localhost:3020/health

# 4. タイムアウトテスト
timeout 5 curl http://localhost:3020/health || echo "Timeout occurred"
```

---

## 🚨 データ復旧手順

### シナリオ1: 完全なデータ損失

#### 対応手順
```bash
# 1. 緊急停止
pkill -f mcp_server_final_fixed.js

# 2. 損傷ファイルのバックアップ
mkdir recovery_$(date +%Y%m%d_%H%M%S)
cp tasks/pokerinputs.yaml recovery_*/pokerinputs_damaged.yaml 2>/dev/null || true
cp tasks/pending_changes.json recovery_*/pending_damaged.json 2>/dev/null || true

# 3. 最新バックアップからの復旧
if [ -d "backups" ] && [ "$(ls -A backups/)" ]; then
    latest_backup=$(ls -t backups/*.yaml | head -1)
    echo "復旧に使用するバックアップ: $latest_backup"
    cp "$latest_backup" tasks/pokerinputs.yaml
    echo '[]' > tasks/pending_changes.json
else
    echo "バックアップが見つかりません。初期ファイルを作成します。"
    cat > tasks/pokerinputs.yaml << 'EOF'
body: []
zone:
  - body_name: ATMOSPHERE
    material: VOID
transform: []
buildup_factor: []
source: []
EOF
    echo '[]' > tasks/pending_changes.json
fi

# 4. ファイル検証
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
try {
  const data = yaml.load(fs.readFileSync('tasks/pokerinputs.yaml', 'utf8'));
  console.log('✓ 復旧されたYAMLファイルは有効です');
  console.log('Body数:', data.body?.length || 0);
  console.log('Zone数:', data.zone?.length || 0);
} catch (error) {
  console.error('✗ 復旧失敗:', error.message);
  process.exit(1);
}
"

# 5. サーバー再起動
npm run start

# 6. 動作確認
curl http://localhost:3020/health
```

### シナリオ2: 部分的データ破損

#### 対応手順
```bash
# 1. 破損箇所の特定
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
try {
  yaml.load(fs.readFileSync('tasks/pokerinputs.yaml', 'utf8'));
  console.log('YAMLファイルの構文は正常です');
} catch (error) {
  console.error('YAML構文エラー:', error.message);
  console.error('行番号:', error.mark?.line);
  console.error('列番号:', error.mark?.column);
}
"

# 2. 手動修正または部分復旧
# 構文エラーの場合は手動でファイルを編集
nano tasks/pokerinputs.yaml

# または特定セクションのみバックアップから復旧
node -e "
const yaml = require('js-yaml');
const fs = require('fs');

// バックアップファイル読み込み
const backupData = yaml.load(fs.readFileSync('backups/$(ls -t backups/ | head -1)', 'utf8'));

// 現在のファイル読み込み（可能な場合）
let currentData;
try {
  currentData = yaml.load(fs.readFileSync('tasks/pokerinputs.yaml', 'utf8'));
} catch (error) {
  currentData = {};
}

// 破損していないセクションは保持、破損セクションはバックアップから復旧
const recoveredData = {
  body: currentData.body && Array.isArray(currentData.body) ? currentData.body : backupData.body || [],
  zone: currentData.zone && Array.isArray(currentData.zone) ? currentData.zone : backupData.zone || [],
  transform: currentData.transform && Array.isArray(currentData.transform) ? currentData.transform : backupData.transform || [],
  buildup_factor: currentData.buildup_factor && Array.isArray(currentData.buildup_factor) ? currentData.buildup_factor : backupData.buildup_factor || [],
  source: currentData.source && Array.isArray(currentData.source) ? currentData.source : backupData.source || []
};

// 復旧ファイル保存
fs.writeFileSync('tasks/pokerinputs.yaml', yaml.dump(recoveredData));
console.log('部分復旧完了');
"
```

---

## 📈 予防保守

### 定期メンテナンススクリプト

```bash
#!/bin/bash
# maintenance.sh - 定期メンテナンス

echo "=== 定期メンテナンス開始 ==="

# 1. バックアップのクリーンアップ
echo "1. バックアップクリーンアップ..."
backup_count=$(ls -1 backups/*.yaml 2>/dev/null | wc -l)
if [ $backup_count -gt 10 ]; then
    old_backups=$(ls -t backups/*.yaml | tail -n +11)
    echo "削除するバックアップ: $(echo $old_backups | wc -w)個"
    echo $old_backups | xargs rm -f
fi

# 2. ログローテーション（将来実装時）
if [ -d "logs" ]; then
    find logs/ -name "*.log" -mtime +7 -exec gzip {} \;
    find logs/ -name "*.log.gz" -mtime +30 -delete
fi

# 3. 一時ファイルクリーンアップ
find . -name "*.tmp" -mtime +1 -delete
find . -name ".DS_Store" -delete

# 4. 依存関係の脆弱性チェック
npm audit --audit-level moderate

# 5. パッケージアップデート確認
npm outdated

# 6. ディスク使用量確認
echo "2. ディスク使用量確認..."
du -sh . backups/ tasks/ node_modules/

# 7. 設定ファイルのバックアップ
echo "3. 設定ファイルバックアップ..."
backup_config_dir="config_backup_$(date +%Y%m%d)"
mkdir -p "$backup_config_dir"
cp package.json mcp-manifest.json README.md "$backup_config_dir/"

echo "=== メンテナンス完了 ==="
```

### 監視設定（cron例）

```bash
# crontab -e で追加する監視設定例

# 毎時ヘルスチェック
0 * * * * curl -f http://localhost:3020/health > /dev/null || systemctl restart poker-mcp.service

# 毎日バックアップ確認
0 2 * * * /path/to/poker_mcp/scripts/check_backups.sh

# 週次メンテナンス
0 3 * * 0 /path/to/poker_mcp/scripts/maintenance.sh

# 月次パフォーマンスレポート
0 4 1 * * /path/to/poker_mcp/scripts/performance_report.sh
```

---

## 🔍 高度なデバッグ技法

### メモリリーク調査

```bash
# 1. Node.js built-in profiler
node --prof mcp_server_final_fixed.js

# プロファイルログ生成後（運用後）
node --prof-process isolate-*-v8.log > processed.txt

# 2. heapdump取得
node -e "
const v8 = require('v8');
const fs = require('fs');
const heapSnapshot = v8.getHeapSnapshot();
const fileName = \`heap-\${Date.now()}.heapsnapshot\`;
const fileStream = fs.createWriteStream(fileName);
heapSnapshot.pipe(fileStream);
console.log('Heap dump saved to:', fileName);
"

# 3. メモリ使用量推移監視
while true; do
    ps -p $(pgrep -f mcp_server_final_fixed.js) -o pid,ppid,cmd,%mem,rss | tail -1
    sleep 10
done
```

### ネットワーク問題の調査

```bash
# 1. 接続テスト詳細
nc -zv localhost 3020

# 2. ファイアウォール確認
# Linux
iptables -L -n | grep 3020
# または
ufw status | grep 3020

# Windows
netsh advfirewall firewall show rule name=all | findstr 3020

# 3. DNS解決確認
nslookup localhost
dig localhost

# 4. TCPダンプ（パケット解析）
sudo tcpdump -i lo port 3020 -A
```

### 同期問題のデバッグ

```bash
# 1. ファイルロック状況確認
lsof tasks/pokerinputs.yaml
fuser tasks/pokerinputs.yaml

# 2. 競合状態のテスト
for i in {1..10}; do
    curl -X POST http://localhost:3020/mcp \
      -d "{\"jsonrpc\":\"2.0\",\"method\":\"pokerinput.proposeBody\",\"params\":{\"name\":\"concurrent_$i\",\"type\":\"SPH\",\"center\":\"0 0 0\",\"radius\":$i},\"id\":$i}" &
done
wait

# 3. applyChanges の競合テスト
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.applyChanges","params":{},"id":99}' &
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.applyChanges","params":{},"id":100}' &
wait
```

---

## 📞 エスカレーション手順

### レベル1: 自動復旧

```bash
#!/bin/bash
# auto_recovery.sh

# プロセス死活監視と自動再起動
if ! pgrep -f mcp_server_final_fixed.js > /dev/null; then
    echo "$(date): サーバーダウン検出。自動再起動中..." >> auto_recovery.log
    cd /path/to/poker_mcp
    npm run start >> auto_recovery.log 2>&1 &
    sleep 10
    
    if pgrep -f mcp_server_final_fixed.js > /dev/null; then
        echo "$(date): 自動再起動成功" >> auto_recovery.log
    else
        echo "$(date): 自動再起動失敗。管理者に通知" >> auto_recovery.log
        # メール通知やSlack通知など
    fi
fi
```

### レベル2: アラート通知

```bash
# Slack通知例
curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 PokerInput MCP Server: Critical Error Detected"}' \
    YOUR_SLACK_WEBHOOK_URL

# メール通知例
echo "PokerInput MCP Server エラー発生: $(date)" | \
    mail -s "Critical: MCP Server Down" admin@example.com
```

### レベル3: 緊急連絡先

**サポート窓口情報**:
- 📧 Email: admin@example.com
- 📱 Emergency: +81-xxx-xxxx-xxxx
- 💬 Slack: #poker-mcp-support

**必要情報**:
1. エラー発生時刻
2. サーバーログ
3. システム環境情報
4. 直前の操作履歴

---

## 📋 トラブルシューティングチェックリスト

### 🔴 緊急時チェックリスト

- [ ] サーバープロセス状態確認
- [ ] ポート3020の応答確認
- [ ] YAMLファイルの整合性確認
- [ ] バックアップファイルの存在確認
- [ ] システムリソース（CPU/メモリ/ディスク）確認
- [ ] ネットワーク接続確認
- [ ] 最新バックアップからの復旧準備

### 🟡 日常点検チェックリスト

- [ ] ヘルスチェックAPIの応答時間
- [ ] 保留変更数の妥当性
- [ ] バックアップファイル数（10個以内）
- [ ] ログファイルサイズ
- [ ] 依存関係の脆弱性
- [ ] Node.jsプロセスのメモリ使用量

### 🟢 定期メンテナンスチェックリスト

- [ ] 古いバックアップの削除
- [ ] ログローテーション
- [ ] パッケージアップデート確認
- [ ] 設定ファイルのバックアップ
- [ ] パフォーマンステスト実行
- [ ] ドキュメントの更新

---

**📝 このファイルは PokerInput MCP Server FINAL v3.0.1 のトラブルシューティングガイドです。**  
**緊急時は必要に応じて開発チームまでご連絡ください。**
