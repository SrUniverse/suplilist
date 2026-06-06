import { Router, Request, Response, NextFunction } from 'express';
import { MongooseUserIdentityRepository } from './infrastructure/mongoose/mongoose-user-identity.repository.js';
import { MongooseProfileRepository } from '../profile/infrastructure/mongoose/mongoose-profile.repository.js';
import { RedisTokenBlocklist } from '../../shared/infrastructure/security/redis-token-blocklist.js';
import { MongooseUnitOfWork } from '../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';
import { eventBus } from '../../shared/infrastructure/event-bus/in-memory-event-bus.js';
import { MongooseRefreshTokenRepository } from './infrastructure/mongoose/mongoose-refresh-token.repository.js';
import { ResendEmailProvider } from '../../shared/infrastructure/email/resend.provider.js';
import { IdentityEmailService } from './application/services/identity-email.service.js';

import { RegisterUseCase } from './application/use-cases/register.use-case.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { DeleteAccountUseCase } from './application/use-cases/delete-account.use-case.js';
import { CancelDeletionUseCase } from './application/use-cases/cancel-deletion.use-case.js';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case.js';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case.js';
import { GoogleAuthUseCase } from './application/use-cases/google-auth.use-case.js';
import { SetupMfaUseCase } from './application/use-cases/setup-mfa.use-case.js';
import { ConfirmMfaSetupUseCase } from './application/use-cases/confirm-mfa-setup.use-case.js';
import { VerifyMfaUseCase } from './application/use-cases/verify-mfa.use-case.js';
import { VerifyOtpUseCase } from './application/use-cases/verify-otp.use-case.js';
import { ResendOtpUseCase } from './application/use-cases/resend-otp.use-case.js';
import { GetSessionIdentityUseCase } from './application/use-cases/get-session-identity.use-case.js';
import { VerifyDeviceUseCase } from './application/use-cases/verify-device.use-case.js';

import { AuthController } from './presentation/express/auth.controller.js';
import { ipAuthRateLimiter, emailAuthRateLimiter, messagingIpLimiter, messagingEmailLimiter, authApiLimiter } from '../../shared/middleware/auth-rate-limiter.js';
import { requireAuth, requirePreAuth } from '../../shared/middleware/auth.middleware.js';

