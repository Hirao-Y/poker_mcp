// mcp/tools/calculationTools.js
export const calculationTools = [
  {
    name: 'poker_getDoseMap',
    description: 'グリッド（線/面/体積 = 1D/2D/3D）検出器の全評価点の線量を .dose ファイルから取得し、線量マップとして返します（grid: 1D→[i], 2D→[j][i], 3D→[k][j][i]、points に i/j/k と座標）。サマリーはグリッドを間引く（一部省略）ため、完全なマップはこのツールで取得します。',
    inputSchema: {
      type: 'object',
      properties: {
        detector_name: { type: 'string', description: 'グリッド検出器名' },
        yaml_file: { type: 'string', description: '入力YAMLファイル名（.dose はこの名前に .dose を付したもの）。省略時は poker.yaml。' },
        dose_type: { type: 'string', enum: ['E(AP)', 'DskinM(AP)', 'H*(10)'], description: '線量種別（既定 E(AP)）' },
        ray: { type: 'string', enum: ['g1', 'n', 'g12', 'TOTAL'], description: '線種（既定 TOTAL）' }
      },
      required: ['detector_name'],
      additionalProperties: false
    }
  },
  {
    name: 'poker_executeCalculation',
    description: '作成したYAMLファイルを使用してpoker_cuiで放射線遮蔽計算を実行します。応答には .summary(YAML) から抽出した構造化 result_total（検出器ごとの座標と E(AP)/DskinM(AP)/H*(10) の線量内訳）、dose_columns、警告フッタ calculation_warnings、注記 calculation_notes を含みます。',
    inputSchema: {
      type: 'object',
      properties: {
        yaml_file: {
          type: 'string',
          description: '計算に使用するYAMLファイル名（拡張子.yamlを含む）。ファイル名のみ指定（例: poker.yaml）で、POKER_MCP_HOME/tasks/ 配下のファイルが自動的に参照されます。絶対パスも指定可能です。',
          pattern: '^([a-zA-Z0-9_\\-\\.]+\\.(yaml|yml)|([a-zA-Z]:[\\\\\/]|\\/)[^\\\\]+\\.(yaml|yml))$'
        },
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
      required: ['yaml_file'],
      additionalProperties: false
    }
  }
];
