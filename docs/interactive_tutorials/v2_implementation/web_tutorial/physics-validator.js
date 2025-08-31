class PhysicsValidator {
    constructor() {
        console.log('✅ PhysicsValidator初期化完了');
    }

    validateJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            return this.validateStructure(data);
        } catch (error) {
            return {
                valid: false,
                message: `JSON構文エラー: ${error.message}`,
                details: 'JSON形式を確認してください'
            };
        }
    }

    validateStructure(data) {
        // JSON-RPC 2.0基本構造チェック
        if (!data.jsonrpc || data.jsonrpc !== "2.0") {
            return {
                valid: false,
                message: 'JSON-RPC 2.0形式ではありません',
                details: '"jsonrpc": "2.0" が必要です'
            };
        }

        if (!data.method) {
            return {
                valid: false,
                message: 'methodが指定されていません',
                details: '"method" フィールドは必須です'
            };
        }

        // メソッド別の詳細検証
        return this.validateMethod(data);
    }

    validateMethod(data) {
        const method = data.method;
        const params = data.params || {};

        switch (method) {
            case 'pokerinput_proposeSource':
                return this.validateSource(params);
            case 'pokerinput_proposeBody':
                return this.validateBody(params);
            case 'pokerinput_proposeZone':
                return this.validateZone(params);
            case 'pokerinput_proposeDetector':
                return this.validateDetector(params);
            case 'pokerinput_applyChanges':
                return this.validateApplyChanges(params);
            default:
                return {
                    valid: true,
                    message: 'メソッドは有効です',
                    details: `${method} メソッドを実行します`
                };
        }
    }

    validateSource(params) {
        if (!params.name) {
            return { valid: false, message: 'nameが必要です' };
        }
        if (!params.type) {
            return { valid: false, message: 'typeが必要です' };
        }
        if (params.type === 'POINT' && !params.position) {
            return { valid: false, message: 'POINT線源にはpositionが必要です' };
        }
        if (!params.inventory || !Array.isArray(params.inventory)) {
            return { valid: false, message: 'inventoryが必要です' };
        }

        return { valid: true, message: '線源パラメータは正常です' };
    }

    validateBody(params) {
        if (!params.name) {
            return { valid: false, message: 'nameが必要です' };
        }
        if (!params.type) {
            return { valid: false, message: 'typeが必要です' };
        }

        const validTypes = ['SPH', 'RCC', 'RPP', 'BOX', 'TOR', 'ELL', 'REC', 'TRC', 'WED'];
        if (!validTypes.includes(params.type)) {
            return { valid: false, message: `無効なtype: ${params.type}` };
        }

        return { valid: true, message: '立体パラメータは正常です' };
    }

    validateZone(params) {
        if (!params.body_name) {
            return { valid: false, message: 'body_nameが必要です' };
        }
        if (!params.material) {
            return { valid: false, message: 'materialが必要です' };
        }

        return { valid: true, message: 'ゾーンパラメータは正常です' };
    }

    validateDetector(params) {
        if (!params.name) {
            return { valid: false, message: 'nameが必要です' };
        }
        if (!params.origin) {
            return { valid: false, message: 'originが必要です' };
        }

        return { valid: true, message: '検出器パラメータは正常です' };
    }

    validateApplyChanges(params) {
        return { valid: true, message: '変更適用パラメータは正常です' };
    }

    // 物理的妥当性チェック
    validatePhysics(method, params) {
        switch (method) {
            case 'pokerinput_proposeSource':
                return this.validateSourcePhysics(params);
            default:
                return { valid: true, message: '物理的に妥当です' };
        }
    }

    validateSourcePhysics(params) {
        if (params.inventory) {
            for (const item of params.inventory) {
                if (item.radioactivity && item.radioactivity > 1e15) {
                    return {
                        valid: false,
                        message: '放射能が非常に大きすぎます',
                        details: '現実的な値を確認してください'
                    };
                }
            }
        }

        return { valid: true, message: '物理的に妥当な線源です' };
    }
}

// グローバル登録
if (typeof window !== 'undefined') {
    window.PhysicsValidator = PhysicsValidator;
}

console.log('📐 PhysicsValidator読み込み完了');
