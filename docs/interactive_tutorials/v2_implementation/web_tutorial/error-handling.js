// Three.js Dynamic Loader with Error Handling
class ThreeJSLoader {
    constructor() {
        this.isLoaded = false;
        this.isLoading = false;
        this.loadPromise = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    // Three.js を動的に読み込む
    async loadThreeJS() {
        if (this.isLoaded && typeof THREE !== 'undefined') {
            console.log('✅ Three.js は既に読み込み済み');
            return true;
        }

        if (this.isLoading) {
            console.log('⏳ Three.js 読み込み中...');
            return this.loadPromise;
        }

        this.isLoading = true;
        console.log('📦 Three.js 読み込み開始...');

        this.loadPromise = this.tryLoadThreeJS();
        const result = await this.loadPromise;
        
        this.isLoading = false;
        return result;
    }

    // Three.js 読み込み試行
    async tryLoadThreeJS() {
        const urls = [
            // 主要CDN
            'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
            // バックアップCDN
            'https://unpkg.com/three@0.128.0/build/three.min.js',
            'https://cdn.skypack.dev/three@0.128.0',
            // より新しいバージョンでも試行
            'https://cdnjs.cloudflare.com/ajax/libs/three.js/r150/three.min.js'
        ];

        for (let i = 0; i < urls.length && this.retryCount < this.maxRetries; i++) {
            try {
                console.log(`🔄 Three.js 読み込み試行 ${i + 1}: ${urls[i]}`);
                await this.loadScriptFromURL(urls[i]);
                
                // 読み込み確認
                if (typeof THREE !== 'undefined') {
                    console.log('✅ Three.js 読み込み成功');
                    this.isLoaded = true;
                    return true;
                }
            } catch (error) {
                console.warn(`⚠️ Three.js 読み込み失敗 ${i + 1}: ${error.message}`);
                this.retryCount++;
                
                // 少し待ってから次を試行
                await this.delay(1000);
            }
        }

        console.error('❌ すべてのThree.js読み込み試行が失敗しました');
        return false;
    }

    // URL からスクリプト読み込み
    loadScriptFromURL(url) {
        return new Promise((resolve, reject) => {
            // 既存のスクリプトタグをチェック
            const existingScript = document.querySelector(`script[src="${url}"]`);
            if (existingScript) {
                existingScript.remove();
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error('読み込みタイムアウト'));
            }, 10000);

            script.onload = () => {
                clearTimeout(timeout);
                console.log(`✅ スクリプト読み込み成功: ${url}`);
                resolve();
            };

            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error(`読み込みエラー: ${url}`));
            };

            document.head.appendChild(script);
        });
    }

    // 待機
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Three.js バージョン情報取得
    getThreeJSInfo() {
        if (typeof THREE === 'undefined') {
            return { loaded: false, version: null };
        }

        return {
            loaded: true,
            version: THREE.REVISION || 'unknown',
            capabilities: this.checkThreeJSCapabilities()
        };
    }

    // Three.js 機能チェック
    checkThreeJSCapabilities() {
        if (typeof THREE === 'undefined') return {};

        const capabilities = {};
        
        try {
            capabilities.WebGLRenderer = typeof THREE.WebGLRenderer !== 'undefined';
            capabilities.Scene = typeof THREE.Scene !== 'undefined';
            capabilities.PerspectiveCamera = typeof THREE.PerspectiveCamera !== 'undefined';
            capabilities.Mesh = typeof THREE.Mesh !== 'undefined';
            capabilities.SphereGeometry = typeof THREE.SphereGeometry !== 'undefined';
            capabilities.MeshLambertMaterial = typeof THREE.MeshLambertMaterial !== 'undefined';
        } catch (error) {
            console.warn('Three.js機能チェック中にエラー:', error);
        }

        return capabilities;
    }
}

// 改良版 Visualization3DManager（エラーハンドリング強化）
class Visualization3DManagerWithErrorHandling {
    constructor(canvasId, tutorialCore) {
        this.canvasId = canvasId;
        this.tutorialCore = tutorialCore;
        this.visualization3D = null;
        this.isEnabled = false;
        this.currentStep = 1;
        this.initializationStatus = 'pending';
        this.threeJSLoader = new ThreeJSLoader();
        
        console.log('🎮 改良版Visualization3DManager初期化開始...');
        this.initialize();
    }

