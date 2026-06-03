// ============================================================
// AnalyticsStorage — SupliList v4.0
// IndexedDB wrapper for analytics events and metrics
// ============================================================

import { logger } from '../../utils/logger.js';

const DB_NAME = 'suplilist-analytics-v4';
const DB_VERSION = 1;

export const STORES = {
  EVENTS: 'events',
  METRICS: 'metrics',
  SESSIONS: 'sessions',
  FUNNELS: 'funnels',
  AFFILIATE_CLICKS: 'affiliate_clicks'
};

/**
 * IndexedDB wrapper for analytics data
 * Handles CRUD + queries for events and metrics
 */
export class AnalyticsStorage {
  #db = null;
  #initialized = false;

  /**
   * Initialize IndexedDB
   * @returns {Promise<void>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('[AnalyticsStorage] Failed to open DB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.#db = request.result;
        this.#initialized = true;
        logger.info('[AnalyticsStorage] Initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.#createObjectStores(db);
      };
    });
  }

  /**
   * Create object stores on first initialization
   * @private
   */
  #createObjectStores(db) {
    // Events store
    if (!db.objectStoreNames.contains(STORES.EVENTS)) {
      const eventsStore = db.createObjectStore(STORES.EVENTS, {
        keyPath: 'eventId'
      });
      eventsStore.createIndex('byTimestamp', 'timestamp', { unique: false });
      eventsStore.createIndex('bySessionId', 'sessionId', { unique: false });
      eventsStore.createIndex('byEventName', 'eventName', { unique: false });
    }

    // Metrics store
    if (!db.objectStoreNames.contains(STORES.METRICS)) {
      const metricsStore = db.createObjectStore(STORES.METRICS, {
        keyPath: 'id',
        autoIncrement: true
      });
      metricsStore.createIndex('byDate', 'date', { unique: false });
    }

