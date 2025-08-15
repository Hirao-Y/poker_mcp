# poker_mcp 改善提案書

## 📋 概要

このドキュメントは、放射線遮蔽計算用MCPサーバー `poker_mcp` の改善提案をまとめたものです。
現在のシステムは基本的な機能は実装されていますが、実用性、安定性、拡張性の観点から改善の余地があります。

---

## 🚨 Phase 1: 緊急対応（高優先度）

### 1. エラーハンドリングとデータ保護の強化

#### 現状の問題
```javascript
// 現在：シンプルすぎるエラー処理
fs.writeFileSync(this.yamlFile, yaml.dump(this.data, { flowLevel: 1 }));
```

#### 改善案
```javascript
// 改善後：バックアップ機能付き安全な保存
class SafeFileManager {
  saveWithBackup(data, filepath) {
    const backupPath = `${filepath}.backup.${Date.now()}`;
    const tempPath = `${filepath}.temp`;
    
    try {
      // 現在のファイルをバックアップ
      if (fs.existsSync(filepath)) {
        fs.copyFileSync(filepath, backupPath);
      }
      
      // 一時ファイルに保存
      fs.writeFileSync(tempPath, yaml.dump(data, { flowLevel: 1 }));
      
      // YAML構文チェック
      yaml.load(fs.readFileSync(tempPath, 'utf8'));
      
      // 問題なければ本ファイルに移動
      fs.renameSync(tempPath, filepath);
      
      // 古いバックアップを削除（最新3個まで保持）
      this.cleanOldBackups(filepath);
      
    } catch (error) {
      // エラー時は元ファイルを復旧
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filepath);
      }
      throw new Error(`ファイル保存エラー: ${error.message}`);
    } finally {
      // 一時ファイルを削除
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }
  
  cleanOldBackups(filepath) {
    const dir = path.dirname(filepath);
    const base = path.basename(filepath);
    const backups = fs.readdirSync(dir)
      .filter(f => f.startsWith(`${base}.backup.`))
      .sort()
      .reverse();
    
    // 最新3個以外を削除
    backups.slice(3).forEach(backup => {
      fs.unlinkSync(path.join(dir, backup));
    });
  }
}}

// 使用例
const fileManager = new SafeFileManager();
fileManager.saveWithBackup(this.data, this.yamlFile);
```

#### 具体的効果
- **データ損失防止**: YAMLファイル破損時の自動復旧
- **段階的保存**: 一時ファイル経由での安全な保存
- **履歴管理**: バックアップファイルの自動管理（最新3個保持）

---

### 2. 入力値検証の大幅強化

#### 現状の問題
```javascript
// 現在：基本的なチェックのみ
if (!name || !type) {
  throw new Error('nameとtypeは必須です');
}
```

#### 改善案
```javascript
// 改善後：詳細な検証システム
class ValidationEngine {
  validateBody(name, type, params) {
    const errors = [];
    
    // 名前の検証
    if (!this.isValidName(name)) {
      errors.push('立体名は英数字とアンダースコアのみ使用可能です');
    }
    
    if (this.isDuplicateName(name)) {
      errors.push(`立体名 "${name}" は既に使用されています`);
    }
    
    // タイプ別詳細検証
    switch (type) {
      case 'RPP':
        errors.push(...this.validateRPP(params));
        break;
      case 'SPH':
        errors.push(...this.validateSPH(params));
        break;
      case 'RCC':
        errors.push(...this.validateRCC(params));
        break;
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
    
    return true;
  }
  
  validateRPP(params) {
    const errors = [];
    const { min, max } = params;
    
    if (!min || !max) {
      errors.push('RPP型はminとmaxパラメータが必須です');
      return errors;
    }
    
    const minCoords = this.parseCoordinates(min);
    const maxCoords = this.parseCoordinates(max);
    
    if (!minCoords || !maxCoords) {
      errors.push('座標は "x y z" 形式で3つの数値を指定してください');
      return errors;
    }
    
    // 幾何学的妥当性チェック
    for (let i = 0; i < 3; i++) {
      if (minCoords[i] >= maxCoords[i]) {
        const axes = ['X', 'Y', 'Z'];
        errors.push(`${axes[i]}軸でmin(${minCoords[i]}) >= max(${maxCoords[i]})です`);
      }
    }
    
    // 体積チェック
    const volume = (maxCoords[0] - minCoords[0]) * 
                   (maxCoords[1] - minCoords[1]) * 
                   (maxCoords[2] - minCoords[2]);
    
    if (volume <= 0) {
      errors.push(`計算された体積(${volume})が0以下です`);
    }
    
    if (volume > 1e9) {
      errors.push(`体積(${volume})が異常に大きいです。単位を確認してください`);
    }
    
    return errors;
  }
  
  validateSPH(params) {
    const errors = [];
    const { center, radius } = params;
    
    if (!center) {
      errors.push('SPH型はcenterパラメータが必須です');
    }
    
    if (!radius) {
      errors.push('SPH型はradiusパラメータが必須です');
    }
    
    if (radius <= 0) {
      errors.push(`半径(${radius})は正の値である必要があります`);
    }
    
    if (radius > 1000) {
      errors.push(`半径(${radius})が異常に大きいです。単位を確認してください`);
    }
    
    const centerCoords = this.parseCoordinates(center);
    if (!centerCoords) {
      errors.push('centerは "x y z" 形式で3つの数値を指定してください');
    }
    
    return errors;
  }
  
  parseCoordinates(coordStr) {
    if (typeof coordStr !== 'string') return null;
    
    const parts = coordStr.trim().split(/\s+/);
    if (parts.length !== 3) return null;
    
    const coords = parts.map(p => parseFloat(p));
    if (coords.some(isNaN)) return null;
    
    return coords;
  }
}}

// カスタムエラークラス
class ValidationError extends Error {
  constructor(errors) {
    super(`検証エラー:\n${errors.map(e => `- ${e}`).join('\n')}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
