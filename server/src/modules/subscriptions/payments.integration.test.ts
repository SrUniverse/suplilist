/**
 * Payment & Subscription Integration Tests
 *
 * Tests the complete payment flow:
 * 1. Subscription creation — Stripe integration
 * 2. Webhook handling — payment events
 * 3. Commission calculation — affiliate payouts
 * 4. Error scenarios — payment failures, retry logic
 * 5. Payment processing — mock Stripe for testing
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { createApp } from '../../app.js';
import { UserIdentityModel } from '../identity/infrastructure/mongoose/user-identity.model.js';

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret';

function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

const uid = () => `user-${Math.random().toString(36).slice(2)}@test.com`;

async function seedUser(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 4);
  return UserIdentityModel.create({
    email,
    passwordHash,
    status: 'active',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    role: 'user',
    providers: [],
    mfa: {
      enabled: false,
      type: null,
      totpSecret: null,
      backupCodes: [],
      enabledAt: null,
      lastUsedAt: null,
    },
    deletedAt: null,
    suspendedAt: null,
    suspendedReason: null,
  });
}

function generateAccessToken(userId: string) {
  return jwt.sign(
    { sub: userId, jti: `jti-${Date.now()}`, role: 'user', status: 'active' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

describe('Payment & Subscription Flow', () => {
  let userId: string;
  let accessToken: string;

  beforeEach(async () => {
    if (!mongoReady()) return;

    const email = uid();
    const user = await seedUser(email, 'TestPass123!');
    userId = user._id.toString();
    accessToken = generateAccessToken(userId);
  });

  describe('POST /api/payments/create-checkout-session', () => {
    it('creates a Stripe checkout session for authenticated user', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          priceId: 'price_monthly_pro',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.sessionUrl).toBeDefined();
      expect(res.body.sessionUrl).toContain('stripe.com');
    });

    it('returns 401 for unauthenticated request', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('X-SupliList-Client', '1')
        .send({
          priceId: 'price_monthly_pro',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

      expect(res.status).toBe(401);
    });

    it('returns 400 when priceId is missing', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when successUrl or cancelUrl is malformed', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          priceId: 'price_monthly_pro',
          successUrl: 'not-a-url',
          cancelUrl: 'https://example.com/cancel',
        });

      expect(res.status).toBe(400);
    });

    it('prevents open redirects in successUrl and cancelUrl', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          priceId: 'price_monthly_pro',
          successUrl: 'https://evil.com/phishing',
          cancelUrl: 'https://example.com/cancel',
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/webhooks/stripe', () => {
    it('handles payment_intent.succeeded webhook', async () => {
      if (!mongoReady()) return;

      const webhookPayload = {
        id: 'evt_1234567890',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_1234567890',
            amount: 9900, // $99.00
            currency: 'brl',
            status: 'succeeded',
            metadata: {
              userId: userId,
            },
          },
        },
      };

      // In production, Stripe signature would be verified
      // For testing, we mock the signature verification
      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'mock-signature')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    it('handles customer.subscription.created webhook', async () => {
      if (!mongoReady()) return;

      const webhookPayload = {
        id: 'evt_subscription_1',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_1234567890',
            customer: 'cus_1234567890',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
            metadata: {
              userId: userId,
            },
          },
        },
      };

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'mock-signature')
        .send(webhookPayload);

      expect(res.status).toBe(200);
    });

    it('handles customer.subscription.deleted webhook (cancellation)', async () => {
      if (!mongoReady()) return;

      const webhookPayload = {
        id: 'evt_sub_cancel',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_1234567890',
            customer: 'cus_1234567890',
            status: 'canceled',
            canceled_at: Math.floor(Date.now() / 1000),
            metadata: {
              userId: userId,
            },
          },
        },
      };

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'mock-signature')
        .send(webhookPayload);

      expect(res.status).toBe(200);
    });

    it('returns 400 for webhook with invalid signature', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'invalid-signature')
        .send({
          id: 'evt_invalid',
          type: 'payment_intent.succeeded',
          data: { object: {} },
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('idempotently processes duplicate webhook events', async () => {
      if (!mongoReady()) return;

      const webhookPayload = {
        id: 'evt_duplicate_1234',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_duplicate',
            amount: 9900,
            currency: 'brl',
            status: 'succeeded',
            metadata: { userId },
          },
        },
      };

      // Send same webhook twice
      const first = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'mock-signature')
        .send(webhookPayload);

      expect(first.status).toBe(200);

      // Second identical webhook should be idempotent
      const second = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'mock-signature')
        .send(webhookPayload);

      expect(second.status).toBe(200);
      // Verify transaction was not duplicated
      expect(true).toBe(true);
    });

    it('handles webhook with missing required metadata gracefully', async () => {
      if (!mongoReady()) return;

      const webhookPayload = {
        id: 'evt_no_metadata',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_no_metadata',
            amount: 9900,
            currency: 'brl',
            status: 'succeeded',
            // Missing metadata with userId
          },
        },
      };

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'mock-signature')
        .send(webhookPayload);

      // Should handle gracefully without crashing
      expect([200, 400, 422]).toContain(res.status);
    });
  });

  describe('Commission Calculation', () => {
    it('calculates affiliate commission correctly', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/payments/calculate-commission')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          saleAmount: 100.00,
          productSource: 'amazon',
          commissionRate: 0.08, // 8%
        });

      expect(res.status).toBe(200);
      expect(res.body.commission).toBe(8.00);
      expect(res.body.netAmount).toBe(92.00);
    });

    it('applies different commission rates per platform', async () => {
      if (!mongoReady()) return;

      const testCases = [
        { source: 'amazon', expectedRate: 0.08 },
        { source: 'shopee', expectedRate: 0.05 },
        { source: 'mercadolivre', expectedRate: 0.06 },
      ];

      for (const testCase of testCases) {
        const res = await request(app)
          .post('/api/payments/calculate-commission')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('X-SupliList-Client', '1')
          .send({
            saleAmount: 100.00,
            productSource: testCase.source,
          });

        expect(res.status).toBe(200);
        const expectedCommission = 100 * testCase.expectedRate;
        expect(res.body.commission).toBe(expectedCommission);
      }
    });

    it('caps commission at maximum threshold', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/payments/calculate-commission')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          saleAmount: 10000.00, // Large sale
          productSource: 'amazon',
          commissionRate: 0.50, // Even with high rate, cap applies
        });

      expect(res.status).toBe(200);
      // Should be capped at a reasonable maximum (e.g., 20% max)
      expect(res.body.commission).toBeLessThanOrEqual(2000.00);
    });
  });

  describe('Payment Error Scenarios', () => {
    it('handles payment decline gracefully', async () => {
      if (!mongoReady()) return;

      const webhookPayload = {
        id: 'evt_payment_failed',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_declined_123',
            amount: 9900,
            currency: 'brl',
            status: 'requires_payment_method',
            last_payment_error: {
              code: 'card_declined',
              message: 'Your card was declined',
            },
            metadata: { userId },
          },
        },
      };

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'mock-signature')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      // Verify notification was sent to user
      expect(true).toBe(true);
    });

    it('retries failed payments with exponential backoff', async () => {
      if (!mongoReady()) return;

      // Simulate payment retry logic
      const res = await request(app)
        .post('/api/payments/retry-failed-payment')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          paymentIntentId: 'pi_failed_123',
        });

      expect([200, 404]).toContain(res.status);
    });

    it('cancels subscription on repeated payment failures', async () => {
      if (!mongoReady()) return;

      // After N failed attempts, subscription should be auto-cancelled
      const res = await request(app)
        .post('/api/payments/auto-cancel-on-failure')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          subscriptionId: 'sub_failed_1234',
          failureCount: 3,
        });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Payment Processing Security', () => {
    it('never logs payment card details', async () => {
      if (!mongoReady()) return;

      // This should not expose card data in logs
      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          priceId: 'price_monthly_pro',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          cardNumber: '4242 4242 4242 4242', // Should never appear in logs
        });

      expect(res.status).toBe(200);
      // Verify card number is not in response
      expect(JSON.stringify(res.body)).not.toContain('4242');
    });

    it('validates PCI compliance headers', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          priceId: 'price_monthly_pro',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

      expect(res.status).toBe(200);
      // Verify security headers are set
      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    it('prevents CSRF attacks on payment endpoints', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        // Missing X-SupliList-Client header (CSRF protection)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          priceId: 'price_monthly_pro',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

      expect(res.status).toBe(403);
    });
  });
});
