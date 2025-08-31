// 3D Visualization Engine - Three.js based real-time shielding visualization
class ShieldingVisualization3D {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId);
        
        // Three.js core objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Geometry objects
        this.sources = new Map(); // 線源オブジェクト
        this.shields = new Map();  // 遮蔽体オブジェクト
        this.detectors = new Map(); // 検出器オブジェクト
        this.doseField = null;     // 線量率場
        
        // Animation and interaction
        this.animationId = null;
        this.isAnimating = false;
        
        // Configuration
        this.config = {
            cameraDistance: 200,
            autoRotate: false,
            showGrid: true,
            showAxes: true,
            showDoseField: true,
            materialOpacity: 0.7,
            doseColorMap: 'viridis'
        };
        
        console.log('🎨 ShieldingVisualization3D初期化開始...');
        this.initialize();
    }

    // 初期化
    initialize() {
        try {
            this.setupThreeJS();
            this.setupScene();
            this.setupLights();
            this.setupControls();
            this.setupEventHandlers();
            this.startAnimation();
            
            console.log('✅ 3D可視化システム初期化完了');
        } catch (error) {
            console.error('❌ 3D可視化初期化エラー:', error);
            this.showFallbackMessage();
        }
    }

    // Three.js基本セットアップ
    setupThreeJS() {
        if (!this.canvas) {
            throw new Error('Canvas要素が見つかりません');
        }

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f8ff); // Alice Blue

        // Camera
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(150, 100, 150);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // シーン基本要素のセットアップ
    setupScene() {
        // Grid (座標系表示)
        if (this.config.showGrid) {
            const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0xcccccc);
            gridHelper.name = 'grid';
            this.scene.add(gridHelper);
        }

        // Axes (軸表示)
        if (this.config.showAxes) {
            const axesHelper = new THREE.AxesHelper(50);
            axesHelper.name = 'axes';
            this.scene.add(axesHelper);
        }

        // 原点マーカー
        const originGeometry = new THREE.SphereGeometry(1, 8, 6);
        const originMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const originMarker = new THREE.Mesh(originGeometry, originMaterial);
        originMarker.name = 'origin';
        this.scene.add(originMarker);
    }

    // ライティングセットアップ
    setupLights() {
        // Ambient light (環境光)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Directional light (太陽光的な光)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        this.scene.add(directionalLight);

        // Point light (点光源 - より自然な陰影)
        const pointLight = new THREE.PointLight(0xffffff, 0.3);
        pointLight.position.set(-50, 50, 50);
        this.scene.add(pointLight);
    }

    // カメラコントロールセットアップ
    setupControls() {
        // OrbitControlsは外部ライブラリなので、基本的なマウス制御を実装
        this.setupBasicControls();
    }

    // 基本的なマウス制御
    setupBasicControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let rotationSpeed = 0.005;
        let zoomSpeed = 0.1;

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

            // カメラを原点中心に回転
            const sphericalCoords = this.cartesianToSpherical(this.camera.position);
            sphericalCoords.phi -= deltaMove.x * rotationSpeed;
            sphericalCoords.theta -= deltaMove.y * rotationSpeed;
            
            // θを制限（真上・真下を避ける）
            sphericalCoords.theta = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalCoords.theta));
            
            const newPosition = this.sphericalToCartesian(sphericalCoords);
            this.camera.position.copy(newPosition);
            this.camera.lookAt(0, 0, 0);

            previousMousePosition = { x: event.clientX, y: event.clientY };
        });

        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // ズーム制御
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            
            const zoomDelta = event.deltaY * zoomSpeed;
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            
            this.camera.position.addScaledVector(direction, zoomDelta);
            
            // ズーム制限
            const distance = this.camera.position.length();
            if (distance < 10) {
                this.camera.position.normalize().multiplyScalar(10);
            } else if (distance > 500) {
                this.camera.position.normalize().multiplyScalar(500);
            }
        });
    }

    // 座標変換ユーティリティ
    cartesianToSpherical(position) {
        const r = position.length();
        const theta = Math.acos(position.y / r);
        const phi = Math.atan2(position.z, position.x);
        return { r, theta, phi };
    }

    sphericalToCartesian(spherical) {
        const x = spherical.r * Math.sin(spherical.theta) * Math.cos(spherical.phi);
        const y = spherical.r * Math.cos(spherical.theta);
        const z = spherical.r * Math.sin(spherical.theta) * Math.sin(spherical.phi);
        return new THREE.Vector3(x, y, z);
    }

    // 線源を追加
    addRadiationSource(name, position, nuclide, activity) {
        console.log(`📍 線源追加: ${name} at ${position.join(', ')}`);

        // 線源を赤い輝く球として表示
        const sourceGeometry = new THREE.SphereGeometry(3, 16, 12);
        const sourceMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        const sourceMesh = new THREE.Mesh(sourceGeometry, sourceMaterial);
        sourceMesh.position.set(position[0], position[1], position[2]);
        sourceMesh.name = `source_${name}`;

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
        sourceGroup.name = `sourceGroup_${name}`;

        this.scene.add(sourceGroup);
        this.sources.set(name, {
            group: sourceGroup,
            mesh: sourceMesh,
            glow: glowMesh,
            nuclide,
            activity,
            position
        });

        // 線源情報ラベル
        this.addSourceLabel(sourceGroup, name, nuclide, activity);

        return sourceGroup;
    }

    // 遮蔽体を追加
    addShield(name, type, parameters, material = 'CONCRETE') {
        console.log(`🛡️ 遮蔽体追加: ${name} (${type})`);

        let geometry, mesh;

        switch (type) {
            case 'SPH':
                geometry = new THREE.SphereGeometry(
                    parameters.radius, 
                    32, 24
                );
                break;
            case 'RCC':
                geometry = new THREE.CylinderGeometry(
                    parameters.radius, 
                    parameters.radius, 
                    parameters.height, 
                    32
                );
                break;
            case 'RPP':
                const width = Math.abs(parameters.max[0] - parameters.min[0]);
                const height = Math.abs(parameters.max[1] - parameters.min[1]);
                const depth = Math.abs(parameters.max[2] - parameters.min[2]);
                geometry = new THREE.BoxGeometry(width, height, depth);
                break;
            default:
                console.warn(`⚠️ 未対応の遮蔽体タイプ: ${type}`);
                return null;
        }

        const materialColor = this.getMaterialColor(material);
        const shieldMaterial = new THREE.MeshLambertMaterial({
            color: materialColor,
            transparent: true,
            opacity: this.config.materialOpacity,
            side: THREE.DoubleSide
        });

        mesh = new THREE.Mesh(geometry, shieldMaterial);
        
        // 位置設定
        if (parameters.center) {
            mesh.position.set(
                parameters.center[0], 
                parameters.center[1], 
                parameters.center[2]
            );
        }

        mesh.name = `shield_${name}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.scene.add(mesh);
        this.shields.set(name, {
            mesh,
            type,
            parameters,
            material
        });

        return mesh;
    }

    // 検出器を追加
    addDetector(name, origin, grid) {
        console.log(`🔍 検出器追加: ${name}`);

        const detectorGroup = new THREE.Group();
        const detectorPoints = [];

        if (grid && grid.length > 0) {
            // グリッド検出器の場合
            const edge = grid[0].edge;
            const number = grid[0].number;

            for (let i = 0; i < number; i++) {
                const position = [
                    origin[0] + edge[0] * i,
                    origin[1] + edge[1] * i,
                    origin[2] + edge[2] * i
                ];

                const detectorGeometry = new THREE.BoxGeometry(2, 2, 2);
                const detectorMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.7
                });
                const detectorMesh = new THREE.Mesh(detectorGeometry, detectorMaterial);
                detectorMesh.position.set(position[0], position[1], position[2]);
                
                detectorGroup.add(detectorMesh);
                detectorPoints.push(position);
            }
        } else {
            // 単一検出器の場合
            const detectorGeometry = new THREE.BoxGeometry(4, 4, 4);
            const detectorMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ff00,
                transparent: true,
                opacity: 0.7
            });
            const detectorMesh = new THREE.Mesh(detectorGeometry, detectorMaterial);
            detectorMesh.position.set(origin[0], origin[1], origin[2]);
            
            detectorGroup.add(detectorMesh);
            detectorPoints.push(origin);
        }

        detectorGroup.name = `detectorGroup_${name}`;
        this.scene.add(detectorGroup);
        
        this.detectors.set(name, {
            group: detectorGroup,
            points: detectorPoints,
            origin,
            grid
        });

        return detectorGroup;
    }

    // 線量率フィールドを表示
    createDoseField(sourcePositions, shieldObjects) {
        if (!this.config.showDoseField) return;

        console.log('📊 線量率フィールド生成中...');

        // 既存のフィールドをクリア
        if (this.doseField) {
            this.scene.remove(this.doseField);
        }

        const fieldGroup = new THREE.Group();
        const gridSize = 20;
        const gridSpacing = 10;

        for (let x = -gridSize; x <= gridSize; x += 2) {
            for (let y = 0; y <= gridSize; y += 2) {
                for (let z = -gridSize; z <= gridSize; z += 2) {
                    const position = new THREE.Vector3(
                        x * gridSpacing,
                        y * gridSpacing,
                        z * gridSpacing
                    );

                    // 簡易線量率計算
                    const doseRate = this.calculateDoseRate(position, sourcePositions, shieldObjects);
                    
                    if (doseRate > 0.01) { // 閾値以上のみ表示
                        const color = this.doseRateToColor(doseRate);
                        const intensity = Math.min(doseRate / 100, 1.0);

                        const particleGeometry = new THREE.SphereGeometry(0.5, 8, 6);
                        const particleMaterial = new THREE.MeshBasicMaterial({
                            color: color,
                            transparent: true,
                            opacity: intensity * 0.6
                        });
                        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                        particle.position.copy(position);

                        fieldGroup.add(particle);
                    }
                }
            }
        }

        fieldGroup.name = 'doseField';
        this.doseField = fieldGroup;
        this.scene.add(fieldGroup);
    }

    // 簡易線量率計算
    calculateDoseRate(position, sources, shields) {
        let totalDoseRate = 0;

        sources.forEach(source => {
            const sourcePos = new THREE.Vector3(...source.position);
            const distance = position.distanceTo(sourcePos);
            
            if (distance > 0) {
                // 逆二乗則
                let doseRate = source.activity / (distance * distance) * 1e-12; // 簡易換算
                
                // 遮蔽による減衰（簡易計算）
                shields.forEach(shield => {
                    const attenuation = this.calculateShieldingAttenuation(
                        sourcePos, position, shield
                    );
                    doseRate *= attenuation;
                });
                
                totalDoseRate += doseRate;
            }
        });

        return totalDoseRate;
    }

    // 遮蔽による減衰計算（簡易）
    calculateShieldingAttenuation(source, detector, shield) {
        // 実際の計算は非常に複雑なので、簡易版を実装
        const shieldCenter = new THREE.Vector3(...shield.parameters.center);
        const shieldRadius = shield.parameters.radius;
        
        const direction = new THREE.Vector3().subVectors(detector, source).normalize();
        const ray = new THREE.Ray(source, direction);
        const sphere = new THREE.Sphere(shieldCenter, shieldRadius);
        
        const intersection = ray.intersectSphere(sphere, new THREE.Vector3());
        if (intersection) {
            // 遮蔽材による減衰（材料に応じて調整）
            const attenuationCoeff = this.getAttenuationCoefficient(shield.material);
            const thickness = this.getEffectiveThickness(source, detector, shield);
            return Math.exp(-attenuationCoeff * thickness);
        }
        
        return 1.0; // 遮蔽なし
    }

    // 材料色を取得
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

    // 線量率を色に変換
    doseRateToColor(doseRate) {
        // 簡易カラーマップ（青→緑→黄→赤）
        const normalized = Math.min(Math.log10(doseRate + 1) / 5, 1);
        
        if (normalized < 0.33) {
            return new THREE.Color(0, 0, 1).lerp(new THREE.Color(0, 1, 0), normalized * 3);
        } else if (normalized < 0.67) {
            return new THREE.Color(0, 1, 0).lerp(new THREE.Color(1, 1, 0), (normalized - 0.33) * 3);
        } else {
            return new THREE.Color(1, 1, 0).lerp(new THREE.Color(1, 0, 0), (normalized - 0.67) * 3);
        }
    }

    // 減衰係数を取得（簡易）
    getAttenuationCoefficient(material) {
        const coefficients = {
            'CONCRETE': 0.06,
            'LEAD': 0.8,
            'STEEL': 0.3,
            'WATER': 0.08
        };
        return coefficients[material] || 0.1;
    }

    // 実効厚さ計算（簡易）
    getEffectiveThickness(source, detector, shield) {
        if (shield.type === 'SPH') {
            return shield.parameters.radius * 2; // 簡易近似
        }
        return 10; // デフォルト値
    }

    // 線源ラベル追加
    addSourceLabel(sourceGroup, name, nuclide, activity) {
        // Three.jsでのテキスト表示は複雑なので、HTMLオーバーレイとして実装を想定
        // または簡易的にSpriteを使用
    }

    // アニメーション開始
    startAnimation() {
        this.isAnimating = true;
        this.animate();
    }

    // アニメーションループ
    animate() {
        if (!this.isAnimating) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        // 線源の輝きアニメーション
        const time = Date.now() * 0.001;
        this.sources.forEach(source => {
            if (source.glow) {
                source.glow.material.opacity = 0.2 + Math.sin(time * 3) * 0.1;
            }
        });

        // 自動回転
        if (this.config.autoRotate) {
            const rotationSpeed = 0.005;
            this.camera.position.x = Math.cos(time * rotationSpeed) * this.config.cameraDistance;
            this.camera.position.z = Math.sin(time * rotationSpeed) * this.config.cameraDistance;
            this.camera.lookAt(0, 0, 0);
        }

        this.renderer.render(this.scene, this.camera);
    }

    // アニメーション停止
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    // リサイズ対応
    handleResize() {
        if (!this.canvas || !this.camera || !this.renderer) return;

        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // イベントハンドラー設定
    setupEventHandlers() {
        window.addEventListener('resize', () => this.handleResize());
        
        // キーボードショートカット
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'r':
                    this.config.autoRotate = !this.config.autoRotate;
                    console.log(`自動回転: ${this.config.autoRotate ? 'ON' : 'OFF'}`);
                    break;
                case 'g':
                    this.toggleGrid();
                    break;
                case 'd':
                    this.toggleDoseField();
                    break;
            }
        });
    }

    // グリッド表示切り替え
    toggleGrid() {
        const grid = this.scene.getObjectByName('grid');
        if (grid) {
            grid.visible = !grid.visible;
            this.config.showGrid = grid.visible;
        }
    }

    // 線量率フィールド表示切り替え
    toggleDoseField() {
        if (this.doseField) {
            this.doseField.visible = !this.doseField.visible;
            this.config.showDoseField = this.doseField.visible;
        }
    }

    // オブジェクトをクリア
    clearAll() {
        this.sources.clear();
        this.shields.clear();
        this.detectors.clear();
        
        // シーンから削除
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            if (object.name.startsWith('source_') || 
                object.name.startsWith('shield_') || 
                object.name.startsWith('detector_') ||
                object.name === 'doseField') {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(obj => this.scene.remove(obj));
    }

    // フォールバックメッセージ表示
    showFallbackMessage() {
        if (this.canvas) {
            const ctx = this.canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.fillStyle = '#666';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('3D可視化の初期化に失敗しました', 
                    this.canvas.width / 2, this.canvas.height / 2);
                ctx.fillText('WebGLまたはThree.jsの対応を確認してください', 
                    this.canvas.width / 2, this.canvas.height / 2 + 25);
            }
        }
    }

    // 破棄
    dispose() {
        this.stopAnimation();
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // ジオメトリとマテリアルの破棄
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
        
        this.sources.clear();
        this.shields.clear();
        this.detectors.clear();
    }
}

// グローバル登録
window.ShieldingVisualization3D = ShieldingVisualization3D;
console.log('✅ ShieldingVisualization3D読み込み完了');
