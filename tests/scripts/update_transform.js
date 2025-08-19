import http from 'http';

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'pokerinput_updateTransform',
  params: {
    name: 'tr_all_ops', // 既存transform名
    new_name: 'tr_all_ops_renamed', // 新しい名前
    operation: [
      { rotate_around_x: 180 },
      { translate: '0 0 100' }
    ]
  }
});

// 正しいリクエストデータ
const correctData = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'pokerinput_updateTransform',
  params: {
    name: 'tr_all_ops',
    name: 'tr_all_ops',
    // updates
    name: 'tr_all_ops_renamed',
    operation: [
      { rotate_around_x: 180 },
      { translate: '0 0 100' }
    ]
  }
});

console.log('transformノードの名前とoperationを更新リクエスト送信中...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log('ステータスコード:', res.statusCode);
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log('レスポンス:', responseData);
    if (responseData.length > 0) {
      try {
        const result = JSON.parse(responseData);
        console.log('transform更新結果:', result);
        if (result.result && result.result.result) {
          console.log('✅ transform更新リクエスト完了:', result.result.result);
        }
      } catch (e) {
        console.log('JSON解析エラー:', e);
      }
    }
  });
});

req.on('error', (e) => {
  console.error('リクエストエラー:', e);
});

req.write(data);
req.end(); 