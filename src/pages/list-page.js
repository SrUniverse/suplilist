import { stateManager, ACTIONS } from '../state/state-manager.js';
import { logger } from '../utils/logger.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import Fuse from 'fuse.js';
import { escapeHtml } from '../utils/escape.js';
import { EVIDENCE_COLORS } from '../utils/evidence.js';
import affiliateEngine from '../monetization/affiliate-engine.js';
import { dosageToGrams } from '../utils/dosage-converter.js';
import { DAYS_PER_MONTH, PAGE_SIZE as CONST_PAGE_SIZE, DEBOUNCE_SEARCH_MS } from '../config/constants.js';

// P6: valida URLs de afiliados — rejeita qualquer protocolo não-HTTP para evitar javascript: injection
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  try {
    const u = new URL(url);
    return ['https:', 'http:'].includes(u.protocol) ? url : '#';
  } catch {
    return '#';
  }
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

/** Returns effective cost-per-unit for a store entry (pricePerUnit when available, else price). */
function getEffectiveCost(store) {
  return store.pricePerUnit ?? store.price;
}

/** Returns the best-value store entry from prices[item.id] (lowest pricePerUnit), or null. */
function getCheapestStore(item, prices) {
  const entries = prices && prices[item.id] ? Object.values(prices[item.id]) : null;
  if (!entries || !entries.length) return null;
  return entries.reduce((a, b) => getEffectiveCost(a) < getEffectiveCost(b) ? a : b);
}

function getPriceLabel(item, prices) {
  const cheapest = getCheapestStore(item, prices);
  if (cheapest) return { price: cheapest.price, label: cheapest.label };
  const dose = item.dosage?.maintenance ?? 5;
  const unit = item.dosage?.unit || 'g';
  const ppg = item.pricePerGram ?? 0.3;
  const doseInGrams = dosageToGrams(dose, unit);
  return { price: doseInGrams * ppg * DAYS_PER_MONTH, label: null };
}

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

