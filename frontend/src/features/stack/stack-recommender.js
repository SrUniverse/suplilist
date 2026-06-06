/**
 * stack-recommender.js — Supplement recommendation system
 * Refactored with modular architecture
 */

export { SUPPLEMENTS_DB } from '../../data/supplements.js';
export * from './stack-recommender-engine.js';
export * from './dosage-optimizer.js';
export * from './goal-optimizer.js';

// Re-export for backward compatibility
import { 
  getRecommendations,
  getSupplementById,
  calculateCompatibility
} from './stack-recommender-engine.js';

import {
  compareWithRecommended,
  getStatusColor,
  calcDailyCost
} from './dosage-optimizer.js';

import {
  getGoalConfig,
  prioritizeByGoal,
  getGoalMetrics
} from './goal-optimizer.js';

export {
  getRecommendations,
  getSupplementById,
  calculateCompatibility,
  compareWithRecommended,
  getStatusColor,
  calcDailyCost,
  getGoalConfig,
  prioritizeByGoal,
  getGoalMetrics
};

export default {
  getRecommendations,
  getSupplementById,
  calculateCompatibility,
  compareWithRecommended,
  getStatusColor,
  calcDailyCost,
  getGoalConfig,
  prioritizeByGoal,
  getGoalMetrics
};
