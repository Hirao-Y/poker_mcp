// validators/DetectorValidator.js
import { PokerMcpError } from '../utils/mcpErrors.js';
import { ManifestValidator } from './ManifestValidator.js';
import { TransformValidator } from './TransformValidator.js';

/**
 * Detector系のグリッド機能完全実装バリデーター
 * マニフェスト仕様に完全準拠した高度なDetector構造検証
 */
export class DetectorValidator {
  
  /**
   * サポートされるDetector次元定義
   */
  static SUPPORTED_DIMENSIONS = {
    1: {
      description: '1次元検出器（線形グリッド）',
      requiredGrids: 1,
      gridNames: ['edge_1'],
      maxDivisions: 10000
    },
    2: {
      description: '2次元検出器（平面グリッド）', 
      requiredGrids: 2,
      gridNames: ['edge_1', 'edge_2'],
      maxDivisions: 1000000  // 1000 x 1000
    },
    3: {
      description: '3次元検出器（立体グリッド）',
      requiredGrids: 3,
      gridNames: ['edge_1', 'edge_2', 'edge_3'],
      maxDivisions: 1000000000  // 1000 x 1000 x 1000
    }
  };

  /**
   * グリッドエッジの方向性定義
   */
  static EDGE_ORIENTATIONS = {
    'orthogonal': '直交グリッド（推奨）',
    'oblique': '斜交グリッド（高度）'
  };

  /**
   * Detector基本情報の検証
   */
  static validateDetectorBasics(detectorData) {
    const { name, origin, grid, show_path_trace } = detectorData;
    
    // 基本フィールドの検証
    ManifestValidator.validateObjectName(name, 'detector name');
    
    if (!origin) {
      throw PokerMcpError.validationError(
        'Detector requires origin coordinate',
        'origin',
        origin
      );
    }
    
    ManifestValidator.validateCoordinateString(origin, 'origin');
    
    // show_path_traceの検証（必須パラメータ）
    if (show_path_trace === undefined) {
      throw PokerMcpError.validationError(
        'show_path_trace parameter is required for radiation path analysis',
        'show_path_trace',
        show_path_trace,
        -32051
      );
    }
    
    if (typeof show_path_trace !== 'boolean') {
      throw PokerMcpError.validationError(
        'show_path_trace must be boolean',
        'show_path_trace',
        show_path_trace
      );
    }
    
    return true;
  }

  /**
   * グリッド次元の検証
   */
  static validateGridDimension(grid) {
    if (!Array.isArray(grid)) {
      throw PokerMcpError.validationError(
        'grid must be an array',
        'grid',
        grid
      );
    }
    
    const dimension = grid.length;
    
    if (dimension < 1 || dimension > 3) {
      throw PokerMcpError.validationError(
        'Detector dimension must be 1, 2, or 3',
        'grid.length',
        dimension
      );
    }
    
    const dimensionInfo = this.SUPPORTED_DIMENSIONS[dimension];
    if (grid.length !== dimensionInfo.requiredGrids) {
      throw PokerMcpError.validationError(
        `${dimension}D detector requires exactly ${dimensionInfo.requiredGrids} grid edges`,
        'grid',
        grid
      );
    }
    
    return {
      dimension,
      info: dimensionInfo
    };
  }

