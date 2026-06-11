import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      // Stubs do Firebase: o SDK real rejeita a API key fake (auth/invalid-api-key)
      'firebase/app': fileURLToPath(new URL('./tests/mocks/firebase-app.js', import.meta.url)),
      'firebase/auth': fileURLToPath(new URL('./tests/mocks/firebase-auth.js', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**', 'e2e/**', '**/*.e2e.test.*'],
    env: {
      VITE_FIREBASE_API_KEY: 'test-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'test-project',
      VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef'
    }
  }
})
