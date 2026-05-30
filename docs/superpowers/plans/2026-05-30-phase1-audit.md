# Phase 1 — Full Codebase Audit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Systematically audit all of `src/`, CSS, infra, and UX — then produce a single prioritized issue list (P1/P2/P3) that drives Phase 2 remediation.

**Architecture:** Read-only pass over the codebase. Each task audits one area and appends findings to `docs/superpowers/audits/2026-05-30-audit-findings.md`. No code changes in this phase.

**Tech Stack:** Vite + vanilla JS, Vitest (unit), Playwright (E2E), StyleLint (CSS), GitHub Actions (CI)

---

## Output File

All findings go to: `docs/superpowers/audits/2026-05-30-audit-findings.md`

Each finding must follow this format:
```
## [AREA] — [SHORT TITLE]
- **Priority:** P1 | P2 | P3
- **File:** exact/path/to/file.js[:line]
- **Issue:** What is wrong and why it matters
- **Fix:** What needs to change (no code required, just direction)
```

---

## Task 1: Create Audit Output File

**Files:**
- Create: `docs/superpowers/audits/2026-05-30-audit-findings.md`

- [ ] **Step 1: Create the findings file with header**

```markdown
# Audit Findings — 2026-05-30

## Summary
<!-- Filled in at the end -->

## Findings
<!-- Appended per task -->
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "chore: create audit findings file"
```

---

## Task 2: Audit `src/core/event-bus.js`

**Files:**
- Read: `src/core/event-bus.js`
- Read: `src/core/event-bus.test.js`

- [ ] **Step 1: Read the file and check for these specific patterns**

Look for:
- Does `on()` / `off()` / `emit()` exist with consistent signatures?
- Is there any risk of listener leaks? (listeners added but never removed — especially in page modules)
- Are event names string literals scattered across files or defined as constants?
- Does the test file cover: `on`, `off`, `emit`, multiple listeners, removing a non-existent listener?
- Any unhandled errors thrown inside listener callbacks — do they propagate or get swallowed?

- [ ] **Step 2: Run existing tests**

```bash
npm run test -- --reporter=verbose src/core/event-bus.test.js
```

Expected: shows which cases pass and which are missing.

- [ ] **Step 3: Append findings to audit file**

For each issue found, append to `docs/superpowers/audits/2026-05-30-audit-findings.md` using the format above.

- [ ] **Step 4: Commit findings**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: event-bus findings"
```

---

## Task 3: Audit `src/core/router.js`

**Files:**
- Read: `src/core/router.js`

- [ ] **Step 1: Read the file and check for these patterns**

Look for:
- Route matching: is it exact match or prefix? What happens on unknown route — 404 handler or silent no-op?
- History API usage: does it use `pushState` / `popstate`? Is back-navigation handled?
- Does the router clean up the previous page (remove event listeners, clear DOM) before mounting the next?
- Are routes registered as string literals or constants?
- Is there any async handling for page load? What happens if a page module throws on init?

- [ ] **Step 2: Append findings**

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: router findings"
```

---

## Task 4: Audit `src/core/app.js`

**Files:**
- Read: `src/core/app.js`

- [ ] **Step 1: Read and check**

Look for:
- Initialization order — does it depend on DOM ready? Is there a `DOMContentLoaded` guard or does it run immediately?
- Side effects at module load time (anything that runs outside a function)
- Does it wire up EventBus, Router, StateManager in the right order?
- Is there any global state attached to `window`? (`window.app`, `window.state`, etc.)
- Dead code — exported functions never called, commented-out blocks

- [ ] **Step 2: Append findings**

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: app.js findings"
```

---

## Task 5: Audit `src/state/state-manager.js`

**Files:**
- Read: `src/state/state-manager.js`
- Read: `src/state/state-manager.test.js`

- [ ] **Step 1: Read and check**

Look for:
- Direct mutation: does any method mutate nested objects in-place (`state.list.push(...)`) rather than replacing the slice?
- Persistence: is `localStorage` read/write happening inside the state manager? Is it guarded against `QuotaExceededError` or JSON parse failures on corrupt data?
- State shape: is the initial state shape documented or inferrable? Are there optional fields that may be `undefined` in some states?
- Subscribers: how are state change notifications sent — EventBus, callbacks, or direct calls? Can a subscriber throw and break other subscribers?
- Test coverage: does the test file cover initial state, updates, persistence round-trip, and corrupt localStorage recovery?

- [ ] **Step 2: Run existing tests**

```bash
npm run test -- --reporter=verbose src/state/state-manager.test.js
```

- [ ] **Step 3: Append findings**

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: state-manager findings"
```

