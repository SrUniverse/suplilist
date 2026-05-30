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
- **File:** src/core/event-bus.js:165-235
- **Issue:** `on()` and `once()` are near-identical — element extraction, validation, and listener object construction are copy-pasted. Any future change to listener shape must be applied in two places, risking divergence.
- **Fix:** Extract a shared private `#createListener(eventName, callback, options, once)` helper and call it from both `on()` and `once()`.

## EVENT-BUS — Listener Leak Risk Without DOM Element Reference
- **Priority:** P2
- **File:** src/core/event-bus.js:165
- **Issue:** Auto-pruning via `WeakRef` only activates when callers pass an `HTMLElement` as the third argument. Page modules that subscribe in `connectedCallback` / `init` without passing `this` (the element) and do not call the returned unsubscribe function on teardown will silently accumulate listeners. The prune mechanism does not help non-element subscribers (plain objects, service classes, etc.).
- **Fix:** Audit every `eventBus.on()` call site in `src/pages/` and `src/core/` to verify: (a) element ref is passed, OR (b) the returned unsubscribe function is stored and called on destruction. Add a lint rule or JSDoc @param note to make the contract explicit.

## EVENT-BUS — `error:system` Re-Emit Can Recurse Deeply
- **Priority:** P2
- **File:** src/core/event-bus.js:295-302
- **Issue:** When a listener throws, the bus re-emits `error:system`. If an `error:system` listener itself throws, the guard `if (eventName !== 'error:system')` stops the outer recursion, but the error is silently swallowed with only a `console.error`. If the system error handler is also faulty, failures go unnoticed.
- **Fix:** Wrap the `error:system` re-emit call itself in a try/catch and log failures to console as a last resort. Optionally expose an `onError` hook so the host app can instrument unhandled bus errors.

## EVENT-BUS — `AFFILIATE_CLICK` Uses Underscore Instead of Colon Namespace
- **Priority:** P3
- **File:** src/core/event-bus.js:126
- **Issue:** `AFFILIATE_CLICK: 'affiliate_click'` breaks the `namespace:action` convention used by every other event. This inconsistency makes wildcard pattern matching and log filtering harder.
- **Fix:** Rename the string value to `'affiliate:click'` (confirm no external integrations depend on the literal string value first).

## EVENT-BUS — Test Suite Cannot Execute (Broken vitest Install)
- **Priority:** P1
- **File:** node_modules/vitest/dist/ (missing cli.js)
- **Issue:** Running `npm run test` fails with `ERR_MODULE_NOT_FOUND: vitest/dist/cli.js`. The vitest `dist/` directory contains only `chunks/` and `workers/` subdirectories — the entry point is absent. No tests in the project can be validated until this is resolved.
- **Fix:** Delete `node_modules` and run `npm ci` (or `npm install`) to restore a complete vitest installation. Verify with `npx vitest --version` before re-running the suite.

## EVENT-BUS — Missing Test Cases for Edge Behaviors
- **Priority:** P2
- **File:** src/core/event-bus.test.js
- **Issue:** The existing 11 test cases cover happy paths well, but the following scenarios are untested: (a) `off()` called with a non-existent / never-registered callback (should be a no-op, currently untested); (b) `once()` returned unsubscribe function calling `off()` before the event fires; (c) listener that calls `eventBus.off()` on itself during its own callback (self-unsubscribing mid-emit); (d) `emit()` with no registered listeners at all for that event (no throw expected).
- **Fix:** Add test cases for the four scenarios above to harden regression coverage.
