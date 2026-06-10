/**
 * Vercel serverless function — Stripe webhook receiver.
 *
 * Dedicated function (not routed through api/index.ts + Express) because
 * Stripe signature verification needs the EXACT raw bytes of the request
 * body. Vercel's default body parser is disabled below so we can read the
 * untouched stream.
 *
 * Routing: vercel.json rewrites /api/webhooks/:path* to this directory
 * BEFORE the /api/:path* catch-all.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as Sentry from '@sentry/node';
import Stripe from 'stripe';
import { connectToDatabase } from '../lib/db.js';
import { handleStripeEvent } from '../../server/src/modules/subscriptions/stripe-webhook.handler.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return res.status(503).json({ success: false, error: 'stripe_not_configured' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || Array.isArray(signature)) {
    return res.status(400).json({ success: false, error: 'missing_signature' });
  }

  let rawBody: Buffer;
  // When the body parser could not be disabled (defensive), req.body may
  // already be a string/Buffer — prefer it if it preserves raw bytes.
  if (typeof req.body === 'string') {
    rawBody = Buffer.from(req.body, 'utf8');
  } else if (Buffer.isBuffer(req.body)) {
    rawBody = req.body;
  } else {
    rawBody = await readRawBody(req);
  }

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return res.status(400).json({ success: false, error: 'invalid_signature' });
  }

  try {
    await connectToDatabase();
    await handleStripeEvent(event);
    return res.status(200).json({ success: true, received: true });
  } catch (err) {
    Sentry.captureException(err);
    console.error('[Webhook/stripe] Event processing failed:', err);
    // 500 makes Stripe retry the event later — desired for transient failures.
    return res.status(500).json({ success: false, error: 'processing_failed' });
  }
}
