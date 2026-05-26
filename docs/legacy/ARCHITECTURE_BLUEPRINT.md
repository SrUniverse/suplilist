# SupliList — ARQUITETURA DO CÉREBRO
## Terra Arrasada: Modular, Reativo, Performático

**Versão:** 1.0  
**Data:** 2026-05-23  
**Arquitetor:** Senior Software Architect  
**Paradigma:** Pub/Sub + Event-Driven + Schema Validation

---

## 📁 ESTRUTURA DE PASTAS

```
suplilist/
├── index.html                           # Entry point único
├── package.json                         # Deps mínimas (Tailwind, vite-dev-server)
├── tailwind.config.js                   # Configuração design system
│
├── src/
│   ├── css/
│   │   ├── main.css                     # Importa Tailwind + custom vars
│   │   ├── design-system.css            # CSS custom properties (colors, spacing, typography)
│   │   └── animations.css               # Transições reutilizáveis
│   │
│   ├── js/
│   │   ├── main.js                      # Entry point JS (inicializa app)
│   │   │
│   │   ├── core/
│   │   │   ├── eventbus.js              # 🧠 CORAÇÃO: Pub/Sub pattern
│   │   │   ├── state-manager.js         # 🧠 CÉREBRO: State machine + localStorage
│   │   │   ├── schema-validator.js      # 🧠 GUARDIÃO: Validação de tipos
│   │   │   └── error-boundary.js        # 🧠 PROTETOR: Try/catch wrapper para componentes
│   │   │
│   │   ├── types/
│   │   │   ├── supplement.schema.js     # Supplement { id, name, category, ... }
│   │   │   ├── state.schema.js          # AppState { supplements, favorites, inventory, ... }
│   │   │   └── events.schema.js         # Event signatures: { type, payload }
│   │   │
│   │   ├── features/
│   │   │   ├── supplements/
│   │   │   │   ├── supplementRepo.js    # CRUD operations + localStorage sync
│   │   │   │   ├── supplementService.js # Business logic: search, filter, rank
│   │   │   │   └── supplementCache.js   # In-memory cache + invalidation
│   │   │   │
│   │   │   ├── favorites/
│   │   │   │   ├── favoritesRepo.js     # Add/remove/get favorites
│   │   │   │   └── favoritesService.js  # Toggle, export, import
│   │   │   │
│   │   │   ├── inventory/
│   │   │   │   ├── inventoryRepo.js     # Track quantities + purchase dates
│   │   │   │   └── inventoryService.js  # Stock alerts, days-left calculator
│   │   │   │
│   │   │   ├── comparator/
│   │   │   │   ├── comparatorService.js # Side-by-side analysis: cost, evidence, interactions
│   │   │   │   └── interactionDb.js     # Database de interações conhecidas
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── settingsRepo.js      # User preferences (theme, units, etc)
│   │   │       └── settingsService.js   # Apply settings, sync defaults
│   │   │
│   │   ├── components/
│   │   │   ├── supplement-card.js       # Pure: render card element
│   │   │   ├── supplement-list.js       # Container: listens to events, delegates clicks
│   │   │   ├── supplement-detail.js     # Modal/drawer: full supplement info
│   │   │   ├── favorites-page.js        # Page container for favorites
│   │   │   ├── comparator-modal.js      # Comparison UI
│   │   │   ├── toast.js                 # Notifications: success, error, warning, info
│   │   │   ├── skeleton.js              # Loading placeholders
│   │   │   ├── error-card.js            # Fallback for failed renders
│   │   │   └── modal.js                 # Generic modal wrapper
│   │   │
│   │   ├── ui/
│   │   │   ├── search-input.js          # Debounced search
│   │   │   ├── filter-bar.js            # Category/goal filters
│   │   │   ├── sort-menu.js             # Sort by: cost, evidence, name
│   │   │   └── pagination.js            # Page navigation
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.js                # Debug logging (ENV-aware)
│   │   │   ├── formatters.js            # Format money, dose, date, etc
│   │   │   ├── parsers.js               # Parse input, normalize strings
│   │   │   ├── validators.js            # Utility validation functions
│   │   │   └── constants.js             # ENUMS: Categories, Goals, Units, etc
│   │   │
│   │   └── data/
│   │       ├── supplements.json         # Master database (seed data)
│   │       └── fallback-state.json      # Default state if localStorage corrupted
│   │
│   └── assets/
│       ├── supplements/                 # Product images (.webp)
│       ├── icons/                       # SVG icons
│       └── fonts/                       # Self-hosted fonts (optional)
│
└── docs/
    ├── ARCHITECTURE_BLUEPRINT.md        # Este arquivo
    ├── API_CONTRACTS.md                 # Assinaturas canônicas (exporta do HTML)
    ├── EVENT_BUS_GUIDE.md               # How-to para pub/sub
    ├── STATE_MANAGEMENT.md              # Patterns de estado
    └── TESTING_STRATEGY.md              # Unit + integration tests

```

