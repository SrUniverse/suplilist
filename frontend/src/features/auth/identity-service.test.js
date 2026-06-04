/**
 * identity-service.test.js — Unit tests for the Identity service.
 *
 * Verified behaviors:
 *
 * login()
 *  1. Calls POST /api/auth/login with credentials
 *  2. Stores access token via setAccessToken
 *  3. Fetches GET /api/profile/me AFTER setting the token (correct order)
 *  4. Dispatches AUTH_LOGIN with JWT claims AND profile fields merged
 *  5. Emits AUTH_LOGIN_SUCCESS after state is fully populated
 *  6. Propagates ApiError on auth failure — no side effects
 *  7. JWT claim extraction: userId from sub without extra network calls
 *
 * register()
 *  8. Calls POST /api/auth/register and returns RegisterResponseDTO
 *  9. Does NOT set a token — status is pending_verification
 *
 * logout() — Zombie Session Guard
 * 10. Writes PENDING_LOGOUT_KEY to localStorage BEFORE the network call
 * 11. Clears the flag on successful server logout
 * 12. Keeps the flag when the server call fails (offline scenario)
 * 13. Calls clearAccessToken regardless of network outcome
 * 14. Dispatches AUTH_LOGOUT regardless of network outcome
 * 15. Emits AUTH_LOGOUT regardless of network outcome
 *
 * initializeSession() — Boot-time session restore
 * 16. Skips refresh when PENDING_LOGOUT_KEY is present (zombie guard)
 * 17. Clears the pending flag after detecting it
 * 18. Restores session on successful refresh + profile fetch
 * 19. Returns { isAuthenticated: false } when no valid cookie exists
 *
 * AUTH_EXPIRED listener
 * 20. Listener is registered for EVENTS.AUTH_EXPIRED at construction
 * 21. Triggers full logout path (token cleared, state updated) when fired
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────
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

import { identityService, PENDING_LOGOUT_KEY } from './identity-service.js';
import { apiFetch, setAccessToken, clearAccessToken } from '../../platform/api-client.js';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';

// ── Fixtures ───────────────────────────────────────────────────────────────────

/** Build a minimal but valid JWT with a known payload. Signature is fake. */
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

/** Minimal profile response from GET /api/profile/me */
const FAKE_PROFILE = {
  displayName: 'Marcos Calistênico',
  email: 'marcos@test.com',
  avatarUrl: 'https://cdn.example.com/avatar.png',
  avatarStatus: 'approved',
};

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// ── login() ────────────────────────────────────────────────────────────────────

