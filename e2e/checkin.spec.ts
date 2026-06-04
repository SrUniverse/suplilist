import { test } from '@playwright/test';
import { CheckinPage } from './pages/CheckinPage';
import { MyStackPage } from './pages/MyStackPage';

test.describe('Checkin Flow', () => {
  test.use({ storageState: 'e2e/support/storageState.json' });

  test('should check-in a supplement from the stack', async ({ page }) => {
    const checkin = new CheckinPage(page);
    const stack = new MyStackPage(page);

    // Adicionamos um item no stack primeiro para garantir que há algo para fazer check-in
    const testItemId = 'creatina';
    await stack.goto();
    // Tenta adicionar
    try {
      await stack.addItem('Creatina', testItemId);
    } catch (e) {
      // Ignora se falhar, talvez já exista
    }

    // Agora vamos para a home/check-in
    await checkin.goto();

    // Se o botão de check-in unitário estiver visível, clica nele
    const checkinBtn = page.getByTestId(`checkin-btn-${testItemId}`);
    
    // Verifica se precisa de checkin
    const isVisible = await checkinBtn.isVisible();
    if (isVisible) {
      await checkin.checkInItem(testItemId);
    }
    
    // Verifica se agora está concluído
    await checkin.verifyItemChecked(testItemId);

    // Limpeza
    await stack.goto();
    try {
      await stack.removeItem(testItemId);
    } catch (e) {
      // Ignora erro
    }
  });
});
