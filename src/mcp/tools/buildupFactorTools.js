// mcp/tools/buildupFactorTools.js
export const buildupFactorTools = [
  {
    name: 'poker_proposeBuildupFactor',
    description: 'ビルドアップ係数を提案します。【重要】use_slant_correction と use_finite_medium_correction は必須パラメータですが、標準的な遮蔽計算では両方ともfalseを指定してください。特殊な高精度計算が明確に必要な場合のみtrueを使用します。',
    inputSchema: {
      type: 'object',
      properties: {
        material: {
          type: 'string',
          description: '材料名'
        },
        use_slant_correction: {
          type: 'boolean',
          description: 'スラント補正: false=標準計算（推奨）、true=複雑角度幾何学のみ',
          default: false
        },
        use_finite_medium_correction: {
          type: 'boolean',
          description: '有限媒体補正: false=標準計算（推奨）、true=境界効果高精度計算のみ',
          default: false
        }
      },
      required: ['material', 'use_slant_correction', 'use_finite_medium_correction']
    }
  },
  {
    name: 'poker_updateBuildupFactor',
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
    name: 'poker_deleteBuildupFactor',
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
    name: 'poker_changeOrderBuildupFactor',
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
