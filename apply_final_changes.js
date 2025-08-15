import http from 'http';

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 4,
  method: 'pokerinput.applyChanges',
  params: {}
});

console.log('最後の変更を適用中...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
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
        console.log('結果:', JSON.stringify(result, null, 2));
      } catch (e) {
        console.log('JSON解析エラー:', e.message);
      }
    }
  });
});

req.on('error', (e) => {
  console.error('リクエストエラー:', e);
});

req.write(data);
req.end();