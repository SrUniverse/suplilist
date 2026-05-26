/**
 * @fileoverview Estado transitório de UI (busca, filtros e ordenação) do SupliList v2.0.
 * Este estado gerencia os filtros ativos e parâmetros de consulta em tempo real,
 * atuando como bridge leve entre os controladores de busca, filtros e ordenação.
 */

export const searchState = {
  /**
   * @type {string}
   */
  query: '',

  /**
   * @type {Object}
   * @property {string[]} [categories]
   * @property {string[]} [goals]
   * @property {number} [maxCostPerDose]
   * @property {string[]} [evidenceLevel]
   */
  filters: {
    categories: [],
    goals: [],
    maxCostPerDose: 5.0, // Preço máximo padrão
    evidenceLevel: []
  },

  /**
   * @type {'cost' | 'evidence' | 'name'}
   */
  sortBy: 'cost'
};
