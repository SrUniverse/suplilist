import { stateManager } from '../../state/state-manager.js';
import { eventBus } from '../../core/event-bus.js';
import { todayISO } from '../../utils/date.js';
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { escapeHtml } from '../../utils/escape.js';
import { syncQueue } from '../../platform/sync-queue.js';
import { checkinService } from './checkin-service.js';
import { StreakCelebration } from './streak-celebration.js';

/**
 * CheckinPage — Daily supplement adherence tracking
 *
 * Shows:
 * - Header: title + streak counter (fire emoji)
 * - Progress card: completion bar, count (X/Y done), percentage
 * - Supplement list: checkboxes for each item in stack
 * - "Check All" button (if not all done yet)
 * - Empty state: message + CTA to add supplements
 *
 * Integrates with StateManager (stack, checkins), eventBus for realtime updates.
 * Uses todayISO() to track daily check-ins by date.
 */
export default class CheckinPage {
  /**
   * Create a new CheckinPage
   * @param {HTMLElement} container - DOM element to mount the page
   */
  constructor(container) {
    this.container = container;
    this._internalNavHandler = null;
  }

  /**
   * Mount the page to the DOM and initialize all listeners.
   *
   * Renders main scaffold, attaches click listeners for check-in actions
   * and internal navigation (data-nav-internal links).
   *
   * @returns {void}
   */
  mount() {
    this._render();
    this._attachListeners();
    this._internalNavHandler = (e) => {
      const el = e.target.closest('[data-nav-internal]');
      if (!el) return;
      e.preventDefault();
      const path = el.getAttribute('data-nav-internal');
      window.history.pushState(null, null, path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    };
    this.container.addEventListener('click', this._internalNavHandler);

    this._syncUpdatedHandler = () => this._refresh();
    eventBus.on('sync:queue:updated', this._syncUpdatedHandler);
    eventBus.on('sync:queue:emptied', this._syncUpdatedHandler);
  }

  /**
   * Unmount the page and clean up all resources.
   *
   * Removes event listeners and clears container HTML.
   * Safe to call multiple times.
   *
   * @returns {void}
   */
  unmount() {
    if (this._internalNavHandler) {
      this.container.removeEventListener('click', this._internalNavHandler);
      this._internalNavHandler = null;
    }
    if (this._syncUpdatedHandler) {
      eventBus.off('sync:queue:updated', this._syncUpdatedHandler);
      eventBus.off('sync:queue:emptied', this._syncUpdatedHandler);
    }
    this.container.innerHTML = '';
  }

  // ── Data ─────────────────────────────────────────────────

  /**
   * Get today's date as ISO string (YYYY-MM-DD).
   *
   * @returns {string} ISO date string
   * @private
   */
  _getTodayStr() {
    return todayISO();
  }

  /**
   * Get Set of supplement IDs checked in today.
   *
   * Filters stateManager.checkins by today's date and extracts supplementId.
   * Returns empty Set if no check-ins yet.
   *
   * @returns {Set<string>} Set of checked supplement IDs
   * @private
   */
  _getCheckedIds() {
    const today = this._getTodayStr();
    
    // 1. Check-ins confirmados do servidor (ou memória final)
    const confirmed = stateManager.checkins
      .filter(c => c.date === today)
      .map(c => c.supplementId);
      
    // 2. Check-ins pendentes na SyncQueue local
    const pending = syncQueue.getPendingItems()
      .filter(c => c.date === today)
      .map(c => c.supplementId);

    // Merge e Deduplicação (O usuário enxerga a união de ambos)
    return new Set([...confirmed, ...pending]);
  }

  // ── Render ────────────────────────────────────────────────

  /**
   * Render the complete CheckinPage into the container.
   *
   * Shows:
   * - Header: "Check-in Diário" + today's date + streak badge (🔥)
   * - Progress card (if stack not empty): completion bar, count, percentage
   * - Supplement list (if stack not empty) or empty state (if no stack)
   * - "Check All" button (if not all checked yet)
   *
   * Streak calculated by stateManager.calculateStreak().
   * Uses _getCheckedIds() to determine which items are checked today.
   *
   * @returns {void}
   * @private
   */
  _render() {
    const stack      = stateManager.stack;
    const streak     = stateManager.calculateStreak();
    const checkedIds = this._getCheckedIds();
    const total      = stack.length;
    const done       = checkedIds.size;
    const allDone    = total > 0 && done >= total;
    const pct        = total > 0 ? Math.round((done / total) * 100) : 0;

    const todayLabel = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day:     'numeric',
      month:   'long'
    });
    // Capitalise first letter
    const todayDisplay = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

