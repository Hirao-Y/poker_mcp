// POKER Web GUI のシェル画面
//
// 既存の画面（POKER の html：エディタ・3D 表示）を iframe に載せ、WinForms の GUI が WebView2 で
// していたことをここで行う（設計書 6.1）。
//   C# の ExecuteScriptAsync(js)          → iframe の contentWindow の関数を呼ぶ（setText、editor.getValue、eval など）
//   JS の window.chrome.webview.postMessage → 読み込み後に contentWindow.chrome.webview を差し込んで受け取る
// サーバ（poker-gui）とは同じオリジンの fetch だけでやり取りし、/api には起動ごとのトークンを付ける。
'use strict';

const $ = (id) => document.getElementById(id);
const state = {
  token: null, path: null, dirty: false, suppressChange: false,
  validateTimer: null, validateSeq: 0, job: null, pollTimer: null,
};

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
function setFileName() { $('fileName').textContent = state.path || '（新規）'; document.title = `POKER Web GUI - ${state.path || '新規'}`; }

// ---- 入力の検査（編集が止まって 0.8 秒後。WinForms の timer_CheckYaml と同じ考え方） ----
function onInputChanged() {
  if (state.suppressChange) return;
  setDirty(true);
  clearTimeout(state.validateTimer);
  setStatus('検査中…', 'busy');
  state.validateTimer = setTimeout(validateNow, 800);
}

async function validateNow() {
  const seq = ++state.validateSeq;
  try {
    const r = await api('POST', '/api/validate', { text: getText() });
    if (seq !== state.validateSeq) return;   // 古い結果は捨てる
    showIssues(r);
  } catch (e) {
    if (seq === state.validateSeq) setStatus(`検査できません: ${e.message}`, 'err');
  }
}

function showIssues(r) {
  const list = $('issues'); list.innerHTML = '';
  if (!r.result) { setStatus(`検査の結果を読めませんでした: ${(r.raw || '').slice(0, 200)}`, 'err'); return; }
  const issues = r.result.issues;
  const n = (s) => issues.filter(i => i.severity === s).length;
  const err = n('error'); const warn = n('warning');
  if (err) setStatus(`入力にエラー ${err} 件${warn ? `・警告 ${warn} 件` : ''}（行をクリックすると移動）`, 'err');
  else if (warn) setStatus(`入力に警告 ${warn} 件（計算はできます）`, 'warn');
  else setStatus('入力に問題はありません', 'ok');
  if (r.result.note) issues.push({ severity: 'info', message: r.result.note });
  for (const i of issues) {
    const li = document.createElement('li');
    li.className = i.severity;
    li.textContent = `${i.line ? `${i.line} 行: ` : ''}${i.message}${i.hint ? `（${i.hint}）` : ''}`;
    if (i.line) li.addEventListener('click', () => { const ed = inputWin().editor; ed.gotoLine(i.line, Math.max(0, (i.column || 1) - 1), true); ed.focus(); });
    list.appendChild(li);
  }
}

// ---- 3D 表示 ----
async function updateView() {
  setStatus('図を作っています…', 'busy');
  try {
    const r = await api('POST', '/api/geometry', { text: getText(), polygon: $('selPolygon').value });
    if (r.exitCode !== 0) { setStatus(`図を作れません: ${r.error}`, 'err'); return; }
    await frameReady($('frameView'), w => w.scene && typeof w.removeAll === 'function');
    viewWin().eval(r.js);   // WinForms の webView2_3D.ExecuteScriptAsync(js) と同じ
    selectTab('view');
    setStatus('図を更新しました', 'ok');
    validateNow();
  } catch (e) {
    setStatus(`図を作れません: ${e.message}`, 'err');
  }
}

