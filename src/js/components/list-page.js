/**
 * @fileoverview Controlador da Página Principal de Catálogo (ListPage) do SupliList v3.0.
 * Apresenta o painel completo de suplementos com KPI stats reativos no topo, busca inteligente com Fuse.js,
 * abas de categoria rápida, painel lateral de filtros em modal, e renderização lazy via Intersection Observer.
 * 
 * @author SupliList Team
 * @version 3.0.0
 */

import { eventBus } from '../core/eventbus.js';
import { ErrorBoundary } from '../core/error-boundary.js';
import { logger } from '../utils/logger.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';
import { supplementService } from '../features/supplements/supplementService.js';
import { favoritesRepo } from '../features/favorites/favoritesRepo.js';
import { inventoryRepo } from '../features/inventory/inventoryRepo.js';
import { stateManager } from '../core/state-manager.js';
import { INVENTORY_URGENT_DAYS } from '../utils/constants.js';
import { formatPrice } from '../utils/formatters.js';
import { toast } from './toast.js';
import { ListFilterController } from './list-filter-controller.js';
import { AdvancedFilterModal } from './advanced-filter-modal.js';

/**
 * Renderiza o donut SVG com as métricas fornecidas.
 * BUG-03: Removida animação via rAF interno (race condition — o elemento ainda não
 * está no DOM quando rAF dispara). A animação agora é acionada externamente por
 * _animateDonutEl() após a inserção no DOM.
 * @param {number} percent
 * @param {string} color - Cor hex/rgb do stroke.
 * @returns {string} HTML do SVG.
 */
function renderDonut(percent, color) {
  const r = 14, c = 2 * Math.PI * r;
  // Inicia com stroke-dasharray zerado (anima a partir de 0 via CSS transition)
  return `<svg width="32" height="32" viewBox="0 0 32 32" style="transform: rotate(-90deg); display: block;">
    <circle cx="16" cy="16" r="${r}" fill="none"
      stroke="var(--border-color)" stroke-width="3"/>
    <circle cx="16" cy="16" r="${r}" fill="none"
      stroke="${color}" stroke-width="3"
      stroke-dasharray="0 ${c}"
      stroke-linecap="round"
      data-target="${(percent / 100) * c}"
      data-circ="${c}"
      style="transition: stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1);"/>
  </svg>`;
}

/**
 * Dispara a animação de um donut reciém-inserido no DOM.
 * BUG-03: deve ser chamado DEPOIS de injetar o HTML no DOM (não antes).
 * @param {HTMLElement} wrapEl - Elemento que contém o SVG.
 */
function _animateDonutEl(wrapEl) {
  if (!wrapEl) return;
  const circle = wrapEl.querySelector('circle[data-target]');
  if (!circle) return;
  const target = parseFloat(circle.dataset.target);
  const circ = parseFloat(circle.dataset.circ);
  // Duplo rAF: garante que o browser calculou o layout antes de iniciar a transição
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      circle.style.strokeDasharray = `${target} ${circ}`;
    });
  });
}

class ListPageController {
  /**
   * Construtor da página de listagem.
   * @param {HTMLElement | string} container - Contêiner pai de renderização.
   */
  constructor(container) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;

    if (!this.container) {
      logger.error('ListPageController: Contêiner de destino não encontrado.');
      return;
    }

    this.filterController = new ListFilterController();

    /**
     * Instância do Intersection Observer para lazy rendering.
     * @type {IntersectionObserver | null}
     */
    this.observer = null;

    /**
     * Callbacks de desinscrição do EventBus.
     * @private
     * @type {Function[]}
     */
    this._cleanupFns = [];

    // Vincula o escopo do objeto aos métodos ouvintes
    this._handleFavoriteToggled = this._handleFavoriteToggled.bind(this);
    this._handleInventoryUpdated = this._handleInventoryUpdated.bind(this);

