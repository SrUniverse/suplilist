// ============================================================
// DosageCalculator v4.0 — SupliList
// Personalized clinical-grade dosage calculation engine.
// Executes 100% locally on the device (Edge AI).
// ============================================================

export class DosageCalculator {
  /**
   * Set of supplement IDs that use fixed clinical dosages
   * independent of user body weight.
   */
  FIXED_DOSE_SUPPLEMENTS = new Set([
    'vitamina-d3',
    'omega-3',
    'magnesio-bisglicinato',
    'vitamina-c',
    'ashwagandha'
  ]);

  /**
   * Map of weight-based multipliers per gram/milligram/UI per kg.
   */
  WEIGHT_BASED_SUPPLEMENTS = new Map([
    ['creatina-monohidratada', 0.07],  // 0.07g/kg of body weight
    ['whey-protein', 0.4],             // 0.4g/kg of body weight
    ['beta-alanina', 0.05],            // 0.05g/kg of body weight
    ['l-carnitina', 0.02],             // 0.02g/kg of body weight
    ['cafeina-teanina', 3]              // 3mg/kg of body weight (caffeine component)
  ]);

  /**
   * Activity level multipliers based on training frequency.
   */
  ACTIVITY_MULTIPLIERS = {
    low: 0.85,
    moderate: 1.0,
    high: 1.15
  };

  /**
   * Objective-based dosage modifiers.
   */
  OBJECTIVE_MULTIPLIERS = {
    bulk: 1.2,
    strength: 1.2,
    cut: 0.9,
    endurance: 1.0,
    general: 1.0
  };

  /**
   * Standard intake schedules for supplements.
   */
  TIMING_SCHEDULES = {
    preWorkout: '30-45 minutos antes do treino',
    postWorkout: 'Pós-treino ou a qualquer hora com carboidratos',
    morning: 'Pela manhã com refeição',
    night: '30-60 minutos antes de dormir'
  };

  /**
   * Calculates personalized dosage schedules based on user biometric data.
   * 
   * @param {Object} supplement - Supplement metadata from SUPPLEMENTS_DB
   * @param {Object} userProfile - User profile (weight, training frequency, objective, age)
   * @returns {Object} DosageResult conforming to strictly typed v4.0 contract
   */
  calculate(supplement, userProfile) {
    if (!supplement || !userProfile) {
      throw new Error('[DosageCalculator] Supplement and UserProfile are mandatory inputs');
    }

    const weight = userProfile.weight || 70;
    const freq = userProfile.trainingFrequency || 3;
    const objective = userProfile.objective || 'general';
    const age = userProfile.age || 25;

    let daily = supplement.dosage?.maintenance || 0;
    let isFixed = supplement.dosage?.isFixed || this.FIXED_DOSE_SUPPLEMENTS.has(supplement.id);
    let methodology = 'Dosagem clínica fixa recomendada.';

    if (!isFixed) {
      const multiplier = this.WEIGHT_BASED_SUPPLEMENTS.get(supplement.id) || supplement.dosage?.multiplier || 0.05;
      const activityLevel = this._getActivityLevel(freq);
      const activityMultiplier = this.ACTIVITY_MULTIPLIERS[activityLevel] || 1.0;
      const objectiveMultiplier = this.OBJECTIVE_MULTIPLIERS[objective] || 1.0;
      const ageMultiplier = this._getAgeMultiplier(age);

      daily = weight * multiplier * activityMultiplier * objectiveMultiplier * ageMultiplier;
      methodology = `Cálculo biométrico baseado no peso corporal (${weight}kg), frequência de treinos (${freq}x/semana) e objetivo de ${objective}.`;
    }

    // Strict boundary safety check: cap at upper limit
    const upperLimit = supplement.dosage?.upperLimit || daily * 2;
    let withinSafetyLimits = true;
    if (daily >= upperLimit) {
      daily = upperLimit;
      withinSafetyLimits = false;
    }

    // Standardize units and rounding
    const unit = supplement.dosage?.unit || 'g';
    const roundVal = unit === 'g' ? 1 : 0;
    daily = roundVal === 1 ? Math.round(daily * 10) / 10 : Math.round(daily);

    const weekly = daily * 7;
    const monthly = daily * 30;

    const frequency = this._getDosageFrequency(supplement, objective);
    const timing = supplement.dosage?.timing || 'A qualquer hora';

    // Food and Water details
    const withFood = supplement.id === 'vitamina-d3' || supplement.id === 'omega-3';
    const withWater = supplement.id === 'creatina-monohidratada'
      ? 'Beba com pelo menos 300ml de água e mantenha alta ingestão hídrica diária (3L+)'
      : 'Beba com um copo de água (200ml)';

    const note = supplement.id === 'creatina-monohidratada'
      ? 'A creatina funciona por saturação acumulativa, consuma todos os dias inclusive nos dias de descanso.'
      : null;

    // Saturação (loading protocol) specifically for loading supplements (like Creatina)
    let loadingProtocol = null;
    if (supplement.dosage?.loading) {
      loadingProtocol = {
        dose: supplement.dosage.loading,
        unit,
        duration: '5-7 dias',
        frequency: 'Fracionado 4x ao dia',
        description: `Protocolo opcional de saturação inicial: tome ${supplement.dosage.loading}${unit} por dia durante 5-7 dias para saturar os estoques musculares rapidamente, depois retorne à dose de manutenção de ${daily}${unit}.`
      };
    }

    const rationale = this._buildRationale(supplement, daily, unit, weight, objective, isFixed);
    const warnings = this._generateWarnings(supplement, daily, upperLimit, age);

    return {
      daily,
      unit,
      weekly,
      monthly,
      frequency,
      timing,
      withFood,
      withWater,
      note,
      loadingProtocol,
      withinSafetyLimits,
      upperLimit,
      rationale,
      warnings,
      methodology
    };
  }

