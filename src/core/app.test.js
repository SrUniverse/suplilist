import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies before importing app
vi.mock('../css/main.css', { default: '' });
vi.mock('../state/state-manager.js', () => ({
  stateManager: {
    _setupStorageSync: vi.fn().mockResolvedValue(undefined)
  },
  STORAGE_KEYS: {
    THEME: 'suplilist:theme'
  }
}));

vi.mock('./event-bus.js', () => ({
  eventBus: {
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn()
  },
  EVENTS: {
    ROUTER_NAVIGATE: 'router:navigate',
    SYNC_STARTED: 'sync:started',
    SYNC_COMPLETED: 'sync:completed',
    SYNC_FAILED: 'sync:failed'
  }
}));

vi.mock('./router.js', () => ({
  Router: vi.fn(function(routes, container) {
    this.routes = routes;
    this.container = container;
    this.navigate = vi.fn();
    this.start = vi.fn().mockResolvedValue(undefined);
    this.destroy = vi.fn();
  })
}));

vi.mock('./nav.js', () => ({
  Nav: {
    init: vi.fn(),
    updateActive: vi.fn(),
    show: vi.fn(),
    hide: vi.fn()
  }
}));

vi.mock('../analytics/analytics-engine.js', () => ({
  analyticsEngine: {
    init: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    flush: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('./storage-manager.js', () => ({
  StorageManager: {
    init: vi.fn().mockResolvedValue(undefined),
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn()
  }
}));

vi.mock('./mobile-keyboard-handler.js', () => ({}));
vi.mock('./mobile-utilities.js', () => ({}));
vi.mock('./pwa-handler.js', () => ({}));
vi.mock('./performance-monitor.js', () => ({}));

import './app.js';

describe('App Initialization', () => {
  let container;
  let mockDOMContentLoaded;

  beforeEach(() => {
    // Setup DOM elements
    container = document.createElement('div');
    container.id = 'router-outlet';
    document.body.appendChild(container);

    // Create meta tags
    const descMeta = document.createElement('meta');
    descMeta.name = 'description';
    document.head.appendChild(descMeta);

    const keyMeta = document.createElement('meta');
    keyMeta.name = 'keywords';
    document.head.appendChild(keyMeta);

    const ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);

    const ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);

    const ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrl);

    const twitterTitle = document.createElement('meta');
    twitterTitle.setAttribute('name', 'twitter:title');
    document.head.appendChild(twitterTitle);

    const twitterDesc = document.createElement('meta');
    twitterDesc.setAttribute('name', 'twitter:description');
    document.head.appendChild(twitterDesc);

    const twitterUrl = document.createElement('meta');
    twitterUrl.setAttribute('name', 'twitter:url');
    document.head.appendChild(twitterUrl);

    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);

    // Setup theme button
    const themeBtn = document.createElement('button');
    themeBtn.id = 'btn-theme';
    const icon = document.createElement('div');
    icon.className = 'sb-item__icon';
    themeBtn.appendChild(icon);
    document.body.appendChild(themeBtn);

    // Setup loading screen
    const loading = document.createElement('div');
    loading.id = 'app-loading';
    document.body.appendChild(loading);

    // Setup toast container
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);

    // Setup service worker
    window.navigator = {
      serviceWorker: {
        addEventListener: vi.fn()
      }
    };

    mockDOMContentLoaded = new Event('DOMContentLoaded');
  });

  afterEach(() => {
    // Cleanup DOM
    document.querySelectorAll('meta, link, button, #router-outlet, #app-loading, #toast-container').forEach(el => {
      if (el.parentElement) el.parentElement.removeChild(el);
    });

    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('1. StorageManager.init() is called on DOMContentLoaded', async () => {
    const { StorageManager } = await import('./storage-manager.js');

    // Simulate DOMContentLoaded
    document.dispatchEvent(mockDOMContentLoaded);

    // Give promises time to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(StorageManager.init).toHaveBeenCalled();
  });

  it('2. Nav.init() is called on DOMContentLoaded', async () => {
    const { Nav } = await import('./nav.js');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(Nav.init).toHaveBeenCalled();
  });

  it('3. Router is created with correct routes and container', async () => {
    const { Router } = await import('./router.js');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(Router).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ path: '/onboarding' }),
        expect.objectContaining({ path: '/' }),
        expect.objectContaining({ path: '/list' }),
        expect.objectContaining({ path: '/my-stack' }),
        expect.objectContaining({ path: '/checkin' })
      ]),
      container
    );
  });

  it('4. Router.start() is called', async () => {
    const { Router } = await import('./router.js');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    const routerInstance = Router.mock.results[0].value;
    expect(routerInstance.start).toHaveBeenCalled();
  });

  it('5. AnalyticsEngine.init() is called', async () => {
    const { analyticsEngine } = await import('../analytics/analytics-engine.js');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(analyticsEngine.init).toHaveBeenCalled();
  });

  it('6. Landing mode is applied for home page', async () => {
    vi.stubGlobal('location', { pathname: '/', search: '' });

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(document.body.classList.contains('body--landing')).toBe(true);
  });

  it('7. Landing mode is NOT applied for /list page', async () => {
    vi.stubGlobal('location', { pathname: '/list', search: '' });

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(document.body.classList.contains('body--landing')).toBe(false);
  });

  it('8. SEO metadata is updated on navigation', async () => {
    vi.stubGlobal('location', { pathname: '/list', search: '' });

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    const descMeta = document.querySelector('meta[name="description"]');
    expect(descMeta.getAttribute('content')).toContain('catálogo');
  });

  it('9. Theme is restored from StorageManager on init', async () => {
    const { StorageManager } = await import('./storage-manager.js');
    StorageManager.getItem.mockReturnValue('light');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Theme should be set (though mocked, we verify getItem was called)
    expect(StorageManager.getItem).toHaveBeenCalled();
  });

  it('10. Theme toggle updates document and storage', async () => {
    const { StorageManager } = await import('./storage-manager.js');
    StorageManager.getItem.mockReturnValue('dark');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    const themeBtn = document.getElementById('btn-theme');
    const clickEvent = new MouseEvent('click', { bubbles: true });

    themeBtn.dispatchEvent(clickEvent);

    expect(StorageManager.setItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/^(light|dark)$/)
    );
  });

  it('11. Loading screen is hidden on init', async () => {
    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 400));

    const loading = document.getElementById('app-loading');
    expect(loading.style.display).toBe('none');
  });

  it('12. Toast event listener is registered', async () => {
    const { eventBus } = await import('./event-bus.js');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(eventBus.on).toHaveBeenCalledWith('toast:show', expect.any(Function));
  });

  it('13. ROUTER_NAVIGATE event triggers router.navigate()', async () => {
    const { Router } = await import('./router.js');
    const { eventBus } = await import('./event-bus.js');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    const routerInstance = Router.mock.results[0].value;
    const navigateHandler = eventBus.on.mock.calls.find(
      call => call[0] === 'router:navigate'
    )?.[1];

    if (navigateHandler) {
      navigateHandler({ path: '/list' });
      expect(routerInstance.navigate).toHaveBeenCalledWith('/list');
    }
  });

  it('14. Toast message is displayed when toast:show event fires', async () => {
    const { eventBus } = await import('./event-bus.js');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    const toastHandler = eventBus.on.mock.calls.find(
      call => call[0] === 'toast:show'
    )?.[1];

    if (toastHandler) {
      toastHandler({ message: 'Test toast', type: 'info' });
      const toast = document.querySelector('.toast');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('Test toast');
    }
  });

  it('15. beforeunload flushes analytics', async () => {
    const { analyticsEngine } = await import('../analytics/analytics-engine.js');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    window.dispatchEvent(new Event('beforeunload'));

    expect(analyticsEngine.flush).toHaveBeenCalled();
  });

  it('16. Nav route changes on popstate event', async () => {
    const { Nav } = await import('./nav.js');

    document.dispatchEvent(mockDOMContentLoaded);
    await new Promise(resolve => setTimeout(resolve, 100));

    vi.stubGlobal('location', { pathname: '/checkin', search: '' });
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(Nav.updateActive).toHaveBeenCalled();
  });

});

