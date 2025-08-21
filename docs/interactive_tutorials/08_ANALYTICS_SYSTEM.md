# 📊 分析システム・測定方法

## 🎯 分析システム全体設計

### 🏗️ アーキテクチャ概要
```typescript
interface AnalyticsArchitecture {
  collection_layer: "フロントエンド・バックエンドでのデータ収集";
  processing_layer: "リアルタイム・バッチ処理";
  storage_layer: "時系列DB・データウェアハウス";
  visualization_layer: "ダッシュボード・レポート";
}
```

## 🔧 データ収集システム

### 📱 フロントエンド追跡

```typescript
// analytics/tracking.ts
class TutorialTracker {
  trackLearningEvent(event: LearningEvent) {
    const trackingData = {
      event_type: 'learning_progress',
      session_id: this.sessionId,
      step_id: event.stepId,
      completion_time_ms: event.completionTime,
      attempts_count: event.attemptsCount,
      hints_used: event.hintsUsed,
      success: event.success,
      timestamp: Date.now()
    };

    posthog.capture('tutorial_learning_event', trackingData);
  }

  trackUserExperience() {
    // Web Vitals 測定
    getCLS((metric) => this.trackWebVital('CLS', metric));
    getFID((metric) => this.trackWebVital('FID', metric));
    getLCP((metric) => this.trackWebVital('LCP', metric));
  }

  trackError(error: Error, context: ErrorContext) {
    Sentry.captureException(error, { contexts: { tutorial: context } });
    posthog.capture('tutorial_error', {
      error_message: error.message,
      context,
      timestamp: Date.now()
    });
  }
}
```

### 🐍 バックエンド分析

```python
# analytics/backend_tracker.py
from dataclasses import dataclass
from datetime import datetime
import asyncio

@dataclass
class AnalyticsEvent:
    event_type: str
    user_id: str
    data: dict
    timestamp: datetime

class BackendAnalytics:
    def __init__(self):
        self.events_queue = asyncio.Queue()
        
    async def track_api_call(self, user_id: str, endpoint: str, 
                           response_time: float, status_code: int):
        event = AnalyticsEvent(
            event_type="api_call",
            user_id=user_id,
            data={
                "endpoint": endpoint,
                "response_time_ms": response_time * 1000,
                "status_code": status_code,
                "success": status_code < 400
            },
            timestamp=datetime.utcnow()
        )
        await self.events_queue.put(event)

    async def track_learning_milestone(self, user_id: str, milestone: str):
        event = AnalyticsEvent(
            event_type="learning_milestone",
            user_id=user_id,
            data={"milestone": milestone},
            timestamp=datetime.utcnow()
        )
        await self.events_queue.put(event)

    async def process_events(self):
        """バックグラウンドでイベントを処理"""
        while True:
            try:
                event = await self.events_queue.get()
                await self.send_to_analytics_service(event)
                await self.store_in_database(event)
            except Exception as e:
                logger.error(f"Analytics processing error: {e}")
```

## 📈 リアルタイム分析

### ⚡ ストリーミング処理

```python
# streaming/realtime_processor.py
import asyncio
from kafka import KafkaConsumer
import json

class RealTimeAnalytics:
    def __init__(self):
        self.consumer = KafkaConsumer(
            'tutorial_events',
            bootstrap_servers=['kafka:9092'],
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        
    async def process_events(self):
        for message in self.consumer:
            event = message.value
            
            # リアルタイム分析
            await self.update_live_metrics(event)
            await self.check_alert_conditions(event)
            await self.update_user_progress(event)

    async def update_live_metrics(self, event):
        """ライブメトリクス更新"""
        if event['event_type'] == 'learning_progress':
            await self.increment_counter('active_learners')
            await self.update_average('completion_time', event['completion_time_ms'])
            
        elif event['event_type'] == 'tutorial_error':
            await self.increment_counter('error_count')
            await self.update_error_rate()

    async def check_alert_conditions(self, event):
        """アラート条件チェック"""
        if event['event_type'] == 'tutorial_error':
            error_rate = await self.get_current_error_rate()
            if error_rate > 0.05:  # 5%以上
                await self.send_alert("High error rate detected", error_rate)
                
        elif event['event_type'] == 'learning_progress':
            if not event['success'] and event['attempts_count'] > 5:
                await self.send_alert("User struggling", event)
```

