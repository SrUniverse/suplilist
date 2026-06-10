import { Router, Request, Response, NextFunction } from 'express';
import { MongooseUserIdentityRepository } from './infrastructure/mongoose/mongoose-user-identity.repository.js';
import { MongooseProfileRepository } from '../profile/infrastructure/mongoose/mongoose-profile.repository.js';
import { MongooseUnitOfWork } from '../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';
import { eventBus } from '../../shared/infrastructure/event-bus/in-memory-event-bus.js';
import { MongooseRefreshTokenRepository } from './infrastructure/mongoose/mongoose-refresh-token.repository.js';
import { ResendEmailProvider } from '../../shared/infrastructure/email/resend.provider.js';
import { IdentityEmailService } from './application/services/identity-email.service.js';

import { DeleteAccountUseCase } from './application/use-cases/delete-account.use-case.js';
import { CancelDeletionUseCase } from './application/use-cases/cancel-deletion.use-case.js';
import { GetSessionIdentityUseCase } from './application/use-cases/get-session-identity.use-case.js';

import { AuthController } from './presentation/express/auth.controller.js';
import { ipAuthRateLimiter, emailAuthRateLimiter, messagingIpLimiter, messagingEmailLimiter, authApiLimiter } from '../../shared/middleware/auth-rate-limiter.js';
import { requireAuth, requirePreAuth } from '../../shared/middleware/auth.middleware.js';

import authSyncRoute from './presentation/express/auth-sync.route.js';

export function initializeIdentityModule(): Router {
  const router = Router();

  // 1. Instantiate Infrastructure Adapters (State-free Singletons)
  const userIdentityRepository = new MongooseUserIdentityRepository();
  const profileRepository = new MongooseProfileRepository();
  const refreshTokenRepository = new MongooseRefreshTokenRepository();
  const unitOfWork = new MongooseUnitOfWork();
  const emailProvider = new ResendEmailProvider();
  const emailService = new IdentityEmailService(emailProvider);

  // 2. Instantiate Use Cases (Application Services)
  const getSessionIdentityUseCase = new GetSessionIdentityUseCase(userIdentityRepository);


  // Rota de Sincronização Firebase Auth -> MongoDB
  router.use(authSyncRoute);

  return router;
}

export default initializeIdentityModule;
