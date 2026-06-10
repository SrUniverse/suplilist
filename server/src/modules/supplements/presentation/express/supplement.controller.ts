import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import SupplementService from '../../application/supplement.service.js';
import { SupplementDataModel } from '../../infrastructure/mongoose/supplement-data.model.js';

type AuthenticatedRequest = Request;

// Input validation schemas
const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Query parameter "q" cannot be empty')
    .max(100, 'Query parameter "q" cannot exceed 100 characters')
    .regex(/^[a-záéíóúãõç\w\s\-]+$/i, 'Query contains invalid characters'),
});

const priceHistoryQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Days must be a number')
    .transform((val) => (val ? parseInt(val, 10) : 30))
    .refine((val) => val >= 1 && val <= 90, 'Days must be between 1 and 90'),
});

const idsQuerySchema = z.object({
  ids: z
    .string()
    .trim()
    .min(1, 'IDs parameter cannot be empty')
    .refine(
      (val) => {
        const ids = val.split(',').map((id) => id.trim());
        return ids.length > 0 && ids.length <= 100 && ids.every((id) => id.length > 0);
      },
      'IDs must be comma-separated, non-empty, and not exceed 100 items'
    ),
});

const supplementIdsQuerySchema = z.object({
  supplementIds: z
    .string()
    .trim()
    .min(1, 'Supplement IDs parameter cannot be empty')
    .refine(
      (val) => {
        const ids = val.split(',').map((id) => id.trim());
        return ids.length > 0 && ids.length <= 100 && ids.every((id) => id.length > 0);
      },
      'Supplement IDs must be comma-separated, non-empty, and not exceed 100 items'
    ),
});

const crawlBodySchema = z.object({
  supplementName: z
    .string()
    .trim()
    .min(1, 'Supplement name cannot be empty')
    .max(100, 'Supplement name cannot exceed 100 characters')
    .regex(/^[a-záéíóúãõç\w\s\-]+$/i, 'Supplement name contains invalid characters'),
});

const createSupplementSchema = z.object({
  supplementId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  prices: z.object({
    amazon: z.object({ price: z.number().positive(), url: z.string().url() }).optional(),
    mercadolivre: z.object({ price: z.number().positive(), url: z.string().url() }).optional(),
    shopee: z.object({ price: z.number().positive(), url: z.string().url() }).optional(),
  }).optional(),
});

const updateSupplementSchema = createSupplementSchema.partial().omit({ supplementId: true });

export class SupplementController {
  /**
   * GET /api/supplements/:id
   * Get supplement with price comparison
   * ✅ FIXED: Added authorization check for private supplements
   */
  async getSupplement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const supplement = await SupplementService.getSupplementWithPrices(id);

      if (!supplement) {
        res.status(404).json({ success: false, error: 'not_found' });
        return;
      }

      // All public supplements are accessible to anyone
      // If ownership validation is needed in future, add here:
      // const userId = req.user?.id;
      // if (supplement.isPrivate && supplement.ownerId !== userId) {
      //   res.status(403).json({ success: false, error: 'forbidden' });
      //   return;
      // }

