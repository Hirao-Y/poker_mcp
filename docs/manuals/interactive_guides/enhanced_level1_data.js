// =============== データベース定義（完全版）===============

// 核種データベース（放射線遮蔽研究用）
const physicsDatabase = {
    nuclides: {
        Co60: {
            name: 'コバルト-60',
            energy: 1.25, // MeV (平均)
            gammaConstant: 0.351, // μSv·m²/(h·GBq)
            halfLife: 5.27, // 年
            description: '医療用治療、工業用ガンマ線検査',
            color: '#ff4444'
        },
        Cs137: {
            name: 'セシウム-137', 
            energy: 0.662, // MeV
            gammaConstant: 0.092, // μSv·m²/(h·GBq)
            halfLife: 30.17, // 年
            description: '校正用線源、医療用照射',
            color: '#44ff44'
        },
        Ir192: {
            name: 'イリジウム-192',
            energy: 0.38, // MeV (平均)
            gammaConstant: 0.125, // μSv·m²/(h·GBq)
            halfLife: 0.202, // 年（73.8日）
            description: '工業用ラジオグラフィ、治療用線源',
            color: '#ffaa44'
        },
        I131: {
            name: 'ヨウ素-131',
            energy: 0.364, // MeV
            gammaConstant: 0.061, // μSv·m²/(h·GBq)
            halfLife: 0.022, // 年（8.02日）
            description: '核医学治療、甲状腺機能検査',
            color: '#aa44ff'
        },
        Tc99m: {
            name: 'テクネチウム-99m',
            energy: 0.140, // MeV
            gammaConstant: 0.022, // μSv·m²/(h·GBq)
            halfLife: 6.01e-6, // 年（6.01時間）
            description: '核医学診断用、SPECT撮像',
            color: '#44aaff'
        }
    },
    materials: {
        concrete: {
            name: 'コンクリート',
            density: 2.3, // g/cm³
            muMass: 0.0636, // cm²/g (Co-60)
            color: 0x888888,
            cost: 50, // 相対コスト/m³
            description: '一般的な遮蔽材、コスト効果良好'
        },
        lead: {
            name: '鉛',
            density: 11.34, // g/cm³
            muMass: 0.0570, // cm²/g (Co-60)
            color: 0x666699,
            cost: 2000, // 相対コスト/m³
            description: '高効率遮蔽材、重量・コスト高'
        },
        steel: {
            name: '鋼鉄',
            density: 7.87, // g/cm³
            muMass: 0.0675, // cm²/g (Co-60)
            color: 0x999999,
            cost: 800, // 相対コスト/m³
            description: '構造用、機械的強度良好'
        },
        aluminum: {
            name: 'アルミニウム',
            density: 2.70, // g/cm³
            muMass: 0.0768, // cm²/g (Co-60)
            color: 0xcccccc,
            cost: 1200, // 相対コスト/m³
            description: '軽量、低エネルギーガンマ線用'
        },
        tungsten: {
            name: 'タングステン',
            density: 19.3, // g/cm³
            muMass: 0.0350, // cm²/g (Co-60)
            color: 0x444444,
            cost: 15000, // 相対コスト/m³
            description: '最高密度、特殊用途'
        }
    }
};

