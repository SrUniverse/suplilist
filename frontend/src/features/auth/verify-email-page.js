/**
 * verify-email-page.js — Verificação de e-mail por código OTP de 6 dígitos.
 *
 * Fluxo:
 *  1. Ao montar, tenta enviar o código automaticamente via
 *     POST /api/auth/send-verification-code (autenticado com token Firebase).
 *  2. Exibe campo de 6 dígitos para o usuário inserir o código recebido.
 *  3. "Verificar" → POST /api/auth/verify-email-code → marca verificado no
 *     Firebase Admin + MongoDB → sincroniza estado local → navega para /checkin.
 *  4. "Reenviar código" com cooldown de 60 s.
 *  5. "Continuar mesmo assim" → o app é local-first, verificação é opcional.
 *
 * @module features/auth/verify-email-page
 */

import { auth, signOut } from './firebase-client.js';
import { apiFetch } from '../../platform/api-client.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { errorHandler } from '../../platform/error-handler.js';

const RESEND_COOLDOWN_SECONDS = 60;

export default class VerifyEmailPage {
  constructor(container) {
    this.container = container;
    this._isMounted = false;
    this._isSubmitting = false;
    this._isSending = false;
    this._errorMessage = null;
    this._successMessage = null;
    this._timeLeft = RESEND_COOLDOWN_SECONDS;
    this._timerId = null;
    this._codeSent = false;
    this._email = auth.currentUser?.email
      || stateManager.get('user')?.email
      || '';
  }

  mount() {
    this._isMounted = true;

    const user = stateManager.get('user');

    if (!auth.currentUser) {
      if (user?.isAuthenticated) {
        this._errorMessage = 'Aguardando conexão com o servidor. Verifique sua internet.';
        this._render();
      } else {
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
      }
      return;
    }

    if (auth.currentUser.emailVerified) {
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/checkin' });
      return;
    }

    this._render();
    this._sendCode();
  }

  unmount() {
    this._isMounted = false;
    if (this._timerId) clearInterval(this._timerId);
    this._timerId = null;
    this.container.innerHTML = '';
  }

