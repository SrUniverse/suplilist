# SupliList v4.0 — API Reference

## Overview

SupliList exposes a public API through **singletons** available globally. All APIs are **synchronous** except where marked `async`. No HTTP requests—all data is local.

---

## Core Systems

### Router

**Module:** `src/core/router.js`

Navigate between pages client-side without full page reload.

#### `router.navigate(path: string): void`

Navigate to a page path.

```javascript
import { router } from './src/core/router.js';

router.navigate('/list');
router.navigate('/my-stack');
router.navigate('/checkin');
```

**Valid paths:**
- `/home` — Marketing landing page
- `/list` — Supplement catalog
- `/list?objective=Hipertrofia` — Filtered catalog
- `/calculator` — Dosage calculator
- `/my-stack` — User's supplement stack
- `/checkin` — Daily adherence tracking
- `/history` — Analytics & premium features
- `/profile` — User profile settings
- `/favorites` — Saved supplements
- `/settings` — App configuration
- `/faq` — FAQ page
- `/legal?doc=termos` — Legal documents
- `/onboarding` — First-time setup

#### `router.getCurrentPath(): string`

Get current page path.

```javascript
const path = router.getCurrentPath();  // '/list'
```

#### `router.back(): void`

Navigate to previous page (like browser back button).

```javascript
router.back();
```

---

### EventBus

**Module:** `src/core/event-bus.js`

Publish/subscribe event system for all component communication.

#### `eventBus.emit(eventName: string, payload?: any): void`

Emit an event.

```javascript
import { eventBus } from './src/core/event-bus.js';

eventBus.emit('user:stackUpdated', {
  supplementId: 'creatine',
  dosage: '5g',
  frequency: 'daily'
});
```

#### `eventBus.on(eventName: string, callback: (payload) => void): void`

Listen to events. Use `'*'` for all events.

```javascript
// Specific event
eventBus.on('user:stackUpdated', (payload) => {
  console.log('Stack updated:', payload);
});

// All events
eventBus.on('*', (eventName, payload) => {
  console.log(`Event: ${eventName}`, payload);
});
```

#### `eventBus.off(eventName: string, callback: Function): void`

Remove event listener.

```javascript
const handler = (payload) => { /* ... */ };
eventBus.on('user:stackUpdated', handler);
eventBus.off('user:stackUpdated', handler);
```

#### `eventBus.once(eventName: string, callback: Function): void`

Listen to event only once, then auto-unsubscribe.

```javascript
eventBus.once('app:ready', () => {
  console.log('App is ready!');
  // This fires only once
});
```

**Built-in events:**
| Event | Payload | When |
|-------|---------|------|
| `user:profileUpdated` | `{ profile }` | User changes name/age/weight |
| `user:stackUpdated` | `{ supplementId, dosage }` | Stack added/removed |
| `checkin:logged` | `{ date, supplementIds }` | User checks in |
| `premium:unlocked` | `{ purchaseDate }` | Premium purchased |
| `app:ready` | `{ sessionId }` | App initialized |
| `route:change` | `{ path }` | Page navigation |

---

### StateManager

**Module:** `src/state/state-manager.js`

Centralized immutable state store with reactive subscriptions.

#### `stateManager.getState(): Object`

Get current app state (read-only).

```javascript
import { stateManager } from './src/state/state-manager.js';

const state = stateManager.getState();

// Access user data
state.user.profile;        // { name, age, weight, goals }
state.user.stack;          // [ { supplementId, dosage, frequency } ]
state.user.checkins;       // [ { date, supplementIds } ]
state.user.favorites;      // [ supplementIds ]
state.user.settings;       // { theme, language, notifications }

// Access premium state
state.premium.unlocked;    // boolean
state.premium.purchaseDate; // timestamp

// Access UI state
state.ui.currentPage;      // '/list'
state.ui.modals;           // { checkout, premiumLock }
```

#### `stateManager.dispatch(action: { type: string, payload: any }): void`

Update state (immutably). Triggers subscribers and persists to localStorage.

```javascript
// Update user profile
stateManager.dispatch({
  type: 'SET_USER_PROFILE',
  payload: { name: 'João', age: 35, weight: 80 }
});

// Update user stack
stateManager.dispatch({
  type: 'ADD_SUPPLEMENT',
  payload: { supplementId: 'creatine', dosage: '5g', frequency: 'daily' }
});

// Remove from stack
stateManager.dispatch({
  type: 'REMOVE_SUPPLEMENT',
  payload: { supplementId: 'creatine' }
});

// Log checkin
stateManager.dispatch({
  type: 'LOG_CHECKIN',
  payload: { date: '2024-01-15', supplementIds: ['creatine', 'whey'] }
});

// Unlock premium
stateManager.dispatch({
  type: 'UNLOCK_PREMIUM',
  payload: { purchaseDate: Date.now() }
});

// Update settings
stateManager.dispatch({
  type: 'UPDATE_SETTINGS',
  payload: { theme: 'dark', language: 'pt-BR', notifications: true }
});
```

