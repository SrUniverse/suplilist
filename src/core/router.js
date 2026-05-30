export class Router {
  constructor(routes, container) {
    this.routes = routes;
    this.container = container;
    this.currentPage = null;

    window.addEventListener('popstate', () => this.handleRoute());
  }

  start() {
    this.handleRoute();
  }

  navigate(path) {
    window.history.pushState(null, null, path);
    this.handleRoute();
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
    const pathname = window.location.pathname || '/';
    const search = window.location.search || '';
    const match = this.matchRoute(pathname + search);

    if (!match) return;

    const { route, params } = match;

    // Guard unmount — never abort a transition due to unmount errors
    if (this.currentPage && typeof this.currentPage.unmount === 'function') {
      try {
        await this.currentPage.unmount();
      } catch (unmountErr) {
        console.error('[Router] unmount error (continuing transition):', unmountErr);
      }
    }

    this.container.innerHTML = '';
    this.currentPage = null;

    try {
      const mod = await route.load();
      const PageClass = mod.default;
      this.currentPage = new PageClass(this.container, params);
      await this.currentPage.mount();
      if (typeof window.plausible === 'function') {
        const pathname = window.location.pathname;
        const search = window.location.search;
        window.plausible('pageview', {
          u: 'https://suplilist.com' + pathname + search,
        });
      }
    } catch (mountErr) {
      console.error('[Router] page load/mount error:', mountErr);
      this.container.innerHTML = '<p style="color:var(--color-error);padding:2rem;">Erro ao carregar a página. Tente novamente.</p>';
    }

    this.updateNav(pathname);
  }

  updateNav(pathname) {
    const path = pathname.replace(/^\//, '') || 'home';
    document.querySelectorAll('.nav-item').forEach(el => {
      const route = el.dataset.route || el.getAttribute('href') || '';
      const navPath = route.replace(/^\//, '');
      el.classList.toggle('active', navPath === path);
    });
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
