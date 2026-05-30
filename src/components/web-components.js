/**
 * SupliList Web Components Library v4.0
 * 10 Custom Elements — Zero frameworks, Shadow DOM, ARIA-ready
 *
 * Import order: after event-bus.js and state-manager.js
 * Usage: import './web-components.js'
 */

// ─── Base Component ────────────────────────────────────────────────────────────

class SupliBase extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  get _baseStyles() {
    return `
      <style>
        :host { display: block; box-sizing: border-box; }
        *, *::before, *::after { box-sizing: inherit; }
        :host {
          --color-bg:        #0A0A0A;
          --color-surface:   #141414;
          --color-surface2:  #1E1E1E;
          --color-border:    rgba(255,255,255,0.08);
          --color-primary:   #7C3AED;
          --color-primary-h: #9461F7;
          --color-success:   #22C55E;
          --color-warning:   #F59E0B;
          --color-danger:    #EF4444;
          --color-text:      #F5F5F5;
          --color-muted:     #A3A3A3;
          --font-sans:       'Inter', system-ui, sans-serif;
          --font-mono:       'JetBrains Mono', monospace;
          --radius-sm:       6px;
          --radius-md:       12px;
          --radius-lg:       20px;
          --radius-full:     9999px;
          --shadow-md:       0 4px 24px rgba(0,0,0,0.4);
          --shadow-glow:     0 0 20px rgba(124,58,237,0.3);
          --transition:      150ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border: none; border-radius: var(--radius-full);
          font-family: var(--font-sans); font-size: 14px; font-weight: 600;
          cursor: pointer; transition: transform var(--transition), opacity var(--transition);
          user-select: none; -webkit-tap-highlight-color: transparent;
        }
        .btn:active { transform: scale(0.96); }
        .btn-primary { background: var(--color-primary); color: #fff; }
        .btn-primary:hover { background: var(--color-primary-h); }
        .btn-ghost { background: transparent; color: var(--color-primary); border: 1px solid var(--color-primary); }
        .btn-danger { background: var(--color-danger); color: #fff; }
      </style>
    `;
  }

  attr(name, fallback = '') { return this.getAttribute(name) ?? fallback; }
  boolAttr(name) { return this.hasAttribute(name); }
  emit(eventName, detail = {}) {
    this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, composed: true }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. <supplement-card>
//    Attrs: id, name, category, evidence, price, cost-per-dose, favorited, in-stack
//    Events: sl-favorite, sl-add-stack, sl-view-detail
// ═══════════════════════════════════════════════════════════════════════════════

class SupplementCard extends SupliBase {
  static get observedAttributes() {
    return ['name', 'category', 'evidence', 'price', 'cost-per-dose', 'favorited', 'in-stack'];
  }
  attributeChangedCallback() { this._render(); }
  connectedCallback() { this._render(); this._attachListeners(); }

  _evidenceColor(level) {
    return { A: '#22C55E', B: '#F59E0B', C: '#3B82F6', D: '#6B7280' }[level] ?? '#6B7280';
  }

