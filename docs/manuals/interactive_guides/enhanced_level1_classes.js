// =============== クラス定義 ===============

// 学習進捗管理システム (強化版)
class EnhancedLearningProgressManager {
    constructor() {
        this.currentStage = 1;
        this.totalStages = 4;
        this.stageProgress = [0, 0, 0, 0]; // 各段階の進捗率
        this.completedObjectives = {};
        this.startTime = Date.now();
        this.stageStartTimes = {};
        this.calculationCount = 0;
        this.scenarioExperience = {
            medical: false,
            research: false,
            nuclear: false,
            industrial: false
        };
        this.updateUI();
    }

    nextStage() {
        if (this.currentStage < this.totalStages) {
            this.stageProgress[this.currentStage - 1] = 100;
            this.currentStage++;
            this.stageStartTimes[this.currentStage] = Date.now();
            this.updateStageContent();
            this.updateUI();
            this.resetObjectives();
        } else {
            this.completeLevel();
        }
    }

    updateObjective(objectiveIndex, completed = true) {
        const stageKey = `stage${this.currentStage}`;
        if (!this.completedObjectives[stageKey]) {
            this.completedObjectives[stageKey] = {};
        }
        this.completedObjectives[stageKey][objectiveIndex] = completed;
        
        // UIを更新
        const objectiveElement = document.getElementById(`objective-${objectiveIndex}`);
        if (objectiveElement) {
            objectiveElement.textContent = completed ? '✓' : '◯';
            objectiveElement.className = completed ? 'objective-item completed' : 'objective-item';
            objectiveElement.textContent += ' ' + stageData[this.currentStage].objectives[objectiveIndex - 1];
        }
        
        // 段階進捗の更新
        this.updateStageProgress();
    }

    updateStageProgress() {
        const stageKey = `stage${this.currentStage}`;
        const objectives = this.completedObjectives[stageKey] || {};
        const completed = Object.values(objectives).filter(v => v).length;
        const total = stageData[this.currentStage].objectives.length;
        this.stageProgress[this.currentStage - 1] = (completed / total) * 100;
        this.updateUI();
        
        // 段階完了チェック
        if (completed === total) {
            this.showStageCompletion();
        }
    }

    showStageCompletion() {
        const completionElement = document.getElementById('stage-completion');
        if (completionElement) {
            completionElement.style.display = 'block';
        }
    }

    updateUI() {
        // ステージインジケーター更新
        const indicators = document.querySelectorAll('.stage-indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.remove('active', 'completed');
            if (index + 1 < this.currentStage) {
                indicator.classList.add('completed');
            } else if (index + 1 === this.currentStage) {
                indicator.classList.add('active');
            }
        });

        // ステージラベル更新
        const labels = document.querySelectorAll('.stage-label');
        labels.forEach((label, index) => {
            label.classList.remove('active');
            if (index + 1 === this.currentStage) {
                label.classList.add('active');
            }
        });

        // 現在ステージ表示更新
        const currentStageData = stageData[this.currentStage];
        const stageTitle = currentStageData.title.split(':')[1]?.trim() || currentStageData.title;
        document.getElementById('current-stage-display').textContent = 
            `Stage ${this.currentStage}/${this.totalStages}: ${stageTitle}`;
        