---

## 🧠 CORAÇÃO: EventBus (Pub/Sub)

### Arquivo: `src/js/core/eventbus.js`

```javascript
// Singleton pattern
class EventBus {
  constructor() {
    this.subscribers = new Map(); // Map<eventType, Set<handler>>
    this.history = [];            // Para debug
  }

  // Public API
  on(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(handler);
    
    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }

  off(eventType, handler) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).delete(handler);
    }
  }

  emit(eventType, payload) {
    // Validate event schema
    validateEventSchema(eventType, payload);
    
    // Record for debug
    this.history.push({ eventType, payload, timestamp: Date.now() });
    
    // Notify all subscribers
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).forEach(handler => {
        try {
          handler(payload);
        } catch (err) {
          logger.error(`EventBus handler failed for ${eventType}:`, err);
          // Emit error event without infinite loop
          if (eventType !== 'error:system') {
            this.emit('error:system', { original: eventType, error: err });
          }
        }
      });
    }
  }

  // Debug helpers
  getHistory(eventType?) {
    if (eventType) {
      return this.history.filter(h => h.eventType === eventType);
    }
    return this.history.slice(-100); // Last 100 events
  }

  clearHistory() {
    this.history = [];
  }
}

export const eventBus = new EventBus();
```

---

## 🧠 CÉREBRO: State Manager

### Arquivo: `src/js/core/state-manager.js`

```javascript
import { eventBus } from './eventbus.js';
import { validateAppState } from '../types/state.schema.js';
import { getFallbackState } from '../data/fallback-state.js';

class StateManager {
  constructor() {
    this.state = this._initializeState();
    this.subscribers = new Map(); // Para observar path-specific changes
  }

  _initializeState() {
    try {
      const stored = localStorage.getItem('app:state');
      const parsed = stored ? JSON.parse(stored) : null;
      const validated = validateAppState(parsed);
      
      if (validated.isValid) {
        return validated.data;
      } else {
        logger.warn('State validation failed, using fallback:', validated.errors);
        return getFallbackState();
      }
    } catch (err) {
      logger.error('Failed to load state from localStorage:', err);
      return getFallbackState();
    }
  }

  // Immutable state update
  setState(path, value) {
    // path: "favorites" or "inventory.creatina-mono"
    const parts = path.split('.');
    const newState = JSON.parse(JSON.stringify(this.state)); // Deep clone
    
    let obj = newState;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    
    // Validate entire state after mutation
    const validated = validateAppState(newState);
    if (!validated.isValid) {
      throw new Error(`State validation failed: ${validated.errors.join(', ')}`);
    }
    
    this.state = newState;
    this._persist();
    this._notifySubscribers(path);
    
    // Emit event for broader listeners
    eventBus.emit('state:changed', { path, value, fullState: this.state });
  }

  getState(path?) {
    if (!path) return this.state;
    
    const parts = path.split('.');
    let obj = this.state;
    for (const part of parts) {
      obj = obj?.[part];
    }
    return obj;
  }

  // Local observer for specific path
  observe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    this.subscribers.get(path).add(callback);
    return () => this.subscribers.get(path).delete(callback);
  }

  _notifySubscribers(path) {
    if (this.subscribers.has(path)) {
      const value = this.getState(path);
      this.subscribers.get(path).forEach(cb => {
        try {
          cb(value);
        } catch (err) {
          logger.error(`State observer failed for ${path}:`, err);
        }
      });
    }
  }

  _persist() {
    try {
      localStorage.setItem('app:state', JSON.stringify(this.state));
    } catch (err) {
      logger.error('Failed to persist state:', err);
      eventBus.emit('error:persistence', { error: err });
    }
  }

  // Debug helper
  exportState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  importState(data) {
    const validated = validateAppState(data);
    if (!validated.isValid) {
      throw new Error(`Import validation failed: ${validated.errors.join(', ')}`);
    }
    this.state = validated.data;
    this._persist();
    eventBus.emit('state:imported', { state: this.state });
  }
}

export const stateManager = new StateManager();
```

