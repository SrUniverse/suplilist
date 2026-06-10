import { Router } from 'express';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';
import { PaymentController } from './presentation/express/payment.controller.js';

export function initializePaymentsModule(): Router {
  const router = Router();
  const controller = new PaymentController();

  // All payment routes require a valid JWT — no public access
  router.use(authenticateToken);

  router.post('/', (req, res, next) => controller.createOrder(req, res, next));
  router.get('/', (req, res, next) => controller.getMyOrders(req, res, next));
  router.get('/:orderId', (req, res, next) => controller.getOrderById(req, res, next));

  return router;
}

export default initializePaymentsModule;
