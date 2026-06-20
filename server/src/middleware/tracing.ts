/**
 * tracing.ts — Distributed tracing middleware
 * Adiciona trace ID a todas as requisições para debugging e análise de performance
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../shared/utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      startTime?: number;
    }
  }
}

/**
 * Gera ou usa trace ID existente
 * Formato: uuid ou usa X-Trace-ID header se fornecido
 */
export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing trace ID from header or generate new one
  req.traceId = (req.headers['x-trace-id'] as string) || uuidv4();
  req.startTime = Date.now();

  // Add trace ID to response headers
  res.setHeader('X-Trace-ID', req.traceId);

  // Log request with trace ID
  const method = req.method;
  const path = req.path;
  const traceId = req.traceId;

  logger.info(`[${traceId}] ${method} ${path}`);

  // Hook into response finish to log timing
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    const status = res.statusCode;

    logger.info(`[${traceId}] ${method} ${path} ${status} ${duration}ms`);
  });

  next();
}

/**
 * Adiciona trace ID a todos os logs estruturados
 * Usage: logger.info(`[${req.traceId}] mensagem`)
 */
export function getTraceId(req: Request): string {
  return req.traceId || 'unknown';
}

export default tracingMiddleware;
