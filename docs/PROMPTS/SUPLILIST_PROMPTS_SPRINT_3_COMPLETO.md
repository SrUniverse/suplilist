# **SPRINT 3: UI Components + Design — PROMPTS COMPLETOS**

> Padrão industrial. Código real + checklists + deliverables. Cole direto no Antigravity.

---

## **PROMPT 3.1: Web Components Library — COMPLETO**

```markdown
You are building the UI component library for SupliList v4.0.

## CONTEXT

SupliList uses ZERO frameworks (no React, no Vue, no Angular).
Everything is built with Web Components (Custom Elements + Shadow DOM).

Why Web Components:
- No build step required
- True style encapsulation via Shadow DOM
- Reusable across any framework in the future
- Native browser API — no runtime overhead
- 100% compatible with PWA + offline

Each component must:
- Work standalone (paste anywhere and it works)
- Emit custom events (not manipulate parent DOM)
- Accept attributes (not JavaScript-only config)
- Be keyboard accessible (ARIA labels, focus management)
- Animate smoothly (GPU-accelerated, no layout thrash)

---

## TASK 1: CREATE /src/components/web-components.js

```javascript
/**
 * SupliList Web Components Library v4.0
 * 15 Custom Elements — Zero frameworks, Shadow DOM, ARIA-ready
 *
 * Usage: import './web-components.js'
 * Then use: <supplement-card id="creatina" name="Creatina" evidence="A" price="89.90"></supplement-card>
 */

// ─── Base Component (DRY inheritance) ─────────────────────────────────────────