  _render() {
    const name      = this.attr('name', 'Suplemento');
    const category  = this.attr('category', '');
    const evidence  = this.attr('evidence', '—');
    const price     = this.attr('price', '');
    const cpd       = this.attr('cost-per-dose', '');
    const favorited = this.boolAttr('favorited');
    const inStack   = this.boolAttr('in-stack');
    const evColor   = this._evidenceColor(evidence);

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        :host { border-radius: var(--radius-lg); overflow: hidden; }
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex; flex-direction: column; gap: 10px;
          transition: border-color var(--transition), box-shadow var(--transition);
        }
        .card:hover { border-color: var(--color-primary); box-shadow: var(--shadow-glow); }
        .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .badges { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .badge {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          padding: 2px 8px; border-radius: var(--radius-full); letter-spacing: 0.04em;
        }
        .badge-ev  { background: ${evColor}22; color: ${evColor}; border: 1px solid ${evColor}44; }
        .badge-stack { background: rgba(124,58,237,0.15); color: var(--color-primary); }
        .name { font-size: 16px; font-weight: 700; color: var(--color-text); margin: 0; }
        .category { font-size: 12px; color: var(--color-muted); margin-top: 2px; }
        .bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .price-block { display: flex; flex-direction: column; }
        .price { font-size: 17px; font-weight: 800; color: var(--color-text); }
        .cpd   { font-size: 11px; color: var(--color-muted); }
        .actions { display: flex; gap: 6px; align-items: center; }
        button { all: unset; cursor: pointer; }
        .btn-fav {
          width: 34px; height: 34px; border-radius: var(--radius-full);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; background: var(--color-surface2);
          transition: transform var(--transition);
        }
        .btn-fav:hover { transform: scale(1.15); }
        .btn-add {
          padding: 7px 14px; border-radius: var(--radius-full);
          font-size: 12px; font-weight: 700; font-family: var(--font-sans);
          background: ${inStack ? 'var(--color-surface2)' : 'var(--color-primary)'};
          color: ${inStack ? 'var(--color-muted)' : '#fff'};
          transition: opacity var(--transition);
        }
        .btn-add:hover { opacity: 0.85; }
      </style>
      <article class="card" role="article" aria-label="${name}">
        <div class="top">
          <div>
            <div class="badges">
              <span class="badge badge-ev" aria-label="Evidência nível ${evidence}">Evidência ${evidence}</span>
              ${inStack ? '<span class="badge badge-stack">No Stack</span>' : ''}
            </div>
            <p class="name">${name}</p>
            ${category ? `<p class="category">${category}</p>` : ''}
          </div>
        </div>
        <div class="bottom">
          <div class="price-block">
            ${price ? `<span class="price">R$&nbsp;${price}</span>` : ''}
            ${cpd   ? `<span class="cpd">${cpd}/dose</span>` : ''}
          </div>
          <div class="actions">
            <button class="btn-fav" data-action="favorite" aria-label="${favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" aria-pressed="${favorited}">
              ${favorited ? '❤️' : '🤍'}
            </button>
            <button class="btn-add" data-action="add-stack" aria-label="${inStack ? 'Já no stack' : 'Adicionar ao stack'}">
              ${inStack ? '✓ Stack' : '+ Adicionar'}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  _attachListeners() {
    this._root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id   = this.attr('id');
      const name = this.attr('name');
      if (btn.dataset.action === 'favorite') {
        const now = !this.boolAttr('favorited');
        now ? this.setAttribute('favorited', '') : this.removeAttribute('favorited');
        this.emit('sl-favorite', { id, favorited: now });
      }
      if (btn.dataset.action === 'add-stack' && !this.boolAttr('in-stack')) {
        this.emit('sl-add-stack', { id, name });
      }
      if (btn.dataset.action === 'view-detail') {
        this.emit('sl-view-detail', { id, name });
      }
    });
  }
}
customElements.define('supplement-card', SupplementCard);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. <checkin-button>
//    Attrs: supplement-id, supplement-name, checked, timestamp
//    Events: sl-checkin
// ═══════════════════════════════════════════════════════════════════════════════

class CheckinButton extends SupliBase {
  static get observedAttributes() { return ['checked', 'supplement-name']; }
  attributeChangedCallback() { this._render(); }
  connectedCallback() { this._render(); }

