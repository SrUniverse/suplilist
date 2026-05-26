/**
 * @fileoverview SidebarNav v3.0 — SupliList.
 * 7 itens confirmados por lista.png.
 * Badges dinâmicos: "Lista" usa supplementRepo.getAll().length,
 * "Minha Stack" usa inventoryRepo.getAll() key count.
 * Integração com PageRouter via router.navigate(route).
 *
 * @author SupliList Team
 * @version 3.0.0
 */

import { eventBus }       from '../core/eventbus.js';
import { ErrorBoundary }  from '../core/error-boundary.js';
import { logger }         from '../utils/logger.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';
import { inventoryRepo }  from '../features/inventory/inventoryRepo.js';
import { stateManager }   from '../core/state-manager.js';
import { settingsRepo }   from '../features/settings/settingsRepo.js';

/* ══════════════════════════════════════════════════════════════
   CONFIGURAÇÃO DOS 7 ITENS (confirmados por lista.png)
   ══════════════════════════════════════════════════════════════ */

/**
 * Definição estática dos itens de navegação.
 * Rotas sem # — o router normaliza internamente.
 * badge: null → oculto; número/string → exibido.
 */
const NAV_ITEMS = [
  { id: 'home',      icon: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>',  label: 'Home',       route: '/home',      badge: null },
  { id: 'list',      icon: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>',  label: 'List',        route: '/list',      badge: null },
  { id: 'my-stack',  icon: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>',  label: 'My Stack',  route: '/my-stack',  badge: null },
  { id: 'favorites', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>',  label: 'Favorites',    route: '/favorites', badge: null },
  { id: 'history',   icon: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>', label: 'History',      route: '/history',    badge: null },
  { id: 'settings',  icon: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',  label: 'Settings',     route: '/settings',   badge: null },
];

/* ══════════════════════════════════════════════════════════════
   HELPERS INTERNOS
   ══════════════════════════════════════════════════════════════ */

/**
 * Normaliza uma rota para o formato canônico '/xxx'.
 * Aceita: '/list', '#/list', 'list', '/#/list'.
 * @param {string} route
 * @returns {string}
 */
function _normalizeRoute(route) {
  let r = (route || '/home').trim();
  // remove hash e / inicial duplicados
  r = r.replace(/^\/?(#\/?)/, '/');
  if (!r.startsWith('/')) r = '/' + r;
  return r;
}

/**
 * Constrói um elemento <button> de nav-item.
 * @param {{ id, icon, label, route, badge }} item
 * @param {string} activeRoute — rota normalizada ativa
 * @returns {HTMLButtonElement}
 */
function _buildNavItem(item, activeRoute) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-item';
  btn.dataset.id    = item.id;
  btn.dataset.route = item.route;
  btn.setAttribute('aria-label', item.label);
  btn.setAttribute('title', item.label);

  if (_normalizeRoute(item.route) === activeRoute) {
    btn.classList.add('active');
  }

  // Ícone
  const iconEl = document.createElement('span');
  iconEl.className   = 'nav-icon';
  if (item.icon.includes('<svg')) {
    iconEl.innerHTML = item.icon;
  } else {
    iconEl.textContent = item.icon;
  }
  iconEl.setAttribute('aria-hidden', 'true');

  // Label
  const labelEl = document.createElement('span');
  labelEl.className   = 'nav-label';
  labelEl.textContent = item.label;

  // Badge
  const badgeEl = document.createElement('span');
  badgeEl.className   = 'nav-badge';
  badgeEl.dataset.badge = item.id;
  if (item.badge) {
    badgeEl.textContent  = item.badge;
    badgeEl.style.display = 'inline-flex';
  } else {
    badgeEl.style.display = 'none';
  }

  btn.append(iconEl, labelEl, badgeEl);
  return btn;
}

/**
 * Renderiza a lista de nav-items no container.
 * @param {HTMLElement} container
 * @param {string} activeRoute — rota normalizada
 */
function _renderItems(container, activeRoute) {
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  NAV_ITEMS.forEach(item => frag.appendChild(_buildNavItem(item, activeRoute)));
  container.appendChild(frag);
}

/* ══════════════════════════════════════════════════════════════
   CLASSE PRINCIPAL
   ══════════════════════════════════════════════════════════════ */

export class SidebarNav {
  /**
   * @param {HTMLElement | string} container — `#sidebar-nav` ou o elemento em si.
   * @param {object} router — instância do PageRouter.
   */
  constructor(container, router) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.router = router;
    this._cleanupFns = [];

    if (!this.container) {
      logger.error('SidebarNav: contêiner #sidebar-nav não encontrado no DOM.');
      return;
    }

    // Bind de handlers para remoção limpa depois
    this._onNavClick          = this._onNavClick.bind(this);
    this._onRouterNavigate    = this._onRouterNavigate.bind(this);
    this._onDataChanged       = this._onDataChanged.bind(this);
  }

  /* ─── Ciclo de vida ─────────────────────────────────────── */

  /**
   * Monta o componente: renderiza itens, registra eventos.
   */
  mount() {
    if (!this.container) return;

    const current = _normalizeRoute(this.router?.getCurrentRoute?.() || '/home');

    _renderItems(this.container, current);

    // Delegação de cliques
    this.container.addEventListener('click', this._onNavClick);

    // Reatividade via EventBus
    this._cleanupFns.push(
      eventBus.on('router:navigate',  this._onRouterNavigate),
      eventBus.on('stack:updated',    this._onDataChanged),
      eventBus.on('inventory:updated', this._onDataChanged),
      eventBus.on('supplements:loaded', this._onDataChanged),
      eventBus.on('state:imported',   this._onDataChanged),
    );

    // Setup: logo adaptável, breadcrumb, tema, mobile overlay
    this._setupLogo(current);
    this._setupThemeButton();
    this._setupMobileOverlay();

    // Badges iniciais
    this._refreshBadges();

    logger.info('SidebarNav montado com 7 itens.');
  }

  /**
   * Atualiza o item ativo visualmente e o breadcrumb.
   * @param {string} route
   */
  updateActive(route) {
    if (!this.container) return;

    const clean = _normalizeRoute(route);

    this.container.querySelectorAll('.nav-item').forEach(btn => {
      const isActive = _normalizeRoute(btn.dataset.route) === clean;
      btn.classList.toggle('active', isActive);
    });

    this._updateBreadcrumb(clean);
    this._setupLogo(clean);
  }

  /**
   * Atualiza o valor de um badge de navegação.
   * @param {string} itemId — id do nav-item (ex: 'list')
   * @param {string | number | null} value — null oculta o badge
   */
  updateBadge(itemId, value) {
    if (!this.container) return;

    // Busca badge pelo data-badge (não precisa percorrer toda a árvore)
    const badgeEl = this.container.querySelector(`[data-badge="${itemId}"]`);
    if (!badgeEl) return;

    if (value != null && value !== '' && value !== 0) {
      badgeEl.textContent  = String(value);
      badgeEl.style.display = 'inline-flex';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  /**
   * Destrói o componente, removendo todos os listeners.
   */
  destroy() {
    if (this.container) {
      this.container.removeEventListener('click', this._onNavClick);
    }
    this._cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
    this._cleanupFns = [];
    logger.info('SidebarNav destruído.');
  }

  /* ─── Handlers ──────────────────────────────────────────── */

  _onNavClick(e) {
    const btn = e.target.closest('.nav-item');
    if (!btn) return;
    e.preventDefault();

    const route = btn.dataset.route;
    if (route && this.router) {
      this.router.navigate(route);
    }

    // Fecha drawer no mobile
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar?.classList.contains('open')) {
      sidebar.classList.remove('open');
      if (overlay) overlay.style.display = 'none';
    }
  }

  _onRouterNavigate({ route }) {
    this.updateActive(route);
  }

  _onDataChanged() {
    this._refreshBadges();
  }

  /* ─── Setup auxiliares ──────────────────────────────────── */

  /**
   * Atualiza logo e subtítulo conforme rota ativa.
   * @param {string} cleanRoute — rota normalizada
   */
  _setupLogo(cleanRoute) {
    const logoEl     = document.querySelector('.sidebar-logo');
    const subtitleEl = document.querySelector('.sidebar-subtitle');
    if (logoEl) {
      logoEl.textContent = 'Suplilist';
    }
    if (!subtitleEl) return;

    if (cleanRoute === '/dosage') {
      subtitleEl.textContent = 'CLINICAL ACCESS';
    } else if (cleanRoute === '/history') {
      subtitleEl.textContent = 'VITALS OPTIMIZED';
    } else {
      subtitleEl.textContent = 'PRECISION MANAGEMENT';
    }
  }

  /**
   * Recalcula os badges dinâmicos de Lista e Minha Stack.
   */
  _refreshBadges() {
    try {
      // Badge Lista → total de suplementos no catálogo
      const suppCount = supplementRepo.getAll?.()?.length ?? 53;
      this.updateBadge('list', suppCount > 0 ? suppCount : null);

      // Badge Minha Stack → itens ativos no inventário
      const invItems  = inventoryRepo.getAll?.() ?? {};
      const stackCount = Object.keys(invItems).length;
      // Fallback: lê stack.items do stateManager
      const stackState = stateManager.getState('stack') || {};
      const stackItems = stackState.items || [];
      const count = stackCount > 0 ? stackCount : stackItems.length;
      this.updateBadge('my-stack', count > 0 ? count : null);
    } catch (err) {
      logger.error('SidebarNav: erro ao atualizar badges.', err);
    }
  }

  /**
   * Atualiza o breadcrumb no top-bar (se existir).
   * @param {string} cleanRoute
   */
  _updateBreadcrumb(cleanRoute) {
    const el = document.getElementById('topbar-breadcrumb');
    if (!el) return;

    const matched = NAV_ITEMS.find(i => _normalizeRoute(i.route) === cleanRoute);
    const label   = matched ? matched.label : 'App';

    el.innerHTML = `
      <span style="font-size:12px;color:var(--t3);">SupliList</span>
      <span style="color:var(--t3);margin:0 4px;">/</span>
      <span style="font-size:15px;font-weight:700;color:var(--t1);">${label}</span>
    `;
  }

  /**
   * Conecta o botão de tema (pode existir no HTML ou ser criado aqui).
   */
  _setupThemeButton() {
    // O app.html já tem #btn-theme-toggle — apenas conecta o click
    const themeBtn = document.getElementById('btn-theme-toggle')
                  || document.getElementById('btn-sidebar-theme');
    if (!themeBtn) return;

    // Inicializa o texto com base no tema ativo
    const currentTheme = settingsRepo.getSetting('theme') || 'dark';
    themeBtn.textContent = currentTheme === 'dark' ? '🌐 TEMA' : '🌙 TEMA';

    const handleTheme = () => {
      const current = settingsRepo.getSetting('theme') || 'dark';
      const next    = current === 'dark' ? 'light' : 'dark';

      settingsRepo.setSetting('theme', next);

      eventBus.emit('toast:show', {
        message: `Tema ${next === 'dark' ? '🌙 Escuro' : '☀️ Claro'} ativado!`,
        type: 'success',
      });
    };

    // Atualiza reativamente se o tema mudar (inclusive por outro componente)
    const onSettingsChanged = ({ key, value }) => {
      if (key === 'theme') {
        themeBtn.textContent = value === 'dark' ? '🌐 TEMA' : '🌙 TEMA';
      }
    };

    themeBtn.addEventListener('click', handleTheme);
    const unsub = eventBus.on('settings:changed', onSettingsChanged);

    this._cleanupFns.push(
      () => themeBtn.removeEventListener('click', handleTheme),
      unsub
    );
  }

  /**
   * Conecta hamburger + overlay para mobile drawer.
   */
  _setupMobileOverlay() {
    const sidebar    = document.getElementById('sidebar');
    const overlay    = document.getElementById('sidebar-overlay');
    const hamburger  = document.getElementById('btn-hamburger');

    if (!sidebar) return;

    // Hamburger toggle
    if (hamburger) {
      const onHamburger = (e) => {
        e.stopPropagation();
        const isOpen = sidebar.classList.toggle('open');
        if (overlay) overlay.style.display = isOpen ? 'block' : 'none';
      };
      hamburger.addEventListener('click', onHamburger);
      this._cleanupFns.push(() => hamburger.removeEventListener('click', onHamburger));
    }

    // Overlay fecha drawer
    if (overlay) {
      const onOverlay = () => {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
      };
      overlay.addEventListener('click', onOverlay);
      this._cleanupFns.push(() => overlay.removeEventListener('click', onOverlay));
    }

    // Resize: esconde hamburger em telas grandes
    const onResize = () => {
      if (!hamburger) return;
      const isMobile = window.innerWidth < 768;
      hamburger.style.display = isMobile ? 'flex' : 'none';
      if (!isMobile) {
        sidebar.classList.remove('open');
        if (overlay) overlay.style.display = 'none';
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    this._cleanupFns.push(() => window.removeEventListener('resize', onResize));
  }
}
