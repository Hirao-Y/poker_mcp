1000 }, min: { type: 'number', minimum: 0.0, maximum: 1.0 }, max: { type: 'number', minimum: 0.0, maximum: 1.0 } }, required: ['type', 'number'] },
                phi: { type: 'object', properties: { type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] }, number: { type: 'integer', minimum: 1, maximum: 1000 }, min: { type: 'number', minimum: 0.0, maximum: 1.0 }, max: { type: 'number', minimum: 0.0, maximum: 1.0 } }, required: ['type', 'number'] }
              },
              required: ['r', 'theta', 'phi']
            },
            {
              title: 'RCC線源分割',
              properties: {
                r: { type: 'object', properties: { type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] }, number: { type: 'integer', minimum: 1, maximum: 1000 }, min: { type: 'number', minimum: 0.0, maximum: 1.0 }, max: { type: 'number', minimum: 0.0, maximum: 1.0 } }, required: ['type', 'number'] },
                phi: { type: 'object', properties: { type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] }, number: { type: 'integer', minimum: 1, maximum: 1000 }, min: { type: 'number', minimum: 0.0, maximum: 1.0 }, max: { type: 'number', minimum: 0.0, maximum: 1.0 } }, required: ['type', 'number'] },
                z: { type: 'object', properties: { type: { enum: ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER'] }, number: { type: 'integer', minimum: 1, maximum: 1000 }, min: { type: 'number', minimum: 0.0, maximum: 1.0 }, max: { type: 'number', minimum: 0.0, maximum: 1.0 } }, required: ['type', 'number'] }
              },
              required: ['r', 'phi', 'z']
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