        // ナビゲーションボタン更新
        document.getElementById('prev-btn').disabled = this.currentStage === 1;
        document.getElementById('next-btn').style.display = 
            this.currentStage === this.totalStages ? 'none' : 'flex';
    }

    updateStageContent() {
        const stage = stageData[this.currentStage];
        
        // アイコンとタイトル更新
        document.getElementById('stage-icon').textContent = stage.icon;
        document.getElementById('stage-title').textContent = stage.title;
        
        // プロセスステップ更新
        const processSteps = document.querySelectorAll('.process-step');
        processSteps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < this.currentStage) {
                step.classList.add('completed');
            } else if (index + 1 === this.currentStage) {
                step.classList.add('active');
            }
        });

        // 可視化パネルの目標更新
        document.getElementById('viz-stage-display').textContent = 
            `Stage ${this.currentStage}: ${stage.title.split(':')[0]}`;
        
        // CSS変数でカラーテーマ更新
        document.documentElement.style.setProperty('--current-stage-color', stage.color);

        // ステージ固有のコンテンツ更新
        this.updateStageSpecificContent();

        // ステージ完了表示を隠す
        const completionElement = document.getElementById('stage-completion');
        if (completionElement) {
            completionElement.style.display = 'none';
        }
    }

    updateStageSpecificContent() {
        const stage = stageData[this.currentStage];
        const scenario = scenarioData[currentScenario];

        // 学習コンテンツの更新
        const contentSection = document.querySelector('.content-section');
        if (contentSection) {
            const titleElement = contentSection.querySelector('.section-title span:last-child');
            if (titleElement) {
                titleElement.textContent = stage.content.title;
            }
            
            const descElement = contentSection.querySelector('p');
            if (descElement) {
                descElement.innerHTML = stage.content.description;
            }
        }

        // ステージ別の数式・概念の更新
        this.updateStageEquations();
    }

    updateStageEquations() {
        const eq = equationDatabase[this.currentStage]?.primary;
        const equationBox = document.querySelector('.equation-box');
        if (equationBox && eq) {
            equationBox.querySelector('.main-equation').innerHTML = eq.formula;
            equationBox.querySelector('.equation-description').textContent = eq.description;
        }
    }

    resetObjectives() {
        const stageKey = `stage${this.currentStage}`;
        this.completedObjectives[stageKey] = {};
        
        // UI目標リセット
        for (let i = 1; i <= 4; i++) {
            const objective = document.getElementById(`objective-${i}`);
            if (objective) {
                const objectiveText = stageData[this.currentStage].objectives[i-1] || '';
                objective.textContent = `◯ ${objectiveText}`;
                objective.className = 'objective-item';
            }
        }
    }

    trackCalculation() {
        this.calculationCount++;
        this.updateObjective(3, true); // 計算実行の目標完了
    }

    trackScenarioExperience() {
        this.scenarioExperience[currentScenario] = true;
    }

    completeLevel() {
        const completionTime = (Date.now() - this.startTime) / 1000;
        const experiencedScenarios = Object.values(this.scenarioExperience).filter(v => v).length;
        
        alert(`🎉 Level 1 完了おめでとうございます！

📊 学習成果:
• 完了時間: ${Math.round(completionTime)}秒
• 実行計算: ${this.calculationCount}回
• 体験シナリオ: ${experiencedScenarios}/4分野
• 習得概念: 4段階学習プロセス完了

🎯 達成度評価:
• 基礎理論: 完全習得
• 材料特性: 完全理解
• 設計手法: 実践完了
• 評価最適化: マスター

🚀 次のステップ:
Level 2: 実用設計チャレンジ
Level 3: 高度解析・MCNP連携

放射線遮蔽の段階的学習を完全にマスターしました！
実際の研究・業務でぜひご活用ください。`);
    }
}

// シナリオ管理システム
class ScenarioManager {
    constructor() {
        this.currentScenario = 'medical';
        this.bindEvents();
    }

    switchScenario(newScenario) {
        if (this.currentScenario === newScenario) return;
        
        this.currentScenario = newScenario;
        currentScenario = newScenario;
        
        // UI更新
        this.updateScenarioUI();
        this.updateScenarioContent();
        this.updateScenarioDefaults();
        this.updateVisualization();
        
        // 学習進捗に記録
        if (progressManager) {
            progressManager.trackScenarioExperience();
        }
    }

