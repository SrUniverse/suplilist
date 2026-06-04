import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

// Login tests require a running backend (/api/auth/*).
// In CI without a backend these are skipped automatically.
test.describe('Login Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should login successfully with valid credentials', async ({ page, request }) => {
    const health = await request.get('/api/auth/health').catch(() => null);
    if (!health || health.status() >= 500) {
      test.skip();
      return;
    }

    const loginPage = new LoginPage(page);
    await loginPage.login('testuser@example.com', 'password123');
    await expect(page).toHaveURL(/\/home/);
  });

  test('should show error message with invalid credentials', async ({ page, request }) => {
    const health = await request.get('/api/auth/health').catch(() => null);
    if (!health || health.status() >= 500) {
      test.skip();
      return;
    }

    const loginPage = new LoginPage(page);
    await loginPage.login('invalid@suplilist.com', 'wrongpass');
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    await expect(loginPage.errorMsg).toBeVisible();
  });
});
