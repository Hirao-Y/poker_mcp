// mcp/tools/guiTools.js
export const guiTools = [
  {
    name: 'poker_openGui',
    description:
      'YAMLファイルを保存してから POKER.exe でGUI表示します。'
      + '未保存の変更は自動的に保存（applyChanges）されてから起動します。'
      + 'POKER_INSTALL_PATH 環境変数（デフォルト: C:/Poker）の POKER.exe を使用します。'
      + 'Windows専用です。',
    inputSchema: {
      type: 'object',
      properties: {
        yaml_file: {
          type: 'string',
          description:
            '表示する入力ファイル名（省略時は poker.yaml）。'
            + 'ファイル名のみ指定すると POKER_MCP_HOME/tasks/ 配下を自動参照します。'
            + '絶対パスも指定可能です。',
          pattern: '^([a-zA-Z0-9_\\-\\.]+\\.(yaml|yml)|([a-zA-Z]:[\\\\\/]|\\/)[^\\\\]+\\.(yaml|yml))$'
        }
      },
      additionalProperties: false
    }
  }
];
