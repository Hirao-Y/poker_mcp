  // Unit操作 - 4キー完全性保証機能強化版
  async proposeUnit(length, angle, density, radioactivity) {
    try {
      // 4キー完全構造の構築
      const unitData = {
        length,
        angle, 
        density,
        radioactivity
      };
      
      // UnitValidatorによる4キー完全性検証
      UnitValidator.validateFourKeyCompleteness(unitData);
      
      // 既存単位設定の確認
      if (this.data.unit) {
        throw PokerMcpError.duplicateName('unit', 'unit section already exists');
      }
      
      // 物理的整合性検証
      const physicalConsistency = UnitValidator.validatePhysicalConsistency(unitData);
      
      // データ正規化
      const normalizedUnit = UnitValidator.normalizeUnitStructure(unitData);
      
      await this.dataManager.addPendingChange({
        action: 'proposeUnit',
        data: normalizedUnit
      });
      
      logger.info('4キー完全単位設定を提案しました', {
        unitData: normalizedUnit,
        physicalConsistency: physicalConsistency.isConsistent,
        warnings: physicalConsistency.warnings.length
      });
      
      let responseMessage = '提案: 単位設定を追加（4キー完全性保証）';
      
      if (physicalConsistency.warnings.length > 0) {
        const warningTypes = physicalConsistency.warnings.map(w => w.type);
        responseMessage += ` - 警告: ${warningTypes.join(', ')}`;
      }
      
      return responseMessage;
      
    } catch (error) {
      logger.error('単位設定提案エラー', { unitData: { length, angle, density, radioactivity }, error: error.message });
      throw error;
    }
  }

  async getUnit() {
    try {
      if (!this.data.unit) {
        throw new ValidationError('単位設定が存在しません', 'unit', null);
      }
      
      // 4キー完全性の事後検証
      UnitValidator.validateFourKeyCompleteness(this.data.unit);
      
      logger.info('4キー完全単位設定を取得しました', { unit: this.data.unit });
      
      return {
        unit: this.data.unit,
        integrity: '4-key-complete',
        keys: Object.keys(this.data.unit)
      };
      
    } catch (error) {
      logger.error('単位設定取得エラー', { error: error.message });
      throw error;
    }
  }

  async updateUnit(updates) {
    try {
      if (!this.data.unit) {
        throw new ValidationError('単位設定が存在しません', 'unit', null);
      }
      
      // 部分更新での4キー保持検証
      const validationResult = UnitValidator.validatePartialUpdate(this.data.unit, updates);
      
      // 更新後の物理的整合性検証
      const physicalConsistency = UnitValidator.validatePhysicalConsistency(validationResult.updatedStructure);
      
      // データ正規化
      const normalizedUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        normalizedUpdates[key] = value.trim();
        UnitValidator.validateSingleUnitKey(key, normalizedUpdates[key]);
      }
      
      await this.dataManager.addPendingChange({
        action: 'updateUnit',
        data: normalizedUpdates
      });
      
      logger.info('4キー保持単位更新を提案しました', {
        updates: normalizedUpdates,
        preservedIntegrity: validationResult.preservedIntegrity,
        changedKeys: validationResult.changedKeys,
        physicalConsistency: physicalConsistency.isConsistent
      });
      
      let responseMessage = `提案: 単位設定の更新（${validationResult.changedKeys.join(', ')}）- 4キー完全性保持`;
      
      if (physicalConsistency.warnings.length > 0) {
        const warningTypes = physicalConsistency.warnings.map(w => w.type);
        responseMessage += ` - 警告: ${warningTypes.join(', ')}`;
      }
      
      return responseMessage;
      
    } catch (error) {
      logger.error('単位設定更新エラー', { updates, error: error.message });
      throw error;
    }
  }

  /**
   * 単位系の4キー完全性と物理的整合性を包括検証
   */
  async validateUnitIntegrity(includeSystemAnalysis = true, generateReport = true) {
    try {
      if (!this.data.unit) {
        throw new ValidationError('単位設定が存在しません。検証には単位設定が必要です', 'unit', null);
      }
      
      let report = null;
      if (generateReport) {
        report = UnitValidator.generateIntegrityDiagnosticReport(
          this.data.unit, 
          includeSystemAnalysis ? this.data : null
        );
      }
      
      // 基本4キー完全性検証
      UnitValidator.validateFourKeyCompleteness(this.data.unit);
      
      // 物理的整合性検証
      const physicalConsistency = UnitValidator.validatePhysicalConsistency(this.data.unit);
      
      // システム整合性検証
      let systemIntegrity = null;
      if (includeSystemAnalysis) {
        systemIntegrity = UnitValidator.validateSystemUnitIntegrity(this.data.unit, this.data);
      }
      
      logger.info('単位系完全性検証を実行しました', {
        hasAllFourKeys: true,
        physicalConsistency: physicalConsistency.isConsistent,
        warningCount: physicalConsistency.warnings.length,
        systemAnalysis: !!systemIntegrity
      });
      
      return {
        integrity: 'verified',
        fourKeyComplete: true,
        physicalConsistency,
        systemIntegrity,
        diagnosticReport: report,
        summary: {
          overallHealth: report ? report.overallHealth : 'verified',
          criticalIssues: report ? report.criticalIssues.length : 0,
          warnings: physicalConsistency.warnings.length,
          recommendations: report ? report.recommendations.length : 0
        }
      };
      
    } catch (error) {
      logger.error('単位系完全性検証エラー', { error: error.message });
      throw error;
    }
  }

  /**
   * 異なる単位系間の変換係数分析
   */
  async analyzeUnitConversion(targetUnits, includePhysicalAnalysis = true) {
    try {
      if (!this.data.unit) {
        throw new ValidationError('現在の単位設定が存在しません', 'unit', null);
      }
      
      // 現在の単位系の4キー完全性検証
      UnitValidator.validateFourKeyCompleteness(this.data.unit);
      
      // 目標単位系の4キー完全性検証
      UnitValidator.validateFourKeyCompleteness(targetUnits);
      
      // 変換係数の計算
      const conversionAnalysis = UnitValidator.calculateConversionFactors(
        this.data.unit, 
        targetUnits
      );
      
      let physicalAnalysis = null;
      if (includePhysicalAnalysis) {
        // 両方の単位系の物理的整合性分析
        const currentConsistency = UnitValidator.validatePhysicalConsistency(this.data.unit);
        const targetConsistency = UnitValidator.validatePhysicalConsistency(targetUnits);
        
        physicalAnalysis = {
          current: currentConsistency,
          target: targetConsistency,
          conversionImpact: this.assessConversionImpact(conversionAnalysis)
        };
      }
      
      logger.info('単位変換分析を実行しました', {
        fromUnits: this.data.unit,
        toUnits: targetUnits,
        isIdentityConversion: conversionAnalysis.isIdentity,
        hasPhysicalAnalysis: !!physicalAnalysis
      });
      
      return {
        conversion: conversionAnalysis,
        physicalAnalysis,
        recommendations: this.generateConversionRecommendations(conversionAnalysis, physicalAnalysis)
      };
      
    } catch (error) {
      logger.error('単位変換分析エラー', { targetUnits, error: error.message });
      throw error;
    }
  }

  /**
   * 変換の影響評価
   * @private
   */
  assessConversionImpact(conversionAnalysis) {
    const impacts = [];
    
    for (const [key, factor] of Object.entries(conversionAnalysis.factors)) {
      if (Math.abs(factor - 1.0) > 1e-10) {
        let impact = 'moderate';
        if (Math.abs(Math.log10(Math.abs(factor))) > 2) {
          impact = 'significant';  // 100倍以上の差
        } else if (Math.abs(Math.log10(Math.abs(factor))) < 0.1) {
          impact = 'minor';       // 1.26倍未満の差
        }
        
        impacts.push({
          key,
          factor,
          impact,
          description: `${key} units require ${factor.toExponential(3)} multiplication factor`
        });
      }
    }
    
    return impacts;
  }

  /**
   * 変換推奨事項の生成
   * @private
   */
  generateConversionRecommendations(conversionAnalysis, physicalAnalysis) {
    const recommendations = [];
    
    if (conversionAnalysis.isIdentity) {
      recommendations.push({
        type: 'no_conversion_needed',
        priority: 'info',
        message: 'No unit conversion required - units are identical'
      });
      return recommendations;
    }
    
    // 大きな変換係数の警告
    const significantConversions = conversionAnalysis.factors;
    for (const [key, factor] of Object.entries(significantConversions)) {
      if (Math.abs(Math.log10(Math.abs(factor))) > 3) { // 1000倍以上
        recommendations.push({
          type: 'large_conversion_factor',
          priority: 'high',
          message: `Very large conversion factor for ${key}: ${factor.toExponential(2)}. Verify calculation accuracy.`
        });
      }
    }
    
    // 物理的整合性の比較
    if (physicalAnalysis) {
      if (physicalAnalysis.current.warnings.length < physicalAnalysis.target.warnings.length) {
        recommendations.push({
          type: 'target_system_warnings',
          priority: 'medium',
          message: 'Target unit system has more warnings than current system. Consider physical consistency.'
        });
      }
    }
    
    return recommendations;
  }
