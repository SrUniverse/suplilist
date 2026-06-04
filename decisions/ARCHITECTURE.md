# SupliList v4.0 — Architecture Guide

## Overview

SupliList is a **100% offline-first, progressive web app** for Brazilian supplement shopping, dosage calculation, and adherence tracking. Built with vanilla JavaScript (no frameworks), it prioritizes performance, privacy, and no-authentication simplicity.

**Core principle:** All data stays on the user's device. No cloud sync. No registration. No tracking.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / PWA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Pages (UI Layer)                                        │   │
│  │  ├─ HomePage (marketing)                                 │   │
│  │  ├─ ListPage (catalog search/filter)                     │   │
│  │  ├─ CalculatorPage (dosage)                              │   │
│  │  ├─ MyStackPage (user's supplements)                     │   │
│  │  ├─ CheckinPage (daily tracking)                         │   │
│  │  ├─ HistoryPage (analytics + premium)                    │   │
│  │  ├─ ProfilePage (user settings)                          │   │
│  │  ├─ FavoritesPage (saved supplements)                    │   │
│  │  ├─ SettingsPage (app config)                            │   │
│  │  └─ LegalPage (terms, privacy, medical)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↑                                    │
│                              │ dispatch() / emit()               │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Core Systems (Middleware Layer)                         │   │
│  │  ├─ Router (client-side navigation)                      │   │
│  │  ├─ StateManager (reactive state)                        │   │
│  │  ├─ EventBus (pub/sub event dispatch)                    │   │
│  │  ├─ AnalyticsEngine (telemetry)                          │   │
│  │  │  ├─ EventPipeline (capture → validate → dedupe)       │   │
│  │  │  ├─ SessionTracker (idle, duration)                   │   │
│  │  │  └─ MetricsAggregator (DAU/WAU/MAU, retention)        │   │
│  │  └─ StorageManager (LocalStorage/IndexedDB)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↑                                    │
│                              │ (async queries, mutations)        │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Data Layer                                              │   │
│  │  ├─ LocalStorage (user stack, checkins, settings)        │   │
│  │  ├─ IndexedDB (analytics events, archives)               │   │
│  │  └─ SUPPLEMENTS_DB (embedded catalog, 100+ items)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── index.html                    # Entry point
├── app.js                         # Main app coordinator
├── pages/                         # Page components (11 pages)
│   ├── home-page.js
│   ├── list-page.js
│   ├── calculator-page.js
│   ├── my-stack-page.js
│   ├── checkin-page.js
│   ├── history-page.js
│   ├── profile-page.js
│   ├── favorites-page.js
│   ├── settings-page.js
│   ├── faq-page.js
│   ├── legal-page.js
│   └── onboarding-page.js
├── core/                         # System components
│   ├── router.js                 # Client-side navigation
│   ├── event-bus.js              # PubSub event system
│   ├── app.js                    # App lifecycle
│   ├── storage-manager.js        # LocalStorage wrapper
│   ├── schema-manager.js         # Structured data (JSON-LD)
│   ├── meta-manager.js           # SEO metadata
│   ├── performance-monitor.js    # Perf tracking
│   ├── virtual-scroller.js       # Large list virtualization
│   ├── pwa-handler.js            # Service worker registration
│   ├── mobile-keyboard-handler.js
│   ├── mobile-utilities.js
│   └── nav.js                    # Navigation helpers
├── state/                        # State management
│   └── state-manager.js          # Reactive state store
├── analytics/                    # Analytics subsystems
│   ├── analytics-engine.js       # Main orchestrator
│   ├── event-pipeline.js         # Event capture → validate → dedupe
│   ├── session-tracker.js        # Session lifecycle
│   ├── metrics-aggregator.js     # DAU/WAU/MAU, retention, LTV
│   ├── funnel-engine.js          # Conversion funnels
│   ├── affiliate-tracker.js      # Marketplace affiliate tracking
│   ├── ltv-predictor.js          # Customer lifetime value
│   ├── analytics-health.js       # Health checks
│   ├── storage/
│   │   └── analytics-storage.js  # IndexedDB for events
│   └── utils/
│       ├── event-validator.js    # Event schema validation
│       ├── crypto-utils.js       # Session ID generation
│       └── analytics-types.js    # TypeDefs
├── features/                     # Feature modules
│   ├── premium/                  # Premium tier gates
│   │   └── checkout-modal.js
│   ├── sharing/                  # Share stack (QR, links)
│   │   ├── share-service.js
│   │   └── qr-generator.js
│   ├── notifications/            # Push notifications
│   │   └── notification-service.js
│   └── search/                   # Full-text search
├── ai/                           # ML/calculation
│   ├── dosage-calculator.js      # Personalized dosage
│   └── stack-recommender.js      # Stack recommendations
├── monetization/                 # Affiliate & business logic
│   ├── affiliate.config.js       # Amazon/ML/Shopee URLs
│   └── affiliate-engine.js       # Commission tracking
├── data/                         # Embedded databases
│   ├── trusted-sellers.js        # Verified seller list
│   ├── lab-reports.js            # Supplement test data
│   └── (auto-imported as SUPPLEMENTS_DB)
├── utils/                        # Utilities
│   ├── logger.js                 # Structured logging
│   ├── escape.js                 # XSS prevention
│   ├── date.js                   # Date helpers
│   ├── dosage-converter.js       # Unit conversion
│   ├── evidence.js               # Evidence tier scoring
│   ├── evidence-tier.js          # Tier definitions
│   └── stack.js                  # Stack operations
├── config/                       # Configuration
│   └── constants.js              # App-wide constants
└── (tests)
    └── *.test.js                 # Jest unit tests
```

---

## Key Systems & Design Patterns

### 1. **Router (Client-Side Navigation)**

**File:** `src/core/router.js`

Handles browser history and page switching without HTTP requests.

```javascript
// Listen to navigation
window.addEventListener('popstate', () => {
  const path = window.location.pathname;
  router.navigate(path);
});

// Programmatic navigation
router.navigate('/list');  // Updates window.history and renders page
```

**Events emitted:**
- `route:change` — fired when route changes
- `route:beforeLeave` — fired before unmounting old page

---

### 2. **EventBus (Pub/Sub)**

**File:** `src/core/event-bus.js`

Central event dispatcher. All components communicate via events, never direct calls.

```javascript
// Publish
eventBus.emit('user:stackUpdated', { stackId: '123' });

// Subscribe
eventBus.on('user:stackUpdated', (payload) => {
  console.log('Stack updated:', payload);
});

// Wildcard
eventBus.on('*', (eventName, payload) => {
  console.log(`Any event: ${eventName}`, payload);
});
```

**Event categories:**
- `user:*` — User profile, stack changes
- `checkin:*` — Daily adherence tracking
- `app:*` — App lifecycle (startup, shutdown)
- `ui:*` — Modal, toast, loading states
- `analytics:*` — Internal analytics events
- `premium:*` — Premium feature gates

---

### 3. **StateManager (Reactive State)**

**File:** `src/state/state-manager.js`

Single source of truth for app state. Immutable updates trigger subscribers.

```javascript
// Get state
const user = stateManager.getState().user;

// Update (immutable)
stateManager.dispatch({
  type: 'SET_USER_PROFILE',
  payload: { name: 'João', age: 35 }
});

// Subscribe
stateManager.subscribe('user.profile', (newProfile) => {
  console.log('Profile changed:', newProfile);
});
```

**State shape:**
```javascript
{
  user: {
    id: 'uuid',
    profile: { name, age, weight, goals },
    stack: [ { supplementId, dosage, frequency } ],
    checkins: [ { date, supplementIds } ],
    favorites: [ supplementIds ],
    settings: { theme, language, notifications }
  },
  ui: {
    currentPage: '/list',
    modals: { checkout, premiumLock },
    toasts: []
  },
  premium: {
    unlocked: false,
    purchasedDate: timestamp
  }
}
```

---

### 4. **Analytics Engine (Telemetry)**

**File:** `src/analytics/analytics-engine.js`

Orchestrates all analytics subsystems. **Privacy-first:** no PII, no server sync.

#### **EventPipeline** (`src/analytics/event-pipeline.js`)
- Captures all EventBus events
- Validates schema
- Deduplicates (in-memory 1K cache)
- Sanitizes (strips PII)
- Batches to IndexedDB (10-event batches, 100ms timeout)

#### **SessionTracker** (`src/analytics/session-tracker.js`)
- Tracks user session lifecycle
- Records idle timeout (30 min)
- Emits `analytics:sessionEnded` on unload

#### **MetricsAggregator** (`src/analytics/metrics-aggregator.js`)
- Calculates DAU/WAU/MAU from unique sessionIds
- Retention curves (D1, D7, D14, D30, D60, D90)
- Affiliate performance (Amazon/ML/Shopee commission tracking)
- Customer LTV estimation

**Public API:**
```javascript
const engine = analyticsEngine;

// Usage metrics
await engine.getDAU('2024-01-15');         // Unique users that day
await engine.getWAU(0);                    // Current week
await engine.getMAU(0);                    // Current month

// Retention
await engine.getRetention('2024-01-01', 7); // Day 7 retention cohort

// Funnels (signup → add supplement → checkin)
await engine.analyzeFunnel('onboarding', '2024-01-01', '2024-01-31');

// Affiliate
await engine.getAffiliateStats('amazon', '2024-01-01', '2024-01-31');

// Health
await engine.getHealthStatus();            // Detailed system status
```

---

### 5. **Storage Architecture**

#### **LocalStorage** (sync, small)
```javascript
// User data
localStorage['user:profile'] = JSON.stringify(profile);
localStorage['user:stack'] = JSON.stringify(stack);
localStorage['user:checkins'] = JSON.stringify(checkins);
localStorage['user:settings'] = JSON.stringify(settings);
localStorage['user:favorites'] = JSON.stringify(favoriteIds);

// Session cache
localStorage['session:currentSessionId'] = sessionId;
localStorage['search:history'] = JSON.stringify(recentSearches);
```

**Max capacity:** ~10 MB (browser-dependent)

#### **IndexedDB** (async, large)
```javascript
// Analytics events (unbounded)
db.events.add({
  eventId, eventName, payload, sessionId, userId,
  timestamp, url, userAgent, device
});

// Archived sessions
db.sessions.add({ sessionId, startTime, endTime, duration, eventCount });
```

**Max capacity:** 50+ MB (browser quota)

#### **Embedded Data**
```javascript
import { SUPPLEMENTS_DB } from './data/supplements.js';
// 100+ items: { id, name, category, dosage, evidence, pricePerGram, stores }
```

---

## Data Flow: User Adds Supplement to Stack

```
User clicks "Add to Stack" (UI)
        ↓
    Page emits: eventBus.emit('stack:updated', { supplementId })
        ↓
    [StateManager] updates: state.user.stack.push(supplement)
        ↓
    [StorageManager] persists to localStorage
        ↓
    [EventPipeline] captures 'stack:updated' event
        ↓
    [SessionTracker] records activity, resets idle timer
        ↓
    [Page component] receives stateManager update, re-renders UI
        ↓
    User sees "Added ✓"
```

---

## Data Flow: Page Loads

```
1. app.js initializes:
   - router.init()
   - stateManager.init() → loads from localStorage
   - analyticsEngine.init() → starts EventPipeline + SessionTracker

2. router navigates to /list
   - calls router.navigate('/list')
   - unmounts old page (calls unmount())
   - mounts ListPage (calls mount())

3. ListPage.mount():
   - _injectStyle() → inserts CSS
   - _render() → generates HTML from template
   - _attachListeners() → binds click handlers
   - listens to eventBus for state changes

4. User interacts:
   - eventBus.emit('...') → StateManager updates → Pages re-render
   - EventPipeline captures → stores in IndexedDB
```

---

## Premium Features (Gated)

**Premium gates:**
- History page: 30-day heatmap, trend sparklines, Excel export
- Profile: Advanced biometrics, custom dosage overrides
- Notifications: Push reminders for checkins

**Implementation:**
```javascript
if (stateManager.getState().premium.unlocked) {
  // Render premium features
} else {
  // Show lock icon + CheckoutModal
}
```

---

## Offline-First Design

✅ **Works completely offline:**
- All data cached on device
- No HTTP requests to server (except optional analytics opt-in)
- Service worker caches app shell + styles
- IndexedDB persists events indefinitely

✅ **Privacy guarantees:**
- No user tracking (no 3rd-party pixels)
- No PII in analytics (stripped by EventValidator)
- Optional telemetry (can be disabled)
- LGPD-compliant data export

---

## Component Lifecycle

### Page Component

```javascript
class MyPage {
  constructor(container) {
    this.container = container;
  }

  mount() {
    // 1. Inject styles
    // 2. Render DOM
    // 3. Bind event listeners
    // 4. Subscribe to state changes
  }

  unmount() {
    // 1. Remove event listeners
    // 2. Clear DOM
    // 3. Unsubscribe from state
  }

  _onStateChange(newState) {
    // Re-render affected parts
  }
}
```

**Mounting sequence:**
```
new MyPage(container) → mount() → (listens to events) → (user interacts) → unmount()
```

---

## Error Handling & Logging

**Logger** (`src/utils/logger.js`):
```javascript
logger.info('[Module] Message');    // Info
logger.warn('[Module] Warning');    // Warning
logger.error('[Module] Error:', err); // Error with stack

// Async buffer (for health checks)
logger.getMetrics() → { errors: 5, warnings: 12, piiDetections: 0 }
```

**Error boundaries:**
- EventPipeline: catches validation errors, increments stats
- StateManager: prevents bad mutations
- Pages: try-catch in event handlers

---

## Performance Optimizations

1. **Virtual Scrolling** (`src/core/virtual-scroller.js`)
   - Renders only visible rows (List page: 500+ items → 20 visible)

2. **Event Batching** (EventPipeline)
   - Buffers 10 events before IndexedDB flush

3. **CSS-in-JS**
   - Styles injected once per page, cached in browser

4. **Debounced Search**
   - ListPage filters on input with 300ms debounce

5. **Lazy Component Loading**
   - Pages mounted on-demand, not all at startup

---

## Testing

**Jest unit tests** for:
- Router state transitions
- StateManager mutations
- EventBus dispatch
- EventPipeline validation & dedup
- Dosage calculations
- Analytics metrics (DAU/WAU/MAU)

**E2E tests** (Playwright):
- User adds supplement → checkin → view history

---

## Deployment

1. **Build:** (no build step, vanilla JS)
2. **Deploy:** Static files to CDN or GitHub Pages
3. **Service Worker:** Automatic via `pwa-handler.js`
4. **Analytics:** Stored locally in IndexedDB, optional cloud sync (future)

---

## Future Extensions

- **Cloud Sync:** Optional Firebase for data backup (user opt-in)
- **Social:** Share stacks as QR codes or links (already implemented)
- **AI:** Stack recommendations based on goals (in progress)
- **Monetization:** Affiliate commissions (tracked locally)

---

## Key Decision Records (ADRs)

| Decision | Rationale |
|----------|-----------|
| **Vanilla JS (no framework)** | Smaller bundle, offline-first easier, full control |
| **IndexedDB for analytics** | Supports 50+ MB, async, survives browser restart |
| **EventBus for all communication** | Loose coupling, easy testing, clear data flow |
| **localStorage for user data** | Sync, fast, sufficient for 100 supplements + 365 checkins |
| **CSS-in-JS (injected)** | Dynamic styles per page, easier scoping |
| **No user registration** | LGPD compliance, lower friction, privacy |

---

## Contact & Contribution

See `CONTRIBUTING.md` for code style, test coverage, and PR guidelines.