class SupliBase extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  // Shared design tokens injected into every Shadow DOM
  get _baseStyles() {
    return `
      <style>
        :host { display: block; box-sizing: border-box; }
        *, *::before, *::after { box-sizing: inherit; }

        /* Design tokens (mirror design-system.css) */
        :host {
          --color-bg:        #0A0A0A;
          --color-surface:   #141414;
          --color-surface2:  #1E1E1E;
          --color-border:    #2A2A2A;
          --color-primary:   #7C3AED;
          --color-primary-h: #9461F7;
          --color-success:   #00E676;
          --color-warning:   #FFB74D;
          --color-danger:    #EF5350;
          --color-text:      #FAFAFA;
          --color-muted:     #888888;
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

        /* Reusable button */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: var(--radius-full);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform var(--transition), opacity var(--transition);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .btn:active { transform: scale(0.96); }
        .btn-primary { background: var(--color-primary); color: #fff; }
        .btn-primary:hover { background: var(--color-primary-h); }
        .btn-ghost { background: transparent; color: var(--color-primary); border: 1px solid var(--color-primary); }
        .btn-danger { background: var(--color-danger); color: #fff; }
      </style>
    `;
  }

  // Attribute helpers
  attr(name, fallback = '') {
    return this.getAttribute(name) ?? fallback;
  }
  boolAttr(name) {
    return this.hasAttribute(name);
  }

  // Emit typed events safely
  emit(eventName, detail = {}) {
    this.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true // crosses Shadow DOM boundary
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. <supplement-card>
//    Attrs: id, name, category, evidence, price, cost-per-dose, favorited, in-stack
//    Events: sl-favorite, sl-add-stack, sl-view-detail
// ═══════════════════════════════════════════════════════════════════════════════

class SupplementCard extends SupliBase {
  static get observedAttributes() {
    return ['name', 'evidence', 'price', 'cost-per-dose', 'favorited', 'in-stack', 'category'];
  }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  _render() {
    const name       = this.attr('name', 'Suplemento');
    const evidence   = this.attr('evidence', 'C');
    const price      = this.attr('price', '0');
    const cpd        = this.attr('cost-per-dose', '0');
    const category   = this.attr('category', 'Geral');
    const favorited  = this.boolAttr('favorited');
    const inStack    = this.boolAttr('in-stack');

    const evidenceColors = { A: '#00E676', B: '#7C3AED', C: '#FFB74D', D: '#EF5350' };
    const evidenceLabels = { A: 'Evidência Forte', B: 'Evidência Boa', C: 'Evidência Fraca', D: 'Experimental' };
    const evColor = evidenceColors[evidence] || '#888';
    const evLabel = evidenceLabels[evidence] || 'Desconhecida';

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform var(--transition), box-shadow var(--transition);
          cursor: pointer;
        }
        .card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
          border-color: var(--color-primary);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        .card-name {
          font-family: var(--font-sans);
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
          flex: 1;
          line-height: 1.3;
        }
        .card-category {
          font-size: 11px;
          color: var(--color-muted);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .evidence-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-mono);
          background: ${evColor}22;
          color: ${evColor};
          border: 1px solid ${evColor}44;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .price-block { display: flex; flex-direction: column; gap: 2px; }
        .price-main {
          font-family: var(--font-mono);
          font-size: 18px;
          font-weight: 700;
          color: var(--color-primary);
        }
        .price-dose {
          font-size: 11px;
          color: var(--color-muted);
        }
        .actions {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .icon-btn {
          width: 34px; height: 34px;
          border-radius: var(--radius-full);
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          transition: all var(--transition);
        }
        .icon-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
        .icon-btn.favorited { color: #EF5350; border-color: #EF535044; background: #EF535011; }
        .icon-btn.in-stack  { color: var(--color-success); border-color: #00E67644; background: #00E67611; }
        .tooltip {
          position: relative;
        }
        .tooltip::after {
          content: attr(aria-label);
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: #fff;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 150ms;
        }
        .tooltip:hover::after { opacity: 1; }
      </style>

      <article class="card" role="article" aria-label="${name}">
        <div class="card-header">
          <div>
            <p class="card-category">${category}</p>
            <h3 class="card-name">${name}</h3>
          </div>
          <span class="evidence-badge" title="${evLabel}">
            ${evidence} <span style="font-size:9px;opacity:0.7">EVD</span>
          </span>
        </div>

        <div class="card-footer">
          <div class="price-block">
            <span class="price-main">R$ ${parseFloat(price).toFixed(2)}</span>
            <span class="price-dose">R$ ${parseFloat(cpd).toFixed(2)} / dose</span>
          </div>

          <div class="actions">
            <button
              class="icon-btn tooltip ${favorited ? 'favorited' : ''}"
              aria-label="${favorited ? 'Remover favorito' : 'Adicionar favorito'}"
              data-action="favorite"
            >♥</button>

            <button
              class="icon-btn tooltip ${inStack ? 'in-stack' : ''}"
              aria-label="${inStack ? 'No seu stack' : 'Adicionar ao stack'}"
              data-action="add-stack"
            >${inStack ? '✓' : '+'}</button>

            <button
              class="btn btn-ghost"
              data-action="view-detail"
              aria-label="Ver detalhes de ${name}"
            >Ver</button>
          </div>
        </div>
      </article>
    `;

    this._root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = this.attr('id');

      if (action === 'favorite') {
        this.toggleAttribute('favorited');
        this.emit('sl-favorite', { id, favorited: this.boolAttr('favorited') });
      } else if (action === 'add-stack') {
        this.emit('sl-add-stack', { id, name });
      } else if (action === 'view-detail') {
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
  static get observedAttributes() { return ['checked', 'supplement-name', 'supplement-id']; }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  _render() {
    const name    = this.attr('supplement-name', 'Suplemento');
    const checked = this.boolAttr('checked');
    const ts      = this.attr('timestamp');
    const timeStr = ts ? new Date(parseInt(ts)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .checkin-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: var(--color-surface);
          border: 1px solid ${checked ? 'var(--color-success)' : 'var(--color-border)'};
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition);
          user-select: none;
        }
        .checkin-wrap:hover {
          border-color: var(--color-success);
          background: ${checked ? '#00E67611' : 'var(--color-surface2)'};
        }
        .checkbox {
          width: 28px; height: 28px;
          border-radius: 8px;
          border: 2px solid ${checked ? 'var(--color-success)' : 'var(--color-muted)'};
          background: ${checked ? 'var(--color-success)' : 'transparent'};
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all var(--transition);
          font-size: 16px;
          color: #000;
        }
        .label-block { flex: 1; }
        .label-name {
          font-size: 15px;
          font-weight: 600;
          color: ${checked ? 'var(--color-success)' : 'var(--color-text)'};
          margin: 0;
        }
        .label-time {
          font-size: 11px;
          color: var(--color-muted);
          margin: 0;
          font-family: var(--font-mono);
        }
        @keyframes pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        .checkbox.pop { animation: pop 300ms ease; }
      </style>

      <div
        class="checkin-wrap"
        role="checkbox"
        aria-checked="${checked}"
        aria-label="Check-in: ${name}"
        tabindex="0"
      >
        <div class="checkbox ${checked ? '' : ''}">${checked ? '✓' : ''}</div>
        <div class="label-block">
          <p class="label-name">${name}</p>
          ${timeStr ? `<p class="label-time">Registrado às ${timeStr}</p>` : ''}
        </div>
      </div>
    `;

    const wrap = this._root.querySelector('.checkin-wrap');
    const checkbox = this._root.querySelector('.checkbox');

    const toggle = () => {
      const nowChecked = !this.boolAttr('checked');
      if (nowChecked) this.setAttribute('checked', '');
      else this.removeAttribute('checked');

      checkbox.classList.add('pop');
      setTimeout(() => checkbox.classList.remove('pop'), 300);

      this.emit('sl-checkin', {
        supplementId: this.attr('supplement-id'),
        supplementName: name,
        checked: nowChecked,
        timestamp: Date.now()
      });
    };

    wrap.addEventListener('click', toggle);
    wrap.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
  }
}

customElements.define('checkin-button', CheckinButton);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. <streak-counter>
//    Attrs: count, record
//    No events
// ═══════════════════════════════════════════════════════════════════════════════

class StreakCounter extends SupliBase {
  static get observedAttributes() { return ['count', 'record']; }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  _render() {
    const count  = parseInt(this.attr('count', '0'));
    const record = parseInt(this.attr('record', '0'));
    const isRecord = count > 0 && count >= record;

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .streak-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 24px;
          background: linear-gradient(135deg, #1a0a2e 0%, #0d1a0d 100%);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-primary);
          position: relative;
          overflow: hidden;
        }
        .streak-wrap::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .flame { font-size: 36px; line-height: 1; }
        .count {
          font-family: 'Montserrat', var(--font-sans);
          font-size: 72px;
          font-weight: 900;
          line-height: 1;
          color: ${isRecord ? 'var(--color-success)' : 'var(--color-primary)'};
          text-shadow: 0 0 30px ${isRecord ? '#00E67666' : '#7C3AED66'};
          letter-spacing: -2px;
        }
        .label {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .record-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: var(--color-success);
          color: #000;
          font-size: 11px;
          font-weight: 800;
          border-radius: var(--radius-full);
          margin-top: 4px;
        }
        @keyframes flame-sway {
          0%, 100% { transform: rotate(-8deg) scale(1.0); }
          50%       { transform: rotate(8deg) scale(1.1); }
        }
        .flame { animation: flame-sway 1.2s ease-in-out infinite; }
      </style>

      <div class="streak-wrap" role="img" aria-label="${count} dias seguidos">
        <span class="flame">🔥</span>
        <span class="count">${count}</span>
        <span class="label">dias seguidos</span>
        ${isRecord ? '<span class="record-badge">🏆 Recorde pessoal</span>' : `<span style="font-size:11px;color:var(--color-muted)">Recorde: ${record} dias</span>`}
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

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  _render() {
    const price    = parseFloat(this.attr('price', '0')).toFixed(2);
    const original = parseFloat(this.attr('original-price', '0'));
    const cpd      = parseFloat(this.attr('cost-per-dose', '0')).toFixed(2);
    const currency = this.attr('currency', 'R$');
    const hasDiscount = original > 0 && original > parseFloat(price);
    const discount = hasDiscount ? Math.round((1 - parseFloat(price) / original) * 100) : 0;

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .price-wrap {
          display: inline-flex;
          flex-direction: column;
          gap: 2px;
        }
        .price-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .price-current {
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 700;
          color: var(--color-primary);
        }
        .price-original {
          font-size: 14px;
          color: var(--color-muted);
          text-decoration: line-through;
          font-family: var(--font-mono);
        }
        .discount-badge {
          display: inline-flex;
          padding: 2px 6px;
          background: var(--color-success);
          color: #000;
          font-size: 11px;
          font-weight: 800;
          border-radius: 4px;
        }
        .per-dose {
          font-size: 11px;
          color: var(--color-muted);
          font-family: var(--font-mono);
        }
      </style>

      <div class="price-wrap" aria-label="Preço: ${currency} ${price}">
        <div class="price-row">
          <span class="price-current">${currency} ${price}</span>
          ${hasDiscount ? `<span class="price-original">${currency} ${original.toFixed(2)}</span>` : ''}
          ${hasDiscount ? `<span class="discount-badge">-${discount}%</span>` : ''}
        </div>
        <span class="per-dose">${currency} ${cpd} por dose</span>
      </div>
    `;
  }
}

customElements.define('price-badge', PriceBadge);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. <toast-notification>
//    Attrs: message, type (success|error|info|warning), duration
//    Methods: show(), hide()
//    Events: sl-toast-closed
// ═══════════════════════════════════════════════════════════════════════════════

class ToastNotification extends SupliBase {
  static get observedAttributes() { return ['message', 'type', 'duration']; }

  connectedCallback() {
    this._render();
    this._timer = null;
  }

  disconnectedCallback() {
    clearTimeout(this._timer);
  }

  show(message, type = 'info', duration = 4000) {
    this.setAttribute('message', message);
    this.setAttribute('type', type);
    this.setAttribute('duration', duration);
    this._render();
    this._autoHide(duration);
  }

  hide() {
    const toast = this._root.querySelector('.toast');
    if (toast) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => {
        this.emit('sl-toast-closed');
        this.removeAttribute('message');
        this._render();
      }, 250);
    }
  }

  _autoHide(duration) {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.hide(), duration);
  }

  _render() {
    const message  = this.attr('message');
    const type     = this.attr('type', 'info');
    const colors   = { success: '#00E676', error: '#EF5350', warning: '#FFB74D', info: '#7C3AED' };
    const icons    = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const color    = colors[type] || colors.info;
    const icon     = icons[type] || icons.info;

    if (!message) { this._root.innerHTML = `${this._baseStyles}`; return; }

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: var(--color-surface2);
          border: 1px solid ${color};
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
          z-index: 9999;
          min-width: 240px;
          max-width: 340px;
          animation: slideIn 250ms ease forwards;
          font-family: var(--font-sans);
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .toast-icon {
          width: 28px; height: 28px;
          border-radius: var(--radius-full);
          background: ${color}22;
          color: ${color};
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .toast-message {
          flex: 1;
          font-size: 14px;
          color: var(--color-text);
          line-height: 1.4;
          margin: 0;
        }
        .toast-close {
          background: none;
          border: none;
          color: var(--color-muted);
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          line-height: 1;
        }
        .toast-close:hover { color: var(--color-text); }
        @media (max-width: 480px) {
          .toast {
            bottom: 80px;  /* above mobile nav */
            left: 16px; right: 16px;
            max-width: unset;
          }
        }
      </style>

      <div class="toast" role="alert" aria-live="polite">
        <div class="toast-icon">${icon}</div>
        <p class="toast-message">${message}</p>
        <button class="toast-close" aria-label="Fechar notificação">✕</button>
      </div>
    `;

    this._root.querySelector('.toast-close')?.addEventListener('click', () => this.hide());
  }
}

customElements.define('toast-notification', ToastNotification);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. <search-bar>
//    Attrs: placeholder, value
//    Events: sl-search (debounced 300ms), sl-clear
// ═══════════════════════════════════════════════════════════════════════════════

class SearchBar extends SupliBase {
  static get observedAttributes() { return ['placeholder', 'value']; }

  connectedCallback() {
    this._debounceTimer = null;
    this._render();
  }

  _render() {
    const placeholder = this.attr('placeholder', 'Buscar suplementos...');
    const value       = this.attr('value', '');

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--color-muted);
          font-size: 16px;
          pointer-events: none;
          z-index: 1;
        }
        .search-input {
          width: 100%;
          padding: 12px 40px 12px 42px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          color: var(--color-text);
          font-family: var(--font-sans);
          font-size: 15px;
          outline: none;
          transition: border-color var(--transition), box-shadow var(--transition);
          -webkit-appearance: none;
        }
        .search-input::placeholder { color: var(--color-muted); }
        .search-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.15);
        }
        .clear-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--color-muted);
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          line-height: 1;
          display: ${value ? 'flex' : 'none'};
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: color var(--transition);
        }
        .clear-btn:hover { color: var(--color-text); }
      </style>

      <div class="search-wrap">
        <span class="search-icon" aria-hidden="true">🔍</span>
        <input
          class="search-input"
          type="search"
          placeholder="${placeholder}"
          value="${value}"
          aria-label="${placeholder}"
          autocomplete="off"
          spellcheck="false"
        />
        <button class="clear-btn" aria-label="Limpar busca">✕</button>
      </div>
    `;

    const input   = this._root.querySelector('.search-input');
    const clearBtn = this._root.querySelector('.clear-btn');

    input.addEventListener('input', (e) => {
      const val = e.target.value;
      clearBtn.style.display = val ? 'flex' : 'none';

      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this.emit('sl-search', { query: val });
      }, 300);
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      input.focus();
      this.emit('sl-clear');
      this.emit('sl-search', { query: '' });
    });
  }
}

customElements.define('search-bar', SearchBar);

// ═══════════════════════════════════════════════════════════════════════════════
// 7. <modal-dialog>
//    Attrs: open, title
//    Slots: default (body content), [slot="footer"]
//    Events: sl-close
// ═══════════════════════════════════════════════════════════════════════════════

class ModalDialog extends SupliBase {
  static get observedAttributes() { return ['open', 'title']; }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  open() { this.setAttribute('open', ''); }
  close() { this.removeAttribute('open'); this.emit('sl-close'); }

  _render() {
    const isOpen = this.boolAttr('open');
    const title  = this.attr('title', '');

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.7);
          display: ${isOpen ? 'flex' : 'none'};
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: ${isOpen ? 'fadeIn 200ms ease' : 'none'};
          backdrop-filter: blur(4px);
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          animation: ${isOpen ? 'slideUp 250ms ease' : 'none'};
          overflow: hidden;
        }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--color-border);
        }
        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
        }
        .close-btn {
          background: none; border: none;
          color: var(--color-muted);
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
          padding: 4px;
          border-radius: 50%;
          transition: color var(--transition);
        }
        .close-btn:hover { color: var(--color-text); }
        .modal-body {
          padding: 20px 24px;
          overflow-y: auto;
          flex: 1;
        }
        .modal-footer {
          padding: 16px 24px 20px;
          border-top: 1px solid var(--color-border);
        }
      </style>

      <div class="overlay" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">${title}</h2>
            <button class="close-btn" aria-label="Fechar modal">✕</button>
          </div>
          <div class="modal-body">
            <slot></slot>
          </div>
          <div class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `;

    this._root.querySelector('.close-btn')?.addEventListener('click', () => this.close());
    this._root.querySelector('.overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.close();
    });

    // Keyboard: Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.boolAttr('open')) this.close();
    }, { once: true });
  }
}

