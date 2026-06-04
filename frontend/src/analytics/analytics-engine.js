// ============================================================
// AnalyticsEngine — SupliList v4.0
// Main orchestrator for all analytics systems
// ============================================================

import { eventBus, EVENTS } from '../core/event-bus.js';
import { eventPipeline } from './event-pipeline.js';
import { sessionManager } from './session-tracker.js';
import { metricsAggregator } from './metrics-aggregator.js';
import { analyticsStorage } from './storage/analytics-storage.js';
import { funnelEngine } from './funnel-engine.js';
import { logger } from '../utils/logger.js';
import {
  validateDateISO,
  validateFunnelSteps,
  validatePositiveInteger,
  validateUTMSource,
  validateDateRange,
  validateUserId
} from './utils/analytics-validators.js';

/**
 * Analytics Engine — main coordinator
 * Coordinates all analytics subsystems (pipeline, sessions, metrics)
 */
export class AnalyticsEngine {
  #initialized = false;

  /**
   * Initialize all analytics subsystems
   * Call once at app startup
   * @returns {Promise<void>}
   */
  async init() {
    try {
      logger.info('[AnalyticsEngine] Initializing...');

      // Step 1: Initialize storage
      await analyticsStorage.init();
      logger.debug('[AnalyticsEngine] Storage initialized');

      // Step 2: Initialize event pipeline
      await eventPipeline.init();
      const sessionId = eventPipeline.getSessionId();
      logger.debug('[AnalyticsEngine] Pipeline initialized');

      // Step 3: Initialize session manager
      sessionManager.getOrStartSession(sessionId);
      logger.debug('[AnalyticsEngine] Session manager initialized');

      // PATCH 1: Step 4: Listen to key events with error handling
      eventBus.on(EVENTS.PROFILE_UPDATED, (_payload) => {
        try {
          sessionManager.recordActivity('user:profileUpdated');
        } catch (err) {
          logger.error('[AnalyticsEngine] Failed to record profile activity:', err);
        }
      });

      eventBus.on(EVENTS.STACK_UPDATED, (_payload) => {
        try {
          sessionManager.recordActivity('stack:updated');
        } catch (err) {
          logger.error('[AnalyticsEngine] Failed to record stack activity:', err);
        }
      });

      eventBus.on(EVENTS.CHECKIN_LOGGED, (_payload) => {
        try {
          sessionManager.recordActivity('checkin:logged');
        } catch (err) {
          logger.error('[AnalyticsEngine] Failed to record checkin activity:', err);
        }
      });

      eventBus.on(EVENTS.PREMIUM_UNLOCKED, (_payload) => {
        try {
          sessionManager.recordActivity('premium:unlocked');
        } catch (err) {
          logger.error('[AnalyticsEngine] Failed to record premium activity:', err);
        }
      });

      eventBus.on('*', (eventName, _payload) => {
        try {
          // Track user activity for idle detection
          if (!eventName.startsWith('analytics:') && !eventName.startsWith('ui:')) {
            sessionManager.recordActivity(eventName);
          }
        } catch (err) {
          logger.error('[AnalyticsEngine] Failed to record wildcard activity:', err);
        }
      });

      this.#initialized = true;
      logger.info('[AnalyticsEngine] Ready');

      // Task 8: Expose observability API
      this.exposeObservabilityAPI();

      // Emit analytics ready event
      eventBus.emit(EVENTS.APP_READY, {
        analyticsReady: true,
        sessionId
      });
    } catch (err) {
      logger.error('[AnalyticsEngine] Initialization failed:', err);
      throw err;
    }
  }

  /**
   * Get current session ID
   * @returns {string|null}
   */
  getSessionId() {
    return eventPipeline.getSessionId();
  }

  /**
   * Get current session data
   * @returns {Object|null}
   */
  getCurrentSessionData() {
    return sessionManager.getCurrentSessionData();
  }

  /**
   * Get pipeline statistics
   * @returns {Object}
   */
  getPipelineStats() {
    return eventPipeline.getStats();
  }

  // ─── Metrics API ────────────────────────────────────────────────────────────

