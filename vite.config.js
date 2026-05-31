import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    // strictPort removido: Vite auto-incrementa a porta se 5173 estiver ocupada
    open: '/',
    historyApiFallback: true
  },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '.',
      filename: 'service-worker.js',
      registerType: 'autoUpdate',
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
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" }
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
    outDir: 'docs',
    sourcemap: false,
    target: 'es2020', // Suporta syntax moderna nativa, minificando e reduzindo o peso do JS
    minify: 'esbuild', // Garante que o ESBuild otimize as rotas dinâmicas a fundo
    cssCodeSplit: true, // Separa o CSS em pequenos blocos (Apenas baixa se a tela usar)
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'; // Cria um chunk isolado só para dependências, melhorando o cache do navegador
          }
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