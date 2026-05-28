# **SPRINT 2: EventBus + State Management + IA Local — PROMPTS COMPLETOS**

> Padrão: código real + checklists + deliverables. Cole direto na sessão com o Prompt de Ouro.
>
> **Ordem de execução obrigatória:** 2.0 → 2.1 → 2.2 → 2.3. Cada prompt depende do anterior.

---

## **PROMPT 2.0: EventBus Global — FUNDAÇÃO DO PUB/SUB**

```markdown
You are building the global event bus for SupliList v4.0.

## CONTEXT

All modules in SupliList communicate through a central EventBus (Pub/Sub pattern).
No module imports another module directly to call its methods — they emit and listen to events.
This is what keeps the architecture decoupled and testable.

The EventBus must be created BEFORE the StateManager, because the StateManager uses it
to broadcast state changes to the rest of the app.

## ARCHITECTURE

- Singleton (one global instance)
- Typed events (validated against a known event list)
- Wildcard listener support (e.g., listen to ALL events for debugging)
- Memory-safe: listeners are automatically removed if the emitter element is disconnected
- No external dependencies

## KNOWN EVENTS (seed list — expand as the app grows)

'user:profileUpdated'       → payload: { user }
'user:onboardingComplete'   → payload: { user }
'stack:itemAdded'           → payload: { supplementId, name }
'stack:itemRemoved'         → payload: { supplementId }
'stack:cleared'             → payload: {}
'checkin:added'             → payload: { supplementId, timestamp }
'ai:recommendationsReady'   → payload: { items, profileHash }
'ai:recommendationsInvalid' → payload: {}
'price:dropped'             → payload: { supplementId, newPrice, oldPrice }
'premium:unlocked'          → payload: { tier }
'biometria:updated'         → payload: { source, data }
'social:interaction'        → payload: { type, userId }
'ui:routeChanged'           → payload: { route }
'ui:toastRequested'         → payload: { message, type, duration }
'ui:modalRequested'         → payload: { type, props }

---

## TASK 1: CREATE /src/core/event-bus.js

/**
 * EventBus v4.0 — SupliList
 * Global Pub/Sub system. Singleton.
 *
 * Usage:
 *   import { eventBus } from './event-bus.js';
 *   eventBus.on('stack:itemAdded', handler);
 *   eventBus.emit('stack:itemAdded', { supplementId: 'creatina', name: 'Creatina' });
 *   eventBus.off('stack:itemAdded', handler);
 *
 * Wildcard (debug only):
 *   eventBus.on('*', (event, payload) => console.log(event, payload));
 */

Implement the EventBus class with:

- `on(event, handler)` — register listener, returns unsubscribe function
- `off(event, handler)` — remove listener
- `emit(event, payload)` — notify all listeners, wrapped in try/catch per listener
- `once(event, handler)` — auto-removes after first call
- `on('*', handler)` — wildcard listener receives (eventName, payload)
- `clear(event?)` — remove all listeners for an event, or ALL listeners if no argument (useful for tests)
- `listenerCount(event)` — returns number of registered listeners

Rules:
- NEVER throw if no listeners are registered for an event
- ALWAYS catch errors inside individual listeners so one bad listener doesn't block others
- In non-production, log unhandled errors with [EventBus] prefix
- Singleton: export a single instance AND the class

---

## TASK 2: CREATE /src/core/event-bus.test.js

Test cases required:
1. `on()` registers listener — called when event emits
2. `off()` removes listener — NOT called after removal
3. `once()` fires exactly once
4. Multiple listeners on same event — all called
5. Error in one listener — other listeners still called
6. Wildcard `*` listener — receives all events
7. `clear(event)` removes only that event's listeners
8. `clear()` (no args) removes all listeners
9. `listenerCount()` returns correct count before and after removal
10. Emitting unknown event with no listeners — no throw

---

## VALIDATION CHECKLIST

- [ ] `on()` returns unsubscribe function
- [ ] `off()` removes listener correctly
- [ ] `once()` auto-removes after first emission
- [ ] Error inside listener does NOT stop other listeners
- [ ] Wildcard `*` receives (eventName, payload)
- [ ] `clear()` works both with and without argument
- [ ] No throws on emit with zero listeners
- [ ] Singleton: same instance imported from different modules

## FILES TO DELIVER

1. `/src/core/event-bus.js`
2. `/src/core/event-bus.test.js`
```