---

## Task 6: Audit `src/ai/dosage-calculator.js` and `src/ai/stack-recommender.js`

**Files:**
- Read: `src/ai/dosage-calculator.js`
- Read: `src/ai/dosage-calculator.test.js`
- Read: `src/ai/stack-recommender.js`
- Read: `src/ai/stack-recommender.test.js`

- [ ] **Step 1: Read both files and check**

Look for:
- Input validation: what happens if called with `null`, `undefined`, `0`, negative numbers, or an empty array?
- Output contracts: is the return type consistent (always an object, always a number, etc.) regardless of input?
- Dependency on state shape: does `stack-recommender.js` read directly from `StateManager` or does it receive data as arguments? (Direct coupling to state is a code smell)
- Magic numbers: hardcoded dosage limits, thresholds, weights — should be named constants
- Test coverage: do tests cover valid input, edge cases (empty, null, max values), and invalid input?

- [ ] **Step 2: Run existing tests**

```bash
npm run test -- --reporter=verbose src/ai/
```

- [ ] **Step 3: Append findings**

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: ai modules findings"
```

---

## Task 7: Audit `database.js`

**Files:**
- Read: `database.js`

- [ ] **Step 1: Read and check**

Look for:
- Shape consistency: does every supplement object in constant `IT` have the same fields? Check for missing required fields (`name`, `dose`, `unit`, `category`, etc.)
- Any supplement entries with `null`, `undefined`, or empty string in required fields
- Naming: are field names camelCase and consistent across all entries?
- Size: how many entries? Is the file loading performance a concern (large bundle)?
- Magic strings: are category/unit values consistent string literals or do they vary (`"mg"` vs `"MG"` vs `"milligrams"`)?

- [ ] **Step 2: Quick consistency check command**

Run in the browser console or Node:
```bash
node -e "const {IT} = require('./database.js'); const keys = Object.keys(IT[0]); IT.forEach((s,i) => { keys.forEach(k => { if(s[k]===undefined) console.log('missing',k,'at index',i) }) })"
```
(Adjust if `database.js` uses ES module syntax — open in browser console instead)

- [ ] **Step 3: Append findings**

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: database.js findings"
```

---

## Task 8: Audit `src/pages/` — All 11 Pages

**Files:**
- Read each: `src/pages/calculator-page.js`, `checkin-page.js`, `faq-page.js`, `favorites-page.js`, `history-page.js`, `home-page.js`, `legal-page.js`, `list-page.js`, `my-stack-page.js`, `profile-page.js`, `settings-page.js`

- [ ] **Step 1: For each page, check the following pattern**

Apply this checklist to every page module:

| Check | What to look for |
|---|---|
| Lifecycle | Does it have `init()` / `destroy()` or equivalent? Does `destroy()` remove all event listeners? |
| DOM manipulation | Is it generating HTML via template literals or manipulating DOM directly? Is it safe from XSS (user data inserted via `innerHTML` without sanitization)? |
| State access | Does it read state through `StateManager` or by direct import of mutable objects? |
| Error handling | What happens if `StateManager.get()` returns `undefined`? Does the page crash or handle gracefully? |
| Empty state | Is there a visual treatment when the page has no data (empty list, no history, etc.)? |
| Loading state | If the page has async operations, is there a loading indicator? |
| SRP | Is the file doing only one thing? Or is it mixing routing, DOM rendering, business logic, and state updates? |

- [ ] **Step 2: Append one finding block per issue found**

Group findings by page, e.g.:
```
## PAGES/LIST-PAGE — No empty state treatment
- **Priority:** P2
- **File:** src/pages/list-page.js
- **Issue:** When supplement list is empty, page renders blank with no feedback to user
- **Fix:** Add empty state UI component with message and CTA
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: pages findings"
```

---

## Task 9: Code Cleanliness Audit — All of `src/`

**Files:**
- Read: all files under `src/` (already read in previous tasks, cross-reference)

