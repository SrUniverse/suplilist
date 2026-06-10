/**
 * Vercel Cron — Outbox Processor
 * Schedule: every minute (see vercel.json)
 *
 * Replaces the setInterval-based OutboxProcessorJob that ran inside server.ts.
 * Vercel Cron calls this endpoint on schedule with a CRON_SECRET Authorization
 * header to prevent unauthorised invocations.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as Sentry from '@sentry/node';
import { connectToDatabase } from '../lib/db.js';
import { OutboxProcessorJob } from '../../server/src/shared/infrastructure/jobs/outbox-processor.job.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await connectToDatabase();
    await OutboxProcessorJob.execute();
    res.status(200).json({ ok: true, job: 'outbox' });
  } catch (err) {
    Sentry.captureException(err);
    console.error('[Cron/outbox] Job failed:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}
