/**
 * @fileoverview Componente reativo e rico de notificações Toast do SupliList v2.0.
 * Suporta múltiplos tipos de avisos, limite síncrono FIFO de exibição e animações aceleradas de transição.
 */

import { eventBus } from '../core/eventbus.js';
import { logger } from '../utils/logger.js';

class Toast {
  /**
   * Construtor da classe de Toasts.
   */
  constructor() {
    /**
     * Dicionário ativo de Toasts atualmente em exibição na interface.
     * @type {Map<string, HTMLElement>}
     */
    this.activeToasts = new Map();

    /**
     * Elemento container fixo injetado na árvore do DOM.
     * @type {HTMLElement}
     */
    this.container = this._createContainer();

    // HIGH-02: o handler agora gera o ID internamente se o emitente não fornecer um,
    // evitando o caso em que this.activeToasts.has(undefined) é sempre true
    // e potencialmente causaria toasts duplicados em loop.
    eventBus.on('toast:show', (payload) => {
      if (payload && payload.message) {
        const id = payload.id || `toast_${Math.random().toString(36).substring(2, 11)}`;
        if (!this.activeToasts.has(id)) {
          this._renderToast(payload.message, payload.type || 'info', payload.duration ?? 3000, id);
        }
      }
    });
  }

  /**
   * Cria o elemento container das notificações no DOM se este não existir.
   * @private
   * @returns {HTMLElement} O elemento de container dos toasts.
   */
  _createContainer() {
    if (typeof document === 'undefined') return null;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none select-none';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Dispara a exibição de uma notificação Toast na tela de forma programática.
   * @param {string} message - A mensagem de corpo da notificação.
   * @param {'success' | 'warning' | 'danger' | 'info'} [type='info'] - A tipagem visual do aviso.
   * @param {number} [duration=3000] - Tempo em milissegundos antes de auto-dispensar.
   * @returns {string} O ID exclusivo gerado para identificação do Toast.
   */
  show(message, type = 'info', duration = 3000) {
    const id = `toast_${Math.random().toString(36).substring(2, 11)}`;

    // Emite no barramento Pub/Sub para sincronizar com ouvintes globais e schemas
    eventBus.emit('toast:show', {
      message,
      type,
      duration,
      id,
    });

    return id;
  }

  /**
   * Renderiza fisicamente o elemento do toast no container de exibição do DOM.
   * @private
   * @param {string} message - A mensagem.
   * @param {string} type - Tipo.
   * @param {number} duration - Tempo.
   * @param {string} id - Identificador exclusivo.
   * @returns {void}
   */
  _renderToast(message, type, duration, id) {
    if (!this.container) return;

    // Respeita limite máximo de 3 Toasts simultâneos na tela (Fila FIFO)
    if (this.activeToasts.size >= 3) {
      const oldestId = this.activeToasts.keys().next().value;
      if (oldestId) this.dismiss(oldestId);
    }

    const toastElement = document.createElement('div');
    toastElement.className = `flex items-center justify-between gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-md pointer-events-auto border min-w-[280px] max-w-sm transition-all duration-300 transform translate-x-12 opacity-0 ${this._getTypeStyles(type)}`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('data-toast-id', id);

    const icon = this._getTypeIcon(type);

    toastElement.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-lg flex-shrink-0">${icon}</span>
        <p class="text-sm font-medium leading-tight">${message}</p>
      </div>
      <button class="text-current opacity-60 hover:opacity-100 transition-opacity font-bold text-xs p-1 focus:outline-none" aria-label="Fechar">&times;</button>
    `;

    // Handler de clique do botão fechar (X)
    const closeBtn = toastElement.querySelector('button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismiss(id));
    }

    this.container.appendChild(toastElement);
    this.activeToasts.set(id, toastElement);

    // Efeito suave de entrada (slide-in) pós-frame inicial
    requestAnimationFrame(() => {
      toastElement.classList.remove('translate-x-12', 'opacity-0');
      toastElement.classList.add('translate-x-0', 'opacity-100');
    });

    // Agenda auto-dismiss por tempo esgotado
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  /**
   * Remove de forma animada um Toast ativo através de seu ID identificador.
   * @param {string} toastId - O identificador do Toast.
   * @returns {void}
   */
  dismiss(toastId) {
    const el = this.activeToasts.get(toastId);
    if (!el) return;

    // Efeito suave de saída (fade-out e redução de escala)
    el.classList.remove('translate-x-0', 'opacity-100');
    el.classList.add('translate-x-4', 'opacity-0', 'scale-95');

    // Remove do DOM físico após a animação de saída concluir
    el.addEventListener('transitionend', () => {
      try {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      } catch (err) {
        logger.debug('Falha silenciosa ao remover toast do DOM:', err.message);
      }
      this.activeToasts.delete(toastId);
      
      // Sincroniza o barramento Pub/Sub sobre a dispensa do Toast
      eventBus.emit('toast:dismiss', { id: toastId });
    }, { once: true });
  }

  /**
   * Remove simultaneamente todas as notificações ativas no container.
   * @returns {void}
   */
  dismissAll() {
    this.activeToasts.forEach((_, id) => this.dismiss(id));
  }

  /**
   * Traduz o tipo de notificação em estilos Tailwind customizados de design premium.
   * @private
   * @param {string} type - Tipo de toast.
   * @returns {string} Classes css Tailwind correspondentes ao tipo.
   */
  _getTypeStyles(type) {
    const styles = {
      success: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200',
      warning: 'bg-amber-950/80 border-amber-500/30 text-amber-200',
      danger: 'bg-red-950/80 border-red-500/30 text-red-200',
      info: 'bg-sky-950/80 border-sky-500/30 text-sky-200',
    };
    return styles[type] || styles.info;
  }

  /**
   * Obtém o emoji representativo para cada nível de notificação.
   * @private
   * @param {string} type - Tipo de toast.
   * @returns {string} Emojis correspondentes.
   */
  _getTypeIcon(type) {
    const icons = {
      success: '✅',
      warning: '⚠️',
      danger: '❌',
      info: 'ℹ️',
    };
    return icons[type] || icons.info;
  }
}

export const toast = new Toast();