---

## 🧠 GUARDIÃO: Schema Validation

### Arquivo: `src/js/types/supplement.schema.js`

```javascript
import { CATEGORIES, GOALS, UNITS, EVIDENCE_LEVELS } from '../utils/constants.js';

export class SupplementSchema {
  static validate(data) {
    const errors = [];

    // id: string (required, slug format)
    if (!data?.id || typeof data.id !== 'string' || !/^[a-z0-9-]+$/.test(data.id)) {
      errors.push('id must be a valid slug (lowercase, hyphenated)');
    }

    // name: string (required)
    if (!data?.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('name is required and must be non-empty');
    }

    // category: enum (required)
    if (!data?.category || !CATEGORIES.includes(data.category)) {
      errors.push(`category must be one of: ${CATEGORIES.join(', ')}`);
    }

    // evidenceLevel: enum (required)
    if (!data?.evidenceLevel || !EVIDENCE_LEVELS.includes(data.evidenceLevel)) {
      errors.push(`evidenceLevel must be: ${EVIDENCE_LEVELS.join(', ')}`);
    }

    // mechanism: string (required)
    if (!data?.mechanism || typeof data.mechanism !== 'string') {
      errors.push('mechanism is required');
    }

    // defaultDose: number (required, positive)
    if (typeof data?.defaultDose !== 'number' || data.defaultDose <= 0) {
      errors.push('defaultDose must be a positive number');
    }

    // unit: enum (required)
    if (!data?.unit || !UNITS.includes(data.unit)) {
      errors.push(`unit must be one of: ${UNITS.join(', ')}`);
    }

    // goals: array of enums (required, min 1)
    if (!Array.isArray(data?.goals) || data.goals.length === 0) {
      errors.push('goals must be a non-empty array');
    }
    data?.goals?.forEach((goal, idx) => {
      if (!GOALS.includes(goal)) {
        errors.push(`goals[${idx}] = "${goal}" is not valid`);
      }
    });

    // prices: object (required, at least 1 marketplace)
    const marketplaces = Object.keys(data?.prices || {});
    if (marketplaces.length === 0) {
      errors.push('At least one marketplace price is required');
    }
    marketplaces.forEach(mp => {
      const price = data.prices[mp];
      if (typeof price !== 'number' || price <= 0) {
        errors.push(`prices.${mp} must be a positive number`);
      }
    });

    // costPerDose: number (required, positive)
    if (typeof data?.costPerDose !== 'number' || data.costPerDose <= 0) {
      errors.push('costPerDose must be a positive number');
    }

    // image: string (required, valid path)
    if (!data?.image || typeof data.image !== 'string' || !data.image.startsWith('assets/')) {
      errors.push('image must be a valid asset path');
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? this._normalize(data) : null,
    };
  }

  static _normalize(data) {
    return {
      id: data.id.toLowerCase().trim(),
      name: data.name.trim(),
      category: data.category,
      evidenceLevel: data.evidenceLevel,
      mechanism: data.mechanism.trim(),
      defaultDose: Number(data.defaultDose),
      unit: data.unit,
      goals: data.goals.filter(g => GOALS.includes(g)),
      prices: Object.fromEntries(
        Object.entries(data.prices).filter(([_, p]) => typeof p === 'number' && p > 0)
      ),
      costPerDose: Number(data.costPerDose),
      image: data.image,
    };
  }
}

export class AppStateSchema {
  static validate(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      errors.push('State must be an object');
      return {
        isValid: false,
        errors,
        data: null,
      };
    }

    // supplements: Record<id, Supplement>
    if (!data.supplements || typeof data.supplements !== 'object') {
      errors.push('supplements must be an object');
    } else {
      Object.entries(data.supplements).forEach(([id, supp]) => {
        const result = SupplementSchema.validate(supp);
        if (!result.isValid) {
          errors.push(`supplements.${id}: ${result.errors.join('; ')}`);
        }
      });
    }

    // favorites: string[] (valid supplement IDs)
    if (!Array.isArray(data.favorites)) {
      errors.push('favorites must be an array');
    }

    // inventory: Record<id, { qty, purchaseDate }>
    if (!data.inventory || typeof data.inventory !== 'object') {
      errors.push('inventory must be an object');
    } else {
      Object.entries(data.inventory).forEach(([id, inv]) => {
        if (typeof inv.qty !== 'number' || inv.qty < 0) {
          errors.push(`inventory.${id}.qty must be a non-negative number`);
        }
        if (!inv.purchaseDate || isNaN(new Date(inv.purchaseDate).getTime())) {
          errors.push(`inventory.${id}.purchaseDate must be a valid date`);
        }
      });
    }

    // settings: object with user preferences
    if (data.settings && typeof data.settings !== 'object') {
      errors.push('settings must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? data : null,
    };
  }
}
```

