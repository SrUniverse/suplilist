// ============================================================
// StateManager v4.0 — SupliList
// Redux-inspired Centralized State Management Singleton
// Single source of truth. Handles immutability, history/undo,
// debounced persistence, and dynamic EventBus notification.
// ============================================================

import { eventBus } from '../core/event-bus.js';

export const STATE_VERSION = '4.0.0';
export const STORAGE_KEY = 'suplilist-state-v4';

// ─── Actions Registry ────────────────────────────────────────────────────────
export const ACTIONS = Object.freeze({
  SET_USER_PROFILE: 'SET_USER_PROFILE',
  COMPLETE_ONBOARDING: 'COMPLETE_ONBOARDING',
  ADD_TO_STACK: 'ADD_TO_STACK',
  REMOVE_FROM_STACK: 'REMOVE_FROM_STACK',
  UPDATE_STACK_ITEM: 'UPDATE_STACK_ITEM',       // #2 FIX: antes ausente do registro
  SET_STACK_QUANTITY: 'SET_STACK_QUANTITY',     // #2 FIX: antes ausente do registro
  CLEAR_STACK: 'CLEAR_STACK',
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
  PRUNE_CHECKINS_TEST: 'PRUNE_CHECKINS_TEST'
});

// ─── Initial Application State Shape ─────────────────────────────────────────
export const DEFAULT_STATE = Object.freeze({
  _version: STATE_VERSION,
  _lastUpdated: null,

  // User profile
  user: {
    id: null,
    name: null,
    email: null,
    weight: null,         // kg
    trainingFrequency: null, // days/week
    trainingAge: null,    // years
    objective: null,      // 'bulk' | 'cut' | 'strength' | 'endurance' | 'general'
    restrictions: [],     // ['gluten', 'lactose', 'soy', ...]
    budget: null,         // R$ per month
    tier: 'free',         // 'free' | 'pro' | 'elite'
    createdAt: null,
    onboardingComplete: false
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
    toast: null           // { message, type, duration }
  }
});

// ─── Pure Reducer Function ───────────────────────────────────────────────────
function reducer(state, action) {
  if (!action) return state;

  switch (action.type) {
    case ACTIONS.SET_USER_PROFILE:
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload
        }
      };

    case ACTIONS.COMPLETE_ONBOARDING:
      return {
        ...state,
        user: {
          ...state.user,
          onboardingComplete: true
        }
      };

    case ACTIONS.ADD_TO_STACK: {
      // Suporta ambos os formatos: { id } e { supplementId }
      const itemId = action.payload.supplementId ?? action.payload.id;
      const exists = state.stack.some(
        item => (item.supplementId ?? item.id) === itemId
      );
      if (exists) return state; // Prevent duplicates

      // Normaliza: garante que o item tenha sempre supplementId
      const normalizedItem = {
        ...action.payload,
        supplementId: itemId,
      };
      return {
        ...state,
        stack: [...state.stack, normalizedItem]
      };
    }

    case ACTIONS.REMOVE_FROM_STACK:
      return {
        ...state,
        stack: state.stack.filter(item =>
          (item.supplementId ?? item.id) !== action.payload.supplementId
        )
      };

    case ACTIONS.CLEAR_STACK:
      return {
        ...state,
        stack: []
      };

    case ACTIONS.ADD_CHECKIN: {
      const checkin = {
        id: action.payload.id || `chk_${Math.random().toString(36).substring(2, 11)}`,
        timestamp: action.payload.timestamp || Date.now(),
        supplementId: action.payload.supplementId,
        date: action.payload.date || new Date().toISOString().split('T')[0],
        note: action.payload.note || ''
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

    case ACTIONS.SET_TIER:
      return {
        ...state,
        user: {
          ...state.user,
          tier: action.payload.tier
        }
      };

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
            ? { ...item, ...action.payload, supplementId: itemId }
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

    default:
      return state;
  }
}

