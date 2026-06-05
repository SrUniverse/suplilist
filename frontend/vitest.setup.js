import { vi } from 'vitest';

// IntersectionObserver mock
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IndexedDB mock with proper event flow
global.indexedDB = {
  open: vi.fn((name, version) => {
    const request = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        name,
        version,
        objectStoreNames: {
          contains: vi.fn(() => false),
          length: 0
        },
        createObjectStore: vi.fn((storeName) => {
          return {
            name: storeName,
            keyPath: null,
            indexNames: [],
            createIndex: vi.fn(),
            add: vi.fn(() => ({ onsuccess: null, onerror: null })),
            put: vi.fn(() => ({ onsuccess: null, onerror: null })),
            get: vi.fn(() => ({ onsuccess: null, onerror: null, result: null })),
            delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
            clear: vi.fn(() => ({ onsuccess: null, onerror: null })),
            getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] }))
          };
        }),
        transaction: vi.fn((storeNames, mode = 'readonly') => {
          const transaction = {
            objectStore: vi.fn((storeName) => ({
              name: storeName,
              add: vi.fn(() => {
                const req = { onsuccess: null, onerror: null, result: 1 };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              }),
              put: vi.fn(() => {
                const req = { onsuccess: null, onerror: null, result: 1 };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              }),
              get: vi.fn(() => {
                const req = { onsuccess: null, onerror: null, result: null };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              }),
              delete: vi.fn(() => {
                const req = { onsuccess: null, onerror: null };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              }),
              clear: vi.fn(() => {
                const req = { onsuccess: null, onerror: null };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              }),
              getAll: vi.fn(() => {
                const req = { onsuccess: null, onerror: null, result: [] };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              }),
              count: vi.fn(() => {
                const req = { onsuccess: null, onerror: null, result: 0 };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              })
            })),
            oncomplete: null,
            onerror: null,
            onabort: null,
            abort: vi.fn()
          };
          setTimeout(() => transaction.oncomplete?.(), 10);
          return transaction;
        }),
        close: vi.fn()
      }
    };

    // Simulate async open with upgrade flow
    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({
          target: { result: request.result },
          oldVersion: 0,
          newVersion: version
        });
      }
      if (request.onsuccess) {
        request.onsuccess({ target: { result: request.result } });
      }
    }, 10);

    return request;
  }),
  deleteDatabase: vi.fn((name) => {
    const request = { onsuccess: null, onerror: null };
    setTimeout(() => request.onsuccess?.({ target: request }), 10);
    return request;
  })
};

// LocalStorage/SessionStorage mock
const createStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index) => Object.keys(store)[index] || null)
  };
};

global.localStorage = createStorageMock();
global.sessionStorage = createStorageMock();

// Window methods
global.scrollTo = vi.fn();
global.focus = vi.fn();
global.prompt = vi.fn(() => 'mock-input');
global.alert = vi.fn();
global.confirm = vi.fn(() => true);

// Navigator mocks
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn(() => Promise.resolve({ scope: '/', active: { state: 'activated' } })),
    ready: Promise.resolve({ active: { state: 'activated' } }),
    controller: null
  }
});

// Crypto mock for UUIDs
if (!global.crypto) {
  global.crypto = {};
}
global.crypto.randomUUID = vi.fn(() => '00000000-0000-4000-8000-000000000000');
global.crypto.getRandomValues = vi.fn((arr) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
});

// Fetch mock
global.fetch = vi.fn((url, options = {}) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    json: async () => ({ success: true, data: {} }),
    text: async () => '{}',
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
    clone() { return this; }
  });
});

// History/Router mock
global.history.pushState = vi.fn();
global.history.replaceState = vi.fn();
global.history.back = vi.fn();
global.history.forward = vi.fn();
global.history.go = vi.fn();

// Location mock
Object.defineProperty(global, 'location', {
  writable: true,
  value: {
    href: 'http://localhost:5173/',
    protocol: 'http:',
    host: 'localhost:5173',
    hostname: 'localhost',
    port: '5173',
    pathname: '/',
    search: '',
    hash: '',
    origin: 'http://localhost:5173',
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn()
  }
});