---

## **PROMPT 2.1: StateManager Singleton — COMPLETO**

```markdown
You are building the central state management system for SupliList v4.0.

## CONTEXT

SupliList has NO backend initially. Everything runs in localStorage + memory.
The StateManager is the single source of truth for the entire app.

Problems it solves:
- Components talking directly to localStorage → race conditions
- No way to undo/redo actions
- Listeners not notified when state changes
- State gets corrupted if schema changes between versions

## ARCHITECTURE DECISION

We use a Redux-inspired pattern (dispatch/reducer) but in vanilla JS:
- ONE global state object (never mutate directly)
- ONE way to change state: dispatch(action)
- Pure reducer function (no side effects)
- Subscribe/unsubscribe listeners
- Automatic localStorage persistence WITH DEBOUNCE (300ms) — never write on every dispatch
- Schema validation on load

## DEPENDENCY

The StateManager imports and uses the EventBus from `/src/core/event-bus.js`.
After every state change, it MUST emit the appropriate event via `eventBus.emit()`.
The mapping is:

| Action type              | Event to emit              | Payload                        |
|--------------------------|----------------------------|--------------------------------|
| SET_USER_PROFILE         | 'user:profileUpdated'      | { user: state.user }           |
| COMPLETE_ONBOARDING      | 'user:onboardingComplete'  | { user: state.user }           |
| ADD_TO_STACK             | 'stack:itemAdded'          | { supplementId, name }         |
| REMOVE_FROM_STACK        | 'stack:itemRemoved'        | { supplementId }               |
| CLEAR_STACK              | 'stack:cleared'            | {}                             |
| ADD_CHECKIN              | 'checkin:added'            | { supplementId, timestamp }    |
| SET_RECOMMENDATIONS      | 'ai:recommendationsReady'  | { items, profileHash }         |
| INVALIDATE_RECOMMENDATIONS | 'ai:recommendationsInvalid' | {}                           |
| SET_TIER                 | 'premium:unlocked'         | { tier }                       |
| SET_ROUTE                | 'ui:routeChanged'          | { route }                      |
| SHOW_TOAST               | 'ui:toastRequested'        | { message, type, duration }    |

Actions NOT in this table do NOT emit EventBus events (they only notify internal subscribers).

---

## TASK 1: CREATE /src/state/state-manager.js

```javascript
/**
 * StateManager v4.0 — SupliList
 * Redux-inspired singleton for global state management
 *
 * Usage:
 *   import { StateManager } from './state-manager.js';
 *   const sm = StateManager.getInstance();
 *   sm.dispatch({ type: 'ADD_TO_STACK', payload: { id: 'creatina', name: 'Creatina' } });
 *   sm.subscribe((state) => console.log('State changed:', state));
 */

// ─── Schema Definition ─────────────────────────────────────────────────────────

const STATE_VERSION = '4.0.0';
const STORAGE_KEY = 'suplilist-state-v4';

const DEFAULT_STATE = {
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

  // Supplement catalog (loaded from JSON)
  supplements: [],        // Array<Supplement>

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

  // UI state (not persisted)
  ui: {
    currentRoute: '/home',
    loading: false,
    error: null,
    modal: null,          // { type, props }
    toast: null           // { message, type, duration }
  }
};
```

CRITICAL IMPLEMENTATION NOTE — DEBOUNCED PERSISTENCE:
The `_persist()` method MUST use a debounce of 300ms. localStorage writes are synchronous
and expensive. Calling JSON.stringify on the full state on every single dispatch (especially
during bulk operations like loading 1000 check-ins) will freeze the UI.

Implement it like this inside the class:

```javascript
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
```

The rest of the StateManager implementation follows the architecture described above
(action types, reducer, singleton, subscribe/unsubscribe, selectors, history/undo,
_hydrateFromStorage, _migrateState, _pruneStorage, _calculateStreak, dump).
Implement ALL of these completely. No placeholders.

---

## TASK 2: CREATE /src/state/state-manager.test.js

```javascript
// Test cases required (15 minimum):

