import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorageManager } from './storage-manager.js';

describe('StorageManager — Multi-layer Storage', () => {
  let mockIndexedDB;
  let mockDB;
  let mockStore;
  let mockTransaction;
  let mockRequest;
  let cookieStore = {};

  beforeEach(() => {
    vi.clearAllMocks();
    StorageManager._db = null;
    StorageManager._dbReady = false;

    // Reset localStorage
    localStorage.clear();

    // Reset cookieStore mock
    cookieStore = {};
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => {
        return Object.entries(cookieStore)
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
      },
      set: (cookieStr) => {
        const parts = cookieStr.split(';');
        const [nameValue] = parts;
        const eqIdx = nameValue.indexOf('=');
        if (eqIdx !== -1) {
          const key = nameValue.substring(0, eqIdx).trim();
          const value = nameValue.substring(eqIdx + 1).trim();
          if (cookieStr.includes('expires=') && new Date(parts.find(p => p.includes('expires')).split('=')[1]) < new Date()) {
            delete cookieStore[key];
          } else {
            cookieStore[key] = value;
          }
        }
      }
    });

    // Mock IndexedDB
    mockStore = {
      put: vi.fn(() => {
        const req = { onerror: null, onsuccess: null };
        setTimeout(() => req.onsuccess && req.onsuccess(), 5);
        return req;
      }),
      get: vi.fn(() => {
        const req = { onerror: null, onsuccess: null, result: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 5);
        return req;
      }),
      openCursor: vi.fn(() => {
        const req = { onerror: null, onsuccess: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: { result: null } }), 5);
        return req;
      }),
      clear: vi.fn()
    };

    mockTransaction = {
      objectStore: vi.fn(() => mockStore)
    };

    mockDB = {
      transaction: vi.fn(() => mockTransaction),
      objectStoreNames: {
        contains: vi.fn(() => true)
      },
      createObjectStore: vi.fn(() => mockStore)
    };

    mockRequest = {
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
      result: mockDB,
      error: new Error('Mock IDB open error')
    };

    mockIndexedDB = {
      open: vi.fn(() => mockRequest)
    };

    vi.stubGlobal('indexedDB', mockIndexedDB);

    // Default File System mocks
    vi.stubGlobal('showSaveFilePicker', undefined);
    vi.stubGlobal('showOpenFilePicker', undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. init() success pathway
  it('1. init() successfully opens IndexedDB and configures store', async () => {
    const initPromise = StorageManager.init();

    // Trigger success callback
    expect(mockIndexedDB.open).toHaveBeenCalledWith('SupliListDB', 1);
    mockRequest.onsuccess();

    await initPromise;
    expect(StorageManager._dbReady).toBe(true);
    expect(StorageManager._db).toBe(mockDB);
  });

  // 2. init() upgrade needed pathway
  it('2. init() triggers onupgradeneeded to create store if not present', async () => {
    const initPromise = StorageManager.init();

    mockDB.objectStoreNames.contains.mockReturnValueOnce(false);

    // Call onupgradeneeded manual mock event
    const mockUpgradeEvent = {
      target: { result: mockDB }
    };
    mockRequest.onupgradeneeded(mockUpgradeEvent);

    expect(mockDB.createObjectStore).toHaveBeenCalledWith('state');

    mockRequest.onsuccess();
    await initPromise;
    expect(StorageManager._dbReady).toBe(true);
  });

  // 3. init() failure pathway handles error gracefully
  it('3. init() logs error and remains not ready on open failure', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const initPromise = StorageManager.init();

    mockRequest.onerror();

    await initPromise;
    expect(StorageManager._dbReady).toBe(false);
    expect(StorageManager._db).toBeNull();
    warnSpy.mockRestore();
  });

  // 4. setItem() sets value in IndexedDB, cookies and syncs correctly
  it('4. setItem() stores in IndexedDB, cookies and localStorage', async () => {
    // Make DB ready
    StorageManager._db = mockDB;
    StorageManager._dbReady = true;

    mockStore.put.mockImplementationOnce((_val, _key) => {
      const req = { onsuccess: null, onerror: null };
      setTimeout(() => {
        req.onsuccess();
      }, 5);
      return req;
    });

    await StorageManager.setItem('suplilist-state-v4', 'my-state-data');

    expect(mockDB.transaction).toHaveBeenCalledWith(['state'], 'readwrite');
    expect(mockStore.put).toHaveBeenCalledWith('my-state-data', 'suplilist-state-v4');

    // Sincroniza com cookies para a chave especificada
    const cookieVal = StorageManager._getCookie('suplilist-state-v4');
    expect(cookieVal).toBe('my-state-data');
  });

  // 5. setItem() fallbacks to Cookie and LocalStorage if IndexedDB is not ready
  it('5. setItem() fallbacks to Cookie and LocalStorage if IndexedDB fails', async () => {
    StorageManager._dbReady = false;

    // Case 1: Cookie is successful, returns early and does not write to localStorage
    await StorageManager.setItem('my-key', 'my-value');
    expect(StorageManager._getCookie('my-key')).toBe('my-value');
    expect(localStorage.getItem('my-key')).toBeNull();

    // Case 2: Cookie setting fails, falls back to localStorage
    const originalSetCookie = StorageManager._setCookie;
    StorageManager._setCookie = () => false;

    await StorageManager.setItem('my-key-ls', 'my-value-ls');
    expect(localStorage.getItem('my-key-ls')).toBe('my-value-ls');

    StorageManager._setCookie = originalSetCookie;
  });

  // 6. setItem() falls back directly to localStorage if cookie exceeds max length
  it('6. setItem() bypasses cookie if value size exceeds quota limit', async () => {
    StorageManager._dbReady = false;

    // Create value > 3000 bytes
    const largeValue = 'A'.repeat(4000);
    await StorageManager.setItem('large-key', largeValue);

    expect(StorageManager._getCookie('large-key')).toBeNull();
    expect(localStorage.getItem('large-key')).toBe(largeValue);
  });

  // 7. getItem() reads from IndexedDB first if present
  it('7. getItem() successfully retrieves value from IndexedDB', async () => {
    StorageManager._db = mockDB;
    StorageManager._dbReady = true;

    mockStore.get.mockImplementationOnce((_key) => {
      const req = { onsuccess: null, onerror: null, result: 'indexeddb-value' };
      setTimeout(() => {
        req.onsuccess({ target: req });
      }, 5);
      return req;
    });

    const result = await StorageManager.getItem('some-key');
    expect(result).toBe('indexeddb-value');
    expect(mockStore.get).toHaveBeenCalledWith('some-key');
  });

  // 8. getItem() fallbacks to cookies and localStorage if IndexedDB is empty or missing
  it('8. getItem() fallbacks to cookie and then localStorage', async () => {
    StorageManager._db = mockDB;
    StorageManager._dbReady = true;

    // IndexedDB returns null
    mockStore.get.mockImplementationOnce((_key) => {
      const req = { onsuccess: null, onerror: null, result: null };
      setTimeout(() => {
        req.onsuccess({ target: req });
      }, 5);
      return req;
    });

    // Write cookie
    StorageManager._setCookie('my-key', 'cookie-val');

    const res1 = await StorageManager.getItem('my-key');
    expect(res1).toBe('cookie-val');

    // No cookie, read from localStorage
    cookieStore = {};
    localStorage.setItem('my-key', 'ls-val');

    const res2 = await StorageManager.getItem('my-key');
    expect(res2).toBe('ls-val');
  });

  // 9. removeItem() clears values from cookies and localStorage
  it('9. removeItem() deletes keys from cookies and localStorage', async () => {
    StorageManager._setCookie('delete-me', 'val');
    localStorage.setItem('delete-me', 'val');

    StorageManager.removeItem('delete-me');

    expect(StorageManager._getCookie('delete-me')).toBeNull();
    expect(localStorage.getItem('delete-me')).toBeNull();
  });

  // 10. getAllKeys() compiles list of all local storage keys
  it('10. getAllKeys() aggregates unique keys from cookies and localStorage', () => {
    localStorage.setItem('key1', 'v1');
    localStorage.setItem('key2', 'v2');
    StorageManager._setCookie('key3', 'v3');
    StorageManager._setCookie('key1', 'v1'); // Dup

    const allKeys = StorageManager.getAllKeys();

    expect(allKeys).toContain('key1');
    expect(allKeys).toContain('key2');
    expect(allKeys).toContain('key3');
    expect(allKeys.length).toBe(3);
  });

  // 11. areCookiesEnabled() tests cookie availability
  it('11. areCookiesEnabled() writes, reads and verifies test cookie', () => {
    const isEnabled = StorageManager.areCookiesEnabled();
    expect(isEnabled).toBe(true);
  });

  // 12. exportToFile() handles File System exports when available
  it('12. exportToFile() saves JSON backup via File System Access API', async () => {
    StorageManager._db = mockDB;
    StorageManager._dbReady = true;

    mockStore.openCursor.mockImplementationOnce((_range) => {
      const req = { onsuccess: null, onerror: null };
      setTimeout(() => {
        const mockCursor = {
          key: 'saved-state',
          value: 'saved-value',
          continue: vi.fn()
        };
        const mockTarget = { result: mockCursor };
        req.onsuccess({ target: mockTarget });
        
        // Next cursor iteration
        setTimeout(() => {
          req.onsuccess({ target: { result: null } });
        }, 2);
      }, 5);
      return req;
    });

    localStorage.setItem('local-item', 'local-val');
    StorageManager._setCookie('suplilist-state-v4', 'cookie-val');

    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined)
    };

    const mockHandle = {
      createWritable: vi.fn().mockResolvedValue(mockWritable)
    };

    const mockSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);
    vi.stubGlobal('showSaveFilePicker', mockSaveFilePicker);
    vi.stubGlobal('showOpenFilePicker', vi.fn());

    expect(StorageManager.isFileSystemAPIAvailable()).toBe(true);

    const res = await StorageManager.exportToFile();

    expect(res.success).toBe(true);
    expect(mockSaveFilePicker).toHaveBeenCalled();
    expect(mockWritable.write).toHaveBeenCalled();
    expect(mockWritable.close).toHaveBeenCalled();

    const writeCallArg = JSON.parse(mockWritable.write.mock.calls[0][0]);
    expect(writeCallArg.version).toBe('4.0.0');
    expect(writeCallArg.sources.indexeddb['saved-state']).toBe('saved-value');
    expect(writeCallArg.sources.localStorage['local-item']).toBe('local-val');
  });

  // 13. importFromFile() restores backup data
  it('13. importFromFile() restores backup states back into IndexedDB', async () => {
    StorageManager._db = mockDB;
    StorageManager._dbReady = true;

    const backupData = {
      version: '4.0.0', // Required by new validation
      sources: {
        indexeddb: {
          'suplilist-state-v4': 'restored-value' // Must match allowlist prefix
        }
      }
    };

    const mockFile = {
      text: vi.fn().mockResolvedValue(JSON.stringify(backupData))
    };

    const mockHandle = {
      getFile: vi.fn().mockResolvedValue(mockFile)
    };

    const mockOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);
    vi.stubGlobal('showOpenFilePicker', mockOpenFilePicker);

    const res = await StorageManager.importFromFile();

    expect(res.success).toBe(true);
    expect(mockOpenFilePicker).toHaveBeenCalled();
    expect(mockHandle.getFile).toHaveBeenCalled();
    expect(mockStore.put).toHaveBeenCalledWith('restored-value', 'suplilist-state-v4');
  });

  // 14. File system export error fallback
  it('14. exportToFile() and importFromFile() handle missing API errors', async () => {
    expect(StorageManager.isFileSystemAPIAvailable()).toBe(false);

    const resExport = await StorageManager.exportToFile();
    expect(resExport.success).toBe(false);
    expect(resExport.message).toContain('não suportada');

    const resImport = await StorageManager.importFromFile();
    expect(resImport.success).toBe(false);
    expect(resImport.message).toContain('não suportada');
  });
});
