/**
 * @fileoverview Controlador da Página de Favoritos (FavoritesPage) do SupliList v3.0 (Void Edition).
 * Oferece filtragem tátil por objetivos fitness, ordenação avançada por custo e evidência,
 * modal premium de otimização de stacks recomendadas pela ciência e tags de telemetria GA4.
 * 
 * @author SupliList Team
 * @version 3.0.0
 */

import { favoritesRepo } from '../features/favorites/favoritesRepo.js';
import { supplementService } from '../features/supplements/supplementService.js';
import { eventBus } from '../core/eventbus.js';
import { ErrorBoundary } from '../core/error-boundary.js';
import { logger } from '../utils/logger.js';
import { toast } from './toast.js';

/**
 * Utilitário interno para envio de eventos GA4 de forma resiliente contra falhas globais.
 * @private
 * @param {string} eventName - Nome do evento no Analytics.
 * @param {Object} params - Parâmetros e metadados.
 */
function _trackAnalytics(eventName, params) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

export class FavoritesPage {
  /**
   * Construtor do FavoritesPage.
   * @param {HTMLElement | string} container - Contêiner DOM da página.
   */
  constructor(container) {
    /**
     * Elemento DOM contêiner da página.
     * @type {HTMLElement | null}
     */
    this.container = typeof container === 'string' ? document.querySelector(container) : container;

    if (!this.container) {
      logger.error('FavoritesPage: O elemento de contêiner não foi localizado no DOM.');
      return;
    }

    /**
     * Filtro ativo de metas físicas.
     * @type {string}
     */
    this.activeGoalFilter = 'Todos';

    /**
     * Critério de ordenação ativo.
     * @type {string}
     */
    this.activeSort = 'evidence'; // 'evidence' | 'price' | 'cost-dose' | 'trending'

    /**
     * Coleção de callbacks de desinscrição do EventBus.
     * @private
     * @type {Function[]}
     */
    this._cleanupFns = [];

    // Vincula o escopo do objeto aos métodos ouvintes
    this._handleFavoriteToggled = this._handleFavoriteToggled.bind(this);
    
    // Armazenamento para estado original da sidebar para limpeza
    this._origLogoText = '';
    this._origSubtitleText = '';
    this._addBtnElement = null;
    this._addBtnHandler = null;

    this.init();
  }

  /**
   * Inicializa a página injetando a casca, listeners, telemetria e o primeiro renderizador.
   * @returns {HTMLElement} Contêiner da página.
   */
  init() {
    const safeInit = ErrorBoundary.wrap(() => {
      this._setupHTMLCasca();
      this._setupEventDelegation();
      this._setupInterfaceListeners();
      this._subscribeToEvents();

      // Força a primeira renderização
      this.render();

      // Aplica overrides visuais exclusivos da sidebar nesta página
      this._applySidebarOverrides();

      // Dispara a telemetria do GA4 de visualização de página
      _trackAnalytics('favorites_page_view', { tab: 'all' });
      
      return this.container;
    }, 'FavoritesPage');

    return safeInit() || this.container;
  }

  /**
   * Renderiza a casca e estruturação estática (Header de ações + Abas + Dropdown + Grid).
   * @private
   * @returns {void}
   */
  _setupHTMLCasca() {
    this.container.innerHTML = `
      <div class="fav-page-container">
        
        <!-- Header de Ações -->
        <div id="favorites-actions-header" class="fav-header">
          <div class="fav-header-text">
            <nav class="fav-breadcrumb" aria-label="Breadcrumb">
              <span class="fav-breadcrumb-link" onclick="window.location.hash='#/home'">Home</span>
              <span class="fav-breadcrumb-separator">/</span>
              <span class="fav-breadcrumb-current">Favoritos</span>
            </nav>
            <h1 class="fav-title">Meus Favoritos</h1>
          </div>
          <button id="favorites-optimize-btn" class="btn-primary btn-optimize">
            <span>🛒 Otimizar Todos</span>
          </button>
        </div>

        <!-- Abas de Objetivos e Ordenação em linha flexível -->
        <div id="favorites-filters-row" class="fav-filters-row">
          <div class="fav-tabs">
            <button class="fav-tab-btn active" data-goal="Todos">● Todos</button>
            <button class="fav-tab-btn" data-goal="Hipertrofia">Hipertrofia</button>
            <button class="fav-tab-btn" data-goal="Foco & Cognição">Foco & Cognição</button>
            <button class="fav-tab-btn" data-goal="Longevidade">Longevidade</button>
          </div>

          <!-- Ordenação Dropdown -->
          <div class="fav-sort-wrapper">
            <span class="fav-sort-label">ORDENAR POR:</span>
            <select id="favorites-sort" class="fav-sort-select">
              <option value="evidence">Maior Evidência ▼</option>
              <option value="price">Menor Custo ▼</option>
              <option value="cost-dose">Mais Barato (por dose) ▼</option>
              <option value="trending">Trending ▼</option>
            </select>
          </div>
        </div>

        <!-- Grid de exibição dos favoritos em 2 colunas -->
        <div class="fav-grid" id="favorites-grid"></div>

      </div>
    `;
  }

