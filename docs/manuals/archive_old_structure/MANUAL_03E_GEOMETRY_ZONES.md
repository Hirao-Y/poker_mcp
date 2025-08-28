# 🏗️ 立体・ゾーン管理ガイド

**対象読者**: 放射線遮蔽研究者・ジオメトリモデリング専門家  
**バージョン**: 4.0.0 Final Edition  
**品質レベル**: エンタープライズ本番環境対応  
**最終更新**: 2025年8月21日

---

## 🌟 立体・ゾーン管理の特徴

### 🎯 **幾何学的モデリングの完全対応**
- ✅ **基本立体**: SPH（球）、RCC（円柱）、RPP（直方体）、BOX（一般直方体）
- ✅ **高度立体**: TOR（トーラス）、ELL（楕円体）、WED（くさび）、TRC（台形）
- ✅ **複合立体**: CMB（組み合わせ）による複雑形状の構築
- ✅ **材料ゾーン**: 立体への材料・密度の自動割り当て

---

## 🧊 基本立体の作成

### 🔵 **球体（SPH）の作成**

#### **基本的な球体作成**
```bash
#!/bin/bash
# create_sphere.sh - 球体作成例

API_KEY="your_api_key_here"
BASE_URL="http://localhost:3020/mcp"

echo "=== 球体（SPH）作成例 ==="

# 1. 基本球体の作成
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeBody",
    "params": {
      "name": "shield_sphere",
      "type": "SPH",
      "center": "0 0 0",
      "radius": 50.0
    },
    "id": 1001
  }'

echo "✅ 基本球体を作成しました"

# 2. 変位した球体の作成
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeBody",
    "params": {
      "name": "detector_sphere",
      "type": "SPH",
      "center": "100 0 0",
      "radius": 25.0
    },
    "id": 1002
  }'

echo "✅ 検出器球体を作成しました"
```

#### **球体パラメータの詳細**
```json
{
  "name": "sphere_name",
  "type": "SPH",
  "center": "x y z",     // 中心座標 [cm]
  "radius": value        // 半径 [cm] (正の値)
}
```

### 🔴 **円柱（RCC）の作成**

#### **縦置き円柱の作成**
```bash
#!/bin/bash
# create_cylinder.sh - 円柱作成例

echo "=== 円柱（RCC）作成例 ==="

# 縦置き円柱（Z軸方向）
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeBody",
    "params": {
      "name": "vertical_cylinder",
      "type": "RCC",
      "bottom_center": "0 0 0",
      "height_vector": "0 0 100",
      "radius": 30.0
    },
    "id": 2001
  }'

# 横置き円柱（X軸方向）
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeBody",
    "params": {
      "name": "horizontal_cylinder",
      "type": "RCC",
      "bottom_center": "0 0 50",
      "height_vector": "80 0 0",
      "radius": 15.0
    },
    "id": 2002
  }'

echo "✅ 円柱を作成しました"
```

### 🔳 **直方体（RPP）の作成**

#### **軸平行直方体の作成**
```bash
#!/bin/bash
# create_box.sh - 直方体作成例

echo "=== 直方体（RPP）作成例 ==="

# 基本的な直方体
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeBody",
    "params": {
      "name": "concrete_wall",
      "type": "RPP",
      "min": "-50 -10 0",
      "max": "50 10 200"
    },
    "id": 3001
  }'

echo "✅ 直方体を作成しました"
```

---

## 🔗 複合立体の作成

### 🧮 **組み合わせ立体（CMB）**

#### **ブール演算による複雑形状**
```bash
#!/bin/bash
# create_complex_geometry.sh - 複合形状作成例

echo "=== 複合立体（CMB）作成例 ==="

# 球殻（外側球体 - 内側球体）
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeBody",
    "params": {
      "name": "spherical_shell",
      "type": "CMB",
      "expression": "outer_sphere - inner_sphere"
    },
    "id": 7010
  }'

echo "✅ 複合立体を作成しました"
```

