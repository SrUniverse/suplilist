# Audit Findings — 2026-05-30

## Summary
<!-- Filled in at the end -->

## Findings
<!-- Appended per task -->

---

## EVENT-BUS — Legacy Duplicate Event Constants
- **Priority:** P3
- **File:** src/core/event-bus.js:38-39
- **Issue:** `STACK_ITEM_ADDED_LEGACY` (`stack:item:added`) and `STACK_ITEM_REMOVED_LEGACY` (`stack:item:removed`) duplicate `STACK_ITEM_ADDED` / `STACK_ITEM_REMOVED` with only a naming convention difference. Any consumer using the legacy names bypasses the canonical event and can cause silent divergence in listeners.
- **Fix:** Grep all usages of the legacy constants and migrate callers to the canonical events, then remove the legacy entries from EVENTS.

## EVENT-BUS — `on()` and `once()` Share Duplicated Logic
- **Priority:** P3
- **File:** src/core/event-bus.js:165-198 / 203-235
- **Issue:** `on()` and `once()` are near-identical — element extraction, validation, and listener object construction are copy-pasted. Any future change to listener shape must be applied in two places, risking divergence.
- **Fix:** Extract a shared private `#createListener(eventName, callback, options, once)` helper and call it from both `on()` and `once()`.

## EVENT-BUS — Listener Leak Risk Without DOM Element Reference
- **Priority:** P2
- **File:** src/core/event-bus.js:165
- **Issue:** Auto-pruning via `WeakRef` only activates when callers pass an `HTMLElement` as the third argument. Page modules that subscribe in `connectedCallback` / `init` without passing `this` (the element) and do not call the returned unsubscribe function on teardown will silently accumulate listeners. The prune mechanism does not help non-element subscribers (plain objects, service classes, etc.).
- **Fix:** Audit every `eventBus.on()` call site in `src/pages/` and `src/core/` to verify: (a) element ref is passed, OR (b) the returned unsubscribe function is stored and called on destruction. Add a lint rule or JSDoc @param note to make the contract explicit.

## EVENT-BUS — Silent non-function callback suppression in non-debug mode
- **Priority:** P2
- **File:** src/core/event-bus.js:168-173
- **Issue:** If `callback` is not a function and `#debug` is `false`, the invalid call is silently ignored and a no-op unsubscribe is returned with no signal to the caller. This means wiring bugs (passing the wrong argument to `on()`) are invisible in production.
- **Fix:** Always throw or warn when callback is not a function, regardless of debug mode. Silent failure modes hide bugs.

## EVENT-BUS — `error:system` Re-Emit Can Recurse Deeply
- **Priority:** P2
- **File:** src/core/event-bus.js:295-302
- **Issue:** When a listener throws, the bus re-emits `error:system`. If an `error:system` listener itself throws, the guard `if (eventName !== 'error:system')` stops the outer recursion, but the error is silently swallowed with only a `console.error`. If the system error handler is also faulty, failures go unnoticed.
- **Fix:** Wrap the `error:system` re-emit call itself in a try/catch and log failures to console as a last resort. Optionally expose an `onError` hook so the host app can instrument unhandled bus errors.

## EVENT-BUS — `AFFILIATE_CLICK` Uses Underscore Instead of Colon Namespace
- **Priority:** P3
- **File:** src/core/event-bus.js:126
- **Issue:** `AFFILIATE_CLICK: 'affiliate_click'` breaks the `namespace:action` convention used by every other event. This inconsistency makes wildcard pattern matching and log filtering harder.
- **Fix:** Rename the string value to `'affiliate:click'` (confirm no external integrations depend on the literal string value first). Note: this string is likely sent to third-party affiliate networks as a literal event name — check all outbound network calls and analytics integrations before renaming. This may not be safe to rename at all.

## EVENT-BUS — Test Suite Cannot Execute (Broken vitest Install)
- **Priority:** P1
- **File:** node_modules/vitest/dist/ (missing cli.js)
- **Issue:** Running `npm run test` fails with `ERR_MODULE_NOT_FOUND: vitest/dist/cli.js`. The vitest `dist/` directory contains only `chunks/` and `workers/` subdirectories — the entry point is absent. No tests in the project can be validated until this is resolved.
- **Fix:** Delete `node_modules` and run `npm ci` (or `npm install`) to restore a complete vitest installation. Verify with `npx vitest --version` before re-running the suite.

---

## ROUTER — Silent No-Op on Unknown Route
- **Priority:** P2
- **File:** src/core/router.js:42
- **Issue:** When `matchRoute()` finds no matching route, `handleRoute()` returns silently (`if (!match) return`). The user sees a blank `#router-outlet` with no error page, no redirect, and no console warning. Any typo in a hash URL or stale bookmark results in a completely empty viewport.
- **Fix:** Add a catch-all `{ path: '/404', load: ... }` route and redirect to it when `match` is null, or at minimum render an inline "Page not found" message in the container and emit a `router:not-found` event on the EventBus.

## ROUTER — Hash-Only Navigation (No History API)
- **Priority:** P3
- **File:** src/core/router.js:7, 14
- **Issue:** The router is built entirely on `window.location.hash` / `hashchange`. It does not use the History API (`pushState` / `popstate`). This is a deliberate design choice for a hash-router, but it means URLs always contain `#`, sharing URLs shows the fragment, and there is no server-side rendering path. This is an architectural constraint worth documenting.
- **Fix:** No urgent change needed if hash routing is intentional. Document the decision in a `docs/architecture/routing.md` note. If clean URLs are ever required, the entire router must be replaced with a `popstate`-based implementation.

## ROUTER — No Error Boundary Around Dynamic `import()` and `mount()`
- **Priority:** P1
- **File:** src/core/router.js:52-55
- **Issue:** `route.load()` (dynamic import) and `this.currentPage.mount()` are awaited without a try/catch. If a page module fails to load (network error, syntax error in the module) or `mount()` throws, the unhandled promise rejection leaves the container empty and `this.currentPage` in a partially-initialized state. Subsequent navigations may call `unmount()` on the broken page object and compound the error.
- **Fix:** Wrap lines 52–55 in a try/catch. On failure, render an error fallback into the container, reset `this.currentPage = null`, and emit an `error:system` or `router:error` event so the app can surface the issue.

## ROUTER — `unmount()` Not Guarded Against Throws
- **Priority:** P2
- **File:** src/core/router.js:46-48
- **Issue:** `this.currentPage.unmount()` is awaited without a try/catch. If `unmount()` throws (e.g., a page tries to clean up a destroyed DOM node), the route transition is aborted mid-flight — the old page is never cleared, the new page is never mounted, and `this.currentPage` still points to the failed page.
- **Fix:** Wrap the `unmount()` call in a try/catch. Log any error but continue the transition: always clear the container and mount the next page regardless of unmount failures.

## ROUTER — Routes Registered as String Literals, Not Constants
- **Priority:** P3
- **File:** src/core/app.js:6-18
- **Issue:** Route path strings (`'/home'`, `'/list'`, etc.) are defined inline as literals with no shared constants file. Any component that needs to navigate programmatically must hard-code the same string, creating a silent coupling. A typo in one place causes a no-op navigation (see the silent-404 issue above).
- **Fix:** Extract route paths into a `src/core/routes.js` constants object (e.g., `export const ROUTES = { HOME: '/home', LIST: '/list', ... }`). Import these constants in both `app.js` and any page that calls `router.navigate()`.