```

#### 使用例
```javascript
// 正常なケース
validateBody('Shield1', 'RPP', { min: '0 0 0', max: '10 10 10' });
// → エラーなし

// エラーケース
validateBody('Shield-1', 'RPP', { min: '10 10 10', max: '0 0 0' });
// → ValidationError: 
//   - 立体名は英数字とアンダースコアのみ使用可能です
//   - X軸でmin(10) >= max(0)です
//   - Y軸でmin(10) >= max(0)です
//   - Z軸でmin(10) >= max(0)です
```

---

### 3. トランザクション機能の実装

#### 現状の問題
```javascript
// 現在：途中でエラーが発生すると中途半端な状態になる
applyChanges() {
  for (const change of this.pendingChanges) {
    this.applyChange(change); // ここでエラーが出ると後続処理が中断
  }
}
```

#### 改善案
```javascript
// 改善後：全て成功するか全て失敗するかのトランザクション
class TransactionManager {
  async executeTransaction(changes, description = '') {
    const transactionId = `tx_${Date.now()}`;
    const snapshot = this.createSnapshot();
    
    console.log(`トランザクション開始 [${transactionId}]: ${description}`);
    
    try {
      // 事前検証フェーズ
      await this.validateAllChanges(changes);
      
      // 実行フェーズ
      const results = [];
      for (const [index, change] of changes.entries()) {
        console.log(`  処理中 ${index + 1}/${changes.length}: ${change.action}`);
        const result = await this.applyChange(change);
        results.push(result);
      }
      
      // 事後検証フェーズ
      await this.validateFinalState();
      
      // 成功時の処理
      this.saveData();
      this.clearPendingChanges();
      
      console.log(`トランザクション完了 [${transactionId}]: ${results.length}件の変更`);
      return { 
        success: true, 
        transactionId, 
        appliedChanges: results.length,
        description 
      };
      
    } catch (error) {
      console.error(`トランザクション失敗 [${transactionId}]: ${error.message}`);
      
      // ロールバック実行
      await this.rollback(snapshot);
      
      throw new TransactionError(
        `トランザクション失敗: ${error.message}`,
        transactionId,
        changes.length
      );
    }
  }
  
  async validateAllChanges(changes) {
    const errors = [];
    
    for (const [index, change] of changes.entries()) {
      try {
        await this.validateChange(change);
      } catch (error) {
        errors.push(`変更 ${index + 1}: ${error.message}`);
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
  }
  
  createSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(this.data)),
      pendingChanges: JSON.parse(JSON.stringify(this.pendingChanges))
    };
  }
  
  async rollback(snapshot) {
    console.log(`ロールバック実行: ${snapshot.timestamp}`);
    this.data = snapshot.data;
    this.pendingChanges = snapshot.pendingChanges;
    this.saveData();
  }
}

// 使用例
const transaction = new TransactionManager();

try {
  await transaction.executeTransaction([
    { action: 'add_body', body: { name: 'Shield1', type: 'RPP', min: '0 0 0', max: '10 10 10' }},
    { action: 'add_zone', zone: { body_name: 'Shield1', material: 'Lead', density: 11.34 }},
    { action: 'add_body', body: { name: 'Shield2', type: 'SPH', center: '20 0 0', radius: 5 }}
  ], '鉛遮蔽体セットの追加');
  
  console.log('全ての変更が正常に適用されました');
  
} catch (error) {
  console.error('変更が全てロールバックされました:', error.message);
}
```

---

## 🔧 Phase 2: 機能性向上（中優先度）

### 4. 幾何学的妥当性チェック（放射線遮蔽計算で重要）

#### 現状の問題
- 立体同士の重複検出なし
- 隙間（計算エラーの原因）の検出なし
- 非現実的な形状の検出なし

#### 改善案
```javascript
class GeometryValidator {
  // 立体重複チェック
  checkOverlaps() {
    const overlaps = [];
    const bodies = this.data.body;
    
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const overlap = this.calculateOverlap(bodies[i], bodies[j]);
        if (overlap.exists) {
          overlaps.push({
            body1: bodies[i].name,
            body2: bodies[j].name,
            overlapVolume: overlap.volume,
            severity: overlap.volume > 1 ? 'critical' : 'warning'
          });
        }
      }
    }
    
    return overlaps;
  }
  
  // RPP同士の重複計算
  calculateRPPOverlap(rpp1, rpp2) {
    const min1 = this.parseCoordinates(rpp1.min);
    const max1 = this.parseCoordinates(rpp1.max);
    const min2 = this.parseCoordinates(rpp2.min);
    const max2 = this.parseCoordinates(rpp2.max);
    
    // 各軸での重複範囲を計算
    const overlapMin = [
      Math.max(min1[0], min2[0]),
      Math.max(min1[1], min2[1]),
      Math.max(min1[2], min2[2])
    ];
    
    const overlapMax = [
      Math.min(max1[0], max2[0]),
      Math.min(max1[1], max2[1]),
      Math.min(max1[2], max2[2])
    ];
    
    // 重複が存在するかチェック
    const hasOverlap = overlapMin.every((min, i) => min < overlapMax[i]);
    
    if (!hasOverlap) {
      return { exists: false, volume: 0 };
    }
    
    // 重複体積を計算
    const volume = (overlapMax[0] - overlapMin[0]) *
                   (overlapMax[1] - overlapMin[1]) *
                   (overlapMax[2] - overlapMin[2]);
    
    return { exists: true, volume, bounds: { min: overlapMin, max: overlapMax }};
  }
  
  // 隙間検出
  findGaps() {
    const gaps = [];
    // 全空間を小さなボクセルに分割して、どの立体にも属さない領域を特定
    const resolution = 1.0; // 1cm解像度
    const bounds = this.calculateOverallBounds();
    
    for (let x = bounds.min[0]; x < bounds.max[0]; x += resolution) {
      for (let y = bounds.min[1]; y < bounds.max[1]; y += resolution) {
        for (let z = bounds.min[2]; z < bounds.max[2]; z += resolution) {
          const point = [x, y, z];
          const containingBodies = this.findContainingBodies(point);
          
          if (containingBodies.length === 0) {
            gaps.push({
              position: point,
              type: 'void',
              severity: 'warning'
            });
          }
        }
      }
    }
    
    return this.clusterGaps(gaps); // 近接する隙間をまとめる
  }
}        
        stats.volumes.total += volume;
        stats.masses.total += mass;
        
        // 体積統計
        if (!stats.volumes.byMaterial[material]) {
          stats.volumes.byMaterial[material] = 0;
        }
        stats.volumes.byMaterial[material] += volume;
        
        // 質量統計  
        if (!stats.masses.byMaterial[material]) {
          stats.masses.byMaterial[material] = 0;
        }
        stats.masses.byMaterial[material] += mass;
        
        // 最大・最小体積
        if (!stats.volumes.largest || volume > stats.volumes.largest.volume) {
          stats.volumes.largest = { name: zone.body_name, volume, material };
        }
        if (!stats.volumes.smallest || volume < stats.volumes.smallest.volume) {
          stats.volumes.smallest = { name: zone.body_name, volume, material };
        }
      }
      
      // 密度分布
      for (const [range, data] of Object.entries(stats.densityDistribution.ranges)) {
        if (density >= data.min && density < data.max) {
          data.count++;
          if (!data.materials.includes(material)) {
            data.materials.push(material);
          }
          break;
        }
      }
    });
    
    return stats;
  }
};

