import { Router } from 'express';
import { MongooseUserIdentityRepository } from '../identity/infrastructure/mongoose/mongoose-user-identity.repository.js';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case.js';
import { UpdateUserRoleUseCase } from './application/use-cases/update-user-role.use-case.js';
import { SuspendUserUseCase, UnsuspendUserUseCase } from './application/use-cases/suspend-user.use-case.js';
import { AdminController } from './presentation/express/admin.controller.js';
import { AdminStatsController } from './presentation/express/admin-stats.controller.js';
import { requireAdmin } from '../../shared/middleware/auth.middleware.js';

export function initializeAdminModule(): Router {
  const router = Router();

  const userRepo = new MongooseUserIdentityRepository();

  const listUsersUseCase = new ListUsersUseCase(userRepo);
  const updateUserRoleUseCase = new UpdateUserRoleUseCase(userRepo);
  const suspendUserUseCase = new SuspendUserUseCase(userRepo);
  const unsuspendUserUseCase = new UnsuspendUserUseCase(userRepo);

  const controller = new AdminController(
    listUsersUseCase,
    updateUserRoleUseCase,
    suspendUserUseCase,
    unsuspendUserUseCase,
  );

  const statsController = new AdminStatsController();

  // requireAdmin runs requireAuth internally and enforces role=admin + the
  // ADMIN_EMAILS allowlist (defense in depth). Single source of truth for the gate.
  router.get('/stats', requireAdmin, statsController.getStats);
  router.get('/subscribers', requireAdmin, statsController.listSubscribers);
  router.get('/audit', requireAdmin, statsController.listAudit);
  router.get('/users', requireAdmin, controller.listUsers);
  router.patch('/users/:id/role', requireAdmin, controller.updateRole);
  router.post('/users/:id/suspend', requireAdmin, controller.suspendUser);
  router.delete('/users/:id/suspend', requireAdmin, controller.unsuspendUser);

  return router;
}
