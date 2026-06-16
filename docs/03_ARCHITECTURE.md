# Architecture Overview — SupliList v2.0

**Version:** 2.0.0  
**Pattern:** Event-Driven SPA with Immutable State  
**Stack:** Vanilla JS + Vite + Tailwind  

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface (UI)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Components: Cards, Lists, Modals, Filters, Tabs      │   │
│  │ Updates from: EventBus (listening to events)         │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│                   emit event                                │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │              EventBus (Pub/Sub)                        │  │
│  │  • validate payload against events.schema.js          │  │
│  │  • broadcast to all listeners                         │  │
│  │  • prevent silent failures with validation            │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│                   notify                                    │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │        StateManager (Reactive Store)                  │  │
│  │  • immutable state tree                               │  │
│  │  • deep-clone on mutations                            │  │
│  │  • auto-persist to localStorage                       │  │
│  │  • notify subscribers on change                       │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│                   read state                                │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │     Feature Modules (Business Logic)                  │  │
│  │  • Supplements Repository (load, search)              │  │
│  │  • Favorites Manager (add, remove, export)            │  │
│  │  • Comparator Engine (analyze interactions)           │  │
│  │  • Inventory Tracker (stock levels, alerts)           │  │
│  │  • Settings Manager (preferences, theme)              │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│                   read data                                 │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │           Data & Persistence Layer                    │  │
│  │  • localStorage (state persistence)                   │  │
│  │  • IndexedDB (optional, large datasets)               │  │
│  │  • database.js (supplement catalog)                   │  │
│  │  • fallback-state.json (recovery)                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. EventBus (Pub/Sub Pattern)

The EventBus is the **central communication hub**. No component directly calls another.

**How it works:**

```javascript
// src/js/core/eventbus.js
class EventBus {
  on(eventName, callback)      // Listen for event
  emit(eventName, payload)     // Trigger event
  off(eventName, callback)     // Unsubscribe
}
```

**Example flow:**

```
User clicks "Add to Favorites" button
  ↓
Component: emit('favorite:add', { supplementId: 'creatine' })
  ↓
EventBus: validates payload against events.schema.js
  ↓
StateManager: listens on 'favorite:add' → mutates state
  ↓
Other components listening on 'favorite:updated': re-render
```

**Benefits:**
- ✅ Complete decoupling (no tight coupling)
- ✅ Easy to add new listeners without modifying sender
- ✅ Consistent data flow
- ✅ Testable in isolation

---

### 2. StateManager (Immutable Store)

All app state lives in **one immutable tree**, similar to Redux.

**Design principles:**

```javascript
// Current state is READ-ONLY
const currentState = stateManager.getState();

// Mutations return NEW state (deep clone)
stateManager.setState({
  ...currentState,
  favorites: [...currentState.favorites, supplementId],
  // ↑ New array created, old one untouched
});

// Changes auto-persist to localStorage
// Subscribers notified of change
```

**State shape:**

```javascript
{
  supplements: {
    all: [...],           // Full catalog
    filtered: [...],      // After search/filters
    loading: false,
    error: null
  },
  favorites: [...],
  inventory: {
    items: {...},         // Stocked items
    alerts: [...]         // Low-stock alerts
  },
  comparisons: {
    selected: [...],      // For side-by-side view
    interactions: [...]   // Warnings
  },
  settings: {
    theme: 'light',
    currency: 'BRL',
    language: 'pt-BR'
  },
  ui: {
    modalOpen: false,
    sidebarExpanded: true,
    searchQuery: ''
  }
}
```

---

### 3. Three-Layer Validation

Data protection on **all** entry points:

```
User Input
  ↓
1️⃣ INPUT VALIDATION (shape check)
   - Is this a valid event name?
   - Does payload have required fields?
   - Schema: events.schema.js
  ↓ 
2️⃣ SCHEMA VALIDATION (type check)
   - Is supplementId a valid string slug?
   - Is price a positive number?
   - Schema: supplement.schema.js
  ↓
3️⃣ STATE MUTATION (business logic)
   - Apply changes to immutable tree
   - Notify subscribers
   - Persist to storage
```

**Example:**

```javascript
// Attempt to add invalid supplement
eventBus.emit('favorite:add', { 
  supplementId: 123  // ❌ Should be string
});

// Layer 1: InputValidator rejects
// → Event never reaches StateManager
// → Console logs validation error
// → UI shows safe error message to user
// → App continues working
```

---

### 4. Error Boundaries

React-like error handling for **resilience**.

```javascript
// src/js/core/error-boundary.js
class ErrorBoundary {
  wrap(renderFunction, fallbackUI) {
    try {
      return renderFunction();
    } catch (error) {
      console.error('[ErrorBoundary]', error);
      return fallbackUI;  // Show safe fallback
    }
  }
}

// Usage in supplement card:
const html = errorBoundary.wrap(
  () => createSupplementCard(supplement),
  createErrorCard(supplement.id)
);
// If card breaks → shows ErrorCard instead of blank
// Other cards continue rendering normally
```

