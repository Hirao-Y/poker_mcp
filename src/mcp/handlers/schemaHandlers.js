// mcp/handlers/schemaHandlers.js
//
// POKER_CUI --schema を呼んでスキーマを返す。
//   実行時に生成するのは、材料名・核種名の一覧をその環境のライブラリから
//   埋めるため。版が上がってもスキーマが自動で追随する。
import { spawn } from 'child_process';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const KINDS = ['input', 'paths', 'summary', 'dose'];
const POKER_CUI = 'poker_cui';
const TIMEOUT_MS = 30000;

//|
//| POKER_CUI --schema を実行し、標準出力を文字列で返す。
//|
function runSchema(kind) {
  return new Promise((resolve, reject) => {
    const args = ['--schema'];
    if (kind && kind !== 'input') args.push('--kind=' + kind);

    const child = spawn(POKER_CUI, args, { windowsHide: true });
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('poker_cui --schema timed out')); }, TIMEOUT_MS);

    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`poker_cui --schema exited with ${code}: ${err.trim()}`));
      else resolve(out);
    });
  });
}

export function createSchemaHandlers() {
  return {
    async getSchema(args = {}) {
      const kind = args.kind || 'input';
      if (!KINDS.includes(kind)) {
        throw new ValidationError(`kind must be one of ${KINDS.join(' / ')}`, 'kind', kind);
      }
      try {
        const text = await runSchema(kind);
        let schema;
        try {
          schema = JSON.parse(text);
        } catch (e) {
          // JSON として読めないときは、生成が途中で終わったか版が古い。
          // 中身をそのまま返しても使えないので、原因が分かる形で返す。
          return {
            success: false,
            kind,
            error: 'poker_cui --schema の出力が JSON として読めません',
            hint: 'POKER がスキーマ出力に対応した版か確認してください（poker_cui --schema）',
            head: text.slice(0, 200)
          };
        }
        return {
          success: true,
          kind,
          schema_id: schema.$id,
          generator: schema['x-poker'] ? schema['x-poker'].generator : undefined,
          schema
        };
      } catch (error) {
        logger.warn('getSchema failed', { kind, error: error.message });
        return {
          success: false,
          kind,
          error: error.message,
          hint: 'poker_cui が PATH にあり、--schema に対応した版であることを確認してください'
        };
      }
    }
  };
}