describe('login()', () => {
  it('1. calls POST /api/auth/login with email and password', async () => {
    apiFetch
      .mockResolvedValueOnce({ accessToken: FAKE_TOKEN })
      .mockResolvedValueOnce(FAKE_PROFILE);

    await identityService.login('user@test.com', 'Secret123!');

    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'Secret123!' }),
    });
  });

  it('2. stores the access token before fetching the profile', async () => {
    const callOrder = [];

    apiFetch
      .mockImplementationOnce(async () => {
        callOrder.push('login');
        return { accessToken: FAKE_TOKEN };
      })
      .mockImplementationOnce(async () => {
        callOrder.push('profile');
        return FAKE_PROFILE;
      });

    setAccessToken.mockImplementation(() => { callOrder.push('setToken'); });

    await identityService.login('user@test.com', 'Secret123!');

    // Token must be set BEFORE the profile fetch so api-client injects it
    expect(callOrder).toEqual(['login', 'setToken', 'profile']);
  });

  it('3. fetches GET /api/profile/me as the second call', async () => {
    apiFetch
      .mockResolvedValueOnce({ accessToken: FAKE_TOKEN })
      .mockResolvedValueOnce(FAKE_PROFILE);

    await identityService.login('user@test.com', 'Secret123!');

    expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/profile/me');
  });

  it('4. dispatches AUTH_LOGIN with merged JWT claims AND profile fields', async () => {
    apiFetch
      .mockResolvedValueOnce({ accessToken: FAKE_TOKEN })
      .mockResolvedValueOnce(FAKE_PROFILE);

    await identityService.login('user@test.com', 'Secret123!');

    expect(stateManager.dispatch).toHaveBeenCalledWith(
      ACTIONS.AUTH_LOGIN,
      expect.objectContaining({
        id: FAKE_USER_ID,                           // from JWT sub
        role: 'user',                               // from JWT role
        displayName: 'Marcos Calistênico',          // from profile
        avatarUrl: 'https://cdn.example.com/avatar.png', // from profile
        email: 'marcos@test.com',                   // from profile
      }),
    );
  });

  it('5. emits AUTH_LOGIN_SUCCESS after state is fully populated', async () => {
    const callOrder = [];
    stateManager.dispatch.mockImplementation(() => { callOrder.push('dispatch'); });
    eventBus.emit.mockImplementation(() => { callOrder.push('emit'); });

    apiFetch
      .mockResolvedValueOnce({ accessToken: FAKE_TOKEN })
      .mockResolvedValueOnce(FAKE_PROFILE);

    await identityService.login('user@test.com', 'Secret123!');

    // dispatch must happen BEFORE emit so listeners see complete state
    expect(callOrder).toEqual(['dispatch', 'emit']);
    expect(eventBus.emit).toHaveBeenCalledWith(
      EVENTS.AUTH_LOGIN_SUCCESS,
      expect.objectContaining({ id: FAKE_USER_ID }),
    );
  });

  it('6. propagates ApiError on auth failure — no side effects', async () => {
    const { ApiError } = await import('../../platform/api-client.js');
    apiFetch.mockRejectedValueOnce(new ApiError(401, 'invalid_credentials'));

    await expect(identityService.login('x@x.com', 'wrong')).rejects.toMatchObject({
      status: 401,
      error: 'invalid_credentials',
    });

    expect(setAccessToken).not.toHaveBeenCalled();
    expect(stateManager.dispatch).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalledWith(EVENTS.AUTH_LOGIN_SUCCESS, expect.anything());
  });

  it('7. extracts userId (sub) from JWT payload — only one auth network call', async () => {
    const adminToken = makeJwt({ sub: 'admin-99', role: 'admin', status: 'active' });
    apiFetch
      .mockResolvedValueOnce({ accessToken: adminToken })
      .mockResolvedValueOnce({ ...FAKE_PROFILE, displayName: 'Admin User' });

    await identityService.login('admin@test.com', 'AdminPass!');

    expect(stateManager.dispatch).toHaveBeenCalledWith(
      ACTIONS.AUTH_LOGIN,
      expect.objectContaining({ id: 'admin-99', role: 'admin' }),
    );
    // Exactly 2 calls: login + profile (not 3)
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});

// ── register() ────────────────────────────────────────────────────────────────

describe('register()', () => {
  it('8. calls POST /api/auth/register and returns RegisterResponseDTO', async () => {
    const dto = { userId: 'new-id', email: 'new@test.com', status: 'pending_verification' };
    apiFetch.mockResolvedValueOnce(dto);

    const result = await identityService.register('new@test.com', 'Pass123!');

    expect(apiFetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', password: 'Pass123!' }),
    });
    expect(result).toEqual(dto);
  });

  it('9. does NOT call setAccessToken — account starts as pending_verification', async () => {
    apiFetch.mockResolvedValueOnce({
      userId: 'new-id', email: 'new@test.com', status: 'pending_verification',
    });

    await identityService.register('new@test.com', 'Pass123!');

    expect(setAccessToken).not.toHaveBeenCalled();
  });
});

// ── logout() — Zombie Session Guard ──────────────────────────────────────────

