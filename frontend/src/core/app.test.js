import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../state/state-manager.js', () => ({
  stateManager: {
    subscribe: vi.fn(() => vi.fn()),
    dispatch: vi.fn(),
    state: { user: {}, stack: [] }
  }
}));

describe('App', () => {
  let container;
  let app;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    const App = (await import('./app.js')).default;
    app = new App(container);
  });

  afterEach(() => {
    app?.unmount?.();
    document.body.removeChild(container);
  });

  it('should initialize with container', () => {
    expect(app.container).toBeDefined();
    expect(app.container.id).toBe('app');
  });

  it('should mount and render', () => {
    app.mount?.();
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('should handle page navigation', () => {
    app.mount?.();
    app.navigateTo?.('/stack');
    expect(app.currentPage).toContain('stack');
  });

  it('should unmount cleanly', () => {
    app.mount?.();
    app.unmount?.();
    expect(container.innerHTML).toBe('');
  });

  it('should subscribe to state changes', () => {
    const { stateManager } = require('../state/state-manager.js');
    app.mount?.();
    expect(stateManager.subscribe).toHaveBeenCalled();
  });
});
