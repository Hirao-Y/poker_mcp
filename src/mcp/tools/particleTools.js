// particleTools.js
//
// particle（線源の粒子: photon / neutron）の設定。POKER 2.3.0 から。
//
// particle: neutron のデッキは POKER の中性子拡張（部品 poker_neutron）で計算される。
// 線源の inventory は emission [n/s] で書き（radioactivity はエラー）、核種は中性子の目録にあるもの
// （Cf252 / AmBe / AmBe-Large / AmBe-Sources4C / PuBe / Cm244 / Cm244-Watt）か、エネルギ線 { energy, spectrum, emission } で指定する。
// 材料は中性子の目録にあるもの（VOID / Air / Water / Polyethylene / Concrete / Soil / Iron / Lead）だけで、
// 密度は目録の値と 1% 以内であること。buildup_factor は無視される。
// 多層遮蔽（空気・VOID を除く 2 種類以上の遮蔽材を通る経路）は計算はされるが適用範囲外として警告される。
// 使える核種・材料・密度は poker_getSchema の properties.particle に x-poker-neutron-* として載っている。
//
// particle を書かない（または photon の）デッキは、これまでどおり光子の計算になる。
//
// neutron_correction（POKER 2.3.2 から、v1.15.0）: 中性子の線量の有限媒質補正。中性子のデッキだけに書ける。
//   use_geometry_correction（G）: 線源が遮蔽体の外にあるとき、1 種類の遮蔽体（コンクリート・鉄）に 1 回だけ入る経路の線量を G で割る。
//   use_finite_medium_correction（F）: 遮蔽体の外の検出点では、さらに F で割る（体系の外に何もない野外の前提）。G と一緒のときだけ働く。
//   書かなければ両方 true（POKER は入力に書いたものだけを計算するので、書いていないものからの戻りは無い）。
//   床・壁・天井を書いた部屋の中の体系では F を false にする。2 次γ線は補正しない。

export const particleTools = [
  {
    name: 'poker_setParticle',
    description: '線源の粒子（photon / neutron）を設定します（applyChanges で確定）。neutron にすると POKER 2.3.0 の中性子計算になり、線源の inventory は emission [n/s] で書きます（radioactivity は使えない）。photon にすると particle ノードを消し、従来の光子の計算に戻ります（中性子だけの項目 neutron_correction も消します）。光子と中性子の線源を 1 つのデッキに混ぜることはできません。中性子の線量には既定で有限媒質補正が掛かります。床・壁・天井を書いた部屋の中の体系では poker_setNeutronCorrection で use_finite_medium_correction を false にしてください。',
    inputSchema: {
      type: 'object',
      properties: {
        particle: {
          type: 'string',
          enum: ['photon', 'neutron'],
          description: 'photon（既定）または neutron'
        }
      },
      required: ['particle'],
      additionalProperties: false
    }
  },
  {
    name: 'poker_getParticle',
    description: '現在の線源の粒子（photon / neutron）を返します。particle ノードが無ければ photon です。保留中の変更があれば pending に示します。',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    name: 'poker_setNeutronCorrection',
    description: '中性子の線量の有限媒質補正（neutron_correction、POKER 2.3.2 以降）を設定します（applyChanges で確定）。中性子のデッキ（particle: neutron）だけで使えます。use_geometry_correction（G）は線源が遮蔽体の外にあるときの体系補正、use_finite_medium_correction（F）は遮蔽体の外の検出点の補正で、体系の外に何もない野外の前提です。書かなければ両方 true です。床・壁・天井を書いた部屋の中の体系では F を false にしてください。F は G と一緒のときだけ働くので、G を false にすると F も false になります（G false・F true は指定できません）。2 次γ線は補正しません。値を両方省略するか reset: true にすると neutron_correction を消して既定（両方 true）に戻します。値を指定したときは、指定しなかった方も今の値で明示して書きます。',
    inputSchema: {
      type: 'object',
      properties: {
        use_geometry_correction: {
          type: 'boolean',
          description: '体系補正 G（線源が遮蔽体の外にあるとき）。省略すると今の値（書いていなければ true）'
        },
        use_finite_medium_correction: {
          type: 'boolean',
          description: '有限媒質補正 F（遮蔽体の外の検出点。野外の前提）。省略すると今の値。G を false にしたときは false'
        },
        reset: {
          type: 'boolean',
          description: 'true で neutron_correction を消し、既定（両方 true）に戻す。値と同時には指定できない'
        }
      },
      required: [],
      additionalProperties: false
    }
  },
  {
    name: 'poker_getNeutronCorrection',
    description: '中性子の有限媒質補正（neutron_correction）の設定を返します。neutron_correction は YAML に書いてある値（書いていなければ null）、effective は計算で実際に使われる値（書いていなければ両方 true、G が false なら F も働かない）です。光子のデッキでは補正はありません。保留中の変更があれば pending に示します。',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  }
];
