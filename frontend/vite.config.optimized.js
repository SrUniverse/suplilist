import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Optimized Vite Configuration
 * - Enhanced code splitting for smaller chunks
 * - Improved lazy loading strategy
 * - Better tree-shaking and minification
 * - Service worker prerendering
 */
export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    host: '127.0.0.1',
    historyApiFallback: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 3000,
    historyApiFallback: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  },
  plugins: [
    process.env.ANALYZE && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '.',
      filename: 'service-worker.js',
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      manifestFilename: 'manifest.json',
      injectManifest: {
        globPatterns: [
          'index.html',
          'offline.html',
          'manifest.json',
          'assets/**/*.{js,css}',
          'data/*.json',
          '*.png'
        ],
        globIgnores: ['**/node_modules/**/*'],
        manifestTransforms: [],
        dontCacheBustURLsMatching: /\.(js|css)$/,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      manifest: {
        name: "SupliList — Suplementação Baseada em Ciência",
        short_name: "SupliList",
        description: "57+ suplementos, dosagens clínicas, preços em tempo real de 3 marketplaces.",
        start_url: "/",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#7c3aed",
        background_color: "#0a0a0a",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        categories: ["health", "productivity"],
        shortcuts: [
          { name: "Calculadora de Dosagem", short_name: "Dosagem", description: "Calcule a dosagem ideal baseada no seu peso", url: "/dosage", icons: [{ src: "/icon-dosage.png", sizes: "96x96" }] },
          { name: "Minhas Compras", short_name: "Compras", description: "Histórico de suplementação e check-ins", url: "/history", icons: [{ src: "/icon-history.png", sizes: "96x96" }] }
        ]
      }
    })
  ],
  build: {
    sourcemap: false,
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
    reportCompressedSize: true, // Show gzipped sizes
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules/exceljs')) return 'vendor-exceljs';
          if (id.includes('node_modules/firebase')) return 'vendor-firebase';
          if (id.includes('node_modules/stripe')) return 'vendor-stripe';
          if (id.includes('node_modules/sentry')) return 'vendor-sentry';
          if (id.includes('node_modules/qrcode')) return 'vendor-qrcode';
          if (id.includes('node_modules')) return 'vendor';

          // Feature chunks (lazy loaded routes)
          if (id.includes('/features/admin/')) return 'chunk-admin';
          if (id.includes('/features/premium/')) return 'chunk-premium';
          if (id.includes('/features/auth/')) return 'chunk-auth';
          if (id.includes('/features/calculator/')) return 'chunk-calculator';
          if (id.includes('/features/stack/')) return 'chunk-stack';
          if (id.includes('/features/checkin/')) return 'chunk-checkin';
          if (id.includes('/features/history/')) return 'chunk-history';

          // Analytics chunk (defer loading)
          if (id.includes('/analytics/')) return 'chunk-analytics';

          // Core utilities
          if (id.includes('/utils/')) return 'chunk-utils';
          if (id.includes('/platform/')) return 'chunk-platform';
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})
