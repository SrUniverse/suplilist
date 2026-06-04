/**
 * Performance Monitor
 * Tracks Core Web Vitals and custom metrics
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      lcp: null,
      fid: null,
      cls: null,
      ttfb: null,
      fcp: null,
    };
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    this._trackLCP();
    this._trackFID();
    this._trackCLS();
    this._trackTTFB();
    this._trackFCP();
    this._trackNavigationTiming();

    this.isInitialized = true;
  }

  /**
   * Track Largest Contentful Paint (LCP)
   * Target: < 2.5s
   */
  _trackLCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;

        this._reportMetric('lcp', this.metrics.lcp);
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('[Performance] LCP tracking failed:', error);
    }
  }

  /**
   * Track First Input Delay (FID)
   * Target: < 100ms
   */
  _trackFID() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.metrics.fid = entry.processingDuration;
          this._reportMetric('fid', this.metrics.fid);
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('[Performance] FID tracking failed:', error);
    }
  }

  /**
   * Track Cumulative Layout Shift (CLS)
   * Target: < 0.1
   */
  _trackCLS() {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;

      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = clsValue;
            this._reportMetric('cls', this.metrics.cls);
          }
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('[Performance] CLS tracking failed:', error);
    }
  }

  /**
   * Track Time to First Byte (TTFB)
   * Target: < 600ms
   */
  _trackTTFB() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      this.metrics.ttfb = navigation.responseStart - navigation.fetchStart;
      this._reportMetric('ttfb', this.metrics.ttfb);
    }
  }

  /**
   * Track First Contentful Paint (FCP)
   * Target: < 1.8s
   */
  _trackFCP() {
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(p => p.name === 'first-contentful-paint');

    if (fcp) {
      this.metrics.fcp = fcp.startTime;
      this._reportMetric('fcp', this.metrics.fcp);
    }
  }

  /**
   * Track navigation timing
   */
  _trackNavigationTiming() {
    if (document.readyState === 'complete') {
      this._recordNavigationTiming();
    } else {
      window.addEventListener('load', () => this._recordNavigationTiming());
    }
  }

  _recordNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation) return;

    const metrics = {
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      tls: navigation.secureConnectionStart
        ? navigation.connectEnd - navigation.secureConnectionStart
        : 0,
      ttfb: navigation.responseStart - navigation.fetchStart,
      download: navigation.responseEnd - navigation.responseStart,
      domInteractive: navigation.domInteractive - navigation.fetchStart,
      domComplete: navigation.domComplete - navigation.fetchStart,
      loadComplete: navigation.loadEventEnd - navigation.fetchStart,
    };

    Object.entries(metrics).forEach(([name, value]) => {
      this._reportMetric(`nav_${name}`, value);
    });
  }

  /**
   * Report metric to analytics
   */
  _reportMetric(name, value) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', name, {
        value: Math.round(value),
        event_category: 'performance',
        event_label: 'core-web-vitals',
        non_interaction: true,
      });
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.debug(`[Performance] ${name}: ${Math.round(value)}ms`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Check if metrics meet performance budgets
   */
  checkPerformanceBudget() {
    const budget = {
      lcp: { limit: 2500, status: this.metrics.lcp <= 2500 ? 'PASS' : 'FAIL' },
      fid: { limit: 100, status: this.metrics.fid <= 100 ? 'PASS' : 'FAIL' },
      cls: { limit: 0.1, status: this.metrics.cls <= 0.1 ? 'PASS' : 'FAIL' },
      ttfb: { limit: 600, status: this.metrics.ttfb <= 600 ? 'PASS' : 'FAIL' },
      fcp: { limit: 1800, status: this.metrics.fcp <= 1800 ? 'PASS' : 'FAIL' },
    };

    const allPass = Object.values(budget).every(b => b.status === 'PASS');

    if (!allPass && import.meta.env.PROD) {
      console.warn('[Performance Budget] Some metrics exceeded:', budget);
    }

    return budget;
  }
}

// Auto-init when module loads
const monitor = new PerformanceMonitor();
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => monitor.init());
  } else {
    monitor.init();
  }
}

export default monitor;
