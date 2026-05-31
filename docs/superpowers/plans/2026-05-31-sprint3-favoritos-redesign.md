# Sprint 3 — Favoritos: Redesign Completo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a página Favoritos para ter filtros por objetivo, sort dropdown, botão "Otimizar Todos", e cards grandes com foto, price info e botões "Detalhes"/"Ver Preços".

**Architecture:** Reescrita completa do CSS e HTML em `favorites-page.js`. A lógica de dados (favoritos, stack, supplements DB) é mantida; apenas a apresentação muda. Filtros passam de categorias brutas para objetivos mapeados (Hipertrofia, Performance, Saúde Geral). Sort é client-side.

**Tech Stack:** Vanilla JS, CSS injetado via style tag (substitui inline styles), SUPPLEMENTS_DB para dados de preço e imagem.

---

## Mapa de Arquivos

| Arquivo | Ação |
|---|---|
| `src/pages/favorites-page.js` | Modificar — full rewrite de styles + render |

---

## Task 1: Novo sistema de CSS + header

**Files:**
- Modify: `src/pages/favorites-page.js`

- [ ] **Step 1: Adicionar `_injectStyles()` com CSS completo**

Na classe `FavoritesPage`, adicionar o método `_injectStyles()` e chamá-lo no `mount()`:

```js
  _injectStyles() {
    if (document.getElementById('fav-page-styles-v3')) return;
    const style = document.createElement('style');
    style.id = 'fav-page-styles-v3';
    style.textContent = `
      .fv-root {
        padding: 0 0 120px;
        min-height: 100%;
        font-family: 'Inter', sans-serif;
      }
      /* ── Header ── */
      .fv-header {
        padding: 20px 20px 0;
        display: flex; flex-direction: column; gap: 14px;
      }
      .fv-breadcrumb {
        font-size: 12px; color: var(--color-text-muted);
        display: flex; align-items: center; gap: 6px;
      }
      .fv-breadcrumb-sep { opacity: 0.4; }
      .fv-title-row {
        display: flex; align-items: center;
        justify-content: space-between; gap: 12px;
        flex-wrap: wrap;
      }
      .fv-title {
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: clamp(22px, 5vw, 32px); margin: 0;
        color: var(--color-text-primary);
      }
      .fv-btn-optimize {
        display: flex; align-items: center; gap: 7px;
        padding: 9px 16px; border-radius: 10px; border: none;
        background: var(--color-brand); color: #fff;
        font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
        cursor: pointer; white-space: nowrap;
        transition: background 0.15s;
      }
      .fv-btn-optimize:hover { background: var(--color-brand-hover); }
      /* ── Filters + Sort ── */
      .fv-controls {
        padding: 16px 20px 0;
        display: flex; align-items: center;
        justify-content: space-between; gap: 12px;
        flex-wrap: wrap;
      }
      .fv-chips {
        display: flex; gap: 8px; overflow-x: auto;
        scrollbar-width: none; flex-shrink: 0;
      }
      .fv-chips::-webkit-scrollbar { display: none; }
      .fv-chip {
        flex-shrink: 0; padding: 7px 16px;
        border-radius: 20px; border: 1.5px solid var(--color-border);
        background: transparent; color: var(--color-text-secondary);
        font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
        cursor: pointer; white-space: nowrap;
        transition: all 0.15s;
      }
      .fv-chip:hover:not(.active) { border-color: var(--color-brand); color: var(--color-brand); }
      .fv-chip.active {
        background: var(--color-brand-muted);
        border-color: var(--color-brand);
        color: var(--color-brand); font-weight: 600;
      }
      .fv-sort-wrap {
        display: flex; align-items: center; gap: 8px; flex-shrink: 0;
      }
      .fv-sort-label {
        font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em; color: var(--color-text-muted);
        white-space: nowrap;
      }
      .fv-sort-select {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 8px; padding: 6px 10px;
        font-size: 12px; font-weight: 600;
        color: var(--color-text-primary);
        font-family: 'Inter', sans-serif;
        cursor: pointer; outline: none;
      }
      .fv-sort-select:focus { border-color: var(--color-brand); }
      /* ── Grid ── */
      .fv-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        padding: 20px;
      }
      @media (max-width: 480px) {
        .fv-grid { grid-template-columns: 1fr; }
      }
      @media (min-width: 900px) {
        .fv-grid { grid-template-columns: repeat(3, 1fr); }
      }
      /* ── Card ── */
      .fv-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px; overflow: hidden;
        display: flex; flex-direction: column;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .fv-card:hover {
        border-color: var(--color-brand);
        box-shadow: 0 4px 20px rgba(124,58,237,0.1);
      }
      .fv-card-img-wrap {
        position: relative;
        aspect-ratio: 4/3;
        background: #111;
        overflow: hidden;
      }
      .fv-card-img {
        width: 100%; height: 100%;
        object-fit: contain;
        padding: 12px;
      }
      .fv-card-fav-btn {
        position: absolute; top: 8px; right: 8px;
        width: 32px; height: 32px; border-radius: 50%;
        background: rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.15);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 15px;
        transition: background 0.15s;
        color: #EF4444;
      }
      .fv-card-fav-btn:hover { background: rgba(239,68,68,0.2); }
      .fv-card-body { padding: 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
      .fv-card-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .fv-badge-ev {
        font-size: 10px; font-weight: 700; padding: 2px 8px;
        border-radius: 5px; text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .fv-badge-cat {
        font-size: 10px; color: var(--color-text-muted);
        text-transform: uppercase; letter-spacing: 0.04em;
      }
      .fv-card-name {
        font-size: 15px; font-weight: 700;
        color: var(--color-text-primary); margin: 0;
        line-height: 1.3;
      }
      .fv-card-desc {
        font-size: 12px; color: var(--color-text-secondary);
        line-height: 1.5; margin: 0;
        display: -webkit-box; -webkit-line-clamp: 2;
        -webkit-box-orient: vertical; overflow: hidden;
      }
      .fv-card-price-row {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 0 0;
        border-top: 1px solid var(--color-border);
        margin-top: auto;
      }
      .fv-card-price-label {
        font-size: 10px; font-weight: 600;
        color: var(--color-text-muted); text-transform: uppercase;
        letter-spacing: 0.04em; flex-shrink: 0;
      }
      .fv-card-price-val {
        font-size: 15px; font-weight: 800;
        color: var(--color-text-primary); flex: 1;
      }
      .fv-card-actions {
        display: flex; gap: 8px; margin-top: 8px;
      }
      .fv-btn-detail {
        flex: 1; padding: 9px 12px;
        border-radius: 10px;
        border: 1px solid var(--color-border-strong);
        background: transparent; color: var(--color-text-secondary);
        font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
        cursor: pointer; text-align: center;
        transition: background 0.15s;
      }
      .fv-btn-detail:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
      .fv-btn-buy {
        flex: 1; padding: 9px 12px;
        border-radius: 10px; border: none;
        background: var(--color-brand); color: #fff;
        font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700;
        cursor: pointer; text-align: center;
        transition: background 0.15s;
      }
      .fv-btn-buy:hover { background: var(--color-brand-hover); }
      /* ── Empty ── */
      .fv-empty {
        grid-column: 1/-1; text-align: center;
        padding: 60px 20px; display: flex;
        flex-direction: column; align-items: center; gap: 12px;
      }
      .fv-empty-icon { font-size: 48px; opacity: 0.5; }
      .fv-empty-title {
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: 20px; color: var(--color-text-primary); margin: 0;
      }
      .fv-empty-sub {
        font-size: 14px; color: var(--color-text-secondary);
        margin: 0; max-width: 300px; line-height: 1.6;
      }
      .fv-empty-btn {
        background: var(--color-brand); color: #fff;
        border: none; border-radius: 10px; padding: 11px 24px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        font-family: 'Inter', sans-serif; margin-top: 4px;
        transition: background 0.15s;
      }
      .fv-empty-btn:hover { background: var(--color-brand-hover); }
    `;
    document.head.appendChild(style);
  }
```

- [ ] **Step 2: Chamar `_injectStyles()` no `mount()`**

Localizar o método `mount()`:
```js
  mount() {
    window.addEventListener('storage', this._handleStorageChange);
    this._render();
  }
```

Substituir por:
```js
  mount() {
    this._injectStyles();
    window.addEventListener('storage', this._handleStorageChange);
    this._render();
  }
```

- [ ] **Step 3: Commit parcial**

```bash
git add src/pages/favorites-page.js
git commit -m "feat(favorites): inject CSS styles system"
```

---

## Task 2: Reescrever `_render()` com filtros de objetivo e cards visuais

**Files:**
- Modify: `src/pages/favorites-page.js`

- [ ] **Step 1: Adicionar constantes de filtro de objetivo no topo do arquivo**

Logo após os imports existentes, adicionar:
```js
const GOAL_FILTERS = [
  { key: 'all',          label: 'Todos' },
  { key: 'bulk',         label: 'Hipertrofia' },
  { key: 'endurance',    label: 'Performance' },
  { key: 'general',      label: 'Saúde Geral' },
  { key: 'cut',          label: 'Emagrecimento' },
];

const EVIDENCE_COLORS = {
  A: { bg: 'rgba(34,197,94,0.15)', color: '#22C55E' },
  B: { bg: 'rgba(234,179,8,0.15)', color: '#EAB308' },
  C: { bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
};

function matchesGoal(s, goalKey) {
  if (goalKey === 'all') return true;
  return s.targets && (s.targets[goalKey] ?? 0) > 0;
}

function sortSupplements(arr, sortKey) {
  const copy = [...arr];
  if (sortKey === 'evidence') {
    const order = { A: 0, B: 1, C: 2 };
    return copy.sort((a, b) => (order[a.evidenceLevel] ?? 3) - (order[b.evidenceLevel] ?? 3));
  }
  if (sortKey === 'az') {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  return copy; // default
}
```

- [ ] **Step 2: Adicionar `_activeGoal` e `_sortKey` ao constructor**

Localizar:
```js
  constructor(container) {
    this.container = container;
    this._activeFilter = 'all';
    this._handleStorageChange = this._onStorageChange.bind(this);
  }
```

Substituir por:
```js
  constructor(container) {
    this.container = container;
    this._activeFilter = 'all';  // kept for backward compat
    this._activeGoal = 'all';
    this._sortKey = 'evidence';
    this._handleStorageChange = this._onStorageChange.bind(this);
  }
```

- [ ] **Step 3: Substituir `_render()` por versão completa**

Substituir o método `_render()` completo por:

```js
  _render() {
    const allFavs = this._getFavoriteSupplements();
    const goalFiltered = allFavs.filter(s => matchesGoal(s, this._activeGoal));
    const sorted = sortSupplements(goalFiltered, this._sortKey);

    this.container.innerHTML = `
      <div class="fv-root">
        <div class="fv-header">
          <nav class="fv-breadcrumb" aria-label="Breadcrumb">
            <span>Home</span>
            <span class="fv-breadcrumb-sep">/</span>
            <span>Favoritos</span>
          </nav>
          <div class="fv-title-row">
            <h1 class="fv-title">Meus Favoritos</h1>
            <button class="fv-btn-optimize" id="fv-btn-optimize" aria-label="Otimizar todos">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Otimizar Todos
            </button>
          </div>
        </div>

        ${allFavs.length === 0 ? `
          <div class="fv-grid">
            <div class="fv-empty">
              <div class="fv-empty-icon">🤍</div>
              <h2 class="fv-empty-title">Nenhum favorito ainda</h2>
              <p class="fv-empty-sub">Explore o catálogo e toque ♥ para salvar seus suplementos favoritos aqui.</p>
              <button class="fv-empty-btn" id="fv-go-catalog">Ver Catálogo →</button>
            </div>
          </div>
        ` : `
          <div class="fv-controls">
            <div class="fv-chips" role="group" aria-label="Filtrar por objetivo">
              ${GOAL_FILTERS.map(f => `
                <button class="fv-chip${this._activeGoal === f.key ? ' active' : ''}"
                  data-goal="${f.key}" type="button">
                  ${f.label}
                </button>`).join('')}
            </div>
            <div class="fv-sort-wrap">
              <span class="fv-sort-label">Ordenar por</span>
              <select class="fv-sort-select" id="fv-sort">
                <option value="evidence" ${this._sortKey === 'evidence' ? 'selected' : ''}>Maior Evidência</option>
                <option value="az" ${this._sortKey === 'az' ? 'selected' : ''}>A–Z</option>
                <option value="default" ${this._sortKey === 'default' ? 'selected' : ''}>Padrão</option>
              </select>
            </div>
          </div>

          <div class="fv-grid" id="fv-grid">
            ${sorted.length === 0
              ? `<div class="fv-empty">
                   <div class="fv-empty-icon">🔍</div>
                   <h2 class="fv-empty-title">Nenhum resultado</h2>
                   <p class="fv-empty-sub">Nenhum favorito neste objetivo.</p>
                 </div>`
              : sorted.map(s => this._renderCard(s)).join('')
            }
          </div>
        `}
      </div>
    `;

    this._bindEvents();
  }
```

- [ ] **Step 4: Substituir `_renderCard()` por versão visual**

Substituir o método `_renderCard(s, stack)` por:

```js
  _renderCard(s) {
    const imgSrc = s.image || `/assets/${s.id.replace(/-/g, '_')}.png`;
    const evColors = EVIDENCE_COLORS[s.evidenceLevel] ?? EVIDENCE_COLORS['C'];
    const desc = s.benefits?.[0] ?? '';
    const pricePerMonth = s.pricePerGram
      ? `R$ ${((s.dosage?.maintenance ?? 5) * s.pricePerGram * 30).toFixed(0).replace('.', ',')}`
      : null;

    return `
      <article class="fv-card" data-id="${s.id}">
        <div class="fv-card-img-wrap">
          <img class="fv-card-img"
            src="${imgSrc}" alt="${s.name}"
            loading="lazy"
            onerror="this.style.opacity='0'"
          />
          <button class="fv-card-fav-btn" data-action="remove-fav" data-id="${s.id}"
            aria-label="Remover dos favoritos" type="button">♥</button>
        </div>
        <div class="fv-card-body">
          <div class="fv-card-badges">
            <span class="fv-badge-ev" style="background:${evColors.bg};color:${evColors.color};">
              NÍVEL ${s.evidenceLevel ?? 'C'}
            </span>
            <span class="fv-badge-cat">${s.category ?? ''}</span>
          </div>
          <h3 class="fv-card-name">${s.name}</h3>
          ${desc ? `<p class="fv-card-desc">${desc}</p>` : ''}
          ${pricePerMonth ? `
            <div class="fv-card-price-row">
              <span class="fv-card-price-label">Melhor Preço</span>
              <span class="fv-card-price-val">${pricePerMonth}<small style="font-size:11px;font-weight:500;color:var(--color-text-muted)">/mês</small></span>
            </div>
          ` : ''}
          <div class="fv-card-actions">
            <button class="fv-btn-detail" data-action="open-list" data-id="${s.id}" type="button">
              Detalhes
            </button>
            <button class="fv-btn-buy" data-action="open-list" data-id="${s.id}" type="button">
              Ver Preços
            </button>
          </div>
        </div>
      </article>
    `;
  }
```

- [ ] **Step 5: Atualizar `_bindEvents()` para os novos event listeners**

Localizar o método `_bindEvents()` e substituir completamente por:

```js
  _bindEvents() {
    const root = this.container.querySelector('.fv-root');
    if (!root) return;

    root.addEventListener('click', (e) => {
      // Goal filter chips
      const chip = e.target.closest('[data-goal]');
      if (chip) {
        this._activeGoal = chip.dataset.goal;
        this._render();
        return;
      }

      // Remove from favorites
      const removeBtn = e.target.closest('[data-action="remove-fav"]');
      if (removeBtn) {
        const id = removeBtn.dataset.id;
        toggleFavorite(id);
        localStorage.setItem('suplilist:favorites', JSON.stringify(
          getFavorites().filter(f => f !== id)
        ));
        this._render();
        return;
      }

      // Open in list (Detalhes / Ver Preços → navigate to /list)
      const openList = e.target.closest('[data-action="open-list"]');
      if (openList) {
        window.history.pushState(null, null, '/list');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      // Otimizar Todos → navigate to /my-stack
      const optimize = e.target.closest('#fv-btn-optimize');
      if (optimize) {
        window.history.pushState(null, null, '/my-stack');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      // Go to catalog (empty state)
      const goCatalog = e.target.closest('#fv-go-catalog');
      if (goCatalog) {
        window.history.pushState(null, null, '/list');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
    });

    // Sort select
    const sortEl = root.querySelector('#fv-sort');
    if (sortEl) {
      sortEl.addEventListener('change', (e) => {
        this._sortKey = e.target.value;
        this._render();
      });
    }
  }
```

- [ ] **Step 6: Remover métodos obsoletos**

Remover os métodos `_renderFilters(categories)` e `_getCategories(supplements)` — não são mais usados.

- [ ] **Step 7: Commit**

```bash
git add src/pages/favorites-page.js
git commit -m "feat(favorites): redesign with goal filters, sort, photo cards, Ver Preços button"
```

---

## Task 3: Verificação

- [ ] **Step 1: `npm run dev` → abrir `/favorites`**

- [ ] Header "Meus Favoritos" com breadcrumb "Home / Favoritos"
- [ ] Botão "Otimizar Todos" no header
- [ ] Chips: Todos, Hipertrofia, Performance, Saúde Geral, Emagrecimento
- [ ] Sort dropdown "Ordenar por: Maior Evidência"
- [ ] Cards em 2 colunas (ou 1 em mobile, 3 em desktop)
- [ ] Cada card: foto do suplemento, badge NÍVEL A/B/C, category, nome, benefício, preço estimado, botões "Detalhes"/"Ver Preços"
- [ ] Click em chip filtra os cards
- [ ] Click em "Detalhes" / "Ver Preços" navega para /list

- [ ] **Step 2: Testar empty state**

Remover todos os favoritos e verificar empty state com botão "Ver Catálogo →".

- [ ] **Step 3: `npm test -- --run`**

Esperado: 75 testes passando.

- [ ] **Step 4: Commit se necessário**

```bash
git add src/pages/favorites-page.js
git commit -m "fix(favorites): visual adjustments after verification"
```
