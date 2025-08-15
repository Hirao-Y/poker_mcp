import http from 'http';

// 新しいBOX立体を提案するテスト
const testProposeBody = () => {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'pokerinput.proposeBody',
    params: {
      name: 'TestBox1',
      type: 'RPP',
      min: '0 0 0',
      max: '10 10 10'
    }
  });

  console.log('=== テスト1: 新しいBOX立体の提案 ===');
  console.log('送信データ:', data);

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
          console.log('パースされた結果:', JSON.stringify(result, null, 2));
        } catch (e) {
          console.log('JSON解析エラー:', e.message);
        }
      }      
      console.log('=================================\n');
      // テスト完了後、次のテストを実行
      testApplyChanges();
    });
  });

  req.on('error', (e) => {
    console.error('リクエストエラー:', e);
  });

  req.write(data);
  req.end();
};

// 変更を適用するテスト
const testApplyChanges = () => {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'pokerinput.applyChanges',
    params: {}
  });

  console.log('=== テスト2: 変更の適用 ===');
  console.log('送信データ:', data);

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
          console.log('パースされた結果:', JSON.stringify(result, null, 2));
        } catch (e) {
          console.log('JSON解析エラー:', e.message);
        }
      }      
      console.log('=================================\n');
      // テスト完了後、次のテストを実行
      testProposeZone();
    });
  });

  req.on('error', (e) => {
    console.error('リクエストエラー:', e);
  });

  req.write(data);
  req.end();
};

// 新しいZone（ゾーン）を提案するテスト
const testProposeZone = () => {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'pokerinput.proposeZone',
    params: {
      body_name: 'TestBox1',
      material: 'Lead',
      density: 11.34
    }
  });

  console.log('=== テスト3: 新しいZoneの提案 ===');
  console.log('送信データ:', data);

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
          console.log('パースされた結果:', JSON.stringify(result, null, 2));
        } catch (e) {
          console.log('JSON解析エラー:', e.message);
        }
      }      
      console.log('=================================');
      console.log('全てのテストが完了しました');
    });
  });

  req.on('error', (e) => {
    console.error('リクエストエラー:', e);
  });

  req.write(data);
  req.end();
};

// テスト開始
console.log('poker_mcp APIテストを開始します...\n');
testProposeBody();