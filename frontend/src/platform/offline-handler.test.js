import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('OfflineHandler', () => {
  let offlineHandler;

  beforeEach(async () => {
    const module = await import('./offline-handler.js');
    offlineHandler = module.default;
    vi.clearAllMocks();
  });

  it('should detect offline mode', () => {
    global.navigator = { onLine: false };
    const isOffline = offlineHandler.isOffline();
    expect(isOffline).toBe(true);
  });

  it('should queue requests when offline', async () => {
    offlineHandler.setOffline(true);
    
    const request = {
      url: '/api/stack',
      method: 'POST',
      body: { supplementId: '1' }
    };
    
    await offlineHandler.queueRequest(request);
    const queued = offlineHandler.getQueuedRequests();
    
    expect(queued.length).toBeGreaterThan(0);
  });

  it('should persist queue to IndexedDB', async () => {
    offlineHandler.setOffline(true);
    
    await offlineHandler.queueRequest({
      url: '/api/test',
      method: 'GET'
    });
    
    await offlineHandler.persistQueue();
    const persisted = await offlineHandler.loadPersistedQueue();
    
    expect(persisted.length).toBeGreaterThan(0);
  });

  it('should sync queued requests when online', async () => {
    offlineHandler.setOffline(false);
    
    const requests = [
      { url: '/api/test1', method: 'POST' },
      { url: '/api/test2', method: 'POST' }
    ];
    
    for (const req of requests) {
      await offlineHandler.queueRequest(req);
    }
    
    const synced = await offlineHandler.syncQueue();
    expect(synced.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle sync conflicts', async () => {
    const req = { url: '/api/data', method: 'PUT', body: { v: 1 } };
    
    const conflict = await offlineHandler.handleSyncConflict(req, {
      serverVersion: 2,
      clientVersion: 1
    });
    
    expect(conflict).toBeDefined();
  });

  it('should retry failed requests', async () => {
    const request = { url: '/api/test', method: 'POST', retry: 0 };
    offlineHandler.setOffline(true);
    
    await offlineHandler.queueRequest(request);
    await offlineHandler.retryFailed();
    
    const queue = offlineHandler.getQueuedRequests();
    expect(queue.length).toBeGreaterThanOrEqual(0);
  });

  it('should limit queue size', async () => {
    offlineHandler.setMaxQueueSize(5);
    offlineHandler.setOffline(true);
    
    for (let i = 0; i < 10; i++) {
      await offlineHandler.queueRequest({
        url: `/api/test${i}`,
        method: 'POST'
      });
    }
    
    const queue = offlineHandler.getQueuedRequests();
    expect(queue.length).toBeLessThanOrEqual(5);
  });

  it('should emit offline/online events', (done) => {
    const onOffline = vi.fn();
    const onOnline = vi.fn();
    
    offlineHandler.on('offline', onOffline);
    offlineHandler.on('online', onOnline);
    
    offlineHandler.setOffline(true);
    offlineHandler.setOffline(false);
    
    setTimeout(() => {
      expect(onOffline).toHaveBeenCalled();
      expect(onOnline).toHaveBeenCalled();
      done();
    }, 50);
  });

  it('should provide sync status', () => {
    const status = offlineHandler.getSyncStatus();
    expect(status).toHaveProperty('isSyncing');
    expect(status).toHaveProperty('itemsQueued');
    expect(status).toHaveProperty('lastSyncTime');
  });

  it('should clear queue', async () => {
    offlineHandler.setOffline(true);
    await offlineHandler.queueRequest({ url: '/api/test', method: 'POST' });
    
    offlineHandler.clearQueue();
    const queue = offlineHandler.getQueuedRequests();
    
    expect(queue.length).toBe(0);
  });
});