// ─── StateManager Class ──────────────────────────────────────────────────────
export class StateManager {
  static _instance = null;

  _state;
  _persistTimer = null;
  _history = [];
  _subscribers = new Set();
  _pathSubscribers = new Map(); // path -> Set<callback>
  _debug = false;
  _isPruning = false;

  constructor(initialState) {
    this._state = this._deepFreeze(initialState);
    this._initializeState();
    this._setupStorageSync();
  }

  /**
   * Singleton accessor.
   */
  static getInstance() {
    if (!StateManager._instance) {
      StateManager._instance = new StateManager(DEFAULT_STATE);
    }
    return StateManager._instance;
  }

  /**
   * Reset instance singleton (for testing isolation).
   */
  static resetInstance() {
    StateManager._instance = null;
  }

  get user() {
    return this._state.user;
  }

  get stack() {
    return this._state.stack;
  }

  get checkins() {
    return this._state.checkins;
  }

  get todayCheckins() {
    return this.getTodayCheckins();
  }

  get preferences() {
    return this._state.preferences;
  }

  get ui() {
    return this._state.ui;
  }

  get favorites() {
    return this._state.favorites;
  }

  get recommendations() {
    return this._state.recommendations;
  }

  /**
   * Expõe o estado completo como getter (retrocompatibilidade).
   * Usar .get() ou getters específicos para leituras em produção.
   */
  get state() {
    return this._state;
  }

  /**
   * Selector — computa um slice derivado do estado.
   * @param {Function} selectorFn - Função pura que recebe o estado e retorna um valor derivado
   * @returns {*} Resultado da seleção
   * @example
   *   const streak = stateManager.select(s => s.checkins.length);
   */
  select(selectorFn) {
    if (typeof selectorFn !== 'function') {
      throw new TypeError('[StateManager] select() requires a function');
    }
    return selectorFn(this._state);
  }

  /**
   * Get the current state (or a slice of it).
   * @param {string} [path] - Dot notation path, e.g. 'user.name'
   */
  get(path = null) {
    if (!path) return this._state;
    return path.split('.').reduce((obj, key) => obj?.[key], this._state);
  }

