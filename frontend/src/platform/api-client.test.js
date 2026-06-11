import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auth } from './../features/auth/firebase-client.js';

vi.mock('./../features/auth/firebase-client.js', () => ({
  auth: {
    authStateReady: vi.fn().mockResolvedValue(),
    currentUser: null
  }
}));

global.fetch = vi.fn();

describe('ApiClient', () => {
  let apiFetch, ApiError;

  beforeEach(async () => {
    // Reset modules to clear singleton states
    vi.resetModules();
    const module = await import('./api-client.js');
    apiFetch = module.apiFetch;
    ApiError = module.ApiError;

    fetch.mockClear();
    auth.currentUser = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should make GET requests', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: 1 } })
    });

    const result = await apiFetch('/api/test');

    expect(fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
    const [, options] = fetch.mock.calls[0];
    expect(options.credentials).toBe('omit');
    expect(result).toEqual({ id: 1 });
  });

  it('should make POST requests', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { created: true } })
    });

    await apiFetch('/api/test', {
      method: 'POST',
      body: JSON.stringify({ data: 'value' })
    });

    expect(fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toContain('value');
  });

  it('should include auth headers when token is set', async () => {
    auth.currentUser = {
      getIdToken: vi.fn().mockResolvedValue('test-token-123')
    };

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} })
    });

    await apiFetch('/api/protected');

    expect(fetch).toHaveBeenCalled();
    const [, options] = fetch.mock.calls[0];
    const headers = options.headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token-123');
  });

  it('should handle 401 errors', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: 'unauthorized' })
    });

    await expect(apiFetch('/api/protected')).rejects.toThrow();
  });

  it('should throw ApiError on failure', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'not_found', message: 'Resource not found' })
    });

    try {
      await apiFetch('/api/missing');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.status).toBe(404);
      expect(e.error).toBe('not_found');
    }
  });
});
