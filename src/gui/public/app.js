// POKER Web GUI のシェル画面
//
// Web GUI 用の画面（POKER の webgui_html：エディタ・3D 表示）を iframe に載せ、WinForms の GUI が WebView2 で
// していたことをここで行う（設計書 6.1）。
//   C# の ExecuteScriptAsync(js)          → iframe の contentWindow の関数を呼ぶ（setText、editor.getValue、eval など）
//   JS の window.chrome.webview.postMessage → 読み込み後に contentWindow.chrome.webview を差し込んで受け取る
// サーバ（poker-gui）とは同じオリジンの fetch だけでやり取りし、/api には起動ごとのトークンを付ける。
// 表示名は最新の POKER GUI（Form_MainWindow の resx）に合わせる。ブラウザの言語が日本語なら日本語、それ以外は英語。
'use strict';

const LANG = /^ja\b/i.test(navigator.language || '') ? 'ja' : 'en';
const TEXT = {
  ja: {
    new: '新規作成', open: '開く', save: '上書き保存', saveAs: '名前を付けて保存', redraw: '図の更新',
    auto: '自動', autoTitle: '入力を開いたとき・保存したときに図を更新する', polygonTitle: 'ポリゴン数',
    polyHigh: '高', polyMiddle: '中', polyLow: '低',
    doseCalc: '線量計算', rayPath: '透視線のみ', abort: '中止', fontTitle: 'フォントサイズ',
    input: '入力', tab3d: '3D', tabOutput: '出力', newFile: '（新規）',
    openTitle: '作業フォルダから開く', close: '閉じる', cancel: 'キャンセル', saveAsHint: '作業フォルダからの相対パス（.yaml）',
    stage_path: '透視線計算', stage_dose: '線量計算', stage_output: '出力', calculating: '計算中',
    s_preparing: '準備中…', s_noToken: 'トークンがありません。poker-gui が表示した URL を開き直してください。',
    s_noServer: 'サーバに接続できません: {0}', s_ready: 'POKER {0}  作業フォルダ: {1}', s_noHtml: '（画面ファイルがありません）',
    s_checking: '検査中…', s_cantCheck: '検査できません: {0}', s_cantParse: '検査の結果を読めませんでした: {0}',
    s_errors: '入力にエラー {0} 件{1}（行をクリックすると移動）', s_andWarn: '・警告 {0} 件', s_warns: '入力に警告 {0} 件（計算はできます）',
    s_ok: '入力に問題はありません', s_drawing: '図を作っています…', s_cantDraw: '図を作れません: {0}', s_drawn: '図を更新しました',
    s_saved: '保存しました: {0}', s_cantSave: '保存できません: {0}', s_new: '新規',
    s_running: '線量を計算しています…', s_tracing: '透視線を追跡しています…', s_cantRun: '計算を始められません: {0}',
    s_done: '計算が終わりました（{0}）', s_aborted: '計算を中止しました', s_failed: '計算に失敗しました（終了コード {0}）: {1}',
    s_cantPoll: '状態を読めません: {0}', lineAt: '{0} 行: ',
    q_discard: '変更が保存されていません。破棄してよいですか？', q_saveBeforeRun: '計算の前に入力を保存します。よろしいですか？',
    sev_error: 'エラー', sev_warning: '警告', sev_info: '情報',
  },
  en: {
    new: 'New', open: 'Open...', save: 'Save', saveAs: 'Save As...', redraw: 'Redraw',
    auto: 'Auto', autoTitle: 'Redraw when an input is opened or saved', polygonTitle: 'Polygons',
    polyHigh: 'High', polyMiddle: 'Medium', polyLow: 'Low',
    doseCalc: 'Dose calc.', rayPath: 'Ray path', abort: 'Abort', fontTitle: 'Font size',
    input: 'Input', tab3d: '3D', tabOutput: 'Output', newFile: '(new)',
    openTitle: 'Open from the workspace', close: 'Close', cancel: 'Cancel', saveAsHint: 'Path relative to the workspace (.yaml)',
    stage_path: 'Penetrating', stage_dose: 'Calculating', stage_output: 'Printing', calculating: 'Calculating',
    s_preparing: 'Preparing...', s_noToken: 'No token. Open the URL shown by poker-gui again.',
    s_noServer: 'Cannot connect to the server: {0}', s_ready: 'POKER {0}  Workspace: {1}', s_noHtml: ' (screen files not found)',
    s_checking: 'Checking...', s_cantCheck: 'Cannot check the input: {0}', s_cantParse: 'Cannot read the check result: {0}',
    s_errors: '{0} error(s){1} in the input (click a line to jump)', s_andWarn: ', {0} warning(s)', s_warns: '{0} warning(s) in the input (it can be calculated)',
    s_ok: 'No problem in the input', s_drawing: 'Drawing...', s_cantDraw: 'Cannot draw: {0}', s_drawn: 'Redrawn',
    s_saved: 'Saved: {0}', s_cantSave: 'Cannot save: {0}', s_new: 'New',
    s_running: 'Calculating doses...', s_tracing: 'Tracing ray paths...', s_cantRun: 'Cannot start the calculation: {0}',
    s_done: 'Calculation finished ({0})', s_aborted: 'Calculation aborted', s_failed: 'Calculation failed (exit code {0}): {1}',
    s_cantPoll: 'Cannot read the status: {0}', lineAt: 'line {0}: ',
    q_discard: 'The changes are not saved. Discard them?', q_saveBeforeRun: 'The input will be saved before the calculation. OK?',
    sev_error: 'Error', sev_warning: 'Warning', sev_info: 'Info',
  },
};
const t = (key, ...args) => String(TEXT[LANG][key] ?? TEXT.en[key] ?? key).replace(/\{(\d)\}/g, (_, i) => args[Number(i)] ?? '');

