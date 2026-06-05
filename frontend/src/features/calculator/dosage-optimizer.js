/**
 * @fileoverview Dosage Optimizer
 * Recommends optimal supplement dosage based on weight and goal
 */

/**
 * Strategy dictionary for supplement dosage rules.
 * Each function receives (weight, goal) and returns the optimal dosage.
 */
const DOSE_RULES = {
  'creatine': (weight, goal) => {
    const map = { bulk: 5, cut: 3, strength: 5, endurance: 0, general: 3 };
    return map[goal] ?? 3;
  },
  'whey': (weight, goal) => {
    const map = { bulk: 2.2, cut: 1.6, strength: 2.0, endurance: 1.4, general: 1.6 };
    return weight * (map[goal] ?? 1.6);
  },
  'bcaa': (weight, goal) => {
    const map = { bulk: 10, cut: 15, strength: 10, endurance: 15, general: 5 };
    return map[goal] ?? 5;
  },
  'vitamin-d': () => 2000,
  'magnesium': (weight, goal) => {
    const map = { bulk: 400, cut: 400, strength: 500, endurance: 500, general: 400 };
    return map[goal] ?? 400;
  },
  'caffeine': (weight, goal) => {
    const map = { bulk: 200, cut: 200, strength: 300, endurance: 300, general: 100 };
    return map[goal] ?? 100;
  },
  'beta-alanine': (weight, goal) => {
    const map = { bulk: 0, cut: 3, strength: 0, endurance: 3, general: 0 };
    return map[goal] ?? 0;
  },
  'taurine': (weight, goal) => {
    const map = { bulk: 3, cut: 3, strength: 3, endurance: 3, general: 2 };
    return map[goal] ?? 2;
  }
};

/**
 * Get recommended dosage for a supplement based on weight and goal
 * Based on scientific evidence and common protocols
 * @param {string} supplementId - Which supplement
 * @param {number} weight - User's weight in kg
 * @param {string} goal - Training goal: 'bulk' | 'cut' | 'strength' | 'endurance' | 'general'
 * @returns {number|null} Recommended daily dosage (grams or units), or null if not supported
 */
export function getRecommendedDosage(supplementId, weight, goal) {
  if (!weight || weight <= 0) return null;
  const rule = DOSE_RULES[supplementId];
  if (!rule) return null;
  return rule(weight, goal);
}

/**
 * Compare user's actual dosage with recommended
 * @param {string} supplementId - Which supplement
 * @param {number} userDosage - What user is actually taking
 * @param {number} weight - User's weight
 * @param {string} goal - User's goal
 * @returns {Object} Comparison result with status and message
 */
export function compareWithRecommended(supplementId, userDosage, weight, goal) {
  const recommended = getRecommendedDosage(supplementId, weight, goal);

  if (recommended === null || recommended === 0) {
    return {
      status: 'not-recommended',
      actual: userDosage,
      recommended: null,
      message: '❌ Este suplemento não é recomendado para seu objetivo.',
    };
  }

  if (userDosage === 0 || !userDosage) {
    return {
      status: 'missing',
      actual: 0,
      recommended,
      message: `📌 Recomendado para ${goal}: ${recommended}g/dia`,
    };
  }

  const percentage = Math.round((userDosage / recommended) * 100);
let status = 'optimal';
let message = '';

  if (percentage > 125) {
    status = 'too-high';
    message = `⚠️ Você tá tomando ${percentage}% do recomendado (${recommended}g/dia). Pode reduzir sem perder resultados.`;
  } else if (percentage > 105) {
    status = 'slightly-high';
    message = `📊 Ligeiramente acima do recomendado (${recommended}g/dia). Pode otimizar a dose.`;
  } else if (percentage < 75) {
    status = 'too-low';
    message = `📈 Você tá tomando apenas ${percentage}% do recomendado (${recommended}g/dia). Considere aumentar para melhores resultados.`;
  } else if (percentage < 95) {
    status = 'slightly-low';
    message = `📊 Ligeiramente abaixo do recomendado (${recommended}g/dia). Considere aumentar.`;
  } else {
    status = 'optimal';
    message = `✅ Dosagem está perfeita! ${percentage}% do recomendado.`;
  }

  return {
    status,
    actual: userDosage,
    recommended,
    percentage,
    message,
  };
}

/**
 * Get visual indicator for dosage status
 * @param {string} status - Status from compareWithRecommended
 * @returns {string} Visual indicator (emoji/color)
 */
export function getStatusIndicator(status) {
  const indicators = {
    optimal: '✅',
    'slightly-high': '📊',
    'slightly-low': '📊',
    'too-high': '⚠️',
    'too-low': '📈',
    'missing': '❌',
    'not-recommended': '❌',
  };

  return indicators[status] || '?';
}

/**
 * Get color for dosage status
 * @param {string} status - Status from compareWithRecommended
 * @returns {string} CSS color variable
 */
export function getStatusColor(status) {
  switch (status) {
    case 'optimal':
      return 'var(--color-success)';
    case 'slightly-high':
    case 'slightly-low':
      return 'var(--color-warning)';
    case 'too-high':
    case 'too-low':
      return 'var(--color-error)';
    case 'missing':
    case 'not-recommended':
      return 'var(--color-error)';
    default:
      return 'var(--color-text-secondary)';
  }
}

const DISPLAYABLE_STATUSES = new Set(['optimal', 'too-high', 'too-low', 'slightly-high', 'slightly-low', 'missing']);

/**
 * Get all supplements with dosage recommendations
 * @param {Array} stackItems - User's current stack
 * @param {number} weight - User's weight
 * @param {string} goal - User's goal
 * @returns {Array} Supplements with dosage analysis
 */
export function analyzeStackDosages(stackItems, weight, goal) {
  return stackItems
    .map(item => {
      const comparison = compareWithRecommended(
        item.supplementId,
        item.dailyDosage || 0,
        weight,
        goal
      );

      return {
        supplementId: item.supplementId,
        name: item.name,
        ...comparison,
        indicator: getStatusIndicator(comparison.status),
        color: getStatusColor(comparison.status),
      };
    })
    .filter(item => DISPLAYABLE_STATUSES.has(item.status))
    .sort((a, b) => {
      // Sort by status: needs-attention first, then optimal
      const priority = {
        'too-high': 1,
        'too-low': 2,
        'slightly-high': 3,
        'slightly-low': 4,
        'missing': 5,
        'optimal': 6,
        'not-recommended': 7,
      };
      return (priority[a.status] || 99) - (priority[b.status] || 99);
    });
}

/**
 * Get summary of dosage optimization potential
 * @param {Array} stackItems - User's current stack
 * @param {number} weight - User's weight
 * @param {string} goal - User's goal
 * @returns {Object} Summary with optimization potential
 */
export function getOptimizationSummary(stackItems, weight, goal) {
  const analyzed = analyzeStackDosages(stackItems, weight, goal);

  const needsAttention = analyzed.filter(
    s => ['too-high', 'too-low', 'missing'].includes(s.status)
  );

  const optimal = analyzed.filter(s => s.status === 'optimal');

  return {
    total: analyzed.length,
    optimal: optimal.length,
    needsAttention: needsAttention.length,
    optimizationPotential: needsAttention.length > 0,
    message: needsAttention.length === 0
      ? '👏 Seu stack está bem otimizado!'
      : `🎯 ${needsAttention.length} suplemento${needsAttention.length !== 1 ? 's' : ''} pode${needsAttention.length !== 1 ? 'm' : ''} ser otimizado`,
  };
}
