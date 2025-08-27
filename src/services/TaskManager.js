// services/TaskManager.js
import { SafeDataManager } from './DataManager.js';
import { PhysicsValidator } from '../validators/PhysicsValidator.js';
import { ManifestValidator } from '../validators/ManifestValidator.js';
import { TransformValidator } from '../validators/TransformValidator.js';
import { NuclideValidator } from '../validators/NuclideValidator.js';
import { SourceValidator } from '../validators/SourceValidator.js';
import { DetectorValidator } from '../validators/DetectorValidator.js';
import { UnitValidator } from '../validators/UnitValidator.js';
import { PokerMcpError } from '../utils/mcpErrors.js';
import { logger } from '../utils/logger.js';
import { ValidationError, PhysicsError } from '../utils/errors.js';

export class TaskManager {
  constructor(yamlFile, pendingFile) {
    this.dataManager = new SafeDataManager(yamlFile, pendingFile);
  }

  /**
   * Detector構造の分析ヘルパーメソッド
   * DetectorHandlerから使用される簡易分析インターフェース
   */
  analyzeDetectorStructure(detectorData) {
    try {
      const validation = DetectorValidator.validateCompleteDetectorStructure(detectorData, this.data);
      const optimization = DetectorValidator.analyzeDetectorOptimization(detectorData, this.data);
      
      return {
        name: validation.name,
        dimension: validation.gridAnalysis ? validation.gridAnalysis.dimension : 0,
        complexity: validation.complexity,
        type: validation.type,
        isOptimal: optimization.isOptimal,
        suggestions: optimization.suggestions,
        performance: optimization.performance
      };
      
    } catch (error) {
      logger.error('Detector構造分析エラー', { 
        detectorName: detectorData.name, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Detectorグリッドの互換性チェック
   * 複数のDetector間でグリッド構造の互換性を分析
   */
  async analyzeDetectorCompatibility(detector1Name, detector2Name) {
    try {
      const detector1 = this.findDetectorByName(detector1Name);
      const detector2 = this.findDetectorByName(detector2Name);
      
      if (!detector1) {
        throw new ValidationError(`検出器 ${detector1Name} が見つかりません`, 'detector1Name', detector1Name);
      }
      
      if (!detector2) {
        throw new ValidationError(`検出器 ${detector2Name} が見つかりません`, 'detector2Name', detector2Name);
      }
      
      const compatibility = DetectorValidator.checkDetectorCompatibility(detector1, detector2);
      
      logger.info('Detector互換性分析を実行しました', {
        detector1: detector1Name,
        detector2: detector2Name,
        compatibility
      });
      
      return {
        detector1: detector1Name,
        detector2: detector2Name,
        compatibility,
        recommendations: this.generateCompatibilityRecommendations(compatibility)
      };
      
    } catch (error) {
      logger.error('Detector互換性分析エラー', { 
        detector1Name, 
        detector2Name, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * 互換性に基づいた推奨事項を生成
   * @private
   */
  generateCompatibilityRecommendations(compatibility) {
    const recommendations = [];
    
    if (!compatibility.dimensionMatch) {
      recommendations.push({
        type: 'dimension_mismatch',
        priority: 'high',
        message: 'Detectors have different dimensions. Consider using detectors with matching dimensions for comparative analysis.'
      });
    }
    
    if (!compatibility.resolutionCompatible) {
      recommendations.push({
        type: 'resolution_mismatch',
        priority: 'medium',
        message: 'Detector resolutions differ significantly. Results may not be directly comparable.'
      });
    }
    
    if (!compatibility.geometryCompatible) {
      recommendations.push({
        type: 'geometry_mismatch',
        priority: 'medium',
        message: 'Different grid geometries (orthogonal vs oblique). Consider geometric corrections in analysis.'
      });
    }
    
    if (compatibility.overall === 'fully_compatible') {
      recommendations.push({
        type: 'fully_compatible',
        priority: 'info',
        message: 'Detectors are fully compatible. Direct comparison and analysis is recommended.'
      });
    }
    
    return recommendations;
  }

  /**
   * システム全体のDetector性能分析
   * 全てのDetectorの性能特性を分析
   */
  async analyzeSystemDetectorPerformance() {
    try {
      const detectors = this.data.detector || [];
      const performanceAnalysis = {
        totalDetectors: detectors.length,
        dimensionDistribution: { '0D': 0, '1D': 0, '2D': 0, '3D': 0 },
        totalComplexity: 0,
        averageComplexity: 0,
        highPerformanceDetectors: [],
        lowPerformanceDetectors: [],
        memoryEstimate: { total: 0, breakdown: [] },
        processingRecommendations: []
      };
      
      if (detectors.length === 0) {
        return performanceAnalysis;
      }
      
      for (const detector of detectors) {
        const analysis = DetectorValidator.validateCompleteDetectorStructure(detector, this.data);
        const optimization = DetectorValidator.analyzeDetectorOptimization(detector, this.data);
        
        // 次元分布
        const dimension = analysis.gridAnalysis ? 
          `${analysis.gridAnalysis.dimension}D` : '0D';
        performanceAnalysis.dimensionDistribution[dimension]++;
        
        // 複雑度統計
        performanceAnalysis.totalComplexity += analysis.complexity;
        
        // 性能分類
        if (analysis.complexity > 10000) {
          performanceAnalysis.highPerformanceDetectors.push({
            name: detector.name,
            complexity: analysis.complexity,
            estimatedMemory: optimization.performance.estimatedMemory.total
          });
        } else if (analysis.complexity < 100) {
          performanceAnalysis.lowPerformanceDetectors.push({
            name: detector.name,
            complexity: analysis.complexity
          });
        }
        
        // メモリ使用量統計
        performanceAnalysis.memoryEstimate.total += optimization.performance.estimatedMemory.total;
        performanceAnalysis.memoryEstimate.breakdown.push({
          detector: detector.name,
          memory: optimization.performance.estimatedMemory.total
        });
      }
      
      performanceAnalysis.averageComplexity = 
        performanceAnalysis.totalComplexity / detectors.length;
      
      // 処理推奨事項の生成
      if (performanceAnalysis.memoryEstimate.total > 1000) {
        performanceAnalysis.processingRecommendations.push(
          '高メモリ使用量が予想されます。分散処理または解像度の調整を検討してください。'
        );
      }
      
      if (performanceAnalysis.highPerformanceDetectors.length > 5) {
        performanceAnalysis.processingRecommendations.push(
          '多数の高性能検出器があります。並列処理またはクラスター計算を推奨します。'
        );
      }
      
      logger.info('システムDetector性能分析を完了しました', performanceAnalysis);
      
      return performanceAnalysis;
      
    } catch (error) {
      logger.error('システムDetector性能分析エラー', { error: error.message });
      throw error;
    }
  }

  /**
   * Transformの完全性チェック
   * システム全体でTransform参照の整合性を確認
   */
  // Unit操作 - 4キー完全性保証機能強化版
  async proposeUnit(length, angle, density, radioactivity) {
    try {
      // 4キー完全構造の構築
      const unitData = {
        length,
        angle, 
        density,
        radioactivity
      };
      
      // UnitValidatorによる4キー完全性検証
      UnitValidator.validateFourKeyCompleteness(unitData);
      
      // 既存単位設定の確認
      if (this.data.unit) {
        throw PokerMcpError.duplicateName('unit', 'unit section already exists');
      }
      
      // 物理的整合性検証
      const physicalConsistency = UnitValidator.validatePhysicalConsistency(unitData);
      
      // データ正規化
      const normalizedUnit = UnitValidator.normalizeUnitStructure(unitData);
      
      await this.dataManager.addPendingChange({
        action: 'proposeUnit',
        data: normalizedUnit
      });
      
      logger.info('4キー完全単位設定を提案しました', {
        unitData: normalizedUnit,
        physicalConsistency: physicalConsistency.isConsistent,
        warnings: physicalConsistency.warnings.length
      });
      
      let responseMessage = '提案: 単位設定を追加（4キー完全性保証）';
      
      if (physicalConsistency.warnings.length > 0) {
        const warningTypes = physicalConsistency.warnings.map(w => w.type);
        responseMessage += ` - 警告: ${warningTypes.join(', ')}`;
      }
      
      return responseMessage;
      
    } catch (error) {
      logger.error('単位設定提案エラー', { unitData: { length, angle, density, radioactivity }, error: error.message });
      throw error;
    }
  }

  async getUnit() {
    try {
      if (!this.data.unit) {
        throw new ValidationError('単位設定が存在しません', 'unit', null);
      }
      
      // 4キー完全性の事後検証
      UnitValidator.validateFourKeyCompleteness(this.data.unit);
      
      logger.info('4キー完全単位設定を取得しました', { unit: this.data.unit });
      
      return {
        unit: this.data.unit,
        integrity: '4-key-complete',
        keys: Object.keys(this.data.unit)
      };
      
    } catch (error) {
      logger.error('単位設定取得エラー', { error: error.message });
      throw error;
    }
  }

  /**
   * Transformの完全性チェック
   * システム全体でTransform参照の整合性を確認
   */
  async validateSystemTransformIntegrity() {
    try {
      const integrityResult = TransformValidator.validateTransformIntegrity(this.data);
      
      if (!integrityResult.isValid) {
        logger.warn('Transform参照の整合性問題が発見されました', {
          issues: integrityResult.issues
        });
      }
      
      return {
        success: integrityResult.isValid,
        issues: integrityResult.issues,
        summary: {
          availableTransforms: integrityResult.availableTransforms.length,
          checkedReferences: integrityResult.checkedReferences,
          problemCount: integrityResult.issues.length
        }
      };
      
    } catch (error) {
      logger.error('Transform整合性チェックエラー', { error: error.message });
      throw error;
    }
  }

  /**
   * Transform使用状況統計を取得
   * システム内のTransform使用状況を分析
   */
  async getTransformUsageReport() {
    try {
      const usageStats = TransformValidator.getTransformUsageStats(this.data);
      
      logger.info('Transform使用状況を取得しました', {
        total: usageStats.totalTransforms,
        used: usageStats.usedTransforms,
        unused: usageStats.unusedTransforms.length
      });
      
      return {
        summary: {
          totalTransforms: usageStats.totalTransforms,
          usedTransforms: usageStats.usedTransforms,
          unusedTransforms: usageStats.unusedTransforms.length,
          usageEfficiency: usageStats.totalTransforms > 0 ? 
            (usageStats.usedTransforms / usageStats.totalTransforms * 100).toFixed(1) + '%' : '0%'
        },
        unusedTransforms: usageStats.unusedTransforms,
        detailedStats: usageStats.detailedStats,
        mostUsedTransform: usageStats.summary.mostUsed,
        averageUsage: usageStats.summary.averageUsage.toFixed(2)
      };
      
    } catch (error) {
      logger.error('Transform使用統計エラー', { error: error.message });
      throw error;
    }
  }

  async updateUnit(updates) {
    try {
      if (!this.data.unit) {
        throw new ValidationError('単位設定が存在しません', 'unit', null);
      }
      
      // 部分更新での4キー保持検証
      const validationResult = UnitValidator.validatePartialUpdate(this.data.unit, updates);
      
      // 更新後の物理的整合性検証
      const physicalConsistency = UnitValidator.validatePhysicalConsistency(validationResult.updatedStructure);
      
      // データ正規化
      const normalizedUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        normalizedUpdates[key] = value.trim();
        UnitValidator.validateSingleUnitKey(key, normalizedUpdates[key]);
      }
      
      await this.dataManager.addPendingChange({
        action: 'updateUnit',
        data: normalizedUpdates
      });
      
      logger.info('4キー保持単位更新を提案しました', {
        updates: normalizedUpdates,
        preservedIntegrity: validationResult.preservedIntegrity,
        changedKeys: validationResult.changedKeys,
        physicalConsistency: physicalConsistency.isConsistent
      });
      
      let responseMessage = `提案: 単位設定の更新（${validationResult.changedKeys.join(', ')}）- 4キー完全性保持`;
      
      if (physicalConsistency.warnings.length > 0) {
        const warningTypes = physicalConsistency.warnings.map(w => w.type);
        responseMessage += ` - 警告: ${warningTypes.join(', ')}`;
      }
      
      return responseMessage;
      
    } catch (error) {
      logger.error('単位設定更新エラー', { updates, error: error.message });
      throw error;
    }
  }

  /**
   * 単位系の4キー完全性と物理的整合性を包括検証
   */
  async validateUnitIntegrity(includeSystemAnalysis = true, generateReport = true) {
    try {
      if (!this.data.unit) {
        throw new ValidationError('単位設定が存在しません。検証には単位設定が必要です', 'unit', null);
      }
      
      let report = null;
      if (generateReport) {
        report = UnitValidator.generateIntegrityDiagnosticReport(
          this.data.unit, 
          includeSystemAnalysis ? this.data : null
        );
      }
      
      // 基本4キー完全性検証
      UnitValidator.validateFourKeyCompleteness(this.data.unit);
      
      // 物理的整合性検証
      const physicalConsistency = UnitValidator.validatePhysicalConsistency(this.data.unit);
      
      // システム整合性検証
      let systemIntegrity = null;
      if (includeSystemAnalysis) {
        systemIntegrity = UnitValidator.validateSystemUnitIntegrity(this.data.unit, this.data);
      }
      
      logger.info('単位系完全性検証を実行しました', {
        hasAllFourKeys: true,
        physicalConsistency: physicalConsistency.isConsistent,
        warningCount: physicalConsistency.warnings.length,
        systemAnalysis: !!systemIntegrity
      });
      
      return {
        integrity: 'verified',
        fourKeyComplete: true,
        physicalConsistency,
        systemIntegrity,
        diagnosticReport: report,
        summary: {
          overallHealth: report ? report.overallHealth : 'verified',
          criticalIssues: report ? report.criticalIssues.length : 0,
          warnings: physicalConsistency.warnings.length,
          recommendations: report ? report.recommendations.length : 0
        }
      };
      
    } catch (error) {
      logger.error('単位系完全性検証エラー', { error: error.message });
      throw error;
    }
  }

  /**
   * 異なる単位系間の変換係数分析
   */
  async analyzeUnitConversion(targetUnits, includePhysicalAnalysis = true) {
    try {
      if (!this.data.unit) {
        throw new ValidationError('現在の単位設定が存在しません', 'unit', null);
      }
      
      // 現在の単位系の4キー完全性検証
      UnitValidator.validateFourKeyCompleteness(this.data.unit);
      
      // 目標単位系の4キー完全性検証
      UnitValidator.validateFourKeyCompleteness(targetUnits);
      
      // 変換係数の計算
      const conversionAnalysis = UnitValidator.calculateConversionFactors(
        this.data.unit, 
        targetUnits
      );
      
      let physicalAnalysis = null;
      if (includePhysicalAnalysis) {
        // 両方の単位系の物理的整合性分析
        const currentConsistency = UnitValidator.validatePhysicalConsistency(this.data.unit);
        const targetConsistency = UnitValidator.validatePhysicalConsistency(targetUnits);
        
        physicalAnalysis = {
          current: currentConsistency,
          target: targetConsistency,
          conversionImpact: this.assessConversionImpact(conversionAnalysis)
        };
      }
      
      logger.info('単位変換分析を実行しました', {
        fromUnits: this.data.unit,
        toUnits: targetUnits,
        isIdentityConversion: conversionAnalysis.isIdentity,
        hasPhysicalAnalysis: !!physicalAnalysis
      });
      
      return {
        conversion: conversionAnalysis,
        physicalAnalysis,
        recommendations: this.generateConversionRecommendations(conversionAnalysis, physicalAnalysis)
      };
      
    } catch (error) {
      logger.error('単位変換分析エラー', { targetUnits, error: error.message });
      throw error;
    }
  }

  /**
   * 変換の影響評価
   * @private
   */
  assessConversionImpact(conversionAnalysis) {
    const impacts = [];
    
    for (const [key, factor] of Object.entries(conversionAnalysis.factors)) {
      if (Math.abs(factor - 1.0) > 1e-10) {
        let impact = 'moderate';
        if (Math.abs(Math.log10(Math.abs(factor))) > 2) {
          impact = 'significant';  // 100倍以上の差
        } else if (Math.abs(Math.log10(Math.abs(factor))) < 0.1) {
          impact = 'minor';       // 1.26倍未満の差
        }
        
        impacts.push({
          key,
          factor,
          impact,
          description: `${key} units require ${factor.toExponential(3)} multiplication factor`
        });
      }
    }
    
    return impacts;
  }

  /**
   * 変換推奨事項の生成
   * @private
   */
  generateConversionRecommendations(conversionAnalysis, physicalAnalysis) {
    const recommendations = [];
    
    if (conversionAnalysis.isIdentity) {
      recommendations.push({
        type: 'no_conversion_needed',
        priority: 'info',
        message: 'No unit conversion required - units are identical'
      });
      return recommendations;
    }
    
    // 大きな変換係数の警告
    const significantConversions = conversionAnalysis.factors;
    for (const [key, factor] of Object.entries(significantConversions)) {
      if (Math.abs(Math.log10(Math.abs(factor))) > 3) { // 1000倍以上
        recommendations.push({
          type: 'large_conversion_factor',
          priority: 'high',
          message: `Very large conversion factor for ${key}: ${factor.toExponential(2)}. Verify calculation accuracy.`
        });
      }
    }
    
    // 物理的整合性の比較
    if (physicalAnalysis) {
      if (physicalAnalysis.current.warnings.length < physicalAnalysis.target.warnings.length) {
        recommendations.push({
          type: 'target_system_warnings',
          priority: 'medium',
          message: 'Target unit system has more warnings than current system. Consider physical consistency.'
        });
      }
    }
    
    return recommendations;
  }

  async initialize() {
    // ConfigManager初期化
    try {
      await this.dataManager.initialize();
      logger.info('TaskManagerを初期化しました');
    } catch (error) {
      // ConfigManagerが見つからない場合は警告のみ
      logger.warn('ConfigManagerの初期化をスキップしました', { error: error.message });
      await this.dataManager.initialize();
      logger.info('TaskManagerを初期化しました（ConfigManagerなし）');
    }
  }

  // データアクセサ
  get data() {
    return this.dataManager.data;
  }

  get pendingChanges() {
    return this.dataManager.pendingChanges;
  }

  // ヘルパーメソッド
  findBodyByName(name) {
    return this.data.body?.find(b => b.name === name);
  }

  findZoneByBodyName(bodyName) {
    return this.data.zone?.find(z => z.body_name === bodyName);
  }

  findSourceByName(name) {
    return this.data.source?.find(s => s.name === name);
  }

  findDetectorByName(name) {
    return this.data.detector?.find(d => d.name === name);
  }

  validatePosition(position) {
    if (typeof position !== 'string' || position.trim() === '') {
      throw new ValidationError('positionは文字列で指定してください', 'position', position);
    }
    const coords = position.trim().split(/\s+/);
    if (coords.length !== 3) {
      throw new ValidationError('positionは3つの座標値（x y z）で指定してください', 'position', position);
    }
    for (const coord of coords) {
      if (isNaN(Number(coord))) {
        throw new ValidationError('positionの座標値は数値で指定してください', 'position', position);
      }
    }
  }

  validateBodyName(name) {
    ManifestValidator.validateObjectName(name, 'body name');
  }

  // Sourceデータの正規化（座標正規化とgeometry/division処理）
  normalizeSourceData(sourceData) {
    const normalized = { ...sourceData };
    
    // POINT線源の場合
    if (sourceData.type === 'POINT') {
      if (sourceData.position) {
        normalized.position = this.normalizeCoordinates(sourceData.position);
      }
      // POINT線源ではgeometryとdivisionを除去
      delete normalized.geometry;
      delete normalized.division;
      return normalized;
    }
    
    // 複雑線源のgeometry正規化
    if (sourceData.geometry) {
      normalized.geometry = this.normalizeGeometryData(sourceData.geometry);
    }
    
    // divisionは正規化不要（数値データのみ）
    if (sourceData.division) {
      normalized.division = sourceData.division;
    }
    
    // cutoff_rateのデフォルト値設定
    if (normalized.cutoff_rate === undefined) {
      normalized.cutoff_rate = 0.01;
    }
    
    return normalized;
  }
  
  // Geometryデータの正規化
  normalizeGeometryData(geometry) {
    const normalized = { ...geometry };
    
    // 座標関連フィールドの正規化
    const coordinateFields = [
      'vertex', 'edge_1', 'edge_2', 'edge_3',  // BOX用
      'min', 'max',                              // RPP用
      'center',                                  // SPH用
      'bottom_center', 'height_vector'           // RCC用
    ];
    
    for (const field of coordinateFields) {
      if (normalized[field]) {
        normalized[field] = this.normalizeCoordinates(normalized[field]);
      }
    }
    
    return normalized;
  }
  normalizeCoordinates(coordString) {
    if (typeof coordString !== 'string') return coordString;
    // "x y z" 形式の文字列を数値として正規化
    const coords = coordString.trim().split(/\s+/).map(Number);
    if (coords.length === 3 && coords.every(n => !isNaN(n))) {
      return coords.join(' ');
    }
    return coordString;
  }

  // Detectorデータの正規化
  normalizeDetectorData(detectorData) {
    const normalized = { ...detectorData };
    
    // 基準位置の正規化
    if (normalized.origin) {
      normalized.origin = this.normalizeCoordinates(normalized.origin);
    }
    
    // グリッドデータの正規化
    if (normalized.grid && Array.isArray(normalized.grid)) {
      normalized.grid = normalized.grid.map(gridItem => ({
        edge: this.normalizeCoordinates(gridItem.edge),
        number: Number(gridItem.number)
      }));
    }
    
    // show_path_traceのデフォルト値設定
    if (normalized.show_path_trace === undefined) {
      normalized.show_path_trace = false;
    }
    
    // transformが空文字列の場合は削除
    if (!normalized.transform) {
      delete normalized.transform;
    }
    
    return normalized;
  }
  normalizeGridData(grid) {
    if (!Array.isArray(grid)) return grid;
    
    return grid.map(gridItem => ({
      edge: this.normalizeCoordinates(gridItem.edge),
      number: Number(gridItem.number)
    }));
  }

  // 検出器バリデーション
  validateDetectorData(name, origin, grid) {
    // 名前バリデーション
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('検出器名は必須です', 'name', name);
    }
    if (name.length > 50) {
      throw new ValidationError('検出器名は50文字以内で指定してください', 'name', name);
    }
    
    // 座標バリデーション
    this.validatePosition(origin);
    
    // グリッドバリデーション
    if (grid && Array.isArray(grid)) {
      if (grid.length > 3) {
        throw new ValidationError('gridの次元は3次元以下である必要があります', 'grid', grid);
      }
      for (const gridItem of grid) {
        if (!gridItem.edge || !gridItem.number) {
          throw new ValidationError('gridの各要素にはedgeとnumberが必要です', 'grid', gridItem);
        }
        this.validatePosition(gridItem.edge);
        if (!Number.isInteger(gridItem.number) || gridItem.number <= 0) {
          throw new ValidationError('gridのnumberは正の整数である必要があります', 'number', gridItem.number);
        }
      }
    }
  }

  // グリッドデータのバリデーション（更新用）
  validateGridData(grid) {
    if (!Array.isArray(grid)) {
      throw new ValidationError('gridは配列である必要があります', 'grid', grid);
    }
    if (grid.length > 3) {
      throw new ValidationError('gridの次元は3次元以下である必要があります', 'grid', grid);
    }
    for (const gridItem of grid) {
      if (!gridItem.edge || !gridItem.number) {
        throw new ValidationError('gridの各要素にはedgeとnumberが必要です', 'grid', gridItem);
      }
      this.validatePosition(gridItem.edge);
      if (!Number.isInteger(gridItem.number) || gridItem.number <= 0) {
        throw new ValidationError('gridのnumberは正の整数である必要があります', 'number', gridItem.number);
      }
    }
  }
  // 立体関連メソッド
  async proposeBody(name, type, options = {}) {
    try {
      // 入力バリデーション
      this.validateBodyName(name);
      ManifestValidator.validateBodyType(type, 'type');
      PhysicsValidator.validateGeometry(type, options);
      
      // Transform参照チェック
      if (options.transform) {
        TransformValidator.validateContextTransformReference(
          options.transform, 
          this.data, 
          'body', 
          name
        );
      }

      // 重複チェック
      if (this.findBodyByName(name)) {
        throw PokerMcpError.duplicateName(name, 'body');
      }

      const newBody = this.createBodyObject(name, type, options);
      
      await this.dataManager.addPendingChange({
        action: 'add_body',
        data: { body: newBody }
      });

      logger.info('立体を提案しました', { name, type });
      return `提案: 立体 ${name} を追加`;
      
    } catch (error) {
      logger.error('立体提案エラー', { name, type, error: error.message });
      throw error;
    }
  }

  createBodyObject(name, type, options) {
    const body = { name, type };
    
    // 型別のパラメータ設定（座標の正規化適用）
    switch (type) {
      case 'SPH':
        body.center = this.normalizeCoordinates(options.center);
        body.radius = Number(options.radius);
        break;
      case 'RCC':
        body.bottom_center = this.normalizeCoordinates(options.bottom_center);
        body.height_vector = this.normalizeCoordinates(options.height_vector);
        body.radius = Number(options.radius);
        break;
      case 'RPP':
        body.min = this.normalizeCoordinates(options.min);
        body.max = this.normalizeCoordinates(options.max);
        break;
      case 'BOX':
        body.vertex = this.normalizeCoordinates(options.vertex);
        body.edge_1 = this.normalizeCoordinates(options.edge_1);
        body.edge_2 = this.normalizeCoordinates(options.edge_2);
        body.edge_3 = this.normalizeCoordinates(options.edge_3);
        break;
      case 'CMB':
        body.expression = options.expression;
        break;
      case 'TOR':
        body.center = this.normalizeCoordinates(options.center);
        body.normal = this.normalizeCoordinates(options.normal);
        body.major_radius = Number(options.major_radius);
        body.minor_radius_horizontal = Number(options.minor_radius_horizontal);
        body.minor_radius_vertical = Number(options.minor_radius_vertical);
        break;
      case 'ELL':
        body.center = this.normalizeCoordinates(options.center);
        body.radius_vector_1 = this.normalizeCoordinates(options.radius_vector_1);
        body.radius_vector_2 = this.normalizeCoordinates(options.radius_vector_2);
        body.radius_vector_3 = this.normalizeCoordinates(options.radius_vector_3);
        break;
      case 'REC':
        body.bottom_center = this.normalizeCoordinates(options.bottom_center);
        body.height_vector = this.normalizeCoordinates(options.height_vector);
        body.radius_vector_1 = this.normalizeCoordinates(options.radius_vector_1);
        body.radius_vector_2 = this.normalizeCoordinates(options.radius_vector_2);
        break;
      case 'TRC':
        body.bottom_center = this.normalizeCoordinates(options.bottom_center);
        body.height_vector = this.normalizeCoordinates(options.height_vector);
        body.bottom_radius = Number(options.bottom_radius);
        body.top_radius = Number(options.top_radius);
        break;
      case 'WED':
        body.vertex = this.normalizeCoordinates(options.vertex);
        body.width_vector = this.normalizeCoordinates(options.width_vector);
        body.height_vector = this.normalizeCoordinates(options.height_vector);
        body.depth_vector = this.normalizeCoordinates(options.depth_vector);
        break;
    }

    if (options.transform) {
      body.transform = options.transform;
    }

    return body;
  }
  async deleteBody(name) {
    try {
      const body = this.findBodyByName(name);
      if (!body) {
        throw new ValidationError(`立体 ${name} が見つかりません`, 'name', name);
      }

      // 依存関係チェック
      const dependentZones = this.data.zone?.filter(z => z.body_name === name) || [];
      if (dependentZones.length > 0) {
        throw new PhysicsError(
          `立体 ${name} には依存するゾーンが存在します: ${dependentZones.map(z => z.body_name).join(', ')}`,
          'DEPENDENT_ZONES_EXIST'
        );
      }

      await this.dataManager.addPendingChange({
        action: 'delete_body',
        data: { name: name }
      });

      logger.info('立体削除を提案しました', { name });
      return `提案: 立体 ${name} を削除`;
      
    } catch (error) {
      logger.error('立体削除エラー', { name, error: error.message });
      throw error;
    }
  }

  // ゾーン関連メソッド
  async proposeZone(body_name, material, density) {
    try {
      // バリデーション
      this.validateZoneProposal(body_name, material, density);
      PhysicsValidator.validateMaterialDensity(material, density);

      const newZone = { body_name, material };
      if (material !== 'VOID') {
        newZone.density = Number(density);
      }

      await this.dataManager.addPendingChange({
        action: 'add_zone',
        data: { zone: newZone }
      });

      logger.info('ゾーンを提案しました', { body_name, material });
      return `提案: ゾーン ${body_name} (${material}) を追加`;
      
    } catch (error) {
      logger.error('ゾーン提案エラー', { body_name, material, error: error.message });
      throw error;
    }
  }

  validateZoneProposal(body_name, material, density) {
    if (body_name !== 'ATMOSPHERE') {
      const body = this.findBodyByName(body_name);
      if (!body) {
        throw new ValidationError(`立体 ${body_name} が存在しません`, 'body_name', body_name);
      }
    }

    const existingZone = this.findZoneByBodyName(body_name);
    if (existingZone) {
      throw new ValidationError(`ゾーン ${body_name} は既に存在します`, 'body_name', body_name);
    }
  }

  async deleteZone(body_name) {
    try {
      if (body_name === 'ATMOSPHERE') {
        throw new ValidationError('ATMOSPHEREゾーンは削除できません', 'body_name', body_name);
      }

      const zone = this.findZoneByBodyName(body_name);
      if (!zone) {
        throw new ValidationError(`ゾーン ${body_name} が見つかりません`, 'body_name', body_name);
      }

      await this.dataManager.addPendingChange({
        action: 'delete_zone',
        data: { body_name: body_name }
      });

      logger.info('ゾーン削除を提案しました', { body_name });
      return `提案: ゾーン ${body_name} を削除`;
      
    } catch (error) {
      logger.error('ゾーン削除エラー', { body_name, error: error.message });
      throw error;
    }
  }

  async applyChanges() {
    try {
      const result = await this.dataManager.applyChanges();
      logger.info('変更を適用しました');
      return result;
    } catch (error) {
      logger.error('変更適用エラー', { error: error.message });
      throw error;
    }
  }

  // Transform操作
  async proposeTransform(name, operations) {
    try {
      if (!name) throw new ValidationError('回転移動のnameは必須です', 'name', name);
      if (!Array.isArray(operations) || operations.length === 0) {
        throw new ValidationError('operationは配列で1つ以上必要です', 'operation', operations);
      }

      // 基本バリデーション
      TransformValidator.validateTransformOperations(operations);
      
      // 一意性チェック
      TransformValidator.validateTransformUniqueness(name, this.data.transform, this.pendingChanges);
      
      // 物理的妥当性チェック
      const physicsAnalysis = TransformValidator.validateTransformPhysics(operations, name);
      
      await this.dataManager.addPendingChange({
        action: 'proposeTransform',
        data: { name, operations }
      });
      
      logger.info('変換提案を追加しました', { 
        name, 
        operations,
        analysis: physicsAnalysis
      });
      
      return `回転移動 ${name} を追加しました - 操作数: ${physicsAnalysis.operationCount}, 回転: ${physicsAnalysis.hasRotation}, 移動: ${physicsAnalysis.hasTranslation}`;
      
    } catch (error) {
      logger.error('変換提案エラー', { name, error: error.message });
      throw error;
    }
  }

  async updateTransform(name, updates) {
    try {
      if (!name) throw new ValidationError('変換のnameは必須です', 'name', name);
      
      await this.dataManager.addPendingChange({
        action: 'updateTransform',
        data: { name, ...updates }
      });
      logger.info('変換更新を提案しました', { name, updates });
      return `提案: 変換 ${name} の更新を保留しました: ${JSON.stringify(updates)}`;
      
    } catch (error) {
      logger.error('変換更新エラー', { name, error: error.message });
      throw error;
    }
  }

  async deleteTransform(name) {
    try {
      if (!name) throw PokerMcpError.validationError('変換のnameは必須です', 'name', name);
      
      // Transform名の検証
      ManifestValidator.validateObjectName(name, 'transform name');
      
      // 依存関係チェック（保留中変更も含む）
      TransformValidator.checkTransformDependencies(name, this.data, this.pendingChanges);
      
      await this.dataManager.addPendingChange({
        action: 'deleteTransform',
        data: { name }
      });
      logger.info('変換削除を提案しました', { name });
      return `提案: 変換 ${name} の削除を保留しました`;
      
    } catch (error) {
      logger.error('変換削除エラー', { name, error: error.message });
      throw error;
    }
  }

  // Buildup Factor操作
  async proposeBuildupFactor(material, useSlantCorrection, useFiniteMediumCorrection) {
    try {
      if (!material) throw new ValidationError('materialは必須です', 'material', material);
      
      await this.dataManager.addPendingChange({
        action: 'proposeBuildupFactor',
        data: { 
          material, 
          use_slant_correction: useSlantCorrection, 
          use_finite_medium_correction: useFiniteMediumCorrection 
        }
      });
      logger.info('ビルドアップ係数提案を追加しました', { material });
      return `ビルドアップ係数 ${material} を追加しました`;
      
    } catch (error) {
      logger.error('ビルドアップ係数提案エラー', { material, error: error.message });
      throw error;
    }
  }

  async updateBuildupFactor(material, updates) {
    try {
      if (!material) throw new ValidationError('materialは必須です', 'material', material);
      
      await this.dataManager.addPendingChange({
        action: 'updateBuildupFactor',
        data: { material, ...updates }
      });
      logger.info('ビルドアップ係数更新を提案しました', { material, updates });
      return `提案: ビルドアップ係数 ${material} の更新を保留しました`;
      
    } catch (error) {
      logger.error('ビルドアップ係数更新エラー', { material, error: error.message });
      throw error;
    }
  }

  async deleteBuildupFactor(material) {
    try {
      if (!material) throw new ValidationError('materialは必須です', 'material', material);
      
      await this.dataManager.addPendingChange({
        action: 'deleteBuildupFactor',
        data: { material }
      });
      logger.info('ビルドアップ係数削除を提案しました', { material });
      return `提案: ビルドアップ係数 ${material} の削除を保留しました`;
      
    } catch (error) {
      logger.error('ビルドアップ係数削除エラー', { material, error: error.message });
      throw error;
    }
  }

  async changeOrderBuildupFactor(material, newIndex) {
    try {
      if (!material) throw new ValidationError('materialは必須です', 'material', material);
      
      await this.dataManager.addPendingChange({
        action: 'changeOrderBuildupFactor',
        data: { material, newIndex }
      });
      logger.info('ビルドアップ係数順序変更を提案しました', { material, newIndex });
      return `提案: ビルドアップ係数 ${material} の順序変更を保留しました`;
      
    } catch (error) {
      logger.error('ビルドアップ係数順序変更エラー', { material, error: error.message });
      throw error;
    }
  }

  // Source操作
  async proposeSource(params) {
    try {
      const { name, type, position, geometry, division, inventory, cutoff_rate } = params;
      
      // 基本バリデーション
      if (!name) throw PokerMcpError.validationError('線源のnameは必須です', 'name', name);
      ManifestValidator.validateObjectName(name, 'source name');
      
      if (!type) throw PokerMcpError.validationError('線源のtypeは必須です', 'type', type);
      if (!inventory) throw PokerMcpError.validationError('線源のinventoryは必須です', 'inventory', inventory);
      
      // Source構造の包括的検証（SourceValidatorを使用）
      const validationResult = SourceValidator.validateCompleteSourceStructure(params);
      
      // 重複チェック
      if (this.findSourceByName(name)) {
        throw PokerMcpError.duplicateName(name, 'source');
      }
      
      // Transform参照チェック（geometry内にある場合）
      if (geometry && geometry.transform) {
        TransformValidator.validateContextTransformReference(
          geometry.transform,
          this.data,
          'source',
          name
        );
      }
      
      // Source構造の最適化分析
      const optimization = SourceValidator.analyzeSrcStructureOptimization(params);
      if (optimization.suggestions.length > 0) {
        logger.info('Source構造最適化の提案', {
          name,
          suggestions: optimization.suggestions
        });
      }
      
      // データ正規化
      const normalizedParams = this.normalizeSourceData(params);
      
      await this.dataManager.addPendingChange({
        action: 'proposeSource',
        data: normalizedParams
      });
      
      logger.info('線源提案を追加しました', { 
        name, 
        type, 
        validation: validationResult,
        optimization: optimization.isOptimal ? 'optimal' : 'has_suggestions'
      });
      
      const complexityInfo = validationResult.divisionComplexity > 1 ? 
        ` (分割複雑度: ${validationResult.divisionComplexity})` : '';
      
      return `提案: 線源 ${name} (${type}${complexityInfo}) を追加`;
      
    } catch (error) {
      logger.error('線源提案エラー', { params, error: error.message });
      throw error;
    }
  }

  async updateSource(name, updates) {
    try {
      if (!name) throw new ValidationError('線源のnameは必須です', 'name', name);
      
      // 既存線源の存在確認
      const existingSource = this.findSourceByName(name);
      if (!existingSource) {
        throw new ValidationError(`線源 ${name} が見つかりません`, 'name', name);
      }

      // 更新内容のバリデーションと正規化
      const normalizedUpdates = { ...updates };
      
      // POINT線源のposition更新
      if (normalizedUpdates.position) {
        this.validatePosition(normalizedUpdates.position);
        normalizedUpdates.position = this.normalizeCoordinates(normalizedUpdates.position);
      }
      
      // インベントリの更新
      if (normalizedUpdates.inventory) {
        NuclideValidator.validateInventory(normalizedUpdates.inventory);
      }
      
      // geometryの更新
      if (normalizedUpdates.geometry) {
        // 既存Sourceのtypeを取得してgeometry検証
        const sourceType = existingSource.type;
        SourceValidator.validateSourceGeometry(sourceType, normalizedUpdates.geometry);
        normalizedUpdates.geometry = this.normalizeGeometryData(normalizedUpdates.geometry);
        
        // Transform参照チェック
        if (normalizedUpdates.geometry.transform) {
          TransformValidator.validateContextTransformReference(
            normalizedUpdates.geometry.transform,
            this.data,
            'source',
            name
          );
        }
      }
      
      // divisionの更新
      if (normalizedUpdates.division) {
        const sourceType = existingSource.type;
        SourceValidator.validateSourceDivision(sourceType, normalizedUpdates.division);
      }
      
      // cutoff_rateの更新
      if (normalizedUpdates.cutoff_rate !== undefined) {
        SourceValidator.validateCutoffRate(normalizedUpdates.cutoff_rate);
      }
      
      // typeの変更は禁止（物理的整合性のため）
      if (normalizedUpdates.type && normalizedUpdates.type !== existingSource.type) {
        throw new ValidationError('線源のtypeは変更できません', 'type', normalizedUpdates.type);
      }
      
      // 更新後の構造最適化分析
      const mergedSource = { ...existingSource, ...normalizedUpdates };
      const optimization = SourceValidator.analyzeSrcStructureOptimization(mergedSource);
      if (optimization.suggestions.length > 0) {
        logger.info('Source更新後の最適化提案', {
          name,
          suggestions: optimization.suggestions
        });
      }
      
      await this.dataManager.addPendingChange({
        action: 'updateSource',
        data: { name, ...normalizedUpdates }
      });
      
      logger.info('線源更新を提案しました', { name, updates: normalizedUpdates });
      return `提案: 線源 ${name} の更新を保留しました`;
      
    } catch (error) {
      logger.error('線源更新エラー', { name, error: error.message });
      throw error;
    }
  }

  async deleteSource(name) {
    try {
      if (!name) throw new ValidationError('線源のnameは必須です', 'name', name);
      
      // 既存線源の存在確認
      const existingSource = this.findSourceByName(name);
      if (!existingSource) {
        throw new ValidationError(`線源 ${name} が見つかりません`, 'name', name);
      }

      // 依存関係チェック（将来の拡張用）
      // 現在は線源を直接参照する他要素はないが、将来の機能追加に備える
      
      await this.dataManager.addPendingChange({
        action: 'deleteSource',
        data: { name }
      });
      logger.info('線源削除を提案しました', { name });
      return `提案: 線源 ${name} を削除`;
      
    } catch (error) {
      logger.error('線源削除エラー', { name, error: error.message });
      throw error;
    }
  }

  // Body操作の追加メソッド
  async updateBody(name, updates) {
    try {
      if (!name) throw new ValidationError('立体のnameは必須です', 'name', name);
      
      // 座標データの正規化
      const normalizedUpdates = { ...updates };
      if (normalizedUpdates.min) normalizedUpdates.min = this.normalizeCoordinates(normalizedUpdates.min);
      if (normalizedUpdates.max) normalizedUpdates.max = this.normalizeCoordinates(normalizedUpdates.max);
      if (normalizedUpdates.center) normalizedUpdates.center = this.normalizeCoordinates(normalizedUpdates.center);
      if (normalizedUpdates.bottom_center) normalizedUpdates.bottom_center = this.normalizeCoordinates(normalizedUpdates.bottom_center);
      if (normalizedUpdates.height_vector) normalizedUpdates.height_vector = this.normalizeCoordinates(normalizedUpdates.height_vector);
      if (normalizedUpdates.vertex) normalizedUpdates.vertex = this.normalizeCoordinates(normalizedUpdates.vertex);
      if (normalizedUpdates.edge_1) normalizedUpdates.edge_1 = this.normalizeCoordinates(normalizedUpdates.edge_1);
      if (normalizedUpdates.edge_2) normalizedUpdates.edge_2 = this.normalizeCoordinates(normalizedUpdates.edge_2);
      if (normalizedUpdates.edge_3) normalizedUpdates.edge_3 = this.normalizeCoordinates(normalizedUpdates.edge_3);
      // 新しい立体タイプのパラメータ対応
      if (normalizedUpdates.normal) normalizedUpdates.normal = this.normalizeCoordinates(normalizedUpdates.normal);
      if (normalizedUpdates.radius_vector_1) normalizedUpdates.radius_vector_1 = this.normalizeCoordinates(normalizedUpdates.radius_vector_1);
      if (normalizedUpdates.radius_vector_2) normalizedUpdates.radius_vector_2 = this.normalizeCoordinates(normalizedUpdates.radius_vector_2);
      if (normalizedUpdates.radius_vector_3) normalizedUpdates.radius_vector_3 = this.normalizeCoordinates(normalizedUpdates.radius_vector_3);
      if (normalizedUpdates.width_vector) normalizedUpdates.width_vector = this.normalizeCoordinates(normalizedUpdates.width_vector);
      if (normalizedUpdates.depth_vector) normalizedUpdates.depth_vector = this.normalizeCoordinates(normalizedUpdates.depth_vector);
      
      await this.dataManager.addPendingChange({
        action: 'updateBody',
        data: { name, ...normalizedUpdates }
      });
      logger.info('立体更新を提案しました', { name, updates: normalizedUpdates });
      return `提案: 立体 ${name} の更新を保留しました: ${JSON.stringify(normalizedUpdates)}`;
      
    } catch (error) {
      logger.error('立体更新エラー', { name, error: error.message });
      throw error;
    }
  }

  async updateZone(bodyName, updates) {
    try {
      if (!bodyName) throw new ValidationError('ゾーンのbody_nameは必須です', 'body_name', bodyName);
      
      await this.dataManager.addPendingChange({
        action: 'updateZone',
        data: { body_name: bodyName, ...updates }
      });
      logger.info('ゾーン更新を提案しました', { bodyName, updates });
      return `提案: ゾーン ${bodyName} の更新を保留しました: ${JSON.stringify(updates)}`;
      
    } catch (error) {
      logger.error('ゾーン更新エラー', { bodyName, error: error.message });
      throw error;
    }
  }

  // Detector操作
  async proposeDetector(name, origin, grid = [], show_path_trace = false, transform = null) {
    try {
      // 基本パラメータの構築
      const detectorData = {
        name,
        origin,
        grid,
        show_path_trace,
        transform
      };
      
      // DetectorValidatorによる包括的検証
      const validationResult = DetectorValidator.validateCompleteDetectorStructure(
        detectorData, 
        this.data
      );
      
      // 重複チェック
      if (this.findDetectorByName(name)) {
        throw PokerMcpError.duplicateName(name, 'detector');
      }
      
      // Transform参照チェック（指定されている場合）
      if (transform) {
        DetectorValidator.validateDetectorTransform(transform, this.data, name);
      }
      
      // Detector最適化分析
      const optimization = DetectorValidator.analyzeDetectorOptimization(detectorData, this.data);
      
      if (optimization.suggestions.length > 0) {
        logger.info('Detector構造最適化の提案', {
          name,
          suggestions: optimization.suggestions
        });
      }
      
      // データ正規化
      const normalizedDetector = this.normalizeDetectorData(detectorData);
      
      await this.dataManager.addPendingChange({
        action: 'proposeDetector',
        data: normalizedDetector
      });
      
      logger.info('検出器提案を追加しました', { 
        name, 
        validation: validationResult,
        optimization: optimization.isOptimal ? 'optimal' : 'has_suggestions',
        performance: optimization.performance
      });
      
      const complexityInfo = validationResult.complexity > 1 ? 
        ` (複雑度: ${validationResult.complexity})` : '';
      const dimensionInfo = validationResult.gridAnalysis ? 
        ` ${validationResult.gridAnalysis.dimension}D` : ' Point';
      
      return `提案: 検出器 ${name}${dimensionInfo}${complexityInfo} を追加`;
      
    } catch (error) {
      logger.error('検出器提案エラー', { name, origin, error: error.message });
      throw error;
    }
  }

  async updateDetector(name, updates) {
    try {
      if (!name) throw new ValidationError('検出器のnameは必須です', 'name', name);
      
      // 既存検出器の存在確認
      const existingDetector = this.findDetectorByName(name);
      if (!existingDetector) {
        throw new ValidationError(`検出器 ${name} が見つかりません`, 'name', name);
      }

      // 更新データの構築
      const updatedDetectorData = { ...existingDetector, ...updates, name };
      
      // DetectorValidatorによる更新後データの検証
      const validationResult = DetectorValidator.validateCompleteDetectorStructure(
        updatedDetectorData,
        this.data
      );
      
      // Transform参照チェック（更新される場合）
      if (updates.transform !== undefined) {
        if (updates.transform) {
          DetectorValidator.validateDetectorTransform(updates.transform, this.data, name);
        }
      }
      
      // 更新後の最適化分析
      const optimization = DetectorValidator.analyzeDetectorOptimization(updatedDetectorData, this.data);
      
      if (optimization.suggestions.length > 0) {
        logger.info('Detector更新後の最適化提案', {
          name,
          suggestions: optimization.suggestions
        });
      }
      
      // データ正規化
      const normalizedUpdates = this.normalizeDetectorData(updates);
      
      // nameフィールドは削除（名前変更不可）
      delete normalizedUpdates.name;
      
      await this.dataManager.addPendingChange({
        action: 'updateDetector',
        data: { name, ...normalizedUpdates }
      });
      
      logger.info('検出器更新を提案しました', { 
        name, 
        updates: normalizedUpdates,
        validation: validationResult,
        optimization: optimization.isOptimal ? 'optimal' : 'has_suggestions' 
      });
      
      const complexityChange = validationResult.complexity !== existingDetector.grid?.length ?
        ` (複雑度: ${validationResult.complexity})` : '';
      
      return `提案: 検出器 ${name} の更新を保留しました${complexityChange}`;
      
    } catch (error) {
      logger.error('検出器更新エラー', { name, error: error.message });
      throw error;
    }
  }

  async deleteDetector(name) {
    try {
      if (!name) throw new ValidationError('検出器のnameは必須です', 'name', name);
      
      // 既存検出器の存在確認
      const existingDetector = this.findDetectorByName(name);
      if (!existingDetector) {
        throw new ValidationError(`検出器 ${name} が見つかりません`, 'name', name);
      }

      // 依存関係チェック（将来の拡張用）
      // 現在は検出器を直接参照する他要素はないが、将来の機能追加に備える
      
      await this.dataManager.addPendingChange({
        action: 'deleteDetector',
        data: { name }
      });
      logger.info('検出器削除を提案しました', { name });
      return `提案: 検出器 ${name} を削除`;
      
    } catch (error) {
      logger.error('検出器削除エラー', { name, error: error.message });
      throw error;
    }
  }
}
