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
      goal: 'strength'
    });

    // Regra 3: Fluxos assíncronos. 
    // Garante que o dashboard carregou validando a URL assincronamente 
    // e verificando estados visuais essenciais em vez de aguardar tempos fixos.
    await expect(page).toHaveURL(/\/my-stack/);
    
    // O próximo passo seria validar um elemento de UI no dashboard se ele existir, por exemplo:
    // await expect(page.getByTestId('stack-list')).toBeVisible();
  });

});
