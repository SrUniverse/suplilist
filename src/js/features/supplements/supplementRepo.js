/**
 * @fileoverview Repositório central de dados para Supplements no SupliList v2.0.
 * Responsável pelo carregamento, busca, filtragem e ordenação de suplementos,
 * além do sincronismo com o estado global e cache.
 */

import { logger } from '../../utils/logger.js';
import { SupplementSchema } from '../../types/supplement.schema.js';
import { stateManager } from '../../core/state-manager.js';
import { eventBus } from '../../core/eventbus.js';
import { supplementCache } from './supplementCache.js';
import { getRawSupplements, getRawLinks } from '../../data/adapters.js';

class SupplementRepository {
  /**
   * Inicializa o repositório.
   */
  constructor() {
    /**
     * @private
     * @type {string}
     */
    this._cacheKey = 'supplements:all';
  }

  /**
   * Carrega todos os suplementos da fonte bruta (adapters), realiza a validação do schema,
   * enriquece com links, atualiza o estado global, salva no cache e emite o evento de sucesso.
   * @returns {Promise<Record<string, import('../../types/supplement.schema.js').Supplement>>} Mapa indexado por slug.
   */
  async loadAll() {
    if (supplementCache.has(this._cacheKey)) {
      logger.info('Carregando base de suplementos a partir do cache síncrono.');
      return supplementCache.get(this._cacheKey);
    }

    logger.info('Carregando e normalizando base de suplementos legada...');
    
    const rawSupplements = getRawSupplements();
    const rawLinks = getRawLinks();
    const normalizedSupplements = {};

    Object.entries(rawSupplements).forEach(([slug, supp]) => {
      try {
        // Enriquece o objeto com os links de marketplace correspondentes
        const enrichedSupp = {
          ...supp,
          links: rawLinks[slug] || {
            shopee: `https://shopee.com.br/search?keyword=${encodeURIComponent(supp.name)}`,
            mercadolivre: `https://lista.mercadolivre.com.br/${encodeURIComponent(supp.name.replace(/\s+/g, '+'))}`,
            amazon: `https://www.amazon.com.br/s?k=${encodeURIComponent(supp.name)}`
          }
        };

        // Valida contra o schema formal de integridade
        const validation = SupplementSchema.validate(enrichedSupp);
        if (validation.isValid) {
          normalizedSupplements[slug] = validation.data;
        } else {
          logger.warn(`SupplementRepository: Suplemento "${slug}" inválido nos schemas de v2.0. Pulando.`, validation.errors);
        }
      } catch (err) {
        logger.warn(`SupplementRepository: Falha ao validar e enriquecer suplemento "${slug}":`, err.message);
      }
    });

    // Registra o dicionário completo no estado e no cache de dados
    stateManager.setState('supplements', normalizedSupplements);
    supplementCache.set(this._cacheKey, normalizedSupplements);

    // Emite o evento reativo correspondente
    eventBus.emit('supplements:loaded', {
      supplements: Object.values(normalizedSupplements),
      count: Object.keys(normalizedSupplements).length,
      timestamp: Date.now()
    });

    return normalizedSupplements;
  }

  /**
   * Busca um suplemento pelo seu ID (slug) no estado global.
   * @param {string} id - O slug do suplemento (ex: "creatina-mono").
   * @returns {import('../../types/supplement.schema.js').Supplement | null} Suplemento ou null se não encontrado.
   */
  getById(id) {
    if (!id) return null;
    const supplements = stateManager.getState('supplements') || {};
    return supplements[id] || null;
  }

  /**
   * Retorna a lista completa de todos os suplementos cadastrados no sistema.
   * @returns {import('../../types/supplement.schema.js').Supplement[]} Lista de todos os suplementos.
   */
  getAll() {
    const supplements = stateManager.getState('supplements') || {};
    return Object.values(supplements);
  }

  /**
   * Pesquisa suplementos baseando-se em termos case-insensitive nas propriedades textuais chaves.
   * Retorna os resultados ordenados por relevância do termo.
   * @param {string} query - O termo de pesquisa.
   * @returns {import('../../types/supplement.schema.js').Supplement[]} Lista de suplementos correspondentes.
   */
  search(query) {
    const supplementsMap = stateManager.getState('supplements') || {};
    const list = Object.values(supplementsMap);

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return list;
    }

    const cleanQuery = query.toLowerCase().trim();

