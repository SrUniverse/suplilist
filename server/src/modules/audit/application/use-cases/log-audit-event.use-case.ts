import mongoose from 'mongoose';
import { IAuditLogRepository } from '../../repositories/audit-log.repository.js';
import { redisClient } from '../../../../shared/infrastructure/redis/redis.client.js';
import { logger } from '../../../../shared/utils/logger.js';

export interface LogAuditEventInput {
  userId: string | null;
  event: string;
  outcome: 'success' | 'failure';
  failureReason: string | null;
  ipAddress: string;
  userAgent: string;
  deviceLabel?: string | null;
  country?: string | null;
  meta?: Record<string, any> | null;
}

export class LogAuditEventUseCase {
  constructor(private auditLogRepo: IAuditLogRepository) {}

  async execute(input: LogAuditEventInput): Promise<void> {
    const logId = new mongoose.Types.ObjectId().toString(); // Pre-generate ObjectId on application layer
    const timestamp = new Date();

    const logData = {
      id: logId,
      userId: input.userId,
      event: input.event,
      outcome: input.outcome,
      failureReason: input.failureReason,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceLabel: input.deviceLabel || null,
      country: input.country || null,
      meta: input.meta || null,
      timestamp
    };

    try {
      await this.auditLogRepo.save(logData);
    } catch (error) {
      logger.error('[Audit Log] Failed to write directly to MongoDB. Pushing to Redis DLQ queue:', error);
      
      // Build same structure that native MongoDB bulk insertMany expects (e.g. mapping to _id)
      const dlqPayload = {
        _id: logId, // Store the pre-instantiated ID in the fallback queue to preserve idempotency
        userId: input.userId,
        event: input.event,
        outcome: input.outcome,
        failureReason: input.failureReason,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        deviceLabel: input.deviceLabel || null,
        country: input.country || null,
        meta: input.meta || null,
        timestamp: timestamp.toISOString()
      };

      try {
        await redisClient.lpush('audit_fallback_queue', JSON.stringify(dlqPayload));
      } catch (redisError) {
        logger.error('CRITICAL: Redis is also unreachable! Audit log has been dropped:', redisError, dlqPayload);
      }
    }
  }
}
export default LogAuditEventUseCase;
