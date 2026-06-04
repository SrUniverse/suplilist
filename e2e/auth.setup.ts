import { test as setup } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'e2e/support/storageState.json';

setup('authenticate', async ({ page }) => {
  const login = new LoginPage(page);

  await login.goto();

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Try to register + login against the backend.
  // If the backend is not running (CI without server), skip auth and
  // save an empty storage state so offline tests can still run.
  const backendAvailable = await page.request
    .post('/api/auth/register', {
      headers: { 'X-SupliList-Client': '1', 'Content-Type': 'application/json' },
      data: { email: 'testuser@example.com', password: 'password123' },
      failOnStatusCode: false,
    })
    .then(r => r.ok() || r.status() === 409) // 409 = email already exists = backend is up
    .catch(() => false);

  if (backendAvailable) {
    await login.login('testuser@example.com', 'password123');
    await page.waitForURL('**/home');
  }

  // Ensure the support directory exists before writing.
  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await page.context().storageState({ path: authFile });
});
