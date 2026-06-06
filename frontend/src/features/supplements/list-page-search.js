/**
 * ListPageSearch — Search, filtering, and statistics management for supplement catalog
 * Extracted from ListPage for separation of concerns
 */

import { stateManager } from '../../state/state-manager.js';
import Fuse from 'fuse.js';
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { escapeHtml } from '../../utils/escape.js';
import { DEBOUNCE_SEARCH_MS } from '../../config/constants.js';
import {
  matchesCategory, matchesObjective,
  getFavoritesFromState
} from './list-page-utils.js';

/**
 * ListPageSearch — Manages search, filters, and catalog statistics
 */
export class ListPageSearch {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks; // { onFiltersChanged, onGridRender, onModalOpen, onCheckout, onCardStateRefresh }

    // Filter state
    this._query = '';
    this._category = 'Todos';
    this._objective = '';
    this._evidenceFilter = '';
    this._maxPriceFilter = 300;
    this._benefitsFilter = new Set();
    this._advancedPanelOpen = false;

    // Search
    this._fuse = null;
    this._allItems = SUPPLEMENTS_DB;
    this._filtered = [];
    this._debounceTimer = null;
  }

  /**
   * Initialize search engine and apply initial filters.
   * Called during mount() of parent.
   *
   * @param {Object} [prices] - Prices data from prices.json
   * @returns {void}
   */
  init(prices) {
    this._fuse = new Fuse(this._allItems, {
      keys: ['name', 'category', 'benefits'],
      threshold: 0.35,
      includeScore: true,
      ignoreLocation: true,
    });
    this._prices = prices;

    this._renderStats();
    this._applyFilters();
    this._syncObjectiveChip();
    this._attachListeners();
  }

  /**
   * Get current filtered items.
   * @returns {Array} Array of filtered supplement items
   */
  getFiltered() {
    return this._filtered;
  }

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
        const price = pInfo ? parseFloat(pInfo.shopee?.price || pInfo.amazon?.price || pInfo.mercadolivre?.price || 0) : 0;
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

    const state = stateManager.state;
    const userTier = state.user?.tier ?? 'free';
    if (userTier === 'free' && results.length > 3) {
      const resultsWithAd = [...results];
      resultsWithAd.splice(3, 0, { id: 'sponsored-ad', isAd: true });
      this._filtered = resultsWithAd;
    } else {
      this._filtered = results;
    }

    // Update results label
    const label = this.container.querySelector('#lp-results-label');
    if (label) {
      const activeAdv = this._evidenceFilter || this._maxPriceFilter < 300 || this._benefitsFilter.size > 0;
      label.textContent = this._query || this._category !== 'Todos' || this._objective || activeAdv
        ? `${this._filtered.length} resultado(s)`
        : '';
    }

    // Notify parent
    if (this.callbacks?.onFiltersChanged) {
      this.callbacks.onFiltersChanged(this._filtered);
    }
  }

  /**
   * Render the 4 stats rings (total supplements, stack count, favorites, high-evidence).
   *
   * Queries DOM for 4 SVG circles (#lp-ring-*) and value text elements (#lp-stat-*).
   * Calculates stroke-dashoffset for each ring based on ratio (count/max).
   * Colors: purple (brand), violet (stack), red (favorites), green (evidence-A).
   * Adds 'stat--empty' class to stack ring if count === 0 (visual feedback).
   *
   * @returns {void}
   */
  _renderStats() {
    const total = SUPPLEMENTS_DB.length;
    const stackCount = (stateManager.stack || []).length;
    const favsCount = getFavoritesFromState().size;
    const evaCount = SUPPLEMENTS_DB.filter(s => s.evidenceLevel === 'A').length;

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
    setRing('#lp-ring-eva', '#lp-stat-eva', evaCount, total, '#22C55E');

    const stackBox = this.container.querySelector('#lp-stat-stack')?.closest('.lp-stat-box');
    stackBox?.classList.toggle('stat--empty', stackCount === 0);
  }

  /**
   * Retrieve search history from localStorage as an array.
   *
   * Reads 'suplilist:search-history' (JSON array of strings, up to 10 entries).
   * Returns empty array if key missing, invalid JSON, or error occurs.
   *
   * @returns {string[]} Array of past search queries in reverse chronological order
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

  /**
   * Sync objective chip UI with current _objective filter.
   * Activates the corresponding button if _objective is set.
   *
   * @returns {void}
   */
  _syncObjectiveChip() {
    if (!this._objective) return;
    const objRow = this.container.querySelector('#lp-obj-row');
    if (!objRow) return;
    const btn = objRow.querySelector(`[data-obj="${this._objective}"]`);
    if (btn) btn.classList.add('active');
  }

  /**
   * Attach all event listeners for search, filters, and advanced options.
   *
   * Sets up delegated listeners for:
   * - **Search:** debounced input on #lp-search
   * - **Trending chips:** click to set query + search
   * - **Advanced filters toggle:** collapse/expand #lp-advanced-panel
   * - **Price range slider:** updates _maxPriceFilter and re-renders
   * - **Evidence level chips:** single-select (mutually exclusive)
   * - **Benefits chips:** multi-select (checkboxes)
   * - **Search history:** click to restore past query, clear button
   * - **Category row:** single-select mutually exclusive chip buttons
   * - **Objective row:** toggleable chip (can deselect)
   *
   * @returns {void}
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
          if (this.callbacks?.onGridRender) this.callbacks.onGridRender();
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
        if (this.callbacks?.onGridRender) this.callbacks.onGridRender();
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
        if (this.callbacks?.onGridRender) this.callbacks.onGridRender();
      });
    }

    // Evidence Level Filter (single-select)
    const eviPanel = this.container.querySelector('#lp-evi-filters');
    if (eviPanel) {
      eviPanel.addEventListener('click', e => {
        const chip = e.target.closest('[data-evi]');
        if (!chip) return;
        eviPanel.querySelectorAll('.lp-chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
        this._evidenceFilter = chip.dataset.evi;
        this._applyFilters();
        if (this.callbacks?.onGridRender) this.callbacks.onGridRender();
      });
    }

    // Benefits Filter (multi-select)
    const benPanel = this.container.querySelector('#lp-ben-filters');
    if (benPanel) {
      benPanel.addEventListener('click', e => {
        const chip = e.target.closest('[data-benefit]');
        if (!chip) return;
        const benefit = chip.dataset.benefit;
        const isActive = chip.classList.contains('active');
        if (isActive) {
          chip.classList.remove('active');
          chip.setAttribute('aria-pressed', 'false');
          this._benefitsFilter.delete(benefit);
        } else {
          chip.classList.add('active');
          chip.setAttribute('aria-pressed', 'true');
          this._benefitsFilter.add(benefit);
        }
        this._applyFilters();
        if (this.callbacks?.onGridRender) this.callbacks.onGridRender();
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
          if (this.callbacks?.onGridRender) this.callbacks.onGridRender();
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
        catRow.querySelectorAll('.lp-chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        this._category = btn.dataset.cat;
        this._applyFilters();
        if (this.callbacks?.onGridRender) this.callbacks.onGridRender();
      });
    }

    // Objective filters
    const objRow = this.container.querySelector('#lp-obj-row');
    if (objRow) {
      objRow.addEventListener('click', e => {
        const btn = e.target.closest('[data-obj]');
        if (!btn) return;
        const isActive = btn.classList.contains('active');
        objRow.querySelectorAll('.lp-chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        if (!isActive) {
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          this._objective = btn.dataset.obj;
        } else {
          this._objective = '';
        }
        this._applyFilters();
        if (this.callbacks?.onGridRender) this.callbacks.onGridRender();
      });
    }
  }

  /**
   * Clean up listeners and timers.
   * Called during unmount().
   *
   * @returns {void}
   */
  unmount() {
    clearTimeout(this._debounceTimer);
  }
}
