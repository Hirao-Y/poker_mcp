class CrossSectionVisualizer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.geometryData = [];
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.mode = '2d'; // '2d' または '3d'
        this.visualization3DManager = null;
        
        this.initializeCanvas();
        this.initialize3D();
        console.log(`✅ CrossSectionVisualizer初期化完了: ${canvasId}`);
    }

    // 3D機能初期化
    initialize3D() {
        // Three.jsが利用可能な場合、3D機能を有効化
        if (typeof THREE !== 'undefined' && typeof ShieldingVisualization3D !== 'undefined') {
            try {
                console.log('🎨 3D可視化機能を初期化中...');
                // 3D可視化機能は別途管理されるため、フラグのみ設定
                this.mode = '3d';
                console.log('✅ 3D可視化モード有効');
            } catch (error) {
                console.warn('⚠️ 3D可視化初期化失敗、2Dモードで継続:', error);
                this.mode = '2d';
            }
        } else {
            console.log('ℹ️ 2D可視化モードで動作');
            this.mode = '2d';
        }
    }

    // 3D可視化マネージャーを設定
    set3DManager(manager) {
        this.visualization3DManager = manager;
        if (manager) {
            this.mode = '3d';
            console.log('🔗 3D可視化マネージャー接続完了');
        }
    }

    initializeCanvas() {
        if (this.canvasId) {
            this.canvas = document.getElementById(this.canvasId);
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d');
                this.setupCanvas();
            } else {
                console.warn(`⚠️ Canvas要素が見つかりません: ${this.canvasId}`);
            }
        }
    }

    setupCanvas() {
        if (!this.canvas) return;
        
        // キャンバスサイズ設定
        this.canvas.width = 400;
        this.canvas.height = 400;
        
        // スタイル設定
        this.canvas.style.border = '1px solid #ccc';
        this.canvas.style.borderRadius = '4px';
        
        this.clear();
    }

    clear() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景色設定
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // グリッド描画
        this.drawGrid();
        
        // 中心軸描画
        this.drawAxes();
        
        console.log('🎨 キャンバスをクリア');
    }

    drawGrid() {
        if (!this.ctx) return;
        
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 0.5;
        
        const gridSize = 20;
        
        // 縦線
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 横線
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawAxes() {
        if (!this.ctx) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.strokeStyle = '#6c757d';
        this.ctx.lineWidth = 1;
        
        // X軸
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(this.canvas.width, centerY);
        this.ctx.stroke();
        
        // Y軸
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, 0);
        this.ctx.lineTo(centerX, this.canvas.height);
        this.ctx.stroke();
        
        // 軸ラベル
        this.ctx.fillStyle = '#495057';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('X', this.canvas.width - 15, centerY - 5);
        this.ctx.fillText('Y', centerX + 5, 15);
    }

    addGeometry(type, params, material = null) {
        const geometry = {
            type: type,
            params: params,
            material: material,
            id: Date.now() + Math.random()
        };
        
        this.geometryData.push(geometry);
        
        // 3Dモードの場合は3D可視化マネージャーに転送
        if (this.mode === '3d' && this.visualization3DManager) {
            this.handle3DGeometry(geometry);
        } else {
            // 2Dモードで描画
            this.render();
        }
        
        console.log(`📐 形状追加: ${type}`, params);
    }

    // 3D形状処理
    handle3DGeometry(geometry) {
        if (!this.visualization3DManager) return;

        try {
            switch (geometry.type) {
                case 'POINT': // 線源
                    this.visualization3DManager.handleUserInteraction('sourceCreated', {
                        name: `source_${geometry.id}`,
                        position: this.extractPosition(geometry.params),
                        nuclide: geometry.params.nuclide || 'Co60',
                        activity: geometry.params.activity || 37000000000
                    });
                    break;

                case 'SPH':
                case 'RCC':
                case 'RPP':
                case 'BOX': // 遮蔽体
                    this.visualization3DManager.handleUserInteraction('shieldCreated', {
                        name: `shield_${geometry.id}`,
                        type: geometry.type,
                        parameters: geometry.params,
                        material: geometry.material || 'CONCRETE'
                    });
                    break;

                case 'DETECTOR': // 検出器
                    this.visualization3DManager.handleUserInteraction('detectorCreated', {
                        name: `detector_${geometry.id}`,
                        origin: geometry.params.origin || [0, 0, 0],
                        grid: geometry.params.grid || []
                    });
                    break;
            }
        } catch (error) {
            console.error('❌ 3D形状処理エラー:', error);
            // フォールバックで2D描画
            this.render();
        }
    }

    // パラメータから位置を抽出
    extractPosition(params) {
        if (params.position) {
            if (typeof params.position === 'string') {
                return params.position.split(' ').map(Number);
            } else if (Array.isArray(params.position)) {
                return params.position;
            }
        }
        if (params.center) {
            if (typeof params.center === 'string') {
                return params.center.split(' ').map(Number);
            } else if (Array.isArray(params.center)) {
                return params.center;
            }
        }
        return [0, 0, 0];
    }

    render() {
        this.clear();
        
        for (const geometry of this.geometryData) {
            this.drawGeometry(geometry);
        }
        
        console.log(`🎨 ${this.geometryData.length}個の形状を描画`);
    }

    drawGeometry(geometry) {
        if (!this.ctx) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 材料に基づく色設定
        const color = this.getMaterialColor(geometry.material);
        this.ctx.fillStyle = color.fill;
        this.ctx.strokeStyle = color.stroke;
        this.ctx.lineWidth = 2;
        
        switch (geometry.type) {
            case 'SPH':
                this.drawSphere(geometry.params, centerX, centerY);
                break;
            case 'RCC':
                this.drawCylinder(geometry.params, centerX, centerY);
                break;
            case 'RPP':
                this.drawBox(geometry.params, centerX, centerY);
                break;
            case 'POINT':
                this.drawPoint(geometry.params, centerX, centerY);
                break;
            default:
                console.warn(`⚠️ 未対応の形状タイプ: ${geometry.type}`);
        }
    }

    drawSphere(params, centerX, centerY) {
        if (!this.ctx || !params.radius) return;
        
        const radius = params.radius * this.scale;
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawCylinder(params, centerX, centerY) {
        if (!this.ctx || !params.radius) return;
        
        const radius = params.radius * this.scale;
        
        // 円として表示（断面図）
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawBox(params, centerX, centerY) {
        if (!this.ctx) return;
        
        const width = 50 * this.scale;  // デフォルトサイズ
        const height = 50 * this.scale;
        
        this.ctx.beginPath();
        this.ctx.rect(centerX - width/2, centerY - height/2, width, height);
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawPoint(params, centerX, centerY) {
        if (!this.ctx) return;
        
        // 点線源を小さな円で表示
        this.ctx.fillStyle = '#dc3545';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // 線源マーク
        this.ctx.strokeStyle = '#dc3545';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 8, centerY);
        this.ctx.lineTo(centerX + 8, centerY);
        this.ctx.moveTo(centerX, centerY - 8);
        this.ctx.lineTo(centerX, centerY + 8);
        this.ctx.stroke();
    }

    getMaterialColor(material) {
        const colors = {
            'CONCRETE': { fill: 'rgba(108, 117, 125, 0.3)', stroke: '#6c757d' },
            'LEAD': { fill: 'rgba(52, 58, 64, 0.5)', stroke: '#343a40' },
            'STEEL': { fill: 'rgba(73, 80, 87, 0.4)', stroke: '#495057' },
            'VOID': { fill: 'rgba(255, 255, 255, 0.1)', stroke: '#adb5bd' },
            'WATER': { fill: 'rgba(13, 202, 240, 0.3)', stroke: '#0dcaf0' },
            default: { fill: 'rgba(0, 123, 255, 0.2)', stroke: '#007bff' }
        };
        
        return colors[material] || colors.default;
    }

    setScale(scale) {
        this.scale = scale;
        this.render();
        console.log(`🔍 スケール変更: ${scale}`);
    }

    // 形状を削除
    removeGeometry(id) {
        this.geometryData = this.geometryData.filter(g => g.id !== id);
        this.render();
        console.log(`🗑️ 形状削除: ${id}`);
    }

    // 全形状削除
    clearGeometry() {
        this.geometryData = [];
        this.render();
        console.log('🧹 全形状クリア');
    }

    // 現在の形状情報を取得
    getGeometryInfo() {
        return {
            count: this.geometryData.length,
            types: this.geometryData.map(g => g.type),
            materials: this.geometryData.map(g => g.material).filter(m => m)
        };
    }

    // 描画状態をエクスポート
    exportImage() {
        if (!this.canvas) return null;
        
        return this.canvas.toDataURL('image/png');
    }
}

// グローバル登録
if (typeof window !== 'undefined') {
    window.CrossSectionVisualizer = CrossSectionVisualizer;
}

console.log('🎨 CrossSectionVisualizer読み込み完了');
