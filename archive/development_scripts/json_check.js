// 基本的なJSON構文チェック
const fs = require('fs');

// ファイル読み込み
let content;
try {
    content = fs.readFileSync('config/mcp-manifest.json', 'utf8');
    console.log('✅ ファイル読み込み成功');
    console.log(`ファイルサイズ: ${content.length} 文字`);
} catch (error) {
    console.log('❌ ファイル読み込みエラー:', error.message);
    process.exit(1);
}

// JSON構文チェック
try {
    const json = JSON.parse(content);
    console.log('✅ JSON構文は正常です');
    
    // 構造チェック
    console.log('\n📋 構造チェック:');
    console.log('- name:', json.name);
    console.log('- version:', json.version);
    console.log('- enhanced_features:', json.enhanced_features ? '✅ 存在' : '❌ 存在しない');
    console.log('- data_sources:', json.data_sources ? '✅ 存在' : '❌ 存在しない');
    
    if (json.enhanced_features) {
        console.log('\n🔧 enhanced_features 詳細:');
        console.log('  - geometry_validation:', json.enhanced_features.geometry_validation ? '✅' : '❌');
        console.log('  - nuclide_management:', json.enhanced_features.nuclide_management ? '✅' : '❌');
        console.log('  - enhanced_validation:', json.enhanced_features.enhanced_validation ? '✅' : '❌');
    }
    
} catch (error) {
    console.log('❌ JSON構文エラー:', error.message);
    
    // エラー位置特定の試行
    const lines = content.split('\n');
    if (error.message.includes('position')) {
        const match = error.message.match(/position (\d+)/);
        if (match) {
            const pos = parseInt(match[1]);
            let currentPos = 0;
            for (let i = 0; i < lines.length; i++) {
                if (currentPos <= pos && pos <= currentPos + lines[i].length) {
                    console.log(`\n📍 エラー推定位置: 行 ${i + 1}`);
                    console.log(`内容: ${lines[i]}`);
                    console.log(`前後の行:`);
                    if (i > 0) console.log(`${i}: ${lines[i-1]}`);
                    console.log(`${i+1}: ${lines[i]} ← ここ`);
                    if (i < lines.length - 1) console.log(`${i+2}: ${lines[i+1]}`);
                    break;
                }
                currentPos += lines[i].length + 1;
            }
        }
    }
    
    // 一般的なJSONエラーの診断
    console.log('\n🔍 一般的な問題:');
    console.log('- カンマの欠如または余分なカンマ');
    console.log('- 引用符の不一致');
    console.log('- 括弧 {} [] の不一致');
    console.log('- 特殊文字のエスケープ漏れ');
}
