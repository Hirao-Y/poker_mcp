// Deep Diagnostic Tool for 3D Visualization Issues
class DeepDiagnosticTool {
    constructor() {
        this.diagnosticResults = {};
        this.errors = [];
        this.warnings = [];
        
        console.log('🔬 詳細診断ツール開始...');
        this.runFullDiagnostic();
    }

    // 完全診断実行
    runFullDiagnostic() {
        console.log('=== 3D可視化 詳細診断 ===');
        
        try {
            // 1. 基本環境チェック
            this.checkBasicEnvironment();
            
            // 2. DOM要素チェック
            this.checkDOMElements();
            
            // 3. JavaScript読み込み状況
            this.checkJavaScriptLoading();
            
            // 4. Canvas要素詳細チェック
            this.checkCanvasDetails();
            
            // 5. Three.js詳細チェック
            this.checkThreeJSDetails();
            
            // 6. WebGL詳細チェック
            this.checkWebGLDetails();
            
            // 7. エラーログ収集
            this.collectErrorLogs();
            
            // 8. 結果表示
            this.displayResults();
            
        } catch (error) {
            console.error('❌ 診断ツール自体でエラー:', error);
            this.errors.push(`診断ツールエラー: ${error.message}`);
        }
    }

    // 1. 基本環境チェック
    checkBasicEnvironment() {
        console.log('🌐 基本環境チェック...');
        
        const env = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
            
            // ウィンドウサイズ
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            
            // ドキュメント状態
            documentReady: document.readyState,
            documentLocation: document.location.href,
            
            // プロトコル
            protocol: window.location.protocol,
            
            // セキュリティコンテキスト
            isSecureContext: window.isSecureContext,
        };
        
        this.diagnosticResults.environment = env;
        
        // 警告チェック
        if (env.protocol === 'file:') {
            this.warnings.push('ファイルプロトコル(file://)で実行中。WebGLやネットワーク機能が制限される可能性があります。');
        }
        
        if (!env.onLine) {
            this.warnings.push('ネットワーク接続がオフライン状態です。');
        }
        
        if (!env.isSecureContext) {
            this.warnings.push('セキュアコンテキスト(HTTPS)ではありません。一部の機能が制限される可能性があります。');
        }
        
