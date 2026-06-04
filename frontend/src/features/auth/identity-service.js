/**
 * @deprecated Use `platform/identity-service.js` instead.
 * This file is kept only for its unit tests. Do not import it in application code.
 * All features (register, login, logout, initializeSession, PENDING_LOGOUT_KEY)
 * have been merged into `platform/identity-service.js`.
 *
 * identity-service.js — Repository for Identity/Auth operations.
 *
 * Sits between the UI and api-client. Responsibilities:
 *
 *  - Translate HTTP responses into state-manager dispatches.
 *  - Store the access token via api-client (never stored here directly).
 *  - Emit domain events on the event bus after state transitions.
 *  - Register the AUTH_EXPIRED listener so session expiry auto-logs out.
 *
 * ── Security invariants ────────────────────────────────────────────────────────
 *
 * ZOMBIE SESSION PREVENTION (pending logout flag)
 *   The refresh token travels exclusively as an HttpOnly cookie — JavaScript
 *   cannot delete it directly. If POST /api/auth/logout fails (offline), a
 *   naive implementation that only clears the in-memory token leaves the cookie
 *   alive. On next boot, api-client would silently restore the session using the
 *   residual cookie — the user believes they logged out but didn't.
 *
 *   Fix: write PENDING_LOGOUT_KEY to localStorage BEFORE the network call.
 *     - logout success → server invalidated cookie → clear the flag.
 *     - logout failure → flag persists → initializeSession() reads it on next
 *       boot and skips session restoration entirely, forcing a clean login.
 *
 * CONSISTENT UI STATE (profile fetch inside login)
 *   The JWT payload only carries sub, role, status — no displayName, avatarUrl.
 *   Dispatching AUTH_LOGIN with partial data causes the header to render in a
 *   broken state until some other async path fills in the profile.
 *   Fix: login() always fetches GET /api/profile/me before dispatching state.
 *   The loading state in the UI covers both the auth call and the profile call.
 *
 * CREDENTIALS NEVER STORED
 *   email/password are passed directly to apiFetch — never assigned to instance
 *   state, never logged, never cached.
 *
 * GRACEFUL OFFLINE LOGOUT
 *   Local cleanup (clearAccessToken, AUTH_LOGOUT dispatch) always runs even when
 *   the server request fails. The pending flag ensures correctness at next boot.
 *
 * JWT PAYLOAD DECODING
 *   decodeJwtPayload() reads public claims without verifying the signature.
 *   Signature verification is the server's responsibility on every authenticated
 *   request. The client only needs sub and role to initialize identity state.
 *
 * @module features/auth/identity-service
 */

import { apiFetch, setAccessToken, clearAccessToken } from '../../platform/api-client.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { logger } from '../../utils/logger.js';

// ── Pending logout flag ────────────────────────────────────────────────────────

/**
 * localStorage key for the zombie session guard.
 *
 * Lifecycle:
 *  SET  — at the start of logout(), before the network call
 *  KEPT — when the network call fails (persists across reloads)
 *  CLEARED — when the network call succeeds (server handled revocation)
 *
 * initializeSession() checks this flag before restoring any session.
 * If present it skips refresh, clears state, and removes the flag.
 */
export const PENDING_LOGOUT_KEY = 'suplilist:pendingLogout';

// ── JWT payload parser ─────────────────────────────────────────────────────────

/**
 * Decode the payload segment of a JWT without verifying the signature.
 *
 * The server verifies the signature on every authenticated request.
 * The client reads public claims (sub, role, status) only — no crypto.
 *
 * @param {string} token - JWT in header.payload.signature format
 * @returns {{ sub: string, role: string, status: string, exp: number, jti: string }}
 * @throws {Error} If the token is malformed
 */
function decodeJwtPayload(token) {
  try {
    const [, payloadB64] = token.split('.');
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized));
  } catch (err) {
    throw new Error(`[IdentityService] Malformed JWT: ${err.message}`, { cause: err });
  }
}

// ── IdentityService ────────────────────────────────────────────────────────────

class IdentityService {
  constructor() {
    // Listen for session expiry emitted by api-client when refresh fails.
    // Decouples the HTTP transport layer from auth state management.
    eventBus.on(EVENTS.AUTH_EXPIRED, async (payload) => {
      logger.warn('[IdentityService] Session expired, logging out.', payload);
      await this.logout();
    });
  }

  // ── login ────────────────────────────────────────────────────────────────────

  /**
   * Authenticate the user and populate complete UI state in a single loading cycle.
   *
   * Flow:
   *  1. POST /api/auth/login → receive AuthResponseDTO { accessToken }
   *  2. setAccessToken() — token enters api-client closure
   *  3. GET /api/profile/me — fetch displayName, avatarUrl, email (not in JWT)
   *  4. dispatch AUTH_LOGIN with merged identity + profile data
   *  5. emit AUTH_LOGIN_SUCCESS
   *
   * The loading state in the calling UI must cover ALL of these steps.
   * Releasing the spinner after step 1 would expose a state where the
   * header has no name or avatar — visible flash of incomplete UI.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} Complete identity payload dispatched to state
   * @throws {import('../../platform/api-client.js').ApiError}
   */
  async login(email, password) {
    // Step 1: authenticate — get the access token
    /** @type {{ accessToken: string }} */
    const { accessToken } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Step 2: token enters memory closure — authenticated requests are now possible
    setAccessToken(accessToken);

    // Step 3: fetch the full profile while the loading state is still active.
    // If this call fails (network error between steps 1 and 3), the token is
    // already set. The caller must handle the error — logout() provides cleanup.
    const profile = await apiFetch('/api/profile/me');

    // Extract public claims from JWT (no verification — server handles that)
    const claims = decodeJwtPayload(accessToken);

    const identity = {
      id: claims.sub,
      role: claims.role,
      emailVerified: claims.status === 'active',
      isMfaEnabled: false, // not in JWT; fetched separately if MFA page is opened
      // Profile fields that are absent from the JWT payload
      email: profile.email ?? null,
      displayName: profile.displayName ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      avatarStatus: profile.avatarStatus ?? 'none',
    };

    // Step 4: single state update — UI transitions from loading to complete in one frame
    stateManager.dispatch(ACTIONS.AUTH_LOGIN, identity);

    // Step 5: notify listeners (router can redirect, nav can show user menu, etc.)
    eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, identity);

