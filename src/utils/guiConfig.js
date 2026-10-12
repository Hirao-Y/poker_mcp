// utils/guiConfig.js - POKER の GUI（poker_openGui）を登録するかどうか
//
// poker_openGui は POKER.exe（GUI）を、MCP サーバが動いている機械の画面に開く。
// 次のどれかに当たるときは、ツール一覧から外し、処理も登録しない。
//
//   1. POKER_MCP_GUI が 0 / false / no / off
//        リモート公開したサーバで使う。サーバに POKER が入っていても、GUI は
//        利用者の手元ではなくサーバの画面に開き、利用者からは見えないため。
//   2. Windows 以外で動いている（POKER.exe は Windows 専用）
//   3. POKER_INSTALL_PATH（既定 C:/Poker）に POKER.exe が無い
//
// 判定はサーバの起動時に 1 回だけ行う。後から POKER を入れた場合はサーバを再起動する。
// GUI を外しても、計算（POKER_CUI.exe）を使うツールには影響しない。

import fs from 'fs';
import path from 'path';

export function resolvePokerExePath() {
  const installPath = process.env.POKER_INSTALL_PATH || 'C:/Poker';
  return path.win32.join(installPath.replace(/\//g, '\\'), 'POKER.exe');
}

export function getGuiStatus() {
  const v = String(process.env.POKER_MCP_GUI ?? '').trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(v)) {
    return { enabled: false, reason: 'POKER_MCP_GUI=0 により無効' };
  }
  if (process.platform !== 'win32') {
    return { enabled: false, reason: `Windows 以外のため無効（${process.platform}）` };
  }
  const exe = resolvePokerExePath();
  if (!fs.existsSync(exe)) {
    return { enabled: false, reason: `POKER.exe が見つからないため無効: ${exe}` };
  }
  return { enabled: true, reason: `POKER.exe: ${exe}` };
}

export function isGuiEnabled() {
  return getGuiStatus().enabled;
}
