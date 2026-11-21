// gui/libLists.js - Web GUI の材料リスト・核種リスト（Windows の GUI の Form_ListMaterial・Form_ListRI に当たる）
//
// 名前は poker_cui --schema（x-poker-names。このインストールのライブラリから作られる）から取る。
// 材料の密度と説明は、Form_ListMaterial と同じく lib_setting.dat の file_material が指すファイル（lib_material.dat、平文）から読む。
// 核種の崩壊モード・半減期は、配布物の核種ライブラリ（REV_IC38.YLD）が暗号化されているので読まない（名前だけ）。
// lib のファイルはここで読むだけで、画面には一覧の中身（名前・密度・説明）しか渡さない。
import fs from 'fs';
import path from 'path';
import { runCui } from './pokerRunner.js';

/** lib_setting.dat から file_material の行のファイル名を取る（Form_ListMaterial と同じ） */
function materialFile(libDir) {
  const setting = fs.readFileSync(path.join(libDir, 'lib_setting.dat'), 'utf8');
  for (const line of setting.split(/\r?\n/)) {
    if (!line.includes('file_material')) continue;
    const arr = line.split(':');
    if (arr.length >= 2 && arr[1].trim()) return path.join(libDir, arr[1].trim().split(' ')[0]);
    break;
  }
  return null;
}

/** lib_material.dat を Form_ListMaterial.MaterialListFromFile と同じ読み方で読む → [{name, density, description}] */
export function readMaterials(libDir) {
  const file = materialFile(libDir);
  if (!file || !fs.existsSync(file)) return { error: `file not found: ${file ? path.basename(file) : 'file_material'}`, materials: [] };
  const buf = fs.readFileSync(file);
  if (buf.subarray(1, 4).toString('latin1') === 'PKX') return { error: `${path.basename(file)} is encrypted`, materials: [] };
  const lines = buf.toString('utf8').replace(/^﻿/, '').split(/\r?\n/);
  let i = 0;
  const next = () => (i < lines.length ? lines[i++] : null);
  const out = [];
  if (next() === null || next() === null) return { materials: out };
  const head = next(); if (head === null) return { materials: out };
  const matNum = parseInt(head.trim().split('=')[1], 10);
  if (!Number.isInteger(matNum)) return { materials: out };
  for (let m = 0; m < matNum; m++) {
    let line = next(); if (line === null) break;
    const name = line.trim();
    let desc = '';
    line = next(); if (line === null) break;
    while (line.indexOf('!') === 0) { desc += line; line = next(); if (line === null) return { materials: out }; }
    const arr = line.trim().split(' ');
    const density = arr[0].trim();
    const compNum = parseInt(arr[1], 10);
    if (!Number.isInteger(compNum)) break;
    out.push({ name, density, description: desc });
    for (let j = 0; j < compNum; j++) if (next() === null) return { materials: out };
    if (next() === null) break;   // 材料の間の空行
  }
  return { materials: out };
}

let cached = null;
/** 一覧（--schema は一度だけ呼ぶ） */
export async function libLists(cui, libDir) {
  if (cached) return cached;
  const r = await runCui(cui, ['--schema'], { timeoutMs: 60000 });
  let schema = {};
  try { schema = JSON.parse(r.stdout); } catch { /* 古い poker_cui */ }
  const defs = schema.$defs || {};
  const particle = (schema.properties || {}).particle || {};
  let lib;
  try { lib = readMaterials(libDir); } catch (e) { lib = { error: e.message, materials: [] }; }
  cached = {
    materialNames: (defs.material || {})['x-poker-names'] || [],
    materials: lib.materials, materialsError: lib.error || null,
    nuclides: (defs.nuclide || {})['x-poker-names'] || [],
    buildupMaterials: (defs.buildupMaterial || {})['x-poker-names'] || [],
    neutronMaterials: Object.entries(particle['x-poker-neutron-materials'] || {}).map(([name, density]) => ({ name, density })),
    neutronNuclides: particle['x-poker-neutron-nuclides'] || [],
  };
  return cached;
}
