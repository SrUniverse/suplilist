# Test Fixing Plan — 81 Tests Failing

**Date:** 2026-06-05  
**Status:** In Progress (7 tests fixed so far)  
**Goal:** Fix 81 failing tests across 25 test files

---

## ✅ Phase 1: Global Setup (DONE)

### 1.1 Mock Global APIs (`vitest.setup.js`)
**Status:** ✅ DONE

**Added mocks:**
- `IntersectionObserver` — VirtualScroller tests
- `indexedDB` — Analytics, offline-handler, pwa-handler
- `localStorage` / `sessionStorage` — Storage tests
- `window.scrollTo()` / `window.focus()` — Router/navigation tests
- `window.prompt()` / `window.alert()` / `window.confirm()` — User interaction tests
- `navigator.onLine` — Offline detection tests
- `navigator.serviceWorker` — PWA tests
- `crypto.randomUUID()` / `crypto.getRandomValues()` — UUID generation

**Impact:** Enabled ~30 tests to run (previously crashing on missing globals)

### 1.2 Create Missing Files
**Status:** ✅ DONE

**Created:**
1. `src/monetization/payment-processor.js` (73 lines)
   - Stripe/PayPal integration stub
   - Methods: `init()`, `createPaymentIntent()`, `processPayment()`, `refund()`, `getStatus()`

2. `src/monetization/subscription-handler.js` (124 lines)
   - Premium subscription management
   - Methods: `createSubscription()`, `cancelSubscription()`, `reactivateSubscription()`, `getSubscription()`, `getUserSubscriptions()`, `isPremiumActive()`

3. `src/platform/analytics-tracker.js` (75 lines)
   - Wrapper for `analytics-engine.js`
   - Methods: `trackPageView()`, `trackEvent()`, `trackConversion()`, `identify()`, `enable()`, `disable()`

**Impact:** Unblocked 3 test files (0 tests → runnable tests)

### 1.3 Add Storage Manager Aliases
**Status:** ✅ PARTIAL (7/11 tests passing)

**Added backward compatibility methods:**
- `setLocal(key, value)` → `localStorage.setItem(key, JSON.stringify(value))`
- `getLocal(key)` → `localStorage.getItem(key)` + JSON.parse
- `setSession(key, value)` → `sessionStorage.setItem()`
- `getSession(key)` → `sessionStorage.getItem()`
- `removeLocal(key)` → `localStorage.removeItem()`
- `clear()` → `localStorage.clear()` + `sessionStorage.clear()`
- `listKeys()` → `Object.keys(localStorage)`
- `getKeys(storage, prefix)` → Filter keys by prefix
- `migrate(key, from, to)` → Move data between storages

**Still missing (4 tests failing):**
- ❌ `encrypt` / `decrypt` options (requires crypto implementation)
- ❌ `ttl` (time-to-live) option (requires expiration tracking)
- ❌ `remove()` method (missing method name)
- ❌ Namespace key filtering broken (getKeys returns empty)

---

## ❌ Phase 2: Test File Categories (TODO)

### Category A: Analytics Tests (7 files, ~35 failures)
**Files:**
- `analytics-engine.test.js`
- `analytics-engine.e2e.test.js`
- `event-pipeline.test.js`
- `funnel-engine.test.js`
- `metrics-aggregator.test.js`
- `session-tracker.test.js`
- `affiliate-engine.test.js`

**Root cause:** `analyticsEngine` auto-initializes on import → tries to open IndexedDB → fails because `indexedDB.open()` mock doesn't properly simulate `onupgradeneeded` event flow

**Fix strategy:**
```javascript
// In vitest.setup.js or per-test setup
global.indexedDB = {
  open: vi.fn((name, version) => {
    const request = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        createObjectStore: vi.fn(),
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn(),
            put: vi.fn(),
            get: vi.fn(() => ({ onsuccess: null, result: null })),
            delete: vi.fn(),
            clear: vi.fn(),
            getAll: vi.fn(() => ({ onsuccess: null, result: [] }))
          }))
        }))
      }
    };

    // Simulate upgrade
    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: { result: request.result } });
      }
      if (request.onsuccess) {
        request.onsuccess({ target: { result: request.result } });
      }
    }, 0);

    return request;
  }),
  deleteDatabase: vi.fn()
};
```

**Estimated time:** 2-3 hours

---

### Category B: Platform Tests (6 files, ~25 failures)
**Files:**
- `pwa-handler.test.js` (10 tests)
- `offline-handler.test.js` (10 tests)
- `api-client.test.js` (5 tests)
- `identity-service.test.js` (5 tests)
- `event-bus.test.js` (6 tests)
- `storage-manager.test.js` (4 tests still failing)

**Root causes:**
1. **PWA/Offline:** `indexedDB.open()` mock incomplete (same as Category A)
2. **API Client:** Fetch mock missing, needs `global.fetch = vi.fn()`
3. **Identity Service:** Depends on API client + localStorage
4. **Event Bus:** Likely working, needs quick verification
5. **Storage Manager:** Needs encrypt/ttl/remove implementation

**Fix strategy:**
```javascript
// Add to vitest.setup.js
global.fetch = vi.fn((url, options) => 
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ success: true }),
    text: async () => '{}',
    headers: new Headers()
  })
);
```

**Estimated time:** 3-4 hours

---

### Category C: Core Tests (4 files, ~12 failures)
**Files:**
- `app.test.js` (5 tests)
- `router.test.js` (6 tests)
- `event-bus.test.js` (6 tests)
- `virtual-scroller.test.js` (? tests)

**Root cause:** `app.test.js` fails because `analyticsEngine.init()` crashes (Category A dependency)

