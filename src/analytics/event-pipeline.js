// ============================================================
// EventPipeline — SupliList v4.0
// Captures, validates, deduplicates, and persists all events
// ============================================================

import { eventBus, EVENTS } from '../core/event-bus.js';
import { stateManager } from '../state/state-manager.js';
import { analyticsStorage } from './storage/analytics-storage.js';
import { eventValidator, sanitizeEventPayload, containsPII } from './utils/event-validator.js';
import { generateSessionId, generateEventId, redactUserAgent, detectDeviceType } from './utils/crypto-utils.js';
import { logger } from '../utils/logger.js';

/**
 * EventPipeline captures all EventBus events, validates, deduplicates, and persists them
 * @class EventPipeline
 */
export class EventPipeline {
  #sessionId = null;
  #seenEventIds = new Set();  // In-memory dedup cache (last 1000)
  #maxDedupeCache = 1000;
  #enabled = false;
  #batchBuffer = [];
  #batchSize = 10;
  #batchTimeoutMs = 100;
  #batchTimeout = null;

  constructor() {
    this.stats = {
      eventsProcessed: 0,
      eventsDeduped: 0,
      eventsPersisted: 0,
      eventsFailed: 0,
      piiDetected: 0
    };
  }

  /**
   * Initialize the pipeline
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Generate session ID
      this.#sessionId = await generateSessionId();
      logger.info(`[EventPipeline] Initialized with sessionId: ${this.#sessionId.substring(0, 8)}...`);

      // Initialize storage
      await analyticsStorage.init();

      // Listen to all EventBus events
      eventBus.on('*', (eventName, payload) => {
        this.#handleBusEvent(eventName, payload);
      });

      this.#enabled = true;

      // Emit pipeline ready event
      eventBus.emit(EVENTS.APP_READY, {
        analyticsReady: true,
        sessionId: this.#sessionId
      });
    } catch (err) {
      logger.error('[EventPipeline] Initialization failed:', err);
      throw err;
    }
  }

  /**
   * Handle incoming EventBus event
   * @private
   * @param {string} eventName
   * @param {*} payload
   */
  #handleBusEvent(eventName, payload) {
    if (!this.#enabled || eventName === 'analytics:eventTracked') {
      // Don't track our own events (prevent infinite loops)
      return;
    }

    // Skip irrelevant events (internal routing, UI)
    const ignoredEvents = ['ui:', 'route:', 'error:', 'toast:', 'modal:'];
    if (ignoredEvents.some(prefix => eventName.startsWith(prefix))) {
      return;
    }

    this.trackEvent(eventName, payload).catch(err => {
      logger.error(`[EventPipeline] Error tracking event "${eventName}":`, err);
      this.stats.eventsFailed++;
    });
  }

  /**
   * Track an event (main entry point)
   * @param {string} eventName
   * @param {*} payload
   * @returns {Promise<void>}
   */
  async trackEvent(eventName, payload) {
    try {
      // Step 1: Check for PII
      if (containsPII(eventName, payload)) {
        logger.warn(`[EventPipeline] PII detected in "${eventName}", skipping`);
        this.stats.piiDetected++;
        return;
      }

      // Step 2: Validate event payload
      const validation = eventValidator.validate(eventName, payload);
      if (!validation.valid) {
        logger.warn(`[EventPipeline] Event "${eventName}" validation errors:`, validation.errors);
      }

      // Step 3: Sanitize payload
      const sanitized = sanitizeEventPayload(eventName, payload);

      // Step 4: Generate event ID
      const state = stateManager.state;
      const userId = state?.user?.id || null;
      const eventId = await generateEventId(eventName, Date.now(), userId);

      // Step 5: Check for duplicates
      if (this.#seenEventIds.has(eventId)) {
        logger.debug(`[EventPipeline] Duplicate event detected: ${eventName}`);
        this.stats.eventsDeduped++;
        return;
      }

      this.#seenEventIds.add(eventId);
      if (this.#seenEventIds.size > this.#maxDedupeCache) {
        // Keep only recent IDs (FIFO)
        const firstItem = this.#seenEventIds.values().next().value;
        this.#seenEventIds.delete(firstItem);
      }

      // Step 6: Enrich event
      const enrichedEvent = {
        eventId,
        eventName,
        payload: sanitized,
        sessionId: this.#sessionId,
        userId,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.pathname : '',
        userAgent: typeof navigator !== 'undefined' ? redactUserAgent(navigator.userAgent) : '',
        device: typeof navigator !== 'undefined' ? detectDeviceType(navigator.userAgent) : 'desktop'
      };

      // Step 7: Buffer and batch
      this.#batchBuffer.push(enrichedEvent);
      this.stats.eventsProcessed++;

      if (this.#batchBuffer.length >= this.#batchSize) {
        await this.#flushBatch();
      } else {
        // Schedule flush after timeout
        if (!this.#batchTimeout) {
          this.#batchTimeout = setTimeout(() => this.#flushBatch(), this.#batchTimeoutMs);
        }
      }

      // Emit tracking event for analytics listeners
      eventBus.emit('analytics:eventTracked', {
        eventId,
        eventName,
        sessionId: this.#sessionId
      });
    } catch (err) {
      logger.error('[EventPipeline] trackEvent error:', err);
      this.stats.eventsFailed++;
      throw err;
    }
  }

  /**
   * Flush buffered events to storage
   * @private
   * @returns {Promise<void>}
   */
  async #flushBatch() {
    if (this.#batchTimeout) {
      clearTimeout(this.#batchTimeout);
      this.#batchTimeout = null;
    }

    if (this.#batchBuffer.length === 0) {
      return;
    }

    const batch = [...this.#batchBuffer];
    this.#batchBuffer = [];

    try {
      for (const event of batch) {
        await analyticsStorage.addEvent(event);
        this.stats.eventsPersisted++;
      }

      logger.debug(`[EventPipeline] Flushed ${batch.length} events to storage`);
    } catch (err) {
      logger.error('[EventPipeline] Batch flush failed:', err);
      this.stats.eventsFailed += batch.length;
      // Re-queue? Decide based on error type
      throw err;
    }
  }

  /**
   * Get pipeline statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      sessionId: this.#sessionId?.substring(0, 8) + '...',
      bufferSize: this.#batchBuffer.length,
      dedupeCache: this.#seenEventIds.size
    };
  }

  /**
   * Get current session ID
   * @returns {string|null}
   */
  getSessionId() {
    return this.#sessionId;
  }

  /**
   * Force flush pending events
   * @returns {Promise<void>}
   */
  async flush() {
    return this.#flushBatch();
  }

  /**
   * Reset pipeline (for testing)
   * @returns {Promise<void>}
   */
  async reset() {
    if (this.#batchTimeout) {
      clearTimeout(this.#batchTimeout);
    }

    this.#batchBuffer = [];
    this.#seenEventIds.clear();
    this.stats = {
      eventsProcessed: 0,
      eventsDeduped: 0,
      eventsPersisted: 0,
      eventsFailed: 0,
      piiDetected: 0
    };

    await analyticsStorage.clearAll();
  }
}

// Export singleton
export const eventPipeline = new EventPipeline();
