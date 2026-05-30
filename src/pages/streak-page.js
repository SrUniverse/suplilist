/**
 * StreakPage v4.0 — SupliList
 * Timeline visual, heatmap, badges, milestones
 */

import { stateManager } from '../state/state-manager.js';
import CheckinStreakSystem from '../systems/checkin-streak-system.js';

export class StreakPage {
  constructor(container) {
    this.container = container;
    this._system   = new CheckinStreakSystem(stateManager);
    this._unsub    = null;
  }

  mount() {
    this._attachStyles();
    this._render();

    this._unsub = stateManager.subscribe?.((state, action) => {
      if (!action || ['ADD_CHECKIN','REMOVE_CHECKIN'].includes(action.type)) {
        this._render();
      }
    });
  }

  unmount() { this._unsub?.(); }

  // ── Render ────────────────────────────────────────────────────────────────
  _render() {
    const streak    = this._system.getCurrentStreak();
    const best      = this._system.getBestStreak();
    const adherence = this._system.getAdherence(30);
    const heatmap   = this._system.getHeatmapData(30);
    const badges    = this._system.getBadges();
    const milestone = this._system.getNextMilestone();
    const totalCI   = (stateManager.getState?.()?.checkins ?? []).length;

    this.container.innerHTML = `
      <div class="streak-page">

        <div class="page-header">
          <h1 class="page-title">🔥 Progresso</h1>
          <p class="page-subtitle">Sua jornada de suplementação</p>
        </div>

        <!-- Streak hero -->
        <section class="streak-hero-section">
          <streak-counter count="${streak}" record="${best}"></streak-counter>
          <div class="streak-stats-row">
            <div class="streak-stat">
              <span class="ss-value">${best}</span>
              <span class="ss-label">Recorde</span>
            </div>
            <div class="streak-stat-divider" aria-hidden="true"></div>
            <div class="streak-stat">
              <span class="ss-value">${adherence}%</span>
              <span class="ss-label">Adesão 30d</span>
            </div>
            <div class="streak-stat-divider" aria-hidden="true"></div>
            <div class="streak-stat">
              <span class="ss-value">${totalCI}</span>
              <span class="ss-label">Check-ins</span>
            </div>
          </div>
        </section>

        <!-- Milestone -->
        ${milestone ? `
          <section class="milestone-section card">
            <div class="milestone-header">
              <span class="milestone-icon">🎯</span>
              <div>
                <h3 class="milestone-title">Próximo marco: ${milestone.target} dias</h3>
                <p class="milestone-sub">${milestone.remaining} dias para o próximo badge</p>
              </div>
              <span class="milestone-pct">${milestone.progress}%</span>
            </div>
            <div class="milestone-bar" role="progressbar"
              aria-valuenow="${milestone.progress}" aria-valuemin="0" aria-valuemax="100">
              <div class="milestone-fill" style="width:${milestone.progress}%"></div>
            </div>
          </section>` : `
          <div class="milestone-complete card">
            <span>🏆 Você atingiu todos os marcos! Lendário.</span>
          </div>`}

        <!-- Heatmap -->
        <section class="heatmap-section card"
          aria-label="Heatmap de check-ins — últimos 30 dias">
          <h2 class="section-title">Últimos 30 dias</h2>
          <div class="heatmap-grid" role="list" aria-label="Calendário de adesão">
            ${heatmap.map(day => {
              const label = day.date.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
              return `<div class="heatmap-cell level-${day.level}" role="listitem"
                aria-label="${label}: ${day.count} de ${day.total} suplementos"
                title="${label}: ${day.count}/${day.total}"></div>`;
            }).join('')}
          </div>
          <div class="heatmap-legend" aria-hidden="true">
            <span>Menos</span>
            ${[0,1,2,3,4].map(l => `<div class="legend-cell level-${l}"></div>`).join('')}
            <span>Mais</span>
          </div>
        </section>

        <!-- Badges -->
        <section class="badges-section" aria-label="Conquistas">
          <h2 class="section-title">Conquistas</h2>
          <div class="badges-grid" role="list">
            ${badges.map(badge => `
              <div class="badge-card ${badge.earned ? 'earned' : 'locked'}" role="listitem"
                aria-label="${badge.label}: ${badge.earned ? 'conquistado' : 'bloqueado'}"
                title="${badge.desc}">
                <span class="badge-icon" aria-hidden="true">${badge.label.split(' ')[0]}</span>
                <span class="badge-name">${badge.label.split(' ').slice(1).join(' ')}</span>
                <span class="badge-desc">${badge.desc}</span>
                ${badge.earned && badge.earnedAt ? `
                  <span class="badge-date">
                    ${new Date(badge.earnedAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
                  </span>` : ''}
              </div>`).join('')}
          </div>
        </section>

      </div>
    `;
  }

