import 'dotenv/config'; // Make sure env is loaded first
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { z } from 'zod';
import { initializeIdentityModule } from './modules/identity/identity.module.js';
import { initializeProfileModule } from './modules/profile/profile.module.js';
import { initializeSettingsModule } from './modules/settings/settings.module.js';
import { initializeAuditModule } from './modules/audit/audit.module.js';
import { csrfGuard } from './shared/middleware/csrf-guard.js';

// Import workers/jobs
import { OutboxProcessorJob } from './shared/infrastructure/jobs/outbox-processor.job.js';
import { AuditFlushJob } from './shared/infrastructure/jobs/audit-flush.job.js';
import { PurgeAccountsJob } from './shared/infrastructure/jobs/purge-accounts.job.js';

// 1. Fail-fast: Rigorous environment variable validation via Zod
const envSchema = z.object({
  PORT: z.string().default('5000'),
  MONGO_URI: z.string().url('MONGO_URI must be a valid URL'),
  REDIS_URI: z.string().url('REDIS_URI must be a valid URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'),
});

const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  console.error('❌ Fatal Error: Invalid or missing environment variables:');
  console.error(JSON.stringify(envResult.error.format(), null, 2));
  process.exit(1);
}

const env = envResult.data;
const app = express();

// 2. Global security and parsing middlewares
app.use(helmet());

// CORS configuration (OWASP & W3C compliant)
// When credentials are enabled (credentials: true), the Access-Control-Allow-Origin header
// cannot use a wildcard '*'. It must match the client's origin explicitly.
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Vite default development server
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-SupliList-Client'],
  credentials: true,
}));

// Parsers
app.use(express.json({ limit: '10kb' })); // Mitigate payload size DDoS
app.use(cookieParser());

// CSRF Defense (OWASP compliant)
// Blocks cross-site request forgery attacks targeting HTTP cookies
app.use(csrfGuard);

// Global Rate Limiter to prevent brute-force and DDoS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'Too many requests from this IP, please try again in 15 minutes.'
  }
});
app.use(globalLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// 3. Mount Modular Monolith routers
app.use('/api/auth', initializeIdentityModule());
app.use('/api/profile', initializeProfileModule());
app.use('/api/settings', initializeSettingsModule());
app.use('/api/audit', initializeAuditModule());

// Global 404 Route handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'not_found',
    message: `Resource not found: ${req.method} ${req.path}`
  });
});

// Global Error handling middleware (OWASP compliant - no leaked details)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  
  const status = err.status || err.statusCode || 500;
  
  res.status(status).json({
    success: false,
    error: err.code || 'internal_server_error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please contact support.' 
      : err.message || 'Internal Server Error'
  });
});

// 4. Database Connection & Server Startup
mongoose.connect(env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 SupliList backend server running on port ${env.PORT}`);
    });

    // Initialize job workers intervals
    const outboxInterval = setInterval(async () => {
      try {
        await OutboxProcessorJob.execute();
      } catch (err) {
        console.error('[Worker Error] Outbox processor execution failed:', err);
      }
    }, 60 * 1000); // every 1 min

    const auditInterval = setInterval(async () => {
      try {
        await AuditFlushJob.execute();
      } catch (err) {
        console.error('[Worker Error] Audit flush execution failed:', err);
      }
    }, 5 * 60 * 1000); // every 5 min

    const purgeInterval = setInterval(async () => {
      try {
        await PurgeAccountsJob.execute();
      } catch (err) {
        console.error('[Worker Error] Purge accounts execution failed:', err);
      }
    }, 24 * 60 * 60 * 1000); // every 24 hours

    // Run purge once on startup after 10 seconds to clear any backlogs
    setTimeout(async () => {
      try {
        await PurgeAccountsJob.execute();
      } catch (err) {
        console.error('[Worker Error] Initial Purge Accounts run failed:', err);
      }
    }, 10 * 1000);

    // Graceful Shutdown
    const shutdown = (signal: string) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      
      // Clear intervals immediately
      clearInterval(outboxInterval);
      clearInterval(auditInterval);
      clearInterval(purgeInterval);

      server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close()
          .then(() => {
            console.log('MongoDB connection closed.');
            process.exit(0);
          })
          .catch((dbErr) => {
            console.error('Error closing MongoDB connection:', dbErr);
            process.exit(1);
          });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB on startup:', err);
    process.exit(1);
  });