---

## Project Folder Structure

```
suplilist/
│
├── frontend/                           # Frontend workspace
│   ├── src/
│   │   ├── js/
│   │   │   ├── main.js                # Boot sequence
│   │   │   │
│   │   │   ├── core/
│   │   │   │   ├── eventbus.js        # Pub/Sub system
│   │   │   │   ├── state-manager.js   # Immutable store
│   │   │   │   ├── error-boundary.js  # Error isolation
│   │   │   │   └── meta-manager.js    # SEO/manifest
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── supplement.schema.js    # Validation rules
│   │   │   │   ├── state.schema.js        # State shape
│   │   │   │   └── events.schema.js       # Event payloads
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   ├── constants.js       # Enums (categories, goals)
│   │   │   │   ├── validators.js      # Reusable validators
│   │   │   │   ├── formatters.js      # Visual formatting
│   │   │   │   ├── parsers.js         # Safe parsing
│   │   │   │   └── logger.js          # Logging (silenced in prod)
│   │   │   │
│   │   │   ├── features/
│   │   │   │   ├── supplements/
│   │   │   │   │   ├── repository.js      # Load, cache, search
│   │   │   │   │   ├── search-engine.js   # Fuse.js integration
│   │   │   │   │   └── enricher.js        # Add computed fields
│   │   │   │   │
│   │   │   │   ├── favorites/
│   │   │   │   │   ├── manager.js         # Add/remove/export
│   │   │   │   │   └── storage.js         # localStorage sync
│   │   │   │   │
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── tracker.js         # Stock management
│   │   │   │   │   ├── alerts.js          # Low-stock notify
│   │   │   │   │   └── calculator.js      # Days remaining
│   │   │   │   │
│   │   │   │   ├── settings/
│   │   │   │   │   ├── manager.js         # Preferences
│   │   │   │   │   └── theme.js           # Dark/light mode
│   │   │   │   │
│   │   │   │   └── comparator/
│   │   │   │       ├── engine.js          # Side-by-side compare
│   │   │   │       ├── interactions.js    # Warn about combos
│   │   │   │       └── synergies.js       # Beneficial pairs
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── supplement-card.js     # Single item display
│   │   │   │   ├── supplement-list.js     # Grid/list of items
│   │   │   │   ├── supplement-detail.js   # Modal details
│   │   │   │   ├── favorites-page.js      # Favorites view
│   │   │   │   ├── comparator-modal.js    # Comparison UI
│   │   │   │   ├── modal.js               # Base modal component
│   │   │   │   ├── toast.js               # Toast notifications
│   │   │   │   ├── skeleton.js            # Loading placeholder
│   │   │   │   ├── error-card.js          # Error fallback
│   │   │   │   └── error-boundary-ui.js   # Error boundary wrapper
│   │   │   │
│   │   │   └── ui/
│   │   │       ├── search-state.js        # Search state bridge
│   │   │       ├── search-input.js        # Search field
│   │   │       ├── filter-bar.js          # Filter panel
│   │   │       ├── sort-menu.js           # Sort options
│   │   │       ├── tabs.js                # Tab navigation
│   │   │       └── navbar.js              # Top bar
│   │   │
│   │   ├── css/
│   │   │   ├── design-system.css     # Colors, badges, animations
│   │   │   ├── main.css              # Layout, header, buttons
│   │   │   ├── components/           # Component-specific styles
│   │   │   └── utilities.css         # Tailwind utilities
│   │   │
│   │   └── data/
│   │       └── fallback-state.json   # Emergency recovery data
│   │
│   ├── tests/
│   │   └── unit/
│   │       ├── eventbus.test.js      # EventBus tests
│   │       ├── state-manager.test.js # StateManager tests
│   │       ├── validators.test.js    # Schema validation
│   │       └── ... (50+ more tests)
│   │
│   ├── package.json
│   ├── vite.config.js                # Build config
│   ├── vitest.config.js              # Test runner config
│   ├── tailwind.config.js            # CSS framework
│   └── postcss.config.js             # CSS processing
│
├── server/                           # Backend (optional)
├── mcp-server/                       # Claude Code integration
├── database.js                       # Supplement catalog (root)
├── docs/                             # Documentation (YOU ARE HERE)
│   ├── 00_MASTER_INDEX.md
│   ├── 01_QUICKSTART_DEV.md
│   ├── 02_QUICKSTART_DEPLOY.md
│   ├── 03_ARCHITECTURE.md            (this file)
│   ├── TROUBLESHOOTING.md
│   └── ... (more docs)
│
└── package.json (root workspace)
```

---

## Data Flow Example

**Scenario:** User adds "Creatine" to favorites

