# Current Architecture - SupliList

**Data**: 2026-06-02  
**Versão**: 1.0  
**Descrição**: Arquitetura, design patterns, fluxos de dados

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface Layer                 │
│  (13 Pages + Navigation + Modal + Toast)                │
│  home | list | my-stack | checkin | history | ...      │
└──────────────────┬──────────────────────────────────────┘
                   │ emits/consumes events
┌──────────────────v──────────────────────────────────────┐
│              State Management Layer                      │
│  StateManager + EventBus                                │
│  (Centralized state + Event-driven updates)             │
└──────────────────┬──────────────────────────────────────┘
                   │ uses
┌──────────────────v──────────────────────────────────────┐
│              Core System Layer                          │
│  Router | Storage | Schema | Meta | Virtual-Scroller   │
│  (Infrastructure, utilities)                            │
└──────────────────┬──────────────────────────────────────┘
                   │ tracks/feeds
┌──────────────────v──────────────────────────────────────┐
│          Analytics & Data Layer                         │
│  Analytics Engine | Event Pipeline | Metrics | Funnels │
│  (User behavior tracking & analysis)                    │
└──────────────────┬──────────────────────────────────────┘
                   │ persists to
┌──────────────────v──────────────────────────────────────┐
│           Persistence Layer                             │
│  LocalStorage + IndexedDB + Service Worker              │
│  (Data storage & offline support)                       │
└─────────────────────────────────────────────────────────┘
```

**Architecture Type**: Layered + Event-Driven  
**Scalability**: Good for medium-sized apps  
**Maintainability**: Medium (growing complexity)

---

## 📁 Directory Structure

```
src/
├── core/                    # System core
│   ├── app.js              # Entry point & initialization
│   ├── router.js           # SPA routing (lazy loading)
│   ├── nav.js              # Navigation management
│   ├── event-bus.js        # Event emitter/observer
│   ├── storage-manager.js  # Abstraction for storage
│   ├── schema-manager.js   # Data validation schemas
│   ├── meta-manager.js     # Document meta management
│   ├── virtual-scroller.js # Virtualization for lists
│   ├── mobile-keyboard-handler.js  # Keyboard detection
│   ├── mobile-utilities.js # Mobile-specific fixes
│   ├── pwa-handler.js      # PWA & service worker
│   ├── performance-monitor.js # Core Web Vitals
│   └── *.test.js           # Unit tests
│
├── pages/                   # Page components (views)
│   ├── home-page.js        # Home/landing
│   ├── list-page.js        # Supplement list
│   ├── my-stack-page.js    # User's supplement stack
│   ├── checkin-page.js     # Daily check-in
│   ├── history-page.js     # Check-in history
│   ├── favorites-page.js   # Favorites list
│   ├── calculator-page.js  # Dosage calculator
│   ├── profile-page.js     # User profile
│   ├── settings-page.js    # App settings
│   ├── faq-page.js         # FAQ
│   ├── legal-page.js       # Terms & Privacy
│   └── [others]
│
├── state/                   # State management
│   ├── state-manager.js    # Centralized state
│   └── *.test.js           # State tests
│
├── analytics/              # Analytics & tracking
│   ├── analytics-engine.js        # Main analytics
│   ├── event-pipeline.js          # Event processing
│   ├── session-tracker.js         # Session management
│   ├── metrics-aggregator.js      # Metrics collection
│   ├── funnel-engine.js           # Funnel tracking
│   ├── affiliate-tracker.js       # Affiliate tracking
│   ├── ltv-predictor.js           # LTV calculation
│   ├── analytics-health.js        # Health checks
│   ├── utils/                     # Analytics utilities
│   │   ├── event-validator.js
│   │   ├── analytics-types.js
│   │   └── crypto-utils.js
│   ├── storage/
│   │   └── analytics-storage.js
│   └── *.test.js           # Analytics tests
│
├── data/                    # Static data
│   ├── lab-reports.js      # Scientific evidence
│   └── trusted-sellers.js  # Seller information
│
├── utils/                   # Utilities & helpers
│   ├── date.js             # Date utilities
│   ├── logger.js           # Logging utility
│   ├── evidence-tier.js    # Evidence classification
│   └── [others]
│
├── css/                     # Styles
│   ├── main.css            # Global styles
│   ├── design-system.css   # Components & patterns
│   └── loading-states.css  # Loading animations
│
└── [other files]
    └── [assets, index.html, etc]

