import { stateManager } from '../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import { todayISO, offsetISO } from '../utils/date.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');
const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const formatMonthYear = (isoDate) => {
  if (!isoDate) return '';
  const [y, m] = isoDate.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
};

const CATEGORIES = ['Todos', 'Proteínas', 'Aminoácidos', 'Adaptógenos', 'Vitaminas', 'Energéticos & Foco', 'Força & Performance', 'Antioxidantes & Saúde'];

// Map supplementId → DB entry
const buildSupMap = () => {
  const map = {};
  for (const s of SUPPLEMENTS_DB) map[s.id] = s;
  return map;
};

// Average cost per day from stack (placeholder: sum of maintenance doses × pricePerGram)
const estimateDailyCost = (stack, supMap) => {
  let total = 0;
  for (const item of stack) {
    const sid = item.supplementId ?? item.id;
    const db = supMap[sid];
    if (db && db.dosage && db.pricePerGram) {
      total += (db.dosage.maintenance || 5) * db.pricePerGram;
    }
  }
  return total;
};

export default class HistoryPage {
  constructor(container) {
    this.container = container;
    this._unsubscribe = null;
    this._searchQuery = '';
    this._activeCategory = 'Todos';
    this._expandedCards = new Set();
  }

  mount() {
    this._injectStyles();
    this._render();
    this._unsubscribe = stateManager.subscribe(() => this._render());
  }

