/**
 * my-stack-page-utils.js — Utility functions for stack management
 */

import { stateManager } from '../../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { offsetISO } from '../../utils/date.js';
import { getSupplementId } from '../../utils/stack.js';
import { resolveItemDose, dailyDoseInGrams } from './stack-dose.js';

let PRICES_DB = null;

/**
 * Fetch prices from /data/prices.json (cached)
 */
export async function fetchPrices() {
  if (PRICES_DB) return PRICES_DB;
  try {
    const res = await fetch('/data/prices.json');
    PRICES_DB = await res.json();
  } catch (_) {
    PRICES_DB = {};
  }
  return PRICES_DB;
}

/**
 * Format number as BRL currency
 */
export function formatBRL(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

/**
 * Calculate monthly investment for stack
 */
export function calcMonthlyInvestment(stack) {
  return stack.reduce((acc, item) => {
    const dbEntry = SUPPLEMENTS_DB.find(s => s.id === getSupplementId(item));
    const ppg = dbEntry?.pricePerGram ?? 0;
    // Resolve a dose mesmo quando o item foi salvo sem valor numérico
    // (recomputa via DosageCalculator) — evita custo R$0,00 por dose undefined.
    const { daily, unit } = resolveItemDose(item);
    const dosageInGrams = dailyDoseInGrams(daily, unit);
    if (dosageInGrams === null) return acc; // unidade não-mássica (ex.: UI)
    return acc + dosageInGrams * ppg * 30;
  }, 0);
}

/**
 * Calculate adherence rate for last 7 days
 */
export function calcAdherenceRate(stack) {
  if (!stack.length) return '0%';
  const checkins = stateManager.checkins ?? [];
  const stackIds = new Set(stack.map(item => item.supplementId));
  let completeDays = 0;
  for (let i = 0; i < 7; i++) {
    const day = offsetISO(i);
    const dayIds = new Set(checkins.filter(c => c.date === day).map(c => c.supplementId));
    const allChecked = [...stackIds].every(id => dayIds.has(id));
    if (allChecked) completeDays++;
  }
  return Math.round((completeDays / 7) * 100) + '%';
}

/**
 * Get supplement image from database or generate default
 */
export function getSupplementImage(item) {
  const dbEntry = SUPPLEMENTS_DB.find(s => s.id === getSupplementId(item));
  if (dbEntry?.image) return dbEntry.image;
  const slug = (item.name ?? '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `/assets/${slug}.webp`;
}

/**
 * Get evidence level from database
 */
export function getEvidenceLevel(item) {
  const dbEntry = SUPPLEMENTS_DB.find(s => s.id === getSupplementId(item));
  return dbEntry?.evidenceLevel ?? 'C';
}

/**
 * Calculate days left based on quantity and dosage
 */
export function calcDaysLeft(item) {
  const qty = parseFloat(item.quantity);
  const dosage = parseFloat(item.dosage);
  if (!qty || !dosage || dosage <= 0) return null;
  return Math.max(0, Math.floor(qty / dosage));
}
