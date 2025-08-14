import http from 'http';

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'pokerinput.applyChanges',
  params: {}
});

console.log('変更適用リクエスト送信中...');

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
        console.log('変更適用結果:', result);
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