customElements.define('modal-dialog', ModalDialog);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. <bottom-sheet>
//    Attrs: open, title
//    Events: sl-close
// ═══════════════════════════════════════════════════════════════════════════════

class BottomSheet extends SupliBase {
  static get observedAttributes() { return ['open', 'title']; }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  _render() {
    const isOpen = this.boolAttr('open');
    const title  = this.attr('title', '');

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.6);
          display: ${isOpen ? 'block' : 'none'};
          animation: ${isOpen ? 'fadeIn 200ms ease' : 'none'};
          backdrop-filter: blur(4px);
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sheet {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 1001;
          background: var(--color-surface);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          border-top: 1px solid var(--color-border);
          max-height: 85vh;
          display: ${isOpen ? 'flex' : 'none'};
          flex-direction: column;
          animation: ${isOpen ? 'slideUp 280ms cubic-bezier(0.32,0.72,0,1)' : 'none'};
          overflow: hidden;
        }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .handle {
          width: 36px; height: 4px;
          background: var(--color-border);
          border-radius: var(--radius-full);
          margin: 12px auto 4px;
          cursor: grab;
          flex-shrink: 0;
        }
        .sheet-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 20px 12px;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .sheet-title { font-size: 16px; font-weight: 700; color: var(--color-text); margin: 0; }
        .close-btn { background: none; border: none; color: var(--color-muted); font-size: 20px; cursor: pointer; }
        .sheet-body { padding: 16px 20px 32px; overflow-y: auto; flex: 1; }
      </style>