  _render() {
    const errorHtml = this._errorMessage
      ? `<div class="onboarding-error" role="alert">${escapeHtml(this._errorMessage)}</div>`
      : '';

    const successHtml = this._successMessage
      ? `<div class="onboarding-success" role="status" style="color:var(--color-success,#22c55e);background:rgba(34,197,94,0.1);border-radius:8px;padding:0.75rem 1rem;margin-top:0.75rem;font-size:0.9rem;">${escapeHtml(this._successMessage)}</div>`
      : '';

    const sentHint = this._codeSent
      ? `<p class="onboarding-subtitle" style="margin-top:0.5rem;font-size:0.85rem;color:var(--color-text-muted);">
           Enviamos um código de 6 dígitos para <strong>${escapeHtml(this._email)}</strong>.
           Verifique sua caixa de entrada (e a pasta de spam).
         </p>`
      : `<p class="onboarding-subtitle">Enviando código para <strong>${escapeHtml(this._email)}</strong>…</p>`;

    const resendLabel = this._timeLeft > 0
      ? `Reenviar código (${this._timeLeft}s)`
      : 'Reenviar código';

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card" style="text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(139,92,246,0.12);border-radius:14px;margin-bottom:1rem;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>

          <h1 class="onboarding-title">Verifique seu e-mail</h1>
          ${sentHint}

          ${errorHtml}
          ${successHtml}

          <div style="margin:1.5rem 0 0;">
            <label for="ve-code" style="display:block;text-align:left;font-size:0.85rem;font-weight:600;color:var(--color-text-secondary);margin-bottom:0.4rem;">
              Código de verificação
            </label>
            <input
              id="ve-code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              style="width:100%;box-sizing:border-box;text-align:center;font-size:1.6rem;letter-spacing:0.4rem;padding:0.7rem 1rem;border:1.5px solid var(--color-border);border-radius:10px;background:var(--color-surface-alt,#1a1a2e);color:var(--color-text);outline:none;font-family:monospace;"
              ${this._isSubmitting ? 'disabled' : ''}
            />
          </div>

          <div class="onboarding-actions" style="flex-direction:column;gap:0.75rem;margin-top:1.25rem;">
            <button id="ve-submit" class="onboarding-btn-next" style="width:100%;" ${this._isSubmitting || !this._codeSent ? 'disabled' : ''}>
              ${this._isSubmitting ? 'Verificando…' : 'Verificar'}
            </button>
            <button id="ve-resend" class="onboarding-btn-next" style="width:100%;background:transparent;border:1px solid var(--color-border);color:var(--color-text);" ${this._timeLeft > 0 || this._isSending ? 'disabled' : ''}>
              ${this._isSending ? 'Enviando…' : resendLabel}
            </button>
          </div>

          <button id="ve-skip" class="onboarding-btn-link" style="display:block;margin:1.5rem auto 0;">
            Continuar mesmo assim
          </button>
          <button id="ve-logout" class="onboarding-btn-link" style="display:block;margin:0.5rem auto 0;color:var(--color-text-muted);">
            Sair
          </button>
        </div>
      </div>`;

    this._attachListeners();
  }

  _attachListeners() {
    this.container.querySelector('#ve-submit')
      ?.addEventListener('click', () => this._handleSubmit());

    this.container.querySelector('#ve-resend')
      ?.addEventListener('click', () => this._sendCode(true));

    this.container.querySelector('#ve-skip')
      ?.addEventListener('click', () => {
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/checkin' });
      });

    this.container.querySelector('#ve-logout')
      ?.addEventListener('click', async () => {
        await signOut(auth).catch(() => {});
        stateManager.dispatch(ACTIONS.AUTH_LOGOUT, null);
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
      });

    // Submete ao pressionar Enter no campo de código
    this.container.querySelector('#ve-code')
      ?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._handleSubmit();
      });

    // Só permite dígitos no campo
    this.container.querySelector('#ve-code')
      ?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
      });
  }

  async _sendCode(isResend = false) {
    if (this._isSending) return;
    this._isSending = true;
    this._clearMessages();
    if (isResend) this._render();

    let skipPostProcess = false;
    try {
      await apiFetch('/api/auth/send-verification-code', { method: 'POST' });
      this._codeSent = true;
      this._successMessage = isResend
        ? 'Novo código enviado! Verifique sua caixa de entrada.'
        : null;
    } catch (err) {
      const code = err?.error;
      if (code === 'too_many_requests') {
        this._errorMessage = 'Aguarde 60 segundos antes de solicitar um novo código.';
      } else if (code === 'already_verified') {
        this._syncVerifiedState();
        skipPostProcess = true;
      } else {
        this._errorMessage = errorHandler.getUserFriendlyMessage(err);
      }
      if (!skipPostProcess) {
        this._codeSent = isResend ? this._codeSent : false;
      }
    } finally {
      this._isSending = false;
    }

    if (!skipPostProcess && this._isMounted) {
      this._render();
      this._startCooldown();
    }
  }

  async _handleSubmit() {
    if (this._isSubmitting || !this._codeSent) return;

    const codeInput = this.container.querySelector('#ve-code');
    const code = codeInput?.value?.trim() ?? '';

    if (!/^\d{6}$/.test(code)) {
      this._showError('Digite os 6 dígitos do código recebido.');
      return;
    }

    this._isSubmitting = true;
    this._clearMessages();
    this._render();

    try {
      await apiFetch('/api/auth/verify-email-code', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      this._syncVerifiedState();
    } catch (err) {
      if (!this._isMounted) return;
      this._isSubmitting = false;
      const apiCode = err?.error;
      if (apiCode === 'otp_expired') {
        this._errorMessage = 'Código expirado. Clique em "Reenviar código" para receber um novo.';
      } else if (apiCode === 'invalid_code') {
        this._errorMessage = 'Código incorreto. Verifique e tente novamente.';
      } else {
        this._errorMessage = errorHandler.getUserFriendlyMessage(err);
      }
      this._render();
    }
  }

  _syncVerifiedState() {
    stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
      ...stateManager.get('user'),
      emailVerified: true,
    });

    if (!this._isMounted) return;
    eventBus.emit(EVENTS.TOAST_SHOW, { message: 'E-mail verificado com sucesso!', type: 'success' });
    eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/checkin' });
  }

  _startCooldown() {
    if (this._timerId) clearInterval(this._timerId);
    this._timeLeft = RESEND_COOLDOWN_SECONDS;
    const updateBtn = () => {
      if (!this._isMounted) { clearInterval(this._timerId); return; }
      const btn = this.container.querySelector('#ve-resend');
      if (!btn) { clearInterval(this._timerId); return; }
      if (this._timeLeft <= 0) {
        clearInterval(this._timerId);
        btn.disabled = false;
        btn.textContent = 'Reenviar código';
      } else {
        btn.disabled = true;
        btn.textContent = `Reenviar código (${this._timeLeft}s)`;
        this._timeLeft--;
      }
    };
    updateBtn();
    this._timerId = setInterval(updateBtn, 1000);
  }

  _showError(message) {
    if (!this._isMounted) return;
    this._errorMessage = message;
    let el = this.container.querySelector('.onboarding-error');
    if (el) { el.textContent = message; return; }
    el = document.createElement('div');
    el.className = 'onboarding-error';
    el.setAttribute('role', 'alert');
    el.textContent = message;
    this.container.querySelector('.onboarding-subtitle')?.insertAdjacentElement('afterend', el);
  }

  _clearMessages() {
    this._errorMessage = null;
    this._successMessage = null;
  }
}
