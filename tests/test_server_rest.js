// test_server.js - REST API テスト用シンプルサーバー
console.log("REST APIテスト用サーバーを開始します...");

import express from 'express';
import cors from 'cors';
import { logger } from './src/utils/logger.js';

// Expressアプリを作成
const app = express();
const PORT = 3001;

// CORS設定
app.use(cors());

// JSONボディパーサーミドルウェア
app.use(express.json({ limit: '10mb' }));

// テスト用のメモリ内データストア
let testData = {
  bodies: [
    { name: "S1", type: "SPH", center: "0 0 0", radius: 67 },
    { name: "S2", type: "SPH", center: "20 20 -20", radius: 30 }
  ],
  zones: [
    { body_name: "ATMOSPHERE", material: "VOID" },
    { body_name: "S1", material: "Concrete", density: 2.22 }
  ],
  changes: []
};

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    name: "pokerinput-mcp-test",
    version: "2.1.0",
    description: "REST API テストサーバー",
    endpoints: { rest: "/api/v1" },
    status: "running"
  });
});

// REST API routes
const router = express.Router();

// Bodies endpoints
router.get('/bodies', (req, res) => {
  res.json({
    success: true,
    data: testData.bodies,
    count: testData.bodies.length
  });
});

router.post('/bodies', (req, res) => {
  const { name, type, ...options } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({
      success: false,
      error: "nameとtypeは必須です"
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

router.get('/bodies/:name', (req, res) => {
  const { name } = req.params;
  const body = testData.bodies.find(b => b.name === name);
  
  if (!body) {
    return res.status(404).json({
      success: false,
      error: `立体 ${name} が見つかりません`
    });
  }
  
  res.json({ success: true, data: body });
});

router.delete('/bodies/:name', (req, res) => {
  const { name } = req.params;
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
router.get('/zones', (req, res) => {
  res.json({
    success: true,
    data: testData.zones,
    count: testData.zones.length
  });
});

router.post('/zones', (req, res) => {
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

// Status endpoint
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '2.1.0',
      status: 'running',
      bodies_count: testData.bodies.length,
      zones_count: testData.zones.length,
      changes_count: testData.changes.length,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

app.use('/api/v1', router);

// サーバー起動
app.listen(PORT, () => {
  console.log(`REST APIテストサーバーが起動: http://localhost:${PORT}`);
  console.log('利用可能なエンドポイント:');
  console.log('- GET  / (サーバー情報)');
  console.log('- GET  /api/v1/status (ステータス)');
  console.log('- GET  /api/v1/bodies (立体一覧)');
  console.log('- POST /api/v1/bodies (立体作成)');
  console.log('- GET  /api/v1/bodies/:name (立体詳細)');
  console.log('- DELETE /api/v1/bodies/:name (立体削除)');
  console.log('- GET  /api/v1/zones (ゾーン一覧)');
  console.log('- POST /api/v1/zones (ゾーン作成)');
  
  logger.info('REST APIテストサーバーが起動しました', { port: PORT });
});

// 終了時の処理
process.on('SIGINT', () => {
  console.log('\nサーバーを停止しています...');
  process.exit(0);
});
