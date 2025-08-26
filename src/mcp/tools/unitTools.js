// mcp/tools/unitTools.js
export const unitTools = [
  {
    name: 'pokerinput_proposeUnit',
    description: '単位設定セクションを提案します（YAMLファイルに未存在の場合のみ）',
    inputSchema: {
      type: 'object',
      properties: {
        length: {
          type: 'string',
          enum: ['m', 'cm', 'mm'],
          description: '長さの単位',
          default: 'cm'
        },
        angle: {
          type: 'string',
          enum: ['radian', 'degree'],
          description: '角度の単位',
          default: 'radian'
        },
        density: {
          type: 'string',
          enum: ['g/cm3'],
          description: '密度の単位',
          default: 'g/cm3'
        },
        radioactivity: {
          type: 'string',
          enum: ['Bq'],
          description: '放射能の単位',
          default: 'Bq'
        }
      },
      required: ['length', 'angle', 'density', 'radioactivity'],
      additionalProperties: false
    }
  },
  {
    name: 'pokerinput_getUnit',
    description: '現在の単位設定を取得します（4つのキーすべてを返却）',
    inputSchema: {
      type: 'object',
      additionalProperties: false
    }
  },
  {
    name: 'pokerinput_updateUnit',
    description: '既存単位設定を更新します（部分更新だが4つのキーは常に維持）',
    inputSchema: {
      type: 'object',
      properties: {
        length: {
          type: 'string',
          enum: ['m', 'cm', 'mm'],
          description: '新しい長さの単位'
        },
        angle: {
          type: 'string',
          enum: ['radian', 'degree'],
          description: '新しい角度の単位'
        },
        density: {
          type: 'string',
          enum: ['g/cm3'],
          description: '新しい密度の単位'
        },
        radioactivity: {
          type: 'string',
          enum: ['Bq'],
          description: '新しい放射能の単位'
        }
      },
      minProperties: 1,
      additionalProperties: false
    }
  }
];
