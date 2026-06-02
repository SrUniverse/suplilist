import { Nav } from './nav.js';
import { logger } from '../utils/logger.js';

export class Router {
  constructor(routes, container) {
    this.routes = routes;
    this.container = container;
    this.currentPage = null;
    // P8: token incrementado a cada navegação; descarta loads de navegações antigas
    this._navigationToken = 0;
    this._popstateHandler = () => this.handleRoute();
    window.addEventListener('popstate', this._popstateHandler);
  }

  destroy() {
    window.removeEventListener('popstate', this._popstateHandler);
  }

  start() {
    this.handleRoute();
  }

  navigate(path) {
    window.history.pushState(null, null, path);
    // Dispatch popstate so all listeners (landing mode, Nav.show/hide, title) fire
    // consistently — same pipeline used by nav clicks and browser back/forward.
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  matchRoute(pathname) {
    // Strip query string and normalize
    const [path, query] = pathname.split('?');
    const normalizedPath = path || '/';
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
      return;
    }

    const { route, params } = match;

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

      if (typeof window.plausible === 'function') {
        window.plausible('pageview', {
          u: 'https://suplilist.com' + pathname + search,
        });
      }
    } catch (mountErr) {
      logger.error('[Router] page load/mount error:', mountErr);
      this.container.innerHTML = '<p style="color:var(--color-error);padding:2rem;">Erro ao carregar a página. Tente novamente.</p>';
    }

    Nav.updateActive(pathname);
  }
}

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