      <div class="overlay"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="handle" aria-hidden="true"></div>
        <div class="sheet-header">
          <h3 class="sheet-title">${title}</h3>
          <button class="close-btn" aria-label="Fechar">✕</button>
        </div>
        <div class="sheet-body">
          <slot></slot>
        </div>
      </div>
    `;

    const close = () => {
      this.removeAttribute('open');
      this.emit('sl-close');
    };

    this._root.querySelector('.overlay')?.addEventListener('click', close);
    this._root.querySelector('.close-btn')?.addEventListener('click', close);
  }
}

customElements.define('bottom-sheet', BottomSheet);

// ═══════════════════════════════════════════════════════════════════════════════
// 9. <stat-card>
//    Attrs: label, value, unit, color, trend (up|down|neutral)
// ═══════════════════════════════════════════════════════════════════════════════

class StatCard extends SupliBase {
  static get observedAttributes() { return ['label', 'value', 'unit', 'color', 'trend']; }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  _render() {
    const label = this.attr('label', 'Métrica');
    const value = this.attr('value', '—');
    const unit  = this.attr('unit', '');
    const color = this.attr('color', 'var(--color-primary)');
    const trend = this.attr('trend', 'neutral');
    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—';
    const trendColor = trend === 'up' ? 'var(--color-success)' : trend === 'down' ? 'var(--color-danger)' : 'var(--color-muted)';

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .stat-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--color-muted);
          font-weight: 600;
          margin: 0;
        }
        .stat-value-row {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .stat-value {
          font-family: var(--font-mono);
          font-size: 28px;
          font-weight: 700;
          color: ${color};
          line-height: 1;
        }
        .stat-unit {
          font-size: 13px;
          color: var(--color-muted);
        }
        .stat-trend {
          font-size: 12px;
          font-weight: 700;
          color: ${trendColor};
        }
      </style>

      <div class="stat-card" role="figure" aria-label="${label}: ${value}${unit}">
        <p class="stat-label">${label}</p>
        <div class="stat-value-row">
          <span class="stat-value">${value}</span>
          <span class="stat-unit">${unit}</span>
        </div>
        <span class="stat-trend">${trendIcon}</span>
      </div>
    `;
  }
}

customElements.define('stat-card', StatCard);

// ═══════════════════════════════════════════════════════════════════════════════
// 10. <evidence-pill>
//     Attrs: level (A|B|C|D)
// ═══════════════════════════════════════════════════════════════════════════════

class EvidencePill extends SupliBase {
  static get observedAttributes() { return ['level']; }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  _render() {
    const level = this.attr('level', 'C').toUpperCase();
    const map = {
      A: { color: '#00E676', label: 'Evidência A — Forte (meta-análises)', icon: '🟢' },
      B: { color: '#7C3AED', label: 'Evidência B — Boa (RCTs)', icon: '🟣' },
      C: { color: '#FFB74D', label: 'Evidência C — Fraca (observacional)', icon: '🟡' },
      D: { color: '#EF5350', label: 'Evidência D — Experimental', icon: '🔴' }
    };
    const { color, label, icon } = map[level] || map.C;

    this._root.innerHTML = `
      ${this._baseStyles}
      <style>
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: ${color}1a;
          border: 1px solid ${color}44;
          font-size: 12px;
          font-weight: 700;
          color: ${color};
          font-family: var(--font-mono);
          cursor: help;
          user-select: none;
        }
      </style>
      <span class="pill" title="${label}" role="img" aria-label="${label}">
        ${icon} Evidência ${level}
      </span>
    `;
  }
}

customElements.define('evidence-pill', EvidencePill);

// ─── Global Toast Helper ───────────────────────────────────────────────────────
// Usage: window.toast('Adicionado ao stack!', 'success')

(function setupGlobalToast() {
  let toastEl = document.querySelector('toast-notification');
  if (!toastEl) {
    toastEl = document.createElement('toast-notification');
    document.body.appendChild(toastEl);
  }
  window.toast = (message, type = 'info', duration = 4000) => {
    toastEl.show(message, type, duration);
  };
})();

console.log('✅ SupliList Web Components v4.0 loaded — 10 components registered');
```

---

## VALIDATION CHECKLIST

- [ ] All 10 `customElements.define()` calls succeed (no "already defined" errors)
- [ ] `<supplement-card>` renders name, price, evidence badge
- [ ] Clicking heart on `<supplement-card>` emits `sl-favorite` event
- [ ] `<checkin-button>` toggles state on click + emits `sl-checkin`
- [ ] `<streak-counter count="30">` renders 30 with fire animation
- [ ] `<toast-notification>` appears, then auto-dismisses after `duration` ms
- [ ] `<search-bar>` fires `sl-search` only after 300ms debounce
- [ ] `<modal-dialog open>` shows overlay; pressing Escape closes it
- [ ] `<bottom-sheet open>` slides up from bottom
- [ ] `window.toast('msg', 'success')` works from console
- [ ] All components pass ARIA checks (role, aria-label present)
- [ ] No Shadow DOM style leaks (verify with DevTools)

## FILES TO DELIVER

1. `/src/components/web-components.js`
2. `/src/components/web-components.test.html` (visual test page)
```

---

## **PROMPT 3.2: HomePage + Dashboard — COMPLETO**

```markdown
You are building the HomePage for SupliList v4.0.

## CONTEXT

The HomePage is the first thing users see after onboarding.
It must communicate value immediately:
- "You took 3 of 5 supplements today" (accountability)
- "17-day streak" (motivation)
- "Next: take Whey Protein (post-workout)" (action)

Layout philosophy:
- Mobile-first (most users at the gym on phone)
- Critical info above the fold (streak + today's checkin)
- Scannable at a glance (no walls of text)
- Fast: renders from localStorage in <50ms

---

## TASK 1: CREATE /src/pages/home-page.js

```javascript
/**
 * HomePage v4.0 — SupliList
 * Dashboard pessoal: streak, check-in, stats, CTAs
 */

import sm, { ACTIONS } from '../state/state-manager.js';
import DosageCalculator from '../ai/dosage-calculator.js';

export class HomePage {
  constructor(container) {
    this.container = container;
    this._unsub = null;
  }

  mount() {
    this._render();

    // Subscribe to state changes (re-render only affected sections)
    this._unsub = sm.subscribe((state, action) => {
      if (['ADD_CHECKIN', 'REMOVE_CHECKIN'].includes(action.type)) {
        this._updateCheckinSection();
      }
      if (action.type === 'ADD_TO_STACK' || action.type === 'REMOVE_FROM_STACK') {
        this._updateStackSection();
      }
    });
  }

  unmount() {
    if (this._unsub) this._unsub();
  }

