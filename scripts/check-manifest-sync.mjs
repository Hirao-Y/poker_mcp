#!/usr/bin/env node
// scripts/check-manifest-sync.mjs
// 実行時ツール定義(allTools)と config/mcp-manifest.json のドリフトを検出する。
// ツール名の欠落/余剰、および各ツールのトップレベル入力パラメータの差分を報告。
import { allTools } from '../src/mcp/tools/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(__dirname, '..', 'config', 'mcp-manifest.json');

const paramSet = (tool) => new Set(Object.keys((tool.inputSchema && tool.inputSchema.properties) || {}));

const runtime = new Map(allTools.map(t => [t.name, paramSet(t)]));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const mtools = new Map((manifest.tools || []).map(t => [t.name, paramSet(t)]));

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

if (drift === 0) {
  console.log(`OK: マニフェストと実行時ツール定義は同期しています (${runtime.size} tools)`);
  process.exit(0);
} else {
  console.log(`\n${drift} 件のドリフトを検出。config/mcp-manifest.json を更新してください。`);
  process.exit(1);
}