    this.container.innerHTML = `
      <div style="
        padding: 24px 16px 40px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        font-family: 'Inter', sans-serif;
      ">

        <!-- HEADER -->
        <header style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div>
            <p style="
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: var(--color-text-secondary);
              margin: 0 0 6px;
            ">${todayDisplay}</p>
            <h1 style="
              font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
              font-weight: 800;
              font-size: 30px;
              letter-spacing: -0.03em;
              color: var(--color-text-primary);
              margin: 0;
              line-height: 1.1;
            ">Check-in Diário</h1>
          </div>
          <!-- Streak badge -->
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            background: var(--color-brand-muted, rgba(139,92,246,0.15));
            border: 1px solid var(--color-border-brand, rgba(139,92,246,0.35));
            border-radius: 10px;
            padding: 8px 14px;
            flex-shrink: 0;
          ">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:20px;line-height:1;">🔥</span>
              <span style="
                font-weight: 800;
                font-size: 17px;
                color: var(--color-brand);
                letter-spacing: -0.02em;
                line-height: 1;
              ">${streak} ${streak === 1 ? 'dia' : 'dias'}</span>
            </div>
            ${(() => {
              const next = StreakCelebration.nextMilestone(streak);
              if (!next) return '';
              const missing = next - streak;
              return `<span style="font-size:10px;font-weight:600;color:var(--color-text-secondary);line-height:1;">${missing === 1 ? 'falta 1 dia' : `faltam ${missing} dias`} p/ ${next} 🏆</span>`;
            })()}
          </div>
        </header>

        <!-- PROGRESS CARD -->
        ${total > 0 ? this._progressCard(done, total, pct, allDone) : ''}

        <!-- SUPPLEMENT LIST / EMPTY -->
        ${total === 0 ? this._emptyStack() : this._supplementList(stack, checkedIds)}

        <!-- CHECK ALL BUTTON -->
        ${total > 0 && !allDone ? `
          <button id="btn-checkin-all" data-testid="checkin-all-btn" style="
            width: 100%;
            background: var(--color-brand);
            color: #fff;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 15px;
            cursor: pointer;
            letter-spacing: 0.01em;
          ">✅ Marcar todos como feitos</button>
        ` : ''}

      </div>
    `;
  }

  /**
   * Render progress card with completion bar and text summary.
   *
   * Shows:
   * - Colored bar: gray until all done, then success color
   * - Text: "X de Y feito(s)" + percentage
   * - Celebration message if all done
   *
   * @param {number} done - Supplements checked today
   * @param {number} total - Total supplements in stack
   * @param {number} pct - Percentage complete (0-100)
   * @param {boolean} allDone - Whether all items are checked
   * @returns {string} HTML string for progress card
   * @private
   */
  _progressCard(done, total, pct, allDone) {
    const barColor = allDone ? 'var(--color-success)' : 'var(--color-brand)';
    const bgColor  = allDone ? 'var(--ev-a-bg, rgba(52,211,153,0.08))' : 'var(--color-surface-primary)';
    const border   = allDone ? '1px solid var(--ev-a-border, rgba(52,211,153,0.30))' : '1px solid var(--color-border)';

    return `
      <div style="
        background: ${bgColor};
        border: ${border};
        border-radius: 16px;
        padding: 24px 20px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      ">
        <!-- Percentage display -->
        <div style="
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 52px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: ${allDone ? 'var(--color-success)' : 'var(--color-text-primary)'};
          line-height: 1;
        ">${pct}%</div>

        <!-- Progress bar -->
        <div style="
          width: 100%;
          height: 10px;
          background: var(--color-surface-hover);
          border-radius: 999px;
          overflow: hidden;
        ">
          <div style="
            height: 100%;
            width: ${pct}%;
            background: ${barColor};
            border-radius: 999px;
            transition: width 0.5s ease;
          "></div>
        </div>

        <!-- Label -->
        <p style="
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
          text-align: center;
        ">
          ${allDone
            ? `<span style="color:var(--color-success);font-weight:700;">✅ Protocolo completo hoje!</span>`
            : `<strong style="color:var(--color-text-primary);">${done}</strong> de <strong style="color:var(--color-text-primary);">${total}</strong> suplementos tomados hoje`
          }
        </p>
      </div>
    `;
  }

  /**
   * Render list of supplement cards with checkboxes.
   *
   * Creates one card per supplement in stack, each with:
   * - Checkbox (checked state from checkedIds)
   * - Supplement image, name, dosage/unit
   * - Click handler to toggle check-in
   *
   * Cards rendered via _supplementCard() for each item.
   *
   * @param {Object[]} stack - Stack items from stateManager.stack
   * @param {Set<string>} checkedIds - Set of supplement IDs checked today
   * @returns {string} HTML string for the list
   * @private
   */
  _supplementList(stack, checkedIds) {
    return `
      <section>
        <h2 style="
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: var(--color-text-muted);
          margin: 0 0 12px;
        ">Seu Stack de Hoje</h2>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${stack.map(item => this._supplementCard(item, checkedIds.has(item.supplementId))).join('')}
        </div>
      </section>
    `;
  }

  /**
   * Render a single supplement card for the checkin list.
   *
   * Shows:
   * - Checkbox (checked state indicates today's check-in)
   * - Image (from SUPPLEMENTS_DB or placeholder)
   * - Name, dosage/unit
   * - Click handler: toggles check-in via _doCheckin()
   *
   * Checkbox styled as radio-like button (visual feedback on check-in).
   *
   * @param {Object} item - Stack item { supplementId, name, dosage, unit, ... }
   * @param {boolean} checked - Whether item checked in today
   * @returns {string} HTML string for the card
   * @private
   */
  _supplementCard(item, checked) {
    // Look up the canonical image from SUPPLEMENTS_DB using supplementId.
    // Avoid building a slug from item.name — DB image paths don't always match
    // the name (e.g. name "Creatina Monohidratada" → DB image "/assets/creatina.webp").
    const dbEntry = SUPPLEMENTS_DB.find(s => s.id === item.supplementId);
    const img   = dbEntry?.image || `/assets/${(item.supplementId || '').replace(/-/g, '_')}.webp`;
    const dose  = item.dosage ? `${item.dosage}${item.unit || 'g'}/dia` : '';
    const timing = item.timing || '';

    return `
      <div data-testid="checkin-item-${escapeHtml(item.supplementId)}" style="
        background: var(--color-surface-primary);
        border: 1px solid ${checked ? 'var(--ev-a-border, rgba(52,211,153,0.35))' : 'var(--color-border)'};
        border-radius: 14px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        transition: border-color 0.2s, background 0.2s;
        ${checked ? 'background: var(--ev-a-bg, rgba(52,211,153,0.08));' : ''}
      ">

        <!-- Checkbox circle -->
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid ${checked ? 'var(--color-success)' : 'var(--color-brand)'};
          background: ${checked ? 'var(--color-success)' : 'transparent'};
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          transition: all 0.25s ease;
        ">${checked ? '✓' : ''}</div>

        <!-- Supplement image -->
        <img
          src="${img}"
          alt="${item.name}"
          width="40"
          height="40"
          style="
            width: 40px;
            height: 40px;
            object-fit: contain;
            border-radius: 8px;
            background: var(--color-surface-secondary);
            flex-shrink: 0;
          "
          onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22><rect width=%2240%22 height=%2240%22 fill=%22%23222%22 rx=%228%22/><text x=%2250%25%22 y=%2257%25%22 text-anchor=%22middle%22 fill=%22%23555%22 font-size=%2218%22>💊</text></svg>'"
        />

        <!-- Info -->
        <div style="flex:1;min-width:0;">
          <div style="
            font-weight: 700;
            font-size: 15px;
            color: ${checked ? 'var(--color-success)' : 'var(--color-text-primary)'};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${escapeHtml(item.name)}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap;">
            ${dose ? `<span style="font-size:12px;color:var(--color-text-secondary);">${dose}</span>` : ''}
            ${timing ? `<span style="font-size:11px;color:var(--color-text-muted);">· ${timing}</span>` : ''}
          </div>
        </div>

        <!-- Action -->
        ${checked
          ? `<span data-testid="checkin-done-${escapeHtml(item.supplementId)}" style="
              font-size: 12px;
              color: var(--color-success);
              font-weight: 700;
              white-space: nowrap;
              flex-shrink: 0;
            ">Feito ✓</span>`
          : `<button
              class="btn-checkin-single"
              data-id="${escapeHtml(item.supplementId)}"
              data-name="${escapeHtml(item.name)}"
              data-testid="checkin-btn-${escapeHtml(item.supplementId)}"
              style="
                background: var(--color-brand-muted);
                color: var(--color-brand);
                border: none;
                border-radius: 8px;
                padding: 9px 14px;
                font-family: 'Inter', sans-serif;
                font-weight: 700;
                font-size: 13px;
                cursor: pointer;
                white-space: nowrap;
                flex-shrink: 0;
                transition: background 0.15s;
              "
            >Marcar</button>`
        }
      </div>
    `;
  }

  /**
   * Render empty state when user has no supplements in stack.
   *
   * Shows message + CTA link to "My Stack" page to add supplements.
   * Link uses data-nav-internal to trigger internal navigation.
   *
   * @returns {string} HTML string for empty state
   * @private
   */
  _emptyStack() {
    return `
      <div style="
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 48px 24px;
        text-align: center;
      ">
        <div style="font-size:44px;margin-bottom:14px;">📋</div>
        <div style="
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-weight: 800;
          font-size: 20px;
          color: var(--color-text-primary);
          margin-bottom: 8px;
        ">Stack vazio</div>
        <p style="
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0 0 20px;
          line-height: 1.6;
        ">Adicione suplementos ao seu stack para começar a registrar check-ins diários.</p>
        <a href="/list" data-nav-internal="/list" style="
          display: inline-block;
          background: var(--color-brand);
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 28px;
          border-radius: 10px;
        ">Explorar Catálogo</a>
      </div>
    `;
  }

  // ── Listeners ─────────────────────────────────────────────

  /**
   * Attach event listeners for checkin actions and internal navigation.
   *
   * Handles:
   * - Checkbox clicks on supplement cards: toggles check-in via _doCheckin()
   * - "Check All" button: marks all supplements as done
   * - Internal nav links (data-nav-internal): history.pushState + popstate dispatch
   *
   * Event delegation on container for efficiency.
   *
   * @returns {void}
   * @private
   */
  _attachListeners() {
    this.container.querySelectorAll('.btn-checkin-single').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._doCheckin(btn.dataset.id, btn.dataset.name);
      });
    });

    const allBtn = this.container.querySelector('#btn-checkin-all');
    if (allBtn) {
      allBtn.addEventListener('click', async () => {
        allBtn.disabled = true;
        const checkedIds = this._getCheckedIds();
        
        const pendingItems = stateManager.stack.filter(item => !checkedIds.has(item.supplementId));
        if (pendingItems.length > 0) {
          // Otimismo Visual: Enganar a UI antes do serviço terminar
          const temporarySet = new Set(checkedIds);
          pendingItems.forEach(i => temporarySet.add(i.supplementId));
          // Hooking provisório no _getCheckedIds só para o refresh imediato
          this._getCheckedIds = () => temporarySet;
          this._refresh();

          await checkinService.logMultiple(pendingItems);
          
          // Devolve a função original (a fonte da verdade fará o resto)
          delete this._getCheckedIds;
          this._refresh();
          this._maybeCelebrateStreak();
        }
      });
    }
  }

  /**
   * Record a check-in for a supplement (today) and refresh UI.
   *
   * Guards against duplicate check-in (returns early if already done).
   * Dispatches ADD_CHECKIN action to stateManager with today's date.
   * Se offline, enfileira para sincronização posterior.
   * Optionally shows success toast via eventBus.
   * Refreshes page UI via _refresh().
   *
   * @param {string} supplementId - ID of supplement to check in
   * @param {string} name - Supplement name (for toast message)
   * @param {boolean} [showToast=true] - Whether to show success toast
   * @returns {void}
   * @private
   */
  async _doCheckin(supplementId, name) {
    if (this._getCheckedIds().has(supplementId)) return;

    // Otimismo Visual Instantâneo
    const originalGetter = this._getCheckedIds;
    const tempSet = new Set(originalGetter.call(this));
    tempSet.add(supplementId);
    this._getCheckedIds = () => tempSet;
    this._refresh(); // Atualiza DOM (Barra e Checkbox enchem no instante 0ms)

    // Delega complexidade para o Serviço
    await checkinService.logCheckin(supplementId, name);

    // Restaura fonte da verdade e sincroniza com o state/queue real
    delete this._getCheckedIds;
    this._refresh();
    this._maybeCelebrateStreak();
  }

  /**
   * Fire the streak milestone celebration when today's protocol is complete
   * and the streak just crossed a milestone (3/7/14/30/60/100/365 days).
   * @private
   */
  _maybeCelebrateStreak() {
    const total = stateManager.stack.length;
    if (total === 0 || this._getCheckedIds().size < total) return;
    StreakCelebration.maybeCelebrate(stateManager.calculateStreak());
  }

  /**
   * Re-render the page and re-attach listeners.
   *
   * Called after check-in state changes to reflect updates (new progress, checked counts).
   * Invokes _render() then _attachListeners() sequentially.
   *
   * @returns {void}
   * @private
   */
  _refresh() {
    this._render();
    this._attachListeners();
  }
}