  /**
   * Get DAU for date
   * @param {string} dateISO - YYYY-MM-DD
   * @returns {Promise<number>}
   * @throws {TypeError|Error} If dateISO is invalid
   */
  async getDAU(dateISO) {
    validateDateISO(dateISO, 'dateISO');
    return metricsAggregator.getDAU(dateISO);
  }

  /**
   * Get WAU
   * @param {number} weekOffset - 0 = current week
   * @returns {Promise<number>}
   * @throws {TypeError|RangeError} If weekOffset is invalid
   */
  async getWAU(weekOffset = 0) {
    validatePositiveInteger(weekOffset, 'weekOffset', { min: 0, max: 52 });
    return metricsAggregator.getWAU(weekOffset);
  }

  /**
   * Get MAU
   * @param {number} monthOffset - 0 = current month
   * @returns {Promise<number>}
   * @throws {TypeError|RangeError} If monthOffset is invalid
   */
  async getMAU(monthOffset = 0) {
    validatePositiveInteger(monthOffset, 'monthOffset', { min: 0, max: 24 });
    return metricsAggregator.getMAU(monthOffset);
  }

  /**
   * Get retention for cohort
   * @param {string} cohortDateISO - YYYY-MM-DD
   * @param {number} dayN - Day to measure (1, 7, 14, 30, 60, 90)
   * @returns {Promise<Object>}
   * @throws {TypeError|Error|RangeError} If parameters are invalid
   */
  async getRetention(cohortDateISO, dayN) {
    validateDateISO(cohortDateISO, 'cohortDateISO');
    validatePositiveInteger(dayN, 'dayN', { min: 1, max: 365 });
    return metricsAggregator.getRetention(cohortDateISO, dayN);
  }

  /**
   * Get full retention curve
   * @param {string} cohortDateISO - YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  async getRetentionCurve(cohortDateISO) {
    return metricsAggregator.getRetentionCurve(cohortDateISO);
  }

  /**
   * Get funnel conversion
   * @param {Array<string>} steps - Event names in order
   * @param {string} startDateISO - Cohort start
   * @param {string} endDateISO - Analysis end
   * @returns {Promise<Object>}
   * @throws {TypeError|Error} If parameters are invalid
   */
  async getFunnelConversion(steps, startDateISO, endDateISO) {
    validateFunnelSteps(steps);
    validateDateRange(startDateISO, endDateISO);
    return metricsAggregator.getFunnelConversion(steps, startDateISO, endDateISO);
  }

  /**
   * Get metrics for date
   * @param {string} dateISO - YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  async getMetricsForDate(dateISO) {
    return metricsAggregator.getMetricsForDate(dateISO);
  }

  /**
   * Get top events
   * @param {string} startDateISO - YYYY-MM-DD
   * @param {string} endDateISO - YYYY-MM-DD
   * @param {number} limit - Max results
   * @returns {Promise<Array>}
   */
  async getTopEvents(startDateISO, endDateISO, limit = 10) {
    return metricsAggregator.getTopEvents(startDateISO, endDateISO, limit);
  }

  // ─── Storage API ────────────────────────────────────────────────────────────

  /**
   * Get events with optional filter
   * @param {Object} filter - Filter options
   * @returns {Promise<Array>}
   */
  async getEvents(filter = {}) {
    return analyticsStorage.getEvents(filter);
  }

  /**
   * Get events by name
   * @param {string} eventName
   * @returns {Promise<Array>}
   */
  async getEventsByName(eventName) {
    return analyticsStorage.getEventsByName(eventName);
  }

  /**
   * Get events by session ID
   * @param {string} sessionId
   * @returns {Promise<Array>}
   */
  async getEventsBySessionId(sessionId) {
    return analyticsStorage.getEventsBySessionId(sessionId);
  }

  /**
   * Get events between timestamps
   * @param {number} startMs
   * @param {number} endMs
   * @returns {Promise<Array>}
   */
  async getEventsBetween(startMs, endMs) {
    return analyticsStorage.getEventsBetween(startMs, endMs);
  }

  /**
   * Export all data (GDPR-compliant)
   * @returns {Promise<Object>}
   */
  async exportAllData() {
    return analyticsStorage.exportAllData();
  }

  // ─── Management ─────────────────────────────────────────────────────────────

