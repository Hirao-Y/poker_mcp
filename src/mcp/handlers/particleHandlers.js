// mcp/handlers/particleHandlers.js
//
// particle（photon / neutron）のハンドラ。POKER 2.3.0 から。
//
// neutron を設定するときは、計算に使う poker_cui（PATH 上）が中性子線源に対応しているかを
// poker_cui --schema の properties.particle で確かめる（v1.13.0）。古い POKER では計算の段階で
// 「知らない項目 particle」として止まり、原因が分かりにくいため、設定の時点で止める。
// poker_cui を呼べず確かめられないときは止めない（YAML の編集だけなら POKER は要らない）。
import { runSchema } from './schemaHandlers.js';
import { PokerMcpError } from '../../utils/mcpErrors.js';
import { logger } from '../../utils/logger.js';

let neutronSupported = false;   // 対応を確かめられた結果だけを覚える（POKER を入れ替えたら再起動不要で読み直す）

/**
 * @returns {Promise<{supported: boolean|null, version?: string, reason?: string}>}
 *   supported: true = 対応、false = 非対応、null = 確かめられなかった
 */
export async function checkNeutronSupport(run = runSchema) {
  if (neutronSupported) return { supported: true };
  let schema;
  try {
    schema = JSON.parse(await run('input'));
  } catch (e) {
    logger.warn('poker_cui --schema で中性子対応を確かめられませんでした', { error: e.message });
    return { supported: null, reason: e.message };
  }
  const id = String(schema.$id || '');
  const m = id.match(/poker-input-?([\d.]+)\.schema/);
  const version = m ? m[1] : ((schema['x-poker'] && schema['x-poker'].generator) || '不明');
  const has = !!(schema.properties && schema.properties.particle);
  if (has) neutronSupported = true;
  return { supported: has, version };
}

export function createParticleHandlers(taskManager, { schemaRunner } = {}) {
  return {
    async setParticle(args) {
      const particle = (args || {}).particle;
      let note = null;
      if (particle === 'neutron') {
        const c = await checkNeutronSupport(schemaRunner);
        if (c.supported === false) {
          throw PokerMcpError.validationError(
            `この POKER（版 ${c.version}）は中性子線源（particle: neutron）に対応していません。` +
            'POKER 2.3.0 以降が必要です。POKER を更新するか、光子（photon）で計算してください。',
            'particle', particle);
        }
        if (c.supported === null) {
          note = 'poker_cui を呼べなかったため、POKER が中性子線源に対応しているか確かめていません' +
            '（POKER 2.3.0 以降が必要です）。';
        }
      }
      const result = await taskManager.setParticle(particle);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, ...result, ...(note ? { note } : {}) }, null, 2)
        }]
      };
    },

    async getParticle() {
      const result = await taskManager.getParticle();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  };
}
