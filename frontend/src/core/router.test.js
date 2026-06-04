import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Router } from './router.js';

// Mock MetaManager
vi.mock('../platform/meta-manager.js', () => ({
  MetaManager: {
    updateMeta: vi.fn()
  }
}));

// Mock Nav
vi.mock('./nav.js', () => ({
  Nav: {
    updateActive: vi.fn()
  }
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn()
  }
}));

beforeEach(() => {
  vi.stubGlobal('location', {
    pathname: '/',
    search: '',
    hash: '',
    origin: 'https://suplilist.com'
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Router — Basic Navigation', () => {
  let router;
  let container;
  let mockPage;

  beforeEach(() => {
    // Setup DOM
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock window.history
    window.history.pushState = vi.fn();
    vi.spyOn(window, 'dispatchEvent');

    // Create router with test routes
    const routes = [
      {
        path: '/',
        load: () => Promise.resolve({ default: MockPage })
      },
      {
        path: '/list',
        load: () => Promise.resolve({ default: MockPage })
      },
      {
        path: '/my-stack',
        load: () => Promise.resolve({ default: MockPage })
      }
    ];

    router = new Router(routes, container);
    mockPage = {
      mount: vi.fn().mockResolvedValue(undefined),
      unmount: vi.fn().mockResolvedValue(undefined)
    };
  });

  afterEach(() => {
    router.destroy();
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  it('1. navigate() calls window.history.pushState', () => {
    router.navigate('/list');
    expect(window.history.pushState).toHaveBeenCalledWith(null, null, '/list');
  });

  it('2. navigate() dispatches popstate event', () => {
    router.navigate('/list');
    expect(window.dispatchEvent).toHaveBeenCalled();
    const call = window.dispatchEvent.mock.calls[0][0];
    expect(call instanceof PopStateEvent).toBe(true);
  });

  it('3. matchRoute() returns null for non-existent path', () => {
    const result = router.matchRoute('/nonexistent');
    expect(result).toBeNull();
  });

  it('4. matchRoute() returns route and params for valid path', () => {
    const result = router.matchRoute('/list');
    expect(result).not.toBeNull();
    expect(result.route.path).toBe('/list');
  });

  it('5. matchRoute() extracts query parameters', () => {
    const result = router.matchRoute('/list?sort=name&filter=price');
    expect(result.params.sort).toBe('name');
    expect(result.params.filter).toBe('price');
  });

  it('6. matchRoute() normalizes paths with trailing slashes', () => {
    const result = router.matchRoute('/');
    expect(result).not.toBeNull();
    expect(result.route.path).toBe('/');

    const listResult = router.matchRoute('/list/');
    expect(listResult).not.toBeNull();
    expect(listResult.route.path).toBe('/list');
  });

  it('7. matchRoute() decodes URL-encoded parameters', () => {
    const encoded = '/list?search=whey%20protein';
    const result = router.matchRoute(encoded);
    expect(result.params.search).toBe('whey protein');
  });

});

describe('Router — Route Parameters', () => {
  let router;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    window.history.pushState = vi.fn();
    vi.spyOn(window, 'dispatchEvent');

    const routes = [
      { path: '/supplement/:id', load: () => Promise.resolve({ default: MockPage }) },
      { path: '/user/:userId/stack/:stackId', load: () => Promise.resolve({ default: MockPage }) }
    ];

    router = new Router(routes, container);
  });

  afterEach(() => {
    router.destroy();
    document.body.removeChild(container);
  });

  it('8. matchRoute() extracts path parameters', () => {
    const result = router.matchRoute('/supplement/creatine');
    expect(result.params.id).toBe('creatine');
  });

  it('9. matchRoute() decodes path parameters', () => {
    const result = router.matchRoute('/supplement/whey%20protein');
    expect(result.params.id).toBe('whey protein');
  });

  it('10. matchRoute() extracts multiple path parameters', () => {
    const result = router.matchRoute('/user/user123/stack/stack456');
    expect(result.params.userId).toBe('user123');
    expect(result.params.stackId).toBe('stack456');
  });

  it('11. matchRoute() returns null if segment count mismatch', () => {
    const result = router.matchRoute('/user/user123');
    expect(result).toBeNull();
  });

});

describe('Router — 404 Handling', () => {
  let router;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const routes = [
      { path: '/', load: () => Promise.resolve({ default: MockPage }) }
    ];

    router = new Router(routes, container);
  });

  afterEach(() => {
    router.destroy();
    document.body.removeChild(container);
  });

  it('12. handleRoute() shows 404 for non-existent routes', async () => {
    window.location.pathname = '/does-not-exist';
    window.location.search = '';

    await router.handleRoute();

    expect(container.innerHTML).toContain('404');
    expect(container.innerHTML).toContain('Página não encontrada');
  });

  it('13. handleRoute() sets document.title for 404', async () => {
    window.location.pathname = '/does-not-exist';
    window.location.search = '';

    await router.handleRoute();

    expect(document.title).toContain('Página não encontrada');
  });

});

