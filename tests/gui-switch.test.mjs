// tests/gui-switch.test.mjs - poker_openGui の登録条件（POKER_MCP_GUI と自動判定）の検証
//
//   1. 判定関数 getGuiStatus: POKER_MCP_GUI=0 / Windows 以外 / POKER.exe が無い のそれぞれで無効になる
//   2. 既定: Windows で POKER.exe があれば、ツール一覧に poker_openGui が載る（従来どおり 36 個）
//   3. POKER_MCP_GUI=0: 一覧から外れ（35 個）、ツール名で直接呼んでも未知のツールとして拒否される
//   4. POKER_MCP_GUI=0 でも計算（executeCalculation）は従来どおり動く
//   5. 非同期ジョブと組み合わせても数が合う（38 個）
//
// 実行: npm run test:gui （POKER 本体が必要。POKER_INSTALL_PATH 既定 C:/Poker）
// いずれかが失敗すると終了コード 1 で終わる。

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const ROOT = process.cwd();
const T = path.join(os.tmpdir(), 'poker_test_gui_ws');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(path.join(T, 'tasks'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'tools/samples/article_fillet/poker.yaml'), path.join(T, 'tasks', 'fillet.yaml'));

const INSTALL = process.env.POKER_INSTALL_PATH || 'C:/Poker';
const pokerExe = path.win32.join(INSTALL.replace(/\//g, '\\'), 'POKER.exe');
const guiExpected = process.platform === 'win32' && fs.existsSync(pokerExe);

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  OK ' : '  NG '} ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
};

async function start(env) {
  const e = { ...process.env, POKER_MCP_HOME: T, POKER_INSTALL_PATH: INSTALL };
  delete e.POKER_MCP_GUI;
  delete e.POKER_MCP_ASYNC;
  Object.assign(e, env);
  const transport = new StdioClientTransport({
    command: process.execPath, args: [path.join(ROOT, 'src/mcp_server_stdio_v4.js')], env: e, stderr: 'ignore'
  });
  const client = new Client({ name: 'gui-switch-test', version: '0.1.0' });
  await client.connect(transport);
  return client;
}

// ------------------------------------------------------------------ 1. 判定関数
console.log('1. 判定関数 getGuiStatus');
{
  const { getGuiStatus } = await import(pathToFileURL(path.join(ROOT, 'src/utils/guiConfig.js')).href);
  const saved = { gui: process.env.POKER_MCP_GUI, inst: process.env.POKER_INSTALL_PATH };

  for (const v of ['0', 'false', 'no', 'off', 'OFF']) {
    process.env.POKER_MCP_GUI = v;
    process.env.POKER_INSTALL_PATH = INSTALL;
    const s = getGuiStatus();
    check(`POKER_MCP_GUI=${v} で無効`, s.enabled === false && /POKER_MCP_GUI/.test(s.reason), s.reason);
  }

  delete process.env.POKER_MCP_GUI;
  process.env.POKER_INSTALL_PATH = path.join(T, 'no-poker-here');
  const missing = getGuiStatus();
  check('POKER.exe が無ければ無効', missing.enabled === false, missing.reason);

  process.env.POKER_INSTALL_PATH = INSTALL;
  const def = getGuiStatus();
  check(`既定の判定（この機械では ${guiExpected ? '有効' : '無効'} のはず）`, def.enabled === guiExpected, def.reason);

  if (saved.gui === undefined) delete process.env.POKER_MCP_GUI; else process.env.POKER_MCP_GUI = saved.gui;
  if (saved.inst === undefined) delete process.env.POKER_INSTALL_PATH; else process.env.POKER_INSTALL_PATH = saved.inst;
}

// ------------------------------------------------------------------ 2. 既定
console.log('2. 既定');
{
  const c = await start({});
  const { tools } = await c.listTools();
  const has = tools.some((t) => t.name === 'poker_openGui');
  check(`poker_openGui の有無が判定どおり（${guiExpected ? 'あり' : 'なし'}）`, has === guiExpected);
  check(`ツール数 ${guiExpected ? 36 : 35}`, tools.length === (guiExpected ? 36 : 35), `(${tools.length})`);
  await c.close();
}

// ------------------------------------------------------------------ 3, 4. GUI 無効
console.log('3/4. POKER_MCP_GUI=0');
{
  const c = await start({ POKER_MCP_GUI: '0' });
  const { tools } = await c.listTools();
  check('poker_openGui が一覧に無い', !tools.some((t) => t.name === 'poker_openGui'));
  check('ツール数 35', tools.length === 35, `(${tools.length})`);

  let rejected = false, launched = false;
  try {
    const r = await c.callTool({ name: 'poker_openGui', arguments: { yaml_file: 'fillet.yaml' } });
    launched = !r.isError;
  } catch {
    rejected = true;
  }
  check('名前で直接呼んでも拒否され、POKER は起動しない', rejected && !launched);

  const r = await c.callTool({
    name: 'poker_executeCalculation',
    arguments: { yaml_file: 'fillet.yaml', summary_options: { show_total_dose: true, show_source_data: false } }
  }, undefined, { timeout: 300000 });
  const j = JSON.parse(r.content[0].text);
  check('計算は従来どおり動く', !r.isError && j.success === true && Array.isArray(j.result_total) && j.result_total.length === 3,
    `(検出器 ${j.result_total?.length})`);
  await c.close();
}

// ------------------------------------------------------------------ 5. 非同期と組み合わせ
console.log('5. POKER_MCP_GUI=0 と POKER_MCP_ASYNC=1');
{
  const c = await start({ POKER_MCP_GUI: '0', POKER_MCP_ASYNC: '1' });
  const { tools } = await c.listTools();
  check('ツール数 38', tools.length === 38, `(${tools.length})`);
  check('ジョブ系ツールはある', tools.some((t) => t.name === 'poker_submitCalculation'));
  check('poker_openGui は無い', !tools.some((t) => t.name === 'poker_openGui'));
  await c.close();
}

console.log(failures === 0 ? '\nすべて合格' : `\n${failures} 件が不合格`);
process.exit(failures === 0 ? 0 : 1);
