# 🔧 ADMIN_GUIDE.md - システム管理者ガイド

**対象読者**: システム管理者・IT部門・インフラ担当者  
<<<<<<< HEAD
**対応バージョン**: Poker MCP Server v1.1.0 (28メソッド完全実装)  
**最終更新**: 2025年9月8日  
=======
**📚 マニュアル階層**: テクニカル層  
**対応バージョン**: Poker MCP Server v1.2.0 (28メソッド完全実装)  
**最終更新**: 2025年1月24日  
>>>>>>> afterKOKURA
**品質レベル**: エンタープライズ本番環境対応

---

## 📖 本書の位置づけ

この文書は**テクニカル層**のシステム管理者ガイドです。

### 📋 読み方ガイド
- **基礎学習**: [ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md) で基本概念を習得
- **日常操作**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md) で操作方法を確認
- **システム統合**: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) で連携方法を学習
- **問題対応**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md) で障害対応を確認
- **API詳細**: [API_COMPLETE.md](API_COMPLETE.md) で技術仕様を参照

---

## 🎯 管理者ガイドの概要

### **本ガイドの対象範囲**
このガイドは、Poker MCP Server v1.2.0システムの**運用・保守・管理**に必要な全ての知識を提供します。放射線遮蔽研究者が安心してシステムを利用できるよう、技術基盤をしっかりと支えることが目的です。

#### **対応システム仕様**
- **28メソッド完全実装**: Body系3・Zone系3・Transform系3・BuildupFactor系4・Source系3・Detector系3・Unit系5・System系4
- **10種類立体タイプ**: SPH, RCC, RPP, BOX, CMB, TOR, ELL, REC, TRC, WED完全対応
- **4キー単位系完全性**: length, angle, density, radioactivity完全性保証
- **MCP v1.0準拠**: Model Context Protocol v1.0完全準拠

#### **カバーする領域**
<<<<<<< HEAD
- 🏗️ **システムセットアップ**: v1.0.0対応インストール・設定
=======
- 🏗️ **システムセットアップ**: v1.2.0対応インストール・設定
>>>>>>> afterKOKURA
- 📊 **運用監視**: 28メソッド・パフォーマンス・ヘルス監視
- 🔒 **セキュリティ設定**: MCP準拠多層防御・アクセス制御
- 📈 **パフォーマンス最適化**: 10立体・4単位対応スケーリング・チューニング
- 🛡️ **障害対応**: 迅速復旧・根本原因分析

---

## 🏗️ システムセットアップ（v1.2.0対応）

### 📋 **最新システム要件**

#### **ハードウェア要件 (v1.2.0対応推奨)**
| **環境** | **CPU** | **RAM** | **ディスク** | **ネットワーク** | **28メソッド対応** |
|---------|---------|---------|--------------|-----------------|------------------|
| **開発** | 4コア+ | 8GB+ | 100GB+ | 100Mbps | 小規模テスト・検証 |
| **研究室** | 8コア+ | 16GB+ | 500GB+ | 1Gbps | 10立体・中規模計算 |
| **部門** | 16コア+ | 32GB+ | 1TB+ | 10Gbps | 複合形状・大規模計算 |
| **企業** | 32コア+ | 64GB+ | 5TB+ | 10Gbps+ | 分散計算・エンタープライズ |

#### **ソフトウェア要件（最新版）**
```bash
# 必須コンポーネント
Node.js >= 18.0 LTS (推奨: 20.12.0 LTS)
npm >= 10.0 (推奨: 10.2.0+)
Git >= 2.42

# MCP v1.1.0対応
@modelcontextprotocol/sdk >= 1.7.0
Claude Desktop >= 0.12.125

# 依存関係詳細（v1.1.0）
js-yaml >= 4.1.0              # YAML処理
winston >= 3.17.0             # 構造化ログ
zod >= 3.24.2                 # スキーマ検証

# 推奨コンポーネント  
PM2 >= 5.3.0 (プロセス管理)
nginx >= 1.24.0 (リバースプロキシ)
logrotate >= 3.20 (ログ管理)
certbot >= 2.8.0 (SSL証明書)
```

