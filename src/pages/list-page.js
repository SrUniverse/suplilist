// ============================================================
// ListPage v4.0 — SupliList
// Catálogo com Fuse.js, DocumentFragment, IntersectionObserver
// ============================================================

import { stateManager, ACTIONS } from '../state/state-manager.js';
import { eventBus } from '../core/event-bus.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import Fuse from 'fuse.js';

const PAGE_SIZE = 24;

// ── Simple offline fallback ────────────────────────────────────────────────────
function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default class ListPage {
  constructor(container) {
    this.container = container;
    this._listeners = [];
    this._unsubscribe = null;
    this._observer = null;
    this._fuse = null;
    this._allItems = [];
    this._filtered = [];
    this._page = 0;
    this._query = '';
    this._filters = { objective: '', evidence: '', category: '' };
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  async mount() {
    this._attachStyles();
    this._render();
    await this._loadData();
    await this._initFuseSearch();
    this._applyFilters();
    this._renderGrid();
    this._initInfiniteScroll();
    this._attachListeners();
    this._unsubscribe = stateManager.subscribe?.(() => this._refreshCardStates());
  }

  unmount() {
    this._listeners.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
    this._listeners = [];
    this._observer?.disconnect();
    this._unsubscribe?.();
  }

  _on(el, event, fn) {
    el.addEventListener(event, fn);
    this._listeners.push([el, event, fn]);
  }

  // ── Styles (idempotent) ─────────────────────────────────────────────────────
  _attachStyles() {
    if (document.getElementById('list-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'list-page-styles';
    style.textContent = `
      #list-root { padding: 16px 16px 80px; display: flex; flex-direction: column; gap: 16px; }
      .lp-header { display: flex; flex-direction: column; gap: 12px; }
      .lp-stats  { font-size: 12px; color: var(--color-text-secondary); }
      .lp-filters {
        display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;
        scrollbar-width: none;
      }
      .lp-filters::-webkit-scrollbar { display: none; }
      .lp-filter-select {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px; padding: 7px 12px;
        font-size: 13px; font-weight: 600;
        color: var(--color-text-primary);
        cursor: pointer; outline: none;
        appearance: none; -webkit-appearance: none;
      }
      .lp-filter-select:focus { border-color: var(--color-brand); }
      .lp-btn-clear {
        flex-shrink: 0;
        background: none; border: 1px solid var(--color-border);
        border-radius: 20px; padding: 7px 14px;
        font-size: 13px; font-weight: 600;
        color: var(--color-text-secondary); cursor: pointer;
      }
      .lp-btn-clear:hover { border-color: var(--color-brand); color: var(--color-brand); }
      .lp-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      @media (min-width: 480px) { .lp-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (min-width: 768px) { .lp-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (min-width: 1024px){ .lp-grid { grid-template-columns: repeat(4, 1fr); } }
      .lp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px; padding: 16px;
        display: flex; flex-direction: column; gap: 10px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .lp-card:hover { border-color: var(--color-brand); box-shadow: 0 0 0 1px var(--color-brand); }
      .lp-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
      .lp-card-name { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
      .lp-card-cat  { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
      .lp-card-ev   {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        padding: 2px 8px; border-radius: 20px; white-space: nowrap; letter-spacing: 0.04em;
      }
      .lp-card-actions { display: flex; gap: 6px; justify-content: flex-end; }
      .lp-btn-fav, .lp-btn-add {
        border: none; border-radius: 20px; cursor: pointer;
        font-size: 12px; font-weight: 700; font-family: var(--font-sans, system-ui, sans-serif);
        padding: 6px 12px; transition: opacity 0.15s;
      }
      .lp-btn-fav { background: var(--color-surface-hover, #1e1e1e); color: var(--color-text-primary); }
      .lp-btn-add { background: var(--color-brand, #7C3AED); color: #fff; }
      .lp-btn-fav:hover, .lp-btn-add:hover { opacity: 0.8; }
      .lp-empty {
        text-align: center; padding: 40px 20px;
        color: var(--color-text-secondary);
      }
      .lp-sentinel { height: 1px; }
      .lp-loading  { text-align: center; padding: 20px; color: var(--color-text-secondary); font-size: 13px; }
    `;
    document.head.appendChild(style);
  }

  // ── Shell render ────────────────────────────────────────────────────────────
  _render() {
    this.container.innerHTML = `
      <div id="list-root">
        <div class="lp-header">
          <search-bar id="lp-search" placeholder="Buscar suplemento..."></search-bar>
          <p class="lp-stats" id="lp-stats">Carregando...</p>
          <div class="lp-filters">
            <select class="lp-filter-select" id="lp-filter-obj" aria-label="Filtrar por objetivo">
              <option value="">🎯 Objetivo</option>
              <option value="bulk">Ganho de massa</option>
              <option value="cut">Definição</option>
              <option value="health">Saúde geral</option>
              <option value="performance">Performance</option>
              <option value="recovery">Recuperação</option>
            </select>
            <select class="lp-filter-select" id="lp-filter-ev" aria-label="Filtrar por evidência">
              <option value="">🔬 Evidência</option>
              <option value="A">Nível A — Forte</option>
              <option value="B">Nível B — Moderada</option>
              <option value="C">Nível C — Limitada</option>
              <option value="D">Nível D — Anedótica</option>
            </select>
            <select class="lp-filter-select" id="lp-filter-cat" aria-label="Filtrar por categoria">
              <option value="">📦 Categoria</option>
              <option value="proteina">Proteína</option>
              <option value="aminoacido">Aminoácido</option>
              <option value="vitamina">Vitamina</option>
              <option value="mineral">Mineral</option>
              <option value="adaptogeno">Adaptógeno</option>
              <option value="prebiotico">Prebiótico</option>
              <option value="omega">Ômega</option>
            </select>
            <button class="lp-btn-clear" id="lp-btn-clear" type="button">Limpar</button>
          </div>
        </div>
        <div class="lp-grid" id="lp-grid" role="list"></div>
        <div class="lp-sentinel" id="lp-sentinel" aria-hidden="true"></div>
        <div class="lp-loading" id="lp-loading" style="display:none;">Carregando mais...</div>
      </div>
    `;
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  async _loadData() {
    this._allItems = SUPPLEMENTS_DB;
  }

  // ── Fuse init ───────────────────────────────────────────────────────────────
  async _initFuseSearch() {
    if (!this._allItems.length) { this._fuse = null; return; }
    this._fuse = new Fuse(this._allItems, {
      keys: ['name', 'category', 'benefits'],
      threshold: 0.35,
      includeScore: true,
      ignoreLocation: true,
      useExtendedSearch: false,
    });
  }

  // ── Simple offline fallback ─────────────────────────────────────────────────
  _simpleFuzzySearch(query, items) {
    const q = normalize(query);
    return items.filter(item => normalize(item.name).includes(q));
  }

  // ── Filter pipeline ─────────────────────────────────────────────────────────
  _applyFilters() {
    const { objective, evidence, category } = this._filters;
    let results = this._allItems;

    if (this._query.trim()) {
      if (this._fuse) {
        results = this._fuse.search(this._query).map(r => r.item);
      } else {
        results = this._simpleFuzzySearch(this._query, results);
      }
    }

    if (objective) results = results.filter(s => s.objectives?.includes(objective) || s.objective === objective);
    if (evidence) results = results.filter(s => s.evidenceLevel === evidence || s.evidence === evidence);
    if (category) results = results.filter(s => normalize(s.category).includes(normalize(category)));

    this._filtered = results;
    this._updateStats();
  }

  _updateStats() {
    const el = this.container.querySelector('#lp-stats');
    if (el) el.textContent = `${this._filtered.length} suplemento(s) encontrado(s)`;
  }

  // ── Grid render (DocumentFragment) ─────────────────────────────────────────
  _renderGrid() {
    const t0 = performance.now();
    const grid = this.container.querySelector('#lp-grid');
    if (!grid) return;

    this._page = 0;
    grid.innerHTML = '';

    if (!this._filtered.length) {
      grid.innerHTML = `
        <div class="lp-empty" style="grid-column:1/-1;">
          <div style="font-size:32px;margin-bottom:12px;">🔍</div>
          <p style="font-weight:700;margin-bottom:8px;">Nenhum resultado</p>
          <button class="lp-btn-clear" id="lp-empty-clear" type="button">Limpar filtros</button>
        </div>`;
      const clr = grid.querySelector('#lp-empty-clear');
      if (clr) clr.addEventListener('click', () => this._clearFilters());
      return;
    }

    const frag = this._buildFragment(0, PAGE_SIZE);
    grid.appendChild(frag);
    this._page = 1;
    console.debug(`[ListPage] _renderGrid ${this._filtered.length} items in ${(performance.now() - t0).toFixed(1)}ms`);
  }

  _loadMore() {
    const start = this._page * PAGE_SIZE;
    if (start >= this._filtered.length) return;
    const grid = this.container.querySelector('#lp-grid');
    if (!grid) return;
    const loading = this.container.querySelector('#lp-loading');
    if (loading) loading.style.display = 'block';
    requestAnimationFrame(() => {
      grid.appendChild(this._buildFragment(start, start + PAGE_SIZE));
      this._page++;
      if (loading) loading.style.display = 'none';
    });
  }

  _buildFragment(from, to) {
    const frag = document.createDocumentFragment();
    const favorites = stateManager.getState?.()?.favorites ?? stateManager.favorites ?? [];
    const stack = stateManager.stack ?? [];
    const slice = this._filtered.slice(from, to);

    slice.forEach(item => {
      const div = document.createElement('div');
      const isFav = favorites.some(f => f === item.id || f.supplementId === item.id);
      const inStack = stack.some(s => s.supplementId === item.id);
      const evColor = { A: '#22C55E', B: '#F59E0B', C: '#3B82F6', D: '#6B7280' }[item.evidenceLevel ?? item.evidence] ?? '#6B7280';

      div.className = 'lp-card';
      div.role = 'listitem';
      div.dataset.id = item.id;
      div.innerHTML = `
        <div class="lp-card-top">
          <div>
            <p class="lp-card-name">${item.name}</p>
            <p class="lp-card-cat">${item.category ?? ''}</p>
          </div>
          ${item.evidenceLevel || item.evidence ? `
            <span class="lp-card-ev" style="background:${evColor}22;color:${evColor};border:1px solid ${evColor}44">
              Ev. ${item.evidenceLevel ?? item.evidence}
            </span>` : ''}
        </div>
        <p style="font-size:12px;color:var(--color-text-secondary);line-height:1.4;flex:1;">
          ${item.benefits?.[0] ?? item.description ?? ''}
        </p>
        <div class="lp-card-actions">
          <button class="lp-btn-fav" data-action="favorite" data-id="${item.id}"
            aria-label="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
            aria-pressed="${isFav}">
            ${isFav ? '❤️' : '🤍'}
          </button>
          <button class="lp-btn-add" data-action="add-stack" data-id="${item.id}"
            ${inStack ? 'disabled style="opacity:.5;cursor:default"' : ''}
            aria-label="${inStack ? 'Já no stack' : 'Adicionar ao stack'}">
            ${inStack ? '✓ Stack' : '+ Stack'}
          </button>
        </div>
      `;
      frag.appendChild(div);
    });
    return frag;
  }

  // ── IntersectionObserver ────────────────────────────────────────────────────
  _initInfiniteScroll() {
    this._observer?.disconnect();
    const sentinel = this.container.querySelector('#lp-sentinel');
    if (!sentinel) return;
    this._observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) this._loadMore();
    }, { rootMargin: '200px' });
    this._observer.observe(sentinel);
  }

  // ── Refresh card states (no re-render) ─────────────────────────────────────
  _refreshCardStates() {
    const favorites = stateManager.getState?.()?.favorites ?? stateManager.favorites ?? [];
    const stack = stateManager.stack ?? [];
    this.container.querySelectorAll('.lp-card').forEach(card => {
      const id = card.dataset.id;
      const isFav = favorites.some(f => f === id || f.supplementId === id);
      const inStack = stack.some(s => s.supplementId === id);
      const favBtn = card.querySelector('[data-action="favorite"]');
      const addBtn = card.querySelector('[data-action="add-stack"]');
      if (favBtn) { favBtn.textContent = isFav ? '❤️' : '🤍'; favBtn.setAttribute('aria-pressed', isFav); }
      if (addBtn) {
        addBtn.textContent = inStack ? '✓ Stack' : '+ Stack';
        addBtn.disabled = inStack;
        addBtn.style.opacity = inStack ? '0.5' : '1';
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  _clearFilters() {
    this._query = '';
    this._filters = { objective: '', evidence: '', category: '' };
    const search = this.container.querySelector('#lp-search');
    const obj = this.container.querySelector('#lp-filter-obj');
    const ev = this.container.querySelector('#lp-filter-ev');
    const cat = this.container.querySelector('#lp-filter-cat');
    if (search) search.setAttribute('value', '');
    if (obj) obj.value = '';
    if (ev) ev.value = '';
    if (cat) cat.value = '';
    this._applyFilters();
    this._renderGrid();
  }

  _getItemById(id) {
    return this._allItems.find(s => s.id === id);
  }

  // ── Event listeners ─────────────────────────────────────────────────────────
  _attachListeners() {
    // Search (debounced via web component)
    const searchEl = this.container.querySelector('#lp-search');
    if (searchEl) {
      this._on(searchEl, 'sl-search', (e) => {
        this._query = e.detail?.query ?? '';
        this._applyFilters();
        this._renderGrid();
      });
      this._on(searchEl, 'sl-clear', () => {
        this._query = '';
        this._applyFilters();
        this._renderGrid();
      });
    }

    // Filters
    const filterHandler = () => {
      this._filters.objective = this.container.querySelector('#lp-filter-obj')?.value ?? '';
      this._filters.evidence = this.container.querySelector('#lp-filter-ev')?.value ?? '';
      this._filters.category = this.container.querySelector('#lp-filter-cat')?.value ?? '';
      this._applyFilters();
      this._renderGrid();
    };
    ['#lp-filter-obj', '#lp-filter-ev', '#lp-filter-cat'].forEach(sel => {
      const el = this.container.querySelector(sel);
      if (el) this._on(el, 'change', filterHandler);
    });

    // Clear button
    const clrBtn = this.container.querySelector('#lp-btn-clear');
    if (clrBtn) this._on(clrBtn, 'click', () => this._clearFilters());

    // Card actions (event delegation on grid)
    const grid = this.container.querySelector('#lp-grid');
    if (grid) {
      this._on(grid, 'click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        const item = this._getItemById(id);
        if (!item) return;

        if (btn.dataset.action === 'favorite') {
          const isFav = stateManager.getState?.()?.favorites?.some(f => f === id || f.supplementId === id)
            ?? stateManager.favorites?.some(f => f === id) ?? false;
          stateManager.dispatch(isFav ? ACTIONS.REMOVE_FAVORITE : ACTIONS.ADD_FAVORITE, { supplementId: id });
          eventBus.emit('ui:toastRequested', {
            message: isFav ? '💔 Removido dos favoritos' : '❤️ Adicionado aos favoritos',
            type: 'info',
          });
          this._refreshCardStates();
        }

        if (btn.dataset.action === 'add-stack') {
          if (btn.disabled) return;
          stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
            supplementId: item.id,
            name: item.name,
            dosage: item.dosage?.maintenance,
            unit: item.dosage?.unit || 'g',
            frequency: 'diário',
          });
          eventBus.emit('ui:toastRequested', {
            message: `✅ ${item.name} adicionado ao stack!`,
            type: 'success',
          });
          this._refreshCardStates();
        }

        if (btn.dataset.action === 'view-detail' || e.target.closest('.lp-card-name')) {
          window.dispatchEvent(new CustomEvent('sl-navigate', {
            detail: { route: `/supplement/${id}` },
          }));
        }
      });
    }
  }
}
