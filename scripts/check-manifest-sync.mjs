#!/usr/bin/env node
// scripts/check-manifest-sync.mjs
// 実行時ツール定義(allTools)と config/mcp-manifest.json のドリフトを検出する。
// ツール名の欠落/余剰、および各ツールのトップレベル入力パラメータの差分を報告。
//
//   node scripts/check-manifest-sync.mjs          非同期ジョブ無効の状態（既定）で照合
//   node scripts/check-manifest-sync.mjs --async  POKER_MCP_ASYNC=1 の状態で照合
//                                                 （manifest の optional_tools / optional_params を加えて比べる）
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const asyncMode = process.argv.includes('--async');
if (asyncMode) process.env.POKER_MCP_ASYNC = '1';
else delete process.env.POKER_MCP_ASYNC;

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

for (const n of rNames) if (!mNames.has(n)) { console.log(`[DRIFT] 実行時のみ（マニフェスト欠落）: ${n}`); drift++; }
for (const n of mNames) if (!rNames.has(n)) { console.log(`[DRIFT] マニフェストのみ（実行時に無い）: ${n}`); drift++; }

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

const mode = asyncMode ? '非同期ジョブ有効' : '既定';
if (drift === 0) {
  console.log(`OK: マニフェストと実行時ツール定義は同期しています (${runtime.size} tools, ${mode})`);
  process.exit(0);
} else {
  console.log(`\n${drift} 件のドリフトを検出（${mode}）。config/mcp-manifest.json を更新してください。`);
  process.exit(1);
}
