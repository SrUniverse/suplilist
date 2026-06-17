import { stateManager } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { settingsService } from './settings-service.js';
import NotificationService from '../notifications/notification-service.js';
import { logger } from '../../utils/logger.js';

// Modular imports
import './settings-page.css';
import { renderFullPage, renderSubscriptionSection } from './settings-page-render.js';
import {
  bindThemeToggle,
  bindNotificationCheckin,
  bindNotificationRestock,
  bindSubscriptionEvents,
  bindDataExport,
  bindFileExport,
  bindFileImport,
  bindClearCheckins,
  bindResetAll,
  bindLegalLinks,
  bindMfaSetup,
} from './settings-page-events.js';
import {
  getThemeState,
  getBoolPref,
  syncNotificationToggles,
  updateSubscriptionSection,
} from './settings-page-utils.js';

/**
 * SettingsPage — Refactored component
 *
 * Handles user settings, preferences, and account management.
 * Modular design: styles, rendering, events, and utils are separated.
 *
 * @class SettingsPage
 */
export default class SettingsPage {
  constructor(container, params) {
    this.container = container;
    this.params = params;
    this.notifService = new NotificationService();
    this._lastTier = null;
    this._unsubscribe = null;
    this._unsubSettings = null;
  }

  mount() {
    const state = stateManager.state;
    this._lastTier = state.user?.tier ?? 'free';

    // Render full page
    this.container.innerHTML = this._render();

    // Bind all event handlers
    this._bindAllEvents();

    // Subscribe to state changes (tier changes)
    this._unsubscribe = stateManager.subscribe(() => {
      const newState = stateManager.state;
      const newTier = newState.user?.tier ?? 'free';
      if (newTier === this._lastTier) return;

      this._lastTier = newTier;
      const newHTML = renderSubscriptionSection(newTier);
      updateSubscriptionSection(this.container, newHTML, () => {
        bindSubscriptionEvents(this.container);
      });
    });

    // Listen for settings rollback events (OCC conflict from server)
    this._onSettingsChanged = (payload) => {
      if (!payload?.rollback) return;

      logger.info?.('[SettingsPage] Rollback received — re-rendering toggles from server state.');
      syncNotificationToggles(this.container, payload);
      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: payload.rollbackReason === 'occ_conflict'
          ? 'Configurações sincronizadas com o servidor (versão mais recente aplicada).'
          : 'Conexão restaurada. Configurações sincronizadas.',
        type: 'warning',
        duration: 4000,
      });
    };
    this._unsubSettings = eventBus.on(EVENTS.SETTINGS_CHANGED, this._onSettingsChanged);

    // Fetch server settings if authenticated
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
   * Fetch settings from API and sync DOM
   * Fire-and-forget: falls back to localStorage if offline
   */
  async _loadFromAPI() {
    try {
      const settings = await settingsService.getSettings();
      syncNotificationToggles(this.container, settings);
    } catch (err) {
      logger.warn?.('[SettingsPage] Could not load server settings:', err.error ?? err.message);
    }
  }

  /**
   * Render full settings page
   * @returns {string} HTML string
   */
  _render() {
    const state = stateManager.state;
    return renderFullPage({
      isDark: getThemeState(),
      notifCheckin: getBoolPref('suplilist:notif-checkin'),
      notifRestock: getBoolPref('suplilist:notif-restock'),
      tier: state.user?.tier ?? 'free',
      isAuthenticated: stateManager.get('user.isAuthenticated'),
      isMfaEnabled: state.user?.isMfaEnabled ?? false,
    });
  }

  /**
   * Bind all event handlers
   */
  _bindAllEvents() {
    bindThemeToggle(this.container);
    bindNotificationCheckin(this.container, this.notifService);
    bindNotificationRestock(this.container, this.notifService);
    bindSubscriptionEvents(this.container);
    bindDataExport(this.container);
    bindFileExport(this.container);
    bindFileImport(this.container);
    bindClearCheckins(this.container);
    bindResetAll(this.container);
    bindLegalLinks(this.container);
    bindMfaSetup(this.container);
  }
}