// シナリオデータベース（4分野対応）
const scenarioData = {
    medical: {
        name: '医療施設',
        icon: '🏥',
        color: '#059669',
        rgb: '5, 150, 105',
        theme: 'medical-theme',
        safetyLimit: 2.5, // μSv/h (管理区域境界)
        nuclides: ['Co60', 'Cs137', 'I131', 'Tc99m'],
        context: {
            title: '医療施設での遮蔽設計',
            description: `病院の診療放射線科で使用される放射線治療装置や診断機器の遮蔽設計を例に、
                       放射線遮蔽の基本原理を学習します。患者・医療従事者・一般公衆の安全確保が最優先事項です。`,
            limits: `<strong>職業被ばく:</strong> 20 mSv/年（5年平均）<br>
                   <strong>公衆被ばく:</strong> 1 mSv/年<br>
                   <strong>管理区域境界:</strong> 2.5 μSv/h（医療施設基準値）`,
            params: {
                title: '医療施設パラメータ',
                description: '病院のCo-60治療室を想定した実践的なパラメータ設定。実際の医療施設での安全基準に基づいた計算を行います。'
            }
        }
    },
    research: {
        name: '研究施設',
        icon: '🔬',
        color: '#7c3aed',
        rgb: '124, 58, 237',
        theme: 'research-theme',
        safetyLimit: 1.0, // μSv/h (より厳格)
        nuclides: ['Cs137', 'Co60', 'Ir192'],
        context: {
            title: '研究施設での実験環境',
            description: `大学や研究機関での放射線実験における遮蔽計画を学習します。
                       研究者の安全と実験の正確性の両立が重要です。`,
            limits: `<strong>研究者被ばく:</strong> 20 mSv/年<br>
                   <strong>学生被ばく:</strong> 1 mSv/年<br>
                   <strong>実験室境界:</strong> 1.0 μSv/h（研究基準）`,
            params: {
                title: '研究施設パラメータ',
                description: '実験室でのRI使用を想定。研究の精度と安全性を両立する遮蔽設計を体験します。'
            }
        }
    },
    nuclear: {
        name: '原子力施設',
        icon: '⚛️',
        color: '#ea580c',
        rgb: '234, 88, 12',
        theme: 'nuclear-theme',
        safetyLimit: 1.0, // μSv/h
        nuclides: ['Co60', 'Cs137'],
        context: {
            title: '原子力施設の安全管理',
            description: `原子力発電所や核燃料施設での大規模遮蔽設計を学習します。
                       高い安全基準と長期運用を考慮した設計が必要です。`,
            limits: `<strong>作業者被ばく:</strong> 20 mSv/年<br>
                   <strong>一般公衆:</strong> 1 mSv/年<br>
                   <strong>敷地境界:</strong> 1.0 μSv/h（原子力基準）`,
            params: {
                title: '原子力施設パラメータ',
                description: '原子力発電所の放射線管理区域を想定。高い安全基準に適合する遮蔽設計を実践します。'
            }
        }
    },
    industrial: {
        name: '工業施設',
        icon: '🏭',
        color: '#0891b2',
        rgb: '8, 145, 178',
        theme: 'industrial-theme',
        safetyLimit: 2.0, // μSv/h
        nuclides: ['Ir192', 'Co60', 'Cs137'],
        context: {
            title: '工業用放射線利用施設',
            description: `工場での非破壊検査や照射施設における遮蔽設計を学習します。
                       作業効率と安全性のバランスが重要です。`,
            limits: `<strong>作業者被ばく:</strong> 20 mSv/年<br>
                   <strong>一般作業員:</strong> 1 mSv/年<br>
                   <strong>工場境界:</strong> 2.0 μSv/h（工業基準）`,
            params: {
                title: '工業施設パラメータ',
                description: '工業用ガンマ線検査施設を想定。効率的な作業と確実な安全確保を両立する設計を体験します。'
            }
        }
    }
};

