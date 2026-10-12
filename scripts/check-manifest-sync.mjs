#!/usr/bin/env node
// scripts/check-manifest-sync.mjs
// 実行時ツール定義(allTools)と config/mcp-manifest.json のドリフトを検出する。
// ツール名の欠落/余剰、および各ツールのトップレベル入力パラメータの差分を報告。
//
//   node scripts/check-manifest-sync.mjs          非同期ジョブ無効の状態（既定）で照合
//   node scripts/check-manifest-sync.mjs --async  POKER_MCP_ASYNC=1 の状態で照合
//                                                 （manifest の optional_tools / optional_params を加えて比べる）
//   node scripts/check-manifest-sync.mjs --no-gui POKER_MCP_GUI=0 の状態で照合
//
// manifest の conditional_tools に挙げたツール（poker_openGui）は、環境によって登録されない。
// 実行時に無い場合はドリフトとせず、その旨だけ表示する。--no-gui では、無いことを確かめる。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const asyncMode = process.argv.includes('--async');
if (asyncMode) process.env.POKER_MCP_ASYNC = '1';
else delete process.env.POKER_MCP_ASYNC;
const noGui = process.argv.includes('--no-gui');
if (noGui) process.env.POKER_MCP_GUI = '0';

// allTools は読み込んだ時点の環境変数で決まるため、環境変数を設定してから読み込む
const { allTools } = await import('../src/mcp/tools/index.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(__dirname, '..', 'config', 'mcp-manifest.json');

const paramSet = (tool) => new Set(Object.keys((tool.inputSchema && tool.inputSchema.properties) || {}));

const runtime = new Map(allTools.map(t => [t.name, paramSet(t)]));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const expectedTools = [...(manifest.tools || []), ...(asyncMode ? (manifest.optional_tools || []) : [])];
const mtools = new Map(expectedTools.map(t => [t.name, paramSet(t)]));
if (asyncMode) {
  for (const [name, params] of Object.entries(manifest.optional_params || {})) {
    const set = mtools.get(name);
    if (set) for (const p of Object.keys(params)) set.add(p);
  }
}

let drift = 0;
const rNames = new Set(runtime.keys()), mNames = new Set(mtools.keys());
const conditional = new Set(Object.keys(manifest.conditional_tools || {}));

for (const n of rNames) if (!mNames.has(n)) { console.log(`[DRIFT] 実行時のみ（マニフェスト欠落）: ${n}`); drift++; }
for (const n of mNames) {
  if (rNames.has(n)) continue;
  if (conditional.has(n)) { console.log(`[INFO] 条件付きのため未登録: ${n}`); continue; }
  console.log(`[DRIFT] マニフェストのみ（実行時に無い）: ${n}`); drift++;
}
if (noGui) {
  for (const n of conditional) {
    if (rNames.has(n)) { console.log(`[DRIFT] POKER_MCP_GUI=0 なのに登録されている: ${n}`); drift++; }
  }
}

for (const n of rNames) {
  if (!mNames.has(n)) continue;
  const r = runtime.get(n), mm = mtools.get(n);
  const missInManifest = [...r].filter(p => !mm.has(p));
  const extraInManifest = [...mm].filter(p => !r.has(p));
  if (missInManifest.length || extraInManifest.length) {
    console.log(`[DRIFT] ${n}: マニフェスト未記載=[${missInManifest.join(', ')}] 実行時に無い=[${extraInManifest.join(', ')}]`);
    drift++;
  }
}

const mode = [asyncMode ? '非同期ジョブ有効' : '既定', noGui ? 'GUI 無効' : null].filter(Boolean).join('・');
if (drift === 0) {
  console.log(`OK: マニフェストと実行時ツール定義は同期しています (${runtime.size} tools, ${mode})`);
  process.exit(0);
} else {
  console.log(`\n${drift} 件のドリフトを検出（${mode}）。config/mcp-manifest.json を更新してください。`);
  process.exit(1);
}
