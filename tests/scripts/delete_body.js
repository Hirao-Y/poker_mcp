import http from 'http';

// 削除する立体のリスト
const bodiesToDelete = ['B1', 'S1'];

async function deleteBody(bodyName) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pokerinput_deleteBody',
      params: {
        name: bodyName
      }
    });

    console.log(`立体 ${bodyName} 削除リクエスト送信中...`);

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
            console.log(`立体 ${bodyName} 削除結果:`, result);
            
            if (result.result && result.result.result) {
              console.log(`✅ 立体 ${bodyName} 削除完了:`, result.result.result);
            }
            resolve(result);
          } catch (e) {
            console.log('JSON解析エラー:', e);
            reject(e);
          }
        }
      });
    });

    req.on('error', (e) => {
      console.error('リクエストエラー:', e);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

// 全ての立体を順次削除
async function deleteAllBodies() {
  console.log('全ての立体を削除開始...');
  
  for (const bodyName of bodiesToDelete) {
    try {
      await deleteBody(bodyName);
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`立体 ${bodyName} の削除に失敗:`, error);
    }
  }
  
  console.log('全ての立体の削除が完了しました。');
}

deleteAllBodies(); 