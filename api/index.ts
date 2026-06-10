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
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';
import { connectToDatabase } from './lib/db.js';
import { createApp } from '../server/src/app.js';

// Vercel's automatic body parsing consumes the request stream before Express
// sees it, breaking express.json() and the raw-body Stripe webhook route.
// Express does all parsing itself.
export const config = {
  api: {
    bodyParser: false,
  },
};

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'production',
  tracesSampleRate: 0.1,
  // Capture unhandled promise rejections and uncaught exceptions automatically
  integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
});

// Express app — created once per warm container.
//
// IMPORTANT: do NOT wrap with serverless-http here. That library adapts
// Express to AWS Lambda's (event, context) signature; Vercel invokes with
// Node-style (req, res). Wrapped, Express processed requests but the real
// response was never written — every call hung until the 30s timeout (504).
// Vercel's req/res are Node-compatible, so the Express app IS the handler.
let app: Express | null = null;

function getApp(): Express {
  if (app) return app;

  app = createApp();

  // Sentry error handler must be added after all routes and before the custom
  // error handler so it receives the original error before masking.
  Sentry.setupExpressErrorHandler(app);

  return app;
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

  const expressApp = getApp();
  // Express apps are (req, res) request handlers — Vercel's objects extend
  // Node's IncomingMessage/ServerResponse, so this is a direct dispatch.
  expressApp(req as never, res as never);
}