  _render() {
    const checked = this.boolAttr('checked');
    const name    = this.attr('supplement-name', 'Suplemento');

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        :host { display: inline-block; }
        button {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 20px; border: none; border-radius: var(--radius-full);
          font-family: var(--font-sans); font-size: 15px; font-weight: 700;
          cursor: ${checked ? 'default' : 'pointer'};
          background: ${checked ? 'rgba(34,197,94,0.15)' : 'var(--color-primary)'};
          color: ${checked ? '#22C55E' : '#fff'};
          transition: transform var(--transition), background var(--transition);
          width: 100%; justify-content: center;
        }
        button:not([disabled]):hover { transform: scale(1.02); }
        .icon { font-size: 18px; transition: transform var(--transition); }
        ${checked ? '.icon { animation: pop 0.3s ease; }' : ''}
        @keyframes pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
      </style>
      <button
        aria-label="${checked ? `${name} - check-in feito` : `Marcar check-in de ${name}`}"
        aria-pressed="${checked}"
        ${checked ? 'disabled' : ''}
      >
        <span class="icon">${checked ? '✅' : '⬜'}</span>
        <span>${checked ? 'Check-in feito!' : `Check-in — ${name}`}</span>
      </button>
    `;

    if (!checked) {
      this._root.querySelector('button').addEventListener('click', () => {
        this.setAttribute('checked', '');
        this.emit('sl-checkin', {
          supplementId:   this.attr('supplement-id'),
          supplementName: this.attr('supplement-name'),
          checked: true,
          timestamp: Date.now()
        });
      }, { once: true });
    }
  }
}
customElements.define('checkin-button', CheckinButton);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. <streak-counter>
//    Attrs: count, record
// ═══════════════════════════════════════════════════════════════════════════════

class StreakCounter extends SupliBase {
  static get observedAttributes() { return ['count', 'record']; }
  attributeChangedCallback() { this._render(); }
  connectedCallback() { this._render(); }

  _render() {
    const count  = parseInt(this.attr('count', '0'), 10);
    const record = parseInt(this.attr('record', '0'), 10);
    const hot    = count >= 7;

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .wrap {
          display: flex; align-items: center; gap: 12px;
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius-lg); padding: 16px 20px;
        }
        .flame {
          font-size: 36px; line-height: 1;
          ${hot ? 'animation: flame 1.2s ease-in-out infinite alternate;' : ''}
        }
        @keyframes flame {
          from { transform: scale(1) rotate(-3deg); }
          to   { transform: scale(1.1) rotate(3deg); }
        }
        .info { display: flex; flex-direction: column; }
        .days { font-size: 28px; font-weight: 800; color: var(--color-text); line-height: 1; }
        .label { font-size: 11px; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
        .record { font-size: 11px; color: var(--color-primary); margin-top: 4px; }
      </style>
      <div class="wrap" role="status" aria-label="Streak atual: ${count} dias">
        <span class="flame" aria-hidden="true">${count === 0 ? '⏳' : '🔥'}</span>
        <div class="info">
          <span class="days">${count} ${count === 1 ? 'dia' : 'dias'}</span>
          <span class="label">Streak atual</span>
          ${record > 0 ? `<span class="record">Recorde: ${record} dias</span>` : ''}
        </div>
      </div>
    `;
  }
}
customElements.define('streak-counter', StreakCounter);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. <price-badge>
//    Attrs: price, original-price, cost-per-dose, currency
// ═══════════════════════════════════════════════════════════════════════════════

class PriceBadge extends SupliBase {
  static get observedAttributes() { return ['price', 'original-price', 'cost-per-dose', 'currency']; }
  attributeChangedCallback() { this._render(); }
  connectedCallback() { this._render(); }

  _render() {
    const price    = this.attr('price', '');
    const original = this.attr('original-price', '');
    const cpd      = this.attr('cost-per-dose', '');
    const currency = this.attr('currency', 'R$');
    const hasDiscount = original && parseFloat(original) > parseFloat(price);
    const pct = hasDiscount
      ? Math.round((1 - parseFloat(price) / parseFloat(original)) * 100)
      : 0;

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        :host { display: inline-flex; }
        .wrap { display: flex; flex-direction: column; gap: 2px; }
        .row  { display: flex; align-items: baseline; gap: 6px; }
        .price { font-size: 20px; font-weight: 800; color: var(--color-text); }
        .original { font-size: 13px; color: var(--color-muted); text-decoration: line-through; }
        .discount {
          font-size: 11px; font-weight: 700; padding: 2px 6px;
          background: rgba(34,197,94,0.15); color: #22C55E;
          border-radius: var(--radius-full);
        }
        .cpd { font-size: 11px; color: var(--color-muted); }
      </style>
      <div class="wrap" aria-label="Preço: ${currency} ${price}">
        <div class="row">
          <span class="price">${currency}&nbsp;${price}</span>
          ${hasDiscount ? `<span class="original">${currency}&nbsp;${original}</span>` : ''}
          ${hasDiscount ? `<span class="discount">-${pct}%</span>` : ''}
        </div>
        ${cpd ? `<span class="cpd">${currency}&nbsp;${cpd}/dose</span>` : ''}
      </div>
    `;
  }
}
customElements.define('price-badge', PriceBadge);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. <toast-notification>
//    Methods: show(message, type, duration), hide()
//    Events: sl-toast-closed
// ═══════════════════════════════════════════════════════════════════════════════

class ToastNotification extends SupliBase {
  constructor() {
    super();
    this._timer = null;
  }

  connectedCallback() { this._render(); }

  disconnectedCallback() {
    if (this._timer) clearTimeout(this._timer);
  }

  show(message, type = 'info', duration = 4000) {
    this._render(message, type);
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this.hide(), duration);
  }

  hide() {
    const wrap = this._root.querySelector('.toast');
    if (wrap) {
      wrap.style.opacity = '0';
      wrap.style.transform = 'translateY(12px)';
      setTimeout(() => {
        this._render();
        this.emit('sl-toast-closed');
      }, 250);
    }
  }

  _render(message = '', type = 'info') {
    const colors = {
      success: { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.4)',  text: '#22C55E', icon: '✅' },
      error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)',  text: '#EF4444', icon: '❌' },
      warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', text: '#F59E0B', icon: '⚠️' },
      info:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)', text: '#3B82F6', icon: 'ℹ️' },
    };
    const c = colors[type] ?? colors.info;

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        :host {
          position: fixed; bottom: calc(72px + env(safe-area-inset-bottom));
          left: 50%; transform: translateX(-50%);
          z-index: var(--z-toast, 9999); pointer-events: none;
          width: min(360px, 90vw);
        }
        .toast {
          display: ${message ? 'flex' : 'none'};
          align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: var(--radius-md);
          background: ${c.bg}; border: 1px solid ${c.border};
          color: ${c.text}; font-family: var(--font-sans);
          font-size: 14px; font-weight: 600;
          animation: toastIn 0.25s ease;
          pointer-events: all; transition: opacity 0.25s, transform 0.25s;
        }
        @keyframes toastIn {
          from { opacity:0; transform: translateY(12px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .icon { font-size: 16px; flex-shrink: 0; }
      </style>
      <div class="toast" role="status" aria-live="polite">
        ${message ? `<span class="icon" aria-hidden="true">${c.icon}</span><span>${message}</span>` : ''}
      </div>
    `;
  }
}
customElements.define('toast-notification', ToastNotification);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. <search-bar>
//    Attrs: placeholder, value
//    Events: sl-search (debounced 300ms), sl-clear
// ═══════════════════════════════════════════════════════════════════════════════