export function initializeIdentityModule(): Router {
  const router = Router();

  // 1. Instantiate Infrastructure Adapters (State-free Singletons)
  const userIdentityRepository = new MongooseUserIdentityRepository();
  const profileRepository = new MongooseProfileRepository();
  const tokenBlocklistRepository = new RedisTokenBlocklist(); // Redis backed blocklist
  const refreshTokenRepository = new MongooseRefreshTokenRepository();
  const unitOfWork = new MongooseUnitOfWork();
  const emailProvider = new ResendEmailProvider();
  const emailService = new IdentityEmailService(emailProvider);

  // 2. Instantiate Use Cases (Application Services)
  const registerUseCase = new RegisterUseCase(userIdentityRepository, profileRepository, unitOfWork, eventBus, emailService);
  const loginUseCase = new LoginUseCase(userIdentityRepository, unitOfWork, emailService);
  const refreshTokenUseCase = new RefreshTokenUseCase(userIdentityRepository, tokenBlocklistRepository, unitOfWork);
  const logoutUseCase = new LogoutUseCase(tokenBlocklistRepository, unitOfWork);
  const deleteAccountUseCase = new DeleteAccountUseCase(userIdentityRepository, refreshTokenRepository, tokenBlocklistRepository, unitOfWork);
  const cancelDeletionUseCase = new CancelDeletionUseCase(userIdentityRepository, unitOfWork);
  const forgotPasswordUseCase = new ForgotPasswordUseCase(userIdentityRepository, emailService);
  const resetPasswordUseCase = new ResetPasswordUseCase(userIdentityRepository, tokenBlocklistRepository);
  const googleAuthUseCase = new GoogleAuthUseCase(userIdentityRepository, profileRepository, unitOfWork, emailService);
  const setupMfaUseCase = new SetupMfaUseCase(userIdentityRepository, unitOfWork);
  const confirmMfaSetupUseCase = new ConfirmMfaSetupUseCase(userIdentityRepository, unitOfWork);
  const verifyMfaUseCase = new VerifyMfaUseCase(userIdentityRepository, tokenBlocklistRepository, unitOfWork);
  const verifyOtpUseCase = new VerifyOtpUseCase(userIdentityRepository);
  const resendOtpUseCase = new ResendOtpUseCase(userIdentityRepository, emailService);
  const getSessionIdentityUseCase = new GetSessionIdentityUseCase(userIdentityRepository);
  const verifyDeviceUseCase = new VerifyDeviceUseCase(userIdentityRepository, unitOfWork);

  // 3. Instantiate Controller (Presentation Layer)
  const controller = new AuthController(
    registerUseCase, 
    loginUseCase, 
    refreshTokenUseCase, 
    logoutUseCase,
    deleteAccountUseCase,
    cancelDeletionUseCase,
    forgotPasswordUseCase,
    resetPasswordUseCase,
    googleAuthUseCase,
    setupMfaUseCase,
    confirmMfaSetupUseCase,
    verifyMfaUseCase,
    verifyOtpUseCase,
    resendOtpUseCase,
    getSessionIdentityUseCase,
    verifyDeviceUseCase
  );

  // 4. Register HTTP Router Routes
  router.get('/me', requireAuth, (req: Request, res: Response, next: NextFunction) => controller.getMe(req, res, next));
  
  router.post(
    '/register', 
    messagingIpLimiter, 
    messagingEmailLimiter, 
    (req: Request, res: Response, next: NextFunction) => controller.register(req, res, next)
  );
  
  router.post(
    '/verify-otp',
    authApiLimiter,
    (req: Request, res: Response, next: NextFunction) => controller.verifyOtp(req, res, next)
  );

  router.post(
    '/resend-otp',
    authApiLimiter,
    (req: Request, res: Response, next: NextFunction) => controller.resendOtp(req, res, next)
  );

  router.post(
    '/verify-device',
    authApiLimiter,
    (req: Request, res: Response, next: NextFunction) => controller.verifyDevice(req, res, next)
  );
  
  // Chain both IP-based and Email-based rate limiters to secure the login route
  router.post(
    '/login', 
    ipAuthRateLimiter, 
    emailAuthRateLimiter, 
    (req: Request, res: Response, next: NextFunction) => controller.login(req, res, next)
  );
  
  router.post('/refresh', (req: Request, res: Response, next: NextFunction) => controller.refresh(req, res, next));
  router.post('/logout', requireAuth, (req: Request, res: Response, next: NextFunction) => controller.logout(req, res, next));
  router.delete('/account', requireAuth, (req: Request, res: Response, next: NextFunction) => controller.deleteAccount(req, res, next));
  router.post('/account/cancel-deletion', (req: Request, res: Response, next: NextFunction) => controller.cancelDeletion(req, res, next));
  
  // Message routing for reset password using strict messaging limiters
  router.post('/forgot-password', messagingIpLimiter, messagingEmailLimiter, (req: Request, res: Response, next: NextFunction) => controller.forgotPassword(req, res, next));
  router.post('/reset-password', messagingIpLimiter, messagingEmailLimiter, (req: Request, res: Response, next: NextFunction) => controller.resetPassword(req, res, next));

  // OAuth2 Google Identity Services
  router.post('/google', authApiLimiter, (req: Request, res: Response, next: NextFunction) => controller.googleAuth(req, res, next));

  // MFA Flow
  router.post('/mfa/setup', requireAuth, authApiLimiter, (req: Request, res: Response, next: NextFunction) => controller.setupMfa(req, res, next));
  router.post('/mfa/setup/confirm', requireAuth, authApiLimiter, (req: Request, res: Response, next: NextFunction) => controller.confirmMfaSetup(req, res, next));
  router.post('/mfa/verify', requirePreAuth, authApiLimiter, (req: Request, res: Response, next: NextFunction) => controller.verifyMfa(req, res, next));

  return router;
}

export default initializeIdentityModule;
