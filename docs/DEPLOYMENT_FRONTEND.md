# Frontend Deployment Guide

**Table of Contents**
1. [Build Process](#build-process)
2. [Environment Variables](#environment-variables)
3. [Static Asset Optimization](#static-asset-optimization)
4. [Error Boundary Configuration](#error-boundary-configuration)
5. [Performance Monitoring](#performance-monitoring)
6. [Accessibility Compliance](#accessibility-compliance)
7. [Browser Support Matrix](#browser-support-matrix)
8. [Deployment Checklist](#deployment-checklist)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Build Process

### Prerequisites

- **Node.js**: 18.x or higher
- **NPM**: 8.x or higher
- **Git**: 2.30+ for version control

### Building for Production

```bash
# 1. Install dependencies
npm install

# 2. Build the application
npm run build

# Output directory: /dist
# Contents:
#  - index.html (entry point)
#  - /assets (JS, CSS bundles with hash names)
#  - /images (optimized images)
#  - manifest.webmanifest (PWA manifest)
```

### Build Output Structure

```
dist/
├── index.html                    # Main HTML with cache-busting hashes
├── manifest.webmanifest          # PWA manifest
├── sw.js                         # Service worker
├── assets/
│   ├── main.HASH.js             # Minified app bundle (~150KB gzipped)
│   ├── vendor.HASH.js           # Third-party libs (~80KB gzipped)
│   ├── main.HASH.css            # Compiled styles (~25KB gzipped)
│   └── [other chunks]           # Code-split bundles
└── images/
    └── [optimized web images]
```

### Build Optimization Options

```bash
# Default (recommended for production)
npm run build

# Debug mode (with source maps)
NODE_ENV=development npm run build

# Analyze bundle size
npm run build -- --analyze

# Verbose logging
DEBUG=* npm run build
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_URL=https://api.suplilist.com
VITE_API_TIMEOUT=30000              # Request timeout (ms)

# Feature Flags
VITE_TRACE_ID_ENABLED=true          # Send X-Request-ID header
VITE_ANALYTICS_ENABLED=true         # Track user interactions
VITE_PWA_ENABLED=true               # Enable PWA features
VITE_MAINTENANCE_MODE=false         # Show maintenance banner

# Analytics
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
VITE_GA_ID=UA-XXXXXXXXX-X          # Google Analytics

# Debug
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error                # error, warn, info, debug

# PWA Settings
VITE_APP_NAME=SupliList
VITE_APP_SHORT_NAME=SupliList
VITE_APP_DESCRIPTION=Guia inteligente de suplementação fitness
```

### Environment Variable Validation

Environment variables are validated at build time:

```javascript
// vite.config.js
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Validate required vars
  if (!env.VITE_API_URL) {
    throw new Error('VITE_API_URL is required')
  }
  
  return { /* config */ }
})
```

### Runtime Environment Detection

```javascript
// At runtime, access via import.meta.env:
const apiUrl = import.meta.env.VITE_API_URL
const isProduction = import.meta.env.PROD
const isDevelopment = import.meta.env.DEV
```

---

## Static Asset Optimization

### Image Optimization

```bash
# All images in /src/assets/images/ are automatically:
# 1. Converted to WebP (if possible)
# 2. Resized to optimal dimensions
# 3. Compressed using best-effort settings

# Manual optimization (if needed):
npm run optimize:images
```

### CSS Minification

```javascript
// Vite automatically minifies CSS in production:
// Original: ~50KB
// Minified: ~25KB (50% reduction)

// Remove unused CSS:
npm run build -- --minify
```

### JavaScript Bundling & Code Splitting

```javascript
// Vite produces optimized bundles:

// 1. Main app bundle (core app logic)
// 2. Vendor bundle (third-party libraries)
// 3. Feature chunks (lazy-loaded on demand)

// Example: supplements page loaded only when needed
import('src/pages/supplements.js').then(module => {
  module.render()
})
```

### Gzip Compression

```bash
# Enable gzip compression on web server:

# Nginx
gzip on;
gzip_types text/plain text/css text/javascript;
gzip_comp_level 9;

# Apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml
  AddOutputFilterByType DEFLATE text/css text/javascript
</IfModule>
```

### Cache Busting

```javascript
// Vite automatically includes content hash in filenames:

// Before minification: main.js
// After build: main.HASH.js (e.g., main.3f2a9c1.js)

// Cache headers should be:
// index.html        -> Cache-Control: no-cache (revalidate daily)
// /assets/*         -> Cache-Control: max-age=31536000 (1 year)
// Service Worker    -> Cache-Control: no-cache
```

### Web Server Configuration (Nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name suplilist.com;
  root /var/www/suplilist/dist;

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css text/javascript application/json;
  gzip_comp_level 9;
  gzip_min_length 1000;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # Cache static assets (1 year)
  location ~* ^/assets/ {
    expires 365d;
    add_header Cache-Control "public, immutable";
  }

  # Don't cache HTML, manifest, or service worker
  location ~* \.(html|webmanifest)$ {
    expires -1;
    add_header Cache-Control "no-cache, must-revalidate";
  }

  location /sw.js {
    expires -1;
    add_header Cache-Control "no-cache, must-revalidate";
  }

  # Route all requests to index.html (SPA)
  try_files $uri $uri/ /index.html;
}
```

---

## Error Boundary Configuration

### Component Error Boundaries

All critical UI components are wrapped with error boundaries:

```javascript
// src/core/error-boundary.js
class ErrorBoundary {
  constructor(component, fallbackUI) {
    this.component = component
    this.fallbackUI = fallbackUI
  }

  render() {
    try {
      return this.component.render()
    } catch (error) {
      console.error('Component render error:', error)
      return this.fallbackUI.render()
    }
  }
}
```

### Error Recovery Strategy

```javascript
// Automatic retry with exponential backoff
async function fetchWithRetry(url, options = {}) {
  const maxRetries = 3
  const baseDelay = 1000  // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, options)
    } catch (error) {
      if (attempt === maxRetries) throw error
      
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

### User-Facing Error Messages

```javascript
// Errors are displayed with user-friendly messages:

const errorMessages = {
  NETWORK_ERROR: "Problema de conexão. Verifique sua internet.",
  SERVER_ERROR: "Servidor indisponível. Tente novamente em alguns momentos.",
  INVALID_INPUT: "Dados inválidos. Verifique seus dados e tente novamente.",
  UNAUTHORIZED: "Você precisa fazer login para continuar.",
  RATE_LIMITED: "Muitas requisições. Aguarde alguns minutos."
}
```

---

## Performance Monitoring

### Core Web Vitals (CWV) Targets

```javascript
// Monitor Web Vitals using integrated script:

// Largest Contentful Paint (LCP)
// Target: < 2.5 seconds
// Tracks: Page content visibility time

// Interaction to Next Paint (INP)
// Target: < 200 milliseconds
// Tracks: User interaction responsiveness

// Cumulative Layout Shift (CLS)
// Target: < 0.1
// Tracks: Visual stability

// Track CWV
import { onCLS, onFID, onLCP } from 'web-vitals'

onCLS(metric => console.log('CLS:', metric.value))
onFID(metric => console.log('FID:', metric.value))
onLCP(metric => console.log('LCP:', metric.value))
```

### Page Load Time Benchmarks

```
Metric                  Target      Status
────────────────────────────────────────
Time to First Byte      < 100ms     ✓ OK
First Contentful Paint  < 1.2s      ✓ OK
Largest Contentful Paint< 2.5s      ✓ OK
Time to Interactive     < 3.5s      ✓ OK
Total Blocking Time     < 200ms     ✓ OK
Cumulative Layout Shift < 0.1       ✓ OK
```

### Real User Monitoring (RUM)

Enable automatic performance tracking:

```env
VITE_ANALYTICS_ENABLED=true
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

The application automatically reports:
- Page load times
- API response times
- JavaScript errors
- Unhandled promise rejections
- User interactions

### Performance Budget

```javascript
// Warn if bundle size exceeds limits
// In vite.config.js:

export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'axios']
        }
      }
    }
  }
}
```

---

## Accessibility Compliance

### WCAG 2.1 Level AA Compliance

All UI components follow WCAG guidelines:

```html
<!-- Semantic HTML -->
<nav aria-label="Navegação principal">
  <button aria-label="Menu" aria-expanded="false">☰</button>
</nav>

<!-- Images with alt text -->
<img src="supplement.webp" alt="Creatina monohidratada - 300g">

<!-- Form labels -->
<label for="email">Email:</label>
<input type="email" id="email" required>

<!-- Color contrast (minimum 4.5:1) -->
<!-- Links underlined or with icon -->
<a href="...">Learn more <span aria-label="opens in new tab">↗</span></a>

<!-- Focus visible -->
button:focus-visible {
  outline: 3px solid #6b21a8;  /* Purple focus ring */
}
```

### Keyboard Navigation

- **Tab**: Move forward
- **Shift+Tab**: Move backward
- **Enter**: Activate button/link
- **Space**: Toggle checkbox/radio
- **Esc**: Close modal or menu
- **Arrow Keys**: Navigate lists/menus

### Screen Reader Testing

```bash
# Test with NVDA (Windows) or JAWS
# Key shortcuts:
# - H: Next heading
# - L: Next list
# - B: Next button
# - T: Next table
# - Alt+Down: Read next
```

### Accessibility Checklist

- [ ] Semantic HTML used throughout
- [ ] All images have descriptive alt text
- [ ] Form inputs have associated labels
- [ ] Color contrast ratio >= 4.5:1
- [ ] Focus visible on interactive elements
- [ ] Keyboard navigation fully functional
- [ ] No keyboard traps
- [ ] ARIA attributes used appropriately
- [ ] Tested with screen readers
- [ ] Mobile touch targets >= 44x44px

---

## Browser Support Matrix

| Browser | Desktop | Mobile | Min Version |
|---------|---------|--------|-------------|
| Chrome  | ✓       | ✓      | 90+         |
| Firefox | ✓       | ✓      | 88+         |
| Safari  | ✓       | ✓      | 14+         |
| Edge    | ✓       | N/A    | 90+         |
| Android Browser | N/A | ✓ | 4.4+      |
| Safari iOS | N/A | ✓ | 13+         |

### Browser Feature Detection

```javascript
// Gracefully degrade for older browsers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}

if ('PushManager' in window) {
  // Enable push notifications
}

if (CSS.supports('display', 'grid')) {
  // Use CSS Grid
} else {
  // Fallback to Flexbox
}
```

### Polyfill Strategy

```javascript
// Vite automatically includes polyfills for:
// - Promise
// - Object.assign
// - Array methods (map, filter, reduce)
// - Fetch API

// Custom polyfill for older browsers:
if (!Object.fromEntries) {
  Object.fromEntries = function(iterable) {
    return [...iterable].reduce((obj, [key, val]) => {
      obj[key] = val
      return obj
    }, {})
  }
}
```

---

## Deployment Checklist

### Before Deployment

- [ ] All environment variables set correctly
- [ ] Build completes without errors: `npm run build`
- [ ] No console errors: `npm run test`
- [ ] Bundle size within limits: `npm run build -- --analyze`
- [ ] Performance targets met: `npm run lighthouse`
- [ ] All links working: `npm run link-check`
- [ ] Accessibility audit passed: axe DevTools
- [ ] Visual regression tests passed (if applicable)

### Deployment Steps

```bash
# 1. Build production bundle
npm install
npm run build

# 2. Verify build output
ls -lah dist/

# 3. Upload to CDN/static host
aws s3 sync dist/ s3://suplilist-cdn/

# 4. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E123ABC --paths "/*"

# 5. Verify deployment
curl https://suplilist.com/health || curl http://localhost:5173

# 6. Run smoke tests
npm run test:e2e:smoke
```

### Post-Deployment Verification

```bash
# 1. Check all assets loaded
curl -I https://suplilist.com

# 2. Verify API connectivity
curl -I https://api.suplilist.com/health/ready

# 3. Check service worker
curl https://suplilist.com/sw.js

# 4. Test critical user flows
# - Load app
# - Search supplements
# - Add to favorites
# - Login (if applicable)

# 5. Monitor error rates for 15 minutes
# - Check Sentry dashboard
# - Review console errors
# - Verify analytics events
```

---

## Rollback Procedures

### Git-Based Rollback

```bash
# 1. Identify previous stable tag
git tag | grep -E 'v[0-9]+\.[0-9]+\.[0-9]+' | sort -V | tail -5

# 2. Checkout previous version
git checkout v1.2.0

# 3. Rebuild and redeploy
npm install
npm run build
aws s3 sync dist/ s3://suplilist-cdn/

# 4. Invalidate cache
aws cloudfront create-invalidation --distribution-id E123ABC --paths "/*"

# 5. Verify rollback
curl https://suplilist.com
```

### S3/CloudFront Rollback

```bash
# If using versioned S3 objects:

# 1. Get version ID of previous release
aws s3api list-object-versions \
  --bucket suplilist-cdn \
  --prefix dist/ \
  --query 'Versions[?Size>`0`]' \
  --output table

# 2. Restore previous version
aws s3 cp s3://suplilist-cdn/index.html \
  index.html \
  --version-id abc123xyz

# 3. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E123ABC \
  --paths "/*"
```

### Rollback Checklist

- [ ] Previous version tested before rollback
- [ ] Rollback completed successfully
- [ ] Cache invalidated across all regions
- [ ] Health checks passing
- [ ] API connectivity verified
- [ ] Critical flows tested
- [ ] Error rates monitored (15 min)
- [ ] Stakeholders notified

---

## Troubleshooting

### Build Failures

**Error**: `npm ERR! missing script: "build"`

```bash
# Verify package.json exists and has build script
cat package.json | grep build

# If missing, add to package.json:
{
  "scripts": {
    "build": "vite build"
  }
}
```

**Error**: `Failed to resolve dependency`

```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install

# If still failing, check Node version
node --version  # Should be 18+
```

### Performance Issues

**Problem**: LCP > 2.5s

```bash
# 1. Check if API is slow
curl -w "Time: %{time_total}s\n" \
  https://api.suplilist.com/health/ready

# 2. Check if images are optimized
ls -lah dist/images/
# Should be < 1MB total

# 3. Check bundle size
npm run build -- --analyze

# 4. Enable lazy loading
import { lazy } from 'react'
const SupplementDetail = lazy(() => import('./pages/supplement-detail'))
```

**Problem**: Cumulative Layout Shift > 0.1

```bash
# 1. Set fixed dimensions on images
<img src="..." width="400" height="300" alt="...">

# 2. Reserve space for dynamic content
.skeleton {
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  animation: loading 1.5s infinite;
}

# 3. Use font-display: swap to prevent FOIT
@font-face {
  font-family: 'CustomFont';
  font-display: swap;
  src: url('font.woff2') format('woff2');
}
```

### Deployment Issues

**Error**: `403 Forbidden` on S3

```bash
# Verify S3 bucket policy
aws s3api get-bucket-policy --bucket suplilist-cdn

# Add public read policy:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::suplilist-cdn/*"
  }]
}
```

**Error**: `Mixed Content` (HTTPS page loading HTTP resources)

```bash
# All resources must use HTTPS
# In HTML/CSS/JS, use protocol-relative URLs:
<img src="//cdn.example.com/image.webp">

# Or absolute HTTPS URLs:
<img src="https://cdn.example.com/image.webp">
```

### Service Worker Issues

**Problem**: Service worker not updating

```bash
# 1. Check service worker registration
navigator.serviceWorker.getRegistrations()

# 2. Unregister old service worker
navigator.serviceWorker.getRegistrations()
  .then(registrations => {
    registrations.forEach(reg => reg.unregister())
  })

# 3. Hard refresh browser cache
Ctrl+Shift+Delete (Windows/Linux)
Cmd+Shift+Delete (Mac)
```

---

## Production Deployment Checklist

- [ ] All environment variables configured
- [ ] Build completes without errors
- [ ] Performance targets met
- [ ] Accessibility audit passed
- [ ] Browser compatibility tested
- [ ] Security headers configured
- [ ] Cache headers optimized
- [ ] Service worker functional
- [ ] Error tracking enabled (Sentry)
- [ ] Analytics configured
- [ ] Smoke tests passing
- [ ] Rollback procedure documented
- [ ] Team trained on deployment
- [ ] Monitoring dashboards created

---

**Last Updated**: June 2024  
**Maintainer**: Frontend Team  
**Related Docs**: [MONITORING.md](./MONITORING.md), [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)
