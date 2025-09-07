// マニフェストの最小版でテスト
const minimalTest = {
  "name": "poker-mcp",
  "version": "1.1.0",
  "enhanced_features": {
    "geometry_validation": {
      "collision_detection": {
        "enabled": true
      }
    }
  }
};

try {
  const testJson = JSON.stringify(minimalTest, null, 2);
  console.log('✅ 基本構造は正常');
  console.log('テストJSON:');
  console.log(testJson);
} catch (e) {
  console.log('❌ 基本構造エラー:', e.message);
}
