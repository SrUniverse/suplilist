import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Login Flow', () => {
  // Use clean state for login testing
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should login successfully with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // Supondo que 'test@suplilist.com' e 'password123' sejam válidos no ambiente de teste
    await loginPage.login('test@suplilist.com', 'password123');

    // Rule 3: Async assertions
    await expect(page).toHaveURL(/\/home/);
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.login('invalid@suplilist.com', 'wrongpass');
    
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    await expect(loginPage.errorMsg).toBeVisible();
  });
});
