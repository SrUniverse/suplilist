/**
 * @fileoverview Controlador da Página Inicial (HomePage) do SupliList v3.0.
 * Fase 2: Check-in Diário com streak visual de 7 dias, barra de progresso animada,
 * toasts comemorativos em marcos e reatividade completa via EventBus.
 *
 * @author SupliList Team
 * @version 3.0.0
 */

import { stateManager } from '../core/state-manager.js';
import { eventBus }     from '../core/eventbus.js';
import { logger }       from '../utils/logger.js';
import { toast }        from './toast.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';

/* ══════════════════════════════════════════════════════════════
   ESTILOS (injetados uma única vez)
   ══════════════════════════════════════════════════════════════ */

function _injectStyles() {
  if (document.getElementById('home-page-styles')) return;
  const s = document.createElement('style');
  s.id = 'home-page-styles';
  s.textContent = `
    .home-wrap {
      max-width: 860px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 32px;
    }

    /* ── Cabeçalho ──────────────────────────────────────────── */
    .home-header { display: flex; flex-direction: column; gap: 4px; }
    .home-title {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 850;
      color: var(--t1);
      margin: 0;
      letter-spacing: -0.02em;
    }
    .home-subtitle { font-family: 'Inter', sans-serif; font-size: 13px; color: var(--t3); margin: 0; }

    /* ── Cards base ─────────────────────────────────────────── */
    .home-card {
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 24px;
    }
    .home-card-title {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--t3);
      margin: 0 0 16px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* ── Streak row ─────────────────────────────────────────── */
    .streak-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .streak-count {
      font-family: 'Outfit', sans-serif;
      font-size: 40px;
      font-weight: 850;
      color: var(--t1);
      line-height: 1;
    }
    .streak-count span { color: var(--brand-primary); font-size: 20px; margin-left: 6px; }
    .streak-label { font-family: 'Inter', sans-serif; font-size: 12px; color: var(--t3); margin-top: 2px; }

    /* ── Barra de progresso ──────────────────────────────────── */
    .streak-progress-label {
      display: flex;
      justify-content: space-between;
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 600;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .streak-bar-track {
      width: 100%;
      height: 8px;
      background: var(--bg-darker);
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    .streak-bar-fill {
      height: 100%;
      background: var(--brand-primary);
      border-radius: 4px;
      transition: width 0.7s cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 0;
    }
    .streak-bar-fill.full { background: linear-gradient(90deg, var(--brand-green), #4ade80); }

    /* ── Grade de 7 dias ─────────────────────────────────────── */
    .week-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin-top: 14px;
    }
    .week-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .week-day-label {
      font-family: 'Inter', sans-serif;
      font-size: 9px;
      font-weight: 600;
      color: var(--t3);
      text-transform: uppercase;
    }
    .week-day-dot {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      background: var(--bg-darker);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.2s;
      color: var(--t1);
    }
    .week-day-dot.done {
      background: rgba(16,185,129,0.15);
      border-color: rgba(16,185,129,0.3);
      color: var(--brand-green);
    }
    .week-day-dot.today {
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 2px var(--shadow-glow);
    }
    .week-day-dot.today.done {
      background: rgba(16,185,129,0.15);
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 2px var(--shadow-glow);
    }

    /* ── Botão de check-in ───────────────────────────────────── */
    .checkin-btn-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .checkin-info { flex: 1; }
    .checkin-info p {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--t1);
      margin: 0 0 2px;
    }
    .checkin-info small {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      color: var(--t3);
    }
    .btn-checkin {
      padding: 12px 24px;
      border-radius: 14px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-checkin.pending {
      background: var(--brand-primary);
      color: var(--text-inverse);
    }
    .btn-checkin.pending:hover { background: var(--brand-primary-hover); transform: translateY(-1px); box-shadow: var(--shadow-glow-strong); }
    .btn-checkin.done {
      background: rgba(16,185,129,0.12);
      color: var(--brand-green);
      border: 1px solid rgba(16,185,129,0.25);
    }
    .btn-checkin.done:hover { background: rgba(16,185,129,0.2); }
    .btn-checkin:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

    /* ── Empty state check-in ────────────────────────────────── */
    .checkin-empty {
      text-align: center;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .checkin-empty p { font-family: 'Inter', sans-serif; font-size: 13px; color: var(--t3); margin: 0; }
    .btn-explore {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border-radius: 12px;
      background: var(--shadow-glow);
      color: var(--brand-primary);
      border: 1px solid var(--brand-primary);
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-explore:hover { background: var(--shadow-glow-strong); }

    /* ── Quick access grid ───────────────────────────────────── */
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    @media (max-width: 600px) {
      .quick-grid { grid-template-columns: 1fr 1fr; }
      .week-day-dot { width: 28px; height: 28px; font-size: 12px; }
    }
    .quick-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 20px;
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
    }
    .quick-card:hover {
      background: var(--bg-darker);
      border-color: var(--brand-primary);
      transform: translateY(-2px);
    }
    .quick-card-icon { font-size: 24px; }
    .quick-card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: var(--t1);
    }
    .quick-card-sub {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      color: var(--t3);
      line-height: 1.4;
    }
    .quick-card-cta {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: var(--brand-primary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 4px;
    }

    /* ── Confetti ───────────────────────────────────────────── */
    .confetti-wrap {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    }
    .confetti-piece {
      position: absolute;
      width: 8px;
      height: 8px;
      opacity: 0;
      animation: confetti-fall 1.2s ease-in forwards;
    }
    @keyframes confetti-fall {
      0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

/** Retorna array com os últimos N dias (ISO YYYY-MM-DD), mais recente primeiro. */
function _lastNDays(n) {
  const days = [];
  const cursor = new Date();
  for (let i = 0; i < n; i++) {
    days.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() - 1);
  }
  return days; // [hoje, ontem, anteontem, ...]
}

/** Lança mini-confetti animado quando o usuário faz o check-in. */
function _spawnConfetti() {
  const wrap = document.createElement('div');
  wrap.className = 'confetti-wrap';
  const COLORS = ['#7c3aed','#a855f7','#22c55e','#f59e0b','#f4f4f5','#ec4899'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      top: -10px;
      background: ${COLORS[Math.floor(Math.random() * COLORS.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      width: ${6 + Math.random() * 6}px;
      height: ${6 + Math.random() * 6}px;
      animation-delay: ${Math.random() * 0.4}s;
      animation-duration: ${0.9 + Math.random() * 0.6}s;
    `;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2000);
}

