// WebGL Support Checker and Fallback System
class WebGLSupportChecker {
    constructor() {
        this.hasWebGL = false;
        this.hasWebGL2 = false;
        this.renderer = null;
        this.fallbackMode = 'none';
        
        console.log('🔍 WebGL対応チェック開始...');
        this.checkSupport();
    }

    // WebGL対応チェック
    checkSupport() {
        try {
            // WebGL 1.0 チェック
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl) {
                this.hasWebGL = true;
                console.log('✅ WebGL 1.0 サポート確認');
                
                // WebGL 2.0 チェック
                const gl2 = canvas.getContext('webgl2');
                if (gl2) {
                    this.hasWebGL2 = true;
                    console.log('✅ WebGL 2.0 サポート確認');
                }
            } else {
                console.warn('❌ WebGL サポートなし');
            }

            // Three.js 可用性チェック
            if (typeof THREE !== 'undefined') {
                console.log('✅ Three.js ライブラリ確認');
                this.testThreeJSRenderer();
            } else {
                console.error('❌ Three.js ライブラリが見つかりません');
                this.fallbackMode = 'no-threejs';
            }

        } catch (error) {
            console.error('❌ WebGL チェック中にエラー:', error);
            this.fallbackMode = 'error';
        }
    }

    // Three.js レンダラーテスト
    testThreeJSRenderer() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;

            // WebGLRenderer テスト
            if (this.hasWebGL) {
                try {
                    const renderer = new THREE.WebGLRenderer({
                        canvas: canvas,
                        antialias: false,
                        alpha: true
                    });
                    
                    // 簡単なシーン作成テスト
                    const scene = new THREE.Scene();
                    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
                    
                    renderer.render(scene, camera);
                    renderer.dispose();
                    
                    console.log('✅ Three.js WebGLRenderer 動作確認');
                    this.fallbackMode = 'none';
                    return;
                } catch (webglError) {
                    console.warn('⚠️ WebGLRenderer 初期化失敗:', webglError);
                }
            }

            // Canvas2D フォールバック
            console.log('🔄 Canvas2D フォールバックモードに切り替え');
            this.fallbackMode = 'canvas2d';

        } catch (error) {
            console.error('❌ Three.js レンダラーテスト失敗:', error);
            this.fallbackMode = 'canvas2d';
        }
    }

    // 対応状況レポート
    getCompatibilityReport() {
        return {
            webgl: this.hasWebGL,
            webgl2: this.hasWebGL2,
            threejs: typeof THREE !== 'undefined',
            fallbackMode: this.fallbackMode,
            recommendation: this.getRecommendation()
        };
    }

    // 推奨事項取得
    getRecommendation() {
        if (this.fallbackMode === 'none') {
            return '3D可視化が利用可能です';
        } else if (this.fallbackMode === 'canvas2d') {
            return '2D可視化モードで動作します';
        } else if (this.fallbackMode === 'no-threejs') {
            return 'Three.jsライブラリの読み込みを確認してください';
        } else {
            return 'ブラウザの更新または別のブラウザをお試しください';
        }
    }

    // デバッグ情報表示
    showDebugInfo() {
        const report = this.getCompatibilityReport();
        console.log('🔍 WebGL対応状況レポート:');
        console.log('  WebGL 1.0:', report.webgl ? '✅' : '❌');
        console.log('  WebGL 2.0:', report.webgl2 ? '✅' : '❌');
        console.log('  Three.js:', report.threejs ? '✅' : '❌');
        console.log('  フォールバックモード:', report.fallbackMode);
        console.log('  推奨事項:', report.recommendation);
        
        // ブラウザ情報
        console.log('🌐 ブラウザ情報:');
        console.log('  User Agent:', navigator.userAgent);
        console.log('  Platform:', navigator.platform);
        
        return report;
    }
}

