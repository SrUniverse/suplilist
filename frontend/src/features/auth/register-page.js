/**
 * register-page.js — Tela de registro de novos usuários.
 *
 * Fluxo (e-mail/senha):
 *  1. Cria usuário no Firebase (email + senha)
 *  2. Envia email de verificação (link do Firebase, opcional)
 *  3. Chama /api/auth/sync para salvar no MongoDB
 *  4. Popula stateManager com AUTH_LOGIN
 *  5. Redireciona para /checkin
 *
 * Também oferece cadastro via Google (GIS), espelhando a tela de login para
 * manter as duas telas de autenticação visualmente consistentes.
 *
 * @module features/auth/register-page
 */

import {
  auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
} from './firebase-client.js';
import { apiFetch } from '../../platform/api-client.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { errorHandler } from '../../platform/error-handler.js';
import { logger } from '../../utils/logger.js';
import { validateEmail, validatePassword } from '../../platform/form-validators.js';

export default class RegisterPage {
  constructor(container) {
    this.container = container;
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this._successMessage = null;
    this._listeners = new Map();
  }

  mount() {
    this._isMounted = true;
    this._render();
    this._injectGoogleGis();
  }

  unmount() {
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this._successMessage = null;
    for (const [element, { type, handler }] of this._listeners.entries()) {
      try { element.removeEventListener(type, handler); } catch (_e) { /* ignore */ }
    }
    this._listeners.clear();
    this.container.innerHTML = '';
  }

  /**
   * Ícone de olho (mostrar/ocultar senha).
   * @param {boolean} visible - true quando a senha está visível
   * @returns {string} SVG markup
   */
  static _eyeIcon(visible) {
    return visible
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }

  _render() {
    const errorHtml = this._errorMessage
      ? `<div class="onboarding-error" data-testid="register-error" role="alert" style="margin-bottom: 1.5rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 0.9rem;">${escapeHtml(this._errorMessage)}</div>`
      : '';

    const successHtml = this._successMessage
      ? `<div class="onboarding-success" style="color: #4ade80; background: rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.3); border-radius:8px; padding:1rem; text-align:center; margin-bottom:1rem;" role="alert">${escapeHtml(this._successMessage)}</div>`
      : '';

    this.container.innerHTML = `
      <div class="onboarding-wrap" style="background: radial-gradient(circle at top right, rgba(139, 92, 246, 0.1), transparent 40%), var(--color-bg-primary);">
        <div class="onboarding-card" style="box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 1px solid var(--color-border); padding: 2.5rem 2rem; position: relative; overflow: hidden;">

          <!-- Elemento decorativo (espelha a tela de login) -->
          <div style="position: absolute; top: -50px; left: -50px; width: 100px; height: 100px; background: var(--color-brand); opacity: 0.2; filter: blur(40px); border-radius: 50%;"></div>

          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; margin-bottom: 1rem;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <h1 class="onboarding-title" style="font-size: 1.75rem; letter-spacing: -0.02em;">Criar Conta</h1>
            <p class="onboarding-subtitle" style="margin-bottom: 0;">Junte-se ao SupliList de forma segura.</p>
          </div>

          ${errorHtml}
          ${successHtml}

          <div id="register-step-credentials" ${this._successMessage ? 'style="display:none;"' : ''}>
            <!-- Google Button Wrapper -->
            <div id="google-btn-wrapper" style="display: flex; justify-content: center; margin-bottom: 1.5rem; min-height: 40px; transition: transform 0.2s;"></div>

            <div style="display: flex; align-items: center; text-align: center; color: var(--color-text-muted); margin-bottom: 1.5rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">
              <hr style="flex: 1; border: none; border-top: 1px solid var(--color-border);">
              <span style="padding: 0 12px;">ou use seu e-mail</span>
              <hr style="flex: 1; border: none; border-top: 1px solid var(--color-border);">
            </div>

            <form class="register-form" novalidate>
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label for="register-email" style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">E-mail</label>
                  <input
                    id="register-email"
                    data-testid="register-email"
                    class="onboarding-input"
                    type="email"
                    name="email"
                    placeholder="voce@exemplo.com"
                    autocomplete="email"
                    aria-label="E-mail"
                    aria-required="true"
                    style="padding: 0.875rem 1rem;"
                  />
                </div>
                <div>
                  <label for="register-password" style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Senha</label>
                  <div style="position: relative;">
                    <input
                      id="register-password"
                      data-testid="register-password"
                      class="onboarding-input"
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      autocomplete="new-password"
                      aria-label="Senha"
                      aria-required="true"
                      style="padding: 0.875rem 2.75rem 0.875rem 1rem; width: 100%;"
                    />
                    <button
                      id="register-toggle-password"
                      type="button"
                      aria-label="Mostrar senha"
                      aria-pressed="false"
                      tabindex="-1"
                      style="position: absolute; right: 0; top: 0; bottom: 0; width: 2.75rem; display: flex; align-items: center; justify-content: center; background: none; border: none; color: var(--color-text-muted); cursor: pointer;"
                    >${RegisterPage._eyeIcon(false)}</button>
                  </div>
                  <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.5rem;">
                    Mínimo 8 caracteres, com número e símbolo.
                  </p>
                </div>
              </div>

              <div class="onboarding-actions" style="margin-top: 2rem;">
                <button
                  id="register-submit"
                  data-testid="register-submit"
                  type="submit"
                  class="onboarding-btn-next"
                  style="width: 100%; padding: 0.875rem; font-weight: 700; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);"
                  aria-label="Cadastrar"
                  ${this._isLoading ? 'disabled' : ''}
                >
                  ${this._isLoading ? '<span class="spinner" style="display:inline-block; width:1rem; height:1rem; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 1s linear infinite; vertical-align:middle; margin-right:8px;"></span> Criando...' : 'Cadastrar'}
                </button>
              </div>
            </form>

            <div style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--color-text-secondary);">
              Já possui uma conta?
              <button
                id="register-goto-login"
                type="button"
                aria-label="Entrar"
                style="background: none; border: none; color: var(--color-text-primary); font-weight: 700; cursor: pointer; padding: 12px 8px; margin: -12px -8px; text-decoration: underline; text-decoration-color: var(--color-brand); text-underline-offset: 4px;"
              >Entrar</button>
            </div>

            <!-- Login por SMS oculto até o reCAPTCHA (phone auth) ser provisionado
                 no Firebase/Google Cloud. Ver [[value-loop-funnel]]. -->
          </div>
        </div>
      </div>
      <style>
        @keyframes spin { 100% { transform: rotate(360deg); } }
        #google-btn-wrapper:hover { transform: translateY(-1px); }
      </style>`;

    this._attachListeners();
  }

