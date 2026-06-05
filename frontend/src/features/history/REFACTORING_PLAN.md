# History Page Refactoring Plan

## Current State
- **File:** `history-page.js`
- **Size:** 1204 lines
- **Issues:** Monolithic, hard to maintain, large CSS block inline

## Target Architecture

### 1. history-page-styles.js (311 lines)
Extract CSS from `_injectStyles()` method (lines 131-442).

```javascript
export function injectHistoryStyles() {
  if (document.getElementById('history-page-styles-v2')) return;
  const style = document.createElement('style');
  style.id = 'history-page-styles-v2';
  style.textContent = `/* CSS content */`;
  document.head.appendChild(style);
}
```

### 2. history-page-stats.js (~80 lines)
Extract stats calculation and rendering:
- Total check-ins
- Current streak
- Average daily cost (with unit conversion)

```javascript
export class HistoryPageStats {
  constructor(container) {
    this.container = container;
  }

  render(checkins, stack, supMap) {
    // Calculate stats
    // Render 3 stat cards
  }
}
```

### 3. history-page-calendar.js (~100 lines)
Extract 7-day calendar rendering:
- Week view with dots (filled/empty/today)
- Completion percentage

```javascript
export class HistoryPageCalendar {
  constructor(container) {
    this.container = container;
  }

  render(checkins) {
    // Render 7-day calendar
    // Mark today, filled, empty
  }
}
```

### 4. history-page-dashboard.js (~275 lines)
Extract premium analytics dashboard (lines 862-1137):
- Daily adherence trends chart
- Supplement heatmap
- Weekly consistency

```javascript
export class HistoryPageDashboard {
  constructor(container) {
    this.container = container;
  }

  render(checkins, stack, supMap) {
    // Premium analytics only
    // Charts, heatmap, trends
  }
}
```

### 5. history-page-utils.js (~80 lines)
Extract helper functions:
- `buildSupMap()`
- `estimateDailyCost()`
- `_formatMonthYear()`
- `_pad()`
- Constants: `MONTH_NAMES`, `CATEGORIES`

```javascript
export const MONTH_NAMES = ['Jan', 'Fev', ...];
export const CATEGORIES = ['Todos', ...];
export const buildSupMap = () => { ... };
export const estimateDailyCost = (stack, supMap) => { ... };
```

### 6. history-page.js (~300 lines)
Main orchestrator:
- Constructor, mount/unmount
- State subscription
- Coordinate sub-components
- Virtual scroller setup
- Event listeners

```javascript
import { injectHistoryStyles } from './history-page-styles.js';
import { HistoryPageStats } from './history-page-stats.js';
import { HistoryPageCalendar } from './history-page-calendar.js';
import { HistoryPageDashboard } from './history-page-dashboard.js';
import { buildSupMap, estimateDailyCost } from './history-page-utils.js';

export default class HistoryPage {
  constructor(container) {
    this.container = container;
    this.stats = new HistoryPageStats(container);
    this.calendar = new HistoryPageCalendar(container);
    this.dashboard = new HistoryPageDashboard(container);
    // ...
  }

  async mount() {
    injectHistoryStyles();
    this._renderScaffold();
    this.stats.render(checkins, stack, supMap);
    this.calendar.render(checkins);
    // ...
  }
}
```

## Benefits
- ✅ Main file: 1204 → ~300 lines (75% reduction)
- ✅ Each component: <300 lines (easy to maintain)
- ✅ Clear separation: styles, stats, calendar, dashboard, utils
- ✅ Testable: each component can be unit tested independently
- ✅ Reusable: dashboard can be used in other pages

## Estimated Time
- Phase 1: Extract styles + utils (1 hour)
- Phase 2: Extract stats + calendar (1.5 hours)
- Phase 3: Extract dashboard (1.5 hours)
- Phase 4: Update main orchestrator + tests (1 hour)
- **Total:** 5 hours

## Implementation Order
1. `history-page-utils.js` (no dependencies)
2. `history-page-styles.js` (no dependencies)
3. `history-page-stats.js` (depends on utils)
4. `history-page-calendar.js` (depends on utils)
5. `history-page-dashboard.js` (depends on utils)
6. Update `history-page.js` (depends on all above)
7. Update tests (if any exist)
