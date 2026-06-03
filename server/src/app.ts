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
import { csrfGuard } from './shared/middleware/csrf-guard.js';

export function createApp() {
  const app = express();

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS (OWASP & W3C compliant) ──────────────────────────────────────────
  // credentials: true requires an explicit origin — never wildcard '*'.
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-SupliList-Client'],
    credentials: true,
  }));

  // ── Body parsers ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' })); // 10 kb cap mitigates payload-size DoS
  app.use(cookieParser());

  // ── CSRF defence (custom-header strategy, OWASP compliant) ────────────────
  app.use(csrfGuard);

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

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
    });
  });

  // ── Modular monolith routers ───────────────────────────────────────────────
  app.use('/api/auth', initializeIdentityModule());
  app.use('/api/profile', initializeProfileModule());
  app.use('/api/settings', initializeSettingsModule());
  app.use('/api/audit', initializeAuditModule());

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
    const e = err as { status?: number; statusCode?: number; code?: string; message?: string };
    const status = e.status || e.statusCode || 500;
    res.status(status).json({
      success: false,
      error: e.code || 'internal_server_error',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please contact support.'
        : e.message || 'Internal Server Error',
    });
  });

  return app;
}
