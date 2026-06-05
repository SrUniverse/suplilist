/**
 * stack-recommender-engine.js — Core recommendation algorithm
 * Extracted from stack-recommender.js
 */

import { SUPPLEMENTS_DB } from './stack-recommender.js';

/**
 * Get recommended supplements for a user profile
 */
export function getRecommendations(profile) {
  const { objective, restrictions = [], budget = 300 } = profile;
  
  return SUPPLEMENTS_DB.filter(s => {
    if (restrictions.includes(s.id)) return false;
    if (!s.targets?.[objective]) return false;
    const estimatedCost = s.pricePerGram * 30;
    return estimatedCost <= budget;
  }).sort((a, b) => {
    const scoreA = a.targets?.[objective] ?? 0;
    const scoreB = b.targets?.[objective] ?? 0;
    return scoreB - scoreA;
  });
}

/**
 * Get supplement by ID
 */
export function getSupplementById(id) {
  return SUPPLEMENTS_DB.find(s => s.id === id);
}

/**
 * Calculate compatibility score between supplements
 */
export function calculateCompatibility(supps) {
  if (supps.length < 2) return 1.0;
  let conflicts = 0;
  for (let i = 0; i < supps.length; i++) {
    for (let j = i + 1; j < supps.length; j++) {
      const s1 = getSupplementById(supps[i].id);
      const s2 = getSupplementById(supps[j].id);
      if (s1?.conflicts?.includes(s2?.id)) conflicts++;
    }
  }
  return Math.max(0, 1.0 - (conflicts * 0.1));
}
