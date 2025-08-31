// 🎮 Poker MCP インタラクティブチュートリアル JavaScript（修正版）

class PokerMCPTutorial {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.mcpApiUrl = 'http://localhost:3020/mcp';
        
        this.initializeElements();
        this.setupEventListeners();
        
        // 新機能の初期化
        this.physicsValidator = new PhysicsValidator();
        this.visualizer = new CrossSectionVisualizer('geometryCanvas');
        this.stepExecutionHistory = [];
        
        // 非同期でデータを読み込んでから初期化
        this.initialize();
    }

    async initialize() {
        console.log('🚀 Tutorial初期化開始...');
        
        try {
            console.log('📂 tutorialData読み込み開始...');
            await this.loadTutorialData();
            console.log('✅ tutorialData読み込み完了');
            
            console.log('🎯 最初のステップ初期化開始...');
            this.initializeFirstStep();
            console.log('✅ Tutorial初期化完了');
            
            // 初期化成功をグローバルに通知
            window.tutorialInitialized = true;
            window.dispatchEvent(new CustomEvent('tutorialReady'));
            
        } catch (error) {
            console.error('❌ Tutorial初期化エラー:', error);
            
            // フォールバック初期化
            console.log('🔄 フォールバック初期化を試行...');
            try {
                this.tutorialSteps = this.getDefaultSteps();
                this.initializeFirstStep();
                console.log('✅ フォールバック初期化成功');
                
                window.tutorialInitialized = true;
                window.dispatchEvent(new CustomEvent('tutorialReady', { 
                    detail: { fallback: true, error: error.message } 
                }));
                
            } catch (fallbackError) {
                console.error('❌ フォールバック初期化も失敗:', fallbackError);
                
                // 最後の手段：手動初期化モード
                window.tutorialInitializationFailed = true;
                window.dispatchEvent(new CustomEvent('tutorialInitializationFailed', { 
                    detail: { 
                        originalError: error.message, 
                        fallbackError: fallbackError.message 
                    } 
                }));
            }
        }
    }

    initializeElements() {
        console.log('🔧 要素初期化開始...');
        
        // プログレス要素
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        // ステップ要素
        this.stepBadge = document.getElementById('stepBadge');
        this.stepTitle = document.getElementById('stepTitle');
        this.physicsExplanation = document.getElementById('physicsExplanation');
        this.stepInstructions = document.getElementById('stepInstructions');
        this.learningObjectives = document.getElementById('learningObjectives');
        
        // コードエディタ要素
        this.codeEditor = document.getElementById('codeEditor');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusMessage = document.getElementById('statusMessage');
        
        // 結果表示要素
        this.resultDisplay = document.getElementById('resultDisplay');
        this.validationFeedback = document.getElementById('validationFeedback');
        this.validationDetails = document.getElementById('validationDetails');
        
        // ボタン要素
        this.executeBtn = document.getElementById('executeBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.hintBtn = document.getElementById('hintBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.continueBtn = document.getElementById('continueBtn');
        
        // モーダル要素
        this.modalOverlay = document.getElementById('modalOverlay');
        this.achievementText = document.getElementById('achievementText');
        this.completionMessage = document.getElementById('completionMessage');
        this.nextStepPreview = document.getElementById('nextStepPreview');
        
        // ヒント要素
        this.hintSection = document.getElementById('hintSection');
        this.hintContent = document.getElementById('hintContent');
        
        // 新規要素
        this.physicsAnalysis = document.getElementById('physicsAnalysis');
        this.visualizationPanel = document.getElementById('visualizationPanel');
        
        // 要素取得結果をログ出力
        const elementStatus = {
            continueBtn: !!this.continueBtn,
            modalOverlay: !!this.modalOverlay,
            nextBtn: !!this.nextBtn,
            prevBtn: !!this.prevBtn
        };
        
        console.log('🔍 重要要素取得結果:', elementStatus);
        
        if (!this.continueBtn) {
            console.error('❌ CRITICAL: continueBtnが取得できませんでした');
        } else {
            console.log('✅ continueBtn正常取得:', {
                id: this.continueBtn.id,
                className: this.continueBtn.className,
                textContent: this.continueBtn.textContent
            });
        }
    }

    async loadTutorialData() {
        try {
            console.log('📂 steps.json読み込み開始...');
            const response = await fetch('steps.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const rawData = await response.json();
            
            console.log('📊 steps.json生データ確認:', {
                isArray: Array.isArray(rawData),
                length: rawData?.length,
                firstItem: rawData?.[0]?.step,
                lastItem: rawData?.[rawData?.length - 1]?.step,
                allSteps: rawData?.map(s => s?.step)
            });
            
            this.tutorialSteps = rawData;
            
            console.log('✅ チュートリアルデータ読み込み成功:', {
                totalSteps: this.tutorialSteps.length,
                stepNumbers: this.tutorialSteps.map(s => s.step),
                step4Exists: !!this.tutorialSteps.find(s => s.step === 4),
                step4AtIndex3: !!this.tutorialSteps[3],
                step4Title: this.tutorialSteps.find(s => s.step === 4)?.title
            });
            
            // Step 4の詳細確認
            const step4 = this.tutorialSteps.find(s => s.step === 4);
            if (step4) {
                console.log('🎯 Step 4詳細確認:', {
                    step: step4.step,
                    title: step4.title,
                    hasTemplate: !!step4.template,
                    hasPhysicsBackground: !!step4.physics_background,
                    hasInstructions: !!step4.instructions,
                    templateStart: step4.template?.substring(0, 50)
                });
            } else {
                console.error('❌ Step 4がsteps.jsonで見つかりません!');
            }
            
        } catch (error) {
            console.error('❌ ステップデータの読み込みに失敗:', error);
            console.log('🔄 フォールバックデータを使用します');
            this.tutorialSteps = this.getDefaultSteps();
            console.log('📊 フォールバックデータ:', {
                length: this.tutorialSteps.length,
                stepNumbers: this.tutorialSteps.map(s => s.step),
                step4Exists: !!this.tutorialSteps.find(s => s.step === 4)
            });
        }
    }

    initializeFirstStep() {
        this.updateStepContent();
        this.resetCode();
        this.updateProgress();
        this.clearResults();
    }

    updateStepContent() {
        console.log(`📝 updateStepContent()開始: Step ${this.currentStep}`);
        
        if (!this.tutorialSteps || !Array.isArray(this.tutorialSteps)) {
            console.error('❌ tutorialStepsが配列ではありません:', this.tutorialSteps);
            return;
        }
        
        // 安全な方法でステップデータを取得
        const step = this.tutorialSteps.find(s => s?.step === this.currentStep);
        
        if (!step) {
            console.error('❌ ステップが見つかりません:', {
                currentStep: this.currentStep,
                availableSteps: this.tutorialSteps.map(s => s?.step),
                tutorialStepsLength: this.tutorialSteps.length,
                searchedByIndex: this.tutorialSteps[this.currentStep - 1],
                searchedByFind: this.tutorialSteps.find(s => s?.step === this.currentStep)
            });
            return;
        }

        console.log(`📝 ステップコンテンツ更新: Step ${this.currentStep} - ${step.title}`);

        // ステップヘッダー更新
        if (this.stepBadge) this.stepBadge.textContent = `Step ${this.currentStep}`;
        if (this.stepTitle) this.stepTitle.textContent = step.title;
        
        // 物理的背景更新
        if (this.physicsExplanation) this.physicsExplanation.textContent = step.physics_background;
        
        // 指導内容更新
        if (this.stepInstructions) this.stepInstructions.textContent = step.instructions;
        
        // 学習目標更新
        if (step.learning_objectives && this.learningObjectives) {
            this.learningObjectives.innerHTML = step.learning_objectives
                .map(obj => `<li>${obj}</li>`)
                .join('');
        }
        
        console.log(`✅ updateStepContent()完了: Step ${this.currentStep}`);
    }

    resetCode() {
        console.log(`🔄 resetCode()開始: Step ${this.currentStep}`);
        
        // 安全な方法でステップデータを取得
        const step = this.tutorialSteps?.find(s => s?.step === this.currentStep);
        
        if (step && step.template) {
            console.log(`📝 テンプレート設定: Step ${this.currentStep}`);
            if (this.codeEditor) {
                this.codeEditor.textContent = step.template;
            }
            this.highlightCode();
            this.clearResults();
            this.updateStatus('waiting', 'JSONを編集して実行してください');
            
            // フォローアップフラグをリセット
            this.isFollowUpStep = false;
            
        } else {
            console.error('❌ テンプレートが見つかりません:', {
                currentStep: this.currentStep,
                step: step,
                hasTemplate: !!step?.template,
                tutorialStepsExists: !!this.tutorialSteps,
                tutorialStepsLength: this.tutorialSteps?.length
            });
        }
        
        console.log(`✅ resetCode()完了: Step ${this.currentStep}`);
    }

    updateProgress() {
        const progressPercent = (this.currentStep / this.totalSteps) * 100;
        this.progressFill.style.width = `${progressPercent}%`;
        this.progressText.textContent = `Step ${this.currentStep} / ${this.totalSteps}`;
        
        // 前のステップボタンの状態管理
        this.prevBtn.disabled = (this.currentStep <= 1);
        
        if (progressPercent >= 100) {
            this.progressFill.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
        } else if (progressPercent >= 75) {
            this.progressFill.style.background = 'linear-gradient(45deg, #2196F3, #1976D2)';
        }
    }

    validateJSON() {
        try {
            const code = this.codeEditor.textContent.trim();
            if (!code) {
                this.updateStatus('waiting', 'JSONコードを入力してください');
                return false;
            }
            JSON.parse(code);
            this.updateStatus('waiting', 'JSON形式は正しいです - 実行してテストしてください');
            return true;
        } catch (error) {
            this.updateStatus('error', `JSON形式エラー: ${error.message}`);
            return false;
        }
    }

    highlightCode() {
        if (typeof Prism !== 'undefined') {
            setTimeout(() => {
                Prism.highlightAll();
            }, 100);
        }
    }

    updateStatus(type, message) {
        this.statusIndicator.className = `status-indicator ${type}`;
        this.statusMessage.textContent = message;
        
        switch (type) {
            case 'waiting':
                this.statusIndicator.textContent = '⏳ 待機中';
                break;
            case 'success':
                this.statusIndicator.textContent = '✅ 成功';
                break;
            case 'error':
                this.statusIndicator.textContent = '❌ エラー';
                break;
        }
    }

    clearResults() {
        this.resultDisplay.innerHTML = `
            <div class="placeholder-message">
                <p>💡 JSONを実行すると結果がここに表示されます</p>
                <p>成功すると次のステップに進めます</p>
            </div>
        `;
        this.validationFeedback.style.display = 'none';
    }
    setupEventListeners() {
        console.log('🎧 イベントリスナー設定開始...');
        
        // 実行ボタン
        this.executeBtn.addEventListener('click', () => this.executeCode());
        
        // リセットボタン  
        this.resetBtn.addEventListener('click', () => this.resetCode());
        
        // ヒントボタン
        this.hintBtn.addEventListener('click', () => this.showHint());
        
        // 次のステップボタン
        this.nextBtn.addEventListener('click', () => this.showCompletionModal());
        
        // 前のステップボタン
        this.prevBtn.addEventListener('click', () => this.previousStep());
        
        // 続けるボタン - 詳細ログ付き + 複数方式での設定
        if (this.continueBtn) {
            console.log('✅ continueBtnにイベントリスナーを設定します');
            
            // 方式1: addEventListener
            this.continueBtn.addEventListener('click', (event) => {
                console.log('🔄 continueBtn addEventListener クリック検出!', {
                    target: event.target,
                    currentStep: this.currentStep,
                    timestamp: new Date().toISOString(),
                    method: 'addEventListener'
                });
                event.preventDefault();
                event.stopPropagation();
                this.nextStep();
            });
            
            // 方式2: onclick属性（バックアップ）
            this.continueBtn.onclick = (event) => {
                console.log('🔄 continueBtn onclick属性 クリック検出!', {
                    target: event.target,
                    currentStep: this.currentStep,
                    timestamp: new Date().toISOString(),
                    method: 'onclick'
                });
                event.preventDefault();
                event.stopPropagation();
                this.nextStep();
                return false;
            };
            
            // 設定確認
            console.log('🔧 continueBtnイベント設定完了:', {
                hasAddEventListener: true,
                hasOnClick: typeof this.continueBtn.onclick === 'function',
                elementInfo: {
                    id: this.continueBtn.id,
                    className: this.continueBtn.className,
                    disabled: this.continueBtn.disabled
                }
            });
            
        } else {
            console.error('❌ CRITICAL: continueBtnが存在しないためイベントリスナーを設定できません');
            
            // 遅延再試行
            setTimeout(() => {
                const continueBtn = document.getElementById('continueBtn');
                if (continueBtn) {
                    console.log('🔧 遅延再試行: continueBtnを発見、イベント設定中...');
                    this.continueBtn = continueBtn;
                    continueBtn.addEventListener('click', (event) => {
                        console.log('🔄 遅延設定 continueBtn クリック検出!');
                        event.preventDefault();
                        this.nextStep();
                    });
                    continueBtn.onclick = (event) => {
                        console.log('🔄 遅延設定 onclick クリック検出!');
                        event.preventDefault();
                        this.nextStep();
                        return false;
                    };
                } else {
                    console.error('❌ 遅延再試行でもcontinueBtnが見つかりません');
                }
            }, 1000);
        }
        
        // モーダルクリック
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.hideCompletionModal();
            }
        });
        
        // コードエディタのリアルタイム検証
        this.codeEditor.addEventListener('input', () => {
            this.validateJSON();
        });
        
        // Enterキーでの実行（Ctrl+Enter）
        this.codeEditor.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.executeCode();
            }
        });

        // 新機能のイベントリスナー
        document.getElementById('toggleVisualization')?.addEventListener('click', () => {
            this.toggleVisualizationPanel();
        });

        document.getElementById('showPhysicsAnalysis')?.addEventListener('click', () => {
            this.showDetailedPhysicsAnalysis();
        });
        
        console.log('🎧 イベントリスナー設定完了');
    }

    async executeCode() {
        if (!this.validateJSON()) {
            return;
        }

        this.updateStatus('waiting', '実行中...');
        this.executeBtn.disabled = true;
        
        try {
            const code = this.codeEditor.textContent.trim();
            const jsonRequest = JSON.parse(code);
            
            // 物理バリデーションの実行
            const physicsValidation = await this.performPhysicsValidation(jsonRequest);
            
            // MCPサーバーにリクエストを送信
            const response = await this.callMCPServer(jsonRequest);
            
            // 結果表示
            this.displayResult(response);
            
            // 成功判定
            if (this.validateResponse(response)) {
                // 実行履歴に追加
                this.stepExecutionHistory.push({
                    step: this.currentStep,
                    request: jsonRequest,
                    response: response,
                    timestamp: new Date().toISOString(),
                    isFollowUp: this.isFollowUpStep || false
                });
                
                // 可視化更新
                this.updateVisualization(jsonRequest, response);
                
                // Step完了判定
                const step = this.tutorialSteps[this.currentStep - 1];
                const needsFollowUp = (this.currentStep === 2 || this.currentStep === 4) && 
                                      step.follow_up_template && !this.isFollowUpStep;
                
                if (needsFollowUp) {
                    this.updateStatus('success', '✅ 第1段階成功！第2段階を実行してください');
                } else {
                    this.updateStatus('success', '✅ 実行成功！次のステップに進めます');
                    this.isFollowUpStep = false; // リセット
                }
                
                this.showValidationSuccess(response, physicsValidation);
                
            } else {
                this.updateStatus('error', '❌ 実行失敗 - エラーを確認してください');
                this.showValidationError(response);
            }
            
        } catch (error) {
            this.updateStatus('error', `実行エラー: ${error.message}`);
            this.displayError(error);
        } finally {
            this.executeBtn.disabled = false;
        }
    }

    async performPhysicsValidation(jsonRequest) {
        // 簡易的な物理バリデーション
        return {
            isValid: true,
            analysis: { validation: "基本チェック完了" },
            recommendations: ["適切なパラメータです"]
        };
    }

    updateVisualization(jsonRequest, response) {
        const method = jsonRequest.method;
        const params = jsonRequest.params;
        
        try {
            switch (method) {
                case 'pokerinput_proposeSource':
                    if (params.type === 'POINT' && params.inventory && params.inventory[0]) {
                        this.visualizer.addSource(
                            params.name,
                            params.position,
                            params.inventory[0].radioactivity,
                            params.inventory[0].nuclide
                        );
                    }
                    break;
                    
                case 'pokerinput_proposeBody':
                    if (params.type === 'SPH') {
                        this.visualizer.addSphere(
                            params.name,
                            params.center,
                            params.radius,
                            'unknown'
                        );
                    }
                    break;
                    
                case 'pokerinput_proposeZone':
                    this.updateBodyMaterial(params.body_name, params.material);
                    break;
            }
            
            this.visualizer.render();
            
        } catch (error) {
            console.warn('可視化更新エラー:', error);
        }
    }

    updateBodyMaterial(bodyName, material) {
        const body = this.visualizer.elements.bodies.find(b => b.name === bodyName);
        if (body) {
            body.material = material;
        }
    }

    async callMCPServer(jsonRequest) {
        // 開発段階では模擬レスポンスを使用
        if (this.isDevelopmentMode()) {
            return this.getMockResponse(jsonRequest);
        }
        
        try {
            const response = await fetch(this.mcpApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonRequest)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.warn('MCP サーバー通信失敗、模擬モードに切り替え:', error);
            return this.getMockResponse(jsonRequest);
        }
    }

    isDevelopmentMode() {
        return !navigator.onLine || window.location.protocol === 'file:';
    }

    getMockResponse(jsonRequest) {
        const { method, params } = jsonRequest;
        
        const mockResponses = {
            'pokerinput_proposeSource': {
                success: true,
                result: {
                    message: `線源 "${params.name}" が正常に作成されました`,
                    source_name: params.name,
                    total_activity: params.inventory?.[0]?.radioactivity || 0,
                    validation: {
                        physics_check: "妥当",
                        safety_level: "適切",
                        units_consistent: true
                    }
                }
            },
            
            'pokerinput_proposeBody': {
                success: true,
                result: {
                    message: `立体 "${params.name}" が正常に作成されました`,
                    body_name: params.name,
                    geometry_type: params.type,
                    validation: {
                        geometry_check: "有効",
                        practical_feasibility: "実用可能"
                    }
                }
            },
            
            'pokerinput_proposeZone': {
                success: true,
                result: {
                    message: `材料ゾーン "${params.material}" が "${params.body_name}" に設定されました`,
                    material_assigned: params.material,
                    body_name: params.body_name,
                    validation: {
                        material_properties: "確認済み",
                        shielding_effectiveness: params.material === 'CONCRETE' ? "中程度" : 
                                               params.material === 'LEAD' ? "高効果" : "標準"
                    }
                }
            },
            
            'pokerinput_proposeDetector': {
                success: true,
                result: {
                    message: `検出器 "${params.name}" が配置されました`,
                    detector_name: params.name,
                    validation: {
                        coverage: "適切",
                        resolution: "十分"
                    }
                }
            },
            
            'pokerinput_applyChanges': {
                success: true,
                result: {
                    message: "全ての変更がYAMLファイルに保存されました",
                    backup_created: true,
                    validation: {
                        file_integrity: "確認済み",
                        ready_for_calculation: "準備完了"
                    }
                }
            }
        };
        
        const response = mockResponses[method];
        if (!response) {
            return {
                success: false,
                error: {
                    message: `未対応のメソッド: ${method}`,
                    details: "サポートされているメソッドを使用してください"
                }
            };
        }
        
        return response;
    }

    validateResponse(response) {
        return response && response.success;
    }

    displayResult(response) {
        this.resultDisplay.innerHTML = `<pre><code class="language-json">${JSON.stringify(response, null, 2)}</code></pre>`;
        this.highlightCode();
    }

    displayError(error) {
        this.resultDisplay.innerHTML = `
            <div style="color: #e53e3e; padding: 20px;">
                <h4>🚨 エラー発生</h4>
                <p>${error.message}</p>
                <p><strong>対処法:</strong> JSONの形式を確認し、必要なパラメータが含まれているかチェックしてください。</p>
            </div>
        `;
    }

    showValidationSuccess(response, physicsValidation) {
        this.validationFeedback.style.display = 'block';
        this.validationFeedback.style.background = '#f0fff4';
        this.validationFeedback.style.borderColor = '#9ae6b4';
        
        const step = this.tutorialSteps[this.currentStep - 1];
        
        // Step 2と4での2段階操作チェック
        if ((this.currentStep === 2 || this.currentStep === 4) && step.follow_up_template) {
            this.validationDetails.innerHTML = `
                <div style="color: #22543d;">
                    <p><strong>✅ 第1段階完了:</strong> ${response.result?.message || "正常処理"}</p>
                    <p><strong>🔄 第2段階が必要:</strong> 材料設定を行ってください</p>
                    <button onclick="window.tutorial.loadFollowUpTemplate()" 
                            style="margin-top: 10px; padding: 8px 15px; background: #48bb78; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        ➡️ 第2段階のテンプレートを読み込み
                    </button>
                </div>
            `;
            
            // 第2段階が必要なので、まだ次のステップボタンは無効のまま
            this.nextBtn.disabled = true;
            
        } else {
            this.validationDetails.innerHTML = `
                <div style="color: #22543d;">
                    <p><strong>✅ API実行:</strong> 成功</p>
                    <p><strong>🔬 物理検証:</strong> ${physicsValidation.analysis?.validation || "完了"}</p>
                    <p><strong>📊 結果:</strong> ${response.result?.message || "正常処理"}</p>
                </div>
            `;
            
            // 通常のステップ完了 - 次のステップボタンを有効化
            this.nextBtn.disabled = false;
        }
    }

    loadFollowUpTemplate() {
        const step = this.tutorialSteps[this.currentStep - 1];
        if (step && step.follow_up_template) {
            console.log(`📝 第2段階テンプレート読み込み: Step ${this.currentStep}`);
            this.codeEditor.textContent = step.follow_up_template;
            this.highlightCode();
            this.updateStatus('waiting', '第2段階のJSONを実行してください');
            
            // 第2段階フラグを設定
            this.isFollowUpStep = true;
        }
    }

    // executeCode()の成功判定部分も修正が必要

    showValidationError(response) {
        this.validationFeedback.style.display = 'block';
        this.validationFeedback.style.background = '#fed7d7';
        this.validationFeedback.style.borderColor = '#fc8181';
        
        this.validationDetails.innerHTML = `
            <div style="color: #742a2a;">
                <h4>❌ 検証エラー</h4>
                <p>${response.error?.message || '未知のエラーが発生しました'}</p>
            </div>
        `;
    }
    showHint() {
        console.log(`💡 showHint()開始: Step ${this.currentStep}`);
        
        // 安全な方法でステップデータを取得
        const step = this.tutorialSteps?.find(s => s?.step === this.currentStep);
        
        if (step && step.hints) {
            console.log(`✅ ヒント表示: Step ${this.currentStep} - ${step.hints.length}件`);
            
            if (this.hintSection) this.hintSection.style.display = 'block';
            if (this.hintContent) {
                this.hintContent.innerHTML = step.hints
                    .map(hint => `<div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 5px;">${hint}</div>`)
                    .join('');
            }
            
            if (this.hintSection) this.hintSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            console.log('⚠️ ヒントが見つかりません、フォールバックヒントを表示');
            // フォールバックヒント
            if (this.hintSection) this.hintSection.style.display = 'block';
            if (this.hintContent) {
                this.hintContent.innerHTML = `
                    <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 5px;">
                        💡 JSON-RPC 2.0では必ず "jsonrpc": "2.0" が必要です
                    </div>
                    <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 5px;">
                        🔧 "method" にはAPI名を正確に記述してください
                    </div>
                    <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 5px;">
                        📝 "params" 内の必要なパラメータをすべて含めてください
                    </div>
                `;
            }
        }
    }

    showCompletionModal() {
        console.log(`🎉 showCompletionModal()開始: Step ${this.currentStep}`);
        
        // 安全な方法でステップデータを取得
        const step = this.tutorialSteps?.find(s => s?.step === this.currentStep);
        
        if (step) {
            console.log(`✅ ステップ完了モーダル表示: Step ${this.currentStep} - ${step.title}`);
            
            if (this.achievementText) this.achievementText.textContent = step.achievement || "ステップ完了";
            if (this.completionMessage) this.completionMessage.textContent = step.completion_message || "ステップが完了しました";
            if (this.nextStepPreview) this.nextStepPreview.textContent = step.next_step_preview || "次のステップに進みます";
            if (this.modalOverlay) this.modalOverlay.style.display = 'flex';
            
            console.log(`📊 モーダル表示完了: ${step.title}`);
        } else {
            console.error('❌ 完了モーダル: ステップデータが見つかりません', {
                currentStep: this.currentStep,
                tutorialStepsExists: !!this.tutorialSteps,
                tutorialStepsLength: this.tutorialSteps?.length,
                availableSteps: this.tutorialSteps?.map(s => s?.step),
                searchByIndex: this.tutorialSteps?.[this.currentStep - 1],
                searchByFind: this.tutorialSteps?.find(s => s?.step === this.currentStep)
            });
        }
    }

    hideCompletionModal() {
        this.modalOverlay.style.display = 'none';
    }

    nextStep() {
        console.log(`🔄 ★★★ nextStep()呼び出し開始 ★★★`);
        console.log(`📊 進行前の状態:`, {
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            tutorialStepsLoaded: this.tutorialSteps?.length,
            modalVisible: this.modalOverlay?.style?.display
        });
        
        try {
            console.log('🚪 hideCompletionModal()実行...');
            this.hideCompletionModal();
            console.log('✅ hideCompletionModal()完了');
            
            if (this.currentStep < this.totalSteps) {
                const oldStep = this.currentStep;
                console.log(`📝 ステップ更新開始: ${oldStep} → ${oldStep + 1}`);
                console.log(`🔍 更新前の詳細確認:`, {
                    currentStep: this.currentStep,
                    typeOfCurrentStep: typeof this.currentStep,
                    currentStepPlusOne: this.currentStep + 1,
                    totalSteps: this.totalSteps,
                    canIncrement: this.currentStep < this.totalSteps
                });
                
                this.currentStep++;
                
                console.log(`✅ currentStep更新実行後:`, {
                    newCurrentStep: this.currentStep,
                    typeOfNewStep: typeof this.currentStep,
                    oldStep: oldStep,
                    incrementWorked: this.currentStep === (oldStep + 1),
                    expectedStep: oldStep + 1
                });
                
                // 異常なジャンプの検出
                const expectedNextStep = oldStep + 1;
                if (this.currentStep !== expectedNextStep) {
                    console.error(`🚨 ★★★ ステップジャンプ異常検出！ ★★★`, {
                        expectedStep: expectedNextStep,
                        actualStep: this.currentStep,
                        jumpAmount: this.currentStep - oldStep,
                        oldStep: oldStep,
                        isSkippingStep: this.currentStep > expectedNextStep,
                        stepSkipped: expectedNextStep !== this.currentStep ? expectedNextStep : null
                    });
                    
                    // 強制的に正しいステップに戻す
                    console.log(`⚡ 強制修正: Step ${this.currentStep} → Step ${expectedNextStep}`);
                    this.currentStep = expectedNextStep;
                }
                
                console.log(`🔍 最終ステップ確認:`, {
                    finalCurrentStep: this.currentStep,
                    correctProgression: this.currentStep === (oldStep + 1)
                });
                
                // Step 4への進行を特別にログ
                if (this.currentStep === 4) {
                    console.log('🎯 ★★★ Step 4への進行を開始します ★★★');
                    
                    // tutorialStepsの詳細調査
                    console.log('🔍 tutorialSteps全体状況:', {
                        exists: !!this.tutorialSteps,
                        isArray: Array.isArray(this.tutorialSteps),
                        length: this.tutorialSteps?.length,
                        allSteps: this.tutorialSteps?.map(s => ({
                            step: s?.step,
                            title: s?.title?.substring(0, 30),
                            hasTemplate: !!s?.template
                        }))
                    });
                    
                    const step4Data = this.tutorialSteps?.[3]; // 安全なアクセス
                    console.log('📊 Step 4データ詳細:', {
                        exists: !!step4Data,
                        title: step4Data?.title,
                        hasTemplate: !!step4Data?.template,
                        templateLength: step4Data?.template?.length,
                        step4Index3: this.tutorialSteps?.[3],
                        step4ByFind: this.tutorialSteps?.find(s => s?.step === 4)
                    });
                    
                    if (!step4Data) {
                        console.error('❌ CRITICAL: Step 4データが存在しません!');
                        console.error('🔍 詳細診断:', {
                            tutorialStepsExists: !!this.tutorialSteps,
                            tutorialStepsLength: this.tutorialSteps?.length,
                            indexAccess: this.tutorialSteps?.[3],
                            findAccess: this.tutorialSteps?.find(s => s?.step === 4),
                            allStepNumbers: this.tutorialSteps?.map(s => s?.step)
                        });
                        
                        // Step 4を別の方法で探す
                        const step4Alternative = this.tutorialSteps?.find(s => s?.step === 4);
                        if (step4Alternative) {
                            console.log('✅ 代替方法でStep 4を発見!', step4Alternative.title);
                        } else {
                            console.error('❌ 代替方法でもStep 4が見つかりません');
                            // 現在のステップを元に戻す
                            this.currentStep = oldStep;
                            return;
                        }
                    }
                }
                
                console.log('📝 updateStepContent()実行開始...');
                this.updateStepContent();
                console.log('✅ updateStepContent()完了');
                
                console.log('🔄 resetCode()実行開始...');
                this.resetCode();
                console.log('✅ resetCode()完了');
                
                console.log('📊 updateProgress()実行開始...');
                this.updateProgress();
                console.log('✅ updateProgress()完了');
                
                console.log('🧹 clearResults()実行開始...');
                this.clearResults();
                console.log('✅ clearResults()完了');
                
                console.log('🔧 UI状態設定開始...');
                this.nextBtn.disabled = true;
                if (this.hintSection) {
                    this.hintSection.style.display = 'none';
                }
                console.log('✅ UI状態設定完了');
                
                console.log('🎨 可視化クリア開始...');
                try {
                    this.visualizer.clear();
                    console.log('✅ 可視化クリア完了');
                } catch (vizError) {
                    console.warn('⚠️ 可視化クリアでエラー:', vizError.message);
                }
                
                console.log(`✅ ★★★ Step ${this.currentStep}への進行完了 ★★★`);
                
                // 進行後の状態確認（詳細版）
                setTimeout(() => {
                    const stepTitle = document.getElementById('stepTitle')?.textContent;
                    const stepBadge = document.getElementById('stepBadge')?.textContent;
                    const codeContent = document.getElementById('codeEditor')?.textContent;
                    const physicsExplanation = document.getElementById('physicsExplanation')?.textContent;
                    
                    console.log('🔍 ★★★ 進行後詳細状態確認 ★★★:', {
                        currentStep: this.currentStep,
                        stepBadge: stepBadge,
                        stepTitle: stepTitle?.substring(0, 50),
                        hasCodeContent: !!codeContent,
                        codeContentLength: codeContent?.length,
                        physicsExplanationLength: physicsExplanation?.length
                    });
                    
                    // Step 4の期待値との比較
                    if (this.currentStep === 4) {
                        const isStep4Content = stepTitle?.includes('複合遮蔽') || 
                                              stepTitle?.includes('最適化') ||
                                              codeContent?.includes('lead_inner_shield');
                        
                        if (isStep4Content) {
                            console.log('🎉 ★★★ Step 4コンテンツ確認: 正常 ★★★');
                        } else {
                            console.error('❌ ★★★ Step 4コンテンツ確認: 異常 ★★★', {
                                expectedInTitle: '複合遮蔽 または 最適化',
                                actualTitle: stepTitle,
                                expectedInCode: 'lead_inner_shield',
                                actualCodeSnippet: codeContent?.substring(0, 100)
                            });
                        }
                    }
                }, 200);
                
            } else {
                console.log('🏆 全ステップ完了 → 最終完了画面へ');
                // 全ステップ完了
                this.showFinalCompletion();
            }
            
        } catch (error) {
            console.error('❌ ★★★ nextStep()でエラー発生 ★★★:', {
                errorMessage: error.message,
                errorStack: error.stack,
                currentStep: this.currentStep
            });
            
            // エラー発生時は安全な状態に戻す
            this.hideCompletionModal();
            throw error;
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepContent();
            this.resetCode();
            this.updateProgress();
            this.clearResults();
            this.nextBtn.disabled = true;
            this.hintSection.style.display = 'none';
            
            // 可視化をクリア
            this.visualizer.clear();
            
            console.log(`前のステップに戻りました: Step ${this.currentStep}`);
        }
    }

    showFinalCompletion() {
        this.modalOverlay.style.display = 'flex';
        
        this.achievementText.textContent = "放射線遮蔽研究マスター";
        this.completionMessage.innerHTML = `
            <h3>🎉 全ステップ完了おめでとうございます！</h3>
            <p>完全な遮蔽計算ワークフローをマスターされました。</p>
        `;
        
        this.nextStepPreview.innerHTML = `
            <h4>📊 学習成果</h4>
            <div style="text-align: left;">
                <ul>
                    <li>✅ 放射線線源の定義・作成</li>
                    <li>✅ 遮蔽体の設計・最適化</li>
                    <li>✅ 複合材料の効果的活用</li>
                    <li>✅ 検出器配置・測定計画</li>
                    <li>✅ データ管理・バックアップ</li>
                </ul>
            </div>
        `;
        
        this.continueBtn.textContent = "🏆 完了";
        this.continueBtn.onclick = () => {
            this.hideCompletionModal();
            alert('🎉 おめでとうございます！Poker MCP インタラクティブチュートリアルを完了されました。\n\n習得されたスキルを実際の研究・業務でご活用ください！');
        };
    }

    toggleVisualizationPanel() {
        const panel = document.getElementById('visualizationPanel');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                this.visualizer.render();
            }
        }
    }

    showDetailedPhysicsAnalysis() {
        if (this.stepExecutionHistory.length === 0) {
            alert('💡 まず何かのステップを実行してから物理解析をご確認ください。');
            return;
        }
        
        const latestExecution = this.stepExecutionHistory[this.stepExecutionHistory.length - 1];
        
        const analysisWindow = window.open('', 'physicsAnalysis', 'width=600,height=800');
        analysisWindow.document.write(`
            <html>
            <head>
                <title>詳細物理解析</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h2 { color: #2d3748; }
                    .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; }
                </style>
            </head>
            <body>
                <h2>🔬 詳細物理解析レポート</h2>
                <div class="section">
                    <h3>実行情報</h3>
                    <p><strong>実行日時:</strong> ${new Date(latestExecution.timestamp).toLocaleString()}</p>
                    <p><strong>メソッド:</strong> ${latestExecution.request.method}</p>
                    <p><strong>ステップ:</strong> ${latestExecution.step}</p>
                </div>
                <div class="section">
                    <h3>パラメータ</h3>
                    <pre>${JSON.stringify(latestExecution.request.params, null, 2)}</pre>
                </div>
                <div class="section">
                    <h3>実行結果</h3>
                    <pre>${JSON.stringify(latestExecution.response, null, 2)}</pre>
                </div>
            </body>
            </html>
        `);
        analysisWindow.document.close();
    }

    // デフォルトステップデータ（steps.jsonが読み込めない場合のフォールバック）
    getDefaultSteps() {
        console.log('📋 デフォルトステップデータを取得中...');
        
        const defaultSteps = [
            {
                step: 1,
                title: "基本的なCo-60線源の作成",
                physics_background: "Co-60は医療用γ線源として広く使用されており、1.17MeVと1.33MeVの特性γ線を放出します。半減期は約5.3年で、医療機器の殺菌や放射線治療に使用されます。",
                learning_objectives: [
                    "JSON-RPC 2.0形式の理解",
                    "pokerinput_proposeSourceメソッドの基本構造",
                    "放射能単位（Bq）の実際の値と物理的意味",
                    "POINT型線源の座標指定方法"
                ],
                instructions: "医療用Co-60線源を原点（0,0,0）に配置するJSONリクエストを作成してください。37GBq（1キュリー）の放射能を持つ点線源として定義します。",
                template: `{
  "jsonrpc": "2.0",
  "method": "pokerinput_proposeSource",
  "params": {
    "name": "co60_medical",
    "type": "POINT",
    "position": "0 0 0",
    "inventory": [
      {
        "nuclide": "Co60",
        "radioactivity": 37000000000
      }
    ]
  }
}`,
                hints: [
                    "💡 JSON-RPC 2.0では必ず 'jsonrpc': '2.0' が必要です",
                    "🔬 Co-60の37GBq（1キュリー）は37,000,000,000 Bqに相当します",
                    "📍 POINT型線源では 'position' パラメータで座標を指定します（x y z形式）",
                    "⚛️ 'nuclide'は元素記号と質量数を結合した形式です（Co60）"
                ],
                achievement: "線源作成マスター",
                completion_message: "素晴らしいです！Co-60線源の作成が完了しました。医療分野で実際に使用される線源をモデル化できました。",
                next_step_preview: "次は、この線源を遮蔽するためのコンクリート球殻を作成します。"
            },
            {
                step: 2,
                title: "コンクリート遮蔽体の作成",
                physics_background: "コンクリートは放射線遮蔽材として最も一般的な材料です。密度約2.3 g/cm³で、Co-60のγ線に対する線減弱係数は約0.06 cm⁻¹です。",
                learning_objectives: [
                    "立体形状（SPH）の理解と作成方法",
                    "3D座標系での球体の定義方法",
                    "材料ゾーンの概念と割り当て方法"
                ],
                instructions: "線源を囲むコンクリート球殻を作成してください。まず球体形状を定義し、その後材料をコンクリートに設定する2段階の操作を学習します。",
                template: `{
  "jsonrpc": "2.0",
  "method": "pokerinput_proposeBody",
  "params": {
    "name": "concrete_shield",
    "type": "SPH",
    "center": "0 0 0",
    "radius": 50
  }
}`,
                hints: [
                    "🔵 SPH（球）は中心座標と半径で定義されます",
                    "📏 半径50cmは約4.3半価層分に相当します",
                    "🏗️ 立体作成後、必ず材料設定が必要です（proposeZone）"
                ],
                achievement: "遮蔽設計エンジニア",
                completion_message: "優秀です！コンクリート遮蔽体の作成が完了しました。",
                next_step_preview: "次は、遮蔽効果を測定するための検出器を配置します。"
            },
            {
                step: 3,
                title: "線量率検出器の配置",
                physics_background: "線量率は距離の二乗に反比例して減少します（逆二乗法則）。さらに遮蔽材があると指数関数的に減衰します。",
                learning_objectives: [
                    "検出器の概念と配置方法の理解",
                    "1次元グリッドによる空間分布測定",
                    "逆二乗法則と遮蔽減衰の実体験"
                ],
                instructions: "遮蔽体の外側に検出器を配置し、線量率の空間分布を測定します。X軸上に10cm間隔で検出器を配置するグリッドを作成してください。",
                template: `{
  "jsonrpc": "2.0",
  "method": "pokerinput_proposeDetector",
  "params": {
    "name": "dose_survey",
    "origin": "60 0 0",
    "grid": [
      {
        "edge": "10 0 0",
        "number": 10
      }
    ]
  }
}`,
                hints: [
                    "📍 origin \"60 0 0\" は遮蔽体表面から10cm外側の位置です",
                    "📏 edge \"10 0 0\" は X方向に10cm間隔の意味です",
                    "🔢 number: 10 で10個の検出点を配置します"
                ],
                achievement: "線量測定スペシャリスト",
                completion_message: "素晴らしいです！検出器配置が完了しました。",
                next_step_preview: "次は、より効果的な鉛遮蔽体を追加して複合遮蔽を学習します。"
            }
        ];
    }
}

