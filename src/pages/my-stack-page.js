/**
 * MyStackPage v4.0 — SupliList
 * Gerenciamento do stack ativo: CRUD, estoque, alertas, reposição
 */

import { stateManager, ACTIONS } from '../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';

export class MyStackPage {
  constructor(container) {
    this.container = container;
    this._unsub    = null;
    this._editId   = null;
  }

  mount() {
    this._attachStyles();
    this._render();
    this._initModalSearch();
    this._attachListeners();

    this._unsub = stateManager.subscribe?.((state, action) => {
      const stackActions = ['ADD_TO_STACK','REMOVE_FROM_STACK','UPDATE_STACK_ITEM','SET_STACK_QUANTITY','ADD_CHECKIN'];
      if (!action || stackActions.includes(action.type)) {
        this._renderStackList();
        this._renderAlerts();
        this._renderSummary();
      }
    });
  }

  unmount() {
    this._unsub?.();
  }

  // ── Styles (idempotent) ───────────────────────────────────────────────────
  _attachStyles() {
    if (document.getElementById('mystack-styles')) return;
    const style = document.createElement('style');
    style.id = 'mystack-styles';
    style.textContent = `
      .mystack-page { display:flex; flex-direction:column; gap:20px; padding:20px 16px 100px; max-width:800px; margin:0 auto; }
      .page-header { margin-bottom:4px; }
      .page-title { font-size:24px; font-weight:800; color:#FAFAFA; margin:0 0 4px; }
      .page-subtitle { font-size:14px; color:#888; margin:0; }
      .summary-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
      @media (min-width:600px) { .summary-grid { grid-template-columns:repeat(4,1fr); } }
      .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
      .section-title { font-size:16px; font-weight:700; color:#FAFAFA; margin:0; }
      .btn-add { padding:8px 16px; background:#7C3AED; color:#fff; border:none; border-radius:999px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity 150ms; }
      .btn-add:hover { opacity:.9; }
      .alerts-banner { display:flex; align-items:flex-start; gap:12px; padding:14px 16px; background:#FFB74D11; border:1px solid #FFB74D44; border-radius:12px; animation:slideDown 300ms ease; }
      @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      .alert-icon { font-size:20px; flex-shrink:0; }
      .alert-content { flex:1; }
      .alert-content strong { color:#FFB74D; font-size:14px; }
      .alert-content p { color:#888; font-size:13px; margin:2px 0 0; }
      .alert-dismiss { background:none; border:none; color:#666; cursor:pointer; font-size:16px; }
      .stack-list { display:flex; flex-direction:column; gap:10px; }
      .stack-empty { text-align:center; padding:48px 20px; color:#888; display:flex; flex-direction:column; align-items:center; gap:8px; background:#141414; border:1px dashed #2A2A2A; border-radius:16px; }
      .stack-item { display:flex; align-items:center; gap:14px; padding:16px; background:#141414; border-radius:14px; border:1px solid #2A2A2A; transition:border-color 200ms; }
      .stack-item-ok { border-color:#2A2A2A; }
      .stack-item-low { border-color:#FFB74D44; background:#FFB74D05; }
      .stack-item-critical { border-color:#EF535044; background:#EF535005; animation:pulse-border 2s ease-in-out infinite; }
      @keyframes pulse-border { 0%,100%{border-color:#EF535044} 50%{border-color:#EF5350} }
      .stack-checkin-badge { width:32px; height:32px; border-radius:50%; border:2px solid #2A2A2A; background:#1E1E1E; display:flex; align-items:center; justify-content:center; font-size:14px; color:#444; flex-shrink:0; font-weight:700; }
      .stack-checkin-badge.done { border-color:#00E676; background:#00E67611; color:#00E676; }
      .stack-info { flex:1; min-width:0; }
      .stack-category { font-size:11px; color:#666; text-transform:uppercase; letter-spacing:.5px; margin:0 0 2px; }
      .stack-name { font-size:15px; font-weight:700; color:#FAFAFA; margin:0 0 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .stack-dosage { font-size:12px; color:#888; margin:0; font-family:'JetBrains Mono',monospace; }
      .stack-stock { display:flex; flex-direction:column; gap:4px; align-items:flex-end; min-width:80px; }
      .days-left { display:flex; align-items:baseline; gap:3px; }
      .days-value { font-size:22px; font-weight:900; font-family:'JetBrains Mono',monospace; line-height:1; }
      .days-label { font-size:11px; color:#888; }
      .days-left-ok .days-value { color:#00E676; }
      .days-left-low .days-value { color:#FFB74D; }
      .days-left-critical .days-value { color:#EF5350; }
      .stock-bar-wrap { width:100%; }
      .stock-bar { height:4px; background:#2A2A2A; border-radius:999px; overflow:hidden; width:80px; }
      .stock-fill { height:100%; border-radius:999px; transition:width 500ms ease; }
      .stock-fill-ok { background:#00E676; }
      .stock-fill-low { background:#FFB74D; }
      .stock-fill-critical { background:#EF5350; }
      .stock-qty { font-size:11px; color:#666; margin:3px 0 0; text-align:right; font-family:'JetBrains Mono',monospace; }
      .stock-unknown { font-size:12px; color:#444; }
      .stack-actions { display:flex; flex-direction:column; gap:6px; align-items:flex-end; }
      .btn-reorder { padding:6px 12px; background:#7C3AED22; border:1px solid #7C3AED44; border-radius:999px; color:#7C3AED; font-size:12px; font-weight:700; text-decoration:none; white-space:nowrap; transition:all 150ms; font-family:inherit; }
      .btn-reorder:hover { background:#7C3AED; color:#fff; }
      .btn-edit-stack, .btn-remove-stack { background:none; border:none; font-size:16px; cursor:pointer; padding:4px; border-radius:6px; transition:background 150ms; }
      .btn-edit-stack:hover { background:#2A2A2A; }
      .btn-remove-stack:hover { background:#EF535022; }
      .modal-form { display:flex; flex-direction:column; gap:14px; }
      .modal-form-group { display:flex; flex-direction:column; gap:6px; position:relative; }
      .modal-label { font-size:13px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:.5px; }
      .modal-input { width:100%; padding:11px 14px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:10px; color:#FAFAFA; font-size:15px; font-family:inherit; outline:none; box-sizing:border-box; }
      .modal-input:focus { border-color:#7C3AED; }
      .modal-input::placeholder { color:#444; }
      .modal-select { padding:11px 14px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:10px; color:#FAFAFA; font-size:15px; font-family:inherit; outline:none; cursor:pointer; }
      .modal-input-row { display:flex; gap:8px; align-items:center; }
      .modal-unit-label { font-size:13px; color:#888; white-space:nowrap; }
      .modal-textarea { width:100%; padding:11px 14px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:10px; color:#FAFAFA; font-size:14px; font-family:inherit; outline:none; resize:vertical; box-sizing:border-box; }
      .modal-textarea:focus { border-color:#7C3AED; }
      .modal-footer-btns { display:flex; gap:8px; justify-content:flex-end; width:100%; }
      .btn-ghost { padding:10px 20px; background:none; border:1px solid #2A2A2A; border-radius:999px; color:#888; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; transition:border-color 150ms; }
      .btn-ghost:hover { border-color:#7C3AED; color:#FAFAFA; }
      .btn-primary { padding:10px 20px; background:#7C3AED; color:#fff; border:none; border-radius:999px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity 150ms; }
      .btn-primary:hover { opacity:.9; }
      .search-dropdown { position:absolute; top:100%; left:0; right:0; z-index:100; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:10px; margin-top:4px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,.4); }
      .search-result-item { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 14px; background:none; border:none; text-align:left; cursor:pointer; transition:background 100ms; font-family:inherit; }
      .search-result-item:hover { background:#2A2A2A; }
      .sr-name { font-size:14px; font-weight:600; color:#FAFAFA; }
      .sr-category { font-size:12px; color:#888; }
    `;
    document.head.appendChild(style);
  }

