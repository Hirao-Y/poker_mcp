# 🚀 NPX を使用したPoker MCPサーバーの起動

## 📦 NPXでの起動方法

### **方法1: パッケージ名で起動**
```bash
npx pokerinput-mcp-final
```

### **方法2: ローカルディレクトリから起動**
```bash
# poker_mcpディレクトリ内で実行
npx .
```

### **方法3: 絶対パスで起動**
```bash
npx C:\Users\yoshi\Desktop\poker_mcp
```

---

## 🔧 **NPX起動の準備**

### **Step 1: パッケージのローカルインストール（推奨）**
```bash
# poker_mcpディレクトリに移動
cd C:\Users\yoshi\Desktop\poker_mcp

# ローカルインストール
npm install -g .
```

### **Step 2: NPXで直接起動**
```bash
# どのディレクトリからでも起動可能
npx pokerinput-mcp-final
```

---

## ✅ **起動確認方法**

### **正常起動の確認**
```bash
# NPXでサーバー起動
npx pokerinput-mcp-final

# 以下が表示されれば正常起動
✅ Expected output:
- MCP Server initialization logs
- Server listening on stdio
- No console.log output (MCP protocol compliance)
```

### **起動オプション（将来的に追加可能）**
```bash
# ポート指定（将来実装）
npx pokerinput-mcp-final --port 3000

# デバッグモード（将来実装）
npx pokerinput-mcp-final --debug

# 設定ファイル指定（将来実装）
npx pokerinput-mcp-final --config ./custom-config.json
```

---

## 🔍 **トラブルシューティング**

### **よくある問題と解決法**

#### **1. "command not found" エラー**
```bash
# 解決法1: ローカルインストール
cd C:\Users\yoshi\Desktop\poker_mcp
npm install -g .

# 解決法2: 直接実行
npx C:\Users\yoshi\Desktop\poker_mcp
```

#### **2. "Permission denied" エラー**
```bash
# 解決法: 実行権限確認
ls -la src/mcp_server_stdio_v4.js

# Windows環境では通常問題なし
```

#### **3. "Module not found" エラー**
```bash
# 解決法: 依存関係インストール
cd C:\Users\yoshi\Desktop\poker_mcp
npm install
```

### **デバッグ情報取得**
```bash
# 詳細ログ出力
NPX_DEBUG=1 npx pokerinput-mcp-final

# Node.js詳細情報
node --version
npm --version
```

---

## 🎯 **Claude Desktop での使用**

### **mcp-config.json 設定例**
```json
{
  "mcpServers": {
    "pokerinput-mcp": {
      "command": "npx",
      "args": ["pokerinput-mcp-final"],
      "cwd": "C:\\Users\\yoshi\\Desktop\\poker_mcp"
    }
  }
}
```

### **代替設定（ローカルインストール後）**
```json
{
  "mcpServers": {
    "pokerinput-mcp": {
      "command": "pokerinput-mcp-final",
      "args": []
    }
  }
}
```

---

## 📚 **利点とメリット**

### **NPX使用の利点**
- ✅ **簡単起動**: 複雑なパス指定不要
- ✅ **依存関係自動解決**: npm installが自動実行
- ✅ **バージョン管理**: パッケージバージョンの明確化
- ✅ **配布容易**: 他の環境でも同じコマンドで起動

### **開発・運用での利点**
- 🚀 **CI/CD対応**: 自動化スクリプトでの使用が容易
- 🚀 **ドキュメント化**: 明確な起動コマンドドキュメント
- 🚀 **チーム共有**: 統一された起動方法
- 🚀 **エラー削減**: 手動パス指定によるエラー減少

---

## 🎓 **使用例**

### **開発環境での使用**
```bash
# 開発サーバー起動
cd C:\Users\yoshi\Desktop\poker_mcp
npx pokerinput-mcp-final

# または
npx .
```

### **本番環境での使用**
```bash
# グローバルインストール後
npm install -g pokerinput-mcp-final
pokerinput-mcp-final

# または直接NPX使用
npx pokerinput-mcp-final
```

### **CI/CD環境での使用**
```bash
# GitHub Actions等で使用
- name: Start MCP Server
  run: npx pokerinput-mcp-final &
```

---

## 📋 **まとめ**

NPXを使用することで：

1. **`npx pokerinput-mcp-final`** で簡単起動
2. **パス指定不要** でエラー削減
3. **依存関係自動解決** で環境構築簡化
4. **Claude Desktop設定** が簡潔化

このNPX対応により、Poker MCPサーバーの起動が大幅に簡単になりました。