/** Mensagem de toast baseada no streak atual. */
function _getStreakToast(streak) {
  if (streak === 7)  return { msg: '🔥 7 dias seguidos! Você está em chamas!', type: 'success' };
  if (streak === 14) return { msg: '💪 14 dias! Disciplina de atleta!', type: 'success' };
  if (streak === 30) return { msg: '🏆 30 DIAS! MONSTRO DA CONSISTÊNCIA!', type: 'success' };
  if (streak === 1)  return { msg: '✅ Check-in concluído. Comece a sequência!', type: 'success' };
  return { msg: `🔥 ${streak} dias seguidos! Continue assim!`, type: 'success' };
}

/* ══════════════════════════════════════════════════════════════
   CLASSE PRINCIPAL
   ══════════════════════════════════════════════════════════════ */

class HomePageController {
  constructor(container) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    this._cleanupFns = [];

    if (!this.container) {
      logger.error('HomePageController: Elemento contêiner inválido.');
    }
  }

  init() {
    _injectStyles();
    this._render();
    this._setupListeners();
    this._subscribeToEvents();
  }

  /* ── Cálculos ──────────────────────────────────────────────── */

  _calculateStreak() {
    const checkIns = stateManager.getState('checkins') || {};
    let streak = 0;
    const cursor = new Date();
    while (streak < 365) {
      const dateStr = cursor.toISOString().split('T')[0];
      if (!checkIns[dateStr]) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  _getCounts() {
    const supplements = supplementRepo.getAll() || [];
    const favorites   = stateManager.getState('favorites') || [];
    const stackState  = stateManager.getState('stack') || {};
    const stackItems  = Array.isArray(stackState) ? stackState : (stackState.items || []);
    return {
      supplementsCount: supplements.length || 57,
      stackCount: stackItems.length || favorites.length || 0,
    };
  }

  /* ── Renderização ──────────────────────────────────────────── */

  _render() {
    if (!this.container) return;

    const checkIns         = stateManager.getState('checkins') || {};
    const today            = new Date().toISOString().split('T')[0];
    const isCheckedToday   = !!checkIns[today];
    const streak           = this._calculateStreak();
    const progressPercent  = Math.min(100, streak > 0 ? Math.round((streak / 7) * 100) : 0);
    const isMeta           = progressPercent >= 100;
    const favorites        = stateManager.getState('favorites') || [];
    const { supplementsCount, stackCount } = this._getCounts();

    // Grade dos últimos 7 dias
    const last7 = _lastNDays(7).reverse(); // segunda → hoje
    const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // Dom→Sab
    const weekGridHtml = last7.map((dateStr, idx) => {
      const done    = !!checkIns[dateStr];
      const isToday = dateStr === today;
      const d       = new Date(dateStr + 'T00:00:00');
      const label   = DAY_LABELS[d.getDay()];
      return `
        <div class="week-day">
          <span class="week-day-label">${label}</span>
          <div class="week-day-dot${done ? ' done' : ''}${isToday ? ' today' : ''}" title="${dateStr}">
            ${done ? '✓' : ''}
          </div>
        </div>
      `;
    }).join('');

    // Widget de check-in
    const checkinSection = favorites.length === 0
      ? `<div class="checkin-empty">
           <p>Você ainda não tem suplementos no protocolo.</p>
           <a href="#/list" class="btn-explore">⚡ Explorar Catálogo</a>
         </div>`
      : `<div class="checkin-btn-row">
           <div class="checkin-info">
             <p>${isCheckedToday ? '✅ Check-in de hoje concluído!' : 'Check-in de Hoje'}</p>
             <small>${isCheckedToday
               ? `Sequência ativa: ${streak} dia${streak !== 1 ? 's' : ''} consecutivos`
               : `Marque se consumiu sua suplementação hoje (${today})`
             }</small>
           </div>
           <button id="btn-check-in" class="btn-checkin ${isCheckedToday ? 'done' : 'pending'}">
             ${isCheckedToday ? '✓ Concluído' : '⚡ Marcar Hoje'}
           </button>
         </div>`;

    this.container.innerHTML = `
      <div class="home-wrap">

        <!-- Cabeçalho -->
        <div class="home-header">
          <h1 class="home-title">Dashboard Clínico</h1>
          <p class="home-subtitle">Acompanhe sua consistência e acesse rapidamente suas ferramentas.</p>
        </div>

        <!-- Card: Streak + 7 dias -->
        <div class="home-card">
          <p class="home-card-title">🔥 Streak de Consistência</p>

          <div class="streak-row">
            <div>
              <div class="streak-count">${streak}<span>dias</span></div>
              <div class="streak-label">consecutivos</div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:'Inter',sans-serif;font-size:11px;color:#71717a;">Meta semanal</div>
              <div style="font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:${isMeta ? '#22c55e' : '#a855f7'};">
                ${progressPercent}%
              </div>
            </div>
          </div>

          <div class="streak-progress-label">
            <span>Progresso (7 dias)</span>
            <span>${streak >= 7 ? '🏆 Meta atingida!' : `${7 - Math.min(streak,7)} dia${7 - Math.min(streak,7) !== 1 ? 's' : ''} para meta`}</span>
          </div>
          <div class="streak-bar-track">
            <div class="streak-bar-fill ${isMeta ? 'full' : ''}"
                 style="width:${Math.max(0, progressPercent)}%"></div>
          </div>

          <!-- Grade 7 dias -->
          <div class="week-grid">${weekGridHtml}</div>
        </div>

        <!-- Card: Check-in -->
        <div class="home-card">
          <p class="home-card-title">✅ Check-in Diário</p>
          ${checkinSection}
        </div>

        <!-- Acesso Rápido -->
        <div>
          <p class="home-card-title" style="margin-bottom:12px;">🧭 Acesso Rápido</p>
          <div class="quick-grid">

            <a href="#/list" class="quick-card">
              <span class="quick-card-icon">⚡</span>
              <span class="quick-card-title">Catálogo</span>
              <span class="quick-card-sub">${supplementsCount} suplementos catalogados</span>
              <span class="quick-card-cta">Explorar →</span>
            </a>

            <a href="#/dosage" class="quick-card">
              <span class="quick-card-icon">⚗</span>
              <span class="quick-card-title">Dosagem</span>
              <span class="quick-card-sub">Calcular dose personalizada</span>
              <span class="quick-card-cta">Calcular →</span>
            </a>

            <a href="#/my-stack" class="quick-card">
              <span class="quick-card-icon">◇</span>
              <span class="quick-card-title">Meu Stack</span>
              <span class="quick-card-sub">${stackCount} composto${stackCount !== 1 ? 's' : ''} no protocolo</span>
              <span class="quick-card-cta">Ver Stack →</span>
            </a>

            <a href="#/favorites" class="quick-card">
              <span class="quick-card-icon">♡</span>
              <span class="quick-card-title">Favoritos</span>
              <span class="quick-card-sub">${favorites.length} suplemento${favorites.length !== 1 ? 's' : ''} salvo${favorites.length !== 1 ? 's' : ''}</span>
              <span class="quick-card-cta">Ver →</span>
            </a>

            <a href="#/history" class="quick-card">
              <span class="quick-card-icon">📈</span>
              <span class="quick-card-title">Histórico</span>
              <span class="quick-card-sub">Veja seus ciclos e adesão</span>
              <span class="quick-card-cta">Analisar →</span>
            </a>

            <a href="#/recipe" class="quick-card">
              <span class="quick-card-icon">📄</span>
              <span class="quick-card-title">Receitas</span>
              <span class="quick-card-sub">Protocolos prontos de suplementação</span>
              <span class="quick-card-cta">Ver →</span>
            </a>

          </div>
        </div>

      </div>
    `;
  }

  /* ── Listeners ─────────────────────────────────────────────── */

  _setupListeners() {
    const btn = this.container?.querySelector('#btn-check-in');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const checkIns = { ...(stateManager.getState('checkins') || {}) };
      const today    = new Date().toISOString().split('T')[0];

      if (checkIns[today]) {
        // Desfaz o check-in
        delete checkIns[today];
        stateManager.setState('checkins', checkIns);
        toast.show('Check-in removido.', 'info');
      } else {
        // Registra o check-in
        checkIns[today] = true;
        stateManager.setState('checkins', checkIns);

        // Calcula streak atualizado
        const newStreak = this._calculateStreak();
        const { msg, type } = _getStreakToast(newStreak);
        toast.show(msg, type);
        _spawnConfetti();
        eventBus.emit('home:checkin:completed', { date: today, streak: newStreak });
      }

      // Re-renderiza apenas o card sem rebuild completo
      this._render();
      this._setupListeners();
    });
  }

  _subscribeToEvents() {
    const reRender = () => { this._render(); this._setupListeners(); };
    this._cleanupFns.push(
      eventBus.on('favorites:updated',  reRender),
      eventBus.on('state:imported',     reRender),
      eventBus.on('supplements:loaded', reRender),
    );
  }

  destroy() {
    this._cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
    this._cleanupFns = [];
    logger.info('HomePageController destruído.');
  }
}

/* ══════════════════════════════════════════════════════════════
   FACTORY EXPORT
   ══════════════════════════════════════════════════════════════ */

const _createHomePage = (container = '#page-content') => {
  const ctrl = new HomePageController(container);
  ctrl.init();
  return ctrl;
};

export const createHomePage = _createHomePage;