## 🏬 データウェアハウス

### 🗄️ スキーマ設計

```sql
-- 学習イベント分析テーブル
CREATE TABLE learning_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    session_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    step_id VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 学習メトリクス
    completion_time_ms INTEGER,
    attempts_count INTEGER,
    hints_used INTEGER,
    errors_count INTEGER,
    success BOOLEAN,
    
    -- コード品質（JSON）
    code_quality JSONB,
    
    -- コンテキスト情報
    device_info JSONB,
    browser_info JSONB,
    
    -- インデックス
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_step_timestamp (step_id, timestamp),
    INDEX idx_event_type (event_type)
);

-- 集約テーブル（日次）
CREATE TABLE daily_learning_stats (
    date DATE NOT NULL,
    step_id VARCHAR(100) NOT NULL,
    
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    avg_completion_time_ms DECIMAL(10,2),
    avg_attempts_per_user DECIMAL(5,2),
    
    PRIMARY KEY (date, step_id)
);

-- ユーザー進度トラッキング
CREATE TABLE user_learning_progress (
    user_id UUID NOT NULL,
    step_id VARCHAR(100) NOT NULL,
    first_attempt_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_attempts INTEGER DEFAULT 0,
    total_hints_used INTEGER DEFAULT 0,
    best_completion_time_ms INTEGER,
    
    PRIMARY KEY (user_id, step_id)
);
```

### 📊 集約処理

```python
# analytics/aggregation.py
import pandas as pd
from sqlalchemy import create_engine

class LearningAnalytics:
    def __init__(self):
        self.engine = create_engine(DATABASE_URL)
    
    def calculate_daily_metrics(self, date: str):
        """日次メトリクス計算"""
        query = f"""
        SELECT 
            step_id,
            COUNT(*) as total_attempts,
            COUNT(*) FILTER (WHERE success = true) as successful_attempts,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(completion_time_ms) as avg_completion_time,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY completion_time_ms) as p95_completion_time,
            AVG(attempts_count) as avg_attempts_per_session,
            AVG(hints_used) as avg_hints_used
        FROM learning_events 
        WHERE DATE(timestamp) = '{date}'
        GROUP BY step_id
        """
        
        df = pd.read_sql(query, self.engine)
        
        # 追加計算
        df['success_rate'] = df['successful_attempts'] / df['total_attempts']
        df['efficiency_score'] = df['success_rate'] / df['avg_attempts_per_session']
        
        return df
    
    def analyze_user_journey(self, user_id: str):
        """ユーザージャーニー分析"""
        query = f"""
        SELECT 
            step_id,
            MIN(timestamp) as first_attempt,
            MAX(timestamp) as last_attempt,
            COUNT(*) as total_attempts,
            MAX(success::int) as eventually_succeeded,
            SUM(hints_used) as total_hints
        FROM learning_events 
        WHERE user_id = '{user_id}'
        GROUP BY step_id
        ORDER BY first_attempt
        """
        
        journey_df = pd.read_sql(query, self.engine)
        
        # 学習パターン分析
        patterns = self.identify_learning_patterns(journey_df)
        recommendations = self.generate_recommendations(patterns)
        
        return {
            'journey': journey_df.to_dict('records'),
            'patterns': patterns,
            'recommendations': recommendations
        }
    
    def cohort_retention_analysis(self):
        """コホート分析"""
        query = """
        WITH user_cohorts AS (
            SELECT 
                user_id,
                DATE_TRUNC('week', MIN(timestamp)) as cohort_week
            FROM learning_events
            GROUP BY user_id
        ),
        user_activities AS (
            SELECT 
                le.user_id,
                uc.cohort_week,
                DATE_TRUNC('week', le.timestamp) as activity_week
            FROM learning_events le
            JOIN user_cohorts uc ON le.user_id = uc.user_id
        )
        SELECT 
            cohort_week,
            activity_week,
            COUNT(DISTINCT user_id) as active_users
        FROM user_activities
        GROUP BY cohort_week, activity_week
        ORDER BY cohort_week, activity_week
        """
        
        return pd.read_sql(query, self.engine)
```

