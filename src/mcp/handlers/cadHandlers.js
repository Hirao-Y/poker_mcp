// mcp/handlers/cadHandlers.js
//
// CAD 連携レイトレース。従来は次の 3 手順を手で行う必要があった。
//   1. spec.json を手書き（絶対パスを 4 箇所）
//   2. poker_cui -p で分割点と評価点を出す
//   3. freecadcmd を起動して gen_paths.py を走らせる
// このハンドラがまとめて行う。

import { spawn } from 'child_process';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { FREECAD_CMD, CAD_TOOLS_DIR, POKER_INSTALL_DIR, TASKS_DIR, YAML_FILE }
  from '../../utils/paths.js';
import { logger } from '../../utils/logger.js';
import { reconcileInventory } from '../../utils/DaughterReconciler.js';
import { MaterialCatalog } from '../../utils/MaterialCatalog.js';

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('error', e => resolve({ code: -1, out, err: e.message }));
    p.on('close', code => resolve({ code, out, err }));
  });
}

export function createCadHandlers(taskManager) {
  return {
    async generatePaths(args) {
      const fail = (msg, hint) => ({
        content: [{
          type: 'text',
          text: JSON.stringify({ success: false, error: msg, hint }, null, 2)
        }],
        isError: true
      });

      // --- FreeCAD の所在 ---
      if (!FREECAD_CMD) {
        return fail(
          'FreeCAD が見つかりません',
          '環境変数 FREECAD_PATH に freecadcmd の場所を設定してください。' +
          '実行ファイル（C:/Program Files/FreeCAD 1.1/bin/freecadcmd.exe）でも、' +
          'インストールフォルダ（C:/Program Files/FreeCAD 1.1）でも指定できます。' +
          'claude_desktop_config.json の env に追加します。');
      }
      if (!args || !args.fcstd) return fail('fcstd を指定してください');
      if (!fssync.existsSync(args.fcstd))
        return fail('CAD ファイルが見つかりません: ' + args.fcstd);

      const yamlFile = YAML_FILE;
      if (!fssync.existsSync(yamlFile))
        return fail('入力 YAML がありません: ' + yamlFile,
          'applyChanges で入力を確定してから実行してください。');

      // --- 1. poker_cui -p で分割点と評価点を出す ---
      // .paths には全点が必要。間引かれていると gen_paths.py がエラーにする。
      const exe = path.join(POKER_INSTALL_DIR, 'poker_cui.EXE');
      if (!fssync.existsSync(exe))
        return fail('poker_cui が見つかりません: ' + exe,
          '環境変数 POKER_INSTALL_PATH を確認してください。');

      // 専用のサマリーに出す。
      //   既定の <yaml>.summary を使うと executeCalculation と衝突する。
      //   あちらは -p なしで同じファイルを上書きするので、次に generatePaths を
      //   呼んだとき input: セクションが無く「point_source が見つかりません」で
      //   失敗する。用途が違うファイルは分ける。
      const summary = path.join(TASKS_DIR, '.generate_paths.summary');
      const r1 = await run(exe, [yamlFile, '-p', '-t', '-o', summary,
                                 '-d', path.join(TASKS_DIR, '.generate_paths.dose')],
                           { cwd: TASKS_DIR });
      if (r1.code !== 0 || !fssync.existsSync(summary)) {
        return fail('poker_cui -p の実行に失敗しました（終了コード ' + r1.code + '）',
          (r1.err || r1.out || '').slice(-400));
      }

      // --- 2. spec を組み立てる ---
      const out = args.output || path.join(TASKS_DIR, 'poker.paths');
      const spec = {
        fcstd: args.fcstd.replace(/\\/g, '/'),
        out: out.replace(/\\/g, '/'),
        poker_summary: summary.replace(/\\/g, '/'),
        detectors_from_summary: true,
        deviation: args.deviation ?? 0.5,
        unit_scale: args.unit_scale ?? 0.1,
        poker_dir: POKER_INSTALL_DIR.replace(/\\/g, '/'),
        mu_energy: args.mu_energy ?? 1.25,
      };
      if (args.source_name) spec.source_name = args.source_name;
      if (args.buildup_exclude) spec.buildup_exclude = args.buildup_exclude;
      if (args.chunk) spec.chunk = args.chunk;

      // カスタム材料のビルドアップ等価材料を自動で解決する。
      //   gen_paths.py は層の縮約先を決める際、単層ビルドアップデータの有無を
      //   材料名で照合する。Source_Dry のようなカスタム材料は標準材料に
      //   読み替える必要があり、従来は spec.equivalent に手で書いていた。
      //   MaterialCatalog が lib_equivalent.dat と実データから解決できるので
      //   ここで埋める（POKER 側も同じ表を見るので食い違わない）。
      try {
        const data = taskManager.data || {};
        const equiv = {};
        for (const z of (data.zone || [])) {
          const m = z.material;
          if (!m || m === 'VOID' || equiv[m]) continue;
          if (MaterialCatalog.isStandard && MaterialCatalog.isStandard(m)) continue;
          const e = MaterialCatalog.nearestBuildupEquivalent(m);
          const name = (e && typeof e === 'object') ? e.equivalent : e;
          if (name) equiv[m] = name;
        }
        if (Object.keys(equiv).length) {
          spec.equivalent = equiv;
          logger.info('ビルドアップ等価材料を自動設定しました', { equivalent: equiv });
        }
      } catch (e) {
        logger.warn('等価材料の自動解決に失敗（spec.equivalent なしで続行）',
          { error: e.message });
      }

      const specFile = path.join(TASKS_DIR, '.generate_paths_spec.json');
      await fs.writeFile(specFile, JSON.stringify(spec, null, 2), 'utf8');

      // --- 3. FreeCAD をヘッドレスで起動してトレース ---
      // GUI の MCP ブリッジ経由では、数万レイのトレースが GUI スレッドを
      // 占有してブリッジが壊れる。freecadcmd を使う。
      const script =
        'import sys, json, traceback\n' +
        'sys.path.insert(0, r"' + CAD_TOOLS_DIR + '")\n' +
        'try:\n' +
        '    import gen_paths\n' +
        '    gen_paths.main(r"' + specFile + '")\n' +
        '    print("GEN_PATHS_OK")\n' +
        'except BaseException:\n' +
        '    print("GEN_PATHS_ERROR")\n' +
        '    traceback.print_exc()\n';

      const scriptFile = path.join(TASKS_DIR, '.generate_paths.py');
      await fs.writeFile(scriptFile, script, 'utf8');

      const r2 = await run(FREECAD_CMD, [scriptFile], { cwd: TASKS_DIR });
      const log = (r2.out || '') + (r2.err || '');

      if (!log.includes('GEN_PATHS_OK') || !fssync.existsSync(out)) {
        // Python のトレースバックから要点を抜く
        const m = log.match(/(?:SystemExit|Error|Exception)[^\n]*(?:\n[^\n]*){0,3}/);
        return fail('経路の生成に失敗しました',
          m ? m[0].trim() : log.slice(-500));
      }

      // --- 4. 生成結果を要約する ---
      const text = await fs.readFile(out, 'utf8');
      const info = {};
      for (const key of ['n_sources', 'n_source_points', 'n_detectors', 'n_materials',
                         'format_version', 'deviation_mm']) {
        const m = text.match(new RegExp('^\\s*' + key + ':\\s*(.+)$', 'm'));
        if (m) info[key] = m[1].trim();
      }
      const nPaths = (text.split('paths: |')[1] || '').trim().split('\n').length;

      logger.info('経路ファイルを生成しました', { out, ...info });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: '経路ファイルを生成しました',
            output: out,
            summary: {
              経路数: nPaths,
              線源数: info.n_sources,
              線源点数: info.n_source_points,
              検出器評価点数: info.n_detectors,
              材質数: info.n_materials,
              テッセレーション偏差_mm: info.deviation_mm,
              format_version: info.format_version
            },
            spec_used: {
              deviation: spec.deviation,
              unit_scale: spec.unit_scale,
              mu_energy: spec.mu_energy,
              buildup_exclude: spec.buildup_exclude ?? ['VOID', 'Air'],
              equivalent: spec.equivalent ?? {},
              freecad: FREECAD_CMD,
              poker_dir: spec.poker_dir
            },
            next: 'poker_cui "' + yamlFile + '" --path-input "' + out + '" -t で計算できます'
          }, null, 2)
        }]
      };
    },
    async generateInput(args) {
      const fail = (msg, hint) => ({
        content: [{
          type: 'text',
          text: JSON.stringify({ success: false, error: msg, hint }, null, 2)
        }],
        isError: true
      });

      if (!FREECAD_CMD) {
        return fail(
          'FreeCAD が見つかりません',
          '環境変数 FREECAD_PATH に freecadcmd の場所を設定してください。');
      }
      if (!args || !args.fcstd) return fail('fcstd を指定してください');
      if (!fssync.existsSync(args.fcstd))
        return fail('CAD ファイルが見つかりません: ' + args.fcstd);

      const out = args.output || YAML_FILE;
      if (fssync.existsSync(out) && !args.overwrite) {
        return fail(
          '出力先が既に存在します: ' + out,
          'CAD が正本なので上書きして構いませんが、手で編集した内容があると' +
          '失われます。overwrite: true を指定してください。');
      }

      // --- 1. CAD から線源の核種を読み、子孫核種を補完する ---
      //   まず核種だけを抜き出すために FreeCAD を一度呼ぶ。
      const probe = path.join(TASKS_DIR, '.probe_nuclides.py');
      const probeOut = path.join(TASKS_DIR, '.probe_nuclides.json');
      await fs.writeFile(probe,
        'import FreeCAD as App, json, os\n' +
        'd = App.openDocument(r"' + args.fcstd + '")\n' +
        'out = {}\n' +
        'for o in d.Objects:\n' +
        '    r = (getattr(o, "PokerRole", None) or "shield").strip().lower()\n' +
        '    if r != "source":\n' +
        '        continue\n' +
        '    out[o.Name] = getattr(o, "PokerNuclides", None) or ""\n' +
        'json.dump(out, open(r"' + probeOut + '", "w"), ensure_ascii=False)\n',
        'utf8');

      const r0 = await run(FREECAD_CMD, [probe], { cwd: TASKS_DIR });
      let nuclides = null;
      let daughterNote = null;
      if (fssync.existsSync(probeOut)) {
        const raw = JSON.parse(await fs.readFile(probeOut, 'utf8'));
        nuclides = {};
        const added = [];
        for (const [name, text] of Object.entries(raw)) {
          const inv = [];
          for (const part of String(text).split(/[,;]/)) {
            const m = part.trim().match(/^([A-Za-z]+[-_]?\d+m?)\s*[:=]\s*([\d.eE+-]+)$/);
            if (m) inv.push({
              nuclide: m[1].replace(/[-_]/g, ''),
              radioactivity: parseFloat(m[2])
            });
          }
          if (!inv.length) continue;
          try {
            const rec = await reconcileInventory(inv,
              { nuclideManager: taskManager.dataManager.nuclideManager });
            nuclides[name] = rec.inventory;
            for (const a of (rec.added || [])) added.push(name + ': ' + a.nuclide);
          } catch (e) {
            nuclides[name] = inv;
            logger.warn('子孫核種の補完に失敗', { source: name, error: e.message });
          }
        }
        if (added.length) daughterNote = '子孫核種を補完しました: ' + added.join(', ');
      }

      // --- 2. gen_input.py で YAML を組み立てる ---
      const spec = {
        fcstd: args.fcstd.replace(/\\/g, '/'),
        out: out.replace(/\\/g, '/'),
        poker_dir: POKER_INSTALL_DIR.replace(/\\/g, '/'),
      };
      if (nuclides && Object.keys(nuclides).length) spec.nuclides = nuclides;

      const specFile = path.join(TASKS_DIR, '.generate_input_spec.json');
      await fs.writeFile(specFile, JSON.stringify(spec, null, 2), 'utf8');

      const script = path.join(TASKS_DIR, '.generate_input.py');
      await fs.writeFile(script,
        'import sys, traceback\n' +
        'sys.path.insert(0, r"' + CAD_TOOLS_DIR + '")\n' +
        'try:\n' +
        '    import gen_input\n' +
        '    gen_input.main(r"' + specFile + '")\n' +
        '    print("GEN_INPUT_OK")\n' +
        'except BaseException:\n' +
        '    print("GEN_INPUT_ERROR")\n' +
        '    traceback.print_exc()\n', 'utf8');

      const r1 = await run(FREECAD_CMD, [script], { cwd: TASKS_DIR });
      const log = (r1.out || '') + (r1.err || '');
      if (!log.includes('GEN_INPUT_OK') || !fssync.existsSync(out)) {
        const m = log.match(/(?:SystemExit|Error|Exception)[^\n]*(?:\n[^\n]*){0,3}/);
        return fail('入力の生成に失敗しました', m ? m[0].trim() : log.slice(-500));
      }

      // --- 3. 生成結果を要約する ---
      const text = await fs.readFile(out, 'utf8');
      const count = (re) => (text.match(re) || []).length;
      // YAML の節を切り出して、その中の "  - name:" を数える。
      // 節をまたいで数えると線源と検出器が混ざる。
      const sectionCount = (t, sec) => {
        const m = t.split(new RegExp('^' + sec + ':', 'm'))[1];
        if (!m) return 0;
        const body = m.split(/^[a-z_]+:/m)[0];
        return (body.match(/^  - name: /gm) || []).length;
      };
      const result = {
        success: true,
        message: '入力を生成しました',
        output: out,
        summary: {
          材質数: count(/^  - body_name: REF_/gm),
          線源数: sectionCount(text, 'source'),
          検出器数: sectionCount(text, 'detector'),
        },
        next: 'poker_generatePaths で経路を抽出し、executeCalculation の path_input に渡してください',
      };
      if (daughterNote) result.note = daughterNote;

      logger.info('CAD から入力を生成しました', { out, added: daughterNote });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  };
}
