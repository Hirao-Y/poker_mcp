# アーカイブファイル

このディレクトリには、poker_mcpサーバの本番運用で不要と判断されたファイルが整理されています。

## ディレクトリ構成

### unused_src_files/
本番MCPサーバで参照されていない、不要なソースファイル

#### tools/
- `sourceTools_fixed_part2.js` - 未完成のツール定義ファイル（index.jsで参照されていない）

#### utils/
- `logger_no_color.js` - logger.jsの代替版（カラーコード無効化）、未使用
- `errorHandler.js` - Express用エラーハンドラー（MCPでは不使用）

#### validators/
- `PhysicsValidatorSimple.js` - PhysicsValidator.jsの簡易版、未使用

### development_scripts/
開発・デバッグ・テスト用スクリプト

- `integration_test.js` - 統合テストスクリプト
- `mock_test.js` - モックテスト（CommonJS版）
- `mock_test_es6.js` - モックテスト（ES6版）
- `syntax_check.js` - 構文チェックスクリプト
- `test_structure.js` - マニフェスト構造テスト
- `check_manifest.js` - マニフェスト検証スクリプト
- `json_check.js` - JSON構文チェックスクリプト

### test_data/
テスト用データファイル

- `co60_*.yaml` - Co60関連のテストYAMLファイル群
- `co60_shielding_test.yaml.*` - 計算結果ファイル
- `test_input.yaml` - テスト入力ファイル

## 復元について

これらのファイルは開発時に必要になる場合があります。必要に応じて元の場所に戻すことができます。

## 削除について

本番環境では、このarchiveディレクトリ全体を削除しても問題ありません。
