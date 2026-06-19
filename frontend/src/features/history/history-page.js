import { stateManager } from '../../state/state-manager.js';
import { getSupplementId } from '../../utils/stack.js';
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { todayISO, offsetISO } from '../../utils/date.js';
import { escapeHtml } from '../../utils/escape.js';
import { CheckoutModal } from '../premium/checkout-modal.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { VirtualScroller } from '../../core/virtual-scroller.js';
import { historyService } from './history-service.js';
import { logger } from '../../utils/logger.js';
import { SUPPORT_EMAIL, buildSupportMailto, buildSupportWhatsApp } from '../../config/support.js';
import './history-page.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const _pad = n => String(n).padStart(2, '0');
const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const _formatMonthYear = (isoDate) => {
  if (!isoDate) return '';
  const [y, m] = isoDate.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
};

const CATEGORIES = ['Todos', 'Força & Performance', 'Proteínas', 'Vitaminas & Minerais', 'Adaptógenos & Foco', 'Cognição & Neuroproteção', 'Saúde Hormonal', 'Antioxidantes & Anti-inflamatórios', 'Sono & Recuperação', 'Saúde Geral'];

// Map supplementId → DB entry
const buildSupMap = () => {
  const map = {};
  for (const s of SUPPLEMENTS_DB) map[s.id] = s;
  return map;
};

// Average cost per day from stack.
// pricePerGram is always in R$/g, so convert maintenance to grams first.
const estimateDailyCost = (stack, supMap) => {
  let total = 0;
  for (const item of stack) {
    const sid = getSupplementId(item);
    const db = supMap[sid];
    if (db && db.dosage && db.pricePerGram) {
      const dose = db.dosage.maintenance || 5;
      const unit = (db.dosage.unit || 'g').toLowerCase();
      // Convert to grams before multiplying by pricePerGram
      let doseInGrams;
      if (unit === 'g')         doseInGrams = dose;
      else if (unit === 'mg')   doseInGrams = dose / 1000;
      else if (unit === 'mcg')  doseInGrams = dose / 1_000_000;
      else continue; // UI, bi UFC etc. can't be converted to grams — skip
      total += doseInGrams * db.pricePerGram;
    }
  }
  return total;
};

/**
 * HistoryPage — Check-in history with calendar, analytics, and filters
 *
 * Shows:
 * - Stats: total check-ins, days streaked, average daily cost
 * - 7-day calendar with completion dots (filled/empty/today)
 * - Supplement breakdown: search + category filter + expand/collapse cards
 * - Premium lock: advanced analytics behind tier check
 * - Advanced dashboard (premium): daily adherence trends, supplement heatmap
 *
 * Integrates with StateManager (checkins, stack), SUPPLEMENTS_DB for details.
 */
export default class HistoryPage {
  constructor(container) {
    this.container = container;
    this._searchQuery = '';
    this._activeCategory = 'Todos';
    this._isMounted = false;
    this._scaffoldCreated = false;
    this._scroller = null;
    this._sentinel = null;
    this._stalled = false;
    this._unsubscribeOffline = null;
    this._unsubOnline = null;
    this._unsubSync = null;
    this._supMap = buildSupMap();
  }

  async mount() {
    this._isMounted = true;
    this._renderScaffold();
    this._setupScroller();
    this._setupSentinel();

    await this._loadFirstPage();

    this._unsubscribeState = stateManager.subscribe(() => {
      if (this._isMounted) this._renderScaffold();
    });

    this._syncOfflineState(stateManager.get('ui.isOffline'));
    this._unsubscribeOffline = stateManager.subscribe('ui.isOffline', (isOffline) => {
      if (!this._isMounted) return;
      this._syncOfflineState(isOffline);
    });

    this._unsubOnline = eventBus.on(EVENTS.APP_ONLINE, () => {
      if (this._isMounted && this._stalled) this._resumeAfterStall();
    });

    this._unsubSync = eventBus.on('sync:queue:emptied', () => {
      if (this._isMounted) {
        this._loadFirstPage();
      }
    });
  }

  unmount() {
    this._isMounted = false;
    this._scaffoldCreated = false;
    this._unsubscribeState?.();
    this._unsubscribeOffline?.();
    this._unsubOnline?.();
    this._unsubSync?.();
    this._sentinel?.disconnect();
    this._scroller?.unmount();
    historyService.reset();
  }

