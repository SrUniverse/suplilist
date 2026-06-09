# P2 Frontend Fixes - Integration Guide

This document provides instructions for integrating all P2 frontend fixes into your application.

## Overview

The P2 fixes address:
1. **Error Boundary Component** - Catch unhandled component errors
2. **Global Error Modal** - Display critical errors in modal overlay
3. **Observability - Error Tracking** - Capture and report all unhandled errors
4. **Performance Monitoring** - Track metrics with thresholds and warnings
5. **Accessibility Improvements** - WCAG 2.1 AA compliance for login page

## Files Created

### Components
- `src/components/error-boundary.js` - Error boundary component
- `src/components/global-error-modal.js` - Global error modal
- `src/components/error-components.css` - Styles for error UI

### Platform/Observability
- `src/platform/error-tracking.js` - Error tracking and reporting system
- `src/platform/performance-monitor.js` - Enhanced with API tracking

### Tests
- `src/components/error-boundary.test.js` - 15 test cases
- `src/components/global-error-modal.test.js` - 12 test cases
- `src/platform/error-tracking.test.js` - 15 test cases
- `src/platform/performance-monitor.test.js` - 12 test cases
- `src/features/auth/login-page-a11y.test.js` - 15 a11y test cases

### Modified Files
- `src/features/auth/login-page.js` - Added accessibility improvements
- `src/core/event-bus.js` - Added ERROR_CRITICAL event

## Integration Steps

### Step 1: Import and Initialize Error Tracking

In your main app initialization (e.g., `main.js` or `app.js`):

```javascript
import { errorTracking } from './platform/error-tracking.js';

// Initialize error tracking on app startup
errorTracking.init();
```

### Step 2: Initialize Global Error Modal

In your main layout or root component:

```javascript
import { getGlobalErrorModal } from './components/global-error-modal.js';

// Initialize global error modal
const errorModal = getGlobalErrorModal();
errorModal.mount();
```

### Step 3: Use Error Boundary in Components

For critical components that need error recovery:

```javascript
import ErrorBoundary from './components/error-boundary.js';

class MyComponent {
  constructor(container) {
    this.container = container;
    this.errorBoundary = new ErrorBoundary(container, {
      onError: (error, context) => {
        console.error(`Error in ${context}:`, error);
      },
      onReset: () => {
        // Reset component state and re-render
        this.reset();
      }
    });
  }

  mount() {
    this.errorBoundary.mount();
    this.render();
  }

  unmount() {
    this.errorBoundary.unmount();
  }

  render() {
    try {
      // Your render logic
    } catch (error) {
      this.errorBoundary.captureError(error, 'MyComponent.render()');
    }
  }
}
```

### Step 4: Import CSS Styles

Add to your main stylesheet or import in your entry point:

```html
<link rel="stylesheet" href="/src/components/error-components.css">
```

Or in your main JavaScript:

```javascript
import './components/error-components.css';
```

### Step 5: Track API Calls

Enhance your API client to track performance:

```javascript
import monitor from './platform/performance-monitor.js';

export async function apiCall(endpoint, options) {
  const startTime = performance.now();
  
  try {
    const response = await fetch(endpoint, options);
    const duration = performance.now() - startTime;
    
    // Track the API call
    monitor.trackApiResponse(endpoint, duration);
    
    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    monitor.trackApiResponse(endpoint, duration);
    throw error;
  }
}
```

### Step 6: Emit Critical Errors

When you detect critical errors (404, 500, network down):

```javascript
import { eventBus, EVENTS } from './core/event-bus.js';

// Example: Handle 500 server errors
try {
  const response = await fetch('/api/data');
  if (response.status === 500) {
    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 500,
      message: 'Erro no servidor. Tente novamente em alguns minutos.',
      traceId: 'trace_' + Date.now(),
      timestamp: Date.now(),
    });
  }
} catch (error) {
  eventBus.emit(EVENTS.ERROR_CRITICAL, {
    code: 0,
    message: 'Erro de conexão. Verifique sua internet.',
    traceId: 'trace_' + Date.now(),
  });
}
```

## Event Bus Integration

The following new events are available:

### ERROR_CRITICAL
Emitted when a critical error occurs that needs modal display.

```javascript
eventBus.emit(EVENTS.ERROR_CRITICAL, {
  code: number,           // HTTP status or error code
  message: string,        // User-friendly error message
  traceId?: string,       // Unique tracking ID
  timestamp?: number,     // Error timestamp (defaults to now)
});
```

### COMPONENT_ERROR
Automatically emitted by ErrorBoundary when catching component errors.

```javascript
eventBus.emit(EVENTS.COMPONENT_ERROR, {
  errorId: string,        // Unique error ID
  message: string,        // Error message
  stack: string,          // Stack trace
  context: string,        // Where error occurred
  timestamp: string,      // ISO timestamp
  userAgent: string,      // Browser user agent
  url: string,            // Current URL
});
```

## Backend Integration

### Error Logging Endpoint

Create endpoint: `POST /api/logs/errors`

Expected request body:

