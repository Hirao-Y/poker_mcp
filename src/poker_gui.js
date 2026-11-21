#!/usr/bin/env node
// poker_gui.js - POKER の Web GUI（ブラウザで使う画面）を起動する
//
// 使い方: poker-gui [作業フォルダ]      （既定 ~/poker_work。無ければ作る）
//   127.0.0.1 の空いているポートで待ち受け、起動ごとの合い言葉（トークン）付きの URL を表示してブラウザを開く。
//   ブラウザを開かないときは POKER_GUI_NO_BROWSER=1。ポートを決めたいときは POKER_GUI_PORT。
//   poker_cui と lib の場所は poker-mcp と同じ規則（POKER_CUI_PATH、POKER_INSTALL_PATH、PATH 上の poker_cui）。
//   画面ファイルは既定でインストール先の webgui_html（Web GUI 用。Windows 版の GUI の html とは別）。
//   POKER_GUI_HTML で別の場所を指定できる。
//   止めるときは Ctrl+C。
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { createGuiServer } from './gui/server.js';
import { newToken } from './gui/security.js';
import { pokerInstallDir, pokerCuiInInstallDir, findOnPath, POKER_CUI_NAME } from './utils/paths.js';

function fatal(msg) { console.error(`poker-gui: ${msg}`); process.exit(2); }

const wsArg = process.argv[2] || path.join(os.homedir(), 'poker_work');
fs.mkdirSync(wsArg, { recursive: true });
const workspace = fs.realpathSync(wsArg);

const cui = pokerCuiInInstallDir() || findOnPath(POKER_CUI_NAME);
if (!cui) fatal(`${POKER_CUI_NAME} が見つかりません（POKER_CUI_PATH か POKER_INSTALL_PATH を設定するか、PATH に加えてください）`);

const htmlDir = path.resolve(process.env.POKER_GUI_HTML || path.join(pokerInstallDir(), 'webgui_html'));
if (!fs.existsSync(path.join(htmlDir, 'viewer3d', 'viewer3d.html'))) {
  fatal(`画面ファイルが見つかりません: ${htmlDir}（POKER の webgui_html フォルダ。POKER_GUI_HTML で指定できます）`);
}

let port = 0;
if (process.env.POKER_GUI_PORT) {
  port = Number(process.env.POKER_GUI_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fatal(`POKER_GUI_PORT が不正です: ${process.env.POKER_GUI_PORT}`);
}

const token = newToken();
const server = createGuiServer({ token, workspace, htmlDir: fs.realpathSync(htmlDir), cui });
server.on('error', (e) => fatal(e.message));
server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/#token=${token}`;
  console.log('POKER Web GUI');
  console.log(`  作業フォルダ: ${workspace}`);
  console.log(`  poker_cui   : ${cui}`);
  console.log(`  画面ファイル: ${htmlDir}`);
  console.log(`  URL         : ${url}`);
  console.log('  （この URL は起動ごとに変わります。他の人に渡さないでください。止めるときは Ctrl+C）');
  if (process.env.POKER_GUI_NO_BROWSER !== '1') {
    const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    try { spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref(); } catch { /* 開けなくても URL は表示済み */ }
  }
});