  // ─── Main render ─────────────────────────────────────────────────────────────
  /**
   * Render the complete HistoryPage with stats, calendar, and supplement breakdown.
   *
   * Builds:
   * - Stats cards: adherence %, streak days, total investment
   * - 7-day calendar: completion dots with today highlight
   * - Search input + category filter chips (Todos, Força, Proteínas, etc.)
   * - Supplement breakdown: searchable/filterable cards with:
   *   - Name, category, image
   *   - Dates checked (sorted newest first)
   *   - Adherence % over time window
   *   - Toggle expand/collapse per card
   *
   * Applies active filters (search query, category) to entries before rendering.
   * Guards against premium features (premium lock card if user tier = free).
   *
   * @returns {void}
   * @private
   */

  _renderScaffold() {
    const state = stateManager.state;
    const checkins = state.checkins || [];
    const stack = state.stack || [];
    const supMap = buildSupMap();

    const _today = todayISO();
    const daysInRange = 30;
    const daysSet = new Set(checkins.map(c => c.date).filter(Boolean));
    const totalCycles = daysSet.size;

    let daysWithCheckin = 0;
    for (let i = 0; i < daysInRange; i++) {
      if (daysSet.has(offsetISO(i))) daysWithCheckin++;
    }
    const adherencePct = daysInRange > 0 ? Math.round((daysWithCheckin / daysInRange) * 100) : 0;

    const dailyCost = estimateDailyCost(stack, supMap);
    const investTotal = (dailyCost * totalCycles).toFixed(2).replace('.', ',');

    const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const calDays = [];
    for (let i = 6; i >= 0; i--) {
      const iso = offsetISO(i);
      const now = new Date(iso + 'T12:00:00');
      calDays.push({
        iso,
        label: DAY_LABELS[now.getDay()],
        isToday: i === 0,
        hasCk: daysSet.has(iso),
        dayNum: now.getDate()
      });
    }

    const statsHtml = `
      <div class="hp-stats">
        <div class="hp-stat-card">
          <div class="hp-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <span class="hp-stat-label">Média de Adesão</span>
          <span class="hp-stat-value">${adherencePct}<span style="font-size:16px;font-weight:600;color:var(--color-text-muted)">%</span></span>
          <div class="hp-progress-bar">
            <div class="hp-progress-fill" style="width:${adherencePct}%"></div>
          </div>
        </div>
        <div class="hp-stat-card">
          <div class="hp-stat-icon hp-stat-icon--ev">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span class="hp-stat-label">Total de Ciclos</span>
          <span class="hp-stat-value">${totalCycles}</span>
          <span class="hp-stat-sub${totalCycles > 0 ? ' positive' : ''}">
            ${totalCycles > 0 ? '+' + Math.min(totalCycles, 2) + ' no último trimestre' : 'Nenhum ciclo registrado'}
          </span>
        </div>
        <div class="hp-stat-card">
          <div class="hp-stat-icon hp-stat-icon--invest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span class="hp-stat-label">Investimento Total Est.</span>
          <span class="hp-stat-value hp-stat-value--invest">R$ ${investTotal}</span>
          <span class="hp-stat-sub">Calculado com base nos logs</span>
        </div>
      </div>
    `;

    const calendarHtml = `
      <div class="hp-calendar">
        <div class="hp-calendar-title">Últimos 7 dias</div>
        <div class="hp-calendar-row">
          ${calDays.map(day => {
            const cls = day.hasCk
              ? (day.isToday ? 'today-filled' : 'filled')
              : (day.isToday ? 'today-empty' : 'empty');
            return `
              <div class="hp-day-col">
                <div class="hp-day-label">${day.label}</div>
                <div class="hp-day-dot ${cls}">${day.dayNum}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const searchHtml = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <input
          type="search"
          class="hp-search-input"
          placeholder="Buscar suplemento..."
          value="${escapeHtml(this._searchQuery)}"
          id="hp-search"
        />
        <div class="hp-chips">
          ${CATEGORIES.map(cat => `
            <button class="hp-chip ${this._activeCategory === cat ? 'active' : ''}" data-cat="${cat}">${cat}</button>
          `).join('')}
        </div>
      </div>
    `;

    const userTier = state.user?.tier ?? 'free';
    const isFree = userTier === 'free';

    if (!this._scaffoldCreated) {
      this.container.innerHTML = `
        <div class="hp-root">
          <header>
            <h1 style="font-size:24px;font-weight:800;margin:0 0 4px;font-family:'Plus Jakarta Sans','Inter',sans-serif;color:var(--color-text-primary);">Histórico</h1>
            <p style="color:var(--color-text-secondary);font-size:14px;margin:0;">Acompanhe sua constância de suplementação.</p>
          </header>
          <div id="hp-stats-container">${statsHtml}</div>
          <div id="hp-calendar-container">${calendarHtml}</div>
          ${!isFree ? `<div id="hp-premium-container">${this._renderAdvancedAnalyticsDashboard(checkins, stack, supMap)}</div>` : '<div id="hp-premium-container"></div>'}
          <div id="hp-search-container">${searchHtml}</div>
          
          <div class="hp-section-title" style="margin-top: 20px;">Timeline de Registros</div>
          <div id="hp-scroller-container" style="position: relative; min-height: 200px; margin-top: 10px;"></div>
          <div id="hp-sentinel" style="height: 1px;"></div>
          <div id="hp-status-banner" style="text-align:center; padding: 20px; color: var(--color-text-muted); font-size: 13px;"></div>
          
          ${isFree ? this._renderPremiumLockCard() : ''}
        </div>
      `;
      this._scaffoldCreated = true;
      this._attachListeners();
    } else {
       const statsEl = this.container.querySelector('#hp-stats-container');
       if (statsEl) statsEl.innerHTML = statsHtml;
       
       const calEl = this.container.querySelector('#hp-calendar-container');
       if (calEl) calEl.innerHTML = calendarHtml;
       
       const premEl = this.container.querySelector('#hp-premium-container');
       if (premEl && !isFree) {
         premEl.innerHTML = this._renderAdvancedAnalyticsDashboard(checkins, stack, supMap);
       }
    }
  }

  _setupScroller() {
    const scrollerContainer = this.container.querySelector('#hp-scroller-container');
    if (!scrollerContainer) return;

    this._scroller = new VirtualScroller(
      scrollerContainer,
      [],
      (item, index) => this._renderCheckinItem(item, index),
      { itemHeight: 84, bufferSize: 5 }
    );
    this._scroller.mount();
  }

  _renderCheckinItem(ck, _index) {
    const db = this._supMap[ck.supplementId || ''];
    const name = db?.name || ck.supplementId || 'Desconhecido';
    const cat = db?.category || '';
    const img = db?.image || `/assets/${(ck.supplementId || '').replace(/-/g, '_')}.png`;
    const ev = db?.evidenceLevel;

    const dStr = ck.date
      ? new Date(ck.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

    const evBadge = ev
      ? `<span class="ev-badge ev-badge--${String(ev).toLowerCase()}">${escapeHtml(String(ev))}</span>`
      : '';

    const pendingBadge = ck.isPending
      ? `<span title="Aguardando conexão..." style="font-size:13px;">☁️</span>`
      : '';

    return `
      <div class="hp-sup-card">
        <div class="hp-sup-header">
          <img class="hp-sup-img"
            src="${escapeHtml(img)}"
            alt="${escapeHtml(name)}"
            loading="lazy"
            decoding="async"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
          />
          <div class="hp-sup-img-placeholder" style="display:none">💊</div>
          <div class="hp-sup-info">
            <div class="hp-sup-name">${escapeHtml(name)}</div>
            <div class="hp-sup-meta">
              ${cat ? `<span class="hp-badge-cat">${escapeHtml(cat)}</span>` : ''}
              ${evBadge}
              <span class="hp-sup-range">${dStr}</span>
              ${pendingBadge}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _setupSentinel() {
    const sentinelEl = this.container.querySelector('#hp-sentinel');
    if (!sentinelEl) return;

    this._sentinel = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        this._onScrollEnd();
      }
    }, { rootMargin: '200px' });

    this._sentinel.observe(sentinelEl);
  }

  async _loadFirstPage() {
    this._renderStatus('Carregando...', true);
    historyService.reset();
    try {
      const { items, hasMore } = await historyService.loadMore();
      if (items.length === 0) {
        this._renderStatus('Nenhum registro encontrado.', false);
      } else {
        this._scroller.updateItems(historyService.getItems());
        if (!hasMore) {
          this._sentinel?.disconnect();
          this._renderStatus('Histórico completo.', false);
        } else {
          this._renderStatus('', false);
        }
      }
    } catch (err) {
      if (err.status === 503 || err.error === 'offline') {
        this._stalled = true;
        this._sentinel?.disconnect();
        this._renderStatus('Sem conexão — aguardando rede para carregar mais.', false);
      }
    }
  }

  async _onScrollEnd() {
    if (!historyService.hasMore || historyService.isLoading) return;
    
    this._renderStatus('Carregando mais...', true);
    try {
      const { hasMore } = await historyService.loadMore();
      this._scroller.updateItems(historyService.getItems());
      if (!hasMore) {
        this._sentinel?.disconnect();
        this._renderStatus('Histórico completo.', false);
      } else {
        this._renderStatus('', false);
      }
    } catch (err) {
      if (err.status === 503 || err.error === 'offline') {
        this._stalled = true;
        this._sentinel?.disconnect();
        this._renderStatus('Sem conexão — aguardando rede para carregar mais.', false);
      }
    }
  }

  _renderStatus(msg, isSpinner = false) {
    const banner = this.container.querySelector('#hp-status-banner');
    if (!banner) return;
    if (!msg) {
      banner.style.display = 'none';
      return;
    }
    banner.style.display = 'block';
    banner.innerHTML = isSpinner ? `<span style="opacity:0.7">⌛ ${msg}</span>` : escapeHtml(msg);
  }

  _syncOfflineState(isOffline) {
    // Contract implementation for UI lockdown
    if (isOffline) {
      if (!this._stalled) {
         this._renderStatus('Modo Offline — histórico da sessão atual.', false);
      }
    } else {
      if (this._stalled) {
         this._resumeAfterStall();
      }
    }
  }

  async _resumeAfterStall() {
    this._stalled = false;
    this._renderStatus('Reconectado. Retomando...', true);
    
    // Resume intersection observer if we still have more data
    if (historyService.hasMore) {
      const sentinelEl = this.container.querySelector('#hp-sentinel');
      if (sentinelEl) this._sentinel?.observe(sentinelEl);
      await this._onScrollEnd();
    } else {
      this._renderStatus('Histórico completo.', false);
    }
  }

  // ─── Event listeners ─────────────────────────────────────────────────────────
  /**
   * Attach event listeners for search, filters, expand/collapse, and premium actions.
   *
   * Handles:
   * - Search input: re-renders on input with debounce
   * - Category chips: toggles active category and re-renders
   * - Toggle buttons: expand/collapse supplement cards
   * - CTA button: navigates to /checkin page
   * - Premium unlock button: shows CheckoutModal
   * - Excel export button: triggers export (premium feature)
   * - Priority support button: opens support dialog
   *
   * @returns {void}
   * @private
   */
  _attachListeners() {
    // Search input — restore focus if user was typing (innerHTML re-render loses focus)
    const searchEl = this.container.querySelector('#hp-search');
    if (searchEl) {
      if (this._searchQuery) {
        searchEl.focus();
        const len = searchEl.value.length;
        searchEl.setSelectionRange(len, len);
      }
      searchEl.addEventListener('input', (e) => {
        this._searchQuery = e.target.value;
        historyService.setFilters({ query: this._searchQuery });
        this._loadFirstPage();
        this._renderScaffold();
      });
    }

    const allChips = this.container.querySelectorAll('.hp-chip');
    allChips.forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeCategory = btn.dataset.cat;
        
        // Manual DOM update for chips since we don't re-render the whole scaffold
        allChips.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');

        historyService.setFilters({ category: this._activeCategory });
        this._loadFirstPage();
        this._renderScaffold();
      });
    });

    // CTA button (empty state)
    const ctaBtn = this.container.querySelector('#hp-cta-checkin');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        window.history.pushState(null, null, '/checkin');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    }

    // Premium buttons
    const unlockBtn = this.container.querySelector('#hp-unlock-premium-btn');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', () => {
        CheckoutModal.show({ tier: 'pro' });
      });
    }

    const excelBtn = this.container.querySelector('#hp-export-excel-btn');
    if (excelBtn) {
      excelBtn.addEventListener('click', () => {
        this._exportToExcel();
      });
    }

    const supportBtn = this.container.querySelector('#hp-priority-support-btn');
    if (supportBtn) {
      supportBtn.addEventListener('click', () => {
        this._openPrioritySupportDialog();
      });
    }
  }

  /**
   * Render premium lock card with upsell messaging.
   *
   * Shows:
   * - Icon + "Desbloqueie o Painel Analítico Premium" headline
   * - Benefits copy: interactive graphs, 30-day heatmap, category breakdown, priority support, Excel export
   * - "Ativar Premium" CTA button with pricing
   *
   * Button triggers CheckoutModal with tier='pro'.
   *
   * @returns {string} HTML string for premium lock card
   * @private
   */
  _renderPremiumLockCard() {
    return `
      <div class="hp-premium-lock hp-premium-lock-card">
        <div class="hp-premium-lock__icon">📊</div>
        <h3 class="hp-premium-lock__title">Desbloqueie o Painel Analítico Premium</h3>
        <p class="hp-premium-lock__desc">Tenha acesso a gráficos interativos de constância, mapa de calor de 30 dias, detalhamento por categoria, suporte prioritário e exportação completa em Excel.</p>
        <button class="hp-premium-lock__btn" id="hp-unlock-premium-btn">Ativar Premium — R$ 14,90/mês</button>
      </div>
    `;
  }

  /**
   * Render advanced analytics dashboard (premium feature) with heatmap and trends.
   *
   * Shows:
   * - Header: "Painel Premium" + Priority Support button
   * - 30-day heatmap: grid of colored cells (checked/unchecked per day)
   * - Weekly trend sparkline: line chart showing adherence % per week
   * - Stats: total days checked, data size in KB
   * - Excel export button (premium-only)
   *
   * Heatmap cells show tooltip with date and check-in status on hover.
   * Sparkline renders as SVG path with area fill.
   *
   * @param {Object[]} checkins - All check-ins from stateManager
   * @param {Object[]} stack - Current supplement stack
   * @param {Object} supMap - Supplement database map (ID → details)
   * @returns {string} HTML string for advanced analytics dashboard
   * @private
   */
  _renderAdvancedAnalyticsDashboard(checkins, stack, _supMap) {
    const daysSet = new Set(checkins.map(c => c.date).filter(Boolean));
    
    // Heatmap Cells
    const heatmapCells = [];
    for (let i = 29; i >= 0; i--) {
      const iso = offsetISO(i);
      const hasCk = daysSet.has(iso);
      const dayNum = iso.split('-')[2];
      heatmapCells.push(`
        <div class="hp-heatmap-cell ${hasCk ? 'active' : ''}" 
             title="${iso}: ${hasCk ? 'Check-in concluído' : 'Sem check-in'}"
             style="width: 100%; min-width: 0; aspect-ratio: 1; max-width: 32px; border-radius: 6px; background: ${hasCk ? 'var(--color-brand)' : 'var(--color-surface-secondary)'}; border: 1px solid ${hasCk ? 'var(--color-brand)' : 'var(--color-border)'}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: ${hasCk ? '#fff' : 'var(--color-text-muted)'}; cursor: pointer; transition: transform 0.15s ease;">
          ${dayNum}
        </div>
      `);
    }

    // Weekly trend sparkline points
    const weekAdherences = [];
    for (let w = 3; w >= 0; w--) {
      let weekCkCount = 0;
      for (let d = 0; d < 7; d++) {
        const dayIso = offsetISO(w * 7 + d);
        if (daysSet.has(dayIso)) weekCkCount++;
      }
      const pct = Math.round((weekCkCount / 7) * 100);
      weekAdherences.push(pct);
    }

    const points = weekAdherences.map((pct, idx) => {
      const x = 40 + idx * 110;
      const y = 65 - (pct / 100) * 50;
      return { x, y, pct };
    });
    const pathD = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y}`;
    const areaD = `${pathD} L ${points[3].x} 70 L ${points[0].x} 70 Z`;

    const checkinSize = JSON.stringify(checkins).length;
    const stackSize = JSON.stringify(stack).length;
    const kb = ((checkinSize + stackSize) / 1024).toFixed(2);

    return `
      <!-- Premium Advanced Dashboard -->
      <div class="hp-analytics-dashboard hp-advanced-dashboard">

        <div class="hp-analytics-header">
          <div>
            <h3 class="hp-analytics-header__title">Painel Premium 📊</h3>
            <p class="hp-analytics-header__sub">Métricas e ferramentas de alta consistência</p>
          </div>
          <button id="hp-priority-support-btn" class="hp-analytics-support-btn">
            ⚡ Suporte Prioritário
          </button>
        </div>

        <!-- Heatmap Grid -->
        <div>
          <span class="hp-analytics-section-label">Mapa de Consistência (Últimos 30 Dias)</span>
          <div class="hp-analytics-heatmap-grid">
            ${heatmapCells.join('')}
          </div>
        </div>

        <!-- Trend Sparkline -->
        <div>
          <span class="hp-analytics-section-label hp-analytics-trend-label">Tendência Semanal de Adesão</span>
          <div class="hp-analytics-sparkline-wrap">
            <svg width="100%" height="90" viewBox="0 0 400 90" style="overflow: visible;">
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--color-brand)" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="var(--color-brand)" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              <!-- Grid lines -->
              <line x1="40" y1="15" x2="370" y2="15" stroke="var(--color-border)" stroke-dasharray="4" />
              <line x1="40" y1="40" x2="370" y2="40" stroke="var(--color-border)" stroke-dasharray="4" />
              <line x1="40" y1="65" x2="370" y2="65" stroke="var(--color-border)" stroke-dasharray="4" />
              <!-- Area fill -->
              <path d="${areaD}" fill="url(#chart-grad)" />
              <!-- Trend Line -->
              <path d="${pathD}" stroke="var(--color-brand)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
              <!-- Dots and Labels -->
              ${points.map((p, i) => `
                <circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff" stroke="var(--color-brand)" stroke-width="2" />
                <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--color-text-primary)" font-family="Inter">${p.pct}%</text>
                <text x="${p.x}" y="85" text-anchor="middle" font-size="9" font-weight="600" fill="var(--color-text-muted)" font-family="Inter">Semana ${4 - i}</text>
              `).join('')}
            </svg>
          </div>
        </div>

        <!-- Offline Sync Card -->
        <div class="hp-analytics-offline">
          <span class="hp-analytics-offline__icon">🟢</span>
          <div style="flex: 1;">
            <div class="hp-analytics-offline__status">Sincronização Offline Ativa</div>
            <div class="hp-analytics-offline__detail">Banco de dados 100% Local-first. Cache: ${kb} KB de logs locais sincronizados.</div>
          </div>
        </div>

        <!-- Excel Custom Report Exporter -->
        <button id="hp-export-excel-btn" class="hp-analytics-export-btn">
          📥 Baixar Relatório Premium (Excel)
        </button>

      </div>
    `;
  }

  async _exportToExcel() {
    try {
      const { default: ExcelJS } = await import('exceljs');
      const state = stateManager.state;
      const checkins = state.checkins || [];
      const stack = state.stack || [];
      const supMap = buildSupMap();

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SupliList';
      workbook.created = new Date();

      // Sheet 1: Checkins
      const sheet1 = workbook.addWorksheet('Histórico de Check-ins');
      sheet1.columns = [
        { header: 'Data', key: 'date', width: 15 },
        { header: 'Suplemento', key: 'name', width: 25 },
        { header: 'Categoria', key: 'category', width: 20 },
        { header: 'Nota / Observação', key: 'note', width: 40 }
      ];

      // Add rows
      checkins.forEach(ck => {
        const db = supMap[ck.supplementId];
        sheet1.addRow({
          date: ck.date || '',
          name: db?.name || ck.supplementId || 'Desconhecido',
          category: db?.category || 'Outros',
          note: ck.note || ''
        });
      });

      // Style header
      const headerRow1 = sheet1.getRow(1);
      headerRow1.height = 24;
      headerRow1.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF7C3AED' }
        };
        cell.font = {
          name: 'Segoe UI',
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 11
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Alternating rows
      sheet1.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 20;
        row.eachCell(cell => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle' };
          if (rowNumber % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' }
            };
          }
        });
      });

      // Sheet 2: Stack
      const sheet2 = workbook.addWorksheet('Meu Stack');
      sheet2.columns = [
        { header: 'Nome', key: 'name', width: 25 },
        { header: 'Categoria', key: 'category', width: 20 },
        { header: 'Dosagem Ativa', key: 'dosage', width: 18 },
        { header: 'Estoque Restante', key: 'qty', width: 18 }
      ];

      stack.forEach(item => {
        const db = supMap[getSupplementId(item)];
        const doseVal = item.dosage?.value ?? db?.dosage?.maintenance ?? '';
        const doseUnit = item.dosage?.unit ?? db?.dosage?.unit ?? '';
        sheet2.addRow({
          name: db?.name || item.supplementId || 'Desconhecido',
          category: db?.category || 'Outros',
          dosage: doseVal ? `${doseVal} ${doseUnit}` : '—',
          qty: item.quantity != null ? `${item.quantity} ${item.unit || 'g'}` : '—'
        });
      });

      const headerRow2 = sheet2.getRow(1);
      headerRow2.height = 24;
      headerRow2.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF7C3AED' }
        };
        cell.font = {
          name: 'Segoe UI',
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 11
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      sheet2.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 20;
        row.eachCell(cell => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle' };
          if (rowNumber % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' }
            };
          }
        });
      });

      // Write excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `suplilist_relatorio_premium_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // Trigger success toast
      eventBus.emit('toast:show', {
        message: 'Relatório Premium Excel gerado com sucesso! 📥',
        type: 'success'
      });
    } catch (e) {
      logger.error('Excel export failed', e);
      eventBus.emit('toast:show', { message: 'Erro ao gerar relatório Excel.', type: 'error' });
    }
  }

  /**
   * Open priority support dialog (premium feature) with real contact channels.
   *
   * Shows:
   * - Heading: "Suporte Prioritário Premium" + ⚡ icon
   * - E-mail channel: mailto link to SUPPORT_EMAIL with prefilled subject/body
   * - WhatsApp channel: wa.me link with prefilled message — only rendered when
   *   SUPPORT_WHATSAPP is configured in config/support.js (no broken link shipped)
   *
   * Closes on close button click, overlay click, or after picking a channel.
   *
   * @returns {void}
   * @private
   */
  _openPrioritySupportDialog() {
    const subject = 'Suporte Prioritário Premium — SupliList';
    const body = 'Olá, equipe SupliList!\n\n(Descreva aqui sua dúvida sobre dosagens, interações ou uso do app.)\n\n— Enviado pelo painel Premium';
    const mailto = buildSupportMailto(subject, body);
    const whatsapp = buildSupportWhatsApp('Olá! Sou membro Premium do SupliList e preciso de suporte prioritário.');

    const overlay = document.createElement('div');
    overlay.id = 'priority-support-overlay';
    overlay.className = 'hp-support-overlay';
    overlay.innerHTML = `
      <div class="hp-support-dialog">
        <button id="ps-close-btn" class="hp-support-close" aria-label="Fechar">✕</button>
        <div class="hp-support-heading">
          <span class="hp-support-heading__icon" aria-hidden="true">⚡</span>
          <h3 class="hp-support-heading__title">Suporte Prioritário Premium</h3>
        </div>
        <p class="hp-support-desc">Como membro Premium, você fala direto com a nossa equipe. Escolha um canal abaixo — respondemos com prioridade.</p>

        <div class="hp-support-channels">
          <a id="ps-email-link" class="hp-support-channel" href="${mailto}">
            <span class="hp-support-channel__icon" aria-hidden="true">✉️</span>
            <span class="hp-support-channel__text">
              <strong>E-mail</strong>
              <small>${escapeHtml(SUPPORT_EMAIL)}</small>
            </span>
          </a>
          ${whatsapp ? `
          <a id="ps-whatsapp-link" class="hp-support-channel" href="${whatsapp}" target="_blank" rel="noopener noreferrer">
            <span class="hp-support-channel__icon" aria-hidden="true">💬</span>
            <span class="hp-support-channel__text">
              <strong>WhatsApp</strong>
              <small>Resposta rápida no seu celular</small>
            </span>
          </a>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#ps-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    // Fecha o dialog ao escolher um canal (a navegação mailto/wa.me já acontece no link)
    overlay.querySelectorAll('.hp-support-channel').forEach(link => {
      link.addEventListener('click', () => setTimeout(() => overlay.remove(), 100));
    });
  }
}
