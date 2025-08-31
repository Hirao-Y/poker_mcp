// チュートリアルコアシステム v1.0
class TutorialCore {
    constructor() {
        console.log('🎓 チュートリアルコア初期化開始...');
        
        this.currentStep = 1;
        this.totalSteps = 5;
        this.progress = {
            completedSteps: [],
            startTime: Date.now(),
            interactions: 0
        };
        
        // ステップデータ
        this.steps = [
            {
                title: "Step 1: Co-60線源の設定",
                content: "医療用Co-60線源を原点に配置し、放射線源を可視化します。",
                learning: "放射線源の基本概念と視覚的理解を学習します。",
                jsonTemplate: `{
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
  },
  "id": 1
}`
            },
            {
                title: "Step 2: コンクリート遮蔽体",
                content: "コンクリート球形遮蔽体を追加し、基本的な遮蔽構造を構築します。",
                learning: "遮蔽体の形状と材料特性を視覚的に理解します。",
                jsonTemplate: `{
  "jsonrpc": "2.0", 
  "method": "pokerinput_proposeBody",
  "params": {
    "name": "concrete_shield",
    "type": "SPH",
    "center": "0 0 0",
    "radius": 50
  },
  "id": 2
}`
            },
            {
                title: "Step 3: 検出器配置", 
                content: "線量率測定用検出器アレイを配置し、測定系を構築します。",
                learning: "検出器配置と線量率分布の可視化を学習します。",
                jsonTemplate: `{
  "jsonrpc": "2.0",
  "method": "pokerinput_proposeDetector", 
  "params": {
    "name": "dose_survey",
    "origin": "60 0 0",
    "grid": [{"edge": "10 0 0", "number": 10}]
  },
  "id": 3
}`
            },
            {
                title: "Step 4: 鉛遮蔽追加",
                content: "内側に鉛遮蔽球を追加し、複合遮蔽構造を完成させます。",
                learning: "複合材料による高効率遮蔽設計を理解します。",
                jsonTemplate: `{
  "jsonrpc": "2.0",
  "method": "pokerinput_proposeBody",
  "params": {
    "name": "lead_inner_shield", 
    "type": "SPH",
    "center": "0 0 0",
    "radius": 18
  },
  "id": 4
}`
            },
            {
                title: "Step 5: 完成・保存",
                content: "遮蔽設計を完成させ、計算結果を保存します。",
                learning: "実用的な遮蔽設計の完成と実務への応用を学習します。",
                jsonTemplate: `{
  "jsonrpc": "2.0",
  "method": "pokerinput_applyChanges", 
  "params": {
    "backup_comment": "Medical Co-60 shielding design completed"
  },
  "id": 5
}`
            }
        ];
        
        console.log('✅ TutorialCore初期化完了');
    }
    
