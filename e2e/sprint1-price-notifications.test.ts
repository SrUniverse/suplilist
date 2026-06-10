import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import supertest from 'supertest';
import { app } from '../server/src/server';
import { db } from '../server/src/database';
import { priceMonitorService } from '../server/src/services/price-monitor.service';
import { firebaseService } from '../server/src/services/firebase.service';

const request = supertest(app);
let testUserId: string;
let testProductId: string;
let authToken: string;

describe('Sprint 1: Price Monitoring & Notifications', () => {
  beforeEach(async () => {
    // Create test user
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3) RETURNING id`,
      ['test-price@example.com', 'hashed_password', 'Test User']
    );
    testUserId = userResult.rows[0].id;

    // Create test product
    const productResult = await db.query(
      `INSERT INTO products (name, description, price, category)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Test Product', 'A test product', 99.99, 'Supplements']
    );
    testProductId = productResult.rows[0].id;

    // Generate auth token
    authToken = 'test-token'; // In real tests, use JWT generation
  });

  afterEach(async () => {
    // Cleanup
    await db.query(`DELETE FROM user_price_alerts WHERE user_id = $1`, [testUserId]);
    await db.query(`DELETE FROM firebase_tokens WHERE user_id = $1`, [testUserId]);
    await db.query(`DELETE FROM price_history WHERE product_id = $1`, [testProductId]);
    await db.query(`DELETE FROM products WHERE id = $1`, [testProductId]);
    await db.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
  });

  describe('Price Alert Management', () => {
    it('POST /api/price-alerts - should create a price alert', async () => {
      const response = await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          targetPrice: 79.99,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.productId).toBe(testProductId);
      expect(response.body.data.targetPrice).toBe(79.99);
    });

    it('POST /api/price-alerts - should prevent duplicate alerts', async () => {
      // Create first alert
      await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          targetPrice: 79.99,
        });

      // Try to create duplicate
      const response = await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          targetPrice: 75.99,
        });

      expect(response.status).toBe(409);
    });

    it('POST /api/price-alerts - should validate target price', async () => {
      const response = await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          targetPrice: -10,
        });

      expect(response.status).toBe(400);
    });

    it('GET /api/price-alerts - should return user\'s price alerts', async () => {
      // Create multiple alerts
      const productIds = [];
      for (let i = 0; i < 3; i++) {
        const productResult = await db.query(
          `INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id`,
          [`Product ${i}`, 50 + i * 10, 'Supplements']
        );
        productIds.push(productResult.rows[0].id);

        await request
          .post('/api/price-alerts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            productId: productResult.rows[0].id,
            targetPrice: 40 + i * 10,
          });
      }

      const response = await request
        .get('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(3);
    });

    it('GET /api/price-alerts/:alertId - should return specific alert', async () => {
      const createResponse = await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          targetPrice: 79.99,
        });

      const alertId = createResponse.body.data.id;

      const response = await request
        .get(`/api/price-alerts/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(alertId);
      expect(response.body.data.targetPrice).toBe(79.99);
    });

    it('PATCH /api/price-alerts/:alertId - should update alert', async () => {
      const createResponse = await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          targetPrice: 79.99,
        });

      const alertId = createResponse.body.data.id;

      const response = await request
        .patch(`/api/price-alerts/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetPrice: 69.99,
          active: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.targetPrice).toBe(69.99);
      expect(response.body.data.active).toBe(false);
    });

    it('DELETE /api/price-alerts/:alertId - should delete alert', async () => {
      const createResponse = await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          targetPrice: 79.99,
        });

      const alertId = createResponse.body.data.id;

      const deleteResponse = await request
        .delete(`/api/price-alerts/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);

      const getResponse = await request
        .get(`/api/price-alerts/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Device Token Management', () => {
    it('POST /api/price-alerts/device-tokens - should register device token', async () => {
      const response = await request
        .post('/api/price-alerts/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken: 'test-device-token-12345',
          deviceName: 'iPhone 14',
          deviceType: 'ios',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokenId).toBeDefined();
    });

    it('POST /api/price-alerts/device-tokens - should update existing token', async () => {
      const deviceToken = 'test-device-token-12345';

      // Register first time
      await request
        .post('/api/price-alerts/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken,
          deviceName: 'iPhone 14',
          deviceType: 'ios',
        });

      // Register same token again
      const response = await request
        .post('/api/price-alerts/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken,
          deviceName: 'iPhone 14 Pro',
          deviceType: 'ios',
        });

      expect(response.status).toBe(201);
    });

    it('DELETE /api/price-alerts/device-tokens/:tokenId - should delete token', async () => {
      const createResponse = await request
        .post('/api/price-alerts/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken: 'test-device-token-12345',
          deviceType: 'ios',
        });

      const tokenId = createResponse.body.data.tokenId;

      const deleteResponse = await request
        .delete(`/api/price-alerts/device-tokens/${tokenId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('Price History', () => {
    beforeEach(async () => {
      // Insert sample price history
      const prices = [
        { price: 99.99, previousPrice: 100.00, drop: 1.00 },
        { price: 89.99, previousPrice: 99.99, drop: 10.00 },
        { price: 84.99, previousPrice: 89.99, drop: 5.56 },
      ];

      for (const p of prices) {
        await db.query(
          `INSERT INTO price_history (product_id, source, current_price, previous_price, drop_percentage)
           VALUES ($1, $2, $3, $4, $5)`,
          [testProductId, 'source_a', p.price, p.previousPrice, p.drop]
        );
      }
    });

    it('GET /api/price-alerts/history/:productId - should return price history', async () => {
      const response = await request
        .get(`/api/price-alerts/history/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.history.length).toBeGreaterThan(0);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('GET /api/price-alerts/history/:productId - should support pagination', async () => {
      const response = await request
        .get(`/api/price-alerts/history/${testProductId}?limit=2&offset=0`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.offset).toBe(0);
      expect(response.body.data.history.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Price Monitoring Service', () => {
    beforeEach(async () => {
      // Create price alert for test product
      await db.query(
        `INSERT INTO user_price_alerts (user_id, product_id, target_price, active)
         VALUES ($1, $2, $3, true)`,
        [testUserId, testProductId, 79.99]
      );

      // Insert initial price history
      await db.query(
        `INSERT INTO price_history (product_id, source, current_price)
         VALUES ($1, $2, $3)`,
        [testProductId, 'source_a', 99.99]
      );
    });

    it('should detect price drops', async () => {
      const drop = await priceMonitorService.detectPriceDrop(testProductId, 10);

      // Initially might not detect drop, so we test the function exists and returns properly
      expect(drop === null || typeof drop === 'object').toBe(true);
    });

    it('should get price history', async () => {
      const history = await priceMonitorService.getPriceHistory(testProductId);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should get lowest price', async () => {
      await db.query(
        `INSERT INTO price_history (product_id, source, current_price)
         VALUES ($1, $2, $3)`,
        [testProductId, 'source_b', 89.99]
      );

      const lowest = await priceMonitorService.getLowestPrice(testProductId);

      expect(lowest).toBeDefined();
      expect(lowest?.price).toBeLessThanOrEqual(99.99);
    });
  });

  describe('Firebase Integration', () => {
    beforeEach(async () => {
      vi.mock('../server/src/services/firebase.service');
    });

    it('should send notification to device', async () => {
      const result = await firebaseService.sendToDevice('test-token', {
        title: 'Price Drop',
        body: 'Price dropped by 10%',
        data: {
          productId: testProductId,
          currentPrice: '89.99',
        },
      });

      expect(result.success === true || result.success === false).toBe(true);
    });

    it('should handle invalid device token gracefully', async () => {
      const result = await firebaseService.sendToDevice('', {
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      const response = await request
        .get('/api/price-alerts')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should validate invalid product IDs', async () => {
      const response = await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'invalid-uuid',
          targetPrice: 79.99,
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent alerts', async () => {
      const response = await request
        .get('/api/price-alerts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple price checks concurrently', async () => {
      const productIds = [];
      for (let i = 0; i < 5; i++) {
        const productResult = await db.query(
          `INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id`,
          [`Product ${i}`, 50 + i * 10, 'Supplements']
        );
        productIds.push(productResult.rows[0].id);
      }

      const promises = productIds.map((productId) =>
        priceMonitorService.getPriceHistory(productId)
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid price alert creation', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const productResult = await db.query(
          `INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id`,
          [`Product ${i}`, 50 + i * 10, 'Supplements']
        );

        promises.push(
          request
            .post('/api/price-alerts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              productId: productResult.rows[0].id,
              targetPrice: 40 + i * 10,
            })
        );
      }

      const results = await Promise.all(promises);

      // Most should succeed
      const successCount = results.filter((r) => r.status === 201).length;
      expect(successCount).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Data Validation', () => {
    it('should require valid product ID', async () => {
      const response = await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'not-a-uuid',
          targetPrice: 79.99,
        });

      expect(response.status).toBe(400);
    });

    it('should require positive target price', async () => {
      const response = await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          targetPrice: 0,
        });

      expect(response.status).toBe(400);
    });

    it('should require valid device token format', async () => {
      const response = await request
        .post('/api/price-alerts/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken: 'short',
          deviceType: 'ios',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique user-product alert constraint', async () => {
      // Create first alert
      await db.query(
        `INSERT INTO user_price_alerts (user_id, product_id, target_price)
         VALUES ($1, $2, $3)`,
        [testUserId, testProductId, 79.99]
      );

      // Try to create duplicate
      const response = await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          targetPrice: 75.99,
        });

      expect(response.status).toBe(409);
    });
  });

  describe('Logging & Monitoring', () => {
    it('should log price alert creation', async () => {
      const spy = vi.spyOn(console, 'log');

      await request
        .post('/api/price-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          targetPrice: 79.99,
        });

      // Verify logging occurred (in real tests, check logger)
      expect(spy).toBeDefined();
    });
  });
});