**Fix strategy:**
1. Fix Category A (analytics init)
2. Mock `router.navigate()` to not actually change `window.location`
3. Add `window.history.pushState = vi.fn()`
4. Add `window.location = { pathname: '/', href: '/', search: '' }` mock

**Estimated time:** 1-2 hours

---

### Category D: Feature Tests (3 files, ~7 failures)
**Files:**
- `my-stack-page.test.js` (7 tests, 1 passing)
- `login-page.test.js` (4 tests)
- `profile-page.test.js` (6 tests)
- `onboarding-page.test.js` (6 tests)

**Root cause:** Depends on Categories A, B, C (analytics + router + state)

**Fix strategy:**
1. Fix dependencies first
2. Update test expectations to match refactored components
3. Mock `stateManager.dispatch()` properly

**Estimated time:** 2-3 hours

---

### Category E: Utility Tests (5 files, ~5 failures)
**Files:**
- `date.test.js`
- `dosage-converter.test.js`
- `escape.test.js`
- `evidence.test.js`
- `logger.test.js`

**Root cause:** Likely simple — missing Date/Math mocks or wrong expectations

**Fix strategy:**
1. Run each test individually
2. Fix one-by-one (likely < 30 min each)

**Estimated time:** 1-2 hours

---

## 📋 Priority Order (Total ~10-15 hours)

### P0 — Unblock Core (3-4 hours)
1. ✅ Global mocks (DONE)
2. ❌ Fix `indexedDB.open()` mock to emit events properly
3. ❌ Fix `analytics-engine.init()` to not crash tests
4. ❌ Add `fetch()` mock

**Blockers resolved:** Analytics tests, app.test.js, platform tests

---

### P1 — Core Functionality (2-3 hours)
1. ❌ Fix `router.test.js` (navigation mocks)
2. ❌ Fix `app.test.js` (depends on P0)
3. ❌ Fix `event-bus.test.js` (likely quick)

**Blockers resolved:** Core architecture tests passing

---

### P2 — Feature Tests (3-4 hours)
1. ❌ Fix `my-stack-page.test.js` (update expectations after refactoring)
2. ❌ Fix `login-page.test.js` + `profile-page.test.js` + `onboarding-page.test.js`

**Blockers resolved:** Feature tests passing, safe to refactor

---

### P3 — Utilities (1-2 hours)
1. ❌ Fix utility tests one-by-one

**Blockers resolved:** 100% test pass rate

---

### P4 — Polish (2-3 hours)
1. ❌ Implement `storage-manager` encrypt/ttl/remove
2. ❌ Fix remaining edge cases
3. ❌ Increase coverage from 83% to 90%+

---

## 🎯 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Test Files Passing | 35/60 (58%) | 60/60 (100%) |
| Tests Passing | 496/579 (86%) | 579/579 (100%) |
| Failing Tests | 81 | 0 |
| IndexedDB Mock | ❌ Incomplete | ✅ Complete |
| Fetch Mock | ❌ Missing | ✅ Added |
| Analytics Init | ❌ Crashes | ✅ Works |
| Router Navigation | ❌ Missing | ✅ Mocked |

---

## 🔧 Quick Fixes Reference

### Fix 1: IndexedDB Mock
```javascript
// vitest.setup.js
global.indexedDB = {
  open: vi.fn((name, version) => {
    const request = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        createObjectStore: vi.fn(() => ({})),
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn(() => ({ onsuccess: null })),
            put: vi.fn(() => ({ onsuccess: null })),
            get: vi.fn(() => ({ onsuccess: null, result: null })),
            delete: vi.fn(() => ({ onsuccess: null })),
            clear: vi.fn(() => ({ onsuccess: null })),
            getAll: vi.fn(() => ({ onsuccess: null, result: [] }))
          }))
        }))
      }
    };

    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: { result: request.result } });
      }
      if (request.onsuccess) {
        request.onsuccess({ target: { result: request.result } });
      }
    }, 10);

    return request;
  }),
  deleteDatabase: vi.fn(() => ({
    onsuccess: null,
    onerror: null
  }))
};
```

### Fix 2: Fetch Mock
```javascript
// vitest.setup.js
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
    clone: () => this
  });
});
```

### Fix 3: Router Mock
```javascript
// vitest.setup.js
global.history = {
  pushState: vi.fn(),
  replaceState: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  length: 1,
  state: null
};

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
```

### Fix 4: Prevent Analytics Auto-Init
```javascript
// Option A: Mock analytics-engine before import
vi.mock('../analytics/analytics-engine.js', () => ({
  default: {
    init: vi.fn(() => Promise.resolve()),
    trackEvent: vi.fn(),
    identify: vi.fn()
  }
}));

// Option B: Stub init in analytics-engine.js
// Add check at top of analytics-engine.js:
if (import.meta.env.VITEST) {
  export default {
    init: async () => {},
    trackEvent: () => {},
    identify: () => {}
  };
}
```

---

## 📝 Next Steps

1. **Implement Fix 1 (IndexedDB)** → Unblocks 35+ analytics tests
2. **Implement Fix 2 (Fetch)** → Unblocks 10 API tests
3. **Implement Fix 3 (Router)** → Unblocks 6 router tests
4. **Implement Fix 4 (Analytics)** → Unblocks app.test.js
5. **Run full suite** → Verify progress
6. **Fix remaining edge cases** → One file at a time
7. **Reach 100% pass rate**

---

**Total estimated time:** 10-15 hours  
**Priority:** P0 — Blocks safe refactoring and deployments  
**Blocker status:** CRITICAL — 81 tests failing prevents confident code changes
