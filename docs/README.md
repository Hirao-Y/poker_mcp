# Poker MCP Server - 放射線遮蔽計算支援ツール v1.2.5

**Claude対応** 放射線遮蔽計算用YAML入力ファイル管理ツール（28メソッド完全実装）

## 🔬 概要

Poker MCP Serverは、放射線遮蔽計算の入力ファイル作成を効率化するClaude用のMCPサーバーです。複雑な3D遮蔽モデルの設計から材料配置、線源設定まで、自然言語での対話を通じて直感的に操作できます。

### 🎯 対象ユーザー
- 放射線遮蔽研究者
- 医療施設の遮蔽設計者
- 原子力施設の安全評価者
- 放射線防護の実務者

### ⚛️ 物理的背景
放射線遮蔽計算では、複雑な3D形状モデルの作成、材料物性の設定、線源配置など、多くのパラメータを正確に設定する必要があります。本ツールは、これらの設定プロセスを自動化し、計算品質の向上と作業効率化を実現します。

### 🆕 v1.2.5 新機能
- **28メソッド完全実装**: Unit操作5メソッドを含む全機能
- **子孫核種自動追加**: ICRP-07準拠の放射平衡考慮
- **サマリーファイル完全解析**: 4セクション対応
- **エラーコード13種対応**: 即座の問題解決
- **自動修復機能**: YAMLファイル破損時の復旧

---

## 🚀 Claude Desktopでの設定方法

### 📋 前提条件
- Node.js 18.0.0以上
- Claude Desktop アプリケーション

### 🌍 環境変数設定（オプション）

#### POKER_INSTALL_PATH環境変数
この環境変数は、POKERライブラリのインストールディレクトリを指定します。

- **目的**: `lib/ICRP-07.NDX`核種データベースファイルの取得元ディレクトリ指定
- **デフォルト値**: `C:/Poker`
- **動作**: 初回起動時に`{POKER_INSTALL_PATH}/lib/ICRP-07.NDX`を`data/`ディレクトリにコピー
- **注意**: `data/ICRP-07.NDX`が既に存在する場合はコピーをスキップ

**設定例**:
```bash
# Windows (コマンドプロンプト)
set POKER_INSTALL_PATH=C:/Poker

# Windows (PowerShell)
$env:POKER_INSTALL_PATH="C:/Poker"

# Linux/macOS
export POKER_INSTALL_PATH="/usr/local/share/poker"
```

### ⚙️ 設定手順

#### 1. Claude Desktop設定ファイルを開く
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

#### 2. MCP設定を追加
```json
{
  "mcpServers": {
    "poker-mcp": {
      "command": "node",
      "args": ["C:/Users/yoshi/Desktop/poker_mcp/src/mcp_server_stdio_v4.js"],
      "env": {
        "POKER_INSTALL_PATH": "C:/Poker"
      }
    }
  }
}
```

#### 3. NPXを使用する場合（推奨）
```json
{
  "mcpServers": {
    "poker-mcp": {
      "command": "npx",
      "args": ["poker-mcp"],
      "env": {
        "POKER_INSTALL_PATH": "C:/Poker"
      }
    }
  }
}
```

#### 4. Claude Desktopを再起動
設定後、Claude Desktopを完全に終了して再起動してください。

#### 5. 動作確認
Claudeに「poker_getUnitで単位系を確認して」と入力し、MCPツールが利用可能か確認してください。

**注意**:
- `env`セクションの`POKER_INSTALL_PATH`はオプションです（省略時は`C:/Poker`を使用）
- 環境変数で指定したパスの`lib/ICRP-07.NDX`ファイルが初回起動時に自動的に`data/`ディレクトリにコピーされます
- 既に`data/ICRP-07.NDX`が存在する場合は、コピー処理はスキップされます

---

## ⚡ 15分クイックスタート

### 🧪 基本的な遮蔽計算例

#### **例1: 医療用Co-60線源の遮蔽壁設計（子孫核種考慮）**
```
「Co-60線源（放射能37GBq）の遮蔽用に、厚さ30cmのコンクリート壁を作成してください。
サイズは100cm×200cm×30cmで、密度2.3g/cm³で設定してください。
子孫核種も自動的に考慮してください。」
```

#### **例2: PET-CT施設の複合遮蔽（Unit操作活用）**
```
「PET-CT×500×300cm、壁厚: コンクリート30cm、F-18線源: 最大750MBq
poker_confirmDaughterNuclidesで子孫核種を確認してください。」
```

### ⚛️ 原子炉遮蔽評価（サマリーファイル解析）
```
「原子炉の生体遮蔽を評価し、計算後はサマリーファイル4セクションを解析してください。
圧力容器: 内径4m、壁厚20cmの円柱、ステンレス鋼
生体遮蔽: 厚さ2m、普通コンクリート（密度2.3g/cm³）
線源: Co-60とCs-137、子孫核種も自動考慮してください。」
```

### 🔬 実験室遮蔽計画（エラーコード対処）
```
「中性子実験室の遮蔽設計で、既存の立体を更新してください。
エラーコード-32064が出た場合は自動的にpoker_updateBodyを使用してください。
単位系の整合性はpoker_validateUnitIntegrityで確認してください。」
```

