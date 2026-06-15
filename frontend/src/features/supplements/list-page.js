import { stateManager } from '../../state/state-manager.js';
import { logger } from '../../utils/logger.js';
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { CATEGORIES, OBJECTIVES } from './list-page-utils.js';
import { ListPageSearch } from './list-page-search.js';
import { ListPageGrid } from './list-page-grid.js';
import { ListPageModal } from './list-page-modal.js';
import { SchemaManager } from '../../platform/schema-manager.js';

import { Skeleton } from '../../components/skeleton.js';
import { identityService } from '../../platform/identity-service.js';

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

    // Render main layout first
    this._render();

    this._fetchController = new AbortController();
    const signal = this._fetchController.signal;

    // Show skeleton cards while catalog data loads
    const grid = this.container.querySelector('#lp-grid');
    if (grid) {
      grid.innerHTML = Array.from({ length: 8 }, () => Skeleton.supplementCard()).join('');
    }


    // Fetch catalog from static JSON (same URL pattern as future GET /api/supplements)
    const catalogPromise = fetch('/data/supplements-db.json', { signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));

    Promise.all([catalogPromise, identityService.isReady()])
      .then(([catalogData]) => {
        if (signal.aborted) return;

        const supplements = Array.isArray(catalogData) ? catalogData : (catalogData.supplements ?? SUPPLEMENTS_DB);

        // Initialize sub-components in order: grid → modal → search
        this._grid.init([], null);
        this._modal.init(supplements, null);
        this._search.init(null, supplements);

        // Inject ItemList schema for catalog SEO
        SchemaManager.insertSchema({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Catálogo de Suplementos | SupliList',
          description: `${supplements.length}+ suplementos com evidência científica — compare preços e doses`,
          url: 'https://suplilist.com/list',
          numberOfItems: supplements.length,
          itemListElement: supplements.slice(0, 20).map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: s.name,
            url: `https://suplilist.com/suplemento/${s.id}`
          }))
        });

        // Load prices async — try from API first, fall back to static JSON
        const supplementIds = supplements.map(s => s.id).join(',');
        fetch(`/api/supplements/prices?ids=${encodeURIComponent(supplementIds)}`, { signal })
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
          .then(apiResponse => {
            if (signal.aborted) return;

            // Convert API response to prices.json format
            // API returns: { "id": { supplementId, name, prices: { amazon, mercadolivre, shopee }, bestPrice } }
            const prices = {};
            if (apiResponse.success && apiResponse.data) {
              Object.entries(apiResponse.data).forEach(([id, supplement]) => {
                if (supplement && supplement.prices) {
                  prices[id] = {};
                  ['amazon', 'mercadolivre', 'shopee'].forEach(source => {
                    const sourceData = supplement.prices[source];
                    if (sourceData) {
                      prices[id][source] = {
                        price: sourceData.price,
                        url: sourceData.url || `https://${source}.com.br/search?q=${id}`,
                        label: source.charAt(0).toUpperCase() + source.slice(1),
                        saving: supplement.bestPrice?.source === source ? 0 : 10 // placeholder
                      };
                    }
                  });
                }
              });
            }

            if (Object.keys(prices).length > 0) {
              this._prices = prices;
              this._search._prices = prices;
              this._grid.updatePrices(prices);
              this._modal._prices = prices;
            } else {
              throw new Error('No prices returned from API');
            }
          })
          .catch(err => {
            if (err.name !== 'AbortError') {
              logger.warn('[ListPage] API prices failed, falling back to static prices:', err.message);
              // Fall back to static prices.json
              fetch('/data/prices.json', { signal })
                .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
                .then(data => {
                  if (signal.aborted) return;
                  this._prices = data;
                  this._search._prices = data;
                  this._grid.updatePrices(data);
                  this._modal._prices = data;
                })
                .catch(fallbackErr => {
                  if (fallbackErr.name !== 'AbortError') {
                    logger.warn('[ListPage] Static prices.json also failed:', fallbackErr.message);
                  }
                });
            }
          });
      })
      .catch(err => {
        if (err.name === 'AbortError' || signal.aborted) return;
        logger.error('[ListPage] Catalog fetch failed:', err.message);

        // Fall back to bundled data so the page still works
        this._grid.init([], null);
        this._modal.init(SUPPLEMENTS_DB, null);
        this._search.init(null, SUPPLEMENTS_DB);

        // Show error notice above grid without breaking layout
        if (grid) {
          const notice = document.createElement('div');
          notice.className = 'lp-catalog-error';
          notice.innerHTML = `
            <div class="lp-catalog-error-icon">📡</div>
            <p class="lp-catalog-error-title">Não foi possível carregar os suplementos no momento</p>
            <p class="lp-catalog-error-msg">Exibindo dados em cache. Verifique sua conexão e tente novamente.</p>
            <button class="lp-catalog-retry-btn" id="lp-catalog-retry">Tentar novamente</button>
          `;
          grid.parentElement?.insertBefore(notice, grid);
          notice.querySelector('#lp-catalog-retry')?.addEventListener('click', () => {
            notice.remove();
            this.unmount();
            this.mount();
          });
        }
      });

    // ── M9: Scroll-to-top FAB ────────────────────────────────────────────────
    const fab = document.createElement('button');
    fab.id = 'lp-fab-top';
    fab.setAttribute('aria-label', 'Voltar ao topo');
    fab.textContent = '↑';
    document.body.appendChild(fab);
    fab.addEventListener('click', () => {
      const scrollEl = document.getElementById('lp-body');
      if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const onScrollFab = () => {
      const scrollEl = document.getElementById('lp-body');
      if (scrollEl) {
        fab.classList.toggle('visible', scrollEl.scrollTop > window.innerHeight * 2);
      }
    };
    
    // Attaching directly in mount but using event delegation or just picking it up
    // Wait for next tick so #lp-body is in DOM
    setTimeout(() => {
      const scrollEl = document.getElementById('lp-body');
      if (scrollEl) {
        scrollEl.addEventListener('scroll', onScrollFab, { passive: true });
      }
    }, 0);
    this._fabEl = fab;
    this._fabScrollHandler = onScrollFab;

    // Subscribe to state changes (tier + stack updates)
    this._stackLen = (stateManager.stack ?? []).length;
    this._unsubscribe = stateManager.subscribe(() => {
      const state = stateManager.state;
      const newTier = state.user?.tier ?? 'free';
      if (newTier !== this._currentTier) {
        this._currentTier = newTier;
        this._search._applyFilters();
        this._grid.updateFiltered(this._search.getFiltered());
      }
      // Re-render stats when stack size changes (optimistic UI counter update)
      const newLen = (stateManager.stack ?? []).length;
      if (newLen !== this._stackLen) {
        this._stackLen = newLen;
        this._search._renderStats();
        this._grid._refreshCardStates?.();
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
    // M9: cleanup FAB
    if (this._fabEl) {
      const scrollEl = document.getElementById('lp-body');
      if (scrollEl) scrollEl.removeEventListener('scroll', this._fabScrollHandler);
      this._fabEl.remove();
      this._fabEl = null;
    }
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

      /* Mobile search overlay */
      .lp-search-overlay {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: var(--color-bg-primary, #05060a);
        display: flex;
        flex-direction: column;
        padding: env(safe-area-inset-top, 0) 0 0;
        animation: lp-overlay-in 200ms ease;
      }

      @keyframes lp-overlay-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .lp-search-overlay-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px 10px;
        border-bottom: 1px solid var(--color-border);
      }

      .lp-search-overlay-input {
        flex: 1;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 16px; /* 16px prevents iOS zoom */
        color: var(--color-text-primary);
        outline: none;
      }

      .lp-search-overlay-input:focus {
        border-color: var(--color-brand);
      }

      .lp-search-overlay-cancel {
        font-size: 14px;
        color: var(--color-brand);
        background: none;
        border: none;
        padding: 8px 4px;
        cursor: pointer;
        white-space: nowrap;
        font-weight: 600;
      }

      .lp-search-overlay-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .lp-search-history-title {
        font-size: 11px;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 10px;
      }

      .lp-search-history-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border);
        font-size: 14px;
        color: var(--color-text-secondary);
        cursor: pointer;
        background: none;
        border-left: none;
        border-right: none;
        border-top: none;
        width: 100%;
        text-align: left;
      }

      .lp-search-history-icon {
        color: var(--color-text-muted);
        font-size: 14px;
        flex-shrink: 0;
      }

      @media (min-width: 600px) {
        .lp-search-overlay { display: none !important; }
      }

      @media (max-width: 600px) {
        #lp-title {
          display: none;
        }

        #lp-search-wrap {
          padding-top: 8px;
          padding-bottom: 8px;
        }
      }

      #lp-stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 12px 16px 0;
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

      @media (max-width: 600px) {
        #lp-stats-row {
          display: flex;
          flex-direction: row;
          gap: 0;
          padding: 6px 12px;
          border-radius: 0;
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
        }

        .lp-stat-box {
          flex: 1;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 4px;
          border: none;
          border-right: 1px solid var(--color-border);
          border-radius: 0;
          background: transparent;
        }

        .lp-stat-box:last-child {
          border-right: none;
        }

        .lp-stat-ring-wrap {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
        }

        .lp-stat-ring-wrap svg {
          width: 28px;
          height: 28px;
        }

        .lp-stat-val {
          font-size: 13px;
          font-weight: 800;
        }

        .lp-stat-lbl {
          display: none;
        }
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

      @media (max-width: 600px) {
        .lp-filter-label {
          display: none;
        }

        .lp-chip {
          padding: 9px 14px;
          font-size: 13px;
          min-height: 44px;
        }
      }

      #lp-body {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
      }

      #lp-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 12px;
        grid-auto-rows: max-content;
      }

      /* VirtualScroller inserts a single wrapper div — make it span all columns */
      #lp-grid > .virtual-scroller-list {
        grid-column: 1 / -1;
        width: 100%;
      }

      @media (min-width: 640px) {
        #lp-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (min-width: 1024px) {
        #lp-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }

      /* ─── Supplement Card (Legion Athletics / Momentous style) ── */
      .lp-card {
        --cat-color: var(--color-brand);
        --cat-bg: rgba(99,102,241,0.12);
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg, 16px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        cursor: pointer;
        height: 100%;
        transition:
          border-color 200ms ease,
          box-shadow 200ms ease,
          transform 200ms ease;
      }

      @media (hover: hover) {
        .lp-card:hover {
          border-color: var(--color-border-brand);
          box-shadow: 0 0 0 1px var(--cat-color, var(--color-brand)), 0 16px 48px color-mix(in srgb, var(--cat-color, var(--color-brand)) 22%, transparent);
          transform: translateY(-4px);
        }
        .lp-card:hover .lp-card-img {
          transform: scale(1.04);
          filter: brightness(1.04);
        }
      }

      @media (hover: none) {
        .lp-card:active {
          transform: scale(0.98);
          border-color: var(--color-border-brand);
        }
      }

      /* Full-bleed image area */
      .lp-card-img-wrap {
        position: relative;
        height: 190px;
        flex-shrink: 0;
        background: var(--color-surface-secondary);
        overflow: hidden;
      }

      .lp-card-img-wrap.img-error::after {
        content: "🧪";
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        opacity: 0.3;
      }

      .lp-card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 350ms ease;
      }

      /* Gradient overlay — makes text readable over image */
      .lp-card-img-gradient {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to top,
          rgba(5, 6, 10, 0.92) 0%,
          rgba(5, 6, 10, 0.30) 55%,
          transparent 100%
        );
        pointer-events: none;
      }

      /* Evidence pill — top-left overlay */
      .lp-card-ev-pill {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 2;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        border-color: color-mix(in srgb, var(--cat-color) 40%, transparent) !important;
        background: var(--cat-bg) !important;
        color: var(--cat-color) !important;
      }

      /* Savings pill — top-right overlay */
      .lp-card-savings-pill {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 2;
        background: var(--color-savings-bg, rgba(34,197,94,0.15));
        color: var(--color-savings, #22C55E);
        border: 1px solid rgba(34, 197, 94, 0.3);
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        letter-spacing: 0.04em;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }

      /* Name + category floating at bottom of image */
      .lp-card-overlay-footer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 10px 12px 12px;
        z-index: 2;
      }

      .lp-card-name {
        font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif);
        font-size: 14px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 3px;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        text-shadow: 0 1px 6px rgba(0,0,0,0.6);
      }

      .lp-card-cat {
        font-size: 10px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.60);
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      /* Card body below image */
      .lp-card-body {
        padding: 12px 14px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
      }

      .lp-card-desc {
        font-size: 12px;
        line-height: 1.45;
        color: var(--color-text-secondary);
        margin: 0;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      /* Empurra preço + ações para a base, mantendo a descrição no topo */
      .lp-card-desc + .lp-card-price-area { margin-top: auto; }

      .lp-card-price-area {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .lp-card-price {
        font-size: 20px;
        font-weight: 800;
        color: var(--color-text-primary);
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }

      .lp-card-dose {
        font-size: 11px;
        color: var(--color-text-muted);
        font-weight: 500;
      }

      .lp-card-dose:empty {
        display: none;
      }

      .lp-card-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: auto;
      }

      .lp-btn-fav {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm, 8px);
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
        line-height: 1;
      }

      .lp-btn-fav:hover {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.4);
        color: #EF4444;
      }

      .lp-btn-fav.faved {
        color: #EF4444;
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.35);
      }

      .lp-btn-detail {
        flex: 1;
        height: 44px;
        background: var(--color-brand-muted);
        border: 1px solid var(--color-border-brand);
        color: var(--color-brand);
        border-radius: var(--radius-sm, 8px);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        letter-spacing: 0.02em;
        transition: background 150ms ease, color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
      }

      .lp-btn-detail:hover {
        background: var(--color-brand);
        color: #fff;
        border-color: var(--color-brand);
        box-shadow: 0 2px 12px rgba(139, 92, 246, 0.35);
      }

      @media (max-width: 480px) {
        .lp-card-img-wrap { height: 220px; }
        .lp-card-price { font-size: 22px; }
        .lp-card-dose { font-size: 12px; }
        .lp-btn-detail { height: 48px; font-size: 14px; letter-spacing: 0.01em; }
        .lp-btn-fav { width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0; }
        .lp-card-body { padding: 12px 14px 14px; }
        .lp-card-actions { gap: 8px; }

        /* M5: Card body redesign for 1 column */
        .lp-card-name { font-size: 16px; font-weight: 800; }
        .lp-card-category { font-size: 10px; letter-spacing: 0.06em; }
        .lp-card-price-area { margin-bottom: 12px; }
        .lp-card-img-gradient {
          background: linear-gradient(to top, rgba(5, 6, 10, 0.98) 0%, rgba(5, 6, 10, 0.5) 45%, transparent 100%);
        }
      }

      @media (max-width: 600px) {
        #lp-filters { padding: 10px 12px 6px; gap: 8px; border-bottom: 1px solid var(--color-border); }
        .lp-filter-row { gap: 8px; padding-bottom: 4px; padding-top: 2px; }
      }

      /* Skeleton loading cards */
      .lp-skeleton-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 14px;
        overflow: hidden;
        height: 340px;
      }

      @keyframes lp-shimmer {
        0%   { background-position: -600px 0 }
        100% { background-position: 600px 0 }
      }

      .lp-skeleton-img {
        height: 185px;
        background: linear-gradient(90deg,
          var(--color-surface-secondary) 25%,
          color-mix(in oklch, var(--color-surface-secondary) 70%, white) 50%,
          var(--color-surface-secondary) 75%
        );
        background-size: 1200px 100%;
        animation: lp-shimmer 1.6s infinite linear;
      }

      .lp-skeleton-body {
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .lp-skeleton-line {
        height: 14px;
        background: var(--color-surface-secondary);
        border-radius: 4px;
        animation: lp-shimmer 1.6s infinite linear;
        background-image: linear-gradient(90deg,
          var(--color-surface-secondary) 25%,
          color-mix(in oklch, var(--color-surface-secondary) 70%, white) 50%,
          var(--color-surface-secondary) 75%
        );
        background-size: 1200px 100%;
      }

      /* Catalog error / empty state */
      .lp-catalog-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 24px;
        text-align: center;
        color: var(--color-text-secondary);
        gap: 12px;
      }

      .lp-catalog-error-icon {
        font-size: 36px;
        opacity: 0.6;
      }

      .lp-catalog-error-title {
        font-weight: 700;
        font-size: 16px;
        color: var(--color-text-primary);
        margin: 0;
      }

      .lp-catalog-error-msg {
        font-size: 13px;
        margin: 0;
        max-width: 280px;
        line-height: 1.5;
      }

      .lp-catalog-retry-btn {
        margin-top: 8px;
        padding: 10px 24px;
        background: var(--color-brand);
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
      }


      /* ═══════════════════════════════════════════════════
         MODAL — Hero-based redesign
         ═══════════════════════════════════════════════════ */

      @keyframes lp-overlay-in  { from { opacity: 0 } to { opacity: 1 } }
      @keyframes lp-sheet-up    { from { transform: translateY(100%) } to { transform: translateY(0) } }
      @keyframes lp-dialog-in   { from { opacity: 0; transform: scale(0.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }

      #lp-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: rgba(0, 0, 0, 0.80);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        animation: lp-overlay-in 160ms ease forwards;
      }

      @media (min-width: 600px) {
        #lp-modal-overlay {
          align-items: center;
          padding: 20px;
        }
      }

      /* ── Modal box ──────────────────────────────────────── */
      #lp-modal-box {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 24px 24px 0 0;
        width: 100%;
        max-height: 92dvh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        animation: lp-sheet-up 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @media (min-width: 600px) {
        #lp-modal-box {
          border-radius: 20px;
          max-width: 560px;
          max-height: 88dvh;
          animation: lp-dialog-in 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      }

      /* ── Drag handle ────────────────────────────────────── */
      .lp-modal-drag-handle {
        width: 40px;
        height: 4px;
        border-radius: 2px;
        background: var(--color-border);
        margin: 10px auto 0;
        flex-shrink: 0;
      }

      @media (min-width: 600px) {
        .lp-modal-drag-handle { display: none; }
      }

      /* ── Hero image ─────────────────────────────────────── */
      .lp-modal-hero {
        position: relative;
        height: 240px;
        flex-shrink: 0;
        background: var(--color-surface-secondary);
        overflow: hidden;
      }

      @media (min-width: 600px) {
        .lp-modal-hero { height: 260px; }
      }

      .lp-modal-hero--error::after {
        content: "🧪";
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 56px;
        opacity: 0.25;
      }

      .lp-modal-hero-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .lp-modal-hero-gradient {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to top,
          rgba(5, 6, 10, 0.95) 0%,
          rgba(5, 6, 10, 0.35) 50%,
          rgba(5, 6, 10, 0.15) 100%
        );
        pointer-events: none;
      }

      /* Close button — top-right inside hero */
      .lp-modal-close-btn {
        position: absolute;
        top: 12px;
        right: 14px;
        width: 36px;
        height: 36px;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 50%;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.85);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 5;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
      }
      .lp-modal-close-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.35);
      }
      .lp-modal-close-btn:focus-visible {
        outline: 2px solid var(--color-brand);
        outline-offset: 2px;
      }

      /* Prev/Next navigation buttons */
      .lp-modal-nav {
        position: absolute;
        bottom: 12px;
        right: 14px;
        display: flex;
        gap: 6px;
        z-index: 5;
      }

      .lp-modal-nav-btn {
        width: 34px;
        height: 34px;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 50%;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.85);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
      }

      .lp-modal-nav-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.35);
      }

      .lp-modal-nav-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .lp-modal-nav-btn:focus-visible {
        outline: 2px solid var(--color-brand);
        outline-offset: 2px;
      }

      @media (max-width: 600px) {
        .lp-modal-close-btn {
          width: 44px;
          height: 44px;
        }
        .lp-modal-nav-btn {
          width: 44px;
          height: 44px;
        }
      }

      /* Name / category overlay at bottom of hero */
      .lp-modal-hero-footer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 14px 18px 18px;
        z-index: 4;
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: flex-start;
      }

      .lp-modal-title {
        font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif);
        font-size: 22px;
        font-weight: 800;
        color: #fff;
        margin: 0;
        line-height: 1.2;
        text-shadow: 0 1px 8px rgba(0,0,0,0.5);
      }

      @media (min-width: 600px) {
        .lp-modal-title { font-size: 24px; }
      }

      .lp-modal-hero-cat {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.55);
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.07em;
      }

      /* ── Scrollable body ────────────────────────────────── */
      .lp-modal-body {
        flex: 1;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 20px 18px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      @media (min-width: 600px) {
        .lp-modal-body { padding: 22px 24px; }
      }

      /* ── Section heading ────────────────────────────────── */
      .lp-modal-section { display: flex; flex-direction: column; gap: 10px; }

      .lp-modal-section-heading {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 0;
      }

      /* ── Price table (Stripe-inspired) ──────────────────── */
      .lp-price-table {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        overflow: hidden;
      }

      .lp-price-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 11px 14px;
        border-bottom: 1px solid var(--color-border);
        transition: background 120ms ease;
      }
      .lp-price-row:last-child { border-bottom: none; }
      .lp-price-row--best {
        background: var(--color-brand-muted, rgba(139,92,246,0.06));
      }

      .lp-price-row-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .lp-price-row-store {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-primary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .lp-price-row-best-tag {
        font-size: 10px;
        font-weight: 700;
        color: var(--color-brand);
        background: var(--color-brand-muted);
        border: 1px solid var(--color-border-brand);
        padding: 1px 7px;
        border-radius: 20px;
        width: fit-content;
        letter-spacing: 0.02em;
      }

      .lp-price-row-qty {
        font-size: 10px;
        color: var(--color-text-muted);
        margin-top: 1px;
      }

      .lp-price-row-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .lp-price-row-amount {
        font-size: 17px;
        font-weight: 800;
        color: var(--color-text-primary);
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
      }

      .lp-price-row-saving {
        font-size: 10px;
        font-weight: 700;
        color: #22c55e;
        background: rgba(34,197,94,0.10);
        border: 1px solid rgba(34,197,94,0.25);
        padding: 2px 7px;
        border-radius: 6px;
        white-space: nowrap;
      }

      .lp-price-row-link {
        display: inline-flex;
        align-items: center;
        padding: 7px 13px;
        background: var(--color-brand);
        color: #fff;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        text-decoration: none;
        white-space: nowrap;
        transition: opacity 130ms ease, box-shadow 130ms ease;
        letter-spacing: 0.02em;
      }
      .lp-price-row-link:hover {
        opacity: 0.88;
        box-shadow: 0 2px 10px rgba(139, 92, 246, 0.4);
      }

      /* ── Segmented tab control ──────────────────────────── */
      .lp-seg-tabs { flex-shrink: 0; }

      .lp-seg-tabs-track {
        position: relative;
        display: flex;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 3px;
        gap: 0;
      }

      /* Sliding pill indicator */
      .lp-seg-pill {
        position: absolute;
        top: 3px;
        left: 3px;
        height: calc(100% - 6px);
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 7px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.18);
        transition: left 200ms cubic-bezier(0.16, 1, 0.3, 1), width 200ms cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
        z-index: 1;
      }

      .lp-seg-tab {
        flex: 1;
        background: none;
        border: none;
        padding: 7px 4px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-muted);
        cursor: pointer;
        font-family: inherit;
        border-radius: 7px;
        position: relative;
        z-index: 2;
        transition: color 150ms ease;
        white-space: nowrap;
      }

      .lp-seg-tab.active {
        color: var(--color-text-primary);
        font-weight: 700;
      }

      .lp-tab-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 10px;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        font-size: 9px;
        font-weight: 700;
        color: var(--color-text-muted);
        vertical-align: middle;
        margin-left: 2px;
      }
      .lp-seg-tab.active .lp-tab-count {
        background: var(--color-brand-muted);
        border-color: var(--color-border-brand);
        color: var(--color-brand);
      }

      .lp-seg-tab:focus-visible {
        outline: 2px solid var(--color-brand);
        outline-offset: 1px;
      }

      /* ── Tab panels ─────────────────────────────────────── */
      .lp-tab-panels { flex: 1; }

      .lp-tab-panel {
        display: none;
        animation: lp-panel-in 180ms ease forwards;
      }
      .lp-tab-panel.active { display: block; }

      @keyframes lp-panel-in {
        from { opacity: 0; transform: translateY(4px) }
        to   { opacity: 1; transform: translateY(0) }
      }

      /* Dose visualization bar */
      .lp-dose-bar-wrap { margin-bottom: 16px; }
      .lp-dose-bar-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
      .lp-dose-bar-label { font-size: 12px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
      .lp-dose-bar-value { font-size: 18px; font-weight: 800; color: var(--color-brand); font-variant-numeric: tabular-nums; }
      .lp-dose-bar-track {
        position: relative;
        height: 8px;
        background: var(--color-surface-secondary);
        border-radius: 4px;
        overflow: visible;
        margin-bottom: 6px;
      }
      .lp-dose-bar-fill {
        height: 100%;
        border-radius: 4px;
        background: linear-gradient(90deg, var(--color-brand), color-mix(in oklch, var(--color-brand) 80%, #fff));
        transition: width 600ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .lp-dose-bar-min-marker {
        position: absolute;
        top: -3px;
        width: 2px;
        height: 14px;
        background: rgba(255,255,255,0.3);
        border-radius: 1px;
      }
      .lp-dose-bar-tick-label {
        position: absolute;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 9px;
        color: var(--color-text-muted);
        white-space: nowrap;
      }
      .lp-dose-bar-range { display: flex; justify-content: space-between; font-size: 10px; color: var(--color-text-muted); }

      /* Dose definition list */
      .lp-dose-list {
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        overflow: hidden;
      }

      .lp-dose-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
        padding: 11px 14px;
        border-bottom: 1px solid var(--color-border);
      }
      .lp-dose-row:last-child { border-bottom: none; }

      .lp-dose-row dt {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-muted);
        flex-shrink: 0;
      }

      .lp-dose-row dd {
        font-size: 13px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0;
        text-align: right;
      }

      /* Benefits / Safety shared styles */
      .lp-info-list {
        margin: 0;
        padding-left: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 13px;
        color: var(--color-text-secondary);
        line-height: 1.55;
      }

      .lp-info-list li {
        position: relative;
        padding-left: 16px;
      }

      .lp-info-list li::before {
        content: '·';
        position: absolute;
        left: 0;
        color: var(--color-brand);
        font-size: 20px;
        line-height: 1.1;
        font-weight: 700;
      }

      .lp-benefit-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding-left: 0;
      }
      .lp-benefit-item::before { display: none; }
      .lp-benefit-check { flex-shrink: 0; margin-top: 2px; }

      .lp-info-empty {
        font-size: 13px;
        color: var(--color-text-muted);
        margin: 0;
        font-style: italic;
      }

      .lp-info-subtitle {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.07em;
        margin: 0 0 8px;
      }

      /* ── aria-live region (visually hidden) ─────────────── */
      .lp-modal-announce {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        overflow: hidden;
        clip: rect(0,0,0,0);
        white-space: nowrap;
        border: 0;
      }

      /* ── Sticky footer ──────────────────────────────────── */
      .lp-modal-footer {
        flex-shrink: 0;
        padding: 14px 18px max(14px, env(safe-area-inset-bottom));
        background: var(--color-surface-primary);
        border-top: 1px solid var(--color-border);
      }

      @media (min-width: 600px) {
        .lp-modal-footer { padding: 16px 24px; }
      }

      .lp-modal-add-btn {
        width: 100%;
        padding: 15px;
        background: var(--color-brand);
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        letter-spacing: 0.01em;
        transition: opacity 150ms ease, transform 100ms ease, box-shadow 150ms ease;
      }
      .lp-modal-add-btn:hover {
        opacity: 0.9;
        box-shadow: 0 4px 18px rgba(139, 92, 246, 0.4);
      }
      .lp-modal-add-btn:active { transform: scale(0.985); }
      .lp-modal-add-btn.in-stack {
        background: var(--color-surface-secondary);
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);
        box-shadow: none;
      }
      .lp-modal-add-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        box-shadow: none;
      }

      /* ── Evidence badge (used in hero + card) ───────────── */
      .ev-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      .ev-badge--a { background: rgba(34,197,94,0.18); color: #22c55e; border: 1px solid rgba(34,197,94,0.35); }
      .ev-badge--b { background: rgba(59,130,246,0.18); color: #60a5fa; border: 1px solid rgba(59,130,246,0.35); }
      .ev-badge--c { background: rgba(234,179,8,0.18);  color: #facc15; border: 1px solid rgba(234,179,8,0.35); }
      .ev-badge--d { background: rgba(239,68,68,0.15);  color: #f87171; border: 1px solid rgba(239,68,68,0.30); }

      .lp-empty {
        text-align: center;
        padding: 60px 20px;
        color: var(--color-text-secondary);
      }

      .lp-empty-icon {
        font-size: 40px;
        margin-bottom: 12px;
      }

      /* ═══════════════════════════════════════════════════
         M1 — Stats strip horizontal on mobile
         ═══════════════════════════════════════════════════ */
      @media (max-width: 600px) {
        #lp-stats-row {
          display: flex;
          flex-direction: row;
          gap: 0;
          padding: 6px 12px;
          border-radius: 0;
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
        }

        .lp-stat-box {
          flex: 1;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 4px;
          border: none;
          border-right: 1px solid var(--color-border);
          border-radius: 0;
          background: transparent;
        }

        .lp-stat-box:last-child {
          border-right: none;
        }

        .lp-stat-ring-wrap {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
        }

        .lp-stat-ring-wrap svg {
          width: 28px;
          height: 28px;
        }

        .lp-stat-val {
          font-size: 13px;
          font-weight: 800;
        }

        .lp-stat-lbl {
          display: none;
        }
      }

      /* ═══════════════════════════════════════════════════
         M2 — Filter labels hidden on mobile
         ═══════════════════════════════════════════════════ */
      @media (max-width: 600px) {
        .lp-filter-label {
          display: none;
        }

        .lp-chip {
          padding: 9px 14px;
          font-size: 13px;
          min-height: 38px;
        }
      }

      /* ═══════════════════════════════════════════════════
         M3 — Header compact on mobile
         ═══════════════════════════════════════════════════ */
      @media (max-width: 600px) {
        #lp-title {
          display: none;
        }

        #lp-search-wrap {
          padding-top: 8px;
          padding-bottom: 8px;
        }
      }

      /* ═══════════════════════════════════════════════════
         M4 — Cards mobile overrides
         ═══════════════════════════════════════════════════ */
      @media (max-width: 480px) {
        .lp-card-img-wrap {
          height: 220px;
        }

        .lp-card-price {
          font-size: 22px;
        }

        .lp-card-dose {
          font-size: 12px;
        }

        .lp-btn-detail {
          height: 48px;
          font-size: 14px;
          letter-spacing: 0.01em;
        }

        .lp-btn-fav {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .lp-card-body {
          padding: 12px 14px 14px;
        }

        .lp-card-actions {
          gap: 8px;
        }
      }

      /* ═══════════════════════════════════════════════════
         M5 — Card body redesign for 1 column
         ═══════════════════════════════════════════════════ */
      @media (max-width: 480px) {
        .lp-card-name {
          font-size: 16px;
          font-weight: 800;
        }

        .lp-card-cat {
          font-size: 10px;
          letter-spacing: 0.06em;
        }

        .lp-card-price-area {
          margin-bottom: 12px;
        }

        .lp-card-img-gradient {
          background: linear-gradient(
            to top,
            rgba(5, 6, 10, 0.98) 0%,
            rgba(5, 6, 10, 0.5) 45%,
            transparent 100%
          );
        }
      }

      /* ═══════════════════════════════════════════════════
         M6 — Modal backdrop blur + sticky header
         ═══════════════════════════════════════════════════ */
      @media (max-width: 600px) {
        #lp-modal-overlay {
          backdrop-filter: blur(16px) brightness(0.45);
          -webkit-backdrop-filter: blur(16px) brightness(0.45);
        }
      }

      .lp-modal-sticky-header {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 18px;
        background: var(--color-surface-primary);
        border-bottom: 1px solid var(--color-border);
        opacity: 0;
        transform: translateY(-100%);
        transition: opacity 180ms ease, transform 180ms ease;
        pointer-events: none;
      }

      .lp-modal-sticky-header.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .lp-modal-sticky-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: calc(100% - 48px);
      }

      .lp-modal-sticky-close {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        flex-shrink: 0;
      }

      /* ═══════════════════════════════════════════════════
         M8 — Mobile search overlay
         ═══════════════════════════════════════════════════ */
      .lp-search-overlay {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: var(--color-bg-primary, #05060a);
        display: flex;
        flex-direction: column;
        padding: env(safe-area-inset-top, 0) 0 0;
        animation: lp-overlay-in 200ms ease;
      }

      @keyframes lp-overlay-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .lp-search-overlay-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px 10px;
        border-bottom: 1px solid var(--color-border);
      }

      .lp-search-overlay-input {
        flex: 1;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 16px;
        color: var(--color-text-primary);
        outline: none;
      }

      .lp-search-overlay-input:focus {
        border-color: var(--color-brand);
      }

      .lp-search-overlay-cancel {
        font-size: 14px;
        color: var(--color-brand);
        background: none;
        border: none;
        padding: 8px 4px;
        cursor: pointer;
        white-space: nowrap;
        font-weight: 600;
      }

      .lp-search-overlay-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .lp-search-history-title {
        font-size: 11px;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 10px;
      }

      .lp-search-history-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border);
        font-size: 14px;
        color: var(--color-text-secondary);
        cursor: pointer;
        background: none;
        border-left: none;
        border-right: none;
        border-top: none;
        width: 100%;
        text-align: left;
      }

      .lp-search-history-icon {
        color: var(--color-text-muted);
        font-size: 14px;
        flex-shrink: 0;
      }

      @media (min-width: 600px) {
        .lp-search-overlay { display: none !important; }
      }

      /* ═══════════════════════════════════════════════════
         M9 — Scroll-to-top FAB
         ═══════════════════════════════════════════════════ */
      #lp-fab-top {
        position: fixed;
        bottom: calc(72px + env(safe-area-inset-bottom, 0px));
        right: 16px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        color: var(--color-text-primary);
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 50;
        opacity: 0;
        transform: translateY(20px) scale(0.85);
        transition: opacity 220ms ease, transform 220ms ease;
        pointer-events: none;
      }

      #lp-fab-top.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      /* ═══════════════════════════════════════════════════
         M10 — Typography scale mobile
         ═══════════════════════════════════════════════════ */
      @media (max-width: 600px) {
        .lp-card-name     { font-size: 15px; }
        .lp-card-category { font-size: 10px; letter-spacing: 0.05em; }
        .lp-modal-title   { font-size: 20px; }
        .lp-seg-tab       { font-size: 13px; padding: 8px 10px; }
        .lp-dose-bar-value { font-size: 22px; }
        .lp-price-row-store  { font-size: 13px; }
        .lp-price-row-amount { font-size: 16px; }
      }

      /* ═══════════════════════════════════════════════════
         M12 — Filter section visual polish
         ═══════════════════════════════════════════════════ */
      @media (max-width: 600px) {
        #lp-filters {
          padding: 10px 12px 6px;
          gap: 8px;
          border-bottom: 1px solid var(--color-border);
        }

        .lp-filter-row {
          gap: 8px;
          padding-bottom: 4px;
          padding-top: 2px;
        }
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
            <span class="lp-filter-label" style="flex-shrink: 0; font-size: 11px; font-weight: 600; color: var(--color-text-muted);">Categoria</span>
            ${CATEGORIES.map(c => `<button class="lp-chip${c === 'Todos' ? ' active' : ''}" data-cat="${c}" aria-pressed="${c === 'Todos' ? 'true' : 'false'}">${c}</button>`).join('')}
          </div>
          <div class="lp-filter-row" id="lp-obj-row">
            <span class="lp-filter-label" style="flex-shrink: 0; font-size: 11px; font-weight: 600; color: var(--color-text-muted);">Objetivo</span>
            ${OBJECTIVES.map(o => `<button class="lp-chip" data-obj="${o}" aria-pressed="false">${o}</button>`).join('')}
          </div>
        </div>

        <div id="lp-body">
          <div id="lp-grid" data-component="supplement-grid" role="list"></div>
        </div>
      </div>
    `;
  }
}
