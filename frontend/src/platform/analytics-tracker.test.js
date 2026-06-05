import { describe, it, expect, vi, beforeEach } from 'vitest';

global.fetch = vi.fn();

describe('AnalyticsTracker', () => {
  let analyticsTracker;

  beforeEach(async () => {
    const module = await import('./analytics-tracker.js');
    analyticsTracker = module.default;
    fetch.mockClear();
    vi.clearAllMocks();
  });

  it('should initialize tracker', async () => {
    await analyticsTracker.init({
      projectId: 'test-project',
      userId: 'user-123'
    });
    
    expect(analyticsTracker.isReady()).toBe(true);
  });

  it('should track page view', async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    
    analyticsTracker.trackPageView({
      path: '/dashboard',
      title: 'Dashboard'
    });
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('analytics'),
      expect.any(Object)
    );
  });

  it('should track custom event', async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    
    analyticsTracker.trackEvent({
      name: 'supplement_added',
      properties: {
        supplementId: '1',
        category: 'vitamin'
      }
    });
    
    expect(fetch).toHaveBeenCalled();
  });

  it('should track user action', async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    
    analyticsTracker.trackAction({
      type: 'button_click',
      target: 'add-to-stack'
    });
    
    expect(fetch).toHaveBeenCalled();
  });

  it('should track conversion', async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    
    analyticsTracker.trackConversion({
      conversionType: 'purchase',
      value: 9999,
      currency: 'BRL'
    });
    
    expect(fetch).toHaveBeenCalled();
  });

  it('should batch events', async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    
    analyticsTracker.trackEvent({ name: 'event1', properties: {} });
    analyticsTracker.trackEvent({ name: 'event2', properties: {} });
    analyticsTracker.trackEvent({ name: 'event3', properties: {} });
    
    await analyticsTracker.flush();
    
    expect(fetch).toHaveBeenCalled();
  });

  it('should set user properties', async () => {
    analyticsTracker.setUserProperties({
      email: 'user@test.com',
      tier: 'premium'
    });
    
    const props = analyticsTracker.getUserProperties();
    expect(props.email).toBe('user@test.com');
  });

  it('should identify user', async () => {
    analyticsTracker.identify('user-123', {
      name: 'João Silva',
      email: 'joao@test.com'
    });
    
    expect(analyticsTracker.getUserId()).toBe('user-123');
  });

  it('should respect privacy settings', async () => {
    analyticsTracker.setPrivacyMode(true);
    analyticsTracker.trackEvent({ name: 'test' });
    
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle offline tracking', async () => {
    analyticsTracker.setOfflineMode(true);
    analyticsTracker.trackEvent({ name: 'offline-event' });
    
    const pending = analyticsTracker.getPendingEvents();
    expect(pending.length).toBeGreaterThan(0);
  });
});
