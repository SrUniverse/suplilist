# SupliList v4.0 — Developer Setup Guide

## Prerequisites

- **Node.js** 18+ (for testing & build tools)
- **npm** 9+
- **Git**
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/suplilist.git
cd suplilist
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- **Jest** — Unit testing framework
- **Prettier** — Code formatter
- **ESLint** — Linter (optional)

### 3. Start Development Server

```bash
npm run dev
```

Opens `http://localhost:5173` (or next available port).

Hot reload enabled. Changes to `src/` reflect instantly.

### 4. Run Tests

```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

### 5. Build for Production

```bash
npm run build
```

Outputs to `dist/`:
- `index.html` (app shell)
- `app.js`, `styles.css`, etc.
- Service worker registered via `pwa-handler.js`

---

## Project Structure

```
suplilist/
├── src/
│   ├── index.html          # Entry point
│   ├── app.js              # App coordinator
│   ├── pages/              # Page components (11 pages)
│   ├── core/               # Core systems (router, event-bus, etc.)
│   ├── state/              # State management
│   ├── analytics/          # Telemetry & metrics
│   ├── features/           # Feature modules (premium, sharing, etc.)
│   ├── ai/                 # Dosage calculator, recommendations
│   ├── data/               # Embedded supplements database
│   ├── utils/              # Utilities (logger, date, escape, etc.)
│   ├── monetization/       # Affiliate tracking
│   └── config/             # Constants & configuration
├── __tests__/              # Jest test files
├── dist/                   # Production build (generated)
├── ARCHITECTURE.md         # System architecture
├── SETUP.md               # This file
├── API.md                 # API reference
├── CONTRIBUTING.md        # Contribution guidelines
├── package.json           # Dependencies & scripts
├── jest.config.js         # Jest configuration
└── .gitignore
```

---

## Development Workflow

### Adding a New Page

1. **Create page component** (`src/pages/my-new-page.js`):

```javascript
export default class MyNewPage {
  constructor(container) {
    this.container = container;
  }

  mount() {
    this._injectStyle();
    this.container.innerHTML = this._template();
    this._attachListeners();
  }

  unmount() {
    this.container.innerHTML = '';
  }

  _injectStyle() {
    const style = document.createElement('style');
    style.textContent = `...`;
    document.head.appendChild(style);
  }

  _template() {
    return `<div>...</div>`;
  }

  _attachListeners() {
    this.container.addEventListener('click', (e) => {
      // Handle interactions
    });
  }
}
```

2. **Register in router** (`src/core/router.js`):

```javascript
import MyNewPage from '../pages/my-new-page.js';

// In router._loadPage():
case '/my-new-page':
  return new MyNewPage(this.appContainer);
```

3. **Test page** (`__tests__/pages/my-new-page.test.js`):

```javascript
import MyNewPage from '../../src/pages/my-new-page.js';

describe('MyNewPage', () => {
  it('should render content', () => {
    const container = document.createElement('div');
    const page = new MyNewPage(container);
    page.mount();
    expect(container.innerHTML).toContain('...');
  });
});
```

### Adding a New Feature

1. **Create module** (`src/features/my-feature/my-feature.js`):

```javascript
export class MyFeature {
  constructor() {
    // Initialize
  }

  enable() {
    eventBus.on('some:event', (payload) => {
      // Handle event
    });
  }

  doSomething() {
    // Feature logic
  }
}
```

2. **Integrate** (e.g., in `src/core/app.js`):

```javascript
import { MyFeature } from '../features/my-feature/my-feature.js';

// During app init:
this.myFeature = new MyFeature();
this.myFeature.enable();
```

### Dispatching Events

Use the **EventBus** for all component communication:

```javascript
import { eventBus } from '../core/event-bus.js';

// Emit event
eventBus.emit('user:stackUpdated', { supplementId: '123', dosage: '5g' });

// Listen to event
eventBus.on('user:stackUpdated', (payload) => {
  console.log('Stack updated:', payload);
  // Update UI
});
```

### Updating State

Use the **StateManager** for all data mutations:

```javascript
import { stateManager } from '../state/state-manager.js';

// Get current state
const currentUser = stateManager.getState().user;

// Update (immutable)
stateManager.dispatch({
  type: 'SET_USER_PROFILE',
  payload: { name: 'João', age: 35 }
});

// Subscribe to changes
stateManager.subscribe('user.profile', (newProfile) => {
  console.log('Profile updated:', newProfile);
});
```

### Persisting Data

LocalStorage is automatically handled by StateManager:

```javascript
// When you call dispatch(), data is auto-saved to localStorage
// On app startup, StateManager loads from localStorage automatically

// Manual save if needed:
import { storageManager } from '../core/storage-manager.js';
storageManager.set('my:key', myValue);
storageManager.get('my:key');
```

### Analytics & Logging

```javascript
import { logger } from '../utils/logger.js';
import { eventBus } from '../core/event-bus.js';

// Log events
logger.info('[MyComponent] Something happened');
logger.warn('[MyComponent] Warning');
logger.error('[MyComponent] Error:', error);

// Analytics (auto-tracked)
eventBus.emit('my:customEvent', { data: 'value' });
// This is automatically captured by EventPipeline
```

---

## Environment Variables

Create a `.env` file in the root:

```env
# Analytics (optional)
VITE_ANALYTICS_ENABLED=true

