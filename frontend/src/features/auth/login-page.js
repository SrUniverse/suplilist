/**
 * login-page.js — Tela de autenticação de usuários existentes.
 *
 * Responsabilidade única: autenticar um usuário já cadastrado via
 * POST /api/auth/login e redirecionar para /home em caso de sucesso.
 *
 * ── Invariantes de design ──────────────────────────────────────────────────────
 *
 * CICLO DE VIDA SINGLE-STEP
 *   Ao contrário do Wizard de onboarding, este componente não mantém
 *   estado progressivo entre etapas. A única operação de rede é o login.
 *
 * DEPENDÊNCIA MÍNIMA
 *   A única dependência de negócio é identityService. Nenhum catálogo,
 *   nenhum recommender, nenhum stateManager é carregado aqui.
 *
 * GUARD DE DESMONTAGEM (this._isMounted)
 *   A flag é setada como false em unmount() antes de qualquer operação
 *   assíncrona ser concluída. Toda mutação de DOM pós-await verifica a
 *   flag antes de executar — prevenindo erros de referência nula no
 *   bloco catch quando o router já destruiu a página.
 *
 * NAVEGAÇÃO VIA EVENTBUS
 *   A navegação é emitida via eventBus.emit(EVENTS.ROUTER_NAVIGATE).
 *   O componente não conhece o router diretamente.
 *
 * @module features/auth/login-page
 */

import { identityService } from '../../platform/identity-service.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { apiFetch, setAccessToken } from '../../platform/api-client.js';
import { errorHandler } from '../../platform/error-handler.js';
import { loginValidator } from '../../platform/form-validator.js';

import { retryAsync } from '../../platform/retry-helper.js';

// CLOSURE: Variáveis isoladas na memória para reter tokens temporários.
// Nunca tocará no localStorage ou sessionStorage para evitar vazamento via XSS.
let _mfaPreAuthToken = null;
let _mfaPreAuthTokenExpiry = null; // Timestamp when MFA token expires (5 minutes)
let _deviceVerificationEmail = null;

export default class LoginPage {
  /**
   * @param {HTMLElement} container - Elemento DOM onde a página será montada.
   */
  constructor(container) {
    this.container = container;

    /** @type {boolean} Guard contra mutações de DOM pós-desmontagem. */
    this._isMounted = false;

    /** @type {boolean} Estado de carregamento do submit. */
    this._isLoading = false;

    /** @type {string | null} Mensagem de erro da última tentativa de login. */
    this._errorMessage = null;

    /** @type {Map<HTMLElement, {type: string, handler: Function}>} Armazena listeners para limpeza. */
    this._listeners = new Map();

    /** @type {Set<number>} Store timeout/interval IDs for cleanup on unmount */
    this._timers = new Set();

    /** @type {Set<Function>} Store event listener unsubscribe functions for cleanup */
    this._eventListeners = new Set();

    /** @type {AbortController} Cancela requisições em voo se componente desmontar */
    this._abortController = new AbortController();

    /** @type {number | null} Timestamp quando MFA token expira (5 minutos) */
    this._mfaTokenExpiry = null;
  }

  // ── Ciclo de vida ────────────────────────────────────────────────────────────

  mount() {
    this._isMounted = true;
    _mfaPreAuthToken = null;
    _deviceVerificationEmail = null;
    this._mfaTokenExpiry = null;
    this._render();
    this._injectGoogleGis();
  }

  unmount() {
    this._isMounted = false;
    // Cancela todas as requisições em voo ANTES de limpar recursos
    this._abortController.abort();
    this._clearAllResources();
    this.container.innerHTML = '';
  }

