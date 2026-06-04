import { test, expect } from '@playwright/test';
import { CatalogPage } from './pages/CatalogPage';
import { MyStackPage } from './pages/MyStackPage';

test.describe('My Stack Flow', () => {
  test.use({ storageState: 'e2e/support/storageState.json' });

  test('should manage stack items correctly', async ({ page }) => {
    const stack = new MyStackPage(page);

    await stack.goto();

    // Podemos estar com empty state dependendo do estado salvo.
    // Vamos tentar adicionar um item e depois removê-lo.
    const testItemId = 'creatina';

    await stack.addItem('Creatina', testItemId);

    // O item deve estar visível
    await stack.verifyItemVisible(testItemId);

    // Agora remove o item
    await stack.removeItem(testItemId);

    // Se a stack ficou vazia de novo (assumindo que estava vazia),
    // a gente pode verificar se sumiu. Mas a página pode ter outros itens.
    // Pelo menos o item atualizado não deve estar mais lá.
    await expect(page.getByTestId(`stack-item-${testItemId}`)).toBeHidden();
  });
});
