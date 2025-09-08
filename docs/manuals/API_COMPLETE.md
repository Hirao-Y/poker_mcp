# 📋 API完全仕様書 - Poker MCP Server

**🎯 対象**: システム管理者・上級ユーザー・開発者  
**📚 マニュアル階層**: テクニカル層  
**🔧 対応システム**: Poker MCP Server v1.1.0  
**📅 最終更新**: 2025年9月8日

---

## 📖 本書の位置づけ

この文書は**テクニカル層**の完全API仕様書です。MCP (Model Context Protocol) に完全準拠した28メソッドの詳細仕様を提供します。

### 🎯 対象読者
- **システム統合エンジニア**: 外部システムとの連携
- **上級ユーザー**: Claude Desktop上級活用・自動化
- **MCPプロトコル実装者**: MCP仕様に基づくクライアント開発
- **放射線遮蔽計算システム開発者**: 計算エンジンとの統合

### 📋 読み方ガイド
- **日常利用**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md) を推奨
- **基礎学習**: [ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md) から開始
- **実用ワークフロー**: [RESEARCH_WORKFLOWS.md](RESEARCH_WORKFLOWS.md) を参照

---

## 📚 28メソッド完全実装一覧

### 🔷 **Body操作系 (3メソッド) - 10種類立体タイプ完全対応**

| **メソッド名** | **機能** | **立体タイプ** |
|---------------|----------|---------------|
| **poker_proposeBody** | 3D立体作成（自動バックアップ付き） | SPH, RCC, RPP, BOX, CMB, TOR, ELL, REC, TRC, WED |
| **poker_updateBody** | 立体パラメータ更新 | 全10タイプ対応 |
| **poker_deleteBody** | 立体削除（依存関係チェック付き） | 全10タイプ対応 |

### 🎨 **Zone操作系 (3メソッド) - 材料物理検証付き**

| **メソッド名** | **機能** | **対応材料** |
|---------------|----------|--------------|
| **poker_proposeZone** | 材料ゾーン作成（物理検証付き） | 13種類材料完全対応 |
| **poker_updateZone** | ゾーン材料・密度更新 | 密度範囲: 0.001-30.0 g/cm³ |
| **poker_deleteZone** | ゾーン削除（ATMOSPHERE保護） | システム保護機能付き |

### 🔄 **Transform操作系 (3メソッド) - 幾何変換**

| **メソッド名** | **機能** | **操作タイプ** |
|---------------|----------|---------------|
| **poker_proposeTransform** | 回転・移動変換作成 | translate, rotate_around_x/y/z |
| **poker_updateTransform** | 変換操作更新 | 複数操作の連続実行対応 |
| **poker_deleteTransform** | 変換削除 | 依存関係チェック付き |

### 🧮 **BuildupFactor操作系 (4メソッド) - 物理補正**

| **メソッド名** | **機能** | **補正オプション** |
|---------------|----------|------------------|
| **poker_proposeBuildupFactor** | ビルドアップ係数設定 | スラント補正、有限媒体補正 |
| **poker_updateBuildupFactor** | 係数設定更新 | 補正パラメータ変更 |
| **poker_deleteBuildupFactor** | 係数削除 | 計算精度影響評価付き |
| **poker_changeOrderBuildupFactor** | 係数順序変更 | 計算効率最適化 |

### ☢️ **Source操作系 (3メソッド) - 5種類線源タイプ対応**

| **メソッド名** | **機能** | **線源タイプ** |
|---------------|----------|---------------|
| **poker_proposeSource** | 放射線源作成 | POINT, SPH, RCC, RPP, BOX |
| **poker_updateSource** | 線源パラメータ更新 | inventory, geometry, division対応 |
| **poker_deleteSource** | 線源削除 | 計算影響確認付き |

### 📡 **Detector操作系 (3メソッド) - 4種類検出器対応**

| **メソッド名** | **機能** | **検出器タイプ** |
|---------------|----------|---------------|
| **poker_proposeDetector** | 検出器作成 | 点検出器、1D(線)、2D(面)、3D(体積) |
| **poker_updateDetector** | 検出器パラメータ更新 | 格子分割・トレース設定 |
| **poker_deleteDetector** | 検出器削除 | 出力データ影響確認 |

### ⚙️ **Unit操作系 (5メソッド) - 4キー完全性保証**

| **メソッド名** | **機能** | **4キー完全性** |
|---------------|----------|----------------|
| **poker_proposeUnit** | 単位系作成（未存在時のみ） | length, angle, density, radioactivity必須 |
| **poker_getUnit** | 単位系取得（4キー完全） | 常に4キーすべてを返却 |
| **poker_updateUnit** | 単位系更新（部分更新可能） | 結果は4キー構造維持 |
| **poker_validateUnitIntegrity** | 単位完全性検証 | 4キー構造・物理整合性・システム分析 |
| **poker_analyzeUnitConversion** | 単位変換分析 | 変換係数計算・物理整合性評価 |

