// mcp/tools/transformTools.js
export const transformTools = [
  {
    name: 'poker_proposeTransform',
    description: '回転・移動変換を提案します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '変換の一意な名前'
        },
        operations: {
          type: 'array',
          description: '変換操作の配列',
          items: {
            type: 'object',
            description: '変換操作（rotate_around_x, rotate_around_y, rotate_around_z, translate）',
            properties: {
              rotate_around_x: { type: 'number', description: 'X軸周りの回転角度（度）' },
              rotate_around_y: { type: 'number', description: 'Y軸周りの回転角度（度）' },
              rotate_around_z: { type: 'number', description: 'Z軸周りの回転角度（度）' },
              translate: { type: 'string', description: '平行移動ベクトル (x y z形式)' }
            }
          },
          minItems: 1
        }
      },
      required: ['name', 'operations']
    }
  },
  {
    name: 'poker_updateTransform',
    description: '既存変換の操作を更新します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '更新する変換名'
        },
        operations: {
          type: 'array',
          description: '新しい変換操作の配列',
          items: {
            type: 'object',
            properties: {
              rotate_around_x: { type: 'number' },
              rotate_around_y: { type: 'number' },
              rotate_around_z: { type: 'number' },
              translate: { type: 'string' }
            }
          }
        }
      },
      required: ['name']
    }
  },
  {
    name: 'poker_deleteTransform',
    description: '変換を削除します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '削除する変換名'
        }
      },
      required: ['name']
    }
  }
];
