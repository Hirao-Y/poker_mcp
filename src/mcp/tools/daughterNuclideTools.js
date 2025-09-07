// mcp/tools/daughterNuclideTools.js
export const daughterNuclideTools = [
  {
    name: 'poker_confirmDaughterNuclides',
    description: '子孫核種の自動追加を確認・実行します',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['check', 'confirm', 'confirm_with_modifications', 'reject'],
          description: '実行アクション: check=確認のみ, confirm=承認して適用, confirm_with_modifications=修正して適用, reject=拒否'
        },
        source_name: {
          type: 'string',
          description: '対象線源名（省略時は全線源）'
        },
        modifications: {
          type: 'array',
          description: 'confirm_with_modificationsアクション用の修正データ',
          items: {
            type: 'object',
            properties: {
              source_name: {
                type: 'string',
                description: '線源名'
              },
              nuclide: {
                type: 'string',
                description: '子孫核種名'
              },
              radioactivity: {
                type: 'number',
                description: '修正後の放射能値 (Bq)',
                minimum: 0.001
              },
              include: {
                type: 'boolean',
                description: 'この子孫核種を含めるかどうか'
              }
            },
            required: ['source_name', 'nuclide', 'include']
          }
        }
      },
      required: ['action'],
      additionalProperties: false
    }
  }
];
