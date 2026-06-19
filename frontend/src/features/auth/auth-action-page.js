import { auth } from './firebase-client.js';
import { verifyPasswordResetCode, confirmPasswordReset, applyActionCode, signInWithEmailAndPassword } from 'firebase/auth';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { logger } from '../../utils/logger.js';
import { apiClient } from '../../platform/api-client.js';
import { validatePassword } from '../../platform/form-validators.js';

export default class AuthActionPage {
  constructor(container, params = {}) {
    this.container = container;
    this._isMounted = false;
    this._isLoading = true;
    this._error = null;
    this._success = false;

    // Parse URL params since Firebase appends them to the URL
    const urlParams = new URLSearchParams(window.location.search);
    this._mode = urlParams.get('mode') || params.mode;
    this._oobCode = urlParams.get('oobCode') || params.oobCode;
    this._apiKey = urlParams.get('apiKey') || params.apiKey;
    this._emailToSignIn = null;
  }

  async mount() {
    this._isMounted = true;
    this._render();

    if (!this._mode || !this._oobCode) {
      this._error = "Link inválido ou expirado. Por favor, solicite um novo link.";
      this._isLoading = false;
      this._render();
      return;
    }

    try {
      if (this._mode === 'resetPassword') {
        // Verify code first to extract the email
        this._emailToSignIn = await verifyPasswordResetCode(auth, this._oobCode);
        this._isLoading = false;
        this._render(); // Show the new password form
      } else if (this._mode === 'verifyEmail') {
        await applyActionCode(auth, this._oobCode);
        this._isLoading = false;
        this._success = true;
        this._render();
        
        // Auto-redirect to home after a few seconds if user is logged in
        setTimeout(() => {
          if (this._isMounted) {
             eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/' });
          }
        }, 3000);
      } else {
        throw new Error('Ação não suportada');
      }
    } catch (err) {
      logger.error('[AuthActionPage] Error processing action:', err);
      this._isLoading = false;
      this._error = "O link expirou ou já foi utilizado. Solicite um novo link de recuperação/verificação.";
      this._render();
    }
  }

  unmount() {
    this._isMounted = false;
    this.container.innerHTML = '';
  }

  _render() {
    if (!this._isMounted) return;

    let contentHtml = '';

    if (this._isLoading) {
      contentHtml = `
        <div style="text-align: center;">
          <div class="spinner" style="display:inline-block; width:2rem; height:2rem; border:3px solid var(--color-border); border-top-color:var(--color-brand); border-radius:50%; animation:spin 1s linear infinite;"></div>
          <p style="margin-top: 1rem; color: var(--color-text-secondary);">Processando...</p>
        </div>
      `;
    } else if (this._error) {
      contentHtml = `
        <div class="onboarding-error" role="alert" style="margin-bottom: 1.5rem;">
          ${this._error}
        </div>
        <button id="action-back-login" class="onboarding-btn-next" style="width: 100%;">Voltar para o Login</button>
      `;
    } else if (this._success) {
      contentHtml = `
        <div class="onboarding-success" role="alert" style="color: #10b981; text-align: center; padding: 1.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
          <h2 style="font-size: 1.25rem; margin-bottom: 0.5rem;">E-mail Verificado!</h2>
          <p>Sua conta foi verificada com sucesso. Redirecionando...</p>
        </div>
        <button id="action-home" class="onboarding-btn-next" style="width: 100%; margin-top: 1.5rem;">Ir para o Início</button>
      `;
    } else if (this._mode === 'resetPassword') {
      contentHtml = `
        <h1 class="onboarding-title">Nova Senha</h1>
        <p class="onboarding-subtitle">Redefinindo senha para <strong>${this._emailToSignIn}</strong></p>
        
        <form class="reset-password-form" novalidate>
          <div style="margin-bottom: 1rem;">
            <label for="new-password" style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Nova Senha</label>
            <input
              id="new-password"
              class="onboarding-input"
              type="password"
              name="password"
              placeholder="••••••••"
              autocomplete="new-password"
              minlength="8"
              required
            />
            <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.5rem;">
              Mínimo 8 caracteres, com número e símbolo.
            </div>
          </div>
          <button
            type="submit"
            class="onboarding-btn-next"
            id="reset-submit-btn"
            style="width: 100%; margin-top: 1rem;"
          >
            Salvar e Entrar
          </button>
        </form>
      `;
    }

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          ${contentHtml}
        </div>
      </div>
      <style>
        @keyframes spin { 100% { transform: rotate(360deg); } }
      </style>
    `;

    this._attachListeners();
  }

  _attachListeners() {
    const backBtn = this.container.querySelector('#action-back-login');
    if (backBtn) {
      backBtn.addEventListener('click', () => eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' }));
    }

    const homeBtn = this.container.querySelector('#action-home');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/' }));
    }

    const form = this.container.querySelector('.reset-password-form');
    if (form) {
      form.addEventListener('submit', (e) => this._handleResetSubmit(e));
    }
  }

  async _handleResetSubmit(e) {
    e.preventDefault();
    const password = this.container.querySelector('#new-password').value;

    // Mesma política do cadastro (8+ caracteres, número e símbolo) para que a
    // senha redefinida sempre passe na validação de login.
    const passwordErr = validatePassword(password);
    if (passwordErr) {
      eventBus.emit('toast:show', { message: passwordErr, type: 'error' });
      return;
    }

    const btn = this.container.querySelector('#reset-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="display:inline-block; width:1rem; height:1rem; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 1s linear infinite; vertical-align:middle; margin-right:8px;"></span> Salvando...';

    try {
      // 1. Confirm the password reset
      await confirmPasswordReset(auth, this._oobCode, password);
      
      // 2. Automatically log the user in to get an ID token
      btn.innerHTML = 'Protegendo conta...';
      const userCredential = await signInWithEmailAndPassword(auth, this._emailToSignIn, password);
      const token = await userCredential.user.getIdToken();
      
      // 3. Call backend to revoke all other refresh tokens (kick out attackers)
      await apiClient.post('/api/auth/revoke-sessions', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // 4. Force signout on this device too (forces manual login with new credentials)
      await auth.signOut();
      
      this._success = false;
      this._error = null;
      this._isLoading = false;
      
      this.container.innerHTML = `
        <div class="onboarding-wrap">
          <div class="onboarding-card">
            <div class="onboarding-success" role="alert" style="color: #10b981; text-align: center; padding: 1.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
              <h2 style="font-size: 1.25rem; margin-bottom: 0.5rem;">Senha Alterada!</h2>
              <p>Por motivos de segurança, você foi desconectado de todos os dispositivos. Por favor, volte ao aplicativo e faça login com sua nova senha.</p>
            </div>
            <button id="action-home" class="onboarding-btn-next" style="width: 100%; margin-top: 1.5rem;">Ir para o Início</button>
          </div>
        </div>
      `;
      
      const homeBtn = this.container.querySelector('#action-home');
      if (homeBtn) {
        homeBtn.addEventListener('click', () => eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/' }));
      }
      
    } catch (err) {
      logger.error('[AuthActionPage] Error confirming password reset:', err);
      btn.disabled = false;
      btn.innerHTML = 'Salvar e Entrar';
      
      if (err.code === 'auth/weak-password') {
        eventBus.emit('toast:show', { message: 'A senha é muito fraca.', type: 'error' });
      } else {
        eventBus.emit('toast:show', { message: 'Ocorreu um erro ao salvar a senha. Tente novamente.', type: 'error' });
      }
    }
  }
}
