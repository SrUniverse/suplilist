/**
 * phone-login-page.js — Login por número de telefone via Firebase Phone Auth (SMS OTP).
 *
 * Fluxo:
 *  1. Usuário digita número de telefone no formato +55...
 *  2. Firebase envia SMS com código OTP (reCAPTCHA invisível)
 *  3. Usuário digita o código
 *  4. /api/auth/sync sincroniza com o MongoDB
 *  5. stateManager recebe AUTH_LOGIN
 *  6. Redireciona para /home
 *
 * @module features/auth/phone-login-page
 */

import { auth, signInWithPhoneNumber, RecaptchaVerifier, signOut } from './firebase-client.js';
import { apiFetch } from '../../platform/api-client.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { errorHandler } from '../../platform/error-handler.js';

export default class PhoneLoginPage {
  constructor(container) {
    this.container = container;
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this._step = 'phone'; // 'phone' | 'otp'
    this._confirmationResult = null;
    this._recaptchaVerifier = null;
    this._phone = '';
  }

  mount() {
    this._isMounted = true;
    this._render();
  }

  unmount() {
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this._step = 'phone';
    this._confirmationResult = null;
    // Limpar reCAPTCHA
    if (this._recaptchaVerifier) {
      try { this._recaptchaVerifier.clear(); } catch (_) { /* ignore */ }
      this._recaptchaVerifier = null;
    }
    this.container.innerHTML = '';
  }

  _render() {
    const errorHtml = this._errorMessage
      ? `<div class="onboarding-error" role="alert">${escapeHtml(this._errorMessage)}</div>`
      : '';

    if (this._step === 'phone') {
      this.container.innerHTML = `
        <div class="onboarding-wrap">
          <div class="onboarding-card">
            <h1 class="onboarding-title">Login por SMS</h1>
            <p class="onboarding-subtitle">Vamos enviar um código de verificação para o seu número.</p>
            ${errorHtml}
            <form id="phone-form" novalidate>
              <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.25rem;">
                <select id="phone-country" class="onboarding-input" style="max-width:90px;padding-right:0.25rem;">
                  <option value="+55">🇧🇷 +55</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+351">🇵🇹 +351</option>
                  <option value="+54">🇦🇷 +54</option>
                </select>
                <input
                  id="phone-number"
                  class="onboarding-input"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  autocomplete="tel"
                  aria-label="Número de telefone"
                  style="flex:1"
                />
              </div>
              <p style="font-size:0.75rem;color:var(--color-text-secondary,#888);margin-bottom:1.5rem;">
                Digite apenas números, sem espaços ou traços.
              </p>
              <!-- reCAPTCHA invisível ficará aqui -->
              <div id="recaptcha-container"></div>
              <button
                id="phone-submit"
                type="submit"
                class="onboarding-btn-next"
                style="width:100%"
                ${this._isLoading ? 'disabled' : ''}
              >
                ${this._isLoading ? 'Enviando...' : 'Enviar SMS'}
              </button>
            </form>

            <div style="margin-top:1.5rem;text-align:center;">
              <button id="phone-goto-login" class="onboarding-btn-link" type="button">
                ← Voltar para o Login
              </button>
            </div>
          </div>
        </div>`;
    } else {
      this.container.innerHTML = `
        <div class="onboarding-wrap">
          <div class="onboarding-card">
            <h1 class="onboarding-title">Confirmar SMS</h1>
            <p class="onboarding-subtitle">
              Código enviado para <strong>${escapeHtml(this._phone)}</strong>.<br>
              Verifique sua mensagem de texto.
            </p>
            ${errorHtml}
            <form id="otp-form" novalidate>
              <input
                id="otp-code"
                class="onboarding-input"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                placeholder="Código de 6 dígitos"
                autocomplete="one-time-code"
                aria-label="Código SMS"
                style="letter-spacing:0.35em;font-size:1.5rem;text-align:center;"
              />
              <button
                id="otp-submit"
                type="submit"
                class="onboarding-btn-next"
                style="width:100%;margin-top:1.25rem"
                ${this._isLoading ? 'disabled' : ''}
              >
                ${this._isLoading ? 'Verificando...' : 'Verificar Código'}
              </button>
            </form>

            <div style="margin-top:1rem;text-align:center;">
              <button id="otp-resend" class="onboarding-btn-link" type="button">
                Não recebi o código — Reenviar
              </button>
            </div>
          </div>
        </div>`;
    }

    this._attachListeners();
  }

