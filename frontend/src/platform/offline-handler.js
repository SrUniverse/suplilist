/**
 * @fileoverview OfflineHandler — Sensor de conectividade de rede.
 *
 * Responsabilidade única: detectar transições online/offline, atualizar
 * stateManager.ui.isOffline e emitir eventos no EventBus.
 * Não manipula o DOM diretamente — sem side-effects globais visíveis.
 *
 * ── Contrato para componentes de escrita ─────────────────────────────────────
 *
 * Componentes que exibem controles de mutação devem reagir reativamente
 * ao estado de rede via stateManager.subscribe('ui.isOffline', callback).
 * A inscrição DEVE ser destruída no unmount() para evitar memory leaks.
 *
 * Implementação de referência: profile-page.js → _syncOfflineState()
 */
import { syncQueue } from './sync-queue.js';
import { logger } from '../utils/logger.js';

export class OfflineHandler {
  /**
   * @param {import('../state/state-manager.js').StateManager} stateManager
   * @param {import('../core/event-bus.js').EventBus} eventBus
   */
  constructor(stateManager, eventBus) {
    this.stateManager = stateManager;
    this.eventBus = eventBus;
  }

  /**
   * Inicializa os listeners de rede e aplica o estado inicial.
   * @returns {void}
   */
  init() {
    window.addEventListener('online',  () => this._handleOnline());
    window.addEventListener('offline', () => this._handleOffline());

    // Probe inicial: se o dispositivo já está offline ao iniciar, aplica o estado.
    if (!navigator.onLine) {
      this._handleOffline();
    }

    logger.info('[OfflineHandler] Initialized. Network:', navigator.onLine ? 'online' : 'offline');
  }

  // ── Handlers privados ──────────────────────────────────────────────────────

  /**
   * Transição para offline: atualiza estado global e emite evento de UI.
   * @private
   */
  _handleOffline() {
    this.stateManager.dispatch('SET_OFFLINE_MODE', { isOffline: true });
    this.eventBus.emit('ui:offline', { message: 'Modo offline — leitura ativa' });
    logger.warn('[OfflineHandler] Offline detected.');
  }

  /**
   * Transição para online: atualiza estado global e emite evento de UI.
   * Aciona a drenagem da fila de sincronização offline como camada primária (Executor Duplo).
   * @private
   */
  _handleOnline() {
    this.stateManager.dispatch('SET_OFFLINE_MODE', { isOffline: false });
    this.eventBus.emit('ui:online', { message: 'Conexão restaurada' });
    logger.info('[OfflineHandler] Online restored.');
    
    // Executor Duplo (Thread Principal)
    syncQueue.sync().catch(err => {
      logger.error('[OfflineHandler] Failed to sync queue on network restoration:', err);
    });
  }
}
