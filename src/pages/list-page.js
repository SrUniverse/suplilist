import { stateManager, ACTIONS } from '../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import Fuse from 'fuse.js';

const PAGE_SIZE = 24;

export default class ListPage {
  constructor(container) {
    this.container = container;
    this._unsubscribe = null;
    this._fuse = null;
    this._allItems = [];
    this._filtered = [];
    this._page = 0;
    this._query = '';
    this._filters = { objective: '', evidence: '', category: '' };
  }

  mount() {
    this._attachStyles();
    this._render();
    this._allItems = SUPPLEMENTS_DB;
    this._fuse = new Fuse(this._allItems, {
      keys: ['name', 'category', 'benefits'],
      threshold: 0.35,
      includeScore: true,
      ignoreLocation: true,
    });
    this._applyFilters();
    this._renderGrid();
    this._initInfiniteScroll();
    this._attachListeners();
    this._unsubscribe = stateManager.subscribe(() => this._refreshCardStates());
  }

  unmount() {
    this._unsubscribe?.();
  }

  _attachStyles() {
    if (document.getElementById('list-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'list-page-styles';
    style.textContent = `
      #list-root { padding: 16px 16px 80px; display: flex; flex-direction: column; gap: 16px; }
      .lp-search-input {
        width: 100%; box-sizing: border-box;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 12px; padding: 10px 14px;
        font-size: 14px; color: var(--color-text-primary);
        outline: none;
      }
      .lp-search-input:focus { border-color: var(--color-brand); }
      .lp-stats { font-size: 12px; color: var(--color-text-secondary); margin: 0; }
      .lp-filters {
        display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;
        scrollbar-width: none;
      }
      .lp-filters::-webkit-scrollbar { display: none; }
      .lp-filter-btn {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px; padding: 7px 14px;
        font-size: 13px; font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer; white-space: nowrap;
      }
      .lp-filter-btn.active {
        background: var(--color-brand);
        border-color: var(--color-brand);
        color: #fff;
      }
      .lp-filter-btn:hover:not(.active) { border-color: var(--color-brand); color: var(--color-brand); }
      .lp-filter-select {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px; padding: 7px 12px;
        font-size: 13px; font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer; outline: none;
        appearance: none; -webkit-appearance: none;
      }
      .lp-filter-select:focus { border-color: var(--color-brand); }
      .lp-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      @media (min-width: 480px) { .lp-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (min-width: 768px) { .lp-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (min-width: 1024px) { .lp-grid { grid-template-columns: repeat(4, 1fr); } }
      .lp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px; padding: 16px;
        display: flex; flex-direction: column; gap: 10px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .lp-card:hover { border-color: var(--color-brand); box-shadow: 0 0 0 1px var(--color-brand); }
      .lp-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
      .lp-card-name { font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin: 0; }
      .lp-card-cat  { font-size: 11px; color: var(--color-text-secondary); margin: 2px 0 0; }
      .lp-ev-badge  {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        padding: 2px 8px; border-radius: 20px; white-space: nowrap; letter-spacing: 0.04em;
        flex-shrink: 0;
      }
      .lp-card-desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; flex: 1; margin: 0; }
      .lp-card-actions { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
      .lp-btn-add {
        border: none; border-radius: 20px; cursor: pointer;
        font-size: 12px; font-weight: 700;
        padding: 6px 14px;
        background: var(--color-brand); color: #fff;
        transition: opacity 0.15s;
      }
      .lp-btn-add:hover { opacity: 0.8; }
      .lp-in-stack-badge {
        font-size: 11px; font-weight: 700;
        padding: 5px 12px; border-radius: 20px;
        background: var(--color-success, #22C55E22);
        color: var(--color-success, #22C55E);
        border: 1px solid var(--color-success, #22C55E44);
      }
      .lp-empty {
        grid-column: 1 / -1;
        text-align: center; padding: 40px 20px;
        color: var(--color-text-secondary);
      }
      .lp-sentinel { height: 1px; }
      .lp-loading { text-align: center; padding: 20px; color: var(--color-text-secondary); font-size: 13px; }
    `;
    document.head.appendChild(style);
  }

  _render() {
    this.container.innerHTML = `
      <div id="list-root">
        <div style="display:flex;flex-direction:column;gap:12px;">
          <input id="lp-search" class="lp-search-input" type="search" placeholder="Buscar suplemento..." autocomplete="off" />
          <p class="lp-stats" id="lp-stats"></p>
          <div class="lp-filters" id="lp-obj-filters">
            <button class="lp-filter-btn" data-obj="" type="button">Todos</button>
            <button class="lp-filter-btn" data-obj="strength" type="button">Força</button>
            <button class="lp-filter-btn" data-obj="general" type="button">Saúde</button>
            <button class="lp-filter-btn" data-obj="endurance" type="button">Energia</button>
            <button class="lp-filter-btn" data-obj="bulk" type="button">Massa</button>
            <button class="lp-filter-btn" data-obj="cut" type="button">Definição</button>
          </div>
          <div class="lp-filters" id="lp-ev-filters">
            <button class="lp-filter-btn" data-ev="" type="button">Toda evidência</button>
            <button class="lp-filter-btn" data-ev="A" type="button">Evidência A</button>
            <button class="lp-filter-btn" data-ev="B" type="button">Evidência B</button>
            <button class="lp-filter-btn" data-ev="C" type="button">Evidência C</button>
          </div>
        </div>
        <div class="lp-grid" id="lp-grid" role="list"></div>
        <div class="lp-sentinel" id="lp-sentinel" aria-hidden="true"></div>
        <div class="lp-loading" id="lp-loading" style="display:none;">Carregando mais...</div>
      </div>
    `;
  }

  _applyFilters() {
    const { objective, evidence } = this._filters;
    let results = this._allItems;

    if (this._query.trim()) {
      results = this._fuse
        ? this._fuse.search(this._query).map(r => r.item)
        : results.filter(s => s.name.toLowerCase().includes(this._query.toLowerCase()));
    }

    if (objective) {
      results = results.filter(s => s.targets && s.targets[objective] != null);
    }
    if (evidence) {
      results = results.filter(s => s.evidenceLevel === evidence);
    }

    this._filtered = results;
    this._updateStats();
  }

  _updateStats() {
    const el = this.container.querySelector('#lp-stats');
    if (el) el.textContent = `${this._filtered.length} suplemento(s) encontrado(s)`;
  }

  _renderGrid() {
    const grid = this.container.querySelector('#lp-grid');
    if (!grid) return;
    this._page = 0;
    grid.innerHTML = '';

    if (!this._filtered.length) {
      grid.innerHTML = `
        <div class="lp-empty">
          <div style="font-size:32px;margin-bottom:12px;">🔍</div>
          <p style="font-weight:700;margin-bottom:8px;">Nenhum resultado</p>
          <p style="font-size:13px;">Tente outra busca ou remova os filtros.</p>
        </div>`;
      return;
    }

    grid.appendChild(this._buildFragment(0, PAGE_SIZE));
    this._page = 1;
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
    const stack = stateManager.getState?.()?.stack ?? stateManager.stack ?? [];
    const evColors = { A: '#22C55E', B: '#F59E0B', C: '#3B82F6', D: '#6B7280' };

    this._filtered.slice(from, to).forEach(item => {
      const inStack = stack.some(s => s.supplementId === item.id);
      const evColor = evColors[item.evidenceLevel] ?? '#6B7280';
      const desc = item.benefits?.[0] ?? item.description ?? '';

      const div = document.createElement('div');
      div.className = 'lp-card';
      div.role = 'listitem';
      div.dataset.id = item.id;
      div.innerHTML = `
        <div class="lp-card-top">
          <div>
            <p class="lp-card-name">${item.name}</p>
            <p class="lp-card-cat">${item.category ?? ''}</p>
          </div>
          ${item.evidenceLevel ? `
            <span class="lp-ev-badge" style="background:${evColor}22;color:${evColor};border:1px solid ${evColor}44;">
              Evidência ${item.evidenceLevel}
            </span>` : ''}
        </div>
        ${desc ? `<p class="lp-card-desc">${desc}</p>` : ''}
        <div class="lp-card-actions">
          ${inStack
            ? `<span class="lp-in-stack-badge">✓ No Stack</span>`
            : `<button class="lp-btn-add" data-action="add-stack" data-id="${item.id}" type="button">+ Stack</button>`
          }
        </div>
      `;
      frag.appendChild(div);
    });
    return frag;
  }

  _initInfiniteScroll() {
    const sentinel = this.container.querySelector('#lp-sentinel');
    if (!sentinel || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) this._loadMore();
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
  }

  _refreshCardStates() {
    const stack = stateManager.getState?.()?.stack ?? stateManager.stack ?? [];
    const evColors = { A: '#22C55E', B: '#F59E0B', C: '#3B82F6', D: '#6B7280' };

    this.container.querySelectorAll('.lp-card').forEach(card => {
      const id = card.dataset.id;
      const inStack = stack.some(s => s.supplementId === id);
      const actionsEl = card.querySelector('.lp-card-actions');
      if (!actionsEl) return;

      const existingBadge = actionsEl.querySelector('.lp-in-stack-badge');
      const existingBtn = actionsEl.querySelector('[data-action="add-stack"]');

      if (inStack && !existingBadge) {
        actionsEl.innerHTML = `<span class="lp-in-stack-badge">✓ No Stack</span>`;
      } else if (!inStack && !existingBtn) {
        actionsEl.innerHTML = `<button class="lp-btn-add" data-action="add-stack" data-id="${id}" type="button">+ Stack</button>`;
      }
    });
  }

  _setObjFilter(value) {
    this._filters.objective = value;
    this.container.querySelectorAll('[data-obj]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.obj === value);
    });
    this._applyFilters();
    this._renderGrid();
  }

  _setEvFilter(value) {
    this._filters.evidence = value;
    this.container.querySelectorAll('[data-ev]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ev === value);
    });
    this._applyFilters();
    this._renderGrid();
  }

