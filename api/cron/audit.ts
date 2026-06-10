/**
 * Vercel Cron — Audit Flush
 * Schedule: every 5 minutes (see vercel.json)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as Sentry from '@sentry/node';
import { connectToDatabase } from '../lib/db.js';
import { AuditFlushJob } from '../../server/src/shared/infrastructure/jobs/audit-flush.job.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await connectToDatabase();
    await AuditFlushJob.execute();
    res.status(200).json({ ok: true, job: 'audit-flush' });
  } catch (err) {
    Sentry.captureException(err);
    console.error('[Cron/audit] Job failed:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}
