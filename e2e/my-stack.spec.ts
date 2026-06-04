import { test, expect } from '@playwright/test';
import { CatalogPage } from './pages/CatalogPage';
import { MyStackPage } from './pages/MyStackPage';

test.describe('My Stack Flow', () => {
  test.use({ storageState: 'e2e/support/storageState.json' });

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
  });

  test('should manage stack items correctly', async ({ page }) => {
    const stack = new MyStackPage(page);

    await stack.goto();

    // Podemos estar com empty state dependendo do estado salvo.
    // Vamos tentar adicionar um item e depois removê-lo.
    const testItemId = 'creatina-monohidratada';
    const testItemName = 'Creatina Monohidratada';

    await stack.addItem(testItemName, testItemId);

    // O item deve estar visível
    await stack.verifyItemVisible(testItemName);

    // Agora remove o item
    await stack.removeItem(testItemName);

    // Verifica se sumiu
    await stack.verifyItemHidden(testItemName);
  });
});
