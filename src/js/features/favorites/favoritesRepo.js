/**
 * @fileoverview Repositório para gerenciamento de suplementos favoritos no SupliList v2.0.
 * Oferece métodos CRUD idempotentes para favoritos, persistência, exportação e importação.
 */

import { stateManager } from '../../core/state-manager.js';
import { eventBus } from '../../core/eventbus.js';
import { logger } from '../../utils/logger.js';
import { supplementRepo } from '../supplements/supplementRepo.js';
import { parseJSON } from '../../utils/parsers.js';

class FavoritesRepository {
  /**
   * Adiciona um suplemento aos favoritos do usuário de forma segura e idempotente.
   * @param {string} supplementId - O slug do suplemento a ser adicionado.
   * @returns {void}
   */
  add(supplementId) {
    if (!supplementId || typeof supplementId !== 'string') return;

    // 1. Verifica se o suplemento existe no repositório geral de dados
    const supplement = supplementRepo.getById(supplementId);
    if (!supplement) {
      logger.warn(`FavoritesRepository.add: Suplemento "${supplementId}" não existe na base de dados.`);
      return;
    }

    const current = stateManager.getState('favorites') || [];
    
    // 2. Garante a idempotência
    if (current.includes(supplementId)) return;

    const updated = [...current, supplementId];
    stateManager.setState('favorites', updated);

    // Emite o evento específico com os dados adequados ao schema
    eventBus.emit('favorite:toggled', { supplementId, isFavorite: true });
    eventBus.emit('favorites:updated', { favorites: this.getAll() });
  }

  /**
   * Remove um suplemento dos favoritos do usuário.
   * @param {string} supplementId - O slug do suplemento a ser removido.
   * @returns {void}
   */
  remove(supplementId) {
    if (!supplementId || typeof supplementId !== 'string') return;

    const current = stateManager.getState('favorites') || [];
    if (!current.includes(supplementId)) return;

    const updated = current.filter((id) => id !== supplementId);
    stateManager.setState('favorites', updated);

    eventBus.emit('favorite:toggled', { supplementId, isFavorite: false });
    eventBus.emit('favorites:updated', { favorites: this.getAll() });
  }

  /**
   * Alterna (liga/desliga) o status de favorito de um suplemento específico.
   * @param {string} supplementId - O slug do suplemento a ser alternado.
   * @returns {boolean} Novo status de favorito (true se favoritado, false se removido).
   */
  toggle(supplementId) {
    const isFav = this.isFavorite(supplementId);
    if (isFav) {
      this.remove(supplementId);
      return false;
    } else {
      this.add(supplementId);
      return true;
    }
  }

  /**
   * Verifica se um suplemento específico está nos favoritos do usuário.
   * @param {string} supplementId - O slug de busca.
   * @returns {boolean} True se favoritado, false caso contrário.
   */
  isFavorite(supplementId) {
    if (!supplementId) return false;
    const current = stateManager.getState('favorites') || [];
    return current.includes(supplementId);
  }

  /**
   * Obtém a coleção de objetos completos dos suplementos favoritados pelo usuário.
   * @returns {import('../../types/supplement.schema.js').Supplement[]} Lista de suplementos favoritos válidos.
   */
  getAll() {
    const current = stateManager.getState('favorites') || [];
    return current
      .map((id) => supplementRepo.getById(id))
      .filter((item) => item !== null && item !== undefined);
  }

  /**
   * Exporta a lista de favoritos ativa do usuário em formato de string JSON.
   * @returns {string} Dados serializados para exportação.
   */
  export() {
    const favorites = stateManager.getState('favorites') || [];
    return JSON.stringify({
      version: '2.0',
      favorites,
      exportedAt: Date.now()
    });
  }

  /**
   * Importa de forma segura favoritos a partir de uma string JSON, pulando IDs inválidos.
   * @param {string} jsonString - Dados brutos da importação.
   * @returns {{ imported: number, skipped: number }} Quantidade de itens processados.
   */
  import(jsonString) {
    const parsed = parseJSON(jsonString);
    if (!parsed || !Array.isArray(parsed.favorites)) {
      logger.warn('FavoritesRepository.import: Formato de importação inválido.');
      return { imported: 0, skipped: 0 };
    }

    let imported = 0;
    let skipped = 0;
    const current = stateManager.getState('favorites') || [];
    const updated = [...current];

    parsed.favorites.forEach((id) => {
      if (typeof id !== 'string') {
        skipped++;
        return;
      }
      
      const supplement = supplementRepo.getById(id);
      if (supplement && !updated.includes(id)) {
        updated.push(id);
        imported++;
      } else {
        skipped++;
      }
    });

    if (imported > 0) {
      stateManager.setState('favorites', updated);
      eventBus.emit('favorites:updated', { favorites: this.getAll() });
    }

    return { imported, skipped };
  }
}

export const favoritesRepo = new FavoritesRepository();
