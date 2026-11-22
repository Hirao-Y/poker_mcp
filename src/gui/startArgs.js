// startArgs.js - poker-gui の引数を解釈する（2.3.3 の後、2026-11-23）
//   引数なし      → 既定の作業フォルダ（無ければ作る）
//   フォルダ      → そのフォルダ（無ければ作る）
//   入力ファイル  → そのファイルのフォルダを作業フォルダにし、そのファイルを開く（.yaml / .yml だけ）
//   起動の後で作業フォルダを変える機能は作らない（画面から触れる範囲を広げないため）。
import fs from 'fs';
import path from 'path';

const isYaml = (p) => /\.ya?ml$/i.test(p);
const fail = (code, arg) => Object.assign(new Error(`${code}: ${arg}`), { code, arg });

/**
 * @param {string|undefined} arg 最初の引数
 * @param {string} defaultDir 既定の作業フォルダ
 * @returns {{workspace: string, open: string|null}} workspace は実パス、open は作業フォルダからの相対（ファイル名）
 * 失敗：code が NOT_YAML（.yaml 以外のファイル）、NO_FILE（無い .yaml）、NOT_DIR（フォルダでもファイルでもない）の Error
 */
export function resolveStartArg(arg, defaultDir) {
  const dir = arg || defaultDir;
  let st = null;
  try { st = fs.statSync(dir); } catch { /* 無い */ }
  if (st && st.isFile()) {
    if (!isYaml(dir)) throw fail('NOT_YAML', dir);
    const abs = fs.realpathSync(dir);
    return { workspace: path.dirname(abs), open: path.basename(abs) };
  }
  if (!st && arg && isYaml(arg)) throw fail('NO_FILE', arg);
  if (st && !st.isDirectory()) throw fail('NOT_DIR', dir);
  fs.mkdirSync(dir, { recursive: true });
  return { workspace: fs.realpathSync(dir), open: null };
}
