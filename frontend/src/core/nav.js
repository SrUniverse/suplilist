// ============================================================
// nav.js — Sistema de navegação data-driven
// Fonte única de verdade para sidebar desktop e bottom nav mobile.
// Adicionar nova rota = 1 objeto no NAV_CONFIG abaixo.
// ============================================================

import { stateManager } from '../state/state-manager.js';
import { eventBus } from './event-bus.js';
import { todayISO } from '../utils/date.js';

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
  collapse: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  more: {
    outlined: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  },
};

/** Itens que não cabem na bottom-nav e vivem no drawer "Mais" (mobile).
 *  6 itens → grid 3×2 cheio (sem buracos). A bottom-nav fica em 5 abas
 *  (best practice iOS/Material: 3–5 destinos + ação central). */
const DRAWER_ITEM_IDS = ['home', 'favorites', 'dosage', 'profile', 'faq', 'settings'];

/** Chave de persistência do estado recolhido da sidebar (desktop). */
const SIDEBAR_COLLAPSED_KEY = 'suplilist:sidebar-collapsed';

// ── NAV_CONFIG ───────────────────────────────────────────────
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
      { id: 'my-stack',  path: '/my-stack',   label: 'Stack',       bottomNav: true, bottomOrder: 1, icon: ICONS.stack },
      { id: 'checkin',   path: '/checkin',     label: 'Check-in',    bottomNav: true, bottomOrder: 2, featured: true, icon: ICONS.checkin },
      { id: 'favorites', path: '/favorites',   label: 'Favoritos',   bottomNav: false, icon: ICONS.favorites },
      { id: 'history',   path: '/history',     label: 'Histórico',   bottomNav: true, bottomOrder: 3, icon: ICONS.history },
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
  static _badgeStates = {};
  static _scrollHandler = null;
  static _checkinUnsub = null;  // unsubscribe for checkin:added badge listener
  static _clickHandler = null;
  static _drawerKeyHandler = null;  // keydown (Tab trap + Escape) while drawer open

  static init() {
    Nav._injectStyles();
    Nav._renderSidebar();
    Nav._renderBottomNav();
    Nav._renderMobileTopbar();
    Nav._applySidebarState();
    Nav._setupClickDelegation();
    Nav._setupScrollAutoHide();
    Nav._setupRailTooltip();
    if (!Nav._hasCheckinToday()) {
      Nav.setBadge('checkin', true);
    }
    // Reactively remove badge when user does a checkin during the session
    // Guard: unsubscribe previous listener before adding a new one (prevents
    // accumulation if init() is called more than once).
    if (Nav._checkinUnsub) { Nav._checkinUnsub(); Nav._checkinUnsub = null; }
    Nav._checkinUnsub = eventBus.on('checkin:added', () => {
      if (Nav._hasCheckinToday()) {
        Nav.setBadge('checkin', false);
      }
    });

    Nav._setupPwaInstallPrompt();
  }

  static _setupPwaInstallPrompt() {
    if (Nav._pwaInstallHandler) {
      window.removeEventListener('pwa:install-available', Nav._pwaInstallHandler);
    }
    Nav._pwaInstallHandler = (e) => {
      const prompt = e.detail.prompt;
      if (!prompt) return;

      // Add install button to sidebar footer
      const footer = document.querySelector('.sb-footer');
      if (footer && !document.getElementById('pwa-install-btn')) {
        const installBtn = document.createElement('button');
        installBtn.id = 'pwa-install-btn';
        installBtn.className = 'sb-theme-btn';
        installBtn.setAttribute('aria-label', 'Instalar SupliList como app no dispositivo');
        installBtn.innerHTML = `
          <span class="sb-item__icon" aria-hidden="true">📱</span>
          <span style="font-weight:600; color:var(--color-brand)">Instalar App</span>
        `;
        installBtn.addEventListener('click', async () => {
          prompt.prompt();
          const result = await prompt.userChoice;
          if (result.outcome === 'accepted') {
            installBtn.remove();
          }
        });
        footer.insertBefore(installBtn, footer.firstChild);
      }
      
      // Also add to mobile topbar if we want
      const topbar = document.getElementById('mobile-topbar');
      if (topbar && !document.getElementById('mobile-pwa-install-btn')) {
        const mobileBtn = document.createElement('button');
        mobileBtn.id = 'mobile-pwa-install-btn';
        mobileBtn.className = 'mt-icon-btn';
        mobileBtn.setAttribute('aria-label', 'Instalar SupliList como app');
        mobileBtn.innerHTML = `<span aria-hidden="true">📱</span>`;
        mobileBtn.style.color = 'var(--color-brand)';
        mobileBtn.addEventListener('click', async () => {
          prompt.prompt();
          const result = await prompt.userChoice;
          if (result.outcome === 'accepted') {
            mobileBtn.remove();
            if (document.getElementById('pwa-install-btn')) document.getElementById('pwa-install-btn').remove();
          }
        });
        const actions = topbar.querySelector('.mt-actions');
        if (actions) actions.insertBefore(mobileBtn, actions.firstChild);
      }
    };
    window.addEventListener('pwa:install-available', Nav._pwaInstallHandler);
  }

  static updateActive(pathname) {
    const currentPath = pathname.split('?')[0] || '/';
    let normalized = currentPath === '/home' ? '/' : currentPath;
    if (normalized === '/lista') normalized = '/list'; // handle alias

    Nav.updateSubtitle(normalized);

    // aria-current: 'page' no ativo, atributo removido nos demais.
    // ('false' polui leitores de tela, que anunciam todos os itens como
    // tendo estado de "currency".)
    const syncCurrent = (el, isActive) => {
      el.classList.toggle('is-active', isActive);
      if (isActive) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    };

    document.querySelectorAll('.sb-item').forEach(el => {
      const itemPath = el.dataset.navPath;
      syncCurrent(el, itemPath === normalized || (normalized === '/' && itemPath === '/'));
    });

    document.querySelectorAll('.bn-item').forEach(el => {
      syncCurrent(el, el.dataset.navPath === normalized);
    });

    // Itens do drawer "Mais" (ex.: Favoritos só existe aqui).
    document.querySelectorAll('.nd-item').forEach(el => {
      syncCurrent(el, el.dataset.navPath === normalized);
    });

    // Anuncia a troca de rota a leitores de tela (só o nome da página).
    const announcer = document.getElementById('route-announcer');
    const activeLabel = document.querySelector('.sb-item.is-active')?.getAttribute('aria-label');
    if (announcer && activeLabel) announcer.textContent = activeLabel;
  }

  static setBadge(itemId, visible) {
    Nav._badgeStates[itemId] = visible;
    const sbBadge = document.querySelector(`.sb-item[data-nav-id="${itemId}"] .sb-badge`);
    if (sbBadge) sbBadge.hidden = !visible;
    const bnBadge = document.querySelector(`.bn-item[data-nav-id="${itemId}"] .bn-badge`);
    if (bnBadge) bnBadge.hidden = !visible;
  }

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

  static _renderSidebar() {
    const sidebar = document.getElementById('sidebar-nav');
    if (!sidebar) return;
    const themeIcon = Nav._getThemeIcon();

    const groupsHtml = NAV_CONFIG.map(({ group, items }) => {
      const itemsHtml = items.map(item => `
        <button class="sb-item" data-nav-id="${item.id}" data-nav-path="${item.path}"
          aria-label="${item.label}" title="${item.label}">
          <span class="sb-item__icon">${item.icon.outlined}</span>
          <span class="sb-item__label">${item.label}</span>
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
          <div class="sb-brand">
            <img src="/logo-mark.webp" alt="" class="sb-logo-mark" width="36" height="36" aria-hidden="true">
            <span class="sb-wordmark">SupliList</span>
          </div>
        </div>
        <div class="sb-nav">
          ${groupsHtml}
        </div>
        <div class="sb-footer">
          <button class="sb-collapse-btn" data-nav-action="collapse" aria-label="Recolher menu" title="Recolher menu">
            <span class="sb-item__icon">${ICONS.collapse}</span>
            <span class="sb-collapse-btn__label">Recolher</span>
          </button>
          <button id="btn-theme" class="sb-theme-btn" aria-label="Alternar tema claro/escuro" title="Alternar tema">
            <span class="sb-item__icon">${themeIcon}</span>
            <span>Alternar Tema</span>
          </button>
          <button class="sb-fab" data-nav-path="/my-stack" aria-label="Adicionar ao Meu Stack" title="Adicionar ao Stack">
            ${ICONS.plus}
            <span class="sb-fab__label">Adicionar ao Stack</span>
          </button>
        </div>
      </div>`;
  }

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
          aria-label="${item.label}">
          <span class="bn-icon" style="${item.featured ? '' : `width:${iconSize}px;height:${iconSize}px`}">${icon}</span>
          ${!item.featured ? `<span class="bn-label">${item.label}</span>` : ''}
          ${item.id === 'checkin' ? `<span class="bn-badge" hidden aria-label="Check-in pendente"></span>` : ''}
        </button>`;
    }).join('');

    const moreHtml = `
      <button class="bn-item" data-nav-action="drawer" aria-label="Mais opções" aria-haspopup="dialog" aria-expanded="false">
        <span class="bn-icon" style="width:22px;height:22px">${ICONS.more.outlined}</span>
        <span class="bn-label">Mais</span>
      </button>`;

    bn.innerHTML = itemsHtml + moreHtml;
    Nav._renderDrawer();
  }

  /** Bottom-sheet drawer (mobile) com as rotas que não cabem na bottom-nav. */
  static _renderDrawer() {
    let drawer = document.getElementById('nav-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'nav-drawer';
      drawer.hidden = true;
      document.body.appendChild(drawer);
    }

    const allItems = NAV_CONFIG.flatMap(g => g.items);
    const itemsHtml = DRAWER_ITEM_IDS.map(id => {
      const item = allItems.find(i => i.id === id);
      if (!item) return '';
      return `
        <button class="nd-item" data-nav-id="${item.id}" data-nav-path="${item.path}" aria-label="${item.label}">
          <span class="nd-item__icon">${item.icon.outlined}</span>
          <span class="nd-item__label">${item.label}</span>
        </button>`;
    }).join('');

    drawer.innerHTML = `
      <div class="nav-drawer__backdrop" data-nav-action="drawer-close"></div>
      <div class="nav-drawer__sheet" role="dialog" aria-modal="true" aria-label="Mais opções">
        <div class="nav-drawer__handle" aria-hidden="true"></div>
        <div class="nav-drawer__grid">${itemsHtml}</div>
      </div>`;
  }

  static openDrawer() {
    const d = document.getElementById('nav-drawer');
    if (!d) return;
    d.hidden = false;
    // Força reflow antes de aplicar a classe para a transição animar de forma
    // confiável (rAF pode ser throttled em abas em background).
    void d.offsetWidth;
    d.classList.add('is-open');
    document.querySelector('[data-nav-action="drawer"]')?.setAttribute('aria-expanded', 'true');

    // Acessibilidade (ARIA dialog): foco inicial, trap de Tab e Escape p/ fechar.
    const items = [...d.querySelectorAll('.nd-item')];
    items[0]?.focus();
    if (Nav._drawerKeyHandler) document.removeEventListener('keydown', Nav._drawerKeyHandler);
    Nav._drawerKeyHandler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); Nav.closeDrawer(); return; }
      if (e.key !== 'Tab' || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', Nav._drawerKeyHandler);
  }

  static closeDrawer() {
    const d = document.getElementById('nav-drawer');
    if (!d) return;
    d.classList.remove('is-open');
    const trigger = document.querySelector('[data-nav-action="drawer"]');
    trigger?.setAttribute('aria-expanded', 'false');
    if (Nav._drawerKeyHandler) {
      document.removeEventListener('keydown', Nav._drawerKeyHandler);
      Nav._drawerKeyHandler = null;
    }
    // Restaura o foco ao gatilho "Mais" (padrão ARIA dialog).
    trigger?.focus();
    setTimeout(() => { if (d && !d.classList.contains('is-open')) d.hidden = true; }, 280);
  }

  /** Recolhe/expande a sidebar (desktop). Sem efeito visível no mobile,
   *  onde o body vira display:block e a sidebar fica escondida. */
  static toggleSidebar() {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* storage indisponível */ }
    Nav._syncCollapseButton(collapsed);
  }

  /** Aplica o estado salvo na inicialização. */
  static _applySidebarState() {
    let collapsed = false;
    try { collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch { /* storage indisponível */ }
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    Nav._syncCollapseButton(collapsed);
  }

  static _syncCollapseButton(collapsed) {
    const btn = document.querySelector('[data-nav-action="collapse"]');
    if (!btn) return;
    const label = collapsed ? 'Expandir menu' : 'Recolher menu';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    // Disclosure control: comunica o estado (recolhido/expandido) ao leitor de tela.
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  static _renderMobileTopbar() {
    const mt = document.getElementById('mobile-topbar');
    if (!mt) return;
    const themeIcon = Nav._getThemeIcon();
    mt.innerHTML = `
      <img src="/logo-mark.webp" alt="SupliList" class="mt-logo-img" width="28" height="28">
      <div class="mt-actions">
        <button id="btn-theme-mobile" class="mt-icon-btn" aria-label="Alternar tema">
          ${themeIcon}
        </button>
        <button class="mt-icon-btn" data-nav-path="/profile" aria-label="Meu Perfil">
          <div class="mt-avatar">S</div>
        </button>
      </div>`;
  }

  static _setupClickDelegation() {
    // Guard: remove any previous listener before adding a new one (prevents
    // accumulation if init() is called more than once, e.g. during HMR).
    if (Nav._clickHandler) {
      document.removeEventListener('click', Nav._clickHandler);
      Nav._clickHandler = null;
    }
    Nav._clickHandler = (e) => {
      // Drawer toggle/close (mobile "Mais")
      const action = e.target.closest('[data-nav-action]');
      if (action) {
        e.preventDefault();
        const kind = action.getAttribute('data-nav-action');
        if (kind === 'drawer') {
          const d = document.getElementById('nav-drawer');
          d && d.classList.contains('is-open') ? Nav.closeDrawer() : Nav.openDrawer();
        } else if (kind === 'drawer-close') {
          Nav.closeDrawer();
        } else if (kind === 'collapse') {
          Nav.toggleSidebar();
        }
        return;
      }

      const btn = e.target.closest('[data-nav-path]');
      if (!btn) return;
      e.preventDefault();
      const path = btn.getAttribute('data-nav-path');
      if (path) {
        // Fecha o drawer se a navegação veio de dentro dele.
        if (btn.closest('#nav-drawer')) Nav.closeDrawer();
        window.history.pushState(null, null, path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    };
    document.addEventListener('click', Nav._clickHandler);
  }

  /** Tooltip portal para itens do rail recolhido.
   *  O overflow:hidden da sidebar corta qualquer tooltip renderizado dentro dela,
   *  então criamos um <div> no body e o posicionamos via getBoundingClientRect. */
  static _setupRailTooltip() {
    if (Nav._railTooltipEl) return; // guard contra double-init

    const tip = document.createElement('div');
    tip.id = 'sb-rail-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');
    tip.style.cssText = `
      position: fixed; z-index: 9999; pointer-events: none;
      background: var(--color-surface-secondary, #1a1a2e);
      color: var(--color-text-primary, #fff);
      font: 600 12px/1 'Inter', sans-serif;
      padding: 6px 10px; border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      border: 1px solid var(--color-border, rgba(255,255,255,0.08));
      white-space: nowrap; opacity: 0; transition: opacity 0.15s ease;
      transform: translateY(-50%);
    `;
    document.body.appendChild(tip);
    Nav._railTooltipEl = tip;

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    let hideTimer;

    sidebar.addEventListener('mouseenter', (e) => {
      if (!document.body.classList.contains('sidebar-collapsed')) return;
      const item = e.target.closest('.sb-item, .sb-theme-btn, .sb-collapse-btn, .sb-fab');
      if (!item) return;
      const label = item.getAttribute('aria-label') || item.getAttribute('title');
      if (!label) return;
      clearTimeout(hideTimer);
      const rect = item.getBoundingClientRect();
      tip.textContent = label;
      tip.style.left = `${rect.right + 8}px`;
      tip.style.top = `${rect.top + rect.height / 2}px`;
      tip.style.opacity = '1';
      tip.setAttribute('aria-hidden', 'false');
    }, true);

    sidebar.addEventListener('mouseleave', (e) => {
      const item = e.target.closest('.sb-item, .sb-theme-btn, .sb-collapse-btn, .sb-fab');
      if (!item) return;
      hideTimer = setTimeout(() => {
        tip.style.opacity = '0';
        tip.setAttribute('aria-hidden', 'true');
      }, 80);
    }, true);

    // Esconder ao expandir sidebar
    const observer = new MutationObserver(() => {
      if (!document.body.classList.contains('sidebar-collapsed')) {
        tip.style.opacity = '0';
        tip.setAttribute('aria-hidden', 'true');
      }
    });
    observer.observe(document.body, { attributeFilter: ['class'] });
  }

  static _setupScrollAutoHide() {
    const outlet = document.getElementById('router-outlet');
    const bn = document.getElementById('bottom-nav');
    if (!outlet || !bn) return;

    // Guard against double-init: remove previous scroll listener if present
    if (Nav._scrollHandler) {
      outlet.removeEventListener('scroll', Nav._scrollHandler);
      Nav._scrollHandler = null;
    }

    let lastScrollY = 0;
    Nav._scrollHandler = () => {
      const y = outlet.scrollTop;
      const scrollingDown = y > lastScrollY && y > 80;
      bn.classList.toggle('bn--hidden', scrollingDown);
      lastScrollY = y;
    };
    outlet.addEventListener('scroll', Nav._scrollHandler, { passive: true });
  }

  static _getSidebarSubtitle(path) {
    const routeMap = {
      '/list':      'Supplement Catalog',
      '/lista':     'Supplement Catalog',
      '/my-stack':  'Precision Management',
      '/history':   'Vitals Optimized',
      '/dosage':    'Clinical Access',
      '/checkin':   'Daily Protocol',
      '/favorites': 'Curated Selection',
      '/profile':   'Biometric Profile',
      '/settings':  'Preferences',
      '/faq':       'Knowledge Base',
      '/':          'Science-Based Nutrition',
    };
    const currentPath = (path || window.location.pathname || '/').split('?')[0];
    return routeMap[currentPath] || 'Science-Based Nutrition';
  }

  static updateSubtitle(path) {
    const el = document.querySelector('#sidebar-nav .sb-subtitle');
    if (el) el.textContent = Nav._getSidebarSubtitle(path);
  }

  static _hasCheckinToday() {
    try {
      const today = todayISO();
      return (stateManager.checkins || []).some(c => c.date === today);
    } catch {
      return true;
    }
  }

  static _getThemeIcon() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    return theme === 'dark' ? ICONS.theme.sun : ICONS.theme.moon;
  }

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
      .sb-brand {
        display: flex; align-items: center; gap: 10px;
        margin-bottom: 8px;
      }
      .sb-logo-mark {
        display: block; width: 34px; height: 34px; flex-shrink: 0;
      }
      .sb-wordmark {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        font-size: 22px; font-weight: 800; letter-spacing: -0.02em;
        color: var(--color-text-primary, #F1F5F9);
        white-space: nowrap;
      }
      /* Sidebar recolhida (80px): só o emblema, centralizado */
      body.sidebar-collapsed .sb-brand { justify-content: center; }
      body.sidebar-collapsed .sb-wordmark { display: none; }
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
        min-height: 44px;
      }
      .sb-item:hover {
        background: var(--color-surface-hover, rgba(255,255,255,0.04));
        color: var(--color-text-primary, #F2F2F2);
      }
      .sb-item.is-active {
        background: var(--color-brand-muted, rgba(139,92,246,0.12));
        color: var(--color-text-primary, #F2F2F2);
        font-weight: 600;
      }
      .sb-item.is-active::before {
        content: '';
        position: absolute;
        left: 0; top: 6px; bottom: 6px;
        width: 2px;
        border-radius: 0 2px 2px 0;
        background: var(--color-brand, #8B5CF6);
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
        background: var(--color-brand, #8B5CF6);
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
        min-height: 44px;
      }
      .sb-theme-btn:hover { background: var(--color-surface-hover, rgba(255,255,255,0.04)); color: var(--color-text-primary); }
      .sb-fab {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        width: 100%; padding: 11px 16px; border-radius: 10px; border: none;
        background: var(--color-brand, #8B5CF6); color: #fff;
        font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
        cursor: pointer; transition: background 0.15s ease, transform 0.12s ease;
      }
      .sb-fab:hover { background: var(--color-brand-hover, #6D28D9); }
      .sb-fab:active { transform: scale(0.98); }
      .sb-fab__label { white-space: nowrap; }
      .sb-collapse-btn {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 10px; border-radius: 8px; border: none;
        background: transparent;
        color: var(--color-text-muted, #777);
        font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
        cursor: pointer; transition: background 0.15s ease, color 0.15s ease; width: 100%;
        min-height: 44px;
      }
      .sb-collapse-btn:hover { background: var(--color-surface-hover, rgba(255,255,255,0.04)); color: var(--color-text-primary); }
      .sb-collapse-btn .sb-item__icon { transition: transform 0.2s ease; }

      /* ── SIDEBAR RECOLHIDA (desktop, 72px) ── */
      /* class beats element selector, so este override vence o body{240px} do shell.
         No mobile (body display:block) grid-template-columns é ignorado. */
      body { transition: grid-template-columns 0.2s ease; }
      body.sidebar-collapsed { grid-template-columns: 72px 1fr; }
      body.sidebar-collapsed .sb-inner { padding-left: 8px; padding-right: 8px; }
      body.sidebar-collapsed .sb-item__label,
      body.sidebar-collapsed .sb-group__label,
      body.sidebar-collapsed .sb-subtitle,
      body.sidebar-collapsed .sb-footer span:not(.sb-item__icon) { display: none; }
      body.sidebar-collapsed .sb-item,
      body.sidebar-collapsed .sb-theme-btn,
      body.sidebar-collapsed .sb-collapse-btn,
      body.sidebar-collapsed .sb-fab {
        justify-content: center; gap: 0; padding-left: 0; padding-right: 0;
      }
      body.sidebar-collapsed .sb-collapse-btn .sb-item__icon { transform: rotate(180deg); }
      body.sidebar-collapsed .sb-group { margin-top: 8px; }
      /* Badge de check-in: sem label, ancora no canto do ícone */
      body.sidebar-collapsed .sb-item { position: relative; }
      body.sidebar-collapsed .sb-badge { position: absolute; top: 7px; right: 9px; }

      /* ── BOTTOM NAV ── */
      #bottom-nav {
        background: color-mix(in srgb, var(--color-bg-primary, #0A0C10) 88%, transparent);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid var(--color-border, rgba(255,255,255,0.06));
        display: flex;
        align-items: center;
        justify-content: space-around;
        box-shadow: 0 -30px 40px -10px rgba(0,0,0,0.7);
        transition: transform 0.25s ease, visibility 0.25s ease;
        padding-bottom: env(safe-area-inset-bottom);
      }
      /* Desktop: esconder bottom nav completamente.
         Deve casar com o breakpoint do shell (index.html @media max-width:859px,
         que mostra a sidebar a partir de 860px). Usar 768 aqui criava uma zona
         morta 768–859px sem sidebar (escondida pelo shell) nem bottom-nav. */
      @media (min-width: 860px) {
        #bottom-nav { display: none !important; }
      }
      /* Quando escondido no scroll: translateY + visibility para eliminar artefato do blur */
      #bottom-nav.bn--hidden {
        transform: translateY(100%);
        visibility: hidden;
      }
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
      .bn-item:focus-visible {
        outline: none;
        color: var(--color-brand, #8B5CF6);
        box-shadow: inset 0 0 0 2px var(--color-brand, #8B5CF6), inset 0 0 0 4px var(--color-bg-primary, #0A0C10);
        border-radius: 8px;
      }
      .bn-item.is-active { color: var(--color-brand, #8B5CF6); }
      .bn-item.is-active::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 3px;
        background: var(--color-brand, #8B5CF6);
        border-radius: 2px;
      }
      .bn-item--featured { flex: 0 0 68px; }
      .bn-item--featured .bn-icon {
        width: 48px; height: 48px; border-radius: 50%;
        background: var(--color-brand, #8B5CF6);
        display: flex; align-items: center; justify-content: center;
        color: #fff;
        box-shadow: var(--shadow-brand, 0 4px 14px rgba(139,92,246,0.45));
        transform: translateY(-8px);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .bn-item--featured:active .bn-icon { transform: translateY(-5px) scale(0.95); }
      .bn-item--featured.is-active .bn-icon { box-shadow: 0 0 0 1px rgba(139,92,246,0.3), 0 6px 24px rgba(139,92,246,0.6); }
      .bn-icon {
        width: 22px; height: 22px;
        display: flex; align-items: center; justify-content: center;
      }
      .bn-label { line-height: 1; }
      .bn-badge {
        position: absolute; top: 8px; right: calc(50% - 16px);
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--color-brand, #8B5CF6);
        border: 2px solid var(--color-bg-primary, #0A0C10);
      }

      /* ── MOBILE TOPBAR ── */
      #mobile-topbar {
        background: color-mix(in srgb, var(--color-bg-primary, #0A0C10) 92%, transparent);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.07));
        display: none;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
      }
      .mt-logo-img {
        display: block;
        height: 24px;
        width: auto;
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
        background: var(--color-brand-muted, rgba(139,92,246,0.12));
        border: 1.5px solid var(--color-brand, #8B5CF6);
        color: var(--color-brand, #8B5CF6);
        font-size: 12px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
      }

      /* ── MOBILE "MAIS" DRAWER ── */
      #nav-drawer { position: fixed; inset: 0; z-index: 300; }
      #nav-drawer[hidden] { display: none; }
      .nav-drawer__backdrop {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.55);
        opacity: 0; transition: opacity .25s ease;
      }
      #nav-drawer.is-open .nav-drawer__backdrop { opacity: 1; }
      .nav-drawer__sheet {
        position: absolute; left: 0; right: 0; bottom: 0;
        background: var(--color-surface-primary, #13161C);
        border-top: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 22px 22px 0 0;
        padding: 10px 16px calc(20px + env(safe-area-inset-bottom));
        box-shadow: 0 -16px 48px -12px rgba(0,0,0,0.75);
        transform: translateY(100%);
        transition: transform .28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #nav-drawer.is-open .nav-drawer__sheet { transform: translateY(0); }
      .nav-drawer__handle {
        width: 40px; height: 4px; border-radius: 999px;
        background: var(--color-border-strong, rgba(255,255,255,0.18));
        margin: 4px auto 16px;
      }
      .nav-drawer__grid {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
      }
      .nd-item {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 8px; padding: 16px 8px;
        background: var(--color-surface-secondary, #191D25);
        border: 1px solid var(--color-border, rgba(255,255,255,0.06));
        border-radius: 16px;
        color: var(--color-text-secondary, #9A9A9A);
        cursor: pointer; font-family: inherit;
        transition: background .15s ease, color .15s ease, transform .15s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .nd-item:active { transform: scale(0.96); }
      .nd-item:hover { background: var(--color-surface-hover, rgba(255,255,255,0.05)); color: var(--color-text-primary, #F1F5F9); }
      .nd-item__icon { display: flex; color: var(--color-brand, #8B5CF6); }
      .nd-item__label { font-size: 12px; font-weight: 600; }
      @media (prefers-reduced-motion: reduce) {
        .nav-drawer__sheet, .nav-drawer__backdrop { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }
}
