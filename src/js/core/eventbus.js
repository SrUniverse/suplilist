/**
 * @fileoverview Coração da reatividade do SupliList v2.0.
 * Implementa o padrão Pub/Sub (EventBus) desacoplado para comunicação entre componentes e serviços,
 * com rastreabilidade de histórico e tolerância de falhas.
 */

import { logger } from '../utils/logger.js';

class EventBus {
  /**
   * Construtor do barramento de eventos.
   */
  constructor() {
    /**
     * Mapa de assinantes por tipo de evento.
     * @private
     * @type {Map<string, Set<Function>>}
     */
    this.subscribers = new Map();

    /**
     * Histórico de eventos recentes (limite de 100).
     * @private
     * @type {Array<{ eventType: string, payload: any, timestamp: number }>}
     */
    this.history = [];

    /**
     * Limite de tamanho do histórico.
     * @private
     * @type {number}
     */
    this._maxHistorySize = 100;
  }

  /**
   * Registra um ouvinte para um tipo específico de evento.
   * @param {string} eventType - Nome do evento.
   * @param {Function} handler - Função callback executada ao emitir o evento.
   * @returns {() => void} Função de desinscrição (unsubscribe) segura.
   */
  on(eventType, handler) {
    if (typeof eventType !== 'string' || !eventType.trim()) {
      logger.warn('EventBus.on: eventType deve ser uma string não-vazia.');
      return () => {};
    }
    if (typeof handler !== 'function') {
      logger.warn('EventBus.on: handler deve ser uma função.');
      return () => {};
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(handler);

    return () => this.off(eventType, handler);
  }

  /**
   * Remove a inscrição de um ouvinte para um tipo de evento.
   * @param {string} eventType - Nome do evento.
   * @param {Function} handler - Referência do callback a ser removido.
   * @returns {void}
   */
  off(eventType, handler) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).delete(handler);
    }
  }

  /**
   * Emite um evento para todos os ouvintes registrados.
   * @param {string} eventType - Nome do evento a ser disparado.
   * @param {any} payload - Dados transmitidos para os ouvintes do evento.
   * @returns {void}
   */
  emit(eventType, payload) {
    if (typeof eventType !== 'string' || !eventType.trim()) {
      logger.error('EventBus.emit: eventType inválido (deve ser string não-vazia).');
      return;
    }

    // Registra no histórico com controle FIFO de capacidade
    this.history.push({ eventType, payload, timestamp: Date.now() });
    if (this.history.length > this._maxHistorySize) {
      this.history.shift();
    }

    const handlers = this.subscribers.get(eventType);
    if (!handlers || handlers.size === 0) return;

    // Dispara cada um dos handlers em ambiente controlado
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        logger.error(`Falha no manipulador do evento "${eventType}":`, err);

        // Previne loops infinitos se falhar dentro do próprio fluxo de erro do sistema
        if (eventType !== 'error:system') {
          this.emit('error:system', {
            originalEvent: eventType,
            payload: payload,
            error: err.message,
            stack: err.stack,
          });
        }
      }
    });
  }

  /**
   * Obtém o histórico de eventos recentes do barramento.
   * @param {string} [eventType] - Nome opcional do evento para filtragem rápida.
   * @returns {Array<{ eventType: string, payload: any, timestamp: number }>} Lista de logs.
   */
  getHistory(eventType) {
    if (eventType) {
      return this.history.filter((item) => item.eventType === eventType);
    }
    return [...this.history];
  }

  /**
   * Limpa permanentemente o histórico de eventos do barramento.
   * @returns {void}
   */
  clearHistory() {
    this.history = [];
  }
}

export const eventBus = new EventBus();

/*
======================================================================
TESTES INLINE PARA VALIDAÇÃO MANUAL NO CONSOLE / AMBIENTE DEV:
======================================================================
// const unsub = eventBus.on('test', (p) => console.log('Recebido:', p));
// eventBus.emit('test', { msg: 'hello' }); // Console exibe: Recebido: { msg: 'hello' }
// unsub();
// eventBus.emit('test', { msg: 'world' }); // Silencioso — não deve aparecer nada.
======================================================================
*/
