/**
 * Environment Configuration Validation
 * Version: 1.0.0
 *
 * Uses Zod to validate and type-check all environment variables at startup.
 * Fails fast if any required variable is missing or invalid.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(5000),

  // CORS Configuration - Explicit Domain Whitelist
  CORS_ORIGIN_DEV: z
    .string()
    .url()
    .default('http://localhost:5173')
    .describe('Development frontend URL for CORS'),
  CORS_ORIGIN_PROD: z
    .string()
    .url()
    .default('https://suplilist.app')
    .describe('Production frontend URL for CORS'),
  CORS_ORIGINS: z
    .string()
    .optional()
    .describe('Additional comma-separated CORS origins'),

  // Database - MongoDB (primary)
  MONGO_URI: z
    .string()
    .url()
    .describe('MongoDB Atlas connection string'),

  // Database - PostgreSQL (planned migration, not yet active)
  DATABASE_URL: z
    .string()
    .url()
    .optional()
    .describe('PostgreSQL connection string (reserved for future migration)'),
  POSTGRES_USER: z
    .string()
    .min(1)
    .optional(),
  POSTGRES_PASSWORD: z
    .string()
    .min(1)
    .optional(),
  POSTGRES_DB: z
    .string()
    .min(1)
    .optional(),
  POSTGRES_HOST: z
    .string()
    .default('localhost'),
  POSTGRES_PORT: z
    .coerce
    .number()
    .default(5432),

  // Cache - Redis
  REDIS_URL: z
    .string()
    .url()
    .default('redis://localhost:6379/0'),



  // OAuth - Google
  GOOGLE_CLIENT_ID: z
    .string()
    .optional(),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .optional(),

  // File Storage - AWS S3
  AWS_ACCESS_KEY_ID: z
    .string()
    .optional(),
  AWS_SECRET_ACCESS_KEY: z
    .string()
    .optional(),
  AWS_S3_BUCKET: z
    .string()
    .optional(),
  AWS_S3_REGION: z
    .string()
    .default('us-east-1'),

  // Auth - JWT
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters (256 bits recommended)')
    .default('dev-only-secret-change-me-in-production-0000')
    .describe('Secret used to sign access/refresh tokens. Generate with: openssl rand -base64 32'),

  // Email Service - Resend
  RESEND_API_KEY: z
    .string()
    .optional(),

  // Affiliate Programs
  VITE_AMAZON_AFFILIATE_ID: z
    .string()
    .optional(),
  VITE_ML_AFFILIATE_ID: z
    .string()
    .optional(),
  VITE_SHOPEE_AFFILIATE_ID: z
    .string()
    .optional(),

  // Push Notifications - Firebase
  FCM_SERVER_KEY: z
    .string()
    .optional(),
  VITE_FCM_VAPID_KEY: z
    .string()
    .optional(),

  // Stripe Billing
  STRIPE_SECRET_KEY: z
    .string()
    .min(1)
    .optional()
    .describe('Stripe secret key (sk_live_* or sk_test_*)'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1)
    .optional()
    .describe('Stripe webhook signing secret (whsec_*) — required for Sprint 4.3'),
  STRIPE_PRO_PRICE_ID: z
    .string()
    .optional()
    .describe('Stripe Price ID for the Pro plan'),
  STRIPE_ELITE_PRICE_ID: z
    .string()
    .optional()
    .describe('Stripe Price ID for the Elite plan'),
  STRIPE_SUCCESS_URL: z
    .string()
    .url()
    .optional()
    .describe('Redirect URL after successful checkout'),
  STRIPE_CANCEL_URL: z
    .string()
    .url()
    .optional()
    .describe('Redirect URL after cancelled checkout'),

  // Analytics
  VITE_GA_MEASUREMENT_ID: z
    .string()
    .optional(),

  // Error Tracking - Sentry
  SENTRY_DSN: z
    .string()
    .url()
    .optional()
    .describe('Sentry DSN for backend error reporting'),

  // Development
  DEBUG: z
    .string()
    .optional(),
  SKIP_EMAIL_VERIFICATION: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('\n❌ Environment Validation Failed\n');
  const errors = envResult.error.flatten();

  // Print field errors
  if (Object.keys(errors.fieldErrors).length > 0) {
    console.error('Invalid Fields:');
    Object.entries(errors.fieldErrors).forEach(([field, messages]) => {
      console.error(`  • ${field}: ${messages?.join(', ')}`);
    });
  }

  // Print form-level errors
  if (errors.formErrors.length > 0) {
    console.error('\nForm Errors:');
    errors.formErrors.forEach((error) => {
      console.error(`  • ${error}`);
    });
  }

  console.error(
    '\nPlease check your .env file and ensure all required variables are set.\n',
  );
  process.exit(1);
}

export const env = envResult.data;

// Guard: o default de JWT_SECRET existe só para dev/test — produção exige valor real.
if (env.NODE_ENV === 'production' && env.JWT_SECRET.startsWith('dev-only-secret')) {
  console.error('❌ JWT_SECRET must be set explicitly in production.');
  process.exit(1);
}
export type Environment = z.infer<typeof envSchema>;

// Export schema for testing
export { envSchema };
