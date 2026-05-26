import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFavoritesPage } from '../../src/js/components/favorites-page.js';
import { eventBus } from '../../src/js/core/eventbus.js';
import { favoritesRepo } from '../../src/js/features/favorites/favoritesRepo.js';
import { supplementService } from '../../src/js/features/supplements/supplementService.js';
import { stateManager } from '../../src/js/core/state-manager.js';

describe('FavoritesPage', () => {
  let container;
  let pageInstance;
  let mockFavorites;

  beforeEach(() => {
    // Reseta EventBus, StateManager e GA4 dataLayer
    eventBus.clearHistory();
    eventBus.subscribers.clear();
    stateManager.setState('history', []);
    
    window.gtag = vi.fn();

    // Mock do DOM
    document.body.innerHTML = '<main id="page-content"></main>';
    container = document.getElementById('page-content');

    mockFavorites = [
      {
        id: 'creatina',
        name: 'Creatina Monohidratada',
        category: 'Aminoácido',
        evidenceLevel: 'A',
        goals: ['Hipertrofia', 'Força'],
        prices: { shopee: 80, amazon: 90 },
        costPerDose: 1.2,
        image: 'creatina.jpg'
      },
      {
        id: 'rhodiola',
        name: 'Rhodiola Rosea',
        category: 'Adaptógeno',
        evidenceLevel: 'B',
        goals: ['Energia', 'Foco'],
        prices: { shopee: 50 },
        costPerDose: 1.5,
        image: 'rhodiola.jpg'
      }
    ];

    // Mock do favoritesRepo
    vi.spyOn(favoritesRepo, 'getAll').mockReturnValue(mockFavorites);
    vi.spyOn(favoritesRepo, 'add').mockImplementation(() => {});
    vi.spyOn(favoritesRepo, 'remove').mockImplementation(() => {});

    // Mock do supplementService.getEnriched
    vi.spyOn(supplementService, 'getEnriched').mockImplementation((id) => {
      const supp = mockFavorites.find(s => s.id === id);
      if (supp) {
        return {
          supplement: supp,
          isFavorite: true,
          stockStatus: 'in-stock',
          daysLeft: 30
        };
      }
      return null;
    });
  });

  afterEach(() => {
    if (pageInstance) pageInstance.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('deve montar a página de favoritos e disparar o analytics de visualização', () => {
    pageInstance = createFavoritesPage(container);

    expect(window.gtag).toHaveBeenCalledWith('event', 'favorites_page_view', { tab: 'all' });
    
    const grid = container.querySelector('#favorites-grid');
    expect(grid.children.length).toBe(2); // 2 cards renderizados
  });

  it('deve exibir o empty state caso o usuário não possua favoritos', () => {
    vi.spyOn(favoritesRepo, 'getAll').mockReturnValue([]);

    pageInstance = createFavoritesPage(container);

    const emptyText = container.querySelector('p');
    expect(emptyText.textContent).toBe('Nenhum favorito ainda');

    const catLink = container.querySelector('a');
    expect(catLink.getAttribute('href')).toBe('#/list');
  });

  it('deve filtrar reativamente a lista quando as abas de metas (objetivos) forem clicadas', () => {
    pageInstance = createFavoritesPage(container);

    const tabBtn = container.querySelector('[data-goal="Hipertrofia"]');
    tabBtn.click();

    expect(tabBtn.classList.contains('active')).toBe(true);
    expect(window.gtag).toHaveBeenCalledWith('event', 'favorites_page_view', { tab: 'hipertrofia' });

    const grid = container.querySelector('#favorites-grid');
    expect(grid.children.length).toBe(1); // Apenas a Creatina
    expect(grid.children[0].getAttribute('data-supplement-id')).toBe('creatina');
  });

  it('deve reordenar a listagem síncronamente conforme o select de ordenação', () => {
    pageInstance = createFavoritesPage(container);

    const sortSelect = container.querySelector('#favorites-sort');
    
    // Altera para menor preço (Rhodiola R$50 vs Creatina R$80)
    sortSelect.value = 'price';
    sortSelect.dispatchEvent(new Event('change'));

    const grid = container.querySelector('#favorites-grid');
    expect(grid.children.length).toBe(2);
    expect(grid.children[0].getAttribute('data-supplement-id')).toBe('rhodiola'); // Rhodiola primeiro
  });

  it('deve abrir o modal de recomendação de stack ao clicar em Otimizar Todos', () => {
    pageInstance = createFavoritesPage(container);

    const optimizeBtn = container.querySelector('#favorites-optimize-btn');
    optimizeBtn.click();

    const modal = document.querySelector('.bg-zinc-900');
    expect(modal).not.toBeNull();
    expect(modal.querySelector('h3').textContent).toBe('Otimize Sua Suplementação');

    // Clica em fechar modal
    const closeBtn = modal.querySelector('#modal-close');
    closeBtn.click();
    
    expect(document.querySelector('.bg-zinc-900')).toBeNull(); // Modal removido
  });

  it('deve adicionar sugestões e disparar eventos de telemetria ao fechar e aprovar modal de stack', () => {
    pageInstance = createFavoritesPage(container);

    const optimizeBtn = container.querySelector('#favorites-optimize-btn');
    optimizeBtn.click();

    const modal = document.querySelector('.bg-zinc-900');
    const addStackBtn = modal.querySelector('#modal-add-stack');
    
    addStackBtn.click();

    expect(favoritesRepo.add).toHaveBeenCalled(); // chamou add para sugestões
    expect(document.querySelector('.bg-zinc-900')).toBeNull(); // fechou modal
  });

  it('deve disparar cliques do card via event delegation, acionando remoção de favorito e analytics de compra', () => {
    const buyListener = vi.fn();
    eventBus.on('supplement:buy', buyListener);

    pageInstance = createFavoritesPage(container);

    const grid = container.querySelector('#favorites-grid');
    
    // Insere e clica no botão favoritar real no DOM
    const favBtn = document.createElement('button');
    favBtn.setAttribute('data-action', 'favorite');
    favBtn.setAttribute('data-id', 'creatina');
    grid.appendChild(favBtn);
    favBtn.click();

    expect(favoritesRepo.remove).toHaveBeenCalledWith('creatina');

    // Insere e clica no botão comprar real no DOM
    const buyBtn = document.createElement('button');
    buyBtn.setAttribute('data-action', 'buy');
    buyBtn.setAttribute('data-id', 'creatina');
    grid.appendChild(buyBtn);
    
    // Mock do window.open
    const spyOpen = vi.spyOn(window, 'open').mockImplementation(() => {});
    buyBtn.click();

    expect(buyListener).toHaveBeenCalledWith({
      supplementId: 'creatina',
      marketplace: 'shopee'
    });
    expect(window.gtag).toHaveBeenCalledWith('event', 'affiliate_click', {
      supplement_id: 'creatina',
      marketplace: 'shopee'
    });
  });
});
