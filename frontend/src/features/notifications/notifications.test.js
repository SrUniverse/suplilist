import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NotificationService from './notification-service.js';
import { todayISO, offsetISO } from '../../utils/date.js';

describe('NotificationService', () => {
  let service;
  let originalNotification;
  
  // Define a real class for MockNotification
  class MockNotification {
    constructor(title, options) {
      this.title = title;
      this.options = options;
      this.close = vi.fn();
      this.onclick = null;
      MockNotification.instances.push(this);
    }
  }

  beforeEach(() => {
    localStorage.clear();
    service = new NotificationService();

    // Preserve original Notification if any
    originalNotification = global.window.Notification;

    // Reset static properties on MockNotification class
    MockNotification.instances = [];
    MockNotification.permission = 'default';
    MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');

    // Attach MockNotification class to globals
    global.window.Notification = MockNotification;
    global.Notification = MockNotification;
  });

  afterEach(() => {
    // Restore
    if (originalNotification === undefined) {
      delete global.window.Notification;
      delete global.Notification;
    } else {
      global.window.Notification = originalNotification;
      global.Notification = originalNotification;
    }
    vi.restoreAllMocks();
  });

  describe('requestPermission', () => {
    it('returns false if Notification API is not supported in the browser', async () => {
      delete global.window.Notification;
      const result = await service.requestPermission();
      expect(result).toBe(false);
    });

    it('requests permission and returns true when granted', async () => {
      MockNotification.requestPermission.mockResolvedValueOnce('granted');
      const result = await service.requestPermission();
      expect(MockNotification.requestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('requests permission and returns false when denied', async () => {
      MockNotification.requestPermission.mockResolvedValueOnce('denied');
      const result = await service.requestPermission();
      expect(result).toBe(false);
    });
  });

  describe('sendLocalNotification', () => {
    it('returns null if permission is not granted', () => {
      MockNotification.permission = 'denied';
      const notif = service.sendLocalNotification('Test Title');
      expect(notif).toBeNull();
      expect(MockNotification.instances.length).toBe(0);
    });

    it('creates and returns a new Notification instance if permission is granted', () => {
      MockNotification.permission = 'granted';
      const notif = service.sendLocalNotification('Test Title', { body: 'Test body', data: { url: '/checkin' } });
      expect(notif).not.toBeNull();
      expect(MockNotification.instances.length).toBe(1);
      expect(MockNotification.instances[0].title).toBe('Test Title');
      expect(MockNotification.instances[0].options.body).toBe('Test body');
      expect(MockNotification.instances[0].options.data.url).toBe('/checkin');
    });

    it('triggers onclick navigation and popstate event', () => {
      MockNotification.permission = 'granted';
      const pushStateSpy = vi.spyOn(window.history, 'pushState');
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const notif = service.sendLocalNotification('Test Title', { data: { url: '/history' } });
      expect(notif).not.toBeNull();

      // Trigger onclick
      const dummyEvent = { preventDefault: vi.fn() };
      notif.onclick(dummyEvent);

      expect(dummyEvent.preventDefault).toHaveBeenCalled();
      expect(pushStateSpy).toHaveBeenCalledWith(null, null, '/history');
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(PopStateEvent));
    });
  });

  describe('checkAndTriggerDailyReminder', () => {
    it('returns null if reminder setting is disabled', () => {
      localStorage.setItem('suplilist:notif-checkin', 'false');
      const state = { checkins: [] };
      const notif = service.checkAndTriggerDailyReminder(state);
      expect(notif).toBeNull();
    });

    it('triggers reminder if enabled, user did not checkin today, is past 9 AM, and not yet reminded today', () => {
      localStorage.setItem('suplilist:notif-checkin', 'true');
      MockNotification.permission = 'granted';

      // Mock date hours to 10 AM (past 9 AM)
      const originalGetHours = Date.prototype.getHours;
      Date.prototype.getHours = () => 10;

      const state = { checkins: [] }; // no checkins today
      const notif = service.checkAndTriggerDailyReminder(state);

      expect(notif).not.toBeNull();
      expect(localStorage.getItem('suplilist:last-reminder-date')).toBe(todayISO());

      // Restore Date prototype
      Date.prototype.getHours = originalGetHours;
    });

    it('does not trigger reminder if user already checked in today', () => {
      localStorage.setItem('suplilist:notif-checkin', 'true');
      MockNotification.permission = 'granted';

      const state = {
        checkins: [
          { date: todayISO(), supplementId: '1' }
        ]
      };
      const notif = service.checkAndTriggerDailyReminder(state);
      expect(notif).toBeNull();
    });

    it('does not trigger reminder if reminder was already sent today', () => {
      localStorage.setItem('suplilist:notif-checkin', 'true');
      localStorage.setItem('suplilist:last-reminder-date', todayISO());
      MockNotification.permission = 'granted';

      const state = { checkins: [] };
      const notif = service.checkAndTriggerDailyReminder(state);
      expect(notif).toBeNull();
    });

    it('does not trigger reminder if it is before 9 AM', () => {
      localStorage.setItem('suplilist:notif-checkin', 'true');
      MockNotification.permission = 'granted';

      // Mock date hours to 8 AM (before 9 AM)
      const originalGetHours = Date.prototype.getHours;
      Date.prototype.getHours = () => 8;

      const state = { checkins: [] };
      const notif = service.checkAndTriggerDailyReminder(state);
      expect(notif).toBeNull();

      // Restore Date
      Date.prototype.getHours = originalGetHours;
    });
  });

  describe('checkAndTriggerStreakMilestones', () => {
    it('returns null if there are no checkins or stack items', () => {
      const state = { checkins: [], stack: [] };
      const notif = service.checkAndTriggerStreakMilestones(state);
      expect(notif).toBeNull();
    });

    it('triggers streak milestone notification when reaching milestone thresholds (3, 7, 15, 30)', () => {
      MockNotification.permission = 'granted';
      
      // Let's mock a 3-day streak.
      // Need 3 consecutive days checkins for all items in stack.
      const stack = [{ id: 'supA' }];
      const checkins = [
        { date: offsetISO(0), supplementId: 'supA' },
        { date: offsetISO(1), supplementId: 'supA' },
        { date: offsetISO(2), supplementId: 'supA' }
      ];

      const state = { checkins, stack };
      const notif = service.checkAndTriggerStreakMilestones(state);

      expect(notif).not.toBeNull();
      expect(notif.title).toContain('Meta de Constância Alcançada!');
      expect(notif.options.body).toContain('streak de 3 dias');
      expect(localStorage.getItem('suplilist:last-notified-streak')).toBe('3');
    });

    it('does not trigger milestone if milestone was already notified', () => {
      MockNotification.permission = 'granted';
      localStorage.setItem('suplilist:last-notified-streak', '3');

      const stack = [{ id: 'supA' }];
      const checkins = [
        { date: offsetISO(0), supplementId: 'supA' },
        { date: offsetISO(1), supplementId: 'supA' },
        { date: offsetISO(2), supplementId: 'supA' }
      ];

      const state = { checkins, stack };
      const notif = service.checkAndTriggerStreakMilestones(state);
      expect(notif).toBeNull();
    });

    it('does not trigger if streak is not a milestone value', () => {
      MockNotification.permission = 'granted';

      const stack = [{ id: 'supA' }];
      // 2-day streak (not a milestone value: 3, 7, 15, 30)
      const checkins = [
        { date: offsetISO(0), supplementId: 'supA' },
        { date: offsetISO(1), supplementId: 'supA' }
      ];

      const state = { checkins, stack };
      const notif = service.checkAndTriggerStreakMilestones(state);
      expect(notif).toBeNull();
    });
  });

  describe('checkAndTriggerLowStockAlerts', () => {
    it('returns null if restock setting is disabled', () => {
      localStorage.setItem('suplilist:notif-restock', 'false');
      const state = {
        stack: [
          { id: 'supA', name: 'Creatina', quantity: 2, dosage: 1 } // 2 days supply remaining (< 3)
        ]
      };
      const notif = service.checkAndTriggerLowStockAlerts(state);
      expect(notif).toBeNull();
    });

    it('triggers stock alert if supply is less than 3 days, setting is enabled, and not yet alerted today', () => {
      localStorage.setItem('suplilist:notif-restock', 'true');
      MockNotification.permission = 'granted';

      const state = {
        stack: [
          { id: 'supA', name: 'Creatina', quantity: 2, dosage: 1 } // 2 days supply remaining (< 3)
        ]
      };
      const notif = service.checkAndTriggerLowStockAlerts(state);

      expect(notif).not.toBeNull();
      expect(notif.title).toContain('Alerta de Reposição');
      expect(notif.options.body).toContain('Creatina');
      expect(localStorage.getItem('suplilist:last-stock-alert:supA')).toBe(todayISO());
    });

    it('does not trigger stock alert if supply is 3 days or more', () => {
      localStorage.setItem('suplilist:notif-restock', 'true');
      MockNotification.permission = 'granted';

      const state = {
        stack: [
          { id: 'supA', name: 'Creatina', quantity: 3, dosage: 1 } // 3 days remaining (>= 3)
        ]
      };
      const notif = service.checkAndTriggerLowStockAlerts(state);
      expect(notif).toBeNull();
    });

    it('does not trigger stock alert if already alerted today', () => {
      localStorage.setItem('suplilist:notif-restock', 'true');
      localStorage.setItem('suplilist:last-stock-alert:supA', todayISO());
      MockNotification.permission = 'granted';

      const state = {
        stack: [
          { id: 'supA', name: 'Creatina', quantity: 2, dosage: 1 }
        ]
      };
      const notif = service.checkAndTriggerLowStockAlerts(state);
      expect(notif).toBeNull();
    });
  });
});