class SearchBar extends SupliBase {
  constructor() { super(); this._debounce = null; }
  static get observedAttributes() { return ['placeholder', 'value']; }
  attributeChangedCallback() { this._render(); }
  connectedCallback() { this._render(); }

  _render() {
    const ph  = this.attr('placeholder', 'Buscar...');
    const val = this.attr('value', '');

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        :host { display: block; }
        .wrap {
          position: relative; display: flex; align-items: center;
        }
        .icon {
          position: absolute; left: 12px; color: var(--color-muted);
          font-size: 15px; pointer-events: none;
        }
        input {
          width: 100%; padding: 11px 36px 11px 36px;
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius-full); color: var(--color-text);
          font-family: var(--font-sans); font-size: 14px;
          transition: border-color var(--transition);
          outline: none;
        }
        input::placeholder { color: var(--color-muted); }
        input:focus { border-color: var(--color-primary); }
        .btn-clear {
          position: absolute; right: 10px;
          background: none; border: none; cursor: pointer;
          color: var(--color-muted); font-size: 14px; padding: 4px;
          display: ${val ? 'flex' : 'none'};
          align-items: center; justify-content: center;
          transition: color var(--transition);
        }
        .btn-clear:hover { color: var(--color-text); }
      </style>
      <div class="wrap" role="search">
        <span class="icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          placeholder="${ph}"
          value="${val}"
          aria-label="${ph}"
          autocomplete="off"
        />
        <button class="btn-clear" aria-label="Limpar busca" type="button">✕</button>
      </div>
    `;

    const input = this._root.querySelector('input');
    const clearBtn = this._root.querySelector('.btn-clear');

    input.addEventListener('input', () => {
      const q = input.value;
      clearBtn.style.display = q ? 'flex' : 'none';
      clearTimeout(this._debounce);
      this._debounce = setTimeout(() => {
        this.emit('sl-search', { query: q });
      }, 300);
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      clearTimeout(this._debounce);
      this.emit('sl-clear', {});
      this.emit('sl-search', { query: '' });
      input.focus();
    });
  }
}
customElements.define('search-bar', SearchBar);

// ═══════════════════════════════════════════════════════════════════════════════
// 7. <modal-dialog>
//    Attrs: open, title, size (sm | md | lg)
//    Methods: show(), hide()
//    Events: sl-modal-close
//    Slot: default (body content), slot="footer"
// ═══════════════════════════════════════════════════════════════════════════════

class ModalDialog extends SupliBase {
  static get observedAttributes() { return ['open', 'title', 'size']; }
  attributeChangedCallback() { this._render(); }
  connectedCallback() { this._render(); }

  show()  { this.setAttribute('open', ''); }
  hide()  { this.removeAttribute('open'); this.emit('sl-modal-close'); }

  _render() {
    const isOpen = this.boolAttr('open');
    const title  = this.attr('title', '');
    const size   = this.attr('size', 'md');
    const widths = { sm: '400px', md: '560px', lg: '720px' };
    const width  = widths[size] ?? widths.md;

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        :host { display: contents; }
        .backdrop {
          display: ${isOpen ? 'flex' : 'none'};
          position: fixed; inset: 0; z-index: var(--z-modal, 1000);
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          align-items: center; justify-content: center;
          padding: 16px;
          animation: ${isOpen ? 'fadeIn 0.2s ease' : 'none'};
        }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .dialog {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          width: min(${width}, 100%);
          max-height: 90dvh;
          display: flex; flex-direction: column;
          box-shadow: var(--shadow-md);
          animation: ${isOpen ? 'slideUp 0.25s cubic-bezier(0.4,0,0.2,1)' : 'none'};
        }
        @keyframes slideUp {
          from { opacity:0; transform: translateY(20px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 20px 16px;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .title { font-size: 17px; font-weight: 700; color: var(--color-text); }
        .btn-close {
          all: unset; cursor: pointer; font-size: 20px; color: var(--color-muted);
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          border-radius: var(--radius-full); transition: background var(--transition);
        }
        .btn-close:hover { background: var(--color-surface2); color: var(--color-text); }
        .body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        .footer {
          padding: 14px 20px;
          border-top: 1px solid var(--color-border);
          display: flex; justify-content: flex-end; gap: 8px;
          flex-shrink: 0;
        }
        ::slotted(*) { color: var(--color-text); }
      </style>
      <div
        class="backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="${title}"
        tabindex="-1"
      >
        <div class="dialog">
          <div class="header">
            <span class="title">${title}</span>
            <button class="btn-close" aria-label="Fechar modal" type="button">✕</button>
          </div>
          <div class="body">
            <slot></slot>
          </div>
          <div class="footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `;

