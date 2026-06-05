/**
 * list-page-utils.js — Utility functions for supplement listing and filtering
 * Extracted from ListPage for reusability and clarity
 */

import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { dosageToGrams } from '../../utils/dosage-converter.js';
import { DAYS_PER_MONTH } from '../../config/constants.js';

// ─── Category & Objective Mapping ────────────────────────────────────────────

export const CATEGORIES = [
  'Todos', 'Performance', 'Proteínas', 'Vitaminas', 'Adaptógenos',
  'Hormônios', 'Cognição', 'Antioxidantes', 'Sono', 'Saúde Geral'
];

export const OBJECTIVES = [
  'Hipertrofia', 'Saúde Geral', 'Longevidade', 'Performance', 'Foco', 'Emagrecimento'
];

export const OBJECTIVE_KEY_MAP = {
  'Hipertrofia':   'bulk',
  'Saúde Geral':   'general',
  'Longevidade':   'general',
  'Performance':   'endurance',
  'Foco':          'endurance',
  'Emagrecimento': 'cut',
};

// ─── URL & Security ─────────────────────────────────────────────────────────

/**
 * Sanitize affiliate URLs for security — reject non-HTTP protocols.
 * P6: valida URLs de afiliados — rejeita qualquer protocolo não-HTTP para evitar javascript: injection
 *
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or '#' if invalid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  try {
    const u = new URL(url);
    return ['https:', 'http:'].includes(u.protocol) ? url : '#';
  } catch {
    return '#';
  }
}

/**
 * Check if URL points to a product (not a generic search).
 * Recognizes patterns for Amazon, Amazon.br, Mercado Livre, Shopee.
 *
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is a product-specific link
 */
export function isProductUrl(url) {
  return /amzn\.to\/|amazon\.com\.br\/dp\/|meli\.la\/|shope\.ee\//.test(url ?? '');
}

// ─── Price Calculations ─────────────────────────────────────────────────────

/**
 * Get effective cost-per-unit for a store entry.
 * Prefers pricePerUnit (cost per gram/unit) if available, falls back to price (full cost).
 *
 * @param {Object} store - Store entry { price, pricePerUnit, label, ... }
 * @returns {number} Effective cost-per-unit
 */
export function getEffectiveCost(store) {
  return store.pricePerUnit ?? store.price;
}

/**
 * Get the cheapest store entry for a supplement (lowest cost-per-unit).
 * Searches prices[item.id] (object of store entries) and returns the one with
 * the lowest pricePerUnit. Used for price comparison and best-value display.
 *
 * @param {Object} item - Supplement item { id, name, ... }
 * @param {Object} [prices] - Prices object { [itemId]: { [storeId]: { price, label, ... } } }
 * @returns {Object|null} Cheapest store entry or null if no prices available
 */
export function getCheapestStore(item, prices) {
  const entries = prices && prices[item.id] ? Object.values(prices[item.id]) : null;
  if (!entries || !entries.length) return null;
  return entries.reduce((a, b) => getEffectiveCost(a) < getEffectiveCost(b) ? a : b);
}

/**
 * Get monthly price label for a supplement.
 * Returns cheapest store price, or estimates cost from pricePerGram if no live pricing.
 *
 * @param {Object} item - Supplement item
 * @param {Object} [prices] - Live price data from prices.json
 * @returns {{price: number, label: string|null}} { price: monthly cost, label: store name or null }
 */
export function getPriceLabel(item, prices) {
  const cheapest = getCheapestStore(item, prices);
  if (cheapest) return { price: cheapest.price, label: cheapest.label };

  const dose = item.dosage?.maintenance ?? 5;
  const unit = item.dosage?.unit || 'g';
  const ppg = item.pricePerGram ?? 0.3;
  const doseInGrams = dosageToGrams(dose, unit);
  return { price: doseInGrams * ppg * DAYS_PER_MONTH, label: null };
}

/**
 * Get per-dose price string for display in supplement card.
 * Calculates cost per maintenance dose. Uses live pricing if available,
 * falls back to pricePerGram estimates.
 *
 * @param {Object} item - Supplement item
 * @param {Object} [prices] - Live price data
 * @returns {string} Formatted price (e.g., "R$ 2,50 / dose")
 */
