import { stateManager, ACTIONS, STORAGE_KEYS } from '../state/state-manager.js';

export default class SettingsPage {
  constructor(container, params) {
    this.container = container;
    this.params = params;
  }

  mount() {
    this._injectStyles();
    this.container.innerHTML = this._render();
    this._bindEvents();
  }

  unmount() {
    this.container.innerHTML = '';
  }

  _injectStyles() {
    if (document.getElementById('settings-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'settings-page-styles';
    style.textContent = `
      .sp-page {
        padding: 24px;
        max-width: 700px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        margin: 0 auto;
      }

      .sp-header h1 {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--color-text-primary);
        margin: 0 0 6px 0;
      }

      .sp-header p {
        color: var(--color-text-secondary);
        margin: 0;
        font-size: 15px;
      }

      .sp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 24px;
      }

      .sp-section-label {
        text-transform: uppercase;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.07em;
        color: var(--color-text-muted);
        margin: 0 0 16px 0;
      }

      /* Toggle rows */
      .sp-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border);
      }

      .sp-toggle-row:last-of-type {
        border-bottom: none;
      }

      .sp-toggle-label {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        color: var(--color-text-primary);
      }

      .sp-toggle-icon {
        font-size: 18px;
        line-height: 1;
      }

      /* Switch pill */
      .sp-switch {
        position: relative;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
      }

      .sp-switch input {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
      }

      .sp-switch-track {
        position: absolute;
        inset: 0;
        background: var(--color-surface-secondary);
        border: 1.5px solid var(--color-border-strong);
        border-radius: 999px;
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease;
      }

      .sp-switch input:checked + .sp-switch-track {
        background: var(--color-brand);
        border-color: var(--color-brand);
      }

      .sp-switch-track::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }

      .sp-switch input:checked + .sp-switch-track::after {
        transform: translateX(20px);
      }

      /* Notif note */
      .sp-notif-note {
        font-size: 12px;
        color: var(--color-text-muted);
        margin: 12px 0 0 0;
      }

      /* Privacy highlight box */
      .sp-privacy-box {
        background: var(--color-brand-muted);
        border: 1px solid color-mix(in srgb, var(--color-brand) 30%, transparent);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 20px;
        font-size: 14px;
        color: var(--color-text-secondary);
        line-height: 1.5;
      }

      /* Action rows */
      .sp-action-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border);
      }

      .sp-action-row:last-of-type {
        border-bottom: none;
      }

      .sp-action-label {
        font-size: 15px;
        color: var(--color-text-primary);
      }

      /* Buttons */
      .sp-btn {
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
        background: transparent;
      }

      .sp-btn-outline {
        border: 1.5px solid var(--color-border-strong);
        color: var(--color-text-primary);
      }

      .sp-btn-outline:hover {
        border-color: var(--color-brand);
        color: var(--color-brand);
      }

      .sp-btn-danger {
        border: 1.5px solid var(--color-error);
        color: var(--color-error);
      }

      .sp-btn-danger:hover {
        background: color-mix(in srgb, var(--color-error) 10%, transparent);
      }

      /* About version */
      .sp-version {
        font-size: 13px;
        color: var(--color-text-muted);
        margin: 0 0 20px 0;
      }

      /* Legal link rows */
      .sp-link-btn {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        border-radius: 10px;
        border: 1px solid var(--color-border);
        margin-bottom: 8px;
        background: transparent;
        cursor: pointer;
        font-size: 15px;
        color: var(--color-text-primary);
        text-align: left;
        transition: border-color 0.15s ease, background 0.15s ease;
        box-sizing: border-box;
      }

      .sp-link-btn:last-child {
        margin-bottom: 0;
      }

      .sp-link-btn:hover {
        border-color: var(--color-brand);
        background: var(--color-surface-secondary);
      }

      .sp-link-arrow {
        color: var(--color-text-muted);
        font-size: 14px;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  _getThemeState() {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored) return stored === 'dark';
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  _getBoolPref(key) {
    return localStorage.getItem(key) === 'true';
  }

  _switchHTML(id, checked, label, icon) {
    return `
      <div class="sp-toggle-row">
        <span class="sp-toggle-label">
          <span class="sp-toggle-icon" id="${id}-icon">${icon}</span>
          ${label}
        </span>
        <label class="sp-switch" aria-label="${label}">
          <input type="checkbox" id="${id}"${checked ? ' checked' : ''}>
          <span class="sp-switch-track"></span>
        </label>
      </div>
    `;
  }

  _render() {
    const isDark = this._getThemeState();
    const notifCheckin = this._getBoolPref('suplilist:notif-checkin');
    const notifRestock = this._getBoolPref('suplilist:notif-restock');

    return `
      <div class="sp-page">

        <!-- Header -->
        <div class="sp-header">
          <h1>Configurações</h1>
          <p>Preferências do app, dados e privacidade</p>
        </div>

        <!-- Aparência -->
        <div class="sp-card">
          <h2 class="sp-section-label">Aparência</h2>
          ${this._switchHTML('sp-theme-toggle', isDark, 'Tema escuro', isDark ? '🌙' : '☀️')}
        </div>

        <!-- Notificações -->
        <div class="sp-card">
          <h2 class="sp-section-label">Notificações</h2>
          ${this._switchHTML('sp-notif-checkin', notifCheckin, 'Lembrete diário de check-in', '💊')}
          ${this._switchHTML('sp-notif-restock', notifRestock, 'Alertas de reposição de estoque', '📦')}
          <p class="sp-notif-note">Notificações são locais e não requerem cadastro. Nada é enviado para servidores.</p>
        </div>

        <!-- Dados & Privacidade -->
        <div class="sp-card">
          <h2 class="sp-section-label">Dados &amp; Privacidade</h2>
          <div class="sp-privacy-box">
            🔒 Seus dados ficam 100% no seu dispositivo. Não temos servidores e nunca coletamos informações pessoais. (LGPD)
          </div>
          <div class="sp-action-row">
            <span class="sp-action-label">Exportar meus dados</span>
            <button class="sp-btn sp-btn-outline" id="sp-export-btn">Exportar</button>
          </div>
          <div class="sp-action-row">
            <span class="sp-action-label">Limpar histórico de check-ins</span>
            <button class="sp-btn sp-btn-outline" id="sp-clear-checkins-btn">Limpar</button>
          </div>
          <div class="sp-action-row">
            <span class="sp-action-label">Resetar tudo</span>
            <button class="sp-btn sp-btn-danger" id="sp-reset-btn">Resetar</button>
          </div>
        </div>

        <!-- Sobre & Legal -->
        <div class="sp-card">
          <h2 class="sp-section-label">Sobre &amp; Legal</h2>
          <p class="sp-version">SupliList v4.0.0 · Feito com ❤️ e ciência</p>
          <button class="sp-link-btn" data-hash="#/faq">
            <span>❓ Perguntas Frequentes (FAQ)</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-hash="#/legal?doc=termos">
            <span>📋 Termos de Uso</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-hash="#/legal?doc=privacidade">
            <span>🔒 Política de Privacidade</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-hash="#/legal?doc=medico">
            <span>⚕️ Aviso Médico</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-hash="#/legal?doc=afiliados">
            <span>🔗 Divulgação de Afiliados</span>
            <span class="sp-link-arrow">→</span>
          </button>
        </div>

      </div>
    `;
  }

  _bindEvents() {
    // Theme toggle
    const themeToggle = this.container.querySelector('#sp-theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('change', () => {
        const isDark = themeToggle.checked;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
        const iconEl = this.container.querySelector('#sp-theme-toggle-icon');
        if (iconEl) iconEl.textContent = isDark ? '🌙' : '☀️';
      });
    }

    // Notif: check-in
    const notifCheckin = this.container.querySelector('#sp-notif-checkin');
    if (notifCheckin) {
      notifCheckin.addEventListener('change', () => {
        localStorage.setItem('suplilist:notif-checkin', notifCheckin.checked ? 'true' : 'false');
      });
    }

    // Notif: restock
    const notifRestock = this.container.querySelector('#sp-notif-restock');
    if (notifRestock) {
      notifRestock.addEventListener('change', () => {
        localStorage.setItem('suplilist:notif-restock', notifRestock.checked ? 'true' : 'false');
      });
    }

    // Export data
    const exportBtn = this.container.querySelector('#sp-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('suplilist')) {
            try {
              data[key] = JSON.parse(localStorage.getItem(key));
            } catch {
              data[key] = localStorage.getItem(key);
            }
          }
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `suplilist-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // Clear check-ins
    const clearBtn = this.container.querySelector('#sp-clear-checkins-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (!confirm('Deseja limpar todo o histórico de check-ins? Esta ação não pode ser desfeita.')) return;
        stateManager.dispatch(ACTIONS.CLEAR_CHECKINS);
      });
    }

    // Reset all
    const resetBtn = this.container.querySelector('#sp-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!confirm('⚠️ ATENÇÃO: Isso vai apagar TODOS os seus dados (stack, check-ins, perfil). Não há como desfazer.')) return;
        localStorage.clear();
        location.reload();
      });
    }

    // Legal / nav links
    const linkBtns = this.container.querySelectorAll('.sp-link-btn[data-hash]');
    linkBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.hash = btn.getAttribute('data-hash');
      });
    });
  }
}
