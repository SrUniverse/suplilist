# **SPRINT 3: App Shell + UI Components + Pages — PROMPTS COMPLETOS**

> Padrão industrial. Código real + checklists + deliverables. Cole direto com o Prompt de Ouro.
>
> **Ordem de execução obrigatória:** 3.0 → 3.1 → 3.2 → 3.3. Cada prompt depende do anterior.

---

## **PROMPT 3.0: Design System + App Shell + Router — FUNDAÇÃO DO SPRINT**

```markdown
You are building the visual foundation and navigation core for SupliList v4.0.

## CONTEXT

Three things must exist before any UI component or page is built:

1. **Design System (`design-system.css`)** — the single source of truth for all
   CSS custom properties (colors, typography, spacing, shadows, radii).
   Web Components in 3.1 will read tokens FROM this file via `:root` inheritance
   rather than redeclaring them in each Shadow DOM.

2. **App Shell (`index.html` + `app.js`)** — the outer container that bootstraps
   the app, imports all modules in the correct order, and renders the bottom nav.

3. **Router (`router.js`)** — hash-based routing that mounts and unmounts pages
   cleanly when the URL changes or when a `sl-navigate` event is dispatched.

Without these, the HomePage links (`href="#/list"`) and the `sl-navigate` events
emitted by pages will silently do nothing.

---

## TASK 1: CREATE /src/css/design-system.css

This file is the single source of truth for ALL design tokens used across the app
(both in the global document and inside Web Component Shadow DOMs).

```css
/**
 * SupliList v4.0 — Design System
 * Single source of truth for all CSS custom properties.
 *
 * Used by:
 *   - Global stylesheet (via :root)
 *   - Web Components (injected into Shadow DOM via SupliBase._baseStyles)
 *
 * HOW TO USE IN SHADOW DOM:
 *   Shadow DOM does NOT inherit :root variables automatically for custom properties
 *   that aren't inherited. To make tokens available inside Shadow DOM, SupliBase
 *   re-declares them on :host using the same values. The values here are the master
 *   reference — if you change a value here, change it in SupliBase._baseStyles too.
 */

:root {
  /* ── Colors ── */
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

  /* ── Typography ── */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* ── Spacing ── */
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
  --space-2xl: 48px;

  /* ── Border Radius ── */
  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-full: 9999px;

  /* ── Shadows ── */
  --shadow-sm:   0 2px 8px rgba(0,0,0,0.3);
  --shadow-md:   0 4px 24px rgba(0,0,0,0.4);
  --shadow-glow: 0 0 20px rgba(124,58,237,0.3);

  /* ── Transitions ── */
  --transition:      150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);

  /* ── Z-Index scale ── */
  --z-base:    1;
  --z-overlay: 100;
  --z-modal:   1000;
  --z-toast:   9999;
}

/* ── Global Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  scroll-behavior: smooth;
}

body {
  min-height: 100dvh;
  overflow-x: hidden;
}

/* ── App Shell ── */
#app {
  max-width: 100%;
  min-height: 100dvh;
  padding-bottom: 72px; /* bottom nav height */
}

/* ── Bottom Navigation ── */
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 64px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: var(--z-overlay);
  padding: 0 var(--space-sm);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  text-decoration: none;
  border: none;
  background: none;
  cursor: pointer;
  transition: background var(--transition);
  color: var(--color-muted);
  font-family: var(--font-sans);
}
.nav-item:hover  { background: var(--color-surface2); }
.nav-item.active { color: var(--color-primary); }
.nav-icon  { font-size: 20px; line-height: 1; }
.nav-label { font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }

/* ── Page transition ── */
.page-enter {
  animation: pageEnter 200ms ease forwards;
}
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: var(--radius-full); }
```

---

## TASK 2: CREATE /src/core/router.js

```javascript
/**
 * Router v4.0 — SupliList
 * Hash-based SPA router. Mounts and unmounts page classes.
 *
 * Usage:
 *   import { Router } from './router.js';
 *   const router = new Router('#app', routes);
 *   router.init();
 *
 * Route definition:
 *   { path: '/home', load: () => import('../pages/home-page.js').then(m => m.default) }
 */

