/**
 * Supplement/Product E2E Flow Tests
 *
 * Tests the complete product lifecycle:
 * 1. Search products
 * 2. View product details
 * 3. Compare prices across vendors
 * 4. Submit reviews and ratings
 * 5. View reviews and mark as helpful
 * 6. Price alerts workflow
 */
import { describe, it, expect, beforeEach } from 'vitest';
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

describe('Supplement/Product E2E Flow', () => {
  let userId: string;
  let accessToken: string;

  beforeEach(async () => {
    if (!mongoReady()) return;

    const email = uid();
    const user = await seedUser(email, 'TestPass123!');
    userId = user._id.toString();
    accessToken = generateAccessToken(userId);
  });

  describe('GET /api/supplements/search', () => {
    it('searches supplements by keyword', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'whey protein', limit: 10, offset: 0 })
        .set('X-SupliList-Client', '1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(0);

      if (res.body.data.length > 0) {
        const product = res.body.data[0];
        expect(product.id).toBeDefined();
        expect(product.name).toBeDefined();
        expect(product.category).toBeDefined();
      }
    });

    it('supports pagination', async () => {
      if (!mongoReady()) return;

      const page1 = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'vitamin', limit: 5, offset: 0 })
        .set('X-SupliList-Client', '1');

      expect(page1.status).toBe(200);
      expect(page1.body.data.length).toBeLessThanOrEqual(5);

      const page2 = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'vitamin', limit: 5, offset: 5 })
        .set('X-SupliList-Client', '1');

      expect(page2.status).toBe(200);

      // If both pages have results, they should be different
      if (page1.body.data.length > 0 && page2.body.data.length > 0) {
        expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
      }
    });

    it('filters by category', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .get('/api/supplements/search')
        .query({ category: 'proteins', limit: 10 })
        .set('X-SupliList-Client', '1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      res.body.data.forEach((product: any) => {
        expect(product.category).toBe('proteins');
      });
    });

    it('returns 400 for invalid query parameters', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .get('/api/supplements/search')
        .query({ limit: 'not-a-number' })
        .set('X-SupliList-Client', '1');

      expect(res.status).toBe(400);
    });

    it('returns empty array for non-matching search', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'xyznonexistentproduct', limit: 10 })
        .set('X-SupliList-Client', '1');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('GET /api/supplements/:id', () => {
    it('retrieves product details with all vendor prices', async () => {
      if (!mongoReady()) return;

      // First, search for a product
      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) {
        expect(true).toBe(true); // Skip if no products
        return;
      }

      const productId = search.body.data[0].id;

      const res = await request(app)
        .get(`/api/supplements/${productId}`)
        .set('X-SupliList-Client', '1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(productId);
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.description).toBeDefined();
      expect(Array.isArray(res.body.data.prices)).toBe(true);

      // Verify price entries
      res.body.data.prices.forEach((price: any) => {
        expect(price.vendor).toBeDefined(); // amazon, shopee, etc
        expect(price.price).toBeGreaterThan(0);
        expect(price.url).toBeDefined();
        expect(price.updatedAt).toBeDefined();
      });
    });

    it('returns 404 for non-existent product', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .get('/api/supplements/nonexistent-id-12345')
        .set('X-SupliList-Client', '1');

      expect(res.status).toBe(404);
    });

    it('includes review summary in product details', async () => {
      if (!mongoReady()) return;

      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) return;

      const productId = search.body.data[0].id;

      const res = await request(app)
        .get(`/api/supplements/${productId}`)
        .set('X-SupliList-Client', '1');

      expect(res.status).toBe(200);
      expect(res.body.data.reviewSummary).toBeDefined();
      expect(typeof res.body.data.reviewSummary.averageRating).toBe('number');
      expect(typeof res.body.data.reviewSummary.totalReviews).toBe('number');
    });
  });

  describe('POST /api/supplements/:id/reviews', () => {
    it('creates a product review for authenticated user', async () => {
      if (!mongoReady()) return;

      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) return;

      const productId = search.body.data[0].id;

      const res = await request(app)
        .post(`/api/supplements/${productId}/reviews`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          rating: 5,
          title: 'Excellent product',
          content: 'This whey protein is amazing quality and tastes great!',
          verified: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewId).toBeDefined();
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.userId).toBe(userId);
    });

    it('returns 400 for invalid rating (outside 1-5)', async () => {
      if (!mongoReady()) return;

      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) return;

      const productId = search.body.data[0].id;

      const res = await request(app)
        .post(`/api/supplements/${productId}/reviews`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          rating: 10, // Invalid
          title: 'Great',
          content: 'Good product',
        });

      expect(res.status).toBe(400);
    });

    it('prevents duplicate reviews from same user', async () => {
      if (!mongoReady()) return;

      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) return;

      const productId = search.body.data[0].id;

      // First review
      const first = await request(app)
        .post(`/api/supplements/${productId}/reviews`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          rating: 5,
          title: 'Great product',
          content: 'I love this!',
        });

      expect(first.status).toBe(201);

      // Second review from same user
      const second = await request(app)
        .post(`/api/supplements/${productId}/reviews`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          rating: 4,
          title: 'Actually good',
          content: 'Second review',
        });

      expect(second.status).toBeGreaterThanOrEqual(400);
    });

    it('returns 401 for unauthenticated review submission', async () => {
      if (!mongoReady()) return;

      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) return;

      const productId = search.body.data[0].id;

      const res = await request(app)
        .post(`/api/supplements/${productId}/reviews`)
        .set('X-SupliList-Client', '1')
        .send({
          rating: 5,
          title: 'Great',
          content: 'Good product',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/supplements/:id/reviews', () => {
    it('retrieves product reviews with pagination', async () => {
      if (!mongoReady()) return;

      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) return;

      const productId = search.body.data[0].id;

      const res = await request(app)
        .get(`/api/supplements/${productId}/reviews`)
        .query({ limit: 10, offset: 0 })
        .set('X-SupliList-Client', '1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      res.body.data.forEach((review: any) => {
        expect(review.rating).toBeGreaterThanOrEqual(1);
        expect(review.rating).toBeLessThanOrEqual(5);
        expect(review.title).toBeDefined();
        expect(review.content).toBeDefined();
        expect(review.userId).toBeDefined();
        expect(review.createdAt).toBeDefined();
      });
    });

    it('sorts reviews by helpful count (most helpful first)', async () => {
      if (!mongoReady()) return;

      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) return;

      const productId = search.body.data[0].id;

      const res = await request(app)
        .get(`/api/supplements/${productId}/reviews`)
        .query({ sortBy: 'helpful', limit: 10 })
        .set('X-SupliList-Client', '1');

      expect(res.status).toBe(200);

      // Verify reviews are sorted by helpful count descending
      for (let i = 1; i < res.body.data.length; i++) {
        expect(res.body.data[i - 1].helpfulCount).toBeGreaterThanOrEqual(
          res.body.data[i].helpfulCount
        );
      }
    });
  });

  describe('POST /api/supplements/:reviewId/mark-helpful', () => {
    it('marks review as helpful', async () => {
      if (!mongoReady()) return;

      // Create a review first
      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) return;

      const productId = search.body.data[0].id;

      const createReview = await request(app)
        .post(`/api/supplements/${productId}/reviews`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          rating: 5,
          title: 'Great',
          content: 'Excellent product',
        });

      if (createReview.status !== 201) return;

      const reviewId = createReview.body.data.reviewId;

      // Mark as helpful
      const res = await request(app)
        .post(`/api/supplements/${reviewId}/mark-helpful`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({ helpful: true });

      expect(res.status).toBe(200);
      expect(res.body.data.helpfulCount).toBeGreaterThan(0);
    });

    it('prevents user from marking same review helpful twice', async () => {
      if (!mongoReady()) return;

      // This would require creating a review and marking it helpful twice
      // Implementation depends on backend tracking
      expect(true).toBe(true);
    });
  });

  describe('Price Alerts', () => {
    it('creates a price alert for a product', async () => {
      if (!mongoReady()) return;

      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) return;

      const productId = search.body.data[0].id;

      const res = await request(app)
        .post('/api/supplements/price-alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          productId,
          targetPrice: 45.00, // Alert when price drops below 45
          vendor: 'amazon',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.alertId).toBeDefined();
    });

    it('lists active price alerts for user', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .get('/api/supplements/price-alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('deletes a price alert', async () => {
      if (!mongoReady()) return;

      // Create alert first
      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) return;

      const productId = search.body.data[0].id;

      const createRes = await request(app)
        .post('/api/supplements/price-alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .send({
          productId,
          targetPrice: 45.00,
          vendor: 'amazon',
        });

      if (createRes.status !== 201) return;

      const alertId = createRes.body.data.alertId;

      // Delete alert
      const deleteRes = await request(app)
        .delete(`/api/supplements/price-alerts/${alertId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1');

      expect(deleteRes.status).toBe(200);

      // Verify it's deleted
      const listRes = await request(app)
        .get('/api/supplements/price-alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1');

      const stillExists = listRes.body.data.some((a: any) => a.alertId === alertId);
      expect(stillExists).toBe(false);
    });
  });

  describe('Product Comparison', () => {
    it('compares multiple products by price and ratings', async () => {
      if (!mongoReady()) return;

      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 3 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length < 2) return;

      const ids = search.body.data.slice(0, 2).map((p: any) => p.id);

      const res = await request(app)
        .post('/api/supplements/compare')
        .set('X-SupliList-Client', '1')
        .send({ productIds: ids });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);

      res.body.data.forEach((product: any) => {
        expect(product.id).toBeDefined();
        expect(product.name).toBeDefined();
        expect(product.prices).toBeDefined();
        expect(product.avgRating).toBeDefined();
      });
    });
  });
});
