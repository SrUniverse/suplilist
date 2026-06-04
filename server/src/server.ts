/**
 * Server entry point — bootstrap only.
 *
 * Responsibilities:
 *  1. Load .env (must be first import so process.env is populated before anything else)
 *  2. Validate required environment variables via Zod (fail-fast on misconfiguration)
 *  3. Connect to MongoDB
 *  4. Create the Express app and start listening
 *  5. Schedule background jobs
 *  6. Register graceful shutdown handlers
 *
 * Do NOT import this file from tests. Import app.ts and call createApp() instead.
 */
import { env } from './shared/config/env.config.js';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { OutboxProcessorJob } from './shared/infrastructure/jobs/outbox-processor.job.js';
import { AuditFlushJob } from './shared/infrastructure/jobs/audit-flush.job.js';
import { PurgeAccountsJob } from './shared/infrastructure/jobs/purge-accounts.job.js';

// ── 2. Connect to MongoDB and start the server ─────────────────────────────────
mongoose.connect(env!.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');

    const app = createApp();
    const server = app.listen(env!.PORT, () => {
      console.log(`🚀 SupliList backend server running on port ${env!.PORT}`);
    });

    // ── 3. Background job workers ──────────────────────────────────────────────
    const outboxInterval = setInterval(async () => {
      try {
        await OutboxProcessorJob.execute();
      } catch (err) {
        console.error('[Worker Error] Outbox processor execution failed:', err);
      }
    }, 60 * 1000); // every 1 min

    const auditInterval = setInterval(async () => {
      try {
        await AuditFlushJob.execute();
      } catch (err) {
        console.error('[Worker Error] Audit flush execution failed:', err);
      }
    }, 5 * 60 * 1000); // every 5 min

    const purgeInterval = setInterval(async () => {
      try {
        await PurgeAccountsJob.execute();
      } catch (err) {
        console.error('[Worker Error] Purge accounts execution failed:', err);
      }
    }, 24 * 60 * 60 * 1000); // every 24 hours

    // Run purge once on startup after 10 seconds to clear any backlogs
    setTimeout(async () => {
      try {
        await PurgeAccountsJob.execute();
      } catch (err) {
        console.error('[Worker Error] Initial Purge Accounts run failed:', err);
      }
    }, 10 * 1000);

    // ── 4. Graceful shutdown ───────────────────────────────────────────────────
    const shutdown = (signal: string) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);

      clearInterval(outboxInterval);
      clearInterval(auditInterval);
      clearInterval(purgeInterval);

      server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close()
          .then(() => {
            console.log('MongoDB connection closed.');
            process.exit(0);
          })
          .catch((dbErr) => {
            console.error('Error closing MongoDB connection:', dbErr);
            process.exit(1);
          });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB on startup:', err);
    process.exit(1);
  });
