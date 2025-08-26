#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import yaml from 'js-yaml';

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

// TaskManager クラス（簡略版）
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
  }

  loadYamlData(yamlFile) {
    try {
      const data = yaml.load(fs.readFileSync(yamlFile, 'utf8'));
      return data;
    } catch (error) {
      const initialData = { body: [], zone: [], transform: [], buildup_factor: [], source: [] };
      this.saveYamlData(initialData);
      return initialData;
    }
  }

  loadPendingChanges(pendingFile) {
    try {
      return JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
    } catch (error) {
      return [];
    }
  }

  savePendingChanges() {
    try {
      fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingChanges, null, 2));
    } catch (error) {
      console.error('保留変更保存エラー:', error);
    }
  }

  saveYamlData(data) {
    try {
      fs.writeFileSync(this.yamlFile, yaml.dump(data, { 
        noRefs: true, 
        sortKeys: false,
        lineWidth: -1 
      }));
    } catch (error) {
      console.error('YAML保存エラー:', error);
    }
  }

  // 立体提案
  proposeBody(name, type, parameters) {
    // 基本的な検証
    if (!name || !type) {
      throw new Error('名前とタイプは必須です');
    }

    const bodyData = { name, type, ...parameters };
    
    // 保留中の変更に追加
    this.pendingChanges.push({
      action: 'propose_body',
      data: bodyData,
      timestamp: new Date().toISOString()
    });
    
    this.savePendingChanges();
    return { success: true, message: `立体 ${name} を提案しました` };
  }

  // Source提案
  proposeSource(sourceData) {
    const { name, type, position, geometry, division, inventory, cutoff_rate } = sourceData;
    
    // 基本的な検証
    if (!name || !type || !inventory) {
      throw new Error('名前、タイプ、インベントリは必須です');
    }

    // POINT線源の場合はpositionが必要
    if (type === 'POINT' && !position) {
      throw new Error('POINT線源にはpositionが必要です');
    }

    // 複雑線源の場合はgeometry/divisionが必要
    if (type !== 'POINT') {
      if (!geometry) {
        throw new Error(`${type}線源にはgeometryが必要です`);
      }
      if (!division) {
        throw new Error(`${type}線源にはdivisionが必要です`);
      }
    }

    // インベントリの検証
    if (!Array.isArray(inventory) || inventory.length === 0) {
      throw new Error('inventoryは1つ以上の配列である必要があります');
    }

    for (const item of inventory) {
      if (!item.nuclide || typeof item.radioactivity !== 'number' || item.radioactivity <= 0) {
        throw new Error('inventory要素にはnuclideと正の数値のradioactivityが必要です');
      }
    }

    const sourceInfo = { name, type, position, geometry, division, inventory, cutoff_rate };
    
    // 保留中の変更に追加
    this.pendingChanges.push({
      action: 'propose_source',
      data: sourceInfo,
      timestamp: new Date().toISOString()
    });
    
    this.savePendingChanges();
    return { success: true, message: `線源 ${name} (${type}) を提案しました` };
  }

  // Source更新
  updateSource(name, updates) {
    if (!name) {
      throw new Error('線源名は必須です');
    }

    this.pendingChanges.push({
      action: 'update_source',
      data: { name, ...updates },
      timestamp: new Date().toISOString()
    });
    
    this.savePendingChanges();
    return { success: true, message: `線源 ${name} の更新を提案しました` };
  }

  // Source削除
  deleteSource(name) {
    if (!name) {
      throw new Error('線源名は必須です');
    }

    this.pendingChanges.push({
      action: 'delete_source',
      data: { name },
      timestamp: new Date().toISOString()
    });
    
    this.savePendingChanges();
    return { success: true, message: `線源 ${name} の削除を提案しました` };
  }
  proposeZone(body_name, material, density) {
    if (!body_name || !material) {
      throw new Error('立体名と材料は必須です');
    }

    const zoneData = { body_name, material, density };
    
    this.pendingChanges.push({
      action: 'propose_zone',
      data: zoneData,
      timestamp: new Date().toISOString()
    });
    
    this.savePendingChanges();
    return { success: true, message: `ゾーン ${body_name} を提案しました` };
  }

  // 変更適用
  applyChanges(force = false, backup_comment = '') {
    if (this.pendingChanges.length === 0) {
      return { success: true, message: '適用する変更がありません' };
    }

    // バックアップ作成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${this.backupDir}/backup_${timestamp}.yaml`;
    
    try {
      fs.copyFileSync(this.yamlFile, backupFile);
    } catch (error) {
      console.warn('バックアップ作成警告:', error);
    }

    // 変更を適用
    this.pendingChanges.forEach(change => {
      switch (change.action) {
        case 'propose_body':
          if (!this.data.body) this.data.body = [];
          this.data.body.push(change.data);
          break;
        case 'propose_zone':
          if (!this.data.zone) this.data.zone = [];
          this.data.zone.push(change.data);
          break;
        case 'propose_source':
          if (!this.data.source) this.data.source = [];
          this.data.source.push(change.data);
          break;
        case 'update_source':
          if (!this.data.source) this.data.source = [];
          const existingSourceIndex = this.data.source.findIndex(s => s.name === change.data.name);
          if (existingSourceIndex >= 0) {
            this.data.source[existingSourceIndex] = { ...this.data.source[existingSourceIndex], ...change.data };
          }
          break;
        case 'delete_source':
          if (this.data.source) {
            this.data.source = this.data.source.filter(s => s.name !== change.data.name);
          }
          break;
      }
    });

    this.saveYamlData(this.data);
    
    const appliedCount = this.pendingChanges.length;
    this.pendingChanges = [];
    this.savePendingChanges();

    return { 
      success: true, 
      message: `${appliedCount}件の変更を適用しました`,
      backup: backupFile
    };
  }
}

