# PokerInput MCP Server FINAL 🚀

**世界クラス** YAML-based radiation shielding calculation input file management tool

## 📋 クイック情報

- **バージョン**: 3.0.1 (Final Fixed Edition)
- **ステータス**: ✅ **世界クラス品質達成**
- **メインサーバー**: `src/mcp_server_final_fixed.js`
- **ポート**: 3020

## ⚡ 5分で開始

```bash
# 1. 依存関係インストール
npm install --prefix config/

# 2. サーバー起動
node src/mcp_server_final_fixed.js

# 3. 動作確認
curl http://localhost:3020/health
```

## 📚 完全ドキュメント

**📖 [完全なREADME](docs/README.md)** - 詳細情報・API・使用例

**📚 [マニュアル](docs/manuals/INDEX.md)** - 包括的マニュアル (2,500行超)

## 🏆 主要機能

- ✅ **15個のMCPメソッド完全実装**
- ✅ **本番環境対応機能完備** 
- ✅ **自動バックアップシステム**
- ✅ **企業レベルのプロジェクト構成**

## 📁 プロジェクト構造

```
poker_mcp/
├── 📁 src/                    # 🚀 本番ソースコード
├── 📁 config/                 # ⚙️ 設定ファイル
├── 📁 docs/                   # 📚 完全ドキュメント
├── 📁 tests/                  # 🧪 テスト関連
├── 📁 tasks/                  # 📊 データファイル
├── 📁 backups/                # 💾 自動バックアップ
└── 📁 (その他専門フォルダ)
```

## 🔧 基本API例

```bash
# 球体作成
curl -X POST http://localhost:3020/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "pokerinput.proposeBody",
    "params": {
      "name": "sphere1",
      "type": "SPH", 
      "center": "0 0 0",
      "radius": 10
    },
    "id": 1
  }'

# 変更適用
curl -X POST http://localhost:3020/mcp \
  -d '{"jsonrpc":"2.0","method":"pokerinput.applyChanges","params":{},"id":2}'
```

## 📞 サポート

- **詳細**: [docs/README.md](docs/README.md)
- **マニュアル**: [docs/manuals/](docs/manuals/)
- **トラブル**: [docs/manuals/MANUAL_04_TROUBLESHOOTING.md](docs/manuals/MANUAL_04_TROUBLESHOOTING.md)

---

**🎯 PokerInput MCP Server FINAL v3.0.1**  
**世界クラスの放射線遮蔽計算MCPサーバー**

**作者**: yoshihiro hirao | **ライセンス**: ISC
