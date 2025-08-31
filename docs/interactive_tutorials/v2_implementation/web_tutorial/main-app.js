ectors}個`,
                `アニメ: ${vizInfo.isAnimating ? 'ON' : 'OFF'}`
            ].join(' | ');
            objectCountDisplay.textContent = `オブジェクト: ${objectInfo}`;
        }
    }
}

// イベントリスナー設定
function setupEventListeners() {
    console.log('🔗 イベントリスナー設定中...');
    
    // ナビゲーションボタン
    const nextStepBtn = document.getElementById('nextStepBtn');
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', function() {
            if (window.tutorialCore) {
                const moved = window.tutorialCore.nextStep();
                if (!moved && window.tutorialCore.currentStep === window.tutorialCore.totalSteps) {
                    // 完了処理
                    console.log('🎉 チュートリアル完了');
                }
            }
        });
    }
    
    const prevStepBtn = document.getElementById('prevStepBtn');
    if (prevStepBtn) {
        prevStepBtn.addEventListener('click', function() {
            if (window.tutorialCore) {
                window.tutorialCore.prevStep();
            }
        });
    }
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('チュートリアルをリセットしますか？')) {
                if (window.tutorialCore) {
                    window.tutorialCore.reset();
                }
            }
        });
    }

    // JSON操作ボタン
    const executeJsonBtn = document.getElementById('executeJsonBtn');
    if (executeJsonBtn) {
        executeJsonBtn.addEventListener('click', executeJsonCommand);
    }
    
    const validateJsonBtn = document.getElementById('validateJsonBtn');
    if (validateJsonBtn) {
        validateJsonBtn.addEventListener('click', validateJsonCommand);
    }
    
    const clearJsonBtn = document.getElementById('clearJsonBtn');
    if (clearJsonBtn) {
        clearJsonBtn.addEventListener('click', clearJsonCommand);
    }

    // 可視化制御ボタン
    const testDrawBtn = document.getElementById('testDrawBtn');
    if (testDrawBtn) {
        testDrawBtn.addEventListener('click', function() {
            if (window.vizSystem) {
                window.vizSystem.testDraw();
            }
        });
    }
    
    const clearCanvasBtn = document.getElementById('clearCanvasBtn');
    if (clearCanvasBtn) {
        clearCanvasBtn.addEventListener('click', function() {
            if (window.vizSystem) {
                window.vizSystem.clearAll();
            }
        });
    }
    
    const toggle3DBtn = document.getElementById('toggle3DBtn');
    if (toggle3DBtn) {
        toggle3DBtn.addEventListener('click', function() {
            if (window.vizSystem) {
                // 現在は2Dのみなので、3D風表示に切り替える予定
                window.vizSystem.showMessage('3D機能は開発中です', 'warning');
            }
        });
    }
    
    const systemInfoBtn = document.getElementById('systemInfoBtn');
    if (systemInfoBtn) {
        systemInfoBtn.addEventListener('click', showDetailedSystemInfo);
    }

    // リサイズ対応
    window.addEventListener('resize', function() {
        if (window.vizSystem) {
            window.vizSystem.handleResize();
        }
    });
    
    // キーボードショートカット
    document.addEventListener('keydown', function(event) {
        // Ctrl + Enter: JSON実行
        if (event.ctrlKey && event.key === 'Enter') {
            executeJsonCommand();
            event.preventDefault();
        }
        
        // 矢印キー: ステップ移動
        if (event.key === 'ArrowRight' && !event.target.matches('input, textarea')) {
            if (window.tutorialCore) {
                window.tutorialCore.nextStep();
            }
            event.preventDefault();
        }
        
        if (event.key === 'ArrowLeft' && !event.target.matches('input, textarea')) {
            if (window.tutorialCore) {
                window.tutorialCore.prevStep();
            }
            event.preventDefault();
        }
    });
    
    console.log('✅ イベントリスナー設定完了');
}

// JSON実行
function executeJsonCommand() {
    const jsonInput = document.getElementById('jsonInput');
    const jsonOutput = document.getElementById('jsonOutput');
    
    if (!jsonInput || !jsonOutput) {
        console.error('❌ JSON入力・出力要素が見つかりません');
        return;
    }
    
    try {
        const jsonString = jsonInput.value.trim();
        
        if (!jsonString) {
            throw new Error('JSON入力が空です');
        }
        
        // チュートリアルコアでJSON実行
        const result = window.tutorialCore ? 
            window.tutorialCore.executeJsonCommand(jsonString) : 
            { success: false, response: { error: { message: 'チュートリアルシステムが初期化されていません' } } };
        
        // 結果表示
        jsonOutput.textContent = JSON.stringify(result.response, null, 2);
        jsonOutput.className = result.success ? 'output-content success' : 'output-content error';
        
        console.log(result.success ? '✅ JSON実行成功' : '❌ JSON実行失敗');
        
    } catch (error) {
        console.error('❌ JSON実行エラー:', error);
        
        const errorResponse = {
            jsonrpc: "2.0",
            error: {
                code: -32700,
                message: "JSON実行エラー",
                data: error.message
            },
            id: null
        };
        
        jsonOutput.textContent = JSON.stringify(errorResponse, null, 2);
        jsonOutput.className = 'output-content error';
    }
}

// JSON検証
function validateJsonCommand() {
    const jsonInput = document.getElementById('jsonInput');
    const jsonOutput = document.getElementById('jsonOutput');
    
    if (!jsonInput || !jsonOutput) return;
    
    try {
        const jsonString = jsonInput.value.trim();
        
        if (!jsonString) {
            throw new Error('JSON入力が空です');
        }
        
        // チュートリアルコアでJSON検証
        const validation = window.tutorialCore ? 
            window.tutorialCore.validateJsonCommand(jsonString) : 
            { isValid: false, validations: ['チュートリアルシステムが初期化されていません'] };
        
        if (validation.isValid) {
            jsonOutput.textContent = '✅ JSON形式は正しいです\n\n' +
                'バリデーション結果:\n' +
                '• JSON-RPC 2.0形式\n' +
                '• 必須フィールド存在\n' +
                '• メソッド名有効\n' +
                '• パラメータ構造正常';
            jsonOutput.className = 'output-content success';
        } else {
            jsonOutput.textContent = '検証結果:\n' + validation.validations.join('\n');
            jsonOutput.className = 'output-content warning';
        }
        
    } catch (error) {
        jsonOutput.textContent = `❌ JSON検証エラー: ${error.message}`;
        jsonOutput.className = 'output-content error';
    }
}

// JSONクリア
function clearJsonCommand() {
    const jsonInput = document.getElementById('jsonInput');
    const jsonOutput = document.getElementById('jsonOutput');
    
    if (jsonInput) {
        jsonInput.value = '';
    }
    
    if (jsonOutput) {
        jsonOutput.textContent = '結果がここに表示されます...';
        jsonOutput.className = 'output-content';
    }
    
    console.log('🗑️ JSON入力・出力クリア');
}

// 詳細システム情報表示
function showDetailedSystemInfo() {
    const vizInfo = window.vizSystem ? window.vizSystem.getDiagnosticInfo() : {};
    const tutorialInfo = window.tutorialCore ? window.tutorialCore.getDiagnosticInfo() : {};
    
    const detailedInfo = `=== 軽量可視化チュートリアルシステム情報 ===

