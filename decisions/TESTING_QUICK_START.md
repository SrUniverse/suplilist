# Testing Quick Start Guide

Get started with testing and performance monitoring in 5 minutes.

## 1. Install Dependencies

```bash
npm install
npm install -D @playwright/test
```

## 2. Start Your Dev Server

```bash
npm run dev
# Server runs at http://localhost:3000
```

Keep this running in a separate terminal.

## 3. Run Tests

### Option A: All Tests
```bash
npm run test:e2e
```

Runs all E2E tests across all browsers and devices.

### Option B: Interactive UI (Recommended for first time)
```bash
npm run test:e2e:ui
```

Opens a visual interface where you can:
- See tests run in real-time
- Replay individual tests
- Inspect elements
- Take screenshots

### Option C: Mobile Tests Only
```bash
npm run test:mobile
```

Tests on iPhone SE, iPhone 12, iPhone 14 Pro, Galaxy A12, iPad.

### Option D: Accessibility Tests
```bash
npm run test:a11y
```

Validates WCAG 2.1 AA compliance.

## 4. Run Performance Audit

### Local Performance Check
```bash
npm run perf:report
```

Builds your project and runs Lighthouse audit on:
- Home page (`/`)
- List page (`/list`)
- Calculator page (`/dosage`)
- Favorites page (`/favorites`)

**Expected output**: Performance scores for each page.

### Performance Budgets
Must meet these minimums:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

## 5. Debug Failed Tests

### Using UI Mode
```bash
npm run test:e2e:ui
```

Click on a failed test to see:
- What failed
- Where in the flow
- Exact error message

### Step-Through Debugging
```bash
npm run test:e2e:debug
```

Launches Playwright Inspector where you can:
- Step through test line by line
- Inspect DOM at any point
- Execute JavaScript in console
- Watch network requests

### Viewing Test Artifacts
When tests fail, Playwright saves:
- **Screenshots**: Last frame before failure
- **Videos**: Full test recording
- **Traces**: Timeline of all events
- **Console logs**: Browser console output

Find them in `test-results/` folder.

## 6. Run All Pre-Deployment Checks

```bash
# Quick version (unit tests + unit tests)
npm run lint:css && npm run lint:js && npm test

# Full version (everything)
npm run lint:css && npm run lint:js && npm run build && npm test && npm run test:e2e && npm run perf:report
```

## Device Coverage

### Phones
| Device | Resolution | Notes |
|--------|-----------|-------|
| iPhone SE | 375×667 | Smallest iOS |
| iPhone 12 | 390×844 | Standard iOS |
| iPhone 14 Pro | 393×852 | Modern iOS |
| Galaxy A12 | 360×800 | Android budget |

### Tablets
| Device | Resolution | Notes |
|--------|-----------|-------|
| iPad | 768×1024 | Standard tablet |

### Orientations
- Portrait (default)
- Landscape (rotated)

## What Gets Tested

### Responsiveness
✅ Page layout on all device sizes
✅ Text readability without zoom
✅ Touch targets ≥ 44×44px
✅ No horizontal scrolling

### Interactions
✅ Button clicks and taps
✅ Form input and validation
✅ Touch feedback (visual response)
✅ Keyboard navigation (Tab key)
✅ Virtual keyboard handling

### Performance
✅ First Contentful Paint < 1800ms
✅ Largest Contentful Paint < 2500ms
✅ Cumulative Layout Shift < 0.1
✅ No jank during scrolling

### Accessibility
✅ Keyboard navigation works
✅ Focus indicators visible
✅ Color contrast sufficient (4.5:1)
✅ Form labels accessible
✅ ARIA roles present

### Offline Support
✅ App works without network
✅ Service worker caches pages
✅ Data persists locally

### Dark Mode
✅ Colors render correctly
✅ Text readable in dark
✅ Respects system preference

## Common Issues & Solutions

### "Tests are timing out"
**Solution**: Increase timeout in `playwright.config.ts`
```typescript
navigationTimeout: 30000,  // 30 seconds
actionTimeout: 10000,      // 10 seconds
```

### "Tests are flaky (sometimes pass, sometimes fail)"
**Solution**: Ensure tests wait for elements explicitly
```typescript
// ❌ Bad: hardcoded wait
await page.waitForTimeout(1000);

// ✅ Good: wait for element
await page.waitForSelector('[data-testid="button"]');
```

### "Performance score is low"
**Steps**:
1. Run `npm run perf:report`
2. Check Lighthouse report for bottlenecks
3. Common fixes:
   - Optimize images (use WebP)
   - Lazy load images
   - Code split large bundles
   - Remove unused CSS/JS

### "Test passes locally but fails in CI"
**Debugging**:
1. Check CI logs for error message
2. Download test artifacts from CI
3. Review screenshots/videos
4. Try: `npm ci` (clean install)
5. Rerun: `npm run test:e2e`

## Test Files Location

```
project/
├── e2e/
│   ├── mobile-ux.spec.ts      # All test scenarios
│   ├── playwright.config.ts    # Test configuration
│   └── fixtures/               # Reusable test helpers
├── .github/
│   └── workflows/
│       └── e2e-tests.yml       # CI/CD pipeline
├── lighthouserc.json           # Performance budgets
└── src/
    └── core/
        └── performance-monitor.js  # Real-time metrics
```

## GitHub Actions CI

When you push, CI automatically:
1. Runs E2E tests (all browsers)
2. Runs performance audit
3. Checks accessibility
4. Generates reports

**Expected time**: ~40 minutes

**Results**: Check GitHub Actions tab in PR

## Next Steps

1. **First time?** Run `npm run test:e2e:ui` to see tests in action
2. **Want to understand?** Read `E2E_TESTING_GUIDE.md`
3. **Need to debug?** Use `npm run test:e2e:debug`
4. **Ready to deploy?** Check `PRE_DEPLOYMENT_CHECKLIST.md`

## Useful Links

- [E2E Testing Guide](./E2E_TESTING_GUIDE.md) — Detailed reference
- [Performance Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md) — How to optimize
- [Mobile UX Checklist](./MOBILE_UX_TEST_CHECKLIST.md) — Manual testing scenarios
- [Pre-Deployment Checklist](./PRE_DEPLOYMENT_CHECKLIST.md) — Before shipping

## Need Help?

### Check test documentation
```bash
cat E2E_TESTING_GUIDE.md
```

### View Playwright docs
```
https://playwright.dev
```

### View Lighthouse docs
```
https://developers.google.com/web/tools/lighthouse
```

## Test Examples

### Test a button click
```typescript
test('should handle button click', async ({ page }) => {
  await page.goto('http://localhost:3000');
  const button = page.locator('button[data-testid="primary"]');
  await button.click();
  // Add assertions here
});
```

### Test on iPhone 12
```typescript
test('should work on iPhone 12', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Test logic
});
```

### Test keyboard navigation
```typescript
test('should be keyboard navigable', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.keyboard.press('Tab');
  // Verify focus moved
});
```

### Test touch interaction
```typescript
test('should respond to touch', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const button = page.locator('button');
  await button.tap(); // Use tap() instead of click()
});
```

---

**Ready?** Start with:
```bash
npm run test:e2e:ui
```

Enjoy testing! 🧪
