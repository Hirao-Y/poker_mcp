// mcp/handlers/equilHandlers.js
//
// equil_* ツール：EquilibriumSheet_CUI（EquilibriumSheet のコマンドライン版）を呼んで、
// 崩壊系列・放射平衡・経過時間後の量・時間変化・放出データを返す。
// 計算は EquilibriumSheet と同じコード（EquilibriumCore）で行い、ここでは引数の変換だけをする。
import { runEquilCui, EquilCuiError } from '../../utils/equilCui.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const TIME_RE = /^\s*[+]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*(ms|us|[smhdy])\s*$/;

function requireNuclide(args) {
  const n = args && typeof args.nuclide === 'string' ? args.nuclide.trim() : '';
  if (!n) throw new ValidationError('nuclide は必須です（例: Cs-137）', 'nuclide', args && args.nuclide);
  return n;
}

function requireTime(args, name = 'time') {
  const t = args[name];
  if (typeof t !== 'string' || !TIME_RE.test(t)) {
    throw new ValidationError(`${name} は数値＋単位（s/m/h/d/y、y = 365 日）で指定してください（例: 10y, 30d）`, name, t);
  }
  return t.replace(/\s+/g, '');
}

function num(v, name) {
  const x = Number(v);
  if (!isFinite(x)) throw new ValidationError(`${name} は数値で指定してください`, name, v);
  return String(x);
}

// 系列の設定（平衡の判定）
function chainArgs(args) {
  const a = [];
  if (args.parent_halflife === true) a.push('--parent-halflife');
  if (args.keep_nonequilibrium === true) a.push('--keep-nonequilibrium');
  if (args.threshold_transient !== undefined) a.push('--thr-transient', num(args.threshold_transient, 'threshold_transient'));
  if (args.threshold_secular !== undefined) a.push('--thr-secular', num(args.threshold_secular, 'threshold_secular'));
  return a;
}

// 初期量（頂点親）と娘の初期値
function initialArgs(args) {
  const a = [];
  const ini = args.initial || {};
  const keys = ['activity_Bq', 'atoms', 'mass_g'].filter((k) => ini[k] !== undefined);
  if (keys.length > 1) throw new ValidationError('initial は activity_Bq・atoms・mass_g のどれか 1 つを指定してください', 'initial', ini);
  if (ini.activity_Bq !== undefined) a.push('--activity', num(ini.activity_Bq, 'initial.activity_Bq'));
  if (ini.atoms !== undefined) a.push('--atoms', num(ini.atoms, 'initial.atoms'));
  if (ini.mass_g !== undefined) a.push('--mass', num(ini.mass_g, 'initial.mass_g'));
  if (Array.isArray(args.daughters_initial)) {
    for (const d of args.daughters_initial) {
      if (!d || typeof d.nuclide !== 'string') throw new ValidationError('daughters_initial の各要素は {nuclide, value}', 'daughters_initial', d);
      a.push('--init', `${d.nuclide.trim()}=${num(d.value, 'daughters_initial.value')}`);
    }
    if (args.daughters_initial_unit) {
      if (!['Bq', 'atoms', 'g'].includes(args.daughters_initial_unit)) {
        throw new ValidationError('daughters_initial_unit は Bq・atoms・g', 'daughters_initial_unit', args.daughters_initial_unit);
      }
      a.push('--init-unit', args.daughters_initial_unit);
    }
  }
  return a;
}

async function call(tool, cliArgs, shape) {
  try {
    const { result, warnings, version } = await runEquilCui(cliArgs);
    return { success: true, ...(shape ? shape(result) : result), warnings, equilibrium_cui_version: version };
  } catch (e) {
    if (e instanceof EquilCuiError) {
      logger.warn(`${tool} failed`, { code: e.code, error: e.message });
      return { success: false, error: e.message, code: e.code, ...(e.hint ? { hint: e.hint } : {}) };
    }
    throw e;
  }
}

export function createEquilHandlers() {
  return {
    async equil_listNuclides(args = {}) {
      const a = ['nuclides'];
      if (args.filter) a.push('--filter', String(args.filter));
      return call('equil_listNuclides', a, (r) => ({
        source: r.source,
        count: r.count,
        nuclides: r.nuclides.map((n) => ({
          nuclide: n.nuclide, halflife: n.halflife, halflife_s: n.halflife_s, decay_mode: n.decay_mode,
          daughters: n.daughters.map((d) => ({ nuclide: d.nuclide, branching: d.branching_value ?? d.branching }))
        }))
      }));
    },

    async equil_getChain(args = {}) {
      const nuc = requireNuclide(args);
      const detail = args.detail || 'table';
      if (!['table', 'full'].includes(detail)) throw new ValidationError('detail は table か full', 'detail', detail);
      return call('equil_getChain', ['chain', nuc, ...chainArgs(args)], (r) => (detail === 'full' ? r : {
        parent: r.parent, options: r.options, equilibrium_table: r.equilibrium_table,
        note: '崩壊系列のツリーと全子孫の表は detail="full" で取得できます'
      }));
    },

    async equil_calculateDecay(args = {}) {
      const nuc = requireNuclide(args);
      const t = requireTime(args);
      return call('equil_calculateDecay', ['decay', nuc, '--time', t, ...initialArgs(args), ...chainArgs(args)]);
    },

    async equil_getSeries(args = {}) {
      const nuc = requireNuclide(args);
      const t = requireTime(args);
      const a = ['series', nuc, '--time', t];
      if (args.points !== undefined) a.push('--points', num(args.points, 'points'));
      if (args.quantity) {
        if (!['atoms', 'activity'].includes(args.quantity)) throw new ValidationError('quantity は atoms か activity', 'quantity', args.quantity);
        a.push('--quantity', args.quantity);
      }
      return call('equil_getSeries', [...a, ...initialArgs(args), ...chainArgs(args)]);
    },

    async equil_getEmissions(args = {}) {
      const nuc = requireNuclide(args);
      const kind = args.kind || 'radiations';
      if (!['radiations', 'beta', 'both'].includes(kind)) throw new ValidationError('kind は radiations・beta・both', 'kind', kind);
      const a = ['emissions', nuc];
      if (kind !== 'beta') a.push('--photon');
      if (kind !== 'radiations') a.push('--beta');
      const minYield = args.min_yield !== undefined ? Number(args.min_yield) : 0;
      const types = Array.isArray(args.types) && args.types.length ? args.types.map((s) => String(s).toLowerCase()) : null;
      return call('equil_getEmissions', a, (r) => {
        const out = { nuclide: r.nuclide };
        if (r.radiations !== undefined) {
          const all = r.radiations || [];
          const list = all.filter((x) => (x.per_decay ?? 0) >= minYield &&
            (!types || types.some((t) => String(x.type).toLowerCase().includes(t))));
          // per_decay = 1 壊変あたりの放出数（YLD の第 2 列。POKER の線源と同じ値）
          out.radiations = list.map((x) => ({ energy_MeV: x.energy_MeV, per_decay: x.per_decay, type: x.type }));
          out.radiations_total = all.length;
          out.radiations_returned = list.length;
          out.radiations_source = r.radiations_source;
        }
        if (r.beta_spectrum !== undefined) {
          out.beta_spectrum = r.beta_spectrum;
          out.beta_source = r.beta_source;
        }
        return out;
      });
    }
  };
}
