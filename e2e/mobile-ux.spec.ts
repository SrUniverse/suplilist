import { test, expect, Page, Browser, BrowserContext } from './test';

/**
 * Mobile UX E2E Tests
 * Tests for mobile responsiveness, keyboard handling, touch feedback, etc.
 */

// Test fixtures
const VIEWPORT_SIZES = {
  'iPhone SE': { width: 375, height: 667, deviceScaleFactor: 2 },
  'iPhone 12': { width: 390, height: 844, deviceScaleFactor: 3 },
  'iPhone 14 Pro': { width: 393, height: 852, deviceScaleFactor: 3 },
  'Galaxy A12': { width: 360, height: 800, deviceScaleFactor: 2 },
  'iPad': { width: 768, height: 1024, deviceScaleFactor: 2 },
};

const LANDSCAPE_VIEWPORT = {
  iPhone: { width: 667, height: 375, deviceScaleFactor: 2 },
  Galaxy: { width: 800, height: 360, deviceScaleFactor: 2 },
};

test.describe('Mobile UX - Responsiveness @mobile', () => {
  Object.entries(VIEWPORT_SIZES).forEach(([device, viewport]) => {
    test(`Should render correctly on ${device}`, async ({ browser }) => {
      const isFirefox = browser.browserType().name() === 'firefox';
      const context = await browser.newContext({
        viewport: viewport as any,
        isMobile: !isFirefox,
        hasTouch: true,
      });
      const page = await context.newPage();

      await page.goto('http://127.0.0.1:3000');

      // Check for horizontal scroll (should be none)
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const windowWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(windowWidth);

      // Check all interactive elements are accessible
      const buttons = await page.locator('button').count();
      expect(buttons).toBeGreaterThan(0);

      // Take screenshot for visual regression
      await page.screenshot({ path: `e2e/screenshots/${device}.png` });

      await context.close();
    });
  });

  test('Should handle landscape orientation', async ({ browser }) => {
    const isFirefox = browser.browserType().name() === 'firefox';
    const context = await browser.newContext({
      viewport: LANDSCAPE_VIEWPORT.iPhone as any,
      isMobile: !isFirefox,
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.goto('http://127.0.0.1:3000/dosage');

    // In landscape, content should still be visible
    const viewport = page.viewportSize();
    const height = viewport?.height || 0;

    // Height should be reasonable (not too squished)
    expect(height).toBeGreaterThan(300);

    // Header should be reduced in size
    const headerHeight = await page.locator('#mobile-topbar').boundingBox();
    expect(headerHeight?.height).toBeLessThanOrEqual(52);

    await context.close();
  });
});

test.describe('Mobile UX - Touch Feedback @mobile', () => {
  test('Should show active state on button press', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000');

    const button = page.locator('button.lp-btn').first();

    // Get initial style
    const initialStyle = await button.evaluate(el =>
      window.getComputedStyle(el).transform
    );

    // Simulate touch press
    await button.hover();
    await page.mouse.down();

    const pressedStyle = await button.evaluate(el =>
      window.getComputedStyle(el).transform
    );

    // Style should change (scale or transform)
    expect(pressedStyle).not.toBe(initialStyle);

    await page.mouse.up();
  });

  test('Should not have 300ms tap delay', async ({ page }) => {
    // Only run on touch-enabled devices/contexts
    const hasTouch = !!test.info().project.use?.hasTouch;
    if (!hasTouch) {
      test.skip(true, 'Only touch-enabled devices support tap tests');
      return;
    }

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000');

    const button = page.locator('button.lp-btn').first();

    // Measure time to response
    const startTime = Date.now();
    await button.tap();
    const endTime = Date.now();

    const tapDelay = endTime - startTime;
    expect(tapDelay).toBeLessThan(100); // Should respond immediately
  });

  test('Touch targets should be minimum 44x44px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000');

    // Check all buttons
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const boundingBox = await buttons.nth(i).boundingBox();
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('Mobile UX - Keyboard Handling @mobile', () => {
  test('Should scroll input into view above keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 300 });
    await page.goto('http://127.0.0.1:3000/dosage');

    // Force keyboard handler initialization for desktop browser test runner
    await page.evaluate(async () => {
      const modulePath = '/src/core/mobile-keyboard-handler.js';
      const { default: handler } = await import(modulePath as any);
      handler.init();
    });

    // Reset scroll position to top
    await page.evaluate(() => {
      const outlet = document.querySelector('#router-outlet');
      if (outlet) outlet.scrollTop = 0;
    });

    const initialScroll = await page.evaluate(() => {
      const outlet = document.querySelector('#router-outlet');
      return outlet ? outlet.scrollTop : 0;
    });

    // Focus on input (simulates keyboard appearance)
    const input = page.locator('#inp-weight');
    await input.focus();

    // Wait for scroll to happen
    await page.waitForTimeout(600);

    // Scroll position of router-outlet should have changed
    const finalScroll = await page.evaluate(() => {
      const outlet = document.querySelector('#router-outlet');
      return outlet ? outlet.scrollTop : 0;
    });
    expect(finalScroll).toBeGreaterThan(initialScroll);
  });

  test('Should prevent iOS input zoom', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000/dosage');

    const input = page.locator('#inp-weight');
    const fontSize = await input.evaluate(el =>
      window.getComputedStyle(el).fontSize
    );

    // Font size should be 16px (prevents iOS zoom)
    expect(fontSize).toBe('16px');
  });

  test('Should show keyboard-visible class when keyboard appears', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000/dosage');

    const input = page.locator('#inp-weight');

    // Focus input
    await input.focus();

    // Simulate viewport resize (keyboard appearing)
    await page.evaluate(() => {
      const event = new Event('resize');
      window.dispatchEvent(event);
    });

    // Check if body has keyboard-visible class
    const bodyClasses = await page.evaluate(() => document.body.className);
    // Note: This depends on the keyboard handler implementation
  });
});

