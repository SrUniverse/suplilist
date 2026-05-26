/**
 * @fileoverview Repositório para gerenciamento do histórico de ciclos de suplementação no SupliList v3.0.
 * Fornece persistência de ciclos de suplementação passados e estatísticas de investimento e adesão.
 * 
 * @author SupliList Team
 * @version 3.0.0
 */

import { stateManager } from '../../core/state-manager.js';
import { eventBus } from '../../core/eventbus.js';
import { logger } from '../../utils/logger.js';
import historyMockData from '../../../data/history-mock.js';

class HistoryRepository {
  constructor() {
    this.init();
  }

  /**
   * Inicializa o repositório carregando os dados do mock se nenhum estado de histórico existir.
   * @returns {void}
   */
  init() {
    const current = stateManager.getState('history');
    if (!current || !current.cycles) {
      // Define o estado inicial a partir dos dados mockados
      stateManager.setState('history', {
        cycles: historyMockData.cycles || [],
        stats: historyMockData.stats || { adherenceAvg: 0, totalCycles: 0, totalInvested: 0 }
      });
    }

    // Ouve o evento de ciclo completado para adicionar novos ciclos reativamente
    eventBus.on('cycle:completed', (payload) => {
      this.addCycle(payload);
    });
  }

  /**
   * Obtém todos os ciclos do histórico.
   * @returns {Array<Object>} Lista de ciclos de suplementação.
   */
  getAllCycles() {
    const history = stateManager.getState('history') || { cycles: [] };
    return history.cycles || [];
  }

  /**
   * Obtém as estatísticas consolidadas do histórico.
   * @returns {{ adherenceAvg: number, totalCycles: number, totalInvested: number }} Estatísticas de adesão e finanças.
   */
  getStats() {
    const history = stateManager.getState('history') || { stats: { adherenceAvg: 0, totalCycles: 0, totalInvested: 0 } };
    return history.stats || { adherenceAvg: 0, totalCycles: 0, totalInvested: 0 };
  }

  /**
   * Adiciona um novo ciclo concluído ao histórico de forma segura e recalcula estatísticas.
   * @param {Object} cycle - Dados do ciclo a ser adicionado.
   * @returns {void}
   */
  addCycle(cycle) {
    if (!cycle) return;

    const history = stateManager.getState('history') || { cycles: [], stats: { adherenceAvg: 0, totalCycles: 0, totalInvested: 0 } };
    const cycles = [...(history.cycles || [])];

    // Gera um id único se não estiver presente
    const newCycle = {
      id: cycle.id || `cycle-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      supplementId: cycle.supplementId || 'generic',
      supplementName: cycle.supplementName || 'Suplemento Sem Nome',
      supplementImage: cycle.supplementImage || 'assets/icons/placeholder.webp',
      category: cycle.category || 'Saúde Geral',
      startDate: cycle.startDate || new Date().toISOString().split('T')[0],
      endDate: cycle.endDate || new Date().toISOString().split('T')[0],
      totalDays: typeof cycle.totalDays === 'number' ? cycle.totalDays : 30,
      adherentDays: typeof cycle.adherentDays === 'number' ? cycle.adherentDays : 30,
      adherencePercent: typeof cycle.adherencePercent === 'number' ? cycle.adherencePercent : 100,
      totalSpent: typeof cycle.totalSpent === 'number' ? cycle.totalSpent : 0
    };

    cycles.unshift(newCycle); // Adiciona ao topo (ciclo mais recente primeiro)

    // Recalcula estatísticas
    const totalCycles = cycles.length;
    const totalInvested = cycles.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const totalAdherencePercent = cycles.reduce((acc, c) => acc + (c.adherencePercent || 0), 0);
    const adherenceAvg = Math.round(totalAdherencePercent / totalCycles);

    const updated = {
      cycles,
      stats: {
        adherenceAvg,
        totalCycles,
        totalInvested
      }
    };

    stateManager.setState('history', updated);
    eventBus.emit('history:updated', updated);
    logger.info(`Novo ciclo adicionado ao histórico: ${newCycle.supplementName}`);
  }
}

export const historyRepo = new HistoryRepository();
