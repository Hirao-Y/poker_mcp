# poker_mcp MCPサーバー メソッド一覧

## 基本情報
- **サーバー名**: pokerinput-mcp
- **バージョン**: 1.0.1  
- **説明**: PokerInput MCP Server
- **エンドポイント**: http://localhost:3000/mcp (JSON-RPC)

---

## 📋 全メソッド一覧 (15個)

### 🔄 変更管理
**1. pokerinput.applyChanges**
- **機能**: 保留中の変更をYAMLファイルに適用
- **パラメータ**: なし
- **説明**: pending_changes.jsonの変更内容をpokerinputs.yamlに反映

---

### 🔶 Body（立体形状）管理

**2. pokerinput.proposeBody**
- **機能**: 新しい立体形状を提案
- **必須パラメータ**: 
  - `name`: 立体名
  - `type`: 立体タイプ (SPH, RPP, RCC, CMB等)
- **オプション**: 立体タイプに応じたパラメータ
- **例**: `{ name: "Box1", type: "RPP", min: "0 0 0", max: "10 10 10" }`

**3. pokerinput.deleteBody**
- **機能**: 既存の立体を削除
- **必須パラメータ**: 
  - `name`: 削除する立体名

**4. pokerinput.updateBody**
- **機能**: 既存の立体のパラメータを更新
- **必須パラメータ**: 
  - `name`: 更新する立体名
- **オプション**: 更新したいパラメータ

---

### 🌐 Zone（材質ゾーン）管理

**5. pokerinput.proposeZone**
- **機能**: 立体に材質と密度を割り当てるゾーンを提案
- **必須パラメータ**: 
  - `body_name`: 対象立体名
  - `material`: 材質名
- **オプション**: 
  - `density`: 密度 (g/cm³)
- **例**: `{ body_name: "Box1", material: "Lead", density: 11.34 }`

**6. pokerinput.deleteZone**
- **機能**: 既存のゾーンを削除
- **必須パラメータ**: 
  - `body_name`: 削除するゾーンの立体名

**7. pokerinput.updateZone**
- **機能**: 既存のゾーンの材質や密度を更新
- **必須パラメータ**: 
  - `body_name`: 更新するゾーンの立体名
- **オプション**: 
  - `material`: 新しい材質
  - `density`: 新しい密度
  - `new_body_name`: 新しい立体名

---

### 🔄 Transform（座標変換）管理

**8. pokerinput.proposeTransform**
- **機能**: 座標変換（回転・平行移動）を提案
- **必須パラメータ**: 
  - `name`: 変換名
  - `operation`: 変換操作の配列
- **対応操作**: 
  - `rotate_around_x/y/z`: 軸周りの回転
  - `rotate_by_axis_angle`: 任意軸周りの回転
  - `rotate_by_matrix`: 回転行列
  - `translate`: 平行移動

**9. pokerinput.deleteTransform**
- **機能**: 既存の座標変換を削除
- **必須パラメータ**: 
  - `name`: 削除する変換名

**10. pokerinput.updateTransform**
- **機能**: 既存の座標変換を更新
- **必須パラメータ**: 
  - `name`: 更新する変換名
- **オプション**: 
  - `new_name`: 新しい変換名
  - `operation`: 新しい変換操作

---

### 📊 BuildupFactor（ビルドアップ係数）管理

**11. pokerinput.proposeBuildupFactor**
- **機能**: 材質のビルドアップ係数設定を提案
- **必須パラメータ**: 
  - `material`: 材質名
- **オプション**: 
  - `use_slant_correction`: スラント補正使用 (boolean)
  - `use_finite_medium_correction`: 有限媒質補正使用 (boolean)

**12. pokerinput.changeOrderBuildupFactor**
- **機能**: ビルドアップ係数の順序を変更
- **必須パラメータ**: 
  - `material`: 対象材質名
  - `newIndex`: 新しいインデックス

**13. pokerinput.deleteBuildupFactor**
- **機能**: ビルドアップ係数設定を削除
- **必須パラメータ**: 
  - `material`: 削除する材質名

**14. pokerinput.updateBuildupFactor**
- **機能**: ビルドアップ係数設定を更新
- **必須パラメータ**: 
  - `material`: 更新する材質名
- **オプション**: 
  - `use_slant_correction`: スラント補正使用
  - `use_finite_medium_correction`: 有限媒質補正使用

---

### ⚡ Source（放射線源）管理

**15. pokerinput.proposeSource**
- **機能**: 放射線源を提案
- **必須パラメータ**: 
  - `name`: 源名
  - `type`: 源タイプ (POINT, BOX, RPP, SPH, RCC)
  - `inventory`: 核種と放射能の配列
  - `cutoff_rate`: カットオフ率
- **オプション**: タイプに応じた幾何パラメータ

---

## 🧪 利用可能な材質

放射線遮蔽計算で使用できる材質（デフォルト密度付き）:

| 材質名 | 密度 (g/cm³) | 用途 |
|--------|--------------|------|
| Concrete | 2.1 | 一般コンクリート |
| Iron | 7.8 | 鉄 |
| Lead | 11.0 | 鉛遮蔽体 |
| Water | 1.0 | 水・減速材 |
| Air | 0.001205 | 空気 |
| Polyethylene | 0.92 | 中性子遮蔽 |
| Tungsten | 19.0 | 高密度遮蔽 |
| Aluminium | 2.7 | アルミニウム |
| Copper | 8.9 | 銅 |
| Carbon | 2.2 | 炭素・黒鉛 |
| その他 | - | 専門材質多数対応 |

---

## 📝 使用例

```javascript
// 1. 鉛ブロックの作成
await mcp.call('pokerinput.proposeBody', {
  name: 'LeadShield',
  type: 'RPP', 
  min: '0 0 0',
  max: '50 50 20'
});

// 2. 材質割り当て
await mcp.call('pokerinput.proposeZone', {
  body_name: 'LeadShield',
  material: 'Lead',
  density: 11.34
});

// 3. 変更適用
await mcp.call('pokerinput.applyChanges', {});
```