#### `stateManager.subscribe(path: string, callback: (value) => void): void`

Subscribe to state changes at a specific path.

```javascript
// Watch user profile
stateManager.subscribe('user.profile', (profile) => {
  console.log('Profile changed:', profile);
});

// Watch entire user object
stateManager.subscribe('user', (user) => {
  console.log('User changed:', user);
});

// Watch premium status
stateManager.subscribe('premium.unlocked', (unlocked) => {
  if (unlocked) {
    console.log('Premium unlocked!');
  }
});
```

#### `stateManager.reset(): void`

Clear all state (for testing or user logout).

```javascript
stateManager.reset();
// All state reverts to initial values
```

---

### Analytics Engine

**Module:** `src/analytics/analytics-engine.js`

Main analytics orchestrator. All APIs are `async`.

#### `analyticsEngine.getSessionId(): string | null`

Get current session ID.

```javascript
import { analyticsEngine } from './src/analytics/analytics-engine.js';

const sessionId = analyticsEngine.getSessionId();
// 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6'
```

#### `analyticsEngine.getCurrentSessionData(): Object | null`

Get current session metrics.

```javascript
const sessionData = analyticsEngine.getCurrentSessionData();
// {
//   sessionId: '...',
//   startTime: 1234567890000,
//   duration: 45000,
//   durationSeconds: 45,
//   eventCount: 23,
//   eventNames: ['user:stackUpdated', 'checkin:logged', ...],
//   isActive: true
// }
```

#### `analyticsEngine.getDAU(dateISO: string): Promise<number>`

Get Daily Active Users for a date.

```javascript
const dau = await analyticsEngine.getDAU('2024-01-15');
console.log('DAU:', dau);  // 1523
```

#### `analyticsEngine.getWAU(weekOffset?: number): Promise<number>`

Get Weekly Active Users. `weekOffset=0` is current week, `-1` is last week.

```javascript
const wau = await analyticsEngine.getWAU(0);     // Current week
const lastWau = await analyticsEngine.getWAU(-1); // Last week
```

#### `analyticsEngine.getMAU(monthOffset?: number): Promise<number>`

Get Monthly Active Users. `monthOffset=0` is current month.

```javascript
const mau = await analyticsEngine.getMAU(0);     // Current month
const lastMau = await analyticsEngine.getMAU(-1); // Last month
```

#### `analyticsEngine.getRetention(cohortDateISO: string, dayN: number): Promise<Object>`

Get retention for a cohort at day N (1, 7, 14, 30, 60, 90).

```javascript
const retention = await analyticsEngine.getRetention('2024-01-01', 7);
// { cohortDate, dayN, returnedUsers, totalUsers, rate: 0.45 }
```

#### `analyticsEngine.getRetentionCurve(cohortDateISO: string): Promise<Object>`

Get full retention curve (D1 → D90).

```javascript
const curve = await analyticsEngine.getRetentionCurve('2024-01-01');
// {
//   D1: { rate: 0.9, users: 450, total: 500 },
//   D7: { rate: 0.65, users: 325, total: 500 },
//   D14: { rate: 0.52, users: 260, total: 500 },
//   ...D90
// }
```

#### `analyticsEngine.analyzeFunnel(funnelName: string, startDateISO: string, endDateISO: string): Promise<Object>`

Analyze conversion funnel (e.g., signup → add supplement → checkin).

```javascript
const funnel = await analyticsEngine.analyzeFunnel(
  'onboarding',
  '2024-01-01',
  '2024-01-31'
);
// {
//   steps: [
//     { name: 'signup', users: 1000, conversionRate: 1.0 },
//     { name: 'addSupp', users: 650, conversionRate: 0.65 },
//     { name: 'checkin', users: 420, conversionRate: 0.42 }
//   ],
//   overallConversion: 0.42
// }
```

#### `analyticsEngine.getAffiliateStats(utmSource: string, startDateISO: string, endDateISO: string): Promise<Object>`

Get affiliate performance ('amazon' | 'ml' | 'shopee').

```javascript
const stats = await analyticsEngine.getAffiliateStats(
  'amazon',
  '2024-01-01',
  '2024-01-31'
);
// {
//   utmSource: 'amazon',
//   clicks: 1234,
//   revenue: 5678.90,
//   commissionRate: 0.10,
//   commission: 567.89,
//   topProducts: [ { name, clicks, revenue }, ... ]
// }
```

