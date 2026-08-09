// mcp/handlers/guiHandlers.js
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { TASKS_DIR, YAML_FILE } from '../../utils/paths.js';

/**
 * POKER.exe が既に起動しているかを調べる（Windows専用）
 *
 * POKER は二重起動を許可しないため、起動中に spawn しても新しい
 * プロセスは即座に終了し、画面は前の入力を表示したままになる。
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

      // ── Step 3.5: POKER.exe の多重起動チェック ───────────────────
      //
      // POKER は二重起動を許可しない。既に起動している状態で spawn すると
      // 新しいプロセスは即座に終了し、画面は前の入力を表示したままになる。
      // 従来は spawn の成否のみで成功を返していたため、実際には表示が
      // 切り替わっていないのに「起動しました」と報告していた。
      const running = await isPokerRunning();
      if (running.detected) {
        logger.warn('poker_openGui: POKER.exe が既に起動中', { pids: running.pids });
        return {
          success:    false,
          error:      'POKER.exe は既に起動しています。POKER は二重起動できません。',
          error_type: 'POKER_ALREADY_RUNNING',
          running_pids: running.pids,
          suggestion: '別の入力を表示するには、先に起動中の POKER ウィンドウを閉じてください。'
            + '\n（表示中の入力を再読み込みしたい場合も、いったん閉じる必要があります）'
        };
      }

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
        const died = await new Promise(resolve => {
          const timer = setTimeout(() => resolve(null), 1500);
          child.once('exit', code => { clearTimeout(timer); resolve(code ?? -1); });
          child.once('error', () => { clearTimeout(timer); resolve(-1); });
        });

        if (died !== null) {
          logger.error('poker_openGui: POKER.exe が起動直後に終了', {
            exitCode: died, executable: pokerExePath, inputFile: resolvedYaml
          });
          return {
            success:    false,
            error:      `POKER.exe が起動直後に終了しました (exit=${died})`,
            error_type: 'POKER_EXITED_IMMEDIATELY',
            input_file: resolvedYaml,
            suggestion: '入力ファイルが POKER で読める形式か確認してください。'
              + '\nPOKER が既に起動している場合は、先に閉じてください（二重起動不可）。'
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