```
1. User clicks "♥ Favorite" button on Creatine card

2. Component: supplement-card.js
   eventBus.emit('favorite:add', { supplementId: 'creatine' })

3. EventBus validates:
   - Is 'favorite:add' a known event? ✅ Yes
   - Is payload { supplementId: string }? ✅ Yes
   - Pass validation

4. StateManager listener triggers:
   - Get current state
   - Create new state with creatine added to favorites array
   - Call localStorage.setItem(newState)
   - Notify all subscribers

5. Components listening on 'favorite:updated':
   - favorites-page.js re-renders favorites list
   - supplement-card.js updates heart icon (filled now)
   - favorites-count badge updates

6. User sees:
   - Heart icon now filled (red)
   - Notification toast: "Added to favorites"
   - Can see it in Favorites tab immediately
```

---

## Module Responsibilities

| Module | Responsibility | Exports |
|--------|-----------------|---------|
| **EventBus** | Manage pub/sub with validation | `on()`, `emit()`, `off()` |
| **StateManager** | Immutable state tree + persistence | `getState()`, `setState()` |
| **SupplementRepo** | Load & search supplements | `loadAll()`, `search()` |
| **FavoritesManager** | Add/remove/export favorites | `add()`, `remove()`, `export()` |
| **ComparatorEngine** | Side-by-side comparison logic | `compare()`, `checkInteractions()` |
| **InputValidator** | Validate user input | `validate()`, `isValid()` |
| **SupplementSchema** | Define supplement type | Validation rules |

---

## Key Design Decisions

### 1. Why Vanilla JS (No Framework)?
- ✅ **Small Bundle:** 160KB vs 250KB+ with React
- ✅ **Fast:** No framework overhead
- ✅ **Control:** Full visibility into behavior
- ✅ **Learning:** Teaches core web concepts

### 2. Why EventBus Over Direct Calls?
- ✅ **Decoupled:** Components don't know each other
- ✅ **Testable:** Easy to mock events
- ✅ **Scalable:** Add listeners without changing sender
- ❌ Trade-off: Slightly more boilerplate

### 3. Why Immutable State?
- ✅ **Predictable:** No surprise mutations
- ✅ **Debuggable:** Can replay state changes
- ✅ **Performant:** Easy to detect what changed
- ❌ Trade-off: Memory for each change (mitigated by GC)

### 4. Why localStorage?
- ✅ **No Backend Required:** Offline-first PWA
- ✅ **Fast:** Synchronous access
- ✅ **Simple:** No server costs
- ❌ Trade-off: Limited to ~10MB, no sync across tabs

---

## Performance Considerations

### Bundle Optimization
- **Code Splitting:** Features lazily loaded
- **Tree Shaking:** Unused code removed
- **Minification:** Production build compressed

### Render Performance
- **Event Delegation:** Single listener per component
- **Document Fragments:** Batch DOM inserts
- **Debouncing:** Limit re-renders on input
- **Memoization:** Cache expensive computations

### Memory Management
- **Cleanup Listeners:** Remove on component destroy
- **WeakMaps:** For caching with auto-cleanup
- **Pooling:** Reuse objects in high-frequency loops

---

## Testing Strategy

```javascript
// Test the EventBus
test('emit validates payload', () => {
  expect(() => {
    eventBus.emit('invalid-event', {})
  }).toThrow();
});

// Test StateManager
test('setState is immutable', () => {
  const state1 = stateManager.getState();
  stateManager.setState({ ...state1, foo: 'bar' });
  const state2 = stateManager.getState();
  
  expect(state1).not.toBe(state2); // Different objects
  expect(state1.foo).toBeUndefined();
  expect(state2.foo).toBe('bar');
});

// Test Validators
test('supplement schema validates', () => {
  const valid = supplementSchema.validate({
    id: 'creatine',
    name: 'Creatine',
    // ... required fields
  });
  expect(valid.isValid).toBe(true);
});
```

---

## Common Patterns

### Adding a New Feature

1. **Create Schema** (`types/my-feature.schema.js`)
2. **Add State** (update `state.schema.js`)
3. **Create Manager** (`features/my-feature/manager.js`)
4. **Register Events** (`types/events.schema.js`)
5. **Create Component** (`components/my-feature-*.js`)
6. **Wire in Main** (`main.js` → initialize)
7. **Add Tests** (`tests/unit/my-feature.test.js`)

### Listening to Events

```javascript
// Always unsubscribe when done!
const unsub = eventBus.on('supplement:updated', (payload) => {
  console.log('Supplement changed:', payload);
});

// Later:
unsub();  // Remove listener
```

### Accessing State

```javascript
// Get entire state
const state = stateManager.getState();

// Subscribe to changes
const unsub = stateManager.subscribe((newState, oldState) => {
  console.log('State changed');
});

// Update state
stateManager.setState({
  ...stateManager.getState(),
  myValue: 'new'
});
```

---

## Next Steps

1. **Read [Quick Start](./01_QUICKSTART_DEV.md)** — Get dev environment running
2. **Check [API Docs](./API.md)** — Learn supplement schema
3. **Review [Troubleshooting](./TROUBLESHOOTING.md)** — Common issues

---

**Architecture is solid. Data flows cleanly. Code is testable. Let's ship it!** 🚀
