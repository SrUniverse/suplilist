// ============================================================
// EventBus v4.0 — SupliList
// Global Pub/Sub System. Singleton.
// All inter-module communication goes through here.
// Decouples producers from consumers completely.
// ============================================================

import { logger } from '../utils/logger.js';

/**
 * Valid event namespaces.
 * Format: 'namespace:action'
 * Adding new events here prevents typos across the codebase.
 */
export const EVENTS = Object.freeze({
  // App lifecycle
  APP_READY: 'app:ready',
  APP_THEME_CHANGED: 'app:themeChanged',

  // Router
  ROUTE_CHANGED: 'route:changed',
  ROUTE_NOT_FOUND: 'route:notFound',
  UI_ROUTE_CHANGED: 'ui:routeChanged',
  ROUTER_NAVIGATE: 'router:navigate',
  ROUTER_NAVIGATE_REQUEST: 'router:navigate:request',

  // User profile / onboarding
  PROFILE_UPDATED: 'user:profileUpdated',
  PROFILE_LOADED: 'user:profileLoaded',
  ONBOARDING_COMPLETE: 'user:onboardingComplete',

  // Supplements
  SUPPLEMENTS_LOADED: 'supplements:loaded',
  SUPPLEMENTS_FILTERED: 'supplements:filtered',

  // Supplement stack
  STACK_UPDATED: 'stack:updated',
  STACK_ITEM_ADDED: 'stack:itemAdded',
  STACK_ITEM_REMOVED: 'stack:itemRemoved',
  STACK_ITEM_ADDED_LEGACY: 'stack:item:added',
  STACK_ITEM_REMOVED_LEGACY: 'stack:item:removed',
  STACK_CLEARED: 'stack:cleared',
  STACK_EXPORTED: 'stack:exported',
  STACK_OPTIMIZE: 'stack:optimize',
  STACK_PROTOCOL_ACTIVATED: 'stack:protocol:activated',

  // Check-in
  CHECKIN_LOGGED: 'checkin:logged',
  CHECKIN_STREAK_UPDATED: 'checkin:streakUpdated',
  CHECKIN_ADDED: 'checkin:added',
  HOME_CHECKIN_COMPLETED: 'home:checkin:completed',

  // Local AI Engine
  AI_RECOMMENDATIONS_READY: 'ai:recommendationsReady',
  AI_RECOMMENDATIONS_INVALID: 'ai:recommendationsInvalid',

  // Biometrics (wearables)
  BIOMETRICS_UPDATED: 'biometria:updated',

  // Social / Gamification
  SOCIAL_INTERACTION: 'social:interaction',

  // Pricing
  PRICE_UPDATED: 'price:updated',
  PRICE_DROPPED: 'price:dropped',

  // Premium
  PREMIUM_UNLOCKED: 'premium:unlocked',
  PREMIUM_EXPIRED: 'premium:expired',

  // Connectivity
  APP_ONLINE: 'app:online',
  APP_OFFLINE: 'app:offline',
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',
  SYNC_SUBSCRIPTION: 'sync:subscription',
  SYNC_QUEUE_EMPTIED: 'sync:queue:emptied',
  SYNC_QUEUE_UPDATED: 'sync:queue:updated',

  // UI
  UI_ONLINE: 'ui:online',
  UI_OFFLINE: 'ui:offline',
  TOAST_REQUESTED: 'ui:toastRequested',
  TOAST_SHOW: 'toast:show',
  TOAST_DISMISS: 'toast:dismiss',
  MODAL_OPEN: 'ui:modalOpen',
  MODAL_CLOSE: 'ui:modalClose',
  MODAL_REQUESTED: 'ui:modalRequested',
  SEARCH_QUERY: 'ui:searchQuery',
  UI_THEME_TOGGLE_REQUESTED: 'ui:theme:toggle:requested',
  UI_THEME_CHANGED: 'ui:theme:changed',
  UI_STACK_REORDER_REQUESTED: 'ui:stack:reorder:requested',

  // Supplement UI interactions
  UI_SUPPLEMENT_DETAIL_REQUESTED: 'ui:supplement:detail:requested',
  UI_SUPPLEMENT_COMPARE_REQUESTED: 'ui:supplement:compare:requested',
  UI_SUPPLEMENT_FAVORITE_REQUESTED: 'ui:supplement:favorite:requested',
  UI_SUPPLEMENT_BUY_REQUESTED: 'ui:supplement:buy:requested',
  SUPPLEMENT_DETAIL_OPEN: 'supplement:detail:open',
  SUPPLEMENT_VIEW: 'supplement:view',
  SUPPLEMENT_FAVORITE_TOGGLE: 'supplement:favorite:toggle',
  SUPPLEMENT_BUY: 'supplement:buy',

  // Favorites
  FAVORITES_UPDATED: 'favorites:updated',
  FAVORITES_FILTER_CHANGED: 'favorites:filter:changed',
  FAVORITES_SORT_CHANGED: 'favorites:sort:changed',
  FAVORITE_TOGGLED: 'favorite:toggled',

  // Inventory
  INVENTORY_UPDATED: 'inventory:updated',
  INVENTORY_URGENT: 'inventory:urgent',

  // History / Cycles
  HISTORY_UPDATED: 'history:updated',
  HISTORY_FILTER_CHANGED: 'history:filter:changed',
  HISTORY_LOAD_MORE: 'history:load:more',
  HISTORY_PAGE_LOADED: 'history:page:loaded',
  HISTORY_STALLED: 'history:stalled',
  HISTORY_EOF: 'history:eof',
  HISTORY_VIEW_DETAILS: 'history:view:details',
  CYCLE_COMPLETED: 'cycle:completed',
  CYCLE_VIEW_LOGS: 'cycle:view:logs',

  // Dosage
  DOSAGE_CALCULATED: 'dosage:calculated',
  DOSAGE_ADDED_TO_STACK: 'dosage:added:to:stack',
  DOSAGE_PRESELECT: 'dosage:preselect',

  // Comparator
  COMPARATOR_OPEN: 'comparator:open',
  COMPARE_PRESELECT: 'compare:preselect',

  // Affiliate / Commerce
  AFFILIATE_CLICK: 'affiliate_click',
  CHECKOUT_INITIATED: 'checkout:initiated',

  // List page
  LIST_FILTER_CHANGED: 'list:filter:changed',
  LIST_ADVANCED_FILTER_APPLIED: 'list:advanced-filter:applied',

  // Authentication
  AUTH_LOGIN_SUCCESS: 'auth:loginSuccess',
  AUTH_LOGOUT: 'auth:logout',
  /**
   * Emitted by api-client when POST /api/auth/refresh fails.
   * identity-service listens and clears local session.
   */
  AUTH_EXPIRED: 'auth:expired',
  AUTH_SESSION_REFRESHED: 'auth:sessionRefreshed',

  // Settings
  SETTINGS_CHANGED: 'settings:changed',

  // State
  STATE_CHANGED: 'state:changed',
  STATE_IMPORTED: 'state:imported',
  STATE_REHYDRATED: 'state:rehydrated',   // emitido pelo listener de storage v3

  // Analytics
  ANALYTICS_EVENT_TRACKED: 'analytics:eventTracked',

  // System
  SYSTEM_ERROR: 'error:system',
  COMPONENT_ERROR: 'component:error',
  ERROR_PERSISTENCE: 'error:persistence', // emitido quando localStorage.setItem falha
});

