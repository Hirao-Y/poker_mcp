// =============== メイン処理 ===============

// グローバル変数
let scene, camera, renderer;
let sourceObject, shieldObject, detectorObject;
let currentScenario = 'medical';
let calculationHistory = [];
let comparisonChart = null;

// システムインスタンス
let progressManager;
let scenarioManager;
let visualizer;
let calculator;
let chartManager;

// エラーハンドリング関数
function handleError(error, context) {
    console.error(`❌ Error in ${context}:`, error);
    
    // ユーザーフレンドリーなエラーメッセージ
    const userMessage = `${context}でエラーが発生しました。\n\n技術詳細: ${error.message}\n\nページを再読み込みしてください。`;
    alert(userMessage);
}

// 安全な要素取得
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`⚠️ Element not found: ${id}`);
        return null;
    }
    return element;
}

// 安全なイベントリスナー設定
function safeAddEventListener(id, event, handler) {
    const element = safeGetElement(id);
    if (element) {
        element.addEventListener(event, handler);
        return true;
    }
    return false;
}

// メイン初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛡️ Enhanced Level 1 Interactive Guide - Initializing...');
    
    try {
        // 必要な要素の存在確認
        const criticalElements = [
            'current-stage-display',
            'main-layout', 
            'execute-btn'
        ];
        
        const missingElements = criticalElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            throw new Error(`Missing critical elements: ${missingElements.join(', ')}`);
        }

        // システム初期化
        initializeSystems();
        
        // イベントリスナー設定
        setupEventListeners();
        
        // 3D可視化初期化（遅延実行）
        setTimeout(initializeVisualization, 200);
        
        // 初期パラメータ設定
        updateSliderDisplays();
        
        console.log('✓ All systems initialized successfully');
        
        // ウェルカムメッセージ
        setTimeout(showWelcomeMessage, 1000);
        
    } catch (error) {
        handleError(error, 'システム初期化');
    }
});

// システム初期化関数
function initializeSystems() {
    try {
        progressManager = new EnhancedLearningProgressManager();
        console.log('✓ Progress Manager initialized');
        
        scenarioManager = new ScenarioManager();
        console.log('✓ Scenario Manager initialized');
        
        calculator = new EnhancedShieldingCalculator();
        console.log('✓ Calculator initialized');
        
        // Chart.jsが利用可能かチェック
        if (typeof Chart !== 'undefined') {
            chartManager = new EnhancedChartManager();
            console.log('✓ Chart Manager initialized');
        } else {
            console.warn('⚠️ Chart.js not available, charts will be disabled');
            chartManager = null;
        }
        
    } catch (error) {
        throw new Error(`System initialization failed: ${error.message}`);
    }
}

// 3D可視化初期化
function initializeVisualization() {
    try {
        const container = safeGetElement('threejs-container');
        if (container && typeof THREE !== 'undefined') {
            visualizer = new Enhanced3DVisualizer(container);
            console.log('✓ 3D Visualizer initialized');
            updateVisualization();
        } else {
            console.warn('⚠️ 3D visualization not available');
            visualizer = null;
        }
    } catch (error) {
        console.error('❌ 3D Visualization initialization failed:', error);
        // 3D可視化失敗は致命的ではないので続行
    }
}

