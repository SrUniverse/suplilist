/**
 * ListPageGrid — Grid rendering, virtual scrolling, and card display
 * Extracted from ListPage for separation of concerns
 */

import { stateManager } from '../../state/state-manager.js';
import { escapeHtml } from '../../utils/escape.js';
import { VirtualScroller } from '../../core/virtual-scroller.js';
import { getImageObjectPosition } from './image-focus.js';
import { PAGE_SIZE as CONST_PAGE_SIZE } from '../../config/constants.js';
import {
  getFavoritesFromState, toggleFavorite, getMaxSaving, getPriceLabel, getDosePrice, formatPrice
} from './list-page-utils.js';

const PAGE_SIZE = CONST_PAGE_SIZE;

/**
 * ListPageGrid — Manages supplement grid rendering, virtual scrolling, and card display
 */
export class ListPageGrid {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks; // { onModalOpen, onCheckout, onCardStateRefresh }

    // Grid state
    this._filtered = [];
    this._prices = null;
    this._scroller = null;
    this._page = 0;
    this._observer = null;
    this._resizeHandler = null;
    this._resizeTimer = null;
  }

  /**
   * Initialize grid with filtered items and prices.
   * @param {Array} filtered - Filtered supplement items
   * @param {Object} [prices] - Prices from prices.json
   * @returns {void}
   */
  init(filtered, prices) {
    this._filtered = filtered;
    this._prices = prices;
    this._renderGrid();
    this._initInfiniteScroll();
    this._attachGridListeners();

    // Rebuild grid on window resize
    this._resizeHandler = () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this._renderGrid(), 150);
    };
    window.addEventListener('resize', this._resizeHandler, { passive: true });

    // Recalcula colunas quando a LARGURA REAL do grid muda — cobre o caso em que
    // no primeiro render (SPA) o layout ainda não assentou (largura 0/errada) e o
    // window 'resize' nunca dispara, deixando os cards com largura errada (imagem
    // cortada) até um reload. Também trata colapso/expansão da sidebar. Só
    // re-renderiza quando o nº de colunas realmente muda (evita loop/thrash).
    this._lastCols = this._getColumns();
    if (typeof ResizeObserver !== 'undefined') {
      const grid = this.container.querySelector('#lp-grid');
      if (grid) {
        this._gridResizeObserver = new ResizeObserver(() => {
          const cols = this._getColumns();
          if (cols !== this._lastCols) {
            this._lastCols = cols;
            this._renderGrid();
          }
        });
        this._gridResizeObserver.observe(grid);
      }
    }
  }

  /**
   * Determine number of grid columns based on viewport.
   * @returns {number} Number of columns
   */
  _getColumns() {
    // Largura REAL disponível para os cards. Mede o próprio grid (ou o container)
    // via getBoundingClientRect — mais confiável que offsetWidth (fracionário e
    // != 0 quando já houve layout). window.innerWidth é só o último recurso:
    // usá-lo cedo superdimensiona (ignora a sidebar do desktop) → colunas a mais
    // → cards estreitos → imagem cortada dos lados até um reload.
    const grid = this.container.querySelector('#lp-grid');
    const w = (grid && grid.getBoundingClientRect().width)
      || this.container.getBoundingClientRect().width
      || window.innerWidth;
    if (w < 480) return 1;
    if (w < 900) return 3;
    return 4;
  }

  /**
   * Update filtered items and re-render grid.
   * @param {Array} filtered - New filtered items
   * @returns {void}
   */
  updateFiltered(filtered) {
    this._filtered = filtered;
    const scrollEl = document.getElementById('lp-body');
    if (scrollEl) scrollEl.scrollTop = 0;
    this._renderGrid();
  }

  /**
   * Update prices and patch existing cards.
   * Used when prices.json finishes loading after mount.
   * @param {Object} prices - Prices data
   * @returns {void}
   */
  updatePrices(prices) {
    this._prices = prices;
    this._patchCardPrices();
  }

  /**
   * Render filtered supplement cards into the grid using VirtualScroller.
   *
   * If no results, displays empty state (🔍 icon + helpful text).
   * Otherwise creates VirtualScroller with:
   * - Items: this._filtered (post-filter array)
   * - Renderer: _renderSupplementCard() for each item
   * - Item height: 405px (card dimensions)
   * - Buffer: 8 items before/after viewport
   * - Responsive columns: 2 mobile, 3 tablet, 4 desktop
   *
   * Resets pagination (this._page = 1) and unmounts old scroller if it exists.
   *
   * @returns {void}
   */
  _renderGrid() {
    const grid = this.container.querySelector('#lp-grid');
    if (!grid) return;

    if (!this._filtered.length) {
      grid.innerHTML = `
        <div class="lp-empty">
          <div class="lp-empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
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

    const cols = this._getColumns();
    // Card height must fit: image (190px desktop / 220px mobile) + body padding +
    // 2-line description (≈35px) + price area (≈36px) + actions (44px) + gaps.
    // Minimum: 351px desktop, 381px mobile. Add headroom for safety.
    const cardHeight = cols === 1 ? 395 : 365;

    // Create virtual scroller with filtered items
    this._scroller = new VirtualScroller(
      grid,
      this._filtered,
      (item, index) => this._renderSupplementCard(item, index),
      {
        itemHeight: cardHeight,
        bufferSize: 8,
        columns: cols,
        gap: 12,
        scrollElement: document.getElementById('lp-body')
      }
    );

    this._scroller.mount();
    this._page = 1;
  }

  /**
   * Render a single supplement card HTML for virtual scroller.
   *
   * Returns HTML string with:
   * - Top badge: savings amount (if available) or evidence level
   * - Image with lazy loading + fallback on 404
   * - Evidence level badge (EV. A/B/C/D with color coding)
   * - Name, category, first benefit (description)
   * - Price row: monthly cost + per-dose price estimate
   * - Heart icon (favorite toggle) with animation
   * - "Ver Preços" button
   *
   * Affiliate pricing: Uses live prices from this._prices (live fetch from prices.json).
   * If not loaded, falls back to pricePerGram estimates from database.
   *
   * Special case: If item.isAd=true, delegates to _renderSponsoredAdCard().
   *
   * @param {Object} item - Supplement item { id, name, category, benefits, evidenceLevel, image, ... }
   * @param {number} [index=0] - Position in grid for lazy loading optimization
   * @returns {string} HTML string for the card (safe to insert with innerHTML)
   */
  _renderSupplementCard(item, index) {
    if (item.isAd) return this._renderSponsoredAdCard();
    return this._renderCardHTML(item, index);
  }

  /**
   * Build HTML for a supplement card.
   * @param {Object} item - Supplement item
   * @param {number} [index=0] - Grid position
   * @returns {string} HTML string
   * @private
   */
  _renderCardHTML(item, index = 0) {
    const CATEGORY_COLORS = {
      'Proteínas':   { hue: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
      'Creatinas':   { hue: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
      'Vitaminas':   { hue: '#FBBF24', bg: 'rgba(251,191,36,0.15)' },
      'Aminoácidos': { hue: '#34D399', bg: 'rgba(52,211,153,0.15)' },
      'Cognitivos':  { hue: '#F472B6', bg: 'rgba(244,114,182,0.15)' },
      'Performance': { hue: '#FB923C', bg: 'rgba(251,146,60,0.15)' },
      'Adaptógenos': { hue: '#A3E635', bg: 'rgba(163,230,53,0.15)' },
      'Minerais':    { hue: '#22D3EE', bg: 'rgba(34,211,238,0.15)' },
    };
    const catColor = CATEGORY_COLORS[item.category] ?? null;
    const catStyle = catColor ? ` style="--cat-color: ${catColor.hue}; --cat-bg: ${catColor.bg}"` : '';

    const objPos = getImageObjectPosition(item.category);

    const favs = getFavoritesFromState();
    const isFav = favs.has(item.id);
    const ev = item.evidenceLevel;
    const img = item.image || `/assets/${item.id.replace(/-/g, '_')}.png`;
    const isAboveFold = index < 8;
    const loadingAttr = isAboveFold ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';

    const saving = getMaxSaving(item, this._prices);
    const priceInfo = getPriceLabel(item, this._prices);
    const doseStr = getDosePrice(item, this._prices);

    const evBadge = ev
      ? `<span class="lp-card-ev-pill ev-badge ev-badge--${String(ev).toLowerCase()}">EV. ${escapeHtml(String(ev))}</span>`
      : '';

    const savingsBadge = saving
      ? `<span class="lp-card-savings-pill">−R$ ${escapeHtml(String(saving))}</span>`
      : '';

    return `
      <div class="lp-card" role="listitem" data-id="${item.id}" data-category="${escapeHtml(item.category ?? '')}" data-testid="catalog-card-${escapeHtml(item.id)}"${catStyle}>
        <!-- Full-bleed image with gradient overlay -->
        <div class="lp-card-img-wrap">
          <img class="lp-card-img"
            src="${escapeHtml(img)}"
            alt="${escapeHtml(item.name)}"
            style="object-position: ${objPos}"
            ${loadingAttr}
            onerror="this.parentElement.classList.add('img-error'); this.remove();"
          />
          <div class="lp-card-img-gradient"></div>
          ${evBadge}
          ${savingsBadge}
          <div class="lp-card-overlay-footer">
            <p class="lp-card-name">${escapeHtml(item.name)}</p>
            ${item.category ? `<p class="lp-card-cat">${escapeHtml(item.category)}</p>` : ''}
          </div>
        </div>
        <!-- Card body below image -->
        <div class="lp-card-body">
          ${item.benefits && item.benefits.length ? `<p class="lp-card-desc">${escapeHtml(item.benefits[0])}</p>` : ''}
          <div class="lp-card-price-area">
            <span class="lp-card-price">${formatPrice(priceInfo.price)}</span>
            <span class="lp-card-dose">${doseStr}</span>
          </div>
          <div class="lp-card-actions">
            <button
              class="lp-btn-fav${isFav ? ' faved' : ''}"
              data-action="toggle-fav"
              data-id="${item.id}"
              aria-label="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
              type="button"
              data-testid="catalog-fav-btn-${escapeHtml(item.id)}">
              ${isFav ? '♥' : '♡'}
            </button>
            <button class="lp-btn-detail" data-action="open-modal" data-id="${item.id}" type="button">
              Ver Detalhes →
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
   * - "PRO" label
   * - Heading: "Histórico Avançado + Sem Anúncios"
   * - Copy: gráficos, relatórios Excel, experiência limpa
   * - "Ativar PRO" button → triggers upgrade-now action
   *
   * Styled with gradient background, special border, centered layout.
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
          <p style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #A78BFA; margin: 0 0 10px 0;">PRO</p>
          <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 16px; margin: 0 0 6px 0; color: #F1F5F9; letter-spacing: -0.02em; line-height: 1.2;">Histórico Avançado + Sem Anúncios</p>
          <p style="font-size: 12px; color: #A8B0C0; margin: 0 0 16px 0; line-height: 1.5;">Gráficos de adesão, relatórios Excel e experiência limpa.</p>
          <button class="lp-upgrade-btn" style="width: 100%; height: 38px; font-size: 12px; font-weight: 700; background: var(--color-brand, #8B5CF6); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: inherit; letter-spacing: 0.01em;" data-action="upgrade-now">Ativar PRO</button>
        </div>
      </div>
    `;
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
    // VirtualScroller handles all pagination when active — legacy append disabled
    if (this._scroller) return;
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
   *
   * @param {number} from - Start index in this._filtered
   * @param {number} to - End index (exclusive)
   * @returns {DocumentFragment} Fragment with 0+ supplement cards
   * @private
   */
  _buildFragment(from, to) {
    const frag = document.createDocumentFragment();
    const wrapper = document.createElement('div');

    this._filtered.slice(from, to).forEach(item => {
      wrapper.innerHTML = this._renderCardHTML(item);
      frag.appendChild(wrapper.firstElementChild);
    });
    return frag;
  }

  /**
   * Initialize IntersectionObserver for infinite scroll pagination.
   * Watches #lp-sentinel element and calls _loadMore() when visible.
   *
   * @returns {void}
   * @private
   */
  _initInfiniteScroll() {
    const sentinel = this.container.querySelector('#lp-sentinel');
    if (!sentinel || !('IntersectionObserver' in window)) return;

    this._observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) this._loadMore();
    }, { rootMargin: '100px' });

    this._observer.observe(sentinel);
  }

  /**
   * Refresh card states (favorites, stack membership) without full re-render.
   * Called when state changes (e.g., favorite toggled).
   *
   * Queries all cards, updates favorite button classes and aria-labels.
   * If modal is currently open, updates the modal card state too.
   *
   * @returns {void}
   */
  _refreshCardStates() {
    const favs = getFavoritesFromState();
    const _stack = stateManager.stack || [];

    this.container.querySelectorAll('.lp-card').forEach(card => {
      const id = card.dataset.id;
      if (!id) return;

      // Update favorite button
      const favBtn = card.querySelector('[data-action="toggle-fav"]');
      if (favBtn) {
        const isFav = favs.has(id);
        favBtn.classList.toggle('faved', isFav);
        favBtn.textContent = isFav ? '♥' : '♡';
        favBtn.setAttribute('aria-label', isFav ? 'Remover dos favoritos' : 'Favoritar');
      }
    });

    // Notify parent to refresh modal if open
    if (this.callbacks?.onCardStateRefresh) {
      this.callbacks.onCardStateRefresh();
    }
  }

  /**
   * Patch existing card prices when prices.json finishes loading.
   * Updates price display in cards without full re-render.
   *
   * @returns {void}
   * @private
   */
  _patchCardPrices() {
    this.container.querySelectorAll('.lp-card').forEach(card => {
      const id = card.dataset.id;
      if (!id || id === 'sponsored-ad') return;

      const item = this._filtered.find(s => s.id === id);
      if (!item) return;

      // Update price
      const priceEl = card.querySelector('.lp-card-price');
      if (priceEl) {
        const priceInfo = getPriceLabel(item, this._prices);
        priceEl.textContent = formatPrice(priceInfo.price);
      }

      // Update dose price
      const doseEl = card.querySelector('.lp-card-dose');
      if (doseEl) {
        doseEl.textContent = getDosePrice(item, this._prices);
      }

      // Add savings badge if available
      const saving = getMaxSaving(item, this._prices);
      if (saving && !card.querySelector('.lp-card-savings-pill')) {
        const imgWrap = card.querySelector('.lp-card-img-wrap');
        if (imgWrap) {
          const badge = document.createElement('span');
          badge.className = 'lp-card-savings-pill';
          badge.textContent = `−R$ ${saving}`;
          imgWrap.appendChild(badge);
        }
      }
    });
  }

  /**
   * Attach grid event listeners (favorite toggle, modal open, upgrade click).
   * Uses event delegation on #lp-grid for efficiency.
   *
   * @returns {void}
   * @private
   */
  _attachGridListeners() {
    const grid = this.container.querySelector('#lp-grid');
    if (!grid) return;

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
        if (this.callbacks?.onModalOpen) {
          this.callbacks.onModalOpen(verBtn.dataset.id);
        }
        return;
      }

      const upgradeBtn = e.target.closest('[data-action="upgrade-now"]');
      if (upgradeBtn) {
        e.stopPropagation();
        if (this.callbacks?.onCheckout) {
          this.callbacks.onCheckout();
        }
        return;
      }

      // Open modal on card click
      const card = e.target.closest('.lp-card');
      if (card) {
        if (card.dataset.id === 'sponsored-ad') {
          e.stopPropagation();
          if (this.callbacks?.onCheckout) {
            this.callbacks.onCheckout();
          }
          return;
        }
        if (card.dataset.id) {
          if (this.callbacks?.onModalOpen) {
            this.callbacks.onModalOpen(card.dataset.id);
          }
        }
      }
    });
  }

  /**
   * Clean up grid resources.
   * Called during unmount() of parent.
   *
   * @returns {void}
   */
  unmount() {
    if (this._scroller) {
      this._scroller.unmount();
      this._scroller = null;
    }
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._gridResizeObserver) {
      this._gridResizeObserver.disconnect();
      this._gridResizeObserver = null;
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    clearTimeout(this._resizeTimer);
  }
}