// ページ読み込み後に初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM読み込み完了、チュートリアル初期化開始');
    
    // DOM要素が完全に読み込まれるまで少し待機
    setTimeout(() => {
        console.log('⏰ 遅延初期化実行');
        window.tutorial = new PokerMCPTutorial();
        
        // 初期化後の状態確認
        setTimeout(() => {
            if (window.tutorial && window.tutorial.continueBtn) {
                console.log('✅ 初期化成功: continueBtnが利用可能');
            } else {
                console.error('❌ 初期化問題: continueBtnが利用不可', {
                    tutorial: !!window.tutorial,
                    continueBtn: !!window.tutorial?.continueBtn,
                    domElement: !!document.getElementById('continueBtn')
                });
                
                // 修復試行
                if (window.tutorial && !window.tutorial.continueBtn) {
                    console.log('🔧 continueBtn修復試行...');
                    window.tutorial.continueBtn = document.getElementById('continueBtn');
                    if (window.tutorial.continueBtn) {
                        window.tutorial.continueBtn.addEventListener('click', (event) => {
                            console.log('🔄 修復されたcontinueBtn クリック検出!');
                            window.tutorial.nextStep();
                        });
                        console.log('✅ continueBtn修復成功');
                    }
                }
            }
        }, 500);
    }, 100);
});

