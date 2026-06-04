import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GetAuditHistoryUseCase } from '../../application/use-cases/get-audit-history.use-case.js';
import { GetActiveSessionsUseCase } from '../../../identity/application/use-cases/get-active-sessions.use-case.js';
import { RevokeSessionUseCase } from '../../../identity/application/use-cases/revoke-session.use-case.js';
import { IAuditLogRepository } from '../../repositories/audit-log.repository.js';

const querySchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class AuditController {
  constructor(
    private getAuditHistoryUseCase: GetAuditHistoryUseCase,
    private getActiveSessionsUseCase: GetActiveSessionsUseCase,
    private revokeSessionUseCase: RevokeSessionUseCase,
    private auditLogRepo: IAuditLogRepository
  ) {}

  async getMe(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const query = querySchema.parse(req.query);
      const userId = req.user!.id;

      const result = await this.getAuditHistoryUseCase.execute({
        userId,
        cursor: query.cursor,
        limit: query.limit,
      });

      return res.status(200).json({
        success: true,
        data: result.logs,
        nextCursor: result.nextCursor,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const sessions = await this.getActiveSessionsUseCase.execute(userId);

      return res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const { tokenId } = req.params;

      await this.revokeSessionUseCase.execute({
        userId,
        sessionId: tokenId,
      });

      return res.status(200).json({
        success: true,
        message: 'Sessão revogada com sucesso.',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdminAudit(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const query = querySchema.parse(req.query);
      const filterEvent = req.query.event ? String(req.query.event) : undefined;

      const result = await this.auditLogRepo.findGlobalHistory(
        query.cursor || null,
        query.limit,
        filterEvent
      );

      return res.status(200).json({
        success: true,
        data: result.logs,
        nextCursor: result.nextCursor,
      });
    } catch (error) {
      next(error);
    }
  }
}
export default AuditController;
