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
        this.databaseFile = options.database_file || 'data/ICRP-07.NDX';
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
        // ICRP-07 NDX 固定長フォーマット（実データで検証した列位置）
        //
        //   0- 6 : 核種名            "Cs-137 "
        //   7-15 : 半減期(値+単位)   " 30.1671y"   ← 単位は15桁目
        //  16-24 : 崩壊形式          " B-"
        //  53-77 : 第1子孫 (名前7 + index7 + 分岐比11)
        //  78-102: 第2子孫
        // 103-127: 第3子孫
        //
        // 旧実装は半減期を substring(7,15) としていたため単位が崩壊形式側へ
        // ずれ込み、"30.1671" (=30秒) と誤読していた。子孫核種の列位置も
        // 47/72/97 とずれており、全核種で子孫が取得できていなかった。
        if (line.length < 150) return null;

        const name = line.substring(0, 7).trim().replace('-', '');
        const halfLife = line.substring(7, 16).trim();
        const decayMode = line.substring(16, 25).trim();

        // 子孫核種情報の抽出
        //
        // 注意: ここでは安定核種の判定・分岐比の閾値判定を行わない。
        // NDX は Z 順に並ぶため、親より後ろに現れる娘（例: Cs-137 → Ba-137m）は
        // 解析時点ではまだ nuclideData に登録されておらず、
        // isRadioactiveDaughter() が常に false を返してしまうためである。
        // 判定はデータベース読み込み完了後の getDaughters() で行う。
        const daughters = [];
        const OFFSETS = [53, 78, 103];

        for (const base of OFFSETS) {
            const dName = line.substring(base, base + 7).trim().replace('-', '');
            const dIndex = parseInt(line.substring(base + 7, base + 14).trim()) || 0;
            const dRatio = this.parseScientificNumber(line.substring(base + 14, base + 25).trim());

            if (dName && dRatio > 0) {
                daughters.push({ name: dName, branchingRatio: dRatio, index: dIndex });
            }
        }

        return {
            name,
            halfLife,
            decayMode,
            daughters,
            line: line
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
     * データベースが未ロードなら読み込む
     */
    async ensureLoaded() {
        if (this.nuclideData.size === 0) {
            await this.loadNuclideDatabase();
        }
        return this.nuclideData.size;
    }

    /**
     * 指定核種の娘核種一覧を取得
     * @param {string} name - 親核種名
     * @returns {Array} [{ name, branchingRatio, index }]
     */
    getDaughters(name) {
        const data = this.nuclideData.get(this.normalizeNuclideName(name));
        if (!data || !Array.isArray(data.daughters)) return [];
        return data.daughters.filter(d =>
            d && d.name && this.isRadioactiveDaughter(d.name, d.index)
        );
    }

    /**
     * 半減期を秒で取得
     * @param {string} name - 核種名
     * @returns {number|null} 半減期[秒]、不明なら null
     */
    getHalfLifeSeconds(name) {
        const data = this.nuclideData.get(this.normalizeNuclideName(name));
        if (!data) return null;
        const v = this.parseHalfLife(data.halfLife);
        return v > 0 ? v : null;
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
     * 半減期の解析
     *
     * ICRP-07 の表記（例: "30.1671 y", "2.552m", "6.0067 h", "1.2E+01 s"）を秒に変換する。
     * 旧実装は分(m)・ミリ秒(ms)等を扱えず、"2.552m" を 2.552 秒と誤読していた。
     * 単位判定は長いトークンから順に行う（ms を m と誤判定しないため）。
     *
     * @param {string} halfLifeStr - 半減期文字列
     * @returns {number} 半減期（秒）。解析できない場合は 0
     */
    parseHalfLife(halfLifeStr) {
        if (halfLifeStr === undefined || halfLifeStr === null) return 0;
        const s = String(halfLifeStr).trim();
        if (s === '' || /stable/i.test(s)) return 0;

        // 数値部（科学的記数法を含む）と単位部を分離
        const m = s.match(/^\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*([a-zA-Zμ]*)/);
        if (!m) return 0;

        const value = parseFloat(m[1]);
        if (!isFinite(value) || value <= 0) return 0;

        const unit = (m[2] || 's').toLowerCase();
        const FACTORS = {
            'y': 3.1556952e7, 'yr': 3.1556952e7, 'a': 3.1556952e7,
            'd': 86400,
            'h': 3600,
            'm': 60, 'min': 60,
            's': 1, 'sec': 1,
            'ms': 1e-3,
            'us': 1e-6, 'μs': 1e-6,
            'ns': 1e-9,
            'ps': 1e-12
        };

        const factor = FACTORS[unit];
        if (factor === undefined) {
            logger.warn('半減期の単位を解釈できません', { halfLifeStr, unit });
            return 0;
        }
        return value * factor;
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
