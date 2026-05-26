/**
 * @fileoverview Controlador do Painel de Filtros (FilterBar) do SupliList v2.0.
 * Renderiza e gerencia filtros facetados reativos de categorias, objetivos,
 * níveis de comprovação científica e custo por dose com design dark premium.
 */

import { supplementService } from '../features/supplements/supplementService.js';
import { CATEGORIES, GOALS, EVIDENCE_LEVELS } from '../utils/constants.js';
import { searchState } from './search-state.js';
import { formatPrice } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

class FilterBarController {
  /**
   * Constrói e inicializa a barra de filtros.
   * @param {string} containerId - Seletor CSS ou ID do container de renderização.
   */
  constructor(containerId) {
    /**
     * Elemento container no DOM.
     * @type {HTMLElement | null}
     */
    this.container = document.querySelector(containerId);
    
    if (!this.container) {
      logger.warn(`FilterBarController: Container "${containerId}" não encontrado no DOM.`);
      return;
    }

    this.init();
  }

  /**
   * Renderiza os controles HTML do painel e ativa os ouvintes de eventos estruturados.
   * @returns {void}
   */
  init() {
    this.render();
    this._setupEventListeners();
    this._syncStateToUi();
  }

  /**
   * Renderiza a estrutura HTML rica do painel de filtros com Tailwind CSS.
   * @returns {void}
   */
  render() {
    const categoriesHtml = CATEGORIES.map((cat) => `
      <label class="flex items-center gap-2.5 text-xs text-zinc-400 hover:text-zinc-250 cursor-pointer select-none transition-colors py-1">
        <input type="checkbox" data-type="category" value="${cat}" class="w-4 h-4 rounded border-zinc-800 bg-zinc-950/80 text-purple-600 focus:ring-purple-500/35 transition-colors cursor-pointer">
        <span>${cat}</span>
      </label>
    `).join('');

    const evidenceHtml = EVIDENCE_LEVELS.map((el) => `
      <label class="flex items-center gap-2.5 text-xs text-zinc-400 hover:text-zinc-250 cursor-pointer select-none transition-colors py-1">
        <input type="checkbox" data-type="evidence" value="${el}" class="w-4 h-4 rounded border-zinc-800 bg-zinc-950/80 text-purple-600 focus:ring-purple-500/35 transition-colors cursor-pointer">
        <span class="px-1.5 py-0.5 rounded font-extrabold text-[9px] ${
          el === 'A' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
          el === 'B' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
          'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30'
        }">${el}</span>
      </label>
    `).join('');

    const goalsHtml = GOALS.map((goal) => `
      <label class="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-250 cursor-pointer select-none transition-colors py-1">
        <input type="checkbox" data-type="goal" value="${goal}" class="w-4 h-4 rounded border-zinc-800 bg-zinc-950/80 text-purple-600 focus:ring-purple-500/35 transition-colors cursor-pointer">
        <span>${goal}</span>
      </label>
    `).join('');

    this.container.innerHTML = `
      <div class="filter-panel flex flex-col gap-6 bg-zinc-900 border border-zinc-800/80 rounded-3xl p-5 shadow-lg select-none">
        
        <!-- Header com Reset -->
        <div class="flex items-center justify-between border-b border-zinc-800/60 pb-3.5">
          <h4 class="text-zinc-250 font-bold text-sm flex items-center gap-2">
            <span>⚙️</span> Filtros de Pesquisa
          </h4>
          <button id="btn-clear-filters" class="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors focus:outline-none">
            Limpar tudo
          </button>
        </div>

        <!-- Bloco 1: Categorias -->
        <div class="flex flex-col gap-2">
          <span class="text-zinc-300 font-bold text-xs uppercase tracking-wider">Categorias</span>
          <div class="flex flex-col gap-1 max-h-[150px] overflow-y-auto pr-1">
            ${categoriesHtml}
          </div>
        </div>

        <!-- Bloco 2: Nível de Comprovação Científica -->
        <div class="flex flex-col gap-2">
          <span class="text-zinc-300 font-bold text-xs uppercase tracking-wider">Evidência Científica</span>
          <div class="grid grid-cols-3 gap-1">
            ${evidenceHtml}
          </div>
        </div>

        <!-- Bloco 3: Custo por Dose Máximo -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-zinc-300 font-bold text-xs uppercase tracking-wider">Custo/dose máximo</span>
            <span id="max-cost-bubble" class="text-xs font-bold text-purple-400">R$ 5,00</span>
          </div>
          <input type="range" id="input-cost-range" min="0" max="5" step="0.1" value="5.0" class="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none">
          <div class="flex items-center justify-between text-[10px] text-zinc-500 font-semibold px-0.5">
            <span>R$ 0,00</span>
            <span>R$ 5,00</span>
          </div>
        </div>

        <!-- Bloco 4: Objetivos Terapêuticos -->
        <div class="flex flex-col gap-2">
          <span class="text-zinc-300 font-bold text-xs uppercase tracking-wider">Objetivos</span>
          <div class="grid grid-cols-2 gap-x-2 gap-y-1">
            ${goalsHtml}
          </div>
        </div>

      </div>
    `;
  }

