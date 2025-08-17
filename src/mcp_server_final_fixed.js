import fs from 'fs';
import yaml from 'js-yaml';
import express from 'express';
import cors from 'cors';

// 必要なディレクトリを作成
function ensureDirectories() {
  try {
    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups', { recursive: true });
    }
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs', { recursive: true });
    }
  } catch (error) {
    console.warn('ディレクトリ作成警告:', error.message);
  }
}

// TaskManager クラス（完全実装版）
class TaskManager {
  constructor(yamlFile, pendingFile) {
    this.yamlFile = yamlFile;
    this.pendingFile = pendingFile;
    this.backupDir = 'backups';
    
    // ディレクトリ作成
    ensureDirectories();
    
    // データ読み込み
    this.data = this.loadYamlData(yamlFile);
    this.pendingChanges = this.loadPendingChanges(pendingFile);
    
    console.log('TaskManager初期化完了', { 
      yamlFile, 
      pendingFile, 
      bodyCount: this.data.body?.length || 0,
      pendingCount: this.pendingChanges.length 
    });
  }

  loadYamlData(yamlFile) {
    try {
      const data = yaml.load(fs.readFileSync(yamlFile, 'utf8'));
      console.log('YAMLデータ読み込み成功:', yamlFile);
      return data;
    } catch (error) {
      console.log('YAML読み込み失敗、初期データ作成:', yamlFile);
      const initialData = { body: [], zone: [], transform: [], buildup_factor: [], source: [] };
      this.saveYamlData(initialData);
      return initialData;
    }
  }

  loadPendingChanges(pendingFile) {
    try {
      return JSON.parse(fs.readFileSync(pendingFile, 'utf8') || '[]');
    } catch (error) {
      console.log('保留変更ファイル初期化:', pendingFile);
      return [];
    }
  }

  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `${this.backupDir}/pokerinputs-${timestamp}.yaml`;
      fs.copyFileSync(this.yamlFile, backupFile);
      console.log('バックアップ作成:', backupFile);
      
