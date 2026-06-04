/**
 * @fileoverview SyncQueue — Background Sync para offline check-ins.
 * Persistem check-ins feitos offline em IndexedDB, detectam volta de rede,
 * e enviam silenciosamente para o servidor via /api/checkin/bulk.
 */

import { apiFetch, ApiError } from './api-client.js';
import { eventBus } from '../core/event-bus.js';
import { logger } from '../utils/logger.js';

const STORE_NAME = 'offline-checkins';
const DB_NAME = 'suplilist-sync';

/**
 * Fila de sincronização offline para check-ins.
 * Armazena em IndexedDB, sincroniza quando rede volta.
 */
export class SyncQueue {
  /**
   * @param {number} [maxRetries=3] - Máximo de tentativas por item
   * @param {number} [batchSize=50] - Tamanho do lote para sincronização
   */
  constructor(maxRetries = 3, batchSize = 50) {
    this.db = null;
    this.maxRetries = maxRetries;
    this.batchSize = batchSize;
    this.isSyncing = false;
    this._cachedPending = [];
  }

  /**
   * Inicializa o banco de dados IndexedDB.
   * @returns {Promise<void>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = async () => {
        this.db = request.result;
        logger.debug('[SyncQueue] IndexedDB initialized');
        await this._refreshCache();
        resolve();
      };

      request.onerror = () => {
        logger.error('[SyncQueue] Failed to initialize IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Adiciona um check-in à fila para sincronização offline.
   * @param {Object} checkin - { supplementId, date, timestamp?, note? }
   * @returns {Promise<void>}
   */
  async enqueue(checkin) {
    if (!this.db) {
      logger.warn('[SyncQueue] Database not initialized. Skipping enqueue.');
      return;
    }

    const item = {
      supplementId: checkin.supplementId,
      date: checkin.date,
      timestamp: checkin.timestamp || Date.now(),
      note: checkin.note || null,
      status: 'pending',      // pending | synced | failed
      retries: 0,
      lastError: null,
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(item);

      request.onsuccess = async () => {
        logger.debug(`[SyncQueue] Check-in enqueued: ${item.supplementId} on ${item.date}`);
        await this._refreshCache();
        eventBus.emit('sync:queue:updated'); // Notifica UI que a fila mudou

        // Executor Duplo (Service Worker SyncManager Fallback)
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then(reg => {
            return reg.sync.register('sync-checkins');
          }).catch(err => logger.warn('[SyncQueue] SyncManager register failed:', err));
        }

        resolve();
      };

      request.onerror = () => {
        logger.error('[SyncQueue] Failed to enqueue check-in:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Sincroniza todos os check-ins pendentes com o servidor.
   * Chamado quando rede volta online.
   * @returns {Promise<Object>} { synced: number, failed: number }
   */
  async sync() {
    if (this.isSyncing) {
      logger.debug('[SyncQueue] Sync already in progress, skipping.');
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      // 1. Buscar todos os pendentes
      const pending = await this._getPendingCheckins();
      if (pending.length === 0) {
        logger.debug('[SyncQueue] No pending check-ins to sync.');
        this.isSyncing = false;
        return { synced: 0, failed: 0 };
      }

      logger.info(`[SyncQueue] Starting sync of ${pending.length} pending check-ins...`);

      // 2. Sincronizar em lotes
      for (let i = 0; i < pending.length; i += this.batchSize) {
        const batch = pending.slice(i, i + this.batchSize);
        const result = await this._syncBatch(batch);
        synced += result.synced;
        failed += result.failed;
      }

      logger.info(`[SyncQueue] Sync completed: ${synced} synced, ${failed} failed`);
      await this._refreshCache();
      
      if (synced > 0 && (await this._getCountByStatus('pending')) === 0) {
        eventBus.emit('sync:queue:emptied');
      }
      
      eventBus.emit('sync:complete', { synced, failed });

      return { synced, failed };
    } catch (err) {
      logger.error('[SyncQueue] Sync failed:', err);
      eventBus.emit('sync:error', { error: err.message });
      return { synced, failed };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Busca todos os check-ins com status 'pending' do IndexedDB.
   * @private
   * @returns {Promise<Array>}
   */
  _getPendingCheckins() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        logger.error('[SyncQueue] Failed to fetch pending check-ins:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Atualiza o cache local em memória de items pendentes.
   * @private
   */
  async _refreshCache() {
    try {
      this._cachedPending = await this._getPendingCheckins();
    } catch (e) {
      logger.error('[SyncQueue] Failed to refresh pending cache', e);
    }
  }

  /**
   * Retorna os itens pendentes do cache síncrono.
   * @returns {Array}
   */
  getPendingItems() {
    return this._cachedPending;
  }

  /**
   * Sincroniza um lote de check-ins com a API.
   * @private
   * @param {Array} batch - Array de items da fila
   * @returns {Promise<Object>} { synced: number, failed: number }
   */
  async _syncBatch(batch) {
    const entries = batch.map(item => ({
      supplementId: item.supplementId,
      date: item.date,
      timestamp: item.timestamp,
      note: item.note
    }));

    try {
      // POST /api/checkin/bulk
      await apiFetch('/api/checkin/bulk', {
        method: 'POST',
        body: JSON.stringify({ entries })
      });

      // Marcar como synced e limpar atomicamente — evita acúmulo indefinido no IndexedDB.
      for (const item of batch) {
        await this._updateItemStatus(item.id, 'synced');
      }
      await this.clearSynced();

      logger.debug(`[SyncQueue] Batch of ${batch.length} check-ins synced and cleaned successfully`);
      return { synced: batch.length, failed: 0 };
    } catch (err) {
      logger.error('[SyncQueue] Batch sync failed:', err);

      // Tratamento da Poison Pill: Se for 4xx (exceto 401 e 403), marca como falha fatal imediatamente
      const status = err.status || 500;
      const isHttpError = err instanceof ApiError || !!err.status;
      const isPoisonPill = isHttpError && status >= 400 && status < 500 && status !== 401 && status !== 403;

      for (const item of batch) {
        if (isPoisonPill) {
          logger.warn(`[SyncQueue] Poison pill detected for item ${item.id}. Discarding (status ${status}).`);
          await this._updateItemStatus(item.id, 'failed');
        } else if (item.retries < this.maxRetries) {
          await this._incrementRetry(item.id, err.message);
        } else {
          await this._updateItemStatus(item.id, 'failed');
        }
      }

      return { synced: 0, failed: batch.length };
    }
  }

  /**
   * Atualiza o status de um item na fila.
   * @private
   * @param {number} itemId - ID do item
   * @param {string} status - 'pending' | 'synced' | 'failed'
   * @returns {Promise<void>}
   */
  _updateItemStatus(itemId, status) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(itemId);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.status = status;
          item.updatedAt = new Date().toISOString();
          const updateReq = store.put(item);
          updateReq.onsuccess = () => resolve();
          updateReq.onerror = () => reject(updateReq.error);
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Incrementa o contador de tentativas de um item.
   * @private
   * @param {number} itemId - ID do item
   * @param {string} errorMessage - Mensagem de erro
   * @returns {Promise<void>}
   */
  _incrementRetry(itemId, errorMessage) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(itemId);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.retries += 1;
          item.lastError = errorMessage;
          item.updatedAt = new Date().toISOString();
          const updateReq = store.put(item);
          updateReq.onsuccess = () => resolve();
          updateReq.onerror = () => reject(updateReq.error);
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtém o status da fila (contagem de items por status).
   * @returns {Promise<Object>} { pending: number, synced: number, failed: number }
   */
  async getQueueStatus() {
    const pending = await this._getCountByStatus('pending');
    const synced = await this._getCountByStatus('synced');
    const failed = await this._getCountByStatus('failed');

    return { pending, synced, failed };
  }

  /**
   * Conta items com um status específico.
   * @private
   * @param {string} status - Status a contar
   * @returns {Promise<number>}
   */
  _getCountByStatus(status) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.count(status);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpa todos os items com status 'synced' da fila (cleanup).
   * Chamado automaticamente após cada _syncBatch() bem-sucedido.
   * Evita acúmulo indefinido de registros no IndexedDB.
   * @returns {Promise<number>} Número de items removidos
   */
  async clearSynced() {
    // Busca especificamente itens com status 'synced' usando o índice correto.
    // Bug anterior: usava _getPendingCheckins() que filtra por 'pending' — nunca encontrava 'synced'.
    const synced = await this._getSyncedCheckins();
    let removed = 0;
    for (const item of synced) {
      await this._deleteItem(item.id);
      removed++;
    }
    logger.debug(`[SyncQueue] Cleaned up ${removed} synced check-ins`);
    return removed;
  }

  /**
   * Busca todos os check-ins com status 'synced' do IndexedDB.
   * @private
   * @returns {Promise<Array>}
   */
  _getSyncedCheckins() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('synced');

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        logger.error('[SyncQueue] Failed to fetch synced check-ins:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Deleta um item da fila.
   * @private
   * @param {number} itemId - ID do item
   * @returns {Promise<void>}
   */
  _deleteItem(itemId) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(itemId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton
export const syncQueue = new SyncQueue();

// Listen to Service Worker Background Sync triggers
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_OFFLINE_DATA') {
      logger.info(`[SyncQueue] Service worker triggered sync for tag: ${event.data.tag}`);
      syncQueue.sync().catch(err => logger.error('[SyncQueue] SW background sync failed:', err));
    }
  });
}