// ---- ファイル ----
function confirmDiscard() { return !state.dirty || confirm('変更が保存されていません。破棄してよいですか？'); }

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
  setStatus(`保存しました: ${rel}`, 'ok');
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
      catch (e) { alert(`保存できません: ${e.message}`); resolve(false); }
    };
    dlg.showModal();
  });
}

async function showOpenDialog(dir = '') {
  const r = await api('GET', `/api/files?dir=${encodeURIComponent(dir)}`);
  $('openPath').textContent = `作業フォルダ/${r.dir}`;
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
    if (!confirm('計算の前に入力を保存します。よろしいですか？')) return;
    if (!(await save())) return;
  }
  try {
    const { id } = await api('POST', '/api/run', { path: state.path, mode });
    state.job = id;
    setRunning(true);
    setStatus(mode === 'trace' ? '透視線を追跡しています…' : '計算しています…', 'busy');
    poll();
  } catch (e) {
    setStatus(`計算を始められません: ${e.message}`, 'err');
  }
}

const STAGE = { path: '透視線', dose: '線量', output: '出力' };
async function poll() {
  if (!state.job) return;
  try {
    const j = await api('GET', `/api/jobs/${state.job}`);
    if (j.percent !== null) { $('progress').value = j.percent; $('progressText').textContent = `${STAGE[j.stage] || j.stage} ${j.percent}%`; }
    else $('progressText').textContent = '計算中';
    if (j.status === 'running') { state.pollTimer = setTimeout(poll, 500); return; }
    state.job = null; setRunning(false);
    if (j.status === 'done') { setStatus(`計算が終わりました（${j.summary}）`, 'ok'); await showSummary(j.summary); }
    else if (j.status === 'canceled') setStatus('計算を取り消しました', 'warn');
    else setStatus(`計算に失敗しました（終了コード ${j.exitCode}）: ${j.log.slice(-3).join(' / ')}`, 'err');
  } catch (e) {
    state.pollTimer = setTimeout(poll, 2000);
    setStatus(`状態を読めません: ${e.message}`, 'err');
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
  if (!state.token) { setStatus('トークンがありません。poker-gui が表示した URL を開き直してください。', 'err'); return; }
  let info;
  try { info = await api('GET', '/api/info'); }
  catch (e) { setStatus(`サーバに接続できません: ${e.message}`, 'err'); return; }

  const w = await frameReady($('frameInput'), w => w.editor && typeof w.setText === 'function');
  if (!w.chrome) w.chrome = {};
  w.chrome.webview = { postMessage: (msg) => { if (msg === 'changed') onInputChanged(); } };   // editor.html の notify の受け口
  w.editor.commands.addCommand({ name: 'pokerSave', bindKey: { win: 'Ctrl-S', mac: 'Command-S' }, exec: () => save().catch(e => alert(e.message)) });
  await frameReady($('frameOutput'), w => w.editor && typeof w.setText === 'function');
  setFont($('selFont').value);

  $('btnNew').onclick = () => { if (!confirmDiscard()) return; setText(''); state.path = null; setFileName(); setDirty(false); setStatus('新規'); $('issues').innerHTML = ''; };
  $('btnOpen').onclick = () => showOpenDialog().catch(e => alert(e.message));
  $('btnSave').onclick = () => save().catch(e => alert(`保存できません: ${e.message}`));
  $('btnSaveAs').onclick = () => saveAs();
  $('btnView').onclick = () => updateView();
  $('btnRunAll').onclick = () => run('all');
  $('btnRunTrace').onclick = () => run('trace');
  $('btnCancel').onclick = () => { if (state.job) api('POST', `/api/jobs/${state.job}/cancel`, {}).catch(() => {}); };
  $('selFont').onchange = () => setFont($('selFont').value);
  window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save().catch(err => alert(err.message)); } });
  window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

  setFileName();
  setStatus(`POKER ${info.version || ''}  作業フォルダ: ${info.workspace}${info.html ? '' : '（画面ファイルがありません）'}`, info.html ? '' : 'err');
}
init();