- [ ] **Step 1: Check naming across all files**

Flag any of these patterns:
- Single-letter variables outside loop counters (`let x`, `let d`, `let tmp`)
- Abbreviated names where intent is unclear (`calcDos`, `recStack`, `mgr`)
- Function names that don't start with a verb (`supplementData()` instead of `getSupplementData()`)
- Boolean variables not prefixed with `is`/`has`/`can`/`should` (`let loading` instead of `let isLoading`)

- [ ] **Step 2: Check for SRP violations**

Flag any function longer than ~25 lines that does more than one conceptual thing. Document: file, function name, approximate line count, what the multiple responsibilities are.

- [ ] **Step 3: Check for dead code**

- Commented-out code blocks (3+ lines commented out)
- `console.log` / `console.warn` statements left in production code
- Imports that are declared but never used in the file
- Variables assigned but never read

- [ ] **Step 4: Check for DRY violations**

Look for logic that appears in 2+ page files that could be extracted to `src/utils/`:
- Repeated DOM manipulation helpers
- Repeated date formatting
- Repeated supplement lookup patterns

- [ ] **Step 5: Check for style inconsistencies**

First, check if ESLint is configured:
```bash
ls .eslintrc* eslint.config* 2>/dev/null || echo "no eslint config found"
```

If ESLint config exists, run it:
```bash
npx eslint src/ --max-warnings=0 2>&1 | head -50
```

If no ESLint config, manually scan for: mixed quote styles (`"` vs `'`), inconsistent semicolons (files that mix `;` and no `;`), inconsistent indentation (2 spaces vs 4 spaces vs tabs).

Document style inconsistencies as P2 findings.

- [ ] **Step 6: Check for magic literals**

Flag hardcoded values that should be named constants:
- Timeout/delay values (`setTimeout(..., 3000)`)
- `localStorage` key strings (`'suplilist-state'`)
- DOM selector strings used in multiple places
- Numeric thresholds in AI modules

- [ ] **Step 7: Append findings**

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: code cleanliness findings"
```

---

## Task 10: UX Audit — Visual + Responsive

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:5173` in browser.

- [ ] **Step 2: Visual consistency check — all 11 pages**

Navigate to each page and check:
- Heading sizes consistent across pages (same `h1`/`h2` treatment everywhere)?
- Button styles consistent (same class, same padding, same border-radius)?
- Color usage consistent with `design-system.css` tokens or are there inline overrides?
- Spacing consistent (gaps, padding, margins follow a scale or are arbitrary)?

Document each inconsistency as P2 or P3.

- [ ] **Step 3: Responsive check — 375px (mobile)**

Open DevTools → set viewport to 375px wide. Navigate all 11 pages:
- Does any element overflow horizontally?
- Are touch targets smaller than 44x44px? (buttons, nav items, list items)
- Is text readable without zooming?
- Does the bottom navigation overlap content?

Document each broken layout as P1 (unusable) or P2 (degraded).

- [ ] **Step 4: Responsive check — 768px and 1280px**

Repeat the check at 768px and 1280px. Document overflows, broken grids, or awkward whitespace.

- [ ] **Step 5: Navigation flow check**

For each page, test:
- **Dead ends:** Is there always a way back? Pages with no back button, no nav link, and no `popstate` support are P1
- **Back button behavior:** Press browser back on each page — does the correct previous page render, or does the app show blank/wrong content?
- **Active nav state:** Navigate to each page and verify the bottom/side navigation highlights the current page correctly
- **Unknown route:** Navigate to `/nonexistent` — does a 404 page render or does the app silently break?

Document broken flows as P1, missing active states as P2.

- [ ] **Step 6: Empty/loading/error states**

For each page: open DevTools → Application → LocalStorage → clear all entries → reload. Document whether there's a visual empty state or a blank/crashed render.

- [ ] **Step 7: Append findings**

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: UX and responsive findings"
```

---

## Task 11: Audit `src/css/design-system.css` and `src/css/main.css`

**Files:**
- Read: `src/css/design-system.css`
- Read: `src/css/main.css`

- [ ] **Step 1: Run CSS linter**

```bash
npm run lint:css
```

Document all reported errors and warnings as P2 findings.

- [ ] **Step 2: Check design-system.css**

Look for:
- Are color values defined as CSS custom properties (`--color-primary`) or hardcoded (`#0071e3`)?
- Is there a complete token set: colors, type scale, spacing scale, border-radius, shadows?
- Are there tokens defined but unused in `main.css` or page styles?
- Are there values in page CSS files that bypass the token system (hardcoded hex, hardcoded `px` font sizes)?

