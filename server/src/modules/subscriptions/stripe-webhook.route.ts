/**
 * Stripe webhook Express route — local/dev entry point.
 *
 * MUST be mounted BEFORE express.json() so the raw body is available for
 * signature verification (Stripe signs the exact bytes it sends).
 *
 * In production on Vercel, /api/webhooks/stripe is served by the dedicated
 * serverless function api/webhooks/stripe.ts instead of this route.
 */
import Stripe from 'stripe';
import express, { Router, Request, Response } from 'express';
import { env } from '../../shared/config/env.config.js';
import { handleStripeEvent } from './stripe-webhook.handler.js';

export function createStripeWebhookRouter(): Router {
  const router = Router();

  router.post(
    '/stripe',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
        return res.status(503).json({ success: false, error: 'stripe_not_configured' });
      }

      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return res.status(400).json({ success: false, error: 'missing_signature' });
      }

      const stripe = new Stripe(env.STRIPE_SECRET_KEY);
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body, // Buffer — express.raw keeps the exact bytes
          signature,
          env.STRIPE_WEBHOOK_SECRET,
        );
      } catch {
        return res.status(400).json({ success: false, error: 'invalid_signature' });
      }

      await handleStripeEvent(event);
      return res.status(200).json({ success: true, received: true });
    },
  );

  return router;
}

export default createStripeWebhookRouter;
