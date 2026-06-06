/**
 * Email Configuration — Resend setup
 *
 * FIX C5: Never export API keys or secrets in config objects.
 * Access secrets directly from environment variables only when needed.
 */

// Get API key directly from env, never export it
function getApiKey() {
  const key = process.env.RESEND_API_KEY;
  if (!key && typeof window === 'undefined') {
    // Only warn on server-side at startup
    console.warn('RESEND_API_KEY not configured - email service will fail');
  }
  return key;
}

export const emailConfig = {
  // Email addresses (safe to export)
  fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@suplilist.app',
  replyToEmail: 'support@suplilist.app',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@suplilist.app',

  // Rate limiting
  rateLimits: {
    perMinute: 10,
    perHour: 100,
    perDay: 1000
  },

  // Email templates
  templates: {
    monthlyReport: {
      subject: 'Seu Relatório de Aderência',
      type: 'monthly-report'
    },
    dailyReminder: {
      subject: 'Hora de tomar seus suplementos',
      type: 'reminder'
    },
    onboarding: {
      subject: 'Bem-vindo ao SupliList',
      type: 'onboarding'
    }
  },

  // Tracking
  tracking: {
    opens: true,
    clicks: true,
    bounces: true,
    complaints: true
  },

  // List management
  unsubscribeURL: (token) => `https://suplilist.app/unsubscribe?token=${token}`,

  // Validation
  validation: {
    minEmailLength: 5,
    maxEmailLength: 254,
    minSubjectLength: 1,
    maxSubjectLength: 998,
    maxHtmlLength: 102400, // 100KB
  },

  // Retry policy
  retry: {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  },

  // Bounce handling
  bounceHandling: {
    softBounceThreshold: 5, // Mark as bounced after 5 soft bounces
    hardBounceAction: 'unsubscribe', // Action on hard bounce
    complaintAction: 'unsubscribe'
  }
};

/**
 * Validate email configuration
 */
export function validateEmailConfig() {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }

  if (!emailConfig.fromEmail) {
    throw new Error('RESEND_FROM_EMAIL environment variable is not set');
  }

  return {
    valid: true,
    message: 'Email configuration is valid'
  };
}

/**
 * Get API key for internal use only
 * Never pass this to client-side code
 */
export function getResendApiKey() {
  return getApiKey();
}

export default emailConfig;
