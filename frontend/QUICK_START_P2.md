# P2 Fixes - Quick Start Guide

Get P2 frontend fixes running in 5 minutes.

## Step 1: Initialize Error Tracking (30 seconds)

Add to your app's main entry point (e.g., `main.js`, `app.js`):

```javascript
// At the top of your app initialization
import { errorTracking } from './platform/error-tracking.js';

// Call this once on app startup
errorTracking.init();
```

That's it! Error tracking is now active and will:
- Catch unhandled promise rejections
- Capture console.error calls
- Listen to component errors
- Batch and report to `/api/logs/errors`

## Step 2: Add Global Error Modal (1 minute)

In your root/layout component:

```javascript
import { getGlobalErrorModal } from './components/global-error-modal.js';

// In your layout mount/init
const errorModal = getGlobalErrorModal();
errorModal.mount();
```

Now critical errors will display in a nice modal overlay.

## Step 3: Import CSS Styles (30 seconds)

In your main HTML or CSS:

```html
<link rel="stylesheet" href="/src/components/error-components.css">
```

Or in your JavaScript:

```javascript
import './components/error-components.css';
```

## Step 4: Update Your API Client (1 minute)

Track performance of API calls:

```javascript
import monitor from './platform/performance-monitor.js';

// Wrap your API calls
async function apiCall(endpoint, options) {
  const startTime = performance.now();
  try {
    const response = await fetch(endpoint, options);
    const duration = performance.now() - startTime;
    monitor.trackApiResponse(endpoint, duration);
    return response;
  } catch (error) {
    throw error;
  }
}
```

## Step 5: Create Backend Endpoints (2 minutes)

Create two endpoints in your backend:

### POST /api/logs/errors

```javascript
// Express example
app.post('/api/logs/errors', (req, res) => {
  const { errors } = req.body;
  // Store errors in your database
  console.log('Received errors:', errors);
  res.json({ success: true });
});
```

### POST /api/metrics/performance

```javascript
app.post('/api/metrics/performance', (req, res) => {
  const { metric, value, timestamp, url } = req.body;
  // Store metrics
  console.log(`Metric: ${metric} = ${value}ms`);
  res.json({ success: true });
});
```

## Done! 🎉

Your app now has:
- ✓ Automatic error tracking
- ✓ Global error modal for critical errors
- ✓ Performance monitoring
- ✓ Server error reporting
- ✓ Accessibility improvements (login page)

## Optional: Use Error Boundary in Components

For extra safety in critical components:

```javascript
import ErrorBoundary from './components/error-boundary.js';

class CriticalWidget {
  constructor(container) {
    this.boundary = new ErrorBoundary(container, {
      onError: (error) => console.error('Widget error:', error),
      onReset: () => this.reload(),
    });
  }

  mount() {
    this.boundary.mount();
  }

  render() {
    try {
      // Your render logic
    } catch (error) {
      this.boundary.captureError(error, 'CriticalWidget.render');
    }
  }

  reload() {
    // Reset and try again
    this.render();
  }
}
```

## Optional: Emit Critical Errors

When you detect important errors (server down, network offline):

```javascript
import { eventBus, EVENTS } from './core/event-bus.js';

try {
  const response = await fetch('/api/data');
  if (response.status === 500) {
    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 500,
      message: 'Servidor temporariamente indisponível',
      traceId: `trace_${Date.now()}`,
    });
  }
} catch (error) {
  eventBus.emit(EVENTS.ERROR_CRITICAL, {
    code: 0,
    message: 'Erro de conexão. Verifique sua internet.',
  });
}
```

## Testing

Run the test suite:

```bash
npm test src/components/
npm test src/platform/
npm test src/features/auth/login-page-a11y.test.js
```

Should see: ✓ 60+ tests passing

## Troubleshooting

**Errors not appearing in backend?**
- Check that `/api/logs/errors` endpoint exists
- Verify CORS is enabled for the endpoint
- Check browser console for network errors

**Modal not showing?**
- Verify `getGlobalErrorModal().mount()` was called
- Check that CSS file is imported
- Verify events are being emitted with `EVENTS.ERROR_CRITICAL`

**Performance metrics not tracked?**
- Metrics only report in production (not development)
- Verify `/api/metrics/performance` endpoint exists
- Check that `monitor.trackApiResponse()` is called

## File Locations

```
src/
├── components/
│   ├── error-boundary.js
│   ├── global-error-modal.js
│   ├── error-components.css
│   ├── error-boundary.test.js
│   └── global-error-modal.test.js
├── platform/
│   ├── error-tracking.js
│   ├── performance-monitor.js (enhanced)
│   ├── error-tracking.test.js
│   └── performance-monitor.test.js
├── features/auth/
│   ├── login-page.js (updated for a11y)
│   └── login-page-a11y.test.js
├── core/
│   └── event-bus.js (updated with ERROR_CRITICAL)
└── P2_INTEGRATION_GUIDE.md
```

## Next Steps

1. ✓ Initialize error tracking
2. ✓ Mount global error modal
3. ✓ Import CSS
4. ✓ Track API calls
5. ✓ Create backend endpoints
6. Run tests to verify everything works
7. Deploy to production

That's all! Your P2 frontend fixes are now active. 🚀

For detailed information, see `P2_INTEGRATION_GUIDE.md` in the same directory.