```json
{
  "errors": [
    {
      "type": "UNCAUGHT_ERROR|UNHANDLED_REJECTION|CONSOLE_ERROR|COMPONENT_ERROR|EXCEPTION",
      "message": "Error message",
      "stack": "Stack trace",
      "context": {},
      "trace_id": "trace_xyz",
      "user_id": "user_id or null",
      "timestamp": "2025-01-01T12:00:00Z",
      "url": "https://app.example.com/path",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

### Performance Metrics Endpoint

Create endpoint: `POST /api/metrics/performance`

Expected request body:

```json
{
  "metric": "lcp|fid|cls|page_load_time|api_endpoint",
  "value": 2500,
  "timestamp": "2025-01-01T12:00:00Z",
  "url": "https://app.example.com/path"
}
```

## Testing

Run tests to verify all P2 fixes:

```bash
# Test error boundary
npm test src/components/error-boundary.test.js

# Test global error modal
npm test src/components/global-error-modal.test.js

# Test error tracking
npm test src/platform/error-tracking.test.js

# Test performance monitoring
npm test src/platform/performance-monitor.test.js

# Test accessibility
npm test src/features/auth/login-page-a11y.test.js
```

## Configuration

### Error Tracking Configuration

```javascript
import { errorTracking } from './platform/error-tracking.js';

errorTracking.configure({
  enabled: true,
  endpoint: '/api/logs/errors',
  batchSize: 10,
  batchInterval: 30000, // 30 seconds
  maxErrors: 100,
  captureConsoleError: true,
  excludePatterns: [
    /404|not found/i,
    /403|forbidden/i,
    /test error/i,
  ],
});
```

### Performance Monitor Configuration

```javascript
import monitor from './platform/performance-monitor.js';

monitor.thresholds = {
  pageLoad: 3000,     // 3 seconds
  apiResponse: 500,   // 500ms
};
```

## Accessibility Checklist

For the login page and other forms:

- ✓ All inputs have `aria-label`
- ✓ Required fields have `aria-required="true"`
- ✓ Error messages have `role="alert"`
- ✓ Buttons have descriptive `aria-label`
- ✓ Form inputs linked to errors with `aria-describedby`
- ✓ Screen reader announcements with `aria-live` regions
- ✓ Keyboard navigation (Tab, Enter, focus management)
- ✓ Proper `inputmode` for numeric inputs
- ✓ Focus automatically moves to first field on form appearance

## Performance Optimization Tips

1. **Monitor page load**: Call `monitor.trackPageLoad()` after page load completes
2. **Track critical APIs**: Call `monitor.trackApiResponse(endpoint, duration)` for important endpoints
3. **Set thresholds**: Configure performance budgets in `monitor.thresholds`
4. **Batch errors**: Error tracking batches errors every 30 seconds (configurable)
5. **Use sendBeacon**: All reporting uses `navigator.sendBeacon()` for reliability

## Error Recovery Patterns

### Pattern 1: Automatic Retry

```javascript
import { errorTracking } from './platform/error-tracking.js';

async function loadData() {
  try {
    return await fetch('/api/data');
  } catch (error) {
    errorTracking.captureException(error, {
      context: { endpoint: '/api/data' }
    });
    throw error;
  }
}
```

### Pattern 2: User-Triggered Recovery

```javascript
class Component {
  mount() {
    const boundary = new ErrorBoundary(this.container, {
      onReset: () => this.reload(),
    });
  }

  reload() {
    // Reset internal state
    this.state = {};
    // Re-fetch data
    this.loadData();
    // Re-render
    this.render();
  }
}
```

### Pattern 3: Fallback UI

```javascript
try {
  const data = await fetch('/api/data');
} catch (error) {
  eventBus.emit(EVENTS.ERROR_CRITICAL, {
    code: error.status || 0,
    message: 'Não conseguimos carregar os dados. Tente mais tarde.',
  });
  // Render fallback UI
  showFallbackUI();
}
```

## Monitoring and Debugging

### Access buffered errors in console

```javascript
import { errorTracking } from './platform/error-tracking.js';

// Get all buffered errors
const errors = errorTracking.getBufferedErrors();
console.log('Buffered errors:', errors);

// Manually flush errors
errorTracking.flushErrors();
```

### Check performance metrics

```javascript
import monitor from './platform/performance-monitor.js';

// Get current metrics
const metrics = monitor.getMetrics();
console.log('Performance metrics:', metrics);

// Check performance budget
const budget = monitor.checkPerformanceBudget();
console.log('Performance budget:', budget);
```

### Check logger buffers (production)

In production, error logs are buffered in window:

```javascript
// Check buffered errors
console.log('Errors:', window.__errors);
console.log('PII detections:', window.__piiDetections);
console.log('Performance metrics:', window.__perfMetrics);
console.log('Analytics:', window.__analyticsLog);
```

## Browser Support

- **Error Tracking**: All modern browsers (IE 11+ with polyfills)
- **Performance Monitor**: Chrome 60+, Firefox 55+, Safari 12.1+, Edge 15+
- **Error Boundary**: All modern browsers
- **Global Error Modal**: All modern browsers
- **Accessibility**: All WCAG 2.1 AA compliant browsers

## Notes

- Error tracking uses `navigator.sendBeacon()` for offline-safe delivery
- Performance metrics are only reported in production (not development)
- Error boundary does NOT catch: event handler errors, async errors, SSR errors
- Error tracking does NOT track: 404, 403, test errors (configurable)
- All error messages are sanitized to prevent XSS
- CSS includes dark mode support via `prefers-color-scheme: dark`

## Support

For issues or questions about P2 fixes:
1. Check the test files for usage examples
2. Review the inline JSDoc comments in source files
3. Check backend logs for error reporting issues
4. Verify event bus integration with `eventBus.getHistory()`
