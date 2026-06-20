/**
 * Prometheus Metrics Endpoint
 * Exposes metrics for Prometheus scraping at /metrics
 *
 * Complies with Prometheus text exposition format
 * Used by: docker-compose prometheus service, K8s prometheus operator
 */

import { Router, Request, Response } from 'express';
import { getMetrics, getMetricsContentType } from '../shared/utils/metrics.js';
import { logger } from '../shared/utils/logger.js';

export const createMetricsRouter = (): Router => {
  const router = Router();

  /**
   * GET /metrics
   * Prometheus metrics endpoint — protected by bearer token.
   * Set METRICS_TOKEN env var; omit to disable endpoint entirely.
   */
  router.get('/', async (req: Request, res: Response) => {
    const token = process.env.METRICS_TOKEN;
    if (!token) {
      return res.status(404).end();
    }
    if (req.headers['authorization'] !== `Bearer ${token}`) {
      return res.status(401).end();
    }
    try {
      const metrics = await getMetrics();
      const contentType = getMetricsContentType();

      res.setHeader('Content-Type', contentType);
      res.status(200).send(metrics);
    } catch (error) {
      logger.error('Error generating metrics:', error);
      res.status(500).json({
        error: 'Failed to generate metrics',
      });
    }
  });

  return router;
};

export default createMetricsRouter;
