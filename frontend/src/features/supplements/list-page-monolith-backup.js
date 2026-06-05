import { stateManager } from '../../state/state-manager.js';
import { logger } from '../../utils/logger.js';
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { escapeHtml } from '../../utils/escape.js';
import { CATEGORIES, OBJECTIVES } from './list-page-utils.js';
import { ListPageSearch } from './list-page-search.js';
import { ListPageGrid } from './list-page-grid.js';
import { ListPageModal } from './list-page-modal.js';

/**
 * ListPage — Supplement catalog with search, filtering, and shopping features
 * Orchestrator for ListPageSearch, ListPageGrid, and ListPageModal sub-components
 */
export default class ListPage {
  /**
   * Create a new ListPage
   * @param {HTMLElement} container - DOM element to mount the page
   * @param {Object} [params={}] - Page parameters
   * @param {string} [params.objective] - Pre-select objective filter
   */
  constructor(container, params = {}) {
    this.container = container;
    this._unsubscribe = null;
    this._prices = null;

    // Sub-components
    this._search = new ListPageSearch(container, {
      onFiltersChanged: (filtered) => this._grid.updateFiltered(filtered),
      onGridRender: () => this._grid._renderGrid(),
    });
    this._grid = new ListPageGrid(container, {
      onModalOpen: (id) => this._modal.open(id),
      onCheckout: () => this._modal.openCheckout(),
      onCardStateRefresh: () => this._grid._refreshCardStates(),
    });
    this._modal = new ListPageModal(container, {
      onCardStateRefresh: () => this._grid._refreshCardStates(),
    });

    // Initialize search with params
    if (params.objective) {
      this._search._objective = params.objective;
    }

    const state = stateManager.state;
    this._currentTier = state.user?.tier ?? 'free';
  }

  /**
   * Mount the page to the DOM and initialize all sub-components.
   */
  mount() {
    this._attachStyles();

    // Initialize sub-components
    this._search.init(null); // prices loaded after
    this._grid.init(SUPPLEMENTS_DB, null); // prices loaded after
    this._modal.init(SUPPLEMENTS_DB, null);

    // Render main layout
    this._render();

    // Load prices async
    this._fetchController = new AbortController();
    fetch('/data/prices.json', { signal: this._fetchController.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        this._prices = data;
        this._search._prices = data;
        this._grid.updatePrices(data);
        this._modal._prices = data;
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          logger.warn('[ListPage] prices.json failed to load:', err.message);
        }
      });

