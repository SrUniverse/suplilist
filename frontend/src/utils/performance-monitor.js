/**
 * Performance Monitor — Measure and report component render times
 * Tracks FCP, LCP, CLS, TTFB via Web Vitals API
 * Usage: performanceMonitor.track('ComponentName', () => { /* work */ })
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.vitals = {};
    this._initialized = false;
    this.measurementThreshold = 16; // 60fps baseline
  }

  /**
   * Initialize Web Vitals monitoring (run once at app startup)
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    // Capture Web Vitals using PerformanceObserver
    if ('PerformanceObserver' in window) {
      // Paint timings (FCP, LCP)
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.vitals[entry.name] = entry.startTime;
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
      } catch (_) {}

      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            this.vitals.LCP = entries[entries.length - 1].renderTime || entries[entries.length - 1].loadTime;
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (_) {}

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              this.vitals.CLS = (this.vitals.CLS || 0) + entry.value;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (_) {}
    }

    // Measure Time to First Byte
    if (performance.timing) {
      this.vitals.TTFB = performance.timing.responseStart - performance.timing.navigationStart;
    }
  }

  /**
   * Track execution time of a function
   * @param {string} name - Metric name (e.g., "ListPageRender", "FilterOperation")
   * @param {Function} fn - Function to measure
   * @returns {*} Function result
   */
  track(name, fn) {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this._recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this._recordMetric(name, duration, true);
      throw error;
    }
  }

  /**
   * Track async function execution
   * @param {string} name - Metric name
   * @param {Function} fn - Async function to measure
   * @returns {Promise<*>} Promise from function
   */
  async trackAsync(name, fn) {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this._recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this._recordMetric(name, duration, true);
      throw error;
    }
  }

  /**
   * Record a performance metric
   * @private
   */
  _recordMetric(name, duration, isError = false) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const entry = { duration, timestamp: Date.now(), isError };
    this.metrics.get(name).push(entry);

    // Log slow operations (> threshold)
    if (duration > this.measurementThreshold && !isError) {
      console.warn(`[Performance] ${name}: ${duration.toFixed(2)}ms (threshold: ${this.measurementThreshold}ms)`);
    }
  }

  /**
   * Get average duration for a metric
   * @param {string} name - Metric name
   * @returns {number|null} Average duration or null if not found
   */
  getAverage(name) {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return null;
    const total = samples.reduce((sum, e) => sum + e.duration, 0);
    return total / samples.length;
  }

  /**
   * Get Web Vitals report
   * @returns {Object} Vitals object with FCP, LCP, CLS, TTFB
   */
  getVitals() {
    return { ...this.vitals };
  }

  /**
   * Get all metrics summary
   * @returns {Object} Summary of all metrics
   */
  getSummary() {
    const summary = {};
    for (const [name, samples] of this.metrics.entries()) {
      const errors = samples.filter(s => s.isError).length;
      const validSamples = samples.filter(s => !s.isError);
      summary[name] = {
        count: samples.length,
        errors,
        avgDuration: validSamples.length > 0 
          ? validSamples.reduce((sum, e) => sum + e.duration, 0) / validSamples.length 
          : 0,
        minDuration: validSamples.length > 0 
          ? Math.min(...validSamples.map(e => e.duration))
          : 0,
        maxDuration: validSamples.length > 0 
          ? Math.max(...validSamples.map(e => e.duration))
          : 0,
      };
    }
    return summary;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.vitals = {};
  }

  /**
   * Log report to console
   */
  report() {
    console.group('[Performance Report]');
    console.log('Web Vitals:', this.getVitals());
    console.table(this.getSummary());
    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();