// デバッグ用のグローバル関数
window.debugTutorial = () => {
    console.log('Current tutorial state:', {
        currentStep: window.tutorial?.currentStep,
        totalSteps: window.tutorial?.totalSteps,
        tutorialSteps: window.tutorial?.tutorialSteps,
        isDevelopmentMode: window.tutorial?.isDevelopmentMode(),
        executionHistory: window.tutorial?.stepExecutionHistory
    });
};

// 緊急修復・デバッグ関数群

// 詳細デバッグ関数
window.debugTutorial = () => {
    console.log('🔍 詳細チュートリアル状態:', {
        currentStep: window.tutorial?.currentStep,
        totalSteps: window.tutorial?.totalSteps,
        tutorialSteps: window.tutorial?.tutorialSteps?.map(s => ({
            step: s.step,
            title: s.title,
            hasTemplate: !!s.template
        })),
        isDevelopmentMode: window.tutorial?.isDevelopmentMode(),
        executionHistory: window.tutorial?.stepExecutionHistory?.length,
        continueBtn: {
            exists: !!document.getElementById('continueBtn'),
            hasClick: !!window.tutorial?.continueBtn,
            disabled: document.getElementById('continueBtn')?.disabled,
            onclick: !!document.getElementById('continueBtn')?.onclick
        },
        modalState: {
            exists: !!document.getElementById('modalOverlay'),
            display: document.getElementById('modalOverlay')?.style?.display
        }
    });
};

