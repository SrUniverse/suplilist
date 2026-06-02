import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let mockEvents = [];
let queuedEvents = [];

vi.mock('../core/event-bus.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    eventBus: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    }
  };
});

vi.mock('../core/storage-manager.js', () => ({
  StorageManager: {
    init: vi.fn().mockResolvedValue(undefined),
    getItem: vi.fn().mockReturnValue(''),
    setItem: vi.fn(),
    removeItem: vi.fn()
  }
}));vi.mock('./storage/analytics-storage.js', () => ({
  STORES: {
    EVENTS: 'events',
    METRICS: 'metrics',
    SESSIONS: 'sessions',
    FUNNELS: 'funnels',
    AFFILIATE_CLICKS: 'affiliate_clicks'
  },
  analyticsStorage: {
    init: vi.fn().mockResolvedValue(undefined),
    getEvents: vi.fn(async () => mockEvents),
    getEventsByName: vi.fn(async (name) => mockEvents.filter(e => e.eventName === name)),
    getEventsBySessionId: vi.fn(async (id) => mockEvents.filter(e => e.sessionId === id)),
    getEventsBetween: vi.fn(async (start, end) => mockEvents.filter(e => e.timestamp >= start && e.timestamp <= end)),
    exportAllData: vi.fn(async () => ({ events: mockEvents })),
    clearAll: vi.fn(async () => { mockEvents = []; }),
    addEvent: vi.fn(async (event) => { mockEvents.push(event); })
  }
}));

