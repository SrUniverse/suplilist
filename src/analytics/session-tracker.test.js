import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sessionManager, SessionManager, SessionTracker } from './session-tracker.js';
import { analyticsStorage } from './storage/analytics-storage.js';

vi.mock('./storage/analytics-storage.js', () => ({
  analyticsStorage: {
    addEvent: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('session-tracker — User Engagement Sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('SessionTracker', () => {
    it('1. startSession() initializes timestamps and sets idle timeout', () => {
      const tracker = new SessionTracker('session-abc');
      expect(tracker.isActive()).toBe(true);
      expect(tracker.getSessionId()).toBe('session-abc');
      expect(tracker.getDuration()).toBe(0);

      tracker.startSession();

      expect(tracker.getDuration()).toBe(0);
      const data = tracker.getSessionData();
      expect(data.startTime).toBeLessThanOrEqual(Date.now());
      expect(data.isActive).toBe(true);
    });

    it('2. recordActivity() logs event and resets idle timer', () => {
      const tracker = new SessionTracker('session-abc');
      tracker.startSession();

      tracker.recordActivity('click:button');
      tracker.recordActivity('view:list');

      const events = tracker.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].eventName).toBe('click:button');
      expect(events[1].eventName).toBe('view:list');

      // Test idle timeout triggers auto-end
      const endSpy = vi.spyOn(tracker, 'endSession');
      
      // Advance time by 29 minutes (no timeout)
      vi.advanceTimersByTime(29 * 60 * 1000);
      expect(endSpy).not.toHaveBeenCalled();

      // Advance by remaining 2 minutes (exceeds 30 mins)
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(endSpy).toHaveBeenCalled();
    });

    it('3. endSession() computes total duration and persists to analyticsStorage', async () => {
      const tracker = new SessionTracker('session-abc');
      tracker.startSession();

      vi.advanceTimersByTime(5000); // 5 seconds session
      await tracker.endSession();

      expect(tracker.isActive()).toBe(false);
      expect(tracker.getDuration()).toBe(5000);

      expect(analyticsStorage.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'analytics:sessionEnded',
          sessionId: 'session-abc',
          payload: expect.objectContaining({
            duration: 5000,
            eventCount: 0
          })
        })
      );
    });
  });

  describe('SessionManager', () => {
    it('4. getOrStartSession() creates and tracks isolated SessionTrackers', () => {
      const manager = new SessionManager();

      const session1 = manager.getOrStartSession('s1');
      const session2 = manager.getOrStartSession('s1'); // Dup
      const session3 = manager.getOrStartSession('s2');

      expect(session1).toBe(session2);
      expect(session1).not.toBe(session3);

      expect(manager.getCurrentSessionData().sessionId).toBe('s2'); // Last active is s2
    });

    it('5. recordActivity() and endCurrentSession() delegate to active tracker', async () => {
      const manager = new SessionManager();
      const tracker = manager.getOrStartSession('session-test');

      const activitySpy = vi.spyOn(tracker, 'recordActivity');
      const endSpy = vi.spyOn(tracker, 'endSession');

      manager.recordActivity('test_event');
      expect(activitySpy).toHaveBeenCalledWith('test_event');

      await manager.endCurrentSession();
      expect(endSpy).toHaveBeenCalled();
    });

    it('6. window beforeunload event triggers auto-end of active session', () => {
      const manager = new SessionManager();
      const tracker = manager.getOrStartSession('session-test');
      const endSpy = vi.spyOn(tracker, 'endSession');

      // Dispatch beforeunload manually
      window.dispatchEvent(new Event('beforeunload'));

      expect(endSpy).toHaveBeenCalled();
    });

    it('7. document visibilitychange logs active pause/resume actions', () => {
      const manager = new SessionManager();
      const tracker = manager.getOrStartSession('session-test');
      const activitySpy = vi.spyOn(tracker, 'recordActivity');

      // Trigger visibilitychange to visible
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(activitySpy).toHaveBeenCalledWith('app:visible');
    });

    it('8. getAllSessionData() lists data for all tracked sessions', () => {
      const manager = new SessionManager();
      manager.getOrStartSession('session-1');
      manager.getOrStartSession('session-2');

      const allData = manager.getAllSessionData();
      expect(allData).toHaveLength(2);
      expect(allData.map(d => d.sessionId)).toContain('session-1');
      expect(allData.map(d => d.sessionId)).toContain('session-2');
    });
  });
});
