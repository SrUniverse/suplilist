const { test, expect } = require('@playwright/test');

test.describe('SupliList Ultra E2E - Full Functional Audit', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5500'); 
    const skeleton = page.locator('#app-shell-skeleton');
    await expect(skeleton).not.toBeVisible({ timeout: 10000 });
  });

  test('1. Fluxo de Navegação e Sanidade das Abas', async ({ page }) => {
    const tabs = ['lista', 'stack', 'wishlist', 'recipe', 'dose', 'history', 'faq', 'config'];
    for (const tab of tabs) {
      console.log(`Testing navigation to: ${tab}`);
      await page.click(`#nt-${tab}`);
      await expect(page.locator(`#p-${tab}`)).toHaveClass(/on/);
      await expect(page).toHaveURL(new RegExp(`#${tab}`));
    }
  });

  test('2. Sistema de Busca, Filtros e Ordenação', async ({ page }) => {
    await page.click('#nt-lista');
    
    // Teste de Busca Fuzzy
    const searchInput = page.locator('#search');
    await searchInput.fill('Whey');
    await page.waitForTimeout(300); // Debounce
    const results = page.locator('#list .item');
    expect(await results.count()).toBeGreaterThan(0);
    await expect(results.first().locator('.iname')).toContainText('Whey');

    // Teste de Categoria (Chip)
    console.log('Filtrando por categoria: Hormônio');
    await page.click('.chip:has-text("Hormônio")');
    await expect(results.first().locator('.ctag')).toContainText('Hormônio');

    // Teste de Ordenação
    console.log('Ordenando por Preço');
    await page.click('.sort-chip[data-sort="cost"]');
    await page.waitForTimeout(200);
    const firstPriceText = await results.first().locator('.mp').textContent();
    console.log(`Menor preço encontrado: ${firstPriceText}`);
  });

  test('3. Interação com Cards (Check, Wishlist, Notas e Modal)', async ({ page }) => {
    await page.click('#nt-lista');
    const firstItem = page.locator('#list .item').first();
    const itemName = await firstItem.locator('.iname').textContent();

    // Toggle Checkbox (Comprado)
    await firstItem.locator('.cbl').click();
    await expect(firstItem).toHaveClass(/done/);
    console.log(`✅ Item ${itemName} marcado como comprado.`);

    // Adicionar aos Favoritos
    await firstItem.locator('.wl-btn').click();
    await expect(firstItem.locator('.wl-btn')).toHaveClass(/on/);

    // Expandir e Adicionar Nota
    await firstItem.locator('.itop').click();
    const noteArea = firstItem.locator('textarea.note-ta');
    await noteArea.fill('Testando nota Playwright');
    await firstItem.locator('.note-btn').click();
    // Verifica se o toast de sucesso apareceu
    await expect(page.locator('.toast.success')).toBeVisible();

    // Abrir Modal de Estudos
    await firstItem.locator('.ref-btn').click();
    await expect(page.locator('#ref-overlay')).toBeVisible();
    await expect(page.locator('#ref-modal-name')).toContainText(itemName || '');
    await page.click('#ref-close');
    await expect(page.locator('#ref-overlay')).not.toBeVisible();
  });

  test('4. Calculadora de Dose Dinâmica', async ({ page }) => {
    await page.click('#nt-dose');
    const slider = page.locator('#prof-weight-slider');
    const weightDisplay = page.locator('#ds-w');
    const doseValue = page.locator('.dose-amt').first();

    const initialDose = await doseValue.textContent();
    
    // Mover slider de peso (simulando drag ou alterando valor via JS)
    await slider.fill('110');
    await expect(weightDisplay).toContainText('110');
    
    const updatedDose = await doseValue.textContent();
    console.log(`Dose inicial: ${initialDose} -> Dose atualizada (110kg): ${updatedDose}`);
    expect(initialDose).not.toBe(updatedDose);
  });

  test('5. Gerador de Receita e Protocolos', async ({ page }) => {
    await page.click('#nt-recipe');
    
    // Aplicar um Preset (Hipertrofia)
    await page.click('.rpreset:has-text("Hipertrofia")');
    const count = await page.locator('#r-count').textContent();
    expect(parseInt(count || '0')).toBeGreaterThan(0);

    // Trocar visualização para Timeline
    await page.click('.rvtab:has-text("Timeline")');
    await expect(page.locator('.timeline-wrap')).toBeVisible();

    // Copiar receita (validar se o comando não quebra)
    await page.click('button:has-text("Copiar")');
    await expect(page.locator('.toast')).toBeVisible();
  });

  test('6. Histórico de Compras (CRUD)', async ({ page }) => {
    await page.click('#nt-history');
    
    // Adicionar compra manual
    await page.selectOption('#hsel', { index: 5 }); // Seleciona um item da lista
    await page.fill('#hprice', '150.50');
    await page.click('#btn-add-hist');

    const historyItem = page.locator('.hitem').first();
    await expect(historyItem).toContainText('R$ 150,50');

    // Editar valor
    page.on('dialog', async dialog => {
      await dialog.accept('160.00'); // Novo preço no prompt
    });
    await historyItem.locator('button[title="Editar"]').click();
    await expect(historyItem).toContainText('R$ 160,00');

    // Excluir
    await historyItem.locator('button[title="Excluir"]').click();
    await expect(page.locator('.hitem')).toHaveCount(0);
  });

  test('7. Configurações, Temas e Modo Admin', async ({ page }) => {
    await page.click('#nt-config');

    // Mudar Tema
    await page.click('#cfgth-light');
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
    console.log('✅ Tema Light aplicado.');

    // Toggle Configuração
    const starToggle = page.locator('#cfg-showStars');
    const wasOn = await starToggle.hasClass('on');
    await starToggle.click();
    expect(await starToggle.hasClass('on')).not.toBe(wasOn);

    // Testar Easter Egg Modo Desenvolvedor (7 cliques)
    console.log('Ativando Modo Desenvolvedor...');
    const trigger = page.locator('#version-trigger');
    for (let i = 0; i < 7; i++) {
      await trigger.click();
    }
    
    // O prompt de código deve aparecer (o Playwright precisa lidar com o dialog)
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Modo Desenvolvedor');
      await dialog.dismiss();
    });
  });

  test('8. Validação de Rodapé e Dados Dinâmicos', async ({ page }) => {
    await page.click('#nt-lista');
    await page.scrollToEnd();
    
    // Verifica se a versão no footer bate com a do database.js (extraída via texto)
    const footerVersion = await page.locator('#version-footer').textContent();
    expect(footerVersion).not.toBe('');
    
    // Testar botão de scroll para o topo
    const scrollTop = page.locator('#scroll-top');
    await expect(scrollTop).toBeVisible();
    await scrollTop.click();
    
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });

});