// イベントリスナー設定
function setupEventListeners() {
    console.log('⚙️ Setting up event listeners...');
    
    try {
        // パラメータ変更イベント
        safeAddEventListener('nuclide-select', 'change', handleParameterChange);
        safeAddEventListener('material-select', 'change', handleParameterChange);
        
        // スライダーイベント
        ['activity-slider', 'thickness-slider', 'distance-slider'].forEach(id => {
            safeAddEventListener(id, 'input', function() {
                updateSliderDisplays();
                handleParameterChange();
            });
        });

        // 実行ボタン
        safeAddEventListener('execute-btn', 'click', performCalculation);

        // ナビゲーションボタン
        safeAddEventListener('next-btn', 'click', () => {
            if (progressManager) {
                progressManager.nextStage();
            }
        });
        
        safeAddEventListener('prev-btn', 'click', () => {
            if (progressManager && progressManager.currentStage > 1) {
                progressManager.currentStage--;
                progressManager.updateStageContent();
                progressManager.updateUI();
            }
        });

        // ヘルパーボタン
        safeAddEventListener('hint-btn', 'click', showContextualHint);
        safeAddEventListener('theory-btn', 'click', showTheoryExplanation);
        safeAddEventListener('restart-btn', 'click', restartLevel);

        // 3D制御ボタン
        safeAddEventListener('rotate-view', 'click', () => {
            if (camera && typeof THREE !== 'undefined') {
                camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
                camera.lookAt(0, 0, 0);
            }
        });

        safeAddEventListener('zoom-fit', 'click', () => {
            if (camera) {
                camera.position.set(5, 5, 8);
                camera.lookAt(0, 0, 0);
            }
        });

        safeAddEventListener('reset-view', 'click', () => {
            if (camera) {
                camera.position.set(5, 5, 8);
                camera.lookAt(0, 0, 0);
            }
        });

        safeAddEventListener('animation-toggle', 'click', () => {
            if (visualizer) {
                visualizer.toggleAnimation();
            }
        });

        // ステージ完了ボタン
        safeAddEventListener('next-stage-btn', 'click', () => {
            if (progressManager) {
                progressManager.nextStage();
            }
        });

        // プロセスステップクリック
        document.querySelectorAll('.process-step').forEach(step => {
            step.addEventListener('click', () => {
                const stepNum = parseInt(step.dataset.step);
                if (progressManager && stepNum <= progressManager.currentStage) {
                    showStepDetails(stepNum);
                }
            });
        });

        console.log('✓ Event listeners set up successfully');
    } catch (error) {
        throw new Error(`Event listener setup failed: ${error.message}`);
    }
}

// パラメータ変更ハンドラー
function handleParameterChange() {
    try {
        updateVisualization();
        updateScenarioDisplay();
        
        if (progressManager) {
            progressManager.updateObjective(2, true);
        }
    } catch (error) {
        console.error('❌ Error in parameter change:', error);
    }
}

// スライダー表示更新
function updateSliderDisplays() {
    try {
        const activitySlider = safeGetElement('activity-slider');
        const thicknessSlider = safeGetElement('thickness-slider');
        const distanceSlider = safeGetElement('distance-slider');
        
        if (activitySlider) {
            const activityValue = safeGetElement('activity-value');
            if (activityValue) {
                activityValue.textContent = parseFloat(activitySlider.value).toFixed(1) + ' GBq';
            }
        }
        
        if (thicknessSlider) {
            const thicknessValue = safeGetElement('thickness-value');
            if (thicknessValue) {
                thicknessValue.textContent = parseFloat(thicknessSlider.value).toFixed(1) + ' cm';
            }
        }
        
        if (distanceSlider) {
            const distanceValue = safeGetElement('distance-value');
            if (distanceValue) {
                distanceValue.textContent = distanceSlider.value + ' cm';
            }
        }
    } catch (error) {
        console.error('❌ Error updating slider displays:', error);
    }
}

// 可視化更新
function updateVisualization() {
    if (!visualizer) return;

    try {
        const materialSelect = safeGetElement('material-select');
        const thicknessSlider = safeGetElement('thickness-slider');
        const distanceSlider = safeGetElement('distance-slider');
        
        if (materialSelect && thicknessSlider && distanceSlider) {
            const material = materialSelect.value;
            const thickness = parseFloat(thicknessSlider.value);
            const distance = parseFloat(distanceSlider.value);

            visualizer.updateShield(material, thickness / 10); // スケール調整
            visualizer.updateDetectorPosition(distance);
        }
        
        console.log('📊 Visualization updated');
    } catch (error) {
        console.error('❌ Error updating visualization:', error);
    }
}