  /**
   * グリッドエッジの検証
   */
  static validateGridEdge(edge, edgeName, index) {
    if (!edge || typeof edge !== 'object') {
      throw PokerMcpError.validationError(
        `${edgeName} must be a grid edge object`,
        edgeName,
        edge
      );
    }
    
    const { edge: edgeVector, number } = edge;
    
    // エッジベクトルの検証
    if (!edgeVector) {
      throw PokerMcpError.validationError(
        `${edgeName} requires edge vector`,
        `${edgeName}.edge`,
        edgeVector
      );
    }
    
    ManifestValidator.validateCoordinateString(edgeVector, `${edgeName}.edge`);
    
    // 分割数の検証
    ManifestValidator.validateGridDivision(number, `${edgeName}.number`);
    
    // エッジベクトルの物理的妥当性チェック
    const [x, y, z] = edgeVector.split(/\s+/).map(Number);
    const magnitude = Math.sqrt(x*x + y*y + z*z);
    
    if (magnitude < 1e-10) {
      throw PokerMcpError.validationError(
        `${edgeName} edge vector cannot be zero`,
        `${edgeName}.edge`,
        edgeVector
      );
    }
    
    // 過度に大きなエッジベクトルの警告
    if (magnitude > 10000) {
      console.warn(`DetectorValidator: ${edgeName} has very large edge vector (${magnitude.toFixed(2)})`);
    }
    
    return {
      vector: [x, y, z],
      magnitude,
      divisions: number
    };
  }

  /**
   * グリッド全体の検証
   */
  static validateCompleteGrid(grid) {
    const dimensionResult = this.validateGridDimension(grid);
    const { dimension, info } = dimensionResult;
    
    const edgeResults = [];
    let totalDivisions = 1;
    
    // 各エッジの検証
    for (let i = 0; i < dimension; i++) {
      const edgeName = info.gridNames[i];
      const edgeResult = this.validateGridEdge(grid[i], edgeName, i);
      edgeResults.push(edgeResult);
      totalDivisions *= edgeResult.divisions;
    }
    
    // 総分割数の妥当性チェック
    if (totalDivisions > info.maxDivisions) {
      throw PokerMcpError.validationError(
        `Total grid divisions (${totalDivisions}) exceeds maximum for ${dimension}D detector (${info.maxDivisions})`,
        'grid',
        totalDivisions
      );
    }
    
    // グリッドエッジの直交性チェック
    const orthogonality = this.checkGridOrthogonality(edgeResults);
    
    return {
      dimension,
      dimensionInfo: info,
      edges: edgeResults,
      totalDivisions,
      orthogonality,
      gridVolume: this.calculateGridVolume(edgeResults),
      gridDensity: totalDivisions / this.calculateGridVolume(edgeResults)
    };
  }

  /**
   * グリッドエッジの直交性チェック
   */
  static checkGridOrthogonality(edgeResults) {
    if (edgeResults.length < 2) {
      return { type: 'single_edge', orthogonal: true };
    }
    
    const angles = [];
    const tolerance = 1e-6;
    
    // すべてのエッジペアの角度を計算
    for (let i = 0; i < edgeResults.length; i++) {
      for (let j = i + 1; j < edgeResults.length; j++) {
        const v1 = edgeResults[i].vector;
        const v2 = edgeResults[j].vector;
        
        const dot = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
        const angle = Math.acos(Math.abs(dot) / (edgeResults[i].magnitude * edgeResults[j].magnitude));
        const angleDegrees = angle * 180 / Math.PI;
        
        angles.push({
          edges: [i, j],
          angle: angleDegrees,
          isOrthogonal: Math.abs(angleDegrees - 90) < tolerance || Math.abs(angleDegrees - 0) < tolerance
        });
      }
    }
    
    const allOrthogonal = angles.every(a => a.isOrthogonal);
    const orthogonalCount = angles.filter(a => a.isOrthogonal).length;
    
    return {
      type: allOrthogonal ? 'orthogonal' : 'oblique',
      orthogonal: allOrthogonal,
      angles,
      orthogonalRatio: orthogonalCount / angles.length
    };
  }

