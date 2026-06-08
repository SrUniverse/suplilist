/**
 * Smart Recommendations — Personalized supplement suggestions
 * Based on user profile, adherence patterns, and health goals
 */

import { stateManager } from '../../state/state-manager.js';

export class SmartRecommender {
  constructor() {
    this.recommendations = [];
    this.userProfile = null;
    this.supplementDatabase = this.initSupplementDatabase();
  }

  /**
   * Initialize supplement database with properties
   */
  initSupplementDatabase() {
    return {
      'Vitamina D': {
        category: 'vitamins',
        benefits: ['immune', 'bones', 'mood'],
        ideal_time: 'morning',
        deficiency_risk: ['low-sun', 'winter', 'indoors'],
        contraindications: [],
        price_range: [10, 50]
      },
      'Ômega 3': {
        category: 'fatty-acids',
        benefits: ['heart', 'brain', 'joints'],
        ideal_time: 'with-meal',
        deficiency_risk: ['sedentary', 'stress', 'age-40+'],
        contraindications: ['blood-thinners'],
        price_range: [15, 60]
      },
      'Magnésio': {
        category: 'minerals',
        benefits: ['stress', 'sleep', 'muscle'],
        ideal_time: 'evening',
        deficiency_risk: ['stress', 'poor-sleep', 'exercise'],
        contraindications: [],
        price_range: [8, 40]
      },
      'Probióticos': {
        category: 'probiotics',
        benefits: ['digestion', 'immune', 'gut'],
        ideal_time: 'morning',
        deficiency_risk: ['poor-diet', 'antibiotics', 'ibs'],
        contraindications: [],
        price_range: [10, 50]
      },
      'Vitamina B12': {
        category: 'vitamins',
        benefits: ['energy', 'mood', 'focus'],
        ideal_time: 'morning',
        deficiency_risk: ['vegan', 'vegetarian', 'age-50+', 'fatigue'],
        contraindications: [],
        price_range: [5, 30]
      },
      'Colágeno': {
        category: 'proteins',
        benefits: ['skin', 'joints', 'hair'],
        ideal_time: 'morning',
        deficiency_risk: ['aging', 'joint-pain', 'skin-health'],
        contraindications: [],
        price_range: [20, 80]
      },
      'Ferro': {
        category: 'minerals',
        benefits: ['energy', 'blood', 'focus'],
        ideal_time: 'morning-empty',
        deficiency_risk: ['anemia', 'heavy-period', 'vegetarian'],
        contraindications: ['high-iron'],
        price_range: [5, 25]
      },
      'Zinco': {
        category: 'minerals',
        benefits: ['immune', 'healing', 'vision'],
        ideal_time: 'evening',
        deficiency_risk: ['immune-weak', 'wound-healing', 'age-60+'],
        contraindications: [],
        price_range: [5, 30]
      }
    };
  }

