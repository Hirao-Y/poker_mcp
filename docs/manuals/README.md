# 📚 PokerInput MCP Server - マニュアル体系

**🎯 対象**: 放射線遮蔽研究者・安全解析・申請実務家・設計エンジニア  
**🔧 システム**: Poker MCP Server v4.2.0  
**📅 最終更新**: 2025年8月28日  
**🌟 マニュアル体系**: 段階的学習設計（3層構造）

---

## 🏆 マニュアル体系の特徴

### ✨ **研究者フレンドリー設計**
- **物理的背景重視**: なぜその計算が必要なのかを明確化
- **実用例豊富**: 医療・原子力・研究での具体的活用例
- **段階的学習**: 初心者→中級者→専門家への明確な道筋
- **品質保証**: 計算結果の信頼性確保手法

---

## 📖 マニュアル構成

### 🌟 **エッセンシャル層** - 必須知識 (3ファイル)
最初に読むべき基本文書

#### 📘 [ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md) - 統合ガイド
- **🔬 物理的背景**: 放射線遮蔽計算の目的と価値
- **⚡ クイックスタート**: 15分で価値を実感
- **🧪 基本計算例**: 3つの代表的ケーススタディ
- **📋 日常操作**: よく使う操作パターン
- **🎯 対象**: PokerInput MCP を初めて使う方

#### 📋 [PHYSICS_REFERENCE.md](PHYSICS_REFERENCE.md) - 放射線遮蔽計算リファレンス  
- **⚛️ 遮蔽理論**: 放射線と物質の相互作用機構
- **📊 パラメータ意味**: 計算パラメータの物理的背景
- **🔢 精度・品質**: 計算精度評価と品質保証手法
- **📈 結果解釈**: 線量率分布の物理的意味と応用
- **🎯 対象**: 計算の物理的背景を理解したいユーザ

#### 🚀 [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - クイックリファレンス
- **📖 コマンド早見表**: 全API・操作の一覧
- **🔧 操作パターン**: よく使う組み合わせ操作
- **⚠️ 緊急時対応**: トラブル時の即座対応
- **💡 Tips & Tricks**: 効率化のコツ
- **🎯 対象**: 日常的にサーバシステムを使用するユーザ

### 📖 **プラクティカル層** - 実践知識 (3ファイル)
実際に必要になる実用情報

#### 🧬 [research_workflows.md](research_workflows.md) - 業務ワークフロー
- **🏥 医療施設遮蔽**: リニアック・PET・RI施設の設計
- **⚛️ 原子力施設遮蔽**: 原子炉・燃料施設の遮蔽評価  
- **🔬 実験室遮蔽**: 加速器・RI実験室の遮蔽計画
- **📊 研究データ管理**: プロジェクト管理・品質保証
- **🎯 対象**: 具体的分野での活用法を知りたいユーザ

#### 🔗 [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - システム統合ガイド
- **🖥️ MCNP完全連携**: 設計→計算→解析の完全ワークフロー
- **🐍 Python自動化**: 実験データ処理・パラメトリック解析
- **🤝 チーム共有**: プロジェクト管理・バージョン管理システム
- **📈 結果可視化**: 3D構造・線量分布の高度可視化
- **🎯 対象**: システム統合・自動化を必要とするユーザ

#### ⚠️ [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 問題解決ガイド
- **🚨 よくある問題**: 症状別の即座解決法
- **🔍 計算妥当性**: 結果の信頼性チェック手法
- **🛠️ システム復旧**: 障害時の復旧手順
- **📞 サポート**: 問題エスカレーション手順
- **🎯 対象**: システム運用・保守を担当する方

### ⚙️ **テクニカル層** - 専門知識 (2ファイル)
システム管理者・上級者向け詳細情報

#### 🔧 [admin_guide.md](admin_guide.md) - 管理者ガイド
- **🏗️ システムセットアップ**: インストール・環境構築
- **📊 運用監視**: システム状態・パフォーマンス監視
- **🔒 セキュリティ**: アクセス制御・データ保護
- **📈 最適化**: システム・計算パフォーマンス最適化
- **🎯 対象**: システム管理者・IT担当者

#### 📋 [API_COMPLETE.md](API_COMPLETE.md) - 全API仕様
- **🔌 全API詳細**: 全メソッドの完全仕様
- **🧪 パラメータ仕様**: 全パラメータの詳細説明
- **⚡ エラーハンドリング**: エラーコード・例外処理
- **🔗 外部連携**: 他システムとのインターフェース
- **🎯 対象**: 開発者・システム統合担当者

---

## 🎯 利用シーン別ガイド

### 👩‍🔬 **初めてPokerInput MCPを使う研究者**
1. **[ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md)** で基本概念とクイックスタートを体験
2. **[PHYSICS_REFERENCE.md](PHYSICS_REFERENCE.md)** で物理的背景を理解
3. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** で日常操作をマスター

### 🏥 **医療施設の遮蔽設計者**
1. **[ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md)** で基本操作を習得
2. **[research_workflows.md](research_workflows.md)** で医療施設設計ワークフローを実践
3. **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** でMCNP連携を活用

### ⚛️ **原子力研究者**
1. **[PHYSICS_REFERENCE.md](PHYSICS_REFERENCE.md)** で遮蔽物理を深く理解
2. **[research_workflows.md](research_workflows.md)** で原子力施設評価手法を活用
3. **[API_COMPLETE.md](API_COMPLETE.md)** で高度なカスタマイズを実行

### 🔧 **システム管理者**
1. **[admin_guide.md](admin_guide.md)** でシステム構築・運用を実施
2. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** で障害対応手順を確認
3. **[API_COMPLETE.md](API_COMPLETE.md)** で技術詳細を把握

### 👥 **チーム・組織**
1. **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** でチーム協働システムを構築
2. **[research_workflows.md](research_workflows.md)** で標準ワークフローを確立
3. **[admin_guide.md](admin_guide.md)** で組織的運用体制を整備

---

**🎯 PokerInput MCP Server v4.2.0 マニュアル体系**  
**作者**: Yoshihiro Hirao | **ライセンス**: ISC