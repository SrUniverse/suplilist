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

// CLOSURE: Variável isolada na memória para reter o Token Pre-Auth do MFA.
// Nunca tocará no localStorage ou sessionStorage para evitar vazamento via XSS.
let _mfaPreAuthToken = null;

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
  }

  // ── Ciclo de vida ────────────────────────────────────────────────────────────

  mount() {
    this._isMounted = true;
    _mfaPreAuthToken = null; // Clean up on mount
    this._render();
    this._injectGoogleGis();
  }

  unmount() {
    this._isMounted = false;
    // Limpar referências de dados para evitar flash de estado antigo em re-mounts.
    this._isLoading = false;
    this._errorMessage = null;
    _mfaPreAuthToken = null; // Clean memory on unmount to kill the token
    this.container.innerHTML = '';
  }

  // ── Renderização ─────────────────────────────────────────────────────────────

  _render() {
    const errorHtml = this._errorMessage
      ? `<div class="onboarding-error" data-testid="login-error" role="alert">${escapeHtml(this._errorMessage)}</div>`
      : '';

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
            <p class="onboarding-switch" style="text-align:center;margin-top:1.25rem;font-size:0.9rem">
              Novo por aqui?
              <button
                id="login-create-account"
                class="onboarding-btn-link"
                type="button"
              >Criar conta</button>
            </p>
          </div>

          <div id="login-step-mfa" style="display: none;">
            <p style="text-align: center; font-size: 0.95rem; margin-bottom: 1rem; color: #e4e4e7;">
              Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador.
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
                style="text-align: center; letter-spacing: 0.2em; font-size: 1.2rem;"
              />
              <div class="onboarding-actions" style="margin-top:1.75rem">
                <button
                  id="mfa-submit"
                  data-testid="mfa-submit"
                  type="submit"
                  class="onboarding-btn-next"
                >
                  Verificar
                </button>
              </div>
            </form>
            <button id="mfa-cancel" class="onboarding-btn-link" style="display:block; margin: 1.5rem auto 0; text-align:center;">Voltar</button>
          </div>
        </div>
      </div>`;

    this._attachListeners();
  }

  // ── Listeners ────────────────────────────────────────────────────────────────

  _attachListeners() {
    const form = this.container.querySelector('.login-form');
    const mfaForm = this.container.querySelector('.mfa-form');

    // Limpar erro ao digitar em qualquer campo.
    this.container.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => this._clearError());
    });

    form.addEventListener('submit', e => this._handleSubmit(e));
    mfaForm.addEventListener('submit', e => this._handleMfaSubmit(e));

    const btnCreateAccount = this.container.querySelector('#login-create-account');
    if (btnCreateAccount) {
      btnCreateAccount.addEventListener('click', () => {
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/onboarding' });
      });
    }

    const btnMfaCancel = this.container.querySelector('#mfa-cancel');
    if (btnMfaCancel) {
      btnMfaCancel.addEventListener('click', () => {
        _mfaPreAuthToken = null; // Clean up token on cancel
        this._showStep('credentials');
      });
    }
  }

  // ── Lógica de submit ─────────────────────────────────────────────────────────

  /**
   * Processa o envio do formulário de login.
   *
   * Fluxo:
   *  1. Coleta credenciais.
   *  2. Ativa estado de loading.
   *  3. Chama identityService.login() — que internamente faz:
   *       POST /api/auth/login → setAccessToken → GET /api/profile/me → dispatch AUTH_LOGIN.
   *  4a. Sucesso: emite navegação para /home.
   *       O router destrói este componente — nenhuma mutação de DOM após este ponto.
   *  4b. Falha: verifica _isMounted antes de atualizar UI.
   *
   * @param {SubmitEvent} e
   */
  async _handleSubmit(e) {
    e.preventDefault();

    const form = this.container.querySelector('.login-form');
    const email    = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;

    this._errorMessage = null;
    this._isLoading    = true;
    this._syncButtonState();

    try {
      const result = await identityService.login(email, password);
      
      if (result.status === 'mfa_required') {
        _mfaPreAuthToken = result.mfaToken;
        this._showStep('mfa');
        this._isLoading = false;
        this._syncButtonState();
        return;
      }

      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      if (!this._isMounted) return;
      this._errorMessage = err.message || 'Falha ao conectar. Tente novamente.';
      this._isLoading = false;
      this._syncButtonState();
      this._showError(this._errorMessage);
    }
  }

  async _handleMfaSubmit(e) {
    e.preventDefault();
    if (!_mfaPreAuthToken) return;

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
      const identity = await apiFetch('/api/profile/me');
      
      // We cannot call identityService.#commitLogin since it's private,
      // but initializeSession() will naturally do it if we just call it.
      await identityService.initializeSession();

      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      if (!this._isMounted) return;
      this._errorMessage = err.error === 'invalid_code' ? 'Código incorreto.' : (err.message || 'Falha na verificação.');
      
      if (err.error === 'too_many_attempts') {
        _mfaPreAuthToken = null; // Burn it
        this._showStep('credentials'); // Force restart
      }

      btn.disabled = false;
      btn.textContent = 'Verificar';
      this._showError(this._errorMessage);
    }
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
    
    // In strict compliance with Google UX guidelines
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (res) => this._handleGoogleCallback(res),
      cancel_on_tap_outside: false,
    });

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
      const result = await identityService.googleAuth(response.credential);
      
      if (result.status === 'mfa_required') {
        _mfaPreAuthToken = result.mfaToken;
        this._showStep('mfa');
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

      this._errorMessage = err.message || 'Falha ao conectar via Google.';
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
    
    if (step === 'mfa') {
      stepCreds.style.display = 'none';
      stepMfa.style.display = 'block';
      const mfaCodeInput = stepMfa.querySelector('[name="code"]');
      if (mfaCodeInput) mfaCodeInput.focus();
    } else {
      stepMfa.style.display = 'none';
      stepCreds.style.display = 'block';
    }
  }
}