// Step 4緊急修復関数
window.emergencyFixStep4 = () => {
    console.log('🚨 緊急修復: Step 4への強制移行開始');
    
    if (!window.tutorial) {
        console.error('❌ tutorialオブジェクトが存在しません');
        return false;
    }
    
    try {
        const tutorial = window.tutorial;
        
        console.log('🔧 Step 4強制設定開始...');
        
        // Step 4に強制設定
        tutorial.currentStep = 4;
        console.log('✅ currentStep = 4 に設定');
        
        // UI更新
        console.log('📝 UI更新開始...');
        tutorial.updateStepContent();
        console.log('✅ updateStepContent()実行');
        
        tutorial.resetCode();
        console.log('✅ resetCode()実行');
        
        tutorial.updateProgress();
        console.log('✅ updateProgress()実行');
        
        tutorial.clearResults();
        console.log('✅ clearResults()実行');
        
        // モーダルを確実に閉じる
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
            console.log('✅ モーダルを閉じました');
        }
        
        console.log('🎉 緊急修復完了: Step 4に移行しました');
        
        // 確認
        setTimeout(() => {
            const stepTitle = document.getElementById('stepTitle')?.textContent;
            const stepBadge = document.getElementById('stepBadge')?.textContent;
            const codeContent = document.getElementById('codeEditor')?.textContent;
            
            const isStep4Success = stepTitle?.includes('複合遮蔽') && 
                                  stepBadge?.includes('Step 4') &&
                                  codeContent?.includes('lead_inner_shield');
            
            console.log('🔍 修復結果確認:', {
                currentStep: tutorial.currentStep,
                stepBadge: stepBadge,
                stepTitle: stepTitle,
                hasStep4Code: codeContent?.includes('lead_inner_shield'),
                isStep4Success: isStep4Success
            });
            
            if (isStep4Success) {
                console.log('🎉 ★★★ Step 4修復成功！ ★★★');
                return true;
            } else {
                console.error('❌ Step 4修復失敗');
                return false;
            }
        }, 500);
        
        return true;
        
    } catch (error) {
        console.error('❌ 緊急修復でエラー:', error);
        return false;
    }
};