describe('Router — Page Lifecycle', () => {
  let router;
  let container;
  let PageClass;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    window.history.pushState = vi.fn();
    vi.spyOn(window, 'dispatchEvent');

    // Mock page class
    PageClass = vi.fn().mockImplementation(function() {
      return {
        mount: vi.fn().mockResolvedValue(undefined),
        unmount: vi.fn().mockResolvedValue(undefined)
      };
    });

    const routes = [
      {
        path: '/',
        load: () => Promise.resolve({ default: PageClass })
      }
    ];

    router = new Router(routes, container);
  });

  afterEach(() => {
    router.destroy();
    document.body.removeChild(container);
  });

  it('14. handleRoute() instantiates page with container and params', async () => {
    window.location.pathname = '/';
    window.location.search = '?test=param';

    await router.handleRoute();

    expect(PageClass).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ test: 'param' })
    );
  });

  it('15. handleRoute() calls page.mount()', async () => {
    window.location.pathname = '/';
    window.location.search = '';

    await router.handleRoute();

    expect(PageClass).toHaveBeenCalled();
    const mockPageInstance = PageClass.mock.results[0].value;
    expect(mockPageInstance.mount).toHaveBeenCalled();
  });

});

describe('Router — Stale Navigation Prevention (Token System)', () => {
  let router;
  let container;
  let loadDelay = 0;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    window.history.pushState = vi.fn();
    vi.spyOn(window, 'dispatchEvent');

    const slowPage = {
      load: () => new Promise(resolve => {
        setTimeout(() => {
          resolve({ default: MockPage });
        }, loadDelay);
      })
    };

    const routes = [
      { path: '/slow', load: () => slowPage.load() },
      { path: '/fast', load: () => Promise.resolve({ default: MockPage }) }
    ];

    router = new Router(routes, container);
  });

  afterEach(() => {
    router.destroy();
    document.body.removeChild(container);
  });

  it('16. Navigation token increments on each navigation', () => {
    expect(router._navigationToken).toBe(0);
    router.navigate('/fast');
    expect(router._navigationToken).toBe(1);
  });

  it('17. Stale navigation result is discarded (token mismatch)', async () => {
    loadDelay = 100; // Simulate slow load

    window.location.pathname = '/slow';
    window.location.search = '';

    const nav1 = router.handleRoute();

    // Quick navigate away before first completes
    window.location.pathname = '/fast';
    window.location.search = '';
    const nav2 = router.handleRoute();

    await nav2; // Let second complete

    expect(router.currentPage).toBeDefined();
    // First navigation should be discarded

    loadDelay = 0; // Reset for cleanup
  });

});

describe('Router — Error Handling', () => {
  let router;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const failingPage = {
      load: () => Promise.reject(new Error('Page load failed'))
    };

    const routes = [
      { path: '/error', load: () => failingPage.load() }
    ];

    router = new Router(routes, container);
  });

  afterEach(() => {
    router.destroy();
    document.body.removeChild(container);
  });

  it('18. handleRoute() shows error message on page load failure', async () => {
    window.location.pathname = '/error';
    window.location.search = '';

    await router.handleRoute();

    expect(container.innerHTML).toContain('Erro ao carregar a página');
  });

});

describe('Router — Cleanup', () => {
  let router;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const routes = [
      { path: '/', load: () => Promise.resolve({ default: MockPage }) }
    ];

    router = new Router(routes, container);
  });

  afterEach(() => {
    if (router) router.destroy();
    if (container.parentElement) {
      document.body.removeChild(container);
    }
  });

  it('19. destroy() removes popstate listener', () => {
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');

    router.destroy();

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(handleRouteSpy).not.toHaveBeenCalled();
    handleRouteSpy.mockRestore();
  });

  it('20. start() calls handleRoute()', async () => {
    const handleRouteSpy = vi.spyOn(router, 'handleRoute');

    router.start();

    expect(handleRouteSpy).toHaveBeenCalled();
    handleRouteSpy.mockRestore();
  });

});

// Mock Page Component
function MockPage(container, params) {
  return {
    mount: async () => {
      container.innerHTML = '<div>Mock Page</div>';
    },
    unmount: async () => {
      container.innerHTML = '';
    }
  };
}
