// ============================================================
// CheckinPage v4.0 — SupliList
// Check-in por suplemento, streak real, persistido no state.
// ============================================================

import { stateManager, ACTIONS } from '../state/state-manager.js';
import { eventBus } from '../core/event-bus.js';

export default class CheckinPage {
  constructor(container) {
    this.container = container;
    this._listeners = [];
  }

  mount() {
    this._render();
    this._attachListeners();
  }

  unmount() {
    this._listeners.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
    this._listeners = [];
  }

  _on(el, event, fn) {
    el.addEventListener(event, fn);
    this._listeners.push([el, event, fn]);
  }

  // ── Data ─────────────────────────────────────────────────

  _getTodayStr() {
    return new Date().toISOString().split('T')[0];
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
    const allDone    = stack.length > 0 && checkedIds.size >= stack.length;
    const today      = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    this.container.innerHTML = `
      <div id="checkin-root" style="padding:20px 16px;display:flex;flex-direction:column;gap:20px;padding-bottom:32px;">

        <header>
          <p style="color:var(--color-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.07em;">${today}</p>
          <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.02em;margin-top:2px;">Check-in</h1>
        </header>

        <!-- Streak Banner -->
        <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:20px;display:flex;align-items:center;gap:16px;">
          <div style="font-size:44px;line-height:1;">${streak > 0 ? '🔥' : '⏳'}</div>
          <div>
            <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;">${streak} ${streak === 1 ? 'dia' : 'dias'}</div>
            <div style="font-size:13px;color:var(--color-text-secondary);margin-top:2px;">
              ${streak === 0 ? 'Comece o seu streak hoje!' : streak < 7 ? 'Ótimo começo! Continue!' : streak < 30 ? 'Sequência incrível! 🚀' : 'Lendário! 🏆'}
            </div>
          </div>
        </div>

        ${allDone ? this._allDoneBanner() : ''}

        <!-- Supplement List -->
        ${stack.length === 0 ? this._emptyStack() : this._supplementList(stack, checkedIds)}

        <!-- Check-in All Button -->
        ${stack.length > 0 && !allDone ? `
          <button id="btn-checkin-all" style="width:100%;background:var(--color-brand);color:#fff;border:none;border-radius:14px;padding:16px;font-weight:700;font-size:16px;cursor:pointer;margin-top:4px;">
            ✅ Marcar todos como feitos
          </button>
        ` : ''}

      </div>
    `;
  }

  _supplementList(stack, checkedIds) {
    return `
      <section>
        <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);margin-bottom:12px;">
          Seu Stack de Hoje — ${checkedIds.size}/${stack.length} marcados
        </h2>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${stack.map(item => {
            const done = checkedIds.has(item.supplementId);
            return `
              <div class="checkin-item" data-id="${item.supplementId}" style="
                background:var(--color-surface-primary);
                border:1px solid ${done ? 'rgba(34,197,94,0.4)' : 'var(--color-border)'};
                border-radius:14px;
                padding:16px;
                display:flex;
                align-items:center;
                gap:14px;
                cursor:${done ? 'default' : 'pointer'};
                transition:border-color 0.2s,background 0.2s;
                ${done ? 'background:var(--color-success-bg);' : ''}
              ">
                <!-- Checkbox -->
                <div class="checkin-checkbox" style="
                  width:28px;height:28px;border-radius:50%;flex-shrink:0;
                  display:flex;align-items:center;justify-content:center;
                  font-size:16px;
                  border:2px solid ${done ? 'var(--color-success)' : 'var(--color-border-strong)'};
                  background:${done ? 'var(--color-success)' : 'transparent'};
                  transition:all 0.2s;
                ">
                  ${done ? '✓' : ''}
                </div>
                <!-- Info -->
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:700;font-size:15px;${done ? 'color:var(--color-success);' : ''}">${item.name}</div>
                  ${item.dosage ? `<div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">${item.dosage}${item.unit || 'g'} · ${item.frequency || 'diário'}</div>` : ''}
                </div>
                ${done
                  ? `<span style="font-size:12px;color:var(--color-success);font-weight:600;white-space:nowrap;">Feito ✓</span>`
                  : `<button class="btn-checkin-single" data-id="${item.supplementId}" data-name="${item.name}" style="background:var(--color-brand-muted);color:var(--color-brand);border:none;border-radius:8px;padding:8px 12px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;">Marcar</button>`
                }
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  _allDoneBanner() {
    return `
      <div style="background:var(--color-success-bg);border:1px solid rgba(34,197,94,0.3);border-radius:14px;padding:20px;text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">🎉</div>
        <div style="font-weight:700;font-size:17px;color:var(--color-success);">Tudo feito hoje!</div>
        <div style="font-size:13px;color:var(--color-text-secondary);margin-top:4px;">Seu streak continua. Até amanhã!</div>
      </div>
    `;
  }

  _emptyStack() {
    return `
      <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:40px 20px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">📋</div>
        <div style="font-weight:700;font-size:17px;margin-bottom:8px;">Stack vazio</div>
        <div style="font-size:14px;color:var(--color-text-secondary);margin-bottom:16px;line-height:1.5;">
          Adicione suplementos ao seu stack para começar a registrar check-ins.
        </div>
        <a href="#/list" style="display:inline-block;background:var(--color-brand);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;">Ir ao Catálogo</a>
      </div>
    `;
  }

  // ── Listeners ─────────────────────────────────────────────

  _attachListeners() {
    // Marcar check-in individual
    this.container.querySelectorAll('.btn-checkin-single').forEach(btn => {
      this._on(btn, 'click', (e) => {
        e.stopPropagation();
        const id   = btn.dataset.id;
        const name = btn.dataset.name;
        this._doCheckin(id, name);
      });
    });

    // Marcar todos
    const allBtn = this.container.querySelector('#btn-checkin-all');
    if (allBtn) {
      this._on(allBtn, 'click', () => {
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
    this.unmount();
    this._render();
    this._attachListeners();
  }
}