    // Sessions store
    if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
      const sessionsStore = db.createObjectStore(STORES.SESSIONS, {
        keyPath: 'sessionId'
      });
      sessionsStore.createIndex('byStartTime', 'startTime', { unique: false });
    }

    // Funnels store
    if (!db.objectStoreNames.contains(STORES.FUNNELS)) {
      const funnelsStore = db.createObjectStore(STORES.FUNNELS, {
        keyPath: 'id',
        autoIncrement: true
      });
      funnelsStore.createIndex('byName', 'funnelName', { unique: false });
      funnelsStore.createIndex('byDate', 'date', { unique: false });
    }

    // Affiliate clicks store
    if (!db.objectStoreNames.contains(STORES.AFFILIATE_CLICKS)) {
      const affiliateStore = db.createObjectStore(STORES.AFFILIATE_CLICKS, {
        keyPath: 'clickId'
      });
      affiliateStore.createIndex('byTimestamp', 'timestamp', { unique: false });
      affiliateStore.createIndex('byUtmSource', 'utmSource', { unique: false });
      affiliateStore.createIndex('bySessionId', 'sessionId', { unique: false });
    }
  }

  /**
   * Add an event to storage
   * @param {Object} event - Enriched analytics event
   * @returns {Promise<void>}
   */
  async addEvent(event) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.EVENTS], 'readwrite');
      const store = tx.objectStore(STORES.EVENTS);
      const request = store.put(event);

      request.onerror = () => {
        logger.error('[AnalyticsStorage] addEvent failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get events with optional filter
   * @param {Object} [filter] - Filter options
   * @param {number} [filter.limit] - Max results
   * @param {number} [filter.offset] - Skip N results
   * @returns {Promise<Object[]>}
   */
  async getEvents(filter = {}) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.EVENTS], 'readonly');
      const store = tx.objectStore(STORES.EVENTS);
      const request = store.getAll();

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        let events = request.result || [];

        // Apply filters
        if (filter.limit) {
          events = events.slice(0, filter.limit);
        }
        if (filter.offset) {
          events = events.slice(filter.offset);
        }

        resolve(events);
      };
    });
  }

  /**
   * Get events by name
   * @param {string} eventName
   * @returns {Promise<Object[]>}
   */
  async getEventsByName(eventName) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.EVENTS], 'readonly');
      const store = tx.objectStore(STORES.EVENTS);
      const index = store.index('byEventName');
      const request = index.getAll(eventName);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Get events by session ID
   * @param {string} sessionId
   * @returns {Promise<Object[]>}
   */
  async getEventsBySessionId(sessionId) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.EVENTS], 'readonly');
      const store = tx.objectStore(STORES.EVENTS);
      const index = store.index('bySessionId');
      const request = index.getAll(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Get events between two dates
   * @param {number} startTimestamp - ms
   * @param {number} endTimestamp - ms
   * @returns {Promise<Object[]>}
   */
  async getEventsBetween(startTimestamp, endTimestamp) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.EVENTS], 'readonly');
      const store = tx.objectStore(STORES.EVENTS);
      const index = store.index('byTimestamp');
      const range = IDBKeyRange.bound(startTimestamp, endTimestamp);
      const request = index.getAll(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Count unique session IDs for a date
   * @param {string} dateISO - YYYY-MM-DD
   * @returns {Promise<number>}
   */
  async countUniqueSessionIds(dateISO) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    const events = await this.getEvents();
    const startMs = new Date(`${dateISO}T00:00:00Z`).getTime();
    const endMs = new Date(`${dateISO}T23:59:59Z`).getTime();

    const sessionIds = new Set();
    events
      .filter(e => e.timestamp >= startMs && e.timestamp <= endMs)
      .forEach(e => {
        if (e.sessionId) sessionIds.add(e.sessionId);
      });

    return sessionIds.size;
  }

  /**
   * Get top events by frequency
   * @param {number} limit - How many top events
   * @returns {Promise<Array<{name: string, count: number}>>}
   */
  async getTopEvents(limit = 10) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    const events = await this.getEvents();
    const counts = {};

    events.forEach(event => {
      counts[event.eventName] = (counts[event.eventName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Delete events older than specified date
   * @param {number} olderThanMs - Timestamp in ms
   * @returns {Promise<number>} Count deleted
   */
  async deleteOldEvents(olderThanMs) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.EVENTS], 'readwrite');
      const store = tx.objectStore(STORES.EVENTS);
      const index = store.index('byTimestamp');
      const range = IDBKeyRange.upperBound(olderThanMs, true);
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onerror = () => reject(request.error);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
    });
  }

  /**
   * Add a metric snapshot
   * @param {Object} metric - Metrics object
   * @returns {Promise<void>}
   */
  async addMetric(metric) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.METRICS], 'readwrite');
      const store = tx.objectStore(STORES.METRICS);
      const request = store.add(metric);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get metrics for a date
   * @param {string} dateISO - YYYY-MM-DD
   * @returns {Promise<Object|null>}
   */
  async getMetricsByDate(dateISO) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.METRICS], 'readonly');
      const store = tx.objectStore(STORES.METRICS);
      const index = store.index('byDate');
      const request = index.get(dateISO);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Add a click event
   * @param {Object} click - Affiliate click
   * @returns {Promise<void>}
   */
  async addAffiliateClick(click) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.AFFILIATE_CLICKS], 'readwrite');
      const store = tx.objectStore(STORES.AFFILIATE_CLICKS);
      const request = store.add(click);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get clicks for a marketplace
   * @param {string} utmSource - 'amazon' | 'ml' | 'shopee'
   * @returns {Promise<Object[]>}
   */
  async getClicksBySource(utmSource) {
    if (!this.#initialized) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.AFFILIATE_CLICKS], 'readonly');
      const store = tx.objectStore(STORES.AFFILIATE_CLICKS);
      const index = store.index('byUtmSource');
      const request = index.getAll(utmSource);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Export all data for GDPR (anonimized)
   * @returns {Promise<Object>}
   */
  async exportAllData() {
    if (!this.#initialized) throw new Error('Storage not initialized');

    const events = await this.getEvents();
    const metrics = await this.#getAllMetrics();
    const sessions = await this.#getAllSessions();

    return {
      exportedAt: new Date().toISOString(),
      eventCount: events.length,
      events: events.map(e => ({
        ...e,
        // Remove any userId (keep sessionId which is anonymous)
        userId: undefined
      })),
      metrics,
      sessions,
      note: 'All personally identifiable information has been removed. SessionId is anonymous.'
    };
  }

  /**
   * Get all metrics
   * @private
   * @returns {Promise<Object[]>}
   */
  async #getAllMetrics() {
    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.METRICS], 'readonly');
      const store = tx.objectStore(STORES.METRICS);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Get all sessions
   * @private
   * @returns {Promise<Object[]>}
   */
  async #getAllSessions() {
    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction([STORES.SESSIONS], 'readonly');
      const store = tx.objectStore(STORES.SESSIONS);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Clear all data (for testing/reset)
   * @returns {Promise<void>}
   */
  async clearAll() {
    if (!this.#initialized) throw new Error('Storage not initialized');

    const stores = Object.values(STORES);
    const tx = this.#db.transaction(stores, 'readwrite');

    return new Promise((resolve, reject) => {
      stores.forEach(storeName => {
        const store = tx.objectStore(storeName);
        store.clear();
      });

      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
    });
  }
}

// Export singleton instance
export const analyticsStorage = new AnalyticsStorage();
