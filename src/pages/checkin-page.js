import { stateManager, ACTIONS } from '../state/state-manager.js';
import { eventBus } from '../core/event-bus.js';
import { todayISO } from '../utils/date.js';

export default class CheckinPage {
  constructor(container) {
    this.container = container;
    this._internalNavHandler = null;
  }

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
  }

  unmount() {
    if (this._internalNavHandler) {
      this.container.removeEventListener('click', this._internalNavHandler);
      this._internalNavHandler = null;
    }
    this.container.innerHTML = '';
  }

  // ── Data ─────────────────────────────────────────────────

  _getTodayStr() {
    return todayISO();
  }

  _getCheckedIds() {
    const today = this._getTodayStr();
    return new Set(
      stateManager.checkins
        .filter(c => c.date === today)
        .map(c => c.supplementId)
    );
  }

  // ── Render ────────────────────────────────────────────────

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
              font-family: 'Syne', sans-serif;
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
            align-items: center;
            gap: 6px;
            background: rgba(124,58,237,0.15);
            border: 1px solid rgba(124,58,237,0.35);
            border-radius: 10px;
            padding: 8px 14px;
            flex-shrink: 0;
          ">
            <span style="font-size:20px;line-height:1;">🔥</span>
            <span style="
              font-weight: 800;
              font-size: 17px;
              color: var(--color-brand);
              letter-spacing: -0.02em;
              line-height: 1;
            ">${streak} ${streak === 1 ? 'dia' : 'dias'}</span>
          </div>
        </header>

        <!-- PROGRESS CARD -->
        ${total > 0 ? this._progressCard(done, total, pct, allDone) : ''}

        <!-- SUPPLEMENT LIST / EMPTY -->
        ${total === 0 ? this._emptyStack() : this._supplementList(stack, checkedIds)}

        <!-- CHECK ALL BUTTON -->
        ${total > 0 && !allDone ? `
          <button id="btn-checkin-all" style="
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

  _progressCard(done, total, pct, allDone) {
    const barColor = allDone ? 'var(--color-success)' : 'var(--color-brand)';
    const bgColor  = allDone ? 'rgba(34,197,94,0.08)' : 'var(--color-surface-primary)';
    const border   = allDone ? '1px solid rgba(34,197,94,0.30)' : '1px solid var(--color-border)';

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
          font-family: 'Syne', sans-serif;
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

  _supplementCard(item, checked) {
    const slug  = (item.slug || item.name || '').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    const img   = `/assets/${slug}.png`;
    const dose  = item.dosage ? `${item.dosage}${item.unit || 'g'}/dia` : '';
    const timing = item.dosage?.timing || item.timing || '';

    return `
      <div style="
        background: var(--color-surface-primary);
        border: 1px solid ${checked ? 'rgba(34,197,94,0.35)' : 'var(--color-border)'};
        border-radius: 14px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        transition: border-color 0.2s, background 0.2s;
        ${checked ? 'background: rgba(34,197,94,0.05);' : ''}
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
          onerror="this.style.display='none'"
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
          ">${item.name}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap;">
            ${dose ? `<span style="font-size:12px;color:var(--color-text-secondary);">${dose}</span>` : ''}
            ${timing ? `<span style="font-size:11px;color:var(--color-text-muted);">· ${timing}</span>` : ''}
          </div>
        </div>

        <!-- Action -->
        ${checked
          ? `<span style="
              font-size: 12px;
              color: var(--color-success);
              font-weight: 700;
              white-space: nowrap;
              flex-shrink: 0;
            ">Feito ✓</span>`
          : `<button
              class="btn-checkin-single"
              data-id="${item.supplementId}"
              data-name="${item.name}"
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
          font-family: 'Syne', sans-serif;
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
        <a href="/my-stack" data-nav-internal="/my-stack" style="
          display: inline-block;
          background: var(--color-brand);
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 28px;
          border-radius: 10px;
        ">Ver Meu Stack</a>
      </div>
    `;
  }

  // ── Listeners ─────────────────────────────────────────────

  _attachListeners() {
    this.container.querySelectorAll('.btn-checkin-single').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._doCheckin(btn.dataset.id, btn.dataset.name);
      });
    });

    const allBtn = this.container.querySelector('#btn-checkin-all');
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        const checkedIds = this._getCheckedIds();
        stateManager.stack.forEach(item => {
          if (!checkedIds.has(item.supplementId)) {
            this._doCheckin(item.supplementId, item.name, false);
          }
        });
        this._refresh();
        eventBus.emit('toast:show', { message: '🎉 Check-in completo!', type: 'success' });
      });
    }
  }

  _doCheckin(supplementId, name, showToast = true) {
    stateManager.dispatch(ACTIONS.ADD_CHECKIN, { supplementId, date: this._getTodayStr() });
    if (showToast) {
      eventBus.emit('toast:show', { message: `✅ ${name} marcado!`, type: 'success' });
    }
    this._refresh();
  }

  _refresh() {
    this._render();
    this._attachListeners();
  }
}
