/**
 * Vercel Speed Insights Integration
 * 
 * Tracks web vitals and performance metrics for the application.
 * @see https://vercel.com/docs/speed-insights
 */

import { injectSpeedInsights } from '@vercel/speed-insights';

/**
 * Initialize Vercel Speed Insights
 * 
 * This will automatically track Core Web Vitals:
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Cumulative Layout Shift (CLS)
 * - First Input Delay (FID)
 * - Time to First Byte (TTFB)
 * - Interaction to Next Paint (INP)
 */
export function initSpeedInsights() {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if running in development mode (Vite dev server)
  const isDevelopment = import.meta.env.DEV;

  try {
    injectSpeedInsights({
      // Enable debug mode in development
      debug: isDevelopment,
      // Sample rate: 1 = track all users, 0.5 = track 50%
      sampleRate: 1,
      // Framework identifier for analytics
      framework: 'vite',
    });

    if (isDevelopment) {
      console.log('[Speed Insights] Initialized successfully');
    }
  } catch (error) {
    console.error('[Speed Insights] Failed to initialize:', error);
  }
}

// Auto-initialize when module is imported
initSpeedInsights();