    getCurrentStep() {
        return this.steps[this.currentStep - 1];
    }
    
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.progress.completedSteps.push(this.currentStep);
            this.currentStep++;
            this.updateUI();
            this.updateVisualization();
            return true;
        } else {
            // 完了処理
            this.showCompletionMessage();
            return false;
        }
    }
    
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            // 完了リストから削除
            this.progress.completedSteps = this.progress.completedSteps.filter(
                step => step < this.currentStep
            );
            this.updateUI();
            this.updateVisualization();
            return true;
        }
        return false;
    }
    
    updateUI() {
        const step = this.getCurrentStep();
        
        // プログレスバー更新
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            const percentage = Math.round((this.currentStep / this.totalSteps) * 100);
            progressFill.style.width = percentage + '%';
        }
        
        if (progressText) {
            progressText.textContent = `Step ${this.currentStep} / ${this.totalSteps}`;
        }
        
        // コンテンツエリア更新
        const contentArea = document.getElementById('contentArea');
        if (contentArea && step) {
            contentArea.innerHTML = `
                <div class="step-content">
                    <h2>${step.title}</h2>
                    <div class="step-description">
                        <p><strong>概要:</strong> ${step.content}</p>
                        <p><strong>学習目標:</strong> ${step.learning}</p>
                    </div>
                </div>
            `;
        }
        
        // JSON入力エリア更新
        const jsonInput = document.getElementById('jsonInput');
        if (jsonInput && step.jsonTemplate) {
            jsonInput.value = step.jsonTemplate;
        }
        
        // ナビゲーションボタン更新
        const prevBtn = document.getElementById('prevStepBtn');
        const nextBtn = document.getElementById('nextStepBtn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentStep === 1;
        }
        
        if (nextBtn) {
            if (this.currentStep === this.totalSteps) {
                nextBtn.textContent = '🎉 完了';
                nextBtn.disabled = false;
            } else {
                nextBtn.textContent = '次のステップ ➡️';
                nextBtn.disabled = false;
            }
        }
        
        console.log(`📍 UI更新完了: Step ${this.currentStep}`);
    }
    
    updateVisualization() {
        // グローバル可視化システムが利用可能な場合のみ更新
        if (!window.vizSystem) return;
        
        // 現在のステップまでの要素を段階的に表示
        window.vizSystem.clearAll();
        
        if (this.currentStep >= 1) {
            window.vizSystem.addRadiationSource('co60_medical', [0, 0, 0], 'Co60', 37000000000);
        }
        
        if (this.currentStep >= 2) {
            window.vizSystem.addShield('concrete_shield', 'SPH', { 
                center: [0, 0, 0], 
                radius: 50 
            }, 'CONCRETE');
        }
        
        if (this.currentStep >= 3) {
            window.vizSystem.addDetector('dose_survey', [60, 0, 0], [{ 
                edge: [10, 0, 0], 
                number: 10 
            }]);
        }
        
        if (this.currentStep >= 4) {
            window.vizSystem.addShield('lead_inner_shield', 'SPH', { 
                center: [0, 0, 0], 
                radius: 18 
            }, 'LEAD');
        }
        
        console.log(`🎨 可視化更新: Step ${this.currentStep} の要素まで表示`);
    }
    
    reset() {
        this.currentStep = 1;
        this.progress.completedSteps = [];
        this.progress.interactions = 0;
        this.progress.startTime = Date.now();
        
        // 可視化クリア
        if (window.vizSystem) {
            window.vizSystem.clearAll();
        }
        
        // UI更新
        this.updateUI();
        this.updateVisualization();
        
        console.log('🔄 チュートリアルリセット完了');
    }
    
    showCompletionMessage() {
        const duration = Math.round((Date.now() - this.progress.startTime) / 1000);
        const completionMessage = `
🎉 チュートリアル完了！

📊 学習統計:
• 所要時間: ${duration}秒
• インタラクション数: ${this.progress.interactions}回
• 完了ステップ: ${this.progress.completedSteps.length}/${this.totalSteps}

✅ 習得内容:
• Co-60線源の配置と可視化
• コンクリート遮蔽体の設計
• 検出器配置による測定系構築
• 鉛複合遮蔽による高効率設計
• 実用的な医療遮蔽設計手法

🎓 おめでとうございます！
放射線遮蔽計算の基本をマスターしました。
        `;
        
        alert(completionMessage);
        
        // 可視化システムにも完了メッセージ
        if (window.vizSystem) {
            window.vizSystem.showMessage('🎉 チュートリアル完了！', 'success');
        }
    }
    
    exportProgress() {
        const progressData = {
            currentStep: this.currentStep,
            completedSteps: this.progress.completedSteps,
            startTime: this.progress.startTime,
            duration: Date.now() - this.progress.startTime,
            interactions: this.progress.interactions,
            systemInfo: window.vizSystem ? window.vizSystem.getDiagnosticInfo() : null,
            timestamp: new Date().toISOString(),
            version: '3.2'
        };
        
        const jsonString = JSON.stringify(progressData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `tutorial_progress_${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        console.log('💾 学習進捗エクスポート完了');
        
        if (window.vizSystem) {
            window.vizSystem.showMessage('学習進捗を保存しました', 'success');
        }
    }
    
    // JSON実行処理
    executeJsonCommand(jsonString) {
        try {
            const request = JSON.parse(jsonString);
            
            // バリデーション
            if (!request.jsonrpc || request.jsonrpc !== "2.0") {
                throw new Error("JSON-RPC 2.0形式ではありません");
            }
            
            if (!request.method) {
                throw new Error("methodが指定されていません");
            }
            
            // インタラクション数カウント
            this.progress.interactions++;
            
            // 可視化システムに反映
            this.updateVisualizationFromJson(request);
            
            // 成功レスポンス生成
            const response = {
                jsonrpc: "2.0",
                result: {
                    success: true,
                    message: `${request.method} が正常に実行されました`,
                    timestamp: new Date().toISOString(),
                    step: this.currentStep,
                    totalInteractions: this.progress.interactions
                },
                id: request.id
            };
            
            return { success: true, response: response };
            
        } catch (error) {
            // エラーレスポンス生成
            const errorResponse = {
                jsonrpc: "2.0",
                error: {
                    code: -32700,
                    message: "Parse error",
                    data: error.message
                },
                id: null
            };
            
            return { success: false, response: errorResponse };
        }
    }
    
    updateVisualizationFromJson(request) {
        if (!window.vizSystem) return;
        
        const method = request.method;
        const params = request.params;
        
        try {
            if (method === 'pokerinput_proposeSource' && params) {
                const position = params.position ? 
                    params.position.split(' ').map(Number) : [0, 0, 0];
                const nuclide = params.inventory && params.inventory[0] ? 
                    params.inventory[0].nuclide : 'Unknown';
                const activity = params.inventory && params.inventory[0] ? 
                    params.inventory[0].radioactivity : 0;
                
                window.vizSystem.addRadiationSource(params.name, position, nuclide, activity);
                
            } else if (method === 'pokerinput_proposeBody' && params) {
                const center = params.center ? 
                    params.center.split(' ').map(Number) : [0, 0, 0];
                const parameters = { 
                    center: center, 
                    radius: params.radius 
                };
                
                // 材料判定（簡易）
                const material = params.name && params.name.includes('lead') ? 'LEAD' : 'CONCRETE';
                
                window.vizSystem.addShield(params.name, params.type, parameters, material);
                
            } else if (method === 'pokerinput_proposeDetector' && params) {
                const origin = params.origin ? 
                    params.origin.split(' ').map(Number) : [0, 0, 0];
                
                window.vizSystem.addDetector(params.name, origin, params.grid || []);
                
            } else if (method === 'pokerinput_applyChanges') {
                // 完了処理
                window.vizSystem.showMessage('設計が保存されました', 'success');
            }
            
        } catch (error) {
            console.error('JSON→可視化更新エラー:', error);
            if (window.vizSystem) {
                window.vizSystem.showMessage(`更新エラー: ${error.message}`, 'error');
            }
        }
    }
    
    // JSON検証
    validateJsonCommand(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            const validations = [];
            
            // 基本構造チェック
            if (parsed.jsonrpc !== "2.0") {
                validations.push("⚠️ JSON-RPC 2.0ではありません");
            }
            
            if (!parsed.method) {
                validations.push("❌ methodが指定されていません");
            }
            
            if (parsed.id === undefined) {
                validations.push("⚠️ idが指定されていません");
            }
            
            // メソッド妥当性チェック
            const validMethods = [
                'pokerinput_proposeSource',
                'pokerinput_proposeBody', 
                'pokerinput_proposeDetector',
                'pokerinput_applyChanges'
            ];
            
            if (parsed.method && validMethods.indexOf(parsed.method) === -1) {
                validations.push(`⚠️ 未知のmethod: ${parsed.method}`);
            }
            
            // パラメータチェック
            if (parsed.method && !parsed.params) {
                validations.push("⚠️ paramsが指定されていません");
            }
            
            return {
                isValid: validations.length === 0,
                validations: validations,
                parsed: parsed
            };
            
        } catch (error) {
            return {
                isValid: false,
                validations: [`❌ JSON構文エラー: ${error.message}`],
                parsed: null
            };
        }
    }
    
    // 診断情報取得
    getDiagnosticInfo() {
        return {
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            completedSteps: this.progress.completedSteps,
            interactions: this.progress.interactions,
            duration: Date.now() - this.progress.startTime,
            currentStepData: this.getCurrentStep(),
            completionRate: Math.round((this.currentStep / this.totalSteps) * 100)
        };
    }
}

// グローバル登録
window.TutorialCore = TutorialCore;
console.log('✅ TutorialCore読み込み完了');