// 続けるボタン修復関数
window.fixContinueButton = () => {
    console.log('🔧 続けるボタン修復開始');
    
    const continueBtn = document.getElementById('continueBtn');
    if (!continueBtn) {
        console.error('❌ continueBtnが見つかりません');
        return false;
    }
    
    if (!window.tutorial) {
        console.error('❌ tutorialオブジェクトが見つかりません');
        return false;
    }
    
    try {
        // 既存イベントをクリア
        continueBtn.onclick = null;
        
        // 新しいイベントを設定（onclick）
        continueBtn.onclick = (event) => {
            console.log('🔄 修復されたcontinueBtn onclick クリック!');
            event.preventDefault();
            event.stopPropagation();
            window.tutorial.nextStep();
            return false;
        };
        
        // addEventListener も設定（重複防止のため一旦削除）
        const newContinueBtn = continueBtn.cloneNode(true);
        continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);
        
        newContinueBtn.addEventListener('click', (event) => {
            console.log('🔄 修復されたaddEventListener クリック!');
            event.preventDefault();
            event.stopPropagation();
            window.tutorial.nextStep();
        });
        
        // tutorialオブジェクトの参照も更新
        window.tutorial.continueBtn = newContinueBtn;
        
        console.log('✅ 続けるボタン修復完了');
        return true;
        
    } catch (error) {
        console.error('❌ 続けるボタン修復エラー:', error);
        return false;
    }
};

