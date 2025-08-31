// Quick Check Script - 即座にエラーの原因を特定
(function() {
    'use strict';
    
    console.log('🔍 即座チェック開始...');
    
    // 1. 基本的な環境チェック
    console.log('=== 基本チェック ===');
    console.log('1. ページURL:', window.location.href);
    console.log('2. プロトコル:', window.location.protocol);
    console.log('3. Document Ready:', document.readyState);
    console.log('4. ユーザーエージェント:', navigator.userAgent);
    
    // 2. Canvas要素の存在確認
    const canvas = document.getElementById('geometryCanvas');
    console.log('=== Canvas確認 ===');
    if (canvas) {
        console.log('✅ Canvas要素: 存在');
        console.log('   サイズ:', canvas.width, 'x', canvas.height);
        console.log('   クライアントサイズ:', canvas.clientWidth, 'x', canvas.clientHeight);
        console.log('   表示状態:', window.getComputedStyle(canvas).display);
        
        // 2D Context テスト
        try {
            const ctx2d = canvas.getContext('2d');
            console.log('✅ 2D Context: 取得可能');
        } catch (e) {
            console.error('❌ 2D Context: 取得失敗', e);
        }
        
        // WebGL Context テスト
        try {
            const webgl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (webgl) {
                console.log('✅ WebGL Context: 取得可能');
                console.log('   Version:', webgl.getParameter(webgl.VERSION));
                console.log('   Vendor:', webgl.getParameter(webgl.VENDOR));
            } else {
                console.error('❌ WebGL Context: 取得失敗');
            }
        } catch (e) {
            console.error('❌ WebGL Context: エラー', e);
        }
    } else {
        console.error('❌ Canvas要素: 見つかりません');
    }
    
    // 3. スクリプトファイルの読み込み確認
    console.log('=== スクリプト読み込み確認 ===');
    const scripts = [
        { name: 'DeepDiagnosticTool', check: () => typeof DeepDiagnosticTool !== 'undefined' },
        { name: 'WebGLSupportChecker', check: () => typeof WebGLSupportChecker !== 'undefined' },
        { name: 'ThreeJSLoader', check: () => typeof ThreeJSLoader !== 'undefined' },
        { name: 'ShieldingVisualization3D', check: () => typeof ShieldingVisualization3D !== 'undefined' },
        { name: 'Visualization3DManager', check: () => typeof Visualization3DManager !== 'undefined' },
        { name: 'THREE', check: () => typeof THREE !== 'undefined' }
    ];
    
    scripts.forEach(script => {
        try {
            if (script.check()) {
                console.log(`✅ ${script.name}: 読み込み済み`);
            } else {
                console.error(`❌ ${script.name}: 未読み込み`);
            }
        } catch (e) {
            console.error(`❌ ${script.name}: チェックエラー`, e);
        }
    });
    
    // 4. Three.js 特別チェック
    if (typeof THREE !== 'undefined') {
        console.log('=== Three.js 詳細確認 ===');
        console.log('✅ THREE version:', THREE.REVISION);
        
        // レンダラー作成テスト
        try {
            const testCanvas = document.createElement('canvas');
            const renderer = new THREE.WebGLRenderer({ canvas: testCanvas });
            console.log('✅ WebGLRenderer: 作成可能');
            renderer.dispose();
        } catch (e) {
            console.error('❌ WebGLRenderer: 作成失敗', e);
        }
        
        // 基本クラステスト
        const threeClasses = [
            'Scene', 'PerspectiveCamera', 'WebGLRenderer',
            'SphereGeometry', 'MeshLambertMaterial', 'Mesh'
        ];
        
        threeClasses.forEach(className => {
            if (THREE[className]) {
                console.log(`✅ THREE.${className}: 利用可能`);
            } else {
                console.error(`❌ THREE.${className}: 見つかりません`);
            }
        });
    }
    
    // 5. 実際の初期化テスト
    console.log('=== 初期化テスト ===');
    if (canvas && typeof THREE !== 'undefined') {
        try {
            // 最小限の初期化テスト
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas: canvas });
            
            renderer.setSize(100, 100);
            renderer.render(scene, camera);
            
            console.log('✅ 基本初期化: 成功');
            
            // クリーンアップ
            renderer.dispose();
            
        } catch (e) {
            console.error('❌ 基本初期化: 失敗', e);
            console.error('エラースタック:', e.stack);
        }
    }
    
    // 6. エラー表示要素チェック
    console.log('=== UI要素確認 ===');
    const uiElements = [
        'visualizationMessage',
        'visualizationFallback',
        'toggle3DVisualization',
        'runDeepDiagnostic'
    ];
    
    uiElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`✅ ${elementId}: 存在`);
        } else {
            console.error(`❌ ${elementId}: 見つかりません`);
        }
    });
    
    // 7. 最も可能性の高いエラー原因を特定
    console.log('=== エラー原因特定 ===');
    
    if (!canvas) {
        console.error('🚨 主要な問題: Canvas要素が見つかりません');
        console.log('→ index.htmlのgeometryCanvasのid属性を確認してください');
    } else if (typeof THREE === 'undefined') {
        console.error('🚨 主要な問題: Three.jsが読み込まれていません');
        console.log('→ ネットワーク接続またはCDNアクセスの問題の可能性があります');
        console.log('→ error-handling.jsが正しく動作していない可能性があります');
    } else if (typeof ShieldingVisualization3D === 'undefined') {
        console.error('🚨 主要な問題: 3D可視化クラスが読み込まれていません');
        console.log('→ webgl-fallback.jsまたはvisualization-3d.jsの読み込みに問題があります');
    } else {
        console.log('✅ 基本的な要素は揃っています');
        console.log('→ 初期化処理で問題が発生している可能性があります');
        console.log('→ 詳細診断（🔬ボタン）を実行して詳細を確認してください');
    }
    
    console.log('🔍 即座チェック完了');
})();
