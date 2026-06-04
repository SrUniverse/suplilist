/**
 * api-client.test.js — Unit tests for the canonical HTTP client.
 *
 * Tests verify:
 *  1. CSRF header (X-SupliList-Client: 1) is injected on every request.
 *  2. credentials: 'include' is always set.
 *  3. Authorization: Bearer is injected when a token is held.
 *  4. ApiResponse<T> envelope is unwrapped — callers receive data, not the envelope.
 *  5. On 401 expired_token: token refresh fires once, original request retried.
 *  6. On 401 after failed refresh: auth:expired emitted, ApiError thrown.
 *  7. Concurrent 401s trigger exactly one refresh call (single-flight).
 *  8. Network failures throw ApiError with status 0 / error 'network_error'.
 *  9. Non-401 errors throw ApiError preserving server error code.
 * 10. Content-Type: application/json is auto-set for requests with a body.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock event-bus before importing api-client so the module receives the mock
vi.mock('../core/event-bus.js', () => ({
  eventBus: { emit: vi.fn() },
  EVENTS: {
    AUTH_EXPIRED: 'auth:expired',
    AUTH_SESSION_REFRESHED: 'auth:sessionRefreshed',
  },
}));

// Import after mocks are in place
import {
  apiFetch,
  setAccessToken,
  clearAccessToken,
  ApiError,
} from './api-client.js';
import { eventBus, EVENTS } from '../core/event-bus.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Build a mock Response with JSON body. */
function mockResponse(status, body, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

/** Envelope wrapper matching ApiResponse<T> from shared. */
const wrap = (data) => ({ success: true, data });
const wrapError = (status, error) => ({ success: false, error });

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  clearAccessToken();
  vi.stubGlobal('fetch', vi.fn());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── 1. CSRF header ─────────────────────────────────────────────────────────────

describe('CSRF guard header', () => {
  it('injects X-SupliList-Client: 1 on every request', async () => {
    fetch.mockResolvedValueOnce(mockResponse(200, wrap({ ok: true })));

    await apiFetch('/api/test');

    const [, options] = fetch.mock.calls[0];
    expect(options.headers.get('X-SupliList-Client')).toBe('1');
  });
});

// ── 2. credentials: 'include' ──────────────────────────────────────────────────

describe('cookie forwarding', () => {
  it('always sets credentials: include so HttpOnly refresh cookie is sent', async () => {
    fetch.mockResolvedValueOnce(mockResponse(200, wrap({ ok: true })));

    await apiFetch('/api/test');

    const [, options] = fetch.mock.calls[0];
    expect(options.credentials).toBe('include');
  });
});

// ── 3. Authorization header ────────────────────────────────────────────────────

describe('Authorization header', () => {
  it('omits Authorization when no token is held', async () => {
    fetch.mockResolvedValueOnce(mockResponse(200, wrap({ ok: true })));

    await apiFetch('/api/test');

    const [, options] = fetch.mock.calls[0];
    expect(options.headers.has('Authorization')).toBe(false);
  });

  it('injects Bearer token when setAccessToken was called', async () => {
    setAccessToken('test-jwt-token');
    fetch.mockResolvedValueOnce(mockResponse(200, wrap({ ok: true })));

    await apiFetch('/api/test');

    const [, options] = fetch.mock.calls[0];
    expect(options.headers.get('Authorization')).toBe('Bearer test-jwt-token');
  });
});

// ── 4. Envelope unwrapping ─────────────────────────────────────────────────────

describe('ApiResponse envelope unwrapping', () => {
  it('returns data field from successful envelope', async () => {
    const payload = { userId: 'abc123', email: 'a@b.com' };
    fetch.mockResolvedValueOnce(mockResponse(200, wrap(payload)));

    const result = await apiFetch('/api/identity/me');

    expect(result).toEqual(payload);
  });

  it('returns envelope directly when data field is absent', async () => {
    const raw = { success: true, accessToken: 'jwt' };
    fetch.mockResolvedValueOnce(mockResponse(200, raw));

    const result = await apiFetch('/api/auth/login', { method: 'POST' });

    // Falls back to full envelope when data is absent
    expect(result).toEqual(raw);
  });
});

// ── 5. Transparent token refresh ──────────────────────────────────────────────

describe('transparent token refresh on 401 expired_token', () => {
  it('retries original request after successful refresh', async () => {
    setAccessToken('expired-token');

    // 1st call: original request → 401 expired
    // 2nd call: POST /api/auth/refresh → 200 new token
    // 3rd call: original request retry → 200 success
    fetch
      .mockResolvedValueOnce(mockResponse(401, wrapError(401, 'expired_token'), false))
      .mockResolvedValueOnce(mockResponse(200, wrap({ accessToken: 'fresh-token' })))
      .mockResolvedValueOnce(mockResponse(200, wrap({ userId: 'u1' })));

    const result = await apiFetch('/api/identity/me');

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ userId: 'u1' });
  });

  it('uses the new access token on the retry request', async () => {
    setAccessToken('expired-token');

    fetch
      .mockResolvedValueOnce(mockResponse(401, wrapError(401, 'expired_token'), false))
      .mockResolvedValueOnce(mockResponse(200, wrap({ accessToken: 'fresh-token' })))
      .mockResolvedValueOnce(mockResponse(200, wrap({ ok: true })));

    await apiFetch('/api/identity/me');

    const [, retryOptions] = fetch.mock.calls[2];
    expect(retryOptions.headers.get('Authorization')).toBe('Bearer fresh-token');
  });

  it('does NOT retry for missing_token 401 — still triggers refresh', async () => {
    setAccessToken(null);
    clearAccessToken();

    fetch
      .mockResolvedValueOnce(mockResponse(401, wrapError(401, 'missing_token'), false))
      .mockResolvedValueOnce(mockResponse(200, wrap({ accessToken: 'fresh-token' })))
      .mockResolvedValueOnce(mockResponse(200, wrap({ ok: true })));

    await apiFetch('/api/identity/me');

    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

// ── 6. Refresh failure → auth:expired ─────────────────────────────────────────

describe('auth:expired event when refresh fails', () => {
  it('emits auth:expired and throws ApiError when refresh returns 401', async () => {
    setAccessToken('expired-token');

    fetch
      .mockResolvedValueOnce(mockResponse(401, wrapError(401, 'expired_token'), false))
      .mockResolvedValueOnce(mockResponse(401, wrapError(401, 'session_revoked'), false));

    await expect(apiFetch('/api/identity/me')).rejects.toThrow(ApiError);

    expect(eventBus.emit).toHaveBeenCalledWith(
      EVENTS.AUTH_EXPIRED,
      expect.objectContaining({ reason: expect.any(String) }),
    );
  });

  it('does not retry infinitely — _isRetry flag prevents recursion', async () => {
    setAccessToken('expired-token');

    fetch
      .mockResolvedValueOnce(mockResponse(401, wrapError(401, 'expired_token'), false))
      .mockResolvedValueOnce(mockResponse(401, wrapError(401, 'session_revoked'), false));

    await expect(apiFetch('/api/identity/me')).rejects.toThrow();

    // Original + one refresh attempt = exactly 2 fetch calls
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

// ── 7. Single-flight refresh ──────────────────────────────────────────────────

describe('single-flight: concurrent 401s trigger exactly one refresh', () => {
  it('fires refresh once when two requests expire simultaneously', async () => {
    setAccessToken('expired-token');

    // Both requests get 401 expired first
    // Then one refresh call
    // Then both retries succeed
    fetch
      .mockResolvedValueOnce(mockResponse(401, wrapError(401, 'expired_token'), false)) // req A original
      .mockResolvedValueOnce(mockResponse(401, wrapError(401, 'expired_token'), false)) // req B original
      .mockResolvedValueOnce(mockResponse(200, wrap({ accessToken: 'fresh-token' })))  // refresh
      .mockResolvedValueOnce(mockResponse(200, wrap({ a: 1 })))                         // req A retry
      .mockResolvedValueOnce(mockResponse(200, wrap({ b: 2 })));                        // req B retry

    const [resultA, resultB] = await Promise.all([
      apiFetch('/api/a'),
      apiFetch('/api/b'),
    ]);

    // Exactly one refresh call among all 5 fetch calls
    const refreshCalls = fetch.mock.calls.filter(([url]) => url.includes('/api/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);

    expect(resultA).toEqual({ a: 1 });
    expect(resultB).toEqual({ b: 2 });
  });
});

// ── 8. Network errors ─────────────────────────────────────────────────────────

describe('network failure', () => {
  it('throws ApiError with status 0 and error network_error', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiFetch('/api/test')).rejects.toMatchObject({
      status: 0,
      error: 'network_error',
    });
  });
});

// ── 9. Non-401 HTTP errors ────────────────────────────────────────────────────

describe('non-401 error responses', () => {
  it('throws ApiError preserving server error code on 400', async () => {
    fetch.mockResolvedValueOnce(
      mockResponse(400, { success: false, error: 'invalid_credentials' }, false),
    );

    await expect(apiFetch('/api/auth/login', { method: 'POST' })).rejects.toMatchObject({
      status: 400,
      error: 'invalid_credentials',
    });
  });

  it('throws ApiError on 500 without emitting auth:expired', async () => {
    fetch.mockResolvedValueOnce(
      mockResponse(500, { success: false, error: 'internal_error' }, false),
    );

    await expect(apiFetch('/api/test')).rejects.toMatchObject({ status: 500 });
    expect(eventBus.emit).not.toHaveBeenCalledWith(EVENTS.AUTH_EXPIRED, expect.anything());
  });
});

// ── 10. Content-Type auto-injection ───────────────────────────────────────────

describe('Content-Type header', () => {
  it('sets application/json when body is present', async () => {
    fetch.mockResolvedValueOnce(mockResponse(200, wrap({ ok: true })));

    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com', password: 'pw' }),
    });

    const [, options] = fetch.mock.calls[0];
    expect(options.headers.get('Content-Type')).toBe('application/json');
  });

  it('does NOT set Content-Type for requests without a body', async () => {
    fetch.mockResolvedValueOnce(mockResponse(200, wrap({ ok: true })));

    await apiFetch('/api/identity/me');

    const [, options] = fetch.mock.calls[0];
    expect(options.headers.has('Content-Type')).toBe(false);
  });
});
