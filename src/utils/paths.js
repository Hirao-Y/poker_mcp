// utils/paths.js - 実行時データの格納先を一元管理
//
// 優先順位:
//   1. 環境変数 POKER_MCP_HOME が設定されていれば、その値を使用
//   2. 未設定なら os.homedir()/.poker-mcp/ をデフォルトとする
//
// claude_desktop_config.json での設定例:
//   "env": {
//     "POKER_MCP_HOME": "C:\\Users\\yoshi\\poker_mcp_workspace",
//     "POKER_INSTALL_PATH": "C:\\Poker"
//   }
//
import fs from 'fs';
import path from 'path';
import os from 'os';

export const BASE_DIR = process.env.POKER_MCP_HOME
  ?? path.join(os.homedir(), '.poker-mcp');

export const LOGS_DIR   = path.join(BASE_DIR, 'logs');
export const TASKS_DIR  = path.join(BASE_DIR, 'tasks');
export const BACKUPS_DIR = path.join(BASE_DIR, 'backups');

// POKER 本体のインストール先。核データ・材料カタログの正本はここの LIB 配下にある。
export const POKER_INSTALL_DIR = process.env.POKER_INSTALL_PATH ?? 'C:/Poker';
export const POKER_LIB_DIR = path.join(POKER_INSTALL_DIR, 'LIB');

// FreeCAD のコマンドライン版（freecadcmd）。CAD 連携レイトレースで使う。
//
// 環境変数 FREECAD_PATH で指定する。実行ファイルそのものでも、
// インストールフォルダ（bin の親）でも受け付ける。
//
// 未設定なら既定の場所を順に探す。見つからなければ null を返し、
// CAD 連携のツールを呼んだときに「設定してください」と案内する。
// POKER_INSTALL_PATH のように既定値を決め打ちしないのは、FreeCAD の
// インストール先がバージョン番号を含み（FreeCAD 1.1, FreeCAD 1.0 …）
// 決め打ちが当たらないため。
// 探索の順序:
//   1. 環境変数 FREECAD_PATH（実行ファイルでもインストールフォルダでも可）
//   2. PATH に freecadcmd があるか
//   3. 既定のインストール先を走査（バージョン番号を決め打ちしない）
//
// バージョン番号を含むフォルダ（FreeCAD 1.1, FreeCAD 1.0 …）に入るため、
// POKER_INSTALL_PATH のような固定の既定値は使えない。
const FREECAD_SEARCH_ROOTS = [
  'C:/Program Files',
  'C:/Program Files (x86)',
  '/usr/lib',
  '/opt',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs') : null,
].filter(Boolean);

const FREECAD_EXE = process.platform === 'win32' ? 'freecadcmd.exe' : 'freecadcmd';

function underDir(dir) {
  for (const rel of [path.join('bin', FREECAD_EXE), FREECAD_EXE]) {
    const c = path.join(dir, rel);
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function fromPathEnv() {
  const sep = process.platform === 'win32' ? ';' : ':';
  for (const d of (process.env.PATH || '').split(sep)) {
    if (!d) continue;
    const c = path.join(d, FREECAD_EXE);
    try { if (fs.existsSync(c)) return c; } catch { /* 権限などは無視 */ }
  }
  return null;
}

function scanRoots() {
  // FreeCAD* に一致するフォルダを探す。新しいバージョンから試すため降順。
  for (const root of FREECAD_SEARCH_ROOTS) {
    let entries;
    try { entries = fs.readdirSync(root); } catch { continue; }
    const cands = entries.filter(n => /^freecad/i.test(n)).sort().reverse();
    for (const n of cands) {
      const hit = underDir(path.join(root, n));
      if (hit) return hit;
    }
  }
  // Linux の標準的な配置
  for (const c of ['/usr/bin/freecadcmd', '/usr/local/bin/freecadcmd']) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function resolveFreeCad() {
  const env = process.env.FREECAD_PATH;
  if (env) {
    if (fs.existsSync(env) && fs.statSync(env).isFile()) return env;
    const hit = underDir(env);
    if (hit) return hit;
    return null;   // 指定されているが見つからない（呼び出し側で案内する）
  }
  return fromPathEnv() || scanRoots();
}

export const FREECAD_CMD = resolveFreeCad();

// CAD 連携ツール（tools/ 配下の Python）の場所。
// npm パッケージにも同梱するので、このファイルからの相対で解決する。
export const CAD_TOOLS_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..', '..', 'tools');

export const YAML_FILE    = path.join(TASKS_DIR,  'poker.yaml');
export const PENDING_FILE = path.join(TASKS_DIR,  'pending_changes.json');
export const USER_CONFIG  = path.join(BASE_DIR,   'config.json');

// 核種データベース（ICRP-07）
//
// v1.4.0 変更: POKER_MCP_HOME/data/ へのコピーを廃止し、LIB を直接参照する。
// 旧実装は初回起動時に LIB からコピーを作り、以後「存在すればスキップ」していたため、
// POKER をバージョンアップして LIB の核データが更新されても、古いコピーを
// 読み続ける状態になっていた（静かに古い値を使う）。
// lib_material.dat を読む MaterialCatalog は元々 LIB 直接参照であり、流儀も揃う。
export const NDX_FILE = path.join(POKER_LIB_DIR, 'ICRP-07.NDX');

// 旧構成の互換フォールバック先（POKER_MCP_HOME/data/ICRP-07.NDX）
// LIB に見つからない場合のみ使用する。新規に作成することはない。
export const LEGACY_DATA_DIR = path.join(BASE_DIR, 'data');
export const LEGACY_NDX_FILE = path.join(LEGACY_DATA_DIR, 'ICRP-07.NDX');
