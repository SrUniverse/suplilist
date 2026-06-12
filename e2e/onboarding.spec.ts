import { test, expect } from '@playwright/test';
import { OnboardingPage } from './pages/OnboardingPage';

// Regra 2: Gestão de Estado
// No caso do onboarding, queremos testar com um estado "limpo" de um novo usuário.
// O ideal é que o storageState global seja sobrescrito neste teste.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Onboarding Flow', () => {

  test('deve completar o onboarding e redirecionar para o stack', async ({ page }) => {
    const onboarding = new OnboardingPage(page);

    // Usa a action modular do POM para concluir o fluxo inteiro
    await onboarding.completeOnboarding({
      name: 'João Silva',
      goal: 'strength',
      weight: 80,
      frequency: 4,
    });

    // Regra 3: Fluxos assíncronos.
    // Garante que o dashboard carregou validando a URL assincronamente
    // e verificando estados visuais essenciais em vez de aguardar tempos fixos.
    // "continuar sem conta" deve chegar no app (local-first) — sem cair no /login.
    await expect(page).toHaveURL(/\/my-stack/);
  });

  // Regressão do loop de valor: o "aha" precisa mostrar doses reais e custo > 0.
  // Antes, a tela do stack exibia "undefinedg/dia" e "Investimento/mês R$ 0,00".
  test('o stack recomendado mostra doses reais e custo personalizado (sem undefined)', async ({ page }) => {
    const onboarding = new OnboardingPage(page);

    await onboarding.goto();
    await onboarding.fillName('João Silva');
    await onboarding.submitStep1();
    await onboarding.selectGoal('bulk');
    await onboarding.fillWeight(80);
    await onboarding.selectFrequency(4);
    await onboarding.submitStep2();

    // Passo 3: stack recomendado curado
    const step3 = page.locator('.onboarding-supp-list');
    await expect(step3).toBeVisible();

    // Sem doses "undefined".
    await expect(step3).not.toContainText('undefined');

    // Stack curado, não o catálogo inteiro.
    const cardCount = await step3.locator('.onboarding-supp-card').count();
    expect(cardCount).toBeGreaterThan(0);
    expect(cardCount).toBeLessThanOrEqual(8);

    // Conclui sem conta e valida o My Stack.
    await onboarding.finishOnboarding();
    await expect(page).toHaveURL(/\/my-stack/);
    await expect(page.locator('#router-outlet')).not.toContainText('undefined');
    // Investimento/mês deve ser real (não R$ 0,00).
    await expect(page.locator('#msp-stats')).not.toContainText('R$ 0,00');
  });

});