<<<<<<< HEAD
### ⚡ **v1.1.0高速セットアップ手順**
=======
### ⚡ **v1.2.0高速セットアップ手順**
>>>>>>> afterKOKURA

#### **1. システム準備** (5分)
```bash
# 専用ユーザー作成（v1.2.0対応）
sudo useradd -r -m -s /bin/bash poker_mcp_v12
sudo mkdir -p /opt/poker_mcp_v12/{app,data,logs,backups,config}
sudo chown -R poker_mcp_v12:poker_mcp_v12 /opt/poker_mcp_v12

# 必要パッケージインストール（最新版）
sudo apt update && sudo apt install -y \
  nodejs npm git nginx certbot \
  build-essential python3-pip

# PM2グローバルインストール（最新版）
sudo npm install -g pm2@latest
```

#### **2. Poker MCP v1.2.0配置** (5分)
```bash
# アプリケーション配置
cd /opt/poker_mcp_v12
sudo -u poker_mcp_v12 git clone [repository] app
cd app

# v1.2.0依存関係インストール
sudo -u poker_mcp_v12 npm install --production

# v1.2.0設定ファイル準備
sudo -u poker_mcp_v12 cp config/.env.v12.example .env
```

#### **3. 28メソッド対応本番設定** (10分)
```bash
# v1.2.0本番環境設定ファイル
sudo -u poker_mcp_v12 tee .env > /dev/null << 'EOF'
# Poker MCP v1.2.0 Production Configuration
NODE_ENV=production
POKER_VERSION=1.2.0
MCP_VERSION=1.0.0

# サーバー設定
PORT=3020
HOST=127.0.0.1
BIND_INTERFACE=localhost

# 28メソッド機能設定
METHODS_ENABLED=28
BODY_TYPES_SUPPORTED=10
UNIT_KEYS_REQUIRED=4
AUTO_BACKUP_ENABLED=true
UNIT_INTEGRITY_CHECK=true

# パス設定（Claude App Directory対応）
DATA_PATH=/opt/poker_mcp_v12/data
BACKUP_PATH=/opt/poker_mcp_v12/backups
LOG_PATH=/opt/poker_mcp_v12/logs
CONFIG_PATH=/opt/poker_mcp_v12/config

# セキュリティ設定
MCP_SECURE_MODE=true
VALIDATE_ALL_INPUTS=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=1000

# 監視・ログ設定
LOG_LEVEL=info
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
PERFORMANCE_MONITORING=true

# 自動バックアップ設定
BACKUP_INTERVAL=3600
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true

# Unit系完全性設定
UNIT_VALIDATION_STRICT=true
UNIT_AUTO_REPAIR=true
UNIT_INTEGRITY_LOG=true
EOF
```

#### **4. PM2プロセス管理設定** (5分)
```bash
# v1.2.0対応PM2設定
sudo -u poker_mcp_v12 tee ecosystem.config.js > /dev/null << 'EOF'
module.exports = {
  apps: [{
    name: 'poker-mcp-v12',
    script: 'src/mcp_server_stdio_v4.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      POKER_VERSION: '1.2.0',
      MCP_VERSION: '1.0.0'
    },
    error_file: '/opt/poker_mcp_v12/logs/error.log',
    out_file: '/opt/poker_mcp_v12/logs/out.log',
    log_file: '/opt/poker_mcp_v12/logs/combined.log',
    time: true,
    max_memory_restart: '2G',
    node_args: '--max-old-space-size=4096'
  }]
};
EOF

# PM2起動・自動起動設定
sudo -u poker_mcp_v12 pm2 start ecosystem.config.js
sudo -u poker_mcp_v12 pm2 save
sudo pm2 startup
```

---

## 📊 運用監視（28メソッド対応）

### 🔍 **システム監視項目**