e2e/                         # E2E tests (NEW)
├── mobile-ux.spec.ts
├── playwright.config.ts
└── screenshots/

.github/
└── workflows/
    └── e2e-tests.yml       # CI/CD pipeline
```

**Assessment**: Well-organized, clear separation of concerns

---

## 🔄 Data Flow

### 1. User Interaction Flow

```
User clicks button
    ↓
Page event handler triggered
    ↓
StateManager.dispatch(action)
    ↓
State updated (immutable)
    ↓
EventBus.emit(EVENTS.CHANGED, newState)
    ↓
All listeners notified
    ↓
Page re-renders (if needed)
    ↓
Analytics tracked (async)
    ↓
Data persisted (LocalStorage/IndexedDB)
```

### 2. Analytics Flow

```
User action
    ↓
Event created with validation
    ↓
EventPipeline processes
    ↓
MetricsAggregator collects
    ↓
FunnelEngine tracks funnel steps
    ↓
AffiliateTracker tracks monetization
    ↓
LTVPredictor calculates
    ↓
Stored in analytics storage
    ↓
Health checks verify
    ↓
Ready for export/reporting
```

### 3. Page Load Flow

```
app.js loads
    ↓
CSS imported
    ↓
StateManager initialized
    ↓
EventBus set up
    ↓
Storage loaded
    ↓
Router initialized
    ↓
Performance monitor started
    ↓
PWA handler set up
    ↓
Analytics engine initialized
    ↓
Current route loaded (lazy)
    ↓
Page rendered
    ↓
Meta/SEO updated
```

---

## 🎨 Design Patterns Used

### 1. Event-Driven Architecture
```javascript
// Pattern: Observer pattern
EventBus.on(EVENTS.SUPPLEMENT_ADDED, handler)
EventBus.emit(EVENTS.SUPPLEMENT_ADDED, supplement)
```

**Used for**: State changes, user tracking, component communication

---

### 2. Lazy Loading / Code Splitting
```javascript
// Pattern: Dynamic imports
const routes = [
  { path: '/list', load: () => import('../pages/list-page.js') }
]
```

**Used for**: Routes, reducing initial bundle

---

### 3. Centralized State Management
```javascript
// Pattern: Flux-like state
StateManager.dispatch(ACTIONS.UPDATE_PROFILE, data)
// → State updates → Events emit → Persistence
```

**Used for**: User data, app state, preferences

---

### 4. Storage Abstraction
```javascript
// Pattern: Adapter pattern
StorageManager.setItem(key, value)
// → Uses LocalStorage or IndexedDB (fallback)
```

**Used for**: Data persistence, offline support

---

### 5. Virtual Scrolling
```javascript
// Pattern: Virtualization
VirtualScroller.render(data, viewportHeight)
// → Only renders visible items
```

**Used for**: Large lists (60+ supplements)

---

### 6. Pipeline Pattern
```javascript
// Pattern: Data pipeline
EventPipeline.process(event)
  .validate()
  .transform()
  .aggregate()
  .store()
```

**Used for**: Analytics event processing

---

## 🔌 Key Components & Responsibilities

### Core System Components

#### Router
```
Responsibility: SPA routing
- URL change handling
- Lazy loading pages
- History management
- Meta updates
```

#### StateManager
```
Responsibility: Centralized state
- User data management
- App preferences
- Stack (supplements)
- Check-ins history
- Persistence
```

#### EventBus
```
Responsibility: Event pub/sub
- State change events
- User action events
- Analytics events
- Component communication
```

#### StorageManager
```
Responsibility: Data persistence
- LocalStorage access
- IndexedDB fallback
- Error handling
- Encryption for sensitive data
```

---

### Page Components

```
Each page:
1. Initializes with state
2. Renders UI
3. Listens to state changes
4. Emits user events
5. Triggers analytics

Example (list-page.js):
- Load supplement list
- Render with virtual scroll
- Track filtering/sorting
- Handle favorite clicks
- Persist user filters
```

---

### Analytics System

```
Engine: Main orchestrator
  ↓
Event Pipeline: Validation & processing
  ↓