  // ── Shell render ──────────────────────────────────────────────────────────
  _render() {
    const stack = stateManager.stack ?? [];
    this.container.innerHTML = `
      <div class="mystack-page">
        <div class="page-header">
          <h1 class="page-title">📦 Meu Stack</h1>
          <p class="page-subtitle">Seu protocolo de suplementação ativo</p>
        </div>

        <div id="alerts-section"></div>

        <div class="summary-grid" id="summary-grid">
          <stat-card label="Suplementos" value="${stack.length}" unit="ativos"></stat-card>
          <stat-card label="Custo Total"  value="—" unit="R$/mês"></stat-card>
          <stat-card label="Adesão Hoje"  value="${this._todayAdherencePercent()}%" unit=""></stat-card>
          <stat-card label="Streak"       value="${stateManager.calculateStreak?.() ?? 0}" unit="dias"></stat-card>
        </div>

        <section class="stack-section">
          <div class="section-header">
            <h2 class="section-title">Ativos</h2>
            <button class="btn-add" data-action="open-add-modal" aria-label="Adicionar suplemento">+ Adicionar</button>
          </div>
          <div id="stack-list" class="stack-list" role="list"></div>
        </section>
      </div>

      <modal-dialog id="stack-modal" title="Adicionar suplemento">
        <div class="modal-form">
          <div class="modal-form-group">
            <label class="modal-label" for="modal-search">Suplemento</label>
            <input type="search" id="modal-search" class="modal-input"
              placeholder="Buscar suplemento... (ex: creatina)" autocomplete="off">
            <div id="modal-search-results" class="search-dropdown" style="display:none"></div>
          </div>
          <div class="modal-form-group">
            <label class="modal-label" for="modal-quantity">Quantidade em estoque</label>
            <div class="modal-input-row">
              <input type="number" id="modal-quantity" class="modal-input" min="0" max="10000" value="250">
              <select id="modal-unit" class="modal-select" aria-label="Unidade">
                <option value="g">g</option>
                <option value="mg">mg</option>
                <option value="ml">ml</option>
                <option value="caps">caps</option>
                <option value="comp">comp</option>
              </select>
            </div>
          </div>
          <div class="modal-form-group">
            <label class="modal-label" for="modal-dosage">Dosagem diária</label>
            <div class="modal-input-row">
              <input type="number" id="modal-dosage" class="modal-input" min="0.1" max="1000" step="0.1" value="5">
              <span class="modal-unit-label" id="modal-dosage-unit">g/dia</span>
            </div>
          </div>
          <div class="modal-form-group">
            <label class="modal-label" for="modal-purchase-date">Data da compra</label>
            <input type="date" id="modal-purchase-date" class="modal-input"
              value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="modal-form-group">
            <label class="modal-label" for="modal-notes">Notas (opcional)</label>
            <textarea id="modal-notes" class="modal-textarea" rows="2"
              placeholder="Ex: Tomar com refeição, marca preferida..."></textarea>
          </div>
        </div>
        <div slot="footer" class="modal-footer-btns">
          <button class="btn-ghost" data-action="close-modal">Cancelar</button>
          <button class="btn-primary" data-action="save-stack-item">Salvar</button>
        </div>
      </modal-dialog>
    `;

    this._renderStackList();
    this._renderAlerts();
    this._renderSummary();
  }

