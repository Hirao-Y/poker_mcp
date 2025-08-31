        function emergencyDiagnosis() {
            console.log('🔬 緊急クラス診断開始...');
            resultsDiv.innerHTML = '';

            const diagnostics = {
                // 基本的なスクリプト情報
                totalScripts: document.scripts.length,
                scriptSources: Array.from(document.scripts).map(s => s.src || 'inline').filter(s => s !== 'inline'),
                
                // グローバルオブジェクトの状態
                windowKeys: Object.keys(window).filter(k => 
                    k.toLowerCase().includes('tutorial') || 
                    k.toLowerCase().includes('physics') || 
                    k.toLowerCase().includes('cross')
                ),
                
                // 具体的なクラス確認
                Tutorial: {
                    exists: typeof window.Tutorial !== 'undefined',
                    type: typeof window.Tutorial,
                    isFunction: typeof window.Tutorial === 'function',
                    constructor: window.Tutorial?.name,
                    prototype: !!window.Tutorial?.prototype
                },
                
                PokerMCPTutorial: {
                    exists: typeof window.PokerMCPTutorial !== 'undefined',
                    type: typeof window.PokerMCPTutorial,
                    isFunction: typeof window.PokerMCPTutorial === 'function',
                    constructor: window.PokerMCPTutorial?.name,
                    prototype: !!window.PokerMCPTutorial?.prototype
                },
                
                PhysicsValidator: {
                    exists: typeof window.PhysicsValidator !== 'undefined',
                    type: typeof window.PhysicsValidator,
                    isFunction: typeof window.PhysicsValidator === 'function'
                },
                
                CrossSectionVisualizer: {
                    exists: typeof window.CrossSectionVisualizer !== 'undefined',
                    type: typeof window.CrossSectionVisualizer,
                    isFunction: typeof window.CrossSectionVisualizer === 'function'
                },
                
                // 特別な状態確認
                tutorialClassReady: !!window.tutorialClassReady,
                tutorialObject: {
                    exists: !!window.tutorial,
                    type: typeof window.tutorial,
                    constructor: window.tutorial?.constructor?.name
                },
                
                // エラー情報
                lastError: window.lastTutorialError || 'None',
                consoleErrors: 'Check browser console for detailed errors'
            };

            addResult('緊急クラス診断', 'info',
                '完全なクラス状態診断を実行しました',
                `診断結果:\n${JSON.stringify(diagnostics, null, 2)}`
            );

            // 具体的な修復提案
            const recommendations = [];
            
            if (!diagnostics.Tutorial.exists && !diagnostics.PokerMCPTutorial.exists) {
                recommendations.push('❌ Tutorial系クラスが全く見つかりません → 「📜 必須スクリプト強制読み込み」を実行');
            } else if (diagnostics.PokerMCPTutorial.exists && !diagnostics.Tutorial.exists) {
                recommendations.push('⚠️ PokerMCPTutorialは存在するがTutorialエイリアスがありません → エイリアス作成を実行');
                // 即座エイリアス作成
                try {
                    window.Tutorial = window.PokerMCPTutorial;
                    window.tutorialClassReady = true;
                    recommendations.push('✅ エイリアス作成実行: window.Tutorial = window.PokerMCPTutorial');
                } catch (error) {
                    recommendations.push('❌ エイリアス作成失敗: ' + error.message);
                }
            } else if (diagnostics.Tutorial.exists) {
                recommendations.push('✅ Tutorialクラスは存在します → Tutorial初期化を実行');
                
                // Tutorial初期化を試行
                try {
                    if (!window.tutorial) {
                        window.tutorial = new window.Tutorial();
                        recommendations.push('✅ Tutorialオブジェクト作成成功');
                    }
                } catch (error) {
                    recommendations.push('❌ Tutorialオブジェクト作成失敗: ' + error.message);
                }
            }

            if (!diagnostics.PhysicsValidator.exists) {
                recommendations.push('⚠️ PhysicsValidatorが見つかりません → 「💉 手動スクリプト注入」を実行');
            }

            if (!diagnostics.CrossSectionVisualizer.exists) {
                recommendations.push('⚠️ CrossSectionVisualizerが見つかりません → 「💉 手動スクリプト注入」を実行');
            }

            addResult('修復提案', 'warning',
                '診断に基づく修復提案',
                recommendations.join('\n')
            );

            // 最終テスト実行
            setTimeout(() => {
                const finalTest = {
                    Tutorial: typeof window.Tutorial === 'function',
                    PokerMCPTutorial: typeof window.PokerMCPTutorial === 'function',
                    tutorialObject: !!window.tutorial,
                    readyForLearning: typeof window.Tutorial === 'function' && !!window.tutorial
                };

                addResult('最終確認', 
                    finalTest.readyForLearning ? 'success' : 'warning',
                    finalTest.readyForLearning ? 
                        '学習開始準備完了！index.htmlに移動可能です' : 
                        '追加の修復が必要です',
                    `最終状態:\n${JSON.stringify(finalTest, null, 2)}`
                );
            }, 1000);
        }