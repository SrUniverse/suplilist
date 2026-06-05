/**
 * goal-optimizer.js — Goal-based recommendation optimization
 * Extracted from stack-recommender.js
 */

import { SUPPLEMENTS_DB } from './stack-recommender.js';

const GOAL_MAP = {
  'bulk': { key: 'bulk', label: 'Hipertrofia', priority: ['proteína', 'creatina', 'vitamina'] },
  'cut': { key: 'cut', label: 'Emagrecimento', priority: ['cafeína', 'l-carnitina'] },
  'endurance': { key: 'endurance', label: 'Performance', priority: ['beta-alanina', 'cafeína'] },
  'strength': { key: 'strength', label: 'Força', priority: ['creatina', 'proteína'] },
  'general': { key: 'general', label: 'Saúde Geral', priority: ['vitamina d', 'ômega 3'] }
};

/**
 * Get goal config
 */
export function getGoalConfig(goal) {
  return GOAL_MAP[goal] || GOAL_MAP.general;
}

/**
 * Prioritize supplements for a goal
 */
export function prioritizeByGoal(supplements, goal) {
  const config = getGoalConfig(goal);
  return supplements.sort((a, b) => {
    const aIdx = config.priority.findIndex(p => a.name.toLowerCase().includes(p));
    const bIdx = config.priority.findIndex(p => b.name.toLowerCase().includes(p));
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
}

/**
 * Get goal-specific metrics
 */
export function getGoalMetrics(stack, goal) {
  const config = getGoalConfig(goal);
  const relevantSupps = stack.filter(item => {
    const db = SUPPLEMENTS_DB.find(s => s.id === item.supplementId);
    return db?.targets?.[config.key] > 0;
  });
  
  return {
    coverage: (relevantSupps.length / Math.max(1, stack.length)) * 100,
    count: relevantSupps.length,
    goal: config.label
  };
}
