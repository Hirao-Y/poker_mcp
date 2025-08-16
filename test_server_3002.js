// simple_test_server.js - Port 3002
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002;  // Changed port

console.log('REST API テストサーバーを起動中...');

// ミドルウェア
app.use(cors());
app.use(express.json());

// テストデータ
let testData = {
  bodies: [
    { name: "S1", type: "SPH", center: "0 0 0", radius: 67 },
    { name: "S2", type: "SPH", center: "20 20 -20", radius: 30 }
  ],
  zones: [
    { body_name: "ATMOSPHERE", material: "VOID" },
    { body_name: "S1", material: "Concrete", density: 2.22 }
  ]
};

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    name: "pokerinput-mcp-test",
    version: "2.1.0",
    description: "REST API テストサーバー",
    endpoints: { rest: "/api/v1" },
    status: "running",
    port: PORT
  });
});

// Status endpoint
app.get('/api/v1/status', (req, res) => {
  console.log('Status endpoint accessed');
  res.json({
    success: true,
    data: {
      version: '2.1.0',
      status: 'running',
      bodies_count: testData.bodies.length,
      zones_count: testData.zones.length,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

// Bodies endpoints
app.get('/api/v1/bodies', (req, res) => {
  console.log('Bodies list accessed');
  res.json({
    success: true,
    data: testData.bodies,
    count: testData.bodies.length
  });
});

app.post('/api/v1/bodies', (req, res) => {
  console.log('Create body request:', req.body);
  const { name, type, ...options } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({
      success: false,
      error: "nameとtypeは必須です"
    });
  }

  if (testData.bodies.find(b => b.name === name)) {
    return res.status(409).json({
      success: false,
      error: `立体 ${name} は既に存在します`
    });
  }

  const newBody = { name, type, ...options };
  testData.bodies.push(newBody);
  
  res.status(201).json({
    success: true,
    message: `立体 ${name} を追加しました`,
    data: newBody
  });
});

app.get('/api/v1/bodies/:name', (req, res) => {
  const { name } = req.params;
  console.log('Get body request:', name);
  const body = testData.bodies.find(b => b.name === name);
  
  if (!body) {
    return res.status(404).json({
      success: false,
      error: `立体 ${name} が見つかりません`
    });
  }
  
  res.json({ success: true, data: body });
});

app.delete('/api/v1/bodies/:name', (req, res) => {
  const { name } = req.params;
  console.log('Delete body request:', name);
  const index = testData.bodies.findIndex(b => b.name === name);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `立体 ${name} が見つかりません`
    });
  }
  
  testData.bodies.splice(index, 1);
  res.json({
    success: true,
    message: `立体 ${name} を削除しました`
  });
});

// Zones endpoints  
app.get('/api/v1/zones', (req, res) => {
  console.log('Zones list accessed');
  res.json({
    success: true,
    data: testData.zones,
    count: testData.zones.length
  });
});

app.post('/api/v1/zones', (req, res) => {
  console.log('Create zone request:', req.body);
  const { body_name, material, density } = req.body;
  
  if (!body_name || !material) {
    return res.status(400).json({
      success: false,
      error: "body_nameとmaterialは必須です"
    });
  }

  const newZone = { body_name, material };
  if (material !== 'VOID' && density) {
    newZone.density = density;
  }
  
  testData.zones.push(newZone);
  
  res.status(201).json({
    success: true,
    message: `ゾーン ${body_name} (${material}) を追加しました`,
    data: newZone
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'サーバー内部エラー'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`REST APIテストサーバーが起動: http://localhost:${PORT}`);
  console.log('利用可能なエンドポイント:');
  console.log('- GET    /');
  console.log('- GET    /api/v1/status');
  console.log('- GET    /api/v1/bodies');
  console.log('- POST   /api/v1/bodies');
  console.log('- GET    /api/v1/bodies/:name');
  console.log('- DELETE /api/v1/bodies/:name');
  console.log('- GET    /api/v1/zones');
  console.log('- POST   /api/v1/zones');
});

process.on('SIGINT', () => {
  console.log('\nサーバーを停止します');
  process.exit(0);
});