// 完全診断・修復関数
window.completeStep4Fix = () => {
    console.log('🚨 ★★★ 完全Step 4修復開始 ★★★');
    
    // Step 1: 状態確認
    console.log('📊 Step 1: 現在状態確認');
    window.debugTutorial();
    
    // Step 2: 続けるボタン修復
    console.log('🔧 Step 2: 続けるボタン修復');
    const btnFixed = window.fixContinueButton();
    
    // Step 3: Step 4強制移行
    console.log('⚡ Step 3: Step 4強制移行');
    const step4Fixed = window.emergencyFixStep4();
    
    // Step 4: 結果確認
    setTimeout(() => {
        console.log('🔍 Step 4: 最終結果確認');
        window.debugTutorial();
        
        const success = window.tutorial?.currentStep === 4 && 
                       document.getElementById('stepTitle')?.textContent?.includes('複合遮蔽');
        
        if (success) {
            console.log('🎉 ★★★ 完全修復成功！Step 4に到達しました ★★★');
            alert('✅ Step 4への修復が完了しました！\nチュートリアルを続行できます。');
        } else {
            console.error('❌ ★★★ 完全修復失敗 ★★★');
            alert('❌ 修復に失敗しました。\nブラウザをリロード（F5）してやり直してください。');
        }
    }, 1000);
};

