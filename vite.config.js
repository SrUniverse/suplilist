import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    open: '/app.html'
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html',
        app: './app.html',
        legal: './src/pages/legal.html'
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})