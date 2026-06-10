import { Nav } from './nav.js';
import { logger } from '../utils/logger.js';
import { MetaManager } from '../platform/meta-manager.js';
import { identityService } from '../platform/identity-service.js';
import { stateManager } from '../state/state-manager.js';
import { authGuard } from '../features/auth/auth-guard.js';


/**
 * Router — Client-side route handler
 * Manages navigation, lazy-loaded page components, SEO metadata, and stale navigation prevention
 */
export class Router {
  /**
   * Create a new Router instance
   * @param {Array<Object>} routes - Route definitions with {path, load, component}
   * @param {HTMLElement} container - DOM element where pages mount
   * @throws {Error} If container is not a valid HTMLElement
   */
  constructor(routes, container) {
    this.routes = routes;
    this.container = container;
    this.currentPage = null;
    // P8: token incrementado a cada navegação; descarta loads de navegações antigas
    this._navigationToken = 0;
    this._popstateHandler = () => this.handleRoute();
    window.addEventListener('popstate', this._popstateHandler);
  }

  /**
   * Clean up router (remove event listeners)
   * Call on app unmount or before route reconstruction
   * @returns {void}
   */
  destroy() {
    window.removeEventListener('popstate', this._popstateHandler);
  }

  /**
   * Start the router — handle current URL and mount initial page
   * Call once after router is ready
   * @returns {void}
   */
  start() {
    this.handleRoute();
  }

  /**
   * Navigate to a new path — pushes to history and triggers route handler
   * @param {string} path - Destination path (e.g., '/list', '/my-stack?tab=goals')
   * @returns {void}
   */
  navigate(path) {
    window.history.pushState(null, null, path);
    // Dispatch popstate so all listeners (landing mode, Nav.show/hide, title) fire
    // consistently — same pipeline used by nav clicks and browser back/forward.
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /**
   * Match URL pathname against route patterns — extracts params and query string
   * @param {string} pathname - Full pathname with optional query string (e.g., '/list?category=Protein&q=whey')
   * @returns {?Object} {route, params} or null if no match
   */
  matchRoute(pathname) {
    // Strip query string and normalize
    const [path, query] = pathname.split('?');
    let normalizedPath = path || '/';
    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    const queryParams = {};
    if (query) {
      query.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) queryParams[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    for (const route of this.routes) {
      const params = matchPath(route.path, normalizedPath);
      if (params !== null) {
        return { route, params: { ...params, ...queryParams } };
      }
    }
    return null;
  }

  /**
   * Handle a route change — loads page component, mounts it, updates SEO
   * Implements stale navigation prevention via token system
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Logged but not re-thrown; page shows error UI instead
   */
  async handleRoute() {
    // P8: incrementa token a cada navegação; qualquer load anterior que terminar
    // após este ponto será descartado sem montar.
    const navigationToken = ++this._navigationToken;

    const pathname = window.location.pathname || '/';
    const search = window.location.search || '';
    const match = this.matchRoute(pathname + search);

    if (!match) {
      if (this.currentPage && typeof this.currentPage.unmount === 'function') {
        try { await this.currentPage.unmount(); } catch (_) { /* ignore unmount errors */ }
      }
      this.container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--color-text-secondary);"><p style="font-size:2rem;margin-bottom:1rem;">404</p><p>Página não encontrada.</p></div>';
      this.currentPage = null;
      // Update meta tags for 404 page
      document.title = 'Página não encontrada | SupliList';
      MetaManager.updateMeta(pathname);
      return;
    }

    const { route, params } = match;

    // ── Auth guard ──────────────────────────────────────
    // Fast path: session probe already settled — no need to await.
    if (!identityService.isInitializing()) {
      const user = stateManager.get('user');
      if (!authGuard.checkAccess(pathname, user)) {
        return;
      }
    } else {
      // Slow path: session probe is still in-flight.
      // Show a skeleton so the user sees something, then await the probe result.
      this._renderAuthSkeleton();

      await identityService.isReady();

      // Discard if the user navigated away while we were waiting
      if (navigationToken !== this._navigationToken) return;

      const user = stateManager.get('user');
      if (!authGuard.checkAccess(pathname, user)) {
        return;
      }
    }
    // ─────────────────────────────────────────────────────────────

    // Guard unmount — never abort a transition due to unmount errors
    if (this.currentPage && typeof this.currentPage.unmount === 'function') {
      try {
        await this.currentPage.unmount();
      } catch (unmountErr) {
        logger.error('[Router] unmount error (continuing transition):', unmountErr);
      }
    }

    this.container.innerHTML = '';
    this.currentPage = null;

    try {
      const mod = await route.load();

      // P8: se outra navegação ocorreu enquanto aguardávamos o load, descarta este resultado
      if (navigationToken !== this._navigationToken) {
        logger.warn('[Router] Stale navigation discarded (token mismatch).');
        return;
      }

      const PageClass = mod.default;
      this.currentPage = new PageClass(this.container, params);
      await this.currentPage.mount();

      // P8: verifica novamente após mount (mount também é assíncrono)
      if (navigationToken !== this._navigationToken) {
        logger.warn('[Router] Stale navigation after mount, unmounting.');
        try { await this.currentPage.unmount?.(); } catch (_) { /* ignore stale unmount errors */ }
        this.currentPage = null;
        return;
      }

      // Update meta tags for SEO
      MetaManager.updateMeta(pathname);
    } catch (mountErr) {
      logger.error('[Router] page load/mount error:', mountErr);
      this.container.innerHTML = '<p style="color:var(--color-error);padding:2rem;">Erro ao carregar a página. Tente novamente.</p>';
    }

    Nav.updateActive(pathname);
  }

  /**
   * Render a minimal skeleton UI while awaiting the session probe on a deep link.
   * Replaces the container content — not the full page shell (nav/sidebar stay).
   * Uses inline styles so no CSS dependency is needed at this point in boot.
   *
   * @private
   */
  _renderAuthSkeleton() {
    this.container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        gap: 1.5rem;
        color: var(--color-text-secondary, #888);
      ">
        <div style="
          width: 40px;
          height: 40px;
          border: 3px solid var(--color-border, #333);
          border-top-color: var(--color-accent, #7c3aed);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        "></div>
        <p style="font-size: 0.9rem; margin: 0;">Verificando sessão…</p>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    `;
  }
}

/**
 * Match a URL path against a route pattern — supports named parameters
 * @param {string} routePath - Route pattern (e.g., '/list/:category' or '/')
 * @param {string} actualPath - Actual URL path (e.g., '/list/Protein')
 * @returns {?Object} Extracted params {category: 'Protein'} or null if no match
 * @example
 * matchPath('/list/:category', '/list/Protein') → {category: 'Protein'}
 * matchPath('/list/:category', '/list/') → null
 */
function matchPath(routePath, actualPath) {
  const routeSegments = routePath.replace(/^\//, '').split('/');
  const actualSegments = actualPath.replace(/^\//, '').split('/');

  if (routeSegments.length !== actualSegments.length) return null;

  const params = {};
  for (let i = 0; i < routeSegments.length; i++) {
    const r = routeSegments[i];
    const a = actualSegments[i];
    if (r.startsWith(':')) {
      params[r.slice(1)] = decodeURIComponent(a);
    } else if (r !== a) {
      return null;
    }
  }

  return params;
}
