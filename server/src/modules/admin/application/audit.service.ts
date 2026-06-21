import { Request } from 'express';
import { AdminAuditLogModel } from '../infrastructure/mongoose/admin-audit-log.model.js';
import { logger } from '../../../shared/utils/logger.js';

interface AuditInput {
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

function clientIp(req: Request): string | null {
  const fwd = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  return fwd || req.socket.remoteAddress || null;
}

/**
 * Record an admin action. Never throws — auditing must not break the request it
 * is logging. The actor is taken from the authenticated request (set by
 * requireAdmin), so it cannot be spoofed by the client.
 */
export async function recordAudit(req: Request, input: AuditInput): Promise<void> {
  try {
    await AdminAuditLogModel.create({
      actorId: req.user?.id ?? 'unknown',
      actorEmail: req.firebaseUser?.email ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata,
      ip: clientIp(req),
    });
  } catch (err) {
    logger.error('[audit] failed to record admin action', { action: input.action, err });
  }
}
