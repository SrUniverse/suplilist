import { describe, it, expect } from 'vitest';

describe('AnalyticsTracker', () => {
  it('should export AnalyticsTracker class', async () => {
    const { AnalyticsTracker } = await import('./analytics-tracker.js');
    expect(AnalyticsTracker).toBeDefined();
  });

  it('should export default instance', async () => {
    const module = await import('./analytics-tracker.js');
    expect(module.default).toBeDefined();
  });

  it('should have trackPageView method', async () => {
    const module = await import('./analytics-tracker.js');
    expect(typeof module.default.trackPageView).toBe('function');
  });

  it('should have trackEvent method', async () => {
    const module = await import('./analytics-tracker.js');
    expect(typeof module.default.trackEvent).toBe('function');
  });

  it('should have enable/disable methods', async () => {
    const module = await import('./analytics-tracker.js');
    expect(typeof module.default.enable).toBe('function');
    expect(typeof module.default.disable).toBe('function');
  });
});