// 1. Returns singleton (getInstance() × 2 → same object)
// 2. Dispatches valid action → state changes
// 3. Does not add duplicate to stack
// 4. Removes from stack
// 5. subscribe() → listener called on change
// 6. Unsubscribe → listener NOT called
// 7. State persists after simulated reload
// 8. Adds check-in with auto ID + timestamp
// 9. todayCheckins returns only today's items
// 10. Favorites: add and remove
// 11. 1000+ dispatches in <200ms — NOTE: this test must call
//     sm._flushPersist() (a synchronous flush method you MUST add)
//     before measuring, otherwise the debounce timer makes timing unreliable.
// 12. Invalid action type → no crash
// 13. Null action → no crash
// 14. Streak returns 0 with no checkins
// 15. Streak counts consecutive days

// IMPORTANT: each test should call createTestSM() which clears localStorage
// and resets StateManager._instance = null for full isolation.
```

---

## VALIDATION CHECKLIST

- [ ] `StateManager.getInstance()` returns same instance on every call
- [ ] `_persist()` uses debounce — NOT called synchronously on every dispatch
- [ ] `_flushPersist()` method exists for test synchronization
- [ ] EventBus events are emitted for mapped actions (see table above)
- [ ] Dispatching ADD_TO_STACK adds item to state.stack
- [ ] Dispatching same supplement twice does NOT duplicate
- [ ] `subscribe()` fires listener after every dispatch
- [ ] `subscribe()` returns unsubscribe function that works
- [ ] `localStorage` has `suplilist-state-v4` key after flush
- [ ] Reload page → `state.stack` still populated
- [ ] Invalid action type → no error thrown
- [ ] `todayCheckins` returns only items from today's date

## FILES TO DELIVER

1. `/src/state/state-manager.js`
2. `/src/state/state-manager.test.js`
3. `/src/state/actions.js` (re-export of ACTIONS constants for convenience)
```

---

## **PROMPT 2.2: StackRecommender AI — COMPLETO**

```markdown
You are building the AI recommendation engine for SupliList v4.0.

## CONTEXT

This is NOT a simple "show popular supplements" list.
This is a clinical-grade scoring algorithm that:
- Reads the user's objective, weight, training age, budget, restrictions
- Scores each supplement by relevance + evidence level + compatibility + cost
- Returns personalized top-8 list with dosages, warnings, interactions
- Runs 100% locally (no API calls, no backend needed)
- Is fast enough to run on mobile (<100ms for 500 supplements)

## DEPENDENCY

When recommendations are ready, emit via EventBus:
  eventBus.emit('ai:recommendationsReady', { items: results, profileHash })

Import EventBus from `/src/core/event-bus.js`.

## SCORING FORMULA

score = (objective_relevance × 0.40) +
        (evidence_level     × 0.30) +
        (compatibility      × 0.20) +
        (cost_benefit       × 0.10)

All components normalized to 0.0 → 1.0

## OUTPUT CONTRACT (consumed by UI and DosageCalculator)

`recommend()` returns `Array<RecommendationResult>` where each item is:

```typescript
{
  id: string,                  // supplement ID — matches SUPPLEMENTS_DB
  name: string,
  category: string,
  score: number,               // 0.00–1.00, rounded to 2 decimal places
  evidenceLevel: 'A'|'B'|'C'|'D',
  dosage: {
    daily: number,
    unit: 'g'|'mg'|'UI',
    weekly: number,
    frequency: string,
    timing: string,
    withinSafetyLimits: boolean,
    upperLimit: number,
    rationale: string
  },
  cost: {
    perMonth: number,          // R$
    perDose: number,           // R$
    withinBudget: boolean
  },
  benefits: string[],
  warnings: string[],
  sideEffects: string[],
  interactions: Array<{ supplement: string, severity: string, message: string }>,
  timing: string,
  priority: 'HIGH'|'MEDIUM'|'LOW'
}
```

## MANDATORY SUPPLEMENT IDs IN SUPPLEMENTS_DB

The following IDs MUST exist in SUPPLEMENTS_DB with their exact string values,
because tests and the DosageCalculator reference them by ID:

  'creatina-monohidratada'
  'whey-protein'
  'cafeina'
  'vitamina-d3'
  'omega-3'
  'beta-alanina'
  'l-carnitina'
  'magnesio-bisglicinato'
  'vitamina-c'
  'ashwagandha'

Include at least these 10 entries with complete data (evidenceLevel, targets, dosage,
restrictions, interactions, contraindications, pricePerGram, safetyScore).
Add more entries to reach a realistic database. Comment `// extend to 500` at the end.

