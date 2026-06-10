import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../shared/middleware/auth.middleware.js';
import { SupplementController } from './presentation/express/supplement.controller.js';

export function initializeSupplementsModule(): Router {
  const router = Router();
  const controller = new SupplementController();

  // Public routes (no auth required for browsing)
  router.get('/prices', (req, res, next) => controller.getPricesForMultiple(req, res, next));
  router.get('/search', (req, res, next) => controller.searchSupplements(req, res, next));
  router.get('/:id', (req, res, next) => controller.getSupplement(req, res, next));
  router.get('/:id/price-history', (req, res, next) => controller.getPriceHistory(req, res, next));

  // User-authenticated routes
  router.use(requireAuth);
  router.post('/crawl-on-demand', (req, res, next) => controller.crawlOnDemand(req, res, next));
  router.get('/:id/price-alerts', (req, res, next) => controller.checkPriceAlerts(req, res, next));

  // Admin-only catalog management (POST/PUT/DELETE require admin role)
  router.post('/', requireAdmin, (req, res, next) => controller.createSupplement(req, res, next));
  router.put('/:id', requireAdmin, (req, res, next) => controller.updateSupplement(req, res, next));
  router.delete('/:id', requireAdmin, (req, res, next) => controller.deleteSupplement(req, res, next));

  return router;
}

export default initializeSupplementsModule;
