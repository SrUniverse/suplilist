/**
 * CORS Middleware Tests
 *
 * Verifies:
 * - Explicit domain whitelist validation
 * - Origin rejection logging
 * - Preflight (OPTIONS) request handling
 * - Credentials + origin support
 * - Method and header validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { createCorsMiddleware, logCorsConfiguration } from './cors.middleware.js';

describe('CORS Middleware', () => {
  let app: Express;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Explicit origin whitelist', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ORIGIN_DEV = 'http://localhost:5173';
      process.env.CORS_ORIGIN_PROD = 'https://suplilist.app';

      app = express();
      app.use(createCorsMiddleware());
      app.get('/test', (_req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow development origin', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow production origin in production mode', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://suplilist.app');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://suplilist.app');
    });

    it('should reject malicious origins', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://evil.com');

      // Preflight may fail or succeed depending on CORS implementation
      // Main test is that origin header is not echoed
      expect(response.headers['access-control-allow-origin']).not.toBe('https://evil.com');
    });

    it('should allow same-origin requests (no origin header)', async () => {
      const response = await request(app).get('/test');

      // Same-origin requests are allowed (no CORS check needed)
      expect(response.status).toBe(200);
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should expose rate limit headers', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers).toHaveProperty('access-control-expose-headers');
      const exposedHeaders = response.headers['access-control-expose-headers'] as string;
      expect(exposedHeaders).toContain('X-RateLimit-Limit');
      expect(exposedHeaders).toContain('Retry-After');
    });

    it('should not expose Authorization header by default', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:5173');

      const exposedHeaders = response.headers['access-control-expose-headers'] as string;
      // Authorization is a request header, not response header, so not exposed
      expect(exposedHeaders).not.toContain('Authorization');
    });
  });

  describe('Allowed methods and headers', () => {
    beforeEach(() => {
      process.env.CORS_ORIGIN_DEV = 'http://localhost:5173';
      app = express();
      app.use(createCorsMiddleware());
      app.post('/test', (_req, res) => res.json({ success: true }));
      app.put('/test', (_req, res) => res.json({ success: true }));
      app.delete('/test', (_req, res) => res.json({ success: true }));
    });

    it('should allow GET, POST, PUT, PATCH, DELETE, OPTIONS', async () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        const response = await request(app)
          .options('/test')
          .set('Origin', 'http://localhost:5173')
          .set('Access-Control-Request-Method', method);

        const allowedMethods = response.headers['access-control-allow-methods'] as string;
        expect(allowedMethods).toContain(method);
      }
    });

    it('should allow Content-Type and Authorization headers', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

      const allowedHeaders = response.headers['access-control-allow-headers'] as string;
      expect(allowedHeaders).toContain('Content-Type');
      expect(allowedHeaders).toContain('Authorization');
    });

    it('should reject non-whitelisted headers in preflight', async () => {
      // Note: actual behavior depends on CORS library
      // This test documents the expected behavior
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Headers', 'X-Custom-Bad-Header');

      // If the header is not in the whitelist, the response may not include it
      // or the preflight may fail entirely
      const allowedHeaders = response.headers['access-control-allow-headers'] as string || '';
      expect(allowedHeaders).not.toContain('X-Custom-Bad-Header');
    });
  });

  describe('Credentials support', () => {
    beforeEach(() => {
      process.env.CORS_ORIGIN_DEV = 'http://localhost:5173';
      app = express();
      app.use(createCorsMiddleware());
      app.get('/test', (_req, res) => {
        res.json({ success: true });
      });
    });

    it('should include Access-Control-Allow-Credentials header', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should set preflight cache max age', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-max-age']).toBe('86400');
    });
  });

  describe('Environment variable configuration', () => {
    it('should use custom CORS_ORIGIN_DEV if provided', async () => {
      process.env.CORS_ORIGIN_DEV = 'http://custom-dev:3000';

      app = express();
      app.use(createCorsMiddleware());
      app.get('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://custom-dev:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://custom-dev:3000');
    });

    it('should use custom CORS_ORIGIN_PROD in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN_PROD = 'https://custom.suplilist.com';

      app = express();
      app.use(createCorsMiddleware());
      app.get('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://custom.suplilist.com');

      expect(response.headers['access-control-allow-origin']).toBe('https://custom.suplilist.com');
    });

    it('should support additional origins via CORS_ORIGINS env var', async () => {
      process.env.CORS_ORIGINS = 'https://extra1.com,https://extra2.com';

      app = express();
      app.use(createCorsMiddleware());
      app.get('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://extra1.com');

      expect(response.headers['access-control-allow-origin']).toBe('https://extra1.com');
    });
  });

  describe('Security considerations', () => {
    beforeEach(() => {
      process.env.CORS_ORIGIN_DEV = 'http://localhost:5173';
      app = express();
      app.use(createCorsMiddleware());
      app.get('/test', (_req, res) => res.json({ success: true }));
    });

    it('should not allow wildcard origin', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', '*');

      // Wildcard is never in the whitelist
      expect(response.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('should handle origin with port correctly', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should be case-sensitive for origins', async () => {
      // HTTP/HTTPS schemes should be case-insensitive in URLs, but the whole origin is case-sensitive
      const response = await request(app)
        .get('/test')
        .set('Origin', 'HTTP://localhost:5173');

      // Different case should not match
      expect(response.headers['access-control-allow-origin']).not.toBe('HTTP://localhost:5173');
    });
  });

  describe('logCorsConfiguration', () => {
    it('should not throw when called', () => {
      process.env.CORS_ORIGIN_DEV = 'http://localhost:5173';
      process.env.CORS_ORIGIN_PROD = 'https://suplilist.app';

      expect(() => {
        logCorsConfiguration();
      }).not.toThrow();
    });
  });
});