---

## TASK 1: CREATE /src/ai/stack-recommender.js

[Implement StackRecommender class with the full SUPPLEMENTS_DB (10+ mandatory entries),
EVIDENCE_WEIGHTS, OBJECTIVE_TARGETS, and all private methods: _isEligible, _calculateScore,
_scoreObjectiveRelevance, _scoreCompatibility, _scoreCostBenefit, _calculatePersonalDosage,
_getWeightMultiplier, _getDosageFrequency, _estimateMonthlyCost, _formatResult.
Also implement static profileHash(). Export SUPPLEMENTS_DB named + StackRecommender default.]

---

## TASK 2: CREATE /src/ai/stack-recommender.test.js

Test cases required (10 minimum):
1. Bulk 80kg → top 3 includes 'creatina-monohidratada' or 'whey-protein'
2. Cut 65kg → results include 'l-carnitina' or 'cafeina'
3. Lactose restriction → 'whey-protein' excluded
4. Supplement in currentStack → NOT in results
5. Budget R$100 → expensive supplements get LOW priority
6. topN=5 → returns max 5 results
7. Each result has all required fields from OUTPUT CONTRACT above
8. Evidence A supplements score higher than D for same objective
9. profileHash changes when objective changes
10. 500 mock supplements scored in <100ms

---

## VALIDATION CHECKLIST

- [ ] All 10 mandatory supplement IDs present in SUPPLEMENTS_DB
- [ ] `recommend()` returns array of 8 items by default
- [ ] `recommend()` respects `topN` parameter
- [ ] Supplement with user's restriction is excluded
- [ ] Supplement already in `currentStack` is not recommended
- [ ] Results are sorted by `score` (descending)
- [ ] Every result matches the OUTPUT CONTRACT shape exactly
- [ ] Evidence level 'A' supplements appear higher than 'D' for same objective
- [ ] 500 supplements scored in <100ms (performance)
- [ ] `profileHash()` returns different hash when profile changes
- [ ] EventBus emits 'ai:recommendationsReady' after recommend()

## FILES TO DELIVER

1. `/src/ai/stack-recommender.js`
2. `/src/ai/stack-recommender.test.js`
3. `/data/supplements-db.json` (500 entries, same structure as SUPPLEMENTS_DB)
```

---

## **PROMPT 2.3: DosageCalculator — COMPLETO**

```markdown
You are building the dosage calculator for SupliList v4.0.

## CONTEXT

Most supplement apps show a generic "take 5g of creatine".
SupliList shows: "Take 4.8g based on YOUR weight (72kg), YOUR activity (5x/week), YOUR objective (strength)."

This personalization is a key differentiator.

The calculator:
- Takes user profile + supplement object (from SUPPLEMENTS_DB)
- Returns a complete dosage schedule
- Warns if dose approaches safety limits
- Formats timing instructions in plain language
- Never exceeds safety upper limits

## DEPENDENCY

This module imports `SUPPLEMENTS_DB` from `/src/ai/stack-recommender.js` for the test file.
The calculator itself receives supplement objects — it does NOT import the DB directly.

## INPUT CONTRACT (what this module receives)

`calculate(supplement, userProfile)` receives:
- `supplement`: a single object from `SUPPLEMENTS_DB` (has `.id`, `.dosage.maintenance`,
  `.dosage.upperLimit`, `.dosage.unit`, `.dosage.loading`, `.contraindications`, etc.)
- `userProfile`: `{ weight: number, trainingFrequency: number, objective: string, age: number }`

`calculateStack(supplements, userProfile)` receives:
- `supplements`: `Array` of supplement objects from `SUPPLEMENTS_DB` (NOT RecommendationResults)
- `userProfile`: same shape as above

## OUTPUT CONTRACT (DosageResult shape — used by UI and tests)

`calculate()` returns:

