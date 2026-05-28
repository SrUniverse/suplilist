/**
 * @fileoverview Controlador do contêiner de listagem de suplementos (SupplementList) do SupliList v2.0.
 * Utiliza delegação de eventos para interceptar interações com os cards de suplementos de forma ultra performática.
 */

import { createCard } from './supplement-card.js';
import { skeleton } from './skeleton.js';
import { eventBus } from '../core/eventbus.js';
import { logger } from '../utils/logger.js';

export class SupplementList {
  /**
   * Construtor do componente apresentacional.
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
      logger.error(`SupplementList: O container "${containerId}" não foi encontrado no DOM.`);
      return;
    }

    this._setupEventDelegation();
  }

  /**
   * Renderiza os esqueletos de carregamento.
   * @returns {void}
   */
  renderLoading() {
    if (!this.container) return;
    skeleton.render(6, this.container, 'card');
  }

  /**
   * Limpa o container e renderiza a lista fornecida de suplementos.
   * O array já deve vir enriquecido pelo Controller com status de favoritos e estoque.
   * @param {Array} supplements - Lista de suplementos pré-enriquecidos.
   * @returns {void}
   */
  render(supplements = []) {
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
      // O componente burro apenas repassa os dados pré-calculados que recebeu
      const card = createCard(supp.supplement || supp, {
        isFavorite: supp.isFavorite || false,
        stockStatus: supp.stockStatus || 'ok',
        daysLeft: supp.daysLeft || 0,
      });

      fragment.appendChild(card);
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
          eventBus.emit('ui:supplement:favorite:requested', { supplementId: id });
          break;
        case 'detail':
          eventBus.emit('ui:supplement:detail:requested', { supplementId: id });
          break;
        case 'compare':
          eventBus.emit('ui:supplement:compare:requested', { supplementId: id });
          break;
        case 'buy':
          eventBus.emit('ui:supplement:buy:requested', { supplementId: id });
          break;
      }
    });
  }

  /**
   * Escuta os canais Pub/Sub reativos de interesse para atualizar cirurgicamente a UI.
   * @private
   * Atualiza cirurgicamente apenas o ícone de coração de um card específico (DOM directo).
   * Chamado publicamente pelo Controller responsável.
   * @param {string} supplementId - O slug do card.
   * @param {boolean} isFavorite - Novo status de favorito.
   * @returns {void}
   */
  updateFavoriteIcon(supplementId, isFavorite) {
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
    logger.info('SupplementList UI destruído com sucesso.');
  }
}
