#!/usr/bin/env node
// 環境変数テストスクリプト
import path from 'path';

console.log('=== 環境変数テスト ===');

// 設定の確認
const workDir = process.env.POKER_WORK_DIR || './';
const dataDir = path.resolve(workDir, process.env.POKER_DATA_DIR || 'data');
const nuclideFileName = process.env.POKER_NUCLIDE_FILE || 'ICRP-07.NDX';
const nuclideDatabasePath = path.resolve(dataDir, nuclideFileName);

console.log('環境変数の設定:');
console.log(`POKER_WORK_DIR: ${process.env.POKER_WORK_DIR || '(default: ./)'}`);
console.log(`POKER_DATA_DIR: ${process.env.POKER_DATA_DIR || '(default: data)'}`);
console.log(`POKER_NUCLIDE_FILE: ${process.env.POKER_NUCLIDE_FILE || '(default: ICRP-07.NDX)'}`);

console.log('\n解決されたパス:');
console.log(`workDir: ${path.resolve(workDir)}`);
console.log(`dataDir: ${dataDir}`);
console.log(`nuclideDatabasePath: ${nuclideDatabasePath}`);

// ファイル存在確認
import fs from 'fs/promises';

async function checkFiles() {
    try {
        const stats = await fs.stat(nuclideDatabasePath);
        console.log(`\n✅ 核種データベースファイル: ${nuclideDatabasePath}`);
        console.log(`   サイズ: ${stats.size} bytes`);
        console.log(`   更新日時: ${stats.mtime}`);
    } catch (error) {
        console.log(`\n❌ 核種データベースファイル読み込みエラー: ${error.message}`);
        console.log(`   パス: ${nuclideDatabasePath}`);
        
        // 内蔵ファイルの確認
        const srcFile = path.resolve('./src/data/ICRP-07.NDX');
        try {
            const srcStats = await fs.stat(srcFile);
            console.log(`\n📁 内蔵ファイルは存在: ${srcFile}`);
            console.log(`   サイズ: ${srcStats.size} bytes`);
        } catch (srcError) {
            console.log(`\n❌ 内蔵ファイルも不存在: ${srcFile}`);
        }
    }
}

checkFiles().catch(console.error);