  // ── Styles (idempotent) ───────────────────────────────────────────────────
  _attachStyles() {
    if (document.getElementById('streak-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'streak-page-styles';
    style.textContent = `
      .streak-page { display:flex; flex-direction:column; gap:20px; padding:20px 16px 100px; max-width:700px; margin:0 auto; }
      .page-header { margin-bottom:4px; }
      .page-title { font-size:24px; font-weight:800; color:#FAFAFA; margin:0 0 4px; }
      .page-subtitle { font-size:14px; color:#888; margin:0; }
      .card { background:#141414; border:1px solid #2A2A2A; border-radius:16px; padding:20px; }
      .section-title { font-size:16px; font-weight:700; color:#FAFAFA; margin:0 0 16px; }
      .streak-hero-section { display:flex; flex-direction:column; gap:16px; align-items:center; }
      .streak-stats-row { display:flex; gap:0; align-items:center; background:#141414; border:1px solid #2A2A2A; border-radius:14px; padding:16px; width:100%; max-width:400px; }
      .streak-stat { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; }
      .ss-value { font-size:24px; font-weight:900; font-family:'JetBrains Mono',monospace; color:#7C3AED; line-height:1; }
      .ss-label { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:.5px; font-weight:600; }
      .streak-stat-divider { width:1px; height:36px; background:#2A2A2A; }
      .milestone-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
      .milestone-icon { font-size:24px; flex-shrink:0; }
      .milestone-title { font-size:15px; font-weight:700; color:#FAFAFA; margin:0 0 2px; }
      .milestone-sub { font-size:12px; color:#888; margin:0; }
      .milestone-pct { font-family:'JetBrains Mono',monospace; font-size:18px; font-weight:800; color:#7C3AED; margin-left:auto; }
      .milestone-bar { height:6px; background:#2A2A2A; border-radius:999px; overflow:hidden; }
      .milestone-fill { height:100%; background:linear-gradient(90deg,#7C3AED,#00E676); border-radius:999px; transition:width 600ms ease; }
      .milestone-complete { text-align:center; color:#FFB74D; font-size:15px; font-weight:700; }
      .heatmap-grid { display:grid; grid-template-columns:repeat(10,1fr); gap:4px; margin-bottom:10px; }
      .heatmap-cell { aspect-ratio:1; border-radius:4px; cursor:default; transition:transform 150ms; }
      .heatmap-cell:hover { transform:scale(1.3); }
      .level-0 { background:#1E1E1E; border:1px solid #2A2A2A; }
      .level-1 { background:#4C1D95; }
      .level-2 { background:#6D28D9; }
      .level-3 { background:#7C3AED; }
      .level-4 { background:#00E676; }
      .heatmap-legend { display:flex; align-items:center; gap:4px; font-size:11px; color:#666; justify-content:flex-end; }
      .legend-cell { width:12px; height:12px; border-radius:3px; }
      .badges-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
      .badge-card { display:flex; flex-direction:column; align-items:center; gap:4px; padding:14px 8px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:14px; text-align:center; transition:transform 200ms,box-shadow 200ms; }
      .badge-card.earned { background:#7C3AED11; border-color:#7C3AED44; animation:badgeIn 400ms ease; }
      .badge-card.earned:hover { transform:translateY(-3px); box-shadow:0 6px 20px rgba(124,58,237,.2); }
      @keyframes badgeIn { from{opacity:0;transform:scale(.8)} to{opacity:1;transform:scale(1)} }
      .badge-card.locked { opacity:.4; filter:grayscale(1); }
      .badge-icon { font-size:28px; line-height:1; }
      .badge-name { font-size:12px; font-weight:700; color:#FAFAFA; line-height:1.2; }
      .badge-desc { font-size:11px; color:#888; line-height:1.3; }
      .badge-date { font-size:10px; color:#7C3AED; font-family:'JetBrains Mono',monospace; margin-top:2px; }
      @media (min-width:480px) {
        .badges-grid { grid-template-columns:repeat(4,1fr); }
        .heatmap-grid { grid-template-columns:repeat(15,1fr); }
      }
      @media (min-width:768px) {
        .streak-page { padding:32px 24px 80px; }
        .badges-grid { grid-template-columns:repeat(5,1fr); }
        .heatmap-grid { grid-template-columns:repeat(30,1fr); }
      }
    `;
    document.head.appendChild(style);
  }
}

export default StreakPage;
