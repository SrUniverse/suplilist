import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for SupliList E2E Tests
 *
 * Comprehensive testing for all PHASE 1-4 stack validation:
 * - Foundation (PostgreSQL, Redis, Docker)
 * - JIT Endpoints (Rate limiting, Caching, Fallback)
 * - Async Motor (BullMQ, Deduplication, IQR Filtering)
 * - Telemetry (Prometheus, Grafana, Alerts, Logs)
 *
 * API-only tests (no browser automation needed)
 * Run with: npm run test:e2e
 */

const API_URL = process.env.API_URL || 'http://localhost:5000';
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.test.ts',

  // Timeout configuration
  timeout: 30000, // 30s per test
  expect: {
    timeout: 5000, // 5s per assertion
  },

  // Parallel execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Global settings
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Single project: API testing via HTTP (no browser needed)
  projects: [
    {
      name: 'api-tests',
      use: {},
    },
  ],

  // Server configuration for local development
  webServer: process.env.API_URL
    ? undefined // Use provided API_URL instead of starting server
    : {
        command: 'npm run dev:server',
        port: 5000,
        timeout: 120000,
        reuseExistingServer: !process.env.CI,
        env: {
          NODE_ENV: 'test',
        },
      },

  // Environment variables for tests
  env: {
    API_URL,
    PROMETHEUS_URL,
    GRAFANA_URL,
  },
});
