import http from 'http';

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'task.proposeSubtask',
  params: {
    parentId: 'T1',
    title: '実装',
    options: {
      milestone: '2025-09-01'
    }
  }
});

console.log('T1-2のマイルストーン更新リクエスト送信中...');

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
        console.log('T1-2マイルストーン更新結果:', result);
        
        if (result.result && result.result.result) {
          console.log('✅ T1-2マイルストーン更新完了:', result.result.result);
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