Metrics Aggregator: Collects metrics
  ↓
Funnel Engine: Tracks user journeys
  ↓
LTV Predictor: Lifetime value calc
  ↓
Storage: Persist events
  ↓
Health Checks: Verify data integrity
```

---

## 🔐 Security Architecture

### Data Protection
```
Sensitive Data:
- User weights/health info: Encrypted in storage
- Device ID: Generated locally
- User ID: Generated locally
- Events: Validated before processing

NO server communication
→ All data stored locally
→ User privacy first
```

### Validation
```
Events validated:
- Type checking
- Required fields
- Data format
- Value ranges

Schema manager enforces types
Event validator prevents invalid events
```

---

## ♿ Accessibility Architecture

### Keyboard Navigation
```
- All interactive elements tabbable
- Focus management
- Escape to close modals
- ARIA labels on inputs
```

### Mobile Accessibility
```
- 48px touch targets minimum
- High contrast colors
- 16px font minimum (iOS)
- Semantic HTML
```

### Offline First
```
- Service worker caches
- Data syncs when online
- Offline indicators
- Graceful degradation
```

---

## 📊 Complexity Analysis

### Layers Complexity
```
UI Layer:       LOW    (pages mostly simple)
State Layer:    MEDIUM (state updates complex)
Core Layer:     MEDIUM (router, storage, etc)
Analytics:      HIGH   (8 files, distributed logic)
Persistence:    LOW    (straightforward storage)
```

**Bottleneck**: Analytics system (needs consolidation)

---

## 🚀 Scalability

### Current Capacity
```
Supplements: 60+ ✅ (virtualized list handles it)
Pages: 13 ✅ (lazy loaded, manageable)
Users: Single-user ✅ (local only)
Data: ~100MB max ✅ (IndexedDB limit is 50GB)
Events: 1000+/day ✅ (aggregated locally)
```

### Scaling Considerations
```
If adding features:
- New pages: Easy (copy template)
- More supplements: No problem (virtualized)
- User accounts: Would need backend
- Social features: Would need backend + rewrite
- Monetization: Current affiliate system works
```

---

## 🔄 Dependency Graph

### Direct Dependencies
```
ExcelJS: For export functionality
Fuse.js: For search functionality

That's it! Very minimal.
```

### Dev Dependencies
```
Vite: Build tool
Vitest: Unit test runner
Playwright: E2E testing
ESLint: Code linting
Stylelint: CSS linting
```

---

## 🎯 Architecture Strengths

1. ✅ **Clear separation of concerns** - each layer has responsibility
2. ✅ **Event-driven** - loose coupling between components
3. ✅ **Offline-first** - works without server
4. ✅ **Lazy loading** - fast initial load
5. ✅ **Minimal dependencies** - easy to maintain
6. ✅ **Mobile-optimized** - designed for mobile

---

## ⚠️ Architecture Weaknesses

1. ❌ **Analytics over-engineered** - too many files for current needs
2. ❌ **No type safety** - JavaScript puro, sem tipos
3. ❌ **Limited testing** - no E2E for critical flows
4. ❌ **No server integration** - limits feature possibilities
5. ❌ **State mutations possible** - not fully immutable

---

## 🏆 Recommendations

### Short-term (This Month)
1. Consolidate analytics system
2. Add JSDoc types
3. Increase test coverage
4. Document data flows

### Medium-term (This Quarter)
1. Consider TypeScript migration
2. Refactor state to fully immutable
3. Add more E2E tests
4. Performance optimization

### Long-term (This Year)
1. Consider server-side user accounts
2. Backend for sync/sharing
3. Advanced analytics
4. Monetization expansion

---

## 📚 Design Documents

### External References
- CODEBASE_HEALTH_REPORT.md - Overall health
- CODE_QUALITY_METRICS.md - Metrics & numbers
- TECHNICAL_DEBT_AUDIT.md - Debt & fixes
- DEVELOPMENT_STANDARDS.md - Code standards (next step)

---

**Architecture Assessment**: 🟡 GOOD (7/10)

The architecture is well-thought and suitable for the app's current scope. Main weakness is analytics over-engineering. Ready for continued development with planned refactoring.

---

**Document**: Current Architecture  
**Generated**: 2026-06-02  
**Status**: ✅ COMPLETE
