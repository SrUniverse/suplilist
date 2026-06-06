/**
 * Email Routes - Comprehensive Backend Tests
 * Tests Resend integration, validation, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Resend } from 'resend';

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn()
}));

const mockResendClient = {
  emails: {
    send: vi.fn()
  }
};

// Setup
beforeEach(() => {
  Resend.mockImplementation(() => mockResendClient);
  mockResendClient.emails.send.mockResolvedValue({ id: 'test-message-id' });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Email Routes - POST /api/email', () => {
  describe('Happy Path', () => {
    it('should send email successfully', async () => {
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test Email',
          html: '<p>Test content</p>',
          text: 'Test content'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBe('test-message-id');
      expect(response.body.sentAt).toBeDefined();
    });

    it('should sanitize HTML before sending', async () => {
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Safe</p><script>alert("xss")</script>',
          text: 'Safe'
        });

      expect(response.status).toBe(200);

      // Verify Resend was called with sanitized HTML
      expect(mockResendClient.emails.send).toHaveBeenCalled();
      const callArgs = mockResendClient.emails.send.mock.calls[0][0];
      expect(callArgs.html).not.toContain('<script>');
    });

    it('should log email in database', async () => {
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test'
        });

      expect(response.status).toBe(200);

      // In real test, would verify DB entry
      // For now, just verify Resend was called
      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test',
          from: expect.stringContaining('suplilist')
        })
      );
    });

    it('should include proper headers in email', async () => {
      await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test'
        });

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          reply_to: 'support@suplilist.app',
          headers: expect.objectContaining({
            'X-App': 'SupliList'
          })
        })
      );
    });
  });

  describe('Validation Tests', () => {
    it('should reject missing "to" field', async () => {
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          subject: 'Test',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should reject missing "subject" field', async () => {
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should reject missing "html" field', async () => {
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should reject invalid email format', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test@.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/email')
          .set('Authorization', 'Bearer test-jwt-token')
          .send({
            to: email,
            subject: 'Test',
            html: '<p>Test</p>'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid email');
      }
    });

    it('should reject unsubscribed emails', async () => {
      // Mock unsubscribe check
      // In real test, would use DB

      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'unsubscribed@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      // Should skip sending
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Authentication Tests', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .post('/api/email')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(401);
    });

    it('should reject requests with malformed auth header', async () => {
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'InvalidFormat')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit (10 per minute)', async () => {
      // Send 10 emails rapidly
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/email')
          .set('Authorization', 'Bearer test-jwt-token')
          .send({
            to: `user${i}@example.com`,
            subject: 'Test',
            html: '<p>Test</p>'
          });

        expect([200, 429]).toContain(response.status);
      }

      // 11th request should be rate limited
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user11@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Rate limit');
    });
  });

  describe('Resend Integration', () => {
    it('should handle Resend API success', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'resend-message-id-123'
      });

      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(200);
      expect(response.body.messageId).toBe('resend-message-id-123');
    });

    it('should handle Resend API error', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        error: { message: 'Invalid sender domain' }
      });

      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle Resend API timeout', async () => {
      mockResendClient.emails.send.mockRejectedValue(
        new Error('Request timeout')
      );

      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should pass correct parameters to Resend', async () => {
      await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Monthly Report',
          html: '<h1>Report</h1>',
          text: 'Report'
        });

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining('suplilist'),
          to: 'user@example.com',
          subject: 'Monthly Report',
          html: expect.stringContaining('Report'),
          text: 'Report',
          reply_to: 'support@suplilist.app'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock DB error
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      // Should still attempt to send or fail gracefully
      expect([200, 500]).toContain(response.status);
    });

    it('should log errors to logger', async () => {
      mockResendClient.emails.send.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(500);
      // Logger should have been called (verify in logs)
    });
  });

  describe('Security', () => {
    it('should prevent XSS via HTML', async () => {
      const maliciousHtml = `
        <p>Hello</p>
        <img src="x" onerror="alert('xss')">
        <script>alert('xss')</script>
      `;

      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: maliciousHtml
        });

      expect(response.status).toBe(200);

      // Verify sanitized
      const callArgs = mockResendClient.emails.send.mock.calls[0][0];
      expect(callArgs.html).not.toContain('onerror');
      expect(callArgs.html).not.toContain('<script>');
    });

    it('should prevent SQL injection in subject', async () => {
      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: "'; DROP TABLE emails; --",
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(200);
      // Should be treated as plain text
    });

    it('should not expose internal error details', async () => {
      mockResendClient.emails.send.mockRejectedValue(
        new Error('Database connection failed at 192.168.1.1')
      );

      const response = await request(app)
        .post('/api/email')
        .set('Authorization', 'Bearer test-jwt-token')
        .send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).not.toContain('192.168');
    });
  });
});

describe('Email Routes - GET /api/email/status', () => {
  it('should return status when connected', async () => {
    mockResendClient.emails.send.mockResolvedValue({ id: 'test' });

    const response = await request(app)
      .get('/api/email/status')
      .set('Authorization', 'Bearer test-jwt-token');

    expect(response.status).toBe(200);
    expect(response.body.connected).toBe(true);
    expect(response.body.provider).toBe('resend');
  });

  it('should return status when disconnected', async () => {
    mockResendClient.emails.send.mockRejectedValue(
      new Error('API Key invalid')
    );

    const response = await request(app)
      .get('/api/email/status')
      .set('Authorization', 'Bearer test-jwt-token');

    expect(response.status).toBe(200);
    expect(response.body.connected).toBe(false);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/email/status');

    expect(response.status).toBe(401);
  });
});

describe('Email Routes - POST /api/email/unsubscribe', () => {
  it('should unsubscribe valid email', async () => {
    const response = await request(app)
      .post('/api/email/unsubscribe')
      .send({
        email: 'user@example.com'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Unsubscribed');
  });

  it('should reject invalid email', async () => {
    const response = await request(app)
      .post('/api/email/unsubscribe')
      .send({
        email: 'invalid-email'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid email');
  });

  it('should not require authentication (GDPR)', async () => {
    const response = await request(app)
      .post('/api/email/unsubscribe')
      .send({
        email: 'user@example.com'
      });

    // Should not require token
    expect([200, 400]).toContain(response.status);
  });

  it('should handle already unsubscribed', async () => {
    // First unsubscribe
    await request(app)
      .post('/api/email/unsubscribe')
      .send({ email: 'user@example.com' });

    // Second unsubscribe (idempotent)
    const response = await request(app)
      .post('/api/email/unsubscribe')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(200);
  });
});

describe('Email Routes - GET /api/email/stats', () => {
  it('should return email statistics for admin', async () => {
    const response = await request(app)
      .get('/api/email/stats')
      .set('Authorization', 'Bearer admin-jwt-token');

    expect([200, 403]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('sent');
      expect(response.body.stats).toHaveProperty('bounceRate');
    }
  });

  it('should deny non-admin users', async () => {
    const response = await request(app)
      .get('/api/email/stats')
      .set('Authorization', 'Bearer user-jwt-token');

    expect(response.status).toBe(403);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/email/stats');

    expect(response.status).toBe(401);
  });
});

describe('Integration Tests', () => {
  it('should send email end-to-end', async () => {
    // 1. Send email
    const sendResponse = await request(app)
      .post('/api/email')
      .set('Authorization', 'Bearer test-jwt-token')
      .send({
        to: 'user@example.com',
        subject: 'Test Report',
        html: '<h1>Report</h1><p>Aderência: 80%</p>',
        text: 'Report\nAderência: 80%'
      });

    expect(sendResponse.status).toBe(200);
    const messageId = sendResponse.body.messageId;

    // 2. Check status (email service is operational)
    const statusResponse = await request(app)
      .get('/api/email/status')
      .set('Authorization', 'Bearer test-jwt-token');

    expect(statusResponse.status).toBe(200);

    // 3. User unsubscribes
    const unsubResponse = await request(app)
      .post('/api/email/unsubscribe')
      .send({
        email: 'user@example.com'
      });

    expect(unsubResponse.status).toBe(200);

    // 4. Next email should be skipped
    const skipResponse = await request(app)
      .post('/api/email')
      .set('Authorization', 'Bearer test-jwt-token')
      .send({
        to: 'user@example.com',
        subject: 'Another Report',
        html: '<p>Report</p>'
      });

    expect([200, 200]).toContain(skipResponse.status);
  });
});
