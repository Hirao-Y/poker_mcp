import http from 'http';

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'pokerinput.proposeBody',
  params: {
    name: 'U1',
    type: 'RCC',
    bottom_center: '0 0 0',
    height_vector: '0 0 10',
    radius: 5
  }
});

console.log('立体提案リクエスト送信中...');

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
        console.log('立体提案結果:', result);
        
        if (result.result && result.result.result) {
          console.log('✅ 立体提案完了:', result.result.result);
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