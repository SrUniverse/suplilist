/**
 * settings-page-utils.js
 *
 * Utility functions for SettingsPage.
 * Provides helpers for state, storage, and DOM queries.
 *
 * @module settings-page-utils
 */

import { StorageManager } from '../../platform/storage-manager.js';
import { STORAGE_KEYS } from '../../state/state-manager.js';

/**
 * Get current theme state
 * @returns {boolean} True if dark theme is enabled
 */
export function getThemeState() {
  // getItemSync (cookies + localStorage) — NÃO getItem, que é async e retornaria
  // uma Promise (sempre truthy) fazendo `stored === 'dark'` dar false, deixando o
  // toggle sempre desligado mesmo com tema escuro ativo.
  const stored = StorageManager.getItemSync(STORAGE_KEYS.THEME);
  if (stored) return stored === 'dark';
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/**
 * Get boolean preference from storage
 * @param {string} key - Storage key
 * @returns {boolean} Preference value
 */
export function getBoolPref(key) {
  // getItemSync por ser síncrono no render — getItem (async) retornaria Promise.
  return StorageManager.getItemSync(key) === 'true';
}

/**
 * Sync notification toggle state from server response
 * @param {HTMLElement} container - Container element
 * @param {Object} settings - Settings object from API
 */
export function syncNotificationToggles(container, settings) {
  if (!settings?.notifications?.push) return;

  const { reminders, marketing } = settings.notifications.push;
  const checkinEl = container.querySelector('#sp-notif-checkin');
  const restockEl = container.querySelector('#sp-notif-restock');

  if (checkinEl) checkinEl.checked = !!reminders;
  if (restockEl) restockEl.checked = !!marketing;
}

/**
 * Update subscription section HTML
 * @param {HTMLElement} container - Container element
 * @param {string} newHTML - New HTML content
 * @param {Function} bindCallback - Callback to bind subscription events
 */
export function updateSubscriptionSection(container, newHTML, bindCallback) {
  const subSection = container.querySelector('.sp-subscription-section');
  if (subSection) {
    subSection.outerHTML = `<div class="sp-subscription-section">${newHTML}</div>`;
    bindCallback();
  }
}
