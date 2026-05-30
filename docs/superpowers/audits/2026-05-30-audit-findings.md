# SupliList Audit Findings — 2026-05-30

---

## Task 13: Test Coverage Baseline

### Coverage Report (vitest v4.1.7 + @vitest/coverage-v8)

| File | Statements | Branches | Functions | Lines | Notes |
|------|-----------|----------|-----------|-------|-------|
| **All files** | 64.99% | 53.82% | 59.81% | 67.03% | Tested files only |
| ai/dosage-calculator.js | 77.77% | 63.76% | 80% | 80% | Lines ~172-185, 196, 209 uncovered |
| ai/stack-recommender.js | 92.03% | 69.64% | 100% | 97.08% | Lines 250, 344-345 uncovered |
| core/event-bus.js | 71.02% | 47.77% | 61.11% | 72.27% | Lines ~329, 342-371, 383 uncovered |
| state/state-manager.js | 48.98% | 43.54% | 47.69% | 49.81% | Lines ~734, 749, 768-852 uncovered |
| Pages (11 files) | 0% | 0% | 0% | 0% | No test files exist |
| core/router.js | 0% | 0% | 0% | 0% | No test file |
| core/app.js | 0% | 0% | 0% | 0% | No test file |

> Note: Pages, router.js, and app.js have zero test coverage — they are excluded from vitest's report entirely because no test file imports them. The 64.99% overall applies only to the 4 tested source files.

---

### Test Quality Findings

## TESTS — Coverage infrastructure broken on fresh clone
- **Priority:** P1
- **File:** package.json / package-lock.json
- **Issue:** `npm ci` fails to install `@vitest/coverage-v8` despite it being listed in devDependencies — `npm run test -- --coverage` exits with "MISSING DEPENDENCY". `npm install` (not `npm ci`) is required. CI pipelines using `npm ci` will have no coverage.
- **Fix:** Regenerate package-lock.json so `@vitest/coverage-v8` is locked in, then verify `npm ci && npm run test -- --coverage` succeeds end-to-end.

---

## TESTS — state-manager.js has <50% coverage across all metrics
- **Priority:** P2
- **File:** src/state/state-manager.test.js
- **Issue:** state-manager.js has only 48.98% statement and 43.54% branch coverage. Lines 768-852 are entirely uncovered — likely additional action reducers, error-recovery paths, or state migration logic. With 17 tests already covering the happy-path actions, large reducer branches and the persistence layer remain untested.
- **Fix:** Add tests for any ACTIONS.* constants not exercised by the 17 existing tests, full `_pruneStorage` recursion guard, and any schema-upgrade/migration paths in lines 768-852.

---

## TESTS — event-bus.js branch coverage at 47.77%
- **Priority:** P2
- **File:** src/core/event-bus.test.js
- **Issue:** event-bus.js has 47.77% branch coverage. Lines 342-371 and 383 are uncovered — likely the error-metadata return paths when a handler throws, the case where `off()` targets a non-registered listener, and wildcard once() cleanup.
- **Fix:** Add tests for: `off()` with a handler not previously registered (should be a no-op), calling `once('*', handler)` and verifying it self-removes after one event, and inspecting the return value of `emit()` when a handler throws (error metadata object).

---

## TESTS — dosage-calculator.js test 7 uses toBeDefined() for all output fields
- **Priority:** P2
- **File:** src/ai/dosage-calculator.test.js[:123-147]
- **Issue:** Test 7 checks all 13 required output fields exist with `toBeDefined()` but does not verify actual values. A refactor that changes `unit` from `'g'` to `undefined` would still pass. Lines 172-185 (null/invalid profile guards) and 196 (edge case in calculateStack) are uncovered.
- **Fix:** (1) Replace `toBeDefined()` with value assertions for deterministic fields (e.g. `expect(res.unit).toBe('g')`). (2) Add: `DosageCalculator.calculate(supplement, null)` should not throw. (3) Add: `DosageCalculator.calculateStack([], profile)` should return `[]`.

---

## TESTS — stack-recommender.js test 5 budget scoring is a conditional no-op
- **Priority:** P2
- **File:** src/ai/stack-recommender.test.js[:107-135]
- **Issue:** The core assertion is wrapped in `if (richWhey && tightWhey)` — if either lookup returns `undefined`, the test passes with zero assertions made. This is a silent false-positive.
- **Fix:** Remove the conditional guard. Assert `expect(richWhey).toBeDefined()` and `expect(tightWhey).toBeDefined()` before comparing scores so the test fails loudly if whey-protein disappears from results.

---

## TESTS — stack-recommender.js test 8 evidence scoring is a conditional no-op
- **Priority:** P2
- **File:** src/ai/stack-recommender.test.js[:186-196]
- **Issue:** Test 8 uses `if (aSupplement && dSupplement)` — if no supplement in SUPPLEMENTS_DB has evidenceLevel `'D'`, the assertion body is never reached and the test passes vacuously. Currently the DB may have no `'D'`-level supplements.
- **Fix:** Assert at the top of the test that a `'D'`-level supplement exists in SUPPLEMENTS_DB, or inject a mock entry with known evidence levels, then drop the conditional.

---

## TESTS — No tests for router.js, app.js, or any of the 11 page modules
- **Priority:** P2
- **File:** src/core/router.js, src/core/app.js, src/pages/*.js (11 files)
- **Issue:** 13 source files have 0% coverage. router.js handles all SPA navigation and history-state management. app.js bootstraps the entire application. The 11 page modules contain form validation, data binding, and event wiring. None are tested at all.
- **Fix:** At minimum add unit tests for router.js (navigate(), popstate handling, route matching) and app.js (init sequence, module registration). For pages, prioritize home-page.js and my-stack-page.js as they contain the most critical user-facing logic.

---

## TESTS — checkin auto-ID/timestamp only verified with toBeDefined()
- **Priority:** P3
- **File:** src/state/state-manager.test.js[:129-130]
- **Issue:** Test 8 asserts `checkin.id` and `checkin.timestamp` are defined but does not verify format, type, or uniqueness. Two consecutive dispatches could generate identical IDs without detection.
- **Fix:** Assert `typeof checkin.id === 'string'` and `checkin.id.length > 0`; assert `isNaN(Date.parse(checkin.timestamp)) === false`. Add a second checkin dispatch and verify the two IDs differ.

---

## TESTS — streak calculation missing gap-in-sequence edge case
- **Priority:** P3
- **File:** src/state/state-manager.test.js[:235-251]
- **Issue:** Test 15 only verifies a clean 3-consecutive-day streak. There is no test for a gap in the middle (e.g. today + 3 days ago, skipping yesterday), which should reset the streak to 1.
- **Fix:** Add a test: checkins for today and 3 days ago (days 1 and 2 missing) should return `calculateStreak() === 1`.
