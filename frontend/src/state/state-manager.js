// ============================================================
// StateManager v4.0 — SupliList
// Redux-inspired Centralized State Management Singleton
// Single source of truth. Handles immutability, history/undo,
// debounced persistence, and dynamic EventBus notification.
// ============================================================

import { eventBus } from '../core/event-bus.js';
import { todayISO, offsetISO } from '../utils/date.js';
import { logger } from '../utils/logger.js';
import { StorageManager } from '../platform/storage-manager.js';

export const STATE_VERSION = '4.0.0';
export const STORAGE_KEY = 'suplilist-state-v4';

/** Canonical localStorage key constants. Import instead of hardcoding key strings. */
export const STORAGE_KEYS = Object.freeze({
  STATE:     'suplilist-state-v4',
  FAVORITES: 'suplilist:favorites',
  THEME:     'suplilist:theme',
  STACK:     'suplilist:stack',
});

// ─── Actions Registry ────────────────────────────────────────────────────────
export const ACTIONS = Object.freeze({
  SET_USER_PROFILE: 'SET_USER_PROFILE',
  COMPLETE_ONBOARDING: 'COMPLETE_ONBOARDING',
  ADD_TO_STACK: 'ADD_TO_STACK',
  REMOVE_FROM_STACK: 'REMOVE_FROM_STACK',
  UPDATE_STACK_ITEM: 'UPDATE_STACK_ITEM',       // #2 FIX: antes ausente do registro
  SET_STACK_QUANTITY: 'SET_STACK_QUANTITY',     // #2 FIX: antes ausente do registro
  RESTORE_STACK_ITEM_AT_INDEX: 'RESTORE_STACK_ITEM_AT_INDEX',
  CLEAR_STACK: 'CLEAR_STACK',
  CLEAR_CHECKINS: 'CLEAR_CHECKINS',
  ADD_CHECKIN: 'ADD_CHECKIN',
  SET_RECOMMENDATIONS: 'SET_RECOMMENDATIONS',
  INVALIDATE_RECOMMENDATIONS: 'INVALIDATE_RECOMMENDATIONS',
  SET_TIER: 'SET_TIER',
  SET_ROUTE: 'SET_ROUTE',
  SHOW_TOAST: 'SHOW_TOAST',

  // Extra Actions for full features
  ADD_FAVORITE: 'ADD_FAVORITE',
  REMOVE_FAVORITE: 'REMOVE_FAVORITE',
  SET_FAVORITES: 'SET_FAVORITES',
  SET_THEME: 'SET_THEME',
  PRUNE_CHECKINS_TEST: 'PRUNE_CHECKINS_TEST',
  IMPORT_STACK: 'IMPORT_STACK',
  // Identity — populated by identity-service after successful API login/logout
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  SET_OWNER_ID: 'SET_OWNER_ID',
  // Network state
  SET_OFFLINE_MODE: 'SET_OFFLINE_MODE',
});

// ─── Initial Application State Shape ─────────────────────────────────────────
export const DEFAULT_STATE = Object.freeze({
  _version: STATE_VERSION,
  _lastUpdated: null,
  _ownerId: null,

  // User profile
  user: {
    id: null,
    name: null,
    email: null,
    weight: null,         // kg
    biologicalSex: null,  // 'male' | 'female'
    trainingFrequency: null, // days/week
    trainingAge: null,    // years
    objective: null,      // 'bulk' | 'cut' | 'strength' | 'endurance' | 'general'
    restrictions: [],     // ['gluten', 'lactose', 'soy', ...]
    budget: null,         // R$ per month
    tier: 'free',         // 'free' | 'pro' | 'elite'
    createdAt: null,
    onboardingComplete: false,
    // Identity fields — set by AUTH_LOGIN, cleared by AUTH_LOGOUT.
    // The raw accessToken is NEVER stored here (lives in api-client closure only).
    isAuthenticated: false,
    role: null,           // 'user' | 'admin' — from UserIdentityDTO
    isMfaEnabled: false,
    emailVerified: false,
    // Purchase tracking for refill alerts
    purchases: [],        // Array<{supplementId, quantity, dailyConsumption, price, source, purchasedAt, status}>
  },

  // User's personal stack
  stack: [],              // Array<StackItem>

  // Daily check-ins
  checkins: [],           // Array<CheckIn>

  // Favorites list
  favorites: [],          // Array<string> (supplement IDs)

  // AI recommendations cache
  recommendations: {
    items: [],
    generatedAt: null,
    profileHash: null     // invalidate when profile changes
  },

  // Achievements
  achievements: [],       // Array<Achievement>

  // Notifications (in-app)
  notifications: [],      // Array<Notification>

  // App preferences
  preferences: {
    theme: 'dark',        // 'dark' | 'light' | 'system'
    language: 'pt-BR',
    currency: 'BRL',
    notificationsEnabled: true,
    reminderTime: '08:00',
    weekStartDay: 0       // 0 = Sunday
  },

  // UI state (transient, not persisted)
  ui: {
    currentRoute: '/home',
    loading: false,
    error: null,
    modal: null,          // { type, props }
    toast: null,          // { message, type, duration }
    isOffline: false      // Network connectivity state
  }
});