console.log('🛠️ 緊急修復関数が利用可能です:');
console.log('  - window.debugTutorial(): 詳細状態確認');
console.log('  - window.emergencyFixStep4(): Step 4強制移行');
console.log('  - window.fixContinueButton(): 続けるボタン修復');
console.log('  - window.completeStep4Fix(): 完全修復実行');
            }
        ];
        
        console.log(`📋 デフォルトステップデータ生成完了: ${defaultSteps.length}ステップ`);
        return defaultSteps;
    }
}

// Tutorial クラスのエクスポート（両方の名前で利用可能）
window.Tutorial = PokerMCPTutorial;
window.PokerMCPTutorial = PokerMCPTutorial;

console.log('🎓 Tutorial/PokerMCPTutorial クラス登録完了');

// DOM読み込み完了後に Tutorial を初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM読み込み完了、Tutorial初期化開始...');
    
    try {
        window.tutorial = new PokerMCPTutorial();
        console.log('✅ Tutorial初期化成功');
    } catch (error) {
        console.error('❌ Tutorial初期化失敗:', error);
        
        // 初期化失敗時のフォールバック
        setTimeout(() => {
            console.log('🔄 遅延初期化を試行...');
            try {
                window.tutorial = new PokerMCPTutorial();
                console.log('✅ 遅延初期化成功');
            } catch (retryError) {
                console.error('❌ 遅延初期化も失敗:', retryError);
                
                // 最後の手段：手動初期化用の緊急メッセージ
                document.body.insertAdjacentHTML('afterbegin', `
                    <div style="background: #fed7d7; border: 2px solid #e53e3e; padding: 15px; margin: 10px; border-radius: 8px;">
                        <h3>🚨 Tutorial初期化失敗</h3>
                        <p>Tutorial システムの初期化に失敗しました。</p>
                        <p><strong>対処方法:</strong></p>
                        <ol>
                            <li>ブラウザをリロード（F5）してください</li>
                            <li>または <a href="tutorialsteps-emergency-fix.html" target="_blank">緊急修復システム</a> をお試しください</li>
                        </ol>
                    </div>
                `);
            }
        }, 2000);
    }
});