    return identity;
  }

  // ── register ─────────────────────────────────────────────────────────────────

  /**
   * Create a new account via POST /api/auth/register.
   *
   * The returned account has status 'pending_verification' — the user must
   * verify their email before they can log in. No token is issued at this stage.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import('../../../../shared/src/identity').RegisterResponseDTO>}
   * @throws {import('../../platform/api-client.js').ApiError}
   */
  async register(email, password) {
    const result = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // No token — account is pending_verification until email is confirmed
    return result;
  }

  // ── logout ───────────────────────────────────────────────────────────────────

  /**
   * Terminate the current session — safe in all network conditions.
   *
   * The pending logout flag is written FIRST, before the network call.
   * This guarantees that even if the call fails (offline) and the HttpOnly
   * refresh cookie survives, the next call to initializeSession() will detect
   * the flag and refuse to restore the session.
   *
   * Flag lifecycle:
   *  - Set before network call (crash-safe intent declaration)
   *  - Cleared on success (server invalidated the cookie)
   *  - Kept on failure (initializeSession() handles it at next boot)
   *
   * @returns {Promise<void>}
   */
  async logout() {
    // Declare intent to log out BEFORE the network call.
    // If the process crashes or the call fails, this flag survives.
    try {
      localStorage.setItem(PENDING_LOGOUT_KEY, '1');
    } catch {
      // localStorage can be unavailable (private mode quota exceeded, etc.)
      // Proceed anyway — best-effort protection.
      logger.warn('[IdentityService] Could not set pending logout flag in localStorage.');
    }

    // Attempt server-side revocation of the refresh token cookie + JTI blocklist
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      // Success: server invalidated the cookie — safe to clear the guard flag
      localStorage.removeItem(PENDING_LOGOUT_KEY);
    } catch (err) {
      // Network failure — flag stays in localStorage.
      // initializeSession() will handle it on next boot.
      logger.warn('[IdentityService] Logout server call failed; pending flag preserved for next boot:', err);
    }

    // Always clear local session — must not depend on network availability
    clearAccessToken();
    stateManager.dispatch(ACTIONS.AUTH_LOGOUT, null);
    eventBus.emit(EVENTS.AUTH_LOGOUT, null);
  }

  // ── initializeSession ────────────────────────────────────────────────────────

  /**
   * Called once at app boot to restore an authenticated session if one exists.
   *
   * Guards against the zombie session attack vector:
   *  1. Check localStorage for PENDING_LOGOUT_KEY.
   *     If present: a previous logout failed mid-flight. The refresh cookie may
   *     still be valid, but we must NOT use it. Clear local state and return
   *     { isAuthenticated: false }.
   *  2. Attempt POST /api/auth/refresh (sends HttpOnly cookie automatically).
   *     On success: store token, fetch profile, dispatch AUTH_LOGIN.
   *     On failure: no valid session — return { isAuthenticated: false }.
   *
   * @returns {Promise<{ isAuthenticated: boolean }>}
   */
  async initializeSession() {
    // Guard: a previous logout declared its intent but didn't complete.
    // Do NOT attempt to restore the session — the user chose to log out.
    const pendingLogout = localStorage.getItem(PENDING_LOGOUT_KEY);
    if (pendingLogout) {
      logger.info('[IdentityService] Pending logout detected — skipping session restore.');
      localStorage.removeItem(PENDING_LOGOUT_KEY);
      // Ensure state is clean (in case a previous boot partially hydrated it)
      clearAccessToken();
      stateManager.dispatch(ACTIONS.AUTH_LOGOUT, null);
      return { isAuthenticated: false };
    }

    // Attempt silent session restoration via the HttpOnly refresh cookie
    try {
      const data = await apiFetch('/api/auth/refresh', {
        method: 'POST',
        _isRetry: true, // prevent recursive refresh loop inside api-client
      });

      const accessToken = data?.accessToken ?? data?.data?.accessToken;
      if (!accessToken) return { isAuthenticated: false };

      setAccessToken(accessToken);

      // Fetch full profile so UI state is complete from the first render
      const profile = await apiFetch('/api/profile/me');
      const claims = decodeJwtPayload(accessToken);

      const identity = {
        id: claims.sub,
        role: claims.role,
        emailVerified: claims.status === 'active',
        isMfaEnabled: false,
        email: profile.email ?? null,
        displayName: profile.displayName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        avatarStatus: profile.avatarStatus ?? 'none',
      };

      stateManager.dispatch(ACTIONS.AUTH_LOGIN, identity);
      return { isAuthenticated: true };
    } catch {
      // No valid session — expected for first-time users or after real logouts
      return { isAuthenticated: false };
    }
  }
}

/**
 * Singleton identity service.
 * The AUTH_EXPIRED listener is registered once when the module is first imported.
 * @type {IdentityService}
 */
export const identityService = new IdentityService();
