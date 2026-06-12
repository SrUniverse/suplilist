/**
 * login-page.js — Tela de autenticação de usuários existentes com Firebase Auth.
 *
 * Responsabilidade única: autenticar um usuário já cadastrado via Firebase
 * e redirecionar para /home em caso de sucesso.
 */

import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { apiFetch } from '../../platform/api-client.js';
import { errorHandler } from '../../platform/error-handler.js';
import { loginValidator } from '../../platform/form-validator.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { auth, signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, signOut } from './firebase-client.js';

export default class LoginPage {
  constructor(container) {
    this.container = container;
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this._listeners = new Map();
    this._timers = new Set();
    this._eventListeners = new Set();
  }

  mount() {
    this._isMounted = true;
    this._render();
    this._injectGoogleGis();
  }

  unmount() {
    this._isMounted = false;
    this._clearAllResources();
    this.container.innerHTML = '';
  }

  _clearAllResources() {
    for (const [element, { type, handler }] of this._listeners.entries()) {
      try {
        element.removeEventListener(type, handler);
      } catch (_e) { /* ignore */ }
    }
    this._listeners.clear();

    for (const timerId of this._timers) {
      clearTimeout(timerId);
      clearInterval(timerId);
    }
    this._timers.clear();

    for (const unsub of this._eventListeners) {
      try { unsub(); } catch (_e) { /* ignore */ }
    }
    this._eventListeners.clear();

    this._isLoading = false;
    this._errorMessage = null;
  }

  _registerTimer(timerId) {
    this._timers.add(timerId);
    return timerId;
  }

  _registerEventListener(unsub) {
    this._eventListeners.add(unsub);
  }

  _startMfaExpiryCountdown(ms) {
    this._mfaExpiryTime = Date.now() + ms;
    const timerId = setInterval(() => {
      if (!this._isMfaTokenValid()) {
        clearInterval(timerId);
        this._timers.delete(timerId);
      }
    }, 1000);
    this._registerTimer(timerId);
  }

  _isMfaTokenValid() {
    if (!this._mfaExpiryTime) return false;
    return Date.now() < this._mfaExpiryTime;
  }

