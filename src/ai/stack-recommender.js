// ============================================================
// StackRecommender AI Engine v4.0 — SupliList
// Clinical-grade personalized scoring and recommendation engine.
// Executes 100% locally on the device (Edge AI).
// ============================================================

import { eventBus } from '../core/event-bus.js';

// ─── Supplements Clinical Database ──────────────────────────────────────────
export const SUPPLEMENTS_DB = [
  {
    id: 'creatina-monohidratada',
    name: 'Creatina Monohidratada',
    category: 'Força & Performance',
    evidenceLevel: 'A',
    targets: { 'bulk': 1.0, 'strength': 1.0, 'cut': 0.8, 'endurance': 0.7, 'general': 0.6 },
    restrictions: [],
    dosage: { multiplier: 0.07, unit: 'g', maintenance: 5, upperLimit: 10, loading: 20, timing: 'Pós-treino ou a qualquer hora com carboidratos' },
    pricePerGram: 0.25, // R$/g
    safetyScore: 99,
    benefits: ['Aumento de força muscular', 'Melhora da performance em sprints', 'Aumento de volume celular', 'Aceleração da recuperação muscular'],
    warnings: ['Pode causar leve retenção de água intramuscular inicial', 'Beba pelo menos 3L de água por dia'],
    sideEffects: ['Desconforto gastrointestinal se consumido sem água suficiente'],
    interactions: []
  },
  {
    id: 'whey-protein',
    name: 'Whey Protein',
    category: 'Proteínas',
    evidenceLevel: 'A',
    targets: { 'bulk': 1.0, 'strength': 0.9, 'cut': 0.9, 'endurance': 0.7, 'general': 0.8 },
    restrictions: ['lactose'], // Contém lactose
    dosage: { multiplier: 0.4, unit: 'g', maintenance: 30, upperLimit: 60, timing: 'Pós-treino ou como substituto de lanche' },
    pricePerGram: 0.15,
    safetyScore: 98,
    benefits: ['Apoio à síntese de proteína muscular', 'Aceleração da recuperação muscular', 'Altamente saciante para fases de queima de gordura'],
    warnings: ['Contém lactose e derivados de leite'],
    sideEffects: ['Gases ou estufamento em pessoas com leve intolerância à lactose'],
    interactions: []
  },
  {
    id: 'cafeina',
    name: 'Cafeína Anidra',
    category: 'Energéticos & Foco',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.6, 'strength': 0.9, 'cut': 1.0, 'endurance': 1.0, 'general': 0.5 },
    restrictions: [],
    dosage: { multiplier: 3, unit: 'mg', maintenance: 200, upperLimit: 400, timing: '30-45 minutos antes do treino' },
    pricePerGram: 0.005,
    safetyScore: 85,
    benefits: ['Aumento de foco e alerta mental', 'Melhora na resistência física', 'Aumento do gasto energético termogênico'],
    warnings: ['Evite consumir após as 18h para não prejudicar o sono', 'Não exceda a dose máxima de segurança'],
    sideEffects: ['Taquicardia', 'Ansiedade', 'Insônia se consumido tarde'],
    interactions: [
      { supplement: 'sinefrina', severity: 'HIGH', message: 'Associação pode elevar excessivamente a pressão arterial.' }
    ]
  },
  {
    id: 'vitamina-d3',
    name: 'Vitamina D3',
    category: 'Vitaminas & Minerais',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.7, 'strength': 0.7, 'cut': 0.6, 'endurance': 0.6, 'general': 1.0 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 2000, unit: 'UI', upperLimit: 10000, timing: 'Com a maior refeição do dia (gorduras solúveis)' },
    pricePerGram: 0.0001,
    safetyScore: 95,
    benefits: ['Melhora na absorção de cálcio e saúde óssea', 'Suporte à síntese natural de testosterona', 'Fortalecimento da imunidade'],
    warnings: ['Faça exames periódicos de sangue para monitorar os níveis séricos'],
    sideEffects: ['Raríssima toxicidade se consumido em doses abusivas crônicas'],
    interactions: []
  },
  {
    id: 'omega-3',
    name: 'Ômega 3',
    category: 'Saúde Cardiovascular',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.8, 'strength': 0.8, 'cut': 0.7, 'endurance': 0.7, 'general': 1.0 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 1000, unit: 'mg', upperLimit: 3000, timing: 'Com as principais refeições' },
    pricePerGram: 0.0005,
    safetyScore: 98,
    benefits: ['Poderosa ação anti-inflamatória sistêmica', 'Apoio à saúde do coração e cérebro', 'Redução do estresse oxidativo pós-treino'],
    warnings: ['Consuma com refeições gordurosas para otimizar a absorção'],
    sideEffects: ['Leve refluxo com retrogosto de peixe em algumas marcas'],
    interactions: []
  },
  {
    id: 'beta-alanina',
    name: 'Beta-Alanina',
    category: 'Força & Performance',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.8, 'strength': 0.8, 'cut': 0.7, 'endurance': 1.0, 'general': 0.6 },
    restrictions: [],
    dosage: { multiplier: 0.05, unit: 'g', maintenance: 3.2, upperLimit: 6.4, timing: 'Fracionado ao longo do dia ou antes do treino' },
    pricePerGram: 0.20,
    safetyScore: 95,
    benefits: ['Aumento da carnosina muscular', 'Redução drástica da fadiga em treinos de alta intensidade', 'Aumento da capacidade de amortecimento de ácido lático'],
    warnings: ['Pode causar parestesia (formigamento inofensivo na pele). Divida a dose se incomodar.'],
    sideEffects: ['Parestesia temporária'],
    interactions: []
  },
  {
    id: 'l-carnitina',
    name: 'L-Carnitina Tartarato',
    category: 'Queima de Gordura & Recovery',
    evidenceLevel: 'B',
    targets: { 'bulk': 0.4, 'strength': 0.5, 'cut': 1.0, 'endurance': 0.8, 'general': 0.7 },
    restrictions: [],
    dosage: { multiplier: 0.02, unit: 'g', maintenance: 2.0, upperLimit: 4.0, timing: 'Pela manhã ou 30 minutos antes do treino com carboidratos' },
    pricePerGram: 0.22,
    safetyScore: 92,
    benefits: ['Acelera o transporte de ácidos graxos para as mitocôndrias', 'Apoio à queima de gorduras corporais', 'Melhora da oxigenação muscular durante o esforço'],
    warnings: ['Mais eficaz quando associada a uma refeição rica em carboidratos'],
    sideEffects: ['Pequenos desconfortos intestinais em doses mais elevadas'],
    interactions: []
  },
  {
    id: 'magnesio-bisglicinato',
    name: 'Magnésio Bisglicinato',
    category: 'Vitaminas & Minerais',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.7, 'strength': 0.8, 'cut': 0.7, 'endurance': 0.7, 'general': 1.0 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 350, unit: 'mg', upperLimit: 500, timing: '30-60 minutos antes de dormir' },
    pricePerGram: 0.001,
    safetyScore: 97,
    benefits: ['Melhora acentuada na qualidade do sono profundo', 'Relaxamento muscular e redução de cãibras', 'Regulação de mais de 300 reações enzimáticas fundamentais'],
    warnings: ['A versão em bisglicinato (quelato) é a de melhor absorção e menor impacto laxativo'],
    sideEffects: ['Leve sonolência matinal inicial se consumido muito tarde'],
    interactions: []
  },
  {
    id: 'vitamina-c',
    name: 'Vitamina C',
    category: 'Vitaminas & Minerais',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.6, 'strength': 0.6, 'cut': 0.7, 'endurance': 0.7, 'general': 1.0 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, unit: 'mg', upperLimit: 2000, timing: 'Pela manhã com refeição' },
    pricePerGram: 0.0003,
    safetyScore: 98,
    benefits: ['Poderoso antioxidante protetor celular', 'Apoio essencial na síntese natural de colágeno', 'Melhora na absorção de ferro de origem vegetal'],
    warnings: ['Doses excessivas crônicas (acima de 2g) podem acelerar a formação de cálculos renais'],
    sideEffects: ['Desconforto gástrico leve em jejum se consumido na forma ácida pura'],
    interactions: []
  },
  {
    id: 'ashwagandha',
    name: 'Ashwagandha KSM-66',
    category: 'Adaptógenos & Foco',
    evidenceLevel: 'B',
    targets: { 'bulk': 0.8, 'strength': 0.8, 'cut': 0.7, 'endurance': 0.6, 'general': 1.0 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 600, unit: 'mg', upperLimit: 1000, timing: 'À noite com água ou refeição leve' },
    pricePerGram: 0.002,
    safetyScore: 90,
    benefits: ['Redução drástica nos níveis circulantes de cortisol (estresse)', 'Apoio na modulação natural de testosterona sérica', 'Aumento de foco e redução de ansiedade crônica'],
    warnings: ['Contraindicado para menores de 18 anos devido à falta de estudos em desenvolvimento hormonal.', 'Recomendável ciclar o consumo a cada 8-12 semanas de uso diário.'],
    sideEffects: ['Leve apatia emocional transitória em dosagens prolongadas descontroladas'],
    interactions: []
  }
];

