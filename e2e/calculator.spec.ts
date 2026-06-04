import { test } from '@playwright/test';
import { CalculatorPage } from './pages/CalculatorPage';
import { MyStackPage } from './pages/MyStackPage';

test.describe('Calculator Flow', () => {
  test.use({ storageState: 'e2e/support/storageState.json' });

  test('should calculate dosage and add to protocol', async ({ page }) => {
    const calc = new CalculatorPage(page);
    const stack = new MyStackPage(page);

    await calc.goto();

    // 1. Preenche a biometria
    await calc.setBiometrics('80', '15');

    // 2. Escolhe um suplemento, ex: Creatina
    const testItemId = 'creatina-monohidratada';
    await calc.selectSupplement(testItemId, 'Creatina Monohidratada');

    // 3. Verifica se o resultado apareceu
    await calc.verifyResultVisible();

    // 4. Adiciona ao protocolo
    await calc.addToProtocol();

    // 5. Verifica se aparece no stack (se estiver integrado dessa forma,
    // ou apenas valida se o botão mudou para "No meu Protocolo", mas
    // o teste pede para validar estados visuais).
    await stack.goto();
    await stack.verifyItemVisible(testItemId);

    // Limpeza
    try {
      await stack.removeItem(testItemId);
    } catch (e) {
      // ignore
    }
  });
});