// 使用例
```

#### 具体的使用例
```javascript
// 1. 大きな鉛構造物を検索
const largeLead = await mcp.call('pokerinput.findZones', {
  material: 'Lead',
  densityRange: { min: 10, max: 12 }
});

largeLead.forEach(zone => {
  console.log(`${zone.body_name}: 体積 ${zone.volume.toFixed(1)} cm³, 質量 ${zone.mass.toFixed(1)} g`);
});

// 2. 材質が未割り当ての立体を検索
const unassigned = await mcp.call('pokerinput.findBodies', {
  materialAssigned: false
});

console.log(`材質未割り当ての立体: ${unassigned.length}個`);
unassigned.forEach(body => {
  console.log(`- ${body.name} (${body.type}型)`);
});

// 3. プロジェクト全体の統計
const stats = await mcp.call('pokerinput.getStatistics');
console.log(`
=== プロジェクト統計 ===
総立体数: ${stats.overview.totalBodies}
総質量: ${stats.masses.total.toFixed(1)} g
最大構造物: ${stats.volumes.largest.name} (${stats.volumes.largest.volume.toFixed(1)} cm³)

材質別使用量:
${Object.entries(stats.materialUsage).map(([mat, data]) => 
  `- ${mat}: ${data.count}個, ${data.totalMass.toFixed(1)} g`
).join('\n')}
`);
```

---

### 7. 3D可視化・エクスポート機能

#### 現状の問題
- 設計した遮蔽体の形状を視覚的に確認できない
- 他のツールとの連携が困難

#### 改善案
```javascript
class VisualizationExporter {
  // Three.js用データ生成
  'pokerinput.generateVisualization': ({ bodies, materials, options = {} }) => {
    const scene = {
      metadata: {
        version: 4.5,
        type: 'Object',
        generator: 'poker_mcp'
      },
      geometries: [],
      materials: [],
      objects: []
    };
    
    const requestedBodies = bodies || this.data.body.map(b => b.name);
    const materialColors = this.getMaterialColors();
    
    requestedBodies.forEach((bodyName, index) => {
      const body = this.data.body.find(b => b.name === bodyName);
      const zone = this.data.zone.find(z => z.body_name === bodyName);
      
      if (!body) return;
      
      // ジオメトリ生成
      const geometry = this.createGeometry(body, index);
      scene.geometries.push(geometry);
      
      // マテリアル生成
      const material = this.createMaterial(zone, materialColors, index);
      scene.materials.push(material);
      
      // オブジェクト生成
      scene.objects.push({
        uuid: `object_${index}`,
        type: 'Mesh',
        name: bodyName,
        geometry: geometry.uuid,
        material: material.uuid,
        userData: {
          bodyType: body.type,
          material: zone?.material || 'undefined',
          density: zone?.density || null,
          volume: this.calculateVolume(body)
        }
      });
    });
    
    return scene;
  },
  
  createGeometry(body, index) {
    const uuid = `geometry_${index}`;
    
    switch (body.type) {
      case 'RPP':
        const min = this.parseCoordinates(body.min);
        const max = this.parseCoordinates(body.max);
        const width = max[0] - min[0];
        const height = max[1] - min[1];
        const depth = max[2] - min[2];
        
        return {
          uuid,
          type: 'BoxGeometry',
          width,
          height,  
          depth,
          widthSegments: 1,
          heightSegments: 1,
          depthSegments: 1,
          position: [
            (min[0] + max[0]) / 2,
            (min[1] + max[1]) / 2, 
            (min[2] + max[2]) / 2
          ]
        };
        
      case 'SPH':
        const center = this.parseCoordinates(body.center);
        return {
          uuid,
          type: 'SphereGeometry',
          radius: body.radius,
          widthSegments: 32,
          heightSegments: 16,
          position: center
        };
        
      case 'RCC':
        const bottomCenter = this.parseCoordinates(body.bottom_center);
        const heightVector = this.parseCoordinates(body.height_vector);
        const height = Math.sqrt(heightVector.reduce((sum, v) => sum + v*v, 0));
        
        return {
          uuid,
          type: 'CylinderGeometry',
          radiusTop: body.radius,
          radiusBottom: body.radius,
          height,
          radialSegments: 32,
          position: [
            bottomCenter[0] + heightVector[0] / 2,
            bottomCenter[1] + heightVector[1] / 2,
            bottomCenter[2] + heightVector[2] / 2
          ]
        };
        
      default:
        throw new Error(`未対応の立体タイプ: ${body.type}`);
    }
  },
  