- [ ] **Step 3: Check main.css**

Look for:
- Styles that override design-system tokens with hardcoded values
- Duplicate selectors
- Vendor prefixes that are no longer needed
- Dead rules (selectors that match no current HTML)

- [ ] **Step 4: Append findings**

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: CSS findings"
```

---

## Task 12: Infra Audit

- [ ] **Step 1: Run the build and capture output**

```bash
npm run build 2>&1
```

Document every warning line as a finding. Note total bundle size from the output.

- [ ] **Step 2: Check GitHub Actions**

Read `.github/workflows/` — list all workflow files, which jobs they run, and which are currently failing or missing.

Expected jobs that should exist:
- Lint (CSS)
- Unit tests (Vitest)
- Build

Missing but not required yet (note as P3):
- E2E tests (Playwright)
- Coverage report

- [ ] **Step 3: Check PWA**

Read `public/manifest.json` (or wherever manifest lives):
- All required fields present: `name`, `short_name`, `icons` (192px + 512px), `start_url`, `display`, `theme_color`, `background_color`?

Read `src/service-worker.js` (or built output):
- What assets does it cache? Does the cache list match the actual build output?
- Is there a cache version/key that gets bumped on new builds?

- [ ] **Step 4: Check deploy artifact**

The project deploys from the `docs/` folder. Verify:
```bash
ls docs/
```
- Does `docs/` contain `index.html` and all built assets?
- Is `docs/index.html` the Vite-built output (has hashed asset links) or the source file?
- Check `docs/.nojekyll` exists (required for GitHub Pages to serve files in `_` directories)

Also check the deploy workflow:
```bash
cat .github/workflows/*.yml | grep -A5 "pages\|deploy\|docs"
```

Document any missing artifact files or incorrect deploy config as P2.

- [ ] **Step 5: Append findings**

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: infra findings"
```

---

## Task 13: Test Coverage Baseline

**Files:**
- Read: `src/core/event-bus.test.js`
- Read: `src/state/state-manager.test.js`
- Read: `src/ai/dosage-calculator.test.js`
- Read: `src/ai/stack-recommender.test.js`

- [ ] **Step 1: Run all tests with coverage**

```bash
npm run test -- --coverage
```

Document the coverage report output — which files have 0% coverage, which have partial, which are at 100%.

- [ ] **Step 2: For each existing test file, check test quality**

Look for:
- Tests that only assert `toBeTruthy()` or `toBeDefined()` without checking actual values (weak assertions)
- Tests that test implementation details instead of behavior (testing internal method calls vs output)
- Missing edge case tests: null input, empty array, max/min values
- Tests that share mutable state between test cases (no cleanup/reset between tests)

- [ ] **Step 3: Append findings**

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: test coverage baseline findings"
```

---

## Task 14: Compile Final Issue List + Summary

**Files:**
- Modify: `docs/superpowers/audits/2026-05-30-audit-findings.md`

- [ ] **Step 1: Count all findings by priority**

Go through all appended findings and count:
- Total P1s
- Total P2s
- Total P3s

- [ ] **Step 2: Write the Summary section at the top of the file**

```markdown
## Summary

**Audit date:** 2026-05-30
**Total findings:** X (P1: N, P2: N, P3: N)

### P1 — Must Fix
- [list the P1 titles with file references]

### P2 — Should Fix
- [list the P2 titles]

### P3 — Out of Scope
- [list the P3 titles]

### Areas with zero issues
- [list any areas that came back clean]
```

- [ ] **Step 3: Final commit**

```bash
git add docs/superpowers/audits/2026-05-30-audit-findings.md
git commit -m "audit: compile final findings summary"
```

- [ ] **Step 4: Report completion**

The audit is complete. The findings document at `docs/superpowers/audits/2026-05-30-audit-findings.md` is the input for Phase 2 planning. Review it, then write the Phase 2 remediation plan based on actual P1/P2 findings.
