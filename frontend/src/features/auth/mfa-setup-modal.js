import { apiFetch } from '../../platform/api-client.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';

export class MfaSetupModal {
  constructor(container) {
    this.container = container;
    this._isMounted = false;
    this._qrCodeDataUrl = null;
    this._tempSecret = null;
    this._backupCodes = [];
    this._setupResponse = null;
  }

  mount() {
    this._isMounted = true;
    this._renderLoading();
    this._startSetup();
  }

  unmount() {
    this._isMounted = false;
    this.container.innerHTML = '';
  }

  _renderLoading() {
    this.container.innerHTML = `
      <div class="mfa-modal-overlay">
        <div class="mfa-modal-content">
          <h2 style="margin-top:0">Configurar Autenticação em Duas Etapas (MFA)</h2>
          <p>Preparando segurança...</p>
        </div>
      </div>
    `;
    this._injectStyles();
  }

  async _startSetup() {
    try {
      this._setupResponse = await apiFetch('/api/auth/mfa/setup', { method: 'POST' });
      
      // Dynamic import to avoid inflating the main bundle with qrcode
      const QRCode = (await import('qrcode')).default;
      
      this._qrCodeDataUrl = await QRCode.toDataURL(this._setupResponse.uri, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      if (!this._isMounted) return;
      this._renderSetup();
    } catch (err) {
      if (!this._isMounted) return;
      this.container.innerHTML = `
        <div class="mfa-modal-overlay">
          <div class="mfa-modal-content">
            <h2 style="margin-top:0">Erro</h2>
            <p>${err.message || 'Falha ao iniciar setup MFA.'}</p>
            <button id="mfa-close-btn" class="sp-btn sp-btn-outline">Fechar</button>
          </div>
        </div>
      `;
      this.container.querySelector('#mfa-close-btn').addEventListener('click', () => this.unmount());
    }
  }

  _renderSetup() {
    this.container.innerHTML = `
      <div class="mfa-modal-overlay">
        <div class="mfa-modal-content">
          <h2 style="margin-top:0">Configurar MFA</h2>
          <p style="font-size: 0.95rem; color: var(--color-text-secondary);">
            1. Abra seu aplicativo autenticador (Google Authenticator, Authy, etc).
          </p>
          <p style="font-size: 0.95rem; color: var(--color-text-secondary);">
            2. Escaneie o QR Code abaixo:
          </p>
          
          <div style="text-align: center; margin: 1.5rem 0;">
            <img src="${this._qrCodeDataUrl}" alt="MFA QR Code" style="border-radius: 8px; border: 4px solid white;">
          </div>
          
          <p style="font-size: 0.95rem; color: var(--color-text-secondary);">
            Ou insira este código manualmente: <strong style="letter-spacing: 1px;">${this._setupResponse.secret}</strong>
          </p>

          <hr style="border:none; border-top: 1px solid var(--color-border); margin: 1.5rem 0;">
          
          <p style="font-size: 0.95rem; color: var(--color-text-secondary);">
            3. Digite o código de 6 dígitos gerado pelo aplicativo para confirmar:
          </p>
          
          <form id="mfa-confirm-form" novalidate style="margin-top: 1rem;">
            <input
              id="mfa-setup-code"
              class="onboarding-input"
              type="text"
              name="code"
              placeholder="000000"
              autocomplete="one-time-code"
              inputmode="numeric"
              maxlength="6"
              style="text-align: center; letter-spacing: 0.2em; font-size: 1.2rem;"
            />
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;">
              <button type="button" id="mfa-cancel-btn" class="sp-btn sp-btn-outline">Cancelar</button>
              <button type="submit" id="mfa-verify-btn" class="sp-btn" style="background: var(--color-brand); color: white; border:none;">Verificar e Ativar</button>
            </div>
            <div id="mfa-setup-error" style="color: var(--color-error); margin-top: 1rem; font-size: 0.9rem; text-align: right;"></div>
          </form>
        </div>
      </div>
    `;

    this.container.querySelector('#mfa-cancel-btn').addEventListener('click', () => this.unmount());
    this.container.querySelector('#mfa-confirm-form').addEventListener('submit', (e) => this._handleConfirm(e));
  }

  async _handleConfirm(e) {
    e.preventDefault();
    const code = this.container.querySelector('#mfa-setup-code').value.trim();
    if (!code) return;

    const btn = this.container.querySelector('#mfa-verify-btn');
    const errDiv = this.container.querySelector('#mfa-setup-error');
    errDiv.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    try {
      const response = await apiFetch('/api/auth/mfa/confirm', {
        method: 'POST',
        body: JSON.stringify({ code })
      });

      this._backupCodes = response.backupCodes;
      this._renderBackupCodes();
    } catch (err) {
      if (!this._isMounted) return;
      errDiv.textContent = err.error === 'invalid_code' ? 'Código incorreto. Tente novamente.' : (err.message || 'Falha ao confirmar.');
      btn.disabled = false;
      btn.textContent = 'Verificar e Ativar';
    }
  }

  _renderBackupCodes() {
    const codesHtml = this._backupCodes.map(c => `<div style="background: var(--color-surface-secondary); padding: 8px 12px; border-radius: 4px; font-family: monospace; letter-spacing: 1px; font-size: 1.1rem; text-align: center; border: 1px solid var(--color-border);">${c}</div>`).join('');

    this.container.innerHTML = `
      <div class="mfa-modal-overlay">
        <div class="mfa-modal-content" style="max-width: 450px;">
          <h2 style="margin-top:0; color: #22c55e;">MFA Ativado com Sucesso! 🎉</h2>
          
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin: 1.5rem 0;">
            <p style="margin: 0 0 12px 0; color: #ef4444; font-weight: 600; font-size: 0.95rem;">
              ⚠️ Guarde seus Backup Codes!
            </p>
            <p style="margin: 0; color: var(--color-text-secondary); font-size: 0.85rem; line-height: 1.5;">
              Se você perder acesso ao seu autenticador, estes códigos serão sua <strong>ÚNICA</strong> forma de entrar na conta. Guarde-os em um lugar seguro (ex: gerenciador de senhas). Cada código só pode ser usado uma vez.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.5rem;">
            ${codesHtml}
          </div>
          
          <div style="display: flex; gap: 10px; margin-bottom: 2rem; justify-content: center;">
             <button type="button" id="mfa-copy-codes-btn" class="sp-btn sp-btn-outline" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;">📋 Copiar</button>
             <button type="button" id="mfa-download-codes-btn" class="sp-btn sp-btn-outline" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;">💾 Download</button>
          </div>

          <div style="text-align: right;">
            <button id="mfa-done-btn" class="sp-btn" style="background: var(--color-brand); color: white; border:none; width: 100%; opacity: 0.5; cursor: not-allowed;" disabled>Eu guardei os códigos. Concluir</button>
          </div>
        </div>
      </div>
    `;

    const doneBtn = this.container.querySelector('#mfa-done-btn');
    const copyBtn = this.container.querySelector('#mfa-copy-codes-btn');
    const downloadBtn = this.container.querySelector('#mfa-download-codes-btn');

    const unlockDoneButton = () => {
      doneBtn.disabled = false;
      doneBtn.style.opacity = '1';
      doneBtn.style.cursor = 'pointer';
    };

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this._backupCodes.join('\n'));
        copyBtn.textContent = '✅ Copiado!';
        unlockDoneButton();
      } catch (err) {
        console.error('Falha ao copiar', err);
      }
    });

    downloadBtn.addEventListener('click', () => {
      const blob = new Blob([this._backupCodes.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'suplilist-backup-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      downloadBtn.textContent = '✅ Baixado!';
      unlockDoneButton();
    });

    doneBtn.addEventListener('click', () => {
      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'MFA ativado com sucesso.',
        type: 'success'
      });
      this.unmount();
      // Reload profile ou disparar evento global caso seja necessário sincronizar UI
      window.location.reload(); 
    });
  }

  _injectStyles() {
    if (document.getElementById('mfa-setup-styles')) return;
    const style = document.createElement('style');
    style.id = 'mfa-setup-styles';
    style.textContent = `
      .mfa-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
      }
      .mfa-modal-content {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 24px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      }
    `;
    document.head.appendChild(style);
  }
}
