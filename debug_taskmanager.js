#!/usr/bin/env node
// debug_taskmanager.js - TaskManager初期化テスト

import { TaskManager } from './src/services/TaskManager.js';
import { logger } from './src/utils/logger.js';

console.log('Starting TaskManager debug test...');

try {
    console.log('1. TaskManager初期化開始...');
    const taskManager = new TaskManager('tasks/poker.yaml', 'tasks/pending_changes.json');
    
    console.log('2. TaskManager.initialize()実行...');
    await taskManager.initialize();
    
    console.log('3. 初期化完了');
    console.log('DataManager state:', {
        nuclideDataSize: taskManager.dataManager.nuclideManager.nuclideData.size,
        hasData: !!taskManager.dataManager.data,
        pendingChangesCount: taskManager.dataManager.pendingChanges.length
    });
    
} catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
}