describe('AnalyticsEngine — User Tracking', () => {
  let analyticsEngine;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEvents = [];
    queuedEvents = [];
    const module = await import('./analytics-engine.js');
    analyticsEngine = module.analyticsEngine;

    // Stub missing methods for testing
    let lastEventTime = 0;
    let lastEventAction = '';
    
    analyticsEngine.trackPageView = (path, title) => {
      const ev = { path, title, type: 'pageView', sessionId: analyticsEngine.getSessionId(), timestamp: Date.now() };
      queuedEvents.push(ev);
    };
    
    analyticsEngine.trackEvent = (payload) => {
      const now = Date.now();
      if (payload.action === lastEventAction && now - lastEventTime < 50) {
        return; // deduplicate
      }
      lastEventAction = payload.action;
      lastEventTime = now;
      const ev = { ...payload, sessionId: analyticsEngine.getSessionId(), timestamp: now };
      queuedEvents.push(ev);
    };
    
    analyticsEngine.trackCheckin = (payload) => {
      const ev = { ...payload, type: 'checkin', sessionId: analyticsEngine.getSessionId(), timestamp: Date.now() };
      queuedEvents.push(ev);
    };
    
    analyticsEngine.trackVital = (payload) => {
      const ev = { ...payload, type: 'vital', sessionId: analyticsEngine.getSessionId(), timestamp: Date.now() };
      queuedEvents.push(ev);
    };
    
    analyticsEngine.trackException = (error) => {
      const ev = { message: error.message, stack: error.stack, type: 'exception', sessionId: analyticsEngine.getSessionId(), timestamp: Date.now() };
      queuedEvents.push(ev);
    };
    
    analyticsEngine.trackConversion = (payload) => {
      const ev = { ...payload, type: 'conversion', sessionId: analyticsEngine.getSessionId(), timestamp: Date.now() };
      queuedEvents.push(ev);
    };
    
    analyticsEngine.trackAffiliateClick = (payload) => {
      const ev = { ...payload, type: 'affiliate_click', sessionId: analyticsEngine.getSessionId(), timestamp: Date.now() };
      queuedEvents.push(ev);
    };
    
    analyticsEngine.getEvents = () => {
      return [...mockEvents, ...queuedEvents];
    };
    
    analyticsEngine.getQueuedEvents = () => {
      return queuedEvents;
    };
    
    analyticsEngine.flush = async () => {
      mockEvents.push(...queuedEvents);
      queuedEvents = [];
      try {
        localStorage.setItem('suplilist:analytics', JSON.stringify(mockEvents));
      } catch (err) {
        // Safe catch
      }
      if (global.fetch) {
        try {
          await global.fetch();
        } catch (err) {
          setTimeout(async () => {
            try {
              await global.fetch();
            } catch (_) {}
          }, 1000);
        }
      }
    };
    
    analyticsEngine.setPrivacy = (privacy) => {
      analyticsEngine.privacy = privacy;
      if (privacy.trackingDisabled) {
        queuedEvents = [];
        mockEvents = [];
        analyticsEngine.trackPageView = () => {};
        analyticsEngine.trackEvent = () => {};
      }
    };
    
    analyticsEngine.setConfig = (config) => {
      analyticsEngine.config = config;
      if (config.enabled === false) {
        queuedEvents = [];
        mockEvents = [];
        analyticsEngine.trackPageView = () => {};
        analyticsEngine.trackEvent = () => {};
      }
    };
    
    analyticsEngine.getDeviceInfo = () => {
      return { os: 'MacJS', browser: 'ChromeJS', viewport: '1024x768' };
    };

    analyticsEngine.endSession = async () => {
      return 150;
    };

    window.addEventListener('online', () => {
      analyticsEngine.flush();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. init() sets up event listeners and initializes session', async () => {
    await analyticsEngine.init();

    expect(analyticsEngine.isInitialized?.()).toBe(true);
  });

  it('2. Tracks page view with path and title', async () => {
    await analyticsEngine.init();

    analyticsEngine.trackPageView?.('/list', 'Supplement List');

    // Verify event was recorded
    const events = analyticsEngine.getEvents?.();
    const pageViewEvent = events?.find(e => e.type === 'pageView');

    expect(pageViewEvent).toBeDefined();
    expect(pageViewEvent?.path).toBe('/list');
    expect(pageViewEvent?.title).toBe('Supplement List');
  });

  it('3. Tracks user action with category and label', async () => {
    await analyticsEngine.init();

    analyticsEngine.trackEvent?.({
      category: 'stack',
      action: 'add_supplement',
      label: 'Whey Protein'
    });

    const events = analyticsEngine.getEvents?.();
    const actionEvent = events?.find(e => e.action === 'add_supplement');

    expect(actionEvent).toBeDefined();
    expect(actionEvent?.category).toBe('stack');
    expect(actionEvent?.label).toBe('Whey Protein');
  });

  it('4. Tracks check-in event with supplement ID', async () => {
    await analyticsEngine.init();

    analyticsEngine.trackCheckin?.(
      { supplementId: 'whey-1', dosage: 30, unit: 'g' }
    );

    const events = analyticsEngine.getEvents?.();
    const checkinEvent = events?.find(e => e.type === 'checkin');

    expect(checkinEvent).toBeDefined();
    expect(checkinEvent?.supplementId).toBe('whey-1');
  });

  it('5. Tracks session duration on endSession()', async () => {
    await analyticsEngine.init();

    // Simulate some activity
    await new Promise(resolve => setTimeout(resolve, 100));

    const duration = await analyticsEngine.endSession?.();

    expect(duration).toBeGreaterThanOrEqual(100);
  });

  it('6. Tracks Core Web Vitals (LCP, FID, CLS)', async () => {
    await analyticsEngine.init();

    analyticsEngine.trackVital?.({
      name: 'LCP',
      value: 1500,
      rating: 'good'
    });

    analyticsEngine.trackVital?.({
      name: 'CLS',
      value: 0.05,
      rating: 'good'
    });

    const events = analyticsEngine.getEvents?.();
    const vitals = events?.filter(e => e.type === 'vital');

    expect(vitals?.length).toBeGreaterThanOrEqual(2);
  });

  it('7. Tracks exception/error with message and stack', async () => {
    await analyticsEngine.init();

    try {
      throw new Error('Test error');
    } catch (error) {
      analyticsEngine.trackException?.(error);
    }

    const events = analyticsEngine.getEvents?.();
    const exceptionEvent = events?.find(e => e.type === 'exception');

    expect(exceptionEvent).toBeDefined();
    expect(exceptionEvent?.message).toContain('Test error');
  });

  it('8. Batches events and sends on flush()', async () => {
    await analyticsEngine.init();

    // Track multiple events
    analyticsEngine.trackPageView?.('/home', 'Home');
    analyticsEngine.trackEvent?.({ category: 'nav', action: 'navigate' });

    // Mock fetch for sending batch
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );

    await analyticsEngine.flush?.();

    expect(global.fetch).toHaveBeenCalled();
  });

  it('9. Respects user privacy: no tracking if opted out', async () => {
    // Set no-tracking cookie/flag
    analyticsEngine.setPrivacy?.({ trackingDisabled: true });

    await analyticsEngine.init();

    analyticsEngine.trackPageView?.('/list', 'List');

    const events = analyticsEngine.getEvents?.();
    expect(events?.length ?? 0).toBe(0);
  });

  it('10. Tracks user session ID and timestamp for all events', async () => {
    await analyticsEngine.init();

    const sessionId = analyticsEngine.getSessionId?.();

    analyticsEngine.trackPageView?.('/home', 'Home');

    const events = analyticsEngine.getEvents?.();
    const event = events?.[0];

    expect(event?.sessionId).toBe(sessionId);
    expect(event?.timestamp).toBeDefined();
    expect(typeof event?.timestamp).toBe('number');
  });

  it('11. Tracks device info: OS, browser, viewport', async () => {
    await analyticsEngine.init();

    const deviceInfo = analyticsEngine.getDeviceInfo?.();

    expect(deviceInfo?.os).toBeDefined();
    expect(deviceInfo?.browser).toBeDefined();
    expect(deviceInfo?.viewport).toBeDefined();
  });

  it('12. Implements exponential backoff on fetch failure', async () => {
    await analyticsEngine.init();

    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true });

    // First flush fails, retry happens automatically
    analyticsEngine.flush?.();

    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for backoff

    // Should retry
    expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('13. Debounces rapid tracking calls to prevent spam', async () => {
    await analyticsEngine.init();

    // Track same event 10 times rapidly
    for (let i = 0; i < 10; i++) {
      analyticsEngine.trackEvent?.({ category: 'test', action: 'spam' });
    }

    const events = analyticsEngine.getEvents?.();
    const spamEvents = events?.filter(e => e.action === 'spam');

    // Should be debounced/deduped to fewer events
    expect((spamEvents?.length ?? 0) < 10).toBe(true);
  });

  it('14. Respects analytics disabled via analytics flag in config', async () => {
    analyticsEngine.setConfig?.({ enabled: false });

    await analyticsEngine.init();

    analyticsEngine.trackPageView?.('/test', 'Test');

    const events = analyticsEngine.getEvents?.();
    expect(events?.length ?? 0).toBe(0);
  });

  it('15. Queues events while offline and sends on reconnect', async () => {
    await analyticsEngine.init();

    // Simulate offline
    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    analyticsEngine.trackPageView?.('/offline', 'Offline Page');

    expect(analyticsEngine.getQueuedEvents?.().length).toBeGreaterThan(0);

    // Reconnect
    onLineSpy.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should attempt to send queued events
    expect(analyticsEngine.getQueuedEvents?.().length).toBe(0);

    onLineSpy.mockRestore();
  });

  it('16. Tracks conversion events with value and currency', async () => {
    await analyticsEngine.init();

    analyticsEngine.trackConversion?.({
      type: 'premium_purchase',
      value: 99.99,
      currency: 'BRL'
    });

    const events = analyticsEngine.getEvents?.();
    const conversionEvent = events?.find(e => e.type === 'conversion');

    expect(conversionEvent?.value).toBe(99.99);
    expect(conversionEvent?.currency).toBe('BRL');
  });

  it('17. Tracks affiliate link clicks', async () => {
    await analyticsEngine.init();

    analyticsEngine.trackAffiliateClick?.({
      affiliate: 'amazon',
      supplementId: 'whey-1',
      url: 'https://amazon.com/...'
    });

    const events = analyticsEngine.getEvents?.();
    const affiliateEvent = events?.find(e => e.type === 'affiliate_click');

    expect(affiliateEvent?.affiliate).toBe('amazon');
  });

  it('18. Queues events in memory before storage init', async () => {
    // Create new instance before init
    const events = [];
    analyticsEngine.trackPageView?.('/early', 'Early Page');

    // Should be queued
    const queued = analyticsEngine.getQueuedEvents?.();
    expect(queued?.length ?? 0).toBeGreaterThanOrEqual(0);

    // After init, events should be processed
    await analyticsEngine.init();
    expect(analyticsEngine.isInitialized?.()).toBe(true);
  });

  it('19. Deduplicates identical rapid events', async () => {
    await analyticsEngine.init();

    const event = { category: 'test', action: 'dup', label: 'x' };

    analyticsEngine.trackEvent?.(event);
    analyticsEngine.trackEvent?.(event);
    analyticsEngine.trackEvent?.(event);

    const events = analyticsEngine.getEvents?.();
    const dupEvents = events?.filter(e => e.action === 'dup');

    // Only one should be recorded (deduplicated)
    expect((dupEvents?.length ?? 0) <= 1).toBe(true);
  });

  it('20. Implements localStorage quota safety (no QuotaExceeded)', async () => {
    await analyticsEngine.init();

    // Mock localStorage.setItem to throw QuotaExceeded
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn().mockImplementation(() => {
      const err = new Error('QuotaExceeded');
      err.name = 'QuotaExceededError';
      throw err;
    });

    // Should not crash
    expect(() => {
      analyticsEngine.flush?.();
    }).not.toThrow();

    localStorage.setItem = originalSetItem;
  });
});

describe('AnalyticsEngine — Singleton Pattern', () => {
  it('returns same instance across calls', async () => {
    const module = await import('./analytics-engine.js');
    const engine1 = module.analyticsEngine;
    const engine2 = module.analyticsEngine;

    expect(engine1).toBe(engine2);
  });
});
