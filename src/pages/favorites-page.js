// ============================================================
// FavoritesPage — SupliList
// Suplementos marcados com ♥ pelo usuário
// ============================================================

import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import { stateManager, ACTIONS } from '../state/state-manager.js';
import { eventBus } from '../core/event-bus.js';

// ─── localStorage helpers ────────────────────────────────────
const getFavorites = () => JSON.parse(localStorage.getItem('suplilist:favorites') || '[]');
const toggleFavorite = (id) => {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id);
  else favs.splice(idx, 1);
  localStorage.setItem('suplilist:favorites', JSON.stringify(favs));
};

const getStack = () => {
  try {
    const state = stateManager.getState();
    return (state && state.stack) ? state.stack : [];
  } catch {
    return JSON.parse(localStorage.getItem('suplilist:stack') || '[]');
  }
};

// ─── Badge helper ────────────────────────────────────────────
const evidenceBadge = (level) => {
  const map = {
    A: { bg: 'rgba(34,197,94,0.12)', color: '#22C55E' },
    B: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
    C: { bg: 'rgba(163,163,163,0.12)', color: '#9A9A9A' },
  };
  const style = map[level] || map['C'];
  return `<span style="background:${style.bg};color:${style.color};font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:0.04em;">Evidência ${level}</span>`;
};

export default class FavoritesPage {
  constructor(container) {
    this.container = container;
    this._activeFilter = 'all';
    this._handleStorageChange = this._onStorageChange.bind(this);
  }

  mount() {
    window.addEventListener('storage', this._handleStorageChange);
    this._render();
  }

  unmount() {
    window.removeEventListener('storage', this._handleStorageChange);
    this.container.innerHTML = '';
  }

  _onStorageChange(e) {
    if (e.key === 'suplilist:favorites' || e.key === 'suplilist:stack') {
      this._render();
    }
  }

  _getFavoriteSupplements() {
    const ids = getFavorites();
    return ids.map(id => SUPPLEMENTS_DB.find(s => s.id === id)).filter(Boolean);
  }

  _getCategories(supplements) {
    const cats = ['all', ...new Set(supplements.map(s => s.category))];
    return cats;
  }

  _render() {
    const allFavs = this._getFavoriteSupplements();
    const filtered = this._activeFilter === 'all'
      ? allFavs
      : allFavs.filter(s => s.category === this._activeFilter);
    const categories = this._getCategories(allFavs);
    const stack = getStack();

    this.container.innerHTML = `
      <div style="min-height:100vh;background:var(--color-bg-primary,#080808);color:var(--color-text-primary,#F2F2F2);font-family:'Inter',sans-serif;">

        <!-- Header -->
        <div style="padding:32px 24px 0;">
          <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(24px,5vw,36px);margin:0 0 6px;line-height:1.15;">
            ❤️ Favoritos
          </h1>
          <p style="margin:0;color:var(--color-text-secondary,#9A9A9A);font-size:14px;">
            ${allFavs.length} suplemento${allFavs.length !== 1 ? 's' : ''} salvo${allFavs.length !== 1 ? 's' : ''}
          </p>
        </div>

        ${allFavs.length === 0 ? this._renderEmpty() : `
          <!-- Filtros de categoria -->
          ${allFavs.length > 0 ? this._renderFilters(categories) : ''}

          <!-- Grid de cards -->
          <div id="fav-grid" style="
            display:grid;
            grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
            gap:16px;
            padding:24px;
          ">
            ${filtered.length === 0
              ? `<div style="grid-column:1/-1;text-align:center;padding:48px 0;color:var(--color-text-muted,#555);">
                   Nenhum favorito nesta categoria.
                 </div>`
              : filtered.map(s => this._renderCard(s, stack)).join('')
            }
          </div>
        `}

      </div>
    `;

    this._bindEvents();
  }

  _renderFilters(categories) {
    return `
      <div style="padding:20px 24px 0;display:flex;gap:8px;flex-wrap:wrap;">
        ${categories.map(cat => {
          const active = this._activeFilter === cat;
          return `<button
            data-filter="${cat}"
            style="
              padding:6px 14px;
              border-radius:20px;
              border:1px solid ${active ? 'var(--color-brand,#7C3AED)' : 'var(--color-border-strong,rgba(255,255,255,0.14))'};
              background:${active ? 'var(--color-brand-muted,rgba(124,58,237,0.12))' : 'transparent'};
              color:${active ? 'var(--color-brand,#7C3AED)' : 'var(--color-text-secondary,#9A9A9A)'};
              font-size:13px;
              font-weight:${active ? '600' : '400'};
              cursor:pointer;
              transition:all 0.15s;
              font-family:'Inter',sans-serif;
            "
          >${cat === 'all' ? 'Todos' : cat}</button>`;
        }).join('')}
      </div>
    `;
  }