    // 初期化（エラーハンドリング強化版）
    async initialize() {
        try {
            this.initializationStatus = 'loading';
            this.showMessage('3D可視化システムを初期化中...');

            // Three.js 読み込み確認・実行
            const threeJSLoaded = await this.threeJSLoader.loadThreeJS();
            
            if (!threeJSLoaded) {
                throw new Error('Three.js読み込み失敗');
            }

            // Three.js情報表示
            const threeInfo = this.threeJSLoader.getThreeJSInfo();
            console.log('📊 Three.js情報:', threeInfo);

            // WebGL対応チェック付きの3D可視化エンジン初期化
            if (typeof ShieldingVisualization3D !== 'undefined') {
                this.visualization3D = new ShieldingVisualization3D(this.canvasId);
                
                // 初期化成功の確認
                if (this.visualization3D.mode === '3d') {
                    this.isEnabled = true;
                    this.initializationStatus = 'success-3d';
                    this.showMessage('3D可視化システム初期化完了（WebGL対応）');
                } else if (this.visualization3D.mode === '2d') {
                    this.isEnabled = true;
                    this.initializationStatus = 'success-2d';
                    this.showMessage('2D可視化システム初期化完了（WebGL未対応環境）');
                } else {
                    throw new Error('可視化システム初期化失敗');
                }

                // 初期表示
                this.updateVisualization();

            } else {
                throw new Error('ShieldingVisualization3Dクラスが見つかりません');
            }

            console.log('✅ 改良版3D可視化統合管理システム初期化完了');

        } catch (error) {
            this.initializationStatus = 'failed';
            console.error('❌ 3D可視化統合初期化エラー:', error);
            this.showFallbackMessage(error);
        }
    }

    // メッセージ表示（改良版）
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

    // フォールバックメッセージ表示
    showFallbackMessage(error) {
        const errorMessage = this.generateErrorMessage(error);
        this.showMessage(errorMessage.message, 'error');

        const fallbackElement = document.getElementById('visualizationFallback');
        if (fallbackElement) {
            fallbackElement.innerHTML = `
                <div style="text-align: left;">
                    <h4>🔧 3D可視化が利用できません</h4>
                    <p><strong>問題:</strong> ${errorMessage.problem}</p>
                    <p><strong>原因:</strong> ${errorMessage.cause}</p>
                    <p><strong>対処法:</strong></p>
                    <ul>
                        ${errorMessage.solutions.map(solution => `<li>${solution}</li>`).join('')}
                    </ul>
                    <p><strong>ブラウザ情報:</strong> ${navigator.userAgent}</p>
                </div>
            `;
            fallbackElement.style.display = 'block';
        }
    }

    // エラーメッセージ生成
    generateErrorMessage(error) {
        const errorString = error.toString().toLowerCase();
        
        if (errorString.includes('three.js') || errorString.includes('three is not defined')) {
            return {
                message: 'Three.jsライブラリの読み込みに失敗しました',
                problem: 'Three.jsライブラリが読み込めません',
                cause: 'インターネット接続の問題、またはCDNアクセス制限',
                solutions: [
                    '1. インターネット接続を確認してください',
                    '2. ブラウザを更新（F5）してください',
                    '3. 別のブラウザで試してください',
                    '4. 企業ファイアウォールがCDNをブロックしている可能性があります'
                ]
            };
        } else if (errorString.includes('webgl') || errorString.includes('canvas')) {
            return {
                message: 'WebGL/Canvas初期化に失敗しました',
                problem: 'WebGLまたはCanvas機能が利用できません',
                cause: 'ブラウザのWebGL対応不足、またはハードウェア制限',
                solutions: [
                    '1. 最新のブラウザに更新してください',
                    '2. Chrome、Firefox、Safariなどの対応ブラウザを使用してください',
                    '3. ブラウザのハードウェアアクセラレーションを有効にしてください',
                    '4. グラフィックスドライバを更新してください'
                ]
            };
        } else {
            return {
                message: '3D可視化システムの初期化に失敗しました',
                problem: '3D可視化機能が開始できません',
                cause: '不明なエラーが発生しました',
                solutions: [
                    '1. ページを再読み込み（F5）してください',
                    '2. 別のブラウザで試してください',
                    '3. ブラウザのキャッシュをクリアしてください',
                    '4. デベロッパーツール（F12）でエラー詳細を確認してください'
                ]
            };
        }
    }