  unmount() {
    this._unsubscribe?.();
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────
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
        padding: 14px 12px;
        display: flex; flex-direction: column; gap: 4px;
        align-items: center; text-align: center;
      }
      .hp-stat-value { font-size: 22px; font-weight: 800; color: var(--color-brand); line-height: 1; }
      .hp-stat-label { font-size: 11px; color: var(--color-text-secondary); line-height: 1.3; }

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
      .hp-day-dot.today-filled { background: var(--color-brand); color: #fff; box-shadow: 0 0 0 2px rgba(124,58,237,0.4); }
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
    `;
    document.head.appendChild(style);
  }

  // ─── Main render ─────────────────────────────────────────────────────────────
  _render() {
    const state = stateManager.getState();
    const checkins = state.checkins || [];
    const stack = state.stack || [];
    const supMap = buildSupMap();

    // ── Stats ──────────────────────────────────────────────────────────────────
    const today = todayISO();
    const daysInRange = 30;
    const daysSet = new Set(checkins.map(c => c.date).filter(Boolean));
    const totalCycles = daysSet.size;

    // Days with checkin in last 30 days
    let daysWithCheckin = 0;
    for (let i = 0; i < daysInRange; i++) {
      if (daysSet.has(offsetISO(i))) daysWithCheckin++;
    }
    const adherencePct = daysInRange > 0 ? Math.round((daysWithCheckin / daysInRange) * 100) : 0;

    // Investment: daily cost × days registered
    const dailyCost = estimateDailyCost(stack, supMap);
    const investTotal = (dailyCost * totalCycles).toFixed(2).replace('.', ',');

    // ── Last 7 days calendar ──────────────────────────────────────────────────
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

    // ── Group checkins by supplementId ────────────────────────────────────────
    const bySupp = {};
    for (const ck of checkins) {
      const sid = ck.supplementId || 'unknown';
      if (!bySupp[sid]) bySupp[sid] = [];
      bySupp[sid].push(ck.date || '');
    }

    // Build display entries
    let entries = Object.entries(bySupp).map(([sid, dates]) => {
      const db = supMap[sid];
      const sortedDates = [...new Set(dates)].filter(Boolean).sort();
      const firstDate = sortedDates[0] || '';
      const lastDate = sortedDates[sortedDates.length - 1] || '';
      const totalDays = sortedDates.length;

      // Adherence: days with checkin / days since first checkin (or 30, whichever smaller)
      const daysSinceFirst = firstDate ? Math.max(1, Math.ceil((new Date(today) - new Date(firstDate)) / 86400000) + 1) : 1;
      const windowDays = Math.min(daysSinceFirst, 30);
      const adPct = Math.round((totalDays / windowDays) * 100);

      return {
        sid,
        name: db?.name || sid,
        category: db?.category || '',
        image: db?.image || null,
        firstDate,
        lastDate,
        totalDays,
        totalPossible: windowDays,
        adPct,
        dates: sortedDates.reverse(), // newest first
        lastCheckin: lastDate
      };
    });

    // Sort by most recent checkin
    entries.sort((a, b) => b.lastCheckin.localeCompare(a.lastCheckin));

    // Apply search filter
    const q = this._searchQuery.toLowerCase().trim();
    if (q) entries = entries.filter(e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));

    // Apply category filter
    if (this._activeCategory !== 'Todos') {
      entries = entries.filter(e => e.category === this._activeCategory);
    }

    // ── Build HTML ────────────────────────────────────────────────────────────
    const statsHtml = `
      <div class="hp-stats">
        <div class="hp-stat-card">
          <div class="hp-stat-value">${adherencePct}%</div>
          <div class="hp-stat-label">Média de Adesão<br><span style="color:var(--color-text-muted);font-size:10px;">(últimos 30 dias)</span></div>
        </div>
        <div class="hp-stat-card">
          <div class="hp-stat-value">${totalCycles}</div>
          <div class="hp-stat-label">Total de<br>Ciclos</div>
        </div>
        <div class="hp-stat-card">
          <div class="hp-stat-value" style="font-size:16px;">R$${investTotal}</div>
          <div class="hp-stat-label">Investimento<br>Total</div>
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
          value="${this._searchQuery.replace(/"/g, '&quot;')}"
          id="hp-search"
        />
        <div class="hp-chips">
          ${CATEGORIES.map(cat => `
            <button class="hp-chip ${this._activeCategory === cat ? 'active' : ''}" data-cat="${cat}">${cat}</button>
          `).join('')}
        </div>
      </div>
    `;

    let listHtml;
    if (checkins.length === 0) {
      listHtml = `
        <div class="hp-empty">
          <div class="hp-empty-icon">📋</div>
          <div class="hp-empty-title">Nenhum check-in registrado ainda</div>
          <div class="hp-empty-sub">Registre seus suplementos diários para acompanhar sua constância.</div>
          <button class="hp-cta-btn" id="hp-cta-checkin">Fazer Check-in Agora</button>
        </div>
      `;
    } else if (entries.length === 0) {
      listHtml = `
        <div class="hp-empty">
          <div class="hp-empty-icon">🔍</div>
          <div class="hp-empty-title">Nenhum resultado</div>
          <div class="hp-empty-sub">Tente outro nome ou categoria.</div>
        </div>
      `;
    } else {
      const cardsHtml = entries.map(e => {
        const isExpanded = this._expandedCards.has(e.sid);
        const adClass = e.adPct >= 80 ? 'green' : e.adPct >= 60 ? 'yellow' : 'red';
        const firstLabel = e.firstDate ? formatMonthYear(e.firstDate) : '—';
        const lastLabel = e.lastDate === today ? 'Presente' : (e.lastDate ? formatMonthYear(e.lastDate) : '—');
        const imgHtml = e.image
          ? `<img class="hp-sup-img" src="${e.image}" alt="${e.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : '';
        const placeholderHtml = `<div class="hp-sup-img-placeholder" ${e.image ? 'style="display:none"' : ''}>💊</div>`;

        const logsHtml = e.dates.map(d => {
          const [yr, mo, dy] = d.split('-');
          const label = new Date(parseInt(yr), parseInt(mo) - 1, parseInt(dy))
            .toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
          return `<div class="hp-log-date">${label}</div>`;
        }).join('');

        return `
          <div class="hp-sup-card" data-sid="${e.sid}">
            <div class="hp-sup-header" data-toggle="${e.sid}">
              ${imgHtml}${placeholderHtml}
              <div class="hp-sup-info">
                <div class="hp-sup-name">${e.name}</div>
                <div class="hp-sup-meta">
                  ${e.category ? `<span class="hp-badge-cat">${e.category}</span>` : ''}
                  <span class="hp-sup-range">${firstLabel} → ${lastLabel}</span>
                </div>
                <div style="margin-top:4px;">
                  <span class="hp-adherence ${adClass}">${e.adPct}% adesão</span>
                  <span style="font-size:12px;color:var(--color-text-muted);"> (${e.totalDays}/${e.totalPossible} dias)</span>
                </div>
              </div>
              <button class="hp-expand-btn" data-toggle="${e.sid}">${isExpanded ? 'Fechar ▲' : 'Ver Logs ▼'}</button>
            </div>
            <div class="hp-logs-panel ${isExpanded ? 'open' : ''}" id="hp-logs-${e.sid}">
              <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:2px;">${e.totalDays} check-in${e.totalDays !== 1 ? 's' : ''} registrado${e.totalDays !== 1 ? 's' : ''}</div>
              ${logsHtml}
            </div>
          </div>
        `;
      }).join('');

      listHtml = `
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div class="hp-section-title">${entries.length} suplemento${entries.length !== 1 ? 's' : ''} com histórico</div>
          ${cardsHtml}
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="hp-root">
        <header>
          <h1 style="font-size:24px;font-weight:800;margin:0 0 4px;font-family:'Syne',sans-serif;color:var(--color-text-primary);">Histórico</h1>
          <p style="color:var(--color-text-secondary);font-size:14px;margin:0;">Acompanhe sua constância de suplementação.</p>
        </header>
        ${statsHtml}
        ${calendarHtml}
        ${searchHtml}
        ${listHtml}
      </div>
    `;

    this._attachListeners();
  }

  // ─── Event listeners ─────────────────────────────────────────────────────────
  _attachListeners() {
    // Search input
    const searchEl = this.container.querySelector('#hp-search');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        this._searchQuery = e.target.value;
        this._render();
      });
    }

    // Category chips
    this.container.querySelectorAll('.hp-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeCategory = btn.dataset.cat;
        this._render();
      });
    });

    // Toggle log panels
    this.container.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const sid = el.dataset.toggle;
        if (!sid) return;
        if (this._expandedCards.has(sid)) {
          this._expandedCards.delete(sid);
        } else {
          this._expandedCards.add(sid);
        }
        this._render();
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
  }
}