// ─── StackRecommender Class ──────────────────────────────────────────────────
export class StackRecommender {
  /**
   * Generates a personalized supplement recommendation list.
   * 
   * @param {Object} userProfile - User biometric and preference parameters
   * @param {number} [topN=8] - Maximum number of recommended items
   * @returns {Array<Object>} Sorted list of recommended supplements
   */
  recommend(userProfile, topN = 8) {
    if (!userProfile) return [];

    const results = [];
    const hash = StackRecommender.profileHash(userProfile);

    for (const supplement of SUPPLEMENTS_DB) {
      if (this._isEligible(supplement, userProfile)) {
        const score = this._calculateScore(supplement, userProfile);
        const dosage = this._calculatePersonalDosage(supplement, userProfile);
        const cost = this._estimateMonthlyCost(supplement, dosage.daily, userProfile);
        
        const formatted = this._formatResult(supplement, score, dosage, cost, userProfile);
        results.push(formatted);
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Limit to topN
    const limited = results.slice(0, topN);

    // Emit event globally through EventBus
    eventBus.emit('ai:recommendationsReady', { items: limited, profileHash: hash });

    return limited;
  }

  /**
   * Computes a unique hash string representing the user profile parameters.
   */
  static profileHash(profile) {
    if (!profile) return '';
    const obj = {
      objective: profile.objective || '',
      restrictions: [...(profile.restrictions || [])].sort(),
      weight: profile.weight || 0,
      budget: profile.budget || 0,
      age: profile.age || 0,
      currentStack: [...(profile.currentStack || [])].sort()
    };
    return JSON.stringify(obj);
  }

  // ─── Private Algorithm Methods ─────────────────────────────────────────────

  /**
   * Filters out supplements based on user allergies, exclusions, age boundaries, or existing stack items.
   */
  _isEligible(supplement, userProfile) {
    const restrictions = userProfile.restrictions || [];
    for (const restriction of restrictions) {
      if (supplement.restrictions && supplement.restrictions.includes(restriction)) {
        return false;
      }
    }

    // Exclude if already inside currentStack to prevent recommending purchased items
    const currentStack = userProfile.currentStack || [];
    if (currentStack.includes(supplement.id)) {
      return false;
    }

    // Clinical Safety boundary: Ashwagandha is not recommended for minors under 18
    if (supplement.id === 'ashwagandha' && userProfile.age && userProfile.age < 18) {
      return false;
    }

    return true;
  }

  /**
   * Scoring formula combining objective relevance, evidence, compatibility, and cost-benefit.
   */
  _calculateScore(supplement, userProfile) {
    const r = this._scoreObjectiveRelevance(supplement, userProfile.objective);
    const e = this._scoreEvidenceLevel(supplement);
    const c = this._scoreCompatibility(supplement, userProfile);
    const cb = this._scoreCostBenefit(supplement, userProfile);

    const score = (r * 0.40) + (e * 0.30) + (c * 0.20) + (cb * 0.10);
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Assesses target matching for the user's main objective.
   */
  _scoreObjectiveRelevance(supplement, objective) {
    if (!objective) return 0.5;
    return supplement.targets?.[objective] ?? 0.5;
  }

  /**
   * Maps qualitative clinical evidence grades to standardized values.
   */
  _scoreEvidenceLevel(supplement) {
    const levels = { 'A': 1.0, 'B': 0.8, 'C': 0.5, 'D': 0.2 };
    return levels[supplement.evidenceLevel] || 0.2;
  }

  /**
   * Assesses general compatibility based on safety scores.
   */
  _scoreCompatibility(supplement, userProfile) {
    return (supplement.safetyScore || 90) / 100;
  }

  /**
   * Checks cost against monthly budget limits, penalizing items exceeding budget capacity.
   */
  _scoreCostBenefit(supplement, userProfile) {
    const budget = userProfile.budget || 200;
    
    // Estimate daily dose first
    const dailyDose = this._calculatePersonalDosage(supplement, userProfile).daily;
    const pricePerGram = supplement.pricePerGram || 0.05;
    
    // Monthly Cost (mg scaled to g if needed, but we keep it standardized)
    let dailyGrams = dailyDose;
    if (supplement.dosage.unit === 'mg') {
      dailyGrams = dailyDose / 1000;
    } else if (supplement.dosage.unit === 'UI') {
      dailyGrams = dailyDose * 0.000025; // standard microgram approximation
    }

    const monthlyCost = dailyGrams * 30 * pricePerGram;
    
    if (monthlyCost <= 0) return 1.0;
    if (monthlyCost <= budget) return 1.0;
    return Math.max(0.1, budget / monthlyCost);
  }

  /**
   * Computes personalized dosages matching user body mass and objective constraints.
   */
  _calculatePersonalDosage(supplement, userProfile) {
    const weight = userProfile.weight || 70;
    const objective = userProfile.objective || 'general';
    const age = userProfile.age || 25;

    let daily = supplement.dosage.maintenance;
    
    // Body weight-based scaling
    if (supplement.dosage.multiplier) {
      const weightMultiplier = this._getWeightMultiplier(userProfile);
      daily = weight * supplement.dosage.multiplier * weightMultiplier;

      // Adjust based on objective
      if (objective === 'bulk' || objective === 'strength') {
        daily *= 1.2;
      } else if (objective === 'cut') {
        daily *= 0.9;
      }
    }

    // Safety check: bound by upper limit
    const upperLimit = supplement.dosage.upperLimit || daily * 2;
    let withinSafetyLimits = true;
    if (daily > upperLimit) {
      daily = upperLimit;
      withinSafetyLimits = false;
    }

    const unit = supplement.dosage.unit || 'g';
    const roundVal = unit === 'g' ? 1 : 0;
    daily = roundVal === 1 ? Math.round(daily * 10) / 10 : Math.round(daily);

    const weekly = daily * 7;
    const frequency = this._getDosageFrequency(supplement, objective);
    const timing = supplement.dosage.timing || 'A qualquer hora';

    // Rationale construction
    let rationale = `Dose diária sugerida de ${daily}${unit} calculada com base no peso corporal (${weight}kg) e no objetivo de ${objective}.`;
    if (supplement.dosage.isFixed) {
      rationale = `Dose fixa padrão de ${daily}${unit} recomendada independentemente de peso corporal.`;
    }

    // Initial loading protocol (if any)
    let loadingProtocol = null;
    if (supplement.dosage.loading) {
      loadingProtocol = {
        dose: supplement.dosage.loading,
        unit: supplement.dosage.unit,
        duration: '5-7 dias',
        frequency: 'Fracionado 4x ao dia',
        description: `Protocolo opcional de saturação inicial: tome ${supplement.dosage.loading}${supplement.dosage.unit} por dia durante 5-7 dias para saturar os estoques musculares rapidamente, depois retorne à dose de manutenção de ${daily}${unit}.`
      };
    }

    return {
      daily,
      unit,
      weekly,
      frequency,
      timing,
      withinSafetyLimits,
      upperLimit,
      rationale,
      loadingProtocol
    };
  }

  /**
   * Helper modifier based on general training intensity or age parameters.
   */
  _getWeightMultiplier(userProfile) {
    const freq = userProfile.trainingFrequency || 3;
    if (freq >= 5) return 1.1; // heavy training adjustment
    if (freq <= 2) return 0.9;
    return 1.0;
  }

  /**
   * Maps optimal intake frequency matching supplement profile.
   */
  _getDosageFrequency(supplement, objective) {
    if (supplement.id === 'cafeina') {
      return 'Somente nos dias de treino (pré-treino)';
    }
    return 'Diariamente';
  }

  /**
   * Computes individual monthly budget footprint.
   */
  _estimateMonthlyCost(supplement, dailyDose, userProfile) {
    const pricePerGram = supplement.pricePerGram || 0.05;
    let dailyGrams = dailyDose;
    if (supplement.dosage.unit === 'mg') {
      dailyGrams = dailyDose / 1000;
    } else if (supplement.dosage.unit === 'UI') {
      dailyGrams = dailyDose * 0.000025;
    }

    const perDose = dailyGrams * pricePerGram;
    const perMonth = perDose * 30;
    const budget = userProfile.budget || 200;

    return {
      perMonth: Math.round(perMonth * 100) / 100,
      perDose: Math.round(perDose * 100) / 100,
      withinBudget: perMonth <= budget
    };
  }

  /**
   * Standardizes recommendation payloads matching strict schema requirements.
   */
  _formatResult(supplement, score, dosage, cost, userProfile) {
    const timing = dosage.timing;
    let priority = 'LOW';
    if (score >= 0.8) priority = 'HIGH';
    else if (score >= 0.6) priority = 'MEDIUM';

    return {
      id: supplement.id,
      name: supplement.name,
      category: supplement.category,
      score,
      evidenceLevel: supplement.evidenceLevel,
      dosage,
      cost,
      benefits: supplement.benefits || [],
      warnings: supplement.warnings || [],
      sideEffects: supplement.sideEffects || [],
      interactions: supplement.interactions || [],
      timing,
      priority
    };
  }
}

// Singleton export + named DB export
const recommender = new StackRecommender();
export default recommender;
