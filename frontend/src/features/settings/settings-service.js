/**
 * settings-service.js — Settings & LGPD Consent Manager for SupliList.
 *
 * Design Contracts:
 *
 *  OPTIMISTIC UI (notifications, locale)
 *    State is updated immediately on write; the network call follows.
 *    On HTTP 409 Conflict (OCC version mismatch), the service executes a
 *    full rollback cycle: fetch the canonical server state, restore it in
 *    stateManager, and rethrow so the page can show a reconciliation notice.
 *
 *  STRICT CONSENT WRITES (LGPD)
 *    grantConsent() and revokeConsent() are NOT optimistic.
 *    The HTTP call MUST complete with status 2xx before any state change.
 *    Legal compliance requires cryptographic certainty that the backend
 *    recorded the event before the UI reflects it.
 *
 *  OCC VERSION TRACKING
 *    The service keeps the last-known `version` from SettingsResponseDTO.
 *    Every mutating PATCH includes `{ version }` in the payload body so the
 *    backend can detect stale clients and return 409 immediately.
 *
 * @module settings-service
 *
 * @example
 * import { settingsService } from './settings-service.js';
 *
 * // On page mount
 * const settings = await settingsService.getSettings();
 *
 * // Notification toggle (optimistic)
 * await settingsService.updateNotifications({ push: { reminders: true } });
 *
 * // Legal consent (strict — awaited)
 * await settingsService.grantConsent('privacy_policy', '1.2.0');
 */

import { apiFetch, ApiError } from '../../platform/api-client.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { logger } from '../../utils/logger.js';