    updateScenarioUI() {
        const scenario = scenarioData[this.currentScenario];
        
        // テーマクラス更新
        document.getElementById('body').className = scenario.theme;
        
        // タブの状態更新
        document.querySelectorAll('.scenario-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.scenario === this.currentScenario) {
                tab.classList.add('active');
            }
        });

        // CSS変数更新
        document.documentElement.style.setProperty('--scenario-color', scenario.color);
        document.documentElement.style.setProperty('--scenario-rgb', scenario.rgb);
    }

    updateScenarioContent() {
        const scenario = scenarioData[this.currentScenario];
        
        // シナリオコンテキスト更新
        document.getElementById('scenario-context-title').innerHTML = 
            `<span>${scenario.icon}</span><span>${scenario.context.title}</span>`;
        document.getElementById('scenario-description').innerHTML = 
            scenario.context.description;
        
        // 線量限度更新
        document.getElementById('scenario-specific-limits').textContent = 
            `⚡ ${scenario.name}の線量限度（ICRP 146, 2022）`;
        document.getElementById('dose-limits-content').innerHTML = 
            scenario.context.limits;
        
        // パラメータセクション更新
        document.getElementById('scenario-params-title').innerHTML = 
            `<span>${scenario.icon}</span><span>${scenario.context.params.title}</span>`;
        document.getElementById('scenario-params-description').textContent = 
            scenario.context.params.description;
        
        // 可視化ヘッダー更新
        const nuclideText = document.getElementById('nuclide-select').options[document.getElementById('nuclide-select').selectedIndex].text;
        document.getElementById('current-scenario-display').textContent = 
            `${scenario.name}用${nuclideText}`;
    }

    updateScenarioDefaults() {
        const defaults = scenarioDefaults[this.currentScenario];
        const scenario = scenarioData[this.currentScenario];
        
        // 核種選択肢の更新
        const nuclideSelect = document.getElementById('nuclide-select');
        Array.from(nuclideSelect.options).forEach(option => {
            option.style.display = scenario.nuclides.includes(option.value) ? 'block' : 'none';
        });
        
        // デフォルト値の設定
        document.getElementById('nuclide-select').value = defaults.nuclide;
        document.getElementById('activity-slider').value = defaults.activity;
        document.getElementById('material-select').value = defaults.material;
        document.getElementById('thickness-slider').value = defaults.thickness;
        document.getElementById('distance-slider').value = defaults.distance;
        
        // スライダー表示更新
        updateSliderDisplays();
    }

    updateVisualization() {
        if (visualizer) {
            const material = document.getElementById('material-select').value;
            const thickness = parseFloat(document.getElementById('thickness-slider').value);
            visualizer.updateShield(material, thickness);
            visualizer.updateScenarioColors(this.currentScenario);
        }
    }

    bindEvents() {
        document.querySelectorAll('.scenario-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchScenario(tab.dataset.scenario);
            });
        });
    }
}

// 3D可視化システム（強化版）
class Enhanced3DVisualizer {
    constructor(container) {
        this.container = container;
        this.isAnimating = false;
        this.particleSystem = null;
        this.init();
        this.createObjects();
        this.animate();
        this.setupEventListeners();
    }

    init() {
        // シーン作成
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8fafc);

        // カメラ設定
        camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        camera.position.set(5, 5, 8);
        camera.lookAt(0, 0, 0);

        // レンダラー設定
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(renderer.domElement);

        // ライティング
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        // 座標軸
        const axesHelper = new THREE.AxesHelper(3);
        scene.add(axesHelper);

