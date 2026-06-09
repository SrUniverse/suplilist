#!/usr/bin/env node

/**
 * setup-p2-files.js
 * Script para criar todos os arquivos P2 faltantes (frontend, docs, tests)
 *
 * Uso: node setup-p2-files.js
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

// Frontend files
const FRONTEND_FILES = {
  'frontend/src/components/error-boundary.js': `/**
 * error-boundary.js — Captura erros não capturados
 * Previne white-screen-of-death
 */

import { toastService } from '../platform/toast-service.js';
import { errorHandler } from '../platform/error-handler.js';

export default class ErrorBoundary {
  constructor(container) {
    this.container = container;
    this.hasError = false;
    this.error = null;
    this.errorId = null;
  }

  mount(selector) {
    const element = document.querySelector(selector);
    if (!element) return;

    // Capturar erros globais
    window.addEventListener('error', (event) => {
      this._handleError(event.error || new Error(event.message), 'uncaught');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this._handleError(event.reason || new Error('Unhandled Promise'), 'unhandled-rejection');
    });
  }

  _handleError(error, context) {
    this.hasError = true;
    this.error = error;
    this.errorId = \`err_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;

    errorHandler.handleError(error, \`error-boundary-\${context}\`, {
      silent: true,
      logServer: true,
    });

    toastService.error(
      'Algo deu errado. Erro: ' + this.errorId,
      10000
    );
  }

  reset() {
    this.hasError = false;
    window.location.reload();
  }
}
`,

  'frontend/src/components/global-error-modal.js': `/**
 * global-error-modal.js — Modal de erro crítico global
 */

import { eventBus, EVENTS } from '../core/event-bus.js';

export default class GlobalErrorModal {
  constructor(container) {
    this.container = container;
    this.isShowing = false;
  }

  mount() {
    eventBus.on(EVENTS.ERROR_CRITICAL, (error) => {
      this._showErrorModal(error);
    });

    this.modalContainer = document.createElement('div');
    this.container.appendChild(this.modalContainer);
  }

  _showErrorModal(error) {
    const errorCode = error.status || 'UNKNOWN';
    const traceId = error.traceId || 'N/A';

    const html = \`
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
        <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 500px;">
          <h2 style="margin: 0 0 1rem 0; color: #ef4444;">Erro \${errorCode}</h2>
          <p style="margin: 0 0 1rem 0;">\${error.message || 'Algo deu errado'}</p>
          <div style="background: #f5f5f5; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-family: monospace; font-size: 0.85rem;">
            <strong>Trace ID:</strong> \${traceId}
          </div>
          <div style="display: flex; gap: 1rem;">
            <button onclick="location.reload()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Tentar novamente</button>
            <button onclick="location.href='/'" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Ir para home</button>
          </div>
        </div>
      </div>
    \`;

    this.modalContainer.innerHTML = html;
  }

  close() {
    this.modalContainer.innerHTML = '';
    this.isShowing = false;
  }
}
`,

  'frontend/src/platform/error-tracking.js': `/**
 * error-tracking.js — Captura e reporta erros para backend
 */

import { logger } from '../utils/logger.js';

class ErrorTracker {
  constructor() {
    this.errorQueue = [];
    this.batchSize = 10;
    this.batchInterval = 30000; // 30s
    this.flushTimer = null;
  }

  init() {
    // Capture uncaught errors
    window.addEventListener('error', (event) => {
      this.captureError({
        type: 'uncaught_error',
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'unhandled_rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
      });
    });

    // Start batch timer
    this._startBatchTimer();
  }

  captureError(error) {
    if (this.errorQueue.length >= this.batchSize) {
      this._flush();
    }

    this.errorQueue.push({
      ...error,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  _startBatchTimer() {
    this.flushTimer = setInterval(() => {
      if (this.errorQueue.length > 0) {
        this._flush();
      }
    }, this.batchInterval);
  }

  _flush() {
    if (this.errorQueue.length === 0) return;

    const errors = this.errorQueue.splice(0, this.batchSize);

    // Use sendBeacon para offline-safe reporting
    navigator.sendBeacon(
      '/api/logs/errors',
      JSON.stringify({
        errors,
        timestamp: new Date().toISOString(),
      })
    );

    logger.debug('[ErrorTracker] Flushed ' + errors.length + ' errors');
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this._flush();
  }
}

export const errorTracker = new ErrorTracker();
`,

  'frontend/src/platform/performance-monitor.js': `/**
 * performance-monitor.js — Monitora Core Web Vitals
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  init() {
    // Measure page load time
    window.addEventListener('load', () => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

      this.metrics.pageLoad = pageLoadTime;

      if (pageLoadTime > 3000) {
        console.warn('[Performance] Page load slow: ' + pageLoadTime + 'ms');
      }
    });

    // Measure First Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = entry.startTime;
              if (entry.startTime > 1800) {
                console.warn('[Performance] FCP slow: ' + entry.startTime + 'ms');
              }
            }
          });
        });

        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.debug('[Performance] PerformanceObserver not fully supported');
      }
    }
  }

  measureApiCall(endpoint, duration) {
    if (duration > 500) {
      console.warn('[Performance] API slow - ' + endpoint + ': ' + duration + 'ms');
    }

    this.metrics[endpoint] = duration;
  }

  report() {
    // Send metrics to server
    navigator.sendBeacon(
      '/api/metrics/performance',
      JSON.stringify({
        metrics: this.metrics,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

export const perfMonitor = new PerformanceMonitor();
`,
};

// Docs files
const DOCS_FILES = {
  'docs/OPENAPI.md': `# OpenAPI Specification — SupliList

## Base URL
\`\`\`
https://api.suplilist.com/api
\`\`\`

## Endpoints

### GET /supplements/:id
Get supplement with price comparison

**Parameters:**
- \`id\` (string, required) — Supplement ID

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "prices": {
      "amazon": { "price": 99.90, "url": "string" },
      "mercadolivre": { "price": 89.90, "url": "string" },
      "shopee": { "price": 79.90, "url": "string" }
    },
    "bestPrice": "shopee",
    "bestPriceValue": 79.90
  }
}
\`\`\`

### GET /supplements/search?q=query
Search supplements

**Parameters:**
- \`q\` (string, required) — Search query (max 100 chars)

**Response:**
\`\`\`json
{
  "success": true,
  "data": [
    { "id": "string", "name": "string", "bestPrice": 79.90 }
  ]
}
\`\`\`

### GET /health/live
Liveness probe

**Response:**
\`\`\`json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z"
}
\`\`\`

### GET /health/ready
Readiness probe

**Response:**
\`\`\`json
{
  "status": "healthy|degraded",
  "checks": {
    "redis": "ok|error",
    "mongodb": "ok|error"
  },
  "uptime": 3600
}
\`\`\`

## Error Responses

All endpoints return errors in this format:

\`\`\`json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable error message"
}
\`\`\`

### Common Error Codes
- \`validation_error\` — Input validation failed
- \`unauthorized\` — 401 authentication required
- \`forbidden\` — 403 permission denied
- \`not_found\` — 404 resource not found
- \`rate_limit_exceeded\` — 429 too many requests
- \`internal_error\` — 500 server error

## Rate Limiting

All requests are rate limited per IP:

| Endpoint | Limit | Window |
|----------|-------|--------|
| /search | 10/min | 60s |
| /crawl | 5/min | 60s |
| /prices | 50/min | 60s |
| /auth | 5/min | 60s |

Response headers:
- \`X-RateLimit-Limit\` — Total requests allowed
- \`X-RateLimit-Remaining\` — Requests remaining
- \`X-RateLimit-Reset\` — Timestamp when limit resets
- \`Retry-After\` — Seconds to wait (on 429)

## Distributed Tracing

All responses include a trace ID for debugging:

\`\`\`
X-Trace-ID: uuid-v4-string
\`\`\`

Include this ID when reporting bugs.
`,

  'docs/DEPLOYMENT.md': `# Deployment Guide

## Prerequisites

- Node.js 18+
- MongoDB 5+
- Redis 7+
- PM2 or Docker

## Environment Variables

\`\`\`bash
# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/suplilist
REDIS_URI=redis://localhost:6379

# Security
JWT_SECRET=your-secret-key
CSRF_SECRET=your-csrf-secret

# API
FIRECRAWL_API_KEY=your-key
AFFILIATE_CODE_AMAZON=your-code
AFFILIATE_CODE_MERCADOLIVRE=your-code
AFFILIATE_CODE_SHOPEE=your-code

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your-key
\`\`\`

## Deployment Steps

### 1. Build
\`\`\`bash
npm run build
npm run test
\`\`\`

### 2. Health Check
\`\`\`bash
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
\`\`\`

### 3. Deploy with PM2
\`\`\`bash
pm2 start dist/server.js --name "suplilist-api"
pm2 save
\`\`\`

### 4. Monitor
\`\`\`bash
pm2 logs suplilist-api
pm2 monit
\`\`\`

## Monitoring

### Alerts
- Error rate > 1%
- Response time > 500ms
- Cache miss rate > 50%
- Database query time > 100ms

### Logs
All logs include trace ID for correlation:
\`\`\`
[trace-id-uuid] GET /api/supplements/123 200 145ms
\`\`\`

## Rollback

\`\`\`bash
git revert <commit>
npm run build
pm2 restart suplilist-api
\`\`\`
`,
};

// E2E Tests
const E2E_FILES = {
  'frontend/e2e/auth-flow.spec.js': `/**
 * auth-flow.spec.js — E2E tests para fluxo de autenticação
 * Usa Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login com credenciais válidas', async ({ page }) => {
    // Fill form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test@1234');

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect
    await expect(page).toHaveURL('/home');
  });

  test('login com email inválido mostra erro', async ({ page }) => {
    await page.fill('[name="email"]', 'invalid-email');
    await page.fill('[name="password"]', 'Test@1234');
    await page.click('button[type="submit"]');

    // Check for error message
    const errorMessage = await page.locator('[data-error="true"]');
    await expect(errorMessage).toBeVisible();
  });

  test('MFA flow com token válido', async ({ page }) => {
    // Setup: User precisa ter MFA enabled
    await page.fill('[name="email"]', 'mfa@example.com');
    await page.fill('[name="password"]', 'Test@1234');
    await page.click('button[type="submit"]');

    // Expect MFA step
    await expect(page.locator('text=Código MFA')).toBeVisible();

    // Fill MFA
    await page.fill('[name="mfaCode"]', '123456');
    await page.click('button[type="submit"]');

    // Verify authenticated
    await expect(page).toHaveURL('/home');
  });

  test('MFA token expira após 5 minutos', async ({ page }) => {
    // Login
    await page.fill('[name="email"]', 'mfa@example.com');
    await page.fill('[name="password"]', 'Test@1234');
    await page.click('button[type="submit"]');

    // Wait for MFA
    await expect(page.locator('text=Código MFA')).toBeVisible();

    // Wait 5+ minutes
    await page.waitForTimeout(5 * 60 * 1000 + 1000);

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Should show warning toast
    const toast = await page.locator('[data-toast-type="warning"]');
    await expect(toast).toBeVisible();
  });

  test('logout clears session', async ({ page, context }) => {
    // Login first
    await page.goto('/home');

    // Logout
    await page.click('[data-testid="logout-btn"]');

    // Verify redirected
    await expect(page).toHaveURL('/login');

    // Verify token cleared from memory
    const cookies = await context.cookies();
    const hasAccessToken = cookies.some(c => c.name === 'access_token');
    expect(hasAccessToken).toBeFalsy();
  });
});
`,
};

/**
 * Create directory recursively
 */
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Create all files
 */
function createFiles() {
  console.log('🚀 Criando arquivos P2...\n');

  let created = 0;

  // Frontend files
  console.log('📱 Frontend Components:');
  Object.entries(FRONTEND_FILES).forEach(([filePath, content]) => {
    const fullPath = path.join(BASE_DIR, filePath);
    ensureDir(fullPath);

    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content);
      console.log(`  ✅ ${filePath}`);
      created++;
    } else {
      console.log(`  ⏭️  ${filePath} (já existe)`);
    }
  });

  // Docs files
  console.log('\n📚 Documentação:');
  Object.entries(DOCS_FILES).forEach(([filePath, content]) => {
    const fullPath = path.join(BASE_DIR, filePath);
    ensureDir(fullPath);

    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content);
      console.log(`  ✅ ${filePath}`);
      created++;
    } else {
      console.log(`  ⏭️  ${filePath} (já existe)`);
    }
  });

  // E2E Tests
  console.log('\n🧪 E2E Tests:');
  Object.entries(E2E_FILES).forEach(([filePath, content]) => {
    const fullPath = path.join(BASE_DIR, filePath);
    ensureDir(fullPath);

    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content);
      console.log(`  ✅ ${filePath}`);
      created++;
    } else {
      console.log(`  ⏭️  ${filePath} (já existe)`);
    }
  });

  console.log(`\n✨ Total de arquivos criados: ${created}`);
  console.log('\n📝 Próximos passos:');
  console.log('  1. npm install playwright --save-dev');
  console.log('  2. npm run test:e2e');
  console.log('  3. Integrar error-boundary.js em main-layout.js');
  console.log('  4. Integrar global-error-modal.js em main-layout.js');
}

// Run
createFiles();