// ステージデータベース（4段階学習プロセス）
const stageData = {
    1: {
        title: "Stage 1: 物理基礎 - 放射線と物質の相互作用",
        icon: '🔬',
        color: '#3b82f6',
        objectives: [
            '基本減衰法則の理解',
            'パラメータの物理的意味',
            '実際の計算実行',
            '結果の安全性評価'
        ],
        content: {
            title: '遮蔽の基本原理',
            description: `放射線遮蔽は、<strong>光子と原子核・電子の相互作用</strong>により、放射線強度を系統的に減衰させる物理現象です。
                        <br><br>主要な相互作用：
                        <br>• <strong>光電効果</strong>: 低エネルギー領域で支配的
                        <br>• <strong>コンプトン散乱</strong>: 中エネルギー領域で重要  
                        <br>• <strong>電子対生成</strong>: 高エネルギー領域（1.02 MeV以上）`
        },
        theory: "放射線遮蔽の基本は、光子と物質の相互作用による指数関数的減衰です。ビルドアップ効果により散乱線の寄与も考慮します。",
        examples: [
            "Co-60医療線源の遮蔽厚さ計算",
            "コンクリート壁の設計厚み決定",
            "安全基準との比較評価"
        ]
    },
    2: {
        title: "Stage 2: 材料特性 - 遮蔽効果と材料選択",
        icon: '🧪',
        color: '#f59e0b',
        objectives: [
            '線減衰係数の理解',
            '材料密度の影響評価',
            'HVL・TVLの実用活用',
            '材料コスト比較'
        ],
        content: {
            title: '材料特性と遮蔽効果',
            description: `遮蔽材料の選択は、<strong>密度</strong>、<strong>原子番号</strong>、<strong>コスト</strong>、<strong>加工性</strong>を総合的に評価して行います。
                        <br><br>重要な考慮点：
                        <br>• <strong>高密度材料</strong>: 薄い厚さで高い遮蔽効果
                        <br>• <strong>施工性</strong>: 加工・設置の容易さ
                        <br>• <strong>長期安定性</strong>: 劣化・腐食耐性`
        },
        theory: "材料の線減衰係数は密度と質量減衰係数の積で決まり、遮蔽効果を定量化します。材料選択では物理特性と経済性を両立させます。",
        examples: [
            "鉛とコンクリートの遮蔽効果比較",
            "重量制約下での最適材料選択",
            "コスト効果分析"
        ]
    },
    3: {
        title: "Stage 3: 設計手法 - 実用的な遮蔽設計",
        icon: '🛠️',
        color: '#10b981',
        objectives: [
            '設計厚さの系統的計算',
            '安全余裕の適切な設定',
            '複合遮蔽の効果評価',
            '実用設計の最適化'
        ],
        content: {
            title: '実用的な設計手法',
            description: `実際の遮蔽設計では、<strong>安全余裕</strong>、<strong>施工精度</strong>、<strong>将来の用途変更</strong>を考慮した設計厚さを決定します。
                        <br><br>設計プロセス：
                        <br>• <strong>基本厚さ</strong>: 理論計算による必要最小厚
                        <br>• <strong>安全余裕</strong>: 通常20-30%を追加
                        <br>• <strong>施工誤差</strong>: 実際の施工精度を考慮`
        },
        theory: "実用設計では理論値に安全余裕を加え、施工精度・材料特性のばらつき・将来の利用変更を考慮した余裕のある設計を行います。",
        examples: [
            "治療室遮蔽壁の設計厚さ計算",
            "安全余裕を含む実用設計",
            "複数材料組み合わせの最適化"
        ]
    },
    4: {
        title: "Stage 4: 評価・最適化 - 結果検証と改善",
        icon: '📊',
        color: '#8b5cf6',
        objectives: [
            '計算結果の妥当性確認',
            '不確かさ評価の実施',
            '多目的最適化の実行',
            '総合的な性能評価'
        ],
        content: {
            title: '結果評価と最適化',
            description: `設計結果の<strong>妥当性確認</strong>と<strong>最適化</strong>により、安全で経済的な遮蔽設計を完成させます。
                        <br><br>評価項目：
                        <br>• <strong>安全性</strong>: 基準値との比較、余裕度
                        <br>• <strong>経済性</strong>: 材料費、施工費、維持費
                        <br>• <strong>実用性</strong>: 運用面での利便性`
        },
        theory: "計算結果の妥当性確認は遮蔽設計の最重要工程です。不確かさ評価、感度解析、ベンチマーク比較により品質を保証し、必要に応じて設計を最適化します。",
        examples: [
            "モンテカルロ法との比較検証",
            "不確かさ伝播解析",
            "多目的最適化による改善"
        ]
    }
};