  _on(element, type, handler) {
    if (!element) return;
    element.addEventListener(type, handler);
    this._listeners.set(element, { type, handler });
  }

  _attachListeners() {
    const form = this.container.querySelector('.register-form');
    if (form) {
      form.querySelectorAll('input').forEach(input => {
        this._on(input, 'input', () => this._clearError());
      });
      this._on(form, 'submit', e => this._handleSubmit(e));
    }

    this._on(this.container.querySelector('#register-goto-login'), 'click', () => {
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
    });

    const btnTogglePassword = this.container.querySelector('#register-toggle-password');
    const passwordInput = this.container.querySelector('#register-password');
    if (btnTogglePassword && passwordInput) {
      this._on(btnTogglePassword, 'click', () => {
        const willShow = passwordInput.type === 'password';
        passwordInput.type = willShow ? 'text' : 'password';
        btnTogglePassword.setAttribute('aria-pressed', String(willShow));
        btnTogglePassword.setAttribute('aria-label', willShow ? 'Ocultar senha' : 'Mostrar senha');
        btnTogglePassword.innerHTML = RegisterPage._eyeIcon(willShow);
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
      // 1. Criar usuário no Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Enviar email de verificação (best-effort — não bloqueia o cadastro)
      await sendEmailVerification(user).catch((err) =>
        logger.warn('[RegisterPage] sendEmailVerification falhou', err)
      );

      // 3. Sincronizar com o backend (cria registro no MongoDB)
      const syncData = await apiFetch('/api/auth/sync', { method: 'POST' });

      // 4. Popular stateManager — usuário autenticado (e-mail ainda não verificado).
      stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
        id:            syncData.userId,
        email:         syncData.email,
        role:          syncData.role,
        isMfaEnabled:  false,
        emailVerified: syncData.emailVerified,
      });
      eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: syncData });

      if (!this._isMounted) return;

      // 5. Entra direto no Check-in (uso diário principal). O banner global
      //    lembra de verificar o e-mail.
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/checkin' });

    } catch (err) {
      if (!this._isMounted) return;

      // Se o Firebase criou o usuário mas algo deu errado depois, fazer logout
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }

      this._errorMessage = errorHandler.getUserFriendlyMessage(err);
      this._isLoading = false;
      this._syncButtonState();
      this._showError(this._errorMessage);
    }
  }

  // ─── Cadastro via Google (GIS) ────────────────────────────────────────────
  // Espelha login-page.js. O fluxo Google é idêntico para login e cadastro:
  // signInWithCredential cria a conta se ela ainda não existir.

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
        text: 'signup_with',
        width: 300,
      });
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

      const syncData = await apiFetch('/api/auth/sync', { method: 'POST' });

      stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
        id:            syncData.userId,
        email:         syncData.email,
        role:          syncData.role,
        isMfaEnabled:  false,
        emailVerified: syncData.emailVerified,
      });
      eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: syncData });

      localStorage.setItem('suplilist_suppress_onetap', Date.now().toString());

      if (!this._isMounted) return;
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/checkin' });
    } catch (err) {
      if (!this._isMounted) return;

      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }

      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }

      logger.error('[RegisterPage] Google Sign-Up Error', { code: err.code, message: err.message });
      this._errorMessage = errorHandler.getUserFriendlyMessage(err);
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