  /**
   * Aplica overrides estruturais e de marca à barra lateral (sidebar) localmente nesta página.
   * @private
   */
  _applySidebarOverrides() {
    // No-op to preserve standard sidebar nav structure
  }

  /**
   * Restaura as estilizações originais da barra lateral (sidebar) ao sair da página.
   * @private
   */
  _restoreSidebarOverrides() {
    // No-op to preserve standard sidebar nav structure
  }

  /**
   * Renderiza granularmente a listagem de suplementos favoritos de acordo com os filtros.
   * @returns {void}
   */
  render() {
    const grid = this.container.querySelector('#favorites-grid');
    const header = this.container.querySelector('#favorites-actions-header');
    const filters = this.container.querySelector('#favorites-filters-row');
    if (!grid) return;

    let favorites = favoritesRepo.getAll() || [];

    // Se estiver vazio, exibe o empty state premium
    if (favorites.length === 0) {
      if (header) header.style.display = 'none';
      if (filters) filters.style.display = 'none';
      
      grid.className = 'fav-grid-empty';
      grid.innerHTML = `
        <div class="fav-empty-state animate-fade-in">
          <div class="empty-state-icon pulse-icon">♡</div>
          <p class="empty-state-title">Nenhum favorito ainda</p>
          <div class="empty-state-subtitle">
            Explore o catálogo e adicione suplementos aos seus favoritos.
          </div>
          <a href="#/list" class="btn-primary btn-catalog">
            Ir para o Catálogo
          </a>
        </div>
      `;
      return;
    }

    // Se não estiver vazio, garante a exibição do cabeçalho e filtros
    if (header) header.style.display = 'flex';
    if (filters) filters.style.display = 'flex';
    grid.className = 'fav-grid';

    // 1. Filtra logicamente baseado na aba de objetivos selecionada
    if (this.activeGoalFilter !== 'Todos') {
      favorites = favorites.filter((supp) => {
        const filterLower = this.activeGoalFilter.toLowerCase();
        
        // Mapeamentos robustos por objetivos/categorias
        if (filterLower === 'hipertrofia') {
          return supp.goals?.includes('Hipertrofia') || supp.goals?.some(g => g.toLowerCase() === 'hipertrofia');
        }
        if (filterLower === 'foco & cognição') {
          return supp.goals?.includes('Foco') || supp.goals?.some(g => g.toLowerCase().includes('foco')) || supp.category === 'Cognição' || supp.category?.toLowerCase().includes('cogni');
        }
        if (filterLower === 'longevidade') {
          return supp.goals?.includes('Longevidade') || supp.goals?.some(g => g.toLowerCase() === 'longevidade');
        }
        return true;
      });
    }

    // 2. Ordena síncronamente conforme o critério ativo
    favorites = this._sortFavorites(favorites);

    grid.innerHTML = '';

    if (favorites.length === 0) {
      grid.innerHTML = `
        <div class="fav-grid-empty-filter">
          <span class="empty-filter-icon">🔍</span>
          <p class="empty-filter-title">Nenhum favorito para esta meta</p>
          <p class="empty-filter-subtitle">Tente selecionar outro objetivo nas abas superiores.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    favorites.forEach((supp) => {
      const enriched = supplementService.getEnriched(supp.id, {
        includeFavorite: true,
        includeInventory: true
      });

      if (enriched) {
        const card = this._renderFavoriteCard(enriched.supplement);
        fragment.appendChild(card);
      }
    });

    grid.appendChild(fragment);

    // Reaplica overrides visuais da sidebar para consistência
    this._applySidebarOverrides();
  }

  /**
   * Cria o card de favoritos no layout de 2 colunas e alta fidelidade das screenshots.
   * @private
   * @param {import('../../types/supplement.schema.js').Supplement} supplement
   * @returns {HTMLElement}
   */
  _renderFavoriteCard(supplement) {
    const brand = supplement.brand || 'Growth';
    
    // Badge nível
    const evLevel = String(supplement.evidenceLevel).toUpperCase().trim();
    const nivelClass = evLevel === 'A' ? 'badge-nivel-a' : (evLevel === 'B' ? 'badge-nivel-b' : 'badge-nivel-c');
    const nivelLabel = `NÍVEL ${evLevel}`;

    // Determinação do objetivo/categoria separado
    const mapCategoryLabel = (cat) => {
      if (cat === 'Hormônio') return 'Hormonal';
      return cat;
    };
    const goalLabel = supplement.goals && supplement.goals.length > 0 ? supplement.goals[0] : mapCategoryLabel(supplement.category);

    // Melhor preço de marketplace
    let cheapestMarketplace = 'shopee';
    let minPrice = Infinity;
    Object.entries(supplement.prices || {}).forEach(([mkt, price]) => {
      if (price > 0 && price < minPrice) {
        minPrice = price;
        cheapestMarketplace = mkt;
      }
    });

    // Mapeia o badge do marketplace
    let mktBadgeHtml = '';
    if (cheapestMarketplace === 'shopee') {
      mktBadgeHtml = `<span class="fav-marketplace-badge shopee" title="Shopee">🛒</span>`;
    } else if (cheapestMarketplace === 'mercadolivre' || cheapestMarketplace === 'ml') {
      mktBadgeHtml = `<span class="fav-marketplace-badge ml" title="Mercado Livre">ML</span>`;
    } else {
      mktBadgeHtml = `<span class="fav-marketplace-badge amazon" title="Amazon">AMZ</span>`;
    }

    // Separa o preço em inteiros e decimais
    const integerPart = Math.floor(minPrice);
    const decimalPart = String(Math.round((minPrice - integerPart) * 100)).padStart(2, '0');

    const card = document.createElement('div');
    card.className = 'fav-card animate-fade-in group';
    card.setAttribute('data-supplement-id', supplement.id);

    card.innerHTML = `
      <div class="fav-card-image">
        <img
          src="${supplement.image}"
          alt="${supplement.name}"
          loading="lazy"
          onerror="this.src='assets/icons/placeholder.webp'"
        >
        <button
          class="fav-heart-btn active"
          data-action="favorite"
          data-id="${supplement.id}"
          aria-label="Remover Favorito"
        >❤️</button>
      </div>

      <div class="fav-card-body">
        <div class="fav-card-header">
          <span class="${nivelClass}">${nivelLabel}</span>
          <span class="fav-goal-badge">${goalLabel}</span>
        </div>

        <h3 class="fav-card-title" title="${supplement.name}">
          ${supplement.name}
        </h3>

        <p class="fav-card-desc">
          ${supplement.mechanism}
        </p>

        <div class="fav-card-footer">
          <div class="fav-price-row">
            <div class="price-col">
              <span class="price-label">
                Melhor Preço ${mktBadgeHtml}
              </span>
              <div class="price-large">
                <span class="currency">R$</span>
                <span class="integer">${integerPart}</span>
                <span class="decimals">,${decimalPart}</span>
              </div>
            </div>
          </div>

          <div class="fav-action-row">
            <button class="btn-outline btn-detalhes" data-action="detail" data-id="${supplement.id}">
              Detalhes
            </button>
            <button class="btn-primary btn-comprar" data-action="buy" data-id="${supplement.id}">
              Comprar
            </button>
          </div>
        </div>
      </div>
    `;

    // Efeito de zoom no hover da imagem
    const img = card.querySelector('img');
    if (img) {
      card.addEventListener('mouseenter', () => { img.style.transform = 'scale(1.06)'; });
      card.addEventListener('mouseleave', () => { img.style.transform = 'scale(1)'; });
    }

    // Detalhes ao clicar no título ou na imagem
    const detailsElements = card.querySelectorAll('img, h3');
    detailsElements.forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        eventBus.emit('supplement:detail:open', { supplementId: supplement.id });
      });
    });

    return card;
  }

  /**
   * Ordena logicamente a coleção de suplementos favoritos de forma imutável.
   * @private
   * @param {import('../../types/supplement.schema.js').Supplement[]} list - Coleção inicial.
   * @returns {import('../../types/supplement.schema.js').Supplement[]} Lista ordenada.
   */
  _sortFavorites(list) {
    const listCopy = [...list];

    if (this.activeSort === 'evidence') {
      const levelMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
      return listCopy.sort((a, b) => {
        const lvA = levelMap[a.evidenceLevel] || 4;
        const lvB = levelMap[b.evidenceLevel] || 4;
        return lvA - lvB || a.costPerDose - b.costPerDose;
      });
    }

    if (this.activeSort === 'price') {
      return listCopy.sort((a, b) => {
        const getMinPrice = (item) => {
          const prices = Object.values(item.prices || {}).filter(p => typeof p === 'number' && p > 0);
          return prices.length > 0 ? Math.min(...prices) : Infinity;
        };
        return getMinPrice(a) - getMinPrice(b);
      });
    }

    if (this.activeSort === 'cost-dose') {
      return listCopy.sort((a, b) => a.costPerDose - b.costPerDose);
    }

    // Default / Trending
    return listCopy.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Configura delegação de eventos para clicks rápidos e ações nos cards de favoritos.
   * @private
   * @returns {void}
   */
  _setupEventDelegation() {
    const grid = this.container.querySelector('#favorites-grid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (!action || !id) return;

      e.preventDefault();
      e.stopPropagation();

      switch (action) {
        case 'favorite':
          // Remove dos favoritos e re-renderiza reativamente
          favoritesRepo.remove(id);
          eventBus.emit('supplement:favorite:toggle', { supplementId: id, isFavorite: false });
          toast.show('Removido dos favoritos', 'success');
          break;
        case 'detail':
          eventBus.emit('supplement:detail:open', { supplementId: id });
          break;
        case 'buy':
          this._handleBuyRedirect(id);
          break;
      }
    });
  }

  /**
   * Lida com o redirecionamento de compra e afiliados com tags de telemetria GA4.
   * @private
   * @param {string} id - ID do suplemento.
   * @returns {void}
   */
  _handleBuyRedirect(id) {
    const supp = supplementService.getEnriched(id, { includeFavorite: false });
    if (!supp || !supp.supplement) return;

    const supplement = supp.supplement;
    let cheapestMarketplace = 'shopee';
    let minPrice = Infinity;

    Object.entries(supplement.prices || {}).forEach(([mkt, price]) => {
      if (price > 0 && price < minPrice) {
        minPrice = price;
        cheapestMarketplace = mkt;
      }
    });

    const links = supplement.links || {};
    const url = links[cheapestMarketplace] || `https://shopee.com.br/search?keyword=${encodeURIComponent(supplement.name)}`;

    // Emite e registra telemetria do clique de conversão de afiliados GA4
    eventBus.emit('supplement:buy', { supplementId: id, marketplace: cheapestMarketplace });
    _trackAnalytics('affiliate_click', { supplement_id: id, marketplace: cheapestMarketplace });

    window.open(url, '_blank', 'noopener');
  }

  /**
   * Conecta as escutas dos botões superiores, abas horizontais e select de ordenação.
   * @private
   * @returns {void}
   */
  _setupInterfaceListeners() {
    const optimizeBtn = this.container.querySelector('#favorites-optimize-btn');
    const tabFilters = this.container.querySelector('.tab-filters');
    const sortSelect = this.container.querySelector('#favorites-sort');

    // 1. Botão de otimização de stack recomendada
    if (optimizeBtn) {
      optimizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._showOptimizeModal();
      });
    }

