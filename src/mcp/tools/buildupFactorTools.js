// mcp/tools/buildupFactorTools.js
export const buildupFactorTools = [
  {
    name: 'pokerinput_proposeBuildupFactor',
    description: 'ビルドアップ係数を提案します',
    inputSchema: {
      type: 'object',
      properties: {
        material: {
          type: 'string',
          description: '材料名'
        },
        use_slant_correction: {
          type: 'boolean',
          description: 'スラント補正を使用するか',
          default: false
        },
        use_finite_medium_correction: {
          type: 'boolean',
          description: '有限媒体補正を使用するか',
          default: false
        }
      },
      required: ['material', 'use_slant_correction', 'use_finite_medium_correction']
    }
  },
  {
    name: 'pokerinput_updateBuildupFactor',
    description: '既存ビルドアップ係数の設定を更新します',
    inputSchema: {
      type: 'object',
      properties: {
        material: {
          type: 'string',
          description: '更新する材料名'
        },
        use_slant_correction: {
          type: 'boolean',
          description: '新しいスラント補正設定'
        },
        use_finite_medium_correction: {
          type: 'boolean',
          description: '新しい有限媒体補正設定'
        }
      },
      required: ['material']
    }
  },
  {
    name: 'pokerinput_deleteBuildupFactor',
    description: 'ビルドアップ係数を削除します',
    inputSchema: {
      type: 'object',
      properties: {
        material: {
          type: 'string',
          description: '削除する材料名'
        }
      },
      required: ['material']
    }
  },
  {
    name: 'pokerinput_changeOrderBuildupFactor',
    description: 'ビルドアップ係数の順序を変更します',
    inputSchema: {
      type: 'object',
      properties: {
        material: {
          type: 'string',
          description: '順序を変更する材料名'
        },
        newIndex: {
          type: 'integer',
          description: '新しいインデックス位置',
          minimum: 0
        }
      },
      required: ['material', 'newIndex']
    }
  }
];
