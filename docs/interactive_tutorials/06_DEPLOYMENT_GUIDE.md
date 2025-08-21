# 🚀 デプロイ・インフラ構成ガイド

## 🎯 インフラストラクチャ概要

### 🌍 マルチ環境戦略

```typescript
interface EnvironmentStrategy {
  development: {
    purpose: "ローカル開発・機能テスト";
    infrastructure: "Docker Compose";
    databases: "PostgreSQL + Redis (コンテナ)";
  };
  
  staging: {
    purpose: "統合テスト・ユーザーテスト";
    infrastructure: "Kubernetes (小規模)";
    databases: "マネージドサービス (小容量)";
  };
  
  production: {
    purpose: "本番運用";
    infrastructure: "Kubernetes (HA構成)";
    databases: "マネージドサービス (冗長化)";
  };
}
```

## 🐳 Docker コンテナ戦略

### 📦 マルチステージビルド

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Backend Dockerfile
FROM python:3.11-slim AS base
RUN adduser --disabled-password --gecos '' user
WORKDIR /app
USER user

FROM base AS deps
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM base AS runtime
COPY --from=deps /home/user/.local /home/user/.local
COPY . .
ENV PATH=/home/user/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 🐙 Docker Compose (開発環境)

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/tutorial_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres: {condition: service_healthy}
      redis: {condition: service_healthy}

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: tutorial_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
```

## ☸️ Kubernetes デプロイメント

### 🎯 基本マニフェスト

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: poker-tutorial

---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tutorial-backend
  namespace: poker-tutorial
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tutorial-backend
  template:
    metadata:
      labels:
        app: tutorial-backend
    spec:
      containers:
      - name: backend
        image: poker-tutorial-backend:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 10

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: tutorial-backend-service
  namespace: poker-tutorial
spec:
  selector:
    app: tutorial-backend
  ports:
  - port: 8000
    targetPort: 8000

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tutorial-ingress
  namespace: poker-tutorial
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - tutorial.poker-mcp.com
    secretName: tutorial-tls
  rules:
  - host: tutorial.poker-mcp.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: tutorial-backend-service
            port:
              number: 8000
```

## 🔄 CI/CD パイプライン

### 🚀 GitHub Actions

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        push: true
        tags: poker-tutorial:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Kubernetes
      run: kubectl apply -f k8s/
```

## 📊 監視・アラート

### 🔍 基本監視設定

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'tutorial-backend'
    static_configs:
      - targets: ['tutorial-backend-service:8000']

# alert_rules.yml
groups:
- name: tutorial.rules
  rules:
  - alert: HighResponseTime
    expr: http_request_duration_seconds{quantile="0.95"} > 2
    for: 2m
    annotations:
      summary: "High response time detected"
```

## 🔒 セキュリティ設定

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tutorial-network-policy
spec:
  podSelector:
    matchLabels:
      app: tutorial-backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: tutorial-frontend
    ports:
    - protocol: TCP
      port: 8000
```

## 💾 バックアップ戦略

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # 毎日午前2時
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/bash
            - -c
            - |
              DATE=$(date +%Y%m%d_%H%M%S)
              pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > /backup/backup_$DATE.sql
              aws s3 cp /backup/backup_$DATE.sql s3://poker-tutorial-backups/
```

---

**🎯 重要ポイント**: 

- **段階的デプロイ**: 開発→ステージング→本番の順で安全にリリース
- **自動化**: CI/CDパイプラインで手動作業を最小化
- **監視**: リアルタイムでシステム状態を把握
- **セキュリティ**: 最小権限の原則でアクセス制御
- **バックアップ**: データ損失に備えた定期バックアップ

**✨ 次のステップ**: まずは開発環境でDocker Composeを使って動作確認を行い、その後段階的にKubernetesへ移行しましょう。