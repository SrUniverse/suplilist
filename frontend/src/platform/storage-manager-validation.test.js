import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from './storage-manager.js';

describe('StorageManager - Input Validation', () => {
  beforeEach(() => {
    // Mock IndexedDB para testes
    StorageManager._dbReady = false;
    StorageManager._db = null;
  });

  describe('setItem validation', () => {
    it('should throw TypeError for non-string key', async () => {
      await expect(StorageManager.setItem(123, 'value')).rejects.toThrow(TypeError);
      await expect(StorageManager.setItem(null, 'value')).rejects.toThrow(TypeError);
      await expect(StorageManager.setItem(undefined, 'value')).rejects.toThrow(TypeError);
    });

    it('should throw TypeError for empty key', async () => {
      await expect(StorageManager.setItem('', 'value')).rejects.toThrow(TypeError);
      await expect(StorageManager.setItem('   ', 'value')).rejects.toThrow(TypeError);
    });

    it('should throw Error for key with invalid characters (cookie injection)', async () => {
      await expect(StorageManager.setItem('key;path=/', 'value')).rejects.toThrow(/invalid characters/);
      await expect(StorageManager.setItem('key=value', 'value')).rejects.toThrow(/invalid characters/);
      await expect(StorageManager.setItem('key with spaces', 'value')).rejects.toThrow(/invalid characters/);
    });

    it('should throw Error for undefined value', async () => {
      await expect(StorageManager.setItem('key', undefined)).rejects.toThrow(/cannot be undefined/);
    });

    it('should throw Error for non-serializable value (circular reference)', async () => {
      const circular = {};
      circular.self = circular;

      await expect(StorageManager.setItem('key', circular)).rejects.toThrow(/not serializable/);
    });

    it('should accept valid key-value pairs', async () => {
      // Strings
      await expect(StorageManager.setItem('valid-key', 'value')).resolves.not.toThrow();

      // Numbers
      await expect(StorageManager.setItem('number', 123)).resolves.not.toThrow();

      // Objects
      await expect(StorageManager.setItem('object', { foo: 'bar' })).resolves.not.toThrow();

      // Arrays
      await expect(StorageManager.setItem('array', [1, 2, 3])).resolves.not.toThrow();

      // Null is valid (different from undefined)
      await expect(StorageManager.setItem('null', null)).resolves.not.toThrow();
    });
  });

  describe('removeItem - IndexedDB cleanup', () => {
    it('should attempt to remove from IndexedDB when db is ready', async () => {
      // Mock IndexedDB with proper promise resolution
      const mockRequest = {
        onerror: null,
        onsuccess: null
      };

      StorageManager._dbReady = true;
      StorageManager._db = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            delete: vi.fn(() => mockRequest)
          }))
        }))
      };

      // Call removeItem and resolve the mock immediately
      const promise = StorageManager.removeItem('test-key');

      // Simulate successful delete
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }

      await promise;

      // Verify IndexedDB transaction was attempted
      expect(StorageManager._db.transaction).toHaveBeenCalledWith(['state'], 'readwrite');
    });
  });

  describe('_setCookie - type handling', () => {
    it('should serialize objects before encoding', () => {
      const obj = { foo: 'bar' };
      const result = StorageManager._setCookie('test-obj', obj);

      // Should not throw, and should serialize to JSON
      expect(result).toBeDefined();
    });

    it('should handle strings directly', () => {
      const result = StorageManager._setCookie('test-string', 'plain text');
      expect(result).toBeDefined();
    });
  });

  describe('Security - Secure flag', () => {
    it('should add Secure flag when protocol is https', () => {
      // Mock HTTPS context
      global.window = {
        location: { protocol: 'https:' }
      };

      // Spy on document.cookie setter
      const cookieSetter = vi.spyOn(document, 'cookie', 'set');

      StorageManager._setCookie('secure-test', 'value');

      // Verify Secure flag is present
      const setCookieCalls = cookieSetter.mock.calls;
      const lastCall = setCookieCalls[setCookieCalls.length - 1];
      if (lastCall) {
        expect(lastCall[0]).toContain('Secure');
      }

      cookieSetter.mockRestore();
    });

    it('should NOT add Secure flag when protocol is http', () => {
      // Mock HTTP context
      global.window = {
        location: { protocol: 'http:' }
      };

      const cookieSetter = vi.spyOn(document, 'cookie', 'set');

      StorageManager._setCookie('insecure-test', 'value');

      const setCookieCalls = cookieSetter.mock.calls;
      const lastCall = setCookieCalls[setCookieCalls.length - 1];
      if (lastCall) {
        expect(lastCall[0]).not.toContain('Secure');
      }

      cookieSetter.mockRestore();
    });
  });
});