// ─── Pure Reducer Function ───────────────────────────────────────────────────
function reducer(state, action) {
  if (!action) return state;

  switch (action.type) {
    case ACTIONS.SET_USER_PROFILE: {
      // P1: whitelist explícita — impede sobrescrita de tier/onboardingComplete via payload livre
      const ALLOWED_PROFILE_KEYS = [
        'name', 'email', 'weight', 'biologicalSex', 'height', 'age',
        'trainingFrequency', 'trainingAge', 'objective',
        'restrictions', 'budget',
      ];
      const sanitized = Object.fromEntries(
        Object.entries(action.payload ?? {}).filter(([k]) => ALLOWED_PROFILE_KEYS.includes(k))
      );

      // PATCH 2: Validate types
      if (sanitized.weight !== undefined && (typeof sanitized.weight !== 'number' || sanitized.weight <= 0)) {
        logger.warn('[StateManager] Invalid weight:', sanitized.weight);
        delete sanitized.weight;
      }
      if (sanitized.biologicalSex !== undefined && !['male', 'female'].includes(sanitized.biologicalSex)) {
        logger.warn('[StateManager] Invalid biologicalSex:', sanitized.biologicalSex);
        delete sanitized.biologicalSex;
      }
      if (sanitized.age !== undefined && (typeof sanitized.age !== 'number' || sanitized.age < 0)) {
        logger.warn('[StateManager] Invalid age:', sanitized.age);
        delete sanitized.age;
      }
      if (sanitized.budget !== undefined && (typeof sanitized.budget !== 'number' || sanitized.budget < 0)) {
        logger.warn('[StateManager] Invalid budget:', sanitized.budget);
        delete sanitized.budget;
      }
      if (sanitized.objective !== undefined) {
        const validObjectives = ['bulk', 'cut', 'strength', 'endurance', 'general'];
        if (!validObjectives.includes(sanitized.objective)) {
          logger.warn('[StateManager] Invalid objective:', sanitized.objective);
          delete sanitized.objective;
        }
      }

      return {
        ...state,
        user: { ...state.user, ...sanitized }
      };
    }

    case ACTIONS.COMPLETE_ONBOARDING:
      return {
        ...state,
        user: {
          ...state.user,
          onboardingComplete: true
        }
      };

    case ACTIONS.ADD_TO_STACK: {
      // PATCH 3: Validate payload structure
      if (!action.payload || typeof action.payload !== 'object') {
        logger.warn('[StateManager] ADD_TO_STACK requires valid payload object');
        return state;
      }

      const { id, supplementId } = action.payload;

      if (!id || typeof id !== 'string' || id.trim() === '') {
        logger.warn('[StateManager] ADD_TO_STACK requires an id');
        return state;
      }

      // Prevent duplicates based on supplementId
      const exists = state.stack.some(item => item.supplementId === supplementId);
      if (exists) return state;

      return {
        ...state,
        stack: [...state.stack, action.payload]
      };
    }

    case ACTIONS.REMOVE_FROM_STACK: {
      const idToRemove = action.payload.id;
      return {
        ...state,
        stack: state.stack.filter(item => item.id !== idToRemove)
      };
    }

    case ACTIONS.RESTORE_STACK_ITEM_AT_INDEX: {
      const { item, index } = action.payload;
      if (!item) return state;
      const newStack = [...state.stack];
      // Prevent duplicates if network revived late
      const exists = newStack.some(i => i.id === item.id || i.supplementId === item.supplementId);
      if (!exists) {
        newStack.splice(index, 0, item);
      }
      return {
        ...state,
        stack: newStack
      };
    }

    case ACTIONS.CLEAR_STACK:
      return {
        ...state,
        stack: []
      };

    case ACTIONS.IMPORT_STACK:
      return {
        ...state,
        stack: action.payload || []
      };

    case ACTIONS.CLEAR_CHECKINS:
      return {
        ...state,
        checkins: []
      };

    case ACTIONS.ADD_CHECKIN: {
      // P9: ID com entropia combinada (timestamp + random) evita colisões em sessões de alta frequência
      const checkin = {
        id: action.payload.id ||
          `chk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp:    action.payload.timestamp || Date.now(),
        supplementId: action.payload.supplementId,
        date:         action.payload.date || todayISO(),
        // P9: limite de 500 chars na nota para evitar payload gigante no localStorage
        note: (action.payload.note || '').substring(0, 500),
      };
      return {
        ...state,
        checkins: [...state.checkins, checkin]
      };
    }

    case ACTIONS.SET_RECOMMENDATIONS:
      return {
        ...state,
        recommendations: {
          items: action.payload.items || [],
          generatedAt: Date.now(),
          profileHash: action.payload.profileHash || null
        }
      };

    case ACTIONS.INVALIDATE_RECOMMENDATIONS:
      return {
        ...state,
        recommendations: {
          items: [],
          generatedAt: null,
          profileHash: null
        }
      };

    case ACTIONS.SET_TIER: {
      if (action.payload == null) return state;
      const VALID_TIERS = ['free', 'pro', 'elite'];
      const tier = VALID_TIERS.includes(action.payload?.tier)
        ? action.payload.tier
        : state.user.tier;
      if (tier === state.user.tier) return state;
      return { ...state, user: { ...state.user, tier } };
    }

    case ACTIONS.SET_ROUTE:
      return {
        ...state,
        ui: {
          ...state.ui,
          currentRoute: action.payload.route
        }
      };

    case ACTIONS.SHOW_TOAST:
      return {
        ...state,
        ui: {
          ...state.ui,
          toast: {
            message: action.payload.message,
            type: action.payload.type || 'info',
            duration: action.payload.duration ?? 3000
          }
        }
      };

    case ACTIONS.SET_OFFLINE_MODE:
      return {
        ...state,
        ui: {
          ...state.ui,
          isOffline: action.payload?.isOffline ?? false
        }
      };

    case ACTIONS.ADD_FAVORITE:
      if (state.favorites.includes(action.payload.supplementId)) return state;
      return {
        ...state,
        favorites: [...state.favorites, action.payload.supplementId]
      };

    case ACTIONS.REMOVE_FAVORITE:
      return {
        ...state,
        favorites: state.favorites.filter(id => id !== action.payload.supplementId)
      };

    case ACTIONS.SET_FAVORITES:
      return {
        ...state,
        favorites: action.payload
      };

    case ACTIONS.SET_THEME:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          theme: action.payload.theme
        }
      };

    case ACTIONS.PRUNE_CHECKINS_TEST:
      return {
        ...state,
        checkins: action.payload
      };

    // #2 FIX: Editar item existente do stack
    case ACTIONS.UPDATE_STACK_ITEM: {
      const itemId = action.payload.supplementId ?? action.payload.id;
      return {
        ...state,
        stack: state.stack.map(item =>
          (item.supplementId ?? item.id) === itemId
            ? { ...item, ...action.payload, dosage: { ...(item.dosage ?? {}), ...(action.payload.dosage ?? {}) }, supplementId: itemId }
            : item
        )
      };
    }

    // #2 FIX: Atualizar só a quantidade em estoque
    case ACTIONS.SET_STACK_QUANTITY: {
      const itemId = action.payload.supplementId ?? action.payload.id;
      return {
        ...state,
        stack: state.stack.map(item =>
          (item.supplementId ?? item.id) === itemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    }

    // ── Identity ─────────────────────────────────────────────────────────────
    // Payload is the merged result of JWT claims + GET /api/profile/me.
    // accessToken is intentionally absent — it lives in api-client's closure.
    // displayName/avatarUrl come from the profile fetch inside login().
    case ACTIONS.AUTH_LOGIN: {
      const {
        id, email, role, isMfaEnabled, emailVerified,
        displayName, avatarUrl, avatarStatus,
      } = action.payload;
      return {
        ...state,
        user: {
          ...state.user,
          id: id ?? state.user.id,
          email: email ?? state.user.email,
          name: displayName ?? state.user.name,
          role: role ?? state.user.role,
          isMfaEnabled: isMfaEnabled ?? false,
          emailVerified: emailVerified ?? false,
          isAuthenticated: true,
          avatarUrl: avatarUrl ?? state.user.avatarUrl ?? null,
          avatarStatus: avatarStatus ?? state.user.avatarStatus ?? 'none',
        },
      };
    }

    case ACTIONS.AUTH_LOGOUT:
      return {
        ...state,
        user: {
          ...state.user,
          isAuthenticated: false,
          role: null,
          isMfaEnabled: false,
          emailVerified: false,
          // Keep local profile data (name, weight, etc.) — user can log back in
        },
      };

    case ACTIONS.SET_OWNER_ID:
      return {
        ...state,
        _ownerId: action.payload,
      };

    default:
      return state;
  }
}

/**
 * StateManager v4.0 — Centralized, immutable state management
 * Redux-inspired singleton with debounced localStorage persistence, undo history, and EventBus integration
 * Single source of truth for user, stack, checkins, preferences, and UI state
 */
export class StateManager {
  static _instance = null;

  _state;
  _persistTimer = null;
  _history = [];
  _subscribers = new Set();
  _pathSubscribers = new Map(); // path -> Set<callback>
  _debug = false;
  _isPruning = false;

  /**
   * Create a new StateManager instance (private — use getInstance)
   * @param {Object} initialState - Initial state shape (usually DEFAULT_STATE)
   * @private
   */
  constructor(initialState) {
    this._state = this._deepFreeze(initialState);
    this._initializeState();
    this._setupStorageSync();
  }

  /**
   * Get or create the StateManager singleton
   * @static
   * @returns {StateManager} The global state manager instance
   * @example
   *   const state = StateManager.getInstance();
   *   state.dispatch('ADD_TO_STACK', { supplementId: 'whey-1' });
   */
  static getInstance() {
    if (!StateManager._instance) {
      StateManager._instance = new StateManager(DEFAULT_STATE);
    }
    return StateManager._instance;
  }

  /**
   * Reset the singleton instance (testing isolation only)
   * @static
   * @returns {void}
   */
  static resetInstance() {
    StateManager._instance = null;
  }

  /**
   * Get user profile state
   * @returns {Object} User data: name, email, weight, tier, onboardingComplete, etc.
   */
  get user() {
    return this._state.user;
  }

  /**
   * Get user's supplement stack
   * @returns {Array<Object>} Array of stack items with supplementId, dosage, frequency
   */
  get stack() {
    return this._state.stack;
  }

  /**
   * Get all check-in records
   * @returns {Array<Object>} Array of checkins with supplementId, date, timestamp
   */
  get checkins() {
    return this._state.checkins;
  }

  /**
   * Get today's check-ins only
   * @returns {Array<Object>} Filtered checkins for today's date
   */
  get todayCheckins() {
    return this.getTodayCheckins();
  }

  /**
   * Get app preferences
   * @returns {Object} Theme, language, currency, notification settings
   */
  get preferences() {
    return this._state.preferences;
  }

  /**
   * Get transient UI state (not persisted)
   * @returns {Object} Current route, loading, error, modal, toast
   */
  get ui() {
    return this._state.ui;
  }

  /**
   * Get favorite supplement IDs
   * @returns {Array<string>} Array of supplementId strings
   */
  get favorites() {
    return this._state.favorites;
  }

  /**
   * Get AI recommendations cache
   * @returns {Object} Items, generatedAt timestamp, profileHash
   */
  get recommendations() {
    return this._state.recommendations;
  }

  /**
   * Get complete state (read-only for backward compatibility)
   * For production, prefer specific getters (user, stack, checkins, etc.)
   * @returns {Object} Full frozen state object
   */
  get state() {
    return this._state;
  }

  /**
   * Selector — compute a derived value from state using a pure function
   * @param {Function} selectorFn - Pure function that receives state and returns a derived value
   * @returns {*} The selected value
   * @throws {TypeError} If selectorFn is not a function
   * @example
   *   const stackSize = stateManager.select(s => s.stack.length);
   *   const monthlyBudget = stateManager.select(s => s.user.budget);
   */
  select(selectorFn) {
    if (typeof selectorFn !== 'function') {
      throw new TypeError('[StateManager] select() requires a function');
    }
    return selectorFn(this._state);
  }

  /**
   * Get current state or a slice using dot notation
   * @param {?string} path - Dot notation path (e.g., 'user.name', 'stack.0.dosage'). Omit to get full state
   * @returns {*} The value at the path, or full state if path is null
   * @example
   *   stateManager.get() // Full state
   *   stateManager.get('user.name') // Returns user's name
   *   stateManager.get('stack') // Returns stack array
   */
  get(path = null) {
    if (!path) return this._state;
    return path.split('.').reduce((obj, key) => obj?.[key], this._state);
  }

  /**
   * Dispatch an action to change state — Redux-inspired method
   * Supports two signatures: dispatch(type, payload) or dispatch({ type, payload })
   * Triggers debounced localStorage persistence, notifies subscribers, emits EventBus events
   * @param {string|Object} actionOrType - Action type (string) or full action object
   * @param {*} [payload] - Action payload (ignored if actionOrType is an object)
   * @returns {void}
   * @example
   *   stateManager.dispatch('ADD_TO_STACK', { supplementId: 'whey-1', dosage: 30 });
   *   stateManager.dispatch({ type: 'SET_USER_PROFILE', payload: { weight: 75 } });
   */
  dispatch(actionOrType, payload = undefined) {
    // #1 FIX: Aceita ambas as assinaturas:
    //   dispatch({ type, payload })  — canônica Redux-style
    //   dispatch('TYPE', payload)    — conveniência usada pelas páginas v4
    const action = typeof actionOrType === 'string'
      ? { type: actionOrType, payload }
      : actionOrType;

    if (!action || typeof action.type !== 'string') {
      if (this._debug) {
        logger.warn('[StateManager] Invalid action dispatched:', actionOrType);
      }
      return;
    }

    // PATCH 1: Validate action.type against ACTIONS registry
    const validActionTypes = Object.values(ACTIONS);
    if (!validActionTypes.includes(action.type)) {
      logger.warn(`[StateManager] Unknown action type "${action.type}" - typo or missing from ACTIONS registry?`);
      if (this._debug) {
        throw new Error(`Unknown action type: ${action.type}`);
      }
    }

    const prev = this._state;
    const next = reducer(prev, action);

    if (Object.is(prev, next)) return; // No change — skip

    // Store previous state for undo (capped at 20 states)
    this._history.push(prev);
    if (this._history.length > 20) this._history.shift();

    // Deep freeze and apply the new state
    const withMetadata = {
      ...next,
      _lastUpdated: Date.now()
    };
    this._state = this._deepFreeze(withMetadata);

    // Debounced storage write
    this._persist();

    // #3 FIX: Passa action como 2° arg — subscribers podem filtrar por action.type
    this._subscribers.forEach(cb => {
      try { cb(this._state, action); }
      catch (e) { logger.error('[StateManager] Global subscriber error:', e); }
    });

    // Notify path subscribers
    this._pathSubscribers.forEach((callbacks, path) => {
      const newVal = this.get(path);
      const oldVal = path.split('.').reduce((obj, key) => obj?.[key], prev);
      if (!Object.is(newVal, oldVal)) {
        callbacks.forEach(cb => {
          try { cb(newVal, oldVal); }
          catch (e) { logger.error(`[StateManager] Path subscriber error for "${path}":`, e); }
        });
      }
    });

    // Emit corresponding EventBus events (if mapped)
    this._emitEventBus(action);
  }

  /**
   * Undo the last state change (if available)
   * Reverts to the previous state in history (capped at 20 states)
   * Persists immediately and notifies all subscribers
   * @returns {boolean} True if undo succeeded, false if no history available
   * @example
   *   stateManager.dispatch('ADD_TO_STACK', { supplementId: 'whey-1' });
   *   stateManager.undo(); // Reverts the ADD_TO_STACK action
   */
  undo() {
    if (this._history.length === 0) return false;
    const previous = this._history.pop();
    this._state = this._deepFreeze(previous);
    this._persist();

    this._subscribers.forEach(cb => cb(this._state));
    return true;
  }

  /**
   * Subscribe to state changes
   * Two signatures: subscribe(callback) for global changes, subscribe(path, callback) for slice changes
   * @param {string|Function} pathOrCallback - Path (dot notation) or callback function
   * @param {?Function} callback - Callback for path subscribers (newValue, oldValue)
   * @returns {Function} Unsubscribe function that removes the listener
   * @example
   *   // Global listener (fires on any change)
   *   stateManager.subscribe((state) => console.log('State changed:', state));
   *
   *   // Path listener (fires only when 'user.weight' changes)
   *   stateManager.subscribe('user.weight', (newVal, oldVal) => {
   *     console.log(`Weight changed from ${oldVal} to ${newVal}`);
   *   });
   */
  subscribe(pathOrCallback, callback = null) {
    if (typeof pathOrCallback === 'function') {
      const listener = pathOrCallback;
      this._subscribers.add(listener);
      return () => this._subscribers.delete(listener);
    } else if (typeof pathOrCallback === 'string' && typeof callback === 'function') {
      const path = pathOrCallback;
      if (!this._pathSubscribers.has(path)) {
        this._pathSubscribers.set(path, new Set());
      }
      this._pathSubscribers.get(path).add(callback);
      return () => {
        const set = this._pathSubscribers.get(path);
        if (set) {
          set.delete(callback);
          if (set.size === 0) this._pathSubscribers.delete(path);
        }
      };
    }
    return () => { };
  }

  /**
   * Reset state to initial values.
   */
  reset() {
    this._history = [];
    this.hydrate(DEFAULT_STATE);
    this._flushPersist();
  }

  /**
   * Hydrates state from a custom payload.
   */
  hydrate(savedState) {
    const merged = this._deepMerge(DEFAULT_STATE, savedState);
    this._state = this._deepFreeze(merged);
  }

  /**
   * Export the current state as a plain object.
   */
  export() {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * Debounced persistence (300ms delay to prevent freezing UI on high frequency dispatches).
   */
  _persist() {
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => {
      try {
        const persistable = { ...this._state };
        delete persistable.ui;
        const result = StorageManager.setItem(STORAGE_KEY, JSON.stringify(persistable));
        // Handle async setItem (IndexedDB) — ignore Promise but catch errors
        if (result instanceof Promise) {
          result.catch(error => {
            logger.error('[StateManager] Failed to persist state (async):', error);
            if (error.name === 'QuotaExceededError') {
              this._pruneStorage();
            }
          });
        }
      } catch (error) {
        logger.error('[StateManager] Failed to persist state:', error);
        if (error.name === 'QuotaExceededError') {
          this._pruneStorage();
        }
      }
    }, 300);
  }

  /**
   * Synchronous persistence flush (called by tests or when critical save is needed).
   */
  _flushPersist() {
    clearTimeout(this._persistTimer);
    try {
      const persistable = { ...this._state };
      delete persistable.ui; // UI states are transient and should not be persisted
      const result = StorageManager.setItem(STORAGE_KEY, JSON.stringify(persistable));
      // Handle async setItem (IndexedDB) — ignore Promise but catch errors
      if (result instanceof Promise) {
        result.catch(error => {
          logger.error('[StateManager] Failed to persist state (async):', error);
          if (error.name === 'QuotaExceededError') {
            this._pruneStorage();
          }
        });
      }
    } catch (error) {
      logger.error('[StateManager] Failed to persist state:', error);
      if (error.name === 'QuotaExceededError') {
        this._pruneStorage();
      }
    }
  }

  /**
   * Automatically prune storage by keeping only essential records when storage quota is reached.
   */
  _pruneStorage() {
    if (this._isPruning) return;
    this._isPruning = true;
    try {
      // Keep last 90 days by date, not by entry count.
      // Pruning by count breaks streak/history when stack has many supplements.
      const cutoff = offsetISO(90);
      const prunedCheckins = this._state.checkins.filter(c => c.date && c.date >= cutoff);
      if (prunedCheckins.length < this._state.checkins.length) {
        this.dispatch({
          type: ACTIONS.PRUNE_CHECKINS_TEST,
          payload: prunedCheckins
        });
        this._flushPersist();
      }
    } catch (e) {
      logger.error('[StateManager] Storage pruning failed:', e);
    } finally {
      this._isPruning = false;
    }
  }

  /**
   * P2: valida shape e tamanho antes de aceitar estado vindo de outra aba.
   */
  _validateCrossTabState(data) {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data.checkins) && data.checkins.length > 10000) return false;
    if (Array.isArray(data.stack)    && data.stack.length    > 500)   return false;
    if (Array.isArray(data.favorites) && data.favorites.length > 1000) return false;
    return true;
  }

  /**
   * Escuta alterações de localStorage vindas de outras abas para manter a reatividade multi-abas.
   */
  _setupStorageSync() {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            // P2: rejeita estado inválido ou com volumes fora do esperado
            if (!this._validateCrossTabState(parsed)) {
              logger.warn('[StateManager] Cross-tab state rejected: invalid shape or size.');
              return;
            }
            const migrated = this._migrateState(parsed);
            const merged = this._deepMerge(DEFAULT_STATE, migrated);
            this._state = this._deepFreeze(merged);
            
            // Notifica subscribers globais com um payload que identifica a sincronização
            this._subscribers.forEach(cb => {
              try { cb(this._state, { type: 'STATE_REHYDRATED_STORAGE', payload: merged }); }
              catch (e) { logger.error('[StateManager] Subscriber error on cross-tab sync:', e); }
            });
            
            // Emite notificação via EventBus
            eventBus.emit('state:changed', {
              path: 'all',
              value: merged,
              fullState: this.export()
            });
          } catch (e) {
            logger.warn('[StateManager] Failed to parse cross-tab storage sync state:', e);
          }
        }
      });
    }
  }

  _initializeState() {
    try {
      const stored = StorageManager.getItemSync(STORAGE_KEY);
      if (!stored) {
        this._state = this._deepFreeze(DEFAULT_STATE);
      } else {
        const parsed = JSON.parse(stored);
        const migrated = this._migrateState(parsed);
        const merged = this._deepMerge(DEFAULT_STATE, migrated);
        this._state = this._deepFreeze(merged);
      }
    } catch (err) {
      logger.warn('[StateManager] Corrupted storage detected, falling back to default:', err);
      this._state = this._deepFreeze(DEFAULT_STATE);
    }

    // Async hydration from IndexedDB
    Promise.resolve().then(() => {
      StorageManager.getItem(STORAGE_KEY).then(stored => {
        if (stored) {
          try {
            const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
            const migrated = this._migrateState(parsed);
            const merged = this._deepMerge(this._state, migrated);
            if (JSON.stringify(this._state) !== JSON.stringify(merged)) {
              this._state = this._deepFreeze(merged);
              this._subscribers.forEach(cb => {
                try { cb(this._state, { type: 'STATE_HYDRATED_ASYNC' }); } catch (e) { logger.error('[StateManager] Subscriber error during async hydration:', e); }
              });
              if (typeof eventBus !== 'undefined') {
                eventBus.emit('state:changed', { path: 'all', value: merged, fullState: this.export() });
              }
            }
          } catch (err) {
            logger.warn('[StateManager] Async hydration failed:', err);
          }
        }
      }).catch(() => {});
    });

    return this._state;
  }

  /**
   * State schema migrations.
   */
  _migrateState(data) {
    if (!data) return DEFAULT_STATE;
    if (data._version !== STATE_VERSION) {
      return {
        ...DEFAULT_STATE,
        ...data,
        _version: STATE_VERSION
      };
    }
    return data;
  }

  /**
   * Helper to merge objects deeply.
   */
  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source ?? {})) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(target[key] ?? {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Deep freezes objects recursively to prevent direct mutations.
   */
  _deepFreeze(obj) {
    if (typeof obj !== 'object' || obj === null || Object.isFrozen(obj)) return obj;
    Object.keys(obj).forEach(k => this._deepFreeze(obj[k]));
    return Object.freeze(obj);
  }

  /**
   * Emits EventBus events for mapped dispatches.
   */
  _emitEventBus(action) {
    const state = this._state;
    switch (action.type) {
      case ACTIONS.SET_USER_PROFILE:
        eventBus.emit('user:profileUpdated', { user: state.user });
        break;
      case ACTIONS.COMPLETE_ONBOARDING:
        eventBus.emit('user:onboardingComplete', { user: state.user });
        break;
      case ACTIONS.ADD_TO_STACK:
        // #5 FIX: payload das páginas usa supplementId, não id
        eventBus.emit('stack:itemAdded', {
          supplementId: action.payload.supplementId ?? action.payload.id,
          name: action.payload.name
        });
        break;
      case ACTIONS.REMOVE_FROM_STACK:
        eventBus.emit('stack:itemRemoved', { supplementId: action.payload.supplementId ?? action.payload.id });
        break;
      case ACTIONS.CLEAR_STACK:
        eventBus.emit('stack:cleared', {});
        break;
      case ACTIONS.ADD_CHECKIN:
        eventBus.emit('checkin:added', { supplementId: action.payload.supplementId, timestamp: action.payload.timestamp || Date.now() });
        break;
      case ACTIONS.SET_RECOMMENDATIONS:
        eventBus.emit('ai:recommendationsReady', { items: state.recommendations.items, profileHash: state.recommendations.profileHash });
        break;
      case ACTIONS.INVALIDATE_RECOMMENDATIONS:
        eventBus.emit('ai:recommendationsInvalid', {});
        break;
      case ACTIONS.SET_TIER:
        eventBus.emit('premium:unlocked', { tier: action.payload.tier });
        break;
      case ACTIONS.SET_ROUTE:
        eventBus.emit('ui:routeChanged', { route: action.payload.route });
        break;
      case ACTIONS.SHOW_TOAST:
        eventBus.emit('ui:toastRequested', {
          message: action.payload.message,
          type: action.payload.type || 'info',
          duration: action.payload.duration ?? 3000
        });
        break;
    }
  }

  /**
   * Helper to count consecutive daily check-ins.
   */
  _calculateStreak(checkins = this.checkins) {
    if (!checkins || checkins.length === 0) return 0;

    // Sort unique dates descending
    const dates = [...new Set(checkins.map(c => c.date))].sort().reverse();
    if (dates.length === 0) return 0;

    const todayStr = todayISO();
    const yesterdayStr = offsetISO(1);

    // If no checkin today or yesterday, streak is broken (0)
    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) { streak++; continue; }
      const prev = dates[i - 1];
      const curr = dates[i];
      const d = new Date(curr + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (prev === expected) { streak++; } else { break; }
    }
    return streak;
  }

  calculateStreak(checkins = this.checkins) {
    return this._calculateStreak(checkins);
  }

  getTodayCheckins() {
    const todayStr = todayISO();
    return this.checkins.filter(c => c.date === todayStr);
  }

  // ─── Backward Compatibility Getters & Methods ────────────────────────────────
  getState(path) {
    return this.get(path);
  }

  setState(path, value, _options = {}) {
    // P3: caminhos arbitrários em dot-notation contornariam o reducer e toda a lógica de negócio.
    // Apenas caminhos mapeados explicitamente são aceitos.
    if (path === 'favorites') {
      this.dispatch({
        type: ACTIONS.SET_FAVORITES,
        payload: value
      });
      return;
    }

    if (path === 'settings.theme') {
      if (value !== 'light' && value !== 'dark') {
        throw new Error('Tema inválido');
      }
      this.dispatch({ type: ACTIONS.SET_THEME, payload: { theme: value } });
      return;
    }

    // P3: bloqueia qualquer outro caminho não mapeado — use dispatch() com uma action registrada
    if (this._debug) {
      logger.warn(
        `[StateManager] setState() bloqueado para o caminho não mapeado: "${path}". ` +
        'Use dispatch() com uma action registrada em ACTIONS.'
      );
    }
  }

  _setPath(obj, keys, value) {
    if (keys.length === 0) return value;
    const [head, ...tail] = keys;
    return {
      ...obj,
      [head]: this._setPath(obj[head] ?? {}, tail, value),
    };
  }

  observe(path, callback) {
    return this.subscribe(path, callback);
  }

  exportState() {
    return this.export();
  }

  importState(data) {
    this.hydrate(data);
  }

  setDebug(enabled) {
    this._debug = !!enabled;
  }
}

// Default Singleton
export const stateManager = StateManager.getInstance();
