// mcp/handlers/guiHandlers.js
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { TASKS_DIR, YAML_FILE } from '../../utils/paths.js';

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

      // ── Step 4: POKER.exe をデタッチ起動 ─────────────────────────
      try {
        const child = spawn(pokerExePath, [resolvedYaml], {
          detached: true,
          stdio:    'ignore',   // MCPサーバーの stdio を汚染しない
          shell:    false
        });
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