  /**
   * Central cleanup method that removes all resources:
   * - DOM event listeners
   * - Timers and intervals
   * - Event bus subscriptions
   * - Temporary tokens and state
   *
   * Called on unmount to prevent memory leaks.
   * @private
   */
  _clearAllResources() {
    // 1. Clear all timers (timeouts and intervals)
    this._timers.forEach(timerId => {
      clearTimeout(timerId);
      clearInterval(timerId);
    });
    this._timers.clear();

    // 2. Clear all DOM event listeners
    for (const [element, { type, handler }] of this._listeners.entries()) {
      try {
        element.removeEventListener(type, handler);
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    this._listeners.clear();

    // 3. Unsubscribe from all eventBus listeners
    this._eventListeners.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
    this._eventListeners.clear();

    // 4. Clear internal state
    this._isLoading = false;
    this._errorMessage = null;

    // 5. Clear temporary tokens
    _mfaPreAuthToken = null;
    _deviceVerificationEmail = null;
    this._mfaTokenExpiry = null;
  }

  // ── Renderização ─────────────────────────────────────────────────────────────

  _render() {
    const errorHtml = `<div class="onboarding-error" data-testid="login-error" role="alert"${this._errorMessage ? '' : ' hidden'}>${this._errorMessage ? escapeHtml(this._errorMessage) : ''}</div>`;

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <h1 class="onboarding-title">Entrar no SupliList</h1>
          <p class="onboarding-subtitle">Continue de onde parou.</p>
          ${errorHtml}
          
          <div id="login-step-credentials">
            <div id="google-btn-wrapper" style="margin-bottom: 1.5rem; display: flex; justify-content: center;"></div>
            
            <div style="display: flex; align-items: center; text-align: center; color: #a1a1aa; margin-bottom: 1.5rem; font-size: 0.85rem;">
              <hr style="flex: 1; border: none; border-top: 1px solid #3f3f46;">
              <span style="padding: 0 10px;">ou com e-mail</span>
              <hr style="flex: 1; border: none; border-top: 1px solid #3f3f46;">
            </div>

            <form class="login-form" novalidate>
              <input
                id="login-email"
                data-testid="login-email"
                class="onboarding-input"
                type="email"
                name="email"
                placeholder="E-mail"
                autocomplete="email"
                aria-label="E-mail"
                aria-required="true"
                aria-invalid="false"
                aria-describedby="email-error"
              />
              <input
                id="login-password"
                data-testid="login-password"
                class="onboarding-input"
                type="password"
                name="password"
                placeholder="Senha"
                autocomplete="current-password"
                aria-label="Senha"
                aria-required="true"
                aria-invalid="false"
                aria-describedby="password-error"
                style="margin-top:0.75rem"
              />
              <div class="onboarding-actions" style="margin-top:1.75rem">
                <button
                  id="login-submit"
                  data-testid="login-submit"
                  type="submit"
                  class="onboarding-btn-next"
                  aria-label="Entrar com as credenciais fornecidas"
                  ${this._isLoading ? 'disabled' : ''}
                >
                  ${this._isLoading ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </form>
            
            <div style="text-align: center; margin-top: 1rem;">
              <button
                id="login-forgot-password"
                class="onboarding-btn-link"
                type="button"
                aria-label="Recuperar senha"
                style="font-size: 0.85rem;"
              >Esqueceu a senha?</button>
            </div>

            <p class="onboarding-switch" style="text-align:center;margin-top:1.25rem;font-size:0.9rem">
              Novo por aqui?
              <button
                id="login-create-account"
                class="onboarding-btn-link"
                type="button"
                aria-label="Criar nova conta"
              >Criar conta</button>
            </p>
          </div>

          <div id="login-step-mfa" style="display: none;">
            <p id="mfa-description" style="text-align: center; font-size: 0.95rem; margin-bottom: 0.5rem; color: #e4e4e7;">
              Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador.
            </p>
            <p style="text-align: center; font-size: 0.8rem; margin-bottom: 1rem; color: #a1a1aa;">
              <span data-mfa-timer style="font-weight: 600;" aria-live="polite" aria-atomic="true">Expira em 5 min</span>
            </p>
            <form class="mfa-form" novalidate>
              <input
                id="mfa-code"
                data-testid="mfa-code"
                class="onboarding-input"
                type="text"
                name="code"
                placeholder="000000"
                autocomplete="one-time-code"
                inputmode="numeric"
                maxlength="12"
                aria-label="Código MFA ou Backup"
                aria-required="true"
                aria-describedby="mfa-description"
                style="text-align: center; letter-spacing: 0.2em; font-size: 1.2rem;"
              />
              <div class="onboarding-actions" style="margin-top:1.75rem">
                <button
                  id="mfa-submit"
                  data-testid="mfa-submit"
                  type="submit"
                  class="onboarding-btn-next"
                  aria-label="Verificar código MFA"
                >
                  Verificar
                </button>
              </div>
            </form>
            <button id="mfa-cancel" class="onboarding-btn-link" aria-label="Voltar para login" style="display:block; margin: 1.5rem auto 0; text-align:center;">Voltar</button>
          </div>

          <div id="login-step-device" style="display: none;">
            <p style="text-align: center; font-size: 0.95rem; margin-bottom: 0.5rem; color: #e4e4e7;">
              Novo dispositivo detectado.
            </p>
            <p style="text-align: center; font-size: 0.85rem; margin-bottom: 1.5rem; color: #a1a1aa;">
              Enviamos um código de verificação para o seu e-mail. Insira-o abaixo para continuar.
            </p>
            <form class="device-form" novalidate>
              <input
                id="device-code"
                data-testid="device-code"
                class="onboarding-input"
                type="text"
                name="code"
                placeholder="000000"
                autocomplete="one-time-code"
                inputmode="numeric"
                maxlength="6"
                aria-label="Código de verificação do dispositivo"
                aria-required="true"
                style="text-align: center; letter-spacing: 0.2em; font-size: 1.2rem;"
              />
              <div class="onboarding-actions" style="margin-top:1.75rem">
                <button
                  id="device-submit"
                  data-testid="device-submit"
                  type="submit"
                  class="onboarding-btn-next"
                  aria-label="Verificar dispositivo com código"
                >
                  Verificar dispositivo
                </button>
              </div>
            </form>
            <button id="device-cancel" class="onboarding-btn-link" aria-label="Voltar para login" style="display:block; margin: 1.5rem auto 0; text-align:center;">Voltar</button>
          </div>
        </div>
      </div>`;

    this._attachListeners();
  }

  // ── Timer Management ────────────────────────────────────────────────────────

  /**
   * Register a timer ID for cleanup on unmount.
   * Automatically tracked and cleared when component unmounts.
   *
   * @param {number} timerId - setTimeout or setInterval ID
   * @returns {number} The same timer ID (for convenience)
   * @private
   */
  _registerTimer(timerId) {
    this._timers.add(timerId);
    return timerId;
  }

  /**
   * Register an event listener unsubscribe function for cleanup.
   *
   * @param {Function} unsubscribeFn - Function that unsubscribes from eventBus
   * @returns {Function} The same function (for convenience)
   * @private
   */
  _registerEventListener(unsubscribeFn) {
    this._eventListeners.add(unsubscribeFn);
    return unsubscribeFn;
  }

  // ── Listeners ────────────────────────────────────────────────────────────────

  _attachListeners() {
    const form = this.container.querySelector('.login-form');
    const mfaForm = this.container.querySelector('.mfa-form');

    // Limpar erro ao digitar em qualquer campo.
    this.container.querySelectorAll('input').forEach(input => {
      const handler = () => this._clearError();
      input.addEventListener('input', handler);
      this._listeners.set(input, { type: 'input', handler });
    });

    // Login form submit
    const submitHandler = (e) => this._handleSubmit(e);
    form.addEventListener('submit', submitHandler);
    this._listeners.set(form, { type: 'submit', handler: submitHandler });

    // MFA form submit
    const mfaSubmitHandler = (e) => this._handleMfaSubmit(e);
    mfaForm.addEventListener('submit', mfaSubmitHandler);
    this._listeners.set(mfaForm, { type: 'submit', handler: mfaSubmitHandler });

    const btnCreateAccount = this.container.querySelector('#login-create-account');
    if (btnCreateAccount) {
      const handler = () => {
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/onboarding' });
      };
      btnCreateAccount.addEventListener('click', handler);
      this._listeners.set(btnCreateAccount, { type: 'click', handler });
    }

    const btnForgotPassword = this.container.querySelector('#login-forgot-password');
    if (btnForgotPassword) {
      const handler = () => {
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/forgot-password' });
      };
      btnForgotPassword.addEventListener('click', handler);
      this._listeners.set(btnForgotPassword, { type: 'click', handler });
    }

    const btnMfaCancel = this.container.querySelector('#mfa-cancel');
    if (btnMfaCancel) {
      const handler = () => {
        _mfaPreAuthToken = null;
        this._showStep('credentials');
      };
      btnMfaCancel.addEventListener('click', handler);
      this._listeners.set(btnMfaCancel, { type: 'click', handler });
    }

    const deviceForm = this.container.querySelector('.device-form');
    if (deviceForm) {
      const deviceSubmitHandler = (e) => this._handleDeviceSubmit(e);
      deviceForm.addEventListener('submit', deviceSubmitHandler);
      this._listeners.set(deviceForm, { type: 'submit', handler: deviceSubmitHandler });
    }

    const btnDeviceCancel = this.container.querySelector('#device-cancel');
    if (btnDeviceCancel) {
      const handler = () => {
        _deviceVerificationEmail = null;
        this._showStep('credentials');
      };
      btnDeviceCancel.addEventListener('click', handler);
      this._listeners.set(btnDeviceCancel, { type: 'click', handler });
    }
  }

  // ── Lógica de submit ─────────────────────────────────────────────────────────

  /**
   * Processa o envio do formulário de login.
   *
   * Fluxo:
   *  1. Valida formulário com loginValidator.
   *  2. Coleta credenciais.
   *  3. Ativa estado de loading.
   *  4. Chama identityService.login() com retry automático.
   *  5a. Sucesso: emite navegação para /home.
   *  5b. Falha: usa errorHandler para converter em mensagem amigável.
   *
   * @param {SubmitEvent} e
   */
  async _handleSubmit(e) {
    e.preventDefault();

    const form = this.container.querySelector('.login-form');
    const email    = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;

    // Validar formulário antes de submeter
    const validationErrors = loginValidator.validate({ email, password });
    if (validationErrors) {
      loginValidator.markErrors(form, validationErrors);
      return;
    }

    this._errorMessage = null;
    this._isLoading    = true;
    this._syncButtonState();

    try {
      // Usar retry logic para operações de rede
      const result = await retryAsync(
        () => identityService.login(email, password),
        {
          maxAttempts: 2,
          delayMs: 500,
          signal: this._abortController.signal,
          shouldRetry: (error) => {
            // Não retry erros de credencial inválida
            return error.error !== 'invalid_credentials' && error.status !== 401;
          }
        }
      );

      if (result.status === 'mfa_required') {
        _mfaPreAuthToken = result.mfaToken;
        // Set MFA token expiry to 5 minutes from now
        const MFA_TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
        _mfaPreAuthTokenExpiry = Date.now() + MFA_TOKEN_EXPIRY_MS;
        this._showStep('mfa');
        this._isLoading = false;
        this._syncButtonState();
        // Start countdown timer
        this._startMfaExpiryCountdown(MFA_TOKEN_EXPIRY_MS);
        return;
      }

      if (result.status === 'device_verification_required') {
        _deviceVerificationEmail = result.email;
        this._showStep('device');
        this._isLoading = false;
        this._syncButtonState();
        return;
      }

      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      if (!this._isMounted) return;

      if (err.error === 'pending_verification') {
        // Store the email so /verify-otp can pick it up - sanitize first
        try {
          const sanitizedEmail = this._sanitizeEmail(email);
          localStorage.setItem('pending_verification_email', sanitizedEmail);
        } catch (_e) {
          // Ignore localStorage errors
        }
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/verify-otp' });
        return;
      }

      // Use errorHandler to convert error to user-friendly message
      const userMessage = errorHandler.getUserFriendlyMessage(err);
      this._errorMessage = userMessage;
      this._isLoading = false;
      this._syncButtonState();
      this._showError(this._errorMessage);
    }
  }

  /**
   * Start countdown timer for MFA token expiry.
   * Updates the UI every second to warn user when token is about to expire.
   * Clears the token and shows error when expired.
   *
   * @param {number} expiryMs - Time in milliseconds until expiry
   * @private
   */
  _startMfaExpiryCountdown(expiryMs) {
    const interval = setInterval(() => {
      if (!this._isMounted) {
        clearInterval(interval);
        return;
      }

      const timeRemaining = _mfaPreAuthTokenExpiry - Date.now();

      if (timeRemaining <= 0) {
        // Token expired
        clearInterval(interval);
        _mfaPreAuthToken = null;
        _mfaPreAuthTokenExpiry = null;
        this._errorMessage = 'Código expirou. Faça login novamente.';
        this._showStep('credentials');
        this._showError(this._errorMessage);
      } else if (timeRemaining <= 2 * 60 * 1000) {
        // Warning: less than 2 minutes remaining
        const minutesLeft = Math.ceil(timeRemaining / 1000 / 60);
        const timerElement = this.container.querySelector('[data-mfa-timer]');
        if (timerElement) {
          timerElement.textContent = `Expira em ${minutesLeft} min`;
          timerElement.style.color = minutesLeft === 1 ? '#ef4444' : '#f59e0b';
        }
      }
    }, 1000);

    this._registerTimer(interval);
  }

  /**
   * Check if MFA token is still valid (not expired)
   * @private
   * @returns {boolean}
   */
  _isMfaTokenValid() {
    if (!_mfaPreAuthToken || !_mfaPreAuthTokenExpiry) {
      return false;
    }
    return Date.now() < _mfaPreAuthTokenExpiry;
  }

  async _handleMfaSubmit(e) {
    e.preventDefault();
    if (!_mfaPreAuthToken) return;

    // Check if token is still valid
    if (!this._isMfaTokenValid()) {
      _mfaPreAuthToken = null;
      _mfaPreAuthTokenExpiry = null;
      this._errorMessage = 'Código expirou. Faça login novamente.';
      this._showError(this._errorMessage);
      this._showStep('credentials');
      return;
    }

    const mfaForm = this.container.querySelector('.mfa-form');
    const code = mfaForm.querySelector('[name="code"]').value.trim();
    if (!code) return;

    this._errorMessage = null;
    const btn = this.container.querySelector('#mfa-submit');
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    try {
      // POST directly using apiFetch because we need the custom Bearer Header
      const response = await apiFetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${_mfaPreAuthToken}`
        },
        body: JSON.stringify({ code })
      });

      // Clear volatile memory
      _mfaPreAuthToken = null;

      // Persist the real session token using IdentityService mechanisms implicitly
      setAccessToken(response.accessToken);

      // We need to fetch the profile manually to commit the login
      const _identity = await apiFetch('/api/profile/me');

      // We cannot call identityService.#commitLogin since it's private,
      // but initializeSession() will naturally do it if we just call it.
      await identityService.initializeSession();

      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      if (!this._isMounted) return;

      // Use errorHandler for consistent error messages
      this._errorMessage = errorHandler.getUserFriendlyMessage(err);

      if (err.error === 'too_many_attempts') {
        _mfaPreAuthToken = null; // Burn it
        this._showStep('credentials'); // Force restart
      }

      btn.disabled = false;
      btn.textContent = 'Verificar';
      this._showError(this._errorMessage);
    }
  }

  async _handleDeviceSubmit(e) {
    e.preventDefault();
    if (!_deviceVerificationEmail) return;

    const deviceForm = this.container.querySelector('.device-form');
    const otpCode = deviceForm.querySelector('[name="code"]').value.trim();
    if (!otpCode || otpCode.length !== 6) return;

    this._clearError();
    const btn = this.container.querySelector('#device-submit');
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    try {
      // Use retry logic for device verification
      const result = await retryAsync(
        () => identityService.verifyDevice(_deviceVerificationEmail, otpCode),
        {
          maxAttempts: 2,
          delayMs: 500,
          signal: this._abortController.signal,
          shouldRetry: (error) => {
            // Não retry erros de OTP inválido
            return error.error !== 'invalid_otp' && error.error !== 'otp_expired';
          }
        }
      );

      _deviceVerificationEmail = null;

      if (result.status === 'mfa_required') {
        _mfaPreAuthToken = result.mfaToken;
        // Set MFA token expiry to 5 minutes from now
        const MFA_TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
        _mfaPreAuthTokenExpiry = Date.now() + MFA_TOKEN_EXPIRY_MS;
        this._showStep('mfa');
        // Start countdown timer
        this._startMfaExpiryCountdown(MFA_TOKEN_EXPIRY_MS);
        return;
      }

      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      if (!this._isMounted) return;

      // Use errorHandler for consistent error messages
      this._errorMessage = errorHandler.getUserFriendlyMessage(err);
      btn.disabled = false;
      btn.textContent = 'Verificar dispositivo';
      this._showError(this._errorMessage);
    }
  }

  // ── Email Sanitization ──────────────────────────────────────────────────────

  /**
   * Sanitiza um email antes de armazenar em localStorage.
   * Valida formato e remove caracteres perigosos.
   *
   * @param {string} email
   * @returns {string} Email sanitizado
   * @private
   */
  _sanitizeEmail(email) {
    // Validar formato básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Email inválido');
    }

    // Remover espaços em branco
    const sanitized = email.trim().toLowerCase();

    // XSS protection: validar comprimento
    if (sanitized.length > 254) {
      throw new Error('Email muito longo');
    }

    return sanitized;
  }

  // ── Injeção do Google SDK ───────────────────────────────────────────────────

  _injectGoogleGis() {
    if (window.google?.accounts?.id) {
      this._renderGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this._renderGoogleButton();
    document.body.appendChild(script);
  }

  _renderGoogleButton() {
    if (!this._isMounted || !window.google) return;
    
    // Store latest callback globally because 'this' changes if the page remounts
    window._gsiLatestCallback = (res) => this._handleGoogleCallback(res);

    // In strict compliance with Google UX guidelines
    if (!window._gsiInitialized) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (res) => {
          if (window._gsiLatestCallback) window._gsiLatestCallback(res);
        },
        cancel_on_tap_outside: false,
      });
      window._gsiInitialized = true;
    }

    const wrapper = this.container.querySelector('#google-btn-wrapper');
    if (wrapper) {
      window.google.accounts.id.renderButton(wrapper, {
        theme: 'outline',
        size: 'large',
        width: 300,
      });
      // One Tap Prompt
      window.google.accounts.id.prompt();
    }
  }

  async _handleGoogleCallback(response) {
    if (!response.credential) return;

    this._errorMessage = null;
    this._isLoading = true;
    this._syncButtonState();

    try {
      // Use retry logic for Google auth
      const result = await retryAsync(
        () => identityService.googleAuth(response.credential),
        {
          maxAttempts: 2,
          delayMs: 500,
          signal: this._abortController.signal,
          shouldRetry: (error) => {
            // Não retry erros de autenticação
            return error.status !== 401 && error.error !== 'invalid_token';
          }
        }
      );

      if (result.status === 'mfa_required') {
        _mfaPreAuthToken = result.mfaToken;
        // Set MFA token expiry to 5 minutes from now
        const MFA_TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
        _mfaPreAuthTokenExpiry = Date.now() + MFA_TOKEN_EXPIRY_MS;
        this._showStep('mfa');
        this._isLoading = false;
        this._syncButtonState();
        // Start countdown timer
        this._startMfaExpiryCountdown(MFA_TOKEN_EXPIRY_MS);
        return;
      }

      if (result.status === 'device_verification_required') {
        _deviceVerificationEmail = result.email;
        this._showStep('device');
        this._isLoading = false;
        this._syncButtonState();
        return;
      }

      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      if (!this._isMounted) return;

      // UX Defensiva: Limpar OneTap Cooldown em caso de rejeição no backend
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }

      // Use errorHandler for consistent error messages
      this._errorMessage = errorHandler.getUserFriendlyMessage(err);
      this._isLoading = false;
      this._syncButtonState();
      this._showError(this._errorMessage);
    }
  }

  // ── Helpers de UI ────────────────────────────────────────────────────────────

  /**
   * Sincroniza o estado visual do botão de submit com this._isLoading.
   * Só executa se o componente ainda estiver montado.
   */
  _syncButtonState() {
    if (!this._isMounted) return;
    const btn = this.container.querySelector('#login-submit');
    if (!btn) return;
    btn.disabled    = this._isLoading;
    btn.textContent = this._isLoading ? 'Entrando...' : 'Entrar';
  }

  /**
   * Exibe ou atualiza a mensagem de erro no DOM.
   * Reutiliza o elemento existente para evitar reflow.
   *
   * @param {string} message
   */
  _showError(message) {
    if (!this._isMounted) return;
    let el = this.container.querySelector('.onboarding-error');
    if (el) {
      el.textContent = message;
      el.removeAttribute('hidden');
      return;
    }
    el = document.createElement('div');
    el.className = 'onboarding-error';
    el.setAttribute('data-testid', 'login-error');
    el.setAttribute('role', 'alert');
    el.textContent = message;
    const form = this.container.querySelector('.login-form');
    if (form) form.insertAdjacentElement('beforebegin', el);
  }

  /**
   * Remove a mensagem de erro do DOM e limpa o estado interno.
   * Chamado quando o usuário começa a digitar após um erro.
   */
  _clearError() {
    if (!this._errorMessage) return;
    this._errorMessage = null;
    const el = this.container.querySelector('.onboarding-error');
    if (el) el.remove();
  }

  _showStep(step) {
    this._clearError();
    const stepCreds = this.container.querySelector('#login-step-credentials');
    const stepMfa = this.container.querySelector('#login-step-mfa');
    const stepDevice = this.container.querySelector('#login-step-device');

    stepCreds.style.display = 'none';
    stepMfa.style.display = 'none';
    if (stepDevice) stepDevice.style.display = 'none';

    if (step === 'mfa') {
      stepMfa.style.display = 'block';
      const mfaCodeInput = stepMfa.querySelector('[name="code"]');
      if (mfaCodeInput) {
        mfaCodeInput.focus();
        // Announce to screen readers
        this._announceToScreenReader('Insira o código MFA do seu autenticador');
      }
    } else if (step === 'device') {
      if (stepDevice) {
        stepDevice.style.display = 'block';
        const deviceCodeInput = stepDevice.querySelector('[name="code"]');
        if (deviceCodeInput) {
          deviceCodeInput.focus();
          // Announce to screen readers
          this._announceToScreenReader('Insira o código de verificação do dispositivo');
        }
      }
    } else {
      stepCreds.style.display = 'block';
      // Focus first field in credentials step
      const emailInput = stepCreds.querySelector('[name="email"]');
      if (emailInput) emailInput.focus();
    }
  }

  /**
   * Announce message to screen readers
   * @param {string} message
   * @private
   */
  _announceToScreenReader(message) {
    let announcer = this.container.querySelector('[role="status"][aria-live="polite"]');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      this.container.appendChild(announcer);
    }
    announcer.textContent = message;
  }
}