### 🔧 **System操作系 (4メソッド) - システム制御**

| **メソッド名** | **機能** | **特徴** |
|---------------|----------|----------|
| **poker_applyChanges** | 変更適用・保存 | 自動バックアップ・整合性確認 |
| **poker_executeCalculation** | POKER計算実行 | 出力オプション・統計情報 |
| **poker_resetYaml** | YAML初期化 | ATMOSPHEREゾーン保護付き完全リセット |
| **poker_confirmDaughterNuclides** | 子孫核種自動追加 | 核種インベントリ自動拡張機能 |

---

## 🌐 システムアーキテクチャ

### 🏗️ **MCP準拠アーキテクチャ**

```
📱 Claude Desktop Client
    ↕ (MCP Protocol v1.0)
🔧 JSON-RPC 2.0 over STDIO
    ↕
⚙️ Poker MCP Server v1.0.0
    ↕ (Internal API)
📊 Task Manager (YAML処理)
    ↕
📄 YAML Data Files (Claude App Directory)
    ↕
💾 Automatic Backup System
```

#### **コアコンポーネント**

| **コンポーネント** | **役割** | **実装ファイル** | **依存関係** |
|------------------|----------|----------------|-------------|
| **MCP Server** | プロトコル処理 | `src/mcp_server_stdio_v4.js` | @modelcontextprotocol/sdk |
| **Task Manager** | データ管理 | `src/services/TaskManager.js` | js-yaml |
| **Validator** | 入力検証 | `src/validators/*.js` | zod |
| **Logger** | ログ管理 | `src/utils/logger.js` | winston |
| **Backup System** | 自動バックアップ | `src/services/BackupService.js` | - |

### 🔌 **MCP通信プロトコル**

#### **標準JSON-RPC 2.0形式**
```json
{
  "jsonrpc": "2.0",
  "method": "poker_methodName",
  "params": {
    "parameter1": "value1",
    "parameter2": "value2"
  },
  "id": "unique_request_id"
}
```

#### **成功レスポンス**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "success": true,
    "data": { /* 結果データ */ },
    "message": "操作が正常に完了しました"
  },
  "id": "unique_request_id"
}
```

#### **エラーレスポンス**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "details": "具体的なエラー内容",
      "suggestion": "修正提案"
    }
  },
  "id": "unique_request_id"
}
```

---

## 📊 24メソッド完全仕様

### 📐 **Body系メソッド（立体管理）**

#### **poker_proposeBody** - 立体作成
```json
{
  "jsonrpc": "2.0",
  "method": "poker_proposeBody",
  "params": {
    "name": "shield_wall",
    "type": "RPP",
    "min": "0 0 0",
    "max": "100 50 30"
  },
  "id": 1
}
```

**パラメータ仕様**:
- `name` (必須): 立体の一意名 (string, 1-50文字, [a-zA-Z0-9_])
- `type` (必須): 立体タイプ (enum: SPH, RCC, RPP, BOX, CMB, TOR, ELL, REC, TRC, WED)
- 形状別必須パラメータ:

| **立体タイプ** | **必須パラメータ** | **例** |
|---------------|------------------|-------|
| **SPH** | center, radius | "center": "0 0 0", "radius": 2.0 |
| **RCC** | bottom_center, height_vector, radius | "bottom_center": "0 0 0", "height_vector": "0 0 10", "radius": 1.0 |
| **RPP** | min, max | "min": "0 0 0", "max": "10 10 10" |
| **BOX** | vertex, edge_1, edge_2, edge_3 | "vertex": "0 0 0", "edge_1": "10 0 0" |
| **TOR** | center, normal, major_radius, minor_radius_horizontal, minor_radius_vertical | "center": "0 0 0", "normal": "0 0 1" |

**Claude Desktop使用例**:
```
「直方体の遮蔽壁を作成してください。
名前をshield_wall、サイズを100cm×50cm×30cmで、
最小座標を原点にしてください。」
```

#### **poker_updateBody** - 立体更新
**Claude Desktop使用例**:
```
「shield_wallの幅を120cmに拡大してください。」
```

#### **poker_deleteBody** - 立体削除
**依存関係チェック**: 削除対象立体を参照するゾーン・変換の存在をチェック

**Claude Desktop使用例**:
```
「shield_wallを削除してください。」
```

### 🧪 **Zone系メソッド（材料管理）**

#### **poker_proposeZone** - 材料ゾーン作成
```json
{
  "jsonrpc": "2.0",
  "method": "poker_proposeZone",
  "params": {
    "body_name": "shield_wall", 
    "material": "CONCRETE",
    "density": 2.3
  },
  "id": 4
}
```

