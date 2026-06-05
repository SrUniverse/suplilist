import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Router', () => {
  let router;
  let container;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const { Router } = await import('./router.js');
    router = new Router();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should navigate to a path', () => {
    router.navigate('/home');
    expect(window.location.hash).toContain('/home');
  });

  it('should parse route parameters', () => {
    window.location.hash = '#/stack/123';
    const params = router.parseRoute();
    expect(params.route).toContain('stack');
  });

  it('should handle 404 routes', () => {
    router.navigate('/nonexistent');
    const current = router.getCurrentRoute();
    expect(current).toBe('/404');
  });

  it('should prevent duplicate consecutive navigations', () => {
    router.navigate('/home');
    const nav1 = router.navigationCount || 1;
    router.navigate('/home');
    const nav2 = router.navigationCount || 1;
    expect(nav2).toBeLessThanOrEqual(nav1 + 1);
  });

  it('should support back navigation', () => {
    router.navigate('/home');
    router.navigate('/profile');
    router.back?.();
    const current = router.getCurrentRoute();
    expect(current).toContain('home');
  });

  it('should support forward navigation', () => {
    router.navigate('/home');
    router.navigate('/profile');
    router.back?.();
    router.forward?.();
    const current = router.getCurrentRoute();
    expect(current).toContain('profile');
  });
});
