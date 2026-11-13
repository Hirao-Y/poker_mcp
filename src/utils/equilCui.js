// utils/equilCui.js - EquilibriumSheet_CUI（EquilibriumSheet のコマンドライン版）の呼び出し
//
// EquilibriumSheet_CUI.exe は POKER の付属ツール EquilibriumSheet の計算部分
// （崩壊系列・放射平衡・Bateman・放出データ）を JSON で返す。POKER と同じ LIB を読み、
// 暗号化された核データ（ICRP-07.NDX・ICRP-07.BET・REV_IC38.YLD）も読める
// （復号は同じフォルダの pklibio.dll）。
//
// 実行ファイルの場所（上から順に）:
//   1. 環境変数 EQUIL_CUI_PATH
//   2. POKER_INSTALL_PATH（既定 C:/Poker）の EquilibriumSheet_CUI.exe
//   3. PATH 上の EquilibriumSheet_CUI
// lib は POKER_INSTALL_PATH/LIB を --lib で渡す（poker_cui と同じデータを使うため）。
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { POKER_LIB_DIR } from './paths.js';

const TIMEOUT_MS = 60000;
// ChaCha20 で暗号化した lib ファイルの先頭（POKER の Obfuscator と同じ）
const CHACHA_MAGIC = Buffer.from([0x89, 0x50, 0x4B, 0x58, 0x0D, 0x0A, 0x1A, 0x0A]);

export function resolveEquilCui() {
  if (process.env.EQUIL_CUI_PATH) return process.env.EQUIL_CUI_PATH;
  const installPath = process.env.POKER_INSTALL_PATH || 'C:/Poker';
  const exe = path.join(installPath, 'EquilibriumSheet_CUI.exe');
  if (fs.existsSync(exe)) return exe;
  return 'EquilibriumSheet_CUI';
}

export function isEncryptedLibFile(buf) {
  return Buffer.isBuffer(buf) && buf.length >= CHACHA_MAGIC.length &&
    buf.subarray(0, CHACHA_MAGIC.length).equals(CHACHA_MAGIC);
}

export class EquilCuiError extends Error {
  constructor(message, { code, exitCode, stderr, hint } = {}) {
    super(message);
    this.name = 'EquilCuiError';
    this.code = code;
    this.exitCode = exitCode;
    this.stderr = stderr;
    this.hint = hint;
  }
}

/**
 * EquilibriumSheet_CUI を実行して JSON を返す。
 * 成功時は出力の result、失敗時は EquilCuiError（code は CUI のエラーコード）。
 * @param {string[]} args コマンドと引数（--lib・--compact は自動で付ける）
 * @param {{libDir?: string, timeoutMs?: number}} [opts]
 */
export function runEquilCui(args, { libDir = POKER_LIB_DIR, timeoutMs = TIMEOUT_MS } = {}) {
  const exe = resolveEquilCui();
  const fullArgs = [...args, '--lib', libDir, '--compact'];
  return new Promise((resolve, reject) => {
    let child;
    try {
      // shell は使わない（空白を含むパス・引数をそのまま渡すため）
      child = spawn(exe, fullArgs, { windowsHide: true, shell: false });
    } catch (e) {
      reject(new EquilCuiError(`EquilibriumSheet_CUI を起動できません: ${e.message}`, { code: 'EQUIL_CUI_NOT_AVAILABLE' }));
      return;
    }
    let out = '', err = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new EquilCuiError(`EquilibriumSheet_CUI が ${timeoutMs} ms で終わりませんでした`, { code: 'EQUIL_CUI_TIMEOUT' }));
    }, timeoutMs);
    child.stdout.on('data', (d) => { out += d.toString('utf8'); });
    child.stderr.on('data', (d) => { err += d.toString('utf8'); });
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new EquilCuiError(`EquilibriumSheet_CUI を起動できません（${exe}）: ${e.message}`, {
        code: 'EQUIL_CUI_NOT_AVAILABLE',
        hint: 'POKER_INSTALL_PATH に EquilibriumSheet_CUI.exe があるか、環境変数 EQUIL_CUI_PATH を確認してください'
      }));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      let json;
      try {
        json = JSON.parse(out);
      } catch {
        reject(new EquilCuiError(`EquilibriumSheet_CUI の出力が JSON として読めません（終了コード ${code}）`, {
          code: 'EQUIL_CUI_BAD_OUTPUT', exitCode: code, stderr: err.trim() || out.slice(0, 200)
        }));
        return;
      }
      if (json.error) {
        reject(new EquilCuiError(json.error.message, { code: json.error.code, exitCode: code }));
        return;
      }
      resolve({ result: json.result, warnings: json.warnings || [], version: json.version });
    });
  });
}
