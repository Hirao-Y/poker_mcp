// Tutorial Main - メインの統合クラス
class PokerMCPTutorial {
    constructor() {
        this.core = new PokerMCPTutorialCore();
        this.uiManager = null;
        this.physicsValidator = null;
        this.visualizer = null;
        
        console.log('🚀 PokerMCPTutorial初期化開始...');
        this.initialize();
    }

    async initialize() {
        try {
            console.log('📂 Tutorial初期化プロセス開始...');

            // 1. コアデータ読み込み
            await this.core.loadTutorialData();

            // 2. UI管理システム初期化
            this.initializeUI();

            // 3. 追加機能初期化
            this.initializeAdditionalFeatures();

            // 4. 初期表示
            this.displayInitialStep();

            console.log('✅ PokerMCPTutorial初期化完了');
            
            // 初期化完了イベント発信
            window.tutorialInitialized = true;
            window.dispatchEvent(new CustomEvent('tutorialReady'));

        } catch (error) {
            console.error('❌ Tutorial初期化エラー:', error);
            this.handleInitializationError(error);
        }
    }

    // UI管理システム初期化
    initializeUI() {
        try {
            this.uiManager = new TutorialUIManager(this.core);
            console.log('✅ UI管理システム初期化完了');
        } catch (error) {
            console.error('❌ UI管理システム初期化エラー:', error);
        }
    }

    // 追加機能初期化
    initializeAdditionalFeatures() {
        try {
            // PhysicsValidator初期化
            if (window.PhysicsValidator) {
                this.physicsValidator = new window.PhysicsValidator();
                console.log('✅ PhysicsValidator初期化完了');
            }

            // CrossSectionVisualizer初期化
            if (window.CrossSectionVisualizer && document.getElementById('geometryCanvas')) {
                this.visualizer = new window.CrossSectionVisualizer('geometryCanvas');
                console.log('✅ CrossSectionVisualizer初期化完了');
            }

            // 3D可視化システム初期化
            this.initialize3DVisualization();

        } catch (error) {
            console.error('⚠️ 追加機能初期化エラー:', error);
            // 追加機能のエラーは致命的ではないので継続
        }
    }

    // 3D可視化システム初期化
    async initialize3DVisualization() {
        try {
            // 3D可視化関連クラスが利用可能かチェック
            if (typeof Visualization3DManager !== 'undefined') {
                console.log('🎨 3D可視化システム初期化開始...');
                
                // 3D可視化マネージャー作成
                this.visualization3DManager = new Visualization3DManager('geometryCanvas', this.core);
                
                // 既存のCrossSectionVisualizerに3Dマネージャーを接続
                if (this.visualizer) {
                    this.visualizer.set3DManager(this.visualization3DManager);
                }

                // 3D可視化コントロールパネル作成
                if (typeof VisualizationControlPanel !== 'undefined') {
                    this.visualizationControls = new VisualizationControlPanel(this.visualization3DManager);
                }

                // ステップ変更の監視設定
                this.setupStepChangeListener();

                console.log('✅ 3D可視化システム初期化完了');
            } else {
                console.log('ℹ️ 3D可視化システムは利用不可（2Dモードで継続）');
            }

        } catch (error) {
            console.warn('⚠️ 3D可視化初期化失敗（2Dモードで継続）:', error);
        }
    }

    // ステップ変更監視設定
    setupStepChangeListener() {
        // 既存のnextStep/prevStepメソッドをオーバーライド
        const originalNextStep = this.nextStep.bind(this);
        const originalPrevStep = this.prevStep.bind(this);

        this.nextStep = () => {
            const result = originalNextStep();
            if (result && this.visualization3DManager) {
                this.visualization3DManager.onStepChanged(this.core.currentStep);
            }
            return result;
        };

        this.prevStep = () => {
            const result = originalPrevStep();
            if (result && this.visualization3DManager) {
                this.visualization3DManager.onStepChanged(this.core.currentStep);
            }
            return result;
        };
    }

    // 初期表示
    displayInitialStep() {
        if (this.uiManager) {
            this.uiManager.displayInitialStep();
        } else {
            console.warn('⚠️ UI管理システムが初期化されていません');
        }
    }

    // 初期化エラー処理
    handleInitializationError(error) {
        console.error('🚨 Tutorial初期化失敗:', error);
        
        // エラーメッセージ表示
        const errorMessage = `
            <div style="background: #f8d7da; border: 2px solid #dc3545; padding: 20px; margin: 20px; border-radius: 8px; color: #721c24;">
                <h3>🚨 Tutorial初期化エラー</h3>
                <p><strong>エラー詳細:</strong> ${error.message}</p>
                <p><strong>対処方法:</strong></p>
                <ol>
                    <li>ブラウザをリロード（F5）してください</li>
                    <li>または <a href="tutorial-complete-check.html" target="_blank" style="color: #0066cc;">動作確認システム</a> で診断してください</li>
                    <li>問題が継続する場合は <a href="javascript-loading-fix.html" target="_blank" style="color: #0066cc;">緊急修復システム</a> をお試しください</li>
                </ol>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', errorMessage);
    }

    // 外部からアクセス可能なメソッド
    getCurrentStep() {
        return this.core.currentStep;
    }

    getTotalSteps() {
        return this.core.totalSteps;
    }

    getCurrentStepData() {
        return this.core.updateStepContent();
    }

    getStepHistory() {
        return this.core.getExecutionHistory();
    }

    // 手動でステップ更新
    updateStepContent() {
        return this.core.updateStepContent();
    }

    // 手動で次のステップ
    nextStep() {
        const nextStepData = this.core.nextStep();
        if (nextStepData && this.uiManager) {
            this.uiManager.updateStepUI(nextStepData);
        }
        return nextStepData;
    }

    // 手動で前のステップ
    prevStep() {
        const prevStepData = this.core.prevStep();
        if (prevStepData && this.uiManager) {
            this.uiManager.updateStepUI(prevStepData);
        }
        return prevStepData;
    }

    // ステップデータのプロパティ（下位互換性のため）
    get tutorialSteps() {
        return this.core.tutorialSteps;
    }

    get currentStep() {
        return this.core.currentStep;
    }

    set currentStep(value) {
        this.core.currentStep = value;
    }

    get totalSteps() {
        return this.core.totalSteps;
    }

    get stepExecutionHistory() {
        return this.core.stepExecutionHistory;
    }
}

// グローバル登録
window.PokerMCPTutorial = PokerMCPTutorial;
window.Tutorial = PokerMCPTutorial;  // エイリアス

console.log('✅ PokerMCPTutorial読み込み完了');

// DOM読み込み完了後に自動初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM読み込み完了 - Tutorial自動初期化開始');
    
    try {
        // 既存のtutorialオブジェクトがない場合のみ作成
        if (!window.tutorial) {
            window.tutorial = new PokerMCPTutorial();
        }
    } catch (error) {
        console.error('❌ Tutorial自動初期化エラー:', error);
        
        // 遅延初期化を試行
        setTimeout(() => {
            try {
                if (!window.tutorial) {
                    console.log('🔄 Tutorial遅延初期化試行...');
                    window.tutorial = new PokerMCPTutorial();
                }
            } catch (retryError) {
                console.error('❌ Tutorial遅延初期化も失敗:', retryError);
            }
        }, 2000);
    }
});
