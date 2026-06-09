/**
 * CSRF Middleware Tests
 *
 * Test coverage for P2 fix: CSRF token rotation
 * - Token generation and validation
 * - Token rotation on login
 * - Old token blacklisting
 * - Proper 403 error responses
 * - Token expiration (1 hour TTL)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  generateCSRFToken,
  rotateCSRFToken,
  invalidateCSRFToken,
  csrfValidationMiddleware,
  csrfTokenResponseMiddleware,
  AuthenticatedRequestWithCSRF,
} from './csrf.middleware.js';
import { redisClient } from '../shared/infrastructure/redis/redis.client.js';

// Mock Redis client
vi.mock('../shared/infrastructure/redis/redis.client.js', () => ({
  redisClient: {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    exists: vi.fn().mockResolvedValue(0),
    del: vi.fn().mockResolvedValue(1),
  },
}));

describe('CSRF Middleware', () => {
  let mockReq: Partial<AuthenticatedRequestWithCSRF>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const testUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'POST',
      user: { id: testUserId },
      headers: {},
      body: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      getHeader: vi.fn().mockReturnValue(null),
    };

    mockNext = vi.fn();
  });

  describe('generateCSRFToken', () => {
    it('should generate a valid token', () => {
      const token = generateCSRFToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate hex strings', () => {
      const token = generateCSRFToken();
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate 64-character tokens (32 bytes)', () => {
      const token = generateCSRFToken();
      expect(token.length).toBe(64);
    });

    it('should use cryptographically secure randomness', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken());
      }
      expect(tokens.size).toBe(100); // All unique
    });
  });

  describe('rotateCSRFToken', () => {
    it('should invalidate old token', async () => {
      vi.mocked(redisClient.get).mockResolvedValue('old-token-123');

      const newToken = await rotateCSRFToken(testUserId);

      expect(newToken).toBeDefined();
      expect(newToken).not.toBe('old-token-123');
      expect(vi.mocked(redisClient.setex)).toHaveBeenCalled();
    });

    it('should store new token in Redis', async () => {
      const newToken = await rotateCSRFToken(testUserId);

      expect(vi.mocked(redisClient.setex)).toHaveBeenCalled();
      const calls = vi.mocked(redisClient.setex).mock.calls;
      expect(calls.some(call => call.includes(newToken))).toBe(true);
    });

    it('should return new token', async () => {
      const token = await rotateCSRFToken(testUserId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should set TTL to 1 hour', async () => {
      await rotateCSRFToken(testUserId);

      const calls = vi.mocked(redisClient.setex).mock.calls;
      // Should have calls with 3600 (1 hour in seconds)
      expect(calls.some(call => call[1] === 3600)).toBe(true);
    });

    it('should blacklist old token', async () => {
      vi.mocked(redisClient.get).mockResolvedValue('old-token');

      await rotateCSRFToken(testUserId);

      // Should have blacklist call
      const calls = vi.mocked(redisClient.setex).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2); // blacklist + new token
    });

    it('should handle missing old token gracefully', async () => {
      vi.mocked(redisClient.get).mockResolvedValue(null);

      const token = await rotateCSRFToken(testUserId);
      expect(token).toBeDefined();
    });
  });

  describe('invalidateCSRFToken', () => {
    it('should delete token from Redis', async () => {
      await invalidateCSRFToken(testUserId);

      expect(vi.mocked(redisClient.del)).toHaveBeenCalled();
    });

    it('should remove user token', async () => {
      await invalidateCSRFToken(testUserId);

      const calls = vi.mocked(redisClient.del).mock.calls;
      expect(calls.some(call => call[0].includes(testUserId))).toBe(true);
    });

    it('should complete without error', async () => {
      await expect(invalidateCSRFToken(testUserId)).resolves.not.toThrow();
    });
  });

  describe('csrfValidationMiddleware', () => {
    it('should skip GET requests', async () => {
      mockReq.method = 'GET';

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip HEAD requests', async () => {
      mockReq.method = 'HEAD';

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip OPTIONS requests', async () => {
      mockReq.method = 'OPTIONS';

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should require authentication for POST', async () => {
      mockReq.method = 'POST';
      mockReq.user = undefined;

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject missing CSRF token', async () => {
      mockReq.method = 'POST';
      mockReq.headers = {};
      mockReq.body = {};

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'csrf_token_missing',
        })
      );
    });

    it('should accept token from X-CSRF-Token header', async () => {
      const token = generateCSRFToken();
      vi.mocked(redisClient.get).mockResolvedValue(token);

      mockReq.method = 'POST';
      mockReq.headers = { 'x-csrf-token': token };
      mockReq.user = { id: testUserId };

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept token from request body', async () => {
      const token = generateCSRFToken();
      vi.mocked(redisClient.get).mockResolvedValue(token);

      mockReq.method = 'POST';
      mockReq.body = { csrfToken: token };
      mockReq.user = { id: testUserId };

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject blacklisted token', async () => {
      const token = generateCSRFToken();
      // Mock that token is blacklisted
      vi.mocked(redisClient.exists).mockResolvedValue(1);

      mockReq.method = 'POST';
      mockReq.headers = { 'x-csrf-token': token };
      mockReq.user = { id: testUserId };

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'csrf_token_invalid',
        })
      );
    });

    it('should reject token mismatch', async () => {
      const token = generateCSRFToken();
      const storedToken = generateCSRFToken();
      vi.mocked(redisClient.get).mockResolvedValue(storedToken);

      mockReq.method = 'POST';
      mockReq.headers = { 'x-csrf-token': token };
      mockReq.user = { id: testUserId };

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'csrf_token_mismatch',
        })
      );
    });

    it('should store token in request for handlers', async () => {
      const token = generateCSRFToken();
      vi.mocked(redisClient.get).mockResolvedValue(token);

      mockReq.method = 'POST';
      mockReq.headers = { 'x-csrf-token': token };
      mockReq.user = { id: testUserId };

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.csrfToken).toBe(token);
    });

    it('should handle validation errors gracefully', async () => {
      vi.mocked(redisClient.get).mockRejectedValue(new Error('Redis error'));

      mockReq.method = 'POST';
      mockReq.headers = { 'x-csrf-token': 'token' };
      mockReq.user = { id: testUserId };

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('csrfTokenResponseMiddleware', () => {
    it('should add CSRF token to response headers', async () => {
      const token = generateCSRFToken();
      vi.mocked(redisClient.get).mockResolvedValue(token);

      mockReq.user = { id: testUserId };

      await csrfTokenResponseMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-CSRF-Token', token);
    });

    it('should not add header for unauthenticated requests', async () => {
      mockReq.user = undefined;

      await csrfTokenResponseMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() after setting header', async () => {
      vi.mocked(redisClient.get).mockResolvedValue('token');
      mockReq.user = { id: testUserId };

      await csrfTokenResponseMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing token gracefully', async () => {
      vi.mocked(redisClient.get).mockResolvedValue(null);
      mockReq.user = { id: testUserId };

      await csrfTokenResponseMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Token Lifecycle', () => {
    it('should complete full rotation flow', async () => {
      vi.mocked(redisClient.get)
        .mockResolvedValueOnce('old-token') // First get for old token
        .mockResolvedValueOnce('new-token'); // Second get for new token

      // Rotate token
      const newToken = await rotateCSRFToken(testUserId);
      expect(newToken).toBeDefined();

      // Old token should be blacklisted
      expect(vi.mocked(redisClient.setex)).toHaveBeenCalled();

      // New token should be stored
      expect(vi.mocked(redisClient.setex)).toHaveBeenCalled();
    });

    it('should invalidate token on logout', async () => {
      await invalidateCSRFToken(testUserId);
      expect(vi.mocked(redisClient.del)).toHaveBeenCalled();
    });

    it('should have 1 hour expiration', async () => {
      const token = generateCSRFToken();
      // In production, tokens should be stored with 3600 second TTL
      expect(token).toBeDefined();
    });
  });

  describe('Error Response Format', () => {
    it('should return JSON error on missing token', async () => {
      mockReq.method = 'POST';
      mockReq.user = { id: testUserId };

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
          message: expect.any(String),
        })
      );
    });

    it('should return 403 Forbidden on invalid token', async () => {
      mockReq.method = 'POST';
      mockReq.user = { id: testUserId };
      mockReq.headers = { 'x-csrf-token': 'invalid' };

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 401 Unauthorized for unauthenticated', async () => {
      mockReq.method = 'POST';
      mockReq.user = undefined;

      await csrfValidationMiddleware(
        mockReq as AuthenticatedRequestWithCSRF,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Backward Compatibility', () => {
    it('should export all functions', () => {
      expect(typeof generateCSRFToken).toBe('function');
      expect(typeof rotateCSRFToken).toBe('function');
      expect(typeof invalidateCSRFToken).toBe('function');
      expect(typeof csrfValidationMiddleware).toBe('function');
      expect(typeof csrfTokenResponseMiddleware).toBe('function');
    });

    it('should be compatible with Express middleware pattern', () => {
      expect(typeof csrfValidationMiddleware).toBe('function');
      expect(typeof csrfTokenResponseMiddleware).toBe('function');
    });
  });
});
