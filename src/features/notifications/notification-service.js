import { stateManager } from '../../state/state-manager.js';
import { todayISO, offsetISO } from '../../utils/date.js';

export default class NotificationService {
  constructor() {
    this._permissionRequested = false;
  }

  /**
   * Request browser notification permissions.
   * @returns {Promise<boolean>} True if granted.
   */
  async requestPermission() {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  /**
   * Send a local browser notification.
   * @param {string} title
   * @param {Object} [options]
   * @returns {Notification|null}
   */
  sendLocalNotification(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return null;

    const defaultOptions = {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: '/' }
    };

    const notifOptions = { ...defaultOptions, ...options };
    const notif = new Notification(title, notifOptions);

    notif.onclick = (event) => {
      event.preventDefault();
      window.focus();
      const destUrl = notifOptions.data?.url || '/';
      window.history.pushState(null, null, destUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
      notif.close();
    };

    return notif;
  }

  /**
   * Check and trigger daily check-in reminders.
   * @param {Object} state - current state
   * @returns {Notification|null}
   */
  checkAndTriggerDailyReminder(state) {
    const isEnabled = localStorage.getItem('suplilist:notif-checkin') === 'true';
    if (!isEnabled) return null;

    const checkins = state?.checkins || [];
    const today = todayISO();

    // Check if user already did a check-in today
    const doneToday = checkins.some(c => c.date === today);
    if (doneToday) return null;

    // Check if reminder was already sent today (to prevent multiple prompts)
    const lastReminderDate = localStorage.getItem('suplilist:last-reminder-date');
    if (lastReminderDate === today) return null;

    // Verify reminder hour is past (e.g. past 9 AM)
    const currentHour = new Date().getHours();
    if (currentHour < 9) return null;

    // Save reminder date to avoid spamming
    localStorage.setItem('suplilist:last-reminder-date', today);

    return this.sendLocalNotification('SupliList — Lembrete Diário', {
      body: 'Hora de tomar seus suplementos! Não se esqueça de registrar seu check-in diário.',
      tag: 'daily-reminder',
      data: { url: '/checkin' }
    });
  }

  /**
   * Check and trigger streak milestones.
   * @param {Object} state - current state
   * @returns {Notification|null}
   */
  checkAndTriggerStreakMilestones(state) {
    const checkins = state?.checkins || [];
    const stack = state?.stack || [];
    if (!checkins.length || !stack.length) return null;

    // Calculate current streak
    const currentStreak = this._calculateStreak(checkins, stack);
    if (currentStreak <= 0) return null;

    // Streak milestones: 3, 7, 15, 30 days
    const milestoneMilestones = [3, 7, 15, 30];
    if (!milestoneMilestones.includes(currentStreak)) return null;

    // Check if this milestone was already notified
    const lastNotifiedStreak = parseInt(localStorage.getItem('suplilist:last-notified-streak') || '0', 10);
    if (currentStreak <= lastNotifiedStreak) return null;

    // Save notified streak
    localStorage.setItem('suplilist:last-notified-streak', String(currentStreak));

    return this.sendLocalNotification('🎉 Meta de Constância Alcançada!', {
      body: `Incrível! Você alcançou um streak de ${currentStreak} dias consecutivos tomando seus suplementos. Continue assim!`,
      tag: `streak-${currentStreak}`,
      data: { url: '/history' }
    });
  }

  /**
   * Check and trigger alerts for low stock.
   * @param {Object} state - current state
   * @returns {Notification|null}
   */
  checkAndTriggerLowStockAlerts(state) {
    const isEnabled = localStorage.getItem('suplilist:notif-restock') === 'true';
    if (!isEnabled) return null;

    const stack = state?.stack || [];
    const today = todayISO();

    for (const item of stack) {
      const qty = parseFloat(item.quantity);
      const dosage = parseFloat(item.dosage);
      if (!qty || !dosage || dosage <= 0) continue;

      const daysLeft = Math.floor(qty / dosage);
      if (daysLeft < 3) {
        const itemId = item.supplementId || item.id;
        const lastAlertKey = `suplilist:last-stock-alert:${itemId}`;
        const lastAlertDate = localStorage.getItem(lastAlertKey);

        // Alert only once per supplement per day
        if (lastAlertDate === today) continue;
        localStorage.setItem(lastAlertKey, today);

        return this.sendLocalNotification('📦 Alerta de Reposição', {
          body: `Seu estoque de ${item.name} está acabando (~${daysLeft} dias restantes). Toque para comprar mais.`,
          tag: `stock-alert-${itemId}`,
          data: { url: '/my-stack' }
        });
      }
    }

    return null;
  }

  /**
   * Helper to calculate active streak days based on checkins.
   * @private
   */
  _calculateStreak(checkins, stack) {
    if (!stack.length) return 0;
    const stackIds = new Set(stack.map(item => item.supplementId || item.id));
    const checkinDays = {};

    for (const c of checkins) {
      if (!c.date) continue;
      if (!checkinDays[c.date]) checkinDays[c.date] = new Set();
      checkinDays[c.date].add(c.supplementId);
    }

    let streak = 0;
    let index = 0;

    while (true) {
      const day = offsetISO(index);
      const dayCheckedIds = checkinDays[day] || new Set();
      const allChecked = [...stackIds].every(id => dayCheckedIds.has(id));

      if (allChecked) {
        streak++;
        index++;
      } else {
        // If it is today and they haven't completed it yet, we check yesterday to keep the streak active
        if (index === 0) {
          index++;
          continue;
        }
        break;
      }
    }

    return streak;
  }
}
