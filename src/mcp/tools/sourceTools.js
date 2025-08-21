// mcp/tools/sourceTools.js
export const sourceTools = [
  {
    name: 'pokerinput_proposeSource',
    description: '放射線源を提案します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '線源の一意な名前'
        },
        type: {
          type: 'string',
          description: '線源タイプ（point, surface, volume等）'
        },
        position: {
          type: 'string',
          description: '線源位置 (x y z形式)'
        },
        inventory: {
          type: 'array',
          description: '核種インベントリ',
          items: {
            type: 'object',
            properties: {
              nuclide: {
                type: 'string',
                description: '核種名（例：Cs-137, Co-60）'
              },
              radioactivity: {
                type: 'number',
                description: '放射能 (Bq)',
                minimum: 0
              }
            },
            required: ['nuclide', 'radioactivity']
          },
          minItems: 1
        },
        cutoff_rate: {
          type: 'number',
          description: 'カットオフレート',
          minimum: 0,
          default: 0.01
        }
      },
      required: ['name', 'type', 'position', 'inventory']
    }
  }
];