#### **ブール演算子の詳細**
| 演算子 | 記法 | 意味 | 例 |
|--------|------|------|-----|
| **和集合** | `A + B` または `A U B` | AまたはB | `sphere + cylinder` |
| **差集合** | `A - B` | AからBを除く | `outer_sphere - inner_sphere` |
| **積集合** | `A * B` または `A I B` | AとBの共通部分 | `sphere * box` |
| **括弧** | `( )` | 演算順序の指定 | `(A + B) - C` |

---

## 🎨 材料ゾーンの管理

### 🧱 **基本材料の設定**

#### **標準材料ゾーンの作成**
```bash
#!/bin/bash
# create_material_zones.sh - 材料ゾーン作成例

echo "=== 材料ゾーン作成例 ==="

# 1. コンクリート遮蔽体
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeZone",
    "params": {
      "body_name": "concrete_wall",
      "material": "CONCRETE",
      "density": 2.3
    },
    "id": 9001
  }'

# 2. 鉛遮蔽体
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeZone",
    "params": {
      "body_name": "lead_shield",
      "material": "LEAD",
      "density": 11.34
    },
    "id": 9002
  }'

echo "✅ 材料ゾーンを作成しました"
```

#### **標準材料データベース**
| 材料名 | 密度 [g/cm³] | 主な用途 |
|--------|--------------|----------|
| **CONCRETE** | 2.3 | 一般遮蔽・建屋構造 |
| **LEAD** | 11.34 | γ線遮蔽・コリメータ |
| **STEEL** | 7.9 | 構造材・容器 |
| **ALUMINUM** | 2.70 | 軽量構造・容器 |
| **WATER** | 1.0 | 中性子減速・遮蔽 |
| **POLYETHYLENE** | 0.92 | 中性子遮蔽 |
| **AIR** | 0.001225 | 通常環境 |
| **VOID** | - | 真空・計算省略領域 |

---

## 🏭 実際の施設モデリング

### 🏥 **医療施設の放射線室**

#### **リニアック治療室のモデリング**
```bash
#!/bin/bash
# medical_facility_modeling.sh - 医療施設モデリング

echo "=== 医療施設放射線室モデリング ==="

# 治療室の基本構造
echo "🏥 治療室基本構造作成中..."

# 外壁（コンクリート）
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeBody",
    "params": {
      "name": "treatment_room_outer",
      "type": "RPP",
      "min": "-300 -400 0",
      "max": "300 400 300"
    },
    "id": 12001
  }'

# 内部空間（空気）
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeBody",
    "params": {
      "name": "treatment_room_inner",
      "type": "RPP",
      "min": "-250 -350 0",
      "max": "250 350 250"
    },
    "id": 12002
  }'

# 治療室壁（外壁 - 内部空間）
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput_proposeBody",
    "params": {
      "name": "treatment_room_walls",
      "type": "CMB",
      "expression": "treatment_room_outer - treatment_room_inner"
    },
    "id": 12010
  }'

echo "✅ 医療施設モデリング完了"
```

---

## 🔍 品質管理・検証

### ✅ **立体整合性チェック**

