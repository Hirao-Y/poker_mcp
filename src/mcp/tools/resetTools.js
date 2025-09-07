// tools/resetTools.js - YAML初期化ツール定義
export const resetTools = [
  {
    name: 'poker_resetYaml',
    description: 'poker.yamlファイルを初期状態にリセットします（自動バックアップ・ATMOSPHERE保護付き）',
    inputSchema: {
      type: 'object',
      properties: {
        backup_comment: {
          type: 'string',
          description: 'リセット前バックアップのコメント',
          maxLength: 200,
          default: 'Manual reset before initialization'
        },
        force: {
          type: 'boolean',
          description: '強制リセットフラグ（確認をスキップ）',
          default: false
        },
        preserve_units: {
          type: 'boolean',
          description: '既存の単位設定を保持するか',
          default: true
        },
        reset_level: {
          type: 'string',
          description: 'リセットレベル',
          enum: ['minimal', 'standard', 'complete'],
          default: 'standard'
        },
        atmosphere_material: {
          type: 'string',
          description: 'ATMOSPHEREゾーンに設定する材料',
          enum: [
            'Carbon', 'Concrete', 'Iron', 'Lead', 'Aluminum', 'Copper', 'Tungsten',
            'Air', 'Water', 'PyrexGlass', 'AcrylicResin', 'Polyethylene', 'Soil', 'VOID'
          ],
          default: 'VOID'
        },
        atmosphere_density: {
          type: 'number',
          description: 'ATMOSPHERE材料がVOID以外の場合の密度値 (g/cm³)',
          minimum: 0.001,
          maximum: 30.0
        }
      },
      additionalProperties: false
    }
  }
];
