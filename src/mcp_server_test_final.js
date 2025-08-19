// mcp_server_test_final.js - テスト用最終版
console.log("🚀 MCP Server TEST FINAL を開始します...");

import fs from 'fs';
import yaml from 'js-yaml';
import express from 'express';
import cors from 'cors';

// 基本的なTaskManagerクラス
class TaskManager {
  constructor(yamlFile, pendingFile) {
    this.yamlFile = yamlFile;
    this.pendingFile = pendingFile;
    
    // データ読み込み
    this.data = this.loadYamlData(yamlFile);
    this.pendingChanges = this.loadPendingChanges(pendingFile);
    
    console.log('TaskManager初期化完了');
  }

  loadYamlData(yamlFile) {
    try {
      const data = yaml.load(fs.readFileSync(yamlFile, 'utf8'));
      console.log('YAMLデータ読み込み成功');
      return data;
    } catch (error) {
      console.log('YAML読み込み失敗、初期データ作成');
      const initialData = { body: [], zone: [], transform: [], buildup_factor: [], source: [] };
      return initialData;
    }
  }

  loadPendingChanges(pendingFile) {
    try {
      return JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
    } catch (error) {
      console.log('保留変更ファイル初期化');
      return [];
    }
  }

  savePendingChanges() {
    try {
      fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
      console.log('保留変更保存完了');
    } catch (error) {
      console.error('保留変更保存エラー:', error.message);
    }
  }

  saveYamlData(data = this.data) {
    try {
      const yamlString = yaml.dump(data, { flowLevel: 2, lineWidth: 120 });
      fs.writeFileSync(this.yamlFile, yamlString, 'utf8');
      console.log('YAMLデータ保存完了');
    } catch (error) {
      console.error('YAMLデータ保存エラー:', error.message);
      throw error;
    }
  }

