import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

global.fetch = vi.fn();

describe('ApiClient', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should make GET requests', async () => {
    const ApiClient = (await import('./api-client.js')).default;
    fetch.mockResolvedValue(new Response(JSON.stringify({ id: 1 })));
    const result = await ApiClient.get('/api/test');
    expect(fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
  });

  it('should make POST requests', async () => {
    const ApiClient = (await import('./api-client.js')).default;
    fetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    await ApiClient.post('/api/test', { data: 'value' });
    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST'
    }));
  });

  it('should include auth headers', async () => {
    const ApiClient = (await import('./api-client.js')).default;
    localStorage.setItem('auth:token', 'test-token');
    fetch.mockResolvedValue(new Response(JSON.stringify({})));
    await ApiClient.get('/api/protected');
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': expect.stringContaining('Bearer')
      })
    }));
  });

  it('should handle 401 errors', async () => {
    const ApiClient = (await import('./api-client.js')).default;
    fetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 401 }));
    try {
      await ApiClient.get('/api/protected');
    } catch (e) {
      expect(e.status).toBe(401);
    }
  });

  it('should retry failed requests', async () => {
    const ApiClient = (await import('./api-client.js')).default;
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }));
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true })));
    const result = await ApiClient.get('/api/test');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