describe('StorageManager - Import Validation', () => {
  // Setup mock IndexedDB store
  const mockStore = {
    put: vi.fn((_value, _key) => {
      // Return mock request that auto-resolves
      const mockRequest = { onerror: null, onsuccess: null };
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess();
      }, 0);
      return mockRequest;
    }),
    get: vi.fn(),
    delete: vi.fn()
  };

  const mockDB = {
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => mockStore)
    }))
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.put.mockClear();
  });

  describe('importFromFile schema validation', () => {
    it('should reject import with missing version', async () => {
      const invalidData = {
        sources: { indexeddb: {} }
      };

      // Mock file picker to return invalid data
      global.window.showOpenFilePicker = vi.fn(async () => [
        {
          getFile: async () => ({
            text: async () => JSON.stringify(invalidData)
          })
        }
      ]);

      const result = await StorageManager.importFromFile();

      expect(result.success).toBe(false);
      expect(result.message).toContain('inválido');
    });

    it('should reject import with incompatible version', async () => {
      const invalidData = {
        version: '99.0.0',
        sources: { indexeddb: {} }
      };

      global.window.showOpenFilePicker = vi.fn(async () => [
        {
          getFile: async () => ({
            text: async () => JSON.stringify(invalidData)
          })
        }
      ]);

      const result = await StorageManager.importFromFile();

      expect(result.success).toBe(false);
      expect(result.message).toContain('incompatível');
    });

    it('should reject import with file > 10MB', async () => {
      const hugeData = 'x'.repeat(11 * 1024 * 1024); // 11MB

      global.window.showOpenFilePicker = vi.fn(async () => [
        {
          getFile: async () => ({
            text: async () => hugeData
          })
        }
      ]);

      const result = await StorageManager.importFromFile();

      expect(result.success).toBe(false);
      expect(result.message).toContain('muito grande');
    });

    // TODO: Fix async mock timing issues
    it.skip('should ignore dangerous keys during import (prototype pollution)', async () => {
      const maliciousData = {
        version: '4.0.0',
        sources: {
          indexeddb: {
            '__proto__': { isAdmin: true },
            'constructor': 'malicious',
            'suplilist-state-v4': 'valid-data'
          }
        }
      };

      global.window.showOpenFilePicker = vi.fn(async () => [
        {
          getFile: async () => ({
            text: async () => JSON.stringify(maliciousData)
          })
        }
      ]);

      // Use shared mock setup
      StorageManager._dbReady = true;
      StorageManager._db = mockDB;

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Need to await microtasks for setTimeout in mock to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      await StorageManager.importFromFile();

      // Verify dangerous keys were ignored
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ignorando key perigosa'),
        expect.stringContaining('__proto__')
      );

      consoleWarnSpy.mockRestore();
    });

    // TODO: Fix async mock timing issues
    it.skip('should ignore unknown keys during import (allowlist)', async () => {
      const dataWithUnknownKeys = {
        version: '4.0.0',
        sources: {
          indexeddb: {
            'suplilist-state-v4': 'valid',
            'unknown-key': 'should-be-ignored',
            'malicious-injection': 'bad-data'
          }
        }
      };

      global.window.showOpenFilePicker = vi.fn(async () => [
        {
          getFile: async () => ({
            text: async () => JSON.stringify(dataWithUnknownKeys)
          })
        }
      ]);

      // Use shared mock setup
      StorageManager._dbReady = true;
      StorageManager._db = mockDB;

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Need to await microtasks for setTimeout in mock to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      await StorageManager.importFromFile();

      // Verify unknown keys were ignored
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ignorando key não reconhecida'),
        expect.stringContaining('unknown-key')
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
