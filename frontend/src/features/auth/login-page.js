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
import { auth, signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from './firebase-client.js';

export default class LoginPage {
  constructor(container) {
    this.container = container;
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this._listeners = new Map();
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
      } catch (e) {}
    }
    this._listeners.clear();
    this._isLoading = false;
    this._errorMessage = null;
  }

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
                style="margin-top:0.75rem"
              />
              <div class="onboarding-actions" style="margin-top:1.75rem">
                <button
                  id="login-submit"
                  data-testid="login-submit"
                  type="submit"
                  class="onboarding-btn-next"
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
                style="font-size: 0.85rem;"
              >Esqueceu a senha?</button>
            </div>

            <p class="onboarding-switch" style="text-align:center;margin-top:1.25rem;font-size:0.9rem">
              Novo por aqui?
              <button
                id="login-create-account"
                class="onboarding-btn-link"
                type="button"
              >Criar conta</button>
            </p>
          </div>
        </div>
      </div>`;

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
      const handler = () => eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/onboarding' });
      btnCreateAccount.addEventListener('click', handler);
      this._listeners.set(btnCreateAccount, { type: 'click', handler });
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
      // Synchronize with backend
      await apiFetch('/api/auth/sync', { method: 'POST' });
      
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      if (!this._isMounted) return;

      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        this._errorMessage = 'E-mail ou senha incorretos.';
      } else {
        this._errorMessage = errorHandler.getUserFriendlyMessage(err);
      }
      
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
      await apiFetch('/api/auth/sync', { method: 'POST' });
      
      // Suppress One Tap for 24 hours on successful login
      localStorage.setItem('suplilist_suppress_onetap', Date.now().toString());

      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      if (!this._isMounted) return;

      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }

      this._errorMessage = errorHandler.getUserFriendlyMessage(err);
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
}