// MCPサーバーの作成
const server = new Server(
  {
    name: 'pokerinput-mcp-final',
    version: '3.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// TaskManager初期化
const manager = new TaskManager('tasks/pokerinputs.yaml', 'tasks/pending_changes.json');

// ツール一覧
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'pokerinput_proposeBody',
        description: '新しい3D立体を提案します（自動バックアップ付き）',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '立体の一意な名前'
            },
        {
          name: 'pokerinput_proposeSource',
          description: '新しい線源を提案します',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '線源の名前（一意である必要があります）'
              },
              type: {
                type: 'string',
                description: '線源タイプ',
                enum: ['POINT', 'SPH', 'RCC', 'RPP', 'BOX']
              },
              position: {
                type: 'string',
                description: '線源の位置（x y z形式）、typeがPOINTの場合のみ必須'
              },
              inventory: {
                type: 'array',
                description: '核種と放射能の組の配列',
                minItems: 1,
                items: {
                  type: 'object',
                  properties: {
                    nuclide: {
                      type: 'string',
                      description: '核種名（連結形式、例: Cs137, Co60）'
                    },
                    radioactivity: {
                      type: 'number',
                      description: '放射能（単位Bq）',
                      minimum: 0.001
                    }
                  },
                  required: ['nuclide', 'radioactivity']
                }
              },
              geometry: {
                type: 'object',
                description: '線源形状パラメータ（typeがPOINT以外の場合に必須）'
              },
              division: {
                type: 'object',
                description: '線源の領域分割パラメータ（typeがPOINT以外の場合に必須）'
              },
              cutoff_rate: {
                type: 'number',
                description: 'カットオフレート',
                minimum: 0,
                maximum: 1,
                default: 0.01
              }
            },
            required: ['name', 'type', 'inventory']
          }
        },
        {
          name: 'pokerinput_updateSource',
          description: '既存放射線源のパラメータを更新します',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '更新対象線源名'
              },
              position: {
                type: 'string',
                description: '新しい線源位置 (x y z形式)'
              },
              inventory: {
                type: 'array',
                description: '新しい核種インベントリ',
                items: {
                  type: 'object',
                  properties: {
                    nuclide: {
                      type: 'string',
                      description: '核種名（連結形式、例: Cs137, Co60）'
                    },
                    radioactivity: {
                      type: 'number',
                      description: '放射能 (Bq)',
                      minimum: 0.001
                    }
                  },
                  required: ['nuclide', 'radioactivity']
                },
                minItems: 1
              },
              geometry: {
                type: 'object',
                description: '新しい形状パラメータ'
              },
              division: {
                type: 'object',
                description: '新しい分割パラメータ'
              },
              cutoff_rate: {
                type: 'number',
                description: '新しいカットオフレート',
                minimum: 0,
                maximum: 1
              }
            },
            required: ['name']
          }
        },
        {
          name: 'pokerinput_deleteSource',
          description: '放射線源を削除します',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '削除対象線源名'
              }
            },
            required: ['name']
          },
            type: {
              type: 'string',
              description: '立体タイプ',
              enum: ['SPH', 'RCC', 'RPP', 'BOX', 'CMB', 'TOR', 'ELL', 'REC', 'TRC', 'WED']
            },
            center: {
              type: 'string',
              description: '中心座標 (x y z形式)',
            },
            radius: {
              type: 'number',
              description: '半径 (SPH用)',
              minimum: 0
            }
          },
          required: ['name', 'type']
        }
      },
      {
        name: 'pokerinput_proposeZone',
        description: '材料ゾーンを提案します',
        inputSchema: {
          type: 'object',
          properties: {
            body_name: {
              type: 'string',
              description: 'ゾーンが適用される立体名'
            },
            material: {
              type: 'string',
              description: '材料名'
            },
            density: {
              type: 'number',
              description: '密度 (g/cm³)',
              minimum: 0
            }
          },
          required: ['body_name', 'material']
        }
      },
      {
        name: 'pokerinput_applyChanges',
        description: '保留中の全変更を実際のYAMLファイルに適用します（自動バックアップ実行）',
        inputSchema: {
          type: 'object',
          properties: {
            force: {
              type: 'boolean',
              description: '強制適用フラグ（警告を無視）',
              default: false
            },
            backup_comment: {
              type: 'string',
              description: 'バックアップのコメント',
              maxLength: 200
            }
          }
        }
      }
    ],
  };
});

// ツール実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'pokerinput_proposeBody':
        const result1 = manager.proposeBody(args.name, args.type, args);
        return { content: [{ type: 'text', text: JSON.stringify(result1, null, 2) }] };
        
      case 'pokerinput_proposeZone':
        const result2 = manager.proposeZone(args.body_name, args.material, args.density);
        return { content: [{ type: 'text', text: JSON.stringify(result2, null, 2) }] };
        
      case 'pokerinput_proposeSource':
        const result3 = manager.proposeSource(args);
        return { content: [{ type: 'text', text: JSON.stringify(result3, null, 2) }] };
        
      case 'pokerinput_updateSource':
        const result4 = manager.updateSource(args.name, args);
        return { content: [{ type: 'text', text: JSON.stringify(result4, null, 2) }] };
        
      case 'pokerinput_deleteSource':
        const result5 = manager.deleteSource(args.name);
        return { content: [{ type: 'text', text: JSON.stringify(result5, null, 2) }] };
        
      case 'pokerinput_applyChanges':
        const result6 = manager.applyChanges(args.force, args.backup_comment);
        return { content: [{ type: 'text', text: JSON.stringify(result6, null, 2) }] };
        
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error.message);
  }
});

// サーバー開始
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Poker MCP Server started on stdio');
}

run().catch(console.error);
