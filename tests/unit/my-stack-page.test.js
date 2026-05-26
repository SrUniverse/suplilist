import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMyStackPage } from '../../src/js/components/my-stack-page.js';
import { eventBus } from '../../src/js/core/eventbus.js';
import { stateManager } from '../../src/js/core/state-manager.js';
import { inventoryRepo } from '../../src/js/features/inventory/inventoryRepo.js';
import { supplementRepo } from '../../src/js/features/supplements/supplementRepo.js';

describe('MyStackPage', () => {
  let container;
  let pageInstance;

  beforeEach(() => {
    // Reseta EventBus, StateManager e GA4 Analytics
    eventBus.clearHistory();
    eventBus.subscribers.clear();
    stateManager.setState('stack', []);
    stateManager.setState('inventory', {});

    window.gtag = vi.fn();

    // Mock do DOM
    document.body.innerHTML = '<main id="page-content"></main>';
    container = document.getElementById('page-content');

    // Spies/Mocks para supplementRepo e inventoryRepo
    vi.spyOn(supplementRepo, 'getById').mockImplementation((id) => {
      const database = {
        'creatina-mono': { id: 'creatina-mono', name: 'Creatina Monohidratada', defaultDose: 5, unit: 'g', costPerDose: 0.83, prices: { shopee: 50 } },
        'ashwagandha-ksm-66': { id: 'ashwagandha-ksm-66', name: 'Ashwagandha KSM-66', defaultDose: 300, unit: 'mg', costPerDose: 1.5, prices: { shopee: 60 } },
        'omega-3-epa-dha': { id: 'omega-3-epa-dha', name: 'Ômega-3 EPA+DHA', defaultDose: 5, unit: 'g', costPerDose: 0.83, prices: { shopee: 50 } }
      };
      return database[id] || null;
    });

    vi.spyOn(inventoryRepo, 'getDaysLeft').mockImplementation((id) => {
      const days = {
        'creatina-mono': 10,
        'ashwagandha-ksm-66': 28,
        'omega-3-epa-dha': 2
      };
      return days[id] !== undefined ? days[id] : null;
    });
  });

  afterEach(() => {
    if (pageInstance) pageInstance.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('deve montar a página de stack, semear itens padrão se vazia e disparar analytics de visualização', () => {
    pageInstance = createMyStackPage(container);

    expect(window.gtag).toHaveBeenCalledWith('event', 'stack_page_view', {});

    const itemsList = container.querySelector('#stack-items-list');
    expect(itemsList.children.length).toBe(3); // 3 itens padrão semeados

    // Deve exibir o total correto calculado (89.90 + 120.00 + 45.00 = 254.90)
    const totalCostEl = container.querySelector('#stack-total-cost');
    expect(totalCostEl.textContent.trim()).toBe('R$ 254,90');

    // Valida títulos dos itens
    const names = Array.from(itemsList.querySelectorAll('h4')).map(el => el.textContent.trim());
    expect(names).toContain('Creatina Monohidratada');
    expect(names).toContain('Ashwagandha KSM-66');
    expect(names).toContain('Ômega-3 EPA+DHA');
  });

  it('deve remover um item da stack, acionar os repositórios correspondentes, atualizar a soma e emitir eventos de analytics', () => {
    pageInstance = createMyStackPage(container);

    const removeSpy = vi.spyOn(inventoryRepo, 'remove').mockImplementation(() => {});

    // Encontra botão de remoção da Creatina
    const creatinaItem = container.querySelector('[data-supplement-id="creatina-mono"]');
    const removeBtn = creatinaItem.querySelector('[data-action="remove"]');

    const stackRemovedListener = vi.fn();
    eventBus.on('stack:item:removed', stackRemovedListener);

    removeBtn.click();

    // Valida remoção
    expect(removeSpy).toHaveBeenCalledWith('creatina-mono');
    expect(stackRemovedListener).toHaveBeenCalledWith({ supplementId: 'creatina-mono' });
    expect(window.gtag).toHaveBeenCalledWith('event', 'stack_item_removed', { supplement_id: 'creatina-mono' });

    // Restaram 2 itens (Ashwagandha R$120 + Ômega 3 R$45 = R$165)
    const itemsList = container.querySelector('#stack-items-list');
    expect(itemsList.children.length).toBe(2);

    const totalCostEl = container.querySelector('#stack-total-cost');
    expect(totalCostEl.textContent.trim()).toBe('R$ 165,00');
  });

  it('deve reagir ao evento "dosage:added:to:stack" adicionando ou atualizando itens no protocolo', () => {
    pageInstance = createMyStackPage(container);

    // Dispara a adição de um novo item
    eventBus.emit('dosage:added:to:stack', {
      supplementId: 'creatina-mono',
      dose: 10,
      unit: 'g'
    });

    // Como Creatina já existia, o tamanho da lista continua 3, mas a dose foi atualizada
    const itemsList = container.querySelector('#stack-items-list');
    expect(itemsList.children.length).toBe(3);

    const creatinaCard = container.querySelector('[data-supplement-id="creatina-mono"]');
    const subtitle = creatinaCard.querySelector('span').textContent.trim();
    
    // Novo custo: 0.83 * (10g / 5g default) * 30 dias = 49.8
    expect(subtitle).toContain('10g/dia');
    expect(subtitle).toContain('R$ 49,80/mês');
  });

  it('deve realizar a exportação em formato JSON, disparando telemetria e download físico de arquivo', () => {
    pageInstance = createMyStackPage(container);

    // Mock do clique do download
    const spyClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const spyCreateObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:suplilist');
    const spyRevokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const exportListener = vi.fn();
    eventBus.on('stack:exported', exportListener);

    const exportBtn = container.querySelector('#stack-export-btn');
    exportBtn.click();

    expect(spyClick).toHaveBeenCalled();
    expect(spyCreateObjectUrl).toHaveBeenCalled();
    expect(exportListener).toHaveBeenCalled();
    expect(window.gtag).toHaveBeenCalledWith('event', 'stack_exported', {});
  });

  it('deve gerar o link de compartilhamento contendo os dados da stack em formato base64', () => {
    pageInstance = createMyStackPage(container);

    const mockWriteText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true
    });

    const shareBtn = container.querySelector('#stack-share-btn');
    shareBtn.click();

    expect(mockWriteText).toHaveBeenCalled();
    const generatedUrl = mockWriteText.mock.calls[0][0];
    expect(generatedUrl).toContain('share=');
    
    // Decodifica para garantir integridade do base64
    const url = new URL(generatedUrl);
    const base64Data = decodeURIComponent(url.hash.split('?')[1].split('=')[1]);
    const decoded = JSON.parse(atob(base64Data));
    expect(decoded.length).toBe(3);
  });

  it('deve acionar o comando de impressão do navegador ao clicar no botão Imprimir', () => {
    pageInstance = createMyStackPage(container);

    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    const printBtn = container.querySelector('#stack-print-btn');
    printBtn.click();

    expect(printSpy).toHaveBeenCalled();
  });
});
