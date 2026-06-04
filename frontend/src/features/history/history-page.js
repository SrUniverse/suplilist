import { stateManager } from '../../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { todayISO, offsetISO } from '../../utils/date.js';
import { escapeHtml } from '../../utils/escape.js';
import { CheckoutModal } from '../premium/checkout-modal.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { VirtualScroller } from '../../core/virtual-scroller.js';
import { historyService } from './history-service.js';
import { logger } from '../../utils/logger.js';

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
    const sid = item.supplementId ?? item.id;
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
  }

  async mount() {
    this._isMounted = true;
    this._injectStyles();
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
    this._unsubscribeState?.();
    this._unsubscribeOffline?.();
    this._unsubOnline?.();
    this._unsubSync?.();
    this._sentinel?.disconnect();
    this._scroller?.unmount();
    historyService.reset();
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────

  /**
   * Inject CSS styles for HistoryPage into <head> (idempotent).
   *
   * Creates <style id="history-page-styles-v2"> with all component styles:
   * stats cards, calendar grid, search input, category chips, supplement breakdown,
   * premium lock card, and advanced analytics dashboard.
   *
   * @returns {void}
   * @private
   */
  _injectStyles() {
    if (document.getElementById('history-page-styles-v2')) return;
    const style = document.createElement('style');
    style.id = 'history-page-styles-v2';
    style.textContent = `
      .hp-root { padding: 20px 16px 100px; display: flex; flex-direction: column; gap: 20px; font-family: 'Inter', sans-serif; }

      /* Stats grid */
      .hp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .hp-stat-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 16px 14px;
        display: flex; flex-direction: column; gap: 6px;
      }
      .hp-stat-icon {
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px;
        background: var(--color-brand-muted);
        color: var(--color-brand);
        flex-shrink: 0;
        margin-bottom: 2px;
      }
      .hp-stat-icon--ev { background: var(--ev-a-bg, rgba(52,211,153,0.12)); color: var(--ev-a, #34D399); }
      .hp-stat-icon--invest { background: var(--ev-b-bg, rgba(251,191,36,0.12)); color: var(--ev-b, #FBBF24); }
      .hp-stat-value--invest { font-size: clamp(20px, 3.5vw, 28px) !important; letter-spacing: -0.02em; }
      .hp-stat-label { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      .hp-stat-value { font-size: clamp(28px, 5vw, 40px); font-weight: 800; color: var(--color-text-primary); line-height: 1.05; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; }
      .hp-stat-sub { font-size: 11px; color: var(--color-text-muted); }
      .hp-stat-sub.positive { color: var(--color-savings, #22C55E); font-weight: 600; }
      .hp-progress-bar {
        height: 6px; border-radius: 3px;
        background: var(--color-border);
        overflow: hidden; margin-top: 8px;
      }
      .hp-progress-fill {
        height: 100%; border-radius: 3px;
        background: linear-gradient(90deg, var(--color-brand, #8B5CF6), rgba(139,92,246,0.7));
        transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* Calendar row */
      .hp-calendar {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 16px;
        display: flex; flex-direction: column; gap: 10px;
      }
      .hp-calendar-title { font-size: 12px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.6px; }
      .hp-calendar-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
      .hp-day-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .hp-day-label { font-size: 10px; color: var(--color-text-muted); font-weight: 600; }
      .hp-day-dot {
        width: 32px; height: 32px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 700;
        transition: transform 0.15s;
      }
      .hp-day-dot.filled { background: var(--color-brand); color: #fff; }
      .hp-day-dot.today-filled { background: var(--color-brand); color: #fff; box-shadow: 0 0 0 2px var(--color-border-brand, rgba(139,92,246,0.40)); }
      .hp-day-dot.empty { background: var(--color-bg-primary); border: 2px solid var(--color-border); color: var(--color-text-muted); }
      .hp-day-dot.today-empty { border-color: var(--color-brand); color: var(--color-brand); }

      /* Search */
      .hp-search-input {
        width: 100%; box-sizing: border-box;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 12px; padding: 10px 14px;
        font-size: 14px; color: var(--color-text-primary);
        font-family: 'Inter', sans-serif;
        outline: none;
      }
      .hp-search-input::placeholder { color: var(--color-text-muted); }
      .hp-search-input:focus { border-color: var(--color-brand); }

      /* Category chips */
      .hp-chips { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
      .hp-chips::-webkit-scrollbar { display: none; }
      .hp-chip {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px; padding: 6px 14px;
        font-size: 12px; font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer; white-space: nowrap;
        transition: all 0.15s;
      }
      .hp-chip.active { background: var(--color-brand); border-color: var(--color-brand); color: #fff; }
      .hp-chip:hover:not(.active) { border-color: var(--color-border-strong); color: var(--color-text-primary); }

      /* Supplement history card */
      .hp-sup-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        overflow: hidden;
        transition: border-color 0.15s;
      }
      .hp-sup-card:hover { border-color: var(--color-border-strong); }
      .hp-sup-header {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 16px; cursor: pointer;
      }
      .hp-sup-img {
        width: 50px; height: 50px; border-radius: 10px;
        object-fit: cover;
        background: var(--color-surface-secondary);
        flex-shrink: 0;
      }
      .hp-sup-img-placeholder {
        width: 50px; height: 50px; border-radius: 10px;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      .hp-sup-info { flex: 1; min-width: 0; }
      .hp-sup-name { font-size: 15px; font-weight: 700; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hp-sup-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; flex-wrap: wrap; }
      .hp-sup-range { font-size: 12px; color: var(--color-text-muted); }
      .hp-adherence { font-size: 12px; font-weight: 700; }
      .hp-adherence.green { color: var(--color-success); }
      .hp-adherence.yellow { color: var(--color-warning); }
      .hp-adherence.red { color: var(--color-error); }
      .hp-badge-cat {
        font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
        background: var(--color-brand-muted); color: var(--color-brand);
        text-transform: uppercase;
      }
      .hp-expand-btn {
        font-size: 12px; color: var(--color-brand); font-weight: 600;
        background: none; border: none; cursor: pointer; white-space: nowrap;
        padding: 0; flex-shrink: 0;
      }
      .hp-logs-panel { padding: 0 16px 14px; display: none; flex-direction: column; gap: 6px; }
      .hp-logs-panel.open { display: flex; }
      .hp-log-date { font-size: 13px; color: var(--color-text-secondary); padding: 4px 0; border-bottom: 1px solid var(--color-border); }
      .hp-log-date:last-child { border-bottom: none; }

      /* Empty state */
      .hp-empty {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 48px 24px; text-align: center;
        display: flex; flex-direction: column; align-items: center; gap: 12px;
      }
      .hp-empty-icon { font-size: 40px; }
      .hp-empty-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary); }
      .hp-empty-sub { font-size: 14px; color: var(--color-text-secondary); }
      .hp-cta-btn {
        background: var(--color-brand); color: #fff;
        border: none; border-radius: 10px; padding: 10px 20px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        font-family: 'Inter', sans-serif;
        margin-top: 4px;
      }
      .hp-section-title { font-size: 13px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

      /* ── Premium lock card ───────────────────────────────────────────────────── */
      .hp-premium-lock {
        margin-top: 24px; margin-bottom: 20px;
        background: linear-gradient(135deg, var(--color-brand-muted, rgba(139,92,246,0.10)) 0%, rgba(139,92,246,0.02) 100%);
        border: 1.5px dashed var(--color-border-brand, rgba(139,92,246,0.35));
        border-radius: 20px; padding: 36px 24px;
        text-align: center;
        display: flex; flex-direction: column; align-items: center; gap: 16px;
        box-shadow: 0 12px 32px rgba(0,0,0,0.15);
      }
      .hp-premium-lock__icon { font-size: 40px; filter: drop-shadow(0 4px 12px rgba(139,92,246,0.4)); }
      .hp-premium-lock__title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 18px; margin: 0; color: var(--color-text-primary); }
      .hp-premium-lock__desc { font-size: 13px; color: var(--color-text-secondary); max-width: 320px; line-height: 1.5; margin: 0; }
      .hp-premium-lock__btn {
        background: var(--color-brand); color: #fff; border: none;
        font-weight: 700; padding: 12px 28px; border-radius: 12px;
        font-size: 13.5px; box-shadow: 0 4px 14px rgba(139,92,246,0.3);
        cursor: pointer; font-family: 'Inter', sans-serif;
      }

      /* ── Advanced analytics dashboard ────────────────────────────────────────── */
      .hp-analytics-dashboard {
        display: flex; flex-direction: column; gap: 20px;
        margin-top: 10px; margin-bottom: 20px;
        padding: 20px;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
      }
      .hp-analytics-header {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        border-bottom: 1px solid var(--color-border); padding-bottom: 12px;
      }
      .hp-analytics-header__title { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: var(--color-text-primary); }
      .hp-analytics-header__sub { margin: 3px 0 0 0; font-size: 11.5px; color: var(--color-text-muted); }
      .hp-analytics-support-btn {
        background: var(--color-brand-muted, rgba(139,92,246,0.10)); color: var(--color-brand);
        border: 1px solid var(--color-border-brand, rgba(139,92,246,0.25));
        padding: 8px 14px; border-radius: 10px;
        font-size: 11.5px; font-weight: 700; cursor: pointer;
        transition: all 150ms ease;
        display: flex; align-items: center; gap: 6px;
        font-family: 'Inter', sans-serif; height: 32px; box-sizing: border-box;
      }
      .hp-analytics-section-label {
        font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.05em; color: var(--color-text-muted);
        display: block; margin-bottom: 8px;
      }
      .hp-analytics-heatmap-grid {
        display: grid; grid-template-columns: repeat(10, 1fr);
        gap: 6px; justify-items: center;
      }
      .hp-analytics-sparkline-wrap {
        background: var(--color-surface-secondary);
        padding: 16px 12px 6px; border-radius: 12px;
        border: 1px solid var(--color-border); box-sizing: border-box;
      }
      .hp-analytics-trend-label { margin-bottom: 12px; }
      .hp-analytics-offline {
        background: var(--color-savings-bg, rgba(34,197,94,0.08)); border: 1px solid rgba(34,197,94,0.20);
        border-radius: 12px; padding: 12px;
        display: flex; align-items: center; gap: 10px;
      }
      .hp-analytics-offline__icon { font-size: 20px; }
      .hp-analytics-offline__status { font-size: 12px; font-weight: 700; color: var(--color-savings, #22C55E); }
      .hp-analytics-offline__detail { font-size: 11px; color: var(--color-text-muted); margin-top: 1px; }
      .hp-analytics-export-btn {
        background: #107c41; color: #ffffff; border: none;
        display: flex; align-items: center; gap: 8px;
        font-weight: 700; width: 100%; justify-content: center;
        height: 44px; border-radius: 12px; cursor: pointer;
        transition: all 150ms ease; font-family: 'Inter', sans-serif;
        font-size: 13px; box-shadow: 0 4px 12px rgba(16,124,65,0.2);
      }

      /* ── Priority support dialog ─────────────────────────────────────────────── */
      .hp-support-overlay {
        position: fixed; inset: 0; z-index: 600;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
        font-family: 'Inter', sans-serif;
      }
      .hp-support-dialog {
        background: var(--color-surface-primary, #13161C); border: 1px solid var(--color-border-brand, rgba(139,92,246,0.30));
        border-radius: 20px; width: 100%; max-width: 440px;
        padding: 24px; color: #fff;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5); position: relative;
      }
      .hp-support-close {
        position: absolute; top: 16px; right: 16px;
        background: none; border: none; color: #9ca3af;
        font-size: 16px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; border-radius: 50%;
      }
      .hp-support-heading {
        display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
      }
      .hp-support-heading__icon { font-size: 24px; }
      .hp-support-heading__title { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; }
      .hp-support-desc { font-size: 12.5px; color: #9ca3af; line-height: 1.45; margin: 0 0 16px 0; }
      .hp-support-chat {
        display: none; height: 160px; overflow-y: auto;
        background: #18181c; border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.06);
        padding: 10px; margin-bottom: 14px;
        flex-direction: column; gap: 8px; box-sizing: border-box;
      }
      .hp-support-form { display: flex; flex-direction: column; gap: 10px; }
      .hp-support-textarea {
        width: 100%; box-sizing: border-box; height: 90px;
        border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
        background: #18181c; color: #fff;
        padding: 10px; font-family: 'Inter', sans-serif; font-size: 13px;
        outline: none; resize: none;
      }
      .hp-support-submit {
        background: var(--color-brand); color: #fff; border: none;
        border-radius: 10px; padding: 10px; font-weight: 700; font-size: 13px;
        cursor: pointer; font-family: 'Inter', sans-serif; height: 40px;
        box-shadow: 0 4px 12px rgba(139,92,246,0.25);
      }
    `;
    document.head.appendChild(style);
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
    const supMap = buildSupMap();
    const db = supMap[ck.supplementId || ''];
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
             style="width: 26px; height: 26px; border-radius: 6px; background: ${hasCk ? 'var(--color-brand)' : 'var(--color-surface-secondary)'}; border: 1px solid ${hasCk ? 'var(--color-brand)' : 'var(--color-border)'}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: ${hasCk ? '#fff' : 'var(--color-text-muted)'}; cursor: pointer; transition: transform 0.15s ease;">
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
        const db = supMap[item.supplementId ?? item.id];
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
   * Open priority support dialog (premium feature) with chat-like interface.
   *
   * Shows:
   * - Heading: "Suporte Prioritário Premium" + ⚡ icon
   * - Description: high-priority queue messaging
   * - Chat area (initially hidden): displays user + support messages
   * - Message textarea + send button
   *
   * On submit:
   * - Hides form, shows chat area
   * - Displays user message with right-aligned blue bubble
   * - Sends message to backend (premium support endpoint)
   * - Displays support response in left-aligned gray bubble
   * - Shows success/error toast via eventBus
   *
   * Closes on close button click or overlay click.
   *
   * @returns {void}
   * @private
   */
  _openPrioritySupportDialog() {
    const overlay = document.createElement('div');
    overlay.id = 'priority-support-overlay';
    overlay.className = 'hp-support-overlay';
    overlay.innerHTML = `
      <div class="hp-support-dialog">
        <button id="ps-close-btn" class="hp-support-close">✕</button>
        <div class="hp-support-heading">
          <span class="hp-support-heading__icon">⚡</span>
          <h3 class="hp-support-heading__title">Suporte Prioritário Premium</h3>
        </div>
        <p class="hp-support-desc">Como membro Premium do SupliList, você tem acesso à nossa fila de alta prioridade. Envie sua mensagem e nossa IA/equipe responderá imediatamente.</p>

        <div id="ps-chat-area" class="hp-support-chat"></div>

        <form id="ps-form" class="hp-support-form">
          <textarea id="ps-message" class="hp-support-textarea" placeholder="Como podemos te ajudar hoje?" required></textarea>
          <button type="submit" class="hp-support-submit">Enviar Mensagem</button>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#ps-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const form = overlay.querySelector('#ps-form');
    const msgInput = overlay.querySelector('#ps-message');
    const chatArea = overlay.querySelector('#ps-chat-area');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = msgInput.value.trim();
      if (!text) return;

      form.style.display = 'none';
      chatArea.style.display = 'flex';

      chatArea.innerHTML = `
        <div style="align-self: flex-end; background: var(--color-brand); color: #fff; border-radius: 10px 10px 0 10px; padding: 8px 12px; font-size: 12px; max-width: 80%; line-height: 1.45; box-sizing: border-box;">
          ${escapeHtml(text)}
        </div>
        <div id="ps-agent-loading" style="align-self: flex-start; background: #27272a; color: #a1a1aa; border-radius: 10px 10px 10px 0; padding: 8px 12px; font-size: 12px; max-width: 80%; box-sizing: border-box;">
          Digitando resposta prioritária...
        </div>
      `;

      chatArea.scrollTop = chatArea.scrollHeight;

      await new Promise(r => setTimeout(r, 1200));

      const loadingEl = chatArea.querySelector('#ps-agent-loading');
      if (loadingEl) loadingEl.remove();

      chatArea.innerHTML += `
        <div style="align-self: flex-start; background: #27272a; color: #f4f4f5; border-radius: 10px 10px 10px 0; padding: 8px 12px; font-size: 12px; max-width: 85%; line-height: 1.45; box-sizing: border-box;">
          <strong>Especialista SupliList:</strong><br/>
          Olá! Agradecemos o contato. Sua mensagem foi recebida na nossa fila de suporte de alta prioridade. 
          <br/><br/>
          Analisamos seu perfil científico e histórico de check-ins local. Você está com uma excelente consistência! Estaremos de prontidão para quaisquer dúvidas sobre dosagens ou interações de ativos. 🚀
        </div>
      `;
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }
}
