import { stateManager, ACTIONS } from '../state/state-manager.js';
import { logger } from '../utils/logger.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import Fuse from 'fuse.js';
import { escapeHtml } from '../utils/escape.js';
import { EVIDENCE_COLORS } from '../utils/evidence.js';
import affiliateEngine from '../monetization/affiliate-engine.js';
import { dosageToGrams } from '../utils/dosage-converter.js';
import { DAYS_PER_MONTH, PAGE_SIZE as CONST_PAGE_SIZE, DEBOUNCE_SEARCH_MS } from '../config/constants.js';
import { VirtualScroller } from '../core/virtual-scroller.js';
import { CheckoutModal } from '../features/premium/checkout-modal.js';

/**
 * Sanitize affiliate URLs for security — reject non-HTTP protocols.
 *
 * P6: valida URLs de afiliados — rejeita qualquer protocolo não-HTTP para evitar javascript: injection
 *
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or '#' if invalid
 * @private
 */
function sanitizeUrl(url) {
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
 *
 * Recognizes patterns for Amazon, Amazon.br, Mercado Livre, Shopee.
 *
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is a product-specific link
 * @private
 */
function isProductUrl(url) {
  return /amzn\.to\/|amazon\.com\.br\/dp\/|meli\.la\/|shope\.ee\//.test(url ?? '');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Todos', 'Performance', 'Proteínas', 'Vitaminas', 'Adaptógenos', 'Hormônios', 'Cognição', 'Antioxidantes', 'Sono', 'Saúde Geral'];
const OBJECTIVES = ['Hipertrofia', 'Saúde Geral', 'Longevidade', 'Performance', 'Foco'];

const OBJECTIVE_KEY_MAP = {
  'Hipertrofia': 'bulk',
  'Saúde Geral': 'general',
  'Longevidade': 'general',
  'Performance': 'endurance',
  'Foco': 'endurance',
};

const PAGE_SIZE = CONST_PAGE_SIZE;

/**
 * Get effective cost-per-unit for a store entry.
 *
 * Prefers pricePerUnit (cost per gram/unit) if available, falls back to price (full cost).
 *
 * @param {Object} store - Store entry { price, pricePerUnit, label, ... }
 * @returns {number} Effective cost-per-unit
 * @private
 */
function getEffectiveCost(store) {
  return store.pricePerUnit ?? store.price;
}

/**
 * Get the cheapest store entry for a supplement (lowest cost-per-unit).
 *
 * Searches prices[item.id] (object of store entries) and returns the one with
 * the lowest pricePerUnit. Used for price comparison and best-value display.
 *
 * @param {Object} item - Supplement item { id, name, ... }
 * @param {Object} [prices] - Prices object { [itemId]: { [storeId]: { price, label, ... } } }
 * @returns {Object|null} Cheapest store entry or null if no prices available
 * @private
 */
function getCheapestStore(item, prices) {
  const entries = prices && prices[item.id] ? Object.values(prices[item.id]) : null;
  if (!entries || !entries.length) return null;
  return entries.reduce((a, b) => getEffectiveCost(a) < getEffectiveCost(b) ? a : b);
}

/**
 * Get monthly price label for a supplement.
 *
 * Returns cheapest store price, or estimates cost from pricePerGram if no live pricing.
 *
 * @param {Object} item - Supplement item
 * @param {Object} [prices] - Live price data from prices.json
 * @returns {{price: number, label: string|null}} { price: monthly cost, label: store name or null }
 * @private
 */
function getPriceLabel(item, prices) {
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
 *
 * Calculates cost per maintenance dose. Uses live pricing if available,
 * falls back to pricePerGram estimates.
 *
 * @param {Object} item - Supplement item
 * @param {Object} [prices] - Live price data
 * @returns {string} Formatted price (e.g., "R$ 2,50 / dose")
 * @private
 */
function getDosePrice(item, prices) {
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
 * @private
 */
function getMaxSaving(item, prices) {
  const key = item.id;
  if (!prices || !prices[key]) return null;
  const entries = Object.values(prices[key]);
  const maxSaving = Math.max(...entries.map(e => e.saving || 0));
  return maxSaving > 0 ? maxSaving : null;
}


function matchesCategory(item, cat) {
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

function matchesObjective(item, obj) {
  if (!obj) return true;
  const key = OBJECTIVE_KEY_MAP[obj];
  if (!key) return true;
  return item.targets && item.targets[key] != null && item.targets[key] > 0;
}

function getFavoritesFromState() {
  return new Set(stateManager.favorites ?? []);
}

function toggleFavorite(supplementId) {
  const favs = getFavoritesFromState();
  if (favs.has(supplementId)) {
    stateManager.dispatch(ACTIONS.REMOVE_FAVORITE, { supplementId });
  } else {
    stateManager.dispatch(ACTIONS.ADD_FAVORITE, { supplementId });
  }
}

function formatPrice(val) {
  return `R$ ${Number(val).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

// ─── Main Class ───────────────────────────────────────────────────────────────

/**
 * ListPage — Supplement catalog with search, filtering, and shopping features
 *
 * Full-text fuzzy search (Fuse.js) with category/objective filters.
 * Virtual scrolling for 300+ supplements. Infinite scroll pagination with sentinel observer.
 * Supplement detail modal with affiliate purchase links (Amazon, Mercado Livre, Shopee).
 * Integration with state (stack, favorites, pricing), analytics tracking, and EventBus pub/sub.
 *
 * Features:
 * - Fuzzy search (name, category, benefits) with debounce
 * - Filter by category (Performance, Proteínas, etc.) and objective (Hipertrofia, Foco, etc.)
 * - Virtual scrolling + infinite scroll for performance
 * - Supplement detail modal with evidence level, price/dose info, add-to-stack
 * - Favorites toggle (heart icon) synced to state
 * - Price comparison (cheapest store per supplement)
 * - Stats rings (total, stack count, favorites, high-evidence items)
 * - Affiliate tracking on purchase links
 */
export default class ListPage {
  /**
   * Create a new ListPage
   * @param {HTMLElement} container - DOM element to mount the page
   * @param {Object} [params={}] - Page parameters
   * @param {string} [params.objective] - Pre-select objective filter (e.g., 'Hipertrofia')
   */
  constructor(container, params = {}) {
    this.container = container;
    this._unsubscribe = null;
    this._fuse = null;
    this._allItems = [];
    this._filtered = [];
    this._page = 0;
    this._query = '';
    this._category = 'Todos';
    this._objective = params.objective || '';
    this._prices = null;
    this._modalOpen = null; // supplement id
    this._debounceTimer = null;
    this._observer = null;
    this._scroller = null; // Virtual scroller for list
    this._boundKeydown = this._onKeydown.bind(this);
    this._scrollLockStack = [];  // Stack of scroll lock sources (modal, etc)

    // Advanced Search state
    this._evidenceFilter = '';
    this._maxPriceFilter = 300;
    this._benefitsFilter = new Set();
    this._advancedPanelOpen = false;

    const state = stateManager.getState();
    this._currentTier = state.user?.tier ?? 'free';
  }

  /**
   * Mount the page to the DOM and initialize all listeners/subscriptions.
   *
   * Loads supplement database, fetches live pricing, initializes virtual scroll,
   * subscribes to state changes, attaches event listeners for search/filter/modal.
   * Renders initial grid and stats.
   *
   * @returns {void}
   */
  mount() {
    this._attachStyles();
    this._allItems = SUPPLEMENTS_DB;
    this._fuse = new Fuse(this._allItems, {
      keys: ['name', 'category', 'benefits'],
      threshold: 0.35,
      includeScore: true,
      ignoreLocation: true,
    });

    // Load prices async — AbortController lets unmount() cancel a pending fetch
    this._fetchController = new AbortController();
    fetch('/data/prices.json', { signal: this._fetchController.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        this._prices = data;
        this._renderGrid(); // re-render cards with real prices
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          logger.warn('[ListPage] prices.json failed to load, using estimates:', err.message);
        }
      });

    this._render();
    this._syncObjectiveChip();
    this._applyFilters();
    this._renderStats();
    this._renderGrid();
    this._initInfiniteScroll();
    this._attachListeners();

    // Rebuild grid on resize so column count stays correct
    this._resizeHandler = () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this._renderGrid(), 150);
    };
    window.addEventListener('resize', this._resizeHandler, { passive: true });
    this._unsubscribe = stateManager.subscribe(() => {
      const state = stateManager.getState();
      const newTier = state.user?.tier ?? 'free';
      if (newTier !== this._currentTier) {
        this._currentTier = newTier;
        this._applyFilters();
        this._renderGrid();
      } else {
        this._refreshCardStates();
      }
    });
    document.addEventListener('keydown', this._boundKeydown);
  }

  /**
   * Unmount the page and clean up all resources.
   *
   * Cancels pending fetch, unsubscribes from state, disconnects observers,
   * removes event listeners, closes modal, and restores scroll state.
   * Safe to call multiple times.
   *
   * @returns {void}
   */
  unmount() {
    this._fetchController?.abort();
    this._unsubscribe?.();
    this._observer?.disconnect();
    this._scroller?.unmount();
    document.removeEventListener('keydown', this._boundKeydown);
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    clearTimeout(this._resizeTimer);
    this._closeModal();
    // Cancel pending debounce search callback
    clearTimeout(this._debounceTimer);
    // Ensure scroll is not left locked after navigation (router-outlet + body fallback)
    const outlet = document.getElementById('router-outlet');
    if (outlet) outlet.style.overflow = '';
    document.body.style.overflow = '';
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  /**
   * Inject CSS styles for ListPage layout into <head> (idempotent).
   *
   * Creates <style id="list-page-styles"> with all component styles:
   * sticky header, search bar, filter chips, stats rings, supplement cards,
   * modal overlays, and responsive grid layout. Skips injection if already attached.
   *
   * @returns {void}
   * @private
   */
  _attachStyles() {
    if (document.getElementById('list-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'list-page-styles';
    style.textContent = `
      /* ── Layout ── */
      #lp-root {
        display: flex; flex-direction: column; gap: 0;
        padding-bottom: 80px;
        min-height: 100%;
      }

      /* ── Sticky Header ── */
      #lp-header {
        position: sticky; top: 0; z-index: 50;
        background: var(--color-bg-primary);
        border-bottom: 1px solid var(--color-border);
        padding: 16px 16px 12px;
        display: flex; flex-direction: column; gap: 10px;
      }
      #lp-header-row {
        display: flex; align-items: center; gap: 12px;
      }
      #lp-title {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: 22px; color: var(--color-text-primary);
        margin: 0; flex-shrink: 0;
      }
      #lp-search-wrap { flex: 1; position: relative; }
      #lp-search-wrap svg {
        position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
        color: var(--color-text-muted); pointer-events: none;
      }
      #lp-search {
        width: 100%; box-sizing: border-box;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 10px 14px 10px 38px;
        font-size: 14px; font-family: 'Inter', sans-serif;
        color: var(--color-text-primary);
        outline: none;
        transition: border-color 0.15s;
      }
      #lp-search:focus { border-color: var(--color-brand); }
      #lp-search::placeholder { color: var(--color-text-muted); }

      /* ── Trending chips ── */
      #lp-trending {
        display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      }
      .lp-trending-label {
        font-size: 11px; font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0;
      }
      .lp-trend-chip {
        font-size: 12px; font-weight: 500;
        color: var(--color-brand);
        background: var(--color-brand-muted);
        border: 1px solid rgba(124,58,237,0.2);
        border-radius: 20px; padding: 3px 10px;
        cursor: pointer; transition: background 0.15s;
      }
      .lp-trend-chip:hover { background: rgba(124,58,237,0.2); }

      /* ── Stats row ── */
      #lp-stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 12px 16px 0;
      }
      @media (max-width: 480px) {
        #lp-stats-row { grid-template-columns: repeat(2, 1fr); }
      }
      .lp-stat-box {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 14px;
        padding: 12px 10px 10px;
        display: flex; flex-direction: column;
        align-items: center; gap: 4px;
        position: relative; overflow: hidden;
      }
      .lp-stat-ring-wrap {
        position: relative; width: 60px; height: 60px;
        display: flex; align-items: center; justify-content: center;
      }
      .lp-stat-ring-wrap svg {
        position: absolute; top: 0; left: 0;
        transform: rotate(-90deg);
      }
      .lp-stat-val {
        position: relative; z-index: 1;
        font-size: 18px; font-weight: 800;
        color: var(--color-text-primary);
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        line-height: 1;
      }
      .lp-stat-lbl {
        font-size: 10px; color: var(--color-text-muted);
        font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.04em; text-align: center;
        line-height: 1.2;
      }
      .stat--empty .lp-stat-val { color: var(--color-text-muted); }

      /* ── Filter rows ── */
      #lp-filters {
        padding: 12px 16px 0;
        display: flex; flex-direction: column; gap: 8px;
      }
      .lp-filter-row-wrap {
        position: relative;
      }
      .lp-filter-row-wrap::after {
        content: ''; pointer-events: none;
        position: absolute; right: 0; top: 0; bottom: 2px; width: 40px;
        background: linear-gradient(to right, transparent, var(--color-bg-primary));
      }
      .lp-filter-row {
        display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px;
        scrollbar-width: none;
      }
      .lp-filter-row::-webkit-scrollbar { display: none; }
      .lp-chip {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px; padding: 6px 14px;
        font-size: 12px; font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer; white-space: nowrap;
        font-family: 'Inter', sans-serif;
        transition: border-color 0.15s, color 0.15s, background 0.15s;
      }
      .lp-chip:hover:not(.active) { border-color: var(--color-brand); color: var(--color-brand); }
      .lp-chip.active {
        background: var(--color-brand); border-color: var(--color-brand); color: #fff;
      }
      .lp-filter-label {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em; color: var(--color-text-muted);
        display: flex; align-items: center; flex-shrink: 0;
      }

      /* ── Grid ── */
      #lp-body { padding: 16px 16px 0; }
      #lp-results-label {
        font-size: 12px; color: var(--color-text-muted);
        margin: 0 0 12px; font-weight: 500;
      }
      #lp-grid {
        display: block;
        gap: 12px;
      }
      /* VirtualScroller handles columns — .virtual-item usa display:flex internamente */
      .virtual-scroller-list { position: relative; width: 100%; }
      .virtual-item { box-sizing: border-box; }
      .virtual-col { min-width: 0; }

      /* ── Supplement Card — Dark Luxury Laboratorial ── */
      .lp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        display: flex; flex-direction: column;
        overflow: hidden;
        cursor: pointer;
        transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
      }
      @media (hover: hover) {
        .lp-card:hover {
          border-color: var(--color-border-brand);
          box-shadow: var(--shadow-brand);
          transform: translateY(-3px);
        }
        .lp-card:hover .lp-card-img { transform: scale(1.04); }
      }
      /* Image area */
      .lp-card-img-wrap {
        aspect-ratio: 4/3;
        background: var(--color-surface-secondary);
        overflow: hidden; position: relative;
      }
      .lp-card-img {
        width: 100%; height: 100%; object-fit: cover;
        transition: transform 0.35s ease;
        display: block;
      }
      /* Savings badge — overlay no topo da imagem */
      .lp-card-savings {
        position: absolute; top: 10px; left: 10px;
        background: var(--color-savings-bg);
        color: var(--color-savings);
        border: 1px solid rgba(34,197,94,0.25);
        font-size: 9px; font-weight: 800;
        padding: 3px 8px; border-radius: 5px;
        text-transform: uppercase; letter-spacing: 0.06em;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      /* Ev badge — overlay no canto superior direito */
      .lp-card-ev-badge {
        position: absolute; top: 10px; right: 10px;
        font-size: 10px; font-weight: 800; text-transform: uppercase;
        padding: 3px 8px; border-radius: 5px; letter-spacing: 0.05em;
        border: 1px solid transparent;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      .lp-card-ev-badge--a { background: var(--ev-a-bg); color: var(--ev-a); border-color: var(--ev-a-border); }
      .lp-card-ev-badge--b { background: var(--ev-b-bg); color: var(--ev-b); border-color: var(--ev-b-border); }
      .lp-card-ev-badge--c { background: var(--ev-c-bg); color: var(--ev-c); border-color: var(--ev-c-border); }
      /* Body */
      .lp-card-info {
        padding: 12px 14px 14px;
        display: flex; flex-direction: column; gap: 5px; flex: 1;
      }
      .lp-card-badges {
        display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
      }
      .lp-card-cat-pill {
        font-size: 10px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.07em; color: var(--color-text-muted);
        padding: 2px 7px; border-radius: 5px;
        background: var(--color-surface-hover);
      }
      .lp-card-name {
        font-size: 14px; font-weight: 700; color: var(--color-text-primary);
        margin: 0; line-height: 1.3;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lp-card-desc {
        font-size: 12px; color: var(--color-text-secondary);
        line-height: 1.45; flex: 1;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      /* Preço */
      .lp-card-price-row { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; }
      .lp-card-price {
        font-size: 20px; font-weight: 800; color: var(--color-text-primary);
        font-variant-numeric: tabular-nums; letter-spacing: -0.02em; line-height: 1.1;
      }
      .lp-card-price-cents {
        font-size: 12px; font-weight: 500; color: var(--color-text-secondary);
        vertical-align: baseline;
      }
      .lp-card-dose { font-size: 11px; color: var(--color-text-muted); }
      /* Actions */
      .lp-card-actions {
        display: flex; gap: 8px; align-items: center; margin-top: 10px;
      }
      .lp-btn-fav {
        width: 44px; height: 44px; flex-shrink: 0;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm); cursor: pointer;
        font-size: 15px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, border-color 0.15s;
        color: var(--color-text-muted);
      }
      .lp-btn-fav:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
      .lp-btn-fav.faved { border-color: #EF4444; color: #EF4444; background: rgba(239,68,68,0.08); }
      .lp-btn-ver-precos {
        flex: 1; height: 44px; min-height: 44px;
        background: var(--color-brand-muted);
        border: 1px solid var(--color-border-brand);
        color: var(--color-brand);
        border-radius: var(--radius-sm);
        font-size: 12px; font-weight: 700;
        cursor: pointer; font-family: 'Inter', sans-serif;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        display: flex; align-items: center; justify-content: center;
        letter-spacing: 0.04em; text-transform: uppercase;
      }
      .lp-btn-ver-precos:hover {
        background: var(--color-brand);
        color: #fff;
        border-color: var(--color-brand);
      }

      /* ── Empty / Loading ── */
      .lp-empty {
        grid-column: 1 / -1; text-align: center;
        padding: 60px 20px; color: var(--color-text-secondary);
      }
      .lp-empty-icon { font-size: 40px; margin-bottom: 12px; }
      .lp-sentinel { height: 1px; }
      .lp-loading-more {
        text-align: center; padding: 20px;
        color: var(--color-text-muted); font-size: 13px; display: none;
      }

      /* ── Modal Overlay ── */
      #lp-modal-overlay {
        position: fixed; inset: 0; z-index: 200;
        background: rgba(0,0,0,0.85);
        display: flex; align-items: flex-end; justify-content: center;
        animation: lp-fade-in 0.15s ease;
      }
      @media (min-width: 600px) {
        #lp-modal-overlay {
          align-items: center;
          padding: 16px;
        }
      }
      @keyframes lp-fade-in { from { opacity: 0; } to { opacity: 1; } }
      #lp-modal-box {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border-strong);
        border-radius: 20px 20px 0 0;
        width: 100%;
        max-height: 92vh;
        overflow-y: auto;
        position: relative;
        animation: lp-slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1);
      }
      @media (min-width: 600px) {
        #lp-modal-box {
          border-radius: 20px;
          max-width: 800px;
          max-height: 90vh;
        }
      }
      @keyframes lp-slide-up {
        from { opacity: 0; transform: translateY(60px); }
        to { opacity: 1; transform: translateY(0); }
      }
      /* drag handle for bottom sheet */
      #lp-modal-box::before {
        content: '';
        display: block;
        width: 40px; height: 4px;
        background: var(--color-border-strong);
        border-radius: 2px;
        margin: 10px auto 0;
      }
      @media (min-width: 600px) {
        #lp-modal-box::before { display: none; }
      }
      #lp-modal-close {
        position: absolute; top: 14px; right: 14px; z-index: 10;
        width: 32px; height: 32px;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        border-radius: 8px; cursor: pointer; font-size: 16px;
        display: flex; align-items: center; justify-content: center;
        color: var(--color-text-secondary);
        transition: background 0.15s;
      }
      #lp-modal-close:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }

      .lp-modal-top {
        display: grid; grid-template-columns: 1fr; gap: 20px; padding: 20px;
      }
      @media (min-width: 600px) {
        .lp-modal-top { grid-template-columns: 280px 1fr; }
      }
      .lp-modal-img-col { display: flex; flex-direction: column; gap: 12px; }
      .lp-modal-img-wrap {
        width: 100%; aspect-ratio: 1/1;
        background: var(--color-surface-secondary, #191D25); border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
      }
      .lp-modal-img { width: 100%; height: 100%; object-fit: contain; }
      .lp-modal-img-col-name { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800; font-size: 22px; color: var(--color-text-primary); margin: 0; }
      .lp-modal-img-col-cat { font-size: 12px; color: var(--color-text-muted); margin: 2px 0 0; }
      .lp-modal-info-col { display: flex; flex-direction: column; gap: 14px; }
      .lp-modal-info-col h3 { font-size: 13px; font-weight: 700; color: var(--color-text-secondary); margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }

      /* Prices */
      .lp-price-cards { display: flex; flex-direction: column; gap: 8px; }
      .lp-price-card {
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        border-radius: 12px; padding: 10px 14px;
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
      }
      .lp-price-card-left { display: flex; flex-direction: column; gap: 2px; }
      .lp-price-card--best { border-color: var(--ev-a-border, rgba(52,211,153,0.30)); background: var(--ev-a-bg, rgba(52,211,153,0.08)); }
      .lp-price-card-store { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
      .lp-price-card-store-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .lp-price-best-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; background: var(--ev-a-bg, rgba(52,211,153,0.12)); color: var(--ev-a, #34D399); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--ev-a-border, rgba(52,211,153,0.25)); }
      .lp-price-card-val { font-size: 16px; font-weight: 700; color: var(--color-text-primary); }
      .lp-price-qty { font-size: 11px; color: var(--color-text-muted); margin-top: 1px; }
      .lp-price-saving {
        font-size: 10px; font-weight: 700;
        background: var(--color-savings-bg, rgba(34,197,94,0.12)); color: var(--color-savings, #22C55E);
        border: 1px solid rgba(34,197,94,0.25);
        padding: 2px 7px; border-radius: 5px;
      }
      .lp-price-link {
        font-size: 12px; font-weight: 600; color: var(--color-brand);
        background: var(--color-brand-muted);
        border: 1px solid var(--color-border-brand, rgba(139,92,246,0.25));
        border-radius: 8px; padding: 6px 12px;
        cursor: pointer; text-decoration: none; white-space: nowrap;
        transition: background 0.15s;
      }
      .lp-price-link:hover { background: var(--color-brand-muted, rgba(139,92,246,0.20)); }

      /* Tabs */
      .lp-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--color-border); }
      .lp-tab {
        padding: 8px 14px; font-size: 13px; font-weight: 600;
        color: var(--color-text-muted); cursor: pointer; border: none;
        background: transparent; border-bottom: 2px solid transparent;
        transition: color 0.15s, border-color 0.15s;
        font-family: 'Inter', sans-serif;
        margin-bottom: -1px;
      }
      .lp-tab.active { color: var(--color-brand); border-bottom-color: var(--color-brand); }
      .lp-tab-content { padding: 14px 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; }
      .lp-tab-content ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
      .lp-tab-content li { color: var(--color-text-secondary); }
      .lp-tab-pane { display: none; }
      .lp-tab-pane.active { display: block; }

      .lp-modal-bottom { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 12px; }
      .lp-modal-add-btn {
        width: 100%; padding: 14px;
        background: var(--color-brand); color: #fff;
        border: none; border-radius: 12px;
        font-size: 15px; font-weight: 700;
        cursor: pointer; font-family: 'Inter', sans-serif;
        transition: background 0.15s, opacity 0.15s;
      }
      .lp-modal-add-btn:hover { background: var(--color-brand-hover); }
      .lp-modal-add-btn.in-stack {
        background: var(--ev-a-bg, rgba(52,211,153,0.12));
        color: var(--ev-a, #34D399);
        border: 1px solid var(--ev-a-border, rgba(52,211,153,0.25));
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  /**
   * Render the complete ListPage DOM structure into the container.
   *
   * Builds HTML scaffold with:
   * - Sticky header (title, search bar, adv. filters button)
   * - Search history panel (recent queries, clear button)
   * - Trending chips section (Ashwagandha, Creatina, Foco)
   * - Advanced filters panel (evidence, price range, benefits) — initially hidden
   * - Stats row (4 metric cards: total, stack count, favorites, high-evidence)
   * - Category filter row (Todos, Performance, Proteínas, etc.)
   * - Objective filter row (Hipertrofia, Foco, Saúde, etc.)
   * - Grid container (#lp-grid) for supplement cards
   * - Sentinel element for infinite scroll detection
   * - Modal overlay and detail panel (initially hidden)
   *
   * All event listener attachment deferred to _attachListeners(). CSS injected
   * by _attachStyles(). No data rendering in this method — DOM structure only.
   *
   * @returns {void}
   * @private
   */
  _render() {
    this.container.innerHTML = `
      <div id="lp-root">
        <div id="lp-header">
          <div id="lp-header-row">
            <h1 id="lp-title">Catálogo</h1>
            <div id="lp-search-container" style="display: flex; gap: 8px; flex: 1; align-items: center; justify-content: flex-end;">
              <div id="lp-search-wrap" style="flex: 1; max-width: 320px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input id="lp-search" type="search" placeholder="Buscar suplemento..." autocomplete="off" />
              </div>
              <button id="lp-adv-filters-btn" class="lp-chip" style="margin: 0; padding: 10px 14px; display: flex; align-items: center; gap: 6px; background: transparent; border: 1.5px solid var(--color-border-strong); height: 40px; border-radius: 12px; cursor: pointer; color: var(--color-text-primary); transition: all 150ms ease; font-size: 13px; font-weight: 600;">
                <span>⚙️</span> Filtros
              </button>
            </div>
          </div>

          <!-- Search History Panel -->
          <div id="lp-history-panel" style="display: none; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
            <span style="font-size: 12px; color: var(--color-text-muted);">Buscas recentes:</span>
            <div id="lp-history-chips" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
            <button id="lp-clear-history-btn" style="background: none; border: none; font-size: 11px; color: var(--color-error); cursor: pointer; text-decoration: underline; margin-left: auto;">Limpar</button>
          </div>

          <div id="lp-trending">
            <span class="lp-trending-label">Trending:</span>
            <button class="lp-trend-chip" data-trend="Ashwagandha">Ashwagandha</button>
            <button class="lp-trend-chip" data-trend="Creatina">Creatina</button>
            <button class="lp-trend-chip" data-trend="Foco">Foco</button>
          </div>

          <!-- Advanced Filters Panel -->
          <div id="lp-advanced-panel" style="display: none; background: var(--color-surface-secondary); border: 1px solid var(--color-border); border-radius: 16px; padding: 16px; margin-top: 12px; flex-direction: column; gap: 14px;">
            <!-- Evidence Level Filters -->
            <div>
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; color: var(--color-text-muted); display: block; margin-bottom: 8px;">Nível de Evidência Científica</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="lp-chip lp-evidence-filter" data-evidence="A">Grau A (Forte)</button>
                <button class="lp-chip lp-evidence-filter" data-evidence="B">Grau B (Moderado)</button>
                <button class="lp-chip lp-evidence-filter" data-evidence="C">Grau C (Fraco)</button>
                <button class="lp-chip lp-evidence-filter" data-evidence="D">Grau D (Anedótico)</button>
              </div>
            </div>

            <!-- Price Range Filters -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; color: var(--color-text-muted);">Faixa de Preço Máxima</span>
                <span id="lp-price-range-val" style="font-size: 12px; font-weight: 600; color: var(--color-brand);">R$ 300 (Qualquer preço)</span>
              </div>
              <input type="range" id="lp-price-range" min="20" max="300" step="10" value="300" style="width: 100%; cursor: pointer;" />
            </div>

            <!-- Benefits Filters -->
            <div>
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; color: var(--color-text-muted); display: block; margin-bottom: 8px;">Benefícios e Objetivos</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="lp-benefits-container">
                <button class="lp-chip lp-benefit-filter" data-benefit="Foco">🧠 Foco</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Sono">🌙 Sono</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Hipertrofia">💪 Hipertrofia</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Imunidade">🛡️ Imunidade</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Longevidade">⏳ Longevidade</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Disposição">⚡ Energia</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Articulações">🦴 Articulações</button>
              </div>
            </div>
          </div>
        </div>

        <div id="lp-stats-row">
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="25" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-total" cx="30" cy="30" r="25" fill="none"
                  stroke="var(--color-brand)" stroke-width="3"
                  stroke-dasharray="157.1" stroke-dashoffset="0"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-total">—</span>
            </div>
            <span class="lp-stat-lbl">Total</span>
          </div>
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="25" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-stack" cx="30" cy="30" r="25" fill="none"
                  stroke="#8B5CF6" stroke-width="3"
                  stroke-dasharray="157.1" stroke-dashoffset="157.1"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-stack">—</span>
            </div>
            <span class="lp-stat-lbl">Na Stack</span>
          </div>
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="25" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-favs" cx="30" cy="30" r="25" fill="none"
                  stroke="#EF4444" stroke-width="3"
                  stroke-dasharray="157.1" stroke-dashoffset="157.1"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-favs">—</span>
            </div>
            <span class="lp-stat-lbl">Favoritos</span>
          </div>
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="25" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-eva" cx="30" cy="30" r="25" fill="none"
                  stroke="#22C55E" stroke-width="3"
                  stroke-dasharray="157.1" stroke-dashoffset="78.55"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-eva">—</span>
            </div>
            <span class="lp-stat-lbl">Evidência A</span>
          </div>
        </div>

        <div id="lp-filters">
          <div class="lp-filter-row-wrap">
            <div class="lp-filter-row" id="lp-cat-row">
              <span class="lp-filter-label">Categoria</span>
              ${CATEGORIES.map(c => `<button class="lp-chip${c === 'Todos' ? ' active' : ''}" data-cat="${c}">${c}</button>`).join('')}
            </div>
          </div>
          <div class="lp-filter-row-wrap">
            <div class="lp-filter-row" id="lp-obj-row">
              <span class="lp-filter-label">Objetivo</span>
              ${OBJECTIVES.map(o => `<button class="lp-chip" data-obj="${o}">${o}</button>`).join('')}
            </div>
          </div>
        </div>

        <div id="lp-body">
          <p id="lp-results-label"></p>
          <div id="lp-grid" role="list"></div>
          <div class="lp-sentinel" id="lp-sentinel" aria-hidden="true"></div>
          <div class="lp-loading-more" id="lp-loading-more">Carregando mais...</div>
        </div>
      </div>
    `;
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  /**
   * Render the 4 stats rings (total supplements, stack count, favorites, high-evidence).
   *
   * Queries DOM for 4 SVG circles (#lp-ring-*) and value text elements (#lp-stat-*).
   * Calculates stroke-dashoffset for each ring based on ratio (count/max).
   * Colors: purple (brand), violet (stack), red (favorites), green (evidence-A).
   * Adds 'stat--empty' class to stack ring if count === 0 (visual feedback).
   *
   * @returns {void}
   * @private
   */
  _renderStats() {
    const total = SUPPLEMENTS_DB.length;
    const stackCount = (stateManager.stack || []).length;
    const favsCount  = getFavoritesFromState().size;
    const evaCount   = SUPPLEMENTS_DB.filter(s => s.evidenceLevel === 'A').length;

    const CIRCUMFERENCE = 157.1; // 2 * Math.PI * 25

    const setRing = (ringId, valId, count, max, color) => {
      const ring = this.container.querySelector(ringId);
      const valEl = this.container.querySelector(valId);
      if (!ring || !valEl) return;
      valEl.textContent = count;
      const pct = max > 0 ? Math.min(1, count / max) : 0;
      ring.style.stroke = color;
      ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
    };

    setRing('#lp-ring-total', '#lp-stat-total', total, total, 'var(--color-brand)');
    setRing('#lp-ring-stack', '#lp-stat-stack', stackCount, total, '#8B5CF6');
    setRing('#lp-ring-favs', '#lp-stat-favs', favsCount, total, '#EF4444');
    setRing('#lp-ring-eva',  '#lp-stat-eva',  evaCount,  total, '#22C55E');

    const stackBox = this.container.querySelector('#lp-stat-stack')?.closest('.lp-stat-box');
    stackBox?.classList.toggle('stat--empty', stackCount === 0);
  }

  // ─── Filtering ────────────────────────────────────────────────────────────

  /**
   * Apply all active filters and update this._filtered with results.
   *
   * Filtering pipeline (6 stages):
   * 1. Fuzzy search (Fuse.js on name/category/benefits) if query present
   * 2. Category chip filter (Performance, Proteínas, etc.) — 'Todos' matches all
   * 3. Objective filter (Hipertrofia, Foco, etc.) — checks item.targets[key]
   * 4. Advanced: Evidence level (Grau A/B/C/D) if _evidenceFilter set
   * 5. Advanced: Max price filter (only if < 300) — uses live pricing with fallback
   * 6. Advanced: Benefits multi-select — all selected benefits must match
   *
   * **Free-tier ad injection:** If user is free and results > 3, injects
   * { id: 'sponsored-ad', isAd: true } at position 3 for monetization UX.
   *
   * Updates #lp-results-label with count if any filter is active, else clears it.
   *
   * @returns {void}
   * @private
   */
  _applyFilters() {
    let results = this._allItems;

    // 1. Fuzzy Search with Fuse.js
    if (this._query.trim()) {
      results = this._fuse
        ? this._fuse.search(this._query).map(r => r.item)
        : results.filter(s => s.name.toLowerCase().includes(this._query.toLowerCase()));
    }

    // 2. Category Chip Filter
    results = results.filter(s => matchesCategory(s, this._category));

    // 3. Objective Chip Filter
    results = results.filter(s => matchesObjective(s, this._objective));

    // 4. Advanced Filter: Evidence Level
    if (this._evidenceFilter) {
      results = results.filter(s => s.evidenceLevel === this._evidenceFilter);
    }

    // 5. Advanced Filter: Price Range (Estimates cost fallback if prices not loaded)
    if (this._maxPriceFilter < 300) {
      results = results.filter(s => {
        const pInfo = this._prices?.[s.id];
        const price = pInfo ? parseFloat(pInfo.shopee?.price || pInfo.amazon?.price || pInfo.mercado_livre?.price || 0) : 0;
        const checkPrice = price > 0 ? price : (s.estimatedMonthlyCost || 0);
        return checkPrice <= this._maxPriceFilter;
      });
    }

    // 6. Advanced Filter: Specific Benefits and Tags
    if (this._benefitsFilter.size > 0) {
      results = results.filter(s => {
        const itemBenefits = (s.benefits || []).map(b => b.toLowerCase());
        return [...this._benefitsFilter].every(bf => {
          const lowerBf = bf.toLowerCase();
          return itemBenefits.some(ib => ib.includes(lowerBf) || lowerBf.includes(ib));
        });
      });
    }

    const state = stateManager.getState();
    const userTier = state.user?.tier ?? 'free';
    if (userTier === 'free' && results.length > 3) {
      const resultsWithAd = [...results];
      resultsWithAd.splice(3, 0, { id: 'sponsored-ad', isAd: true });
      this._filtered = resultsWithAd;
    } else {
      this._filtered = results;
    }

    const label = this.container.querySelector('#lp-results-label');
    if (label) {
      const activeAdv = this._evidenceFilter || this._maxPriceFilter < 300 || this._benefitsFilter.size > 0;
      label.textContent = this._query || this._category !== 'Todos' || this._objective || activeAdv
        ? `${this._filtered.length} resultado(s)`
        : '';
    }
  }

  // ─── Grid ─────────────────────────────────────────────────────────────────

  /**
   * Render filtered supplement cards into the grid using VirtualScroller.
   *
   * If modal is open, guards against rendering (prevents listener orphaning).
   * If no results, displays empty state (🔍 icon + helpful text).
   * Otherwise creates VirtualScroller with:
   * - Items: this._filtered (post-filter array)
   * - Renderer: _renderSupplementCard() for each item
   * - Item height: 310px (card dimensions)
   * - Buffer: 5 items before/after viewport
   *
   * Resets pagination (this._page = 1) and unmounts old scroller if it exists.
   *
   * @returns {void}
   * @private
   */
  _renderGrid() {
    // Guard: don't render if modal is open (prevents listeners orphaning)
    if (this._modalOpen) return;

    const grid = this.container.querySelector('#lp-grid');
    if (!grid) return;

    if (!this._filtered.length) {
      grid.innerHTML = `
        <div class="lp-empty">
          <div class="lp-empty-icon">🔍</div>
          <p style="font-weight:700;margin:0 0 6px;">Nenhum resultado</p>
          <p style="font-size:13px;margin:0;">Tente outra busca ou remova os filtros.</p>
        </div>`;
      // Cleanup virtual scroller if empty
      if (this._scroller) {
        this._scroller.unmount();
        this._scroller = null;
      }
      return;
    }

    // Cleanup old scroller if exists
    if (this._scroller) {
      this._scroller.unmount();
      this._scroller = null;
    }

    // Clear grid and prepare for virtual scroller
    grid.innerHTML = '';

    // Columns responsive: 2 mobile, 3 tablet, 4 desktop
    const vw = window.innerWidth;
    const cols = vw >= 1024 ? 4 : vw >= 640 ? 3 : 2;
    const cardHeight = vw >= 640 ? 340 : 310;

    // Create virtual scroller with filtered items
    this._scroller = new VirtualScroller(
      grid,
      this._filtered,
      (item) => this._renderSupplementCard(item),
      {
        itemHeight: cardHeight,
        bufferSize: 8,
        columns: cols,
        gap: 12,
      }
    );

    this._scroller.mount();
    this._page = 1;
  }

  /**
   * Render a single supplement card HTML for virtual scroller.
   *
   * Returns HTML string with:
   * - Top badge: savings amount (if available) or category tag
   * - Image with lazy loading + fallback on 404
   * - Evidence level badge (EV. A/B/C/D with color coding)
   * - Name, category, first benefit (description)
   * - Price row: monthly cost + per-dose price estimate
   * - Heart icon (favorite toggle) with animation
   * - "Add to Stack" button (state changes if already in stack)
   *
   * Affiliate pricing: Uses live prices from this._prices (live fetch from prices.json).
   * If not loaded, falls back to pricePerGram estimates from database.
   *
   * Special case: If item.isAd=true, delegates to _renderSponsoredAdCard().
   *
   * @param {Object} item - Supplement item { id, name, category, benefits, evidenceLevel, image, ... }
   * @returns {string} HTML string for the card (safe to insert with innerHTML)
   * @private
   */
  _renderSupplementCard(item) {
    if (item.isAd) {
      return this._renderSponsoredAdCard();
    }
    const stack = stateManager.stack ?? [];
    const favs = getFavoritesFromState();
    const isFav = favs.has(item.id);
    const ev = item.evidenceLevel;
    const desc = item.benefits?.[0] ?? '';
    const img = item.image || `/assets/${item.id.replace(/-/g, '_')}.png`;

    const saving = getMaxSaving(item, this._prices);
    const priceInfo = getPriceLabel(item, this._prices);
    const doseStr = getDosePrice(item, this._prices);

    const evClass = ev ? `lp-card-ev-badge--${String(ev).toLowerCase()}` : '';
    const evLabel = ev ? `NÍVEL ${escapeHtml(String(ev))}` : '';

    const savingsBadge = saving
      ? `<span class="lp-card-savings">ECONOMIZE R$ ${escapeHtml(String(saving))}</span>`
      : '';

    const evBadge = ev
      ? `<span class="lp-card-ev-badge ${evClass}">${evLabel}</span>`
      : '';

    return `
      <div class="lp-card" role="listitem" data-id="${item.id}">
        <div class="lp-card-img-wrap">
          <img class="lp-card-img"
            src="${escapeHtml(img)}"
            alt="${escapeHtml(item.name)}"
            loading="lazy"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22/%3E'"
          />
          ${savingsBadge}
          ${evBadge}
        </div>
        <div class="lp-card-info">
          <div class="lp-card-badges">
            ${item.category ? `<span class="lp-card-cat-pill">${escapeHtml(item.category)}</span>` : ''}
          </div>
          <p class="lp-card-name">${escapeHtml(item.name)}</p>
          ${desc ? `<p class="lp-card-desc">${escapeHtml(desc)}</p>` : ''}
          <div class="lp-card-price-row">
            <span class="lp-card-price">${formatPrice(priceInfo.price)}</span>
            <span class="lp-card-dose">${doseStr}</span>
          </div>
          <div class="lp-card-actions">
            <button class="lp-btn-fav${isFav ? ' faved' : ''}" data-action="toggle-fav" data-id="${item.id}" aria-label="${isFav ? 'Remover dos favoritos' : 'Favoritar'}" type="button">
              ${isFav ? '♥' : '♡'}
            </button>
            <button class="lp-btn-ver-precos" data-action="open-modal" data-id="${item.id}" type="button">
              VER PREÇOS →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a sponsored ad card for free-tier users.
   *
   * Shows premium upsell with:
   * - "Patrocinado" label
   * - 🌟 emoji with drop shadow
   * - "SupliList PRO" heading
   * - Copy: remove ads, advanced history, Excel reports
   * - "Quero Premium" button → triggers upgrade-now action
   *
   * Styled with dashed border, special background, centered layout.
   *
   * @returns {string} HTML string for ad card
   * @private
   */
  _renderSponsoredAdCard() {
    return `
      <div class="lp-card sponsored-ad-card" style="
        background: linear-gradient(160deg, rgba(30,22,50,0.95) 0%, rgba(18,14,30,0.98) 100%);
        border: 1px solid rgba(139,92,246,0.18);
        display: flex; flex-direction: column; justify-content: flex-end;
        padding: 0; height: 100%; box-sizing: border-box;
        position: relative; min-height: 290px; overflow: hidden;
      ">
        <div style="position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.18) 0%, transparent 65%); pointer-events: none;"></div>
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent);"></div>
        <div style="padding: 20px; position: relative; z-index: 1;">
          <p style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-brand, #A78BFA); margin: 0 0 10px 0;">PRO</p>
          <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 16px; margin: 0 0 6px 0; color: var(--color-text-primary); letter-spacing: -0.02em; line-height: 1.2;">Histórico Avançado + Sem Anúncios</p>
          <p style="font-size: 12px; color: var(--color-text-secondary); margin: 0 0 16px 0; line-height: 1.5;">Gráficos de adesão, relatórios Excel e experiência limpa.</p>
          <button class="lp-upgrade-btn" style="width: 100%; height: 38px; font-size: 12px; font-weight: 700; background: var(--color-brand, #8B5CF6); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: inherit; letter-spacing: 0.01em;" data-action="upgrade-now">Ativar PRO</button>
        </div>
      </div>
    `;
  }

  /**
   * Open the checkout modal for premium tier upgrade.
   *
   * Delegates to CheckoutModal.show() with tier='pro' to display
   * payment form and pricing details.
   *
   * @returns {void}
   * @private
   */
  _openCheckoutModal() {
    CheckoutModal.show({ tier: 'pro' });
  }

  /**
   * Load next page of filtered results into the grid (infinite scroll).
   *
   * Fetches items from index (this._page × PAGE_SIZE) to (next × PAGE_SIZE).
   * If no more items, returns early. Shows #lp-loading-more during append.
   * Appends fragment via _buildFragment() using requestAnimationFrame.
   * Increments this._page counter.
   *
   * Note: This is legacy pagination code. VirtualScroller handles most scrolling now.
   *
   * @returns {void}
   * @private
   */
  _loadMore() {
    const start = this._page * PAGE_SIZE;
    if (start >= this._filtered.length) return;
    const grid = this.container.querySelector('#lp-grid');
    if (!grid) return;
    const loading = this.container.querySelector('#lp-loading-more');
    if (loading) loading.style.display = 'block';
    requestAnimationFrame(() => {
      grid.appendChild(this._buildFragment(start, start + PAGE_SIZE));
      this._page++;
      if (loading) loading.style.display = 'none';
    });
  }

  /**
   * Build a DocumentFragment with supplement cards for infinite scroll pagination.
   *
   * Slices this._filtered[from:to], renders each card HTML, appends to fragment.
   * Returns a fragment ready to append to #lp-grid via appendChild().
   * Mirrors rendering logic from _renderSupplementCard() but uses DOM APIs
   * instead of innerHTML string (for potential performance optimization).
   *
   * @param {number} from - Start index in this._filtered
   * @param {number} to - End index (exclusive)
   * @returns {DocumentFragment} Fragment with 0+ supplement cards
   * @private
   */
  _buildFragment(from, to) {
    const frag = document.createDocumentFragment();
    const stack = stateManager.stack ?? [];
    const favs = getFavoritesFromState();

    this._filtered.slice(from, to).forEach(item => {
      const isFav = favs.has(item.id);
      const ev = item.evidenceLevel;
      const evStyle = EVIDENCE_COLORS[ev] ?? EVIDENCE_COLORS['C'];
      const desc = item.benefits?.[0] ?? '';
      const img = item.image || `/assets/${item.id.replace(/-/g, '_')}.png`;

      const saving = getMaxSaving(item, this._prices);
      const priceInfo = getPriceLabel(item, this._prices);
      const doseStr = getDosePrice(item, this._prices);

      let topBadge = '';
      if (saving) {
        // P4: escapeHtml em saving (número, mas pode ser string de priceData externo)
        topBadge = `<div class="lp-card-top-badge" style="background:rgba(34,197,94,0.10);color:#22C55E;">
          ECONOMIZE R$ ${escapeHtml(String(saving))} NA AMAZON
        </div>`;
      } else if (item.category) {
        // P4: escapeHtml em category
        topBadge = `<div class="lp-card-top-badge" style="background:var(--color-brand-muted);color:var(--color-brand);">
          ${escapeHtml(item.category)}
        </div>`;
      }

      const div = document.createElement('div');
      div.className = 'lp-card';
      div.role = 'listitem';
      div.dataset.id = item.id;
      div.innerHTML = `
        ${topBadge}
        <div class="lp-card-img-wrap">
          <img class="lp-card-img"
            src="${escapeHtml(img)}"
            alt="${escapeHtml(item.name)}"
            loading="lazy"
            importance="auto"
            onerror="this.style.display='none'"
          />
          ${ev ? `<span class="lp-card-ev-badge" style="background:${evStyle.bg};color:${evStyle.color};">EV. ${escapeHtml(String(ev))}</span>` : ''}
        </div>
        <div class="lp-card-info">
          <p class="lp-card-name">${escapeHtml(item.name)}</p>
          <p class="lp-card-cat">${escapeHtml(item.category ?? '')}</p>
          ${desc ? `<p class="lp-card-desc">${escapeHtml(desc)}</p>` : ''}
          <div class="lp-card-price-row">
            <span class="lp-card-price">${formatPrice(priceInfo.price)}</span>
            <span class="lp-card-dose">${doseStr}</span>
          </div>
          <div class="lp-card-actions">
            <button class="lp-btn-fav${isFav ? ' faved' : ''}" data-action="toggle-fav" data-id="${item.id}" aria-label="${isFav ? 'Remover dos favoritos' : 'Favoritar'}" type="button">
              ${isFav ? '♥' : '♡'}
            </button>
            <button class="lp-btn-ver-precos" data-action="open-modal" data-id="${item.id}" type="button">
              VER PREÇOS →
            </button>
          </div>
        </div>
      `;
      frag.appendChild(div);
    });
    return frag;
  }

  // ─── Infinite Scroll ──────────────────────────────────────────────────────

  /**
   * Initialize IntersectionObserver for infinite scroll pagination.
   *
   * Attaches observer to #lp-sentinel element with 300px rootMargin.
   * When sentinel enters viewport, triggers _loadMore() to fetch next page.
   * Gracefully skips if IntersectionObserver not supported (IE11 fallback).
   *
   * Note: VirtualScroller (used in _renderGrid) handles most scrolling now.
   * This is legacy pagination code kept for compatibility.
   *
   * @returns {void}
   * @private
   */
  _initInfiniteScroll() {
    const sentinel = this.container.querySelector('#lp-sentinel');
    if (!sentinel || !('IntersectionObserver' in window)) return;
    try {
      this._observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) this._loadMore();
      }, { rootMargin: '300px' });
      this._observer.observe(sentinel);
    } catch (err) {
      this._observer?.disconnect();
      this._observer = null;
    }
  }

  // ─── Refresh Card States ──────────────────────────────────────────────────

  /**
   * Refresh all visible card UI elements after state mutations.
   *
   * Called by mount() state subscription when state changes (e.g., favorite added).
   * Updates:
   * - Stats rings (re-renders ring fill percentages)
   * - Favorite buttons on all cards (.lp-card) — toggled 'faved' class + icon/aria
   * - Modal "Add to Stack" button (if modal is open) — class 'in-stack' + copy
   *
   * Re-renders stats because counts may have changed (e.g., new favorite).
   * Skips rendering if tier hasn't changed; only updates visual states.
   *
   * @returns {void}
   * @private
   */
  _refreshCardStates() {
    this._renderStats();
    const stack = stateManager.stack ?? [];
    const favs = getFavoritesFromState();

    this.container.querySelectorAll('.lp-card').forEach(card => {
      const id = card.dataset.id;
      const isFav = favs.has(id);

      const favBtn = card.querySelector('[data-action="toggle-fav"]');
      if (favBtn) {
        favBtn.classList.toggle('faved', isFav);
        favBtn.textContent = isFav ? '♥' : '♡';
        favBtn.setAttribute('aria-label', isFav ? 'Remover dos favoritos' : 'Favoritar');
      }


    });

    // refresh modal add btn if open
    if (this._modalOpen) {
      const addBtn = document.querySelector('#lp-modal-add-btn');
      if (addBtn) {
        const inStack = stack.some(s => s.supplementId === this._modalOpen);
        addBtn.classList.toggle('in-stack', inStack);
        addBtn.textContent = inStack ? '✓ Já no Stack' : '+ Adicionar ao Stack';
      }
    }
  }

  // ─── Scroll Lock Stack ────────────────────────────────────────────────────────────────

  /**
   * Push scroll lock source onto stack and disable document scroll.
   *
   * When modal/dialog opens, adds source (e.g., 'modal') to _scrollLockStack
   * and adds 'has-modal-open' class to <body> CSS class list.
   * Multiple sources can be locked simultaneously (nested modals).
   * Lock is released only when the last source is popped via _popScrollLock().
   *
   * @param {string} [source='modal'] - Identifier for the scroll lock source
   * @returns {void}
   * @private
   */
  _pushScrollLock(source = 'modal') {
    if (!this._scrollLockStack.includes(source)) {
      this._scrollLockStack.push(source);
      // Use CSS class flag instead of direct style — survives router transitions
      document.body.classList.add('has-modal-open');
    }
  }

  /**
   * Pop scroll lock source from stack and re-enable scroll if stack empty.
   *
   * Removes source from _scrollLockStack. If no sources remain,
   * removes 'has-modal-open' class from <body> to restore document scroll.
   * Safe to call multiple times or with non-existent source (no-op).
   *
   * @param {string} [source='modal'] - Identifier for the scroll lock source
   * @returns {void}
   * @private
   */
  _popScrollLock(source = 'modal') {
    const idx = this._scrollLockStack.indexOf(source);
    if (idx !== -1) {
      this._scrollLockStack.splice(idx, 1);
      if (this._scrollLockStack.length === 0) {
        document.body.classList.remove('has-modal-open');
      }
    }
  }

  // ─── Modal ────────────────────────────────────────────────────────────────

  /**
   * Open supplement detail modal with pricing, dosage, benefits, safety info.
   *
   * Creates and injects #lp-modal-overlay + #lp-modal-box with:
   * - Header: supplement image, name, category, evidence level
   * - Pricing section: live price cards from this._prices with best-price badge
   *   Falls back to estimated monthly cost if prices not loaded
   * - Tabs: Dose Clínica, Benefícios, Segurança (warnings + side effects)
   * - "Adicionar ao Stack" button (changes state if already in stack)
   * - Affiliate links to Amazon, Mercado Livre, Shopee
   *
   * Closing: ESC key, click overlay, click close button all trigger _closeModal().
   * Scroll lock: disables body scroll via _pushScrollLock('modal').
   * Events: "add-to-stack" dispatches ACTION to stateManager.
   *
   * @param {string} supplementId - ID of supplement to display (e.g., 'creatina')
   * @returns {void}
   * @private
   */
  _openModal(supplementId) {
    this._closeModal();
    const item = this._allItems.find(s => s.id === supplementId);
    if (!item) return;
    this._modalOpen = supplementId;

    const ev = item.evidenceLevel;
    const evStyle = EVIDENCE_COLORS[ev] ?? EVIDENCE_COLORS['C'];
    const img = item.image || `/assets/${item.id.replace(/-/g, '_')}.png`;
    const stack = stateManager.stack ?? [];
    const inStack = stack.some(s => s.supplementId === item.id);

    // Build price cards
    const affLinks = affiliateEngine.getLinks(item.name, item.id);
    let priceCardsHtml = '';
    const priceKey = item.id;
    if (this._prices && this._prices[priceKey]) {
      const stores = this._prices[priceKey];
      const bestStoreKey = Object.entries(stores).reduce((best, [k, s]) =>
        getEffectiveCost(s) < getEffectiveCost(stores[best]) ? k : best,
        Object.keys(stores)[0]
      );
      priceCardsHtml = Object.entries(stores).map(([storeKey, store]) => {
        const isBest = storeKey === bestStoreKey;
        const qtyLabel = store.qty && store.unit
          ? `${store.qty}${store.unit} · R$ ${(store.pricePerUnit ?? store.price).toFixed(2).replace('.', ',')}/${store.unit}`
          : '';
        return `
        <div class="lp-price-card${isBest ? ' lp-price-card--best' : ''}">
          <div class="lp-price-card-left">
            <div class="lp-price-card-store-row">
              <span class="lp-price-card-store">${escapeHtml(String(store.label ?? ''))}</span>
              ${isBest ? '<span class="lp-price-best-badge">✓ Melhor custo-benefício</span>' : ''}
            </div>
            <span class="lp-price-card-val">${formatPrice(store.price)}</span>
            ${qtyLabel ? `<span class="lp-price-qty">${escapeHtml(qtyLabel)}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${store.saving ? `<span class="lp-price-saving">-R$ ${escapeHtml(String(store.saving))}</span>` : ''}
            <a class="lp-price-link"
               href="${sanitizeUrl(isProductUrl(store.url) ? store.url : affLinks[storeKey])}"
               target="_blank"
               rel="noopener noreferrer"
               data-aff-id="${escapeHtml(item.id)}"
               data-aff-mp="${escapeHtml(storeKey)}">Ver Oferta →</a>
          </div>
        </div>`;
      }).join('');
    } else {
      const priceInfo = getPriceLabel(item, null);
      const MP_LIST = [
        { key: 'amazon',       label: 'Amazon' },
        { key: 'mercadolivre', label: 'Mercado Livre' },
        { key: 'shopee',       label: 'Shopee' },
      ];
      priceCardsHtml = MP_LIST.map(({ key, label }) => `
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${escapeHtml(label)}</span>
            <span class="lp-price-card-val">${formatPrice(priceInfo.price)}</span>
          </div>
          <a class="lp-price-link"
             href="${sanitizeUrl(affLinks[key])}"
             target="_blank"
             rel="noopener noreferrer"
             data-aff-id="${escapeHtml(item.id)}"
             data-aff-mp="${escapeHtml(key)}">Ver Oferta →</a>
        </div>
      `).join('');
    }

    // P5: escapeHtml em warnings e sideEffects (dados externos do database.js)
    const warnings = item.warnings?.length
      ? `<ul>${item.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
      : '<p style="color:var(--color-text-muted)">Nenhum aviso registrado.</p>';
    const sideEffects = item.sideEffects?.length
      ? `<p style="font-weight:600;color:var(--color-text-secondary);margin:10px 0 4px;">Efeitos Colaterais</p><ul>${item.sideEffects.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
      : '';

    const overlay = document.createElement('div');
    overlay.id = 'lp-modal-overlay';
    overlay.innerHTML = `
      <div id="lp-modal-box" role="dialog" aria-modal="true" aria-label="${item.name}">
        <button id="lp-modal-close" aria-label="Fechar">✕</button>

        <div class="lp-modal-top">
          <div class="lp-modal-img-col">
            <div class="lp-modal-img-wrap">
              <img class="lp-modal-img" src="${img}" alt="${escapeHtml(item.name)}" onerror="this.style.display='none'" />
            </div>
            <p class="lp-modal-img-col-name">${escapeHtml(item.name)}</p>
            <p class="lp-modal-img-col-cat">${escapeHtml(item.category ?? '')}</p>
            ${ev ? `<span style="display:inline-flex;align-self:flex-start;font-size:10px;font-weight:700;text-transform:uppercase;padding:3px 9px;border-radius:6px;background:${evStyle.bg};color:${evStyle.color};">Evidência ${ev}</span>` : ''}
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.5;margin:4px 0 0;">${escapeHtml(item.benefits?.join(' · ') ?? '')}</p>
          </div>

          <div class="lp-modal-info-col">
            <div>
              <h3>Comparação de Preços</h3>
              <div class="lp-price-cards">${priceCardsHtml}</div>
            </div>

            <div>
              <div class="lp-tabs">
                <button class="lp-tab active" data-tab="dose">Dose Clínica</button>
                <button class="lp-tab" data-tab="benefits">Benefícios</button>
                <button class="lp-tab" data-tab="safety">Segurança</button>
              </div>
              <div class="lp-tab-content">
                <div class="lp-tab-pane active" id="lp-tab-dose">
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Dose de manutenção:</strong> ${escapeHtml(String(item.dosage?.maintenance ?? '—'))} ${escapeHtml(item.dosage?.unit ?? '')}</p>
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Limite superior:</strong> ${escapeHtml(String(item.dosage?.upperLimit ?? '—'))} ${escapeHtml(item.dosage?.unit ?? '')}</p>
                  <p style="margin:0;"><strong style="color:var(--color-text-primary);">Quando tomar:</strong> ${escapeHtml(item.dosage?.timing ?? '—')}</p>
                </div>
                <div class="lp-tab-pane" id="lp-tab-benefits">
                  ${item.benefits?.length ? `<ul>${item.benefits.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : '<p style="color:var(--color-text-muted)">Sem dados.</p>'}
                </div>
                <div class="lp-tab-pane" id="lp-tab-safety">
                  ${warnings}
                  ${sideEffects}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lp-modal-bottom">
          <button id="lp-modal-add-btn" class="lp-modal-add-btn${inStack ? ' in-stack' : ''}" data-id="${item.id}">
            ${inStack ? '✓ Já no Stack' : '+ Adicionar ao Stack'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    // Lock scroll using stack (prevents conflicts during navigation)
    this._pushScrollLock('modal'); // fallback

    // Tab switching
    overlay.querySelectorAll('.lp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.lp-tab').forEach(t => t.classList.remove('active'));
        overlay.querySelectorAll('.lp-tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pane = overlay.querySelector(`#lp-tab-${tab.dataset.tab}`);
        if (pane) pane.classList.add('active');
      });
    });

    // Close
    overlay.querySelector('#lp-modal-close').addEventListener('click', () => this._closeModal());
    overlay.addEventListener('click', e => { if (e.target === overlay) this._closeModal(); });
    overlay.addEventListener('click', e => {
      const affLink = e.target.closest('[data-aff-mp]');
      if (affLink) affiliateEngine.trackClick(affLink.dataset.affId, affLink.dataset.affMp);
    });

    // Add to stack
    const addBtn = overlay.querySelector('#lp-modal-add-btn');
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      const id = addBtn.dataset.id;
      const sup = this._allItems.find(s => s.id === id);
      if (!sup) return;
      const inStackNow = (stateManager.stack ?? []).some(s => s.supplementId === id);
      if (inStackNow) {
        stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { supplementId: id });
      } else {
        stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
          supplementId: sup.id,
          name: sup.name,
          dosage: sup.dosage?.maintenance ?? 5,
          unit: sup.dosage?.unit ?? 'g',
          quantity: 0,
        });
      }
      this._refreshCardStates();
    });
  }

  /**
   * Close the supplement detail modal.
   *
   * Removes #lp-modal-overlay from DOM, pops scroll lock, and clears this._modalOpen.
   * Safe to call multiple times (no-op if modal not open).
   *
   * @returns {void}
   * @private
   */
  _closeModal() {
    const existing = document.getElementById('lp-modal-overlay');
    if (existing) {
      existing.remove();
      this._popScrollLock('modal');
    }
    this._modalOpen = null;
  }

  /**
   * Handle keyboard events (ESC to close modal).
   *
   * Bound to 'keydown' on document during mount(), unbound on unmount().
   * Closes modal if ESC pressed and modal is currently open.
   *
   * @param {KeyboardEvent} e - Keyboard event
   * @returns {void}
   * @private
   */
  _onKeydown(e) {
    if (e.key === 'Escape' && this._modalOpen) this._closeModal();
  }

  // ─── Sync initial filter UI from params ──────────────────────────────────

  /**
   * Synchronize objective filter chip UI from constructor params.
   *
   * If this._objective was set in constructor (e.g., from router params),
   * finds matching objective button in #lp-obj-row and adds 'active' class.
   * Called during mount() to pre-select the filter.
   *
   * @returns {void}
   * @private
   */
  _syncObjectiveChip() {
    if (!this._objective) return;
    const objRow = this.container.querySelector('#lp-obj-row');
    if (!objRow) return;
    const btn = objRow.querySelector(`[data-obj="${this._objective}"]`);
    if (btn) btn.classList.add('active');
  }

  // ─── Event Listeners ──────────────────────────────────────────────────────

  /**
   * Attach all event listeners to ListPage elements (search, filters, grid, etc).
   *
   * Sets up delegated listeners for:
   * - **Search:** debounced input on #lp-search (300ms delay)
   * - **Trending chips:** click to set query + search
   * - **Advanced filters toggle:** collapse/expand #lp-advanced-panel
   * - **Price range slider:** updates _maxPriceFilter and re-renders
   * - **Evidence level chips:** single-select (mutually exclusive)
   * - **Benefits chips:** multi-select (checkboxes)
   * - **Search history:** click to restore past query, clear button
   * - **Category row:** single-select mutually exclusive chip buttons
   * - **Objective row:** toggleable chip (can deselect)
   * - **Grid card actions:** favorite toggle + open modal for card
   * - **Modal actions:** upgrade button triggers CheckoutModal
   *
   * All listeners use event delegation on parent containers for efficiency.
   * Listeners are removed via unmount() which clears the entire page.
   *
   * @returns {void}
   * @private
   */
  _attachListeners() {
    // Search
    const searchEl = this.container.querySelector('#lp-search');
    if (searchEl) {
      searchEl.addEventListener('input', e => {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
          this._debounceTimer = null;
          this._query = e.target.value;
          this._applyFilters();
          this._renderGrid();
          this._saveSearchHistory(this._query);
        }, DEBOUNCE_SEARCH_MS);
      });
    }

    // Trending chips
    const trending = this.container.querySelector('#lp-trending');
    if (trending) {
      trending.addEventListener('click', e => {
        const chip = e.target.closest('[data-trend]');
        if (!chip) return;
        const searchEl2 = this.container.querySelector('#lp-search');
        if (searchEl2) searchEl2.value = chip.dataset.trend;
        this._query = chip.dataset.trend;
        this._applyFilters();
        this._renderGrid();
        this._saveSearchHistory(this._query);
      });
    }

    // Collapsible Filters Panel Toggle
    const advBtn = this.container.querySelector('#lp-adv-filters-btn');
    const advPanel = this.container.querySelector('#lp-advanced-panel');
    if (advBtn && advPanel) {
      advBtn.addEventListener('click', () => {
        this._advancedPanelOpen = !this._advancedPanelOpen;
        advPanel.style.display = this._advancedPanelOpen ? 'flex' : 'none';
        advBtn.classList.toggle('active', this._advancedPanelOpen);
      });
    }

    // Price Range Slider
    const priceSlider = this.container.querySelector('#lp-price-range');
    const priceVal = this.container.querySelector('#lp-price-range-val');
    if (priceSlider && priceVal) {
      priceSlider.addEventListener('input', e => {
        const val = parseInt(e.target.value, 10);
        this._maxPriceFilter = val;
        priceVal.textContent = val >= 300 ? 'R$ 300 (Qualquer preço)' : `R$ ${val}`;
        this._applyFilters();
        this._renderGrid();
      });
    }

    // Advanced Panel Delegated Filter Clicks (Evidence Levels & Benefits Tags)
    if (advPanel) {
      advPanel.addEventListener('click', e => {
        // 1. Evidence Level chips
        const evChip = e.target.closest('.lp-evidence-filter');
        if (evChip) {
          const evidence = evChip.dataset.evidence;
          const isActive = evChip.classList.contains('active');
          advPanel.querySelectorAll('.lp-evidence-filter').forEach(c => c.classList.remove('active'));
          if (isActive) {
            this._evidenceFilter = '';
          } else {
            evChip.classList.add('active');
            this._evidenceFilter = evidence;
          }
          this._applyFilters();
          this._renderGrid();
          return;
        }

        // 2. Benefits chips
        const benefitChip = e.target.closest('.lp-benefit-filter');
        if (benefitChip) {
          const benefit = benefitChip.dataset.benefit;
          if (this._benefitsFilter.has(benefit)) {
            this._benefitsFilter.delete(benefit);
            benefitChip.classList.remove('active');
          } else {
            this._benefitsFilter.add(benefit);
            benefitChip.classList.add('active');
          }
          this._applyFilters();
          this._renderGrid();
          return;
        }
      });
    }

    // Search History Panel clicks
    const historyPanel = this.container.querySelector('#lp-history-panel');
    if (historyPanel) {
      historyPanel.addEventListener('click', e => {
        const chip = e.target.closest('.lp-history-chip');
        if (chip) {
          const query = chip.dataset.query;
          const searchEl2 = this.container.querySelector('#lp-search');
          if (searchEl2) searchEl2.value = query;
          this._query = query;
          this._applyFilters();
          this._renderGrid();
          return;
        }

        const clearBtn = e.target.closest('#lp-clear-history-btn');
        if (clearBtn) {
          localStorage.removeItem('suplilist:search-history');
          this._renderSearchHistory();
          return;
        }
      });
    }

    // Category filters
    const catRow = this.container.querySelector('#lp-cat-row');
    if (catRow) {
      catRow.addEventListener('click', e => {
        const btn = e.target.closest('[data-cat]');
        if (!btn) return;
        catRow.querySelectorAll('.lp-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        this._category = btn.dataset.cat;
        this._applyFilters();
        this._renderGrid();
      });
    }

    // Objective filters
    const objRow = this.container.querySelector('#lp-obj-row');
    if (objRow) {
      objRow.addEventListener('click', e => {
        const btn = e.target.closest('[data-obj]');
        if (!btn) return;
        const isActive = btn.classList.contains('active');
        objRow.querySelectorAll('.lp-chip').forEach(c => c.classList.remove('active'));
        if (!isActive) {
          btn.classList.add('active');
          this._objective = btn.dataset.obj;
        } else {
          this._objective = '';
        }
        this._applyFilters();
        this._renderGrid();
      });
    }

    // Grid event delegation
    const grid = this.container.querySelector('#lp-grid');
    if (grid) {
      grid.addEventListener('click', e => {
        // Fav toggle
        const favBtn = e.target.closest('[data-action="toggle-fav"]');
        if (favBtn) {
          e.stopPropagation();
          toggleFavorite(favBtn.dataset.id);
          this._refreshCardStates();
          return;
        }

        // Open modal action
        const verBtn = e.target.closest('[data-action="open-modal"]');
        if (verBtn) {
          e.stopPropagation();
          this._openModal(verBtn.dataset.id);
          return;
        }

        const upgradeBtn = e.target.closest('[data-action="upgrade-now"]');
        if (upgradeBtn) {
          e.stopPropagation();
          this._openCheckoutModal();
          return;
        }

        // Open modal on card click
        const card = e.target.closest('.lp-card');
        if (card) {
          if (card.dataset.id === 'sponsored-ad') {
            e.stopPropagation();
            this._openCheckoutModal();
            return;
          }
          if (card.dataset.id) {
            this._openModal(card.dataset.id);
          }
        }
      });
    }
  }

  /**
   * Retrieve search history from localStorage as an array.
   *
   * Reads 'suplilist:search-history' (JSON array of strings, up to 10 entries).
   * Returns empty array if key missing, invalid JSON, or error occurs.
   *
   * @returns {string[]} Array of past search queries in reverse chronological order
   * @private
   */
  _getSearchHistory() {
    try {
      return JSON.parse(localStorage.getItem('suplilist:search-history') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Save a search query to history and re-render the history panel.
   *
   * Trims query, deduplicates (case-insensitive), adds to front, keeps max 10.
   * Updates localStorage['suplilist:search-history'], then re-renders chips.
   * Skips if query is empty after trim.
   *
   * @param {string} query - Search query to save
   * @returns {void}
   * @private
   */
  _saveSearchHistory(query) {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();
    let history = this._getSearchHistory();
    history = history.filter(h => h.toLowerCase() !== cleanQuery.toLowerCase());
    history.unshift(cleanQuery);
    localStorage.setItem('suplilist:search-history', JSON.stringify(history.slice(0, 10)));
    this._renderSearchHistory();
  }

  /**
   * Render recent search history as clickable chips in #lp-history-panel.
   *
   * Fetches history via _getSearchHistory() and builds chip buttons with
   * data-query attribute. Shows panel if history has entries, hides if empty.
   * Each chip click restores query and re-filters grid.
   *
   * Chips include 🔍 emoji, escaped query text, and special styling.
   *
   * @returns {void}
   * @private
   */
  _renderSearchHistory() {
    const historyPanel = this.container.querySelector('#lp-history-panel');
    const historyChips = this.container.querySelector('#lp-history-chips');
    if (!historyPanel || !historyChips) return;

    const history = this._getSearchHistory();
    if (history.length === 0) {
      historyPanel.style.display = 'none';
      return;
    }

    historyPanel.style.display = 'flex';
    historyChips.innerHTML = history.map(h => `
      <button class="lp-chip lp-history-chip" data-query="${escapeHtml(h)}" style="margin: 0; padding: 4px 10px; font-size: 11px; background: var(--color-surface-secondary); display: flex; align-items: center; gap: 4px; border-radius: 8px;">
        <span>🔍</span> ${escapeHtml(h)}
      </button>
    `).join('');
  }
}