#### `analyticsEngine.getHealthStatus(): Promise<Object>`

Get system health report (events processed, storage, errors, PII).

```javascript
const health = await analyticsEngine.getHealthStatus();
// {
//   healthy: true,
//   timestamp: '2024-01-15T12:34:56Z',
//   checks: {
//     pipeline: { status: 'healthy', message: '0.1% failure rate' },
//     storage: { status: 'healthy', message: '23.4% of quota used' },
//     pii: { status: 'healthy', message: 'No PII detected' },
//     errors: { status: 'healthy', message: 'No errors' },
//     performance: { status: 'healthy', message: 'Pipeline: 2.5ms avg' }
//   },
//   metrics: {
//     eventsProcessed: 5234,
//     eventsFailed: 5,
//     storageSize: '12.34 KB'
//   },
//   alerts: [ { severity, title, message }, ... ]
// }
```

#### `analyticsEngine.flush(): Promise<void>`

Flush pending events to storage.

```javascript
await analyticsEngine.flush();
// All buffered events persisted to IndexedDB
```

#### `analyticsEngine.endSession(): Promise<void>`

End current session (call on page unload).

```javascript
window.addEventListener('beforeunload', async () => {
  await analyticsEngine.endSession();
});
```

---

### Storage Manager

**Module:** `src/core/storage-manager.js`

LocalStorage wrapper for synchronous key-value storage.

#### `storageManager.set(key: string, value: any): void`

Save value to localStorage.

```javascript
import { storageManager } from './src/core/storage-manager.js';

storageManager.set('user:preferences', { theme: 'dark', language: 'pt-BR' });
storageManager.set('search:history', ['creatina', 'whey protein']);
```

#### `storageManager.get(key: string): any`

Get value from localStorage.

```javascript
const prefs = storageManager.get('user:preferences');
// { theme: 'dark', language: 'pt-BR' }
```

#### `storageManager.remove(key: string): void`

Delete key from localStorage.

```javascript
storageManager.remove('user:preferences');
```

#### `storageManager.clear(): void`

Clear all localStorage.

```javascript
storageManager.clear();  // Careful!
```

---

### Logger

**Module:** `src/utils/logger.js`

Structured logging for debugging and monitoring.

#### `logger.info(message: string, data?: any): void`

Log info-level message.

```javascript
import { logger } from './src/utils/logger.js';

logger.info('[MyComponent] User stack updated', { supplementId: 'creatine' });
```

#### `logger.warn(message: string, data?: any): void`

Log warning.

```javascript
logger.warn('[MyComponent] Slow operation', { duration: 1200 });
```

#### `logger.error(message: string, error?: Error): void`

Log error with stack trace.

```javascript
logger.error('[MyComponent] Failed to save', new Error('Network timeout'));
```

#### `logger.debug(message: string, data?: any): void`

Log debug-level (only shown if `LOG_LEVEL=debug`).

```javascript
logger.debug('[MyComponent] State changed', newState);
```

#### `logger.getMetrics(): Object`

Get buffered metrics (errors, warnings, PII detections).

```javascript
const metrics = logger.getMetrics();
// { errors: 5, warnings: 12, piiDetections: 0, ... }
```

---

## Utilities

### Date Helpers

**Module:** `src/utils/date.js`

```javascript
import { todayISO, offsetISO } from './src/utils/date.js';

todayISO();           // '2024-01-15'
offsetISO(-7);        // 7 days ago: '2024-01-08'
offsetISO(30);        // 30 days from now: '2024-02-14'
```

### Dosage Converter

**Module:** `src/utils/dosage-converter.js`

```javascript
import { convertDosage } from './src/utils/dosage-converter.js';

convertDosage(1000, 'mg', 'g');   // 1
convertDosage(5, 'g', 'mg');      // 5000
convertDosage(1000, 'mcg', 'mg'); // 1
```

### Evidence Scoring

**Module:** `src/utils/evidence.js`

```javascript
import { getEvidenceTier, getEvidenceColor } from './src/utils/evidence.js';

getEvidenceTier('A');           // 'Strong'
getEvidenceColor('B');          // '#FFA500' (orange)
```

### HTML Escape

**Module:** `src/utils/escape.js`

```javascript
import { escapeHtml } from './src/utils/escape.js';

escapeHtml('<script>alert(1)</script>');
// '&lt;script&gt;alert(1)&lt;/script&gt;'
```

---

## Data Models

### User Profile