export class Router {
  /**
   * @param {string} containerSelector - CSS selector of the main content container
   * @param {Array<{ path: string, load: () => Promise<Class> }>} routes
   */
  constructor(containerSelector, routes) {
    this._container  = document.querySelector(containerSelector);
    this._routes     = routes;
    this._current    = null; // current page instance
    this._navItems   = null;
  }

  init() {
    // Handle hash changes
    window.addEventListener('hashchange', () => this._resolve());

    // Handle programmatic navigation via EventBus / CustomEvent
    window.addEventListener('sl-navigate', (e) => {
      const route = e.detail?.route;
      if (route) this.navigate(route);
    });

    // Resolve initial route
    this._resolve();
  }

  navigate(path) {
    window.location.hash = path;
  }

  async _resolve() {
    const hash  = window.location.hash.replace('#', '') || '/home';
    // Match dynamic segments: '/supplement/creatina' matches '/supplement/:id'
    const match = this._routes.find(r => this._matchPath(r.path, hash));

    if (!match) {
      this.navigate('/home');
      return;
    }

    // Unmount current page
    if (this._current?.unmount) {
      try { this._current.unmount(); } catch (e) { console.warn('[Router] unmount error:', e); }
    }

    // Clear container
    this._container.innerHTML = '';

    try {
      const PageClass = await match.load();
      this._current   = new PageClass(this._container);

      // Add entrance animation
      this._container.classList.remove('page-enter');
      void this._container.offsetWidth; // force reflow
      this._container.classList.add('page-enter');

      if (this._current.mount) await this._current.mount();
    } catch (err) {
      console.error('[Router] Failed to load page:', err);
      this._container.innerHTML = `
        <div style="padding:40px;text-align:center;color:#888">
          <p style="font-size:32px">⚠️</p>
          <p>Erro ao carregar página. <a href="#/home" style="color:#7C3AED">Voltar</a></p>
        </div>
      `;
    }

    this._updateNavActive(hash);
  }

  _matchPath(pattern, path) {
    if (pattern === path) return true;
    // Support :param segments
    const re = new RegExp('^' + pattern.replace(/:([^/]+)/g, '([^/]+)') + '$');
    return re.test(path);
  }

  _updateNavActive(currentPath) {
    document.querySelectorAll('.nav-item').forEach(el => {
      const href = el.getAttribute('href')?.replace('#', '') || el.dataset.route;
      el.classList.toggle('active', href === currentPath || currentPath.startsWith(href + '/'));
    });
  }
}
```

---

## TASK 3: CREATE /src/app.js

```javascript
/**
 * app.js — SupliList v4.0 Entry Point
 *
 * IMPORT ORDER IS CRITICAL — do not reorder:
 * 1. EventBus   (no deps)
 * 2. StateManager (depends on EventBus)
 * 3. Web Components (depends on nothing, but must be registered before any HTML renders)
 * 4. Router (depends on page modules via dynamic import)
 */

import '../src/css/design-system.css';              // Global tokens + reset
import { eventBus } from './core/event-bus.js';
import sm from './state/state-manager.js';
import './components/web-components.js';            // Registers all custom elements
import { Router } from './core/router.js';

// ── Route definitions (lazy-loaded) ──────────────────────────────────────────

const routes = [
  { path: '/home',         load: () => import('./pages/home-page.js').then(m => m.default) },
  { path: '/list',         load: () => import('./pages/list-page.js').then(m => m.default) },
  { path: '/calculator',   load: () => import('./pages/calculator-page.js').then(m => m.default) },
  { path: '/my-stack',     load: () => import('./pages/my-stack-page.js').then(m => m.default) },
  { path: '/history',      load: () => import('./pages/history-page.js').then(m => m.default) },
  { path: '/supplement/:id', load: () => import('./pages/supplement-detail-page.js').then(m => m.default) },
  { path: '/onboarding',   load: () => import('./pages/onboarding-page.js').then(m => m.default) },
];

// ── Bottom navigation ─────────────────────────────────────────────────────────