        console.log('✅ 基本環境:', env);
    }

    // 2. DOM要素チェック
    checkDOMElements() {
        console.log('📄 DOM要素チェック...');
        
        const elements = {
            geometryCanvas: document.getElementById('geometryCanvas'),
            visualizationMessage: document.getElementById('visualizationMessage'),
            visualizationFallback: document.getElementById('visualizationFallback'),
            toggle3DBtn: document.getElementById('toggle3DVisualization'),
            show3DControlsBtn: document.getElementById('show3DControls'),
            show3DDiagnosticBtn: document.getElementById('show3DDiagnostic'),
        };
        
        this.diagnosticResults.domElements = {};
        
        for (const [name, element] of Object.entries(elements)) {
            if (element) {
                this.diagnosticResults.domElements[name] = {
                    exists: true,
                    tagName: element.tagName,
                    id: element.id,
                    className: element.className,
                    style: element.style.cssText,
                    computed: window.getComputedStyle(element).display
                };
                
                if (name === 'geometryCanvas') {
                    this.diagnosticResults.domElements[name].width = element.width;
                    this.diagnosticResults.domElements[name].height = element.height;
                    this.diagnosticResults.domElements[name].clientWidth = element.clientWidth;
                    this.diagnosticResults.domElements[name].clientHeight = element.clientHeight;
                }
            } else {
                this.diagnosticResults.domElements[name] = { exists: false };
                this.errors.push(`DOM要素が見つかりません: ${name}`);
            }
        }
        
        console.log('✅ DOM要素:', this.diagnosticResults.domElements);
    }

    // 3. JavaScript読み込み状況
    checkJavaScriptLoading() {
        console.log('📦 JavaScript読み込み状況チェック...');
        
        const scripts = {
            // グローバル変数
            THREE: typeof THREE !== 'undefined',
            
            // クラス
            WebGLSupportChecker: typeof WebGLSupportChecker !== 'undefined',
            ThreeJSLoader: typeof ThreeJSLoader !== 'undefined',
            ShieldingVisualization3D: typeof ShieldingVisualization3D !== 'undefined',
            Visualization3DManager: typeof Visualization3DManager !== 'undefined',
            VisualizationControlPanel: typeof VisualizationControlPanel !== 'undefined',
            
            // Tutorial関連
            TutorialCore: typeof TutorialCore !== 'undefined',
            TutorialUI: typeof TutorialUI !== 'undefined',
            TutorialMain: typeof TutorialMain !== 'undefined',
            
            // インスタンス
            tutorial: typeof window.tutorial !== 'undefined',
        };
        
        this.diagnosticResults.javascript = scripts;
        
        // エラーチェック
        const missingScripts = Object.entries(scripts)
            .filter(([name, loaded]) => !loaded)
            .map(([name]) => name);
            
        if (missingScripts.length > 0) {
            this.errors.push(`読み込まれていないスクリプト: ${missingScripts.join(', ')}`);
        }
        
        console.log('✅ JavaScript読み込み状況:', scripts);
    }

    // 4. Canvas詳細チェック
    checkCanvasDetails() {
        console.log('🎨 Canvas詳細チェック...');
        
        const canvas = document.getElementById('geometryCanvas');
        if (!canvas) {
            this.errors.push('Canvas要素が存在しません');
            return;
        }
        
        const canvasInfo = {
            exists: true,
            tagName: canvas.tagName,
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight,
            offsetWidth: canvas.offsetWidth,
            offsetHeight: canvas.offsetHeight,
            
            // Context取得テスト
            context2D: null,
            contextWebGL: null,
            contextWebGL2: null,
        };
        
        // 2D Context テスト
        try {
            const ctx2d = canvas.getContext('2d');
            canvasInfo.context2D = ctx2d ? 'available' : 'failed';
        } catch (error) {
            canvasInfo.context2D = `error: ${error.message}`;
            this.errors.push(`2D Context取得エラー: ${error.message}`);
        }
        
        // WebGL Context テスト
        try {
            const ctxWebGL = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            canvasInfo.contextWebGL = ctxWebGL ? 'available' : 'failed';
            
            if (ctxWebGL) {
                canvasInfo.webglInfo = {
                    version: ctxWebGL.getParameter(ctxWebGL.VERSION),
                    vendor: ctxWebGL.getParameter(ctxWebGL.VENDOR),
                    renderer: ctxWebGL.getParameter(ctxWebGL.RENDERER),
                    shadingLanguageVersion: ctxWebGL.getParameter(ctxWebGL.SHADING_LANGUAGE_VERSION),
                };
            }
        } catch (error) {
            canvasInfo.contextWebGL = `error: ${error.message}`;
            this.errors.push(`WebGL Context取得エラー: ${error.message}`);
        }
        
        // WebGL2 Context テスト
        try {
            const ctxWebGL2 = canvas.getContext('webgl2');
            canvasInfo.contextWebGL2 = ctxWebGL2 ? 'available' : 'failed';
        } catch (error) {
            canvasInfo.contextWebGL2 = `error: ${error.message}`;
        }
        
        this.diagnosticResults.canvas = canvasInfo;
        
        // サイズ警告
        if (canvasInfo.clientWidth === 0 || canvasInfo.clientHeight === 0) {
            this.warnings.push('Canvas表示サイズが0です。CSSで非表示になっている可能性があります。');
        }
        
        console.log('✅ Canvas詳細:', canvasInfo);
    }

    // 5. Three.js詳細チェック
    checkThreeJSDetails() {
        console.log('🎲 Three.js詳細チェック...');
        
        if (typeof THREE === 'undefined') {
            this.errors.push('Three.jsがロードされていません');
            this.diagnosticResults.threejs = { loaded: false };
            return;
        }
        
        const threeInfo = {
            loaded: true,
            version: THREE.REVISION || 'unknown',
            
            // 主要クラスの存在確認
            classes: {
                Scene: typeof THREE.Scene !== 'undefined',
                WebGLRenderer: typeof THREE.WebGLRenderer !== 'undefined',
                PerspectiveCamera: typeof THREE.PerspectiveCamera !== 'undefined',
                Mesh: typeof THREE.Mesh !== 'undefined',
                SphereGeometry: typeof THREE.SphereGeometry !== 'undefined',
                BoxGeometry: typeof THREE.BoxGeometry !== 'undefined',
                CylinderGeometry: typeof THREE.CylinderGeometry !== 'undefined',
                MeshLambertMaterial: typeof THREE.MeshLambertMaterial !== 'undefined',
                AmbientLight: typeof THREE.AmbientLight !== 'undefined',
                DirectionalLight: typeof THREE.DirectionalLight !== 'undefined',
                GridHelper: typeof THREE.GridHelper !== 'undefined',
                AxesHelper: typeof THREE.AxesHelper !== 'undefined',
            },
        };
        
        // レンダラー作成テスト
        try {
            const canvas = document.createElement('canvas');
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
            threeInfo.rendererTest = 'success';
            renderer.dispose();
        } catch (error) {
            threeInfo.rendererTest = `failed: ${error.message}`;
            this.errors.push(`Three.js WebGLRenderer作成エラー: ${error.message}`);
        }
        
        this.diagnosticResults.threejs = threeInfo;
        console.log('✅ Three.js詳細:', threeInfo);
    }

    // 6. WebGL詳細チェック
    checkWebGLDetails() {
        console.log('🎮 WebGL詳細チェック...');
        
        const canvas = document.createElement('canvas');
        const webglInfo = {
            webgl1: false,
            webgl2: false,
            error: null,
            extensions: [],
            limits: {},
        };
        
        // WebGL 1.0 チェック
        try {
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                webglInfo.webgl1 = true;
                webglInfo.version = gl.getParameter(gl.VERSION);
                webglInfo.vendor = gl.getParameter(gl.VENDOR);
                webglInfo.renderer = gl.getParameter(gl.RENDERER);
                webglInfo.shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
                
                // 拡張機能
                webglInfo.extensions = gl.getSupportedExtensions() || [];
                
                // 制限値
                webglInfo.limits = {
                    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
                    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
                    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
                    maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
                    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
                    maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
                };
            }
        } catch (error) {
            webglInfo.error = error.message;
            this.errors.push(`WebGL 1.0 チェックエラー: ${error.message}`);
        }
        
        // WebGL 2.0 チェック
        try {
            const gl2 = canvas.getContext('webgl2');
            if (gl2) {
                webglInfo.webgl2 = true;
            }
        } catch (error) {
            this.warnings.push(`WebGL 2.0 チェックエラー: ${error.message}`);
        }
        
        this.diagnosticResults.webgl = webglInfo;
        console.log('✅ WebGL詳細:', webglInfo);
    }

    // 7. エラーログ収集
    collectErrorLogs() {
        console.log('📋 エラーログ収集...');
        
        // Consoleエラーをキャプチャするため、一時的にconsole.errorをオーバーライド
        const originalConsoleError = console.error;
        const capturedErrors = [];
        
        console.error = function(...args) {
            capturedErrors.push(args.map(arg => String(arg)).join(' '));
            originalConsoleError.apply(console, args);
        };
        
        // 少し待ってからエラーログを復元
        setTimeout(() => {
            console.error = originalConsoleError;
        }, 1000);
        
        this.diagnosticResults.capturedErrors = capturedErrors;
    }

    // 8. 結果表示
    displayResults() {
        console.log('📊 診断結果表示...');
        
        // コンソール表示
        console.log('=== 詳細診断結果 ===');
        console.log('環境情報:', this.diagnosticResults.environment);
        console.log('DOM要素:', this.diagnosticResults.domElements);
        console.log('JavaScript読み込み:', this.diagnosticResults.javascript);
        console.log('Canvas情報:', this.diagnosticResults.canvas);
        console.log('Three.js情報:', this.diagnosticResults.threejs);
        console.log('WebGL情報:', this.diagnosticResults.webgl);
        
        if (this.errors.length > 0) {
            console.error('🚨 検出されたエラー:');
            this.errors.forEach((error, index) => {
                console.error(`  ${index + 1}. ${error}`);
            });
        }
        
        if (this.warnings.length > 0) {
            console.warn('⚠️ 警告:');
            this.warnings.forEach((warning, index) => {
                console.warn(`  ${index + 1}. ${warning}`);
            });
        }
        
        // UI表示
        this.displayUIResults();
    }

    // UI結果表示
    displayUIResults() {
        const summary = this.generateSummary();
        
        // アラートで表示
        alert(`詳細診断結果\n\n${summary}\n\n詳細はコンソール(F12)を確認してください。`);
        
        // メッセージ要素にも表示
        const messageElement = document.getElementById('visualizationMessage');
        if (messageElement) {
            messageElement.innerHTML = `
                <div style="text-align: left;">
                    <h4>🔬 詳細診断結果</h4>
                    <div style="font-family: monospace; font-size: 12px;">
                        ${summary.replace(/\n/g, '<br>')}
                    </div>
                    <p><small>詳細情報はコンソール(F12)を確認してください。</small></p>
                </div>
            `;
        }
    }

    // 診断サマリー生成
    generateSummary() {
        const results = this.diagnosticResults;
        
        let summary = '=== 診断サマリー ===\n';
        
        // 基本情報
        summary += `ブラウザ: ${results.environment?.userAgent?.split(' ')[0] || 'Unknown'}\n`;
        summary += `プロトコル: ${results.environment?.protocol || 'Unknown'}\n`;
        summary += `オンライン: ${results.environment?.onLine ? 'Yes' : 'No'}\n`;
        
        // Canvas
        const canvas = results.canvas;
        summary += `Canvas: ${canvas?.exists ? 'OK' : 'NG'}\n`;
        if (canvas?.exists) {
            summary += `  サイズ: ${canvas.clientWidth}x${canvas.clientHeight}\n`;
            summary += `  2D Context: ${canvas.context2D}\n`;
            summary += `  WebGL Context: ${canvas.contextWebGL}\n`;
        }
        
        // Three.js
        const threejs = results.threejs;
        summary += `Three.js: ${threejs?.loaded ? `OK (v${threejs.version})` : 'NG'}\n`;
        if (threejs?.rendererTest) {
            summary += `  Renderer: ${threejs.rendererTest}\n`;
        }
        
        // WebGL
        const webgl = results.webgl;
        summary += `WebGL: ${webgl?.webgl1 ? 'OK' : 'NG'}\n`;
        if (webgl?.webgl1) {
            summary += `  Version: ${webgl.version}\n`;
            summary += `  Vendor: ${webgl.vendor}\n`;
        }
        
        // エラー
        if (this.errors.length > 0) {
            summary += `\n🚨 エラー (${this.errors.length}個):\n`;
            this.errors.slice(0, 3).forEach((error, i) => {
                summary += `  ${i + 1}. ${error}\n`;
            });
            if (this.errors.length > 3) {
                summary += `  ... 他${this.errors.length - 3}個\n`;
            }
        }
        
        // 警告
        if (this.warnings.length > 0) {
            summary += `\n⚠️ 警告 (${this.warnings.length}個):\n`;
            this.warnings.slice(0, 2).forEach((warning, i) => {
                summary += `  ${i + 1}. ${warning}\n`;
            });
        }
        
        return summary;
    }

    // 診断データをJSON形式で出力
    exportDiagnosticData() {
        const data = {
            timestamp: new Date().toISOString(),
            results: this.diagnosticResults,
            errors: this.errors,
            warnings: this.warnings,
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'visualization_diagnostic_report.json';
        link.click();
        
        URL.revokeObjectURL(url);
        console.log('📄 診断データをJSONファイルでエクスポートしました');
    }
}

// グローバル登録
window.DeepDiagnosticTool = DeepDiagnosticTool;

// 自動実行（ページ読み込み完了時）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.diagnosticTool = new DeepDiagnosticTool();
        }, 2000); // 2秒待ってから診断実行
    });
} else {
    // 既に読み込み完了している場合は即座に実行
    setTimeout(() => {
        window.diagnosticTool = new DeepDiagnosticTool();
    }, 1000);
}

console.log('✅ 詳細診断ツール読み込み完了');