---

## 🧠 PROTETOR: Error Boundary

### Arquivo: `src/js/core/error-boundary.js`

```javascript
import { eventBus } from './eventbus.js';
import { logger } from '../utils/logger.js';

export class ErrorBoundary {
  static wrap(renderFn, componentName = 'Unknown') {
    return (...args) => {
      try {
        return renderFn(...args);
      } catch (err) {
        logger.error(`[${componentName}] Render failed:`, err);
        
        // Emit event so app can track errors
        eventBus.emit('component:error', {
          componentName,
          error: err.message,
          stack: err.stack,
          timestamp: Date.now(),
        });

        // Return fallback element
        return this._renderErrorState(componentName, err);
      }
    };
  }

  static _renderErrorState(componentName, err) {
    const div = document.createElement('div');
    div.className = 'error-card bg-red-900/20 border border-red-500/30 rounded-lg p-4';
    div.innerHTML = `
      <div class="flex items-center gap-2 text-red-400">
        <span>⚠️</span>
        <span class="text-sm font-semibold">${componentName} falhou ao renderizar</span>
      </div>
      <p class="text-red-300 text-xs mt-2 opacity-70">
        ${process.env.NODE_ENV === 'development' ? err.message : 'Um erro inesperado ocorreu'}
      </p>
    `;
    return div;
  }
}
```

---

## 📋 CONTRATO DE EVENTOS

### Arquivo: `src/js/types/events.schema.js`

Eventos que circulam pelo EventBus:

```javascript
// ═══════════════════════════════════════════
// STATE EVENTS
// ═══════════════════════════════════════════

/**
 * Emitted whenever state changes (any path)
 * Listeners: all consumers that care about general state changes
 */
export const STATE_CHANGED = {
  type: 'state:changed',
  payload: {
    path: 'string', // e.g., "favorites", "inventory.creatina-mono"
    value: 'any',   // New value
    fullState: 'AppState', // Entire current state
  },
};

/**
 * Emitted when state is imported (e.g., from backup)
 */
export const STATE_IMPORTED = {
  type: 'state:imported',
  payload: {
    state: 'AppState',
    timestamp: 'number (ms)',
  },
};

// ═══════════════════════════════════════════
// SUPPLEMENT EVENTS
// ═══════════════════════════════════════════

/**
 * Emitted when supplement list is loaded
 */
export const SUPPLEMENTS_LOADED = {
  type: 'supplements:loaded',
  payload: {
    supplements: 'Supplement[]',
    count: 'number',
    timestamp: 'number (ms)',
  },
};

/**
 * Emitted when a single supplement changes (e.g., data updated)
 */
export const SUPPLEMENT_CHANGED = {
  type: 'supplement:changed',
  payload: {
    id: 'string',
    supplement: 'Supplement',
  },
};

/**
 * Emitted when search/filter is applied
 */
export const SUPPLEMENTS_FILTERED = {
  type: 'supplements:filtered',
  payload: {
    query: 'string',
    filters: {
      categories?: 'string[]',
      goals?: 'string[]',
      maxPrice?: 'number',
      sortBy?: '"cost"|"evidence"|"name"',
    },
    results: 'Supplement[]',
    count: 'number',
  },
};

// ═══════════════════════════════════════════
// FAVORITES EVENTS
// ═══════════════════════════════════════════

/**
 * Emitted when favorite is added or removed
 */
export const FAVORITE_TOGGLED = {
  type: 'favorite:toggled',
  payload: {
    supplementId: 'string',
    isFavorite: 'boolean',
  },
};

/**
 * Emitted when favorites list changes
 */
export const FAVORITES_UPDATED = {
  type: 'favorites:updated',
  payload: {
    favorites: 'string[]', // Array of supplement IDs
    count: 'number',
  },
};

// ═══════════════════════════════════════════
// INVENTORY EVENTS
// ═══════════════════════════════════════════

/**
 * Emitted when inventory quantity is updated
 */
export const INVENTORY_UPDATED = {
  type: 'inventory:updated',
  payload: {
    supplementId: 'string',
    qty: 'number',
    purchaseDate: 'ISO8601 string',
    daysLeft: 'number | null',
  },
};

/**
 * Emitted when stock alert is triggered (≤7 days)
 */
export const INVENTORY_URGENT = {
  type: 'inventory:urgent',
  payload: {
    supplements: 'Array<{ id: string, daysLeft: number }>',
  },
};

// ═══════════════════════════════════════════
// UI EVENTS
// ═══════════════════════════════════════════

/**
 * Emitted when user clicks detail/expand
 */
export const SUPPLEMENT_DETAIL_OPEN = {
  type: 'supplement:detail:open',
  payload: {
    supplementId: 'string',
  },
};

/**
 * Emitted when user clicks to compare
 */
export const COMPARATOR_OPEN = {
  type: 'comparator:open',
  payload: {
    supplementIds: 'string[]',
  },
};

/**
 * Emitted when user wants to buy
 */
export const CHECKOUT_INITIATED = {
  type: 'checkout:initiated',
  payload: {
    supplementId: 'string',
    marketplace: 'string', // "shopee", "mercadolivre", "amazon"
  },
};

/**
 * Emitted when notification is shown
 */
export const TOAST_SHOW = {
  type: 'toast:show',
  payload: {
    message: 'string',
    type: '"success"|"warning"|"danger"|"info"',
    duration: 'number (ms)',
    id: 'string', // Auto-generated
  },
};

/**
 * Emitted when notification is dismissed
 */
export const TOAST_DISMISS = {
  type: 'toast:dismiss',
  payload: {
    id: 'string',
  },
};

// ═══════════════════════════════════════════
// ERROR EVENTS
// ═══════════════════════════════════════════

/**
 * Emitted when a component fails to render
 */
export const COMPONENT_ERROR = {
  type: 'component:error',
  payload: {
    componentName: 'string',
    error: 'string',
    stack: 'string',
    timestamp: 'number (ms)',
  },
};

/**
 * Emitted when system fails (persistence, EventBus handler, etc)
 */
export const ERROR_SYSTEM = {
  type: 'error:system',
  payload: {
    original: 'string (original event type)',
    error: 'Error',
  },
};

/**
 * Emitted when localStorage persistence fails
 */
export const ERROR_PERSISTENCE = {
  type: 'error:persistence',
  payload: {
    error: 'Error',
    timestamp: 'number (ms)',
  },
};
```

---

## 📊 CONTRATO DE ESTADO (AppState)

### Arquivo: `src/js/types/state.schema.js`

```typescript
interface AppState {
  // Master supplement database
  supplements: Record<string, Supplement>;
  
  // User's favorite supplement IDs
  favorites: string[];
  
  // User's inventory tracking
  inventory: Record<string, {
    qty: number;              // Current quantity (in Supplement.unit)
    purchaseDate: ISO8601;    // When was bought
  }>;
  
  // User preferences
  settings: {
    theme: 'dark' | 'light';
    sortBy: 'cost' | 'evidence' | 'name';
    units: 'metric' | 'imperial';
    notificationsEnabled: boolean;
  };
  
  // Cache of last search/filter
  lastQuery?: {
    text: string;
    filters: FilterOptions;
    results: string[]; // supplement IDs
    timestamp: number;
  };
}

interface Supplement {
  id: string;                                   // "creatina-monohidratada"
  name: string;                                 // "Creatina Monohidratada"
  category: CategoryEnum;
  evidenceLevel: "A" | "B" | "C";
  mechanism: string;                            // 1-2 sentences
  defaultDose: number;
  unit: UnitEnum;
  goals: GoalEnum[];
  prices: {
    shopee?: number;
    mercadolivre?: number;
    amazon?: number;
  };
  costPerDose: number;                          // BRL
  image: string;                                // "assets/supplements/..."
}

type CategoryEnum = 
  | "Aminoácido"
  | "Adaptógeno"
  | "Mineral"
  | "Hormônio"
  | "Vitamina"
  | "Ácido Graxo"
  | "Digital";

type UnitEnum = "g" | "mg" | "mcg" | "UI" | "ml";

type GoalEnum =
  | "Hipertrofia"
  | "Queima"
  | "Energia"
  | "Foco"
  | "Sono"
  | "Libido"
  | "Longevidade"
  | "Saúde Geral";
```