# Affiliate Links
VITE_AMAZON_AFFILIATE_ID=your-amazon-id
VITE_MERCADOLIVRE_AFFILIATE_ID=your-ml-id
VITE_SHOPEE_AFFILIATE_ID=your-shopee-id

# App Settings
VITE_APP_VERSION=4.0.0
VITE_LOG_LEVEL=info  # debug, info, warn, error
```

Access in code:
```javascript
const apiKey = import.meta.env.VITE_ANALYTICS_ENABLED;
```

---

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Watch mode (re-run on file change)
npm test -- --watch

# Coverage report
npm test -- --coverage

# Test specific file
npm test -- state-manager.test.js
```

### Writing Tests

```javascript
// __tests__/core/state-manager.test.js
import { stateManager } from '../../src/state/state-manager.js';

describe('StateManager', () => {
  beforeEach(() => {
    stateManager.reset();  // Clean state
  });

  it('should update user profile', () => {
    stateManager.dispatch({
      type: 'SET_USER_PROFILE',
      payload: { name: 'João' }
    });

    const state = stateManager.getState();
    expect(state.user.profile.name).toBe('João');
  });

  it('should emit change event', (done) => {
    stateManager.subscribe('user.profile', (profile) => {
      expect(profile.name).toBe('João');
      done();
    });

    stateManager.dispatch({
      type: 'SET_USER_PROFILE',
      payload: { name: 'João' }
    });
  });
});
```

---

## Code Style & Formatting

### Prettier (Auto-formatting)

```bash
npm run format       # Format all files
npm run format:check # Check if files are formatted
```

**Rules:**
- 2-space indentation
- Single quotes
- 80-character line limit
- Trailing commas

### ESLint (Linting - Optional)

```bash
npm run lint  # Check for issues
npm run lint:fix  # Auto-fix issues
```

### JSDoc Comments

Always document public methods:

```javascript
/**
 * Calculate monthly dosage cost for a supplement.
 * @param {number} dailyGrams - Daily dosage in grams
 * @param {number} pricePerGram - Price per gram in BRL
 * @returns {number} Monthly cost in BRL
 */
function calculateMonthlyCost(dailyGrams, pricePerGram) {
  return dailyGrams * pricePerGram * 30;
}
```

---

## Debugging

### Browser DevTools

```javascript
// Add breakpoint
debugger;

// Or use Chrome DevTools → Sources tab
```

### Logging

```javascript
import { logger } from '../utils/logger.js';

logger.debug('[MyComponent] Debug info:', data);
logger.info('[MyComponent] Info message');
logger.warn('[MyComponent] Warning:', issue);
logger.error('[MyComponent] Error:', error);
```

### Analytics Dashboard (Development)

```javascript
// In browser console:
window.analyticsAPI.health()     // Get system health
window.analyticsAPI.metrics()    // Prometheus metrics
window.analyticsAPI.logs()       // Debug logs
window.analyticsAPI.clear()      // Clear buffers
```

---

## Performance Testing

### Lighthouse

1. Open Chrome DevTools → Lighthouse tab
2. Run audit
3. Check Performance, Accessibility, SEO scores

### Bundle Size

```bash
npm run build
# Check dist/ folder size
# Goal: < 500 KB (gzipped)
```

### Virtual Scrolling (List Performance)

List page uses virtual scrolling for 500+ supplements:
- Only renders visible rows
- Smooth scrolling with minimal jank
- Test with 1000+ items in `data/supplements.js`

---

## Troubleshooting

### "Module not found" error

- Check import path (case-sensitive on Linux/Mac)
- Verify file exists in `src/`
- Check for circular imports

### State not updating UI

- Make sure you're using `stateManager.dispatch()`, not direct mutation
- Subscribe to the right state path: `stateManager.subscribe('user.profile', ...)`
- Check that your page is listening to `stateManager` updates

### Events not firing

- Check EventBus event name matches exactly (case-sensitive)
- Make sure you call `eventBus.on()` before the event is emitted
- Use wildcard listener to debug: `eventBus.on('*', (name, payload) => console.log(name, payload))`

### LocalStorage quota exceeded

- User's device is low on space
- Check what's stored: `Object.keys(localStorage)`
- Consider archiving old checkins to IndexedDB

### IndexedDB errors

- Clear IndexedDB: Open DevTools → Application → IndexedDB → Right-click → Clear All

---

## Version Management

Current version: **4.0.0**

Update in:
- `package.json` → `version`
- `src/config/constants.js` → `APP_VERSION`

---

## Deployment Checklist

- [ ] All tests passing: `npm test`
- [ ] Code formatted: `npm run format`
- [ ] No console errors in DevTools
- [ ] Lighthouse score ≥ 90
- [ ] Service worker registered (check DevTools → Application)
- [ ] All pages load offline
- [ ] Analytics health check passes
- [ ] No secrets in code (check `.env`)

---

## CI/CD

GitHub Actions workflow (`.github/workflows/test.yml`):

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - run: npm run format:check
```

---

## Resources

- **ARCHITECTURE.md** — System design
- **API.md** — Public API reference
- **CONTRIBUTING.md** — PR guidelines
- **Lighthouse** — Performance audits
- **Jest Docs** — Testing framework
- **MDN Web Docs** — JavaScript reference

---

## Getting Help

1. Check existing GitHub issues
2. Review CONTRIBUTING.md for code standards
3. Ask in discussions or create an issue
4. Check browser console for errors (F12)
5. Run `npm test` to verify your changes

Happy coding! 🚀