  /**
   * グリッド体積の計算
   */
  static calculateGridVolume(edgeResults) {
    if (edgeResults.length === 1) {
      // 1D: 線の長さ
      return edgeResults[0].magnitude;
    } else if (edgeResults.length === 2) {
      // 2D: 平行四辺形の面積
      const [v1, v2] = [edgeResults[0].vector, edgeResults[1].vector];
      const cross = [
        v1[1]*v2[2] - v1[2]*v2[1],
        v1[2]*v2[0] - v1[0]*v2[2], 
        v1[0]*v2[1] - v1[1]*v2[0]
      ];
      return Math.sqrt(cross[0]*cross[0] + cross[1]*cross[1] + cross[2]*cross[2]);
    } else if (edgeResults.length === 3) {
      // 3D: 平行六面体の体積
      const [v1, v2, v3] = [edgeResults[0].vector, edgeResults[1].vector, edgeResults[2].vector];
      const cross = [
        v2[1]*v3[2] - v2[2]*v3[1],
        v2[2]*v3[0] - v2[0]*v3[2], 
        v2[0]*v3[1] - v2[1]*v3[0]
      ];
      return Math.abs(v1[0]*cross[0] + v1[1]*cross[1] + v1[2]*cross[2]);
    }
    return 0;
  }

  /**
   * Transform参照の検証
   */
  static validateDetectorTransform(transform, yamlData, detectorName) {
    if (!transform) {
      return true; // transform参照はオプション
    }
    
    try {
      TransformValidator.validateContextTransformReference(
        transform, 
        yamlData, 
        'detector', 
        detectorName
      );
    } catch (error) {
      // エラーメッセージにコンテキスト情報を追加
      if (error instanceof PokerMcpError) {
        throw new PokerMcpError(
          error.code,
          `Detector '${detectorName}' references invalid transform: ${error.message}`,
          'transform',
          transform
        );
      }
      throw error;
    }
    
    return true;
  }

  /**
   * Detector構造全体の包括的検証
   */
  static validateCompleteDetectorStructure(detectorData, yamlData = null) {
    const { name, origin, grid, transform, show_path_trace } = detectorData;
    
    // 基本情報の検証
    this.validateDetectorBasics(detectorData);
    
    // グリッドの完全検証
    let gridAnalysis = null;
    if (grid && grid.length > 0) {
      gridAnalysis = this.validateCompleteGrid(grid);
    }
    
    // Transform参照の検証
    if (transform && yamlData) {
      this.validateDetectorTransform(transform, yamlData, name);
    }
    
    return {
      name,
      origin: origin.split(/\s+/).map(Number),
      hasGrid: !!(grid && grid.length > 0),
      gridAnalysis,
      hasTransform: !!transform,
      pathTrace: !!show_path_trace,
      complexity: gridAnalysis ? gridAnalysis.totalDivisions : 1,
      type: this.classifyDetectorType(gridAnalysis, transform, show_path_trace)
    };
  }

  /**
   * Detector型の分類
   */
  static classifyDetectorType(gridAnalysis, transform, pathTrace) {
    let type = 'point';  // デフォルト
    
    if (gridAnalysis) {
      const { dimension, orthogonality } = gridAnalysis;
      type = `${dimension}d_${orthogonality.type}`;
      
      if (gridAnalysis.totalDivisions > 10000) {
        type += '_high_resolution';
      }
    }
    
    if (transform) {
      type += '_transformed';
    }
    
    if (pathTrace) {
      type += '_path_traced';
    }
    
    return type;
  }

