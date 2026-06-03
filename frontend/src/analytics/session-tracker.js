// ============================================================
// SessionTracker — SupliList v4.0
// Tracks session lifecycle (start, duration, end)
// ============================================================

import { analyticsStorage, STORES } from './storage/analytics-storage.js';
import { logger } from '../utils/logger.js';

/**
 * Tracks user sessions (anonymous, no PII)
 * A session = continuous interaction with app until tab close/timeout
 */
export class SessionTracker {
  #sessionId = null;
  #startTime = null;
  #endTime = null;
  #events = [];
  #lastActivityTime = null;
  #idleTimeoutMs = 30 * 60 * 1000; // 30 minutes
  #idleTimer = null;

  constructor(sessionId) {
    this.#sessionId = sessionId;
  }

  /**
   * Start tracking session
   * @returns {void}
   */
  startSession() {
    this.#startTime = Date.now();
    this.#lastActivityTime = this.#startTime;
    this.#resetIdleTimer();

    logger.info(`[SessionTracker] Session started: ${this.#sessionId.substring(0, 8)}...`);
  }

  /**
   * Record activity (resets idle timer)
   * @param {string} eventName - Event that occurred
   * @returns {void}
   */
  recordActivity(eventName) {
    if (!this.#startTime) {
      this.startSession();
    }

    this.#lastActivityTime = Date.now();
    this.#events.push({
      eventName,
      timestamp: this.#lastActivityTime
    });

    this.#resetIdleTimer();
  }

  /**
   * Reset idle timer
   * @private
   * @returns {void}
   */
  #resetIdleTimer() {
    if (this.#idleTimer) {
      clearTimeout(this.#idleTimer);
    }

    this.#idleTimer = setTimeout(() => {
      logger.debug(`[SessionTracker] Session idle timeout after ${this.#idleTimeoutMs / 1000 / 60}min`);
      this.endSession();
    }, this.#idleTimeoutMs);
  }

  /**
   * End session
   * @returns {Promise<void>}
   */
  async endSession() {
    if (this.#idleTimer) {
      clearTimeout(this.#idleTimer);
    }

    this.#endTime = Date.now();

    const sessionData = this.getSessionData();
    await analyticsStorage.addEvent({
      eventId: `session-end-${this.#sessionId}-${Date.now()}`,
      eventName: 'analytics:sessionEnded',
      payload: sessionData,
      sessionId: this.#sessionId,
      userId: null,
      timestamp: this.#endTime,
      url: typeof window !== 'undefined' ? window.location.pathname : '',
      userAgent: '',
      device: 'unknown'
    });

    logger.info(`[SessionTracker] Session ended: ${sessionData.duration}ms, ${sessionData.eventCount} events`);
  }

  /**
   * Get session data
   * @returns {Object} SessionData
   */
  getSessionData() {
    const endTime = this.#endTime || Date.now();
    const duration = endTime - this.#startTime;
    const uniqueEvents = new Set(this.#events.map(e => e.eventName));

    return {
      sessionId: this.#sessionId,
      startTime: this.#startTime,
      endTime: this.#endTime,
      duration,
      durationSeconds: Math.floor(duration / 1000),
      eventCount: this.#events.length,
      eventNames: Array.from(uniqueEvents),
      lastActivityTime: this.#lastActivityTime,
      isActive: !this.#endTime
    };
  }

  /**
   * Get session duration in milliseconds
   * @returns {number}
   */
  getDuration() {
    if (!this.#startTime) return 0;
    const end = this.#endTime || Date.now();
    return end - this.#startTime;
  }

  /**
   * Check if session is still active
   * @returns {boolean}
   */
  isActive() {
    return !this.#endTime;
  }

  /**
   * Get session ID
   * @returns {string}
   */
  getSessionId() {
    return this.#sessionId;
  }

  /**
   * Get events in this session
   * @returns {Array<{eventName: string, timestamp: number}>}
   */
  getEvents() {
    return [...this.#events];
  }
}

/**
 * Global session manager
 * Tracks all active sessions
 */
export class SessionManager {
  #sessions = new Map();  // sessionId -> SessionTracker
  #currentSessionId = null;

  constructor() {
    // Auto-end session when user leaves page
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.#currentSessionId) {
          const session = this.#sessions.get(this.#currentSessionId);
          if (session && session.isActive()) {
            session.endSession().catch(err => {
              logger.error('[SessionManager] Error ending session on unload:', err);
            });
          }
        }
      });

      // Auto-pause on visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          logger.debug('[SessionManager] Page hidden, session will timeout after 30min');
        } else {
          logger.debug('[SessionManager] Page visible');
          if (this.#currentSessionId) {
            const session = this.#sessions.get(this.#currentSessionId);
            if (session) {
              session.recordActivity('app:visible');
            }
          }
        }
      });
    }
  }

  /**
   * Start or get current session
   * @param {string} sessionId - Unique session ID
   * @returns {SessionTracker}
   */
  getOrStartSession(sessionId) {
    if (!this.#sessions.has(sessionId)) {
      const session = new SessionTracker(sessionId);
      session.startSession();
      this.#sessions.set(sessionId, session);
      this.#currentSessionId = sessionId;
    }
    return this.#sessions.get(sessionId);
  }

  /**
   * Record activity for current session
   * @param {string} eventName
   * @returns {void}
   */
  recordActivity(eventName) {
    if (this.#currentSessionId) {
      const session = this.#sessions.get(this.#currentSessionId);
      if (session) {
        session.recordActivity(eventName);
      }
    }
  }

  /**
   * End current session
   * @returns {Promise<void>}
   */
  async endCurrentSession() {
    if (this.#currentSessionId) {
      const session = this.#sessions.get(this.#currentSessionId);
      if (session && session.isActive()) {
        await session.endSession();
      }
    }
  }

  /**
   * Get current session data
   * @returns {Object|null}
   */
  getCurrentSessionData() {
    if (this.#currentSessionId) {
      const session = this.#sessions.get(this.#currentSessionId);
      return session ? session.getSessionData() : null;
    }
    return null;
  }

  /**
   * Get all sessions
   * @returns {Array<Object>}
   */
  getAllSessionData() {
    return Array.from(this.#sessions.values()).map(s => s.getSessionData());
  }
}

// Export singleton
export const sessionManager = new SessionManager();
