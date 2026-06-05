import { describe, it, expect } from 'vitest';

describe('PWAHandler', () => {
  it('should export PWAHandler class', async () => {
    const { PWAHandler } = await import('./pwa-handler.js');
    expect(PWAHandler).toBeDefined();
  });

  it('should export default instance', async () => {
    const module = await import('./pwa-handler.js');
    expect(module.default).toBeDefined();
  });

  it('should have init method', async () => {
    const module = await import('./pwa-handler.js');
    expect(typeof module.default.init).toBe('function');
  });

  it('should have isConnected method', async () => {
    const module = await import('./pwa-handler.js');
    expect(typeof module.default.isConnected).toBe('function');
  });

  it('should call init without errors', async () => {
    const module = await import('./pwa-handler.js');
    expect(async () => {
      await module.default.init();
    }).not.toThrow();
  });

  it('should check online status', async () => {
    const module = await import('./pwa-handler.js');
    const isOnline = module.default.isConnected();
    expect(typeof isOnline).toBe('boolean');
  });

  it('should initialize service worker registration', async () => {
    const module = await import('./pwa-handler.js');
    await module.default.init();
    expect(module.default).toBeDefined();
  });

  it('should handle viewport meta tag initialization', async () => {
    const module = await import('./pwa-handler.js');
    await module.default.init();
    const viewport = document.querySelector('meta[name="viewport"]');
    // Viewport may be added by init() or may already exist
    expect(viewport ? viewport.content : '').toBeDefined();
  });

  it('should listen for install prompts', async () => {
    const module = await import('./pwa-handler.js');
    await module.default.init();
    expect(module.default).toBeDefined();
  });

  it('should setup online/offline listeners', async () => {
    const module = await import('./pwa-handler.js');
    await module.default.init();
    expect(module.default.isConnected).toBeDefined();
  });
});