---

## 🔗 PADRÃO DE CONEXÃO: Component → EventBus → StateManager

### Exemplo: Favoritar um suplemento

**User clica no botão ❤️**
↓
```javascript
// supplement-list.js (event delegation)
container.addEventListener('click', (e) => {
  const card = e.target.closest('[data-supplement-id]');
  if (!card) return;
  
  const id = card.dataset.supplementId;
  const isFavorite = state.favorites.includes(id);
  
  // 1. Update state
  const newFavorites = isFavorite
    ? state.favorites.filter(f => f !== id)
    : [...state.favorites, id];
  
  stateManager.setState('favorites', newFavorites);
  // StateManager automatically:
  //   - Validates new state
  //   - Saves to localStorage
  //   - Emits 'state:changed' event
});
```

**StateManager emits event**
↓
```javascript
eventBus.emit('state:changed', {
  path: 'favorites',
  value: newFavorites,
  fullState: stateManager.state,
});
```

**All subscribers listen**
↓
```javascript
// In supplement-card.js component initialization:
eventBus.on('state:changed', ({ path }) => {
  if (path === 'favorites') {
    // Re-render only the heart icon
    const isFavorite = stateManager.getState('favorites').includes(supplementId);
    heartIcon.classList.toggle('filled', isFavorite);
  }
});

// In favorites-page.js:
eventBus.on('state:changed', ({ path }) => {
  if (path === 'favorites') {
    // Re-render favorites list
    renderFavoritesList();
  }
});

// In toast.js:
eventBus.on('state:changed', ({ path, value }) => {
  if (path === 'favorites') {
    toast.show('Suplemento adicionado aos favoritos!', 'success');
  }
});
```

---

## 🛡️ REGRAS OBRIGATÓRIAS

### 1. **Nenhuma Variável Global**
```javascript
// ❌ PROIBIDO
window.state = {};
let globalCache = [];

// ✅ OBRIGATÓRIO
import { stateManager } from './core/state-manager.js';
import { eventBus } from './core/eventbus.js';
```

### 2. **Toda Renderização Envolta em ErrorBoundary**
```javascript
// ❌ PROIBIDO
export function renderCard(supplement) {
  return createCardHTML(supplement);
}

// ✅ OBRIGATÓRIO
import { ErrorBoundary } from './core/error-boundary.js';

export const renderCard = ErrorBoundary.wrap(
  (supplement) => createCardHTML(supplement),
  'SupplementCard'
);
```

### 3. **Validação Sempre**
```javascript
// ❌ PROIBIDO
const data = JSON.parse(localStorage.getItem('data'));
displaySupplement(data); // Pode quebrar se data inválido

// ✅ OBRIGATÓRIO
const stored = localStorage.getItem('data');
const result = SupplementSchema.validate(JSON.parse(stored));
if (result.isValid) {
  displaySupplement(result.data);
} else {
  logger.error('Invalid supplement:', result.errors);
  displayErrorState();
}
```

### 4. **Event Delegation, Não Event Listeners por Card**
```javascript
// ❌ PROIBIDO (cria listener para cada card!)
cards.forEach(supplement => {
  const el = createCard(supplement);
  el.querySelector('button').addEventListener('click', () => {
    handleClick(supplement.id);
  });
});

// ✅ OBRIGATÓRIO (listener único no container)
container.addEventListener('click', (e) => {
  const card = e.target.closest('[data-supplement-id]');
  if (card) handleClick(card.dataset.supplementId);
});
```

### 5. **State Mutações Apenas via StateManager**
```javascript
// ❌ PROIBIDO
stateManager.state.favorites.push(id);

// ✅ OBRIGATÓRIO
const updated = [...stateManager.getState('favorites'), id];
stateManager.setState('favorites', updated);
```