        // マウスコントロール
        this.setupMouseControls();
    }

    setupMouseControls() {
        let isMouseDown = false;
        let mouseX = 0, mouseY = 0;
        let targetRotationX = 0, targetRotationY = 0;
        let rotationX = 0, rotationY = 0;

        this.container.addEventListener('mousedown', (event) => {
            isMouseDown = true;
            mouseX = event.clientX;
            mouseY = event.clientY;
        });

        this.container.addEventListener('mousemove', (event) => {
            if (!isMouseDown) return;
            
            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;
            
            targetRotationY += deltaX * 0.01;
            targetRotationX += deltaY * 0.01;
            
            mouseX = event.clientX;
            mouseY = event.clientY;
        });

        this.container.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        // スムーズな回転
        const updateRotation = () => {
            rotationX += (targetRotationX - rotationX) * 0.05;
            rotationY += (targetRotationY - rotationY) * 0.05;
            
            const radius = 10;
            camera.position.x = radius * Math.sin(rotationY) * Math.cos(rotationX);
            camera.position.y = radius * Math.sin(rotationX);
            camera.position.z = radius * Math.cos(rotationY) * Math.cos(rotationX);
            camera.lookAt(0, 0, 0);
            
            requestAnimationFrame(updateRotation);
        };
        updateRotation();
    }

    createObjects() {
        // 線源 (赤い球)
        const sourceGeom = new THREE.SphereGeometry(0.3, 32, 32);
        const sourceMat = new THREE.MeshLambertMaterial({ 
            color: 0xff4444,
            emissive: 0x220000
        });
        sourceObject = new THREE.Mesh(sourceGeom, sourceMat);
        sourceObject.position.set(-3, 0, 0);
        sourceObject.castShadow = true;
        scene.add(sourceObject);

        // 遮蔽材（可変）
        this.updateShield('concrete', 1.0);

        // 検出器 (緑の点)
        const detectorGeom = new THREE.SphereGeometry(0.2, 16, 16);
        const detectorMat = new THREE.MeshLambertMaterial({ 
            color: 0x44ff44,
            emissive: 0x002200
        });
        detectorObject = new THREE.Mesh(detectorGeom, detectorMat);
        detectorObject.position.set(3, 0, 0);
        scene.add(detectorObject);

        // 距離ライン
        this.createDistanceLine();

        // 床面
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xf0f0f0,
            transparent: true,
            opacity: 0.5
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        floor.receiveShadow = true;
        scene.add(floor);

        // 放射線パーティクルシステム
        this.createParticleSystem();
    }

    updateShield(material, thickness) {
        // 既存の遮蔽材削除
        if (shieldObject) {
            scene.remove(shieldObject);
        }

        if (thickness > 0) {
            const materialData = physicsDatabase.materials[material];
            const shieldGeom = new THREE.BoxGeometry(thickness, 2, 2);
            const shieldMat = new THREE.MeshLambertMaterial({ 
                color: materialData.color,
                transparent: true,
                opacity: 0.7
            });
            shieldObject = new THREE.Mesh(shieldGeom, shieldMat);
            shieldObject.position.set(0, 0, 0);
            shieldObject.castShadow = true;
            shieldObject.receiveShadow = true;
            scene.add(shieldObject);
        }
        
        this.createDistanceLine();
    }

    updateDetectorPosition(distance) {
        if (detectorObject) {
            detectorObject.position.x = (distance / 100) * 3; // スケール調整
            this.createDistanceLine();
        }
    }

    createDistanceLine() {
        // 既存のライン削除
        const existingLine = scene.getObjectByName('distanceLine');
        if (existingLine) scene.remove(existingLine);

        // 新しいライン作成
        if (sourceObject && detectorObject) {
            const points = [
                sourceObject.position.clone(),
                detectorObject.position.clone()
            ];

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineDashedMaterial({ 
                color: 0x888888,
                dashSize: 0.2,
                gapSize: 0.1
            });
            const line = new THREE.Line(geometry, material);
            line.computeLineDistances();
            line.name = 'distanceLine';
            scene.add(line);
        }
    }

    createParticleSystem() {
        if (!sourceObject) return;
        
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // 線源位置からスタート
            positions[i3] = sourceObject.position.x;
            positions[i3 + 1] = sourceObject.position.y + (Math.random() - 0.5) * 0.2;
            positions[i3 + 2] = sourceObject.position.z + (Math.random() - 0.5) * 0.2;
            
            // 速度設定
            velocities[i3] = 0.05 + Math.random() * 0.03;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xff6666,
            size: 0.1,
            transparent: true,
            opacity: 0.8
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        scene.add(this.particleSystem);
    }

    toggleAnimation() {
        this.isAnimating = !this.isAnimating;
        const btn = document.getElementById('animation-toggle');
        if (btn) {
            btn.textContent = this.isAnimating ? '⏸️' : '▶️';
            btn.title = this.isAnimating ? '停止' : '放射線アニメーション';
        }
    }

    updateScenarioColors(scenario) {
        const scenarioConfig = scenarioData[scenario];
        if (sourceObject) {
            sourceObject.material.emissive.setHex(0x220000);
        }
        if (detectorObject) {
            detectorObject.material.emissive.setHex(0x002200);
        }
    }

    animate() {
        const render = () => {
            requestAnimationFrame(render);
            
            // 線源回転
            if (sourceObject) {
                sourceObject.rotation.y += 0.01;
            }
            
            // パーティクルアニメーション
            if (this.particleSystem && this.isAnimating) {
                this.updateParticles();
            }
            
            renderer.render(scene, camera);
        };
        render();
    }

    updateParticles() {
        if (!this.particleSystem || !sourceObject || !detectorObject) return;
        
        const positions = this.particleSystem.geometry.attributes.position.array;
        const velocities = this.particleSystem.geometry.attributes.velocity.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            // パーティクル移動
            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];
            
            // 範囲外になったらリセット
            if (positions[i] > detectorObject.position.x + 1) {
                positions[i] = sourceObject.position.x;
                positions[i + 1] = sourceObject.position.y + (Math.random() - 0.5) * 0.2;
                positions[i + 2] = sourceObject.position.z + (Math.random() - 0.5) * 0.2;
            }
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    setupEventListeners() {
        // リサイズ対応
        window.addEventListener('resize', () => {
            camera.aspect = this.container.clientWidth / this.container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });
    }
}