## 📊 ダッシュボード・可視化

### 📈 リアルタイムダッシュボード

```typescript
// dashboard/realtime-dashboard.tsx
import { useQuery, useSubscription } from '@apollo/client';
import { Line, Bar, Pie } from 'react-chartjs-2';

const RealTimeDashboard: React.FC = () => {
  // リアルタイムメトリクス取得
  const { data: liveMetrics } = useSubscription(LIVE_METRICS_SUBSCRIPTION);
  const { data: userActivity } = useQuery(USER_ACTIVITY_QUERY, {
    pollInterval: 5000 // 5秒間隔で更新
  });

  return (
    <div className="dashboard-grid">
      {/* 主要KPI */}
      <div className="kpi-cards">
        <KPICard 
          title="アクティブユーザー" 
          value={liveMetrics?.activeUsers} 
          trend={liveMetrics?.userTrend}
        />
        <KPICard 
          title="完了率" 
          value={`${liveMetrics?.completionRate}%`}
          trend={liveMetrics?.completionTrend}
        />
        <KPICard 
          title="平均完了時間" 
          value={`${liveMetrics?.avgCompletionTime}分`}
          trend={liveMetrics?.timeTrend}
        />
      </div>

      {/* 学習進度チャート */}
      <div className="chart-container">
        <Line
          data={{
            labels: liveMetrics?.timeLabels,
            datasets: [{
              label: '完了率',
              data: liveMetrics?.completionRateData,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          }}
          options={{
            responsive: true,
            animation: false, // リアルタイム更新のため
            scales: {
              y: { beginAtZero: true, max: 100 }
            }
          }}
        />
      </div>

      {/* ステップ別分析 */}
      <div className="step-analysis">
        <Bar
          data={{
            labels: liveMetrics?.stepLabels,
            datasets: [{
              label: '完了者数',
              data: liveMetrics?.stepCompletions,
              backgroundColor: 'rgba(54, 162, 235, 0.6)'
            }]
          }}
        />
      </div>

      {/* エラー分析 */}
      <div className="error-analysis">
        <Pie
          data={{
            labels: liveMetrics?.errorTypes,
            datasets: [{
              data: liveMetrics?.errorCounts,
              backgroundColor: [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
              ]
            }]
          }}
        />
      </div>
    </div>
  );
};

const KPICard: React.FC<{title: string, value: any, trend: number}> = ({
  title, value, trend
}) => (
  <div className="kpi-card">
    <h3>{title}</h3>
    <div className="kpi-value">{value}</div>
    <div className={`kpi-trend ${trend > 0 ? 'positive' : 'negative'}`}>
      {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
    </div>
  </div>
);
```

### 📊 週次・月次レポート

