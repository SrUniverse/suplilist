# FASE 3: Bundle Analyzer & Performance Metrics

## 📊 Overview

FASE 3 analyzes the bundle size impact of FASE 1 and FASE 2 implementations:
- **MetaManager** (meta-manager.js) → ~2KB gzip
- **SchemaManager** (schema-manager.js) → ~3KB gzip
- **Total new code** → ~5KB gzip impact

## 🛠️ Setup

### Already Configured
- `vite.config.js` has `rollup-plugin-visualizer` installed
- Set with conditional activation: `process.env.ANALYZE && visualizer(...)`
- Output: `dist/stats.html` (interactive visualization)

### Configuration
```javascript
visualizer({
  open: true,              // Auto-open in browser
  gzipSize: true,          // Show gzip sizes
  brotliSize: true,        // Show brotli sizes
  filename: 'dist/stats.html'
})
```

## ▶️ How to Run

### Option 1: One-Time Analysis
```bash
ANALYZE=true npm run build
# Generates dist/stats.html and opens in browser
```

### Option 2: Cross-Platform
```bash
# Windows
set ANALYZE=true && npm run build

# macOS/Linux
ANALYZE=true npm run build
```

### Option 3: Add npm Script (Optional)
```json
{
  "scripts": {
    "build": "vite build",
    "analyze": "ANALYZE=true vite build"
  }
}
```

Then run:
```bash
npm run analyze
```

## 📈 Expected Results

### Bundle Comparison

#### Before (without FASE 1 & 2)
- Estimated total: ~45KB gzip
- Main entry: ~15KB
- Vendor: ~25KB
- Shared chunks: ~5KB

#### After (with FASE 1 & 2)
- Estimated total: ~50KB gzip (+5KB)
- Main entry: ~17KB (+2KB from MetaManager)
- Shared chunks: ~8KB (+3KB from SchemaManager + tests)
- Vendor: ~25KB (unchanged)

### Size Breakdown
| Module | Size (gzip) | Impact |
|--------|------------|--------|
| meta-manager.js | 2.1KB | +0.7% |
| schema-manager.js | 2.8KB | +1.0% |
| faq-page integration | 0.2KB | +0.1% |
| **Total** | **~5KB** | **+5%** |

## 🎯 Optimization Opportunities

### Identified in Stats
1. **Vendor bundle**: Check if all node_modules are necessary
2. **Duplicate code**: Look for shared logic across pages
3. **Unused CSS**: Identify dead CSS rules
4. **Tree-shaking**: Ensure all exports are used

### Improvements for Future
- [ ] Lazy-load schema-manager only on pages that need it
- [ ] Move FAQ data to separate JSON file
- [ ] Minify meta data constants
- [ ] Use compression for long strings

## 🔍 How to Read stats.html

### Color Legend
- **Red**: Largest chunks (prioritize for optimization)
- **Orange**: Medium chunks
- **Yellow**: Small chunks
- **Size labels**: Hover for exact gzip/brotli sizes

### Interactive Features
- **Click modules**: Expand to see dependencies
- **Hover**: Show file path and sizes
- **Drag**: Pan across large trees
- **Zoom**: Scroll to zoom in/out

### Key Metrics
- **Left axis**: File size (uncompressed)
- **Color intensity**: Gzip compression ratio
- **Module name**: Click to see dependencies

## 📋 Analysis Checklist

- [ ] Run `ANALYZE=true npm run build`
- [ ] Open `dist/stats.html` in browser
- [ ] Check main bundle size (should be ~17KB gzip)
- [ ] Identify largest modules
- [ ] Look for duplicate dependencies
- [ ] Verify no unexpected large modules
- [ ] Check if new managers are tree-shaken correctly
- [ ] Compare sizes to baseline (record numbers)

## 📊 Baseline Metrics

### Current Project Status
- **Language**: Pure JavaScript (no React/Vue)
- **Dependencies**: vite, vite-plugin-pwa
- **Code style**: Class-based with static methods
- **Bundle strategy**: Code-split by pages

### Expected Baseline
```
dist/
├── assets/
│   ├── js/
│   │   ├── main-[hash].js         ~15KB gzip
│   │   ├── vendor-[hash].js       ~25KB gzip
│   │   ├── home-page-[hash].js    ~1.2KB gzip
│   │   ├── list-page-[hash].js    ~2.1KB gzip
│   │   └── [other pages]
│   ├── css/
│   │   ├── main-[hash].css        ~3.5KB gzip
│   │   └── [page-specific].css
│   └── fonts/ (if any)
├── service-worker.js              ~2KB gzip
├── manifest.json
└── index.html                      ~0.5KB gzip

Total ~50KB gzip (reasonable for PWA)
```

## 🚀 Performance Targets

### Size Goals
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Main bundle | <18KB | ~15KB | ✅ OK |
| Vendor | <30KB | ~25KB | ✅ OK |
| Total | <60KB | ~50KB | ✅ OK |
| Largest chunk | <10KB | ~25KB (vendor) | ⚠️ Monitor |

### Load Time Targets
- **First Contentful Paint**: <2s (depends on network)
- **Time to Interactive**: <3s
- **Total page size**: <100KB

## 🔗 After Analysis

### If Bundle is Too Large
1. Check for unused dependencies
2. Look for duplicate lodash/utils imports
3. Consider splitting large pages further
4. Move data to JSON files (not in JS)

### If Everything Looks Good
- Proceed to FASE 4: Virtual Scrolling
- Record baseline numbers for future comparison
- Set up bundle monitoring

## 📝 Recording Results

Create `docs/BUNDLE_BASELINE.md`:
```markdown
# Bundle Analysis Baseline

**Date**: 2026-06-02
**Build**: npm run build (ANALYZE=true)

## Sizes
- Main: 15.2KB gzip
- Vendor: 24.8KB gzip
- Pages (avg): 1.5KB gzip each
- Total: 49.5KB gzip

## Largest Modules
1. state-manager.js: 3.2KB
2. storage-manager.js: 2.8KB
3. event-bus.js: 1.5KB
4. [etc]

## Insights
- Good code splitting by pages
- Vendor size reasonable for PWA
- No obvious dead code
```

## 🧪 Test Results

### Bundle Size Tests
- [ ] Total bundle < 60KB gzip
- [ ] No unexpected large modules
- [ ] All imports are tree-shaken
- [ ] Page chunks load independently

### Performance Benchmarks
- [ ] Record build time
- [ ] Check cache hit rates
- [ ] Verify compression ratios

## 📚 References

- [Vite Build Analysis](https://vitejs.dev/guide/build.html)
- [Rollup Plugin Visualizer](https://github.com/btd/rollup-plugin-visualizer)
- [Web Vitals](https://web.dev/vitals/)
- [Bundle Budgets](https://web.dev/bundle-budgets/)

---

**Status**: 🔍 Ready for Analysis
**Next**: Run `ANALYZE=true npm run build` and review results
