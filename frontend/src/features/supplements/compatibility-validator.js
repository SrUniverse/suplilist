/**
 * Compatibility Validator — Detect interactions & contraindications
 */

// Supplement interaction matrix
const INTERACTIONS = {
  'iron': {
    'calcium': { severity: 'moderate', description: 'Calcium reduces iron absorption' },
    'vitamin-e': { severity: 'low', description: 'May affect vitamin E absorption' },
    'magnesium': { severity: 'moderate', description: 'Magnesium may interfere with iron' }
  },
  'calcium': {
    'iron': { severity: 'moderate', description: 'Calcium reduces iron absorption' },
    'vitamin-d': { severity: 'positive', description: 'Vitamin D enhances calcium absorption' },
    'magnesium': { severity: 'low', description: 'Both minerals compete for absorption' }
  },
  'vitamin-d': {
    'calcium': { severity: 'positive', description: 'Enhances calcium absorption' },
    'vitamin-k': { severity: 'positive', description: 'Synergistic for bone health' }
  },
  'vitamin-k': {
    'vitamin-d': { severity: 'positive', description: 'Synergistic for bone health' },
    'warfarin': { severity: 'critical', description: 'Reduces anticoagulant effect' }
  },
  'magnesium': {
    'calcium': { severity: 'low', description: 'Both minerals compete for absorption' },
    'iron': { severity: 'moderate', description: 'May interfere with iron absorption' },
    'zinc': { severity: 'low', description: 'Both compete for absorption' }
  },
  'zinc': {
    'magnesium': { severity: 'low', description: 'Both compete for absorption' },
    'copper': { severity: 'moderate', description: 'Zinc inhibits copper absorption' }
  },
  'vitamin-b12': {
    'metformin': { severity: 'moderate', description: 'Metformin reduces B12 absorption' },
    'folate': { severity: 'positive', description: 'Synergistic for methylation' }
  },
  'folate': {
    'vitamin-b12': { severity: 'positive', description: 'Synergistic for methylation' }
  }
};

// Supplement contraindications by condition
const CONTRAINDICATIONS = {
  'pregnancy': ['vitamin-a-high-dose', 'isoretinoin', 'ACE-inhibitors'],
  'hypertension': ['licorice-high-dose', 'ginseng', 'stimulants'],
  'diabetes': ['chromium-high-dose', 'alpha-lipoic-acid'],
  'blood-clotting-disorder': ['vitamin-k', 'ginger-high-dose', 'garlic-high-dose'],
  'kidney-disease': ['high-potassium', 'phosphorus'],
  'liver-disease': ['kava', 'high-dose-niacin']
};

// Severity levels
const SEVERITY = {
  'positive': { level: 0, color: 'green', action: 'recommend' },
  'low': { level: 1, color: 'yellow', action: 'warn' },
  'moderate': { level: 2, color: 'orange', action: 'caution' },
  'critical': { level: 3, color: 'red', action: 'block' }
};

export class CompatibilityValidator {
  /**
   * Check if two supplements interact
   * @param {string} supplementId1
   * @param {string} supplementId2
   * @returns {Object|null} Interaction data or null if no interaction
   */
  static checkInteraction(supplementId1, supplementId2) {
    const interaction = INTERACTIONS[supplementId1]?.[supplementId2];
    if (interaction) {
      return {
        supplement1: supplementId1,
        supplement2: supplementId2,
        ...interaction,
        level: SEVERITY[interaction.severity].level
      };
    }
    return null;
  }

  /**
   * Validate entire stack for interactions
   * @param {Array} stack - Array of {supplementId, name}
   * @returns {Object} Issues found and recommendations
   */
  static validateStack(stack) {
    const issues = [];
    const interactions = [];

    // Check all pairs
    for (let i = 0; i < stack.length; i++) {
      for (let j = i + 1; j < stack.length; j++) {
        const interaction = this.checkInteraction(
          stack[i].supplementId,
          stack[j].supplementId
        );

        if (interaction) {
          interactions.push({
            ...interaction,
            item1Name: stack[i].name,
            item2Name: stack[j].name
          });

          if (SEVERITY[interaction.severity].level >= 2) {
            issues.push({
              type: 'interaction',
              severity: interaction.severity,
              message: `${stack[i].name} and ${stack[j].name}: ${interaction.description}`
            });
          }
        }
      }
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      interactions,
      warnings: interactions.filter(i => i.level >= 1),
      criticalIssues: interactions.filter(i => i.severity === 'critical')
    };
  }

