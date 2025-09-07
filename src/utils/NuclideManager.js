/**
 * 子孫核種自動補間ユーティリティ
 * マニフェスト enhanced_features.nuclide_management に基づく実装
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

class NuclideManager {
    constructor(options = {}) {
        this.contributionThreshold = options.contribution_threshold || 0.05;
        this.userConfirmation = options.user_confirmation !== false;
        this.databaseFile = options.database_file || 'src/data/ICRP-07.NDX';
        this.nuclideData = new Map();
        this.decayChains = new Map();
    }

    /**
     * ICRP-07データベースの読み込み
     */
    async loadNuclideDatabase() {
        try {
            logger.info('ICRP-07データベースを読み込み中...', { 
                databaseFile: this.databaseFile 
            });
            
            const dataPath = path.resolve(this.databaseFile);
            logger.info('データベースファイル解決パス', { dataPath });
            
            // ファイル存在確認
            await fs.access(dataPath);
            
            const content = await fs.readFile(dataPath, 'utf8');
            logger.info('ファイル読み込み完了', { 
                fileSize: content.length,
                lineCount: content.split('\n').length 
            });
            
            this.parseICRPData(content);
            
            logger.info(`核種データベース読み込み完了`, {
                totalNuclides: this.nuclideData.size,
                decayChains: this.decayChains.size,
                // サンプル核種の表示
                sampleNuclides: Array.from(this.nuclideData.keys()).slice(0, 5)
            });
            
        } catch (error) {
            logger.error('核種データベースの読み込みエラー', { 
                error: error.message,
                databaseFile: this.databaseFile,
                resolvedPath: path.resolve(this.databaseFile)
            });
            throw new Error(`核種データベース読み込み失敗: ${error.message}`);
        }
    }

    /**
     * ICRP-07データの解析
     * @param {string} content - ファイル内容
     */
    parseICRPData(content) {
        const lines = content.split('\n');
        let parsedCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // より適切なヘッダー行スキップ
            if (i === 0 || line.length < 100 || line.includes('Copyright')) continue;
            
            try {
                const nuclide = this.parseNuclideLine(line);
                if (nuclide && nuclide.name) {
                    this.nuclideData.set(nuclide.name, nuclide);
                    parsedCount++;
                    
                    // 崩壊チェーンの構築
                    if (nuclide.daughters && nuclide.daughters.length > 0) {
                        this.decayChains.set(nuclide.name, nuclide.daughters);
                    }
                }
            } catch (parseError) {
                // 個別行の解析エラーは警告レベル
                logger.warn('核種行の解析をスキップ', { 
                    lineNumber: i + 1,
                    line: line.substring(0, 50), 
                    error: parseError.message 
                });
            }
        }
        
        logger.info(`核種データ解析完了: ${parsedCount}個の核種を読み込み`);
    }

    /**
     * 核種行の解析
     * @param {string} line - ICRP-07形式の行
     * @returns {Object|null} 核種データ
     */
    parseNuclideLine(line) {
        // ICRP-07形式: 実際のデータ構造に基づく解析
        if (line.length < 150) return null;
        
        const name = line.substring(0, 7).trim().replace('-', '');  // Cs-137 → Cs137
        const halfLife = line.substring(7, 15).trim();
        const decayMode = line.substring(15, 25).trim();
        
        // 子孫核種情報の抽出 (正確な位置に基づく)
        const daughters = [];
        
        // 第1子孫核種: 位置47から
        const daughter1Name = line.substring(47, 54).trim().replace('-', '');
        const daughter1Index = parseInt(line.substring(54, 60).trim()) || 0;
        const daughter1Ratio = this.parseScientificNumber(line.substring(60, 71).trim());
        
        if (daughter1Name && daughter1Ratio > 0 && daughter1Ratio >= this.contributionThreshold) {
            // 安定核種でない場合のみ追加
            if (this.isRadioactiveDaughter(daughter1Name, daughter1Index)) {
                daughters.push({
                    name: daughter1Name,
                    branchingRatio: daughter1Ratio,
                    index: daughter1Index
                });
            }
        }
        
        // 第2子孫核種: 位置72から
        const daughter2Name = line.substring(72, 79).trim().replace('-', '');
        const daughter2Index = parseInt(line.substring(79, 85).trim()) || 0;
        const daughter2Ratio = this.parseScientificNumber(line.substring(85, 96).trim());
        
        if (daughter2Name && daughter2Ratio > 0 && daughter2Ratio >= this.contributionThreshold) {
            if (this.isRadioactiveDaughter(daughter2Name, daughter2Index)) {
                daughters.push({
                    name: daughter2Name,
                    branchingRatio: daughter2Ratio,
                    index: daughter2Index
                });
            }
        }
        
        // 第3子孫核種: 位置97から
        const daughter3Name = line.substring(97, 104).trim().replace('-', '');
        const daughter3Index = parseInt(line.substring(104, 110).trim()) || 0;
        const daughter3Ratio = this.parseScientificNumber(line.substring(110, 121).trim());
        
        if (daughter3Name && daughter3Ratio > 0 && daughter3Ratio >= this.contributionThreshold) {
            if (this.isRadioactiveDaughter(daughter3Name, daughter3Index)) {
                daughters.push({
                    name: daughter3Name,
                    branchingRatio: daughter3Ratio,
                    index: daughter3Index
                });
            }
        }
        
        return {
            name,
            halfLife,
            decayMode,
            daughters,
            line: line // デバッグ用に元の行を保持
        };
    }

    /**
     * 科学的記数法の解析
     * @param {string} str - 科学的記数法の文字列
     * @returns {number} 数値
     */
    parseScientificNumber(str) {
        if (!str || str.trim() === '') return 0;
        
        // スペースを除去し、標準的な科学的記数法に変換
        const cleaned = str.replace(/\s+/g, '');
        
        // ICRP-07の特殊な記数法 (例: 9.4399E-01) への対応
        try {
            return parseFloat(cleaned);
        } catch {
            return 0;
        }
    }

    /**
     * 線源インベントリに子孫核種を自動追加
     * @param {Array} inventory - 既存のインベントリ配列
     * @returns {Object} 補間結果
     */
    async autoCompleteDaughters(inventory) {
        try {
            logger.info('子孫核種自動補間を開始', { originalCount: inventory.length });
            
            if (this.nuclideData.size === 0) {
                await this.loadNuclideDatabase();
            }

            const additions = [];
            const warnings = [];

            for (const sourceNuclide of inventory) {
                const parentName = this.normalizeNuclideName(sourceNuclide.nuclide);
                const parentData = this.nuclideData.get(parentName);
                
                if (!parentData || !parentData.daughters) {
                    continue;
                }

                // 重要な子孫核種の特定
                for (const daughter of parentData.daughters) {
                    if (daughter.branchingRatio >= this.contributionThreshold) {
                        
                        // 既存インベントリに含まれていないかチェック
                        const existingDaughter = inventory.find(inv => 
                            this.normalizeNuclideName(inv.nuclide) === daughter.name
                        );
                        
                        if (!existingDaughter) {
                            // 世俗平衡を仮定した放射能計算
                            const daughterActivity = sourceNuclide.radioactivity * daughter.branchingRatio;
                            
                            additions.push({
                                nuclide: daughter.name,
                                radioactivity: daughterActivity,
                                parent: parentName,
                                branchingRatio: daughter.branchingRatio,
                                equilibriumType: this.determineEquilibriumType(parentData, daughter)
                            });
                            
                            logger.info('子孫核種を追加', {
                                parent: parentName,
                                daughter: daughter.name,
                                ratio: daughter.branchingRatio,
                                activity: daughterActivity
                            });
                        }
                    }
                }
            }

            // 特別な核種に対する追加チェック
            this.handleSpecialCases(inventory, additions);

            return {
                success: true,
                originalCount: inventory.length,
                additionsCount: additions.length,
                additions,
                warnings,
                requiresConfirmation: this.userConfirmation && additions.length > 0
            };

        } catch (error) {
            logger.error('子孫核種自動補間エラー', { error: error.message });
            throw new Error(`子孫核種補間失敗: ${error.message}`);
        }
    }

    /**
     * 子孫核種が放射性かどうかを判定
     * @param {string} daughterName - 子孫核種名
     * @param {number} daughterIndex - ICRP-07データベース内のインデックス
     * @returns {boolean} 放射性の場合true、安定核種の場合false
     */
    isRadioactiveDaughter(daughterName, daughterIndex) {
        // インデックスが0の場合は安定核種
        if (daughterIndex === 0) {
            logger.debug('安定核種として判定', { 
                nuclideName: daughterName, 
                index: daughterIndex 
            });
            return false;
        }
        
        // データベース内に該当核種が存在するかチェック
        const daughterData = this.nuclideData.get(daughterName);
        if (!daughterData) {
            logger.debug('データベースに存在しない核種は安定核種として判定', { 
                nuclideName: daughterName 
            });
            return false;
        }
        
        logger.debug('放射性核種として判定', { 
            nuclideName: daughterName, 
            index: daughterIndex 
        });
        return true;
    }

    /**
     * 核種名の正規化
     * @param {string} nuclideName - 核種名
     * @returns {string} 正規化された核種名
     */
    normalizeNuclideName(nuclideName) {
        // Cs-137 → Cs137, Cs_137 → Cs137, Ba-137m → Ba137m などの変換
        return nuclideName.replace(/[-_]/g, '');
    }

    /**
     * 平衡タイプの決定
     * @param {Object} parentData - 親核種データ
     * @param {Object} daughterData - 子孫核種データ
     * @returns {string} 平衡タイプ
     */
    determineEquilibriumType(parentData, daughterData) {
        // 簡略化された平衡判定
        const parentHalfLife = this.parseHalfLife(parentData.halfLife);
        
        if (parentHalfLife > 3.154e10) { // 1000年以上
            return 'secular_equilibrium';
        } else if (parentHalfLife > 3.154e7) { // 1年以上
            return 'transient_equilibrium';
        } else {
            return 'no_equilibrium';
        }
    }

    /**
     * 半減期の解析（簡略版）
     * @param {string} halfLifeStr - 半減期文字列
     * @returns {number} 半減期（秒）
     */
    parseHalfLife(halfLifeStr) {
        // 実装は簡略化 - 実際にはより複雑な解析が必要
        if (halfLifeStr.includes('y')) {
            return parseFloat(halfLifeStr) * 3.154e7; // 年→秒
        } else if (halfLifeStr.includes('d')) {
            return parseFloat(halfLifeStr) * 86400; // 日→秒
        } else if (halfLifeStr.includes('h')) {
            return parseFloat(halfLifeStr) * 3600; // 時間→秒
        } else {
            return parseFloat(halfLifeStr) || 0;
        }
    }

    /**
     * 特別な核種ケースの処理
     * @param {Array} inventory - インベントリ
     * @param {Array} additions - 追加リスト
     */
    handleSpecialCases(inventory, additions) {
        for (const sourceNuclide of inventory) {
            const nuclideName = this.normalizeNuclideName(sourceNuclide.nuclide);
            
            // Cs-137の特別処理 (Ba-137mが重要)
            if (nuclideName === 'Cs137') {
                const ba137mExists = inventory.some(inv => 
                    this.normalizeNuclideName(inv.nuclide) === 'Ba137m'
                ) || additions.some(add => add.nuclide === 'Ba137m');
                
                if (!ba137mExists) {
                    additions.push({
                        nuclide: 'Ba137m',
                        radioactivity: sourceNuclide.radioactivity * 0.9439, // 94.39%
                        parent: 'Cs137',
                        branchingRatio: 0.9439,
                        equilibriumType: 'secular_equilibrium',
                        specialCase: 'Cs137_Ba137m'
                    });
                }
            }
        }
    }

    /**
     * 核種データベースの統計情報
     * @returns {Object} 統計情報
     */
    getDatabaseStats() {
        return {
            totalNuclides: this.nuclideData.size,
            decayChains: this.decayChains.size,
            majorChains: Array.from(this.decayChains.entries())
                .filter(([_, daughters]) => daughters.length > 0)
                .map(([parent, daughters]) => ({
                    parent,
                    daughterCount: daughters.length
                }))
        };
    }
}

export default NuclideManager;
