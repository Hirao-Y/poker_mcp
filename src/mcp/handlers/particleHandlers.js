// mcp/handlers/particleHandlers.js
//
// particle（photon / neutron）のハンドラ。POKER 2.3.0 から。
//
// neutron を設定するときは、計算に使う poker_cui（PATH 上）が中性子線源に対応しているかを
// poker_cui --schema の properties.particle で確かめる（v1.13.0）。古い POKER では計算の段階で
// 「知らない項目 particle」として止まり、原因が分かりにくいため、設定の時点で止める。
// poker_cui を呼べず確かめられないときは止めない（YAML の編集だけなら POKER は要らない）。
//
// neutron_correction（中性子の有限媒質補正、POKER 2.3.2 以降）のハンドラもここに置く（v1.15.0）。
// 値を書くときは同じように properties.neutron_correction で POKER の対応を確かめる。
import { runSchema } from './schemaHandlers.js';
import { PokerMcpError } from '../../utils/mcpErrors.js';
import { logger } from '../../utils/logger.js';

let neutronSupported = false;   // 対応を確かめられた結果だけを覚える（POKER を入れ替えたら再起動不要で読み直す）
let correctionSupported = false;   // neutron_correction（POKER 2.3.2 以降）も同じ

// poker_cui --schema の入力スキーマのトップレベルに項目 key があるか
async function checkSchemaProperty(key, run, what) {
  let schema;
  try {
    schema = JSON.parse(await run('input'));
  } catch (e) {
    logger.warn(`poker_cui --schema で${what}を確かめられませんでした`, { error: e.message });
    return { supported: null, reason: e.message };
  }
  const id = String(schema.$id || '');
  const m = id.match(/poker-input-?([\d.]+)\.schema/);
  const version = m ? m[1] : ((schema['x-poker'] && schema['x-poker'].generator) || '不明');
  return { supported: !!(schema.properties && schema.properties[key]), version };
}

/**
 * @returns {Promise<{supported: boolean|null, version?: string, reason?: string}>}
 *   supported: true = 対応、false = 非対応、null = 確かめられなかった
 */
export async function checkNeutronSupport(run = runSchema) {
  if (neutronSupported) return { supported: true };
  const c = await checkSchemaProperty('particle', run, '中性子対応');
  if (c.supported) neutronSupported = true;
  return c;
}

// neutron_correction（POKER 2.3.2 以降、v1.15.0）に対応しているか
export async function checkNeutronCorrectionSupport(run = runSchema) {
  if (correctionSupported) return { supported: true };
  const c = await checkSchemaProperty('neutron_correction', run, 'neutron_correction への対応');
  if (c.supported) correctionSupported = true;
  return c;
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
    },

    // neutron_correction（POKER 2.3.2 以降、v1.15.0）。値を書くときだけ POKER の対応を確かめる
    // （消す＝既定に戻すだけなら古い POKER でも困らない）。
    async setNeutronCorrection(args) {
      const a = args || {};
      // 光子のデッキなら POKER を確かめるまでもなく TaskManager が止める（その理由の方が先に伝わるように）
      const isNeutron = typeof taskManager.effectiveParticle !== 'function' || taskManager.effectiveParticle() === 'neutron';
      const writesValue = isNeutron && a.reset !== true &&
        (a.use_geometry_correction !== undefined || a.use_finite_medium_correction !== undefined);
      let note = null;
      if (writesValue) {
        const c = await checkNeutronCorrectionSupport(schemaRunner);
        if (c.supported === false) {
          throw PokerMcpError.validationError(
            `この POKER（版 ${c.version}）は中性子の有限媒質補正の設定（neutron_correction）に対応していません。` +
            'POKER 2.3.2 以降が必要です。POKER を更新してください（この版では補正は掛かりません）。',
            'neutron_correction', a);
        }
        if (c.supported === null) {
          note = 'poker_cui を呼べなかったため、POKER が neutron_correction に対応しているか確かめていません' +
            '（POKER 2.3.2 以降が必要です）。';
        }
      }
      const result = await taskManager.setNeutronCorrection(a);
      const notes = [result.note, note].filter(Boolean);
      const { note: _n, ...rest } = result;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, ...rest, ...(notes.length ? { note: notes.join(' ') } : {}) }, null, 2)
        }]
      };
    },

    async getNeutronCorrection() {
      const result = await taskManager.getNeutronCorrection();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  };
}
