// mcp/tools/detectorTools.js
// 検出器関連のMCPツール定義

export const detectorTools = [
  {
    name: 'pokerinput_proposeDetector',
    description: '新しい検出器を提案します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '検出器の名前（一意である必要があります）'
        },
        origin: {
          type: 'string',
          description: '検出器の基準位置（x y z形式）'
        },
        grid: {
          type: 'array',
          description: 'エッジベクトルと分割数の組の配列（配列の数が検出器の次元を表す）',
          items: {
            type: 'object',
            properties: {
              edge: {
                type: 'string',
                description: 'エッジベクトル（x y z形式）'
              },
              number: {
                type: 'integer',
                description: '分割数',
                minimum: 1
              }
            },
            required: ['edge', 'number']
          }
        },
        show_path_trace: {
          type: 'boolean',
          description: '透過線の経路トレースをサマリーに出力するか',
          default: false
        }
      },
      required: ['name', 'origin']
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
          description: '新しい検出器の基準位置（x y z形式）'
        },
        grid: {
          type: 'array',
          description: '新しいエッジベクトルと分割数の組の配列（配列の数が検出器の次元を表す）',
          items: {
            type: 'object',
            properties: {
              edge: {
                type: 'string',
                description: 'エッジベクトル（x y z形式）'
              },
              number: {
                type: 'integer',
                description: '分割数',
                minimum: 1
              }
            },
            required: ['edge', 'number']
          }
        },
        show_path_trace: {
          type: 'boolean',
          description: '透過線の経路トレースをサマリーに出力するか'
        }
      },
      required: ['name']
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
      required: ['name']
    }
  }
];
