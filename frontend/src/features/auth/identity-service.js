/**
 * identity-service.js — Repository for Identity/Auth operations.
 *
 * Sits between the UI and api-client. Responsibilities:
 *
 *  - Translate HTTP responses into state-manager dispatches.
 *  - Store the access token via api-client (never stored here directly).
 *  - Emit domain events on the event bus after state transitions.
 *  - Register the AUTH_EXPIRED listener so session expiry auto-logs out.
 *
 * Security invariants:
 *  - Credentials (email/password) are passed directly to apiFetch — never
 *    stored as instance state, never logged.
 *  - JWT payload is decoded client-side only to read public claims (sub, role,
 *    status). No signature verification — that is the server's responsibility.
 *  - logout() always clears local state, even when the server call fails
 *    (e.g. offline). Local cleanup must not depend on network availability.
 *
 * @module features/auth/identity-service
 */

import { apiFetch, setAccessToken, clearAccessToken } from '../../platform/api-client.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { logger } from '../../utils/logger.js';

// ── JWT payload parser ─────────────────────────────────────────────────────────

/**
 * Decode the payload segment of a JWT without verifying the signature.
 *
 * The server verifies the signature on every authenticated request.
 * The client only needs the public claims (sub, role, status) to update
 * local state — no crypto required here.
 *
 * @param {string} token - JWT in header.payload.signature format
 * @returns {{ sub: string, role: string, status: string, exp: number, jti: string }}
 * @throws {Error} If the token is malformed
 */
function decodeJwtPayload(token) {
  try {
    const [, payloadB64] = token.split('.');
    // JWT uses URL-safe base64 (- and _ instead of + and /)
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized);
    return JSON.parse(json);
  } catch (err) {
    throw new Error(`[IdentityService] Malformed JWT: ${err.message}`);
  }
}

// ── IdentityService ────────────────────────────────────────────────────────────

class IdentityService {
  constructor() {
    // Listen for session expiry emitted by api-client when refresh fails.
    // This decouples the HTTP layer from the auth state cleanup.
    eventBus.on(EVENTS.AUTH_EXPIRED, async (payload) => {
      logger.warn('[IdentityService] Session expired, logging out.', payload);
      await this.logout();
    });
  }

  // ── login ────────────────────────────────────────────────────────────────────

  /**
   * Authenticate the user against POST /api/auth/login.
   *
   * On success:
   *  - Stores the access token in api-client's in-memory closure.
   *  - Dispatches AUTH_LOGIN with identity claims decoded from the JWT.
   *  - Emits AUTH_LOGIN_SUCCESS so UI components can react.
   *
   * On failure: re-throws ApiError — caller renders the appropriate error UI.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ id: string, role: string, status: string }>} Resolved identity
   * @throws {import('../../platform/api-client.js').ApiError}
   */
  async login(email, password) {
    /** @type {{ accessToken: string }} — matches AuthResponseDTO */
    const { accessToken } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token in api-client closure — the ONLY place it lives
    setAccessToken(accessToken);

    // Decode public claims for state update — no network call needed
    const claims = decodeJwtPayload(accessToken);
    const identity = {
      id: claims.sub,
      role: claims.role,
      // status 'active' implies email was verified at some point
      emailVerified: claims.status === 'active',
      isMfaEnabled: false, // not in JWT payload; fetch from /api/profile/me separately
    };

    stateManager.dispatch(ACTIONS.AUTH_LOGIN, identity);
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
    /** @type {import('../../../../shared/src/identity').RegisterResponseDTO} */
    const result = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // No token — account is pending_verification until email is confirmed
    return result;
  }

  // ── logout ───────────────────────────────────────────────────────────────────

  /**
   * Terminate the current session.
   *
   * Local state is always cleaned up, even if the server request fails
   * (e.g. the user is offline). The server invalidates the refresh token
   * cookie and blocklists the JTI when reachable.
   *
   * @returns {Promise<void>}
   */
  async logout() {
    // Attempt server-side revocation — swallow errors so local cleanup always runs
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      logger.warn('[IdentityService] Logout server call failed (continuing local cleanup):', err);
    }

    // Always clear local session regardless of network outcome
    clearAccessToken();
    stateManager.dispatch(ACTIONS.AUTH_LOGOUT, null);
    eventBus.emit(EVENTS.AUTH_LOGOUT, null);
  }
}

/**
 * Singleton identity service.
 * The AUTH_EXPIRED listener is registered once when the module is first imported.
 * @type {IdentityService}
 */
export const identityService = new IdentityService();
