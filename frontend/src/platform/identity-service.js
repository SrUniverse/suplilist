/**
 * identity-service.js — Session Orchestrator for SupliList.
 *
 * Responsibilities:
 *
 *  1. SOLE AUTH WRITER
 *     The only module authorized to dispatch AUTH_LOGIN / AUTH_LOGOUT against
 *     the stateManager. No other file should mutate `state.user.isAuthenticated`.
 *
 *  2. AUTH_EXPIRED LISTENER ("The Apocalypse Handler")
 *     Listens for EVENTS.AUTH_EXPIRED emitted by api-client when the silent
 *     refresh chain is exhausted. Executes local logout and forces navigation
 *     to the onboarding/login screen.
 *
 *  3. SESSION RECOVERY ON BOOT (PWA / cold-start)
 *     RAM is empty on every cold start — the _accessToken closure in api-client
 *     is null. `initializeSession()` calls GET /api/profile/me, which triggers
 *     the api-client's refresh flow if a valid HttpOnly cookie exists.
 *     On success the token is restored in the closure and the UI wakes up as
 *     "Logged in". On failure the app boots as a visitor.
 *
 * @module identity-service
 *
 * @example
 * // In app.js — call once, before router.start(), no await needed
 * import { identityService } from '../platform/identity-service.js';
 * identityService.initializeSession(); // fire-and-forget
 */

import { apiFetch, setAccessToken, clearAccessToken, ApiError } from './api-client.js';
import { stateManager, ACTIONS } from '../state/state-manager.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { logger } from '../utils/logger.js';
import { migrationService } from './migration-service.js';

/**
 * @typedef {import('@suplilist/shared').AuthResponseDTO}  AuthResponseDTO
 * @typedef {import('@suplilist/shared').UserIdentityDTO}  UserIdentityDTO
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** API paths — single source of truth to avoid magic strings. */
const API = Object.freeze({
  REGISTER: '/api/auth/register',
  LOGIN:    '/api/auth/login',
  LOGOUT:   '/api/auth/logout',
  PROFILE:  '/api/profile/me',
});

/**
 * localStorage key for the zombie session guard.
 * Written before logout network call; cleared on success; checked on boot.
 * Prevents silent session restoration if logout fails while offline.
 */
export const PENDING_LOGOUT_KEY = 'suplilist:pendingLogout';

/** Routes used for forced navigation — keep in sync with router config. */
const ROUTE = Object.freeze({
  ONBOARDING: '/onboarding',
  HOME:       '/home',
});

// ─── IdentityService ──────────────────────────────────────────────────────────

class IdentityService {
  /** @type {boolean} Prevents duplicate AUTH_EXPIRED handling races. */
  #handlingExpiry = false;

  /**
   * The Promise returned by the most recent initializeSession() call.
   * `null` means initializeSession() has never been called.
   * Settled (resolved/rejected) means the probe completed.
   * Pending means the probe is still in-flight.
   *
   * Router guards await this to avoid premature redirect on deep links.
   *
   * @type {Promise<boolean> | null}
   */
  #initPromise = null;

  constructor() {
    this.#registerApocalypseListener();
  }

  // ── Initialization state ────────────────────────────────────────────────────

  /**
   * Returns the initialization Promise that resolves when the session probe
   * completes. Resolves `true` if a session was found, `false` otherwise.
   *
   * If initializeSession() has not yet been called, returns a resolved
   * Promise<false> so callers can always safely `await` this method.
   *
   * **Primary use-case: router guards on protected routes.**
   *
   * @returns {Promise<boolean>}
   *
   * @example
   * // In a route guard:
   * const authenticated = await identityService.isReady();
   * if (!authenticated) navigate('/onboarding');
   */
  isReady() {
    return this.#initPromise ?? Promise.resolve(false);
  }

  /**
   * Returns `true` while the session probe is in-flight (i.e., initializeSession
   * was called but has not yet resolved).
   *
   * @returns {boolean}
   */
  isInitializing() {
    // A pending Promise has no synchronous way to check its state, so we track
    // it by storing a _settled flag that flips when the Promise settles.
    return this.#initPromise !== null && !this.#initSettled;
  }

