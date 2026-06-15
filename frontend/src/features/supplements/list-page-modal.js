/**
 * ListPageModal — Modal detail view and checkout management
 * Extracted from ListPage for separation of concerns
 */

import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { escapeHtml } from '../../utils/escape.js';
import affiliateEngine from '../../monetization/affiliate-engine.js';
import { CheckoutModal } from '../premium/checkout-modal.js';
import { sanitizeUrl, isProductUrl, formatPrice, getPriceLabel, getEffectiveCost } from './list-page-utils.js';
import { SchemaManager } from '../../platform/schema-manager.js';

/**
 * ListPageModal — Manages supplement detail modal and checkout
 */
export class ListPageModal {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks; // { onCardStateRefresh, onCheckout }

    // Modal state
    this._modalOpen = null;
    this._currentIndex = -1;
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
    this._currentIndex = this._allItems.findIndex(s => s.id === supplementId);

    // Inject Product schema for SEO crawlers and social sharing
    SchemaManager.insertSchema(SchemaManager.createProductSchema(item));

    const ev = item.evidenceLevel;
    const evLabels = { A: 'Evidência Robusta', B: 'Evidência Moderada', C: 'Evidência Limitada', D: 'Evidência Preliminar' };
    const evLabel = ev ? (evLabels[String(ev).toUpperCase()] ?? `Evidência ${ev}`) : null;
    const studiesCount = Array.isArray(item.studies) && item.studies.length > 0 ? item.studies.length : 0;
    const img = item.image || `/assets/${item.id.replace(/-/g, '_')}.png`;
    const stack = stateManager.stack ?? [];
    const inStack = stack.some(s => s.supplementId === item.id);

