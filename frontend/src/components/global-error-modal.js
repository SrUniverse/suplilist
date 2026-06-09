/**
 * global-error-modal.js — Global Error Modal Component
 *
 * Displays critical errors in a modal overlay (404, 500, network down).
 * Listens to ERROR_CRITICAL events from eventBus.
 * Auto-dismisses after 10 seconds if no action taken.
 *
 * @module components/global-error-modal
 */

import { eventBus, EVENTS } from '../core/event-bus.js';
import { logger } from '../utils/logger.js';
import { escapeHtml } from '../utils/escape.js';

export class GlobalErrorModal {
  constructor() {
    this.isOpen = false;
    this.currentError = null;
    this.autoDismissTimeout = null;
    this._isMounted = false;
    this._listeners = new Map();
    this._unsubscribeFns = [];
  }

  /**
   * Mount the modal and listen for ERROR_CRITICAL events
   */
  mount() {
    this._isMounted = true;

    // Listen for critical errors
    const unsubscribe = eventBus.on(EVENTS.ERROR_CRITICAL, (payload) => {
      this.showError(payload);
    });
    this._unsubscribeFns.push(unsubscribe);

    logger.debug('[GlobalErrorModal] Mounted and listening for critical errors');
  }

  /**
   * Unmount and cleanup
   */
  unmount() {
    this._isMounted = false;
    this._clearResources();
    this.close();
  }

  /**
   * Cleanup resources
   * @private
   */
  _clearResources() {
    // Clear timers
    if (this.autoDismissTimeout) {
      clearTimeout(this.autoDismissTimeout);
      this.autoDismissTimeout = null;
    }

    // Remove event listeners
    for (const [element, { type, handler }] of this._listeners.entries()) {
      try {
        element.removeEventListener(type, handler);
      } catch (e) {
        // Ignore
      }
    }
    this._listeners.clear();

    // Unsubscribe from eventBus
    this._unsubscribeFns.forEach(fn => fn());
    this._unsubscribeFns = [];
  }

  /**
   * Show an error in the modal
   *
   * @param {object} errorPayload
   * @param {string} errorPayload.code - Error code (404, 500, etc.)
   * @param {string} errorPayload.message - Error message
   * @param {string} [errorPayload.traceId] - Tracking ID for support
   * @param {number} [errorPayload.timestamp] - Error timestamp
   */
  showError(errorPayload) {
    if (!this._isMounted) return;

    this.currentError = {
      code: errorPayload.code || 'UNKNOWN',
      message: escapeHtml(errorPayload.message || 'Erro desconhecido'),
      traceId: errorPayload.traceId || null,
      timestamp: errorPayload.timestamp || Date.now(),
    };

    logger.debug('[GlobalErrorModal] Showing error:', this.currentError);

    this._renderModal();
    this.isOpen = true;

    // Auto-dismiss after 10 seconds if no action
    this._scheduleAutoDismiss();
  }

  /**
   * Schedule auto-dismiss after 10 seconds
   * @private
   */
  _scheduleAutoDismiss() {
    if (this.autoDismissTimeout) {
      clearTimeout(this.autoDismissTimeout);
    }

    this.autoDismissTimeout = setTimeout(() => {
      if (this.isOpen) {
        this.close();
      }
    }, 10000);
  }

  /**
   * Cancel auto-dismiss
   * @private
   */
  _cancelAutoDismiss() {
    if (this.autoDismissTimeout) {
      clearTimeout(this.autoDismissTimeout);
      this.autoDismissTimeout = null;
    }
  }

  /**
   * Render the modal UI
   * @private
   */
  _renderModal() {
    // Create modal overlay
    let modal = document.querySelector('#global-error-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'global-error-modal';
      document.body.appendChild(modal);
    }

    const error = this.currentError;
    const timestamp = new Date(error.timestamp).toLocaleTimeString('pt-BR');

    modal.innerHTML = `
      <div class="error-modal-overlay">
        <div class="error-modal-dialog">
          <div class="error-modal-header">
            <h2 class="error-modal-title">Erro ${error.code}</h2>
            <button id="error-modal-close" class="error-modal-close" aria-label="Fechar">×</button>
          </div>

          <div class="error-modal-body">
            <p class="error-modal-message">${error.message}</p>
            <p class="error-modal-timestamp">
              ${timestamp}
              ${error.traceId ? `<br/><small>ID: <code>${error.traceId}</code></small>` : ''}
            </p>
          </div>

          <div class="error-modal-actions">
            <button id="error-modal-retry" class="error-modal-btn error-modal-btn-primary">
              Tentar novamente
            </button>
            <button id="error-modal-home" class="error-modal-btn error-modal-btn-secondary">
              Ir para início
            </button>
            <button id="error-modal-contact" class="error-modal-btn error-modal-btn-tertiary">
              Contato
            </button>
          </div>
        </div>
      </div>
    `;

    this._attachListeners(modal);
  }

  /**
   * Attach event listeners to modal
   * @private
   */
  _attachListeners(modal) {
    // Cancel auto-dismiss when user interacts
    const closeHandler = () => {
      this._cancelAutoDismiss();
      this.close();
    };

    const closeBtn = modal.querySelector('#error-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeHandler);
      this._listeners.set(closeBtn, { type: 'click', handler: closeHandler });
    }

    // Retry button
    const retryBtn = modal.querySelector('#error-modal-retry');
    if (retryBtn) {
      const handler = () => {
        this._cancelAutoDismiss();
        this.close();
        window.location.reload();
      };
      retryBtn.addEventListener('click', handler);
      this._listeners.set(retryBtn, { type: 'click', handler });
    }

    // Go home button
    const homeBtn = modal.querySelector('#error-modal-home');
    if (homeBtn) {
      const handler = () => {
        this._cancelAutoDismiss();
        this.close();
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
      };
      homeBtn.addEventListener('click', handler);
      this._listeners.set(homeBtn, { type: 'click', handler });
    }

    // Contact support button
    const contactBtn = modal.querySelector('#error-modal-contact');
    if (contactBtn) {
      const handler = () => {
        this._cancelAutoDismiss();
        // Open contact modal or email
        window.location.href = 'mailto:support@suplilist.com';
      };
      contactBtn.addEventListener('click', handler);
      this._listeners.set(contactBtn, { type: 'click', handler });
    }

    // Prevent closing on overlay click (only on X button)
    const overlay = modal.querySelector('.error-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          // Clicking outside does nothing
        }
      });
    }
  }

  /**
   * Close the modal
   */
  close() {
    const modal = document.querySelector('#global-error-modal');
    if (modal) {
      modal.innerHTML = '';
      modal.style.display = 'none';
    }
    this.isOpen = false;
    this._cancelAutoDismiss();
    this._clearResources();
  }
}

/**
 * Singleton instance
 * @type {GlobalErrorModal}
 */
let instance = null;

/**
 * Get or create the singleton instance
 * @returns {GlobalErrorModal}
 */
export function getGlobalErrorModal() {
  if (!instance) {
    instance = new GlobalErrorModal();
  }
  return instance;
}

export default GlobalErrorModal;
