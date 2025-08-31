// Tutorial UI Manager - UI操作とDOM更新を担当
class TutorialUIManager {
    constructor(tutorialCore) {
        this.core = tutorialCore;
        this.elements = {};
        
        console.log('🎨 TutorialUIManager初期化開始...');
        this.initializeElements();
        this.setupEventListeners();
    }

    // DOM要素を取得
    initializeElements() {
        this.elements = {
            // ヘッダー要素
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            
            // ステップ要素
            stepBadge: document.getElementById('stepBadge'),
            stepTitle: document.getElementById('stepTitle'),
            physicsExplanation: document.getElementById('physicsExplanation'),
            stepInstructions: document.getElementById('stepInstructions'),
            
            // エディタとボタン
            jsonEditor: document.getElementById('jsonEditor'),
            executeBtn: document.getElementById('executeBtn'),
            validateBtn: document.getElementById('validateBtn'),
            nextStepBtn: document.getElementById('nextStepBtn'),
            prevStepBtn: document.getElementById('prevStepBtn'),
            
            // 結果表示
            responseArea: document.getElementById('responseArea'),
            
            // ヒント・達成
            hintsContainer: document.getElementById('hintsContainer'),
            achievementArea: document.getElementById('achievementArea'),
            
            // 可視化
            geometryCanvas: document.getElementById('geometryCanvas'),
            toggleVisualization: document.getElementById('toggleVisualization')
        };

        // 要素の存在確認
        const missingElements = [];
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                missingElements.push(key);
            }
        }

        if (missingElements.length > 0) {
            console.warn('⚠️ 見つからないDOM要素:', missingElements);
        } else {
            console.log('✅ 全DOM要素を取得完了');
        }
    }

    // イベントリスナーを設定
    setupEventListeners() {
        try {
            // 実行ボタン
            if (this.elements.executeBtn) {
                this.elements.executeBtn.addEventListener('click', () => this.executeCurrentStep());
            }

            // 検証ボタン
            if (this.elements.validateBtn) {
                this.elements.validateBtn.addEventListener('click', () => this.validateJSON());
            }

            // ナビゲーションボタン
            if (this.elements.nextStepBtn) {
                this.elements.nextStepBtn.addEventListener('click', () => this.goToNextStep());
            }

            if (this.elements.prevStepBtn) {
                this.elements.prevStepBtn.addEventListener('click', () => this.goToPrevStep());
            }

            // 可視化トグル
            if (this.elements.toggleVisualization) {
                this.elements.toggleVisualization.addEventListener('click', () => this.toggleVisualization());
            }

            console.log('✅ イベントリスナー設定完了');

        } catch (error) {
            console.error('❌ イベントリスナー設定エラー:', error);
        }
    }

    // ステップUIを更新
    updateStepUI(stepData) {
        try {
            if (!stepData) {
                console.warn('⚠️ stepDataがnullです');
                return;
            }

            // プログレスバー更新
            this.updateProgress();

            // ステップ情報更新
            if (this.elements.stepBadge) {
                this.elements.stepBadge.textContent = `Step ${this.core.currentStep}`;
            }

            if (this.elements.stepTitle) {
                this.elements.stepTitle.textContent = stepData.title || 'タイトル未設定';
            }

            if (this.elements.physicsExplanation) {
                this.elements.physicsExplanation.textContent = stepData.physics_background || '';
            }

            if (this.elements.stepInstructions) {
                this.elements.stepInstructions.textContent = stepData.instructions || '';
            }

            // JSONエディタ更新
            if (this.elements.jsonEditor && stepData.template) {
                this.elements.jsonEditor.value = stepData.template;
                
                // 構文ハイライト更新（Prismが利用可能な場合）
                if (typeof Prism !== 'undefined') {
                    setTimeout(() => {
                        Prism.highlightAll();
                    }, 100);
                }
            }

            // ヒント表示
            this.displayHints(stepData.hints);

            // ナビゲーションボタン状態更新
            this.updateNavigationButtons();

            console.log(`✅ Step ${this.core.currentStep} UI更新完了`);

        } catch (error) {
            console.error('❌ updateStepUI エラー:', error);
        }
    }

    // プログレスバー更新
    updateProgress() {
        if (this.elements.progressFill && this.elements.progressText) {
            const percentage = (this.core.currentStep / this.core.totalSteps) * 100;
            this.elements.progressFill.style.width = `${percentage}%`;
            this.elements.progressText.textContent = `Step ${this.core.currentStep} / ${this.core.totalSteps}`;
        }
    }

    // ヒント表示
    displayHints(hints) {
        if (!this.elements.hintsContainer || !hints || hints.length === 0) {
            return;
        }

        const hintsHTML = hints.map(hint => 
            `<div class="hint-item">${hint}</div>`
        ).join('');

        this.elements.hintsContainer.innerHTML = `
            <h4>💡 ヒント</h4>
            ${hintsHTML}
        `;
    }

    // ナビゲーションボタン状態更新
    updateNavigationButtons() {
        if (this.elements.prevStepBtn) {
            this.elements.prevStepBtn.disabled = (this.core.currentStep <= 1);
        }

        if (this.elements.nextStepBtn) {
            this.elements.nextStepBtn.disabled = (this.core.currentStep >= this.core.totalSteps);
        }
    }

    // 現在のステップを実行
    async executeCurrentStep() {
        try {
            const jsonContent = this.elements.jsonEditor?.value;
            if (!jsonContent) {
                this.showResponse('JSONコンテンツが空です', 'error');
                return;
            }

            // 実行中表示
            this.showResponse('実行中...', 'info');
            if (this.elements.executeBtn) {
                this.elements.executeBtn.disabled = true;
                this.elements.executeBtn.textContent = '実行中...';
            }

            // JSON検証
            let parsedJSON;
            try {
                parsedJSON = JSON.parse(jsonContent);
            } catch (parseError) {
                this.showResponse(`JSON構文エラー: ${parseError.message}`, 'error');
                return;
            }

            // MCP API実行（模擬）
            const response = await this.executeMCPRequest(parsedJSON);
            
            // 結果表示
            this.showResponse(JSON.stringify(response, null, 2), response.error ? 'error' : 'success');

            // 履歴記録
            this.core.addExecutionHistory(this.core.currentStep, parsedJSON, response);

            // 成功時の達成表示
            if (!response.error) {
                this.showAchievement();
            }

        } catch (error) {
            console.error('❌ executeCurrentStep エラー:', error);
            this.showResponse(`実行エラー: ${error.message}`, 'error');

        } finally {
            // ボタン状態復元
            if (this.elements.executeBtn) {
                this.elements.executeBtn.disabled = false;
                this.elements.executeBtn.textContent = '🚀 実行';
            }
        }
    }

    // MCP APIリクエスト実行（模擬）
    async executeMCPRequest(jsonData) {
        // 実際のAPIが利用できない場合の模擬レスポンス
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    jsonrpc: "2.0",
                    result: {
                        success: true,
                        message: `${jsonData.method} の実行が完了しました`,
                        timestamp: new Date().toISOString()
                    }
                });
            }, 1000);
        });
    }

    // JSON検証
    validateJSON() {
        try {
            const jsonContent = this.elements.jsonEditor?.value;
            if (!jsonContent) {
                this.showResponse('JSONコンテンツが空です', 'warning');
                return;
            }

            // PhysicsValidatorを使用（利用可能な場合）
            if (window.PhysicsValidator) {
                const validator = new window.PhysicsValidator();
                const result = validator.validateJSON(jsonContent);
                
                this.showResponse(
                    `検証結果: ${result.message}${result.details ? '\n' + result.details : ''}`,
                    result.valid ? 'success' : 'error'
                );
            } else {
                // 基本的なJSON構文チェック
                JSON.parse(jsonContent);
                this.showResponse('JSON構文は正常です', 'success');
            }

        } catch (error) {
            this.showResponse(`JSON検証エラー: ${error.message}`, 'error');
        }
    }

    // 次のステップに進む
    goToNextStep() {
        const nextStepData = this.core.nextStep();
        if (nextStepData) {
            this.updateStepUI(nextStepData);
        }
    }

    // 前のステップに戻る
    goToPrevStep() {
        const prevStepData = this.core.prevStep();
        if (prevStepData) {
            this.updateStepUI(prevStepData);
        }
    }

    // レスポンス表示
    showResponse(message, type = 'info') {
        if (!this.elements.responseArea) return;

        this.elements.responseArea.textContent = message;
        this.elements.responseArea.className = `response-area ${type}`;

        // 自動スクロール
        this.elements.responseArea.scrollTop = this.elements.responseArea.scrollHeight;
    }

    // 達成バッジ表示
    showAchievement() {
        const stepData = this.core.updateStepContent();
        if (!stepData || !stepData.achievement) return;

        if (this.elements.achievementArea) {
            this.elements.achievementArea.innerHTML = `
                <div class="achievement-badge">
                    🏆 ${stepData.achievement}
                </div>
                <p>${stepData.completion_message}</p>
            `;

            // 一定時間後にフェードアウト
            setTimeout(() => {
                if (this.elements.achievementArea) {
                    this.elements.achievementArea.style.opacity = '0.7';
                }
            }, 3000);
        }
    }

    // 可視化トグル
    toggleVisualization() {
        const canvas = this.elements.geometryCanvas;
        if (!canvas) return;

        const isVisible = canvas.style.display !== 'none';
        canvas.style.display = isVisible ? 'none' : 'block';
        
        if (this.elements.toggleVisualization) {
            this.elements.toggleVisualization.textContent = isVisible ? '🎨 可視化表示' : '🎨 可視化非表示';
        }
    }

    // 初期表示
    displayInitialStep() {
        const initialStep = this.core.updateStepContent();
        if (initialStep) {
            this.updateStepUI(initialStep);
        }
    }
}

// グローバル登録
window.TutorialUIManager = TutorialUIManager;
console.log('✅ TutorialUIManager読み込み完了');