  _render() {
    const state      = sm.state;
    const user       = state.user;
    const stack      = state.stack;
    const streak     = sm.currentStreak;
    const todayCI    = sm.todayCheckins;
    const adherence  = this._calcAdherence(state.checkins, stack.length);
    const firstName  = user.name?.split(' ')[0] || 'Atleta';

    this.container.innerHTML = `
      <div class="home-page">

        <!-- ── Header ────────────────────────────────────────── -->
        <header class="home-header">
          <div>
            <p class="greeting">Olá, ${firstName} 👋</p>
            <h1 class="home-title">Seu Dashboard</h1>
          </div>
          <button
            class="btn-icon"
            aria-label="Notificações"
            data-action="open-notifications"
          >
            🔔
            ${state.notifications.filter(n => !n.read).length > 0
              ? `<span class="notif-dot"></span>`
              : ''}
          </button>
        </header>

        <!-- ── Streak Hero ───────────────────────────────────── -->
        <section class="streak-section" aria-label="Sequência atual">
          <streak-counter
            count="${streak}"
            record="${this._getStreakRecord(state.checkins)}"
          ></streak-counter>
        </section>

        <!-- ── Check-in Rápido ───────────────────────────────── -->
        <section class="checkin-section" id="checkin-section" aria-label="Check-in de hoje">
          <div class="section-header">
            <h2 class="section-title">Check-in de Hoje</h2>
            <span class="checkin-progress" aria-live="polite">
              ${todayCI.length} / ${stack.length}
            </span>
          </div>

          <div class="checkin-list" id="checkin-list">
            ${stack.length === 0
              ? `<div class="empty-state">
                   <p>Seu stack está vazio.</p>
                   <a href="#/list" class="btn-primary">Explorar suplementos</a>
                 </div>`
              : stack.map(item => {
                  const done = todayCI.some(c => c.supplementId === item.id);
                  return `<checkin-button
                    supplement-id="${item.id}"
                    supplement-name="${item.name}"
                    ${done ? 'checked' : ''}
                    ${done ? `timestamp="${todayCI.find(c => c.supplementId === item.id)?.timestamp}"` : ''}
                  ></checkin-button>`;
                }).join('')
            }
          </div>

          ${stack.length > 0 ? `
            <button
              class="btn-confirm-checkin btn-primary"
              data-action="confirm-checkin"
              aria-label="Confirmar check-in de todos os suplementos"
            >
              ✓ Confirmar check-in completo
            </button>
          ` : ''}
        </section>

        <!-- ── Stats Grid ────────────────────────────────────── -->
        <section class="stats-section" aria-label="Estatísticas">
          <h2 class="section-title">Estatísticas</h2>
          <div class="stats-grid">
            <stat-card
              label="Adesão"
              value="${adherence}"
              unit="%"
              color="var(--color-success)"
              trend="${adherence >= 80 ? 'up' : adherence >= 50 ? 'neutral' : 'down'}"
            ></stat-card>

            <stat-card
              label="Suplementos"
              value="${stack.length}"
              unit="ativos"
              color="var(--color-primary)"
            ></stat-card>

            <stat-card
              label="Check-ins"
              value="${state.checkins.length}"
              unit="total"
              color="var(--color-primary)"
            ></stat-card>

            <stat-card
              label="Investimento"
              value="${this._calcMonthlyInvestment(stack, state.supplements, user)}"
              unit="R$/mês"
              color="var(--color-warning)"
            ></stat-card>
          </div>
        </section>

        <!-- ── CTAs ──────────────────────────────────────────── -->
        <section class="cta-section" aria-label="Ações rápidas">
          <h2 class="section-title">Ações Rápidas</h2>
          <div class="cta-grid">
            <a href="#/list"       class="cta-card">
              <span class="cta-icon">💊</span>
              <span class="cta-label">Catálogo</span>
            </a>
            <a href="#/calculator" class="cta-card">
              <span class="cta-icon">⚗️</span>
              <span class="cta-label">Calculadora</span>
            </a>
            <a href="#/my-stack"   class="cta-card">
              <span class="cta-icon">📦</span>
              <span class="cta-label">Meu Stack</span>
            </a>
            <a href="#/history"    class="cta-card">
              <span class="cta-icon">📈</span>
              <span class="cta-label">Histórico</span>
            </a>
          </div>
        </section>

      </div>
    `;

    this._attachStyles();
    this._attachListeners();
  }

  // ── Partial Updates (no full re-render) ──

  _updateCheckinSection() {
    const todayCI = sm.todayCheckins;
    const stack   = sm.stack;
    const counter = this.container.querySelector('.checkin-progress');
    if (counter) counter.textContent = `${todayCI.length} / ${stack.length}`;

    // Update individual checkin-button states
    stack.forEach(item => {
      const btn = this.container.querySelector(`checkin-button[supplement-id="${item.id}"]`);
      if (!btn) return;
      const done = todayCI.some(c => c.supplementId === item.id);
      if (done) btn.setAttribute('checked', '');
      else btn.removeAttribute('checked');
    });

    // Celebrate if all done
    if (stack.length > 0 && todayCI.length >= stack.length) {
      this._celebrate();
    }
  }

  _updateStackSection() {
    // Full re-render needed for stack changes (adds/removes items)
    this._render();
  }

  // ── Event Listeners ──

  _attachListeners() {
    // Check-in buttons
    this.container.addEventListener('sl-checkin', (e) => {
      const { supplementId, supplementName, checked, timestamp } = e.detail;
      if (checked) {
        sm.dispatch({ type: ACTIONS.ADD_CHECKIN, payload: { supplementId, supplementName, timestamp } });
        window.toast?.(`✓ ${supplementName} registrado!`, 'success');
      } else {
        const ci = sm.todayCheckins.find(c => c.supplementId === supplementId);
        if (ci) sm.dispatch({ type: ACTIONS.REMOVE_CHECKIN, payload: ci.id });
      }
    });

    // Confirm all checkin
    this.container.querySelector('[data-action="confirm-checkin"]')?.addEventListener('click', () => {
      const unchecked = sm.stack.filter(
        item => !sm.todayCheckins.some(c => c.supplementId === item.id)
      );
      unchecked.forEach(item => {
        sm.dispatch({ type: ACTIONS.ADD_CHECKIN, payload: {
          supplementId: item.id,
          supplementName: item.name,
          timestamp: Date.now()
        }});
      });
      this._celebrate();
      window.toast?.('🎉 Check-in completo!', 'success');
    });

    // Notifications
    this.container.querySelector('[data-action="open-notifications"]')?.addEventListener('click', () => {
      // Open notifications panel (emit route change or show modal)
      window.dispatchEvent(new CustomEvent('sl-navigate', { detail: { route: '/notifications' } }));
    });
  }

  // ── CSS (injected into container) ──

