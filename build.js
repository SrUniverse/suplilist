#!/usr/bin/env node
// ============================================================
// SupliList v4.0 — Build Pipeline (Native ESM)
// Minifies CSS + JS, checks bundle budgets, runs Lighthouse
// Usage: node build.js [--audit]
// ============================================================

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { execSync } from 'child_process';

const BUDGETS = {
  css:   50 * 1024,  // 50KB gzipped
  js:    150 * 1024, // 150KB gzipped
  total: 200 * 1024  // 200KB gzipped
};

async function build() {
  console.log('\n🔨 SupliList v4.0 — Build starting...\n');
  const results = {};

  // 1. Minify CSS
  console.log('📦 Processing CSS...');
  const cssPath = fs.existsSync('./src/css/design-system.css') 
    ? './src/css/design-system.css' 
    : './src/js/ui/design-system.css'; // legacy path check fallback

  if (fs.existsSync(cssPath)) {
    const cssSource = fs.readFileSync(cssPath, 'utf8');
    const cssMinified = cssSource
      .replace(/\/\*[\s\S]*?\*\//g, '')    // remove comments
      .replace(/\n\s*/g, ' ')              // collapse newlines
      .replace(/\s{2,}/g, ' ')            // collapse multiple spaces
      .replace(/;\s*}/g, '}')             // remove last semicolon in block
      .trim();

    fs.mkdirSync('./dist', { recursive: true });
    fs.writeFileSync('./dist/design-system.min.css', cssMinified);
    results.css = await gzipSize(cssMinified);
    log('CSS', results.css, BUDGETS.css);
  } else {
    console.warn('⚠️  CSS source not found, skipping CSS minification.');
    results.css = 0;
  }

  // 2. Process JS (bundle core modules)
  console.log('📦 Processing JS...');
  const jsFiles = [
    // v4 core paths
    './src/core/event-bus.js',
    './src/core/state-manager.js',
    './src/core/router.js',
    './src/core/app.js',
    // v3 legacy core paths fallback
    './src/js/core/eventbus.js',
    './src/js/core/state-manager.js',
    './src/js/core/page-router.js',
    './src/js/main.js'
  ].filter(f => fs.existsSync(f));

  if (jsFiles.length > 0) {
    console.log(`🔗 Bundling files: ${jsFiles.map(f => path.basename(f)).join(', ')}`);
    const jsBundle = jsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
    fs.mkdirSync('./dist', { recursive: true });
    fs.writeFileSync('./dist/app.bundle.js', jsBundle);
    results.js = await gzipSize(jsBundle);
    log('JS', results.js, BUDGETS.js);
  } else {
    console.warn('⚠️  No JS core source files found, skipping JS bundle.');
    results.js = 0;
  }

  // 3. Total budget check
  results.total = results.css + results.js;
  log('TOTAL', results.total, BUDGETS.total);

  // 4. Final verdict
  const allPassed = Object.entries(results).every(([key, size]) => size <= BUDGETS[key]);

  if (allPassed) {
    console.log('\n✅ Build passed all budgets!\n');
  } else {
    console.error('\n❌ Build exceeded budget. Optimize before shipping.\n');
    process.exit(1);
  }

  // 5. Optional Lighthouse audit
  if (process.argv.includes('--audit')) {
    console.log('🔍 Running Lighthouse...');
    try {
      execSync(
        'lighthouse http://localhost:8080 --output=html --output-path=./dist/lighthouse-report.html --chrome-flags="--headless" --quiet',
        { stdio: 'inherit' }
      );
      console.log('✅ Lighthouse report saved to dist/lighthouse-report.html');
    } catch (e) {
      console.warn('⚠️  Lighthouse failed (is the server running? npx live-server public/ --port=8080)');
    }
  }
}

async function gzipSize(content) {
  return new Promise((resolve, reject) => {
    zlib.gzip(Buffer.from(content, 'utf8'), (err, result) => {
      err ? reject(err) : resolve(result.length);
    });
  });
}

function log(name, size, budget) {
  const kb      = (size / 1024).toFixed(1);
  const budgetKb = (budget / 1024).toFixed(0);
  const pct     = ((size / budget) * 100).toFixed(0);
  const ok      = size <= budget;
  console.log(`  ${ok ? '✅' : '❌'} ${name.padEnd(6)} ${kb}KB / ${budgetKb}KB (${pct}%)`);
}

build().catch(e => { console.error(e); process.exit(1); });