  _render() {
    const errorHtml = `<div id="login-error-region" class="onboarding-error" data-testid="login-error" role="alert" style="margin-bottom: 1.5rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 0.9rem;"${this._errorMessage ? '' : ' hidden'}>${this._errorMessage ? escapeHtml(this._errorMessage) : ''}</div>`;

    this.container.innerHTML = `
      <div class="onboarding-wrap" style="background: radial-gradient(circle at top right, rgba(139, 92, 246, 0.1), transparent 40%), var(--color-bg-primary);">
        <div class="onboarding-card" style="box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 1px solid var(--color-border); padding: 2.5rem 2rem; position: relative; overflow: hidden;">
          
          <!-- Decorative element -->
          <div style="position: absolute; top: -50px; left: -50px; width: 100px; height: 100px; background: var(--color-brand); opacity: 0.2; filter: blur(40px); border-radius: 50%;"></div>

          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; margin-bottom: 1rem;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </div>
            <h1 class="onboarding-title" style="font-size: 1.75rem; letter-spacing: -0.02em;">Bem-vindo de volta</h1>
            <p class="onboarding-subtitle" style="margin-bottom: 0;">Acesse seu stack e continue evoluindo.</p>
          </div>

          ${errorHtml}
          
          <div id="login-step-credentials">
            <!-- Google Button Wrapper -->
            <div id="google-btn-wrapper" style="display: flex; justify-content: center; margin-bottom: 1.5rem; min-height: 40px; transition: transform 0.2s;"></div>
            
            <div style="display: flex; align-items: center; text-align: center; color: var(--color-text-muted); margin-bottom: 1.5rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">
              <hr style="flex: 1; border: none; border-top: 1px solid var(--color-border);">
              <span style="padding: 0 12px;">ou use seu e-mail</span>
              <hr style="flex: 1; border: none; border-top: 1px solid var(--color-border);">
            </div>

            <form class="login-form" novalidate>
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label for="login-email" style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">E-mail</label>
                  <input
                    id="login-email"
                    data-testid="login-email"
                    class="onboarding-input"
                    type="email"
                    name="email"
                    placeholder="voce@exemplo.com"
                    autocomplete="email"
                    aria-label="E-mail"
                    aria-required="true"
                    aria-describedby="login-error-region"
                    style="padding: 0.875rem 1rem;"
                  />
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <label for="login-password" style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary);">Senha</label>
                    <button id="login-forgot-password" type="button" aria-label="Esqueceu a senha" style="background: none; border: none; color: var(--color-brand); font-size: 0.8rem; font-weight: 600; cursor: pointer; padding: 12px 8px; margin: -12px -8px;">Esqueceu?</button>
                  </div>
                  <input
                    id="login-password"
                    data-testid="login-password"
                    class="onboarding-input"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    autocomplete="current-password"
                    aria-label="Senha"
                    aria-required="true"
                    style="padding: 0.875rem 1rem;"
                  />
                </div>
              </div>

              <div class="onboarding-actions" style="margin-top: 2rem;">
                <button
                  id="login-submit"
                  data-testid="login-submit"
                  type="submit"
                  class="onboarding-btn-next"
                  style="width: 100%; padding: 0.875rem; font-weight: 700; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);"
                  aria-label="Entrar"
                  ${this._isLoading ? 'disabled' : ''}
                >
                  ${this._isLoading ? '<span class="spinner" style="display:inline-block; width:1rem; height:1rem; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 1s linear infinite; vertical-align:middle; margin-right:8px;"></span> Entrando...' : 'Entrar na Conta'}
                </button>
              </div>
            </form>

            <div style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--color-text-secondary);">
              Ainda não tem uma conta? 
              <button
                id="login-create-account"
                type="button"
                aria-label="Criar conta"
                style="background: none; border: none; color: var(--color-text-primary); font-weight: 700; cursor: pointer; padding: 12px 8px; margin: -12px -8px; text-decoration: underline; text-decoration-color: var(--color-brand); text-underline-offset: 4px;"
              >Cadastre-se</button>
            </div>

            <!-- Login por SMS oculto até o reCAPTCHA (phone auth) ser provisionado
                 no Firebase/Google Cloud. Ver [[value-loop-funnel]]. -->
          </div>

          <div id="login-step-mfa" style="display: none;">
            <div role="status" aria-live="polite">Verificação em duas etapas</div>
            <input id="mfa-code" aria-label="Código MFA" aria-required="true" inputmode="numeric" />
            <div data-mfa-timer aria-live="polite" aria-atomic="true"></div>
          </div>
          
          <div id="login-step-device" style="display: none;">
            <input id="device-code" aria-label="Device Code" aria-required="true" />
          </div>
        </div>
      </div>
      <style>
        @keyframes spin { 100% { transform: rotate(360deg); } }
        #google-btn-wrapper:hover { transform: translateY(-1px); }
      </style>`;

    this._attachListeners();
  }

  _attachListeners() {
    const form = this.container.querySelector('.login-form');

    this.container.querySelectorAll('input').forEach(input => {
      const handler = () => this._clearError();
      input.addEventListener('input', handler);
      this._listeners.set(input, { type: 'input', handler });
    });

    const submitHandler = (e) => this._handleSubmit(e);
    form.addEventListener('submit', submitHandler);
    this._listeners.set(form, { type: 'submit', handler: submitHandler });

    const btnCreateAccount = this.container.querySelector('#login-create-account');
    if (btnCreateAccount) {
      const handler = () => eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/register' });
      btnCreateAccount.addEventListener('click', handler);
      this._listeners.set(btnCreateAccount, { type: 'click', handler });
    }

    const btnPhoneLogin = this.container.querySelector('#login-phone');
    if (btnPhoneLogin) {
      const handler = () => eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/phone-login' });
      btnPhoneLogin.addEventListener('click', handler);
      this._listeners.set(btnPhoneLogin, { type: 'click', handler });
    }

    const btnForgotPassword = this.container.querySelector('#login-forgot-password');
    if (btnForgotPassword) {
      const handler = () => eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/forgot-password' });
      btnForgotPassword.addEventListener('click', handler);
      this._listeners.set(btnForgotPassword, { type: 'click', handler });
    }
  }

