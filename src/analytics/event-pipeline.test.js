import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventPipeline, EventPipeline } from './event-pipeline.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { stateManager } from '../state/state-manager.js';
import { analyticsStorage } from './storage/analytics-storage.js';
import { StorageManager } from '../core/storage-manager.js';

let mockStoredEvents = [];

vi.mock('./storage/analytics-storage.js', () => ({
  STORES: {
    EVENTS: 'events',
    METRICS: 'metrics',
    SESSIONS: 'sessions',
    FUNNELS: 'funnels',
    AFFILIATE_CLICKS: 'affiliate_clicks'
  },
  analyticsStorage: {
    init: vi.fn().mockResolvedValue(undefined),
    addEvent: vi.fn(async (event) => {
      mockStoredEvents.push(event);
    }),
    clearAll: vi.fn(async () => {
      mockStoredEvents = [];
    })
  }
}));

describe('EventPipeline — Event Ingestion Engine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockStoredEvents = [];
    vi.spyOn(StorageManager, 'getItem').mockReturnValue('state-dummy-v4');
    await eventPipeline.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. init() generates sessionId, starts listening to eventBus, and alerts app ready', async () => {
    const onSpy = vi.spyOn(eventBus, 'on');
    const emitSpy = vi.spyOn(eventBus, 'emit');

    // Create isolated pipeline instance for testing init cleanly
    const testPipeline = new EventPipeline();
    await testPipeline.init();

    expect(testPipeline.getSessionId()).toMatch(/^[a-f0-9]{64}$/);
    expect(analyticsStorage.init).toHaveBeenCalled();

    // Verify listeners are hooked up to '*'
    expect(onSpy).toHaveBeenCalledWith('*', expect.any(Function));

    // Verify APP_READY is emitted
    expect(emitSpy).toHaveBeenCalledWith(EVENTS.APP_READY, expect.any(Object));
  });

  it('2. trackEvent() filters out events containing PII', async () => {
    const piiEvent = {
      eventName: 'user:contact',
      payload: {
        email: 'attacker@private-data.com',
        creditCard: '1111222233334444'
      }
    };

    await eventPipeline.trackEvent(piiEvent.eventName, piiEvent.payload);

    // Should increment PII counter and not process/store
    const stats = eventPipeline.getStats();
    expect(stats.piiDetected).toBe(1);
    expect(stats.eventsProcessed).toBe(0);
    expect(mockStoredEvents).toHaveLength(0);
  });

  it('3. trackEvent() sanitizes safe fields and generates deterministic eventId', async () => {
    const payload = {
      supplementId: 'creatina',
      userName: 'John Doe', // should be removed under general event
      price: 90
    };

    await eventPipeline.trackEvent('test:custom', payload);

    // Flush batch buffer
    await eventPipeline.flush();

    expect(mockStoredEvents).toHaveLength(1);
    const savedEvent = mockStoredEvents[0];

    expect(savedEvent.eventId).toMatch(/^[a-f0-9]{64}$/);
    expect(savedEvent.eventName).toBe('test:custom');
    expect(savedEvent.payload.supplementId).toBe('creatina');
    expect(savedEvent.payload.userName).toBeUndefined(); // Stripped
  });

  it('4. trackEvent() deduplicates rapid identical events', async () => {
    // Mock date to ensure same timestamp and dedupe hashes
    const originalDateNow = Date.now;
    const frozenTime = 1717325000000;
    global.Date.now = vi.fn(() => frozenTime);

    const payload = { supplementId: 'creatina' };

    await eventPipeline.trackEvent('test:dup', payload);
    await eventPipeline.trackEvent('test:dup', payload); // Duplicate

    await eventPipeline.flush();

    expect(mockStoredEvents).toHaveLength(1); // Only one persisted
    expect(eventPipeline.getStats().eventsDeduped).toBe(1);

    // Restore Date
    global.Date.now = originalDateNow;
  });

  it('5. trackEvent() buffers events and flushes when batch limit is reached', async () => {
    const trackingPromises = [];
    for (let i = 0; i < 9; i++) {
      trackingPromises.push(eventPipeline.trackEvent(`test:event-${i}`, { id: i }));
    }
    await Promise.all(trackingPromises);

    // Under batch limit (10), should not flush to storage yet
    expect(mockStoredEvents).toHaveLength(0);
    expect(eventPipeline.getStats().bufferSize).toBe(9);

    // 10th event triggers flush
    await eventPipeline.trackEvent('test:event-9', { id: 9 });
    expect(mockStoredEvents).toHaveLength(10);
    expect(eventPipeline.getStats().bufferSize).toBe(0);
    expect(eventPipeline.getStats().eventsPersisted).toBe(10);
  });

  it('6. trackEvent() triggers timed flush if buffer does not fill within timeout', async () => {
    vi.useFakeTimers();

    await eventPipeline.trackEvent('test:delayed', { delay: true });
    expect(mockStoredEvents).toHaveLength(0); // In buffer

    // Advance timers by 100ms
    vi.advanceTimersByTime(110);

    expect(mockStoredEvents).toHaveLength(1); // Automatically flushed
    vi.useRealTimers();
  });

  it('7. ignores routing, UI and self-analytics event loops', async () => {
    // Setup listeners
    const testPipeline = new EventPipeline();
    
    const onSpy = vi.spyOn(eventBus, 'on');
    await testPipeline.init();

    // Get the wildcard handler registered on eventBus
    const wildcardHandler = onSpy.mock.calls.find(call => call[0] === '*')[1];

    const trackSpy = vi.spyOn(testPipeline, 'trackEvent');

    // Call wildcardHandler directly to simulate eventBus wildcard events
    wildcardHandler('route:changed', { to: '/faq' });
    wildcardHandler('ui:click', { target: 'btn' });
    wildcardHandler('analytics:eventTracked', { id: 1 });

    expect(trackSpy).not.toHaveBeenCalled();

    // Trigger stack event (which is not ignored)
    wildcardHandler('stack:itemAdded', { supplementId: 'creatina', quantity: 1, dosage: '5g' });
    expect(trackSpy).toHaveBeenCalledWith('stack:itemAdded', expect.any(Object));
  });

  it('8. reset() clears internal buffers, seen cache and resets statistics', async () => {
    await eventPipeline.trackEvent('test:clear', { val: 1 });
    await eventPipeline.reset();

    const stats = eventPipeline.getStats();
    expect(stats.eventsProcessed).toBe(0);
    expect(stats.bufferSize).toBe(0);
    expect(stats.dedupeCache).toBe(0);
    expect(mockStoredEvents).toHaveLength(0);
  });
});
