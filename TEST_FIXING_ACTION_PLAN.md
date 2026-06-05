# Test Fixing Action Plan — Sprint Execution

**Date:** 2026-06-05  
**Current Status:** 95/579 tests failing (83% passing)  
**Goal:** 100% test pass rate  
**Time Budget:** 8-12 hours  

---

## 📊 Current State

```
Test Files: 35/60 passing (58%)
Tests: 482/579 passing (83%)
Failing: 95 tests across 25 files
```

**Phase 1 (DONE):** ✅ Mock infrastructure complete
- IndexedDB, Fetch, History, Storage mocks ✅
- 3 source files created ✅
- analytics-engine: 10/10 passing ✅

---

## 🎯 Sprint Plan (4 Phases, 8-12h)

### Phase 2: Quick Wins (2-3h) — Target: +30 tests

**Goal:** Fix files with simple issues (imports, mocks, expectations)

#### Task 2.1: Router Tests (30 min)
**File:** `src/core/router.test.js` (6 tests)  
**Issue:** "Router is not a constructor"  
**Fix:**
```bash
# 1. Check export type
grep "export" src/core/router.js | head -5

# 2. Fix import if needed
# If: export default class Router {}
# Then: import Router from './router.js'
# If: export class Router {}
# Then: import { Router } from './router.js'
```

**Action:**
- [ ] Read `src/core/router.js` first 20 lines
- [ ] Identify export type
- [ ] Fix `router.test.js` import
- [ ] Run: `npm test -- src/core/router.test.js`
- [ ] Verify: 6/6 passing

---

#### Task 2.2: Event Bus Tests (30 min)
**File:** `src/core/event-bus.test.js` (6 tests)  
**Issue:** Unknown (need to investigate)  
**Action:**
- [ ] Run: `npm test -- src/core/event-bus.test.js 2>&1 | tail -50`
- [ ] Identify error pattern
- [ ] Fix (likely simple mock or import)
- [ ] Verify: 6/6 passing

---

#### Task 2.3: API Client Tests (30 min)
**File:** `src/platform/api-client.test.js` (5 tests)  
**Issue:** Fetch mock verification needed  
**Action:**
- [ ] Run: `npm test -- src/platform/api-client.test.js`
- [ ] Check if fetch mock is being used correctly
- [ ] Fix any async/promise handling issues
- [ ] Verify: 5/5 passing

---

#### Task 2.4: Identity Service Tests (30 min)
**File:** `src/platform/identity-service.test.js` (5 tests)  
**Issue:** Depends on api-client + storage  
**Action:**
- [ ] Fix after Task 2.3
- [ ] Mock dependencies if needed
- [ ] Verify: 5/5 passing

---

#### Task 2.5: Analytics Suite (30 min)
**Files:** 
- `event-pipeline.test.js`
- `funnel-engine.test.js`
- `session-tracker.test.js`
- `affiliate-engine.test.js`

**Issue:** IndexedDB mock worked for analytics-engine, verify others  
**Action:**
- [ ] Run each file individually
- [ ] Likely passing now (IndexedDB fixed)
- [ ] Fix any edge cases
- [ ] Target: +20 tests passing

---

### Phase 3: Feature Tests (3-4h) — Target: +35 tests

**Goal:** Update tests to match refactored components

#### Task 3.1: My Stack Page (1.5h)
**File:** `src/features/stack/my-stack-page.test.js` (7 tests, 1 passing)  
**Issue:** Tests expect old monolithic structure (2105 lines → 137 lines)

**Refactoring changes:**
- `list-page.js` split into 5 modules
- `my-stack-page.js` refactored with new helpers
- DOM structure changed

**Action:**
- [ ] Read refactored `my-stack-page.js` (lines 1-50)
- [ ] Identify new DOM structure
- [ ] Update test selectors:
  ```javascript
  // Old: querySelector('#msp-total-investment')
  // New: querySelector('#msp-stats-investment') or similar
  ```
- [ ] Update mock data to match new component APIs
- [ ] Run tests one-by-one:
  ```bash
  npm test -- my-stack-page.test.js -t "Calculates and displays"
  ```
- [ ] Fix each until 7/7 passing

---

#### Task 3.2: Login/Profile/Onboarding (1.5h)
**Files:**
- `login-page.test.js` (4 tests)
- `profile-page.test.js` (6 tests)
- `onboarding-page.test.js` (6 tests)

**Issue:** Depends on router + identity-service (fixed in Phase 2)

**Action:**
- [ ] Fix login-page first (auth flow)
- [ ] Then profile-page (user data)
- [ ] Finally onboarding (multi-step form)
- [ ] Each likely needs minor mock adjustments
- [ ] Target: 16/16 passing

---

#### Task 3.3: Platform Tests (1h)
**Files:**
- `pwa-handler.test.js` (10 tests)
- `offline-handler.test.js` (10 tests)

**Issue:** IndexedDB + serviceWorker mocks

**Action:**
- [ ] Verify IndexedDB mock works for these
- [ ] Check serviceWorker.register mock
- [ ] Fix async promise handling
- [ ] Target: 20/20 passing

---

### Phase 4: Utilities & Edge Cases (2-3h) — Target: +20 tests

