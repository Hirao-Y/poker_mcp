/**
 * 強化された検証機能
 * マニフェスト enhanced_features.enhanced_validation に基づく実装
 */

import { logger } from './logger.js';

class EnhancedValidator {
    constructor() {
        this.validationRules = new Map();
        this.initializeValidationRules();
    }

    /**
     * 検証ルールの初期化
     */
    initializeValidationRules() {
        // 物理整合性ルール
        this.validationRules.set('physics_consistency', [
            this.validateMaterialDensity,
            this.validateSourceActivity,
            this.validateGeometryScale,
            this.validateDetectorPlacement
        ]);

        // 単位互換性ルール
        this.validationRules.set('units_compatibility', [
            this.validateUnitConsistency,
            this.validateDimensionalAnalysis,
            this.validateCoordinateSystem
        ]);

        // 材料物性ルール
        this.validationRules.set('material_property', [
            this.validateMaterialCombinations,
            this.validateDensityRanges,
            this.validateVoidMaterial
        ]);

        // CMB式検証ルール
        this.validationRules.set('cmb_expression', [
            this.validateCMBSyntax,
            this.validateCMBReferences,
            this.validateCMBLogic
        ]);
    }

    /**
     * 包括的検証の実行
     * @param {Object} data - YAMLデータ
     * @returns {Object} 検証結果
     */
    async performComprehensiveValidation(data) {
        try {
            logger.info('包括的検証を開始');
            
            const validationResults = {
                overall: true,
                categories: {},
                errors: [],
                warnings: [],
                recommendations: []
            };

            // 各カテゴリの検証実行
            for (const [category, rules] of this.validationRules) {
                logger.info(`${category} カテゴリの検証中`);
                
                const categoryResult = await this.runCategoryValidation(category, rules, data);
                validationResults.categories[category] = categoryResult;
                
                // 全体結果の更新
                if (!categoryResult.passed) {
                    validationResults.overall = false;
                }
                
                validationResults.errors.push(...categoryResult.errors);
                validationResults.warnings.push(...categoryResult.warnings);
                validationResults.recommendations.push(...categoryResult.recommendations);
            }

            logger.info('包括的検証完了', {
                overall: validationResults.overall,
                errorCount: validationResults.errors.length,
                warningCount: validationResults.warnings.length
            });

            return validationResults;
            
        } catch (error) {
            logger.error('包括的検証中にエラー', { error: error.message });
            throw new Error(`検証エラー: ${error.message}`);
        }
    }

    /**
     * カテゴリ別検証の実行
     * @param {string} category - カテゴリ名
     * @param {Array} rules - 検証ルール配列
     * @param {Object} data - データ
     * @returns {Object} カテゴリ検証結果
     */
    async runCategoryValidation(category, rules, data) {
        const result = {
            category,
            passed: true,
            errors: [],
            warnings: [],
            recommendations: []
        };

        for (const rule of rules) {
            try {
                const ruleResult = await rule.call(this, data);
                
                if (ruleResult.errors && ruleResult.errors.length > 0) {
                    result.passed = false;
                    result.errors.push(...ruleResult.errors);
                }
                
                if (ruleResult.warnings) {
                    result.warnings.push(...ruleResult.warnings);
                }
                
                if (ruleResult.recommendations) {
                    result.recommendations.push(...ruleResult.recommendations);
                }
                
            } catch (ruleError) {
                logger.error(`検証ルール実行エラー: ${rule.name}`, { error: ruleError.message });
                result.errors.push({
                    type: 'validation_error',
                    rule: rule.name,
                    message: `検証ルールエラー: ${ruleError.message}`
                });
                result.passed = false;
            }
        }

        return result;
    }

    // ========== 物理整合性検証 ==========

