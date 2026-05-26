/**
 * @fileoverview Repositório de gerenciamento de controle de estoque e inventário do SupliList v2.0.
 * Calcula dias de consumo restante, projeta data de esgotamento e emite alertas urgentes.
 */

import { stateManager } from '../../core/state-manager.js';
import { eventBus } from '../../core/eventbus.js';
import { supplementRepo } from '../supplements/supplementRepo.js';
import { logger } from '../../utils/logger.js';
import { INVENTORY_URGENT_DAYS } from '../../utils/constants.js';
import { calcDaysLeft, calcEndDate } from '../../data/adapters.js';

class InventoryRepository {
  /**
   * Adiciona ou atualiza a quantidade física em estoque de um determinado suplemento.
   * Dispara notificações de atualização e alertas urgentes de reposição se necessário.
   * @param {string} supplementId - O slug do suplemento.
   * @param {number} qty - A nova quantidade física em estoque.
   * @returns {void}
   */
  update(supplementId, qty) {
    if (!supplementId || typeof qty !== 'number' || qty < 0) {
      logger.error('InventoryRepository.update: Parâmetros de entrada inválidos.', { supplementId, qty });
      return;
    }

    // 1. Verifica se o suplemento existe na base de dados ativa
    const supplement = supplementRepo.getById(supplementId);
    if (!supplement) {
      logger.warn(`InventoryRepository.update: Suplemento "${supplementId}" não cadastrado no sistema.`);
      return;
    }

    const purchaseDate = new Date().toISOString().split('T')[0];

    // 2. Atualiza a árvore de estado de forma imutável e estruturada
    const inventory = stateManager.getState('inventory') || {};
    const updated = {
      ...inventory,
      [supplementId]: {
        qty,
        purchaseDate,
      },
    };
    stateManager.setState('inventory', updated);

    // 3. Emite o sinal reativo de atualização de estoque
    eventBus.emit('inventory:updated', {
      supplementId,
      qty,
      purchaseDate,
    });

    // 4. Verifica criticidade do estoque e emite alerta de reposição
    const daysLeft = this.getDaysLeft(supplementId);
    if (daysLeft !== null && daysLeft <= INVENTORY_URGENT_DAYS) {
      eventBus.emit('inventory:urgent', {
        supplements: [{ id: supplementId, daysLeft }],
      });
    }
  }

  /**
   * Recupera a quantidade atual em estoque de um suplemento.
   * @param {string} supplementId - O slug do suplemento.
   * @returns {number | null} A quantidade em estoque ou null se não for monitorado.
   */
  getQty(supplementId) {
    const inventory = stateManager.getState('inventory') || {};
    const item = inventory[supplementId];
    return item ? item.qty : null;
  }

  /**
   * Calcula quantos dias restantes o estoque suportará sob a dosagem padrão recomendada.
   * @param {string} supplementId - O slug do suplemento.
   * @returns {number | null} Quantidade de dias restantes ou null se não monitorado.
   */
  getDaysLeft(supplementId) {
    const qty = this.getQty(supplementId);
    if (qty === null) return null;

    const supplement = supplementRepo.getById(supplementId);
    if (!supplement) return null;

    return calcDaysLeft(qty, supplement.defaultDose);
  }

  /**
   * Calcula a data estimada de esgotamento total do estoque atual.
   * @param {string} supplementId - O slug do suplemento.
   * @returns {Date | null} Objeto Date contendo o dia do esgotamento ou null.
   */
  getEndOfStockDate(supplementId) {
    const inventory = stateManager.getState('inventory') || {};
    const item = inventory[supplementId];
    if (!item) return null;

    const daysLeft = this.getDaysLeft(supplementId);
    if (daysLeft === null) return null;

    return calcEndDate(item.purchaseDate, daysLeft);
  }

  /**
   * Verifica se há itens ativos com estoque crítico ou esgotado (dias restantes <= INVENTORY_URGENT_DAYS).
   * @returns {{ items: Array<{ supplementId: string, daysLeft: number }>, hasUrgent: boolean }} Relatório de urgência.
   */
  checkUrgent() {
    const inventory = stateManager.getState('inventory') || {};
    const items = [];

    Object.keys(inventory).forEach((id) => {
      const daysLeft = this.getDaysLeft(id);
      if (daysLeft !== null && daysLeft <= INVENTORY_URGENT_DAYS) {
        items.push({ supplementId: id, daysLeft });
      }
    });

    return {
      items,
      hasUrgent: items.length > 0,
    };
  }

  /**
   * Obtém a lista completa do inventário devidamente mapeada e enriquecida com os objetos de suplemento.
   * @returns {Record<string, { qty: number, purchaseDate: string, daysLeft: number | null, supplement: import('../../types/supplement.schema.js').Supplement }>} Inventário completo.
   */
  getAll() {
    const inventory = stateManager.getState('inventory') || {};
    const enriched = {};

    Object.entries(inventory).forEach(([id, item]) => {
      const supplement = supplementRepo.getById(id);
      if (supplement) {
        enriched[id] = {
          qty: item.qty,
          purchaseDate: item.purchaseDate,
          daysLeft: this.getDaysLeft(id),
          supplement,
        };
      }
    });

    return enriched;
  }

  /**
   * Remove permanentemente um suplemento do monitoramento de estoque de inventário.
   * @param {string} supplementId - O slug do suplemento.
   * @returns {void}
   */
  remove(supplementId) {
    if (!supplementId) return;

    const inventory = stateManager.getState('inventory') || {};
    if (!inventory[supplementId]) return;

    const updated = { ...inventory };
    delete updated[supplementId];
    stateManager.setState('inventory', updated);

    // Emite sinal reativo de atualização com quantidade zerada
    eventBus.emit('inventory:updated', {
      supplementId,
      qty: 0,
      purchaseDate: '',
    });
  }
}

export const inventoryRepo = new InventoryRepository();