    // 診断情報取得
    getDiagnosticInfo() {
        const info = {
            timestamp: new Date().toISOString(),
            initializationStatus: this.initializationStatus,
            threeJS: this.threeJSLoader.getThreeJSInfo(),
            webgl: null,
            browser: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        };

        // WebGL情報
        if (typeof WebGLSupportChecker !== 'undefined') {
            const webglChecker = new WebGLSupportChecker();
            info.webgl = webglChecker.getCompatibilityReport();
        }

        return info;
    }

    // 診断レポート表示
    showDiagnosticReport() {
        const info = this.getDiagnosticInfo();
        console.log('🔍 診断レポート:', info);
        
        const reportText = `
=== 3D可視化診断レポート ===
時刻: ${info.timestamp}
初期化状況: ${info.initializationStatus}
Three.js: ${info.threeJS.loaded ? `有効 (v${info.threeJS.version})` : '無効'}
WebGL: ${info.webgl?.webgl ? '有効' : '無効'}
ブラウザ: ${info.browser.userAgent}
        `;
        
        alert(reportText);
        return info;
    }

    // その他のメソッドは元のVisualization3DManagerから継承
    updateVisualization() {
        if (!this.isEnabled || !this.visualization3D) {
            console.warn('⚠️ 3D可視化が利用できないため、可視化更新をスキップ');
            return;
        }

        // 元のupdateVisualizationロジックを呼び出し
        try {
            console.log(`🎨 Step ${this.currentStep} 可視化更新中...`);

            // 既存要素をクリア
            this.visualization3D.clearAll();

            // ステップに応じた表示
            if (this.currentStep >= 1) {
                this.visualization3D.addRadiationSource(
                    'co60_medical',
                    [0, 0, 0],
                    'Co60',
                    37000000000
                );
            }

            if (this.currentStep >= 2) {
                this.visualization3D.addShield(
                    'concrete_shield',
                    'SPH',
                    { center: [0, 0, 0], radius: 50 },
                    'CONCRETE'
                );
            }

        } catch (error) {
            console.error('❌ 可視化更新エラー:', error);
            this.showMessage('可視化更新中にエラーが発生しました', 'error');
        }
    }

    // ステップ変更処理
    onStepChanged(newStep) {
        this.currentStep = newStep;
        console.log(`🎯 ステップ変更: ${newStep}`);
        
        if (this.isEnabled) {
            this.updateVisualization();
        } else {
            console.warn('⚠️ 3D可視化が無効のため、ステップ変更をスキップ');
        }
    }

    // 機能切り替え
    toggle() {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return;

        if (this.initializationStatus === 'failed') {
            this.showDiagnosticReport();
            return;
        }

        if (this.isEnabled) {
            canvas.style.display = 'none';
            this.showMessage('3D可視化を非表示にしました');
        } else {
            canvas.style.display = 'block';
            this.showMessage('3D可視化を表示しました');
        }
    }

    // その他必要なメソッドをstubとして追加
    captureScreenshot() {
        if (this.visualization3D && typeof this.visualization3D.captureScreenshot === 'function') {
            return this.visualization3D.captureScreenshot();
        } else {
            this.showMessage('スクリーンショット機能は利用できません', 'warning');
            return null;
        }
    }

    handleUserInteraction(type, data) {
        if (this.visualization3D && typeof this.visualization3D.handleUserInteraction === 'function') {
            this.visualization3D.handleUserInteraction(type, data);
        }
    }

    dispose() {
        if (this.visualization3D && typeof this.visualization3D.dispose === 'function') {
            this.visualization3D.dispose();
        }
        this.isEnabled = false;
    }
}

// グローバル登録（既存クラスを置き換え）
window.Visualization3DManager = Visualization3DManagerWithErrorHandling;
window.ThreeJSLoader = ThreeJSLoader;
console.log('✅ エラーハンドリング強化版3D可視化管理システム読み込み完了');
