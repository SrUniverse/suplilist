// ============================================================
// dosage-converter.js — Centraliza conversões de dose
// Evita duplicação em list-page.js, my-stack-page.js, stack-recommender.js
// ============================================================

/**
 * Convert dose to grams based on unit
 * @param {number} dose - Value (e.g., 5, 500)
 * @param {string} unit - Unit (g, mg, mcg, UI, caps, pills)
 * @returns {number} Dose in grams (or best-effort estimate for non-metric units)
 */
export function dosageToGrams(dose, unit) {
  const u = (unit || 'g').toLowerCase().trim();

  if (u === 'g') return dose;
  if (u === 'mg') return dose / 1000;
  if (u === 'mcg') return dose / 1_000_000;

  // UI, caps, pills — assume 1 UI/cap/pill ≈ 0.001g (conservative estimate)
  // This is a fallback; actual values vary by supplement
  if (u === 'ui') return dose / 1000;
  if (u === 'caps' || u === 'capsules' || u === 'pills') return dose / 1000;

  // Unknown unit — fallback to treating as grams
  return dose;
}

/**
 * Estimate price per gram given total price and dose
 * @param {number} totalPrice - Price in BRL
 * @param {number} dose - Dose value
 * @param {string} unit - Unit (g, mg, mcg, UI, caps)
 * @returns {number} Price per gram
 */
export function estimatePricePerGram(totalPrice, dose, unit) {
  const grams = dosageToGrams(dose, unit);
  return grams > 0 ? totalPrice / grams : 0;
}

/**
 * Estimate monthly cost from daily dose
 * @param {number} dose - Daily dose
 * @param {string} unit - Unit
 * @param {number} pricePerGram - Price per gram
 * @param {number} daysPerMonth - Days to calculate (default 30)
 * @returns {number} Estimated monthly cost in BRL
 */
export function estimateMonthlyCost(dose, unit, pricePerGram, daysPerMonth = 30) {
  const grams = dosageToGrams(dose, unit);
  return grams * pricePerGram * daysPerMonth;
}

/**
 * Format dose for display
 * @param {number} dose - Value
 * @param {string} unit - Unit
 * @returns {string} Formatted dose (e.g., "5g", "500mg")
 */
export function formatDose(dose, unit) {
  if (!unit) return String(dose);
  return `${dose}${unit}`;
}

export default {
  dosageToGrams,
  estimatePricePerGram,
  estimateMonthlyCost,
  formatDose,
};