  createMaterial(zone, materialColors, index) {
    const material = zone?.material || 'undefined';
    const color = materialColors[material] || '#cccccc';
    const opacity = this.getMaterialOpacity(material);
    
    return {
      uuid: `material_${index}`,
      type: 'MeshPhongMaterial',
      color: parseInt(color.replace('#', '0x')),
      transparent: opacity < 1.0,
      opacity,
      shininess: 30,
      userData: {
        materialName: material,
        density: zone?.density || null
      }
    };
  },
  
  getMaterialColors() {
    return {
      'Lead': '#444444',        // 濃い灰色
      'Iron': '#B87333',        // 茶色がかった金属色
      'Concrete': '#C0C0C0',    // 薄い灰色
      'Water': '#4169E1',       // 青色（透明）
      'Air': '#87CEEB',         // 薄い青（透明）
      'Polyethylene': '#FFFFFF', // 白色
      'Copper': '#B87333',      // 銅色
      'Aluminium': '#D3D3D3',   // 薄い金属色
      'Tungsten': '#2F2F2F',    // 濃い金属色
      'undefined': '#FF6B6B'    // 警告色（赤）
    };
  },
  
  getMaterialOpacity(material) {
    const transparentMaterials = {
      'Air': 0.1,
      'Water': 0.7,
      'VOID': 0.05
    };
    return transparentMaterials[material] || 1.0;
  },
  
  // STL形式エクスポート（3Dプリント用）
  'pokerinput.exportToSTL': ({ bodies, resolution = 'medium' }) => {
    const stlData = [];
    const resolutionSettings = {
      'low': { segments: 8 },
      'medium': { segments: 16 },
      'high': { segments: 32 }
    };
    
    const settings = resolutionSettings[resolution];
    
    bodies.forEach(bodyName => {
      const body = this.data.body.find(b => b.name === bodyName);
      if (!body) return;
      
      const triangles = this.generateTriangles(body, settings);
      stlData.push({
        name: bodyName,
        triangleCount: triangles.length,
        triangles: triangles
      });
    });
    
    return {
      format: 'STL',
      version: '1.0',
      units: this.data.unit.length,
      totalTriangles: stlData.reduce((sum, obj) => sum + obj.triangleCount, 0),
      objects: stlData
    };
  },
  
  // PHITS形式エクスポート（実際の計算用）
  'pokerinput.exportToPHITS': ({ title, particles, energy }) => {
    const phitsInput = [];
    
    // タイトル
    phitsInput.push(`[ Title ]`);
    phitsInput.push(title || 'Generated by poker_mcp');
    phitsInput.push('');
    
    // パラメータ設定
    phitsInput.push(`[ Parameters ]`);
    phitsInput.push(`icntl    = 0          # 計算制御`);
    phitsInput.push(`maxcas   = 100000     # 最大履歴数`);
    phitsInput.push(`maxbch   = 10         # バッチ数`);
    phitsInput.push('');
    
    // 線源定義
    if (this.data.source && this.data.source.length > 0) {
      phitsInput.push(`[ Source ]`);
      this.data.source.forEach((source, i) => {
        phitsInput.push(`s-type   = ${this.convertSourceType(source.type)}`);
        if (source.position) {
          const pos = this.parseCoordinates(source.position);
          phitsInput.push(`sx       = ${pos[0]}`);
          phitsInput.push(`sy       = ${pos[1]}`); 
          phitsInput.push(`sz       = ${pos[2]}`);
        }
        phitsInput.push(`e0       = ${energy || 0.511}  # MeV`);
        phitsInput.push('');
      });
    }
    
    // 材質定義
    phitsInput.push(`[ Material ]`);
    const uniqueMaterials = [...new Set(this.data.zone.map(z => z.material))];
    
    uniqueMaterials.forEach((material, i) => {
      const matId = i + 1;
      phitsInput.push(`MAT[${matId}]`);
      phitsInput.push(`# ${material}`);
      
      // 材質組成（簡略化）
      const composition = this.getMaterialComposition(material);
      Object.entries(composition).forEach(([element, fraction]) => {
        phitsInput.push(`${element}    ${fraction}`);
      });
      phitsInput.push('');
    });
    
    // セル定義
    phitsInput.push(`[ Cell ]`);
    this.data.zone.forEach((zone, i) => {
      const body = this.data.body.find(b => b.name === zone.body_name);
      if (!body) return;
      
      const cellId = i + 1;
      const matId = uniqueMaterials.indexOf(zone.material) + 1;
      const density = -zone.density; // g/cm³ (負の値)
      
      phitsInput.push(`${cellId}    ${matId}    ${density}    ${this.convertBodyToPHITS(body)}`);
    });
    
    // 外部世界
    phitsInput.push(`999    -1    0.0    #(${Array.from({length: this.data.zone.length}, (_, i) => i + 1).join(' ')})`);
    phitsInput.push('');
    
    // 表面定義
    phitsInput.push(`[ Surface ]`);
    this.data.body.forEach((body, i) => {
      const surfaceId = i + 1;
      phitsInput.push(...this.generatePHITSSurfaces(body, surfaceId));
    });
    
    return {
      format: 'PHITS',
      content: phitsInput.join('\n'),
      materials: uniqueMaterials.length,
      cells: this.data.zone.length
    };
  }
};

