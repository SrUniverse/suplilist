# App Shell Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a navegação hardcoded por um sistema data-driven (NAV_CONFIG) que renderiza sidebar desktop, bottom nav mobile e mobile topbar a partir de uma única fonte de verdade, seguindo o visual dos reference designs em `assets/visuais/`.

**Architecture:** Um novo módulo `src/core/nav.js` contém o `NAV_CONFIG` e a classe `Nav` que injeta HTML+CSS no DOM para sidebar, bottom nav e mobile topbar. `index.html` é limpo (containers vazios + layout CSS). `app.js` inicializa o Nav. `router.js` chama `Nav.updateActive()` após cada mount. Adicionar nova rota no futuro = 1 linha no `NAV_CONFIG`.

**Tech Stack:** Vanilla JS (sem framework), CSS custom properties (design tokens), `env(safe-area-inset-*)` para notch mobile.

**Spec:** `docs/superpowers/specs/2026-05-30-app-shell-redesign-design.md`

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/core/nav.js` | **Criar** | NAV_CONFIG + classe Nav completa |
| `index.html` | **Modificar** | Layout CSS (grid/fixed), containers vazios, remove hardcoded nav |
| `src/core/app.js` | **Modificar** | Import Nav, init, remove listeners [data-route], theme toggle |
| `src/core/router.js` | **Modificar** | Substituir updateNav() por Nav.updateActive() |

---

## Task 1: Criar `src/core/nav.js`

**Files:**
- Create: `src/core/nav.js`

Este arquivo define o NAV_CONFIG e a classe Nav. É a única fonte de verdade para toda a navegação do app.

- [ ] **Step 1: Criar o arquivo com NAV_CONFIG e classe Nav**

Criar `src/core/nav.js` com o seguinte conteúdo completo:

```js
// ============================================================
// nav.js — Sistema de navegação data-driven
// Fonte única de verdade para sidebar desktop e bottom nav mobile.
// Adicionar nova rota = 1 objeto no NAV_CONFIG abaixo.
// ============================================================

import { stateManager } from '../state/state-manager.js';

