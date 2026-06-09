/**
 * history-page-utils.js
 *
 * Shared utility functions for HistoryPage components.
 * Includes date formatting, cost estimation, and data mapping.
 *
 * @module history-page-utils
 */

import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { getSupplementId } from '../../utils/stack.js';

// ─── Date Formatting ─────────────────────────────────────────────────────────

export const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Pad a number to 2 digits with leading zero
 * @param {number} n - Number to pad
 * @returns {string} Padded number
 */
export const pad = (n) => String(n).padStart(2, '0');

/**
 * Format ISO date as "Mês Ano" (e.g., "Jan 2026")
 * @param {string} isoDate - ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted date
 */
export const formatMonthYear = (isoDate) => {
  if (!isoDate) return '';
  const [y, m] = isoDate.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
};

// ─── Data Mapping ────────────────────────────────────────────────────────────

/**
 * Build a map of supplement ID → DB entry
 * @returns {Object<string, Object>} Map of supplements
 */
export const buildSupMap = () => {
  const map = {};
  for (const s of SUPPLEMENTS_DB) {
    map[s.id] = s;
  }
  return map;
};

// ─── Cost Estimation ─────────────────────────────────────────────────────────

/**
 * Estimate daily cost from user's supplement stack
 * Converts all units to grams before multiplying by pricePerGram
 *
 * @param {Array} stack - User's supplement stack
 * @param {Object} supMap - Supplement database map
 * @returns {number} Estimated daily cost in R$
 */
export const estimateDailyCost = (stack, supMap) => {
  let total = 0;

  for (const item of stack) {
    const sid = getSupplementId(item);
    const db = supMap[sid];

    if (!db || !db.dosage || !db.pricePerGram) continue;

    const dose = db.dosage.maintenance || 5;
    const unit = (db.dosage.unit || 'g').toLowerCase();

    // Convert to grams before multiplying by pricePerGram
    let doseInGrams;
    if (unit === 'g') {
      doseInGrams = dose;
    } else if (unit === 'mg') {
      doseInGrams = dose / 1000;
    } else if (unit === 'mcg') {
      doseInGrams = dose / 1_000_000;
    } else {
      // UI, IU, UFC, etc. can't be converted — skip
      continue;
    }

    total += doseInGrams * db.pricePerGram;
  }

  return total;
};

// ─── Category Constants ──────────────────────────────────────────────────────

export const CATEGORIES = [
  'Todos',
  'Força & Performance',
  'Proteínas',
  'Vitaminas & Minerais',
  'Adaptógenos & Foco',
  'Cognição & Neuroproteção',
  'Saúde Hormonal',
  'Antioxidantes & Anti-inflamatórios',
  'Sono & Recuperação',
  'Saúde Geral'
];