// 使用例
```

#### 具体的使用例
```javascript
// 1. 3D可視化データ生成
const visualization = await mcp.call('pokerinput.generateVisualization', {
  bodies: ['Shield1', 'Shield2'],
  materials: true
});

// Three.jsで表示
const loader = new THREE.ObjectLoader();
const scene = loader.parse(visualization);
renderer.render(scene, camera);

// 2. STL形式でエクスポート（3Dプリント用）
const stlData = await mcp.call('pokerinput.exportToSTL', {
  bodies: ['Shield1'],
  resolution: 'high'
});

// ファイル保存
fs.writeFileSync('shield_model.stl', stlData.content);

// 3. PHITS形式でエクスポート（計算用）
const phitsInput = await mcp.call('pokerinput.exportToPHITS', {
  title: 'Lead Shield Analysis',
  particles: 'photon',
  energy: 0.511
});

fs.writeFileSync('shield_analysis.inp', phitsInput.content);
console.log(`PHITS入力ファイル生成完了: ${phitsInput.materials}材質, ${phitsInput.cells}セル`);
```

---

## 🚀 Phase 3: 高度機能（低優先度）

### 8. テンプレート・ライブラリ機能

#### 現状の問題
- よく使用する遮蔽体設計を再利用できない
- 標準的な遮蔽設計パターンがない

#### 改善案
```javascript
class TemplateManager {
  constructor() {
    this.templates = {
      // 基本的な遮蔽テンプレート
      'basic_gamma_shield': {
        name: '基本γ線遮蔽',
        description: '点源に対する基本的な鉛遮蔽',
        parameters: {
          source_activity: { type: 'number', unit: 'MBq', default: 1.0 },
          shield_thickness: { type: 'number', unit: 'cm', default: 5.0 },
          shield_size: { type: 'number', unit: 'cm', default: 50.0 }
        },
        generate: (params) => {
          return {
            bodies: [
              {
                name: 'GammaShield',
                type: 'SPH',
                center: '0 0 0',
                radius: params.shield_size
              },
              {
                name: 'InnerCavity', 
                type: 'SPH',
                center: '0 0 0',
                radius: params.shield_size - params.shield_thickness
              },
              {
                name: 'Shield',
                type: 'CMB',
                expression: 'GammaShield-InnerCavity'
              }
            ],
            zones: [
              {
                body_name: 'Shield',
                material: 'Lead',
                density: 11.34
              },
              {
                body_name: 'InnerCavity',
                material: 'Air',
                density: 0.001205
              }
            ],
            sources: [
              {
                name: 'gamma_source',
                type: 'POINT',
                position: '0 0 0',
                inventory: [
                  { nuclide: 'Co60', radioactivity: params.source_activity }
                ],
                cutoff_rate: 0.0001
              }
            ]
          };
        }
      },
      
      'neutron_maze': {
        name: '中性子迷路遮蔽',
        description: '中性子線に対する迷路型遮蔽',
        parameters: {
          corridor_width: { type: 'number', unit: 'cm', default: 200 },
          wall_thickness: { type: 'number', unit: 'cm', default: 60 },
          maze_depth: { type: 'number', unit: 'cm', default: 400 }
        },
        generate: (params) => {
          const w = params.corridor_width;
          const t = params.wall_thickness;
          const d = params.maze_depth;
          
          return {
            bodies: [
              // 外壁
              { name: 'OuterWall', type: 'RPP', 
                min: `0 0 0`, max: `${d+2*t} ${w+2*t} 300` },
              
              // 内部空間
              { name: 'Corridor1', type: 'RPP',
                min: `${t} ${t} 0`, max: `${d/2} ${w+t} 300` },
              { name: 'Corridor2', type: 'RPP', 
                min: `${d/2} ${t} 0`, max: `${d+t} ${w+t} 300` },
                
              // 中央壁
              { name: 'CentralWall', type: 'RPP',
                min: `${d/2-t/2} ${w/2} 0`, max: `${d/2+t/2} ${w+t} 300` },
                
              // 最終的な迷路形状
              { name: 'MazeStructure', type: 'CMB',
                expression: 'OuterWall-(Corridor1+Corridor2)-CentralWall' }
            ],
            zones: [
              {
                body_name: 'MazeStructure',
                material: 'Concrete', 
                density: 2.3
              },
              {
                body_name: 'Corridor1',
                material: 'Air',
                density: 0.001205
              },
              {
                body_name: 'Corridor2', 
                material: 'Air',
                density: 0.001205
              }
            ]
          };
        }
      }
    };
  }
  