/**
 * @typedef {import('@suplilist/shared').SettingsResponseDTO}    SettingsResponseDTO
 * @typedef {import('@suplilist/shared').UpdateNotificationsDTO} UpdateNotificationsDTO
 * @typedef {import('@suplilist/shared').UpdateLocaleDTO}        UpdateLocaleDTO
 * @typedef {import('@suplilist/shared').SubmitConsentDTO}       SubmitConsentDTO
 * @typedef {import('@suplilist/shared').ConsentType}            ConsentType
 * @typedef {import('@suplilist/shared').ConsentSnapshotDTO}     ConsentSnapshotDTO
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const API = Object.freeze({
  SETTINGS:      '/api/settings/me',
  NOTIFICATIONS: '/api/settings/me/notifications',
  LOCALE:        '/api/settings/me/locale',
  CONSENTS:      '/api/settings/me/consents',
});

// ─── SettingsService ──────────────────────────────────────────────────────────

class SettingsService {
  /**
   * OCC version token from the last known server response.
   * Sent with every mutating request so the backend detects stale clients.
   * `null` means we have not yet fetched settings from the server this session.
   *
   * @type {number | null}
   */
  #version = null;

  /**
   * In-memory snapshot of the last confirmed server settings.
   * Used exclusively for rollback on 409 Conflict — we restore this state
   * and then immediately refresh from the server to guarantee consistency.
   *
   * @type {SettingsResponseDTO | null}
   */
  #lastConfirmed = null;

  /**
   * Single-flight deduplication for GET /api/settings/me.
   * Prevents double fetches if mount() and initializeSession() race.
   *
   * @type {Promise<SettingsResponseDTO> | null}
   */
  #fetchPromise = null;

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Fetch the full settings snapshot from the server.
   *
   * Deduplicates concurrent calls — only one HTTP request fires per tick.
   * On success: updates #version, caches #lastConfirmed, hydrates stateManager,
   * emits EVENTS.SETTINGS_CHANGED.
   *
   * @returns {Promise<SettingsResponseDTO>}
   * @throws {ApiError}
   *
   * @example
   * const settings = await settingsService.getSettings();
   * renderNotificationToggles(settings.notifications);
   */
  getSettings() {
    if (this.#fetchPromise) return this.#fetchPromise;

    this.#fetchPromise = (async () => {
      try {
        /** @type {SettingsResponseDTO} */
        const settings = await apiFetch(API.SETTINGS);
        this.#absorb(settings);
        logger.info('[SettingsService] Settings loaded, OCC version:', settings.version);
        return settings;
      } finally {
        this.#fetchPromise = null;
      }
    })();

    return this.#fetchPromise;
  }

  /**
   * Update notification preferences via PATCH /api/settings/me/notifications.
   *
   * Strategy: Optimistic UI with OCC-aware rollback.
   *   1. Capture the pre-mutation snapshot for possible rollback.
   *   2. Apply changes optimistically to stateManager.
   *   3. Emit SETTINGS_CHANGED (optimistic: true).
   *   4. PATCH the server with the current OCC version.
   *   5a. Success → absorb confirmed state, re-emit (optimistic: false).
   *   5b. 409 Conflict → execute #rollback() and rethrow.
   *   5c. Other error → execute #rollback() and rethrow.
   *
   * Note: transactional and security email fields are server-immutable.
   * Only `email.marketing`, `email.productUpdates`, and all `push.*` fields
   * may be mutated. Sending immutable fields is harmless — the backend ignores
   * them — but the DTO type `UpdateNotificationsDTO` already excludes them.
   *
   * @param {Partial<UpdateNotificationsDTO>} data
   * @returns {Promise<SettingsResponseDTO>}
   * @throws {ApiError} Including re-thrown 409 after rollback.
   */
  async updateNotifications(data) {
    const snapshot = this.#lastConfirmed;
    this.#applyNotificationsToState(data);
    eventBus.emit(EVENTS.SETTINGS_CHANGED, { notifications: data, optimistic: true });

    try {
      /** @type {SettingsResponseDTO} */
      const confirmed = await apiFetch(API.NOTIFICATIONS, {
        method: 'PATCH',
        body: JSON.stringify({ ...data, version: this.#version }),
      });
      this.#absorb(confirmed);
      eventBus.emit(EVENTS.SETTINGS_CHANGED, { notifications: confirmed.notifications, optimistic: false });
      return confirmed;
    } catch (err) {
      await this.#rollback(err, snapshot, 'updateNotifications');
      throw err;
    }
  }

  /**
   * Update locale and timezone preferences via PATCH /api/settings/me/locale.
   *
   * Same optimistic strategy as updateNotifications().
   *
   * @param {UpdateLocaleDTO} data - { locale: string, timezone: string }
   * @returns {Promise<SettingsResponseDTO>}
   * @throws {ApiError} Including re-thrown 409 after rollback.
   */
  async updateLocale(data) {
    const snapshot = this.#lastConfirmed;
    // Locale currently has no stateManager slice — dispatch when the reducer
    // gains a preferences.locale field. For now, only the event matters.
    eventBus.emit(EVENTS.SETTINGS_CHANGED, { locale: data, optimistic: true });

    try {
      /** @type {SettingsResponseDTO} */
      const confirmed = await apiFetch(API.LOCALE, {
        method: 'PATCH',
        body: JSON.stringify({ ...data, version: this.#version }),
      });
      this.#absorb(confirmed);
      eventBus.emit(EVENTS.SETTINGS_CHANGED, { locale: confirmed.locale, optimistic: false });
      return confirmed;
    } catch (err) {
      await this.#rollback(err, snapshot, 'updateLocale');
      throw err;
    }
  }

  /**
   * Record explicit user consent for a legal document (LGPD).
   *
   * ⚠️  NOT OPTIMISTIC — compliance requires HTTP 2xx before any state change.
   *
   * Flow:
   *   1. POST to the backend with consentType, version, action: 'granted'.
   *   2. Server records the immutable audit log entry and updates the O(1)
   *      ConsentSnapshotDTO read-model atomically.
   *   3. Only on success: absorb the new settings (which include updated
   *      consents snapshot and incremented OCC version).
   *   4. Emit SETTINGS_CHANGED with the confirmed consent state.
   *
   * @param {ConsentType} consentType
   * @param {string} version - SemVer of the document (e.g., '1.2.0'). Must
   *   match a known entry in the backend's DocumentCatalogService.
   * @returns {Promise<SettingsResponseDTO>}
   * @throws {ApiError} On validation failure, version mismatch, or server error.
   *
   * @example
   * // In a consent modal — MUST be awaited before closing the modal
   * await settingsService.grantConsent('privacy_policy', '1.2.0');
   * closeConsentModal(); // only runs after server confirms
   */
  async grantConsent(consentType, version) {
    /** @type {SubmitConsentDTO} */
    const payload = { consentType, version, action: 'granted' };

    /** @type {SettingsResponseDTO} */
    const confirmed = await apiFetch(API.CONSENTS, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // State is mutated ONLY after the server confirms the write.
    this.#absorb(confirmed);
    eventBus.emit(EVENTS.SETTINGS_CHANGED, {
      consents: confirmed.consents,
      consentType,
      action: 'granted',
      optimistic: false,
    });

    logger.info('[SettingsService] Consent GRANTED:', consentType, 'v' + version);
    return confirmed;
  }

  /**
   * Revoke a previously granted consent (LGPD right to withdraw).
   *
   * ⚠️  NOT OPTIMISTIC — same compliance guarantee as grantConsent().
   *
   * Note: The backend appends a `revoked` entry to the immutable audit log
   * and sets `consents.<type>` to false in the snapshot. It does NOT delete
   * the historical `granted` record (audit trail is inviolable).
   *
   * @param {ConsentType} consentType
   * @returns {Promise<SettingsResponseDTO>}
   * @throws {ApiError}
   */
  async revokeConsent(consentType) {
    /** @type {SettingsResponseDTO} */
    const confirmed = await apiFetch(`${API.CONSENTS}/${consentType}`, {
      method: 'DELETE',
    });

    this.#absorb(confirmed);
    eventBus.emit(EVENTS.SETTINGS_CHANGED, {
      consents: confirmed.consents,
      consentType,
      action: 'revoked',
      optimistic: false,
    });

    logger.info('[SettingsService] Consent REVOKED:', consentType);
    return confirmed;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Absorb a fresh SettingsResponseDTO:
   *   - Update the OCC version counter.
   *   - Cache the full snapshot for potential rollback.
   *   - Write notification prefs to stateManager (where a reducer exists).
   *
   * @param {SettingsResponseDTO} settings
   */
  #absorb(settings) {
    this.#version = settings.version;
    this.#lastConfirmed = settings;
    this.#applyNotificationsToState(settings.notifications);
  }

  /**
   * Write notification preferences into stateManager.
   *
   * Currently stateManager has no dedicated `notifications` slice, so we
   * bridge into preferences using SET_USER_PROFILE is not the right action.
   * Instead, we emit the event and let the page reactively re-render from the
   * service's in-memory state. When a SETTINGS_LOADED action is added to the
   * reducer, replace this body with a single dispatch call.
   *
   * @param {Partial<import('@suplilist/shared').NotificationSettingsDTO>} notifications
   */
  #applyNotificationsToState(notifications) {
    if (!notifications) return;
    // Future: stateManager.dispatch(ACTIONS.SET_NOTIFICATIONS, notifications);
    // For now, the page reads directly from settingsService.getCachedSettings().
  }

  /**
   * Return the last absorbed server settings (O(1) in-memory read).
   * Pages should use this for initial render to avoid redundant network calls
   * when settings were already fetched during page mount.
   *
   * @returns {SettingsResponseDTO | null}
   */
  getCachedSettings() {
    return this.#lastConfirmed;
  }

  /**
   * Execute the OCC rollback cycle.
   *
   * Called when any mutating PATCH receives an error (especially 409 Conflict).
   *
   * Rollback sequence:
   *   1. Log the incident with the OCC version at the time of conflict.
   *   2. If we have a pre-mutation snapshot, restore it immediately so the UI
   *      is consistent while the network fetch runs.
   *   3. Fetch the canonical server state via GET /api/settings/me.
   *      This is the authoritative truth — the snapshot we stored may already
   *      be stale if another client wrote between our GET and PATCH.
   *   4. Absorb the fresh server state (updates #version, #lastConfirmed).
   *   5. Emit SETTINGS_CHANGED with `rollback: true` so the page re-renders
   *      toggles from the restored server state rather than the failed optimistic state.
   *
   * If the rollback GET itself fails (network down), we silently swallow that
   * error so the original error propagates cleanly to the caller.
   *
   * @param {Error} originalError
   * @param {SettingsResponseDTO | null} snapshot - State before the optimistic write.
   * @param {string} callerName - For logging context.
   */
  async #rollback(originalError, snapshot, callerName) {
    const is409 = originalError instanceof ApiError && originalError.status === 409;

    if (is409) {
      logger.warn(
        `[SettingsService] 409 OCC conflict in ${callerName}. ` +
        `Client version was ${this.#version}. Executing rollback.`
      );
    } else {
      logger.warn(
        `[SettingsService] Network/server error in ${callerName}, rolling back optimistic state.`,
        originalError.error ?? originalError.message
      );
    }

    // Step 2: Restore pre-mutation snapshot immediately for visual consistency.
    if (snapshot) {
      this.#absorb(snapshot);
    }

    // Step 3–5: Fetch fresh server state to guarantee convergence.
    try {
      const fresh = await apiFetch(API.SETTINGS);
      this.#absorb(fresh);
      logger.info(
        `[SettingsService] Rollback complete. New authoritative version: ${fresh.version}`
      );
      // Signal the page to re-render its toggles from the now-restored state.
      eventBus.emit(EVENTS.SETTINGS_CHANGED, {
        ...fresh,
        rollback: true,
        rollbackReason: is409 ? 'occ_conflict' : 'network_error',
      });
    } catch (refreshError) {
      // Network is down — swallow and let the original error propagate.
      logger.error('[SettingsService] Rollback refresh failed (offline?):', refreshError.message);
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

/**
 * The global SettingsService singleton.
 * @type {SettingsService}
 *
 * @example
 * import { settingsService } from './settings-service.js';
 *
 * const settings = await settingsService.getSettings();
 * await settingsService.updateNotifications({ push: { reminders: true } });
 * await settingsService.grantConsent('terms_of_service', '1.0.0');
 */
export const settingsService = new SettingsService();