// 計算式データベース
const equationDatabase = {
    1: {
        primary: {
            formula: 'I = I₀ × e<sup>(-μt)</sup> × B(μt)',
            description: '基本減衰法則（ビルドアップ効果含む）'
        },
        secondary: [
            {
                formula: 'I₀ = A × Γ / (4πr²)',
                description: '点線源からの初期線量率（逆二乗則）'
            },
            {
                formula: 'B(μt) = 1 + (b-1) × μt × e^(-μt)',
                description: 'ビルドアップ係数の近似式'
            }
        ]
    },
    2: {
        primary: {
            formula: 'μ = (μ/ρ) × ρ = Σᵢ ωᵢ(μ/ρ)ᵢ × ρ',
            description: '線減衰係数と材料組成の関係'
        },
        secondary: [
            {
                formula: 'HVL = ln(2) / μ',
                description: '半価層（線量を半分にする厚さ）'
            },
            {
                formula: 'TVL = ln(10) / μ',
                description: '1/10価層（線量を1/10にする厚さ）'
            }
        ]
    },
    3: {
        primary: {
            formula: 't = ln(I₀/I_target) / μ_eff + t_margin',
            description: '設計厚さ計算式（安全余裕含む）'
        },
        secondary: [
            {
                formula: 'I_target = I_limit × SF',
                description: '設計目標値（安全係数SF=0.8程度）'
            },
            {
                formula: 'Cost = C_material × V + C_labor × t_construct',
                description: 'コスト評価式'
            }
        ]
    },
    4: {
        primary: {
            formula: 'σ_I = √((∂I/∂t)²σₜ² + (∂I/∂μ)²σμ² + (∂I/∂A)²σₐ²)',
            description: '線量率の不確かさ伝播法則'
        },
        secondary: [
            {
                formula: 'CV = σ_I / I × 100%',
                description: '変動係数（相対不確かさ）'
            },
            {
                formula: 'χ² = Σᵢ((I_calc - I_measured)/σᵢ)²',
                description: 'カイ二乗適合度検定'
            }
        ]
    }
};

// シナリオ別初期設定
const scenarioDefaults = {
    medical: {
        nuclide: 'Co60',
        activity: 37, // GBq (1 Ci)
        material: 'concrete',
        thickness: 50,
        distance: 100,
        target: 'patient_safety'
    },
    research: {
        nuclide: 'Cs137',
        activity: 1, // GBq
        material: 'lead',
        thickness: 5,
        distance: 50,
        target: 'researcher_safety'
    },
    nuclear: {
        nuclide: 'Co60',
        activity: 370, // GBq (10 Ci)
        material: 'concrete',
        thickness: 100,
        distance: 200,
        target: 'public_safety'
    },
    industrial: {
        nuclide: 'Ir192',
        activity: 185, // GBq (5 Ci)
        material: 'steel',
        thickness: 20,
        distance: 100,
        target: 'worker_safety'
    }
};

// レスポンシブ設定
const responsiveBreakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1200,
    wide: 1400
};

// アニメーション設定
const animationConfig = {
    durations: {
        stageTransition: 1000,
        panelSlide: 500,
        buttonHover: 300,
        particleLife: 3000
    },
    easings: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        elastic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }
};

// 品質保証データ
const qualityAssurance = {
    benchmarkProblems: {
        'Co60_concrete': {
            description: 'Co-60線源、コンクリート遮蔽の標準問題',
            reference: 'NCRP Report 144',
            tolerance: 0.15 // 15%以内の一致を要求
        },
        'Cs137_lead': {
            description: 'Cs-137線源、鉛遮蔽の標準問題',
            reference: 'ANSI/ANS-6.4.3',
            tolerance: 0.10 // 10%以内の一致を要求
        }
    },
    validationCriteria: {
        unitConsistency: true,
        physicalReasonableness: true,
        numericalStability: true,
        benchmarkComparison: true
    }
};

