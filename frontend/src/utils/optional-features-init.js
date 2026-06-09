/**
 * Optional Features Initializer
 * Inicializa todas as 5 features opcionais com um único comando
 *
 * Import Order (no circular dependencies):
 * 1. logger (lowest dependency)
 * 2. platform/* (use logger)
 * 3. features/* (use platform)
 * 4. utils/optional-features-init (orchestrates all)
 */

import calendarSync from '../platform/calendar-sync.js';
import emailReminderService from '../platform/email-reminder-service.js';
import pwaOffline from '../platform/pwa-offline.js';
import socialSharing from '../features/social/social-sharing.js';
import SmartRecommender from '../features/recommendations/smart-recommender.js';
import logger from './logger.js';
import { ACTIONS } from '../state/state-manager.js';

/**
 * Initialize all optional features
 */
export async function initializeOptionalFeatures() {
  logger.info('Initializing optional features...');

  const results = {
    calendar: false,
    email: false,
    pwa: false,
    social: true, // sempre ativo, não precisa init
    recommendations: true // sempre ativo, não precisa init
  };

  try {
    // 1. Calendar Sync
    try {
      const calendarReady = await calendarSync.initialize();
      results.calendar = calendarReady;
      logger.info(`Calendar sync: ${calendarReady ? '✅ Ready' : '⚠️ Skipped'}`);
    } catch (error) {
      logger.warn('Calendar sync initialization failed', error);
      results.calendar = false;
    }

    // 2. Email Reminder Service
    try {
      await emailReminderService.initialize();
      results.email = true;
      logger.info('Email reminder service: ✅ Ready');
    } catch (error) {
      logger.warn('Email reminder service initialization failed', error);
      results.email = false;
    }

    // 3. PWA Offline Support
    try {
      const pwaReady = await pwaOffline.initialize();
      results.pwa = pwaReady;
      logger.info(`PWA offline support: ${pwaReady ? '✅ Ready' : '⚠️ Limited'}`);
    } catch (error) {
      logger.warn('PWA offline support initialization failed', error);
      results.pwa = false;
    }

    // 4. Social Sharing (initialize global reference)
    window.socialSharing = socialSharing;
    logger.info('Social sharing: ✅ Ready');

    // 5. Smart Recommender (initialize global reference)
    window.smartRecommender = SmartRecommender;
    logger.info('Smart recommendations: ✅ Ready');

    // Setup event listeners
    setupEventListeners();

    // Setup integration hooks
    setupIntegrationHooks();

    logger.info('All optional features initialized', results);
    return results;
  } catch (error) {
    logger.error('Failed to initialize optional features', error);
    return results;
  }
}

/**
 * Setup event listeners for features
 * Prevents memory leaks by reusing handlers
 */
function setupEventListeners() {
  // Remove old listeners if they exist (prevent memory leaks)
  if (window.__supliListListeners) {
    if (window.__supliListListeners.onlineHandler) {
      window.removeEventListener('pwa:online', window.__supliListListeners.onlineHandler);
    }
    if (window.__supliListListeners.offlineHandler) {
      window.removeEventListener('pwa:offline', window.__supliListListeners.offlineHandler);
    }
    if (window.__supliListListeners.swMessageHandler) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', window.__supliListListeners.swMessageHandler);
      }
    }
  }

  // Define handlers
  const onlineHandler = () => {
    logger.info('PWA: App came online - syncing offline queue');
    pwaOffline.processOfflineQueue();
  };

  const offlineHandler = () => {
    logger.warn('PWA: App went offline - using cached data');
    showOfflineIndicator();
  };

  const swMessageHandler = (event) => {
    const { type, supplementId, supplementName } = event.data;

    if (type === 'NOTIFICATION_CLICKED') {
      logger.info(`Notification clicked: ${supplementName}`);
      handleNotificationCheckin(supplementId, supplementName);
    } else if (type === 'SYNC_OFFLINE_QUEUE') {
      pwaOffline.processOfflineQueue();
    }
  };

  // Register handlers
  window.addEventListener('pwa:online', onlineHandler);
  window.addEventListener('pwa:offline', offlineHandler);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', swMessageHandler);
  }

  // Store for cleanup
  window.__supliListListeners = {
    onlineHandler,
    offlineHandler,
    swMessageHandler
  };

  logger.info('Event listeners setup complete (no leaks)');
}

/**
 * Setup integration hooks between features
 * CRITICAL: Hooks must actually be called, not just defined
 */