export function getDosePrice(item, prices) {
  const cheapest = getCheapestStore(item, prices);
  if (cheapest) {
    if (cheapest.pricePerUnit && cheapest.unit) {
      const dose = item.dosage?.maintenance ?? 5;
      const doseInGrams = dosageToGrams(dose, cheapest.unit);
      const dosePrice = cheapest.pricePerUnit * doseInGrams;
      return `R$ ${dosePrice.toFixed(2).replace('.', ',')} / dose`;
    }
    return `R$ ${(cheapest.price / DAYS_PER_MONTH).toFixed(2).replace('.', ',')} / dose`;
  }

  const dose = item.dosage?.maintenance ?? 5;
  const unit = item.dosage?.unit || 'g';
  const ppg = item.pricePerGram ?? 0.3;
  const doseInGrams = dosageToGrams(dose, unit);
  return `R$ ${(doseInGrams * ppg).toFixed(2).replace('.', ',')} / dose`;
}

/**
 * Get maximum price savings across all stores for a supplement.
 *
 * @param {Object} item - Supplement item
 * @param {Object} [prices] - Price data
 * @returns {number|null} Savings amount or null if none available
 */
export function getMaxSaving(item, prices) {
  const key = item.id;
  if (!prices || !prices[key]) return null;
  const entries = Object.values(prices[key]);
  const maxSaving = Math.max(...entries.map(e => e.saving || 0));
  return maxSaving > 0 ? maxSaving : null;
}

/**
 * Format number as Brazilian currency.
 *
 * @param {number} val - Value to format
 * @returns {string} Formatted currency string (e.g., "R$ 123,45")
 */
export function formatPrice(val) {
  return `R$ ${Number(val).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

// ─── Filtering ───────────────────────────────────────────────────────────────

/**
 * Check if supplement matches a category filter.
 *
 * @param {Object} item - Supplement item
 * @param {string} cat - Category name
 * @returns {boolean} True if item matches category
 */
export function matchesCategory(item, cat) {
  if (!cat || cat === 'Todos') return true;
  const c = (item.category || '').toLowerCase();

  if (cat === 'Performance')    return c.includes('força') || c.includes('performance') || c.includes('resistência') || c.includes('endurance') || c.includes('queima') || c.includes('gordura') || c.includes('recovery');
  if (cat === 'Proteínas')      return c.startsWith('prote');
  if (cat === 'Vitaminas')      return c.includes('vitam');
  if (cat === 'Adaptógenos')    return c.includes('adapt');
  if (cat === 'Hormônios')      return c.includes('hormon') || c.includes('testoster') || c.includes('libido');
  if (cat === 'Cognição')       return c.includes('cogni') || c.includes('neuro') || c.includes('foco');
  if (cat === 'Antioxidantes')  return c.includes('antioxid') || c.includes('anti-inflamat');
  if (cat === 'Sono')           return c.includes('sono') || c.includes('recuper');
  if (cat === 'Saúde Geral')    return c.includes('saúde') || c.includes('geral') || c.includes('imun') || c.includes('intestin') || c.includes('articular') || c.includes('pele') || c.includes('mineral') || c.includes('miner') || c.includes('omega') || c.includes('ômega');

  return true;
}

/**
 * Check if supplement matches an objective filter.
 * Uses OBJECTIVE_KEY_MAP to map display names to internal keys.
 *
 * @param {Object} item - Supplement item
 * @param {string} obj - Objective name
 * @returns {boolean} True if item targets this objective
 */
export function matchesObjective(item, obj) {
  if (!obj) return true;
  const key = OBJECTIVE_KEY_MAP[obj];
  if (!key) return true;
  return item.targets && item.targets[key] != null && item.targets[key] > 0;
}

// ─── Favorites Management ───────────────────────────────────────────────────

/**
 * Get current favorites as a Set for O(1) lookup.
 *
 * @returns {Set<string>} Set of favorite supplement IDs
 */
export function getFavoritesFromState() {
  return new Set(stateManager.favorites ?? []);
}

/**
 * Toggle favorite status for a supplement.
 * Dispatches ADD_FAVORITE or REMOVE_FAVORITE action.
 *
 * @param {string} supplementId - ID of supplement to toggle
 * @returns {void}
 */
export function toggleFavorite(supplementId) {
  const favs = getFavoritesFromState();
  if (favs.has(supplementId)) {
    stateManager.dispatch(ACTIONS.REMOVE_FAVORITE, { supplementId });
  } else {
    stateManager.dispatch(ACTIONS.ADD_FAVORITE, { supplementId });
  }
}
