/**
 * @fileoverview Serviço de comparação lado-a-lado para o SupliList v2.0.
 * Compara múltiplos suplementos sob critérios de custo, evidência,
 * dosagens, preços e calcula sinergias/interações medicamentosas conhecidas.
 */

import { supplementRepo } from '../supplements/supplementRepo.js';
import { eventBus } from '../../core/eventbus.js';
import { logger } from '../../utils/logger.js';
import { formatDose, formatPrice } from '../../utils/formatters.js';
import { MAX_COMPARATOR_ITEMS } from '../../utils/constants.js';

class ComparatorService {
  /**
   * Inicializa o ComparatorService com banco de interações conhecidas.
   */
  constructor() {
    /**
     * Lista interna de IDs ativos sendo comparados na UI.
     * @private
     * @type {string[]}
     */
    this._comparatorList = [];

    /**
     * Base de dados hardcoded de interações e sinergias de suplementação.
     * @private
     * @type {Record<string, Array<{ type: 'synergistic' | 'antagonistic' | 'neutral', note: string }>>}
     */
    this._interactionsDb = {
      'cafeina-teanina-creatina-mono': [
        { type: 'synergistic', note: 'Sinergia clássica: a cafeína aumenta o recrutamento de fibras e potência imediata, enquanto a creatina maximiza os estoques de fosfocreatina para ATP celular rápido.' }
      ],
      'magnesio-glicinato-vitamina-d3-k2': [
        { type: 'synergistic', note: 'O magnésio glicinato atua como cofator enzimático crítico para converter a Vitamina D3 em sua forma biologicamente ativa no fígado e rins.' }
      ],
      'cafeina-teanina-l-teanina-po': [
        { type: 'synergistic', note: 'A L-teanina mitiga os efeitos colaterais cardiovasculares da cafeína, removendo tremores e picos de ansiedade, promovendo foco concentrado limpo.' }
      ],
      'creatina-mono-whey-protein': [
        { type: 'synergistic', note: 'A ingestão combinada de creatina com whey protein otimiza a captação celular de creatina estimulada pela elevação da insulina pós-treino.' }
      ]
    };
  }

  /**
   * Realiza a análise comparativa síncrona entre 2 e MAX_COMPARATOR_ITEMS suplementos.
   * @param {string[]} supplementIds - Lista de slugs dos suplementos a comparar.
   * @returns {Object} Resultado estruturado da comparação lado-a-lado (ComparisonResult).
   * @throws {Error} Exceção lançada se a quantidade de itens for inválida ou IDs inexistentes.
   */
  compare(supplementIds) {
    if (!Array.isArray(supplementIds)) {
      throw new Error('ComparatorService: supplementIds deve ser um array válido.');
    }

    const cleanIds = [...new Set(supplementIds.filter(Boolean))];
    if (cleanIds.length < 2 || cleanIds.length > MAX_COMPARATOR_ITEMS) {
      throw new Error(`ComparatorService: A comparação exige entre 2 e ${MAX_COMPARATOR_ITEMS} suplementos.`);
    }

    const supplements = [];
    const missing = [];

    cleanIds.forEach((id) => {
      const supp = supplementRepo.getById(id);
      if (supp) {
        supplements.push(supp);
      } else {
        missing.push(id);
      }
    });

    if (missing.length > 0) {
      throw new Error(`ComparatorService: Os seguintes suplementos não foram encontrados: ${missing.join(', ')}.`);
    }

    // Inicialização da matriz de comparação
    const matrix = {
      costPerDose: [],
      evidenceLevel: [],
      goals: [],
      defaultDose: [],
      cheapestPrice: []
    };

    let cheapestItem = supplements[0];
    let bestEvidenceItem = supplements[0];

    const evidenceLevelMap = { 'A': 1, 'B': 2, 'C': 3 };

    supplements.forEach((supp) => {
      // 1. Popula a matriz com dados estruturados e formatados
      matrix.costPerDose.push(supp.costPerDose);
      matrix.evidenceLevel.push(supp.evidenceLevel);
      matrix.goals.push(supp.goals);
      matrix.defaultDose.push(formatDose(supp.defaultDose, supp.unit));
      
      const activePrices = Object.values(supp.prices).filter((p) => typeof p === 'number' && p > 0);
      const minPrice = activePrices.length > 0 ? Math.min(...activePrices) : 0;
      matrix.cheapestPrice.push(formatPrice(minPrice));

      // 2. Determina o vencedor por menor custo por dose
      if (supp.costPerDose < cheapestItem.costPerDose) {
        cheapestItem = supp;
      }

      // 3. Determina o vencedor por nível de evidência (A > B > C)
      const currentLevel = evidenceLevelMap[supp.evidenceLevel] || 3;
      const bestLevel = evidenceLevelMap[bestEvidenceItem.evidenceLevel] || 3;
      if (currentLevel < bestLevel) {
        bestEvidenceItem = supp;
      }
    });

    // 4. Calcula as interações entre os suplementos par-a-par
    const interactions = [];
    for (let i = 0; i < supplements.length; i++) {
      for (let j = i + 1; j < supplements.length; j++) {
        const rules = this.getInteractions(supplements[i].id, supplements[j].id);
        if (rules.length > 0) {
          interactions.push({
            pair: [supplements[i].name, supplements[j].name],
            rules
          });
        }
      }
    }

    return {
      supplements,
      matrix,
      winners: {
        cost: cheapestItem.id,
        evidence: bestEvidenceItem.id
      },
      interactions
    };
  }

