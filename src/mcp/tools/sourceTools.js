// mcp/tools/sourceTools.js
export const sourceTools = [
  {
    name: 'pokerinput_proposeSource',
    description: '新しい線源を提案します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '線源の名前（一意である必要があります）',
          pattern: '^[a-zA-Z0-9_]+$',
          maxLength: 50
        },
        type: {
          type: 'string',
          description: '線源タイプ',
          enum: ['POINT', 'SPH', 'RCC', 'RPP', 'BOX']
        },
        position: {
          type: 'string',
          description: '線源の位置（x y z形式）、typeがPOINTの場合のみ必須',
          pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
        },
        inventory: {
          type: 'array',
          description: '核種と放射能の組の配列',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              nuclide: {
                type: 'string',
                description: '核種名（元素記号と質量数の連結形式、例: Cs137, Co60）',
                pattern: '^[A-Z][a-z]{0,2}[0-9]{1,3}[a-z]?$'
              },
              radioactivity: {
                type: 'number',
                description: '放射能（単位Bq）',
                minimum: 0.001,
                maximum: 1e15
              }
            },
            required: ['nuclide', 'radioactivity'],
            additionalProperties: false
          }
        },
        geometry: {
          type: 'object',
          description: '線源形状パラメータ（typeがPOINT以外の場合に必須）',
          properties: {
            // BOX線源用
            vertex: {
              type: 'string',
              description: 'BOX: 頂点座標（x y z形式）'
            },
            edge_1: {
              type: 'string', 
              description: 'BOX: エッジ1ベクトル（x y z形式）'
            },
            edge_2: {
              type: 'string',
              description: 'BOX: エッジ2ベクトル（x y z形式）'
            },
            edge_3: {
              type: 'string',
              description: 'BOX: エッジ3ベクトル（x y z形式）'
            },
            // RPP線源用
            min: {
              type: 'string',
              description: 'RPP: 最小座標（x y z形式）'
            },
            max: {
              type: 'string', 
              description: 'RPP: 最大座標（x y z形式）'
            },
            // SPH線源用
            center: {
              type: 'string',
              description: 'SPH: 中心座標（x y z形式）'
            },
            radius: {
              type: 'number',
              description: 'SPH/RCC: 半径',
              minimum: 0.001
            },
            // RCC線源用
            bottom_center: {
              type: 'string',
              description: 'RCC: 底面中心座標（x y z形式）'
            },
            height_vector: {
              type: 'string',
              description: 'RCC: 高さベクトル（x y z形式）'
            },
            // 共通
            transform: {
              type: 'string',
              description: '適用する変換名'
            }
          },
          additionalProperties: false
        },
        division: {
          type: 'object',
          description: '線源の領域分割パラメータ（typeがPOINT以外の場合に必須）',
          properties: {
            // BOX/RPP用（直交座標系）
            edge_1: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                  default: 'UNIFORM'
                },
                number: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 1000
                },
                min: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 0.0
                },
                max: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 1.0
                }
              },
              required: ['type', 'number'],
              additionalProperties: false
            },
            edge_2: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                  default: 'UNIFORM'
                },
                number: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 1000
                },
                min: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 0.0
                },
                max: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 1.0
                }
              },
              required: ['type', 'number'],
              additionalProperties: false
            },
            edge_3: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                  default: 'UNIFORM'
                },
                number: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 1000
                },
                min: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 0.0
                },
                max: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 1.0
                }
              },
              required: ['type', 'number'],
              additionalProperties: false
            },
            // SPH用（球面座標系）
            r: {
              type: 'object',
              description: 'SPH: 動径方向分割',
              properties: {
                type: {
                  type: 'string',
                  enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                  default: 'UNIFORM'
                },
                number: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 1000
                },
                min: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 0.0
                },
                max: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 1.0
                }
              },
              required: ['type', 'number'],
              additionalProperties: false
            },
            theta: {
              type: 'object',
              description: 'SPH: 極角方向分割',
              properties: {
                type: {
                  type: 'string',
                  enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                  default: 'UNIFORM'
                },
                number: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 1000
                },
                min: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 0.0
                },
                max: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 1.0
                }
              },
              required: ['type', 'number'],
              additionalProperties: false
            },
            phi: {
              type: 'object',
              description: 'SPH/RCC: 方位角方向分割',
              properties: {
                type: {
                  type: 'string',
                  enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                  default: 'UNIFORM'
                },
                number: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 1000
                },
                min: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 0.0
                },
                max: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 1.0
                }
              },
              required: ['type', 'number'],
              additionalProperties: false
            },
            // RCC用（円柱座標系）のz軸分割
            z: {
              type: 'object',
              description: 'RCC: 軸方向分割',
              properties: {
                type: {
                  type: 'string',
                  enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                  default: 'UNIFORM'
                },
                number: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 1000
                },
                min: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 0.0
                },
                max: {
                  type: 'number',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 1.0
                }
              },
              required: ['type', 'number'],
              additionalProperties: false
            }
          },
          additionalProperties: false
        },
        cutoff_rate: {
          type: 'number',
          description: 'カットオフレート',
          minimum: 0,
          maximum: 1,
          default: 0.01
        }
      },
      required: ['name', 'type', 'inventory']
    }
  },
  {
    name: 'pokerinput_updateSource',
    description: '既存放射線源のパラメータを更新します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '更新対象線源名'
        },
        position: {
          type: 'string',
          description: '新しい線源位置 (x y z形式)'
        },
        inventory: {
          type: 'array',
          description: '新しい核種インベントリ',
          items: {
            type: 'object',
            properties: {
              nuclide: {
                type: 'string',
                description: '核種名（連結形式、例: Cs137, Co60）',
                pattern: '^[A-Z][a-z]{0,2}[0-9]{1,3}[a-z]?$'
              },
              radioactivity: {
                type: 'number',
                description: '放射能 (Bq)',
                minimum: 0.001
              }
            },
            required: ['nuclide', 'radioactivity']
          },
          minItems: 1
        },
        geometry: {
          type: 'object',
          description: '新しい形状パラメータ',
          additionalProperties: true
        },
        division: {
          type: 'object',
          description: '新しい分割パラメータ',
          additionalProperties: true
        },
        cutoff_rate: {
          type: 'number',
          description: '新しいカットオフレート',
          minimum: 0,
          maximum: 1
        }
      },
      required: ['name']
    }
  },
  {
    name: 'pokerinput_deleteSource',
    description: '放射線源を削除します',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '削除対象線源名'
        }
      },
      required: ['name']
    }
  }
];
