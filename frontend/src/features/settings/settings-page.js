import { stateManager, ACTIONS, STORAGE_KEYS } from '../../state/state-manager.js';
import { StorageManager } from '../../platform/storage-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { settingsService } from './settings-service.js';
import NotificationService from '../notifications/notification-service.js';
import { CheckoutModal } from '../premium/checkout-modal.js';

export default class SettingsPage {
  constructor(container, params) {
    this.container = container;
    this.params = params;
    this.notifService = new NotificationService();
  }

  mount() {
    this._injectStyles();
    const state = stateManager.state;
    this._lastTier = state.user?.tier ?? 'free';
    this.container.innerHTML = this._render();
    this._bindEvents();
    this._unsubscribe = stateManager.subscribe(() => {
      const newState = stateManager.state;
      const newTier = newState.user?.tier ?? 'free';
      if (newTier === this._lastTier) return;
      this._lastTier = newTier;
      const subSection = this.container.querySelector('.sp-subscription-section');
      if (subSection) {
        subSection.outerHTML = `<div class="sp-subscription-section">${this._renderSubscriptionSection(newTier)}</div>`;
        this._bindSubscriptionEvents();
      }
    });

    // Listen for settings rollback events (OCC conflict resolved by service)
    this._onSettingsChanged = (payload) => {
      if (!payload?.rollback) return;
      logger.info?.('[SettingsPage] Rollback received — re-rendering notification toggles from server state.');
      this._syncNotificationToggles(payload);
      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: payload.rollbackReason === 'occ_conflict'
          ? 'Configurações sincronizadas com o servidor (versão mais recente aplicada).'
          : 'Conexão restaurada. Configurações sincronizadas.',
        type: 'warning',
        duration: 4000,
      });
    };
    this._unsubSettings = eventBus.on(EVENTS.SETTINGS_CHANGED, this._onSettingsChanged);

    // If the user is authenticated, fetch server settings in the background.
    // Falls back to localStorage values already rendered synchronously above.
    if (stateManager.get('user.isAuthenticated')) {
      this._loadFromAPI();
    }
  }

  unmount() {
    this._unsubscribe?.();
    this._unsubSettings?.();
    this.container.innerHTML = '';
  }

  /**
   * Fetch settings from the API and sync the notification toggle DOM state.
   * Called on mount() for authenticated users — fire-and-forget.
   * Falls back gracefully: if the fetch fails, localStorage values remain.
   */
  async _loadFromAPI() {
    try {
      const settings = await settingsService.getSettings();
      this._syncNotificationToggles(settings);
    } catch (err) {
      // User is offline or token expired — localStorage values stay, no crash.
      logger.warn?.('[SettingsPage] Could not load server settings:', err.error ?? err.message);
    }
  }

  /**
   * Update DOM toggle state from a SettingsResponseDTO.
   * Does not re-render the whole page — only the two notification checkboxes.
   *
   * @param {import('./settings-service.js').SettingsResponseDTO} settings
   */
  _syncNotificationToggles(settings) {
    if (!settings?.notifications?.push) return;
    const { reminders, marketing } = settings.notifications.push;
    const checkinEl = this.container.querySelector('#sp-notif-checkin');
    const restockEl = this.container.querySelector('#sp-notif-restock');
    if (checkinEl) checkinEl.checked = !!reminders;
    if (restockEl) restockEl.checked = !!marketing;
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
    const stored = StorageManager.getItem(STORAGE_KEYS.THEME);
    if (stored) return stored === 'dark';
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  _getBoolPref(key) {
    return StorageManager.getItem(key) === 'true';
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

  _renderSubscriptionSection(tier) {
    if (tier === 'free') {
      return `
        <div class="sp-card" style="border: 1px dashed rgba(124, 58, 237, 0.4); background: rgba(124, 58, 237, 0.02);">
          <h2 class="sp-section-label" style="color: var(--color-brand); margin-bottom: 12px;">Assinatura Premium</h2>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="font-size: 15px; font-weight: 700; color: var(--color-text-primary); display: flex; align-items: center; gap: 6px;">Plano Atual: Gratuito 🟢</div>
              <p style="font-size: 12px; color: var(--color-text-secondary); margin: 4px 0 0 0; max-width: 340px; line-height: 1.45;">Desbloqueie consistência avançada, remova anúncios e baixe relatórios em Excel.</p>
            </div>
            <button class="sp-btn" id="sp-upgrade-btn" style="background: var(--color-brand); color: #fff; border: none; font-weight: 700; height: 38px; border-radius: 8px; box-shadow: 0 4px 12px rgba(139,92,246,0.25); cursor: pointer; padding: 0 20px;">Quero Premium</button>
          </div>
        </div>
      `;
    }
    const planName = tier === 'elite' ? 'ELITE 🏆' : 'PRO ⭐';
    return `
      <div class="sp-card" style="border: 1px solid rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.02);">
        <h2 class="sp-section-label" style="color: #22c55e; margin-bottom: 12px;">Minha Assinatura</h2>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
          <div>
            <div style="font-size: 15px; font-weight: 700; color: var(--color-text-primary);">Plano Ativo: SupliList ${planName}</div>
            <p style="font-size: 12px; color: var(--color-text-secondary); margin: 4px 0 0 0; max-width: 320px; line-height: 1.45;">Seu acesso premium está ativo. Obrigado por apoiar o SupliList!</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="sp-btn sp-btn-outline" id="sp-manage-plan-btn" style="height: 38px; padding: 0 16px;">Alterar</button>
            <button class="sp-btn" id="sp-cancel-plan-btn" style="border: 1.5px solid var(--color-error); color: var(--color-error); background: transparent; font-weight: 600; height: 38px; border-radius: 8px; cursor: pointer; padding: 0 16px;">Cancelar</button>
          </div>
        </div>
      </div>
    `;
  }

  _bindSubscriptionEvents() {
    const upgradeBtn = this.container.querySelector('#sp-upgrade-btn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        CheckoutModal.show({ tier: 'pro' });
      });
    }

    const manageBtn = this.container.querySelector('#sp-manage-plan-btn');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        CheckoutModal.show({ tier: 'elite' });
      });
    }

    const cancelBtn = this.container.querySelector('#sp-cancel-plan-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (confirm('Deseja realmente cancelar sua assinatura Premium? Você perderá acesso aos anúncios removidos e análises de gráficos.')) {
          stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'free' });
          StorageManager.setItem('suplilist:tier', 'free');
          alert('Sua assinatura foi cancelada e sua conta retornou ao plano gratuito.');
        }
      });
    }
  }

  _render() {
    const isDark = this._getThemeState();
    const notifCheckin = this._getBoolPref('suplilist:notif-checkin');
    const notifRestock = this._getBoolPref('suplilist:notif-restock');
    const state = stateManager.state;
    const tier = state.user?.tier ?? 'free';

    return `
      <div class="sp-page">

        <!-- Header -->
        <div class="sp-header">
          <h1>Configurações</h1>
          <p>Preferências do app, dados e privacidade</p>
        </div>

        <!-- Assinatura -->
        <div class="sp-subscription-section">${this._renderSubscriptionSection(tier)}</div>

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
            <span class="sp-action-label">Exportar meus dados (download)</span>
            <button class="sp-btn sp-btn-outline" id="sp-export-btn">Exportar</button>
          </div>
          <div class="sp-action-row" id="sp-export-file-row" style="display:none;">
            <span class="sp-action-label">Salvar backup (no seu PC)</span>
            <button class="sp-btn sp-btn-outline" id="sp-export-file-btn">Salvar</button>
          </div>
          <div class="sp-action-row" id="sp-import-file-row" style="display:none;">
            <span class="sp-action-label">Restaurar backup (do seu PC)</span>
            <button class="sp-btn sp-btn-outline" id="sp-import-file-btn">Restaurar</button>
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
          <button class="sp-link-btn" data-path="/faq">
            <span>❓ Perguntas Frequentes (FAQ)</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-path="/legal?doc=termos">
            <span>📋 Termos de Uso</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-path="/legal?doc=privacidade">
            <span>🔒 Política de Privacidade</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-path="/legal?doc=medico">
            <span>⚕️ Aviso Médico</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-path="/legal?doc=afiliados">
            <span>🔗 Divulgação de Afiliados</span>
            <span class="sp-link-arrow">→</span>
          </button>
        </div>

      </div>
    `;
  }

  _bindEvents() {
    this._bindSubscriptionEvents();

    // Theme toggle
    const themeToggle = this.container.querySelector('#sp-theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('change', () => {
        const isDark = themeToggle.checked;
        const theme = isDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        StorageManager.setItem(STORAGE_KEYS.THEME, theme);
        const iconEl = this.container.querySelector('#sp-theme-toggle-icon');
        if (iconEl) iconEl.textContent = isDark ? '🌙' : '☀️';
        // Sync nav sidebar and mobile topbar theme icons
        const svgDark = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
        const svgLight = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        const themeIcon = isDark ? svgDark : svgLight;
        const sbIcon = document.querySelector('#btn-theme .sb-item__icon');
        if (sbIcon) sbIcon.innerHTML = themeIcon;
        const mobileBtn = document.getElementById('btn-theme-mobile');
        if (mobileBtn) mobileBtn.innerHTML = themeIcon;
      });
    }

    // Notif: check-in
    const notifCheckin = this.container.querySelector('#sp-notif-checkin');
    if (notifCheckin) {
      notifCheckin.addEventListener('change', async () => {
        if (notifCheckin.checked) {
          const granted = await this.notifService.requestPermission();
          if (!granted) {
            alert('Permissão de notificações negada. Por favor, ative as notificações nas configurações do seu navegador para receber lembretes.');
            notifCheckin.checked = false;
            return;
          }
          this.notifService.sendLocalNotification('Lembretes Ativados! 💊', {
            body: 'Agora você receberá lembretes diários para não esquecer seus suplementos.',
            data: { url: '/settings' }
          });
        }
        // Persist locally first (always works, even offline)
        StorageManager.setItem('suplilist:notif-checkin', notifCheckin.checked ? 'true' : 'false');
        // Sync to API if authenticated (fire-and-forget — rollback is handled by settingsService)
        if (stateManager.get('user.isAuthenticated')) {
          settingsService.updateNotifications({
            push: { reminders: notifCheckin.checked },
          }).catch(err => {
            // Rollback already executed by the service; just surface a toast if needed
            if (err?.status !== 409) {
              logger.warn?.('[SettingsPage] Notification update error:', err.error ?? err.message);
            }
          });
        }
      });
    }

    // Notif: restock
    const notifRestock = this.container.querySelector('#sp-notif-restock');
    if (notifRestock) {
      notifRestock.addEventListener('change', async () => {
        if (notifRestock.checked) {
          const granted = await this.notifService.requestPermission();
          if (!granted) {
            alert('Permissão de notificações negada. Por favor, ative as notificações nas configurações do seu navegador para receber alertas de estoque.');
            notifRestock.checked = false;
            return;
          }
          this.notifService.sendLocalNotification('Alertas de Estoque Ativados! 📦', {
            body: 'Você receberá avisos quando seus suplementos estiverem acabando.',
            data: { url: '/settings' }
          });
        }
        // Persist locally first (always works, even offline)
        StorageManager.setItem('suplilist:notif-restock', notifRestock.checked ? 'true' : 'false');
        // Sync to API if authenticated
        if (stateManager.get('user.isAuthenticated')) {
          settingsService.updateNotifications({
            push: { marketing: notifRestock.checked },
          }).catch(err => {
            if (err?.status !== 409) {
              logger.warn?.('[SettingsPage] Restock notification update error:', err.error ?? err.message);
            }
          });
        }
      });
    }

    // Export data (download via blob)
    const exportBtn = this.container.querySelector('#sp-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = {};
        const allKeys = StorageManager.getAllKeys();
        for (const key of allKeys) {
          if (key && key.startsWith('suplilist')) {
            try {
              data[key] = JSON.parse(StorageManager.getItem(key));
            } catch {
              data[key] = StorageManager.getItem(key);
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
        // Defer revoke so browser has time to start the download before the URL is invalidated
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    }

    // Export data (save via File System API)
    const exportFileBtn = this.container.querySelector('#sp-export-file-btn');
    if (exportFileBtn && StorageManager.isFileSystemAPIAvailable()) {
      this.container.querySelector('#sp-export-file-row').style.display = 'flex';
      exportFileBtn.addEventListener('click', async () => {
        exportFileBtn.disabled = true;
        exportFileBtn.textContent = 'Salvando...';
        try {
          const result = await StorageManager.exportToFile();
          alert(result.message);
          if (result.success) {
            exportFileBtn.textContent = '✓ Salvo';
            setTimeout(() => { exportFileBtn.textContent = 'Salvar'; }, 2000);
          }
        } finally {
          exportFileBtn.disabled = false;
        }
      });
    }

    // Import data (restore via File System API)
    const importFileBtn = this.container.querySelector('#sp-import-file-btn');
    if (importFileBtn && StorageManager.isFileSystemAPIAvailable()) {
      this.container.querySelector('#sp-import-file-row').style.display = 'flex';
      importFileBtn.addEventListener('click', async () => {
        importFileBtn.disabled = true;
        importFileBtn.textContent = 'Restaurando...';
        try {
          const result = await StorageManager.importFromFile();
          alert(result.message);
          if (result.success) {
            importFileBtn.textContent = '✓ Restaurado';
            setTimeout(() => {
              importFileBtn.textContent = 'Restaurar';
              location.reload();
            }, 2000);
          }
        } finally {
          importFileBtn.disabled = false;
        }
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
        Object.keys(localStorage)
          .filter(k => k.startsWith('suplilist'))
          .forEach(k => StorageManager.removeItem(k));
        location.reload();
      });
    }

    // Legal / nav links
    const linkBtns = this.container.querySelectorAll('.sp-link-btn[data-path]');
    linkBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-path');
        window.history.pushState(null, null, path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    });
  }
}
