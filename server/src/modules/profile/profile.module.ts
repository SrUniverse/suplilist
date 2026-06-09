import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import { MongooseProfileRepository } from './infrastructure/mongoose/mongoose-profile.repository.js';
import { GetProfileUseCase } from './application/use-cases/get-profile.use-case.js';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case.js';
import { ProfileController } from './presentation/express/profile.controller.js';

import { SyncMigrationVersionUseCase } from './application/use-cases/sync-migration-version.use-case.js';

export function initializeProfileModule(): Router {
  const router = Router();

  // 1. Adapters
  const profileRepository = new MongooseProfileRepository();

  // 2. Use Cases
  const getProfileUseCase = new GetProfileUseCase(profileRepository);
  const updateProfileUseCase = new UpdateProfileUseCase(profileRepository);
  
  // Adapter to bridge IProfileRepository and IUserProfileRepository for the legacy use case
  const userProfileRepoAdapter = {
    findPrivateByUserId: async (userId: string) => profileRepository.findByUserId(userId) as any,
    findByUserId: async (userId: string) => profileRepository.findByUserId(userId) as any,
    save: async (profile: any) => profileRepository.save(profile as any) as any,
    deleteByUserId: async (userId: string) => {}
  };

  const syncMigrationVersionUseCase = new SyncMigrationVersionUseCase(userProfileRepoAdapter, {
    runInTransaction: async (fn) => fn() // simple uow bypass for now since we don't have the real UoW here
  });

  // 3. Controller
  const controller = new ProfileController(getProfileUseCase, updateProfileUseCase, syncMigrationVersionUseCase);

  // 4. Routes
  // All profile routes require authentication
  router.use(requireAuth);

  router.patch('/me/migration-sync', (req: Request, res: Response, next: NextFunction) => controller.syncMigrationVersion(req, res, next));
  router.get('/me', (req: Request, res: Response, next: NextFunction) => controller.getMe(req, res, next));
  router.patch('/me', (req: Request, res: Response, next: NextFunction) => controller.updateProfile(req, res, next));

  return router;
}

export default initializeProfileModule;