  /**
   * Redux-inspired way to change state.
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
        console.warn('[StateManager] Invalid action dispatched:', actionOrType);
      }
      return;
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
      catch (e) { console.error('[StateManager] Global subscriber error:', e); }
    });

    // Notify path subscribers
    this._pathSubscribers.forEach((callbacks, path) => {
      const newVal = this.get(path);
      const oldVal = path.split('.').reduce((obj, key) => obj?.[key], prev);
      if (!Object.is(newVal, oldVal)) {
        callbacks.forEach(cb => {
          try { cb(newVal, oldVal); }
          catch (e) { console.error(`[StateManager] Path subscriber error for "${path}":`, e); }
        });
      }
    });

    // Emit corresponding EventBus events (if mapped)
    this._emitEventBus(action);
  }

  /**
   * Reverts to the previous state in history if available.
   * Returns true if successful, false otherwise.
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
   * Subscribe to changes.
   * Signature 1: subscribe(callback) -> for any change (receives full state)
   * Signature 2: subscribe(path, callback) -> for slice changes (receives newSliceVal, oldSliceVal)
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
    this._state = this._deepFreeze(DEFAULT_STATE);
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
      } catch (error) {
        console.error('[StateManager] Failed to persist state:', error);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch (error) {
      console.error('[StateManager] Failed to persist state:', error);
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
      if (this._state.checkins.length > 30) {
        const prunedCheckins = this._state.checkins.slice(-30);
        this.dispatch({
          type: ACTIONS.PRUNE_CHECKINS_TEST,
          payload: prunedCheckins
        });
        this._flushPersist();
      }
    } catch (e) {
      console.error('[StateManager] Storage pruning failed:', e);
    } finally {
      this._isPruning = false;
    }
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
            const migrated = this._migrateState(parsed);
            const merged = this._deepMerge(DEFAULT_STATE, migrated);
            this._state = this._deepFreeze(merged);
            
            // Notifica subscribers globais com um payload que identifica a sincronização
            this._subscribers.forEach(cb => {
              try { cb(this._state, { type: 'STATE_REHYDRATED_STORAGE', payload: merged }); }
              catch (e) { console.error('[StateManager] Subscriber error on cross-tab sync:', e); }
            });
            
            // Emite notificação via EventBus
            eventBus.emit('state:changed', {
              path: 'all',
              value: merged,
              fullState: this.export()
            });
          } catch (e) {
            console.warn('[StateManager] Failed to parse cross-tab storage sync state:', e);
          }
        }
      });
    }
  }

  /**
   * Initialize state from storage with fallback validation.
   */
  _initializeState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        this._state = this._deepFreeze(DEFAULT_STATE);
        return DEFAULT_STATE;
      }
      const parsed = JSON.parse(stored);
      const migrated = this._migrateState(parsed);
      const merged = this._deepMerge(DEFAULT_STATE, migrated);
      this._state = this._deepFreeze(merged);
      return merged;
    } catch (err) {
      console.warn('[StateManager] Corrupted storage detected, falling back to default:', err);
      this._state = this._deepFreeze(DEFAULT_STATE);
      return DEFAULT_STATE;
    }
  }

  /**
   * Legacy call wrapper to hydrate state.
   */
  _hydrateFromStorage() {
    return this._initializeState();
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
        eventBus.emit('stack:itemRemoved', { supplementId: action.payload.supplementId });
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

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If no checkin today or yesterday, streak is broken (0)
    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 0;
    let currentCheckDate = new Date(dates[0]);

    for (let i = 0; i < dates.length; i++) {
      const checkDate = new Date(dates[i]);
      const diffTime = Math.abs(currentCheckDate - checkDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (i === 0 || diffDays <= 1) {
        streak++;
        currentCheckDate = checkDate;
      } else {
        break; // gap found, streak broken
      }
    }
    return streak;
  }

  calculateStreak(checkins = this.checkins) {
    return this._calculateStreak(checkins);
  }

  getTodayCheckins() {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.checkins.filter(c => c.date === todayStr);
  }

  /**
   * Returns a copy of the state for debugging/inspection.
   */
  dump() {
    return this.export();
  }

  // ─── Backward Compatibility Getters & Methods ────────────────────────────────
  getState(path) {
    return this.get(path);
  }

  setState(path, value, options = {}) {
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

    const keys = path.split('.');
    const next = typeof value === 'function' ? value(this.get(path)) : value;

    const prev = this._state;
    // ⚡ Bolt: Avoid O(N) full state deep cloning; _setPath already does shallow path cloning.
    const updated = this._setPath(this._state, keys, next);
    const frozen = this._deepFreeze({ ...updated, _lastUpdated: Date.now() });

    // #2 FIX: Registrar no histórico para que undo() funcione
    this._history.push(prev);
    if (this._history.length > 20) this._history.shift();

    this._state = frozen;
    this._persist();

    // #2 FIX: Notificar global subscribers (antes omitido)
    this._subscribers.forEach(cb => {
      try { cb(this._state); }
      catch (e) { console.error('[StateManager] Global subscriber error (setState):', e); }
    });

    // Notificar path subscribers
    const directCallbacks = this._pathSubscribers.get(path);
    if (directCallbacks) {
      const oldVal = path.split('.').reduce((obj, key) => obj?.[key], prev);
      directCallbacks.forEach(cb => {
        try { cb(next, oldVal); }
        catch (e) { console.error(`[StateManager] Path subscriber error for "${path}" (setState):`, e); }
      });
    }

    eventBus.emit('state:changed', {
      path,
      value: next,
      fullState: this.export()
    });
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
