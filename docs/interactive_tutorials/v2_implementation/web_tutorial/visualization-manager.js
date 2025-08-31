// 3D Visualization Integration Manager - Tutorial との統合管理
class Visualization3DManager {
    constructor(canvasId, tutorialCore) {
        this.canvasId = canvasId;
        this.tutorialCore = tutorialCore;
        this.visualization3D = null;
        this.isEnabled = false;
        this.currentStep = 1;
        
        // 段階的表示設定
        this.stepVisualizations = {
            1: { sources: true, shields: false, detectors: false, doseField: false },
            2: { sources: true, shields: true, detectors: false, doseField: false },
            3: { sources: true, shields: true, detectors: true, doseField: true },
            4: { sources: true, shields: true, detectors: true, doseField: true },
            5: { sources: true, shields: true, detectors: true, doseField: true }
        };
        
        console.log('🎮 Visualization3DManager初期化開始...');
        this.initialize();
    }

    // 初期化
    async initialize() {
        try {
            // Three.jsの読み込み確認
            if (typeof THREE === 'undefined') {
                await this.loadThreeJS();
            }

            // 3D可視化エンジン初期化
            this.visualization3D = new ShieldingVisualization3D(this.canvasId);
            this.isEnabled = true;

            // 初期表示
            this.updateVisualization();

            console.log('✅ 3D可視化統合管理システム初期化完了');
        } catch (error) {
            console.error('❌ 3D可視化統合初期化エラー:', error);
            this.showFallbackVisualization();
        }
    }

