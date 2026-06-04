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
    this._render();
  }

  unmount() {
    this._isMounted = false;
    // Limpar referências de dados para evitar flash de estado antigo em re-mounts.
    this._isLoading = false;
    this._errorMessage = null;
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
      </div>`;

    this._attachListeners();
  }

  // ── Listeners ────────────────────────────────────────────────────────────────

  _attachListeners() {
    const form = this.container.querySelector('.login-form');

    // Limpar erro ao digitar em qualquer campo.
    form.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => this._clearError());
    });

    form.addEventListener('submit', e => this._handleSubmit(e));

    const btnCreateAccount = this.container.querySelector('#login-create-account');
    if (btnCreateAccount) {
      btnCreateAccount.addEventListener('click', () => {
        // Navega para o onboarding via EventBus — sem mutação de estado externo.
        eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/onboarding' });
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
      await identityService.login(email, password);
      // Após login bem-sucedido, o router destruirá este componente.
      // Nenhuma mutação de DOM deve ocorrer após esta linha.
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
    } catch (err) {
      // Guard: o router pode ter navegado enquanto o request estava em voo.
      if (!this._isMounted) return;

      this._errorMessage = err.message || 'Falha ao conectar. Tente novamente.';
      this._isLoading    = false;
      this._syncButtonState();
      this._showError(this._errorMessage);
    }
    // Sem bloco finally — reverter _isLoading só faz sentido em caso de erro
    // (tratado acima). Em caso de sucesso, o componente será desmontado.
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
}
