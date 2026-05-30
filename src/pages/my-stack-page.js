/**
 * MyStackPage — SupliList
 * My Stack: full visual rebuild with metrics, list, add modal, replenishment sidebar
 */

import { stateManager, ACTIONS } from '../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';

// Prices loaded lazily from /data/prices.json
let PRICES_DB = null;
async function fetchPrices() {
  if (PRICES_DB) return PRICES_DB;
  try {
    const res = await fetch('/data/prices.json');
    PRICES_DB = await res.json();
  } catch (_) {
    PRICES_DB = {};
  }
  return PRICES_DB;
}

// ─── Evidence badge helper ───────────────────────────────────────────────────
function evidenceBadge(level) {
  const map = {
    A: { bg: 'rgba(34,197,94,0.12)', color: '#22C55E', label: 'Evidência A' },
    B: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'Evidência B' },
    C: { bg: 'rgba(163,163,163,0.12)', color: '#9A9A9A', label: 'Evidência C' },
  };
  const s = map[level] ?? map['C'];
  return `<span style="background:${s.bg};color:${s.color};font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:.4px;">${s.label}</span>`;
}

// ─── Format helpers ──────────────────────────────────────────────────────────
function fmtBRL(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

function calcMonthlyInvestment(stack) {
  return stack.reduce((acc, item) => {
    const dbEntry = SUPPLEMENTS_DB.find(s => s.id === (item.supplementId ?? item.id));
    const ppg = dbEntry?.pricePerGram ?? 0;
    const dosage = parseFloat(item.dosage) || 0;
    return acc + dosage * ppg * 30;
  }, 0);
}

function calcAdherenceRate(stack) {
  if (!stack.length) return '0%';
  const streak = stateManager.calculateStreak?.() ?? 0;
  if (!streak) return '0%';
  // Last 7 days: how many days have at least one checkin of any supplement in stack
  const today = new Date();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const checkins = stateManager.checkins ?? [];
  const checkinDays = new Set(checkins.map(c => c.date));
  const daysHit = days.filter(d => checkinDays.has(d)).length;
  return Math.round((daysHit / 7) * 100) + '%';
}

function getSupplementImage(item) {
  const dbEntry = SUPPLEMENTS_DB.find(s => s.id === (item.supplementId ?? item.id));
  if (dbEntry?.image) return dbEntry.image;
  const slug = (item.name ?? '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `/assets/${slug}.png`;
}

function getEvidenceLevel(item) {
  const dbEntry = SUPPLEMENTS_DB.find(s => s.id === (item.supplementId ?? item.id));
  return dbEntry?.evidenceLevel ?? 'C';
}

function calcDaysLeft(item) {
  const qty = parseFloat(item.quantity);
  const dosage = parseFloat(item.dosage);
  if (!qty || !dosage || dosage <= 0) return null;
  return Math.max(0, Math.floor(qty / dosage));
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const STYLES = `
  /* Layout */
  .msp-wrap {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px 16px 120px;
    max-width: 960px;
    margin: 0 auto;
  }

  /* Header */
  .msp-header-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 28px;
    color: var(--color-text-primary);
    margin: 0 0 4px;
  }
  .msp-header-sub {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 0;
  }

  /* Stat cards */
  .msp-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  @media (max-width: 480px) {
    .msp-stats { grid-template-columns: 1fr; }
  }
  .msp-stat-card {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .msp-stat-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .msp-stat-value {
    font-size: 22px;
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1.1;
  }
  .msp-stat-value.brand { color: var(--color-brand); }

  /* Desktop: two-column layout for list + sidebar */
  .msp-body {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 768px) {
    .msp-body { grid-template-columns: 1fr; }
  }

  /* Section header */
  .msp-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .msp-section-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }
  .msp-btn-add {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
  }
  .msp-btn-add:hover { background: var(--color-brand-hover); }

  /* Stack list */
  .msp-list { display: flex; flex-direction: column; gap: 10px; }

  /* Empty state */
  .msp-empty {
    text-align: center;
    padding: 56px 20px;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: var(--color-surface-primary);
    border: 1px dashed var(--color-border-strong);
    border-radius: 16px;
  }
  .msp-empty-icon { font-size: 52px; margin-bottom: 4px; }
  .msp-empty-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin: 0; }
  .msp-empty-desc { font-size: 13px; color: var(--color-text-secondary); margin: 0; }
  .msp-empty-cta {
    margin-top: 10px;
    padding: 11px 24px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
  }
  .msp-empty-cta:hover { background: var(--color-brand-hover); }

  /* Stack item card */
  .msp-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    transition: border-color 200ms;
  }
  .msp-item:hover { border-color: var(--color-border-strong); }
  .msp-item-img {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    object-fit: contain;
    background: var(--color-surface-secondary);
    flex-shrink: 0;
  }
  .msp-item-info { flex: 1; min-width: 0; }
  .msp-item-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .msp-item-dosage {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin: 0 0 4px;
  }
  .msp-item-stock {
    font-size: 11px;
    color: var(--color-text-muted);
    margin: 0;
  }
  .msp-item-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }
  .msp-item-actions {
    display: flex;
    gap: 4px;
  }
  .msp-btn-icon {
    background: none;
    border: none;
    padding: 6px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    transition: background 150ms;
    color: var(--color-text-secondary);
  }
  .msp-btn-icon:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
  .msp-btn-icon.del:hover { background: var(--color-error-bg); color: var(--color-error); }

  /* Inline edit form */
  .msp-inline-edit {
    padding: 14px 16px;
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border-strong);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .msp-inline-edit-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: .4px;
    margin: 0;
  }
  .msp-inline-row { display: flex; gap: 8px; align-items: flex-end; }
  .msp-inline-field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .msp-inline-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .msp-input {
    width: 100%;
    padding: 9px 12px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    transition: border-color 150ms;
  }
  .msp-input:focus { border-color: var(--color-brand); }
  .msp-input::placeholder { color: var(--color-text-muted); }
  .msp-select {
    padding: 9px 12px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
    transition: border-color 150ms;
  }
  .msp-select:focus { border-color: var(--color-brand); }
  .msp-inline-btns { display: flex; gap: 8px; justify-content: flex-end; }
  .msp-btn-save {
    padding: 9px 20px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
  }
  .msp-btn-save:hover { background: var(--color-brand-hover); }
  .msp-btn-cancel {
    padding: 9px 16px;
    background: none;
    border: 1px solid var(--color-border-strong);
    border-radius: 10px;
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 150ms;
  }
  .msp-btn-cancel:hover { border-color: var(--color-brand); color: var(--color-text-primary); }

  /* Add supplement modal overlay */
  .msp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.7);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    backdrop-filter: blur(4px);
    animation: msp-fadein 180ms ease;
  }
  @media (min-width: 600px) {
    .msp-modal-overlay { align-items: center; padding: 24px; }
  }
  @keyframes msp-fadein { from { opacity:0 } to { opacity:1 } }
  .msp-modal {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border-strong);
    border-radius: 20px 20px 0 0;
    padding: 24px 20px 40px;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: msp-slideup 220ms ease;
  }
  @media (min-width: 600px) {
    .msp-modal { border-radius: 20px; padding: 28px 24px 28px; }
  }
  @keyframes msp-slideup { from { transform:translateY(40px); opacity:0 } to { transform:translateY(0); opacity:1 } }
  .msp-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .msp-modal-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }
  .msp-modal-close {
    background: var(--color-surface-secondary);
    border: none;
    color: var(--color-text-secondary);
    font-size: 18px;
    line-height: 1;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
  }
  .msp-modal-close:hover { color: var(--color-text-primary); }
  .msp-modal-field { display: flex; flex-direction: column; gap: 6px; position: relative; }
  .msp-modal-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .msp-modal-row { display: flex; gap: 8px; }
  .msp-modal-row .msp-input { flex: 1; }

  /* Search results in modal */
  .msp-search-results {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 10;
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border-strong);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(0,0,0,.5);
    max-height: 220px;
    overflow-y: auto;
  }
  .msp-result-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: background 100ms;
  }
  .msp-result-btn:hover { background: var(--color-surface-hover); }
  .msp-result-img {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    object-fit: contain;
    background: var(--color-surface-primary);
    flex-shrink: 0;
  }
  .msp-result-info { display: flex; flex-direction: column; gap: 2px; }
  .msp-result-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
  .msp-result-cat { font-size: 11px; color: var(--color-text-muted); }
  .msp-modal-submit {
    padding: 12px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
    margin-top: 4px;
  }
  .msp-modal-submit:hover { background: var(--color-brand-hover); }

  /* Replenishment sidebar */
  .msp-sidebar-card {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 18px 16px;
  }
  .msp-sidebar-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .msp-replen-list { display: flex; flex-direction: column; gap: 12px; }
  .msp-replen-item { display: flex; flex-direction: column; gap: 4px; }
  .msp-replen-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .msp-replen-price {
    font-size: 12px;
    color: var(--color-success);
    font-weight: 600;
  }
  .msp-replen-market {
    font-size: 11px;
    color: var(--color-text-muted);
  }
  .msp-replen-empty {
    font-size: 12px;
    color: var(--color-text-muted);
    text-align: center;
    padding: 16px 0;
  }
  .msp-replen-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0;
  }
`;

export class MyStackPage {
  constructor(container) {
    this.container = container;
    this._unsub = null;
    this._editId = null;
    this._modalOpen = false;
    this._prices = null;
  }

  mount() {
    this._attachStyles();
    this._render();
    fetchPrices().then(prices => {
      this._prices = prices;
      this._renderReplenishment();
    });

    this._unsub = stateManager.subscribe((state, action) => {
      const relevant = ['ADD_TO_STACK', 'REMOVE_FROM_STACK', 'UPDATE_STACK_ITEM', 'SET_STACK_QUANTITY', 'ADD_CHECKIN'];
      if (!action || relevant.includes(action.type)) {
        this._renderAll();
      }
    });
  }

  unmount() {
    this._unsub?.();
    this._closeModal();
  }

  // ─── Styles ────────────────────────────────────────────────────────────────
  _attachStyles() {
    if (document.getElementById('msp2-styles')) return;
    const style = document.createElement('style');
    style.id = 'msp2-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  _render() {
    this.container.innerHTML = `
      <div class="msp-wrap">
        <!-- Header -->
        <div>
          <h1 class="msp-header-title">📦 Meu Stack</h1>
          <p class="msp-header-sub" id="msp-subtitle">Carregando...</p>
        </div>

        <!-- Stat cards -->
        <div class="msp-stats" id="msp-stats"></div>

        <!-- Body: list + sidebar -->
        <div class="msp-body">
          <!-- Left: stack list -->
          <div>
            <div class="msp-section-header">
              <h2 class="msp-section-title">Suplementos Ativos</h2>
              <button class="msp-btn-add" id="msp-open-modal">
                <span>+</span> Adicionar Suplemento
              </button>
            </div>
            <div class="msp-list" id="msp-list"></div>
          </div>

          <!-- Right: replenishment sidebar -->
          <aside>
            <div class="msp-sidebar-card">
              <h3 class="msp-sidebar-title">🛒 Reposição &amp; Arbitragem</h3>
              <div id="msp-replenishment" class="msp-replen-list">
                <p class="msp-replen-empty">Carregando preços...</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    this._renderAll();
    this._attachDelegatedListeners();

    this.container.querySelector('#msp-open-modal')?.addEventListener('click', () => this._openModal());
  }

  // ─── Render all dynamic sections ──────────────────────────────────────────
  _renderAll() {
    this._renderSubtitle();
    this._renderStats();
    this._renderList();
    if (this._prices) this._renderReplenishment();
  }

  _renderSubtitle() {
    const stack = stateManager.stack ?? [];
    const total = calcMonthlyInvestment(stack);
    const el = this.container.querySelector('#msp-subtitle');
    if (!el) return;
    el.textContent = `${stack.length} suplemento${stack.length !== 1 ? 's' : ''} ativo${stack.length !== 1 ? 's' : ''} · ${fmtBRL(total)}/mês estimado`;
  }

  _renderStats() {
    const el = this.container.querySelector('#msp-stats');
    if (!el) return;
    const stack = stateManager.stack ?? [];
    const monthly = calcMonthlyInvestment(stack);
    const adherence = calcAdherenceRate(stack);

    el.innerHTML = `
      <div class="msp-stat-card">
        <span class="msp-stat-label">Investimento Mensal</span>
        <span class="msp-stat-value brand">${fmtBRL(monthly)}</span>
      </div>
      <div class="msp-stat-card">
        <span class="msp-stat-label">Ciclos Ativos</span>
        <span class="msp-stat-value">${stack.length}</span>
      </div>
      <div class="msp-stat-card">
        <span class="msp-stat-label">Taxa de Adesão</span>
        <span class="msp-stat-value">${adherence}</span>
      </div>
    `;
  }

  _renderList() {
    const list = this.container.querySelector('#msp-list');
    if (!list) return;
    const stack = stateManager.stack ?? [];

    if (!stack.length) {
      list.innerHTML = `
        <div class="msp-empty">
          <div class="msp-empty-icon">📭</div>
          <p class="msp-empty-title">Seu stack está vazio</p>
          <p class="msp-empty-desc">Adicione os suplementos que você está tomando para acompanhar seu protocolo.</p>
          <button class="msp-empty-cta" id="msp-empty-cta">Explorar Catálogo →</button>
        </div>
      `;
      this.container.querySelector('#msp-empty-cta')?.addEventListener('click', () => this._openModal());
      return;
    }

    list.innerHTML = '';
    stack.forEach(item => {
      const itemId = item.supplementId ?? item.id;
      const daysLeft = calcDaysLeft(item);
      const imgSrc = getSupplementImage(item);
      const badge = evidenceBadge(getEvidenceLevel(item));

      const el = document.createElement('div');
      el.className = 'msp-item';
      el.dataset.itemId = itemId;
      el.innerHTML = `
        <img class="msp-item-img"
          src="${imgSrc}"
          alt="${item.name}"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\'%3E%3Crect width=\\'60\\' height=\\'60\\' rx=\\'12\\' fill=\\'%23161616\\'/%3E%3Ctext x=\\'50%25\\' y=\\'55%25\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' font-size=\\'24\\' fill=\\'%23555555\\'%3E💊%3C/text%3E%3C/svg%3E'">
        <div class="msp-item-info">
          <p class="msp-item-name">${item.name}</p>
          <p class="msp-item-dosage">${item.dosage ?? '—'} ${item.unit ?? 'g'}/dia</p>
          <p class="msp-item-stock">Estoque: ${item.quantity ? `${item.quantity} ${item.unit ?? 'g'}${daysLeft !== null ? ` · ~${daysLeft} dias` : ''}` : 'não informado'}</p>
        </div>
        <div class="msp-item-right">
          ${badge}
          <div class="msp-item-actions">
            <button class="msp-btn-icon" data-action="edit" data-id="${itemId}" aria-label="Editar ${item.name}" title="Editar">✏️</button>
            <button class="msp-btn-icon del" data-action="remove" data-id="${itemId}" aria-label="Remover ${item.name}" title="Remover">🗑️</button>
          </div>
        </div>
      `;

      // Inline edit placeholder — inserted after card when editing
      const editWrap = document.createElement('div');
      editWrap.id = `msp-edit-${itemId}`;
      editWrap.style.display = 'none';

      list.appendChild(el);
      list.appendChild(editWrap);
    });
  }

  _renderReplenishment() {
    const el = this.container.querySelector('#msp-replenishment');
    if (!el) return;
    const stack = stateManager.stack ?? [];
    const prices = this._prices ?? {};

    const withPrices = stack.filter(item => {
      const id = item.supplementId ?? item.id;
      return !!prices[id];
    });

    if (!withPrices.length) {
      el.innerHTML = `<p class="msp-replen-empty">Nenhum preço disponível para os itens do seu stack.</p>`;
      return;
    }

    el.innerHTML = withPrices.map((item, idx) => {
      const id = item.supplementId ?? item.id;
      const markets = prices[id] ?? {};
      const entries = Object.values(markets);
      const best = entries.reduce((a, b) => (a.price < b.price ? a : b), entries[0]);
      const divider = idx < withPrices.length - 1
        ? `<hr class="msp-replen-divider">`
        : '';
      return `
        <div class="msp-replen-item">
          <span class="msp-replen-name">${item.name}</span>
          <span class="msp-replen-price">Melhor: ${fmtBRL(best.price)}</span>
          <span class="msp-replen-market">${best.label}</span>
        </div>
        ${divider}
      `;
    }).join('');
  }

  // ─── Delegated list event listeners ───────────────────────────────────────
  _attachDelegatedListeners() {
    this.container.querySelector('#msp-list')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const id = btn.dataset.id;
      if (btn.dataset.action === 'edit') {
        this._toggleInlineEdit(id);
      }
      if (btn.dataset.action === 'remove') {
        const item = (stateManager.stack ?? []).find(s => (s.supplementId ?? s.id) === id);
        if (!item) return;
        if (!confirm(`Remover "${item.name}" do stack?`)) return;
        stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { supplementId: id });
      }
      if (btn.dataset.action === 'save-edit') {
        this._saveInlineEdit(id);
      }
      if (btn.dataset.action === 'cancel-edit') {
        this._closeInlineEdit(id);
      }
    });
  }

  // ─── Inline edit ──────────────────────────────────────────────────────────
  _toggleInlineEdit(id) {
    const wrap = this.container.querySelector(`#msp-edit-${id}`);
    if (!wrap) return;
    if (wrap.style.display !== 'none') {
      this._closeInlineEdit(id);
      return;
    }
    // Close any other open edits
    this.container.querySelectorAll('[id^="msp-edit-"]').forEach(w => {
      if (w.id !== `msp-edit-${id}`) w.style.display = 'none';
    });

    const item = (stateManager.stack ?? []).find(s => (s.supplementId ?? s.id) === id);
    if (!item) return;

    wrap.style.display = 'block';
    wrap.innerHTML = `
      <div class="msp-inline-edit">
        <p class="msp-inline-edit-title">Editar — ${item.name}</p>
        <div class="msp-inline-row">
          <div class="msp-inline-field">
            <label class="msp-inline-label">Dosagem diária</label>
            <input type="number" class="msp-input" id="msp-ei-dosage-${id}" min="0.1" step="0.1" value="${item.dosage ?? ''}">
          </div>
          <div class="msp-inline-field" style="max-width:90px;">
            <label class="msp-inline-label">Unidade</label>
            <select class="msp-select" id="msp-ei-unit-${id}">
              ${['g','mg','UI','mcg','cápsulas'].map(u => `<option value="${u}" ${item.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
          </div>
          <div class="msp-inline-field">
            <label class="msp-inline-label">Estoque</label>
            <input type="number" class="msp-input" id="msp-ei-qty-${id}" min="0" value="${item.quantity ?? ''}">
          </div>
        </div>
        <div class="msp-inline-btns">
          <button class="msp-btn-cancel" data-action="cancel-edit" data-id="${id}">Cancelar</button>
          <button class="msp-btn-save" data-action="save-edit" data-id="${id}">Salvar</button>
        </div>
      </div>
    `;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  _closeInlineEdit(id) {
    const wrap = this.container.querySelector(`#msp-edit-${id}`);
    if (wrap) wrap.style.display = 'none';
  }

  _saveInlineEdit(id) {
    const dosage = parseFloat(this.container.querySelector(`#msp-ei-dosage-${id}`)?.value) || 0;
    const unit = this.container.querySelector(`#msp-ei-unit-${id}`)?.value || 'g';
    const quantity = parseFloat(this.container.querySelector(`#msp-ei-qty-${id}`)?.value) || 0;

    if (dosage <= 0) { alert('Informe uma dosagem válida.'); return; }

    stateManager.dispatch(ACTIONS.UPDATE_STACK_ITEM, { supplementId: id, dosage, unit, quantity });
    this._closeInlineEdit(id);
  }

  // ─── Add supplement modal ─────────────────────────────────────────────────
  _openModal() {
    if (this._modalOpen) return;
    this._modalOpen = true;

    const overlay = document.createElement('div');
    overlay.className = 'msp-modal-overlay';
    overlay.id = 'msp-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Adicionar suplemento');

    overlay.innerHTML = `
      <div class="msp-modal" id="msp-modal">
        <div class="msp-modal-header">
          <h2 class="msp-modal-title">Adicionar Suplemento</h2>
          <button class="msp-modal-close" id="msp-modal-close" aria-label="Fechar">✕</button>
        </div>

        <div class="msp-modal-field">
          <label class="msp-modal-label" for="msp-modal-search">Buscar suplemento</label>
          <input type="search" id="msp-modal-search" class="msp-input"
            placeholder="Digite o nome…" autocomplete="off">
          <div id="msp-modal-results" class="msp-search-results" style="display:none"></div>
        </div>

        <div class="msp-modal-field">
          <label class="msp-modal-label">Dosagem diária</label>
          <div class="msp-modal-row">
            <input type="number" id="msp-modal-dosage" class="msp-input" min="0.1" step="0.1" placeholder="Ex: 5">
            <select id="msp-modal-unit" class="msp-select">
              <option value="g">g</option>
              <option value="mg">mg</option>
              <option value="UI">UI</option>
              <option value="mcg">mcg</option>
              <option value="cápsulas">cápsulas</option>
            </select>
          </div>
        </div>

        <div class="msp-modal-field">
          <label class="msp-modal-label" for="msp-modal-qty">Quantidade em estoque</label>
          <input type="number" id="msp-modal-qty" class="msp-input" min="0" placeholder="Ex: 250">
        </div>

        <button class="msp-modal-submit" id="msp-modal-submit">Adicionar ao Stack</button>
      </div>
    `;

    document.body.appendChild(overlay);
    this._modalSelectedId = null;
    this._modalSelectedName = null;

    // Close on overlay click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) this._closeModal();
    });

    document.getElementById('msp-modal-close')?.addEventListener('click', () => this._closeModal());

    // Search logic
    const searchInput = document.getElementById('msp-modal-search');
    const resultsBox = document.getElementById('msp-modal-results');
    let debounce;

    searchInput?.addEventListener('input', e => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = e.target.value.trim().toLowerCase();
        if (q.length < 2) { resultsBox.style.display = 'none'; return; }
        const matches = SUPPLEMENTS_DB.filter(s =>
          s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q)
        ).slice(0, 8);
        if (!matches.length) { resultsBox.style.display = 'none'; return; }

        resultsBox.innerHTML = matches.map(s => `
          <button class="msp-result-btn"
            data-id="${s.id}"
            data-name="${s.name}"
            data-unit="${s.dosage?.unit ?? 'g'}"
            data-dosage="${s.dosage?.maintenance ?? 5}"
            data-img="${s.image ?? ''}">
            <img class="msp-result-img" src="${s.image ?? ''}"
              alt="${s.name}"
              onerror="this.style.display='none'">
            <div class="msp-result-info">
              <span class="msp-result-name">${s.name}</span>
              <span class="msp-result-cat">${s.category ?? ''}</span>
            </div>
          </button>
        `).join('');
        resultsBox.style.display = 'block';

        resultsBox.querySelectorAll('.msp-result-btn').forEach(btn => {
          btn.addEventListener('click', ev => {
            ev.preventDefault();
            this._modalSelectedId = btn.dataset.id;
            this._modalSelectedName = btn.dataset.name;
            searchInput.value = btn.dataset.name;
            document.getElementById('msp-modal-dosage').value = btn.dataset.dosage;
            document.getElementById('msp-modal-unit').value = btn.dataset.unit;
            resultsBox.style.display = 'none';
          });
        });
      }, 180);
    });

    document.addEventListener('click', e => {
      if (!searchInput?.contains(e.target) && !resultsBox?.contains(e.target)) {
        resultsBox.style.display = 'none';
      }
    });

    // Submit
    document.getElementById('msp-modal-submit')?.addEventListener('click', () => {
      const name = (document.getElementById('msp-modal-search')?.value ?? '').trim();
      const dosage = parseFloat(document.getElementById('msp-modal-dosage')?.value) || 0;
      const unit = document.getElementById('msp-modal-unit')?.value || 'g';
      const quantity = parseFloat(document.getElementById('msp-modal-qty')?.value) || 0;

      if (!name) { alert('Informe o nome do suplemento.'); return; }
      if (dosage <= 0) { alert('Informe a dosagem diária.'); return; }

      const id = this._modalSelectedId
        ?? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

      stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
        supplementId: id,
        name,
        dosage,
        unit,
        quantity: quantity || null,
      });

      this._closeModal();
    });

    // Focus search
    setTimeout(() => searchInput?.focus(), 100);
  }

  _closeModal() {
    this._modalOpen = false;
    this._modalSelectedId = null;
    this._modalSelectedName = null;
    const overlay = document.getElementById('msp-modal-overlay');
    overlay?.remove();
  }
}

export default MyStackPage;
