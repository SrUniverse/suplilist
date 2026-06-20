import { AuditLogModel } from '../../../modules/audit/infrastructure/mongoose/audit-log.model.js';
import { redisClient } from '../redis/redis.client.js';
import { MongoBulkWriteError } from 'mongodb';
import { logger } from '../../utils/logger.js';

export class AuditFlushJob {
  static async execute(): Promise<void> {
    const batchSize = 100;
    const QUEUE_KEY = 'audit_fallback_queue';

    // 1. Fetch items from the tail of the list (Non-destructive read)
    const rawItems = await redisClient.lrange(QUEUE_KEY, -batchSize, -1);
    if (rawItems.length === 0) return;

    // Convert raw JSON strings to objects (which contain pre-generated Mongoose ObjectIds as _id)
    const parsedLogs = rawItems.map(item => JSON.parse(item));

    try {
      // 2. Mass unordered insert using native Mongo driver bypass to avoid Mongoose schema overhead
      await AuditLogModel.collection.insertMany(parsedLogs, { ordered: false });

      // 3. Success: Safe clean of the queue (trim the tail)
      await redisClient.ltrim(QUEUE_KEY, 0, -(rawItems.length + 1));
      logger.info(`[DLQ Audit] Successfully flushed ${rawItems.length} logs to MongoDB.`);
    } catch (error: any) {
      if (error instanceof MongoBulkWriteError && error.code === 11000) {
        // Error 11000 = Duplicate Key. A collision occurred because of re-processing.
        // We verify if ALL errors in the bulk write were due to duplicate keys.
        const writeErrors = Array.isArray(error.writeErrors) ? error.writeErrors : [error.writeErrors];
        const allDuplicates = writeErrors.every((we: any) => we.code === 11000);

        if (allDuplicates) {
          logger.info('[DLQ Audit] All flushed logs were already persisted (idempotence matched). Trimming queue.');
          await redisClient.ltrim(QUEUE_KEY, 0, -(rawItems.length + 1));
          return;
        }
      }

      // Any other database error (network issues, timeout, etc.) keeps the queue intact
      logger.error('[DLQ Audit] Failure during flush (will retry in next window):', error);
    }
  }
}
export default AuditFlushJob;
