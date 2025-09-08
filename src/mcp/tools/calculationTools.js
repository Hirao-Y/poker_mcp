// mcp/tools/calculationTools.js
export const calculationTools = [
  {
    name: 'poker_executeCalculation',
    description: '環境変数で設定されたYAMLファイルを使用してpoker_cuiで放射線遮蔽計算を実行します',
    inputSchema: {
      type: 'object',
      properties: {
        summary_options: {
          type: 'object',
          description: 'サマリー出力オプション（注意: show_source_dataとshow_total_doseの少なくとも一方は必須です）',
          properties: {
            show_parameters: {
              type: 'boolean',
              description: '入力パラメータをサマリーに表示（-pオプション）',
              default: false
            },
            show_source_data: {
              type: 'boolean',
              description: '各線源による計算データ及び線量をサマリーに表示（-sオプション）',
              default: true
            },
            show_total_dose: {
              type: 'boolean',
              description: '各検出器に対する全線源からの総和線量をサマリーに表示（-tオプション）',
              default: true
            }
          },
          additionalProperties: false
        },
        output_files: {
          type: 'object',
          description: '出力ファイル指定（入力YAMLファイルと同じフォルダに自動作成、全てYAML形式）',
          properties: {
            summary_file: {
              type: 'string',
              description: '出力サマリーファイル名（-oオプション、ファイル名のみ指定、自動的に入力ファイルと同じディレクトリに配置）',
              pattern: '^[a-zA-Z0-9_\\-\\.]+\\.(yaml|yml)$'
            },
            dose_file: {
              type: 'string',
              description: '線量ファイル名（-dオプション、ファイル名のみ指定、自動的に入力ファイルと同じディレクトリに配置）',
              pattern: '^[a-zA-Z0-9_\\-\\.]+\\.(yaml|yml)$'
            }
          },
          additionalProperties: false
        }
      },
      required: [],
      additionalProperties: false
    }
  }
];
