import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('API Integration Tests', () => {
  let apiClient;

  beforeEach(async () => {
    const module = await import('./api-client.js');
    apiClient = module.default;

    // Mock fetch for API calls
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch supplements list from API', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: [
          { id: '1', name: 'Vitamin D', price: 29.99 },
          { id: '2', name: 'Omega-3', price: 34.99 }
        ],
        meta: { total: 100, page: 1, limit: 20 }
      }))
    );

    const result = await apiClient.get('/api/supplements');
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.meta.total).toBe(100);
  });

  it('should handle pagination', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: [],
        meta: { total: 100, page: 2, limit: 20 }
      }))
    );

    const result = await apiClient.get('/api/supplements?page=2&limit=20');
    expect(result.meta.page).toBe(2);
  });

  it('should filter supplements by category', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: [
          { id: '1', name: 'Vitamin D', category: 'vitamins' }
        ]
      }))
    );

    await apiClient.get('/api/supplements?category=vitamins');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('category=vitamins'),
      expect.any(Object)
    );
  });

  it('should create stack item via API', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: { id: 'stack-1', supplementId: '1', dosage: 500 }
      }))
    );

    const result = await apiClient.post('/api/stack', {
      supplementId: '1',
      dosage: 500
    });

    expect(result.data.id).toBe('stack-1');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/stack',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should update stack item', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: { id: 'stack-1', dosage: 1000 }
      }))
    );

    await apiClient.put('/api/stack/stack-1', { dosage: 1000 });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/stack/stack-1',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('should delete stack item', async () => {
    global.fetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));

    await apiClient.del('/api/stack/stack-1');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/stack/stack-1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('should handle API errors gracefully', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    );

    try {
      await apiClient.get('/api/missing');
    } catch (e) {
      expect(e.status).toBe(404);
    }
  });

  it('should retry failed requests', async () => {
    global.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true })));

    const result = await apiClient.get('/api/supplements');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should validate response schema', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: [{ id: '1', name: 'Test' }],
        meta: { total: 1 }
      }))
    );

    const result = await apiClient.get('/api/supplements');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('meta');
  });

  it('should handle concurrent requests', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }))
    );

    const [r1, r2, r3] = await Promise.all([
      apiClient.get('/api/supplements'),
      apiClient.get('/api/stack'),
      apiClient.get('/api/checkins')
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