  // テンプレート適用
  'pokerinput.applyTemplate': ({ templateName, parameters, position, prefix }) => {
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`テンプレート ${templateName} が見つかりません`);
    }
    
    // パラメータのバリデーション
    const params = { ...template.parameters };
    Object.entries(parameters || {}).forEach(([key, value]) => {
      if (params[key]) {
        params[key] = value;
      }
    });
    
    // テンプレートを生成
    const generated = template.generate(params);
    
    // 位置調整とプレフィックス適用
    const adjustedBodies = generated.bodies.map(body => ({
      ...body,
      name: prefix ? `${prefix}_${body.name}` : body.name,
      ...this.adjustPosition(body, position)
    }));
    
    const adjustedZones = generated.zones.map(zone => ({
      ...zone,
      body_name: prefix ? `${prefix}_${zone.body_name}` : zone.body_name
    }));
    
    // 提案として追加
    adjustedBodies.forEach(body => {
      this.pendingChanges.push({ action: 'add_body', body });
    });
    
    adjustedZones.forEach(zone => {
      this.pendingChanges.push({ action: 'add_zone', zone });
    });
    
    if (generated.sources) {
      generated.sources.forEach(source => {
        this.pendingChanges.push({ action: 'add_source', source });
      });
    }
    
    fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    
    return {
      template: templateName,
      appliedBodies: adjustedBodies.length,
      appliedZones: adjustedZones.length,
      appliedSources: generated.sources?.length || 0,
      message: `テンプレート "${template.name}" を適用しました`
    };
  },
  
  // カスタムテンプレート保存
  'pokerinput.saveAsTemplate': ({ name, description, bodies, zones, parameters }) => {
    // 選択された立体・ゾーンからテンプレートを作成
    const selectedBodies = this.data.body.filter(b => bodies.includes(b.name));
    const selectedZones = this.data.zone.filter(z => bodies.includes(z.body_name));
    
    this.templates[name] = {
      name,
      description,
      custom: true,
      created: new Date().toISOString(),
      parameters: parameters || {},
      generate: () => ({
        bodies: selectedBodies,
        zones: selectedZones
      })
    };
    
    // テンプレートファイルに保存
    fs.writeFileSync('templates.json', JSON.stringify(this.templates, null, 2));
    
    return `カスタムテンプレート "${name}" を保存しました`;
  }
};

// 使用例
```

#### 実際の使用例
```javascript
// 1. 基本γ線遮蔽テンプレートを適用
const result = await mcp.call('pokerinput.applyTemplate', {
  templateName: 'basic_gamma_shield',
  parameters: {
    source_activity: 10.0,    // 10 MBq
    shield_thickness: 3.0,    // 3 cm厚
    shield_size: 30.0         // 30 cm径
  },
  position: [100, 0, 0],      // X=100cmに配置
  prefix: 'Exp1'              // 実験1用
});

await mcp.call('pokerinput.applyChanges');
console.log(`${result.appliedBodies}個の立体と${result.appliedZones}個のゾーンを追加`);

// 2. 中性子迷路テンプレートを適用
await mcp.call('pokerinput.applyTemplate', {
  templateName: 'neutron_maze',
  parameters: {
    corridor_width: 150,
    wall_thickness: 80,
    maze_depth: 500
  },
  prefix: 'Maze'
});

// 3. 現在の設計をテンプレートとして保存
await mcp.call('pokerinput.saveAsTemplate', {
  name: 'my_custom_shield',
  description: '実験で使用した効果的な遮蔽設計',
  bodies: ['Shield1', 'Shield2', 'Detector'],
  parameters: {
    detector_distance: { type: 'number', unit: 'cm', default: 50 }
  }
});
```  
  // ブランチ機能（設計の分岐管理）
  'pokerinput.createBranch': ({ branchName, description = '' }) => {
    const branch = {
      id: `branch_${Date.now()}`,
      name: branchName,
      description: description,
      createdAt: new Date().toISOString(),
      parentState: {
        body: JSON.parse(JSON.stringify(this.data.body)),
        zone: JSON.parse(JSON.stringify(this.data.zone)),
        transform: JSON.parse(JSON.stringify(this.data.transform || [])),
        source: JSON.parse(JSON.stringify(this.data.source || []))
      }
    };
    
    if (!this.branches) this.branches = [];
    this.branches.push(branch);
    this.saveBranches();
    
    return {
      branchId: branch.id,
      message: `ブランチ "${branchName}" を作成しました`
    };
  },
  
  'pokerinput.switchToBranch': ({ branchId }) => {
    const branch = this.branches?.find(b => b.id === branchId);
    if (!branch) {
      throw new Error(`ブランチID ${branchId} が見つかりません`);
    }
    
    // 現在の状態を保存
    this.recordChange('branch_switch', { toBranch: branchId }, 
      `ブランチ "${branch.name}" に切り替え`);
    
    // ブランチ状態を復元
    this.data = JSON.parse(JSON.stringify(branch.parentState));
    this.saveData();
    
    return {
      switchedTo: branch.name,
      description: branch.description,
      createdAt: branch.createdAt
    };
  },
  
  // 変更の比較
  'pokerinput.compareVersions': ({ fromChangeId, toChangeId }) => {
    const fromSnapshot = this.history.find(h => h.id === fromChangeId);
    const toSnapshot = this.history.find(h => h.id === toChangeId);
    
    if (!fromSnapshot || !toSnapshot) {
      throw new Error('指定された履歴IDが見つかりません');
    }
    
    const comparison = {
      from: {
        timestamp: fromSnapshot.timestamp,
        stats: fromSnapshot.stats
      },
      to: {
        timestamp: toSnapshot.timestamp,
        stats: toSnapshot.stats
      },
      differences: {
        bodies: this.compareBodies(fromSnapshot.beforeState.body, toSnapshot.beforeState.body),
        zones: this.compareZones(fromSnapshot.beforeState.zone, toSnapshot.beforeState.zone),
        stats: {
          bodyCountChange: toSnapshot.stats.bodyCount - fromSnapshot.stats.bodyCount,
          zoneCountChange: toSnapshot.stats.zoneCount - fromSnapshot.stats.zoneCount,
          volumeChange: toSnapshot.stats.totalVolume - fromSnapshot.stats.totalVolume,
          massChange: toSnapshot.stats.totalMass - fromSnapshot.stats.totalMass
        }
      }
    };
    
    return comparison;
  }
};

// 使用例
```

