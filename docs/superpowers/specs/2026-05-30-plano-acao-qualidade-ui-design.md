# Action Plan — Technical Quality + UI Redesign

**Date:** 2026-05-30
**Horizon:** 2–4 weeks
**Approach:** Full audit → feature freeze → systematic remediation

---

## Context

SupliList v2.0 — vanilla JS SPA, Vite build, PWA. Architecture: custom EventBus, Router, StateManager. 11 pages implemented under `src/pages/`. AI modules: `dosage-calculator.js`, `stack-recommender.js`. Supplement data: `database.js` (constant `IT`).

Current state: codebase has grown without adequate test coverage; UI does not meet quality bar. Goal: stabilize technical and visual foundations. Post-plan direction TBD after both phases complete.

---

## Phase 1 — Audit (3–5 days)

### Static Analysis — `src/`

**`src/core/`**
- `app.js` — initialization order, side effects, module boundaries
- `event-bus.js` — event naming conventions, listener leak risk, unsubscribe patterns
- `router.js` — route matching logic, history API usage, error handling on unknown routes

**`src/state/`**
- `state-manager.js` — direct mutation vs immutable updates, state shape consistency, persistence strategy (localStorage coupling)

**`src/pages/`**
- Each page module: separation of concerns (DOM logic vs business logic), error boundaries, event listener cleanup on page unmount

**`src/ai/`**
- `dosage-calculator.js` — input validation, edge cases (null, NaN, out-of-range), output contracts
- `stack-recommender.js` — algorithm correctness, dependency on state shape, fallback behavior

**`database.js`**
- Shape of constant `IT` — consistency of supplement objects, missing required fields, data integrity

**Test coverage baseline**
- Vitest: which modules have unit tests, which have zero coverage
- Playwright: which critical flows have E2E tests, which are untested

### Code Cleanliness — `src/`
- **Naming** — ambiguous identifiers (single-letter vars, abbreviated names, mismatched semantics)
- **SRP violations** — functions exceeding ~20 lines doing multiple unrelated things
- **Dead code** — unreachable branches, commented-out code, unused imports, variables written but never read
- **DRY violations** — repeated logic that should be extracted to shared utilities
- **Style inconsistencies** — mixed quote styles, inconsistent semicolons, indentation deviations (cross-reference ESLint config)
- **Magic literals** — hardcoded numbers/strings that should be named constants (e.g., timeout values, DOM selectors, localStorage keys)

### UX Audit — Pages
- Visual consistency across all 11 pages (spacing scale, color tokens, component reuse)
- Responsive breakpoints: 375px / 768px / 1280px — layout integrity, touch target sizing (min 44x44px)
- Typography hierarchy — correct use of `design-system.css` tokens vs inline overrides
- Navigation flows — dead ends, back-navigation issues, missing active states
- Empty states — pages with no data: is there a visual treatment or blank render?
- Loading states — async operations: spinner/skeleton or UI freeze?
- Error states — failed operations: silent failure or user-facing feedback?

### Infra
- **Vite build** — `npm run build` output: warnings, chunk sizes, tree-shaking gaps
- **GitHub Actions** — CI pipeline: which jobs pass/fail, missing jobs (type check, E2E, coverage report)
- **PWA** — service worker registration flow, cache strategy correctness, `manifest.json` completeness, install prompt behavior
- **Deploy** — GitHub Pages pipeline: build artifact correctness, cache headers

### Phase 1 Output
Prioritized issue list:
- **P1** — Breaks core functionality or primary UX flow; must fix before ship
- **P2** — Degrades quality but does not block core usage; fix in Phase 2
- **P3** — Improvement; out of scope for this plan, logged for future

---

## Phase 2 — Feature Freeze + Remediation (10–15 days)

**Constraint:** No new features merged until all exit criteria pass.

### Days 1–3 — P1 Resolution
- Runtime bugs causing incorrect behavior or crashes
- Unsafe patterns: direct DOM manipulation bypassing state, unhandled promise rejections, XSS vectors
- Mobile-broken pages: layout overflow, unresponsive touch targets, scroll issues
- Silent failures in `state-manager.js` or `router.js` (swallowed errors, undefined state reads)

### Days 2–8 — UI Redesign (overlaps P1)
- Audit and consolidate `design-system.css` — define token set: color palette, type scale, spacing scale, border-radius, shadow levels
- Refactor pages flagged in audit: apply design tokens, remove inline style overrides
- Implement consistent empty/loading/error state components across all pages
- Mobile-first pass: fix all breakpoint failures identified in audit (375px baseline)
- Bottom navigation consistency: active state, icon sizing, tap area

### Days 4–10 — Tests + Code Cleanliness
**Tests:**
- Vitest unit tests: `core/event-bus.js`, `core/router.js`, `state/state-manager.js`, `ai/dosage-calculator.js`, `ai/stack-recommender.js`
- Playwright E2E: supplement browse → add to stack → check-in → history view flow
- Target: 0 core/state/ai modules without unit test coverage

**Code Cleanliness (applied to audited areas):**
- Rename ambiguous identifiers to semantically accurate names
- Extract multi-responsibility functions into single-purpose units
- Delete all dead code; remove unused imports
- Extract duplicated logic into shared utility functions under `src/utils/`
- Replace magic literals with named constants in a dedicated `src/constants.js`

P3 issues are out of scope — logged for post-plan triage.

### Days 8–12 — Infra
- Resolve all Vite build warnings; verify bundle size is reasonable
- CI pipeline: all jobs green (lint, unit tests, E2E, build)
- PWA: verify service worker caches correct assets, unregister stale workers in dev
- Confirm deploy pipeline produces correct artifact on merge to `main`

---

## Exit Criteria

- [ ] All P1 issues resolved and verified
- [ ] Code cleanliness pass complete: no dead code, no SRP violations, no magic literals in audited modules
- [ ] P2 issues resolved or explicitly deferred with documented rationale
- [ ] UI passes visual QA at 375px / 768px / 1280px; `design-system.css` tokens applied to 100% of pages; all empty/loading/error states implemented
- [ ] Unit tests passing for all modules in `core/`, `state/`, `ai/`
- [ ] E2E critical flow passing in CI
- [ ] CI pipeline fully green on `main`

---

## Next Step

After both phases complete: assess app state and determine next direction. No feature work before exit criteria are met.