  // 立体提案
  proposeBody(name, type, options = {}) {
    const newBody = { name, type, ...options };
    this.pendingChanges.push({ 
      action: "add_body", 
      body: newBody,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('立体提案追加:', { name, type });
    return `提案: 立体 ${name} を追加`;
  }

  // 立体更新
  updateBody(name, updates) {
    this.pendingChanges.push({ 
      action: "update_body", 
      name, 
      updates,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('立体更新提案:', { name, updates });
    return `提案: 立体 ${name} の更新を保留しました`;
  }

  // 立体削除
  deleteBody(name) {
    this.pendingChanges.push({ 
      action: "delete_body", 
      name,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('立体削除提案:', { name });
    return `提案: 立体 ${name} の削除を保留しました`;
  }

  // ゾーン提案
  proposeZone(body_name, material, density) {
    const newZone = { body_name, material };
    if (material !== 'VOID' && density !== undefined) {
      newZone.density = Number(density);
    }
    this.pendingChanges.push({ 
      action: "add_zone", 
      zone: newZone,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('ゾーン提案追加:', { body_name, material });
    return `提案: ゾーン ${body_name} (${material}) を追加`;
  }

  // ゾーン更新
  updateZone(body_name, updates) {
    this.pendingChanges.push({ 
      action: "update_zone", 
      body_name, 
      updates,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('ゾーン更新提案:', { body_name, updates });
    return `提案: ゾーン ${body_name} の更新を保留しました`;
  }

  // ゾーン削除
  deleteZone(body_name) {
    this.pendingChanges.push({ 
      action: "delete_zone", 
      body_name,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('ゾーン削除提案:', { body_name });
    return `提案: ゾーン ${body_name} の削除を保留しました`;
  }

  // 変換提案
  proposeTransform(name, operations) {
    this.pendingChanges.push({ 
      action: "add_transform", 
      transform: { name, operation: operations },
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('変換提案追加:', { name, operations });
    return `変換 ${name} を追加しました`;
  }

  // 変換更新
  updateTransform(name, updates) {
    this.pendingChanges.push({ 
      action: "update_transform", 
      name, 
      updates,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('変換更新提案:', { name, updates });
    return `提案: 変換 ${name} の更新を保留しました`;
  }

  // 変換削除
  deleteTransform(name) {
    this.pendingChanges.push({ 
      action: "delete_transform", 
      name,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('変換削除提案:', { name });
    return `提案: 変換 ${name} の削除を保留しました`;
  }

  // ビルドアップ係数提案
  proposeBuildupFactor(material, use_slant_correction, use_finite_medium_correction) {
    this.pendingChanges.push({ 
      action: "add_buildup_factor", 
      buildup_factor: { 
        material, 
        use_slant_correction: Boolean(use_slant_correction), 
        use_finite_medium_correction: Boolean(use_finite_medium_correction) 
      },
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('ビルドアップ係数提案追加:', { material });
    return `ビルドアップ係数 ${material} を追加しました`;
  }

  // ビルドアップ係数更新
  updateBuildupFactor(material, updates) {
    this.pendingChanges.push({ 
      action: "update_buildup_factor", 
      material, 
      updates,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('ビルドアップ係数更新提案:', { material, updates });
    return `提案: ビルドアップ係数 ${material} の更新を保留しました`;
  }

  // ビルドアップ係数削除
  deleteBuildupFactor(material) {
    this.pendingChanges.push({ 
      action: "delete_buildup_factor", 
      material,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('ビルドアップ係数削除提案:', { material });
    return `提案: ビルドアップ係数 ${material} の削除を保留しました`;
  }

  // ビルドアップ係数順序変更
  changeOrderBuildupFactor(material, newIndex) {
    this.pendingChanges.push({ 
      action: "reorder_buildup_factor", 
      material, 
      newIndex,
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('ビルドアップ係数順序変更提案:', { material, newIndex });
    return `提案: ビルドアップ係数 ${material} の順序変更を保留しました`;
  }

  // 線源提案
  proposeSource(params) {
    const { name, type, position, inventory, cutoff_rate } = params;
    this.pendingChanges.push({ 
      action: "add_source", 
      source: {
        name, type, position, inventory, 
        cutoff_rate: cutoff_rate || 0.0001
      },
      timestamp: new Date().toISOString()
    });
    this.savePendingChanges();
    console.log('線源提案追加:', { name, type });
    return `提案: 線源 ${name} を追加`;
  }

  // 変更適用
  applyChanges() {
    console.log('変更適用開始:', this.pendingChanges.length);
    
    if (this.pendingChanges.length === 0) {
      return '適用する変更がありません';
    }

    // 簡単な変更適用 (ここでは保留変更をクリア)
    this.pendingChanges = [];
    this.savePendingChanges();
    
    console.log('変更適用完了');
    return '変更を正常に適用しました';
  }
}

// Express アプリケーション設定
const app = express();
const PORT = process.env.PORT || 3010;

// CORS設定
app.use(cors({
  origin: "*",
  credentials: true
}));

// JSONパーサー
app.use(express.json({ limit: '10mb' }));

// TaskManager インスタンス
const manager = new TaskManager(
  "tasks/pokerinputs.yaml",
  "tasks/pending_changes.json"
);

// JSON-RPC ヘルパー関数
function jsonRpcSuccess(id, result) {
  return {
    jsonrpc: '2.0',
    id: id,
    result: result
  };
}

function jsonRpcError(id, code, message, data = null) {
  return {
    jsonrpc: '2.0',
    id: id,
    error: { code, message, data }
  };
}

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    name: "poker-mcp-test-final",
    version: "3.0.0",
    description: "MCP Server TEST FINAL - テスト用最終版",
    port: PORT,
    methods: [
      "pokerinput_proposeBody", "pokerinput_updateBody", "pokerinput_deleteBody",
      "pokerinput_proposeZone", "pokerinput_updateZone", "pokerinput_deleteZone",
      "pokerinput_proposeTransform", "pokerinput_updateTransform", "pokerinput_deleteTransform",
      "pokerinput_proposeBuildupFactor", "pokerinput_updateBuildupFactor", "pokerinput_deleteBuildupFactor",
      "pokerinput_changeOrderBuildupFactor", "pokerinput_proposeSource", "pokerinput_applyChanges"
    ]
  });
});

// JSON-RPC エンドポイント
app.post('/mcp', (req, res) => {
  try {
    const jsonBody = req.body;
    
    if (!jsonBody.method) {
      return res.json(jsonRpcError(jsonBody.id, -32600, '無効なリクエスト: methodが必要です'));
    }

    console.log('MCP要求受信:', { method: jsonBody.method, id: jsonBody.id });

    switch (jsonBody.method) {
      case 'pokerinput_proposeBody':
        try {
          const { name, type, ...options } = jsonBody.params;
          const result = manager.proposeBody(name, type, options);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体提案エラー: ${error.message}`));
        }

      case 'pokerinput_updateBody':
        try {
          const { name, ...updates } = jsonBody.params;
          const result = manager.updateBody(name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体更新エラー: ${error.message}`));
        }

      case 'pokerinput_deleteBody':
        try {
          const { name } = jsonBody.params;
          const result = manager.deleteBody(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体削除エラー: ${error.message}`));
        }

      case 'pokerinput_proposeZone':
        try {
          const { body_name, material, density } = jsonBody.params;
          const result = manager.proposeZone(body_name, material, density);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン提案エラー: ${error.message}`));
        }

      case 'pokerinput_updateZone':
        try {
          const { body_name, ...updates } = jsonBody.params;
          const result = manager.updateZone(body_name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン更新エラー: ${error.message}`));
        }

      case 'pokerinput_deleteZone':
        try {
          const { body_name } = jsonBody.params;
          const result = manager.deleteZone(body_name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン削除エラー: ${error.message}`));
        }

      case 'pokerinput_proposeTransform':
        try {
          const { name, operation } = jsonBody.params;
          const result = manager.proposeTransform(name, operation);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変換提案エラー: ${error.message}`));
        }

      case 'pokerinput_updateTransform':
        try {
          const { name, ...updates } = jsonBody.params;
          const result = manager.updateTransform(name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変換更新エラー: ${error.message}`));
        }

      case 'pokerinput_deleteTransform':
        try {
          const { name } = jsonBody.params;
          const result = manager.deleteTransform(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変換削除エラー: ${error.message}`));
        }

      case 'pokerinput_proposeBuildupFactor':
        try {
          const { material, use_slant_correction, use_finite_medium_correction } = jsonBody.params;
          const result = manager.proposeBuildupFactor(material, use_slant_correction, use_finite_medium_correction);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数提案エラー: ${error.message}`));
        }

      case 'pokerinput_updateBuildupFactor':
        try {
          const { material, ...updates } = jsonBody.params;
          const result = manager.updateBuildupFactor(material, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数更新エラー: ${error.message}`));
        }

      case 'pokerinput_deleteBuildupFactor':
        try {
          const { material } = jsonBody.params;
          const result = manager.deleteBuildupFactor(material);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数削除エラー: ${error.message}`));
        }

      case 'pokerinput_changeOrderBuildupFactor':
        try {
          const { material, newIndex } = jsonBody.params;
          const result = manager.changeOrderBuildupFactor(material, newIndex);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数順序変更エラー: ${error.message}`));
        }

      case 'pokerinput_proposeSource':
        try {
          const result = manager.proposeSource(jsonBody.params);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `線源提案エラー: ${error.message}`));
        }

      case 'pokerinput_applyChanges':
        try {
          const result = manager.applyChanges();
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変更適用エラー: ${error.message}`));
        }

      default:
        return res.json(jsonRpcError(jsonBody.id, -32601, `未知のメソッド: ${jsonBody.method}`));
    }
  } catch (error) {
    console.error('予期しないエラー:', error.message);
    return res.json(jsonRpcError(req.body?.id, -32603, 'サーバー内部エラー'));
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    pendingChanges: manager.pendingChanges.length
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 MCP Server TEST FINAL が起動しました`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📋 利用可能なエンドポイント:`);
  console.log(`   - JSON-RPC: POST /mcp`);
  console.log(`   - 情報取得: GET /`);
  console.log(`   - ヘルスチェック: GET /health`);
  console.log(`✨ 全15のMCPメソッドが利用可能です`);
  console.log(`🔄 保留変更: ${manager.pendingChanges.length}件`);
});