📊 現在の状態:
• 可視化モード: ${vizInfo.mode || 'Unknown'}
• Canvas2D: ${vizInfo.hasCanvas2D ? '✅ 利用可能' : '❌ 利用不可'}
• アニメーション: ${vizInfo.isAnimating ? '✅ 動作中' : '⏸️ 停止中'}

🎨 可視化オブジェクト:
• 線源: ${vizInfo.sources || 0}個
• 遮蔽体: ${vizInfo.shields || 0}個  
• 検出器: ${vizInfo.detectors || 0}個
• 合計: ${vizInfo.totalObjects || 0}個

🖼️ Canvas情報:
• サイズ: ${vizInfo.canvasSize ? `${vizInfo.canvasSize.width}x${vizInfo.canvasSize.height}` : '未設定'}
• アニメーション時間: ${vizInfo.animationTime || 0}ms

📚 学習進捗:
• 現在のステップ: ${tutorialInfo.currentStep || 0} / ${tutorialInfo.totalSteps || 5}
• 完了ステップ: ${tutorialInfo.completedSteps ? tutorialInfo.completedSteps.length : 0}個
• インタラクション数: ${tutorialInfo.interactions || 0}回
• 進捗率: ${tutorialInfo.completionRate || 0}%
• 学習時間: ${tutorialInfo.duration ? Math.round(tutorialInfo.duration / 1000) : 0}秒

🌐 環境情報:
• ブラウザ: ${navigator.userAgent.split(' ')[0]}
• プラットフォーム: ${navigator.platform}
• 画面解像度: ${screen.width}x${screen.height}
• オンライン: ${navigator.onLine ? 'Yes' : 'No'}
• JavaScript: 有効

💡 操作ガイド:
• "🧪 テスト描画": サンプル描画を確認
• "🚀 実行": JSON-RPC コマンドを実行
• "次のステップ": 段階的学習を進行
• Ctrl+Enter: JSON実行ショートカット
• 矢印キー: ステップ移動

🔧 トラブルシューティング:
• 描画されない → "🧪 テスト描画" を試行
• JSON実行失敗 → "✅ 検証" で構文確認
• アニメーション停止 → ページリロード
• Canvas表示異常 → ブラウザ画面リサイズ

📋 技術仕様:
• システム: 軽量分割アーキテクチャ
• ファイル構成: HTML + CSS + JS (3分割)
• 描画エンジン: Canvas2D + アニメーション
• データ形式: JSON-RPC 2.0準拠
• 応答性: リアルタイム更新対応`;
    
    alert(detailedInfo);
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('❌ グローバルエラー:', event.error);
    
    const messageEl = document.getElementById('visualizationMessage');
    if (messageEl) {
        messageEl.textContent = `エラーが発生しました: ${event.error.message}`;
        messageEl.className = 'viz-message error';
    }
});

// 未処理のPromise拒否をキャッチ
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ 未処理Promise拒否:', event.reason);
    
    const messageEl = document.getElementById('visualizationMessage');
    if (messageEl) {
        messageEl.textContent = `非同期エラー: ${event.reason}`;
        messageEl.className = 'viz-message error';
    }
});

// アプリケーション初期化実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
    initializeApplication();
}

console.log('✅ メインアプリケーション読み込み完了');
