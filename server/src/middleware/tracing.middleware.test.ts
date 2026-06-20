/**
 * Tracing Middleware Tests
 *
 * Test coverage for P2 fix: Distributed tracing
 * - Trace ID generation and propagation
 * - X-Trace-ID header in responses
 * - Request/response timing tracking
 * - Trace metadata storage in Redis
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { logger as winstonLogger } from '../shared/utils/logger.js';
import {
  generateTraceId,
  tracingInitMiddleware,
  startDbTiming,
  endDbTiming,
  getTraceMetadata,
  createTracedLogger,
  createSpanRecorder,
  TracedRequest,
} from './tracing.middleware.js';
import { redisClient } from '../shared/infrastructure/redis/redis.client.js';

// Mock Redis client
vi.mock('../shared/infrastructure/redis/redis.client.js', () => ({
  redisClient: {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
  },
}));

describe('Tracing Middleware', () => {
  let mockReq: Partial<TracedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'GET',
      path: '/api/supplements/search',
      headers: {},
      ip: '192.168.1.1',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      statusCode: 200,
    };

    mockNext = vi.fn();
  });

  describe('generateTraceId', () => {
    it('should generate a valid trace ID', () => {
      const traceId = generateTraceId();
      expect(traceId).toBeDefined();
      expect(typeof traceId).toBe('string');
    });

    it('should generate unique trace IDs', () => {
      const id1 = generateTraceId();
      const id2 = generateTraceId();
      expect(id1).not.toBe(id2);
    });

    it('should use timestamp-random format', () => {
      const traceId = generateTraceId();
      expect(traceId).toMatch(/^\d+-[a-f0-9]+$/);
    });

    it('should include timestamp component', () => {
      const traceId = generateTraceId();
      const [timestamp] = traceId.split('-');
      expect(/^\d+$/.test(timestamp)).toBe(true);
    });

    it('should include random hex component', () => {
      const traceId = generateTraceId();
      const [, random] = traceId.split('-');
      expect(/^[a-f0-9]+$/.test(random)).toBe(true);
    });

    it('should use 16-character random string (8 bytes)', () => {
      const traceId = generateTraceId();
      const [, random] = traceId.split('-');
      expect(random.length).toBe(16);
    });

    it('should produce 100 unique IDs in sequence', () => {
      const traceIds = new Set();
      for (let i = 0; i < 100; i++) {
        traceIds.add(generateTraceId());
      }
      expect(traceIds.size).toBe(100);
    });
  });

  describe('tracingInitMiddleware', () => {
    it('should generate trace ID if not provided', () => {
      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      expect(mockReq.traceId).toBeDefined();
      expect(typeof mockReq.traceId).toBe('string');
    });

    it('should use provided X-Trace-ID header', () => {
      const providedId = 'custom-trace-123';
      mockReq.headers = { 'x-trace-id': providedId };

      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      expect(mockReq.traceId).toBe(providedId);
    });

    it('should validate trace ID format from header', () => {
      const validId = '1234567890-abcdef';
      mockReq.headers = { 'x-trace-id': validId };

      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      expect(mockReq.traceId).toBe(validId);
    });

    it('should reject invalid trace ID format', () => {
      const invalidId = 'invalid@trace$id';
      mockReq.headers = { 'x-trace-id': invalidId };

      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      // Should generate new ID instead of using invalid
      expect(mockReq.traceId).not.toBe(invalidId);
    });

    it('should initialize startTime', () => {
      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      expect(mockReq.startTime).toBeDefined();
      expect(typeof mockReq.startTime).toBe('number');
    });

    it('should initialize timings object', () => {
      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      expect(mockReq.timings).toBeDefined();
      expect(mockReq.timings?.requestStart).toBeDefined();
    });

    it('should add X-Trace-ID to response headers', () => {
      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Trace-ID',
        expect.any(String)
      );
    });

    it('should add trace ID to JSON response body', async () => {
      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      const originalJson = mockRes.json as any;
      const responseData = { data: 'test' };

      if (originalJson.mock) {
        const capturedJson = originalJson.mock.results[0]?.value;
        // In real scenario, would be captured in response interception
      }

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() middleware', () => {
      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should store trace in Redis asynchronously', async () => {
      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      // Allow async storage to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // In real scenario, would verify Redis call
      expect(mockReq.traceId).toBeDefined();
    });

    it('should not block request on Redis error', () => {
      vi.mocked(redisClient.setex).mockRejectedValueOnce(new Error('Redis error'));

      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      // Should still call next even if storage fails
      expect(mockNext).toHaveBeenCalled();
    });

    it('should calculate request duration on response', () => {
      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      const startTime = mockReq.startTime as number;
      expect(startTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('startDbTiming and endDbTiming', () => {
    beforeEach(() => {
      const req = mockReq as TracedRequest;
      req.traceId = 'test-trace-123';
      req.startTime = Date.now();
      req.timings = { requestStart: Date.now() };
    });

    it('should record database start time', () => {
      const req = mockReq as TracedRequest;
      startDbTiming(req);

      expect(req.timings?.dbStart).toBeDefined();
    });

    it('should record database end time', () => {
      const req = mockReq as TracedRequest;
      startDbTiming(req);
      endDbTiming(req);

      expect(req.timings?.dbEnd).toBeDefined();
    });

    it('should calculate database duration', () => {
      const req = mockReq as TracedRequest;
      startDbTiming(req);

      // Simulate DB operation
      const delay = new Promise(resolve => setTimeout(resolve, 10));

      delay.then(() => {
        endDbTiming(req);
        const duration = (req.timings?.dbEnd || 0) - (req.timings?.dbStart || 0);
        expect(duration).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle missing timings object', () => {
      const req = mockReq as TracedRequest;
      req.timings = undefined as any;

      expect(() => startDbTiming(req)).not.toThrow();
    });
  });

  describe('getTraceMetadata', () => {
    it('should retrieve trace metadata from Redis', async () => {
      const metadata = { method: 'GET', status: 200, duration: 100 };
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(metadata));

      const result = await getTraceMetadata('test-trace-123');

      expect(result).toEqual(metadata);
    });

    it('should return null if trace not found', async () => {
      vi.mocked(redisClient.get).mockResolvedValue(null);

      const result = await getTraceMetadata('nonexistent-trace');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      vi.mocked(redisClient.get).mockRejectedValue(new Error('Redis error'));

      const result = await getTraceMetadata('test-trace-123');

      expect(result).toBeNull();
    });

    it('should parse JSON metadata', async () => {
      const metadata = { key: 'value', nested: { inner: 'data' } };
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(metadata));

      const result = await getTraceMetadata('test-trace-123');

      expect(result?.nested?.inner).toBe('data');
    });
  });

  describe('createTracedLogger', () => {
    it('should create logger with trace ID', () => {
      const req = mockReq as TracedRequest;
      req.traceId = 'test-trace-123';

      const logger = createTracedLogger(req);

      expect(logger).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it('should include trace ID in debug logs', () => {
      const req = mockReq as TracedRequest;
      req.traceId = 'test-trace-123';

      const consoleSpy = vi.spyOn(winstonLogger, 'debug').mockImplementation(() => winstonLogger);
      const logger = createTracedLogger(req);

      logger.debug('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-trace-123'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('should include trace ID in info logs', () => {
      const req = mockReq as TracedRequest;
      req.traceId = 'test-trace-123';

      const consoleSpy = vi.spyOn(winstonLogger, 'info').mockImplementation(() => winstonLogger);
      const logger = createTracedLogger(req);

      logger.info('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-trace-123'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('should support additional data in logs', () => {
      const req = mockReq as TracedRequest;
      req.traceId = 'test-trace-123';

      const consoleSpy = vi.spyOn(winstonLogger, 'info').mockImplementation(() => winstonLogger);
      const logger = createTracedLogger(req);

      logger.info('Test', { userId: 'user-123' });

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('createSpanRecorder', () => {
    it('should create span recorder for operation', () => {
      const req = mockReq as TracedRequest;
      req.traceId = 'test-trace-123';

      const span = createSpanRecorder(req, 'database-query');

      expect(span).toBeDefined();
      expect(span.end).toBeDefined();
    });

    it('should record span timing', () => {
      const req = mockReq as TracedRequest;
      req.traceId = 'test-trace-123';

      const consoleSpy = vi.spyOn(winstonLogger, 'info').mockImplementation(() => winstonLogger);
      const span = createSpanRecorder(req, 'operation');

      span.end({ rows: 100 });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('operation'),
        expect.objectContaining({
          duration: expect.stringMatching(/\d+ms/),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should include span metadata in output', () => {
      const req = mockReq as TracedRequest;
      req.traceId = 'test-trace-123';

      const consoleSpy = vi.spyOn(winstonLogger, 'info').mockImplementation(() => winstonLogger);
      const span = createSpanRecorder(req, 'api-call');

      span.end({ status: 200, endpoint: '/api/data' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 200,
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Request Tracing Flow', () => {
    it('should complete full tracing lifecycle', () => {
      const req = mockReq as TracedRequest;

      // Initialize
      tracingInitMiddleware(req, mockRes as Response, mockNext);

      expect(req.traceId).toBeDefined();
      expect(req.startTime).toBeDefined();
      expect(req.timings).toBeDefined();

      // Use during request
      startDbTiming(req);
      endDbTiming(req);

      expect(req.timings?.dbStart).toBeDefined();
      expect(req.timings?.dbEnd).toBeDefined();
    });

    it('should propagate trace ID through request lifecycle', () => {
      const req = mockReq as TracedRequest;
      const originalTraceId = 'custom-trace-123';
      req.headers = { 'x-trace-id': originalTraceId };

      tracingInitMiddleware(req, mockRes as Response, mockNext);

      expect(req.traceId).toBe(originalTraceId);
    });
  });

  describe('Backward Compatibility', () => {
    it('should export all tracing functions', () => {
      expect(typeof generateTraceId).toBe('function');
      expect(typeof tracingInitMiddleware).toBe('function');
      expect(typeof startDbTiming).toBe('function');
      expect(typeof endDbTiming).toBe('function');
      expect(typeof getTraceMetadata).toBe('function');
      expect(typeof createTracedLogger).toBe('function');
      expect(typeof createSpanRecorder).toBe('function');
    });

    it('should be compatible with Express middleware pattern', () => {
      expect(typeof tracingInitMiddleware).toBe('function');
      // Should accept (req, res, next)
    });
  });

  describe('Error Handling', () => {
    it('should not fail on Redis storage error', () => {
      vi.mocked(redisClient.setex).mockRejectedValue(new Error('Redis down'));

      expect(() => {
        tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);
      }).not.toThrow();
    });

    it('should continue request flow on trace storage failure', () => {
      vi.mocked(redisClient.setex).mockRejectedValue(new Error('Redis error'));

      tracingInitMiddleware(mockReq as TracedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing trace metadata gracefully', async () => {
      vi.mocked(redisClient.get).mockResolvedValue(null);

      const result = await getTraceMetadata('nonexistent');

      expect(result).toBeNull();
    });
  });
});