  /** @type {boolean} Flips to true once #initPromise has settled. */
  #initSettled = false;

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Attempt to restore a previous session on application cold-start.
   *
   * Flow:
   *   1. Call GET /api/profile/me with no access token.
   *   2. api-client receives the 401 (missing_token) and fires the silent
   *      refresh using the HttpOnly cookie — all transparent to this method.
   *   3. If refresh succeeds, api-client retries /api/profile/me and returns
   *      the UserIdentityDTO. We dispatch AUTH_LOGIN to hydrate global state.
   *   4. If the cookie is absent or expired, the request throws and we leave
   *      the app in the anonymous visitor state (no explicit action needed).
   *
   * **Design: fire-and-forget from app.js.**
   * The call should NOT be awaited by the boot sequence. Instead, the UI
   * renders in the visitor state immediately, then transitions to the
   * authenticated state once this resolves — eliminating the flash of an
   * empty loading screen that would occur if the router blocked on auth.
   *
   * For protected routes that truly require authentication, the router guards
   * should subscribe to `stateManager.get('user.isAuthenticated')` reactively,
   * not block the initial render.
   *
   * @returns {Promise<boolean>} Resolves `true` if session was restored, `false` otherwise.
   */
  initializeSession() {
    // Idempotent: if a probe is already in-flight or has completed, return the
    // same Promise. This prevents double-probes if app.js and a route guard
    // both call initializeSession() in the same tick.
    if (this.#initPromise) return this.#initPromise;

    // Zombie session guard: a previous logout declared intent but didn't complete.
    // The HttpOnly refresh cookie may still be valid — do NOT restore the session.
    try {
      if (localStorage.getItem(PENDING_LOGOUT_KEY)) {
        logger.info('[IdentityService] Pending logout detected — skipping session restore.');
        localStorage.removeItem(PENDING_LOGOUT_KEY);
        this.#initSettled = true;
        this.#initPromise = Promise.resolve(false);
        return this.#initPromise;
      }
    } catch { /* localStorage unavailable — proceed normally */ }

    logger.info('[IdentityService] Probing session on cold start…');
    this.#initSettled = false;

    this.#initPromise = (async () => {
      try {
        /**
         * @type {UserIdentityDTO}
         * apiFetch unwraps the ApiResponse envelope — we receive the `data` field directly.
         */
        const identity = await apiFetch(API.PROFILE);
        this.#commitLogin(identity);
        logger.info('[IdentityService] Session restored for', identity.email);

        // Cold-start migration check: trigger migration or mark complete/sync ownerId
        try {
          const userId = identity.userId || identity.id;
          if (userId) {
            await migrationService.checkAndMigrate(userId, identity.migrationVersion);
          }
        } catch (migrationErr) {
          logger.error('[IdentityService] Cold start migration check failed:', migrationErr);
        }

        return true;
      } catch (err) {
        // Network down, no cookie, or cookie expired — not an error, just a visitor.
        if (err instanceof ApiError && err.status !== 0) {
          logger.info('[IdentityService] No active session —', err.error);
        } else if (err?.status === 0) {
          logger.warn('[IdentityService] Network unavailable during session probe.');
        }
        return false;
      } finally {
        // Mark as settled so isInitializing() returns false from this point on
        this.#initSettled = true;
      }
    })();

