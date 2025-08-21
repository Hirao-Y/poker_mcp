# 🎮 Poker MCP インタラクティブチュートリアル - 最小プロトタイプ

## ⚡ クイックスタート

```bash
# 1. このディレクトリに移動
cd minimal_prototype

# 2. 依存関係をインストール（オプション）
npm install

# 3. チュートリアルを開く
# 方法A: 直接HTMLファイルを開く
open index.html

# 方法B: 開発サーバーを使用
npm start
```

## 🎯 このプロトタイプについて

### 📚 学習内容
- Poker MCP の基本概念
- JSON-RPC API の使い方
- 放射線源作成の基礎
- インタラクティブ学習体験

### ⚡ 特徴
- **15分で完了**: 短時間で核心を理解
- **ブラウザのみ**: 追加インストール不要
- **即座フィードバック**: リアルタイム検証
- **シンプルUI**: 学習に集中できるデザイン

### 🔧 技術構成
- **フロントエンド**: バニラHTML/CSS/JavaScript
- **検証**: クライアントサイドJSON検証
- **UI**: レスポンシブデザイン
- **アクセシビリティ**: 基本的な対応

## 📖 ステップ解説

### ステップ1: 線源作成
```json
{
  "jsonrpc": "2.0",
  "method": "pokerinput_proposeSource",
  "params": {
    "name": "my_co60_source",  // ← ここを入力
    "type": "point",
    "position": "0 0 100",
    "inventory": [
      {
        "nuclide": "Co-60",
        "radioactivity": 3.7e10
      }
    ]
  },
  "id": 1001
}
```

**🎯 目標**: `name` フィールドに適切な線源名を入力

**💡 ヒント**: 
- 英数字と下線(_)が使用可能
- 分かりやすい名前をつけましょう
- 例: "my_co60_source", "test_source_1"

## 🚀 次のステップ

このプロトタイプを完了したら：

1. **フルデモを体験**: `../full_demo` で完全機能を試す
2. **カスタマイズ**: コードを改変して独自機能を追加
3. **実際の利用**: 本格的なPoker MCP環境で実践

## 🔧 カスタマイゼーション

### 新しいステップを追加
```javascript
// index.html内のJavaScriptを編集
function addNewStep() {
    // 新しい検証ロジックを追加
}
```

### UIスタイルの変更
```css
/* index.html内のCSSを編集 */
.tutorial-container {
    /* カスタムスタイル */
}
```

## 📚 学習リソース

- [Poker MCP公式ドキュメント](../../../README.md)
- [フルデモ](../full_demo/README.md)
- [技術アーキテクチャ](../../02_TECHNICAL_ARCHITECTURE.md)

---

**🎮 楽しく学習を進めてください！分からないことがあれば、ヒントを参考にしてください。**