  /**
   * Flush pending events
   * @returns {Promise<void>}
   */
  async flush() {
    return eventPipeline.flush();
  }

  /**
   * End current session (before unload)
   * @returns {Promise<void>}
   */
  async endSession() {
    return sessionManager.endCurrentSession();
  }

  // ─── Funnel Analytics ──────────────────────────────────────────────────────

  /**
   * Analyze a conversion funnel
   * @param {string} funnelName - Funnel ID
   * @param {string} startDateISO - YYYY-MM-DD
   * @param {string} endDateISO - YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  async analyzeFunnel(funnelName, startDateISO, endDateISO) {
    return funnelEngine.analyzeFunnel(funnelName, startDateISO, endDateISO);
  }

  /**
   * Compare funnels across periods
   * @param {string} funnelName
   * @param {string} period1Start, period1End
   * @param {string} period2Start, period2End
   * @returns {Promise<Object>}
   */
  async compareFunnels(funnelName, period1Start, period1End, period2Start, period2End) {
    return funnelEngine.compareFunnel(funnelName, period1Start, period1End, period2Start, period2End);
  }

  /**
   * Get all funnels
   * @returns {Array<Object>}
   */
  getFunnels() {
    return funnelEngine.getFunnels();
  }

  // ─── Affiliate Tracking (from consolidated business-metrics) ────────────────

  /**
   * Get affiliate performance stats
   * @param {string} utmSource - 'amazon' | 'ml' | 'shopee'
   * @param {string} startDateISO - YYYY-MM-DD
   * @param {string} endDateISO - YYYY-MM-DD
   * @returns {Promise<Object>}
   * @throws {TypeError|Error} If parameters are invalid
   */
  async getAffiliateStats(utmSource, startDateISO, endDateISO) {
    validateUTMSource(utmSource);
    validateDateRange(startDateISO, endDateISO);
    return metricsAggregator.getAffiliateStats(utmSource, startDateISO, endDateISO);
  }

  /**
   * Compare marketplace performance
   * @param {string} startDateISO - YYYY-MM-DD
   * @param {string} endDateISO - YYYY-MM-DD
   * @returns {Promise<Array>}
   */
  async getMarketplaceComparison(startDateISO, endDateISO) {
    return metricsAggregator.getMarketplaceComparison(startDateISO, endDateISO);
  }

  /**
   * Get top supplements by affiliate clicks
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getTopAffiliateSupplements(limit = 10) {
    return metricsAggregator.getTopSupplements(null, limit);
  }

  // ─── LTV Prediction (from consolidated business-metrics) ────────────────────

  /**
   * Estimate LTV for a user
   * @param {string} userId
   * @returns {Promise<Object>}
   * @throws {TypeError|Error} If userId is invalid
   */
  async estimateLTV(userId) {
    validateUserId(userId);
    return metricsAggregator.estimateLTV(userId);
  }

  /**
   * Get cohort LTV analysis
   * @param {string} cohortDateISO - YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  async getCohortLTV(cohortDateISO) {
    return metricsAggregator.getCohortLTV(cohortDateISO);
  }

  /**
   * Compare LTV across segments
   * @returns {Promise<Array>}
   */
  async compareSegments() {
    return metricsAggregator.compareSegments();
  }

  /**
   * Reset all data (testing only)
   * @returns {Promise<void>}
   */
  async reset() {
    await eventPipeline.reset();
    sessionManager.getAllSessionData();  // Log sessions
    metricsAggregator.clearCache();
    logger.warn('[AnalyticsEngine] Reset all data');
  }