// 学習支援データ
const learningSupport = {
    hints: {
        stage1: [
            "💡 放射線は距離の2乗に反比例して減衰します（逆二乗則）",
            "📚 指数関数的減衰が放射線遮蔽の基本原理です",
            "🔬 ビルドアップ係数は散乱線の寄与を表現します",
            "⚡ エネルギーが高いほど透過力が強くなります"
        ],
        stage2: [
            "🧪 密度が高い材料ほど遮蔽効果が高くなります",
            "📏 HVL（半価層）は材料比較の便利な指標です",
            "💰 コストと遮蔽効果のバランスが重要です",
            "🏗️ 施工性も材料選択の重要な要因です"
        ],
        stage3: [
            "📐 安全余裕は通常20-30%程度が適切です",
            "🎯 設計目標を明確に設定することが大切です",
            "🔧 施工誤差も考慮した設計が必要です",
            "📊 複数の設計案を比較検討しましょう"
        ],
        stage4: [
            "✅ 計算結果の妥当性を常に確認しましょう",
            "📈 感度解析で重要パラメータを特定できます",
            "🎯 多目的最適化で最良の設計を見つけられます",
            "📋 品質管理記録は設計の信頼性を保証します"
        ]
    },
    commonMistakes: [
        "単位の不整合（GBq↔MBq、cm↔m）",
        "ビルドアップ係数の省略",
        "安全余裕の不足",
        "散乱線の考慮不足"
    ],
    bestPractices: [
        "計算前に単位系を統一する",
        "複数の方法で結果を検証する", 
        "文献値との比較を行う",
        "設計記録を詳細に保管する"
    ]
};

// 実験・演習データ
const exerciseData = {
    basicExercises: [
        {
            name: "医療用Co-60治療室",
            scenario: "medical",
            params: { nuclide: "Co60", activity: 37, distance: 100 },
            target: "コンクリート厚さを決定し、2.5 μSv/h以下にする",
            expectedResult: "約45-55cm"
        },
        {
            name: "研究用Cs-137実験室",
            scenario: "research", 
            params: { nuclide: "Cs137", activity: 1, distance: 50 },
            target: "鉛遮蔽で1.0 μSv/h以下にする",
            expectedResult: "約2-3cm"
        }
    ],
    challengeProblems: [
        {
            name: "多層遮蔽の最適化",
            description: "鉛＋コンクリートの組み合わせで最小コストを実現",
            difficulty: "上級",
            timeLimit: 15 // 分
        },
        {
            name: "移動線源の遮蔽設計",
            description: "線源位置が変わる場合の最悪ケース設計",
            difficulty: "応用",
            timeLimit: 10 // 分
        }
    ]
};

// 研究者向け拡張データ
const researchExtensions = {
    advancedTopics: [
        "スカイシャイン線の影響評価",
        "非等方性散乱の考慮",
        "エネルギー依存性の詳細解析",
        "材料組成最適化手法"
    ],
    codeIntegration: [
        "MCNP6.2連携手順",
        "EGS5計算結果比較",
        "PHITS入力ファイル生成",
        "GEANT4シミュレーション"
    ],
    publicationSupport: [
        "計算手法の妥当性証明",
        "不確かさ評価の定量化",
        "論文用図表の自動生成",
        "査読対応のための詳細記録"
    ]
};

// デバッグ・開発支援
const debugSupport = {
    calculationSteps: true,
    intermediateValues: true,
    validationChecks: true,
    performanceMonitoring: true,
    errorLogging: true
};

console.log('📊 Enhanced Level 1 Data - Loaded successfully');
console.log(`✓ ${Object.keys(physicsDatabase.nuclides).length} nuclides, ${Object.keys(physicsDatabase.materials).length} materials`);
console.log(`✓ ${Object.keys(scenarioData).length} scenarios, ${Object.keys(stageData).length} stages`);
console.log(`✓ Quality assurance: ${Object.keys(qualityAssurance.benchmarkProblems).length} benchmark problems`);
console.log('🎯 Ready for radiation shielding education!');