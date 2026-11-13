// tests/particle-check.test.mjs - poker_setParticle の POKER 中性子対応の確認（v1.13.0）
//
//   poker_cui --schema の代わりに偽の応答を渡して、次を確かめる（POKER 本体は要らない）。
//   1. properties.particle がある（POKER 2.3.0 以降）→ neutron を設定できる
//   2. properties.particle が無い（POKER 2.2.x）→ 版を添えて「POKER 2.3.0 以降が必要」で止める
//   3. poker_cui を呼べない → 止めずに note を付ける
//   4. photon は確かめない
//
// 実行: npm run test:neutron の後半（node tests/particle-check.test.mjs）
import { createParticleHandlers } from '../src/mcp/handlers/particleHandlers.js';

let ng = 0;
const ok = (c, label, detail = '') => { console.log((c ? '  OK ' : '  NG ') + label + (detail ? ' : ' + detail : '')); if (!c) ng++; };

const calls = [];
const taskManager = { async setParticle(p) { calls.push(p); return { particle: p, message: 'stub' }; },
  async getParticle() { return { particle: 'photon' }; } };
const text = (r) => JSON.parse(r.content[0].text);

const old = async () => JSON.stringify({ $id: 'https://pointkernel.com/schema/poker-input-2.2.5.schema.json', properties: { unit: {} } });
const neu = async () => JSON.stringify({ $id: 'https://pointkernel.com/schema/poker-input-2.3.0.schema.json', properties: { particle: { enum: ['photon', 'neutron'] } } });
const none = async () => { throw new Error('spawn poker_cui ENOENT'); };

// 2. 古い POKER（先に確かめる。対応が確かめられると結果を覚えるため）
{
  const h = createParticleHandlers(taskManager, { schemaRunner: old });
  let err = null;
  try { await h.setParticle({ particle: 'neutron' }); } catch (e) { err = e; }
  ok(err && /POKER 2\.3\.0 以降/.test(err.message) && /2\.2\.5/.test(err.message), '古い POKER では止める', err ? err.message.slice(0, 50) : '止まらなかった');
  ok(calls.length === 0, '止めたときは設定しない');
}
// 3. poker_cui を呼べない
{
  const h = createParticleHandlers(taskManager, { schemaRunner: none });
  const r = text(await h.setParticle({ particle: 'neutron' }));
  ok(r.success && /確かめていません/.test(r.note || ''), '確かめられないときは note を付けて設定', r.note || '');
}
// 4. photon は確かめない
{
  let asked = false;
  const h = createParticleHandlers(taskManager, { schemaRunner: async () => { asked = true; return old(); } });
  const r = text(await h.setParticle({ particle: 'photon' }));
  ok(r.success && !asked, 'photon は確かめない');
}
// 1. 対応している POKER
{
  const h = createParticleHandlers(taskManager, { schemaRunner: neu });
  const r = text(await h.setParticle({ particle: 'neutron' }));
  ok(r.success && !r.note, '対応している POKER では設定できる');
}

console.log(ng ? `\n${ng} 件の NG` : '\nすべて合格');
process.exit(ng ? 1 : 0);