const $ = (id) => document.getElementById(id);
const state = {
  token: null, path: null, dirty: false, suppressChange: false,
  validateTimer: null, validateSeq: 0, job: null, pollTimer: null,
};

// ---- 表示名 ----
(function applyText() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); });
  document.querySelectorAll('[data-t-title]').forEach(e => { e.title = t(e.dataset.tTitle); });
  document.documentElement.style.setProperty('--sev-error', `"${t('sev_error')} "`);
  document.documentElement.style.setProperty('--sev-warning', `"${t('sev_warning')} "`);
  document.documentElement.style.setProperty('--sev-info', `"${t('sev_info')} "`);
})();

// ---- トークン（URL の # の後ろ → sessionStorage。URL からは消す） ----
(function takeToken() {
  const m = /token=([0-9a-f]{64})/.exec(location.hash);
  if (m) {
    sessionStorage.setItem('pokerGuiToken', m[1]);
    history.replaceState(null, '', location.pathname);
  }
  state.token = sessionStorage.getItem('pokerGuiToken');
})();

async function api(method, url, body, { raw = false } = {}) {
  const headers = { Authorization: `Bearer ${state.token}` };
  let payload;
  if (body !== undefined) {
    if (typeof body === 'string') { payload = body; headers['Content-Type'] = 'text/plain; charset=utf-8'; }
    else { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  }
  const res = await fetch(url, { method, headers, body: payload, cache: 'no-store' });
  if (!res.ok) {
    let msg = `${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* 本文なし */ }
    throw new Error(msg);
  }
  return raw ? res.text() : res.json();
}

// ---- iframe の準備 ----
function frameReady(frame, test) {
  return new Promise((resolve) => {
    const check = () => { try { if (test(frame.contentWindow)) return resolve(frame.contentWindow); } catch { /* 読み込み中 */ } setTimeout(check, 50); };
    check();
  });
}
const inputWin = () => $('frameInput').contentWindow;
const outputWin = () => $('frameOutput').contentWindow;
const viewWin = () => $('frameView').contentWindow;

function getText() { return inputWin().editor.getValue(); }
function setText(text) {
  state.suppressChange = true;
  try { inputWin().setText(text); inputWin().editor.clearSelection(); inputWin().editor.gotoLine(1, 0, false); }
  finally { state.suppressChange = false; }
}

// ---- 状態表示 ----
function setStatus(text, cls = '') { const s = $('status'); s.textContent = text; s.className = `status ${cls}`; }
function setDirty(d) { state.dirty = d; $('dirty').textContent = d ? '●' : ''; }
function setFileName() { $('fileName').textContent = state.path || t('newFile'); document.title = `POKER Web GUI - ${state.path || t('newFile')}`; }

// ---- 入力の検査（編集が止まって 0.8 秒後。WinForms の timer_CheckYaml と同じ考え方） ----
function onInputChanged() {
  if (state.suppressChange) return;
  setDirty(true);
  clearTimeout(state.validateTimer);
  setStatus(t('s_checking'), 'busy');
  state.validateTimer = setTimeout(validateNow, 800);
}

async function validateNow() {
  const seq = ++state.validateSeq;
  try {
    const r = await api('POST', '/api/validate', { text: getText(), lang: LANG });
    if (seq !== state.validateSeq) return;   // 古い結果は捨てる
    showIssues(r);
  } catch (e) {
    if (seq === state.validateSeq) setStatus(t('s_cantCheck', e.message), 'err');
  }
}

function showIssues(r) {
  const list = $('issues'); list.innerHTML = '';
  if (!r.result) { setStatus(t('s_cantParse', (r.raw || '').slice(0, 200)), 'err'); return; }
  const issues = r.result.issues;
  const n = (s) => issues.filter(i => i.severity === s).length;
  const err = n('error'); const warn = n('warning');
  if (err) setStatus(t('s_errors', err, warn ? t('s_andWarn', warn) : ''), 'err');
  else if (warn) setStatus(t('s_warns', warn), 'warn');
  else setStatus(t('s_ok'), 'ok');
  if (r.result.note) issues.push({ severity: 'info', message: r.result.note });
  for (const i of issues) {
    const li = document.createElement('li');
    li.className = i.severity;
    li.textContent = `${i.line ? t('lineAt', i.line) : ''}${i.message}${i.hint ? `（${i.hint}）` : ''}`;
    if (i.line) li.addEventListener('click', () => { const ed = inputWin().editor; ed.gotoLine(i.line, Math.max(0, (i.column || 1) - 1), true); ed.focus(); });
    list.appendChild(li);
  }
}

// ---- 3D 表示 ----
async function updateView() {
  setStatus(t('s_drawing'), 'busy');
  try {
    const r = await api('POST', '/api/geometry', { text: getText(), polygon: $('selPolygon').value, lang: LANG });
    if (r.exitCode !== 0) { setStatus(t('s_cantDraw', r.error), 'err'); return; }
    await frameReady($('frameView'), w => w.scene && typeof w.removeAll === 'function');
    viewWin().eval(r.js);   // WinForms の webView2_3D.ExecuteScriptAsync(js) と同じ
    selectTab('view');
    setStatus(t('s_drawn'), 'ok');
    validateNow();
  } catch (e) {
    setStatus(t('s_cantDraw', e.message), 'err');
  }
}

// ---- ファイル ----
function confirmDiscard() { return !state.dirty || confirm(t('q_discard')); }

async function openFile(rel) {
  if (!confirmDiscard()) return;
  const text = await api('GET', `/api/file?path=${encodeURIComponent(rel)}`, undefined, { raw: true });
  setText(text);
  state.path = rel; setFileName(); setDirty(false);
  await validateNow();
  if ($('chkAutoView').checked) updateView();
}

async function save(rel = state.path) {
  if (!rel) return saveAs();
  await api('PUT', `/api/file?path=${encodeURIComponent(rel)}`, getText());
  state.path = rel; setFileName(); setDirty(false);
  setStatus(t('s_saved', rel), 'ok');
  if ($('chkAutoView').checked) updateView();
  return true;
}

function saveAs() {
  return new Promise((resolve) => {
    const dlg = $('dlgSaveAs');
    $('saveAsName').value = state.path || 'new.yaml';
    dlg.onclose = async () => {
      if (dlg.returnValue !== 'ok') return resolve(false);
      try { resolve(await save($('saveAsName').value.trim())); }
      catch (e) { alert(t('s_cantSave', e.message)); resolve(false); }
    };
    dlg.showModal();
  });
}

async function showOpenDialog(dir = '') {
  const r = await api('GET', `/api/files?dir=${encodeURIComponent(dir)}`);
  $('openPath').textContent = `/${r.dir}`;
  const list = $('openList'); list.innerHTML = '';
  const add = (label, cls, onClick) => { const li = document.createElement('li'); li.textContent = label; li.className = cls; li.addEventListener('click', onClick); list.appendChild(li); };
  if (r.dir) add('..', 'dir', () => showOpenDialog(r.dir.split('/').slice(0, -1).join('/')));
  for (const e of r.entries) {
    const rel = r.dir ? `${r.dir}/${e.name}` : e.name;
    if (e.dir) add(e.name, 'dir', () => showOpenDialog(rel));
    else if (/\.(ya?ml)$/i.test(e.name)) add(e.name, 'file', () => { $('dlgOpen').close(); openFile(rel).catch(err => alert(err.message)); });
    else if (/\.summary$/i.test(e.name)) add(e.name, 'file', () => { $('dlgOpen').close(); showSummary(rel).catch(err => alert(err.message)); });
  }
  if (!$('dlgOpen').open) $('dlgOpen').showModal();
}

// ---- 出力（サマリー） ----
async function showSummary(rel) {
  const text = await api('GET', `/api/file?path=${encodeURIComponent(rel)}`, undefined, { raw: true });
  const w = await frameReady($('frameOutput'), w => w.editor && typeof w.setText === 'function');
  w.setText(text); w.editor.setReadOnly(true); w.editor.clearSelection(); w.editor.gotoLine(1, 0, false);
  selectTab('output');
}

// ---- 計算 ----
async function run(mode) {
  if (state.job) return;
  if (!state.path || state.dirty) {
    if (!confirm(t('q_saveBeforeRun'))) return;
    if (!(await save())) return;
  }
  try {
    const { id } = await api('POST', '/api/run', { path: state.path, mode, lang: LANG });
    state.job = id;
    setRunning(true);
    setStatus(mode === 'trace' ? t('s_tracing') : t('s_running'), 'busy');
    poll();
  } catch (e) {
    setStatus(t('s_cantRun', e.message), 'err');
  }
}

async function poll() {
  if (!state.job) return;
  try {
    const j = await api('GET', `/api/jobs/${state.job}`);
    if (j.percent !== null) { $('progress').value = j.percent; $('progressText').textContent = `${t('stage_' + j.stage)} ${j.percent}%`; }
    else $('progressText').textContent = t('calculating');
    if (j.status === 'running') { state.pollTimer = setTimeout(poll, 500); return; }
    state.job = null; setRunning(false);
    if (j.status === 'done') { setStatus(t('s_done', j.summary), 'ok'); await showSummary(j.summary); }
    else if (j.status === 'canceled') setStatus(t('s_aborted'), 'warn');
    else setStatus(t('s_failed', j.exitCode, j.log.slice(-3).join(' / ')), 'err');
  } catch (e) {
    state.pollTimer = setTimeout(poll, 2000);
    setStatus(t('s_cantPoll', e.message), 'err');
  }
}

function setRunning(on) {
  $('btnRunAll').disabled = on; $('btnRunTrace').disabled = on; $('btnCancel').disabled = !on;
  $('progress').hidden = !on; if (on) { $('progress').value = 0; $('progressText').textContent = ''; } else $('progressText').textContent = '';
}

// ---- タブ・分割・文字の大きさ ----
function selectTab(name) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tabPane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.tab)));

(function splitter() {
  const sp = $('splitter'); let drag = false;
  sp.addEventListener('mousedown', (e) => { drag = true; e.preventDefault(); document.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = 'none'; }); });
  window.addEventListener('mousemove', (e) => { if (drag) $('left').style.width = `${Math.max(200, Math.min(window.innerWidth - 200, e.clientX))}px`; });
  window.addEventListener('mouseup', () => { if (!drag) return; drag = false; document.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = ''; }); });
})();

function setFont(size) {
  for (const w of [inputWin(), outputWin()]) { try { w.setFontSize(Number(size)); } catch { /* 読み込み中 */ } }
}

// ---- 起動 ----
async function init() {
  setStatus(t('s_preparing'));
  if (!state.token) { setStatus(t('s_noToken'), 'err'); return; }
  let info;
  try { info = await api('GET', '/api/info'); }
  catch (e) { setStatus(t('s_noServer', e.message), 'err'); return; }

  const w = await frameReady($('frameInput'), w => w.editor && typeof w.setText === 'function');
  if (!w.chrome) w.chrome = {};
  w.chrome.webview = { postMessage: (msg) => { if (msg === 'changed') onInputChanged(); } };   // editor.html の notify の受け口
  w.editor.commands.addCommand({ name: 'pokerSave', bindKey: { win: 'Ctrl-S', mac: 'Command-S' }, exec: () => save().catch(e => alert(e.message)) });
  await frameReady($('frameOutput'), w => w.editor && typeof w.setText === 'function');
  setFont($('selFont').value);

  $('btnNew').onclick = () => { if (!confirmDiscard()) return; setText(''); state.path = null; setFileName(); setDirty(false); setStatus(t('s_new')); $('issues').innerHTML = ''; };
  $('btnOpen').onclick = () => showOpenDialog().catch(e => alert(e.message));
  $('btnSave').onclick = () => save().catch(e => alert(t('s_cantSave', e.message)));
  $('btnSaveAs').onclick = () => saveAs();
  $('btnView').onclick = () => updateView();
  $('btnRunAll').onclick = () => run('all');
  $('btnRunTrace').onclick = () => run('trace');
  $('btnCancel').onclick = () => { if (state.job) api('POST', `/api/jobs/${state.job}/cancel`, {}).catch(() => {}); };
  $('selFont').onchange = () => setFont($('selFont').value);
  window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save().catch(err => alert(err.message)); } });
  window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

  setFileName();
  setStatus(t('s_ready', info.version || '', info.workspace) + (info.html ? '' : t('s_noHtml')), info.html ? '' : 'err');
}
init();
