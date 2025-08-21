# 🏗️ 技術アーキテクチャ・実装方針

## 🎯 アーキテクチャ設計思想

### 🌟 基本原則
```typescript
interface ArchitecturalPrinciples {
  modularity: "高い凝集度、低い結合度";
  scalability: "段階的拡張対応";
  maintainability: "可読性・保守性重視";
  performance: "リアルタイム性確保";
  reliability: "堅牢性・障害耐性";
}
```

## ⚛️ フロントエンド アーキテクチャ

### 🎮 コンポーネント設計

```typescript
interface TutorialComponents {
  TutorialShell: {
    purpose: "全体レイアウト・状態管理";
    children: ["Header", "Navigation", "Content"];
    responsibilities: ["認証", "テーマ", "エラーハンドリング"];
  };
  
  InteractiveEditor: {
    technology: "CodeMirror 6";
    features: ["シンタックスハイライト", "自動補完", "リアルタイム検証"];
  };
  
  Visualizer3D: {
    technology: "Three.js + React Three Fiber";
    features: ["立体描画", "インタラクション", "アニメーション"];
  };
}
```

### 📊 状態管理

```typescript
// Zustand による軽量状態管理
const useTutorialStore = create<TutorialState>((set, get) => ({
  currentStep: 0,
  userCode: '',
  
  actions: {
    executeCode: async (code: string) => {
      const result = await apiClient.validateCode(code);
      set({ lastResult: result });
      
      if (result.success) {
        get().actions.completeStep();
      }
    }
  }
}));
```

## 🐍 バックエンド アーキテクチャ

### 🚀 FastAPI サービス層

```python
class TutorialService:
    """チュートリアル中核サービス"""
    
    async def process_user_code(self, user_id: str, code: str) -> ProcessingResult:
        # 1. コード検証
        validation = await self.validator.validate(code)
        
        # 2. 実行シミュレーション
        if validation.is_valid:
            execution = await self.simulate_execution(code)
        
        # 3. 進度更新
        if execution and execution.success:
            await self.progress_tracker.mark_completed(user_id)
        
        return ProcessingResult(validation=validation, execution=execution)

# WebSocket リアルタイム通信
@app.websocket("/ws/tutorial/{user_id}")
async def tutorial_websocket(websocket: WebSocket, user_id: str):
    await websocket.accept()
    
    while True:
        message = await websocket.receive_json()
        
        if message["type"] == "code_validate":
            result = await tutorial_service.validate_code(message["code"])
            await websocket.send_json({"type": "validation_result", "data": result})
```

### 💾 データ層設計

```sql
-- 中核テーブル設計
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tutorial_progress (
    user_id UUID REFERENCES users(id),
    step_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'not_started',
    attempts INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    PRIMARY KEY (user_id, step_id)
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔌 API 設計

### 🌐 RESTful エンドポイント

```python
@app.get("/api/tutorials/{tutorial_id}/steps")
async def get_tutorial_steps(tutorial_id: str) -> List[TutorialStep]:
    """チュートリアルステップ一覧取得"""
    return await tutorial_service.get_steps(tutorial_id)

@app.post("/api/validate/code")
async def validate_code(request: CodeValidationRequest) -> ValidationResult:
    """リアルタイムコード検証"""
    return await tutorial_service.validate_code(request.code, request.step_id)

@app.post("/api/execute/simulation") 
async def execute_simulation(request: SimulationRequest) -> SimulationResult:
    """Poker MCP API シミュレーション実行"""
    return await poker_mcp_simulator.execute(request)

@app.get("/api/gamification/profile/{user_id}")
async def get_gamification_profile(user_id: str) -> GamificationProfile:
    """ゲーミフィケーションプロフィール取得"""
    return await gamification_service.get_profile(user_id)
```

## 🔒 セキュリティ設計

### 🛡️ 認証・認可

```python
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import JWTAuthentication

# JWT認証設定
jwt_authentication = JWTAuthentication(
    secret=settings.SECRET_KEY,
    lifetime_seconds=3600
)

# レート制限
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    
    # Redis でレート制限チェック
    if await rate_limiter.is_rate_limited(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    response = await call_next(request)
    return response
```

## 📊 監視・ログ設計

### 📈 パフォーマンス監視

```python
from prometheus_client import Counter, Histogram
import structlog

# メトリクス定義
REQUEST_COUNT = Counter('tutorial_requests_total', 'Total requests', ['method'])
REQUEST_DURATION = Histogram('tutorial_request_duration_seconds', 'Request duration')

# 構造化ログ
logger = structlog.get_logger()

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    start_time = time.time()
    
    logger.info("request_started", method=request.method, url=str(request.url))
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    REQUEST_DURATION.observe(duration)
    REQUEST_COUNT.labels(method=request.method).inc()
    
    logger.info("request_completed", 
                method=request.method, 
                status_code=response.status_code,
                duration=duration)
    
    return response
```

## 🚀 スケーラビリティ設計

### ⚡ パフォーマンス最適化

```typescript
// フロントエンド最適化
const TutorialStep = React.lazy(() => import('./TutorialStep'));

const App: React.FC = () => {
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <TutorialStep />
    </React.Suspense>
  );
};

// コード分割・遅延読み込み
const routes = [
  {
    path: '/tutorial/:id',
    component: React.lazy(() => import('./TutorialPage'))
  }
];
```

```python
# バックエンド最適化
from fastapi import BackgroundTasks
import asyncio

# 非同期バックグラウンド処理
@app.post("/api/analytics/track")
async def track_analytics(event: AnalyticsEvent, background_tasks: BackgroundTasks):
    # 即座にレスポンス
    background_tasks.add_task(process_analytics_event, event)
    return {"status": "accepted"}

async def process_analytics_event(event: AnalyticsEvent):
    # バックグラウンドで重い処理
    await analytics_service.process(event)
```

## 🔧 開発・運用プロセス

### 🧪 テスト戦略

```typescript
// Frontend テスト
import { render, screen, fireEvent } from '@testing-library/react';

test('コード実行時に検証が動作する', async () => {
  render(<TutorialStep />);
  
  const codeEditor = screen.getByLabelText('コードエディタ');
  const executeButton = screen.getByText('実行');
  
  fireEvent.change(codeEditor, { target: { value: validCode } });
  fireEvent.click(executeButton);
  
  expect(await screen.findByText('成功')).toBeInTheDocument();
});
```

```python
# Backend テスト
import pytest
from fastapi.testclient import TestClient

def test_code_validation():
    response = client.post("/api/validate/code", json={
        "code": "valid_json_code",
        "step_id": "step_1"
    })
    
    assert response.status_code == 200
    assert response.json()["is_valid"] == True
```

---

**🎯 アーキテクチャの重要ポイント**:

- **分離されたレイヤー**: フロントエンド、API、データ層の明確な分離
- **リアルタイム性**: WebSocket による即座のフィードバック
- **スケーラビリティ**: 水平拡張可能な設計
- **保守性**: モジュラー設計による保守容易性
- **パフォーマンス**: 最適化された レスポンス時間

**✨ この設計により、高品質で拡張可能なインタラクティブ学習プラットフォームが実現できます！**