  /**
   * Get personalized recommendations
   */
  getRecommendations(limit = 5) {
    const profile = stateManager.select(s => s.profile);
    const stack = stateManager.select(s => s.stack) || [];
    const adherencePercent = this.calculateCurrentAdherence();

    // Score recommendations
    const scored = this.scoreRecommendations(profile, stack, adherencePercent);

    // Sort by score and take top N
    return scored
      .filter(rec => rec.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Score each recommendation
   */
  scoreRecommendations(profile, stack, adherence) {
    const recommendations = [];

    for (const [name, supplement] of Object.entries(this.supplementDatabase)) {
      // Skip if already in stack
      if (stack.some(s => s.name === name)) {
        continue;
      }

      let score = 0;

      // Profile-based scoring
      if (profile?.ageGroup === '40-60' && supplement.benefits.includes('heart')) {
        score += 20;
      }
      if (profile?.goals?.includes('energy') && supplement.benefits.includes('energy')) {
        score += 15;
      }
      if (profile?.goals?.includes('sleep') && supplement.benefits.includes('sleep')) {
        score += 15;
      }
      if (profile?.goals?.includes('immune') && supplement.benefits.includes('immune')) {
        score += 10;
      }
      if (profile?.goals?.includes('stress') && supplement.benefits.includes('stress')) {
        score += 10;
      }

      // Adherence-based scoring
      if (adherence >= 80) {
        score += 10; // User is consistent, recommend more
      } else if (adherence < 50) {
        score -= 5; // User needs to improve current stack first
      }

      // Risk factor scoring
      if (profile?.riskFactors) {
        profile.riskFactors.forEach(risk => {
          if (supplement.deficiency_risk.includes(risk)) {
            score += 25; // High priority if addresses a risk
          }
        });
      }

      // Lifestyle scoring
      if (profile?.lifestyle === 'sedentary' && supplement.benefits.includes('joints')) {
        score += 15;
      }
      if (profile?.lifestyle === 'active' && supplement.benefits.includes('muscle')) {
        score += 10;
      }

      // Contraindication check
      if (profile?.medications) {
        if (supplement.contraindications.some(c => profile.medications.includes(c))) {
          score = 0; // Do not recommend
        }
      }

      recommendations.push({
        name,
        supplement,
        score,
        reason: this.getRecommendationReason(name, supplement, profile),
        confidence: Math.min(100, Math.max(0, score))
      });
    }

    return recommendations;
  }

  /**
   * Get human-readable reason for recommendation
   */
  getRecommendationReason(name, supplement, profile) {
    const benefits = supplement.benefits.slice(0, 2).join(' e ');

    if (profile?.riskFactors?.some(r => supplement.deficiency_risk.includes(r))) {
      return `Recomendado para ${benefits}`;
    }

    if (profile?.goals?.some(g => supplement.benefits.includes(g))) {
      return `Suporta seu objetivo: ${profile.goals.find(g => supplement.benefits.includes(g))}`;
    }

    if (profile?.ageGroup === '40-60') {
      return `Essencial para sua faixa etária`;
    }

    return `Pode beneficiar ${benefits}`;
  }

  /**
   * Get recommendations for specific goal
   */
  getRecommendationsByGoal(goal) {
    const recommendations = [];

    for (const [name, supplement] of Object.entries(this.supplementDatabase)) {
      if (supplement.benefits.includes(goal)) {
        recommendations.push({
          name,
          supplement,
          benefits: supplement.benefits,
          reason: `Ajuda com: ${goal}`
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate current adherence percentage
   */
  calculateCurrentAdherence() {
    const checkins = stateManager.select(s => s.checkins) || [];
    const stack = stateManager.select(s => s.stack) || [];
    const thirtyDaysAgo = this.getDateOffset(-29);

    const monthCheckins = checkins.filter(c => c.date >= thirtyDaysAgo);
    const expected = stack.length * 30;

    return expected > 0 ? Math.round((monthCheckins.length / expected) * 100) : 0;
  }

  /**
   * Get next supplement to add based on stack
   */
  getNextSupplementSuggestion() {
    const recommendations = this.getRecommendations(1);
    return recommendations.length > 0 ? recommendations[0] : null;
  }

  /**
   * Get best time to take supplement
   */
  getBestTime(supplementName) {
    const supplement = this.supplementDatabase[supplementName];
    if (!supplement) return 'morning';

    return supplement.ideal_time;
  }

  /**
   * Get supplement category
   */
  getCategory(supplementName) {
    const supplement = this.supplementDatabase[supplementName];
    return supplement?.category || 'other';
  }

  /**
   * Rate user's current stack
   */
rateCurrentStack() {
    const stack = stateManager.select(s => s.stack) || [];

    let score = 0;
    const analysis = {
      goodChoices: [],
      missingCategories: [],
      suggestions: []
    };

    // Check stack composition
    const categories = {};
    stack.forEach(supp => {
      const cat = this.getCategory(supp.name);
      categories[cat] = (categories[cat] || 0) + 1;
    });

    // Analyze categories
    const requiredCategories = ['vitamins', 'minerals'];
    requiredCategories.forEach(cat => {
      if (categories[cat]) {
        score += 25;
        analysis.goodChoices.push(`✓ Tem ${cat}`);
      } else {
        analysis.missingCategories.push(cat);
      }
    });

    // Score diversity
    if (Object.keys(categories).length >= 3) {
      score += 25;
      analysis.goodChoices.push('✓ Boa diversidade');
    }

    // Check adherence
    const adherence = this.calculateCurrentAdherence();
    if (adherence >= 80) {
      score += 25;
      analysis.goodChoices.push('✓ Ótima aderência');
    }

    // Suggestions
    if (analysis.missingCategories.length > 0) {
      const sugg = this.getRecommendationsByGoal('immune')[0];
      if (sugg) {
        analysis.suggestions.push(`Adicione ${sugg.name} para fortalecer imunidade`);
      }
    }

    return {
      score: Math.min(100, score),
      analysis,
      stackSize: stack.length,
      recommendation: score < 75 ? 'Considere adicionar mais suplementos' : 'Sua stack está bem balanceada!'
    };
  }

  /**
   * Get date offset
   */
  getDateOffset(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Check compatibility between supplements
   */
  checkCompatibility(supp1, supp2) {
    // Example compatibility rules
    const incompatibilities = [
      ['Ferro', 'Cálcio'],
      ['Ferro', 'Chá'],
      ['Vitamina D', 'Certos anticonvulsivos']
    ];

    const pair = [supp1, supp2].sort();
    return !incompatibilities.some(
      inc => JSON.stringify(inc.sort()) === JSON.stringify(pair)
    );
  }
}

export default new SmartRecommender();
