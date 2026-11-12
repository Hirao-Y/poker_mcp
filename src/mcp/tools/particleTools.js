// particleTools.js
//
// particle（線源の粒子: photon / neutron）の設定。POKER 2.3.0 から。
//
// particle: neutron のデッキは POKER の中性子拡張（部品 poker_neutron）で計算される。
// 線源の inventory は emission [n/s] で書き（radioactivity はエラー）、核種は中性子の目録にあるもの
// （Cf252 / AmBe / AmBe-Sources4C / PuBe）か、エネルギ線 { energy, spectrum, emission } で指定する。
// 材料は中性子の目録にあるもの（VOID / Air / Water / Polyethylene / Concrete / Soil / Iron / Lead）だけで、
// 密度は目録の値と 1% 以内であること。buildup_factor は無視される。
// 多層遮蔽（空気・VOID を除く 2 種類以上の遮蔽材を通る経路）は計算はされるが適用範囲外として警告される。
// 使える核種・材料・密度は poker_getSchema の properties.particle に x-poker-neutron-* として載っている。
//
// particle を書かない（または photon の）デッキは、これまでどおり光子の計算になる。

export const particleTools = [
  {
    name: 'poker_setParticle',
    description: '線源の粒子（photon / neutron）を設定します（applyChanges で確定）。neutron にすると POKER 2.3.0 の中性子計算になり、線源の inventory は emission [n/s] で書きます（radioactivity は使えない）。photon にすると particle ノードを消し、従来の光子の計算に戻ります。光子と中性子の線源を 1 つのデッキに混ぜることはできません。',
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
  }
];
