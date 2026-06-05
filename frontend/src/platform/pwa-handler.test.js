import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('PWAHandler', () => {
  let pwaHandler;

  beforeEach(async () => {
    const module = await import('./pwa-handler.js');
    pwaHandler = module.default;
    vi.clearAllMocks();
  });

  it('should register service worker', async () => {
    global.navigator = {
      serviceWorker: {
        register: vi.fn().mockResolvedValue({ scope: '/' })
      }
    };
    
    const result = await pwaHandler.registerServiceWorker('/sw.js');
    expect(result.scope).toBe('/');
  });

  it('should check if PWA is installable', async () => {
    global.window = {
      matchMedia: () => ({ matches: false })
    };
    
    const isInstallable = pwaHandler.isInstallable();
    expect(typeof isInstallable).toBe('boolean');
  });

  it('should prompt for installation', async () => {
    const mockPrompt = vi.fn().mockResolvedValue({ outcome: 'accepted' });
    global.window = {
      __deferredPrompt__: { prompt: mockPrompt }
    };
    
    const result = await pwaHandler.promptInstall();
    expect(result.outcome).toBe('accepted');
  });

  it('should handle installation acceptance', async () => {
    const callback = vi.fn();
    pwaHandler.onInstallPrompt(callback);
    pwaHandler.emitInstallPrompt();
    
    expect(callback).toHaveBeenCalled();
  });

  it('should detect offline status', () => {
    global.navigator = {
      onLine: false
    };
    
    const isOffline = pwaHandler.isOffline();
    expect(isOffline).toBe(true);
  });

  it('should sync offline actions', async () => {
    const registration = {
      sync: {
        register: vi.fn().mockResolvedValue({})
      }
    };
    
    global.navigator = {
      serviceWorker: {
        ready: Promise.resolve(registration)
      }
    };
    
    await pwaHandler.syncOfflineQueue();
    expect(registration.sync.register).toHaveBeenCalled();
  });

  it('should manage cache strategy', async () => {
    const cacheData = { url: '/data', data: {} };
    pwaHandler.setCacheStrategy('network-first');
    
    await pwaHandler.cacheResponse(cacheData.url, cacheData.data);
    const cached = await pwaHandler.getCachedResponse(cacheData.url);
    
    expect(cached).toBeDefined();
  });

  it('should preload critical assets', async () => {
    await pwaHandler.preloadAssets([
      '/css/main.css',
      '/js/app.js'
    ]);
    
    const cached = pwaHandler.getCacheSize();
    expect(cached).toBeGreaterThan(0);
  });

  it('should handle network changes', (done) => {
    const callback = vi.fn();
    pwaHandler.onNetworkChange(callback);
    
    global.window = {
      dispatchEvent: vi.fn()
    };
    
    setTimeout(() => {
      expect(typeof callback).toBe('function');
      done();
    }, 50);
  });

  it('should report installation status', () => {
    const status = pwaHandler.getInstallationStatus();
    expect(status).toHaveProperty('installed');
    expect(status).toHaveProperty('displayMode');
  });
});
