# 🎮 ゲーミフィケーション設計ドキュメント

## 🏆 成果システム（Achievement System）

### 📊 成果カテゴリ設計

#### 🥇 基礎スキル成果
```javascript
const basicAchievements = {
  // 線源管理
  'first_source': {
    name: '初回線源作成',
    description: '最初の線源を正常に作成する',
    icon: '🥇',
    points: 100,
    rarity: 'common'
  },
  'source_master': {
    name: '線源マスター',
    description: '10個の異なる線源を作成する',
    icon: '⭐',
    points: 500,
    rarity: 'rare',
    requirement: { count: 10, type: 'unique_sources' }
  },
  'update_expert': {
    name: '更新エキスパート',
    description: 'updateSource を50回成功させる',
    icon: '🔄',
    points: 300,
    rarity: 'uncommon'
  },

  // 立体管理
  'geometry_novice': {
    name: '幾何学初心者',
    description: '基本立体（SPH, RCC, RPP）をすべて作成',
    icon: '📐',
    points: 200,
    rarity: 'common'
  },
  'complex_modeler': {
    name: '複合モデラー', 
    description: 'CMBを使用して複雑な立体を作成',
    icon: '🏗️',
    points: 750,
    rarity: 'epic'
  },

  // 実験・研究
  'first_experiment': {
    name: '実験デビュー',
    description: '初回の実験ワークフローを完了',
    icon: '🧪',
    points: 300,
    rarity: 'uncommon'
  },
  'research_veteran': {
    name: '研究ベテラン',
    description: '5つの異なる実験ワークフローを完了',
    icon: '🔬',
    points: 1000,
    rarity: 'legendary'
  }
};
```

#### 🏅 スペシャル成果
```javascript
const specialAchievements = {
  // 速度・効率性
  'speed_demon': {
    name: 'スピードデーモン',
    description: '基本チュートリアルを5分以内で完了',
    icon: '⚡',
    points: 400,
    rarity: 'rare',
    hidden: true // 隠し成果
  },
  'efficiency_expert': {
    name: '効率エキスパート',
    description: 'エラーなしで連続10タスク完了',
    icon: '🎯',
    points: 600,
    rarity: 'epic'
  },

  // 探究・発見
  'easter_egg_hunter': {
    name: 'イースターエッグハンター',
    description: '隠し機能を3つ発見',
    icon: '🥚',
    points: 500,
    rarity: 'rare',
    hidden: true
  },
  'api_explorer': {
    name: 'API探検家',
    description: 'マニュアルにない機能を発見',
    icon: '🗺️',
    points: 800,
    rarity: 'epic'
  },

  // 社会的
  'helpful_mentor': {
    name: '親切なメンター',
    description: '他の学習者を10回サポート',
    icon: '🤝',
    points: 1000,
    rarity: 'legendary',
    social: true
  },
  'knowledge_sharer': {
    name: '知識の共有者',
    description: '有用なTipsを5つ投稿し、コミュニティから高評価を獲得',
    icon: '📚',
    points: 750,
    rarity: 'epic',
    social: true
  }
};
```

## 🎖️ レベルシステム

### 📈 経験値とレベル設計
```javascript
const levelSystem = {
  levels: [
    { level: 1, xp: 0, title: '初心者', color: '#94a3b8' },
    { level: 2, xp: 500, title: '見習い', color: '#22c55e' },
    { level: 3, xp: 1200, title: '学習者', color: '#3b82f6' },
    { level: 4, xp: 2000, title: '実践者', color: '#8b5cf6' },
    { level: 5, xp: 3000, title: '熟練者', color: '#f59e0b' },
    { level: 10, xp: 8000, title: 'エキスパート', color: '#ef4444' },
    { level: 15, xp: 15000, title: 'マスター', color: '#dc2626' },
    { level: 20, xp: 25000, title: 'グランドマスター', color: '#7c2d12' },
    { level: 25, xp: 40000, title: 'レジェンド', color: '#fbbf24', special: true }
  ],
  
  // レベルアップ特典
  levelRewards: {
    2: { type: 'feature_unlock', value: 'advanced_editor' },
    3: { type: 'cosmetic', value: 'custom_avatar_border' },
    5: { type: 'feature_unlock', value: '3d_visualizer' },
    10: { type: 'title', value: 'API Master' },
    15: { type: 'feature_unlock', value: 'ai_assistant' },
    20: { type: 'cosmetic', value: 'legendary_theme' },
    25: { type: 'all', value: 'ultimate_access' }
  }
};
```

**🎮 ゲーミフィケーションで学習が「勉強」から「楽しい体験」に変わります！**

**✨ 重要ポイント**: 成果やレベルは学習動機を高める手段であり、目的ではありません。常に「実際のスキル習得」が最終目標であることを忘れずに設計しましょう。
