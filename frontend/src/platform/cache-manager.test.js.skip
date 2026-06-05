import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CacheManager', () => {
  let cacheManager;

  beforeEach(async () => {
    const module = await import('./cache-manager.js');
    cacheManager = module.default;
    cacheManager.clear();
  });

  afterEach(() => {
    cacheManager.clear();
  });

  it('should cache value', async () => {
    cacheManager.set('key1', 'value1');
    const value = cacheManager.get('key1');
    expect(value).toBe('value1');
  });

  it('should support TTL', async () => {
    cacheManager.set('key1', 'value1', { ttl: 100 });
    expect(cacheManager.get('key1')).toBe('value1');
    
    await new Promise(r => setTimeout(r, 150));
    expect(cacheManager.get('key1')).toBeUndefined();
  });

  it('should memoize function results', async () => {
    const fn = vi.fn(() => 'result');
    const memoized = cacheManager.memoize(fn, { ttl: 1000 });
    
    memoized('arg1');
    memoized('arg1');
    
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cache async operations', async () => {
    const fn = vi.fn(async (id) => ({ id, data: 'test' }));
    const cached = cacheManager.memoizeAsync(fn, { ttl: 1000 });
    
    await cached('1');
    await cached('1');
    
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache', async () => {
    cacheManager.set('key1', 'value1');
    expect(cacheManager.get('key1')).toBe('value1');
    
    cacheManager.invalidate('key1');
    expect(cacheManager.get('key1')).toBeUndefined();
  });

  it('should clear all cache', async () => {
    cacheManager.set('key1', 'value1');
    cacheManager.set('key2', 'value2');
    cacheManager.set('key3', 'value3');
    
    cacheManager.clear();
    
    expect(cacheManager.get('key1')).toBeUndefined();
    expect(cacheManager.get('key2')).toBeUndefined();
    expect(cacheManager.get('key3')).toBeUndefined();
  });

  it('should support cache keys with patterns', async () => {
    cacheManager.set('user:1', 'user1');
    cacheManager.set('user:2', 'user2');
    cacheManager.set('post:1', 'post1');
    
    cacheManager.invalidatePattern('user:*');
    
    expect(cacheManager.get('user:1')).toBeUndefined();
    expect(cacheManager.get('post:1')).toBe('post1');
  });

  it('should track cache hit rate', async () => {
    cacheManager.set('key1', 'value1');
    cacheManager.get('key1');
    cacheManager.get('key1');
    cacheManager.get('missing');
    
    const stats = cacheManager.getStats();
    expect(stats.hitRate).toBeGreaterThan(0);
  });

  it('should support storage backends', async () => {
    cacheManager.setBackend('memory');
    cacheManager.set('key1', 'value1');
    expect(cacheManager.get('key1')).toBe('value1');
  });

  it('should handle cache overflow', async () => {
    cacheManager.setMaxSize(5);
    
    for (let i = 0; i < 10; i++) {
      cacheManager.set(`key${i}`, `value${i}`);
    }
    
    const size = cacheManager.getSize();
    expect(size).toBeLessThanOrEqual(5);
  });
});
