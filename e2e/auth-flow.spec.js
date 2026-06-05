import { test, expect } from '@playwright/test';

test.describe('Auth Flow - Login & Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should navigate to login page', async ({ page }) => {
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('should display login form with email and password fields', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.locator('input[type="email"]').fill('invalid-email');
    await page.locator('input[type="email"]').blur();
    
    const errorMsg = page.locator('.error-message');
    await expect(errorMsg).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.locator('input[type="email"]').fill('user@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    const errorMsg = page.locator('.error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/invalid|credentials/i);
  });

  test('should login with valid credentials', async ({ page, context }) => {
    await page.locator('input[type="email"]').fill('demo@test.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();

    // Wait for navigation to dashboard
    await page.waitForURL(/.*dashboard/);
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should persist session after login', async ({ page, context }) => {
    // Login
    await page.locator('input[type="email"]').fill('demo@test.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*dashboard/);

    // Refresh page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.locator('input[type="email"]').fill('demo@test.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*dashboard/);

    // Click logout
    await page.locator('[data-testid="logout-btn"]').click();
    
    // Should redirect to login
    await page.waitForURL(/.*login/);
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show remember me option', async ({ page }) => {
    const rememberCheckbox = page.locator('input[type="checkbox"][id="remember-me"]');
    await expect(rememberCheckbox).toBeVisible();
  });

  test('should support password reset link', async ({ page }) => {
    const resetLink = page.locator('a:has-text("Esqueci minha senha")');
    await expect(resetLink).toBeVisible();
    
    await resetLink.click();
    await page.waitForURL(/.*reset/);
    await expect(page).toHaveURL(/.*reset/);
  });
});
