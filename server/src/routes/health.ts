/**
 * health.ts — Endpoints de health check
 * Para Kubernetes probes, load balancer checks, monitoring
 */

import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { cacheService } from '../shared/services/cache.service.js';
import { redisClient } from '../shared/infrastructure/redis/redis.client.js';

const router = Router();

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    redis: 'ok' | 'error';
    mongodb: 'ok' | 'error';
  };
}

/**
 * GET /health/live
 * Liveness probe — verifica se processo está rodando
 * Retorna 200 se vivo
 */
router.get('/live', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness probe — verifica se pode handle requisições
 * Retorna 200 apenas se todas as dependências estão saudáveis
 */
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const checks: HealthResponse['checks'] = {
    redis: 'error',
    mongodb: 'error',
  };

  // Check Redis — live ping, not just flag
  try {
    await redisClient.ping();
    checks.redis = 'ok';
  } catch (error) {
    console.error('[Health] Redis check failed:', error);
  }

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      // 1 = conectado
      checks.mongodb = 'ok';
    }
  } catch (error) {
    console.error('[Health] MongoDB check failed:', error);
  }

  const allHealthy = checks.redis === 'ok' && checks.mongodb === 'ok';
  const statusCode = allHealthy ? 200 : 503;
  const status = allHealthy ? 'healthy' : 'degraded';

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    checks,
    responseTime: `${Date.now() - startTime}ms`,
  } as HealthResponse);
});

/**
 * GET /health/detailed
 * Health info detalhado para dashboards de monitoring
 */
router.get('/detailed', async (req: Request, res: Response): Promise<void> => {
  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    mongodb: {
      connected: mongoose.connection.readyState === 1,
    },
    redis: {
      enabled: cacheService.isEnabled(),
    },
  };

  res.status(200).json(healthInfo);
});

export default router;
