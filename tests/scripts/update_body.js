import http from 'http';

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'pokerinput.updateBody',
  params: {
    name: 'R1',
    min: '90 5 4'
  }
});

console.log('立体更新リクエスト送信中...');

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
        console.log('立体更新結果:', result);
        if (result.result && result.result.result) {
          console.log('✅ 立体更新完了:', result.result.result);
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