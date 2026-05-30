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