## ROUTER — `updateNav()` Uses Fragile String Normalization
- **Priority:** P3
- **File:** src/core/router.js:61-67
- **Issue:** `updateNav()` derives the active path by stripping `#/?` prefixes via a regex and falls back to `'home'` for an empty string. The active-nav logic is separate from `matchRoute()`, so they can drift: a route that matches in `matchRoute()` may not get highlighted correctly if the normalization regexes differ subtly. The special-case `|| 'home'` fallback is also untested.
- **Fix:** Drive `updateNav()` from the same normalized path that `matchRoute()` returns, rather than re-normalizing `window.location.hash` independently.

---

## APP — `applyLandingMode()` Runs Before DOM Is Ready
- **Priority:** P2
- **File:** src/core/app.js:21-25
- **Issue:** `applyLandingMode()` is defined at module scope and references `window.location.hash` directly, but it is only called inside `DOMContentLoaded`, so the function itself is fine. However, the function manipulates `document.body.classList` — if it were ever called outside the `DOMContentLoaded` guard (e.g., moved to module top-level), it would fail silently because `document.body` is null during script parse. The guard is fragile and the separation is not obvious.
- **Fix:** Move `applyLandingMode` inside the `DOMContentLoaded` callback or add an internal guard (`if (!document.body) return`) to make it safe to call at any time.

## APP — EventBus Wired Last, After Router Start
- **Priority:** P2
- **File:** src/core/app.js:46, 77
- **Issue:** The Router is started on line 46 (`new Router(routes, container).start()`), which immediately calls `handleRoute()` and may trigger page `mount()`. The `toast:show` EventBus listener is not registered until line 77. Any toast emitted during page mount (e.g., a page showing a welcome notification) will fire before the listener exists and be silently dropped.
- **Fix:** Register all EventBus listeners before calling `router.start()`.

## APP — Router Instance Not Retained; Navigation Requires Direct Hash Manipulation
- **Priority:** P2
- **File:** src/core/app.js:46
- **Issue:** `new Router(routes, container)` is constructed but the instance is discarded — it is never assigned to a variable. Pages that need to navigate programmatically must call `window.location.hash = ...` directly, bypassing any future router-level logic (guards, middleware, transition hooks). The nav-item click handler on line 49-53 also manipulates the hash directly for the same reason.
- **Fix:** Assign the router to a variable (and optionally export it or attach it to a lightweight app singleton) so pages can call `router.navigate(path)` through the proper API.

## APP — No Global Error Boundary for Unhandled Promise Rejections
- **Priority:** P2
- **File:** src/core/app.js (entire file)
- **Issue:** There is no `window.addEventListener('unhandledrejection', ...)` handler. Given that the router uses async `handleRoute()`, page `mount()` / `unmount()` are async, and state hydration may be async, any uncaught promise rejection is invisible to users and silently dropped in production.
- **Fix:** Add an `unhandledrejection` listener inside `DOMContentLoaded` that at minimum emits `error:system` on the EventBus so the app can surface a toast or error UI.

## APP — Theme Initialization Is Split Across Two `localStorage` Keys
- **Priority:** P3
- **File:** src/core/app.js:58
- **Issue:** On startup, theme is read from either `'suplilist:theme'` or the legacy `'theme'` key (`localStorage.getItem('suplilist:theme') || localStorage.getItem('theme')`). On save, only `'suplilist:theme'` is written (line 65). A user who previously had `'theme'` set will have their preference respected on first load, but if they never change theme, the old `'theme'` key is never migrated. On a different device (or after clearing `'suplilist:theme'`), the legacy key would apply again, silently.
- **Fix:** After reading the theme at startup, always write it back under `'suplilist:theme'` and remove the legacy `'theme'` key to complete the migration in one pass.

## APP — No Exported API; Integration Testing Is Impossible
- **Priority:** P3
- **File:** src/core/app.js
- **Issue:** `app.js` exports nothing. The router, stateManager, and eventBus instances created inside `DOMContentLoaded` are local variables with no external handles. This makes it impossible to write integration tests that poke the router or check state after simulated navigation without monkey-patching globals.
- **Fix:** Export an `initApp()` function that accepts an options object (container, initial hash) and returns `{ router, stateManager, eventBus }`. The `DOMContentLoaded` callback calls `initApp()` with defaults. Tests call it directly with a fixture container.

## APP — EVENT-BUS — Missing Test Cases for Edge Behaviors
- **Priority:** P2
- **File:** src/core/event-bus.test.js
- **Issue:** The existing 11 test cases cover happy paths well, but the following scenarios are untested: (a) `off()` called with a non-existent / never-registered callback (should be a no-op, currently untested); (b) `once()` returned unsubscribe function calling `off()` before the event fires; (c) listener that calls `eventBus.off()` on itself during its own callback (self-unsubscribing mid-emit); (d) `emit()` with no registered listeners at all for that event (no throw expected).
- **Fix:** Add test cases for the four scenarios above to harden regression coverage.

---

## STATE-MANAGER — `undo()` Does Not Wrap Subscriber Calls in try/catch
- **Priority:** P2
- **File:** src/state/state-manager.js:453
- **Issue:** `undo()` calls `this._subscribers.forEach(cb => cb(this._state))` without a try/catch. A throwing subscriber will abort the forEach loop and leave subsequent subscribers unnotified — exactly the fault that `dispatch()` guards against with individual try/catches. The two code paths are inconsistent.
- **Fix:** Wrap each subscriber call in `undo()` with the same try/catch pattern used in `dispatch()` (lines 422–425).

## STATE-MANAGER — Cross-Tab Sync Overwrites Active Session `ui` Slice With `DEFAULT_STATE.ui`
- **Priority:** P2
- **File:** src/state/state-manager.js:569-596
- **Issue:** `_setupStorageSync()` merges the incoming cross-tab payload with `DEFAULT_STATE` via `_deepMerge`, which replaces the live session's `ui` slice with `DEFAULT_STATE.ui` values. Any open modal, active toast, or current route is silently reset when another tab writes state.
- **Fix:** After cross-tab merge, preserve the in-memory `ui` slice: `const merged = { ...this._deepMerge(DEFAULT_STATE, migrated), ui: this._state.ui }`.

## STATE-MANAGER — `setState()` Bypasses Reducer and `_emitEventBus()`
- **Priority:** P2
- **File:** src/state/state-manager.js:776-828
- **Issue:** `setState()` writes to state via `_setPath()` + `export()`, completely bypassing the reducer. Arbitrary paths can be mutated without action logging and EventBus listeners for mapped actions are silently skipped — only a generic `state:changed` event fires, creating two divergent notification channels.
- **Fix:** Deprecate `setState()` in favor of `dispatch()`. Add a `console.warn` deprecation notice. Extend the existing delegate pattern (already used for `favorites` and `settings.theme`) to cover all callers, then remove the raw `_setPath` branch.

## STATE-MANAGER — `_pruneStorage()` Schedules a Second `_persist()` Via `dispatch()` After Quota Error
- **Priority:** P2
- **File:** src/state/state-manager.js:547-564
- **Issue:** `_pruneStorage()` calls `this.dispatch(PRUNE_CHECKINS_TEST, ...)`, which queues a debounced `_persist()` 300ms later. If the quota is still exceeded after pruning, the deferred flush re-triggers `_pruneStorage()` — the `_isPruning` guard only blocks re-entry in the same call stack, not the deferred one.
- **Fix:** After calling `dispatch()` inside `_pruneStorage()`, immediately call `clearTimeout(this._persistTimer)` to cancel the debounced persist queued by `dispatch()`, ensuring only the explicit `_flushPersist()` call runs.

## STATE-MANAGER — Optional Fields in `DEFAULT_STATE` Are Not Documented
- **Priority:** P3
- **File:** src/state/state-manager.js:38-98
- **Issue:** Several fields are initialized to `null` with no documentation of when they transition to non-null (e.g., `user.id`, `ui.modal`, `ui.toast`, `recommendations.profileHash`). Consumers must defensively null-check these fields, but the contract is implicit.
- **Fix:** Add JSDoc `@typedef` blocks for `User`, `StackItem`, `CheckIn`, `Recommendation`, and `UIState` documenting which fields are nullable vs. always-present.