      // 古いバックアップのクリーンアップ（最新10個まで保持）
      this.cleanupOldBackups();
    } catch (error) {
      console.error('バックアップ作成エラー:', error.message);
    }
  }

  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('pokerinputs-') && f.endsWith('.yaml'))
        .sort()
        .reverse();
      
      if (files.length > 10) {
        files.slice(10).forEach(file => {
          fs.unlinkSync(`${this.backupDir}/${file}`);
          console.log('古いバックアップ削除:', file);
        });
      }
    } catch (error) {
      console.error('バックアップクリーンアップエラー:', error.message);
    }
  }

  saveYamlData(data = this.data) {
    try {
      this.createBackup();
      const yamlString = yaml.dump(data, { flowLevel: 2, lineWidth: 120 });
      fs.writeFileSync(this.yamlFile, yamlString, 'utf8');
      console.log('YAMLデータ保存完了');
    } catch (error) {
      console.error('YAMLデータ保存エラー:', error.message);
      throw error;
    }
  }

  savePendingChanges() {
    try {
      fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
      console.log('保留変更保存完了:', this.pendingChanges.length);
    } catch (error) {
      console.error('保留変更保存エラー:', error.message);
      throw error;
    }
  }

  findBodyByName(name) {
    return this.data.body?.find(body => body.name === name) || null;
  }

  findZoneByBodyName(name) {
    return this.data.zone?.find(zone => zone.body_name === name) || null;
  }

  // 立体提案
  proposeBody(name, type, options = {}) {
    try {
      if (!name || typeof name !== 'string') {
        throw new Error('立体名は必須で文字列である必要があります');
      }
      if (this.findBodyByName(name)) {
        throw new Error(`立体名 ${name} は既に存在します`);
      }

      const validTypes = ['SPH', 'RCC', 'RPP', 'BOX', 'CMB', 'TOR', 'ELL', 'REC', 'TRC', 'WED'];
      if (!validTypes.includes(type)) {
        throw new Error(`無効な立体タイプ: ${type}. 有効なタイプ: ${validTypes.join(', ')}`);
      }

      const newBody = { name, type, ...options };
      
      this.pendingChanges.push({ 
        action: "add_body", 
        body: newBody,
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('立体提案追加:', { name, type });
      return `提案: 立体 ${name} を追加`;
    } catch (error) {
      console.error('立体提案エラー:', { name, type, error: error.message });
      throw error;
    }
  }

  // 立体更新
  updateBody(name, updates) {
    try {
      if (!name) throw new Error('立体名は必須です');
      
      this.pendingChanges.push({ 
        action: "update_body", 
        name, 
        updates,
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('立体更新提案:', { name, updates });
      return `提案: 立体 ${name} の更新を保留しました: ${JSON.stringify(updates)}`;
    } catch (error) {
      console.error('立体更新エラー:', { name, error: error.message });
      throw error;
    }
  }

  // 立体削除
  deleteBody(name) {
    try {
      if (!name) throw new Error('立体名は必須です');
      
      this.pendingChanges.push({ 
        action: "delete_body", 
        name,
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('立体削除提案:', { name });
      return `提案: 立体 ${name} の削除を保留しました`;
    } catch (error) {
      console.error('立体削除エラー:', { name, error: error.message });
      throw error;
    }
  }

  // ゾーン提案
  proposeZone(body_name, material, density) {
    try {
      if (!body_name || !material) {
        throw new Error('body_nameとmaterialは必須です');
      }

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
    } catch (error) {
      console.error('ゾーン提案エラー:', { body_name, material, error: error.message });
      throw error;
    }
  }

  // ゾーン更新
  updateZone(body_name, updates) {
    try {
      if (!body_name) throw new Error('body_nameは必須です');
      
      this.pendingChanges.push({ 
        action: "update_zone", 
        body_name, 
        updates,
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('ゾーン更新提案:', { body_name, updates });
      return `提案: ゾーン ${body_name} の更新を保留しました: ${JSON.stringify(updates)}`;
    } catch (error) {
      console.error('ゾーン更新エラー:', { body_name, error: error.message });
      throw error;
    }
  }

  // ゾーン削除
  deleteZone(body_name) {
    try {
      if (body_name === 'ATMOSPHERE') {
        throw new Error('ATMOSPHEREゾーンは削除できません');
      }
      
      this.pendingChanges.push({ 
        action: "delete_zone", 
        body_name,
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('ゾーン削除提案:', { body_name });
      return `提案: ゾーン ${body_name} の削除を保留しました`;
    } catch (error) {
      console.error('ゾーン削除エラー:', { body_name, error: error.message });
      throw error;
    }
  }

  // 変換提案
  proposeTransform(name, operations) {
    try {
      if (!name) throw new Error('変換名は必須です');
      if (!Array.isArray(operations) || operations.length === 0) {
        throw new Error('operationは配列で1つ以上必要です');
      }

      this.pendingChanges.push({ 
        action: "add_transform", 
        transform: { name, operation: operations },
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('変換提案追加:', { name, operations });
      return `回転移動 ${name} を追加しました`;
    } catch (error) {
      console.error('変換提案エラー:', { name, error: error.message });
      throw error;
    }
  }

  // 変換更新
  updateTransform(name, updates) {
    try {
      if (!name) throw new Error('変換名は必須です');

      this.pendingChanges.push({ 
        action: "update_transform", 
        name, 
        updates,
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('変換更新提案:', { name, updates });
      return `提案: 変換 ${name} の更新を保留しました`;
    } catch (error) {
      console.error('変換更新エラー:', { name, error: error.message });
      throw error;
    }
  }

  // 変換削除
  deleteTransform(name) {
    try {
      if (!name) throw new Error('変換名は必須です');

      this.pendingChanges.push({ 
        action: "delete_transform", 
        name,
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('変換削除提案:', { name });
      return `提案: 変換 ${name} の削除を保留しました`;
    } catch (error) {
      console.error('変換削除エラー:', { name, error: error.message });
      throw error;
    }
  }

  // ビルドアップ係数提案
  proposeBuildupFactor(material, use_slant_correction, use_finite_medium_correction) {
    try {
      if (!material) throw new Error('materialは必須です');

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
    } catch (error) {
      console.error('ビルドアップ係数提案エラー:', { material, error: error.message });
      throw error;
    }
  }

  // ビルドアップ係数更新
  updateBuildupFactor(material, updates) {
    try {
      if (!material) throw new Error('materialは必須です');

      this.pendingChanges.push({ 
        action: "update_buildup_factor", 
        material, 
        updates,
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('ビルドアップ係数更新提案:', { material, updates });
      return `提案: ビルドアップ係数 ${material} の更新を保留しました`;
    } catch (error) {
      console.error('ビルドアップ係数更新エラー:', { material, error: error.message });
      throw error;
    }
  }

  // ビルドアップ係数削除
  deleteBuildupFactor(material) {
    try {
      if (!material) throw new Error('materialは必須です');

      this.pendingChanges.push({ 
        action: "delete_buildup_factor", 
        material,
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('ビルドアップ係数削除提案:', { material });
      return `提案: ビルドアップ係数 ${material} の削除を保留しました`;
    } catch (error) {
      console.error('ビルドアップ係数削除エラー:', { material, error: error.message });
      throw error;
    }
  }

  // ビルドアップ係数順序変更
  changeOrderBuildupFactor(material, newIndex) {
    try {
      if (!material) throw new Error('materialは必須です');

      this.pendingChanges.push({ 
        action: "reorder_buildup_factor", 
        material, 
        newIndex,
        timestamp: new Date().toISOString()
      });
      this.savePendingChanges();
      
      console.log('ビルドアップ係数順序変更提案:', { material, newIndex });
      return `提案: ビルドアップ係数 ${material} の順序変更を保留しました`;
    } catch (error) {
      console.error('ビルドアップ係数順序変更エラー:', { material, error: error.message });
      throw error;
    }
  }

  // 線源提案
  proposeSource(params) {
    try {
      const { name, type, position, inventory, cutoff_rate } = params;
      
      if (!name) throw new Error('線源名は必須です');
      if (!type) throw new Error('線源タイプは必須です');
      if (!position) throw new Error('線源位置は必須です');
      if (!inventory || !Array.isArray(inventory) || inventory.length === 0) {
        throw new Error('inventoryは必須で、配列である必要があります');
      }
      
      // inventoryの検証
      for (const item of inventory) {
        if (!item.nuclide) throw new Error('inventory要素にnuclideが必要');
        if (typeof item.radioactivity !== 'number') throw new Error('inventory要素にradioactivityが必要');
      }

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
    } catch (error) {
      console.error('線源提案エラー:', { params, error: error.message });
      throw error;
    }
  }

  // 変更適用（完全実装）
  applyChanges() {
    try {
      console.log('変更適用開始:', this.pendingChanges.length);
      
      if (this.pendingChanges.length === 0) {
        return '適用する変更がありません';
      }

      for (const change of this.pendingChanges) {
        this.applyChange(change);
      }

      this.saveYamlData();
      this.pendingChanges = [];
      this.savePendingChanges();
      
      console.log('変更適用完了');
      return '変更を正常に適用しました';
    } catch (error) {
      console.error('変更適用エラー:', error.message);
      throw error;
    }
  }

  // 個別変更適用（完全実装）
  applyChange(change) {
    if (change.action === "add_body") {
      const body = this.findBodyByName(change.body.name);
      if (body) {
        Object.assign(body, change.body);
      } else {
        if (!this.data.body) this.data.body = [];
        this.data.body.push(change.body);
      }
    } else if (change.action === "add_zone") {
      const zone = this.findZoneByBodyName(change.zone.body_name);
      if (zone) {
        Object.assign(zone, change.zone);
      } else {
        if (!this.data.zone) this.data.zone = [];
        this.data.zone.push(change.zone);
      }
    } else if (change.action === "delete_body") {
      const bodyIndex = this.data.body.findIndex(b => b.name === change.name);
      if (bodyIndex !== -1) this.data.body.splice(bodyIndex, 1);
    } else if (change.action === "delete_zone") {
      if (change.body_name === 'ATMOSPHERE') return;
      const zoneIndex = this.data.zone.findIndex(z => z.body_name === change.body_name);
      if (zoneIndex !== -1) this.data.zone.splice(zoneIndex, 1);
    } else if (change.action === "update_body") {
      const body = this.findBodyByName(change.name);
      if (body) {
        Object.keys(change.updates).forEach(key => {
          if (change.updates[key] === null) {
            delete body[key];
          } else {
            body[key] = change.updates[key];
          }
        });
      }
    } else if (change.action === "update_zone") {
      const zone = this.findZoneByBodyName(change.body_name);
      if (zone) {
        if (change.updates.new_body_name !== undefined) zone.body_name = change.updates.new_body_name;
        if (change.updates.material !== undefined) zone.material = change.updates.material;
        if (change.updates.density !== undefined) {
          if (change.updates.density === null) {
            delete zone.density;
          } else {
            zone.density = change.updates.density;
          }
        }
      }
    } else if (change.action === "add_transform") {
      if (!this.data.transform) this.data.transform = [];
      const existingTransform = this.data.transform.find(t => t.name === change.transform.name);
      if (existingTransform) {
        existingTransform.operation = change.transform.operation;
      } else {
        this.data.transform.push(change.transform);
      }
    } else if (change.action === "update_transform") {
      if (!this.data.transform) this.data.transform = [];
      const t = this.data.transform.find(t => t.name === change.name);
      if (t) {
        if (change.updates.new_name) t.name = change.updates.new_name;
        if (change.updates.operation) t.operation = change.updates.operation;
      }
    } else if (change.action === "delete_transform") {
      if (!this.data.transform) this.data.transform = [];
      const idx = this.data.transform.findIndex(t => t.name === change.name);
      if (idx !== -1) this.data.transform.splice(idx, 1);
    } else if (change.action === "add_buildup_factor") {
      if (!this.data.buildup_factor) this.data.buildup_factor = [];
      const idx = this.data.buildup_factor.findIndex(bf => bf.material === change.buildup_factor.material);
      if (idx !== -1) {
        this.data.buildup_factor[idx] = change.buildup_factor;
      } else {
        this.data.buildup_factor.push(change.buildup_factor);
      }
    } else if (change.action === "delete_buildup_factor") {
      if (!this.data.buildup_factor) this.data.buildup_factor = [];
      const idx = this.data.buildup_factor.findIndex(bf => bf.material === change.material);
      if (idx !== -1) {
        this.data.buildup_factor.splice(idx, 1);
      }
    } else if (change.action === "reorder_buildup_factor") {
      if (!this.data.buildup_factor) this.data.buildup_factor = [];
      const idx = this.data.buildup_factor.findIndex(bf => bf.material === change.material);
      if (idx !== -1 && typeof change.newIndex === 'number' && change.newIndex >= 0 && change.newIndex < this.data.buildup_factor.length) {
        const [item] = this.data.buildup_factor.splice(idx, 1);
        this.data.buildup_factor.splice(change.newIndex, 0, item);
      }
    } else if (change.action === "update_buildup_factor") {
      if (!this.data.buildup_factor) this.data.buildup_factor = [];
      const bf = this.data.buildup_factor.find(bf => bf.material === change.material);
      if (bf) {
        if ('use_slant_correction' in change.updates) {
          bf.use_slant_correction = change.updates.use_slant_correction;
        }
        if ('use_finite_medium_correction' in change.updates) {
          bf.use_finite_medium_correction = change.updates.use_finite_medium_correction;
        }
      }
    } else if (change.action === "add_source") {
      if (!this.data.source) this.data.source = [];
      const existingSource = this.data.source.find(s => s.name === change.source.name);
      if (existingSource) {
        Object.assign(existingSource, change.source);
      } else {
        this.data.source.push(change.source);
      }
    }
  }
}

// Express アプリケーション設定
const app = express();
const PORT = process.env.PORT || 3020;

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
    name: "poker-mcp-final-fixed",
    version: "3.0.1",
    description: "Complete MCP Server FINAL - 構文エラー修正版",
    port: PORT,
    features: [
      "全15のMCPメソッド完全実装",
      "実際のYAMLファイル更新",
      "自動バックアップ機能",
      "完全なエラーハンドリング",
      "JSON-RPC 2.0完全対応"
    ],
    methods: [
      "pokerinput.proposeBody", "pokerinput.updateBody", "pokerinput.deleteBody",
      "pokerinput.proposeZone", "pokerinput.updateZone", "pokerinput.deleteZone",
      "pokerinput.proposeTransform", "pokerinput.updateTransform", "pokerinput.deleteTransform",
      "pokerinput.proposeBuildupFactor", "pokerinput.updateBuildupFactor", "pokerinput.deleteBuildupFactor",
      "pokerinput.changeOrderBuildupFactor", "pokerinput.proposeSource", "pokerinput.applyChanges"
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
      case 'pokerinput.proposeBody':
        try {
          const { name, type, ...options } = jsonBody.params;
          if (!name || !type) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameとtypeは必須です'));
          }
          const result = manager.proposeBody(name, type, options);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体提案エラー: ${error.message}`));
        }

      case 'pokerinput.updateBody':
        try {
          const { name, ...updates } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameは必須です'));
          }
          const result = manager.updateBody(name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体更新エラー: ${error.message}`));
        }

      case 'pokerinput.deleteBody':
        try {
          const { name } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameは必須です'));
          }
          const result = manager.deleteBody(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体削除エラー: ${error.message}`));
        }

      case 'pokerinput.proposeZone':
        try {
          const { body_name, material, density } = jsonBody.params;
          if (!body_name || !material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: body_nameとmaterialは必須です'));
          }
          const result = manager.proposeZone(body_name, material, density);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン提案エラー: ${error.message}`));
        }

      case 'pokerinput.updateZone':
        try {
          const { body_name, ...updates } = jsonBody.params;
          if (!body_name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: body_nameは必須です'));
          }
          const result = manager.updateZone(body_name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン更新エラー: ${error.message}`));
        }

      case 'pokerinput.deleteZone':
        try {
          const { body_name } = jsonBody.params;
          if (!body_name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: body_nameは必須です'));
          }
          const result = manager.deleteZone(body_name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン削除エラー: ${error.message}`));
        }

      case 'pokerinput.proposeTransform':
        try {
          const { name, operation } = jsonBody.params;
          if (!name || !operation) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameとoperationは必須です'));
          }
          const result = manager.proposeTransform(name, operation);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変換提案エラー: ${error.message}`));
        }

      case 'pokerinput.updateTransform':
        try {
          const { name, ...updates } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameは必須です'));
          }
          const result = manager.updateTransform(name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変換更新エラー: ${error.message}`));
        }

      case 'pokerinput.deleteTransform':
        try {
          const { name } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameは必須です'));
          }
          const result = manager.deleteTransform(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変換削除エラー: ${error.message}`));
        }

      case 'pokerinput.proposeBuildupFactor':
        try {
          const { material, use_slant_correction, use_finite_medium_correction } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.proposeBuildupFactor(material, use_slant_correction, use_finite_medium_correction);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数提案エラー: ${error.message}`));
        }

      case 'pokerinput.updateBuildupFactor':
        try {
          const { material, ...updates } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.updateBuildupFactor(material, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数更新エラー: ${error.message}`));
        }

      case 'pokerinput.deleteBuildupFactor':
        try {
          const { material } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.deleteBuildupFactor(material);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数削除エラー: ${error.message}`));
        }

      case 'pokerinput.changeOrderBuildupFactor':
        try {
          const { material, newIndex } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.changeOrderBuildupFactor(material, newIndex);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数順序変更エラー: ${error.message}`));
        }

      case 'pokerinput.proposeSource':
        try {
          const result = manager.proposeSource(jsonBody.params);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `線源提案エラー: ${error.message}`));
        }

      case 'pokerinput.applyChanges':
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
    console.error('予期しないエラー:', error.message, error.stack);
    return res.json(jsonRpcError(req.body?.id, -32603, 'サーバー内部エラー'));
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0.1',
    pendingChanges: manager.pendingChanges.length,
    dataFiles: {
      yaml: manager.yamlFile,
      pending: manager.pendingFile
    },
    features: {
      backupEnabled: true,
      realDataUpdate: true,
      fullApplyChanges: true
    }
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Complete MCP Server FINAL (修正版) が起動しました`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📋 利用可能なエンドポイント:`);
  console.log(`   - JSON-RPC: POST /mcp`);
  console.log(`   - 情報取得: GET /`);
  console.log(`   - ヘルスチェック: GET /health`);
  console.log(`✨ 全15のMCPメソッドが利用可能です`);
  console.log(`📁 データファイル: ${manager.yamlFile}`);
  console.log(`🔄 保留変更: ${manager.pendingChanges.length}件`);
  console.log(`💾 自動バックアップ機能: 有効`);
  console.log(`🔧 実際のYAML更新: 有効`);
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n⏹️  サーバーを停止しています...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('未捕捉例外:', error.message, error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理のPromise拒否:', reason, promise);
});