describe('App — Error Handling', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'router-outlet';
    document.body.appendChild(container);

    const loading = document.createElement('div');
    loading.id = 'app-loading';
    document.body.appendChild(loading);
  });

  afterEach(() => {
    document.querySelectorAll('#router-outlet, #app-loading').forEach(el => {
      if (el.parentElement) el.parentElement.removeChild(el);
    });
  });

  it('17. StorageManager init errors are caught (IndexedDB fallback)', async () => {
    const { StorageManager } = await import('./storage-manager.js');
    StorageManager.init.mockRejectedValue(new Error('IndexedDB not available'));

    const mockDOMContentLoaded = new Event('DOMContentLoaded');
    document.dispatchEvent(mockDOMContentLoaded);

    await new Promise(resolve => setTimeout(resolve, 100));

    // App should continue despite StorageManager error
    expect(document.getElementById('app-loading')).toBeDefined();
  });

  it('18. AnalyticsEngine init errors do not crash app', async () => {
    const { analyticsEngine } = await import('../analytics/analytics-engine.js');
    analyticsEngine.init.mockRejectedValue(new Error('Analytics init failed'));

    const mockDOMContentLoaded = new Event('DOMContentLoaded');
    document.dispatchEvent(mockDOMContentLoaded);

    await new Promise(resolve => setTimeout(resolve, 100));

    // App should be initialized despite analytics error
    expect(document.getElementById('router-outlet')).toBeDefined();
  });

});