## STATE-MANAGER — Test Suite Cannot Execute (Broken vitest Install)
- **Priority:** P1
- **File:** node_modules/vitest/dist/ (missing cli.js) — same root cause as EVENT-BUS finding
- **Issue:** `npm run test -- src/state/state-manager.test.js` fails with `ERR_MODULE_NOT_FOUND: vitest/dist/cli.js`. All 17 state-manager tests are unverifiable until the vitest installation is repaired.
- **Fix:** Run `npm ci` or `npm install` to restore a complete vitest installation (same fix as documented in EVENT-BUS section).

## STATE-MANAGER — Missing Test Coverage for `undo()`, Cross-Tab Sync, `hydrate()`, and Corrupt localStorage Init
- **Priority:** P2
- **File:** src/state/state-manager.test.js
- **Issue:** The 17 existing tests cover happy paths and QuotaExceeded pruning but leave untested: (a) `undo()` reverts state and calls subscribers; (b) `undo()` returns `false` when history is empty; (c) `_setupStorageSync()` cross-tab merge; (d) `hydrate()` with partial payload merges correctly with `DEFAULT_STATE`; (e) corrupt JSON in localStorage falls back to `DEFAULT_STATE`; (f) `setState()` for an arbitrary dot-path.
- **Fix:** Add test cases for all six scenarios.

---

## DOSAGE-CALCULATOR — `calculateStack()` Does Not Guard Against `calculate()` Throwing
- **Priority:** P2
- **File:** src/ai/dosage-calculator.js:160-166
- **Issue:** `calculateStack()` calls `calculate()` in a `.map()` with no try/catch. A single supplement entry missing a `dosage` field will throw and abort the entire map, returning no results to the caller.
- **Fix:** Wrap the `calculate()` call in a try/catch inside `calculateStack()`. On error, skip the entry with a console warning or return a sentinel object.

## DOSAGE-CALCULATOR — Falsy Guard on `weight`/`age`/`freq` Silently Uses Defaults for `0` Values
- **Priority:** P2
- **File:** src/ai/dosage-calculator.js:73-76
- **Issue:** `userProfile.weight || 70` replaces `0` with `70` silently. Same for `freq` and `age`. A data-entry bug producing `weight: 0` would compute dosages as if the user weighs 70 kg.
- **Fix:** Use explicit null/undefined guards: `userProfile.weight != null ? userProfile.weight : 70`. Add a validation warning if weight is <= 0.

## DOSAGE-CALCULATOR — `supplement.dosage.multiplier` Accessed Without Optional Chaining When `isFixed` Is False
- **Priority:** P1
- **File:** src/ai/dosage-calculator.js:83
- **Issue:** Line 83 dereferences `supplement.dosage.multiplier` without optional chaining. If `supplement.dosage` is `undefined`, this throws `TypeError`. Line 78 uses `supplement.dosage?.maintenance` (with optional chaining), making line 83 inconsistent and the crash risk non-obvious.
- **Fix:** Change to `supplement.dosage?.multiplier`. Add a guard: `if (!supplement.dosage) throw new Error('[DosageCalculator] supplement.dosage is required')`.

## DOSAGE-CALCULATOR — No Tests for Invalid/Edge Inputs
- **Priority:** P2
- **File:** src/ai/dosage-calculator.test.js
- **Issue:** All 8 tests use valid inputs. No tests for: (a) `calculate(null, profile)` — should throw; (b) `calculate(supplement, null)` — should throw; (c) `calculateStack(null, profile)` — should return `[]`; (d) `calculateStack([], profile)` — should return `[]`; (e) supplement with no `dosage` field; (f) `weight: 0` or negative weight.
- **Fix:** Add test cases for all six scenarios.

## STACK-RECOMMENDER — `recommend()` Emits EventBus Event Directly, Duplicating StateManager Emission
- **Priority:** P2
- **File:** src/ai/stack-recommender.js:208
- **Issue:** `recommend()` emits `ai:recommendationsReady` directly. `StateManager.dispatch(SET_RECOMMENDATIONS)` also emits the same event via `_emitEventBus()`. Any caller that dispatches `SET_RECOMMENDATIONS` after calling `recommend()` causes the event to fire twice, triggering duplicate UI updates.
- **Fix:** Remove the direct `eventBus.emit()` call from `recommend()`. EventBus notification should be the sole responsibility of the StateManager after state is committed.

## STACK-RECOMMENDER — `_calculatePersonalDosage()` Called Twice Per Supplement (Double Computation)
- **Priority:** P3
- **File:** src/ai/stack-recommender.js:193, 299
- **Issue:** In the `recommend()` loop, `_calculatePersonalDosage()` is called once explicitly (line 193) and again inside `_scoreCostBenefit()` (line 299 via `_calculateScore()`). Each supplement incurs two full dosage computations per recommendation call.
- **Fix:** Compute `_calculatePersonalDosage()` once per supplement in the loop and pass the result to both `_calculateScore()` and `_estimateMonthlyCost()`.

## STACK-RECOMMENDER — No Tests for `null`/`undefined` Profile or Fully-Filtered Stack
- **Priority:** P2
- **File:** src/ai/stack-recommender.test.js
- **Issue:** All 11 tests use well-formed profile objects. Untested: (a) `recommend(null)` — should return `[]`; (b) `recommend(undefined)` — should return `[]`; (c) `topN=0` — should return `[]`; (d) all supplements in `currentStack` — should return `[]`; (e) restriction string matching no supplement.
- **Fix:** Add test cases for all five scenarios.

---

## DATABASE — 145 Explicit `null` Values Across Optional Fields (Schema Documentation Gap)
- **Priority:** P3
- **File:** database.js:174+
- **Issue:** The consistency check found 145 `null` values across 57 entries in fields `dn`, `cy`, `badge`, `warn`, `dm`. These are intentionally optional but encoded as explicit `null` rather than being omitted, requiring consumers to null-check every field. The schema contract (which fields are nullable vs. required) is undocumented.
- **Fix:** Document the schema with a JSDoc `@typedef` for the `IT` entry shape. Consider using omitted fields (undefined) rather than explicit `null` for truly optional fields to align with optional-chaining idioms.

## DATABASE — 2 Entries Have Extra Fields Absent From the Rest of the Array (`hasForms`, `formKey`, `mlp`, `azp`)
- **Priority:** P2
- **File:** database.js — indices 8 (Magnésio glicinato) and 10 (Creatina Monohidratada)
- **Issue:** `hasForms`, `formKey`, `mlp`, and `azp` appear only on 2 of 57 entries. Accessing `IT[i].hasForms` on any other entry returns `undefined`. `if (item.hasForms)` silently evaluates to `false` for the 55 entries that omit the field — correct today but fragile: a future entry that should have `hasForms: true` but omits it will silently behave as `false`.
- **Fix:** Add `hasForms: false`, `formKey: null`, `mlp: null`, `azp: null` to all entries that currently omit them, or document these as optional in the schema typedef.

## DATABASE — `CAT` Constants and `IT[n].cat` Values Are Not Cross-Validated at Startup
- **Priority:** P2
- **File:** database.js:40-60, 174+
- **Issue:** `CAT` defines 19 category keys. `IT[n].cat` values are raw strings never validated against `CAT`. A typo in a future `cat` value (e.g., `'Desempenho'` vs. `'Performance'`) will silently fail to resolve a CSS class, rendering that entry with no visual category style.
- **Fix:** Add a startup assertion (or build-time test) that checks every `IT[n].cat` value exists as a key in `CAT`. A single `forEach` in the module body is sufficient.