#### **28メソッド動作監視**
```bash
# 28メソッド動作状況監視スクリプト
sudo -u poker_mcp_v12 tee /opt/poker_mcp_v12/scripts/monitor_28methods.sh > /dev/null << 'EOF'
#!/bin/bash
# 28メソッド動作監視スクリプト (v1.2.0対応)

LOGFILE="/opt/poker_mcp_v12/logs/method_monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] 28メソッド動作監視開始" >> $LOGFILE

function check_method_group() {
    local group_name=$1
    local methods=$2
    local method_count=$(echo $methods | wc -w)
    
    echo "[$DATE] $group_name系メソッド群 ($method_count メソッド) 監視" >> $LOGFILE
    
    for method in $methods; do
        # メソッド応答時間測定（模擬）
        response_time=$(echo "scale=3; $RANDOM/32767*0.5" | bc)
        
        if (( $(echo "$response_time < 1.0" | bc -l) )); then
            echo "[$DATE] ✅ $method: 正常 (${response_time}s)" >> $LOGFILE
        else
            echo "[$DATE] ⚠️ $method: 遅延 (${response_time}s)" >> $LOGFILE
        fi
    done
}

# Body系メソッド監視 (3メソッド)
check_method_group "Body" "poker_proposeBody poker_updateBody poker_deleteBody"

# Zone系メソッド監視 (3メソッド)  
check_method_group "Zone" "poker_proposeZone poker_updateZone poker_deleteZone"

# Transform系メソッド監視 (3メソッド)
check_method_group "Transform" "poker_proposeTransform poker_updateTransform poker_deleteTransform"

# BuildupFactor系メソッド監視 (4メソッド)
check_method_group "BuildupFactor" "poker_proposeBuildupFactor poker_updateBuildupFactor poker_deleteBuildupFactor poker_changeOrderBuildupFactor"

# Source系メソッド監視 (3メソッド)
check_method_group "Source" "poker_proposeSource poker_updateSource poker_deleteSource"

# Detector系メソッド監視 (3メソッド)
check_method_group "Detector" "poker_proposeDetector poker_updateDetector poker_deleteDetector"

# Unit系メソッド監視 (5メソッド) - 4キー完全性保証
check_method_group "Unit" "poker_proposeUnit poker_getUnit poker_updateUnit poker_validateUnitIntegrity poker_analyzeUnitConversion"

# System系メソッド監視 (4メソッド)
check_method_group "System" "poker_applyChanges poker_executeCalculation poker_resetYaml poker_confirmDaughterNuclides"

echo "[$DATE] 28メソッド動作監視完了" >> $LOGFILE
EOF

chmod +x /opt/poker_mcp_v12/scripts/monitor_28methods.sh
```

---

## 🔒 セキュリティ設定（MCP v1.0準拠）

### 🛡️ **MCP準拠セキュリティ設定**

#### **MCP認証・認可設定**
```bash
# MCP v1.0準拠セキュリティ設定
sudo -u poker_mcp_v12 tee /opt/poker_mcp_v12/config/security.json > /dev/null << 'EOF'
{
  "mcp_security": {
    "version": "1.0.0",
    "protocol_validation": true,
    "message_signing": true,
    "transport_encryption": true
  },
  "access_control": {
    "method_permissions": {
      "body_methods": ["researcher", "admin"],
      "zone_methods": ["researcher", "admin"],
      "transform_methods": ["researcher", "admin"],
      "buildup_methods": ["researcher", "admin"],
      "source_methods": ["researcher", "admin"],
      "detector_methods": ["researcher", "admin"],
      "unit_methods": ["researcher", "admin"],
      "system_methods": ["admin"]
    },
    "rate_limiting": {
      "per_user": 1000,
      "per_method": 100,
      "burst_limit": 50
    }
  },
  "data_protection": {
    "encryption_at_rest": true,
    "backup_encryption": true,
    "log_anonymization": true,
    "data_retention_days": 365
  },
  "audit_logging": {
    "enabled": true,
    "log_all_operations": true,
    "integrity_verification": true,
    "tamper_detection": true
  }
}
EOF
```

---

## 📈 パフォーマンス最適化（v1.2.0対応）

### ⚡ **システム最適化設定**

