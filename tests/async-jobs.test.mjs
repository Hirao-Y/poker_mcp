// tests/async-jobs.test.mjs - 非同期ジョブ（POKER_MCP_ASYNC=1）の検証
//
//   1. 既定（環境変数なし）ではツール一覧が 36 個のままで、ジョブ系ツールも job_id も無い
//   2. 有効にすると 39 個になり、poker_getDoseMap に job_id が付く
//   3. 同期の executeCalculation と非同期ジョブの出力（.summary / .dose）が全行一致する
//      （生成日時・計算時間・入力ファイルのパスの行を除く）
//   4. 投入後に作業中の YAML を編集しても、投入済みのジョブには混ざらない
//   5. 同時実行 1 件のとき、後から投入したジョブは待ち行列に並ぶ
//   6. 線量マップ（getDoseMap）が同期と非同期で一致する
//   7. 計算が失敗したジョブは getJobResult が isError になる（getJobStatus は成功）
//   8. サーバを再起動してもジョブが残る。実行中だったジョブは failed、待機中だったものは再実行される
//
// 実行: npm run test:jobs （POKER 本体が必要。POKER_INSTALL_PATH 既定 C:/Poker）
// いずれかが失敗すると終了コード 1 で終わる。

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = process.cwd();
const T = path.join(os.tmpdir(), 'poker_test_async_ws');
const TASKS = path.join(T, 'tasks');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(TASKS, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'tools/samples/grid_test.yaml'), path.join(TASKS, 'grid.yaml'));
fs.copyFileSync(path.join(ROOT, 'tools/samples/article_fillet/poker.yaml'), path.join(TASKS, 'fillet.yaml'));
fs.copyFileSync(path.join(ROOT, 'tools/samples/article_pipe/poker.paths'), path.join(TASKS, 'wrong.paths'));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  OK ' : '  NG '} ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
};

async function start(asyncOn) {
  const env = { ...process.env, POKER_MCP_HOME: T, POKER_INSTALL_PATH: process.env.POKER_INSTALL_PATH || 'C:/Poker' };
  if (asyncOn) env.POKER_MCP_ASYNC = '1'; else delete env.POKER_MCP_ASYNC;
  const transport = new StdioClientTransport({
    command: process.execPath, args: [path.join(ROOT, 'src/mcp_server_stdio_v4.js')], env, stderr: 'ignore'
  });
  const client = new Client({ name: 'async-jobs-test', version: '0.1.0' });
  await client.connect(transport);
  return client;
}

async function call(c, name, args = {}) {
  const r = await c.callTool({ name, arguments: args }, undefined, { timeout: 600000 });
  return { isError: !!r.isError, j: JSON.parse(r.content[0].text) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitJob(c, id, timeoutMs = 300000) {
  const seen = new Set();
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const { j } = await call(c, 'poker_getJobStatus', { job_id: id });
    seen.add(j.status);
    if (j.status === 'succeeded' || j.status === 'failed') return { status: j.status, seen };
    await sleep(300);
  }
  return { status: 'timeout', seen };
}

const MASK = /generated_at:|elapsed_time:|input_file:/;
function diffLines(a, b) {
  const x = fs.readFileSync(a, 'utf8').split(/\r?\n/).filter((l) => !MASK.test(l));
  const y = fs.readFileSync(b, 'utf8').split(/\r?\n/).filter((l) => !MASK.test(l));
  let d = 0;
  for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) d++;
  return { diff: d, lines: x.length };
}

const totalOf = (result, det) => {
  const d = (result.result_total || []).find((r) => r.name === det);
  return d ? d.points[0].doses['H*(10)'].TOTAL : undefined;
};

// ------------------------------------------------------------------ 1. 既定
console.log('1. 既定（POKER_MCP_ASYNC なし）');
{
  const c = await start(false);
  const { tools } = await c.listTools();
  const names = tools.map((t) => t.name);
  check('ツールは 36 個', tools.length === 36, `(${tools.length})`);
  check('ジョブ系ツールが無い', !names.some((n) => /Job|submitCalculation/.test(n)));
  const dm = tools.find((t) => t.name === 'poker_getDoseMap');
  check('getDoseMap に job_id が無い', !('job_id' in dm.inputSchema.properties));
  let rejected = false;
  try { await c.callTool({ name: 'poker_submitCalculation', arguments: { yaml_file: 'grid.yaml' } }); }
  catch { rejected = true; }
  check('submitCalculation は未知のツールとして拒否される', rejected);
  await c.close();
}

