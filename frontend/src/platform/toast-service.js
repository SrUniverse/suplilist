/**
 * toast-service.js — Sistema de notificações não-intrusivas para o usuário
 *
 * Emite eventos que componentes observam para mostrar toasts na UI.
 * O serviço não renderiza toasts; apenas emite eventos.
 *
 * @module platform/toast-service
 *
 * @example
 * // Componente que observa toasts
 * eventBus.on(EVENTS.TOAST_SHOW, (toast) => {
 *   console.log(toast); // { type: 'error', message: '...', duration: 5000 }
 * });
 *
 * // Usar em qualquer lugar
 * toastService.error('Erro ao salvar');
 * toastService.success('Salvo com sucesso!');
 */

import { eventBus, EVENTS } from '../core/event-bus.js';

export const TOAST_TYPES = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
});

/**
 * @typedef {object} Toast
 * @prop {string} id - Identificador único do toast
 * @prop {string} type - Tipo de toast ('success', 'error', 'warning', 'info')
 * @prop {string} message - Mensagem exibida
 * @prop {number} [duration] - Duração em ms antes de auto-remover (null = infinito)
 * @prop {function} [onAction] - Callback se o usuário clicar em "Ação"
 * @prop {string} [actionLabel] - Label do botão de ação (ex: "Desfazer")
 */

class ToastService {
  #toastQueue = [];
  #maxToasts = 3;
  /** @type {Map<string, number>} Map of toast ID to timeout ID for cleanup */
  #toastTimeouts = new Map();

  /**
   * Emitir um toast
   * @private
   * @param {Toast} toast
   */
  #emit(toast) {
    this.#toastQueue.push(toast);

    // Limitar número de toasts simultâneos
    if (this.#toastQueue.length > this.#maxToasts) {
      this.#toastQueue.shift();
    }

    // Emitir para componentes observarem
    eventBus.emit(EVENTS.TOAST_SHOW, toast);

    // Auto-remover após duração
    if (toast.duration) {
      const timeoutId = setTimeout(() => {
        this.#toastQueue = this.#toastQueue.filter(t => t.id !== toast.id);
        eventBus.emit(EVENTS.TOAST_REMOVE, { id: toast.id });
        this.#toastTimeouts.delete(toast.id);
      }, toast.duration);

      // Store timeout ID for cleanup
      this.#toastTimeouts.set(toast.id, timeoutId);
    }
  }

  /**
   * Mostrar toast de sucesso
   * @param {string} message
   * @param {number} [duration=3000]
   */
  success(message, duration = 3000) {
    this.#emit({
      id: `toast-${Date.now()}`,
      type: TOAST_TYPES.SUCCESS,
      message,
      duration,
    });
  }

  /**
   * Mostrar toast de erro
   * @param {string} message
   * @param {number} [duration=5000]
   * @param {object} [options]
   */
  error(message, duration = 5000, options = {}) {
    this.#emit({
      id: `toast-${Date.now()}`,
      type: TOAST_TYPES.ERROR,
      message,
      duration,
      actionLabel: options.actionLabel || null,
      onAction: options.onAction || null,
    });
  }

  /**
   * Mostrar toast de aviso
   * @param {string} message
   * @param {number} [duration=4000]
   */
  warning(message, duration = 4000) {
    this.#emit({
      id: `toast-${Date.now()}`,
      type: TOAST_TYPES.WARNING,
      message,
      duration,
    });
  }

  /**
   * Mostrar toast informativo
   * @param {string} message
   * @param {number} [duration=3000]
   */
  info(message, duration = 3000) {
    this.#emit({
      id: `toast-${Date.now()}`,
      type: TOAST_TYPES.INFO,
      message,
      duration,
    });
  }

  /**
   * Mostrar toast com ação (ex: desfazer)
   * @param {string} message
   * @param {string} actionLabel
   * @param {() => void} onAction
   * @param {number} [duration=5000]
   */
  action(message, actionLabel, onAction, duration = 5000) {
    this.#emit({
      id: `toast-${Date.now()}`,
      type: TOAST_TYPES.INFO,
      message,
      actionLabel,
      onAction,
      duration,
    });
  }

  /**
   * Limpar todos os toasts
   */
  clear() {
    const ids = [...this.#toastQueue].map(t => t.id);
    this.#toastQueue = [];
    ids.forEach(id => {
      // Clear any pending timeouts
      const timeoutId = this.#toastTimeouts.get(id);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        this.#toastTimeouts.delete(id);
      }
      eventBus.emit(EVENTS.TOAST_REMOVE, { id });
    });
  }

  /**
   * Cleanup method to be called when the toast service is no longer needed.
   * Clears all pending timeouts and toasts.
   *
   * @returns {void}
   */
  cleanup() {
    // Clear all pending timeouts
    this.#toastTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.#toastTimeouts.clear();

    // Clear all toasts
    this.#toastQueue = [];
  }
}

export const toastService = new ToastService();

/**
 * Componente exemplo para renderizar toasts (usar em App ou Layout)
 *
 * @example
 * // Em seu componente raiz (App.js ou main-layout.js):
 * export class ToastContainer {
 *   constructor() {
 *     this.toasts = [];
 *     this.container = null;
 *
 *     eventBus.on('TOAST_SHOW', (toast) => {
 *       this.toasts.push(toast);
 *       this._render();
 *     });
 *
 *     eventBus.on('TOAST_REMOVE', ({ id }) => {
 *       this.toasts = this.toasts.filter(t => t.id !== id);
 *       this._render();
 *     });
 *   }
 *
 *   mount(parentContainer) {
 *     this.container = parentContainer;
 *     this._render();
 *   }
 *
 *   _render() {
 *     if (!this.container) return;
 *     this.container.innerHTML = this.toasts
 *       .map(t => `<div class="toast toast--${t.type}">${t.message}</div>`)
 *       .join('');
 *   }
 * }
 */
