import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**', 'e2e/**', '**/*.e2e.test.*']
  }
})