## DATABASE — `GOAL_MAP` Numeric IDs Are Not Validated Against `IT` Entries
- **Priority:** P2
- **File:** database.js:63-75
- **Issue:** `GOAL_MAP` maps goal strings to arrays of numeric `id` values. There is no validation that every referenced ID actually exists in `IT`. A deleted or renumbered entry silently orphans a goal mapping, causing goal-filtered views to return phantom results or empty lists.
- **Fix:** Add a startup assertion that every ID in every `GOAL_MAP` array matches an existing `IT[n].id`. Alternatively, refactor `GOAL_MAP` to use string slugs to eliminate the numeric coupling.

## DATABASE — `IT` Array Is Mutable (Intentional but Risky)
- **Priority:** P3
- **File:** database.js:173
- **Issue:** The comment explicitly states `IT` is not frozen to allow affiliate link injection at startup. Any module that imports `IT` can mutate it accidentally (e.g., `IT[0].pm = 0` silently corrupts prices for the session).
- **Fix:** Perform affiliate link injection on a shallow copy or derived structure rather than mutating the canonical exported array. Then `deepFreeze(IT)` at module end to prevent accidental mutation.

---

## PAGES/CALCULATOR-PAGE — `unmount()` Does Not Remove Event Listeners
- **Priority:** P2
- **File:** src/pages/calculator-page.js:53-55
- **Issue:** `unmount()` only calls `clearTimeout(this._debounce)`. All `addEventListener` calls in `_attachListeners()`, `_attachChipListeners()`, and `_attachResultListeners()` are anonymous closures that are never removed. Because the router re-uses the container element, these listeners accumulate on the same DOM nodes every time the page is mounted, firing multiple times per interaction after the first visit.
- **Fix:** Store named listener references and call `removeEventListener` in `unmount()`, or call `this.container.innerHTML = ''` during teardown (discarding DOM nodes and their attached listeners).

## PAGES/CALCULATOR-PAGE — XSS via `rationale` and `timing` Inserted Into `innerHTML` Without Sanitization
- **Priority:** P1
- **File:** src/pages/calculator-page.js:245, 272
- **Issue:** `result?.rationale` (line 245) and `supp.dosage?.timing` (line 272) are interpolated directly into innerHTML template strings. These values come from `SUPPLEMENTS_DB`, a static build-time file — currently safe — but any future extension from an external or admin-editable source would allow XSS. No `escapeHtml()` helper is applied to these fields.
- **Fix:** Apply a shared `escapeHtml()` helper to all dynamic string values before inserting into HTML templates.

## PAGES/CALCULATOR-PAGE — SRP Violation: Styles, Layout, Business Logic, and State Mutation in One 853-Line File
- **Priority:** P3
- **File:** src/pages/calculator-page.js
- **Issue:** The file mixes inline CSS injection, DOM rendering, dosage calculation orchestration, event delegation, and StateManager dispatch. A CSS tweak requires navigating the same file as a dosage logic change.
- **Fix:** Extract the style string to a `.css` file. Extract render helpers into a `calculator-renderer.js` module.

---

## PAGES/CHECKIN-PAGE — `item.dosage?.timing` Treats `dosage` as Object When It Is a Number
- **Priority:** P2
- **File:** src/pages/checkin-page.js:212
- **Issue:** `item.dosage?.timing` optional-chains a `.timing` property off the `dosage` field, but the stack item shape stores `dosage` as a plain number (e.g., `5`). This always evaluates to `undefined`, silently discarding the intended path; `item.timing` is used as the fallback anyway.
- **Fix:** Remove `item.dosage?.timing` from the fallback chain; use `item.timing` directly. Document the stack item schema.

## PAGES/CHECKIN-PAGE — Full Re-render on Every Check-in Creates DOM Thrash
- **Priority:** P2
- **File:** src/pages/checkin-page.js:380-383
- **Issue:** `_refresh()` calls `_render()` + `_attachListeners()` on every single check-in action, replacing all container DOM. For stacks of 10+ items this rebuilds all supplement cards on every tap. The CSS progress bar `transition: width 0.5s ease` resets on each action instead of animating smoothly.
- **Fix:** Implement targeted DOM updates: toggle the specific card classes and update only the progress bar width attribute rather than full `innerHTML` re-render.

---

## PAGES/FAQ-PAGE — `aHtml` Values Inserted Unsanitized Into `innerHTML`
- **Priority:** P1
- **File:** src/pages/faq-page.js:272-274
- **Issue:** FAQ items with `aHtml` inject their raw HTML string directly via `innerHTML`. The values are hardcoded module-level strings containing only safe anchor tags — currently not a risk — but the pattern bypasses the available `_escapeHtml()` helper entirely. Any future `aHtml` contribution without review could introduce XSS.
- **Fix:** Either sanitize `aHtml` with a trusted sanitizer (DOMPurify), or refactor `aHtml` to a structured `{ text, href }` format so the rendering code generates anchor tags with all values passed through `_escapeHtml()`.

---

## PAGES/FAVORITES-PAGE — `stateManager.addToStack(id)` Passes Only ID, Creating Malformed Stack Item
- **Priority:** P1
- **File:** src/pages/favorites-page.js:321
- **Issue:** The "Adicionar ao Stack" button calls `stateManager.addToStack(id)` passing only the ID string. The `ADD_TO_STACK` reducer expects `{ supplementId, name, dosage, unit }`. The resulting stack item will have `name: undefined`, `dosage: undefined`, and `unit: undefined` — silently malformed and unusable in the check-in or history views.
- **Fix:** Look up the full supplement from `SUPPLEMENTS_DB` and pass the complete payload: `{ supplementId: s.id, name: s.name, dosage: s.dosage?.maintenance, unit: s.dosage?.unit }` — as done in `list-page.js:1001`.

## PAGES/FAVORITES-PAGE — `getStack()` Has Direct `localStorage` Fallback Creating Dual Source of Truth
- **Priority:** P2
- **File:** src/pages/favorites-page.js:20-27
- **Issue:** `getStack()` tries `stateManager.getState()` then falls back to `localStorage` directly. The `inStack` check on line 146 also has a format mismatch: it checks `item.id` but StateManager stack items use `item.supplementId`. The fallback can silently return stale or differently-shaped data.
- **Fix:** Remove the localStorage fallback. If `stateManager.getState()` is unreliable, that is a StateManager bug to fix — the page should not have a parallel persistence path.

## PAGES/FAVORITES-PAGE — Hover Handlers Registered Via JS Instead of CSS hover
- **Priority:** P3
- **File:** src/pages/favorites-page.js:336-363
- **Issue:** `mouseenter`/`mouseleave` listeners are attached for purely presentational hover effects (border color, background). These could be pure CSS rules.
- **Fix:** Replace with CSS `:hover` rules to eliminate the event handlers entirely.

---

## PAGES/HISTORY-PAGE — Full Re-render on Every Search Keystroke Without Debounce
- **Priority:** P2
- **File:** src/pages/history-page.js:438-443
- **Issue:** The search `input` event fires `_render()` synchronously on every keystroke, rebuilding the entire container DOM including stats, calendar, and all supplement cards. No debounce is applied.
- **Fix:** Add a 200ms debounce to the search handler, or filter card visibility in-place without re-rendering.

## PAGES/HISTORY-PAGE — `stateManager.subscribe()` Re-renders on Every Unrelated State Change
- **Priority:** P2
- **File:** src/pages/history-page.js:55-57
- **Issue:** The page subscribes to all state changes and calls the full `_render()` on each one, including unrelated changes such as stack updates or profile edits. For users with months of check-in history this is expensive.
- **Fix:** Gate the re-render by comparing `state.checkins` identity before rendering, or subscribe to the specific `checkin:added` EventBus event.

