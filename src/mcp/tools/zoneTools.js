// mcp/tools/zoneTools.js
export const zoneTools = [
  {
    name: 'pokerinput_proposeZone',
    description: '材料ゾーンを提案します（物理検証付き）',
    inputSchema: {
      type: 'object',
      properties: {
        body_name: {
          type: 'string',
          description: 'ゾーンが適用される立体名'
        },
        material: {
          type: 'string',
          description: '材料名（例：CONCRETE, STEEL, VOID）'
        },
        density: {
          type: 'number',
          description: '密度 (g/cm³)',
          minimum: 0.001,
          maximum: 30.0
        }
      },
      required: ['body_name', 'material']
    }
  },
  {
    name: 'pokerinput_updateZone',
    description: '既存ゾーンの材料や密度を更新します',
    inputSchema: {
      type: 'object',
      properties: {
        body_name: {
          type: 'string',
          description: '更新するゾーンの立体名'
        },
        material: {
          type: 'string',
          description: '新しい材料名'
        },
        density: {
          type: 'number',
          description: '新しい密度 (g/cm³)',
          minimum: 0.001,
          maximum: 30.0
        }
      },
      required: ['body_name']
    }
  },
  {
    name: 'pokerinput_deleteZone',
    description: 'ゾーンを削除します（ATMOSPHERE以外）',
    inputSchema: {
      type: 'object',
      properties: {
        body_name: {
          type: 'string',
          description: '削除するゾーンの立体名'
        }
      },
      required: ['body_name']
    }
  }
];
