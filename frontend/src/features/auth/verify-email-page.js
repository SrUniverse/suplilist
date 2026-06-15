/**
 * verify-email-page.js — Verificação de e-mail via link do Firebase (opcional).
 *
 * O Firebase Auth verifica e-mail por LINK (não por código): após o cadastro,
 * `sendEmailVerification` envia um e-mail com um link; ao clicar, o Firebase
 * marca `user.emailVerified = true`. Esta tela:
 *
 *  1. Mostra para qual e-mail o link foi enviado.
 *  2. "Já verifiquei" → recarrega o usuário do Firebase (`reload()`), checa
 *     `emailVerified` e, se confirmado, sincroniza com o backend e segue.
 *  3. "Reenviar e-mail" com cooldown de 60s.
 *  4. "Continuar mesmo assim" → o app é local-first, verificação é opcional.
 *
 * Não bloqueia o uso do app: o usuário pode continuar sem verificar e um banner
 * global ([[email-verification-banner]]) o lembra até confirmar.
 *
 * @module features/auth/verify-email-page
 */

import { auth, sendEmailVerification, signOut } from './firebase-client.js';
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
    this._isLoading = false;
    this._errorMessage = null;
    this._timeLeft = RESEND_COOLDOWN_SECONDS;
    this._timerId = null;
    this._email = auth.currentUser?.email
      || stateManager.get('user')?.email
      || '';
  }

  mount() {
    this._isMounted = true;
    // Sem usuário Firebase ativo não há o que verificar → volta para o login.
    if (!auth.currentUser) {
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
      return;
    }
    // Já verificado (ex.: voltou do e-mail noutra aba) → segue direto.
    if (auth.currentUser.emailVerified) {
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/checkin' });
      return;
    }
    this._render();
    this._startCooldown();
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
          <p class="onboarding-subtitle">
            Enviamos um link de verificação para <strong>${escapeHtml(this._email)}</strong>.<br>
            Abra seu e-mail, clique no link e depois volte aqui.
          </p>

          ${errorHtml}

          <div class="onboarding-actions" style="flex-direction:column;gap:0.75rem;margin-top:1.5rem;">
            <button id="ve-check" class="onboarding-btn-next" style="width:100%;" ${this._isLoading ? 'disabled' : ''}>
              ${this._isLoading ? 'Verificando…' : 'Já verifiquei'}
            </button>
            <button id="ve-resend" class="onboarding-btn-next" style="width:100%;background:transparent;border:1px solid var(--color-border);color:var(--color-text);" disabled>
              Reenviar e-mail (${this._timeLeft}s)
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
    this.container.querySelector('#ve-check')
      ?.addEventListener('click', () => this._handleCheck());
    this.container.querySelector('#ve-resend')
      ?.addEventListener('click', () => this._handleResend());
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
  }

  async _handleCheck() {
    if (this._isLoading || !auth.currentUser) return;
    this._isLoading = true;
    this._clearError();
    this._render();

    try {
      // Recarrega o estado do usuário a partir do Firebase (pega o emailVerified).
      await auth.currentUser.reload();

      if (!auth.currentUser.emailVerified) {
        this._isLoading = false;
        if (!this._isMounted) return;
        this._render();
        this._showError('Ainda não confirmamos seu e-mail. Clique no link enviado e tente de novo.');
        return;
      }

      // Verificado: sincroniza com o backend e atualiza o estado de auth.
      const syncData = await apiFetch('/api/auth/sync', { method: 'POST' }).catch(() => null);
      stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
        id:            syncData?.userId ?? stateManager.get('user')?.id ?? auth.currentUser.uid,
        email:         syncData?.email ?? auth.currentUser.email,
        role:          syncData?.role ?? stateManager.get('user')?.role ?? 'user',
        isMfaEnabled:  false,
        emailVerified: true,
      });

      if (!this._isMounted) return;
      eventBus.emit(EVENTS.TOAST_SHOW, { message: 'E-mail verificado com sucesso!', type: 'success' });
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/checkin' });
    } catch (err) {
      if (!this._isMounted) return;
      this._isLoading = false;
      this._render();
      this._showError(errorHandler.getUserFriendlyMessage(err));
    }
  }

  async _handleResend() {
    const btn = this.container.querySelector('#ve-resend');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

    try {
      await sendEmailVerification(auth.currentUser);
      eventBus.emit(EVENTS.TOAST_SHOW, { message: 'Novo e-mail de verificação enviado!', type: 'success' });
    } catch (err) {
      if (!this._isMounted) return;
      this._showError(
        err?.code === 'auth/too-many-requests'
          ? 'Muitas tentativas. Aguarde alguns minutos antes de reenviar.'
          : errorHandler.getUserFriendlyMessage(err)
      );
    } finally {
      this._timeLeft = RESEND_COOLDOWN_SECONDS;
      this._startCooldown();
    }
  }

  _startCooldown() {
    if (this._timerId) clearInterval(this._timerId);
    const btn = this.container.querySelector('#ve-resend');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = `Reenviar e-mail (${this._timeLeft}s)`;

    this._timerId = setInterval(() => {
      if (!this._isMounted) { clearInterval(this._timerId); return; }
      this._timeLeft--;
      const b = this.container.querySelector('#ve-resend');
      if (!b) { clearInterval(this._timerId); return; }
      if (this._timeLeft <= 0) {
        clearInterval(this._timerId);
        b.disabled = false;
        b.textContent = 'Reenviar e-mail';
      } else {
        b.textContent = `Reenviar e-mail (${this._timeLeft}s)`;
      }
    }, 1000);
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

  _clearError() {
    this._errorMessage = null;
    this.container.querySelector('.onboarding-error')?.remove();
  }
}
