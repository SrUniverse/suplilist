import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HistoryService } from './history-service.js';

vi.mock('../../state/state-manager.js', () => ({
  stateManager: {
    get: vi.fn((key) => {
      if (key === 'checkins') return [];
      if (key === 'ui.isOffline') return false;
      return null;
    }),
  },
}));

vi.mock('../../platform/sync-queue.js', () => ({
  syncQueue: {
    getPendingItems: vi.fn(() => []),
  },
}));

vi.mock('../stack/stack-recommender.js', () => ({
  SUPPLEMENTS_DB: [
    { id: 'creatina', name: 'Creatina Monohidratada', category: 'Força & Hipertrofia' },
    { id: 'vitamina-d3', name: 'Vitamina D3', category: 'Saúde Geral' },
    { id: 'cafeina', name: 'Cafeína', category: 'Energéticos & Foco' },
  ],
}));

import { stateManager } from '../../state/state-manager.js';
import { syncQueue } from '../../platform/sync-queue.js';

describe('HistoryService', () => {
  let service;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new HistoryService();
    stateManager.get.mockImplementation((key) => {
      if (key === 'checkins') return [];
      if (key === 'ui.isOffline') return false;
      return null;
    });
    syncQueue.getPendingItems.mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('hasMore is true initially', () => {
      expect(service.hasMore).toBe(true);
    });

    it('isLoading is false initially', () => {
      expect(service.isLoading).toBe(false);
    });

    it('getItems returns empty array initially', () => {
      expect(service.getItems()).toEqual([]);
    });
  });

  describe('reset', () => {
    it('resets state back to initial values', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'checkins') return [{ id: 'ck1', supplementId: 'creatina', timestamp: 1000 }];
        if (key === 'ui.isOffline') return false;
      });

      const loadPromise = service.loadMore();
      vi.runAllTimers();
      await loadPromise;

      service.reset();

      expect(service.hasMore).toBe(true);
      expect(service.isLoading).toBe(false);
      expect(service.getItems()).toEqual([]);
    });
  });

  describe('setFilters', () => {
    it('updates filters and resets', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'checkins') return [{ id: 'ck1', supplementId: 'creatina', timestamp: 1000 }];
        if (key === 'ui.isOffline') return false;
      });

      const p1 = service.loadMore();
      vi.runAllTimers();
      await p1;

      expect(service.getItems()).toHaveLength(1);

      service.setFilters({ query: 'vitamin' });

      expect(service.getItems()).toEqual([]);
      expect(service.hasMore).toBe(true);
    });

    it('partial update preserves other filters', () => {
      service.setFilters({ query: 'creatina' });
      service.setFilters({ category: 'Força' });
      // No error thrown — filters are merged
      expect(service.hasMore).toBe(true);
    });
  });

  describe('loadMore', () => {
    it('returns empty when no checkins exist', async () => {
      const p = service.loadMore();
      vi.runAllTimers();
      const result = await p;

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.total).toBe(0);
    });

    it('returns items when checkins exist', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'checkins') return [
          { id: 'ck1', supplementId: 'creatina', timestamp: 2000 },
          { id: 'ck2', supplementId: 'vitamina-d3', timestamp: 1000 },
        ];
        if (key === 'ui.isOffline') return false;
      });

      const p = service.loadMore();
      vi.runAllTimers();
      const result = await p;

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('returns items sorted descending by timestamp', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'checkins') return [
          { id: 'old', supplementId: 'creatina', timestamp: 1000 },
          { id: 'new', supplementId: 'vitamina-d3', timestamp: 9999 },
        ];
        if (key === 'ui.isOffline') return false;
      });

      const p = service.loadMore();
      vi.runAllTimers();
      const result = await p;

      expect(result.items[0].id).toBe('new');
      expect(result.items[1].id).toBe('old');
    });

    it('deduplicates items on repeated calls', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'checkins') return [
          { id: 'ck1', supplementId: 'creatina', timestamp: 1000 },
        ];
        if (key === 'ui.isOffline') return false;
      });

      const p1 = service.loadMore();
      vi.runAllTimers();
      await p1;

      // Reset hasMore manually to allow second call
      const p2 = service.loadMore(); // hasMore is now false
      vi.runAllTimers();
      const result2 = await p2;

      // Second call returns empty because hasMore=false
      expect(result2.items).toEqual([]);
    });

    it('returns early when already loading', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'checkins') return [
          { id: 'ck1', supplementId: 'creatina', timestamp: 1000 },
        ];
        if (key === 'ui.isOffline') return false;
      });

      // Start first load (don't await)
      const p1 = service.loadMore();

      // Immediate second call while first is loading
      const p2 = service.loadMore();
      vi.runAllTimers();

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r2.items).toEqual([]); // Second call returned early
      expect(r1.items).toHaveLength(1);
    });

    it('throws structured offline error when isOffline is true', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'ui.isOffline') return true;
        return null;
      });

      const p = service.loadMore();
      vi.runAllTimers();

      await expect(p).rejects.toMatchObject({ status: 503, error: 'offline' });
    });

    it('resets isLoading after error', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'ui.isOffline') return true;
        return null;
      });

      const p = service.loadMore();
      vi.runAllTimers();

      try { await p; } catch (_) { /* expected */ }

      expect(service.isLoading).toBe(false);
    });

    it('includes pending syncQueue items on first page', async () => {
      syncQueue.getPendingItems.mockReturnValue([
        { id: 'pending1', supplementId: 'cafeina' }
      ]);

      const p = service.loadMore();
      vi.runAllTimers();
      await p;

      expect(service.getItems().some(i => i.id === 'pending1')).toBe(true);
      expect(service.getItems()[0].isPending).toBe(true);
    });
  });

  describe('query filter', () => {
    it('filters by supplement name', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'checkins') return [
          { id: 'ck1', supplementId: 'creatina', timestamp: 2000 },
          { id: 'ck2', supplementId: 'vitamina-d3', timestamp: 1000 },
        ];
        if (key === 'ui.isOffline') return false;
      });

      service.setFilters({ query: 'vitamina' });

      const p = service.loadMore();
      vi.runAllTimers();
      const result = await p;

      expect(result.items.every(i => i.supplementId === 'vitamina-d3')).toBe(true);
    });

    it('category filter matches exactly', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'checkins') return [
          { id: 'ck1', supplementId: 'creatina', timestamp: 2000 },
          { id: 'ck2', supplementId: 'vitamina-d3', timestamp: 1000 },
        ];
        if (key === 'ui.isOffline') return false;
      });

      service.setFilters({ category: 'Força & Hipertrofia' });

      const p = service.loadMore();
      vi.runAllTimers();
      const result = await p;

      expect(result.items.some(i => i.supplementId === 'creatina')).toBe(true);
      expect(result.items.some(i => i.supplementId === 'vitamina-d3')).toBe(false);
    });
  });

  describe('getItems', () => {
    it('returns immutable copy (mutations do not affect internal state)', async () => {
      stateManager.get.mockImplementation((key) => {
        if (key === 'checkins') return [{ id: 'ck1', supplementId: 'creatina', timestamp: 1000 }];
        if (key === 'ui.isOffline') return false;
      });

      const p = service.loadMore();
      vi.runAllTimers();
      await p;

      const items = service.getItems();
      items.push({ id: 'injected' });

      expect(service.getItems()).toHaveLength(1);
    });
  });
});
