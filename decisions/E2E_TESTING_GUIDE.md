# E2E Testing Guide

## Overview

This project uses Playwright for end-to-end testing, with a focus on mobile UX validation.

## Running Tests

### Local Testing

```bash
# Install dependencies
npm install

# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Debug mode (step through)
npm run test:e2e:debug

# Run only mobile tests
npm run test:mobile

# Run only accessibility tests
npm run test:a11y
```

### CI/CD Pipeline

Tests automatically run on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

The pipeline runs:
1. **E2E Tests** - Across all browsers and devices
2. **Performance Check** - Lighthouse audit
3. **Accessibility Check** - A11y tests
4. **Report Summary** - Consolidated results

## Test Structure

```
e2e/
├── mobile-ux.spec.ts          # Mobile UX tests
├── fixtures/                   # Reusable test utilities
└── screenshots/                # Visual regression baseline
```

## Test Coverage

### Mobile UX Tests (`mobile-ux.spec.ts`)

#### Responsiveness
- ✅ iPhone SE (375x667)
- ✅ iPhone 12 (390x844)
- ✅ iPhone 14 Pro (393x852)
- ✅ Galaxy A12 (360x800)
- ✅ iPad (768x1024)
- ✅ Landscape orientation

#### Touch Feedback
- ✅ Active state on button press
- ✅ No 300ms tap delay
- ✅ Touch targets ≥ 44x44px
- ✅ Visual feedback on interaction

#### Keyboard Handling
- ✅ Input auto-scroll above keyboard
- ✅ iOS input zoom prevention
- ✅ Keyboard visibility detection
- ✅ Focus management

#### Form Validation
- ✅ Validation error display
- ✅ Focus on first invalid input
- ✅ Error message accessibility

#### Accessibility
- ✅ Keyboard navigation (Tab)
- ✅ Visible focus indicators
- ✅ Color contrast verification
- ✅ ARIA attributes

#### Performance
- ✅ First Contentful Paint (FCP < 1800ms)
- ✅ Smooth scrolling (no jank)
- ✅ Animation performance

#### Dark Mode
- ✅ Correct color rendering
- ✅ Respect `prefers-color-scheme`
- ✅ Readability in dark mode

#### Offline Support
- ✅ Offline status indication
- ✅ Cache functionality
- ✅ Data persistence

## Writing New Tests

### Basic Test Structure

```typescript
test('Should handle viewport correctly', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:3000');

  // Your test logic here
  const element = page.locator('button');
  await expect(element).toBeVisible();
});
```

### Mobile Device Testing

```typescript
test('Should work on iPhone 12', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000');
  // Test logic
});
```

### Testing Touch Interactions

```typescript
test('Should handle touch tap', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:3000');

  const button = page.locator('button');
  await button.tap(); // Use tap() instead of click()

  // Verify result
});
```

### Testing Keyboard Behavior

```typescript
test('Should be keyboard navigable', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Tab through elements
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);

  expect(focused).toBeDefined();
});
```

## Performance Budgets

Lighthouse CI enforces performance budgets:

```json
{
  "performance": 90,      // Min score
  "accessibility": 95,    // Min score
  "best-practices": 90,   // Min score
  "seo": 90,             // Min score
  "LCP": 2500,           // Max milliseconds
  "CLS": 0.1,            // Max score
  "FID": 100             // Max milliseconds
}
```

Tests fail if metrics exceed budgets.

## Debugging Failed Tests

### Using UI Mode

```bash
npm run test:e2e:ui
```

Interactive interface allows:
- Step through test execution
- Inspect elements
- Take screenshots
- Replay interactions

### Debug Mode

```bash
npm run test:e2e:debug
```

Launches inspector for detailed debugging.

### Viewing Traces

Traces are captured on first retry:

```bash
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Failed tests generate artifacts in `test-results/`:
- Screenshots at failure point
- Video recordings of entire test
- Browser console logs

Access artifacts from CI:
1. Go to GitHub Actions workflow
2. Download artifact from failed run
3. Review screenshots/videos locally

## Best Practices

### Do's
- ✅ Use data attributes for stable selectors (e.g., `data-testid`)
- ✅ Wait for elements explicitly (`waitFor` methods)
- ✅ Test user workflows, not implementation details
- ✅ Use descriptive test names
- ✅ Group related tests with `test.describe()`

### Don'ts
- ❌ Rely on CSS class names that might change
- ❌ Use hardcoded timeouts (use `waitFor` instead)
- ❌ Test internal state (test observable behavior)
- ❌ Share state between tests (each test is independent)
- ❌ Ignore flaky tests (fix the root cause)

## Continuous Integration

Tests run automatically on:
- **Push**: All browsers, all devices
- **PR**: All browsers, all devices
- **Merge**: Performance checks, accessibility checks

### Artifact Retention
- Test reports: 30 days
- Screenshots: 7 days
- Lighthouse results: 30 days

## Lighthouse Performance Audit

Run locally:

```bash
npm run perf:report
```

Or via CI:

Tests run against multiple pages:
- `/` (Home)
- `/list` (List page)
- `/dosage` (Calculator)
- `/favorites` (Favorites)

Results uploaded to temporary public storage.

## Accessibility Testing

Automated checks for:
- WCAG 2.1 Level AA compliance
- Color contrast (4.5:1 minimum)
- Keyboard navigation
- Focus management
- ARIA labels and roles

Run only accessibility tests:

```bash
npm run test:a11y
```

## Mobile Testing

Test specific mobile scenarios:

```bash
npm run test:mobile
```

Tests coverage:
- Portrait and landscape
- Virtual keyboard handling
- Touch feedback
- Mobile-specific optimizations

## Troubleshooting

### Tests fail locally but pass in CI

**Causes:**
- Different Node version
- Missing dependencies
- Environment variables

**Solutions:**
```bash
npm ci              # Clean install
npm run test:e2e    # Run again
```

### Timeout errors

**Solution:** Increase timeout in playwright.config.ts:

```typescript
use: {
  navigationTimeout: 30000, // 30 seconds
  actionTimeout: 10000,     // 10 seconds
}
```

### Flaky tests

**Causes:**
- Race conditions
- Timing-dependent logic
- Network delays

**Solutions:**
- Use explicit waits: `page.waitForSelector()`
- Avoid hardcoded timeouts
- Test deterministic behavior

## Resources

- [Playwright Docs](https://playwright.dev)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://web.dev/vitals/)