    // Filtra e pontua a relevância para ordenação inteligente
    const scored = list
      .map((item) => {
        let score = 0;
        const nameLower = item.name.toLowerCase();
        const mechLower = item.mechanism.toLowerCase();
        const catLower = item.category.toLowerCase();

        if (nameLower === cleanQuery) {
          score += 100; // Match exato no nome
        } else if (nameLower.startsWith(cleanQuery)) {
          score += 50;  // Prefixo do nome
        } else if (nameLower.includes(cleanQuery)) {
          score += 20;  // Contido no nome
        }

        if (mechLower.includes(cleanQuery)) {
          score += 10;  // Contido no mecanismo de ação
        }

        if (catLower.includes(cleanQuery)) {
          score += 5;   // Contido na categoria
        }

        return { item, score };
      })
      .filter((entry) => entry.score > 0);

    // Ordena decrescente por relevância e desempatando pelo nome alfabeticamente
    return scored
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .map((entry) => entry.item);
  }

  /**
   * Filtra uma lista de suplementos baseando-se nos critérios fornecidos.
   * @param {Object} filters - Critérios de filtro.
   * @param {string[]} [filters.categories] - Categorias aceitas (OR).
   * @param {string[]} [filters.goals] - Objetivos que o item DEVE conter (AND).
   * @param {number} [filters.maxCostPerDose] - Custo por dose máximo permitido.
   * @param {string[]} [filters.evidenceLevel] - Níveis de evidência aceitos (OR).
   * @param {import('../../types/supplement.schema.js').Supplement[]} [inputList] - Lista opcional de entrada a ser filtrada (padrão: todos do estado).
   * @returns {import('../../types/supplement.schema.js').Supplement[]} Lista filtrada.
   */
  filter(filters, inputList) {
    const list = Array.isArray(inputList) 
      ? inputList 
      : Object.values(stateManager.getState('supplements') || {});

    if (!filters || typeof filters !== 'object') {
      return list;
    }

    return list.filter((item) => {
      // 1. Filtro por Categoria (OR)
      if (Array.isArray(filters.categories) && filters.categories.length > 0) {
        if (!filters.categories.includes(item.category)) {
          return false;
        }
      }

      // 2. Filtro por Nível de Evidência (OR)
      if (Array.isArray(filters.evidenceLevel) && filters.evidenceLevel.length > 0) {
        if (!filters.evidenceLevel.includes(item.evidenceLevel)) {
          return false;
        }
      }

      // 3. Filtro por Objetivos Terapêuticos (AND - deve satisfazer todos)
      if (Array.isArray(filters.goals) && filters.goals.length > 0) {
        const hasAllGoals = filters.goals.every((g) => item.goals.includes(g));
        if (!hasAllGoals) {
          return false;
        }
      }

      // 4. Filtro por Custo por Dose Máximo
      if (typeof filters.maxCostPerDose === 'number' && filters.maxCostPerDose > 0) {
        if (item.costPerDose > filters.maxCostPerDose) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Ordena cirurgicamente uma coleção de suplementos sob um critério.
   * @param {import('../../types/supplement.schema.js').Supplement[]} supplements - Coleção a ser ordenada.
   * @param {'cost' | 'evidence' | 'name'} sortBy - Critério de ordenação.
   * @returns {import('../../types/supplement.schema.js').Supplement[]} Nova coleção de suplementos ordenada.
   */
  sort(supplements, sortBy) {
    if (!Array.isArray(supplements)) return [];
    const listCopy = [...supplements];

    if (sortBy === 'cost') {
      // Menor custo por dose primeiro
      return listCopy.sort((a, b) => a.costPerDose - b.costPerDose || a.name.localeCompare(b.name));
    }

    if (sortBy === 'evidence') {
      // Evidência mais forte (A > B > C)
      const levelMap = { 'A': 1, 'B': 2, 'C': 3 };
      return listCopy.sort((a, b) => {
        const levelA = levelMap[a.evidenceLevel] || 3;
        const levelB = levelMap[b.evidenceLevel] || 3;
        return levelA - levelB || a.costPerDose - b.costPerDose || a.name.localeCompare(b.name);
      });
    }

    if (sortBy === 'name') {
      // Ordem alfabética ascendente do nome comercial
      return listCopy.sort((a, b) => a.name.localeCompare(b.name));
    }

    return listCopy;
  }

  /**
   * Invalida e limpa os dados síncronos cacheados do repositório.
   * @returns {void}
   */
  invalidateCache() {
    supplementCache.invalidate(this._cacheKey);
    logger.info('Cache do SupplementRepository invalidado com sucesso.');
  }
}

export const supplementRepo = new SupplementRepository();
