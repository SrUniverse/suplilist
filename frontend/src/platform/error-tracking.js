/**
 * error-tracking.js — Error Tracking and Observability System
 *
 * Captures and reports unhandled errors to backend:
 * - Unhandled promise rejections
 * - console.error calls
 * - Component errors
 *
 * Features:
 * - Batch errors (send in groups to reduce network requests)
 * - Use sendBeacon for offline-safe reporting
 * - Filter out expected errors (404, 403, testing)
 * - Assign unique trace IDs for debugging
 *
 * @module platform/error-tracking
 */

import { logger } from '../utils/logger.js';
import { eventBus, EVENTS } from '../core/event-bus.js';

/**
 * Error tracking configuration
 * @type {{
 *   enabled: boolean,
 *   endpoint: string,
 *   batchSize: number,
 *   batchInterval: number,
 *   excludePatterns: RegExp[],
 *   maxErrors: number,
 *   captureConsoleError: boolean,
 * }}
 */
const config = {
  enabled: false,
  endpoint: `${import.meta.env.VITE_API_BASE_URL || ''}/api/logs/errors`,
  batchSize: 10,
  batchInterval: 30000, // 30 seconds
  maxErrors: 100, // Max errors to buffer before flushing
  captureConsoleError: true,
  // Patterns to exclude from tracking
  excludePatterns: [
    /404|not found/i,
    /403|forbidden/i,
    /test error/i, // Testing errors
    /mock error/i,
    /jest|jasmine|mocha/i, // Testing framework errors
  ],
};

/**
 * Error tracking state
 */
const state = {
  errors: [],
  isInitialized: false,
  batchTimer: null,
  traceIdCounter: 0,
};

/**
 * Check if error should be tracked
 * @param {Error} error
 * @returns {boolean}
 * @private
 */
function shouldTrackError(error) {
  const errorStr = error.message + ' ' + error.stack;

  // Don't track expected errors
  for (const pattern of config.excludePatterns) {
    if (pattern.test(errorStr)) {
      return false;
    }
  }

  return true;
}

/**
 * Generate a unique trace ID
 * @returns {string}
 * @private
 */
function generateTraceId() {
  return `trace_${Date.now()}_${++state.traceIdCounter}`;
}

/**
 * Capture an error
 * @param {Error} error
 * @param {string} [type='UNCAUGHT_ERROR']
 * @param {object} [context={}]
 * @private
 */
function captureError(error, type = 'UNCAUGHT_ERROR', context = {}) {
  if (!config.enabled || !shouldTrackError(error)) {
    return;
  }

  if (!state.isInitialized) {
    init();
  }

  const traceId = generateTraceId();
  const errorData = {
    type,
    message: error.message || '',
    stack: error.stack || '',
    context,
    trace_id: traceId,
    user_id: getUserId(),
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  state.errors.push(errorData);
  logger.debug('[ErrorTracking] Captured error:', errorData);

  // Flush if we hit max errors
  if (state.errors.length >= config.maxErrors) {
    flush();
  }
}

/**
 * Get current user ID (if available)
 * @returns {string | null}
 * @private
 */
function getUserId() {
  try {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    return user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Send batched errors to server
 * @private
 */
async function flush() {
  if (state.errors.length === 0) {
    return;
  }

  const toSend = state.errors.splice(0, config.batchSize);

  logger.debug(`[ErrorTracking] Sending ${toSend.length} errors to server`);

  try {
    // Use fetch keepalive for offline-safe delivery with custom headers
    fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SupliList-Client': '1'
      },
      body: JSON.stringify({ errors: toSend }),
      keepalive: true
    }).catch(() => {});
  } catch (e) {
    logger.error('[ErrorTracking] Failed to send errors:', e);
    // Re-queue the errors if send failed (but limit queue size)
    if (state.errors.length < config.maxErrors) {
      state.errors.unshift(...toSend);
    }
  }
}

/**
 * Schedule periodic error flushing
 * @private
 */
function scheduleBatchFlush() {
  state.batchTimer = setInterval(() => {
    if (state.errors.length > 0) {
      flush();
    }
  }, config.batchInterval);
}

/**
 * Initialize error tracking
 * - Listen to unhandled promise rejections
 * - Hook into console.error
 * - Listen to component errors from eventBus
 */
export function init() {
  // config.enabled = true; // Disabled remote reporting by default to avoid 404s

  if (state.isInitialized) {
    return;
  }

  state.isInitialized = true;

  // 1. Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureError(
      new Error(event.reason?.message || String(event.reason)),
      'UNHANDLED_REJECTION',
      { reason: event.reason }
    );
  });

  // 2. Hook console.error
  if (config.captureConsoleError && typeof console !== 'undefined') {
    const originalError = console.error;
    console.error = function(...args) {
      // Call original console.error
      originalError.apply(console, args);

      // Capture as error
      const message = args
        .map(arg => {
          if (arg instanceof Error) {
            return arg.message;
          }
          return String(arg);
        })
        .join(' ');

      if (message) {
        captureError(
          new Error(message),
          'CONSOLE_ERROR',
          { args: args.map(a => String(a)) }
        );
      }
    };
  }

  // 3. Listen to component errors from eventBus
  eventBus.on(EVENTS.COMPONENT_ERROR, (payload) => {
    captureError(
      new Error(payload.message),
      'COMPONENT_ERROR',
      payload
    );
  });

  // 4. Schedule periodic flushing
  scheduleBatchFlush();

  // 5. Flush remaining errors before page unload
  window.addEventListener('beforeunload', () => {
    flush();
  });

  logger.debug('[ErrorTracking] Initialized');
}

/**
 * Manually capture an error
 * @param {Error} error
 * @param {object} [options={}]
 */
export function captureException(error, options = {}) {
  captureError(error, options.type || 'EXCEPTION', options.context);
}

/**
 * Flush all pending errors immediately
 */
export function flushErrors() {
  flush();
}

/**
 * Get buffered errors (for debugging)
 * @returns {Array}
 */
export function getBufferedErrors() {
  return state.errors;
}

/**
 * Disable error tracking
 */
export function disable() {
  config.enabled = false;
  if (state.batchTimer) {
    clearInterval(state.batchTimer);
    state.batchTimer = null;
  }
}

/**
 * Enable error tracking
 */
export function enable() {
  config.enabled = true;
  if (!state.batchTimer) {
    scheduleBatchFlush();
  }
}

/**
 * Configure error tracking
 * @param {Partial<typeof config>} options
 */
export function configure(options = {}) {
  Object.assign(config, options);
}

/**
 * Error tracking singleton
 * @type {{
 *   init: Function,
 *   captureException: Function,
 *   flushErrors: Function,
 *   disable: Function,
 *   enable: Function,
 *   configure: Function,
 *   getBufferedErrors: Function,
 * }}
 */
export const errorTracking = Object.freeze({
  init,
  captureException,
  flushErrors,
  disable,
  enable,
  configure,
  getBufferedErrors,
});

export default errorTracking;
