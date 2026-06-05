import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

global.fetch = vi.fn();

describe('ApiClient', () => {
  let apiFetch, setAccessToken, clearAccessToken, ApiError;

  beforeEach(async () => {
    const module = await import('./api-client.js');
    apiFetch = module.apiFetch;
    setAccessToken = module.setAccessToken;
    clearAccessToken = module.clearAccessToken;
    ApiError = module.ApiError;

    fetch.mockClear();
    clearAccessToken(); // Clear any previous token
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
    expect(options.credentials).toBe('include');
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
    setAccessToken('test-token-123');

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} })
    });

    await apiFetch('/api/protected');

    expect(fetch).toHaveBeenCalled();
    const [, options] = fetch.mock.calls[0];
    const headers = options.headers;
    // Headers is a Web API Headers object, check via get()
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
