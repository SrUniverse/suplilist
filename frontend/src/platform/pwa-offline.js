/**
 * PWA Offline Support — Service Worker + IndexedDB for offline-first experience
 * Allows full app functionality without internet connection
 */

import { logger } from '../utils/logger.js';

export class PWAOfflineManager {
  constructor() {
    this.dbName = 'SupliListDB';
    this.version = 1;
    this.db = null;
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
  }

  /**
   * Initialize PWA offline support
   */
  async initialize() {
    try {
      // O Service Worker é registrado pelo VitePWA (registerSW.js → service-worker.js);
      // não registramos /sw.js aqui para não ter dois SWs concorrentes.

      // Initialize IndexedDB
      await this.initIndexedDB();

      // Listen for online/offline events
      window.addEventListener('online', () => this.onOnline());
      window.addEventListener('offline', () => this.onOffline());

      logger.info('PWA offline support initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize PWA offline support', error);
      return false;
    }
  }

  /**
   * Initialize IndexedDB
   */
  initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        logger.error('IndexedDB open failed');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        const stores = [
          { name: 'checkins', keyPath: 'id', index: ['date', 'supplementId'] },
          { name: 'stack', keyPath: 'supplementId', index: ['name'] },
          { name: 'offline-queue', keyPath: 'id', index: ['type', 'timestamp'] },
          { name: 'cache', keyPath: 'key', index: ['expiry'] }
        ];

        stores.forEach(store => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath
            });

            store.index?.forEach(index => {
              objStore.createIndex(index, index, { unique: false });
            });
          }
        });

        logger.info('IndexedDB stores created');
      };
    });
  }

  /**
   * Save data to IndexedDB
   */
  async saveToDB(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => {
        logger.info(`Data saved to ${storeName}`);
        resolve(request.result);
      };

      request.onerror = () => {
        logger.error(`Failed to save to ${storeName}`);
        reject(request.error);
      };
    });
  }

  /**
   * Get data from IndexedDB
   */
  async getFromDB(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        logger.error(`Failed to get from ${storeName}`);
        reject(request.error);
      };
    });
  }

  /**
   * Get all from IndexedDB
   */
  async getAllFromDB(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        logger.error(`Failed to get all from ${storeName}`);
        reject(request.error);
      };
    });
  }

  /**
   * Queue action for offline processing
   */
  async queueOfflineAction(type, payload) {
    const action = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0
    };

    await this.saveToDB('offline-queue', action);
    this.offlineQueue.push(action);

    logger.info(`Action queued offline: ${type}`);
    return action.id;
  }

  /**
   * Process offline queue when online
   */
  async processOfflineQueue() {
    try {
      const queue = await this.getAllFromDB('offline-queue');
      const pending = queue.filter(a => a.status === 'pending');

      for (const action of pending) {
        try {
          await this.processAction(action);
          action.status = 'completed';
          await this.saveToDB('offline-queue', action);
          logger.info(`Processed offline action: ${action.type}`);
        } catch (error) {
          action.retries = (action.retries || 0) + 1;
          if (action.retries >= 3) {
            action.status = 'failed';
          }
          await this.saveToDB('offline-queue', action);
          logger.error(`Failed to process offline action: ${action.type}`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to process offline queue', error);
    }
  }

  /**
   * Process individual action
   */
  async processAction(action) {
    switch (action.type) {
      case 'RECORD_CHECKIN':
        return await this.syncCheckin(action.payload);
      case 'ADD_SUPPLEMENT':
        return await this.syncSupplement(action.payload);
      case 'UPDATE_PROFILE':
        return await this.syncProfile(action.payload);
      default:
        logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Sync checkin with server
   */
  async syncCheckin(checkin) {
    const response = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkin)
    });

    if (!response.ok) throw new Error('Sync failed');
    return response.json();
  }

  /**
   * Sync supplement with server
   */
  async syncSupplement(supplement) {
    const response = await fetch('/api/supplements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supplement)
    });

    if (!response.ok) throw new Error('Sync failed');
    return response.json();
  }

  /**
   * Sync profile with server
   */
  async syncProfile(profile) {
    const response = await fetch('/api/profile/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });

    if (!response.ok) throw new Error('Sync failed');
    return response.json();
  }

  /**
   * Handle coming online
   */
  async onOnline() {
    this.isOnline = true;
    logger.info('App is online');

    // Process offline queue
    await this.processOfflineQueue();

    // Emit event for components to update
    window.dispatchEvent(new CustomEvent('pwa:online'));
  }

  /**
   * Handle going offline
   */
  onOffline() {
    this.isOnline = false;
    logger.info('App is offline');

    // Emit event for components to show offline indicator
    window.dispatchEvent(new CustomEvent('pwa:offline'));
  }

  /**
   * Get offline status
   */
  getStatus() {
    return {
      online: this.isOnline,
      queueLength: this.offlineQueue.length,
      dbReady: this.db !== null
    };
  }

  /**
   * Cache API response
   */
  async cacheResponse(key, data, ttl = 86400) {
    const cacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (ttl * 1000)
    };

    await this.saveToDB('cache', cacheEntry);
    logger.info(`Response cached: ${key}`);
  }

  /**
   * Get cached response if not expired
   */
  async getCachedResponse(key) {
    const entry = await this.getFromDB('cache', key);

    if (!entry) return null;

    // Check if expired
    if (entry.expiry < Date.now()) {
      // Delete expired
      await this.deleteFromDB('cache', key);
      return null;
    }

    return entry.data;
  }

  /**
   * Delete from IndexedDB
   */
  async deleteFromDB(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear offline queue
   */
  async clearQueue() {
    this.offlineQueue = [];
    const transaction = this.db.transaction(['offline-queue'], 'readwrite');
    const store = transaction.objectStore('offline-queue');
    await store.clear();
    logger.info('Offline queue cleared');
  }

  /**
   * Export data for backup
   */
  async exportData() {
    const checkins = await this.getAllFromDB('checkins');
    const stack = await this.getAllFromDB('stack');

    return {
      checkins,
      stack,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data from backup
   */
  async importData(backup) {
    try {
      for (const checkin of backup.checkins) {
        await this.saveToDB('checkins', checkin);
      }

      for (const supplement of backup.stack) {
        await this.saveToDB('stack', supplement);
      }

      logger.info('Data imported successfully');
      return true;
    } catch (error) {
      logger.error('Failed to import data', error);
      return false;
    }
  }
}

export default new PWAOfflineManager();
