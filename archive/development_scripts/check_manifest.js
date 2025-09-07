const fs = require('fs');

try {
  const jsonContent = fs.readFileSync('./config/mcp-manifest.json', 'utf8');
  const parsed = JSON.parse(jsonContent);
  
  console.log('✅ JSON構文は正常です');
  console.log('主要セクション:');
  console.log('- name:', parsed.name);
  console.log('- version:', parsed.version);
  console.log('- enhanced_features:', parsed.enhanced_features ? '✅ 存在' : '❌ 不在');
  console.log('- data_sources:', parsed.data_sources ? '✅ 存在' : '❌ 不在');
  
  // 構造チェック
  if (parsed.enhanced_features) {
    console.log('  - geometry_validation:', parsed.enhanced_features.geometry_validation ? '✅' : '❌');
    console.log('  - nuclide_management:', parsed.enhanced_features.nuclide_management ? '✅' : '❌');
    console.log('  - enhanced_validation:', parsed.enhanced_features.enhanced_validation ? '✅' : '❌');
  }
  
} catch(e) {
  console.log('❌ JSON構文エラー:', e.message);
  
  // エラー位置の詳細
  if (e.message.includes('Unexpected')) {
    console.log('構文エラーの可能性:');
    console.log('- 不正な文字やカンマの欠如');
    console.log('- 不正な引用符');
    console.log('- 括弧の不一致');
  }
}
