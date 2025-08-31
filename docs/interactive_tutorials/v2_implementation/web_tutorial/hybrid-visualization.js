// Hybrid 3D/2D Visualization System - 動的切り替え可能
class HybridVisualizationSystem {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId);
        this.mode = '2d'; // '2d', '3d', 'auto'
        
        // Three.js関連
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.threeManager = null;
        
        // 2D関連
        this.ctx2d = null;
        
        // 共通データ
        this.sources = new Map();
        this.shields = new Map();
        this.detectors = new Map();
        
        // アニメーション
        this.animationId = null;
        this.isAnimating = false;
        
        // 設定
        this.config = {
            autoUpgrade: true, // 3D利用可能時に自動升级
            fallbackThreshold: 3, // 3D初期化失敗回数の閾値
            animationSpeed: 0.01,
            cameraDistance: 150
        };
        
        this.initAttempts = 0;
        
        console.log('🎨 ハイブリッド3D/2D可視化システム初期化開始...');
        this.initialize();
    }

    // 初期化
    async initialize() {
        if (!this.canvas) {
            console.error('❌ Canvas要素が見つかりません');
            this.showError('Canvas要素が見つかりません');
            return;
        }

        try {
            // まず2Dシステムを確立（フォールバック保証）
            await this.initialize2D();
            
            // 3Dシステムの初期化を試行
            if (this.config.autoUpgrade) {
                await this.tryInitialize3D();
            }
            
            // 初期レンダリング
            this.render();
            
            console.log(`✅ ハイブリッド可視化システム初期化完了 (${this.mode}モード)`);
            
        } catch (error) {
            console.error('❌ ハイブリッドシステム初期化エラー:', error);
            await this.initialize2D(); // 緊急フォールバック
        }
    }

    // 2Dシステム初期化
    async initialize2D() {
        try {
            this.ctx2d = this.canvas.getContext('2d');
            if (!this.ctx2d) {
                throw new Error('2D Context取得失敗');
            }
            
            this.setupCanvas2D();
            this.mode = '2d';
            
            this.showMessage('2D可視化システム準備完了');
            console.log('✅ 2D可視化システム初期化完了');
            
        } catch (error) {
            console.error('❌ 2D初期化失敗:', error);
            throw error;
        }
    }

    // 3Dシステム初期化試行
    async tryInitialize3D() {
        this.initAttempts++;
        
        if (this.initAttempts > this.config.fallbackThreshold) {
            console.log('⚠️ 3D初期化試行回数上限到達、2Dモードを維持');
            return false;
        }

        try {
            console.log(`🔄 3D初期化試行 ${this.initAttempts}回目...`);
            
            // LocalThreeJSManagerを使用してThree.jsを確保
            this.threeManager = new LocalThreeJSManager();
            const threeJSReady = await this.threeManager.ensureThreeJS();
            
            if (!threeJSReady) {
                throw new Error('Three.js読み込み失敗');
            }

            // Three.js機能テスト
            const testResult = this.threeManager.testThreeJSFunctionality();
            if (!testResult.success) {
                throw new Error(`Three.js機能テスト失敗: ${testResult.error}`);
            }

            // 3Dシステムセットアップ
            await this.initialize3D();
            
            this.mode = '3d';
            this.showMessage(`3D可視化システム初期化完了 (Three.js ${THREE.REVISION})`);
            console.log('✅ 3D可視化システム初期化完了');
            
            return true;
            
        } catch (error) {
            console.warn(`⚠️ 3D初期化失敗 (試行${this.initAttempts}): ${error.message}`);
            
            // 致命的でない場合は2Dモードを維持
            this.mode = '2d';
            return false;
        }
    }

    // 3Dシステム初期化
    async initialize3D() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f8ff);

        // Camera
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(
            this.config.cameraDistance, 
            this.config.cameraDistance * 0.6, 
            this.config.cameraDistance
        );
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 基本シーン要素
        this.setup3DScene();
        
        // アニメーション開始
        this.startAnimation();
    }

    // 3Dシーンセットアップ
    setup3DScene() {
        // ライティング
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(50, 50, 50);
        this.scene.add(directionalLight);

        // グリッド
        const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0xcccccc);
        gridHelper.name = 'grid';
        this.scene.add(gridHelper);

        // 軸
        const axesHelper = new THREE.AxesHelper(50);
        axesHelper.name = 'axes';
        this.scene.add(axesHelper);

        // 原点マーカー
        const originGeometry = new THREE.SphereGeometry(1, 8, 6);
        const originMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const originMarker = new THREE.Mesh(originGeometry, originMaterial);
        originMarker.name = 'origin';
        this.scene.add(originMarker);
    }

    // 2Dキャンバスセットアップ
    setupCanvas2D() {
        const ratio = window.devicePixelRatio || 1;
        this.canvas.width = this.canvas.clientWidth * ratio;
        this.canvas.height = this.canvas.clientHeight * ratio;
        this.canvas.style.width = this.canvas.clientWidth + 'px';
        this.canvas.style.height = this.canvas.clientHeight + 'px';
        this.ctx2d.scale(ratio, ratio);
    }

    // 線源追加
    addRadiationSource(name, position, nuclide, activity) {
        const sourceData = {
            name,
            position: Array.isArray(position) ? position : [0, 0, 0],
            nuclide,
            activity,
            type: 'source'
        };
        
        this.sources.set(name, sourceData);

        if (this.mode === '3d') {
            this.add3DSource(sourceData);
        }

        this.render();
        console.log(`📍 線源追加: ${name} (${nuclide})`);
        return sourceData;
    }

    // 3D線源追加
    add3DSource(sourceData) {
        try {
            const sourceGeometry = new THREE.SphereGeometry(3, 16, 12);
            const sourceMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xff0000,
                transparent: true,
                opacity: 0.8
            });
            const sourceMesh = new THREE.Mesh(sourceGeometry, sourceMaterial);
            sourceMesh.position.set(...sourceData.position);
            sourceMesh.name = `source_${sourceData.name}`;

            // 輝きエフェクト
            const glowGeometry = new THREE.SphereGeometry(5, 16, 12);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xff4444,
                transparent: true,
                opacity: 0.3
            });
            const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
            glowMesh.position.copy(sourceMesh.position);

            // グループ化
            const sourceGroup = new THREE.Group();
            sourceGroup.add(sourceMesh);
            sourceGroup.add(glowMesh);
            sourceGroup.name = `sourceGroup_${sourceData.name}`;

            this.scene.add(sourceGroup);
            sourceData.mesh3d = sourceGroup;

        } catch (error) {
            console.error('❌ 3D線源追加エラー:', error);
        }
    }

    // 遮蔽体追加
    addShield(name, type, parameters, material = 'CONCRETE') {
        const shieldData = {
            name,
            type,
            parameters,
            material,
            type: 'shield'
        };
        
        this.shields.set(name, shieldData);

        if (this.mode === '3d') {
            this.add3DShield(shieldData);
        }

        this.render();
        console.log(`🛡️ 遮蔽体追加: ${name} (${material})`);
        return shieldData;
    }

    // 3D遮蔽体追加
    add3DShield(shieldData) {
        try {
            let geometry;
            const { type, parameters } = shieldData;

            switch (type) {
                case 'SPH':
                    geometry = new THREE.SphereGeometry(parameters.radius || 10, 32, 24);
                    break;
                case 'RCC':
                    geometry = new THREE.CylinderGeometry(
                        parameters.radius || 10, 
                        parameters.radius || 10, 
                        parameters.height || 20, 
                        32
                    );
                    break;
                case 'RPP':
                case 'BOX':
                    const width = parameters.width || 20;
                    const height = parameters.height || 20; 
                    const depth = parameters.depth || 20;
                    geometry = new THREE.BoxGeometry(width, height, depth);
                    break;
                default:
                    console.warn(`⚠️ 未対応の遮蔽体タイプ: ${type}`);
                    return;
            }

            const materialColor = this.getMaterialColor(shieldData.material);
            const shieldMaterial = new THREE.MeshLambertMaterial({
                color: materialColor,
                transparent: true,
                opacity: 0.7
            });

            const mesh = new THREE.Mesh(geometry, shieldMaterial);
            
            if (parameters.center) {
                mesh.position.set(...parameters.center);
            }

            mesh.name = `shield_${shieldData.name}`;
            this.scene.add(mesh);
            shieldData.mesh3d = mesh;

        } catch (error) {
            console.error('❌ 3D遮蔽体追加エラー:', error);
        }
    }

    // 検出器追加
    addDetector(name, origin, grid = []) {
        const detectorData = {
            name,
            origin: Array.isArray(origin) ? origin : [0, 0, 0],
            grid,
            type: 'detector'
        };
        
        this.detectors.set(name, detectorData);

        if (this.mode === '3d') {
            this.add3DDetector(detectorData);
        }

        this.render();
        console.log(`🔍 検出器追加: ${name}`);
        return detectorData;
    }

    // 3D検出器追加
    add3DDetector(detectorData) {
        try {
            const detectorGroup = new THREE.Group();
            
            if (detectorData.grid.length > 0) {
                // グリッド検出器
                const gridInfo = detectorData.grid[0];
                const edge = typeof gridInfo.edge === 'string' ? 
                    gridInfo.edge.split(' ').map(Number) : gridInfo.edge;
                const number = gridInfo.number || 5;

                for (let i = 0; i < number; i++) {
                    const position = [
                        detectorData.origin[0] + edge[0] * i,
                        detectorData.origin[1] + edge[1] * i,
                        detectorData.origin[2] + edge[2] * i
                    ];

                    const detectorGeometry = new THREE.BoxGeometry(2, 2, 2);
                    const detectorMaterial = new THREE.MeshLambertMaterial({ 
                        color: 0x00ff00,
                        transparent: true,
                        opacity: 0.7
                    });
                    const detectorMesh = new THREE.Mesh(detectorGeometry, detectorMaterial);
                    detectorMesh.position.set(...position);
                    
                    detectorGroup.add(detectorMesh);
                }
            } else {
                // 単一検出器
                const detectorGeometry = new THREE.BoxGeometry(4, 4, 4);
                const detectorMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.7
                });
                const detectorMesh = new THREE.Mesh(detectorGeometry, detectorMaterial);
                detectorMesh.position.set(...detectorData.origin);
                
                detectorGroup.add(detectorMesh);
            }

            detectorGroup.name = `detectorGroup_${detectorData.name}`;
            this.scene.add(detectorGroup);
            detectorData.mesh3d = detectorGroup;

        } catch (error) {
            console.error('❌ 3D検出器追加エラー:', error);
        }
    }

    // 材料色取得
    getMaterialColor(material) {
        const colors = {
            'CONCRETE': 0xc0c0c0,
            'LEAD': 0x555555,
            'STEEL': 0x708090,
            'WATER': 0x87ceeb,
            'VOID': 0xf0f8ff
        };
        return colors[material] || 0x888888;
    }

    // レンダリング
    render() {
        if (this.mode === '3d' && this.renderer && this.scene && this.camera) {
            try {
                this.renderer.render(this.scene, this.camera);
            } catch (error) {
                console.warn('⚠️ 3Dレンダリングエラー、2Dフォールバック:', error.message);
                this.mode = '2d';
                this.render2D();
            }
        } else {
            this.render2D();
        }
    }

    // 2Dレンダリング
    render2D() {
        if (!this.ctx2d) return;

        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        const centerX = width / 2;
        const centerY = height / 2;

        // 背景クリア
        this.ctx2d.clearRect(0, 0, width, height);
        this.ctx2d.fillStyle = '#f0f8ff';
        this.ctx2d.fillRect(0, 0, width, height);

        // グリッド描画
        this.drawGrid(width, height);

        // 遮蔽体描画
        this.shields.forEach(shield => this.draw2DShield(shield, centerX, centerY));

        // 線源描画
        this.sources.forEach(source => this.draw2DSource(source, centerX, centerY));

        // 検出器描画
        this.detectors.forEach(detector => this.draw2DDetector(detector, centerX, centerY));

        // 情報表示
        this.draw2DInfo();
    }

    // 2Dグリッド描画
    drawGrid(width, height) {
        this.ctx2d.strokeStyle = '#ddd';
        this.ctx2d.lineWidth = 1;
        for (let i = 0; i <= width; i += 20) {
            this.ctx2d.beginPath();
            this.ctx2d.moveTo(i, 0);
            this.ctx2d.lineTo(i, height);
            this.ctx2d.stroke();
        }
        for (let i = 0; i <= height; i += 20) {
            this.ctx2d.beginPath();
            this.ctx2d.moveTo(0, i);
            this.ctx2d.lineTo(width, i);
            this.ctx2d.stroke();
        }
    }

    // 2D線源描画
    draw2DSource(source, centerX, centerY) {
        // 輝きエフェクト
        const time = Date.now() * 0.003;
        const glowIntensity = 0.3 + Math.sin(time) * 0.2;
        
        this.ctx2d.fillStyle = `rgba(255, 100, 100, ${glowIntensity})`;
        this.ctx2d.beginPath();
        this.ctx2d.arc(centerX, centerY, 12, 0, 2 * Math.PI);
        this.ctx2d.fill();

        // メイン線源
        this.ctx2d.fillStyle = '#ff0000';
        this.ctx2d.beginPath();
        this.ctx2d.arc(centerX, centerY, 8, 0, 2 * Math.PI);
        this.ctx2d.fill();

        // ラベル
        this.ctx2d.fillStyle = '#ffffff';
        this.ctx2d.font = 'bold 10px Arial';
        this.ctx2d.textAlign = 'center';
        this.ctx2d.fillText(source.nuclide || 'Source', centerX, centerY + 3);
    }

    // 2D遮蔽体描画
    draw2DShield(shield, centerX, centerY) {
        this.ctx2d.strokeStyle = shield.material === 'LEAD' ? '#333' : '#888';
        this.ctx2d.lineWidth = shield.material === 'LEAD' ? 3 : 4;
        this.ctx2d.setLineDash([8, 4]);

        if (shield.type === 'SPH') {
            this.ctx2d.beginPath();
            this.ctx2d.arc(centerX, centerY, shield.parameters.radius || 50, 0, 2 * Math.PI);
            this.ctx2d.stroke();

            // ラベル
            this.ctx2d.fillStyle = shield.material === 'LEAD' ? '#333' : '#666';
            this.ctx2d.font = 'bold 12px Arial';
            this.ctx2d.textAlign = 'left';
            this.ctx2d.setLineDash([]);
            this.ctx2d.fillText(
                `${shield.material}`,
                centerX + (shield.parameters.radius || 50) + 10,
                centerY - (shield.parameters.radius || 50) + 20
            );
        }
    }

    // 2D検出器描画
    draw2DDetector(detector, centerX, centerY) {
        const detectorCount = detector.grid.length > 0 ? detector.grid[0].number || 5 : 1;
        
        for (let i = 0; i < detectorCount; i++) {
            const x = centerX + 80 + i * 15;
            const y = centerY;

            // 検出器本体
            this.ctx2d.fillStyle = '#00ff00';
            this.ctx2d.fillRect(x - 4, y - 4, 8, 8);

            // 枠
            this.ctx2d.strokeStyle = '#006600';
            this.ctx2d.lineWidth = 1;
            this.ctx2d.setLineDash([]);
            this.ctx2d.strokeRect(x - 4, y - 4, 8, 8);
        }

        // ラベル
        this.ctx2d.fillStyle = '#006600';
        this.ctx2d.font = 'bold 11px Arial';
        this.ctx2d.textAlign = 'left';
        this.ctx2d.fillText('Detectors', centerX + 80, centerY - 15);
    }

    // 2D情報表示
    draw2DInfo() {
        // モード表示
        this.ctx2d.fillStyle = '#000';
        this.ctx2d.font = 'bold 16px Arial';
        this.ctx2d.textAlign = 'left';
        this.ctx2d.fillText(`${this.mode.toUpperCase()}表示モード`, 10, 25);

        // 統計情報
        this.ctx2d.font = '12px Arial';
        this.ctx2d.fillText(`線源: ${this.sources.size}個`, 10, 45);
        this.ctx2d.fillText(`遮蔽体: ${this.shields.size}個`, 10, 60);
        this.ctx2d.fillText(`検出器: ${this.detectors.size}個`, 10, 75);

        // 3D試行情報（失敗している場合）
        if (this.mode === '2d' && this.initAttempts > 0) {
            this.ctx2d.fillStyle = '#666';
            this.ctx2d.font = '10px Arial';
            this.ctx2d.fillText(`3D初期化試行: ${this.initAttempts}回`, 10, 95);
        }
    }

    // アニメーション開始
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.animate();
    }

    // アニメーション
    animate() {
        if (!this.isAnimating) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        // 線源の輝きアニメーション（2Dの場合）
        if (this.mode === '2d') {
            this.render2D();
        }

        // 3Dの場合はレンダリング
        if (this.mode === '3d') {
            const time = Date.now() * 0.001;
            
            // 線源の輝きアニメーション
            this.sources.forEach(source => {
                if (source.mesh3d) {
                    const glowMesh = source.mesh3d.children[1]; // 輝きメッシュ
                    if (glowMesh && glowMesh.material) {
                        glowMesh.material.opacity = 0.2 + Math.sin(time * 3) * 0.1;
                    }
                }
            });

            this.render();
        }
    }

    // アニメーション停止
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    // 全要素クリア
    clearAll() {
        // データクリア
        this.sources.clear();
        this.shields.clear();
        this.detectors.clear();

        // 3Dシーンクリア
        if (this.mode === '3d' && this.scene) {
            const objectsToRemove = [];
            this.scene.traverse((object) => {
                if (object.name.startsWith('source') || 
                    object.name.startsWith('shield') || 
                    object.name.startsWith('detector')) {
                    objectsToRemove.push(object);
                }
            });
            objectsToRemove.forEach(obj => this.scene.remove(obj));
        }

        this.render();
        console.log('🗑️ 全要素クリア完了');
    }

    // モード切り替え
    async switchMode(newMode) {
        if (newMode === this.mode) return;

        console.log(`🔄 モード切り替え: ${this.mode} → ${newMode}`);

        if (newMode === '3d' && this.mode === '2d') {
            // 2D→3D切り替え
            const success = await this.tryInitialize3D();
            if (success) {
                // 既存データを3Dに再構築
                this.rebuildDataIn3D();
                this.showMessage('3Dモードに切り替え完了');
            } else {
                this.showMessage('3D切り替えに失敗、2Dモードを継続', 'warning');
            }
        } else if (newMode === '2d' && this.mode === '3d') {
            // 3D→2D切り替え
            this.mode = '2d';
            this.stopAnimation();
            this.render2D();
            this.showMessage('2Dモードに切り替え完了');
        }
    }

    // 既存データの3D再構築
    rebuildDataIn3D() {
        this.sources.forEach(source => this.add3DSource(source));
        this.shields.forEach(shield => this.add3DShield(shield));
        this.detectors.forEach(detector => this.add3DDetector(detector));
    }

    // メッセージ表示
    showMessage(message, type = 'info') {
        console.log(`💬 ${message}`);
        
        const messageElement = document.getElementById('visualizationMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.display = 'block';
            
            switch (type) {
                case 'success':
                    messageElement.style.color = '#28a745';
                    messageElement.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                    break;
                case 'warning':
                    messageElement.style.color = '#856404';
                    messageElement.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
                    break;
                case 'error':
                    messageElement.style.color = '#dc3545';
                    messageElement.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                    break;
                default:
                    messageElement.style.color = '#0056b3';
                    messageElement.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
            }
        }
    }

    // エラー表示
    showError(message) {
        this.showMessage(`エラー: ${message}`, 'error');
    }

    // リサイズ処理
    handleResize() {
        if (!this.canvas) return;

        if (this.mode === '3d' && this.camera && this.renderer) {
            const width = this.canvas.clientWidth;
            const height = this.canvas.clientHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        } else if (this.mode === '2d') {
            this.setupCanvas2D();
            this.render2D();
        }
    }

    // 診断情報取得
    getDiagnosticInfo() {
        return {
            mode: this.mode,
            initAttempts: this.initAttempts,
            sources: this.sources.size,
            shields: this.shields.size,
            detectors: this.detectors.size,
            threeJS: typeof THREE !== 'undefined',
            webGL: !!this.renderer,
            animation: this.isAnimating,
            canvas: {
                width: this.canvas?.clientWidth,
                height: this.canvas?.clientHeight
            }
        };
    }

    // 破棄
    dispose() {
        this.stopAnimation();
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        this.sources.clear();
        this.shields.clear();
        this.detectors.clear();
    }
}

// グローバル登録
window.HybridVisualizationSystem = HybridVisualizationSystem;
console.log('✅ HybridVisualizationSystem読み込み完了');