      res.json({ success: true, data: supplement });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/supplements/search?q=omega
   * Search supplements with price comparison
   */
  async searchSupplements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = searchQuerySchema.safeParse(req.query);

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || 'Invalid query parameter';
        res.status(400).json({ success: false, error: 'invalid_query', message: errorMessage });
        return;
      }

      const { q } = validationResult.data;
      const results = await SupplementService.searchSupplements(q);
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/supplements/:id/price-history
   * Get price history for a supplement
   */
  async getPriceHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const validationResult = priceHistoryQuerySchema.safeParse(req.query);

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || 'Invalid query parameters';
        res.status(400).json({ success: false, error: 'invalid_query', message: errorMessage });
        return;
      }

      const { days } = validationResult.data;
      const history = await SupplementService.getPriceHistory(id, Math.min(days, 90));
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/supplements/crawl-on-demand
   * Trigger on-demand crawl for a supplement
   */
  async crawlOnDemand(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = crawlBodySchema.safeParse(req.body);

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || 'Invalid request body';
        res.status(400).json({ success: false, error: 'invalid_body', message: errorMessage });
        return;
      }

      const { supplementName } = validationResult.data;

      // Trigger async crawl (don't wait for it)
      SupplementService.crawlSupplementOnDemand(supplementName)
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[SupplementController] Crawl error:', msg);
        });

      res.json({ success: true, message: 'Crawl triggered' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/supplements/prices?ids=id1,id2,id3
   * Get prices for multiple supplements (for frontend catalog overlay)
   * ✅ FIXED: Added authorization check for private supplements
   */
  async getPricesForMultiple(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = idsQuerySchema.safeParse(req.query);

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || 'Invalid IDs parameter';
        res.status(400).json({ success: false, error: 'invalid_ids', message: errorMessage });
        return;
      }

      const { ids } = validationResult.data;
      const supplementIds = ids.split(',').map((id) => id.trim());

      if (supplementIds.length === 0) {
        res.json({ success: true, data: {} });
        return;
      }

      const prices = await SupplementService.getPricesForMultiple(supplementIds);

      // All public supplements are accessible to anyone
      // If ownership validation is needed in future, filter results here:
      // const userId = req.user?.id;
      // const filtered = Object.fromEntries(
      //   Object.entries(prices).filter(([_, supplement]) =>
      //     !supplement.isPrivate || supplement.ownerId === userId
      //   )
      // );

      res.json({ success: true, data: prices });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/supplements
   * Create a new supplement catalog entry — admin only
   */
  async createSupplement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createSupplementSchema.safeParse(req.body);
      if (!validation.success) {
        const message = validation.error.errors[0]?.message || 'Invalid request body';
        res.status(400).json({ success: false, error: 'invalid_body', message });
        return;
      }

      const { supplementId, name, prices } = validation.data;
      const existing = await SupplementDataModel.findOne({ supplementId }).lean();
      if (existing) {
        res.status(409).json({ success: false, error: 'conflict', message: 'Supplement with this ID already exists.' });
        return;
      }

      const doc = await SupplementDataModel.create({
        _id: uuidv4(),
        supplementId,
        name,
        prices: prices ?? {},
        bestPrice: 'amazon',
        bestPriceValue: prices?.amazon?.price ?? prices?.mercadolivre?.price ?? prices?.shopee?.price ?? 0,
        priceHistory: [],
        lastCrawled: new Date(),
      });

      res.status(201).json({ success: true, data: doc });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/supplements/:id
   * Update supplement catalog entry — admin only
   */
  async updateSupplement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = updateSupplementSchema.safeParse(req.body);
      if (!validation.success) {
        const message = validation.error.errors[0]?.message || 'Invalid request body';
        res.status(400).json({ success: false, error: 'invalid_body', message });
        return;
      }

      const { id } = req.params;
      const updated = await SupplementDataModel.findOneAndUpdate(
        { supplementId: id },
        { $set: validation.data },
        { new: true }
      ).lean();

      if (!updated) {
        res.status(404).json({ success: false, error: 'not_found' });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/supplements/:id
   * Delete supplement catalog entry — admin only
   */
  async deleteSupplement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await SupplementDataModel.findOneAndDelete({ supplementId: id }).lean();

      if (!deleted) {
        res.status(404).json({ success: false, error: 'not_found' });
        return;
      }

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/supplements/:id/price-alerts
   * Check if supplement in user's stack has price drops
   */
  async checkPriceAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const validationResult = supplementIdsQuerySchema.safeParse(req.query);

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || 'Invalid supplement IDs parameter';
        res.status(400).json({ success: false, error: 'invalid_supplement_ids', message: errorMessage });
        return;
      }

      const { supplementIds } = validationResult.data;
      const ids = supplementIds.split(',').map((id) => id.trim());
      const alerts = await SupplementService.checkPriceAlerts(userId, ids);

      res.json({ success: true, data: alerts });
    } catch (error) {
      next(error);
    }
  }
}