// シナリオ表示更新
function updateScenarioDisplay() {
    try {
        const nuclideSelect = safeGetElement('nuclide-select');
        const scenarioDisplay = safeGetElement('current-scenario-display');
        
        if (nuclideSelect && scenarioDisplay && scenarioData[currentScenario]) {
            const nuclideText = nuclideSelect.options[nuclideSelect.selectedIndex].text;
            const scenario = scenarioData[currentScenario];
            scenarioDisplay.textContent = `${scenario.name}用${nuclideText}`;
        }
    } catch (error) {
        console.error('❌ Error updating scenario display:', error);
    }
}

// 計算実行
function performCalculation() {
    try {
        console.log('🔬 Performing calculation...');
        
        const nuclideSelect = safeGetElement('nuclide-select');
        const activitySlider = safeGetElement('activity-slider');
        const materialSelect = safeGetElement('material-select');
        const thicknessSlider = safeGetElement('thickness-slider');
        const distanceSlider = safeGetElement('distance-slider');
        
        if (!nuclideSelect || !activitySlider || !materialSelect || !thicknessSlider || !distanceSlider) {
            throw new Error('計算に必要なパラメータ要素が見つかりません');
        }
        
        const nuclide = nuclideSelect.value;
        const activity = parseFloat(activitySlider.value);
        const material = materialSelect.value;
        const thickness = parseFloat(thicknessSlider.value);
        const distance = parseFloat(distanceSlider.value);

        // シナリオ別の安全基準を設定
        const scenario = scenarioData[currentScenario];
        if (calculator && scenario) {
            calculator.setSafetyLimit(scenario.safetyLimit);

            // 計算実行
            const results = calculator.calculate(nuclide, activity, material, thickness, distance);
            
            // 結果表示
            displayResults(results);
            
            // チャート更新
            if (chartManager) {
                chartManager.updateChart(results.initialDoseRate, results.finalDoseRate, scenario.safetyLimit);
            }
            
            // 履歴に保存
            calculationHistory.push({
                timestamp: new Date(),
                scenario: currentScenario,
                params: { nuclide, activity, material, thickness, distance },
                results: results
            });

            // 学習進捗更新
            if (progressManager) {
                progressManager.trackCalculation();
                progressManager.updateObjective(4, results.safetyStatus === 'safe');
            }
            
            // フィードバック提供
            provideFeedback(results);
            
            console.log('✓ Calculation completed successfully');
        }
        
    } catch (error) {
        handleError(error, '計算実行');
    }
}

// 結果表示
function displayResults(results) {
    try {
        const resultsPanel = safeGetElement('results-panel');
        if (!resultsPanel) return;
        
        resultsPanel.style.display = 'block';

        // 数値結果
        const doseRateResult = safeGetElement('dose-rate-result');
        if (doseRateResult) {
            doseRateResult.textContent = results.finalDoseRate < 0.01 ? 
                results.finalDoseRate.toExponential(2) + ' μSv/h' :
                results.finalDoseRate.toFixed(3) + ' μSv/h';
        }
        
        const attenuationResult = safeGetElement('attenuation-result');
        if (attenuationResult) {
            attenuationResult.textContent = results.attenuationPercent.toFixed(1) + '%';
        }
        
        const hvlResult = safeGetElement('hvl-result');
        if (hvlResult) {
            hvlResult.textContent = results.hvl.toFixed(2) + ' cm';
        }
        
        const tvlResult = safeGetElement('tvl-result');
        if (tvlResult) {
            tvlResult.textContent = results.tvl.toFixed(2) + ' cm';
        }

        // 安全性インジケーター
        const safetyIndicator = safeGetElement('safety-indicator');
        if (safetyIndicator) {
            const safetyTexts = {
                safe: `✅ 安全基準クリア (余裕: ${results.safetyMargin.toFixed(1)}%)`,
                warning: '⚠️ 基準値近接 - 厚さ増加を推奨',
                danger: `❌ 基準値超過 - 追加${results.requiredThickness ? results.requiredThickness.toFixed(1) : '?'}cm必要`
            };
            
            safetyIndicator.textContent = safetyTexts[results.safetyStatus] || '計算中...';
            safetyIndicator.className = `safety-indicator safety-${results.safetyStatus}`;
        }

        // 視覚フィードバック
        updateVisualFeedback(results);
        
        console.log(`📊 Results displayed: ${results.finalDoseRate.toFixed(3)} μSv/h (${results.safetyStatus})`);
        
    } catch (error) {
        console.error('❌ Error displaying results:', error);
    }
}

