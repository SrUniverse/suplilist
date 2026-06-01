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

  // UI
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

  // Settings
  SETTINGS_CHANGED: 'settings:changed',

  // State
  STATE_CHANGED: 'state:changed',
  STATE_IMPORTED: 'state:imported',
  STATE_REHYDRATED: 'state:rehydrated',   // emitido pelo listener de storage v3

  // System
  SYSTEM_ERROR: 'error:system',
  COMPONENT_ERROR: 'component:error',
  ERROR_PERSISTENCE: 'error:persistence', // emitido quando localStorage.setItem falha
});

export class EventBus {
  subscribers = new Map();
  #history = [];
  #debug = false;
  #maxHistorySize = 100;

  /**
   * Subscribe to an event.
   * Supports passing an HTMLElement context for auto-unsubscription when disconnected (memory-safe).
   *
   * Usage:
   *   eventBus.on('stack:itemAdded', (payload) => { ... }, myComponent);
   * 
   * @param {string} eventName - Known event name from EVENTS or '*' for wildcard
   * @param {Function} callback - Callback function
   * @param {HTMLElement|Object} [options] - Associated DOM element or options object containing { element }
   * @returns {Function} Unsubscribe function
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
   * Subscribe once to an event (auto-unsubscribes on first trigger).
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
   * Emit an event with payload.
   * 
   * Specific listeners receive: (payload, eventName)
   * Wildcard listeners receive: (eventName, payload)
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
   * Get recent event history.
   */
  getHistory(filterName) {
    if (filterName) {
      return this.#history.filter(h => h.name === filterName || h.eventType === filterName);
    }
    return [...this.#history];
  }

  /**
   * Clear all history logs.
   */
  clearHistory() {
    this.#history = [];
  }

  /**
   * Enable/disable debug logging.
   */
  setDebug(enabled) {
    this.#debug = !!enabled;
  }

  /**
   * Validate that the event name is known.
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
   * Remove all listeners (useful for testing/cleanup).
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
   * Returns the count of registered listeners for an event.
   */
  listenerCount(eventName) {
    if (eventName !== '*') {
      this.#validateEvent(eventName);
    }
    this.#pruneListeners(eventName);
    return this.subscribers.get(eventName)?.size || 0;
  }
}

// Singleton — imported once, shared everywhere
export const eventBus = new EventBus();