```typescript
{
  daily: number,
  unit: 'g'|'mg'|'UI',
  weekly: number,
  monthly: number,
  frequency: string,
  timing: string,
  withFood: boolean,
  withWater: string | null,
  note: string | null,
  loadingProtocol: {
    dose: number,
    unit: string,
    duration: string,
    frequency: string,
    description: string
  } | null,
  withinSafetyLimits: boolean,
  upperLimit: number,
  rationale: string,
  warnings: Array<{ type: 'caution'|'info'|'warning', message: string }>,
  methodology: string
}
```

`calculateStack(supplements, userProfile)` returns:
```typescript
Array<{
  supplementId: string,
  supplementName: string,
  dosage: DosageResult
}>
```

## MANDATORY SUPPLEMENT BEHAVIORS (verified by tests)

These IDs must behave exactly as specified:
- `'creatina-monohidratada'` → weight-based, 75kg moderate → 4.5g–6.0g, has loadingProtocol (dose=20)
- `'vitamina-d3'` → fixed dose (same result for 50kg and 120kg)
- `'whey-protein'` → weight-based
- Any supplement with `dosage.loading` set → loadingProtocol must NOT be null

---

## TASK 1: CREATE /src/ai/dosage-calculator.js

[Implement DosageCalculator class with FIXED_DOSE_SUPPLEMENTS Set, WEIGHT_BASED_SUPPLEMENTS map,
ACTIVITY_MULTIPLIERS, OBJECTIVE_MULTIPLIERS, TIMING_SCHEDULES. Implement calculate(),
calculateStack(), calculateStackCost(), and private helpers _getActivityLevel, _getAgeMultiplier,
_generateWarnings, _buildRationale. Export as singleton `export default new DosageCalculator()`
AND named `export { DosageCalculator }`.]

---

## TASK 2: CREATE /src/ai/dosage-calculator.test.js

```javascript
import DosageCalculator from './dosage-calculator.js';
import { SUPPLEMENTS_DB } from './stack-recommender.js';

// Helper to get supplement by ID
function getSupp(id) {
  const s = SUPPLEMENTS_DB.find(s => s.id === id);
  if (!s) throw new Error(`Supplement '${id}' not found in SUPPLEMENTS_DB`);
  return s;
}
```

Test cases required (8 minimum):
1. Creatina 75kg moderate → daily between 4.5g and 6.0g
2. Bulk objective → higher dose than cut (same weight, same supplement)
3. Dose never exceeds upperLimit (test with weights 120, 130, 150kg)
4. Creatina has loadingProtocol with dose === 20
5. Vitamina D3 → same dose for 50kg and 120kg (fixed dose)
6. User under 18 → warnings array contains message with '18'
7. Result contains all required DosageResult fields
8. calculateStack() returns one result per supplement in input array

---

## VALIDATION CHECKLIST

- [ ] `calculate()` returns all fields from DosageResult contract
- [ ] Creatina 75kg moderate → dose between 4.5g and 6.0g
- [ ] Bulk objective produces higher dose than cut
- [ ] Dose never exceeds `supplement.dosage.upperLimit`
- [ ] Fixed-dose supplements return same dose regardless of weight
- [ ] User under 18 → generates age warning
- [ ] User with dose near upper limit → generates caution warning
- [ ] `calculateStack()` returns one result per supplement
- [ ] `loadingProtocol` is non-null when `supplement.dosage.loading` is set

## FILES TO DELIVER

1. `/src/ai/dosage-calculator.js`
2. `/src/ai/dosage-calculator.test.js`
```

---

## 📊 RESUMO DO SPRINT 2 (ATUALIZADO)

| Prompt | Arquivo Principal | Dependências | Testes mínimos |
|--------|-------------------|--------------|----------------|
| 2.0 | `event-bus.js` | nenhuma | 10 casos |
| 2.1 | `state-manager.js` | event-bus.js | 15 casos |
| 2.2 | `stack-recommender.js` | event-bus.js | 10 casos |
| 2.3 | `dosage-calculator.js` | stack-recommender.js (testes) | 8 casos |

**Após completar o Sprint 2:**
- EventBus global funcionando e testado ✅
- Estado global centralizado, reativo e com persistência com debounce ✅
- IA de recomendação clínica funcionando com banco de dados completo ✅
- Cálculo de dosagem personalizado com contratos explícitos entre módulos ✅
- Todos os módulos testados isoladamente ✅

**Próximo:** Sprint 3 — UI Components (Dashboard, StackView, CheckIn)