#### 実際の使用例
```javascript
// 1. 履歴の確認
const history = await mcp.call('pokerinput.getHistory', { limit: 5 });
console.log('最近の変更:');
history.forEach(h => {
  console.log(`${h.timestamp}: ${h.action} - ${h.description}`);
});

// 2. 特定の状態に戻す
const revertResult = await mcp.call('pokerinput.revertToVersion', {
  changeId: 'change_1692123456789_abc123',
  createCheckpoint: true
});
console.log(`${revertResult.revertedTo}の状態に復元しました`);

// 3. ブランチ作成（設計の分岐）
const branch = await mcp.call('pokerinput.createBranch', {
  branchName: 'alternative_design',
  description: '異なる材質での設計検討'
});

// 別の設計を試す...
// 元に戻る
await mcp.call('pokerinput.switchToBranch', { branchId: 'main' });

// 4. バージョン比較
const comparison = await mcp.call('pokerinput.compareVersions', {
  fromChangeId: 'change_old',
  toChangeId: 'change_new'
});
console.log(`立体数の変化: ${comparison.differences.stats.bodyCountChange}`);
console.log(`総質量の変化: ${comparison.differences.stats.massChange.toFixed(1)} g`);
```

---

### 10. パフォーマンス最適化・メトリクス

#### 現状の問題
- 大量のデータ処理時の性能問題
- メモリ使用量の監視なし
- 処理時間の計測なし

#### 改善案
```javascript
class PerformanceManager {
  constructor() {
    this.metrics = {
      operations: new Map(),
      memory: [],
      timing: [],
      errors: []
    };
    this.cache = new Map();
  }
  
  // パフォーマンス監視付きメソッド実行
  withPerformanceMonitoring(methodName, operation) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = operation();
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      
      // メトリクス記録
      this.recordMetrics(methodName, {
        duration,
        memoryDelta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed
        },
        success: true
      });
      
      // 警告チェック
      if (duration > 5000) { // 5秒以上
        console.warn(`処理時間警告: ${methodName} が ${duration.toFixed(1)}ms かかりました`);
      }
      
      if (endMemory.heapUsed - startMemory.heapUsed > 100 * 1024 * 1024) { // 100MB以上
        console.warn(`メモリ使用量警告: ${methodName} で ${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(1)}MB 使用`);
      }
      
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordMetrics(methodName, {
        duration,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  },
  
  // キャッシュ機能
  withCache(key, generator, ttl = 300000) { // 5分間キャッシュ
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    const data = generator();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  },
  
  // 幾何計算の最適化
  optimizedVolumeCalculation(body) {
    const cacheKey = `volume_${body.name}_${JSON.stringify(body)}`;
    
    return this.withCache(cacheKey, () => {
      return this.withPerformanceMonitoring('volumeCalculation', () => {
        switch (body.type) {
          case 'RPP':
            const min = this.parseCoordinates(body.min);
            const max = this.parseCoordinates(body.max);
            return (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);
            
          case 'SPH':
            return (4/3) * Math.PI * Math.pow(body.radius, 3);
            
          case 'RCC':
            const height = this.parseCoordinates(body.height_vector);
            const h = Math.sqrt(height.reduce((sum, v) => sum + v*v, 0));
            return Math.PI * Math.pow(body.radius, 2) * h;
            
          default:
            throw new Error(`体積計算未対応: ${body.type}`);
        }
      });
    });
  },
  
  // バッチ処理の最適化
  'pokerinput.batchOperation': ({ operations, batchSize = 10 }) => {
    return this.withPerformanceMonitoring('batchOperation', () => {
      const results = [];
      const batches = [];
      
      // バッチに分割
      for (let i = 0; i < operations.length; i += batchSize) {
        batches.push(operations.slice(i, i + batchSize));
      }
      
      console.log(`${operations.length}個の操作を${batches.length}バッチで処理開始`);
      
      batches.forEach((batch, batchIndex) => {
        const batchStart = performance.now();
        
        batch.forEach((op, opIndex) => {
          try {
            const result = this.executeOperation(op);
            results.push({ success: true, result, operation: op });
          } catch (error) {
            results.push({ success: false, error: error.message, operation: op });
          }
        });
        
        const batchDuration = performance.now() - batchStart;
        console.log(`バッチ ${batchIndex + 1}/${batches.length} 完了 (${batchDuration.toFixed(1)}ms)`);
        
        // メモリが逼迫している場合はGCを促す
        if (process.memoryUsage().heapUsed > 1024 * 1024 * 1024) { // 1GB以上
          global.gc && global.gc();
        }
      });
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      return {
        total: operations.length,
        successful,
        failed,
        results: results,
        batches: batches.length
      };
    });
  },
  
  // メトリクス取得
  'pokerinput.getPerformanceMetrics': ({ period = '1hour' }) => {
    const now = Date.now();
    const periods = {
      '1hour': 60 * 60 * 1000,
      '1day': 24 * 60 * 60 * 1000,
      '1week': 7 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - (periods[period] || periods['1hour']);
    
    const recentMetrics = Array.from(this.metrics.operations.entries())
      .map(([method, records]) => ({
        method,
        records: records.filter(r => r.timestamp > cutoff)
      }))
      .filter(m => m.records.length > 0);
    
    const summary = recentMetrics.map(({ method, records }) => {
      const durations = records.map(r => r.duration);
      const successful = records.filter(r => r.success).length;
      
      return {
        method,
        callCount: records.length,
        successRate: (successful / records.length * 100).toFixed(1) + '%',
        avgDuration: (durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(1) + 'ms',
        maxDuration: Math.max(...durations).toFixed(1) + 'ms',
        minDuration: Math.min(...durations).toFixed(1) + 'ms'
      };
    });
    
    const systemMetrics = {
      currentMemoryUsage: process.memoryUsage(),
      cacheSize: this.cache.size,
      uptime: process.uptime()
    };
    
    return {
      period,
      summary,
      systemMetrics,
      recommendations: this.generatePerformanceRecommendations(summary)
    };
  },
  
  generatePerformanceRecommendations(summary) {
    const recommendations = [];
    
    summary.forEach(method => {
      const avgMs = parseFloat(method.avgDuration);
      const successRate = parseFloat(method.successRate);
      
      if (avgMs > 1000) {
        recommendations.push({
          type: 'performance',
          severity: 'warning',
          message: `${method.method}の平均実行時間(${method.avgDuration})が長いです。最適化を検討してください。`
        });
      }
      
      if (successRate < 95) {
        recommendations.push({
          type: 'reliability',
          severity: 'error',
          message: `${method.method}の成功率(${method.successRate})が低いです。エラー対策が必要です。`
        });
      }
    });
    
    if (this.cache.size > 1000) {
      recommendations.push({
        type: 'memory',
        severity: 'info',
        message: 'キャッシュサイズが大きくなっています。定期的なクリアを検討してください。'
      });
    }
    
    return recommendations;
  }
};

// 使用例
```

