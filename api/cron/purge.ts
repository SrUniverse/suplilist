/**
 * Vercel Cron — Purge Accounts
 * Schedule: daily at 02:00 UTC (see vercel.json)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as Sentry from '@sentry/node';
import { connectToDatabase } from '../lib/db.js';
import { PurgeAccountsJob } from '../../server/src/shared/infrastructure/jobs/purge-accounts.job.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await connectToDatabase();
    await PurgeAccountsJob.execute();
    res.status(200).json({ ok: true, job: 'purge-accounts' });
  } catch (err) {
    Sentry.captureException(err);
    console.error('[Cron/purge] Job failed:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}
