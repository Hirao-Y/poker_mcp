// 軽量可視化システム v1.0
class LightweightVisualizationSystem {
    constructor(canvasId) {
        console.log('🎨 軽量可視化システム初期化開始...');
        
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId);
        this.ctx = null;
        this.mode = '2d';
        
        // データストレージ
        this.sources = new Map();
        this.shields = new Map();
        this.detectors = new Map();
        
        // アニメーション
        this.animationId = null;
        this.isAnimating = false;
        this.animationTime = 0;
        
        // 設定
        this.config = {
            backgroundColor: '#f0f8ff',
            gridColor: '#e0e0e0',
            axesColor: '#333',
            sourceColor: '#ff0000',
            shieldColor: '#c0c0c0',
            detectorColor: '#00ff00'
        };
        
        this.initialize();
    }
    
    async initialize() {
        if (!this.canvas) {
            console.error('❌ Canvas要素が見つかりません');
            this.showMessage('Canvas要素が見つかりません', 'error');
            return false;
        }
        
        try {
            // Canvas2D初期化
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error('Canvas 2D Context取得失敗');
            }
            
            // Canvas設定
            this.setupCanvas();
            
            // 初期レンダリング
            this.render();
            
            // アニメーション開始
            this.startAnimation();
            
            this.showMessage('軽量可視化システム初期化完了', 'success');
            console.log('✅ 軽量可視化システム初期化完了');
            
            return true;
            
        } catch (error) {
            console.error('❌ 可視化システム初期化エラー:', error);
            this.showMessage(`初期化エラー: ${error.message}`, 'error');
            return false;
        }
    }
    
    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        
        // Canvas内部サイズ設定
        this.canvas.width = rect.width * ratio;
        this.canvas.height = rect.height * ratio;
        
        // Canvas表示サイズ設定
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // コンテキストスケール設定
        this.ctx.scale(ratio, ratio);
        
        console.log(`📏 Canvas設定完了: ${rect.width}x${rect.height} (ratio: ${ratio})`);
    }
    
    // データ操作
    addRadiationSource(name, position, nuclide, activity) {
        const sourceData = {
            name: name || 'unknown_source',
            position: Array.isArray(position) ? position : [0, 0, 0],
            nuclide: nuclide || 'Unknown',
            activity: activity || 0,
            type: 'source'
        };
        
        this.sources.set(name, sourceData);
        this.render();
        
        console.log(`📍 線源追加: ${name} (${nuclide})`);
        this.showMessage(`線源追加: ${name}`, 'success');
        
        return sourceData;
    }
    
    addShield(name, type, parameters, material) {
        const shieldData = {
            name: name || 'unknown_shield',
            type: type || 'SPH',
            parameters: parameters || { center: [0, 0, 0], radius: 50 },
            material: material || 'CONCRETE',
            objType: 'shield'
        };
        
        this.shields.set(name, shieldData);
        this.render();
        
        console.log(`🛡️ 遮蔽体追加: ${name} (${material})`);
        this.showMessage(`遮蔽体追加: ${name}`, 'success');
        
        return shieldData;
    }
    
    addDetector(name, origin, grid) {
        const detectorData = {
            name: name || 'unknown_detector',
            origin: Array.isArray(origin) ? origin : [0, 0, 0],
            grid: grid || [],
            type: 'detector'
        };
        
        this.detectors.set(name, detectorData);
        this.render();
        
        console.log(`🔍 検出器追加: ${name}`);
        this.showMessage(`検出器追加: ${name}`, 'success');
        
        return detectorData;
    }
    
    clearAll() {
        this.sources.clear();
        this.shields.clear();
        this.detectors.clear();
        this.render();
        
        console.log('🗑️ 全要素クリア');
        this.showMessage('全要素をクリアしました', 'success');
    }
    
    // レンダリング
    render() {
        if (!this.ctx) return;
        
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // 背景クリア
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = this.config.backgroundColor;
        this.ctx.fillRect(0, 0, width, height);
        
        // グリッド描画
        this.drawGrid(width, height);
        
        // 座標軸描画
        this.drawAxes(centerX, centerY);
        
        // オブジェクト描画（背面から前面へ）
        this.shields.forEach(shield => this.drawShield(shield, centerX, centerY));
        this.sources.forEach(source => this.drawSource(source, centerX, centerY));
        this.detectors.forEach(detector => this.drawDetector(detector, centerX, centerY));
        
        // 情報表示
        this.drawInfo();
    }
    
    drawGrid(width, height) {
        this.ctx.strokeStyle = this.config.gridColor;
        this.ctx.lineWidth = 1;
        
        const gridSpacing = 20;
        
        // 縦線
        for (let x = 0; x <= width; x += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // 横線
        for (let y = 0; y <= height; y += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
    
    drawAxes(centerX, centerY) {
        this.ctx.strokeStyle = this.config.axesColor;
        this.ctx.lineWidth = 2;
        
        // X軸
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(this.canvas.clientWidth, centerY);
        this.ctx.stroke();
        
        // Y軸
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, 0);
        this.ctx.lineTo(centerX, this.canvas.clientHeight);
        this.ctx.stroke();
        
        // 軸ラベル
        this.ctx.fillStyle = this.config.axesColor;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('X', this.canvas.clientWidth - 20, centerY - 10);
        this.ctx.fillText('Y', centerX + 10, 20);
        
        // 原点
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    drawSource(source, centerX, centerY) {
        // アニメーション効果
        const time = this.animationTime * 0.003;
        const glowIntensity = 0.4 + Math.sin(time) * 0.3;
        
        // 位置計算（簡単なため中央に固定）
        const x = centerX;
        const y = centerY;
        
        // 外側輝き効果
        const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 25);
        glowGradient.addColorStop(0, `rgba(255, 100, 100, ${glowIntensity})`);
        glowGradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 25, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // メイン線源
        this.ctx.fillStyle = this.config.sourceColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 10, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // 輪郭
        this.ctx.strokeStyle = '#cc0000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // 放射線効果
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 0.5;
            const x1 = x + Math.cos(angle) * 15;
            const y1 = y + Math.sin(angle) * 15;
            const x2 = x + Math.cos(angle) * 22;
            const y2 = y + Math.sin(angle) * 22;
            
            this.ctx.strokeStyle = `rgba(255, 200, 0, ${glowIntensity})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
        
        // ラベル
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(source.nuclide, x, y + 4);
        
        // 線源名（下部）
        this.ctx.fillStyle = '#000';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(source.name, x, y + 35);
    }
    
    drawShield(shield, centerX, centerY) {
        const material = shield.material;
        const isLead = material === 'LEAD';
        
        // 色設定
        const strokeColor = isLead ? '#333' : '#888';
        const fillColor = isLead ? 'rgba(80, 80, 80, 0.3)' : 'rgba(192, 192, 192, 0.3)';
        
        this.ctx.strokeStyle = strokeColor;
        this.ctx.fillStyle = fillColor;
        this.ctx.lineWidth = isLead ? 4 : 3;
        
        if (shield.type === 'SPH') {
            const radius = (shield.parameters.radius || 50) * 0.8; // スケール調整
            
            // 塗りつぶし
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // 輪郭
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.ctx.stroke();
            
            // パターン（材料表現）
            if (isLead) {
                // 鉛の密度表現
                for (let i = 0; i < 3; i++) {
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, radius * (0.3 + i * 0.2), 0, 2 * Math.PI);
                    this.ctx.strokeStyle = `rgba(80, 80, 80, ${0.2 - i * 0.05})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
            
            // ラベル
            this.ctx.fillStyle = strokeColor;
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                material,
                centerX + radius + 15,
                centerY - radius + 25
            );
            
            // 寸法表示
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(
                `R=${shield.parameters.radius || 50}cm`,
                centerX + radius + 15,
                centerY - radius + 40
            );
        }
    }
    
    drawDetector(detector, centerX, centerY) {
        const detectorCount = detector.grid.length > 0 ? 
            (detector.grid[0].number || 5) : 1;
        
        // 検出器配列の描画
        for (let i = 0; i < detectorCount; i++) {
            const x = centerX + 100 + i * 20; // 右側に配置
            const y = centerY + (i - detectorCount/2) * 15; // 縦方向に分散
            
            // アクティビティインジケータ
            const time = this.animationTime * 0.002;
            const activity = 0.6 + Math.sin(time + i) * 0.4;
            
            // 検出器本体
            this.ctx.fillStyle = this.config.detectorColor;
            this.ctx.fillRect(x - 6, y - 6, 12, 12);
            
            // アクティビティ表示
            this.ctx.fillStyle = `rgba(0, 255, 0, ${activity})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // 検出器枠
            this.ctx.strokeStyle = '#006600';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x - 6, y - 6, 12, 12);
            
            // カウント表示（模擬）
            const count = Math.floor(1000 + Math.sin(time + i) * 200);
            this.ctx.fillStyle = '#006600';
            this.ctx.font = '8px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(count.toString(), x, y + 20);
        }
        
        // 検出器ラベル
        this.ctx.fillStyle = '#006600';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(detector.name, centerX + 100, centerY - 40);
        this.ctx.font = '10px Arial';
        this.ctx.fillText(`${detectorCount} channels`, centerX + 100, centerY - 25);
    }
    
    drawInfo() {
        // システム情報表示
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('2D可視化モード', 15, 25);
        
        // 統計情報
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`線源: ${this.sources.size}個`, 15, 45);
        this.ctx.fillText(`遮蔽体: ${this.shields.size}個`, 15, 60);
        this.ctx.fillText(`検出器: ${this.detectors.size}個`, 15, 75);
        
        // 時刻表示
        const time = new Date().toLocaleTimeString();
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(time, this.canvas.clientWidth - 15, 20);
    }
    
    // テスト描画
    testDraw() {
        console.log('🧪 テスト描画実行');
        
        // サンプルデータ作成
        this.addRadiationSource('co60_test', [0, 0, 0], 'Co-60', 37000000000);
        this.addShield('concrete_test', 'SPH', { center: [0, 0, 0], radius: 60 }, 'CONCRETE');
        this.addShield('lead_test', 'SPH', { center: [0, 0, 0], radius: 25 }, 'LEAD');
        this.addDetector('detector_array', [100, 0, 0], [{ edge: [10, 0, 0], number: 5 }]);
        
        this.showMessage('テスト描画完了：Co-60医療遮蔽モデル', 'success');
    }
    
    // アニメーション
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        console.log('🎬 アニメーション開始');
        this.animate();
    }
    
    animate() {
        if (!this.isAnimating) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        this.animationTime = Date.now();
        this.render();
    }
    
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            console.log('⏸️ アニメーション停止');
        }
    }
    
    // ユーティリティ
    showMessage(message, type = 'info') {
        console.log(`💬 ${message}`);
        
        const messageElement = document.getElementById('visualizationMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `viz-message ${type}`;
        }
        
        // 自動消去（成功メッセージの場合）
        if (type === 'success') {
            setTimeout(() => {
                if (messageElement) {
                    messageElement.textContent = '可視化システム動作中...';
                    messageElement.className = 'viz-message';
                }
            }, 3000);
        }
    }
    
    getDiagnosticInfo() {
        return {
            mode: this.mode,
            canvasSize: {
                width: this.canvas ? this.canvas.clientWidth : 0,
                height: this.canvas ? this.canvas.clientHeight : 0
            },
            sources: this.sources.size,
            shields: this.shields.size,
            detectors: this.detectors.size,
            hasCanvas2D: !!this.ctx,
            isAnimating: this.isAnimating,
            animationTime: this.animationTime,
            totalObjects: this.sources.size + this.shields.size + this.detectors.size
        };
    }
    
    // リサイズ対応
    handleResize() {
        if (this.ctx && this.canvas) {
            this.setupCanvas();
            this.render();
            console.log('📐 Canvas リサイズ処理完了');
        }
    }
    
    // 破棄
    dispose() {
        this.stopAnimation();
        this.sources.clear();
        this.shields.clear();
        this.detectors.clear();
        
        console.log('🗑️ 可視化システム破棄完了');
    }
}

// グローバル登録
window.LightweightVisualizationSystem = LightweightVisualizationSystem;
console.log('✅ LightweightVisualizationSystem読み込み完了');