    if (!isOpen) return;

    // Close on backdrop click (outside dialog)
    const backdrop = this._root.querySelector('.backdrop');
    const dialog   = this._root.querySelector('.dialog');
    backdrop.addEventListener('click', (e) => {
      if (!dialog.contains(e.target)) this.hide();
    });

    // Close button
    this._root.querySelector('.btn-close').addEventListener('click', () => this.hide());

    // Close on Escape
    this._escHandler = (e) => { if (e.key === 'Escape') this.hide(); };
    document.addEventListener('keydown', this._escHandler, { once: true });

    // Focus trap — focus the dialog itself
    backdrop.focus();
  }

  disconnectedCallback() {
    if (this._escHandler) document.removeEventListener('keydown', this._escHandler);
  }
}
customElements.define('modal-dialog', ModalDialog);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. <bottom-sheet>
//    Attrs: open, title, snap-points (e.g. "40,90" — % of viewport height)
//    Methods: show(), hide()
//    Events: sl-sheet-close
//    Slot: default (body content)
// ═══════════════════════════════════════════════════════════════════════════════

class BottomSheet extends SupliBase {
  constructor() {
    super();
    this._startY     = 0;
    this._currentY   = 0;
    this._dragging   = false;
    this._snapPoints = [40, 90]; // % of vh
  }

  static get observedAttributes() { return ['open', 'title', 'snap-points']; }
  attributeChangedCallback(name) {
    if (name === 'snap-points') {
      this._snapPoints = this.attr('snap-points', '40,90')
        .split(',').map(Number).filter(n => n > 0 && n <= 100);
    }
    this._render();
  }
  connectedCallback() { this._render(); }

  show()  { this.setAttribute('open', ''); }
  hide()  { this.removeAttribute('open'); this.emit('sl-sheet-close'); }

