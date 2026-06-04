import { Router } from 'express';
import { MongooseUserIdentityRepository } from './infrastructure/mongoose/mongoose-user-identity.repository.js';
import { MongooseProfileRepository } from '../profile/infrastructure/mongoose/mongoose-profile.repository.js';
import { RedisTokenBlocklist } from '../../shared/infrastructure/security/redis-token-blocklist.js';
import { MongooseUnitOfWork } from '../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';
import { eventBus } from '../../shared/infrastructure/event-bus/in-memory-event-bus.js';

import { RegisterUseCase } from './application/use-cases/register.use-case.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { DeleteAccountUseCase } from './application/use-cases/delete-account.use-case.js';
import { CancelDeletionUseCase } from './application/use-cases/cancel-deletion.use-case.js';

import { AuthController } from './presentation/express/auth.controller.js';
import { ipAuthRateLimiter, emailAuthRateLimiter } from '../../shared/middleware/auth-rate-limiter.js';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';

export function initializeIdentityModule(): Router {
  const router = Router();

  // 1. Instantiate Infrastructure Adapters (State-free Singletons)
  const userIdentityRepository = new MongooseUserIdentityRepository();
  const profileRepository = new MongooseProfileRepository();
  const tokenBlocklistRepository = new RedisTokenBlocklist(); // Redis backed blocklist
  const unitOfWork = new MongooseUnitOfWork();

  // 2. Instantiate Use Cases (Application Services)
  const registerUseCase = new RegisterUseCase(userIdentityRepository, profileRepository, unitOfWork, eventBus);
  const loginUseCase = new LoginUseCase(userIdentityRepository, unitOfWork);
  const refreshTokenUseCase = new RefreshTokenUseCase(userIdentityRepository, tokenBlocklistRepository, unitOfWork);
  const logoutUseCase = new LogoutUseCase(tokenBlocklistRepository, unitOfWork);
  const deleteAccountUseCase = new DeleteAccountUseCase(userIdentityRepository, tokenBlocklistRepository, unitOfWork);
  const cancelDeletionUseCase = new CancelDeletionUseCase(userIdentityRepository, unitOfWork);

  // 3. Instantiate Controller (Presentation Layer)
  const controller = new AuthController(
    registerUseCase, 
    loginUseCase, 
    refreshTokenUseCase, 
    logoutUseCase,
    deleteAccountUseCase,
    cancelDeletionUseCase
  );

  // 4. Register HTTP Router Routes
  router.post('/register', (req, res, next) => controller.register(req, res, next));
  
  // Chain both IP-based and Email-based rate limiters to secure the login route
  router.post(
    '/login', 
    ipAuthRateLimiter, 
    emailAuthRateLimiter, 
    (req, res, next) => controller.login(req, res, next)
  );
  
  router.post('/refresh', (req, res, next) => controller.refresh(req, res, next));
  router.post('/logout', requireAuth, (req, res, next) => controller.logout(req, res, next));
  router.delete('/account', requireAuth, (req, res, next) => controller.deleteAccount(req, res, next));
  router.post('/account/cancel-deletion', (req, res, next) => controller.cancelDeletion(req, res, next));

  return router;
}

export default initializeIdentityModule;