export default class ListPage {
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
    this._boundKeydown = this._onKeydown.bind(this);
    this._scrollLockStack = [];  // Stack of scroll lock sources (modal, etc)
  }

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
    this._unsubscribe = stateManager.subscribe(() => this._refreshCardStates());
    document.addEventListener('keydown', this._boundKeydown);
  }

  unmount() {
    this._fetchController?.abort();
    this._unsubscribe?.();
    this._observer?.disconnect();
    document.removeEventListener('keydown', this._boundKeydown);
    this._closeModal();
    // Cancel pending debounce search callback
    clearTimeout(this._debounceTimer);
    // Ensure scroll is not left locked after navigation (router-outlet + body fallback)
    const outlet = document.getElementById('router-outlet');
    if (outlet) outlet.style.overflow = '';
    document.body.style.overflow = '';
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

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
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      @media (min-width: 640px) { #lp-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (min-width: 1024px) { #lp-grid { grid-template-columns: repeat(4, 1fr); } }

      /* ── Supplement Card ── */
      .lp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        display: flex; flex-direction: column;
        overflow: hidden;
        cursor: pointer;
        transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
      }
      .lp-card:hover {
        border-color: var(--color-brand);
        box-shadow: 0 4px 24px rgba(124,58,237,0.12);
        transform: translateY(-1px);
      }
      .lp-card-top-badge {
        padding: 6px 10px;
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .lp-card-img-wrap {
        aspect-ratio: 1/1;
        background: #1A1A1A;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden; position: relative;
        border-radius: 0;
      }
      .lp-card-img {
        width: 100%; height: 100%; object-fit: contain;
      }
      .lp-card-ev-badge {
        position: absolute; top: 6px; right: 6px;
        font-size: 9px; font-weight: 700; text-transform: uppercase;
        padding: 2px 7px; border-radius: 5px; letter-spacing: 0.04em;
      }
      .lp-card-info { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
      .lp-card-name {
        font-size: 13px; font-weight: 700; color: var(--color-text-primary);
        margin: 0; line-height: 1.3;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lp-card-cat { font-size: 10px; color: var(--color-text-muted); margin: 0; }
      .lp-card-desc {
        font-size: 12px; color: var(--color-text-secondary);
        line-height: 1.4; margin: 4px 0 0; flex: 1;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lp-card-price-row {
        display: flex; flex-direction: column; gap: 1px; margin-top: 6px;
      }
      .lp-card-price { font-size: 14px; font-weight: 700; color: var(--color-text-primary); }
      .lp-card-dose { font-size: 10px; color: var(--color-text-muted); }
      .lp-card-actions {
        display: flex; gap: 6px; align-items: center; margin-top: 8px;
      }
      .lp-btn-fav {
        width: 28px; height: 28px; flex-shrink: 0;
        background: rgba(0,0,0,0.4);
        border: 1px solid var(--color-border);
        border-radius: 8px; cursor: pointer;
        font-size: 13px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, border-color 0.15s;
      }
      .lp-btn-fav:hover { background: var(--color-surface-hover); }
      .lp-btn-fav.faved { border-color: #EF4444; color: #EF4444; }
      .lp-btn-ver-precos {
        flex: 1; height: 36px; min-height: 36px;
        background: transparent;
        border: 1px solid var(--color-brand);
        color: var(--color-brand);
        border-radius: 8px;
        font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: 'Inter', sans-serif;
        transition: background 0.15s, color 0.15s;
        display: flex; align-items: center; justify-content: center;
        letter-spacing: 0.03em;
      }
      .lp-btn-ver-precos:hover {
        background: var(--color-brand);
        color: #fff;
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
        background: #1A1A1A; border-radius: 16px;
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
      .lp-price-card--best { border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.05); }
      .lp-price-card-store { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
      .lp-price-card-store-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .lp-price-best-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; background: rgba(34,197,94,0.15); color: #16a34a; padding: 2px 6px; border-radius: 4px; }
      .lp-price-card-val { font-size: 16px; font-weight: 700; color: var(--color-text-primary); }
      .lp-price-qty { font-size: 11px; color: var(--color-text-muted); margin-top: 1px; }
      .lp-price-saving {
        font-size: 10px; font-weight: 700;
        background: rgba(34,197,94,0.12); color: #22C55E;
        padding: 2px 7px; border-radius: 5px;
      }
      .lp-price-link {
        font-size: 12px; font-weight: 600; color: var(--color-brand);
        background: var(--color-brand-muted);
        border: 1px solid rgba(124,58,237,0.2);
        border-radius: 8px; padding: 6px 12px;
        cursor: pointer; text-decoration: none; white-space: nowrap;
        transition: background 0.15s;
      }
      .lp-price-link:hover { background: rgba(124,58,237,0.2); }

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
        background: var(--color-success-bg);
        color: var(--color-success);
        border: 1px solid rgba(34,197,94,0.3);
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  _render() {
    this.container.innerHTML = `
      <div id="lp-root">
        <div id="lp-header">
          <div id="lp-header-row">
            <h1 id="lp-title">Catálogo</h1>
            <div id="lp-search-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input id="lp-search" type="search" placeholder="Buscar suplemento..." autocomplete="off" />
            </div>
          </div>
          <div id="lp-trending">
            <span class="lp-trending-label">Trending:</span>
            <button class="lp-trend-chip" data-trend="Ashwagandha">Ashwagandha</button>
            <button class="lp-trend-chip" data-trend="Creatina">Creatina</button>
            <button class="lp-trend-chip" data-trend="Foco">Foco</button>
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

  _applyFilters() {
    let results = this._allItems;

    if (this._query.trim()) {
      results = this._fuse
        ? this._fuse.search(this._query).map(r => r.item)
        : results.filter(s => s.name.toLowerCase().includes(this._query.toLowerCase()));
    }

    results = results.filter(s => matchesCategory(s, this._category));
    results = results.filter(s => matchesObjective(s, this._objective));

    this._filtered = results;

    const label = this.container.querySelector('#lp-results-label');
    if (label) {
      label.textContent = this._query || this._category !== 'Todos' || this._objective
        ? `${this._filtered.length} resultado(s)`
        : '';
    }
  }

  // ─── Grid ─────────────────────────────────────────────────────────────────

  _renderGrid() {
    // Guard: don't render if modal is open (prevents listeners orphaning)
    if (this._modalOpen) return;

    const grid = this.container.querySelector('#lp-grid');
    if (!grid) return;
    this._page = 0;
    grid.innerHTML = '';

    if (!this._filtered.length) {
      grid.innerHTML = `
        <div class="lp-empty">
          <div class="lp-empty-icon">🔍</div>
          <p style="font-weight:700;margin:0 0 6px;">Nenhum resultado</p>
          <p style="font-size:13px;margin:0;">Tente outra busca ou remova os filtros.</p>
        </div>`;
      return;
    }

    const frag = this._buildFragment(0, PAGE_SIZE);
    grid.appendChild(frag);
    this._page = 1;
  }

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

  _pushScrollLock(source = 'modal') {
    if (!this._scrollLockStack.includes(source)) {
      this._scrollLockStack.push(source);
      // Use CSS class flag instead of direct style — survives router transitions
      document.body.classList.add('has-modal-open');
    }
  }

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
               href="${sanitizeUrl(store.url || affLinks[storeKey])}"
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

  _closeModal() {
    const existing = document.getElementById('lp-modal-overlay');
    if (existing) {
      existing.remove();
      this._popScrollLock('modal');
    }
    this._modalOpen = null;
  }

  _onKeydown(e) {
    if (e.key === 'Escape' && this._modalOpen) this._closeModal();
  }

  // ─── Sync initial filter UI from params ──────────────────────────────────

  _syncObjectiveChip() {
    if (!this._objective) return;
    const objRow = this.container.querySelector('#lp-obj-row');
    if (!objRow) return;
    const btn = objRow.querySelector(`[data-obj="${this._objective}"]`);
    if (btn) btn.classList.add('active');
  }

  // ─── Event Listeners ──────────────────────────────────────────────────────

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

        // Open modal on card click
        const card = e.target.closest('.lp-card');
        if (card && card.dataset.id) {
          this._openModal(card.dataset.id);
        }
      });
    }
  }
}
