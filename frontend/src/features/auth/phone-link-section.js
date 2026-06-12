/**
 * phone-link-section.js — Vincular/verificar um número de telefone à conta atual.
 *
 * Diferente do login por SMS ([[phone-login-page]], que autentica via telefone),
 * aqui o usuário JÁ está logado (tipicamente por e-mail/Google) e quer vincular
 * um telefone verificado à sua conta. Usa Firebase `linkWithPhoneNumber`
 * (RecaptchaVerifier invisível + SMS OTP). Após confirmar o código, o telefone
 * fica vinculado e verificado em `auth.currentUser.phoneNumber`.
 *
 * Componente auto-contido: renderiza dentro de um container, gerencia seus
 * próprios listeners e o ciclo do reCAPTCHA. Chame `mount()` e `unmount()`.
 *
 * @module features/auth/phone-link-section
 */

import { auth, linkWithPhoneNumber, RecaptchaVerifier } from './firebase-client.js';
import { apiFetch } from '../../platform/api-client.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { errorHandler } from '../../platform/error-handler.js';

export class PhoneLinkSection {
  constructor(container) {
    this.container = container;
    this._step = 'idle';          // 'idle' | 'code'
    this._isLoading = false;
    this._error = null;
    this._phone = '';
    this._confirmationResult = null;
    this._recaptcha = null;
  }

  mount() {
    this._render();
  }

  unmount() {
    this._clearRecaptcha();
    if (this.container) this.container.innerHTML = '';
  }

  _clearRecaptcha() {
    if (this._recaptcha) {
      try { this._recaptcha.clear(); } catch { /* ignore */ }
      this._recaptcha = null;
    }
  }

  _render() {
    if (!this.container) return;
    const linked = auth.currentUser?.phoneNumber;
    const errorHtml = this._error
      ? `<div class="onboarding-error" role="alert" style="margin:8px 0 0;">${escapeHtml(this._error)}</div>`
      : '';

    if (linked) {
      this.container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-size:13px;color:var(--color-text-secondary);">
            Telefone verificado: <strong style="color:var(--color-text-primary);">${escapeHtml(linked)}</strong>
          </span>
          <span style="color:#10b981;font-size:13px;font-weight:700;">✓</span>
        </div>`;
      return;
    }

    if (this._step === 'idle') {
      this.container.innerHTML = `
        <p style="font-size:13px;color:var(--color-text-secondary);margin:0 0 10px;line-height:1.5;">
          Vincule um telefone para verificação extra e recuperação de acesso por SMS.
        </p>
        <div style="display:flex;gap:8px;align-items:center;">
          <select id="pl-country" class="onboarding-input" style="max-width:90px;padding-right:0.25rem;">
            <option value="+55">🇧🇷 +55</option>
            <option value="+1">🇺🇸 +1</option>
            <option value="+351">🇵🇹 +351</option>
            <option value="+54">🇦🇷 +54</option>
          </select>
          <input id="pl-number" class="onboarding-input" type="tel" inputmode="numeric"
            placeholder="(11) 99999-9999" autocomplete="tel" aria-label="Número de telefone" style="flex:1;" />
        </div>
        <div id="pl-recaptcha"></div>
        <button id="pl-send" style="margin-top:12px;width:100%;background:var(--color-brand);color:#fff;border:none;border-radius:10px;padding:11px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;" ${this._isLoading ? 'disabled' : ''}>
          ${this._isLoading ? 'Enviando…' : 'Vincular telefone'}
        </button>
        ${errorHtml}`;
      this.container.querySelector('#pl-send')?.addEventListener('click', () => this._handleSend());
    } else {
      this.container.innerHTML = `
        <p style="font-size:13px;color:var(--color-text-secondary);margin:0 0 10px;">
          Código enviado para <strong style="color:var(--color-text-primary);">${escapeHtml(this._phone)}</strong>.
        </p>
        <input id="pl-code" class="onboarding-input" type="text" inputmode="numeric" maxlength="6"
          placeholder="Código de 6 dígitos" autocomplete="one-time-code"
          style="letter-spacing:0.3em;text-align:center;font-size:1.25rem;" />
        <button id="pl-confirm" style="margin-top:12px;width:100%;background:var(--color-brand);color:#fff;border:none;border-radius:10px;padding:11px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;" ${this._isLoading ? 'disabled' : ''}>
          ${this._isLoading ? 'Verificando…' : 'Confirmar código'}
        </button>
        <button id="pl-back" style="margin-top:8px;width:100%;background:transparent;border:none;color:var(--color-text-muted);font-size:13px;cursor:pointer;font-family:inherit;">Usar outro número</button>
        ${errorHtml}`;
      this.container.querySelector('#pl-confirm')?.addEventListener('click', () => this._handleConfirm());
      this.container.querySelector('#pl-back')?.addEventListener('click', () => {
        this._step = 'idle'; this._confirmationResult = null; this._error = null;
        this._clearRecaptcha(); this._render();
      });
    }
  }

  async _handleSend() {
    if (!auth.currentUser) { this._setError('Você precisa estar logado para vincular um telefone.'); return; }
    const country = this.container.querySelector('#pl-country')?.value || '+55';
    const raw = (this.container.querySelector('#pl-number')?.value || '').replace(/\D/g, '');
    if (!raw || raw.length < 8) { this._setError('Digite um número de telefone válido.'); return; }

    this._phone = `${country}${raw}`;
    this._isLoading = true; this._error = null; this._render();

    try {
      if (!this._recaptcha) {
        this._recaptcha = new RecaptchaVerifier(auth, 'pl-recaptcha', { size: 'invisible', callback: () => {} });
      }
      this._confirmationResult = await linkWithPhoneNumber(auth.currentUser, this._phone, this._recaptcha);
      this._step = 'code'; this._isLoading = false; this._render();
    } catch (err) {
      this._clearRecaptcha();
      this._isLoading = false;
      this._setError(
        err?.code === 'auth/credential-already-in-use' || err?.code === 'auth/account-exists-with-different-credential'
          ? 'Este telefone já está vinculado a outra conta.'
          : errorHandler.getUserFriendlyMessage(err)
      );
    }
  }

  async _handleConfirm() {
    const code = (this.container.querySelector('#pl-code')?.value || '').trim();
    if (code.length !== 6) { this._setError('Digite o código de 6 dígitos recebido por SMS.'); return; }
    if (!this._confirmationResult) { this._step = 'idle'; this._render(); return; }

    this._isLoading = true; this._error = null; this._render();
    try {
      await this._confirmationResult.confirm(code);
      // Best-effort: sincroniza o telefone com o backend.
      await apiFetch('/api/auth/sync', { method: 'POST' }).catch(() => {});
      this._clearRecaptcha();
      this._step = 'idle'; this._isLoading = false;
      this._render();
      eventBus.emit(EVENTS.TOAST_SHOW, { message: 'Telefone vinculado e verificado!', type: 'success' });
    } catch (err) {
      this._isLoading = false;
      this._setError(
        err?.code === 'auth/invalid-verification-code'
          ? 'Código incorreto. Verifique o SMS e tente novamente.'
          : errorHandler.getUserFriendlyMessage(err)
      );
    }
  }

  _setError(msg) {
    this._error = msg;
    this._render();
  }
}
