import http from 'http';

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'task.updateAttribute',
  params: {
    taskId: 'T1-3',
    attributes: {
      milestone: '2025-07-01'
    }
  }
});

console.log('T1-3テストタスクにマイルストーン設定中...');

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
        console.log('属性更新結果:', result);
        
        if (result.result && result.result.result) {
          console.log('✅ マイルストーン設定完了:', result.result.result);
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