---

## PAGES/HOME-PAGE — `_injectStyle()` Does Not Guard Against Duplicate Injection
- **Priority:** P3
- **File:** src/pages/home-page.js:227
- **Issue:** `_injectStyle()` unconditionally creates and appends a new `<style>` element on every page mount. Unlike all other pages which check for an existing element by ID, this page uses a `data-page` attribute but does not query for it before inserting — duplicating a 225-line stylesheet on every navigation to home.
- **Fix:** Add `if (document.querySelector('[data-page="home"]')) return;` at the top of `_injectStyle()`.

## PAGES/HOME-PAGE — `unmount()` Removes Style Element Inconsistently With All Other Pages
- **Priority:** P2
- **File:** src/pages/home-page.js:22-30
- **Issue:** `unmount()` removes `this._styleEl`, causing a FOUC on every return visit since the style is then re-injected. All other pages leave their injected styles in `<head>` for the session lifetime.
- **Fix:** Remove the style teardown from `unmount()` and add the duplicate-guard in `_injectStyle()` instead.

---

## PAGES/LEGAL-PAGE — Production UI Shows an Editorial "Draft Needs Lawyer Review" Warning Banner
- **Priority:** P2
- **File:** src/pages/legal-page.js:269-272
- **Issue:** The rendered page displays the text "Modelo para revisão jurídica — Este texto é um rascunho bem fundamentado e deve ser revisado por um advogado antes de entrar em produção." This editorial note is currently visible to all users.
- **Fix:** Remove or comment-out this banner before the app is used publicly.

## PAGES/LEGAL-PAGE — `unmount()` Removes Style Element Causing FOUC on Re-navigation
- **Priority:** P3
- **File:** src/pages/legal-page.js:247-250
- **Issue:** `unmount()` removes the injected stylesheet. On every return visit, styles are removed and re-injected, causing a brief flash of unstyled content. All other pages leave their styles in place.
- **Fix:** Remove the style teardown from `unmount()`. The `_injectStyles()` guard already prevents duplicate injection on re-mount.

---

## PAGES/LIST-PAGE — `item.name`, `item.category`, `item.benefits` Inserted Into `innerHTML` Without Escaping
- **Priority:** P1
- **File:** src/pages/list-page.js:685-700, 819
- **Issue:** In `_buildFragment()` and `_openModal()`, supplement field values (`item.name`, `item.category`, `item.benefits[0]`, `item.benefits.join(...)`) are interpolated directly into innerHTML template strings. The pattern is unsafe by construction, even though `SUPPLEMENTS_DB` is currently a static build-time file.
- **Fix:** Apply `escapeHtml()` (or equivalent) to all dynamic string values before inserting into HTML templates.

## PAGES/LIST-PAGE — `clearTimeout(this._debounceTimer)` Missing From `unmount()`
- **Priority:** P2
- **File:** src/pages/list-page.js:158-163
- **Issue:** `unmount()` cancels the IntersectionObserver and removes the keydown listener but does not cancel the debounce timer. If the user navigates away mid-debounce, the search callback fires against a detached container.
- **Fix:** Add `clearTimeout(this._debounceTimer)` to `unmount()`.

## PAGES/LIST-PAGE — `document.body.style.overflow = 'hidden'` Not Unconditionally Reset in `unmount()`
- **Priority:** P2
- **File:** src/pages/list-page.js:861, 901-908
- **Issue:** If `unmount()` is called while a modal is open or opening, `document.body.style.overflow` may be left as `'hidden'`, permanently locking body scroll after page navigation.
- **Fix:** In `unmount()`, add `document.body.style.overflow = ''` unconditionally after calling `_closeModal()`.

---

## PAGES/MY-STACK-PAGE — `document.addEventListener('click', ...)` in `_openModal()` Never Removed
- **Priority:** P1
- **File:** src/pages/my-stack-page.js:945-948
- **Issue:** An anonymous click listener is added to `document` inside `_openModal()` to close the search results dropdown. It is never removed — not in `_closeModal()`, not in `unmount()`. Each modal open adds another permanent listener to `document`. After page unmount these listeners continue firing indefinitely.
- **Fix:** Store the listener as `this._docClickHandler = e => { ... }`, then call `document.removeEventListener('click', this._docClickHandler)` in `_closeModal()`.

## PAGES/MY-STACK-PAGE — `PRICES_DB` Module-Level Singleton Never Invalidated
- **Priority:** P3
- **File:** src/pages/my-stack-page.js:10-20
- **Issue:** Once fetched, `PRICES_DB` is cached for the entire session with no TTL. Server-side price updates are not reflected until a hard reload.
- **Fix:** Document the TTL expectation in a comment. If freshness matters, add a maxAge check and refetch when the cached value is older than a configurable threshold.

---

## PAGES/PROFILE-PAGE — `unmount()` Is Empty With No Teardown
- **Priority:** P2
- **File:** src/pages/profile-page.js:61
- **Issue:** `unmount()` is defined as an empty method. Listeners are currently attached to container child nodes (implicitly removed when the router replaces `innerHTML`), but there is no explicit teardown. Any future listener added to `window`, `document`, or `this.container` would silently leak.
- **Fix:** Add `this.container.innerHTML = ''` and a comment documenting that no external subscriptions currently exist.

## PAGES/PROFILE-PAGE — Avatar Initial Updated Via Fragile `querySelector('div[style*="72px"]')`
- **Priority:** P2
- **File:** src/pages/profile-page.js:266
- **Issue:** `this.container.querySelector('div[style*="72px"]').textContent = val[0].toUpperCase()` uses a CSS attribute substring match. Any reformatting of the inline style string (e.g., adding a space) silently fails the selector with no crash — the avatar just shows a stale initial. No null guard precedes `.textContent` assignment.
- **Fix:** Add `id="avatar-initial"` to the avatar div in the render template and use `querySelector('#avatar-initial')` with a null guard.

## PAGES/PROFILE-PAGE — `ACTIONS.CLEAR_CHECKINS || 'CLEAR_CHECKINS'` Fallback Hides Missing Constant
- **Priority:** P2
- **File:** src/pages/profile-page.js:376
- **Issue:** The `||` fallback to a string literal suggests `ACTIONS.CLEAR_CHECKINS` may not be exported from `state-manager.js`. If the constant is missing, the dispatch fires with `undefined` as the action type, silently no-oping the clear.
- **Fix:** Confirm `ACTIONS.CLEAR_CHECKINS` is exported from `state-manager.js`. If not, add it. Remove the `|| 'CLEAR_CHECKINS'` fallback.

---

## PAGES/SETTINGS-PAGE — `stateManager.dispatch({ type: 'CLEAR_CHECKINS' })` Passes Object Instead of String Action Type
- **Priority:** P1
- **File:** src/pages/settings-page.js:412
- **Issue:** `stateManager.dispatch({ type: 'CLEAR_CHECKINS' })` passes a plain object as the first argument. If `StateManager.dispatch()` expects `dispatch(actionType: string, payload)`, the reducer switch never matches the object, silently failing to clear check-ins. The catch-block localStorage fallback then triggers and calls `location.reload()`.
- **Fix:** Change to `stateManager.dispatch('CLEAR_CHECKINS', {})`. Add the `ACTIONS` import and use `ACTIONS.CLEAR_CHECKINS`.

## PAGES/SETTINGS-PAGE — Notification Toggles Are Decorative: No Notification API Is Wired
- **Priority:** P2
- **File:** src/pages/settings-page.js:364-376
- **Issue:** The "Lembrete diário de check-in" and "Alertas de reposição" toggles persist to `localStorage` but do not call `Notification.requestPermission()`, register a SW push handler, or schedule any local notification. The UI implies functionality that does not exist.
- **Fix:** Either implement notification scheduling (Notifications API + SW), or replace the toggles with a "coming soon" label.

