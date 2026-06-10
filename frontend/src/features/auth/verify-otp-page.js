import { identityService } from '../../platform/identity-service.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { apiFetch } from '../../platform/api-client.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';

export default class VerifyOtpPage {
  constructor(container) {
    this.container = container;
    this._isMounted = false;
    this._isLoading = false;
    this._errorMessage = null;
    this._timeLeft = 60;
    this._timerId = null;
    this._email = localStorage.getItem('pending_verification_email') || '';
  }

  mount() {
    this._isMounted = true;
    if (!this._email) {
      // Falha de segurança/UX: se não tem email guardado, volta pro login
      // Precisamos dar logout para evitar o loop infinito com o authGuard
      const user = stateManager.get('user');
      if (user?.isAuthenticated) {
        stateManager.dispatch(ACTIONS.AUTH_LOGOUT);
      }
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
      return;
    }
    this._render();
    this._startTimer();
  }

  unmount() {
    this._isMounted = false;
    if (this._timerId) clearInterval(this._timerId);
    this.container.innerHTML = '';
  }

  _render() {
    const errorHtml = this._errorMessage
      ? `<div class="onboarding-error" role="alert">${escapeHtml(this._errorMessage)}</div>`
      : '';

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <h1 class="onboarding-title">Verifique seu e-mail</h1>
          <p class="onboarding-subtitle">Enviamos um código de 6 dígitos para <strong>${escapeHtml(this._email)}</strong>.</p>
          
          ${errorHtml}
          
          <div class="otp-inputs" id="otp-inputs" style="display: flex; gap: 8px; justify-content: center; margin: 2rem 0;">
            <input type="text" maxlength="1" pattern="\\d*" inputmode="numeric" class="onboarding-input" style="width: 45px; text-align: center; font-size: 1.5rem; padding: 10px 0;" />
            <input type="text" maxlength="1" pattern="\\d*" inputmode="numeric" class="onboarding-input" style="width: 45px; text-align: center; font-size: 1.5rem; padding: 10px 0;" />
            <input type="text" maxlength="1" pattern="\\d*" inputmode="numeric" class="onboarding-input" style="width: 45px; text-align: center; font-size: 1.5rem; padding: 10px 0;" />
            <input type="text" maxlength="1" pattern="\\d*" inputmode="numeric" class="onboarding-input" style="width: 45px; text-align: center; font-size: 1.5rem; padding: 10px 0;" />
            <input type="text" maxlength="1" pattern="\\d*" inputmode="numeric" class="onboarding-input" style="width: 45px; text-align: center; font-size: 1.5rem; padding: 10px 0;" />
            <input type="text" maxlength="1" pattern="\\d*" inputmode="numeric" class="onboarding-input" style="width: 45px; text-align: center; font-size: 1.5rem; padding: 10px 0;" />
          </div>

          <div style="text-align: center; min-height: 40px; margin-bottom: 1rem;" id="success-indicator">
            <!-- Animação de sucesso será injetada aqui -->
          </div>

          <div class="onboarding-actions">
            <button id="resend-btn" class="onboarding-btn-next" style="background: transparent; border: 1px solid var(--color-border); color: var(--color-text);" disabled>
              Reenviar código (60s)
            </button>
          </div>
          <button id="cancel-btn" class="onboarding-btn-link" style="display:block; margin: 1.5rem auto 0; text-align:center;">Voltar para o Login</button>
        </div>
      </div>
    `;

    this._attachListeners();
  }

  _attachListeners() {
    const inputs = this.container.querySelectorAll('#otp-inputs input');
    const resendBtn = this.container.querySelector('#resend-btn');
    const cancelBtn = this.container.querySelector('#cancel-btn');

    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        this._clearError();
        const val = e.target.value;
        if (val.length === 1 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
        this._checkFullCode();
      });
      
      // Permitir apagar com backspace e voltar pro anterior
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value === '' && index > 0) {
          inputs[index - 1].focus();
        }
      });
    });

    resendBtn.addEventListener('click', async () => {
      await this._handleResend();
    });

    cancelBtn.addEventListener('click', () => {
      localStorage.removeItem('pending_verification_email');
      const user = stateManager.get('user');
      if (user?.isAuthenticated) {
        stateManager.dispatch(ACTIONS.AUTH_LOGOUT);
      }
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
    });

    // Foca no primeiro
    if (inputs.length > 0) inputs[0].focus();
  }

  async _checkFullCode() {
    if (this._isLoading) return;
    const inputs = this.container.querySelectorAll('#otp-inputs input');
    const code = Array.from(inputs).map(i => i.value).join('');
    
    if (code.length === 6) {
      this._isLoading = true;
      this._disableInputs(true);
      
      try {
        await identityService.verifyOtp(this._email, code);

        // Remove email pendente
        localStorage.removeItem('pending_verification_email');

        // Animação de sucesso
        if (!this._isMounted) return;
        const successIndicator = this.container.querySelector('#success-indicator');
        successIndicator.innerHTML = '<span style="color: #10b981; font-size: 2rem;">✅</span><p style="color: #10b981; margin: 0; font-size: 0.9rem;">E-mail verificado!</p>';
        
        setTimeout(() => {
          if (this._isMounted) {
            eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/my-stack' });
          }
        }, 1500);

      } catch (err) {
        if (!this._isMounted) return;
        this._isLoading = false;
        this._disableInputs(false);
        this._errorMessage = err.error === 'invalid_otp_code' ? 'Código incorreto ou expirado.' : (err.message || 'Falha na verificação.');
        this._showError(this._errorMessage);
        
        // Limpa os inputs no erro
        inputs.forEach(i => i.value = '');
        inputs[0].focus();
      }
    }
  }

  async _handleResend() {
    const resendBtn = this.container.querySelector('#resend-btn');
    resendBtn.disabled = true;
    resendBtn.innerText = 'Enviando...';

    try {
      await apiFetch('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email: this._email })
      });
      
      this._timeLeft = 60;
      this._startTimer();
      
      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Novo código enviado!',
        type: 'success'
      });
    } catch (err) {
      if (!this._isMounted) return;
      if (err.error === 'too_many_requests') {
        this._errorMessage = 'Aguarde antes de pedir outro código.';
      } else {
        this._errorMessage = 'Falha ao reenviar código.';
      }
      this._showError(this._errorMessage);
      this._timeLeft = 60; // Volta o timer pra não travar
      this._startTimer();
    }
  }

  _startTimer() {
    if (this._timerId) clearInterval(this._timerId);
    
    const resendBtn = this.container.querySelector('#resend-btn');
    if (!resendBtn) return;
    
    resendBtn.disabled = true;
    resendBtn.innerText = `Reenviar código (${this._timeLeft}s)`;
    
    this._timerId = setInterval(() => {
      this._timeLeft--;
      if (this._isMounted) {
        resendBtn.innerText = `Reenviar código (${this._timeLeft}s)`;
        if (this._timeLeft <= 0) {
          clearInterval(this._timerId);
          resendBtn.disabled = false;
          resendBtn.innerText = "Reenviar código";
        }
      } else {
        clearInterval(this._timerId);
      }
    }, 1000);
  }

  _disableInputs(disabled) {
    if (!this._isMounted) return;
    const inputs = this.container.querySelectorAll('#otp-inputs input');
    inputs.forEach(i => i.disabled = disabled);
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
    el.setAttribute('role', 'alert');
    el.textContent = message;
    const subtitle = this.container.querySelector('.onboarding-subtitle');
    if (subtitle) subtitle.insertAdjacentElement('afterend', el);
  }

  _clearError() {
    if (!this._errorMessage) return;
    this._errorMessage = null;
    const el = this.container.querySelector('.onboarding-error');
    if (el) el.remove();
  }
}