  _render() {
    const isOpen = this.boolAttr('open');
    const title  = this.attr('title', '');
    const snap   = this._snapPoints[0] ?? 40; // initial snap = first point

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        :host { display: contents; }
        .overlay {
          display: ${isOpen ? 'block' : 'none'};
          position: fixed; inset: 0; z-index: var(--z-sheet, 900);
          background: rgba(0,0,0,0.5);
          animation: ${isOpen ? 'fadeIn 0.2s ease' : 'none'};
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .sheet {
          display: ${isOpen ? 'flex' : 'none'};
          flex-direction: column;
          position: fixed; bottom: 0; left: 0; right: 0;
          z-index: calc(var(--z-sheet, 900) + 1);
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          height: ${snap}vh;
          max-height: 92dvh;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
          animation: ${isOpen ? 'sheetUp 0.3s cubic-bezier(0.4,0,0.2,1)' : 'none'};
          will-change: transform;
          touch-action: none;
        }
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .handle-area {
          padding: 10px 0 4px;
          display: flex; justify-content: center;
          cursor: grab; flex-shrink: 0;
        }
        .handle-area:active { cursor: grabbing; }
        .handle {
          width: 36px; height: 4px;
          background: var(--color-border);
          border-radius: var(--radius-full);
        }
        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px 12px; flex-shrink: 0;
        }
        .title { font-size: 16px; font-weight: 700; color: var(--color-text); }
        .btn-close {
          all: unset; cursor: pointer; font-size: 18px; color: var(--color-muted);
          width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
          border-radius: var(--radius-full); transition: background var(--transition);
        }
        .btn-close:hover { background: var(--color-surface2); color: var(--color-text); }
        .body {
          padding: 0 20px calc(20px + env(safe-area-inset-bottom));
          overflow-y: auto; flex: 1;
        }
      </style>
      <div class="overlay" aria-hidden="true"></div>
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="${title}"
      >
        <div class="handle-area" aria-hidden="true">
          <div class="handle"></div>
        </div>
        ${title ? `
        <div class="header">
          <span class="title">${title}</span>
          <button class="btn-close" aria-label="Fechar" type="button">✕</button>
        </div>` : ''}
        <div class="body">
          <slot></slot>
        </div>
      </div>
    `;

    if (!isOpen) return;

    const overlay   = this._root.querySelector('.overlay');
    const sheet     = this._root.querySelector('.sheet');
    const handleArea = this._root.querySelector('.handle-area');
    const closeBtn  = this._root.querySelector('.btn-close');

    // Close on overlay click
    overlay.addEventListener('click', () => this.hide());
    if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

    // Escape key
    this._escHandler = (e) => { if (e.key === 'Escape') this.hide(); };
    document.addEventListener('keydown', this._escHandler, { once: true });

    // Drag-to-dismiss (touch + mouse)
    const onStart = (clientY) => {
      this._startY   = clientY;
      this._dragging = true;
      sheet.style.transition = 'none';
    };
    const onMove = (clientY) => {
      if (!this._dragging) return;
      const delta = clientY - this._startY;
      if (delta > 0) sheet.style.transform = `translateY(${delta}px)`;
    };
    const onEnd = (clientY) => {
      if (!this._dragging) return;
      this._dragging = false;
      const delta = clientY - this._startY;
      sheet.style.transition = '';
      sheet.style.transform  = '';
      if (delta > 80) { this.hide(); return; }
      // Snap to nearest point
      const sheetH  = sheet.getBoundingClientRect().height;
      const vh      = window.innerHeight;
      const pct     = ((vh - (sheet.getBoundingClientRect().top + delta)) / vh) * 100;
      const nearest = this._snapPoints.reduce((a, b) =>
        Math.abs(b - pct) < Math.abs(a - pct) ? b : a
      );
      sheet.style.height = `${nearest}vh`;
    };

    handleArea.addEventListener('mousedown',  (e) => onStart(e.clientY));
    document.addEventListener('mousemove',    (e) => onMove(e.clientY));
    document.addEventListener('mouseup',      (e) => { onEnd(e.clientY); });

    handleArea.addEventListener('touchstart', (e) => onStart(e.touches[0].clientY), { passive: true });
    document.addEventListener('touchmove',    (e) => onMove(e.touches[0].clientY),  { passive: true });
    document.addEventListener('touchend',     (e) => onEnd(e.changedTouches[0].clientY));
  }

  disconnectedCallback() {
    if (this._escHandler) document.removeEventListener('keydown', this._escHandler);
  }
}
customElements.define('bottom-sheet', BottomSheet);

// ═══════════════════════════════════════════════════════════════════════════════
// 9. <stat-card>
//    Attrs: label, value, unit, trend (up | down | neutral), delta, icon
//    Purely presentational — no events
// ═══════════════════════════════════════════════════════════════════════════════

class StatCard extends SupliBase {
  static get observedAttributes() { return ['label', 'value', 'unit', 'trend', 'delta', 'icon']; }
  attributeChangedCallback() { this._render(); }
  connectedCallback() { this._render(); }

  _render() {
    const label  = this.attr('label',  'Métrica');
    const value  = this.attr('value',  '—');
    const unit   = this.attr('unit',   '');
    const trend  = this.attr('trend',  'neutral');
    const delta  = this.attr('delta',  '');
    const icon   = this.attr('icon',   '');

    const trendMap = {
      up:      { color: '#22C55E', arrow: '↑', bg: 'rgba(34,197,94,0.12)'  },
      down:    { color: '#EF4444', arrow: '↓', bg: 'rgba(239,68,68,0.12)'  },
      neutral: { color: '#A3A3A3', arrow: '→', bg: 'rgba(163,163,163,0.1)' },
    };
    const t = trendMap[trend] ?? trendMap.neutral;

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 18px 20px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .top {
          display: flex; align-items: center; justify-content: space-between;
        }
        .label {
          font-size: 12px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--color-muted);
        }
        .icon-wrap {
          font-size: 20px; line-height: 1;
          ${icon ? '' : 'display:none;'}
        }
        .value-row {
          display: flex; align-items: baseline; gap: 4px;
        }
        .value {
          font-size: 32px; font-weight: 800;
          color: var(--color-text); line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .unit {
          font-size: 14px; color: var(--color-muted); font-weight: 500;
          ${unit ? '' : 'display:none;'}
        }
        .delta-badge {
          display: ${delta ? 'inline-flex' : 'none'};
          align-items: center; gap: 3px;
          padding: 3px 8px; border-radius: var(--radius-full);
          font-size: 12px; font-weight: 700;
          background: ${t.bg}; color: ${t.color};
          align-self: flex-start;
        }
      </style>
      <article class="card" aria-label="${label}: ${value}${unit}">
        <div class="top">
          <span class="label">${label}</span>
          <span class="icon-wrap" aria-hidden="true">${icon}</span>
        </div>
        <div class="value-row">
          <span class="value">${value}</span>
          <span class="unit">${unit}</span>
        </div>
        ${delta ? `
        <span class="delta-badge" aria-label="Variação: ${t.arrow} ${delta}">
          ${t.arrow} ${delta}
        </span>` : ''}
      </article>
    `;
  }
}
customElements.define('stat-card', StatCard);

