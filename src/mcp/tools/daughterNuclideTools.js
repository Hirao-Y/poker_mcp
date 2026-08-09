// mcp/tools/daughterNuclideTools.js
export const daughterNuclideTools = [
  {
    name: 'poker_confirmDaughterNuclides',
    description:
      '子孫核種の除外・復活・手動指定を行います。' +
      '娘核種は proposeSource/updateSource 時に自動生成されるため、' +
      'このツールは生成結果の事後調整に使用します。除外は線源ごとに記録されます。',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['check', 'confirm', 'confirm_with_modifications', 'reject'],
          description:
            'check=現在の派生状態と除外設定を表示, ' +
            'confirm=除外を解除して再生成, ' +
            'confirm_with_modifications=放射能を手動指定, ' +
            'reject=対象線源で除外登録（他の線源には影響しない）'
        },
        source_name: {
          type: 'string',
          description: '対象線源名。check以外では必須（除外は線源ごとの管理のため）'
        },
        nuclides: {
          type: 'array',
          description:
            'reject/confirm の対象核種名。省略時は reject=生成済み派生核種すべて、' +
            'confirm=除外設定すべてが対象',
          items: { type: 'string' }
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
