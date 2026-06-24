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

    // Deep-link: /suplemento/:slug opens the catalog and auto-opens the detail
    // modal for that supplement once data has loaded. Invalid slugs no-op.
    this._openSlug = params.slug || null;

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

    // Fetch catalog AND static prices in parallel — prices.json is always available
    // so there is no reason to delay it behind the catalog fetch or an API call.
    const catalogPromise = fetch('/data/supplements-db.json', { signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));

    const staticPricesPromise = fetch('/data/prices.json', { signal })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null); // never block the catalog render if prices fail

    Promise.all([catalogPromise, identityService.isReady(), staticPricesPromise])
      .then(([catalogData, , staticPrices]) => {
        if (signal.aborted) return;

        const supplements = Array.isArray(catalogData) ? catalogData : (catalogData.supplements ?? SUPPLEMENTS_DB);

        // Apply static prices immediately (already loaded in parallel)
        if (staticPrices) {
          this._prices = staticPrices;
        }

        // Initialize search first (without triggering grid update) to compute the
        // initial filtered list, then pass it directly to the grid so VirtualScroller
        // is created with real data on the very first render — with prices already set.
        this._search.init(this._prices, supplements, /* suppressGridUpdate */ true);
        const initialFiltered = this._search.getFiltered();
        this._grid.init(initialFiltered, this._prices);
        this._modal.init(supplements, this._prices);

        // Deep-link open (no-op if slug is missing or unknown)
        if (this._openSlug) this._modal.open(this._openSlug);

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

        // Optional: try the dynamic API to get fresher/richer price data.
        // If it returns valid data it silently patches the already-displayed prices.
        // The user never waits for this — prices are already correct from the static file.
        const supplementIds = supplements.map(s => s.id).join(',');
        fetch(`/api/supplements/prices?ids=${encodeURIComponent(supplementIds)}`, { signal })
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
          .then(apiResponse => {
            if (signal.aborted) return;

            const prices = {};
            if (apiResponse.success && apiResponse.data) {
              Object.entries(apiResponse.data).forEach(([id, supplement]) => {
                if (supplement && supplement.prices) {
                  const stores = {};
                  ['amazon', 'mercadolivre', 'shopee'].forEach(source => {
                    const sourceData = supplement.prices[source];
                    // Only surface a store when it has a real (affiliate) URL.
                    // Never fabricate a search link — that would be uncredited and
                    // often broken, and would overwrite the good static price link.
                    if (sourceData && sourceData.url) {
                      stores[source] = {
                        price: sourceData.price,
                        qty: sourceData.qty,
                        unit: sourceData.unit,
                        pricePerUnit: sourceData.pricePerUnit,
                        url: sourceData.url,
                        label: sourceData.label ?? (source.charAt(0).toUpperCase() + source.slice(1)),
                        saving: sourceData.saving ?? 0
                      };
                    }
                  });
                  // Only overwrite static entry if API returned at least one store
                  if (Object.keys(stores).length > 0) {
                    prices[id] = stores;
                  }
                }
              });
            }

            // Only update if the API returned real data (may have fresher prices).
            // Merge over static prices — never discard static entries not in the API response.
            // Do NOT patch existing card DOM elements: prices.json is already correct and
            // any visible difference would cause a jarring price-change flash in front of
            // the user. The updated prices object is used for any future renders (filter
            // changes, virtual-scroll reveals, modal opens).
            if (Object.keys(prices).length > 0) {
              const merged = { ...this._prices, ...prices };
              this._prices = merged;
              this._search._prices = merged;
              this._grid._prices = merged;
              this._modal._prices = merged;
            }
          })
          .catch(err => {
            // API failed — static prices already displayed, nothing to do
            if (err.name !== 'AbortError') {
              logger.warn('[ListPage] Dynamic API prices unavailable (static prices in use):', err.message);
            }
          });
      })
      .catch(err => {
        if (err.name === 'AbortError' || signal.aborted) return;
        logger.error('[ListPage] Catalog fetch failed:', err.message);

        // Fall back to bundled data so the page still works
        this._search.init(null, SUPPLEMENTS_DB, /* suppressGridUpdate */ true);
        const fallbackFiltered = this._search.getFiltered();
        this._grid.init(fallbackFiltered, null);
        this._modal.init(SUPPLEMENTS_DB, null);

        // Deep-link open also works against bundled fallback data
        if (this._openSlug) this._modal.open(this._openSlug);


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
