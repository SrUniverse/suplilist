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
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
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
import { initializePaymentsModule } from './modules/payments/payments.module.js';
import { initializeSubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';
import { createStripeWebhookRouter } from './modules/subscriptions/stripe-webhook.route.js';
import { initializeSupplementsModule } from './modules/supplements/supplements.module.js';
import { csrfGuard } from './shared/middleware/csrf-guard.js';
import { env } from './shared/config/env.config.js';
import { metricsService } from './shared/services/metrics.service.js';
import { tracingInitMiddleware } from './middleware/tracing.middleware.js';
import { rateLimitHeadersMiddleware } from './middleware/rate-limit.middleware.js';
import { createCorsMiddleware, logCorsConfiguration } from './middleware/cors.middleware.js';
import { createHealthRouter } from './routes/health.route.js';
import { metricsMiddleware, startErrorRateCleanup } from './middleware/metrics.middleware.js';
import { createMetricsRouter } from './routes/metrics.route.js';
import { logMaskingMiddleware } from './middleware/log-masking.middleware.js';

export function createApp() {
  const app = express();

  // ── Trust Proxy for Load Balancer ──────────────────────────────────────────
  // Impede que o Express seja enganado por headers X-Forwarded-For injetados por clientes,
  // confiando apenas no que o Load Balancer da AWS repassa.
  app.set('trust proxy', 1);

  // ── Distributed Tracing ────────────────────────────────────────────────────
  // Add trace ID to all requests and responses for end-to-end debugging
  app.use(tracingInitMiddleware as express.RequestHandler);

  // ── Log Masking (GDPR/Security) ────────────────────────────────────────────
  // Sanitize sensitive data from logs: IPs, tokens, URLs with affiliate IDs, PII
  // Must be early in stack to mask IPs before other middleware access them
  app.use(logMaskingMiddleware);

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // ── CORS (OWASP & W3C compliant, explicit whitelist) ────────────────────────
  // Explicit domain whitelist with no wildcards
  // Logs rejected CORS requests for security monitoring
  logCorsConfiguration();
  app.use(createCorsMiddleware());

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

  // ── Stripe webhook (raw body — must precede express.json and csrfGuard) ────
  // Signature verification requires the exact bytes Stripe sent; express.json
  // would consume/transform them. csrfGuard would also reject Stripe's request
  // (no custom header), so this route is mounted before both.
  app.use('/api/webhooks', createStripeWebhookRouter());

  // ── Body parsers ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' })); // 10 kb cap mitigates payload-size DoS
  app.use(cookieParser());

  // ── CSRF defence (custom-header strategy, OWASP compliant) ────────────────
  app.use(csrfGuard);

  // ── Rate Limit Headers Middleware ──────────────────────────────────────────
  // Ensures X-RateLimit-* and Retry-After headers are present in responses
  app.use(rateLimitHeadersMiddleware);

  // ── Prometheus Metrics Collection Middleware ────────────────────────────────
  // Collects HTTP latency, request counts, error rates for all endpoints
  app.use(metricsMiddleware);

  // Start periodic cleanup of error rate counters
  startErrorRateCleanup();

  // ── Global rate limiter ────────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    // Under serverless-http (Vercel) req.ip is undefined — the default
    // keyGenerator's validation then hangs the request with a 504. Resolve the
    // client IP from proxy headers, normalizing IPv6 via ipKeyGenerator.
    keyGenerator: (req: Request) => {
      const raw =
        (req.headers['x-real-ip'] as string) ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip;
      return raw ? ipKeyGenerator(raw) : 'unknown-ip';
    },
    validate: { ip: false },
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
  // Prometheus scrapes this endpoint to collect application metrics
  // Supports: http_requests_total, latency histograms, cache metrics, worker metrics, etc.
  app.use('/metrics', createMetricsRouter());

  // ── Frontend performance metrics receiver ────────────────────────────────────
  app.post('/api/metrics/performance', (_req: Request, res: Response) => {
    // Currently a dummy sink to prevent 404s and console spam from frontend telemetry
    res.status(202).json({ success: true, message: 'metrics_accepted' });
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
  app.use('/api/payments', initializePaymentsModule());
  app.use('/api/subscriptions', initializeSubscriptionsModule());
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
