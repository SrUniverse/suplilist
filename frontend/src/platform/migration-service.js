/**
 * migration-service.js — Client-side Data Migration Service (IndexedDB to API).
 *
 * Responsibilities:
 *  - Listens for AUTH_LOGIN_SUCCESS.
 *  - Performs split-brain validation to prevent cross-user data exposure.
 *  - Performs double-flag checks (local state _ownerId & server profile migrationVersion).
 *  - Automatically migrates local client-side state (stack, favorites, check-ins) to server database.
 *  - Implements deadline-aware idle loop batching (requestIdleCallback) to prevent thread blocking (jank).
 *  - Idempotent: checks compound unique indexes on database.
 */

import { apiFetch, ApiError } from './api-client.js';
import { stateManager, ACTIONS } from '../state/state-manager.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { logger } from '../utils/logger.js';

const requestIdleCallback = (typeof window !== 'undefined' && window.requestIdleCallback) || function(cb) {
  const start = Date.now();
  return setTimeout(function() {
    cb({
      didTimeout: false,
      timeRemaining: function() {
        return Math.max(0, 50 - (Date.now() - start));
      }
    });
  }, 1);
};

class MigrationService {
  constructor() {
    this._registerLoginListener();
  }

  _registerLoginListener() {
    eventBus.on(EVENTS.AUTH_LOGIN_SUCCESS, async (payload) => {
      const user = payload?.user;
      const userId = user?.userId || user?.id;
      if (user && userId) {
        await this.checkAndMigrate(userId, user.migrationVersion);
      }
    });
  }

  /**
   * Evaluates if a data migration is required and initiates it.
   *
   * @param {string} userId
   * @param {number} [serverVersion]
   */
  async checkAndMigrate(userId, serverVersion) {
    // 1. Split-Brain check
    const currentOwner = stateManager.state._ownerId;
    if (currentOwner && currentOwner !== userId) {
      logger.warn('[MigrationService] Split-brain detected! Current state belongs to different owner. Purging...');
      this._purgeUserData();
      // After purge, ownerId is null, and we can migrate the clean/default state.
    }

    // 2. If server already says migration is complete, we skip migration but stamp the local state.
    if (serverVersion && serverVersion >= 1) {
      if (stateManager.state._ownerId !== userId) {
        stateManager.dispatch({ type: ACTIONS.SET_OWNER_ID, payload: userId });
        stateManager._flushPersist();
      }
      return;
    }

    // 3. Double-flag check: local stamp matches user, meaning we migrated in this/previous session but server doesn't have version sync.
    if (stateManager.state._ownerId === userId) {
      await this._syncMigrationVersionWithServer(1);
      return;
    }

    // 4. Run migration
    await this.migrate(userId);
  }

  /**
   * Clear local user-specific data from stateManager (preserving app preferences).
   */
  _purgeUserData() {
    stateManager.dispatch({ type: ACTIONS.CLEAR_STACK });
    stateManager.dispatch({ type: ACTIONS.CLEAR_CHECKINS });
    stateManager.dispatch({ type: ACTIONS.SET_FAVORITES, payload: [] });
    stateManager.dispatch({ type: ACTIONS.INVALIDATE_RECOMMENDATIONS });
    stateManager.dispatch({ type: ACTIONS.SET_OWNER_ID, payload: null });
    stateManager._flushPersist();
  }

  /**
   * Performs the multi-entity data migration.
   */
  async migrate(userId) {
    try {
      logger.info('[MigrationService] Beginning user data migration to server API...');

      // A. Migrate Stack Items
      const stack = stateManager.state.stack || [];
      if (stack.length > 0) {
        const payload = stack.map(item => ({
          supplementId: item.id || item.supplementId,
          name: item.name,
          dosage: item.dosage,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
        await this._uploadEntity('/api/stack/bulk', payload, 'PUT');
      }

      // B. Migrate Favorites
      const favorites = stateManager.state.favorites || [];
      if (favorites.length > 0) {
        await this._uploadEntity('/api/favorites/bulk', { supplementIds: favorites }, 'PUT');
      }

      // C. Migrate Check-ins
      const checkins = stateManager.state.checkins || [];
      if (checkins.length > 0) {
        const mapped = checkins.map(c => ({
          clientId: c.id,
          supplementId: c.supplementId,
          date: c.date,
          timestamp: c.timestamp,
          note: c.note,
          createdAt: c.createdAt,
        }));
        const success = await this._uploadCheckins(mapped);
        if (!success) {
          return; // Skipped due to 404 feature-detect
        }
      }

      // D. Mark Complete
      await this._markComplete(userId);
      logger.info('[MigrationService] Data migration completed successfully.');
    } catch (err) {
      if (err.message === 'endpoint_not_supported') {
        return;
      }
      logger.error('[MigrationService] Migration failed:', err);
    }
  }

  async _uploadEntity(path, payload, method = 'PUT') {
    try {
      await apiFetch(path, {
        method,
        body: JSON.stringify(payload),
      });
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        logger.info(`[MigrationService] Endpoint ${path} not found — skipping migration.`);
        throw new Error('endpoint_not_supported', { cause: err });
      }
      throw err;
    }
  }

  /**
   * Upload check-ins in batches of 100 with max 3 concurrent requests, using requestIdleCallback to keep frame rate high.
   */
  _uploadCheckins(checkins) {
    const BATCH_SIZE = 100;
    const queue = [...checkins];
    const activePromises = [];
    const MAX_CONCURRENT = 3;

    return new Promise((resolve, _reject) => {
      let endpointSupported = true;

      const tick = (deadline) => {
        while (
          queue.length > 0 &&
          activePromises.length < MAX_CONCURRENT &&
          deadline.timeRemaining() > 5 &&
          endpointSupported
        ) {
          const batch = queue.splice(0, BATCH_SIZE);
          const p = apiFetch('/api/checkin/bulk', {
            method: 'POST',
            body: JSON.stringify({ entries: batch }),
          }).catch(err => {
            if (err instanceof ApiError && err.status === 404) {
              endpointSupported = false;
              logger.info('[MigrationService] Checkin bulk endpoint not found.');
            } else {
              throw err;
            }
          });

          activePromises.push(p);
          p.finally(() => {
            const idx = activePromises.indexOf(p);
            if (idx > -1) activePromises.splice(idx, 1);
          });
        }

        if (!endpointSupported) {
          resolve(false);
        } else if (queue.length > 0 || activePromises.length > 0) {
          requestIdleCallback(tick, { timeout: 2000 });
        } else {
          resolve(true);
        }
      };

      requestIdleCallback(tick, { timeout: 2000 });
    });
  }

  async _markComplete(userId) {
    // Stamp the local state ownerId
    stateManager.dispatch({ type: ACTIONS.SET_OWNER_ID, payload: userId });
    stateManager._flushPersist();

    // Sync version metadata with server
    await this._syncMigrationVersionWithServer(1);
  }

  async _syncMigrationVersionWithServer(version) {
    try {
      await apiFetch('/api/profile/me/migration-sync', {
        method: 'PATCH',
        body: JSON.stringify({ migrationVersion: version }),
      });
    } catch (err) {
      logger.warn('[MigrationService] Failed to sync migration version with server:', err);
    }
  }
}

export const migrationService = new MigrationService();
export default migrationService;
