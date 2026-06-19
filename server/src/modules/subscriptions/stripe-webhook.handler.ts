/**
 * Stripe webhook event handler — pure business logic, transport-agnostic.
 *
 * Used by two entry points:
 *   - server/src/modules/subscriptions/stripe-webhook.route.ts (Express, local dev)
 *   - api/webhooks/stripe.ts (Vercel serverless function, production)
 *
 * Both entry points are responsible for signature verification BEFORE calling
 * handleStripeEvent(). This module assumes the event is authentic.
 */
import Stripe from 'stripe';
import {
  UserIdentityModel,
  UserTier,
  StripeSubscriptionStatus,
} from '../identity/infrastructure/mongoose/user-identity.model.js';
import { env } from '../../shared/config/env.config.js';
import { redisClient } from '../../shared/infrastructure/redis/redis.client.js';

const PROCESSED_EVENT_TTL = 86400; // 24h in seconds

async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  try {
    const key = `stripe:event:${eventId}`;
    const result = await redisClient.set(key, '1', 'EX', PROCESSED_EVENT_TTL, 'NX');
    return result === null; // null = key existed = already processed
  } catch {
    return false; // on Redis error, allow processing (idempotent writes are safe)
  }
}

/** Map a Stripe price ID to an internal tier using configured env vars. */
export function priceIdToTier(priceId: string | undefined | null): UserTier | null {
  if (!priceId) return null;
  if (env.STRIPE_PRO_PRICE_ID && priceId === env.STRIPE_PRO_PRICE_ID) return 'pro';
  if (env.STRIPE_ELITE_PRICE_ID && priceId === env.STRIPE_ELITE_PRICE_ID) return 'elite';
  return null;
}

/** Normalize a Stripe subscription status to the values our schema accepts. */
function normalizeStatus(status: Stripe.Subscription.Status): StripeSubscriptionStatus {
  switch (status) {
    case 'active':
    case 'past_due':
    case 'canceled':
    case 'trialing':
    case 'incomplete':
    case 'incomplete_expired':
      return status;
    // unpaid / paused → treat as past_due so access logic can decide
    default:
      return 'past_due';
  }
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

async function applySubscriptionState(subscription: Stripe.Subscription): Promise<void> {
  const customerId = getCustomerId(subscription.customer);
  if (!customerId) return;

  const status = normalizeStatus(subscription.status);
  const priceId = subscription.items.data[0]?.price?.id;
  const mappedTier = priceIdToTier(priceId);

  // Tier is only granted while the subscription is in a paying/trial state.
  const hasAccess = status === 'active' || status === 'trialing' || status === 'past_due';
  const tier: UserTier = hasAccess && mappedTier ? mappedTier : 'free';

  const periodEnd = subscription.items.data[0]?.current_period_end
    ?? (subscription as unknown as { current_period_end?: number }).current_period_end;

  await UserIdentityModel.findOneAndUpdate(
    { stripeCustomerId: customerId },
    {
      tier,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    },
  );
}

/**
 * Process a verified Stripe event. Unknown event types are ignored (200 OK
 * semantics — Stripe requires acknowledgement of events we don't care about).
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  if (await isEventAlreadyProcessed(event.id)) return;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') return;

      const customerId = getCustomerId(session.customer);
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
      if (!customerId || !subscriptionId) return;

      // Fetch the subscription for authoritative price/status/period data.
      if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
      const stripe = new Stripe(env.STRIPE_SECRET_KEY);
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await applySubscriptionState(subscription);
      return;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      await applySubscriptionState(event.data.object as Stripe.Subscription);
      return;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getCustomerId(subscription.customer);
      if (!customerId) return;
      await UserIdentityModel.findOneAndUpdate(
        { stripeCustomerId: customerId },
        {
          tier: 'free',
          subscriptionStatus: 'canceled',
          currentPeriodEnd: null,
        },
      );
      return;
    }

    default:
      // Acknowledged but ignored.
      return;
  }
}
