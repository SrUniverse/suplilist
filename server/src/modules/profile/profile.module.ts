import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import { MongooseProfileRepository } from './infrastructure/mongoose/mongoose-profile.repository.js';
import { GetProfileUseCase } from './application/use-cases/get-profile.use-case.js';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case.js';
import { ProfileController } from './presentation/express/profile.controller.js';

export function initializeProfileModule(): Router {
  const router = Router();

  // 1. Adapters
  const profileRepository = new MongooseProfileRepository();

  // 2. Use Cases
  const getProfileUseCase = new GetProfileUseCase(profileRepository);
  const updateProfileUseCase = new UpdateProfileUseCase(profileRepository);

  // 3. Controller
  const controller = new ProfileController(getProfileUseCase, updateProfileUseCase);

  // 4. Routes
  // All profile routes require authentication
  router.use(requireAuth);

  router.get('/me', (req: Request, res: Response, next: NextFunction) => controller.getMe(req, res, next));
  router.put('/me', (req: Request, res: Response, next: NextFunction) => controller.updateProfile(req, res, next));

  return router;
}

export default initializeProfileModule;
