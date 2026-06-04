// ============================================================
// Analytics Health & Observability — SupliList v4.0
// Status endpoint, metrics export, alerts
// ============================================================

import { logger } from '../utils/logger.js';
import { analyticsStorage } from './storage/analytics-storage.js';
import { eventPipeline } from './event-pipeline.js';

/**
 * Health status for analytics system
 */
class AnalyticsHealth {
  /**
   * Get current health status
   * @returns {Promise<Object>} Health status object
   */
  async getHealth() {
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
          piiDetected: logs.piiDetections,
          errors: logs.errors,
          storageSize: `${(storageSize / 1024).toFixed(2)} KB`,
        },
        alerts: this.#generateAlerts(pipelineStats, logs, storageSize),
      };

      return status;
    } catch (err) {
      logger.error('[AnalyticsHealth] Failed to get health:', err);
      return {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  /**
   * Check pipeline health
   * @private
   */
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

  /**
   * Check storage health
   * @private
   */
  #checkStorage(sizeKB) {
    // IndexedDB quota is typically 50MB
    const quotaMB = 50;
    const sizePercentage = (sizeKB / 1024) / quotaMB * 100;

    return {
      status: sizePercentage < 70 ? 'healthy' : sizePercentage < 90 ? 'warning' : 'critical',
      message: `${sizePercentage.toFixed(1)}% of quota used`,
      usagePercent: sizePercentage,
    };
  }

  /**
   * Check PII detection
   * @private
   */
  #checkPII(logs) {
    return {
      status: logs.piiDetections === 0 ? 'healthy' : 'warning',
      message: logs.piiDetections === 0 ? 'No PII detected' : `${logs.piiDetections} PII detections`,
      detections: logs.piiDetections,
    };
  }

  /**
   * Check error count
   * @private
   */
  #checkErrors(logs) {
    return {
      status: logs.errors === 0 ? 'healthy' : logs.errors < 5 ? 'warning' : 'critical',
      message: logs.errors === 0 ? 'No errors' : `${logs.errors} errors buffered`,
      count: logs.errors,
    };
  }

  /**
   * Check performance metrics
   * @private
   */
  #checkPerformance(logs) {
    const perf = logs.perfMetrics;
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

  /**
   * Determine overall health status
   * @private
   */
  #isHealthy(stats, logs, sizeKB) {
    const failureRate = stats.eventsProcessed > 0
      ? (stats.eventsFailed / stats.eventsProcessed) * 100
      : 0;
    const sizePercent = (sizeKB / 1024) / 50 * 100;

    // Healthy if: <5% failure rate, <90% storage, <10 errors
    return failureRate < 5 && sizePercent < 90 && logs.errors < 10;
  }

  /**
   * Generate alerts
   * @private
   */
  #generateAlerts(stats, logs, sizeKB) {
    const alerts = [];

    // High failure rate alert
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

    // Storage full alert
    const sizePercent = (sizeKB / 1024) / 50 * 100;
    if (sizePercent > 90) {
      alerts.push({
        severity: 'critical',
        title: 'Storage quota nearly full',
        message: `${sizePercent.toFixed(1)}% of IndexedDB quota used`,
      });
    }

    // PII detection alert
    if (logs.piiDetections > 0) {
      alerts.push({
        severity: 'warning',
        title: 'PII detected in events',
        message: `${logs.piiDetections} events with potential PII were rejected`,
      });
    }

    // Error buffer alert
    if (logs.errors > 5) {
      alerts.push({
        severity: 'warning',
        title: 'Error buffer growing',
        message: `${logs.errors} errors logged in current session`,
      });
    }

    return alerts;
  }

  /**
   * Estimate IndexedDB storage size
   * @private
   */
  async #estimateStorageSize() {
    try {
      // Try to get actual storage estimate
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }

      // Fallback: estimate from event count (rough ~1KB per event)
      const events = await analyticsStorage.getEvents();
      return events.length * 1024; // Rough estimate
    } catch (err) {
      logger.error('[AnalyticsHealth] Failed to estimate storage:', err);
      return 0;
    }
  }

  /**
   * Export metrics in Prometheus format (optional)
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
suplilist_analytics_pii_detections ${logs.piiDetections}

# HELP suplilist_analytics_errors Total errors
# TYPE suplilist_analytics_errors counter
suplilist_analytics_errors ${logs.errors}

# HELP suplilist_analytics_buffer_size Current buffer size
# TYPE suplilist_analytics_buffer_size gauge
suplilist_analytics_buffer_size ${pipeline.bufferSize || 0}
`.trim();
  }
}

// Export singleton
export const analyticsHealth = new AnalyticsHealth();