  /**
   * Retorna as interações medicamentosas/sinergias catalogadas entre dois suplementos.
   * @param {string} id1 - Primeiro slug de suplemento.
   * @param {string} id2 - Segundo slug de suplemento.
   * @returns {Array<{ type: string, note: string }>} Lista de regras encontradas.
   */
  getInteractions(id1, id2) {
    if (!id1 || !id2) return [];
    const searchKey = [id1, id2].sort().join('-');
    return this._interactionsDb[searchKey] || [];
  }

  /**
   * Adiciona um suplemento à lista ativa do comparador em memória e notifica a interface.
   * @param {string} supplementId - O slug do suplemento a adicionar.
   * @returns {void}
   */
  addToComparator(supplementId) {
    if (!supplementId || typeof supplementId !== 'string') return;
    
    // Garante que o suplemento existe na base
    const supp = supplementRepo.getById(supplementId);
    if (!supp) {
      logger.warn(`ComparatorService.addToComparator: Suplemento "${supplementId}" inválido.`);
      return;
    }

    if (this._comparatorList.includes(supplementId)) {
      logger.info('Supplement já está na lista do comparador.');
      eventBus.emit('comparator:open', { supplementIds: [...this._comparatorList] });
      return;
    }

    if (this._comparatorList.length >= MAX_COMPARATOR_ITEMS) {
      // FIFO: remove o mais antigo se estourar limite de 4
      this._comparatorList.shift();
    }

    this._comparatorList.push(supplementId);
    eventBus.emit('comparator:open', { supplementIds: [...this._comparatorList] });
  }

  /**
   * Remove um suplemento específico da lista ativa do comparador.
   * @param {string} supplementId - O slug do suplemento a remover.
   * @returns {void}
   */
  removeFromComparator(supplementId) {
    this._comparatorList = this._comparatorList.filter((id) => id !== supplementId);
    eventBus.emit('comparator:open', { supplementIds: [...this._comparatorList] });
  }

  /**
   * Limpa permanentemente a lista ativa de comparação.
   * @returns {void}
   */
  clearComparator() {
    this._comparatorList = [];
    eventBus.emit('comparator:open', { supplementIds: [] });
  }
}

export const comparatorService = new ComparatorService();