---

## CLEANLINESS — Single-Letter Variable `f` in profile-page
- **Priority:** P3
- **File:** src/pages/profile-page.js:73
- **Issue:** `const f = this._form;` uses a single-letter alias for the form object. At call sites like `f.weight`, `f.height`, `f.name`, the intent is clear only to someone who has read the line above.
- **Fix:** Rename to `const form = this._form;` and update all references.

## CLEANLINESS — Single-Letter Variable `u` in profile-page
- **Priority:** P3
- **File:** src/pages/profile-page.js:49
- **Issue:** `const u = stateManager.user || {};` aliases the user object as `u`, used only 5 lines later.
- **Fix:** Rename to `const user = stateManager.user || {};`.

## CLEANLINESS — Single-Letter Variable `d` in history-page helpers
- **Priority:** P3
- **File:** src/pages/history-page.js:11-13
- **Issue:** `const d = new Date()` in two helper functions (`todayISO` and `offsetISO`). The single-letter name conflicts with the common iteration variable idiom and reduces readability.
- **Fix:** Rename to `const now = new Date()` or `const date = new Date()`.

## CLEANLINESS — Abbreviated Variable Name `fmtBRL`
- **Priority:** P3
- **File:** src/pages/my-stack-page.js:34
- **Issue:** `fmtBRL` abbreviates both the verb ("format") and currency. The full-word convention is used elsewhere in the codebase (`formatPrice` in list-page.js).
- **Fix:** Rename `fmtBRL` to `formatBRL` or `formatCurrency`.

## CLEANLINESS — Timer Variable `debounce` Should Be `debounceTimer`
- **Priority:** P3
- **File:** src/pages/my-stack-page.js:901
- **Issue:** `let debounce` is used as a setTimeout ID but named as if it were a verb or boolean. Obscures that it holds a numeric timer reference.
- **Fix:** Rename to `let debounceTimer`.

## CLEANLINESS — SRP Violation: `_render()` in history-page is 223 Lines With Six Responsibilities
- **Priority:** P2
- **File:** src/pages/history-page.js:209-432 (~223 lines)
- **Issue:** `_render()` performs six distinct operations in sequence: reads state, computes adherence stats, builds the 7-day calendar data, groups check-ins by supplement, builds all HTML string fragments, then sets innerHTML and attaches listeners. A change to the stats formula requires reading through calendar and grouping logic.
- **Fix:** Extract `_computeStats(checkins, stack)`, `_buildCalendarData(checkins)`, `_groupBySupplements(checkins, supMap)` as pure data-transformation helpers; `_renderStats(stats)`, `_renderCalendar(calData)`, `_renderList(entries)` as HTML-producing methods. `_render()` becomes an orchestrator of ~20 lines.

## CLEANLINESS — SRP Violation: `_openModal()` in my-stack-page is 138 Lines
- **Priority:** P2
- **File:** src/pages/my-stack-page.js:839-977 (~138 lines)
- **Issue:** `_openModal()` handles DOM construction, inline event registration for search debounce, result-list rendering, item selection, form submission, and document-level click-outside detection all in one method.
- **Fix:** Extract `_renderModalSearchResults(query)` and `_handleModalSubmit()` as separate methods. Move the document click handler to a named method cleaned up in `_closeModal()`.

## CLEANLINESS — SRP Violation: `_attachStyles()` Inlines 340-Line CSS in list-page
- **Priority:** P2
- **File:** src/pages/list-page.js:167-507 (~340 lines)
- **Issue:** A 340-line CSS string literal is inlined in `_attachStyles()`. Logic changes and style changes live in the same file, making diffs noisy.
- **Fix:** Move all page styles to `src/css/list-page.css`, import at the top, and remove `_attachStyles()`.

## CLEANLINESS — Dead Code: `console.log` Debug Statement in event-bus
- **Priority:** P2
- **File:** src/core/event-bus.js:274
- **Issue:** `console.log('[EventBus] emoji eventName', payload)` is guarded by `this.#debug` (default `false`) but the code path and string are present in production bundles. When debug mode is accidentally enabled it leaks event payloads to the console.
- **Fix:** Annotate with a `/* debug-only */` comment and verify the build pipeline handles it. Consider using a compile-time `DEBUG` constant instead of a runtime flag.

## CLEANLINESS — Dead Code: `_modalSelectedName` Assigned But Never Read
- **Priority:** P3
- **File:** src/pages/my-stack-page.js:889, 935, 982-983
- **Issue:** `this._modalSelectedName` is assigned and cleared but never read anywhere. The modal submit handler uses the search input value directly.
- **Fix:** Remove all references to `this._modalSelectedName`.

## CLEANLINESS — Dead Code: `_hydrateFromStorage()` Method Never Called
- **Priority:** P3
- **File:** src/state/state-manager.js:624-626
- **Issue:** `_hydrateFromStorage()` is a one-line wrapper around `_initializeState()` documented as a "legacy call wrapper." No code in the codebase calls it.
- **Fix:** Remove `_hydrateFromStorage()`.

## CLEANLINESS — Dead Code: `dump()` Alias for `export()`
- **Priority:** P3
- **File:** src/state/state-manager.js:767-769
- **Issue:** `dump()` returns `this.export()` and appears nowhere in any test or page file. It is an undocumented alias that adds to the class public surface area.
- **Fix:** Remove `dump()`.

## CLEANLINESS — DRY Violation: `todayISO()` Duplicated Across 5 Locations
- **Priority:** P2
- **File:** src/pages/history-page.js:6-9, src/pages/checkin-page.js:21, src/pages/my-stack-page.js:57, src/state/state-manager.js:727, src/state/state-manager.js:760
- **Issue:** The pattern `new Date().toISOString().split('T')[0]` to get today's ISO date appears in at least 5 locations across 4 files. Each is an independent re-implementation.
- **Fix:** Extract `export function todayISO() { return new Date().toISOString().split('T')[0]; }` to `src/utils/date.js` and import everywhere. `history-page.js` already has a local version that should become the canonical source.

## CLEANLINESS — DRY Violation: Evidence Badge Helper Duplicated in 4 Files
- **Priority:** P2
- **File:** src/pages/my-stack-page.js:23-31, src/pages/favorites-page.js:30-38, src/pages/list-page.js:56-63, src/pages/calculator-page.js:25-30
- **Issue:** The evidence level color map and/or HTML badge template are independently defined in 4 page files. Any update to evidence-level colors must be applied in all 4 places.
- **Fix:** Extract `export const EVIDENCE_COLORS` and `export function renderEvidenceBadge(level)` to `src/utils/evidence.js` and import from all four pages.

## CLEANLINESS — DRY Violation: `getFavoritesFromState()` Inconsistently Duplicated
- **Priority:** P2
- **File:** src/pages/list-page.js:85-94, src/pages/favorites-page.js:11-18
- **Issue:** Two pages implement favorites-reading logic with different fallback strategies: `list-page.js` uses stateManager then falls back to localStorage; `favorites-page.js` reads only from localStorage. A bug fix to one does not fix the other.
- **Fix:** Extract a single `getFavorites()` helper to `src/utils/favorites.js` encapsulating the stateManager-to-localStorage fallback and import from both pages.

## CLEANLINESS — DRY Violation: `supplementId ?? item.id` Normalization Pattern Repeated 11+ Times
- **Priority:** P2
- **File:** src/state/state-manager.js (x4), src/pages/my-stack-page.js (x6), src/pages/history-page.js (x1)
- **Issue:** The expression `item.supplementId ?? item.id` appears in 11+ locations as a compatibility shim for dual-format stack items. It has never been consolidated.
- **Fix:** Add `export function getSupplementId(item) { return item.supplementId ?? item.id; }` to `src/utils/stack.js` and replace all usages.