  _renderCard(s, stack) {
    const inStack = Array.isArray(stack) && stack.some(item => (typeof item === 'string' ? item : item.id) === s.id);
    const imgSlug = s.image || `/assets/${s.id.replace(/-/g, '_')}.png`;

    return `
      <div class="fav-card" data-id="${s.id}" style="
        background:var(--color-surface-primary,#111111);
        border:1px solid var(--color-border,rgba(255,255,255,0.07));
        border-radius:16px;
        overflow:hidden;
        display:flex;
        flex-direction:column;
        transition:border-color 0.2s;
      ">
        <!-- Imagem -->
        <div style="height:160px;overflow:hidden;background:var(--color-surface-secondary,#161616);display:flex;align-items:center;justify-content:center;">
          <img
            src="${imgSlug}"
            alt="${s.name}"
            style="width:100%;height:100%;object-fit:cover;"
            onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\\'font-size:48px;\\'>💊</span>'"
          />
        </div>

        <!-- Body -->
        <div style="padding:16px;flex:1;display:flex;flex-direction:column;gap:10px;">
          <!-- Categoria + Badge -->
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:11px;color:var(--color-text-muted,#555);text-transform:uppercase;letter-spacing:0.05em;">${s.category}</span>
            ${evidenceBadge(s.evidenceLevel)}
          </div>

          <!-- Nome -->
          <h3 style="margin:0;font-size:16px;font-weight:700;line-height:1.3;color:var(--color-text-primary,#F2F2F2);">${s.name}</h3>

          <!-- Benefício principal -->
          ${s.benefits && s.benefits[0] ? `
            <p style="margin:0;font-size:13px;color:var(--color-text-secondary,#9A9A9A);line-height:1.5;">
              ${s.benefits[0]}
            </p>
          ` : ''}

          <!-- Ações -->
          <div style="display:flex;gap:8px;margin-top:auto;padding-top:4px;">
            <!-- Remover dos favoritos -->
            <button
              class="btn-remove-fav"
              data-id="${s.id}"
              title="Remover dos favoritos"
              style="
                flex:1;
                display:flex;align-items:center;justify-content:center;gap:6px;
                padding:9px 12px;
                border-radius:10px;
                border:1px solid var(--color-border-strong,rgba(255,255,255,0.14));
                background:transparent;
                color:var(--color-error,#EF4444);
                font-size:13px;
                font-weight:600;
                cursor:pointer;
                transition:background 0.15s;
                font-family:'Inter',sans-serif;
              "
            >
              💔 Remover
            </button>

            <!-- Adicionar ao stack -->
            ${!inStack ? `
              <button
                class="btn-add-stack"
                data-id="${s.id}"
                title="Adicionar ao stack"
                style="
                  flex:1;
                  display:flex;align-items:center;justify-content:center;gap:6px;
                  padding:9px 12px;
                  border-radius:10px;
                  border:none;
                  background:var(--color-brand,#7C3AED);
                  color:#fff;
                  font-size:13px;
                  font-weight:600;
                  cursor:pointer;
                  transition:background 0.15s;
                  font-family:'Inter',sans-serif;
                "
              >
                + Stack
              </button>
            ` : `
              <span style="
                flex:1;
                display:flex;align-items:center;justify-content:center;
                padding:9px 12px;
                border-radius:10px;
                background:var(--color-success-bg,rgba(34,197,94,0.10));
                color:var(--color-success,#22C55E);
                font-size:12px;
                font-weight:600;
              ">✓ No stack</span>
            `}
          </div>
        </div>
      </div>
    `;
  }

  _renderEmpty() {
    return `
      <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;padding:24px;">
        <div style="
          background:var(--color-surface-primary,#111111);
          border:1px solid var(--color-border,rgba(255,255,255,0.07));
          border-radius:16px;
          padding:48px 40px;
          text-align:center;
          max-width:380px;
          width:100%;
        ">
          <div style="font-size:56px;margin-bottom:20px;opacity:0.6;">🤍</div>
          <h2 style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;margin:0 0 10px;">
            Nenhum suplemento favorito ainda
          </h2>
          <p style="color:var(--color-text-secondary,#9A9A9A);font-size:14px;margin:0 0 28px;line-height:1.6;">
            Explore o catálogo e toque ♥ para salvar seus suplementos favoritos aqui.
          </p>
          <button id="btn-go-catalog" style="
            background:var(--color-brand,#7C3AED);
            color:#fff;
            border:none;
            border-radius:10px;
            padding:12px 28px;
            font-size:15px;
            font-weight:600;
            cursor:pointer;
            font-family:'Inter',sans-serif;
            transition:background 0.15s;
          ">Ver Catálogo →</button>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    // Ir para catálogo (empty state)
    const btnCatalog = this.container.querySelector('#btn-go-catalog');
    if (btnCatalog) {
      btnCatalog.addEventListener('click', () => {
        window.location.hash = '#/list';
      });
    }

    // Filtros de categoria
    this.container.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this._activeFilter = e.currentTarget.dataset.filter;
        this._render();
      });
    });

    // Remover favorito
    this.container.querySelectorAll('.btn-remove-fav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        toggleFavorite(id);
        eventBus.emit('favorites:changed', { id, action: 'removed' });
        this._render();
      });
    });

    // Adicionar ao stack
    this.container.querySelectorAll('.btn-add-stack').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rawId = e.currentTarget.dataset.id;
        const numId = Number(rawId);
        const s = SUPPLEMENTS_DB.find(sup => sup.id === numId);
        if (!s) return;
        stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
          supplementId: s.id,
          name: s.name,
          dosage: s.dosage?.maintenance ?? 5,
          unit: s.dosage?.unit ?? 'g',
          quantity: 0,
        });
        eventBus.emit('stack:changed', { id: numId, action: 'added' });
        this._render();
      });
    });

    // Hover nos cards
    this.container.querySelectorAll('.fav-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--color-border-strong,rgba(255,255,255,0.14))';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--color-border,rgba(255,255,255,0.07))';
      });
    });

    // Hover botão remover
    this.container.querySelectorAll('.btn-remove-fav').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--color-error-bg,rgba(239,68,68,0.10))';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
      });
    });

    // Hover botão + Stack
    this.container.querySelectorAll('.btn-add-stack').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--color-brand-hover,#6D28D9)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'var(--color-brand,#7C3AED)';
      });
    });
  }
}
