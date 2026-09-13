// thinnedIndicesTools.js
//
// サマリーに書き出す件数を制御する thinnedindices ノードの CRU ツール。
// D（削除）は用意しない。削除しても POKER 側の既定値に戻るだけで、
// updateThinnedIndices で既定値を指定すれば同じ結果になるため。
//
// 既定値（ノードまたはキーを省略した場合に POKER が使う値）:
//   sourcepoint 10 / pseudosourcepoint 10 / detectorgrid 10 /
//   detectorevaluation 5 / pathtrace 5 / buildupenergy 3 / buildupmfp 3
//
// これらは poker_mcp 側では持たない。省略しても .summary には全 7 キーが
// 値付きで出力されるので、実際の適用値はそちらを見れば分かる。既定値を
// 複製すると POKER 側の変更に追随できず、静かに食い違う。

const KEY_DESC = {
  sourcepoint: '入力パラメータに書き出す線源分割点の数',
  pseudosourcepoint: '入力パラメータに書き出す仮想点線源の数',
  detectorgrid: '入力パラメータに書き出す検出器評価点の数',
  detectorevaluation: '計算結果に書き出すグリッド検出器の評価点数',
  pathtrace: 'path_trace に書き出す仮想点線源の数',
  buildupenergy: '多層ビルドアップ係数のエネルギー数',
  buildupmfp: '各エネルギーに対する mfp 数'
};

const keyProps = (prefix) => {
  const p = {};
  for (const [k, d] of Object.entries(KEY_DESC)) {
    p[k] = {
      type: 'integer',
      minimum: 1,
      description: `${prefix}${d}`
    };
  }
  return p;
};

export const thinnedIndicesTools = [
  {
    name: 'poker_proposeThinnedIndices',
    description: 'サマリー出力量の設定（thinnedindices）を新規作成します。既に存在する場合は updateThinnedIndices を使ってください。全キー省略可で、省略したキーは POKER の既定値が使われます。',
    inputSchema: {
      type: 'object',
      properties: keyProps(''),
      required: [],
      additionalProperties: false,
      title: 'サマリー出力量の設定',
      description: '指定したキーのみ書き出します。省略したキーは POKER の既定値（sourcepoint 10 / pseudosourcepoint 10 / detectorgrid 10 / detectorevaluation 5 / pathtrace 5 / buildupenergy 3 / buildupmfp 3）が適用されます。'
    }
  },
  {
    name: 'poker_getThinnedIndices',
    description: 'サマリー出力量の設定を取得します。YAML に書かれているキーのみ返し、省略されているキーは既定値が使われることを示します。実際の適用値は計算後の .summary の「サマリに出力される情報量」セクションで確認できます。',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    name: 'poker_updateThinnedIndices',
    description: 'サマリー出力量の設定を更新します（部分更新可能）。ノードが無い場合は新規作成します。fit_for_paths を指定すると、入力の線源分割数と検出器評価点数から必要な値を自動で設定します（.paths 生成で全点が必要なとき）。',
    inputSchema: {
      type: 'object',
      properties: {
        ...keyProps('新しい'),
        fit_for_paths: {
          type: 'boolean',
          description: 'true にすると、入力の線源分割定義（r×φ×z 等）と検出器のグリッド定義から必要数を計算し、sourcepoint / detectorgrid / detectorevaluation をその値に設定します。.paths の生成には全ての線源分割点と評価点が必要なため。個別に指定したキーがあればそちらを優先します。'
        }
      },
      required: [],
      additionalProperties: false,
      title: 'サマリー出力量の部分更新',
      description: '指定したキーのみ変更します。省略したキーは現在の設定を維持します。'
    }
  }
];