#### 実際の使用例
```javascript
// 1. パフォーマンス監視付きで大量処理
const batchResult = await mcp.call('pokerinput.batchOperation', {
  operations: [
    { action: 'add_body', body: { name: 'Shield1', type: 'RPP', /* ... */ }},
    { action: 'add_body', body: { name: 'Shield2', type: 'SPH', /* ... */ }},
    // ... 100個の操作
  ],
  batchSize: 20
});

console.log(`バッチ処理完了: ${batchResult.successful}件成功, ${batchResult.failed}件失敗`);

// 2. パフォーマンスメトリクスの確認
const metrics = await mcp.call('pokerinput.getPerformanceMetrics', { 
  period: '1day' 
});

console.log('パフォーマンス サマリー:');
metrics.summary.forEach(m => {
  console.log(`${m.method}: ${m.callCount}回実行, 平均${m.avgDuration}, 成功率${m.successRate}`);
});

console.log('推奨事項:');
metrics.recommendations.forEach(r => {
  console.log(`[${r.severity.toUpperCase()}] ${r.message}`);
});

// 3. メモリ最適化
if (metrics.systemMetrics.currentMemoryUsage.heapUsed > 512 * 1024 * 1024) {
  console.log('メモリ使用量が多いため、キャッシュをクリアします');
  await mcp.call('pokerinput.clearCache');
}
```

---

## 📊 実装優先度と工数見積もり

### Phase 1 (緊急対応): 2-3週間
| 機能 | 工数 | 重要度 | 理由 |
|------|------|--------|------|
| エラーハンドリング強化 | 5日 | 最高 | システムの安定性 |
| バックアップ機能 | 3日 | 最高 | データ保護 |
| 入力値検証強化 | 7日 | 高 | 品質向上 |
| トランザクション機能 | 5日 | 高 | 整合性保証 |

### Phase 2 (機能性向上): 4-6週間  
| 機能 | 工数 | 重要度 | 理由 |
|------|------|--------|------|
| 幾何学的妥当性チェック | 10日 | 最高 | 放射線計算の信頼性 |
| 材質データベース拡張 | 7日 | 高 | 実用性向上 |
| 検索・フィルタリング | 5日 | 高 | 使い勝手向上 |
| 基本的な可視化 | 8日 | 中 | 設計支援 |

### Phase 3 (高度機能): 6-8週間
| 機能 | 工数 | 重要度 | 理由 |
|------|------|--------|------|
| PHITS/MCNPエクスポート | 12日 | 高 | 実用性 |
| 3D可視化 | 10日 | 中 | 設計支援 |
| テンプレート機能 | 8日 | 中 | 効率化 |
| 履歴管理 | 10日 | 中 | 版数管理 |

### Phase 4 (最適化): 3-4週間  
| 機能 | 工数 | 重要度 | 理由 |
|------|------|--------|------|
| パフォーマンス最適化 | 8日 | 中 | スケーラビリティ |
| 自動テスト整備 | 7日 | 中 | 開発効率 |

---

## 🎯 推奨実装順序

### 即座に実装すべき (今週中)
1. **バックアップ機能** - データ損失防止
2. **基本的なエラーハンドリング** - システム安定性

### 短期目標 (1ヶ月以内)
3. **入力値検証強化** - 品質向上
4. **幾何学的妥当性チェック** - 研究での信頼性
5. **材質データベース拡張** - 実用性

### 中期目標 (3ヶ月以内) 
6. **検索・フィルタリング** - 使い勝手向上
7. **PHITS形式エクスポート** - 他ツール連携  
8. **基本的な統計・分析** - 設計支援

### 長期目標 (6ヶ月以内)
9. **3D可視化** - 高度な設計支援
10. **履歴管理** - 版数管理
11. **パフォーマンス最適化** - スケーラビリティ

放射線遮蔽の研究者としては、特に **幾何学的妥当性チェック** と **材質データベース拡張** を優先することをお勧めします。これらは計算結果の信頼性に直結し、研究の品質向上に大きく貢献します。

---

## 📝 まとめ

この改善提案により、poker_mcpは以下の点で大幅に向上します：

1. **信頼性**: データ保護とエラー対策による安定動作
2. **実用性**: 放射線遮蔽研究に特化した機能群
3. **効率性**: 検索・テンプレート・履歴管理による作業効率化  
4. **拡張性**: モジュラー設計によるメンテナンス性向上
5. **品質**: 自動テストと検証による高品質化

どの改善点から着手するか、ご相談いただければと思います！