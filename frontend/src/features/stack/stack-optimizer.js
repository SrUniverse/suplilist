/**
 * @fileoverview Stack Optimizer
 * Analyzes supplement stack for redundancies, gaps, and cost optimization
 */

/**
 * Identify redundant supplements (overlapping benefits)
 * @param {Array} stackItems - User's current stack
 * @returns {Array} Groups of redundant supplements
 */
export function findRedundancies(stackItems) {
  const redundancyMap = {
    // Protein sources
    protein: ['whey', 'casein', 'egg-protein', 'beef-protein'],
    // BCAAs and amino acids
    amino: ['bcaa', 'eaa', 'amino-acids'],
    // Creatine forms
    creatine: ['creatine-monohydrate', 'creatine-hcl', 'creatine-ethyl-ester'],
    // Pre-workouts
    'pre-workout': ['pre-workout', 'caffeine', 'beta-alanine', 'citrulline'],
    // Sleep/recovery
    sleep: ['magnesium', 'zma', 'melatonin'],
    // Joint support
    joints: ['collagen', 'glucosamine', 'chondroitin'],
  };

  const userSupps = stackItems.map(s => s.supplementId.toLowerCase());
  const redundancies = [];

  for (const [category, supplements] of Object.entries(redundancyMap)) {
    const matching = supplements.filter(s => userSupps.includes(s));
    if (matching.length > 1) {
      redundancies.push({
        category,
        supplements: matching,
        message: `Você toma ${matching.length} suplementos com benefícios sobrepostos. Pode manter apenas 1.`,
      });
    }
  }

  return redundancies;
}

/**
 * Identify missing supplements for goal
 * @param {Array} stackItems - User's current stack
 * @param {string} goal - Training goal
 * @param {number} budget - Monthly budget in R$
 * @returns {Array} Recommended missing supplements
 */
