/**
 * api-client.js — Canonical HTTP client for SupliList backend.
 *
 * Design invariants:
 *
 *  ACCESS TOKEN STORAGE
 *    The JWT access token lives ONLY in the module-level `_accessToken` closure.
 *    It is never written to localStorage, sessionStorage, state-manager, or the DOM.
 *    XSS on another page cannot reach a different module's private closure.
 *
 *  REFRESH TOKEN TRANSPORT
 *    The refresh token is exclusively an HttpOnly Set-Cookie.
 *    It is never readable by JavaScript — credentials: 'include' sends it
 *    automatically on /api/auth/refresh without any JS involvement.
 *
 *  CSRF GUARD
 *    Every request carries X-SupliList-Client: 1. The backend rejects any
 *    request missing this header with 403 csrf_protection_triggered.
 *
 *  TOKEN REFRESH FLOW
 *    On 401 with error 'expired_token' or 'missing_token':
 *      1. Fire POST /api/auth/refresh (cookie goes automatically).
 *      2. Store the new access token in the closure.
 *      3. Retry the original request once with the fresh token.
 *      If refresh itself returns an error, emit EVENTS.AUTH_EXPIRED and
 *      throw — identity-service handles logout.
 *
 *  SINGLE-FLIGHT REFRESH
 *    If multiple concurrent requests expire simultaneously, only one
 *    /api/auth/refresh call is made. All callers await the same Promise.
 */

import { eventBus, EVENTS } from '../core/event-bus.js';
import { logger } from '../utils/logger.js';

/** @type {string} Backend origin — set via VITE_API_BASE_URL in .env.local */
const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  ?? '';

// ── In-memory token ────────────────────────────────────────────────────────────
/** @type {string | null} */
let _accessToken = null;

// ── Single-flight refresh coordination ────────────────────────────────────────
/** @type {Promise<void> | null} */
let _refreshPromise = null;

// ── Custom error type ──────────────────────────────────────────────────────────

export class ApiError extends Error {
  /**
   * @param {number} status  - HTTP status code (0 for network failure)
   * @param {string} error   - Server error code (e.g. 'expired_token')
   * @param {string} [message]
   * @param {any} [data]     - Additional payload (e.g. current item on 412)
   */
  constructor(status, error, message = '', data = null) {
    super(message || error);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.data = data;
  }
}

// ── Token accessors ────────────────────────────────────────────────────────────
// Only identity-service.js should call these. No other module needs the token.

/**
 * Store the access token received from POST /api/auth/login or /api/auth/refresh.
 * Called by identity-service immediately after a successful auth response.
 * @param {string} token
 */
export function setAccessToken(token) {
  _accessToken = token;
}

/**
 * Clear the in-memory access token.
 * Called by identity-service on logout or when AUTH_EXPIRED fires.
 */
export function clearAccessToken() {
  _accessToken = null;
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────────

/**
 * Canonical fetch wrapper for all SupliList API calls.
 *
 * @param {string} path - Absolute API path starting with /api/
 * @param {RequestInit & { _isRetry?: boolean, returnHeaders?: boolean }} [options] - Standard fetch options
 *   plus internal `_isRetry` flag (prevents recursive refresh loops) and `returnHeaders`
 *   to return the full response envelope including ETags.
 * @returns {Promise<any>} The `data` field of ApiResponse<T> by default. If `returnHeaders` is true, returns `{ data, headers }`.
 * @throws {ApiError} On HTTP errors, network failures, or auth expiry.
 *
 * @example
 * // GET with auth
 * const profile = await apiFetch('/api/profile/me');
 *
 * // POST with JSON body
 * const result = await apiFetch('/api/auth/login', {
 *   method: 'POST',
 *   body: JSON.stringify({ email, password }),
 * });
 */
export async function apiFetch(path, options = {}) {
  const { _isRetry = false, returnHeaders = false, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers ?? {});

  // CSRF guard — backend rejects without this header
  headers.set('X-SupliList-Client', '1');

  // Auto-set Content-Type for requests with a body
  if (fetchOptions.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject access token if we have one
  if (_accessToken) {
    headers.set('Authorization', `Bearer ${_accessToken}`);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'include', // sends HttpOnly refresh cookie automatically
    });
  } catch (networkError) {
    logger.error('[ApiClient] Network error on', path, networkError);
    throw new ApiError(0, 'network_error', networkError.message);
  }

  // Always parse JSON — the server returns ApiResponse<T> on every status code
  let envelope;
  try {
    envelope = await response.json();
  } catch {
    throw new ApiError(response.status, 'invalid_response', 'Non-JSON body from server');
  }

  // ── 401: attempt silent token refresh ─────────────────────────────────────
  if (response.status === 401 && !_isRetry) {
    const serverError = envelope?.error;

    if (serverError === 'expired_token' || serverError === 'missing_token') {
      try {
        await _doTokenRefresh();
        // Retry the original request — new token is now in _accessToken
        return apiFetch(path, { ...options, _isRetry: true });
      } catch (refreshError) {
        // Refresh failed — session is unrecoverable. Notify the app to log out.
        logger.warn('[ApiClient] Refresh failed, emitting AUTH_EXPIRED');
        eventBus.emit(EVENTS.AUTH_EXPIRED, {
          reason: refreshError instanceof ApiError ? refreshError.error : 'refresh_failed',
        });
        throw refreshError;
      }
    }
  }

  // ── HTTP error response ────────────────────────────────────────────────────
  if (!response.ok || envelope?.success === false) {
    throw new ApiError(
      response.status,
      envelope?.error ?? 'unknown_error',
      envelope?.message ?? `HTTP ${response.status}`,
      envelope?.data
    );
  }

  // Unwrap envelope — callers receive data, not the wrapper
  const payloadData = envelope.data ?? envelope;

  if (returnHeaders) {
    return { data: payloadData, headers: response.headers };
  }

  return payloadData;
}

// ── Internal: single-flight token refresh ─────────────────────────────────────

/**
 * Fire POST /api/auth/refresh exactly once, regardless of how many callers race.
 *
 * The HttpOnly refreshToken cookie is sent automatically via credentials: 'include'.
 * On success, stores the new accessToken in the closure and emits AUTH_SESSION_REFRESHED.
 * On failure, clears _refreshPromise and re-throws so callers can handle the error.
 *
 * @returns {Promise<void>}
 * @throws {ApiError}
 */
async function _doTokenRefresh() {
  // Multiple concurrent callers share the same Promise — one real HTTP call
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    try {
      // _isRetry: true prevents apiFetch from recursively calling _doTokenRefresh
      // if this refresh call itself returns a 401.
      const data = await apiFetch('/api/auth/refresh', {
        method: 'POST',
        _isRetry: true,
      });

      /**
       * @type {{ accessToken: string }}
       * Matches AuthResponseDTO from @suplilist/shared/identity.
       */
      const accessToken = data?.accessToken ?? data?.data?.accessToken;
      if (!accessToken) {
        throw new ApiError(0, 'refresh_no_token', 'Refresh succeeded but no accessToken in body');
      }

      setAccessToken(accessToken);
      eventBus.emit(EVENTS.AUTH_SESSION_REFRESHED, null);
    } finally {
      // Always clear the promise so the next expiry triggers a fresh refresh
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}