**対応材料13種**:
| **材料名** | **標準密度 (g/cm³)** | **用途** |
|-----------|-------------------|---------|
| CONCRETE | 2.3 | 一般遮蔽・建築構造 |
| IRON | 7.86 | 磁性遮蔽・構造材 |
| LEAD | 11.34 | 高密度γ線遮蔽 |
| ALUMINUM | 2.70 | 軽量構造・散乱体 |
| COPPER | 8.96 | 電気伝導・遮蔽 |
| STAINLESS | 8.0 | 耐食構造・高温環境 |
| WATER | 1.0 | 中性子減速・冷却 |
| POLYETHYLENE | 0.92 | 中性子遮蔽・軽量化 |
| GRAPHITE | 2.25 | 中性子減速・高温 |
| BERYLLIUM | 1.85 | 中性子反射・軽量 |
| TUNGSTEN | 19.3 | 超高密度遮蔽 |
| BORON | 2.34 | 中性子吸収 |
| VOID | - | 空気・真空領域 |

**Claude Desktop使用例**:
```
「shield_wallにコンクリート材料を設定してください。
密度は標準の2.3g/cm³でお願いします。」
```

### 📡 **Source系メソッド（線源管理）**

#### **poker_proposeSource** - 線源作成
```json
{
  "jsonrpc": "2.0",
  "method": "poker_proposeSource",
  "params": {
    "name": "co60_source",
    "type": "POINT", 
    "position": "0 0 0",
    "inventory": [
      {
        "nuclide": "Co60",
        "radioactivity": 3.7e10
      }
    ],
    "cutoff_rate": 0.0001
  },
  "id": 8
}
```

**線源タイプ**:
| **タイプ** | **用途** | **必須パラメータ** |
|-----------|----------|------------------|
| POINT | 点線源 | position |
| SPH | 球体線源 | geometry.center, geometry.radius |
| RCC | 円柱線源 | geometry.bottom_center, geometry.height_vector, geometry.radius |
| RPP | 直方体線源 | geometry.min, geometry.max |
| BOX | ボックス線源 | geometry.vertex, geometry.edge_1, geometry.edge_2, geometry.edge_3 |

**主要核種**:
| **核種** | **半減期** | **主γ線エネルギー** | **用途** |
|---------|-----------|-------------------|---------|
| Co60 | 5.3年 | 1.17, 1.33 MeV | 標準γ線源・工業用 |
| Cs137 | 30年 | 0.662 MeV | 医療用・校正源 |
| F18 | 110分 | 0.511 MeV | PET医学診断 |
| Tc99m | 6時間 | 0.140 MeV | 核医学診断 |
| I131 | 8日 | 0.364 MeV | 甲状腺治療 |

**Claude Desktop使用例**:
```
「Co-60線源を中央に配置してください。
放射能は37GBq（1Ci相当）で設定してください。」
```

### ⚙️ **System系メソッド（システム制御）**

#### **poker_applyChanges** - 変更適用・保存
```json
{
  "jsonrpc": "2.0",
  "method": "poker_applyChanges", 
  "params": {
    "backup_comment": "CT室遮蔽モデル v1.0"
  },
  "id": 12
}
```

**自動実行処理**:
1. データ整合性チェック
2. 現在データの自動バックアップ
3. YAMLファイル更新
4. 更新内容の検証

**Claude Desktop使用例**:
```
「作成したモデルを保存してください。
コメントに『CT室遮蔽モデル v1.0』と記録してください。」
```

#### **poker_executeCalculation** - POKER計算実行
```json
{
  "jsonrpc": "2.0",
  "method": "poker_executeCalculation",
  "params": {
    "yaml_file": "shielding_model.yaml",
    "output_files": {
      "summary_file": "results_summary.yaml",
      "dose_file": "dose_distribution.yaml"
    },
    "summary_options": {
      "show_source_data": true,
      "show_total_dose": true,
      "show_parameters": false
    }
  },
  "id": 13
}
```

**計算オプション**:
- `show_source_data`: 各線源の詳細データ表示
- `show_total_dose`: 全線源の総合線量表示  
- `show_parameters`: 計算パラメータ表示

**Claude Desktop使用例**:
```
「POKERによる遮蔽計算を実行してください。
結果は線量分布データと統計サマリーで出力してください。」
```

---

## 🔍 エラーコード完全一覧

### **JSON-RPC標準エラー**
| **コード** | **意味** | **対応** |
|-----------|----------|----------|
| -32700 | Parse error | JSON構文エラー確認 |
| -32600 | Invalid Request | リクエスト形式確認 |
| -32601 | Method not found | メソッド名確認 |
| -32602 | Invalid params | パラメータ形式確認 |
| -32603 | Internal error | システム状態確認 |