## CLEANLINESS — Magic Literal: Timeout `300` Used in Two Unrelated Contexts
- **Priority:** P3
- **File:** src/core/app.js:73, src/core/app.js:86
- **Issue:** The value `300` appears twice — once as the loading-screen fade-out delay and once as the toast fade-out transition delay. Semantically different durations that happen to share the same value.
- **Fix:** Extract `const FADE_DURATION_MS = 300;` and reference it in both timeouts, or give each a named constant.

## CLEANLINESS — Magic Literal: localStorage Key Strings Repeated Without Constants
- **Priority:** P2
- **File:** src/core/app.js:58,65; src/pages/favorites-page.js:11,17,25; src/pages/list-page.js:89; src/pages/settings-page.js:248,357; src/pages/profile-page.js:325
- **Issue:** `'suplilist:favorites'`, `'suplilist:theme'`, `'suplilist:stack'`, and legacy `'theme'` are hard-coded string literals scattered across 5+ files. A rename or typo creates a silent mismatch.
- **Fix:** Export `export const STORAGE_KEYS = { FAVORITES: 'suplilist:favorites', THEME: 'suplilist:theme', STACK: 'suplilist:stack' }` from `src/state/state-manager.js` alongside the existing `STORAGE_KEY` constant, and import in all consumers.

## CLEANLINESS — Magic Literal: Debounce Delays Inconsistent (80ms / 180ms / 250ms)
- **Priority:** P3
- **File:** src/pages/list-page.js:928 (250ms), src/pages/my-stack-page.js:905 (180ms), src/pages/calculator-page.js:305 (80ms)
- **Issue:** Input debounce delays are 80ms, 180ms, and 250ms across different pages with no documented rationale for the variation. Users experience different input responsiveness on different pages.
- **Fix:** Define `const INPUT_DEBOUNCE_MS = 250;` in `src/utils/constants.js` and use it consistently, or document intentional variations with inline comments.

## CLEANLINESS — Style Inconsistency: Mixed localStorage Theme Key (`theme` vs `suplilist:theme`)
- **Priority:** P3
- **File:** src/core/app.js:58; src/pages/profile-page.js:325
- **Issue:** `app.js` writes theme under `'suplilist:theme'` but `profile-page.js` writes under bare `'theme'`. Both keys co-exist in storage. The startup fallback `||` hides the inconsistency rather than resolving it.
- **Fix:** Standardize on `'suplilist:theme'` everywhere. In `app.js` startup, copy `'theme'` to `'suplilist:theme'` and delete the old key as a one-time migration.

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

---

## Task 12: Infrastructure Audit

## INFRA — No .nojekyll Inside docs/ Folder
- **Priority:** P1
- **File:** `docs/` folder
- **Issue:** `.nojekyll` exists at the repo root but NOT inside `docs/`. GitHub Pages serves from `docs/`, so the `.nojekyll` must be inside `docs/` to suppress Jekyll processing of underscore-prefixed paths.
- **Fix:** Add a `.nojekyll` file (empty) inside `docs/` — either by adding it to `public/` so Vite copies it on build, or by adding `touch docs/.nojekyll` to the deploy workflow after the build step.

---

## INFRA — No JS Lint Step in CI
- **Priority:** P2
- **File:** `.github/workflows/deploy.yml`
- **Issue:** The only lint step is `npm run lint:css` (Stylelint). There is no ESLint step. The `package.json` has no `lint:js` script and ESLint is not a devDependency. JS code quality is entirely unchecked in CI.
- **Fix:** Add ESLint as a devDependency, add a `"lint:js": "eslint src/"` script to `package.json`, and add a `Lint JS` step to the workflow.

---

## INFRA — Single Monolithic CI Job (Lint + Test + Build + Deploy)
- **Priority:** P2
- **File:** `.github/workflows/deploy.yml`
- **Issue:** The entire pipeline runs in a single `build-and-deploy` job. A test failure wastes a full build; a lint failure blocks deploy feedback. There is no separation of concerns between CI checks and the deploy action.
- **Fix:** Split into at least two jobs: `ci` (lint + test) and `deploy` (build + commit docs, depends on `ci`).

---

## INFRA — PWA manifest.json start_url Points to /app.html (Will 404 on GitHub Pages subpath)
- **Priority:** P2
- **File:** `public/manifest.json:6`
- **Issue:** `"start_url": "/app.html"` but the built output is `docs/index.html`. All PWA shortcuts also reference `/app.html#/...`. If GitHub Pages serves the app at a subpath (e.g., `/<repo>/`), the absolute `/app.html` path will 404.
- **Fix:** Change `start_url` to `"."` or `"./index.html"` and update shortcut `url` values to `"./#/stack"` etc. to be deployment-path agnostic.

---

## INFRA — Service Worker Cache Version Hardcoded (v4.0.0)
- **Priority:** P2
- **File:** `docs/service-worker.js` (built artifact)
- **Issue:** Cache keys are hardcoded as `suplilist-static-v4.0.0`, `suplilist-dynamic-v4.0.0`, `suplilist-supplements-v4.0.0`. The version string is not derived from the build. If static assets change but the version is not bumped manually, stale dynamic/supplements caches will be served.
- **Fix:** Derive the cache version from `package.json` version at build time via a Vite define (`import.meta.env.VITE_APP_VERSION`), or rely entirely on Workbox's content-hash precache invalidation and remove the manual version constant.

---

## INFRA — Service Worker Precache Contains Duplicate Icon Entries
- **Priority:** P3
- **File:** `docs/service-worker.js` (built artifact)
- **Issue:** The precache manifest includes `icon-192.png`, `icon-512.png`, `icon-dosage.png`, `icon-history.png`, `icon-maskable-192.png`, and `manifest.json` twice each (34 entries total, ~6 duplicates), inflating install payload.
- **Fix:** Audit `vite.config.js` `injectManifest` / `globPatterns` to deduplicate.

---

## INFRA — @playwright/test Installed But Unused (Dead Dependency)
- **Priority:** P3
- **File:** `package.json`
- **Issue:** `@playwright/test` is a devDependency but no Playwright config, no `e2e/` directory, and no CI step runs it. The dependency adds ~100MB to CI installs for no current benefit.
- **Fix:** Remove until E2E tests are written, or add a placeholder `e2e/smoke.spec.js` and a `test:e2e` script.

---

## INFRA — No Coverage Report Generated in CI
- **Priority:** P3
- **File:** `.github/workflows/deploy.yml`
- **Issue:** `@vitest/coverage-v8` is installed but `npm test` runs `vitest run` without `--coverage`. No coverage data is collected or published.
- **Fix:** Add `"test:coverage": "vitest run --coverage"` to `package.json` scripts and add a CI step.

---

## INFRA — Build Output Summary (Informational)
- **Priority:** info
- **File:** build output
- **Issue:** Build completes cleanly with zero warnings. 23 modules transformed. Total precached: 34 entries / 4680.97 KiB. Largest JS chunk: `list-page` at 31.27 kB (7.71 kB gzip). CSS bundle: 44.64 kB (8.54 kB gzip). Service worker: 3.53 kB (1.47 kB gzip).
- **Fix:** No action required. Monitor `list-page` chunk growth — consider lazy-loading supplements DB parsing if it exceeds 50 kB gzip.

---

# CSS Audit — Task 11

## CSS — Linter: No Configuration Errors

The CSS linter (`stylelint`) ran with zero errors and zero warnings against both `src/css/design-system.css` and `src/css/main.css`. No P2 linter findings to report.

