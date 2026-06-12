/**
 * register-page.js — Tela de registro de novos usuários.
 *
 * Fluxo:
 *  1. Cria usuário no Firebase (email + senha)
 *  2. Envia email de verificação
 *  3. Chama /api/auth/sync para salvar no MongoDB
 *  4. Popula stateManager com AUTH_LOGIN
 *  5. Redireciona para /verify-email (verificação por link do Firebase, opcional)
 *
 * @module features/auth/register-page
 */

import { auth, createUserWithEmailAndPassword, sendEmailVerification, signOut } from './firebase-client.js';
import { apiFetch } from '../../platform/api-client.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { errorHandler } from '../../platform/error-handler.js';
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
      ? `<div class="onboarding-success" style="color: #4ade80; background: rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.3); border-radius:8px; padding:1rem; text-align:center; margin-bottom:1rem;" role="alert">${escapeHtml(this._successMessage)}</div>`
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
              placeholder="Senha (mín. 8 caracteres)"
              autocomplete="new-password"
              aria-label="Senha"
              style="margin-top:0.75rem"
            />
            <div style="font-size: 0.75rem; color: var(--color-text-secondary, #888); margin-top: 0.5rem; text-align: left;">
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

          <div style="margin-top:1.25rem;text-align:center;">
            <p style="font-size:0.85rem;color:var(--color-text-secondary,#888);margin-bottom:0.5rem;">Já possui uma conta?</p>
            <button id="register-goto-login" class="onboarding-btn-link" type="button">Entrar</button>
          </div>

          <!-- Login por SMS oculto até o reCAPTCHA (phone auth) ser provisionado
               no Firebase/Google Cloud. Ver [[value-loop-funnel]]. -->
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

    const btnGotoPhone = this.container.querySelector('#register-goto-phone');
    if (btnGotoPhone) {
      btnGotoPhone.addEventListener('click', () => {
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/phone-login' });
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

      // 2. Enviar email de verificação
      await sendEmailVerification(user);

      // 3. Sincronizar com o backend (cria registro no MongoDB)
      const syncData = await apiFetch('/api/auth/sync', { method: 'POST' });

      // 4. Popular stateManager — usuário autenticado (e-mail ainda não verificado).
      //    A verificação ocorre pelo link enviado por sendEmailVerification acima;
      //    não bloqueia o acesso ao app (ver auth-guard.js).
      stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
        id:            syncData.userId,
        email:         syncData.email,
        role:          syncData.role,
        isMfaEnabled:  false,
        emailVerified: syncData.emailVerified,
      });
      eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: syncData });

      if (!this._isMounted) return;

      // 5. Tela de verificação de e-mail (link do Firebase, opcional — não trava
      //    o usuário fora; ele pode "Continuar mesmo assim").
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/verify-email' });

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
