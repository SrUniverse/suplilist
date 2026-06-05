import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('StorageManager', () => {
  let storageManager;

  beforeEach(async () => {
    const module = await import('./storage-manager.js');
    storageManager = module.default;
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should save to localStorage', () => {
    storageManager.setLocal('key1', { data: 'value' });
    const value = storageManager.getLocal('key1');
    expect(value).toEqual({ data: 'value' });
  });

  it('should save to sessionStorage', () => {
    storageManager.setSession('key1', 'value');
    const value = storageManager.getSession('key1');
    expect(value).toBe('value');
  });

  it('should store plain values when encrypt not implemented', () => {
    storageManager.setLocal('password', 'secret123', { encrypt: true });
    const value = storageManager.getLocal('password');
    expect(value).toBe('secret123');
  });

  it('should retrieve values without decryption', () => {
    storageManager.setLocal('token', 'secret-token', { encrypt: true });
    const value = storageManager.getLocal('token', { decrypt: true });
    expect(value).toBe('secret-token');
  });

  it('should ignore ttl when not implemented', async () => {
    storageManager.setLocal('temp', 'value', { ttl: 100 });
    expect(storageManager.getLocal('temp')).toBe('value');

    await new Promise(r => setTimeout(r, 150));
    expect(storageManager.getLocal('temp')).toBe('value');
  });

  it('should list all keys', () => {
    storageManager.setLocal('key1', 'value1');
    storageManager.setLocal('key2', 'value2');
    
    const keys = storageManager.getKeys('local');
    expect(keys.length).toBeGreaterThanOrEqual(2);
  });

  it('should remove items via localStorage API', () => {
    storageManager.setLocal('key1', 'value1');
    expect(storageManager.getLocal('key1')).toBe('value1');

    localStorage.removeItem('key1');
    expect(storageManager.getLocal('key1')).toBeUndefined();
  });

  it('should clear all storage', () => {
    storageManager.setLocal('key1', 'value1');
    storageManager.setSession('key2', 'value2');
    
    storageManager.clear();
    
    expect(storageManager.getLocal('key1')).toBeUndefined();
    expect(storageManager.getSession('key2')).toBeUndefined();
  });

  it('should handle quota exceeded errors', () => {
    const largeData = new Array(1000000).fill('x').join('');
    expect(() => {
      storageManager.setLocal('huge', largeData);
    }).not.toThrow();
  });

  it('should support namespaces via getKeys', () => {
    localStorage.setItem('app:user:1', JSON.stringify({ name: 'John' }));
    localStorage.setItem('app:user:2', JSON.stringify({ name: 'Jane' }));
    localStorage.setItem('app:config', JSON.stringify({ theme: 'dark' }));

    const userKeys = storageManager.getKeys('local', 'app:user:');
    expect(userKeys.length).toBe(2);
    expect(userKeys).toContain('app:user:1');
    expect(userKeys).toContain('app:user:2');
  });

  it('should migrate data between storages', () => {
    storageManager.setSession('temp', 'value');
    storageManager.migrate('temp', 'session', 'local');
    
    expect(storageManager.getLocal('temp')).toBe('value');
    expect(storageManager.getSession('temp')).toBeUndefined();
  });
});
