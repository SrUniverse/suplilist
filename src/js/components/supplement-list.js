/**
 * @fileoverview Controlador do contêiner de listagem de suplementos (SupplementList) do SupliList v2.0.
 * Utiliza delegação de eventos para interceptar interações com os cards de suplementos de forma ultra performática.
 */

import { createCard } from './supplement-card.js';
import { skeleton } from './skeleton.js';
import { toast } from './toast.js';
import { favoritesRepo } from '../features/favorites/favoritesRepo.js';
import { supplementService } from '../features/supplements/supplementService.js';
import { stateManager } from '../core/state-manager.js';
import { eventBus } from '../core/eventbus.js';
import { logger } from '../utils/logger.js';
import { comparatorService } from '../features/comparator/comparatorService.js';

class SupplementListController {
  /**
   * Construtor da classe do controlador.
   * @param {string} containerId - O seletor CSS do elemento container.
   */
  constructor(containerId) {
    /**
     * Elemento container do DOM.
     * @type {HTMLElement | null}
     */
    this.container = document.querySelector(containerId);

    /**
     * Lista de ouvintes registrados para remoção no ciclo de vida destroy.
     * @private
     * @type {Function[]}
     */
    this._cleanupFns = [];

    if (!this.container) {
      logger.error(`SupplementListController: O container "${containerId}" não foi encontrado no DOM.`);
      return;
    }

    this._setupEventDelegation();
    this._subscribeToEvents();
  }

  /**
   * Inicia o carregamento síncrono e assíncrono dos suplementos da página.
   * @returns {void}
   */
  init() {
    if (!this.container) return;
    skeleton.render(6, this.container, 'card');
    
    // Inicia a busca padrão (carrega a base no Pub/Sub reativo)
    try {
      supplementService.search({});
    } catch (err) {
      logger.error('SupplementListController.init: Erro na busca de inicialização.', err);
    }
  }

  /**
   * Limpa o container e renderiza a lista fornecida de suplementos.
   * @param {import('../types/supplement.schema.js').Supplement[]} supplements - Lista de suplementos a exibir.
   * @param {Object} [options={}] - Configurações de renderização adicionais.
   * @returns {void}
   */
  render(supplements, options = {}) {
    if (!this.container) return;

    skeleton.clear(this.container);

    // Se a coleção estiver vazia, exibe mensagem amigável de empty state
    if (!Array.isArray(supplements) || supplements.length === 0) {
      this.container.innerHTML = `
        <div class="col-span-full py-16 flex flex-col items-center justify-center gap-3 text-zinc-500 animate-fade-in w-full text-center">
          <span class="text-4xl text-zinc-600">🔍</span>
          <p class="text-sm font-semibold text-zinc-400">Nenhum suplemento encontrado</p>
          <p class="text-xs text-zinc-500 max-w-xs">Tente ajustar seus termos de pesquisa ou remover alguns filtros.</p>
        </div>
      `;
      this._updateResultsCount(0);
      return;
    }

    this.container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    supplements.forEach((supp) => {
      // Enriquece o card obtendo status de estoque e favoritados atualizados do Service
      const enriched = supplementService.getEnriched(supp.id, {
        includeFavorite: true,
        includeInventory: true,
      });

      if (enriched) {
        const card = createCard(enriched.supplement, {
          isFavorite: enriched.isFavorite,
          stockStatus: enriched.stockStatus,
          daysLeft: enriched.daysLeft,
        });
        
        fragment.appendChild(card);
      }
    });

    this.container.appendChild(fragment);
    this._updateResultsCount(supplements.length);
  }