  /**
   * Calculates dosages in batch for an array of supplements.
   */
  calculateStack(supplements, userProfile) {
    if (!Array.isArray(supplements)) return [];
    return supplements.map(supplement => ({
      supplementId: supplement.id,
      supplementName: supplement.name,
      dosage: this.calculate(supplement, userProfile)
    }));
  }

  /**
   * Estimates monthly budget footprint for a stack of supplements.
   */
  calculateStackCost(supplements, userProfile) {
    if (!Array.isArray(supplements)) return 0;
    let total = 0;
    supplements.forEach(supplement => {
      const result = this.calculate(supplement, userProfile);
      const pricePerGram = supplement.pricePerGram || 0.05;
      let dailyGrams = result.daily;
      if (result.unit === 'mg') {
        dailyGrams = result.daily / 1000;
      } else if (result.unit === 'UI') {
        dailyGrams = result.daily * 0.000025;
      }
      total += dailyGrams * 30 * pricePerGram;
    });
    return Math.round(total * 100) / 100;
  }

  // ─── Private Helper Methods ───────────────────────────────────────────────

  /**
   * Resolves activity level string based on frequency.
   */
  _getActivityLevel(freq) {
    if (freq >= 5) return 'high';
    if (freq >= 3) return 'moderate';
    return 'low';
  }

  /**
   * Age multiplier to implement safety buffers for specific populations if needed.
   */
  _getAgeMultiplier(age) {
    if (age >= 60) return 0.9; // senior safety scaling
    return 1.0;
  }

  _getDosageFrequency(supplement, objective) {
    if (supplement.id === 'cafeina-teanina') {
      return 'Somente nos dias de treino (pré-treino)';
    }
    return 'Diariamente';
  }

  _buildRationale(supplement, daily, unit, weight, objective, isFixed) {
    if (isFixed) {
      return `Dose fixa padrão de ${daily}${unit} recomendada clinicamente, sem necessidade de alteração baseada no peso corporal.`;
    }
    return `Dose diária sugerida de ${daily}${unit} calculada com base no seu peso corporal (${weight}kg) e no objetivo de ${objective}.`;
  }

  _generateWarnings(supplement, daily, upperLimit, age) {
    const warnings = [];

    // Under 18 safety warning
    if (age < 18) {
      warnings.push({
        type: 'warning',
        message: 'Atenção: Suplemento recomendado para maiores de 18 anos. Consulte um médico ou nutricionista.'
      });
    }

    // Approach safety upper limit warning (90%+)
    if (daily >= upperLimit * 0.9) {
      warnings.push({
        type: 'caution',
        message: 'Cuidado: Sua dosagem está muito próxima ao limite máximo de segurança estabelecido.'
      });
    }

    return warnings;
  }
}

// Singleton and Named exports
const calculator = new DosageCalculator();
export default calculator;
export { calculator as dosageCalculator };
