import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import { AnalyticsService } from './application/analytics.service.js';
import { ReportController } from './presentation/express/report.controller.js';

export function initializeReportsModule(): Router {
  const router = Router();

  // Service & Controller
  const analyticsService = new AnalyticsService();
  const controller = new ReportController(analyticsService);

  // Routes
  router.use(requireAuth);

  router.get('/heatmap', (req, res, next) => controller.getHeatmap(req, res, next));
  router.get('/trend', (req, res, next) => controller.getTrend(req, res, next));
  router.get('/streak', (req, res, next) => controller.getStreak(req, res, next));
  router.get('/achievements', (req, res, next) => controller.getAchievements(req, res, next));
  router.get('/supplements/:supplementId', (req, res, next) => controller.getSupplementAdherence(req, res, next));
  router.get('/monthly', (req, res, next) => controller.getMonthlyReport(req, res, next));
  router.get('/dashboard', (req, res, next) => controller.getDashboard(req, res, next));

  return router;
}

export default initializeReportsModule;