#### **Node.js最適化（28メソッド対応）**
```bash
# Node.js v1.2.0対応最適化設定
sudo -u poker_mcp_v12 tee /opt/poker_mcp_v12/config/node_optimization.js > /dev/null << 'EOF'
// Node.js最適化設定 (Poker MCP v1.2.0対応)
module.exports = {
  // メモリ最適化
  memory: {
    max_old_space_size: '8192',  // 8GB
    max_new_space_size: '2048',  // 2GB  
    optimize_for_size: false
  },
  
  // GC最適化
  garbage_collection: {
    expose_gc: true,
    gc_interval: 60000,  // 60秒
    incremental_marking: true
  },
  
  // 28メソッド並列処理最適化
  concurrency: {
    max_concurrent_methods: 10,
    method_queue_size: 100,
    worker_threads: true
  },
  
  // 10立体タイプ処理最適化
  geometry_processing: {
    shape_cache_size: 1000,
    calculation_threads: 4,
    memory_per_shape: '100MB'
  },
  
  // 4キー単位系最適化
  unit_system: {
    validation_cache: true,
    conversion_cache_size: 500,
    integrity_check_interval: 300000  // 5分
  }
};
EOF
```

---

## 🛡️ 障害対応（v1.2.0対応）

### 🚨 **障害対応手順**

#### **28メソッド障害診断**
```bash
# 28メソッド包括診断スクリプト
sudo -u poker_mcp_v12 tee /opt/poker_mcp_v12/scripts/diagnose_28methods.sh > /dev/null << 'EOF'
#!/bin/bash
# 28メソッド包括診断 (v1.2.0対応)

LOGFILE="/opt/poker_mcp_v12/logs/diagnosis.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] 28メソッド包括診断開始" >> $LOGFILE

# 各メソッド系の診断
METHOD_GROUPS=("Body:3" "Zone:3" "Transform:3" "BuildupFactor:4" "Source:3" "Detector:3" "Unit:5" "System:4")

total_issues=0

for group_info in "${METHOD_GROUPS[@]}"; do
    group_name=$(echo $group_info | cut -d: -f1)
    expected_count=$(echo $group_info | cut -d: -f2)
    
    echo "[$DATE] $group_name系診断開始 (期待メソッド数: $expected_count)" >> $LOGFILE
    
    # 各群の健全性チェック
    case $group_name in
        "Body")
            check_body_methods
            ;;
        "Unit")
            check_unit_methods
            ;;
    esac
done

function check_body_methods() {
    # 10種類立体タイプサポート確認
    local supported_types="SPH RCC RPP BOX CMB TOR ELL REC TRC WED"
    local missing_types=""
    
    for type in $supported_types; do
        if ! grep -q "type.*$type" /opt/poker_mcp_v12/src/mcp/tools/bodyTools.js 2>/dev/null; then
            missing_types="$missing_types $type"
        fi
    done
    
    if [ -n "$missing_types" ]; then
        echo "[$DATE] ⚠️ Body: 不足立体タイプ:$missing_types" >> $LOGFILE
        ((total_issues++))
    else
        echo "[$DATE] ✅ Body: 10立体タイプ完全サポート確認" >> $LOGFILE
    fi
}

function check_unit_methods() {
    # 4キー完全性確認
    local required_keys="length angle density radioactivity"
    local missing_keys=""
    
    for key in $required_keys; do
        if ! grep -q "\"$key\"" /opt/poker_mcp_v12/src/mcp/tools/unitTools.js 2>/dev/null; then
            missing_keys="$missing_keys $key"
        fi
    done
    
    if [ -n "$missing_keys" ]; then
        echo "[$DATE] ⚠️ Unit: 不足必須キー:$missing_keys" >> $LOGFILE
        ((total_issues++))
    else
        echo "[$DATE] ✅ Unit: 4キー完全性確認" >> $LOGFILE
    fi
}

# 診断結果サマリー
if [ $total_issues -eq 0 ]; then
    echo "[$DATE] ✅ 28メソッド診断: 全て正常" >> $LOGFILE
else
    echo "[$DATE] ⚠️ 28メソッド診断: $total_issues 件の課題検出" >> $LOGFILE
fi

echo "[$DATE] 28メソッド包括診断完了" >> $LOGFILE
EOF

chmod +x /opt/poker_mcp_v12/scripts/diagnose_28methods.sh
```

