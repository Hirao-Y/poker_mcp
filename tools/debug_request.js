import http from 'http';

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'pokerinput_proposeBody',
  params: {
    name: 'TestSphere',
    type: 'SPH',
    center: '0 0 0',
    radius: 10
  }
});

console.log('送信データ:', data);

const options = {
  hostname: 'localhost',
  port: 3001,  // 改善版サーバーのポート
  path: '/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('リクエストオプション:', options);

const req = http.request(options, (res) => {
  console.log('ステータスコード:', res.statusCode);
  console.log('ヘッダー:', res.headers);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    console.log('データチャンク受信:', chunk.toString());
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('レスポンス終了');
    console.log('完全なレスポンス:', responseData);
    console.log('レスポンス長:', responseData.length);
    
    if (responseData.length > 0) {
      try {
        const result = JSON.parse(responseData);
        console.log('パースされた結果:', result);
      } catch (e) {
        console.log('JSON解析エラー:', e);
      }
    } else {
      console.log('レスポンスが空です');
    }
  });
});

req.on('error', (e) => {
  console.error('リクエストエラー:', e);
});

req.on('response', (res) => {
  console.log('レスポンス受信開始');
});

req.write(data);
req.end();
