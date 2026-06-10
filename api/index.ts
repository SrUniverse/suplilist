/**
 * Vercel catch-all API handler.
 *
 * Wraps the existing Express app with serverless-http so all /api/* traffic
 * is handled by the same business logic that previously ran on Render.
 *
 * Cold-start order:
 *  1. Sentry is initialised (no-op when SENTRY_DSN is absent)
 *  2. MongoDB connection is established (cached for warm containers)
 *  3. Express app is created once and reused across invocations
 */
import * as Sentry from '@sentry/node';
import serverlessHttp from 'serverless-http';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './lib/db.js';
import { createApp } from '../server/src/app.js';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'production',
  tracesSampleRate: 0.1,
  // Capture unhandled promise rejections and uncaught exceptions automatically
  integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
});

// Express app and its serverless wrapper — created once per warm container.
let handler: ReturnType<typeof serverlessHttp> | null = null;

function getHandler() {
  if (handler) return handler;

  const app = createApp();

  // Sentry error handler must be added after all routes and before the custom
  // error handler so it receives the original error before masking.
  Sentry.setupExpressErrorHandler(app);

  handler = serverlessHttp(app);
  return handler;
}

export default async function apiHandler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    await connectToDatabase();
  } catch (err) {
    Sentry.captureException(err);
    res.status(503).json({
      success: false,
      error: 'service_unavailable',
      message: 'Database connection failed. Please try again shortly.',
    });
    return;
  }

  const h = getHandler();
  await h(req, res);
}
