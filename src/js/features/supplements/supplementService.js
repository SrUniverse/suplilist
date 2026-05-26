/**
 * @fileoverview Serviço de domínio contendo a lógica de negócios avançada para Supplements no SupliList v2.0.
 * Fornece métodos integrados para busca facetada reativa, enriquecimento de cards (estoque/favoritos)
 * e estatísticas de topo (rankings).
 */

import { stateManager } from '../../core/state-manager.js';
import { eventBus } from '../../core/eventbus.js';
import { supplementRepo } from './supplementRepo.js';
import { calcDaysLeft } from '../../data/adapters.js';

class SupplementService {
  /**
   * Realiza uma busca facetada completa integrando busca textual por relevância,
   * filtragem avançada AND e ordenação de itens.
   * Persiste a consulta no cache de estado e dispara evento reativo.
   * @param {Object} options - Parâmetros da consulta.
   * @param {string} [options.query=''] - Termo de busca textual.
   * @param {Object} [options.filters={}] - Filtros de categorias, goals, evidência ou custos.
   * @param {'cost' | 'evidence' | 'name'} [options.sortBy='cost'] - Critério de ordenação.
   * @returns {{ results: import('../../types/supplement.schema.js').Supplement[], count: number, query: string, timestamp: number }} Resultado da busca estruturado.
   */
  search({ query = '', filters = {}, sortBy = 'cost' } = {}) {
    // 1. Executa a busca textual por relevância
    const searchResults = supplementRepo.search(query);

    // 2. Aplica a árvore de filtragem AND/OR estruturada
    const filteredResults = supplementRepo.filter(filters, searchResults);

    // 3. Aplica a ordenação cirúrgica dos registros
    const sortedResults = supplementRepo.sort(filteredResults, sortBy);

    const timestamp = Date.now();

    // Persiste os metadados da última query efetuada na árvore de estado global
    try {
      stateManager.setState('lastQuery', {
        text: query,
        filters,
        results: sortedResults.map((r) => r.id),
        timestamp,
      });
    } catch {
      // Ignora falhas menores ao atualizar cache no booting
    }

    // Dispara a reatividade geral de renderização na interface
    eventBus.emit('supplements:filtered', {
      query,
      filters,
      results: sortedResults,
      count: sortedResults.length,
      timestamp
    });

    return {
      results: sortedResults,
      count: sortedResults.length,
      query,
      timestamp,
    };
  }

  /**
   * Obtém as informações completas de um suplemento enriquecido com o status de favorito
   * e dados de controle de estoque do inventário.
   * @param {string} id - O identificador/slug do suplemento.
   * @param {Object} [options={}] - Opções de enriquecimento.
   * @param {boolean} [options.includeFavorite=false] - Se deve conferir se o item é favorito.
   * @param {boolean} [options.includeInventory=false] - Se deve incluir os cálculos de dias em estoque.
   * @returns {{ supplement: import('../../types/supplement.schema.js').Supplement, isFavorite: boolean, stockStatus?: 'in-stock' | 'running-low' | 'out-of-stock', daysLeft?: number | null } | null} Dados consolidados ou null.
   */
  getEnriched(id, options = {}) {
    const supplement = supplementRepo.getById(id);
    if (!supplement) return null;

    const result = {
      supplement,
      isFavorite: false,
    };

    // 1. Resolve o status de Favorito do usuário
    if (options.includeFavorite) {
      const favorites = stateManager.getState('favorites') || [];
      result.isFavorite = favorites.includes(id);
    }

    // 2. Resolve as informações físicas de estoque do Inventário
    if (options.includeInventory) {
      const inventory = stateManager.getState('inventory') || {};
      const invItem = inventory[id];

      if (invItem && typeof invItem.qty === 'number') {
        const daysLeft = calcDaysLeft(invItem.qty, supplement.defaultDose);
        
        result.daysLeft = daysLeft;
        
        if (daysLeft === 0) {
          result.stockStatus = 'out-of-stock';
        } else if (daysLeft <= 7) {
          result.stockStatus = 'running-low';
        } else {
          result.stockStatus = 'in-stock';
        }
      } else {
        result.daysLeft = null;
        result.stockStatus = 'out-of-stock';
      }
    }

    return result;
  }

  /**
   * Obtém a lista dos principais N suplementos sob uma métrica selecionada.
   * @param {'cost' | 'evidence'} metric - Métrica de ranqueamento.
   * @param {number} [limit=5] - Limite máximo de registros a retornar.
   * @returns {import('../../types/supplement.schema.js').Supplement[]} Lista top.
   */
  getTopBy(metric, limit = 5) {
    const supplementsMap = stateManager.getState('supplements') || {};
    const list = Object.values(supplementsMap);

    if (list.length === 0) return [];

    if (metric === 'cost') {
      // Ordena pelos mais baratos (menor custo por dose)
      return supplementRepo.sort(list, 'cost').slice(0, limit);
    }

    if (metric === 'evidence') {
      // Ordena pelos de maior comprovação científica (Nível A)
      return supplementRepo.sort(list, 'evidence').slice(0, limit);
    }

    return list.slice(0, limit);
  }
}

export const supplementService = new SupplementService();
