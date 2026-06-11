/**
 * Prometheus Metrics Endpoint
 * Exposes metrics for Prometheus scraping at /metrics
 *
 * Complies with Prometheus text exposition format
 * Used by: docker-compose prometheus service, K8s prometheus operator
 */

import { Router, Request, Response } from 'express';
import { getMetrics, getMetricsContentType } from '../shared/utils/metrics.js';

export const createMetricsRouter = (): Router => {
  const router = Router();

  /**
   * GET /metrics
   * Prometheus metrics endpoint
   *
   * Returns metrics in Prometheus text exposition format
   * Content-Type: text/plain; charset=utf-8; version=0.0.4
   */
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const metrics = await getMetrics();
      const contentType = getMetricsContentType();

      res.setHeader('Content-Type', contentType);
      res.status(200).send(metrics);
    } catch (error) {
      console.error('Error generating metrics:', error);
      res.status(500).json({
        error: 'Failed to generate metrics',
      });
    }
  });

  return router;
};

export default createMetricsRouter;