// 計算エンジン（強化版）
class EnhancedShieldingCalculator {
    constructor() {
        this.safetyLimit = 2.5; // μSv/h (デフォルト)
    }

    setSafetyLimit(limit) {
        this.safetyLimit = limit;
    }

    calculate(nuclide, activity, material, thickness, distance) {
        const nuclideData = physicsDatabase.nuclides[nuclide];
        const materialData = physicsDatabase.materials[material];
        
        // 基本計算
        const mu = materialData.muMass * materialData.density;
        const buildup = this.calculateBuildup(mu, thickness);
        const geometricFactor = 1 / (4 * Math.PI * Math.pow(distance / 100, 2)); // cm to m
        const initialDoseRate = (activity / 37) * nuclideData.gammaConstant * geometricFactor;
        const finalDoseRate = initialDoseRate * Math.exp(-mu * thickness) * buildup;
        
        // 追加計算
        const hvl = Math.log(2) / mu;
        const tvl = Math.log(10) / mu;
        const attenuationFactor = Math.exp(-mu * thickness);
        
        // 安全性評価
        const safetyStatus = this.evaluateSafety(finalDoseRate);
        const safetyMargin = finalDoseRate <= this.safetyLimit ? 
            ((this.safetyLimit - finalDoseRate) / this.safetyLimit * 100) : 0;
        
        return {
            initialDoseRate: Math.max(initialDoseRate, 0.001),
            finalDoseRate: Math.max(finalDoseRate, 0.001),
            attenuationFactor: attenuationFactor,
            attenuationPercent: (1 - attenuationFactor) * 100,
            buildup: buildup,
            hvl: hvl,
            tvl: tvl,
            safetyStatus: safetyStatus,
            safetyMargin: safetyMargin,
            requiredThickness: this.calculateRequiredThickness(initialDoseRate, mu, buildup),
            costEstimate: this.estimateCost(material, thickness)
        };
    }

    calculateBuildup(mu, thickness) {
        const mut = mu * thickness;
        if (mut < 0.1) return 1.0;
        
        // Taylor buildup approximation
        const b = 2.5; // typical value for gamma rays
        return 1 + (b - 1) * mut * Math.exp(-mut);
    }

    evaluateSafety(doseRate) {
        if (doseRate <= this.safetyLimit) return 'safe';
        if (doseRate <= this.safetyLimit * 2) return 'warning';
        return 'danger';
    }

    calculateRequiredThickness(initialDoseRate, mu, buildup) {
        if (initialDoseRate <= this.safetyLimit) return 0;
        
        // 反復計算で必要厚さを求める
        let thickness = 0;
        let step = 1;
        
        for (let i = 0; i < 100; i++) {
            const testBuildup = this.calculateBuildup(mu, thickness);
            const testDoseRate = initialDoseRate * Math.exp(-mu * thickness) * testBuildup;
            
            if (testDoseRate <= this.safetyLimit) {
                break;
            }
            
            thickness += step;
            
            if (thickness > 200) break; // 安全装置
        }
        
        return thickness;
    }

    estimateCost(material, thickness) {
        const materialData = physicsDatabase.materials[material];
        const volume = thickness * 2 * 2 / 1000; // m³に変換（仮定サイズ）
        return volume * materialData.cost * 1000; // 相対コスト
    }
}

// チャート管理（強化版）
class EnhancedChartManager {
    constructor() {
        this.chart = null;
        this.initializeChart();
    }

    initializeChart() {
        const ctx = document.getElementById('comparison-chart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['遮蔽前', '遮蔽後', '基準値'],
                datasets: [{
                    label: '線量率 (μSv/h)',
                    data: [0, 0, 2.5],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(234, 179, 8, 0.8)'
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(34, 197, 94, 1)',
                        'rgba(234, 179, 8, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: '線量率 (μSv/h)'
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: '遮蔽効果の比較',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        });
    }

    updateChart(initialDoseRate, finalDoseRate, safetyLimit) {
        if (this.chart) {
            this.chart.data.datasets[0].data = [
                Math.max(initialDoseRate, 0.001),
                Math.max(finalDoseRate, 0.001),
                safetyLimit || 2.5
            ];
            this.chart.update();
        }
    }
}