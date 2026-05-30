import { stateManager } from '../state/state-manager.js';

export default class HistoryPage {
  constructor(container) {
    this.container = container;
  }

  mount() {
    if (!document.getElementById('history-page-styles')) {
      const style = document.createElement('style');
      style.id = 'history-page-styles';
      style.textContent = `
        .history-date-group { border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; }
        .history-date-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 16px; background: var(--color-surface-primary);
          cursor: pointer; user-select: none;
        }
        .history-date-header:hover { background: var(--color-bg-primary); }
        .history-date-body { padding: 0 16px 14px; background: var(--color-surface-primary); display: none; }
        .history-date-body.open { display: block; }
        .history-sup-pill {
          display: inline-block; padding: 4px 10px; margin: 4px 4px 0 0;
          background: var(--color-brand-muted); color: var(--color-brand);
          border-radius: 20px; font-size: 13px; font-weight: 500;
        }
        .week-dot {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600;
        }
        .week-dot.filled { background: var(--color-brand); color: #fff; }
        .week-dot.empty { background: var(--color-bg-primary); border: 2px solid var(--color-border); color: var(--color-text-muted); }
      `;
      document.head.appendChild(style);
    }

    const state = stateManager.getState();
    const checkins = state.checkins || [];

    if (checkins.length === 0) {
      this.container.innerHTML = `
        <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
          <header>
            <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">Histórico</h1>
            <p style="color: var(--color-text-secondary); font-size: 14px;">Acompanhe sua constância de suplementação.</p>
          </header>
          <div style="background: var(--color-surface-primary); border: 1px solid var(--color-border); border-radius: 16px; padding: 48px 24px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 12px;">📋</div>
            <p style="color: var(--color-text-secondary); font-size: 15px;">Nenhum check-in ainda.</p>
            <p style="color: var(--color-text-muted); font-size: 13px; margin-top: 4px;">Faça seu primeiro check-in na aba Hoje.</p>
          </div>
        </div>
      `;
      return;
    }

    // Group checkins by date
    const byDate = {};
    for (const c of checkins) {
      const d = c.date || c.timestamp?.slice(0, 10) || 'unknown';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(c);
    }
    const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

    // Streak: consecutive days ending today
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    let streak = 0;
    const cur = new Date(today);
    while (true) {
      const s = dateStr(cur);
      if (byDate[s]) { streak++; cur.setDate(cur.getDate() - 1); }
      else break;
    }

    // Last 7 days weekly bar
    const weekDots = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const s = dateStr(d);
      const dayLabel = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()];
      weekDots.push({ label: dayLabel, filled: !!byDate[s] });
    }

    const dotsHtml = weekDots.map(w =>
      `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div class="week-dot ${w.filled ? 'filled' : 'empty'}">${w.label}</div>
      </div>`
    ).join('');

    const groupsHtml = sortedDates.map((date, idx) => {
      const items = byDate[date];
      const pills = items.map(c =>
        `<span class="history-sup-pill">${c.name || c.supplementId || 'Suplemento'}</span>`
      ).join('');
      const label = formatDate(date);
      return `
        <div class="history-date-group" data-idx="${idx}">
          <div class="history-date-header" onclick="this.nextElementSibling.classList.toggle('open')">
            <span style="font-weight: 600; font-size: 15px; color: var(--color-text-primary);">${label}</span>
            <span style="font-size: 13px; color: var(--color-text-muted);">${items.length} item${items.length !== 1 ? 's' : ''} ▾</span>
          </div>
          <div class="history-date-body${idx === 0 ? ' open' : ''}">${pills}</div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
        <header>
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">Histórico</h1>
          <p style="color: var(--color-text-secondary); font-size: 14px;">Acompanhe sua constância de suplementação.</p>
        </header>

        <div style="display: flex; gap: 16px;">
          <div style="flex:1; background: var(--color-surface-primary); border: 1px solid var(--color-border); border-radius: 16px; padding: 20px; text-align: center;">
            <div style="font-size: 36px; font-weight: 800; color: var(--color-brand);">${streak}</div>
            <div style="font-size: 13px; color: var(--color-text-secondary); margin-top: 2px;">dia${streak !== 1 ? 's' : ''} seguido${streak !== 1 ? 's' : ''} 🔥</div>
          </div>
          <div style="flex:2; background: var(--color-surface-primary); border: 1px solid var(--color-border); border-radius: 16px; padding: 20px;">
            <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Últimos 7 dias</div>
            <div style="display: flex; gap: 8px; justify-content: space-around;">${dotsHtml}</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <h2 style="font-size: 16px; font-weight: 700; color: var(--color-text-primary);">Registros</h2>
          ${groupsHtml}
        </div>
      </div>
    `;
  }

  unmount() {}
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'unknown') return 'Data desconhecida';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const pad = n => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const yestStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth()+1)}-${pad(yesterday.getDate())}`;
  if (dateStr === todayStr) return 'Hoje';
  if (dateStr === yestStr) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}
