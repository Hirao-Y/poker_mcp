# 📋 運用ガイド - インデックス

**対象読者**: システム管理者・運用担当者・DevOps エンジニア  
**運用バージョン**: 4.0.0 Final Edition  
**対応サーバー**: `src/mcp_server_stdio_v4.js`  
**品質レベル**: **エンタープライズ本番環境対応**  
**最終更新**: 2025年8月21日

---

## 🌟 運用ガイドの構成

### 📚 **ガイドファイル一覧**

| **ファイル** | **内容** | **対象者** | **重要度** |
|-------------|----------|-----------|-----------|
| **[MANUAL_03A_SETUP.md](MANUAL_03A_SETUP.md)** | 本番環境セットアップ | システム管理者 | ★★★★★ |
| **[MANUAL_03B_DAILY_OPERATIONS.md](MANUAL_03B_DAILY_OPERATIONS.md)** | 日常運用・線源管理 | 運用担当者 | ★★★★★ |
| **[MANUAL_03C_MONITORING.md](MANUAL_03C_MONITORING.md)** | 監視・ヘルスチェック | 監視担当者 | ★★★★☆ |
| **[MANUAL_03D_ADVANCED_OPERATIONS.md](MANUAL_03D_ADVANCED_OPERATIONS.md)** | 高度な運用・自動化 | 上級運用者 | ★★★☆☆ |
| **[MANUAL_03E_PERFORMANCE.md](MANUAL_03E_PERFORMANCE.md)** | パフォーマンス最適化 | DevOps エンジニア | ★★★☆☆ |

### 🔄 **学習パス**

#### **初心者向け学習順序**
1. 📋 **[SETUP](MANUAL_03A_SETUP.md)** → 基本的なセットアップ
2. 🔧 **[DAILY OPERATIONS](MANUAL_03B_DAILY_OPERATIONS.md)** → 日常的な操作
3. 📊 **[MONITORING](MANUAL_03C_MONITORING.md)** → 基本的な監視

#### **上級者向け学習順序**
1. 🎯 **[ADVANCED OPERATIONS](MANUAL_03D_ADVANCED_OPERATIONS.md)** → 高度な運用
2. 📈 **[PERFORMANCE](MANUAL_03E_PERFORMANCE.md)** → 最適化テクニック

### 🚀 **新機能ハイライト**

#### **🆕 線源管理機能 (v4.0.0)**
- ✅ **updateSource**: 既存線源のパラメータ更新
- ✅ **deleteSource**: 線源の安全な削除
- ✅ **完全CRUD**: Create/Read/Update/Delete 全対応

#### **📍 機能の配置**
- **基本操作**: [MANUAL_03B_DAILY_OPERATIONS.md](MANUAL_03B_DAILY_OPERATIONS.md#線源管理操作)
- **高度な運用**: [MANUAL_03D_ADVANCED_OPERATIONS.md](MANUAL_03D_ADVANCED_OPERATIONS.md#高度な線源管理)

---

## 🎯 運用シナリオ別ガイド

### 📋 **初回セットアップ**
```
1. [SETUP](MANUAL_03A_SETUP.md) - システム要件確認・環境構築
2. [DAILY](MANUAL_03B_DAILY_OPERATIONS.md) - 基本操作確認・動作テスト
3. [MONITORING](MANUAL_03C_MONITORING.md) - 監視設定・ヘルスチェック確認
```

### 🔧 **日常運用**
```
1. [DAILY](MANUAL_03B_DAILY_OPERATIONS.md) - サーバー制御・バックアップ・線源管理
2. [MONITORING](MANUAL_03C_MONITORING.md) - ヘルスチェック・パフォーマンス確認
```

### 🚨 **トラブルシューティング**
```
1. [MONITORING](MANUAL_03C_MONITORING.md) - 問題の特定・ログ確認
2. [DAILY](MANUAL_03B_DAILY_OPERATIONS.md) - 復旧操作・バックアップ復元
3. [MANUAL_04_TROUBLESHOOTING.md](MANUAL_04_TROUBLESHOOTING.md) - 詳細な問題解決
```

### 📈 **パフォーマンス改善**
```
1. [MONITORING](MANUAL_03C_MONITORING.md) - パフォーマンス測定
2. [PERFORMANCE](MANUAL_03E_PERFORMANCE.md) - 最適化実施
3. [ADVANCED](MANUAL_03D_ADVANCED_OPERATIONS.md) - 高度な設定調整
```

---

## 🔗 クイックリンク

### 📖 **よく使用される操作**
- [サーバー起動・停止](MANUAL_03B_DAILY_OPERATIONS.md#サーバー制御)
- [ヘルスチェック](MANUAL_03C_MONITORING.md#ヘルスチェック)
- [バックアップ・復旧](MANUAL_03B_DAILY_OPERATIONS.md#バックアップ復旧操作)
- [線源の更新・削除](MANUAL_03B_DAILY_OPERATIONS.md#線源管理操作) 🆕

### 🔧 **設定・メンテナンス**
- [本番環境設定](MANUAL_03A_SETUP.md#本番環境設定ファイル)
- [セキュリティ設定](MANUAL_03A_SETUP.md#セキュリティ設定)
- [ログ管理](MANUAL_03B_DAILY_OPERATIONS.md#ログ管理)
- [パフォーマンス最適化](MANUAL_03E_PERFORMANCE.md#システム最適化)

### 📊 **監視・分析**
- [監視エンドポイント](MANUAL_03C_MONITORING.md#監視エンドポイント)
- [アラート設定](MANUAL_03C_MONITORING.md#アラート設定)
- [ベンチマーク](MANUAL_03E_PERFORMANCE.md#パフォーマンス測定)

---

## 🎊 運用ガイドの特徴

### ✨ **包括性**
- ✅ **完全運用カバー**: セットアップから最適化まで全工程
- ✅ **段階別対応**: 初心者から上級者まで
- ✅ **実用重視**: コピー&ペーストで実行可能

### 🚀 **新機能統合**
- ✅ **線源管理完全対応**: updateSource/deleteSource完全統合
- ✅ **実用的ワークフロー**: 実際の研究シナリオに基づく手順
- ✅ **安全性重視**: バックアップ・検証手順の徹底

### 🔒 **エンタープライズ対応**
- ✅ **本番環境対応**: セキュリティ・可用性・拡張性
- ✅ **自動化重視**: 手動作業の最小化
- ✅ **品質保証**: チェックリスト・監視体制

**この運用ガイドで、世界クラスの放射線遮蔽計算システムを実現しましょう！** 🌟

---

**📋 ドキュメント**: MANUAL_03_OPERATIONS.md (Index)  
**🏆 品質レベル**: エンタープライズ・本番環境対応  
**📅 最終更新**: 2025年8月21日  
**✨ ステータス**: 完全実装・実践検証済み
