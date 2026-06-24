/**
 * profile-service.js — Profile data manager for SupliList.
 *
 * Design Contract:
 *
 *  SINGLE PROFILE WRITER
 *    The profile-service is the sole module authorized to dispatch
 *    SET_USER_PROFILE to stateManager. No page component should call
 *    stateManager.dispatch(ACTIONS.SET_USER_PROFILE) directly.
 *
 *  SEPARATION FROM IDENTITY
 *    identity-service.js owns authentication state (isAuthenticated, role, tokens).
 *    profile-service.js owns mutable user data (displayName, avatar, physical stats).
 *    They share GET /api/profile/me but own different slices of state.
 *
 *  OPTIMISTIC LOCAL UPDATE
 *    On PATCH, state is updated immediately and the event is emitted before the
 *    server confirms. If the server rejects, the error is rethrown and the caller
 *    is responsible for displaying feedback and optionally rolling back.
 *    This is the correct trade-off for perceived performance in a mobile PWA.
 *
 * @module profile-service
 *
 * @example
 * import { profileService } from '../features/profile/profile-service.js';
 *
 * // Fetch and hydrate
 * const profile = await profileService.getProfile();
 *
 * // Update display name
 * await profileService.updateProfile({ displayName: 'Ana P.' });
 */

import { apiFetch, ApiError } from '../../platform/api-client.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { logger } from '../../utils/logger.js';
import { createSingleFlight } from '../../platform/single-flight.js';

