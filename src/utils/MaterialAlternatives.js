// utils/MaterialAlternatives.js - 材料代替マッピング機能
import { PokerMcpError } from './mcpErrors.js';

/**
 * 材料代替マッピング管理クラス
 * マニフェストで定義された材料代替情報を活用
 */
export class MaterialAlternatives {
  // マニフェストに対応する材料代替マッピング
  static ALTERNATIVES = {
    'STEEL': { substitute: 'Iron', note: '一般的な構造用鋼はIronで代替' },
    'STAINLESS_STEEL': { substitute: 'Iron', note: 'ステンレス鋼もIronで代替可能' },
    'BRASS': { substitute: 'Copper', note: '真鍮はCopperで代替' },
    'BRONZE': { substitute: 'Copper', note: '青銅はCopperで代替' },
    'GLASS': { substitute: 'PyrexGlass', note: '一般ガラスはPyrexGlassで代替' },
    'PLASTIC': { substitute: 'AcrylicResin', note: '一般プラスチックはAcrylicResinで代替' },
    'EARTH': { substitute: 'Soil', note: '土壌はSoilで代替' },
    'VOID_SPACE': { substitute: 'VOID', note: '真空空間はVOIDで代替' },
    'ATMOSPHERE': { substitute: 'Air', note: '大気はAirで代替' }
  };

  // サポートされる材料一覧（マニフェストと同期）
  static SUPPORTED_MATERIALS = [
    'Carbon', 'Concrete', 'Iron', 'Lead', 'Aluminum',
    'Copper', 'Tungsten', 'Air', 'Water', 'PyrexGlass',
    'AcrylicResin', 'Polyethylene', 'Soil', 'VOID'
  ];

  /**
   * 材料名の代替提案を取得
   * @param {string} material - 入力された材料名
   * @returns {Object|null} 代替情報またはnull
   */
  static getAlternative(material) {
    if (!material) return null;
    
    // 大文字小文字を正規化
    const normalizedMaterial = material.toUpperCase();
    
    return this.ALTERNATIVES[normalizedMaterial] || null;
  }

  /**
   * 材料名のファジーマッチングによる提案
   * @param {string} material - 入力された材料名
   * @returns {string|null} 最も類似する材料名
   */
  static findSimilarMaterial(material) {
    if (!material) return null;
    
    const input = material.toLowerCase();
    
    // 部分一致による検索
    for (const supported of this.SUPPORTED_MATERIALS) {
      if (supported.toLowerCase().includes(input) || 
          input.includes(supported.toLowerCase())) {
        return supported;
      }
    }
    
    // 代替材料名での検索
    for (const [alt, info] of Object.entries(this.ALTERNATIVES)) {
      if (alt.toLowerCase().includes(input) || 
          input.includes(alt.toLowerCase())) {
        return info.substitute;
      }
    }
    
    return null;
  }

  /**
   * 包括的な材料チェックとエラー生成
   * @param {string} material - チェック対象材料名
   * @param {string} fieldName - フィールド名（エラー用）
   * @throws {PokerMcpError} サポートされていない材料の場合
   */
  static validateMaterialWithSuggestion(material, fieldName = 'material') {
    if (!material) {
      throw PokerMcpError.validationError('Material name is required', fieldName, material);
    }

    // サポートされている材料かチェック
    if (this.SUPPORTED_MATERIALS.includes(material)) {
      return true; // 正常
    }

    // 代替材料の提案
    const alternative = this.getAlternative(material);
    if (alternative) {
      throw PokerMcpError.unsupportedMaterialWithSuggestion(
        material,
        alternative.substitute,
        this.SUPPORTED_MATERIALS
      );
    }

    // ファジーマッチングによる提案
    const similar = this.findSimilarMaterial(material);
    if (similar) {
      throw PokerMcpError.unsupportedMaterialWithSuggestion(
        material,
        similar,
        this.SUPPORTED_MATERIALS
      );
    }

    // 一般的なエラー（提案なし）
    throw PokerMcpError.validationError(
      `Unsupported material: ${material}. Supported materials: ${this.SUPPORTED_MATERIALS.join(', ')}`,
      fieldName,
      material
    );
  }

  /**
   * 材料特性情報の取得
   * @param {string} material - 材料名
   * @returns {Object|null} 材料特性情報
   */
  static getMaterialInfo(material) {
    if (!this.SUPPORTED_MATERIALS.includes(material)) {
      return null;
    }

    // マニフェストの material_constraints に対応
    const materialInfo = {
      'Carbon': { 
        typical_use: 'グラファイト、炭素繊維構造材',
        shielding_properties: '軽量遮蔽材'
      },
      'Concrete': { 
        typical_use: '建築構造、放射線遮蔽壁',
        shielding_properties: '汎用遮蔽材、経済的'
      },
      'Iron': { 
        typical_use: '鉄鋼構造、STEEL代替',
        shielding_properties: '中重量遮蔽材、構造材兼用'
      },
      'Lead': { 
        typical_use: '高効率遮蔽材',
        shielding_properties: '高密度γ線遮蔽材'
      },
      'Aluminum': { 
        typical_use: '軽量構造材',
        shielding_properties: '軽量遮蔽材、耐食性'
      },
      'Copper': { 
        typical_use: 'BRASS/BRONZE代替',
        shielding_properties: '中重量遮蔽材、導電性'
      },
      'Tungsten': { 
        typical_use: '超高密度遮蔽材',
        shielding_properties: '最高密度遮蔽材'
      },
      'Air': { 
        typical_use: '大気、ATMOSPHERE代替',
        shielding_properties: '透明媒体'
      },
      'Water': { 
        typical_use: '中性子減速材、冷却材',
        shielding_properties: '中性子遮蔽材'
      },
      'PyrexGlass': { 
        typical_use: 'GLASS代替、耐熱ガラス',
        shielding_properties: '透明遮蔽材'
      },
      'AcrylicResin': { 
        typical_use: 'PLASTIC代替、透明樹脂',
        shielding_properties: '軽量透明遮蔽材'
      },
      'Polyethylene': { 
        typical_use: '中性子遮蔽樹脂',
        shielding_properties: '中性子減速・遮蔽材'
      },
      'Soil': { 
        typical_use: 'EARTH代替、土壌遮蔽',
        shielding_properties: '天然遮蔽材'
      },
      'VOID': { 
        density_specification: 'prohibited',
        typical_use: '真空、VOID_SPACE代替',
        shielding_properties: '非遮蔽領域'
      }
    };

    return materialInfo[material] || null;
  }
}
