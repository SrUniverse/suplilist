import expressRateLimit from 'express-rate-limit';

/**
 * Factory wrapper around express-rate-limit with sane defaults.
 * Usage: rateLimit({ windowMs: 60_000, max: 10 })
 */
export function rateLimit(options = {}) {
  return expressRateLimit({
    windowMs: options.windowMs ?? 60 * 1000,
    max: options.max ?? 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'rate_limit_exceeded',
      message: 'Too many requests. Please try again later.',
    },
  });
}