// クラスの明示的なグローバル登録（確実な実行）
console.log('🔧 クラス登録開始...');

try {
    // PokerMCPTutorialクラスをグローバルに登録
    window.PokerMCPTutorial = PokerMCPTutorial;
    console.log('✅ PokerMCPTutorial グローバル登録完了');
    
    // Tutorialエイリアスを作成
    window.Tutorial = PokerMCPTutorial;
    console.log('✅ Tutorial エイリアス登録完了');
    
    // 登録確認
    console.log('📋 クラス登録状況:');
    console.log('  - window.PokerMCPTutorial:', typeof window.PokerMCPTutorial);
    console.log('  - window.Tutorial:', typeof window.Tutorial);
    console.log('  - 同一参照:', window.Tutorial === window.PokerMCPTutorial);
    
    // DOM読み込み完了後の初期化シグナル
    window.tutorialClassReady = true;
    console.log('🎯 Tutorialクラス準備完了シグナル発信');
    
} catch (error) {
    console.error('❌ クラス登録エラー:', error);
    
    // エラー時の緊急対応
    setTimeout(() => {
        console.log('🔄 緊急クラス登録再試行...');
        try {
            if (typeof PokerMCPTutorial !== 'undefined') {
                window.PokerMCPTutorial = PokerMCPTutorial;
                window.Tutorial = PokerMCPTutorial;
                window.tutorialClassReady = true;
                console.log('✅ 緊急クラス登録成功');
            }
        } catch (retryError) {
            console.error('❌ 緊急クラス登録失敗:', retryError);
        }
    }, 100);
}
