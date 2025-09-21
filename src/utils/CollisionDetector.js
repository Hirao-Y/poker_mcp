/**
 * 立体干渉検出ユーティリティ
 * マニフェスト enhanced_features.geometry_validation.collision_detection に基づく実装
 * 
 * 重要：ゾーン間の干渉をチェック（立体同士の重複は組み合わせ立体で問題なし）
 */

class CollisionDetector {
    constructor(options = {}) {
        this.overlapTolerance = options.overlap_tolerance || 1e-6;
        this.contactTolerance = options.contact_tolerance || 1e-9;
        this.maxAutoCorrections = options.max_auto_corrections || 10;
        // ゾーンベースチェックフラグ
        this.useZoneBasedCheck = options.use_zone_based_check !== false; // デフォルトtrue
    }

    /**
     * 全立体の干渉チェック
     * @param {Array} bodies - 立体配列
     * @param {Array} zones - ゾーン配列（オプション）
     * @returns {Object} 干渉結果
     */
    detectCollisions(bodies, zones = null) {
        // ゾーンベースチェックが有効でゾーン情報がある場合
        if (this.useZoneBasedCheck && zones && zones.length > 0) {
            return this.detectZoneCollisions(bodies, zones);
        }
        
        // 従来の立体ベースチェック（後方互換性のため）
        const collisions = [];
        const contacts = [];

        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const result = this.checkBodyPair(bodies[i], bodies[j]);
                if (result.type === 'collision') {
                    collisions.push(result);
                } else if (result.type === 'contact') {
                    contacts.push(result);
                }
            }
        }

        return {
            hasCollisions: collisions.length > 0,
            hasContacts: contacts.length > 0,
            collisions,
            contacts,
            totalIssues: collisions.length + contacts.length
        };
    }

    /**
     * 2つの立体の干渉チェック
     * @param {Object} body1 - 立体1
     * @param {Object} body2 - 立体2
     * @returns {Object} チェック結果
     */
    checkBodyPair(body1, body2) {
        // 基本的な境界ボックス重複検出
        const bb1 = this.getBoundingBox(body1);
        const bb2 = this.getBoundingBox(body2);

        const overlap = this.calculateOverlap(bb1, bb2);
        
        if (overlap.volume > this.overlapTolerance) {
            return {
                type: 'collision',
                body1: body1.name,
                body2: body2.name,
                overlapVolume: overlap.volume,
                severity: this.calculateSeverity(overlap.volume)
            };
        } else if (overlap.volume > this.contactTolerance) {
            return {
                type: 'contact',
                body1: body1.name,
                body2: body2.name,
                contactArea: overlap.area
            };
        }

        return { type: 'none' };
    }

    /**
     * 立体の境界ボックス計算
     * @param {Object} body - 立体
     * @returns {Object} 境界ボックス
     */
    getBoundingBox(body) {
        switch (body.type) {
            case 'SPH':
                const center = this.parseVector(body.center);
                const radius = body.radius;
                return {
                    min: [center[0] - radius, center[1] - radius, center[2] - radius],
                    max: [center[0] + radius, center[1] + radius, center[2] + radius]
                };

            case 'RPP':
                return {
                    min: this.parseVector(body.min),
                    max: this.parseVector(body.max)
                };

            case 'RCC':
                const bottomCenter = this.parseVector(body.bottom_center);
                const heightVector = this.parseVector(body.height_vector);
                const radius_rcc = body.radius;
                
                return {
                    min: [
                        Math.min(bottomCenter[0], bottomCenter[0] + heightVector[0]) - radius_rcc,
                        Math.min(bottomCenter[1], bottomCenter[1] + heightVector[1]) - radius_rcc,
                        Math.min(bottomCenter[2], bottomCenter[2] + heightVector[2]) - radius_rcc
                    ],
                    max: [
                        Math.max(bottomCenter[0], bottomCenter[0] + heightVector[0]) + radius_rcc,
                        Math.max(bottomCenter[1], bottomCenter[1] + heightVector[1]) + radius_rcc,
                        Math.max(bottomCenter[2], bottomCenter[2] + heightVector[2]) + radius_rcc
                    ]
                };

            default:
                // 他の立体タイプは後で実装
                return { min: [0, 0, 0], max: [0, 0, 0] };
        }
    }

    /**
     * 重複計算
     * @param {Object} bb1 - 境界ボックス1
     * @param {Object} bb2 - 境界ボックス2
     * @returns {Object} 重複情報
     */
    calculateOverlap(bb1, bb2) {
        const overlapMin = [
            Math.max(bb1.min[0], bb2.min[0]),
            Math.max(bb1.min[1], bb2.min[1]),
            Math.max(bb1.min[2], bb2.min[2])
        ];
        
        const overlapMax = [
            Math.min(bb1.max[0], bb2.max[0]),
            Math.min(bb1.max[1], bb2.max[1]),
            Math.min(bb1.max[2], bb2.max[2])
        ];

        const dimensions = [
            Math.max(0, overlapMax[0] - overlapMin[0]),
            Math.max(0, overlapMax[1] - overlapMin[1]),
            Math.max(0, overlapMax[2] - overlapMin[2])
        ];

        const volume = dimensions[0] * dimensions[1] * dimensions[2];
        const area = Math.max(
            dimensions[0] * dimensions[1],
            dimensions[1] * dimensions[2],
            dimensions[2] * dimensions[0]
        );

        return { volume, area, dimensions };
    }

    /**
     * 重複の深刻度計算
     * @param {number} volume - 重複体積
     * @returns {string} 深刻度
     */
    calculateSeverity(volume) {
        if (volume > 1000) return 'critical';
        if (volume > 100) return 'high';
        if (volume > 10) return 'medium';
        return 'low';
    }

    /**
     * ベクトル文字列のパース
     * @param {string} vectorStr - "x y z" 形式の文字列
     * @returns {Array} [x, y, z]
     */
    parseVector(vectorStr) {
        return vectorStr.split(/\s+/).map(Number);
    }

    /**
     * 自動修正の提案生成
     * @param {Array} collisions - 干渉リスト
     * @param {Array} bodies - 全立体
     * @returns {Array} 修正提案
     */
    generateResolutions(collisions, bodies) {
        const resolutions = [];

        for (const collision of collisions) {
            const body1 = bodies.find(b => b.name === collision.body1);
            const body2 = bodies.find(b => b.name === collision.body2);

            // 優先度ベースの削除提案
            const priority1 = this.calculatePriority(body1);
            const priority2 = this.calculatePriority(body2);

            if (priority1 < priority2) {
                resolutions.push({
                    type: 'delete',
                    target: body1.name,
                    reason: 'Lower priority body',
                    collision_id: `${collision.body1}-${collision.body2}`
                });
            } else {
                resolutions.push({
                    type: 'delete',
                    target: body2.name,
                    reason: 'Lower priority body', 
                    collision_id: `${collision.body1}-${collision.body2}`
                });
            }

            // CMB立体による差集合提案
            resolutions.push({
                type: 'boolean_operation',
                operation: 'subtraction',
                expression: `${collision.body1} - ${collision.body2}`,
                collision_id: `${collision.body1}-${collision.body2}`
            });
        }

        return resolutions;
    }

    /**
     * 立体の優先度計算
     * @param {Object} body - 立体
     * @returns {number} 優先度 (低いほど削除されやすい)
     */
    calculatePriority(body) {
        let priority = 0;
        
        // 作成順序（後から作成された方が低優先）
        priority += body.creation_order || 0;
        
        // サイズ（小さい方が低優先）
        const volume = this.estimateVolume(body);
        priority += Math.log10(volume + 1) * 100;
        
        return priority;
    }

    /**
     * 立体体積の推定
     * @param {Object} body - 立体
     * @returns {number} 推定体積
     */
    estimateVolume(body) {
        switch (body.type) {
            case 'SPH':
                return (4/3) * Math.PI * Math.pow(body.radius, 3);
            case 'RPP':
                const min = this.parseVector(body.min);
                const max = this.parseVector(body.max);
                return (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);
            case 'RCC':
                return Math.PI * Math.pow(body.radius, 2) * 
                       this.parseVector(body.height_vector).reduce((sum, h) => sum + h*h, 0);
            default:
                return 1; // デフォルト値
        }
    }

    /**
     * ゾーンベースの干渉検出
     * @param {Array} bodies - 立体配列
     * @param {Array} zones - ゾーン配列
     * @returns {Object} 干渉結果
     */
    detectZoneCollisions(bodies, zones) {
        const zoneCollisions = [];
        const bodiesMap = new Map(bodies.map(b => [b.name, b]));
        
        // ATMOSPHEREを除くゾーンのみチェック
        const activeZones = zones.filter(z => z.body_name !== 'ATMOSPHERE');
        
        for (let i = 0; i < activeZones.length; i++) {
            for (let j = i + 1; j < activeZones.length; j++) {
                const zone1 = activeZones[i];
                const zone2 = activeZones[j];
                const body1 = bodiesMap.get(zone1.body_name);
                const body2 = bodiesMap.get(zone2.body_name);
                
                if (!body1 || !body2) continue;
                
                // 組み合わせ立体の場合、実効空間をチェック
                const collision = this.checkZonePair(zone1, body1, zone2, body2);
                if (collision) {
                    zoneCollisions.push(collision);
                }
            }
        }
        
        return {
            hasCollisions: zoneCollisions.length > 0,
            hasContacts: false,
            collisions: zoneCollisions,
            contacts: [],
            totalIssues: zoneCollisions.length
        };
    }

    /**
     * ゾーンペアの干渉チェック
     * @param {Object} zone1 - ゾーン1
     * @param {Object} body1 - 立体1
     * @param {Object} zone2 - ゾーン2
     * @param {Object} body2 - 立体2
     * @returns {Object|null} 干渉情報
     */
    checkZonePair(zone1, body1, zone2, body2) {
        // 組み合わせ立体(CMB)の場合、実効空間が重複しないため干渉なし
        if (body1.type === 'CMB' || body2.type === 'CMB') {
            // CMB演算により空間が排他的に分割されている
            return null;
        }
        
        // 通常の立体同士の場合のみチェック
        const bb1 = this.getBoundingBox(body1);
        const bb2 = this.getBoundingBox(body2);
        const overlap = this.calculateOverlap(bb1, bb2);
        
        if (overlap.volume > this.overlapTolerance) {
            return {
                type: 'zone_collision',
                zone1: zone1.body_name,
                zone2: zone2.body_name,
                material1: zone1.material,
                material2: zone2.material,
                overlapVolume: overlap.volume,
                severity: this.calculateSeverity(overlap.volume),
                message: `Zone collision detected between ${zone1.body_name} and ${zone2.body_name}`
            };
        }
        
        return null;
    }
}

export default CollisionDetector;
