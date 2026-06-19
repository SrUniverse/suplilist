import Stripe from 'stripe';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  UserIdentityModel,
  UserTier,
} from '../identity/infrastructure/mongoose/user-identity.model.js';
import { env } from '../../shared/config/env.config.js';

const CheckoutBodySchema = z.union([
  z.object({ priceId: z.string().min(1) }),
  z.object({ tier: z.enum(['pro', 'elite']) }),
]);

function tierToPriceId(tier: 'pro' | 'elite'): string | null {
  if (tier === 'pro') return env.STRIPE_PRO_PRICE_ID ?? null;
  return env.STRIPE_ELITE_PRICE_ID ?? null;
}

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

function buildAllowedPrices(): Map<string, UserTier> {
  const map = new Map<string, UserTier>();
  if (env.STRIPE_PRO_PRICE_ID) map.set(env.STRIPE_PRO_PRICE_ID, 'pro');
  if (env.STRIPE_ELITE_PRICE_ID) map.set(env.STRIPE_ELITE_PRICE_ID, 'elite');
  return map;
}

export function initializeSubscriptionsModule(): Router {
  const router = Router();
  router.use(requireAuth);

  // POST /api/subscriptions/checkout
  // Body: { priceId: string }
  // Returns: { url: string } — Stripe Hosted Checkout page URL
  router.post('/checkout', async (req: Request, res: Response) => {
    const parsed = CheckoutBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        details: parsed.error.errors,
      });
    }

    let priceId: string;
    if ('tier' in parsed.data) {
      const mapped = tierToPriceId(parsed.data.tier);
      if (!mapped) {
        return res.status(503).json({
          success: false,
          error: 'plan_not_configured',
          message: `No Stripe price configured for tier "${parsed.data.tier}".`,
        });
      }
      priceId = mapped;
    } else {
      priceId = parsed.data.priceId;
      const allowedPrices = buildAllowedPrices();

      // Whitelist check — block if env vars not set (prevents arbitrary price IDs in prod)
      if (allowedPrices.size === 0) {
        return res.status(503).json({
          success: false,
          error: 'plan_not_configured',
          message: 'Subscription plans are not configured. Please try again later.',
        });
      }
      if (!allowedPrices.has(priceId)) {
        return res.status(400).json({
          success: false,
          error: 'invalid_price_id',
          message: 'The provided price ID is not a valid subscription plan.',
        });
      }
    }

    const userId = req.user!.id;
    const stripe = getStripe();

    const identity = await UserIdentityModel
      .findById(userId)
      .select('email stripeCustomerId')
      .lean();

    if (!identity) {
      return res.status(401).json({ success: false, error: 'user_not_found' });
    }

    // Create Stripe Customer on first checkout; reuse on subsequent ones
    let stripeCustomerId = identity.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: identity.email,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await UserIdentityModel.findByIdAndUpdate(userId, { stripeCustomerId });
    }

    const successUrl =
      env.STRIPE_SUCCESS_URL ??
      `${env.CORS_ORIGIN_PROD}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      env.STRIPE_CANCEL_URL ?? `${env.CORS_ORIGIN_PROD}/subscription/cancel`;

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return res.status(200).json({ success: true, data: { url: session.url } });
  });

  return router;
}

export default initializeSubscriptionsModule;