// ------------------------------------------------------------------ 2〜7
console.log('2. 有効（POKER_MCP_ASYNC=1）');
let c = await start(true);
let jobA, jobC, jobFail;
{
  const { tools } = await c.listTools();
  check('ツールは 39 個', tools.length === 39, `(${tools.length})`);
  const dm = tools.find((t) => t.name === 'poker_getDoseMap');
  check('getDoseMap に job_id がある', 'job_id' in dm.inputSchema.properties);

  const opts = { show_parameters: true, show_source_data: true, show_total_dose: true };

  console.log('3. 同期と非同期の一致');
  const sync = await call(c, 'poker_executeCalculation', { yaml_file: 'grid.yaml', summary_options: opts });
  check('同期計算が成功', !sync.isError && sync.j.success === true);

  const subA = await call(c, 'poker_submitCalculation', { yaml_file: 'grid.yaml', summary_options: opts });
  check('ジョブ A を受け付け', !subA.isError && !!subA.j.job_id, subA.j.job_id);
  jobA = subA.j.job_id;

  console.log('4/5. 投入後の編集が混ざらないこと、待ち行列');
  const yamlPath = path.join(TASKS, 'grid.yaml');
  const orig = fs.readFileSync(yamlPath, 'utf8');
  const edited = orig.replace('origin: 228 0 230', 'origin: 400 0 230');
  check('検出器 D_side_1m の位置を書き換えた', edited !== orig);
  fs.writeFileSync(yamlPath, edited, 'utf8');
  const subC = await call(c, 'poker_submitCalculation', { yaml_file: 'grid.yaml', summary_options: opts });
  jobC = subC.j.job_id;
  check('ジョブ C は待ち行列に並ぶ（同時実行 1）', subC.j.status === 'queued' && subC.j.queue_position === 1,
    `status=${subC.j.status} position=${subC.j.queue_position}`);
  check('A と C で入力のハッシュが違う', subC.j.input.yaml_sha256 !== subA.j.input.yaml_sha256);

  const wA = await waitJob(c, jobA);
  check('ジョブ A が完了', wA.status === 'succeeded', [...wA.seen].join('→'));
  const wC = await waitJob(c, jobC);
  check('ジョブ C が完了', wC.status === 'succeeded', [...wC.seen].join('→'));
  fs.writeFileSync(yamlPath, orig, 'utf8');

  const rA = await call(c, 'poker_getJobResult', { job_id: jobA });
  check('A の結果を取得', !rA.isError && rA.j.ready === true);
  check('A の result_total が同期と一致',
    JSON.stringify(rA.j.result_total) === JSON.stringify(sync.j.result_total));
  for (const [key, syncFile] of [['summary_file', path.join(TASKS, 'grid.yaml.summary')], ['dose_file', path.join(TASKS, 'grid.yaml.dose')]]) {
    const r = diffLines(syncFile, rA.j.outputs.files[key].path);
    check(`A の ${key} が同期と全行一致`, r.diff === 0, `(${r.lines} 行中 ${r.diff} 行が違う)`);
  }

  const rC = await call(c, 'poker_getJobResult', { job_id: jobC });
  const a1m = totalOf(rA.j, 'D_side_1m'), c1m = totalOf(rC.j, 'D_side_1m');
  check('C は書き換え後の入力で計算されている（D_side_1m が A と違う）', a1m !== undefined && c1m !== undefined && a1m !== c1m,
    `A=${a1m} C=${c1m}`);
  check('A は書き換え前の入力のまま（D_side_1m が同期と同じ）', a1m === totalOf(sync.j, 'D_side_1m'));
  check('作業フォルダの同期出力は上書きされていない',
    diffLines(path.join(TASKS, 'grid.yaml.summary'), rA.j.outputs.files.summary_file.path).diff === 0);

  console.log('6. 線量マップ');
  const mSync = await call(c, 'poker_getDoseMap', { detector_name: 'D_lid_map', yaml_file: 'grid.yaml' });
  const mJob = await call(c, 'poker_getDoseMap', { detector_name: 'D_lid_map', job_id: jobA });
  check('非同期の線量マップを取得', !mJob.isError && mJob.j.success === true);
  const pts = Array.isArray(mJob.j.points) ? mJob.j.points.length : 0;
  check('線量マップが同期と一致',
    mSync.j.success === true && Array.isArray(mSync.j.grid) && pts > 0 &&
    JSON.stringify(mSync.j.grid) === JSON.stringify(mJob.j.grid) &&
    JSON.stringify(mSync.j.points) === JSON.stringify(mJob.j.points),
    `(${pts} 点)`);

  console.log('7. 失敗するジョブ');
  const subF = await call(c, 'poker_submitCalculation', { yaml_file: 'fillet.yaml', path_input: 'wrong.paths' });
  jobFail = subF.j.job_id;
  const wF = await waitJob(c, jobFail);
  check('別体系の .paths を与えたジョブは failed', wF.status === 'failed');
  const sF = await call(c, 'poker_getJobStatus', { job_id: jobFail });
  check('getJobStatus は成功として返る', !sF.isError && sF.j.status === 'failed');
  const rF = await call(c, 'poker_getJobResult', { job_id: jobFail });
  check('getJobResult は isError', rF.isError && rF.j.success === false, rF.j.error);
  const rX = await call(c, 'poker_getJobResult', { job_id: 'no-such-job' });
  check('存在しないジョブは isError', rX.isError);

  await c.close();
}

