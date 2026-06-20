import mongoose from 'mongoose';
import { redisClient } from '../redis/redis.client.js';
import { MongooseUnitOfWork, transactionStorage } from '../mongoose/mongoose-unit-of-work.js';
import { UserIdentityModel } from '../../../modules/identity/infrastructure/mongoose/user-identity.model.js';
import { RefreshTokenModel } from '../../../modules/identity/infrastructure/mongoose/refresh-token.model.js';
import { OutboxEventModel } from '../mongoose/outbox-event.model.js';
import { logger } from '../../utils/logger.js';

export class PurgeAccountsJob {
  static async execute(): Promise<void> {
    const lockKey = 'job:purge:lock';
    const lockTtl = 1800; // 30 minutes in seconds

    // 1. Acquire Distributed Redis Lock
    const acquired = await redisClient.set(lockKey, '1', 'EX', lockTtl, 'NX');
    if (acquired !== 'OK') {
      logger.info('[Purge Job] Another instance is already running this job. Skipping.');
      return;
    }

    try {
      logger.info('[Purge Job] Lock acquired. Starting account purge cycle...');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const uow = new MongooseUnitOfWork();
      let lastProcessedId: string | null = null;
      const batchLimit = 100;

      while (true) {
        // Query logic matching composited coverage index: { status, deletedAt, purgeFailed, _id }
        const query: any = {
          status: 'deleted',
          deletedAt: { $lte: thirtyDaysAgo },
          purgeFailed: { $ne: true },
        };

        if (lastProcessedId) {
          query._id = { $gt: new mongoose.Types.ObjectId(lastProcessedId) };
        }

        // 2. Fetch soft-deleted users outside transaction to prevent transaction timeouts/locks
        const expiredUsers = await UserIdentityModel.find(query)
          .sort({ _id: 1 })
          .limit(batchLimit);

        if (expiredUsers.length === 0) {
          break;
        }

        for (const user of expiredUsers) {
          let attempts = 0;
          let success = false;

          // Sequential retry loop in-place
          while (attempts < 3 && !success) {
            try {
              // 3. Isolated transaction per user to keep it fast, small and connection-safe
              await uow.runInTransaction(async () => {
                const session = transactionStorage.getStore();
                const userIdStr = user._id.toString();

                // Generate a fresh 24-character Mongoose ObjectId hex string to avoid CastError
                const anonymousId = new mongoose.Types.ObjectId().toHexString();

                // Delete Identity record
                await UserIdentityModel.deleteOne({ _id: user._id }).session(session || null);

                // Delete all Active refresh tokens (sessions)
                await RefreshTokenModel.deleteMany({ userId: userIdStr }).session(session || null);

                // Write transactional outbox event
                await OutboxEventModel.create(
                  [
                    {
                      aggregateType: 'User',
                      aggregateId: userIdStr,
                      eventType: 'UserPurged',
                      payload: {
                        userId: userIdStr,
                        anonymousId,
                      },
                      status: 'pending',
                      attempts: 0,
                      createdAt: new Date(),
                    },
                  ],
                  { session: session || null }
                );
              });
              success = true;
              logger.info(`[Purge Job] Successfully purged account identity: ${user._id}`);
            } catch (error: any) {
              attempts++;
              logger.error(`[Purge Job] Attempt ${attempts}/3 failed for user ${user._id}:`, error.message);
              if (attempts < 3) {
                // Short exponential backoff delay before retrying
                await new Promise((resolve) => setTimeout(resolve, 200 * attempts));
              }
            }
          }

          if (!success) {
            logger.error(`[Purge Job] Definitively failed to purge user ${user._id} after 3 attempts. Flagging.`);
            // Mark user identity as failed to isolate it from future scans and notify admin
            await UserIdentityModel.updateOne(
              { _id: user._id },
              {
                $set: {
                  purgeAttempts: attempts,
                  purgeFailed: true,
                },
              }
            );
          }

          lastProcessedId = user._id.toString();
        }

        // Give Event Loop time to breathe / process concurrent HTTP request sockets
        await new Promise((resolve) => setImmediate(resolve));
      }

      logger.info('[Purge Job] Account purge cycle completed successfully.');
    } catch (err: any) {
      logger.error('[Purge Job] Critical error in purge job cycle:', err);
    } finally {
      // Release lock so future job runs can execute
      await redisClient.del(lockKey);
      logger.info('[Purge Job] Lock released.');
    }
  }
}
export default PurgeAccountsJob;