// 改良版 ShieldingVisualization3D with フォールバック機能
class ShieldingVisualization3DWithFallback {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId);
        this.mode = 'unknown';
        this.supportChecker = new WebGLSupportChecker();
        
        // 基本オブジェクト
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.ctx2d = null;
        
        // データストレージ
        this.sources = new Map();
        this.shields = new Map();
        this.detectors = new Map();
        
        // アニメーション
        this.animationId = null;
        this.isAnimating = false;
        
        console.log('🎨 改良版3D可視化システム初期化開始...');
        this.initialize();
    }

    // 初期化
    initialize() {
        if (!this.canvas) {
            console.error('❌ Canvas要素が見つかりません:', this.canvasId);
            this.showError('Canvas要素が見つかりません');
            return;
        }

        const report = this.supportChecker.getCompatibilityReport();
        this.supportChecker.showDebugInfo();

        try {
            if (report.fallbackMode === 'none' && report.webgl && report.threejs) {
                // 3Dモード初期化
                this.initialize3D();
            } else {
                // 2Dフォールバック初期化
                this.initialize2DFallback();
            }
        } catch (error) {
            console.error('❌ 初期化エラー:', error);
            this.initialize2DFallback();
        }
    }

    // 3Dモード初期化
    initialize3D() {
        try {
            console.log('🎨 3Dモード初期化中...');

            // Scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xf0f8ff);

            // Camera
            const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
            this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
            this.camera.position.set(150, 100, 150);
            this.camera.lookAt(0, 0, 0);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true
            });

            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // 影は問題を起こす可能性があるため、初期は無効化
            this.renderer.shadowMap.enabled = false;

            this.mode = '3d';
            this.setup3DScene();
            this.setup3DControls();
            this.startAnimation();

            console.log('✅ 3Dモード初期化完了');
            this.showMessage('3D可視化モードで動作中');

        } catch (error) {
            console.error('❌ 3Dモード初期化失敗:', error);
            this.initialize2DFallback();
        }
    }

    // 2Dフォールバック初期化
    initialize2DFallback() {
        console.log('🔄 2Dフォールバックモード初期化中...');
        
        try {
            this.ctx2d = this.canvas.getContext('2d');
            if (!this.ctx2d) {
                throw new Error('Canvas 2D context取得失敗');
            }

            this.mode = '2d';
            this.setup2DCanvas();
            this.render2D();

            console.log('✅ 2Dフォールバックモード初期化完了');
            this.showMessage('2D可視化モードで動作中（WebGL未対応環境）');

        } catch (error) {
            console.error('❌ 2Dフォールバック初期化失敗:', error);
            this.showError('可視化システムの初期化に完全に失敗しました');
        }
    }

    // 3Dシーンセットアップ
    setup3DScene() {
        // 環境光（やさしい光）
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // 方向光（メイン照明）
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
    }

    // 2Dキャンバスセットアップ
    setup2DCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        
        // 高DPI対応
        const ratio = window.devicePixelRatio || 1;
        this.canvas.width *= ratio;
        this.canvas.height *= ratio;
        this.canvas.style.width = this.canvas.clientWidth + 'px';
        this.canvas.style.height = this.canvas.clientHeight + 'px';
        this.ctx2d.scale(ratio, ratio);
    }

    // 3D制御セットアップ
    setup3DControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        this.canvas.addEventListener('mousedown', (event) => {
            isDragging = true;
            previousMousePosition = { x: event.clientX, y: event.clientY };
        });

        this.canvas.addEventListener('mousemove', (event) => {
            if (!isDragging) return;

            const deltaMove = {
                x: event.clientX - previousMousePosition.x,
                y: event.clientY - previousMousePosition.y
            };

            // 簡易回転制御
            const rotationSpeed = 0.005;
            const distance = this.camera.position.length();
            
            const phi = Math.atan2(this.camera.position.z, this.camera.position.x) - deltaMove.x * rotationSpeed;
            const theta = Math.acos(this.camera.position.y / distance) + deltaMove.y * rotationSpeed;
            const thetaClamped = Math.max(0.1, Math.min(Math.PI - 0.1, theta));

            this.camera.position.x = distance * Math.sin(thetaClamped) * Math.cos(phi);
            this.camera.position.y = distance * Math.cos(thetaClamped);
            this.camera.position.z = distance * Math.sin(thetaClamped) * Math.sin(phi);
            this.camera.lookAt(0, 0, 0);

            previousMousePosition = { x: event.clientX, y: event.clientY };
        });

        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // ズーム制御
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            
            const zoomSpeed = 0.1;
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            
            this.camera.position.addScaledVector(direction, event.deltaY * zoomSpeed);
            
            // ズーム制限
            const distance = this.camera.position.length();
            if (distance < 10) {
                this.camera.position.normalize().multiplyScalar(10);
            } else if (distance > 500) {
                this.camera.position.normalize().multiplyScalar(500);
            }
        });
    }

    // 線源追加
    addRadiationSource(name, position, nuclide, activity) {
        const sourceData = { name, position, nuclide, activity, type: 'source' };
        this.sources.set(name, sourceData);

        if (this.mode === '3d') {
            this.add3DSource(sourceData);
        } else {
            this.render2D();
        }

        console.log(`📍 線源追加: ${name}`);
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

            this.scene.add(sourceMesh);
            sourceData.mesh = sourceMesh;

        } catch (error) {
            console.error('❌ 3D線源追加エラー:', error);
        }
    }

    // 遮蔽体追加
    addShield(name, type, parameters, material) {
        const shieldData = { name, type, parameters, material, type: 'shield' };
        this.shields.set(name, shieldData);

        if (this.mode === '3d') {
            this.add3DShield(shieldData);
        } else {
            this.render2D();
        }

        console.log(`🛡️ 遮蔽体追加: ${name}`);
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
            shieldData.mesh = mesh;

        } catch (error) {
            console.error('❌ 3D遮蔽体追加エラー:', error);
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

    // 2D描画
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

        // 遮蔽体描画
        this.shields.forEach(shield => {
            this.ctx2d.strokeStyle = this.get2DMaterialColor(shield.material);
            this.ctx2d.lineWidth = 3;
            this.ctx2d.setLineDash([5, 5]);
            
            if (shield.type === 'SPH') {
                this.ctx2d.beginPath();
                this.ctx2d.arc(centerX, centerY, shield.parameters.radius || 50, 0, 2 * Math.PI);
                this.ctx2d.stroke();
            }
        });

        // 線源描画
        this.sources.forEach(source => {
            this.ctx2d.fillStyle = '#ff0000';
            this.ctx2d.beginPath();
            this.ctx2d.arc(centerX, centerY, 8, 0, 2 * Math.PI);
            this.ctx2d.fill();
            
            this.ctx2d.fillStyle = '#ffffff';
            this.ctx2d.font = '12px Arial';
            this.ctx2d.textAlign = 'center';
            this.ctx2d.fillText(source.nuclide || 'Source', centerX, centerY + 4);
        });

        // 2D表示であることを明記
        this.ctx2d.fillStyle = '#666';
        this.ctx2d.font = 'bold 14px Arial';
        this.ctx2d.textAlign = 'left';
        this.ctx2d.fillText('2D表示モード', 10, 25);
    }

    // 2D材料色取得
    get2DMaterialColor(material) {
        const colors = {
            'CONCRETE': '#888',
            'LEAD': '#333', 
            'STEEL': '#666',
            'WATER': '#87ceeb'
        };
        return colors[material] || '#888';
    }

    // アニメーション開始
    startAnimation() {
        if (this.mode === '3d') {
            this.isAnimating = true;
            this.animate3D();
        }
    }

    // 3Dアニメーション
    animate3D() {
        if (!this.isAnimating || !this.renderer) return;

        this.animationId = requestAnimationFrame(() => this.animate3D());

        try {
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error('❌ レンダリングエラー:', error);
            this.stopAnimation();
        }
    }

    // アニメーション停止
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    // すべてクリア
    clearAll() {
        this.sources.clear();
        this.shields.clear();
        this.detectors.clear();

        if (this.mode === '3d' && this.scene) {
            const objectsToRemove = [];
            this.scene.traverse((object) => {
                if (object.name.startsWith('source_') || 
                    object.name.startsWith('shield_') || 
                    object.name.startsWith('detector_')) {
                    objectsToRemove.push(object);
                }
            });
            objectsToRemove.forEach(obj => this.scene.remove(obj));
        } else if (this.mode === '2d') {
            this.render2D();
        }
    }

    // メッセージ表示
    showMessage(message) {
        console.log(`💬 ${message}`);
        const messageElement = document.getElementById('visualizationMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.color = '#0056b3';
            messageElement.style.display = 'block';
        }
    }

    // エラー表示
    showError(message) {
        console.error(`❌ ${message}`);
        const messageElement = document.getElementById('visualizationMessage');
        if (messageElement) {
            messageElement.textContent = `エラー: ${message}`;
            messageElement.style.color = '#dc3545';
            messageElement.style.display = 'block';
        }

        const fallbackElement = document.getElementById('visualizationFallback');
        if (fallbackElement) {
            fallbackElement.style.display = 'block';
        }
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
            this.setup2DCanvas();
            this.render2D();
        }
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

// グローバル登録（既存のクラスを置き換え）
window.ShieldingVisualization3D = ShieldingVisualization3DWithFallback;
window.WebGLSupportChecker = WebGLSupportChecker;
console.log('✅ 改良版3D可視化システム（WebGL対応チェック付き）読み込み完了');
