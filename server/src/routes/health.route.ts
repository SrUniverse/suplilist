import { Router, Request, Response, NextFunction } from 'express';
import { redisClient } from '../shared/infrastructure/redis/redis.client.js';
import mongoose from 'mongoose';

/**
 * Health Check Routes
 *
 * Implements Kubernetes-compatible health endpoints for:
 * - Liveness probes: /health/live (simple 200 OK)
 * - Readiness probes: /health/ready (checks dependencies)
 *
 * Response format:
 * {
 *   status: 'healthy' | 'degraded' | 'unhealthy',
 *   checks: {
 *     mongodb: { status: 'up' | 'down', latency: number },
 *     redis: { status: 'up' | 'down', latency: number },
 *     memory: { status: 'up' | 'down', usage: number },
 *     uptime: number,
 *     version: string,
 *     timestamp: ISO8601 string
 *   }
 * }
 */

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    mongodb: { status: 'up' | 'down'; latency: number };
    redis: { status: 'up' | 'down'; latency: number };
    memory: { status: 'up' | 'down'; usage: number };
    uptime: number;
    version: string;
    timestamp: string;
  };
}

export const createHealthRouter = (): Router => {
  const router = Router();

  /**
   * GET /health/live
   * Liveness probe: Is the process running?
   * Returns 200 immediately without dependency checks
   */
  router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  /**
   * GET /health/ready
   * Readiness probe: Can this instance serve requests?
   * Checks all dependencies (MongoDB, Redis, memory)
   */
  router.get('/ready', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result: HealthCheckResult = {
        status: 'healthy',
        checks: {
          mongodb: { status: 'down', latency: 0 },
          redis: { status: 'down', latency: 0 },
          memory: { status: 'up', usage: 0 },
          uptime: process.uptime(),
          version: process.env.npm_package_version || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      // Check MongoDB connection
      try {
        const mongoStart = Date.now();
        const mongoState = mongoose.connection.readyState;
        const mongoLatency = Date.now() - mongoStart;

        // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        if (mongoState === 1) {
          result.checks.mongodb = { status: 'up', latency: mongoLatency };
        } else {
          result.checks.mongodb = { status: 'down', latency: mongoLatency };
          // MongoDB is critical: without it the instance cannot serve data — mark
          // unhealthy so the readiness probe returns 503 and traffic is drained.
          result.status = 'unhealthy';
        }
      } catch (error) {
        result.checks.mongodb = { status: 'down', latency: 0 };
        result.status = 'unhealthy';
      }

      // Check Redis connection
      try {
        const redisStart = Date.now();
        const pong = await redisClient.ping();
        const redisLatency = Date.now() - redisStart;

        if (pong === 'PONG') {
          result.checks.redis = { status: 'up', latency: redisLatency };
        } else {
          result.checks.redis = { status: 'down', latency: redisLatency };
          result.status = 'degraded';
        }
      } catch (error) {
        result.checks.redis = { status: 'down', latency: 0 };
        result.status = 'degraded';
      }

      // Report memory usage but never mark as down — free tier has limited RAM
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      result.checks.memory = { status: 'up', usage: heapUsedPercent };

      // If any critical check failed, return 503
      const httpStatus = result.status === 'unhealthy' ? 503 : 200;

      res.status(httpStatus).json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /health
   * Generic health endpoint (deprecated, use /health/live or /health/ready)
   */
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Default to ready check for backward compatibility
      const mongoState = mongoose.connection.readyState;
      const isReady = mongoState === 1;

      res.status(isReady ? 200 : 503).json({
        status: isReady ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

export default createHealthRouter;