// ═══════════════════════════════════════════════════════════════════════════════
// 10. <evidence-pill>
//     Attrs: level (A | B | C | D), label (optional override)
//     Purely presentational — no events
// ═══════════════════════════════════════════════════════════════════════════════

class EvidencePill extends SupliBase {
  static get observedAttributes() { return ['level', 'label']; }
  attributeChangedCallback() { this._render(); }
  connectedCallback() { this._render(); }

  _render() {
    const level = (this.attr('level', 'D')).toUpperCase();

    const map = {
      A: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   label: 'Evidência A', desc: 'Forte' },
      B: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  label: 'Evidência B', desc: 'Moderada' },
      C: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  label: 'Evidência C', desc: 'Limitada' },
      D: { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', label: 'Evidência D', desc: 'Anedótica' },
    };
    const m     = map[level] ?? map.D;
    const label = this.attr('label', m.label);

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        :host { display: inline-flex; }
        .pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          border: 1px solid ${m.border};
          background: ${m.bg};
          font-size: 11px; font-weight: 700;
          color: ${m.color};
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
          cursor: default;
          user-select: none;
        }
        .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: ${m.color};
          flex-shrink: 0;
        }
      </style>
      <span
        class="pill"
        role="img"
        aria-label="${label} — ${m.desc}"
        title="${m.desc}"
      >
        <span class="dot" aria-hidden="true"></span>
        ${label}
      </span>
    `;
  }
}
customElements.define('evidence-pill', EvidencePill);

// ═══════════════════════════════════════════════════════════════════════════════
// Global Toast Helper
// Usage: window.SupliToast.show('Mensagem', 'success')
// ═══════════════════════════════════════════════════════════════════════════════

(function initToastHelper() {
  let _toast = null;

  function getOrCreate() {
    if (!_toast) {
      _toast = document.createElement('toast-notification');
      document.body.appendChild(_toast);
    }
    return _toast;
  }

  window.SupliToast = {
    show(message, type = 'info', duration = 4000) {
      getOrCreate().show(message, type, duration);
    },
    hide() {
      if (_toast) _toast.hide();
    },
  };
})();