    return this.#initPromise;
  }

  /**
   * Authenticate a user with email and password.
   *
   * On success:
   *   - Stores the access token in the api-client closure via `setAccessToken`.
   *   - Fetches the full identity from GET /api/profile/me.
   *   - Dispatches AUTH_LOGIN to state-manager with the UserIdentityDTO payload.
   *   - Emits EVENTS.AUTH_LOGIN_SUCCESS on the event bus.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<UserIdentityDTO>}
   * @throws {ApiError} If credentials are invalid or the server is unreachable.
   *
   * @example
   * try {
   *   await identityService.login(email, password);
   *   eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' });
   * } catch (err) {
   *   if (err instanceof ApiError && err.status === 401) showInvalidCredentials();
   * }
   */
  /**
   * Create a new user account.
   *
   * The server returns status 'pending_verification' — the user must confirm
   * their email before logging in. No access token is issued at this stage.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ userId: string, email: string }>}
   * @throws {ApiError} On validation errors or duplicate email (status 499).
   */
  async register(email, password) {
    const response = await apiFetch(API.REGISTER, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    try {
      localStorage.setItem('pending_verification_email', email);
    } catch {
      logger.warn('[IdentityService] Could not store pending verification email.');
    }

    return response;
  }

  async login(email, password) {
    /**
     * @type {AuthResponseDTO}
     * POST /api/auth/login → { accessToken: string }
     * The refreshToken arrives exclusively as Set-Cookie (HttpOnly).
     */
    const authResponse = await apiFetch(API.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (authResponse.mfaRequired) {
      return { status: 'mfa_required', mfaToken: authResponse.mfaToken };
    }

    if (authResponse.challenge === 'device_verification') {
      return { status: 'device_verification_required', email: authResponse.email };
    }

    // Persist the short-lived token in the secure closure immediately.
    // From this point on, apiFetch will inject it as Bearer automatically.
    setAccessToken(authResponse.accessToken);

    // Fetch the full identity (role, MFA status, etc.) using the fresh token.
    /** @type {UserIdentityDTO} */
    const identity = await apiFetch(API.PROFILE);

    this.#commitLogin(identity);

    logger.info('[IdentityService] Login successful for', identity.email);
    eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: identity });

    return identity;
  }

  /**
   * Authenticate a user via Google Identity Services (OAuth2).
   * 
   * @param {string} credential - The JWT credential returned by Google
   * @returns {Promise<UserIdentityDTO | { status: 'mfa_required', mfaToken: string }>}
   */
  async googleAuth(credential) {
    const response = await apiFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });

    if (response.mfaRequired) {
      return { status: 'mfa_required', mfaToken: response.mfaToken };
    }

    if (response.challenge === 'device_verification') {
      return { status: 'device_verification_required', email: response.email };
    }

    setAccessToken(response.accessToken);
    const identity = await apiFetch(API.PROFILE);
    this.#commitLogin(identity);
    logger.info('[IdentityService] Google Login successful for', identity.email);
    eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: identity });

    return identity;
  }

  /**
   * Verify device using OTP
   */
  async verifyDevice(email, otpCode) {
    const response = await apiFetch('/api/auth/verify-device', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    });

    if (response.mfaRequired) {
      return { status: 'mfa_required', mfaToken: response.mfaToken };
    }

    setAccessToken(response.accessToken);
    const identity = await apiFetch(API.PROFILE);
    this.#commitLogin(identity);
    logger.info('[IdentityService] Device verification successful for', identity.email);
    eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: identity });

    return identity;
  }

  /**
   * Verify email using OTP
   */
  async verifyOtp(email, code) {
    const response = await apiFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });

    setAccessToken(response.accessToken);
    const identity = await apiFetch(API.PROFILE);
    this.#commitLogin(identity);
    logger.info('[IdentityService] Email verification successful for', identity.email);
    eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: identity });

    return identity;
  }

  /**
   * Sign the current user out, locally and on the server.
   *
   * Sequence (fail-fast order):
   *   1. Call POST /api/auth/logout — instructs server to revoke refresh token
   *      and clear the HttpOnly cookie. Fire-and-forget; we don't wait for it
   *      to clear local state, so the UI feels instant.
   *   2. Clear the in-memory access token from the api-client closure.
   *   3. Dispatch AUTH_LOGOUT to state-manager (wipes isAuthenticated, role, etc.).
   *   4. Clear in-RAM caches: recommendations, favorites in-flight data.
   *   5. Emit EVENTS.AUTH_LOGOUT for any listeners (nav, modals, etc.).
   *   6. Navigate to the onboarding screen.
   *
   * @returns {Promise<void>}
   */
  async logout() {
    // Declare logout intent BEFORE the network call (zombie session guard).
    // If the process dies or the call fails while offline, the HttpOnly refresh
    // cookie may still be alive. On next boot, initializeSession() detects this
    // flag and skips session restoration so the user stays logged out.
    try {
      localStorage.setItem(PENDING_LOGOUT_KEY, '1');
    } catch {
      logger.warn('[IdentityService] Could not set pending logout flag.');
    }

    // 1. Notify the server — best-effort (don't block local cleanup on failure)
    apiFetch(API.LOGOUT, { method: 'POST' })
      .then(() => {
        // Server invalidated the cookie — safe to clear the guard flag.
        try { localStorage.removeItem(PENDING_LOGOUT_KEY); } catch { /* ignore */ }
      })
      .catch(err => {
        // Flag stays — initializeSession() will handle it on next boot.
        logger.warn('[IdentityService] Server logout failed; pending flag preserved:', err.error ?? err.message);
      });

    this.#commitLogout();
    logger.info('[IdentityService] User logged out.');
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Apply login state: updates the state-manager with the UserIdentityDTO.
   *
   * The access token is NOT included in the payload — it lives exclusively in
   * the api-client closure. The state-manager only receives public identity
   * fields safe for in-RAM and (if ever needed) serialization.
   *
   * @param {UserIdentityDTO} identity
   */
  #commitLogin(identity) {
    stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
      id:            identity.userId || identity.id,
      email:         identity.email,
      role:          identity.role,
      isMfaEnabled:  identity.isMfaEnabled,
      emailVerified: identity.emailVerified,
    });
  }

  /**
   * Apply logout state:
   *   - Revokes the in-memory access token.
   *   - Dispatches AUTH_LOGOUT to clear auth flags in state.
   *   - Clears volatile in-RAM caches (recommendations, etc.).
   *   - Emits the bus event for any listeners.
   *   - Forces navigation to the onboarding/login screen.
   */
  #commitLogout() {
    // 1. Kill the access token immediately so no further request can use it
    clearAccessToken();

    // 2. Clear identity fields in global state (isAuthenticated → false, role → null, …)
    stateManager.dispatch(ACTIONS.AUTH_LOGOUT);

    // 3. Purge volatile in-RAM caches that belong to the session
    //    Recommendations are AI-generated per user — must not leak to the next session.
    stateManager.dispatch(ACTIONS.INVALIDATE_RECOMMENDATIONS);

    // 4. Broadcast logout to the bus — nav, modals, and pages can react
    eventBus.emit(EVENTS.AUTH_LOGOUT, null);

    // 5. Force navigation to onboarding/login — no history entry (replace)
    //    We use the EventBus router instead of window.location.href to keep
    //    the SPA router in sync and avoid a full page reload.
    eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: ROUTE.ONBOARDING });
  }

  /**
   * Register the AUTH_EXPIRED listener — the "Apocalypse Handler".
   *
   * This event is emitted by api-client when:
   *   - A request returns 401 (expired_token | missing_token).
   *   - The subsequent POST /api/auth/refresh also fails.
   *
   * At that point the session is unrecoverable. We must:
   *   1. Execute the same local cleanup as a voluntary logout.
   *   2. Force the user to re-authenticate.
   *
   * The `#handlingExpiry` guard prevents a race where multiple concurrent
   * requests all receive 401 and each independently triggers this handler.
   */
  #registerApocalypseListener() {
    eventBus.on(EVENTS.AUTH_EXPIRED, (payload) => {
      if (this.#handlingExpiry) {
        logger.warn('[IdentityService] AUTH_EXPIRED already being handled — ignoring duplicate.');
        return;
      }

      this.#handlingExpiry = true;

      logger.warn('[IdentityService] AUTH_EXPIRED received — reason:', payload?.reason ?? 'unknown');

      // Show a toast so the user understands why they were signed out
      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Sua sessão expirou. Por favor, entre novamente.',
        type: 'warning',
        duration: 5000,
      });

      // Execute full local cleanup + navigation
      this.#commitLogout();

      // Reset guard after a short delay to handle any edge-case re-triggering
      setTimeout(() => { this.#handlingExpiry = false; }, 5000);
    });
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

/**
 * The global IdentityService singleton.
 * Import this instance anywhere you need to interact with authentication.
 *
 * @type {IdentityService}
 *
 * @example
 * import { identityService } from '../platform/identity-service.js';
 *
 * // Boot (app.js)
 * identityService.initializeSession(); // fire-and-forget
 *
 * // Login form
 * await identityService.login(email, password);
 *
 * // Logout button
 * await identityService.logout();
 */
export const identityService = new IdentityService();
