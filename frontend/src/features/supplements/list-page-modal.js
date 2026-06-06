/**
 * ListPageModal — Modal detail view and checkout management
 * Extracted from ListPage for separation of concerns
 */

import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { escapeHtml } from '../../utils/escape.js';
import { EVIDENCE_COLORS } from '../../utils/evidence.js';
import affiliateEngine from '../../monetization/affiliate-engine.js';
import { CheckoutModal } from '../premium/checkout-modal.js';
import { sanitizeUrl, isProductUrl, formatPrice, getPriceLabel, getEffectiveCost } from './list-page-utils.js';

/**
 * ListPageModal — Manages supplement detail modal and checkout
 */
export class ListPageModal {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks; // { onCardStateRefresh, onCheckout }

    // Modal state
    this._modalOpen = null;
    this._scrollLockStack = []; // Stack of scroll lock sources
    this._boundKeydown = this._onKeydown.bind(this);
    this._allItems = [];
    this._prices = null;
  }

  /**
   * Initialize modal with items and prices.
   * @param {Array} allItems - All supplement items
   * @param {Object|null} prices - Prices from prices.json
   * @returns {void}
   */
  init(allItems, prices) {
    this._allItems = Array.isArray(allItems) ? allItems : [];
    this._prices = prices;
    document.addEventListener('keydown', this._boundKeydown);
  }

  /**
   * Check if modal is currently open.
   * @returns {boolean} True if modal is visible
   */
  isOpen() {
    return !!this._modalOpen;
  }

  /**
   * Open the supplement detail modal.
   *
   * Displays modal with:
   * - Image, name, category, evidence level
   * - Comparison of prices across stores (Amazon, Mercado Livre, Shopee)
   * - Tabbed info: Dose Clínica, Benefícios, Segurança
   * - "Adicionar ao Stack" button
   *
   * Scroll lock: disables body scroll via _pushScrollLock('modal').
   * Events: "add-to-stack" dispatches ACTION to stateManager.
   *
   * @param {string} supplementId - ID of supplement to display
   * @returns {void}
   */
  open(supplementId) {
    this.close();
    const item = this._allItems.find(s => s.id === supplementId);
    if (!item) return;
    this._modalOpen = supplementId;

    const ev = item.evidenceLevel;
    const _evStyle = EVIDENCE_COLORS[ev] ?? EVIDENCE_COLORS['C'];
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

    // Warnings and side effects
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
              <img class="lp-modal-img skeleton-loading" src="${img}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" onload="this.classList.remove('skeleton-loading'); this.parentElement.style.animation='none'; this.parentElement.style.background='none';" onerror="this.classList.remove('skeleton-loading'); this.parentElement.style.animation='none'; this.parentElement.style.background='none'; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiMyMjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzU1NSIgZm9udC1zaXplPSIyOCI+8JOEijwvdGV4dD48L3N2Zz4='" />
            </div>
            <p class="lp-modal-img-col-name">${escapeHtml(item.name)}</p>
            <p class="lp-modal-img-col-cat">${escapeHtml(item.category ?? '')}</p>
            ${ev ? `<span class="ev-badge ev-badge--${String(ev).toLowerCase()}">Evidência ${escapeHtml(String(ev))}</span>` : ''}
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.5;margin:4px 0 0;">${escapeHtml(item.benefits?.join(' · ') ?? '')}</p>
          </div>

          <div class="lp-modal-info-col">
            <div>
              <h3>Comparação de Preços</h3>
              <div class="lp-price-cards">${priceCardsHtml}</div>
            </div>

            <div>
              <div class="lp-tabs">
                <button class="lp-tab active" data-tab="dose" role="tab" aria-selected="true" tabindex="0">Dose Clínica</button>
                <button class="lp-tab" data-tab="benefits" role="tab" aria-selected="false" tabindex="-1">Benefícios</button>
                <button class="lp-tab" data-tab="safety" role="tab" aria-selected="false" tabindex="-1">Segurança</button>
              </div>
              <div class="lp-tab-content">
                <div class="lp-tab-pane active" id="lp-tab-dose">
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Dose de manutenção:</strong> ${escapeHtml(String(item.dosage?.maintenance ?? '—'))} ${escapeHtml(item.dosage?.unit ?? '')}</p>
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Limite superior:</strong> ${escapeHtml(String(item.dosage?.upperLimit ?? '—'))} ${escapeHtml(item.dosage?.unit ?? '')}</p>
                  <p style="margin:0;"><strong style="color:var(--color-text-primary);">Quando tomar:</strong> ${escapeHtml(item.dosage?.timing ?? '—')}</p>
                </div>
                <div class="lp-tab-pane" id="lp-tab-benefits">
                  <ul>${(item.benefits || []).map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
                </div>
                <div class="lp-tab-pane" id="lp-tab-safety">
                  <p style="font-weight:600;color:var(--color-text-secondary);margin:0 0 8px;">Avisos</p>
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
    this._pushScrollLock('modal');

    // Tab switching
    const tabs = [...overlay.querySelectorAll('.lp-tab')];
    const activateTab = (tab) => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.tabIndex = -1;
      });
      overlay.querySelectorAll('.lp-tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.tabIndex = 0;
      tab.focus();
      const pane = overlay.querySelector(`#lp-tab-${tab.dataset.tab}`);
      if (pane) pane.classList.add('active');
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activateTab(tab));
      tab.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); activateTab(tabs[(i + 1) % tabs.length]); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); activateTab(tabs[(i - 1 + tabs.length) % tabs.length]); }
      });
    });

    // Close button and backdrop click
    overlay.querySelector('#lp-modal-close').addEventListener('click', () => this.close());
    overlay.addEventListener('click', e => { if (e.target === overlay) this.close(); });

    // Track affiliate clicks
    overlay.addEventListener('click', e => {
      const affLink = e.target.closest('[data-aff-mp]');
      if (affLink) affiliateEngine.trackClick(affLink.dataset.affId, affLink.dataset.affMp);
    });

    // Disable add button when offline
    const isOffline = stateManager.state?.ui?.isOffline === true;
    const addBtn = overlay.querySelector('#lp-modal-add-btn');
    if (isOffline) {
      addBtn.disabled = true;
      addBtn.title = 'Indisponível no modo offline';
      addBtn.style.opacity = '0.5';
      addBtn.style.cursor = 'not-allowed';
    }

    addBtn.addEventListener('click', e => {
      e.stopPropagation();

      // Guard: offline mode — no writes allowed
      if (stateManager.state?.ui?.isOffline === true) {
        return;
      }

      // Guard: unauthenticated — redirect to login instead of a 401
      const isAuthenticated = stateManager.state?.user?.isAuthenticated === true;
      if (!isAuthenticated) {
        this.close();
        import('../../core/event-bus.js').then(({ eventBus, EVENTS }) => {
          eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
        });
        return;
      }

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
      if (this.callbacks?.onCardStateRefresh) {
        this.callbacks.onCardStateRefresh();
      }
    });
  }

  /**
   * Close the supplement detail modal.
   * Removes overlay from DOM, pops scroll lock, clears _modalOpen.
   * Safe to call multiple times (no-op if modal not open).
   *
   * @returns {void}
   */
  close() {
    const existing = document.getElementById('lp-modal-overlay');
    if (existing) {
      existing.remove();
      this._popScrollLock('modal');
    }
    this._modalOpen = null;
  }

  /**
   * Open the checkout modal for premium tier upgrade.
   * Delegates to CheckoutModal.show() with tier='pro'.
   *
   * @returns {void}
   */
  openCheckout() {
    CheckoutModal.show({ tier: 'pro' });
  }

  /**
   * Handle keyboard events (ESC to close modal).
   * Bound during init(), unbound during unmount().
   *
   * @param {KeyboardEvent} e - Keyboard event
   * @returns {void}
   * @private
   */
  _onKeydown(e) {
    if (e.key === 'Escape' && this._modalOpen) this.close();
  }

  /**
   * Push scroll lock source onto stack.
   * When stack is non-empty, body scroll is disabled.
   *
   * @param {string} [source='modal'] - Lock source identifier
   * @returns {void}
   * @private
   */
  _pushScrollLock(source = 'modal') {
    if (this._scrollLockStack.length === 0) {
      document.body.style.overflow = 'hidden';
    }
    this._scrollLockStack.push(source);
  }

  /**
   * Pop scroll lock source from stack.
   * If stack becomes empty, re-enables body scroll.
   *
   * @param {string} [source='modal'] - Lock source identifier to remove
   * @returns {void}
   * @private
   */
  _popScrollLock(source = 'modal') {
    const idx = this._scrollLockStack.lastIndexOf(source);
    if (idx >= 0) {
      this._scrollLockStack.splice(idx, 1);
    }
    if (this._scrollLockStack.length === 0) {
      document.body.style.overflow = '';
    }
  }

  /**
   * Clean up modal resources.
   * Called during unmount() of parent.
   *
   * @returns {void}
   */
  unmount() {
    this.close();
    document.removeEventListener('keydown', this._boundKeydown);
  }
}
