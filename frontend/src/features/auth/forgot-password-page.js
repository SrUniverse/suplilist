import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { auth, sendPasswordResetEmail } from './firebase-client.js';
import { validateEmail } from '../../platform/form-validators.js';
import { logger } from '../../utils/logger.js';

export default class ForgotPasswordPage {
  constructor(container) {
    this.container = container;
    this._isMounted = false;
    this._isLoading = false;
    this._successMessage = null;
  }

  mount() {
    this._isMounted = true;
    this._render();
  }

  unmount() {
    this._isMounted = false;
    this._isLoading = false;
    this._successMessage = null;
    this.container.innerHTML = '';
  }

  _render() {
    const successHtml = this._successMessage
      ? `<div class="onboarding-success" style="color: #10b981; text-align: center; margin-bottom: 1rem; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;" role="alert">${escapeHtml(this._successMessage)}</div>`
      : '';

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <h1 class="onboarding-title">Recuperar Senha</h1>
          <p class="onboarding-subtitle">Insira seu e-mail abaixo. Se houver uma conta associada, você receberá um link de recuperação.</p>
          
          ${successHtml}
          
          <form class="forgot-password-form" novalidate ${this._successMessage ? 'style="display:none;"' : ''}>
            <input
              id="forgot-email"
              class="onboarding-input"
              type="email"
              name="email"
              placeholder="seu-email@exemplo.com"
              autocomplete="email"
              aria-label="E-mail"
              required
            />
            <div class="onboarding-actions" style="margin-top:1.75rem">
              <button
                id="forgot-submit"
                type="submit"
                class="onboarding-btn-next"
                ${this._isLoading ? 'disabled' : ''}
              >
                ${this._isLoading ? 'Enviando...' : 'Enviar link'}
              </button>
            </div>
          </form>
          
          <button id="forgot-back-login" class="onboarding-btn-link" style="display:block; margin: 1.5rem auto 0; text-align:center;">Voltar para o Login</button>
        </div>
      </div>
    `;

    this._attachListeners();
  }

  _attachListeners() {
    const form = this.container.querySelector('.forgot-password-form');
    if (form) {
      form.querySelector('input')?.addEventListener('input', () => this._clearError());
      form.addEventListener('submit', e => this._handleSubmit(e));
    }

    const backBtn = this.container.querySelector('#forgot-back-login');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
      });
    }
  }

  async _handleSubmit(e) {
    e.preventDefault();

    const form = this.container.querySelector('.forgot-password-form');
    const email = form.querySelector('[name="email"]').value.trim();

    const emailErr = validateEmail(email);
    if (emailErr) { this._showError(emailErr); return; }

    this._isLoading = true;
    this._syncButtonState();

    try {
      const actionCodeSettings = {
        url: window.location.origin + '/auth/action',
        handleCodeInApp: false, // We just want the user to be redirected back, the link handles the mode=resetPassword
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
    } catch (_err) {
      // Ignorar erros silenciosamente para evitar Account Enumeration
      logger.warn('[ForgotPassword] opaque error (account enumeration prevention)', _err);
    } finally {
      if (this._isMounted) {
        this._isLoading = false;
        // Sempre mostramos a mesma mensagem, mesmo em caso de erro!
        this._successMessage = "Se este e-mail existir na nossa base, você receberá um link em breve.";
        this._render();
      }
    }
  }

  _syncButtonState() {
    if (!this._isMounted) return;
    const btn = this.container.querySelector('#forgot-submit');
    if (!btn) return;
    btn.disabled = this._isLoading;
    btn.textContent = this._isLoading ? 'Enviando...' : 'Enviar link';
  }

  _showError(message) {
    if (!this._isMounted) return;
    let el = this.container.querySelector('.onboarding-error');
    if (el) { el.textContent = message; return; }
    el = document.createElement('div');
    el.className = 'onboarding-error';
    el.setAttribute('role', 'alert');
    el.textContent = message;
    const form = this.container.querySelector('.forgot-password-form');
    if (form) form.insertAdjacentElement('beforebegin', el);
  }

  _clearError() {
    const el = this.container.querySelector('.onboarding-error');
    if (el) el.remove();
  }
}
