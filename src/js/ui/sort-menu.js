/**
 * @fileoverview Controlador do Menu de Ordenação (SortMenu) do SupliList v2.0.
 * Renderiza e gerencia o seletor de critérios de ordenação (custo, evidência, nome)
 * com design premium e realce visual reativo.
 */

import { supplementService } from '../features/supplements/supplementService.js';
import { SORT_OPTIONS } from '../utils/constants.js';
import { searchState } from './search-state.js';
import { logger } from '../utils/logger.js';

class SortMenuController {
  /**
   * Construtor do seletor de ordenação.
   * @param {string} containerId - Seletor CSS ou ID do container de renderização.
   */
  constructor(containerId) {
    /**
     * Elemento container no DOM.
     * @type {HTMLElement | null}
     */
    this.container = document.querySelector(containerId);

    if (!this.container) {
      logger.warn(`SortMenuController: Container "${containerId}" não encontrado no DOM.`);
      return;
    }

    this.init();
  }

  /**
   * Inicializa o componente de ordenação.
   * @returns {void}
   */
  init() {
    this.render();
    this._setupEventListeners();
  }

  /**
   * Renderiza os botões segmentados com visual elegante de abas.
   * @returns {void}
   */
  render() {
    const currentSort = searchState.sortBy || 'cost';

    // Relação de labels amigáveis e ícones por opção de ordenação
    const sortLabels = {
      cost: { label: 'Menor Custo', icon: '💰' },
      evidence: { label: 'Mais Evidência', icon: '🔬' },
      name: { label: 'Nome A-Z', icon: '🔤' }
    };

    const buttonsHtml = SORT_OPTIONS.map((opt) => {
      const active = opt === currentSort;
      const { label, icon } = sortLabels[opt] || { label: opt, icon: '⚡' };
      
      const activeClasses = 'bg-purple-600 text-white shadow-md border-purple-500';
      const inactiveClasses = 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 hover:border-zinc-700';

      return `
        <button data-sort="${opt}" class="flex-grow sm:flex-grow-0 px-4 py-2 border rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 focus:outline-none select-none ${
          active ? activeClasses : inactiveClasses
        }">
          <span>${icon}</span>
          <span>${label}</span>
        </button>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="sort-menu-panel flex flex-col gap-2">
        <span class="text-zinc-500 font-bold text-[10px] uppercase tracking-widest pl-1">Ordenar por</span>
        <div class="flex flex-wrap items-center gap-2">
          ${buttonsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Configura ouvintes delegados para cliques em botões de ordenação.
   * @private
   * @returns {void}
   */
  _setupEventListeners() {
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-sort]');
      if (btn) {
        const selectedSort = btn.getAttribute('data-sort');
        this.setSort(selectedSort);
      }
    });
  }

  /**
   * Altera programaticamente a ordenação ativa, atualiza visual e dispara a busca.
   * @param {string} sortBy - Critério de ordenação a ativar.
   * @returns {void}
   */
  setSort(sortBy) {
    if (!SORT_OPTIONS.includes(sortBy)) {
      logger.warn(`SortMenuController.setSort: Critério "${sortBy}" inválido.`);
      return;
    }

    // Atualiza o estado bridge temporário compartilhado
    searchState.sortBy = sortBy;

    // Atualiza as classes visuais dos botões
    this.render();

    // Executa a busca com os parâmetros atualizados
    supplementService.search({
      query: searchState.query,
      filters: searchState.filters,
      sortBy: searchState.sortBy
    });
  }

  /**
   * Retorna a ordenação atualmente ativa.
   * @returns {string} Ordenação ativa.
   */
  getSortBy() {
    return searchState.sortBy;
  }
}

/**
 * Função canônica de inicialização do menu de ordenação.
 * @param {string} containerId - Seletor CSS ou ID do container de renderização.
 * @returns {SortMenuController} Instância do controlador do menu.
 */
export function initSortMenu(containerId) {
  return new SortMenuController(containerId);
}
