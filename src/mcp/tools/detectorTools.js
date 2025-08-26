// mcp/tools/detectorTools.js
export const detectorTools = [
  {
    name: 'pokerinput_proposeDetector',
    description: '新しい検出器を提案します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '検出器の名前（一意である必要があります）',
          pattern: '^[a-zA-Z0-9_]+$',
          maxLength: 50
        },
        origin: {
          type: 'string',
          description: '検出器の基準位置（x y z形式）',
          pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
        },
        grid: {
          type: 'array',
          description: 'エッジベクトルと分割数の組の配列（配列の数が検出器の次元を表す: 1D/2D/3D）',
          minItems: 0,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              edge: {
                type: 'string',
                description: 'エッジベクトル（x y z形式）',
                pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
              },
              number: {
                type: 'integer',
                description: '分割数',
                minimum: 1,
                maximum: 10000
              }
            },
            required: ['edge', 'number'],
            additionalProperties: false
          }
        },
        transform: {
          type: 'string',
          description: '適用する変換名（オプション）',
          pattern: '^[a-zA-Z0-9_]+$',
          maxLength: 50
        },
        show_path_trace: {
          type: 'boolean',
          description: '透過線の経路トレースをサマリーに出力するか',
          default: false
        }
      },
      required: ['name', 'origin'],
      additionalProperties: false
    }
  },
  
  {
    name: 'pokerinput_updateDetector',
    description: '既存検出器のパラメータを更新します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '更新する検出器の名前'
        },
        origin: {
          type: 'string',
          description: '新しい検出器の基準位置（x y z形式）',
          pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
        },
        grid: {
          type: 'array',
          description: '新しいエッジベクトルと分割数の組の配列',
          minItems: 0,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              edge: {
                type: 'string',
                description: 'エッジベクトル（x y z形式）',
                pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
              },
              number: {
                type: 'integer',
                description: '分割数',
                minimum: 1,
                maximum: 10000
              }
            },
            required: ['edge', 'number'],
            additionalProperties: false
          }
        },
        transform: {
          type: 'string',
          description: '新しい変換名',
          pattern: '^[a-zA-Z0-9_]+$',
          maxLength: 50
        },
        show_path_trace: {
          type: 'boolean',
          description: '透過線の経路トレースをサマリーに出力するか'
        }
      },
      required: ['name'],
      additionalProperties: false
    }
  },
  
  {
    name: 'pokerinput_deleteDetector',
    description: '検出器を削除します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '削除する検出器の名前'
        }
      },
      required: ['name'],
      additionalProperties: false
    }
  }
];