### 6. **Components são Puros (inputs → output)**
```javascript
// ✅ CORRETO: component retorna elemento, não mexe com DOM
export function createSupplementCard(supplement, isFavorite) {
  const div = document.createElement('div');
  div.innerHTML = `...`;
  return div;
}

// ✅ CORRETO: container cuida de inserir no DOM e escutar eventos
const card = createSupplementCard(supplement, isFavorite);
container.appendChild(card);

container.addEventListener('click', handler);
```

---

## 🎯 FLUXO DE INICIALIZAÇÃO

```javascript
// src/js/main.js
import { stateManager } from './core/state-manager.js';
import { eventBus } from './core/eventbus.js';
import { supplementRepo } from './features/supplements/supplementRepo.js';
import { initSupplementList } from './components/supplement-list.js';
import { initFavoritesPage } from './components/favorites-page.js';
import { logger } from './utils/logger.js';

async function bootApp() {
  try {
    logger.info('🚀 SupliList booting...');
    
    // 1. Load master supplement database
    const supplements = await supplementRepo.loadAll();
    stateManager.setState('supplements', supplements);
    eventBus.emit('supplements:loaded', { supplements, count: supplements.length });
    
    // 2. Initialize pages/components
    initSupplementList();
    initFavoritesPage();
    
    // 3. Setup global listeners
    eventBus.on('inventory:urgent', (payload) => {
      // Show badge or alert
      logger.warn('⚠️ Stock alerts:', payload.supplements);
    });
    
    eventBus.on('component:error', ({ componentName, error }) => {
      logger.error(`Component failed: ${componentName}: ${error}`);
      // Could send to error tracking service
    });
    
    logger.info('✅ App ready');
  } catch (err) {
    logger.error('Boot failed:', err);
    document.body.innerHTML = `<div class="error">Falha ao carregar aplicação</div>`;
  }
}

// Start when DOM ready
document.addEventListener('DOMContentLoaded', bootApp);
```

---

## 📦 Exportação de Módulos: Padrão Obrigatório

Cada módulo deve exportar **explicitamente** o que oferece:

```javascript
// ✅ CORRETO
export { stateManager };
export { eventBus };
export { SupplementSchema, AppStateSchema };

// ✅ CORRETO (default para componentes)
export default function createCard(supplement) { ... }

// ❌ EVITAR
module.exports = ...
export * from ...
```

---

## 🔍 Próximos Passos (Ordem de Implementação)

1. **Core Layer** (nenhuma dependência)
   - `eventbus.js`
   - `state-manager.js`
   - `schema-validator.js`
   - `error-boundary.js`
   - `constants.js`
   - `logger.js`

2. **Types & Data Schemas** (dependem de Core)
   - `supplement.schema.js`
   - `state.schema.js`
   - `events.schema.js`
   - `supplements.json` (master data)

3. **Features** (dependem de Core + Types)
   - `supplementRepo.js`
   - `supplementService.js`
   - `favoritesRepo.js` / `inventoryRepo.js`

4. **Components** (dependem de Features + ErrorBoundary)
   - `supplement-card.js` (pure render)
   - `supplement-list.js` (container + event delegation)
   - `toast.js` (notifications)
   - Outras páginas...

5. **Integration**
   - `index.html` (single entry point)
   - `main.js` (boot sequence)

---

## ✅ Checklist de Arquitetura

- [ ] Nenhuma variável global (tudo via imports)
- [ ] EventBus é singleton centralizado
- [ ] StateManager guarda toda verdade única
- [ ] Toda renderização tem ErrorBoundary
- [ ] Schemas validam entrada/saída
- [ ] Event delegation em containers, não em cards
- [ ] Components são funções puras
- [ ] Todos os eventos documentados em `events.schema.js`
- [ ] localStorage sync automático
- [ ] Debug logging para rastreabilidade

---

## 📞 Próxima Fase

Quando estiver pronto, peça para:
1. **API Contracts** (assinaturas detalhadas de cada função)
2. **DesignSystem.css** (Tailwind tokens + custom properties)
3. **Implementação da Core Layer** (eventbus, state-manager, etc)

**Autor:** Senior Software Architect  
**Status:** ✅ Blueprint Completo  
**Próxima Revisão:** Após implementação Core Layer
