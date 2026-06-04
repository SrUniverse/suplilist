import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const authFile = 'e2e/support/storageState.json';

setup('authenticate', async ({ page }) => {
  // Configuração global para login e salvar o storage state
  const login = new LoginPage(page);
  
  await login.goto();
  
  // Limpa o estado local para garantir isolamento limpo (Drop Database PWA style)
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Garante que o usuário de teste existe (ignora conflito se já cadastrado)
  await page.request.post('/api/auth/register', {
    headers: { 'X-SupliList-Client': '1', 'Content-Type': 'application/json' },
    data: { email: 'testuser@example.com', password: 'password123' },
    failOnStatusCode: false,
  });

  await login.login('testuser@example.com', 'password123');

  await page.waitForURL('**/home');

  // Salva o estado do localStorage/cookies (como o app usa IndexedDB para algumas coisas e
  // LocalStorage para estado, o Playwright salva o LocalStorage pelo storageState)
  await page.context().storageState({ path: authFile });
});
