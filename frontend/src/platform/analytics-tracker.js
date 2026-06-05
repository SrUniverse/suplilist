/**
 * Analytics Tracker — Wrapper for analytics engine
 * @module platform/analytics-tracker
 */

import analyticsEngine from '../analytics/analytics-engine.js';

export class AnalyticsTracker {
  constructor() {
    this.enabled = true;
  }

  /**
   * Track page view
   * @param {string} page - Page name
   * @param {Object} properties - Additional properties
   */
  trackPageView(page, properties = {}) {
    if (!this.enabled) return;
    analyticsEngine.trackEvent('page_view', { page, ...properties });
  }

  /**
   * Track event
   * @param {string} event - Event name
   * @param {Object} properties - Event properties
   */
  trackEvent(event, properties = {}) {
    if (!this.enabled) return;
    analyticsEngine.trackEvent(event, properties);
  }

  /**
   * Track conversion
   * @param {string} conversion - Conversion type
   * @param {number} value - Conversion value
   */
  trackConversion(conversion, value = 0) {
    if (!this.enabled) return;
    analyticsEngine.trackEvent('conversion', { conversion, value });
  }

  /**
   * Identify user
   * @param {string} userId - User ID
   * @param {Object} traits - User traits
   */
  identify(userId, traits = {}) {
    if (!this.enabled) return;
    analyticsEngine.identify(userId, traits);
  }

  /**
   * Enable tracking
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable tracking
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Get enabled status
   * @returns {boolean} Is enabled
   */
  isEnabled() {
    return this.enabled;
  }
}

export default new AnalyticsTracker();