    // Three.js動的読み込み
    async loadThreeJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.onload = () => {
                console.log('✅ Three.js読み込み完了');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Three.js読み込み失敗');
                reject(new Error('Three.js読み込み失敗'));
            };
            document.head.appendChild(script);
        });
    }

    // 現在のステップに応じた可視化更新
    updateVisualization() {
        if (!this.isEnabled || !this.visualization3D) return;

        console.log(`🎨 Step ${this.currentStep} 可視化更新中...`);

        const stepData = this.tutorialCore.updateStepContent();
        if (!stepData) return;

        const config = this.stepVisualizations[this.currentStep];

        // 既存要素をクリア
        this.visualization3D.clearAll();

        // ステップ1: Co-60線源
        if (this.currentStep >= 1 && config.sources) {
            this.visualization3D.addRadiationSource(
                'co60_medical',
                [0, 0, 0],
                'Co60',
                37000000000 // 37 GBq
            );
            
            this.showStepMessage('Step 1: Co-60線源を配置しました（赤い輝く点）');
        }

        // ステップ2: コンクリート遮蔽
        if (this.currentStep >= 2 && config.shields) {
            this.visualization3D.addShield(
                'concrete_shield',
                'SPH',
                { center: [0, 0, 0], radius: 50 },
                'CONCRETE'
            );
            
            this.showStepMessage('Step 2: コンクリート遮蔽球を追加しました（灰色の半透明球）');
        }

        // ステップ3: 検出器
        if (this.currentStep >= 3 && config.detectors) {
            this.visualization3D.addDetector(
                'dose_survey',
                [60, 0, 0],
                [{ edge: [10, 0, 0], number: 10 }]
            );
            
            this.showStepMessage('Step 3: 線量率検出器アレイを配置しました（緑の立方体群）');
        }

        // ステップ4: 鉛遮蔽
        if (this.currentStep >= 4 && config.shields) {
            this.visualization3D.addShield(
                'lead_inner_shield',
                'SPH',
                { center: [0, 0, 0], radius: 18 },
                'LEAD'
            );
            
            this.showStepMessage('Step 4: 内側鉛遮蔽球を追加しました（暗い球）');
        }

        // ステップ3以降: 線量率フィールド
        if (this.currentStep >= 3 && config.doseField) {
            const sources = [{ position: [0, 0, 0], activity: 37000000000 }];
            const shields = this.getAllShields();
            this.visualization3D.createDoseField(sources, shields);
            
            this.showStepMessage('線量率分布を可視化しました（色付き粒子: 青=低線量 → 赤=高線量）');
        }

        // カメラ位置を最適化
        this.optimizeCameraPosition();
    }

    // 現在のシールド情報を取得
    getAllShields() {
        const shields = [];
        
        if (this.currentStep >= 2) {
            shields.push({
                type: 'SPH',
                parameters: { center: [0, 0, 0], radius: 50 },
                material: 'CONCRETE'
            });
        }
        
        if (this.currentStep >= 4) {
            shields.push({
                type: 'SPH', 
                parameters: { center: [0, 0, 0], radius: 18 },
                material: 'LEAD'
            });
        }
        
        return shields;
    }

    // カメラ位置最適化
    optimizeCameraPosition() {
        if (!this.visualization3D || !this.visualization3D.camera) return;

        switch (this.currentStep) {
            case 1: // 線源のクローズアップ
                this.visualization3D.camera.position.set(50, 30, 50);
                break;
            case 2: // 遮蔽体全体が見える位置
                this.visualization3D.camera.position.set(100, 60, 100);
                break;
            case 3: // 検出器も含む全体ビュー
                this.visualization3D.camera.position.set(150, 80, 150);
                break;
            case 4: // 複合遮蔽の詳細
                this.visualization3D.camera.position.set(120, 70, 120);
                break;
            case 5: // 全体の完成図
                this.visualization3D.camera.position.set(180, 100, 180);
                break;
        }
        
        this.visualization3D.camera.lookAt(0, 0, 0);
    }

    // ステップメッセージ表示
    showStepMessage(message) {
        console.log(`🎨 ${message}`);
        
        // UI要素がある場合はそこにも表示
        const messageArea = document.getElementById('visualizationMessage');
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.style.opacity = '1';
            
            // 5秒後にフェードアウト
            setTimeout(() => {
                if (messageArea) {
                    messageArea.style.opacity = '0';
                }
            }, 5000);
        }
    }

    // ステップ更新時の処理
    onStepChanged(newStep) {
        const previousStep = this.currentStep;
        this.currentStep = newStep;
        
        console.log(`🎯 ステップ変更: ${previousStep} → ${newStep}`);
        
        // 段階的アニメーション
        this.animateStepTransition(previousStep, newStep);
        
        // 可視化更新
        setTimeout(() => {
            this.updateVisualization();
        }, 500);
    }

    // ステップ遷移アニメーション
    animateStepTransition(fromStep, toStep) {
        if (!this.visualization3D) return;

        if (toStep > fromStep) {
            // 進行時: 新要素をフェードイン
            this.showStepMessage(`Step ${toStep} の要素を追加中...`);
        } else {
            // 後退時: 要素をフェードアウト
            this.showStepMessage(`Step ${toStep} に戻っています...`);
        }
    }

    // インタラクティブ操作の処理
    handleUserInteraction(interactionType, data) {
        if (!this.isEnabled || !this.visualization3D) return;

        switch (interactionType) {
            case 'sourceCreated':
                this.visualization3D.addRadiationSource(
                    data.name,
                    data.position,
                    data.nuclide,
                    data.activity
                );
                break;
                
            case 'shieldCreated':
                this.visualization3D.addShield(
                    data.name,
                    data.type,
                    data.parameters,
                    data.material
                );
                break;
                
            case 'detectorCreated':
                this.visualization3D.addDetector(
                    data.name,
                    data.origin,
                    data.grid
                );
                break;
                
            case 'parameterChanged':
                // パラメータ変更時のリアルタイム更新
                this.updateParameterVisualization(data);
                break;
        }
        
        // 線量率フィールドを再計算
        if (this.currentStep >= 3) {
            this.updateDoseField();
        }
    }

    // パラメータ変更時の可視化更新
    updateParameterVisualization(data) {
        console.log('🔄 パラメータ変更に伴う可視化更新:', data);
        
        // 該当オブジェクトを更新
        if (data.type === 'source') {
            // 線源パラメータ変更
            const source = this.visualization3D.sources.get(data.name);
            if (source) {
                // 活動度変更の場合の視覚的フィードバック
                if (data.parameter === 'activity') {
                    const intensity = Math.min(data.value / 1e11, 1.0);
                    source.glow.material.opacity = 0.2 + intensity * 0.3;
                }
            }
        } else if (data.type === 'shield') {
            // 遮蔽体パラメータ変更
            // サイズや位置変更の場合は再作成
            this.visualization3D.shields.delete(data.name);
            this.visualization3D.addShield(
                data.name,
                data.shieldType,
                data.parameters,
                data.material
            );
        }
    }

    // 線量率フィールド更新
    updateDoseField() {
        const sources = Array.from(this.visualization3D.sources.values()).map(source => ({
            position: source.position,
            activity: source.activity
        }));
        
        const shields = this.getAllShields();
        this.visualization3D.createDoseField(sources, shields);
    }

    // 可視化設定の変更
    updateVisualizationConfig(config) {
        if (!this.visualization3D) return;

        Object.assign(this.visualization3D.config, config);
        
        // 設定に応じて表示を更新
        if (config.hasOwnProperty('showGrid')) {
            this.visualization3D.toggleGrid();
        }
        
        if (config.hasOwnProperty('showDoseField')) {
            this.visualization3D.toggleDoseField();
        }
        
        if (config.hasOwnProperty('materialOpacity')) {
            this.updateMaterialOpacity(config.materialOpacity);
        }
    }

    // 材料透明度更新
    updateMaterialOpacity(opacity) {
        this.visualization3D.shields.forEach(shield => {
            shield.mesh.material.opacity = opacity;
        });
    }

    // スクリーンショット取得
    captureScreenshot() {
        if (!this.visualization3D || !this.visualization3D.renderer) return null;

        try {
            const canvas = this.visualization3D.renderer.domElement;
            const dataURL = canvas.toDataURL('image/png');
            
            // ダウンロードリンクを作成
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = `shielding_visualization_step_${this.currentStep}.png`;
            link.click();
            
            this.showStepMessage('スクリーンショットを保存しました');
            return dataURL;
        } catch (error) {
            console.error('❌ スクリーンショット取得エラー:', error);
            return null;
        }
    }

    // フルスクリーン表示
    enterFullscreen() {
        const canvas = this.visualization3D?.renderer?.domElement;
        if (!canvas) return;

        if (canvas.requestFullscreen) {
            canvas.requestFullscreen();
        } else if (canvas.webkitRequestFullscreen) {
            canvas.webkitRequestFullscreen();
        } else if (canvas.mozRequestFullScreen) {
            canvas.mozRequestFullScreen();
        }

        this.showStepMessage('フルスクリーンモードに移行しました（ESCで終了）');
    }

    // アニメーション制御
    toggleAnimation() {
        if (!this.visualization3D) return;

        if (this.visualization3D.isAnimating) {
            this.visualization3D.stopAnimation();
            this.showStepMessage('アニメーション停止');
        } else {
            this.visualization3D.startAnimation();
            this.showStepMessage('アニメーション開始');
        }
    }

    // 自動回転切り替え
    toggleAutoRotate() {
        if (!this.visualization3D) return;

        this.visualization3D.config.autoRotate = !this.visualization3D.config.autoRotate;
        this.showStepMessage(`自動回転: ${this.visualization3D.config.autoRotate ? 'ON' : 'OFF'}`);
    }

    // フォールバック可視化
    showFallbackVisualization() {
        console.log('🔄 フォールバック可視化モードに切り替え');
        
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 2D フォールバック描画
        this.drawFallback2D(ctx, canvas);
        
        this.showStepMessage('2D フォールバック表示モードで動作中');
    }

    // 2D フォールバック描画
    drawFallback2D(ctx, canvas) {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        // 背景
        ctx.fillStyle = '#f0f8ff';
        ctx.fillRect(0, 0, width, height);

        // グリッド
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        for (let i = 0; i <= width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
        }
        for (let i = 0; i <= height; i += 20) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }

        // ステップに応じた描画
        if (this.currentStep >= 1) {
            // 線源
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Co-60', centerX, centerY + 4);
        }

        if (this.currentStep >= 2) {
            // コンクリート遮蔽
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
            ctx.stroke();
            
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.fillText('Concrete Shield', centerX + 45, centerY - 45);
        }

        if (this.currentStep >= 3) {
            // 検出器
            for (let i = 0; i < 5; i++) {
                const x = centerX + 80 + i * 15;
                const y = centerY;
                
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(x - 3, y - 3, 6, 6);
            }
            
            ctx.fillStyle = '#006600';
            ctx.font = '10px Arial';
            ctx.fillText('Detectors', centerX + 90, centerY - 15);
        }

        if (this.currentStep >= 4) {
            // 鉛遮蔽
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
            ctx.stroke();
            
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.fillText('Lead Shield', centerX + 20, centerY + 20);
        }

        // ステップ表示
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Step ${this.currentStep} - 2D View`, 10, 25);
    }

    // リサイズ処理
    handleResize() {
        if (this.visualization3D) {
            this.visualization3D.handleResize();
        }
    }

    // 破棄
    dispose() {
        if (this.visualization3D) {
            this.visualization3D.dispose();
        }
        this.isEnabled = false;
    }

    // 可視化の有効/無効切り替え
    toggle() {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return;

        if (this.isEnabled) {
            canvas.style.display = 'none';
            this.isEnabled = false;
            this.showStepMessage('3D可視化を非表示にしました');
        } else {
            canvas.style.display = 'block';
            this.isEnabled = true;
            this.updateVisualization();
            this.showStepMessage('3D可視化を表示しました');
        }
    }
}

// グローバル登録
window.Visualization3DManager = Visualization3DManager;
console.log('✅ Visualization3DManager読み込み完了');
