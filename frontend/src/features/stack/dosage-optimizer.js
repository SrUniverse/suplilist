/**
 * dosage-optimizer.js — Dosage calculations and optimization
 * Extracted from stack-recommender.js
 */

import { SUPPLEMENTS_DB } from './stack-recommender.js';

export const STATUS_COLORS = {
  'optimal': '#22C55E',
  'suboptimal': '#FBBF24',
  'not-recommended': '#EF4444',
  'missing': '#6B7280'
};

/**
 * Compare user dosage with recommended range
 */
export function compareWithRecommended(item) {
  const db = SUPPLEMENTS_DB.find(s => s.id === item.supplementId);
  if (!db?.dosage?.maintenance) return null;

  const userDose = parseFloat(item.dosage);
  const recommended = db.dosage.maintenance;
  const upperLimit = db.dosage.upperLimit ?? recommended * 2;

  if (userDose < recommended * 0.8) return { status: 'suboptimal', ratio: userDose / recommended };
  if (userDose > upperLimit) return { status: 'not-recommended', ratio: userDose / upperLimit };
  return { status: 'optimal', ratio: userDose / recommended };
}

/**
 * Get status color
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] ?? '#666';
}

/**
 * Calculate daily cost for an item
 */
export function calcDailyCost(item) {
  const db = SUPPLEMENTS_DB.find(s => s.id === item.supplementId);
  if (!db) return 0;
  const dosage = parseFloat(item.dosage);
  const ppg = db.pricePerGram ?? 0;
  return dosage * ppg;
}