    this.init();
  }

  /**
   * Inicializa o ciclo de vida da página renderizando a casca e acoplando escutas.
   * @returns {void}
   */
  init() {
    const safeInit = ErrorBoundary.wrap(() => {
      this._setupHTMLCasca();
      this.filterController.initSearchEngine();
      this._setupEventDelegation();
      this._setupInterfaceListeners();
      this._subscribeToEvents();

      // Força a primeira varredura e renderização
      this.updateList();

      return this.container;
    }, 'ListPageController');

    safeInit();
  }

  /**
   * Renderiza a estrutura HTML base (Bento Stats + Search Row + Tabs + Grid) na página.
   * @private
   * @returns {void}
   */
  _setupHTMLCasca() {
    this.container.innerHTML = `
      <div class="list-page-container animate-fade-in">
        
        <!-- Bento Stats KPI Row (lista2.png layout) -->
        <div class="page-stats" style="padding: 24px 0 32px 0;">
          <!-- CARD: TOTAL -->
          <div class="stat-card">
            <div class="stat-card-left">
              <span class="stat-card-label">TOTAL</span>
              <span class="stat-card-value" id="stat-total">0</span>
            </div>
            <div class="stat-donut-wrap" id="donut-total"></div>
          </div>

          <!-- CARD: PENDENTES -->
          <div class="stat-card">
            <div class="stat-card-left">
              <span class="stat-card-label">PENDENTES</span>
              <span class="stat-card-value" id="stat-pending">0</span>
            </div>
            <div class="stat-donut-wrap" id="donut-pending"></div>
          </div>

          <!-- CARD: COMPRADOS -->
          <div class="stat-card">
            <div class="stat-card-left">
              <span class="stat-card-label">COMPRADOS</span>
              <span class="stat-card-value" id="stat-bought">0</span>
            </div>
            <div class="stat-donut-wrap" id="donut-bought"></div>
          </div>

          <!-- CARD: URGENTES -->
          <div class="stat-card">
            <div class="stat-card-left">
              <span class="stat-card-label" style="color: #ef4444;">🚨 URGENTES</span>
              <span class="stat-card-value" id="stat-urgent" style="color: #ef4444;">0</span>
            </div>
            <div class="stat-donut-wrap" id="donut-urgent"></div>
          </div>
        </div>

        <!-- Header Row (Obsidian Edition) -->
        <div class="list-header-row">
          <h1 class="list-title">Lista</h1>
          
          <div class="list-controls-wrap">
            <!-- Search bar -->
            <div class="search-box-wrap">
              <span class="search-box-icon">🔍</span>
              <input type="search" id="catalog-search" aria-label="Buscar suplementos por nome, marca ou categoria" class="search-box-input" placeholder="Busque por nome, marca ou categoria...">
            </div>
            
            <!-- Sort Dropdown -->
            <div style="position: relative;">
              <select id="catalog-sort" aria-label="Ordenar suplementos por" class="sort-select">
                <option value="cost">💰 Menor Custo</option>
                <option value="name">🔤 Nome A–Z</option>
                <option value="evidence">🧬 Maior Evidência</option>
              </select>
            </div>
            
            <!-- Filters button -->
            <button id="catalog-filter-toggle" class="btn-filters">
              <span>🎛️</span> Filtros
            </button>
          </div>
        </div>

        <!-- Categories Abas (Pills style matching lista2.png) -->
        <div class="tab-filters">
          <button class="tab-btn active" data-category="Todos">Todos</button>
          <button class="tab-btn" data-category="Adaptógeno">Adaptógeno</button>
          <button class="tab-btn" data-category="Hormônio">Hormônio</button>
          <button class="tab-btn" data-category="Aminoácido">Aminoácido</button>
          <button class="tab-btn" data-category="Mineral">Mineral</button>
          <button class="tab-btn" data-category="Saúde Geral">Saúde Geral</button>
          <button class="tab-btn" data-category="Digital">Digital</button>
        </div>

        <!-- Results Counter -->
        <div style="margin-bottom: 20px;">
          <span style="font-size:10px; color:var(--text-secondary); font-weight:700; text-transform:uppercase; letter-spacing:0.05em;" id="results-count">0 resultados encontrados</span>
        </div>

        <!-- Cards Container Grid -->
        <div class="supplement-grid" id="catalog-grid"></div>

      </div>
    `;

    if (!document.getElementById('list-page-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'list-page-styles';
      styleSheet.textContent = `
        /* --- GENERAL PAGE STRUCTURE --- */
        .list-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .list-title {
          font-family: var(--font-headline);
          font-size: 32px;
          font-weight: 850;
          color: var(--t1);
          margin: 0;
        }
        .list-controls-wrap {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-grow: 1;
          justify-content: flex-end;
          max-width: 580px;
        }
        .search-box-wrap {
          position: relative;
          flex-grow: 1;
          max-width: 320px;
        }
        .search-box-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--t3);
          font-size: 13px;
        }
        .search-box-input {
          width: 100%;
          background: var(--bg-darker);
          border: 1px solid var(--border-color);
          border-radius: 9999px;
          padding: 10px 16px 10px 38px;
          color: var(--t1);
          font-size: 13px;
          font-weight: 600;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-box-input:focus {
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2);
        }
        .sort-select {
          background: var(--bg-darker);
          border: 1px solid var(--border-color);
          border-radius: 9999px;
          padding: 10px 24px 10px 16px;
          color: var(--t2);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
        }
        .sort-select:focus {
          border-color: var(--brand-primary);
        }
        .btn-filters {
          background: var(--bg-darker);
          border: 1px solid var(--border-color);
          border-radius: 9999px;
          padding: 10px 20px;
          color: var(--t2);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-filters:hover {
          background: var(--border-color);
          color: var(--t1);
        }

        /* --- BENTO KPI CARDS --- */
        .stat-card {
          background: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 100px;
          transition: transform 0.2s, border-color 0.2s;
        }
        .stat-card:hover {
          border-color: rgba(168, 85, 247, 0.3);
          transform: translateY(-2px);
        }
        .stat-card-left {
          display: flex;
          flex-direction: column;
        }
        .stat-card-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--t3);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .stat-card-value {
          font-size: 32px;
          font-weight: 800;
          color: var(--t1);
          line-height: 1;
        }
        .stat-donut-wrap {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* --- PILLS CATEGORY FILTERS --- */
        .tab-filters {
          display: flex;
          gap: 8px;
          padding-bottom: 24px;
          flex-wrap: wrap;
          border: none;
        }
        .tab-btn {
          background: var(--bg-darker);
          color: var(--t2);
          border: 1px solid var(--border-color);
          font-weight: 700;
          font-size: 12px;
          padding: 8px 20px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
        }
        .tab-btn:hover {
          color: var(--t1);
          background: var(--border-color);
        }
        .tab-btn.active {
          color: #ffffff;
          background: var(--brand-primary);
          border-color: var(--brand-primary);
          box-shadow: 0 0 16px rgba(168, 85, 247, 0.3);
        }

        /* --- CARD DE SUPLEMENTO OBSIDIAN --- */
        .supplement-card {
          background: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .supplement-card:hover {
          transform: translateY(-4px);
          border-color: var(--brand-primary);
          box-shadow: 0 10px 30px -10px rgba(168, 85, 247, 0.2);
        }
        .card-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16/10;
          overflow: hidden;
          background: var(--bg-darker);
        }
        .card-image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .supplement-card:hover .card-image-wrap img {
          transform: scale(1.05);
        }
        .card-level-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 4px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          z-index: 2;
        }
        .card-level-badge.nivel-a {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .card-level-badge.nivel-b {
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        .card-level-badge.nivel-c {
          background: rgba(107, 114, 128, 0.15);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }
        .card-fav-btn {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(0, 0, 0, 0.5);
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
          z-index: 2;
        }
        .card-fav-btn.active {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          gap: 10px;
        }
        .card-name {
          font-family: var(--font-headline);
          font-size: 15px;
          font-weight: 700;
          color: var(--t1);
          line-height: 1.3;
          margin: 0;
          height: 40px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-price-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: auto;
        }
        .card-price-main {
          font-size: 22px;
          font-weight: 800;
          color: var(--brand-primary);
        }
        .card-price-original {
          font-size: 12px;
          color: var(--t3);
          text-decoration: line-through;
        }
        .card-price-dose {
          font-size: 11px;
          font-weight: 600;
          color: var(--t3);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .btn-ver-precos {
          background: var(--brand-primary);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.05em;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          margin-top: 4px;
        }
        .btn-ver-precos:hover {
          background: var(--brand-primary-hover);
          box-shadow: 0 0 16px rgba(168, 85, 247, 0.4);
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }

  /**
   * Configura o ouvinte central com delegação de eventos para o grid de cards.
   * @private
   * @returns {void}
   */
  _setupEventDelegation() {
    const grid = this.container.querySelector('#catalog-grid');
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
        case 'toggle-fav':
        case 'favorite':
          const isFav = favoritesRepo.toggle(id);

          // Emite os eventos conforme tipagem e contratos canônicos
          eventBus.emit('supplement:favorite:toggle', { supplementId: id, isFavorite: isFav });
          eventBus.emit('favorite:toggled', { supplementId: id, isFavorite: isFav });

          toast.show(isFav ? 'Adicionado aos favoritos!' : 'Removido dos favoritos', 'success');
          break;
        case 'buy':
          this._handleBuyRedirect(id);
          break;
      }
    });
  }

  /**
   * Lida com o redirecionamento de compra de menor custo.
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

    // Dispara gtag de affiliate_click para telemetria GA4
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'affiliate_click', {
        supplement_id: id,
        supplement_name: supplement.name,
        marketplace: cheapestMarketplace,
        price: minPrice
      });
    }

    window.open(url, '_blank', 'noopener');

    // Dispara eventos correspondentes
    eventBus.emit('supplement:buy', {
      supplementId: id,
      marketplace: cheapestMarketplace
    });
    eventBus.emit('checkout:initiated', {
      supplementId: id,
      marketplace: cheapestMarketplace
    });
  }

  /**
   * Conecta as ações táteis das abas, inputs de busca, painel de filtros e sliders.
   * @private
   * @returns {void}
   */
  _setupInterfaceListeners() {
    const searchInput = this.container.querySelector('#catalog-search');
    const filterToggle = this.container.querySelector('#catalog-filter-toggle');
    const tabFilters = this.container.querySelector('.tab-filters');
    const sortSelect = this.container.querySelector('#catalog-sort');

    // Dropdown de Ordenação
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.filterController.setSort(e.target.value);
        this.updateList();
      });
    }

    // Debounce síncrono de busca por digitação (300ms)
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.filterController.setSearchQuery(e.target.value);
          this.updateList();
        }, 300);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          this.filterController.setSearchQuery('');
          this.updateList();
        }
      });
    }

    // Comutador do painel modal de filtros
    if (filterToggle) {
      filterToggle.addEventListener('click', (e) => {
        e.preventDefault();
        AdvancedFilterModal.open(this.filterController.activePanelFilters);
      });
    }

    // Clique nas abas de categoria (Horizontal tabs exatamente como lista.png)
    if (tabFilters) {
      tabFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;

        e.preventDefault();

        // Reseta visual e texto das outras abas (remove o ponto "●")
        tabFilters.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('active');
          const cat = b.getAttribute('data-category');
          b.textContent = cat;
        });

        // Define a aba ativa e adiciona o ponto "●"
        btn.classList.add('active');
        const activeCat = btn.getAttribute('data-category');
        btn.textContent = `● ${activeCat}`;

        this.filterController.setCategory(activeCat);

        // Emite sinal informativo de mudança de filtro de categoria
        eventBus.emit('list:filter:changed', { category: activeCat });

        this.updateList();
      });
    }
  }

  /**
   * Filtra e renderiza dinamicamente a listagem de suplementos e atualiza os Bento KPIs.
   * @returns {void}
   */
  updateList() {
    const list = this.filterController.getFilteredList();

    // 5. Renderização dos cards via Intersection Observer (Lazy Render)
    this.renderCards(list);

    // 6. Atualização dos contadores de estatísticas reativos no topo
    this._updateKPIStats();
  }

  /**
   * Cria a estrutura física do card de suplemento no DOM exatamente como lista.png.
   * @private
   * @param {import('../types/supplement.schema.js').Supplement} supplement
   * @param {Object} [options={}]
   * @returns {HTMLElement}
   */
  _renderCatalogCard(supplement, options = {}) {
    const isFavorite = !!options.isFavorite;
    const bestPrice = Math.min(...Object.values(supplement.prices || {}).filter(p => p > 0)) || 0;
    const originalPrice = Math.round(bestPrice * 1.25);
    const goal = (supplement.goals && supplement.goals.length > 0) ? supplement.goals[0] : 'Saúde Geral';

    const s = {
      ...supplement,
      imageUrl: supplement.image,
      bestPrice,
      originalPrice,
      goal
    };

    const formatInt = (val) => Math.round(val).toString();

    const card = document.createElement('div');
    card.className = 'supplement-card';
    card.setAttribute('data-id', s.id);
    card.setAttribute('data-supplement-id', s.id);

    card.innerHTML = `
      <div class="card-image-wrap">
        <img src="${s.imageUrl}" alt="${s.name}" loading="lazy"
             onerror="this.onerror=null;this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22400%22%20viewBox%3D%220%200%20400%20400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23161616%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%233f3f46%22%20font-family%3D%22sans-serif%22%20font-size%3D%2218%22%3ESem%20Imagem%3C%2Ftext%3E%3C%2Fsvg%3E';">
        <span class="card-level-badge nivel-${s.evidenceLevel.toLowerCase()}">
          NÍVEL ${s.evidenceLevel}
        </span>
        <button class="card-fav-btn ${isFavorite ? 'active' : ''}"
                data-action="toggle-fav" data-id="${s.id}"
                aria-label="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" tabindex="0">♥</button>
      </div>
      <div class="card-body">
        <div class="card-name" tabindex="0" role="button" aria-label="Ver detalhes de ${s.name}">${s.name}</div>
        <div class="card-price-row">
          <span class="card-price-main">R$ ${formatInt(s.bestPrice)}</span>
          ${s.originalPrice ? `<span class="card-price-original">R$ ${formatInt(s.originalPrice)}</span>` : ''}
        </div>
        <div class="card-price-dose">R$ ${s.costPerDose.toFixed(2)} / DOSE</div>
        <button class="btn-ver-precos" data-action="buy" data-id="${s.id}" aria-label="Ver melhores preços para ${s.name}" tabindex="0">
          VER MELHORES PREÇOS
        </button>
      </div>
    `;

    // Clique na imagem ou título abre detalhes do suplemento
    const detailsElements = card.querySelectorAll('img, .card-name');
    detailsElements.forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        // Ignora se o clique veio do botão de favoritos
        if (e.target.closest('[data-action="toggle-fav"]') || e.target.closest('[data-action="favorite"]')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        eventBus.emit('supplement:detail:open', { supplementId: s.id });
      });
    });

    return card;
  }

  /**
   * Renderização Lazy (preguiçosa) dos cards do catálogo visando performance.
   * @param {import('../types/supplement.schema.js').Supplement[]} supplements - Lista filtrada de suplementos.
   * @returns {void}
   */
  renderCards(supplements) {
    const grid = this.container.querySelector('#catalog-grid');
    const countEl = this.container.querySelector('#results-count');

    if (!grid) return;

    grid.innerHTML = '';

    if (countEl) {
      countEl.textContent = `${supplements.length} resultado${supplements.length !== 1 ? 's' : ''} encontrado${supplements.length !== 1 ? 's' : ''}`;
    }

    if (supplements.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 flex flex-col items-center justify-center gap-3 text-zinc-500 animate-fade-in w-full text-center">
          <span class="text-4xl text-zinc-600">🔍</span>
          <p class="text-sm font-semibold text-zinc-400">Nenhum suplemento encontrado</p>
          <p class="text-xs text-zinc-500 max-w-xs">Ajuste seus termos de busca ou limpe os filtros avançados.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    // Desconecta o observer anterior para liberar referências
    if (this.observer) {
      this.observer.disconnect();
    }

    // Configura o novo observer
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const wrapper = entry.target;
          const suppId = wrapper.getAttribute('data-supp-id');
          const supp = supplements.find(s => s.id === suppId);

          if (supp) {
            try {
              const enriched = supplementService.getEnriched(supp.id, {
                includeFavorite: true,
                includeInventory: true
              });

              if (enriched) {
                const card = this._renderCatalogCard(enriched.supplement, {
                  isFavorite: enriched.isFavorite
                });

                wrapper.innerHTML = '';
                wrapper.appendChild(card);

                // Remove esqueleto e aplica opacidade
                wrapper.style.border = 'none';
                wrapper.style.background = 'transparent';
                card.style.opacity = '0';
                card.style.transition = 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

                requestAnimationFrame(() => {
                  card.style.opacity = '1';
                });
              }
            } catch (err) {
              logger.error(`Erro isolado ao renderizar card ${supp.id}:`, err);
              wrapper.innerHTML = `<div class="flex flex-col items-center justify-center w-full h-full text-zinc-500 border border-red-900/30 bg-red-950/10 rounded-3xl p-4 text-center">
                <span class="text-2xl mb-2">⚠️</span>
                <span class="text-xs font-bold text-red-400">Falha ao carregar</span>
                <span class="text-[10px] text-zinc-500 mt-1">${supp.name}</span>
              </div>`;
            }
          }
          this.observer.unobserve(wrapper);
        }
      });
    }, { rootMargin: '80px' });

    // Injeta invólucros vazios para preenchimento posterior sob demanda
    supplements.forEach(supp => {
      const wrapper = document.createElement('div');
      wrapper.className = 'lazy-card-wrapper min-h-[390px] w-full bg-zinc-950/20 border border-zinc-900/50 rounded-3xl overflow-hidden';
      wrapper.setAttribute('data-supp-id', supp.id);

      fragment.appendChild(wrapper);
      this.observer.observe(wrapper);
    });

    grid.appendChild(fragment);
  }

  /**
   * Anima um donut SVG dado o percentual (0-100).
   * @private
   */
  _animateDonut(fillId, percent) {
    const el = this.container.querySelector(`#${fillId}`);
    if (!el) return;
    const clamped = Math.min(100, Math.max(0, percent));
    const circ = 2 * Math.PI * 15.9; // ~99.9
    el.style.strokeDasharray = `${(clamped / 100) * circ} ${circ}`;
    el.style.strokeDashoffset = '0';
  }

  /**
   * Recalcula e atualiza as estatísticas dinâmicas dos Bento KPIs no topo da página.
   * BUG-04: usa INVENTORY_URGENT_DAYS (constante canônica) em vez de valor hardcoded 5.
   * BUG-03: chama _animateDonutEl() após injetar o HTML no DOM.
   * @private
   * @returns {void}
   */
  _updateKPIStats() {
    try {
      const all = supplementRepo.getAll();
      const favorites = favoritesRepo.getAll() || [];
      const historyState = stateManager.getState('history');
      let historyCycles = [];
      if (Array.isArray(historyState)) {
        historyCycles = historyState;
      } else if (historyState && Array.isArray(historyState.cycles)) {
        historyCycles = historyState.cycles;
      }
      const today = new Date().toISOString().split('T')[0];

      // Mapeia IDs comprados (ciclo finalizado)
      const boughtSupplementIds = new Set(
        historyCycles
          .filter(cycle => cycle && cycle.endDate && cycle.endDate < today)
          .map(cycle => cycle.supplementId)
      );

      const totalCount = all.length;
      const boughtCount = boughtSupplementIds.size;
      const pendingCount = favorites.filter(fav => !boughtSupplementIds.has(fav.id ?? fav)).length;

      // BUG-04: usa INVENTORY_URGENT_DAYS em vez de hardcoded 5
      let urgentCount = 0;
      all.forEach(supp => {
        const daysLeft = inventoryRepo.getDaysLeft(supp.id);
        if (daysLeft !== null && daysLeft < INVENTORY_URGENT_DAYS) {
          urgentCount++;
        }
      });

      const totalEl = this.container.querySelector('#stat-total');
      const pendingEl = this.container.querySelector('#stat-pending');
      const boughtEl = this.container.querySelector('#stat-bought');
      const urgentEl = this.container.querySelector('#stat-urgent');

      if (totalEl) { totalEl.textContent = totalCount.toString(); totalEl.setAttribute('aria-label', `Total: ${totalCount}`); }
      if (pendingEl) { pendingEl.textContent = pendingCount.toString(); pendingEl.setAttribute('aria-label', `Pendentes: ${pendingCount}`); }
      if (boughtEl) { boughtEl.textContent = boughtCount.toString(); boughtEl.setAttribute('aria-label', `Comprados: ${boughtCount}`); }
      if (urgentEl) { urgentEl.textContent = urgentCount.toString(); urgentEl.setAttribute('aria-label', `Urgentes: ${urgentCount}`); }

      const donutTotal = this.container.querySelector('#donut-total');
      const donutPending = this.container.querySelector('#donut-pending');
      const donutBought = this.container.querySelector('#donut-bought');
      const donutUrgent = this.container.querySelector('#donut-urgent');

      const base = totalCount || 1;

      // BUG-03: renderDonut() gera HTML com stroke zerado;
      // _animateDonutEl() dispara a transição CSS DEPOIS da inserção no DOM.
      if (donutTotal) { donutTotal.innerHTML = renderDonut(100, '#7c3aed'); _animateDonutEl(donutTotal); }
      if (donutPending) { donutPending.innerHTML = renderDonut((pendingCount / base) * 100, '#7c3aed'); _animateDonutEl(donutPending); }
      if (donutBought) { donutBought.innerHTML = renderDonut((boughtCount / base) * 100, '#22c55e'); _animateDonutEl(donutBought); }
      if (donutUrgent) { donutUrgent.innerHTML = renderDonut((urgentCount / base) * 100, '#ef4444'); _animateDonutEl(donutUrgent); }
    } catch (err) {
      logger.error('ListPageController: Erro ao calcular estatísticas no topo.', err);
    }
  }

  /**
   * Inscreve ouvintes de EventBus para reagir à alterações de favoritos e estoque dinamicamente.
   * @private
   * @returns {void}
   */
  _subscribeToEvents() {
    this._cleanupFns.push(eventBus.on('favorite:toggled', this._handleFavoriteToggled));
    this._cleanupFns.push(eventBus.on('supplement:favorite:toggle', this._handleFavoriteToggled));
    this._cleanupFns.push(eventBus.on('inventory:updated', this._handleInventoryUpdated));
    this._cleanupFns.push(eventBus.on('state:imported', this._handleInventoryUpdated));

    // Escuta o carregamento assíncrono dos suplementos para re-calcular stats e atualizar catálogo
    this._cleanupFns.push(eventBus.on('supplements:loaded', () => {
      this.filterController.initSearchEngine();
      this.updateList();
    }));

    // Escuta mudanças de estado gerais (localStorage, importação, etc) para manter catálogo e stats atualizados
    this._cleanupFns.push(eventBus.on('state:changed', () => {
      this.updateList();
    }));

    // list:filter:changed atualiza os contadores
    this._cleanupFns.push(eventBus.on('list:filter:changed', () => this._updateKPIStats()));
    this._cleanupFns.push(eventBus.on('list:advanced-filter:applied', (filters) => {
      this.filterController.setPanelFilters(filters);
      this.updateList();
    }));
  }

  /**
   * Ouvinte acionado reativamente quando favoritos sofrem alterações.
   * @private
   * @param {{ supplementId: string, isFavorite: boolean }} payload - Alterações do favorito.
   * @returns {void}
   */
  _handleFavoriteToggled({ supplementId, isFavorite }) {
    if (!this.container) return;

    // Atualiza o visual do coração diretamente no card se ele estiver montado e visível
    const card = this.container.querySelector(`[data-supplement-id="${supplementId}"]`);
    if (card) {
      const favBtn = card.querySelector('[data-action="favorite"]') || card.querySelector('[data-action="toggle-fav"]');
      if (favBtn) {
        favBtn.classList.toggle('active', isFavorite);
        if (favBtn.classList.contains('card-fav-btn')) {
          favBtn.textContent = '♥';
        } else {
          favBtn.textContent = isFavorite ? '❤️' : '🤍';
        }
      }
    }

    // Atualiza contadores
    this._updateKPIStats();
  }

  /**
   * Ouvinte acionado reativamente ao alterar estoque.
   * @private
   * @returns {void}
   */
  _handleInventoryUpdated() {
    this.updateList();
  }

  /**
   * Executa a limpeza de ouvintes, observers e desconexões no ciclo destroy.
   * @returns {void}
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this._cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        // Ignora falhas isoladas de desinscrição
      }
    });
    this._cleanupFns = [];

    logger.info('ListPageController destruído com sucesso.');
  }
}

/**
 * Factory de inicialização rápida do controlador da página de listagem SPA.
 * @param {HTMLElement | string} container - Contêiner pai.
 * @returns {ListPageController} Instância do controlador.
 */
export function createListPage(container = '#page-content') {
  return new ListPageController(container);
}
