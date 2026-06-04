import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import { MongooseCheckinRepository } from './infrastructure/mongoose/mongoose-checkin.repository.js';
import { LogCheckinUseCase } from './application/use-cases/log-checkin.use-case.js';
import { GetCheckinHistoryUseCase } from './application/use-cases/get-checkin-history.use-case.js';
import { CheckinController } from './presentation/express/checkin.controller.js';

export function initializeCheckinModule(): Router {
  const router = Router();

  // 1. Adapters
  const checkinRepository = new MongooseCheckinRepository();

  // 2. Use Cases
  const logCheckinUseCase = new LogCheckinUseCase(checkinRepository);
  const getCheckinHistoryUseCase = new GetCheckinHistoryUseCase(checkinRepository);

  // 3. Controller
  const controller = new CheckinController(
    logCheckinUseCase,
    getCheckinHistoryUseCase
  );

  // 4. Routes
  router.use(requireAuth);

  router.post('/', (req, res, next) => controller.log(req, res, next));
  router.get('/', (req, res, next) => controller.getHistory(req, res, next));

  return router;
}

export default initializeCheckinModule;