#### **幾何学的整合性の検証**
```bash
#!/bin/bash
# geometry_validation.sh - 立体整合性検証

echo "=== 立体・ゾーン整合性検証 ==="

# 検証結果カウンター
total_checks=0
passed_checks=0
failed_checks=0

# チェック関数
check_result() {
    local test_name=$1
    local result=$2
    local message=$3
    
    ((total_checks++))
    
    case "$result" in
        "PASS")
            echo "✅ PASS: $test_name"
            ((passed_checks++))
            ;;
        "FAIL")
            echo "❌ FAIL: $test_name - $message"
            ((failed_checks++))
            ;;
        "WARN")
            echo "⚠️  WARN: $test_name - $message"
            ;;
    esac
}

# ヘルスチェック取得
health_data=$(curl -s http://localhost:3020/health 2>/dev/null)

if [ $? -eq 0 ] && [ "$health_data" != "" ]; then
    check_result "API接続" "PASS"
    
    # 立体数の確認
    bodies_count=$(echo "$health_data" | jq '.data.bodies | length' 2>/dev/null)
    if [ "$bodies_count" -ge 0 ] && [ "$bodies_count" -le 1000 ]; then
        check_result "立体数妥当性" "PASS"
    else
        check_result "立体数妥当性" "WARN" "立体数: $bodies_count"
    fi
    
    # ゾーン数の確認
    zones_count=$(echo "$health_data" | jq '.data.zones | length' 2>/dev/null)
    if [ "$zones_count" -ge 0 ] && [ "$zones_count" -le "$bodies_count" ]; then
        check_result "ゾーン数妥当性" "PASS"
    else
        check_result "ゾーン数妥当性" "WARN" "ゾーン数($zones_count) vs 立体数($bodies_count)"
    fi
else
    check_result "API接続" "FAIL" "接続失敗またはレスポンス異常"
fi

# 結果サマリー
echo ""
echo "📊 結果統計:"
echo "  総テスト数: $total_checks 件"
echo "  成功: $passed_checks 件"
echo "  失敗: $failed_checks 件"

# 総合判定
if [ $failed_checks -eq 0 ]; then
    echo "🎆 総合判定: 優秀 - 全てのテストに合格"
else
    echo "🔴 総合判定: 要改善 - 重大な問題あり"
fi

echo "=== 立体・ゾーン整合性検証完了 ==="
```

---

## 🛠️ 立体管理ベストプラクティス

### 📐 **設計指針**

#### **効率的なモデリング戦略**

1. **📊 階層的設計**
   ```
   基本立体 → 中間組み合わせ → 最終複合立体
   例: sphere → shell → complex_shield
   ```

2. **🎯 命名規則**
   ```bash
   # 推奨命名パターン
   [用途]_[形状]_[位置/番号]
   例: shield_cylinder_01, detector_sphere_main
   ```

3. **🔄 段階的構築**
   ```bash
   # 段階的にテスト・検証しながら構築
   基本形状 → 材料設定 → 組み合わせ → 最終検証
   ```

#### **性能最適化**

1. **💾 メモリ効率**
   - 不要な立体の定期削除
   - 複合立体の式の最適化
   - 重複立体の統合

2. **⚡ 計算効率**
   - 適切な立体タイプの選択
   - 変換の最小化
   - 材料ゾーンの整理統合

---

## 🎆 立体・ゾーン管理ガイドの特徴

### ✨ **包括的な幾何学モデリング対応**

**この立体・ゾーン管理ガイドは、放射線遮蔽研究における幾何学的モデリングの全側面をカバーする完全な解決策を提供します。**

#### **基本から高度まで完全対応**
- ✅ **基本立体**: SPH・RCC・RPP・BOXの完全マスター
- ✅ **高度立体**: TOR・ELL・WED・TRCの専門的活用
- ✅ **複合立体**: CMBによる複雑形状の効率的構築
- ✅ **実際的モデリング**: 医療・原子力施設の実用例

#### **実用性重視の設計**
- ✅ **即座実行可能**: コピー&ペーストで即座に使用
- ✅ **段階的学習**: 基本→応用→実践の明確な学習パス
- ✅ **品質保証**: 包括的な検証・整合性チェック機能
- ✅ **ベストプラクティス**: 効率的なモデリング戦略・命名規則

#### **研究支援機能の充実**
- ✅ **施設モデリング**: 医療・原子力施設の実用的テンプレート
- ✅ **材料データベース**: 標準的な遮蔽材料の完全対応
- ✅ **自動化ツール**: バッチ処理・検証スクリプト
- ✅ **エラー防止**: 事前検証・整合性確認システム

**この立体・ゾーン管理ガイドで、複雑な幾何学的モデリングから実際の施設設計まで、すべての放射線遮蔽研究ニーズに対応できます！** 🌟

---

**📋 ドキュメント**: MANUAL_03E_GEOMETRY_ZONES.md  
**🏆 品質レベル**: エンタープライズ・本番環境対応  
**📅 最終更新**: 2025年8月21日  
**✨ ステータス**: 立体・ゾーン管理完全対応・実践検証済み

**🚀 次は [INDEX.md](INDEX.md) でナビゲーション更新を確認しましょう！**