  _attachStyles() {
    if (document.getElementById('home-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'home-page-styles';
    style.textContent = `
      .home-page {
        display: flex;
        flex-direction: column;
        gap: 28px;
        padding: 20px 16px 100px; /* 100px for bottom nav */
        max-width: 640px;
        margin: 0 auto;
      }

      /* Header */
      .home-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .greeting { font-size: 13px; color: #888; margin: 0 0 2px; }
      .home-title { font-size: 24px; font-weight: 800; color: #FAFAFA; margin: 0; }
      .btn-icon {
        position: relative;
        width: 40px; height: 40px;
        border-radius: 50%;
        border: 1px solid #2A2A2A;
        background: #141414;
        font-size: 18px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      }
      .notif-dot {
        position: absolute;
        top: 6px; right: 6px;
        width: 8px; height: 8px;
        background: #EF5350;
        border-radius: 50%;
        border: 2px solid #141414;
      }

      /* Section */
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .section-title {
        font-size: 16px;
        font-weight: 700;
        color: #FAFAFA;
        margin: 0 0 12px;
      }
      .checkin-progress {
        font-size: 13px;
        font-weight: 700;
        color: #7C3AED;
        font-family: 'JetBrains Mono', monospace;
      }

      /* Checkin */
      .checkin-list { display: flex; flex-direction: column; gap: 8px; }
      .btn-confirm-checkin {
        width: 100%;
        margin-top: 12px;
        padding: 14px;
        background: #7C3AED;
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 150ms, opacity 150ms;
      }
      .btn-confirm-checkin:hover { opacity: 0.9; }
      .btn-confirm-checkin:active { transform: scale(0.98); }

      /* Stats */
      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      /* CTAs */
      .cta-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }
      .cta-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 14px 8px;
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 12px;
        text-decoration: none;
        transition: border-color 150ms, transform 150ms;
      }
      .cta-card:hover { border-color: #7C3AED; transform: translateY(-2px); }
      .cta-icon { font-size: 22px; }
      .cta-label { font-size: 11px; color: #888; font-weight: 600; text-align: center; }

      /* Empty state */
      .empty-state {
        text-align: center;
        padding: 32px 16px;
        color: #888;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .btn-primary {
        background: #7C3AED;
        color: #fff;
        padding: 10px 20px;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 700;
        font-size: 14px;
        border: none;
        cursor: pointer;
      }

      /* Responsive */
      @media (max-width: 360px) {
        .cta-grid { grid-template-columns: repeat(2, 1fr); }
        .stats-grid { grid-template-columns: 1fr; }
      }
      @media (min-width: 768px) {
        .home-page { padding: 32px 24px 80px; }
        .stats-grid { grid-template-columns: repeat(4, 1fr); }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Helpers ──

  _calcAdherence(checkins, stackSize) {
    if (!stackSize || !checkins.length) return 0;
    const days = 30;
    const expected = stackSize * days;
    const actual   = checkins.filter(c => {
      const d = new Date(c.timestamp);
      const cutoff = Date.now() - days * 86400000;
      return c.timestamp >= cutoff;
    }).length;
    return Math.round((actual / expected) * 100);
  }

  _getStreakRecord(checkins) {
    if (!checkins.length) return 0;
    let maxStreak = 0, current = 0;
    const days = [...new Set(checkins.map(c => {
      const d = new Date(c.timestamp);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }))].sort();

    days.forEach((day, i) => {
      if (i === 0) { current = 1; return; }
      const prev = new Date(days[i - 1]);
      const curr = new Date(day);
      const diff = (curr - prev) / 86400000;
      if (diff === 1) { current++; } else { current = 1; }
      maxStreak = Math.max(maxStreak, current);
    });

    return Math.max(maxStreak, current);
  }

  _calcMonthlyInvestment(stack, supplements, user) {
    if (!stack.length || !supplements.length) return '0';
    let total = 0;
    stack.forEach(item => {
      const supp = supplements.find(s => s.id === item.id);
      if (!supp) return;
      const dosage = DosageCalculator.calculate(supp, {
        weight: user.weight || 70,
        trainingFrequency: user.trainingFrequency || 3,
        objective: user.objective || 'general',
        age: 25
      });
      const dailyGrams = dosage.unit === 'mg' ? dosage.daily / 1000 : dosage.daily;
      total += dailyGrams * 30 * (supp.pricePerGram || 0.10);
    });
    return total.toFixed(0);
  }

  _celebrate() {
    // Confetti burst (simple CSS-based)
    const confetti = document.createElement('div');
    confetti.innerHTML = Array.from({ length: 20 }, (_, i) => {
      const colors = ['#7C3AED','#00E676','#FFB74D','#EF5350','#fff'];
      const color  = colors[i % colors.length];
      const x      = Math.random() * 100;
      const delay  = Math.random() * 400;
      const size   = 6 + Math.random() * 6;
      return `<div style="
        position: fixed;
        left: ${x}vw;
        top: -10px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 2px;
        animation: confetti-fall 1.2s ${delay}ms ease-in forwards;
        z-index: 9999;
        pointer-events: none;
      "></div>`;
    }).join('');

    if (!document.getElementById('confetti-style')) {
      const s = document.createElement('style');
      s.id = 'confetti-style';
      s.textContent = `
        @keyframes confetti-fall {
          from { transform: translateY(0) rotate(0deg); opacity: 1; }
          to   { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 2000);
  }
}

export default HomePage;
```

---

## VALIDATION CHECKLIST

- [ ] Page renders in <50ms from localStorage (no loading spinner for cached data)
- [ ] `<streak-counter>` shows correct current streak
- [ ] Clicking a `<checkin-button>` dispatches `ADD_CHECKIN` to StateManager
- [ ] "Confirmar check-in completo" checks all unchecked supplements at once
- [ ] Toast appears after each check-in
- [ ] Confetti fires when all supplements are checked
- [ ] Stats grid shows adherence, stack count, total checkins, monthly cost
- [ ] CTA links navigate to correct hash routes
- [ ] Empty stack shows "Explorar suplementos" CTA
- [ ] Mobile (360px): 2-col CTA grid, no overflow
- [ ] Desktop (768px+): 4-col stats grid

## FILES TO DELIVER

1. `/src/pages/home-page.js`
```

---

## **PROMPT 3.3: ListPage + FuzzySearch — COMPLETO**

```markdown
You are building the supplement catalog page for SupliList v4.0.

## CONTEXT

500+ supplements need to be:
- Searchable (fuzzy, typo-tolerant, instant)
- Filterable (objective, evidence, category)
- Displayed in a fast virtual grid (no DOM thrash)
- Individually actionable (favorite, add to stack)

Performance is critical: 500 items must render in <200ms.
We achieve this with:
1. Fuse.js for fuzzy search (pre-indexed)
2. document fragment batch insertion (no per-item reflow)
3. Lazy image loading (IntersectionObserver)
4. Debounced search (300ms)

---

## TASK 1: CREATE /src/pages/list-page.js

```javascript
/**
 * ListPage v4.0 — Supplement Catalog
 * 500+ items, fuzzy search, filters, infinite scroll
 */

import sm, { ACTIONS } from '../state/state-manager.js';

const PAGE_SIZE = 24; // Items per load

export class ListPage {
  constructor(container) {
    this.container = container;
    this._fuse     = null;
    this._allItems = [];
    this._filtered = [];
    this._page     = 0;
    this._filters  = { query: '', objective: '', evidence: '', category: '' };
    this._unsub    = null;
    this._observer = null;
  }

  async mount() {
    this._render();
    await this._loadData();
    this._initFuseSearch();
    this._initInfiniteScroll();
    this._attachListeners();

    // React to favorites/stack changes
    this._unsub = sm.subscribe((state, action) => {
      if (['ADD_FAVORITE','REMOVE_FAVORITE','ADD_TO_STACK','REMOVE_FROM_STACK'].includes(action.type)) {
        this._refreshCardStates();
      }
    });
  }

  unmount() {
    this._unsub?.();
    this._observer?.disconnect();
  }

  _render() {
    this.container.innerHTML = `
      <div class="list-page">

        <!-- ── Header ─── -->
        <div class="list-header">
          <h1 class="page-title">Catálogo</h1>
          <p class="page-subtitle">Encontre o suplemento certo para você</p>
        </div>

        <!-- ── Search ─── -->
        <div class="search-wrap">
          <search-bar placeholder="Buscar suplementos... (ex: creatina, vitamina d)"></search-bar>
        </div>

        <!-- ── Stats Bar ─── -->
        <div class="list-stats" id="list-stats" aria-live="polite">
          <span class="stat-pill" id="stat-total">— disponíveis</span>
          <span class="stat-pill" id="stat-filtered">— encontrados</span>
          <span class="stat-pill fav" id="stat-favs">— favoritos</span>
        </div>

        <!-- ── Filters ─── -->
        <div class="filters-row" role="group" aria-label="Filtros">
          <select class="filter-select" id="filter-objective" aria-label="Filtrar por objetivo">
            <option value="">🎯 Objetivo</option>
            <option value="bulk">Bulk</option>
            <option value="cut">Cut</option>
            <option value="strength">Força</option>
            <option value="endurance">Resistência</option>
            <option value="general">Saúde Geral</option>
          </select>

          <select class="filter-select" id="filter-evidence" aria-label="Filtrar por evidência">
            <option value="">🔬 Evidência</option>
            <option value="A">A — Forte</option>
            <option value="B">B — Boa</option>
            <option value="C">C — Fraca</option>
            <option value="D">D — Experimental</option>
          </select>

          <select class="filter-select" id="filter-category" aria-label="Filtrar por categoria">
            <option value="">📂 Categoria</option>
            <option value="Performance">Performance</option>
            <option value="Proteína">Proteína</option>
            <option value="Vitaminas">Vitaminas</option>
            <option value="Minerais">Minerais</option>
            <option value="Adaptógenos">Adaptógenos</option>
            <option value="Estimulantes">Estimulantes</option>
            <option value="Queimadores">Queimadores</option>
            <option value="Saúde">Saúde</option>
            <option value="Cognição">Cognição</option>
            <option value="Longevidade">Longevidade</option>
          </select>

          <button class="btn-clear-filters" id="btn-clear-filters" aria-label="Limpar filtros">
            ✕ Limpar
          </button>
        </div>

        <!-- ── Grid ─── -->
        <div class="supplement-grid" id="supplement-grid" role="list" aria-label="Lista de suplementos">
          <div class="grid-loading" id="grid-loading">
            <div class="spinner"></div>
            <p>Carregando catálogo...</p>
          </div>
        </div>

        <!-- ── Infinite scroll sentinel ─── -->
        <div id="scroll-sentinel" aria-hidden="true" style="height:1px;"></div>

      </div>
    `;

    this._attachStyles();
  }

  async _loadData() {
    try {
      // Load from StateManager cache first
      if (sm.state.supplements.length > 0) {
        this._allItems = sm.state.supplements;
      } else {
        // Fetch from JSON file
        const res  = await fetch('/data/supplements-db.json');
        const data = await res.json();
        this._allItems = data;
        sm.dispatch({ type: ACTIONS.SET_SUPPLEMENTS, payload: data });
      }

      this._filtered = [...this._allItems];
      this._updateStats();
      this._renderGrid(true);
    } catch (err) {
      console.error('Failed to load supplements:', err);
      document.getElementById('grid-loading').innerHTML = `
        <p style="color:#EF5350">Erro ao carregar catálogo. Tente novamente.</p>
        <button onclick="location.reload()" class="btn-primary">Tentar novamente</button>
      `;
    }
  }

  _initFuseSearch() {
    // Fuse.js CDN (loaded in index.html)
    if (typeof Fuse === 'undefined') {
      console.warn('Fuse.js not loaded');
      return;
    }

    this._fuse = new Fuse(this._allItems, {
      keys: [
        { name: 'name',         weight: 0.6 },
        { name: 'category',     weight: 0.2 },
        { name: 'mainBenefits', weight: 0.2 }
      ],
      threshold:          0.35,   // 0 = exact, 1 = matches anything
      minMatchCharLength: 2,
      includeScore:       true,
      shouldSort:         true
    });
  }

  _applyFilters() {
    const { query, objective, evidence, category } = this._filters;
    let results = this._allItems;

    // Fuzzy search
    if (query.trim().length >= 2 && this._fuse) {
      results = this._fuse.search(query).map(r => r.item);
    }

    // Hard filters
    if (objective) {
      results = results.filter(s => s.targets?.includes(objective));
    }
    if (evidence) {
      results = results.filter(s => s.evidenceLevel === evidence);
    }
    if (category) {
      results = results.filter(s => s.category === category);
    }

    this._filtered = results;
    this._page     = 0;
    this._updateStats();
    this._renderGrid(true);
  }

  _renderGrid(reset = false) {
    const grid = document.getElementById('supplement-grid');
    const loading = document.getElementById('grid-loading');

    if (loading) loading.style.display = 'none';

    if (this._filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <p style="font-size:32px">🔍</p>
          <p>Nenhum suplemento encontrado.</p>
          <button id="clear-from-empty" class="btn-primary">Limpar filtros</button>
        </div>
      `;
      document.getElementById('clear-from-empty')?.addEventListener('click', () => this._clearFilters());
      return;
    }

    const start = this._page * PAGE_SIZE;
    const end   = start + PAGE_SIZE;
    const slice = this._filtered.slice(start, end);

    if (reset) grid.innerHTML = '';

    // Batch DOM insertion
    const fragment = document.createDocumentFragment();

    slice.forEach(supp => {
      const card = document.createElement('supplement-card');
      card.setAttribute('id',           supp.id);
      card.setAttribute('name',         supp.name);
      card.setAttribute('category',     supp.category);
      card.setAttribute('evidence',     supp.evidenceLevel);
      card.setAttribute('price',        supp.price ?? '0');
      card.setAttribute('cost-per-dose', supp.costPerDose ?? '0');
      if (sm.isFavorite(supp.id)) card.setAttribute('favorited', '');
      if (sm.isInStack(supp.id)) card.setAttribute('in-stack', '');
      card.setAttribute('role', 'listitem');
      fragment.appendChild(card);
    });

    grid.appendChild(fragment);
    this._page++;
  }

