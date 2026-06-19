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

// Mass-based packaging units: pricePerUnit is denominated per gram.
const MASS_STORE_UNITS = new Set(['g', 'mg', 'mcg']);
// Count-based dose units that map 1:1 onto count-based packaging.
const COUNT_DOSE_UNITS = new Set(['caps', 'capsules', 'pills']);

/**
 * Cost of a single dose given a store's packaging price.
 *
 * Two pricing regimes exist in prices.json:
 * - Mass-priced packages (unit "g") → pricePerUnit is R$/gram. The dose is
 *   converted to grams using ITS OWN unit (mg/g/mcg) and multiplied.
 * - Count-priced packages (unit "caps"/"pills") → pricePerUnit is R$/capsule.
 *   A mg/UI dose cannot be converted to capsules without per-capsule content,
 *   so we assume 1 capsule per dose (the common case). When the dose itself is
 *   expressed in capsules, we use the capsule count directly.
 *
 * @param {number} dose - Maintenance dose value (in doseUnit)
 * @param {string} doseUnit - Dose unit (g, mg, mcg, UI, caps, ...)
 * @param {number} pricePerUnit - Store price per packaging unit
 * @param {string} storeUnit - Packaging unit (g or caps)
 * @returns {number} Cost per dose in BRL (0 when inputs are invalid)
 */
export function costPerDose(dose, doseUnit, pricePerUnit, storeUnit) {
  if (!(pricePerUnit > 0) || !(dose > 0)) return 0;
  const su = (storeUnit || 'g').toLowerCase().trim();

  if (MASS_STORE_UNITS.has(su)) {
    return pricePerUnit * dosageToGrams(dose, doseUnit);
  }

  // Count-based packaging (caps/pills).
  const du = (doseUnit || '').toLowerCase().trim();
  if (du === su || COUNT_DOSE_UNITS.has(du)) {
    return pricePerUnit * dose;
  }
  // Dose in mg/UI/etc against capsule pricing — assume 1 capsule per dose.
  return pricePerUnit;
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
  costPerDose,
  formatDose,
};