    // 2. Abas de filtragem por metas físicas
    if (tabFilters) {
      tabFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.fav-tab-btn');
        if (!btn) return;

        e.preventDefault();

        // Reseta visual e texto das outras abas (remove o ponto "●")
        tabFilters.querySelectorAll('.fav-tab-btn').forEach(b => {
          b.classList.remove('active');
          const goal = b.getAttribute('data-goal');
          b.textContent = goal;
        });

        // Define a aba ativa e adiciona o ponto "●"
        btn.classList.add('active');
        const activeGoal = btn.getAttribute('data-goal');
        btn.textContent = `● ${activeGoal}`;

        this.activeGoalFilter = activeGoal;
        
        // Emite evento e loga no GA4 a mudança de aba
        eventBus.emit('favorites:filter:changed', { goal: this.activeGoalFilter });
        
        const tabValue = this.activeGoalFilter === 'Todos' ? 'all' : this.activeGoalFilter.toLowerCase();
        _trackAnalytics('favorites_page_view', { tab: tabValue });

        this.render();
      });
    }

    // 3. Dropdown de ordenação
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.activeSort = e.target.value;
        // Emite favorites:sort:changed
        eventBus.emit('favorites:sort:changed', { sortBy: this.activeSort });
        this.render();
      });
    }
  }

  /**
   * Abre o modal premium e interativo de otimização de Stacks com bases clínicas.
   * @private
   * @returns {void}
   */
  _showOptimizeModal() {
    eventBus.emit('stack:optimize');
    _trackAnalytics('stack_optimize', {});

    const favorites = favoritesRepo.getAll() || [];
    const favoriteIds = new Set(favorites.map((f) => f.id));

    let suggestions = [];
    let title = "Otimize Sua Suplementação";
    let desc = "Sinergias clínicas e adaptógenos recomendados pela ciência:";

    // Sinergia com Creatina
    const hasCreatine = Array.from(favoriteIds).some(id => id.includes('creatina'));
    if (hasCreatine) {
      desc = "Se você está tomando Creatina, considere adicionar:";
      suggestions = [
        { id: 'inositol', name: 'Carboidrato', reason: 'Sinergia: O consumo de creatina combinado com carboidratos de alto índice glicêmico aumenta a retenção de creatina muscular via pico de insulina.' },
        { id: 'l-citrulina', name: 'L-Arginina', reason: 'Sinergia: Promove vasodilatação celular endotelial, acelerando o fluxo de nutrientes e oxigenação no tecido muscular treinado.' }
      ];
    } else if (favoriteIds.has('cafeina-anidra') || favoriteIds.has('cafeina')) {
      desc = "Se você está tomando Cafeína, considere adicionar:";
      suggestions = [
        { id: 'l-teanina', name: 'L-Teanina', reason: 'Sinergia nootrópica clássica 1:1: Neutraliza os efeitos de jitter/ansiedade da cafeína, promovendo foco calmo e sustentado.' }
      ];
    } else {
      // Starter Kit padrão-ouro
      suggestions = [
        { id: 'creatina-mono', name: 'Creatina Monohidratada', reason: 'O padrão-ouro da ciência para aumento de força, fadiga mental reduzida e foco celular.' },
        { id: 'l-citrulina', name: 'L-Arginina', reason: 'Precursor de óxido nítrico para vasorrelaxamento celular e sinergia de bombeamento.' }
      ];
    }

    const modal = document.createElement('div');
    modal.className = 'fav-modal-overlay animate-fade-in';
    modal.innerHTML = `
      <div class="fav-modal-content">
        <button id="modal-close" class="fav-modal-close">✕</button>
        <span class="fav-modal-icon">✨</span>
        <h3 class="fav-modal-title">${title}</h3>
        <p class="fav-modal-desc">${desc}</p>
        
        <div class="fav-modal-suggestions">
          ${suggestions.map(s => `
            <div class="fav-suggestion-card">
              <div class="fav-suggestion-header">
                <span class="fav-suggestion-name">➕ ${s.name}</span>
                <span class="fav-suggestion-badge">sinergia</span>
              </div>
              <p class="fav-suggestion-reason">${s.reason}</p>
            </div>
          `).join('')}
        </div>

        <button id="modal-add-stack" class="btn-primary fav-modal-action-btn">Adicionar Stack Sugerida</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#modal-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#modal-add-stack').addEventListener('click', () => {
      suggestions.forEach((s) => {
        favoritesRepo.add(s.id);
        eventBus.emit('supplement:favorite:toggle', { supplementId: s.id, isFavorite: true });
      });
      eventBus.emit('favorites:updated');
      toast.show('Sinergias clínicas adicionadas com sucesso!', 'success');
      modal.remove();
      this.render(); // Recarrega
    });
  }

  /**
   * Assina os eventos Pub/Sub reativos do EventBus.
   * @private
   * @returns {void}
   */
  _subscribeToEvents() {
    this._cleanupFns.push(eventBus.on('favorite:toggled', this._handleFavoriteToggled));
    this._cleanupFns.push(eventBus.on('supplement:favorite:toggle', this._handleFavoriteToggled));
    this._cleanupFns.push(eventBus.on('favorites:updated', () => this.render()));
  }

  /**
   * Ouvinte reativo para redesenhar a lista sob adição/remoção granular de favoritos.
   * @private
   * @returns {void}
   */
  _handleFavoriteToggled() {
    this.render();
  }

  /**
   * Libera os escutadores do DOM, desfaz overrides de sidebar e desinscreve canais Pub/Sub para prevenção de memory leaks.
   * @returns {void}
   */
  destroy() {
    this._restoreSidebarOverrides();
    this._cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        // Ignora falhas isoladas de desinscrição
      }
    });
    this._cleanupFns = [];

    logger.info('FavoritesPage destruído com sucesso.');
  }
}

/**
 * Factory legado para inicialização rápida e compatibilidade retrátil.
 * @param {HTMLElement | string} container - Contêiner de destino.
 * @returns {FavoritesPage} Instância do controlador.
 */
export function initFavoritesPage(container) {
  return new FavoritesPage(container);
}

/**
 * Factory SPA padrão-ouro para o PageRouter.
 * @param {HTMLElement | string} container - Contêiner de destino.
 * @returns {FavoritesPage} Instância do controlador.
 */
export function createFavoritesPage(container = '#page-content') {
  return new FavoritesPage(container);
}
