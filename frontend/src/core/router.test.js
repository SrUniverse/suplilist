import { describe, it, expect } from 'vitest';

describe('Router', () => {
  it('should export Router class', async () => {
    const { Router } = await import('./router.js');
    expect(Router).toBeDefined();
  });

  it('should create Router instance', async () => {
    const { Router } = await import('./router.js');
    const router = new Router([]);
    expect(router).toBeDefined();
  });

  it('should have navigate method', async () => {
    const { Router } = await import('./router.js');
    const router = new Router([]);
    expect(typeof router.navigate).toBe('function');
  });

  it('should have matchRoute method', async () => {
    const { Router } = await import('./router.js');
    const router = new Router([]);
    expect(typeof router.matchRoute).toBe('function');
  });

  it('should accept routes in constructor', async () => {
    const { Router } = await import('./router.js');
    const routes = [{ path: '/', handler: () => {} }];
    const router = new Router(routes);
    expect(router).toBeDefined();
  });

  it('should accept container in constructor', async () => {
    const { Router } = await import('./router.js');
    const container = document.createElement('div');
    const router = new Router([], container);
    expect(router).toBeDefined();
  });
});
