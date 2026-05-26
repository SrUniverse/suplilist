import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDosageCalculatorPage } from '../../src/js/components/dosage-calculator.js';
import { eventBus } from '../../src/js/core/eventbus.js';
import { supplementRepo } from '../../src/js/features/supplements/supplementRepo.js';
import { favoritesRepo } from '../../src/js/features/favorites/favoritesRepo.js';
import { stateManager } from '../../src/js/core/state-manager.js';

describe('DosageCalculatorPage', () => {
  let container;
  let pageInstance;
  let mockSupplement;

  beforeEach(() => {
    // Reseta barramentos
    eventBus.clearHistory();
    eventBus.subscribers.clear();
    stateManager.setState('favorites', []);
    
    window.gtag = vi.fn();

    // Mocks do DOM
    document.body.innerHTML = '<main id="page-content"></main>';
    container = document.getElementById('page-content');

    mockSupplement = {
      id: 'creatina-mono',
      name: 'Creatina Monohidratada',
      category: 'Aminoácidos',
      evidenceLevel: 'A',
      mechanism: 'Creatina aumenta os estoques de fosfocreatina muscular...',
      defaultDose: 5,
      unit: 'g',
      dosageMaintenanceBase: 5,
      dosageLoadBase: 20,
      dosageSafetyMax: 25,
      contraindications: ['Insuficiência renal grave']
    };

    // Espiona repositórios
    vi.spyOn(supplementRepo, 'getAll').mockReturnValue([mockSupplement]);
    vi.spyOn(supplementRepo, 'getById').mockImplementation((id) => {
      if (id === 'creatina-mono') return mockSupplement;
      return null;
    });
    vi.spyOn(favoritesRepo, 'add').mockImplementation(() => {});
  });

  afterEach(() => {
    if (pageInstance) pageInstance.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('deve montar a casca da calculadora e exibir estado vazio inicial na coluna da direita', () => {
    pageInstance = createDosageCalculatorPage(container);

    const weightInput = container.querySelector('#biometric-weight');
    const activitySelect = container.querySelector('#biometric-activity');
    const searchInput = container.querySelector('#dosage-search-input');

    expect(weightInput.value).toBe('70');
    expect(activitySelect.value).toBe('Moderado');
    expect(searchInput).not.toBeNull();

    // Coluna da direita deve indicar nenhum composto selecionado
    const rightCol = container.querySelector('#calculator-right-column');
    expect(rightCol.querySelector('h3').textContent.trim()).toBe('Nenhum composto selecionado');
  });

  it('deve realizar busca e permitir selecionar o suplemento via autocomplete', () => {
    pageInstance = createDosageCalculatorPage(container);

    const searchInput = container.querySelector('#dosage-search-input');
    const suggestionsBox = container.querySelector('#dosage-suggestions');

    // Simula digitação
    searchInput.value = 'Creatina';
    searchInput.dispatchEvent(new Event('input'));

    expect(suggestionsBox.classList.contains('hidden')).toBe(false);
    expect(suggestionsBox.children.length).toBe(1);

    // Clica na sugestão
    const suggestionBtn = suggestionsBox.querySelector('button');
    suggestionBtn.click();

    expect(suggestionsBox.classList.contains('hidden')).toBe(true);
    expect(pageInstance.selectedSupplement.id).toBe('creatina-mono');

    // Deve renderizar o resultado na coluna direita
    const rightCol = container.querySelector('#calculator-right-column');
    expect(rightCol.querySelector('h3').textContent.trim()).toContain('Resultado da Otimização');

    // Dosagem recomendada inicial (Peso 70, Moderado (1.2), Modo Manutenção (5g)) -> 5 * 1 * 1.2 = 6g
    const doseSpan = container.querySelector('#stat-recommended-dose');
    expect(doseSpan.textContent).toContain('6.0');
    expect(doseSpan.textContent).toContain('g/dia');
  });

  it('deve recalcular a dosagem reativamente ao alterar peso e nível de atividade', () => {
    pageInstance = createDosageCalculatorPage(container);

    // Seleciona a Creatina
    pageInstance.selectedSupplement = mockSupplement;
    pageInstance.render();
    pageInstance._calculateAndEmit();

    const weightInput = container.querySelector('#biometric-weight');
    const activitySelect = container.querySelector('#biometric-activity');

    // 1. Altera Peso para 140kg (Fator de peso = 2x) -> 5 * 2 * 1.2 = 12g
    weightInput.value = '140';
    weightInput.dispatchEvent(new Event('input'));

    const doseSpan = container.querySelector('#stat-recommended-dose');
    expect(doseSpan.textContent).toContain('12.0');
    expect(doseSpan.textContent).toContain('g/dia');

    // 2. Altera Atividade para Intenso (1.5x) -> 5 * 2 * 1.5 = 15g
    activitySelect.value = 'Intenso';
    activitySelect.dispatchEvent(new Event('change'));

    const updatedDoseSpan = container.querySelector('#stat-recommended-dose');
    expect(updatedDoseSpan.textContent).toContain('15.0');
    expect(updatedDoseSpan.textContent).toContain('g/dia');
  });

  it('deve alternar o modo entre Manutenção e Carga atualizando a dosagem recomendada', () => {
    pageInstance = createDosageCalculatorPage(container);

    pageInstance.selectedSupplement = mockSupplement;
    pageInstance.render();
    pageInstance._calculateAndEmit();

    const rightCol = container.querySelector('#calculator-right-column');
    
    // Clica no botão Carga (20g base) -> 20 * 1 * 1.2 = 24g
    const loadBtn = rightCol.querySelector('[data-mode="load"]');
    loadBtn.click();

    expect(pageInstance.activeMode).toBe('load');
    
    const doseSpan = container.querySelector('#stat-recommended-dose');
    expect(doseSpan.textContent).toContain('24.0');
    expect(doseSpan.textContent).toContain('g/dia');
  });

  it('deve adicionar o composto ao protocolo de favoritos emitindo eventos de telemetria ao clicar no botão', () => {
    const addListener = vi.fn();
    eventBus.on('dosage:added:to:stack', addListener);

    pageInstance = createDosageCalculatorPage(container);
    pageInstance.selectedSupplement = mockSupplement;
    pageInstance.render();
    pageInstance._calculateAndEmit();

    const addBtn = container.querySelector('#add-to-stack-btn');
    addBtn.click();

    expect(favoritesRepo.add).toHaveBeenCalledWith('creatina-mono');
    expect(addListener).toHaveBeenCalledWith({
      supplementId: 'creatina-mono',
      dose: 6,
      unit: 'g'
    });

    expect(window.gtag).toHaveBeenCalledWith('event', 'dosage_added_to_stack', {
      supplement_id: 'creatina-mono',
      dose: 6,
      unit: 'g'
    });
  });
});
