/**
 * stack-recommender-engine.js — Core recommendation algorithm
 * Extracted from stack-recommender.js
 */

import { SUPPLEMENTS_DB } from './stack-recommender.js';

/** Peso por nível de evidência — favorece A/B sobre C no ranking. */
const EVIDENCE_WEIGHT = { A: 1.0, B: 0.7, C: 0.4 };

/**
 * Get recommended supplements for a user profile.
 *
 * @param {Object} profile
 * @param {string} profile.objective
 * @param {string[]} [profile.restrictions]
 * @param {number} [profile.budget=300]
 * @param {number} [profile.limit] - Se informado, retorna apenas os N melhores
 *   (stack curado). Sem limit, retorna todos os compatíveis (catálogo filtrado).
 * @returns {Array<Object>} Suplementos ordenados por relevância (alvo × evidência)
 */
export function getRecommendations(profile) {
  const { objective, restrictions = [], budget = 300, limit } = profile;

  const ranked = SUPPLEMENTS_DB.filter(s => {
    if (restrictions.includes(s.id)) return false;
    if (!s.targets?.[objective]) return false;
    const estimatedCost = s.pricePerGram * 30;
    return estimatedCost <= budget;
  }).sort((a, b) => {
    // Relevância = afinidade com o objetivo ponderada pela força da evidência.
    const scoreA = (a.targets?.[objective] ?? 0) * (EVIDENCE_WEIGHT[a.evidenceLevel] ?? 0.4);
    const scoreB = (b.targets?.[objective] ?? 0) * (EVIDENCE_WEIGHT[b.evidenceLevel] ?? 0.4);
    return scoreB - scoreA;
  });

  return (Number.isFinite(limit) && limit > 0) ? ranked.slice(0, limit) : ranked;
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
