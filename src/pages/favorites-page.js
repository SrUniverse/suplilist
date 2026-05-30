/**
 * FavoritesPage v4.0 — SupliList
 * Lista de favoritos com filtros, sort e ação rápida de stack
 */

import { stateManager, ACTIONS } from '../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import DosageCalculator from '../ai/dosage-calculator.js';

// AffiliateEngine stub — substitua quando o módulo existir
let _AffiliateEngine;
try {
  const mod = await import('../monetization/affiliate-engine.js');
  _AffiliateEngine = mod.default ?? mod.AffiliateEngine;
} catch (_) {
  _AffiliateEngine = class {
    generateAffiliateLink() { return null; }
    trackAffiliateClick() {}
  };
}

export class FavoritesPage {
  constructor(container) {
    this.container  = container;
    this._unsub     = null;
    this._sort      = 'date-desc';
    this._filter    = { category: '', evidence: '' };
    this._affiliate = new _AffiliateEngine();
  }

  mount() {
    this._attachStyles();
    this._render();
    this._attachListeners();

    this._unsub = stateManager.subscribe?.((state, action) => {
      const watched = ['ADD_FAVORITE','REMOVE_FAVORITE','ADD_TO_STACK','REMOVE_FROM_STACK'];
      if (!action || watched.includes(action.type)) {
        this._renderList();
        this._renderStats();
      }
    });
  }

  unmount() { this._unsub?.(); }

