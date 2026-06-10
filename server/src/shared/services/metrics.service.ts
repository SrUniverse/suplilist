/**
 * MetricsService — Prometheus metrics for monitoring
 * Tracks: crawl performance, cache hits/misses, API latency, circuit breaker state
 */

import { CircuitState } from './circuit-breaker.service.js';

interface MetricCounter {
  value: number;
  labels?: Record<string, string>;
}

interface MetricHistogram {
  buckets: number[];
  count: number;
  sum: number;
  labels?: Record<string, string>;
}

interface MetricGauge {
  value: number;
  labels?: Record<string, string>;
}

export class MetricsService {
  private counters: Map<string, MetricCounter> = new Map();
  private histograms: Map<string, MetricHistogram> = new Map();
  private gauges: Map<string, MetricGauge> = new Map();
  private enabled = process.env.METRICS_ENABLED !== 'false';

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>, value = 1): void {
    if (!this.enabled) return;

    const key = this.makeKey(name, labels);
    const current = this.counters.get(key) || { value: 0, labels };
    current.value += value;
    this.counters.set(key, current);
  }

  /**
   * Record a histogram (latency, size, etc.)
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return;

    const key = this.makeKey(name, labels);
    let histogram = this.histograms.get(key);

    if (!histogram) {
      histogram = {
        buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
        count: 0,
        sum: 0,
        labels,
      };
    }

    histogram.count++;
    histogram.sum += value;
    this.histograms.set(key, histogram);
  }

  /**
   * Set a gauge metric (current state value)
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return;

    const key = this.makeKey(name, labels);
    this.gauges.set(key, { value, labels });
  }

  /**
   * Get Prometheus-formatted metrics
   */
  getMetrics(): string {
    if (!this.enabled) return '# Metrics disabled\n';

    let output = '# HELP\n# TYPE\n';

    // Counters
    for (const [key, counter] of this.counters) {
      output += `${key} ${counter.value}\n`;
    }

    // Histograms
    for (const [key, histogram] of this.histograms) {
      output += `${key}_total ${histogram.sum}\n`;
      output += `${key}_count ${histogram.count}\n`;
      output += `${key}_avg ${(histogram.sum / histogram.count).toFixed(2)}\n`;
    }

    // Gauges
    for (const [key, gauge] of this.gauges) {
      output += `${key} ${gauge.value}\n`;
    }

    return output;
  }

  /**
   * Track supplement crawl metrics
   */
  recordCrawlMetrics(source: string, itemsCount: number, durationMs: number): void {
    this.incrementCounter('supplements_crawl_total', { source });
    this.incrementCounter('supplements_items_total', { source }, itemsCount);
    this.recordHistogram('supplements_crawl_duration_ms', durationMs, { source });
  }

  /**
   * Track cache performance
   */
  recordCacheHit(operation: string): void {
    this.incrementCounter('cache_hits_total', { operation });
  }

  recordCacheMiss(operation: string): void {
    this.incrementCounter('cache_misses_total', { operation });
  }

  /**
   * Track API latency
   */
  recordApiLatency(endpoint: string, method: string, durationMs: number): void {
    this.recordHistogram('api_latency_ms', durationMs, { endpoint, method });
  }

  /**
   * Circuit breaker state change: record state transition
   * CLOSED=0, OPEN=1, HALF_OPEN=2
   */
  recordCircuitBreakerStateChange(prevState: CircuitState, nextState: CircuitState): void {
    if (!this.enabled) return;

    this.incrementCounter('circuit_breaker_state_changes_total', { transition: `${prevState}_to_${nextState}` });

    // Record current state as gauge
    const stateValue = this.getStateValue(nextState);
    this.setGauge('circuit_breaker_state', stateValue, { name: 'firecrawl' });
  }

  /**
   * Record successful Firecrawl request
   */
  recordFirecrawlSuccess(url: string): void {
    if (!this.enabled) return;

    this.incrementCounter('firecrawl_requests_success_total');
    this.incrementCounter('circuit_breaker_recoveries_total'); // Success after circuit was at risk
  }

  /**
   * Record failed Firecrawl request
   */
  recordFirecrawlFailure(url: string): void {
    if (!this.enabled) return;

    this.incrementCounter('circuit_breaker_failures_total');
  }

  /**
   * Record circuit breaker fallback usage
   */
  recordCircuitBreakerFallback(): void {
    if (!this.enabled) return;

    this.incrementCounter('circuit_breaker_fallback_total');
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  /**
   * Helper: Convert circuit state to numeric value for gauge
   */
  private getStateValue(state: CircuitState): number {
    switch (state) {
      case CircuitState.CLOSED:
        return 0;
      case CircuitState.OPEN:
        return 1;
      case CircuitState.HALF_OPEN:
        return 2;
      default:
        return -1;
    }
  }

  /**
   * Helper: Create consistent metric key with labels
   */
  private makeKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}

export const metricsService = new MetricsService();
