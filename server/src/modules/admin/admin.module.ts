import { Router } from 'express';
import { MongooseUserIdentityRepository } from '../identity/infrastructure/mongoose/mongoose-user-identity.repository.js';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case.js';
import { UpdateUserRoleUseCase } from './application/use-cases/update-user-role.use-case.js';
import { SuspendUserUseCase, UnsuspendUserUseCase } from './application/use-cases/suspend-user.use-case.js';
import { AdminController } from './presentation/express/admin.controller.js';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware.js';

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

  const adminGuard = [requireAuth, requireRole(['admin'])];

  router.get('/users', ...adminGuard, controller.listUsers);
  router.patch('/users/:id/role', ...adminGuard, controller.updateRole);
  router.post('/users/:id/suspend', ...adminGuard, controller.suspendUser);
  router.delete('/users/:id/suspend', ...adminGuard, controller.unsuspendUser);

  return router;
}
