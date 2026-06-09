/**
 * SupplementController Tests — Authorization Fixes
 * Tests: User ownership validation, 403 Forbidden responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { SupplementController } from './supplement.controller.js';
import SupplementService from '../../application/supplement.service.js';

// Mock SupplementService
vi.mock('../../application/supplement.service.js');

describe('SupplementController', () => {
  let controller: SupplementController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new SupplementController();

    // Setup mock response
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('getSupplement - Authorization', () => {
    it('should return supplement with prices when found', async () => {
      const mockSupplement = {
        supplementId: 'vitamin-d',
        name: 'Vitamin D3 1000IU',
        prices: { amazon: { price: 29.9, url: 'https://...' } },
        bestPrice: { source: 'amazon', price: 29.9 },
        priceHistory: [],
      };

      mockReq = { params: { id: 'vitamin-d' } };

      (SupplementService.getSupplementWithPrices as any).mockResolvedValue(mockSupplement);

      await controller.getSupplement(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockSupplement });
    });

    it('should return 404 when supplement does not exist', async () => {
      mockReq = { params: { id: 'nonexistent' } };

      (SupplementService.getSupplementWithPrices as any).mockResolvedValue(null);

      await controller.getSupplement(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'not_found' });
    });

    it('should handle service errors gracefully', async () => {
      mockReq = { params: { id: 'vitamin-d' } };

      const serviceError = new Error('Database connection failed');
      (SupplementService.getSupplementWithPrices as any).mockRejectedValue(serviceError);

      await controller.getSupplement(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('getPricesForMultiple - Authorization', () => {
    it('should return prices for multiple supplements', async () => {
      const mockPrices = {
        'vitamin-d': {
          supplementId: 'vitamin-d',
          name: 'Vitamin D3',
          prices: { amazon: { price: 29.9 } },
          bestPrice: { source: 'amazon', value: 29.9 },
        },
        'whey-protein': {
          supplementId: 'whey-protein',
          name: 'Whey Protein 1kg',
          prices: { amazon: { price: 79.9 } },
          bestPrice: { source: 'amazon', value: 79.9 },
        },
      };

      mockReq = {
        query: { ids: 'vitamin-d,whey-protein' },
        user: { id: 'user-123' },
      };

      (SupplementService.getPricesForMultiple as any).mockResolvedValue(mockPrices);

      await controller.getPricesForMultiple(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockPrices });
    });

    it('should validate input - reject invalid IDs parameter', async () => {
      mockReq = {
        query: { ids: '' }, // Empty IDs
        user: { id: 'user-123' },
      };

      await controller.getPricesForMultiple(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'invalid_ids' })
      );
    });

    it('should return empty object when no supplements found', async () => {
      mockReq = {
        query: { ids: 'nonexistent-1,nonexistent-2' },
        user: { id: 'user-123' },
      };

      (SupplementService.getPricesForMultiple as any).mockResolvedValue({});

      await controller.getPricesForMultiple(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: {} });
    });

    it('should validate IDs parameter - reject > 100 items', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `id-${i}`).join(',');

      mockReq = {
        query: { ids: tooManyIds },
        user: { id: 'user-123' },
      };

      await controller.getPricesForMultiple(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle empty IDs list gracefully', async () => {
      mockReq = {
        query: { ids: 'vitamin-d' },
        user: { id: 'user-123' },
      };

      (SupplementService.getPricesForMultiple as any).mockResolvedValue({});

      await controller.getPricesForMultiple(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: {} });
    });
  });

  describe('checkPriceAlerts - Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockReq = {
        query: { supplementIds: 'vitamin-d' },
        user: undefined, // No user
      };

      await controller.checkPriceAlerts(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'unauthorized' });
    });

    it('should return alerts for price drops in user stack', async () => {
      const mockAlerts = [
        { supplementId: 'whey-protein', priceDropPercent: 25 },
        { supplementId: 'zinc', priceDropPercent: 30 },
      ];

      mockReq = {
        query: { supplementIds: 'whey-protein,zinc' },
        user: { id: 'user-123' },
      };

      (SupplementService.checkPriceAlerts as any).mockResolvedValue(mockAlerts);

      await controller.checkPriceAlerts(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockAlerts });
    });

    it('should validate supplementIds parameter', async () => {
      mockReq = {
        query: { supplementIds: '' }, // Empty
        user: { id: 'user-123' },
      };

      await controller.checkPriceAlerts(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'invalid_supplement_ids' })
      );
    });

    it('should pass userId to service for authorization', async () => {
      mockReq = {
        query: { supplementIds: 'vitamin-d,whey' },
        user: { id: 'user-456' },
      };

      (SupplementService.checkPriceAlerts as any).mockResolvedValue([]);

      await controller.checkPriceAlerts(mockReq as any, mockRes as any, mockNext);

      expect(SupplementService.checkPriceAlerts).toHaveBeenCalledWith('user-456', ['vitamin-d', 'whey']);
    });
  });

  describe('searchSupplements - Input Validation', () => {
    it('should reject empty search query', async () => {
      mockReq = { query: { q: '' } };

      await controller.searchSupplements(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'invalid_query' })
      );
    });

    it('should reject query longer than 100 characters', async () => {
      const longQuery = 'a'.repeat(101);
      mockReq = { query: { q: longQuery } };

      await controller.searchSupplements(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should accept valid search query', async () => {
      const mockResults = [
        { supplementId: 'whey-1kg', name: 'Whey Protein 1kg', prices: {}, bestPrice: { source: 'amazon', price: 79.9 }, priceHistory: [] },
      ];

      mockReq = { query: { q: 'whey protein' } };

      (SupplementService.searchSupplements as any).mockResolvedValue(mockResults);

      await controller.searchSupplements(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockResults });
    });

    it('should reject query with invalid characters', async () => {
      mockReq = { query: { q: 'whey<script>' } };

      await controller.searchSupplements(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getPriceHistory - Input Validation', () => {
    it('should return price history for supplement', async () => {
      const mockHistory = [
        { date: new Date(), prices: { amazon: 79.9, mercadolivre: 74.9 } },
      ];

      mockReq = { params: { id: 'whey-1kg' }, query: { days: '30' } };

      (SupplementService.getPriceHistory as any).mockResolvedValue(mockHistory);

      await controller.getPriceHistory(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockHistory });
    });

    it('should reject invalid days parameter', async () => {
      mockReq = { params: { id: 'whey-1kg' }, query: { days: 'invalid' } };

      await controller.getPriceHistory(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject days > 90', async () => {
      mockReq = { params: { id: 'whey-1kg' }, query: { days: '100' } };

      await controller.getPriceHistory(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should use default days=30 when not specified', async () => {
      const mockHistory = Array(30).fill(null).map((_, i) => ({
        date: new Date(),
        prices: { amazon: 79.9 },
      }));

      mockReq = { params: { id: 'whey-1kg' }, query: {} };

      (SupplementService.getPriceHistory as any).mockResolvedValue(mockHistory);

      await controller.getPriceHistory(mockReq as any, mockRes as any, mockNext);

      expect(SupplementService.getPriceHistory).toHaveBeenCalledWith('whey-1kg', 30);
    });
  });
});
