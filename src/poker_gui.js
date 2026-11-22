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
//   端末への表示は、poker_cui のメッセージと同じく POKER_LANG・LC_ALL・LC_MESSAGES・LANG のうち最初に設定されているもの（無ければ、Windows ではシステムの言語）が ja で始まれば日本語、それ以外は英語。
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { createGuiServer } from './gui/server.js';
import { newToken } from './gui/security.js';
import { pokerInstallDir, pokerCuiInInstallDir, findOnPath, POKER_CUI_NAME } from './utils/paths.js';

const langEnv = process.env.POKER_LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG
  || (process.platform === 'win32' ? Intl.DateTimeFormat().resolvedOptions().locale : '') || '';
const JA = /^ja/i.test(langEnv);
const MSG = JA ? {
  noCui: (n) => `${n} が見つかりません（POKER_CUI_PATH か POKER_INSTALL_PATH を設定するか、PATH に加えてください）`,
  noHtml: (d) => `画面ファイルが見つかりません: ${d}（POKER の webgui_html フォルダ。POKER_GUI_HTML で指定できます）`,
  badPort: (v) => `POKER_GUI_PORT が不正です: ${v}`,
  ws: '  作業フォルダ: ', cui: '  poker_cui   : ', html: '  画面ファイル: ', url: '  URL         : ',
  note: '  （この URL は起動ごとに変わります。他の人に渡さないでください。止めるときは Ctrl+C）',
} : {
  noCui: (n) => `${n} not found (set POKER_CUI_PATH or POKER_INSTALL_PATH, or add it to PATH)`,
  noHtml: (d) => `screen files not found: ${d} (the webgui_html folder of POKER; can be set with POKER_GUI_HTML)`,
  badPort: (v) => `invalid POKER_GUI_PORT: ${v}`,
  ws: '  Workspace   : ', cui: '  poker_cui   : ', html: '  Screen files: ', url: '  URL         : ',
  note: '  (This URL changes every time. Do not give it to others. Press Ctrl+C to stop.)',
};

function fatal(msg) { console.error(`poker-gui: ${msg}`); process.exit(2); }

const wsArg = process.argv[2] || path.join(os.homedir(), 'poker_work');
fs.mkdirSync(wsArg, { recursive: true });
const workspace = fs.realpathSync(wsArg);

const cui = pokerCuiInInstallDir() || findOnPath(POKER_CUI_NAME);
if (!cui) fatal(MSG.noCui(POKER_CUI_NAME));

const htmlDir = path.resolve(process.env.POKER_GUI_HTML || path.join(pokerInstallDir(), 'webgui_html'));
if (!fs.existsSync(path.join(htmlDir, 'viewer3d', 'viewer3d.html'))) {
  fatal(MSG.noHtml(htmlDir));
}

let port = 0;
if (process.env.POKER_GUI_PORT) {
  port = Number(process.env.POKER_GUI_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fatal(MSG.badPort(process.env.POKER_GUI_PORT));
}

const token = newToken();
const server = createGuiServer({ token, workspace, htmlDir: fs.realpathSync(htmlDir), cui });
server.on('error', (e) => fatal(e.message));
server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/#token=${token}`;
  console.log('POKER Web GUI');
  console.log(MSG.ws + workspace);
  console.log(MSG.cui + cui);
  console.log(MSG.html + htmlDir);
  console.log(MSG.url + url);
  console.log(MSG.note);
  if (process.env.POKER_GUI_NO_BROWSER !== '1') {
    const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    try { spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref(); } catch { /* 開けなくても URL は表示済み */ }
  }
});