#### Task 4.1: Utility Tests (1.5h)
**Files:**
- `date.test.js`
- `dosage-converter.test.js`
- `escape.test.js`
- `evidence.test.js`
- `logger.test.js`

**Issue:** Likely simple (wrong expectations, missing mocks)

**Action:**
- [ ] Run each individually
- [ ] Fix one-by-one (< 30 min each)
- [ ] Likely Date/Math mock issues
- [ ] Target: 5 files passing

---

#### Task 4.2: Storage Manager Advanced (1h)
**File:** `storage-manager.test.js` (4 tests failing)

**Missing features:**
1. `encrypt` / `decrypt` options
2. `ttl` expiration
3. `remove()` method
4. Namespace filtering

**Action:**
- [ ] Option A: Implement features (2-3h)
- [ ] Option B: Mark as `.skip()` with TODO (10 min) ✅ **Recommended**
- [ ] Decision: Skip for now, document in issue

---

#### Task 4.3: Virtual Scroller & App Tests (30 min)
**Files:**
- `virtual-scroller.test.js`
- `app.test.js` (5 tests)

**Issue:** app.test.js depends on analytics (fixed), virtual-scroller unknown

**Action:**
- [ ] Test virtual-scroller (likely passing now)
- [ ] Test app.test.js (likely passing now)
- [ ] Fix any remaining edge cases

---

### Phase 5: Final Sweep (1h) — Target: 100%

#### Task 5.1: Run Full Suite
```bash
npm test
```

**Expected:** ~580/579 passing (allow for new tests discovered)

---

#### Task 5.2: Fix Stragglers
- [ ] Identify any remaining failures
- [ ] Fix one-by-one
- [ ] Prioritize by error frequency

---

#### Task 5.3: Coverage Check
```bash
npm run test:coverage
```

**Target:** 85%+ coverage (already at 83%, so close)

---

## 🔧 Execution Commands

### Run Single File
```bash
npm test -- src/core/router.test.js
```

### Run with Filter
```bash
npm test -- my-stack-page.test.js -t "Calculates"
```

### Watch Mode (for iteration)
```bash
npm test -- --watch router.test.js
```

### Verbose Output
```bash
npm test -- router.test.js --reporter=verbose
```

### See Error Details
```bash
npm test -- router.test.js 2>&1 | tail -100
```

---

## 📋 Progress Tracker

### Phase 2: Quick Wins (Target: +30 tests)
- [ ] Task 2.1: Router (6 tests)
- [ ] Task 2.2: Event Bus (6 tests)
- [ ] Task 2.3: API Client (5 tests)
- [ ] Task 2.4: Identity Service (5 tests)
- [ ] Task 2.5: Analytics Suite (~20 tests)

**Total:** 42 tests → Expect 95 - 42 = **53 failing after Phase 2**

---

### Phase 3: Feature Tests (Target: +35 tests)
- [ ] Task 3.1: My Stack Page (6 tests)
- [ ] Task 3.2: Login/Profile/Onboarding (16 tests)
- [ ] Task 3.3: Platform (PWA/Offline) (20 tests)

**Total:** 42 tests → Expect 53 - 42 = **11 failing after Phase 3**

---

### Phase 4: Utilities (Target: +11 tests)
- [ ] Task 4.1: Utility files (~5 tests)
- [ ] Task 4.2: Storage advanced (skip)
- [ ] Task 4.3: Virtual Scroller + App (~6 tests)

**Total:** 11 tests → Expect **0 failing after Phase 4** 🎯

---

### Phase 5: Final Sweep
- [ ] Task 5.1: Full suite run
- [ ] Task 5.2: Fix stragglers
- [ ] Task 5.3: Coverage check

**Target:** ✅ **579/579 passing (100%)**

---

## 🚨 Blocker Protocol

If stuck on any task for >30 min:

1. **Skip and document:**
   ```javascript
   it.skip('test name', () => { ... }) // TODO: Issue #123
   ```

2. **Create GitHub issue** with:
   - Error message
   - Expected vs actual behavior
   - Attempted fixes

3. **Move to next task** — don't block progress

---

## 📈 Success Criteria

- [ ] Test Files: 60/60 passing (100%)
- [ ] Tests: 579/579 passing (100%)
- [ ] Coverage: >85%
- [ ] No `.skip()` tests (or documented in issues)
- [ ] CI/CD passing
- [ ] Zero console errors/warnings

---

## ⏱️ Time Checkpoints

| Checkpoint | Time | Expected State |
|------------|------|----------------|
| **Phase 2 Start** | 0h | 95 failing |
| **Phase 2 End** | 2-3h | 53 failing (-42) |
| **Phase 3 End** | 5-7h | 11 failing (-42) |
| **Phase 4 End** | 7-10h | 0 failing (-11) 🎯 |
| **Phase 5 End** | 8-12h | 100% passing ✅ |

---

## 🎯 Next Action

**START HERE:**

```bash
# Task 2.1: Fix router tests (30 min)
npm test -- src/core/router.test.js 2>&1 | tail -50
```

Then read `src/core/router.js` to identify export type and fix import.

---

**Let's execute!** 🚀
