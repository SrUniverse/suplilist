import { Router } from 'express';
import { MongooseUserProfileRepository } from './infrastructure/mongoose/mongoose-user-profile.repository.js';
import { MongooseUnitOfWork } from '../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';
import { eventBus } from '../../shared/infrastructure/event-bus/in-memory-event-bus.js';

import { GetPublicProfileUseCase } from './application/use-cases/get-public-profile.use-case.js';
import { GetPrivateProfileUseCase } from './application/use-cases/get-private-profile.use-case.js';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case.js';
import { GetAvatarUploadUrlUseCase } from './application/use-cases/get-avatar-upload-url.use-case.js';

import { CreateProfileOnUserRegisteredListener } from './application/listeners/create-profile-on-user-registered.listener.js';
import { DeleteProfileOnUserPurgedListener } from './application/listeners/delete-profile-on-user-purged.listener.js';
import { ProfileController } from './presentation/express/profile.controller.js';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';

export function initializeProfileModule(): Router {
  const router = Router();

  // 1. Infrastructure
  const profileRepository = new MongooseUserProfileRepository();
  const unitOfWork = new MongooseUnitOfWork();

  // 2. Event Listeners (Reacting to other Bounded Contexts)
  const createProfileListener = new CreateProfileOnUserRegisteredListener(profileRepository);
  eventBus.register(createProfileListener);

  const deleteProfileListener = new DeleteProfileOnUserPurgedListener(profileRepository);
  eventBus.register(deleteProfileListener);

  // 3. Use Cases
  const getPublicProfileUseCase = new GetPublicProfileUseCase(profileRepository);
  const getPrivateProfileUseCase = new GetPrivateProfileUseCase(profileRepository);
  const updateProfileUseCase = new UpdateProfileUseCase(profileRepository, unitOfWork);
  const getAvatarUploadUrlUseCase = new GetAvatarUploadUrlUseCase();

  // 4. Controller
  const controller = new ProfileController(
    getPublicProfileUseCase,
    getPrivateProfileUseCase,
    updateProfileUseCase,
    getAvatarUploadUrlUseCase,
    profileRepository
  );

  // 5. Routes
  router.get('/me', requireAuth, (req, res, next) => controller.getMe(req, res, next));
  router.patch('/me', requireAuth, (req, res, next) => controller.updateMe(req, res, next));
  router.get('/avatar/upload-url', requireAuth, (req, res, next) => controller.getAvatarUploadUrl(req, res, next));
  router.post('/avatar/confirm', requireAuth, (req, res, next) => controller.confirmAvatarUpload(req, res, next));
  
  // Public profile search (guarded but open to any authenticated user)
  router.get('/:userId', requireAuth, (req, res, next) => controller.getPublicProfile(req, res, next));

  return router;
}

export default initializeProfileModule;
