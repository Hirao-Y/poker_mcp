                        position: source.position,
                        nuclide: source.nuclide,
                        activity: source.activity
                    };
                });

                this.manager.visualization3D.shields.forEach((shield, name) => {
                    data.shields[name] = {
                        type: shield.type,
                        parameters: shield.parameters,
                        material: shield.material
                    };
                });

                this.manager.visualization3D.detectors.forEach((detector, name) => {
                    data.detectors[name] = {
                        points: detector.points,
                        origin: detector.origin,
                        grid: detector.grid
                    };
                });
            }

            // JSONファイルとしてダウンロード
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `shielding_visualization_step_${this.manager.currentStep}.json`;
            link.click();

            URL.revokeObjectURL(url);
            console.log('💾 可視化データをエクスポートしました');

        } catch (error) {
            console.error('❌ データエクスポートエラー:', error);
        }
    }

    // 設定をリセット
    resetSettings() {
        // デフォルト値に戻す
        document.getElementById('showGrid').checked = true;
        document.getElementById('showAxes').checked = true;
        document.getElementById('showDoseField').checked = true;
        document.getElementById('materialOpacity').value = '0.7';
        document.getElementById('opacityValue').textContent = '0.7';
        document.getElementById('colorMap').value = 'viridis';
        document.getElementById('showWireframe').checked = false;
        document.getElementById('enableShadows').checked = true;
        document.getElementById('highQuality').checked = true;

        // 設定を適用
        this.manager.updateVisualizationConfig({
            showGrid: true,
            showAxes: true,
            showDoseField: true,
            materialOpacity: 0.7,
            doseColorMap: 'viridis'
        });

        this.toggleWireframe(false);
        this.toggleShadows(true);
        this.toggleHighQuality(true);
        this.resetCameraPosition();

        console.log('🔄 設定をリセットしました');
    }
}

// CSS スタイル追加
const controlPanelCSS = `
<style>
.viz-control-panel {
    position: fixed;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    width: 320px;
    max-height: 80vh;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    z-index: 1000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow-y: auto;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 123, 255, 0.1);
    border-radius: 12px 12px 0 0;
}

.panel-header h3 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.1rem;
    font-weight: 600;
}

.close-btn {
    background: none;
    border: none;
    font-size: 18px;
    color: #666;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    transition: all 0.2s ease;
}

.close-btn:hover {
    background: rgba(255, 0, 0, 0.1);
    color: #e74c3c;
}

.panel-content {
    padding: 20px;
    max-height: calc(80vh - 80px);
    overflow-y: auto;
}

.control-section {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.control-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.control-section h4 {
    margin: 0 0 12px 0;
    color: #34495e;
    font-size: 0.95rem;
    font-weight: 600;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.control-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #555;
    cursor: pointer;
}

.control-group input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #007bff;
}

.control-group input[type="range"] {
    flex: 1;
    margin: 0 8px;
}

.control-group select {
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    background: white;
}

.control-btn {
    padding: 8px 12px;
    margin: 2px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    color: #555;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.control-btn:hover {
    background: #f8f9fa;
    border-color: #007bff;
    color: #007bff;
    transform: translateY(-1px);
}

.control-btn:active {
    transform: translateY(0);
}

.help-text {
    font-size: 0.8rem;
    color: #666;
    line-height: 1.4;
}

.help-text ul {
    margin: 5px 0 5px 15px;
    padding: 0;
}

.help-text li {
    margin: 2px 0;
}

.help-text p {
    margin: 8px 0 4px 0;
    font-weight: 500;
}

/* スクロールバー */
.viz-control-panel::-webkit-scrollbar {
    width: 6px;
}

.viz-control-panel::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 3px;
}

.viz-control-panel::-webkit-scrollbar-thumb {
    background: rgba(0, 123, 255, 0.3);
    border-radius: 3px;
}

.viz-control-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 123, 255, 0.5);
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
    .viz-control-panel {
        right: 10px;
        width: 280px;
    }
}

@media (max-width: 480px) {
    .viz-control-panel {
        right: 5px;
        left: 5px;
        width: auto;
        max-height: 70vh;
    }
}
</style>
`;

// CSS を DOM に追加
document.head.insertAdjacentHTML('beforeend', controlPanelCSS);

// グローバル登録
window.VisualizationControlPanel = VisualizationControlPanel;
console.log('✅ VisualizationControlPanel読み込み完了');