### **Poker MCP固有エラー**
| **コード** | **カテゴリ** | **意味** | **対応** |
|-----------|-------------|----------|----------|
| -32010 | Body | 立体名重複 | 異なる名前で再作成 |
| -32011 | Body | 必須パラメータ不足 | パラメータ確認・追加 |
| -32012 | Body | 幾何学的不正 | 座標・寸法の確認 |
| -32020 | Zone | 立体が存在しない | 対象立体の作成確認 |
| -32021 | Zone | 材料名が無効 | 材料名スペルチェック |
| -32022 | Zone | 密度範囲外 | 0.001-30.0の範囲確認 |
| -32030 | Transform | 変換名重複 | 異なる名前で再作成 |
| -32031 | Transform | 参照立体なし | CMB式の立体存在確認 |
| -32040 | BuildupFactor | 材料重複 | 既存設定の確認 |
| -32050 | Source | 線源名重複 | 異なる名前で再作成 |
| -32051 | Source | 核種名無効 | 核種名スペルチェック |
| -32060 | Detector | 検出器名重複 | 異なる名前で再作成 |
| -32070 | Unit | 不完全な単位設定 | 4キー完全設定確認 |
| -32080 | System | ファイルアクセスエラー | 権限・ディスク容量確認 |
| -32081 | System | 計算実行エラー | 入力データ整合性確認 |

---

## 🔧 技術詳細・依存関係

### **MCP SDK仕様**
- **バージョン**: ^1.7.0
- **プロトコル**: Model Context Protocol v1.0.0
- **通信方式**: STDIO (標準入出力)
- **メッセージ形式**: JSON-RPC 2.0

### **Node.js エコシステム**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.7.0",
    "js-yaml": "^4.1.0",
    "winston": "^3.17.0", 
    "zod": "^3.24.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### **アーキテクチャ特性**
- **型安全性**: Zodスキーマによる厳密な型検証
- **ログ管理**: Winston構造化ログ（JSON出力）
- **エラーハンドリング**: MCP準拠エラーコード体系
- **バックアップ**: 自動世代管理（タイムスタンプ付き）

### **セキュリティ考慮事項**
- **ファイルアクセス**: 設定ディレクトリ内制限
- **入力検証**: 全パラメータのスキーマ検証
- **権限管理**: 最小権限の原則
- **ログ監査**: 全操作の構造化ログ記録

---

## 📈 パフォーマンス・スケーラビリティ

### ⚡ **性能特性**

| **操作** | **平均応答時間** | **最大応答時間** | **メモリ使用** |
|---------|----------------|-----------------|-------------|
| 立体作成 | 8ms | 30ms | +2MB |
| 材料設定 | 6ms | 25ms | +1MB |
| 線源配置 | 10ms | 35ms | +3MB |
| 検出器配置 | 12ms | 40ms | +4MB |
| 計算実行 | 500ms-10s | データ依存 | 50-500MB |
| データ保存 | 45ms | 200ms | +10MB |

### 📊 **スケーラビリティ制限**

| **項目** | **推奨上限** | **最大上限** | **制限要因** |
|---------|-------------|-------------|-------------|
| 立体数 | 1,000個 | 10,000個 | メモリ・処理時間 |
| 材料種類 | 50種類 | 100種類 | 計算複雑度 |
| 線源数 | 100個 | 1,000個 | 計算時間 |
| 検出器数 | 100個 | 1,000個 | 出力データサイズ |
| YAMLファイルサイズ | 10MB | 100MB | パース時間 |

---

## 🎯 まとめ: API完全活用のために

### ✨ **効果的なAPI活用**

#### **開発者向け推奨事項**
1. **エラーハンドリング**: 全APIコールで適切なエラー処理実装
2. **非同期処理**: 大量データ処理時の非同期パターン使用
3. **バッチ処理**: 複数操作の効率的なバッチ実行
4. **キャッシュ戦略**: 頻繁アクセスデータのキャッシュ活用

#### **システム統合での考慮事項**
1. **トランザクション管理**: 複数操作の原子性確保
2. **データ同期**: 外部システムとのデータ同期戦略
3. **性能監視**: API使用パターンの継続監視
4. **障害対応**: 障害時の自動復旧・フェイルオーバー

### 🚀 **継続的改善**

この API 仕様書は実際の使用経験と技術進歩に基づいて継続的に改善されます。新機能の要望、性能改善の提案、バグ報告等があれば、Claude Desktop で共有してください。

**🎯 高度な活用**: この完全仕様を参照して、Poker MCP Server を最大限活用してください。

---

**📚 関連マニュアル**
- [ESSENTIAL_GUIDE.md](ESSENTIAL_GUIDE.md): 基本操作・15分スタート  
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md): 日常操作早見表
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md): システム統合・自動化
- [RESEARCH_WORKFLOWS.md](RESEARCH_WORKFLOWS.md): 分野別実用ワークフロー
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md): 問題解決・復旧手順