/**
 * @typedef {import('@suplilist/shared').PublicProfileDTO}  PublicProfileDTO
 * @typedef {import('@suplilist/shared').PrivateProfileDTO} PrivateProfileDTO
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const API = Object.freeze({
  ME:     '/api/profile/me',
  AVATAR: '/api/profile/avatar',
});

// ─── ProfileService ───────────────────────────────────────────────────────────

class ProfileService {
  /**
   * Internal variable to hold the ETag version of the profile for OCC.
   * @type {string | null}
   */
  #currentVersion = null;

  constructor() {
    /**
     * Fetch the authenticated user's private profile from the server.
     *
     * Concurrent calls share the same in-flight Promise via createSingleFlight —
     * only one HTTP request fires regardless of how many callers invoke this
     * simultaneously (e.g., page mount + init racing).
     * The slot clears on settle so subsequent navigations trigger a fresh fetch.
     *
     * @type {() => Promise<PrivateProfileDTO>}
     */
    this.getProfile = createSingleFlight(async () => {
      const { data: profile, headers } = await apiFetch(API.ME, { returnHeaders: true });

      // Extract ETag for Optimistic Concurrency Control (OCC)
      const eTag = headers.get('ETag');
      if (eTag) this.#currentVersion = eTag.replace(/"/g, '');

      this.#applyProfileToState(profile);
      eventBus.emit(EVENTS.PROFILE_LOADED, { profile });
      logger.info('[ProfileService] Profile loaded for', profile.userId);
      return profile;
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Update the authenticated user's profile via PATCH /api/profile/me.
   *
   * Strategy — Optimistic Local Update:
   *   1. Apply changes to stateManager immediately (zero perceived latency).
   *   2. Emit EVENTS.PROFILE_UPDATED so UI components update in real time.
   *   3. Send PATCH to the server.
   *   4. If server confirms, return the canonical PrivateProfileDTO and
   *      re-apply to ensure state is consistent with server truth.
   *   5. If server rejects, rethrow so the caller can show an error and
   *      optionally revert UI.
   *
   * @param {Partial<PrivateProfileDTO>} data - Fields to update (partial patch).
   * @returns {Promise<PrivateProfileDTO>} The updated profile from the server.
   * @throws {ApiError} If validation fails (400), not authenticated (401), or server errors.
   *
   * @example
   * try {
   *   await profileService.updateProfile({ displayName: 'Pedro A.' });
   *   showSuccessToast('Perfil atualizado!');
   * } catch (err) {
   *   showErrorToast('Falha ao salvar. Tente novamente.');
   * }
   */
  async updateProfile(data) {
    // 1. Optimistic update — instant feedback in the UI
    this.#applyProfileToState(data);
    eventBus.emit(EVENTS.PROFILE_UPDATED, { profile: data, optimistic: true });

    try {
      return await this.#sendPatch(data);
    } catch (err) {
      // OCC self-heal: a 412 Precondition Failed means our cached ETag is
      // stale — another writer (e.g. onboarding, a second tab, or a migration)
      // advanced the server version while this long-lived PWA held an old one.
      // Refetch the canonical profile to capture the fresh ETag, then retry
      // the write exactly once. This mirrors settings-service's 409 recovery.
      if (err instanceof ApiError && err.status === 412) {
        logger.warn('[ProfileService] 412 OCC conflict — refetching profile and retrying once.');
        try {
          await this.getProfile(); // refreshes #currentVersion from the server ETag
          return await this.#sendPatch(data);
        } catch (retryErr) {
          logger.error('[ProfileService] Retry after 412 conflict failed:', retryErr.error ?? retryErr.message);
          throw retryErr;
        }
      }

      // Other failures bubble up. Caller decides whether to rollback the
      // optimistic update (e.g., by calling getProfile() to re-fetch).
      logger.error('[ProfileService] Profile update failed:', err.error ?? err.message);
      throw err;
    }
  }

  /**
   * Send a single PATCH /api/profile/me with the current OCC ETag, absorb the
   * server-confirmed profile, and advance #currentVersion from the new ETag.
   *
   * @param {Partial<PrivateProfileDTO>} data
   * @returns {Promise<PrivateProfileDTO>}
   */
  async #sendPatch(data) {
    const { data: confirmed, headers } = await apiFetch(API.ME, {
      method: 'PATCH',
      headers: this.#currentVersion ? { 'If-Match': `"${this.#currentVersion}"` } : {},
      body: JSON.stringify(data),
      returnHeaders: true
    });

    // Update the internal ETag version for subsequent updates
    const eTag = headers.get('ETag');
    if (eTag) {
      this.#currentVersion = eTag.replace(/"/g, '');
    }

    // Re-apply server-confirmed data to state (handles server-side transformations)
    this.#applyProfileToState(confirmed);
    eventBus.emit(EVENTS.PROFILE_UPDATED, { profile: confirmed, optimistic: false });

    logger.info('[ProfileService] Profile updated for', confirmed.userId);
    return confirmed;
  }

  /**
   * Upload a new avatar image via POST /api/profile/avatar.
   *
   * Accepts a File or Blob. Sends as multipart/form-data — do NOT set
   * Content-Type manually; the browser sets the correct boundary automatically.
   *
   * @param {File | Blob} file - The image file to upload.
   * @returns {Promise<PrivateProfileDTO>} Updated profile with new `avatarUrl`.
   * @throws {ApiError} If the file is invalid (400), too large (413), or server errors.
   *
   * @example
   * const file = event.target.files[0];
   * const updated = await profileService.uploadAvatar(file);
   * updateAvatarInUI(updated.avatarUrl);
   */
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    /** @type {PrivateProfileDTO} */
    const updated = await apiFetch(API.AVATAR, {
      method: 'POST',
      body: formData,
      // Important: do NOT set Content-Type — fetch sets it automatically with
      // the correct multipart boundary when body is FormData.
    });

    this.#applyProfileToState(updated);
    eventBus.emit(EVENTS.PROFILE_UPDATED, { profile: updated, optimistic: false });
    logger.info('[ProfileService] Avatar uploaded, status:', updated.avatarStatus);

    return updated;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Write profile fields into the stateManager.
   *
   * Maps the DTO's public/display fields (displayName, avatarUrl, etc.) onto
   * the SET_USER_PROFILE action's allowed keys. The reducer's whitelist ensures
   * only safe fields are applied — extra DTO keys are silently ignored.
   *
   * Note: identity fields (id, email, role) are intentionally excluded here.
   * They are managed exclusively by identity-service via AUTH_LOGIN / AUTH_LOGOUT.
   *
   * @param {Partial<PrivateProfileDTO>} profile
   */
  #applyProfileToState(profile) {
    if (!profile || typeof profile !== 'object') return;

    // Build a payload using the keys that stateManager's SET_USER_PROFILE
    // reducer actually accepts (see the ALLOWED_PROFILE_KEYS whitelist).
    const statePayload = {};

    // Display info
    if (profile.displayName !== undefined) statePayload.name = profile.displayName;

    // Physical stats (if the server ever returns them merged into profile)
    if (profile.weight        !== undefined) statePayload.weight        = profile.weight;
    if (profile.height        !== undefined) statePayload.height        = profile.height;
    if (profile.age           !== undefined) statePayload.age           = profile.age;
    if (profile.objective     !== undefined) statePayload.objective     = profile.objective;
    if (profile.budget        !== undefined) statePayload.budget        = profile.budget;
    if (profile.biologicalSex !== undefined) statePayload.biologicalSex = profile.biologicalSex;

    if (profile.trainingFrequency !== undefined) statePayload.trainingFrequency = profile.trainingFrequency;
    if (profile.trainingAge       !== undefined) statePayload.trainingAge       = profile.trainingAge;
    if (profile.restrictions      !== undefined) statePayload.restrictions      = profile.restrictions;

    if (Object.keys(statePayload).length === 0) return;

    stateManager.dispatch(ACTIONS.SET_USER_PROFILE, statePayload);
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

/**
 * The global ProfileService singleton.
 * @type {ProfileService}
 *
 * @example
 * import { profileService } from '../features/profile/profile-service.js';
 *
 * const profile = await profileService.getProfile();
 * await profileService.updateProfile({ displayName: 'Novo Nome' });
 */
export const profileService = new ProfileService();