// 視覚フィードバック更新
function updateVisualFeedback(results) {
    try {
        // 検出器の色を結果に基づいて変更
        if (detectorObject && typeof THREE !== 'undefined') {
            const colors = {
                safe: 0x44ff44,
                warning: 0xffaa44,
                danger: 0xff4444
            };
            const emissiveColors = {
                safe: 0x002200,
                warning: 0x442200,
                danger: 0x220000
            };
            
            if (detectorObject.material) {
                detectorObject.material.color.setHex(colors[results.safetyStatus] || colors.safe);
                detectorObject.material.emissive.setHex(emissiveColors[results.safetyStatus] || emissiveColors.safe);
            }
        }
    } catch (error) {
        console.error('❌ Error updating visual feedback:', error);
    }
}

// フィードバック提供
function provideFeedback(results) {
    try {
        const materialSelect = safeGetElement('material-select');
        if (!materialSelect || !scenarioData[currentScenario] || !physicsDatabase.materials[materialSelect.value]) {
            return;
        }
        
        const materialName = physicsDatabase.materials[materialSelect.value].name;
        const scenario = scenarioData[currentScenario];
        
        let feedback = '';
        
        if (results.safetyStatus === 'safe') {
            if (results.safetyMargin > 50) {
                feedback = `🎉 素晴らしい！${materialName}で十分な安全余裕を確保できました。さらなる最適化も検討できます。`;
            } else {
                feedback = `✅ ${scenario.name}の基準をクリア！安全余裕は${results.safetyMargin.toFixed(1)}%です。`;
            }
        } else if (results.safetyStatus === 'warning') {
            feedback = `📏 あと少しです！厚さを数cm追加すると安全になります。`;
        } else {
            feedback = `⚠️ 線量率が高すぎます。より効果的な遮蔽材の使用や厚さの大幅増加を検討しましょう。`;
        }

        // フィードバック表示（遅延）
        setTimeout(() => {
            if (feedback && Math.random() > 0.5) { // 50%の確率で表示
                alert(feedback);
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error providing feedback:', error);
    }
}

// コンテキストヒント表示
function showContextualHint() {
    try {
        const hints = [
            "💡 放射線は距離の2乗に反比例して減衰します（逆二乗則）",
            "📚 HVL（半価層）は線量を半分にする厚さです",
            "🎯 管理区域境界の基準値は2.5 μSv/hです",
            "🔬 ビルドアップ係数は散乱線の寄与を表します",
            "⚡ 鉛は高密度のため効果的ですが、重量とコストを考慮しましょう"
        ];
        const randomHint = hints[Math.floor(Math.random() * hints.length)];
        alert(randomHint);
    } catch (error) {
        console.error('❌ Error showing hint:', error);
        alert("💡 パラメータを変更して遮蔽効果を体験してみましょう！");
    }
}

// 理論解説表示
function showTheoryExplanation() {
    try {
        const theory = `📚 放射線遮蔽の理論基礎

🔬 物理的原理:
放射線遮蔽は、光子と物質の相互作用（光電効果、コンプトン散乱、電子対生成）により実現されます。

📐 基本法則:
I = I₀ × e^(-μt) × B(μt)

where:
• I₀: 入射線量率
• μ: 線減衰係数
• t: 遮蔽厚さ  
• B: ビルドアップ係数

🎯 実用的ポイント:
• HVL = ln(2)/μ （半価層）
• TVL = ln(10)/μ （1/10価層）
• 安全余裕 = 20-30%程度確保`;
        
        alert(theory);
    } catch (error) {
        console.error('❌ Error showing theory:', error);
        alert("📚 詳細な理論解説は学習コンテンツをご覧ください。");
    }
}

// ステップ詳細表示
function showStepDetails(stepNum) {
    try {
        if (stageData[stepNum]) {
            const stepData = stageData[stepNum];
            const title = stepData.title;
            const objectives = stepData.objectives.map((obj, i) => `${i+1}. ${obj}`).join('\n');
            alert(`${stepData.icon} ${title}\n\n学習目標：\n${objectives}`);
        }
    } catch (error) {
        console.error('❌ Error showing step details:', error);
    }
}

// レベルリスタート
function restartLevel() {
    try {
        if (confirm('現在の進捗をリセットして最初からやり直しますか？\n\n※ これまでの学習履歴は失われます。')) {
            // 進捗リセット
            if (progressManager) {
                progressManager.currentStage = 1;
                progressManager.completedObjectives = {};
                progressManager.calculationCount = 0;
                progressManager.scenarioExperience = {
                    medical: false,
                    research: false,
                    nuclear: false,
                    industrial: false
                };
                
                // UI更新
                progressManager.updateStageContent();
                progressManager.updateUI();
            }
            
            // 結果パネルを隠す
            const resultsPanel = safeGetElement('results-panel');
            if (resultsPanel) {
                resultsPanel.style.display = 'none';
            }
            
            // 履歴クリア
            calculationHistory = [];
            
            // 初期値にリセット
            if (scenarioManager) {
                scenarioManager.updateScenarioDefaults();
            }
            updateVisualization();
            
            console.log('🔄 Level restarted successfully');
            alert('✅ レベル1を最初からやり直します。頑張ってください！');
        }
    } catch (error) {
        handleError(error, 'レベルリスタート');
    }
}

// ウェルカムメッセージ表示
function showWelcomeMessage() {
    try {
        const message = `🛡️ 放射線遮蔽 Level 1 へようこそ！

📚 4段階学習プロセス × シナリオベース学習
✨ 放射線遮蔽研究者向けの実践的ガイドです

🎯 特徴：
• 理論から実践まで4つのステージで段階学習
• 医療・研究・原子力・工業の4分野対応
• リアルタイム3D可視化で直感的理解
• 実際の設計基準に基づいた品質保証

💡 使い方：
1. 上部でシナリオ（施設分野）を選択
2. 右側のパラメータを調整
3. 計算実行で遮蔽効果を確認
4. 各ステージの目標を達成して進歩

🚀 さあ、放射線遮蔽の世界を体験しましょう！`;

        alert(message);
        
        // 目標1を自動的に完了にマーク
        setTimeout(() => {
            if (progressManager) {
                progressManager.updateObjective(1, true);
            }
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error showing welcome message:', error);
    }
}

// グローバルエラーハンドリング
window.addEventListener('error', function(event) {
    console.error('💥 Global error:', event.error);
    if (event.error && event.error.message) {
        if (event.error.message.includes('THREE')) {
            console.warn('⚠️ 3D display error, but calculations will work normally');
        } else if (event.error.message.includes('Chart')) {
            console.warn('⚠️ Chart display error, but core functions will work');
        }
    }
});

// パフォーマンス監視
if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark('level1-init-start');
    window.addEventListener('load', () => {
        try {
            performance.mark('level1-init-end');
            performance.measure('level1-init', 'level1-init-start', 'level1-init-end');
            const measure = performance.getEntriesByName('level1-init')[0];
            console.log(`⚡ Level 1 initialization completed in ${measure.duration.toFixed(1)}ms`);
        } catch (error) {
            console.log('⚡ Level 1 initialization completed');
        }
    });
}

console.log('🎉 Enhanced Level 1 Interactive Guide - Ready!');