  // ── Render stack list (DocumentFragment) ──────────────────────────────────
  _renderStackList() {
    const list  = this.container.querySelector('#stack-list');
    const stack = stateManager.stack ?? [];
    if (!list) return;

    if (!stack.length) {
      list.innerHTML = `
        <div class="stack-empty">
          <p style="font-size:40px">📭</p>
          <p>Seu stack está vazio.</p>
          <p style="font-size:13px;color:#666">Adicione os suplementos que você está tomando.</p>
          <button class="btn-primary" data-action="open-add-modal" style="margin-top:8px">+ Adicionar suplemento</button>
        </div>`;
      return;
    }

    const frag        = document.createDocumentFragment();
    const checkins    = stateManager.getTodayCheckins?.() ?? [];

    stack.forEach(item => {
      const daysLeft  = this._calcDaysLeft(item);
      const urgency   = daysLeft !== null && daysLeft <= 5  ? 'critical'
                      : daysLeft !== null && daysLeft <= 14 ? 'low' : 'ok';
      const todayDone = checkins.some(c => c.supplementId === item.supplementId);

      const el = document.createElement('div');
      el.className = `stack-item stack-item-${urgency}`;
      el.dataset.id = item.supplementId ?? item.id;
      el.setAttribute('role', 'listitem');
      el.innerHTML = `
        <div class="stack-checkin-badge ${todayDone ? 'done' : ''}"
          aria-label="${todayDone ? 'Tomado hoje' : 'Não tomado hoje'}">
          ${todayDone ? '✓' : '○'}
        </div>
        <div class="stack-info">
          <p class="stack-category">${item.category ?? 'Suplemento'}</p>
          <h3 class="stack-name">${item.name}</h3>
          <p class="stack-dosage">${item.dosage ?? '—'} ${item.unit ?? 'g'}/dia${item.notes ? ` · ${item.notes}` : ''}</p>
        </div>
        <div class="stack-stock">
          ${daysLeft !== null ? `
            <div class="days-left days-left-${urgency}">
              <span class="days-value">${daysLeft}</span>
              <span class="days-label">dias</span>
            </div>
            <div class="stock-bar-wrap">
              <div class="stock-bar">
                <div class="stock-fill stock-fill-${urgency}"
                  style="width:${Math.min((daysLeft/30)*100,100)}%"></div>
              </div>
              <p class="stock-qty">${item.quantity} ${item.unit ?? 'g'} restantes</p>
            </div>` : `<p class="stock-unknown">Estoque não informado</p>`}
        </div>
        <div class="stack-actions">
          <button class="btn-edit-stack" data-action="edit-item" data-id="${item.supplementId ?? item.id}"
            aria-label="Editar ${item.name}">✏️</button>
          <button class="btn-remove-stack" data-action="remove-item" data-id="${item.supplementId ?? item.id}"
            aria-label="Remover ${item.name}">🗑️</button>
        </div>
      `;
      frag.appendChild(el);
    });

    list.innerHTML = '';
    list.appendChild(frag);
  }

