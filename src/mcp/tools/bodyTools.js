// mcp/tools/bodyTools.js
export const bodyTools = [
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
          description: '中心座標 (x y z形式) - SPH用'
        },
        radius: {
          type: 'number',
          description: '半径 - SPH, RCC用',
          minimum: 0
        },
        bottom_center: {
          type: 'string',
          description: '底面中心座標 (x y z形式) - RCC用'
        },
        height_vector: {
          type: 'string',
          description: '高さベクトル (x y z形式) - RCC用'
        },
        min: {
          type: 'string',
          description: '最小座標 (x y z形式) - RPP用'
        },
        max: {
          type: 'string',
          description: '最大座標 (x y z形式) - RPP用'
        },
        vertex: {
          type: 'string',
          description: '頂点座標 (x y z形式) - BOX用'
        },
        edge_1: {
          type: 'string',
          description: 'エッジ1ベクトル (x y z形式) - BOX用'
        },
        edge_2: {
          type: 'string',
          description: 'エッジ2ベクトル (x y z形式) - BOX用'
        },
        edge_3: {
          type: 'string',
          description: 'エッジ3ベクトル (x y z形式) - BOX用'
        },
        expression: {
          type: 'string',
          description: '組み合わせ式 - CMB用'
        },
        transform: {
          type: 'string',
          description: '適用する変換名'
        }
      },
      required: ['name', 'type']
    }
  },
  {
    name: 'pokerinput_updateBody',
    description: '既存立体のパラメータを更新します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '更新する立体名'
        },
        center: { type: 'string', description: '新しい中心座標' },
        radius: { type: 'number', description: '新しい半径', minimum: 0 },
        bottom_center: { type: 'string', description: '新しい底面中心座標' },
        height_vector: { type: 'string', description: '新しい高さベクトル' },
        min: { type: 'string', description: '新しい最小座標' },
        max: { type: 'string', description: '新しい最大座標' },
        transform: { type: 'string', description: '新しい変換名' }
      },
      required: ['name']
    }
  },
  {
    name: 'pokerinput_deleteBody',
    description: '立体を削除します（依存関係チェック付き）',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '削除する立体名'
        }
      },
      required: ['name']
    }
  }
];