    // ── Price rows (Stripe-inspired table format) ─────────────────────────
    const affLinks = affiliateEngine.getLinks(item.name, item.id);
    let priceRowsHtml = '';
    const priceKey = item.id;
    if (this._prices && this._prices[priceKey]) {
      const stores = this._prices[priceKey];
      const bestStoreKey = Object.entries(stores).reduce((best, [k, s]) =>
        getEffectiveCost(s) < getEffectiveCost(stores[best]) ? k : best,
        Object.keys(stores)[0]
      );
      priceRowsHtml = Object.entries(stores).map(([storeKey, store]) => {
        const isBest = storeKey === bestStoreKey;
        const qtyLabel = store.qty && store.unit
          ? `${store.qty}${store.unit} · R$ ${(store.pricePerUnit ?? store.price).toFixed(2).replace('.', ',')}/${store.unit}`
          : '';
        return `
        <div class="lp-price-row${isBest ? ' lp-price-row--best' : ''}">
          <div class="lp-price-row-meta">
            <span class="lp-price-row-store">${escapeHtml(String(store.label ?? storeKey))}</span>
            ${isBest ? '<span class="lp-price-row-best-tag">Melhor custo</span>' : ''}
            ${qtyLabel ? `<span class="lp-price-row-qty">${escapeHtml(qtyLabel)}</span>` : ''}
          </div>
          <div class="lp-price-row-right">
            <span class="lp-price-row-amount">${formatPrice(store.price)}</span>
            ${store.saving ? `<span class="lp-price-row-saving">−R$&nbsp;${escapeHtml(String(store.saving))}</span>` : ''}
            <a class="lp-price-row-link"
               href="${sanitizeUrl(isProductUrl(store.url) ? store.url : affLinks[storeKey])}"
               target="_blank"
               rel="noopener noreferrer"
               data-aff-id="${escapeHtml(item.id)}"
               data-aff-mp="${escapeHtml(storeKey)}">Ver →</a>
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
      priceRowsHtml = MP_LIST.map(({ key, label }) => `
        <div class="lp-price-row">
          <div class="lp-price-row-meta">
            <span class="lp-price-row-store">${escapeHtml(label)}</span>
          </div>
          <div class="lp-price-row-right">
            <span class="lp-price-row-amount">${formatPrice(priceInfo.price)}</span>
            <a class="lp-price-row-link"
               href="${sanitizeUrl(affLinks[key])}"
               target="_blank"
               rel="noopener noreferrer"
               data-aff-id="${escapeHtml(item.id)}"
               data-aff-mp="${escapeHtml(key)}">Ver →</a>
          </div>
        </div>
      `).join('');
    }

    // ── Tab content ────────────────────────────────────────────────────────
    const warnings = item.warnings?.length
      ? `<ul class="lp-info-list">${item.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
      : '<p class="lp-info-empty">Nenhum aviso registrado.</p>';
    const sideEffects = item.sideEffects?.length
      ? `<p class="lp-info-subtitle">Efeitos Colaterais</p><ul class="lp-info-list">${item.sideEffects.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
      : '';

    // ── Overlay ────────────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'lp-modal-overlay';
    overlay.setAttribute('role', 'presentation');
    overlay.innerHTML = `
      <div id="lp-modal-box" role="dialog" aria-modal="true" aria-labelledby="lp-modal-title">

        <!-- Drag handle (mobile swipe hint) -->
        <div class="lp-modal-drag-handle" aria-hidden="true"></div>

        <!-- Hero image with gradient overlay -->
        <div class="lp-modal-hero">
          <img class="lp-modal-hero-img" src="${escapeHtml(img)}"
            alt="${escapeHtml(item.name)}"
            loading="lazy" decoding="async"
            onerror="this.parentElement.classList.add('lp-modal-hero--error'); this.remove();" />
          <div class="lp-modal-hero-gradient" aria-hidden="true"></div>
          <button id="lp-modal-close" class="lp-modal-close-btn" aria-label="Fechar modal" type="button">✕</button>
          ${this._allItems.length > 1 ? `
          <div class="lp-modal-nav" aria-label="Navegar suplementos">
            <button class="lp-modal-nav-btn lp-modal-prev" aria-label="Suplemento anterior" type="button" ${this._currentIndex <= 0 ? 'disabled' : ''}>&#8592;</button>
            <button class="lp-modal-nav-btn lp-modal-next" aria-label="Próximo suplemento" type="button" ${this._currentIndex >= this._allItems.length - 1 ? 'disabled' : ''}>&#8594;</button>
          </div>` : ''}
          <div class="lp-modal-hero-footer">
            ${ev ? `<span class="ev-badge ev-badge--${escapeHtml(String(ev).toLowerCase())}">EV. ${escapeHtml(String(ev))}${evLabel ? ` — ${escapeHtml(evLabel)}` : ''}${studiesCount > 0 ? ` · ${studiesCount} estudos` : ''}</span>` : ''}
            <h2 class="lp-modal-title" id="lp-modal-title">${escapeHtml(item.name)}</h2>
            ${item.category ? `<p class="lp-modal-hero-cat">${escapeHtml(item.category)}</p>` : ''}
          </div>
        </div>

        <!-- Scrollable content body -->
        <div class="lp-modal-body">

          <!-- Price table -->
          <section class="lp-modal-section">
            <h3 class="lp-modal-section-heading">Preços</h3>
            <div class="lp-price-table">${priceRowsHtml}</div>
          </section>

          <!-- Segmented tabs -->
          <div class="lp-seg-tabs" role="tablist" aria-label="Informações do suplemento">
            <div class="lp-seg-tabs-track">
              <div class="lp-seg-pill" aria-hidden="true"></div>
              <button class="lp-seg-tab active" role="tab" data-tab="dose" aria-selected="true" tabindex="0">Dose Clínica</button>
              <button class="lp-seg-tab" role="tab" data-tab="benefits" aria-selected="false" tabindex="-1">Benefícios${(item.benefits || []).length > 0 ? ` <span class="lp-tab-count">${(item.benefits || []).length}</span>` : ''}</button>
              <button class="lp-seg-tab" role="tab" data-tab="safety" aria-selected="false" tabindex="-1">Segurança${((item.warnings || []).length + (item.sideEffects || []).length) > 0 ? ` <span class="lp-tab-count">${(item.warnings || []).length + (item.sideEffects || []).length}</span>` : ''}</button>
            </div>
          </div>

          <!-- Tab panels -->
          <div class="lp-tab-panels">
            <div class="lp-tab-panel active" id="lp-tab-dose" role="tabpanel" tabindex="-1">
              ${(() => {
                const minDose = item.dosage?.min ?? 1;
                const maintDose = item.dosage?.maintenance ?? 5;
                const maxDose = item.dosage?.max ?? item.dosage?.upperLimit ?? (maintDose * 3);
                const unit = item.dosage?.unit ?? 'g';
                const pct = Math.min(100, Math.round((maintDose / maxDose) * 100));
                const minPct = Math.min(100, Math.round((minDose / maxDose) * 100));
                return `<div class="lp-dose-bar-wrap">
                  <div class="lp-dose-bar-header">
                    <span class="lp-dose-bar-label">Dose de Manutenção</span>
                    <span class="lp-dose-bar-value">${escapeHtml(String(maintDose))}${escapeHtml(unit)}</span>
                  </div>
                  <div class="lp-dose-bar-track" role="progressbar" aria-valuenow="${maintDose}" aria-valuemin="${minDose}" aria-valuemax="${maxDose}" aria-label="Dose de manutenção">
                    <div class="lp-dose-bar-fill" style="width: ${pct}%"></div>
                    <div class="lp-dose-bar-min-marker" style="left: ${minPct}%" aria-hidden="true">
                      <span class="lp-dose-bar-tick-label">${escapeHtml(String(minDose))}${escapeHtml(unit)}</span>
                    </div>
                  </div>
                  <div class="lp-dose-bar-range">
                    <span>Mín: ${escapeHtml(String(minDose))}${escapeHtml(unit)}</span>
                    <span>Máx: ${escapeHtml(String(maxDose))}${escapeHtml(unit)}</span>
                  </div>
                </div>`;
              })()}
              <dl class="lp-dose-list">
                <div class="lp-dose-row">
                  <dt>Dose de manutenção</dt>
                  <dd>${escapeHtml(String(item.dosage?.maintenance ?? '—'))} ${escapeHtml(item.dosage?.unit ?? '')}</dd>
                </div>
                <div class="lp-dose-row">
                  <dt>Limite superior</dt>
                  <dd>${escapeHtml(String(item.dosage?.upperLimit ?? '—'))} ${escapeHtml(item.dosage?.unit ?? '')}</dd>
                </div>
                <div class="lp-dose-row">
                  <dt>Quando tomar</dt>
                  <dd>${escapeHtml(item.dosage?.timing ?? '—')}</dd>
                </div>
              </dl>
            </div>
            <div class="lp-tab-panel" id="lp-tab-benefits" role="tabpanel" tabindex="-1">
              <ul class="lp-info-list">${(item.benefits || []).map(b => `<li class="lp-benefit-item"><svg class="lp-benefit-check" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6.5" stroke="var(--color-brand)" stroke-opacity="0.3"/><polyline points="4,7 6,9 10,5" stroke="var(--color-brand)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${escapeHtml(b)}</span></li>`).join('')}</ul>
            </div>
            <div class="lp-tab-panel" id="lp-tab-safety" role="tabpanel" tabindex="-1">
              <p class="lp-info-subtitle">Avisos</p>
              ${warnings}
              ${sideEffects}
            </div>
          </div>

        </div><!-- /lp-modal-body -->

        <!-- aria-live announcement region -->
        <div class="lp-modal-announce" aria-live="polite" aria-atomic="true"></div>

        <!-- Sticky footer -->
        <div class="lp-modal-footer">
          <button id="lp-modal-add-btn" class="lp-modal-add-btn${inStack ? ' in-stack' : ''}" data-id="${escapeHtml(item.id)}" type="button">
            ${inStack ? '✓ Já no Stack' : '+ Adicionar ao Stack'}
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);
    this._pushScrollLock('modal');

    // ── M6: Sticky header on scroll ──────────────────────────────────────────
    const stickyHeader = document.createElement('div');
    stickyHeader.className = 'lp-modal-sticky-header';
    stickyHeader.innerHTML = `
      <span class="lp-modal-sticky-title">${escapeHtml(item.name)}</span>
      <button class="lp-modal-sticky-close" aria-label="Fechar modal" type="button">✕</button>
    `;
    const modalBox = overlay.querySelector('#lp-modal-box');
    const modalBody = overlay.querySelector('.lp-modal-body');
    modalBox.insertBefore(stickyHeader, modalBody);

    stickyHeader.querySelector('.lp-modal-sticky-close').addEventListener('click', () => this.close());

    modalBody.addEventListener('scroll', () => {
      stickyHeader.classList.toggle('visible', modalBody.scrollTop > 160);
    }, { passive: true });

    // ── Segmented tab switching with sliding pill ──────────────────────────
    const segTabs = [...overlay.querySelectorAll('.lp-seg-tab')];
    const pill = overlay.querySelector('.lp-seg-pill');

    const movePill = (tab) => {
      const left  = tab.offsetLeft;
      const width = tab.offsetWidth;
      pill.style.left  = `${left}px`;
      pill.style.width = `${width}px`;
    };

    const activateTab = (tab) => {
      segTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.tabIndex = -1;
      });
      overlay.querySelectorAll('.lp-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.tabIndex = 0;
      movePill(tab);
      const panel = overlay.querySelector(`#lp-tab-${tab.dataset.tab}`);
      if (panel) panel.classList.add('active');
    };

    segTabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        activateTab(tab);
        tab.focus();
      });
      tab.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); activateTab(segTabs[(i + 1) % segTabs.length]); segTabs[(i + 1) % segTabs.length].focus(); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); activateTab(segTabs[(i - 1 + segTabs.length) % segTabs.length]); segTabs[(i - 1 + segTabs.length) % segTabs.length].focus(); }
      });
    });

    // Position pill on active tab — suppress transition for initial placement
    // so the pill doesn't animate from width:auto to the correct size.
    // Re-enable transition after the first paint so subsequent switches animate.
    requestAnimationFrame(() => {
      const activeTab = overlay.querySelector('.lp-seg-tab.active');
      if (activeTab && pill) {
        pill.style.transition = 'none';
        movePill(activeTab);
        requestAnimationFrame(() => {
          pill.style.transition = '';
        });
      }
    });

    // ── Focus trap ──────────────────────────────────────────────────────────
    const focusable = () => [...modalBox.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )];

    overlay.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const els = focusable();
      if (!els.length) return;
      const first = els[0];
      const last  = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Set initial focus on close button
    requestAnimationFrame(() => {
      const closeBtn = overlay.querySelector('#lp-modal-close');
      if (closeBtn) closeBtn.focus();
    });

    // ── Swipe-to-close (mobile) ─────────────────────────────────────────────
    let touchStartY = 0;
    modalBox.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    modalBox.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientY - touchStartY;
      if (delta > 80) this.close();
    }, { passive: true });

    // ── Close button and backdrop click ────────────────────────────────────
    overlay.querySelector('#lp-modal-close').addEventListener('click', () => this.close());
    overlay.addEventListener('click', e => { if (e.target === overlay) this.close(); });

    // ── Prev/Next navigation ────────────────────────────────────────────────
    const prevBtn = overlay.querySelector('.lp-modal-prev');
    const nextBtn = overlay.querySelector('.lp-modal-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = this._currentIndex;
        if (idx > 0) this.open(this._allItems[idx - 1].id);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = this._currentIndex;
        if (idx < this._allItems.length - 1) this.open(this._allItems[idx + 1].id);
      });
    }

    // ── Affiliate click tracking ────────────────────────────────────────────
    overlay.addEventListener('click', e => {
      const affLink = e.target.closest('[data-aff-mp]');
      if (affLink) affiliateEngine.trackClick(affLink.dataset.affId, affLink.dataset.affMp);
    });

    // ── Offline guard ───────────────────────────────────────────────────────
    const isOffline = stateManager.state?.ui?.isOffline === true;
    const addBtn = overlay.querySelector('#lp-modal-add-btn');
    if (isOffline) {
      addBtn.disabled = true;
      addBtn.title = 'Indisponível no modo offline';
      addBtn.style.opacity = '0.5';
      addBtn.style.cursor = 'not-allowed';
    }

    // ── Add-to-stack button ─────────────────────────────────────────────────
    const announce = overlay.querySelector('.lp-modal-announce');
    addBtn.addEventListener('click', e => {
      e.stopPropagation();

      if (stateManager.state?.ui?.isOffline === true) return;

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
        addBtn.classList.remove('in-stack');
        addBtn.textContent = '+ Adicionar ao Stack';
        if (announce) announce.textContent = `${sup.name} removido do stack.`;
      } else {
        stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
          supplementId: sup.id,
          name: sup.name,
          dosage: sup.dosage?.maintenance ?? 5,
          unit: sup.dosage?.unit ?? 'g',
          quantity: 0,
        });
        addBtn.classList.add('in-stack');
        addBtn.textContent = '✓ Já no Stack';
        if (announce) announce.textContent = `${sup.name} adicionado ao stack!`;
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
    // Remove supplement-specific Product schema on close
    const productSchema = document.querySelector('script[data-schema-type^="Product-"]');
    if (productSchema) productSchema.remove();
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
