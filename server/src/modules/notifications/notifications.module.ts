import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import { NotificationService } from './application/notification.service.js';
import { NotificationController } from './presentation/express/notification.controller.js';

export function initializeNotificationsModule(): Router {
  const router = Router();

  // Service & Controller
  const notificationService = new NotificationService();
  const controller = new NotificationController(notificationService);

  // Routes
  router.use(requireAuth);

  router.get('/preferences', (req, res, next) => controller.getPreferences(req, res, next));
  router.put('/preferences', (req, res, next) => controller.updatePreferences(req, res, next));
  router.post('/schedule', (req, res, next) => controller.scheduleNotifications(req, res, next));
  router.post('/track', (req, res, next) => controller.trackEngagement(req, res, next));
  router.get('/pending', (req, res, next) => controller.getPendingNotifications(req, res, next));
  router.get('/analytics', (req, res, next) => controller.getAnalytics(req, res, next));

  return router;
}

export default initializeNotificationsModule;