  /**
   * Detector最適化分析
   */
  static analyzeDetectorOptimization(detectorData, yamlData = null) {
    const analysis = this.validateCompleteDetectorStructure(detectorData, yamlData);
    const suggestions = [];
    
    // グリッド最適化の提案
    if (analysis.gridAnalysis) {
      const { totalDivisions, orthogonality, gridDensity } = analysis.gridAnalysis;
      
      // 高解像度グリッドの警告
      if (totalDivisions > 100000) {
        suggestions.push({
          type: 'performance',
          priority: 'high',
          message: `Very high grid resolution (${totalDivisions} divisions). Consider reducing for better performance.`
        });
      }
      
      // 非直交グリッドの警告
      if (!orthogonality.orthogonal) {
        suggestions.push({
          type: 'geometry',
          priority: 'medium',
          message: `Non-orthogonal grid detected (${(orthogonality.orthogonalRatio * 100).toFixed(1)}% orthogonal). May affect calculation accuracy.`
        });
      }
      
      // グリッド密度の分析
      if (gridDensity > 1000) {
        suggestions.push({
          type: 'resolution',
          priority: 'low',
          message: `High grid density (${gridDensity.toFixed(1)} divisions/unit³). Verify if this resolution is necessary.`
        });
      }
    }
    
    // パス追跡機能の使用提案
    if (!analysis.pathTrace && analysis.complexity > 1000) {
      suggestions.push({
        type: 'feature',
        priority: 'medium',
        message: 'Consider enabling path tracing for high-resolution detector analysis.'
      });
    }
    
    // Transform使用の最適化
    if (analysis.hasTransform && yamlData) {
      // Transform使用統計を取得できる場合の分析
      suggestions.push({
        type: 'geometry',
        priority: 'low',
        message: 'Transform detected. Verify geometric transformation is necessary for this detector.'
      });
    }
    
    return {
      analysis,
      suggestions,
      isOptimal: suggestions.filter(s => s.priority === 'high').length === 0,
      performance: {
        complexity: analysis.complexity,
        estimatedMemory: this.estimateMemoryUsage(analysis),
        recommendedCpuCores: this.recommendCpuCores(analysis)
      }
    };
  }

  /**
   * メモリ使用量の推定
   */
  static estimateMemoryUsage(analysis) {
    const baseMemory = 1; // MB base
    const gridMemory = analysis.complexity * 0.001; // MB per division
    const transformMemory = analysis.hasTransform ? 0.1 : 0;
    const pathTraceMemory = analysis.pathTrace ? analysis.complexity * 0.01 : 0;
    
    return {
      base: baseMemory,
      grid: gridMemory,
      transform: transformMemory,
      pathTrace: pathTraceMemory,
      total: baseMemory + gridMemory + transformMemory + pathTraceMemory
    };
  }

  /**
   * 推奨CPU コア数
   */
  static recommendCpuCores(analysis) {
    if (analysis.complexity < 100) return 1;
    if (analysis.complexity < 1000) return 2;
    if (analysis.complexity < 10000) return 4;
    if (analysis.complexity < 100000) return 8;
    return 16;
  }

  /**
   * グリッド互換性チェック
   */
  static checkDetectorCompatibility(detector1, detector2) {
    const analysis1 = this.validateCompleteDetectorStructure(detector1);
    const analysis2 = this.validateCompleteDetectorStructure(detector2);
    
    const compatibility = {
      dimensionMatch: false,
      resolutionCompatible: false,
      geometryCompatible: false,
      overall: 'incompatible'
    };
    
    // 次元マッチング
    if (analysis1.gridAnalysis && analysis2.gridAnalysis) {
      compatibility.dimensionMatch = 
        analysis1.gridAnalysis.dimension === analysis2.gridAnalysis.dimension;
    }
    
    // 解像度互換性
    const ratio = analysis1.complexity / analysis2.complexity;
    compatibility.resolutionCompatible = ratio >= 0.1 && ratio <= 10;
    
    // 幾何学的互換性
    compatibility.geometryCompatible = 
      analysis1.type.includes('orthogonal') === analysis2.type.includes('orthogonal');
    
    // 総合評価
    const compatibilityScore = [
      compatibility.dimensionMatch,
      compatibility.resolutionCompatible,
      compatibility.geometryCompatible
    ].filter(Boolean).length;
    
    if (compatibilityScore === 3) compatibility.overall = 'fully_compatible';
    else if (compatibilityScore === 2) compatibility.overall = 'mostly_compatible';
    else if (compatibilityScore === 1) compatibility.overall = 'partially_compatible';
    
    return compatibility;
  }
}
