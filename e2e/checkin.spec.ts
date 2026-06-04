import { test } from '@playwright/test';
import { CheckinPage } from './pages/CheckinPage';
import { MyStackPage } from './pages/MyStackPage';

test.describe('Checkin Flow', () => {
  test.use({ storageState: 'e2e/support/storageState.json' });

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
  });

  test('should check-in a supplement from the stack', async ({ page }) => {
    const checkin = new CheckinPage(page);
    const stack = new MyStackPage(page);

    // Adicionamos um item no stack primeiro para garantir que há algo para fazer check-in
    const testItemId = 'creatina-monohidratada';
    const testItemName = 'Creatina Monohidratada';

    await stack.goto();
    // Tenta adicionar
    try {
      await stack.addItem(testItemName, testItemId);
      // Wait for the 300ms debounce in state-manager to persist to localStorage
      await page.waitForTimeout(400);
    } catch (e) {
      // Ignora se falhar, talvez já exista
    }

    // Agora vamos para a home/check-in
    await checkin.goto();

    // Tenta fazer o checkin (espera o botão ficar visível)
    await checkin.checkInItem(testItemId);
    
    // Verifica se agora está concluído
    await checkin.verifyItemChecked(testItemId);

    // Limpeza
    await stack.goto();
    try {
      await stack.removeItem(testItemName);
    } catch (e) {
      // Ignora erro
    }
  });
});
