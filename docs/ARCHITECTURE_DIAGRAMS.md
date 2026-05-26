# SupliList — DIAGRAMAS DE ARQUITETURA
## Visualização dos Fluxos de Dados e Componentes

---

## 1️⃣ CAMADAS DE ARQUITETURA

```
┌─────────────────────────────────────────────────────────────┐
│                    UI LAYER (Components)                      │
│   ┌──────────────┬──────────────┬──────────────────────────┐  │
│   │ supplement   │  favorites   │  inventory               │  │
│   │ -list        │  -page       │  -tracker                │  │
│   └──────────────┴──────────────┴──────────────────────────┘  │
│                                                                 │
│   ┌──────────────┬──────────────┬──────────────────────────┐  │
│   │ toast        │  skeleton    │  error-card              │  │
│   └──────────────┴──────────────┴──────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│               FEATURES LAYER (Business Logic)                  │
│   ┌──────────────┬──────────────┬──────────────────────────┐  │
│   │ supplements  │  favorites   │  inventory               │  │
│   │ -service     │  -repo       │  -repo                   │  │
│   └──────────────┴──────────────┴──────────────────────────┘  │
│                                                                 │
│   ┌──────────────┬──────────────┬──────────────────────────┐  │
│   │ comparator   │  settings    │  interactions-db         │  │
│   │ -service     │  -repo       │                          │  │
│   └──────────────┴──────────────┴──────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                 CORE LAYER (Brain & Heart)                     │
│   ┌──────────────┬──────────────┬──────────────────────────┐  │
│   │ eventBus     │ stateManager │ error-boundary           │  │
│   │ (Pub/Sub)    │ (State)      │ (Error Handling)         │  │
│   └──────────────┴──────────────┴──────────────────────────┘  │
│                                                                 │
│   ┌──────────────┬──────────────┬──────────────────────────┐  │
│   │ supplement   │ appState     │ events                   │  │
│   │ .schema      │ .schema      │ .schema                  │  │
│   └──────────────┴──────────────┴──────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   UTILS & DATA                                 │
│   ┌──────────────┬──────────────┬──────────────────────────┐  │
│   │ logger       │  formatters  │  validators              │  │
│   │ constants    │  parsers     │  supplements.json        │  │
│   └──────────────┴──────────────┴──────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                  PERSISTENCE                                   │
│        localStorage (state:app) ← → JSON Storage              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ FLUXO DE DADOS: DO USUÁRIO AO ESTADO

```
USER ACTION
    │
    ├─────────────────────────────────────────────┐
    │                                              │
    ▼                                              │
┌─────────────┐                                    │
│   Click on  │                                    │
│  ❤️ Button  │                                    │
└─────────────┘                                    │
    │                                              │
    ▼                                              │
┌─────────────────────────────────────────────┐   │
│  supplement-list.js (Event Delegation)      │   │
│  - Detects click via e.target.closest()    │   │
│  - Extracts supplementId from data-attr     │   │
│  - Calls favoritesRepo.toggle(id)          │   │
└─────────────────────────────────────────────┘   │
    │                                              │
    ▼                                              │
┌─────────────────────────────────────────────┐   │
│  favoritesRepo.toggle(supplementId)         │   │
│  - Reads current state.favorites            │   │
│  - Adds/removes supplementId                │   │
│  - Calls stateManager.setState()            │   │
└─────────────────────────────────────────────┘   │
    │                                              │
    ▼                                              │
┌─────────────────────────────────────────────┐   │
│  stateManager.setState('favorites', [....]) │   │
│  - Deep clone current state                 │   │
│  - Update favorites array                   │   │
│  - Validate with AppStateSchema.validate()  │   │
│  - Save to localStorage                     │   │
│  - Emit 'state:changed' event              │   │
└─────────────────────────────────────────────┘   │
    │                                              │
    ▼                                              │
┌─────────────────────────────────────────────┐   │
│  eventBus.emit('state:changed', {....})     │   │
│  - Validate payload                         │   │
│  - Record in history                        │   │
│  - Call all subscribers                     │   │
└─────────────────────────────────────────────┘   │
    │                              ▲              │
    │              ┌───────────────┴──────────────┤
    │              │                              │
    ▼              ▼                              │
