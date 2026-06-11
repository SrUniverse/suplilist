/**
 * PWA Handler
 * Progressive Web App enhancements for offline support
 * - Service worker management
 * - Offline detection
 * - Install prompt handling
 */

import { logger } from '../utils/logger.js';

export class PWAHandler {
  constructor() {
    this.isOnline = navigator.onLine;
  }

  async init() {
    this._registerServiceWorker();
    this._listenForOnlineStatus();
    this._handleInstallPrompt();
    this._addViewportMeta();
  }

  /**
   * Register service worker for offline support
   */
  async _registerServiceWorker() {
    // Em dev o SW serve bundle velho do cache e mascara mudanças de código.
    if (import.meta.env?.DEV) return;
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        logger.debug('[PWA] Service Worker registered', registration);
      } catch (error) {
        logger.warn('[PWA] Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Listen for online/offline status changes
   */
  _listenForOnlineStatus() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      document.body.classList.remove('is-offline');
      document.body.classList.add('is-online');
      this._showOnlineNotification();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      document.body.classList.add('is-offline');
      document.body.classList.remove('is-online');
      this._showOfflineNotification();
    });

    // Set initial state
    if (this.isOnline) {
      document.body.classList.add('is-online');
    } else {
      document.body.classList.add('is-offline');
    }
  }

  /**
   * Handle install prompt (for "Add to Home Screen")
   */
  _handleInstallPrompt() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      // e.preventDefault(); // Removed to allow the default browser banner to be shown
      deferredPrompt = e;
      this._showInstallPrompt(deferredPrompt);
    });

    window.addEventListener('appinstalled', () => {
      logger.debug('[PWA] App installed');
      document.body.classList.add('is-installed');
    });
  }

  /**
   * Show install prompt (can be customized by app)
   */
  _showInstallPrompt(prompt) {
    // Fire custom event that app can listen to
    window.dispatchEvent(
      new CustomEvent('pwa:install-available', { detail: { prompt } })
    );
  }

  /**
   * Show offline notification
   */
  _showOfflineNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-notification pwa-notification--offline';
    notification.setAttribute('role', 'alert');
    notification.innerHTML = `
      <div class="pwa-notification__icon">📡</div>
      <div class="pwa-notification__text">Você está offline - funciona normalmente com dados em cache</div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
  }

  /**
   * Show online notification
   */
  _showOnlineNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-notification pwa-notification--online';
    notification.setAttribute('role', 'status');
    notification.innerHTML = `
      <div class="pwa-notification__icon">✓</div>
      <div class="pwa-notification__text">Conectado à internet</div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  /**
   * Add viewport meta tags for PWA
   */
  _addViewportMeta() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && !viewport.getAttribute('content').includes('viewport-fit')) {
      // Viewport is already set in HTML
      return;
    }
  }

  /**
   * Get online status
   */
  isConnected() {
    return this.isOnline;
  }
}

// Auto-init when module loads
const pwaHandler = new PWAHandler();
if (typeof window !== 'undefined') {
  pwaHandler.init();
}

export default pwaHandler;
