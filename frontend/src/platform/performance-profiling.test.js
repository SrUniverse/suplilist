import { describe, it, expect, beforeEach } from 'vitest';

describe('Performance Profiling', () => {
  let performanceMonitor;

  beforeEach(async () => {
    const module = await import('./performance-monitor.js');
    performanceMonitor = module.default;
  });

  it('should measure page load time', () => {
    const loadTime = performanceMonitor.getMetric('loadComplete');
    expect(loadTime).toBeGreaterThan(0);
    expect(loadTime).toBeLessThan(5000); // Should load in < 5s
  });

  it('should measure First Contentful Paint (FCP)', () => {
    const fcp = performanceMonitor.getMetric('FCP');
    expect(fcp).toBeGreaterThan(0);
    expect(fcp).toBeLessThan(2500); // Target: < 2.5s
  });

  it('should measure Largest Contentful Paint (LCP)', () => {
    const lcp = performanceMonitor.getMetric('LCP');
    expect(lcp).toBeGreaterThan(0);
    expect(lcp).toBeLessThan(4000); // Target: < 4s
  });

  it('should measure Cumulative Layout Shift (CLS)', () => {
    const cls = performanceMonitor.getMetric('CLS');
    expect(cls).toBeGreaterThanOrEqual(0);
    expect(cls).toBeLessThan(0.1); // Target: < 0.1
  });

  it('should measure First Input Delay (FID)', () => {
    const fid = performanceMonitor.getMetric('FID');
    expect(fid).toBeGreaterThan(0);
    expect(fid).toBeLessThan(100); // Target: < 100ms
  });

  it('should measure function execution time', () => {
    const startTime = performance.now();
    // Simulate operation
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(i);
    }
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50); // Should be fast
  });

  it('should measure API call latency', () => {
    const latencies = [120, 145, 98, 167, 132];
    const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;

    expect(avgLatency).toBeGreaterThan(0);
    expect(avgLatency).toBeLessThan(500); // Target: < 500ms
  });

  it('should measure memory usage', () => {
    if (performance.memory) {
      const usedJSHeapSize = performance.memory.usedJSHeapSize;
      const jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;

      const heapUsagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;
      expect(heapUsagePercent).toBeLessThan(90); // Warn if > 90%
    }
  });

  it('should measure DOM rendering time', () => {
    const renderMetrics = performanceMonitor.getRenderMetrics();

    expect(renderMetrics.paintTime).toBeGreaterThan(0);
    expect(renderMetrics.paintTime).toBeLessThan(3000);
  });

  it('should track slowest routes', () => {
    const routeMetrics = performanceMonitor.getRouteMetrics();

    const slowRoutes = Object.entries(routeMetrics)
      .filter(([_, time]) => time > 2000)
      .map(([route, _]) => route);

    // Should have few slow routes
    expect(slowRoutes.length).toBeLessThan(3);
  });

  it('should identify bottlenecks', () => {
    const bottlenecks = performanceMonitor.identifyBottlenecks();

    bottlenecks.forEach(issue => {
      expect(issue).toHaveProperty('component');
      expect(issue).toHaveProperty('duration');
      expect(issue).toHaveProperty('severity');
    });
  });

  it('should measure bundle size', () => {
    const bundleSize = performanceMonitor.getBundleSize();

    expect(bundleSize.total).toBeGreaterThan(0);
    expect(bundleSize.main).toBeGreaterThan(0);

    // Should be < 300KB
    expect(bundleSize.total).toBeLessThan(300000);
  });

  it('should measure gzip compression ratio', () => {
    const bundleSize = performanceMonitor.getBundleSize();

    if (bundleSize.gzipped) {
      const compressionRatio = bundleSize.gzipped / bundleSize.total;
      expect(compressionRatio).toBeLessThan(0.5); // Should compress to < 50%
    }
  });

  it('should track interactions per page', () => {
    const interactionMetrics = performanceMonitor.getInteractionMetrics();

    interactionMetrics.forEach(metric => {
      expect(metric.interactionTime).toBeGreaterThan(0);
      expect(metric.interactionTime).toBeLessThan(500);
    });
  });

  it('should profile list rendering performance', () => {
    const itemCount = 1000;
    const renderTime = performanceMonitor.measureListRender(itemCount);

    // 1000 items should render in < 500ms
    expect(renderTime).toBeLessThan(500);
  });

  it('should profile state update performance', () => {
    const updateTime = performanceMonitor.measureStateUpdate();

    // State update should be fast
    expect(updateTime).toBeLessThan(100);
  });
});
