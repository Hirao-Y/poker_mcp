// validators/NuclideValidator.js
import { PokerMcpError } from '../utils/mcpErrors.js';

/**
 * 核種名の連結形式バリデーター
 * マニフェスト仕様: ^[A-Z][a-z]{0,2}[0-9]{1,3}[a-z]?$
 * 例: Cs137, Co60, U235, Tc99m
 */
export class NuclideValidator {
  
  // 核種名の正規表現パターン（マニフェスト仕様準拠）
  static NUCLIDE_PATTERN = /^[A-Z][a-z]{0,2}[0-9]{1,3}[a-z]?$/;
  
  // 禁止されたハイフン形式の検出パターン
  static HYPHEN_PATTERN = /^[A-Z][a-z]{0,2}-[0-9]{1,3}[a-z]?$/;
  
  /**
   * 核種名の形式検証
   * @param {string} nuclide - 検証する核種名
   * @param {string} fieldName - フィールド名（エラー表示用）
   */
  static validateNuclideFormat(nuclide, fieldName = 'nuclide') {
    if (!nuclide || typeof nuclide !== 'string') {
      throw PokerMcpError.validationError(
        `${fieldName} must be a non-empty string`,
        fieldName,
        nuclide
      );
    }
    
    // ハイフンが含まれている場合の特別処理
    if (nuclide.includes('-')) {
      // 典型的な禁止形式（Cs-137など）かチェック
      if (this.HYPHEN_PATTERN.test(nuclide)) {
        throw PokerMcpError.nuclideForbiddenHyphen(nuclide);
      } else {
        // その他のハイフンを含む形式
        throw PokerMcpError.invalidNuclideFormat(nuclide);
      }
    }
    
    // 正しい連結形式かチェック
    if (!this.NUCLIDE_PATTERN.test(nuclide)) {
      throw PokerMcpError.invalidNuclideFormat(nuclide);
    }
    
    return true;
  }

  /**
   * 核種インベントリ配列の検証
   * @param {Array} inventory - 核種インベントリ配列
   */
  static validateInventory(inventory) {
    if (!Array.isArray(inventory) || inventory.length === 0) {
      throw PokerMcpError.validationError(
        'inventory must be a non-empty array',
        'inventory',
        inventory
      );
    }

    for (let i = 0; i < inventory.length; i++) {
      const item = inventory[i];
      
      if (!item || typeof item !== 'object') {
        throw PokerMcpError.validationError(
          `inventory[${i}] must be an object`,
          `inventory[${i}]`,
          item
        );
      }
      
      // 必須フィールドの存在チェック
      if (!item.nuclide) {
        throw PokerMcpError.validationError(
          `inventory[${i}] must have nuclide property`,
          `inventory[${i}].nuclide`,
          item.nuclide
        );
      }
      
      if (typeof item.radioactivity !== 'number') {
        throw PokerMcpError.validationError(
          `inventory[${i}] must have radioactivity property as number`,
          `inventory[${i}].radioactivity`,
          item.radioactivity
        );
      }
      
      // 核種名の検証
      this.validateNuclideFormat(item.nuclide, `inventory[${i}].nuclide`);
      
      // 放射能値の検証
      if (item.radioactivity <= 0) {
        throw PokerMcpError.validationError(
          `inventory[${i}].radioactivity must be positive`,
          `inventory[${i}].radioactivity`,
          item.radioactivity
        );
      }
      
      if (item.radioactivity < 0.001 || item.radioactivity > 1e15) {
        throw PokerMcpError.validationError(
          `inventory[${i}].radioactivity must be between 0.001 and 1e15 Bq`,
          `inventory[${i}].radioactivity`,
          item.radioactivity
        );
      }
    }
    
    return true;
  }

  /**
   * 核種名の自動変換（ハイフン形式から連結形式へ）
   * マイグレーション用の便利メソッド
   * @param {string} nuclide - 変換する核種名
   * @returns {string} 変換後の核種名
   */
  static convertHyphenToConcat(nuclide) {
    if (typeof nuclide !== 'string') {
      return nuclide;
    }
    
    // ハイフン形式の場合は連結形式に変換
    if (this.HYPHEN_PATTERN.test(nuclide)) {
      return nuclide.replace('-', '');
    }
    
    return nuclide;
  }

  /**
   * 核種名の例を提供
   * @returns {Array} 有効な核種名の例
   */
  static getValidExamples() {
    return ['Cs137', 'Co60', 'U235', 'Ra226', 'Am241', 'Tc99m'];
  }

  /**
   * 禁止形式の例を提供
   * @returns {Array} 禁止された核種名の例
   */
  static getForbiddenExamples() {
    return ['Cs-137', 'Co-60', 'U-235', 'Ra-226', 'Am-241', 'Tc-99m'];
  }

  /**
   * 核種名の詳細情報を解析
   * @param {string} nuclide - 解析する核種名
   * @returns {Object} 解析結果 {element, massNumber, metastable}
   */
  static parseNuclide(nuclide) {
    if (!this.NUCLIDE_PATTERN.test(nuclide)) {
      return null;
    }
    
    const match = nuclide.match(/^([A-Z][a-z]{0,2})([0-9]{1,3})([a-z]?)$/);
    if (!match) {
      return null;
    }
    
    return {
      element: match[1],
      massNumber: parseInt(match[2]),
      metastable: match[3] || null
    };
  }
}