```javascript
{
  id: 'uuid',
  profile: {
    name: 'João Silva',
    age: 35,
    weight: 80,          // kg
    goals: ['Hipertrofia', 'Longevidade']
  },
  stack: [
    {
      supplementId: 'creatine',
      dosage: '5g',
      frequency: 'daily',
      addedDate: 1234567890000
    }
  ],
  checkins: [
    {
      date: '2024-01-15',
      supplementIds: ['creatine', 'whey'],
      timestamp: 1234567890000
    }
  ],
  favorites: ['creatine', 'whey', 'bcaa'],
  settings: {
    theme: 'dark',
    language: 'pt-BR',
    notifications: true
  }
}
```

### Supplement (from database)

```javascript
{
  id: 'creatine',
  name: 'Creatine Monohydrate',
  category: 'Performance',
  dosage: {
    maintenance: 5,
    loadingPhase: 20,
    unit: 'g'
  },
  evidenceLevel: 'A',
  benefits: ['Strength', 'Muscle Mass', 'Cognitive'],
  sideEffects: ['Water Retention'],
  pricePerGram: 0.15,
  stores: {
    amazon: { url: 'https://amazon.com/...', affiliate: true },
    mercadolivre: { url: 'https://ml.com/...', affiliate: true },
    shopee: { url: 'https://shopee.com.br/...', affiliate: true }
  }
}
```

### Analytics Event

```javascript
{
  eventId: 'uuid',
  eventName: 'user:stackUpdated',
  payload: { supplementId: 'creatine', dosage: '5g' },
  sessionId: 'session-uuid',
  userId: null,  // Anonymous
  timestamp: 1234567890000,
  url: '/my-stack',
  userAgent: 'Mozilla/5.0...',  // Redacted
  device: 'mobile'
}
```

---

## Embed SupliList in Another App

### iframe Integration

```html
<iframe
  src="https://suplilist.app/"
  width="800"
  height="600"
  allow="storage-access"
></iframe>
```

### Programmatic Access

```javascript
// From parent window, message the iframe
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage({
  type: 'navigate',
  path: '/list'
}, '*');

// Listen to events from iframe
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://suplilist.app') return;
  
  if (event.data.type === 'checkin:logged') {
    console.log('User checked in:', event.data.payload);
  }
});
```

---

## Migration Examples

### Get User's Stack

```javascript
import { stateManager } from './src/state/state-manager.js';

function getUserStack() {
  const state = stateManager.getState();
  return state.user.stack;
}

const stack = getUserStack();
// [ { supplementId: 'creatine', dosage: '5g', frequency: 'daily' } ]
```

### Add Supplement to Stack

```javascript
import { stateManager, eventBus } from './src/state/state-manager.js';

function addSupplementToStack(supplementId, dosage = '5g', frequency = 'daily') {
  stateManager.dispatch({
    type: 'ADD_SUPPLEMENT',
    payload: { supplementId, dosage, frequency }
  });

  // EventBus event is auto-emitted, but you can listen:
  eventBus.once('user:stackUpdated', (payload) => {
    console.log('Supplement added:', payload);
  });
}

addSupplementToStack('creatine', '5g', 'daily');
```

### Log Checkin

```javascript
import { stateManager } from './src/state/state-manager.js';
import { todayISO } from './src/utils/date.js';

function logCheckin(supplementIds) {
  stateManager.dispatch({
    type: 'LOG_CHECKIN',
    payload: {
      date: todayISO(),
      supplementIds
    }
  });
}

logCheckin(['creatine', 'whey', 'bcaa']);
```

### Get Analytics

```javascript
import { analyticsEngine } from './src/analytics/analytics-engine.js';
import { todayISO, offsetISO } from './src/utils/date.js';

async function getMonthlyStats() {
  const today = todayISO();
  const startOfMonth = offsetISO(-new Date().getDate() + 1);

  const dau = await analyticsEngine.getDAU(today);
  const mau = await analyticsEngine.getMAU(0);
  const retention = await analyticsEngine.getRetentionCurve(startOfMonth);

  return { dau, mau, retention };
}

const stats = await getMonthlyStats();
console.log(stats);
```

---

## Browser Console API

Exposed for debugging (development only):

```javascript
// In browser DevTools console:
window.analyticsAPI.health()      // System health
window.analyticsAPI.metrics()     // Prometheus metrics
window.analyticsAPI.logs()        // Debug logs
window.analyticsAPI.clear()       // Clear buffers
```

---

## Return to Main Docs

- **ARCHITECTURE.md** — System design
- **SETUP.md** — Developer setup
- **CONTRIBUTING.md** — Contribution guidelines
