/**
 * register-page.js — Tela de registro de novos usuários.
 *
 * Responsabilidade: validar inputs rigorosamente no lado do cliente
 * usando Zod e invocar identityService.register().
 *
 * @module features/auth/register-page
 */



import { identityService } from '../../platform/identity-service.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { validateEmail, validatePassword } from '../../platform/form-validators.js';

export default class RegisterPage {
  constructor(container) {
    this.container = container;
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this._successMessage = null;
  }

  mount() {
    this._isMounted = true;
    this._render();
  }

  unmount() {
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this._successMessage = null;
    this.container.innerHTML = '';
  }

  _render() {
    const errorHtml = this._errorMessage
      ? `<div class="onboarding-error" data-testid="register-error" role="alert">${escapeHtml(this._errorMessage)}</div>`
      : '';
      
    const successHtml = this._successMessage
      ? `<div class="onboarding-success" style="color: green; text-align: center; margin-bottom: 1rem;" role="alert">${escapeHtml(this._successMessage)}</div>`
      : '';

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <h1 class="onboarding-title">Criar Conta</h1>
          <p class="onboarding-subtitle">Junte-se ao SupliList de forma segura.</p>
          ${errorHtml}
          ${successHtml}
          <form class="register-form" novalidate ${this._successMessage ? 'style="display:none;"' : ''}>
            <input
              id="register-email"
              data-testid="register-email"
              class="onboarding-input"
              type="email"
              name="email"
              placeholder="E-mail"
              autocomplete="email"
              aria-label="E-mail"
            />
            <input
              id="register-password"
              data-testid="register-password"
              class="onboarding-input"
              type="password"
              name="password"
              placeholder="Senha"
              autocomplete="new-password"
              aria-label="Senha"
              style="margin-top:0.75rem"
            />
            <div style="font-size: 0.75rem; color: #666; margin-top: 0.5rem; text-align: left;">
              A senha deve conter mínimo 8 caracteres, números e símbolos.
            </div>
            <div class="onboarding-actions" style="margin-top:1.75rem">
              <button
                id="register-submit"
                data-testid="register-submit"
                type="submit"
                class="onboarding-btn-next"
                ${this._isLoading ? 'disabled' : ''}
              >
                ${this._isLoading ? 'Criando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
          <p class="onboarding-switch" style="text-align:center;margin-top:1.25rem;font-size:0.9rem">
            Já possui uma conta?
            <button
              id="register-goto-login"
              class="onboarding-btn-link"
              type="button"
            >Entrar</button>
          </p>
        </div>
      </div>`;

    this._attachListeners();
  }

  _attachListeners() {
    const form = this.container.querySelector('.register-form');
    if (form) {
      form.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => this._clearError());
      });
      form.addEventListener('submit', e => this._handleSubmit(e));
    }

    const btnGotoLogin = this.container.querySelector('#register-goto-login');
    if (btnGotoLogin) {
      btnGotoLogin.addEventListener('click', () => {
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
      });
    }
  }

  async _handleSubmit(e) {
    e.preventDefault();

    const form = this.container.querySelector('.register-form');
    const email = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;

    this._errorMessage = null;

    const emailErr = validateEmail(email);
    if (emailErr) { this._showError(emailErr); return; }

    const passwordErr = validatePassword(password);
    if (passwordErr) { this._showError(passwordErr); return; }

    this._isLoading = true;
    this._syncButtonState();

    try {
      await identityService.register(email, password);
      
      if (!this._isMounted) return;
      
      // O registro agora pede verificação OTP, e o email está salvo no localStorage
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/verify-otp' });
    } catch (err) {
      if (!this._isMounted) return;

      // O backend já trata credenciais/existência enviando erro padronizado para mitigar user enumeration,
      // que o apiFetch ou identityService repassa.
      this._errorMessage = err.message || 'Falha ao registrar. Tente novamente.';
      this._isLoading = false;
      this._syncButtonState();
      this._showError(this._errorMessage);
    }
  }

  _syncButtonState() {
    if (!this._isMounted) return;
    const btn = this.container.querySelector('#register-submit');
    if (!btn) return;
    btn.disabled = this._isLoading;
    btn.textContent = this._isLoading ? 'Criando...' : 'Cadastrar';
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
    el.setAttribute('data-testid', 'register-error');
    el.setAttribute('role', 'alert');
    el.textContent = message;
    const form = this.container.querySelector('.register-form');
    if (form) form.insertAdjacentElement('beforebegin', el);
  }

  _clearError() {
    if (!this._errorMessage) return;
    this._errorMessage = null;
    const el = this.container.querySelector('.onboarding-error');
    if (el) el.remove();
  }
}
