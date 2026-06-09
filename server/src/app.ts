/**
 * Express application factory — no DB connection, no .listen(), no env validation.
 *
 * Importing this file is safe from test code: it does not call process.exit(),
 * does not connect to MongoDB, and does not bind a port. The ioredis alias in
 * vitest.config.ts handles the Redis mock transparently.
 *
 * server.ts is the only entry point that should call createApp() in production.
 * Test files may call createApp() directly to get a testable Express instance.
 */
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { initializeIdentityModule } from './modules/identity/identity.module.js';
import { initializeProfileModule } from './modules/profile/profile.module.js';
import { initializeSettingsModule } from './modules/settings/settings.module.js';
import { initializeAuditModule } from './modules/audit/audit.module.js';
import { initializeStackModule } from './modules/stack/stack.module.js';
import { initializeFavoritesModule } from './modules/favorites/favorites.module.js';
import { initializeCheckinModule } from './modules/checkin/checkin.module.js';
import { initializeNotificationsModule } from './modules/notifications/notifications.module.js';
import { initializeReportsModule } from './modules/reports/reports.module.js';
import { initializeAdminModule } from './modules/admin/admin.module.js';
import { initializeSupplementsModule } from './modules/supplements/supplements.module.js';
import { csrfGuard } from './shared/middleware/csrf-guard.js';
import { env } from './shared/config/env.config.js';
import { metricsService } from './shared/services/metrics.service.js';
import { tracingInitMiddleware } from './middleware/tracing.middleware.js';
import { rateLimitHeadersMiddleware } from './middleware/rate-limit.middleware.js';
import { createHealthRouter } from './routes/health.route.js';

export function createApp() {
  const app = express();

  // ── Trust Proxy for Load Balancer ──────────────────────────────────────────
  // Impede que o Express seja enganado por headers X-Forwarded-For injetados por clientes,
  // confiando apenas no que o Load Balancer da AWS repassa.
  app.set('trust proxy', 1);

  // ── Distributed Tracing ────────────────────────────────────────────────────
  // Add trace ID to all requests and responses for end-to-end debugging
  app.use(tracingInitMiddleware as express.RequestHandler);

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS (OWASP & W3C compliant) ──────────────────────────────────────────
  // credentials: true requires an explicit origin — never wildcard '*'.
  app.use(cors({
    origin: env.FRONTEND_ORIGIN, // Zod guaranteed
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-SupliList-Client', 'If-Match'],
    credentials: true,
  }));

  // ── Cloudflare Edge Shield (Direct Origin Bypass Protection) ────────────────
  // Bloqueia qualquer tráfego que tente contornar o Cloudflare acessando a URL direta do Render,
  // impedindo o IP Spoofing de `cf-connecting-ip`.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== 'production' || !process.env.CF_EDGE_TOKEN) {
      return next();
    }
    
    // Isenção para tráfego legítimo máquina-a-máquina que não passa pelo Cloudflare (ex: Stripe, Resend)
    if (req.path.startsWith('/api/webhooks/')) {
      return next();
    }
    
    const edgeToken = req.headers['x-suplilist-edge-token'];
    if (!edgeToken || edgeToken !== process.env.CF_EDGE_TOKEN) {
      return res.status(403).json({ error: 'Direct access not allowed' });
    }
    
    next();
  });

  // ── Body parsers ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' })); // 10 kb cap mitigates payload-size DoS
  app.use(cookieParser());

  // ── CSRF defence (custom-header strategy, OWASP compliant) ────────────────
  app.use(csrfGuard);

  // ── Rate Limit Headers Middleware ──────────────────────────────────────────
  // Ensures X-RateLimit-* and Retry-After headers are present in responses
  app.use(rateLimitHeadersMiddleware);

  // ── Global rate limiter ────────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'too_many_requests',
      message: 'Too many requests from this IP, please try again in 15 minutes.',
    },
  });
  app.use(globalLimiter);

  // ── Health check endpoints (Kubernetes compatible) ────────────────────────
  // GET /health/live - liveness probe (simple 200 OK)
  // GET /health/ready - readiness probe (checks dependencies)
  // GET /health - generic health check (backward compatible)
  app.use('/health', createHealthRouter());

  // ── Prometheus metrics endpoint ─────────────────────────────────────────────
  app.get('/metrics', (_req: Request, res: Response) => {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metricsService.getMetrics());
  });

  // ── Modular monolith routers ───────────────────────────────────────────────
  app.use('/api/auth', initializeIdentityModule());
  app.use('/api/profile', initializeProfileModule());
  app.use('/api/settings', initializeSettingsModule());
  app.use('/api/audit', initializeAuditModule());
  app.use('/api/stack', initializeStackModule());
  app.use('/api/favorites', initializeFavoritesModule());
  app.use('/api/checkin', initializeCheckinModule());
  app.use('/api/notifications', initializeNotificationsModule());
  app.use('/api/reports', initializeReportsModule());
  app.use('/api/supplements', initializeSupplementsModule());
  app.use('/api/admin', initializeAdminModule());

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'not_found',
      message: `Resource not found: ${req.method} ${req.path}`,
    });
  });

  // ── Global error handler (OWASP: no leaked stack traces in production) ─────
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    
    let status = 500;
    let code = 'internal_server_error';
    let message = 'An unexpected error occurred. Please contact support.';

    if (err instanceof Error) {
      if (err.name === 'ZodError' || err.constructor.name === 'ZodError') {
        status = 400;
        code = 'validation_error';
        message = err.message;
      } else if (err.message.includes('ValidationError')) {
        status = 400;
        code = 'validation_error';
        message = err.message.replace('ValidationError: ', '');
      } else if (err.message.includes('EntityNotFoundError')) {
        status = 404;
        code = 'not_found';
        message = err.message.replace('EntityNotFoundError: ', '');
      } else {
        const e = err as { status?: number; statusCode?: number; code?: string; message?: string };
        status = e.status || e.statusCode || 500;
        code = e.code || 'internal_server_error';
        message = e.message || 'Internal Server Error';
      }
    } else {
      const e = err as { status?: number; statusCode?: number; code?: string; message?: string };
      status = e?.status || e?.statusCode || 500;
      code = e?.code || 'internal_server_error';
      message = e?.message || 'Internal Server Error';
    }

    res.status(status).json({
      success: false,
      error: code,
      message: process.env.NODE_ENV === 'production' && status === 500
        ? 'An unexpected error occurred. Please contact support.'
        : message,
    });
  });

  return app;
}
