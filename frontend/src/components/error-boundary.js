/**
 * error-boundary.js — Error Boundary Component
 *
 * Catches unhandled component errors, displays user-friendly error UI,
 * provides recovery options, and logs errors for debugging.
 *
 * IMPORTANT: Does NOT catch:
 * - Event handler errors (use try-catch in handlers)
 * - Async errors like promise rejections (use .catch() or await try-catch)
 * - Server-side rendering errors
 *
 * @module components/error-boundary
 */

import { eventBus, EVENTS } from '../core/event-bus.js';
import { logger } from '../utils/logger.js';
import { escapeHtml } from '../utils/escape.js';

export class ErrorBoundary {
  /**
   * @param {HTMLElement} container - Container element where this boundary renders
   * @param {object} options
   * @param {Function} options.onError - Callback when error is caught
   * @param {Function} options.onReset - Callback when user resets boundary
   */
  constructor(container, options = {}) {
    this.container = container;
    this.onError = options.onError || (() => {});
    this.onReset = options.onReset || (() => {});

    this.hasError = false;
    this.errorInfo = null;
    this.errorId = null;

    this._isMounted = false;
    this._listeners = new Map();
  }

  /**
   * Mount the error boundary
   */
  mount() {
    this._isMounted = true;
  }

  /**
   * Unmount and cleanup
   */
  unmount() {
    this._isMounted = false;
    this._clearResources();
    this.container.innerHTML = '';
  }

  /**
   * Cleanup resources
   * @private
   */
  _clearResources() {
    for (const [element, { type, handler }] of this._listeners.entries()) {
      try {
        element.removeEventListener(type, handler);
      } catch (_e) {
        // Ignore
      }
    }
    this._listeners.clear();
  }

  /**
   * Catch an error and render error UI
   *
   * @param {Error} error - The error that was caught
   * @param {string} [context='Unknown'] - Where the error occurred (component name, etc.)
   */
  captureError(error, context = 'Unknown') {
    if (!this._isMounted) return;

    // Generate unique error ID for tracking
    this.errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.hasError = true;
    this.errorInfo = {
      message: error.message || 'Algo deu errado',
      stack: error.stack || '',
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log error locally
    logger.error(`[ErrorBoundary] Error in ${context}:`, this.errorInfo);

    // Emit error event for monitoring
    eventBus.emit(EVENTS.COMPONENT_ERROR, {
      errorId: this.errorId,
      ...this.errorInfo,
    });

    // Call user callback
    this.onError(error, context);

    // Render error UI
    this._renderErrorUI();
  }

  /**
   * Render user-friendly error UI in Portuguese
   * @private
   */
  _renderErrorUI() {
    this.container.innerHTML = `
      <div class="error-boundary-container" data-error-id="${this.errorId}">
        <div class="error-boundary-card">
          <div class="error-boundary-icon">⚠️</div>
          <h2 class="error-boundary-title">Algo deu errado</h2>
          <p class="error-boundary-description">
            Desculpe! Encontramos um erro inesperado.
            Não é culpa sua — é um problema nosso.
          </p>

          <div class="error-boundary-details">
            <p class="error-boundary-error-msg">${escapeHtml(this.errorInfo.message)}</p>
            <p class="error-boundary-error-id">
              ID do erro: <code>${this.errorId}</code>
            </p>
          </div>

          <div class="error-boundary-actions">
            <button id="error-boundary-retry" class="error-boundary-btn error-boundary-btn-primary">
              Tentar novamente
            </button>
            <button id="error-boundary-report" class="error-boundary-btn error-boundary-btn-secondary">
              Reportar
            </button>
          </div>

          ${import.meta.env.DEV ? `
            <details class="error-boundary-debug">
              <summary>Detalhes técnicos (Dev)</summary>
              <pre>${escapeHtml(this.errorInfo.stack)}</pre>
            </details>
          ` : ''}
        </div>
      </div>
    `;

    this._attachListeners();
  }

  /**
   * Attach event listeners to error UI
   * @private
   */
  _attachListeners() {
    const btnRetry = this.container.querySelector('#error-boundary-retry');
    if (btnRetry) {
      const handler = () => this.reset();
      btnRetry.addEventListener('click', handler);
      this._listeners.set(btnRetry, { type: 'click', handler });
    }

    const btnReport = this.container.querySelector('#error-boundary-report');
    if (btnReport) {
      const handler = () => this._reportError();
      btnReport.addEventListener('click', handler);
      this._listeners.set(btnReport, { type: 'click', handler });
    }
  }

  /**
   * Reset the error boundary (user clicked "Try again")
   */
  reset() {
    if (!this._isMounted) return;

    this.hasError = false;
    this.errorInfo = null;
    this.errorId = null;
    this.container.innerHTML = '';

    this.onReset();
  }

  /**
   * Send error report to server
   * @private
   */
  async _reportError() {
    const btnReport = this.container.querySelector('#error-boundary-report');
    if (!btnReport) return;

    const originalText = btnReport.textContent;
    btnReport.disabled = true;
    btnReport.textContent = 'Enviando...';

    try {
      const payload = {
        errorId: this.errorId,
        message: this.errorInfo.message,
        stack: this.errorInfo.stack,
        context: this.errorInfo.context,
        timestamp: this.errorInfo.timestamp,
        userAgent: this.errorInfo.userAgent,
        url: this.errorInfo.url,
      };

      // Use fetch keepalive for offline-safe reporting with custom headers
      fetch(
        `${import.meta.env.VITE_API_BASE_URL || ''}/api/logs/errors`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SupliList-Client': '1'
          },
          body: JSON.stringify(payload),
          keepalive: true
        }
      ).catch(() => {}); // silently ignore

      btnReport.textContent = 'Reportado! Obrigado';
    } catch (err) {
      logger.error('[ErrorBoundary] Failed to report error:', err);
      btnReport.textContent = 'Erro ao enviar';
    } finally {
      btnReport.disabled = false;
      setTimeout(() => {
        if (btnReport) btnReport.textContent = originalText;
      }, 3000);
    }
  }
}

export default ErrorBoundary;