// ------------------------------------------------------------------ 8. 再起動
console.log('8. 再起動');
{
  // 実行中のまま止まったジョブと、待機中のジョブを模造する
  const jobsDir = path.join(T, 'jobs');
  const base = JSON.parse(fs.readFileSync(path.join(jobsDir, jobA, 'job.json'), 'utf8'));
  const fake = (id, status) => {
    const dir = path.join(jobsDir, id);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(base.input.yaml_file, path.join(dir, path.basename(base.input.yaml_file)));
    const j = {
      ...base, id, status, started_at: status === 'running' ? new Date().toISOString() : null, finished_at: null,
      execution_time_ms: null, error: null,
      input: { ...base.input, yaml_file: path.join(dir, path.basename(base.input.yaml_file)) },
      outputs: {
        summary_file: path.join(dir, path.basename(base.outputs.summary_file)),
        dose_file: path.join(dir, path.basename(base.outputs.dose_file))
      }
    };
    fs.writeFileSync(path.join(dir, 'job.json'), JSON.stringify(j, null, 2));
  };
  fake('99999999-000000-running', 'running');
  fake('99999999-000001-queued', 'queued');

  c = await start(true);
  const sA = await call(c, 'poker_getJobStatus', { job_id: jobA });
  check('完了済みのジョブが残っている', sA.j.status === 'succeeded');
  const rA = await call(c, 'poker_getJobResult', { job_id: jobA });
  check('再起動後も結果を取得できる', rA.j.ready === true && Array.isArray(rA.j.result_total));
  const sR = await call(c, 'poker_getJobStatus', { job_id: '99999999-000000-running' });
  check('実行中だったジョブは failed（INTERRUPTED_BY_RESTART）',
    sR.j.status === 'failed' && sR.j.error?.code === 'INTERRUPTED_BY_RESTART');
  const wQ = await waitJob(c, '99999999-000001-queued');
  check('待機中だったジョブは再実行されて完了', wQ.status === 'succeeded');
  const rQ = await call(c, 'poker_getJobResult', { job_id: '99999999-000001-queued' });
  check('再実行の結果も A と一致', JSON.stringify(rQ.j.result_total) === JSON.stringify(rA.j.result_total));
  const list = await call(c, 'poker_getJobStatus', {});
  check('job_id 省略で一覧を返す', Array.isArray(list.j.jobs) && list.j.jobs.length >= 5, `(${list.j.jobs?.length})`);
  await c.close();
}

console.log(failures === 0 ? '\nすべて合格' : `\n${failures} 件が不合格`);
process.exit(failures === 0 ? 0 : 1);