  // ── Render alerts ─────────────────────────────────────────────────────────
  _renderAlerts() {
    const section  = this.container.querySelector('#alerts-section');
    if (!section) return;
    const critical = (stateManager.stack ?? []).filter(item => {
      const days = this._calcDaysLeft(item);
      return days !== null && days <= 5;
    });
    if (!critical.length) { section.innerHTML = ''; return; }
    section.innerHTML = `
      <div class="alerts-banner" role="alert" aria-live="assertive">
        <span class="alert-icon">⚠️</span>
        <div class="alert-content">
          <strong>Estoque baixo</strong>
          <p>${critical.map(i => `${i.name} (${this._calcDaysLeft(i)} dias)`).join(' · ')}</p>
        </div>
        <button class="alert-dismiss" data-action="dismiss-alerts" aria-label="Dispensar">✕</button>
      </div>`;
  }

  // ── Render summary ────────────────────────────────────────────────────────
  _renderSummary() {
    const grid  = this.container.querySelector('#summary-grid');
    if (!grid) return;
    const stack = stateManager.stack ?? [];
    const supps = SUPPLEMENTS_DB;

    let totalCost = 0;
    stack.forEach(item => {
      const supp   = supps.find(s => s.id === (item.supplementId ?? item.id));
      const dosage = parseFloat(item.dosage ?? supp?.dosage?.maintenance ?? 5);
      totalCost   += (dosage * 30 / 1000) * (supp?.pricePerGram ?? 0.05);
    });

    grid.innerHTML = `
      <stat-card label="Suplementos" value="${stack.length}" unit="ativos"></stat-card>
      <stat-card label="Custo Total"  value="${totalCost.toFixed(0)}" unit="R$/mês"></stat-card>
      <stat-card label="Adesão Hoje"  value="${this._todayAdherencePercent()}%" unit=""></stat-card>
      <stat-card label="Streak"       value="${stateManager.calculateStreak?.() ?? 0}" unit="dias"></stat-card>`;
  }

  // ── Modal search ──────────────────────────────────────────────────────────
  _initModalSearch() {
    const input   = this.container.querySelector('#modal-search');
    const results = this.container.querySelector('#modal-search-results');
    if (!input || !results) return;

    let debounce;
    input.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = e.target.value.trim().toLowerCase();
        if (q.length < 2) { results.style.display = 'none'; return; }
        const supps = SUPPLEMENTS_DB;
        const matches = supps.filter(s =>
          s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q)
        ).slice(0, 8);

