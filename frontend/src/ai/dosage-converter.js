// ============================================================
// Dosage Unit Converter — SupliList
// Converts supplement dosages to standardized gram units.
// ============================================================

/**
 * Conversion table for UI (International Units) to grams.
 * Each supplement has a unique conversion factor.
 */
const UI_TO_GRAMS_TABLE = {
  'vitamina-d3': 0.000000025, // 1 UI = 0.025 mcg = 0.000000025 g
  // Add other UI-based supplements here as needed
};

/**
 * Converts a dosage from any unit to grams (internal standard).
 *
 * @param {number} dose - The dosage amount
 * @param {string} unit - The unit of measurement ('g', 'mg', 'mcg', 'UI', 'bi UFC')
 * @param {string} [supplementId] - Required when unit is 'UI' for supplement-specific conversion
 * @returns {number} The dosage converted to grams
 * @throws {Error} If the unit cannot be converted to mass or if supplementId is missing for UI
 */
export function convertToGrams(dose, unit, supplementId = null) {
  if (typeof dose !== 'number' || dose < 0) {
    throw new TypeError('dose must be a non-negative number');
  }

  switch (unit) {
    case 'g':
      return dose;

    case 'mg':
      return dose / 1000;

    case 'mcg':
      return dose / 1_000_000;

    case 'UI': {
      if (!supplementId) {
        throw new Error('supplementId is required for UI to grams conversion');
      }
      const conversionFactor = UI_TO_GRAMS_TABLE[supplementId];
      if (!conversionFactor) {
        throw new Error(`UI to grams conversion not configured for supplement: ${supplementId}`);
      }
      return dose * conversionFactor;
    }

    case 'bi UFC':
      throw new Error('bi UFC (bacterial colony forming units) cannot be converted to grams');

    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
}

/**
 * Validates if a unit is convertible to grams.
 *
 * @param {string} unit - The unit to validate
 * @param {string} [supplementId] - Required when unit is 'UI'
 * @returns {boolean} True if the unit can be converted to grams
 */
export function isConvertibleToGrams(unit, supplementId = null) {
  if (unit === 'UI') {
    return !!(supplementId && UI_TO_GRAMS_TABLE[supplementId] !== undefined);
  }
  return ['g', 'mg', 'mcg'].includes(unit);
}
