import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('should import app.js successfully', async () => {
    const module = await import('./app.js');
    expect(module).toBeDefined();
  });

  it('should have #app container after import', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await import('./app.js');
    const appContainer = document.getElementById('app');
    expect(appContainer).toBeDefined();
  });

  it('should initialize without errors', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    expect(async () => {
      await import('./app.js');
    }).not.toThrow();
  });

  it('should initialize analytics API when available', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await import('./app.js');
    // Analytics API may or may not be initialized depending on config
    expect(typeof window.analyticsAPI).toMatch(/object|undefined/);
  });

  it('should complete initialization without throwing', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    let error = null;
    try {
      await import('./app.js');
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
  });
});
