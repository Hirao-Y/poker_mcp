        echo "Requests: $total_requests | Success: ${success_rate}% | Avg Response: ${avg_response}ms"
    fi
    
    # システムリソース
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    memory_usage=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2 }')
    echo "CPU: ${cpu_usage}% | Memory: ${memory_usage}%"
    
    # プロセス情報
    poker_pid=$(pgrep -f mcp_server_stdio_v4.js)
    if [ -n "$poker_pid" ]; then
        poker_memory=$(ps -p $poker_pid -o rss= | awk '{print int($1/1024)}')MB
        echo "Poker MCP PID: $poker_pid | Memory: $poker_memory"
    else
        echo "❌ Poker MCPプロセスが見つかりません"
    fi
    
    echo "========================"
    echo "Ctrl+C で終了"
    sleep 10
done
```

---

## 🎊 日常運用ガイドの特徴

### ✨ **包括的な運用対応**

**この日常運用ガイドは、最新の線源管理機能（updateSource/deleteSource）を完全統合した、実用性重視の運用マニュアルです。**

#### **新機能統合**
- ✅ **線源CRUD完全対応**: Create/Read/Update/Delete全操作
- ✅ **物理的整合性**: 放射線遮蔽研究に特化した検証
- ✅ **実用的ワークフロー**: 実際の研究シナリオに基づく手順
- ✅ **安全性重視**: バックアップ・検証手順の徹底

#### **運用効率化**
- ✅ **自動化スクリプト**: 日常作業の自動化
- ✅ **監視・アラート**: 問題の早期発見
- ✅ **チェックリスト**: 確実な運用手順
- ✅ **緊急対応**: 障害時の迅速復旧

#### **実用性**
- ✅ **即座に実行可能**: コピー&ペーストで使用可能
- ✅ **段階的対応**: 初心者から上級者まで
- ✅ **豊富な例**: 具体的な使用シナリオ
- ✅ **トラブル対応**: 想定される問題と解決法

**この日常運用ガイドで、世界クラスの線源管理システムを実現できます！** 🌟

---

**📋 ドキュメント**: MANUAL_03B_DAILY_OPERATIONS.md  
**🏆 品質レベル**: エンタープライズ・本番環境対応  
**📅 最終更新**: 2025年8月21日  
**✨ ステータス**: updateSource/deleteSource完全統合済み

**🚀 次は [MANUAL_03C_MONITORING.md](MANUAL_03C_MONITORING.md) で監視・ヘルスチェックをご確認ください！**
