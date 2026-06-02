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
import { affiliateTracker } from './affiliate-tracker.js';
import { ltvPredictor } from './ltv-predictor.js';
import { analyticsHealth } from './analytics-health.js';
import { logger } from '../utils/logger.js';

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

      // Step 4: Listen to key events for context
      eventBus.on(EVENTS.PROFILE_UPDATED, (payload) => {
        sessionManager.recordActivity('user:profileUpdated');
      });

      eventBus.on(EVENTS.STACK_UPDATED, (payload) => {
        sessionManager.recordActivity('stack:updated');
      });

      eventBus.on(EVENTS.CHECKIN_LOGGED, (payload) => {
        sessionManager.recordActivity('checkin:logged');
      });

      eventBus.on(EVENTS.PREMIUM_UNLOCKED, (payload) => {
        sessionManager.recordActivity('premium:unlocked');
      });

      eventBus.on('*', (eventName, payload) => {
        // Track user activity for idle detection
        if (!eventName.startsWith('analytics:') && !eventName.startsWith('ui:')) {
          sessionManager.recordActivity(eventName);
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
   */
  async getDAU(dateISO) {
    return metricsAggregator.getDAU(dateISO);
  }

  /**
   * Get WAU
   * @param {number} weekOffset - 0 = current week
   * @returns {Promise<number>}
   */
  async getWAU(weekOffset = 0) {
    return metricsAggregator.getWAU(weekOffset);
  }

  /**
   * Get MAU
   * @param {number} monthOffset - 0 = current month
   * @returns {Promise<number>}
   */
  async getMAU(monthOffset = 0) {
    return metricsAggregator.getMAU(monthOffset);
  }

  /**
   * Get retention for cohort
   * @param {string} cohortDateISO - YYYY-MM-DD
   * @param {number} dayN - Day to measure (1, 7, 14, 30, 60, 90)
   * @returns {Promise<Object>}
   */
  async getRetention(cohortDateISO, dayN) {
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
   */
  async getFunnelConversion(steps, startDateISO, endDateISO) {
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

  // ─── Affiliate Tracking ─────────────────────────────────────────────────────

  /**
   * Get affiliate performance stats
   * @param {string} utmSource - 'amazon' | 'ml' | 'shopee'
   * @param {string} startDateISO - YYYY-MM-DD
   * @param {string} endDateISO - YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  async getAffiliateStats(utmSource, startDateISO, endDateISO) {
    return affiliateTracker.getSourceStats(utmSource, startDateISO, endDateISO);
  }

  /**
   * Compare marketplace performance
   * @param {string} startDateISO - YYYY-MM-DD
   * @param {string} endDateISO - YYYY-MM-DD
   * @returns {Promise<Array>}
   */
  async getMarketplaceComparison(startDateISO, endDateISO) {
    return affiliateTracker.getMarketplaceComparison(startDateISO, endDateISO);
  }

  /**
   * Get top supplements by affiliate clicks
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getTopAffiliateSupplements(limit = 10) {
    return affiliateTracker.getTopSupplements(null, limit);
  }

  // ─── LTV Prediction ────────────────────────────────────────────────────────

  /**
   * Estimate LTV for a user
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async estimateLTV(userId) {
    return ltvPredictor.estimateLTV(userId);
  }

  /**
   * Get cohort LTV analysis
   * @param {string} cohortDateISO - YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  async getCohortLTV(cohortDateISO) {
    return ltvPredictor.getCohortLTV(cohortDateISO);
  }

  /**
   * Compare LTV across segments
   * @returns {Promise<Array>}
   */
  async compareSegments() {
    return ltvPredictor.compareSegments();
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
      sessionId: this.getSessionId()?.substring(0, 8) + '...',
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
   * Get health status (Task 8: Dashboard Observability)
   * @returns {Promise<Object>} Health status with metrics and alerts
   */
  async getHealthStatus() {
    return analyticsHealth.getHealth();
  }

  /**
   * Get metrics in Prometheus format (optional external monitoring)
   * @returns {string} Prometheus-format metrics
   */
  getMetricsPrometheus() {
    return analyticsHealth.getMetricsPrometheus();
  }

  /**
   * Expose observability endpoint (GET /analytics/health)
   * Accessible via global window.analyticsAPI
   */
  exposeObservabilityAPI() {
    if (typeof window !== 'undefined') {
      window.analyticsAPI = {
        health: () => this.getHealthStatus(),
        metrics: () => this.getMetricsPrometheus(),
        logs: () => logger.getMetrics(),
        clear: () => logger.clearBuffers(),
      };
      logger.info('[AnalyticsEngine] Observability API exposed at window.analyticsAPI');
    }
  }
}

// Export singleton
export const analyticsEngine = new AnalyticsEngine();

// Auto-initialize on import (optional, can be called manually)
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