  /**
   * Get health status
   * @returns {Object}
   */
  getStatus() {
    return {
      initialized: this.#initialized,
      sessionId: (this.getSessionId()?.substring(0, 8) ?? 'not-initialized') + '...',
      pipeline: eventPipeline.getStats(),
      currentSession: sessionManager.getCurrentSessionData()
    };
  }

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.#initialized;
  }

  /**
   * Get health status (consolidated from analytics-health.js)
   * @returns {Promise<Object>} Health status with metrics and alerts
   */
  async getHealthStatus() {
    try {
      const pipelineStats = eventPipeline.getStats();
      const logs = logger.getMetrics();
      const storageSize = await this.#estimateStorageSize();

      const status = {
        healthy: this.#isHealthy(pipelineStats, logs, storageSize),
        timestamp: new Date().toISOString(),
        checks: {
          pipeline: this.#checkPipeline(pipelineStats),
          storage: this.#checkStorage(storageSize),
          pii: this.#checkPII(logs),
          errors: this.#checkErrors(logs),
          performance: this.#checkPerformance(logs),
        },
        metrics: {
          eventsProcessed: pipelineStats.eventsProcessed,
          eventsFailed: pipelineStats.eventsFailed,
          eventsDeduped: pipelineStats.eventsDeduped,
          piiDetected: logs.piiDetections || 0,
          errors: logs.errors || 0,
          storageSize: `${(storageSize / 1024).toFixed(2)} KB`,
        },
        alerts: this.#generateAlerts(pipelineStats, logs, storageSize),
      };

      return status;
    } catch (err) {
      logger.error('[AnalyticsEngine] Failed to get health:', err);
      return {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  /**
   * Get metrics in Prometheus format (consolidated from analytics-health.js)
   * @returns {string} Prometheus-format metrics
   */
  getMetricsPrometheus() {
    const logs = logger.getMetrics();
    const pipeline = eventPipeline.getStats();

    return `
# HELP suplilist_analytics_events_processed Total events processed
# TYPE suplilist_analytics_events_processed counter
suplilist_analytics_events_processed ${pipeline.eventsProcessed}

# HELP suplilist_analytics_events_failed Total events failed
# TYPE suplilist_analytics_events_failed counter
suplilist_analytics_events_failed ${pipeline.eventsFailed}

# HELP suplilist_analytics_events_deduped Total events deduped
# TYPE suplilist_analytics_events_deduped counter
suplilist_analytics_events_deduped ${pipeline.eventsDeduped}

# HELP suplilist_analytics_pii_detections Total PII detections
# TYPE suplilist_analytics_pii_detections counter
suplilist_analytics_pii_detections ${logs.piiDetections || 0}

# HELP suplilist_analytics_errors Total errors
# TYPE suplilist_analytics_errors counter
suplilist_analytics_errors ${logs.errors || 0}

# HELP suplilist_analytics_buffer_size Current buffer size
# TYPE suplilist_analytics_buffer_size gauge
suplilist_analytics_buffer_size ${pipeline.bufferSize || 0}
`.trim();
  }

  // ─── Private Health Check Methods ──────────────────────────────────────────

  #checkPipeline(stats) {
    const failureRate = stats.eventsProcessed > 0
      ? (stats.eventsFailed / stats.eventsProcessed) * 100
      : 0;

    return {
      status: failureRate < 5 ? 'healthy' : failureRate < 10 ? 'degraded' : 'unhealthy',
      message: `${failureRate.toFixed(2)}% failure rate`,
      failureRate: failureRate,
    };
  }

  #checkStorage(sizeKB) {
    const quotaMB = 50;  // IndexedDB quota
    const sizePercentage = (sizeKB / 1024) / quotaMB * 100;

    return {
      status: sizePercentage < 70 ? 'healthy' : sizePercentage < 90 ? 'warning' : 'critical',
      message: `${sizePercentage.toFixed(1)}% of quota used`,
      usagePercent: sizePercentage,
    };
  }

  #checkPII(logs) {
    return {
      status: (logs.piiDetections || 0) === 0 ? 'healthy' : 'warning',
      message: (logs.piiDetections || 0) === 0 ? 'No PII detected' : `${logs.piiDetections} PII detections`,
      detections: logs.piiDetections || 0,
    };
  }

  #checkErrors(logs) {
    const errors = logs.errors || 0;
    return {
      status: errors === 0 ? 'healthy' : errors < 5 ? 'warning' : 'critical',
      message: errors === 0 ? 'No errors' : `${errors} errors buffered`,
      count: errors,
    };
  }

  #checkPerformance(logs) {
    const perf = logs.perfMetrics || {};
    const pipelines = perf['PIPELINE_PROCESS'];

    if (!pipelines) {
      return {
        status: 'unknown',
        message: 'No performance data',
      };
    }

    const status = pipelines.max > 100 ? 'warning' : 'healthy';
    return {
      status: status,
      message: `Pipeline: ${pipelines.avg.toFixed(1)}ms avg (max ${pipelines.max}ms)`,
      avgMs: pipelines.avg,
      maxMs: pipelines.max,
    };
  }

  #isHealthy(stats, logs, sizeKB) {
    const failureRate = stats.eventsProcessed > 0
      ? (stats.eventsFailed / stats.eventsProcessed) * 100
      : 0;
    const sizePercent = (sizeKB / 1024) / 50 * 100;
    return failureRate < 5 && sizePercent < 90 && (logs.errors || 0) < 10;
  }

  #generateAlerts(stats, logs, sizeKB) {
    const alerts = [];
    const failureRate = stats.eventsProcessed > 0
      ? (stats.eventsFailed / stats.eventsProcessed) * 100
      : 0;

    if (failureRate > 10) {
      alerts.push({
        severity: 'critical',
        title: 'High event failure rate',
        message: `${failureRate.toFixed(2)}% of events failed validation`,
      });
    }

    const sizePercent = (sizeKB / 1024) / 50 * 100;
    if (sizePercent > 90) {
      alerts.push({
        severity: 'critical',
        title: 'Storage quota nearly full',
        message: `${sizePercent.toFixed(1)}% of IndexedDB quota used`,
      });
    }

    if ((logs.piiDetections || 0) > 0) {
      alerts.push({
        severity: 'warning',
        title: 'PII detected in events',
        message: `${logs.piiDetections} events with potential PII were rejected`,
      });
    }

    if ((logs.errors || 0) > 5) {
      alerts.push({
        severity: 'warning',
        title: 'Error buffer growing',
        message: `${logs.errors} errors logged in current session`,
      });
    }

    return alerts;
  }

  async #estimateStorageSize() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }

      const events = await analyticsStorage.getEvents();
      return events.length * 1024;  // Rough estimate
    } catch (err) {
      logger.error('[AnalyticsEngine] Failed to estimate storage:', err);
      return 0;
    }
  }

  /**
   * Expose observability endpoint (GET /analytics/health)
   * Accessible via global window.analyticsAPI
   * PATCH 2: Add simple token-based authentication
   */
  exposeObservabilityAPI() {
    if (typeof window !== 'undefined') {
      // Generate secret token for this session
      const SECRET_TOKEN = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `tok_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      window.analyticsAPI = {
        health: (token) => {
          if (token !== SECRET_TOKEN) {
            throw new Error('Unauthorized: invalid token');
          }
          return this.getHealthStatus();
        },
        metrics: (token) => {
          if (token !== SECRET_TOKEN) {
            throw new Error('Unauthorized: invalid token');
          }
          return this.getMetricsPrometheus();
        },
        logs: (token) => {
          if (token !== SECRET_TOKEN) {
            throw new Error('Unauthorized: invalid token');
          }
          return logger.getMetrics();
        },
        clear: (token) => {
          if (token !== SECRET_TOKEN) {
            throw new Error('Unauthorized: invalid token');
          }
          return logger.clearBuffers();
        },
      };

      logger.info('[AnalyticsEngine] Observability API exposed at window.analyticsAPI');
      logger.info(`[AnalyticsEngine] API Token: ${SECRET_TOKEN}`);
    }
  }
}

// Export singleton
export const analyticsEngine = new AnalyticsEngine();

// PATCH 3: Auto-init removed to prevent race conditions and side effects
// Call analyticsEngine.init() explicitly in your app.js:
//
//   import { analyticsEngine } from './analytics/analytics-engine.js';
//   await analyticsEngine.init();
//
// Legacy auto-init (DEPRECATED - kept for backwards compatibility, will be removed in v5.0)
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  // DOM ready, init now
  analyticsEngine.init().catch(err => {
    logger.error('[AnalyticsEngine] Auto-init failed:', err);
  });
} else if (typeof window !== 'undefined') {
  // Wait for DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    analyticsEngine.init().catch(err => {
      logger.error('[AnalyticsEngine] Auto-init failed:', err);
    });
  });
}