    /**
     * 材料密度の物理的妥当性チェック
     */
    async validateMaterialDensity(data) {
        const result = { errors: [], warnings: [], recommendations: [] };
        
        if (!data.zone) return result;

        const densityRanges = {
            'LEAD': { min: 10.0, max: 12.0, typical: 11.34 },
            'CONCRETE': { min: 1.8, max: 2.8, typical: 2.3 },
            'Iron': { min: 7.0, max: 8.5, typical: 7.87 },
            'Aluminum': { min: 2.5, max: 2.8, typical: 2.70 },
            'Copper': { min: 8.5, max: 9.2, typical: 8.96 },
            'Air': { min: 0.001, max: 0.002, typical: 0.00129 }
        };

        for (const zone of data.zone) {
            if (zone.material === 'VOID') continue;
            
            const range = densityRanges[zone.material];
            if (range && zone.density) {
                if (zone.density < range.min || zone.density > range.max) {
                    result.errors.push({
                        type: 'density_out_of_range',
                        material: zone.material,
                        density: zone.density,
                        expectedRange: `${range.min} - ${range.max}`,
                        message: `${zone.material}の密度${zone.density}が物理的範囲外です`
                    });
                }
                
                // 推奨値との比較
                const deviation = Math.abs(zone.density - range.typical) / range.typical;
                if (deviation > 0.1) { // 10%以上の偏差
                    result.warnings.push({
                        type: 'density_deviation',
                        material: zone.material,
                        density: zone.density,
                        typical: range.typical,
                        deviation: deviation,
                        message: `${zone.material}の密度が標準値から${(deviation*100).toFixed(1)}%偏差しています`
                    });
                }
            }
        }

        return result;
    }

    /**
     * 線源放射能の妥当性チェック
     */
    async validateSourceActivity(data) {
        const result = { errors: [], warnings: [], recommendations: [] };
        
        if (!data.source) return result;

        for (const source of data.source) {
            if (!source.inventory) continue;
            
            for (const nuclide of source.inventory) {
                // 極端な放射能値のチェック
                if (nuclide.radioactivity > 1e15) { // 1 PBq超
                    result.warnings.push({
                        type: 'extremely_high_activity',
                        source: source.name,
                        nuclide: nuclide.nuclide,
                        activity: nuclide.radioactivity,
                        message: `${source.name}の${nuclide.nuclide}が極めて高い放射能です`
                    });
                }
                
                if (nuclide.radioactivity < 1e3) { // 1 kBq未満
                    result.recommendations.push({
                        type: 'low_activity',
                        source: source.name,
                        nuclide: nuclide.nuclide,
                        activity: nuclide.radioactivity,
                        message: `${source.name}の${nuclide.nuclide}の放射能が低く、計算精度に影響する可能性があります`
                    });
                }
            }
        }

        return result;
    }

    /**
     * 幾何学的スケールの妥当性チェック
     */
    async validateGeometryScale(data) {
        const result = { errors: [], warnings: [], recommendations: [] };
        
        if (!data.body) return result;

        for (const body of data.body) {
            const dimensions = this.extractDimensions(body);
            
            // 極端なサイズのチェック
            for (const dim of dimensions) {
                if (dim > 1e6) { // 1000m超
                    result.warnings.push({
                        type: 'extremely_large_dimension',
                        body: body.name,
                        dimension: dim,
                        message: `${body.name}の寸法が極めて大きいです (${dim} cm)`
                    });
                }
                
                if (dim < 1e-3) { // 0.001cm未満
                    result.warnings.push({
                        type: 'extremely_small_dimension',
                        body: body.name,
                        dimension: dim,
                        message: `${body.name}の寸法が極めて小さいです (${dim} cm)`
                    });
                }
            }
        }

        return result;
    }

    /**
     * 検出器配置の妥当性チェック
     */
    async validateDetectorPlacement(data) {
        const result = { errors: [], warnings: [], recommendations: [] };
        
        if (!data.detector || !data.source) return result;

        for (const detector of data.detector) {
            const detPos = this.parseCoordinates(detector.origin);
            
            // 線源との距離チェック
            for (const source of data.source) {
                let sourcePos;
                
                if (source.position) {
                    sourcePos = this.parseCoordinates(source.position);
                } else if (source.geometry && source.geometry.center) {
                    sourcePos = this.parseCoordinates(source.geometry.center);
                } else {
                    continue;
                }
                
                const distance = this.calculateDistance(detPos, sourcePos);
                
                if (distance < 1.0) { // 1cm未満
                    result.errors.push({
                        type: 'detector_too_close',
                        detector: detector.name,
                        source: source.name,
                        distance: distance,
                        message: `検出器${detector.name}が線源${source.name}に近すぎます`
                    });
                }
                
                if (distance > 1e5) { // 1km超
                    result.warnings.push({
                        type: 'detector_very_far',
                        detector: detector.name,
                        source: source.name,
                        distance: distance,
                        message: `検出器${detector.name}が線源${source.name}から非常に遠いです`
                    });
                }
            }
        }

        return result;
    }

