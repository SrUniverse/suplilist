# Performance Optimization Guide - SupliList Mobile

## 📊 Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms  
- **CLS (Cumulative Layout Shift)**: < 0.1

## 🖼️ Image Optimization

### Best Practices Already Implemented
- ✅ `max-width: 100%` on all images
- ✅ `image-rendering: crisp-edges` for high-DPI
- ✅ Lazy loading attribute support
- ✅ Picture element support for responsive images

### Recommendations for Use
```html
<!-- Lazy load images -->
<img src="image.jpg" loading="lazy" alt="description">

<!-- Responsive images with srcset -->
<img 
  srcset="image-small.jpg 375w, image-med.jpg 768w, image-large.jpg 1200w"
  sizes="(max-width: 375px) 100vw, (max-width: 768px) 90vw, 80vw"
  src="image-med.jpg"
  alt="description"
>

<!-- Modern format with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="description">
</picture>
```

## ⚡ JavaScript Optimization

### Code Splitting
- Use dynamic imports for heavy modules
- Lazy load non-critical pages
- Tree-shake unused code

```javascript
// Bad - loads everything upfront
import HeavyModule from './heavy.js';

// Good - loads on demand
const HeavyModule = await import('./heavy.js');
```

### Performance Monitoring
```javascript
// Monitor LCP
new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log('LCP:', entry.renderTime || entry.loadTime);
  });
}).observe({entryTypes: ['largest-contentful-paint']});

// Monitor FID
new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log('FID:', entry.processingDuration);
  });
}).observe({entryTypes: ['first-input']});

// Monitor CLS
let clsValue = 0;
new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (!entry.hadRecentInput) {
      clsValue += entry.value;
      console.log('CLS:', clsValue);
    }
  });
}).observe({entryTypes: ['layout-shift']});
```

## 🎨 CSS Optimization

### Already Implemented
- ✅ CSS variables for theming (no duplicate colors)
- ✅ Hardware acceleration (`will-change`, `transform`)
- ✅ GPU-accelerated scrolling (`-webkit-overflow-scrolling`)
- ✅ Optimized animations (100-300ms instead of 150-350ms)
- ✅ `scrollbar-gutter: stable` (prevent layout shift)

### Additional Tips
- Use `:has()` instead of JS for simple state changes
- Minimize repaints with `will-change`
- Use `contain` for performance boundaries
- Batch DOM updates

```css
/* Good - minimize repaints */
.card {
  contain: layout style paint;
  will-change: transform;
  transform: translateZ(0); /* GPU acceleration */
}
```

## 📱 Mobile-Specific Optimizations

### Network
- ✅ Service Worker for offline caching
- ✅ HTTP/2 push hints (preload critical fonts)
- ✅ DNS prefetch for 3rd party domains
- ✅ Resource hints (preconnect, prefetch)

### Battery
- ✅ Reduce animation duration
- ✅ Minimize CPU usage
- ✅ Respect `prefers-reduced-motion`
- ✅ Use reasonable refresh rates

### Memory
- ✅ Virtual scrolling for long lists (already implemented)
- ✅ Clean up event listeners
- ✅ Unload heavy modules when not needed
- ✅ Avoid memory leaks

## 🔧 Tools & Measurement

### Lighthouse
```bash
# Run Lighthouse locally
npm install -g lighthouse
lighthouse https://suplilist.com --view
```

### Performance API
```javascript
// Get navigation timing
const perfData = window.performance.timing;
const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
console.log('Page Load Time:', pageLoadTime);

// Get resource timing
window.performance.getEntriesByType('resource').forEach(r => {
  console.log(`${r.name}: ${r.duration}ms`);
});
```

### Chrome DevTools
- Performance tab: Record and analyze
- Network tab: Throttle to slow 3G
- Coverage tab: Find unused code
- Lighthouse tab: Run audit

## 🚀 Deployment Checklist

- [ ] Enable gzip compression
- [ ] Enable Brotli compression for text
- [ ] Set proper cache headers
- [ ] Use CDN for static assets
- [ ] Minify CSS/JS
- [ ] Optimize images (use WebP with fallback)
- [ ] Lazy load above-the-fold images
- [ ] Preload critical fonts
- [ ] Enable HTTP/2
- [ ] Enable Service Worker caching
- [ ] Monitor Core Web Vitals
- [ ] Set up error tracking
- [ ] Set up performance monitoring

## 📈 Metrics to Monitor

### Google Analytics Events
```javascript
// Track performance metrics
gtag('event', 'page_view', {
  'page_path': window.location.pathname,
  'page_title': document.title,
  'engagement_time_msec': Math.round((Date.now() - pageStartTime))
});

// Track custom metrics
gtag('event', 'lcp', {
  'value': Math.round(lcpValue),
  'event_category': 'engagement',
  'non_interaction': true
});
```

## 🎯 Optimization Priority

1. **Critical** (do first)
   - Lazy load non-critical images
   - Minify CSS/JS
   - Enable gzip compression
   - Fix layout shifts

2. **High** (do next)
   - Optimize fonts
   - Code splitting
   - Service Worker caching
   - Image optimization

3. **Medium** (nice to have)
   - Advanced image formats (WebP)
   - Animation optimization
   - Resource prefetching
   - Performance monitoring

## 📚 Resources

- [Google Performance](https://web.dev/performance/)
- [MDN Performance](https://developer.mozilla.org/en-US/docs/Performance)
- [Web.dev Diagnostics](https://web.dev/diagnostics/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