┌──────────┐  ┌──────────────┐  ┌─────────────┐  │
│supplement│  │ favorites    │  │   toast     │  │
│-card.js  │  │ -page.js     │  │   .js       │  │
│(Update   │  │(Re-render    │  │(Show "Added│  │
│heart)    │  │list)         │  │ to favs")  │  │
└──────────┘  └──────────────┘  └─────────────┘  │
    │              │                  │          │
    │              │                  │          │
    └──────────┬───┴──────────────────┘          │
               │                                  │
               └──────────────────────────────────┘
                   All in <100ms
```

---

## 3️⃣ CICLO DE VIDA DO ESTADO

```
┌────────────────────────────────────────────────────────────┐
│                  APP INITIALIZATION                          │
└────────────────────────────────────────────────────────────┘
    │
    ├─ 1. Load from localStorage
    │       ├─ Parse JSON
    │       └─ Validate with AppStateSchema
    │
    ├─ 2. Validate Fails?
    │       └─ Use FallbackState from fallback-state.json
    │
    ├─ 3. Load Master Supplement DB
    │       └─ Parse supplements.json
    │
    ├─ 4. Initialize Features
    │       ├─ supplementRepo.loadAll()
    │       ├─ favoritesRepo.init()
    │       └─ inventoryRepo.init()
    │
    └─ 5. Mount Components
            ├─ supplement-list.js
            ├─ favorites-page.js
            ├─ comparator-modal.js
            └─ toast.js


DURING APP RUNTIME
┌────────────────────────────────────────────────────────────┐
│ User Action → Feature Layer → State Update → Event Emit     │
│           ↓                                      ↓           │
│    stateManager.setState()            Subscribers notified  │
│           ↓                                      ↓           │
│    localStorage.setItem()        Components re-render only  │
│           ↓                       affected parts (not full)  │
│    emit 'state:changed'                                     │
└────────────────────────────────────────────────────────────┘


ON PAGE UNLOAD / BROWSER CLOSE
┌────────────────────────────────────────────────────────────┐
│ eventBus cleanup → Component cleanup → Window.unload        │
│ State persisted in localStorage (automatic)                 │
└────────────────────────────────────────────────────────────┘
```

---

## 4️⃣ MAPA DE EVENTOS (Pub/Sub Network)

```
                           ┌─────────────────┐
                           │    eventBus     │
                           │   (Singleton)   │
                           └─────────────────┘
                                  │
                 ┌────────────────┬┴───────────────┐
                 │                │                │
                 ▼                ▼                ▼
        
    PRODUCERS               SUBSCRIBERS           CONSUMERS
    ─────────              ─────────────           ──────────
    
    ┌─────────────┐        ┌─────────────┐       ┌──────────┐
    │ Feature:    │───────▶│ "state:     │──────▶│  All UI  │
    │ State       │        │  changed"   │       │Components│
    │ changes     │        └─────────────┘       └──────────┘
    └─────────────┘
    
    ┌─────────────┐        ┌─────────────┐       ┌──────────┐
    │ Feature:    │───────▶│ "supplement"│──────▶│  List,   │
    │ Add to      │        │ :changed"   │       │Detail    │
    │ favorites   │        └─────────────┘       └──────────┘
    └─────────────┘
    
    ┌─────────────┐        ┌─────────────┐       ┌──────────┐
    │ Feature:    │───────▶│ "inventory: │──────▶│Inventory,│
    │ Update qty  │        │ updated"    │       │Alerts    │
    └─────────────┘        └─────────────┘       └──────────┘
    
    ┌─────────────┐        ┌─────────────┐       ┌──────────┐
    │ User:       │───────▶│ "favorite:  │──────▶│ Toast    │
    │ Click       │        │ toggled"    │       │          │
    └─────────────┘        └─────────────┘       └──────────┘
    
    ┌─────────────┐        ┌─────────────┐       ┌──────────┐
    │ Component:  │───────▶│ "component: │──────▶│ Logger,  │
    │ Error       │        │ error"      │       │Analytics │
    └─────────────┘        └─────────────┘       └──────────┘


ALL EVENTS VALIDATE PAYLOAD AGAINST events.schema.js
ALL HANDLERS WRAPPED IN TRY/CATCH → emit 'error:system'
```

---

## 5️⃣ FLUXO DE RENDER: Component Puro → DOM

```
supplement-list.js (Container)
│
├─ Mount: addEventListener (event delegation)
├─ Subscribe: eventBus.on('supplements:filtered', rerender)
│
└─ When user searches:
    │
    ├─ Emit 'supplements:filtered' event
    │       ↓
    │ payload = { query, filters, results[], count }
    │
    ├─ EVENT DELEGATION HANDLER FIRES:
    │   - Gets results from payload
    │   - Calls skeleton.render(6, container)
    │   - CLEARS container.innerHTML = ''
    │   - FOR EACH supplement in results:
    │
    ├─ FOR EACH supplement:
    │   │
    │   ├─ Call supplement-card.js:SupplementCard()
    │   │       ↓
    │   │   ErrorBoundary.wrap(createCard, 'SupplementCard')()
    │   │       ↓
    │   │   try {
    │   │     element = createCardHTML(supplement)
    │   │     return element
    │   │   } catch (err) {
    │   │     return ErrorBoundary._renderErrorState()
    │   │   }
    │   │
    │   ├─ Returns HTMLElement (not attached)
    │   │
    │   └─ container.appendChild(element)
    │
    ├─ skeleton.clear(container)
    │
    └─ Done! UI updated reactively
```

---

## 6️⃣ SEGURANÇA: VALIDAÇÃO EM 3 CAMADAS

```
┌──────────────────────────────────────────┐
│  LAYER 1: Input Validation (Component)   │
│  ─────────────────────────────────────   │
│  - User input from form                  │
│  - Validators.isValidSlug(), etc         │
│  - Reject invalid early                  │
│  - Toast error to user                   │
└──────────────────────────────────────────┘
    │ If valid
    ▼
┌──────────────────────────────────────────┐
│  LAYER 2: Schema Validation (Feature)    │
│  ─────────────────────────────────────   │
│  - SupplementSchema.validate(data)       │
│  - AppStateSchema.validate(state)        │
│  - Normalize & standardize               │
│  - Reject if schema fails                │
│  - Emit error:system event               │
└──────────────────────────────────────────┘
    │ If valid
    ▼
┌──────────────────────────────────────────┐
│  LAYER 3: State Commit (StateManager)    │
│  ─────────────────────────────────────   │
│  - Final validation before setState()    │
│  - Atomic write to localStorage          │
│  - If fail: rollback + emit error        │
│  - If success: emit state:changed        │
└──────────────────────────────────────────┘


Result: No invalid data enters the system
```

---

## 7️⃣ ERROR BOUNDARIES: Isolação de Falhas

```
┌─────────────────────────────────────────────────────────┐
│ AppState (valid + immutable)                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────────────┐   ┌──────────────────────┐   │
│ │ SupplementCard.js    │   │ FavoritesPage.js     │   │
│ │                      │   │                      │   │
│ │ try {                │   │ try {                │   │
│ │  renderCard()        │   │  renderList()        │   │
│ │ } catch (err) {      │   │ } catch (err) {      │   │
│ │  return ErrorCard    │   │  return ErrorCard    │   │
│ │ }                    │   │ }                    │   │
│ │                      │   │                      │   │
│ │ ✅ Safe: renders     │   │ ✅ Safe: renders     │   │
│ │    error card only   │   │    error card only   │   │
│ │    REST of page OK   │   │    REST of page OK   │   │
│ └──────────────────────┘   └──────────────────────┘   │
│                                                          │
│ ┌──────────────────────┐   ┌──────────────────────┐   │
│ │ ComparatorModal.js   │   │ InventoryTracker.js  │   │
│ │                      │   │                      │   │
│ │ try {                │   │ try {                │   │
│ │  renderModal()       │   │  renderTracker()     │   │
│ │ } catch (err) {      │   │ } catch (err) {      │   │
│ │  return ErrorCard    │   │  return ErrorCard    │   │
│ │ }                    │   │ }                    │   │
│ └──────────────────────┘   └──────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
        ↓
        Each error emits 'component:error' event
        → Logger.error()
        → Analytics (optional)
        → But PAGE KEEPS WORKING!
```

---

## 8️⃣ MEMORY MANAGEMENT: Zero Leaks

```
┌────────────────────────────────────────────┐
│  COMPONENT LIFECYCLE                       │
├────────────────────────────────────────────┤
│                                            │
│  Mount:                                   │
│  const unsubscribe = eventBus.on(...)     │
│  container.addEventListener(handler)      │
│                                            │
│  (Component renders based on events)       │
│                                            │
│  Unmount (Cleanup):                        │
│  unsubscribe()              ✅ Remove     │
│  container.removeEventListener(handler) ✅ │
│                                            │
│  No orphaned listeners!                    │
│  No memory leaks!                          │
└────────────────────────────────────────────┘
```

---

## 9️⃣ PERFORMANCE: Reactive Rendering

```
┌────────────────────────────────────────────┐
│  BEFORE: Full Re-render (❌ Slow)         │
├────────────────────────────────────────────┤
│                                            │
│  User clicks favorite                      │
│    ↓                                       │
│  Re-render ENTIRE list                     │
│    ↓                                       │
│  1000 cards → 1000 DOM operations          │
│    ↓                                       │
│  300ms ⏳ (bad for UX)                     │
│                                            │
└────────────────────────────────────────────┘


┌────────────────────────────────────────────┐
│  AFTER: Surgical Re-render (✅ Fast)      │
├────────────────────────────────────────────┤
│                                            │
│  User clicks favorite                      │
│    ↓                                       │
│  stateManager.setState('favorites', [...]) │
│    ↓                                       │
│  eventBus.emit('state:changed', {          │
│    path: 'favorites',                      │
│    ...                                     │
│  })                                        │
│    ↓                                       │
│  Only 2 subscribers care:                  │
│    - supplement-card: update 1 icon       │
│    - favorites-page: add to list          │
│    ↓                                       │
│  2 DOM operations                          │
│    ↓                                       │
│  16ms ⚡ (60fps)                           │
│                                            │
└────────────────────────────────────────────┘
```

---

## 🔟 DATA FLOW: Search Example (End-to-End)

```
USER TYPES "creatina" IN SEARCH BOX
    │
    ▼
event.target.addEventListener('input', handleSearch)
    │
    ├─ Get query text: "creatina"
    ├─ Get current filters from state
    │   filters = {
    │     categories: ['Aminoácido'],
    │     maxPrice: 50
    │   }
    │
    ▼
supplementService.search({
  query: 'creatina',
  filters: {...},
  sortBy: 'cost'
})
    │
    ├─ supplementRepo.search('creatina')
    │   └─ Returns: [Creatina Mono, Creatina CEE, ...]
    │
    ├─ supplementRepo.filter(results, filters)
    │   └─ Returns: [Creatina Mono] (CEE > maxPrice)
    │
    ├─ supplementRepo.sort(results, 'cost')
    │   └─ Returns: [Creatina Mono]
    │
    ├─ Cache result in state.lastQuery
    │   stateManager.setState('lastQuery', {
    │     text: 'creatina',
    │     filters: {...},
    │     results: ['creatina-mono'],
    │     timestamp: 1234567890
    │   })
    │       ↓
    │   Emits 'state:changed' event
    │
    ▼
eventBus.emit('supplements:filtered', {
  query: 'creatina',
  filters: {...},
  results: [supplementObject],
  count: 1
})
    │
    ├─────────────────────────────────────┐
    │                                      │
    ▼                                      ▼
supplement-list.js               toast.js
(listening to                    (listening to
'supplements:filtered')           'supplements:filtered')
    │                                │
    ├─ Render skeleton                ├─ Show "1 resultado"
    ├─ Create cards via              │
    │  SupplementCard()              │
    ├─ Append to DOM                 │
    ├─ Clear skeleton                │
    │                                │
    └─ UI updated! ✅                └─ Toast shown! ✅


TOTAL TIME: ~50ms
DOM OPERATIONS: ~3
Components affected: 2
"""
