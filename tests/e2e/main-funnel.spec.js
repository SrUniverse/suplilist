import { test, expect } from '@playwright/test';

test.describe('Funil Principal de Conversão', () => {
  test('Deve buscar Creatina, listar e disparar evento de clique de afiliado', async ({ page, context }) => {
    // 1. O usuário acessa a rota /#/list
    // Nota: ajuste a porta conforme o servidor de dev (ex: vite na 5173 ou live-server)
    await page.goto('http://localhost:5173/#/list');
    
    // Injeta mock para o objeto global gtag (Google Analytics) para interceptar 
    // e verificar o evento 'affiliate_click' sem enviar requisição real.
    await page.evaluate(() => {
      window.gtag = function(...args) {
        window.__gtag_calls = window.__gtag_calls || [];
        window.__gtag_calls.push(args);
      };
    });

    // 2. Ele digita "Creatina" no input de busca
    const searchInput = page.locator('#catalog-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Creatina');
    
    // 3. O sistema deve filtrar os cards na tela (aguarda debounce de 300ms + renderização)
    await page.waitForTimeout(500); 
    
    // Confirma que os resultados apareceram (lazy loading / intersection observer)
    // Precisamos garantir que o card existe e está visível
    const firstCard = page.locator('.supplement-card').first();
    await firstCard.scrollIntoViewIfNeeded(); // Gatilha o IntersectionObserver
    await expect(firstCard).toBeVisible();

    const firstCardName = firstCard.locator('.card-name');
    await expect(firstCardName).toContainText('Creatina', { ignoreCase: true });
    
    // Prepara contexto para capturar a nova aba aberta pelo botão de compra
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      // 4. O usuário clica no botão "VER MELHORES PREÇOS" do primeiro card
      firstCard.locator('.btn-ver-precos').click()
    ]);

    // 5. O modal ou link de afiliado deve ser acionado corretamente
    // Verifica se a nova aba não é nula
    expect(newPage).not.toBeNull();

    // Verifique se o EventBus emitiu o evento affiliate_click indiretamente checando o gtag
    const gtagCalls = await page.evaluate(() => window.__gtag_calls || []);
    const affiliateEvent = gtagCalls.find(call => call[0] === 'event' && call[1] === 'affiliate_click');
    
    // Assertions estritas
    expect(affiliateEvent).toBeDefined();
    expect(affiliateEvent[2]).toHaveProperty('supplement_name');
    expect(affiliateEvent[2]).toHaveProperty('marketplace');
  });
});