describe('logout() — zombie session guard', () => {
  it('10. writes PENDING_LOGOUT_KEY to localStorage BEFORE the network call', async () => {
    const flagTimestamps = [];

    apiFetch.mockImplementationOnce(async () => {
      // At the moment the network call fires, the flag must already be set
      flagTimestamps.push(localStorage.getItem(PENDING_LOGOUT_KEY));
      return { success: true };
    });

    await identityService.logout();

    expect(flagTimestamps[0]).toBe('1');
  });

  it('11. clears the pending flag on successful server logout', async () => {
    apiFetch.mockResolvedValueOnce({ success: true });

    await identityService.logout();

    expect(localStorage.getItem(PENDING_LOGOUT_KEY)).toBeNull();
  });

  it('12. keeps the flag when the server call fails (offline scenario)', async () => {
    apiFetch.mockRejectedValueOnce(new Error('network error'));

    await identityService.logout();

    // Flag must survive — initializeSession() will use it on next boot
    expect(localStorage.getItem(PENDING_LOGOUT_KEY)).toBe('1');
  });

  it('13. calls clearAccessToken regardless of network outcome', async () => {
    apiFetch.mockRejectedValueOnce(new Error('offline'));

    await identityService.logout();

    expect(clearAccessToken).toHaveBeenCalled();
  });

  it('14. dispatches AUTH_LOGOUT regardless of network outcome', async () => {
    apiFetch.mockRejectedValueOnce(new Error('offline'));

    await identityService.logout();

    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.AUTH_LOGOUT, null);
  });

  it('15. emits AUTH_LOGOUT regardless of network outcome', async () => {
    apiFetch.mockRejectedValueOnce(new Error('offline'));

    await identityService.logout();

    expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.AUTH_LOGOUT, null);
  });
});

// ── initializeSession() ────────────────────────────────────────────────────────

describe('initializeSession()', () => {
  it('16. skips session restore when PENDING_LOGOUT_KEY is present', async () => {
    localStorage.setItem(PENDING_LOGOUT_KEY, '1');

    const result = await identityService.initializeSession();

    expect(result).toEqual({ isAuthenticated: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('17. clears the pending flag after detecting it', async () => {
    localStorage.setItem(PENDING_LOGOUT_KEY, '1');

    await identityService.initializeSession();

    expect(localStorage.getItem(PENDING_LOGOUT_KEY)).toBeNull();
  });

  it('18. restores session when refresh + profile fetch succeed', async () => {
    apiFetch
      .mockResolvedValueOnce({ accessToken: FAKE_TOKEN }) // /api/auth/refresh
      .mockResolvedValueOnce(FAKE_PROFILE);               // /api/profile/me

    const result = await identityService.initializeSession();

    expect(result).toEqual({ isAuthenticated: true });
    expect(setAccessToken).toHaveBeenCalledWith(FAKE_TOKEN);
    expect(stateManager.dispatch).toHaveBeenCalledWith(
      ACTIONS.AUTH_LOGIN,
      expect.objectContaining({ id: FAKE_USER_ID, displayName: 'Marcos Calistênico' }),
    );
  });

  it('19. returns { isAuthenticated: false } when no valid session cookie exists', async () => {
    apiFetch.mockRejectedValueOnce(new Error('no valid session'));

    const result = await identityService.initializeSession();

    expect(result).toEqual({ isAuthenticated: false });
    expect(stateManager.dispatch).not.toHaveBeenCalled();
  });
});

// ── AUTH_EXPIRED listener ──────────────────────────────────────────────────────

describe('AUTH_EXPIRED automatic logout', () => {
  it('20. listener is registered for AUTH_EXPIRED at construction', () => {
    expect(eventBus._listeners[EVENTS.AUTH_EXPIRED]).toBeDefined();
    expect(typeof eventBus._listeners[EVENTS.AUTH_EXPIRED]).toBe('function');
  });

  it('21. triggers full logout (token cleared, state updated) when AUTH_EXPIRED fires', async () => {
    apiFetch.mockResolvedValueOnce({ success: true });

    const expiredHandler = eventBus._listeners[EVENTS.AUTH_EXPIRED];
    await expiredHandler({ reason: 'session_revoked' });

    expect(clearAccessToken).toHaveBeenCalled();
    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.AUTH_LOGOUT, null);
  });
});
