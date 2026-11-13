// mcp/tools/equilTools.js
//
// EquilibriumSheet（POKER の付属ツール）の計算を MCP から使うツール。
// EquilibriumSheet_CUI.exe を呼び、ICRP Publ.107 の核データ（ICRP-07.NDX・ICRP-07.BET）と
// DECDC の放出データ（REV_IC38.YLD）で、崩壊系列・放射平衡・Bateman の計算をする。
// 時間の単位は s/m/h/d/y（y = 365 日）。核種名は "Cs-137" の形（"cs137" も受け付ける）。

const nuclide = { type: 'string', description: '核種名（例: Cs-137, Ra-226, Ba-137m）' };
const chainOptions = {
  parent_halflife: { type: 'boolean', description: '半減期を直上の親と比べる（既定 false：頂点の親と比べる）', default: false },
  keep_nonequilibrium: { type: 'boolean', description: '非平衡の核種も表に残す（既定 false：その核種と子孫を表から外す）', default: false },
  threshold_transient: { type: 'number', description: '半減期の比（親／自分）がこれ未満なら非平衡（既定 10）', default: 10 },
  threshold_secular: { type: 'number', description: '半減期の比がこれ以上なら永続平衡、間は過渡平衡（既定 1000）', default: 1000 }
};
const initialOptions = {
  initial: {
    type: 'object',
    description: '頂点の親の初期量。activity_Bq・atoms・mass_g のどれか 1 つ（省略時は 1E10 個、EquilibriumSheet の既定）',
    properties: {
      activity_Bq: { type: 'number' },
      atoms: { type: 'number' },
      mass_g: { type: 'number' }
    }
  },
  daughters_initial: {
    type: 'array',
    description: '娘の初期量（省略時は 0）。平衡表にある核種だけ指定できる',
    items: { type: 'object', properties: { nuclide: { type: 'string' }, value: { type: 'number' } }, required: ['nuclide', 'value'] }
  },
  daughters_initial_unit: { type: 'string', enum: ['Bq', 'atoms', 'g'], description: 'daughters_initial の単位（既定 Bq）', default: 'Bq' }
};
const time = { type: 'string', description: '経過時間（数値＋単位 s/m/h/d/y、y = 365 日。例: 10y, 30d, 2.5h）' };

export const equilTools = [
  {
    name: 'equil_listNuclides',
    description:
      'EquilibriumSheet が扱う核種（ICRP Publ.107、約 1,250 核種）の一覧を、半減期・崩壊様式・娘核種と分岐比つきで返します。' +
      '核種名の確認や、名前の一部での検索に使います。',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: '核種名の一部（例: "Cs", "Sr-9"）。省略すると全核種' }
      }
    }
  },
  {
    name: 'equil_getChain',
    description:
      '親核種の崩壊系列と、放射平衡の表（EquilibriumSheet の「Progeny in equilibrium」）を返します。' +
      '各娘核種について、親との半減期の比、平衡の種類（secular / transient / not_equilibrium）、直上の親と分岐比が分かります。' +
      'POKER の線源に入れる娘核種を選ぶときに使います。',
    inputSchema: {
      type: 'object',
      properties: {
        nuclide,
        detail: { type: 'string', enum: ['table', 'full'], description: 'table=平衡表のみ（既定）、full=系列のツリーと全子孫の表も含める', default: 'table' },
        ...chainOptions
      },
      required: ['nuclide']
    }
  },
  {
    name: 'equil_calculateDecay',
    description:
      '親核種の初期量から、経過時間後の各核種（平衡表の核種）の原子数・質量・放射能を Bateman 式で計算します' +
      '（EquilibriumSheet と同じ式。崩壊定数が等しい場合も扱う）。親に対する放射能比、2 段の系列では娘の最大時刻 tmax も返します。',
    inputSchema: {
      type: 'object',
      properties: { nuclide, time, ...initialOptions, ...chainOptions },
      required: ['nuclide', 'time']
    }
  },
  {
    name: 'equil_getSeries',
    description:
      '各核種の原子数または放射能の時間変化を返します（EquilibriumSheet のグラフと同じ点：時間 T を points 等分した i·T/points 時間、i = 1..points-1）。' +
      '時間の単位は h。合計（total）も返します。',
    inputSchema: {
      type: 'object',
      properties: {
        nuclide,
        time: { ...time, description: 'グラフの最大時間（数値＋単位）' },
        points: { type: 'integer', description: '分割数（既定 100）', default: 100 },
        quantity: { type: 'string', enum: ['atoms', 'activity'], description: 'atoms=原子数（既定）、activity=放射能 [Bq]', default: 'atoms' },
        ...initialOptions,
        ...chainOptions
      },
      required: ['nuclide', 'time']
    }
  },
  {
    name: 'equil_getEmissions',
    description:
      '核種 1 つの放出データを返します。radiations は DECDC（REV_IC38.YLD）の光子（γ線・X線）の一覧（エネルギー MeV・1 壊変あたりの放出数 per_decay・種類）で、POKER が線源に使う値と同じ。' +
      'beta は ICRP Publ.107 のベータ線スペクトル。娘核種の放出は含まないので、平衡の娘は個別に取得してください。' +
      'POKER の線源スペクトルを作るときに使います。',
    inputSchema: {
      type: 'object',
      properties: {
        nuclide,
        kind: { type: 'string', enum: ['radiations', 'beta', 'both'], description: '取得するデータ（既定 radiations）', default: 'radiations' },
        min_yield: { type: 'number', description: '1 壊変あたりの放出数（per_decay）がこれ未満の線を除く（radiations のみ。既定 0）', default: 0 },
        types: { type: 'array', items: { type: 'string' }, description: '種類で絞る（部分一致、例: ["Gamma", "X rays"]）' }
      },
      required: ['nuclide']
    }
  }
];
