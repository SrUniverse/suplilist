import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHistoryPage } from '../../src/js/components/history-page.js';
import { eventBus } from '../../src/js/core/eventbus.js';
import { historyRepo } from '../../src/js/features/history/historyRepo.js';
import { favoritesRepo } from '../../src/js/features/favorites/favoritesRepo.js';
import { stateManager } from '../../src/js/core/state-manager.js';

describe('HistoryPage', () => {
  let container;
  let pageInstance;
  let mockCycles;
  let mockStats;

  beforeEach(() => {
    // Limpa barramentos de reatividade
    eventBus.clearHistory();
    eventBus.subscribers.clear();
    stateManager.setState('favorites', []);
    
    window.gtag = vi.fn();

    // Setup do container DOM de testes
    document.body.innerHTML = '<main id="page-content"></main>';
    container = document.getElementById('page-content');

    mockCycles = [
      {
        id: 'cycle-001',
        supplementId: 'creatina-mono',
        supplementName: 'Creatina Monohidratada',
        supplementImage: 'creatina.jpg',
        category: 'Aminoácidos',
        startDate: '2024-01-01',
        endDate: '2024-02-29',
        totalDays: 60,
        adherentDays: 57,
        adherencePercent: 95,
        totalSpent: 89.90
      },
      {
        id: 'cycle-002',
        supplementId: 'rhodiola-rosea',
        supplementName: 'Rhodiola Rosea',
        supplementImage: 'rhodiola.jpg',
        category: 'Adaptógenos',
        startDate: '2023-10-01',
        endDate: '2023-12-31',
        totalDays: 90,
        adherentDays: 79,
        adherencePercent: 88,
        totalSpent: 150.00
      },
      {
        id: 'cycle-003',
        supplementId: 'omega-3',
        supplementName: 'Ômega 3',
        supplementImage: 'omega3.jpg',
        category: 'Vitaminas',
        startDate: '2023-07-01',
        endDate: '2023-09-30',
        totalDays: 90,
        adherentDays: 68,
        adherencePercent: 75,
        totalSpent: 120.00
      },
      {
        id: 'cycle-004',
        supplementId: 'whey-protein',
        supplementName: 'Whey Protein',
        supplementImage: 'whey.jpg',
        category: 'Aminoácidos',
        startDate: '2023-05-01',
        endDate: '2023-06-30',
        totalDays: 60,
        adherentDays: 56,
        adherencePercent: 93,
        totalSpent: 180.00
      },
      {
        id: 'cycle-005',
        supplementId: 'magnesio-treonato',
        supplementName: 'Magnésio Treonato',
        supplementImage: 'magnesio.jpg',
        category: 'Minerais',
        startDate: '2023-03-01',
        endDate: '2023-04-30',
        totalDays: 60,
        adherentDays: 55,
        adherencePercent: 91,
        totalSpent: 140.00
      },
      {
        id: 'cycle-006',
        supplementId: 'vitamina-d3',
        supplementName: 'Vitamina D3',
        supplementImage: 'vitamina-d3.jpg',
        category: 'Vitaminas',
        startDate: '2023-01-01',
        endDate: '2023-02-28',
        totalDays: 59,
        adherentDays: 58,
        adherencePercent: 98,
        totalSpent: 60.00
      }
    ];

    mockStats = {
      adherenceAvg: 92,
      totalCycles: 14,
      totalInvested: 3450.00
    };

    // Espiona o repositório de histórico para retornar mocks de teste
    vi.spyOn(historyRepo, 'getAllCycles').mockReturnValue(mockCycles);
    vi.spyOn(historyRepo, 'getStats').mockReturnValue(mockStats);
    vi.spyOn(favoritesRepo, 'add').mockImplementation(() => {});
  });

  afterEach(() => {
    if (pageInstance) pageInstance.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('deve montar a página de histórico e exibir os cartões Bento de KPIs corretos', () => {
    pageInstance = createHistoryPage(container);

    expect(window.gtag).toHaveBeenCalledWith('event', 'history_page_view', {});

    const statAdherence = container.querySelector('#stat-adherence');
    const statCycles = container.querySelector('#stat-cycles');
    const statInvestment = container.querySelector('#stat-investment');

    expect(statAdherence.textContent).toBe('92%');
    expect(statCycles.textContent).toBe('14');
    expect(statInvestment.textContent).toContain('R$ 3.450');

    // Inicialmente carrega até 5 itens (por causa da paginação padrão)
    const list = container.querySelector('#history-list');
    expect(list.children.length).toBe(5);
  });

  it('deve filtrar reativamente os ciclos quando uma aba de categoria é clicada', () => {
    pageInstance = createHistoryPage(container);

    const tabBtn = container.querySelector('[data-category="Aminoácidos"]');
    expect(tabBtn).not.toBeNull();
    tabBtn.click();

    expect(tabBtn.classList.contains('active')).toBe(true);

    const list = container.querySelector('#history-list');
    // Creatina e Whey Protein são Aminoácidos na base mock
    expect(list.children.length).toBe(2);
    expect(list.children[0].querySelector('h4').textContent).toBe('Creatina Monohidratada');
    expect(list.children[1].querySelector('h4').textContent).toBe('Whey Protein');
  });

  it('deve filtrar a listagem em tempo real com base no termo buscado', () => {
    pageInstance = createHistoryPage(container);

    const searchInput = container.querySelector('#history-search-input');
    searchInput.value = 'Rhodiola';
    searchInput.dispatchEvent(new Event('input'));

    const list = container.querySelector('#history-list');
    expect(list.children.length).toBe(1);
    expect(list.children[0].querySelector('h4').textContent).toBe('Ashwagandha KSM-66');
  });

  it('deve permitir carregar mais itens ao clicar no botão de paginação', () => {
    pageInstance = createHistoryPage(container);

    const list = container.querySelector('#history-list');
    expect(list.children.length).toBe(5);

    const loadMoreBtn = container.querySelector('#load-more-btn');
    loadMoreBtn.click();

    // Agora deve exibir todos os 6 itens disponíveis na base de mocks
    expect(list.children.length).toBe(6);
    expect(loadMoreBtn.classList.contains('hidden')).toBe(true); // ocultado pois acabou
  });

  it('deve abrir o modal de logs diários com telemetria ao clicar em Ver Logs', () => {
    pageInstance = createHistoryPage(container);

    const logsBtn = container.querySelector('[data-action="logs"]');
    logsBtn.click();

    const modal = document.querySelector('.bg-zinc-900');
    expect(modal).not.toBeNull();
    expect(modal.querySelector('h3').textContent).toBe('Creatina Monohidratada');

    // Verifica GA4 e evento
    expect(window.gtag).toHaveBeenCalledWith('event', 'cycle_viewed', {
      supplement_id: 'creatina-mono',
      adherence_percent: 95
    });

    // Clica no botão de fechar modal
    const closeBtn = modal.querySelector('#modal-close');
    closeBtn.click();
    expect(document.querySelector('.bg-zinc-900')).toBeNull(); // modal desmontado
  });

});
