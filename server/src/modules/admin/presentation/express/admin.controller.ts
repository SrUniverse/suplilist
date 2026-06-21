import { Request, Response } from 'express';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case.js';
import { UpdateUserRoleUseCase } from '../../application/use-cases/update-user-role.use-case.js';
import { SuspendUserUseCase, UnsuspendUserUseCase } from '../../application/use-cases/suspend-user.use-case.js';
import { UserRole, UserStatus } from '../../../identity/domain/user-identity.entity.js';
import { recordAudit } from '../../application/audit.service.js';

export class AdminController {
  constructor(
    private listUsersUseCase: ListUsersUseCase,
    private updateUserRoleUseCase: UpdateUserRoleUseCase,
    private suspendUserUseCase: SuspendUserUseCase,
    private unsuspendUserUseCase: UnsuspendUserUseCase,
  ) {}

  listUsers = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const role = req.query['role'] as UserRole | undefined;
    const status = req.query['status'] as UserStatus | undefined;

    const result = await this.listUsersUseCase.execute({ page, limit, role, status });

    return res.status(200).json({
      success: true,
      data: result,
    });
  };

  updateRole = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body as { role: UserRole };

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'role is required',
      });
    }

    await this.updateUserRoleUseCase.execute(id, req.user!.id, role);

    await recordAudit(req, { action: 'user.role.update', targetType: 'user', targetId: id, metadata: { role } });
    return res.status(200).json({ success: true });
  };

  suspendUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    await this.suspendUserUseCase.execute(id, req.user!.id, reason || 'No reason provided');

    await recordAudit(req, { action: 'user.suspend', targetType: 'user', targetId: id, metadata: { reason: reason || 'No reason provided' } });
    return res.status(200).json({ success: true });
  };

  unsuspendUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    await this.unsuspendUserUseCase.execute(id);

    await recordAudit(req, { action: 'user.unsuspend', targetType: 'user', targetId: id });
    return res.status(200).json({ success: true });
  };
}