  // ── Styles (idempotent) ───────────────────────────────────────────────────
  _attachStyles() {
    if (document.getElementById('favs-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'favs-page-styles';
    style.textContent = `
      .favs-page { display:flex; flex-direction:column; gap:16px; padding:20px 16px 100px; max-width:800px; margin:0 auto; }
      .page-header { margin-bottom:4px; }
      .page-title { font-size:24px; font-weight:800; color:#FAFAFA; margin:0 0 4px; }
      .page-subtitle { font-size:14px; color:#888; margin:0; }
      .favs-stats { display:flex; flex-wrap:wrap; gap:8px; }
      .fav-stat-chip { padding:4px 12px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:999px; font-size:12px; font-weight:600; color:#888; font-family:'JetBrains Mono',monospace; }
      .favs-controls { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
      .filter-select { padding:9px 14px; background:#141414; border:1px solid #2A2A2A; border-radius:999px; color:#FAFAFA; font-size:13px; font-family:inherit; cursor:pointer; outline:none; -webkit-appearance:none; }
      .filter-select:focus { border-color:#7C3AED; }
      .btn-clear-favs { padding:9px 14px; background:transparent; border:1px solid #2A2A2A; border-radius:999px; color:#666; font-size:13px; cursor:pointer; font-family:inherit; transition:all 150ms; }
      .btn-clear-favs:hover { border-color:#EF5350; color:#EF5350; }
      .favs-list { display:flex; flex-direction:column; gap:10px; }
      .favs-empty { text-align:center; padding:60px 20px; color:#888; display:flex; flex-direction:column; align-items:center; gap:10px; }
      .fav-item { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px; background:#141414; border:1px solid #2A2A2A; border-radius:14px; transition:border-color 150ms,box-shadow 150ms; }
      .fav-item:hover { border-color:#7C3AED44; box-shadow:0 2px 12px rgba(124,58,237,.08); }
      .fav-item-left { flex:1; min-width:0; display:flex; flex-direction:column; gap:8px; }
      .fav-meta { min-width:0; }
      .fav-category { font-size:11px; color:#666; text-transform:uppercase; letter-spacing:.5px; margin:0 0 2px; }
      .fav-name { font-size:15px; font-weight:700; color:#FAFAFA; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .fav-tags { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
      .target-chip { padding:3px 8px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:999px; font-size:11px; color:#888; text-transform:capitalize; }
      .fav-item-right { display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0; }
      .fav-price { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
      .fav-price-value { font-size:16px; font-weight:700; color:#7C3AED; font-family:'JetBrains Mono',monospace; }
      .fav-marketplace { font-size:11px; color:#666; text-transform:capitalize; }
      .fav-actions { display:flex; gap:6px; align-items:center; }
      .btn-buy { width:34px; height:34px; display:flex; align-items:center; justify-content:center; background:#7C3AED22; border:1px solid #7C3AED44; border-radius:50%; font-size:15px; text-decoration:none; transition:all 150ms; }
      .btn-buy:hover { background:#7C3AED; }
      .btn-add-stack-fav { width:34px; height:34px; border-radius:50%; border:1px solid #2A2A2A; background:#1E1E1E; color:#888; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 150ms; }
      .btn-add-stack-fav:hover { border-color:#00E676; color:#00E676; }
      .btn-add-stack-fav.in-stack { background:#00E67611; border-color:#00E67644; color:#00E676; }
      .btn-remove-fav { width:34px; height:34px; border-radius:50%; border:1px solid #EF535022; background:#EF535011; color:#EF5350; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 150ms; }
      .btn-remove-fav:hover { background:#EF5350; color:#fff; }
      .btn-ghost { padding:9px 18px; background:transparent; border:1px solid #2A2A2A; border-radius:10px; color:#888; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 150ms; }
      .btn-ghost:hover { border-color:#7C3AED; color:#FAFAFA; }
      .btn-primary { padding:10px 20px; background:#7C3AED; border:none; border-radius:999px; color:#fff; font-size:14px; font-weight:700; cursor:pointer; text-decoration:none; font-family:inherit; display:inline-flex; align-items:center; transition:opacity 150ms; }
      .btn-primary:hover { opacity:.9; }
      @media (max-width:480px) {
        .fav-item { flex-direction:column; align-items:flex-start; }
        .fav-item-right { flex-direction:row; width:100%; justify-content:space-between; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Shell render ──────────────────────────────────────────────────────────
  _render() {
    this.container.innerHTML = `
      <div class="favs-page">
        <div class="page-header">
          <h1 class="page-title">♥ Favoritos</h1>
          <p class="page-subtitle">Suplementos que você quer experimentar</p>
        </div>
        <div class="favs-stats" id="favs-stats" aria-live="polite"></div>
        <div class="favs-controls" role="group" aria-label="Controles">
          <select class="filter-select" id="fav-filter-category" aria-label="Categoria">
            <option value="">📂 Categoria</option>
            <option value="Performance">Performance</option>
            <option value="Proteína">Proteína</option>
            <option value="Vitaminas">Vitaminas</option>
            <option value="Minerais">Minerais</option>
            <option value="Adaptógenos">Adaptógenos</option>
            <option value="Estimulantes">Estimulantes</option>
            <option value="Saúde">Saúde</option>
          </select>
          <select class="filter-select" id="fav-filter-evidence" aria-label="Evidência">
            <option value="">🔬 Evidência</option>
            <option value="A">A — Forte</option>
            <option value="B">B — Boa</option>
            <option value="C">C — Fraca</option>
          </select>
          <select class="filter-select" id="fav-sort" aria-label="Ordenar por">
            <option value="date-desc">↓ Mais recentes</option>
            <option value="date-asc">↑ Mais antigos</option>
            <option value="name-asc">A–Z Nome</option>
            <option value="evidence">🔬 Evidência</option>
            <option value="price-asc">💵 Menor preço</option>
          </select>
          <button class="btn-clear-favs" id="btn-clear-favs" aria-label="Limpar filtros">✕</button>
        </div>
        <div id="favs-list" class="favs-list" role="list" aria-label="Suplementos favoritos"></div>
      </div>
    `;
    this._renderList();
    this._renderStats();
  }

  // ── Data helpers ──────────────────────────────────────────────────────────
  _getFavItems() {
    const favIds = stateManager.getState?.()?.favorites ?? stateManager.favorites ?? [];
    const supps  = SUPPLEMENTS_DB;
    return favIds.map((entry, idx) => {
      const id   = typeof entry === 'string' ? entry : entry.id ?? entry.supplementId;
      const meta = typeof entry === 'object'  ? entry : {};
      const supp = supps.find(s => s.id === id);
      if (!supp) return null;
      return { ...supp, _addedAt: meta.addedAt ?? (Date.now() - idx * 60000) };
    }).filter(Boolean);
  }

  _applyFilterSort(items) {
    let result = [...items];
    if (this._filter.category) result = result.filter(s => s.category === this._filter.category);
    if (this._filter.evidence) result = result.filter(s => (s.evidenceLevel ?? s.evidence) === this._filter.evidence);
    const evMap = { A:4, B:3, C:2, D:1 };
    switch (this._sort) {
      case 'date-desc': result.sort((a,b) => (b._addedAt??0) - (a._addedAt??0)); break;
      case 'date-asc':  result.sort((a,b) => (a._addedAt??0) - (b._addedAt??0)); break;
      case 'name-asc':  result.sort((a,b) => a.name.localeCompare(b.name,'pt-BR')); break;
      case 'evidence':  result.sort((a,b) => (evMap[b.evidenceLevel??b.evidence]??0) - (evMap[a.evidenceLevel??a.evidence]??0)); break;
      case 'price-asc': result.sort((a,b) => (a.price??Infinity) - (b.price??Infinity)); break;
    }
    return result;
  }

  // ── Render list (DocumentFragment) ───────────────────────────────────────
  _renderList() {
    const list = this.container.querySelector('#favs-list');
    if (!list) return;
    const items = this._applyFilterSort(this._getFavItems());
    const stack = stateManager.stack ?? [];

    if (!items.length) {
      const hasFavs = (stateManager.getState?.()?.favorites ?? stateManager.favorites ?? []).length > 0;
      list.innerHTML = hasFavs
        ? `<div class="favs-empty">
             <p style="font-size:32px">🔍</p>
             <p>Nenhum favorito com estes filtros.</p>
             <button class="btn-ghost" data-action="clear-filters">Limpar filtros</button>
           </div>`
        : `<div class="favs-empty">
             <p style="font-size:40px">♡</p>
             <p>Você ainda não favoritou nenhum suplemento.</p>
             <p style="font-size:13px;color:#666">Explore o catálogo e toque no ♥.</p>
             <a href="#/list" class="btn-primary" style="margin-top:10px">Explorar catálogo</a>
           </div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    items.forEach(supp => {
      const inStack  = stack.some(s => s.supplementId === supp.id);
      const basePrice = supp.price ?? null;

      const el = document.createElement('div');
      el.className = 'fav-item';
      el.setAttribute('role','listitem');
      el.dataset.id = supp.id;
      el.innerHTML = `
        <div class="fav-item-left">
          <div class="fav-meta">
            <p class="fav-category">${supp.category ?? ''}</p>
            <h3 class="fav-name">${supp.name}</h3>
          </div>
          <div class="fav-tags">
            <evidence-pill level="${supp.evidenceLevel ?? supp.evidence ?? 'D'}"></evidence-pill>
            ${(supp.targets ?? []).slice(0,2).map(t => `<span class="target-chip">${t}</span>`).join('')}
          </div>
        </div>
        <div class="fav-item-right">
          <div class="fav-price-container">
            ${basePrice ? `
              <div class="fav-price">
                <span class="fav-price-value">R$ ${parseFloat(basePrice).toFixed(2)}</span>
              </div>` : ''}
          </div>
          <div class="fav-actions">
            <span class="fav-aff-container" style="display: flex; align-items: center; gap: 6px;"></span>
            <button class="btn-add-stack-fav${inStack?' in-stack':''}" data-action="toggle-stack"
              data-id="${supp.id}" data-name="${supp.name}"
              aria-label="${inStack?'No seu stack':'Adicionar ao stack'}" aria-pressed="${inStack}">
              ${inStack ? '✓' : '+'}
            </button>
            <button class="btn-remove-fav" data-action="remove-fav" data-id="${supp.id}"
              aria-label="Remover ${supp.name} dos favoritos">♥</button>
          </div>
        </div>
      `;
      frag.appendChild(el);

      // Assynchronously fetch and render affiliate links and prices without blocking the UI thread
      Promise.resolve(this._affiliate.generateAffiliateLink(supp.id)).then(affLink => {
        if (!affLink) return;

        const bestPrice = affLink.price ?? basePrice;
        if (bestPrice) {
          const priceContainer = el.querySelector('.fav-price-container');
          if (priceContainer) {
            priceContainer.innerHTML = `
              <div class="fav-price">
                <span class="fav-price-value">R$ ${parseFloat(bestPrice).toFixed(2)}</span>
                <span class="fav-marketplace">${affLink.marketplace}</span>
              </div>
            `;
          }
        }

        const affContainer = el.querySelector('.fav-aff-container');
        if (affContainer) {
          affContainer.innerHTML = `
            <div class="fav-disclosure-wrapper" style="position: relative; display: inline-block;">
              <a href="${affLink.url}" target="_blank" rel="noopener noreferrer nofollow"
                class="btn-buy" aria-label="Comprar ${supp.name} (💰 Contém link de afiliado. Preço inalterado.)"
                data-action="track-affiliate" data-id="${supp.id}" data-marketplace="${affLink.marketplace}"
                style="display: flex; align-items: center; justify-content: center;">🛒</a>
              <span class="fav-disclosure-tooltip" style="
                position: absolute;
                bottom: 120%;
                right: 0;
                background: #222;
                border: 1px solid rgba(255,255,255,0.08);
                color: #ccc;
                font-size: 10px;
                padding: 4px 8px;
                border-radius: 6px;
                white-space: nowrap;
                display: none;
                z-index: 10;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              ">💰 Contém link de afiliado. Preço inalterado.</span>
            </div>
          `;

          const wrapper = affContainer.querySelector('.fav-disclosure-wrapper');
          const tooltip = affContainer.querySelector('.fav-disclosure-tooltip');
          if (wrapper && tooltip) {
            wrapper.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; });
            wrapper.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
          }
        }
      }).catch(err => {
        console.error('[FavoritesPage] generateAffiliateLink failed:', err);
      });
    });
    list.innerHTML = '';
    list.appendChild(frag);
  }