```python
# reports/periodic_reports.py
from jinja2 import Template
import matplotlib.pyplot as plt
import seaborn as sns

class PeriodicReporter:
    def generate_weekly_report(self, week_start: str):
        """週次レポート生成"""
        # データ取得
        metrics = self.analytics.get_weekly_metrics(week_start)
        user_feedback = self.get_user_feedback(week_start)
        feature_usage = self.get_feature_usage(week_start)
        
        # グラフ生成
        self.create_completion_trend_chart(metrics)
        self.create_user_satisfaction_chart(user_feedback)
        self.create_feature_adoption_chart(feature_usage)
        
        # レポート生成
        template = Template(self.weekly_report_template)
        report_html = template.render(
            metrics=metrics,
            feedback=user_feedback,
            features=feature_usage,
            charts=self.chart_paths
        )
        
        return report_html
    
    def generate_monthly_report(self, month: str):
        """月次レポート生成"""
        # 詳細分析
        cohort_analysis = self.analytics.cohort_retention_analysis()
        user_segments = self.analyze_user_segments()
        competitive_analysis = self.get_competitive_metrics()
        
        # 予測分析
        growth_forecast = self.forecast_user_growth()
        churn_prediction = self.predict_user_churn()
        
        return self.compile_executive_report({
            'cohorts': cohort_analysis,
            'segments': user_segments,
            'competitive': competitive_analysis,
            'forecasts': growth_forecast,
            'churn': churn_prediction
        })

    def create_completion_trend_chart(self, metrics):
        """完了率トレンドチャート"""
        plt.figure(figsize=(12, 6))
        
        # 日別完了率
        plt.subplot(1, 2, 1)
        plt.plot(metrics['dates'], metrics['completion_rates'])
        plt.title('Daily Completion Rate')
        plt.ylabel('Completion Rate (%)')
        plt.xticks(rotation=45)
        
        # ステップ別完了率
        plt.subplot(1, 2, 2)
        sns.barplot(data=metrics['step_completion'], x='step', y='rate')
        plt.title('Completion Rate by Step')
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        plt.savefig('charts/completion_trends.png', dpi=300, bbox_inches='tight')
```

## 🤖 機械学習分析

### 🔮 予測分析

```python
# ml/predictive_analytics.py
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib

class LearningPredictor:
    def __init__(self):
        self.completion_model = None
        self.churn_model = None
        self.scaler = StandardScaler()
    
    def train_completion_predictor(self, training_data):
        """完了予測モデル訓練"""
        features = [
            'session_duration', 'attempts_count', 'hints_used',
            'error_rate', 'previous_completion_rate', 'time_of_day'
        ]
        
        X = training_data[features]
        y = training_data['completed']
        
        X_scaled = self.scaler.fit_transform(X)
        
        self.completion_model = RandomForestClassifier(
            n_estimators=100, 
            max_depth=10,
            random_state=42
        )
        self.completion_model.fit(X_scaled, y)
        
        # モデル保存
        joblib.dump(self.completion_model, 'models/completion_predictor.pkl')
        joblib.dump(self.scaler, 'models/feature_scaler.pkl')
    
    def predict_completion_probability(self, user_features):
        """完了確率予測"""
        if not self.completion_model:
            self.completion_model = joblib.load('models/completion_predictor.pkl')
            self.scaler = joblib.load('models/feature_scaler.pkl')
        
        features_scaled = self.scaler.transform([user_features])
        probability = self.completion_model.predict_proba(features_scaled)[0][1]
        
        return {
            'completion_probability': probability,
            'risk_level': 'high' if probability < 0.3 else 'medium' if probability < 0.7 else 'low',
            'recommendations': self.generate_recommendations(probability, user_features)
        }
    
    def generate_recommendations(self, probability, features):
        """個人化推奨事項生成"""
        recommendations = []
        
        if probability < 0.3:
            recommendations.extend([
                "追加のヒントやガイダンスを提供",
                "より簡単なステップから開始することを提案",
                "1対1のサポートセッションを案内"
            ])
        elif probability < 0.7:
            recommendations.extend([
                "進度に応じた励ましメッセージを表示",
                "関連する補足資料を提案",
                "コミュニティでの質問を促進"
            ])
        
        return recommendations
```

---

**🎯 分析の重要ポイント**:
- **リアルタイム性**: 即座の問題発見・対応
- **予測分析**: 問題の事前予防
- **個人化**: ユーザー一人ひとりに最適化された体験
- **継続改善**: データから学び続けるシステム

**✨ 次のステップ**: 基本的な分析から始めて、段階的に高度な機械学習機能を追加していきましょう！