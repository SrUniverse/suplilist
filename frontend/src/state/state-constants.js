// ============================================================
// StateManager — Constantes e shape do estado
// Extraído de state-manager.js: versão, chaves de storage,
// registro de ACTIONS e DEFAULT_STATE (single source of truth).
// ============================================================

// ─── JSDoc Type Definitions ──────────────────────────────────────────────────

/**
 * @typedef {Object} Supplement
 * @property {string} id - Unique supplement identifier from catalog
 * @property {string} name - Display name
 * @property {string} [category] - Category (Proteína, Pré-treino, etc)
 * @property {string} [brand] - Manufacturer name
 * @property {number} [price] - Current price in R$
 * @property {string} [unit] - Unit of measurement (g, ml, caps, etc)
 * @property {string} [description] - Long description
 */

/**
 * @typedef {Object} StackItem
 * @property {string} supplementId - Foreign key to Supplement catalog
 * @property {string} name - Display name of supplement
 * @property {number} dosage - Daily dosage amount
 * @property {string} unit - Unit (g, ml, caps, etc)
 * @property {string} [goal] - Training goal context (bulk/cut/strength/etc)
 * @property {boolean} [isActive] - Whether actively taking
 * @property {number} [addedAt] - Timestamp when added to stack
 */

/**
 * @typedef {Object} CheckIn
 * @property {string} supplementId - Which supplement was taken
 * @property {string} date - ISO date string (YYYY-MM-DD)
 * @property {number} timestamp - Milliseconds since epoch
 * @property {boolean} taken - Whether it was taken today
 * @property {string} [notes] - Optional user notes
 */

/**
 * @typedef {Object} Purchase
 * @property {string} supplementId - Which supplement
 * @property {number} quantity - Amount purchased
 * @property {number} dailyConsumption - How much consumed per day
 * @property {number} price - Purchase price in R$
 * @property {string} source - Where purchased (Amazon, ML, etc)
 * @property {number} purchasedAt - Timestamp of purchase
 * @property {string} [status] - 'active' | 'used_up' | 'archived'
 */

/**
 * @typedef {Object} UserProfile
 * @property {string | null} id - User ID from auth system
 * @property {string | null} name - Display name
 * @property {string | null} email - Email address
 * @property {number | null} weight - Weight in kg
 * @property {string | null} biologicalSex - 'M' | 'F' | other
 * @property {number | null} height - Height in cm
 * @property {number | null} age - Age in years
 * @property {number | null} trainingFrequency - Days per week
 * @property {number | null} trainingAge - Years of training
 * @property {'bulk'|'cut'|'strength'|'endurance'|'general'|null} objective - Training goal
 * @property {string[]} restrictions - Dietary restrictions
 * @property {number | null} budget - Monthly budget in R$
 * @property {'free'|'pro'|'elite'} tier - Subscription tier
 * @property {number | null} createdAt - Account creation timestamp
 * @property {boolean} onboardingComplete - Finished onboarding flow
 * @property {boolean} isAuthenticated - Currently logged in
 * @property {string | null} role - 'user' | 'admin'
 * @property {boolean} isMfaEnabled - Two-factor enabled
 * @property {boolean} emailVerified - Email confirmed
 * @property {Purchase[]} purchases - Purchase history
 */

/**
 * @typedef {Object} UIState
 * @property {string} currentRoute - Current page path
 * @property {boolean} loading - Global loading flag
 * @property {string | null} error - Error message if any
 * @property {Object | null} modal - Active modal {type, props}
 * @property {Object | null} toast - Active toast {message, type, duration}
 * @property {boolean} isOffline - Network connectivity
 */

/**
 * @typedef {Object} AppState
 * @property {string} _version - State schema version
 * @property {number | null} _lastUpdated - Last save timestamp
 * @property {string | null} _ownerId - Synced user ID
 * @property {UserProfile} user - User identity and profile
 * @property {StackItem[]} stack - Current supplement stack
 * @property {CheckIn[]} checkins - Daily check-in history
 * @property {string[]} favorites - Favorited supplement IDs
 * @property {Object} recommendations - AI recommendations cache
 * @property {Supplement[]} recommendations.items - Recommended supplements
 * @property {number | null} recommendations.generatedAt - When generated
 * @property {string | null} recommendations.profileHash - Hash for invalidation
 * @property {Object[]} achievements - Badges/achievements
 * @property {Object[]} notifications - In-app notifications
 * @property {Object} preferences - App preferences
 * @property {string} preferences.theme - 'dark'|'light'|'system'
 * @property {string} preferences.language - 'pt-BR'|'en'|etc
 * @property {string} preferences.currency - 'BRL'|'USD'|etc
 * @property {boolean} preferences.notificationsEnabled - Push notifications
 * @property {string} preferences.reminderTime - Time for daily reminder HH:MM
 * @property {number} preferences.weekStartDay - 0=Sunday, 1=Monday, etc
 * @property {UIState} ui - Transient UI state (not persisted)
 */

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
  UPDATE_PROFILE: 'UPDATE_PROFILE',              // Profile updates (name, photo, etc)
  UPDATE_PHOTO: 'UPDATE_PHOTO',                  // Photo-specific update
  DELETE_PHOTO: 'DELETE_PHOTO',                  // Delete profile photo
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
    photo: null,          // Profile photo URL (NEW)
    avatarUrl: null,      // Remote avatar URL (from server)
    avatarStatus: 'none', // 'none' | 'pending' | 'approved' | 'rejected'
    weight: null,         // kg
    height: null,         // cm
    age: null,            // years
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
