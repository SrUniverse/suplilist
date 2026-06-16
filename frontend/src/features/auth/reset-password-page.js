import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { auth, confirmPasswordReset } from './firebase-client.js';
import { validatePassword, validatePasswordConfirm } from '../../platform/form-validators.js';

export default class ResetPasswordPage {
  constructor(container) {
    this.container = container;
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this._token = null;
  }

  mount() {
    this._isMounted = true;
    
    // Captura o token da URL
    const params = new URLSearchParams(window.location.search);
    this._token = params.get('oobCode') || params.get('token');

    if (!this._token) {
      eventBus.emit(EVENTS.TOAST_SHOW, { type: 'error', message: 'Token inválido ou ausente.' });
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
      return;
    }

    this._render();
  }

  unmount() {
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this.container.innerHTML = '';
  }

  _render() {
    const errorHtml = this._errorMessage
      ? `<div class="onboarding-error" role="alert">${escapeHtml(this._errorMessage)}</div>`
      : '';

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <h1 class="onboarding-title">Nova Senha</h1>
          <p class="onboarding-subtitle">Defina uma nova senha forte para a sua conta.</p>
          
          ${errorHtml}
          
          <form class="reset-password-form" novalidate>
            <input
              id="new-password"
              class="onboarding-input"
              type="password"
              name="newPassword"
              placeholder="Nova senha"
              autocomplete="new-password"
              aria-label="Nova senha"
              required
            />
            <input
              id="confirm-password"
              class="onboarding-input"
              type="password"
              name="confirmPassword"
              placeholder="Confirme a senha"
              autocomplete="new-password"
              aria-label="Confirme a senha"
              style="margin-top:0.75rem"
              required
            />
            <div style="font-size: 0.75rem; color: #666; margin-top: 0.5rem; text-align: left;">
              A senha deve conter mínimo 8 caracteres, números e símbolos.
            </div>
            <div class="onboarding-actions" style="margin-top:1.75rem">
              <button
                id="reset-submit"
                type="submit"
                class="onboarding-btn-next"
                ${this._isLoading ? 'disabled' : ''}
              >
                ${this._isLoading ? 'Redefinindo...' : 'Redefinir senha'}
              </button>
            </div>
          </form>
          
          <button id="reset-back-login" class="onboarding-btn-link" style="display:block; margin: 1.5rem auto 0; text-align:center;">Cancelar e voltar</button>
        </div>
      </div>
    `;

    this._attachListeners();
  }

  _attachListeners() {
    const form = this.container.querySelector('.reset-password-form');
    if (form) {
      form.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => this._clearError());
      });
      form.addEventListener('submit', e => this._handleSubmit(e));
    }

    const backBtn = this.container.querySelector('#reset-back-login');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
      });
    }
  }

  async _handleSubmit(e) {
    e.preventDefault();

    const form = this.container.querySelector('.reset-password-form');
    const password = form.querySelector('[name="newPassword"]').value;
    const confirm = form.querySelector('[name="confirmPassword"]').value;

    this._errorMessage = null;

    const confirmErr = validatePasswordConfirm(password, confirm);
    if (confirmErr) { this._showError(confirmErr); return; }

    const passwordErr = validatePassword(password);
    if (passwordErr) { this._showError(passwordErr); return; }

    this._isLoading = true;
    this._syncButtonState();

    try {
      await confirmPasswordReset(auth, this._token, password);
      eventBus.emit(EVENTS.TOAST_SHOW, { type: 'success', message: 'Senha alterada com sucesso!' });
      if (this._isMounted) {
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
      }
    } catch (err) {
      if (!this._isMounted) return;
      this._errorMessage = err.error === 'invalid_token' ? 'Token expirado ou inválido.' : (err.message || 'Falha ao redefinir a senha.');
      this._isLoading = false;
      this._syncButtonState();
      this._showError(this._errorMessage);
    }
  }

  _syncButtonState() {
    if (!this._isMounted) return;
    const btn = this.container.querySelector('#reset-submit');
    if (!btn) return;
    btn.disabled = this._isLoading;
    btn.textContent = this._isLoading ? 'Redefinindo...' : 'Redefinir senha';
  }

  _showError(message) {
    if (!this._isMounted) return;
    let el = this.container.querySelector('.onboarding-error');
    if (el) {
      el.textContent = message;
      return;
    }
    el = document.createElement('div');
    el.className = 'onboarding-error';
    el.setAttribute('role', 'alert');
    el.textContent = message;
    const form = this.container.querySelector('.reset-password-form');
    if (form) form.insertAdjacentElement('beforebegin', el);
  }

  _clearError() {
    if (!this._errorMessage) return;
    this._errorMessage = null;
    const el = this.container.querySelector('.onboarding-error');
    if (el) el.remove();
  }
}
