# PokerInput MCP Server FINAL - 技術マニュアル 📚

## 📋 ドキュメント概要

**マニュアルバージョン**: 3.0.1 Final Edition  
**対応サーバー**: mcp_server_final_fixed.js  
**最終更新**: 2025年8月17日  
**作成者**: yoshihiro hirao

### 📑 マニュアル構成

このマニュアルは5つのファイルに分割されています：

| **ファイル** | **内容** | **対象読者** |
|-------------|----------|-------------|
| **MANUAL_01_OVERVIEW.md** | 概要・基本情報（このファイル） | 全利用者 |
| **MANUAL_02_API_REFERENCE.md** | API仕様・メソッド詳細 | 開発者・システム管理者 |
| **MANUAL_03_OPERATIONS.md** | 操作例・ワークフロー | 運用担当者・エンドユーザー |
| **MANUAL_04_TROUBLESHOOTING.md** | トラブルシューティング | システム管理者・サポート |
| **MANUAL_05_APPENDIX.md** | 付録・リファレンス | 全利用者 |

---

## 🚀 システム概要

### プロダクト情報

**PokerInput MCP Server FINAL** は、YAML形式の放射線遮蔽計算用入力ファイルを管理する本番環境対応のMCP（Model Context Protocol）サーバーです。

### 主要仕様

| **項目** | **仕様** |
|---------|---------|
| **バージョン** | 3.0.1 (Final Fixed Edition) |
| **サーバーファイル** | mcp_server_final_fixed.js |
| **プロトコル** | JSON-RPC 2.0 + MCP 1.0.0 |
| **ポート** | 3020 (デフォルト) |
| **Node.js要件** | ≥ 18.0.0 |
| **ステータス** | ✅ 本番環境対応完了 |

### アーキテクチャ

```
クライアント
    ↓ JSON-RPC 2.0
Express Server (Port 3020)
    ↓
TaskManager (メインロジック)
    ↓
YAML Files + Backup System
```

---

## ✨ 主要機能

### 🔧 完全実装されたMCPメソッド（15個）

#### 立体操作（3メソッド）
- **proposeBody**: 新しい3D形状の提案
- **updateBody**: 既存形状のパラメータ更新  
- **deleteBody**: 形状の削除

#### ゾーン操作（3メソッド）
- **proposeZone**: 材料領域の提案
- **updateZone**: 材料・密度の更新
- **deleteZone**: 領域の削除

#### 変換操作（3メソッド）
- **proposeTransform**: 回転・移動変換の提案
- **updateTransform**: 変換パラメータの更新
- **deleteTransform**: 変換の削除

#### ビルドアップ係数（4メソッド）
- **proposeBuildupFactor**: ビルドアップ係数の提案
- **updateBuildupFactor**: 係数パラメータの更新
- **deleteBuildupFactor**: 係数の削除
- **changeOrderBuildupFactor**: 計算順序の変更

#### 線源・システム（2メソッド）
- **proposeSource**: 放射線源の提案
- **applyChanges**: 全変更の実際のファイルへの適用

### 🛡️ 本番環境機能

#### データ安全性
- ✅ **実際のYAMLファイル更新**
- ✅ **自動バックアップ機能**（タイムスタンプ付き）
- ✅ **古いバックアップの自動クリーンアップ**（最新10個保持）
- ✅ **データ整合性チェック**
- ✅ **トランザクション安全性**

#### 信頼性・監視
- ✅ **完全なエラーハンドリング**
- ✅ **包括的なバリデーション**
- ✅ **詳細なログ出力**
- ✅ **ヘルスチェック機能**
- ✅ **グレースフルシャットダウン**

#### パフォーマンス
- ✅ **メモリ使用量最適化**
- ✅ **非同期処理対応**
- ✅ **リソースクリーンアップ**
- ✅ **高スループット対応**

---

## 📁 ファイル構造

### プロジェクト構成

```
poker_mcp/
├── 📁 本番サーバー
│   ├── mcp_server_final_fixed.js    # 🎯 本番用サーバー（推奨）
│   └── mcp_server_test_final.js     # テスト用軽量サーバー
├── 📁 設定・仕様
│   ├── mcp-manifest.json            # MCP仕様書
│   ├── package.json                 # Node.js設定
│   └── README.md                    # 基本説明書
├── 📁 マニュアル
│   ├── MANUAL_01_OVERVIEW.md        # このファイル
│   ├── MANUAL_02_API_REFERENCE.md   # API詳細仕様
│   ├── MANUAL_03_OPERATIONS.md      # 操作例・ワークフロー
│   ├── MANUAL_04_TROUBLESHOOTING.md # トラブルシューティング
│   └── MANUAL_05_APPENDIX.md        # 付録・リファレンス
├── 📁 データ
│   ├── tasks/
│   │   ├── pokerinputs.yaml        # メインデータファイル
│   │   └── pending_changes.json    # 保留中の変更
│   └── backups/                     # 自動バックアップ
│       └── pokerinputs-*.yaml      # タイムスタンプ付きバックアップ
└── 📁 その他
    ├── logs/                        # ログファイル（将来使用）
    └── node_modules/               # 依存関係
```