function renderBottomNav() {
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Navegação principal');
  nav.innerHTML = `
    <a href="#/home"       class="nav-item" aria-label="Início">
      <span class="nav-icon">🏠</span>
      <span class="nav-label">Início</span>
    </a>
    <a href="#/list"       class="nav-item" aria-label="Catálogo">
      <span class="nav-icon">💊</span>
      <span class="nav-label">Catálogo</span>
    </a>
    <a href="#/my-stack"   class="nav-item" aria-label="Meu Stack">
      <span class="nav-icon">📦</span>
      <span class="nav-label">Stack</span>
    </a>
    <a href="#/calculator" class="nav-item" aria-label="Calculadora">
      <span class="nav-icon">⚗️</span>
      <span class="nav-label">Calc</span>
    </a>
    <a href="#/history"    class="nav-item" aria-label="Histórico">
      <span class="nav-icon">📈</span>
      <span class="nav-label">Histórico</span>
    </a>
  `;
  document.body.appendChild(nav);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function bootstrap() {
  renderBottomNav();

  const router = new Router('#app', routes);
  router.init();

  // Redirect to onboarding if first time
  if (!sm.state.user.onboardingComplete && !window.location.hash.includes('onboarding')) {
    router.navigate('/onboarding');
  }

  if (import.meta.env?.DEV) {
    window.__sl = { sm, eventBus, router }; // debug handle
    console.log('✅ SupliList v4.0 bootstrapped');
  }
}

bootstrap();
```

---

## TASK 4: CREATE /index.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0A0A0A">
  <meta name="description" content="SupliList — O sistema operacional da sua suplementação">

  <title>SupliList v4.0</title>

  <!-- PWA -->
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/assets/icon-192.png">

  <!-- Fonts (display=swap for performance) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

  <!-- Entry point (type=module for ES6 imports) -->
  <script type="module" src="/src/app.js"></script>
</head>
<body>
  <main id="app" role="main" aria-live="polite"></main>
  <!-- Bottom nav injected by app.js -->
  <!-- Toast notification injected by web-components.js -->
  <noscript>
    <p style="padding:40px;text-align:center;color:#888">
      SupliList requer JavaScript para funcionar.
    </p>
  </noscript>
</body>
</html>
```

---

## VALIDATION CHECKLIST

- [ ] `design-system.css` has all tokens: colors, fonts, spacing, radius, shadows, z-index
- [ ] `Router` mounts page on hash change
- [ ] `Router` unmounts previous page before mounting next
- [ ] `Router` listens to `sl-navigate` window event
- [ ] Navigating to unknown hash redirects to `/home`
- [ ] `app.js` imports in correct order: EventBus → StateManager → WebComponents → Router
- [ ] Bottom nav `active` class updates on route change
- [ ] `index.html` has `type="module"` on script tag
- [ ] New users are redirected to `/onboarding` on first load

## FILES TO DELIVER

1. `/src/css/design-system.css`
2. `/src/core/router.js`
3. `/src/app.js`
4. `/index.html`
```

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

## DESIGN TOKENS — SINGLE SOURCE OF TRUTH

The `design-system.css` file (created in Prompt 3.0) is the master reference for all
token values. Because Shadow DOM does NOT automatically inherit CSS custom properties
declared on `:root` for non-inherited properties, `SupliBase._baseStyles` must re-declare
them on `:host` using the SAME values as `design-system.css`.

**Rule:** If you ever change a token value, change it in BOTH files simultaneously.
Never introduce new token values inside a component — add them to `design-system.css` first.

---

## TASK 1: CREATE /src/components/web-components.js

```javascript
/**
 * SupliList Web Components Library v4.0
 * 10 Custom Elements — Zero frameworks, Shadow DOM, ARIA-ready
 *
 * Import order requirement: this file must be imported AFTER event-bus.js
 * and state-manager.js in app.js. The global window.toast helper it creates
 * depends on the DOM being ready.
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

  /**
   * Design tokens mirrored from /src/css/design-system.css.
   * IMPORTANT: if you change a value here, change it in design-system.css too.
   * These are declared on :host so Shadow DOM components can use them.
   */
  get _baseStyles() {
    return `
      <style>
        :host { display: block; box-sizing: border-box; }
        *, *::before, *::after { box-sizing: inherit; }

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
    this.dispatchEvent(new CustomEvent(eventName, {
      detail, bubbles: true, composed: true
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. <supplement-card>
//    Attrs: id, name, category, evidence, price, cost-per-dose, favorited, in-stack
//    Events: sl-favorite  → { id: string, favorited: boolean }
//            sl-add-stack → { id: string, name: string }
//            sl-view-detail → { id: string, name: string }
// ═══════════════════════════════════════════════════════════════════════════════

[Keep full SupplementCard implementation exactly as written in the original prompt,
including all styles, _render(), click delegation, and customElements.define().]

// ═══════════════════════════════════════════════════════════════════════════════
// 2. <checkin-button>
//    Attrs: supplement-id, supplement-name, checked, timestamp
//    Events: sl-checkin → { supplementId: string, supplementName: string, checked: boolean, timestamp: number }
// ═══════════════════════════════════════════════════════════════════════════════

[Keep full CheckinButton implementation exactly as written in the original prompt.]

// ═══════════════════════════════════════════════════════════════════════════════
// 3. <streak-counter>
//    Attrs: count, record
//    No events emitted
// ═══════════════════════════════════════════════════════════════════════════════

[Keep full StreakCounter implementation exactly as written in the original prompt.]

// ═══════════════════════════════════════════════════════════════════════════════
// 4. <price-badge>
//    Attrs: price, original-price, cost-per-dose, currency
//    No events emitted
// ═══════════════════════════════════════════════════════════════════════════════

[Keep full PriceBadge implementation exactly as written in the original prompt.]

// ═══════════════════════════════════════════════════════════════════════════════
// 5. <toast-notification>
//    Attrs: message, type (success|error|info|warning), duration
//    Methods: show(message, type, duration), hide()
//    Events: sl-toast-closed → {}
// ═══════════════════════════════════════════════════════════════════════════════

[Keep full ToastNotification implementation exactly as written in the original prompt,
INCLUDING disconnectedCallback that clears the timer.]

// ═══════════════════════════════════════════════════════════════════════════════
// 6. <search-bar>
//    Attrs: placeholder, value
//    Events: sl-search → { query: string }  (debounced 300ms)
//            sl-clear  → {}
// ═══════════════════════════════════════════════════════════════════════════════

[Keep full SearchBar implementation exactly as written in the original prompt.]

// ═══════════════════════════════════════════════════════════════════════════════
// 7. <modal-dialog>
//    Attrs: open, title
//    Slots: default (body), footer
//    Methods: open(), close()
//    Events: sl-close → {}
// ═══════════════════════════════════════════════════════════════════════════════

IMPORTANT BUG FIX vs original: The Escape key listener MUST be added in
connectedCallback and removed in disconnectedCallback — NOT inside _render()
with { once: true }. The { once: true } pattern causes the listener to vanish
after the first keypress, breaking Escape on every subsequent modal open.

Implement it like this:

class ModalDialog extends SupliBase {
  connectedCallback() {
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this.boolAttr('open')) this.close();
    };
    document.addEventListener('keydown', this._escHandler);
    this._render();
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._escHandler);
  }

  static get observedAttributes() { return ['open', 'title']; }
  attributeChangedCallback() { this._render(); }

  open()  { this.setAttribute('open', ''); }
  close() { this.removeAttribute('open'); this.emit('sl-close'); }

  _render() {
    // ... full render implementation as in original, but WITHOUT any
    // document.addEventListener('keydown', ...) call inside _render()
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. <bottom-sheet>
//    Attrs: open, title
//    Events: sl-close → {}
// ═══════════════════════════════════════════════════════════════════════════════

[Keep full BottomSheet implementation exactly as written in the original prompt.]

// ═══════════════════════════════════════════════════════════════════════════════
// 9. <stat-card>
//    Attrs: label, value, unit, color, trend (up|down|neutral)
//    No events emitted
// ═══════════════════════════════════════════════════════════════════════════════

[Keep full StatCard implementation exactly as written in the original prompt.]

// ═══════════════════════════════════════════════════════════════════════════════
// 10. <evidence-pill>
//     Attrs: level (A|B|C|D)
//     No events emitted
// ═══════════════════════════════════════════════════════════════════════════════

[Keep full EvidencePill implementation exactly as written in the original prompt.]

// ─── Global Toast Helper ───────────────────────────────────────────────────────
// window.toast is set up here. app.js imports this file before any Page module,
// so window.toast is always available when pages try to call it.

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
- [ ] Clicking ♥ on `<supplement-card>` emits `sl-favorite` with `{ id, favorited }`
- [ ] `<checkin-button>` toggles state on click + emits `sl-checkin`
- [ ] `<streak-counter count="30">` renders 30 with flame animation
- [ ] `<toast-notification>` appears then auto-dismisses after `duration` ms
- [ ] `<search-bar>` fires `sl-search` only after 300ms debounce
- [ ] `<modal-dialog open>` shows overlay; pressing Escape closes it
- [ ] `<modal-dialog>` opened a SECOND time — Escape still closes it (regression test)
- [ ] `<bottom-sheet open>` slides up from bottom
- [ ] `window.toast('msg', 'success')` works from console
- [ ] All components pass ARIA checks (role, aria-label present)
- [ ] No Shadow DOM style leaks (verify with DevTools)
- [ ] Token values in `_baseStyles` match values in `design-system.css` (spot-check 3 tokens)

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

## DEPENDENCIES

- StateManager: `import sm, { ACTIONS } from '../state/state-manager.js'`
- DosageCalculator: `import DosageCalculator from '../ai/dosage-calculator.js'`

IMPORTANT — DosageCalculator is a SINGLETON instance (exported as
`export default new DosageCalculator()`). Always call it as:
  `DosageCalculator.calculate(supp, userProfile)` — instance method call.
NOT as `DosageCalculator.calculate(...)` on the class constructor.
If you import it as `import DosageCalculator from '...'`, it IS the instance,
so `DosageCalculator.calculate()` is correct. Never call `new DosageCalculator()`.

## NAVIGATION

The HomePage uses hash links (`href="#/list"`) for CTAs. It also emits
`window.dispatchEvent(new CustomEvent('sl-navigate', { detail: { route } }))` for
programmatic navigation. The Router (created in 3.0) intercepts both.

---

## TASK 1: CREATE /src/pages/home-page.js

[Implement the full HomePage class as written in the original prompt, with:
- mount() / unmount() lifecycle
- _render() with full HTML template (header, streak section, checkin section,
  stats grid, CTA grid)
- Partial updates: _updateCheckinSection() (does NOT full re-render),
  _updateStackSection() (triggers full re-render because items changed)
- _attachListeners(): sl-checkin handler, confirm-all-checkin handler,
  notifications handler
- _attachStyles(): injects <style> tag into document.head (idempotent)
- Helpers: _calcAdherence(), _getStreakRecord(), _calcMonthlyInvestment(),
  _celebrate() (CSS confetti)

Keep ALL implementation details from the original prompt exactly as written.]

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
- [ ] `DosageCalculator.calculate()` is called on the imported singleton instance,
     not on the class constructor

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
1. Fuse.js for fuzzy search (pre-indexed, loaded via CDN ESM)
2. DocumentFragment batch insertion (no per-item reflow)
3. IntersectionObserver for infinite scroll (24 items per load)
4. Debounced search (300ms)

## FUSE.JS — USAGE AUTHORIZATION

Fuse.js is EXPLICITLY AUTHORIZED for this prompt only. It is a zero-dependency
fuzzy-search library (~24KB) imported via CDN ESM — no npm install, no package.json
changes. Import it like this:

```javascript
let Fuse;
async function loadFuse() {
  if (Fuse) return Fuse;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/fuse.js@7/dist/fuse.mjs');
    Fuse = mod.default;
    return Fuse;
  } catch (err) {
    console.warn('[ListPage] Fuse.js unavailable (offline?), falling back to simple search');
    // Offline fallback: simple normalized includes()
    Fuse = null;
    return null;
  }
}
```

OFFLINE FALLBACK: If `loadFuse()` returns null (CDN unreachable), the search must
fall back to a simple implementation:

```javascript
_simpleFuzzySearch(query, items) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return items.filter(item => {
    const name = (item.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return name.includes(q);
  });
}
```

This ensures "omega" still finds "Ômega-3" offline.

## DEPENDENCIES

- StateManager: `import sm, { ACTIONS } from '../state/state-manager.js'`
- Web Components: already registered globally via app.js import order

## NAVIGATION

When a card emits `sl-view-detail`, dispatch:
```javascript
window.dispatchEvent(new CustomEvent('sl-navigate', {
  detail: { route: `/supplement/${id}` }
}));
```

---

## TASK 1: CREATE /src/pages/list-page.js

[Implement the full ListPage class as written in the original prompt, incorporating
the Fuse.js loading pattern above. Key methods:
- async mount(): _render() → _loadData() → _initFuseSearch() → _initInfiniteScroll()
  → _attachListeners() → sm.subscribe()
- unmount(): unsubscribe + observer.disconnect()
- _loadData(): load from sm.state.supplements or fetch /data/supplements-db.json
- _initFuseSearch(): await loadFuse(), configure with keys ['name','category'],
  threshold 0.35. If Fuse unavailable, set this._fuse = null.
- _applyFilters(): if this._fuse available use fuse.search(), else use
  _simpleFuzzySearch(). Then apply objective/evidence/category filters on top.
- _renderGrid(): use DocumentFragment, reset page to 0, render first PAGE_SIZE items
- _loadMore(): append next PAGE_SIZE items
- _initInfiniteScroll(): IntersectionObserver on a sentinel div at bottom of grid
- _refreshCardStates(): update favorited/in-stack attrs without full re-render
- _attachListeners(): sl-search, sl-clear, filter selects, sl-favorite,
  sl-add-stack, sl-view-detail

Keep ALL implementation details from the original prompt, replacing only the
Fuse.js initialization with the pattern above.]

---

## VALIDATION CHECKLIST

- [ ] 500 supplements render in <200ms (measure with `performance.now()`)
- [ ] Typing "cretina" finds "Creatina Monohidratada" (fuzzy, Fuse.js, threshold 0.35)
- [ ] Typing "ashwa" finds "Ashwagandha"
- [ ] Typing "omega" finds "Ômega-3" (accent-insensitive)
- [ ] With CDN blocked (offline), fallback search still finds "omega" → "Ômega-3"
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
- [ ] sl-view-detail dispatches `sl-navigate` with `/supplement/:id`

## FILES TO DELIVER

1. `/src/pages/list-page.js`
```

---

## 📋 CONTRATOS DE EVENTOS (referência para sprints futuros)

Esta seção documenta todos os Custom Events emitidos pelos Web Components do Sprint 3.
Consulte ao implementar páginas que consumam esses componentes.

| Evento | Emitido por | Payload | Descrição |
|---|---|---|---|
| `sl-favorite` | `<supplement-card>` | `{ id: string, favorited: boolean }` | Usuário clicou no botão de favorito |
| `sl-add-stack` | `<supplement-card>` | `{ id: string, name: string }` | Usuário clicou em adicionar/remover do stack |
| `sl-view-detail` | `<supplement-card>` | `{ id: string, name: string }` | Usuário clicou em "Ver detalhes" |
| `sl-checkin` | `<checkin-button>` | `{ supplementId: string, supplementName: string, checked: boolean, timestamp: number }` | Usuário marcou/desmarcou check-in |
| `sl-toast-closed` | `<toast-notification>` | `{}` | Toast foi fechado (auto ou manual) |
| `sl-search` | `<search-bar>` | `{ query: string }` | Query de busca (debounced 300ms) |
| `sl-clear` | `<search-bar>` | `{}` | Campo de busca limpo |
| `sl-close` | `<modal-dialog>` | `{}` | Modal fechado |
| `sl-close` | `<bottom-sheet>` | `{}` | Bottom sheet fechado |
| `sl-navigate` | Pages (window) | `{ route: string }` | Navegação programática (capturado pelo Router) |

Todos os eventos têm `bubbles: true` e `composed: true` (atravessam Shadow DOM boundaries).

---

## 📊 RESUMO DO SPRINT 3 (ATUALIZADO)

| Prompt | Arquivos | Destaques |
|--------|----------|-----------|
| 3.0 | `design-system.css`, `router.js`, `app.js`, `index.html` | Single source of truth de tokens, hash router, bootstrap com ordem de importação correta |
| 3.1 | `web-components.js`, `web-components.test.html` | 10 Custom Elements, Escape bug corrigido, tokens sincronizados com design-system.css |
| 3.2 | `home-page.js` | Dashboard com partial updates, confetti, DosageCalculator como singleton |
| 3.3 | `list-page.js` | Fuse.js autorizado + fallback offline, infinite scroll, 4-col grid |

**Após completar o Sprint 3:**
- Fundação visual com single source of truth para tokens ✅
- Navegação hash-based funcionando end-to-end ✅
- 10 componentes reutilizáveis testados ✅
- Dashboard pessoal funcional com check-in ✅
- Catálogo de 500+ suplementos pesquisável com fallback offline ✅

**Próximo:** Sprint 4 — Calculadora interativa + MyStack + Histórico com gráficos
