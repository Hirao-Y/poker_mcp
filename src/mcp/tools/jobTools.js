// mcp/tools/jobTools.js - 計算の非同期実行（POKER_MCP_ASYNC=1 のときだけ登録される）
//
// 長い計算を 1 回のツール呼び出しで待つと、MCP クライアントの待ち時間の上限や、
// 途中の中継（Cloudflare Tunnel など）の上限で切られる。投入・状態確認・結果取得に
// 分ければ、1 回の呼び出しは数秒で終わり、何時間かかる計算でも扱える。

const summaryOptionsSchema = {
  type: 'object',
  description: 'サマリー出力オプション（poker_executeCalculation と同じ）',
  properties: {
    show_parameters: { type: 'boolean', description: '入力パラメータをサマリーに表示（-p）', default: false },
    show_source_data: { type: 'boolean', description: '各線源による計算データ及び線量を表示（-s）', default: true },
    show_total_dose: { type: 'boolean', description: '各検出器に対する全線源からの総和線量を表示（-t）', default: true }
  },
  additionalProperties: false
};

export const jobTools = [
  {
    name: 'poker_submitCalculation',
    description:
      '時間のかかる遮蔽計算を非同期で投入し、すぐにジョブ ID を返します。数十秒で終わる計算は ' +
      'poker_executeCalculation を使ってください。投入した時点の YAML（と .paths）をジョブ専用の' +
      'フォルダにコピーして計算するため、投入後に YAML を編集しても実行中の計算には影響しません。' +
      '保留中の変更は含まれないので、必要なら先に poker_applyChanges で確定してください。' +
      '進み具合は poker_getJobStatus、結果は poker_getJobResult で取得します。',
    inputSchema: {
      type: 'object',
      properties: {
        yaml_file: {
          type: 'string',
          description: '計算に使う YAML ファイル名（例: poker.yaml）。ファイル名のみなら POKER_MCP_HOME/tasks/ 配下を参照。絶対パスも可。',
          pattern: '^([a-zA-Z0-9_\\-\\.]+\\.(yaml|yml)|([a-zA-Z]:[\\\\\/]|\\/)[^\\\\]+\\.(yaml|yml))$'
        },
        path_input: {
          type: 'string',
          description: 'CAD から抽出した経路ファイル（.paths）。poker_executeCalculation の path_input と同じ。'
        },
        summary_options: summaryOptionsSchema,
        output_files: {
          type: 'object',
          description: '出力ファイル名（ジョブ専用フォルダに置かれる）。省略時は <YAML名>.summary / <YAML名>.dose。',
          properties: {
            summary_file: { type: 'string', pattern: '^[a-zA-Z0-9_\\-\\.]+\\.(yaml|yml)$' },
            dose_file: { type: 'string', pattern: '^[a-zA-Z0-9_\\-\\.]+\\.(yaml|yml)$' }
          },
          additionalProperties: false
        }
      },
      required: ['yaml_file'],
      additionalProperties: false
    }
  },
  {
    name: 'poker_getJobStatus',
    description:
      '非同期ジョブの状態を返します（queued: 待機中 / running: 実行中 / succeeded: 完了 / failed: 失敗）。' +
      'job_id を省略すると最近のジョブの一覧を返します。終わっていなければ、数秒〜数十秒おいて再度確認してください。',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'string', description: 'poker_submitCalculation が返したジョブ ID' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'poker_getJobResult',
    description:
      '終わったジョブの結果を返します。内容は poker_executeCalculation の応答と同じ形式です' +
      '（検出器ごとの result_total、dose_columns、calculation_warnings など）。' +
      'まだ終わっていなければ ready: false を返します。グリッド検出器の線量マップは ' +
      'poker_getDoseMap に job_id を指定して取得します。',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'string', description: 'poker_submitCalculation が返したジョブ ID' }
      },
      required: ['job_id'],
      additionalProperties: false
    }
  }
];

/** 非同期有効時に poker_getDoseMap へ job_id 引数を足した定義を返す（元の定義は変更しない） */
export function withJobIdParam(tool) {
  return {
    ...tool,
    description: tool.description + ' 非同期ジョブの結果は job_id で指定します。',
    inputSchema: {
      ...tool.inputSchema,
      properties: {
        ...tool.inputSchema.properties,
        job_id: { type: 'string', description: '非同期ジョブ ID。指定するとそのジョブの .dose を読みます（yaml_file は無視）。' }
      }
    }
  };
}
