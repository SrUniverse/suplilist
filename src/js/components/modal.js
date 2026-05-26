/**
 * @fileoverview Componente genérico de sobreposição Modal do SupliList v2.0.
 * Fornece janelas de diálogo centralizadas, com suporte a fechamento reativo por cliques externos/ESC,
 * suporte a elementos HTML e animações de escala.
 */

import { eventBus } from '../core/eventbus.js';

export class Modal {
  /**
   * Construtor da classe de Modais.
   * @param {string} title - O título exibido no cabeçalho do Modal.
   * @param {string | HTMLElement} content - O conteúdo em string HTML ou elemento DOM do corpo.
   */
  constructor(title, content) {
    /**
     * @private
     * @type {string}
     */
    this._title = title;

    /**
     * @private
     * @type {string | HTMLElement}
     */
    this._content = content;

    /**
     * Elemento overlay do Modal no DOM.
     * @private
     * @type {HTMLElement | null}
     */
    this._overlay = null;

    /**
     * Lista de ouvintes registrados para o encerramento do Modal.
     * @private
     * @type {Set<Function>}
     */
    this._closeListeners = new Set();

    /**
     * Referência do handler de ESC para remoção limpa de escuta.
     * @private
     * @type {Function | null}
     */
    this._escHandler = null;
  }

  /**
   * Cria os elementos DOM físicos do Modal e inicia as animações de abertura.
   * @returns {void}
   */
  open() {
    if (typeof document === 'undefined') return;

    // 1. Instancia o overlay fixo de fundo desfocado
    this._overlay = document.createElement('div');
    this._overlay.className = 'fixed inset-0 z-40 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 opacity-0';
    this._overlay.setAttribute('role', 'dialog');
    this._overlay.setAttribute('aria-modal', 'true');

    // 2. Instancia o container central do Modal
    const modalContainer = document.createElement('div');
    modalContainer.className = 'bg-zinc-900 border border-zinc-800/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden transition-all duration-300 transform scale-95 opacity-0 flex flex-col pointer-events-auto';

    // 3. Monta o Header do Modal
    modalContainer.innerHTML = `
      <div class="flex items-center justify-between p-6 border-b border-zinc-800/60">
        <h3 class="text-lg font-bold text-zinc-100">${this._title}</h3>
        <button class="text-zinc-400 hover:text-zinc-100 transition-colors text-2xl font-bold leading-none p-1 focus:outline-none" aria-label="Fechar">&times;</button>
      </div>
      <div class="modal-body p-6 overflow-y-auto max-h-[70vh] text-zinc-300 text-sm leading-relaxed"></div>
    `;

    // 4. Injeta o conteúdo no corpo
    const body = modalContainer.querySelector('.modal-body');
    if (this._content instanceof HTMLElement) {
      body.appendChild(this._content);
    } else {
      body.innerHTML = this._content;
    }

    this._overlay.appendChild(modalContainer);
    document.body.appendChild(this._overlay);

    // 5. Configura ouvintes de fechar no botão e fundo (overlay)
    const closeBtn = modalContainer.querySelector('button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) {
        this.close();
      }
    });

    // 6. Configura ouvinte físico de teclado para tecla ESC
    this._escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);

    // 7. Força transições suaves de escala e opacidade pós-injeção
    requestAnimationFrame(() => {
      if (this._overlay) {
        this._overlay.classList.remove('opacity-0');
        this._overlay.classList.add('opacity-100');
        
        const container = this._overlay.querySelector('.bg-zinc-900');
        if (container) {
          container.classList.remove('scale-95', 'opacity-0');
          container.classList.add('scale-100', 'opacity-100');
        }
      }
    });
  }

  /**
   * Executa a animação de saída e remove completamente os elementos do DOM.
   * Ativa todos os callbacks registrados de finalização.
   * @returns {void}
   */
  close() {
    if (!this._overlay) return;

    // Remove ouvinte de escuta de teclado
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }

    const container = this._overlay.querySelector('.bg-zinc-900');
    if (container) {
      container.classList.remove('scale-100', 'opacity-100');
      container.classList.add('scale-95', 'opacity-0');
    }

    this._overlay.classList.remove('opacity-100');
    this._overlay.classList.add('opacity-0');

    // Desmonta fisicamente do DOM após término da animação síncrona
    this._overlay.addEventListener('transitionend', () => {
      if (this._overlay && this._overlay.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
      }
      this._overlay = null;

      // Executa callbacks de finalização
      this._closeListeners.forEach((listener) => {
        try {
          listener();
        } catch (err) {
          // Captura silenciosa para evitar travamentos
        }
      });
      this._closeListeners.clear();
    }, { once: true });
  }

  /**
   * Registra um callback para ser ativado quando o Modal fechar.
   * @param {Function} callback - O callback de encerramento.
   * @returns {void}
   */
  onClose(callback) {
    if (typeof callback === 'function') {
      this._closeListeners.add(callback);
    }
  }
}