  // ── Render stats ──────────────────────────────────────────────────────────
  _renderStats() {
    const statsEl = this.container.querySelector('#favs-stats');
    if (!statsEl) return;
    const all    = this._getFavItems();
    const shown  = this._applyFilterSort(all).length;
    const stack  = stateManager.stack ?? [];
    const inStack = all.filter(s => stack.some(i => i.supplementId === s.id)).length;
    statsEl.innerHTML = `
      <span class="fav-stat-chip">♥ ${all.length} favoritos</span>
      ${shown !== all.length ? `<span class="fav-stat-chip">🔍 ${shown} filtrados</span>` : ''}
      <span class="fav-stat-chip" style="color:#00E676">✓ ${inStack} no stack</span>`;
  }

  // ── Listeners ─────────────────────────────────────────────────────────────
  _attachListeners() {
    // Filter selects
    this.container.querySelector('#fav-filter-category')?.addEventListener('change', (e) => {
      this._filter.category = e.target.value;
      this._renderList(); this._renderStats();
    });
    this.container.querySelector('#fav-filter-evidence')?.addEventListener('change', (e) => {
      this._filter.evidence = e.target.value;
      this._renderList(); this._renderStats();
    });
    this.container.querySelector('#fav-sort')?.addEventListener('change', (e) => {
      this._sort = e.target.value;
      this._renderList();
    });
    this.container.querySelector('#btn-clear-favs')?.addEventListener('click', () => this._clearFilters());

    // List actions (delegation)
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      if (btn.dataset.action === 'remove-fav') {
        stateManager.dispatch(ACTIONS.REMOVE_FAVORITE, { supplementId: btn.dataset.id });
        if (window.SupliToast) window.SupliToast.show('Removido dos favoritos', 'info');
      }

      if (btn.dataset.action === 'toggle-stack') {
        const id      = btn.dataset.id;
        const name    = btn.dataset.name;
        const inStack = (stateManager.stack ?? []).some(s => s.supplementId === id);
        if (inStack) {
          stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { supplementId: id });
        } else {
          // #EIXO3 FIX: Obter registro clínico bruto do stateManager e calcular dosagem personalizada na hora
          const supps = SUPPLEMENTS_DB;
          const rawSupp = supps.find(s => s.id === id);
          const user = stateManager.user ?? {};
          let dosage = rawSupp?.dosage?.maintenance ?? 0;
          let unit = rawSupp?.dosage?.unit ?? 'g';
          
          if (rawSupp) {
            try {
              const calc = DosageCalculator.calculate(rawSupp, user);
              if (calc?.daily) {
                dosage = calc.daily;
                unit = calc.unit;
              }
            } catch (_) {}
          }
          
          stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
            supplementId: id,
            name,
            dosage,
            unit,
            frequency: 'diário'
          });
        }
        if (window.SupliToast) window.SupliToast.show(
          inStack ? `${name} removido do stack` : `✓ ${name} adicionado ao stack!`,
          inStack ? 'info' : 'success'
        );
        // Optimistic UI update
        btn.textContent = inStack ? '+' : '✓';
        btn.classList.toggle('in-stack', !inStack);
        btn.setAttribute('aria-pressed', String(!inStack));
      }

      if (btn.dataset.action === 'track-affiliate') {
        this._affiliate.trackAffiliateClick(btn.dataset.id, btn.dataset.marketplace);
      }

      if (btn.dataset.action === 'clear-filters') {
        this._clearFilters();
      }
    });
  }

  _clearFilters() {
    this._filter = { category: '', evidence: '' };
    const cat = this.container.querySelector('#fav-filter-category');
    const ev  = this.container.querySelector('#fav-filter-evidence');
    if (cat) cat.value = '';
    if (ev)  ev.value  = '';
    this._renderList();
    this._renderStats();
  }
}

export default FavoritesPage;
