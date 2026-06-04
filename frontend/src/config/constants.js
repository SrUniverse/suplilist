// ============================================================
// config/constants.js — Constantes globais
// Centraliza magic numbers para fácil manutenção
// ============================================================

// Time-based constants
export const DAYS_PER_MONTH = 30;
export const DAYS_PER_WEEK = 7;
export const HOURS_PER_DAY = 24;

// Pricing defaults
export const DEFAULT_PRICE_PER_GRAM = 0.3;
export const CREATINE_PRICE_MULTIPLIER = 0.07;

// UI constants
export const PAGE_SIZE = 24;  // Items per page in list grid
export const TOAST_DURATION_MS = 3000;

// Performance thresholds
export const INFINITE_SCROLL_THRESHOLD = 500;  // pixels before end
export const DEBOUNCE_SEARCH_MS = 300;

export default {
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  HOURS_PER_DAY,
  DEFAULT_PRICE_PER_GRAM,
  CREATINE_PRICE_MULTIPLIER,
  PAGE_SIZE,
  TOAST_DURATION_MS,
  INFINITE_SCROLL_THRESHOLD,
  DEBOUNCE_SEARCH_MS,
};
