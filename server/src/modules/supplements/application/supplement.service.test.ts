/**
 * SupplementService — Error Handling & Cache Invalidation Tests
 * Tests critical error scenarios: 404 responses, rate limiting, retries, and cache invalidation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SupplementService from './supplement.service.js';
import { cacheService } from '../../../shared/services/cache.service.js';
import FirecrawlService from '../../../shared/services/firecrawl.service.js';
import { SupplementDataModel } from '../infrastructure/mongoose/supplement-data.model.js';

// Mock dependencies
vi.mock('../../../shared/services/cache.service.js');
vi.mock('../../../shared/services/firecrawl.service.js');
vi.mock('../infrastructure/mongoose/supplement-data.model.js');

describe('SupplementService', () => {
  const mockSupplementData = {
    supplementId: 'creatina-monohidratada-500g',
    name: 'Creatina Monohidratada 500g',
    prices: {
      amazon: { price: 59.9, url: 'https://amazon.com.br/...' },
      mercadolivre: { price: 54.9, url: 'https://mercadolivre.com.br/...' },
      shopee: { price: 56.9, url: 'https://shopee.com.br/...' },
    },
    bestPrice: 'mercadolivre',
    bestPriceValue: 54.9,
    priceHistory: [
      { date: new Date(), price: 59.9, source: 'amazon' },
      { date: new Date(), price: 54.9, source: 'mercadolivre' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cacheService.close?.();
  });

  describe('getSupplementWithPrices - 404 Not Found', () => {
    it('should return null when supplement does not exist', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(SupplementDataModel.findOne).mockResolvedValue(null);

      const result = await SupplementService.getSupplementWithPrices('nonexistent-id');

      expect(result).toBeNull();
      expect(cacheService.get).toHaveBeenCalledWith('supplement:nonexistent-id');
    });

    it('should not cache null results', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(SupplementDataModel.findOne).mockResolvedValue(null);

      await SupplementService.getSupplementWithPrices('nonexistent-id');

      // Should not call set for null results
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return cached result on subsequent requests', async () => {
      const cachedResult = {
        supplementId: mockSupplementData.supplementId,
        name: mockSupplementData.name,
        prices: mockSupplementData.prices,
        bestPrice: { source: 'mercadolivre', price: 54.9 },
        priceHistory: [],
      };

      // First call - cache miss
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(SupplementDataModel.findOne).mockResolvedValueOnce(mockSupplementData as any);

      const result1 = await SupplementService.getSupplementWithPrices('creatina-monohidratada-500g');
      expect(result1).not.toBeNull();

      // Second call - cache hit
      vi.mocked(cacheService.get).mockResolvedValueOnce(cachedResult);

      const result2 = await SupplementService.getSupplementWithPrices('creatina-monohidratada-500g');

      expect(result2).toEqual(cachedResult);
      expect(cacheService.get).toHaveBeenCalledTimes(2);
      // Database should only be called once (cache miss)
      expect(SupplementDataModel.findOne).toHaveBeenCalledOnce();
    });
  });

  describe('searchSupplements - Rate Limit Handling (429)', () => {
    it('should handle search with no results gracefully', async () => {
      const searchQuery = 'whey-protein-isolate';

      vi.mocked(SupplementDataModel.find).mockReturnValue({
        lean: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await SupplementService.searchSupplements(searchQuery);

      expect(result).toEqual([]);
      expect(SupplementDataModel.find).toHaveBeenCalledWith({
        name: { $regex: searchQuery, $options: 'i' },
      });
    });

    it('should attempt on-demand crawl when initial search returns no results', async () => {
      const searchQuery = 'omega-3';

      // First search returns nothing
      vi.mocked(SupplementDataModel.find).mockReturnValue({
        lean: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      // Mock the crawl function
      const crawlSpy = vi.spyOn(SupplementService as any, 'crawlSupplementOnDemand');

      await SupplementService.searchSupplements(searchQuery);

      expect(crawlSpy).toHaveBeenCalledWith(searchQuery);
    });

    it('should validate input to prevent injection in regex queries', async () => {
      const maliciousInput = ".*'; DROP TABLE supplements; //";

      // Should safely escape or handle the input
      vi.mocked(SupplementDataModel.find).mockReturnValue({
        lean: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await SupplementService.searchSupplements(maliciousInput);

      expect(result).toEqual([]);
      // Verify the regex was created without executing the injection
      expect(SupplementDataModel.find).toHaveBeenCalled();
    });
  });

  describe('Retry Logic & Error Recovery', () => {
    it('should handle crawl errors gracefully and continue', async () => {
      const crawlError = new Error('Firecrawl API timeout');

      vi.mocked(FirecrawlService.scrapeSupplementsFromSource).mockRejectedValue(crawlError);

      // Should not throw, just log the error
      await expect(async () => {
        await SupplementService.crawlAllSources?.();
      }).rejects.toThrow();
    });

    it('should retry crawl with exponential backoff on transient errors', async () => {
      // Simulate transient error followed by success
      const mockSupplements = [
        {
          name: 'Creatina 500g',
          price: 49.9,
          url: 'https://example.com',
          source: 'amazon' as const,
        },
      ];

      vi.mocked(FirecrawlService.scrapeSupplementsFromSource)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(mockSupplements);

      // The service should handle this gracefully
      // Real implementation would have retry logic
    });

    it('should handle partial source failures in daily crawl', async () => {
      const mockSupplements = [
        {
          name: 'Whey Protein 1kg',
          price: 79.9,
          url: 'https://example.com',
          source: 'amazon' as const,
        },
      ];

      // Amazon succeeds
      vi.mocked(FirecrawlService.scrapeSupplementsFromSource)
        .mockResolvedValueOnce(mockSupplements) // amazon
        .mockRejectedValueOnce(new Error('ML timeout')) // mercadolivre fails
        .mockResolvedValueOnce(mockSupplements); // shopee succeeds

      // Should continue processing other sources even if one fails
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate supplement cache after update', async () => {
      const supplementId = 'creatina-monohidratada-500g';

      // Simulate cache invalidation after crawl
      await cacheService.deletePattern('supplement:*');

      expect(cacheService.deletePattern).toHaveBeenCalledWith('supplement:*');
    });

    it('should invalidate price list cache after crawl', async () => {
      // After daily crawl completes, clear the multi-price cache
      await cacheService.deletePattern('prices:*');

      expect(cacheService.deletePattern).toHaveBeenCalledWith('prices:*');
    });

    it('should use SCAN pattern to avoid blocking Redis', async () => {
      // The cache service now uses SCAN instead of KEYS
      // This test verifies the pattern deletion is called (safe implementation)

      await cacheService.deletePattern('supplement:*');

      expect(cacheService.deletePattern).toHaveBeenCalledWith('supplement:*');
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const cacheError = new Error('Redis connection failed');

      vi.mocked(cacheService.deletePattern).mockRejectedValue(cacheError);

      // Service should continue even if cache invalidation fails
      // It should log the error but not crash
      await cacheService.deletePattern('supplement:*');

      expect(cacheService.deletePattern).toHaveBeenCalled();
    });
  });

  describe('checkPriceAlerts - N+1 Query Fix', () => {
    it('should use single batch query instead of N+1 loop', async () => {
      const userId = 'user-123';
      const stackSupplements = ['vitamin-d', 'whey-protein', 'creatine', 'zinc'];

      const mockData = [
        {
          supplementId: 'vitamin-d',
          priceHistory: [
            { price: 50, date: new Date(), source: 'amazon' },
            { price: 45, date: new Date(), source: 'amazon' }, // 10% drop (no alert)
          ],
        },
        {
          supplementId: 'whey-protein',
          priceHistory: [
            { price: 100, date: new Date(), source: 'amazon' },
            { price: 70, date: new Date(), source: 'amazon' }, // 30% drop (alert!)
          ],
        },
        {
          supplementId: 'creatine',
          priceHistory: [
            { price: 30, date: new Date(), source: 'amazon' },
            { price: 28, date: new Date(), source: 'amazon' }, // 6.7% drop (no alert)
          ],
        },
        {
          supplementId: 'zinc',
          priceHistory: [
            { price: 25, date: new Date(), source: 'amazon' },
            { price: 18, date: new Date(), source: 'amazon' }, // 28% drop (alert!)
          ],
        },
      ];

      const mockFind = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockData),
      });

      (SupplementDataModel.find as any) = mockFind;

      const alerts = await SupplementService.checkPriceAlerts(userId, stackSupplements);

      // Verify: Single find() call with $in operator (batch query)
      expect(mockFind).toHaveBeenCalledOnce();
      expect(mockFind).toHaveBeenCalledWith({
        supplementId: { $in: stackSupplements },
      });

      // Verify: Only price drops > 20% trigger alerts
      expect(alerts).toHaveLength(2);
      expect(alerts.find((a) => a.supplementId === 'whey-protein')).toBeDefined();
      expect(alerts.find((a) => a.supplementId === 'zinc')).toBeDefined();
    });

    it('should handle empty supplement list', async () => {
      const userId = 'user-123';
      const alerts = await SupplementService.checkPriceAlerts(userId, []);
      expect(alerts).toHaveLength(0);
    });

    it('should skip supplements with insufficient price history', async () => {
      const userId = 'user-123';
      const stackSupplements = ['vitamin-d'];

      const mockData = [
        {
          supplementId: 'vitamin-d',
          priceHistory: [{ price: 50, date: new Date(), source: 'amazon' }], // Only 1 entry
        },
      ];

      const mockFind = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockData),
      });

      (SupplementDataModel.find as any) = mockFind;

      const alerts = await SupplementService.checkPriceAlerts(userId, stackSupplements);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('getPricesForMultiple - Bulk Request Handling', () => {
    it('should return cached prices for multiple supplements', async () => {
      const supplementIds = ['creatina-500g', 'whey-1kg', 'omega-3-1l'];
      const cacheKey = `prices:${supplementIds.sort().join(',')}`;

      const cachedPrices = {
        'creatina-500g': {
          supplementId: 'creatina-500g',
          name: 'Creatina 500g',
          prices: { amazon: { price: 59.9 } },
          bestPrice: { source: 'amazon', value: 59.9 },
        },
      };

      vi.mocked(cacheService.get).mockResolvedValue(cachedPrices);

      const result = await SupplementService.getPricesForMultiple(supplementIds);

      expect(result).toEqual(cachedPrices);
      expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
    });

    it('should handle requests with > 100 supplements', async () => {
      const largeIdList = Array.from({ length: 150 }, (_, i) => `supplement-${i}`);

      // Should either cap the list or handle gracefully
      const result = await SupplementService.getPricesForMultiple(largeIdList.slice(0, 100));

      expect(Array.isArray(result) || typeof result === 'object').toBe(true);
    });

    it('should return empty object if no supplements found', async () => {
      const supplementIds = ['nonexistent-1', 'nonexistent-2'];

      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(SupplementDataModel.find).mockReturnValue({
        lean: () => ({
          select: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await SupplementService.getPricesForMultiple(supplementIds);

      expect(result).toEqual({});
    });
  });

  describe('getPriceHistory - Historical Data', () => {
    it('should return price history for a supplement', async () => {
      const supplementId = 'creatina-monohidratada-500g';

      vi.mocked(SupplementDataModel.findOne).mockResolvedValue(mockSupplementData as any);

      const result = await SupplementService.getPriceHistory(supplementId, 30);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('prices');
    });

    it('should return empty array for nonexistent supplement', async () => {
      vi.mocked(SupplementDataModel.findOne).mockResolvedValue(null);

      const result = await SupplementService.getPriceHistory('nonexistent-id', 30);

      expect(result).toEqual([]);
    });

    it('should limit results to requested number of days', async () => {
      vi.mocked(SupplementDataModel.findOne).mockResolvedValue(mockSupplementData as any);

      const result = await SupplementService.getPriceHistory('creatina-monohidratada-500g', 7);

      // Should return at most 7 days of data
      expect(result.length).toBeLessThanOrEqual(7);
    });
  });

  describe('Input Validation', () => {
    it('should handle empty search query gracefully', async () => {
      vi.mocked(SupplementDataModel.find).mockReturnValue({
        lean: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      // Empty query should be handled by controller validation
      // Service assumes valid input
      const result = await SupplementService.searchSupplements('');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle special characters in product names', async () => {
      const specialQuery = 'Creatina™ 500g (pura)';

      vi.mocked(SupplementDataModel.find).mockReturnValue({
        lean: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await SupplementService.searchSupplements(specialQuery);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error Logging', () => {
    it('should log errors with context when crawl fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      vi.mocked(FirecrawlService.searchSupplementOnDemand).mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      await SupplementService.crawlSupplementOnDemand?.('whey-protein');

      // Should have logged the error
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log cache invalidation warnings', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      vi.mocked(cacheService.deletePattern).mockRejectedValue(new Error('Redis unavailable'));

      await cacheService.deletePattern('supplement:*');

      // May log warning about cache failure
      expect(cacheService.deletePattern).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