// ── SVG helpers ─────────────────────────────────────────────
const ICONS = {
  home: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
  },
  list: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  },
  stack: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/></svg>`,
    filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5"/></svg>`,
  },
  checkin: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    filled:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"/></svg>`,
  },
  favorites: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  },
  history: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05L6.64 18.36A8.955 8.955 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`,
  },
  dosage: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>`,
    filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>`,
  },
  profile: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 12c2.7 0 4-1.3 4-4s-1.3-4-4-4-4 1.3-4 4 1.3 4 4 4zm0 2c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z"/></svg>`,
  },
  faq: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>`,
  },
  settings: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9z"/></svg>`,
    filled:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.07 7.07 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.6.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/></svg>`,
  },
  theme: {
    sun:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  },
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
};

// ── NAV_CONFIG ───────────────────────────────────────────────
// Fonte única de verdade para toda a navegação.
// bottomNav: true  → aparece no bottom nav mobile
// bottomOrder: N   → posição no bottom nav (0 = esquerda)
// featured: true   → tab central elevada (só 1 item deve ter isso)
//
// Para adicionar nova rota:
//   1. Adicione um objeto aqui com bottomNav: false
//   2. Adicione a rota em app.js (routes array)
//   3. Adicione o título em app.js (PAGE_TITLES)
export const NAV_CONFIG = [
  {
    group: null,
    items: [
      { id: 'home', path: '/', label: 'Início', bottomNav: false, icon: ICONS.home },
    ],
  },
  {
    group: 'EXPLORAR',
    items: [
      { id: 'list', path: '/list', label: 'Lista', bottomNav: true, bottomOrder: 0, icon: ICONS.list },
    ],
  },
  {
    group: 'MEU PROTOCOLO',
    items: [
      { id: 'my-stack',  path: '/my-stack',   label: 'Stack',      bottomNav: true, bottomOrder: 1, icon: ICONS.stack },
      { id: 'checkin',   path: '/checkin',     label: 'Check-in',   bottomNav: true, bottomOrder: 2, featured: true, icon: ICONS.checkin },
      { id: 'favorites', path: '/favorites',   label: 'Favoritos',  bottomNav: true, bottomOrder: 3, icon: ICONS.favorites },
      { id: 'history',   path: '/history',     label: 'Histórico',  bottomNav: true, bottomOrder: 4, icon: ICONS.history },
      { id: 'dosage',    path: '/dosage',      label: 'Calculadora', bottomNav: false, icon: ICONS.dosage },
    ],
  },
  {
    group: 'SUPORTE',
    items: [
      { id: 'profile',  path: '/profile',  label: 'Perfil',  bottomNav: false, icon: ICONS.profile },
      { id: 'faq',      path: '/faq',      label: 'FAQ',     bottomNav: false, icon: ICONS.faq },
      { id: 'settings', path: '/settings', label: 'Config',  bottomNav: false, icon: ICONS.settings },
    ],
  },
];

// ── Classe Nav ───────────────────────────────────────────────
export class Nav {
  static _styleInjected = false;
  static _badgeStates = {};   // { itemId: boolean }
  static _scrollHandler = null;
  static _clickHandler = null;

  // ── Inicialização ─────────────────────────────────────────
  static init() {
    Nav._injectStyles();
    Nav._renderSidebar();
    Nav._renderBottomNav();
    Nav._renderMobileTopbar();
    Nav._setupClickDelegation();
    Nav._setupScrollAutoHide();
    // Badge check-in inicial
    if (!Nav._hasCheckinToday()) {
      Nav.setBadge('checkin', true);
    }
  }

  // ── Active state ─────────────────────────────────────────
  static updateActive(pathname) {
    const currentPath = pathname.split('?')[0] || '/';
    // Normaliza: /home → /
    const normalized = currentPath === '/home' ? '/' : currentPath;

    // Sidebar
    document.querySelectorAll('.sb-item').forEach(el => {
      const itemPath = el.dataset.navPath;
      const isActive = itemPath === normalized ||
        (normalized === '/' && itemPath === '/');
      el.classList.toggle('is-active', isActive);
      el.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Bottom nav
    document.querySelectorAll('.bn-item').forEach(el => {
      const itemPath = el.dataset.navPath;
      const isActive = itemPath === normalized;
      el.classList.toggle('is-active', isActive);
      el.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  // ── Badge ────────────────────────────────────────────────
  static setBadge(itemId, visible) {
    Nav._badgeStates[itemId] = visible;
    // Sidebar
    const sbBadge = document.querySelector(`.sb-item[data-nav-id="${itemId}"] .sb-badge`);
    if (sbBadge) sbBadge.hidden = !visible;
    // Bottom nav
    const bnBadge = document.querySelector(`.bn-item[data-nav-id="${itemId}"] .bn-badge`);
    if (bnBadge) bnBadge.hidden = !visible;
  }

  // ── Landing mode ─────────────────────────────────────────
  static hide() {
    document.getElementById('sidebar-nav')?.style.setProperty('display', 'none', 'important');
    document.getElementById('bottom-nav')?.style.setProperty('display', 'none', 'important');
    document.getElementById('mobile-topbar')?.style.setProperty('display', 'none', 'important');
  }

  static show() {
    document.getElementById('sidebar-nav')?.style.removeProperty('display');
    document.getElementById('bottom-nav')?.style.removeProperty('display');
    document.getElementById('mobile-topbar')?.style.removeProperty('display');
  }

  // ── Private: render sidebar ───────────────────────────────
  static _renderSidebar() {
    const sidebar = document.getElementById('sidebar-nav');
    if (!sidebar) return;
    const subtitle = Nav._getSidebarSubtitle();
    const themeIcon = Nav._getThemeIcon();

    const groupsHtml = NAV_CONFIG.map(({ group, items }) => {
      const itemsHtml = items.map(item => `
        <button class="sb-item" data-nav-id="${item.id}" data-nav-path="${item.path}"
          aria-label="${item.label}" aria-current="false">
          <span class="sb-item__icon">${item.icon.outlined}</span>
          <span class="sb-item__label">${item.label}</span>
          ${item.badge !== undefined ? `<span class="sb-badge" hidden aria-label="Ação pendente"></span>` : ''}
          ${item.id === 'checkin' ? `<span class="sb-badge" hidden aria-label="Check-in pendente"></span>` : ''}
        </button>`).join('');

      if (!group) return itemsHtml;

      return `
        <div class="sb-group">
          <span class="sb-group__label">${group}</span>
          ${itemsHtml}
        </div>`;
    }).join('');

    sidebar.innerHTML = `
      <div class="sb-inner">
        <div class="sb-header">
          <span class="sb-logo">SupliList</span>
          <span class="sb-subtitle">${subtitle}</span>
        </div>
        <div class="sb-nav">
          ${groupsHtml}
        </div>
        <div class="sb-footer">
          <button id="btn-theme" class="sb-theme-btn" aria-label="Alternar tema claro/escuro">
            <span class="sb-item__icon">${themeIcon}</span>
            <span>Alternar Tema</span>
          </button>
          <button class="sb-fab" data-nav-path="/my-stack" aria-label="Adicionar ao Meu Stack">
            ${ICONS.plus}
            Adicionar ao Stack
          </button>
        </div>
      </div>`;
  }

  // ── Private: render bottom nav ────────────────────────────
  static _renderBottomNav() {
    const bn = document.getElementById('bottom-nav');
    if (!bn) return;

    const bottomItems = NAV_CONFIG
      .flatMap(g => g.items)
      .filter(i => i.bottomNav)
      .sort((a, b) => a.bottomOrder - b.bottomOrder);

    const itemsHtml = bottomItems.map(item => {
      const featured = item.featured ? 'bn-item--featured' : '';
      const icon = item.featured ? item.icon.filled : item.icon.outlined;
      const iconSize = item.featured ? 24 : 22;
      return `
        <button class="bn-item ${featured}" data-nav-id="${item.id}" data-nav-path="${item.path}"
          aria-label="${item.label}" aria-current="false">
          <span class="bn-icon" style="${item.featured ? '' : `width:${iconSize}px;height:${iconSize}px`}">${icon}</span>
          ${!item.featured ? `<span class="bn-label">${item.label}</span>` : ''}
          ${item.id === 'checkin' ? `<span class="bn-badge" hidden aria-label="Check-in pendente"></span>` : ''}
        </button>`;
    }).join('');

    bn.innerHTML = itemsHtml;
  }

  // ── Private: render mobile topbar content ─────────────────
  static _renderMobileTopbar() {
    const mt = document.getElementById('mobile-topbar');
    if (!mt) return;
    const themeIcon = Nav._getThemeIcon();
    mt.innerHTML = `
      <span class="mt-logo">SupliList</span>
      <div class="mt-actions">
        <button id="btn-theme-mobile" class="mt-icon-btn" aria-label="Alternar tema">
          ${themeIcon}
        </button>
        <button class="mt-icon-btn" data-nav-path="/profile" aria-label="Meu Perfil">
          <div class="mt-avatar">S</div>
        </button>
      </div>`;
  }

  // ── Private: click delegation ─────────────────────────────
  static _setupClickDelegation() {
    Nav._clickHandler = (e) => {
      const btn = e.target.closest('[data-nav-path]');
      if (!btn) return;
      e.preventDefault();
      const path = btn.getAttribute('data-nav-path');
      if (path) {
        window.history.pushState(null, null, path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    };
    document.addEventListener('click', Nav._clickHandler);
  }

  // ── Private: auto-hide bottom nav on scroll ───────────────
  static _setupScrollAutoHide() {
    const outlet = document.getElementById('router-outlet');
    const bn = document.getElementById('bottom-nav');
    if (!outlet || !bn) return;

    let lastScrollY = 0;
    Nav._scrollHandler = () => {
      const y = outlet.scrollTop;
      const scrollingDown = y > lastScrollY && y > 80;
      bn.classList.toggle('bn--hidden', scrollingDown);
      lastScrollY = y;
    };
    outlet.addEventListener('scroll', Nav._scrollHandler, { passive: true });
  }

  // ── Private: helpers ──────────────────────────────────────
  static _getSidebarSubtitle() {
    try {
      const profile = stateManager.profile || stateManager.select?.(s => s.profile);
      const goal = profile?.primaryGoal || profile?.goal;
      const map = {
        'Hipertrofia':   'Foco em Hipertrofia',
        'Perda de Peso': 'Foco em Emagrecimento',
        'Performance':   'Foco em Performance',
        'Saúde Geral':   'Saúde & Longevidade',
        'Longevidade':   'Foco em Longevidade',
        'Foco':          'Foco & Cognição',
      };
      return map[goal] || 'Suplementação Inteligente';
    } catch {
      return 'Suplementação Inteligente';
    }
  }

  static _hasCheckinToday() {
    try {
      const today = new Date().toDateString();
      return (stateManager.checkins || []).some(c =>
        new Date(c.timestamp).toDateString() === today
      );
    } catch {
      return true; // fail safe: não mostra badge
    }
  }

  static _getThemeIcon() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    return theme === 'dark' ? ICONS.theme.sun : ICONS.theme.moon;
  }

  // ── Private: styles ───────────────────────────────────────
  static _injectStyles() {
    if (Nav._styleInjected) return;
    Nav._styleInjected = true;

    const style = document.createElement('style');
    style.setAttribute('data-nav', 'true');
    style.textContent = `
      /* ── SIDEBAR ── */
      #sidebar-nav {
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .sb-inner {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 20px 12px 16px;
        overflow: hidden;
      }
      .sb-header {
        padding: 4px 8px 18px;
        border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.07));
        margin-bottom: 10px;
        flex-shrink: 0;
      }
      .sb-logo {
        display: block;
        font-family: 'Syne', sans-serif;
        font-weight: 800;
        font-size: 18px;
        color: var(--color-brand, #7C3AED);
        margin-bottom: 3px;
        text-decoration: none;
      }
      .sb-subtitle {
        display: block;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: var(--color-text-muted, #555);
      }
      .sb-nav {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        gap: 2px;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .sb-nav::-webkit-scrollbar { display: none; }
      .sb-group { margin-top: 14px; }
      .sb-group__label {
        display: block;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.1em;
        color: var(--color-text-muted, #555);
        padding: 0 10px 5px;
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
        color: var(--color-text-secondary, #9A9A9A);
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        position: relative;
        transition: background 0.15s ease, color 0.15s ease;
        min-height: 40px;
      }
      .sb-item:hover {
        background: var(--color-surface-hover, rgba(255,255,255,0.04));
        color: var(--color-text-primary, #F2F2F2);
      }
      .sb-item.is-active {
        background: var(--color-brand-muted, rgba(124,58,237,0.12));
        color: var(--color-text-primary, #F2F2F2);
        font-weight: 600;
      }
      .sb-item.is-active::before {
        content: '';
        position: absolute;
        left: 0; top: 6px; bottom: 6px;
        width: 2px;
        border-radius: 0 2px 2px 0;
        background: var(--color-brand, #7C3AED);
      }
      .sb-item__icon {
        width: 20px; height: 20px;
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
      }
      .sb-item__label { flex: 1; }
      .sb-badge {
        width: 7px; height: 7px;
        border-radius: 50%;
        background: var(--color-brand, #7C3AED);
        flex-shrink: 0;
      }
      .sb-footer {
        border-top: 1px solid var(--color-border, rgba(255,255,255,0.07));
        padding-top: 10px;
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex-shrink: 0;
      }
      .sb-theme-btn {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 10px; border-radius: 8px; border: none;
        background: transparent;
        color: var(--color-text-secondary, #9A9A9A);
        font-family: 'Inter', sans-serif; font-size: 13px;
        cursor: pointer; transition: background 0.15s ease; width: 100%;
        min-height: 40px;
      }
      .sb-theme-btn:hover { background: var(--color-surface-hover, rgba(255,255,255,0.04)); color: var(--color-text-primary); }
      .sb-fab {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        width: 100%; padding: 11px 16px; border-radius: 10px; border: none;
        background: var(--color-brand, #7C3AED); color: #fff;
        font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
        cursor: pointer; transition: background 0.15s ease, transform 0.12s ease;
      }
      .sb-fab:hover { background: var(--color-brand-hover, #6D28D9); }
      .sb-fab:active { transform: scale(0.98); }

      /* ── BOTTOM NAV ── */
      #bottom-nav {
        background: rgba(8, 8, 8, 0.88);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid var(--color-border, rgba(255,255,255,0.07));
        display: flex;
        align-items: center;
        justify-content: space-around;
        box-shadow: 0 -30px 40px -10px rgba(8,8,8,0.6);
        transition: transform 0.25s ease;
      }
      #bottom-nav.bn--hidden { transform: translateY(100%); }
      .bn-item {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 3px; flex: 1;
        padding: 8px 4px 6px; background: transparent; border: none;
        cursor: pointer; color: var(--color-text-muted, #555);
        font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 500;
        transition: color 0.15s ease; min-height: 48px; position: relative;
        -webkit-tap-highlight-color: transparent;
      }
      .bn-item:hover { color: var(--color-text-secondary, #9A9A9A); }
      .bn-item.is-active { color: var(--color-brand, #7C3AED); }
      .bn-item--featured { flex: 0 0 68px; }
      .bn-item--featured .bn-icon {
        width: 48px; height: 48px; border-radius: 50%;
        background: var(--color-brand, #7C3AED);
        display: flex; align-items: center; justify-content: center;
        color: #fff;
        box-shadow: 0 4px 14px rgba(124,58,237,0.45);
        transform: translateY(-8px);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .bn-item--featured:active .bn-icon { transform: translateY(-5px) scale(0.95); }
      .bn-item--featured.is-active .bn-icon { box-shadow: 0 4px 20px rgba(124,58,237,0.65); }
      .bn-icon {
        width: 22px; height: 22px;
        display: flex; align-items: center; justify-content: center;
      }
      .bn-label { line-height: 1; }
      .bn-badge {
        position: absolute; top: 8px; right: calc(50% - 16px);
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--color-brand, #7C3AED);
        border: 2px solid var(--color-bg-primary, #080808);
      }

      /* ── MOBILE TOPBAR ── */
      #mobile-topbar {
        background: rgba(8,8,8,0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.07));
        display: none;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
      }
      .mt-logo {
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: 18px; color: var(--color-brand, #7C3AED);
      }
      .mt-actions { display: flex; align-items: center; gap: 4px; }
      .mt-icon-btn {
        background: none; border: none; cursor: pointer;
        padding: 8px; border-radius: 8px;
        color: var(--color-text-secondary, #9A9A9A);
        display: flex; align-items: center; justify-content: center;
        min-width: 44px; min-height: 44px;
        transition: background 0.15s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .mt-icon-btn:hover { background: var(--color-surface-hover, rgba(255,255,255,0.04)); }
      .mt-avatar {
        width: 30px; height: 30px; border-radius: 50%;
        background: var(--color-brand-muted, rgba(124,58,237,0.12));
        border: 1.5px solid var(--color-brand, #7C3AED);
        color: var(--color-brand, #7C3AED);
        font-size: 12px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
      }
    `;
    document.head.appendChild(style);
  }
}
```

- [ ] **Step 2: Verificar que o arquivo foi criado**

```bash
cat src/core/nav.js | head -20
```

Esperado: primeiras linhas do arquivo com `import { stateManager }`.

- [ ] **Step 3: Commit**

```bash
git add src/core/nav.js
git commit -m "feat(nav): create data-driven Nav module with NAV_CONFIG, sidebar, bottom nav, mobile topbar"
```

---

## Task 2: Atualizar `index.html` — layout CSS e estrutura HTML

**Files:**
- Modify: `index.html`

O `index.html` precisa de 3 mudanças:
1. CSS do body grid (desktop sem topbar row, mobile com fixed elements)
2. Substituir `<header id="topbar">` por `<header id="mobile-topbar">` (vazio)
3. Limpar o conteúdo de `<nav id="sidebar-nav">` e remover script inline do toggle
4. Adicionar `<nav id="bottom-nav">` (vazio)

- [ ] **Step 1: Ler o arquivo para localizar as seções a modificar**

Abrir `index.html`. Identificar:
- O bloco `<style>` inline no `<head>` que define o grid do body (procurar por `grid-template-areas`)
- O `<header id="topbar">` (linha ~664)
- O `<nav id="sidebar-nav">` com os 9 botões (linha ~687)
- O `<script>` inline do sidebar-toggle (linha ~764)

- [ ] **Step 2: Substituir o CSS do body grid no `<style>` inline**

Localizar e substituir o bloco CSS do `body` no `<style>` inline do `<head>`. O novo bloco completo:

```css
body {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 1fr;
  grid-template-areas: "sidebar main";
  height: 100dvh;
}

/* Landing mode — esconde toda navegação */
body.body--landing #sidebar-nav,
body.body--landing #mobile-topbar,
body.body--landing #bottom-nav { display: none !important; }
body.body--landing { display: block !important; }
body.body--landing #router-outlet {
  position: fixed; inset: 0; overflow-y: auto; grid-area: unset;
}

#sidebar-nav {
  grid-area: sidebar;
  background: var(--color-surface-primary);
  border-right: 1px solid var(--color-border);
  z-index: 100;
  overflow: hidden;
}

#router-outlet {
  grid-area: main;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  background: var(--color-bg-primary);
}

#mobile-topbar { display: none; }
#bottom-nav    { display: none; }

@media (max-width: 859px) {
  body {
    display: block;
    height: 100dvh;
    overflow: hidden;
  }
  #sidebar-nav { display: none !important; }
  #mobile-topbar {
    display: flex !important;
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
    display: flex !important;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: calc(64px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 200;
  }
}
```

Remover do `<style>` os blocos que eram do layout antigo:
- `.sidebar-collapsed`, `.sidebar-header`, `.sidebar-logo`, `.sidebar-toggle`, `.nav-container`, `.nav-item`, `.nav-label`, `.nav-cta` — esses seletores não existem mais
- O bloco `body.sidebar-collapsed`
- O `@media (max-width: 768px)` do grid antigo
- O bloco `body.body--landing` antigo (substituído acima)
- O bloco `#topbar` e `.topbar-actions`

Manter no `<style>`:
- Variáveis CSS (`:root`, `[data-theme="light"]`)
- `.icon-btn`, `.spinner`, `.loading-text`, `#app-loading`
- `.page-enter`, `@keyframes page-fade`, `@keyframes spin`
- Toast styles (`.toast`, etc.)

- [ ] **Step 3: Substituir o `<header id="topbar">` por `<header id="mobile-topbar">`**

Localizar:
```html
<!-- Top Bar -->
<header id="topbar" role="banner">
  <span class="logo" aria-label="SupliList">SupliList</span>
  <nav class="topbar-actions" aria-label="Ações do topo">
    <button id="btn-theme" class="icon-btn" aria-label="Alternar tema" title="Alternar tema claro/escuro">
      ...SVG...
    </button>
  </nav>
</header>
```

Substituir por:
```html
<!-- Mobile topbar — conteúdo injetado por Nav.init() -->
<header id="mobile-topbar" role="banner" aria-label="Topo mobile"></header>
```

- [ ] **Step 4: Limpar o conteúdo de `<nav id="sidebar-nav">`**

Localizar o bloco completo da sidebar (de `<nav id="sidebar-nav"` até o `</nav>` correspondente) e substituir por:

```html
<!-- Sidebar desktop — conteúdo injetado por Nav.init() -->
<nav id="sidebar-nav" role="navigation" aria-label="Navegação principal"></nav>
```

- [ ] **Step 5: Remover o `<script>` inline do sidebar-toggle**

Localizar e remover completamente o bloco `<script>` que começa com:
```js
(function () {
  const toggleBtn = document.getElementById('sidebar-toggle');
```
até o `</script>` correspondente. Este script não é mais necessário.

- [ ] **Step 6: Adicionar `<nav id="bottom-nav">` após `#router-outlet`**

Após a linha `<main id="router-outlet" ...></main>`, adicionar:

```html
<!-- Bottom nav mobile — conteúdo injetado por Nav.init() -->
<nav id="bottom-nav" role="navigation" aria-label="Navegação principal mobile"></nav>
```

- [ ] **Step 7: Verificar estrutura**

```bash
grep -n "mobile-topbar\|sidebar-nav\|router-outlet\|bottom-nav\|btn-theme\|sidebar-toggle" index.html
```

Esperado: cada ID aparece exatamente 1 vez. `sidebar-toggle` e `btn-theme` (o do topbar antigo) NÃO devem aparecer no HTML (só no JS do nav.js que cria o `#btn-theme` dentro da sidebar).

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "refactor(shell): replace hardcoded nav HTML with empty containers, update body grid CSS"
```

---

## Task 3: Atualizar `src/core/app.js` — integrar Nav

**Files:**
- Modify: `src/core/app.js`

- [ ] **Step 1: Adicionar import do Nav no topo do arquivo**

Logo após os imports existentes, adicionar:

```js
import { Nav } from './nav.js';
```

O topo do arquivo deve ficar:
```js
import '../css/main.css';
import { stateManager, STORAGE_KEYS } from '../state/state-manager.js';
import { eventBus } from './event-bus.js';
import { Router } from './router.js';
import { Nav } from './nav.js';
```

- [ ] **Step 2: Inicializar Nav e remover listeners [data-route] obsoletos**

Dentro do `DOMContentLoaded`, fazer as seguintes mudanças:

**Adicionar** logo após `stateManager.hydrate()` / `stateManager.init()`:
```js
Nav.init();
Nav.updateActive(window.location.pathname);
```

**Substituir** o listener popstate existente:
```js
// ANTES:
window.addEventListener('popstate', () => {
  applyLandingMode();
  updatePageTitle();
});

// DEPOIS:
window.addEventListener('popstate', () => {
  applyLandingMode();
  updatePageTitle();
  Nav.updateActive(window.location.pathname);
  // Landing mode sync com Nav
  const isLanding = window.location.pathname === '/' || window.location.pathname === '/home';
  isLanding ? Nav.hide() : Nav.show();
});
```

**Remover completamente** o bloco:
```js
// Nav item clicks — migrado de data-route (hash) para pathname
document.querySelectorAll('[data-route]').forEach(btn => {
  btn.addEventListener('click', () => {
    const path = btn.dataset.route;
    window.history.pushState(null, null, path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
});
```
O Nav.init() já gerencia seus próprios listeners via `_setupClickDelegation()`.

- [ ] **Step 3: Migrar o theme toggle para os novos botões**

O `#btn-theme` agora vive dentro da sidebar (injetado por Nav), e `#btn-theme-mobile` no mobile topbar. Substituir o bloco do theme toggle:

```js
// ANTES:
const themeBtn = document.getElementById('btn-theme');
if (themeBtn) {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME) || localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
  });
}

// DEPOIS:
// Restaurar tema salvo
const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || localStorage.getItem('theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

// Theme toggle — delegado para os dois botões (sidebar + mobile topbar)
function _toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_KEYS.THEME, next);
  // Atualiza ícone nos botões
  const themeIcon = next === 'dark'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  document.querySelectorAll('#btn-theme .sb-item__icon, #btn-theme-mobile').forEach(el => {
    if (el.id === 'btn-theme-mobile') el.innerHTML = themeIcon;
    else el.innerHTML = themeIcon;
  });
}
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-theme') || e.target.closest('#btn-theme-mobile')) {
    _toggleTheme();
  }
});
```

- [ ] **Step 4: Verificar o arquivo final**

O `DOMContentLoaded` deve ter esta ordem:
1. `stateManager.hydrate()` / `stateManager.init()`
2. `Nav.init()`
3. `Nav.updateActive(window.location.pathname)`
4. `applyLandingMode()`
5. `updatePageTitle()`
6. `window.addEventListener('popstate', ...)`
7. `const container = document.querySelector('#router-outlet')`
8. `const router = new Router(...)`
9. `router.start()`
10. `window.__router = router`
11. Theme toggle listener
12. Hide loading screen
13. Toast events

- [ ] **Step 5: Commit**

```bash
git add src/core/app.js
git commit -m "feat(app): integrate Nav module, remove hardcoded [data-route] listeners, migrate theme toggle"
```

---

## Task 4: Atualizar `src/core/router.js` — substituir updateNav por Nav

**Files:**
- Modify: `src/core/router.js`

O método `updateNav()` atual (linhas 78–85) usa `.nav-item` que não existe mais. Deve ser removido e substituído por `Nav.updateActive()`.

- [ ] **Step 1: Adicionar import do Nav**

No topo de `src/core/router.js`, adicionar:

```js
import { Nav } from './nav.js';
```

- [ ] **Step 2: Substituir a chamada a `updateNav` em `handleRoute()`**

Localizar no final de `handleRoute()` (linha ~75):
```js
this.updateNav(pathname);
```

Substituir por:
```js
Nav.updateActive(pathname);
```

- [ ] **Step 3: Remover o método `updateNav()` inteiro**

Localizar e remover completamente:
```js
updateNav(pathname) {
  const path = pathname.replace(/^\//, '') || 'home';
  document.querySelectorAll('.nav-item').forEach(el => {
    const route = el.dataset.route || el.getAttribute('href') || '';
    const navPath = route.replace(/^\//, '');
    el.classList.toggle('active', navPath === path);
  });
}
```

- [ ] **Step 4: Verificar**

```bash
grep -n "updateNav\|nav-item\|data-route" src/core/router.js
```

Esperado: nenhuma ocorrência.

- [ ] **Step 5: Commit**

```bash
git add src/core/router.js
git commit -m "refactor(router): replace updateNav() with Nav.updateActive() from nav module"
```

---

## Task 5: Verificação final integrada

- [ ] **Step 1: Rodar o servidor de dev**

```bash
npm run dev
```

- [ ] **Step 2: Verificar desktop (>860px)**

Abrir `http://localhost:5173/list`. Confirmar:
- [ ] Sidebar visível à esquerda (240px)
- [ ] Logo "SupliList" roxo + subtitle abaixo
- [ ] Grupos "EXPLORAR" e "MEU PROTOCOLO" visíveis
- [ ] Item "Lista" com fundo roxo claro + borda esquerda roxa (ativo)
- [ ] Outros itens em cinza
- [ ] FAB "Adicionar ao Stack" no rodapé da sidebar
- [ ] Botão "Alternar Tema" no rodapé da sidebar
- [ ] Sem topbar, sem bottom nav

- [ ] **Step 3: Verificar mobile (<860px) — emular no DevTools**

Abrir DevTools → Toggle device toolbar → iPhone 14 (390×844).
- [ ] Mobile topbar visível no topo (logo + ícone tema + avatar)
- [ ] Sidebar NÃO visível
- [ ] Bottom nav visível no rodapé (Lista, Stack, Check-in, Favoritos, Histórico)
- [ ] Check-in central elevado (+8px), círculo roxo
- [ ] Conteúdo não some atrás do bottom nav

- [ ] **Step 4: Verificar navegação**

Clicar em "Stack" no bottom nav → URL muda para `/my-stack`, item Stack fica ativo (roxo).
Clicar em "Lista" → URL `/list`, Lista ativo.
Clicar em "Check-in" central → URL `/checkin`.

- [ ] **Step 5: Verificar landing page**

Navegar para `http://localhost:5173/`. 
- [ ] Sidebar e bottom nav NÃO aparecem (landing mode)
- [ ] Home page aparece normalmente

- [ ] **Step 6: Verificar scroll auto-hide mobile**

Em mobile, na página Lista (com muitos itens), scrollar para baixo.
- [ ] Bottom nav some com transição suave
Scrollar para cima.
- [ ] Bottom nav reaparece

- [ ] **Step 7: Rodar os testes**

```bash
npm test
```

Esperado: todos os testes passando (os testes existentes não testam o nav diretamente — são testes de utils e state).

- [ ] **Step 8: Commit final se necessário**

Se houver ajustes menores de CSS durante verificação:
```bash
git add -p
git commit -m "fix(nav): visual adjustments after integration testing"
```

---

## Self-Review

**Spec coverage:**

| Requisito | Task |
|---|---|
| NAV_CONFIG data-driven | Task 1 |
| Sidebar: logo, subtitle, grupos, itens, active state | Task 1 |
| Sidebar: FAB, theme toggle, rodapé | Task 1 |
| Filled vs outlined icons | Task 1 |
| Badge check-in | Task 1 |
| Auto-hide scroll mobile | Task 1 |
| Landing mode (hide/show) | Task 1 + Task 3 |
| Body grid sem topbar row | Task 2 |
| Mobile topbar 52px fixed | Task 2 |
| Bottom nav 64px fixed + safe-area | Task 2 |
| Glassmorphism bottom nav | Task 1 (CSS) |
| Tab check-in elevado | Task 1 (CSS) |
| Remoção hardcoded HTML | Task 2 |
| Import Nav em app.js | Task 3 |
| Remoção [data-route] listeners | Task 3 |
| Theme toggle migrado | Task 3 |
| updateNav substituído por Nav.updateActive | Task 4 |
| Extensibilidade (nova aba = 1 linha) | Task 1 (estrutura) |
| Acessibilidade (aria-current, aria-label) | Task 1 |

**Placeholder scan:** Nenhum TBD. Todo código está completo e específico.

**Consistência:** `Nav.updateActive()` definido em Task 1, chamado em Task 3 (app.js popstate) e Task 4 (router.js handleRoute). `#btn-theme` criado por `Nav._renderSidebar()` em Task 1, listener em Task 3. `#mobile-topbar` criado em Task 2, preenchido por `Nav._renderMobileTopbar()` em Task 1.