---

## 📊 システム仕様（v1.2.5）

### 💻 動作要件
- **Node.js**: 18.0.0以上（推奨: 20.0.0以上）
- **メモリ**: 最小512MB（推奨: 1GB以上）
- **ディスク**: 最小100MB（推奨: 1GB以上）
- **OS**: Windows, macOS, Linux

### ⚡ パフォーマンス
- **メソッド応答**: <50ms（28メソッド全対応）
- **データ保存**: <200ms
- **メモリ使用**: 40-200MB（データサイズ依存）
- **自動修復**: <1秒（YAMLファイル破損時）

### 🔒 データ安全性
- 自動バックアップ（全操作で実行）
- 変更前データの保護
- データ整合性チェック（Unit操作5メソッド）
- エラー時の自動復旧・ロールバック
- 13種エラーコードの即座対処

---

## 🔗 外部連携（v1.2.5強化）

### 📊 POKER計算コード連携
- YAML入力ファイル生成（28メソッド対応）
- poker_cui実行サポート
- サマリーファイル（4セクション）取得と解析
- 子孫核種の自動考慮

### 🐍 Python自動化対応
```python
# サマリーファイル4セクション解析例
import yaml
with open('poker.yaml.summary', 'r') as f:
    summary = yaml.safe_load(f)
    
# 4セクションの解析
input_params = summary['入力パラメータ']
intermediate = summary['intermediate']
results = summary['result']
total_doses = summary['result_total']
```

### 📈 結果処理（v1.2.5拡張）
- サマリーファイル4セクションの自動解析
- 線量率分布の可視化
- 規制値との自動比較
- 安全評価レポートの生成

---

## ⚠️ 注意事項（v1.2.5）

### 🔧 システム制限
- YAMLファイルサイズ: 推奨10MB以下
- 立体数: 推奨1000個以下
- 同時実行: 単一MCPセッションのみ
- エラーコード: 13種類に自動対応

### 📋 データ形式
- 座標: cm単位（Unit操作で変更可能）
- 密度: g/cm³単位
- 放射能: Bq単位
- 角度: 度またはラジアン（Unit操作で設定）

### 💾 バックアップと復旧
- 自動バックアップは各操作で実行
- YAMLファイル破損時の自動修復機能
- エラーコード対応による問題解決
- 重要なデータは外部保存を推奨

---

## 📞 サポート（v1.2.5対応）

### 🆘 問題発生時
1. **エラーコード確認**: 13種類のエラーコードから対処法特定
2. **[TROUBLESHOOTING.md](manuals/TROUBLESHOOTING.md)** を確認（v1.2.5更新）
3. **自動修復機能**の活用（YAMLファイル破損時）
4. **Unit操作**で単位系の整合性確認

### 📧 技術サポート
- **基本操作**: [ESSENTIAL_GUIDE.md](manuals/ESSENTIAL_GUIDE.md)参照
- **28メソッド詳細**: [API_COMPLETE.md](manuals/API_COMPLETE.md)参照
- **物理的背景**: [PHYSICS_REFERENCE.md](manuals/PHYSICS_REFERENCE.md)参照（v1.2.5更新）
- **トラブル**: [TROUBLESHOOTING.md](manuals/TROUBLESHOOTING.md)参照（v1.2.5更新）

---

## 🌟 プロジェクトの価値（v1.2.5）

### ✨ 研究者への価値
- **効率化**: 28メソッドによる入力ファイル作成時間80%短縮
- **品質向上**: Unit操作5メソッドによる設定ミスゼロ化
- **精度向上**: 子孫核種自動考慮による物理的完全性
- **検証強化**: サマリーファイル4セクション解析

### 🏢 組織への価値
- **標準化**: 28メソッドによる手法統一
- **エラー削減**: 13種エラーコード自動対処
- **知識共有**: サマリーファイル解析の形式知化
- **品質保証**: Unit操作による国際標準準拠

### 🌍 社会的価値
- **安全性向上**: 子孫核種考慮による精密計算
- **医療安全**: Unit操作による単位ミス防止
- **研究促進**: サマリーファイル解析効率化
- **教育支援**: 28メソッドによる体系的学習

---

## 📜 ライセンス

**ISC License** - オープンソースライセンス

---

## 🔄 v1.2.5 更新履歴

- ✅ **28メソッド完全実装**: Unit操作5メソッド・System系4メソッド追加
- ✅ **子孫核種自動追加**: confirmDaughterNuclidesメソッド実装
- ✅ **サマリーファイル4セクション**: 完全解析対応
- ✅ **エラーコード13種**: 即座の問題解決
- ✅ **マニュアル3件更新**: PHYSICS_REFERENCE、RESEARCH_WORKFLOWS、TROUBLESHOOTING

---

**🚀 今すぐ始める**: Claude Desktopで「poker_getUnitで単位系を確認して」と入力
**📚 詳細学習**: [manuals/](manuals/)フォルダの各マニュアル参照（v1.2.5更新）
**⚡ 素早く参照**: [QUICK_REFERENCE.md](manuals/QUICK_REFERENCE.md)で28メソッド確認
**💡 NPX使用**: [NPX_USAGE.md](NPX_USAGE.md)でNPXインストール方法を確認