  _attachListeners() {
    if (this._step === 'phone') {
      const form = this.container.querySelector('#phone-form');
      if (form) form.addEventListener('submit', e => this._handleSendSMS(e));

      const btnBack = this.container.querySelector('#phone-goto-login');
      if (btnBack) {
        btnBack.addEventListener('click', () => {
          eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
        });
      }
    } else {
      const form = this.container.querySelector('#otp-form');
      if (form) form.addEventListener('submit', e => this._handleVerifyOTP(e));

      const btnResend = this.container.querySelector('#otp-resend');
      if (btnResend) {
        btnResend.addEventListener('click', () => {
          this._step = 'phone';
          this._confirmationResult = null;
          this._errorMessage = null;
          this._render();
        });
      }
    }
  }

  async _handleSendSMS(e) {
    e.preventDefault();

    const countryCode = this.container.querySelector('#phone-country')?.value || '+55';
    const rawNumber = this.container.querySelector('#phone-number')?.value.replace(/\D/g, '').trim();

    if (!rawNumber || rawNumber.length < 8) {
      this._showError('Digite um número de telefone válido.');
      return;
    }

    this._phone = `${countryCode}${rawNumber}`;
    this._isLoading = true;
    this._errorMessage = null;
    this._syncButtonState('phone-submit', 'Enviando...', 'Enviar SMS');

    try {
      // Inicializar reCAPTCHA invisível (uma única vez)
      if (!this._recaptchaVerifier) {
        this._recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
        });
      }

      this._confirmationResult = await signInWithPhoneNumber(auth, this._phone, this._recaptchaVerifier);

      if (!this._isMounted) return;

      this._step = 'otp';
      this._isLoading = false;
      this._render();

    } catch (err) {
      if (!this._isMounted) return;

      // Resetar reCAPTCHA em caso de erro
      if (this._recaptchaVerifier) {
        try { this._recaptchaVerifier.clear(); } catch (_) { /* ignore */ }
        this._recaptchaVerifier = null;
      }

      this._isLoading = false;
      this._syncButtonState('phone-submit', 'Enviando...', 'Enviar SMS');
      this._showError(errorHandler.getUserFriendlyMessage(err));
    }
  }

  async _handleVerifyOTP(e) {
    e.preventDefault();

    const code = this.container.querySelector('#otp-code')?.value.trim();

    if (!code || code.length !== 6) {
      this._showError('Digite o código de 6 dígitos recebido por SMS.');
      return;
    }

    if (!this._confirmationResult) {
      this._showError('Sessão expirada. Por favor, solicite um novo código.');
      this._step = 'phone';
      this._render();
      return;
    }

    this._isLoading = true;
    this._errorMessage = null;
    this._syncButtonState('otp-submit', 'Verificando...', 'Verificar Código');

    try {
      // Confirmar o código OTP
      await this._confirmationResult.confirm(code);

      // Sincronizar com o backend
      const syncData = await apiFetch('/api/auth/sync', { method: 'POST' });

      // Popular stateManager
      stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
        id:            syncData.userId,
        email:         syncData.email,
        role:          syncData.role,
        isMfaEnabled:  false,
        emailVerified: syncData.emailVerified ?? true, // Telefone verificado = conta verificada
      });
      eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: syncData });

      if (!this._isMounted) return;

      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });

    } catch (err) {
      if (!this._isMounted) return;

      // Se o Firebase autenticou mas o backend falhou, deslogar
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }

      this._isLoading = false;
      this._syncButtonState('otp-submit', 'Verificando...', 'Verificar Código');

      if (err.code === 'auth/invalid-verification-code') {
        this._showError('Código incorreto. Verifique o SMS e tente novamente.');
      } else if (err.code === 'auth/code-expired') {
        this._showError('Código expirado. Solicite um novo SMS.');
        this._step = 'phone';
        this._confirmationResult = null;
        this._render();
      } else {
        this._showError(errorHandler.getUserFriendlyMessage(err));
      }
    }
  }

  _syncButtonState(id, loadingText, defaultText) {
    if (!this._isMounted) return;
    const btn = this.container.querySelector(`#${id}`);
    if (!btn) return;
    btn.disabled = this._isLoading;
    btn.textContent = this._isLoading ? loadingText : defaultText;
  }

  _showError(message) {
    if (!this._isMounted) return;
    this._errorMessage = message;
    let el = this.container.querySelector('.onboarding-error');
    if (el) {
      el.textContent = message;
      return;
    }
    el = document.createElement('div');
    el.className = 'onboarding-error';
    el.setAttribute('role', 'alert');
    el.textContent = message;
    const card = this.container.querySelector('.onboarding-card h1');
    if (card) card.insertAdjacentElement('afterend', el);
  }
}
