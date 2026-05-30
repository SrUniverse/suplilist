# App Shell Redesign — Design Spec

**Sprint:** 1 de N (fundação — todos os outros sprints dependem deste)

**Goal:** Substituir a navegação hardcoded por um sistema data-driven (NAV_CONFIG) que renderiza sidebar desktop, bottom nav mobile e topbar mobile a partir de uma única fonte de verdade. O resultado visual segue os reference designs em `assets/visuais/`.

---

## 1. Visão Geral da Arquitetura

### Problema atual

- Navegação hardcoded em HTML (`index.html`) com 9 botões `data-route`
- Adicionar nova rota = editar HTML manualmente, duplicar SVG, risco de inconsistência
- Sidebar e bottom nav (inexistente) sem relação estrutural
- Grid `body` tem topbar como área separada — incompatível com o novo design

### Solução

Um novo módulo `src/core/nav.js` declara **NAV_CONFIG** como fonte única de verdade e expõe uma classe `Nav` que:
- Renderiza a sidebar desktop via `#sidebar-nav`
- Renderiza o bottom nav mobile via `#bottom-nav`
- Gerencia active states, badges e landing mode
- Integra com `app.js` e `router.js` via eventos

Adicionar nova rota no futuro = **1 linha no NAV_CONFIG**. Nada mais muda.

---

## 2. Arquivos Modificados / Criados

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/core/nav.js` | **Criar** | NAV_CONFIG + classe Nav completa |
| `index.html` | **Modificar** | Grid body, `#sidebar-nav` (vazio), `#bottom-nav` (novo), `#mobile-topbar` (novo), remover scripts sidebar-toggle |
| `src/core/app.js` | **Modificar** | Import Nav, Nav.init(), remover listeners `[data-route]`, integrar theme toggle |
| `src/core/router.js` | **Modificar** | Chamar `Nav.updateActive()` após cada mount |

---

## 3. NAV_CONFIG — Estrutura Completa

