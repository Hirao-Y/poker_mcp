import http from 'http';

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'pokerinput_proposeTransform',
  params: {
    name: 'tr_all_ops',
    operation: [
      { rotate_around_x: 30 },
      { rotate_around_y: '45' },
      { rotate_around_z: 90 },
      { rotate_by_axis_angle: { axis: '1 0 0', angle: 60 } },
      { rotate_by_matrix: { row_1: '1 0 0', row_2: '0 1 0', row_3: '0 0 1' } },
      { translate: '10 0 5' }
    ]
  }
});

console.log('全operation例を含むtransformノード追加リクエスト送信中...');

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
        console.log('transform追加結果:', result);
        if (result.result && result.result.result) {
          console.log('✅ transform追加完了:', result.result.result);
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