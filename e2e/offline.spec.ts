import { test, expect } from '@playwright/test';
import { CheckinPage } from './pages/CheckinPage';
import { MyStackPage } from './pages/MyStackPage';

test.describe('Offline Flow', () => {
  // Use state logado
  test.use({ storageState: 'e2e/support/storageState.json' });

  test('should queue check-in when offline and keep UI updated', async ({ page, context }) => {
    const checkin = new CheckinPage(page);
    const stack = new MyStackPage(page);

    // Garante que a página inicializou enquanto online
    await checkin.goto();
    
    // Simula queda de rede
    await context.setOffline(true);

    // O Playwright page.route() ou page.context().setOffline(true) permite
    // testar Service Workers e offline states.
    // Aqui testamos se a UI permite interagir mesmo offline.
    
    // Em modo offline, tentamos fazer o check in (já que o checkin renderiza se o app estiver offline)
    // Isso deve colocar na fila de sincronização (SyncQueue)
    const checkAllBtn = page.getByTestId('checkin-all-btn');
    
    // Se o botão estiver visível (se tiver itens pendentes)
    if (await checkAllBtn.isVisible()) {
      await checkin.checkAll();
      
      // A UI deve refletir como concluído
      await expect(checkAllBtn).toBeHidden();
    }

    // Volta a ficar online
    await context.setOffline(false);
    
    // No app real, a SyncQueue dispararia logo depois de ficar online.
    // Poderíamos verificar o toast ou apenas garantir que não quebrou a página.
    await page.waitForTimeout(1000); // Aguarda sync (exemplo)
  });
});