### 重要ファイル詳細

| **ファイル** | **役割** | **自動管理** |
|-------------|----------|-------------|
| **mcp_server_final_fixed.js** | メインサーバー | 手動起動 |
| **tasks/pokerinputs.yaml** | 計算入力データ | 自動更新 |
| **tasks/pending_changes.json** | 保留変更 | 自動管理 |
| **backups/*.yaml** | バックアップ | 自動作成・削除 |

---

## 🔧 システム要件

### 動作環境

| **コンポーネント** | **要件** | **推奨** |
|-------------------|----------|----------|
| **OS** | Windows 10/11, macOS 10.15+, Ubuntu 18.04+ | Windows 11, macOS 13+, Ubuntu 22.04+ |
| **Node.js** | ≥ 18.0.0 | ≥ 20.0.0 |
| **RAM** | 最小 512MB | 1GB以上 |
| **ディスク** | 最小 100MB | 1GB以上（ログ・バックアップ用） |
| **ネットワーク** | ポート3020開放 | ファイアウォール設定 |

### 必要な依存関係

```json
{
  "express": "^5.0.1",
  "js-yaml": "^4.1.0", 
  "cors": "^2.8.5",
  "@modelcontextprotocol/sdk": "^1.7.0",
  "winston": "^3.17.0",
  "zod": "^3.24.2"
}
```

---

## 🚀 クイックスタート

### 1. インストール

```bash
# プロジェクトディレクトリに移動
cd poker_mcp

# 依存関係のインストール
npm install

# 必要ディレクトリの確認
mkdir -p tasks backups logs
```

### 2. サーバー起動

```bash
# 本番環境対応サーバーの起動
node mcp_server_final_fixed.js

# または npm スクリプト使用
npm run start
```

### 3. 動作確認

```bash
# ヘルスチェック
curl http://localhost:3020/health

# または npm スクリプト使用
npm run health
```

### 4. 基本的な使用例

```bash
# 球体の提案
curl -X POST http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.proposeBody",
    "params": {
      "name": "sphere1",
      "type": "SPH",
      "center": "0 0 0",
      "radius": 10
    },
    "id": 1
  }'

# 変更の適用
curl -X POST http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.applyChanges",
    "params": {},
    "id": 2
  }'
```

---

## 📊 対応する立体タイプ

### 基本立体

| **タイプ** | **日本語名** | **必須パラメータ** | **説明** |
|------------|--------------|-------------------|----------|
| **SPH** | 球体 | center, radius | 中心と半径で定義 |
| **RCC** | 円柱 | center, axis, radius, height | 軸方向と高さ指定 |
| **RPP** | 直方体 | min, max | 最小・最大座標指定 |
| **BOX** | ボックス | vertex, vector1, vector2, vector3 | 頂点と3つのベクトル |

### 高度な立体

| **タイプ** | **日本語名** | **必須パラメータ** | **説明** |
|------------|--------------|-------------------|----------|
| **CMB** | 組み合わせ体 | operation | ブール演算による複合形状 |
| **TOR** | トーラス | center, axis, radius1, radius2 | ドーナツ型 |
| **ELL** | 楕円体 | center, vector1, vector2, vector3 | 楕円体 |
| **REC** | 円錐台 | center, axis, radius1, radius2, height | 台形断面の円錐 |
| **TRC** | 円錐 | center, axis, radius, height | 円錐 |
| **WED** | 楔形 | vertex, vector1, vector2, vector3 | 楔形状 |

---

## 🔗 関連ドキュメント

### 詳細情報
- **API仕様**: [MANUAL_02_API_REFERENCE.md](MANUAL_02_API_REFERENCE.md)
- **操作例**: [MANUAL_03_OPERATIONS.md](MANUAL_03_OPERATIONS.md)
- **トラブルシューティング**: [MANUAL_04_TROUBLESHOOTING.md](MANUAL_04_TROUBLESHOOTING.md)
- **付録**: [MANUAL_05_APPENDIX.md](MANUAL_05_APPENDIX.md)

### 外部リソース
- [Model Context Protocol仕様](https://modelcontextprotocol.io/specification)
- [JSON-RPC 2.0仕様](https://www.jsonrpc.org/specification)
- [YAML 1.2仕様](https://yaml.org/spec/1.2/spec.html)

---

**📝 このファイルは PokerInput MCP Server FINAL v3.0.1 の概要マニュアルです。**  
**詳細な技術情報は他のマニュアルファイルをご参照ください。**
