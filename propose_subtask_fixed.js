import http from 'http';

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'task.proposeSubtask',
  params: {
    parentId: 'T1',
    title: '設計レビュー',
    options: {
      milestone: '2024-07-01'
    }
  }
});

console.log('送信データ:', data);

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
  console.log('ヘッダー:', res.headers);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    console.log('データチャンク受信:', chunk.toString());
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('レスポンス終了');
    console.log('完全なレスポンス:', responseData);
    
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

req.write(data);
req.end(); 