  /**
   * Check contraindications based on user conditions
   * @param {Array} stack - User's supplement stack
   * @param {Array} conditions - User's health conditions
   * @returns {Array} Contraindications found
   */
  static checkContraindications(stack, conditions = []) {
    const contraindications = [];

    conditions.forEach(condition => {
      const forbiddenSupplements = CONTRAINDICATIONS[condition] || [];

      stack.forEach(item => {
        if (forbiddenSupplements.includes(item.supplementId)) {
          contraindications.push({
            supplement: item.name,
            condition: condition,
            severity: 'critical',
            message: `${item.name} is contraindicated for ${condition}`
          });
        }
      });
    });

    return contraindications;
  }

  /**
   * Get compatibility score for a new supplement with existing stack
   * @param {string} newSupplementId
   * @param {Array} currentStack
   * @returns {Object} Score and details
   */
  static getCompatibilityScore(newSupplementId, currentStack) {
    const interactions = [];
    let score = 100;

    currentStack.forEach(item => {
      const interaction = this.checkInteraction(newSupplementId, item.supplementId);
      if (interaction) {
        interactions.push({
          ...interaction,
          with: item.name
        });

        const penalty = {
          'positive': -5,  // Bonus
          'low': 5,
          'moderate': 15,
          'critical': 50
        }[interaction.severity];

        score += penalty;
      }
    });

    return {
      score: Math.max(0, score),
      compatibility: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
      interactions,
      recommendation: score < 50 ? 'Consider spacing intake' : score < 70 ? 'Compatible with caution' : 'Excellent match'
    };
  }

  /**
   * Get suggested supplements that pair well with current stack
   * @param {Array} currentStack
   * @param {Array} availableSupplement
   * @returns {Array} Sorted by compatibility score
   */
  static getSuggestedPairings(currentStack, availableSupplements = []) {
    return availableSupplements
      .map(supplement => ({
        ...supplement,
        ...this.getCompatibilityScore(supplement.id, currentStack)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Generate compatibility report
   * @param {Array} stack
   * @param {Array} conditions
   * @returns {Object} Detailed report
   */
  static generateReport(stack, conditions = []) {
    const stackValidation = this.validateStack(stack);
    const contraindications = this.checkContraindications(stack, conditions);

    return {
      timestamp: new Date().toISOString(),
      stack: stack.length,
      validationResult: stackValidation.isValid,
      issues: {
        critical: stackValidation.criticalIssues.length,
        moderate: stackValidation.issues.filter(i => i.severity === 'moderate').length,
        low: stackValidation.issues.filter(i => i.severity === 'low').length
      },
      contraindications: contraindications.length,
      details: {
        interactions: stackValidation.interactions,
        contraindications,
        recommendations: this.generateRecommendations(stackValidation, contraindications)
      }
    };
  }

  /**
   * Generate actionable recommendations
   * @private
   */
  static generateRecommendations(stackValidation, contraindications) {
    const recommendations = [];

    // Critical issues
    if (stackValidation.criticalIssues.length > 0) {
      recommendations.push({
        type: 'critical',
        action: 'Consult healthcare provider before combining these supplements',
        items: stackValidation.criticalIssues
      });
    }

    // Spacing recommendations
    const moderateIssues = stackValidation.issues.filter(i => i.severity === 'moderate');
    if (moderateIssues.length > 0) {
      recommendations.push({
        type: 'spacing',
        action: 'Take supplements 2+ hours apart to minimize interactions',
        items: moderateIssues
      });
    }

    // Positive pairings
    const positiveInteractions = stackValidation.interactions.filter(i => i.severity === 'positive');
    if (positiveInteractions.length > 0) {
      recommendations.push({
        type: 'positive',
        action: 'These supplements work well together',
        items: positiveInteractions
      });
    }

    // Contraindication alerts
    if (contraindications.length > 0) {
      recommendations.push({
        type: 'contraindication',
        action: 'Remove or consult provider about',
        items: contraindications
      });
    }

    return recommendations;
  }
}

export default CompatibilityValidator;
