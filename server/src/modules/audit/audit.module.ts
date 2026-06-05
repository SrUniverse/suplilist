import { Router } from 'express';
import { MongooseAuditLogRepository } from './infrastructure/mongoose/mongoose-audit-log.repository.js';
import { MongooseRefreshTokenRepository } from '../identity/infrastructure/mongoose/mongoose-refresh-token.repository.js';
import { MongooseUnitOfWork } from '../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';
import { eventBus } from '../../shared/infrastructure/event-bus/in-memory-event-bus.js';

import { LogAuditEventUseCase } from './application/use-cases/log-audit-event.use-case.js';
import { GetAuditHistoryUseCase } from './application/use-cases/get-audit-history.use-case.js';
import { GetActiveSessionsUseCase } from '../identity/application/use-cases/get-active-sessions.use-case.js';
import { RevokeSessionUseCase } from '../identity/application/use-cases/revoke-session.use-case.js';

import { UserRegisteredAuditListener } from './application/listeners/user-registered-audit.listener.js';
import { AnonymizeAuditLogsOnUserPurgedListener } from './application/listeners/anonymize-audit-logs-on-user-purged.listener.js';
import { AuditController } from './presentation/express/audit.controller.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware.js';

export function initializeAuditModule(): Router {
  const router = Router();

  // 1. Infrastructure (Repositories & UOW)
  const auditLogRepo = new MongooseAuditLogRepository();
  const refreshTokenRepo = new MongooseRefreshTokenRepository();
  const uow = new MongooseUnitOfWork();

  // 2. Use Cases
  const logAuditEventUseCase = new LogAuditEventUseCase(auditLogRepo);
  const getAuditHistoryUseCase = new GetAuditHistoryUseCase(auditLogRepo);
  const getActiveSessionsUseCase = new GetActiveSessionsUseCase(refreshTokenRepo);
  const revokeSessionUseCase = new RevokeSessionUseCase(refreshTokenRepo, uow);

  // 3. Event Listeners
  const userRegisteredAuditListener = new UserRegisteredAuditListener(logAuditEventUseCase);
  eventBus.register(userRegisteredAuditListener);

  const anonymizeAuditListener = new AnonymizeAuditLogsOnUserPurgedListener(auditLogRepo);
  eventBus.register(anonymizeAuditListener);

  // 4. Controller
  const controller = new AuditController(
    getAuditHistoryUseCase,
    getActiveSessionsUseCase,
    revokeSessionUseCase,
    auditLogRepo
  );

  // 5. Routes
  router.get('/me', requireAuth, (req, res, next) => controller.getMe(req, res, next));
  router.get('/me/sessions', requireAuth, (req, res, next) => controller.getSessions(req, res, next));
  router.delete('/me/sessions/:tokenId', requireAuth, (req, res, next) => controller.revokeSession(req, res, next));
  
  // Admin-only global history search
  router.get('/admin/audit', requireAuth, requireRole(['admin']), (req, res, next) => controller.getAdminAudit(req, res, next));

  return router;
}

export default initializeAuditModule;
