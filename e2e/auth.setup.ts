import { test as setup } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'e2e/support/storageState.json';

// Minimal app state that bypasses onboarding so E2E tests can reach real pages.
// The app reads this from localStorage key 'suplilist-state-v4'.
const SEED_STATE = {
  _version: '4.0.0',
  user: {
    name: 'Tester',
    email: null,
    weight: 75,
    height: null,
    age: null,
    gender: null,
    activityLevel: null,
    trainingAge: null,
    objective: 'bulk',
    restrictions: [],
    budget: null,
    tier: 'free',
    createdAt: new Date().toISOString(),
    onboardingComplete: true,
    isAuthenticated: false,
    role: null,
    isMfaEnabled: false,
    emailVerified: false,
    purchases: [],
  },
  stack: [],
  checkins: [],
  favorites: [],
  ui: { theme: 'dark', isOffline: false },
};

setup('authenticate', async ({ page }) => {
  const login = new LoginPage(page);

  await login.goto();

  // Seed localStorage with completed-onboarding state so all pages are reachable.
  await page.evaluate((state) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('suplilist-state-v4', JSON.stringify(state));
  }, SEED_STATE);

  // Try to register + login against the backend.
  // Only considered available on 2xx or 409 (email already exists).
  const backendAvailable = await page.request
    .post('/api/auth/register', {
      headers: { 'X-SupliList-Client': '1', 'Content-Type': 'application/json' },
      data: { email: 'testuser@example.com', password: 'password123' },
      failOnStatusCode: false,
    })
    .then(async r => {
      const ct = r.headers()['content-type'] ?? '';
      if (!ct.includes('application/json')) return false; // static SPA fallback, not a real API
      return r.ok() || r.status() === 409;
    })
    .catch(() => false);

  if (backendAvailable) {
    await login.login('testuser@example.com', 'password123');
    // Wait for any post-login redirect; accept /home or /verify-otp (new OTP flow).
    try {
      await page.waitForURL(url => /\/(home|verify-otp)/.test(url.pathname), { timeout: 15000 });
    } catch {
      // Backend may have redirected unexpectedly — just save current state.
    }
  }

  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await page.context().storageState({ path: authFile });
});
