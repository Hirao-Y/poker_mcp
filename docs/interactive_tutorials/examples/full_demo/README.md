# 🚀 Poker MCP インタラクティブチュートリアル - フルデモ

## 🏗️ アーキテクチャ概要

```
full_demo/
├── docker-compose.yml      # 全サービス定義
├── frontend/              # React + TypeScript
│   ├── src/
│   │   ├── components/   # UIコンポーネント
│   │   ├── hooks/        # カスタムフック
│   │   └── utils/        # ユーティリティ
│   ├── package.json      # フロントエンド依存関係
│   └── Dockerfile        # フロントエンドコンテナ
├── backend/               # FastAPI + Python
│   ├── app/
│   │   ├── routers/      # APIルーター
│   │   ├── models/       # データモデル
│   │   └── services/     # ビジネスロジック
│   ├── requirements.txt  # Python依存関係
│   └── Dockerfile        # バックエンドコンテナ
├── database/              # PostgreSQL
│   └── init.sql          # 初期化スクリプト
├── redis/                 # Redis設定
└── nginx/                 # ロードバランサー設定
    └── nginx.conf
```

## 🚀 クイックスタート

### 📋 前提条件
- Docker & Docker Compose
- 8GB以上のRAM
- 10GB以上の空きディスク容量

### ⚡ 起動手順

```bash
# 1. フルデモディレクトリに移動
cd full_demo

# 2. 全サービス起動
docker-compose up -d

# 3. 初期化待機（約2-3分）
docker-compose logs -f

# 4. ブラウザでアクセス
open http://localhost:3000
```

### 🔍 サービス確認

```bash
# 全サービス状態確認
docker-compose ps

# ログ確認
docker-compose logs [service-name]

# 停止
docker-compose down
```

## 🌟 実装機能

### 🎮 コアチュートリアル機能
- **10ステップ構成**: 基礎から応用まで段階的学習
- **リアルタイム検証**: 即座のコード検証・フィードバック
- **エラー支援**: 分かりやすいエラーメッセージ・修正提案
- **プログレス追跡**: 学習進度の可視化

### 🎨 高度なUI/UX
- **3D可視化**: Three.js による立体・線源の可視化
- **ダークモード**: 目に優しいテーマ切替
- **レスポンシブ**: デスクトップ・タブレット・モバイル対応
- **アクセシビリティ**: スクリーンリーダー・キーボード操作対応

### 🏆 ゲーミフィケーション
- **成果システム**: 25個の成果バッジ
- **レベルシステム**: 経験値・レベルアップ
- **デイリーチャレンジ**: 日替わり課題
- **リーダーボード**: コミュニティランキング

### 🤖 AI支援機能
- **個人化ヒント**: ユーザーレベルに応じたヒント
- **エラー予測**: 一般的な間違いの事前警告  
- **学習パス推奨**: 最適な次ステップ提案
- **コード品質分析**: 自動コードレビュー

### 🔄 リアルタイム機能
- **WebSocket通信**: 即座の双方向通信
- **協調学習**: 他ユーザーとの同時学習
- **ライブサポート**: リアルタイム質問・回答
- **セッション復元**: 途中中断からの再開

### 📊 分析・監視
- **学習分析**: 詳細な学習行動分析
- **パフォーマンス監視**: システム性能リアルタイム監視
- **ユーザー行動追跡**: A/Bテスト・改善データ収集
- **エラートラッキング**: 自動エラー報告・分析

## 🔧 開発・カスタマイゼーション

### 🛠️ 開発環境セットアップ

```bash
# 開発モードで起動
docker-compose -f docker-compose.dev.yml up

# フロントエンド開発
cd frontend
npm install
npm run dev

# バックエンド開発  
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 📝 新機能追加

```typescript
// frontend/src/components/NewFeature.tsx
import React from 'react';

const NewFeature: React.FC = () => {
  return (
    <div className="new-feature">
      {/* 新機能実装 */}
    </div>
  );
};

export default NewFeature;
```

```python
# backend/app/routers/new_feature.py
from fastapi import APIRouter

router = APIRouter()

@router.post("/new-feature")
async def new_feature_endpoint():
    # 新API実装
    return {"status": "success"}
```

### 🎨 テーマカスタマイゼーション

```css
/* frontend/src/styles/custom-theme.css */
:root {
  --primary-color: #your-color;
  --secondary-color: #your-color;
  --background-color: #your-color;
}
```

## 📊 監視・メトリクス

### 📈 監視ダッシュボード
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Redis Insight**: http://localhost:8001

### 🔍 ログ分析
```bash
# アプリケーションログ
docker-compose logs app

# データベースログ
docker-compose logs postgres

# Redis ログ
docker-compose logs redis
```

## 🧪 テスト実行

```bash
# フロントエンドテスト
cd frontend
npm run test
npm run test:e2e

# バックエンドテスト
cd backend  
pytest
pytest --cov=app
```

## 🚀 本番デプロイ

```bash
# 本番用ビルド
docker-compose -f docker-compose.prod.yml build

# 本番環境デプロイ
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 トラブルシューティング

### よくある問題

**Q: サービスが起動しない**
```bash
# ポート競合確認
netstat -tulpn | grep :3000

# Docker リソース確認
docker system df
docker system prune
```

**Q: データベース接続エラー**
```bash
# PostgreSQL状態確認
docker-compose exec postgres pg_isready

# 接続テスト
docker-compose exec app python -c "from app.db import engine; engine.connect()"
```

**Q: フロントエンドビルドエラー**
```bash
# Node.js バージョン確認
node --version  # 18.x 推奨

# キャッシュクリア
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 📚 追加リソース

- **技術ドキュメント**: [../../README.md](../../README.md)
- **API仕様**: http://localhost:8000/docs (起動後)
- **アーキテクチャ詳細**: [../../02_TECHNICAL_ARCHITECTURE.md](../../02_TECHNICAL_ARCHITECTURE.md)
- **デプロイガイド**: [../../06_DEPLOYMENT_GUIDE.md](../../06_DEPLOYMENT_GUIDE.md)

---

**🎯 このフルデモで、本格的なインタラクティブ学習プラットフォームの全機能を体験できます！**

**✨ 開発・カスタマイゼーションも自由に行えるので、独自の学習体験を作り上げてください。**