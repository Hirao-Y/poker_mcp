// mcp/tools/sourceTools.js - Enhanced with oneOf geometry structure (マニフェスト完全対応版)
export const sourceTools = [
  {
    name: 'poker_proposeSource',
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
          oneOf: [
            {
              title: 'BOX線源形状',
              properties: {
                vertex: {
                  type: 'string',
                  description: '頂点座標（x y z形式）',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                edge_1: {
                  type: 'string',
                  description: 'エッジ1ベクトル（x y z形式）',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                edge_2: {
                  type: 'string',
                  description: 'エッジ2ベクトル（x y z形式）',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                edge_3: {
                  type: 'string',
                  description: 'エッジ3ベクトル（x y z形式）',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                transform: {
                  type: 'string',
                  description: '適用する変換名',
                  pattern: '^[a-zA-Z0-9_]+$',
                  maxLength: 50
                }
              },
              required: ['vertex', 'edge_1', 'edge_2', 'edge_3'],
              additionalProperties: false
            },
            {
              title: 'RPP線源形状',
              properties: {
                min: {
                  type: 'string',
                  description: '最小座標（x y z形式）',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                max: {
                  type: 'string',
                  description: '最大座標（x y z形式）',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                transform: {
                  type: 'string',
                  description: '適用する変換名',
                  pattern: '^[a-zA-Z0-9_]+$',
                  maxLength: 50
                }
              },
              required: ['min', 'max'],
              additionalProperties: false
            },
            {
              title: 'SPH線源形状',
              properties: {
                center: {
                  type: 'string',
                  description: '中心座標（x y z形式）',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                radius: {
                  type: 'number',
                  description: '半径',
                  minimum: 0.001,
                  maximum: 10000
                },
                transform: {
                  type: 'string',
                  description: '適用する変換名',
                  pattern: '^[a-zA-Z0-9_]+$',
                  maxLength: 50
                }
              },
              required: ['center', 'radius'],
              additionalProperties: false
            },
            {
              title: 'RCC線源形状',
              properties: {
                bottom_center: {
                  type: 'string',
                  description: '底面中心座標（x y z形式）',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                height_vector: {
                  type: 'string',
                  description: '高さベクトル（x y z形式）',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                radius: {
                  type: 'number',
                  description: '半径',
                  minimum: 0.001,
                  maximum: 10000
                },
                transform: {
                  type: 'string',
                  description: '適用する変換名',
                  pattern: '^[a-zA-Z0-9_]+$',
                  maxLength: 50
                }
              },
              required: ['bottom_center', 'height_vector', 'radius'],
              additionalProperties: false
            }
          ]
        },
        division: {
          type: 'object',
          description: '線源の領域分割パラメータ（typeがPOINT以外の場合に必須）',
          oneOf: [
            {
              title: 'BOX線源分割（直交座標系）',
              properties: {
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
                      minimum: 2,
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
                      minimum: 2,
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
                      minimum: 2,
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
              required: ['edge_1', 'edge_2', 'edge_3'],
              additionalProperties: false
            },
            {
              title: 'RPP線源分割（直交座標系）',
              properties: {
                edge_1: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                      default: 'UNIFORM'
                    },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0, default: 0.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0, default: 1.0 }
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
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0, default: 0.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0, default: 1.0 }
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
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0, default: 0.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0, default: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                }
              },
              required: ['edge_1', 'edge_2', 'edge_3'],
              additionalProperties: false
            },
            {
              title: 'SPH線源分割（球面座標系）',
              properties: {
                r: {
                  type: 'object',
                  description: 'SPH: 動径方向分割',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                      default: 'UNIFORM'
                    },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0, default: 0.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0, default: 1.0 }
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
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0, default: 0.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0, default: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                },
                phi: {
                  type: 'object',
                  description: 'SPH: 方位角方向分割',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                      default: 'UNIFORM'
                    },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0, default: 0.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0, default: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                }
              },
              required: ['r', 'theta', 'phi'],
              additionalProperties: false
            },
            {
              title: 'RCC線源分割（円柱座標系）',
              properties: {
                r: {
                  type: 'object',
                  description: 'RCC: 動径方向分割',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                      default: 'UNIFORM'
                    },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0, default: 0.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0, default: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                },
                phi: {
                  type: 'object',
                  description: 'RCC: 方位角方向分割',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                      default: 'UNIFORM'
                    },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0, default: 0.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0, default: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                },
                z: {
                  type: 'object',
                  description: 'RCC: 軸方向分割',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'],
                      default: 'UNIFORM'
                    },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0, default: 0.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0, default: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                }
              },
              required: ['r', 'phi', 'z'],
              additionalProperties: false
            }
          ]
        },
        cutoff_rate: {
          type: 'number',
          description: 'カットオフレート',
          minimum: 0.0001,
          maximum: 1,
          default: 0.0001
        }
      },
      required: ['name', 'type', 'inventory', 'cutoff_rate']
    }
  },
  {
    name: 'poker_updateSource',
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
                minimum: 0.001,
                maximum: 1e15
              }
            },
            required: ['nuclide', 'radioactivity']
          },
          minItems: 1
        },
        geometry: {
          type: 'object',
          description: '新しい線源形状パラメータ（完全なoneOf制約付き）',
          oneOf: [
            {
              title: 'BOX線源形状',
              properties: {
                vertex: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                edge_1: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                edge_2: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                edge_3: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                transform: {
                  type: 'string',
                  description: '適用する変換名',
                  pattern: '^[a-zA-Z0-9_]+$',
                  maxLength: 50
                }
              },
              required: ['vertex', 'edge_1', 'edge_2', 'edge_3'],
              additionalProperties: false
            },
            {
              title: 'RPP線源形状',
              properties: {
                min: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                max: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                transform: {
                  type: 'string',
                  description: '適用する変換名',
                  pattern: '^[a-zA-Z0-9_]+$',
                  maxLength: 50
                }
              },
              required: ['min', 'max'],
              additionalProperties: false
            },
            {
              title: 'SPH線源形状',
              properties: {
                center: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                radius: {
                  type: 'number',
                  minimum: 0.001,
                  maximum: 10000
                },
                transform: {
                  type: 'string',
                  description: '適用する変換名',
                  pattern: '^[a-zA-Z0-9_]+$',
                  maxLength: 50
                }
              },
              required: ['center', 'radius'],
              additionalProperties: false
            },
            {
              title: 'RCC線源形状',
              properties: {
                bottom_center: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                height_vector: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?\\s+-?\\d+(\\.\\d+)?$'
                },
                radius: {
                  type: 'number',
                  minimum: 0.001,
                  maximum: 10000
                },
                transform: {
                  type: 'string',
                  description: '適用する変換名',
                  pattern: '^[a-zA-Z0-9_]+$',
                  maxLength: 50
                }
              },
              required: ['bottom_center', 'height_vector', 'radius'],
              additionalProperties: false
            }
          ]
        },
        division: {
          type: 'object',
          description: '新しい線源分割パラメータ（完全なoneOf制約付き）',
          oneOf: [
            {
              title: 'BOX線源分割',
              properties: {
                edge_1: {
                  type: 'object',
                  properties: {
                    type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                },
                edge_2: {
                  type: 'object',
                  properties: {
                    type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                },
                edge_3: {
                  type: 'object',
                  properties: {
                    type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                }
              },
              required: ['edge_1', 'edge_2', 'edge_3'],
              additionalProperties: false
            },
            {
              title: 'SPH線源分割',
              properties: {
                r: {
                  type: 'object',
                  properties: {
                    type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                },
                theta: {
                  type: 'object',
                  properties: {
                    type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                },
                phi: {
                  type: 'object',
                  properties: {
                    type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                }
              },
              required: ['r', 'theta', 'phi'],
              additionalProperties: false
            },
            {
              title: 'RCC線源分割',
              properties: {
                r: {
                  type: 'object',
                  properties: {
                    type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                },
                phi: {
                  type: 'object',
                  properties: {
                    type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                },
                z: {
                  type: 'object',
                  properties: {
                    type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] },
                    number: { type: 'integer', minimum: 2, maximum: 1000 },
                    min: { type: 'number', minimum: 0.0, maximum: 1.0 },
                    max: { type: 'number', minimum: 0.0, maximum: 1.0 }
                  },
                  required: ['type', 'number'],
                  additionalProperties: false
                }
              },
              required: ['r', 'phi', 'z'],
              additionalProperties: false
            }
          ]
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
    name: 'poker_deleteSource',
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