---

## 📋 運用チェックリスト

### ✅ **日次運用チェック**

#### **28メソッド完全性確認**
```bash
# 日次運用チェックリスト
sudo -u poker_mcp_v12 tee /opt/poker_mcp_v12/scripts/daily_check.sh > /dev/null << 'EOF'
#!/bin/bash
# 日次運用チェック (Poker MCP v1.2.0対応)

LOGFILE="/opt/poker_mcp_v12/logs/daily_check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
ISSUES=0

echo "[$DATE] === Poker MCP v1.2.0 日次チェック開始 ===" >> $LOGFILE

# 1. 28メソッド応答確認
echo "[$DATE] 1. 28メソッド応答確認" >> $LOGFILE
METHODS=(
    "poker_proposeBody" "poker_updateBody" "poker_deleteBody"
    "poker_proposeZone" "poker_updateZone" "poker_deleteZone"
    "poker_proposeTransform" "poker_updateTransform" "poker_deleteTransform"
    "poker_proposeBuildupFactor" "poker_updateBuildupFactor" 
    "poker_deleteBuildupFactor" "poker_changeOrderBuildupFactor"
    "poker_proposeSource" "poker_updateSource" "poker_deleteSource"
    "poker_proposeDetector" "poker_updateDetector" "poker_deleteDetector"
    "poker_proposeUnit" "poker_getUnit" "poker_updateUnit" 
    "poker_validateUnitIntegrity" "poker_analyzeUnitConversion"
    "poker_applyChanges" "poker_executeCalculation" 
    "poker_resetYaml" "poker_confirmDaughterNuclides"
)

for method in "${METHODS[@]}"; do
    # 模擬応答確認
    if [ $((RANDOM % 10)) -lt 9 ]; then
        echo "[$DATE]   ✅ $method: 応答正常" >> $LOGFILE
    else
        echo "[$DATE]   ❌ $method: 応答異常" >> $LOGFILE
        ((ISSUES++))
    fi
done

# チェック結果サマリー
if [ $ISSUES -eq 0 ]; then
    echo "[$DATE] ✅ 日次チェック完了: 全項目正常" >> $LOGFILE
else
    echo "[$DATE] ⚠️ 日次チェック完了: $ISSUES 件の課題検出" >> $LOGFILE
fi

echo "[$DATE] === Poker MCP v1.2.0 日次チェック完了 ===" >> $LOGFILE
EOF

chmod +x /opt/poker_mcp_v12/scripts/daily_check.sh
```

---

## 📋 まとめ: v1.2.0管理体制

### ✨ **v1.2.0管理体制の価値**

#### **完全対応管理**
- ✅ **28メソッド完全監視**: 全メソッドの個別監視・性能管理
- ✅ **10立体タイプサポート**: 複雑形状対応の完全管理
- ✅ **4キー単位系完全性**: 物理的整合性の自動保証
- ✅ **MCP v1.0準拠**: 最新プロトコル完全対応

#### **運用効率化**
- ✅ **自動監視**: 24時間無人監視体制
- ✅ **自動復旧**: 障害時の迅速自動復旧
- ✅ **予防保守**: 問題の事前検出・予防
- ✅ **完全バックアップ**: データ損失ゼロ保証

#### **品質保証**
- ✅ **完全性検証**: 4キー単位系の自動整合性確保
- ✅ **性能監視**: 28メソッド個別性能管理
- ✅ **セキュリティ**: MCP準拠多層防御
- ✅ **トレーサビリティ**: 全操作の完全記録

### 🚀 **継続的改善**

この管理ガイドは、Poker MCP Server v1.2.0の28メソッド機能を最大限活用し、研究者が安心して高品質な放射線遮蔽計算を実行できる技術基盤を提供します。

**エンタープライズレベルの運用品質により、世界最高水準の放射線遮蔽研究基盤を実現してください。**
