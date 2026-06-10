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
import { auth } from '../features/auth/firebase-client.js';

/** @type {string} Backend origin — set via VITE_API_BASE_URL in .env.local */
const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  ?? '';

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

  // Aguardar a restauração da sessão do IndexedDB (Evita race condition no F5)
  await auth.authStateReady();

  // Inject access token if we have a logged-in user
  if (auth.currentUser) {
    try {
      // getIdToken() automatically handles refresh logic for us.
      const token = await auth.currentUser.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    } catch (e) {
      logger.warn('[ApiClient] Failed to get Firebase token', e);
    }
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'omit', // Firebase sent in header, cookies no longer used for auth
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

  // ── 401: Invalid Token from Backend ───────────────────────────────────────
  if (response.status === 401 && !_isRetry) {
    const serverError = envelope?.error;

    if (serverError === 'expired_token' || serverError === 'invalid_token' || serverError === 'missing_token') {
      try {
        if (auth.currentUser) {
          // Força refresh (true = forceRefresh)
          const newToken = await auth.currentUser.getIdToken(true);
          headers.set('Authorization', `Bearer ${newToken}`);
          // Tenta novamente com o token forçado
          return apiFetch(path, { ...options, _isRetry: true });
        }
      } catch (refreshError) {
        logger.warn('[ApiClient] Refresh failed, emitting AUTH_EXPIRED');
        eventBus.emit(EVENTS.AUTH_EXPIRED, {
          reason: 'refresh_failed',
        });
        throw new ApiError(401, 'auth_expired', 'Authentication expired');
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

// ── Simple API client object (for consumers that want get/post/put/del interface) ──

async function _request(path, options = {}) {
  const headers = {};
  headers['X-SupliList-Client'] = '1';
  
  await auth.authStateReady();
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {}
  }
  
  if (options.body) headers['Content-Type'] = 'application/json';

  const resp = await fetch(path, { ...options, headers, credentials: 'omit' });
  if (!resp.ok) {
    throw new ApiError(resp.status, 'error', `HTTP ${resp.status}`);
  }
  return resp.json();
}

async function _requestWithRetry(path, options = {}) {
  try {
    return await _request(path, options);
  } catch (err) {
    if (err.status >= 500) {
      return _request(path, options);
    }
    throw err;
  }
}

export const apiClient = {
  get: (path) => _requestWithRetry(path),
  post: (path, body) => _requestWithRetry(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => _requestWithRetry(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => _requestWithRetry(path, { method: 'DELETE' }),
};

export default apiClient;