```js
// src/core/nav.js

export const NAV_CONFIG = [
  {
    group: null,  // sem label — item isolado no topo
    items: [
      {
        id: 'home',
        path: '/',
        label: 'Início',
        bottomNav: false,
        icon: {
          outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
          filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
        },
      },
    ],
  },
  {
    group: 'EXPLORAR',
    items: [
      {
        id: 'list',
        path: '/list',
        label: 'Lista',
        bottomNav: true,
        bottomOrder: 0,
        icon: {
          outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
          filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
        },
      },
    ],
  },
  {
    group: 'MEU PROTOCOLO',
    items: [
      {
        id: 'my-stack',
        path: '/my-stack',
        label: 'Meu Stack',
        bottomNav: true,
        bottomOrder: 1,
        icon: {
          outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/></svg>`,
          filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5"/></svg>`,
        },
      },
      {
        id: 'checkin',
        path: '/checkin',
        label: 'Check-in',
        bottomNav: true,
        bottomOrder: 2,
        featured: true,  // tab central elevado no bottom nav
        badge: false,    // atualizado em runtime por Nav.setBadge()
        icon: {
          outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
          filled:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"/></svg>`,
        },
      },
      {
        id: 'favorites',
        path: '/favorites',
        label: 'Favoritos',
        bottomNav: true,
        bottomOrder: 3,
        icon: {
          outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
          filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
        },
      },
      {
        id: 'history',
        path: '/history',
        label: 'Histórico',
        bottomNav: true,
        bottomOrder: 4,
        icon: {
          outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
          filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg>`,
        },
      },
      {
        id: 'dosage',
        path: '/dosage',
        label: 'Calculadora',
        bottomNav: false,
        icon: {
          outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>`,
          filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>`,
        },
      },
    ],
  },
  {
    group: 'SUPORTE',
    items: [
      {
        id: 'profile',
        path: '/profile',
        label: 'Perfil',
        bottomNav: false,
        icon: {
          outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
          filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 12c2.7 0 4-1.3 4-4s-1.3-4-4-4-4 1.3-4 4 1.3 4 4 4zm0 2c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z"/></svg>`,
        },
      },
      {
        id: 'faq',
        path: '/faq',
        label: 'FAQ',
        bottomNav: false,
        icon: {
          outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
          filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>`,
        },
      },
      {
        id: 'settings',
        path: '/settings',
        label: 'Config',
        bottomNav: false,
        icon: {
          outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9z"/></svg>`,
          filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.07 7.07 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54a7.07 7.07 0 0 0-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54a7.07 7.07 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/></svg>`,
        },
      },
    ],
  },
];
```

---

## 4. Classe Nav — API Pública

```js
export class Nav {
  static init()                    // renderiza sidebar + bottom nav + mobile topbar no DOM
  static updateActive(pathname)    // atualiza active state — chamado por router.js após mount
  static setBadge(itemId, visible) // mostra/esconde badge num item ('checkin', true/false)
  static hide()                    // oculta toda a navegação (landing mode)
  static show()                    // restaura navegação (saindo do landing)
  static _hasCheckinToday()        // privado — lê stateManager.checkins, retorna boolean
}
```

**Regras de active state:**
- Matching por `window.location.pathname` apenas (ignora query string)
- `/` e `/home` → item `home` ativo
- `/list?objective=Hipertrofia` → item `list` ativo
- Rotas sem match no NAV_CONFIG → nenhum item ativo

---

## 5. HTML — Mudanças em `index.html`

### Remover
- Todo o conteúdo interno de `<nav id="sidebar-nav">` (os 9 botões hardcoded)
- O `<script>` inline do sidebar-toggle
- `<header id="topbar">` (substituído por `#mobile-topbar`)

### Adicionar

```html
<!-- Mobile topbar — visível apenas em mobile (<860px), fixed top -->
<header id="mobile-topbar" role="banner" aria-label="Topo mobile">
  <span class="mt-logo">SupliList</span>
  <div class="mt-actions">
    <button id="btn-theme-mobile" class="mt-icon-btn" aria-label="Alternar tema">
      <!-- SVG sol/lua injetado por Nav.init() -->
    </button>
    <button class="mt-icon-btn" data-nav="/profile" aria-label="Perfil">
      <div class="mt-avatar">S</div>
    </button>
  </div>
</header>

<!-- Sidebar — conteúdo injetado por Nav.init() -->
<nav id="sidebar-nav" role="navigation" aria-label="Navegação principal"></nav>

<!-- Router outlet — inalterado -->
<main id="router-outlet" role="main" aria-live="polite"></main>

<!-- Bottom nav — conteúdo injetado por Nav.init(), visível apenas mobile -->
<nav id="bottom-nav" role="navigation" aria-label="Navegação principal mobile"></nav>
```

---

## 6. Layout CSS — `body` Grid

### Desktop (≥860px)
```css
body {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 1fr;
  grid-template-areas: "sidebar main";
  height: 100dvh;
}

#mobile-topbar { display: none; }
#bottom-nav    { display: none; }
#sidebar-nav   { grid-area: sidebar; }
#router-outlet { grid-area: main; }
```

### Mobile (<860px)
```css
@media (max-width: 859px) {
  body {
    display: block;
    height: 100dvh;
    overflow: hidden;
  }

  #sidebar-nav { display: none; }

  #mobile-topbar {
    display: flex;
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 52px;
    padding-top: env(safe-area-inset-top);
    z-index: 200;
  }

  #router-outlet {
    position: fixed;
    top: calc(52px + env(safe-area-inset-top));
    bottom: calc(64px + env(safe-area-inset-bottom));
    left: 0; right: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  #bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: calc(64px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 200;
  }
}

/* Landing mode: esconde TUDO */
body.body--landing #sidebar-nav,
body.body--landing #mobile-topbar,
body.body--landing #bottom-nav { display: none !important; }
```

---

## 7. Sidebar Desktop — Visual

### Estrutura injetada por `Nav.init()`

```html
<div class="sb-inner">

  <!-- Header -->
  <div class="sb-header">
    <span class="sb-logo">SupliList</span>
    <span class="sb-subtitle"><!-- dinâmico: lê objetivo do profile state --></span>
  </div>

  <!-- Nav groups (scrollável) -->
  <div class="sb-nav">
    <!-- Grupo sem label -->
    <button class="sb-item" data-nav-id="home" aria-current="false">
      <span class="sb-item__icon"><!-- SVG outlined/filled --></span>
      <span class="sb-item__label">Início</span>
    </button>

    <!-- Grupo com label -->
    <div class="sb-group">
      <span class="sb-group__label">EXPLORAR</span>
      <button class="sb-item" data-nav-id="list" ...>...</button>
    </div>

    <div class="sb-group">
      <span class="sb-group__label">MEU PROTOCOLO</span>
      <button class="sb-item" data-nav-id="checkin" ...>
        <span class="sb-item__icon">...</span>
        <span class="sb-item__label">Check-in</span>
        <span class="sb-badge" hidden>●</span>
      </button>
      ...
    </div>
  </div>

  <!-- Footer fixo -->
  <div class="sb-footer">
    <button id="btn-theme" class="sb-theme-btn" aria-label="Alternar tema">
      <!-- SVG tema -->
    </button>
    <!-- + Adicionar ao Stack -->
    <button class="sb-fab" data-nav-id="fab-stack">
      <svg><!-- ícone + --></svg>
      Adicionar ao Stack
    </button>
  </div>

</div>
```

### CSS — Sidebar

```css
#sidebar-nav {
  background: var(--color-surface-primary);  /* #111 — ligeiramente mais escuro que o conteúdo */
  border-right: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sb-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 12px 16px;
}

.sb-header {
  padding: 4px 8px 20px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 12px;
}

.sb-logo {
  display: block;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: var(--color-brand);
  margin-bottom: 2px;
}

.sb-subtitle {
  display: block;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.sb-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  /* scrollbar invisível */
  scrollbar-width: none;
}
.sb-nav::-webkit-scrollbar { display: none; }

.sb-group { margin-top: 16px; }

.sb-group__label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  padding: 0 10px 6px;
  text-transform: uppercase;
}

.sb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: background 0.15s ease, color 0.15s ease;
}

.sb-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.sb-item[aria-current="true"],
.sb-item.is-active {
  background: var(--color-brand-muted);
  color: var(--color-text-primary);
  font-weight: 600;
}

/* borda esquerda ativa */
.sb-item.is-active::before {
  content: '';
  position: absolute;
  left: 0; top: 6px; bottom: 6px;
  width: 2px;
  border-radius: 0 2px 2px 0;
  background: var(--color-brand);
}

.sb-item__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sb-badge {
  margin-left: auto;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-brand);
}

.sb-footer {
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sb-theme-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
  width: 100%;
}
.sb-theme-btn:hover { background: var(--color-surface-hover); }

.sb-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px 16px;
  border-radius: 10px;
  border: none;
  background: var(--color-brand);
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;
}
.sb-fab:hover { background: var(--color-brand-hover); }
.sb-fab:active { transform: scale(0.98); }
```

---

## 8. Bottom Nav Mobile — Visual

### CSS

```css
#bottom-nav {
  background: rgba(8, 8, 8, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--color-border);
  align-items: center;
  justify-content: space-around;
  /* fade acima da barra */
  box-shadow: 0 -40px 40px -10px rgba(8, 8, 8, 0.7);
  transition: transform 0.25s ease;
}

/* Auto-hide ao scrollar para baixo */
#bottom-nav.bn--hidden {
  transform: translateY(100%);
}

.bn-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  padding: 8px 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #555;
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 500;
  transition: color 0.15s ease;
  min-height: 48px;   /* touch target mínimo */
  position: relative;
}

.bn-item:hover { color: var(--color-text-secondary); }

.bn-item.is-active {
  color: var(--color-brand);
}

/* Tab featured (check-in central) */
.bn-item--featured {
  flex: 0 0 64px;
}
.bn-item--featured .bn-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  margin-bottom: 2px;
  transform: translateY(-8px);  /* elevado acima da barra */
}
.bn-item--featured:active .bn-icon {
  transform: translateY(-6px) scale(0.96);
}
.bn-item--featured.is-active .bn-icon {
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.6);
}

.bn-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bn-label { line-height: 1; }

/* Badge */
.bn-badge {
  position: absolute;
  top: 6px;
  right: calc(50% - 18px);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-brand);
  border: 2px solid var(--color-bg-primary);
}
```

---

## 9. Mobile Topbar — Visual

```css
#mobile-topbar {
  background: rgba(8, 8, 8, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.mt-logo {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: var(--color-brand);
}

.mt-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mt-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
}

.mt-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-brand-muted);
  border: 1px solid var(--color-brand);
  color: var(--color-brand);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## 10. Sidebar Subtitle — Lógica Dinâmica

```js
// Em Nav._getSidebarSubtitle():
function _getSidebarSubtitle() {
  try {
    const profile = stateManager.profile; // ou stateManager.select(s => s.profile)
    const goal = profile?.primaryGoal;
    const map = {
      'Hipertrofia':  'Foco em Hipertrofia',
      'Perda de Peso': 'Foco em Emagrecimento',
      'Performance':  'Foco em Performance',
      'Saúde Geral':  'Saúde & Longevidade',
      'Longevidade':  'Foco em Longevidade',
    };
    return map[goal] || 'Suplementação Inteligente';
  } catch {
    return 'Suplementação Inteligente';
  }
}
```

---

## 11. Badge Check-in — Lógica

```js
// Em Nav._hasCheckinToday():
function _hasCheckinToday() {
  try {
    const today = new Date().toDateString();
    return stateManager.checkins.some(c =>
      new Date(c.timestamp).toDateString() === today
    );
  } catch {
    return true; // fail safe: não mostra badge se der erro
  }
}

// Chamado em Nav.init() e atualizado via Nav.setBadge('checkin', true/false)
// A checkin-page.js chama Nav.setBadge('checkin', false) após check-in bem-sucedido
```

---

## 12. Auto-Hide Bottom Nav — Lógica

```js
// Em Nav.init(), após injetar bottom nav:
let lastScrollY = 0;
const outlet = document.getElementById('router-outlet');
const bottomNav = document.getElementById('bottom-nav');

outlet?.addEventListener('scroll', () => {
  const currentY = outlet.scrollTop;
  const isScrollingDown = currentY > lastScrollY && currentY > 60;
  bottomNav?.classList.toggle('bn--hidden', isScrollingDown);
  lastScrollY = currentY;
}, { passive: true });
```

---

## 13. Integração com `app.js` e `router.js`

### app.js (mudanças)
```js
import { Nav } from './nav.js';

// Em DOMContentLoaded:
Nav.init();                         // renderiza tudo
Nav.updateActive(window.location.pathname); // active inicial

// Substituir o popstate listener existente:
window.addEventListener('popstate', () => {
  applyLandingMode();
  updatePageTitle();
  Nav.updateActive(window.location.pathname);
});

// Remover: document.querySelectorAll('[data-route]').forEach(...)
// Nav.init() gerencia seus próprios listeners
```

### router.js (mudanças)
```js
// Após await this.currentPage.mount():
if (typeof Nav !== 'undefined') {
  Nav.updateActive(window.location.pathname);
}
// OU importar Nav diretamente em router.js
```

---

## 14. Acessibilidade

- `aria-current="page"` no item ativo (atualizado por `Nav.updateActive()`)
- `aria-label` em cada botão de navegação
- Touch targets: mínimo 44×44px em todos os itens do bottom nav
- `role="navigation"` com `aria-label` distinto em sidebar e bottom nav
- Focus ring visível (via `focus-visible`)

---

## 15. O que NÃO muda neste sprint

- Conteúdo interno de nenhuma página (`list-page.js`, `favorites-page.js`, etc.)
- Router (`src/core/router.js`) exceto a chamada a `Nav.updateActive()`
- Design system tokens (`src/css/design-system.css`)
- Landing page (`home-page.js`)
- Lógica de estado (`state-manager.js`, `event-bus.js`)

---

## 16. Como adicionar uma nova aba no futuro

```js
// Adicionar ao NAV_CONFIG no grupo correto:
{
  id: 'reports',
  path: '/reports',
  label: 'Relatórios',
  bottomNav: false,  // só aparece na sidebar
  icon: { outlined: '...svg...', filled: '...svg...' },
}

// Adicionar ao array routes em app.js:
{ path: '/reports', load: () => import('../pages/reports-page.js') }

// Adicionar ao PAGE_TITLES em app.js:
'/reports': 'Relatórios | SupliList'
```

**Zero mudanças no HTML. Zero risco de quebrar bottom nav.**