  /**
   * Configura ouvintes delegados no nível do container de forma limpa.
   * @private
   * @returns {void}
   */
  _setupEventListeners() {
    // 1. Delegar escuta de Checkboxes (Categorias, Objetivos, Nível de Evidência)
    this.container.addEventListener('change', (e) => {
      if (e.target && e.target.type === 'checkbox') {
        this._updateFiltersAndSearch();
      }
    });

    // 2. Ouvinte de arrastar slider (atualiza bolha numérica e executa busca)
    this.container.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'input-cost-range') {
        const value = parseFloat(e.target.value);
        const bubble = this.container.querySelector('#max-cost-bubble');
        if (bubble) {
          bubble.textContent = formatPrice(value);
        }
        this._updateFiltersAndSearch();
      }
    });

    // 3. Ouvinte para limpeza completa de filtros
    const clearBtn = this.container.querySelector('#btn-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearFilters();
      });
    }
  }

  /**
   * Coleta dados da interface, atualiza o bridge `searchState` e executa a busca global.
   * @private
   * @returns {void}
   */
  _updateFiltersAndSearch() {
    const categories = [];
    const evidenceLevel = [];
    const goals = [];

    // Coleta categorias marcadas
    this.container.querySelectorAll('input[data-type="category"]:checked').forEach((cb) => {
      categories.push(cb.value);
    });

    // Coleta níveis de evidência marcados
    this.container.querySelectorAll('input[data-type="evidence"]:checked').forEach((cb) => {
      evidenceLevel.push(cb.value);
    });

    // Coleta objetivos marcados
    this.container.querySelectorAll('input[data-type="goal"]:checked').forEach((cb) => {
      goals.push(cb.value);
    });

    // Coleta valor de custo do slider
    const costRangeInput = this.container.querySelector('#input-cost-range');
    const maxCostPerDose = costRangeInput ? parseFloat(costRangeInput.value) : 5.0;

    // Atualiza o estado bridge temporário compartilhado de UI
    searchState.filters = {
      categories,
      evidenceLevel,
      goals,
      maxCostPerDose
    };

    // Dispara a busca reativa do serviço
    supplementService.search({
      query: searchState.query,
      filters: searchState.filters,
      sortBy: searchState.sortBy
    });
  }

  /**
   * Sincroniza os elementos visuais do DOM com o estado mantido no bridge.
   * @private
   * @returns {void}
   */
  _syncStateToUi() {
    const filters = searchState.filters || {};

    // 1. Sincroniza checkboxes de categorias
    this.container.querySelectorAll('input[data-type="category"]').forEach((cb) => {
      cb.checked = Array.isArray(filters.categories) && filters.categories.includes(cb.value);
    });

    // 2. Sincroniza checkboxes de evidências
    this.container.querySelectorAll('input[data-type="evidence"]').forEach((cb) => {
      cb.checked = Array.isArray(filters.evidenceLevel) && filters.evidenceLevel.includes(cb.value);
    });

    // 3. Sincroniza checkboxes de objetivos
    this.container.querySelectorAll('input[data-type="goal"]').forEach((cb) => {
      cb.checked = Array.isArray(filters.goals) && filters.goals.includes(cb.value);
    });

    // 4. Sincroniza valor do slider
    const rangeVal = typeof filters.maxCostPerDose === 'number' ? filters.maxCostPerDose : 5.0;
    const costRangeInput = this.container.querySelector('#input-cost-range');
    if (costRangeInput) {
      costRangeInput.value = String(rangeVal);
    }
    const bubble = this.container.querySelector('#max-cost-bubble');
    if (bubble) {
      bubble.textContent = formatPrice(rangeVal);
    }
  }

  /**
   * Reseta reativamente todos os filtros do painel e atualiza a interface.
   * @returns {void}
   */
  clearFilters() {
    searchState.filters = {
      categories: [],
      evidenceLevel: [],
      goals: [],
      maxCostPerDose: 5.0
    };

    // Sincroniza a interface visível de volta
    this._syncStateToUi();

    // Executa a busca limpa com o estado resetado
    supplementService.search({
      query: searchState.query,
      filters: searchState.filters,
      sortBy: searchState.sortBy
    });
  }

  /**
   * Retorna os filtros ativos em memória.
   * @returns {Object} Filtros ativos.
   */
  getFilters() {
    return { ...searchState.filters };
  }
}

/**
 * Função canônica de inicialização do painel de filtros.
 * @param {string} containerId - Seletor CSS ou ID do container de renderização.
 * @returns {FilterBarController} Instância do controlador do painel.
 */
export function initFilterBar(containerId) {
  return new FilterBarController(containerId);
}