  _attachListeners() {
    const searchEl = this.container.querySelector('#lp-search');
    if (searchEl) {
      let debounceTimer;
      searchEl.addEventListener('input', e => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this._query = e.target.value;
          this._applyFilters();
          this._renderGrid();
        }, 250);
      });
    }

    const objFilters = this.container.querySelector('#lp-obj-filters');
    if (objFilters) {
      // set "Todos" active by default
      const allBtn = objFilters.querySelector('[data-obj=""]');
      if (allBtn) allBtn.classList.add('active');

      objFilters.addEventListener('click', e => {
        const btn = e.target.closest('[data-obj]');
        if (btn) this._setObjFilter(btn.dataset.obj);
      });
    }

    const evFilters = this.container.querySelector('#lp-ev-filters');
    if (evFilters) {
      const allBtn = evFilters.querySelector('[data-ev=""]');
      if (allBtn) allBtn.classList.add('active');

      evFilters.addEventListener('click', e => {
        const btn = e.target.closest('[data-ev]');
        if (btn) this._setEvFilter(btn.dataset.ev);
      });
    }

    const grid = this.container.querySelector('#lp-grid');
    if (grid) {
      grid.addEventListener('click', e => {
        const btn = e.target.closest('[data-action="add-stack"]');
        if (!btn) return;
        const id = btn.dataset.id;
        const item = this._allItems.find(s => s.id === id);
        if (!item) return;

        stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
          supplementId: item.id,
          name: item.name,
          dosage: item.dosage?.maintenance ?? item.defaultDose,
          unit: item.dosage?.unit ?? item.unit ?? 'g',
          quantity: 0,
        });

        this._refreshCardStates();
      });
    }
  }
}