    // ========== 単位互換性検証 ==========

    /**
     * 単位の一貫性チェック
     */
    async validateUnitConsistency(data) {
        const result = { errors: [], warnings: [], recommendations: [] };
        
        if (!data.unit) {
            result.errors.push({
                type: 'missing_unit_section',
                message: '単位セクションが存在しません'
            });
            return result;
        }

        // 必須単位の存在チェック
        const requiredUnits = ['length', 'angle', 'density', 'radioactivity'];
        for (const unit of requiredUnits) {
            if (!data.unit[unit]) {
                result.errors.push({
                    type: 'missing_required_unit',
                    unit: unit,
                    message: `必須単位 ${unit} が定義されていません`
                });
            }
        }

        return result;
    }

    /**
     * 次元解析チェック
     */
    async validateDimensionalAnalysis(data) {
        const result = { errors: [], warnings: [], recommendations: [] };
        
        // 実装は簡略化
        // 実際には各パラメータの次元の整合性をチェック
        
        return result;
    }

    /**
     * 座標系の一貫性チェック
     */
    async validateCoordinateSystem(data) {
        const result = { errors: [], warnings: [], recommendations: [] };
        
        // 座標値の単位一貫性チェック
        if (data.unit && data.unit.length) {
            const lengthUnit = data.unit.length;
            
            // 実装は簡略化
            result.recommendations.push({
                type: 'coordinate_system_info',
                lengthUnit: lengthUnit,
                message: `座標系の長さ単位: ${lengthUnit}`
            });
        }

        return result;
    }

    // ========== ヘルパーメソッド ==========

    /**
     * 立体の寸法抽出
     */
    extractDimensions(body) {
        const dimensions = [];
        
        switch (body.type) {
            case 'SPH':
                dimensions.push(body.radius * 2);
                break;
            case 'RPP':
                const min = this.parseCoordinates(body.min);
                const max = this.parseCoordinates(body.max);
                for (let i = 0; i < 3; i++) {
                    dimensions.push(Math.abs(max[i] - min[i]));
                }
                break;
            case 'RCC':
                dimensions.push(body.radius * 2);
                const height = this.parseCoordinates(body.height_vector);
                dimensions.push(Math.sqrt(height[0]**2 + height[1]**2 + height[2]**2));
                break;
        }
        
        return dimensions;
    }

    /**
     * 座標解析
     */
    parseCoordinates(coordStr) {
        if (typeof coordStr === 'string') {
            return coordStr.split(/\s+/).map(Number);
        }
        return [0, 0, 0];
    }

    /**
     * 距離計算
     */
    calculateDistance(pos1, pos2) {
        return Math.sqrt(
            (pos1[0] - pos2[0])**2 + 
            (pos1[1] - pos2[1])**2 + 
            (pos1[2] - pos2[2])**2
        );
    }

    // ========== CMB式検証（簡略版） ==========

    async validateCMBSyntax(data) {
        return { errors: [], warnings: [], recommendations: [] };
    }

    async validateCMBReferences(data) {
        return { errors: [], warnings: [], recommendations: [] };
    }

    async validateCMBLogic(data) {
        return { errors: [], warnings: [], recommendations: [] };
    }

    async validateMaterialCombinations(data) {
        return { errors: [], warnings: [], recommendations: [] };
    }

    async validateDensityRanges(data) {
        return { errors: [], warnings: [], recommendations: [] };
    }

    async validateVoidMaterial(data) {
        return { errors: [], warnings: [], recommendations: [] };
    }
}

export default EnhancedValidator;
