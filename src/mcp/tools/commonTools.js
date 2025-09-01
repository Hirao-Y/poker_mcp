// mcp/tools/commonTools.js
export const commonTools = [
  {
    name: 'poker_applyChanges',
    description: '保留中の全変更を実際のYAMLファイルに適用します（自動バックアップ実行）',
    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          description: '強制適用フラグ（警告を無視）',
          default: false
        },
        backup_comment: {
          type: 'string',
          description: 'バックアップのコメント',
          maxLength: 200
        }
      }
    }
  }
];
