/**
 * settings-page-events.js
 *
 * Event handlers and bindings for SettingsPage.
 * Separates event handling logic from page component.
 *
 * @module settings-page-events
 */

import { StorageManager, STORAGE_KEYS } from '../../platform/storage-manager.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { CheckoutModal } from '../premium/checkout-modal.js';
import { MfaSetupModal } from '../auth/mfa-setup-modal.js';
import { settingsService } from './settings-service.js';
import { logger } from '../../utils/logger.js';

/**
 * Bind theme toggle event
 * @param {HTMLElement} container - Container element
 */
export function bindThemeToggle(container) {
  const themeToggle = container.querySelector('#sp-theme-toggle');
  if (!themeToggle) return;

  themeToggle.addEventListener('change', () => {
    const isDark = themeToggle.checked;
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    StorageManager.setItem(STORAGE_KEYS.THEME, theme);

    // Update icon
    const iconEl = container.querySelector('#sp-theme-toggle-icon');
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

/**
 * Bind notification checkin toggle
 * @param {HTMLElement} container - Container element
 * @param {Object} notifService - Notification service instance
 */
export async function bindNotificationCheckin(container, notifService) {
  const notifCheckin = container.querySelector('#sp-notif-checkin');
  if (!notifCheckin) return;

  notifCheckin.addEventListener('change', async () => {
    if (notifCheckin.checked) {
      const granted = await notifService.requestPermission();
      if (!granted) {
        alert('Permissão de notificações negada. Por favor, ative as notificações nas configurações do seu navegador para receber lembretes.');
        notifCheckin.checked = false;
        return;
      }
      notifService.sendLocalNotification('Lembretes Ativados! 💊', {
        body: 'Agora você receberá lembretes diários para não esquecer seus suplementos.',
        data: { url: '/settings' }
      });
    }

    // Persist locally first (always works, even offline)
    StorageManager.setItem('suplilist:notif-checkin', notifCheckin.checked ? 'true' : 'false');

    // Sync to API if authenticated (fire-and-forget)
    if (stateManager.get('user.isAuthenticated')) {
      settingsService.updateNotifications({
        push: { reminders: notifCheckin.checked },
      }).catch(err => {
        if (err?.status !== 409) {
          logger.warn?.('[SettingsPage] Notification update error:', err.error ?? err.message);
        }
      });
    }
  });
}

/**
 * Bind notification restock toggle
 * @param {HTMLElement} container - Container element
 * @param {Object} notifService - Notification service instance
 */
export async function bindNotificationRestock(container, notifService) {
  const notifRestock = container.querySelector('#sp-notif-restock');
  if (!notifRestock) return;

  notifRestock.addEventListener('change', async () => {
    if (notifRestock.checked) {
      const granted = await notifService.requestPermission();
      if (!granted) {
        alert('Permissão de notificações negada. Por favor, ative as notificações nas configurações do seu navegador para receber alertas de estoque.');
        notifRestock.checked = false;
        return;
      }
      notifService.sendLocalNotification('Alertas de Estoque Ativados! 📦', {
        body: 'Você receberá avisos quando seus suplementos estiverem acabando.',
        data: { url: '/settings' }
      });
    }

    // Persist locally first
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

/**
 * Bind subscription action buttons
 * @param {HTMLElement} container - Container element
 */
export function bindSubscriptionEvents(container) {
  const upgradeBtn = container.querySelector('#sp-upgrade-btn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      CheckoutModal.show({ tier: 'pro' });
    });
  }

  const manageBtn = container.querySelector('#sp-manage-plan-btn');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      CheckoutModal.show({ tier: 'elite' });
    });
  }

  const cancelBtn = container.querySelector('#sp-cancel-plan-btn');
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

/**
 * Bind data export button
 * @param {HTMLElement} container - Container element
 */
export function bindDataExport(container) {
  const exportBtn = container.querySelector('#sp-export-btn');
  if (!exportBtn) return;

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

    // Defer revoke so browser has time to start download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

/**
 * Bind file export button (File System API)
 * @param {HTMLElement} container - Container element
 */
export function bindFileExport(container) {
  const exportFileBtn = container.querySelector('#sp-export-file-btn');
  if (!exportFileBtn || !StorageManager.isFileSystemAPIAvailable()) return;

  const row = container.querySelector('#sp-export-file-row');
  if (row) row.style.display = 'flex';

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

/**
 * Bind file import button (File System API)
 * @param {HTMLElement} container - Container element
 */
export function bindFileImport(container) {
  const importFileBtn = container.querySelector('#sp-import-file-btn');
  if (!importFileBtn || !StorageManager.isFileSystemAPIAvailable()) return;

  const row = container.querySelector('#sp-import-file-row');
  if (row) row.style.display = 'flex';

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

/**
 * Bind clear check-ins button
 * @param {HTMLElement} container - Container element
 */
export function bindClearCheckins(container) {
  const clearBtn = container.querySelector('#sp-clear-checkins-btn');
  if (!clearBtn) return;

  clearBtn.addEventListener('click', () => {
    if (!confirm('Deseja limpar todo o histórico de check-ins? Esta ação não pode ser desfeita.')) return;
    stateManager.dispatch(ACTIONS.CLEAR_CHECKINS);
  });
}

/**
 * Bind reset all button
 * @param {HTMLElement} container - Container element
 */
export function bindResetAll(container) {
  const resetBtn = container.querySelector('#sp-reset-btn');
  if (!resetBtn) return;

  resetBtn.addEventListener('click', () => {
    if (!confirm('⚠️ ATENÇÃO: Isso vai apagar TODOS os seus dados (stack, check-ins, perfil). Não há como desfazer.')) return;
    Object.keys(localStorage)
      .filter(k => k.startsWith('suplilist'))
      .forEach(k => StorageManager.removeItem(k));
    location.reload();
  });
}

/**
 * Bind legal/nav link buttons
 * @param {HTMLElement} container - Container element
 */
export function bindLegalLinks(container) {
  const linkBtns = container.querySelectorAll('.sp-link-btn[data-path]');
  linkBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const path = btn.getAttribute('data-path');
      window.history.pushState(null, null, path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  });
}

/**
 * Bind MFA setup button
 * @param {HTMLElement} container - Container element
 */
export function bindMfaSetup(container) {
  const mfaSetupBtn = container.querySelector('#sp-mfa-setup-btn');
  if (!mfaSetupBtn) return;

  mfaSetupBtn.addEventListener('click', () => {
    const modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);
    const mfaModal = new MfaSetupModal(modalContainer);

    // Intercept unmount to remove container
    const originalUnmount = mfaModal.unmount.bind(mfaModal);
    mfaModal.unmount = () => {
      originalUnmount();
      modalContainer.remove();
    };

    mfaModal.mount();
  });
}