  /**
   * Configura o ouvinte central de delegação de eventos para cliques rápidos nos botões do card.
   * @private
   * @returns {void}
   */
  _setupEventDelegation() {
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (!action || !id) return;

      e.preventDefault();
      e.stopPropagation();

      switch (action) {
        case 'favorite':
          this._handleFavorite(id);
          break;
        case 'detail':
          this._handleDetail(id);
          break;
        case 'compare':
          this._handleCompare(id);
          break;
        case 'buy':
          this._handleBuy(id, e);
          break;
      }
    });
  }

  /**
   * Gerencia a alternância de favoritos disparada pelo clique no coração.
   * @private
   * @param {string} id - O slug do suplemento.
   * @returns {void}
   */
  _handleFavorite(id) {
    const isFav = favoritesRepo.toggle(id);
    toast.show(isFav ? 'Adicionado aos favoritos!' : 'Removido dos favoritos', 'success');
  }

  /**
   * Notifica o sistema que o modal de detalhes completos deve ser aberto.
   * @private
   * @param {string} id - O slug do suplemento.
   * @returns {void}
   */
  _handleDetail(id) {
    eventBus.emit('supplement:detail:open', { supplementId: id });
  }

  /**
   * Adiciona o suplemento selecionado à lista ativa do comparador.
   * @private
   * @param {string} id - O slug do suplemento.
   * @returns {void}
   */
  _handleCompare(id) {
    comparatorService.addToComparator(id);
  }

  /**
   * Redireciona o usuário para o marketplace com melhor preço cadastrado.
   * @private
   * @param {string} id - O slug do suplemento.
   * @param {Event} event - Objeto do clique.
   * @returns {void}
   */
  _handleBuy(id, event) {
    const supp = supplementService.getEnriched(id, { includeFavorite: false });
    if (!supp || !supp.supplement) return;

    const supplement = supp.supplement;
    
    // Identifica o menor preço e seu respectivo marketplace
    let cheapestMarketplace = 'shopee';
    let minPrice = Infinity;

    Object.entries(supplement.prices).forEach(([mkt, price]) => {
      if (price > 0 && price < minPrice) {
        minPrice = price;
        cheapestMarketplace = mkt;
      }
    });

    const links = supplement.links || {};
    const targetUrl = links[cheapestMarketplace] || `https://shopee.com.br/search?keyword=${encodeURIComponent(supplement.name)}`;

    window.open(targetUrl, '_blank', 'noopener');
    eventBus.emit('checkout:initiated', {
      supplementId: id,
      marketplace: cheapestMarketplace,
    });
  }

  /**
   * Escuta os canais Pub/Sub reativos de interesse para atualizar cirurgicamente a UI.
   * @private
   * @returns {void}
   */
  _subscribeToEvents() {
    const unsubFiltered = eventBus.on('supplements:filtered', ({ results }) => {
      this.render(results);
    });

    // Atualização granular reativa de favs
    const unsubFavorite = eventBus.on('favorite:toggled', ({ supplementId, isFavorite }) => {
      this._updateFavoriteIcon(supplementId, isFavorite);
    });

    this._cleanupFns.push(unsubFiltered, unsubFavorite);
  }

  /**
   * Atualiza cirurgicamente apenas o ícone de coração de um card específico (DOM directo).
   * @private
   * @param {string} supplementId - O slug do card.
   * @param {boolean} isFavorite - Novo status de favorito.
   * @returns {void}
   */
  _updateFavoriteIcon(supplementId, isFavorite) {
    if (!this.container) return;

    const card = this.container.querySelector(`[data-supplement-id="${supplementId}"]`);
    if (!card) return;

    const favBtn = card.querySelector('[data-action="favorite"]');
    if (favBtn) {
      favBtn.textContent = isFavorite ? '❤️' : '🤍';
    }
  }

  /**
   * Atualiza a caixa informativa superior contendo a contagem de resultados da busca.
   * @private
   * @param {number} count - Resultados encontrados.
   * @returns {void}
   */
  _updateResultsCount(count) {
    const el = document.getElementById('results-count');
    if (el) {
      el.textContent = `${count} resultado${count !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Remove escutas ativas de eventos e destrói o ciclo do controlador da página.
   * @returns {void}
   */
  destroy() {
    this._cleanupFns.forEach((fn) => fn());
    this._cleanupFns = [];
    logger.info('SupplementListController destruído com sucesso.');
  }
}

/**
 * Factory de inicialização rápida do controlador.
 * @param {string} containerId - Elemento seletor CSS do container.
 * @returns {SupplementListController} Instância do controlador.
 */
export function initSupplementList(containerId) {
  return new SupplementListController(containerId);
}
