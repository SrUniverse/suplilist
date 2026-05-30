// ============================================================
// HomePage v4.0 — SupliList
// Dashboard real conectado ao stateManager + StackRecommender.
// recommend() retorna suplementos individuais, não stacks.
// ============================================================

import { stateManager, ACTIONS } from '../state/state-manager.js';
import { eventBus } from '../core/event-bus.js';
import recommender, { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import DosageCalculator from '../ai/dosage-calculator.js';

export default class HomePage {
  constructor(container) {
    this.container = container;
    this._listeners = [];
    this._slCheckinHandler = null; // #4 FIX: gerenciado diretamente por mount/unmount
  }

  mount() {
    this._attachStyles();
    this._render();
    this._attachListeners();
    // #4 FIX: sl-checkin adicionado UMA vez ao document — nunca acumula por _updateStackSection()
    this._slCheckinHandler = (e) => {
      const { supplementId, supplementName } = e.detail ?? {};
      if (!supplementId) return;
      stateManager.dispatch(ACTIONS.ADD_CHECKIN, {
        supplementId,
        name: supplementName,
        timestamp: Date.now(),
      });
      eventBus.emit('toast:show', {
        message: `💊 ${supplementName || 'Suplemento'} registrado!`,
        type: 'success',
      });
      this._updateCheckinSection();
    };
    document.addEventListener('sl-checkin', this._slCheckinHandler);
  }

  unmount() {
    this._listeners.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
    this._listeners = [];
    // #4 FIX: remove o listener de document garantidamente no unmount real
    if (this._slCheckinHandler) {
      document.removeEventListener('sl-checkin', this._slCheckinHandler);
      this._slCheckinHandler = null;
    }
  }

  _on(el, event, fn) {
    el.addEventListener(event, fn);
    this._listeners.push([el, event, fn]);
  }

  // ── Styles (idempotent) ───────────────────────────────────────────────────
  _attachStyles() {
    if (document.getElementById('home-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'home-page-styles';
    style.textContent = `
      #home-root {
        padding: 20px 16px 80px;
        display: flex; flex-direction: column; gap: 20px;
      }
      .hp-section-label {
        font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.07em; color: var(--color-text-secondary); margin-bottom: 12px;
      }
      .hp-stats-grid {
        display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
      }
      @media (min-width: 768px) {
        .hp-stats-grid { grid-template-columns: repeat(4, 1fr); }
      }
      .hp-stat-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 14px; padding: 14px 10px; text-align: center;
      }
      .hp-stat-icon  { font-size: 22px; margin-bottom: 4px; }
      .hp-stat-value { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
      .hp-stat-label {
        font-size: 10px; color: var(--color-text-secondary);
        text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;
      }
      .hp-quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media (min-width: 480px) { .hp-quick-grid { grid-template-columns: repeat(4, 1fr); } }
      @keyframes hp-confetti-fall {
        0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
      .hp-confetti-piece {
        position: fixed; top: -10px; width: 8px; height: 8px;
        border-radius: 2px; pointer-events: none; z-index: 9999;
        animation: hp-confetti-fall linear forwards;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  _getData() {
    const user          = stateManager.user;
    const stack         = stateManager.stack;
    const streak        = stateManager.calculateStreak();
    const todayCheckins = stateManager.getTodayCheckins();
    let topRecs = [];
    if (user.objective) {
      try { topRecs = recommender.recommend(user, 3); } catch (_) {}
    }
    return { user, stack, streak, todayCheckins, topRecs };
  }

  _greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // ── Calculation helpers ───────────────────────────────────────────────────
  _calcAdherence() {
    const checkins = stateManager.getState?.()?.checkins ?? stateManager.checkins ?? [];
    const stack    = stateManager.stack;
    if (!checkins.length || !stack.length) return 0;
    const cutoff = Date.now() - 7 * 86400000;
    const recent = checkins.filter(c => c.timestamp >= cutoff);
    return Math.min(100, Math.round((recent.length / (stack.length * 7)) * 100));
  }

  _calcMonthlyInvestment() {
    const total = stateManager.stack.reduce((sum, item) => {
      return sum + parseFloat(item.monthlyPrice ?? item.price ?? 0);
    }, 0);
    return total > 0 ? total.toFixed(2) : null;
  }

  _totalCheckins() {
    const checkins = stateManager.getState?.()?.checkins ?? stateManager.checkins ?? [];
    return checkins.length;
  }

  // ── Confetti ──────────────────────────────────────────────────────────────
  _celebrate() {
    const colors = ['#7C3AED','#22C55E','#F59E0B','#3B82F6','#EF4444','#EC4899'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.className = 'hp-confetti-piece';
      el.style.cssText = [
        `left:${Math.random() * 100}vw`,
        `background:${colors[Math.floor(Math.random() * colors.length)]}`,
        `width:${6 + Math.random() * 8}px`,
        `height:${6 + Math.random() * 8}px`,
        `animation-duration:${1.2 + Math.random() * 1.5}s`,
        `animation-delay:${Math.random() * 0.5}s`,
      ].join(';');
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  // ── Partial updates ───────────────────────────────────────────────────────
  _updateCheckinSection() {
    const todayCheckins = stateManager.getTodayCheckins();
    const stack         = stateManager.stack;
    const section       = this.container.querySelector('#home-checkin-section');
    if (!section) return;
    const allDone = stack.length > 0 && todayCheckins.length >= stack.length;
    section.innerHTML = allDone
      ? this._checkedBanner(todayCheckins.length, stack.length)
      : this._checkinCTA();
    if (allDone) this._celebrate();
  }

  _updateStackSection() {
    // #4 FIX: Reset cirúrgio de listeners de container sem tocar no sl-checkin do document
    this._listeners.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
    this._listeners = [];
    this._render();
    this._attachListeners();
  }

  // ── HTML helpers ──────────────────────────────────────────────────────────
  _statCardHtml(emoji, value, label) {
    return `
      <div class="hp-stat-card">
        <div class="hp-stat-icon">${emoji}</div>
        <div class="hp-stat-value">${value}</div>
        <div class="hp-stat-label">${label}</div>
      </div>`;
  }

  _checkinCTA() {
    return `
      <div id="home-checkin-cta" style="background:linear-gradient(135deg,var(--color-brand),#6D28D9);border-radius:16px;padding:20px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:12px;">
        <div>
          <div style="font-weight:700;font-size:16px;color:#fff;">Check-in de hoje</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:2px;">Você ainda não registrou sua adesão</div>
        </div>
        <div style="background:rgba(255,255,255,0.2);border-radius:10px;padding:10px 16px;font-weight:700;font-size:14px;color:#fff;white-space:nowrap;">Fazer ✓</div>
      </div>`;
  }

  _checkedBanner(checkedToday, total) {
    return `
      <div style="background:var(--color-success-bg);border:1px solid rgba(34,197,94,0.3);border-radius:14px;padding:16px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:28px;">🎯</span>
        <div>
          <div style="font-weight:700;color:var(--color-success);">Check-in completo!</div>
          <div style="font-size:13px;color:var(--color-text-secondary);margin-top:2px;">${checkedToday} de ${total} suplemento(s) hoje</div>
        </div>
      </div>`;
  }

  _suggestionCard(topRecs) {
    const top   = topRecs[0];
    const supIds = JSON.stringify(topRecs.map(r => r.id));
    return `
      <section>
        <p class="hp-section-label">⚡ Sugestão de IA</p>
        <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-left:3px solid var(--color-brand);border-radius:14px;padding:18px;">
          <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${top.name}</div>
          <div style="font-size:13px;color:var(--color-text-secondary);line-height:1.5;margin-bottom:12px;">
            ${top.benefits?.[0] || 'Baseado no seu perfil e objetivo.'}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            ${topRecs.map(r => `<span style="background:var(--color-brand-muted);color:var(--color-brand);font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;">${r.name}</span>`).join('')}
          </div>
          <button id="btn-add-suggestion" data-sup-ids='${supIds}'
            style="width:100%;background:var(--color-brand);color:#fff;border:none;border-radius:10px;padding:11px;font-weight:700;font-size:14px;cursor:pointer;">
            Adicionar ao Stack
          </button>
        </div>
      </section>`;
  }

  _emptyStateCard(hasStack) {
    if (hasStack) return '';
    return `
      <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:32px 20px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🚀</div>
        <div style="font-weight:700;font-size:17px;margin-bottom:8px;">Monte seu stack</div>
        <div style="font-size:14px;color:var(--color-text-secondary);line-height:1.5;margin-bottom:16px;">Configure seu perfil e explore o catálogo para recomendações de IA.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <a href="#/profile" style="display:inline-block;background:var(--color-surface-hover);border:1px solid var(--color-border);color:var(--color-text-primary);text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px;">Configurar Perfil</a>
          <a href="#/list"    style="display:inline-block;background:var(--color-brand);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px;">Ver Catálogo</a>
        </div>
      </div>`;
  }

  _quickAction(href, emoji, title, subtitle) {
    return `
      <a href="${href}" style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:14px;padding:16px;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:6px;">
        <span style="font-size:22px;">${emoji}</span>
        <div style="font-weight:700;font-size:14px;">${title}</div>
        <div style="font-size:12px;color:var(--color-text-secondary);">${subtitle}</div>
      </a>`;
  }

  _stackPreview(items) {
    return `
      <section>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <p class="hp-section-label" style="margin:0;">Meu Stack</p>
          <a href="#/my-stack" style="font-size:13px;color:var(--color-brand);text-decoration:none;font-weight:600;">Ver tudo</a>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${items.map(item => `
            <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-weight:600;font-size:15px;">${item.name}</div>
                ${item.dosage ? `<div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">${item.dosage}${item.unit || 'g'} · ${item.frequency || 'diário'}</div>` : ''}
              </div>
              <span style="font-size:20px;">💊</span>
            </div>`).join('')}
        </div>
      </section>`;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  _render() {
    const { user, stack, streak, todayCheckins, topRecs } = this._getData();
    const firstName     = user.name ? user.name.split(' ')[0] : null;
    const hasStack      = stack.length > 0;
    const checkedToday  = todayCheckins.length;
    const adherence     = this._calcAdherence();
    const totalCheckins = this._totalCheckins();
    const monthlyCost   = this._calcMonthlyInvestment();

    this.container.innerHTML = `
      <div id="home-root">

        <header>
          <p style="color:var(--color-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.07em;">${this._greeting()}</p>
          <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.02em;margin-top:2px;">
            ${firstName ? `Olá, ${firstName} 👋` : 'Seu Painel'}
          </h1>
        </header>

        <section>
          <div class="hp-stats-grid">
            ${this._statCardHtml('🔥', streak, 'Streak')}
            ${this._statCardHtml('💊', stack.length, 'No Stack')}
            ${this._statCardHtml('📊', adherence + '%', 'Aderência')}
            ${monthlyCost
              ? this._statCardHtml('💰', 'R$ ' + monthlyCost, 'Mês')
              : this._statCardHtml('✅', totalCheckins, 'Check-ins')}
          </div>
        </section>

        <div id="home-checkin-section">
          ${hasStack && checkedToday === 0 ? this._checkinCTA() : ''}
          ${hasStack && checkedToday > 0  ? this._checkedBanner(checkedToday, stack.length) : ''}
        </div>

        ${topRecs.length > 0 ? this._suggestionCard(topRecs) : this._emptyStateCard(hasStack)}

        <section>
          <p class="hp-section-label">Ações Rápidas</p>
          <div class="hp-quick-grid">
            ${this._quickAction('#/list',    '🔍', 'Catálogo',   'Explorar suplementos')}
            ${this._quickAction('#/stack',   '⚗️', 'Calculadora', 'Dosagem personalizada')}
            ${this._quickAction('#/checkin', '📋', 'Check-in',   'Adesão de hoje')}
            ${this._quickAction('#/history', '📈', 'Histórico',  'Ver evolução')}
          </div>
        </section>

        ${hasStack ? this._stackPreview(stack.slice(0, 3)) : ''}

      </div>
    `;
  }

  // ── Listeners ─────────────────────────────────────────────────────────────
  _attachListeners() {
    // CTA → navega para /checkin
    const cta = this.container.querySelector('#home-checkin-cta');
    if (cta) this._on(cta, 'click', () => { window.location.hash = '#/checkin'; });

    // Confirmar todos os check-ins
    const confirmAll = this.container.querySelector('#btn-confirm-all-checkin');
    if (confirmAll) {
      this._on(confirmAll, 'click', () => {
        const todayCheckins = stateManager.getTodayCheckins();
        const unchecked = stateManager.stack.filter(
          item => !todayCheckins.some(c => c.supplementId === item.supplementId)
        );
        unchecked.forEach(item => {
          stateManager.dispatch(ACTIONS.ADD_CHECKIN, {
            supplementId: item.supplementId,
            name: item.name,
            timestamp: Date.now(),
          });
        });
        if (unchecked.length > 0) {
          eventBus.emit('toast:show', {
            message: `✅ ${unchecked.length} check-in(s) registrados!`,
            type: 'success',
          });
          this._updateCheckinSection();
        }
      });
    }

    // sl-checkin: tratado em mount()/unmount() — não adicionar aqui

    // Notificações push
    const notifBtn = this.container.querySelector('#btn-enable-notifications');
    if (notifBtn) {
      this._on(notifBtn, 'click', async () => {
        if (!('Notification' in window)) return;
        const perm = await Notification.requestPermission();
        eventBus.emit('toast:show', {
          message: perm === 'granted' ? '🔔 Notificações ativadas!' : 'Permissão negada.',
          type: perm === 'granted' ? 'success' : 'warning',
        });
      });
    }

    // Adicionar sugestão de IA ao stack
    const addBtn = this.container.querySelector('#btn-add-suggestion');
    if (addBtn) {
      this._on(addBtn, 'click', () => {
        const ids  = JSON.parse(addBtn.dataset.supIds || '[]');
        const user = stateManager.user;
        let added  = 0;
        ids.forEach(id => {
          const sup = SUPPLEMENTS_DB.find(s => s.id === id);
          if (!sup) return;
          if (stateManager.stack.some(s => s.supplementId === id)) return;
          let dosage = sup.dosage?.maintenance;
          try {
            const calc = DosageCalculator.calculate(sup, user);
            if (calc?.daily) dosage = calc.daily;
          } catch (_) {}
          stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
            supplementId: sup.id,
            name: sup.name,
            dosage,
            unit: sup.dosage?.unit || 'g',
            frequency: 'diário',
          });
          added++;
        });
        const msg = added > 0
          ? `✅ ${added} suplemento(s) adicionados!`
          : 'Suplementos já estão no seu stack.';
        eventBus.emit('toast:show', { message: msg, type: added > 0 ? 'success' : 'info' });
        if (added > 0) this._updateStackSection();
      });
    }
  }
}