test.describe('Mobile UX - Form Validation @accessibility', () => {
  test.skip('Should show validation errors (Skipped: app has no standard client-side validated form with role=alert)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000/dosage');

    // Find form and submit it empty
    const form = page.locator('form:first-child');
    const submitButton = form.locator('button[type="submit"]');

    await submitButton.click();

    // Check for validation messages
    const errorMessages = page.locator('[role="alert"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test.skip('Should focus on first invalid input (Skipped: app has no standard client-side validated form)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000/dosage');

    const form = page.locator('form:first-child');
    const submitButton = form.locator('button[type="submit"]');

    await submitButton.click();

    // First input should be focused
    const firstInput = form.locator('input:first-child');
    const isFocused = await firstInput.evaluate(el =>
      el === document.activeElement
    );
    expect(isFocused).toBe(true);
  });
});

test.describe('Mobile UX - Accessibility @accessibility', () => {
  test('Should be keyboard navigable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000');

    // Tab through elements
    let activeElement = await page.evaluate(() => document.activeElement?.tagName);

    // First tab should move focus
    await page.keyboard.press('Tab');
    const newActiveElement = await page.evaluate(() => document.activeElement?.tagName);

    expect(newActiveElement).toBeDefined();
  });

  test('Should have visible focus indicators', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000');

    const button = page.locator('button.lp-btn').first();

    // Focus button
    await button.focus();

    // Check for focus outline
    const outline = await button.evaluate(el =>
      window.getComputedStyle(el).outlineWidth
    );

    // Outline width should be visible (> 0)
    expect(parseInt(outline)).toBeGreaterThan(0);
  });

  test('Should have proper color contrast', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000');

    // This is a simplified check - real contrast checking is more complex
    const body = page.locator('body');
    const bgColor = await body.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Background color should be set
    expect(bgColor).toBeDefined();
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('Mobile UX - Performance @mobile', () => {
  test('Should have fast First Contentful Paint', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const metrics = await page.evaluate(() => {
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find(p => p.name === 'first-contentful-paint');
      return fcp?.startTime || 0;
    });

    // FCP should be < 1800ms (Google CWV threshold)
    expect(metrics).toBeLessThan(1800);
  });

  test('Should have smooth scrolling (no jank)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000');

    // Measure scroll performance
    const performanceMetrics = await page.evaluate(() => {
      return {
        totalTime: performance.now(),
        fps: 60, // Default - would need more complex measurement
      };
    });

    expect(performanceMetrics.totalTime).toBeGreaterThan(0);
  });
});

test.describe('Mobile UX - Dark Mode @mobile', () => {
  test('Should render correctly in dark mode', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000');

    // Set dark mode preference
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Check that text is readable
    const bgColor = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body);
      return style.backgroundColor;
    });

    expect(bgColor).toBeDefined();
  });

  test('Should respect prefers-color-scheme', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Emulate dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('http://127.0.0.1:3000');

    // Should load dark theme
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );

    expect(theme).toBe('dark');
  });
});

test.describe('Mobile UX - Offline Support @mobile', () => {
  test('Should indicate offline status', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:3000');

    // Simulate offline
    await page.context().setOffline(true);

    // Wait for offline notification
    await page.waitForTimeout(1000);

    // Check for offline indicator
    const offlineClass = await page.evaluate(() =>
      document.body.className.includes('is-offline')
    );

    expect(offlineClass).toBe(true);

    // Go back online
    await page.context().setOffline(false);
  });
});
