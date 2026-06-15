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
import './list-page.css';

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
