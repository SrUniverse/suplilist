import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../analytics/analytics-engine.js', () => ({
  default: {
    trackEvent: vi.fn(),
    identify: vi.fn(),
  }
}));

import { AnalyticsTracker } from './analytics-tracker.js';
import analyticsEngine from '../analytics/analytics-engine.js';

describe('AnalyticsTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new AnalyticsTracker();
    vi.clearAllMocks();
  });

  it('should be enabled by default', () => {
    expect(tracker.isEnabled()).toBe(true);
  });

  it('should track page views', () => {
    tracker.trackPageView('home', { referrer: 'google' });
    expect(analyticsEngine.trackEvent).toHaveBeenCalledWith('page_view', { page: 'home', referrer: 'google' });
  });

  it('should track page view with no extra properties', () => {
    tracker.trackPageView('dashboard');
    expect(analyticsEngine.trackEvent).toHaveBeenCalledWith('page_view', { page: 'dashboard' });
  });

  it('should track events', () => {
    tracker.trackEvent('button_click', { buttonId: 'cta' });
    expect(analyticsEngine.trackEvent).toHaveBeenCalledWith('button_click', { buttonId: 'cta' });
  });

  it('should track events with default empty properties', () => {
    tracker.trackEvent('page_loaded');
    expect(analyticsEngine.trackEvent).toHaveBeenCalledWith('page_loaded', {});
  });

  it('should track conversions', () => {
    tracker.trackConversion('purchase', 99.90);
    expect(analyticsEngine.trackEvent).toHaveBeenCalledWith('conversion', { conversion: 'purchase', value: 99.90 });
  });

  it('should track conversion with default value 0', () => {
    tracker.trackConversion('signup');
    expect(analyticsEngine.trackEvent).toHaveBeenCalledWith('conversion', { conversion: 'signup', value: 0 });
  });

  it('should identify users', () => {
    tracker.identify('user-123', { name: 'João' });
    expect(analyticsEngine.identify).toHaveBeenCalledWith('user-123', { name: 'João' });
  });

  it('should identify with default empty traits', () => {
    tracker.identify('user-456');
    expect(analyticsEngine.identify).toHaveBeenCalledWith('user-456', {});
  });

  it('should disable tracking', () => {
    tracker.disable();
    expect(tracker.isEnabled()).toBe(false);
  });

  it('should not call analytics when disabled', () => {
    tracker.disable();
    tracker.trackPageView('home');
    tracker.trackEvent('click');
    tracker.trackConversion('signup');
    tracker.identify('user-123');

    expect(analyticsEngine.trackEvent).not.toHaveBeenCalled();
    expect(analyticsEngine.identify).not.toHaveBeenCalled();
  });

  it('should re-enable tracking', () => {
    tracker.disable();
    tracker.enable();
    expect(tracker.isEnabled()).toBe(true);

    tracker.trackEvent('resumed');
    expect(analyticsEngine.trackEvent).toHaveBeenCalledWith('resumed', {});
  });
});
