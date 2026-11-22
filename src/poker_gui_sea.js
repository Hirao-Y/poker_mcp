// poker_gui_sea.js - POKER の Web GUI を 1 ファイルの実行ファイル（Node の Single Executable Application）にするときの入口
//
// ふだんは poker_gui.js を直接動かす。この入口は、esbuild で 1 つの CommonJS にまとめ、Node SEA の実行ファイルに埋めて使う
// （作り方は POKER 側の webgui_dev\phase4）。Node の入っていない Linux でも動く。
//   - シェル画面のファイル（public/）は実行ファイルに埋めた assets から読む（public/manifest.json が名前の一覧）
//   - POKER のインストール先は、指定が無ければ実行ファイルのあるフォルダ（配布の zip は poker_cui・lib・webgui_html と同じ所に置く）
//   - 使い方は poker_gui.js と同じ（poker-gui [作業フォルダ]）
import fs from 'fs';
import path from 'path';
import sea from 'node:sea';

const exeDir = path.dirname(process.execPath);
if (!process.env.POKER_INSTALL_PATH && !process.env.POKER_CUI_PATH && fs.existsSync(path.join(exeDir, 'poker_cui'))) {
  process.env.POKER_INSTALL_PATH = exeDir;
}
if (sea.isSea()) {
  const names = JSON.parse(sea.getAsset('public/manifest.json', 'utf8'));
  globalThis.__POKER_GUI_PUBLIC = new Map(names.map(n => [n, Buffer.from(sea.getAsset('public/' + n))]));
}
// 上の設定の後に読み込む（server.js・utils/paths.js は読み込んだときに設定を見る）
import('./poker_gui.js');
