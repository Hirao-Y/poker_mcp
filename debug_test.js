#!/usr/bin/env node
// debug_test.js - 簡単な診断テスト

import path from 'path';
import fs from 'fs/promises';

console.log('Starting debug test...');

try {
    console.log('1. ファイルパス解決テスト...');
    const dataPath = path.resolve('data/ICRP-07.NDX');
    console.log('解決パス:', dataPath);
    
    console.log('2. ファイル存在確認...');
    await fs.access(dataPath);
    console.log('ファイルアクセス: OK');
    
    console.log('3. ファイル読み込みテスト...');
    const content = await fs.readFile(dataPath, 'utf8');
    console.log('ファイルサイズ:', content.length);
    console.log('行数:', content.split('\n').length);
    
    console.log('4. NuclideManager import テスト...');
    const { default: NuclideManager } = await import('./src/utils/NuclideManager.js');
    console.log('NuclideManager imported successfully');
    
    console.log('5. NuclideManager初期化テスト...');
    const manager = new NuclideManager({
        contribution_threshold: 0.05,
        user_confirmation: true,
        database_file: 'data/ICRP-07.NDX'
    });
    console.log('NuclideManager created');
    
    console.log('6. データベース読み込みテスト...');
    await manager.loadNuclideDatabase();
    console.log('Database loaded successfully');
    console.log('Nuclide count:', manager.nuclideData.size);
    
} catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
}