/**
 * EventBus — Global pub/sub system
 *
 * Decouples all inter-module communication. Single-threaded event emission
 * with automatic listener cleanup via WeakRef. Maintains event history
 * (capped at 50 events) for debugging and replay.
 *
 * Features:
 * - Named events (EVENTS.STACK_UPDATED) with payload
 * - Wildcard listeners ('*') receive (eventName, payload)
 * - Specific listeners receive (payload, eventName)
 * - Auto-cleanup when DOM elements disconnect
 * - Once-only subscriptions via once()
 * - Error isolation — listener exceptions emit 'error:system' instead of crashing
 * - History tracking for debugging
 */
export class EventBus {
  /** @type {Map<string, Set<{callback: Function, elementRef: WeakRef|null, once: boolean}>>} */
  subscribers = new Map();
  /** @type {Array<{name: string, eventType: string, payload: *, timestamp: number}>} */
  #history = [];
  /** @type {boolean} */
  #debug = false;
  // P12: shift() é O(n) — limite reduzido de 100 para 50 para manter footprint baixo.
  // Para alta frequência real, substituir por buffer circular com índice de escrita.
  /** @type {number} */
  #maxHistorySize = 50;

  /**
   * Subscribe to an event.
   *
   * Supports passing an HTMLElement context for automatic unsubscription when the element
   * disconnects from the DOM (memory-safe cleanup using WeakRef).
   *
   * Specific listeners receive: (payload, eventName)
   * Wildcard listeners receive: (eventName, payload)
   *
   * @param {string} eventName - Known event name from EVENTS or '*' for wildcard
   * @param {Function} callback - Callback function invoked on event
   * @param {HTMLElement|{element: HTMLElement}} [options] - DOM element for auto-cleanup, or options object
   * @returns {Function} Unsubscribe function — call to remove the listener
   *
   * @example
   * // Simple usage
   * const unsub = eventBus.on(EVENTS.STACK_UPDATED, (payload) => {
   *   console.log('Stack changed:', payload);
   * });
   *
   * // With DOM element (auto-cleanup on disconnect)
   * eventBus.on(EVENTS.CHECKIN_LOGGED, handleCheckIn, myComponentElement);
   *
   * // Unsubscribe explicitly
   * unsub();
   */
  on(eventName, callback, options = null) {
    this.#validateEvent(eventName);

    if (typeof callback !== 'function') {
      if (this.#debug) {
        logger.warn(`[EventBus] handler must be a function.`);
      }
      return () => { };
    }

    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, new Set());
    }

    let element = null;
    if (options) {
      if (options instanceof HTMLElement || (typeof options === 'object' && options.nodeType === 1)) {
        element = options;
      } else if (typeof options === 'object' && options.element) {
        element = options.element;
      }
    }

    const listener = {
      callback,
      elementRef: element ? new WeakRef(element) : null,
      once: false
    };

    this.subscribers.get(eventName).add(listener);

    // Return unsubscribe function
    return () => this.off(eventName, callback);
  }

  /**
   * Subscribe once to an event (auto-unsubscribes after first trigger).
   *
   * Same signature and behavior as on(), but the callback fires exactly once
   * and is automatically removed.
   *
   * @param {string} eventName - Known event name from EVENTS or '*' for wildcard
   * @param {Function} callback - Callback function invoked on first event
   * @param {HTMLElement|{element: HTMLElement}} [options] - DOM element for auto-cleanup
   * @returns {Function} Unsubscribe function
   *
   * @example
   * eventBus.once(EVENTS.ONBOARDING_COMPLETE, () => {
   *   console.log('Onboarding finished! This prints only once.');
   * });
   */
  once(eventName, callback, options = null) {
    this.#validateEvent(eventName);

    if (typeof callback !== 'function') {
      if (this.#debug) {
        logger.warn(`[EventBus] handler must be a function.`);
      }
      return () => { };
    }

    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, new Set());
    }

    let element = null;
    if (options) {
      if (options instanceof HTMLElement || (typeof options === 'object' && options.nodeType === 1)) {
        element = options;
      } else if (typeof options === 'object' && options.element) {
        element = options.element;
      }
    }

    const listener = {
      callback,
      elementRef: element ? new WeakRef(element) : null,
      once: true
    };

    this.subscribers.get(eventName).add(listener);

    return () => this.off(eventName, callback);
  }

  /**
   * Unsubscribe a specific callback from an event.
   *
   * Removes the listener for the given event. Safe to call multiple times
   * or for listeners that are already removed.
   *
   * @param {string} eventName - Event name to unsubscribe from
   * @param {Function} callback - The exact callback function to remove
   * @returns {void}
   *
   * @example
   * eventBus.off(EVENTS.STACK_UPDATED, myHandler);
   */
  off(eventName, callback) {
    const listeners = this.subscribers.get(eventName);
    if (!listeners) return;

    for (const listener of listeners) {
      if (listener.callback === callback) {
        listeners.delete(listener);
        break;
      }
    }
  }

  /**
   * Emit an event with optional payload.
   *
   * Triggers all registered listeners for the event plus any wildcard ('*') listeners.
   * Each event is timestamped and added to history (max 50 events kept).
   *
   * Listener exceptions are caught and re-emitted as 'error:system' events to prevent
   * crash cascades. Disconnected DOM element listeners are pruned automatically.
   *
   * Callback signature differs by listener type:
   * - Specific listeners: callback(payload, eventName)
   * - Wildcard listeners: callback(eventName, payload)
   *
   * @param {string} eventName - Known event name from EVENTS
   * @param {*} [payload=null] - Optional event payload (any type)
   * @returns {void}
   * @throws {Error} If eventName is not in EVENTS and not a test event
   *
   * @example
   * // Simple event, no payload
   * eventBus.emit(EVENTS.APP_READY);
   *
   * // Event with payload
   * eventBus.emit(EVENTS.STACK_UPDATED, { itemId: '123', quantity: 5 });
   *
   * // Wildcard listener example
   * eventBus.on('*', (eventName, payload) => {
   *   console.log(`Event: ${eventName}`, payload);
   * });
   */
  emit(eventName, payload = null) {
    this.#validateEvent(eventName);

    const event = {
      name: eventName,
      eventType: eventName, // compatibility with legacy history format
      payload,
      timestamp: Date.now(),
    };

    this.#history.push(event);
    if (this.#history.length > this.#maxHistorySize) {
      this.#history.shift();
    }


    // Prune disconnected listeners first
    this.#pruneListeners(eventName);
    this.#pruneListeners('*');

    const specificListeners = this.subscribers.get(eventName);
    const wildcardListeners = this.subscribers.get('*');

    // Trigger specific listeners safely
    if (specificListeners && specificListeners.size > 0) {
      // Create a snapshot to handle self-unsubscribing listeners safely
      const snapshot = [...specificListeners];
      snapshot.forEach(listener => {
        try {
          listener.callback(payload, eventName);
        } catch (err) {
          logger.error(`[EventBus] Callback error for "${eventName}":`, err);

          // Emit a system error to prevent crashing, but avoid infinite loop
          if (eventName !== 'error:system') {
            this.emit('error:system', {
              originalEvent: eventName,
              payload: payload,
              error: err.message,
              stack: err.stack,
            });
          }
        }
        if (listener.once) {
          specificListeners.delete(listener);
        }
      });
    }

    // Trigger wildcard listeners safely
    if (wildcardListeners && wildcardListeners.size > 0) {
      const snapshot = [...wildcardListeners];
      snapshot.forEach(listener => {
        try {
          listener.callback(eventName, payload);
        } catch (err) {
          logger.error(`[EventBus] Wildcard callback error for "${eventName}":`, err);

          if (eventName !== 'error:system') {
            this.emit('error:system', {
              originalEvent: eventName,
              payload: payload,
              error: err.message,
              stack: err.stack,
            });
          }
        }
        if (listener.once) {
          wildcardListeners.delete(listener);
        }
      });
    }
  }

  /**
   * Prune listeners whose DOM elements have been disconnected.
   *
   * Uses WeakRef to check if a listener's associated DOM element still exists
   * and is connected to the document. Removed disconnected listeners to prevent
   * memory leaks from circular references.
   *
   * @param {string} eventName - Event name to prune listeners for
   * @returns {void}
   * @private
   */
  #pruneListeners(eventName) {
    const listeners = this.subscribers.get(eventName);
    if (!listeners) return;

    const snapshot = [...listeners];
    for (const listener of snapshot) {
      if (listener.elementRef) {
        const element = listener.elementRef.deref();
        if (!element || !element.isConnected) {
          listeners.delete(listener);
        }
      }
    }
  }

  /**
   * Get recent event history (max 50 most recent events).
   *
   * Useful for debugging and understanding what events fired and in what order.
   * Returns a copy of the history array to prevent external mutation.
   *
   * @param {string} [filterName] - Optional event name to filter by
   * @returns {Array<{name: string, eventType: string, payload: *, timestamp: number}>} Event history
   *
   * @example
   * // Get all recent events
   * const allEvents = eventBus.getHistory();
   *
   * // Get only STACK_UPDATED events
   * const stackEvents = eventBus.getHistory(EVENTS.STACK_UPDATED);
   */
  getHistory(filterName) {
    if (filterName) {
      return this.#history.filter(h => h.name === filterName || h.eventType === filterName);
    }
    return [...this.#history];
  }

  /**
   * Clear all event history logs.
   *
   * @returns {void}
   */
  clearHistory() {
    this.#history = [];
  }

  /**
   * Enable or disable debug logging for EventBus operations.
   *
   * When enabled, logs warnings and debug info to the logger. Useful during
   * development to catch misconfigured event names or listener issues.
   *
   * @param {boolean} enabled - True to enable debug logging, false to disable
   * @returns {void}
   *
   * @example
   * eventBus.setDebug(true); // Enable during development
   * eventBus.setDebug(false); // Disable for production
   */
  setDebug(enabled) {
    this.#debug = !!enabled;
  }

  /**
   * Validate that the event name is known.
   * Allows '*' (wildcard), 'test:*', and 'event:*' namespaces for testing.
   *
   * @param {string} eventName - Event name to validate
   * @throws {Error} If eventName is not in EVENTS and not a test event
   * @private
   */
  #validateEvent(eventName) {
    // Allow wildcards and test namespaces
    if (eventName === '*' || eventName.startsWith('test:') || eventName.startsWith('event:')) return;

    const validEvents = Object.values(EVENTS);
    if (!validEvents.includes(eventName)) {
      throw new Error(
        `[EventBus] Unknown event: "${eventName}". ` +
        `Add it to EVENTS in event-bus.js before using.`
      );
    }
  }

  /**
   * Remove all listeners for an event, or clear the entire bus (testing/cleanup).
   *
   * Useful for test isolation and cleanup. When called with no arguments,
   * clears all listeners and history.
   *
   * @param {string} [eventName] - Optional specific event to clear. If omitted, clears all.
   * @returns {void}
   *
   * @example
   * // Clear all listeners and history for testing
   * eventBus.clear();
   *
   * // Clear only STACK_UPDATED listeners
   * eventBus.clear(EVENTS.STACK_UPDATED);
   */
  clear(eventName) {
    if (eventName) {
      this.#validateEvent(eventName);
      this.subscribers.delete(eventName);
    } else {
      this.subscribers.clear();
      this.#history = [];
    }
  }

  /**
   * Get the count of registered listeners for an event.
   *
   * Automatically prunes disconnected DOM element listeners before counting.
   * Used for debugging listener registration and detecting memory leaks.
   *
   * @param {string} eventName - Event name (or '*' for wildcard count)
   * @returns {number} Number of active listeners
   *
   * @example
   * const count = eventBus.listenerCount(EVENTS.STACK_UPDATED);
   * console.log(`${count} listeners registered for STACK_UPDATED`);
   */
  listenerCount(eventName) {
    if (eventName !== '*') {
      this.#validateEvent(eventName);
    }
    this.#pruneListeners(eventName);
    return this.subscribers.get(eventName)?.size || 0;
  }
}

/**
 * EventBus singleton instance.
 * Imported once and shared globally across the application for all inter-module communication.
 * @type {EventBus}
 */
export const eventBus = new EventBus();
