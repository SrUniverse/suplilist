# Testing Setup Guide

**Objective**: Complete testing infrastructure for Phase 1+

---

## 1️⃣ Unit Testing (Vitest)

### Setup
```bash
npm install -D vitest @vitest/ui jsdom
```

### Configuration
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/**/*.test.js']
    }
  }
});
```

### Running Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
npm run test:ui            # UI dashboard
```

### Example Test
```javascript
// src/core/router.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import Router from './router';

describe('Router', () => {
  let router;

  beforeEach(() => {
    router = new Router();
  });

  it('should navigate to route', () => {
    router.navigate('/list');
    expect(router.getCurrentRoute()).toBe('/list');
  });

  it('should handle invalid routes', () => {
    router.navigate('/invalid');
    expect(router.getCurrentRoute()).toBe('/home');
  });
});
```

---

## 2️⃣ E2E Testing (Playwright)

### Setup
```bash
npm install -D @playwright/test
npx playwright install
```

### Configuration
```javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Example E2E Test
```javascript
// e2e/add-supplement.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Add Supplement Flow @critical', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should add supplement to stack', async ({ page }) => {
    // Navigate to list
    await page.click('a[href="/list"]');
    await expect(page).toHaveTitle(/Supplements/);

    // Search for supplement
    await page.fill('[placeholder="Search"]', 'protein');
    await page.waitForLoadState('networkidle');

    // Click add
    await page.click('button:has-text("Add to Stack")');

    // Verify added
    await page.click('a[href="/my-stack"]');
    await expect(page.locator('text=Whey Protein')).toBeVisible();
  });
});
```

### Running E2E Tests
```bash
npm run test:e2e              # All E2E tests
npm run test:e2e:headed      # With UI
npm run test:e2e -- --debug  # Debug mode
npx playwright show-report   # View results
```

---

## 3️⃣ Coverage Targets

### Phase 1
- Unit test coverage: 60% minimum
- Critical flows: E2E tested
- All new code: 80%+ coverage

### Phase 2+
- Unit test coverage: 70% minimum
- E2E coverage: All user journeys
- Critical paths: 90%+ coverage

### Measuring Coverage
```bash
npm run test:coverage

# Expected output:
# ✓ statements: 60%
# ✓ branches: 50%
# ✓ functions: 60%
# ✓ lines: 60%
```

---

## 4️⃣ CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [24.x]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}

      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## 5️⃣ Test Best Practices

### ✅ DO
- Test behavior, not implementation
- Use descriptive test names
- Test edge cases
- Mock external dependencies
- Keep tests fast (<100ms per test)

### ❌ DON'T
- Test private functions
- Use `sleep()` in tests
- Create complex test setups
- Test third-party libraries
- Leave test data in production

---

## 6️⃣ Common Patterns

### Mocking
```javascript
// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: 'test' })
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
global.localStorage = localStorageMock;
```

### Async Testing
```javascript
test('should load data', async () => {
  const data = await loadData();
  expect(data).toBeDefined();
});
```

### DOM Testing
```javascript
test('should render button', () => {
  const button = document.createElement('button');
  button.textContent = 'Click me';
  document.body.appendChild(button);
  
  expect(button.textContent).toBe('Click me');
});
```

---

## 📊 Testing Checklist

- [ ] Vitest configured
- [ ] Playwright configured
- [ ] Example tests passing
- [ ] Coverage reporting working
- [ ] GitHub Actions CI working
- [ ] Coverage thresholds enforced
- [ ] Team trained on testing

---

**Status**: ✅ READY TO USE
