// CMB専用バリデーションクラス
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class CMBValidator {
  /**
   * CMB演算式の完全バリデーション
   * @param {string} expression - 演算式
   * @param {string} cmbName - CMB立体名
   * @param {Array} existingBodies - 既存立体一覧
   * @returns {object} バリデーション結果
   */
  static validateExpression(expression, cmbName, existingBodies) {
    // 1. 基本構文チェック
    this.validateBasicSyntax(expression);
    
    // 2. 中間記法チェック（新規追加）
    this.validateInfixNotation(expression);
    
    // 3. 立体名抽出と存在確認
    const referencedBodies = this.extractBodyNames(expression);
    this.validateReferencedBodies(referencedBodies, existingBodies);
    
    // 4. 循環参照チェック
    this.checkCircularReference(cmbName, referencedBodies, existingBodies);
    
    return {
      valid: true,
      referencedBodies,
      warnings: this.generateWarnings(referencedBodies, existingBodies)
    };
  }

  /**
   * 基本構文チェック
   */
  static validateBasicSyntax(expression) {
    // 空文字チェック
    if (!expression || expression.trim() === '') {
      throw new ValidationError(
        'CMB演算式は空にできません',
        'expression',
        expression
      );
    }

    // 使用可能文字チェック（マニフェストのpatternと一致）
    const allowedChars = /^[a-zA-Z0-9_()\s+&-]+$/;
    if (!allowedChars.test(expression)) {
      throw new ValidationError(
        'CMB演算式に不正な文字が含まれています。使用可能: 英数字、アンダースコア、括弧、演算子(+,-,&)',
        'expression',
        expression
      );
    }

    // 禁止演算子チェック
    const forbiddenOperators = ['*', '/', '^', '|'];
    for (const op of forbiddenOperators) {
      if (expression.includes(op)) {
        throw new ValidationError(
          `禁止された演算子 '${op}' が使用されています。使用可能: +, -, &`,
          'expression',
          expression
        );
      }
    }

    // 括弧バランスチェック
    this.validateParentheses(expression);
  }

  /**
   * 括弧バランスの確認
   */
  static validateParentheses(expression) {
    let balance = 0;
    for (const char of expression) {
      if (char === '(') balance++;
      if (char === ')') balance--;
      if (balance < 0) {
        throw new ValidationError(
          '括弧が正しく対応していません',
          'expression',
          expression
        );
      }
    }
    if (balance !== 0) {
      throw new ValidationError(
        '括弧が正しく対応していません',
        'expression', 
        expression
      );
    }
  }

  /**
   * 中間記法の検証
   */
  static validateInfixNotation(expression) {
    logger.info('CMB式の中間記法検証開始', { expression });
    
    // トークン化（演算子、括弧、立体名に分割）
    const tokens = this.tokenize(expression);
    logger.debug('トークン化結果', { tokens });
    
    // トークンが空の場合
    if (tokens.length === 0) {
      throw new ValidationError(
        'CMB演算式が空です',
        'expression',
        expression
      );
    }
    
    // 単一トークンの場合（演算子なし）
    if (tokens.length === 1) {
      throw new ValidationError(
        'CMB演算式には少なくとも1つの演算子が必要です',
        'expression',
        expression
      );
    }
    
    // 中間記法パターンの検証
    this.checkInfixPattern(tokens, expression);
    logger.info('CMB式の中間記法検証完了');
  }

  /**
   * 演算式をトークン化
   */
  static tokenize(expression) {
    const tokens = [];
    let current = '';
    
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      
      if (char === ' ' || char === '\t') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else if ('+-&()'.includes(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        tokens.push(char);
      } else {
        current += char;
      }
    }
    
    if (current) {
      tokens.push(current);
    }
    
    return tokens;
  }

  /**
   * 中間記法パターンのチェック
   */
  static checkInfixPattern(tokens, originalExpression) {
    let expectOperand = true;
    let parenDepth = 0;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const isOperator = '+-&'.includes(token);
      const isOpenParen = token === '(';
      const isCloseParen = token === ')';
      
      if (isOpenParen) {
        parenDepth++;
        expectOperand = true;
      } else if (isCloseParen) {
        parenDepth--;
        if (expectOperand) {
          throw new ValidationError(
            `空の括弧または演算子の直後に閉じ括弧があります: 位置 ${i + 1}`,
            'expression',
            originalExpression
          );
        }
        expectOperand = false;
      } else if (isOperator) {
        if (expectOperand) {
          throw new ValidationError(
            `演算子 '${token}' の前に被演算子がありません（逆ポーランド記法は使用できません）`,
            'expression',
            originalExpression
          );
        }
        if (i === tokens.length - 1) {
          throw new ValidationError(
            `演算子 '${token}' が式の末尾にあります（逆ポーランド記法は使用できません）`,
            'expression',
            originalExpression
          );
        }
        expectOperand = true;
      } else {
        // 被演算子（立体名）
        if (!expectOperand) {
          throw new ValidationError(
            `演算子なしで連続する被演算子があります: '${tokens[i-1]}' '${token}'`,
            'expression',
            originalExpression
          );
        }
        expectOperand = false;
      }
    }
    
    if (expectOperand && parenDepth === 0) {
      throw new ValidationError(
        '式が演算子で終わっています（中間記法では被演算子で終わる必要があります）',
        'expression',
        originalExpression
      );
    }
  }

  /**
   * 演算式から立体名を抽出
   */
  static extractBodyNames(expression) {
    // トークン化してから立体名のみを抽出
    const tokens = this.tokenize(expression);
    const bodyNames = [];
    
    for (const token of tokens) {
      // 演算子と括弧以外が立体名
      if (!'+-&()'.includes(token)) {
        bodyNames.push(token);
      }
    }
    
    return [...new Set(bodyNames)]; // 重複除去
  }

  /**
   * 参照立体の存在確認
   */
  static validateReferencedBodies(referencedBodies, existingBodies) {
    const existingBodyNames = existingBodies.map(body => body.name || body);
    const missingBodies = referencedBodies.filter(
      name => !existingBodyNames.includes(name)
    );

    if (missingBodies.length > 0) {
      throw new ValidationError(
        `演算式で参照されている立体が存在しません: ${missingBodies.join(', ')}`,
        'expression',
        referencedBodies
      );
    }
  }

  /**
   * 循環参照チェック
   */
  static checkCircularReference(cmbName, referencedBodies, allBodies) {
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (bodyName, depth = 0) => {
      if (depth > 10) { // 最大深度制限
        throw new ValidationError(
          'CMB演算式の参照が複雑すぎます（最大深度10を超過）',
          'expression',
          bodyName
        );
      }

      if (recursionStack.has(bodyName)) {
        return true; // 循環検出
      }

      if (visited.has(bodyName)) {
        return false; // 既に処理済み
      }

      visited.add(bodyName);
      recursionStack.add(bodyName);

      // この立体が参照している他の立体をチェック
      const body = allBodies.find(b => (b.name || b) === bodyName);
      if (body && body.type === 'CMB') {
        const referencedInThis = this.extractBodyNames(body.expression);
        for (const ref of referencedInThis) {
          if (hasCycle(ref, depth + 1)) {
            return true;
          }
        }
      }

      recursionStack.delete(bodyName);
      return false;
    };

    // 参照される立体から循環をチェック
    for (const refBody of referencedBodies) {
      if (hasCycle(refBody)) {
        throw new ValidationError(
          `CMB演算式で循環参照が検出されました: ${cmbName} → ${referencedBodies.join(' → ')}`,
          'expression',
          cmbName
        );
      }
    }
  }

  /**
   * 警告の生成
   */
  static generateWarnings(referencedBodies, existingBodies) {
    const warnings = [];
    
    // VOID材料との組み合わせ警告などを実装
    // TODO: 材料情報が必要な場合は後で実装
    
    return warnings;
  }
}