    // Subscribe to state changes (tier updates)
    this._unsubscribe = stateManager.subscribe(() => {
      const state = stateManager.state;
      const newTier = state.user?.tier ?? 'free';
      if (newTier !== this._currentTier) {
        this._currentTier = newTier;
        this._search._applyFilters();
        this._grid.updateFiltered(this._search.getFiltered());
      }
    });
  }

  /**
   * Unmount the page and clean up all resources.
   */
  unmount() {
    this._fetchController?.abort();
    this._unsubscribe?.();
    this._search.unmount();
    this._grid.unmount();
    this._modal.unmount();
    this.container.innerHTML = '';
  }

  /**
   * Inject CSS styles for ListPage layout.
   */
  _attachStyles() {
    if (document.getElementById('list-page-styles')) return;

    const style = document.createElement('style');
    style.id = 'list-page-styles';
    style.textContent = `
      #lp-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--color-bg-primary);
        color: var(--color-text-primary);
      }

      #lp-header {
        position: sticky;
        top: 0;
        z-index: 50;
        background: var(--color-bg-primary);
        border-bottom: 1px solid var(--color-border);
        padding: 12px 16px;
        box-sizing: border-box;
      }

      #lp-header-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      #lp-title {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        font-weight: 800;
        font-size: 22px;
        color: var(--color-text-primary);
        margin: 0;
        flex-shrink: 0;
      }

      #lp-search-wrap {
        flex: 1;
        position: relative;
      }

      #lp-search {
        width: 100%;
        box-sizing: border-box;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        color: var(--color-text-primary);
        outline: none;
        transition: border-color 0.15s;
      }

      #lp-search:focus {
        border-color: var(--color-brand);
      }

      #lp-stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 12px 16px 0;
      }

      @media (max-width: 480px) {
        #lp-stats-row {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .lp-stat-box {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 14px;
        padding: 12px 10px 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .lp-stat-ring-wrap {
        position: relative;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .lp-stat-val {
        font-size: 18px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .lp-stat-lbl {
        font-size: 10px;
        color: var(--color-text-muted);
        font-weight: 600;
        text-transform: uppercase;
      }

      #lp-filters {
        padding: 12px 16px 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .lp-filter-row {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding-bottom: 2px;
        scrollbar-width: none;
      }

      .lp-filter-row::-webkit-scrollbar {
        display: none;
      }

      .lp-chip {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer;
        white-space: nowrap;
        transition: border-color 0.15s, color 0.15s;
      }

      .lp-chip:hover:not(.active) {
        border-color: var(--color-brand);
        color: var(--color-brand);
      }

      .lp-chip.active {
        background: var(--color-brand);
        color: #fff;
        border-color: var(--color-brand);
      }

      #lp-body {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
      }

      #lp-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
        grid-auto-rows: max-content;
      }

      @media (min-width: 640px) {
        #lp-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (min-width: 1024px) {
        #lp-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }

      .lp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        cursor: pointer;
        transition: border-color 0.2s, transform 0.2s;
      }

      .lp-card:hover {
        border-color: var(--color-brand);
        transform: translateY(-3px);
      }

      .lp-card-img-wrap {
        height: 185px;
        flex-shrink: 0;
        background: var(--color-surface-secondary);
        overflow: hidden;
        position: relative;
      }

      .lp-card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .lp-card-info {
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        flex: 1;
      }

      .lp-card-name {
        font-size: 14px;
        font-weight: 700;
        margin: 0;
        line-height: 1.3;
      }

      .lp-card-price-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-top: 6px;
      }

      .lp-card-price {
        font-size: 18px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .lp-card-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: 10px;
      }

      .lp-btn-fav {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        cursor: pointer;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
      }

      .lp-btn-fav.faved {
        color: #EF4444;
        background: rgba(239, 68, 68, 0.08);
      }

      .lp-btn-ver-precos {
        flex: 1;
        height: 44px;
        background: var(--color-brand-muted);
        border: 1px solid var(--color-border-brand);
        color: var(--color-brand);
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }

      .lp-btn-ver-precos:hover {
        background: var(--color-brand);
        color: #fff;
      }

      #lp-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        animation: fade-in 0.15s ease;
      }

      @media (min-width: 600px) {
        #lp-modal-overlay {
          align-items: center;
          padding: 16px;
        }
      }

      #lp-modal-box {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px 20px 0 0;
        width: 100%;
        max-height: 92vh;
        overflow-y: auto;
        position: relative;
      }

      @media (min-width: 600px) {
        #lp-modal-box {
          border-radius: 20px;
          max-width: 800px;
          max-height: 90vh;
        }
      }

      @keyframes fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .lp-empty {
        text-align: center;
        padding: 60px 20px;
        color: var(--color-text-secondary);
      }

      .lp-empty-icon {
        font-size: 40px;
        margin-bottom: 12px;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Render the main ListPage layout HTML structure.
   */
  _render() {
    this.container.innerHTML = `
      <div id="lp-page">
        <div id="lp-header">
          <div id="lp-header-row">
            <h1 id="lp-title">Catálogo</h1>
            <div id="lp-search-wrap">
              <input
                id="lp-search"
                type="text"
                placeholder="Buscar suplemento..."
                autocomplete="off"
              />
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
          <div class="lp-filter-row" id="lp-cat-row">
            <span style="flex-shrink: 0; font-size: 11px; font-weight: 600; color: var(--color-text-muted);">Categoria</span>
            ${CATEGORIES.map(c => `<button class="lp-chip${c === 'Todos' ? ' active' : ''}" data-cat="${c}" aria-pressed="${c === 'Todos' ? 'true' : 'false'}">${c}</button>`).join('')}
          </div>
          <div class="lp-filter-row" id="lp-obj-row">
            <span style="flex-shrink: 0; font-size: 11px; font-weight: 600; color: var(--color-text-muted);">Objetivo</span>
            ${OBJECTIVES.map(o => `<button class="lp-chip" data-obj="${o}" aria-pressed="false">${o}</button>`).join('')}
          </div>
        </div>

        <div id="lp-body">
          <div id="lp-grid" role="list"></div>
        </div>
      </div>
    `;
  }
}
