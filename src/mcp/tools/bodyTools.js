// mcp/tools/bodyTools.js
export const bodyTools = [
  {
    name: 'poker_proposeBody',
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
          description: '中心座標 (x y z形式) - SPH,ELL,TOR用'
        },
        radius: {
          type: 'number',
          description: '半径 - SPH, RCC用',
          minimum: 0.001,
          maximum: 10000
        },
        bottom_center: {
          type: 'string',
          description: '底面中心座標 (x y z形式) - RCC,TRC,REC用'
        },
        height_vector: {
          type: 'string',
          description: '高さベクトル (x y z形式) - RCC,TRC,REC,WED用'
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
          description: '頂点座標 (x y z形式) - BOX,WED用'
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
        // TOR用パラメータ
        normal: {
          type: 'string',
          description: '法線ベクトル (x y z形式) - TOR用'
        },
        major_radius: {
          type: 'number',
          description: '主半径 - TOR用',
          minimum: 0.001,
          maximum: 10000
        },
        minor_radius_horizontal: {
          type: 'number',
          description: '水平方向副半径 - TOR用',
          minimum: 0.001,
          maximum: 10000
        },
        minor_radius_vertical: {
          type: 'number',
          description: '垂直方向副半径 - TOR用',
          minimum: 0.001,
          maximum: 10000
        },
        // ELL用パラメータ
        radius_vector_1: {
          type: 'string',
          description: '半径ベクトル1 (x y z形式) - ELL,REC用'
        },
        radius_vector_2: {
          type: 'string',
          description: '半径ベクトル2 (x y z形式) - ELL,REC用'
        },
        radius_vector_3: {
          type: 'string',
          description: '半径ベクトル3 (x y z形式) - ELL用'
        },
        // TRC用パラメータ
        bottom_radius: {
          type: 'number',
          description: '底面半径 - TRC用',
          minimum: 0.001,
          maximum: 10000
        },
        top_radius: {
          type: 'number',
          description: '上面半径 - TRC用',
          minimum: 0.001,
          maximum: 10000
        },
        // WED用パラメータ
        width_vector: {
          type: 'string',
          description: '幅ベクトル (x y z形式) - WED用'
        },
        depth_vector: {
          type: 'string',
          description: '奥行きベクトル (x y z形式) - WED用'
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
    name: 'poker_updateBody',
    description: '既存立体のパラメータを更新します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '更新する立体名'
        },
        center: { type: 'string', description: '新しい中心座標 (x y z形式)' },
        radius: { type: 'number', description: '新しい半径', minimum: 0.001, maximum: 10000 },
        bottom_center: { type: 'string', description: '新しい底面中心座標 (x y z形式)' },
        height_vector: { type: 'string', description: '新しい高さベクトル (x y z形式)' },
        min: { type: 'string', description: '新しい最小座標 (x y z形式)' },
        max: { type: 'string', description: '新しい最大座標 (x y z形式)' },
        vertex: { type: 'string', description: '新しい頂点座標 (x y z形式)' },
        edge_1: { type: 'string', description: '新しいエッジ1ベクトル (x y z形式)' },
        edge_2: { type: 'string', description: '新しいエッジ2ベクトル (x y z形式)' },
        edge_3: { type: 'string', description: '新しいエッジ3ベクトル (x y z形式)' },
        expression: { type: 'string', description: '新しい組み合わせ式' },
        // TOR用パラメータ
        normal: { type: 'string', description: '新しい法線ベクトル (x y z形式)' },
        major_radius: { type: 'number', description: '新しい主半径', minimum: 0.001, maximum: 10000 },
        minor_radius_horizontal: { type: 'number', description: '新しい水平方向副半径', minimum: 0.001, maximum: 10000 },
        minor_radius_vertical: { type: 'number', description: '新しい垂直方向副半径', minimum: 0.001, maximum: 10000 },
        // ELL用パラメータ
        radius_vector_1: { type: 'string', description: '新しい半径ベクトル1 (x y z形式)' },
        radius_vector_2: { type: 'string', description: '新しい半径ベクトル2 (x y z形式)' },
        radius_vector_3: { type: 'string', description: '新しい半径ベクトル3 (x y z形式)' },
        // TRC用パラメータ
        bottom_radius: { type: 'number', description: '新しい底面半径', minimum: 0.001, maximum: 10000 },
        top_radius: { type: 'number', description: '新しい上面半径', minimum: 0.001, maximum: 10000 },
        // WED用パラメータ
        width_vector: { type: 'string', description: '新しい幅ベクトル (x y z形式)' },
        depth_vector: { type: 'string', description: '新しい奥行きベクトル (x y z形式)' },
        transform: { type: 'string', description: '新しい変換名' }
      },
      required: ['name']
    }
  },
  {
    name: 'poker_deleteBody',
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
