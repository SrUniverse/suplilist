# SupliList — Audit Findings (2026-05-30)

---

## INFRA — No JS Lint Step in CI
- **Priority:** P2
- **File:** `.github/workflows/deploy.yml`
- **Issue:** The only lint step is `npm run lint:css` (Stylelint). There is no `lint:js` or `eslint` step. The `package.json` has no `lint:js` script and ESLint is not listed as a devDependency. JS code quality is entirely unchecked in CI.
- **Fix:** Add ESLint as a devDependency, add a `lint:js` script to `package.json`, and add a `Lint JS` step to the workflow before the build step.

---

## INFRA — No Dedicated Lint Job / Test Job (Single Monolithic Job)
- **Priority:** P2
- **File:** `.github/workflows/deploy.yml`
- **Issue:** The entire pipeline (lint, test, build, deploy) runs in a single `build-and-deploy` job. This means a test failure wastes a full build, and a lint failure blocks deploy feedback. There is no separate job matrix for lint vs test vs build.
- **Fix:** Split into at least two jobs: `ci` (lint + test) and `deploy` (build + commit docs). This is not required today but will matter as the project grows.

---

## INFRA — No .nojekyll in docs/ (Only at Root)
- **Priority:** P1
- **File:** `docs/` folder
- **Issue:** `.nojekyll` exists at the repo root (`C:\Users\suber\OneDrive\Desktop\suplilist\.nojekyll`) but NOT inside `docs/`. GitHub Pages serves from the `docs/` folder, so the `.nojekyll` must be inside `docs/` to suppress Jekyll processing. Without it, files or directories with underscores (e.g. `_`) may be ignored by Jekyll.
- **Fix:** Add a `.nojekyll` file (empty) inside `docs/`. This can be done by adding it to `public/` so Vite copies it on build, or by adding a step in the workflow: `touch docs/.nojekyll`.

---

## INFRA — Build Fails Locally Without vite Installed (vite not in package.json devDependencies)
- **Priority:** P1
- **File:** `package.json`
- **Issue:** `vite` was not present in `node_modules` after `npm install`, causing `npm run build` to fail with `Cannot find module '.../vite/bin/vite.js'`. The `package.json` devDependencies section did not originally include `vite`; it had to be installed manually. CI uses `npm ci` which is strict, so if `package-lock.json` is missing or mismatched, builds will silently break.
- **Fix:** Ensure `vite` is pinned in `devDependencies` in `package.json` and that `package-lock.json` is committed and up to date. (After manual install during this audit, vite is now present.)

---

## INFRA — PWA manifest.json start_url points to /app.html
- **Priority:** P2
- **File:** `public/manifest.json:6`
- **Issue:** `"start_url": "/app.html"` — but the built output root is `docs/index.html`. If GitHub Pages serves at `/<repo-name>/`, the start_url `/app.html` is an absolute path that will 404. Shortcuts also reference `/app.html#/stack`, etc. The actual served file is `index.html`.
- **Fix:** Change `start_url` to `"."` or `"./index.html"` (relative) to be deployment-path agnostic, and update all shortcut `url` fields accordingly.

---

## INFRA — Service Worker Precaches Duplicate Icons
- **Priority:** P3
- **File:** `docs/service-worker.js` (built artifact)
- **Issue:** The precache manifest includes `icon-192.png`, `icon-512.png`, `icon-dosage.png`, `icon-history.png`, `icon-maskable-192.png`, and `manifest.json` twice each. This inflates the install payload slightly (totals 34 entries vs ~29 unique assets) and may confuse cache invalidation logic.
- **Fix:** Audit the `vite.config.js` `injectManifest` / `globPatterns` config to deduplicate icon entries. This is low impact but clean.

---

## INFRA — Service Worker Cache Version is Static (v4.0.0)
- **Priority:** P2
- **File:** `docs/service-worker.js` (built artifact — source in `src/sw.js` or vite PWA config)
- **Issue:** Cache keys are hardcoded as `suplilist-static-v4.0.0`, `suplilist-dynamic-v4.0.0`, `suplilist-supplements-v4.0.0`. The version string `v4.0.0` is not derived from the build or `package.json` version. If static assets change but the cache key does not, stale content may be served to returning users. The Workbox precache handles hashed JS/CSS files correctly, but the cache bucket name for dynamic/supplements caches never rotates.
- **Fix:** Derive the cache version from `package.json` `version` field at build time, or rely entirely on Workbox's content-hash-based precache invalidation and remove the manual version string.

---

## INFRA — No E2E Tests (P3 — Not Required Yet)
- **Priority:** P3
- **File:** `package.json` / `.github/workflows/deploy.yml`
- **Issue:** `@playwright/test` is installed as a devDependency but there is no Playwright config, no `e2e/` directory, and no CI step that runs Playwright. The dependency is dead weight for now.
- **Fix:** Either wire up a basic Playwright smoke test or remove the dependency until E2E tests are written.

---

## INFRA — No Coverage Report in CI (P3 — Not Required Yet)
- **Priority:** P3
- **File:** `.github/workflows/deploy.yml`
- **Issue:** `@vitest/coverage-v8` is installed but `npm test` runs `vitest run` without `--coverage`. No coverage report is generated or uploaded in CI.
- **Fix:** Add `npm run test:coverage` step (needs `"test:coverage": "vitest run --coverage"` in `package.json`) and optionally upload to a service like Codecov.

---

## INFRA — Build Output Summary (Informational)
- **Priority:** info
- **File:** build output
- **Issue:** Build completes cleanly with zero warnings. Total precached: 34 entries / 4680.97 KiB. Largest JS chunk: `list-page` at 31.27 kB (7.71 kB gzip). CSS bundle: 44.64 kB (8.54 kB gzip). Service worker: 3.53 kB (1.47 kB gzip). No Rollup chunk-size warnings triggered.
- **Fix:** No action required. Monitor `list-page` chunk if it grows — consider lazy-loading the supplements DB parsing.