---

## CSS — main.css Uses Undefined Token Namespace (`--space-*`, `--bg-*`, `--text-*`, `--brand-*`)

- **Priority:** P1
- **File:** `src/css/main.css` (lines 7, 179, 187, 207, 209 — pervasive throughout)
- **Issue:** `main.css` references ~30 CSS custom properties from a completely different token namespace than what `design-system.css` defines. Properties used include `--space-md`, `--space-xl`, `--bg-dark`, `--bg-darker`, `--bg-darkest`, `--bg-card`, `--bg-elevated`, `--bg-surface`, `--border-color`, `--border-light`, `--border-hover`, `--text-primary`, `--text-secondary`, `--text-muted`, `--brand-primary`, `--brand-green`, `--brand-light`, `--brand-glow`, `--brand-glow-strong`, `--brand`, `--brand-hover`, `--t1`, `--t2`, `--t3`, `--shadow-glow`, `--shadow-xl`, `--shadow-card-hover`, `--font-family`, `--text-h2`, `--text-h3`, `--text-small`. None of these are defined in `design-system.css`, which uses the `--color-*`, `--spacing-*`, `--font-*`, `--shadow-*`, `--transition-*`, `--z-*`, `--radius-*` namespace. These variables silently resolve to the browser initial value (often zero or empty), breaking the entire layout and color intent of app pages (history, calculator, favorites, landing page).
- **Fix:** Migrate all `--space-*` to `--spacing-*`, `--bg-dark` to `--color-surface-primary`, etc. in `main.css` to match `design-system.css` tokens. Alternatively, add legacy token aliases to `design-system.css` pointing to canonical values. Option (a) is preferred to keep a single source of truth.

---

## CSS — `main.css` Redefines `:root` Variables, Overriding `design-system.css`

- **Priority:** P1
- **File:** `src/css/main.css:1375-1408`
- **Issue:** `main.css` contains a second `:root` block (the landing page section) that redefines `--font-body` (overriding the value set in `design-system.css`) and introduces additional tokens. Because `main.css` is imported after `design-system.css` via `@import`, this `:root` block takes effect in cascade order and changes the body font globally. Additionally, `body.landing-body` sets `--text-primary`, `--brand-primary`, etc. using `!important`, which cannot be overridden by the design system for any element inside `.landing-body`.
- **Fix:** Move landing-page-specific variables into a scoped block only for the landing page, or into a separate `landing.css` file. Remove the `:root` block from `main.css` entirely; keep only `body.landing-body`-scoped overrides.

---

## CSS — `modal-overlay` z-index Conflict (9999 vs Token `--z-modal: 200`)

- **Priority:** P2
- **File:** `src/css/main.css:165-170`
- **Issue:** The block `.modal-overlay, .toast, .floating-panel { position: fixed; z-index: 9999; }` hardcodes `z-index: 9999`, overriding the design system token `--z-modal: 200` set in `design-system.css:77`. The token-based `.modal-overlay` definition in `design-system.css` uses `z-index: var(--z-modal)`. The hardcoded rule in `main.css` wins due to cascade order, bypassing the token scale entirely.
- **Fix:** Remove the duplicate `.modal-overlay` rule from `main.css`. If `z-index: 9999` is intentional, update `--z-modal` in `design-system.css` to the desired value and remove the hardcoded override.

---

## CSS — Hardcoded Hex/RGBA Colors Bypassing Token System in `main.css`

- **Priority:** P2
- **File:** `src/css/main.css` (multiple lines)
- **Issue:** Numerous rules use hardcoded color values instead of design-system tokens, making theme changes brittle. Key instances: `.hist-tab-btn.active` uses `color: #fff` (line 343); `.badge-category` uses `rgba(167, 139, 250, 0.12)` — a different brand purple (`167, 139, 250`) than the design system's `124, 58, 237` (lines 424-427); `.interactions-title` uses `color: #ef4444` (line 848); `.fav-marketplace-badge` variants use fully hardcoded brand colors (lines 1224-1231); landing section uses hardcoded backgrounds `#11111a`, `#11111e`, `#06060c`, `#0c0c16` (lines 1621, 1727, 1863).
- **Fix:** Map these to design system tokens or landing-specific tokens. The brand purple inconsistency (`167, 139, 250` vs `124, 58, 237`) is particularly problematic and must be unified.

---

## CSS — Duplicate `.btn-primary` and `.btn-outline` Selectors Across Files

- **Priority:** P2
- **File:** `src/css/main.css:2201-2251` vs `src/css/design-system.css:422-469`
- **Issue:** `main.css` defines `.btn-primary` and `.btn-outline` as standalone classes (landing page button system), while `design-system.css` defines `.btn--primary` and `.btn--outline` (BEM modifier pattern). The non-BEM classes in `main.css` duplicate all button styling without inheriting from `.btn`, creating two separate, diverging button implementations that must be kept in sync manually.
- **Fix:** Consolidate into a single button system. Use the `.btn` base class with a landing-specific modifier such as `.btn--landing-primary` rather than a new top-level class.

---

## CSS — `design-system.css`: Hardcoded Values in Component Styles

- **Priority:** P3
- **File:** `src/css/design-system.css`
- **Issue:** Several component definitions use hardcoded values where tokens exist: `color: #FFFFFF` in `.btn--primary` (line 425) should use a `--color-text-on-brand` token; `.badge` uses raw `gap: 4px`, `padding: 2px 7px`, `border-radius: 5px` instead of `--spacing-xs` and `--radius-sm` (lines 482, 488); `.badge--a/b/c` use hardcoded RGBA/hex instead of semantic tokens (lines 494-506); `pulseBrand` keyframes hardcode `rgba(124, 58, 237, ...)` instead of `--color-brand` (line 229).
- **Fix:** Extract `--color-text-on-brand: #FFFFFF` token. Replace remaining hardcoded values with tokens.

---

## CSS — Missing Type Scale Tokens in `design-system.css`

- **Priority:** P3
- **File:** `src/css/design-system.css`
- **Issue:** The design system defines a type scale as utility classes only (`.text-sm`, `.text-base`, etc.) but not as CSS custom properties (`--font-size-sm`, `--font-size-base`, etc.). As a result, `main.css` cannot reference font sizes via tokens and hardcodes pixel values throughout (10px, 11px, 12px, 13px, 14px, etc.).
- **Fix:** Add `--font-size-xs: 10px`, `--font-size-sm: 12px`, `--font-size-base: 14px`, `--font-size-md: 16px`, `--font-size-lg: 18px` etc. to the `:root` token block in `design-system.css`.

---

## CSS — Vendor Prefixes: `-webkit-user-select` Unnecessary for Modern Targets

- **Priority:** P3
- **File:** `src/css/design-system.css:409`, `src/css/design-system.css:550`
- **Issue:** `-webkit-user-select: none` is paired with `user-select: none` in `.btn` and `.chip`. Since Chrome 54+ and Safari 15.4+ support the unprefixed property, the `-webkit-` prefix is no longer needed for a modern PWA.
- **Fix:** Remove `-webkit-user-select: none` lines. The `user-select: none` unprefixed property is sufficient.

---

## CSS — `outline: none` on Focus Without Focus-Visible Replacement

- **Priority:** P3
- **File:** `src/css/main.css:60`
- **Issue:** The block `input, select, button { outline: none; }` removes the browser default focus indicator globally for all interactive elements without providing a `:focus-visible` alternative. This is a keyboard accessibility regression.
- **Fix:** Replace with `:focus-visible { outline: 2px solid var(--color-brand); outline-offset: 2px; }`, or remove the `outline: none` rule and rely on the custom `border-color` focus styles already defined per-component.