export function findGaps(stackItems, goal, budget = 500) {
  const userSupps = stackItems.map(s => s.supplementId.toLowerCase());

  // Recommendations by goal
  const recommendations = {
    bulk: [
      { id: 'whey', name: 'Whey Protein', priority: 'critical', cost: 80, roi: 'high' },
      { id: 'creatine', name: 'Creatina', priority: 'high', cost: 45, roi: 'high' },
      { id: 'carbs', name: 'Carboidrato (Maltodextrina)', priority: 'high', cost: 40, roi: 'high' },
      { id: 'bcaa', name: 'BCAA', priority: 'medium', cost: 60, roi: 'low' },
      { id: 'caffeine', name: 'Cafeína', priority: 'low', cost: 15, roi: 'medium' },
    ],
    cut: [
      { id: 'whey', name: 'Whey Protein', priority: 'critical', cost: 80, roi: 'high' },
      { id: 'thermogenic', name: 'Termogênico', priority: 'high', cost: 50, roi: 'medium' },
      { id: 'caffeine', name: 'Cafeína', priority: 'high', cost: 15, roi: 'high' },
      { id: 'creatine', name: 'Creatina', priority: 'medium', cost: 45, roi: 'medium' },
      { id: 'fiber', name: 'Fibra Solúvel', priority: 'medium', cost: 25, roi: 'medium' },
    ],
    strength: [
      { id: 'creatine', name: 'Creatina', priority: 'critical', cost: 45, roi: 'high' },
      { id: 'whey', name: 'Whey Protein', priority: 'critical', cost: 80, roi: 'high' },
      { id: 'beta-alanine', name: 'Beta-Alanina', priority: 'high', cost: 55, roi: 'medium' },
      { id: 'citrulline', name: 'Citrulina', priority: 'high', cost: 50, roi: 'medium' },
      { id: 'caffeine', name: 'Cafeína', priority: 'medium', cost: 15, roi: 'high' },
    ],
    endurance: [
      { id: 'whey', name: 'Whey Protein', priority: 'critical', cost: 80, roi: 'high' },
      { id: 'electrolytes', name: 'Eletrólitos', priority: 'high', cost: 35, roi: 'high' },
      { id: 'beta-alanine', name: 'Beta-Alanina', priority: 'high', cost: 55, roi: 'medium' },
      { id: 'bcaa', name: 'BCAA', priority: 'medium', cost: 60, roi: 'medium' },
      { id: 'caffeine', name: 'Cafeína', priority: 'medium', cost: 15, roi: 'high' },
    ],
    general: [
      { id: 'whey', name: 'Whey Protein', priority: 'high', cost: 80, roi: 'high' },
      { id: 'vitamin-d', name: 'Vitamina D', priority: 'high', cost: 25, roi: 'high' },
      { id: 'magnesium', name: 'Magnésio', priority: 'medium', cost: 40, roi: 'high' },
      { id: 'multivitamin', name: 'Polivitamínico', priority: 'medium', cost: 45, roi: 'medium' },
    ],
  };

  const goalRecs = recommendations[goal] || [];
  const missing = goalRecs.filter(
    r => !userSupps.includes(r.id) && r.cost <= (budget * 0.3) // Can't exceed 30% of monthly budget
  );

  return missing.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Calculate optimization potential
 * @param {Array} stackItems - User's current stack
 * @param {Array} purchases - Purchase history
 * @param {string} goal - Training goal
 * @param {number} budget - Monthly budget
 * @returns {Object} Optimization recommendation
 */
export function optimizeStack(stackItems, purchases, goal, budget = 500) {
  const redundancies = findRedundancies(stackItems);
  const gaps = findGaps(stackItems, goal, budget);

  // Calculate potential savings
  let savingsPotential = 0;
  for (const redundancy of redundancies) {
    for (const suppId of redundancy.supplements) {
      const purchases_for_supp = purchases.filter(
        p => p.supplementId === suppId && p.status === 'active'
      );
      if (purchases_for_supp.length > 0) {
        const avg_price = purchases_for_supp.reduce((sum, p) => sum + p.price, 0) / purchases_for_supp.length;
        savingsPotential += avg_price;
      }
    }
  }

  // Only count savings if we have more than 1 redundant item
  if (redundancies.some(r => r.supplements.length <= 1)) {
    savingsPotential = 0;
  }

  const savings_rounded = Math.round(savingsPotential * 100) / 100;

  // Weighted optimization score: absence of critical/high gaps ≠ optimal state.
  // 3 medium gaps accumulate to the same urgency as 1 high-priority gap.
  const GAP_WEIGHTS = { critical: 10, high: 5, medium: 2, low: 1 };
  const OPTIMIZATION_THRESHOLD = 5; // equivalent to one high-priority gap
  const gapWeight = gaps.reduce((sum, g) => sum + (GAP_WEIGHTS[g.priority] ?? 0), 0);

  // High-priority gaps drive the top-level recommendation; medium/low are surfaced
  // separately so the presentation layer can render them as subtle suggestions.
  const priorityGaps = gaps.filter(g => ['critical', 'high'].includes(g.priority));
  const suggestionGaps = gaps.filter(g => ['medium', 'low'].includes(g.priority));

let recommendation = '';
  if (redundancies.length > 0 && priorityGaps.length > 0) {
    recommendation = `Remove ${redundancies.map(r => r.supplements[0]).join(' + ')} (R$${savings_rounded}/mês), add ${priorityGaps.slice(0, 2).map(g => g.name).join(' + ')} = save R$${savings_rounded}/mês, +${priorityGaps.slice(0, 2).length} benefits`;
  } else if (redundancies.length > 0) {
    recommendation = `Remove ${redundancies.map(r => r.supplements[0]).join(' + ')} (redundant), economiza R$${savings_rounded}/mês`;
  } else if (priorityGaps.length > 0) {
    recommendation = `Add ${priorityGaps.slice(0, 2).map(g => g.name).join(' + ')} (high ROI) to optimize for ${goal}`;
  } else {
    recommendation = `Seu stack está bem otimizado para ${goal}! 👏`;
  }

  return {
    redundancies,
    gaps,          // all gaps — presentation layer decides granularity
    priorityGaps,  // critical + high: actionable alerts
    suggestionGaps, // medium + low: subtle hints
    savingsPotential: savings_rounded,
    recommendation,
    hasOptimizationPotential: redundancies.length > 0 || gapWeight >= OPTIMIZATION_THRESHOLD,
  };
}

/**
 * Calculate ROI (Return on Investment) score for each supplement
 * @param {Object} supplement - Supplement with usage and cost data
 * @param {string} goal - Training goal
 * @returns {number} ROI score (0-100)
 */
export function calculateROI(supplement, goal) {
  const roiScores = {
    whey: { bulk: 95, cut: 90, strength: 95, endurance: 85, general: 85 },
    creatine: { bulk: 90, cut: 70, strength: 95, endurance: 50, general: 70 },
    caffeine: { bulk: 75, cut: 85, strength: 80, endurance: 80, general: 60 },
    'vitamin-d': { bulk: 70, cut: 70, strength: 70, endurance: 70, general: 80 },
    magnesium: { bulk: 70, cut: 70, strength: 75, endurance: 70, general: 75 },
    carbs: { bulk: 85, cut: 50, strength: 70, endurance: 80, general: 60 },
    bcaa: { bulk: 60, cut: 70, strength: 60, endurance: 70, general: 40 },
    'beta-alanine': { bulk: 50, cut: 60, strength: 65, endurance: 80, general: 30 },
    collagen: { bulk: 65, cut: 65, strength: 70, endurance: 70, general: 70 },
  };

  return roiScores[supplement.supplementId]?.[goal] ?? 50;
}
