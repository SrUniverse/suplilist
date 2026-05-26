import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createListPage } from '../../src/js/components/list-page.js';
import { eventBus } from '../../src/js/core/eventbus.js';
import { supplementRepo } from '../../src/js/features/supplements/supplementRepo.js';
import { favoritesRepo } from '../../src/js/features/favorites/favoritesRepo.js';
import { inventoryRepo } from '../../src/js/features/inventory/inventoryRepo.js';
import { stateManager } from '../../src/js/core/state-manager.js';

describe('ListPage', () => {
  let container;
  let pageInstance;
  let mockSupplements;

  beforeEach(() => {
    // Reseta o EventBus e o StateManager
    eventBus.clearHistory();
    eventBus.subscribers.clear();
    stateManager.setState('history', []);
    stateManager.setState('favorites', []);

    // Mock do DOM
    document.body.innerHTML = '<main id="page-content"></main>';
    container = document.getElementById('page-content');

    // Suplementos mock
    mockSupplements = [
      {
        id: 'creatina',
        name: 'Creatina Monohidratada',
        category: 'Aminoácido',
        evidenceLevel: 'A',
        mechanism: 'Aumenta a ressintese de ATP celular durante o exercicio de alta intensidade.',
        defaultDose: 5,
        unit: 'g',
        goals: ['Hipertrofia', 'Força'],
        prices: { shopee: 80, amazon: 90 },
        costPerDose: 1.2,
        image: 'creatina.jpg',
        aliases: ['creatina', 'creapure']
      },
      {
        id: 'rhodiola',
        name: 'Rhodiola Rosea',
        category: 'Adaptógeno',
        evidenceLevel: 'B',
        mechanism: 'Modula os niveis de cortisol e melhora a resistencia mental ao estresse.',
        defaultDose: 300,
        unit: 'mg',
        goals: ['Energia', 'Foco'],
        prices: { shopee: 50 },
        costPerDose: 1.5,
        image: 'rhodiola.jpg',
        aliases: ['raiz de ouro', 'rhodiola']
      },
      {
        id: 'melatonina',
        name: 'Melatonina Pura',
        category: 'Hormônio',
        evidenceLevel: 'A',
        mechanism: 'Induz e regula o ciclo circadiano e melhora a latencia do sono.',
        defaultDose: 1,
        unit: 'mg',
        goals: ['Sono', 'Saúde Geral'],
        prices: { shopee: 30, amazon: 35 },
        costPerDose: 0.5,
        image: 'melatonina.jpg',
        aliases: ['sono leve', 'melatonina']
      }
    ];

    // Mock do supplementRepo
    vi.spyOn(supplementRepo, 'getAll').mockReturnValue(mockSupplements);
    vi.spyOn(supplementRepo, 'filter').mockImplementation((filters, list) => {
      let filtered = [...list];
      if (filters.categories && filters.categories.length > 0) {
        filtered = filtered.filter(item => filters.categories.includes(item.category));
      }
      if (filters.evidenceLevel && filters.evidenceLevel.length > 0) {
        filtered = filtered.filter(item => filters.evidenceLevel.includes(item.evidenceLevel));
      }
      if (filters.goals && filters.goals.length > 0) {
        filtered = filtered.filter(item => filters.goals.every(g => item.goals.includes(g)));
      }
      if (filters.maxCostPerDose && filters.maxCostPerDose > 0) {
        filtered = filtered.filter(item => item.costPerDose <= filters.maxCostPerDose);
      }
      return filtered;
    });
    vi.spyOn(supplementRepo, 'sort').mockImplementation((list) => [...list]);

    // Mock do favoritesRepo
    vi.spyOn(favoritesRepo, 'getAll').mockReturnValue([]);

    // Mock do inventoryRepo
    vi.spyOn(inventoryRepo, 'getDaysLeft').mockReturnValue(null);

    // Mock da API Intersection Observer
    class MockIntersectionObserver {
      constructor(callback) {
        this.callback = callback;
        this.observed = [];
      }
      observe(element) {
        this.observed.push(element);
        // Simula a intersecção imediatamente no ambiente de testes para carregar os cards síncronamente
        this.callback([{ isIntersecting: true, target: element }], this);
      }
      unobserve(element) {
        this.observed = this.observed.filter(el => el !== element);
      }
      disconnect() {
        this.observed = [];
      }
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    if (pageInstance) pageInstance.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('deve montar a casca da página e renderizar os Bento KPIs de estatísticas', () => {
    pageInstance = createListPage(container);

    const totalEl = container.querySelector('#stat-total');
    expect(totalEl.textContent).toBe('3'); // 3 total supplements
  });

  it('deve calcular corretamente a estatística de pendentes baseada em favoritos e histórico', () => {
    // 2 favoritos
    vi.spyOn(favoritesRepo, 'getAll').mockReturnValue([
      { id: 'creatina', name: 'Creatina' },
      { id: 'rhodiola', name: 'Rhodiola' }
    ]);
    
    // 1 comprado no histórico
    stateManager.setState('history', [
      { supplementId: 'creatina', endDate: '2026-05-20' } // endDate no passado
    ]);

    pageInstance = createListPage(container);

    const pendingEl = container.querySelector('#stat-pending');
    const boughtEl = container.querySelector('#stat-bought');
    
    expect(pendingEl.textContent).toBe('1'); // Rhodiola (favoritado mas não comprado)
    expect(boughtEl.textContent).toBe('1'); // Creatina (comprado)
  });

  it('deve calcular a estatística de potes urgentes (< 5 dias de estoque)', () => {
    vi.spyOn(inventoryRepo, 'getDaysLeft').mockImplementation((id) => {
      if (id === 'creatina') return 3; // Urgente
      if (id === 'rhodiola') return 12; // Normal
      return null;
    });

    pageInstance = createListPage(container);

    const urgentEl = container.querySelector('#stat-urgent');
    expect(urgentEl.textContent).toBe('1'); // Apenas a Creatina
  });

  it('deve abrir o modal de filtros ao clicar no botão Filtros', () => {
    pageInstance = createListPage(container);

    const filterToggle = container.querySelector('#catalog-filter-toggle');
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    filterToggle.click();
    const modal = document.querySelector('[role="dialog"]');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('Filtros Avançados');

    // Fecha o modal
    const cancelBtn = modal.querySelector('#modal-cancel-btn');
    cancelBtn.click();
  });

  it('deve filtrar reativamente a lista quando uma aba de categoria é clicada', () => {
    pageInstance = createListPage(container);

    const tabBtn = container.querySelector('[data-category="Adaptógeno"]');
    tabBtn.click();

    expect(tabBtn.classList.contains('active')).toBe(true);
    
    // Verifica se os invólucros foram filtrados para exibir apenas a Rhodiola (Adaptógeno)
    const wrappers = container.querySelectorAll('.lazy-card-wrapper');
    expect(wrappers.length).toBe(1);
    expect(wrappers[0].getAttribute('data-supp-id')).toBe('rhodiola');
  });

  it('deve filtrar a listagem com base nas opções do modal de filtros', () => {
    pageInstance = createListPage(container);

    const filterToggle = container.querySelector('#catalog-filter-toggle');
    filterToggle.click();

    const modal = document.querySelector('[role="dialog"]');
    expect(modal).not.toBeNull();

    // Seleciona a checkbox de Nível A
    const checkboxA = modal.querySelector('.modal-ev-checkbox[value="A"]');
    checkboxA.checked = true;
    checkboxA.dispatchEvent(new Event('change'));

    // Clica em aplicar
    const applyBtn = modal.querySelector('#modal-apply-btn');
    applyBtn.click();

    // Verifica se exibiu apenas os de Nível A (Creatina e Melatonina)
    const wrappers = container.querySelectorAll('.lazy-card-wrapper');
    expect(wrappers.length).toBe(2);
    expect(wrappers[0].getAttribute('data-supp-id')).toBe('creatina');
    expect(wrappers[1].getAttribute('data-supp-id')).toBe('melatonina');
  });

  it('deve limpar todos os filtros adicionais no modal de filtros', () => {
    pageInstance = createListPage(container);

    const filterToggle = container.querySelector('#catalog-filter-toggle');
    filterToggle.click();

    const modal = document.querySelector('[role="dialog"]');
    
    // Seleciona e marca checkbox A
    const checkboxA = modal.querySelector('.modal-ev-checkbox[value="A"]');
    checkboxA.checked = true;

    // Clica em limpar tudo
    const clearBtn = modal.querySelector('#modal-clear-btn');
    clearBtn.click();

    expect(checkboxA.checked).toBe(false);

    // Clica em aplicar para fechar e atualizar
    const applyBtn = modal.querySelector('#modal-apply-btn');
    applyBtn.click();

    const wrappers = container.querySelectorAll('.lazy-card-wrapper');
    expect(wrappers.length).toBe(3); // Mostra todos novamente
  });

  it('deve executar a busca inteligente via Fuse.js em tempo real', async () => {
    pageInstance = createListPage(container);

    const searchInput = container.querySelector('#catalog-search');
    
    // Simula a digitação de "raiz" (presente nos aliases da Rhodiola)
    searchInput.value = 'raiz';
    
    // Dispara manualmente a busca e o render bypassando o debounce no teste
    pageInstance.searchQuery = 'raiz';
    pageInstance.updateList();

    const wrappers = container.querySelectorAll('.lazy-card-wrapper');
    expect(wrappers.length).toBe(1);
    expect(wrappers[0].getAttribute('data-supp-id')).toBe('rhodiola');
  });

  it('deve emitir "supplement:favorite:toggle" e "favorite:toggled" ao clicar no botão favoritar de um card', () => {
    const favoriteToggleListener = vi.fn();
    eventBus.on('supplement:favorite:toggle', favoriteToggleListener);

    vi.stubGlobal('favoritesRepo', {
      toggle: vi.fn().mockReturnValue(true),
      getAll: vi.fn().mockReturnValue([])
    });

    pageInstance = createListPage(container);

    // Cria e insere um botão de favoritos real no DOM dentro do grid
    const grid = container.querySelector('#catalog-grid');
    const favBtn = document.createElement('button');
    favBtn.setAttribute('data-action', 'favorite');
    favBtn.setAttribute('data-id', 'creatina');
    grid.appendChild(favBtn);

    // Clica diretamente no botão!
    favBtn.click();

    expect(favoriteToggleListener).toHaveBeenCalledWith({
      supplementId: 'creatina',
      isFavorite: true
    });
  });
});
