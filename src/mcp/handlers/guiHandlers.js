// mcp/handlers/guiHandlers.js
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { TASKS_DIR, YAML_FILE } from '../../utils/paths.js';

/**
 * POKER.exe のファイルバージョンを取得する（Windows専用）
 *
 * POKER 2.1.1 以降は二重起動時に入力ファイルパスを既存インスタンスへ
 * 転送するため、起動中でもそのまま spawn してよい。
 * 2.1.0 以前は転送機能がなく、メッセージボックスを出して終了する。
 *
 * @returns {Promise<string|null>} "2.1.1.1" 形式。取得できなければ null
 */
async function getPokerFileVersion(exePath) {
  if (process.platform !== 'win32') return null;

  return new Promise(resolve => {
    try {
      const ps = spawn('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        `try { [System.Diagnostics.FileVersionInfo]::GetVersionInfo('${exePath.replace(/'/g, "''")}').FileVersion } catch { '' }`
      ], { windowsHide: true });

      let out = '';
      ps.stdout.on('data', d => { out += d.toString(); });
      ps.on('error', () => resolve(null));
      ps.on('close', () => {
        const v = out.trim();
        resolve(/^\d+(\.\d+)*$/.test(v) ? v : null);
      });
      setTimeout(() => resolve(null), 5000);
    } catch {
      resolve(null);
    }
  });
}

/** "2.1.1.1" >= "2.1.1" を判定する */
function isVersionAtLeast(version, minimum) {
  if (!version) return false;
  const a = version.split('.').map(Number);
  const b = minimum.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return true;
}

/** 入力転送に対応する最小バージョン */
const FORWARDING_MIN_VERSION = '2.1.1';

/**
 * POKER.exe が既に起動しているかを調べる（Windows専用）
 *
 * @returns {Promise<{detected: boolean, pids: number[]}>}
 */
async function isPokerRunning() {
  if (process.platform !== 'win32') return { detected: false, pids: [] };

  return new Promise(resolve => {
    try {
      const p = spawn('tasklist', ['/FI', 'IMAGENAME eq POKER.exe', '/FO', 'CSV', '/NH'], {
        windowsHide: true
      });
      let out = '';
      p.stdout.on('data', d => { out += d.toString(); });
      p.on('error', () => resolve({ detected: false, pids: [] }));
      p.on('close', () => {
        // 該当なしの場合 tasklist は「情報: ...」等を返す
        const pids = [];
        for (const line of out.split(/\r?\n/)) {
          const m = line.match(/^"POKER\.exe","(\d+)"/i);
          if (m) pids.push(Number(m[1]));
        }
        resolve({ detected: pids.length > 0, pids });
      });
      setTimeout(() => resolve({ detected: false, pids: [] }), 3000);
    } catch {
      resolve({ detected: false, pids: [] });
    }
  });
}

/**
 * POKER.exe のパスを解決する
 * POKER_INSTALL_PATH 環境変数（デフォルト: C:/Poker）配下の POKER.exe を参照
 */
function resolvePokerExePath() {
  const installPath = process.env.POKER_INSTALL_PATH || 'C:/Poker';
  return path.win32.join(installPath.replace(/\//g, '\\'), 'POKER.exe');
}

/**
 * yaml_file 引数を絶対パスに解決する
 * ファイル名のみ → TASKS_DIR と結合
 * 絶対パス      → そのまま使用（後方互換）
 */
function resolveYamlPath(yamlFile) {
  const absolutePathPattern = /^([a-zA-Z]:[\\\/]|\/)/;
  return absolutePathPattern.test(yamlFile)
    ? yamlFile
    : path.join(TASKS_DIR, yamlFile);
}

export function createGuiHandlers(taskManager) {
  return {
    async openGui(args) {
      const yamlFile      = args?.yaml_file || 'poker.yaml';
      const resolvedYaml  = resolveYamlPath(yamlFile);
      const pokerExePath  = resolvePokerExePath();

      logger.info('poker_openGui: 開始', {
        input:      yamlFile,
        resolvedYaml,
        pokerExePath
      });

      // ── Step 1: applyChanges を自動実行 ──────────────────────────
      let applyResult;
      try {
        applyResult = await taskManager.applyChanges();
        logger.info('poker_openGui: applyChanges 完了', { result: applyResult });
      } catch (applyError) {
        logger.error('poker_openGui: applyChanges 失敗', { error: applyError.message });
        return {
          success: false,
          error:      `変更の保存に失敗しました: ${applyError.message}`,
          error_type: 'APPLY_CHANGES_FAILED',
          suggestion: 'poker_applyChanges を手動で実行してエラー内容を確認してください。'
        };
      }

      // ── Step 2: POKER.exe の存在確認 ─────────────────────────────
      try {
        await fs.access(pokerExePath);
      } catch {
        logger.error('poker_openGui: POKER.exe が見つかりません', { pokerExePath });
        return {
          success:    false,
          error:      `POKER.exe が見つかりません: ${pokerExePath}`,
          error_type: 'POKER_EXE_NOT_FOUND',
          suggestion: 'POKER_INSTALL_PATH 環境変数を正しいインストールディレクトリに設定してください。'
            + '\n例: "POKER_INSTALL_PATH": "C:\\\\Program Files\\\\POKER"'
        };
      }

      // ── Step 3: 入力 YAML の存在確認 ─────────────────────────────
      try {
        await fs.access(resolvedYaml);
      } catch {
        logger.error('poker_openGui: YAML ファイルが見つかりません', { resolvedYaml });
        return {
          success:    false,
          error:      `入力ファイルが見つかりません: ${resolvedYaml}`,
          error_type: 'YAML_FILE_NOT_FOUND',
          suggestion: 'poker_applyChanges を先に実行してください。'
        };
      }

      // ── Step 3.5: 多重起動の扱い ────────────────────────────────
      //
      // POKER 2.1.1 以降は、起動中に別の入力で spawn すると、2つ目の
      // プロセスがパスを既存インスタンスへ転送して終了する（表示が切替わる）。
      // 2.1.0 以前は転送機能がなく、メッセージボックスを出して終了するため、
      // 呼び出し側には「成功したのに表示が変わらない」と見える。
      // そこでバージョンで分岐する。
      const pokerVersion = await getPokerFileVersion(pokerExePath);
      const supportsForwarding = isVersionAtLeast(pokerVersion, FORWARDING_MIN_VERSION);
      const running = await isPokerRunning();

      if (running.detected && !supportsForwarding) {
        logger.warn('poker_openGui: 起動中かつ転送非対応版', {
          pids: running.pids, version: pokerVersion
        });
        return {
          success:    false,
          error:      'POKER.exe は既に起動しています。この版は二重起動時の入力転送に対応していません。',
          error_type: 'POKER_ALREADY_RUNNING',
          running_pids: running.pids,
          poker_version: pokerVersion ?? '(取得不可)',
          suggestion: `別の入力を表示するには、先に起動中の POKER ウィンドウを閉じてください。`
            + `\nPOKER ${FORWARDING_MIN_VERSION} 以降に更新すると、閉じずに切り替えられます。`
        };
      }

      const forwarding = running.detected && supportsForwarding;

      // ── Step 4: POKER.exe をデタッチ起動 ─────────────────────────
      try {
        const child = spawn(pokerExePath, [resolvedYaml], {
          detached: true,
          stdio:    'ignore',   // MCPサーバーの stdio を汚染しない
          shell:    false
        });

        // 起動直後に終了していないかを確認してから成功を報告する。
        // spawn の成功はプロセス生成の成功でしかなく、GUI が実際に
        // 表示されたことを意味しない。
        //
        // ただし転送時（既存インスタンスあり・2.1.1以降）は、2つ目の
        // プロセスがパスを送って即座に終了するのが正常動作である。
        const died = await new Promise(resolve => {
          const timer = setTimeout(() => resolve(null), 1500);
          child.once('exit', code => { clearTimeout(timer); resolve(code ?? -1); });
          child.once('error', () => { clearTimeout(timer); resolve(-1); });
        });

        if (died !== null && !(forwarding && died === 0)) {
          logger.error('poker_openGui: POKER.exe が起動直後に終了', {
            exitCode: died, executable: pokerExePath, inputFile: resolvedYaml, forwarding
          });
          return {
            success:    false,
            error:      `POKER.exe が起動直後に終了しました (exit=${died})`,
            error_type: 'POKER_EXITED_IMMEDIATELY',
            input_file: resolvedYaml,
            suggestion: '入力ファイルが POKER で読める形式か確認してください。'
          };
        }

        if (forwarding) {
          logger.info('poker_openGui: 既存インスタンスへ入力を転送', {
            executable: pokerExePath, inputFile: resolvedYaml,
            targetPids: running.pids, version: pokerVersion
          });
          return {
            success: true,
            message: '起動中の POKER に入力を転送しました。',
            forwarded: true,
            launched: {
              executable:  pokerExePath,
              input_file:  resolvedYaml,
              target_pids: running.pids
            },
            poker_version: pokerVersion,
            note: '転送の送信までを確認しています。読み込みに失敗した場合は'
                + ' POKER のウィンドウにエラーが表示されます。'
                + '\n未保存の編集があるときは POKER 側で保存確認が出ます'
                + '（キャンセルすると切り替わりません）。'
          };
        }

        child.unref();          // MCPサーバーが POKER.exe の終了を待たない

        logger.info('poker_openGui: POKER.exe 起動成功', {
          pid:        child.pid,
          executable: pokerExePath,
          inputFile:  resolvedYaml
        });

        return {
          success: true,
          message: 'POKER GUI を起動しました。',
          launched: {
            executable: pokerExePath,
            input_file: resolvedYaml,
            pid:        child.pid
          },
          auto_saved: {
            performed: true,
            details:   applyResult
          }
        };

      } catch (launchError) {
        logger.error('poker_openGui: POKER.exe 起動失敗', { error: launchError.message });
        return {
          success:    false,
          error:      `POKER.exe の起動に失敗しました: ${launchError.message}`,
          error_type: 'POKER_LAUNCH_FAILED',
          suggestion: 'POKER.exe の実行権限および POKER_INSTALL_PATH の設定を確認してください。'
        };
      }
    }
  };
}
