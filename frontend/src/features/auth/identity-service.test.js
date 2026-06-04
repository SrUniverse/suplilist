/**
 * identity-service.test.js — Unit tests for the Identity service.
 *
 * Verified behaviors:
 *  1. login() calls POST /api/auth/login with credentials
 *  2. login() stores access token via setAccessToken
 *  3. login() dispatches AUTH_LOGIN with JWT claims (id, role)
 *  4. login() emits AUTH_LOGIN_SUCCESS on the event bus
 *  5. login() rejects with ApiError on invalid credentials (401)
 *  6. register() calls POST /api/auth/register and returns RegisterResponseDTO
 *  7. register() does NOT set a token (account is pending_verification)
 *  8. logout() calls POST /api/auth/logout
 *  9. logout() clears the in-memory token via clearAccessToken
 * 10. logout() dispatches AUTH_LOGOUT to state-manager
 * 11. logout() emits AUTH_LOGOUT on event bus
 * 12. AUTH_EXPIRED listener fires logout automatically (session expiry recovery)
 * 13. login() extracts userId (sub) from JWT payload without network round-trip
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────
// All mocks declared before any imports so Vitest's hoisting works correctly.

vi.mock('../../platform/api-client.js', () => ({
  apiFetch: vi.fn(),
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(status, error, message = '') {
      super(message || error);
      this.name = 'ApiError';
      this.status = status;
      this.error = error;
    }
  },
}));

vi.mock('../../state/state-manager.js', () => ({
  stateManager: { dispatch: vi.fn() },
  ACTIONS: {
    AUTH_LOGIN: 'AUTH_LOGIN',
    AUTH_LOGOUT: 'AUTH_LOGOUT',
  },
}));

vi.mock('../../core/event-bus.js', () => {
  // The service calls eventBus.on(EVENTS.AUTH_EXPIRED, ...) in its init.
  // We capture the registered callback so we can invoke it in test 12.
  const listeners = {};
  return {
    eventBus: {
      on: vi.fn((event, cb) => { listeners[event] = cb; }),
      emit: vi.fn(),
      _listeners: listeners,
    },
    EVENTS: {
      AUTH_LOGIN_SUCCESS: 'auth:loginSuccess',
      AUTH_LOGOUT: 'auth:logout',
      AUTH_EXPIRED: 'auth:expired',
      AUTH_SESSION_REFRESHED: 'auth:sessionRefreshed',
    },
  };
});

// ── Imports after mocks ────────────────────────────────────────────────────────
import { identityService } from './identity-service.js';
import { apiFetch, setAccessToken, clearAccessToken } from '../../platform/api-client.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';

// ── JWT fixture ────────────────────────────────────────────────────────────────
// Build a minimal JWT with a known payload so tests can verify claim extraction.
// The signature is fake — identity-service only reads the payload (middle segment).
function makeJwt(claims) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${header}.${payload}.fake-sig`;
}

const FAKE_USER_ID = 'aabbccdd11223344';
const FAKE_TOKEN = makeJwt({
  sub: FAKE_USER_ID,
  role: 'user',
  status: 'active',
  jti: 'jti-abc',
  exp: Math.floor(Date.now() / 1000) + 900,
});

// ── Setup ──────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ── 1-5: login() ───────────────────────────────────────────────────────────────

describe('login()', () => {
  it('calls POST /api/auth/login with email and password', async () => {
    apiFetch.mockResolvedValueOnce({ accessToken: FAKE_TOKEN });

    await identityService.login('user@test.com', 'Secret123!');

    expect(apiFetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'Secret123!' }),
    });
  });

  it('stores the access token via setAccessToken', async () => {
    apiFetch.mockResolvedValueOnce({ accessToken: FAKE_TOKEN });

    await identityService.login('user@test.com', 'Secret123!');

    expect(setAccessToken).toHaveBeenCalledWith(FAKE_TOKEN);
  });

  it('dispatches AUTH_LOGIN with id and role extracted from JWT payload', async () => {
    apiFetch.mockResolvedValueOnce({ accessToken: FAKE_TOKEN });

    await identityService.login('user@test.com', 'Secret123!');

    expect(stateManager.dispatch).toHaveBeenCalledWith(
      ACTIONS.AUTH_LOGIN,
      expect.objectContaining({
        id: FAKE_USER_ID,
        role: 'user',
      }),
    );
  });

  it('emits AUTH_LOGIN_SUCCESS on the event bus', async () => {
    apiFetch.mockResolvedValueOnce({ accessToken: FAKE_TOKEN });

    await identityService.login('user@test.com', 'Secret123!');

    expect(eventBus.emit).toHaveBeenCalledWith(
      EVENTS.AUTH_LOGIN_SUCCESS,
      expect.objectContaining({ id: FAKE_USER_ID }),
    );
  });

  it('propagates ApiError on 401 invalid_credentials without side effects', async () => {
    const { ApiError } = await import('../../platform/api-client.js');
    apiFetch.mockRejectedValueOnce(new ApiError(401, 'invalid_credentials'));

    await expect(identityService.login('x@x.com', 'wrong')).rejects.toMatchObject({
      status: 401,
      error: 'invalid_credentials',
    });

    // Token must NOT be set, state must NOT change on failure
    expect(setAccessToken).not.toHaveBeenCalled();
    expect(stateManager.dispatch).not.toHaveBeenCalled();
  });
});

// ── 6-7: register() ────────────────────────────────────────────────────────────

describe('register()', () => {
  it('calls POST /api/auth/register and returns RegisterResponseDTO', async () => {
    const dto = { userId: 'new-id', email: 'new@test.com', status: 'pending_verification' };
    apiFetch.mockResolvedValueOnce(dto);

    const result = await identityService.register('new@test.com', 'Pass123!');

    expect(apiFetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', password: 'Pass123!' }),
    });
    expect(result).toEqual(dto);
  });

  it('does NOT call setAccessToken — account starts as pending_verification', async () => {
    apiFetch.mockResolvedValueOnce({
      userId: 'new-id', email: 'new@test.com', status: 'pending_verification',
    });

    await identityService.register('new@test.com', 'Pass123!');

    expect(setAccessToken).not.toHaveBeenCalled();
  });
});

// ── 8-11: logout() ─────────────────────────────────────────────────────────────

describe('logout()', () => {
  it('calls POST /api/auth/logout', async () => {
    apiFetch.mockResolvedValueOnce({ success: true });

    await identityService.logout();

    expect(apiFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
  });

  it('clears the in-memory access token', async () => {
    apiFetch.mockResolvedValueOnce({ success: true });

    await identityService.logout();

    expect(clearAccessToken).toHaveBeenCalled();
  });

  it('dispatches AUTH_LOGOUT to state-manager', async () => {
    apiFetch.mockResolvedValueOnce({ success: true });

    await identityService.logout();

    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.AUTH_LOGOUT, null);
  });

  it('emits AUTH_LOGOUT on event bus', async () => {
    apiFetch.mockResolvedValueOnce({ success: true });

    await identityService.logout();

    expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.AUTH_LOGOUT, null);
  });

  it('clears token even when the server request fails (graceful offline logout)', async () => {
    apiFetch.mockRejectedValueOnce(new Error('network error'));

    // Should not throw — local cleanup must always happen
    await identityService.logout();

    expect(clearAccessToken).toHaveBeenCalled();
    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.AUTH_LOGOUT, null);
  });
});

// ── 12: AUTH_EXPIRED → auto-logout ────────────────────────────────────────────

describe('AUTH_EXPIRED automatic logout', () => {
  it('registers a listener for AUTH_EXPIRED during service initialization', () => {
    // The singleton registers its listener at module import time — before any
    // beforeEach runs. Checking eventBus.on call count would be fragile because
    // vi.clearAllMocks() resets it. Instead, assert the listener is present in
    // the _listeners map that our mock captures.
    expect(eventBus._listeners[EVENTS.AUTH_EXPIRED]).toBeDefined();
    expect(typeof eventBus._listeners[EVENTS.AUTH_EXPIRED]).toBe('function');
  });

  it('invokes logout path when AUTH_EXPIRED fires (token/state cleared)', async () => {
    // Simulate api-client emitting AUTH_EXPIRED
    const expiredHandler = eventBus._listeners[EVENTS.AUTH_EXPIRED];
    expect(expiredHandler).toBeDefined();

    apiFetch.mockResolvedValueOnce({ success: true });

    await expiredHandler({ reason: 'session_revoked' });

    expect(clearAccessToken).toHaveBeenCalled();
    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.AUTH_LOGOUT, null);
  });
});

// ── 13: JWT payload extraction ─────────────────────────────────────────────────

describe('JWT claim extraction', () => {
  it('extracts userId from sub claim without a second network call', async () => {
    const adminToken = makeJwt({ sub: 'admin-id-999', role: 'admin', status: 'active' });
    apiFetch.mockResolvedValueOnce({ accessToken: adminToken });

    await identityService.login('admin@test.com', 'AdminPass!');

    expect(stateManager.dispatch).toHaveBeenCalledWith(
      ACTIONS.AUTH_LOGIN,
      expect.objectContaining({ id: 'admin-id-999', role: 'admin' }),
    );
    // Only ONE fetch call — no second call to /api/identity/me
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