  _initInfiniteScroll() {
    const sentinel = document.getElementById('scroll-sentinel');
    this._observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const hasMore = this._page * PAGE_SIZE < this._filtered.length;
        if (hasMore) this._renderGrid(false);
      }
    }, { rootMargin: '200px' });
    this._observer.observe(sentinel);
  }

  _refreshCardStates() {
    const cards = this.container.querySelectorAll('supplement-card');
    cards.forEach(card => {
      const id = card.getAttribute('id');
      if (sm.isFavorite(id)) card.setAttribute('favorited', '');
      else card.removeAttribute('favorited');

      if (sm.isInStack(id)) card.setAttribute('in-stack', '');
      else card.removeAttribute('in-stack');
    });
  }

  _updateStats() {
    const totalEl    = document.getElementById('stat-total');
    const filteredEl = document.getElementById('stat-filtered');
    const favsEl     = document.getElementById('stat-favs');

    if (totalEl)    totalEl.textContent    = `${this._allItems.length} disponíveis`;
    if (filteredEl) filteredEl.textContent = `${this._filtered.length} encontrados`;
    if (favsEl)     favsEl.textContent     = `${sm.state.favorites.length} favoritos`;
  }

  _clearFilters() {
    this._filters = { query: '', objective: '', evidence: '', category: '' };
    const sb = this.container.querySelector('search-bar');
    sb?.removeAttribute('value');

    ['filter-objective','filter-evidence','filter-category'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    this._applyFilters();
  }

  _attachListeners() {
    // Search
    this.container.addEventListener('sl-search', (e) => {
      this._filters.query = e.detail.query;
      this._applyFilters();
    });
    this.container.addEventListener('sl-clear', () => {
      this._filters.query = '';
      this._applyFilters();
    });

    // Filters
    ['filter-objective','filter-evidence','filter-category'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        const key = id.replace('filter-', '');
        this._filters[key] = e.target.value;
        this._applyFilters();
      });
    });

    // Clear filters button
    document.getElementById('btn-clear-filters')?.addEventListener('click', () => this._clearFilters());

    // Card events (delegated)
    this.container.addEventListener('sl-favorite', (e) => {
      const { id, favorited } = e.detail;
      sm.dispatch({
        type: favorited ? ACTIONS.ADD_FAVORITE : ACTIONS.REMOVE_FAVORITE,
        payload: id
      });
      window.toast?.(favorited ? '♥ Adicionado aos favoritos' : 'Removido dos favoritos', favorited ? 'success' : 'info');
    });

    this.container.addEventListener('sl-add-stack', (e) => {
      const { id, name } = e.detail;
      if (sm.isInStack(id)) {
        sm.dispatch({ type: ACTIONS.REMOVE_FROM_STACK, payload: id });
        window.toast?.(`${name} removido do stack`, 'info');
      } else {
        sm.dispatch({ type: ACTIONS.ADD_TO_STACK, payload: { id, name } });
        window.toast?.(`✓ ${name} adicionado ao stack!`, 'success');
      }
    });

    this.container.addEventListener('sl-view-detail', (e) => {
      window.dispatchEvent(new CustomEvent('sl-navigate', {
        detail: { route: `/supplement/${e.detail.id}` }
      }));
    });
  }

  _attachStyles() {
    if (document.getElementById('list-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'list-page-styles';
    style.textContent = `
      .list-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 20px 16px 100px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .list-header { margin-bottom: 4px; }
      .page-title { font-size: 24px; font-weight: 800; color: #FAFAFA; margin: 0 0 4px; }
      .page-subtitle { font-size: 14px; color: #888; margin: 0; }

      /* Stats bar */
      .list-stats {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .stat-pill {
        padding: 4px 10px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: #888;
        font-family: 'JetBrains Mono', monospace;
      }
      .stat-pill.fav { color: #EF5350; border-color: #EF535022; }

      /* Filters */
      .filters-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .filter-select {
        padding: 9px 14px;
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 999px;
        color: #FAFAFA;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        outline: none;
        transition: border-color 150ms;
        -webkit-appearance: none;
      }
      .filter-select:focus { border-color: #7C3AED; }
      .btn-clear-filters {
        padding: 9px 14px;
        background: transparent;
        border: 1px solid #EF535044;
        border-radius: 999px;
        color: #EF5350;
        font-size: 13px;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: all 150ms;
      }
      .btn-clear-filters:hover { background: #EF535011; }

      /* Grid */
      .supplement-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .grid-loading {
        text-align: center;
        padding: 60px 20px;
        color: #888;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .spinner {
        width: 32px; height: 32px;
        border: 3px solid #2A2A2A;
        border-top-color: #7C3AED;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 20px;
        color: #888;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      /* Responsive */
      @media (min-width: 480px) {
        .supplement-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (min-width: 768px) {
        .supplement-grid { grid-template-columns: repeat(3, 1fr); }
        .list-page { padding: 24px 24px 80px; }
      }
      @media (min-width: 1024px) {
        .supplement-grid { grid-template-columns: repeat(4, 1fr); }
      }
    `;
    document.head.appendChild(style);
  }
}

export default ListPage;
```

---

## VALIDATION CHECKLIST

- [ ] 500 supplements render in <200ms (measure with `performance.now()`)
- [ ] Typing "cretina" finds "Creatina Monohidratada" (fuzzy threshold 0.35)
- [ ] Typing "ashwa" finds "Ashwagandha"
- [ ] Typing "omega" finds "Ômega-3"
- [ ] Filter by objective "bulk" reduces results to bulk-relevant items
- [ ] Filter by evidence "A" shows only evidence-A supplements
- [ ] "Limpar" button resets all filters and shows all items
- [ ] Clicking ♥ dispatches `ADD_FAVORITE` to StateManager
- [ ] Clicking + dispatches `ADD_TO_STACK` to StateManager
- [ ] Toast appears for each action
- [ ] Scrolling to bottom loads 24 more items (infinite scroll)
- [ ] Stats bar updates after each filter change
- [ ] Empty state shows "Limpar filtros" button when no results
- [ ] Mobile (375px): 1-col grid, filters scroll horizontally
- [ ] Desktop (1024px): 4-col grid

## FILES TO DELIVER

1. `/src/pages/list-page.js`
```

---

## 📊 RESUMO DO SPRINT 3

| Prompt | Arquivo | Componentes | Destaques |
|--------|---------|-------------|-----------|
| 3.1 | `web-components.js` | 10 Custom Elements | Shadow DOM, ARIA, eventos tipados |
| 3.2 | `home-page.js` | HomePage | Streak, check-in, stats, confetti |
| 3.3 | `list-page.js` | ListPage | Fuse.js, filtros, infinite scroll, 4-col grid |

**Após completar o Sprint 3:**
- Biblioteca de 10 componentes reutilizáveis ✅
- Dashboard pessoal funcional com check-in ✅
- Catálogo de 500+ suplementos pesquisável ✅

**Próximo:** Sprint 4 — Calculadora interativa + MyStack + Histórico com gráficos