  async _handleSubmit(e) {
    e.preventDefault();

    const form = this.container.querySelector('.login-form');
    const email    = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;

    const validationErrors = loginValidator.validate({ email, password });
    if (validationErrors) {
      loginValidator.markErrors(form, validationErrors);
      return;
    }

    this._errorMessage = null;
    this._isLoading    = true;
    this._syncButtonState();

    try {
      // Login via Firebase
      await signInWithEmailAndPassword(auth, email, password);
      // Synchronize with backend — returns userId, email, role, emailVerified
      const syncData = await apiFetch('/api/auth/sync', { method: 'POST' });
      
      stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
        id:            syncData.userId,
        email:         syncData.email,
        role:          syncData.role,
        isMfaEnabled:  false,
        emailVerified: syncData.emailVerified,
      });
      eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: syncData });
      
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      if (!this._isMounted) return;

      // If sync failed but Firebase login succeeded, we must sign out to prevent a stuck session
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }

      this._errorMessage = errorHandler.getUserFriendlyMessage(err);
      
      this._isLoading = false;
      this._syncButtonState();
      this._showError(this._errorMessage);
    }
  }

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
    
    window._gsiLatestCallback = (res) => this._handleGoogleCallback(res);

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
      
      // One Tap suppression logic
      const suppressedAt = localStorage.getItem('suplilist_suppress_onetap');
      if (!suppressedAt || Date.now() - parseInt(suppressedAt, 10) > 24 * 60 * 60 * 1000) {
        window.google.accounts.id.prompt();
      }
    }
  }

  async _handleGoogleCallback(response) {
    if (!response.credential) return;

    this._errorMessage = null;
    this._isLoading = true;
    this._syncButtonState();

    try {
      const credential = GoogleAuthProvider.credential(response.credential);
      await signInWithCredential(auth, credential);
      
      // Synchronize with backend — returns userId, email, role, emailVerified
      const syncData = await apiFetch('/api/auth/sync', { method: 'POST' });
      
      stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
        id:            syncData.userId,
        email:         syncData.email,
        role:          syncData.role,
        isMfaEnabled:  false,
        emailVerified: syncData.emailVerified,
      });
      eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: syncData });
      
      // Suppress One Tap for 24 hours on successful login
      localStorage.setItem('suplilist_suppress_onetap', Date.now().toString());

      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      if (!this._isMounted) return;

      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }

      // If sync failed but Firebase login succeeded, we must sign out to prevent a stuck session
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }

      console.error('[Google Sign-In Error]', err);
      console.error('[Google Sign-In Error Code]', err.error);
      console.error('[Google Sign-In Error Message]', err.message);
      console.error('[Google Sign-In Error Data]', err.data);
      
      this._errorMessage = errorHandler.getUserFriendlyMessage(err);
      
      // Override misleading generic message for Google Sign In
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/configuration-not-found') {
        this._errorMessage = `Erro Google: ${err.code} - ${err.message}`;
      }

      this._isLoading = false;
      this._syncButtonState();
      this._showError(this._errorMessage);
    }
  }

  _syncButtonState() {
    if (!this._isMounted) return;
    const btn = this.container.querySelector('#login-submit');
    if (!btn) return;
    btn.disabled    = this._isLoading;
    btn.textContent = this._isLoading ? 'Entrando...' : 'Entrar';
  }

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
    
    if (stepCreds) stepCreds.style.display = 'none';
    if (stepMfa) stepMfa.style.display = 'none';
    if (stepDevice) stepDevice.style.display = 'none';

    if (step === 'mfa' && stepMfa) {
      stepMfa.style.display = 'block';
      const mfaCodeInput = stepMfa.querySelector('#mfa-code');
      if (mfaCodeInput) mfaCodeInput.focus();
    } else if (step === 'device' && stepDevice) {
      stepDevice.style.display = 'block';
      const devCodeInput = stepDevice.querySelector('#device-code');
      if (devCodeInput) devCodeInput.focus();
    } else if (stepCreds) {
      stepCreds.style.display = 'block';
      const emailInput = stepCreds.querySelector('#login-email');
      if (emailInput) emailInput.focus();
    }
  }
}
