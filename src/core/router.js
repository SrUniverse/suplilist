/**
 * Router v4.0 — SupliList
 * Hash-based SPA router. Mounts and unmounts page classes.
 * Highly robust: supports both v3.0 functional pages (with export render())
 * and v4.0 modular Page Classes (with mount()/unmount() lifecycle).
 *
 * Usage:
 *   import { Router } from './router.js';
 *   const router = new Router('#app', routes);
 *   router.init();
 */

export class Router {
  /**
   * @param {string} containerSelector - CSS selector of the main content container
   * @param {Array<{ path: string, load: () => Promise<any> }>} routes
   */
  constructor(containerSelector, routes) {
    this._container = document.querySelector(containerSelector);
    this._routes = routes;
    this._current = null; // current page instance
    this._navItems = null;
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
    const hash = window.location.hash.replace('#', '') || '/home';
    // Match dynamic segments: '/supplement/creatina' matches '/supplement/:id'
    const match = this._routes.find(r => this._matchPath(r.path, hash));

    if (!match) {
      this.navigate('/home');
      return;
    }

    // Unmount current page
    if (this._current?.unmount) {
      try { this._current.unmount(); } catch (e) { console.warn('[Router] unmount error:', e); }
    } else if (this._current?.destroy) {
      try { this._current.destroy(); } catch (e) { console.warn('[Router] destroy error:', e); }
    }
    this._current = null;

    // Clear container
    if (this._container) {
      this._container.innerHTML = '';
    }

    try {
      const pageModule = await match.load();
      if (this._container) {
        // Add entrance animation
        this._container.classList.remove('page-enter');
        void this._container.offsetWidth; // force reflow
        this._container.classList.add('page-enter');

        // Check for Class Component (v4.0 standard)
        let TargetComponent = pageModule;
        if (pageModule && pageModule.default) {
          TargetComponent = pageModule.default;
        } else if (pageModule) {
          TargetComponent = Object.values(pageModule).find(e =>
            typeof e === 'function' &&
            e.prototype &&
            (typeof e.prototype.mount === 'function' || typeof e.prototype.init === 'function')
          ) || TargetComponent;
        }

        const isClass = typeof TargetComponent === 'function' &&
          TargetComponent.prototype &&
          (typeof TargetComponent.prototype.mount === 'function' ||
            typeof TargetComponent.prototype.unmount === 'function' ||
            typeof TargetComponent.prototype.init === 'function');

        if (isClass) {
          const PageClass = TargetComponent;
          this._current = new PageClass(this._container);
          if (this._current.mount) await this._current.mount();
        } else {
          // Fallback to legacy functional/render module (v3.0 standard)
          let html = '';
          if (typeof pageModule.render === 'function') {
            html = pageModule.render(this._container);
          } else if (typeof TargetComponent === 'function') {
            html = TargetComponent(this._container);
          } else if (TargetComponent && typeof TargetComponent.render === 'function') {
            html = TargetComponent.render(this._container);
          } else if (typeof pageModule === 'string') {
            html = pageModule;
          }

          if (html instanceof Promise) {
            html = await html;
          }

          if (typeof html === 'string') {
            this._container.innerHTML = html;
          }
        }
      }
    } catch (err) {
      console.error('[Router] Failed to load page:', err);
      if (this._container) {
        this._container.innerHTML = `
          <div style="padding:40px;text-align:center;color:#888">
            <p style="font-size:32px">⚠️</p>
            <p>Erro ao carregar página. <a href="#/home" style="color:#7C3AED">Voltar</a></p>
          </div>
        `;
      }
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