        if (!matches.length) { results.style.display = 'none'; return; }
        results.innerHTML = matches.map(s => `
          <button class="search-result-item" data-action="select-supplement"
            data-id="${s.id}" data-name="${s.name}"
            data-category="${s.category ?? ''}"
            data-unit="${s.dosage?.unit ?? 'g'}"
            data-dosage="${s.dosage?.maintenance ?? 5}">
            <span class="sr-name">${s.name}</span>
            <span class="sr-category">${s.category ?? ''}</span>
          </button>`).join('');
        results.style.display = 'block';
      }, 200);
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.style.display = 'none';
      }
    });
  }

  // ── Listeners (delegation) ────────────────────────────────────────────────
  _attachListeners() {
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      switch (btn.dataset.action) {

        case 'open-add-modal': {
          this._editId = null;
          const modal  = this.container.querySelector('#stack-modal');
          if (!modal) break;
          modal.setAttribute('title', 'Adicionar suplemento');
          ['modal-search','modal-notes'].forEach(id => {
            const el = this.container.querySelector(`#${id}`); if (el) el.value = '';
          });
          this.container.querySelector('#modal-quantity').value  = '250';
          this.container.querySelector('#modal-dosage').value    = '5';
          this.container.querySelector('#modal-purchase-date').value = new Date().toISOString().split('T')[0];
          modal.setAttribute('open', '');
          break;
        }

        case 'close-modal': {
          this.container.querySelector('#stack-modal')?.removeAttribute('open');
          break;
        }

        case 'save-stack-item': {
          const name     = this.container.querySelector('#modal-search')?.value?.trim();
          const quantity = parseFloat(this.container.querySelector('#modal-quantity')?.value) || 0;
          const dosage   = parseFloat(this.container.querySelector('#modal-dosage')?.value)   || 0;
          const unit     = this.container.querySelector('#modal-unit')?.value     || 'g';
          const notes    = this.container.querySelector('#modal-notes')?.value?.trim();
          const date     = this.container.querySelector('#modal-purchase-date')?.value;

          if (!name)       { if (window.SupliToast) window.SupliToast.show('⚠️ Informe o suplemento', 'warning'); break; }
          if (dosage <= 0) { if (window.SupliToast) window.SupliToast.show('⚠️ Informe a dosagem diária', 'warning'); break; }

          const id      = this._editId ?? (name.toLowerCase().replace(/\s+/g,'-') + '-' + Date.now());
          const payload = { supplementId: id, name, quantity, dosage, unit, notes, lastPurchase: date };

          stateManager.dispatch(this._editId ? ACTIONS.UPDATE_STACK_ITEM : ACTIONS.ADD_TO_STACK, payload);
          this.container.querySelector('#stack-modal')?.removeAttribute('open');
          if (window.SupliToast) window.SupliToast.show(`✓ ${name} ${this._editId ? 'atualizado' : 'adicionado'}!`, 'success');
          this._editId = null;
          this._renderStackList();
          this._renderSummary();
          break;
        }

        case 'edit-item': {
          const id   = btn.dataset.id;
          const item = (stateManager.stack ?? []).find(s => (s.supplementId ?? s.id) === id);
          if (!item) break;
          this._editId = id;
          const modal = this.container.querySelector('#stack-modal');
          if (!modal) break;
          modal.setAttribute('title', 'Editar suplemento');
          this.container.querySelector('#modal-search').value = item.name;
          this.container.querySelector('#modal-quantity').value = item.quantity ?? '';
          this.container.querySelector('#modal-dosage').value   = item.dosage ?? '';
          this.container.querySelector('#modal-notes').value    = item.notes ?? '';
          const dp = this.container.querySelector('#modal-purchase-date');
          if (dp && item.lastPurchase) dp.value = item.lastPurchase;
          const us = this.container.querySelector('#modal-unit');
          if (us && item.unit) us.value = item.unit;
          modal.setAttribute('open', '');
          break;
        }

        case 'remove-item': {
          const id   = btn.dataset.id;
          const item = (stateManager.stack ?? []).find(s => (s.supplementId ?? s.id) === id);
          if (!item || !confirm(`Remover ${item.name} do stack?`)) break;
          stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { supplementId: id });
          if (window.SupliToast) window.SupliToast.show(`${item.name} removido`, 'info');
          this._renderStackList();
          this._renderSummary();
          break;
        }

        case 'select-supplement': {
          this.container.querySelector('#modal-search').value  = btn.dataset.name;
          this.container.querySelector('#modal-dosage').value  = btn.dataset.dosage;
          const us = this.container.querySelector('#modal-unit');
          if (us) us.value = btn.dataset.unit;
          const ul = this.container.querySelector('#modal-dosage-unit');
          if (ul) ul.textContent = `${btn.dataset.unit}/dia`;
          this.container.querySelector('#modal-search-results').style.display = 'none';
          break;
        }

        case 'dismiss-alerts': {
          const s = this.container.querySelector('#alerts-section');
          if (s) s.innerHTML = '';
          break;
        }
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  _calcDaysLeft(item) {
    const qty    = parseFloat(item.quantity);
    const dosage = parseFloat(item.dosage);
    if (!qty || !dosage || dosage <= 0) return null;
    return Math.max(0, Math.floor(qty / dosage));
  }

  _todayAdherencePercent() {
    const stack = stateManager.stack ?? [];
    if (!stack.length) return 100;
    const done = stateManager.getTodayCheckins?.()?.length ?? 0;
    return Math.round((Math.min(done, stack.length) / stack.length) * 100);
  }
}

export default MyStackPage;
