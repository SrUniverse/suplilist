# SupliList — API CONTRACTS v2.0
## Assinaturas Canônicas de Todas as Funções Públicas

**Data:** 2026-05-23  
**Status:** ✅ Pronto para Implementação  
**Cole este arquivo no início de cada sessão com a IA**

---

## 📚 ÍNDICE

1. [Core Layer (State, Events, Validation)](#core-layer)
2. [Features (Business Logic)](#features)
3. [Components (UI Rendering)](#components)
4. [Utils (Helpers)](#utils)

---

## 🧠 CORE LAYER

### EventBus (src/js/core/eventbus.js)

```typescript
class EventBus {
  /**
   * Subscribe to an event type
   * @param {string} eventType - Event identifier (e.g., 'state:changed')
   * @param {(payload: any) => void} handler - Callback function
   * @returns {() => void} Unsubscribe function
   * @throws Nothing (catches handler errors internally)
   * @example
   *   const unsubscribe = eventBus.on('favorite:toggled', (payload) => {
   *     console.log('Favorite toggled:', payload);
   *   });
   *   unsubscribe(); // Stop listening
   */
  on(eventType: string, handler: Function): () => void

  /**
   * Unsubscribe from an event
   * @param {string} eventType - Event identifier
   * @param {(payload: any) => void} handler - Handler to remove
   * @returns {void}
   */
  off(eventType: string, handler: Function): void

  /**
   * Emit an event to all subscribers
   * @param {string} eventType - Event identifier
   * @param {any} payload - Event data (validated against schema)
   * @returns {void}
   * @throws {Error} If payload fails schema validation
   * @throws {Error} Handler errors are caught and logged, emit error:system event
   */
  emit(eventType: string, payload: any): void

  /**
   * Get event history (for debugging)
   * @param {string?} eventType - Optional filter by event type
   * @returns {Array<{ eventType, payload, timestamp }>} Last 100 events (or filtered)
   */
  getHistory(eventType?: string): Object[]

  /**
   * Clear event history
   * @returns {void}
   */
  clearHistory(): void
}

// Singleton export
export const eventBus = new EventBus();
```

---

### StateManager (src/js/core/state-manager.js)

```typescript
class StateManager {
  /**
   * Get entire state or a nested path
   * @param {string?} path - Dot-notation path: "favorites" | "inventory.creatina-mono"
   * @returns {AppState | any} Full state or the value at path
   * @throws Nothing (returns undefined if path invalid)
   */
  getState(path?: string): AppState | any

  /**
   * Update a state path (immutable)
   * @param {string} path - Dot-notation path
   * @param {any} value - New value (must pass validation)
   * @returns {void}
   * @throws {Error} If resulting state fails AppState validation
   * @side-effects
   *   - Updates this.state
   *   - Saves to localStorage
   *   - Emits 'state:changed' event
   *   - Notifies path observers
   */
  setState(path: string, value: any): void

  /**
   * Observe changes to a specific path
   * @param {string} path - Dot-notation path
   * @param {(value: any) => void} callback - Called when path changes
   * @returns {() => void} Unsubscribe function
   */
  observe(path: string, callback: Function): () => void

  /**
   * Export current state (useful for debugging/export feature)
   * @returns {AppState} Deep clone of state
   */
  exportState(): AppState

  /**
   * Import state from external source (e.g., backup file)
   * @param {any} data - Raw data to validate and import
   * @returns {void}
   * @throws {Error} If data fails AppState validation
   * @side-effects
   *   - Replaces this.state
   *   - Saves to localStorage
   *   - Emits 'state:imported' event
   */
  importState(data: any): void
}

export const stateManager = new StateManager();
```

---

### Schema Validators (src/js/types/*.schema.js)

```typescript
class SupplementSchema {
  /**
   * Validate a Supplement object
   * @param {any} data - Data to validate
   * @returns {{
   *   isValid: boolean,
   *   errors: string[],
   *   data: Supplement | null
   * }}
   * @details
   *   - Required fields: id, name, category, evidenceLevel, mechanism, defaultDose, unit, goals, prices, costPerDose, image
   *   - id must be slug format (lowercase, hyphens)
   *   - All enums validated against constants
   *   - prices must have ≥1 marketplace
   *   - Returns normalized data if valid
   */
  static validate(data: any): ValidationResult<Supplement>
}

class AppStateSchema {
  /**
   * Validate entire AppState
   * @param {any} data - Data to validate
   * @returns {{
   *   isValid: boolean,
   *   errors: string[],
   *   data: AppState | null
   * }}
   * @details
   *   - Validates supplements, favorites, inventory, settings
   *   - Runs SupplementSchema.validate on each supplement
   *   - Returns null if any validation fails
   */
  static validate(data: any): ValidationResult<AppState>
}

// Usage
const result = SupplementSchema.validate(rawData);
if (result.isValid) {
  processedData = result.data; // Normalized + validated
} else {
  logger.error(result.errors); // ['id must be slug...', ...]
}
```

---

### ErrorBoundary (src/js/core/error-boundary.js)

```typescript
class ErrorBoundary {
  /**
   * Wrap a render function with error handling
   * @param {Function} renderFn - Pure component function
   * @param {string} componentName - For debugging
   * @returns {Function} Wrapped function that returns HTMLElement | ErrorCard
   * @details
   *   - Catches exceptions during renderFn execution
   *   - Logs error to logger and emits 'component:error' event
   *   - Returns styled error card instead of breaking page
   *   - Error card hides detailed message in production
   */
  static wrap(renderFn: Function, componentName: string): Function

  /**
   * Generate error UI element
   * @private
   * @returns {HTMLElement} Error card with component name + message
   */
  static _renderErrorState(componentName: string, err: Error): HTMLElement
}

// Usage
export const SafeCard = ErrorBoundary.wrap(
  (supplement) => createCardHTML(supplement),
  'SupplementCard'
);
```

---

## ⚙️ FEATURES

### SupplementRepository (src/js/features/supplements/supplementRepo.js)

```typescript
class SupplementRepository {
  /**
   * Load all supplements from master database
   * @returns {Promise<Record<string, Supplement>>} Map of id -> Supplement
   * @throws {Error} If JSON parsing or network fails
   * @caches Result in memory until invalidated
   */
  async loadAll(): Promise<Record<string, Supplement>>

  /**
   * Get single supplement by ID
   * @param {string} id - Supplement ID
   * @returns {Supplement | null} Supplement or null if not found
   * @throws Nothing (returns null on not found)
   */
  getById(id: string): Supplement | null

  /**
   * Search supplements by name/mechanism
   * @param {string} query - Search term (case-insensitive)
   * @returns {Supplement[]} Matching supplements
   * @details
   *   - Searches in name and mechanism fields
   *   - Returns results in original order
   */
  search(query: string): Supplement[]

  /**
   * Filter supplements by category/goals/price
   * @param {Object} filters - Filter criteria
   *   @param {string[]?} filters.categories - Include only these categories
   *   @param {string[]?} filters.goals - Include if contain any goal
   *   @param {number?} filters.maxPrice - Maximum costPerDose (BRL)
   * @returns {Supplement[]} Filtered supplements
   */
  filter(filters: FilterOptions): Supplement[]

  /**
   * Get supplements in order by metric
   * @param {Supplement[]} supplements - Input array
   * @param {'cost' | 'evidence' | 'name'} sortBy - Sort metric
   * @returns {Supplement[]} Sorted array
   */
  sort(supplements: Supplement[], sortBy: string): Supplement[]

  /**
   * Invalidate cache (call after master data updates)
   * @returns {void}
   */
  invalidateCache(): void
}

export const supplementRepo = new SupplementRepository();
```

---

### SupplementService (src/js/features/supplements/supplementService.js)

```typescript
class SupplementService {
  /**
   * Comprehensive search with filters and sorting
   * @param {Object} options
   *   @param {string} options.query - Search term
   *   @param {FilterOptions} options.filters - Categories, goals, price
   *   @param {'cost'|'evidence'|'name'} options.sortBy - Sort order
   * @returns {{
   *   results: Supplement[],
   *   count: number,
   *   query: string,
   *   timestamp: number
   * }}
   * @details
   *   - Caches last result in state.lastQuery
   *   - Emits 'supplements:filtered' event
   *   - Returns all supplements if query empty
   */
  search(options: SearchOptions): SearchResult

  /**
   * Get supplement with calculated fields
   * @param {string} id - Supplement ID
   * @param {Object?} options
   *   @param {boolean} options.includeFavorite - Include favorited status
   *   @param {boolean} options.includeInventory - Include stock info
   * @returns {{
   *   supplement: Supplement,
   *   isFavorite: boolean,
   *   stockStatus?: 'in-stock' | 'running-low' | 'out-of-stock',
   *   daysLeft?: number
   * }}
   * @throws Nothing (returns null if not found)
   */
  getEnriched(id: string, options?: Object): EnrichedSupplement | null

  /**
   * Get top N supplements by metric
   * @param {'costPerDose' | 'evidenceLevel'} metric
   * @param {number} limit - How many to return
   * @returns {Supplement[]}
   */
  getTopBy(metric: string, limit: number): Supplement[]
}

export const supplementService = new SupplementService();
```

---

### FavoritesRepository (src/js/features/favorites/favoritesRepo.js)

```typescript
class FavoritesRepository {
  /**
   * Add supplement to favorites
   * @param {string} supplementId - Supplement ID
   * @returns {void}
   * @side-effects
   *   - Updates state.favorites
   *   - Emits 'favorite:toggled' + 'favorites:updated'
   */
  add(supplementId: string): void

  /**
   * Remove supplement from favorites
   * @param {string} supplementId - Supplement ID
   * @returns {void}
   * @side-effects Same as add()
   */
  remove(supplementId: string): void

  /**
   * Toggle favorite status
   * @param {string} supplementId - Supplement ID
   * @returns {boolean} New favorite status
   */
  toggle(supplementId: string): boolean

  /**
   * Check if supplement is favorited
   * @param {string} supplementId
   * @returns {boolean}
   */
  isFavorite(supplementId: string): boolean

  /**
   * Get all favorite supplements
   * @returns {Supplement[]}
   */
  getAll(): Supplement[]

  /**
   * Export favorites as JSON
   * @returns {string} JSON stringified array of supplement IDs
   */
  export(): string

  /**
   * Import favorites from JSON
   * @param {string} json - JSON array of supplement IDs
   * @returns {void}
   * @throws {Error} If JSON invalid
   * @side-effects
   *   - Overwrites state.favorites
   *   - Emits 'favorites:updated'
   */
  import(json: string): void
}

export const favoritesRepo = new FavoritesRepository();
```

---

### InventoryRepository (src/js/features/inventory/inventoryRepo.js)

```typescript
class InventoryRepository {
  /**
   * Record supplement purchase/addition
   * @param {string} supplementId - Supplement ID
   * @param {number} qty - Quantity in Supplement.unit
   * @returns {void}
   * @side-effects
   *   - Creates/updates state.inventory[id]
   *   - Sets purchaseDate to today
   *   - Emits 'inventory:updated'
   *   - Checks for urgent status (≤7 days)
   */
  update(supplementId: string, qty: number): void

  /**
   * Get current stock quantity
   * @param {string} supplementId
   * @returns {number | null} Quantity or null if not tracked
   */
  getQty(supplementId: string): number | null

  /**
   * Calculate days until out of stock
   * @param {string} supplementId
   * @returns {number | null} Days left or null if unknown
   * @formula (qty / defaultDose)
   */
  getDaysLeft(supplementId: string): number | null

  /**
   * Get projected end-of-stock date
   * @param {string} supplementId
   * @returns {Date | null}
   * @formula purchaseDate + daysLeft
   */
  getEndOfStockDate(supplementId: string): Date | null

  /**
   * Check all supplements for urgent stock (<7 days)
   * @returns {{
   *   supplements: Array<{ id, daysLeft }>,
   *   hasUrgent: boolean
   * }}
   * @side-effects
   *   - Emits 'inventory:urgent' if any urgent
   */
  checkUrgent(): UrgentResult

  /**
   * Get all tracked inventory
   * @returns {Record<string, { qty, purchaseDate, supplement }>}
   */
  getAll(): Record<string, InventoryItem>

  /**
   * Remove from inventory
   * @param {string} supplementId
   * @returns {void}
   * @side-effects
   *   - Deletes state.inventory[id]
   *   - Emits 'inventory:updated'
   */
  remove(supplementId: string): void
}

export const inventoryRepo = new InventoryRepository();
```

---

### ComparatorService (src/js/features/comparator/comparatorService.js)

```typescript
class ComparatorService {
  /**
   * Compare 2-4 supplements side-by-side
   * @param {string[]} supplementIds - IDs to compare (2-4)
   * @returns {{
   *   supplements: Supplement[],
   *   matrix: {
   *     cost: Record<string, number>, // costPerDose
   *     evidence: Record<string, string>, // evidenceLevel
   *     mechanism: Record<string, string>,
   *     ...all comparable fields
   *   },
   *   interactions: Record<string, InteractionRule[]>, // pairwise interactions
   *   winner: {
   *     costPerDose: string, // supplement ID with lowest cost
   *     evidenceLevel: string, // supplement ID with best evidence
   *   }
   * }}
   * @throws {Error} "MIN_TWO_SUPPLEMENTS" if < 2 IDs
   * @throws {Error} "MAX_FOUR_SUPPLEMENTS" if > 4 IDs
   * @throws {Error} "INVALID_SUPPLEMENT_ID" if any ID not found
   */
  compare(supplementIds: string[]): ComparisonResult

  /**
   * Get known interactions between two supplements
   * @param {string} suppId1
   * @param {string} suppId2
   * @returns {InteractionRule[]}
   * @details
   *   - Returns empty array if no known interactions
   *   - InteractionRule: { type: 'synergistic'|'antagonistic'|'neutral', note: string }
   */
  getInteractions(suppId1: string, suppId2: string): InteractionRule[]
}

export const comparatorService = new ComparatorService();
```

---

## 🎨 COMPONENTS

### SupplementCard (src/js/components/supplement-card.js)

```typescript
/**
 * Create a single supplement card element (pure function)
 * @param {Supplement} supplement - Supplement data
 * @param {Object?} options
 *   @param {boolean?} options.isFavorite - Show filled heart
 *   @param {boolean?} options.showInventory - Show stock info
 *   @param {string[]?} options.highlightTerms - Terms to highlight in name
 * @returns {HTMLElement} Card element (not attached to DOM)
 * @throws {Error} Caught by ErrorBoundary, returns error card
 * @details
 *   - Adds data-supplement-id="{id}" for event delegation
 *   - Does NOT add event listeners (parent container does)
 *   - Tailwind classes for consistent styling
 *   - Responsive grid layout
 */
function createCard(supplement: Supplement, options?: CardOptions): HTMLElement

// Wrapped with ErrorBoundary
export const SupplementCard = ErrorBoundary.wrap(
  createCard,
  'SupplementCard'
);
```

---

### SupplementList (src/js/components/supplement-list.js)

```typescript
class SupplementListController {
  /**
   * Initialize supplement list page
   * @param {HTMLElement} container - Container element
   * @returns {void}
   * @side-effects
   *   - Sets up event delegation on container
   *   - Listens to 'supplements:filtered' events
   *   - Renders initial list
   */
  init(container: HTMLElement): void

  /**
   * Render supplements to container
   * @param {Supplement[]} supplements - Supplements to render
   * @param {Object?} options
   *   @param {boolean?} options.showSkeleton - Show loading state first
   * @returns {void}
   * @side-effects
   *   - Clears container
   *   - Appends supplement cards
   */
  render(supplements: Supplement[], options?: RenderOptions): void

  /**
   * Handle click events (event delegation)
   * @private
   * @param {ClickEvent} event
   * @details
   *   - Favorite button: emits 'favorite:toggled'
   *   - Detail button: emits 'supplement:detail:open'
   *   - Buy button: emits 'checkout:initiated'
   *   - Compare button: opens modal
   */
  private handleClick(event: Event): void
}

// Factory function
export function initSupplementList(containerId: string): SupplementListController
```

---

### Toast (src/js/components/toast.js)

```typescript
class Toast {
  /**
   * Show a notification
   * @param {string} message - Notification text
   * @param {'success'|'warning'|'danger'|'info'} type - Message type
   * @param {number?} duration - Auto-dismiss time (ms), default 4000
   * @returns {string} Toast ID for manual dismiss
   * @side-effects
   *   - Creates toast element
   *   - Appends to fixed position (bottom-right)
   *   - Auto-removes after duration
   *   - Max 3 simultaneous
   *   - Emits 'toast:show' event
   */
  show(message: string, type: ToastType, duration?: number): string

  /**
   * Dismiss a toast by ID
   * @param {string} toastId
   * @returns {void}
   * @side-effects
   *   - Removes toast element
   *   - Emits 'toast:dismiss' event
   */
  dismiss(toastId: string): void

  /**
   * Dismiss all toasts
   * @returns {void}
   */
  dismissAll(): void
}

export const toast = new Toast();

// Usage:
const id = toast.show('Suplemento favoritado!', 'success', 3000);
// or
toast.dismiss(id); // manual dismiss
```

---

### Skeleton (src/js/components/skeleton.js)

```typescript
class SkeletonLoader {
  /**
   * Render loading placeholders
   * @param {number} count - How many skeleton items
   * @param {HTMLElement} container - Where to render
   * @param {'card'|'list'|'stat'?} variant - Style variant
   * @returns {void}
   * @details
   *   - Adds data-skeleton="true" to each element
   *   - Animated pulse effect via CSS
   *   - Use BEFORE async data fetch
   */
  render(count: number, container: HTMLElement, variant?: string): void

  /**
   * Remove all skeleton elements from container
   * @param {HTMLElement} container
   * @returns {void}
   * @details
   *   - Removes elements with data-skeleton="true"
   *   - Call AFTER data loaded
   */
  clear(container: HTMLElement): void
}

export const skeleton = new SkeletonLoader();

// Usage:
skeleton.render(6, container, 'card');
const results = await supplementService.search(options);
skeleton.clear(container);
renderCards(results);
```

---

## 🛠️ UTILS

### Constants (src/js/utils/constants.js)

```typescript
export const CATEGORIES = [
  'Aminoácido',
  'Adaptógeno',
  'Mineral',
  'Hormônio',
  'Vitamina',
  'Ácido Graxo',
  'Digital',
];

export const GOALS = [
  'Hipertrofia',
  'Queima',
  'Energia',
  'Foco',
  'Sono',
  'Libido',
  'Longevidade',
  'Saúde Geral',
];

export const UNITS = ['g', 'mg', 'mcg', 'UI', 'ml'];

export const EVIDENCE_LEVELS = ['A', 'B', 'C'];

export const MARKETPLACES = ['shopee', 'mercadolivre', 'amazon'];

export const TOAST_TYPES = ['success', 'warning', 'danger', 'info'];

export const SORT_OPTIONS = ['cost', 'evidence', 'name'];
```

---

### Formatters (src/js/utils/formatters.js)

```typescript
/**
 * Format price to BRL currency
 * @param {number} value - Value in BRL
 * @returns {string} Formatted: "R$ 49,90"
 */
export function formatPrice(value: number): string

/**
 * Format dose with unit
 * @param {number} dose
 * @param {string} unit - 'g', 'mg', 'mcg', 'UI', 'ml'
 * @returns {string} "5g", "500mg", "1000mcg", "2000UI"
 */
export function formatDose(dose: number, unit: string): string

/**
 * Format date to Brazilian format
 * @param {Date | string} date
 * @returns {string} "23/05/2026"
 */
export function formatDate(date: Date | string): string

/**
 * Format relative time
 * @param {Date | number} date - Date or timestamp (ms)
 * @returns {string} "há 2 dias", "há 3 horas"
 */
export function formatRelativeTime(date: Date | number): string

/**
 * Capitalize first letter
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str: string): string

/**
 * Truncate string with ellipsis
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str: string, maxLen: number): string
```

---

### Validators (src/js/utils/validators.js)

```typescript
/**
 * Check if string is valid slug (lowercase, hyphens)
 * @param {string} str
 * @returns {boolean}
 */
export function isValidSlug(str: string): boolean

/**
 * Check if number is positive
 * @param {number} n
 * @returns {boolean}
 */
export function isPositive(n: number): boolean

/**
 * Check if array has unique values
 * @param {any[]} arr
 * @returns {boolean}
 */
export function isUnique(arr: any[]): boolean

/**
 * Check if email is valid (basic regex)
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email: string): boolean

/**
 * Check if URL is valid
 * @param {string} url
 * @returns {boolean}
 */
export function isValidUrl(url: string): boolean
```

---

### Logger (src/js/utils/logger.js)

```typescript
class Logger {
  /**
   * Log debug message
   * @param {string} msg
   * @param {any?} data
   * @returns {void}
   * @details Only logs if NODE_ENV === 'development'
   */
  debug(msg: string, data?: any): void

  /**
   * Log info message
   * @param {string} msg
   * @param {any?} data
   * @returns {void}
   */
  info(msg: string, data?: any): void

  /**
   * Log warning
   * @param {string} msg
   * @param {any?} data
   * @returns {void}
   */
  warn(msg: string, data?: any): void

  /**
   * Log error
   * @param {string} msg
   * @param {Error | any?} error
   * @returns {void}
   * @details
   *   - Includes stack trace in development
   *   - Sends to error tracking service in production (optional)
   */
  error(msg: string, error?: any): void

  /**
   * Set log level
   * @param {'debug'|'info'|'warn'|'error'} level
   * @returns {void}
   */
  setLevel(level: string): void
}

export const logger = new Logger();
```

---

## 🔄 INTERACTION FLOW: Click to State Update

```
USER CLICKS FAVORITE BUTTON
  ↓
supplement-list.js detects click via event delegation
  ↓
Get supplementId from data attribute
  ↓
favoritesRepo.toggle(supplementId)
  ↓
Update state.favorites via stateManager.setState()
  ↓
StateManager validates new state
  ↓
StateManager persists to localStorage
  ↓
StateManager emits 'state:changed' event
  ↓
Multiple subscribers listen:
  ├─ supplement-card: update heart icon
  ├─ favorites-page: add/remove from favorites list
  ├─ toast: show "Favoritado!" notification
  └─ logger: record action for debugging
```

---

## ✅ VALIDATION FLOW

```
External API response comes in
  ↓
SupplementSchema.validate(rawData)
  ↓
If isValid:
  ├─ Use result.data (normalized)
  └─ Update state
  
Else:
  ├─ Log result.errors
  ├─ Show error card
  └─ Use FallbackState
```

---

## 📋 CHECKLIST ANTES DE CADA IMPLEMENTAÇÃO

Quando implementar um módulo, verifique:

- [ ] Todas as funções têm JSDoc com @param, @returns, @throws, @side-effects
- [ ] Funções são puras quando possível
- [ ] Estado é atualizado APENAS via stateManager.setState()
- [ ] Eventos são emitidos com validados payload
- [ ] Componentes retornam HTMLElement, não mexem com DOM
- [ ] Componentes são wrappados com ErrorBoundary
- [ ] Event listeners usam delegation (exceto globais)
- [ ] Todos os throws documentados
- [ ] Logger.debug() em pontos críticos
- [ ] Nenhuma variável global

---

## 🚀 PRÓXIMOS PASSOS

1. **Implementação Core** → eventbus.js, state-manager.js, validators.js
2. **Schemas** → supplement.schema.js, state.schema.js
3. **Features** → supplementRepo.js, favoritesRepo.js
4. **Components** → supplement-card.js, supplement-list.js
5. **Integration** → main.js, index.html

---

**Versão:** 2.0  
**Última Atualização:** 2026-05-23  
**Status:** ✅ Pronto para Coding
