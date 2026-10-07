// mcp/tools/schemaTools.js
//
// POKER が扱うファイルの書式を、機械可読な形（JSON Schema）で取得する。
//   POKER_CUI --schema を呼んで、その環境の版とライブラリに基づくスキーマを返す。
//   静的なファイルを配らないのは、材料名・核種名の一覧をその環境の材料
//   ライブラリから埋めるため。利用者が材料を拡張していても正しい一覧が出る。
export const schemaTools = [
  {
    name: 'poker_getSchema',
    description:
      'POKER のファイル書式を JSON Schema で取得します。入力YAMLの書き方を確かめたいとき、' +
      '出力（.summary/.dose）や経路ファイル（.paths）を読む前に構造を知りたいときに使います。' +
      'スキーマが規定するのは書式・型・値域までで、参照の解決や名前の存在確認は ' +
      'poker_cui --validate の担当です。',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['input', 'paths', 'summary', 'dose'],
          description:
            '取得するスキーマの種類（既定 input）。' +
            'input=入力YAML、paths=CADから抽出した経路ファイル、' +
            'summary=計算結果のサマリー、dose=全評価点の線量ファイル',
          default: 'input'
        }
      }
    }
  }
];
