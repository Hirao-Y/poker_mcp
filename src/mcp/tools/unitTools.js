// mcp/tools/unitTools.js
export const unitTools = [
  {
    name: 'poker_proposeUnit',
    description: '単位設定セクションを提案します（YAMLファイルに未存在の場合のみ）- 4キー完全性保証',
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
      additionalProperties: false,
      title: '4キー必須単位構造',
      description: '全4キー（length, angle, density, radioactivity）が必須です。部分指定は不可。'
    }
  },
  {
    name: 'poker_getUnit',
    description: '現在の単位設定を取得します（4つのキーすべてを返却）- 完全性保証',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
      title: '4キー完全取得',
      description: '常に4つの単位キー（length, angle, density, radioactivity）すべてを返却します。'
    }
  },
  {
    name: 'poker_updateUnit',
    description: '既存単位設定を更新します（部分更新可能だが4つのキーは常に維持）- 完全性保証',
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
      additionalProperties: false,
      title: '4キー保持更新',
      description: '部分更新可能ですが、結果として4キー構造は常に保持されます。'
    }
  },
  {
    name: 'poker_validateUnitIntegrity',
    description: '単位系の4キー完全性と物理的整合性を包括検証します',
    inputSchema: {
      type: 'object',
      properties: {
        includeSystemAnalysis: {
          type: 'boolean',
          description: 'システム全体での単位使用状況分析を含めるか',
          default: true
        },
        generateReport: {
          type: 'boolean', 
          description: '詳細診断レポートを生成するか',
          default: true
        }
      },
      additionalProperties: false,
      title: '単位完全性検証',
      description: '4キー構造の完全性、物理的整合性、システム内使用状況を包括的に検証'
    }
  },
  {
    name: 'poker_analyzeUnitConversion',
    description: '異なる単位系間の変換係数を分析・計算します',
    inputSchema: {
      type: 'object',
      properties: {
        targetUnits: {
          type: 'object',
          properties: {
            length: { type: 'string', enum: ['m', 'cm', 'mm'] },
            angle: { type: 'string', enum: ['radian', 'degree'] },
            density: { type: 'string', enum: ['g/cm3'] },
            radioactivity: { type: 'string', enum: ['Bq'] }
          },
          required: ['length', 'angle', 'density', 'radioactivity'],
          additionalProperties: false,
          description: '変換先単位系（4キー必須）'
        },
        includePhysicalAnalysis: {
          type: 'boolean',
          description: '物理的整合性分析を含めるか',
          default: true
        }
      },
      required: ['targetUnits'],
      additionalProperties: false,
      title: '単位変換分析',
      description: '現在の単位系から指定単位系への変換係数計算と物理的整合性分析'
    }
  }
];