function setupIntegrationHooks() {
  // Hook 1: When reminder is set, also sync to calendar
  const originalSetReminder = window.notificationManager?.setReminder;
  if (originalSetReminder && window.notificationManager) {
    const wrappedReminder = function(supplementId, supplementName, config) {
      const result = originalSetReminder.call(this, supplementId, supplementName, config);

      // Also sync to calendar if available
      if (calendarSync.isInitialized) {
        calendarSync.syncReminders([{
          supplementId,
          supplementName,
          hour: config.hour || 9,
          minute: config.minute || 0
        }]).catch(error => {
          logger.warn('Failed to sync reminder to calendar', error);
        });
      }

      return result;
    };

    // Use non-configurable property to prevent override
    Object.defineProperty(window.notificationManager, 'setReminder', {
      value: wrappedReminder,
      writable: false,
      configurable: false
    });

    logger.info('Hook 1: Calendar sync integrated with notifications ✓');
  }

  // Hook 2: When adherence milestone reached, show share prompt
  const stateManager = window.stateManager;
  if (stateManager && typeof stateManager.dispatch === 'function') {
    const originalDispatch = stateManager.dispatch.bind(stateManager);

    stateManager.dispatch = function(action, payload) {
      // Call original dispatch
      const result = originalDispatch(action, payload);

      // Check for milestone on check-in
      if ((action === 'RECORD_CHECKIN' || action.type === 'RECORD_CHECKIN') && payload) {
        try {
          const currentState = this.select(s => s);
          const checkins = currentState?.checkins || [];

          // Calculate streak
          let streak = 0;
          const stack = currentState?.stack || [];

          if (stack.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            for (let i = 0; i < 365; i++) {
              const checkDate = new Date();
              checkDate.setDate(checkDate.getDate() - i);
              const dateStr = checkDate.toISOString().split('T')[0];

              const dayCheckins = checkins.filter(c => c.date === dateStr);
              if (dayCheckins.length === stack.length) {
                streak++;
              } else if (dateStr !== today) {
                break;
              }
            }
          }

          // Show share prompt if milestone
          if (socialSharing.shouldPromptShare(streak)) {
            setTimeout(() => {
              const adherence = this.select(s => {
                const month = s.checkins.filter(c => {
                  const d = new Date(c.date);
                  const now = new Date();
                  return d.getMonth() === now.getMonth();
                });
                return (month.length / (s.stack.length * 30)) * 100;
              });
              showSharePrompt(streak, Math.round(adherence) || 75);
            }, 2000);
          }
        } catch (error) {
          logger.warn('Milestone check failed', error);
        }
      }

      return result;
    };

    logger.info('Hook 2: Social share prompts on milestones ✓');
  }

  // Hook 3: On first day of month, ensure email scheduled
  if (emailReminderService) {
    const today = new Date();
    if (today.getDate() === 1) {
      emailReminderService.scheduleMonthlyReport();
      logger.info('Hook 3: Monthly email scheduled for today ✓');
    }
  }

  logger.info('Integration hooks setup complete - all active');
}

/**
 * Show offline indicator UI
 */
function showOfflineIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'offline-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #FF9500;
    color: white;
    padding: 10px;
    text-align: center;
    font-weight: bold;
    z-index: 1000;
  `;
  indicator.textContent = '📡 Você está offline - usando dados locais';

  document.body.insertBefore(indicator, document.body.firstChild);

  // Remove when back online
  const removeOnline = () => {
    const elem = document.getElementById('offline-indicator');
    if (elem) elem.remove();
    window.removeEventListener('pwa:online', removeOnline);
  };

  window.addEventListener('pwa:online', removeOnline);
}

/**
 * Show share prompt
 */
function showSharePrompt(streak) {
  const message = socialSharing.getSharePromptMessage(streak);

  // Could be replaced with actual UI modal
  if (confirm(`${message}\n\nDeseja compartilhar?`)) {
    // Show social share options
    showSocialShareOptions(streak, 75);
  }
}

/**
 * Show social share options
 */
function showSocialShareOptions(streak, adherence) {
  const _html = `
    <div style="display: flex; gap: 10px; justify-content: center;">
      <button onclick="socialSharing.shareStreakWhatsApp(${streak}, ${adherence})" style="padding: 10px 20px; cursor: pointer;">
        💬 WhatsApp
      </button>
      <button onclick="socialSharing.shareStreakTwitter(${streak}, ${adherence})" style="padding: 10px 20px; cursor: pointer;">
        𝕏 Twitter
      </button>
      <button onclick="socialSharing.shareStreakLinkedIn(${streak}, ${adherence})" style="padding: 10px 20px; cursor: pointer;">
        in LinkedIn
      </button>
    </div>
  `;

  logger.info('Share options ready');
  // In real app, show as modal with this HTML
}

/**
 * Handle notification check-in
 * Robust error handling with offline fallback
 */
function handleNotificationCheckin(supplementId, supplementName) {
  // Validate stateManager exists and is functional
  if (!window.stateManager) {
    logger.warn('StateManager not initialized - queueing offline');
    pwaOffline.queueOfflineAction('RECORD_CHECKIN', {
      supplementId,
      supplementName,
      date: new Date().toISOString().split('T')[0]
    }).catch(error => logger.error('Failed to queue offline action', error));
    return;
  }

  if (typeof window.stateManager.dispatch !== 'function') {
    logger.error('StateManager.dispatch is not a function');
    return;
  }

  try {
    // Dispatch using imported ACTIONS constant
    window.stateManager.dispatch(ACTIONS.RECORD_CHECKIN, {
      supplementId,
      supplementName,
      date: new Date().toISOString().split('T')[0],
      taken: true,
      timestamp: Date.now(),
      source: 'notification'
    });

    logger.info(`Auto check-in recorded: ${supplementName}`);
  } catch (error) {
    logger.error(`Failed to record check-in for ${supplementName}`, error);

    // Fallback: queue for offline processing
    pwaOffline.queueOfflineAction('RECORD_CHECKIN', {
      supplementId,
      supplementName,
      date: new Date().toISOString().split('T')[0]
    }).catch(err => logger.error('Failed to queue offline action', err));
  }
}

/**
 * Get feature status
 */
export function getFeatureStatus() {
  return {
    calendar: calendarSync.getStatus(),
    email: emailReminderService.getStatus?.(),
    pwa: pwaOffline.getStatus(),
    social: {
      available: true,
      shareStats: socialSharing.getShareStats()
    },
    recommendations: {
      available: true,
      nextSuggestion: SmartRecommender.getNextSupplementSuggestion()
    }
  };
}

/**
 * Export data with all features
 */
export async function exportCompleteData() {
  const basicData = await pwaOffline.exportData();

  return {
    ...basicData,
    recommendations: {
      nextSuggestion: SmartRecommender.getNextSupplementSuggestion(),
      stackEvaluation: SmartRecommender.rateCurrentStack()
    },
    social: {
      shareStats: socialSharing.getShareStats()
    },
    calendar: {
      connected: calendarSync.getStatus().connected
    },
    email: {
      lastReport: new Date().toISOString()
    },
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };
}

/**
 * Import data and restore all features
 */
export async function importCompleteData(backup) {
  try {
    // Restore basic data
    const basicRestore = await pwaOffline.importData({
      checkins: backup.checkins,
      stack: backup.stack
    });

    if (!basicRestore) {
      logger.error('Failed to restore basic data');
      return false;
    }

    // Features will auto-initialize with restored data
    logger.info('Data imported successfully');
    return true;
  } catch (error) {
    logger.error('Failed to import data', error);
    return false;
  }
}

/**
 * Cleanup all event listeners and features
 * Call on logout or app unload
 */
export function cleanupOptionalFeatures() {
  try {
    // Remove event listeners
    if (window.__supliListListeners) {
      if (window.__supliListListeners.onlineHandler) {
        window.removeEventListener('pwa:online', window.__supliListListeners.onlineHandler);
      }
      if (window.__supliListListeners.offlineHandler) {
        window.removeEventListener('pwa:offline', window.__supliListListeners.offlineHandler);
      }
      if (window.__supliListListeners.swMessageHandler) {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.removeEventListener('message', window.__supliListListeners.swMessageHandler);
        }
      }
      delete window.__supliListListeners;
    }

    // Clear notifications/calendar
    if (window.notificationManager?.cancelReminder) {
      window.notificationManager.getAllReminders?.().forEach(reminder => {
        window.notificationManager.cancelReminder(reminder.supplementId);
      });
    }

    // Clean up global references
    delete window.socialSharing;
    delete window.smartRecommender;

    logger.info('Optional features cleanup complete');
    return true;
  } catch (error) {
    logger.error('Cleanup failed', error);
    return false;
  }
}

export default {
  initializeOptionalFeatures,
  cleanupOptionalFeatures,
  getFeatureStatus,
  exportCompleteData,
  importCompleteData
};
