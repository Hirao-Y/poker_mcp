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

  // ゾーン提案
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
        
      case 'pokerinput_applyChanges':
        const result3 = manager.applyChanges(args.force, args.backup_comment);
        return { content: [{ type: 'text', text: JSON.stringify(result3, null, 2) }] };
        
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
